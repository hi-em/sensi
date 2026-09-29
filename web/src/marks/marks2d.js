// The shared sense mark on 2D surfaces (chord ends, grid, ledger heads, entry, phone):
// the sense glyph alone, in its hue, drawn flat on a canvas with the 3D glyph's
// proportions. Brightness = how good (level 0..1); a short red notch under it = below
// this person's threshold. Static: no animation, no WebGL. (The 3D galaxy draws the
// sense as a nebula; its seeded particles live here so both share one seed.)
import { useEffect, useRef, createElement as h } from "react";
import { SC, STATUS } from "../lib/senses.js";

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

export function drawSenseMark(g, { cx, cy, r, sense, level = 1, below = false }) {
  drawGlyph(g, sense, cx, cy, r * 0.8, 0.3 + 0.7 * level);
  if (below) {
    g.save(); g.strokeStyle = STATUS.fail; g.lineWidth = Math.max(1.5, r * 0.07); g.lineCap = "round"; g.globalAlpha = 0.9;
    g.beginPath(); g.arc(cx, cy, r * 1.05, Math.PI * 0.3, Math.PI * 0.7); g.stroke(); g.restore();
  }
}

export function SenseMark({ sense, size = 40, level = 1, below = false, style, title, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = cv.height = Math.round(size * dpr); const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
    drawSenseMark(g, { cx: size / 2, cy: size / 2, r: size * 0.4, sense, level, below });
  }, [sense, size, level, below]);
  return h("canvas", { ref, title, onClick, style: { width: size, height: size, display: "block", cursor: onClick ? "pointer" : undefined, ...style }, "aria-hidden": !title });
}
