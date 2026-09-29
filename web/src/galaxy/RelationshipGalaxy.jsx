import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SENSES, SC, SI, STATUS } from "../lib/senses.js";
import { roomEvents, reducedMotion } from "../lib/rippleEvents.js";
import { senseNebula, leverLantern, roomNode, pulseSystem, SENSE_DIR } from "../marks/marks3d.js";
import { levelOf } from "../marks/levels.js";
import Chord from "../marks/Chord.jsx";
import ScoresGrid from "../marks/ScoresGrid.jsx";
import { buildGalaxy, WORD, SIGN_COLOR } from "./galaxyGraph.js";

// The galaxy: senses (nebulae), rooms (blob + type icon) and levers (lanterns) held by
// soft forces — senses on a ring in chord order, levers above, rooms below — with every
// link drawn from model output. Ripple fibers carry dots cause → effect (1 fiber one-way,
// 2 mutual; dots = rooms it fired in; speed = size of the nudge; red lowers, green raises).
// Click a room: it bursts into its six scores (constant size; fullness = felt score;
// notch = below you) with only its own ripple; several can be open; open neighbours share
// a sense across a door when topology flags it. No text in the scene; a glyph legend sits
// on the side. Slow device or reduced motion: a laid-out still frame. No WebGL: the chord
// and the orb grid instead.

const GUIDE_SEEN_KEY = "sensi.galaxy.guide.seen";
const ang = (k) => (k * 60 - 90) * Math.PI / 180;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOutBack = (x, s = 1.6) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const easeInBack = (x, s = 1.3) => (s + 1) * x * x * x - s * x * x;
const RULES = { layers: 0.6, ring: true, gravity: true, help: true, pull: true, mass: true };
const TOUR = [
  { focus: "all", title: "Your home, read as comfort", body: "Six senses, your rooms, and what the model found between them." },
  { focus: "sense", title: "Senses", body: "Each cloud is a sense. Bigger means more rooms below your comfort line." },
  { focus: "room", title: "Rooms", body: "Each blob is a room, bulging toward the senses it does well on. Click one to open its six scores." },
  { focus: "lever", title: "Levers", body: "Each glass cube is a design move. Green threads raise a sense, red lower it." },
  { focus: "ripple", title: "Ripple", body: "Dots travel from cause to effect: one sense nudging another. More dots, more rooms." },
];

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

export default function RelationshipGalaxy({ turn, persona, onClose }) {
  const [webgl] = useState(hasWebGL);
  return webgl ? <GalaxyScene turn={turn} persona={persona} onClose={onClose} /> : <GalaxyFallback turn={turn} persona={persona} onClose={onClose} />;
}

function GalaxyFallback({ turn, persona, onClose }) {
  const data = useMemo(() => buildGalaxy(turn, persona), [turn, persona]);
  const types = new Map((turn?.graph_data?.nodes || []).map((n) => [n.id, n.room_type]));
  return (
    <div className="galaxy-overlay galaxy-fallback">
      <div className="galaxy-top"><span className="galaxy-title">relationship galaxy</span><button className="galaxy-close" onClick={onClose} aria-label="close">×</button></div>
      <div className="galaxy-fallback-body">
        <Chord rooms={data.rooms} size={340} thr={data.thr} />
        <ScoresGrid rooms={data.rooms} thr={data.thr} roomTypeOf={(r) => types.get(r.roomId)} />
      </div>
    </div>
  );
}

function GalaxyScene({ turn, persona, onClose }) {
  const mount = useRef(null); const S = useRef({});
  const [read, setRead] = useState(null);
  const [allOpen, setAllOpen] = useState(false);
  const [tourStep, setTourStep] = useState(-1);
  const data0 = useMemo(() => buildGalaxy(turn, persona), [turn, persona]);
  const tourRef = useRef(-1); tourRef.current = tourStep;

  useEffect(() => {
    const el = mount.current; if (!el || !data0.nodes.length) return;
    const { thr } = data0; const st = S.current; const rm = reducedMotion();
    const data = { nodes: data0.nodes.map((x) => ({ ...x })), links: data0.links.map((x) => ({ ...x })) };
    const hl = { nodes: new Set(), links: new Set(), on: false };
    st.open = new Map(); st.focus = null; st.degraded = false;

    const g = new ForceGraph3D(el, { controlType: "orbit" })
      .backgroundColor("#000000").showNavInfo(false).nodeRelSize(1).nodeLabel(() => "")
      .nodeThreeObject((x) => {
        let o;
        if (x.kind === "sense") o = senseNebula(x.s, 4.5 + x.fail * 0.55);
        else if (x.kind === "room") o = roomNode(x.r, x.rtype, 3 + x.failing.length * 0.45);
        else if (x.kind === "lever") o = leverLantern(x.lv, 1.8 + x.rows.length * 0.25);
        else if (x.kind === "score") o = senseNebula(x.s, 2.4, { level: levelOf(x.v), below: x.v < thr(x.s), variant: "light" });
        o.traverse((m) => { if (m.material && !m.material.uniforms) { m.material.transparent = true; m.userData.o0 = m.material.opacity; } });
        x.__obj = o; return o;
      })
      .linkThreeObject((l) => {
        const pts = new Float32Array(33 * 3); const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
        let mat;
        if (l.kind === "ripple" || l.kind === "inner") {
          const cols = new Float32Array(33 * 3); const ca = new THREE.Color(SC[l.e.from]), cb = new THREE.Color(SC[l.e.to]);
          for (let i = 0; i < 33; i++) { const c = ca.clone().lerp(cb, i / 32); cols.set([c.r, c.g, c.b], i * 3); }
          geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
          mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: l.kind === "inner" ? 0.85 : 0.2 + l.reach * 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
        } else if (l.kind === "lever" && l.tier !== "verified") {
          mat = new THREE.LineDashedMaterial({ color: SIGN_COLOR[l.sign], transparent: true, opacity: 0.35, dashSize: 2, gapSize: 2 });
        } else {
          const color = l.kind === "lever" ? SIGN_COLOR[l.sign] : l.kind === "door" ? (l.conflicts.length ? SC[l.conflicts[0]] : "#5a5a62") : SC[l.s] || "#777";
          const op = l.kind === "short" ? 0.06 + l.def * 0.5 : l.kind === "lever" ? 0.4 : l.kind === "door" ? (l.conflicts.length ? 0.55 : 0.2)
            : l.kind === "has" ? 0.35 : l.kind === "tie" ? 0.12 : l.kind === "shared" ? 0.85 : 0.25;
          mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
        }
        const line = new THREE.Line(geo, mat); line.userData.o0 = mat.opacity; l.__line = line; return line;
      })
      .linkPositionUpdate((line, { start, end }, l) => {
        const a = new THREE.Vector3(start.x, start.y, start.z), b = new THREE.Vector3(end.x, end.y, end.z); const mid = a.clone().add(b).multiplyScalar(0.5);
        const d = b.clone().sub(a); const L = d.length() || 1; const up = Math.abs(d.y / L) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const perp = new THREE.Vector3().crossVectors(d, up).normalize();
        const bow = l.kind === "ripple" ? (l.mutual ? 0.16 * l.side : 0.06) : l.kind === "inner" ? 0.12 * (l.side || 1) : 0.08;
        const c = new THREE.QuadraticBezierCurve3(a, mid.add(perp.multiplyScalar(L * bow)), b); l.__curve = c;
        const pos = line.geometry.attributes.position; for (let i = 0; i < 33; i++) { const p = c.getPoint(i / 32); pos.setXYZ(i, p.x, p.y, p.z); }
        pos.needsUpdate = true; line.geometry.computeBoundingSphere(); if (line.computeLineDistances) line.computeLineDistances(); return true;
      })
      .enableNodeDrag(false)
      .onNodeHover((x) => { el.style.cursor = x ? "pointer" : ""; if (st.focus || tourRef.current >= 0) return; light(x); say(x); })
      .onLinkHover((l) => { if (st.focus || tourRef.current >= 0) return; if (l?.kind === "ripple") setRead({ edge: l.e }); else if (l?.kind === "door") setRead({ door: l }); else if (l?.kind === "lever") setRead({ leverLink: l }); })
      .onNodeClick((x) => { if (x.kind === "room") toggleRoom(x); else if (x.kind === "sense") focusSense(st.focus === x.s ? null : x.s); })
      .onBackgroundClick(() => { if (st.focus) focusSense(null); })
      .warmupTicks(200).cooldownTicks(Infinity).d3AlphaMin(0)
      .graphData(data);
    st.g = g;
    g.renderer().toneMapping = THREE.NoToneMapping;
    g.renderer().setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const bloom = new UnrealBloomPass(); bloom.strength = 0.9; bloom.radius = 0.5; bloom.threshold = 0.62; g.postProcessingComposer().addPass(bloom);
    g.scene().fog = new THREE.FogExp2(0x000000, 0.0012); g.scene().add(new THREE.AmbientLight(0xffffff, 0.9));
    { const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(80, 200, 150); g.scene().add(dl); }

    // ── the rules, as soft forces: strata (levers above, senses, rooms below), sense ring,
    // levers near the senses they move and the rooms they could help ──
    const Y = { lever: 70, sense: 0, room: -70 };
    const custom = (fn) => { let ns = []; const f = (alpha) => fn(ns, alpha); f.initialize = (x) => { ns = x; }; return f; };
    g.d3Force("strata", custom((ns, a) => { const k = RULES.layers * 0.3 * a; ns.forEach((x) => { const t = Y[x.kind]; if (t !== undefined) x.vy += (t - x.y) * k; }); }));
    g.d3Force("ring", custom((ns, a) => { const k = 0.18 * a; ns.forEach((x) => { if (x.kind !== "sense") return; const q = ang(SENSES.indexOf(x.s)); x.vx += (95 * Math.cos(q) - x.x) * k; x.vz += (95 * Math.sin(q) - x.z) * k; }); }));
    g.d3Force("home", custom((ns, a) => { const byId = new Map(ns.map((x) => [x.id, x])); const k = 0.04 * a;
      ns.forEach((x) => { if (x.kind !== "lever") return; let cx = 0, cz = 0; x.rows.forEach(([, s]) => { const t = byId.get(`sense:${s}`); if (t) { cx += t.x; cz += t.z; } }); cx /= x.rows.length; cz /= x.rows.length;
        x.vx += (cx * 1.25 - x.x) * k; x.vz += (cz * 1.25 - x.z) * k; }); }));
    g.d3Force("help", custom((ns, a) => { const byId = new Map(ns.map((x) => [x.id, x])); const k = 0.05 * a;
      ns.forEach((x) => { if (x.kind !== "lever" || !x.helps.length) return; let cx = 0, cz = 0; x.helps.forEach((h) => { const r = byId.get(h); if (r) { cx += r.x; cz += r.z; } }); cx /= x.helps.length; cz /= x.helps.length;
        x.vx += (cx - x.x) * k; x.vz += (cz - x.z) * k; }); }));
    g.d3Force("charge").strength((x) => (x.kind === "score" ? 0 : -45 * (x.imp || 1)));
    g.d3Force("link").distance((l) => l.kind === "ripple" ? 120 - l.e.count * 7 : l.kind === "short" ? 55 : l.kind === "lever" ? 45 : l.kind === "door" ? 26 : 30)
      .strength((l) => l.kind === "short" ? 0.02 + l.def * 0.55 : l.kind === "ripple" || l.kind === "door" ? 0.12 : ["has", "tie", "inner", "shared"].includes(l.kind) ? 0 : 0.05);
    g.d3VelocityDecay(0.35);

    // ── render control: still frames when slow or under reduced motion ──
    let pauseT = 0;
    const pause = () => { g.pauseAnimation(); st.paused = true; };      // the frame loop below stops with it
    const kick = (ms = 400) => {
      if (!(st.degraded || rm)) return;
      g.resumeAnimation(); st.paused = false; if (!st.raf) st.raf = requestAnimationFrame(loop);
      clearTimeout(pauseT); pauseT = setTimeout(pause, ms);
    };
    st.kick = kick;
    ["pointerdown", "wheel", "pointermove"].forEach((ev) => el.addEventListener(ev, () => { if (ev !== "pointermove" || st.dragging) kick(); }, { passive: true }));
    el.addEventListener("pointerdown", () => { st.dragging = true; }); window.addEventListener("pointerup", st.onUp = () => { st.dragging = false; });

    // ── the loop: billboard faces, nebula motion, burst choreography, ripple dots ──
    const _q = new THREE.Quaternion(); const pulses = pulseSystem(g.scene()); st.pulses = pulses;
    let acc = 1.5, last = performance.now(), ema = 16, frames = 0; const T0 = performance.now();
    const place = (x, now) => {           // open rooms: score nodes pinned on the burst curve
      const o = st.open.get(x.id); if (!o) return;
      const e = (now - o.t0) / 1000; const dist = 14 + x.failing.length;
      o.scores.forEach((sn, i) => {
        let p;
        if (o.closing) { p = 1 - easeInBack(clamp01((e - (5 - i) * 0.05) / 0.45)); }
        else p = rm || st.degraded ? 1 : easeOutBack(clamp01((e - 0.2 - i * 0.07) / 0.6));
        const dir = SENSE_DIR[i]; sn.fx = x.x + dir.x * dist * p; sn.fy = x.y + 10 + dir.y * dist * p; sn.fz = x.z + dir.z * dist * p;
        if (sn.__obj) sn.__obj.scale.setScalar(Math.max(0.01, o.closing ? 0.3 + 0.7 * p : p));
      });
      const blob = x.__obj?.userData.blob;
      if (blob) {
        if (o.closing) { const re = clamp01((e - 0.55) / 0.45); blob.scale.setScalar(0.3 + 0.7 * easeOutBack(re, 2.2)); }
        else if (rm || st.degraded) blob.scale.setScalar(0.35);
        else if (e < 0.15) { const sq = e / 0.15; blob.scale.set(1 + 0.14 * sq, 1 - 0.2 * sq, 1 + 0.14 * sq); }
        else blob.scale.setScalar(Math.max(0.35, 1.12 - 0.82 * easeOutBack(clamp01((e - 0.15) / 0.3), 1.2)));
      }
      if (o.closing && e > 1.0) finishClose(x);
    };
    const loop = () => {
      const now = performance.now(); const dt = (now - last) / 1000; last = now;
      if (dt < 0.25) { if (frames > 0) ema = ema * 0.94 + dt * 1000 * 0.06; frames++; }   // gaps (hidden tab) aren't slowness
      if (!st.degraded && !rm && frames > 20 && ema > 30) { st.degraded = true; pulses.clear(); document.body.classList.add("is-still"); st.open.forEach((_, id) => { const x = g.graphData().nodes.find((n) => n.id === id); if (x) place(x, now); }); kick(600); }
      const q = g.camera().quaternion; const t = (now - T0) / 1000; const moving = !(st.degraded || rm);
      g.graphData().nodes.forEach((x) => {
        const o = x.__obj; if (!o) return;
        const f = o.userData.face; if (f) { o.getWorldQuaternion(_q); f.quaternion.copy(_q.invert().multiply(q)); }
        if (moving) o.userData.tick?.(t);
        if (x.kind === "room") place(x, now);
      });
      if (moving) {
        pulses.tick(dt); acc += dt;
        if (acc > 1.6) {
          acc = 0;
          g.graphData().links.forEach((l) => {
            if (!l.__curve) return;
            const col = l.e && (l.e.meanDelta ?? l.e.delta) < 0 ? STATUS.fail : STATUS.pass;
            if (l.kind === "inner") { for (let k = 0; k < 4; k++) pulses.spawn(l.__curve, col, 0.25 + Math.abs(l.e.delta) * 6, 0.8 - k * 0.15, k * 0.022); return; }
            if (l.kind !== "ripple" || (st.focus && l.e.from !== st.focus)) return;
            for (let i = 0; i < l.e.count; i++) for (let k = 0; k < 4; k++) pulses.spawn(l.__curve, col, 0.2 + Math.abs(l.e.meanDelta) * 6, 1 - k * 0.2, i * 0.09 + k * 0.022);
          });
        }
      }
      st.raf = st.paused ? 0 : requestAnimationFrame(loop);
    };
    st.raf = requestAnimationFrame(loop);
    if (rm) pauseT = setTimeout(pause, 800);

    // ── light a node + its neighbours, dim the rest ──
    const setFade = (obj, f) => obj.traverse((m) => { if (!m.material) return; if (m.material.uniforms?.fade) m.material.uniforms.fade.value = f; else if (m.userData.o0 !== undefined) m.material.opacity = m.userData.o0 * f; });
    const paint = () => {
      const on = hl.on;
      g.graphData().nodes.forEach((x) => x.__obj && setFade(x.__obj, !on || hl.nodes.has(x) ? 1 : 0.12));
      g.graphData().links.forEach((l) => { if (l.__line) l.__line.material.opacity = !on || hl.links.has(l) ? Math.min(1, l.__line.userData.o0 * (on ? 2 : 1)) : l.__line.userData.o0 * 0.1; });
      kick();
    };
    const light = (x, keep) => {
      hl.nodes.clear(); hl.links.clear(); hl.on = !!x;
      if (x) { hl.nodes.add(x); g.graphData().links.forEach((l) => { if ((l.source === x || l.target === x) && (!keep || keep(l))) { hl.links.add(l); hl.nodes.add(l.source); hl.nodes.add(l.target); } }); }
      paint();
    };
    const spotlight = (kind) => {             // tour beats: light one kind of thing
      hl.nodes.clear(); hl.links.clear(); hl.on = kind !== "all";
      g.graphData().nodes.forEach((x) => { if (x.kind === kind || (kind === "ripple" && x.kind === "sense")) hl.nodes.add(x); });
      g.graphData().links.forEach((l) => { if ((kind === "ripple" && l.kind === "ripple") || (kind === "lever" && l.kind === "lever") || (kind === "room" && l.kind === "door")) hl.links.add(l); });
      paint();
    };
    st.spotlight = spotlight;
    const say = (x) => setRead(!x ? null : x.kind === "room" ? { room: x } : x.kind === "lever" ? { lever: x }
      : x.kind === "sense" ? { sense: x.s, outs: data0.events.filter((e) => e.from === x.s), ins: data0.events.filter((e) => e.to === x.s) }
        : x.kind === "score" ? { score: x } : null);
    const focusSense = (s) => { st.focus = s; pulses.clear(); acc = 1.6; const x = s && g.graphData().nodes.find((y) => y.id === `sense:${s}`); light(x || null, (l) => l.kind === "ripple" || l.kind === "short"); say(x || null); };

    // ── open rooms in place ──
    const doorPairs = data0.links.filter((l) => l.kind === "door").map((l) => ({ a: l.source, b: l.target, c: l.conflicts }));
    const addOpen = (x, nodes, links) => {
      const r = x.r; const key = r.roomId ?? r.roomName; const scores = [];
      SENSES.forEach((s) => {
        const v = r.comfortScores?.[s] ?? 0;
        const sn = { id: `score:${key}:${s}`, kind: "score", s, v, r, parent: x.id, fx: x.x, fy: x.y, fz: x.z, x: x.x, y: x.y, z: x.z };
        nodes.push(sn); scores.push(sn);
        links.push({ source: x.id, target: sn.id, kind: "has", s, owner: x.id });
        links.push({ source: sn.id, target: `sense:${s}`, kind: "tie", s, owner: x.id });
      });
      const re = roomEvents(r);
      re.forEach((e) => { const mutual = re.some((y) => y.from === e.to && y.to === e.from);
        links.push({ source: `score:${key}:${e.from}`, target: `score:${key}:${e.to}`, kind: "inner", e, mutual, side: [e.from, e.to].sort()[0] === e.from ? 1 : -1, owner: x.id }); });
      doorPairs.forEach((d) => { const other = d.a === x.id ? d.b : d.b === x.id ? d.a : null; if (!other || !st.open.has(other) || st.open.get(other).closing) return;
        const okey = other.slice(5); d.c.forEach((s) => links.push({ source: `score:${key}:${s}`, target: `score:${okey}:${s}`, kind: "shared", s, owner: x.id, owner2: other })); });
      st.open.set(x.id, { t0: performance.now(), scores, closing: false });
    };
    const finishClose = (x) => {
      const cur = g.graphData(); st.open.delete(x.id);
      g.graphData({ nodes: cur.nodes.filter((y) => y.parent !== x.id), links: cur.links.filter((l) => l.owner !== x.id && l.owner2 !== x.id) });
      x.__obj?.userData.blob?.scale.setScalar(1);
    };
    const closeRoom = (x) => { const o = st.open.get(x.id); if (!o || o.closing) return; if (rm || st.degraded) { finishClose(x); kick(); return; } o.closing = true; o.t0 = performance.now(); };
    const toggleRoom = (x) => {
      pulses.clear(); acc = 1.6;
      if (st.open.has(x.id) && !st.open.get(x.id).closing) { closeRoom(x); setRead(null); kick(1400); return; }
      const cur = g.graphData(); const nodes = [...cur.nodes], links = [...cur.links]; addOpen(x, nodes, links); g.graphData({ nodes, links });
      setRead({ open: x, ev: roomEvents(x.r) }); kick(1600);
    };
    st.openAll = (on) => {
      const roomsN = g.graphData().nodes.filter((y) => y.kind === "room");
      if (!on) { roomsN.forEach((x) => st.open.has(x.id) && closeRoom(x)); kick(1400); return; }
      const cur = g.graphData(); const nodes = [...cur.nodes], links = [...cur.links];
      roomsN.forEach((x) => { if (!st.open.has(x.id)) addOpen(x, nodes, links); });
      g.graphData({ nodes, links }); pulses.clear(); acc = 1.6; kick(1600);
    };
    st.toggleRoom = toggleRoom;

    g.cameraPosition({ x: 0, y: 190, z: 300 }, { x: 0, y: -10, z: 0 }, 0);
    const fit = (ms) => { if (!el.clientWidth) return; g.zoomToFit(ms, 20, (y) => y.kind !== "lever"); kick(ms + 400); };
    const fitT = setTimeout(() => fit(rm ? 0 : 900), 300);
    let sized = false;
    const ro = new ResizeObserver(() => { if (!el.clientWidth) return; g.width(el.clientWidth).height(el.clientHeight); if (!sized) { sized = true; fit(0); } kick(); }); ro.observe(el);
    const onKey = (e) => { if (e.key === "Escape") { if (st.open.size) st.openAll(false); else focusSense(null); } };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(st.raf); clearTimeout(pauseT); clearTimeout(fitT); ro.disconnect(); window.removeEventListener("keydown", onKey); window.removeEventListener("pointerup", st.onUp);
      document.body.classList.remove("is-still");
      try { pulses.dispose(); bloom.dispose(); g._destructor(); g.renderer().forceContextLoss(); g.renderer().dispose(); } catch { /* noop */ }
      el.replaceChildren();
    };
  }, [data0]);

  // first open → the short tour once (remembered); "?" replays it
  useEffect(() => {
    let seen = true;
    try { seen = !!localStorage.getItem(GUIDE_SEEN_KEY); localStorage.setItem(GUIDE_SEEN_KEY, "1"); } catch { seen = false; }
    if (!seen) setTourStep(0);
  }, []);
  useEffect(() => { S.current.spotlight?.(tourStep >= 0 ? TOUR[tourStep].focus : "all"); }, [tourStep]);

  const n = data0.rooms.length;
  const rel = (e, k, cnt = true) => (
    <div key={k ?? e.from + e.to} className="gx-rel">
      <span style={{ color: SC[e.from] }}>{SI[e.from]} {WORD[e.from]}</span>
      <span style={{ color: (e.meanDelta ?? e.delta) < 0 ? STATUS.fail : STATUS.pass }}> {(e.meanDelta ?? e.delta) < 0 ? "lowers" : "raises"} </span>
      <span style={{ color: SC[e.to] }}>{SI[e.to]} {WORD[e.to]}</span>{cnt && <span className="gx-mut"> · {e.count}/{n}</span>}
    </div>
  );
  const beat = tourStep >= 0 ? TOUR[tourStep] : null;
  return (
    <div className="galaxy-overlay">
      <div className="galaxy-canvas" ref={mount} />
      <div className="galaxy-top">
        <span className="galaxy-title">relationship galaxy</span>
        <div className="galaxy-levels">
          <button className={"galaxy-lv" + (allOpen ? " on" : "")} onClick={() => { const v = !allOpen; setAllOpen(v); S.current.openAll?.(v); }}>{allOpen ? "close all" : "open all"}</button>
          <button className={"galaxy-lv" + (tourStep >= 0 ? " on" : "")} title="replay the tour" onClick={() => setTourStep(0)}>?</button>
        </div>
        <button className="galaxy-close" onClick={onClose} aria-label="close">×</button>
      </div>

      <div className="gx-read">
        {!read && <span className="gx-mut">hover anything · click a room · click a sense</span>}
        {read?.edge && rel(read.edge)}
        {read?.door && <><div>{read.door.door || "door"}</div><div className="gx-mut">{read.door.conflicts.length ? <>fails across it: {read.door.conflicts.map((s) => <span key={s} style={{ color: SC[s] }}>{SI[s]} {WORD[s]} </span>)}</> : "nothing fails across it"}</div></>}
        {read?.leverLink && <div>{read.leverLink.source.lv} <span style={{ color: SIGN_COLOR[read.leverLink.sign] }}>{read.leverLink.sign === "+" ? "raises" : read.leverLink.sign === "-" ? "lowers" : "trades off"}</span> <span style={{ color: SC[read.leverLink.s] }}>{SI[read.leverLink.s]} {WORD[read.leverLink.s]}</span></div>}
        {read?.room && <><div>{read.room.r.roomName} <span className="gx-mut">{(read.room.r.overallScore ?? 0).toFixed(2)}</span></div>{read.room.failing.length > 0 && <div className="gx-mut">below you: {read.room.failing.map((s) => <span key={s} style={{ color: SC[s] }}>{SI[s]} </span>)}</div>}</>}
        {read?.lever && <><div>{read.lever.lv}</div>{read.lever.rows.map(([, s, sign]) => <div key={s}><span style={{ color: SIGN_COLOR[sign] }}>{sign === "-" ? "−" : sign} </span><span style={{ color: SC[s] }}>{SI[s]} {WORD[s]}</span></div>)}</>}
        {read?.score && <div>{read.score.r.roomName} · <span style={{ color: SC[read.score.s] }}>{SI[read.score.s]} {WORD[read.score.s]}</span> <span style={{ color: read.score.v < data0.thr(read.score.s) ? STATUS.fail : undefined }}>{read.score.v.toFixed(2)}</span></div>}
        {read?.sense && <><div style={{ color: SC[read.sense] }}>{SI[read.sense]} {WORD[read.sense]}</div>{read.outs.map((e) => rel(e))}{read.ins.map((e) => rel(e))}{!read.outs.length && !read.ins.length && <div className="gx-mut">no ripple computed</div>}</>}
        {read?.open && <><div>{read.open.r.roomName} <span className="gx-mut">{(read.open.r.overallScore ?? 0).toFixed(2)}</span></div>{read.ev.length ? read.ev.map((e, i) => rel(e, i, false)) : <div className="gx-mut">no ripple here</div>}</>}
      </div>

      <div className="gx-legend" aria-label="legend">
        <div className="gx-legend-senses">{SENSES.map((s) => <span key={s} style={{ color: SC[s] }}>{SI[s]} {WORD[s]}</span>)}</div>
        <div>cloud = sense · size = rooms below you</div>
        <div>blob = room · cube = lever</div>
        <div>dots = cause → effect · <span style={{ color: STATUS.fail }}>lowers</span> / <span style={{ color: STATUS.pass }}>raises</span></div>
      </div>

      {beat && (
        <div className="galaxy-guide">
          <div className="galaxy-guide-card">
            <div className="galaxy-guide-title">{beat.title}</div>
            <div className="galaxy-guide-body">{beat.body}</div>
            <div className="galaxy-guide-controls">
              <button className="galaxy-guide-btn" onClick={() => setTourStep(-1)}>skip</button>
              <div className="galaxy-guide-dots" aria-hidden="true">{TOUR.map((_, i) => <span key={i} className={"galaxy-guide-dot" + (i === tourStep ? " on" : "")} />)}</div>
              <button className="galaxy-guide-btn" onClick={() => setTourStep((s) => Math.max(0, s - 1))} disabled={tourStep === 0}>back</button>
              <button className="galaxy-guide-btn is-primary" onClick={() => setTourStep((s) => (s >= TOUR.length - 1 ? -1 : s + 1))}>{tourStep === TOUR.length - 1 ? "done" : "next →"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
