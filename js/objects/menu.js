// The menu at the noodle shop: a binder of laminated pages in a worn vinyl
// cover, the kind that lives propped behind the condiments. Its pages are
// typeset from the content files, set like a real menu: the first spread
// lists every project and every job, one line each, and the pages after it
// give each one its own spread. The last spread is the resume and contact.
// Pages turn as stiff laminated leaves.
//
// Same shape as the magazine it replaced (spreads, turn, go, onChange,
// sectionStart, hits), so the reading bar and routing are unchanged.
import * as THREE from "three";
import { drawPlaceholder, hashString } from "../lib/placeholder-art.js";
import { urls, linkOr } from "../lib/content.js";

const PW = 0.21, PH = 0.30;        // a page, in meters
const TW = 840, TH = 1200;         // a page's texture, in pixels (same 7:10 ratio)
const SERIF = '"EB Garamond", Garamond, Georgia, serif';
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const INK = "#1d1a17", SOFT = "#615a50", CARD = "#f3eddf", RED = "#b3261e", SLEEVE = "#d8d3c6";
const M = 74; // page margin

// ---------------------------------------------------------------- typesetting
// Inside the menu the pages are set for reading at a glance: a small red kicker,
// a large condensed heading, then each entry as name, one line, the result that
// matters, and the tools. The menu is the object; the pages are the portfolio.
const COND = '"Barlow Condensed", "Arial Narrow", "Helvetica Neue", sans-serif';
function page() {
  const c = document.createElement("canvas");
  c.width = TW; c.height = TH;
  const ctx = c.getContext("2d");
  ctx.fillStyle = SLEEVE;
  ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = CARD;
  ctx.fillRect(16, 16, TW - 32, TH - 32);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.018})`;
    ctx.fillRect(16 + Math.random() * (TW - 32), 16 + Math.random() * (TH - 32), 1.5, 1.5);
  }
  return [c, ctx];
}
function text(ctx, str, x, y, maxW, { size = 30, lead = 1.4, font = SERIF, color = INK, weight = 400, style = "", maxLines = 99 } = {}) {
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
// the kicker and heading at the top of a page
function head(ctx, kicker, title, y = 128) {
  ctx.font = `700 24px ${COND}`;
  ctx.letterSpacing = "4px";
  ctx.fillStyle = RED;
  ctx.fillText(kicker.toUpperCase(), M, y);
  ctx.letterSpacing = "0px";
  y = text(ctx, title, M, y + 74, TW - M * 2, { size: 72, lead: 0.98, font: COND, weight: 600, maxLines: 3 });
  ctx.fillStyle = "rgba(29,26,23,0.85)";
  ctx.fillRect(M, y - 26, TW - M * 2, 3);
  return y + 24;
}
function label(ctx, s, y) {
  ctx.font = `700 22px ${COND}`;
  ctx.letterSpacing = "3px";
  ctx.fillStyle = SOFT;
  ctx.fillText(s.toUpperCase(), M, y);
  ctx.letterSpacing = "0px";
  return y + 38;
}
// one entry in a list: number, name, a line, the result that matters, the tools
function entry(ctx, n, title, line, result, meta, y) {
  const x = M + 64, w = TW - M - x;
  ctx.font = `600 30px ${COND}`;
  ctx.fillStyle = "rgba(29,26,23,0.4)";
  ctx.fillText(String(n).padStart(2, "0"), M, y);
  y = text(ctx, title, x, y, w, { size: 46, lead: 1.02, font: COND, weight: 600, maxLines: 2 }) + 2;
  y = text(ctx, line, x, y, w, { size: 27, lead: 1.32, maxLines: 2 }) + 4;
  if (result) y = text(ctx, result, x, y, w, { size: 28, lead: 1.2, font: COND, weight: 600, color: RED, maxLines: 1 }) + 2;
  if (meta) y = text(ctx, meta.toUpperCase(), x, y, w, { size: 22, lead: 1.2, font: COND, weight: 500, color: SOFT, maxLines: 1 });
  ctx.fillStyle = "rgba(29,26,23,0.14)";
  ctx.fillRect(x, y + 6, w, 2);
  return y + 46;
}
function folio(ctx, n) {
  if (n === "" || n === undefined) return;
  ctx.font = `500 24px ${COND}`;
  ctx.fillStyle = SOFT;
  const s = String(n);
  ctx.fillText(s, (TW - ctx.measureText(s).width) / 2, TH - 58);
}
function sampleMark(ctx, x, y) {
  ctx.save();
  ctx.font = `700 22px ${COND}`;
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "rgba(179,38,30,0.8)";
  ctx.fillText("SAMPLE", x, y);
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
const firstResult = p => (p.results && p.results[0] ? `${p.results[0].value}  ${p.results[0].label}` : "");
const tools = p => [(p.stack || []).slice(0, 4).join(" · "), p.year].filter(Boolean).join("   ");

// ------------------------------------------------------------------ the pages
function coverPage({ site }) {
  const c = document.createElement("canvas");
  c.width = TW; c.height = TH;
  const ctx = c.getContext("2d");
  // worn oxblood vinyl, stitched round the edge, foil lettering
  ctx.fillStyle = "#5a1813";
  ctx.fillRect(0, 0, TW, TH);
  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,190,170"},${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * TW, Math.random() * TH, 2, 2);
  }
  const wear = ctx.createRadialGradient(TW * 0.8, TH * 0.9, 20, TW * 0.8, TH * 0.9, 420);
  wear.addColorStop(0, "rgba(255,200,170,0.12)"); wear.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = wear; ctx.fillRect(0, 0, TW, TH);
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(20,4,2,0.6)"; ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, TW - 56, TH - 56);
  ctx.setLineDash([]);
  const gold = "#d8b471";
  ctx.strokeStyle = gold; ctx.lineWidth = 3;
  ctx.strokeRect(90, 90, TW - 180, TH - 180);
  ctx.textAlign = "center";
  ctx.fillStyle = gold;
  ctx.font = `600 150px ${COND}`;
  ctx.letterSpacing = "10px";
  ctx.fillText((site.menu?.cover || "Menu").toUpperCase(), TW / 2, TH * 0.46);
  ctx.letterSpacing = "0px";
  ctx.fillRect(TW / 2 - 70, TH * 0.46 + 44, 140, 3);
  ctx.font = `500 34px ${COND}`;
  ctx.letterSpacing = "6px";
  ctx.fillText((site.menu?.line || "Projects · Experience · Resume").toUpperCase(), TW / 2, TH * 0.46 + 112);
  ctx.letterSpacing = "0px";
  ctx.font = `italic 400 34px ${SERIF}`;
  ctx.fillText(site.person.name, TW / 2, TH - 170);
  ctx.textAlign = "left";
  return c;
}

// the first spread: all the work at a glance
function listPages({ projects, experience }, proj, exp) {
  const [l, lc] = page();
  let y = head(lc, "Selected work", "Projects");
  proj.forEach(s => { y = entry(lc, s.index, s.entry.title, s.entry.summary, firstResult(s.entry), tools(s.entry), y); });
  if (projects.some(p => p.sample)) sampleMark(lc, M, TH - 100);
  folio(lc, 1);
  const [r, rc] = page();
  y = head(rc, "Selected work", "Experience");
  exp.forEach(s => { y = entry(rc, s.index, s.entry.organization, s.entry.summary, "", [s.entry.role, s.entry.dates].filter(Boolean).join("  ·  "), y); });
  y += 6;
  y = label(rc, "Resume and contact", y);
  text(rc, "On the last page.", M, y, TW - M * 2, { size: 28, color: SOFT, style: "italic" });
  if (experience.some(e => e.sample)) sampleMark(rc, M, TH - 100);
  folio(rc, 2);
  return [l, r];
}

function projectPages(p, n, pageNo) {
  const [l, lc] = page();
  let y = head(lc, `Project ${String(n).padStart(2, "0")}${p.year ? `  ·  ${p.year}` : ""}`, p.title);
  y = text(lc, p.summary, M, y, TW - M * 2, { size: 34, style: "italic", color: SOFT, lead: 1.32, maxLines: 3 }) + 30;
  if (p.results && p.results.length) {
    y = label(lc, "Results", y);
    const cols = Math.min(2, p.results.length), cw = (TW - M * 2) / cols;
    p.results.slice(0, 2).forEach((res, i) => {
      const x = M + i * cw;
      lc.font = `700 78px ${COND}`;
      lc.fillStyle = RED;
      lc.fillText(String(res.value), x, y + 52);
      text(lc, res.label, x, y + 96, cw - 30, { size: 25, color: SOFT, lead: 1.3, maxLines: 3 });
    });
    y += 220;
  }
  if (p.stack && p.stack.length) {
    y = label(lc, "Tools", y);
    text(lc, p.stack.join("  ·  "), M, y, TW - M * 2, { size: 36, font: COND, weight: 500, maxLines: 3 });
  }
  if (p.sample) sampleMark(lc, TW - M - 110, 128);
  folio(lc, pageNo);
  const [r, rc] = page();
  y = 104;
  const ih = (TW - M * 2) * 0.66;
  image(rc, p.preview || { format: "chart" }, hashString(p.id), M, y, TW - M * 2, ih, p.sample);
  y = text(rc, p.preview?.caption || "", M, y + ih + 40, TW - M * 2, { size: 24, color: SOFT, maxLines: 2 }) + 26;
  y = label(rc, "About it", y);
  text(rc, p.description, M, y, TW - M * 2, { size: 31, lead: 1.46, maxLines: 9 });
  folio(rc, pageNo + 1);
  return [l, r];
}

function experiencePages(e, n, pageNo) {
  const [l, lc] = page();
  let y = head(lc, `Experience ${String(n).padStart(2, "0")}`, e.organization);
  y = text(lc, [e.role, e.dates, e.location].filter(Boolean).join("  ·  "), M, y, TW - M * 2, { size: 32, font: COND, weight: 500, color: SOFT, maxLines: 2 }) + 18;
  y = text(lc, e.summary, M, y, TW - M * 2, { size: 34, style: "italic", lead: 1.34, maxLines: 5 }) + 30;
  if (e.responsibilities && e.responsibilities.length) {
    y = label(lc, "Responsibilities", y);
    e.responsibilities.slice(0, 5).forEach(r => { y = text(lc, `– ${r}`, M, y, TW - M * 2, { size: 28, lead: 1.4, maxLines: 3 }) + 8; });
  }
  if (e.sample) sampleMark(lc, TW - M - 110, 128);
  folio(lc, pageNo);
  const [r, rc] = page();
  y = head(rc, "Experience", "What I did");
  (e.contributions || []).slice(0, 6).forEach(x => { y = text(rc, x, M, y, TW - M * 2, { size: 30, lead: 1.42, maxLines: 4 }) + 18; });
  (e.caseStudy?.sections || []).slice(0, 2).forEach(s => {
    y += 6;
    y = label(rc, s.heading, y);
    y = text(rc, s.body, M, y, TW - M * 2, { size: 27, lead: 1.46, maxLines: 5 }) + 12;
  });
  folio(rc, pageNo + 1);
  return [l, r];
}

function closingPages({ site }) {
  const { links } = site;
  const [l, lc] = page();
  let y = head(lc, "Resume", "The full resume");
  text(lc, linkOr(links.resume, "") ? "Open it from the link under the menu." : "The resume PDF isn't linked yet.", M, y, TW - M * 2, { size: 34, style: "italic", color: SOFT });
  const [r, rc] = page();
  y = head(rc, "Contact", "Write to me");
  const lines = [links.email, links.linkedin && "LinkedIn", links.github && "GitHub"].filter(Boolean);
  if (lines.length) lines.forEach(t => { y = text(rc, t, M, y, TW - M * 2, { size: 44, font: COND, weight: 600 }) + 6; });
  else text(rc, "Contact details aren't added yet.", M, y, TW - M * 2, { size: 34, style: "italic", color: SOFT });
  return [l, r];
}

// Builds every spread with its texture pair and the links that go under it.
export function buildSpreads(content) {
  const { projects, experience, site } = content;
  const spreads = [];
  let pageNo = 3;
  const proj = projects.map((p, i) => { const s = { section: "Projects", title: p.title, entry: p, kind: "project", pageNo, index: i + 1 }; pageNo += 2; return s; });
  const exp = experience.map((e, i) => { const s = { section: "Experience", title: e.organization, entry: e, kind: "experience", pageNo, index: i + 1 }; pageNo += 2; return s; });
  spreads.push({
    section: "Selected work", title: "Projects and experience", pages: listPages(content, proj, exp), actions: [],
    readable: `Projects: ${projects.map(p => `${p.title}, ${p.summary}`).join("; ")}. Experience: ${experience.map(e => `${e.organization}, ${e.role}, ${e.dates}`).join("; ")}.`,
  });
  proj.forEach(s => {
    const p = s.entry;
    spreads.push({
      ...s, pages: projectPages(p, s.index, s.pageNo),
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
      ...s, pages: experiencePages(e, s.index, s.pageNo),
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

// a page that turns: a grid plane with its left edge on the spine.
// Laminated pages are stiff, so it barely bends.
function leafGeometry() {
  const g = new THREE.PlaneGeometry(PW, PH, 16, 1);
  g.translate(PW / 2, 0, 0);
  g.rotateX(-Math.PI / 2);
  g.userData.base = g.attributes.position.array.slice();
  return g;
}
function swing(g, angle) {
  const p = g.attributes.position.array, base = g.userData.base;
  const lift = Math.sin(angle);
  for (let i = 0; i < p.length; i += 3) {
    const x = base[i], z = base[i + 2];
    const a = angle * (1 - 0.05 * (x / PW) * lift);
    p[i] = Math.cos(a) * x;
    p[i + 1] = Math.sin(a) * x + 0.009;
    p[i + 2] = z;
  }
  g.attributes.position.needsUpdate = true;
  g.computeVertexNormals();
}

export function createMenu(content) {
  const { spreads, cover } = buildSpreads(content);
  const group = new THREE.Group();
  // hover tips the closed menu forward about its bottom edge
  const tip = new THREE.Group();
  tip.position.z = PH / 2;
  const body = new THREE.Group();
  body.position.z = -PH / 2;
  tip.add(body);
  group.add(tip);
  // printed card under a plastic sleeve: matte ink, glossy top coat
  const sleeveMat = (map, side = THREE.FrontSide) => new THREE.MeshPhysicalMaterial({
    map, roughness: 0.85, color: new THREE.Color(0.9, 0.9, 0.9), clearcoat: 0.3, clearcoatRoughness: 0.45, side, // a soft sheen, not a glare over the type
  });
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
  const vinyl = new THREE.MeshPhysicalMaterial({ color: "#4a140f", roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 });

  // closed: the binder, cover up
  const closed = new THREE.Group();
  const block = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.012, PH), [vinyl, vinyl, new THREE.MeshPhysicalMaterial({ map: coverTex, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 }), vinyl, vinyl, vinyl]);
  block.position.y = 0.006;
  block.castShadow = block.receiveShadow = true;
  closed.add(block);
  body.add(closed);

  // open: two pages flat on the open cover, a leaf that turns
  const open = new THREE.Group();
  open.visible = false;
  const boards = new THREE.Mesh(new THREE.BoxGeometry(PW * 2 + 0.012, 0.006, PH + 0.012), vinyl);
  boards.position.y = 0.003;
  boards.castShadow = boards.receiveShadow = true;
  open.add(boards);
  const flatGeo = new THREE.PlaneGeometry(PW, PH);
  flatGeo.rotateX(-Math.PI / 2);
  const leftMat = sleeveMat(textures[0][0]), rightMat = sleeveMat(textures[0][1]);
  const left = new THREE.Mesh(flatGeo, leftMat);
  left.position.set(-PW / 2 - 0.002, 0.0075, 0);
  const right = new THREE.Mesh(flatGeo, rightMat);
  right.position.set(PW / 2 + 0.002, 0.0075, 0);
  [left, right].forEach(m => { m.receiveShadow = true; open.add(m); });
  // the binder rings down the spine
  const ringMat = new THREE.MeshStandardMaterial({ color: "#b9b6ae", metalness: 0.9, roughness: 0.3 });
  [-0.09, 0, 0.09].forEach(z => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0016, 6, 16, Math.PI), ringMat);
    ring.position.set(0, 0.0075, z);
    ring.rotation.y = Math.PI / 2;
    ring.castShadow = true;
    open.add(ring);
  });
  const leafGeo = leafGeometry();
  const leafFront = new THREE.Mesh(leafGeo, sleeveMat(null));
  const leafBack = new THREE.Mesh(leafGeo, sleeveMat(null, THREE.BackSide));
  leafFront.visible = leafBack.visible = false;
  leafFront.castShadow = true;
  open.add(leafFront, leafBack);
  body.add(open);

  let current = 0;
  let turn = null; // { to, t, dir }
  const listeners = [];
  function show(i) {
    leftMat.map = textures[i][0]; leftMat.needsUpdate = true;
    rightMat.map = textures[i][1]; rightMat.needsUpdate = true;
  }

  return {
    group,
    tip,
    spreads,
    size: { w: PW * 2, h: PH },
    hits: [block, left, right],
    left, right,
    get index() { return current; },
    get isOpen() { return open.visible; },
    onChange(fn) { listeners.push(fn); },
    setOpen(v) { open.visible = v; closed.visible = !v; },
    go(i) {
      current = Math.max(0, Math.min(spreads.length - 1, i));
      show(current);
      listeners.forEach(f => f(current));
    },
    turn(dir, reduced) {
      const to = current + dir;
      if (to < 0 || to >= spreads.length || turn) return false;
      if (reduced) { this.go(to); return true; }
      if (dir > 0) {
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
      swing(leafGeo, dir > 0 ? 0 : Math.PI);
      return true;
    },
    update(dt) {
      if (!turn) return;
      turn.t = Math.min(1, turn.t + dt / 0.55);
      const k = turn.t < 0.5 ? 2 * turn.t * turn.t : 1 - Math.pow(-2 * turn.t + 2, 2) / 2;
      swing(leafGeo, turn.dir > 0 ? k * Math.PI : (1 - k) * Math.PI);
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
