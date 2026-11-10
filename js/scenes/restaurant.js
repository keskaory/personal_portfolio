// What I've Done, 12:30 am. A narrow noodle shop: a formica table running
// to a rain-streaked window, booth seats either side. On the table a bowl of
// chicken pho with green chopsticks across it, a plate of herbs, the sauces,
// an iced drink, and the menu propped against the glass. Behind the far
// booth, the kitchen hatch: frosted glass, warm light, the cooks' shapes
// moving behind it. Outside, sign light from the street, red and green.
// The menu holds the projects and experience.
// Leaving: the camera lifts to the rain on the window (the match cut).
//
// Coordinates: meters; the floor at y = 0, the table top at y = 0.74, the
// window wall at x = -1.0, the camera looking toward -x.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rainWindow } from "../objects/rain-window.js";
import { concrete, neonCity } from "../objects/station-textures.js";
import { createMenu } from "../objects/menu.js";
import { makeHandle, pose } from "../core/handling.js";
import { seeded } from "../objects/textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TABLE_Y = 0.74;

function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 8;
  return t;
}

// many small pieces of one material as a single mesh: place(geometry, i) positions each copy
const dummy = new THREE.Object3D();
function merged(n, makeGeo, place, mat, { cast = true } = {}) {
  const geos = [];
  for (let i = 0; i < n; i++) {
    const g = makeGeo(i);
    dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
    place(dummy, i);
    dummy.updateMatrix();
    g.applyMatrix4(dummy.matrix);
    geos.push(g.index ? g.toNonIndexed() : g);
  }
  const m = new THREE.Mesh(mergeGeometries(geos), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

// push each vertex a little along its normal, so nothing reads as a clean primitive
function rough(g, amt, rand) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const k = (rand() - 0.5) * amt;
    p.setXYZ(i, p.getX(i) + n.getX(i) * k, p.getY(i) + n.getY(i) * k, p.getZ(i) + n.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}
// a pointed leaf (basil) or a scalloped one (cilantro), lying in the xz plane, slightly cupped
function leafGeo(len, width, { scallop = false } = {}) {
  const sh = new THREE.Shape();
  if (scallop) {
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2, r = len * (0.72 + 0.28 * Math.abs(Math.cos(a * 2.5)));
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.9;
      i ? sh.lineTo(x, y) : sh.moveTo(x, y);
    }
  } else {
    sh.moveTo(0, 0);
    sh.quadraticCurveTo(len * 0.45, width, len, 0);
    sh.quadraticCurveTo(len * 0.45, -width, 0, 0);
  }
  const g = new THREE.ShapeGeometry(sh, 6);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, (x * x + z * z) * (scallop ? 4 : 2.2)); }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- surfaces
// small square wall tiles, cream gone slightly yellow, darker grout
function wallTiles() {
  const [c, ctx] = cv(512, 512);
  const rand = seeded(401);
  ctx.fillStyle = "#6e675a";
  ctx.fillRect(0, 0, 512, 512);
  const n = 8, s = 512 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = 208 + rand() * 16;
    ctx.fillStyle = `rgb(${v},${v - 4},${v - 20})`;
    ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(i * s + 4, j * s + 4, s - 12, 3);
  }
  for (let i = 0; i < 6000; i++) { ctx.fillStyle = `rgba(60,50,30,${rand() * 0.06})`; ctx.fillRect(rand() * 512, rand() * 512, 2, 2); }
  return tex(c, [5, 3]);
}
// formica: pale mint with a fine pattern, worn where plates go
function formica() {
  const [c, ctx] = cv(512, 512);
  const rand = seeded(403);
  ctx.fillStyle = "#b9c7b2";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    ctx.strokeStyle = `rgba(${rand() < 0.5 ? "90,100,90" : "255,255,250"},${0.06 + rand() * 0.08})`;
    ctx.beginPath();
    const x = rand() * 512, y = rand() * 512, a = rand() * 6;
    ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
    ctx.stroke();
  }
  // faint rings where glasses have stood, and a wiped arc
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(80,90,80,${0.05 + rand() * 0.05})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(rand() * 512, rand() * 512, 22 + rand() * 8, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.lineWidth = 1;
  return tex(c);
}
function vinyl() {
  const [c, ctx] = cv(256, 256);
  const rand = seeded(405);
  ctx.fillStyle = "#7a2a20";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(0,0,0,${rand() * 0.1})`; ctx.fillRect(rand() * 256, rand() * 256, 1, 1); }
  for (let y = 32; y < 256; y += 64) { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0, y, 256, 3); ctx.fillStyle = "rgba(255,200,180,0.1)"; ctx.fillRect(0, y + 3, 256, 2); }
  ctx.fillStyle = "rgba(190,170,140,0.5)";
  ctx.fillRect(150, 140, 46, 10); // a split in the seat, taped
  return tex(c, [2, 1]);
}
function steamTexture() {
  const [c, ctx] = cv(128, 256);
  const g = ctx.createRadialGradient(64, 150, 0, 64, 150, 90);
  g.addColorStop(0, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  return new THREE.CanvasTexture(c);
}

function box(w, h, d, mat, x, y, z, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}
const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

// ---------------------------------------------------------------- the bowl
// clear golden broth with fat beading on it; looking in you see the noodles under it
function brothTexture() {
  const [c, ctx] = cv(512, 512);
  const rand = seeded(421);
  const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  g.addColorStop(0, "#c98d3c");
  g.addColorStop(0.75, "#a66a26");
  g.addColorStop(1, "#7a4a18");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const x = rand() * 512, y = rand() * 512, r = 1.2 + Math.pow(rand(), 3) * 9;
    ctx.fillStyle = `rgba(255,214,120,${0.18 + rand() * 0.22})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,246,214,${0.35 + rand() * 0.4})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
  }
  return tex(c);
}
function submergedNoodles() {
  const [c, ctx] = cv(512, 512);
  const rand = seeded(423);
  ctx.fillStyle = "#6f4a1f";
  ctx.fillRect(0, 0, 512, 512);
  ctx.lineCap = "round";
  for (let i = 0; i < 420; i++) {
    ctx.strokeStyle = `rgba(250,240,214,${0.35 + rand() * 0.45})`;
    ctx.lineWidth = 2 + rand() * 2;
    ctx.beginPath();
    let x = rand() * 512, y = rand() * 512, a = rand() * 6.28;
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) { a += (rand() - 0.5) * 1.2; x += Math.cos(a) * 16; y += Math.sin(a) * 16; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  return tex(c);
}

function pho() {
  const g = new THREE.Group();
  const rand = seeded(411);
  const ceramic = new THREE.MeshPhysicalMaterial({ color: "#f4f1ea", roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  // a wide white bowl on a foot ring
  const bowl = new THREE.Mesh(lathe([
    [0.0, 0.006], [0.042, 0.006], [0.044, 0.0], [0.05, 0.0], [0.052, 0.009], [0.076, 0.029], [0.1, 0.06], [0.114, 0.088], [0.117, 0.093],
    [0.113, 0.094], [0.109, 0.089], [0.096, 0.063], [0.07, 0.033], [0.04, 0.021], [0.0, 0.019],
  ], 48), ceramic);
  bowl.castShadow = bowl.receiveShadow = true;
  g.add(bowl);
  // noodles seen through the broth, then the broth's surface
  const under = new THREE.Mesh(new THREE.CircleGeometry(0.087, 40), new THREE.MeshStandardMaterial({ map: submergedNoodles(), roughness: 0.6 }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = 0.05;
  g.add(under);
  const broth = new THREE.Mesh(new THREE.CircleGeometry(0.098, 48), new THREE.MeshStandardMaterial({ map: brothTexture(), transparent: true, opacity: 0.84, roughness: 0.04, metalness: 0.0 }));
  broth.rotation.x = -Math.PI / 2;
  broth.position.y = 0.064;
  g.add(broth);
  // rice noodles lifting out of it in a loose heap
  const noodle = new THREE.MeshStandardMaterial({ color: "#f3eee2", roughness: 0.38 });
  g.add(merged(34, () => {
    const pts = [];
    let a = rand() * 6.28, r = 0.015 + rand() * 0.05;
    for (let k = 0; k < 7; k++) {
      a += 0.45 + rand() * 0.5;
      r = Math.min(0.082, Math.max(0.008, r + (rand() - 0.5) * 0.025));
      pts.push(V(Math.cos(a) * r - 0.012, 0.062 + Math.sin(k * 1.3 + rand()) * 0.004 + (k > 1 && k < 5 ? 0.004 : 0), Math.sin(a) * r + 0.01));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.00125, 4);
  }, () => {}, noodle, { cast: false }));
  // pulled chicken: torn, fibrous pieces in three tones, a few with skin
  const tones = [
    [new THREE.MeshStandardMaterial({ color: "#dfcfb0", roughness: 0.72 }), 12],
    [new THREE.MeshStandardMaterial({ color: "#c9ae84", roughness: 0.66 }), 7],
    [new THREE.MeshStandardMaterial({ color: "#e0c487", roughness: 0.38 }), 4], // skin
  ];
  tones.forEach(([mat, n]) => g.add(merged(n, () => {
    const piece = new THREE.CapsuleGeometry(0.004 + rand() * 0.002, 0.02 + rand() * 0.025, 3, 7);
    // taper one end, as a torn piece does
    const p = piece.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 0.55 + 0.45 * (p.getY(i) / 0.03 + 0.5); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
    return rough(piece, 0.0024, rand);
  }, d => {
    const a = rand() * 6.28, r = 0.01 + rand() * 0.048;
    d.position.set(Math.cos(a) * r + 0.012, 0.067 + rand() * 0.006, Math.sin(a) * r - 0.012);
    d.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5, rand() * 6.28);
    d.scale.set(1 + rand() * 0.7, 1, 0.5 + rand() * 0.3);
  }, mat)));
  // scallion: green rings and a few pale ones from near the root
  const scGreen = new THREE.MeshStandardMaterial({ color: "#5fa83c", roughness: 0.45, side: THREE.DoubleSide });
  const scPale = new THREE.MeshStandardMaterial({ color: "#dfe9c2", roughness: 0.45, side: THREE.DoubleSide });
  const ring = (mat, n) => merged(n, () => { const r = 0.0025 + rand() * 0.0022; return new THREE.CylinderGeometry(r, r, 0.0022, 10, 1, true); }, d => {
    const a = rand() * 6.28, r = rand() * 0.085;
    d.position.set(Math.cos(a) * r, 0.066 + rand() * 0.006, Math.sin(a) * r);
    d.rotation.set((rand() - 0.5) * 0.7, 0, (rand() - 0.5) * 0.7);
  }, mat, { cast: false });
  g.add(ring(scGreen, 26), ring(scPale, 8));
  // cilantro leaves, and slivers of white onion
  const cilantro = new THREE.MeshStandardMaterial({ color: "#2f6a2a", roughness: 0.5, side: THREE.DoubleSide });
  g.add(merged(12, () => leafGeo(0.006 + rand() * 0.003, 0, { scallop: true }), d => {
    const a = rand() * 6.28, r = 0.02 + rand() * 0.065;
    d.position.set(Math.cos(a) * r, 0.07 + rand() * 0.003, Math.sin(a) * r);
    d.rotation.set((rand() - 0.5) * 0.5, rand() * 6.28, (rand() - 0.5) * 0.5);
  }, cilantro, { cast: false }));
  const onion = new THREE.MeshStandardMaterial({ color: "#f1efe6", roughness: 0.3, transparent: true, opacity: 0.85 });
  g.add(merged(6, () => new THREE.TorusGeometry(0.012, 0.0012, 3, 12, 1.6), d => {
    const a = rand() * 6.28, r = 0.03 + rand() * 0.04;
    d.position.set(Math.cos(a) * r, 0.067, Math.sin(a) * r);
    d.rotation.set(Math.PI / 2, 0, rand() * 6.28);
  }, onion, { cast: false }));
  // the soup spoon: a flat-bottomed ceramic bowl in the broth, its handle up on the rim
  const spoon = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: "#f4f1ea", roughness: 0.22, clearcoat: 0.6, side: THREE.DoubleSide }));
  cup.scale.set(1, 0.38, 1.35);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0045, 0.075), ceramic);
  handle.geometry.translate(0, 0, 0.0375);
  handle.position.set(0, 0.0, 0.026);
  handle.rotation.x = -0.5;
  spoon.add(cup, handle);
  spoon.position.set(-0.03, 0.076, 0.035); // floating, broth up to its lip
  spoon.rotation.y = 0.5;
  spoon.traverse(o => (o.castShadow = true));
  g.add(spoon);
  // green chopsticks laid across the rim
  const green = new THREE.MeshStandardMaterial({ color: "#2f8a5c", roughness: 0.3 });
  [0, 1].forEach(i => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0027, 0.0044, 0.25, 8), green);
    c.rotation.set(Math.PI / 2, 0, 0);
    c.rotation.y = -0.7 + i * 0.07;
    c.position.set(0.03 + i * 0.01, 0.097 + i * 0.005, -0.01);
    c.castShadow = true;
    g.add(c);
  });
  return g;
}

// ---------------------------------------------------------------- the table's other things
// bean sprouts, Thai basil, lime and chilli on a side plate
function herbPlate() {
  const g = new THREE.Group();
  const rand = seeded(431);
  const plate = new THREE.Mesh(lathe([[0, 0.002], [0.07, 0.002], [0.09, 0.008], [0.1, 0.014], [0.097, 0.015], [0.08, 0.009], [0, 0.007]], 40), new THREE.MeshPhysicalMaterial({ color: "#f3f0e8", roughness: 0.25, clearcoat: 0.5 }));
  plate.scale.set(1, 1, 0.8);
  plate.castShadow = plate.receiveShadow = true;
  g.add(plate);
  const sprout = new THREE.MeshStandardMaterial({ color: "#f1eedb", roughness: 0.4 });
  g.add(merged(38, () => {
    const a = rand() * 6.28, l = 0.04 + rand() * 0.025;
    const p0 = V(0, 0, 0), p1 = V(Math.cos(a) * l * 0.5, 0.004, Math.sin(a) * l * 0.5 + (rand() - 0.5) * 0.01), p2 = V(Math.cos(a) * l, 0.0, Math.sin(a) * l);
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p1, p2), 6, 0.0017, 4);
  }, d => d.position.set((rand() - 0.6) * 0.07, 0.012 + rand() * 0.012, (rand() - 0.5) * 0.05), sprout));
  const basil = new THREE.MeshStandardMaterial({ color: "#244f22", roughness: 0.35, side: THREE.DoubleSide });
  g.add(merged(12, () => leafGeo(0.03 + rand() * 0.012, 0.01), d => {
    d.position.set(0.025 + (rand() - 0.5) * 0.045, 0.024 + rand() * 0.012, (rand() - 0.5) * 0.045);
    d.rotation.set((rand() - 0.5) * 0.6, rand() * 6.28, (rand() - 0.5) * 0.6);
  }, basil));
  // the sprig's purple stem
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(0.0, 0.024, 0.0), V(0.03, 0.03, 0.01), V(0.06, 0.026, -0.005)), 8, 0.0018, 5), new THREE.MeshStandardMaterial({ color: "#5a3a4a", roughness: 0.5 })));
  const lime = new THREE.MeshStandardMaterial({ color: "#86b33a", roughness: 0.45 });
  const pulp = new THREE.MeshStandardMaterial({ color: "#d7e79a", roughness: 0.3, side: THREE.DoubleSide });
  [[-0.05, 0.03, 0.4], [-0.035, -0.035, 2.2]].forEach(([x, z, r]) => {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 8, 0, Math.PI / 2, 0, Math.PI / 2), lime));
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.024, 10, 0, Math.PI / 2), pulp);
    w.add(face);
    w.position.set(x, 0.012, z);
    w.rotation.set(-Math.PI / 2, 0, r);
    w.traverse(o => (o.castShadow = true));
    g.add(w);
  });
  const chilli = new THREE.MeshStandardMaterial({ color: "#3c7a26", roughness: 0.3 });
  g.add(merged(5, () => new THREE.TorusGeometry(0.008, 0.0028, 6, 12), d => {
    d.position.set(-0.02 + (rand() - 0.5) * 0.04, 0.016, 0.04 + (rand() - 0.5) * 0.02);
    d.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.4, 0, 0);
  }, chilli));
  return g;
}

// a label you recognise by its colours, not its words
function labelTexture() {
  const [c, ctx] = cv(256, 128);
  ctx.fillStyle = "#f4f1e8"; ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#2f7d3a"; ctx.fillRect(0, 8, 256, 6); ctx.fillRect(0, 114, 256, 6);
  ctx.filter = "blur(2px)";
  ctx.fillStyle = "#c62b1d"; ctx.beginPath(); ctx.ellipse(128, 58, 26, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(40,40,40,0.5)";
  [86, 96].forEach(y => ctx.fillRect(70, y, 116, 4));
  ctx.filter = "none";
  return tex(c);
}
function sauces() {
  const g = new THREE.Group();
  // the rooster-style hot sauce: tapered red bottle, green cap, white nozzle
  const hot = new THREE.Group();
  const red = new THREE.MeshPhysicalMaterial({ color: "#b8251a", roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.1 });
  hot.add(new THREE.Mesh(lathe([[0, 0], [0.028, 0], [0.031, 0.01], [0.031, 0.11], [0.026, 0.135], [0.014, 0.158], [0.012, 0.165], [0, 0.165]], 24), red));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0315, 0.0315, 0.07, 24, 1, true), new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: 0.5 }));
  label.position.y = 0.062;
  hot.add(label);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.03, 16), new THREE.MeshStandardMaterial({ color: "#2e8a3e", roughness: 0.35 }));
  cap.position.y = 0.18;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.016, 10), new THREE.MeshStandardMaterial({ color: "#f1efe9", roughness: 0.4 }));
  tip.position.y = 0.203;
  hot.add(cap, tip);
  hot.position.set(0, 0, -0.04);
  g.add(hot);
  // squeeze bottles: red chilli and dark hoisin, soft plastic with pointed caps
  const squeeze = (color, z) => {
    const b = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.3 });
    b.add(new THREE.Mesh(lathe([[0, 0], [0.024, 0], [0.026, 0.008], [0.026, 0.13], [0.022, 0.14], [0, 0.14]], 20), mat));
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 16), mat);
    c.position.y = 0.165;
    b.add(c);
    b.position.set(0.01, 0, z);
    return b;
  };
  g.add(squeeze("#c22d1e", 0.025), squeeze("#3b2214", 0.08));
  // chilli oil in a glass jar, a small spoon left in it
  const jar = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: "#e8f0ee", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 20, 1, true), glass);
  shell.position.y = 0.03;
  const oil = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.042, 20), new THREE.MeshStandardMaterial({ color: "#5a1006", roughness: 0.1 }));
  oil.position.y = 0.021;
  const spoonH = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.08, 0.003), new THREE.MeshStandardMaterial({ color: "#b5b2aa", metalness: 0.9, roughness: 0.3 }));
  spoonH.position.set(0.008, 0.06, 0);
  spoonH.rotation.z = -0.25;
  jar.add(shell, oil, spoonH);
  jar.position.set(0.075, 0, -0.06);
  g.add(jar);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function tableware() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: "#a7a9a6", metalness: 0.85, roughness: 0.3 });
  // a steel napkin dispenser
  const napkins = new THREE.Group();
  napkins.add(box(0.06, 0.1, 0.11, steel, 0, 0.05, 0));
  napkins.add(box(0.035, 0.012, 0.1, new THREE.MeshStandardMaterial({ color: "#f2efe8", roughness: 0.9 }), 0, 0.104, 0));
  napkins.position.set(0, 0, 0.0);
  g.add(napkins);
  // a steel cup of spare chopsticks and soup spoons
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.026, 0.1, 16, 1, true), new THREE.MeshStandardMaterial({ color: "#9a9b98", metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }));
  holder.position.set(0.01, 0.05, 0.1);
  g.add(holder);
  const sticks = new THREE.MeshStandardMaterial({ color: "#2f8a5c", roughness: 0.35 });
  g.add(merged(8, () => new THREE.CylinderGeometry(0.0028, 0.004, 0.24, 6), (d, i) => {
    d.position.set(0.01 + Math.cos(i) * 0.012, 0.12, 0.1 + Math.sin(i) * 0.012);
    d.rotation.set(Math.sin(i * 3) * 0.14, 0, Math.cos(i * 2) * 0.14);
  }, sticks));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// a tall glass of iced black tea with a straw, sweating
function condensation() {
  const [c, ctx] = cv(256, 256);
  const rand = seeded(441);
  for (let i = 0; i < 500; i++) {
    const x = rand() * 256, y = rand() * 256, r = 0.8 + rand() * 2.6;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.5})`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}
function icedDrink() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.029, 0.15, 28, 1, true), new THREE.MeshStandardMaterial({
    color: "#ffffff", roughness: 0.08, transparent: true, opacity: 0.32, alphaMap: condensation(), side: THREE.DoubleSide, depthWrite: false,
  }));
  glass.position.y = 0.075;
  const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.027, 0.115, 24), new THREE.MeshStandardMaterial({ color: "#3a1a0b", roughness: 0.08, transparent: true, opacity: 0.93 }));
  drink.position.y = 0.06;
  const ice = new THREE.MeshStandardMaterial({ color: "#e9eef0", roughness: 0.05, transparent: true, opacity: 0.55 });
  g.add(merged(4, () => new THREE.BoxGeometry(0.02, 0.018, 0.02), (d, i) => {
    d.position.set(Math.cos(i * 1.7) * 0.012, 0.112 + (i % 2) * 0.008, Math.sin(i * 1.7) * 0.012);
    d.rotation.set(i * 0.7, i * 1.1, i * 0.4);
  }, ice, { cast: false }));
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 8), new THREE.MeshStandardMaterial({ color: "#f3f1ec", roughness: 0.4 }));
  straw.position.set(0.012, 0.12, 0.0);
  straw.rotation.z = -0.16;
  const water = new THREE.Mesh(new THREE.RingGeometry(0.029, 0.04, 24), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.1, depthWrite: false }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.0015;
  g.add(drink, glass, straw, water);
  drink.castShadow = straw.castShadow = true;
  return g;
}

// ---------------------------------------------------------------- the kitchen hatch
// Frosted glass with the kitchen's warm light behind it. The cooks are only
// shapes: they cross, stop at the stove, bend, move on. Steam rolls up.
function kitchenGlass(rand) {
  const W = 256, H = 160;
  const [c, ctx] = cv(W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const cooks = [
    { x: 40, target: 40, wait: 1, y: 0, scale: 1.0 },
    { x: 200, target: 200, wait: 3, y: 0, scale: 0.85 },
  ];
  const puffs = Array.from({ length: 6 }, () => ({ x: rand() * W, y: rand() * H, r: 20 + rand() * 30, s: 6 + rand() * 8 }));
  let acc = 0;
  function draw(dt, still) {
    acc += dt;
    if (acc < 1 / 30) return 0; // redraw at 30 fps, it's behind frosted glass
    const step = acc; acc = 0;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#ffe1a8");
    g.addColorStop(0.55, "#f0a45a");
    g.addColorStop(1, "#b9642c");
    ctx.filter = "none";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // the tube light in there
    ctx.fillStyle = "rgba(255,250,235,0.6)";
    ctx.fillRect(30, 6, W - 60, 8);
    ctx.filter = "blur(9px)";
    let cover = 0;
    cooks.forEach(k => {
      if (!still) {
        k.wait -= step;
        if (k.wait <= 0 && Math.abs(k.target - k.x) < 1) { k.target = 20 + rand() * (W - 40); k.wait = 1.5 + rand() * 4; }
        k.x += Math.sign(k.target - k.x) * Math.min(Math.abs(k.target - k.x), step * 34);
        k.y = Math.abs(k.target - k.x) < 1 ? Math.sin(performance.now() / 600 + k.scale * 9) * 3 + 3 : 0; // working at the stove, bending a little
      }
      const s = k.scale;
      ctx.fillStyle = "rgba(48,26,14,0.72)";
      ctx.beginPath(); ctx.ellipse(k.x, 58 + k.y, 14 * s, 17 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(k.x, 140 + k.y, 40 * s, 66 * s, 0, 0, Math.PI * 2); ctx.fill();
      cover += Math.max(0, 1 - Math.abs(k.x - W / 2) / (W / 2)) * 0.5;
    });
    puffs.forEach(p => {
      if (!still) { p.y -= p.s * step; if (p.y < -p.r) { p.y = H + p.r; p.x = rand() * W; } }
      ctx.fillStyle = "rgba(255,240,220,0.22)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.filter = "none";
    // the frosting itself: fine grain
    for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    t.needsUpdate = true;
    return cover;
  }
  draw(1, true);
  return { texture: t, draw };
}

export function buildRestaurant(scene, content, { reducedMotion = false } = {}) {
  scene.background = new THREE.Color("#080605");
  const rand = seeded(451);

  // ---- room: window wall, tiled side wall painted jade above, floor, ceiling
  const tiles = new THREE.MeshStandardMaterial({ map: wallTiles(), roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ map: concrete("#2c2a27", 413), roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: "#2e2823", roughness: 0.45 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const frame = new THREE.MeshStandardMaterial({ color: "#2e3230", metalness: 0.4, roughness: 0.5 });
  scene.add(box(0.12, 0.9, 3.2, dark, -1.06, 0.45, 0));
  scene.add(box(0.12, 0.6, 3.2, dark, -1.06, 2.4, 0));
  scene.add(box(0.05, 1.22, 0.05, frame, -1.0, 1.5, -0.9, false));
  scene.add(box(0.05, 1.22, 0.05, frame, -1.0, 1.5, 0.9, false));
  scene.add(box(0.05, 0.05, 1.85, frame, -1.0, 0.9, 0, false));
  scene.add(box(0.05, 0.05, 1.85, frame, -1.0, 2.1, 0, false));
  const pane = rainWindow(1.8, 1.2, { brightness: 1.1, depth: 0.35, fog: 0.45, city: neonCity({ blur: 16, signs: 22 }) });
  pane.position.set(-1.02, 1.5, 0);
  pane.rotation.y = Math.PI / 2;
  scene.add(pane);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.25), tiles);
  side.position.set(0.5, 0.625, -1.2);
  side.receiveShadow = true;
  scene.add(side);
  const jade = new THREE.MeshStandardMaterial({ color: "#3f6b5c", roughness: 0.75 });
  const upper = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.55), jade);
  upper.position.set(0.5, 2.0, -1.2);
  scene.add(upper);
  scene.add(box(3.2, 0.03, 0.02, new THREE.MeshStandardMaterial({ color: "#8c2a20", roughness: 0.5 }), 0.5, 1.25, -1.19, false)); // a red dado rail
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ color: "#221f1b", roughness: 0.9 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0.5, 2.7, 0);
  scene.add(ceiling);

  // ---- the kitchen hatch in that wall, over the far booth
  const hatch = kitchenGlass(rand);
  const hatchX = -0.72, hatchY = 1.5;
  const hatchPane = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.48), new THREE.MeshBasicMaterial({ map: hatch.texture, color: new THREE.Color(1.15, 1.08, 1.0) }));
  hatchPane.position.set(hatchX, hatchY, -1.185);
  scene.add(hatchPane);
  const stainless = new THREE.MeshStandardMaterial({ color: "#b0b2ae", metalness: 0.85, roughness: 0.28 });
  scene.add(box(0.86, 0.035, 0.03, stainless, hatchX, hatchY + 0.258, -1.18, false));
  scene.add(box(0.86, 0.03, 0.12, stainless, hatchX, hatchY - 0.255, -1.14));   // the pass shelf
  [-1, 1].forEach(s => scene.add(box(0.035, 0.52, 0.03, stainless, hatchX + s * 0.41, hatchY, -1.18, false)));
  const hatchLight = new THREE.PointLight("#ffb167", 2.4, 2.6, 1.6);
  hatchLight.position.set(hatchX, hatchY, -0.95);
  scene.add(hatchLight);

  // ---- the table and the booths
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.03, 0.64, 2, 0.01), new THREE.MeshStandardMaterial({ map: formica(), roughness: 0.28 }));
  top.position.set(-0.55, TABLE_Y - 0.015, 0);
  top.receiveShadow = top.castShadow = true;
  scene.add(top);
  const trim = new THREE.MeshStandardMaterial({ color: "#a9aba7", metalness: 0.9, roughness: 0.3 });
  scene.add(box(0.93, 0.012, 0.012, trim, -0.55, TABLE_Y - 0.02, 0.325, false));
  scene.add(box(0.93, 0.012, 0.012, trim, -0.55, TABLE_Y - 0.02, -0.325, false));
  scene.add(box(0.06, TABLE_Y - 0.03, 0.06, trim, -0.5, (TABLE_Y - 0.03) / 2, 0));
  const seatMat = new THREE.MeshStandardMaterial({ map: vinyl(), roughness: 0.38 });
  [-1, 1].forEach(s => {
    const z = s * 0.66;
    scene.add(box(1.0, 0.1, 0.46, seatMat, -0.52, 0.45, z));
    scene.add(box(1.0, 0.55, 0.1, seatMat, -0.52, 0.8, z + s * 0.2));
    scene.add(box(1.0, 0.4, 0.44, dark, -0.52, 0.2, z));
  });

  // ---- on the table
  const bowl = pho();
  bowl.position.set(-0.6, TABLE_Y, 0.06);
  scene.add(bowl);
  const herbs = herbPlate();
  herbs.position.set(-0.8, TABLE_Y, 0.21);
  herbs.rotation.y = 0.5;
  scene.add(herbs);
  const sauce = sauces();
  sauce.position.set(-0.92, TABLE_Y, 0.0);
  scene.add(sauce);
  const ware = tableware();
  ware.position.set(-0.93, TABLE_Y, 0.16);
  scene.add(ware);
  const drink = icedDrink();
  drink.position.set(-0.4, TABLE_Y, -0.2);
  scene.add(drink);
  // the little dish of scallion oil
  const dish = new THREE.Group();
  dish.add(new THREE.Mesh(lathe([[0, 0.002], [0.03, 0.002], [0.04, 0.018], [0.037, 0.019], [0.028, 0.006], [0, 0.005]], 28), new THREE.MeshPhysicalMaterial({ color: "#f3f0e8", roughness: 0.25, clearcoat: 0.5 })));
  const [oc, ox] = cv(128, 128);
  ox.fillStyle = "#6e8c2a"; ox.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) { ox.fillStyle = rand() < 0.7 ? "#3f7a1e" : "#d9e38c"; ox.fillRect(rand() * 128, rand() * 128, 2 + rand() * 4, 2 + rand() * 3); }
  const oilTop = new THREE.Mesh(new THREE.CircleGeometry(0.031, 24), new THREE.MeshStandardMaterial({ map: tex(oc), roughness: 0.08 }));
  oilTop.rotation.x = -Math.PI / 2;
  oilTop.position.y = 0.012;
  dish.add(oilTop);
  dish.position.set(-0.53, TABLE_Y, -0.23);
  dish.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(dish);
  // steam lifting off the bowl
  const steamTex = steamTexture();
  const steam = [0, 1, 2, 3].map(i => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.32), new THREE.MeshBasicMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(m);
    return { m, phase: i / 4 };
  });

  // ---- the menu, propped against the window behind the sauces
  const menu = createMenu(content);
  scene.add(menu.group);
  const lean = 0.13;
  const standing = pose(-0.958, TABLE_Y + 0.15, -0.2, Math.PI / 2 - lean, Math.PI / 2, 0);
  standing.rotation.order = "YXZ";
  const menuHandle = makeHandle(menu.group, {
    home: standing,
    held: pose(-0.31, TABLE_Y + 0.001, 0.0, 0, 0, 0),
    lift: 0.06,
    duration: 1.1,
    // the binder opens on its way down to the table
    extra: k => menu.setOpen(k > 0.6),
  });
  menu.hits[0].userData.id = "magazine";
  menu.left.userData.id = "magazine:prev";
  menu.right.userData.id = "magazine:next";

  // ---- the wall clock and an oscillating fan
  const clock = new THREE.Group();
  clock.position.set(0.35, 2.0, -1.19);
  const faceC = document.createElement("canvas");
  faceC.width = faceC.height = 256;
  const fc = faceC.getContext("2d");
  fc.fillStyle = "#ece6d6"; fc.beginPath(); fc.arc(128, 128, 124, 0, Math.PI * 2); fc.fill();
  fc.fillStyle = "#2a2622";
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; fc.fillRect(126 + Math.sin(a) * 104, 124 - Math.cos(a) * 104, 5, 9); }
  const hand = (len, w, a) => { fc.save(); fc.translate(128, 128); fc.rotate(a); fc.fillRect(-w / 2, -len, w, len); fc.restore(); };
  hand(64, 8, (0.5 / 12) * Math.PI * 2);
  hand(96, 5, Math.PI);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.14, 32), new THREE.MeshStandardMaterial({ map: tex(faceC), roughness: 0.4 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.012, 8, 32), new THREE.MeshStandardMaterial({ color: "#8c2a20", roughness: 0.4 }));
  clock.add(clockFace, rim);
  scene.add(clock);
  const fan = new THREE.Group();
  fan.position.set(0.95, 2.25, -1.12);
  const fanMat = new THREE.MeshStandardMaterial({ color: "#c9c6bd", roughness: 0.5 });
  fan.add(box(0.06, 0.06, 0.12, fanMat, 0, 0, 0.0));
  const head = new THREE.Group();
  head.position.set(0, -0.04, 0.12);
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.006, 6, 32), fanMat);
  const blades = new THREE.Mesh(new THREE.CircleGeometry(0.11, 3), new THREE.MeshStandardMaterial({ color: "#9a968c", roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }));
  head.add(cage, blades);
  head.rotation.x = 0.35;
  fan.add(head);
  scene.add(fan);

  // ---- light: a warm pendant over the table, cool tubes behind, the street's colour outside
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#2f6a4e", roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }));
  shade.position.set(-0.55, 1.72, 0);
  scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffdca6").multiplyScalar(3) }));
  bulb.position.set(-0.55, 1.68, 0);
  scene.add(bulb);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.0, 6), new THREE.MeshBasicMaterial({ color: "#0b0b0b" }));
  cord.position.set(-0.55, 2.25, 0);
  scene.add(cord);
  const pendant = new THREE.SpotLight("#ffc283", 7, 3.5, 0.85, 0.65, 1.5);
  pendant.position.set(-0.55, 1.66, 0);
  pendant.target.position.set(-0.55, TABLE_Y, 0);
  pendant.castShadow = true;
  pendant.shadow.mapSize.set(2048, 2048);
  pendant.shadow.bias = -0.0003;
  pendant.shadow.radius = 4;
  scene.add(pendant, pendant.target);
  const room = new THREE.PointLight("#d4efe3", 3.2, 6, 1.5);  // tube light over the counter, behind us
  room.position.set(1.6, 2.4, 0.6);
  scene.add(room);
  const street = new THREE.SpotLight("#7fc9bb", 7, 6, 0.6, 1, 1.4);  // the street through the window
  street.position.set(-3, 2.4, 0.6);
  street.target.position.set(0, 0.8, -0.4);
  scene.add(street, street.target);
  // a red sign and a green one somewhere up the street, spilling in
  const neonRed = new THREE.SpotLight("#ff3a2a", 9, 6, 0.5, 0.9, 1.3);
  neonRed.position.set(-2.6, 2.6, -1.2);
  neonRed.target.position.set(-0.8, 0.9, 0.1);
  const neonGreen = new THREE.SpotLight("#38e08f", 4, 6, 0.45, 0.9, 1.3);
  neonGreen.position.set(-2.4, 1.7, 1.5);
  neonGreen.target.position.set(-0.6, 0.95, 0.5);
  scene.add(neonRed, neonRed.target, neonGreen, neonGreen.target);
  const car = new THREE.SpotLight("#fff1d8", 0, 7, 0.3, 0.9, 1.2);    // headlights passing outside
  car.position.set(-3.5, 1.2, -3);
  car.target.position.set(0.5, 1.2, -1.2);
  scene.add(car, car.target);
  scene.add(new THREE.HemisphereLight("#3a3128", "#0c0a08", 0.8));
  const attention = new THREE.SpotLight("#ffe7cc", 0, 3, 0.2, 1, 2);
  attention.position.set(0.3, 1.6, 0.5);
  scene.add(attention, attention.target);

  // ---- the menu is the one thing to pick up here
  const readShot = portrait => portrait
    ? { side: "reader", position: V(-0.31, TABLE_Y + 0.86, 0.2), target: V(-0.31, TABLE_Y, 0.06), fov: 62 }
    : { side: "reader", position: V(-0.31, TABLE_Y + 0.58, 0.28), target: V(-0.31, TABLE_Y, 0.05), fov: 40 };
  const menuArtifact = {
    id: "magazine", stop: "rest", hits: [menu.hits[0]], object: menu.group, handle: menuHandle,
    caption: "Open the menu",
    reader: menu,
    examine: readShot,
    leave: () => ({ position: V(-0.45, TABLE_Y + 0.34, 0.1), target: V(-0.6, TABLE_Y + 0.1, -0.05), fov: 38 }),
    onExamine: () => {},
    release: () => {},
    panel: () => ({}),
  };
  const artifacts = [menuArtifact];
  artifacts.forEach(a => { a.focus = new THREE.Vector3(); });

  let carT = 4, buzz = 0;
  const restFocusPoint = V(-0.6, TABLE_Y + 0.06, 0.0);
  return {
    artifacts,
    magazine: menu,
    shots: {
      rest: { position: V(0.62, 1.32, 0.44), target: V(-0.62, 1.0, -0.2), fov: 40 },
      restPortrait: { position: V(0.72, 1.42, 0.3), target: V(-0.6, 0.84, -0.08), fov: 54 },
    },
    // leaving: lift to the rain on the window, the shot the apartment opens on
    exitShot: () => ({ position: V(-0.55, 1.5, 0.05), target: V(-1.05, 1.55, 0.0), fov: 34 }),
    restFocus: () => restFocusPoint,
    dof: { rest: 0.012, examine: 0.03 },
    lights: { attention },
    update(t, dt, held) {
      menuHandle.update(dt, held === menuArtifact, reducedMotion);
      menu.group.updateMatrixWorld();
      menuArtifact.focus.setFromMatrixPosition(menu.group.matrixWorld);
      menu.update(dt);
      pane.userData.tick(t);
      steam.forEach(s => {
        const k = (t * 0.18 + s.phase) % 1;
        s.m.position.set(-0.6 + Math.sin(k * 6 + s.phase * 9) * 0.02, TABLE_Y + 0.13 + k * 0.32, 0.06);
        s.m.material.opacity = reducedMotion ? 0.05 : Math.sin(k * Math.PI) * 0.1;
        s.m.scale.setScalar(0.7 + k * 0.8);
        s.m.lookAt(0.62, 1.32, 0.44);
      });
      // the kitchen: someone crossing in front of the light dims it a little
      const cover = hatch.draw(dt, reducedMotion);
      if (cover) hatchLight.intensity = 2.6 - cover * 0.9;
      if (!reducedMotion) {
        fan.rotation.y = Math.sin(t * 0.35) * 0.7;
        blades.rotation.z = t * 25;
        carT -= dt;
        if (carT < 0) carT = 9 + Math.random() * 8;
        const k = carT < 1.4 ? 1 - carT / 1.4 : -1;
        car.intensity = k >= 0 ? Math.sin(k * Math.PI) * 14 : 0;
        if (k >= 0) car.target.position.set(1.6 - k * 2.6, 1.3, -1.2);
        // the red sign has an old transformer: a faint hum in its light
        buzz += dt;
        neonRed.intensity = 9 * (0.93 + Math.sin(t * 2.1) * 0.03 + (Math.sin(buzz * 47) > 0.985 ? -0.25 : 0));
      }
    },
  };
}
