"""
analytics.py — lightweight first-party usage events.

Emits ONE structured JSON line per meaningful user action to stdout. Cloud Run's
logging agent parses a single-line JSON object into a log entry's `jsonPayload`,
so each event becomes a queryable record with no client-side tracking, no cookies,
and no consent banner. Those entries feed two things:

  • Cloud Monitoring log-based metrics + a dashboard  → live counts / trends
  • a BigQuery log sink                               → durable raw events for
                                                        funnel / unique-visitor SQL

Every event carries `logType="sensi_event"` so metrics and the sink can select
analytics lines and ignore ordinary app logs.

Privacy: no PII ever leaves here. The visitor id is a short salted hash of the
client IP (for distinct-visitor counting only) — never the raw IP, never the
Google account. Fire-and-forget: a logging failure must never affect a request,
so every call is wrapped in try/except and returns silently.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from typing import Any, Optional

from fastapi import Request

_LOG_TYPE = "sensi_event"
# Rotating this env var invalidates every previous visitor hash (e.g. if you ever
# want to reset unique-visitor counting). Optional — a default keeps it working.
_SALT = os.getenv("ANALYTICS_SALT", "sensi-2026").strip() or "sensi-2026"


def _visitor(request: Optional[Request]) -> Optional[str]:
    """A pseudonymous, stable-per-IP id for distinct-visitor counts — never the raw
    IP. Best-effort; None if the IP can't be read."""
    if request is None:
        return None
    try:
        from api import rate_limit
        ip = rate_limit.client_ip(request)
    except Exception:
        ip = None
    if not ip:
        return None
    return hashlib.sha1(f"{_SALT}:{ip}".encode()).hexdigest()[:12]


def track(event: str, *, request: Optional[Request] = None,
          session_id: Optional[str] = None, mode: Optional[str] = None,
          **props: Any) -> None:
    """Emit one analytics event as a structured JSON log line. Never raises.

    event       a stable verb like "app_open", "sign_in", "message_sent"
    request     pass it in to attach the pseudonymous visitor id
    session_id  the anonymous per-session id (for counting sessions)
    mode        "guest" or "signed_in"
    **props     any extra scalar fields (layout_id, cached, picks, ...)
    """
    try:
        entry: dict[str, Any] = {
            "logType": _LOG_TYPE,
            "event": event,
            # `severity` and `message` are recognised by Cloud Logging, so events
            # also read cleanly in the plain log view, not just as JSON.
            "severity": "INFO",
            "message": f"event={event}",
        }
        if session_id:
            entry["session_id"] = session_id
        if mode:
            entry["mode"] = mode
        vis = _visitor(request)
        if vis:
            entry["visitor"] = vis
        for k, v in props.items():
            if v is not None:
                entry[k] = v
        sys.stdout.write(json.dumps(entry, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    except Exception:
        pass
