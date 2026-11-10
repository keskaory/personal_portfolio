// What I've Done, 12:30 am. A narrow noodle shop: a formica table running
// to a rain-streaked window, booth seats either side, the one across empty.
// On the table: a half-finished bowl of pho with green chopsticks resting
// across it, iced tea sweating, the condiments, and a magazine. The
// magazine holds the projects and experience.
// Leaving: the camera lifts to the rain on the window (the match cut).
//
// Coordinates: meters; the floor at y = 0, the table top at y = 0.74, the
// window wall at x = -1.0, the camera looking toward -x.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { rainWindow } from "../objects/rain-window.js";
import { concrete } from "../objects/station-textures.js";
import { createMagazine } from "../objects/magazine.js";
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

// small square wall tiles, cream gone slightly yellow, darker grout, grime low down
function wallTiles() {
  const [c, ctx] = cv(512, 512);
  const rand = seeded(401);
  ctx.fillStyle = "#6e675a";
  ctx.fillRect(0, 0, 512, 512);
  const n = 8, s = 512 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = 205 + rand() * 16;
    ctx.fillStyle = `rgb(${v},${v - 6},${v - 22})`;
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
  ctx.fillStyle = "#c7cfbf";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    ctx.strokeStyle = `rgba(${rand() < 0.5 ? "90,100,90" : "255,255,250"},${0.06 + rand() * 0.08})`;
    ctx.beginPath();
    const x = rand() * 512, y = rand() * 512, a = rand() * 6;
    ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 260);
  g.addColorStop(0, "rgba(255,255,240,0.1)");
  g.addColorStop(1, "rgba(0,0,0,0.08)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  return tex(c);
}
function vinyl() {
  const [c, ctx] = cv(256, 256);
  const rand = seeded(405);
  ctx.fillStyle = "#5e2a22";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(0,0,0,${rand() * 0.1})`; ctx.fillRect(rand() * 256, rand() * 256, 1, 1); }
  // tufted seams
  for (let y = 32; y < 256; y += 64) { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0, y, 256, 3); ctx.fillStyle = "rgba(255,200,180,0.08)"; ctx.fillRect(0, y + 3, 256, 2); }
  // a crack in the seat, mended with tape
  ctx.fillStyle = "rgba(190,170,140,0.5)";
  ctx.fillRect(150, 140, 46, 10);
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

// ---- the bowl of pho, half-finished
function pho() {
  const g = new THREE.Group();
  const ceramic = new THREE.MeshStandardMaterial({ color: "#efece4", roughness: 0.25 });
  const prof = [V(0.03, 0, 0), V(0.045, 0.004, 0), V(0.07, 0.025, 0), V(0.095, 0.062, 0), V(0.102, 0.076, 0), V(0.098, 0.078, 0), V(0.09, 0.066, 0), V(0.064, 0.03, 0), V(0.0, 0.014, 0)].map(p => new THREE.Vector2(p.x, p.y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), ceramic);
  bowl.castShadow = true;
  g.add(bowl);
  // a thin blue line under the rim
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.0016, 4, 48), new THREE.MeshStandardMaterial({ color: "#3d5f86", roughness: 0.4 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.071;
  g.add(ring);
  // broth, a little lower than the rim
  const broth = new THREE.Mesh(new THREE.CircleGeometry(0.085, 40), new THREE.MeshPhysicalMaterial({ color: "#a8692a", roughness: 0.15, transmission: 0.25, thickness: 0.02, clearcoat: 1 }));
  broth.rotation.x = -Math.PI / 2;
  broth.position.y = 0.055;
  g.add(broth);
  const rand = seeded(411);
  // noodles: pale tangles breaking the surface
  const noodleMat = new THREE.MeshStandardMaterial({ color: "#efe7d2", roughness: 0.5 });
  for (let i = 0; i < 16; i++) {
    const pts = [];
    let a = rand() * 6.28, r = 0.02 + rand() * 0.05;
    for (let k = 0; k < 6; k++) {
      a += 0.6 + rand() * 0.6; r = Math.min(0.08, Math.max(0.01, r + (rand() - 0.5) * 0.03));
      pts.push(V(Math.cos(a) * r, 0.053 + rand() * 0.008, Math.sin(a) * r));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.0016, 4), noodleMat);
    g.add(m);
  }
  // a few slices of beef, herbs, scallion, a lime wedge on the rim
  const beef = new THREE.MeshStandardMaterial({ color: "#7c4436", roughness: 0.6 });
  [[0.03, 0.02, 0.3], [-0.025, 0.035, 1.4], [0.01, -0.035, 2.4]].forEach(([x, z, r]) => {
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.024, 10), beef);
    s.scale.set(1, 0.7, 1);
    s.rotation.set(-Math.PI / 2 + 0.1, 0, r);
    s.position.set(x, 0.059, z);
    g.add(s);
  });
  const herb = new THREE.MeshStandardMaterial({ color: "#3e6b2f", roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.008 + rand() * 0.006, 6), herb);
    leaf.scale.set(1, 0.5, 1);
    leaf.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.5, 0, rand() * 6);
    leaf.position.set((rand() - 0.5) * 0.1, 0.06, (rand() - 0.5) * 0.1);
    g.add(leaf);
  }
  const scallion = new THREE.MeshStandardMaterial({ color: "#7fa85a", roughness: 0.5 });
  for (let i = 0; i < 10; i++) {
    const sc = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0013, 4, 8), scallion);
    sc.rotation.x = Math.PI / 2;
    sc.position.set((rand() - 0.5) * 0.11, 0.058, (rand() - 0.5) * 0.11);
    g.add(sc);
  }
  const lime = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8, 0, Math.PI, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#7aa13a", roughness: 0.45, side: THREE.DoubleSide }));
  lime.rotation.set(0, 0.6, Math.PI / 2);
  lime.position.set(0.09, 0.075, 0.03);
  g.add(lime);
  // the soup spoon
  const spoon = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ceramic);
  cup.scale.set(1, 0.45, 1.25);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.07), ceramic);
  handle.position.set(0, 0.012, -0.055);
  handle.rotation.x = -0.35;
  spoon.add(cup, handle);
  spoon.position.set(-0.035, 0.066, -0.02);
  spoon.rotation.set(0.25, 0.9, 0);
  g.add(spoon);
  // green chopsticks resting across the bowl
  const green = new THREE.MeshStandardMaterial({ color: "#3f7a58", roughness: 0.35 });
  [0, 1].forEach(i => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0042, 0.24, 8), green);
    c.rotation.set(0, 0, Math.PI / 2);
    c.rotation.y = 0.35 + i * 0.06;
    c.position.set(0.02, 0.081 + i * 0.006, 0.03 + i * 0.012);
    c.castShadow = true;
    g.add(c);
  });
  return g;
}

function condiments() {
  const g = new THREE.Group();
  const caddy = new THREE.MeshStandardMaterial({ color: "#8d8f8c", metalness: 0.8, roughness: 0.35 });
  g.add(box(0.16, 0.01, 0.07, caddy, 0, 0.005, 0));
  const bottle = (color, cap, x, h, r) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 14), new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 0.6 }));
    b.position.set(x, 0.01 + h / 2, 0);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.7, 0.03, 10), new THREE.MeshStandardMaterial({ color: cap, roughness: 0.5 }));
    c.position.set(x, 0.01 + h + 0.015, 0);
    [b, c].forEach(m => { m.castShadow = true; g.add(m); });
  };
  bottle("#a3261c", "#3f7a3a", -0.05, 0.16, 0.022);   // the red chili sauce
  bottle("#2a160f", "#c9c5bd", 0.0, 0.14, 0.024);     // the dark hoisin
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 14), new THREE.MeshPhysicalMaterial({ color: "#7a2412", roughness: 0.15, transmission: 0.3, thickness: 0.02 }));
  jar.position.set(0.05, 0.04, 0);
  g.add(jar);
  // a steel napkin holder and a cup of spare chopsticks
  const napkins = new THREE.Group();
  napkins.add(box(0.1, 0.09, 0.05, caddy, 0, 0.045, 0));
  napkins.add(box(0.09, 0.012, 0.035, new THREE.MeshStandardMaterial({ color: "#f2efe8", roughness: 0.9 }), 0, 0.095, 0));
  napkins.position.set(0.0, 0, 0.12);
  g.add(napkins);
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.026, 0.1, 12, 1, true), new THREE.MeshStandardMaterial({ color: "#4a4744", roughness: 0.6, side: THREE.DoubleSide }));
  holder.position.set(0.0, 0.05, -0.12);
  g.add(holder);
  const sticks = new THREE.MeshStandardMaterial({ color: "#3f7a58", roughness: 0.4 });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.22, 6), sticks);
    s.position.set(Math.cos(i) * 0.012, 0.11, -0.12 + Math.sin(i) * 0.012);
    s.rotation.set(Math.sin(i * 3) * 0.12, 0, Math.cos(i * 2) * 0.12);
    g.add(s);
  }
  return g;
}

function icedTea() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.14, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.12, transmission: 0.9, thickness: 0.004, side: THREE.DoubleSide }));
  glass.position.y = 0.07;
  const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.028, 0.1, 20), new THREE.MeshPhysicalMaterial({ color: "#9a5a22", roughness: 0.1, transmission: 0.55, thickness: 0.05 }));
  tea.position.y = 0.055;
  const ice = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, transmission: 0.9, thickness: 0.02 });
  [[0.01, 0.1, 0.005], [-0.012, 0.095, -0.01], [0.004, 0.09, 0.015]].forEach(([x, y, z]) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.018), ice);
    c.position.set(x, y, z);
    c.rotation.set(x * 40, y * 30, z * 50);
    g.add(c);
  });
  // a ring of water on the formica where it has been standing
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.031, 0.036, 24), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.08 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0.05, 0.001, 0.02);
  g.add(glass, tea, ring);
  return g;
}

export function buildRestaurant(scene, content, { reducedMotion = false } = {}) {
  scene.background = new THREE.Color("#060706");

  // ---- room: window wall, tiled side wall, floor, ceiling
  const tiles = new THREE.MeshStandardMaterial({ map: wallTiles(), roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ map: concrete("#2c2a27", 413), roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: "#2a2622", roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // the window wall: frame around a big pane
  const frame = new THREE.MeshStandardMaterial({ color: "#2e3230", metalness: 0.4, roughness: 0.5 });
  scene.add(box(0.12, 0.9, 3.2, dark, -1.06, 0.45, 0));      // below the window
  scene.add(box(0.12, 0.6, 3.2, dark, -1.06, 2.4, 0));       // above
  scene.add(box(0.05, 1.22, 0.05, frame, -1.0, 1.5, -0.9, false));
  scene.add(box(0.05, 1.22, 0.05, frame, -1.0, 1.5, 0.9, false));
  scene.add(box(0.05, 0.05, 1.85, frame, -1.0, 0.9, 0, false));
  scene.add(box(0.05, 0.05, 1.85, frame, -1.0, 2.1, 0, false));
  const pane = rainWindow(1.8, 1.2, { brightness: 1.1, depth: 0.35, fog: 0.5 });
  pane.position.set(-1.02, 1.5, 0);
  pane.rotation.y = Math.PI / 2;
  scene.add(pane);
  // tiled wall behind the far booth, plain wall above
  const side = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.4), tiles);
  side.position.set(0.5, 0.7, -1.2);
  side.receiveShadow = true;
  scene.add(side);
  const upper = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.4), new THREE.MeshStandardMaterial({ color: "#5c5546", roughness: 0.85 }));
  upper.position.set(0.5, 2.1, -1.2);
  scene.add(upper);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ color: "#211f1c", roughness: 0.9 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0.5, 2.7, 0);
  scene.add(ceiling);

  // ---- the table and the booths
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.03, 0.64, 2, 0.01), new THREE.MeshStandardMaterial({ map: formica(), roughness: 0.32 }));
  top.position.set(-0.55, TABLE_Y - 0.015, 0);
  top.receiveShadow = top.castShadow = true;
  scene.add(top);
  const trim = new THREE.MeshStandardMaterial({ color: "#a9aba7", metalness: 0.9, roughness: 0.3 });
  scene.add(box(0.93, 0.012, 0.012, trim, -0.55, TABLE_Y - 0.02, 0.325, false));
  scene.add(box(0.93, 0.012, 0.012, trim, -0.55, TABLE_Y - 0.02, -0.325, false));
  scene.add(box(0.06, TABLE_Y - 0.03, 0.06, trim, -0.5, (TABLE_Y - 0.03) / 2, 0));
  const seatMat = new THREE.MeshStandardMaterial({ map: vinyl(), roughness: 0.45 });
  [-1, 1].forEach(s => {
    const z = s * 0.66;
    scene.add(box(1.0, 0.1, 0.46, seatMat, -0.52, 0.45, z));
    scene.add(box(1.0, 0.55, 0.1, seatMat, -0.52, 0.8, z + s * 0.2));
    scene.add(box(1.0, 0.4, 0.44, dark, -0.52, 0.2, z));
  });

  // ---- on the table
  const bowl = pho();
  bowl.position.set(-0.62, TABLE_Y, 0.08);
  scene.add(bowl);
  const caddy = condiments();
  caddy.position.set(-0.9, TABLE_Y, 0.02);
  caddy.rotation.y = Math.PI / 2;
  scene.add(caddy);
  const tea = icedTea();
  tea.position.set(-0.78, TABLE_Y, -0.2);
  scene.add(tea);
  // steam lifting off the bowl
  const steamTex = steamTexture();
  const steam = [0, 1, 2, 3].map(i => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.3), new THREE.MeshBasicMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(m);
    return { m, phase: i / 4 };
  });

  // ---- the magazine, lying beside the bowl
  const mag = createMagazine(content);
  scene.add(mag.group);
  const magHandle = makeHandle(mag.group, {
    home: pose(-0.32, TABLE_Y + 0.001, -0.12, 0, 0.32, 0),
    held: pose(-0.33, TABLE_Y + 0.012, 0.02, 0, 0, 0),
    lift: 0.03,
    duration: 1.0,
  });
  mag.hits[0].userData.id = "magazine";
  mag.left.userData.id = "magazine:prev";
  mag.right.userData.id = "magazine:next";

  // ---- the wall clock and an oscillating fan on the tiled wall
  const clock = new THREE.Group();
  clock.position.set(-0.05, 1.95, -1.19);
  const faceC = document.createElement("canvas");
  faceC.width = faceC.height = 256;
  const fc = faceC.getContext("2d");
  fc.fillStyle = "#ece6d6"; fc.beginPath(); fc.arc(128, 128, 124, 0, Math.PI * 2); fc.fill();
  fc.fillStyle = "#2a2622";
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; fc.fillRect(126 + Math.sin(a) * 104, 124 - Math.cos(a) * 104, 5, 9); }
  const hand = (len, w, a) => { fc.save(); fc.translate(128, 128); fc.rotate(a); fc.fillRect(-w / 2, -len, w, len); fc.restore(); };
  hand(64, 8, (0.5 / 12) * Math.PI * 2);  // half past twelve
  hand(96, 5, Math.PI);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.14, 32), new THREE.MeshStandardMaterial({ map: tex(faceC), roughness: 0.4 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.012, 8, 32), new THREE.MeshStandardMaterial({ color: "#1d1d1c", roughness: 0.4 }));
  clock.add(clockFace, rim);
  scene.add(clock);
  const fan = new THREE.Group();
  fan.position.set(0.75, 2.2, -1.12);
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

  // ---- light
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#2f4a3b", roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }));
  shade.position.set(-0.55, 1.72, 0);
  scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffe2b0").multiplyScalar(3) }));
  bulb.position.set(-0.55, 1.68, 0);
  scene.add(bulb);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.0, 6), new THREE.MeshBasicMaterial({ color: "#0b0b0b" }));
  cord.position.set(-0.55, 2.25, 0);
  scene.add(cord);
  const pendant = new THREE.SpotLight("#ffcf98", 6.5, 3.5, 0.85, 0.7, 1.6);
  pendant.position.set(-0.55, 1.66, 0);
  pendant.target.position.set(-0.55, TABLE_Y, 0);
  pendant.castShadow = true;
  pendant.shadow.mapSize.set(2048, 2048);
  pendant.shadow.bias = -0.0003;
  pendant.shadow.radius = 4;
  scene.add(pendant, pendant.target);
  const room = new THREE.PointLight("#d9e8e0", 2.2, 6, 1.6);  // tube light over the counter, behind us
  room.position.set(1.6, 2.4, 0.6);
  scene.add(room);
  const street = new THREE.SpotLight("#a9c4c0", 6, 6, 0.6, 1, 1.4);  // the street through the window
  street.position.set(-3, 2.4, 0.6);
  street.target.position.set(0, 0.8, -0.4);
  scene.add(street, street.target);
  const car = new THREE.SpotLight("#fff1d8", 0, 7, 0.3, 0.9, 1.2);    // headlights passing outside
  car.position.set(-3.5, 1.2, -3);
  car.target.position.set(0.5, 1.2, -1.2);
  scene.add(car, car.target);
  scene.add(new THREE.HemisphereLight("#2b2a26", "#0b0a09", 0.7));
  const attention = new THREE.SpotLight("#ffe7cc", 0, 3, 0.2, 1, 2);
  attention.position.set(0.3, 1.6, 0.5);
  scene.add(attention, attention.target);

  // ---- the magazine as the one thing to pick up here
  const readShot = portrait => portrait
    ? { side: "reader", position: V(-0.33, TABLE_Y + 0.72, 0.16), target: V(-0.33, TABLE_Y, 0.05), fov: 62 }
    : { side: "reader", position: V(-0.33, TABLE_Y + 0.5, 0.25), target: V(-0.33, TABLE_Y, 0.045), fov: 40 };
  const magazine = {
    id: "magazine", stop: "rest", hits: [mag.hits[0]], object: mag.group, handle: magHandle,
    caption: "A magazine: projects and experience",
    reader: mag,
    examine: readShot,
    leave: () => ({ position: V(-0.33, TABLE_Y + 0.26, 0.08), target: V(-0.33, TABLE_Y, 0.0), fov: 36 }),
    onExamine: () => mag.setOpen(true),
    release: () => mag.setOpen(false),
    panel: () => ({}),
  };
  const artifacts = [magazine];
  artifacts.forEach(a => { a.focus = new THREE.Vector3(); });

  let carT = 4;
  const restFocusPoint = V(-0.55, TABLE_Y + 0.05, 0.0);
  return {
    artifacts,
    magazine: mag,
    shots: {
      rest: { position: V(0.58, 1.3, 0.36), target: V(-0.62, 0.88, -0.1), fov: 38 },
      restPortrait: { position: V(0.72, 1.42, 0.3), target: V(-0.55, 0.82, -0.05), fov: 52 },
    },
    // leaving: lift to the rain on the window, the shot the apartment opens on
    exitShot: () => ({ position: V(-0.55, 1.5, 0.05), target: V(-1.05, 1.55, 0.0), fov: 34 }),
    restFocus: () => restFocusPoint,
    dof: { rest: 0.012, examine: 0.03 },
    lights: { attention },
    update(t, dt, held) {
      magHandle.update(dt, held === magazine, reducedMotion);
      mag.group.updateMatrixWorld();
      magazine.focus.setFromMatrixPosition(mag.group.matrixWorld);
      mag.update(dt);
      pane.userData.tick(t);
      // steam: soft wisps rising and fading, always facing the camera
      steam.forEach(s => {
        const k = (t * 0.18 + s.phase) % 1;
        s.m.position.set(-0.62 + Math.sin(k * 6 + s.phase * 9) * 0.02, TABLE_Y + 0.12 + k * 0.32, 0.08);
        s.m.material.opacity = reducedMotion ? 0.05 : Math.sin(k * Math.PI) * 0.09;
        s.m.scale.setScalar(0.7 + k * 0.8);
        s.m.lookAt(0.58, 1.3, 0.36);
      });
      // the fan turns its head slowly; now and then a car's lights cross the wall
      if (!reducedMotion) {
        fan.rotation.y = Math.sin(t * 0.35) * 0.7;
        blades.rotation.z = t * 25;
        carT -= dt;
        if (carT < 0) carT = 9 + Math.random() * 8;
        const k = carT < 1.4 ? 1 - carT / 1.4 : -1;
        car.intensity = k >= 0 ? Math.sin(k * Math.PI) * 14 : 0;
        if (k >= 0) car.target.position.set(1.6 - k * 2.6, 1.3, -1.2);
      }
    },
  };
}
