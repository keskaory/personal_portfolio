// Beyond the Work, 2:10 am. A small room with space in it, seen from the door:
//   the back wall    - a big window, rain on it, a deep sill, curtains drawn back
//   the right        - the bed against the wall, plain bedding, slept in;
//                      at its head the nightstand: the paper lamp, the fragrances, a dish of rings;
//                      Polaroids taped to the wall above
//   the left wall    - wooden crates of manga, covers facing out on top; the CRT on a low stand;
//                      by the door, a coat, a jacket and the black hoodie on hooks
//   the middle       - a low table on two tatami mats: the MacBook open and asleep, a mug, a manga left open
//   the floor        - the volleyball by the bed
// Warmth comes from the lamp and from where things are, not from more things.
// Arriving: the match cut opens on the rain on this window, then pulls back.
//
// Coordinates: meters; floor y = 0, back wall z = -1.9, left wall x = -2.1,
// right wall x = 2.1, the camera near the door at the front right.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { rainWindow } from "../objects/rain-window.js";
import { neonCity } from "../objects/station-textures.js";
import { createBottle } from "../objects/bottle.js";
import { plasterTexture, woodTexture, clothTexture, seeded } from "../objects/textures.js";
import { drawPlaceholder } from "../lib/placeholder-art.js";
import { urls, linkOr } from "../lib/content.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function box(w, h, d, mat, x, y, z, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hitBox = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), c);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const loader = new THREE.TextureLoader();

// ---------------------------------------------------------------- textures
// the Molten match ball: white with a green and a red swoosh in each of three panels (no logo)
function volleyballTexture() {
  return canvasTex(1024, 512, ctx => {
    ctx.fillStyle = "#f4f2ec"; ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 3; i++) {
      const x0 = i * 341;
      const swoosh = (dx, colour, w) => {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.moveTo(x0 + dx, 0);
        ctx.bezierCurveTo(x0 + dx + 170, 120, x0 + dx - 60, 330, x0 + dx + 120, 512);
        ctx.lineTo(x0 + dx + 120 + w, 512);
        ctx.bezierCurveTo(x0 + dx + w - 30, 330, x0 + dx + w + 190, 120, x0 + dx + w * 0.6, 0);
        ctx.fill();
      };
      swoosh(20, "#1b8f55", 120);
      swoosh(150, "#c9202f", 110);
    }
  });
}
// the ball's dimpled surface: a fine honeycomb, used as a bump map
function honeycomb() {
  return canvasTex(512, 256, ctx => {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "#555"; ctx.lineWidth = 1.2;
    const r = 5;
    for (let y = 0; y < 270; y += r * 1.5) for (let x = (Math.round(y / (r * 1.5)) % 2) * r * 0.87; x < 520; x += r * 1.73) {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx[k ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); }
      ctx.closePath(); ctx.stroke();
    }
  }, { srgb: false });
}
function polaroidTexture(seed, sample) {
  return canvasTex(300, 360, ctx => {
    ctx.fillStyle = "#f1ede2"; ctx.fillRect(0, 0, 300, 360);
    const p = document.createElement("canvas"); p.width = 260; p.height = 260;
    drawPlaceholder(p, { format: "photo", seed, label: sample ? "Sample photo" : "" });
    ctx.drawImage(p, 20, 20);
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    for (let i = 0; i < 1500; i++) ctx.fillRect(Math.random() * 300, Math.random() * 360, 1, 1);
  });
}
// an upright manga spine: the series colour, a pale title band (marks, not words), a volume box
function spineTexture(colour, seed) {
  return canvasTex(48, 256, ctx => {
    const rand = seeded(seed);
    ctx.fillStyle = colour; ctx.fillRect(0, 0, 48, 256);
    ctx.fillStyle = "#f2eee4"; ctx.fillRect(0, 36, 48, 150);
    ctx.fillStyle = "rgba(20,20,20,0.75)";
    for (let y = 48; y < 172; y += 12 + rand() * 6) ctx.fillRect(16 + rand() * 4, y, 14, 7 + rand() * 4);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(10, 206, 28, 26);
    ctx.fillStyle = colour; ctx.fillRect(16, 212, 16, 14);
  });
}
// a cover: the real artwork when one is given, otherwise a plain stand-in with the title
function coverTexture(item, colour, seed) {
  const t = canvasTex(256, 364, ctx => {
    ctx.fillStyle = colour; ctx.fillRect(0, 0, 256, 364);
    const p = document.createElement("canvas"); p.width = 216; p.height = 230;
    drawPlaceholder(p, { format: "photo", seed, label: "" });
    ctx.drawImage(p, 20, 70);
    ctx.fillStyle = "#f4f0e6"; ctx.fillRect(20, 20, 216, 40);
    ctx.fillStyle = "#1c1a18";
    ctx.font = '600 20px "Helvetica Neue", Arial, sans-serif';
    const title = (item && item.title) || "";
    ctx.fillText(title.length > 20 ? title.slice(0, 19) + "…" : title, 28, 47);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(196, 318, 40, 30);
    ctx.fillStyle = colour; ctx.fillRect(204, 324, 24, 18);
  });
  if (item && item.cover) loader.load(item.cover, img => { t.image = img.image; t.needsUpdate = true; });
  return t;
}
// tatami: a fine straw weave running the length of the mat, faintly green-gold, aged
function tatamiTexture() {
  // drawn large and soft: the weave is felt as a fine texture, never as lines finer than a pixel
  // (those shimmer as the camera moves)
  return canvasTex(512, 1024, ctx => {
    const rand = seeded(521);
    ctx.fillStyle = "#958d68"; ctx.fillRect(0, 0, 512, 1024);
    for (let x = 0; x < 512; x += 6) { ctx.fillStyle = `rgba(${rand() < 0.5 ? "70,66,40" : "235,228,190"},${0.04 + rand() * 0.05})`; ctx.fillRect(x, 0, 4, 1024); }
    for (let y = 0; y < 1024; y += 64) { ctx.fillStyle = "rgba(60,55,30,0.08)"; ctx.fillRect(0, y, 512, 3); } // the cross-stitching
    ctx.filter = "blur(1.5px)";
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = "none";
    const g = ctx.createRadialGradient(256, 512, 60, 256, 512, 600);
    g.addColorStop(0, "rgba(255,250,220,0.06)"); g.addColorStop(1, "rgba(60,50,20,0.12)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 1024);
    // the dark cloth edging (heri) along the long sides, part of the mat itself
    ctx.fillStyle = "#262a26"; ctx.fillRect(0, 0, 18, 1024); ctx.fillRect(494, 0, 18, 1024);
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(4, 0, 2, 1024); ctx.fillRect(506, 0, 2, 1024);
  });
}
// plain woven fabric: one colour, a faint weave, no print
function weaveTexture(colour, seed) {
  return canvasTex(128, 128, ctx => {
    const rand = seeded(seed);
    ctx.fillStyle = colour; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i += 2) { ctx.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.03})`; ctx.fillRect(i, 0, 1, 128); ctx.fillRect(0, i, 128, 1); }
  });
}
// a garment's flat outline: shoulders, sleeves hanging, body to the hem
function garmentGeo({ sw = 0.21, hw = 0.2, len = 0.7, sleeve = 0.6, hood = false, depth = 0.05 }) {
  const s = new THREE.Shape();
  const half = [[0.06, 0], [sw, -0.05], [sw + 0.035, -sleeve], [sw - 0.06, -sleeve], [sw - 0.065, -0.24], [hw, -len]];
  s.moveTo(-0.06, hood ? 0.07 : 0);
  if (hood) s.quadraticCurveTo(0, 0.12, 0.06, 0.07);
  half.forEach(([x, y]) => s.lineTo(x, y));
  s.lineTo(-hw, -len);
  [...half].reverse().forEach(([x, y]) => s.lineTo(-x, y));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}
// push vertices about a little so soft things don't read as boxes (shared corners move together)
function lumpy(g, amt, seed) {
  const rand = seeded(seed);
  const p = g.attributes.position;
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, (rand() - 0.5) * amt);
    p.setY(i, p.getY(i) + seen.get(key));
  }
  g.computeVertexNormals();
  return g;
}

export function buildApartment(scene, content, { reducedMotion = false } = {}) {
  const { fragrances, site } = content;
  const C = content.collections || {};
  scene.background = new THREE.Color("#060605");
  const rand = seeded(541);

  // ---- the room: wider and deeper than before, so there's floor to breathe
  const plaster = plasterTexture();
  plaster.repeat.set(3, 2);
  const wallMat = new THREE.MeshStandardMaterial({ map: plaster, color: "#a8977f", roughness: 0.95 });
  const floorTex = woodTexture(531);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(3, 7);
  floorTex.rotation = Math.PI / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.3), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.25);
  floor.receiveShadow = true;
  scene.add(floor);
  const wall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; };
  // back wall around the window opening (x -1.2..0.6, y 0.85..2.15)
  wall(0.9, 2.6, -1.65, 1.3, -1.9, 0);
  wall(1.5, 2.6, 1.35, 1.3, -1.9, 0);
  wall(1.8, 0.85, -0.3, 0.425, -1.9, 0);
  wall(1.8, 0.45, -0.3, 2.375, -1.9, 0);
  wall(4.3, 2.6, -2.1, 1.3, 0.25, Math.PI / 2);
  wall(4.3, 2.6, 2.1, 1.3, 0.25, -Math.PI / 2);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.3), new THREE.MeshStandardMaterial({ color: "#2c2925", roughness: 0.9 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 2.6, 0.25);
  scene.add(ceiling);
  const trim = new THREE.MeshStandardMaterial({ color: "#3a332b", roughness: 0.7 });
  scene.add(box(4.2, 0.08, 0.02, trim, 0, 0.04, -1.89, false));
  scene.add(box(0.02, 0.08, 4.3, trim, -2.09, 0.04, 0.25, false));
  scene.add(box(0.02, 0.08, 4.3, trim, 2.09, 0.04, 0.25, false));

  // ---- the window: rain on the glass, a deep sill, curtains drawn back on a rod
  const frameMat = new THREE.MeshStandardMaterial({ color: "#d3ccbc", roughness: 0.55 });
  const pane = rainWindow(1.8, 1.3, { brightness: 0.9, depth: 0.3, fog: 0.5, city: neonCity({ blur: 22, signs: 12 }) });
  pane.position.set(-0.3, 1.5, -1.96);
  scene.add(pane);
  scene.add(box(1.86, 0.04, 0.06, frameMat, -0.3, 2.15, -1.92, false));
  scene.add(box(0.04, 1.34, 0.06, frameMat, -1.21, 1.5, -1.92, false));
  scene.add(box(0.04, 1.34, 0.06, frameMat, 0.61, 1.5, -1.92, false));
  scene.add(box(0.03, 1.3, 0.05, frameMat, -0.3, 1.5, -1.92, false));
  scene.add(box(1.98, 0.045, 0.3, frameMat, -0.3, 0.83, -1.78)); // the sill, deep enough to sit things on
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.6, 10), new THREE.MeshStandardMaterial({ color: "#2b2621", metalness: 0.6, roughness: 0.4 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(-0.3, 2.3, -1.82);
  scene.add(rod);
  const curtainTex = weaveTexture("#cfc4b0", 515);
  curtainTex.wrapS = curtainTex.wrapT = THREE.RepeatWrapping;
  curtainTex.repeat.set(3, 8);
  const curtainMat = new THREE.MeshStandardMaterial({ map: curtainTex, roughness: 0.95, side: THREE.DoubleSide });
  const drape = (x, flip) => {
    const g = new THREE.PlaneGeometry(0.5, 1.95, 36, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i), v = p.getY(i);
      const down = 1 - (v + 0.975) / 1.95; // 0 at the rod, 1 at the hem
      // gathered at the rod, folds of uneven depth that open out toward the hem
      p.setZ(i, (Math.sin(u * 38 + 0.8) * 0.028 + Math.sin(u * 71 + 2.1) * 0.012) * (0.55 + 0.45 * down));
      p.setX(i, u * (0.75 + 0.25 * (1 - down)) + (flip ? -1 : 1) * 0.02 * down);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, curtainMat);
    m.position.set(x, 1.31, -1.8);
    m.castShadow = false; // they sway; their shadows would crawl across the floor
    scene.add(m);
    return m;
  };
  const curtains = [drape(-1.42, false), drape(0.82, true)];

  // ---- light: the street through the window, the paper lamp, a warm lamp behind us
  const street = new THREE.SpotLight("#8cc0d0", 13, 8, 0.6, 0.9, 1.5);
  street.position.set(-0.3, 2.7, -3.8);
  street.target.position.set(0.1, 0.3, -0.2);
  street.castShadow = true;
  street.shadow.mapSize.set(1024, 1024);
  street.shadow.bias = -0.0003;
  scene.add(street, street.target);
  scene.add(new THREE.HemisphereLight("#5e5040", "#1c160f", 1.6));
  const fill = new THREE.PointLight("#ffc890", 3.2, 5, 1.4); // the hall light by the door, falling across the coats
  fill.position.set(-1.0, 2.3, 1.45);
  scene.add(fill);
  const attention = new THREE.SpotLight("#ffe7cc", 0, 4, 0.22, 1, 2);
  attention.position.set(1.2, 1.9, 1.2);
  scene.add(attention, attention.target);

  const artifacts = [];
  const add = a => { a.focus = new THREE.Vector3(); (a.hits || [a.hit]).forEach(h => (h.userData.id = a.id)); artifacts.push(a); return a; };
  const shotAt = (target, from, side = "right", fov = 38) => portrait => portrait
    ? { side: "bottom", position: target.clone().add(from.clone().multiplyScalar(1.45)).add(V(0, 0.08, 0)), target: target.clone().add(V(0, -0.06, 0)), fov: fov + 10 }
    : { side, position: target.clone().add(from), target: target.clone().add(side === "right" ? V(0.06, 0, 0) : V(-0.06, 0, 0)), fov };
  const title = i => (typeof i === "string" ? i : i?.title || "");
  const collectionPanel = (key, extra = {}) => () => {
    const c = C[key] || {};
    return {
      title: c.title || key,
      body: c.intro,
      list: c.items && c.items.length ? { heading: "In the collection", items: c.items.map(title) } : null,
      actions: [{ label: "See everything", href: "contents.html#beyond", page: true }, ...(extra.actions || [])],
      sample: c.sample,
    };
  };

  // ---- the bed against the right wall, head to the back wall: plain bedding, slept in
  const bedX = 1.6, bedZ = -0.88;
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(555), roughness: 0.5 });
  scene.add(box(0.96, 0.26, 2.05, wood, bedX, 0.13, bedZ));
  scene.add(box(0.96, 0.55, 0.05, wood, bedX, 0.42, -1.86)); // headboard
  const mattress = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.18, 1.98, 3, 0.05), new THREE.MeshStandardMaterial({ color: "#e6e1d6", roughness: 0.9 }));
  mattress.position.set(bedX, 0.35, bedZ);
  scene.add(mattress);
  // the duvet: a sheet of cloth over the mattress, its top rumpled, its edges falling over the sides
  const duvetGeo = new THREE.PlaneGeometry(1.12, 1.6, 48, 64);
  duvetGeo.rotateX(-Math.PI / 2);
  {
    const p = duvetGeo.attributes.position;
    const rnd = seeded(557);
    const folds = Array.from({ length: 7 }, () => ({ a: rnd() * 6.28, f: 4 + rnd() * 9, d: 0.006 + rnd() * 0.012, ph: rnd() * 6 }));
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let y = 0;
      folds.forEach(o => (y += Math.sin((x * Math.cos(o.a) + z * Math.sin(o.a)) * o.f + o.ph) * o.d));
      y += 0.03 * Math.exp(-((x + 0.1) ** 2 + (z - 0.1) ** 2) / 0.08); // where it was pushed back and bunched
      const over = Math.max(0, Math.abs(x) - 0.43); // past the mattress edge, it falls
      y -= over * over * 22 + over * 1.6;
      p.setXYZ(i, x - Math.sign(x) * over * 0.55, y, z);
    }
    duvetGeo.computeVertexNormals();
  }
  const duvet = new THREE.Mesh(duvetGeo, new THREE.MeshStandardMaterial({ map: weaveTexture("#c9c2b5", 557), roughness: 0.95, side: THREE.DoubleSide }));
  duvet.position.set(bedX, 0.47, bedZ + 0.2);
  duvet.castShadow = duvet.receiveShadow = true;
  scene.add(duvet);
  // two pillows, plain ivory, soft and dented
  const pillowMat = new THREE.MeshStandardMaterial({ map: weaveTexture("#ebe6da", 559), roughness: 0.92 });
  [[-0.2, 0.18, 0.06], [0.18, -0.12, -0.05]].forEach(([dx, ry, rz], i) => {
    const g = new THREE.SphereGeometry(0.2, 28, 14);
    g.scale(1.45, 0.32, 0.85);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k); if (y > 0) p.setY(k, y - 0.025 * Math.exp(-(x * x + z * z) / 0.01)); }
    g.computeVertexNormals();
    const pillow = new THREE.Mesh(g, pillowMat);
    pillow.position.set(bedX + dx, 0.52 + i * 0.03, -1.64 + i * 0.05);
    pillow.rotation.set(0.12, ry, rz);
    pillow.castShadow = pillow.receiveShadow = true;
    scene.add(pillow);
  });

  // ---- the nightstand at the bed's head: the paper lamp, the fragrances, a dish of rings
  const nsX = 0.91, nsZ = -1.64, NS_Y = 0.56; // between the end of the sill and the bed
  scene.add(box(0.4, NS_Y, 0.4, wood, nsX, NS_Y / 2, nsZ));
  scene.add(box(0.34, 0.006, 0.005, new THREE.MeshStandardMaterial({ color: "#1c140e" }), nsX, 0.34, nsZ + 0.202, false));
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#f3e3c4", emissive: new THREE.Color("#ffb45c"), emissiveIntensity: 1.0, roughness: 1, side: THREE.DoubleSide }));
  lampShade.position.set(nsX - 0.08, NS_Y + 0.28, nsZ - 0.08);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 20), new THREE.MeshStandardMaterial({ color: "#2b2621", roughness: 0.4 }));
  lampBase.position.set(nsX - 0.08, NS_Y + 0.015, nsZ - 0.08);
  scene.add(lampShade, lampBase);
  const lamp = new THREE.PointLight("#ffb46a", 7, 6, 1.4);
  lamp.position.set(nsX - 0.08, NS_Y + 0.32, nsZ - 0.02);
  scene.add(lamp);
  // the 100 ml at the back, the two 50 ml in front of it
  const spots = [{ x: nsX + 0.08, z: nsZ - 0.1, ry: 0.45 }, { x: nsX + 0.11, z: nsZ + 0.03, ry: 0.6 }, { x: nsX + 0.04, z: nsZ + 0.12, ry: 0.5 }]; // labels turned toward the room
  fragrances.slice(0, spots.length).forEach((data, i) => {
    const bottle = createBottle(data, i + 1);
    const s = spots[i];
    bottle.group.position.set(s.x, NS_Y, s.z);
    bottle.group.rotation.y = s.ry;
    bottle.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(bottle.group);
    const hit = hitBox(0.07, bottle.height * 1.1, 0.07);
    hit.position.y = bottle.height / 2;
    bottle.group.add(hit);
    const a = add({
      id: data.id, stop: "rest", hit, object: bottle.group, data, bottle,
      caption: `Pick up ${data.name}`,
      restY: s.ry, spin: s.ry,
      examine: portrait => {
        const c = V(s.x, NS_Y + bottle.height * 0.5, s.z);
        return portrait
          ? { side: "bottom", position: c.clone().add(V(-0.2, 0.06, 0.5)), target: c.clone().add(V(0, -0.04, 0)), fov: 30 }
          : { side: "left", position: c.clone().add(V(-0.22, 0.03, 0.36)), target: c.clone().add(V(-0.07, 0, 0)), fov: 28 };
      },
      leave: () => ({ position: V(s.x - 0.1, NS_Y + bottle.height * 0.5, s.z + 0.16), target: V(s.x, NS_Y + bottle.height * 0.5, s.z), fov: 24 }),
      drag: dx => { a.spin += dx * 0.012; },
      release: () => { const turns = Math.round((bottle.group.rotation.y - a.restY) / (Math.PI * 2)); a.spin = a.restY + turns * Math.PI * 2; },
      panel: () => ({
        title: data.name, meta: `${data.size} ml${data.acquired ? ` · ${data.acquired}` : ""}`, body: data.short, hint: "Drag to turn it.",
        actions: [{ label: "Read about it", href: urls.fragrance(data.id), page: true }], sample: data.sample,
      }),
    });
  });
  // rings, two small hoops, a chain, on a dark glazed dish so the silver shows
  const dish = new THREE.Group();
  dish.position.set(nsX - 0.1, NS_Y, nsZ + 0.11);
  dish.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.016, 28), new THREE.MeshPhysicalMaterial({ color: "#1d2a2c", roughness: 0.15, clearcoat: 1 })));
  const silver = new THREE.MeshStandardMaterial({ color: "#e4e4e0", metalness: 1, roughness: 0.14 });
  [[0.02, 0.014, 0.008, 0.3, 0.011, 0.003], [-0.018, 0.013, -0.014, 1.2, 0.01, 0.0025], [0.002, 0.016, 0.022, 2.1, 0.0105, 0.0036], [-0.028, 0.012, 0.014, 0.6, 0.007, 0.0011], [-0.02, 0.012, 0.028, 1.9, 0.007, 0.0011]].forEach(([x, y, z, r, R, t]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, t, 10, 28), silver);
    ring.rotation.set(Math.PI / 2 - 0.25, 0, r);
    ring.position.set(x, y, z);
    dish.add(ring);
  });
  const chainPts = [];
  for (let i = 0; i < 16; i++) chainPts.push(V(Math.cos(i * 0.8) * 0.03 + 0.008, 0.011 + (i % 2) * 0.002, Math.sin(i * 0.8) * 0.025 - 0.004));
  dish.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts), 80, 0.0013, 5), silver));
  const dishHit = hitBox(0.14, 0.08, 0.14);
  dish.add(dishHit);
  scene.add(dish);

  // Polaroids taped to the wall above the bed's head, in the lamp's light
  const tape = new THREE.MeshStandardMaterial({ color: "#efe6c8", roughness: 0.6, transparent: true, opacity: 0.7 });
  const pins = [[1.12, 1.42, -0.05], [1.32, 1.36, 0.06], [1.52, 1.45, -0.03], [1.72, 1.37, 0.05], [1.36, 1.6, 0.04], [1.6, 1.62, -0.06]];
  const polaroids = pins.map(([x, y, r], i) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.132), new THREE.MeshStandardMaterial({ map: polaroidTexture(70 + i, C.photos?.sample), roughness: 0.55 }));
    m.castShadow = true;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.016), tape);
    strip.position.set(0, 0.064, 0.001);
    strip.rotation.z = (i % 2 ? 0.2 : -0.15);
    g.add(m, strip);
    g.position.set(x, y, -1.894);
    g.rotation.z = r;
    g.userData.r = r;
    scene.add(g);
    return g;
  });
  const polaroidHit = hitBox(0.8, 0.42, 0.05);
  polaroidHit.position.set(1.42, 1.48, -1.87);
  scene.add(polaroidHit);

  // ---- the left wall: crates of manga, covers out on top
  const crateWood = new THREE.MeshStandardMaterial({ map: woodTexture(563), color: "#c9a77c", roughness: 0.7 });
  const crate = (x, y, z) => {
    const g = new THREE.Group();
    const W = 0.32, H = 0.36, D = 0.52, t = 0.016; // open toward the room (+x)
    g.add(box(t, H, D, crateWood, -W / 2, 0, 0));
    g.add(box(W, t, D, crateWood, 0, -H / 2 + t / 2, 0));
    g.add(box(W, t, D, crateWood, 0, H / 2 - t / 2, 0));
    g.add(box(W, H, t, crateWood, 0, 0, -D / 2));
    g.add(box(W, H, t, crateWood, 0, 0, D / 2));
    g.position.set(x, y, z);
    scene.add(g);
    return g;
  };
  const crateX = -1.93;
  const crates = [[crateX, 0.18, -1.55], [crateX, 0.18, -1.0], [crateX, 0.55, -1.55], [crateX, 0.55, -1.0]].map(p => crate(...p));
  // books standing in the crates, spines out: a few colour variants, instanced
  const covers = ["#c43c2c", "#e8e1d2", "#1f2a3c", "#d8a63a", "#3f5f4a", "#7a2f43", "#2c6e8a", "#e07a3a"];
  const pagesMat = new THREE.MeshStandardMaterial({ color: "#ece5d3", roughness: 0.9 });
  const bookGeo = new THREE.BoxGeometry(0.128, 0.18, 0.017); // depth along x, spine on +x
  const slots = [];
  crates.forEach(c => { let z = c.position.z - 0.24; while (z < c.position.z + 0.23) { slots.push([c.position.x, c.position.y - 0.18 + 0.016 + 0.09, z + 0.009]); z += 0.018 + (rand() < 0.08 ? 0.03 : 0); } });
  covers.forEach((col, k) => {
    const mine = slots.filter((_, i) => i % covers.length === k);
    const spine = new THREE.MeshStandardMaterial({ map: spineTexture(col, 600 + k), roughness: 0.6 });
    const cover = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
    const inst = new THREE.InstancedMesh(bookGeo, [spine, pagesMat, pagesMat, pagesMat, cover, cover], mine.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    mine.forEach(([x, y, z], i) => { const h = 0.92 + rand() * 0.12; sc.set(1, h, 1); m4.compose(V(x + 0.01, y - (1 - h) * 0.09, z), q, sc); inst.setMatrixAt(i, m4); });
    inst.castShadow = inst.receiveShadow = true;
    scene.add(inst);
  });
  // three on top, facing out, leaning on the wall: the covers (real artwork when given)
  const items = (C.books?.items || []).slice(0, 3).map(i => (typeof i === "string" ? { title: i } : i));
  while (items.length < 3) items.push({ title: "" });
  const faceOut = items.map((item, i) => {
    const g = new THREE.Group();
    const col = covers[(i * 3 + 1) % covers.length];
    const coverMat = new THREE.MeshStandardMaterial({ map: coverTexture(item, col, 700 + i), roughness: 0.55 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.182, 0.128), [coverMat, new THREE.MeshStandardMaterial({ color: col }), pagesMat, pagesMat, pagesMat, pagesMat]);
    b.castShadow = true;
    b.position.y = 0.091;
    g.add(b);
    g.position.set(crateX - 0.07, 0.73, -1.6 + i * 0.2);
    g.rotation.z = -0.12; // leaning back against the wall
    scene.add(g);
    return g;
  });
  const booksHit = hitBox(0.4, 0.95, 1.1);
  booksHit.position.set(crateX, 0.48, -1.28);
  scene.add(booksHit);

  // ---- the CRT on a low stand against the left wall, turned toward the room
  // a low TV cabinet: tapered legs, two doors with brass pulls, an open shelf of film cases
  const cab = new THREE.Group();
  cab.position.set(-1.8, 0, 0.02);
  cab.rotation.y = Math.PI / 2 - 0.45;
  const teak = new THREE.MeshStandardMaterial({ map: woodTexture(571), color: "#a0704a", roughness: 0.55 });
  const CW = 0.78, CD = 0.42;
  cab.add(box(CW, 0.025, CD, teak, 0, 0.405, 0));                    // top
  cab.add(box(CW, 0.02, CD, teak, 0, 0.13, 0));                      // bottom
  [-1, 1].forEach(sd => cab.add(box(0.02, 0.29, CD, teak, sd * (CW / 2 - 0.01), 0.27, 0))); // sides
  cab.add(box(CW, 0.29, 0.015, teak, 0, 0.27, -CD / 2 + 0.008));    // back
  cab.add(box(0.015, 0.29, CD - 0.02, teak, 0.06, 0.27, 0));         // divider
  // doors on the left bay
  const door = box(0.4, 0.26, 0.015, teak, -0.165, 0.27, CD / 2 - 0.006);
  cab.add(door);
  cab.add(box(0.004, 0.24, 0.004, new THREE.MeshStandardMaterial({ color: "#2a1c10" }), -0.165, 0.27, CD / 2 + 0.002, false));
  [-0.19, -0.14].forEach(x => cab.add(box(0.012, 0.04, 0.012, new THREE.MeshStandardMaterial({ color: "#b8955e", metalness: 0.8, roughness: 0.35 }), x, 0.29, CD / 2 + 0.01, false)));
  // the open bay: film cases on their edges
  const caseCols = ["#1b1b1d", "#2a2c3a", "#3b2420", "#1e2a24", "#2b2b2b", "#4a3a2a"];
  for (let i = 0; i < 9; i++) cab.add(box(0.015, 0.19, 0.135, new THREE.MeshStandardMaterial({ color: caseCols[i % caseCols.length], roughness: 0.4 }), 0.09 + i * 0.019, 0.237, 0.04, true));
  // tapered legs
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.008, 0.13, 8), teak);
    leg.position.set(a * (CW / 2 - 0.05), 0.065, b * (CD / 2 - 0.05));
    leg.rotation.z = -a * 0.08; leg.rotation.x = b * 0.08;
    leg.castShadow = true;
    cab.add(leg);
  });
  scene.add(cab);
  const crt = new THREE.Group();
  crt.position.set(-1.8, 0.4175, 0.02);
  crt.rotation.y = Math.PI / 2 - 0.45;
  const crtBody = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.39, 0.42, 3, 0.03), new THREE.MeshStandardMaterial({ color: "#2b2a28", roughness: 0.55 }));
  crtBody.position.y = 0.195;
  crtBody.castShadow = true;
  // the picture: a drifting loop by default, or a still / clip named in collections.json
  const screenC = document.createElement("canvas");
  screenC.width = 160; screenC.height = 120;
  const screenTex = new THREE.CanvasTexture(screenC);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, color: new THREE.Color(1.25, 1.25, 1.25) });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), screenMat);
  screen.position.set(-0.02, 0.2, 0.212);
  crt.add(crtBody, screen);
  const tv = C.tv || { type: "loop" };
  let drawLoop = true;
  if (tv.type === "image" && tv.src) {
    loader.load(tv.src, t => { t.colorSpace = THREE.SRGBColorSpace; screenMat.map = t; screenMat.needsUpdate = true; drawLoop = false; });
  } else if (tv.type === "video" && tv.src) {
    const video = Object.assign(document.createElement("video"), { src: tv.src, muted: true, loop: true, playsInline: true, crossOrigin: "anonymous" });
    video.play().then(() => { const t = new THREE.VideoTexture(video); t.colorSpace = THREE.SRGBColorSpace; screenMat.map = t; screenMat.needsUpdate = true; drawLoop = false; }).catch(() => {});
  }
  const crtHit = hitBox(0.5, 0.42, 0.45);
  crtHit.position.y = 0.2;
  crt.add(crtHit);
  scene.add(crt);
  const crtGlow = new THREE.PointLight("#8fb6c8", 1.3, 2.8, 1.6);
  crtGlow.position.set(-1.45, 0.7, 0.25);
  scene.add(crtGlow);
  let channel = 0, screenT = 0;
  const channelColors = [["#2a4d6e", "#c98a4b"], ["#5b2a33", "#d9b37a"], ["#24453a", "#b9d1c2"]];
  function drawScreen(t) {
    const ctx = screenC.getContext("2d");
    const [a, b] = channelColors[channel % channelColors.length];
    const g = ctx.createLinearGradient(0, 0, 160, 120);
    const k = (Math.sin(t * 0.3) + 1) / 2;
    g.addColorStop(0, a); g.addColorStop(0.4 + k * 0.4, b); g.addColorStop(1, a);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 160, 120);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < 120; y += 2) ctx.fillRect(0, y, 160, 1);
    for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; ctx.fillRect(Math.random() * 160, Math.random() * 120, 1, 1); }
    screenTex.needsUpdate = true;
  }
  drawScreen(0);

  // ---- two pieces on hooks by the door, flat to the wall so their shapes read
  const hookMat = new THREE.MeshStandardMaterial({ color: "#b8955e", metalness: 0.8, roughness: 0.35 });
  const pieces = [
    { z: 0.95, color: "#3a3b3f", sw: 0.22, hw: 0.23, len: 0.98, sleeve: 0.72 }, // a long charcoal coat
    { z: 1.45, color: "#2c3a52", sw: 0.21, hw: 0.2, len: 0.62, sleeve: 0.58 },  // a denim jacket
    { z: 1.92, color: "#1c1c1e", sw: 0.23, hw: 0.22, len: 0.66, sleeve: 0.62, hood: true }, // the black hoodie
  ];
  const garments = pieces.map(p => {
    const g = new THREE.Group();
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 12, Math.PI * 1.3), hookMat);
    hook.rotation.y = Math.PI / 2;
    const cloth = new THREE.Mesh(garmentGeo(p), new THREE.MeshStandardMaterial({ map: clothTexture(p.color), color: "#a8a8a8", roughness: 0.92 }));
    cloth.position.set(0.02, -0.03, 0);
    cloth.rotation.y = Math.PI / 2; // facing into the room
    cloth.castShadow = cloth.receiveShadow = true;
    g.add(hook, cloth);
    g.position.set(-2.05, 1.78, p.z);
    scene.add(g);
    return g;
  });
  // a small spot from the ceiling by the door, aimed down at the hooks
  const hookSpot = new THREE.SpotLight("#ffd9b0", 7, 3, 0.55, 0.7, 1.5);
  hookSpot.position.set(-1.45, 2.55, 1.42);
  hookSpot.target.position.set(-2.06, 1.25, 1.42);
  scene.add(hookSpot, hookSpot.target);
  const railHit = hitBox(0.2, 1.1, 1.4);
  railHit.position.set(-2.0, 1.35, 1.42);
  scene.add(railHit);

  // ---- the low table on the rug: the MacBook open and asleep, a mug, a manga left open
  // two tatami mats laid side by side under the low table, edged in dark cloth
  const tatamiMat = new THREE.MeshStandardMaterial({ map: tatamiTexture(), color: "#c4c4c4", roughness: 0.88 });
  const heri = new THREE.MeshStandardMaterial({ map: weaveTexture("#262a26", 517), roughness: 0.8 });
  const tatamiSide = new THREE.MeshStandardMaterial({ color: "#8f8763", roughness: 0.9 });
  // one solid piece per mat: the edging is in its top texture and on its long sides, so no
  // separate border pieces share a face with it (that was the flickering edge)
  [-0.852, 0.052].forEach((x, i) => { // a 4 mm seam between them, as between real mats
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.045, 1.8), [heri, heri, tatamiMat, tatamiSide, tatamiSide, tatamiSide]);
    mat.position.set(x, 0.0225 + i * 0.0004, -0.35 + i * 0.02);
    mat.receiveShadow = true;
    scene.add(mat);
  });
  const MAT_Y = 0.045; // things on the tatami sit this high
  const tableWood = new THREE.MeshStandardMaterial({ map: woodTexture(533), roughness: 0.45 });
  const TX = -0.42, TZ = -0.32;
  scene.add(box(0.9, 0.035, 0.55, tableWood, TX, 0.36 + MAT_Y, TZ));
  [[-0.41, -0.23], [0.41, -0.23], [-0.41, 0.23], [0.41, 0.23]].forEach(([x, z]) => scene.add(box(0.04, 0.34, 0.04, tableWood, TX + x, 0.17 + MAT_Y, TZ + z)));
  const laptop = new THREE.Group();
  laptop.position.set(TX - 0.12, 0.378 + MAT_Y, TZ - 0.03);
  laptop.rotation.y = 0.4;
  const alu = new THREE.MeshStandardMaterial({ color: "#b4b6b6", metalness: 0.85, roughness: 0.32 });
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.009, 0.215, 2, 0.004), alu);
  shell.position.y = 0.0045;
  shell.castShadow = shell.receiveShadow = true;
  laptop.add(shell);
  const deck = canvasTex(512, 356, ctx => {
    ctx.fillStyle = "#a9abab"; ctx.fillRect(0, 0, 512, 356);
    ctx.fillStyle = "#1e1f21"; ctx.fillRect(40, 26, 432, 176);
    ctx.fillStyle = "#2b2c2f";
    for (let r = 0; r < 6; r++) for (let c = 0; c < 14; c++) ctx.fillRect(46 + c * 30.5, 32 + r * 28.5, 26, 24);
    ctx.fillStyle = "#9c9e9e"; ctx.fillRect(150, 222, 212, 118);
  });
  const deckM = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.208), new THREE.MeshStandardMaterial({ map: deck, roughness: 0.5, metalness: 0.4 }));
  deckM.rotation.x = -Math.PI / 2;
  deckM.position.y = 0.0092;
  laptop.add(deckM);
  const lid = new THREE.Group();
  lid.position.set(0, 0.009, -0.107);
  lid.rotation.x = -0.29;
  const lidWrap = new THREE.Group();
  lidWrap.rotation.x = Math.PI / 2;
  const lidShell = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.006, 0.21, 2, 0.003), alu);
  lidShell.position.set(0, 0, -0.105);
  lidWrap.add(lidShell);
  const lcdMat = new THREE.MeshBasicMaterial({ map: canvasTex(512, 340, ctx => {
    const g = ctx.createLinearGradient(0, 0, 512, 340);
    g.addColorStop(0, "#1c2a3a"); g.addColorStop(1, "#3a2a3a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = "rgba(240,240,240,0.9)"; ctx.fillRect(0, 0, 512, 12);
    ctx.fillStyle = "rgba(18,20,24,0.92)"; ctx.fillRect(60, 50, 300, 210);
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(60, 50, 300, 18);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = ["#7fb3d5", "#e6b17a", "#c7c7c7", "#9fcf9f"][i % 4]; ctx.fillRect(76 + (i % 3) * 12, 82 + i * 14, 60 + ((i * 37) % 140), 5); }
  }), color: new THREE.Color(0.55, 0.55, 0.6) });
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.19), lcdMat);
  lcd.position.set(0, 0.0036, -0.105);
  lcd.rotation.x = -Math.PI / 2;
  lidWrap.add(lcd);
  lid.add(lidWrap);
  laptop.add(lid);
  const laptopHit = hitBox(0.36, 0.26, 0.3);
  laptopHit.position.set(0, 0.1, -0.05);
  laptop.add(laptopHit);
  scene.add(laptop);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.037, 0.09, 18), new THREE.MeshStandardMaterial({ color: "#2f3d3a", roughness: 0.4 }));
  mug.position.set(TX + 0.28, 0.423 + MAT_Y, TZ - 0.12);
  mug.castShadow = true;
  scene.add(mug);
  const openBook = new THREE.Group();
  const halfCover = new THREE.MeshStandardMaterial({ color: covers[6], roughness: 0.55 });
  [-1, 1].forEach(s => {
    const half = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.006, 0.182), [halfCover, halfCover, halfCover, pagesMat, halfCover, halfCover]);
    half.position.set(s * 0.062, 0.014, 0);
    half.rotation.z = -s * 0.16;
    half.castShadow = true;
    openBook.add(half);
  });
  openBook.position.set(TX + 0.2, 0.378 + MAT_Y, TZ + 0.12);
  openBook.rotation.y = -0.5;
  scene.add(openBook);
  // a floor cushion on the near side of the table
  const cushion = new THREE.Mesh(lumpy(new RoundedBoxGeometry(0.5, 0.08, 0.5, 4, 0.035), 0.012, 565), new THREE.MeshStandardMaterial({ color: "#2f4a7a", roughness: 0.9 }));
  cushion.position.set(TX + 0.05, 0.04 + MAT_Y, TZ + 0.62);
  cushion.rotation.y = 0.2;
  cushion.receiveShadow = true;
  scene.add(cushion);

  // ---- the volleyball on the floor by the bed
  const ballMat = new THREE.MeshStandardMaterial({ map: volleyballTexture(), bumpMap: honeycomb(), bumpScale: 0.6, roughness: 0.6 });
  ballMat.bumpMap.wrapS = ballMat.bumpMap.wrapT = THREE.RepeatWrapping;
  ballMat.bumpMap.repeat.set(4, 4);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.105, 40, 28), ballMat);
  ball.position.set(0.78, 0.105, 0.3);
  ball.rotation.set(0.4, 0.8, 0.2);
  ball.castShadow = true;
  scene.add(ball);

  // ---- the other artifacts
  add({
    id: "apt-books", stop: "rest", hits: [booksHit], object: faceOut[1], caption: "Look through the manga",
    examine: shotAt(V(-1.88, 0.62, -1.28), V(1.15, 0.25, 0.25), "right", 44),
    panel: collectionPanel("books"),
  });
  add({
    id: "apt-laptop", stop: "rest", hits: [laptopHit], object: laptop, caption: "What's on the laptop",
    examine: shotAt(V(TX - 0.12, 0.47 + MAT_Y, TZ - 0.05), V(0.32, 0.26, 0.5), "right", 38),
    panel: collectionPanel("laptop", { actions: linkOr(site.links.github, "") ? [{ label: "GitHub", href: site.links.github }] : [] }),
  });
  add({
    id: "apt-crt", stop: "rest", hits: [crtHit], object: crt, caption: "Watch the television",
    examine: shotAt(V(-1.78, 0.62, 0.05), V(0.95, 0.08, 0.5), "right", 36),
    panel: collectionPanel("films"),
    onExamine: () => { channel++; },
  });
  add({
    id: "apt-jewelry", stop: "rest", hits: [dishHit], object: dish, caption: "Rings and chains",
    examine: shotAt(V(nsX - 0.1, NS_Y + 0.02, nsZ + 0.11), V(-0.16, 0.26, 0.26), "left", 30),
    panel: collectionPanel("jewelry"),
  });
  add({
    id: "apt-photos", stop: "rest", hits: [polaroidHit], object: polaroids[2], caption: "Look at the Polaroids",
    examine: portrait => portrait
      ? { side: "bottom", position: V(1.42, 1.35, -0.4), target: V(1.42, 1.38, -1.89), fov: 44 }
      : { side: "left", position: V(1.42, 1.48, -0.75), target: V(1.2, 1.48, -1.89), fov: 34 },
    panel: collectionPanel("photos"),
  });
  add({
    id: "apt-volleyball", stop: "rest", hit: ball, object: ball, caption: "Pick up the volleyball",
    examine: shotAt(V(0.78, 0.12, 0.3), V(-0.25, 0.3, 0.55), "left", 36),
    panel: collectionPanel("volleyball"),
  });
  add({
    id: "apt-rail", stop: "rest", hits: [railHit], object: garments[0], caption: "What I wear",
    examine: shotAt(V(-2.0, 1.3, 1.42), V(1.9, 0.1, 0.1), "right", 52),
    panel: collectionPanel("style"),
  });
  artifacts.forEach(a => { if (!a.leave) a.leave = () => { const s = a.examine(false); return { ...s, position: s.position.clone().lerp(s.target, 0.3), fov: s.fov - 4 }; }; });
  const byId = id => artifacts.find(a => a.id === id);

  // hover: each thing answers a little, the way it would to a hand reaching for it
  const hover = new Map();
  const ease = (k, on, dt, rate = 7) => { const v = (hover.get(k) || 0) + ((on ? 1 : 0) - (hover.get(k) || 0)) * Math.min(1, dt * rate); hover.set(k, v); return v; };

  const restFocusPoint = V(-0.3, 0.5, -0.6);
  return {
    artifacts,
    shots: {
      rest: { position: V(1.75, 1.9, 2.25), target: V(-0.45, 0.5, -0.85), fov: 56 },
      restPortrait: { position: V(1.4, 1.85, 2.3), target: V(0.25, 0.55, -0.95), fov: 74 },
    },
    // the match cut lands here: the rain on this window, close up, before pulling back
    entryShot: () => ({ position: V(-0.3, 1.52, -1.4), target: V(-0.3, 1.52, -2.0), fov: 34 }),
    restFocus: () => restFocusPoint,
    dof: { rest: 0.006, examine: 0.02 },
    lights: { attention },
    update(t, dt, held, hovered) {
      artifacts.forEach(a => {
        if (a.bottle) {
          const g = a.bottle.group;
          g.rotation.y += (a.spin - g.rotation.y) * Math.min(1, dt * 5);
          g.position.y = NS_Y + ease(a, hovered === a, dt) * 0.006; // lifts a few millimetres
        }
        a.object.updateMatrixWorld();
        a.focus.setFromMatrixPosition(a.object.matrixWorld);
        if (a.bottle) a.focus.y += a.bottle.height * 0.5;
      });
      // the Polaroids stir, the front cover tips forward, the ball rolls a little, the laptop wakes, the coats sway
      const hp = ease("photos", hovered === byId("apt-photos"), dt, 4);
      polaroids.forEach((p, i) => (p.rotation.z = p.userData.r + Math.sin(t * 3 + i) * 0.03 * hp));
      const hb = ease("books", hovered === byId("apt-books"), dt);
      faceOut.forEach((b, i) => (b.rotation.z = -0.12 + hb * (i === 1 ? 0.14 : 0.05)));
      const hv = ease("ball", hovered === byId("apt-volleyball"), dt, 3);
      ball.position.x = 0.78 - hv * 0.03;
      ball.rotation.z = 0.2 + hv * 0.28;
      const hl = ease("laptop", hovered === byId("apt-laptop"), dt, 4);
      lcdMat.color.setRGB(0.55 + hl * 0.4, 0.55 + hl * 0.4, 0.6 + hl * 0.4);
      const hc = ease("coat", hovered === byId("apt-rail"), dt, 4);
      garments.forEach((g, i) => (g.rotation.x = Math.sin(t * 2 + i) * 0.02 * hc));
      pane.userData.tick(reducedMotion ? 0 : t);
      screenT += dt;
      if (drawLoop && screenT > 0.1) { screenT = 0; drawScreen(t); }
      crtGlow.intensity = reducedMotion ? 1.2 : 1.2 + Math.sin(t * 9) * 0.08 + Math.sin(t * 2.3) * 0.15;
      if (!reducedMotion) curtains.forEach((c, i) => (c.rotation.y = Math.sin(t * 0.4 + i) * 0.012));
    },
  };
}
