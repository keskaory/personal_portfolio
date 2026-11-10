// Placeholder images for projects that have no picture yet. They are drawn,
// not photos: a graded, grainy frame with an abstract hint of the format
// (a chart, a screen, a diagram) and a clear "sample" mark.
// Plain 2D canvas, so pages can use it without loading 3D.

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296);
}

export function hashString(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function drawPlaceholder(canvas, { format = "chart", seed = 1, label = "Sample image" } = {}) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const rand = rng(seed);
  const u = Math.min(W, H) / 100;

  // graded ground: green-teal shadows, warm light from one side
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0b1512");
  g.addColorStop(0.6, "#121a16");
  g.addColorStop(1, "#24170f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.78, H * 0.25, 0, W * 0.78, H * 0.25, W * 0.7);
  glow.addColorStop(0, "rgba(232,176,110,0.22)");
  glow.addColorStop(1, "rgba(232,176,110,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const ink = a => `rgba(236,226,206,${a})`;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (format === "chart") {
    // axes, a few bars and a line, all soft
    const x0 = W * 0.14, y0 = H * 0.8, x1 = W * 0.88, y1 = H * 0.2;
    ctx.strokeStyle = ink(0.35); ctx.lineWidth = u * 0.5;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    const n = 9;
    for (let i = 0; i < n; i++) {
      const bh = (0.2 + rand() * 0.6) * (y0 - y1);
      const bw = ((x1 - x0) / n) * 0.5;
      const bx = x0 + ((x1 - x0) / n) * (i + 0.25);
      ctx.fillStyle = ink(0.1 + rand() * 0.08);
      ctx.fillRect(bx, y0 - bh, bw, bh);
    }
    ctx.strokeStyle = "rgba(232,176,110,0.75)"; ctx.lineWidth = u * 0.9;
    ctx.beginPath();
    let y = y0 - (y0 - y1) * 0.4;
    for (let i = 0; i <= 24; i++) {
      y += (rand() - 0.45) * (y0 - y1) * 0.12;
      y = Math.max(y1, Math.min(y0, y));
      const x = x0 + ((x1 - x0) * i) / 24;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  } else if (format === "screenshot") {
    // a window: title bar, a sidebar, content blocks
    const m = W * 0.1;
    ctx.strokeStyle = ink(0.35); ctx.lineWidth = u * 0.45;
    ctx.strokeRect(m, H * 0.14, W - m * 2, H * 0.72);
    ctx.fillStyle = ink(0.12);
    ctx.fillRect(m, H * 0.14, W - m * 2, H * 0.07);
    ctx.fillRect(m, H * 0.21, W * 0.18, H * 0.65);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = ink(0.06 + rand() * 0.1);
        ctx.fillRect(m + W * 0.21 + c * W * 0.19, H * 0.26 + r * H * 0.19, W * 0.16, H * 0.15);
      }
    }
    ctx.fillStyle = "rgba(232,176,110,0.55)";
    ctx.fillRect(m + W * 0.21, H * 0.26, W * 0.16, H * 0.15);
  } else if (format === "photo") {
    // a photo still to come: soft window light and a few out-of-focus lights
    for (let i = 0; i < 7; i++) {
      const x = W * (0.15 + rand() * 0.7), y = H * (0.15 + rand() * 0.5), r = W * (0.05 + rand() * 0.1);
      const b = ctx.createRadialGradient(x, y, 0, x, y, r);
      const warm = rand() < 0.6;
      b.addColorStop(0, warm ? "rgba(240,190,130,0.32)" : "rgba(170,220,205,0.25)");
      b.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = b;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  } else {
    // a diagram: boxes joined by lines, left to right
    const cols = 4;
    const nodes = [];
    for (let c = 0; c < cols; c++) {
      const count = c === 0 || c === cols - 1 ? 1 : 2;
      for (let k = 0; k < count; k++) {
        nodes.push({ c, x: W * (0.16 + c * 0.23), y: H * (count === 1 ? 0.5 : 0.33 + k * 0.34) });
      }
    }
    ctx.strokeStyle = ink(0.3); ctx.lineWidth = u * 0.45;
    nodes.forEach(a => nodes.forEach(b => {
      if (b.c === a.c + 1) {
        ctx.beginPath(); ctx.moveTo(a.x + W * 0.06, a.y);
        ctx.bezierCurveTo(a.x + W * 0.12, a.y, b.x - W * 0.12, b.y, b.x - W * 0.06, b.y);
        ctx.stroke();
      }
    }));
    nodes.forEach((n, i) => {
      ctx.fillStyle = i === nodes.length - 1 ? "rgba(232,176,110,0.6)" : ink(0.14);
      ctx.fillRect(n.x - W * 0.06, n.y - H * 0.07, W * 0.12, H * 0.14);
      ctx.strokeStyle = ink(0.35);
      ctx.strokeRect(n.x - W * 0.06, n.y - H * 0.07, W * 0.12, H * 0.14);
    });
  }

  // vignette and grain
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 22;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // the sample mark, small, in the corner
  ctx.font = `${Math.max(10, u * 3.6)}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = ink(0.7);
  ctx.textBaseline = "bottom";
  ctx.fillText(label, W * 0.04, H * 0.95);
  return canvas;
}
