"""The static demo home the entry page and phone view draw is exactly the model's output."""
import json
from pathlib import Path

import export_demo_home

FILE = Path(__file__).resolve().parents[2] / "web" / "public" / "demo-home.json"


def test_demo_home_matches_the_model():
    assert json.loads(FILE.read_text(encoding="utf-8")) == json.loads(json.dumps(export_demo_home.build()))
