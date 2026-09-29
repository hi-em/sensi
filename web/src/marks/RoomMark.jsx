// A room's mark on 2D surfaces: the same blob + type icon the galaxy draws, rendered
// once per room (and per score set) by ONE shared offscreen three.js renderer into an
// image. three.js is loaded on demand, so pages that never show a room mark don't pay
// for it. Without WebGL it falls back to a quiet neutral dot.
import { useEffect, useState } from "react";

let stageP = null;
const thumbs = new Map();
function stage() {
  if (stageP) return stageP;
  stageP = Promise.all([import("three"), import("three/addons/environments/RoomEnvironment.js"), import("./marks3d.js")])
    .then(([THREE, { RoomEnvironment }, marks]) => {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.NoToneMapping;
      const scene = new THREE.Scene(); const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.12;
      scene.add(new THREE.AmbientLight(0xffffff, 0.55)); const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(-80, 200, 120); scene.add(dl);
      const cam = new THREE.PerspectiveCamera(30, 1, 1, 200); cam.position.set(0, 8, 25); cam.lookAt(0, 0, 0);
      return { renderer, scene, cam, marks };
    })
    .catch(() => null);
  return stageP;
}

export async function blobThumb(room, roomType, px = 96) {
  const key = `${room.roomName}|${roomType}|${px}|${Object.values(room.comfortScores || {}).join(",")}`;
  if (thumbs.has(key)) return thumbs.get(key);
  const st = await stage(); if (!st) return null;
  st.renderer.setPixelRatio(1); st.renderer.setSize(px, px, false);
  const n = st.marks.roomNode(room, roomType, 5.5); n.rotation.y = 0.5; const face = n.userData.face; if (face) { face.rotation.x = -0.25; face.scale.multiplyScalar(1.35); }
  st.scene.add(n); st.renderer.render(st.scene, st.cam); const url = st.renderer.domElement.toDataURL("image/png"); st.scene.remove(n);
  n.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  thumbs.set(key, url); return url;
}

export default function RoomMark({ room, roomType, size = 36, title }) {
  const [src, setSrc] = useState(undefined);
  useEffect(() => {
    let alive = true;
    blobThumb(room, roomType, Math.round(size * 2)).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [room, roomType, size]);
  return (
    <span title={title ?? room.roomName} style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flex: "none" }}>
      {src ? <img src={src} alt="" width={size} height={size} style={{ display: "block" }} />
        : src === null ? <span style={{ width: size * 0.4, height: size * 0.4, borderRadius: "50%", background: "rgba(var(--fg-rgb),0.25)" }} /> : null}
    </span>
  );
}
