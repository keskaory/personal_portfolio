// Textures drawn on a canvas, so the slice needs no image files.
import * as THREE from "three";

// small seeded random so the textures look the same on every load
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(c, { srgb = true, repeat = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// fine speckle used for paper, paint and plaster
function speckle(ctx, w, h, rand, count, alpha, light = false) {
  for (let i = 0; i < count; i++) {
    const v = light ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * alpha})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
}

// The paper label. `lines` comes from content/fragrances.json.
export function labelTexture(lines, seed = 1) {
  const W = 512, H = 720;
  const [c, ctx] = canvas(W, H);
  const rand = seeded(seed);

  ctx.fillStyle = "#ece6d6";
  ctx.fillRect(0, 0, W, H);
  // paper fibre
  speckle(ctx, W, H, rand, 9000, 0.06);
  speckle(ctx, W, H, rand, 4000, 0.08, true);
  // slightly darker edges, like a label that has been handled
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "rgba(90,70,40,0.10)");
  g.addColorStop(0.08, "rgba(90,70,40,0)");
  g.addColorStop(0.92, "rgba(90,70,40,0)");
  g.addColorStop(1, "rgba(90,70,40,0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // thin printed rules
  ctx.strokeStyle = "rgba(25,22,18,0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, 120); ctx.lineTo(W - 48, 120);
  ctx.moveTo(48, H - 150); ctx.lineTo(W - 48, H - 150);
  ctx.stroke();

  // typewriter text, each letter inked a little unevenly
  const [title, ...rest] = lines;
  const type = (text, x, y, size) => {
    ctx.font = `${size}px "Courier Prime", "Courier New", monospace`;
    let cx = x;
    for (const ch of text) {
      ctx.fillStyle = `rgba(22,19,16,${0.72 + rand() * 0.28})`;
      ctx.fillText(ch, cx + (rand() - 0.5) * 0.8, y + (rand() - 0.5) * 1.2);
      cx += ctx.measureText(ch).width;
    }
  };
  ctx.textBaseline = "alphabetic";

  // title is centered and wrapped onto two lines if long
  ctx.font = `46px "Courier Prime", "Courier New", monospace`;
  const words = (title || "").split(" ");
  const titleLines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > W - 110 && line) { titleLines.push(line); line = w; } else line = test;
  }
  if (line) titleLines.push(line);
  titleLines.forEach((t, i) => {
    const tw = ctx.measureText(t).width;
    type(t, (W - tw) / 2, 230 + i * 58, 46);
  });

  rest.forEach((t, i) => {
    ctx.font = `28px "Courier Prime", "Courier New", monospace`;
    const tw = ctx.measureText(t).width;
    type(t, (W - tw) / 2, 390 + i * 50, 28);
  });

  return toTexture(c);
}

// Painted wooden sill: old cream paint, brush direction along the length,
// worn patches and a faint water ring where a glass once stood.
export function sillTexture() {
  const W = 2048, H = 512;
  const [c, ctx] = canvas(W, H);
  const rand = seeded(7);
  ctx.fillStyle = "#b8b1a1";
  ctx.fillRect(0, 0, W, H);

  // brush strokes
  for (let i = 0; i < 1400; i++) {
    const y = rand() * H;
    const x = rand() * W;
    const len = 80 + rand() * 500;
    ctx.strokeStyle = rand() < 0.5 ? `rgba(255,250,235,${rand() * 0.06})` : `rgba(60,50,35,${rand() * 0.06})`;
    ctx.lineWidth = 1 + rand() * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (rand() - 0.5) * 3);
    ctx.stroke();
  }
  // worn patches near the front edge (front edge is the bottom of the texture)
  for (let i = 0; i < 40; i++) {
    const x = rand() * W, y = H - rand() * 70;
    const r = 6 + rand() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(120,96,66,0.35)");
    g.addColorStop(1, "rgba(120,96,66,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.8, r, 0, 0, Math.PI * 2); ctx.fill();
  }
  speckle(ctx, W, H, rand, 30000, 0.05);

  // water ring
  ctx.strokeStyle = "rgba(90,78,58,0.16)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(1120, 300, 46, 46, 0, 0.3, Math.PI * 1.85);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,78,58,0.08)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(1121, 301, 44, 44, 0, 0, Math.PI * 2);
  ctx.stroke();

  return toTexture(c);
}

// Rough plaster for the wall around the window.
export function plasterTexture() {
  const W = 1024, H = 1024;
  const [c, ctx] = canvas(W, H);
  const rand = seeded(11);
  ctx.fillStyle = "#6f6a60";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const x = rand() * W, y = rand() * H, r = 20 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() < 0.5;
    g.addColorStop(0, dark ? "rgba(40,36,30,0.10)" : "rgba(255,250,240,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  speckle(ctx, W, H, rand, 40000, 0.07);
  return toTexture(c, { repeat: true });
}

// The city behind the rain: a few lit windows on the building across the
// street and soft out-of-focus lights. No signs, no lettering.
// Drawn small then scaled up, which blurs it the way a lens would.
export function cityTexture() {
  const SW = 320, SH = 200;
  const [s, sx] = canvas(SW, SH);
  const rand = seeded(23);

  const sky = sx.createLinearGradient(0, 0, 0, SH);
  sky.addColorStop(0, "#08100f");
  sky.addColorStop(0.55, "#0c1714");
  sky.addColorStop(1, "#060908");
  sx.fillStyle = sky;
  sx.fillRect(0, 0, SW, SH);

  // the building across the street, slightly lighter than the sky
  sx.fillStyle = "#101a17";
  sx.fillRect(0, 30, SW * 0.72, SH);
  sx.fillStyle = "#0d1513";
  sx.fillRect(SW * 0.72, 62, SW, SH);

  // its windows: small, mostly dark, some lit warm, a few with cool tube light
  for (let row = 0; row < 22; row++) {
    for (let col = 0; col < 40; col++) {
      const x = 4 + col * 5.6 + (rand() - 0.5) * 1.5, y = 36 + row * 7;
      if (x > SW * 0.7) continue;
      const r = rand();
      // whole floors tend to be dark at this hour
      if (r < 0.78 || (row % 5 === 2 && r < 0.95)) continue;
      sx.fillStyle = r < 0.9 ? `rgba(255,196,128,${0.18 + rand() * 0.4})` : `rgba(170,230,210,${0.15 + rand() * 0.35})`;
      sx.fillRect(x, y, 3, 4);
    }
  }

  // blur it once more by halving and scaling back up: the street is far out of focus
  const [s2, sx2] = canvas(SW / 2, SH / 2);
  sx2.imageSmoothingQuality = "high";
  sx2.drawImage(s, 0, 0, SW / 2, SH / 2);

  const W = 2048, H = 1280;
  const [c, ctx] = canvas(W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(s2, 0, 0, W, H);

  // out-of-focus lights
  const disc = (x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.55, `rgba(${rgb},${a * 0.75})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  disc(1620, 260, 210, "255,178,92", 0.5);   // a sodium streetlight up the road
  disc(1700, 900, 150, "255,190,120", 0.28); // its reflection on the wet street
  disc(260, 1040, 120, "150,40,36", 0.32);   // a red light low on the left, source unseen
  disc(1350, 560, 90, "160,225,205", 0.3);   // a cool tube light in a stairwell
  for (let i = 0; i < 26; i++) {
    const warm = rand() < 0.7;
    disc(rand() * W, 700 + rand() * 520, 18 + rand() * 46, warm ? "255,200,140" : "170,220,210", 0.08 + rand() * 0.16);
  }

  return toTexture(c);
}

// Cloth cover for the book on the sill.
export function clothTexture(hex) {
  const W = 512, H = 512;
  const [c, ctx] = canvas(W, H);
  const rand = seeded(31);
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.03})`;
    ctx.fillRect(0, y, W, 1);
  }
  for (let x = 0; x < W; x += 2) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.04})`;
    ctx.fillRect(x, 0, 1, H);
  }
  // rubbed corners
  [[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 90);
    g.addColorStop(0, "rgba(220,210,190,0.18)");
    g.addColorStop(1, "rgba(220,210,190,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
  return toTexture(c);
}

// Page edges of the book.
export function pagesTexture() {
  const W = 512, H = 64;
  const [c, ctx] = canvas(W, H);
  const rand = seeded(41);
  ctx.fillStyle = "#d8cfb9";
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y++) {
    ctx.fillStyle = `rgba(90,75,50,${rand() * 0.18})`;
    ctx.fillRect(0, y, W, 1);
  }
  return toTexture(c);
}

// Dark varnished wood, grain running along the width.
export function woodTexture(seed = 51) {
  const W = 2048, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const rand = seeded(seed);
  ctx.fillStyle = "#3a2618";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i++) {
    const y = rand() * H;
    ctx.strokeStyle = rand() < 0.5 ? `rgba(20,10,4,${0.12 + rand() * 0.2})` : `rgba(120,80,50,${rand() * 0.12})`;
    ctx.lineWidth = 0.6 + rand() * 2.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.004 + i) * (2 + rand() * 6));
    ctx.stroke();
  }
  // worn, lighter patch where hands rest
  const g = ctx.createRadialGradient(W * 0.45, H * 0.6, 0, W * 0.45, H * 0.6, W * 0.35);
  g.addColorStop(0, "rgba(150,105,70,0.12)");
  g.addColorStop(1, "rgba(150,105,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
