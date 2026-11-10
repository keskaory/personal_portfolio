// Textures for the station, drawn on canvases: platform tiles, the tactile
// strip, concrete, the vending machine's lit front, the dot-matrix board,
// the paper ticket, gravel.
import * as THREE from "three";
import { seeded } from "./textures.js";

function cv(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}
function tex(c, { repeat = null, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 16; // three.js clamps this to what the GPU supports; it keeps fine floor patterns from shimmering at a low angle
  return t;
}
function speckle(ctx, w, h, rand, n, a) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},${rand() * a})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
}

// square platform tiles, worn, with darker grout and a few stains
export function platformTiles() {
  const [c, ctx] = cv(512, 512);
  const rand = seeded(301);
  ctx.fillStyle = "#6d6c67";
  ctx.fillRect(0, 0, 512, 512);
  const n = 4, s = 512 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = 98 + rand() * 18;
    ctx.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
    ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
  }
  speckle(ctx, 512, 512, rand, 9000, 0.08);
  for (let i = 0; i < 8; i++) {
    const x = rand() * 512, y = rand() * 512, r = 20 + rand() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(30,28,24,0.18)");
    g.addColorStop(1, "rgba(30,28,24,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c, { repeat: [20, 2] });
}

// the yellow tactile strip: rows of raised dots
export function tactileStrip() {
  const [c, ctx] = cv(256, 64);
  ctx.fillStyle = "#9c8838";
  ctx.fillRect(0, 0, 256, 64);
  for (let x = 8; x < 256; x += 16) for (let y = 8; y < 64; y += 16) {
    ctx.fillStyle = "#b39d48";
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath(); ctx.arc(x + 1.5, y + 1.5, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#bba44e";
    ctx.beginPath(); ctx.arc(x - 0.5, y - 0.5, 3.8, 0, Math.PI * 2); ctx.fill();
  }
  const rand = seeded(303);
  speckle(ctx, 256, 64, rand, 1500, 0.06);
  return tex(c, { repeat: [40, 1] });
}

export function concrete(base = "#4a4a47", seed = 305) {
  const [c, ctx] = cv(512, 512);
  const rand = seeded(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) {
    const x = rand() * 512, y = rand() * 512, r = 20 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rand() < 0.5 ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // rain streaks down the wall
  for (let i = 0; i < 40; i++) {
    const x = rand() * 512;
    ctx.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.08})`;
    ctx.fillRect(x, rand() * 100, 2 + rand() * 3, 200 + rand() * 300);
  }
  speckle(ctx, 512, 512, rand, 20000, 0.07);
  return tex(c, { repeat: [1, 1] });
}

export function gravel() {
  const [c, ctx] = cv(256, 256);
  const rand = seeded(307);
  ctx.fillStyle = "#26241f";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    const v = 30 + rand() * 50;
    ctx.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
    ctx.beginPath(); ctx.ellipse(rand() * 256, rand() * 256, 1 + rand() * 3, 1 + rand() * 2.5, rand() * 3, 0, Math.PI * 2); ctx.fill();
  }
  return tex(c, { repeat: [30, 3] });
}

// the vending machine's lit window: rows of plain cans and bottles, no labels
export function vendingFront() {
  const W = 256, H = 512;
  const [c, ctx] = cv(W, H);
  const rand = seeded(309);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#f2efe6");
  g.addColorStop(1, "#d9d4c4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const palette = ["#7a2f2a", "#2f5a46", "#c9a24a", "#3b4f6e", "#e2ddd0", "#a35a2c", "#1e2a2a"];
  for (let row = 0; row < 4; row++) {
    const y = 24 + row * 78;
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(10, y + 54, W - 20, 6);
    for (let i = 0; i < 6; i++) {
      const x = 16 + i * 38;
      ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
      const tall = rand() < 0.4;
      ctx.fillRect(x, y + (tall ? 0 : 14), 24, tall ? 54 : 40);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x + 4, y + (tall ? 4 : 18), 3, tall ? 44 : 30);
      // small price buttons below each one
      ctx.fillStyle = "#6fb38a";
      ctx.fillRect(x + 6, y + 62, 12, 4);
    }
  }
  // the dark lower panel with the coin slot and the flap
  ctx.fillStyle = "#2a2b2c";
  ctx.fillRect(0, 340, W, H - 340);
  ctx.fillStyle = "#121212";
  ctx.fillRect(40, 430, 176, 50);
  ctx.fillStyle = "#9a9a96";
  ctx.fillRect(200, 360, 22, 40);
  return tex(c);
}

// dot-matrix sign: draws only digits, from a 5x7 font
const DIGITS = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["0", "1", "0", "0", "0", "1", "0"],
  " ": ["0", "0", "0", "0", "0", "0", "0"],
};
export function dotBoard(text) {
  const W = 512, H = 96;
  const [c, ctx] = cv(W, H);
  ctx.fillStyle = "#0b0c0b";
  ctx.fillRect(0, 0, W, H);
  const dot = 6.4, gap = 8;
  // unlit dots across the whole board
  for (let x = 12; x < W - 8; x += gap) for (let y = 12; y < H - 8; y += gap) {
    ctx.fillStyle = "#1a1c19";
    ctx.beginPath(); ctx.arc(x, y, dot / 2, 0, Math.PI * 2); ctx.fill();
  }
  let cx = 12 + gap * 2;
  const cy = 12 + gap * 2;
  for (const ch of text) {
    const g = DIGITS[ch] || DIGITS[" "];
    g.forEach((row, r) => [...row].forEach((on, k) => {
      if (on === "1") {
        ctx.fillStyle = "#ffb347";
        ctx.beginPath(); ctx.arc(cx + k * gap, cy + r * gap, dot / 2, 0, Math.PI * 2); ctx.fill();
      }
    }));
    cx += (g[0].length + 1) * gap;
  }
  return tex(c);
}

// a paper ticket: printed with the facts, a magnetic stripe on the back
export function ticketTexture(person, sample) {
  const W = 512, H = 256;
  const [c, ctx] = cv(W, H);
  const rand = seeded(311);
  ctx.fillStyle = "#e9e1cf";
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, rand, 3000, 0.05);
  ctx.fillStyle = "#8a6a3a";
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = "#211c16";
  ctx.font = '30px "Courier Prime", "Courier New", monospace';
  ctx.fillText(person.name.toUpperCase(), 26, 92);
  ctx.font = '22px "Courier Prime", "Courier New", monospace';
  ctx.fillText(person.school, 26, 132);
  ctx.fillText(person.graduation, 26, 164);
  ctx.fillText("RESUME", 26, 214);
  ctx.strokeStyle = "rgba(33,28,22,0.6)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(400, 34); ctx.lineTo(400, H); ctx.stroke();
  ctx.setLineDash([]);
  if (sample) {
    ctx.save();
    ctx.translate(410, 150);
    ctx.rotate(-0.18);
    ctx.strokeStyle = "rgba(142,43,35,0.7)";
    ctx.fillStyle = "rgba(142,43,35,0.7)";
    ctx.lineWidth = 3;
    ctx.font = '700 24px "Helvetica Neue", Arial, sans-serif';
    ctx.strokeRect(-6, -26, 96, 34);
    ctx.fillText("SAMPLE", 0, 0);
    ctx.restore();
  }
  return tex(c);
}

// The route map in its backlit frame: one line, three stops, the one you're
// at marked. Plain transit lettering in English; it is also the way on.
export function routeMap(stops, here = 0) {
  const W = 1024, H = 600;
  const [c, ctx] = cv(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#f6f3ea");
  g.addColorStop(1, "#e7e2d4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const sans = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillStyle = "#1d2321";
  ctx.font = `600 30px ${sans}`;
  ctx.fillText("Route", 64, 84);
  ctx.fillStyle = "#6a6e69";
  ctx.font = `400 22px ${sans}`;
  ctx.fillText("Tonight, in this order", 64, 118);
  // the line
  const y = 300, x0 = 150, x1 = W - 150;
  ctx.strokeStyle = "#c8261f";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  stops.forEach((s, i) => {
    const x = x0 + (x1 - x0) * (i / (stops.length - 1));
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1d2321";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(x, y, i === here ? 26 : 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (i === here) { ctx.fillStyle = "#c8261f"; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); }
    ctx.textAlign = "center";
    ctx.fillStyle = "#1d2321";
    ctx.font = `600 34px ${sans}`;
    ctx.fillText(s.name, x, y + 84);
    ctx.fillStyle = "#5c615c";
    ctx.font = `400 23px ${sans}`;
    ctx.fillText(s.note, x, y + 120);
    if (i === here) {
      ctx.fillStyle = "#c8261f";
      ctx.font = `600 21px ${sans}`;
      ctx.fillText("YOU ARE HERE", x, y - 50);
    }
    ctx.textAlign = "left";
  });
  // a thin frame shadow inside the lightbox
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);
  return tex(c);
}

// The city past the tracks, far out of focus: dark blocks, scattered lit
// windows, and the colour of shop signs as blank glowing panels. No lettering.
export function neonCity({ blur = 5, signs = 34 } = {}) {
  const W = 1024, H = 512;
  const [c, ctx] = cv(W, H);
  const rand = seeded(919);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0b1416");
  sky.addColorStop(0.6, "#14201f");
  sky.addColorStop(1, "#0a0e0d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // buildings
  for (let x = 0; x < W;) {
    const w = 60 + rand() * 110, top = 60 + rand() * 180;
    ctx.fillStyle = `rgb(${14 + rand() * 8},${20 + rand() * 8},${20 + rand() * 8})`;
    ctx.fillRect(x, top, w, H - top);
    for (let wy = top + 10; wy < H - 20; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 12) {
      const r = rand();
      if (r > 0.86) { ctx.fillStyle = r > 0.96 ? "rgba(170,240,215,0.5)" : `rgba(255,${180 + rand() * 40},120,${0.3 + rand() * 0.4})`; ctx.fillRect(wx, wy, 5, 6); }
    }
    x += w + 4;
  }
  // signs: blocks of saturated colour hung off the buildings, lower down
  const colours = ["#ff3b2f", "#ff9a2e", "#2fe08a", "#ffd166", "#36c6ff", "#ff5e4d"];
  ctx.filter = `blur(${blur}px)`;
  for (let i = 0; i < signs; i++) {
    const vertical = rand() < 0.45;
    const w = vertical ? 14 + rand() * 14 : 40 + rand() * 70, h = vertical ? 50 + rand() * 80 : 16 + rand() * 20;
    const x = rand() * W, y = 250 + rand() * 200;
    ctx.globalAlpha = 0.55 + rand() * 0.45;
    ctx.fillStyle = colours[Math.floor(rand() * colours.length)];
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;
  // the whole street is out of focus; then haze over it
  if (blur > 8) { const copy = document.createElement("canvas"); copy.width = W; copy.height = H; copy.getContext("2d").drawImage(c, 0, 0); ctx.filter = `blur(${blur * 0.8}px)`; ctx.drawImage(copy, 0, 0); }
  ctx.filter = "blur(30px)";
  ctx.fillStyle = "rgba(255,120,80,0.10)";
  ctx.fillRect(0, 380, W, 140);
  ctx.filter = "none";
  return tex(c);
}
