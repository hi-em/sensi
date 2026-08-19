# Configuring and running Sensi

Everything Sensi needs comes from **one `.env` file at the repository root**. Copy the
example and edit it:

```powershell
copy .env.example .env
```

`.env` is git-ignored and must never be committed. [`.env.example`](../.env.example) is
the authoritative list of every variable — this page explains what they mean and which
ones you actually need.

---

## The three ways to run it

| Mode | Command | Open | Use it when |
| --- | --- | --- | --- |
| **Development** (two terminals) | `uvicorn api.server:app --app-dir python --reload --port 8000` and, in `web/`, `npm run dev` | **:5173** | You are editing the frontend. Vite hot-reloads and proxies `/api` to the backend. |
| **Single process** | `cd web; npm run build; cd ..` then `uvicorn api.server:app --app-dir python --port 8000` | **:8000** | You are not editing the frontend. FastAPI serves the built `web/dist`. |
| **Docker** | `docker build -t sensi .` then `docker run --env-file .env -p 8000:8000 sensi` | **:8000** | You want one shareable container. Credentials are supplied at runtime, never baked into the image. |

Two details that catch everyone:

- **In development, open :5173, not :8000.** Vite is the one serving your source.
- **In single-process and Docker, re-run `npm run build` after every frontend change.**
  The backend serves `web/dist`, which is a build artifact.

There is also a [headless CLI](reference/cli.md) for calling the agent as a subprocess.

---

## The variables you must set

Pick one provider. Every provider is reached through a single OpenAI-compatible client,
so you only need keys for the one you select.

```env
LLM_PROVIDER = "google"          # google | openai | cloudflare | local
GOOGLE_API_KEY = "..."
GOOGLE_MODEL   = "gemini-3.5-flash-lite"
```

| Provider | Needs | Note |
| --- | --- | --- |
| `google` | `GOOGLE_API_KEY`, `GOOGLE_MODEL` | What the public demo runs on. |
| `openai` | `OPENAI_API_KEY`, `OPENAI_MODEL` | |
| `cloudflare` | `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `CF_MODEL` | Free tier, no credit card. |
| `local` | `LOCAL_LLM_ENDPOINT` | Any OpenAI-compatible server: LM Studio, Ollama. |

Anthropic keys are present in `.env.example` but **not currently supported** — this
codebase's JSON response handling does not match that API's format.

If a required key is missing you get `Missing or empty required environment variable`
at startup, naming the variable.

---

## The variables worth knowing about

### Per-node model tiers

Nodes run on two tiers: a small fast model for routing and short text, a larger one for
user-facing prose. Both fall back to the base model when unset.

```env
GOOGLE_MODEL_FAST  = "gemini-3.5-flash-lite"
GOOGLE_MODEL_SMART = "gemini-3.6-flash"
```

The same pattern works for any provider (`OPENAI_MODEL_FAST`, `CF_MODEL_SMART`, …).
Which node sits on which tier, and the benchmarks behind the choice:
[reference/models-and-benchmarks.md](reference/models-and-benchmarks.md).

### Image generation

The per-room "feeling" renders in the Report and Vision screens call an image model.

```env
IMAGE_PROVIDER     = "google"
GOOGLE_IMAGE_MODEL = "gemini-3.1-flash-image"
# GOOGLE_IMAGE_API_KEY = "..."   # optional: a separate, billed key
```

**Each render is a paid API call** — worth knowing before you click through the Vision
screen. `GOOGLE_IMAGE_API_KEY` exists so images can bill against a capped paid project
while chat stays on a free-tier key. Falls back to `LLM_PROVIDER` when unset.

`UNSPLASH_ACCESS_KEY` is optional and only powers reference imagery in the inspire
pipeline.

### Runtime

```env
REQUEST_TIMEOUT_SECONDS = "30"
MAX_ITERATIONS          = "100"    # max StateGraph iterations
DEBUG_GRAPH             = "false"  # "true" prints StateGraph step traces
```

---

## `DEMO_MODE` — the public-deployment guard

**Leave this off locally.** `DEMO_MODE = "false"` is the default and every check below is
a no-op unless it is truthy (`1`, `true`, `yes`, `on`), so local development and the
desktop workflow are entirely unaffected.

When it *is* on, it does two things — see [`python/api/rate_limit.py`](../python/api/rate_limit.py):

**1. Rate limits, sized to free provider quotas** rather than to hoped-for traffic. The
Gemini free tier is roughly 15 requests/min and ~1k/day project-wide, and image generation
is real money at roughly $0.04 an image. The point is that a burst of strangers from a
LinkedIn post degrades into polite "try again in a minute" messages instead of eating the
whole daily quota in one spike.

| Scope | Per visitor | Global | On limit |
| --- | --- | --- | --- |
| `chat` (any agent turn) | 6/min, 80/day | 8/min, 300/day | "The demo is at its usage limit right now" |
| `image` (billable renders) | 4/min, 15/day | 8/min, 60/day | Renders pause; scores, analysis and editing keep working |

One chat turn fans out into several provider calls (routing, tools, prose), which is why
the global per-minute allowance sits well under the provider's own ceiling. Cache hits are
exempt — the gate runs only when a generation is actually about to happen.

**2. The shared persona goes read-only.** `personas/persona.json` is a single file on
disk. With many visitors on one instance, letting any of them overwrite it would mean
strangers editing each other's persona mid-session, so in demo mode it is never written;
refinements stay in the visitor's own session.

Counters are **in-memory on purpose**: the demo runs a single instance, so process-local
counters *are* the global counters, and losing them on a restart is harmless — the windows
simply refill. This is also why the deployment pins `max-instances=1`: in-memory sessions
and this rate limiter both assume one process.

---

## Benchmark-only variables

Read by `bench_nodes.py`, `bench_quality.py` and `imaging/benchmark.py`. Not needed to run
the app.

```env
# BENCH_NODES           = "1"
# BENCH_QUALITY         = "1"
# BENCH_IMAGE_PROVIDERS = "google,openai"
```

---

## When it does not work

| Symptom | Cause |
| --- | --- |
| `Missing or empty required environment variable` | `.env` lacks a key for your `LLM_PROVIDER`, or `.env` is not at the repository root. |
| Blank page or 404 at :8000 | The frontend is not built. Run `npm run build` in `web/`. |
| Frontend loads, chat does nothing | Check the uvicorn terminal — usually a bad or missing API key. |
| Frontend edits do not show | You are on :8000 (built mode). Use the dev flow and open :5173, or rebuild. |
| Port already in use | Change `--port 8000` and use that port in the URL. |
| A model ID is rejected | Your pin may be a retired generation. See [reference/models-and-benchmarks.md](reference/models-and-benchmarks.md). |
