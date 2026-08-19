# Sensi docs

Documentation for the product. Start with **[configuration.md](configuration.md)** — how
to configure and run every mode, and what `DEMO_MODE` does.

```
docs/
├── configuration.md   env vars, the three run modes, DEMO_MODE
├── reference/         living product documentation
└── marketing/         the 45-second walkthrough
```

## reference/

**Concept**
- [concept-the-ripple.md](reference/concept-the-ripple.md) — the core idea. Comfort is
  coupled: change one sense and the others move. Everything else serves this.
- [comfort-model-references.md](reference/comfort-model-references.md) — the published
  sources behind the comfort model, and which couplings are `verified` versus `inferred`.

**Architecture**
- [report-vision-pipeline.md](reference/report-vision-pipeline.md) — the Report and
  Vision pipeline end to end: model, prompts, scoring, before/after, exports.
- [adr-relationship-galaxy.md](reference/adr-relationship-galaxy.md) — ADR-001, the
  decision behind the 3D explore mode.
- [graph-relationships-audit.md](reference/graph-relationships-audit.md) — what the model
  knows about relationships versus what the UI shows.

**Operating it**
- [models-and-benchmarks.md](reference/models-and-benchmarks.md) — the FAST/SMART tiering,
  the current model pins, per-node latency and cost, and the blind A/B method used to
  prove a model upgrade did not regress reasoning.
- [cli.md](reference/cli.md) — the headless single-turn interface.
- [layout-schema.json](reference/layout-schema.json) — the shape a layout JSON must have.

The frontend has its own design system doc: [`web/DESIGN_SYSTEM.md`](../web/DESIGN_SYSTEM.md).

---

## Provenance

Sensi began as `team_02/` inside the MaCAD studio repository
[sclebow/AIA26_Studio](https://github.com/sclebow/AIA26_Studio) (branch `team_02`). That
branch holds the full studio-period record — weekly decks, presentation scripts, faculty
notes, session findings and benchmark renders — kept as written on their dates.

Those materials are not republished here. They are frozen course deliverables whose file
paths refer to the original repository layout, and this repository is the product. The
engineering content from them that remains true and useful was rewritten into
`reference/` above, as living documentation rather than dated notes.
