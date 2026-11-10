// Hair, PS2-style: a few chunky shells laid over the head, each with a
// painted strand texture, a soft highlight band and jagged cut-out tips at
// its free edge. The cut is the recent one from the photos: a heavy fringe
// to the brows with a break off center, volume on top, sides over the top of
// the ears, the back rounded and falling onto the nape. Head-local space.
import * as THREE from "three";
import { seeded } from "../objects/textures.js";

const C = new THREE.Vector3(0, 0.122, -0.006); // center of the hair volume
const R = new THREE.Vector3(0.079, 0.108, 0.1); // its radii
const deg = d => (d * Math.PI) / 180;

function at(yaw, pitch, lift) {
  const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  return new THREE.Vector3(C.x + d.x * R.x * (1 + lift), C.y + d.y * R.y * (1 + lift), C.z + d.z * R.z * (1 + lift));
}

// Painted strands with a highlight band; v runs root (0) to tip (1).
// The alpha cuts jagged points into the tip end, so shells read as locks.
function hairTexture(base, seed, { tips = 14, tipDepth = 0.28 } = {}) {
  const W = 256, H = 256;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const rand = seeded(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // broad locks first: slightly lighter and darker bands
  for (let i = 0; i < 18; i++) {
    const x = rand() * W, w = 8 + rand() * 18;
    ctx.fillStyle = rand() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (rand() - 0.5) * 20, H * 0.4, x + (rand() - 0.5) * 30, H * 0.8, x + (rand() - 0.5) * 24, H);
    ctx.lineTo(x + w, H);
    ctx.bezierCurveTo(x + w + (rand() - 0.5) * 20, H * 0.8, x + w, H * 0.4, x + w, 0);
    ctx.fill();
  }
  // fine strands
  for (let i = 0; i < 220; i++) {
    const x = rand() * W;
    ctx.strokeStyle = rand() < 0.4 ? `rgba(200,205,215,${0.04 + rand() * 0.07})` : `rgba(0,0,0,${0.2 + rand() * 0.35})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (rand() - 0.5) * 10, H * 0.35, x + (rand() - 0.5) * 16, H * 0.7, x + (rand() - 0.5) * 20, H);
    ctx.stroke();
  }
  // the sheen band that era hair textures always have
  const band = ctx.createLinearGradient(0, H * 0.18, 0, H * 0.5);
  band.addColorStop(0, "rgba(120,128,140,0)");
  band.addColorStop(0.5, "rgba(120,128,140,0.22)");
  band.addColorStop(1, "rgba(120,128,140,0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, H);
  // darker toward the root
  const root = ctx.createLinearGradient(0, 0, 0, H * 0.18);
  root.addColorStop(0, "rgba(0,0,0,0.35)");
  root.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = root;
  ctx.fillRect(0, 0, W, H * 0.18);
  // jagged tips: cut points out of the bottom edge
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(0, H);
  const step = W / tips;
  for (let i = 0; i <= tips; i++) {
    const x = i * step;
    const len = H * tipDepth * (0.45 + rand() * 0.75);
    ctx.lineTo(x + step * (0.3 + rand() * 0.4), H - len);
    ctx.lineTo(x + step, H - len * (0.05 + rand() * 0.2));
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/**
 * A shell: a patch of the head's surface between two yaws, from a top pitch
 * down to a bottom pitch, then hanging on below that by `hang` meters.
 * lift(u, v) pushes it off the scalp; u runs across, v from top to tip.
 */
function shell({ yaw0, yaw1, pitchTop, pitchBottom, lift, hang = 0, hangOut = 0, cols = 10, rows = 7 }) {
  const pos = [], uv = [], idx = [];
  const hangRows = hang > 0 ? 3 : 0;
  const total = rows + hangRows;
  for (let j = 0; j <= total; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const yaw = yaw0 + (yaw1 - yaw0) * u;
      let p;
      if (j <= rows) {
        const v = j / rows;
        p = at(yaw, pitchTop + (pitchBottom - pitchTop) * v, lift(u, v));
      } else {
        const k = (j - rows) / hangRows;
        const edge = at(yaw, pitchBottom, lift(u, 1));
        const out = new THREE.Vector3(edge.x - C.x, 0, edge.z - C.z).normalize();
        p = edge.add(new THREE.Vector3(out.x * hangOut * k, -hang * k, out.z * hangOut * k));
      }
      pos.push(p.x, p.y, p.z);
      // v is flipped so the canvas's bottom (the cut tips) lands at the free edge
      uv.push(u * (cols / 5), 1 - j / total);
    }
  }
  for (let j = 0; j < total; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + cols + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Short clipped hair for the sides and back of a two-block cut: dark at the
// top, the scalp showing through a little toward the hairline.
function clippedTexture(base, skin, seed) {
  const W = 128, H = 128;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const rand = seeded(seed);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, base);
  g.addColorStop(0.72, base);
  g.addColorStop(1, skin);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "90,86,92"},${0.2 + rand() * 0.3})`;
    ctx.fillRect(rand() * W, rand() * H, 1, 1 + rand());
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// the sides and back, clipped close: from under the top layer down to a
// hairline that runs over the ears and down to the nape
function undercut(lift = 0.035) {
  const cols = 18, rows = 6;
  const yaw0 = deg(38), yaw1 = deg(322);
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const bottom = yaw => {
    const d = Math.abs(yaw - Math.PI) / (Math.PI / 180); // 0 at the back, ~140 at the temples
    if (d < 25) return deg(-58);
    if (d < 60) return deg(-58 + 40 * sm(25, 60, d));
    return deg(-18 + 30 * sm(60, 85, d));
  };
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const u = i / cols, v = j / rows;
    const yaw = yaw0 + (yaw1 - yaw0) * u;
    const top = deg(48);
    const p = at(yaw, top + (bottom(yaw) - top) * v, lift);
    pos.push(p.x, p.y, p.z);
    uv.push(u * 3, 1 - v);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + cols + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Two-block cut: short clipped sides and back; a longer top layer that
// overhangs them with a visible step; the fringe falling to the brows.
export function buildHair(config, colors) {
  const h = config.hair || {};
  const base = colors.hair || "#141113";
  const group = new THREE.Group();
  group.name = "hair";
  const mat = (seed, opts) => new THREE.MeshStandardMaterial({
    color: "#ffffff", map: hairTexture(base, seed, opts), roughness: 0.62, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m); group.add(mesh); return mesh; };
  const top = h.topLength ?? 0.03;

  // filler under everything, so no skin shows through gaps on the crown
  const scalp = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.36), new THREE.MeshStandardMaterial({ color: base, roughness: 0.8 }));
  scalp.scale.set(R.x * 1.02, R.y * 1.02, R.z * 1.02);
  scalp.position.copy(C);
  group.add(scalp);

  // clipped sides and back
  add(undercut(0.035), new THREE.MeshStandardMaterial({ map: clippedTexture(base, colors.skinShadow || "#8a6a5e", 41), roughness: 0.9 }));

  // the top layer: sits out from the clipped sides so there's a step, tips cut jagged
  add(shell({
    yaw0: deg(24), yaw1: deg(336), pitchTop: deg(88), pitchBottom: deg(34),
    lift: (u, v) => 0.1 + Math.sin(v * Math.PI) * 0.05 + v * 0.03,
    hang: top * 0.55, hangOut: 0.014, cols: 16, rows: 6,
  }), mat(11, { tips: 18, tipDepth: 0.3 }));
  // a second, shorter layer over it for chunkiness on the crown
  add(shell({
    yaw0: deg(34), yaw1: deg(326), pitchTop: deg(87), pitchBottom: deg(46),
    lift: (u, v) => 0.135 + Math.sin(v * Math.PI) * 0.05,
    hang: top * 0.35, hangOut: 0.01, cols: 14, rows: 5,
  }), mat(12, { tips: 14, tipDepth: 0.36 }));

  // fringe: two overlapping shells falling forward to the brows, with a break off center
  const part = deg(h.parting ?? -14);
  const fringeLen = h.fringeLength ?? 0.036;
  const fringe = (y0, y1, seed, liftBase) => add(shell({
    yaw0: y0, yaw1: y1, pitchTop: deg(84), pitchBottom: deg(26),
    lift: (u, v) => liftBase + Math.sin(v * Math.PI) * 0.04 + v * 0.02,
    hang: fringeLen + 0.012, hangOut: 0.004, cols: 8, rows: 6,
  }), mat(seed, { tips: 10, tipDepth: 0.42 }));
  fringe(deg(-74), part - deg(3), 31, 0.1);
  fringe(part + deg(3), deg(74), 32, 0.105);
  // a heavier lock across the break, the way it falls in the photos
  fringe(part - deg(18), part + deg(22), 33, 0.125);

  return { group };
}
