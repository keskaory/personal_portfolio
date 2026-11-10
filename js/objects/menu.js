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
function page() {
  const c = document.createElement("canvas");
  c.width = TW; c.height = TH;
  const ctx = c.getContext("2d");
  // the plastic sleeve runs a little past the card
  ctx.fillStyle = SLEEVE;
  ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = CARD;
  ctx.fillRect(16, 16, TW - 32, TH - 32);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.02})`;
    ctx.fillRect(16 + Math.random() * (TW - 32), 16 + Math.random() * (TH - 32), 1.5, 1.5);
  }
  // a thin printed border, as menus have
  ctx.strokeStyle = "rgba(179,38,30,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, TW - 80, TH - 80);
  return [c, ctx];
}

// wrapped text; returns the y after the last line
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
// a section heading: small red capitals over a rule
function heading(ctx, label, y) {
  ctx.font = `700 24px ${SANS}`;
  ctx.fillStyle = RED;
  ctx.letterSpacing = "4px";
  ctx.fillText(label.toUpperCase(), M, y);
  ctx.letterSpacing = "0px";
  ctx.fillRect(M, y + 16, TW - M * 2, 2);
  return y + 66;
}
// one entry in the list: number, name (up to two lines), a small detail line, a one-line description
function item(ctx, n, title, detail, sub, y) {
  const x = M + 58, w = TW - M - x;
  ctx.font = `700 22px ${SANS}`;
  ctx.fillStyle = RED;
  ctx.fillText(String(n).padStart(2, "0"), M, y - 4);
  y = text(ctx, title, x, y, w, { size: 40, lead: 1.12, weight: 500, maxLines: 2 }) - 6;
  if (detail) {
    ctx.font = `600 19px ${SANS}`;
    ctx.letterSpacing = "2px";
    ctx.fillStyle = SOFT;
    ctx.fillText(detail.toUpperCase(), x, y + 6);
    ctx.letterSpacing = "0px";
    y += 36;
  }
  return text(ctx, sub, x, y + 4, w, { size: 26, font: SANS, color: SOFT, lead: 1.35, maxLines: 2 }) + 34;
}
function folio(ctx, n, label) {
  ctx.font = `400 20px ${SANS}`;
  ctx.fillStyle = SOFT;
  const s = [label, n].filter(Boolean).join("   ");
  ctx.fillText(s, (TW - ctx.measureText(s).width) / 2, TH - 64);
}
function sampleMark(ctx, x, y) {
  ctx.save();
  ctx.font = `700 18px ${SANS}`;
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
const tools = p => (p.stack || []).slice(0, 2).join(" · ");

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
  ctx.font = `400 120px ${SERIF}`;
  ctx.fillText(site.menu?.cover || "Menu", TW / 2, TH * 0.44);
  ctx.fillRect(TW / 2 - 60, TH * 0.44 + 46, 120, 3);
  ctx.font = `400 30px ${SANS}`;
  ctx.letterSpacing = "5px";
  ctx.fillText((site.menu?.line || "Projects · Experience · Resume").toUpperCase(), TW / 2, TH * 0.44 + 120);
  ctx.letterSpacing = "0px";
  ctx.font = `italic 400 34px ${SERIF}`;
  ctx.fillText(site.person.name, TW / 2, TH - 170);
  ctx.textAlign = "left";
  return c;
}

// the first spread: everything at a glance
function listPages({ site, projects, experience }, proj, exp) {
  const [l, lc] = page();
  let y = 140;
  y = text(lc, site.person.name, M, y, TW - M * 2, { size: 50, lead: 1.1 }) + 2;
  y = text(lc, site.person.school, M, y, TW - M * 2, { size: 26, font: SANS, color: SOFT }) + 46;
  y = heading(lc, "Projects", y);
  proj.forEach(s => { y = item(lc, s.index, s.entry.title, tools(s.entry), s.entry.summary, y); });
  if (projects.some(p => p.sample)) sampleMark(lc, M, TH - 100);
  folio(lc, 1);
  const [r, rc] = page();
  y = 140;
  y = heading(rc, "Experience", y);
  exp.forEach(s => { y = item(rc, s.index, s.entry.organization, s.entry.dates || "", s.entry.role, y); });
  y += 24;
  y = heading(rc, "Also", y);
  y = item(rc, "", "Resume", "", "On the last page, with how to reach me.", y);
  if (experience.some(e => e.sample)) sampleMark(rc, M, TH - 100);
  folio(rc, 2);
  return [l, r];
}

function projectPages(p, n, pageNo) {
  const [l, lc] = page();
  let y = 140;
  y = heading(lc, `Project ${String(n).padStart(2, "0")}`, y);
  y = text(lc, p.title, M, y, TW - M * 2, { size: 58, lead: 1.08, maxLines: 3 }) + 8;
  y = text(lc, p.summary, M, y, TW - M * 2, { size: 34, style: "italic", color: SOFT, maxLines: 3 }) + 28;
  const ih = Math.min(TH - y - 200, (TW - M * 2) * 0.72);
  image(lc, p.preview || { format: "chart" }, hashString(p.id), M, y, TW - M * 2, ih, p.sample);
  text(lc, p.preview?.caption || "", M, y + ih + 46, TW - M * 2, { size: 25, font: SANS, color: SOFT, maxLines: 2 });
  if (p.sample) sampleMark(lc, TW - M - 120, 140);
  folio(lc, pageNo, "Projects");
  const [r, rc] = page();
  y = 140;
  y = heading(rc, "About it", y);
  y = text(rc, p.description, M, y, TW - M * 2, { size: 34, lead: 1.48, maxLines: 10 }) + 34;
  if (p.results && p.results.length) {
    y = heading(rc, "Results", y);
    p.results.slice(0, 3).forEach(res => {
      rc.font = `500 52px ${SERIF}`;
      rc.fillStyle = INK;
      rc.fillText(String(res.value), M, y + 8);
      y = text(rc, res.label, M + 200, y - 6, TW - M * 2 - 200, { size: 27, font: SANS, color: SOFT, maxLines: 2 }) + 28;
    });
    y += 10;
  }
  if (p.stack && p.stack.length) {
    y = heading(rc, "Tools", y);
    text(rc, p.stack.join("  ·  "), M, y, TW - M * 2, { size: 30, font: SANS, color: INK, maxLines: 3 });
  }
  folio(rc, pageNo + 1, "Projects");
  return [l, r];
}

function experiencePages(e, n, pageNo) {
  const [l, lc] = page();
  let y = 140;
  y = heading(lc, `Experience ${String(n).padStart(2, "0")}`, y);
  y = text(lc, e.organization, M, y, TW - M * 2, { size: 58, lead: 1.08, maxLines: 3 }) + 6;
  y = text(lc, [e.role, e.dates, e.location].filter(Boolean).join("  ·  "), M, y, TW - M * 2, { size: 26, font: SANS, color: SOFT, maxLines: 2 }) + 30;
  y = text(lc, e.summary, M, y, TW - M * 2, { size: 34, style: "italic", lead: 1.35, maxLines: 5 }) + 30;
  if (e.responsibilities && e.responsibilities.length) {
    y = heading(lc, "Responsibilities", y);
    e.responsibilities.slice(0, 5).forEach(r => { y = text(lc, `– ${r}`, M, y, TW - M * 2, { size: 27, lead: 1.42, maxLines: 3 }) + 8; });
  }
  if (e.sample) sampleMark(lc, TW - M - 120, 140);
  folio(lc, pageNo, "Experience");
  const [r, rc] = page();
  y = 140;
  if (e.contributions && e.contributions.length) {
    y = heading(rc, "What I contributed", y);
    e.contributions.slice(0, 6).forEach(x => { y = text(rc, x, M, y, TW - M * 2, { size: 29, lead: 1.45, maxLines: 4 }) + 18; });
  }
  (e.caseStudy?.sections || []).slice(0, 2).forEach(s => {
    y += 10;
    y = text(rc, s.heading, M, y, TW - M * 2, { size: 34 }) + 2;
    y = text(rc, s.body, M, y, TW - M * 2, { size: 26, lead: 1.5, maxLines: 5 }) + 10;
  });
  folio(rc, pageNo + 1, "Experience");
  return [l, r];
}

function closingPages({ site }) {
  const { links } = site;
  const [l, lc] = page();
  let y = 140;
  y = heading(lc, "Resume", y);
  y = text(lc, linkOr(links.resume, "") ? "The full resume opens from the link below the menu." : "The resume PDF isn't linked yet.", M, y, TW - M * 2, { size: 32, style: "italic", color: SOFT });
  folio(lc, "");
  const [r, rc] = page();
  y = 140;
  y = heading(rc, "Contact", y);
  const lines = [links.email, links.linkedin && "LinkedIn", links.github && "GitHub"].filter(Boolean);
  if (lines.length) lines.forEach(t => { y = text(rc, t, M, y, TW - M * 2, { size: 34 }) + 6; });
  else text(rc, "Contact details aren't added yet.", M, y, TW - M * 2, { size: 32, style: "italic", color: SOFT });
  folio(rc, "");
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
    section: "Menu", title: "Projects and experience", pages: listPages(content, proj, exp), actions: [],
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
  // printed card under a plastic sleeve: matte ink, glossy top coat
  const sleeveMat = (map, side = THREE.FrontSide) => new THREE.MeshPhysicalMaterial({
    map, roughness: 0.75, color: new THREE.Color(0.9, 0.9, 0.9), clearcoat: 0.7, clearcoatRoughness: 0.22, side,
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
  group.add(closed);

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
  group.add(open);

  let current = 0;
  let turn = null; // { to, t, dir }
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
