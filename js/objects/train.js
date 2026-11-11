// The last train on the K line: stainless cars with a red stripe. The
// windows are real openings onto a lit interior: bench seats, poles, the
// ceiling tubes, a few people sitting or standing who shift and sway, and
// past them the far windows with the city going by. The doors slide.
//
// Built facing -x (the cab at x = 0, the cars running back along +x), its
// platform side at z = -1.45 from the train's centre line, floor at y = 0.
import * as THREE from "three";
import { seeded } from "./textures.js";

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
  return { map: texture(c), alphaMap: texture(a, false), emissiveMap: texture(e) };
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

// what the far windows show: the city at night, out of focus; it scrolls when the train moves
function farView(seed) {
  const rand = seeded(seed);
  const [c, ctx] = canvas(1024, 160);
  ctx.fillStyle = "#121a1c"; ctx.fillRect(0, 0, 1024, 160);
  const colours = ["255,96,72", "255,178,90", "110,240,170", "130,210,255", "255,214,140", "255,140,110"];
  for (let i = 0; i < 90; i++) {
    const x = rand() * 1024, y = 30 + rand() * 120, r = 4 + rand() * 14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${colours[Math.floor(rand() * colours.length)]},${0.45 + rand() * 0.5})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // window pillars of the far side
  ctx.fillStyle = "#c9d2ce";
  for (let x = 0; x < 1024; x += 128) ctx.fillRect(x, 0, 14, 160);
  ctx.fillRect(0, 0, 1024, 10); ctx.fillRect(0, 150, 1024, 10);
  const t = texture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(CAR / 6, 1);
  return t;
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
  ctx.filter = "blur(6px)";
  ctx.globalAlpha = 0.55;
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
const lit = (color, glow = 0.42) => new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(glow) });
const INSIDE = {
  wall: lit("#d9e1dc", 0.5), floor: lit("#4a4d4b", 0.3), seat: lit("#2f6f70", 0.38), steel: lit("#b9c2c0", 0.55),
  tube: new THREE.MeshBasicMaterial({ color: new THREE.Color("#f4fff8").multiplyScalar(1.6) }),
};

function interior(seed) {
  const g = new THREE.Group();
  const iw = WIDTH - 0.14;
  // the shell seen from inside: ceiling, far wall and the two ends. No wall on the platform
  // side: the car's own skin, with its window openings, is that wall from inside too.
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 0.2, iw), INSIDE.wall);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 2.25;
  const farIn = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 0.2, 2.25), INSIDE.wall);
  farIn.position.set(0, 1.125, iw / 2);
  farIn.rotation.y = Math.PI;
  g.add(ceil, farIn);
  [-1, 1].forEach(s => {
    const end = new THREE.Mesh(new THREE.PlaneGeometry(iw, 2.25), INSIDE.wall);
    end.position.set(s * (CAR / 2 - 0.1), 1.125, 0);
    end.rotation.y = -s * Math.PI / 2;
    g.add(end);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 0.2, iw), INSIDE.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  g.add(floor);
  // two runs of ceiling tubes
  [-0.55, 0.55].forEach(z => { const t = new THREE.Mesh(new THREE.BoxGeometry(CAR - 0.6, 0.03, 0.12), INSIDE.tube); t.position.set(0, 2.22, z); g.add(t); });
  // bench seats along both walls between the doorways, backs against the windows
  const gaps = [[-9.7, -7.4], [-5.8, -3.0], [-1.4, 1.4], [3.0, 5.8], [7.4, 9.7]];
  gaps.forEach(([a, b]) => [-1, 1].forEach(s => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.1, 0.46), INSIDE.seat);
    seat.position.set((a + b) / 2, 0.44, s * (iw / 2 - 0.25));
    const back = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.42, 0.08), INSIDE.seat);
    back.position.set((a + b) / 2, 0.7, s * (iw / 2 - 0.04));
    g.add(seat, back);
  }));
  // poles at the doorways and the overhead rails
  const pole = new THREE.CylinderGeometry(0.018, 0.018, 2.2, 8);
  DOORS.forEach(d => [-0.45, 0.45].forEach(o => { const p = new THREE.Mesh(pole, INSIDE.steel); p.position.set(d + o, 1.1, 0); g.add(p); }));
  [-0.6, 0.6].forEach(z => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, CAR - 0.6, 8), INSIDE.steel); r.rotation.z = Math.PI / 2; r.position.set(0, 1.95, z); g.add(r); });
  // the far windows and what goes past them
  const view = farView(seed);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 0.2, 1.06), new THREE.MeshBasicMaterial({ map: view, color: new THREE.Color(1.1, 1.1, 1.1) }));
  far.position.set(0, 1.37, iw / 2 - 0.012);
  far.rotation.y = Math.PI;
  g.add(far);
  // people: a few sitting, one standing at a pole; they sway with the car and shift now and then
  const rand = seeded(seed * 7);
  const clothes = ["#2b2f3a", "#4a3a30", "#1e1f22", "#6b2f2a", "#3b4a3a", "#8a8070", "#253a52"];
  const people = [];
  const n = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const p = new THREE.Group();
    const standing = i === 0;
    const coat = lit(clothes[Math.floor(rand() * clothes.length)], 0.25);
    const skin = lit(["#c99a78", "#e0b896", "#8d5f45", "#b07d5a"][Math.floor(rand() * 4)], 0.3);
    const hair = lit("#16130f", 0.15);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, standing ? 0.55 : 0.38, 4, 10), coat);
    torso.scale.set(1, 1, 0.7);
    const head = new THREE.Group();
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), skin);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.106, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    crown.rotation.x = 0.35;
    head.add(face, crown);
    if (standing) {
      torso.position.y = 1.15; head.position.y = 1.62;
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.18), lit("#1c1d20", 0.2));
      legs.position.y = 0.42;
      p.add(legs);
      const d = DOORS[Math.floor(rand() * DOORS.length)];
      p.position.set(d + 0.62, 0, 0.25);
    } else {
      torso.position.y = 0.82; head.position.y = 1.22;
      const lap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.42), lit("#1c1d20", 0.2));
      lap.position.set(0, 0.52, 0.12);
      p.add(lap);
      const [a, b] = gaps[1 + Math.floor(rand() * 3)];
      const side = rand() < 0.6 ? 1 : -1;
      p.position.set(a + 0.4 + rand() * (b - a - 0.8), 0, side * (iw / 2 - 0.3));
      p.rotation.y = side > 0 ? Math.PI : 0; // facing across the car
    }
    p.add(torso, head);
    p.userData = { head, torso, phase: rand() * 6.28, look: 0, nextLook: 2 + rand() * 6, standing };
    g.add(p);
    people.push(p);
  }
  return { group: g, view, people };
}

export function createTrain({ cars = 4 } = {}) {
  const g = new THREE.Group();
  const roof = new THREE.MeshStandardMaterial({ color: "#5f6464", metalness: 0.5, roughness: 0.6 });
  const under = new THREE.MeshStandardMaterial({ color: "#151717", roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: "#9ea3a3", metalness: 0.55, roughness: 0.45 });
  const leafTex = doorLeaf();
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex.map, alphaMap: leafTex.alphaMap, alphaTest: 0.5, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });
  const glass = new THREE.MeshStandardMaterial({ color: "#d8ece6", roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.1, depthWrite: false });
  const hits = [], leaves = [], views = [], people = [];
  for (let k = 0; k < cars; k++) {
    const cx = CAR / 2 + k * (CAR + GAP);
    const car = new THREE.Group();
    car.position.x = cx;
    // the far wall, roof and underframe from outside (the platform side is the textured skin below)
    const farWall = new THREE.Mesh(new THREE.BoxGeometry(CAR, HEIGHT - 0.3, 0.06), steel);
    farWall.position.set(0, BOTTOM + (HEIGHT - 0.3) / 2, WIDTH / 2 - 0.03);
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
    const inside = interior(41 + k * 16);
    car.add(inside.group);
    views.push(inside.view);
    people.push(...inside.people);
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
    map: reflection(), color: "#cfe9df", transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false,
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
      // the city past the far windows runs by when the train moves
      views.forEach(v => (v.offset.x += speed * dt * 0.05));
      if (reduced) return;
      people.forEach(p => {
        const u = p.userData;
        p.rotation.z = Math.sin(t * 0.9 + u.phase) * 0.012 + speed * 0.002;
        u.nextLook -= dt;
        if (u.nextLook < 0) { u.look = (Math.random() - 0.5) * 1.1; u.nextLook = 3 + Math.random() * 7; }
        u.head.rotation.y += (u.look - u.head.rotation.y) * Math.min(1, dt * 2);
        if (u.standing) u.torso.rotation.z = Math.sin(t * 0.5 + u.phase) * 0.03;
      });
    },
  };
}
