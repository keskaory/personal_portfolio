// Homepage controller. The sequence of stops comes from content/site.json;
// each stop is a camera shot in one of the scenes below. Scenes are built
// the first time they are needed and share one renderer, camera and grade.
//
// Every scene returns { artifacts, shots, restFocus(shot), lights, update(), portal(portrait) }
// (portal: the window scene changes pass through), and may add enter(), reset(), exitCue()
// and board() (the station: leaving by train)
// and every artifact has { id, stop, hit or hits, focus, caption, panel(),
// page, examine(portrait), leave(), drag?(dx), release?() }.
import * as THREE from "three";
import { webglAvailable, pickQuality, createRenderer, startLoop, pixelRatioFor } from "./core/renderer.js";
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
  $("#title-name").textContent = person.titleName || person.name;
  $("#title-school").textContent = person.intro || `${person.school}. ${person.graduation}.`;
  if (person.line) $("#title-line").textContent = person.line;
  else $("#title-line").remove();
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
  let renderScale = 1; // lowered a step at a time if frames run slow
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
    onInternal: href => {
      const si = stopIndex(decodeURIComponent(href.replace(/^#/, "")));
      // to another scene: the camera goes straight from here to the window, no stop on the way
      if (si >= 0 && stops[si].scene !== stops[current].scene) { putBack({ focus: false, move: false }); route(href, false); return; }
      putBack();
      setTimeout(() => route(href, false), reduced ? 0 : 450);
    },
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
  function activate(name, opts) {
    active = sceneFor(name);
    post.setScene(active.scene);
    // a scene can set itself going as you arrive (the train pulling in), or be found already
    // settled when you come in through its window
    if (entered !== active) { entered = active; active.api.enter?.(opts); }
  }

  // draw a scene once, off screen, from where the camera will be: textures go up to the GPU
  // and shadow maps fill now, rather than on the first frame of the cut
  const warmTarget = new THREE.WebGLRenderTarget(96, 96);
  const warmCam = new THREE.PerspectiveCamera();
  const warmed = new Set();  // scenes already drawn once from their window
  function warm(b, shot) {
    warmed.add(b);
    warmCam.copy(camera);
    warmCam.position.copy(shot.position);
    warmCam.fov = shot.fov;
    warmCam.lookAt(shot.target);
    warmCam.updateProjectionMatrix();
    warmCam.updateMatrixWorld();
    const prev = renderer.getRenderTarget();
    try { renderer.setRenderTarget(warmTarget); renderer.render(b.scene, warmCam); } catch {}
    renderer.setRenderTarget(prev);
  }

  // ---- moving between stops
  const tweens = [];
  function tween(from, to, duration, set, done, tag) {
    if (reduced) duration = Math.min(duration, 0.25);
    tweens.push({ from, to, duration, t: 0, set, done, tag });
  }
  const dropTweens = tag => { for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].tag === tag) tweens.splice(i, 1); };
  // one pace for every camera move, so moving around always feels like the same hand on the camera
  const PACE = {
    stop: 1.8,      // between stops in the same room
    approach: 1.2,  // to a window, before a cut (a little longer for longer walks)
    settle: 1.6,    // from the window into the new room, after a cut
    examine: 1.6,   // to something you've picked up
    read: 1.8,      // up to the menu as it rises off the table
    putBack: 1.6,   // back to where you were standing
    leave: 1.2,     // toward a page, as the screen fades
    carry: 0.25,    // metres a second kept through a cut when both moves run the same way
  };
  let transition = null;     // the move under way, while there is one: { skip() }
  let focusOverride = null;  // during a scene change, focus holds on the glass
  let snapFocus = false;     // set at a cut: focus jumps to the new shot instead of easing

  // history: moving from one stop to another adds an entry, so the browser's Back and Forward
  // walk the journey; if the address already shows where we're going (Back, Forward, a link),
  // or we're coming from an object's address, it only replaces
  function remember(id, instant) {
    const here = decodeURIComponent(location.hash.slice(1)) || stops[0].id; // a bare address is the start
    if (!instant && here !== id && stopIndex(here) >= 0) history.pushState(null, "", `#${id}`);
    else history.replaceState(null, "", `#${id}`);
  }

  let queued = null;
  function goTo(i, { instant = false, then = null } = {}) {
    i = (i + stops.length) % stops.length;
    const read = stops[i].read;
    // already reading in the same room: just turn to the section
    if (read && selected?.reader && stops[i].scene === stops[current].scene && mode === "examine") {
      current = i;
      showStop();
      interaction.setHits([selected.reader.left, selected.reader.right]);
      remember(stops[i].id, false);
      openReader(read);
      return;
    }
    if (mode === "examine") putBack({ focus: false, move: stops[i].scene === stops[current].scene });
    // asked to go somewhere mid-move (the header, the chapter list, Back): finish this one now
    if (mode === "moving" && !instant && transition) { queued = null; transition.skip(); }
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
      transition?.skip();
      activate(to.scene);
      showStop();
      rig.set(shotFor(active.api, to));
      then?.();
      return;
    }
    mode = "moving";
    document.body.classList.add("moving");
    let finished = false;
    // a safety net: whatever happens on the way (a hidden tab, a dropped frame), control comes back
    const watchdog = setTimeout(() => { transition?.skip(); arrived(); }, 16000);
    const arrived = () => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      transition = null;
      focusOverride = null;
      mode = "rest";
      interaction.enabled = true;
      document.body.classList.remove("moving");
      then?.();
      if (queued) { const q = queued; queued = null; goTo(q.i, { then: q.then }); }
    };
    if (from.scene === to.scene) {
      showStop();
      transition = { skip: () => rig.finish() };
      rig.go(shotFor(active.api, to), PACE.stop, arrived);
      return;
    }
    if (selected) putBack({ focus: false, move: false });
    changeScene(to, arrived);
  }

  // ---- changing scenes: a match cut through windows. The camera goes to this scene's window
  // and frames it square on; the cut lands on the next scene's window framed the same way (same
  // lens, the opening filling the same share of the frame); then it settles into the new room.
  // When both moves run the same way (toward the glass, or away from it) the speed carries
  // through the cut; when they turn round, light passing over the glass covers the turn.
  const viewDir = s => new THREE.Vector3().subVectors(s.target, s.position).normalize();

  // ---- held shots. Each step sets up a shot (camera, what happens in it) and holds it for a
  // time or until something happens in it (doors finish opening, a passing lamp at its brightest).
  // The cut between steps is instant: no camera travel, no blur, no fade.
  let seq = null;
  function runShots(steps, done) { seq = { steps, i: -1, t: 0, done }; nextShot(); }
  function nextShot() {
    seq.i++; seq.t = 0;
    const s = seq.steps[seq.i];
    if (!s) { const d = seq.done; seq = null; d(); return; }
    s.start?.(s);
    snapFocus = true; // a new shot starts in focus; nothing racks across a cut
  }
  function tickShots(dt) {
    if (!seq) return;
    seq.t += dt;
    const s = seq.steps[seq.i];
    if (s && (s.until ? s.until(seq.t, s) : seq.t >= s.hold)) nextShot();
  }
  function skipShots() { while (seq) { nextShot(); rig.finish(); } }

  // Moving between places, edited like film rather than flown like a drone. Each place has an
  // establishing shot from outside (the street for the restaurant, the alley under the window for
  // home) or, for the station, the train itself:
  //   leaving the station: the platform held, doors open | they start to close -> cut | seated in
  //     the carriage, the train pulling out, running, braking into the next stop -> cut
  //   leaving elsewhere: the place from outside as you go (a car passes; at home the lamp is off)
  //   arriving at the station: the carriage running in -> cut | the platform, doors opening
  //   arriving elsewhere: the place from outside (a car passes; at home the lamp comes on) -> cut |
  //     inside, the reverse angle on the same window, a small settle
  // Screen direction holds: the city in the carriage window and the car in the street both run
  // right to left.
  function journey(leaving, dest, to, rest, out, into, p, settle) {
    const L = leaving.api, D = dest.api;
    const enter = () => { L.reset?.(); activate(to.scene, { settled: true }); showStop(); };
    // a place's outside lights are on only for its shot from outside
    const outside = (api, on) => { L.exterior?.setLit?.(false); D.exterior?.setLit?.(false); if (on) api.exterior.setLit?.(true); };
    const steps = [];
    if (L.journey) {
      const j = L.journey;
      steps.push({ // the platform: doors open, a beat for the open carriage to register
        start: () => j.ready(),
        until: (t, s) => { if (s.openAt == null && j.doorsOpen) s.openAt = t; return s.openAt != null && t - s.openAt > 0.9; },
      });
      steps.push({ start: () => j.closeDoors(), hold: 0.6 }); // they start to close: cut on that
      steps.push({ start: () => { rig.set(j.carriage(p)); j.ride(rig, D.journey ? "arrive" : "through"); }, hold: j.rideLength });
    } else if (L.exterior) {
      steps.push({ start: () => { outside(L, true); rig.set(L.exterior.shot(p)); L.exterior.cue("leave"); }, hold: 1.8 });
    } else {
      steps.push({ start: () => rig.go(out.shot, PACE.approach), until: () => !rig.moving });
    }
    if (D.journey) {
      const j = D.journey;
      steps.push({ start: () => { outside(null, false); enter(); rig.set(j.carriage(p)); j.ride(rig, "arrive"); }, hold: 2.4 });
      steps.push({ // the platform: stopped, doors opening, held until they're open
        start: () => { j.alight(rig); rig.set(rest); },
        until: t => j.doorsOpen && t > 0.8,
      });
    } else if (D.exterior) {
      steps.push({ start: () => { enter(); outside(D, true); rig.set(D.exterior.shot(p)); D.exterior.cue("arrive"); }, hold: 2.4 });
      steps.push({ // inside: the existing composition, settling the last few centimetres
        start: () => {
          outside(null, false);
          const back = viewDir(rest).multiplyScalar(-0.06);
          rig.set({ ...rest, position: rest.position.clone().add(back) });
          rig.go(rest, 1.4);
          D.exterior.cue("inside");
        },
        until: () => !rig.moving,
      });
    } else {
      steps.push({ start: () => { outside(null, false); enter(); rig.set(into.shot); rig.go(rest, PACE.settle); }, until: () => !rig.moving });
    }
    focusOverride = null;
    transition = { skip: () => skipShots() };
    runShots(steps, settle);
  }

  function changeScene(to, arrived) {
    const leaving = active;
    const dest = sceneFor(to.scene);
    const g = post.grade.uniforms;
    const p = portrait();
    const out = leaving.api.portal?.(p);
    const into = dest.api.portal?.(p);
    const rest = shotFor(dest.api, to);
    const landed = current;
    interaction.enabled = false;
    caption.hide();
    const settle = () => {
      arrived();
      // the subtitle once the camera has come to rest (not over the menu, which is read, not watched)
      if (!to.read && to.subtitle) setTimeout(() => {
        if (current === landed && mode === "rest" && !document.body.classList.contains("reading")) subtitle(to.subtitle);
      }, reduced ? 100 : 350);
    };

    // reduced motion, or a scene without a window: a plain cut through a short dip
    if (reduced || !out || !into) {
      let swapped = false;
      const swap = () => {
        if (swapped) return;
        swapped = true;
        dropTweens("dip");
        leaving.api.reset?.();
        activate(to.scene, { settled: true });
        showStop();
        rig.set(rest);
        tween(g.exposure.value, 1, 0.3, v => (g.exposure.value = v), settle, "dip");
      };
      transition = { skip: () => { swap(); dropTweens("dip"); g.exposure.value = 1; settle(); } };
      tween(1, 0, 0.25, v => (g.exposure.value = v), swap, "dip");
      return;
    }

    if (!warmed.has(dest)) warm(dest, into.shot); // normally done while loading
    let cutDone = false, sweepAt = null;
    const cut = () => {
      if (cutDone) return;
      cutDone = true;
      leaving.api.reset?.();
      rig.sway = 0;
      activate(to.scene, { settled: true });
      showStop();
      rig.set(into.shot);
      focusDist = into.shot.position.distanceTo(into.glass);
      focusOverride = into.glass;
      setTimeout(() => { if (focusOverride === into.glass) focusOverride = null; }, 400); // then focus pulls into the room
      rig.go(rest, PACE.settle, settle, { v0 });
    };
    transition = {
      skip: () => {
        clearTimeout(sweepAt);
        dropTweens("sweep");
        g.sweep.value = -1;
        cut();
        rig.finish();
      },
    };
    let v0 = 0;

    // to or from the station: by train, as a few held shots
    if (leaving.api.journey || dest.api.journey || leaving.api.exterior || dest.api.exterior) { journey(leaving, dest, to, rest, out, into, p, settle); return; }

    const from = rig.shot;
    const d1 = from.position.distanceTo(out.shot.position);
    const d2 = into.shot.position.distanceTo(rest.position);
    const toward = (a, b, s) => Math.sign(new THREE.Vector3().subVectors(b, a).dot(viewDir(s)));
    const same = toward(from.position, out.shot.position, out.shot) === toward(into.shot.position, rest.position, into.shot);
    const carry = same && !dest.api.alight ? PACE.carry : 0; // metres a second through the cut (not into a held shot)
    const T1 = THREE.MathUtils.clamp(PACE.approach + d1 * 0.12, PACE.approach, PACE.approach + 0.4);
    const v1 = d1 > 0.05 ? (carry * T1) / d1 : 0;
    v0 = d2 > 0.05 ? (carry * PACE.settle) / d2 : 0;

    leaving.api.exitCue?.(T1);
    focusOverride = out.glass;

    // light across the glass, its middle passing at the cut: a car's headlights between the
    // restaurant and home, a faint reflection elsewhere. It motivates the cut; it doesn't hide it
    const headlights = out.light === "headlights" && into.light === "headlights";
    g.sweepGain.value = headlights ? 0.34 : 0.14;
    g.sweepWidth.value = headlights ? 3.2 : 4.5;
    const SW = headlights ? 1.1 : 0.9;
    sweepAt = setTimeout(() => tween(1.45, -0.45, SW, v => (g.sweep.value = v), () => (g.sweep.value = -1), "sweep"), Math.max(0, (T1 - SW / 2) * 1000));
    rig.go(out.shot, T1, cut, { v1 });
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
      rig.go(shot, PACE.read); // a little slower, so the camera follows the menu up rather than jumping to it
      setTimeout(() => { if (selected === a && mode === "examine") reader.open(a.reader); }, reduced ? 0 : 1150);
      return;
    }
    $("#examine").dataset.side = shot.side || "right";
    document.body.classList.add("examining");
    history.replaceState(null, "", `#${a.id}`);
    if (instant) { rig.set(shot); panel.open(a.panel()); return; }
    rig.go(shot, PACE.examine);
    setTimeout(() => { if (selected === a && mode === "examine") panel.open(a.panel()); }, reduced ? 0 : 900);
  }

  // move: false leaves the camera where it is (something else is about to move it)
  function putBack({ focus = true, move = true } = {}) {
    if (mode !== "examine") return;
    const a = selected;
    a.release?.();
    mode = "rest";
    selected = null;
    panel.close();
    reader.close();
    document.body.classList.remove("examining", "reading");
    interaction.setHits(stopArtifacts().flatMap(x => x.hits || [x.hit]));
    if (move) rig.go(shotFor(active.api, stops[current]), PACE.putBack);
    history.replaceState(null, "", `#${stops[current].id}`);
    if (focus) document.querySelector(`#artifact-list a[href="#${CSS.escape(a.id)}"]`)?.focus({ preventScroll: true });
  }

  function leave(a, href) {
    if (!a || mode === "leaving") return;
    mode = "leaving";
    interaction.enabled = false;
    panel.close();
    reader.close();
    rig.go(a.leave(), PACE.leave);
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
      goTo(current + Math.sign(wheelAcc));
      wheelAcc = 0;
      wheelLock = now + 1300;
    }
  }, { passive: true });
  let touchY = null;
  canvas.addEventListener("touchstart", e => { touchY = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener("touchend", e => {
    if (touchY === null || mode !== "rest") return;
    const dy = touchY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 60) goTo(current + Math.sign(dy));
    touchY = null;
  }, { passive: true });
  // a click during a scene change skips to its end; that click doesn't also pick something up
  canvas.addEventListener("pointerdown", () => { if (mode === "moving" && transition) { transition.skip(); interaction.down = null; } });
  window.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea")) return;
    if (mode === "moving" && transition && ["Escape", "Enter", " "].includes(e.key)) { e.preventDefault(); transition.skip(); return; }
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
    renderer.setPixelRatio(pixelRatioFor(quality, renderScale));
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
      const stop = stops.find(s => s.scene === name);
      warm(b, shotFor(b.api, stop));
      const w = b.api.portal?.(portrait());
      if (w) warm(b, w.shot);
      // the place from outside, with its outside lights on; and the train under way, its passing
      // lamp lit: drawn once now so switching those lights on later is instant
      if (b.api.exterior) { b.api.exterior.setLit?.(true); warm(b, b.api.exterior.shot(portrait())); b.api.exterior.setLit?.(false); warm(b, shotFor(b.api, stop)); }
      if (b.api.journey?.setPassing) { b.api.journey.setPassing(true); warm(b, b.api.journey.carriage(portrait())); b.api.journey.setPassing(false); }
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
    tickShots(dt);
    rig.parallax = mode === "examine" ? 0.004 : 0.01;
    rig.update(dt, t);
    // scenes also hear what is under the pointer, so things can answer it physically
    active.api.update(t, dt, selected, mode === "rest" ? hovered : null);

    // focus: slowly pull to whatever is being looked at
    const subject = selected || hovered;
    const point = focusOverride || (subject ? subject.focus : active.api.restFocus(stops[current].shot));
    camera.getWorldDirection(forward);
    const want = tmp.subVectors(point, camera.position).dot(forward);
    if (snapFocus) { focusDist = want; snapFocus = false; }
    else focusDist += (want - focusDist) * Math.min(1, dt * 2.6);
    // blur strength per meter off focus; scenes measured in meters (the station) want much less
    const dof = active.api.dof || { rest: 0.018, examine: 0.05 };
    // travelling between places the frame stays sharp: continuity comes from what's in it, not blur
    const wantAperture = mode === "examine" ? dof.examine : mode === "moving" ? 0 : dof.rest;
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
    // running slowly: render fewer pixels, a step at a time, down to about two thirds of the
    // screen's density; past that, drop the depth of field
    onSlow: () => {
      if (renderScale > 0.68) {
        renderScale = Math.max(0.66, renderScale * 0.85);
        console.info(`Scene: running slowly, rendering at ${Math.round(renderScale * 100)}% resolution.`);
      } else if (post.allowDof) {
        post.allowDof = false;
        console.info("Scene: running slowly, turning off depth of field.");
      }
      resize();
    },
  });
}

main();
