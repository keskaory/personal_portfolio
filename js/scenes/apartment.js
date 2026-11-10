// Beyond the Work, 2:10 am. A small studio seen from just inside the door,
// arranged in natural areas rather than around one desk:
//   the window (back left)  - fragrance bottles on the sill, rain on the glass
//   the low table (middle)  - the closed MacBook, a mug, manga on the table and stacked on the floor
//   the cabinet (back right) - a small CRT glowing, a dish of rings, Polaroids on a string above,
//                              the volleyball resting on the floor in front
//   the left wall            - a clothing rail with a few pieces, boots beneath
// Arriving: the match cut opens on the rain on this window, then pulls back.
//
// Coordinates: meters; floor y = 0, back wall z = -1.5, left wall x = -1.8,
// the camera near the door at the front right.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { rainWindow } from "../objects/rain-window.js";
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
// classic volleyball panels: three colors in curved bands (no logo)
function volleyballTexture() {
  return canvasTex(512, 256, ctx => {
    const cols = ["#f1eee6", "#2b55a3", "#e5c232"];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i % 3];
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
function spineTexture(color, seed) {
  return canvasTex(64, 256, ctx => {
    const rand = seeded(seed);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 64, 256);
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillRect(12, 30 + rand() * 30, 40, 6);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0, 210, 64, 46);
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(22, 222, 20, 20);
  });
}

export function buildApartment(scene, content, { reducedMotion = false } = {}) {
  const { fragrances, site } = content;
  const C = content.collections || {};
  scene.background = new THREE.Color("#060605");

  // ---- the room
  const plaster = plasterTexture();
  plaster.repeat.set(3, 2);
  const wallMat = new THREE.MeshStandardMaterial({ map: plaster, color: "#8b8273", roughness: 0.95 });
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
  const pane = rainWindow(1.1, 1.1, { brightness: 1.0, depth: 0.3, fog: 0.4 });
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
  const street = new THREE.SpotLight("#a9c4c0", 15, 7, 0.55, 0.9, 1.5);
  street.position.set(-1.2, 2.6, -3.2);
  street.target.position.set(-0.3, 0.4, -0.4);
  street.castShadow = true;
  street.shadow.mapSize.set(1024, 1024);
  street.shadow.bias = -0.0003;
  scene.add(street, street.target);
  const lampGroup = new THREE.Group();
  lampGroup.position.set(0.05, 0, -1.25);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.24, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#d9c8a6", emissive: new THREE.Color("#ffb062"), emissiveIntensity: 0.55, side: THREE.DoubleSide, roughness: 1 }));
  lampShade.position.y = 1.42;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 8), new THREE.MeshStandardMaterial({ color: "#2b2621", metalness: 0.6, roughness: 0.4 }));
  pole.position.y = 0.7;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.025, 20), pole.material);
  lampGroup.add(lampShade, pole, base);
  scene.add(lampGroup);
  const lamp = new THREE.PointLight("#ffbf80", 5.5, 6, 1.5);
  lamp.position.set(0.05, 1.38, -1.2);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  lamp.shadow.radius = 4;
  lamp.shadow.bias = -0.002;
  scene.add(lamp);
  scene.add(new THREE.HemisphereLight("#34362f", "#100d0a", 1.15));
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

  // ---- the window: fragrance bottles on the sill (the ledge's bottles and handling)
  const sillTop = 0.952;
  const spots = [{ x: -1.02, z: -1.4, ry: 0.15 }, { x: -0.86, z: -1.37, ry: -0.25 }, { x: -0.74, z: -1.42, ry: 0.4 }];
  fragrances.slice(0, spots.length).forEach((data, i) => {
    const bottle = createBottle(data, i + 1);
    const s = spots[i];
    bottle.group.position.set(s.x, sillTop, s.z);
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
        const c = V(s.x, sillTop + bottle.height * 0.5, s.z);
        return portrait
          ? { side: "bottom", position: c.clone().add(V(0.05, 0.05, 0.55)), target: c.clone().add(V(0, -0.04, 0)), fov: 30 }
          : { side: "right", position: c.clone().add(V(-0.02, 0.02, 0.42)), target: c.clone().add(V(0.07, 0, 0)), fov: 28 };
      },
      leave: () => ({ position: V(s.x, sillTop + bottle.height * 0.5, s.z + 0.15), target: V(s.x, sillTop + bottle.height * 0.5, s.z), fov: 24 }),
      drag: dx => { a.spin += dx * 0.012; },
      release: () => { const turns = Math.round((bottle.group.rotation.y - a.restY) / (Math.PI * 2)); a.spin = a.restY + turns * Math.PI * 2; },
      panel: () => ({
        title: data.name, meta: `${data.size} ml`, body: data.short, hint: "Drag to turn it.",
        actions: [{ label: "Read about it", href: urls.fragrance(data.id), page: true }], sample: data.sample,
      }),
    });
  });

  // ---- the low table on the rug: MacBook, mug, manga
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.2), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-0.15, 0.004, -0.2);
  rug.receiveShadow = true;
  scene.add(rug);
  const tableWood = new THREE.MeshStandardMaterial({ map: woodTexture(533), roughness: 0.5 });
  scene.add(box(0.95, 0.035, 0.55, tableWood, -0.15, 0.36, -0.25));
  [[-0.58, -0.47], [0.28, -0.47], [-0.58, -0.03], [0.28, -0.03]].forEach(([x, z]) => scene.add(box(0.04, 0.34, 0.04, tableWood, x, 0.17, z)));
  const laptop = new THREE.Group();
  laptop.position.set(-0.32, 0.378, -0.27);
  laptop.rotation.y = 0.22;
  const alu = new THREE.MeshStandardMaterial({ color: "#a9abaa", metalness: 0.85, roughness: 0.35 });
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.016, 0.215, 2, 0.006), alu);
  shell.castShadow = shell.receiveShadow = true;
  laptop.add(shell);
  const sleep = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.002), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  sleep.position.set(0.1, 0.0, 0.108);
  laptop.add(sleep);
  const laptopHit = hitBox(0.36, 0.06, 0.26);
  laptop.add(laptopHit);
  scene.add(laptop);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.037, 0.09, 18), new THREE.MeshStandardMaterial({ color: "#2f3d3a", roughness: 0.4 }));
  mug.position.set(0.08, 0.423, -0.12);
  mug.castShadow = true;
  scene.add(mug);
  // manga: a few on the table, a taller stack on the floor
  const covers = ["#c43c2c", "#e8e1d2", "#1f2a3c", "#d8a63a", "#3f5f4a", "#a5a39b", "#7a2f43"];
  const book = (i, x, y, z, ry) => {
    const g = new THREE.Group();
    const side = new THREE.MeshStandardMaterial({ map: spineTexture(covers[i % covers.length], 600 + i), roughness: 0.7 });
    const pages = new THREE.MeshStandardMaterial({ color: "#e9e2d1", roughness: 0.9 });
    const cover = new THREE.MeshStandardMaterial({ color: covers[i % covers.length], roughness: 0.6 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.016, 0.182), [pages, side, cover, cover, pages, pages]);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
    g.position.set(x, y + 0.008, z);
    g.rotation.y = ry;
    scene.add(g);
    return g;
  };
  const rand = seeded(541);
  const tableBooks = [book(1, 0.12, 0.378, -0.38, 0.6), book(4, 0.14, 0.394, -0.39, 0.45)];
  const floorStack = [];
  for (let i = 0; i < 7; i++) floorStack.push(book(i, 0.52 + (rand() - 0.5) * 0.02, i * 0.0165, -0.5 + (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.4));
  const stackHit = hitBox(0.25, 0.16, 0.25);
  stackHit.position.set(0.52, 0.07, -0.5);
  scene.add(stackHit);

  // ---- the cabinet: the CRT, a dish of rings; Polaroids above; the volleyball in front
  const cabinetMat = new THREE.MeshStandardMaterial({ map: woodTexture(551), roughness: 0.5 });
  scene.add(box(0.95, 0.5, 0.4, cabinetMat, 0.95, 0.25, -1.28));
  const crt = new THREE.Group();
  crt.position.set(0.82, 0.5, -1.26);
  crt.rotation.y = -0.25;
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
  const crtGlow = new THREE.PointLight("#8fb6c8", 1.6, 3, 1.6);
  crtGlow.position.set(0.78, 0.7, -0.95);
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
  // the dish of rings and a chain
  const dish = new THREE.Group();
  dish.position.set(1.28, 0.5, -1.18);
  dish.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.02, 20), new THREE.MeshStandardMaterial({ color: "#d7cfc0", roughness: 0.3 })));
  const silver = new THREE.MeshStandardMaterial({ color: "#d0d0cd", metalness: 1, roughness: 0.2 });
  [[0.02, 0.014, 0.01, 0.3], [-0.02, 0.013, -0.015, 1.2], [0.0, 0.016, 0.025, 2.1]].forEach(([x, y, z, r]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0028, 8, 20), silver);
    ring.rotation.set(Math.PI / 2 - 0.2, 0, r);
    ring.position.set(x, y, z);
    dish.add(ring);
  });
  const chainPts = [];
  for (let i = 0; i < 14; i++) chainPts.push(V(Math.cos(i * 0.9) * 0.035, 0.012 + (i % 2) * 0.002, Math.sin(i * 0.9) * 0.03));
  dish.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts), 60, 0.0015, 4), silver));
  const dishHit = hitBox(0.2, 0.1, 0.2);
  dish.add(dishHit);
  scene.add(dish);
  // Polaroids on a string above the cabinet
  const stringPts = [V(0.48, 1.78, -1.48), V(0.95, 1.72, -1.48), V(1.45, 1.77, -1.48)];
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stringPts), 30, 0.0016, 4), new THREE.MeshStandardMaterial({ color: "#c9b99a", roughness: 0.8 })));
  const photos = (C.photos?.items || ["", "", ""]).slice(0, 3);
  const polaroids = photos.map((cap, i) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.108), new THREE.MeshStandardMaterial({ map: polaroidTexture(70 + i, C.photos?.sample), roughness: 0.6, side: THREE.DoubleSide }));
    m.position.y = -0.058;
    m.castShadow = true;
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.008), new THREE.MeshStandardMaterial({ color: "#b48a58", roughness: 0.7 }));
    g.add(m, clip);
    const x = 0.65 + i * 0.32;
    g.position.set(x, 1.745 + (i === 1 ? -0.025 : 0), -1.475);
    g.rotation.z = (i - 1) * 0.06;
    scene.add(g);
    return g;
  });
  const polaroidHit = hitBox(0.85, 0.16, 0.05);
  polaroidHit.position.set(0.97, 1.69, -1.47);
  scene.add(polaroidHit);
  // the volleyball, resting on the floor
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.105, 28, 20), new THREE.MeshStandardMaterial({ map: volleyballTexture(), roughness: 0.6 }));
  ball.position.set(0.42, 0.105, -0.88);
  ball.rotation.set(0.4, 0.8, 0.2);
  ball.castShadow = true;
  scene.add(ball);

  // ---- the clothing rail on the left wall, boots beneath
  const railMat = new THREE.MeshStandardMaterial({ color: "#2a2a28", metalness: 0.7, roughness: 0.4 });
  scene.add(box(0.025, 1.6, 0.025, railMat, -1.55, 0.8, 0.0));
  scene.add(box(0.025, 1.6, 0.025, railMat, -1.55, 0.8, 0.95));
  scene.add(box(0.025, 0.025, 1.0, railMat, -1.55, 1.6, 0.475));
  const garments = [["#26272b", 0.12, 0.82], ["#4a3a2c", 0.42, 0.95], ["#d6cdbb", 0.7, 0.74], ["#1b1c1e", 0.86, 0.9]].map(([color, z, len], i) => {
    const g = new THREE.Group();
    const hanger = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.006, 4, 16, Math.PI), railMat);
    hanger.position.y = -0.03;
    hanger.rotation.y = Math.PI / 2;
    const cloth = new THREE.Mesh(new RoundedBoxGeometry(0.06, len, 0.4, 2, 0.02), new THREE.MeshStandardMaterial({ map: clothTexture(color), roughness: 0.95 }));
    cloth.position.y = -0.05 - len / 2;
    cloth.castShadow = true;
    g.add(hanger, cloth);
    g.position.set(-1.55, 1.6, z);
    g.rotation.y = (i % 2 ? 0.1 : -0.08);
    scene.add(g);
    return g;
  });
  const railHit = hitBox(0.4, 1.0, 1.0);
  railHit.position.set(-1.55, 1.1, 0.475);
  scene.add(railHit);
  // a little of the hall light falls across the rail so the clothes read
  const railFill = new THREE.PointLight("#e8c9a0", 2.2, 2.0, 1.6);
  railFill.position.set(-1.05, 1.55, 0.75);
  scene.add(railFill);
  const bootMat = new THREE.MeshStandardMaterial({ color: "#0e0e0f", roughness: 0.4 });
  [0.32, 0.46].forEach(z => {
    scene.add(box(0.11, 0.16, 0.28, bootMat, -1.45, 0.08, z));
    scene.add(box(0.12, 0.035, 0.3, new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.8 }), -1.45, 0.017, z + 0.005));
  });

  // ---- the other artifacts
  add({
    id: "apt-books", stop: "rest", hits: [stackHit], object: floorStack[6], caption: "Manga, stacked by the table",
    examine: shotAt(V(0.52, 0.12, -0.5), V(0.25, 0.45, 0.6), "left", 40),
    panel: collectionPanel("books"),
  });
  add({
    id: "apt-laptop", stop: "rest", hits: [laptopHit], object: laptop, caption: "The laptop",
    examine: shotAt(V(-0.32, 0.4, -0.27), V(0.35, 0.45, 0.55), "right", 38),
    panel: collectionPanel("laptop", { actions: linkOr(site.links.github, "") ? [{ label: "GitHub", href: site.links.github }] : [] }),
  });
  add({
    id: "apt-crt", stop: "rest", hits: [crtHit], object: crt, caption: "The television: films",
    examine: shotAt(V(0.8, 0.7, -1.2), V(0.05, 0.1, 0.9), "left", 34),
    panel: collectionPanel("films"),
    onExamine: () => { channel++; },
  });
  add({
    id: "apt-jewelry", stop: "rest", hits: [dishHit], object: dish, caption: "A dish of rings",
    examine: shotAt(V(1.28, 0.53, -1.18), V(-0.2, 0.35, 0.4), "left", 30),
    panel: collectionPanel("jewelry"),
  });
  add({
    id: "apt-photos", stop: "rest", hits: [polaroidHit], object: polaroids[1], caption: "Polaroids",
    examine: shotAt(V(0.97, 1.68, -1.47), V(0.0, -0.02, 0.9), "left", 34),
    panel: collectionPanel("photos"),
  });
  add({
    id: "apt-volleyball", stop: "rest", hit: ball, object: ball, caption: "The volleyball",
    examine: shotAt(V(0.42, 0.12, -0.88), V(0.2, 0.35, 0.65), "left", 36),
    panel: collectionPanel("volleyball"),
  });
  add({
    id: "apt-rail", stop: "rest", hits: [railHit], object: garments[1], caption: "The rail: what I wear",
    examine: shotAt(V(-1.5, 1.0, 0.48), V(1.75, 0.2, 0.45), "right", 46),
    panel: collectionPanel("style"),
  });
  artifacts.forEach(a => { if (!a.leave) a.leave = () => { const s = a.examine(false); return { ...s, position: s.position.clone().lerp(s.target, 0.3), fov: s.fov - 4 }; }; });

  const restFocusPoint = V(-0.15, 0.45, -0.4);
  let screenT = 0;
  return {
    artifacts,
    shots: {
      rest: { position: V(1.42, 1.45, 1.75), target: V(-0.42, 0.78, -0.8), fov: 50 },
      restPortrait: { position: V(1.25, 1.55, 2.0), target: V(-0.25, 0.75, -0.7), fov: 66 },
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
