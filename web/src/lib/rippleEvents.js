// The one ripple data structure every view draws. Built only from what the scoring
// model returned (scores_json.rooms[].adjustments): if the model didn't emit an
// adjustment, it isn't here. No client-side re-derivation of the coupling rules.
import { SENSES, STATUS } from "./senses.js";

// One room's sense→sense adjustments (one hop, exactly as the model applied them).
export function roomEvents(room) {
  return (room?.adjustments || [])
    .filter((a) => SENSES.includes(a.from) && SENSES.includes(a.sense))
    .map((a) => ({ from: a.from, to: a.sense, delta: a.delta, basis: a.basis, tier: a.tier,
      mechanism: a.mechanism, room: room.roomName, srcBase: room.baseScores?.[a.from] }));
}

// Person-layer nudges (personality / household): real, but not sense→sense.
export function personEvents(room) {
  return (room?.adjustments || []).filter((a) => !SENSES.includes(a.from));
}

// The whole home's ripple: every room's events grouped by directed edge.
// count = rooms where the edge fired (a count, not an invented strength).
export function homeEvents(rooms) {
  const by = new Map();
  (rooms || []).forEach((r) => roomEvents(r).forEach((e) => {
    const k = `${e.from}>${e.to}`;
    const g = by.get(k) || { from: e.from, to: e.to, rooms: [], deltas: [], basis: e.basis, tier: e.tier, mechanism: e.mechanism };
    g.rooms.push(e.room); g.deltas.push(e.delta); by.set(k, g);
  }));
  return [...by.values()].map((g) => ({ ...g, count: g.rooms.length,
    meanDelta: g.deltas.reduce((a, b) => a + b, 0) / g.deltas.length }));
}

// Valence of a realized delta: red = lowered, green = raised (never the sense hue).
export const valenceColor = (delta) => (delta < 0 ? STATUS.fail : STATUS.pass);

export const reducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
