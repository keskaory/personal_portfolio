// The last train: stainless cars with a red stripe, lit inside. Through the
// windows you see the ceiling tubes, the poles, the bench seats, a few people
// standing, and past them the far windows full of out-of-focus city colour.
//
// Built facing -x (the cab at x = 0, the cars running back along +x), its
// platform side at z = -1.45 from the train's centre line, floor at y = 0.
import * as THREE from "three";
import { seeded } from "./textures.js";

const CAR = 20, GAP = 0.6, HEIGHT = 3.2, WIDTH = 2.9, BOTTOM = -0.6;
const PX = 102.4; // canvas pixels per metre along the car
const W = 2048, H = 320; // one car side: 20 m by 3.2 m
const y2c = y => (BOTTOM + HEIGHT - y) * 100; // world height -> canvas row

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

// what you see through one pane: the lit interior and the city beyond the far side
function interior(ctx, x, y, w, h, rand, { person = false } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#f4fbf6");
  g.addColorStop(0.18, "#dfeee7");
  g.addColorStop(1, "#b9ccc4");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // the far windows: darker, with the city's colour smeared across them
  const fy = y + h * 0.2, fh = h * 0.42;
  ctx.fillStyle = "#1d2a2a";
  ctx.fillRect(x, fy, w, fh);
  const colours = ["255,86,64", "255,178,72", "88,255,170", "120,220,255", "255,120,90", "255,214,140"];
  for (let i = 0; i < Math.max(3, w / 9); i++) {
    const cx = x + rand() * w, cy = fy + rand() * fh, r = 4 + rand() * 13;
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, `rgba(${colours[Math.floor(rand() * colours.length)]},${0.5 + rand() * 0.45})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  // window frames on the far side
  ctx.fillStyle = "rgba(200,214,208,0.9)";
  for (let k = x + 30; k < x + w; k += 120) ctx.fillRect(k, fy, 6, fh);
  // the ceiling's tube light
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y + 3, w, 5);
  // bench seat backs, the dark teal of old upholstery
  ctx.fillStyle = "#2f6a6c";
  ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x, y + h * 0.66, w, 3);
  // steel poles
  ctx.fillStyle = "#9aa6a2";
  for (let k = x + 18 + rand() * 30; k < x + w; k += 70 + rand() * 40) ctx.fillRect(k, y, 3, h);
  // someone standing, out of focus, holding a pole
  if (person) {
    const px = x + w * (0.3 + rand() * 0.4);
    ctx.filter = "blur(2.5px)";
    ctx.fillStyle = "rgba(28,30,32,0.85)";
    ctx.beginPath(); ctx.ellipse(px, y + h * 0.28, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(px - 17, y + h * 0.4, 34, h * 0.7, 10); ctx.fill();
    ctx.filter = "none";
  }
  ctx.restore();
}

function carSide(seed, people) {
  const rand = seeded(seed);
  const [c, ctx] = canvas(W, H);
  const [e, ex] = canvas(W, H);
  ex.fillStyle = "#000"; ex.fillRect(0, 0, W, H);

  // brushed stainless with panel seams
  const body = ctx.createLinearGradient(0, 0, 0, H);
  body.addColorStop(0, "#b9bdbd");
  body.addColorStop(0.5, "#a3a8a8");
  body.addColorStop(1, "#7f8485");
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.05})`;
    ctx.fillRect(rand() * W, rand() * H, 40 + rand() * 120, 1);
  }
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let x = 0; x < W; x += 205) ctx.fillRect(x, 0, 2, H);

  // the red stripe below the windows
  ctx.fillStyle = "#b8231f";
  ctx.fillRect(0, y2c(0.78), W, y2c(0.62) - y2c(0.78));
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, y2c(0.78), W, 2);

  const doors = [-6.6, -2.2, 2.2, 6.6].map(d => (d + CAR / 2) * PX);
  const doorW = 1.3 * PX;
  const winTop = y2c(1.9), winBot = y2c(0.86);
  // windows between the doors
  let person = 0;
  const panes = [];
  let x = 0.5 * PX;
  doors.forEach(d => { panes.push([x, d - doorW / 2 - 0.35 * PX]); x = d + doorW / 2 + 0.35 * PX; });
  panes.push([x, W - 0.5 * PX]);
  panes.forEach(([a, b], i) => {
    for (let k = a; k < b - 20; k += 1.6 * PX) {
      const w = Math.min(1.45 * PX, b - k);
      if (w < 40) continue;
      const draw = target => {
        target.fillStyle = "#2a2e2e";
        target.beginPath(); target.roundRect(k - 4, winTop - 4, w + 8, winBot - winTop + 8, 10); target.fill();
      };
      draw(ctx);
      const has = people.includes(person++);
      const r1 = seeded(seed * 31 + person);
      interior(ctx, k, winTop, w, winBot - winTop, r1, { person: has });
      interior(ex, k, winTop, w, winBot - winTop, seeded(seed * 31 + person), { person: has });
    }
  });
  // doors: darker steel, with tall lit windows and a small amber lamp above
  doors.forEach((d, i) => {
    const top = y2c(2.0), bot = y2c(0.02);
    ctx.fillStyle = "#8c9191";
    ctx.fillRect(d - doorW / 2, top, doorW, bot - top);
    ctx.fillStyle = "#3b4040";
    ctx.fillRect(d - 1, top, 2, bot - top);
    ctx.strokeStyle = "#5c6262"; ctx.lineWidth = 3;
    ctx.strokeRect(d - doorW / 2, top, doorW, bot - top);
    [-1, 1].forEach(s => {
      const wx = d + s * doorW * 0.25 - 0.22 * PX, wy = y2c(1.85), ww = 0.44 * PX, wh = y2c(0.98) - y2c(1.85);
      interior(ctx, wx, wy, ww, wh, seeded(seed + i * 7 + s));
      interior(ex, wx, wy, ww, wh, seeded(seed + i * 7 + s));
    });
    [ctx, ex].forEach(t => { t.fillStyle = "#ffb347"; t.fillRect(d - 9, y2c(2.12), 18, 7); });
  });
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const emissiveMap = new THREE.CanvasTexture(e);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap, doors: doors.map(d => d / PX - CAR / 2) };
}

function cabFace() {
  const [c, ctx] = canvas(296, 320);
  const [e, ex] = canvas(296, 320);
  ex.fillStyle = "#000"; ex.fillRect(0, 0, 296, 320);
  ctx.fillStyle = "#a6abab"; ctx.fillRect(0, 0, 296, 320);
  ctx.fillStyle = "#b8231f"; ctx.fillRect(0, y2c(0.78), 296, y2c(0.62) - y2c(0.78));
  // the windscreen, dark, with the driver's cab faintly lit
  const g = ctx.createLinearGradient(0, y2c(2.3), 0, y2c(1.0));
  g.addColorStop(0, "#151b1b"); g.addColorStop(1, "#253131");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(22, y2c(2.35), 252, y2c(1.05) - y2c(2.35), 14); ctx.fill();
  ctx.fillStyle = "rgba(160,220,200,0.12)";
  ctx.fillRect(40, y2c(1.3), 216, 10);
  // headlights low on the front, white; marker lamps above, amber
  [[52, y2c(0.42)], [244, y2c(0.42)]].forEach(([x, y]) => [ctx, ex].forEach(t => {
    t.fillStyle = "#ffffff"; t.beginPath(); t.arc(x, y, 13, 0, Math.PI * 2); t.fill();
  }));
  [[40, y2c(2.5)], [256, y2c(2.5)]].forEach(([x, y]) => [ctx, ex].forEach(t => {
    t.fillStyle = "#ffb347"; t.beginPath(); t.arc(x, y, 6, 0, Math.PI * 2); t.fill();
  }));
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(e); emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

// the lit windows reflected in the wet platform: soft vertical smears
// (the canvas's bottom edge lies along the platform edge, so it fades upward)
function reflection() {
  const [c, ctx] = canvas(1024, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,255,255,1)");
  ctx.filter = "blur(6px)";
  for (let x = 30; x < 1000; x += 82) {
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x, 0, 62, 128);
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowSprite(colour) {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
}

export function createTrain({ cars = 4 } = {}) {
  const g = new THREE.Group();
  const sides = [carSide(41, [1, 6]), carSide(57, [3]), carSide(73, [2, 8])];
  const roof = new THREE.MeshStandardMaterial({ color: "#5f6464", metalness: 0.5, roughness: 0.6 });
  const under = new THREE.MeshStandardMaterial({ color: "#151717", roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: "#9ea3a3", metalness: 0.55, roughness: 0.45 });
  const hits = [];
  let doorsX = [];
  for (let k = 0; k < cars; k++) {
    const cx = CAR / 2 + k * (CAR + GAP);
    const car = new THREE.Group();
    car.position.x = cx;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(CAR, HEIGHT - 0.3, WIDTH - 0.04), steel);
    shell.position.y = BOTTOM + (HEIGHT - 0.3) / 2;
    car.add(shell);
    const top = new THREE.Mesh(new THREE.BoxGeometry(CAR, 0.3, WIDTH - 0.3), roof);
    top.position.y = BOTTOM + HEIGHT - 0.15;
    car.add(top);
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(CAR - 1, 0.5, WIDTH - 0.5), under);
    bogie.position.y = BOTTOM - 0.25;
    car.add(bogie);
    const s = sides[k % sides.length];
    const side = new THREE.Mesh(new THREE.PlaneGeometry(CAR, HEIGHT), new THREE.MeshStandardMaterial({
      map: s.map, emissiveMap: s.emissiveMap, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.8, metalness: 0.35, roughness: 0.6,
    }));
    side.position.set(0, BOTTOM + HEIGHT / 2, -WIDTH / 2);
    side.rotation.y = Math.PI;
    car.add(side);
    hits.push(side);
    if (k === 0) doorsX = s.doors.map(d => cx - d); // mirrored by the rotation
    g.add(car);
  }
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
  // set by the station, whose floor is at the train's floor level
  refl.position.set(cars * (CAR + GAP) / 2, 0.009, -WIDTH / 2 - 1.5);
  g.add(refl);

  return { group: g, hits, doorsX, spill, headlight, length: cars * (CAR + GAP) };
}
