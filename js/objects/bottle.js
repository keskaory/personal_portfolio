// A Le Labo bottle, built from the owner's reference photos: a squat clear
// apothecary cylinder about 1.7 times as tall as it is wide, its shoulder a full
// dome running into the neck, a thick clear base, a dip tube, a tall matte
// brushed-aluminium cap a little over half the body's width, and the wide
// off-white wrap label set in typewriter type with ruled sections.
// Units are meters.
import * as THREE from "three";
import { seeded } from "./textures.js";

// From the photos (50 ml: about 45 mm across; 100 ml: about 55 mm).
const SIZES = {
  100: { r: 0.0275, body: 0.092, dome: 0.019, base: 0.014, neck: 0.0105, capR: 0.0122, capH: 0.0285, labelH: 0.046 },
  50:  { r: 0.0225, body: 0.078, dome: 0.016, base: 0.012, neck: 0.0098, capR: 0.0124, capH: 0.0275, labelH: 0.038 },
  15:  { r: 0.0150, body: 0.055, dome: 0.011, base: 0.008, neck: 0.0072, capR: 0.0088, capH: 0.0200, labelH: 0.026 },
};
const WALL = 0.0016;
const V2 = (x, y) => new THREE.Vector2(x, y);

function arc(cx, cy, rad, a0, a1, steps = 6) {
  const pts = [];
  for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * (i / steps); pts.push(V2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)); }
  return pts;
}
// the domed shoulder: a quarter ellipse from the wall in to the neck
function dome(r, neck, top, h, steps = 14, inset = 0) {
  const pts = [];
  const rx = r - neck - inset, cx = neck, cy = top - h;
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * Math.PI / 2; pts.push(V2(cx + Math.cos(a) * rx, cy + Math.sin(a) * (h - inset))); }
  return pts;
}
function outerProfile(s) {
  const { r, body, neck } = s;
  return [V2(0, 0), ...arc(r - 0.002, 0.002, 0.002, -Math.PI / 2, 0, 4), ...dome(r, neck, body, s.dome), V2(neck, body + 0.004)];
}
function liquidProfile(s, fill) {
  const ri = s.r - WALL;
  const y0 = s.base, top = s.body - WALL;
  const y1 = y0 + fill * (top - y0);
  const domeStart = s.body - s.dome;
  const pts = [V2(0, y0), V2(ri - 0.001, y0), V2(ri, y0 + 0.001)];
  if (y1 <= domeStart) { pts.push(V2(ri, y1 - 0.0008), V2(ri - 0.0006, y1), V2(0, y1 - 0.0002)); return pts; }
  // a full bottle: the liquid follows the dome up to its level
  pts.push(V2(ri, domeStart));
  const rx = ri - s.neck, h = s.dome - WALL;
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * Math.PI / 2;
    const y = domeStart + Math.sin(a) * h;
    if (y > y1) { const x = s.neck + Math.cos(Math.asin(Math.min(1, (y1 - domeStart) / h))) * rx; pts.push(V2(x, y1), V2(0, y1)); return pts; }
    pts.push(V2(s.neck + Math.cos(a) * rx, y));
  }
  pts.push(V2(0, y1));
  return pts;
}
function capProfile(s) {
  const { capR, capH } = s;
  const e = 0.0008;
  return [V2(0, 0), V2(capR, 0), ...arc(capR - e, capH - e, e, 0, Math.PI / 2, 4), V2(0, capH)];
}

// matte, brushed aluminium: fine vertical streaks
let brushed = null;
function brushedTexture() {
  if (brushed) return brushed;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d");
  const rand = seeded(91);
  ctx.fillStyle = "#9d9d99"; ctx.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${rand() < 0.5 ? "255,255,255" : "0,0,0"},${rand() * 0.08})`; ctx.fillRect(rand() * 256, 0, 1, 64); }
  brushed = new THREE.CanvasTexture(c);
  brushed.colorSpace = THREE.SRGBColorSpace;
  brushed.wrapS = THREE.RepeatWrapping;
  return brushed;
}

// The label, set the way Le Labo's are: the name in bold type, the size line, rules
// between sections, typed values beside small sans captions, the maker's line at the foot.
// `spec` comes from fragrances.json; an old-style array of lines still works.
function labelTexture(spec, size, seed) {
  const W = 1024, H = 556, MX = 120; // the label wraps about half the bottle; type sits in the middle so it faces you
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const rand = seeded(seed);
  ctx.fillStyle = "#ebe8df"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},${rand() * 0.05})`; ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1); }
  const TYPE = '"Courier Prime", "Courier New", monospace';
  const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const ink = a => `rgba(24,22,20,${a})`;
  const type = (text, x, y, px, bold = false) => {
    ctx.font = `${bold ? 700 : 400} ${px}px ${TYPE}`;
    let cx = x;
    for (const ch of text) { ctx.fillStyle = ink(0.78 + rand() * 0.22); ctx.fillText(ch, cx + (rand() - 0.5) * 0.8, y + (rand() - 0.5) * 1.2); cx += ctx.measureText(ch).width; }
  };
  const rule = y => { ctx.fillStyle = ink(0.85); ctx.fillRect(MX - 30, y, W - 2 * MX + 60, 3); };
  const L = Array.isArray(spec) ? { name: spec[0], lines: spec.slice(1) } : spec || {};
  const sizeLine = L.size || (size === 100 ? "100ml e / 3.4 FL.OZ.LIQ." : size === 15 ? "15ml e / 0.5 FL.OZ.LIQ." : "50ml e / 1.7 FL.OZ.LIQ.");
  // the name, as large as fits
  let px = 92;
  ctx.font = `700 ${px}px ${TYPE}`;
  const name = (L.name || "").toUpperCase();
  while (ctx.measureText(name).width > W - 2 * MX && px > 44) { px -= 4; ctx.font = `700 ${px}px ${TYPE}`; }
  type(name, MX, 112, px, true);
  type(sizeLine, MX, 172, 42);
  rule(196);
  const lines = L.lines || ["eau de parfum", "natural spray / vaporisateur"];
  lines.slice(0, 2).forEach((t, i) => type(t, MX, 248 + i * 48, 40));
  rule(320);
  const fields = L.fields || [["Compounded:", "in our lab"], ["Fresh:", "12 months after first spray"]];
  fields.slice(0, 3).forEach(([k, v], i) => {
    const y = 372 + i * 44;
    ctx.font = `400 30px ${SANS}`; ctx.fillStyle = ink(0.85); ctx.fillText(k, MX, y);
    type(v, MX + 250, y, 36);
  });
  rule(H - 72);
  ctx.font = `400 19px ${SANS}`; ctx.fillStyle = ink(0.85);
  ctx.fillText("Made in USA  -", MX, H - 34);
  ctx.font = `700 21px ${SANS}`;
  ctx.fillText("LE LABO", MX + 150, H - 34);
  ctx.font = `400 19px ${SANS}`;
  ctx.fillText("-  233 Elizabeth Street, New York, NY 10012 USA", MX + 252, H - 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let shared = null;
function sharedMaterials() {
  if (shared) return shared;
  shared = {
    // the glass shell adds reflections and highlights; refraction happens in the liquid and the base
    shell: new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.03, metalness: 0, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.6, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    base: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.04, ior: 1.5, thickness: 0.03, attenuationColor: new THREE.Color("#d6e4de"), attenuationDistance: 0.08, envMapIntensity: 1.2 }),
    // matte aluminium: mostly diffuse, so it reads silver-grey in a dim room rather than mirroring the dark
    cap: new THREE.MeshStandardMaterial({ map: brushedTexture(), color: "#d6d6d2", metalness: 0.3, roughness: 0.55, envMapIntensity: 1.4 }),
    tube: new THREE.MeshStandardMaterial({ color: "#f4f4f2", roughness: 0.3, transparent: true, opacity: 0.45 }),
    labelBack: new THREE.MeshStandardMaterial({ color: "#d9d4c8", roughness: 0.9, side: THREE.BackSide }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
  };
  return shared;
}

export function createBottle(data, seed = 1) {
  const s = SIZES[data.size] || SIZES[50];
  const m = sharedMaterials();
  const group = new THREE.Group();
  group.name = data.id;

  const shell = new THREE.Mesh(new THREE.LatheGeometry(outerProfile(s), 96), m.shell);
  shell.renderOrder = 2;
  group.add(shell);
  // the thick clear base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(s.r - 0.0006, s.r - 0.0012, s.base, 96), m.base);
  base.position.y = s.base / 2;
  base.castShadow = true;
  group.add(base);
  // the liquid (Thé Matcha 26 is faintly green-gold; the others nearly clear)
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transmission: 1, roughness: 0, ior: 1.36, thickness: (s.r - WALL) * 2,
    attenuationColor: new THREE.Color(data.tint || "#efeee6"), attenuationDistance: 0.1, envMapIntensity: 0.6,
  });
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(liquidProfile(s, data.fill ?? 0.85), 96), liquidMat);
  group.add(liquid);
  // the dip tube, from the pump down to the base
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, s.body - s.base, 8), m.tube);
  tube.position.set(0.0015, s.base + (s.body - s.base) / 2, 0);
  group.add(tube);
  // the wide wrap label on the front
  const theta = Math.min(3.3, (s.labelH * (1024 / 556)) / s.r); // keeps the type's proportions true on the curve
  const labelR = s.r + 0.0002;
  const labelGeo = new THREE.CylinderGeometry(labelR, labelR, s.labelH, 96, 1, true, -theta / 2, theta);
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTexture(data.label || [data.name], data.size, seed), roughness: 0.86, transparent: true });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.renderOrder = 3;
  const labelY = s.base + (s.body - s.dome - s.base) * 0.6;
  label.position.y = labelY;
  label.castShadow = true;
  group.add(label);
  const labelBack = new THREE.Mesh(labelGeo, m.labelBack);
  labelBack.position.y = labelY;
  labelBack.scale.setScalar(0.999);
  group.add(labelBack);
  // the tall brushed cap, sitting down over the neck onto the dome
  const cap = new THREE.Mesh(new THREE.LatheGeometry(capProfile(s), 64), m.cap);
  cap.position.y = s.body - 0.0015;
  cap.castShadow = true;
  group.add(cap);

  const height = s.body - 0.0015 + s.capH;
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 1.25, s.r * 1.25, height, 16), m.hit);
  hit.position.y = height / 2;
  hit.userData.id = data.id;
  group.add(hit);

  return {
    group, hit, height, radius: s.r,
    focus: new THREE.Vector3(0, labelY, 0),
    dispose() {
      group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      liquidMat.dispose();
      labelMat.map.dispose();
      labelMat.dispose();
    },
  };
}
