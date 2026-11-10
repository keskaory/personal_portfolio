// The magazine on the restaurant table: an editorial object whose pages are
// typeset from the content files. A cover, an inside spread (a short note
// and the contents), a feature spread for each project, a profile spread
// for each experience, and a closing spread for the resume and contact.
// Pages turn as a curling 3D leaf.
import * as THREE from "three";
import { drawPlaceholder, hashString } from "../lib/placeholder-art.js";
import { urls, linkOr } from "../lib/content.js";

const PW = 0.2, PH = 0.27;        // a page, in meters
const TW = 900, TH = 1215;        // a page's texture, in pixels (same 20:27 ratio)
const SERIF = '"EB Garamond", Garamond, Georgia, serif';
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const INK = "#1c1916", SOFT = "#5f574d", PAPER = "#efe9dc", ACCENT = "#8f3b2b";

// ---------------------------------------------------------------- typesetting
function page() {
  const c = document.createElement("canvas");
  c.width = TW; c.height = TH;
  const ctx = c.getContext("2d");
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, TW, TH);
  // faint paper tooth
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.025})`;
    ctx.fillRect(Math.random() * TW, Math.random() * TH, 1.5, 1.5);
  }
  return [c, ctx];
}

// wrapped text; returns the y after the last line
function text(ctx, str, x, y, maxW, { size = 30, lead = 1.42, font = SERIF, color = INK, weight = 400, style = "", maxLines = 99 } = {}) {
  ctx.font = `${style} ${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  const words = String(str || "").split(/\s+/).filter(Boolean);
  let line = "", lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      if (lines === maxLines - 1) { ctx.fillText(line.replace(/\s*\S*$/, "") + "…", x, y); return y + size * lead; }
      ctx.fillText(line, x, y);
      y += size * lead; lines++;
      line = words[i];
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += size * lead; }
  return y;
}
function rule(ctx, x, y, w, color = "rgba(28,25,22,0.35)") { ctx.fillStyle = color; ctx.fillRect(x, y, w, 2); }
function folio(ctx, n, side, label) {
  ctx.font = `400 22px ${SANS}`;
  ctx.fillStyle = SOFT;
  const s = `${n}`;
  const lbl = label || "";
  if (side === "left") { ctx.fillText(s, 70, TH - 56); ctx.fillText(lbl, 120, TH - 56); }
  else { const w = ctx.measureText(s).width; ctx.fillText(s, TW - 70 - w, TH - 56); ctx.fillText(lbl, TW - 120 - w - ctx.measureText(lbl).width, TH - 56); }
}
function sampleMark(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  ctx.strokeStyle = "rgba(143,59,43,0.75)";
  ctx.fillStyle = "rgba(143,59,43,0.75)";
  ctx.lineWidth = 3;
  ctx.font = `700 26px ${SANS}`;
  ctx.strokeRect(-10, -30, 122, 40);
  ctx.fillText("SAMPLE", 0, 0);
  ctx.restore();
}
function image(ctx, preview, seed, x, y, w, h, sample) {
  const c = document.createElement("canvas");
  c.width = Math.round(w); c.height = Math.round(h);
  drawPlaceholder(c, { format: (preview && preview.format) || "photo", seed, label: sample ? "Sample image" : "" });
  ctx.drawImage(c, x, y, w, h);
  if (preview && preview.image) {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, x, y, w, h); ctx.canvas.dispatchEvent(new Event("redraw")); };
    img.src = preview.image;
  }
}

// ------------------------------------------------------------------ the pages
function coverPage({ site, projects }) {
  const [c, ctx] = page();
  image(ctx, { format: "photo" }, 7, 0, 0, TW, TH, true);
  ctx.fillStyle = "rgba(10,12,11,0.25)";
  ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = "#f3ede1";
  ctx.font = `400 168px ${SERIF}`;
  ctx.fillText(site.magazine?.masthead || site.person.name.split(" ")[0], 60, 210);
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(site.magazine?.issue || "Issue 01", 66, 262);
  let y = TH - 330;
  ctx.font = `italic 400 38px ${SERIF}`;
  ctx.fillText("Inside", 66, y);
  y += 54;
  projects.slice(0, 3).forEach(p => { y = text(ctx, p.title, 66, y, TW - 150, { size: 34, color: "#f3ede1", maxLines: 1 }); });
  sampleMark(ctx, TW - 230, 250);
  return c;
}

function editorPage({ site }) {
  const [c, ctx] = page();
  let y = 150;
  y = text(ctx, "From the editor", 70, y, TW - 140, { size: 54 });
  rule(ctx, 70, y - 20, TW - 140);
  y += 30;
  (site.person.bio || []).forEach(p => { y = text(ctx, p, 70, y, TW - 140, { size: 31, lead: 1.5 }) + 18; });
  y += 20;
  text(ctx, site.person.name, 70, y, TW - 140, { size: 30, style: "italic", color: SOFT });
  sampleMark(ctx, TW - 230, TH - 150);
  folio(ctx, 2, "left");
  return c;
}

function contentsPage(spreads) {
  const [c, ctx] = page();
  let y = 150;
  y = text(ctx, "Contents", 70, y, TW - 140, { size: 54 });
  rule(ctx, 70, y - 20, TW - 140);
  y += 20;
  let section = "";
  spreads.forEach(s => {
    if (!s.entry) return;
    if (s.section !== section) {
      section = s.section;
      y += 18;
      y = text(ctx, section, 70, y, TW - 140, { size: 24, font: SANS, color: ACCENT, weight: 600 });
    }
    ctx.font = `400 24px ${SANS}`;
    ctx.fillStyle = SOFT;
    ctx.fillText(String(s.pageNo), 70, y + 2);
    y = text(ctx, s.title, 140, y, TW - 230, { size: 32, maxLines: 2 }) + 6;
  });
  folio(ctx, 3, "right");
  return c;
}

function featurePages(p, n, pageNo) {
  // left: the image, full bleed with a caption
  const [l, lc] = page();
  image(lc, p.preview || { format: "chart" }, hashString(p.id), 0, 0, TW, TH * 0.78, p.sample);
  text(lc, p.preview?.caption || "", 70, TH * 0.78 + 70, TW - 140, { size: 26, style: "italic", color: SOFT, maxLines: 2 });
  folio(lc, pageNo, "left", "Projects");
  // right: headline, standfirst, body, results, tools
  const [r, rc] = page();
  let y = 140;
  rc.font = `600 22px ${SANS}`;
  rc.fillStyle = ACCENT;
  rc.fillText(`Project ${String(n).padStart(2, "0")}`, 70, y);
  y += 60;
  y = text(rc, p.title, 70, y, TW - 140, { size: 60, lead: 1.12, maxLines: 4 }) + 10;
  y = text(rc, p.summary, 70, y, TW - 140, { size: 32, style: "italic", color: SOFT, maxLines: 3 }) + 16;
  rule(rc, 70, y - 14, 120, ACCENT);
  y += 20;
  y = text(rc, p.description, 70, y, TW - 140, { size: 28, lead: 1.5, maxLines: 9 }) + 18;
  if (p.results && p.results.length) {
    const colW = (TW - 140) / Math.min(3, p.results.length);
    p.results.slice(0, 3).forEach((res, i) => {
      const x = 70 + i * colW;
      text(rc, res.value, x, y + 50, colW - 20, { size: 64, lead: 1, maxLines: 1 });
      text(rc, res.label, x, y + 96, colW - 30, { size: 22, font: SANS, color: SOFT, maxLines: 3 });
    });
    y += 210;
  }
  if (p.stack && p.stack.length) text(rc, p.stack.join("  ·  "), 70, Math.min(y, TH - 150), TW - 140, { size: 22, font: SANS, color: SOFT, maxLines: 2 });
  if (p.sample) sampleMark(rc, TW - 230, 140);
  folio(rc, pageNo + 1, "right", "Projects");
  return [l, r];
}

function profilePages(e, n, pageNo) {
  const [l, lc] = page();
  let y = 150;
  lc.font = `600 22px ${SANS}`;
  lc.fillStyle = ACCENT;
  lc.fillText(`Experience ${String(n).padStart(2, "0")}`, 70, y);
  y += 64;
  y = text(lc, e.organization, 70, y, TW - 140, { size: 62, lead: 1.1, maxLines: 4 }) + 6;
  y = text(lc, [e.role, e.dates, e.location].filter(Boolean).join("  ·  "), 70, y, TW - 140, { size: 26, font: SANS, color: SOFT, maxLines: 2 }) + 24;
  rule(lc, 70, y - 18, TW - 140);
  y += 24;
  y = text(lc, e.summary, 70, y, TW - 140, { size: 36, style: "italic", lead: 1.35, maxLines: 5 }) + 24;
  if (e.responsibilities && e.responsibilities.length) {
    y = text(lc, "Responsibilities", 70, y, TW - 140, { size: 24, font: SANS, weight: 600, color: ACCENT }) + 4;
    e.responsibilities.slice(0, 5).forEach(r => { y = text(lc, `– ${r}`, 70, y, TW - 140, { size: 28, lead: 1.42, maxLines: 3 }) + 6; });
  }
  if (e.sample) sampleMark(lc, TW - 230, 150);
  folio(lc, pageNo, "left", "Experience");
  const [r, rc] = page();
  y = 150;
  if (e.contributions && e.contributions.length) {
    y = text(rc, "What I contributed", 70, y, TW - 140, { size: 24, font: SANS, weight: 600, color: ACCENT }) + 8;
    e.contributions.slice(0, 6).forEach(x => { y = text(rc, x, 70, y, TW - 140, { size: 30, lead: 1.45, maxLines: 4 }) + 18; });
  }
  (e.caseStudy?.sections || []).slice(0, 2).forEach(s => {
    y += 10;
    y = text(rc, s.heading, 70, y, TW - 140, { size: 34 }) + 2;
    y = text(rc, s.body, 70, y, TW - 140, { size: 27, lead: 1.5, maxLines: 5 }) + 10;
  });
  folio(rc, pageNo + 1, "right", "Experience");
  return [l, r];
}

function closingPages({ site }) {
  const { links } = site;
  const [l, lc] = page();
  let y = 150;
  y = text(lc, "Resume", 70, y, TW - 140, { size: 60 });
  rule(lc, 70, y - 20, TW - 140);
  y += 30;
  y = text(lc, linkOr(links.resume, "") ? "The full resume is linked below the page." : "The resume PDF isn't linked yet.", 70, y, TW - 140, { size: 32, style: "italic", color: SOFT });
  folio(lc, "", "left");
  const [r, rc] = page();
  y = 150;
  y = text(rc, "Write to me", 70, y, TW - 140, { size: 60 });
  rule(rc, 70, y - 20, TW - 140);
  y += 30;
  const lines = [links.email, links.linkedin && "LinkedIn", links.github && "GitHub"].filter(Boolean);
  if (lines.length) lines.forEach(t => { y = text(rc, t, 70, y, TW - 140, { size: 34 }) + 6; });
  else text(rc, "Contact details aren't added yet.", 70, y, TW - 140, { size: 32, style: "italic", color: SOFT });
  return [l, r];
}

// Builds every spread with its texture pair and the links that go under it.
export function buildSpreads(content) {
  const { projects, experience, site } = content;
  const spreads = [];
  let pageNo = 4;
  const proj = projects.map((p, i) => {
    const s = { section: "Projects", title: p.title, entry: p, kind: "project", pageNo, index: i + 1 };
    pageNo += 2;
    return s;
  });
  const exp = experience.map((e, i) => {
    const s = { section: "Experience", title: e.organization, entry: e, kind: "experience", pageNo, index: i + 1 };
    pageNo += 2;
    return s;
  });
  spreads.push({ section: "Contents", title: "Contents", pages: [editorPage(content), contentsPage([...proj, ...exp])], actions: [] });
  proj.forEach(s => {
    const p = s.entry;
    spreads.push({
      ...s, pages: featurePages(p, s.index, s.pageNo),
      actions: [
        p.caseStudy ? { label: "Read the full story", href: urls.project(p.id), page: true } : null,
        linkOr(p.github, "") ? { label: "Code on GitHub", href: p.github } : null,
      ].filter(Boolean),
      summary: p.summary,
      readable: `${p.title}. ${p.summary} ${p.description} ${(p.results || []).map(r => `${r.value}: ${r.label}.`).join(" ")} Tools: ${(p.stack || []).join(", ")}.`,
    });
  });
  exp.forEach(s => {
    const e = s.entry;
    spreads.push({
      ...s, pages: profilePages(e, s.index, s.pageNo),
      actions: e.caseStudy ? [{ label: "Read the full profile", href: urls.experience(e.id), page: true }] : [{ label: "Open the page", href: urls.experience(e.id), page: true }],
      summary: `${e.role}, ${e.dates}. ${e.summary}`,
      readable: `${e.organization}. ${e.role}, ${e.dates}. ${e.summary} ${(e.contributions || []).join(" ")}`,
    });
  });
  const resume = linkOr(site.links.resume, "contents.html#resume");
  spreads.push({ section: "Resume", title: "Resume and contact", pages: closingPages(content), actions: [{ label: "Open the resume", href: resume, page: !site.links.resume }, { label: "Everything, as a list", href: "contents.html", page: true }] });
  spreads.forEach(s => { s.sample = !!(s.entry && s.entry.sample); });
  return { spreads, cover: coverPage(content) };
}

// ---------------------------------------------------------------- the object
const tex = canvas => {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  canvas.addEventListener("redraw", () => (t.needsUpdate = true));
  return t;
};

// a page that can curl: a grid plane with its left edge on the spine
function leafGeometry() {
  const g = new THREE.PlaneGeometry(PW, PH, 24, 1);
  g.translate(PW / 2, 0, 0);
  g.rotateX(-Math.PI / 2);
  g.userData.base = g.attributes.position.array.slice();
  return g;
}
function curl(g, angle) {
  // rotate about the spine (z axis here), bending the outer edge a little behind
  const p = g.attributes.position.array, base = g.userData.base;
  const lift = Math.sin(angle);
  for (let i = 0; i < p.length; i += 3) {
    const x = base[i], z = base[i + 2];
    const u = x / PW;
    const a = angle * (1 - 0.18 * u * lift);
    p[i] = Math.cos(a) * x;
    p[i + 1] = Math.sin(a) * x + 0.0062; // just above the flat pages
    p[i + 2] = z;
  }
  g.attributes.position.needsUpdate = true;
  g.computeVertexNormals();
}

export function createMagazine(content) {
  const { spreads, cover } = buildSpreads(content);
  const group = new THREE.Group();
  const paperMat = map => new THREE.MeshStandardMaterial({ map, roughness: 0.9, color: new THREE.Color(0.86, 0.86, 0.86) });
  const textures = spreads.map(s => s.pages.map(tex));
  // the back of the turning leaf is seen mirrored, so it gets flipped copies
  const flipped = new Map();
  const back = t => {
    if (!flipped.has(t)) {
      const f = t.clone();
      f.wrapS = THREE.RepeatWrapping;
      f.repeat.x = -1;
      f.offset.x = 1;
      f.needsUpdate = true;
      t.image.addEventListener?.("redraw", () => (f.needsUpdate = true));
      flipped.set(t, f);
    }
    return flipped.get(t);
  };
  const coverTex = tex(cover);

  // the closed magazine: a thin block with the cover on top
  const closed = new THREE.Group();
  const block = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.006, PH), [paperMat(null), paperMat(null), paperMat(coverTex), paperMat(null), paperMat(null), paperMat(null)]);
  block.material.forEach((m, i) => { if (i !== 2) m.color.set("#e6dfd0"); });
  block.position.y = 0.003;
  block.castShadow = block.receiveShadow = true;
  closed.add(block);
  group.add(closed);

  // the open magazine: left and right pages flat, a leaf that turns
  const open = new THREE.Group();
  open.visible = false;
  const flatGeo = new THREE.PlaneGeometry(PW, PH);
  flatGeo.rotateX(-Math.PI / 2);
  const leftMat = paperMat(textures[0][0]), rightMat = paperMat(textures[0][1]);
  const left = new THREE.Mesh(flatGeo, leftMat);
  left.position.set(-PW / 2, 0.0052, 0);
  const right = new THREE.Mesh(flatGeo, rightMat);
  right.position.set(PW / 2, 0.0052, 0);
  [left, right].forEach(m => { m.receiveShadow = true; open.add(m); });
  // a soft shadow in the gutter
  const gutterC = document.createElement("canvas");
  gutterC.width = 64; gutterC.height = 4;
  const gx = gutterC.getContext("2d");
  const gg = gx.createLinearGradient(0, 0, 64, 0);
  gg.addColorStop(0, "rgba(0,0,0,0)"); gg.addColorStop(0.5, "rgba(0,0,0,0.35)"); gg.addColorStop(1, "rgba(0,0,0,0)");
  gx.fillStyle = gg; gx.fillRect(0, 0, 64, 4);
  const gutter = new THREE.Mesh(new THREE.PlaneGeometry(0.05, PH), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gutterC), transparent: true, depthWrite: false }));
  gutter.rotation.x = -Math.PI / 2;
  gutter.position.y = 0.0056;
  open.add(gutter);
  // the turning leaf: front shows one page, back shows the next
  const leafGeo = leafGeometry();
  const leafFront = new THREE.Mesh(leafGeo, paperMat(null));
  const leafBack = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, color: new THREE.Color(0.86, 0.86, 0.86), side: THREE.BackSide }));
  leafFront.visible = leafBack.visible = false;
  open.add(leafFront, leafBack);
  // under the pages, the rest of the magazine's thickness
  const under = new THREE.Mesh(new THREE.BoxGeometry(PW * 2, 0.004, PH), new THREE.MeshStandardMaterial({ color: "#e2dacb", roughness: 0.8 }));
  under.position.y = 0.002;
  under.castShadow = true;
  open.add(under);
  group.add(open);

  let current = 0;
  let turn = null; // { from, to, t, dir }
  const listeners = [];

  function show(i) {
    leftMat.map = textures[i][0]; leftMat.needsUpdate = true;
    rightMat.map = textures[i][1]; rightMat.needsUpdate = true;
  }

  return {
    group,
    spreads,
    size: { w: PW * 2, h: PH },
    hits: [block, left, right],
    left, right,
    get index() { return current; },
    get isOpen() { return open.visible; },
    onChange(fn) { listeners.push(fn); },
    setOpen(v) { open.visible = v; closed.visible = !v; },
    // jump straight to a spread (no turn)
    go(i) {
      current = Math.max(0, Math.min(spreads.length - 1, i));
      show(current);
      listeners.forEach(f => f(current));
    },
    // turn one page forward (+1) or back (-1), animated
    turn(dir, reduced) {
      const to = current + dir;
      if (to < 0 || to >= spreads.length || turn) return false;
      if (reduced) { this.go(to); return true; }
      if (dir > 0) {
        // the right page lifts and lands on the left; underneath, the next right page
        leafFront.material.map = textures[current][1];
        leafBack.material.map = back(textures[to][0]);
        rightMat.map = textures[to][1];
      } else {
        leafFront.material.map = textures[to][1];
        leafBack.material.map = back(textures[current][0]);
        leftMat.map = textures[to][0];
      }
      leafFront.material.needsUpdate = leafBack.material.needsUpdate = rightMat.needsUpdate = leftMat.needsUpdate = true;
      leafFront.visible = leafBack.visible = true;
      turn = { to, t: 0, dir };
      curl(leafGeo, dir > 0 ? 0 : Math.PI);
      return true;
    },
    update(dt) {
      if (!turn) return;
      turn.t = Math.min(1, turn.t + dt / 0.65);
      const k = turn.t < 0.5 ? 2 * turn.t * turn.t : 1 - Math.pow(-2 * turn.t + 2, 2) / 2;
      curl(leafGeo, turn.dir > 0 ? k * Math.PI : (1 - k) * Math.PI);
      if (turn.t === 1) {
        leafFront.visible = leafBack.visible = false;
        current = turn.to;
        turn = null;
        show(current);
        listeners.forEach(f => f(current));
      }
    },
    sectionStart(name) {
      const i = spreads.findIndex(s => s.section.toLowerCase() === name.toLowerCase());
      return i < 0 ? 0 : i;
    },
  };
}
