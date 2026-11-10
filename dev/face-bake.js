// Turns the reference photo into the character's face texture: aligned to
// the head by the eye and mouth landmarks, evened out, color graded,
// reduced to a low resolution, softened and lightly posterized, with the
// edges fading into plain skin. Only the result is published; the photo
// itself stays in dev/ref/.
import { FACE_RECT, FACE_FEATURES, headHalfWidth } from "../js/character/head.js";
import { FACE_TEX, toPx } from "../js/character/face-texture.js";

export async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export function bakeFace(img, photo) {
  const { w: W, h: H } = FACE_TEX;
  const SS = 2; // work at twice the final size, then reduce
  const work = document.createElement("canvas");
  work.width = W * SS; work.height = H * SS;
  const ctx = work.getContext("2d", { willReadFrequently: true });

  // ---- align: the photo's eyes and mouth onto the model's
  const flipX = x => (photo.flip ? img.naturalWidth - x : x);
  // after flipping, the photo's left eye is the character's right (-x)
  const pts = photo.eyes.map(([x, y]) => [flipX(x), y]).sort((a, b) => a[0] - b[0]);
  const [eR, eL] = pts;
  const midP = [(eR[0] + eL[0]) / 2, (eR[1] + eL[1]) / 2];
  const distP = Math.hypot(eL[0] - eR[0], eL[1] - eR[1]);
  const angle = Math.atan2(eL[1] - eR[1], eL[0] - eR[0]);
  const F = FACE_FEATURES;
  const scale = (2 * F.eyeX) / distP; // meters per photo pixel
  const [mx, my] = toPx(0, F.eyeY);
  const pxPerM = (FACE_TEX.w / (FACE_RECT.x1 - FACE_RECT.x0)) * SS;

  ctx.save();
  ctx.translate(mx * SS, my * SS);
  ctx.scale(scale * pxPerM, scale * pxPerM);
  ctx.rotate(-angle);
  if (photo.flip) { ctx.scale(-1, 1); ctx.translate(-(img.naturalWidth - midP[0]), -midP[1]); }
  else ctx.translate(-midP[0], -midP[1]);
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // ---- even out shine, grade toward a warm, slightly muted skin
  const d = ctx.getImageData(0, 0, work.width, work.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    let r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255;
    const L = 0.299 * r + 0.587 * g + 0.114 * b;
    // compress highlights (flash shine on nose and forehead)
    if (L > 0.6) {
      const k = (0.6 + (L - 0.6) * 0.35) / L;
      r *= k; g *= k; b *= k;
    }
    // mute saturation a little, warm the midtones, deepen the shadows slightly
    const L2 = 0.299 * r + 0.587 * g + 0.114 * b;
    r = L2 + (r - L2) * 0.82 + 0.02;
    g = L2 + (g - L2) * 0.82;
    b = L2 + (b - L2) * 0.82 - 0.015;
    const c = x => Math.max(0, Math.min(1, (x - 0.5) * 1.08 + 0.48));
    p[i] = c(r) * 255; p[i + 1] = c(g) * 255; p[i + 2] = c(b) * 255;
  }
  ctx.putImageData(d, 0, 0);

  // average skin, from the cheeks below the eyes
  const sample = (x, y) => {
    const [sx, sy] = toPx(x, y);
    const q = ctx.getImageData(Math.round(sx * SS) - 6, Math.round(sy * SS) - 6, 12, 12).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < q.length; i += 4) { r += q[i]; g += q[i + 1]; b += q[i + 2]; }
    const n = q.length / 4;
    return [r / n, g / n, b / n];
  };
  const s1 = sample(0.04, 0.085), s2 = sample(-0.04, 0.085);
  const skin = s1.map((v, i) => Math.round((v + s2[i]) / 2));

  // ---- fade everything outside the face into plain skin
  const m = ctx.getImageData(0, 0, work.width, work.height);
  const q = m.data;
  for (let py = 0; py < work.height; py++) {
    const y = FACE_RECT.y1 - (py / work.height) * (FACE_RECT.y1 - FACE_RECT.y0);
    const hw = headHalfWidth(Math.max(0, y)) * 0.9;
    for (let px = 0; px < work.width; px++) {
      const x = FACE_RECT.x0 + (px / work.width) * (FACE_RECT.x1 - FACE_RECT.x0);
      let a = 1 - Math.min(1, Math.max(0, (Math.abs(x) - hw * 0.82) / (hw * 0.25)));
      if (y < 0.004) a *= Math.max(0, 1 - (0.004 - y) / 0.012);
      const i = (py * work.width + px) * 4;
      q[i] = q[i] * a + skin[0] * (1 - a);
      q[i + 1] = q[i + 1] * a + skin[1] * (1 - a);
      q[i + 2] = q[i + 2] * a + skin[2] * (1 - a);
      q[i + 3] = 255;
    }
  }
  ctx.putImageData(m, 0, 0);

  // ---- reduce: down to a small size and back, which softens it like an old texture
  const small = document.createElement("canvas");
  small.width = Math.round(W * 0.42); small.height = Math.round(H * 0.42);
  const sctx = small.getContext("2d");
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(work, 0, 0, small.width, small.height);
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const octx = out.getContext("2d", { willReadFrequently: true });
  octx.imageSmoothingQuality = "low";
  octx.drawImage(small, 0, 0, W, H);

  // ---- light posterize with an ordered dither
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const o = octx.getImageData(0, 0, W, H);
  const od = o.data;
  const levels = 40;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const t = (bayer[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * (255 / levels);
    for (let c = 0; c < 3; c++) od[i + c] = Math.round((od[i + c] + t) / (255 / levels)) * (255 / levels);
  }
  octx.putImageData(o, 0, 0);
  return { canvas: out, skin: `#${skin.map(v => v.toString(16).padStart(2, "0")).join("")}` };
}
