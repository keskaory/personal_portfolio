// Painted clothing textures in the PS2 manner: small (256 px), with folds,
// seams, stitching and highlights painted in, so black pieces separate from
// each other and still read as fabric. v = 0 is the first ring of the loft
// (hem / shoulder / waist / heel), which is the bottom of the canvas.
import * as THREE from "three";
import { seeded } from "../objects/textures.js";

const W = 256, H = 256;
const Y = v => H * (1 - v); // loft v to canvas y
const X = u => W * u;

function canvas() {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  return [c, c.getContext("2d")];
}
function done(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 1;
  return t;
}
function grain(ctx, rand, n, a) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? "255,255,255" : "0,0,0"},${rand() * a})`;
    ctx.fillRect(rand() * W, rand() * H, 1, 1);
  }
}
// a soft painted stroke, the basic unit of a fold
function stroke(ctx, pts, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  pts.forEach(([u, v], i) => (i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v))));
  ctx.stroke();
}
function band(ctx, u0, u1, v0, v1, color, alpha) {
  const g = ctx.createLinearGradient(X(u0), 0, X(u1), 0);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(0.5, `rgba(${color},${alpha})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(X(u0), Y(v1), X(u1) - X(u0), Y(v0) - Y(v1));
}
function stitch(ctx, pts, color = "rgba(120,124,134,0.55)") {
  ctx.setLineDash([3, 3]);
  stroke(ctx, pts, 1, color);
  ctx.setLineDash([]);
}

// ---- hoodie body: front is u = 0.5, sides 0.25 / 0.75, hem v = 0, neck v = 1
export function hoodieBody(base, hi) {
  const [c, ctx] = canvas();
  const rand = seeded(201);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, rand, 9000, 0.06);
  // chest and shoulder planes catch light; sides fall into shadow
  band(ctx, 0.3, 0.7, 0.45, 0.95, hi, 0.36);
  band(ctx, 0.0, 0.16, 0.55, 0.95, hi, 0.12);
  band(ctx, 0.84, 1.0, 0.55, 0.95, hi, 0.12);
  band(ctx, 0.18, 0.32, 0.0, 1.0, "0,0,0", 0.35);
  band(ctx, 0.68, 0.82, 0.0, 1.0, "0,0,0", 0.35);
  // side seams
  [0.25, 0.75].forEach(u => { stroke(ctx, [[u, 0], [u, 1]], 2, "rgba(0,0,0,0.55)"); stitch(ctx, [[u + 0.008, 0], [u + 0.008, 1]]); });
  // the front pocket: a stitched panel with slanted openings
  const p = { u0: 0.39, u1: 0.61, v0: 0.12, v1: 0.36 };
  stroke(ctx, [[p.u0, p.v0], [p.u1, p.v0]], 1.5, "rgba(0,0,0,0.35)");
  stroke(ctx, [[p.u0 + 0.02, p.v1], [p.u1 - 0.02, p.v1]], 1.5, "rgba(0,0,0,0.35)");
  stitch(ctx, [[p.u0, p.v0 + 0.01], [p.u1, p.v0 + 0.01]]);
  stitch(ctx, [[p.u0 + 0.02, p.v1 - 0.01], [p.u1 - 0.02, p.v1 - 0.01]]);
  [[p.u0, p.u0 + 0.025], [p.u1, p.u1 - 0.025]].forEach(([a, b]) => {
    stroke(ctx, [[a, p.v0 + 0.02], [b, p.v1 - 0.01]], 2, "rgba(0,0,0,0.42)");
    stroke(ctx, [[a + (b - a) * 0.15, p.v0 + 0.04], [b + (b - a) * 0.1, p.v1 - 0.02]], 1, `rgba(${hi},0.35)`);
  });
  // gathered folds above the hem band
  for (let i = 0; i < 9; i++) {
    const u = 0.08 + i * 0.1 + (rand() - 0.5) * 0.04;
    stroke(ctx, [[u, 0.02], [u + 0.02, 0.08 + rand() * 0.05]], 2, "rgba(0,0,0,0.2)");
    stroke(ctx, [[u + 0.012, 0.02], [u + 0.03, 0.07 + rand() * 0.04]], 1.5, `rgba(${hi},0.2)`);
  }
  // a few long drape folds from the chest toward the hem
  [[0.42, 0.62, 0.36, 0.3], [0.58, 0.6, 0.64, 0.3]].forEach(([a, va, b, vb]) => {
    stroke(ctx, [[a, va], [b, vb]], 4, "rgba(0,0,0,0.28)");
    stroke(ctx, [[a + 0.01, va], [b + 0.01, vb]], 1.5, `rgba(${hi},0.18)`);
  });
  // drawstring eyelets at the neck
  [0.47, 0.53].forEach(u => {
    ctx.fillStyle = "rgba(150,152,158,0.8)";
    ctx.beginPath(); ctx.arc(X(u), Y(0.965), 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#050505";
    ctx.beginPath(); ctx.arc(X(u), Y(0.965), 1.6, 0, Math.PI * 2); ctx.fill();
  });
  return done(c);
}

// ---- sleeve: shoulder v = 0, wrist v = 1; the top of the sleeve is around u = 0.5
export function hoodieSleeve(base, hi) {
  const [c, ctx] = canvas();
  const rand = seeded(203);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, rand, 9000, 0.06);
  band(ctx, 0.38, 0.62, 0.0, 1.0, hi, 0.34);
  band(ctx, 0.0, 0.18, 0.0, 1.0, "0,0,0", 0.3);
  band(ctx, 0.82, 1.0, 0.0, 1.0, "0,0,0", 0.3);
  // the crook of the elbow
  for (let i = 0; i < 4; i++) {
    const v = 0.46 + i * 0.035;
    stroke(ctx, [[0.05, v], [0.3, v + 0.04], [0.48, v - 0.01]], 3, "rgba(0,0,0,0.45)");
    stroke(ctx, [[0.06, v + 0.012], [0.3, v + 0.052], [0.47, v + 0.002]], 1.5, `rgba(${hi},0.2)`);
  }
  // bunching above the cuff
  for (let i = 0; i < 5; i++) {
    const v = 0.82 + i * 0.03;
    stroke(ctx, [[0.0, v], [0.5, v + (rand() - 0.5) * 0.03], [1.0, v]], 2.5, "rgba(0,0,0,0.4)");
    stroke(ctx, [[0.0, v + 0.01], [0.5, v + 0.01], [1.0, v + 0.01]], 1, `rgba(${hi},0.18)`);
  }
  // inseam
  stroke(ctx, [[0.0, 0], [0.0, 1]], 3, "rgba(0,0,0,0.6)");
  stitch(ctx, [[0.012, 0], [0.012, 1]]);
  return done(c);
}

// ---- hood: the bunched folds of a hood lying on the back of the neck
export function hoodFabric(base, hi) {
  const [c, ctx] = canvas();
  const rand = seeded(205);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, rand, 8000, 0.06);
  for (let i = 0; i < 10; i++) {
    const u = rand();
    stroke(ctx, [[u, 0], [u + (rand() - 0.5) * 0.15, 0.5], [u + (rand() - 0.5) * 0.2, 1]], 6, "rgba(0,0,0,0.35)");
    stroke(ctx, [[u + 0.03, 0], [u + 0.03, 0.5], [u + 0.02, 1]], 2, `rgba(${hi},0.22)`);
  }
  stitch(ctx, [[0, 0.5], [1, 0.5]]);
  return done(c);
}

// ---- trousers: waist v = 0, hem v = 1; the front of the leg is u = 0.5
export function trousers(base, hi) {
  const [c, ctx] = canvas();
  const rand = seeded(207);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // twill: fine diagonal weave
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let i = -H; i < W; i += 3) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
  grain(ctx, rand, 7000, 0.05);
  // worn highlight on the front of the thigh and shin
  band(ctx, 0.38, 0.62, 0.08, 0.4, hi, 0.2);
  band(ctx, 0.42, 0.58, 0.55, 0.9, hi, 0.13);
  band(ctx, 0.0, 0.2, 0.0, 1.0, "0,0,0", 0.3);
  band(ctx, 0.8, 1.0, 0.0, 1.0, "0,0,0", 0.3);
  // outer and inner seams
  [0.25, 0.75].forEach(u => { stroke(ctx, [[u, 0], [u, 1]], 2, "rgba(0,0,0,0.6)"); stitch(ctx, [[u + 0.008, 0], [u + 0.008, 1]], "rgba(110,114,122,0.45)"); });
  // knee: a few soft horizontal creases
  for (let i = 0; i < 4; i++) {
    const v = 0.44 + i * 0.025;
    stroke(ctx, [[0.36, v], [0.5, v + 0.012], [0.64, v]], 2.5, "rgba(0,0,0,0.38)");
    stroke(ctx, [[0.37, v + 0.01], [0.5, v + 0.022], [0.63, v + 0.01]], 1, `rgba(${hi},0.18)`);
  }
  // the break, stacked over the boots
  for (let i = 0; i < 4; i++) {
    const v = 0.9 + i * 0.024;
    stroke(ctx, [[0.0, v], [0.25, v + 0.015], [0.5, v - 0.005], [0.75, v + 0.012], [1.0, v]], 3, "rgba(0,0,0,0.45)");
    stroke(ctx, [[0.0, v + 0.01], [0.5, v + 0.006], [1.0, v + 0.01]], 1, `rgba(${hi},0.2)`);
  }
  // waistband shadow under the hoodie
  band(ctx, 0, 1, 0, 0.06, "0,0,0", 0.5);
  return done(c);
}

// ---- boot upper: heel v = 0, toe v = 1; the top center line is u = 0.5
export function bootUpper(base, hi) {
  const [c, ctx] = canvas();
  const rand = seeded(209);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, rand, 6000, 0.08);
  // leather sheen across the toe and the vamp
  band(ctx, 0.3, 0.7, 0.7, 0.95, hi, 0.45);
  band(ctx, 0.36, 0.64, 0.2, 0.5, hi, 0.16);
  // toe cap and heel counter seams
  stroke(ctx, [[0.18, 0.76], [0.5, 0.8], [0.82, 0.76]], 2, "rgba(0,0,0,0.7)");
  stitch(ctx, [[0.18, 0.74], [0.5, 0.78], [0.82, 0.74]], "rgba(110,110,116,0.5)");
  stroke(ctx, [[0.05, 0.16], [0.95, 0.16]], 2, "rgba(0,0,0,0.7)");
  // laces: criss-cross with eyelets, up the instep
  const eyelets = 6;
  for (let i = 0; i < eyelets; i++) {
    const v = 0.36 + i * 0.05;
    [0.43, 0.57].forEach(u => {
      ctx.fillStyle = "rgba(160,160,165,0.85)";
      ctx.beginPath(); ctx.arc(X(u), Y(v), 2.2, 0, Math.PI * 2); ctx.fill();
    });
    if (i < eyelets - 1) {
      stroke(ctx, [[0.43, v], [0.57, v + 0.05]], 2.5, "rgba(48,48,52,1)");
      stroke(ctx, [[0.57, v], [0.43, v + 0.05]], 2.5, "rgba(62,62,66,1)");
    }
  }
  // creases where the boot flexes
  for (let i = 0; i < 3; i++) stroke(ctx, [[0.25, 0.62 + i * 0.03], [0.5, 0.64 + i * 0.03], [0.75, 0.62 + i * 0.03]], 1.5, "rgba(0,0,0,0.5)");
  return done(c);
}

export function bootSole() {
  const [c, ctx] = canvas();
  ctx.fillStyle = "#101011";
  ctx.fillRect(0, 0, W, H);
  // lugged edge: vertical ridges
  for (let x = 0; x < W; x += 8) {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(x, 0, 3, H);
  }
  // welt stitch
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(120,120,124,0.5)";
  ctx.beginPath(); ctx.moveTo(0, H * 0.2); ctx.lineTo(W, H * 0.2); ctx.stroke();
  return done(c);
}

// ---- ribbed hem and cuffs: fine vertical ribs in the hoodie's own tone
export function rib(base, hi) {
  const [c, ctx] = canvas();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(x, 0, 1, H);
    ctx.fillStyle = `rgba(${hi},0.12)`;
    ctx.fillRect(x + 2, 0, 1, H);
  }
  const t = done(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
