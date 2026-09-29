import { useMemo, useState } from "react";
import { SC, SI, STATUS } from "../lib/senses.js";
import { thresholdFromWeight } from "../lib/senseModel.js";
import { homeEvents } from "../lib/rippleEvents.js";
import { useSelection } from "../lib/selection.jsx";
import Chord, { edgeKey } from "../marks/Chord.jsx";

// The ripple key on the plan: a mini chord of the nudges the model computed across the
// home (glyph ends only). Tap a sense end = focus that sense across the instrument;
// tap the chord = the full chord + the list of computed nudges.
export default function SenseKey({ rooms, persona }) {
  const { activeSense, setActiveSense } = useSelection();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(null);
  const weights = persona?.comfort_weights || {};
  const thr = (s) => thresholdFromWeight(weights[s] ?? 0.5);
  const edges = useMemo(() => homeEvents(rooms).sort((a, b) => b.count - a.count), [rooms]);
  if (!rooms?.length) return null;
  const focus = (s) => setActiveSense(activeSense === s ? null : s);

  return (
    <div className="sense-key">
      <div className="sense-key-head">
        <span className="sense-key-title">ripple</span>
        {activeSense && <button className="sense-key-clear" onClick={() => setActiveSense(null)} title="show all senses">all</button>}
      </div>
      <div className="sense-key-body" onClick={() => setOpen(true)} role="button" title="open the ripple" style={{ cursor: "pointer" }}>
        <Chord rooms={rooms} size={170} thr={thr} minimal onSense={focus} hover={null} setHover={() => {}} />
      </div>

      {open && (
        <div className="ripple-panel cg-panel" onClick={(e) => e.stopPropagation()}>
          <button className="cg-close" onClick={() => setOpen(false)} aria-label="close">✕</button>
          <div className="ripple-panel-body">
            <Chord rooms={rooms} size={340} thr={thr} onSense={focus} hover={hover} setHover={setHover} />
            <ul className="ripple-events">
              {edges.map((e) => (
                <li key={edgeKey(e)} className={hover && edgeKey(hover) === edgeKey(e) ? "on" : ""} title={e.rooms.join(" · ")}
                  onMouseEnter={() => setHover(e)} onMouseLeave={() => setHover(null)}>
                  <span style={{ color: SC[e.from] }}>{SI[e.from]} {e.from}</span>
                  <span style={{ color: e.meanDelta < 0 ? STATUS.fail : STATUS.pass }}> {e.meanDelta < 0 ? "drags" : "lifts"} </span>
                  <span style={{ color: SC[e.to] }}>{SI[e.to]} {e.to}</span>
                  <span className="ripple-count"> · {e.count}</span>
                </li>
              ))}
              {!edges.length && <li className="ripple-none">none computed</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
