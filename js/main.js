// Homepage controller. The sequence of stops comes from content/site.json;
// each stop is a camera shot in one of the scenes below. Scenes are built
// the first time they are needed and share one renderer, camera and grade.
//
// Every scene returns { artifacts, shots, restFocus(shot), lights, update() }
// and every artifact has { id, stop, hit or hits, focus, caption, panel(),
// page, examine(portrait), leave(), drag?(dx), release?() }.
import * as THREE from "three";
import { webglAvailable, pickQuality, createRenderer, startLoop } from "./core/renderer.js";
import { createPost } from "./core/post.js";
import { createEnvironment } from "./core/environment.js";
import { CameraRig } from "./core/camera-rig.js";
import { Interaction } from "./core/interaction.js";
import { buildIntro } from "./scenes/intro.js";
import { buildStation } from "./scenes/station.js";
import { buildRestaurant } from "./scenes/restaurant.js";
import { buildApartment } from "./scenes/apartment.js";
import { createReader } from "./ui/reader.js";
import { buildArchive } from "./scenes/archive.js";
import { buildLedge } from "./scenes/ledge.js";
import { createCaption } from "./ui/caption.js";
import { createExaminePanel } from "./ui/examine-panel.js";
import { createChapterNav } from "./ui/chapters.js";
import { loadAll, linkOr } from "./lib/content.js";

const SCENES = { station: buildStation, restaurant: buildRestaurant, apartment: buildApartment, intro: buildIntro, archive: buildArchive, ledge: buildLedge };

const $ = s => document.querySelector(s);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fade = $("#fade");

function fillTitleCard(site) {
  const { person, links } = site;
  $("#title-name").textContent = person.name;
  $("#title-school").textContent = `${person.school}. ${person.graduation}.`;
  $("#title-line").textContent = person.line;
  $("#header-school").textContent = person.school;
  const resume = linkOr(links.resume, "contents.html#resume");
  document.querySelectorAll("[data-resume]").forEach(a => (a.href = resume));
}

function showFallback(message) {
  $("#fallback").hidden = false;
  if (message) $("#fallback-note").textContent = message;
  $("#scene-canvas").hidden = true;
  fade.classList.remove("in");
}

async function main() {
  let content;
  try {
    content = await loadAll();
  } catch {
    return showFallback("The page couldn't load its content. Try reloading.");
  }
  fillTitleCard(content.site);
  const stops = content.site.stops;
  if (!webglAvailable()) return showFallback();

  await Promise.race([
    Promise.all([document.fonts.load('46px "Courier Prime"'), document.fonts.load('600 40px "Barlow Condensed"'), document.fonts.load('700 40px "Barlow Condensed"'), document.fonts.ready]),
    new Promise(r => setTimeout(r, 2500)),
  ]).catch(() => {});

  const quality = pickQuality();
  const canvas = $("#scene-canvas");
  const renderer = createRenderer(canvas, quality);
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.03, 140); // far enough to see down the platform into the tunnel
  const environment = createEnvironment(renderer);

  // ---- scenes, built on first use
  const built = {};
  function sceneFor(name) {
    if (built[name]) return built[name];
    const scene = new THREE.Scene();
    scene.environment = environment;
    scene.environmentIntensity = 0.5;
    const api = SCENES[name](scene, content, { reducedMotion: reduced });
    if (quality === "low") scene.traverse(o => { if (o.isLight && o.shadow) o.shadow.mapSize.set(1024, 1024); });
    // prepare every material now, so nothing appears late the first time it comes into view
    try { renderer.compile(scene, camera); } catch {}
    built[name] = { scene, api };
    return built[name];
  }

  const first = sceneFor(stops[0].scene);
  const post = createPost(renderer, first.scene, camera, { depthOfField: quality === "high" });
  const rig = new CameraRig(camera, { reducedMotion: reduced });
  const caption = createCaption($("#caption"));
  const chapters = createChapterNav($("#chapters"), stops, i => goTo(i));

  // which stop each artifact lives on, without building every scene
  const homeStop = {};
  const stopIndex = id => stops.findIndex(s => s.id === id);
  content.projects.forEach(p => (homeStop[p.id] = stopIndex("projects")));
  content.experience.forEach(e => (homeStop[e.id] = stopIndex("experience")));
  homeStop.magazine = stopIndex("restaurant");
  content.fragrances.forEach(f => (homeStop[f.id] = stopIndex("apartment")));
  ["apt-books", "apt-laptop", "apt-crt", "apt-jewelry", "apt-photos", "apt-volleyball", "apt-rail"].forEach(id => (homeStop[id] = stopIndex("apartment")));
  ["station-letter", "station-ticket", "station-map", "station-train"].forEach(id => (homeStop[id] = stopIndex("station")));

  let current = 0;
  let active = first;
  let mode = "rest"; // rest | moving | examine | leaving
  let hovered = null;
  let selected = null;
  let focusDist = 0.6;
  let aperture = 0.02;
  let attention = 0;

  const portrait = () => innerWidth / innerHeight < 0.85;
  const shotFor = (api, stop) => (portrait() && api.shots[stop.shot + "Portrait"]) || api.shots[stop.shot];
  const stopArtifacts = () => active.api.artifacts.filter(a => a.stop === stops[current].shot);
  const findArtifact = id => active.api.artifacts.find(a => a.id === id);

  const panel = createExaminePanel($("#examine"), {
    onPage: href => leave(selected, href),
    onInternal: href => { putBack(); setTimeout(() => route(href, false), reduced ? 0 : 450); },
    onBack: () => putBack(),
  });

  const reader = createReader($("#reader"), {
    onPage: href => leave(selected, href),
    onTurn: d => turnPage(d),
    onClose: () => putBack(),
  });
  function turnPage(d) {
    if (!selected?.reader) return;
    selected.reader.turn(d, reduced);
  }
  // open the magazine on a stop that asks for it (projects, experience), or at one entry's spread
  function openReader(section, entryId) {
    const a = findArtifact("magazine");
    if (!a) return;
    const mag = a.reader;
    const i = entryId ? Math.max(0, mag.spreads.findIndex(s => s.entry && s.entry.id === entryId)) : mag.sectionStart(section);
    mag.go(i);
    if (selected !== a) examine(a);
  }

  const interaction = new Interaction(canvas, camera, [], {
    hover: id => {
      hovered = id ? findArtifact(id) : null;
      if (mode !== "rest") return;
      if (hovered) caption.show(hovered.caption);
      else caption.hide();
    },
    pointer: (x, y) => rig.setPointer(x, y),
    select: id => {
      if (id && id.startsWith("magazine:") && selected?.reader) { turnPage(id.endsWith("next") ? 1 : -1); return; }
      const a = findArtifact(id);
      if (mode === "rest" || (mode === "examine" && a !== selected)) examine(a);
    },
    empty: () => putBack(),
    drag: dx => { if (mode === "examine" && selected && selected.drag) selected.drag(dx); },
  });

  // ---- what is on screen for the current stop
  // subtitles: one short line after you arrive in a new place; hover captions wait while it shows
  const subtitleEl = $("#subtitle");
  let subTimer = null, subOff = null;
  function subtitle(text) {
    clearTimeout(subTimer); clearTimeout(subOff);
    subtitleEl.textContent = text;
    document.body.classList.add("subtitling");
    subtitleEl.classList.add("on");
    subTimer = setTimeout(() => {
      subtitleEl.classList.remove("on");
      subOff = setTimeout(() => document.body.classList.remove("subtitling"), 700);
    }, 4200);
  }

  // once, the first time you settle somewhere without the title card: say that things can be picked up
  let hinted = false;
  try { hinted = localStorage.getItem("hint-seen") === "1"; } catch {}
  function maybeHint() {
    if (hinted || stops[current].titleCard) return;
    const at = current;
    setTimeout(() => {
      if (hinted || at !== current || document.body.classList.contains("reading")) return;
      if (mode !== "rest" || hovered || document.body.classList.contains("subtitling")) { maybeHint(); return; } // still arriving, or a subtitle is up: try again shortly
      hinted = true;
      try { localStorage.setItem("hint-seen", "1"); } catch {}
      caption.show(matchMedia("(hover: none)").matches ? "Tap things to look closer." : "Hover over things; click to pick them up.", { hold: 5200 });
    }, 2600);
  }

  function showStop() {
    const stop = stops[current];
    chapters.set(current);
    document.body.dataset.stop = stop.id;
    document.body.dataset.title = stop.titleCard ? "1" : "";
    document.body.dataset.scene = stop.scene;
    const next = stops[current + 1];
    const nextLink = $("#next");
    nextLink.textContent = next ? `Next: ${next.label}` : "Back to the start";
    nextLink.href = `#${(next || stops[0]).id}`;
    interaction.setHits(stopArtifacts().flatMap(a => a.hits || [a.hit]));
    maybeHint();

    // keyboard: the objects in this shot as a list of links
    const list = $("#artifact-list");
    list.innerHTML = "";
    stopArtifacts().forEach(a => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${a.id}`;
      link.textContent = a.caption;
      link.addEventListener("focus", () => { if (mode === "rest") { hovered = a; caption.show(a.caption); } });
      link.addEventListener("blur", () => { if (mode === "rest" && hovered === a) { hovered = null; caption.hide(); } });
      link.addEventListener("click", e => {
        e.preventDefault();
        examine(a);
        setTimeout(() => panel.focus(), reduced ? 0 : 950);
      });
      li.appendChild(link);
      list.appendChild(li);
    });
  }

  let entered = null;
  function activate(name) {
    active = sceneFor(name);
    post.setScene(active.scene);
    // a scene can set itself going as you arrive (the train pulling in)
    if (entered !== active) { entered = active; active.api.enter?.(); }
  }

  // ---- moving between stops
  const tweens = [];
  function tween(from, to, duration, set, done) {
    if (reduced) duration = Math.min(duration, 0.25);
    tweens.push({ from, to, duration, t: 0, set, done });
  }
  const backOff = (shot, d) => {
    const dir = new THREE.Vector3().subVectors(shot.position, shot.target).normalize();
    return { ...shot, position: shot.position.clone().addScaledVector(dir, d) };
  };

  // history: moving from one stop to another adds an entry, so the browser's Back and Forward
  // walk the journey; if the address already shows where we're going (Back, Forward, a link),
  // or we're coming from an object's address, it only replaces
  function remember(id, instant) {
    const here = decodeURIComponent(location.hash.slice(1)) || stops[0].id; // a bare address is the start
    if (!instant && here !== id && stopIndex(here) >= 0) history.pushState(null, "", `#${id}`);
    else history.replaceState(null, "", `#${id}`);
  }

  let queued = null;
  function goTo(i, { instant = false, then = null, queue = true } = {}) {
    i = (i + stops.length) % stops.length;
    const read = stops[i].read;
    // already reading in the same room: just turn to the section
    if (read && selected?.reader && stops[i].scene === stops[current].scene) {
      current = i;
      showStop();
      interaction.setHits([selected.reader.left, selected.reader.right]);
      remember(stops[i].id, false);
      openReader(read);
      return;
    }
    if (mode === "examine") putBack({ focus: false });
    // a request made mid-move is kept and taken once the camera arrives
    if (mode === "moving" && !instant) { if (queue) queued = { i, then }; return; }
    if (mode !== "rest" && !instant) return;
    const from = stops[current];
    const to = stops[i];
    if (read) { const prev = then; then = () => { openReader(read); prev?.(); }; }
    if (i === current && !instant) { then?.(); return; }
    current = i;
    hovered = null;
    caption.hide();
    remember(to.id, instant);

    if (instant) {
      activate(to.scene);
      showStop();
      rig.set(shotFor(active.api, to));
      then?.();
      return;
    }
    mode = "moving";
    document.body.classList.add("moving");
    const arrived = () => {
      mode = "rest";
      document.body.classList.remove("moving");
      then?.();
      if (queued) { const q = queued; queued = null; goTo(q.i, { then: q.then }); }
    };
    if (from.scene === to.scene) {
      showStop();
      rig.go(shotFor(active.api, to), 1.9, arrived);
      return;
    }
    // a different scene: the scene may play its own exit first (the train
    // arriving), then push forward into darkness, light passes, cut, settle
    const g = post.grade.uniforms;
    const out = shotFor(active.api, from);
    const leaving = active.api;
    const cut = () => {
    // a scene that carried the camera out (riding the train) keeps it where it is through the dip
    if (!leaving.keepsCamera) rig.go(backOff(out, -0.06), 0.8);
    tween(1, 0, 0.75, v => (g.exposure.value = v));
    if (!reduced) tween(1.3, 0.45, 0.75, v => (g.sweep.value = v));
    setTimeout(() => {
      leaving.reset?.();
      activate(to.scene);
      showStop();
      const shot = shotFor(active.api, to);
      rig.set(active.api.entryShot && !reduced ? active.api.entryShot(portrait()) : backOff(shot, 0.12));
      rig.go(shot, active.api.entryShot ? 2.4 : 1.4, arrived);
      // a line of subtitle as the new shot begins (not over the menu, which is read, not watched)
      const landed = current;
      if (!to.read && to.subtitle) setTimeout(() => { if (current === landed && !document.body.classList.contains("reading")) subtitle(to.subtitle); }, reduced ? 200 : 700);
      tween(0, 1, 0.9, v => (g.exposure.value = v));
      if (!reduced) tween(0.45, -0.3, 0.8, v => (g.sweep.value = v), () => (g.sweep.value = -1));
    }, reduced ? 250 : 760);
    };
    if (selected) putBack({ focus: false });
    if (leaving.exit && !reduced) leaving.exit(cut, { rig, portrait: portrait() }); // the scene drives its own way out
    else if (leaving.exitShot && !reduced) rig.go(leaving.exitShot(portrait()), 1.5, cut);
    else cut();
  }

  // ---- holding things
  function examine(a, { instant = false } = {}) {
    if (!a) return;
    if (selected && selected !== a) selected.release?.();
    mode = "examine";
    selected = a;
    hovered = null;
    caption.hide();
    const shot = a.examine(portrait());
    a.onExamine?.();
    if (a.reader) {
      document.body.classList.add("reading");
      interaction.setHits([a.reader.left, a.reader.right]);
      if (instant) { rig.set(shot); reader.open(a.reader); return; }
      rig.go(shot, 1.8); // a little slower, so the camera follows the menu up rather than jumping to it
      setTimeout(() => { if (selected === a && mode === "examine") reader.open(a.reader); }, reduced ? 0 : 1150);
      return;
    }
    $("#examine").dataset.side = shot.side || "right";
    document.body.classList.add("examining");
    history.replaceState(null, "", `#${a.id}`);
    if (instant) { rig.set(shot); panel.open(a.panel()); return; }
    rig.go(shot, 1.6);
    setTimeout(() => { if (selected === a && mode === "examine") panel.open(a.panel()); }, reduced ? 0 : 900);
  }

  function putBack({ focus = true } = {}) {
    if (mode !== "examine") return;
    const a = selected;
    a.release?.();
    mode = "rest";
    selected = null;
    panel.close();
    reader.close();
    document.body.classList.remove("examining", "reading");
    interaction.setHits(stopArtifacts().flatMap(x => x.hits || [x.hit]));
    rig.go(shotFor(active.api, stops[current]), 1.4);
    history.replaceState(null, "", `#${stops[current].id}`);
    if (focus) document.querySelector(`#artifact-list a[href="#${CSS.escape(a.id)}"]`)?.focus({ preventScroll: true });
  }

  function leave(a, href) {
    if (!a || mode === "leaving") return;
    mode = "leaving";
    interaction.enabled = false;
    panel.close();
    reader.close();
    rig.go(a.leave(), 1.2);
    setTimeout(() => fade.classList.add("in"), reduced ? 0 : 450);
    setTimeout(() => { location.href = href; }, reduced ? 350 : 1250);
  }

  // ---- input: wheel, swipe and keys step one stop at a time
  let wheelAcc = 0, wheelLock = 0;
  window.addEventListener("wheel", e => {
    if (mode === "examine" && selected?.reader) {
      const now = performance.now();
      if (now < wheelLock) return;
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) > 60) { turnPage(Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = now + 700; }
      return;
    }
    if (mode !== "rest" || e.target.closest(".examine")) return;
    const now = performance.now();
    if (now < wheelLock) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 60) {
      goTo(current + Math.sign(wheelAcc), { queue: false });
      wheelAcc = 0;
      wheelLock = now + 1300;
    }
  }, { passive: true });
  let touchY = null;
  canvas.addEventListener("touchstart", e => { touchY = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener("touchend", e => {
    if (touchY === null || mode !== "rest") return;
    const dy = touchY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 60) goTo(current + Math.sign(dy), { queue: false });
    touchY = null;
  }, { passive: true });
  window.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea")) return;
    if (mode === "examine" && selected?.reader) {
      if (e.key === "Escape") putBack();
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); turnPage(1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); turnPage(-1); }
      return;
    }
    if (mode === "examine") {
      if (e.key === "Escape") putBack();
      if (selected?.drag && e.key === "ArrowLeft") selected.drag(-35);
      if (selected?.drag && e.key === "ArrowRight") selected.drag(35);
      return;
    }
    if (mode !== "rest") return;
    if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && e.target === document.body)) { e.preventDefault(); goTo(current + 1); }
    if (["ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); goTo(current - 1); }
  });
  $("#next").addEventListener("click", e => { e.preventDefault(); goTo(current + 1); });

  // links to #projects, #some-project-id and so on
  function route(hash, instant) {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) return false;
    const si = stopIndex(id);
    if (si >= 0) { goTo(si, { instant }); return true; }
    if (homeStop[id] !== undefined && homeStop[id] >= 0) {
      goTo(homeStop[id], { instant, then: () => examine(findArtifact(id), { instant }) });
      return true;
    }
    return false;
  }
  window.addEventListener("hashchange", () => route(location.hash, false));
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    if (a.closest("#chapters") || a.id === "next") return;
    a.addEventListener("click", e => { e.preventDefault(); route(a.getAttribute("href"), false); });
  });

  // ---- start
  const from = new URLSearchParams(location.search).get("from");
  activate(stops[0].scene);
  showStop();
  rig.set(shotFor(active.api, stops[0]));
  const fromEntry = [...content.projects, ...content.experience].some(x => x.id === from);
  if (from && fromEntry) {
    goTo(homeStop[from], { instant: true });
    openReader(null, from);
    history.replaceState(null, "", `#${stops[current].id}`);
  } else if (from && homeStop[from] !== undefined) {
    goTo(homeStop[from], { instant: true });
    const a = findArtifact(from);
    if (a) { hovered = a; caption.show(a.caption, { hold: 3000 }); setTimeout(() => { if (hovered === a && mode === "rest") hovered = null; }, 3000); }
    history.replaceState(null, "", `#${stops[current].id}`);
  } else {
    route(location.hash, true);
  }

  window.addEventListener("pageshow", e => {
    if (!e.persisted) return;
    fade.classList.remove("in");
    interaction.enabled = true;
    if (mode === "leaving") { mode = "rest"; examine(selected, { instant: true }); }
  });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    post.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (mode === "rest") rig.go(shotFor(active.api, stops[current]), 0.6);
    if (mode === "examine") rig.go(selected.examine(portrait()), 0.6);
  }
  window.addEventListener("resize", resize);
  renderer.setSize(innerWidth, innerHeight, false);
  post.setSize(innerWidth, innerHeight);

  // build the other scenes once the first one is on screen, so moving later doesn't stall
  setTimeout(() => {
    [...new Set(stops.map(s => s.scene))].forEach((name, k) => setTimeout(() => {
      const b = sceneFor(name);
      if (renderer.compileAsync) renderer.compileAsync(b.scene, camera).catch(() => {});
    }, k * 400));
  }, 1200);

  const forward = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let firstFrame = true;

  startLoop(renderer, (t, dt) => {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t = Math.min(1, tw.t + dt / tw.duration);
      const k = tw.t * tw.t * (3 - 2 * tw.t);
      tw.set(tw.from + (tw.to - tw.from) * k);
      if (tw.t === 1) { tweens.splice(i, 1); tw.done?.(); }
    }
    rig.parallax = mode === "examine" ? 0.004 : 0.01;
    rig.update(dt, t);
    // scenes also hear what is under the pointer, so things can answer it physically
    active.api.update(t, dt, selected, mode === "rest" ? hovered : null);

    // focus: slowly pull to whatever is being looked at
    const subject = selected || hovered;
    const point = subject ? subject.focus : active.api.restFocus(stops[current].shot);
    camera.getWorldDirection(forward);
    const want = tmp.subVectors(point, camera.position).dot(forward);
    focusDist += (want - focusDist) * Math.min(1, dt * 2.6);
    // blur strength per meter off focus; scenes measured in meters (the station) want much less
    const dof = active.api.dof || { rest: 0.018, examine: 0.05 };
    const wantAperture = mode === "examine" ? dof.examine : dof.rest;
    aperture += (wantAperture - aperture) * Math.min(1, dt * 2);
    post.setFocus(focusDist, aperture);

    // a little more light falls on what you look at
    const lights = active.api.lights;
    if (lights.attention) {
      const lit = mode === "rest" && hovered ? 1 : mode === "examine" ? 0.6 : 0;
      attention += (lit - attention) * Math.min(1, dt * 2.2);
      lights.attention.intensity = attention * 0.5;
      if (subject) lights.attention.target.position.lerp(subject.focus, Math.min(1, dt * 4));
    }

    post.render(t);
    if (firstFrame) {
      firstFrame = false;
      document.body.classList.add("ready");
      requestAnimationFrame(() => fade.classList.remove("in"));
    }
  }, {
    onSlow: () => {
      console.info("Scene: running slowly, turning off depth of field and lowering resolution.");
      post.bokeh.enabled = false;
      renderer.setPixelRatio(1);
      resize();
    },
  });
}

main();
