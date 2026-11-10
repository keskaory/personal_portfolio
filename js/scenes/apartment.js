// Beyond the Work, 2:10 am. A small studio seen from just inside the door,
// arranged in natural areas rather than around one desk:
//   the window (back left)   - rain on the glass, the street's cool light
//   the low table (middle)   - the MacBook open and asleep, a mug, manga, one left open face-down;
//                              a taller stack of manga on the floor beside it
//   the dresser (back right) - the small CRT, a tray with the fragrances, a dish of rings and
//                              earrings; Polaroids taped to the wall above, where the lamp reaches;
//                              the volleyball on the floor in front
//   the left wall            - the clothing rail, the front piece facing the room, boots beneath
// Warmth comes from light, not from more things: the floor lamp, a lamp just
// out of frame, a light on the rail, against the window's cool.
// Arriving: the match cut opens on the rain on this window, then pulls back.
//
// Coordinates: meters; floor y = 0, back wall z = -1.5, left wall x = -1.8,
// the camera near the door at the front right.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { rainWindow } from "../objects/rain-window.js";
import { neonCity } from "../objects/station-textures.js";
import { createBottle } from "../objects/bottle.js";
import { plasterTexture, woodTexture, clothTexture, seeded } from "../objects/textures.js";
import { drawPlaceholder } from "../lib/placeholder-art.js";
import { makeHandle, pose } from "../core/handling.js";
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

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// a muted rug with a simple woven border
function rugTexture() {
  return canvasTex(512, 384, ctx => {
    const rand = seeded(501);
    ctx.fillStyle = "#4b3a33"; ctx.fillRect(0, 0, 512, 384);
    ctx.strokeStyle = "#7a5d45"; ctx.lineWidth = 10; ctx.strokeRect(24, 24, 464, 336);
    ctx.strokeStyle = "#2f2522"; ctx.lineWidth = 4; ctx.strokeRect(44, 44, 424, 296);
    for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,230,210"},${rand() * 0.06})`; ctx.fillRect(rand() * 512, rand() * 384, 2, 1); }
  });
}
// the Molten match ball's white, red and green panels in curved bands (no logo)
function volleyballTexture() {
  return canvasTex(512, 256, ctx => {
    const cols = ["#f3f1ea", "#c8202e", "#f3f1ea", "#1f8a4c", "#f3f1ea", "#c8202e"];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.moveTo((i / 6) * 512, 0);
      ctx.bezierCurveTo((i / 6) * 512 + 70, 90, (i / 6) * 512 - 30, 170, (i / 6) * 512 + 40, 256);
      ctx.lineTo(((i + 1) / 6) * 512 + 40, 256);
      ctx.bezierCurveTo(((i + 1) / 6) * 512 - 30, 170, ((i + 1) / 6) * 512 + 70, 90, ((i + 1) / 6) * 512, 0);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 2;
    for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo((i / 6) * 512, 0); ctx.bezierCurveTo((i / 6) * 512 + 70, 90, (i / 6) * 512 - 30, 170, (i / 6) * 512 + 40, 256); ctx.stroke(); }
  });
}
function polaroidTexture(seed, sample) {
  return canvasTex(300, 360, (ctx, c) => {
    ctx.fillStyle = "#f1ede2"; ctx.fillRect(0, 0, 300, 360);
    const p = document.createElement("canvas"); p.width = 260; p.height = 260;
    drawPlaceholder(p, { format: "photo", seed, label: sample ? "Sample photo" : "" });
    ctx.drawImage(p, 20, 20);
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    for (let i = 0; i < 1500; i++) ctx.fillRect(Math.random() * 300, Math.random() * 360, 1, 1);
  });
}
// a manga spine: the series colour, a pale band where the title goes (as marks, not words), a volume box
function spineTexture(color, seed) {
  return canvasTex(256, 48, ctx => {
    const rand = seeded(seed);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 48);
    ctx.fillStyle = "#f2eee4"; ctx.fillRect(40, 0, 150, 48);
    ctx.fillStyle = "rgba(20,20,20,0.75)";
    for (let x = 52; x < 175; x += 12 + rand() * 6) ctx.fillRect(x, 16 + rand() * 4, 7 + rand() * 4, 14);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(208, 12, 26, 24);
    ctx.fillStyle = color; ctx.fillRect(214, 18, 14, 12);
  });
}
// a garment's flat outline: shoulders, sleeves hanging, body to the hem
function garmentGeo({ sw = 0.21, hw = 0.2, len = 0.7, sleeve = 0.6, hood = false, depth = 0.07 }) {
  const s = new THREE.Shape();
  const half = [[0.06, 0], [sw, -0.05], [sw + 0.035, -sleeve], [sw - 0.06, -sleeve], [sw - 0.065, -0.24], [hw, -len]];
  s.moveTo(-0.06, hood ? 0.07 : 0);
  if (hood) s.quadraticCurveTo(0, 0.12, 0.06, 0.07);
  half.forEach(([x, y]) => s.lineTo(x, y));
  s.lineTo(-hw, -len);
  [...half].reverse().forEach(([x, y]) => s.lineTo(-x, y));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.015, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function buildApartment(scene, content, { reducedMotion = false } = {}) {
  const { fragrances, site } = content;
  const C = content.collections || {};
  scene.background = new THREE.Color("#060605");

  // ---- the room
  const plaster = plasterTexture();
  plaster.repeat.set(3, 2);
  const wallMat = new THREE.MeshStandardMaterial({ map: plaster, color: "#a08c74", roughness: 0.95 });
  const floorTex = woodTexture(531);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(2, 6);
  floorTex.rotation = Math.PI / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.4), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.1);
  floor.receiveShadow = true;
  scene.add(floor);
  const wall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; };
  // back wall around the window opening (x -1.25..-0.15, y 0.95..2.05)
  wall(0.55, 2.6, -1.525, 1.3, -1.5, 0);
  wall(1.95, 2.6, 0.825, 1.3, -1.5, 0);
  wall(1.1, 0.95, -0.7, 0.475, -1.5, 0);
  wall(1.1, 0.55, -0.7, 2.325, -1.5, 0);
  wall(3.4, 2.6, -1.8, 1.3, 0.2, Math.PI / 2);   // left wall
  wall(3.4, 2.6, 1.8, 1.3, 0.2, -Math.PI / 2);   // right wall
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.4), new THREE.MeshStandardMaterial({ color: "#2a2723", roughness: 0.9 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 2.6, 0.1);
  scene.add(ceiling);
  // skirting
  const trim = new THREE.MeshStandardMaterial({ color: "#3a332b", roughness: 0.7 });
  scene.add(box(3.6, 0.08, 0.02, trim, 0, 0.04, -1.49, false));
  scene.add(box(0.02, 0.08, 3.4, trim, -1.79, 0.04, 0.2, false));

  // ---- the window, with the sill for the bottles
  const frameMat = new THREE.MeshStandardMaterial({ color: "#cbc4b4", roughness: 0.6 });
  const pane = rainWindow(1.1, 1.1, { brightness: 0.85, depth: 0.3, fog: 0.5, city: neonCity({ blur: 22, signs: 12 }) });
  pane.position.set(-0.7, 1.5, -1.56);
  scene.add(pane);
  scene.add(box(1.16, 0.04, 0.05, frameMat, -0.7, 2.05, -1.52, false));
  scene.add(box(0.04, 1.14, 0.05, frameMat, -1.27, 1.5, -1.52, false));
  scene.add(box(0.04, 1.14, 0.05, frameMat, -0.13, 1.5, -1.52, false));
  scene.add(box(0.03, 1.1, 0.05, frameMat, -0.7, 1.5, -1.52, false));
  const sillMat = new THREE.MeshStandardMaterial({ color: "#c2baa8", roughness: 0.5 });
  scene.add(box(1.3, 0.035, 0.26, sillMat, -0.7, 0.935, -1.42));
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.5, 10, 1), new THREE.MeshPhysicalMaterial({ color: "#e6dfd0", transmission: 0.7, roughness: 0.8, thickness: 0.001, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
  curtain.position.set(-1.38, 1.45, -1.4);
  curtain.rotation.y = 0.5;
  scene.add(curtain);

  // ---- light: the street through the window, a floor lamp, the CRT's glow
  const street = new THREE.SpotLight("#8cc4c4", 14, 7, 0.55, 0.9, 1.5);
  street.position.set(-1.2, 2.6, -3.2);
  street.target.position.set(-0.3, 0.4, -0.4);
  street.castShadow = true;
  street.shadow.mapSize.set(1024, 1024);
  street.shadow.bias = -0.0003;
  scene.add(street, street.target);
  const lampGroup = new THREE.Group();
  lampGroup.position.set(0.05, 0, -1.25);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.24, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#d9c8a6", emissive: new THREE.Color("#ffa956"), emissiveIntensity: 0.8, side: THREE.DoubleSide, roughness: 1 }));
  lampShade.position.y = 1.42;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 8), new THREE.MeshStandardMaterial({ color: "#2b2621", metalness: 0.6, roughness: 0.4 }));
  pole.position.y = 0.7;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.025, 20), pole.material);
  lampGroup.add(lampShade, pole, base);
  scene.add(lampGroup);
  const lamp = new THREE.PointLight("#ffb26a", 7.5, 6, 1.4);
  lamp.position.set(0.05, 1.38, -1.2);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  lamp.shadow.radius = 4;
  lamp.shadow.bias = -0.002;
  scene.add(lamp);
  scene.add(new THREE.HemisphereLight("#55493a", "#1a140e", 1.45));
  // a bedside lamp just out of frame to the right, warm on the table and the dresser
  const bedside = new THREE.PointLight("#ffc890", 4.5, 4.5, 1.4);
  bedside.position.set(1.55, 1.0, 0.7);
  scene.add(bedside);
  // a small track light over the rail, so the clothes read
  const railSpot = new THREE.SpotLight("#ffd6a8", 9, 4, 0.55, 0.8, 1.4);
  railSpot.position.set(-0.6, 2.55, 1.2);
  railSpot.target.position.set(-1.45, 1.0, 0.55);
  scene.add(railSpot, railSpot.target);
  const attention = new THREE.SpotLight("#ffe7cc", 0, 4, 0.22, 1, 2);
  attention.position.set(1.2, 1.9, 1.2);
  scene.add(attention, attention.target);

  const artifacts = [];
  const add = a => { a.focus = new THREE.Vector3(); (a.hits || [a.hit]).forEach(h => (h.userData.id = a.id)); artifacts.push(a); return a; };
  // look at a point from a direction, with the note on one side
  const shotAt = (target, from, side = "right", fov = 38) => portrait => portrait
    ? { side: "bottom", position: target.clone().add(from.clone().multiplyScalar(1.45)).add(V(0, 0.08, 0)), target: target.clone().add(V(0, -0.06, 0)), fov: fov + 10 }
    : { side, position: target.clone().add(from), target: target.clone().add(side === "right" ? V(0.06, 0, 0) : V(-0.06, 0, 0)), fov };
  const collectionPanel = (key, extra = {}) => () => {
    const c = C[key] || {};
    return {
      title: c.title || key,
      body: c.intro,
      list: c.items && c.items.length ? { heading: "In the collection", items: c.items } : null,
      actions: [{ label: "See everything", href: "contents.html#beyond", page: true }, ...(extra.actions || [])],
      sample: c.sample,
    };
  };

  // ---- the dresser: the CRT at one end; a tray with the fragrances and a dish of jewellery
  const cabinetMat = new THREE.MeshStandardMaterial({ map: woodTexture(551), roughness: 0.45 });
  const DRESSER_Y = 0.52;
  scene.add(box(1.3, DRESSER_Y, 0.42, cabinetMat, 0.98, DRESSER_Y / 2, -1.28));
  [0.13, 0.36].forEach(y => scene.add(box(1.26, 0.006, 0.005, new THREE.MeshStandardMaterial({ color: "#1c140e" }), 0.98, y, -1.068, false))); // drawer lines
  [0.6, 1.36].forEach(x => [0.24, 0.45].forEach(y => scene.add(box(0.06, 0.012, 0.015, new THREE.MeshStandardMaterial({ color: "#b8a57e", metalness: 0.8, roughness: 0.3 }), x, y, -1.06, false))));
  const tray = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.014, 0.17, 2, 0.005), new THREE.MeshStandardMaterial({ color: "#2a2522", roughness: 0.25, metalness: 0.2 }));
  tray.position.set(0.66, DRESSER_Y + 0.007, -1.33);
  tray.castShadow = tray.receiveShadow = true;
  scene.add(tray);
  const trayTop = DRESSER_Y + 0.014;
  const spots = [{ x: 0.56, z: -1.35, ry: 0.15 }, { x: 0.67, z: -1.31, ry: -0.3 }, { x: 0.77, z: -1.36, ry: 0.35 }];
  fragrances.slice(0, spots.length).forEach((data, i) => {
    const bottle = createBottle(data, i + 1);
    const s = spots[i];
    bottle.group.position.set(s.x, trayTop, s.z);
    bottle.group.rotation.y = s.ry;
    bottle.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(bottle.group);
    const hit = hitBox(0.09, bottle.height * 1.1, 0.09);
    hit.position.y = bottle.height / 2;
    bottle.group.add(hit);
    const a = add({
      id: data.id, stop: "rest", hit, object: bottle.group, data, bottle,
      caption: `${data.name}, ${data.size} ml`,
      restY: s.ry, spin: s.ry,
      examine: portrait => {
        const c = V(s.x, trayTop + bottle.height * 0.5, s.z);
        return portrait
          ? { side: "bottom", position: c.clone().add(V(-0.08, 0.06, 0.55)), target: c.clone().add(V(0, -0.04, 0)), fov: 30 }
          : { side: "left", position: c.clone().add(V(-0.1, 0.03, 0.42)), target: c.clone().add(V(-0.07, 0, 0)), fov: 28 };
      },
      leave: () => ({ position: V(s.x, trayTop + bottle.height * 0.5, s.z + 0.16), target: V(s.x, trayTop + bottle.height * 0.5, s.z), fov: 24 }),
      drag: dx => { a.spin += dx * 0.012; },
      release: () => { const turns = Math.round((bottle.group.rotation.y - a.restY) / (Math.PI * 2)); a.spin = a.restY + turns * Math.PI * 2; },
      panel: () => ({
        title: data.name, meta: `${data.size} ml`, body: data.short, hint: "Drag to turn it.",
        actions: [{ label: "Read about it", href: urls.fragrance(data.id), page: true }], sample: data.sample,
      }),
    });
  });
  // jewellery: silver rings, two small hoops, a chain, on a dark glazed dish so the silver shows
  const dish = new THREE.Group();
  dish.position.set(0.96, DRESSER_Y, -1.2);
  dish.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.018, 28), new THREE.MeshPhysicalMaterial({ color: "#1d2a2c", roughness: 0.15, clearcoat: 1 })));
  const silver = new THREE.MeshStandardMaterial({ color: "#e4e4e0", metalness: 1, roughness: 0.14 });
  [[0.025, 0.016, 0.012, 0.3, 0.0125, 0.0032], [-0.022, 0.015, -0.018, 1.2, 0.011, 0.0026], [0.004, 0.018, 0.03, 2.1, 0.0115, 0.004], [-0.035, 0.013, 0.02, 0.6, 0.008, 0.0012], [-0.028, 0.013, 0.036, 1.9, 0.008, 0.0012]].forEach(([x, y, z, r, R, t]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, t, 10, 28), silver);
    ring.rotation.set(Math.PI / 2 - 0.25, 0, r);
    ring.position.set(x, y, z);
    ring.castShadow = true;
    dish.add(ring);
  });
  const chainPts = [];
  for (let i = 0; i < 18; i++) chainPts.push(V(Math.cos(i * 0.75) * 0.04 + 0.01, 0.012 + (i % 2) * 0.002, Math.sin(i * 0.75) * 0.032 - 0.005));
  dish.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts), 90, 0.0016, 5), silver));
  const dishHit = hitBox(0.2, 0.1, 0.2);
  dish.add(dishHit);
  scene.add(dish);
  // a small spot from the lamp's side catches the silver
  const glint = new THREE.SpotLight("#fff0dc", 3, 2.2, 0.18, 0.6, 1.5);
  glint.position.set(0.6, 1.5, -0.6);
  glint.target.position.set(0.96, DRESSER_Y, -1.2);
  scene.add(glint, glint.target);

  // the CRT at the dresser's left end
  const crt = new THREE.Group();
  crt.position.set(1.3, DRESSER_Y, -1.27);
  crt.rotation.y = -0.38;
  const crtBody = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.37, 0.4, 3, 0.03), new THREE.MeshStandardMaterial({ color: "#2b2a28", roughness: 0.55 }));
  crtBody.position.y = 0.185;
  crtBody.castShadow = true;
  const screenC = document.createElement("canvas");
  screenC.width = 128; screenC.height = 96;
  const screenTex = new THREE.CanvasTexture(screenC);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.25), new THREE.MeshBasicMaterial({ map: screenTex, color: new THREE.Color(1.3, 1.3, 1.3) }));
  screen.position.set(-0.02, 0.19, 0.201);
  crt.add(crtBody, screen);
  const crtHit = hitBox(0.5, 0.42, 0.45);
  crtHit.position.y = 0.19;
  crt.add(crtHit);
  scene.add(crt);
  const crtGlow = new THREE.PointLight("#8fb6c8", 1.4, 3, 1.6);
  crtGlow.position.set(1.22, 0.72, -0.95);
  scene.add(crtGlow);
  let channel = 0;
  const channelColors = [["#2a4d6e", "#c98a4b"], ["#5b2a33", "#d9b37a"], ["#24453a", "#b9d1c2"]];
  function drawScreen(t) {
    const ctx = screenC.getContext("2d");
    const [a, b] = channelColors[channel % channelColors.length];
    const g = ctx.createLinearGradient(0, 0, 128, 96);
    const k = (Math.sin(t * 0.3) + 1) / 2;
    g.addColorStop(0, a); g.addColorStop(0.4 + k * 0.4, b); g.addColorStop(1, a);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 96);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < 96; y += 2) ctx.fillRect(0, y, 128, 1);
    for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; ctx.fillRect(Math.random() * 128, Math.random() * 96, 1, 1); }
    screenTex.needsUpdate = true;
  }
  drawScreen(0);

  // Polaroids taped to the wall above the dresser, in the lamp's light
  const photos = (C.photos?.items || ["", "", ""]);
  const tape = new THREE.MeshStandardMaterial({ color: "#efe6c8", roughness: 0.6, transparent: true, opacity: 0.7 });
  const pins = [[0.5, 1.5, -0.05], [0.7, 1.44, 0.06], [0.9, 1.52, -0.03], [1.1, 1.43, 0.05], [1.3, 1.5, -0.07]];
  const polaroids = pins.map(([x, y, r], i) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.132), new THREE.MeshStandardMaterial({ map: polaroidTexture(70 + i, C.photos?.sample), roughness: 0.55 }));
    m.castShadow = true;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.016), tape);
    strip.position.set(0, 0.064, 0.001);
    strip.rotation.z = (i % 2 ? 0.2 : -0.15);
    g.add(m, strip);
    g.position.set(x, y, -1.494);
    g.rotation.z = r;
    scene.add(g);
    return g;
  }).slice(0, Math.max(3, Math.min(pins.length, photos.length + 2)));
  const polaroidHit = hitBox(1.0, 0.26, 0.05);
  polaroidHit.position.set(0.9, 1.47, -1.47);
  scene.add(polaroidHit);
  // the volleyball, on the floor in front of the dresser
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.105, 32, 24), new THREE.MeshStandardMaterial({ map: volleyballTexture(), roughness: 0.55 }));
  ball.position.set(0.78, 0.105, -0.72);
  ball.rotation.set(0.4, 0.8, 0.2);
  ball.castShadow = true;
  scene.add(ball);

  // ---- the low table on the rug: the MacBook open and asleep, a mug, manga
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.2), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-0.15, 0.004, -0.2);
  rug.receiveShadow = true;
  scene.add(rug);
  const tableWood = new THREE.MeshStandardMaterial({ map: woodTexture(533), roughness: 0.45 });
  scene.add(box(0.95, 0.035, 0.55, tableWood, -0.15, 0.36, -0.25));
  [[-0.58, -0.47], [0.28, -0.47], [-0.58, -0.03], [0.28, -0.03]].forEach(([x, z]) => scene.add(box(0.04, 0.34, 0.04, tableWood, x, 0.17, z)));
  const laptop = new THREE.Group();
  laptop.position.set(-0.36, 0.378, -0.3);
  laptop.rotation.y = 0.35;
  const alu = new THREE.MeshStandardMaterial({ color: "#b4b6b6", metalness: 0.85, roughness: 0.32 });
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.009, 0.215, 2, 0.004), alu);
  shell.position.y = 0.0045;
  shell.castShadow = shell.receiveShadow = true;
  laptop.add(shell);
  // keyboard and trackpad, dark on the aluminium
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
  // the lid, open past upright; the screen dimmed, asleep on a dark desktop
  const lid = new THREE.Group();
  lid.position.set(0, 0.009, -0.107);
  lid.rotation.x = -1.86 + Math.PI / 2;
  const lidShell = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.006, 0.21, 2, 0.003), alu);
  lidShell.position.set(0, 0, -0.105);
  lidShell.rotation.x = 0;
  const lidWrap = new THREE.Group();
  lidWrap.rotation.x = Math.PI / 2;
  lidWrap.add(lidShell);
  const screenTexL = canvasTex(512, 340, ctx => {
    const g = ctx.createLinearGradient(0, 0, 512, 340);
    g.addColorStop(0, "#1c2a3a"); g.addColorStop(1, "#3a2a3a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = "rgba(240,240,240,0.9)"; ctx.fillRect(0, 0, 512, 12);
    ctx.fillStyle = "rgba(18,20,24,0.92)"; ctx.fillRect(60, 50, 300, 210);
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(60, 50, 300, 18);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = ["#7fb3d5", "#e6b17a", "#c7c7c7", "#9fcf9f"][i % 4]; ctx.fillRect(76 + (i % 3) * 12, 82 + i * 14, 60 + ((i * 37) % 140), 5); }
    ctx.fillStyle = "rgba(240,240,240,0.35)"; ctx.fillRect(150, 312, 212, 22);
  });
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.19), new THREE.MeshBasicMaterial({ map: screenTexL, color: new THREE.Color(0.55, 0.55, 0.6) }));
  lcd.position.set(0, 0.0036, -0.105); // on the inside of the lid, facing the keyboard
  lcd.rotation.x = -Math.PI / 2;
  lidWrap.add(lcd);
  lid.add(lidWrap);
  laptop.add(lid);
  const sleep = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.002), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  sleep.position.set(0.1, 0.004, 0.108);
  laptop.add(sleep);
  const glow = new THREE.PointLight("#b9c8e6", 0.9, 1.2, 2);
  glow.position.set(0, 0.12, 0.05);
  laptop.add(glow);
  const laptopHit = hitBox(0.36, 0.26, 0.3);
  laptopHit.position.set(0, 0.1, -0.05);
  laptop.add(laptopHit);
  scene.add(laptop);
  // its charger cable running off the table toward the wall
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.5, 0.385, -0.38), V(-0.6, 0.38, -0.5), V(-0.63, 0.2, -0.53), V(-0.66, 0.01, -0.7), V(-0.9, 0.006, -1.2), V(-1.1, 0.006, -1.45)]), 40, 0.003, 5), new THREE.MeshStandardMaterial({ color: "#e9e7e2", roughness: 0.5 })));
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.037, 0.09, 18), new THREE.MeshStandardMaterial({ color: "#2f3d3a", roughness: 0.4 }));
  mug.position.set(0.1, 0.423, -0.1);
  mug.castShadow = true;
  scene.add(mug);

  // manga: two on the table, one left open face-down, a taller stack on the floor with the spines toward you
  const covers = ["#c43c2c", "#e8e1d2", "#1f2a3c", "#d8a63a", "#3f5f4a", "#a5a39b", "#7a2f43", "#2c6e8a", "#e07a3a", "#6b4a8a"];
  const book = (i, x, y, z, ry, rz = 0) => {
    const g = new THREE.Group();
    const col = covers[i % covers.length];
    const spine = new THREE.MeshStandardMaterial({ map: spineTexture(col, 600 + i), roughness: 0.6 });
    const pages = new THREE.MeshStandardMaterial({ color: "#ece5d3", roughness: 0.9 });
    const cover = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 });
    // spine on -x; the spine texture runs along z
    spine.map.center.set(0.5, 0.5);
    spine.map.rotation = Math.PI / 2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.017, 0.182), [pages, spine, cover, cover, pages, pages]);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
    g.position.set(x, y + 0.0085, z);
    g.rotation.set(0, ry, rz);
    scene.add(g);
    return g;
  };
  const rand = seeded(541);
  book(1, 0.14, 0.378, -0.4, 0.6);
  book(4, 0.15, 0.395, -0.41, 0.45);
  // the open one, a shallow tent on the table
  const open = new THREE.Group();
  const halfCover = new THREE.MeshStandardMaterial({ color: covers[7], roughness: 0.55 });
  [-1, 1].forEach(s => {
    const half = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.006, 0.182), [halfCover, halfCover, halfCover, new THREE.MeshStandardMaterial({ color: "#ece5d3" }), halfCover, halfCover]);
    half.position.set(s * 0.062, 0.014, 0);
    half.rotation.z = -s * 0.16;
    half.castShadow = true;
    open.add(half);
  });
  open.position.set(-0.02, 0.378, -0.08);
  open.rotation.y = -0.4;
  scene.add(open);
  const floorStack = [];
  const stackAt = V(0.52, 0, -0.32);
  for (let i = 0; i < 11; i++) floorStack.push(book(i, stackAt.x + (rand() - 0.5) * 0.018, i * 0.0172, stackAt.z + (rand() - 0.5) * 0.018, 1.99 + (rand() - 0.5) * 0.25));
  const stackHit = hitBox(0.26, 0.22, 0.26);
  stackHit.position.set(stackAt.x, 0.1, stackAt.z);
  scene.add(stackHit);

  // ---- the clothing rail on the left wall; the front piece faces the room; boots beneath
  const railMat = new THREE.MeshStandardMaterial({ color: "#2a2a28", metalness: 0.7, roughness: 0.4 });
  const RAIL_X = -1.5;
  scene.add(box(0.025, 1.6, 0.025, railMat, RAIL_X, 0.8, -0.1));
  scene.add(box(0.025, 1.6, 0.025, railMat, RAIL_X, 0.8, 1.0));
  scene.add(box(0.025, 0.025, 1.1, railMat, RAIL_X, 1.6, 0.45));
  const pieces = [
    { z: 0.0, color: "#3a3b3f", sw: 0.22, hw: 0.23, len: 1.0, sleeve: 0.72 },              // a long charcoal coat
    { z: 0.2, color: "#d8cfbd", sw: 0.2, hw: 0.19, len: 0.66, sleeve: 0.6 },               // a cream knit
    { z: 0.38, color: "#2c3a52", sw: 0.21, hw: 0.2, len: 0.62, sleeve: 0.58 },             // a denim jacket
    { z: 0.56, color: "#5a1d1a", sw: 0.2, hw: 0.19, len: 0.7, sleeve: 0.62 },              // an oxblood shirt
    { z: 0.82, color: "#18181a", sw: 0.23, hw: 0.22, len: 0.68, sleeve: 0.64, hood: true }, // the black hoodie, in front
  ];
  const garments = pieces.map((p, i) => {
    const g = new THREE.Group();
    const hanger = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.005, 4, 18, Math.PI), new THREE.MeshStandardMaterial({ color: "#6b4a2e", roughness: 0.5 }));
    hanger.rotation.z = 0;
    hanger.scale.set(1, 0.32, 1);
    hanger.position.y = -0.05;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 4, 10, Math.PI * 1.4), railMat);
    hook.position.y = -0.01;
    const cloth = new THREE.Mesh(garmentGeo({ ...p, depth: p.hood ? 0.08 : 0.06 }), new THREE.MeshStandardMaterial({ map: clothTexture(p.color), roughness: 0.92 }));
    cloth.position.y = -0.06;
    cloth.castShadow = cloth.receiveShadow = true;
    g.add(hanger, hook, cloth);
    g.position.set(RAIL_X, 1.6, p.z);
    g.rotation.y = i === pieces.length - 1 ? 1.25 : 0.72 + (i % 2 ? 0.08 : -0.04); // fanned along the rail, the front one turned toward the room
    scene.add(g);
    return g;
  });
  const railHit = hitBox(0.5, 1.1, 1.15);
  railHit.position.set(RAIL_X, 1.05, 0.45);
  scene.add(railHit);
  // the chunky boots: a thick lug sole, a shaft, a rounded toe
  const bootShape = new THREE.Shape();
  bootShape.moveTo(-0.06, 0); bootShape.lineTo(0.2, 0); bootShape.quadraticCurveTo(0.24, 0.0, 0.24, 0.05);
  bootShape.quadraticCurveTo(0.24, 0.085, 0.16, 0.095); bootShape.lineTo(0.06, 0.12); bootShape.lineTo(0.055, 0.24);
  bootShape.lineTo(-0.06, 0.24); bootShape.lineTo(-0.065, 0.06); bootShape.lineTo(-0.06, 0);
  const bootGeo = new THREE.ExtrudeGeometry(bootShape, { depth: 0.085, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 });
  bootGeo.translate(0, 0.035, -0.0425);
  const leather = new THREE.MeshPhysicalMaterial({ color: "#0f0f10", roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const sole = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.85 });
  [0.36, 0.5].forEach((z, i) => {
    const b = new THREE.Group();
    const upper = new THREE.Mesh(bootGeo, leather);
    const lug = new THREE.Mesh(new RoundedBoxGeometry(0.33, 0.04, 0.12, 2, 0.01), sole);
    lug.position.set(0.09, 0.02, 0);
    [upper, lug].forEach(m => { m.castShadow = true; b.add(m); });
    b.position.set(-1.42, 0, z);
    b.rotation.y = -Math.PI / 2 + 0.25 + i * 0.12;
    scene.add(b);
  });

  // ---- the other artifacts
  add({
    id: "apt-books", stop: "rest", hits: [stackHit], object: floorStack[floorStack.length - 1], caption: "Look through the manga",
    examine: shotAt(V(0.52, 0.13, -0.32), V(0.3, 0.3, 0.48), "left", 40),
    panel: collectionPanel("books"),
  });
  add({
    id: "apt-laptop", stop: "rest", hits: [laptopHit], object: laptop, caption: "What's on the laptop",
    examine: shotAt(V(-0.36, 0.47, -0.32), V(0.28, 0.26, 0.5), "right", 38),
    panel: collectionPanel("laptop", { actions: linkOr(site.links.github, "") ? [{ label: "GitHub", href: site.links.github }] : [] }),
  });
  add({
    id: "apt-crt", stop: "rest", hits: [crtHit], object: crt, caption: "Films I return to",
    examine: shotAt(V(1.3, 0.72, -1.22), V(-0.25, 0.06, 0.88), "left", 34),
    panel: collectionPanel("films"),
    onExamine: () => { channel++; },
  });
  add({
    id: "apt-jewelry", stop: "rest", hits: [dishHit], object: dish, caption: "Rings and chains",
    examine: shotAt(V(0.96, 0.54, -1.2), V(-0.14, 0.3, 0.32), "left", 30),
    panel: collectionPanel("jewelry"),
  });
  add({
    id: "apt-photos", stop: "rest", hits: [polaroidHit], object: polaroids[2], caption: "Look at the Polaroids",
    examine: portrait => portrait
      ? { side: "bottom", position: V(0.9, 1.3, 0.3), target: V(0.9, 1.3, -1.49), fov: 44 }
      : { side: "right", position: V(0.9, 1.47, 0.0), target: V(1.2, 1.47, -1.49), fov: 34 },
    panel: collectionPanel("photos"),
  });
  add({
    id: "apt-volleyball", stop: "rest", hit: ball, object: ball, caption: "The volleyball",
    examine: shotAt(V(0.78, 0.12, -0.72), V(0.22, 0.3, 0.6), "left", 36),
    panel: collectionPanel("volleyball"),
  });
  add({
    id: "apt-rail", stop: "rest", hits: [railHit], object: garments[garments.length - 1], caption: "What I wear",
    examine: shotAt(V(-1.45, 1.1, 0.5), V(1.6, 0.15, 0.6), "right", 46),
    panel: collectionPanel("style"),
  });
  artifacts.forEach(a => { if (!a.leave) a.leave = () => { const s = a.examine(false); return { ...s, position: s.position.clone().lerp(s.target, 0.3), fov: s.fov - 4 }; }; });

  const restFocusPoint = V(-0.15, 0.45, -0.4);
  let screenT = 0;
  return {
    artifacts,
    shots: {
      rest: { position: V(1.42, 1.45, 1.75), target: V(-0.42, 0.78, -0.8), fov: 50 },
      restPortrait: { position: V(1.05, 1.5, 2.0), target: V(0.32, 0.72, -0.9), fov: 66 },
    },
    // the match cut lands here: the rain on this window, close up, before pulling back
    entryShot: () => ({ position: V(-0.62, 1.52, -0.98), target: V(-0.7, 1.52, -1.6), fov: 34 }),
    restFocus: () => restFocusPoint,
    dof: { rest: 0.008, examine: 0.03 },
    lights: { attention },
    update(t, dt) {
      artifacts.forEach(a => {
        if (a.bottle) {
          const g = a.bottle.group;
          g.rotation.y += (a.spin - g.rotation.y) * Math.min(1, dt * 5);
        }
        a.object.updateMatrixWorld();
        a.focus.setFromMatrixPosition(a.object.matrixWorld);
        if (a.bottle) a.focus.y += a.bottle.height * 0.5;
      });
      pane.userData.tick(t);
      // the laptop's sleep light breathes; the CRT's picture drifts and its glow flickers
      sleep.material.color.setScalar(0.25 + (Math.sin(t * 1.7) + 1) * 0.6);
      screenT += dt;
      if (screenT > 0.1) { screenT = 0; drawScreen(t); }
      crtGlow.intensity = reducedMotion ? 1.4 : 1.4 + Math.sin(t * 9) * 0.08 + Math.sin(t * 2.3) * 0.15;
      if (!reducedMotion) curtain.rotation.y = 0.5 + Math.sin(t * 0.4) * 0.03;
    },
  };
}
