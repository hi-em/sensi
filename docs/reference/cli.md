# The headless CLI

Sensi normally runs as a web app, but `python/main.py` also exposes a **single-turn,
machine-readable interface** so another program can call the agent as a subprocess.
This is the interface an orchestrator uses.

## Calling it

From `python/` (on Windows, set `PYTHONIOENCODING=utf-8` first, or the agent fails on
non-ASCII output):

```bash
python main.py --prompt "add a window to the south wall of the living room" --layout_json '{ ...layout... }'
```

| Flag | Required | Meaning |
| --- | --- | --- |
| `--prompt` | yes, to enter CLI mode | The user instruction. |
| `--layout_json` | no | A layout as a JSON string. Must match [`layout-schema.json`](layout-schema.json). |

**With no flags you get the normal interactive REPL**, unchanged.

## Output contract

stdout carries **only** this block — every diagnostic goes to stderr, so a caller can
parse stdout directly:

```
Final Response:
<agent response>

Edited Layout JSON:
<edited layout JSON, or "No layout changes">
```

An invalid `--layout_json` prints a clear error to stderr and exits non-zero.

## How the layout is injected

The graph does **not** read `ctx.layout_data`. A layout flows through the `load_layout`
node and is carried in the agent session as `session["layout_json_string"]`.

So the CLI injects the caller's layout into the **session**, and `load_layout`'s existing
"skip if already loaded" guard honours it instead of reading a file from
`randomized_layouts/`. The caller's layout wins, and no graph or node code was needed to
make that true. (Verified by passing `Layout-101`, which does not exist on disk, and
confirming it is the layout used.)

## Behaviour in CLI mode

- **The conversation stays open.** After the first `--prompt` turn the process reads
  follow-up lines from stdin, so a caller can answer the agent's clarifying questions and
  keep going. `EOF` or `exit` ends the process.
- **Onboarding is skipped.** A subprocess cannot run greet / quiz / inspire. If
  `personas/persona.json` exists it is loaded, so scoring uses real comfort weights;
  otherwise scoring is neutral.
- **Nothing is written to disk.** The analysis writer is redirected to a temp directory,
  so a throwaway caller layout never lands in `resulting_layout/`.

## Verified behaviour

| Check | Result |
| --- | --- |
| "add a window" on `Layout-101` | edited layout returned |
| Injected layout honoured over the disk fallback | confirmed |
| stdout is a clean, parseable block | confirmed (diagnostics on stderr) |
| Analyze-only prompt | prints `No layout changes` |
| Invalid `--layout_json` | clear error, non-zero exit |
| No flags | REPL unchanged |
