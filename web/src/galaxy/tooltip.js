// Galaxy hover tooltips. 3d-force-graph writes nodeLabel's return value into
// innerHTML, and room names come from layout JSON (uploads included), so every
// interpolated value is escaped here.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

export function nodeLabelHtml(n) {
  const label = escapeHtml(n.label);
  if (n.kind === "sense") return `<div class="gx-tip"><b>${label}</b><br/>rooms failing: ${escapeHtml(n.fail)} · click to ripple / expand</div>`;
  if (n.kind === "room") return `<div class="gx-tip"><b>${label}</b><br/>type ${escapeHtml(n.rtype || "—")} · doors ${escapeHtml(n.degree)}${n.bridge ? " · structural" : ""}${n.isolated ? " · isolated" : ""}<br/>click to expand its senses + neighbours</div>`;
  if (n.kind === "score") return `<div class="gx-tip"><b>${label}</b></div>`;
  return `<div class="gx-tip"><b>${label}</b><br/>design lever · click to expand</div>`;
}
