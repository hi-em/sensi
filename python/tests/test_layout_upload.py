"""Uploads stay in the session: the shared layouts folder is never written, the id is
server-chosen, and load_layout keeps using the session copy."""
import hashlib
import json
import shutil
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from api import server
from nodes.layout.load_layout import build_load_layout_node

REPO_LAYOUTS = Path(__file__).resolve().parents[2] / "randomized_layouts"
PAYLOAD = '<img src=x onerror="window.__x=1">'


def _snapshot(folder: Path) -> dict:
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.iterdir())}


@pytest.fixture
def layouts(tmp_path, monkeypatch):
    folder = tmp_path / "randomized_layouts"
    shutil.copytree(REPO_LAYOUTS, folder)
    monkeypatch.setattr(server, "_CTX", SimpleNamespace(layout_input_dir=folder))
    return folder


def _upload(client, body: str, sid=None):
    return client.post("/api/layout/upload", json={"session_id": sid, "layout_json": body}).json()


def test_upload_never_writes_shared_folder(layouts):
    before = _snapshot(layouts)
    repo_before = _snapshot(REPO_LAYOUTS)
    shipped = json.loads((layouts / "layout_204.json").read_text(encoding="utf-8"))
    evil = dict(shipped, layoutId="204", name=PAYLOAD)
    evil["rooms"] = [dict(r, name=PAYLOAD) for r in shipped.get("rooms", [])]

    res = _upload(TestClient(server.app), json.dumps(evil))

    assert res["ok"] is True
    assert res["layout_id"] != "204" and res["layout_id"].isdigit() and len(res["layout_id"]) == 7
    assert _snapshot(layouts) == before
    assert _snapshot(REPO_LAYOUTS) == repo_before

    sess = server._STORE[res["session_id"]]["session"]
    loaded = json.loads(sess["layout_json_string"])
    assert loaded["layoutId"] == res["layout_id"]
    assert loaded["rooms"][0]["name"] == PAYLOAD   # kept as data; the UI escapes it

    # The graph's load step reuses the session copy instead of reading a file.
    out = build_load_layout_node(layouts)(dict(sess))
    assert out["layout_json_string"] == sess["layout_json_string"]
    assert not out.get("layout_not_found")

    # The report's before/after baseline is the uploaded original, not a shipped file.
    assert server._original_layout(sess)["rooms"][0]["name"] == PAYLOAD


def test_upload_ids_are_unique_per_upload(layouts):
    client = TestClient(server.app)
    body = json.dumps({"layoutId": "204", "rooms": []})
    ids = {_upload(client, body)["layout_id"] for _ in range(5)}
    assert len(ids) == 5


def test_upload_size_cap_always_on(layouts):
    res = _upload(TestClient(server.app), json.dumps({"pad": "x" * (512 * 1024)}))
    assert res["ok"] is False
    assert "512 KB" in res["error"]


def test_upload_rejects_non_object(layouts):
    res = _upload(TestClient(server.app), "[1, 2]")
    assert res["ok"] is False
