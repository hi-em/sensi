// The public demo persona's home, scored by the model at build time
// (python/export_demo_home.py → public/demo-home.json). No session, no API call.
import { useEffect, useState } from "react";
import { thresholdFromWeight } from "../lib/senseModel.js";

let cache = null;
export function useDemoHome() {
  const [home, setHome] = useState(cache);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    fetch("/demo-home.json").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d || !alive) return;
      cache = { rooms: d.rooms, thr: (s) => thresholdFromWeight(d.comfort_weights?.[s] ?? 0.5) };
      setHome(cache);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return home;
}

// pre-rendered room marks (same blob + icon, rendered once at build time), so the
// phone and entry pages need no WebGL
export const demoMarkSrc = (r) => `/demo-rooms/${encodeURIComponent(r.roomId)}.png`;
