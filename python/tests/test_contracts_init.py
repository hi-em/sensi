"""The /api/init first message: guests get introduced, locals get welcomed back."""

from api import contracts

_PERSONA = {"name": "Wren", "role": "client"}


def test_demo_init_introduces_the_guest():
    payload = contracts.init_payload_from_persona(_PERSONA, demo=True)
    assert payload["screen"] == "chat"
    assert payload["has_persona"] is True
    assert "Welcome back" not in payload["message"]
    assert "exploring Sensi as Wren" in payload["message"]


def test_local_init_welcomes_back():
    payload = contracts.init_payload_from_persona(_PERSONA)
    assert "Welcome back, Wren!" in payload["message"]


def test_demo_init_survives_missing_name():
    payload = contracts.init_payload_from_persona({}, demo=True)
    assert "exploring Sensi as our guest" in payload["message"]
