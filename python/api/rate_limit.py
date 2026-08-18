"""
rate_limit.py — demo-mode abuse guard for the public deployment.

The public demo runs on free/capped provider quotas (Gemini free tier is roughly
15 requests/min and ~1k requests/day project-wide; image generation is real money
at ~$0.04/image). These limits exist so a burst of strangers from a LinkedIn post
degrades into polite "try again in a minute" messages instead of eating the whole
daily quota — or the image budget — in one spike.

Every check is a no-op unless DEMO_MODE is truthy, so local development and the
desktop workflow are completely unaffected.

Two scopes, sized to the provider quotas rather than to hoped-for traffic:
  "chat"  — endpoints that trigger an agent turn. One turn fans out into several
            provider calls (routing + tools + prose), so the global per-minute
            allowance stays well under the provider's RPM ceiling.
  "image" — endpoints that can bill per call. The provider-side spend cap is the
            backstop; these limits are the first gate. Cache hits are exempt
            (the gate runs only when an actual generation is about to happen).

In-memory on purpose: the demo runs a single instance (max-instances=1), so
process-local counters ARE the global counters, and losing them on a restart is
harmless — the windows simply refill.
"""

from __future__ import annotations
import os
import threading
import time
from collections import defaultdict, deque

# Per scope: [(window_seconds, allowance), ...] — every window must have room.
_SCOPES: dict[str, dict] = {
    "chat": {
        "per_ip": [(60, 6), (86400, 80)],
        "global": [(60, 8), (86400, 300)],
        "message": ("The demo is at its usage limit right now — "
                    "please wait a minute and try again."),
    },
    "image": {
        "per_ip": [(60, 4), (86400, 15)],
        "global": [(60, 8), (86400, 60)],
        "message": ("Room renders have reached the demo's daily image budget — "
                    "scores, analysis and editing all still work."),
    },
}

_events: dict[tuple, deque] = defaultdict(deque)
_lock = threading.Lock()


def enabled() -> bool:
    """True when running as the public demo (DEMO_MODE env var). Also used by the
    server to keep the shared on-disk persona read-only across visitors."""
    return (os.environ.get("DEMO_MODE") or "").strip().lower() in ("1", "true", "yes", "on")


def client_ip(request) -> str:
    """The real visitor's IP. Cloud Run (and most PaaS proxies) terminate TLS at a
    front-end and pass the caller in X-Forwarded-For as "client, proxy, ..." —
    the first entry is the visitor."""
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check(scope: str, ip: str) -> str | None:
    """Record one hit against `scope` for `ip`. Returns None when allowed, or a
    user-facing refusal message. Refused requests are NOT recorded, so hammering
    a closed gate cannot extend the lockout."""
    if not enabled():
        return None
    cfg = _SCOPES[scope]
    now = time.monotonic()
    with _lock:
        gates = [((scope, "ip", ip), cfg["per_ip"]),
                 ((scope, "*"), cfg["global"])]
        # Prune and test every gate before recording anything.
        for key, windows in gates:
            dq = _events[key]
            horizon = max(w for w, _ in windows)
            while dq and now - dq[0] > horizon:
                dq.popleft()
            for window, allowance in windows:
                if sum(1 for t in dq if now - t <= window) >= allowance:
                    return cfg["message"]
        for key, _ in gates:
            _events[key].append(now)
    return None
