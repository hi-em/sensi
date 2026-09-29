import { useState } from "react";
import { SC, SI, STATUS } from "../lib/senses.js";
import Chord from "../marks/Chord.jsx";
import ScoresGrid from "../marks/ScoresGrid.jsx";
import { useDemoHome, demoMarkSrc } from "../marks/useDemoHome.js";
import "../styles/mobile-gate.css";

// Phone front door. The app is never mounted on this path (no shape space to stumble
// into, no /api/init spent). Instead the visitor gets a read-only look at the demo
// persona's real home, scored by the model at build time: the whole-home ripple chord
// (tap a ribbon), then every room × sense as a grid (tap a room for its ledger).
// 2D only: SVG + canvas, room marks pre-rendered as images, no WebGL.
export default function MobileGate() {
  const home = useDemoHome();
  const [hover, setHover] = useState(null);
  const w = Math.min(420, window.innerWidth - 32);

  return (
    <div className="mg-root">
      <div className="mg-scroll mg-home">
        <p className="mg-wordmark">sensi</p>
        <p className="mg-title">Wren's home</p>
        {home ? (
          <>
            <div className="mg-chord"><Chord rooms={home.rooms} size={w - 40} minimal thr={home.thr} hover={hover} setHover={setHover} /></div>
            <p className="mg-read">
              {hover
                ? <><span style={{ color: SC[hover.from] }}>{SI[hover.from]}</span>{" "}
                    <span style={{ color: hover.meanDelta < 0 ? STATUS.fail : STATUS.pass }}>{hover.meanDelta < 0 ? "drags" : "lifts"}</span>{" "}
                    <span style={{ color: SC[hover.to] }}>{SI[hover.to]}</span> · {hover.count} {hover.count === 1 ? "room" : "rooms"}</>
                : <span className="mg-mut">tap a ribbon</span>}
            </p>
            <div className="mg-rule" />
            <div className="mg-grid"><ScoresGrid rooms={home.rooms} thr={home.thr} markSrc={demoMarkSrc} cell={34} compact /></div>
          </>
        ) : <div style={{ height: w }} />}
      </div>

      <div className="mg-band">
        <div className="mg-band-inner">
          <p className="mg-band-line">tap a room · shape your own plan on a desktop</p>
          <a className="mg-cta" href="https://emiliechidiac.com/work/sensi">read the project ↗</a>
        </div>
      </div>
    </div>
  );
}
