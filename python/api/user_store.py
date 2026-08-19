"""
user_store.py — per-user persona persistence for signed-in visitors.

One interface, two backends, chosen by the PERSONA_STORE env var:
  "file" (default)   personas/users/<sub>.json on local disk — dev fallback,
                     git-ignored, zero cloud dependencies for a fresh install.
  "firestore"        Firestore Standard/Native, collection "personas",
                     document id = the Google account's stable `sub`.
                     Cloud Run reaches it via Application Default Credentials —
                     no key file anywhere.

Guests never touch this module; their shared persona stays the read-only
personas/persona.json handled in server.py.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Optional

_USERS_DIR = Path(__file__).resolve().parent.parent.parent / "personas" / "users"
_COLLECTION = "personas"

_fs_client = None


def _backend() -> str:
    return os.getenv("PERSONA_STORE", "file").strip().lower()


def _safe_sub(sub: str) -> str:
    """Google subs are numeric strings, but never trust a key used as a filename."""
    clean = re.sub(r"[^A-Za-z0-9_-]", "", str(sub))
    if not clean:
        raise ValueError("invalid user key")
    return clean


def _fs():
    global _fs_client
    if _fs_client is None:
        from google.cloud import firestore  # lazy — only imported in firestore mode
        _fs_client = firestore.Client()
    return _fs_client


def get_persona(sub: str) -> Optional[dict]:
    sub = _safe_sub(sub)
    if _backend() == "firestore":
        snap = _fs().collection(_COLLECTION).document(sub).get()
        return snap.to_dict() if snap.exists else None
    path = _USERS_DIR / f"{sub}.json"
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def save_persona(sub: str, persona: dict) -> None:
    sub = _safe_sub(sub)
    if _backend() == "firestore":
        _fs().collection(_COLLECTION).document(sub).set(persona)
        return
    _USERS_DIR.mkdir(parents=True, exist_ok=True)
    (_USERS_DIR / f"{sub}.json").write_text(
        json.dumps(persona, indent=2, ensure_ascii=False), encoding="utf-8")


def delete_persona(sub: str) -> None:
    sub = _safe_sub(sub)
    if _backend() == "firestore":
        _fs().collection(_COLLECTION).document(sub).delete()
        return
    path = _USERS_DIR / f"{sub}.json"
    if path.exists():
        path.unlink()
