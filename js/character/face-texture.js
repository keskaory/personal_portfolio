// The live face texture: the baked, stylized photo underneath, with the eyes
// painted on top so they can look around and blink. Redrawn only when the
// eyes actually change, at the texture's low resolution, so the movement
// steps a little the way old game eyes did.
import * as THREE from "three";
import { FACE_RECT, FACE_FEATURES } from "./head.js";

export const FACE_TEX = { w: 256, h: 346 };

// model space (head-local meters) to texture pixels
export function toPx(x, y) {
  return [
    ((x - FACE_RECT.x0) / (FACE_RECT.x1 - FACE_RECT.x0)) * FACE_TEX.w,
    ((FACE_RECT.y1 - y) / (FACE_RECT.y1 - FACE_RECT.y0)) * FACE_TEX.h,
  ];
}

function averageColor(ctx, x, y, w, h) {
  const d = ctx.getImageData(Math.round(x), Math.round(y), Math.round(w), Math.round(h)).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return [r / n, g / n, b / n].map(Math.round);
}
const rgb = (c, k = 1) => `rgb(${c.map(v => Math.round(Math.min(255, v * k))).join(",")})`;

export class FaceTexture {
  constructor(base, { iris = "#2a1c16", mole = null } = {}) {
    this.mole = mole ? toPx(mole[0], mole[1]) : null;
    const { w, h } = FACE_TEX;
    this.base = base;
    this.canvas = document.createElement("canvas");
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.ctx.drawImage(base, 0, 0, w, h);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.iris = iris;

    const F = FACE_FEATURES;
    this.eyes = [-1, 1].map(side => {
      const [cx, cy] = toPx(side * F.eyeX, F.eyeY);
      return {
        side, cx, cy,
        hw: (F.eyeHalfW / (FACE_RECT.x1 - FACE_RECT.x0)) * w,
        hh: (F.eyeHalfH / (FACE_RECT.y1 - FACE_RECT.y0)) * h,
      };
    });
    // lid skin: the skin just above each eye in the baked photo
    const e = this.eyes[0];
    this.lidColor = averageColor(this.ctx, e.cx - e.hw * 0.6, e.cy - e.hh * 3.2, e.hw * 1.2, e.hh * 1.2);
    this.state = "";
    this.set(0, 0, 0, 0.3);
  }

  // dx, dy: where the eyes look (-1..1); close: 0 open .. 1 shut; lid: resting upper lid (0..1)
  set(dx, dy, close, lid) {
    const q = v => Math.round(v * 6) / 6;
    const key = [q(dx), q(dy), close > 0.5 ? 1 : close > 0.15 ? 0.5 : 0, Math.round(lid * 10) / 10].join();
    if (key === this.state) return;
    this.state = key;
    this.draw(q(dx), q(dy), close > 0.5 ? 1 : close > 0.15 ? 0.6 : 0, lid);
    this.texture.needsUpdate = true;
  }

  almond(ctx, e) {
    const { cx, cy, hw, hh, side } = e;
    const lift = hh * 0.25; // the outer corner sits a little higher
    const outer = side, inner = -side;
    ctx.beginPath();
    ctx.moveTo(cx + inner * hw, cy + hh * 0.1);
    ctx.bezierCurveTo(cx + inner * hw * 0.5, cy - hh * 1.25, cx + outer * hw * 0.45, cy - hh * 1.2 - lift, cx + outer * hw, cy - lift);
    ctx.bezierCurveTo(cx + outer * hw * 0.5, cy + hh * 0.95 - lift * 0.4, cx + inner * hw * 0.45, cy + hh * 0.95, cx + inner * hw, cy + hh * 0.1);
    ctx.closePath();
  }

  draw(dx, dy, close, lid) {
    const ctx = this.ctx;
    const { w, h } = FACE_TEX;
    ctx.drawImage(this.base, 0, 0, w, h);
    // the mole under the left eye, painted clearly so it survives the low resolution
    if (this.mole) {
      const [mx, my] = this.mole;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, 3.2);
      g.addColorStop(0, "rgba(38,22,16,0.95)");
      g.addColorStop(0.6, "rgba(48,28,20,0.85)");
      g.addColorStop(1, "rgba(60,36,26,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    this.eyes.forEach(e => {
      ctx.save();
      this.almond(ctx, e);
      ctx.clip();
      // white of the eye, shaded under the upper lid
      const sg = ctx.createLinearGradient(0, e.cy - e.hh, 0, e.cy + e.hh);
      sg.addColorStop(0, "#9c8f86");
      sg.addColorStop(0.45, "#d4c8bd");
      sg.addColorStop(1, "#bdb0a6");
      ctx.fillStyle = sg;
      ctx.fillRect(e.cx - e.hw - 2, e.cy - e.hh * 2, e.hw * 2 + 4, e.hh * 4);
      // iris and pupil, a little highlight
      const ix = e.cx + dx * e.hw * 0.42, iy = e.cy + dy * e.hh * 0.35 + e.hh * 0.05;
      const r = e.hh * 1.12;
      ctx.fillStyle = "#4a3326";
      ctx.beginPath(); ctx.arc(ix, iy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.iris;
      ctx.beginPath(); ctx.arc(ix, iy, r * 0.78, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0e0a09";
      ctx.beginPath(); ctx.arc(ix, iy, r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,248,240,0.7)";
      ctx.fillRect(Math.round(ix - r * 0.45), Math.round(iy - r * 0.55), 2, 2);
      // upper lid resting low (a restrained, slightly heavy look), or closed in a blink
      const cover = Math.min(1, lid + close * (1 - lid));
      if (cover > 0) {
        ctx.fillStyle = rgb(this.lidColor, 0.94);
        ctx.fillRect(e.cx - e.hw - 2, e.cy - e.hh * 1.6, e.hw * 2 + 4, e.hh * 2.6 * cover);
        // lash line along the lid's edge
        ctx.fillStyle = "rgba(20,13,11,0.92)";
        ctx.fillRect(e.cx - e.hw - 2, e.cy - e.hh * 1.6 + e.hh * 2.6 * cover - 1.5, e.hw * 2 + 4, 2);
      }
      ctx.restore();
      // the upper lash line traced around the top of the eye, flicking at the outer corner
      ctx.save();
      ctx.strokeStyle = "rgba(18,12,10,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const lift = e.hh * 0.25;
      ctx.moveTo(e.cx - e.side * e.hw, e.cy + e.hh * 0.1);
      ctx.bezierCurveTo(e.cx - e.side * e.hw * 0.5, e.cy - e.hh * 1.25, e.cx + e.side * e.hw * 0.45, e.cy - e.hh * 1.2 - lift, e.cx + e.side * (e.hw + 2), e.cy - lift - 1);
      ctx.stroke();
      ctx.strokeStyle = "rgba(60,38,30,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(e.cx - e.side * e.hw * 0.9, e.cy + e.hh * 0.6);
      ctx.quadraticCurveTo(e.cx, e.cy + e.hh * 1.25, e.cx + e.side * e.hw * 0.95, e.cy + e.hh * 0.2);
      ctx.stroke();
      ctx.restore();
    });
  }
}
