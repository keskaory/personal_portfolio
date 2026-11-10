// projects - edit these
const PROJECTS = [
  { title: "Project one", blurb: "One sentence about what it does.", tags: ["SQL", "PostgreSQL"], body: "Placeholder: the question, what you did, what you found.", link: "#" },
  { title: "Project two", blurb: "One sentence about what it does.", tags: ["Python", "pandas"], body: "Placeholder: the question, what you did, what you found.", link: "#" },
  { title: "Project three", blurb: "One sentence about what it does.", tags: ["Modeling"], body: "Placeholder: the question, what you did, what you found.", link: "#" },
  { title: "Project four", blurb: "One sentence about what it does.", tags: ["Product"], body: "Placeholder: the question, what you did, what you found.", link: "#" },
];

// color sets for the button in the top bar
const GRADES = [
  { name: "Neon night",    bg: "#070b09", a: ["#ff3b30", "#2fe39a", "#ffb000"] },
  { name: "Amber hallway", bg: "#0e0705", a: ["#e8402a", "#ff8a1f", "#ffd36b"] },
  { name: "Blue hour",     bg: "#05080f", a: ["#ff4f8b", "#36c6ff", "#c8f56a"] },
];
let gradeIndex = 0;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const gradeBtn = document.getElementById("grade");
gradeBtn.addEventListener("click", () => {
  gradeIndex = (gradeIndex + 1) % GRADES.length;
  const g = GRADES[gradeIndex];
  const root = document.documentElement.style;
  root.setProperty("--bg", g.bg);
  root.setProperty("--a1", g.a[0]);
  root.setProperty("--a2", g.a[1]);
  root.setProperty("--a3", g.a[2]);
  gradeBtn.textContent = g.name;
  recolorDots();
  scatter();
});

document.getElementById("year").textContent = new Date().getFullYear();

// date imprint like an old film camera, e.g. '26 11 10
const today = new Date();
const pad = n => String(n).padStart(2, "0");
document.getElementById("datestamp").textContent =
  `'${String(today.getFullYear()).slice(2)} ${pad(today.getMonth() + 1)} ${pad(today.getDate())}`;

// hero: the name drawn as dots. the frame fades instead of clearing,
// so anything moving leaves a smear. lights pass through now and then.
const canvas = document.getElementById("dots");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let dots = [];
let streaks = [];
let mouse = { x: -9999, y: -9999 };
let W, H;

function buildDots() {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // draw the text on a hidden canvas and keep the pixels it covers
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const o = off.getContext("2d");
  const narrow = W < 720;
  const size = narrow ? W * 0.26 : Math.min(W * 0.16, H * 0.34);
  o.font = `italic 400 ${size}px "DM Serif Display", Georgia, serif`;
  const left = narrow ? 16 : Math.max(16, W * 0.04);
  const top = narrow ? H * 0.34 : H * 0.4;
  o.fillText("kaory", left, top);
  o.fillText("gatmaitan", left, top + size * 0.92, W - left * 2 - (narrow ? 0 : 90));

  const data = o.getImageData(0, 0, W, H).data;
  const gap = narrow ? 4 : 6;
  dots = [];
  for (let y = 0; y < H; y += gap) {
    for (let x = 0; x < W; x += gap) {
      if (data[(y * W + x) * 4 + 3] > 128) {
        dots.push({
          hx: x, hy: y,
          x: x + (Math.random() - 0.5) * W,
          y: y + (Math.random() - 0.5) * 200,
          vx: 0, vy: 0,
          r: gap * 0.38,
          accent: Math.random() < 0.16 ? Math.ceil(Math.random() * 3) : 0,
        });
      }
    }
  }
  recolorDots();
  if (reduceMotion) dots.forEach(p => { p.x = p.hx; p.y = p.hy; });
  ctx.clearRect(0, 0, W, H);
}

function recolorDots() {
  const colors = [cssVar("--ink"), cssVar("--a1"), cssVar("--a2"), cssVar("--a3")];
  dots.forEach(p => { p.c = colors[p.accent]; });
}

function scatter() {
  if (reduceMotion) return;
  dots.forEach(p => {
    p.vx += (Math.random() - 0.5) * 60;
    p.vy += (Math.random() - 0.5) * 24;
  });
}

function addStreak() {
  const colors = [cssVar("--a1"), cssVar("--a2"), cssVar("--a3"), "#fff2d6"];
  const dir = Math.random() < 0.5 ? 1 : -1;
  streaks.push({
    x: dir > 0 ? -400 : W + 400,
    y: H * (0.15 + Math.random() * 0.75),
    v: dir * (8 + Math.random() * 14),
    len: 160 + Math.random() * 360,
    w: 1 + Math.random() * 2.5,
    c: colors[Math.floor(Math.random() * colors.length)],
  });
}

function draw() {
  ctx.fillStyle = cssVar("--bg");
  ctx.globalAlpha = reduceMotion ? 1 : 0.28;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  if (!reduceMotion && Math.random() < 0.025) addStreak();
  streaks = streaks.filter(s => s.x > -800 && s.x < W + 800);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.55;
  for (const s of streaks) {
    s.x += s.v;
    const tail = s.x - Math.sign(s.v) * s.len;
    const g = ctx.createLinearGradient(tail, 0, s.x, 0);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, s.c);
    ctx.strokeStyle = g;
    ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(tail, s.y);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  const radius = W < 720 ? 60 : 120;
  for (const p of dots) {
    const dx = p.x - mouse.x, dy = p.y - mouse.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      const dist = Math.sqrt(d2) || 1;
      const push = (radius - dist) / radius;
      p.vx += (dx / dist) * push * 7;  // more sideways than up/down
      p.vy += (dy / dist) * push * 3;
    }
    p.vx += (p.hx - p.x) * 0.045;
    p.vy += (p.hy - p.y) * 0.045;
    p.vx *= 0.84;
    p.vy *= 0.84;
    p.x += p.vx;
    p.y += p.vy;

    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(draw);
}

function pointer(e) {
  const rect = canvas.getBoundingClientRect();
  const p = e.touches ? e.touches[0] : e;
  mouse.x = p.clientX - rect.left;
  mouse.y = p.clientY - rect.top;
}
canvas.addEventListener("mousemove", pointer);
canvas.addEventListener("touchmove", pointer, { passive: true });
canvas.addEventListener("mouseleave", () => { mouse.x = mouse.y = -9999; });
canvas.addEventListener("touchend", () => { mouse.x = mouse.y = -9999; });
canvas.addEventListener("click", scatter);

let resizeTimer;
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    buildDots();
    // phones resize when the address bar hides, so only move cards if the width changed
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      layoutCards(false);
    }
  }, 150);
});

// wait for the font, otherwise the dots get drawn in Georgia
document.fonts.load('italic 400 100px "DM Serif Display"').finally(() => {
  buildDots();
  draw();
});

// fade sections in when they scroll into view
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.2 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// work section: project cards you can drag around
const desk = document.getElementById("desk");
const cards = PROJECTS.map((p, i) => {
  const el = document.createElement("article");
  el.className = "card";
  el.tabIndex = 0;
  el.innerHTML = `
    <div class="thumb" style="--c: var(--a${(i % 3) + 1})">${String(i + 1).padStart(2, "0")}</div>
    <h3>${p.title}</h3>
    <p>${p.blurb}</p>
    <p class="tags">${p.tags.join(", ")}</p>`;
  desk.appendChild(el);
  el.addEventListener("keydown", e => { if (e.key === "Enter") openPanel(i); });
  makeDraggable(el, i);
  return el;
});

function isMobile() { return window.innerWidth <= 720; }

function layoutCards(messy) {
  if (isMobile()) return;
  const dw = desk.clientWidth, dh = desk.clientHeight;
  const cw = 262, ch = 300;
  const cols = Math.max(1, Math.floor((dw - 40) / (cw + 30)));
  cards.forEach((el, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    let x, y, rot = 0;
    if (messy) {
      const step = cols > 1 ? (dw - cw - 60) / (cols - 1) : 0;
      x = 30 + col * step + (Math.random() - 0.5) * 50;
      y = 40 + row * 260 + (Math.random() - 0.5) * 60;
      rot = (Math.random() - 0.5) * 16;
    } else {
      x = 30 + col * (cw + 30);
      y = 30 + row * (ch + 20);
    }
    x = Math.min(Math.max(10, x), dw - cw - 10);
    y = Math.min(Math.max(10, y), dh - ch);
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.transform = `rotate(${rot}deg)`;
  });
}
layoutCards(true);

let topZ = 1;
function makeDraggable(el, i) {
  let startX, startY, origX, origY, moved;
  el.addEventListener("pointerdown", e => {
    if (isMobile()) return;
    startX = e.clientX;
    startY = e.clientY;
    origX = el.offsetLeft;
    origY = el.offsetTop;
    moved = false;
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
    el.style.zIndex = ++topZ;
  });
  el.addEventListener("pointermove", e => {
    if (!el.classList.contains("dragging")) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    const maxX = desk.clientWidth - el.offsetWidth;
    const maxY = desk.clientHeight - el.offsetHeight;
    el.style.left = Math.min(Math.max(0, origX + dx), maxX) + "px";
    el.style.top = Math.min(Math.max(0, origY + dy), maxY) + "px";
    el.style.transform = `rotate(${Math.max(-12, Math.min(12, dx * 0.05))}deg)`;
  });
  el.addEventListener("pointerup", () => {
    if (!el.classList.contains("dragging")) return;
    el.classList.remove("dragging");
    if (!moved) openPanel(i);  // a click without dragging opens it
  });
  // on phones the cards are a plain list, so a tap opens them
  el.addEventListener("click", () => { if (isMobile()) openPanel(i); });
}

// project panel
const panel = document.getElementById("panel");
const backdrop = document.getElementById("backdrop");

function openPanel(i) {
  const p = PROJECTS[i];
  document.getElementById("panel-title").textContent = p.title;
  document.getElementById("panel-tags").textContent = p.tags.join(", ");
  document.getElementById("panel-body").textContent = p.body;
  document.getElementById("panel-link").href = p.link;
  backdrop.hidden = false;
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  document.getElementById("panel-close").focus();
}
function closePanel() {
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
}
document.getElementById("panel-close").addEventListener("click", closePanel);
backdrop.addEventListener("click", closePanel);
document.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });
