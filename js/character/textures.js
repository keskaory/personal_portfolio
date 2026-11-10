// Fabric, hair and skin textures drawn on canvases.
import * as THREE from "three";
import { seeded } from "../objects/textures.js";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}
function tex(c, { srgb = true, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// Washed fleece with the column of stars down the front. The torso's u runs
// around the body with the front at u = 0.5; v runs from hem (0) to collar (1).
export function sweatshirtTexture(base, print, stars = 6) {
  const W = 1024, H = 1024;
  const [c, ctx] = canvas(W, H);
  const rand = seeded(61);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // washed, uneven dye
  for (let i = 0; i < 90; i++) {
    const x = rand() * W, y = rand() * H, r = 40 + rand() * 160;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rand() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 60000; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? "255,255,255" : "0,0,0"},${rand() * 0.05})`;
    ctx.fillRect(rand() * W, rand() * H, 1, 1);
  }
  // the print: a loose column of stars on the chest. The canvas top is the
  // collar, so chest height (about 65% up the torso) is near y = 0.33.
  ctx.fillStyle = print;
  ctx.globalAlpha = 0.85;
  const cx = W * 0.5, top = H * 0.44;
  const layout = [[-0.034, 0], [0.0, -0.008], [0.034, 0.0], [-0.012, 0.07], [0.026, 0.13], [-0.016, 0.19], [0.012, 0.25]];
  layout.slice(0, stars).forEach(([dx, dy]) => star(ctx, cx + dx * W, top + dy * H, 17));
  ctx.globalAlpha = 1;
  // fade the print like a washed screen print
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(${parseInt(base.slice(1, 3), 16)},${parseInt(base.slice(3, 5), 16)},${parseInt(base.slice(5, 7), 16)},${rand() * 0.6})`;
    ctx.fillRect(cx - W * 0.06 + rand() * W * 0.12, top - H * 0.04 + rand() * H * 0.3, 2, 2);
  }
  return tex(c);
}

// Rib knit for hems and cuffs, and the chunky scarf knit.
export function knitTexture(base, { chunky = false } = {}) {
  const W = 512, H = 512;
  const [c, ctx] = canvas(W, H);
  const rand = seeded(chunky ? 71 : 73);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const cols = chunky ? 10 : 32, rows = chunky ? 14 : 48;
  const cw = W / cols, rh = H / rows;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      // each stitch is a small V
      const px = x * cw, py = y * rh;
      const g = ctx.createLinearGradient(px, py, px + cw, py);
      g.addColorStop(0, "rgba(0,0,0,0.35)");
      g.addColorStop(0.5, `rgba(255,255,255,${0.12 + rand() * 0.06})`);
      g.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(px + cw * 0.3, py + rh * 0.5, cw * 0.28, rh * 0.62, 0.45, 0, Math.PI * 2);
      ctx.ellipse(px + cw * 0.7, py + rh * 0.5, cw * 0.28, rh * 0.62, -0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return tex(c, { repeat: chunky ? [3, 2] : [6, 1] });
}

// Fine directional streaks along a hair clump (v runs root to tip).
export function hairTexture(base) {
  const W = 128, H = 512;
  const [c, ctx] = canvas(W, H);
  const rand = seeded(81);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const x = rand() * W;
    ctx.strokeStyle = rand() < 0.55 ? `rgba(255,240,230,${0.03 + rand() * 0.06})` : `rgba(0,0,0,${0.2 + rand() * 0.3})`;
    ctx.lineWidth = 0.6 + rand() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (rand() - 0.5) * 12, H * 0.3, x + (rand() - 0.5) * 18, H * 0.7, x + (rand() - 0.5) * 20, H);
    ctx.stroke();
  }
  return tex(c);
}

// Very faint skin variation, so skin isn't a flat plastic color.
export function skinTexture(base, shadow) {
  const W = 256, H = 256;
  const [c, ctx] = canvas(W, H);
  const rand = seeded(91);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = rand() * W, y = rand() * H, r = 20 + rand() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, shadow + "18");
    g.addColorStop(1, shadow + "00");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c);
}
