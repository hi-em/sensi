// The shared marks in 3D (galaxy, room thumbnails): sense nebula, lever lantern, room
// blob + type icon, and the burst that opens a room into its six scores. Built from
// primitives (no font or model files). Same visual rules as the 2D marks:
//   sense  = nebula in its hue + glyph face; size is the caller's (rooms below you),
//            density constant; level 0..1 (how good) = fullness + brightness.
//   below  = a short red notch under the glyph (below this person's threshold).
//   room   = translucent blob bulging toward each sense by its felt score + type icon.
//   lever  = glass cube + grey lever icon.
import * as THREE from "three";
import { SENSES, SC, STATUS } from "../lib/senses.js";
import { particles } from "./marks2d.js";
import { levelOf } from "./levels.js";
export const SENSE_DIR = SENSES.map((s, i) => { const a = (i * 60 - 90) * Math.PI / 180; return new THREE.Vector3(Math.cos(a), i % 2 ? 0.5 : -0.5, Math.sin(a)).normalize(); });

// ── sense glyphs △ ○ ∿ □ ≈ ∶ in the XY plane, unit ~1 ──
const tubeAlong = (pts, r, mat) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(24, pts.length * 3), r, 8, false), mat);
const sine = (w, amp, y = 0, n = 40) => { const p = []; for (let i = 0; i <= n; i++) { const t = i / n; p.push(new THREE.Vector3((t - 0.5) * w, y + Math.sin(t * Math.PI * 2) * amp, 0)); } return p; };
export function senseGlyph(s, mat) {
  const g = new THREE.Group(); const r = 0.09;
  if (s === "thermal") { const t = new THREE.Mesh(new THREE.TorusGeometry(0.62, r, 8, 3), mat); t.rotation.z = Math.PI / 2; g.add(t); }
  else if (s === "visual") g.add(new THREE.Mesh(new THREE.TorusGeometry(0.55, r, 10, 48), mat));
  else if (s === "acoustic") g.add(tubeAlong(sine(1.5, 0.28), r, mat));
  else if (s === "spatial") { const t = new THREE.Mesh(new THREE.TorusGeometry(0.68, r, 8, 4), mat); t.rotation.z = Math.PI / 4; g.add(t); }
  else if (s === "olfactory") { g.add(tubeAlong(sine(1.4, 0.16, 0.24), r, mat)); g.add(tubeAlong(sine(1.4, 0.16, -0.24), r, mat)); }
  else if (s === "tactile") { [0.32, -0.32].forEach((y) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16), mat); d.position.y = y; g.add(d); }); }
  return g;
}

// ── sense nebula: seeded GPU points (same seeds as the 2D nebula) around the glyph ──
export function senseNebula(s, radius, { level = 1, below = false, variant = "full" } = {}) {
  const g = new THREE.Group(); const N = variant === "light" ? 280 : 900;
  const parts = particles(s, N); const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  parts.forEach((p, i) => { pos.set([p.x * radius, p.y * radius, p.z * radius], i * 3); seed[i] = p.s; });
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, c: { value: new THREE.Color(SC[s]) }, px: { value: Math.min(2, window.devicePixelRatio || 1) }, lvl: { value: level } },
    vertexShader: `uniform float t; uniform float px; uniform float lvl; attribute float seed; varying float vA;
      void main(){ vec3 p = position; float a = t * (0.15 + seed * 0.35); float cs = cos(a), sn = sin(a); p.xz = mat2(cs, -sn, sn, cs) * p.xz; p.y += sin(t * 0.8 + seed * 6.28) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = seed > 0.3 + 0.7 * lvl ? 0. : (1.2 + seed * 2.2) * px * (60. / -mv.z); vA = (0.25 + 0.75 * seed) * (0.3 + 0.7 * lvl); }`,
    fragmentShader: `uniform vec3 c; varying float vA; void main(){ vec2 d = gl_PointCoord - .5; float f = smoothstep(.5, 0., length(d)); gl_FragColor = vec4(c * 1.3, f * vA * 0.55); }` });
  g.add(new THREE.Points(geo, mat)); g.userData.tick = (t) => { mat.uniforms.t.value = t; };
  const face = senseGlyph(s, new THREE.MeshBasicMaterial({ color: new THREE.Color(SC[s]).multiplyScalar(1.6 * (0.5 + 0.5 * level)) }));
  face.scale.setScalar(radius * 0.7); g.add(face); g.userData.face = face;
  if (below) face.add(new THREE.Mesh(new THREE.RingGeometry(1.42, 1.56, 32, 1, Math.PI * 1.3, Math.PI * 0.4),
    new THREE.MeshBasicMaterial({ color: STATUS.fail, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })));
  return g;
}

// ── lever icons + the lantern ──
export function leverIcon(lv) {
  const m = new THREE.MeshBasicMaterial({ color: 0x8e8e98 }); const w = new THREE.LineBasicMaterial({ color: 0x8e8e98 });
  const g = new THREE.Group(); const box = (x, y, z, sx, sy, sz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); g.add(b); };
  const edges = (geo) => g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), w));
  switch (String(lv).trim().replace(/\s+/g, "_")) {
    case "glazing_ratio": box(0, 0.5, 0, 1.2, 0.08, 0.08); box(0, -0.5, 0, 1.2, 0.08, 0.08); box(0.6, 0, 0, 0.08, 1.08, 0.08); box(-0.6, 0, 0, 0.08, 1.08, 0.08); box(0, 0, 0, 0.06, 1, 0.06); box(0, 0, 0, 1.2, 0.06, 0.06); break;
    case "glazing_type": [-0.25, 0, 0.25].forEach((z) => { const p = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), new THREE.MeshBasicMaterial({ color: 0xa4a4ae, transparent: true, opacity: 0.45 })); p.position.z = z; p.position.x = z * 0.6; g.add(p); }); break;
    case "orientation": g.add(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 40), m)); { const c = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 12), m); c.position.y = 0.2; g.add(c); } break;
    case "ventilation": for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8), m); b.scale.set(0.25, 1, 0.08); b.position.set(Math.sin(i * 2.094) * 0.35, Math.cos(i * 2.094) * 0.35, 0); b.rotation.z = -i * 2.094 + 0.5; g.add(b); } box(0, 0, 0, 0.18, 0.18, 0.18); break;
    case "room_volume": edges(new THREE.BoxGeometry(1, 1, 1)); break;
    case "surface_material": [-0.3, 0, 0.3].forEach((y, i) => box(i * 0.08, y, 0, 1.1, 0.14, 0.7)); break;
    case "noisy_adjacency": { const c = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 16, 1, true), m); c.rotation.z = -Math.PI / 2; c.position.x = -0.3; g.add(c); [0.35, 0.6].forEach((r) => { const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 24, Math.PI * 0.6), m); a.rotation.z = -Math.PI * 0.3; g.add(a); }); } break;
    case "wet_adjacency": { const s = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 20), m); s.position.y = -0.15; g.add(s); const c = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.6, 20), m); c.position.y = 0.35; g.add(c); } break;
    case "plants": [-0.4, 0.4].forEach((a) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), m); l.scale.set(0.45, 1, 0.12); l.rotation.z = a; l.position.set(-a * 0.5, 0.2, 0); g.add(l); }); box(0, -0.4, 0, 0.06, 0.6, 0.06); break;
    default: edges(new THREE.OctahedronGeometry(0.6));
  }
  return g;
}
export function leverLantern(lv, size = 3) {
  const g = new THREE.Group(); const box = new THREE.BoxGeometry(size * 1.6, size * 1.6, size * 1.6);
  g.add(new THREE.Mesh(box, new THREE.MeshPhysicalMaterial({ color: 0xbfc3cc, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false })));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0xd8dbe2, transparent: true, opacity: 0.7 })));
  const ic = leverIcon(lv); ic.scale.setScalar(size); ic.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.color?.set(0x9ea2ac); } }); g.add(ic); g.userData.face = ic;
  g.userData.tick = (t) => { g.children[0].rotation.y = g.children[1].rotation.y = t * 0.25; };
  return g;
}

// ── room: blob (bulges toward each sense by its felt score, hues blended) + type icon ──
export function roomBlob(room, radius = 5) {
  const geo = new THREE.IcosahedronGeometry(1, 5); const P = geo.attributes.position; const cols = new Float32Array(P.count * 3);
  const hue = SENSES.map((s) => new THREE.Color(SC[s])); const v = SENSES.map((s) => room.comfortScores?.[s] ?? 0);
  const d = new THREE.Vector3(); const c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    d.fromBufferAttribute(P, i).normalize(); let sw = 0, sr = 0; c.setRGB(0, 0, 0);
    SENSE_DIR.forEach((a, k) => { const w = Math.pow(Math.max(0, d.dot(a)), 4) + 1e-4; sw += w; sr += w * v[k]; c.r += hue[k].r * w; c.g += hue[k].g * w; c.b += hue[k].b * w; });
    const r = radius * (0.55 + 0.75 * (sr / sw)); P.setXYZ(i, d.x * r, d.y * r, d.z * r); cols.set([c.r / sw, c.g / sw, c.b / sw], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.05, emissive: 0xffffff, emissiveIntensity: 0.04, transparent: true, opacity: 0.28, depthWrite: false })));
  g.userData.tick = (t) => { g.rotation.y = t * 0.25; };
  return g;
}

const MAT = () => new THREE.MeshStandardMaterial({ color: 0xa9acb5, roughness: 0.6, metalness: 0.02 });
const DARK = () => new THREE.MeshStandardMaterial({ color: 0x4a4d55, roughness: 0.65 });
function rbox(w, h, d, r = 0.04, mat) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: r * 0.6, bevelThickness: r * 0.6, bevelSegments: 3 }); g.translate(0, 0, -d / 2); return new THREE.Mesh(g, mat);
}
const at = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
export function roomIcon(type) {
  const g = new THREE.Group(); const m = MAT(), d = DARK(); const add = (o) => (g.add(o), o);
  switch (type) {
    case "bedroom":
      add(at(rbox(1.3, 0.18, 0.9, 0.04, d), 0, -0.3, 0)); add(at(rbox(1.25, 0.16, 0.86, 0.06, m), 0, -0.14, 0)); add(at(rbox(0.8, 0.07, 0.88, 0.04, m), 0.2, -0.04, 0));
      [-0.2, 0.2].forEach((z) => add(at(rbox(0.26, 0.09, 0.34, 0.05, m), -0.45, -0.02, z))); add(at(rbox(0.07, 0.55, 0.92, 0.03, d), -0.66, -0.05, 0)); break;
    case "kitchen":
      add(at(rbox(1.2, 0.1, 0.8, 0.03, d), 0, -0.35, 0));
      [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]].forEach(([x, z]) => add(at(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 24), m), x, -0.29, z, Math.PI / 2)));
      add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.32, 32), m), 0.3, -0.12, 0.2));
      add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 32), m), 0.3, 0.05, 0.2));
      add(at(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), m), 0.3, 0.08, 0.2));
      [-1, 1].forEach((s) => add(at(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12, Math.PI), m), 0.3 + s * 0.3, -0.05, 0.2, 0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2)));
      for (let i = 0; i < 3; i++) add(at(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 1, 2, 3].map((k) => new THREE.Vector3(Math.sin(k + i) * 0.04, k * 0.09, 0))), 16, 0.012, 6), m), 0.22 + i * 0.08, 0.1, 0.2));
      break;
    case "living":
      add(at(rbox(1.3, 0.2, 0.6, 0.05, d), 0, -0.3, 0)); [-0.4, 0, 0.4].forEach((x) => add(at(rbox(0.38, 0.1, 0.52, 0.05, m), x, -0.15, 0.03)));
      add(at(rbox(1.3, 0.38, 0.14, 0.06, m), 0, -0.05, -0.25)); [-0.68, 0.68].forEach((x) => add(at(rbox(0.12, 0.3, 0.6, 0.05, m), x, -0.15, 0))); break;
    case "dining":
      add(at(rbox(1.0, 0.05, 0.6, 0.02, m), 0, 0, 0)); [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]].forEach(([x, z]) => add(at(rbox(0.04, 0.4, 0.04, 0.01, d), x, -0.22, z)));
      [[-0.25, -0.45, 0], [0.25, -0.45, 0], [-0.25, 0.45, Math.PI], [0.25, 0.45, Math.PI]].forEach(([x, z, ry]) => { const c = new THREE.Group(); c.add(at(rbox(0.28, 0.04, 0.26, 0.02, m), 0, -0.15, 0)); c.add(at(rbox(0.28, 0.3, 0.03, 0.02, m), 0, 0.02, -0.13)); c.position.set(x, 0, z); c.rotation.y = ry; add(c); }); break;
    case "bathroom": {
      add(at(rbox(1.3, 0.45, 0.62, 0.12, m), 0, -0.2, 0));
      add(at(rbox(1.1, 0.12, 0.46, 0.1, new THREE.MeshStandardMaterial({ color: 0x8fb6c9, roughness: 0.2, metalness: 0.1 })), 0, 0.03, 0));
      const tap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(0.12, 0.3, 0), new THREE.Vector3(0.2, 0.22, 0)]), 16, 0.025, 8), d); add(at(tap, -0.58, 0.05, 0)); break; }
    case "study": case "office":
      add(at(rbox(1.1, 0.05, 0.55, 0.02, m), 0, 0, 0)); [-0.5, 0.5].forEach((x) => add(at(rbox(0.05, 0.42, 0.5, 0.02, d), x, -0.23, 0)));
      add(at(rbox(0.55, 0.34, 0.03, 0.02, d), 0, 0.3, -0.15)); add(at(rbox(0.05, 0.12, 0.05, 0.01, d), 0, 0.08, -0.15));
      add(at(rbox(0.3, 0.04, 0.3, 0.02, m), 0, -0.18, 0.42)); add(at(rbox(0.3, 0.3, 0.04, 0.02, m), 0, 0.0, 0.56)); break;
    case "utility":
      add(at(rbox(0.8, 0.9, 0.7, 0.06, m), 0, 0, 0)); add(at(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 12, 32), d), 0, -0.05, 0.37));
      add(at(new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), new THREE.MeshStandardMaterial({ color: 0x6c8fa3, roughness: 0.15 })), 0, -0.05, 0.36));
      add(at(rbox(0.7, 0.1, 0.02, 0.01, d), 0, 0.36, 0.36)); break;
    case "balcony":
      add(at(rbox(1.3, 0.08, 0.6, 0.02, d), 0, -0.35, 0)); add(at(rbox(1.3, 0.04, 0.04, 0.01, m), 0, 0.15, 0.28));
      for (let i = 0; i < 9; i++) add(at(rbox(0.025, 0.46, 0.025, 0.005, m), -0.6 + i * 0.15, -0.08, 0.28));
      add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.2, 20), d), -0.35, -0.2, -0.1));
      [0, 1.2, 2.4, 3.6, 4.8].forEach((a) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshStandardMaterial({ color: 0x8bb88a, roughness: 0.6 })); l.scale.set(0.5, 1.2, 0.2); l.position.set(-0.35 + Math.cos(a) * 0.08, 0.02, -0.1 + Math.sin(a) * 0.08); l.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); add(l); }); break;
    case "circulation": default: {
      add(at(rbox(0.08, 1.1, 0.12, 0.02, d), -0.4, 0, 0)); add(at(rbox(0.08, 1.1, 0.12, 0.02, d), 0.4, 0, 0)); add(at(rbox(0.88, 0.08, 0.12, 0.02, d), 0, 0.55, 0));
      const leaf = new THREE.Group(); leaf.add(at(rbox(0.72, 1.0, 0.04, 0.02, m), 0.36, 0, 0)); leaf.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), d), 0.62, 0, 0.05));
      leaf.position.set(-0.36, -0.03, 0); leaf.rotation.y = -1.0; add(leaf);
      add(at(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.008, 4, 40, 1.0), d), -0.36, -0.53, 0, Math.PI / 2, 0, 0)); }
  }
  return g;
}
export function roomNode(room, roomType, radius) {
  const g = new THREE.Group(); const blob = roomBlob(room, radius);
  g.add(blob); g.userData.blob = blob;
  const ic = roomIcon(roomType); ic.scale.setScalar(radius * 0.85); g.add(ic); g.userData.face = ic;
  return g;
}

// ── burst: a room opens into its six scores (constant size; fullness + brightness =
// felt score; notch when below you) and gathers back on close ──
const easeOutBack = (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const easeInBack = (x, s = 1.4) => (s + 1) * x * x * x - s * x * x;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
export function burst(parent, room, radius, { dist = radius * 3.2, thr = null } = {}) {
  const kids = SENSES.map((s, i) => { const v = room.comfortScores?.[s] ?? 0;
    const k = senseNebula(s, radius * 0.45, { level: levelOf(v), below: !!thr && v < thr(s), variant: "light" }); k.visible = false; parent.add(k); return { k, dir: SENSE_DIR[i], s }; });
  const trails = kids.map(({ s }) => { const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: SC[s], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); parent.add(l); return l; });
  const NS = 48; const sp = new Float32Array(NS * 3); const sdir = [];
  for (let i = 0; i < NS; i++) { const a = (i / NS) * Math.PI * 2; sdir.push(new THREE.Vector3(Math.cos(a), Math.sin(i * 12.9898) * 0.25, Math.sin(a)).normalize()); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff4e6, size: radius * 0.09, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); parent.add(sparks);
  let dirn = 0, t0 = -1e9;
  const api = {
    kids: kids.map((x) => x.k),
    open(on) { dirn = on ? 1 : -1; t0 = performance.now() / 1000; },
    settle(on) { dirn = on ? 1 : -1; t0 = -1e9; },           // jump to the end state (reduced motion)
    tick(t) {
      const e = performance.now() / 1000 - t0; const blob = parent.userData.blob;
      if (dirn === 1) {
        const sq = clamp01(e / 0.15), pop = clamp01((e - 0.15) / 0.3);
        if (blob) { if (e < 0.15) blob.scale.set(1 + 0.14 * sq, 1 - 0.2 * sq, 1 + 0.14 * sq); else blob.scale.setScalar(Math.max(0.3, 1.12 - 0.82 * easeOutBack(pop, 1.2))); }
        const sk = clamp01((e - 0.15) / 0.5); sparks.material.opacity = sk > 0 && sk < 1 ? (1 - sk) * 0.9 : 0;
        sdir.forEach((d, i) => { const r = radius * (0.9 + sk * 2.2); sp[i * 3] = d.x * r; sp[i * 3 + 1] = d.y * r; sp[i * 3 + 2] = d.z * r; }); sg.attributes.position.needsUpdate = true;
        kids.forEach(({ k, dir }, i) => {
          const p = clamp01((e - 0.2 - i * 0.07) / 0.6); k.visible = p > 0; const ob = easeOutBack(p, 1.6);
          k.position.copy(dir).multiplyScalar(dist * ob); k.scale.setScalar(Math.max(0.01, ob)); k.userData.tick?.(t + i);
          const pa = trails[i].geometry.attributes.position; pa.setXYZ(1, k.position.x, k.position.y, k.position.z); pa.needsUpdate = true;
          trails[i].material.opacity = p <= 0 ? 0 : p < 1 ? 0.2 + 0.7 * Math.sin(p * Math.PI) : 0.14;
        });
      } else if (dirn === -1) {
        const n = kids.length;
        kids.forEach(({ k, dir }, i) => {
          const p = clamp01((e - (n - 1 - i) * 0.05) / 0.45); const back = 1 - easeInBack(p, 1.3);
          k.visible = p < 1; k.position.copy(dir).multiplyScalar(dist * back); k.scale.setScalar(Math.max(0.01, 0.3 + 0.7 * back)); k.userData.tick?.(t + i);
          const pa = trails[i].geometry.attributes.position; pa.setXYZ(1, k.position.x, k.position.y, k.position.z); pa.needsUpdate = true;
          trails[i].material.opacity = p < 1 ? 0.14 + 0.4 * Math.sin(p * Math.PI) : 0;
        });
        const re = clamp01((e - 0.55) / 0.45); if (blob) blob.scale.setScalar(0.3 + 0.7 * easeOutBack(re, 2.2));
        sparks.material.opacity = 0;
      }
    },
  };
  return api;
}
