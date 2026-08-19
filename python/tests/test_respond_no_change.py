"""An edit turn that changed nothing must keep apply_edits' honest explanation —
respond must not narrate the user's request back as a done deed (prod QA
2026-08-19: demolish-the-walls was reported as an applied edit)."""

from nodes.quality.respond import build_respond_node


class _ExplodingLLM:
    def __getattr__(self, name):  # any use means the short-circuit failed
        raise AssertionError("LLM must not be called for a no-change edit turn")


def test_no_change_edit_keeps_apply_edits_message():
    node = build_respond_node(_ExplodingLLM())
    state = {
        "action": "edit",
        "layout_updated": False,
        "layout_diffs": [],
        "final_response": "I couldn't find a concrete change to make.",
        "raw_prompt": "demolish all the walls",
    }
    out = node(state)
    assert out["final_response"] == "I couldn't find a concrete change to make."
