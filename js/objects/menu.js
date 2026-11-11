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
// Set the way a Hong Kong café menu is set: a red band across the top of each
// page, condensed bold headings, numbered entries (A for projects, B for
// experience), plain serif for anything you read in sentences.
const COND = '"Barlow Condensed", "Arial Narrow", "Helvetica Neue", sans-serif';
function page(band) {
  const c = document.createElement("canvas");
  c.width = TW; c.height = TH;
  const ctx = c.getContext("2d");
  ctx.fillStyle = SLEEVE;
  ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = CARD;
  ctx.fillRect(16, 16, TW - 32, TH - 32);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.02})`;
    ctx.fillRect(16 + Math.random() * (TW - 32), 16 + Math.random() * (TH - 32), 1.5, 1.5);
  }
  if (band) {
    ctx.fillStyle = RED;
    ctx.fillRect(16, 16, TW - 32, 118);
    ctx.fillStyle = "#fbf4e6";
    ctx.font = `700 50px ${COND}`;
    ctx.letterSpacing = "3px";
    if (band.code) {
      ctx.fillText(band.code, M, 96);
      ctx.font = `600 50px ${COND}`;
      ctx.fillText(band.label.toUpperCase(), M + ctx.measureText(band.code).width + 26, 96);
    } else ctx.fillText(band.label.toUpperCase(), M, 96);
    ctx.letterSpacing = "0px";
    if (band.right) {
      ctx.font = `500 30px ${COND}`;
      const w = ctx.measureText(band.right).width;
      ctx.fillText(band.right, TW - M - w, 92);
    }
  }
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
// a small red heading inside a page
function sub(ctx, label, y) {
  ctx.font = `700 28px ${COND}`;
  ctx.letterSpacing = "3px";
  ctx.fillStyle = RED;
  ctx.fillText(label.toUpperCase(), M, y);
  ctx.letterSpacing = "0px";
  return y + 44;
}
function dots(ctx, y) {
  ctx.fillStyle = "rgba(29,26,23,0.28)";
  for (let x = M; x < TW - M; x += 12) ctx.fillRect(x, y, 4, 2);
}
// one entry in the list: its code, the name, a line of detail, one sentence
function item(ctx, code, title, detail, sub, y) {
  const x = M + 96, w = TW - M - x;
  ctx.font = `700 46px ${COND}`;
  ctx.fillStyle = RED;
  ctx.fillText(code, M, y + 4);
  y = text(ctx, title, x, y + 4, w, { size: 46, lead: 1.05, font: COND, weight: 600, maxLines: 2 }) - 4;
  if (detail) y = text(ctx, detail.toUpperCase(), x, y + 6, w, { size: 25, lead: 1.25, font: COND, weight: 500, color: SOFT, maxLines: 2 }) + 6;
  y = text(ctx, sub, x, y + 6, w, { size: 28, lead: 1.35, color: INK, maxLines: 2 }) + 18;
  dots(ctx, y - 6);
  return y + 30;
}
function folio(ctx, n, label) {
  ctx.font = `500 24px ${COND}`;
  ctx.letterSpacing = "2px";
  ctx.fillStyle = SOFT;
  const s = [label, n].filter(Boolean).join("   ").toUpperCase();
  ctx.fillText(s, (TW - ctx.measureText(s).width) / 2, TH - 60);
  ctx.letterSpacing = "0px";
}
function sampleMark(ctx, x, y) {
  ctx.save();
  ctx.font = `700 22px ${COND}`;
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "rgba(179,38,30,0.85)";
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
const tools = p => [(p.stack || []).slice(0, 3).join(" · "), p.year].filter(Boolean).join("   ");

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

// the first spread: everything at a glance
function listPages({ projects, experience }, proj, exp) {
  const [l, lc] = page({ code: "A", label: "Projects" });
  let y = 220;
  proj.forEach(s => { y = item(lc, `A${s.index}`, s.entry.title, tools(s.entry), s.entry.summary, y); });
  if (projects.some(p => p.sample)) sampleMark(lc, M, TH - 104);
  folio(lc, 1);
  const [r, rc] = page({ code: "B", label: "Experience" });
  y = 220;
  exp.forEach(s => { y = item(rc, `B${s.index}`, s.entry.organization, [s.entry.role, s.entry.dates].filter(Boolean).join("   "), s.entry.summary, y); });
  y += 10;
  y = sub(rc, "C  Resume", y);
  text(rc, "On the last page, with how to reach me.", M, y, TW - M * 2, { size: 28, color: SOFT, style: "italic" });
  if (experience.some(e => e.sample)) sampleMark(rc, M, TH - 104);
  folio(rc, 2);
  return [l, r];
}

function projectPages(p, n, pageNo) {
  const [l, lc] = page({ code: `A${n}`, label: "Project", right: p.year || "" });
  let y = 230;
  y = text(lc, p.title, M, y, TW - M * 2, { size: 78, lead: 1.0, font: COND, weight: 600, maxLines: 3 }) + 10;
  y = text(lc, p.summary, M, y, TW - M * 2, { size: 34, style: "italic", color: SOFT, maxLines: 3 }) + 26;
  const ih = Math.min(TH - y - 190, (TW - M * 2) * 0.72);
  image(lc, p.preview || { format: "chart" }, hashString(p.id), M, y, TW - M * 2, ih, p.sample);
  text(lc, p.preview?.caption || "", M, y + ih + 44, TW - M * 2, { size: 26, color: SOFT, maxLines: 2 });
  if (p.sample) sampleMark(lc, TW - M - 110, 230);
  folio(lc, pageNo, "Projects");
  const [r, rc] = page({ label: "About it" });
  y = 230;
  y = text(rc, p.description, M, y, TW - M * 2, { size: 34, lead: 1.46, maxLines: 9 }) + 30;
  if (p.results && p.results.length) {
    y = sub(rc, "Results", y);
    p.results.slice(0, 3).forEach(res => {
      rc.font = `700 60px ${COND}`;
      rc.fillStyle = INK;
      rc.fillText(String(res.value), M, y + 12);
      y = text(rc, res.label, M + 200, y - 8, TW - M * 2 - 200, { size: 27, color: SOFT, maxLines: 2 }) + 30;
    });
    y += 6;
  }
  if (p.stack && p.stack.length) {
    y = sub(rc, "Made with", y);
    text(rc, p.stack.join("  ·  "), M, y, TW - M * 2, { size: 38, font: COND, weight: 500, maxLines: 3 });
  }
  folio(rc, pageNo + 1, "Projects");
  return [l, r];
}

function experiencePages(e, n, pageNo) {
  const [l, lc] = page({ code: `B${n}`, label: "Experience", right: e.dates || "" });
  let y = 230;
  y = text(lc, e.organization, M, y, TW - M * 2, { size: 76, lead: 1.0, font: COND, weight: 600, maxLines: 3 }) + 8;
  y = text(lc, [e.role, e.location].filter(Boolean).join("  ·  "), M, y, TW - M * 2, { size: 34, font: COND, weight: 500, color: SOFT, maxLines: 2 }) + 26;
  y = text(lc, e.summary, M, y, TW - M * 2, { size: 34, style: "italic", lead: 1.35, maxLines: 5 }) + 30;
  if (e.responsibilities && e.responsibilities.length) {
    y = sub(lc, "Responsibilities", y);
    e.responsibilities.slice(0, 5).forEach(r => { y = text(lc, `– ${r}`, M, y, TW - M * 2, { size: 29, lead: 1.4, maxLines: 3 }) + 8; });
  }
  if (e.sample) sampleMark(lc, TW - M - 110, 230);
  folio(lc, pageNo, "Experience");
  const [r, rc] = page({ label: "What I did" });
  y = 230;
  if (e.contributions && e.contributions.length) {
    e.contributions.slice(0, 6).forEach(x => { y = text(rc, x, M, y, TW - M * 2, { size: 31, lead: 1.42, maxLines: 4 }) + 20; });
  }
  (e.caseStudy?.sections || []).slice(0, 2).forEach(s => {
    y += 6;
    y = sub(rc, s.heading, y);
    y = text(rc, s.body, M, y, TW - M * 2, { size: 28, lead: 1.46, maxLines: 5 }) + 12;
  });
  folio(rc, pageNo + 1, "Experience");
  return [l, r];
}

function closingPages({ site }) {
  const { links } = site;
  const [l, lc] = page({ code: "C", label: "Resume" });
  let y = 240;
  y = text(lc, linkOr(links.resume, "") ? "The full resume opens from the link under the menu." : "The resume PDF isn't linked yet.", M, y, TW - M * 2, { size: 34, style: "italic", color: SOFT });
  folio(lc, "");
  const [r, rc] = page({ label: "Contact" });
  y = 240;
  const lines = [links.email, links.linkedin && "LinkedIn", links.github && "GitHub"].filter(Boolean);
  if (lines.length) lines.forEach(t => { y = text(rc, t, M, y, TW - M * 2, { size: 44, font: COND, weight: 600 }) + 6; });
  else text(rc, "Contact details aren't added yet.", M, y, TW - M * 2, { size: 34, style: "italic", color: SOFT });
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
