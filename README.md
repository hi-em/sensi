# Sensi

**A comfort-analysis copilot for architectural layouts.** Sensi reads a parametric
floor plan (rooms as JSON rectangles), models sensorial comfort across six senses,
scores each room, surfaces the conflicts between senses, and proposes or applies
edits. A LangGraph agent does the reasoning; a FastAPI backend exposes it over
streaming SSE and serves a React + Vite frontend (chat, CAD-style plan, comfort and
material layers, a relationship graph, a 3D galaxy, and the persona screens).

> **MaCAD '26 Winner (June 2026).**
> Institute for Advanced Architecture of Catalonia (IAAC), Master in Advanced
> Computation for Architecture and Design.

**Live demo:** [sensi.emiliechidiac.com](https://sensi.emiliechidiac.com). First load after a quiet spell takes a few seconds while the server wakes.

**Team of 4.** Emilie El Chidiac (project lead), Charles Abi Chahine,
María Sánchez Domínguez, Lakzhmy Mari Zaro. That team built the version that
won. Development continues solo as Emilie's MaCAD thesis.

Built during the MaCAD 2026 computational design studio at IAAC, taught by
João Silva, with teaching assistants Scott Lebow and Bao Q. Trinh. The studio
repository, which hosts every team's work including the original `team_02/`
version of this project, is
[sclebow/AIA26_Studio](https://github.com/sclebow/AIA26_Studio). This repository is
the continuation of that work as an ongoing thesis project, with fresh
history.

![Sensi concept collage](final-sensi-concept/images/00%20-%20Concept%20Collage.png)

## What Sensi actually does

Sensi treats sensory comfort as data attached to a floor plan. It does not measure
anything in a real building, and it makes no clinical or health claims.

- **Six senses as one model.** Thermal, visual, acoustic, spatial, olfactory and
  tactile. Each is scored per room from geometry and material attributes already
  present in the layout JSON (glazing ratio and type, orientation, ventilation, room
  volume, surface material, adjacency to noisy or wet rooms, plants).
- **Couplings, not independent scores.** The model encodes how one design variable
  moves several senses at once, in both directions. More glazing lifts the visual
  score and weakens the acoustic one. Soft surfaces lift tactile and acoustic
  together. Each coupling in
  [`python/comfort/sense_model.py`](python/comfort/sense_model.py) is labelled
  `verified` or `inferred`, so you can see which ones rest on published
  room-acoustics and material physics and which are the team's reasoned estimates.
- **A deliberately hard-to-game aggregate.** The whole-dwelling number is
  non-additive with a veto floor, so a weak sense drags the total and cannot be
  papered over by a strong one.
- **The ripple is the point.** The aggregate is a status light. The interesting
  output is which other senses move when you change one thing, shown as a
  relationship graph, a narrated 3D galaxy, and a horizontal ripple graph of the
  edit history. See
  [`docs/reference/concept-the-ripple.md`](docs/reference/concept-the-ripple.md).
- **Calibrated to one person at a time.** A persona captures an individual's stated
  sensory priorities and reweights the scoring, rather than scoring against an
  average occupant.
- **Agentic editing with a preview.** The agent can score a hypothetical change and
  show the predicted ripple before anything is committed, then apply, checkpoint and
  restore edits on request. Placement of new windows and furniture is checked for
  spatial soundness with Shapely.

Sensi is a design-reasoning and teaching tool. It models and estimates; it does not
optimise a layout for you and it does not measure wellbeing.

**45-second walkthrough:**
[`docs/marketing/sensi-45s-16x9-scored.mp4`](docs/marketing/sensi-45s-16x9-scored.mp4).
Concept boards and the logo are in
[`final-sensi-concept/`](final-sensi-concept/).

## Repository layout

```
.
├── python/                FastAPI backend + LangGraph agent
│   ├── api/               server.py (HTTP + SSE), contracts.py
│   ├── comfort/           the three pure-Python comfort tools (no Rhino needed)
│   ├── imaging/           per-room generative "feeling" renders
│   ├── inspire/           persona / inspire pipeline
│   ├── nodes/             graph nodes (onboarding, scoring, editing, insights)
│   ├── tests/             pytest suite for the edit tools
│   ├── _runtime/          config, LLM factory, local tool client
│   └── requirements.txt
├── web/                   React + Vite frontend (builds into web/dist)
├── docs/                  configuration guide + reference documentation
├── final-sensi-concept/   concept boards, logo, the one-sentence pitch
├── personas/              persona.json, rewritten by the onboarding flow
├── randomized_layouts/    the source layouts the app reads (read-only input)
├── resulting_layout/      analysis output written at runtime (git-ignored)
└── Dockerfile             one-container build (builds web, serves via FastAPI)
```

## Prerequisites

- **Python 3.11+** (the steps below assume your virtualenv is active)
- **Node.js 20+** (includes npm), used to build the frontend
- **An LLM provider.** Google, OpenAI, Cloudflare Workers AI, or a local
  OpenAI-compatible server (LM Studio, Ollama). Cloudflare Workers AI has a free
  tier with no credit card.

All commands are written for **Windows PowerShell**, run from the repository root
(the folder containing this README).

## 1. Configure your environment, one time

Settings load from a single `.env` file at the repository root. Copy the example and
fill it in:

```powershell
copy .env.example .env
```

Set `LLM_PROVIDER` to one of `google`, `openai`, `cloudflare`, or `local`, then fill
in the matching keys. Example:

```env
LLM_PROVIDER = "google"
GOOGLE_API_KEY = "your_google_api_key"
GOOGLE_MODEL = "gemini-2.5-flash-lite"
```

Every provider is called through one OpenAI-compatible client, so you only need keys
for the provider you actually select. `.env` is git-ignored and must never be
committed.

### Optional: per-node model tiers

Nodes can run on different models, a small one for routing and short text and a
larger one for user-facing prose. These fall back to the base model when unset:

```env
GOOGLE_MODEL_FAST  = "gemini-2.5-flash-lite"
GOOGLE_MODEL_SMART = "gemini-2.5-flash"
```

The same pattern works for any provider (`OPENAI_MODEL_FAST`, and so on). Rationale
and the node-to-tier mapping:
[`docs/reference/models-and-benchmarks.md`](docs/reference/models-and-benchmarks.md).

### Optional: image generation

The per-room renders in the Report and Vision screens call an image model. Set
`IMAGE_PROVIDER` and the matching model, or leave the defaults. Each render is a
paid API call, which is worth knowing before you click through the Vision screen.

## 2. Install and build, one time

```powershell
pip install -r python\requirements.txt
cd web
npm install
npm run build
cd ..
```

`npm run build` compiles the frontend into `web\dist`, which the backend serves
directly. You need this for single-process mode (step 4) and must re-run it after
every frontend change there. For development (step 3) you do not need to build at
all, because Vite serves `web/src` live.

## 3. Run the app in development, two terminals

Use this while editing the frontend. Vite hot-reloads on every save. Both commands
run from the repository root.

**Terminal 1, backend (FastAPI on :8000):**

```powershell
uvicorn api.server:app --app-dir python --reload --port 8000
```

**Terminal 2, frontend (Vite on :5173):**

```powershell
cd web
npm run dev
```

Then open **http://localhost:5173**, not 8000. Vite serves `web/src` directly and
proxies `/api` calls to the backend, so it behaves as one app. Restart uvicorn only
if you change Python. Press `Ctrl+C` in each terminal to stop.

## 4. Run as one process

When you are not editing, build the frontend once and let the backend serve it:

```powershell
cd web; npm run build; cd ..
uvicorn api.server:app --app-dir python --port 8000
```

Then open **http://localhost:8000**. Re-run `npm run build` after any frontend
change to refresh what is served here.

## 5. Docker, one shareable container

From the repository root:

```powershell
docker build -t sensi .
docker run --env-file .env -p 8000:8000 sensi
```

The app is served at **http://localhost:8000**. The image builds the frontend and
runs the FastAPI backend that serves it. Credentials are supplied at runtime and are
never baked into the image.

## Headless CLI

Run a single turn non-interactively and get a machine-readable result, from
`python\`:

```powershell
python main.py --prompt "add a window to the south wall of the living room" --layout_json '{ ...layout... }'
```

With no flags you get the normal interactive session. Details:
[`docs/reference/cli.md`](docs/reference/cli.md).

## Tests

From `python\`:

```powershell
python -m pytest tests/
```

## Troubleshooting

- **`Missing or empty required environment variable`.** Your `.env` is missing a key
  for the selected `LLM_PROVIDER`, or `.env` is not at the repository root.
- **Blank page or 404 at :8000.** The frontend is not built yet. Run `npm run build`
  in `web\` (step 2).
- **Frontend loads but chat does nothing.** Check the uvicorn terminal for errors,
  usually a bad or missing API key in `.env`.
- **Port already in use.** Change `--port 8000` to another port and use that in the
  URL.
- **Editing the frontend but changes do not show.** You are probably on :8000 (built
  mode). Use the two-terminal dev flow (step 3) and open :5173, or re-run
  `npm run build`.

## Documentation

- [`docs/configuration.md`](docs/configuration.md), every environment variable, the three
  run modes, and what `DEMO_MODE` does. Start here.
- [`docs/reference/concept-the-ripple.md`](docs/reference/concept-the-ripple.md), the core
  concept behind the scoring and the graph.
- [`docs/reference/comfort-model-references.md`](docs/reference/comfort-model-references.md),
  the sources behind the comfort model.
- [`docs/reference/report-vision-pipeline.md`](docs/reference/report-vision-pipeline.md),
  the Report and Vision pipeline end to end.
- [`docs/reference/models-and-benchmarks.md`](docs/reference/models-and-benchmarks.md),
  model tiering, current pins, per-node cost and latency.
- [`docs/README.md`](docs/README.md), a map of the rest, plus where the studio-period
  record lives.
- [`CONTRIBUTING.md`](CONTRIBUTING.md), how the two of us work on this.
