// Every room × every sense in one grid. Rows = rooms, worst first, each with its room
// mark (sized by how many of its senses sit below you). Column heads = sense glyphs
// (sized by rooms below you). Cells = glyphs: brightness = the felt score, a red
// notch = below you, dots falling red / rising green = a ripple lowered / raised it.
// Hover = the one-line arithmetic;
// click a room = its six cells become the ledger (each score shown once).
import { useState } from "react";
import { SENSES, SC, SI, STATUS, scoreColor, scoreOpacity } from "../lib/senses.js";
import { reducedMotion } from "../lib/rippleEvents.js";
import { SenseMark } from "./marks2d.js";
import RoomMark from "./RoomMark.jsx";
import Ledger from "./Ledger.jsx";

const FG = (a) => `rgba(var(--fg-rgb),${a})`;

const TINT_KEY = "sensi.grid.tint";
const readTint = () => { try { return localStorage.getItem(TINT_KEY) === "grey" ? "grey" : "sense"; } catch { return "sense"; } };

export default function ScoresGrid({ rooms, thr, roomTypeOf = () => undefined, markSrc = null, cell = 46, compact = false }) {
  const [hov, setHov] = useState(null), [open, setOpen] = useState(null), [col, setCol] = useState(null);
  const [tint, setTintState] = useState(readTint);
  const setTint = (t) => { setTintState(t); try { localStorage.setItem(TINT_KEY, t); } catch { /* per-viewer only */ } };
  if (!rooms?.length) return null;
  const still = reducedMotion();
  const sorted = [...rooms].sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0));
  const below = (s) => rooms.filter((r) => (r.comfortScores?.[s] ?? 1) < thr(s)).length;
  const failing = (r) => SENSES.filter((s) => (r.comfortScores?.[s] ?? 1) < thr(s)).length;
  const gap = compact ? 3 : 6, mark = compact ? 34 : 46;
  const cols = compact ? `minmax(0,1fr) repeat(6, ${cell}px) 34px` : `minmax(120px,190px) repeat(6, ${cell}px) 44px`;

  const hovInfo = hov && (() => {
    const { r, s } = hov; const adj = (r.adjustments || []).filter((a) => a.sense === s); const v = r.comfortScores?.[s] ?? 0;
    return <>
      <b style={{ color: SC[s] }}>{SI[s]}</b> {(r.baseScores?.[s] ?? v).toFixed(2)}
      {adj.map((a, i) => (
        <span key={i} style={{ color: a.delta < 0 ? STATUS.fail : STATUS.pass }}> {a.delta > 0 ? "+" : "−"}{Math.abs(a.delta).toFixed(2)}
          <span style={{ color: SENSES.includes(a.from) ? SC[a.from] : FG(0.6) }}>{SENSES.includes(a.from) ? SI[a.from] : ` ${a.from}`}</span></span>
      ))}
      {" = "}<b style={{ color: v < thr(s) ? STATUS.fail : FG(0.92) }}>{v.toFixed(2)}</b>
      <span style={{ color: FG(0.45) }}> · you ≥ {thr(s).toFixed(2)}</span>
    </>;
  })();

  return (
    <div className={"sgrid" + (compact ? " sgrid--compact" : "")}>
      <div className="sgrid-table" style={{ gridTemplateColumns: cols, gap }} role="table" aria-label="rooms by senses">
        <div className="sgrid-tint" role="group" aria-label="cell colour">
          <button className={tint === "sense" ? "on" : ""} title="sense colour" aria-label="sense colour" onClick={() => setTint("sense")}><span className="sw sw-sense" /></button>
          <button className={tint === "grey" ? "on" : ""} title="grey heat" aria-label="grey heat" onClick={() => setTint("grey")}><span className="sw sw-grey" /></button>
        </div>
        {SENSES.map((s) => {
          const k = below(s) / Math.max(1, rooms.length);
          return (
            <div key={s} role="columnheader" title={`${s} · ${below(s)} below you`} onMouseEnter={() => setCol(s)} onMouseLeave={() => setCol(null)}
              style={{ justifySelf: "center", opacity: col && col !== s ? 0.35 : 1 }}>
              <SenseMark sense={s} size={Math.round(cell * (0.72 + 0.4 * k))} />
            </div>
          );
        })}
        <div />
        {sorted.map((r) => {
          const isOpen = open === r.roomName; const f = failing(r); const toggle = () => setOpen(isOpen ? null : r.roomName);
          return [
            <div key={r.roomName + "h"} role="rowheader" className={"sgrid-row" + (isOpen ? " open" : "")} onClick={toggle}>
              <span className="sgrid-mark" style={{ width: mark }}>
                {markSrc ? <img src={markSrc(r)} alt="" width={Math.round(mark * (0.78 + 0.22 * f / 6))} height={Math.round(mark * (0.78 + 0.22 * f / 6))} />
                  : <RoomMark room={r} roomType={roomTypeOf(r)} size={Math.round(mark * (0.78 + 0.22 * f / 6))} />}
              </span>
              <span className="sgrid-name">{r.roomName}</span>
            </div>,
            ...(isOpen
              ? [<div key={r.roomName + "L"} style={{ gridColumn: "2 / span 6", padding: "6px 0 10px" }}><Ledger room={r} thr={thr} compact /></div>]
              : SENSES.map((s) => {
                const v = r.comfortScores?.[s] ?? 0, low = v < thr(s);
                const inc = (r.adjustments || []).filter((a) => a.sense === s && SENSES.includes(a.from));
                const dim = (col && col !== s) || (hov && hov.r !== r && hov.s !== s);
                return (
                  <div key={r.roomName + s} role="cell" tabIndex={0} className="sgrid-cell" aria-label={`${r.roomName} ${s} ${v.toFixed(2)}${low ? " below you" : ""}`}
                    onMouseEnter={() => setHov({ r, s })} onMouseLeave={() => setHov(null)} onFocus={() => setHov({ r, s })} onBlur={() => setHov(null)} onClick={toggle}
                    style={{ width: cell, height: cell, opacity: dim ? 0.3 : 1 }}>
                    <div className="sgrid-num" style={{
                      background: tint === "sense" ? `color-mix(in srgb, ${SC[s]} ${Math.round(scoreOpacity(v) * 70)}%, transparent)` : `rgba(var(--fg-rgb),${(scoreOpacity(v) * 0.32).toFixed(3)})`,
                      color: low ? STATUS.fail : "rgba(var(--fg-rgb),0.92)", fontSize: compact ? 10 : 12 }}>{v.toFixed(2)}</div>
                    {inc.map((a, i) => (
                      <span key={i} className={"sgrid-dot " + (a.delta < 0 ? "dn" : "up") + (still ? " still" : "")}
                        style={{ left: `${50 + (i - (inc.length - 1) / 2) * 24}%`, background: a.delta < 0 ? STATUS.fail : STATUS.pass, animationDelay: `${i * 0.3}s` }} />
                    ))}
                  </div>
                );
              })),
            <div key={r.roomName + "o"} className="sgrid-overall" style={{ color: scoreColor(r.overallScore ?? 0), alignSelf: isOpen ? "start" : undefined, paddingTop: isOpen ? 12 : 0 }}>
              {(r.overallScore ?? 0).toFixed(2)}
            </div>,
          ];
        })}
      </div>
      <div className="sgrid-info" aria-live="polite">{hovInfo}</div>
    </div>
  );
}
