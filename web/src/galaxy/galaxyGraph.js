// Pure builder for the galaxy: turn + persona → { nodes, links }. Everything here is
// model output: scores (scores_json), the model's own sense→sense adjustments
// (homeEvents), the lever table, and the topology's doors (graph_data.edges).
//   sense  node : size = rooms below this person's threshold
//   room   node : its felt scores (blob) + type (from topology, when known)
//   lever  node : the senses it moves, with their sign
//   links  : ripple sense→sense (count = rooms it fired in; mutual = both ways)
//            short room–sense (below you) · lever→sense (signed) · door room–room
//            (tinted when topology flags a sense failing on it; no direction)
import { SENSES, STATUS } from "../lib/senses.js";
import { LEVER_SENSE, thresholdFromWeight } from "../lib/senseModel.js";
import { homeEvents } from "../lib/rippleEvents.js";

export const WORD = { thermal: "warmth", visual: "light", acoustic: "sound", spatial: "space", olfactory: "smell", tactile: "touch" };
export const SIGN_COLOR = { "+": STATUS.pass, "-": STATUS.fail, "±": STATUS.warn };
const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

export function buildGalaxy(turn, persona) {
  const rooms = parse(turn?.scores_json)?.rooms || [];
  const gd = turn?.graph_data || {};
  const thr = (s) => thresholdFromWeight(persona?.comfort_weights?.[s] ?? 0.5);
  const typeOf = new Map((gd.nodes || []).map((n) => [n.id, n.room_type]));
  const roomKey = (r) => `room:${r.roomId ?? r.roomName}`;
  const nodes = [], links = []; const n = Math.max(1, rooms.length);
  if (!rooms.length) return { nodes, links, thr, events: [], rooms };

  SENSES.forEach((s) => {
    const fail = rooms.filter((r) => (r.comfortScores?.[s] ?? 1) < thr(s)).length;
    nodes.push({ id: `sense:${s}`, kind: "sense", s, fail, imp: 1 + (fail / n) * 2 });
  });
  rooms.forEach((r) => {
    const failing = SENSES.filter((s) => (r.comfortScores?.[s] ?? 1) < thr(s));
    nodes.push({ id: roomKey(r), kind: "room", r, rtype: typeOf.get(r.roomId), failing, imp: 0.6 + failing.length * 0.25 });
    failing.forEach((s) => links.push({ source: roomKey(r), target: `sense:${s}`, kind: "short", s, def: thr(s) - (r.comfortScores?.[s] ?? 1) }));
  });
  [...new Set(LEVER_SENSE.map((l) => l[0]))].forEach((lv) => {
    const rows = LEVER_SENSE.filter((l) => l[0] === lv);
    // rooms where a sense this lever raises falls short (a potential, not a prediction)
    const helps = rooms.filter((r) => rows.some(([, s, sign]) => sign === "+" && (r.comfortScores?.[s] ?? 1) < thr(s))).map(roomKey);
    nodes.push({ id: `lever:${lv}`, kind: "lever", lv, rows, helps, imp: 0.5 + rows.length * 0.2 });
    rows.forEach(([, s, sign, tier, mech]) => links.push({ source: `lever:${lv}`, target: `sense:${s}`, kind: "lever", s, sign, tier, mech }));
  });
  const byId = new Set(rooms.map((r) => `room:${r.roomId}`));
  (gd.edges || []).forEach((e) => {
    const a = `room:${e.source}`, b = `room:${e.target}`; if (!byId.has(a) || !byId.has(b)) return;
    links.push({ source: a, target: b, kind: "door", conflicts: e.transmissive_conflicts || [], door: e.door_name });
  });
  const events = homeEvents(rooms);
  events.forEach((e) => {
    const mutual = events.some((x) => x.from === e.to && x.to === e.from);
    links.push({ source: `sense:${e.from}`, target: `sense:${e.to}`, kind: "ripple", e, mutual, side: [e.from, e.to].sort()[0] === e.from ? 1 : -1, reach: e.count / n });
  });
  return { nodes, links, thr, events, rooms };
}
