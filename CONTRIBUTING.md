# Contributing

Sensi is worked on by two people, so the process is deliberately small. Work on `main`.
Pull before you start, push when a change stands on its own, and say what you touched —
that is the whole convention for now. Branches and review can come later, when the pace or
the number of people makes them worth the friction.

Two things do matter. **`main` is what deploys** to
[sensi.emiliechidiac.com](https://sensi.emiliechidiac.com), so run `python -m pytest tests/`
from `python/` before pushing, and if a change touches the graph, the API or the build,
run the app once and take a real chat turn. And **never commit `.env`** — it is git-ignored
for a reason. If you add a variable, add it to `.env.example` and to
[`docs/configuration.md`](docs/configuration.md) in the same change, so a fresh clone stays
runnable.
