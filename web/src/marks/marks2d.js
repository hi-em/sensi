// The shared marks on 2D surfaces (chord, ledger, grid, entry, phone), drawn with the
// same maths and seeds as the 3D sense shader so a sense looks the same everywhere.
// Nebula = 2D canvas: no WebGL, works without a GPU, one still frame under reduced
// motion. One animation loop serves every nebula on the page, and it freezes all of
// them on their current frame when frames run slow (EMA > 30 ms after ~20 frames).
import { useEffect, useRef, createElement as h } from "react";
import { SC, STATUS } from "../lib/senses.js";
import { reducedMotion } from "../lib/rippleEvents.js";

// sRGB hex brightened in linear light (same result as THREE.Color(hex).multiplyScalar(k)),
// so this module stays free of three.js.
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const brightCache = new Map();
export function brighten(hex, k) {
  const key = hex + k; if (brightCache.has(key)) return brightCache.get(key);
  const n = parseInt(hex.slice(1), 16);
  const out = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(1, toSrgb(Math.min(1, toLin(v / 255) * k))) * 255));
  const res = { rgb: out.join(","), hex: "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("") };
  brightCache.set(key, res); return res;
}

// ── seeded particles (same distribution as the 3D sense nebula) ──
const hash = (s) => { let x = 2166136261; for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619); return x >>> 0; };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const cache = new Map();
export function particles(key, n = 220) {
  const k = key + n; if (cache.has(k)) return cache.get(k);
  const R = rng(hash(key)); const out = [];
  for (let i = 0; i < n; i++) {
    const th = 2 * Math.PI * R(), ph = Math.acos(2 * R() - 1), r = Math.cbrt(R()) * 1.05;
    out.push({ x: r * Math.sin(ph) * Math.cos(th), y: r * Math.cos(ph) * 0.8, z: r * Math.sin(ph) * Math.sin(th), s: R() });
  }
  out.sort((a, b) => a.s - b.s);   // fullness drops the high-seed points first, same as the shader
  cache.set(k, out); return out;
}
const sprites = new Map();
function sprite(hex) {
  if (sprites.has(hex)) return sprites.get(hex);
  const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d");
  const { rgb } = brighten(hex, 1.3);
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  sprites.set(hex, c); return c;
}

// level 0..1 = how good (fullness + brightness). below = under this person's threshold,
// marked by a short red notch under the glyph. variant "full" = a sense standing for
// itself (chord ends, column heads); "light" = one score in a dense view (glyph first).
export function drawNebula(g, { cx, cy, r, sense, level = 1, t = 0, below = false, face = true, faceAlpha = 0.9, n = 200, variant = "full" }) {
  if (variant === "light") { n = 90; r *= 0.85; }
  const parts = particles(sense, n); const keep = Math.max(8, Math.floor(parts.length * (0.3 + 0.7 * level))); const bright = 0.3 + 0.7 * level;
  const spr = sprite(SC[sense]); const ps = Math.max(0.7, r / 16); const small = r < 24;
  g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = brighten(SC[sense], 1.3).hex;
  for (let i = 0; i < keep; i++) {
    const p = parts[i]; const a = t * (0.15 + p.s * 0.35), cs = Math.cos(a), sn = Math.sin(a);
    const x = p.x * cs - p.z * sn, z = p.x * sn + p.z * cs, y = p.y + Math.sin(t * 0.8 + p.s * 6.28) * 0.05;
    const sx = cx + x * r, sy = cy - (y * 0.94 - z * 0.34) * r; const sz = (0.45 + p.s * 0.85) * ps;
    g.globalAlpha = Math.min(1, (0.25 + 0.75 * p.s) * 0.85 * bright);
    if (small) g.fillRect(sx - sz * 0.6, sy - sz * 0.6, sz * 1.2, sz * 1.2); else g.drawImage(spr, sx - sz, sy - sz, sz * 2, sz * 2);
  }
  g.restore();
  if (face) drawGlyph(g, sense, cx, cy, r * 0.7, faceAlpha * (0.5 + 0.5 * level));
  if (below) {
    g.save(); g.strokeStyle = STATUS.fail; g.lineWidth = Math.max(1.5, r * 0.07); g.lineCap = "round"; g.globalAlpha = 0.9;
    g.beginPath(); g.arc(cx, cy, r * 1.05, Math.PI * 0.3, Math.PI * 0.7); g.stroke(); g.restore();
  }
}

// the sense glyph (△ ○ ∿ □ ≈ ∶) drawn flat with the 3D glyph's proportions
export function drawGlyph(g, sense, cx, cy, u, alpha = 1) {
  g.save(); g.globalAlpha = alpha; const col = brighten(SC[sense], 1.5).hex;
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.2, u * 0.18); g.lineJoin = g.lineCap = "round"; g.beginPath();
  const poly = (n, R, rot) => { for (let i = 0; i <= n; i++) { const a = rot + (i / n) * Math.PI * 2; const x = cx + Math.cos(a) * R * u, y = cy - Math.sin(a) * R * u; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  const sine = (w, amp, off = 0) => { for (let i = 0; i <= 40; i++) { const x = -w / 2 + (i / 40) * w; const y = off + amp * Math.sin((x / w) * Math.PI * 2); i ? g.lineTo(cx + x * u, cy - y * u) : g.moveTo(cx + x * u, cy - y * u); } g.stroke(); };
  if (sense === "thermal") poly(3, 0.62, Math.PI / 2);
  else if (sense === "visual") { g.arc(cx, cy, 0.55 * u, 0, 7); g.stroke(); }
  else if (sense === "acoustic") sine(1.5, 0.28);
  else if (sense === "spatial") poly(4, 0.68, Math.PI / 4);
  else if (sense === "olfactory") { sine(1.4, 0.16, 0.24); g.beginPath(); sine(1.4, 0.16, -0.24); }
  else if (sense === "tactile") { [0.32, -0.32].forEach((y) => { g.beginPath(); g.arc(cx, cy - y * u, 0.17 * u, 0, 7); g.fill(); }); }
  g.restore();
}

// ── one shared loop + the adaptive freeze ──
const live = new Set(); let raf = 0; const T0 = performance.now();
let last = 0, ema = 16, frames = 0;
export const perf = { degraded: false };
export function frameTick(now) {            // shared by other canvases that want the same rule
  if (last) { ema = ema * 0.94 + (now - last) * 0.06; frames++; } last = now;
  if (frames > 20 && ema > 30 && !perf.degraded) { perf.degraded = true; document.body.classList.add("is-still"); }
  return perf.degraded;
}
const loop = (now) => {
  if (frameTick(now)) { live.clear(); raf = 0; return; }
  const t = (now - T0) / 1000; live.forEach((f) => f(t));
  raf = live.size ? requestAnimationFrame(loop) : 0;
};
export const clock = () => (performance.now() - T0) / 1000;

export function Nebula2D({ sense, size = 40, level = 1, below = false, face = true, style, title, n, still = false, variant = "full", onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = Math.round(size * dpr); const g = cv.getContext("2d");
    const draw = (t) => { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size); drawNebula(g, { cx: size / 2, cy: size / 2, r: size * 0.4, sense, level, t, below, face, n, variant }); };
    draw(clock());
    if (still || perf.degraded || reducedMotion()) return;
    live.add(draw); if (!raf) raf = requestAnimationFrame(loop);
    return () => live.delete(draw);
  }, [sense, size, level, below, face, n, still, variant]);
  return h("canvas", { ref, title, onClick, style: { width: size, height: size, display: "block", cursor: onClick ? "pointer" : undefined, ...style }, "aria-hidden": !title });
}
