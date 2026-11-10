// Paper things: the letter, the folded resume, a photo print, case files.
// Text on paper is drawn from the content files, so editing the JSON
// changes what is typed on the objects too.
import * as THREE from "three";
import { seeded } from "./textures.js";
import { drawPlaceholder, hashString } from "../lib/placeholder-art.js";

const TYPE = '"Courier Prime", "Courier New", "Hiragino Mincho ProN", monospace';

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function paperGround(ctx, W, H, seed, color = "#ebe5d6") {
  const rand = seeded(seed);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < (W * H) / 60; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},${rand() * 0.05})`;
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1 + rand());
  }
  // a little yellowing toward the edges
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, "rgba(120,90,40,0)");
  g.addColorStop(1, "rgba(120,90,40,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return rand;
}

// typed text with uneven ink; wraps to `maxW`, returns the y after the last line
function typeText(ctx, rand, text, x, y, size, maxW, lineH = 1.5) {
  ctx.font = `${size}px ${TYPE}`;
  const words = String(text).split(/\s+/);
  let line = "";
  const lines = [];
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  for (const l of lines) {
    let cx = x;
    for (const ch of l) {
      ctx.fillStyle = `rgba(24,20,16,${0.7 + rand() * 0.3})`;
      ctx.fillText(ch, cx + (rand() - 0.5) * 0.6, y + (rand() - 0.5) * 0.8);
      cx += ctx.measureText(ch).width;
    }
    y += size * lineH;
  }
  return y;
}

// a rubber-stamp mark, used to label placeholder material as sample
export function stamp(ctx, x, y, size, text = "SAMPLE", angle = -0.12) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`;
  const w = ctx.measureText(text).width;
  ctx.strokeStyle = "rgba(142,43,35,0.75)";
  ctx.fillStyle = "rgba(142,43,35,0.72)";
  ctx.lineWidth = size * 0.08;
  ctx.strokeRect(-size * 0.3, -size * 1.05, w + size * 0.6, size * 1.35);
  ctx.fillText(text, 0, 0);
  // break up the ink a little
  ctx.globalCompositeOperation = "destination-out";
  const rand = seeded(hashString(text) + Math.round(x));
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.6})`;
    ctx.fillRect(-size * 0.3 + rand() * (w + size * 0.6), -size * 1.05 + rand() * size * 1.35, 1 + rand() * 2.5, 1 + rand() * 2.5);
  }
  ctx.restore();
}

// A sheet lying on a surface, very slightly bowed so it doesn't look like a decal.
function sheet(w, h, map, { bow = 0.0015 } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, 12, 16);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2);
    p.setZ(i, bow * (1 - x * x) * 0.6 + bow * 0.4 * (1 - y * y));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.92, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---- the letter of introduction: the bio, typed
export function createLetter(person, sample) {
  const W = 1100, H = 1500;
  const [c, ctx] = canvas(W, H);
  const rand = paperGround(ctx, W, H, 3);
  let y = 150;
  y = typeText(ctx, rand, person.name, 110, y, 40, W - 220);
  y = typeText(ctx, rand, `${person.school}. ${person.graduation}.`, 110, y + 6, 30, W - 220);
  y += 50;
  (person.bio || []).forEach(p => { y = typeText(ctx, rand, p, 110, y, 30, W - 220, 1.6) + 30; });
  if (sample) stamp(ctx, W - 380, H - 160, 64);
  const m = sheet(0.165, 0.225, tex(c));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// ---- the resume, folded in thirds; `open` (0..1) flattens it
export function createResume(person, sample) {
  const W = 1100, H = 1420;
  const [c, ctx] = canvas(W, H);
  const rand = paperGround(ctx, W, H, 5, "#efeae0");
  let y = 140;
  y = typeText(ctx, rand, person.name, 100, y, 46, W - 200);
  y = typeText(ctx, rand, person.school, 100, y + 4, 28, W - 200);
  // grey bars where the resume lines will be
  y += 40;
  for (let block = 0; block < 4; block++) {
    ctx.fillStyle = "rgba(30,26,22,0.75)";
    ctx.fillRect(100, y, 260, 20);
    y += 46;
    for (let l = 0; l < 4; l++) {
      ctx.fillStyle = `rgba(30,26,22,${0.18 + rand() * 0.1})`;
      ctx.fillRect(100, y, (W - 200) * (0.55 + rand() * 0.45), 12);
      y += 30;
    }
    y += 34;
  }
  if (sample) stamp(ctx, W - 380, 190, 60, "SAMPLE", 0.1);
  const map = tex(c);

  const w = 0.17, h = 0.22, panelH = h / 3;
  const backMat = new THREE.MeshStandardMaterial({ color: "#e6e0d2", roughness: 0.9, side: THREE.BackSide });
  const group = new THREE.Group();
  // one third of the page: printed on the front, plain on the back
  const panel = i => {
    const geo = new THREE.PlaneGeometry(w, panelH);
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setY(k, (2 - i + uv.getY(k)) / 3);
    const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.9 }));
    const back = new THREE.Mesh(geo, backMat);
    const g = new THREE.Group();
    [front, back].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
    return g;
  };
  // the middle third lies flat; the other two are hinged on its edges
  const mid = panel(1);
  mid.rotation.x = -Math.PI / 2;
  group.add(mid);
  const topHinge = new THREE.Group();
  topHinge.position.z = -panelH / 2;
  const top = panel(0);
  top.position.y = panelH / 2;
  topHinge.add(top);
  group.add(topHinge);
  const botHinge = new THREE.Group();
  botHinge.position.z = panelH / 2;
  const bot = panel(2);
  bot.position.y = -panelH / 2;
  botHinge.add(bot);
  group.add(botHinge);

  // hinge angle -PI/2 lays a panel flat, +PI/2 folds it back over the middle.
  // Folded, the panels stay slightly sprung open, the way real paper does.
  group.userData.setOpen = t => {
    topHinge.rotation.x = THREE.MathUtils.lerp(Math.PI / 2 - 0.26, -Math.PI / 2, t);
    botHinge.rotation.x = THREE.MathUtils.lerp(Math.PI / 2 - 0.12, -Math.PI / 2, t);
    topHinge.position.y = 0.0024 * (1 - t);
    botHinge.position.y = 0.0012 * (1 - t);
  };
  group.userData.setOpen(0);
  return group;
}

// ---- a photo print with a white border, leaning against the wall
export function createPrint(photo, sample) {
  const W = 700, H = 900, B = 46;
  const [c, ctx] = canvas(W, H);
  paperGround(ctx, W, H, 9, "#f1eee6");
  const [p] = canvas(W - B * 2, H - B * 3);
  drawPlaceholder(p, { format: "photo", seed: 4, label: sample ? "Sample: a photo of you" : "" });
  ctx.drawImage(p, B, B);
  const m = sheet(0.09, 0.116, tex(c), { bow: 0.0008 });
  m.material.roughness = 0.45; // glossy print
  return m;
}

// ---- a manila case file with a typed label; `open` (0..1) swings the cover
export function createCaseFile(entry, seed = 1) {
  const w = 0.235, d = 0.305, t = 0.0012;
  const group = new THREE.Group();
  const manila = new THREE.MeshStandardMaterial({ color: "#a98f62", roughness: 0.85 });

  // back cover with a tab along the top edge
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), manila);
  back.position.y = t / 2;
  back.castShadow = back.receiveShadow = true;
  group.add(back);
  const tab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, t, 0.018), manila);
  tab.position.set(w * 0.22, t / 2, -d / 2 - 0.009);
  tab.castShadow = true;
  group.add(tab);

  // the first page inside: what you did there, typed
  const PW = 900, PH = 1170;
  const [pc, px] = canvas(PW, PH);
  const rand = paperGround(px, PW, PH, 20 + seed);
  let y = 120;
  y = typeText(px, rand, entry.organization, 90, y, 34, PW - 180);
  y = typeText(px, rand, `${entry.role}. ${entry.dates}.`, 90, y + 4, 26, PW - 180);
  y += 30;
  [...(entry.responsibilities || []), ...(entry.contributions || [])].slice(0, 6).forEach(r => {
    y = typeText(px, rand, `- ${r}`, 90, y, 24, PW - 180, 1.5) + 12;
  });
  if (entry.sample) stamp(px, PW - 330, PH - 120, 54);
  const page = sheet(w - 0.012, d - 0.014, tex(pc), { bow: 0.0006 });
  page.rotation.x = -Math.PI / 2;
  page.position.y = t + 0.0015;
  group.add(page);

  // front cover, hinged along the left edge
  const LW = 700, LH = 300;
  const [lc, lx] = canvas(LW, LH);
  const lr = paperGround(lx, LW, LH, 40 + seed, "#efe9da");
  lx.strokeStyle = "rgba(30,26,22,0.5)"; lx.lineWidth = 3;
  lx.strokeRect(14, 14, LW - 28, LH - 28);
  let ly = 92;
  ly = typeText(lx, lr, entry.organization, 44, ly, 34, LW - 88, 1.3);
  ly = typeText(lx, lr, entry.role, 44, ly + 6, 26, LW - 88, 1.3);
  typeText(lx, lr, entry.dates, 44, ly + 4, 26, LW - 88, 1.3);
  const coverPivot = new THREE.Group();
  coverPivot.position.set(-w / 2, t * 2 + 0.003, 0);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), manila);
  cover.position.x = w / 2;
  cover.castShadow = cover.receiveShadow = true;
  coverPivot.add(cover);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.064), new THREE.MeshStandardMaterial({ map: tex(lc), roughness: 0.9 }));
  label.rotation.x = -Math.PI / 2;
  label.position.set(w / 2 + 0.01, t / 2 + 0.0003, -d * 0.12);
  coverPivot.add(label);
  if (entry.sample) {
    const [sc, sx] = canvas(400, 160);
    stamp(sx, 40, 120, 84);
    const sMat = new THREE.MeshBasicMaterial({ map: tex(sc), transparent: true, depthWrite: false });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.028), sMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(w / 2 + 0.05, t / 2 + 0.0004, d * 0.26);
    coverPivot.add(s);
  }
  group.add(coverPivot);

  group.userData.setOpen = k => {
    coverPivot.rotation.z = k * (Math.PI - 0.05);
  };
  group.userData.size = { w, d };
  return group;
}
