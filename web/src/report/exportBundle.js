import * as api from "../api/client.js";
import { buildRelationshipGraph, LENSES } from "../lib/relationshipGraph.js";

// JSON bundle export — the "real tool" artifact: the layout, its comfort scores, topology graph, galaxy graph,
// conflicts, suggestions, and the per-room render prompts, in one downloadable file.
// Pure client; layout comes from /api/layout, the analysis comes off the turn.
function parse(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }

// The galaxy's nodes/links with every lens on, data fields only (no draw styling).
const idOf = (x) => (x && typeof x === "object" ? x.id : x);
function galaxyGraph(turn, persona) {
  const { nodes, links } = buildRelationshipGraph(turn, persona, LENSES.map((l) => l.key));
  return {
    nodes: nodes.map(({ id, kind, label, sense, group, fail, overall, roomId, degree, betweenness, bridge, isolated, rtype }) =>
      ({ id, kind, label, sense, group, fail, overall, roomId, degree, betweenness, bridge, isolated, rtype })),
    links: links.map(({ source, target, kind, sense, sign, mech, basis, door }) =>
      ({ source: idOf(source), target: idOf(target), kind, sense, sign, mech, basis, door })),
  };
}

export async function exportBundle({ turn, rooms = [], layoutId, persona = null, moodboardUrls = [] }) {
  let layout = null;
  try { const d = await api.getLayout(); layout = d?.layout || null; } catch { /* best effort */ }

  const p = persona || {};
  const bundle = {
    layoutId: layoutId || null,
    exportedAt: new Date().toISOString(),
    // Who the dwelling was shaped for + the aesthetic they curated — so the exported
    // artifact carries the input that produced the output, not just the rooms.
    persona: persona ? {
      name: p.name,
      role: p.role,
      lifestyle: p.lifestyle,
      sensory_priorities: p.sensory_priorities,
      comfort_weights: p.comfort_weights,
      aesthetic_preferences: p.aesthetic_preferences,
    } : null,
    moodboard_urls: moodboardUrls || [],
    layout,
    scores: parse(turn?.scores_json),
    conflicts: parse(turn?.conflicts_json),
    suggestions: parse(turn?.suggestions_json),
    graph_data: turn?.graph_data || null,
    galaxy: galaxyGraph(turn, persona),
    prompts: rooms.map((r) => ({
      room: r.room_name,
      room_type: r.room_type,
      overall_score: r.overall_score,
      comfort_scores: r.comfort_scores,
      prompt: r.prompt,
    })),
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sensi-report-${layoutId || "layout"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
