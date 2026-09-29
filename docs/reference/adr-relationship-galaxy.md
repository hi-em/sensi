# ADR-001: The Relationship Galaxy (3D explore mode)

**Status:** Accepted 2026-05-31 · **Revised** 2026-09-29 · **Deciders:** Emilie (product), Claude (impl)

> Guiding concept: [`concept-the-ripple.md`](concept-the-ripple.md). The galaxy is the
> ripple, flown through.

## Context
The 2D plan is the analysis surface. The galaxy is the second, immersive mode: the whole
home's relationships at once, in 3D. The first version (May) drew every coupling the
model *could* apply, with text labels, arrows and an L1/L2/L3 complexity dial. It was
dense, it implied directions the data doesn't have (doors), and it showed rules rather
than what the model actually computed for this home.

## Decision
Keep **`3d-force-graph`** (three.js) + `UnrealBloomPass` in a **lazy-loaded full-screen
overlay**, but draw **only model output**, on the same marks as the 2D views.

**Data.** One pure builder, `galaxy/galaxyGraph.js` → `buildGalaxy(turn, persona)`:

| Node | Mark (`marks/marks3d.js`) | Size |
|---|---|---|
| sense (6) | nebula | rooms below your threshold |
| room | blob + room-type icon | senses below your threshold |
| lever | glass lantern | senses it moves |

| Link | Source | Drawn as |
|---|---|---|
| ripple sense→sense | `scores_json.rooms[].adjustments`, grouped per edge (`lib/rippleEvents.js` → `homeEvents`) | fiber + travelling dots, cause → effect; red lowers, green raises; dots = rooms it fired in |
| door room–room | `graph_data.edges[].transmissive_conflicts` | plain line, **no direction** (the data has none) |
| short room→sense | score below threshold | faint line |
| lever→sense | `LEVER_SENSE` table | green raises / red lowers; dashed = not verified |

Nothing is re-derived client-side: if the model didn't emit an adjustment, there is no fiber.

**Layout.** Soft forces, not fixed positions: senses on a ring (chord order), levers
above, rooms below; levers drift toward the senses they move and the rooms they could help.

**Interaction.** Hover anything → one-line readout (top right). Click a room → it bursts
into its six score nodes (pinned on the burst curve, fullness = felt score, notch = below
you) with only that room's own ripple; several can be open; open neighbours share a sense
across a door when topology flags it. "Open all" / Esc. Click a sense → its ripple only.

**Words.** No text in the scene. A glyph legend on the side, and a 5-beat first-look tour
(home · senses · rooms · levers · ripple), shown once and replayable from "?".

**Performance / access.**
- Still frame on slow devices: frame-time average > 30 ms after ~20 frames → animation
  pauses and resumes only on interaction (gaps > 250 ms, e.g. a hidden tab, are ignored).
- `prefers-reduced-motion`: laid out, then still.
- No WebGL: the ripple chord + score grid instead (`marks/Chord.jsx`, `marks/ScoresGrid.jsx`).
- three.js stays out of the initial bundle (`React.lazy` in `LayoutModeScreen`).

**Export.** `report/exportBundle.js` writes the same `buildGalaxy` output next to
`graph_data`, so the exported graph and the on-screen galaxy can't disagree.

## What changed from the first version
| First version (May) | Now |
|---|---|
| every possible coupling (`SENSE_SENSE`) | only the adjustments the model applied to this home |
| text sprites (`three-spritetext`), HTML tooltip | no text in the scene; glyph legend + readout |
| arrowheads on doors | undirected doors |
| L1/L2/L3 complexity dial | one view; click to open rooms |
| own node styles | the shared 2D/3D marks |
| always animated | still frame on slow devices and reduced motion; 2D fallback without WebGL |

## Consequences
- **Easier:** the galaxy, chord, grid, ledger and export all read one data structure, so
  they agree by construction.
- **Harder:** fewer relationships on screen than the rule table holds; the full rule
  table lives in `docs/reference/comfort-model-references.md`, not in the galaxy.
- **Revisit:** a large home (many rooms open at once) on a no-GPU device drops frames
  before the still-frame rule kicks in.

## Files
`web/src/galaxy/galaxyGraph.js` · `web/src/galaxy/RelationshipGalaxy.jsx` ·
`web/src/marks/marks3d.js` · `web/src/lib/rippleEvents.js` · `web/src/report/exportBundle.js`
