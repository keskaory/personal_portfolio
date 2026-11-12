// Selected Work, 12:30 am. A narrow noodle shop: a formica table running
// to a rain-streaked window, booth seats either side. On the table a bowl of
// chicken pho with green chopsticks across it, a plate of herbs, the sauces,
// an iced drink, and the menu propped against the glass. Behind the far
// booth, the kitchen hatch: frosted glass, warm light, the cooks' shapes
// moving behind it. Outside, sign light from the street, red and green.
// The menu holds the projects and experience.
// Leaving: the camera lifts off the table to the window as a car passes (the match cut).
//
// Coordinates: meters; the floor at y = 0, the table top at y = 0.74, the
// window wall at x = -1.0, the camera looking toward -x.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rainWindow } from "../objects/rain-window.js";
import { windowShot } from "../core/portal.js";
import { buildStreet } from "./street.js";
import { concrete, neonCity } from "../objects/station-textures.js";
import { createMenu } from "../objects/menu.js";
import { makeHandle, pose } from "../core/handling.js";
import { seeded } from "../objects/textures.js";
import { contactShadow, roughnessMap } from "../objects/surface.js";

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
// buttoned vinyl: a grid of tufts with creases pulling toward them, wear on the high spots
function tufted() {
  const [c, ctx] = cv(512, 256);
  const rand = seeded(407);
  ctx.fillStyle = "#7d2b21";
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(0,0,0,${rand() * 0.08})`; ctx.fillRect(rand() * 512, rand() * 256, 1, 1); }
  const pts = [];
  for (let y = 48; y < 256; y += 80) for (let x = 40 + ((y / 80) % 2) * 50; x < 512; x += 100) pts.push([x, y]);
  pts.forEach(([x, y]) => {
    const g = ctx.createRadialGradient(x, y, 2, x, y, 46);
    g.addColorStop(0, "rgba(0,0,0,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - 46, y - 46, 92, 92);
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 34, y + Math.sin(a) * 30); ctx.stroke(); }
    ctx.fillStyle = "#4a1712"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  });
  // worn, paler patches where people sit and lean
  for (let i = 0; i < 6; i++) {
    const x = rand() * 512, y = rand() * 256, r = 30 + rand() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,210,190,0.12)"); g.addColorStop(1, "rgba(255,210,190,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c, [1, 1]);
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
  g.addColorStop(0, "#b8894c"); // a clear beef broth: amber-brown, not orange
  g.addColorStop(0.7, "#946630");
  g.addColorStop(1, "#5e3f1a");
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
  // the broth has a body: dark amber down in the bowl, the noodle nest in it, a clearer
  // layer above, then the surface with its fat beads and a thin bright meniscus at the wall
  const body = new THREE.Mesh(lathe([[0.0, 0.021], [0.04, 0.022], [0.07, 0.034], [0.094, 0.06], [0.0965, 0.0635], [0.0, 0.0635]], 40), new THREE.MeshStandardMaterial({ color: "#4a2a0c", roughness: 0.5 }));
  g.add(body);
  const under = new THREE.Mesh(new THREE.CircleGeometry(0.085, 40), new THREE.MeshStandardMaterial({ map: submergedNoodles(), roughness: 0.6, transparent: true, opacity: 0.9 }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = 0.048;
  g.add(under);
  const mid = new THREE.Mesh(new THREE.CircleGeometry(0.093, 40), new THREE.MeshStandardMaterial({ color: "#86602f", transparent: true, opacity: 0.35, roughness: 0.3, depthWrite: false }));
  mid.rotation.x = -Math.PI / 2;
  mid.position.y = 0.056;
  g.add(mid);
  const broth = new THREE.Mesh(new THREE.CircleGeometry(0.0968, 48), new THREE.MeshStandardMaterial({ map: brothTexture(), transparent: true, opacity: 0.66, roughness: 0.12, envMapIntensity: 0.6, depthWrite: false }));
  broth.rotation.x = -Math.PI / 2;
  broth.position.y = 0.064;
  g.add(broth);
  const meniscus = new THREE.Mesh(new THREE.TorusGeometry(0.0966, 0.0016, 6, 64), new THREE.MeshStandardMaterial({ color: "#e0b065", roughness: 0.15 }));
  meniscus.rotation.x = Math.PI / 2;
  meniscus.position.y = 0.064;
  g.add(meniscus);
  // rice noodles lifting out of it in a loose heap
  const noodle = new THREE.MeshStandardMaterial({ color: "#efe7d6", roughness: 0.34 });
  g.add(merged(52, () => {
    const pts = [];
    let a = rand() * 6.28, r = 0.015 + rand() * 0.05;
    for (let k = 0; k < 7; k++) {
      a += 0.45 + rand() * 0.5;
      r = Math.min(0.082, Math.max(0.008, r + (rand() - 0.5) * 0.025));
      pts.push(V(Math.cos(a) * r - 0.012, 0.059 + Math.sin(k * 1.3 + rand()) * 0.006 + (k > 1 && k < 5 ? 0.005 : 0), Math.sin(a) * r + 0.01)); // some loops dip under the surface
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.00125, 4);
  }, () => {}, noodle, { cast: false }));
  // the beef. Rare slices laid on top, cut paper-thin: pink in the middle, already greying at
  // the edges where the hot broth has cooked them, rippled as they relax. Brisket underneath them,
  // in strips with a band of pale fat. Two beef balls, halved.
  const [rc, rx] = cv(128, 128);
  const rg = rx.createRadialGradient(64, 60, 6, 64, 64, 64);
  rg.addColorStop(0, "#b9564a"); rg.addColorStop(0.4, "#a65a4e"); rg.addColorStop(0.72, "#7f6052"); rg.addColorStop(1, "#665044");
  rx.fillStyle = rg; rx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) { rx.strokeStyle = `rgba(${rand() < 0.5 ? "240,200,190" : "90,40,35"},${0.12 + rand() * 0.15})`; rx.lineWidth = 1; rx.beginPath(); const y = rand() * 128; rx.moveTo(0, y); rx.bezierCurveTo(40, y + (rand() - 0.5) * 20, 90, y + (rand() - 0.5) * 20, 128, y + (rand() - 0.5) * 10); rx.stroke(); } // the grain
  const rareTex = tex(rc);
  const rare = new THREE.MeshStandardMaterial({ map: rareTex, roughness: 0.42, side: THREE.DoubleSide });
  g.add(merged(7, () => {
    const geo = new THREE.CircleGeometry(0.026, 18);
    const p = geo.attributes.position;
    const k = rand() * 6.28;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y);
      const a = Math.atan2(y, x);
      const edge = 1 + 0.12 * Math.sin(a * 3 + k) + 0.06 * Math.sin(a * 7 + k * 2); // an uneven, hand-cut outline
      p.setX(i, x * edge * 1.25); p.setY(i, y * edge * 0.8);
      p.setZ(i, Math.sin(x * 160 + k) * 0.0022 + r * r * 4.0); // rippled, the edges curling up
    }
    geo.computeVertexNormals();
    return geo;
  }, d => {
    const a = rand() * 6.28, r = 0.015 + rand() * 0.045;
    d.position.set(Math.cos(a) * r + 0.008, 0.0665 + rand() * 0.004, Math.sin(a) * r - 0.006);
    d.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.25, (rand() - 0.5) * 0.25, rand() * 6.28);
  }, rare, { cast: false }));
  const [bc, bx2] = cv(64, 32);
  bx2.fillStyle = "#7a5a46"; bx2.fillRect(0, 0, 64, 32);
  bx2.fillStyle = "#e8dcc4"; bx2.fillRect(0, 0, 64, 7);          // the fat
  bx2.fillStyle = "rgba(255,240,220,0.35)"; bx2.fillRect(0, 7, 64, 2);
  for (let i = 0; i < 40; i++) { bx2.fillStyle = `rgba(40,25,15,${rand() * 0.25})`; bx2.fillRect(rand() * 64, 9 + rand() * 23, 6 + rand() * 12, 1); }
  const brisket = new THREE.MeshStandardMaterial({ map: tex(bc), roughness: 0.5 });
  g.add(merged(4, () => rough(new THREE.BoxGeometry(0.042, 0.0045, 0.017, 6, 1, 2), 0.0009, rand), d => {
    const a = rand() * 6.28, r = 0.02 + rand() * 0.04;
    d.position.set(Math.cos(a) * r - 0.01, 0.0625, Math.sin(a) * r + 0.01);
    d.rotation.set((rand() - 0.5) * 0.3, rand() * 6.28, (rand() - 0.5) * 0.2);
  }, brisket, { cast: false }));
  const ballOut = new THREE.MeshStandardMaterial({ color: "#6e5446", roughness: 0.6 });
  const ballCut = new THREE.MeshStandardMaterial({ color: "#a08670", roughness: 0.75 });
  [[-0.045, -0.035, 0.4], [-0.058, 0.0, 2.1]].forEach(([x, z, ry]) => {
    const half = new THREE.Group();
    half.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), ballOut));
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.012, 14), ballCut);
    face.rotation.x = Math.PI / 2; half.add(face);
    half.rotation.set(Math.PI - 0.3, ry, 0); // the dome down in the broth, the cut face up, tipped toward you
    half.position.set(x, 0.0675, z);
    g.add(half);
  });
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
  // a few slices of fresh red chilli
  const chilliRed = new THREE.MeshStandardMaterial({ color: "#d4241a", roughness: 0.28, side: THREE.DoubleSide });
  g.add(merged(6, () => new THREE.CylinderGeometry(0.0055, 0.0055, 0.0025, 12, 1, true), d => {
    const a = rand() * 6.28, r = 0.02 + rand() * 0.06;
    d.position.set(Math.cos(a) * r, 0.069, Math.sin(a) * r);
    d.rotation.set((rand() - 0.5) * 0.4, 0, (rand() - 0.5) * 0.4);
  }, chilliRed, { cast: false }));
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
    c.position.set(0.012 + i * 0.012, 0.0995 + i * 0.0055, -0.004); // lying on the rim, across the middle
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
  // A steel wire caddy with two rows: the hot sauce and the red squeeze bottle at the
  // back, the hoisin and the chilli oil at the front, the carrying handle between the rows.
  const g = new THREE.Group();
  const B = 0.006; // the caddy's floor
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
  hot.position.set(-0.042, B, -0.036);
  hot.rotation.y = 0.5; // label turned a little toward the room
  g.add(hot);
  const squeeze = (color, x, z) => {
    const b = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.3 });
    b.add(new THREE.Mesh(lathe([[0, 0], [0.024, 0], [0.026, 0.008], [0.026, 0.13], [0.022, 0.14], [0, 0.14]], 20), mat));
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 16), mat);
    c.position.y = 0.165;
    b.add(c);
    b.position.set(x, B, z);
    return b;
  };
  g.add(squeeze("#c22d1e", -0.042, 0.036), squeeze("#3b2214", 0.05, -0.036));
  // chilli oil in a glass jar with its lid on, a small spoon beside it in the rack
  const jar = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: "#e8f0ee", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 20, 1, true), glass);
  shell.position.y = 0.03;
  const oil = new THREE.Mesh(new THREE.CylinderGeometry(0.0245, 0.0245, 0.045, 20), new THREE.MeshStandardMaterial({ color: "#5a1006", roughness: 0.1 }));
  oil.position.y = 0.0235;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.0275, 0.0275, 0.012, 20), new THREE.MeshStandardMaterial({ color: "#c7c9c5", metalness: 0.9, roughness: 0.3 }));
  lid.position.y = 0.066;
  jar.add(oil, shell, lid);
  jar.position.set(0.05, B, 0.036);
  g.add(jar);
  // the rack: floor, corner posts, rails all round at mid height, the handle between the rows
  const wire = new THREE.MeshStandardMaterial({ color: "#b8bab6", metalness: 0.9, roughness: 0.3 });
  const W = 0.19, D = 0.16, R = 0.075;
  g.add(box(W, 0.006, D, wire, 0.004, 0.003, 0));
  [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]].forEach(([x, z]) => g.add(box(0.005, R, 0.005, wire, 0.004 + x, R / 2, z)));
  [-W / 2, W / 2].forEach(x => g.add(box(0.004, 0.004, D, wire, 0.004 + x, R, 0)));
  [-D / 2, D / 2].forEach(z => g.add(box(W, 0.004, 0.004, wire, 0.004, R, z)));
  [-D / 2, D / 2].forEach(z => g.add(box(0.004, 0.2, 0.004, wire, 0.004, 0.1, z))); // the handle's uprights, in the gap between the rows
  g.add(box(0.004, 0.004, D, wire, 0.004, 0.2, 0));                                  // and its grip
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
  napkins.position.set(0, 0, -0.02);
  g.add(napkins);
  // a steel cup of spare chopsticks and soup spoons
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.026, 0.1, 16, 1, true), new THREE.MeshStandardMaterial({ color: "#9a9b98", metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }));
  holder.position.set(0.01, 0.05, 0.1);
  holder.material.side = THREE.DoubleSide;
  g.add(holder);
  const sticks = new THREE.MeshStandardMaterial({ color: "#2f8a5c", roughness: 0.35 });
  // standing in the cup from the bottom, each leaning a little out against the rim
  g.add(merged(9, () => { const c = new THREE.CylinderGeometry(0.0026, 0.0038, 0.235, 6); c.translate(0, 0.1175, 0); return c; }, (d, i) => {
    const a = i * 2.4, r = 0.009 + (i % 3) * 0.004;
    d.position.set(0.01 + Math.cos(a) * r, 0.004, 0.1 + Math.sin(a) * r);
    d.rotation.set(Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09);
  }, sticks));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Hong Kong milk tea: a heavy, thick-walled white cup on its saucer; the tea opaque and
// creamy, a rich tea-brown, a paler ring where it meets the porcelain; a spoon on the saucer
function milkTeaTexture() {
  const [c, ctx] = cv(256, 256);
  const g = ctx.createRadialGradient(118, 112, 8, 128, 128, 128);
  g.addColorStop(0, "#b98250"); g.addColorStop(0.75, "#a9723f"); g.addColorStop(1, "#946033");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  // the faint skin and swirl of evaporated milk
  ctx.strokeStyle = "rgba(225,190,150,0.18)"; ctx.lineWidth = 5;
  for (let r = 24; r < 110; r += 18) { ctx.beginPath(); ctx.arc(128, 128, r, 0.4 + r * 0.03, 2.2 + r * 0.03); ctx.stroke(); }
  ctx.strokeStyle = "rgba(235,205,170,0.55)"; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(128, 128, 123, 0, Math.PI * 2); ctx.stroke();
  return tex(c);
}
function milkTea() {
  const g = new THREE.Group();
  const porcelain = new THREE.MeshPhysicalMaterial({ color: "#f5f2ec", roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2, sheen: 0.2, side: THREE.DoubleSide });
  const saucer = new THREE.Mesh(lathe([[0, 0.002], [0.045, 0.002], [0.07, 0.009], [0.078, 0.015], [0.075, 0.016], [0.06, 0.011], [0.032, 0.008], [0, 0.008]], 40), porcelain);
  // a heavy cup: a thick lip, the walls flaring a little toward it
  const cup = new THREE.Mesh(lathe([[0, 0.009], [0.03, 0.009], [0.033, 0.014], [0.042, 0.04], [0.046, 0.066], [0.0485, 0.071], [0.045, 0.074], [0.041, 0.07], [0.038, 0.045], [0.028, 0.02], [0, 0.018]], 48), porcelain);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0055, 10, 20, Math.PI * 1.3), porcelain);
  handle.position.set(0.055, 0.045, 0);
  handle.rotation.z = -Math.PI * 0.65;
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.0405, 32), new THREE.MeshStandardMaterial({ map: milkTeaTexture(), roughness: 0.3, envMapIntensity: 0.5 }));
  tea.rotation.x = -Math.PI / 2;
  tea.position.y = 0.064;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0405, 0.0012, 6, 40), new THREE.MeshStandardMaterial({ color: "#d4ac80", roughness: 0.25 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.064;
  const steel = new THREE.MeshStandardMaterial({ color: "#c4c6c2", metalness: 0.95, roughness: 0.2 });
  const spoon = new THREE.Group();
  const bowlS = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), steel);
  bowlS.scale.set(1, 0.3, 1.5);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.002, 0.075), steel);
  stem.position.set(0, 0.003, 0.05);
  spoon.add(bowlS, stem);
  spoon.position.set(-0.03, 0.02, 0.04);
  spoon.rotation.y = 0.6;
  [saucer, cup, handle].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
  g.add(tea, rim);
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
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: "#2e2823", roughness: 0.5, roughnessMap: roughnessMap(431, { wear: 0.9, repeat: [3, 3] }) }));
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
  // at night the glass gives back a dim reflection of the lit room
  const pane = rainWindow(1.8, 1.2, { brightness: 1.1, depth: 0.35, fog: 0.45, city: neonCity({ blur: 16, signs: 22 }), reflect: 0.55, tubes: { y: 9, d: [1, 2] } });
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
  // the room's far end, behind where you sit: never in your own view, but seen from the street
  // through the window, so the room carries on in there rather than stopping in the dark
  const backTiles = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.25), tiles);
  backTiles.position.set(2.1, 0.625, 0.4); backTiles.rotation.y = -Math.PI / 2;
  const backJade = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.45), jade);
  backJade.position.set(2.1, 1.975, 0.4); backJade.rotation.y = -Math.PI / 2;
  scene.add(backTiles, backJade, box(0.02, 0.03, 3.2, new THREE.MeshStandardMaterial({ color: "#8c2a20", roughness: 0.5 }), 2.09, 1.25, 0.4, false));
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
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.03, 0.64, 2, 0.01), new THREE.MeshStandardMaterial({ map: formica(), roughness: 0.36, roughnessMap: roughnessMap(433, { wear: 1 }) })); // wiped smooth where plates go
  top.position.set(-0.55, TABLE_Y - 0.015, 0);
  top.receiveShadow = top.castShadow = true;
  scene.add(top);
  const trim = new THREE.MeshStandardMaterial({ color: "#a9aba7", metalness: 0.9, roughness: 0.3 });
  scene.add(box(0.93, 0.012, 0.012, trim, -0.55, TABLE_Y - 0.02, 0.325, false));
  scene.add(box(0.93, 0.012, 0.012, trim, -0.55, TABLE_Y - 0.02, -0.325, false));
  scene.add(box(0.06, TABLE_Y - 0.03, 0.06, trim, -0.5, (TABLE_Y - 0.03) / 2, 0));
  const seatMat = new THREE.MeshPhysicalMaterial({ map: tufted(), roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const piping = new THREE.MeshStandardMaterial({ color: "#5e1d16", roughness: 0.4 });
  // A cushion that has been sat on: rounded, its top sinking in the middle where people sit,
  // its face bellied out a little, never quite flat anywhere.
  const cushion = (w, h, d, { sag = 0, belly = 0, faceSign = 1, seed = 1 }) => {
    const g = new RoundedBoxGeometry(w, h, d, 5, Math.min(h, d) * 0.38);
    const p = g.attributes.position;
    const rnd = seeded(seed);
    const bumps = Array.from({ length: 4 }, () => [(rnd() - 0.5) * w, rnd() * 0.006]);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const across = Math.cos((x / (w / 2)) * Math.PI / 2); // 1 in the middle, 0 at the ends
      if (y > 0) p.setY(i, y - sag * across * across * (1 - Math.abs(z) / (d / 2) * 0.5));
      if (z * faceSign > 0) p.setZ(i, z + faceSign * belly * across * Math.cos((y / (h / 2)) * Math.PI / 2));
      let lump = 0;
      bumps.forEach(([bx, a]) => (lump += a * Math.exp(-((x - bx) ** 2) / 0.01)));
      if (y > 0) p.setY(i, p.getY(i) - lump);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, seatMat);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const creaseC = document.createElement("canvas"); creaseC.width = 8; creaseC.height = 64;
  const cx = creaseC.getContext("2d"); const cg = cx.createLinearGradient(0, 0, 0, 64);
  cg.addColorStop(0, "rgba(0,0,0,0)"); cg.addColorStop(0.5, "rgba(0,0,0,0.75)"); cg.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = cg; cx.fillRect(0, 0, 8, 64);
  const creaseTex = new THREE.CanvasTexture(creaseC);
  [-1, 1].forEach(s => {
    const z = s * 0.66;
    [-0.27, 0.27].forEach((dx, k) => {
      // seat cushion: its face toward the table (-s)
      const seat = cushion(0.53, 0.14, 0.48, { sag: 0.022, belly: 0.012, faceSign: -s, seed: 31 + k + (s > 0 ? 10 : 0) });
      seat.position.set(-0.52 + dx, 0.46, z);
      // back cushion: raked back, bellied toward the table
      const back = cushion(0.53, 0.56, 0.15, { belly: 0.022, faceSign: -s, seed: 51 + k + (s > 0 ? 10 : 0) });
      back.position.set(-0.52 + dx, 0.84, z + s * 0.205);
      back.rotation.x = s * 0.1;
      // the far booth's window-end seat was re-covered at some point: the same red vinyl, a
      // shade newer and glossier than the others, which have faded together
      if (s < 0 && k === 0) {
        const newer = seatMat.clone(); newer.color = new THREE.Color(1.07, 0.98, 0.96); newer.roughness = 0.4;
        seat.material = newer;
      }
      scene.add(seat, back);
    });
    // the dark crease where seat meets back, and under the seat's front edge
    const crease = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.12), new THREE.MeshBasicMaterial({ map: creaseTex, transparent: true, opacity: 0.8, depthWrite: false }));
    crease.position.set(-0.52, 0.55, z + s * 0.14);
    crease.rotation.x = -s * 0.9;
    scene.add(crease);
    const pipeSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.06, 8), piping);
    pipeSeat.rotation.z = Math.PI / 2;
    pipeSeat.position.set(-0.52, 0.505, z - s * 0.245);
    scene.add(pipeSeat);
    scene.add(box(1.06, 0.4, 0.44, dark, -0.52, 0.2, z));
    scene.add(contactShadow(-0.52, 0, z, 1.06, 0.48, { opacity: 0.8 }));
    // the floor in shadow under the front of the seat
    const under = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.3), new THREE.MeshBasicMaterial({ map: creaseTex, transparent: true, opacity: 0.6, depthWrite: false }));
    under.rotation.x = -Math.PI / 2;
    under.position.set(-0.52, 0.003, z - s * 0.24);
    scene.add(under);
  });

  // ---- on the table
  const bowl = pho();
  bowl.position.set(-0.58, TABLE_Y, 0.04);
  scene.add(bowl);
  const herbs = herbPlate();
  herbs.position.set(-0.75, TABLE_Y, 0.235);
  herbs.rotation.y = 0.5;
  scene.add(herbs);
  const sauce = sauces();
  sauce.position.set(-0.87, TABLE_Y, -0.2);
  sauce.rotation.y = Math.PI / 2;
  scene.add(sauce);
  const ware = tableware();
  ware.position.set(-0.95, TABLE_Y, 0.12);
  scene.add(ware);
  const tea = milkTea();
  tea.position.set(-0.41, TABLE_Y, -0.15);
  tea.rotation.y = -0.5;
  scene.add(tea);
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
  dish.position.set(-0.64, TABLE_Y, -0.205);
  dish.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(dish);
  // soft contact shadows where things sit on the formica
  const blotC = document.createElement("canvas"); blotC.width = blotC.height = 64;
  const bx = blotC.getContext("2d"); const bg = bx.createRadialGradient(32, 32, 4, 32, 32, 32);
  bg.addColorStop(0, "rgba(0,0,0,0.55)"); bg.addColorStop(0.6, "rgba(0,0,0,0.25)"); bg.addColorStop(1, "rgba(0,0,0,0)");
  bx.fillStyle = bg; bx.fillRect(0, 0, 64, 64);
  const blotTex = new THREE.CanvasTexture(blotC);
  const blot = (x, z, w, d, o = 0.8) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blotTex, transparent: true, opacity: o, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, TABLE_Y + 0.001, z);
    scene.add(m);
    return m;
  };
  // an old cup ring that never quite came out of the formica
  const [ringC, ringX] = cv(64, 64);
  ringX.strokeStyle = "rgba(95,60,25,0.28)"; ringX.lineWidth = 3; ringX.beginPath(); ringX.arc(32, 32, 24, 0.3, 5.9); ringX.stroke();
  ringX.strokeStyle = "rgba(95,60,25,0.12)"; ringX.lineWidth = 6; ringX.beginPath(); ringX.arc(33, 31, 22, 2.0, 4.2); ringX.stroke();
  const cupRing = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.085), new THREE.MeshBasicMaterial({ map: tex(ringC), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
  cupRing.rotation.x = -Math.PI / 2; cupRing.rotation.z = 0.8;
  cupRing.position.set(-0.19, TABLE_Y + 0.0012, -0.24); // clear of the menu and the saucer
  scene.add(cupRing);
  blot(-0.58, 0.04, 0.2, 0.2);        // the bowl's foot
  blot(-0.41, -0.15, 0.17, 0.17, 0.6); // the saucer
  blot(-0.87, -0.2, 0.24, 0.27);      // the caddy
  blot(-0.75, 0.235, 0.22, 0.19, 0.5);
  blot(-0.64, -0.205, 0.1, 0.1, 0.6);
  blot(-0.95, 0.12, 0.12, 0.3, 0.7);  // napkins and chopstick cup

  // steam lifting off the bowl
  const steamTex = steamTexture();
  const steam = [0, 1, 2, 3].map(i => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.32), new THREE.MeshBasicMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(m);
    return { m, phase: i / 4 };
  });

  // ---- the menu, lying closed at the near end of the table, away from the food
  const menu = createMenu(content);
  scene.add(menu.group);
  // lying on the formica, turned so its cover reads the right way up from where you stand
  const resting = pose(-0.3, TABLE_Y, 0.15, 0, 0.97, 0); // set down at an angle, its nearest corner 3 cm from the bowl
  const menuShadow = blot(-0.3, 0.15, 0.36, 0.36, 0.5);
  // held up in front of you, facing you, tipped back a little as a menu is when you read it
  const tilt = 0.16;
  const heldBasis = new THREE.Matrix4().makeBasis(V(0, 0, -1), V(Math.cos(tilt), Math.sin(tilt), 0), V(Math.sin(tilt), -Math.cos(tilt), 0));
  const held = { position: V(-0.3, 1.1, 0.0), rotation: new THREE.Euler().setFromRotationMatrix(heldBasis) };
  // Picked up the way a hand takes it: the far edge tips up off the formica, hinged on the near
  // edge, then it lifts clear and turns to you, the tip easing out as it goes. Put down, it
  // comes back to the table and the far edge settles last.
  const LEAD = 0.22, TIP = 0.32;
  let pickTip = 0;
  const menuHandle = makeHandle(menu.group, {
    home: resting,
    held,
    lift: 0.1, // straight up off the table first, then toward you; the food is never in its path
    duration: 1.4,
    lead: LEAD,
    extra: (k, p) => {
      const up = THREE.MathUtils.smoothstep(p, 0, LEAD);       // tipping up, in place
      const out = 1 - THREE.MathUtils.smoothstep(k, 0.05, 0.55); // easing flat again in the air
      pickTip = TIP * up * out;
      menu.setOpen(k > 0.72); // it opens as it reaches you
    },
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
  // the scene's key: a tight warm pool on the table, the room falling off around it
  const pendant = new THREE.SpotLight("#ffc283", 9.5, 3.5, 0.72, 0.6, 1.6);
  pendant.position.set(-0.55, 1.66, 0);
  pendant.target.position.set(-0.55, TABLE_Y, 0);
  pendant.castShadow = true;
  pendant.shadow.mapSize.set(2048, 2048);
  pendant.shadow.bias = -0.0003;
  pendant.shadow.radius = 4;
  scene.add(pendant, pendant.target);
  const room = new THREE.PointLight("#d4efe3", 1.6, 6, 1.6);  // tube light over the counter, behind us: a cool rim, not a fill
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
  scene.add(new THREE.HemisphereLight("#3a3128", "#0c0a08", 0.38));
  const attention = new THREE.SpotLight("#ffe7cc", 0, 3, 0.2, 1, 2);
  attention.position.set(0.3, 1.6, 0.5);
  scene.add(attention, attention.target);

  // ---- the menu is the one thing to pick up here
  // reading: you, the menu in front of you, the table soft behind it
  const readShot = portrait => portrait
    ? { side: "reader", position: V(0.62, 1.08, 0.0), target: V(-0.3, 1.06, 0.0), fov: 62 }
    : { side: "reader", position: V(0.5, 1.1, 0.0), target: V(-0.3, 1.075, 0.0), fov: 38 };
  const menuArtifact = {
    id: "magazine", stop: "rest", hits: [menu.hits[0]], object: menu.group, handle: menuHandle,
    caption: "Browse my work",
    reader: menu,
    examine: readShot,
    leave: () => ({ position: V(0.2, 1.15, 0.12), target: V(-0.7, 0.98, -0.14), fov: 40 }),
    onExamine: () => {},
    release: () => {},
    panel: () => ({}),
  };
  const artifacts = [menuArtifact];
  artifacts.forEach(a => { a.focus = new THREE.Vector3(); });

  // the street outside, for arriving and leaving
  const outside = buildStreet(scene, { reducedMotion });

  let carT = 4, hoverTip = 0;
  const restFocusPoint = V(-0.6, TABLE_Y + 0.06, 0.0);
  return {
    artifacts,
    magazine: menu,
    shots: {
      rest: { position: V(0.62, 1.34, 0.44), target: V(-0.62, 0.93, -0.18), fov: 40 },
      restPortrait: { position: V(0.72, 1.42, 0.3), target: V(-0.6, 0.84, -0.08), fov: 54 },
    },
    // scene changes pass through the window: arriving, the cut lands square on it and the camera
    // comes down onto the table; leaving, it lifts off the table back to it
    portal: portrait => ({ ...windowShot(V(-1.02, 1.5, 0), V(1, 0, 0), 1.2, portrait), light: "headlights" }),
    // leaving: a car's headlights pass outside just as you reach the glass
    exitCue(seconds) { if (!reducedMotion) carT = seconds + 0.7; },
    // seen from outside, across the street: the shot that establishes the place
    // seen from across the street, arriving or leaving: a car goes by. Once inside, the same
    // car's light carries on across the window
    exterior: { shot: outside.shot, cue: kind => (kind === "inside" ? (carT = reducedMotion ? carT : 1.0) : outside.passCar()) },
    restFocus: () => restFocusPoint,
    dof: { rest: 0.012, examine: 0.022 },
    lights: { attention },
    update(t, dt, held, hovered) {
      outside.update(t, dt);
      menuHandle.update(dt, held === menuArtifact, reducedMotion);
      // pointed at, it tips forward out of its place, as if about to be taken
      hoverTip += ((hovered === menuArtifact && menuHandle.progress === 0 ? 1 : 0) - hoverTip) * Math.min(1, dt * 7);
      menu.tip.rotation.x = Math.max(hoverTip * 0.12, pickTip); // the far edge lifts off the table, as a hand would start to
      // the shadow stays while the near edge is still down, thins as the far edge lifts, then goes
      const off = Math.max(0, menuHandle.progress - LEAD) / (1 - LEAD);
      menuShadow.material.opacity = 0.55 * (1 - pickTip * 0.6) * (1 - Math.min(1, off * 3));
      menu.group.updateMatrixWorld();
      menuArtifact.focus.setFromMatrixPosition(menu.group.matrixWorld);
      menu.update(dt);
      pane.userData.tick(reducedMotion ? 0 : t);
      steam.forEach(s => {
        const k = (t * 0.18 + s.phase) % 1;
        s.m.position.set(-0.58 + Math.sin(k * 6 + s.phase * 9) * 0.02, TABLE_Y + 0.13 + k * 0.32, 0.04);
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
        // the red sign outside breathes a little, slowly; no sudden dips (they read as a glitch)
        neonRed.intensity = 9 * (0.94 + Math.sin(t * 0.9) * 0.03 + Math.sin(t * 2.3) * 0.015);
      }
    },
  };
}
