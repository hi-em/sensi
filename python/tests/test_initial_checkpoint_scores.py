"""An initial checkpoint saved before any analysis gets scored once, with the same
compute_comfort_scores call the analyze node makes."""
import json
from types import SimpleNamespace

from api import server


class FakeTool:
    def __init__(self):
        self.calls = []

    def call_tool(self, name, args):
        self.calls.append((name, args))
        return json.dumps({"result": json.dumps({"rooms": [{"roomName": "A", "comfortScores": {"visual": 0.5}}]})})


def _session():
    return {"persona_profile": {"name": "W", "role": "client", "comfort_weights": {"visual": 0.8}},
            "checkpoints": [{"id": 0, "label": "Initial layout", "layout_json": '{"rooms": []}', "scores_json": ""}],
            "committed_scores_json": ""}


def test_unscored_initial_checkpoint_is_scored_once(monkeypatch):
    tool = FakeTool()
    monkeypatch.setattr(server, "_CTX", SimpleNamespace(mcp_client=tool))
    sess = _session()
    server._fill_initial_scores(sess)
    server._fill_initial_scores(sess)          # already scored: no second call
    assert len(tool.calls) == 1
    name, args = tool.calls[0]
    assert name == "compute_comfort_scores"
    assert args["layout_json"] == '{"rooms": []}' and args["room_ids"] == "all"
    assert json.loads(args["weights_override"]) == {"visual": 0.8}
    assert json.loads(sess["checkpoints"][0]["scores_json"])["rooms"][0]["roomName"] == "A"
    assert sess["committed_scores_json"] == sess["checkpoints"][0]["scores_json"]


def test_scored_initial_checkpoint_is_left_alone(monkeypatch):
    tool = FakeTool()
    monkeypatch.setattr(server, "_CTX", SimpleNamespace(mcp_client=tool))
    sess = _session()
    sess["checkpoints"][0]["scores_json"] = '{"rooms": []}'
    server._fill_initial_scores(sess)
    assert tool.calls == []
