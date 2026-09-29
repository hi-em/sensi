// The ripple on the galaxy: only the sense→sense adjustments the model computed
// (lib/rippleEvents.js homeEvents), one hop, never walked further through the rules.
//   color = valence of the realized delta (red lowered / green raised)
//   count = rooms where the edge fired · speed = |mean delta|
import { valenceColor } from "./rippleEvents.js";

export function rippleSteps(source, events) {
  return (events || []).filter((e) => e.from === source).map((e) => ({
    from: e.from, to: e.to, color: valenceColor(e.meanDelta), delay: 0,
    count: e.count, speed: 0.004 + Math.abs(e.meanDelta) * 0.05,
  }));
}

// The overall worst sense — most rooms failing it, tie-break lowest mean score.
export function worstSense(rooms, senses, thr) {
  let best = senses[0], bestFail = -1, bestMean = 2;
  senses.forEach((s) => {
    let fail = 0, sum = 0, n = 0;
    rooms.forEach((r) => { const v = r.comfortScores?.[s] ?? 1; n++; sum += v; if (v < thr(s)) fail++; });
    const mean = n ? sum / n : 1;
    if (fail > bestFail || (fail === bestFail && mean < bestMean)) { best = s; bestFail = fail; bestMean = mean; }
  });
  return best;
}
