"""
auth.py — Google sign-in via the GIS ID-token flow.

The browser gets a signed ID token from Google's own button (Google checks the
password on Google's page — it never touches Sensi). We verify the token's
signature, audience and expiry with google-auth, then keep only
{sub, email, name} in a signed session cookie. There is no OAuth client
secret in this flow; the client ID is public by design.

The stable user key is `sub` — never email, which can change on an account.
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import Request


def client_id() -> str:
    return os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()


def enabled() -> bool:
    return bool(client_id())


def verify(credential: str) -> dict:
    from google.oauth2 import id_token
    from google.auth.transport import requests as g_requests

    info = id_token.verify_oauth2_token(credential, g_requests.Request(), client_id())
    return {
        "sub":   info["sub"],
        "email": info.get("email", ""),
        "name":  info.get("given_name") or info.get("name", ""),
    }


def current_user(request: Request) -> Optional[dict]:
    try:
        user = request.session.get("user")
    except (AssertionError, AttributeError):  # SessionMiddleware absent
        return None
    return user if isinstance(user, dict) and user.get("sub") else None
