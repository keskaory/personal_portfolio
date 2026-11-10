// Who I Am, 11:40 pm. An elevated platform under a canopy after most trains
// have gone: wet tiles, the tactile strip at the edge, fluorescent tubes
// receding, one vending machine glowing, rain falling past the canopy onto
// the tracks, the city blurred beyond. Someone has left a letter and a
// ticket on the bench. The departure board shows only the time.
// Leaving: the train arrives, its lit windows sweep the frame.
//
// Coordinates: meters; the platform runs along x, its top at y = 0, its
// edge at z = 0 with the tracks at +z and the back wall at z = -4.2.
import * as THREE from "three";
import { cityTexture } from "../objects/textures.js";
import { platformTiles, tactileStrip, concrete, gravel, vendingFront, dotBoard, ticketTexture } from "../objects/station-textures.js";
import { createLetter } from "../objects/paper.js";
import { makeHandle, pose } from "../core/handling.js";
import { linkOr } from "../lib/content.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function box(w, h, d, mat, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// soft elongated light pooled on wet tiles under a lamp
function wetGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 128, 0, 32, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

function rain(count = 1800) {
  const pos = new Float32Array(count * 2 * 3);
  const end = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 44, y = Math.random() * 7, z = 0.7 + Math.random() * 9;
    pos.set([x, y, z, x, y, z], i * 6);
    end[i * 2 + 1] = 1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("tip", new THREE.BufferAttribute(end, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float tip;
      uniform float time;
      varying float vTip;
      void main() {
        vec3 p = position;
        float speed = 7.0 + fract(p.x * 13.1) * 3.0;
        p.y = mod(p.y - time * speed, 7.0) - 1.2;
        p.y += tip * 0.26;
        p.x += tip * 0.03;
        vTip = tip;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vTip;
      void main() { gl_FragColor = vec4(vec3(0.62, 0.7, 0.68), 0.16 + vTip * 0.12); }
    `,
  });
  return new THREE.LineSegments(g, mat);
}

function train() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: "#8b9194", metalness: 0.55, roughness: 0.45 });
  const darkMat = new THREE.MeshStandardMaterial({ color: "#1b1d1e", roughness: 0.7 });
  // a band of lit windows with dark frames between them
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1a1a18";
  ctx.fillRect(0, 0, 1024, 64);
  for (let i = 0; i < 8; i++) {
    const x = 20 + i * 126;
    const lg = ctx.createLinearGradient(0, 0, 0, 64);
    lg.addColorStop(0, "#fff3d8");
    lg.addColorStop(1, "#e8d5a8");
    ctx.fillStyle = lg;
    ctx.fillRect(x, 8, i % 3 === 1 ? 50 : 100, 48);
  }
  const windows = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: new THREE.Color(1.6, 1.5, 1.3) });
  for (let k = 0; k < 3; k++) {
    const car = new THREE.Group();
    car.position.x = k * 20.6;
    car.add(box(20, 3.2, 2.9, bodyMat, 0, 1.0, 0));
    car.add(box(20, 0.5, 2.6, darkMat, 0, -0.8, 0));
    const band = new THREE.Mesh(new THREE.PlaneGeometry(19.4, 1.05), windows);
    band.position.set(0, 1.35, -1.46);
    band.rotation.y = Math.PI;
    car.add(band);
    g.add(car);
  }
  // the train's own light on the platform as it passes
  const spill = new THREE.PointLight("#ffe9c4", 0, 9, 1.6);
  spill.position.set(10, 1.5, -1.6);
  g.add(spill);
  g.userData.spill = spill;
  return g;
}

export function buildStation(scene, { site }, { reducedMotion = false } = {}) {
  const { person, links } = site;
  scene.background = new THREE.Color("#050807");
  scene.fog = new THREE.FogExp2("#0a110f", 0.028);

  const tiles = new THREE.MeshStandardMaterial({ map: platformTiles(), roughness: 0.28, metalness: 0.0 });
  const strip = new THREE.MeshStandardMaterial({ map: tactileStrip(), roughness: 0.6 });
  const wall = new THREE.MeshStandardMaterial({ map: concrete("#3e403d", 305), roughness: 0.9 });
  const ceiling = new THREE.MeshStandardMaterial({ color: "#1c1e1d", roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: "#5a5f5d", metalness: 0.6, roughness: 0.4 });
  const paint = new THREE.MeshStandardMaterial({ color: "#d9d7cf", roughness: 0.5 });
  // things painted or lying on the floor: lifted a hair and pulled forward in depth so they don't shimmer against it
  const decal = m => Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });

  // ---- the platform
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 4.2), tiles);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -2.1);
  floor.receiveShadow = true;
  scene.add(floor);
  const tactile = new THREE.Mesh(new THREE.PlaneGeometry(44, 0.32), decal(strip));
  tactile.rotation.x = -Math.PI / 2;
  tactile.position.set(0, 0.004, -0.72);
  scene.add(tactile);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(44, 0.08), decal(paint.clone()));
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.004, -0.24);
  scene.add(line);
  scene.add(box(44, 0.066, 0.2, paint, 0, -0.027, -0.05, { cast: false })); // edge coping, 6 mm proud of the tiles
  scene.add(box(44, 1.1, 0.3, wall, 0, -0.6, 0.0, { cast: false }));       // the platform's face

  // ---- the track bed, rails and sleepers
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(44, 4.4), new THREE.MeshStandardMaterial({ map: gravel(), roughness: 1 }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(0, -1.15, 2.1);
  bed.receiveShadow = true;
  scene.add(bed);
  const rail = new THREE.MeshStandardMaterial({ color: "#9a9c98", metalness: 0.9, roughness: 0.25 });
  [1.25, 2.75].forEach(z => scene.add(box(44, 0.12, 0.07, rail, 0, -1.03, z, { cast: false })));
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.08, 2.4), new THREE.MeshStandardMaterial({ color: "#3a3631", roughness: 0.9 }), 72);
  for (let i = 0; i < 72; i++) {
    const m = new THREE.Matrix4().makeTranslation(-21.5 + i * 0.6, -1.1, 2.0);
    sleepers.setMatrixAt(i, m);
  }
  scene.add(sleepers);

  // ---- the far platform, a low wall, and the city beyond
  const far = new THREE.Mesh(new THREE.PlaneGeometry(44, 3), new THREE.MeshStandardMaterial({ color: "#2b2c29", roughness: 0.5 }));
  far.rotation.x = -Math.PI / 2;
  far.position.set(0, 0, 5.8);
  scene.add(far);
  scene.add(box(44, 1.1, 0.3, wall, 0, -0.6, 4.3, { cast: false }));
  scene.add(box(44, 1.0, 0.18, wall, 0, 0.5, 7.3, { cast: false }));
  const cityMat = new THREE.MeshBasicMaterial({ map: cityTexture(), color: new THREE.Color(1.7, 1.75, 1.7), fog: false });
  const city = new THREE.Mesh(new THREE.PlaneGeometry(90, 34), cityMat);
  city.position.set(0, 9, 34);
  city.rotation.y = Math.PI;
  scene.add(city);

  // ---- canopy, back wall, pillars
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(44, 5.0), ceiling);
  roof.rotation.x = Math.PI / 2;
  roof.position.set(0, 3.25, -1.7);
  scene.add(roof);
  scene.add(box(44, 0.35, 0.12, ceiling, 0, 3.1, 0.75, { cast: false })); // canopy fascia
  for (let x = -20; x <= 20; x += 4.5) scene.add(box(0.14, 0.22, 5, ceiling, x, 3.14, -1.7, { cast: false }));
  scene.add(box(44, 3.3, 0.3, wall, 0, 1.6, -4.35));
  [-13.2, -4.2, 4.8, 13.8].forEach(x => scene.add(box(0.46, 3.25, 0.46, wall, x, 1.62, -2.9)));

  // ---- tube lights receding down the platform; one has a tired flicker
  const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#e4f2ea").multiplyScalar(2.2) });
  const tubeTired = new THREE.MeshBasicMaterial({ color: new THREE.Color("#e4f2ea").multiplyScalar(2.2) });
  const glowTex = wetGlowTexture();
  const tubes = [];
  for (let x = -17.25; x <= 18; x += 4.5) {
    const tired = Math.abs(x - 4.5) < 0.1;
    const t = box(1.2, 0.05, 0.1, tired ? tubeTired : tubeMat, x, 3.08, -1.5, { cast: false, receive: false });
    scene.add(t);
    tubes.push(t);
    // its smear of light on the wet tiles
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, color: "#cfe0d6", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
    glow.rotation.set(-Math.PI / 2, 0, Math.PI / 2 + 0.12);
    glow.position.set(x - 0.3, 0.008, -1.3);
    scene.add(glow);
  }
  const lamps = [-8.25, -3.75, 0.75, 5.25].map(x => {
    const l = new THREE.PointLight("#dfeee6", 7, 9, 1.6);
    l.position.set(x, 2.95, -1.5);
    scene.add(l);
    return l;
  });
  // the tube above the bench casts the shadows
  const key = new THREE.SpotLight("#e6f0ea", 26, 7, 0.95, 0.85, 1.6);
  key.position.set(0.75, 3.0, -1.6);
  key.target.position.set(0.6, 0, -2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight("#22322f", "#0a0b0a", 0.8));
  const cityGlow = new THREE.DirectionalLight("#4c6b66", 0.35);
  cityGlow.position.set(0, 4, 20);
  scene.add(cityGlow);

  // ---- the vending machine: the warmest light on the platform
  const vm = new THREE.Group();
  vm.position.set(4.6, 0, -3.72);
  vm.add(box(0.98, 1.86, 0.74, new THREE.MeshStandardMaterial({ color: "#c9ccc8", roughness: 0.5 }), 0, 0.93, 0));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.7), new THREE.MeshBasicMaterial({ map: vendingFront(), color: new THREE.Color(1.35, 1.3, 1.2) }));
  front.position.set(0, 0.95, 0.372);
  vm.add(front);
  scene.add(vm);
  const vmLight = new THREE.PointLight("#fff0d4", 5, 5, 1.6);
  vmLight.position.set(4.6, 1.2, -2.95);
  scene.add(vmLight);
  const vmGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.6), new THREE.MeshBasicMaterial({ map: glowTex, color: "#ffe6bd", transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
  vmGlow.rotation.set(-Math.PI / 2, 0, 0);
  vmGlow.position.set(4.6, 0.008, -2.4);
  scene.add(vmGlow);

  // ---- the bench, and what's been left on it
  const benchX = 0.6, benchZ = -2.55;
  const wood = new THREE.MeshStandardMaterial({ color: "#5b4632", roughness: 0.7 });
  [0, 1, 2].forEach(i => scene.add(box(1.9, 0.035, 0.11, wood, benchX, 0.45, benchZ - 0.14 + i * 0.13)));
  [0, 1].forEach(i => scene.add(box(1.9, 0.11, 0.035, wood, benchX, 0.68 + i * 0.15, benchZ - 0.24)));
  [-0.8, 0.8].forEach(dx => {
    scene.add(box(0.05, 0.45, 0.4, steel, benchX + dx, 0.225, benchZ));
    scene.add(box(0.05, 0.42, 0.04, steel, benchX + dx, 0.66, benchZ - 0.24));
  });
  const letter = new THREE.Group();
  letter.add(createLetter(person, true));
  scene.add(letter);
  const ticketMat = new THREE.MeshStandardMaterial({ map: ticketTexture(person, !linkOr(links.resume, "")), roughness: 0.85, side: THREE.DoubleSide });
  const ticketMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.055), ticketMat);
  ticketMesh.rotation.x = -Math.PI / 2;
  ticketMesh.castShadow = true;
  const ticket = new THREE.Group();
  ticket.add(ticketMesh);
  scene.add(ticket);

  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const letterHit = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.4), hitMat);
  letter.add(letterHit);
  const ticketHit = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.28), hitMat);
  ticket.add(ticketHit);

  // a closed umbrella leaning on the end of the bench
  const umbrella = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.86, 6), steel);
  shaft.position.y = 0.43;
  const furled = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.62, 8, 1, true), new THREE.MeshStandardMaterial({ color: "#14181a", roughness: 0.5, side: THREE.DoubleSide }));
  furled.position.y = 0.5;
  furled.rotation.x = Math.PI;
  const handleArc = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 12, Math.PI), wood);
  handleArc.position.y = 0.88;
  handleArc.rotation.z = Math.PI;
  [shaft, furled, handleArc].forEach(m => { m.castShadow = true; umbrella.add(m); });
  umbrella.position.set(benchX + 1.02, 0, benchZ + 0.05);
  umbrella.rotation.z = 0.32;
  scene.add(umbrella);

  // ---- the departure board, hanging from the canopy: just the time
  const board = new THREE.Group();
  board.position.set(-0.9, 2.55, -1.4);
  board.rotation.y = -Math.PI / 2 + 0.15;
  board.add(box(1.3, 0.28, 0.1, new THREE.MeshStandardMaterial({ color: "#111312", roughness: 0.6 }), 0, 0, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.22), new THREE.MeshBasicMaterial({ map: dotBoard(" 23:40"), color: new THREE.Color(1.4, 1.4, 1.4) }));
  face.position.z = 0.052;
  board.add(face);
  [-0.5, 0.5].forEach(dx => board.add(box(0.02, 0.5, 0.02, steel, dx, 0.39, 0)));
  scene.add(board);

  // ---- rain past the canopy, and the train for leaving
  const drops = rain();
  scene.add(drops);
  const tr = train();
  tr.position.set(70, -0.2, 2.0);
  tr.visible = false;
  scene.add(tr);

  const attention = new THREE.SpotLight("#ffe7cc", 0, 6, 0.2, 1, 2);
  attention.position.set(-5, 2.6, -0.6);
  scene.add(attention, attention.target);

  // ---- things you can pick up or look at
  const seatY = 0.47;
  const handles = {
    letter: makeHandle(letter, { home: pose(benchX - 0.35, seatY, benchZ + 0.02, 0, 0.35, 0), held: pose(-0.3, 1.32, -1.75, 0.95, -0.95, 0.05), lift: 0.15, duration: 1.2 }),
    ticket: makeHandle(ticket, { home: pose(benchX + 0.3, seatY, benchZ + 0.08, 0, -0.5, 0), held: pose(-0.25, 1.34, -1.5, 1.05, -1.1, 0.0), lift: 0.12, duration: 1.1 }),
  };
  const closeUp = (pos, look, side = "right") => portrait => portrait
    ? { side: "bottom", position: pos.clone().add(V(-0.1, 0.12, 0.05)), target: look.clone().add(V(0, -0.1, 0)), fov: 40 }
    : { side, position: pos, target: look, fov: 32 };
  const resumeHref = linkOr(links.resume, "contents.html#resume");
  const artifacts = [
    {
      id: "station-letter", stop: "rest", hit: letterHit, object: letter, handle: handles.letter,
      caption: "A letter left on the bench",
      examine: closeUp(V(-0.95, 1.42, -1.3), V(-0.25, 1.3, -1.8)),
      leave: () => ({ position: V(-0.55, 1.36, -1.55), target: V(-0.3, 1.32, -1.75), fov: 28 }),
      panel: () => ({
        title: person.name,
        meta: `${person.school}. ${person.graduation}.`,
        body: person.bio[0],
        actions: [{ label: "More about me", href: "contents.html#about", page: true }],
        sample: true,
      }),
    },
    {
      id: "station-ticket", stop: "rest", hit: ticketHit, object: ticket, handle: handles.ticket,
      caption: "A ticket: my resume",
      examine: closeUp(V(-0.75, 1.4, -1.15), V(-0.2, 1.33, -1.5)),
      leave: () => ({ position: V(-0.45, 1.36, -1.3), target: V(-0.25, 1.34, -1.5), fov: 26 }),
      panel: () => ({
        title: "Resume",
        meta: links.resume ? "PDF" : "The PDF isn't linked yet.",
        actions: [{ label: "Open the resume", href: resumeHref, page: !links.resume }],
        sample: !links.resume,
      }),
    },
    {
      id: "station-board", stop: "rest", hit: board.children[0], object: board,
      caption: "The next train",
      examine: portrait => portrait
        ? { side: "bottom", position: V(-4.6, 2.0, -1.0), target: V(-0.9, 2.2, -1.4), fov: 40 }
        : { side: "right", position: V(-2.6, 2.25, -1.25), target: V(-0.55, 2.42, -1.3), fov: 30 },
      leave: () => ({ position: V(-1.6, 2.5, -1.4), target: V(-0.9, 2.55, -1.4), fov: 26 }),
      panel: () => ({
        title: "The next train",
        meta: "Projects and experience",
        body: "The rest of the night: what I've worked on, and where.",
        actions: [{ label: "Take the next train", href: "#projects", internal: true }],
      }),
    },
  ];
  artifacts.forEach(a => { a.focus = new THREE.Vector3(); a.hit.userData.id = a.id; });

  let flicker = 0;
  let leaving = null;
  const restFocusPoint = V(0.6, 0.6, -2.4);
  return {
    artifacts,
    shots: {
      rest: { position: V(-8.2, 1.5, -0.6), target: V(-0.4, 0.95, -2.0), fov: 34 },
      restPortrait: { position: V(-6.6, 1.5, -0.6), target: V(-1.6, 0.85, -2.2), fov: 44 },
    },
    restFocus: () => restFocusPoint,
    dof: { rest: 0.0022, examine: 0.012 },
    lights: { attention },
    // the train arrives; calls back when it fills the frame
    exit(done) {
      if (reducedMotion) { done(); return; }
      tr.visible = true;
      leaving = { t: 0, done };
    },
    reset() { tr.visible = false; tr.position.x = 70; leaving = null; },
    update(t, dt, held) {
      artifacts.forEach(a => {
        if (a.handle) a.handle.update(dt, a === held, reducedMotion);
        a.object.updateMatrixWorld();
        a.focus.setFromMatrixPosition(a.object.matrixWorld);
      });
      drops.material.uniforms.time.value = t;
      // the tired tube stutters now and then
      if (!reducedMotion) {
        flicker -= dt;
        if (flicker < 0) flicker = 3 + Math.random() * 6;
        const off = flicker < 0.25 && Math.sin(t * 60) > 0;
        tubeTired.color.setScalar(off ? 0.35 : 2.2).multiply(new THREE.Color("#e4f2ea"));
        lamps[3].intensity = off ? 1.5 : 7;
      }
      if (leaving) {
        leaving.t += dt;
        const k = Math.min(1, leaving.t / 1.7);
        tr.position.x = 70 - 74 * (1 - Math.pow(1 - k, 3)); // decelerates into the station
        tr.userData.spill.intensity = 6 * Math.min(1, k * 2);
        if (k > 0.55 && leaving.done) { const d = leaving.done; leaving.done = null; d(); }
      }
    },
  };
}
