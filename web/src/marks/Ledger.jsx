// The score ledger for one room: per sense, the base score from the plan → each nudge
// the model applied (another sense's ripple in its hue, or the person layer in grey;
// red stroke lowers, green raises) → the felt score. The felt number is red only when it
// sits below this person's threshold. Static, so it is also the reduced-motion view.
// Width follows the container; under ~500 px it switches to the compact form.
import { useLayoutEffect, useRef, useState } from "react";
import { SENSES, SC, SI, STATUS } from "../lib/senses.js";

const FG = (a) => `rgba(var(--fg-rgb),${a})`;
const mono = "var(--font-mono)";

export default function Ledger({ room, thr, compact: forced }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(320);
  useLayoutEffect(() => {
    const el = boxRef.current; if (!el) return;
    const update = () => setWidth(Math.max(220, el.clientWidth || 320));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [hover, setHover] = useState(null);
  if (!room) return null;

  const compact = forced ?? width < 500;
  const X0 = compact ? 26 : 110, TXT = compact ? 78 : 104;
  const WBAR = Math.max(80, width - X0 - TXT), x = (v) => X0 + v * WBAR, fs = compact ? 11 : 12;
  const rows = SENSES.map((s) => ({
    s, base: room.baseScores?.[s] ?? room.comfortScores?.[s] ?? 0, felt: room.comfortScores?.[s] ?? 0,
    adj: (room.adjustments || []).filter((a) => a.sense === s),
  }));
  const rowH = (r) => (compact ? 30 : 36) + r.adj.length * 14;
  const tops = []; let acc = 18; rows.forEach((r) => { tops.push(acc); acc += rowH(r); });

  return (
    <div ref={boxRef} className="ledger" style={{ width: "100%" }}>
      <svg width={width} height={acc + 4} role="img" aria-label={`score ledger for ${room.roomName}`} style={{ display: "block", overflow: "visible" }}>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={14} y2={acc} style={{ stroke: FG(0.07) }} />
            <text x={x(v)} y={10} textAnchor="middle" fontSize={9} style={{ fill: FG(0.45), fontFamily: mono }}>{v}</text>
          </g>
        ))}
        {rows.map((r, k) => {
          const y = tops[k]; let cur = r.base;
          const below = thr ? r.felt < thr(r.s) : false;
          return (
            <g key={r.s}>
              <text x={0} y={y + 15} fontSize={compact ? 15 : 12} style={{ fill: SC[r.s], fontFamily: mono }}>{SI[r.s]}{compact ? "" : ` ${r.s}`}</text>
              <rect x={x(0)} y={y + 4} width={WBAR} height={13} rx={3} style={{ fill: FG(0.04) }} />
              <rect x={x(0)} y={y + 4} width={Math.max(0, r.base * WBAR)} height={13} rx={3} fill={SC[r.s]} fillOpacity={0.28} />
              <line x1={x(r.base)} x2={x(r.base)} y1={y + 1} y2={y + 20} stroke={SC[r.s]} strokeWidth={2} />
              {r.adj.map((a, j) => {
                const from = cur, to = Math.max(0, Math.min(1, cur + a.delta)); cur = to;
                const isSense = SENSES.includes(a.from); const tint = a.delta < 0 ? STATUS.fail : STATUS.pass;
                const col = isSense ? SC[a.from] : FG(0.6); const yy = y + 28 + j * 14; const on = hover === `${k}.${j}`;
                const right = Math.max(x(from), x(to)), flip = right > width - TXT - 40;
                return (
                  <g key={j} onMouseEnter={() => setHover(`${k}.${j}`)} onMouseLeave={() => setHover(null)} onClick={() => setHover(on ? null : `${k}.${j}`)}>
                    <title>{a.mechanism}</title>
                    <line x1={x(from)} x2={x(to)} y1={yy} y2={yy} stroke={tint} strokeWidth={on ? 5 : 4} strokeLinecap="round" />
                    <circle cx={x(from)} cy={yy} r={3} style={{ fill: col }} />
                    <text x={flip ? Math.min(x(from), x(to)) - 8 : right + 8} textAnchor={flip ? "end" : "start"} y={yy + 3.5} fontSize={10}
                      style={{ fill: col, fontFamily: mono }}>
                      {isSense ? (compact ? SI[a.from] : `${SI[a.from]} ${a.from}`) : a.from} {a.delta > 0 ? "+" : "−"}{Math.abs(a.delta).toFixed(2)}
                    </text>
                  </g>
                );
              })}
              <text x={x(1) + (compact ? 8 : 14)} y={y + 15} fontSize={fs} style={{ fill: FG(0.92), fontFamily: mono }}>
                {r.adj.length ? <>{r.base.toFixed(2)} <tspan style={{ fill: FG(0.45) }}>→</tspan> </> : null}
                <tspan style={{ fill: below ? STATUS.fail : FG(0.92) }}>{r.felt.toFixed(2)}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
