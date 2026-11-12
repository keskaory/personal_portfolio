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
import { roughnessMap } from "./surface.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CAR = 20, GAP = 0.3, HEIGHT = 3.2, WIDTH = 2.9, BOTTOM = -0.6;
const PX = 102.4; // canvas pixels per metre along the car
const W = 2048, H = 320; // one car side: 20 m by 3.2 m
const y2c = y => (BOTTOM + HEIGHT - y) * 100; // world height -> canvas row
const DOORS = [-6.6, -2.2, 2.2, 6.6];
const DOOR_W = 1.3, DOOR_H = 1.98;
const WIN_BOT = 0.9, WIN_TOP = 1.9; // the side windows' openings, floor to sill and head

// where the side windows fall along the canvas: [start, width] in canvas pixels,
// in runs between the doorways
function windowLayout() {
  const doors = DOORS.map(d => (d + CAR / 2) * PX);
  const dw = DOOR_W * PX;
  let x = 0.5 * PX;
  const spans = [], windows = [];
  doors.forEach(d => { spans.push([x, d - dw / 2 - 0.35 * PX]); x = d + dw / 2 + 0.35 * PX; });
  spans.push([x, W - 0.5 * PX]);
  spans.forEach(([s0, s1]) => {
    for (let k = s0; k < s1 - 20; k += 1.6 * PX) {
      const w = Math.min(1.42 * PX, s1 - k);
      if (w >= 40) windows.push([k, w]);
    }
  });
  return windows;
}

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

// The outside of one car, after the reference photos: brushed stainless, a red band
// under the roof, ribbed panels below the windows, deep black gaskets round the
// windows, doors set back in dark frames. Alongside the colour it draws a normal
// map (the ribs and seams catch the light), the alpha that opens windows and
// doorways, the emissive door lamps, and the pools the lit windows throw on the platform.
function carSide(seed) {
  const rand = seeded(seed);
  const [c, ctx] = canvas(W, H);
  const [a, ax] = canvas(W, H);
  const [e, ex] = canvas(W, H);
  const [wn, wx] = canvas(W, H);
  const [n, nx] = canvas(W, H);
  wx.fillStyle = "#fff"; wx.fillRect(0, 0, W, H);
  ax.fillStyle = "#fff"; ax.fillRect(0, 0, W, H);
  ex.fillStyle = "#000"; ex.fillRect(0, 0, W, H);
  nx.fillStyle = "rgb(128,128,255)"; nx.fillRect(0, 0, W, H);
  // stainless, brushed along the car's length, a little darker toward the sill
  const body = ctx.createLinearGradient(0, 0, 0, H);
  body.addColorStop(0, "#c3c6c4"); body.addColorStop(0.55, "#aeb2b1"); body.addColorStop(1, "#8d9191");
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2200; i++) { ctx.fillStyle = `rgba(${rand() < 0.5 ? "255,255,255" : "0,0,0"},${rand() * 0.045})`; ctx.fillRect(rand() * W, rand() * H, 30 + rand() * 160, 1); }
  // panel seams: a dark line and a raised edge in the normal map
  for (let x = 0; x < W; x += 1.6 * PX) {
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x, 0, 2, H);
    nx.fillStyle = "rgb(90,128,255)"; nx.fillRect(x - 1, 0, 1, H); nx.fillStyle = "rgb(166,128,255)"; nx.fillRect(x + 2, 0, 1, H);
  }
  // the red band under the roof, with a thin dark line beneath it
  ctx.fillStyle = "#a8221b"; ctx.fillRect(0, y2c(2.5), W, y2c(2.22) - y2c(2.5));
  ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(0, y2c(2.5), W, 2);
  ctx.fillStyle = "#2a2c2c"; ctx.fillRect(0, y2c(2.22), W, 4);
  // ribbed lower panels: each rib a highlight over a shadow, and a slope in the normal map
  for (let y = y2c(0.78); y < y2c(0.06); y += 7) {
    ctx.fillStyle = "rgba(255,255,255,0.16)"; ctx.fillRect(0, y, W, 2);
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(0, y + 4, W, 2);
    nx.fillStyle = "rgb(128,176,255)"; nx.fillRect(0, y, W, 3);
    nx.fillStyle = "rgb(128,84,255)"; nx.fillRect(0, y + 4, W, 3);
  }
  ctx.fillStyle = "#3a3d3d"; ctx.fillRect(0, y2c(0.82), W, 4); // the rubbing strip above the ribs
  const doors = DOORS.map(d => (d + CAR / 2) * PX);
  const dw = DOOR_W * PX;
  const winTop = y2c(WIN_TOP), winBot = y2c(WIN_BOT);
  const windows = windowLayout();
  windows.forEach(([k, w]) => {
    // a thick black rubber gasket, with a shadow on the steel below it where the window is set in
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.roundRect(k - 9, winTop - 6, w + 18, winBot - winTop + 18, 16); ctx.fill();
    ctx.fillStyle = "#121414"; ctx.beginPath(); ctx.roundRect(k - 8, winTop - 8, w + 16, winBot - winTop + 16, 16); ctx.fill();
    nx.fillStyle = "rgb(128,100,255)"; nx.beginPath(); nx.roundRect(k - 8, winBot + 4, w + 16, 6, 3); nx.fill();
    [ax, wx].forEach(t => { t.fillStyle = "#000"; t.beginPath(); t.roundRect(k, winTop, w, winBot - winTop, 11); t.fill(); });
  });
  doors.forEach(d => {
    const top = y2c(DOOR_H + 0.02);
    // the doorway's dark frame, a sill plate at the foot
    ctx.fillStyle = "#1d2020"; ctx.fillRect(d - dw / 2 - 12, top - 12, dw + 24, y2c(0) - top + 12);
    ctx.fillStyle = "#8c9090"; ctx.fillRect(d - dw / 2 - 12, y2c(0.03), dw + 24, 4);
    nx.fillStyle = "rgb(84,128,255)"; nx.fillRect(d - dw / 2 - 12, top, 4, y2c(0) - top);
    nx.fillStyle = "rgb(172,128,255)"; nx.fillRect(d + dw / 2 + 8, top, 4, y2c(0) - top);
    ax.fillStyle = "#000"; ax.fillRect(d - dw / 2, top, dw, y2c(0.0) - top);
    [ctx, ex].forEach(t => { t.fillStyle = "#ffb347"; t.fillRect(d - 9, y2c(2.12), 18, 7); });
  });
  doors.forEach(d => [-1, 1].forEach(sg => { wx.fillStyle = "#000"; wx.beginPath(); wx.roundRect(d + sg * dw * 0.25 - 0.17 * PX, y2c(1.85), 0.34 * PX, y2c(1.02) - y2c(1.85), 8); wx.fill(); }));
  // the light the windows and open doorways throw down onto the platform: soft trapezoids,
  // brightest at the edge and spreading as they fall away (drawn mirrored to match the car)
  const [p, px] = canvas(1024, 256);
  const sx = 1024 / W;
  px.filter = "blur(4px)"; // soft edges, but the dark between windows survives
  const pool = (x0, w, strength) => {
    const xa = (W - x0 - w) * sx, wa = w * sx;
    const g = px.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, `rgba(255,255,255,${strength})`); g.addColorStop(1, "rgba(255,255,255,0)");
    px.fillStyle = g;
    px.beginPath(); px.moveTo(xa + 4, 256); px.lineTo(xa + wa - 4, 256); px.lineTo(xa + wa * 1.08, 0); px.lineTo(xa - wa * 0.08, 0); px.closePath(); px.fill();
  };
  windows.forEach(([k, w]) => pool(k, w, 0.7));
  doors.forEach(d => pool(d - dw / 2, dw, 1));
  const pools = new THREE.CanvasTexture(p);
  pools.colorSpace = THREE.SRGBColorSpace;
  const normal = new THREE.CanvasTexture(n);
  normal.anisotropy = 8;
  return { map: texture(c), alphaMap: texture(a, false), emissiveMap: texture(e), windowMask: texture(wn, false), normalMap: normal, pools };
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

function glowSprite(colour) {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.2, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
}

// ---------------------------------------------------------------- inside
// The carriage from inside, built to hold up in a close shot. Four cars of real lights would
// cost too much, so the light from the two rows of fluorescent fittings is baked into the
// textures: brightest under the ceiling, falling off down the walls and toward the floor and
// into the corners. On top of that the materials are physical: the laminate has a soft sheen,
// the stainless takes reflections, the moquette is matte, the rubber floor is worn smooth down
// the middle. Windows have depth (a lining reveal and a black rubber seal), and the far glass
// carries the night outside, the rain, and the carriage's own reflection.
const FLUOR = new THREE.Color("#eef2e6"); // cool-white tubes; the laminate and seats keep the warmth
const WHITE = new THREE.Color(1, 1, 1);

function canvasTex(w, h, draw, { srgb = true, repeat = null } = {}) {
  const [c, ctx] = canvas(w, h);
  draw(ctx, w, h);
  const t = texture(c, srgb);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// physical material with its share of the carriage's light baked in as a glow
const lit = (opts, glow, extra = {}) => new THREE.MeshStandardMaterial({
  roughness: 0.6, metalness: 0, envMapIntensity: 0.3, ...opts, ...extra,
  emissive: opts.map ? WHITE : new THREE.Color(opts.color || "#ffffff"), emissiveMap: opts.map || null, emissiveIntensity: glow,
});

// the far side's lining from inside, on the same canvas as the car's skin (so its window
// holes line up): laminate, panel seams, the closed doors, a scuffed stainless kick plate
function liningTex(seed) {
  const rand = seeded(seed);
  return canvasTex(W, H, ctx => {
    const g = ctx.createLinearGradient(0, y2c(2.2), 0, y2c(0));
    g.addColorStop(0, "#e6dfcb"); g.addColorStop(0.2, "#d8cfb7"); g.addColorStop(0.6, "#b0a68d"); g.addColorStop(1, "#5f5849");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${rand() < 0.5 ? "60,50,35" : "255,250,235"},${rand() * 0.035})`; ctx.fillRect(rand() * W, rand() * H, 2 + rand() * 7, 1 + rand() * 3); }
    // behind the benches the wall is in their shadow
    const benches = [[-9.7, -7.4], [-5.8, -3.0], [-1.4, 1.4], [3.0, 5.8], [7.4, 9.7]].map(([a, b]) => [(a + CAR / 2) * PX, (b + CAR / 2) * PX]);
    benches.forEach(([a, b]) => {
      const s = ctx.createLinearGradient(0, y2c(1.05), 0, y2c(0.4)); s.addColorStop(0, "rgba(30,24,16,0)"); s.addColorStop(1, "rgba(30,24,16,0.35)");
      ctx.fillStyle = s; ctx.fillRect(a, y2c(1.05), b - a, y2c(0.4) - y2c(1.05));
    });
    // panel seams, with a lit edge
    for (let x = 0.8 * PX; x < W; x += 1.6 * PX) {
      ctx.fillStyle = "rgba(40,34,26,0.35)"; ctx.fillRect(x, y2c(2.2), 2, y2c(0.32) - y2c(2.2));
      ctx.fillStyle = "rgba(255,255,255,0.16)"; ctx.fillRect(x + 2, y2c(2.2), 1, y2c(0.32) - y2c(2.2));
    }
    ctx.fillStyle = "rgba(40,34,26,0.3)"; ctx.fillRect(0, y2c(0.84), W, 2);
    // kick plate
    const k = ctx.createLinearGradient(0, y2c(0.32), 0, y2c(0)); k.addColorStop(0, "#8a8e8b"); k.addColorStop(1, "#3f4240");
    ctx.fillStyle = k; ctx.fillRect(0, y2c(0.32), W, y2c(0) - y2c(0.32));
    for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(${rand() < 0.6 ? "0,0,0" : "255,255,255"},${rand() * 0.12})`; ctx.fillRect(rand() * W, y2c(0.31) + rand() * 30, 8 + rand() * 40, 1); }
    // the doors on this side, closed: a dark frame, grey leaves, the rubber seal where they meet
    const dw = DOOR_W * PX;
    DOORS.map(d => (d + CAR / 2) * PX).forEach(d => {
      const top = y2c(DOOR_H + 0.02);
      ctx.fillStyle = "#1c1e1d"; ctx.fillRect(d - dw / 2 - 9, top - 9, dw + 18, y2c(0) - top + 9);
      const dg = ctx.createLinearGradient(0, top, 0, y2c(0)); dg.addColorStop(0, "#b3b7b3"); dg.addColorStop(0.7, "#8b8f8b"); dg.addColorStop(1, "#5a5d5a");
      ctx.fillStyle = dg; ctx.fillRect(d - dw / 2, top, dw, y2c(0) - top);
      ctx.fillStyle = "#101111"; ctx.fillRect(d - 3, top, 6, y2c(0) - top);
      ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(d - dw / 2, top, 2, y2c(0) - top);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(0,0,0,${rand() * 0.15})`; ctx.fillRect(d - dw / 2 + rand() * dw, top + rand() * (y2c(0) - top), 1 + rand() * 3, 4 + rand() * 20); }
    });
    // grime gathering low on the panels
    for (let i = 0; i < 70; i++) {
      const x = rand() * W, gg = ctx.createLinearGradient(0, y2c(0.9), 0, y2c(0.32));
      gg.addColorStop(0, "rgba(40,30,20,0)"); gg.addColorStop(1, `rgba(40,30,20,${0.06 + rand() * 0.12})`);
      ctx.fillStyle = gg; ctx.fillRect(x, y2c(0.9), 20 + rand() * 120, y2c(0.32) - y2c(0.9));
    }
  });
}

// seat moquette: a dense orange weave, small diamonds, worn darker where people sit
const moquette = canvasTex(256, 256, (ctx, w, h) => {
  const rand = seeded(907);
  ctx.fillStyle = "#b0501d"; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) for (let x = ((y / 2) % 2) * 2; x < w; x += 4) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? "70,20,5" : "235,135,75"},${0.12 + rand() * 0.14})`; ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = "rgba(60,18,6,0.22)"; ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 16) for (let x = ((y / 16) % 2) * 8; x < w; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.stroke();
  }
  for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(40,10,0,${0.05 + rand() * 0.07})`; ctx.beginPath(); ctx.ellipse(rand() * w, rand() * h, 30 + rand() * 30, 20 + rand() * 20, 0, 0, Math.PI * 2); ctx.fill(); }
}, { repeat: [6, 1] });

// rubber floor: speckled, darker under the benches, worn smooth down the aisle
const floorMap = canvasTex(1024, 256, (ctx, w, h) => {
  const rand = seeded(911);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#151716"); g.addColorStop(0.17, "#2c302e"); g.addColorStop(0.5, "#454946"); g.addColorStop(0.83, "#2c302e"); g.addColorStop(1, "#151716");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 12000; i++) { ctx.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "215,222,216"},${rand() * 0.12})`; ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.4, 1 + rand() * 1.4); }
  for (let i = 0; i < 220; i++) { ctx.fillStyle = `rgba(0,0,0,${rand() * 0.1})`; ctx.fillRect(rand() * w, h * 0.3 + rand() * h * 0.4, 10 + rand() * 50, 1 + rand() * 2); }
});
const floorRough = canvasTex(64, 256, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgb(230,230,230)"); g.addColorStop(0.35, "rgb(170,170,170)"); g.addColorStop(0.5, "rgb(120,120,120)"); g.addColorStop(0.65, "rgb(170,170,170)"); g.addColorStop(1, "rgb(230,230,230)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}, { srgb: false });

// ceiling: pale panels, brightest beside the fittings and falling off toward the walls
const ceilMap = canvasTex(64, 256, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#d8ddd6"); g.addColorStop(0.5, "#c3c9c2"); g.addColorStop(1, "#d8ddd6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
});
const coveMap = canvasTex(64, 128, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h); // v = 0 at the fittings, 1 at the wall
  g.addColorStop(0, "#e2e6df"); g.addColorStop(1, "#9ea39c");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
});

// the end walls, with the gangway door
const endMap = canvasTex(256, 256, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#ddd5c0"); g.addColorStop(0.65, "#b3a98f"); g.addColorStop(1, "#5d5648");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#1c1e1d"; ctx.fillRect(w * 0.36 - 4, h * 0.12 - 4, w * 0.28 + 8, h * 0.88 + 4);
  const d = ctx.createLinearGradient(0, h * 0.12, 0, h); d.addColorStop(0, "#9da19d"); d.addColorStop(1, "#555855");
  ctx.fillStyle = d; ctx.fillRect(w * 0.36, h * 0.12, w * 0.28, h * 0.88);
  ctx.fillStyle = "#0e1312"; ctx.beginPath(); ctx.roundRect(w * 0.4, h * 0.2, w * 0.2, h * 0.3, 8); ctx.fill();
});

// a rounded rectangle as a Shape, centred
function roundRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function ring(outerW, outerH, outerR, innerW, innerH, innerR, depth) {
  const s = roundRectShape(outerW, outerH, outerR);
  s.holes.push(roundRectShape(innerW, innerH, innerR));
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 });
}

// a hanging strap's handle: a rounded triangle of tube, in the plane facing the seats
const handleGeo = (() => {
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + Math.PI / 2;
    const r = 0.052 * (1 + 0.16 * Math.cos(3 * (a - Math.PI / 2))); // a circle pulled toward a triangle
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r - 0.05, 0));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 26, 0.0065, 5, true); // enough to read as a smooth loop
})();

// detail: false for cars you only ever see from down the platform: the same room, without the
// small things (straps, armrests, window seals) that can't be made out from there
function interior(seed, lineStrip, brightness, rainOpts, detail = true) {
  const g = new THREE.Group();
  const iw = WIDTH - 0.14;
  const b = brightness;
  const M = {
    floor: lit({ map: floorMap }, 0.12 * b, { roughness: 0.85, roughnessMap: floorRough, envMapIntensity: 0.25 }),
    seat: lit({ map: moquette }, 0.2 * b, { roughness: 0.95, envMapIntensity: 0.1 }),
    plinth: lit({ color: "#3a3d3b" }, 0.08 * b, { roughness: 0.5, metalness: 0.4, envMapIntensity: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: "#c9cfcd", metalness: 0.95, roughness: 0.24, envMapIntensity: 1.1, emissive: new THREE.Color("#9aa3a1"), emissiveIntensity: 0.1 * b }),
    reveal: lit({ color: "#cdc4ae" }, 0.24 * b, { roughness: 0.45, envMapIntensity: 0.4 }),
    rubber: lit({ color: "#0d0f0e" }, 0.02, { roughness: 0.65, envMapIntensity: 0.4 }),
    strap: lit({ color: "#3a4440" }, 0.12 * b, { roughness: 0.55 }),
    handle: lit({ color: "#e6e0cf" }, 0.3 * b, { roughness: 0.32, envMapIntensity: 0.6 }),
    housing: lit({ color: "#c9cec7" }, 0.3 * b, { roughness: 0.4 }),
    ceil: lit({ map: ceilMap }, 0.36 * b, { roughness: 0.7 }),
    cove: lit({ map: coveMap }, 0.34 * b, { roughness: 0.7 }),
    end: lit({ map: endMap }, 0.3 * b, { roughness: 0.5, envMapIntensity: 0.35 }),
  };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = V3(1, 1, 1);

  // ---- ceiling: a flat panel between the two rows of fittings, coves sloping down to the walls
  const CEIL = 2.27;
  const centre = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 0.2, 0.92), M.ceil);
  centre.rotation.x = Math.PI / 2; centre.position.y = CEIL;
  g.add(centre);
  [-1, 1].forEach(s => {
    const za = 0.66, zb = iw / 2, yb = 2.15, L = (CAR - 0.2) / 2;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-L, CEIL, s * za, L, CEIL, s * za, -L, yb, s * zb, L, yb, s * zb], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2)); // v: fittings to wall
    geo.setIndex(s > 0 ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3]); // facing down and in
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, M.cove));
  });

  // ---- fluorescent fittings: a pale housing, the lit diffuser beneath, in 1.2 m lengths; the
  // tubes age differently, so one burns a little dimmer and greener
  const rand = seeded(seed);
  const fittings = [];
  [-0.56, 0.56].forEach(z => { for (let x = -CAR / 2 + 0.75; x < CAR / 2 - 0.6; x += 1.22) fittings.push([x, z]); });
  const housing = new THREE.InstancedMesh(new THREE.BoxGeometry(1.18, 0.045, 0.2), M.housing, fittings.length);
  const diffuser = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.12, 0.15), new THREE.MeshBasicMaterial({ color: WHITE }), fittings.length);
  const tired = Math.floor(rand() * fittings.length);
  fittings.forEach(([x, z], i) => {
    m4.compose(V3(x, CEIL - 0.02, z), q.identity(), one); housing.setMatrixAt(i, m4);
    q.setFromEuler(e.set(Math.PI / 2, 0, 0)); m4.compose(V3(x, CEIL - 0.043, z), q, one); diffuser.setMatrixAt(i, m4);
    const c = FLUOR.clone().multiplyScalar((1.18 + rand() * 0.1) * (0.9 + 0.1 * b));
    if (i === tired) c.multiply(new THREE.Color(0.78, 0.86, 0.74));
    diffuser.setColorAt(i, c);
  });
  g.add(housing, diffuser);

  // ---- end walls
  [-1, 1].forEach(s => {
    const end = new THREE.Mesh(new THREE.PlaneGeometry(iw, CEIL), M.end);
    end.position.set(s * (CAR / 2 - 0.1), CEIL / 2, 0);
    end.rotation.y = -s * Math.PI / 2;
    g.add(end);
  });

  // ---- floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 0.2, iw), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  g.add(floor);

  // ---- benches between the doorways: a stainless plinth set back for your heels, a rounded
  // cushion, a back cushion leaning a little, stainless armrests between places
  const gaps = [[-9.7, -7.4], [-5.8, -3.0], [-1.4, 1.4], [3.0, 5.8], [7.4, 9.7]];
  const arms = [], endPoles = [];
  gaps.forEach(([a, bb]) => [-1, 1].forEach(s => {
    const len = bb - a, cx = (a + bb) / 2, wall = s * (iw / 2);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(len - 0.04, 0.34, 0.3), M.plinth);
    plinth.position.set(cx, 0.18, wall - s * 0.2);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(len, 0.11, 0.47, 2, 0.04), M.seat);
    seat.position.set(cx, 0.42, wall - s * 0.25);
    const back = new THREE.Mesh(new RoundedBoxGeometry(len, 0.48, 0.09, 2, 0.035), M.seat);
    back.position.set(cx, 0.74, wall - s * 0.085);
    back.rotation.x = s * 0.13; // leaning back toward the wall
    g.add(plinth, seat, back);
    for (let x = a + 0.86; x < bb - 0.4; x += 0.86) arms.push([x, s]);
    endPoles.push([a + 0.03, s], [bb - 0.03, s]);
  }));
  const armGeo = new THREE.TorusGeometry(0.15, 0.013, 6, 14, Math.PI);
  const armMesh = new THREE.InstancedMesh(armGeo, M.steel, detail ? arms.length : 0);
  arms.forEach(([x, s], i) => { q.setFromEuler(e.set(0, Math.PI / 2, 0)); m4.compose(V3(x, 0.48, s * (iw / 2 - 0.32)), q, one); armMesh.setMatrixAt(i, m4); });
  g.add(armMesh);

  // ---- stainless: doorway poles, a pole at each bench end up to the overhead rail, the rails on
  // brackets, flanges where poles meet floor and ceiling
  const poleGeo = new THREE.CylinderGeometry(0.019, 0.019, 1, 16);
  const poles = [];
  DOORS.forEach(d => [-0.45, 0.45].forEach(o => poles.push([d + o, 0, 0.01, CEIL])));
  endPoles.forEach(([x, s]) => poles.push([x, s * 0.62, 0.01, 1.95]));
  const poleMesh = new THREE.InstancedMesh(poleGeo, M.steel, poles.length);
  const flangeGeo = new THREE.CylinderGeometry(0.034, 0.04, 0.03, 16);
  const flanges = new THREE.InstancedMesh(flangeGeo, M.steel, poles.length * 2);
  poles.forEach(([x, z, y0, y1], i) => {
    m4.compose(V3(x, (y0 + y1) / 2, z), q.identity(), V3(1, y1 - y0, 1)); poleMesh.setMatrixAt(i, m4);
    m4.compose(V3(x, y0 + 0.015, z), q.identity(), one); flanges.setMatrixAt(i * 2, m4);
    m4.compose(V3(x, y1 - 0.015, z), q.identity(), one); flanges.setMatrixAt(i * 2 + 1, m4);
  });
  g.add(poleMesh);
  if (detail) g.add(flanges);
  const RAIL_Y = 1.95;
  [-0.62, 0.62].forEach(z => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, CAR - 0.6, 16), M.steel);
    r.rotation.z = Math.PI / 2; r.position.set(0, RAIL_Y, z); g.add(r);
  });
  const brackets = [];
  [-0.62, 0.62].forEach(z => { for (let x = -CAR / 2 + 1; x < CAR / 2 - 0.8; x += 2.4) brackets.push([x, z]); });
  const bracketMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01, 0.01, CEIL - RAIL_Y, 10), M.steel, brackets.length);
  brackets.forEach(([x, z], i) => { m4.compose(V3(x, (CEIL + RAIL_Y) / 2, z), q.identity(), one); bracketMesh.setMatrixAt(i, m4); });
  if (detail) g.add(bracketMesh);

  // ---- hanging straps: a flat band from the rail, a rounded-triangle handle facing the seats,
  // each hanging a touch differently
  const straps = [];
  [-0.62, 0.62].forEach(z => { for (let x = -9.3; x < 9.4; x += 0.42) if (!DOORS.some(d => Math.abs(d - x) < 0.6)) straps.push([x, z]); });
  const bandGeo = new THREE.BoxGeometry(0.024, 0.19, 0.004);
  bandGeo.translate(0, -0.095, 0);
  const bandMesh = new THREE.InstancedMesh(bandGeo, M.strap, straps.length);
  const handMesh = new THREE.InstancedMesh(handleGeo, M.handle, straps.length);
  straps.forEach(([x, z], i) => {
    const sway = (rand() - 0.5) * 0.06, turn = (rand() - 0.5) * 0.3;
    q.setFromEuler(e.set(sway, turn, 0)); m4.compose(V3(x, RAIL_Y - 0.01, z), q, one); bandMesh.setMatrixAt(i, m4);
    const tip = V3(0, -0.19, 0).applyQuaternion(q).add(V3(x, RAIL_Y - 0.01, z));
    m4.compose(tip, q, one); handMesh.setMatrixAt(i, m4);
  });
  if (detail) g.add(bandMesh, handMesh);

  // ---- far-side window openings: a lining reveal round each, and a black rubber seal
  const z0 = iw / 2; // the inside face of the far wall
  const byWidth = new Map();
  windowLayout().forEach(([s0, w]) => {
    const wm = Math.round((w / PX) * 100) / 100;
    if (!byWidth.has(wm)) byWidth.set(wm, []);
    byWidth.get(wm).push(CAR / 2 - (s0 + w / 2) / PX);
  });
  const winH = WIN_TOP - WIN_BOT, winY = (WIN_TOP + WIN_BOT) / 2;
  byWidth.forEach((xs, wm) => {
    const reveal = new THREE.InstancedMesh(ring(wm + 0.16, winH + 0.16, 0.17, wm, winH, 0.11, 0.06), M.reveal, xs.length);
    const seal = new THREE.InstancedMesh(ring(wm + 0.002, winH + 0.002, 0.11, wm - 0.05, winH - 0.05, 0.09, 0.03), M.rubber, xs.length);
    xs.forEach((x, i) => {
      m4.compose(V3(x, winY, z0 - 0.06), q.identity(), one); reveal.setMatrixAt(i, m4);
      m4.compose(V3(x, winY, z0 - 0.025), q.identity(), one); seal.setMatrixAt(i, m4);
    });
    if (detail) g.add(reveal, seal);
  });

  // ---- the far glass: rain, the night beyond, the carriage reflected in it
  const rain = rainWindow(CAR - 0.2, 1.3, { brightness: 1.0, depth: 0.5, fog: 0.4, city: neonCity({ blur: 14, signs: 30 }), cityRepeat: 8, ...rainOpts });
  rain.position.set(0, 1.38, iw / 2 + 0.02);
  rain.rotation.y = Math.PI;
  g.add(rain);

  // ---- panels above the windows: the K line strip over each doorway, plain between
  const framePanels = [];
  DOORS.forEach(d => framePanels.push([-d, lineStrip, 1.2]));
  [-8.4, -4.4, 0, 4.4, 8.4].forEach(x => framePanels.push([x, null, 0.9]));
  framePanels.forEach(([x, map, w]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.2), map
      ? new THREE.MeshBasicMaterial({ map, color: new THREE.Color(0.75, 0.75, 0.75).multiplyScalar(0.8 + 0.2 * b) })
      : lit({ color: "#ded6c4" }, 0.22 * b));
    p.position.set(x, 2.05, iw / 2 - 0.01);
    p.rotation.y = Math.PI;
    g.add(p);
  });
  return { group: g, rain, M };
}

export function createTrain({ cars = 4, lineStrip = null } = {}) {
  const g = new THREE.Group();
  const roof = new THREE.MeshStandardMaterial({ color: "#7e8382", metalness: 0.6, roughness: 0.55 });
  const under = new THREE.MeshStandardMaterial({ color: "#151717", roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: "#9ea3a3", metalness: 0.55, roughness: 0.45 });
  const leafTex = doorLeaf();
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex.map, alphaMap: leafTex.alphaMap, alphaTest: 0.5, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });
  // tinted, reflective glass: the station's tubes slide across it, the interior shows through
  const glass = new THREE.MeshStandardMaterial({ color: "#1e2826", roughness: 0.05, metalness: 0.1, envMapIntensity: 1.6, transparent: true, opacity: 0.2, depthWrite: false });
  // the gangway between cars: black rubber bellows, folded, set in from the sides
  const folds = (() => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 4;
    const x = c.getContext("2d"); const gr = x.createLinearGradient(0, 0, 64, 0);
    [[0, "#0c0c0c"], [0.35, "#2a2a29"], [0.5, "#353533"], [0.65, "#2a2a29"], [1, "#0c0c0c"]].forEach(([k, v]) => gr.addColorStop(k, v));
    x.fillStyle = gr; x.fillRect(0, 0, 64, 4);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(7, 1); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const bellows = new THREE.MeshStandardMaterial({ map: folds, roughness: 0.8, metalness: 0 });
  const endPlate = new THREE.MeshStandardMaterial({ color: "#2e3231", metalness: 0.4, roughness: 0.6 });
  const threshold = new THREE.MeshStandardMaterial({ color: "#b4b8b6", metalness: 0.75, roughness: 0.32 });
  const hits = [], leaves = [], rains = [], pools = [];
  for (let k = 0; k < cars; k++) {
    const cx = CAR / 2 + k * (CAR + GAP);
    const car = new THREE.Group();
    car.position.x = cx;
    // the far wall, roof and underframe from outside (the platform side is the textured skin below)
    const farWall = new THREE.Mesh(new THREE.BoxGeometry(CAR, HEIGHT - 0.3, 0.06), steel);
    farWall.position.set(0, BOTTOM + (HEIGHT - 0.3) / 2, WIDTH / 2 + 0.03); // outside the rain glass
    const top = new THREE.Mesh(new RoundedBoxGeometry(CAR, 0.34, WIDTH - 0.03, 3, 0.15), roof);
    top.position.y = BOTTOM + HEIGHT + 0.02; // its rounded edge rises just above the side's top
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(CAR - 1, 0.5, WIDTH - 0.5), under);
    bogie.position.y = BOTTOM - 0.25;
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(CAR, 0.6, WIDTH - 0.04), steel);
    skirt.position.y = BOTTOM + 0.3;
    car.add(farWall, top, bogie, skirt);
    const s = carSide(41 + k * 16);
    pools.push(s.pools);
    const side = new THREE.Mesh(new THREE.PlaneGeometry(CAR, HEIGHT), new THREE.MeshStandardMaterial({
      map: s.map, alphaMap: s.alphaMap, alphaTest: 0.5, emissiveMap: s.emissiveMap, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 1.2,
      normalMap: s.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: roughnessMap(70 + k, { wear: 0.8 }),
      metalness: 0.5, roughness: 0.36, envMapIntensity: 1.5, side: THREE.DoubleSide, // satin steel: catches the platform light rather than mirroring the dark
    }));
    side.position.set(0, BOTTOM + HEIGHT / 2, -WIDTH / 2);
    side.rotation.y = Math.PI;
    car.add(side);
    hits.push(side);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(CAR, 1.1), glass);
    pane.position.set(0, 1.38, -WIDTH / 2 + 0.02);
    pane.rotation.y = Math.PI;
    car.add(pane);
    const bright = [1, 0.88, 0.96, 0.82][k % 4];
    const inside = interior(41 + k * 16, lineStrip, bright, { reflect: 1 }, k < 2);
    car.add(inside.group);
    rains.push(inside.rain);
    // the far wall from inside: the same window layout as this side, opened to the rain
    const lining = liningTex(77 + k * 13);
    const farIn = new THREE.Mesh(new THREE.PlaneGeometry(CAR, HEIGHT), new THREE.MeshStandardMaterial({
      map: lining, alphaMap: s.windowMask, alphaTest: 0.5, roughness: 0.5, envMapIntensity: 0.35,
      emissive: new THREE.Color(1, 1, 1), emissiveMap: lining, emissiveIntensity: 0.3 * bright,
    }));
    farIn.position.set(0, BOTTOM + HEIGHT / 2, (WIDTH - 0.14) / 2);
    farIn.rotation.y = Math.PI;
    car.add(farIn);
    // the door leaves, in their openings; they slide apart
    DOORS.forEach(d => [-1, 1].forEach(sgn => {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W / 2, DOOR_H, 0.03), leafMat);
      leaf.position.set(-d + sgn * DOOR_W / 4, DOOR_H / 2 + 0.01, -WIDTH / 2 + 0.09); // set back in the doorway
      leaf.userData = { home: leaf.position.x, sgn };
      car.add(leaf);
      leaves.push(leaf);
    }));
    // the car's end, closed off behind the gangway (not at the cab, which has its own face)
    [-1, 1].forEach(e => {
      if (k === 0 && e < 0) return;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, HEIGHT - 0.12, WIDTH - 0.02), endPlate);
      plate.position.set(e * (CAR / 2 - 0.02), BOTTOM + (HEIGHT - 0.12) / 2 + 0.04, 0);
      car.add(plate);
    });
    // flush steel threshold plates in the doorways, level with the platform
    DOORS.forEach(d => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.04, 0.012, 0.16), threshold);
      t.position.set(-d, 0.01, -WIDTH / 2 + 0.06);
      car.add(t);
    });
    if (k < cars - 1) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(GAP + 0.04, 2.3, WIDTH - 0.36), bellows);
      b.position.set(CAR / 2 + GAP / 2, 0.05 + 2.3 / 2, 0);
      car.add(b);
    }
    g.add(car);
  }
  const doorsX = DOORS.map(d => CAR / 2 - d); // the first car's doorways (mirrored by the skin's rotation)
  // the middle of every side window, along the train (mirrored the same way), and the opening's size
  const windowsX = [];
  for (let k = 0; k < cars; k++) windowLayout().forEach(([s0, w]) => windowsX.push(k * (CAR + GAP) + CAR - (s0 + w / 2) / PX));
  const windowOpening = { bottom: WIN_BOT, top: WIN_TOP, side: -WIDTH / 2, far: (WIDTH - 0.14) / 2 + 0.02 }; // far: the far side's glass, from the centre line
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
    const l = new THREE.PointLight("#ffdcae", 9, 9, 1.4);
    l.position.set(x, 2.2, -WIDTH / 2 - 1.6);
    g.add(l);
    return l;
  });
  // each car's windows and doorways throw their own pools of warm light on the wet platform
  pools.forEach((tex, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(CAR, 1.7), new THREE.MeshBasicMaterial({
      map: tex, color: new THREE.Color("#ffc985").multiplyScalar(1.3), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8,
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(CAR / 2 + k * (CAR + GAP), 0.009, -WIDTH / 2 - 0.08 - 0.85);
    g.add(m);
  });

  // riding: light from outside sweeping down the carriage, as from lamps the train passes
  const passing = new THREE.PointLight("#ffe2b8", 0, 7, 1.6);
  passing.position.set(0, 2.0, WIDTH / 2 + 0.9);
  passing.visible = false; // only while riding (a light still costs every pixel at intensity 0)
  g.add(passing);

  let doors = 0, doorTarget = 0, lamp = 0, motion = 0, travelled = 0;
  return {
    group: g, hits, doorsX, windowsX, windowOpening, spill, headlight, length: cars * (CAR + GAP),
    openDoors(v = true) { doorTarget = v ? 1 : 0; },
    // put the doors open or shut at once (between shots, where you don't see them move)
    setDoors(v) { doors = doorTarget = v ? 1 : 0; const e = doors; leaves.forEach(l => (l.position.x = l.userData.home + l.userData.sgn * e * (DOOR_W / 2 - 0.04))); },
    get doorsOpen() { return doors; },
    // 0 standing, 1 under way: the city slides past the far windows and lamps go by
    set motion(v) { motion = v; passing.visible = v > 0; },
    passingLight: passing,
    get motion() { return motion; },
    get lampPhase() { return motion > 0 ? (travelled / 1.4) % 1 : -1; }, // where the passing lamp is along the car, 0..1
    stop() { motion = 0; travelled = 0; passing.intensity = 0; passing.visible = false; rains.forEach(r => { r.userData.scroll(0); r.userData.lamp(0, 0); r.userData.smear(0); }); },
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
      rains.forEach(r => r.userData.tick(reduced ? 0 : t));
      if (motion > 0) {
        travelled += dt * motion;
        rains.forEach(r => { r.userData.scroll(-travelled * 0.35); r.userData.smear(motion * 0.07); });
        // a lamp every 1.4 s at full speed, its light running back along the first car
        const k = (travelled / 1.4) % 1;
        passing.position.x = CAR * (1 - k);
        passing.intensity = 16 * motion * Math.sin(Math.PI * k);
        // the same lamp seen through the far windows, sliding the way the city does
        rains.forEach(r => r.userData.lamp(0.5 - (CAR / 2 - CAR * k) / (CAR - 0.2), motion * Math.sin(Math.PI * k) * 0.9));
      }
    },
  };
}
