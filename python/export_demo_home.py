"""Write web/public/demo-home.json: the public demo persona's home, scored by the comfort
model (compute_comfort_scores, no LLM). The entry page and the phone view draw it
without a session. Run from python/:  python export_demo_home.py
tests/test_demo_home.py fails if the file drifts from the model."""
import json
from pathlib import Path

from comfort.compute_comfort_scores import compute_comfort_scores
from nodes._shared.persona_context import persona_scoring_args

ROOT = Path(__file__).resolve().parent.parent
LAYOUT_ID = "204"
KEEP = ("roomId", "roomName", "comfortScores", "baseScores", "adjustments", "overallScore")


def build() -> dict:
    persona = json.loads((ROOT / "personas" / "persona.wren-demo.json").read_text(encoding="utf-8"))
    layout_str = (ROOT / "randomized_layouts" / f"layout_{LAYOUT_ID}.json").read_text(encoding="utf-8")
    scores = json.loads(compute_comfort_scores(layout_json=layout_str, room_ids="all", **persona_scoring_args(persona)))
    types = {r["id"]: (r.get("attributes") or {}).get("roomType") for r in json.loads(layout_str).get("rooms", [])}
    rooms = [{**{k: r[k] for k in KEEP if k in r}, "roomType": types.get(r.get("roomId"))} for r in scores["rooms"]]
    return {"layoutId": LAYOUT_ID, "comfort_weights": persona.get("comfort_weights") or {}, "rooms": rooms}


if __name__ == "__main__":
    out = ROOT / "web" / "public" / "demo-home.json"
    out.write_text(json.dumps(build(), indent=1), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")
