"""Per-user persona storage and the write-routing that keeps the shared demo
persona read-only while signed-in visitors persist their own."""

from api import user_store


def test_file_store_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(user_store, "_USERS_DIR", tmp_path)
    monkeypatch.delenv("PERSONA_STORE", raising=False)
    user_store.save_persona("abc123", {"name": "Test"})
    assert user_store.get_persona("abc123") == {"name": "Test"}
    user_store.delete_persona("abc123")
    assert user_store.get_persona("abc123") is None


def test_sub_is_sanitised_before_becoming_a_filename(tmp_path, monkeypatch):
    monkeypatch.setattr(user_store, "_USERS_DIR", tmp_path)
    monkeypatch.delenv("PERSONA_STORE", raising=False)
    user_store.save_persona("../evil", {"name": "X"})
    files = list(tmp_path.glob("*.json"))
    assert len(files) == 1 and files[0].name == "evil.json"


def test_write_persona_routes_to_the_signed_in_users_store(monkeypatch):
    from api import server
    saved = {}
    monkeypatch.setattr(server.user_store, "save_persona",
                        lambda sub, p: saved.update({sub: p}))
    server._write_persona({"name": "Mine"}, {"auth_sub": "sub42"})
    assert saved == {"sub42": {"name": "Mine"}}


def test_write_persona_blocks_anonymous_demo_writes(monkeypatch, tmp_path):
    from api import server
    monkeypatch.setenv("DEMO_MODE", "1")
    monkeypatch.setattr(server, "_PERSONA_PATH", tmp_path / "persona.json")
    server._write_persona({"name": "Guest"}, {})
    assert not (tmp_path / "persona.json").exists()
