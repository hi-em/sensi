"""The curated fallback pool must never hand the moodboard an empty grid — a
later round excludes every URL already shown, and with Unsplash unkeyed or down
that exclusion can drain the whole pool (the round-2 dead-end found in prod QA)."""

from inspire import pipeline


def _grid(seen):
    urls, descs, tags, diag = [], [], [], {"fallback_used": False}
    pipeline._fill_from_fallback(urls, descs, tags, 12, diag, seen=set(seen))
    return urls, diag


def test_fresh_round_draws_from_the_pool():
    urls, diag = _grid(seen=[])
    assert urls and diag["fallback_used"]


def test_exhausted_pool_still_yields_a_usable_grid():
    every_url = [u for u, _ in pipeline._FALLBACK_POOL]
    urls, diag = _grid(seen=every_url)
    assert urls, "round 2+ with the whole pool excluded must not dead-end empty"
    assert diag["fallback_used"]


def test_partial_exclusion_prefers_fresh_urls():
    first_three = [u for u, _ in pipeline._FALLBACK_POOL[:3]]
    urls, _ = _grid(seen=first_three)
    assert urls and not (set(urls) & set(first_three))
