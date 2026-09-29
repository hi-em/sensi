// The whole-home ripple chord. Only the model's own sense→sense adjustments
// (homeEvents): one ribbon per directed edge, width = rooms where it fired; dots travel
// cause → effect along it, one per room, red = lowers, green = raises; each sense end is
// a full nebula sized by how many rooms sit below this person's threshold for it.
// Still frame under reduced motion or when frames run slow.
import { useEffect, useMemo, useRef, useState } from "react";
import { SENSES, SC, STATUS } from "../lib/senses.js";
import { homeEvents, reducedMotion } from "../lib/rippleEvents.js";
import { Nebula2D } from "./marks2d.js";

const W = 640, C = W / 2, R = 200;
const ang = (k) => (k * 60 - 90) * Math.PI / 180;
const pt = (a, r = R) => [C + r * Math.cos(a), C + r * Math.sin(a)];
export const edgeKey = (e) => `${e.from}>${e.to}`;
const tintOf = (e) => (e.meanDelta < 0 ? STATUS.fail : STATUS.pass);

export default function Chord({ rooms, size = W, thr, minimal = false, hover: hov, setHover: setHov, onSense, still = false }) {
  const edges = useMemo(() => homeEvents(rooms).sort((a, b) => b.count - a.count), [rooms]);
  const [own, setOwn] = useState(null);
  const hover = hov !== undefined ? hov : own, setHover = setHov || setOwn;
  const hk = hover ? edgeKey(hover) : null;

  // each edge gets a slot on its source arc (out) and its target arc (in)
  const slots = useMemo(() => {
    const out = {}, inn = {}; SENSES.forEach((s) => { out[s] = []; inn[s] = []; });
    edges.forEach((e) => { out[e.from].push(e); inn[e.to].push(e); });
    const place = {}, span = {};
    const maxTot = Math.max(1, ...SENSES.map((s) => [...out[s], ...inn[s]].reduce((t, e) => t + e.count, 0)));
    const unit = Math.min(0.07, 0.95 / maxTot);
    SENSES.forEach((s, k) => {
      const a0 = ang(k); const idx = (x) => (SENSES.indexOf(x) - k + 6) % 6;
      const list = [...out[s].map((e) => ["o", e, idx(e.to)]), ...inn[s].map((e) => ["i", e, idx(e.from)])].sort((p, q) => q[2] - p[2]);
      const total = list.reduce((t, [, e]) => t + e.count * unit, 0); let cur = a0 - total / 2;
      span[s] = [a0 - total / 2, a0 + total / 2];
      list.forEach(([side, e]) => { const w = e.count * unit; (place[edgeKey(e)] ||= {})[side] = [cur, cur + w]; cur += w; });
    });
    return { place, span };
  }, [edges]);

  const ribbon = (e) => {
    const p = slots.place[edgeKey(e)]; const r = R - 6;
    const [a, b] = [pt(p.o[0], r), pt(p.o[1], r)], [c, d] = [pt(p.i[0], r), pt(p.i[1], r)];
    return `M${a} A${r},${r} 0 0,1 ${b} Q${C},${C} ${c} A${r},${r} 0 0,1 ${d} Q${C},${C} ${a} Z`;
  };
  const mid = (e) => { const p = slots.place[edgeKey(e)]; return [(p.o[0] + p.o[1]) / 2, (p.i[0] + p.i[1]) / 2]; };

  // dots along each ribbon's centre, one per room the edge fired in
  const canvasRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1); const k0 = size / W;
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    const g = cv.getContext("2d"); g.setTransform(dpr * k0, 0, 0, dpr * k0, 0, 0);
    const dot = Math.max(2.6, 2.2 / k0);
    const paint = (t) => {
      g.clearRect(0, 0, W, W);
      edges.forEach((e, k) => {
        const [ao, ai] = mid(e); const [x1, y1] = pt(ao, R - 8), [x2, y2] = pt(ai, R - 8);
        g.fillStyle = tintOf(e);
        for (let j = 0; j < e.count; j++) {
          const u = (t * 0.28 + j / e.count + k * 0.17) % 1;
          const x = (1 - u) ** 2 * x1 + 2 * (1 - u) * u * C + u * u * x2, y = (1 - u) ** 2 * y1 + 2 * (1 - u) * u * C + u * u * y2;
          g.globalAlpha = Math.sin(u * Math.PI) * (hk && hk !== edgeKey(e) ? 0.15 : 0.95);
          g.beginPath(); g.arc(x, y, dot, 0, 7); g.fill();
        }
      });
      g.globalAlpha = 1;
    };
    const t0 = performance.now();
    paint(0.9);                                        // the still frame
    if (still || reducedMotion()) return;
    let raf = 0, last = 0, ema = 16, n = 0;
    const loop = (now) => {
      paint((now - t0) / 1000 + 0.9);
      const dt = last ? now - last : 0; last = now;
      if (dt && dt < 250) { ema = ema * 0.94 + dt * 0.06; n++; }     // gaps (hidden tab) aren't slowness
      if (n > 20 && ema > 30) return;                  // slow device: settle on this frame
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [edges, slots, hk, size, still]);

  const k0 = size / W;
  const pick = (e) => setHover(hk === edgeKey(e) ? null : e);
  return (
    <div className="chord" style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${W} ${W}`} role="img" aria-label="whole-home ripple chord" style={{ overflow: "visible", display: "block" }}>
        {SENSES.map((s, k) => {
          const a = ang(k); const sp = slots.span[s][1] - slots.span[s][0] > 0.05 ? slots.span[s] : [a - 0.05, a + 0.05];
          const [x1, y1] = pt(sp[0], R + 6), [x2, y2] = pt(sp[1], R + 6);
          return <path key={s} d={`M${x1},${y1} A${R + 6},${R + 6} 0 0,1 ${x2},${y2}`} stroke={SC[s]} strokeWidth={8} fill="none" strokeLinecap="round" />;
        })}
        {edges.map((e) => {
          const dim = hk && hk !== edgeKey(e);
          return <path key={edgeKey(e)} d={ribbon(e)} fill={SC[e.from]} fillOpacity={dim ? 0.04 : 0.2} stroke={tintOf(e)} strokeOpacity={dim ? 0.1 : 0.7}
            strokeWidth={1 / Math.min(1, k0 * 2)} onMouseEnter={() => setHover(e)} onMouseLeave={() => setHover(null)} onClick={() => pick(e)} style={{ cursor: "pointer" }} />;
        })}
      </svg>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: size, height: size, pointerEvents: "none" }} />
      {SENSES.map((s, k) => {
        const [lx, ly] = pt(ang(k), R + (minimal ? 40 : 52));
        const w = thr ? rooms.filter((r) => (r.comfortScores?.[s] ?? 1) < thr(s)).length / Math.max(1, rooms.length) : 0.5;
        const d = Math.max(minimal ? 16 : 22, Math.round((minimal ? 62 : 48) * k0 * (0.75 + 0.5 * w)));
        return (
          <div key={s} style={{ position: "absolute", left: lx * k0 - d / 2, top: ly * k0 - d / 2 }}>
            <Nebula2D sense={s} size={d} still={still} title={s} onClick={onSense ? (ev) => { ev.stopPropagation(); onSense(s); } : undefined} />
          </div>
        );
      })}
    </div>
  );
}
