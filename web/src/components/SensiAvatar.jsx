// The Sensi mark (Wren's ripple chord), reused as the brand avatar everywhere; the same
// drawing is the favicon and the app icon. Hues come from the sense registry
// (lib/senses.js), geometry from ./sensiMark.js. `animate` lets the six sense arcs
// breathe one after another (the "thinking" pulse); `animate={false}` is the still mark.
import { SENSES, SC, STATUS } from "../lib/senses.js";
import { MARK_ARCS, MARK_RIBBONS } from "./sensiMark.js";

export default function SensiAvatar({ size = 28, className = "sensi-avatar", animate = true }) {
  return (
    <svg className={`sensi-mark ${className}`.trim()} width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden="true">
      {MARK_RIBBONS.map((r) => (
        <path key={r.d} d={r.d} fill={SC[r.from]} fillOpacity={0.6} stroke={r.lowers ? STATUS.fail : STATUS.pass} strokeWidth={9} />
      ))}
      {SENSES.map((s, i) => (
        <path key={s} d={MARK_ARCS[s]} stroke={SC[s]} strokeWidth={44} strokeLinecap="round"
          style={animate ? { animation: "smark 3s ease-in-out infinite", animationDelay: `${i * 0.5}s` } : undefined} />
      ))}
    </svg>
  );
}
