"""Provider quota errors must reach the chat in the demo's polite register —
never as the raw Gemini 429 JSON (seen verbatim in prod on 2026-08-19)."""

from api.server import _friendly_llm_error

RAW_DAILY = (
    "Error code: 429 - [{'error': {'code': 429, 'message': 'You exceeded your current "
    "quota... Quota exceeded for metric: generativelanguage.googleapis.com/"
    "generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash', "
    "'status': 'RESOURCE_EXHAUSTED', 'details': [{'quotaId': "
    "'GenerateRequestsPerDayPerProjectPerModel-FreeTier'}]}}]"
)


def test_daily_quota_becomes_polite_and_tagged():
    msg, kind = _friendly_llm_error(Exception(RAW_DAILY))
    assert kind == "rate_limit"
    assert "quota" in msg.lower() and "429" not in msg and "{" not in msg


def test_per_minute_quota_becomes_polite():
    msg, kind = _friendly_llm_error(Exception("Error code: 429 - RESOURCE_EXHAUSTED, retry in 52s"))
    assert kind == "rate_limit"
    assert "minute" in msg.lower() and "{" not in msg


def test_other_errors_pass_through_untagged():
    msg, kind = _friendly_llm_error(ValueError("boom"))
    assert kind is None and msg == "boom"
