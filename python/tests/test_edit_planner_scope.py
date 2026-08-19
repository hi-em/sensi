"""Out-of-scope requests must degrade to the honest "couldn't find a concrete
change" path — never be silently remapped to a supported edit (prod QA
2026-08-19: "demolish all the walls" repainted the kitchen wall in wood)."""

from nodes.editing.edit_planner import _heuristic_ops


def test_demolition_yields_no_ops():
    assert _heuristic_ops("demolish all the walls and make it one giant open space") == []


def test_wall_removal_yields_no_ops():
    assert _heuristic_ops("remove the wall between the kitchen and the living room") == []


def test_supported_edits_still_plan():
    assert any(o["op"] == "add_furniture" for o in _heuristic_ops("add a plant to the kitchen"))
    assert any(o["op"] == "change_material"
               for o in _heuristic_ops("change the kitchen floor to wood"))
