// Small things that make surfaces feel physical, shared by every scene:
// soft contact shadows where furniture meets the floor, and roughness maps
// so a surface isn't one even sheen (wet patches on the platform, worn spots
// on wood and formica, where hands and feet have been).
import * as THREE from "three";
import { seeded } from "./textures.js";

const cache = {};

// a soft-edged rectangle (or ellipse) of shadow, the darkest right under the object
function shadowTexture(round) {
  const key = round ? "round" : "rect";
  if (cache[key]) return cache[key];
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.filter = "blur(14px)";
  ctx.fillStyle = "rgba(0,0,0,1)";
  if (round) { ctx.beginPath(); ctx.ellipse(64, 64, 36, 36, 0, 0, Math.PI * 2); ctx.fill(); }
  else ctx.fillRect(26, 26, 76, 76);
  cache[key] = new THREE.CanvasTexture(c);
  return cache[key];
}

// a contact shadow lying on a surface at height y; w and d are the object's footprint
export function contactShadow(x, y, z, w, d, { opacity = 0.65, round = false, rotation = 0, spread = 1.35 } = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w * spread, d * spread),
    new THREE.MeshBasicMaterial({ map: shadowTexture(round), transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }),
  );
  m.rotation.set(-Math.PI / 2, 0, rotation);
  m.position.set(x, y + 0.002, z);
  m.renderOrder = 1;
  return m;
}

// Roughness that varies: mid-grey base, smoother (darker) patches where it's wet or polished
// by use, rougher (lighter) grime. `wet` makes larger glossy pools, for a rained-on floor.
export function roughnessMap(seed, { size = 512, wet = 0, wear = 0.5, repeat = [1, 1] } = {}) {
  const k = `${seed}:${wet}:${wear}:${size}`;
  if (cache[k]) return cache[k];
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const rand = seeded(seed);
  ctx.fillStyle = "rgb(150,150,150)";
  ctx.fillRect(0, 0, size, size);
  ctx.filter = `blur(${size / 40}px)`;
  for (let i = 0; i < 70; i++) {
    const v = 110 + rand() * 90;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.25 * wear + rand() * 0.25})`;
    ctx.beginPath(); ctx.ellipse(rand() * size, rand() * size, size * (0.03 + rand() * 0.1), size * (0.02 + rand() * 0.06), rand() * 3, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 26 * wet; i++) {
    const v = 15 + rand() * 30; // puddles: near mirror
    ctx.fillStyle = `rgba(${v},${v},${v},${0.6 + rand() * 0.4})`;
    ctx.beginPath(); ctx.ellipse(rand() * size, rand() * size, size * (0.04 + rand() * 0.12), size * (0.03 + rand() * 0.07), rand() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.filter = "none";
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  cache[k] = t;
  return t;
}
