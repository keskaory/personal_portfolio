// The last train on the K line: stainless cars with a red stripe. The
// windows are real openings onto a lit, empty interior: bench seats with
// dividers, poles and hand straps, ceiling diffusers whose light falls off down
// the walls, the line strip over the doors, and past it all the far windows
// with rain on them and the night outside. The doors slide.
//
// Built facing -x (the cab at x = 0, the cars running back along +x), its
// platform side at z = -1.45 from the train's centre line, floor at y = 0.
import * as THREE from "three";
import { seeded } from "./textures.js";
import { rainWindow } from "./rain-window.js";
import { neonCity } from "./station-textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CAR = 20, GAP = 0.6, HEIGHT = 3.2, WIDTH = 2.9, BOTTOM = -0.6;
const PX = 102.4; // canvas pixels per metre along the car
const W = 2048, H = 320; // one car side: 20 m by 3.2 m
const y2c = y => (BOTTOM + HEIGHT - y) * 100; // world height -> canvas row
const DOORS = [-6.6, -2.2, 2.2, 6.6];
const DOOR_W = 1.3, DOOR_H = 1.98;

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}
function texture(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// the outside of one car, with an alpha mask that opens the windows and the doorways
function carSide(seed) {
  const rand = seeded(seed);
  const [c, ctx] = canvas(W, H);
  const [a, ax] = canvas(W, H);
  const [e, ex] = canvas(W, H);
  const [wn, wx] = canvas(W, H);
  wx.fillStyle = "#fff"; wx.fillRect(0, 0, W, H);
  ax.fillStyle = "#fff"; ax.fillRect(0, 0, W, H);
  ex.fillStyle = "#000"; ex.fillRect(0, 0, W, H);
  const body = ctx.createLinearGradient(0, 0, 0, H);
  body.addColorStop(0, "#b9bdbd"); body.addColorStop(0.5, "#a3a8a8"); body.addColorStop(1, "#7f8485");
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(255,255,255,${rand() * 0.05})`; ctx.fillRect(rand() * W, rand() * H, 40 + rand() * 120, 1); }
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let x = 0; x < W; x += 205) ctx.fillRect(x, 0, 2, H);
  ctx.fillStyle = "#b8231f";
  ctx.fillRect(0, y2c(0.78), W, y2c(0.62) - y2c(0.78));
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, y2c(0.78), W, 2);
  const doors = DOORS.map(d => (d + CAR / 2) * PX);
  const dw = DOOR_W * PX;
  const winTop = y2c(1.9), winBot = y2c(0.86);
  let x = 0.5 * PX;
  const spans = [];
  doors.forEach(d => { spans.push([x, d - dw / 2 - 0.35 * PX]); x = d + dw / 2 + 0.35 * PX; });
  spans.push([x, W - 0.5 * PX]);
  spans.forEach(([s0, s1]) => {
    for (let k = s0; k < s1 - 20; k += 1.6 * PX) {
      const w = Math.min(1.45 * PX, s1 - k);
      if (w < 40) continue;
      // a rubber gasket round each pane, then the opening
      ctx.fillStyle = "#2a2e2e";
      ctx.beginPath(); ctx.roundRect(k - 5, winTop - 5, w + 10, winBot - winTop + 10, 12); ctx.fill();
      ax.fillStyle = "#000";
      ax.beginPath(); ax.roundRect(k, winTop, w, winBot - winTop, 9); ax.fill();
      wx.fillStyle = "#000";
      wx.beginPath(); wx.roundRect(k, winTop, w, winBot - winTop, 9); wx.fill();
    }
  });
  doors.forEach(d => {
    const top = y2c(DOOR_H + 0.02);
    ctx.fillStyle = "#3b4040";
    ctx.fillRect(d - dw / 2 - 6, top - 6, dw + 12, y2c(0) - top + 6);
    ax.fillStyle = "#000";
    ax.fillRect(d - dw / 2, top, dw, y2c(0.0) - top);
    // the amber lamp over each door, lit in the emissive pass
    [ctx, ex].forEach(t => { t.fillStyle = "#ffb347"; t.fillRect(d - 9, y2c(2.12), 18, 7); });
  });
  // the far-side doors from inside have tall windows of their own
  doors.forEach(d => [-1, 1].forEach(sg => { wx.fillStyle = "#000"; wx.beginPath(); wx.roundRect(d + sg * dw * 0.25 - 0.17 * PX, y2c(1.85), 0.34 * PX, y2c(1.02) - y2c(1.85), 8); wx.fill(); }));
  return { map: texture(c), alphaMap: texture(a, false), emissiveMap: texture(e), windowMask: texture(wn, false) };
}

// a door leaf: brushed steel with a tall window
function doorLeaf() {
  const [c, ctx] = canvas(128, 400);
  const [a, ax] = canvas(128, 400);
  ctx.fillStyle = "#9a9f9f"; ctx.fillRect(0, 0, 128, 400);
  ctx.strokeStyle = "#5c6262"; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 124, 396);
  ctx.fillStyle = "#2a2e2e"; ctx.beginPath(); ctx.roundRect(26, 40, 76, 170, 10); ctx.fill();
  ax.fillStyle = "#fff"; ax.fillRect(0, 0, 128, 400);
  ax.fillStyle = "#000"; ax.beginPath(); ax.roundRect(30, 44, 68, 162, 8); ax.fill();
  return { map: texture(c), alphaMap: texture(a, false) };
}

function cabFace() {
  const [c, ctx] = canvas(296, 320);
  const [e, ex] = canvas(296, 320);
  ex.fillStyle = "#000"; ex.fillRect(0, 0, 296, 320);
  ctx.fillStyle = "#a6abab"; ctx.fillRect(0, 0, 296, 320);
  ctx.fillStyle = "#b8231f"; ctx.fillRect(0, y2c(0.78), 296, y2c(0.62) - y2c(0.78));
  const g = ctx.createLinearGradient(0, y2c(2.3), 0, y2c(1.0));
  g.addColorStop(0, "#151b1b"); g.addColorStop(1, "#253131");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(22, y2c(2.35), 252, y2c(1.05) - y2c(2.35), 14); ctx.fill();
  [[52, y2c(0.42)], [244, y2c(0.42)]].forEach(([x, y]) => [ctx, ex].forEach(t => { t.fillStyle = "#ffffff"; t.beginPath(); t.arc(x, y, 13, 0, Math.PI * 2); t.fill(); }));
  [[40, y2c(2.5)], [256, y2c(2.5)]].forEach(([x, y]) => [ctx, ex].forEach(t => { t.fillStyle = "#ffb347"; t.beginPath(); t.arc(x, y, 6, 0, Math.PI * 2); t.fill(); }));
  return { map: texture(c), emissiveMap: texture(e) };
}

// the lit windows reflected in the wet platform (the canvas's bottom edge lies along the platform edge)
function reflection() {
  const [c, ctx] = canvas(1024, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,255,255,1)");
  ctx.filter = "blur(14px)"; // soft: sharp streaks sliding past read as flicker
  ctx.globalAlpha = 0.4;
  for (let x = 30; x < 1000; x += 82) { ctx.fillStyle = g; ctx.fillRect(x, 0, 62, 128); }
  return texture(c);
}
function glowSprite(colour) {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.2, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
}

// ---------------------------------------------------------------- inside
// Lit from the ceiling: walls brightest near the diffusers and darker toward
// the floor, the floor darker under the benches. Materials glow a little on
// their own (the light inside the car) but much less than before.
function gradient(w, h, stops, extra) {
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([k, col]) => g.addColorStop(k, col));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (extra) extra(ctx, w, h);
  return texture(c);
}
const wallTex = gradient(64, 256, [[0, "#e4ebe6"], [0.45, "#c3ccc6"], [1, "#7f8884"]]);
const floorTex = gradient(64, 256, [[0, "#2c2f2e"], [0.22, "#3d403f"], [0.5, "#4a4d4b"], [0.78, "#3d403f"], [1, "#2c2f2e"]], (ctx, w, h) => {
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${Math.random() * 0.08})`; ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
});
const seatTex = gradient(32, 64, [[0, "#3b8282"], [1, "#1f4f50"]]);
const lit = (opts, glow) => new THREE.MeshLambertMaterial({ ...opts, emissive: new THREE.Color(1, 1, 1), emissiveMap: opts.map, emissiveIntensity: glow });

function interior(seed, lineStrip, brightness) {
  const g = new THREE.Group();
  const iw = WIDTH - 0.14;
  const M = {
    wall: lit({ map: wallTex }, 0.3 * brightness), floor: lit({ map: floorTex }, 0.16 * brightness), seat: lit({ map: seatTex }, 0.22 * brightness),
    steel: new THREE.MeshLambertMaterial({ color: "#b5bdbb", emissive: new THREE.Color("#9aa3a1").multiplyScalar(0.3 * brightness) }),
    tube: new THREE.MeshBasicMaterial({ color: new THREE.Color("#eef8f2").multiplyScalar(0.95 + 0.15 * brightness) }),
    frame: new THREE.MeshLambertMaterial({ color: "#d7ddd8", emissive: new THREE.Color("#b9c2bd").multiplyScalar(0.25 * brightness) }),
  };
  // ceiling, far wall (with its window openings, see below) and the two ends; the
  // platform side is the car's own skin, so its windows stay open from inside too
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 0.2, iw), lit({ color: "#cfd7d2" }, 0.32 * brightness));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 2.25;
  g.add(ceil);
  [-1, 1].forEach(s => {
    const end = new THREE.Mesh(new THREE.PlaneGeometry(iw, 2.25), M.wall);
    end.position.set(s * (CAR / 2 - 0.1), 1.125, 0);
    end.rotation.y = -s * Math.PI / 2;
    g.add(end);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 0.2, iw), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  g.add(floor);
  // ceiling diffusers: two long boxes, lit but not blown out
  [-0.55, 0.55].forEach(z => { const t = new THREE.Mesh(new THREE.BoxGeometry(CAR - 0.6, 0.035, 0.16), M.tube); t.position.set(0, 2.215, z); g.add(t); });
  // bench seats between the doorways, backs against the walls, steel dividers between places
  const gaps = [[-9.7, -7.4], [-5.8, -3.0], [-1.4, 1.4], [3.0, 5.8], [7.4, 9.7]];
  const dividers = [];
  gaps.forEach(([a, b]) => [-1, 1].forEach(s => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.1, 0.46), M.seat);
    seat.position.set((a + b) / 2, 0.44, s * (iw / 2 - 0.25));
    const back = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.42, 0.08), M.seat);
    back.position.set((a + b) / 2, 0.7, s * (iw / 2 - 0.04));
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.39, 0.4), M.floor);
    plinth.position.set((a + b) / 2, 0.195, s * (iw / 2 - 0.25));
    g.add(seat, back, plinth);
    for (let x = a + 0.85; x < b - 0.4; x += 0.85) dividers.push([x, s]);
  }));
  const divGeo = new THREE.TorusGeometry(0.14, 0.012, 6, 12, Math.PI);
  const divs = new THREE.InstancedMesh(divGeo, M.steel, dividers.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  dividers.forEach(([x, s], i) => { q.setFromEuler(e.set(0, Math.PI / 2, 0)); m4.compose(V(x, 0.5, s * (iw / 2 - 0.3)), q, one); divs.setMatrixAt(i, m4); });
  g.add(divs);
  // poles at the doorways, the overhead rails, and the hand straps hanging from them
  const pole = new THREE.CylinderGeometry(0.018, 0.018, 2.2, 8);
  DOORS.forEach(d => [-0.45, 0.45].forEach(o => { const p = new THREE.Mesh(pole, M.steel); p.position.set(d + o, 1.1, 0); g.add(p); }));
  [-0.6, 0.6].forEach(z => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, CAR - 0.6, 8), M.steel); r.rotation.z = Math.PI / 2; r.position.set(0, 1.95, z); g.add(r); });
  const strapGeo = new THREE.BoxGeometry(0.025, 0.16, 0.006);
  strapGeo.translate(0, -0.08, 0);
  const handGeo = new THREE.TorusGeometry(0.045, 0.008, 6, 14);
  const straps = [];
  [-0.6, 0.6].forEach(z => { for (let x = -9.3; x < 9.4; x += 0.42) if (!DOORS.some(d => Math.abs(d - x) < 0.6)) straps.push([x, z]); });
  const strapMesh = new THREE.InstancedMesh(strapGeo, M.frame, straps.length);
  const handMesh = new THREE.InstancedMesh(handGeo, M.frame, straps.length);
  straps.forEach(([x, z], i) => {
    m4.compose(V(x, 1.94, z), q.identity(), one); strapMesh.setMatrixAt(i, m4);
    q.setFromEuler(e.set(0, Math.PI / 2, 0)); m4.compose(V(x, 1.73, z), q, one); handMesh.setMatrixAt(i, m4);
  });
  g.add(strapMesh, handMesh);
  // the far side: rain on the windows and the night past it, seen through the wall's openings
  const rain = rainWindow(CAR - 0.2, 1.3, { brightness: 0.55, depth: 0.5, fog: 0.55, city: neonCity({ blur: 26, signs: 9 }) });
  rain.position.set(0, 1.38, iw / 2 + 0.02);
  rain.rotation.y = Math.PI;
  g.add(rain);
  // frames over the windows: the K line strip above each doorway, plain panels between
  const framePanels = [];
  DOORS.forEach(d => framePanels.push([-d, lineStrip, 1.2]));
  [-8.4, -4.4, 0, 4.4, 8.4].forEach(x => framePanels.push([x, null, 0.9]));
  framePanels.forEach(([x, map, w]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.22), map
      ? new THREE.MeshBasicMaterial({ map, color: new THREE.Color(0.75, 0.75, 0.75).multiplyScalar(0.8 + 0.2 * brightness) })
      : lit({ color: "#ded6c4" }, 0.22 * brightness));
    p.position.set(x, 2.04, iw / 2 - 0.02);
    p.rotation.y = Math.PI;
    g.add(p);
  });
  return { group: g, rain, M };
}

export function createTrain({ cars = 4, lineStrip = null } = {}) {
  const g = new THREE.Group();
  const roof = new THREE.MeshStandardMaterial({ color: "#5f6464", metalness: 0.5, roughness: 0.6 });
  const under = new THREE.MeshStandardMaterial({ color: "#151717", roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: "#9ea3a3", metalness: 0.55, roughness: 0.45 });
  const leafTex = doorLeaf();
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex.map, alphaMap: leafTex.alphaMap, alphaTest: 0.5, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });
  const glass = new THREE.MeshStandardMaterial({ color: "#d8ece6", roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.1, depthWrite: false });
  const hits = [], leaves = [], rains = [];
  for (let k = 0; k < cars; k++) {
    const cx = CAR / 2 + k * (CAR + GAP);
    const car = new THREE.Group();
    car.position.x = cx;
    // the far wall, roof and underframe from outside (the platform side is the textured skin below)
    const farWall = new THREE.Mesh(new THREE.BoxGeometry(CAR, HEIGHT - 0.3, 0.06), steel);
    farWall.position.set(0, BOTTOM + (HEIGHT - 0.3) / 2, WIDTH / 2 + 0.03); // outside the rain glass
    const top = new THREE.Mesh(new THREE.BoxGeometry(CAR, 0.3, WIDTH - 0.3), roof);
    top.position.y = BOTTOM + HEIGHT - 0.15;
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(CAR - 1, 0.5, WIDTH - 0.5), under);
    bogie.position.y = BOTTOM - 0.25;
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(CAR, 0.6, WIDTH - 0.04), steel);
    skirt.position.y = BOTTOM + 0.3;
    car.add(farWall, top, bogie, skirt);
    const s = carSide(41 + k * 16);
    const side = new THREE.Mesh(new THREE.PlaneGeometry(CAR, HEIGHT), new THREE.MeshStandardMaterial({
      map: s.map, alphaMap: s.alphaMap, alphaTest: 0.5, emissiveMap: s.emissiveMap, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 1.2,
      metalness: 0.35, roughness: 0.6, side: THREE.DoubleSide,
    }));
    side.position.set(0, BOTTOM + HEIGHT / 2, -WIDTH / 2);
    side.rotation.y = Math.PI;
    car.add(side);
    hits.push(side);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(CAR, 1.1), glass);
    pane.position.set(0, 1.38, -WIDTH / 2 + 0.02);
    pane.rotation.y = Math.PI;
    car.add(pane);
    const inside = interior(41 + k * 16, lineStrip, [1, 0.88, 0.96, 0.82][k % 4]);
    car.add(inside.group);
    rains.push(inside.rain);
    // the far wall from inside: the same window layout as this side, opened to the rain
    const farIn = new THREE.Mesh(new THREE.PlaneGeometry(CAR, HEIGHT), new THREE.MeshLambertMaterial({
      map: wallTex, alphaMap: s.windowMask, alphaTest: 0.5, emissive: new THREE.Color(1, 1, 1), emissiveMap: wallTex, emissiveIntensity: 0.3 * [1, 0.88, 0.96, 0.82][k % 4],
    }));
    farIn.position.set(0, BOTTOM + HEIGHT / 2, (WIDTH - 0.14) / 2);
    farIn.rotation.y = Math.PI;
    car.add(farIn);
    // the door leaves, in their openings; they slide apart
    DOORS.forEach(d => [-1, 1].forEach(sgn => {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W / 2, DOOR_H, 0.03), leafMat);
      leaf.position.set(-d + sgn * DOOR_W / 4, DOOR_H / 2 + 0.01, -WIDTH / 2 + 0.06);
      leaf.userData = { home: leaf.position.x, sgn };
      car.add(leaf);
      leaves.push(leaf);
    }));
    g.add(car);
  }
  const doorsX = DOORS.map(d => CAR / 2 - d); // the first car's doorways (mirrored by the skin's rotation)
  // the cab front, facing the way it travels
  const face = cabFace();
  const front = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, HEIGHT), new THREE.MeshStandardMaterial({
    map: face.map, emissiveMap: face.emissiveMap, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 2.2, metalness: 0.4, roughness: 0.4,
  }));
  front.position.set(-0.002, BOTTOM + HEIGHT / 2, 0);
  front.rotation.y = -Math.PI / 2;
  g.add(front);
  const headGlow = glowSprite("#fff4df");
  [-1, 1].forEach(s => {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), headGlow);
    h.position.set(-0.03, 0.42 + BOTTOM + 0.6, s * 0.96);
    h.rotation.y = -Math.PI / 2;
    g.add(h);
  });
  const headlight = new THREE.SpotLight("#fff1d6", 40, 40, 0.42, 0.7, 1.2);
  headlight.position.set(-0.2, 0.1, 0);
  headlight.target.position.set(-12, -1.0, 0);
  g.add(headlight, headlight.target);
  // its light on the platform, and its windows in the puddles
  const spill = [12, 26].map(x => {
    const l = new THREE.PointLight("#e9f6ef", 9, 9, 1.4);
    l.position.set(x, 2.2, -WIDTH / 2 - 1.6);
    g.add(l);
    return l;
  });
  const refl = new THREE.Mesh(new THREE.PlaneGeometry(cars * (CAR + GAP), 1.9), new THREE.MeshBasicMaterial({
    map: reflection(), color: "#cfe9df", transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8,
  }));
  refl.material.map.wrapS = THREE.RepeatWrapping;
  refl.material.map.repeat.set(cars * 1.9, 1);
  refl.rotation.x = -Math.PI / 2;
  refl.position.set(cars * (CAR + GAP) / 2, 0.009, -WIDTH / 2 - 1.5);
  g.add(refl);

  let doors = 0, doorTarget = 0, lamp = 0;
  return {
    group: g, hits, doorsX, spill, headlight, length: cars * (CAR + GAP),
    openDoors(v = true) { doorTarget = v ? 1 : 0; },
    get doorsOpen() { return doors; },
    update(t, dt, { speed = 0, reduced = false } = {}) {
      // doors slide; their lamps blink while they move
      if (doors !== doorTarget) {
        doors = reduced ? doorTarget : THREE.MathUtils.clamp(doors + Math.sign(doorTarget - doors) * dt / 0.9, 0, 1);
        lamp += dt;
      }
      const e = doors * doors * (3 - 2 * doors);
      leaves.forEach(l => (l.position.x = l.userData.home + l.userData.sgn * e * (DOOR_W / 2 - 0.04)));
      const blink = doors > 0 && doors < 1 ? (Math.sin(lamp * 14) > 0 ? 1.6 : 0.3) : 1.2;
      hits.forEach(h => (h.material.emissiveIntensity = blink));
      rains.forEach(r => r.userData.tick(t));
    },
  };
}
