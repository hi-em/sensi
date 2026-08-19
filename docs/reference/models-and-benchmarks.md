# Model choice and benchmarks

Sensi runs every LLM node on a **two-tier setup** — FAST for routing, classification and
short text; SMART for user-facing prose and nuanced reasoning — plus a separate native
image model. The resolver is provider-generic (`{PROVIDER}_MODEL_FAST` / `_SMART`, see
`python/_runtime/bootstrap.py`), so moving a generation is an `.env` edit with no app-code
change. Startup logs confirm what actually loaded:

```
Benchmarking tiers -> FAST: <id> | SMART: <id>
```

## Current pins

| Tier | env var | Shipped default (`.env.example`) |
| --- | --- | --- |
| 🟢 FAST | `GOOGLE_MODEL_FAST` | `gemini-3.5-flash-lite` |
| 🔵 SMART | `GOOGLE_MODEL_SMART` | `gemini-3.6-flash` |
| 🖼️ IMAGE | `GOOGLE_IMAGE_MODEL` | `gemini-3.1-flash-image` (Nano Banana 2) |

These are the IDs the [public demo](https://sensi.emiliechidiac.com) runs on. They are
pinned deliberately: the **Gemini 2.0 family was retired** (2026-06-01) and the **2.5
family is no longer served to new projects**, so an older pin will fail for a fresh clone.

> **On model IDs generally.** A model's training knowledge of model IDs is stale by
> definition. Every ID adopted here was researched live against official Google sources
> and then **confirmed to load via a real smoke call** before it was trusted. A
> hallucinated or deprecated ID is the failure mode worth guarding against.

## Benchmark baseline

The numbers below were captured **2026-06-20** on the `gemini-3.1-flash-lite` /
`gemini-3.5-flash` tier. They are the most recent full run; the current pins are a
generation newer and have not been re-benchmarked end to end. Treat them as an order-of-
magnitude guide to where latency and cost sit, not as measurements of today's defaults.

Reproduce with `BENCH_NODES=1 python bench_nodes.py` from `python/` (UTF-8) →
`node-bench.json`. One scripted session (analyze → detect/conflict/suggest → edit →
follow-up → chitchat, plus a greet probe) so every runtime LLM node fires at least once.

| Node | Tier | calls | avg s | in tok | out tok | $ (session) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `score_interpreter` | 🔵 SMART | 2 | 24.07 | 1782 | 1004 | 0.0117 |
| `suggestion_critic` | 🔵 SMART | 1 | 16.46 | 1051 | 765 | 0.0085 |
| `conflict_reasoner` | 🔵 SMART | 1 | 10.11 | 1020 | 357 | 0.0047 |
| `respond` | 🔵 SMART | 3 | 8.07 | 5070 | 278 | 0.0101 |
| `detail_respond` | 🔵 SMART | 1 | 5.66 | 4506 | 142 | 0.0080 |
| `edit_planner` | 🔵 SMART | 1 | 3.21 | 855 | 100 | 0.0022 |
| `chitchat` | 🟢 FAST | 1 | 1.48 | 632 | 144 | 0.0004 |
| `what_next` | 🟢 FAST | 5 | 0.77 | 2549 | 249 | 0.0010 |
| `action_classifier` | 🟢 FAST | 5 | 0.76 | 4105 | 183 | 0.0013 |
| `greet` | 🟢 FAST | 1 | 0.60 | 124 | 12 | 0.0001 |
| `evaluator` | 🟢 FAST | 3 | 0.56 | 1307 | 3 | 0.0003 |
| no-LLM (`analyze`, `detect`, `suggest`, `apply_edits`, `compare_versions`, `load_layout`) | — | — | ~0.00 | 0 | 0 | 0.0000 |

**Tier summary:** FAST avg **0.83 s** / **$0.0031** · SMART avg **11.26 s** / **$0.0452**.
Full scripted session: **$0.0483** — under a nickel.

**Image:** `python -m imaging.benchmark` → `results.json`. Nano Banana 2 rendered the
three room cases at avg **11.4 s**, **$0.067/img**, ~800 KB each.

The biggest latency lever is `score_interpreter`, which runs on every analysis and is
dominated by the SMART model's thinking budget. Prompt-trimming or a thinking cap is the
obvious next move; measure it with `bench_nodes.py`.

## Does a newer model actually reason better?

Not something to assume. `bench_quality.py` answers it with a blind A/B, and the method
matters more than the verdict:

1. Run one scripted session with `BENCH_QUALITY=1` to capture the **real (system, user)
   prompt each SMART node actually sent**.
2. **Replay each identical prompt** through the old and the new model, so the model is the
   only variable.
3. Write the outputs as **blind A/B pairs** (`quality-pairs.json`), holding the mapping
   separately (`quality-reveal.json`).
4. Score each pair blind on a 5-point rubric — groundedness, persona fidelity, clarity,
   no-hallucination, usefulness — then reveal.

On the 2.5 → 3.x upgrade the newer model won **7 of 8** blind comparisons. It caught real
feasibility constraints the older one missed (kitchen rugs as a fire and grease hazard,
bathroom wood as a mould risk) and flagged a thermal fix for a cold bedroom that the older
model skipped entirely. The single loss was a marginal phrasing call on a two-sentence
summary, well within noise. Images: the newer image model won 3/3, markedly more
photorealistic against the older model's flatter CG.

The upgrade traded latency and cost for capability — SMART roughly 1.3× slower and the
session ~3.8× costlier — and the blind test is what justified paying it.

## Cost levers not taken

| Option | Why not |
| --- | --- |
| Promote one user-facing node to a Pro model | Top reasoning, but preview status and roughly 8× cost. Revisit if quality demands it. |
| Nano Banana Pro (`gemini-3-pro-image`) for hero renders | Studio-quality 4K with text rendering, at ~2–3.5× the per-image cost. Nano Banana 2 is the balanced default. |
| Stay on the 2.5 tier | Cheaper, but retired for new projects — a fresh clone cannot use it. |
