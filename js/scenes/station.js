// Who I Am, 11:40 pm, Berkeley on the K line: a personal line through the
// places I've lived. An elevated platform, still running: the last train pulls
// in as you arrive and opens its doors; the board says where it's going and
// what it's doing; a tube stutters; rain falls past the canopy. The line map
// stands on the platform. Leaving: you step to the doors as they close, and cut.
//
// Coordinates: meters; the platform runs along x, its top at y = 0, its
// edge at z = 0 with the tracks at +z and the back wall at z = -4.2.
import * as THREE from "three";
import { platformTiles, tactileStrip, concrete, gravel, vendingFront, ledBoard, ticketTexture, routeMap, stationSign, neonCity } from "../objects/station-textures.js";
import { createTrain } from "../objects/train.js";
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
    const x = (Math.random() - 0.5) * 44, y = Math.random() * 7, z = 3.6 + Math.random() * 6.2; // beyond the train, so none falls inside it
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
      void main() { gl_FragColor = vec4(vec3(0.66, 0.78, 0.74), 0.18 + vTip * 0.14); }
    `,
  });
  return new THREE.LineSegments(g, mat);
}


export function buildStation(scene, { site }, { reducedMotion = false } = {}) {
  const { person, links } = site;
  const route = site.route || { line: "K", stops: [{ name: "Station", here: true }] };
  const here = Math.max(0, route.stops.findIndex(s => s.here));
  const hereName = route.stops[here].name;
  // trains run toward whichever end is further away
  const toEnd = here < route.stops.length / 2 ? route.stops.length - 1 : 0;
  const destination = route.stops[toEnd].name;
  const nextStop = route.stops[here + (toEnd > here ? 1 : -1)]?.name || destination;
  scene.background = new THREE.Color("#06100f");
  scene.fog = new THREE.FogExp2("#0b1917", 0.026);

  const tiles = new THREE.MeshStandardMaterial({ map: platformTiles(), roughness: 0.2, metalness: 0.0 });
  const strip = new THREE.MeshStandardMaterial({ map: tactileStrip(), roughness: 0.6 });
  const wall = new THREE.MeshStandardMaterial({ map: concrete("#46504b", 305), roughness: 0.85 });
  const ceiling = new THREE.MeshStandardMaterial({ color: "#1e2524", roughness: 0.9 });
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

  // grime where the back wall meets the floor, and the damp along the platform edge where rain blows in
  const shade = (w, h, stops) => {
    const c = document.createElement("canvas"); c.width = 8; c.height = 128;
    const x = c.getContext("2d"); const g = x.createLinearGradient(0, 0, 0, 128);
    stops.forEach(([k, a]) => g.addColorStop(k, `rgba(0,0,0,${a})`)); x.fillStyle = g; x.fillRect(0, 0, 8, 128);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
  };
  const grime = shade(44, 0.7, [[0, 0], [1, 0.45]]);
  grime.position.set(0, 0.35, -4.195);
  scene.add(grime);
  const damp = shade(44, 0.9, [[0, 0.22], [1, 0]]);
  damp.rotation.x = -Math.PI / 2;
  damp.position.set(0, 0.006, -0.5);
  scene.add(damp);

  // ---- the track bed, rails and sleepers
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(44, 4.4), new THREE.MeshStandardMaterial({ map: gravel(), roughness: 1 }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(0, -1.15, 2.1);
  bed.receiveShadow = true;
  scene.add(bed);
  const rail = new THREE.MeshStandardMaterial({ color: "#9a9e9a", metalness: 0.7, roughness: 0.42 }); // not mirror-bright: thin bright lines shimmer
  [1.25, 2.75].forEach(z => scene.add(box(44, 0.12, 0.07, rail, 0, -1.03, z, { cast: false })));
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.08, 2.4), new THREE.MeshStandardMaterial({ color: "#3a3631", roughness: 0.9 }), 72);
  for (let i = 0; i < 72; i++) sleepers.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-21.5 + i * 0.6, -1.1, 2.0));
  scene.add(sleepers);

  // ---- the far platform, a low wall, and the city beyond
  const far = new THREE.Mesh(new THREE.PlaneGeometry(44, 3), new THREE.MeshStandardMaterial({ color: "#2b2c29", roughness: 0.35 }));
  far.rotation.x = -Math.PI / 2;
  far.position.set(0, 0, 5.8);
  scene.add(far);
  scene.add(box(44, 1.1, 0.3, wall, 0, -0.6, 4.3, { cast: false }));
  scene.add(box(44, 1.0, 0.18, wall, 0, 0.5, 7.3, { cast: false }));
  const city = new THREE.Mesh(new THREE.PlaneGeometry(90, 30), new THREE.MeshBasicMaterial({ map: neonCity(), color: new THREE.Color(1.5, 1.5, 1.5), fog: false }));
  city.position.set(0, 7, 34);
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
  // a band of green-glazed tile along the back wall, the way old stations were coded
  scene.add(box(44, 0.5, 0.02, new THREE.MeshStandardMaterial({ color: "#2f6b5a", roughness: 0.3 }), 0, 2.35, -4.19, { cast: false }));
  [-13.2, -4.2, 4.8, 13.8].forEach(x => scene.add(box(0.46, 3.25, 0.46, wall, x, 1.62, -2.9)));

  // ---- tube lights receding down the platform, cool green-white; one has a tired flicker
  const tubeColour = new THREE.Color("#d2f5e6");
  const tubeMat = new THREE.MeshBasicMaterial({ color: tubeColour.clone().multiplyScalar(2.4) });
  const tubeTired = new THREE.MeshBasicMaterial({ color: tubeColour.clone().multiplyScalar(2.4) });
  const glowTex = wetGlowTexture();
  for (let x = -17.7; x <= 18; x += 4.5) {
    const tired = Math.abs(x - 4.8) < 0.1;
    scene.add(box(1.2, 0.05, 0.1, tired ? tubeTired : tubeMat, x, 3.08, -1.5, { cast: false, receive: false }));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, color: "#bfe8d8", transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
    glow.rotation.set(-Math.PI / 2, 0, Math.PI / 2 + 0.12);
    glow.position.set(x - 0.3, 0.008, -1.3);
    scene.add(glow);
  }
  const lamps = [-4.2, 4.8].map(x => {
    const l = new THREE.PointLight("#cdf3e2", 10, 11, 1.5);
    l.position.set(x, 2.95, -1.5);
    scene.add(l);
    return l;
  });
  // the tube above the bench casts the shadows
  const key = new THREE.SpotLight("#dff5ea", 26, 7, 0.95, 0.85, 1.6);
  key.position.set(0.3, 3.0, -1.6);
  key.target.position.set(0.3, 0, -3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight("#2a4540", "#0b0d0c", 1.0));
  const cityGlow = new THREE.DirectionalLight("#ff9a6a", 0.35); // the street's sodium and sign light from across the tracks
  cityGlow.position.set(-4, 3, 20);
  scene.add(cityGlow);

  // ---- the vending machine: the warmest light on the platform
  const vm = new THREE.Group();
  vm.position.set(4.6, 0, -3.72);
  vm.add(box(0.98, 1.86, 0.74, new THREE.MeshStandardMaterial({ color: "#b8312a", roughness: 0.45 }), 0, 0.93, 0));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.7), new THREE.MeshBasicMaterial({ map: vendingFront(), color: new THREE.Color(1.45, 1.35, 1.2) }));
  front.position.set(0, 0.95, 0.372);
  vm.add(front);
  scene.add(vm);
  const vmLight = new THREE.PointLight("#ffd29a", 7, 5, 1.5);
  vmLight.position.set(4.6, 1.2, -2.95);
  scene.add(vmLight);
  const vmGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.6), new THREE.MeshBasicMaterial({ map: glowTex, color: "#ffcf96", transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
  vmGlow.rotation.set(-Math.PI / 2, 0, 0);
  vmGlow.position.set(4.6, 0.008, -2.4);
  scene.add(vmGlow);

  // ---- the bench, with the letter and the ticket on it
  const benchX = 0.3, benchZ = -3.55; // under the map, against the wall
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

  // ---- the K line map: a backlit lightbox on the back wall, centred between the pillars over
  // the bench, with the station's name signs paired either side under the tile band
  const AXIS = 0.3; // the bay's centre line: halfway between the pillars at -4.2 and 4.8
  const mapX = AXIS, mapY = 1.5, mapZ = -4.2;
  const mapStand = new THREE.Group();
  mapStand.position.set(mapX, 0, mapZ);
  const frameMat = new THREE.MeshStandardMaterial({ color: "#23282a", metalness: 0.5, roughness: 0.45 });
  mapStand.add(box(1.74, 0.78, 0.07, frameMat, 0, mapY, 0.035, { cast: false }));
  const mapFace = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.64), new THREE.MeshBasicMaterial({ map: routeMap(route), color: new THREE.Color(1.08, 1.08, 1.06) }));
  mapFace.position.set(0, mapY, 0.072);
  mapStand.add(mapFace);
  scene.add(mapStand);
  // its light on the platform below it
  const mapGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: glowTex, color: "#e8e4d6", transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
  mapGlow.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  mapGlow.position.set(mapX, 0.008, -3.85);
  scene.add(mapGlow);
  [-2.6, 2.6, -9, 9].forEach(dx => {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.27), new THREE.MeshBasicMaterial({ map: stationSign(route, hereName), color: new THREE.Color(1.05, 1.05, 1.05) }));
    sign.position.set(AXIS + dx, 1.92, -4.185);
    scene.add(sign);
  });
  const mapCentre = V(mapX, mapY, mapZ + 0.07);
  const mapNormal = V(0, 0, 1);

  // ---- the departure board, hanging from the canopy: the line, where it's going, what it's doing
  const board = new THREE.Group();
  board.position.set(-0.9, 2.5, -1.4);
  board.rotation.y = -Math.PI / 2 + 0.15;
  board.add(box(1.6, 0.44, 0.1, new THREE.MeshStandardMaterial({ color: "#111312", roughness: 0.6 }), 0, 0, 0));
  const say = status => ledBoard({ line: route.line, colour: route.colour, destination, status });
  const boards = { arriving: say("ARRIVING"), open: say("DOORS OPEN"), next: say(`NEXT ${nextStop}`), closing: say("DOORS CLOSING"), blank: say("") };
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.358), new THREE.MeshBasicMaterial({ map: boards.arriving, color: new THREE.Color(1.5, 1.5, 1.5) }));
  face.position.z = 0.052;
  board.add(face);
  [-0.6, 0.6].forEach(dx => board.add(box(0.02, 0.5, 0.02, steel, dx, 0.47, 0)));
  scene.add(board);

  // ---- rain past the canopy, and the last train
  const drops = rain();
  scene.add(drops);
  const FRONT_X = -15; // where the cab stops: past the camera, so the lit cars run away down the platform
  const train = createTrain({ cars: 4 });
  train.group.position.set(FRONT_X, 0, 2.0);
  scene.add(train.group);
  const door = train.doorsX.map(x => x + FRONT_X).sort((a, b) => Math.abs(a - 0.6) - Math.abs(b - 0.6))[0]; // the door across from the bench

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
  const doorShot = portrait => ({ side: portrait ? "bottom" : "left", position: V(door - 2.2, 1.45, -1.9), target: V(door + 0.2, 1.3, 0.55), fov: portrait ? 50 : 36 });
  const artifacts = [
    {
      id: "station-letter", stop: "rest", hit: letterHit, object: letter, handle: handles.letter,
      caption: "Read the letter",
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
      caption: "Open my resume",
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
      id: "station-map", stop: "rest", hit: mapFace, object: mapFace,
      caption: "Read the line map",
      examine: portrait => ({
        side: portrait ? "bottom" : "right",
        position: mapCentre.clone().addScaledVector(mapNormal, portrait ? 2.8 : 3.2).add(V(portrait ? 0 : 0.52, portrait ? -0.25 : 0, 0)),
        target: mapCentre.clone().add(V(portrait ? 0 : 0.52, portrait ? -0.45 : 0, 0)),
        fov: portrait ? 44 : 34,
      }),
      leave: () => ({ position: mapCentre.clone().addScaledVector(mapNormal, 0.9), target: mapCentre.clone(), fov: 30 }),
      panel: () => ({
        title: route.name || `${route.line} Line`,
        meta: route.stops.map(s => s.name).join(" · "),
        body: `The places I've lived, in order. ${hereName} is now.`,
      }),
    },
    {
      id: "station-train", stop: "rest", hits: train.hits, object: train.group,
      caption: "Board the train",
      examine: doorShot,
      leave: () => ({ position: V(door - 3.2, 1.45, -2.2), target: V(door, 1.3, 0.55), fov: 36 }),
      panel: () => ({
        title: `The last ${route.line} train`,
        meta: `Toward ${destination}. Next stop: ${nextStop}.`,
        body: "Projects and experience, over a late bowl of noodles.",
        actions: [{ label: "Board", href: "#restaurant", internal: true }],
      }),
    },
  ];
  artifacts.forEach(a => { a.focus = new THREE.Vector3(); (a.hits || [a.hit]).forEach(h => (h.userData.id = a.id)); });

  // the train comes in when you arrive, then opens its doors
  let arriving = null, ride = null, doorWait = -1, boardT = 0, speed = 0;
  const arrive = () => {
    ride = null; speed = 0;
    train.openDoors(false);
    face.material.map = boards.arriving;
    if (reducedMotion) { train.group.position.x = FRONT_X; arriving = null; doorWait = 0; return; }
    arriving = { t: 0 };
    doorWait = -1;
    train.group.position.x = FRONT_X + 90;
  };
  arrive();

  // hovering answers physically: paper lifts a little, the map's light comes up
  const hover = { letter: 0, ticket: 0, map: 0 };
  const homes = { letter: handles.letter, ticket: handles.ticket };
  const homeY = { letter: seatY, ticket: seatY };

  let flicker = 0;
  const restFocusPoint = V(0.3, 0.8, -3.6);
  return {
    artifacts,
    shots: {
      rest: { position: V(-6.5, 1.55, -1.0), target: V(0.0, 1.15, -1.8), fov: 38 },
      restPortrait: { position: V(-6.4, 1.5, -2.6), target: V(-0.6, 1.0, -0.6), fov: 52 },
    },
    restFocus: () => restFocusPoint,
    dof: { rest: 0.0, examine: 0.012 }, // no background blur at rest: it frayed the platform edge and softened the train
    lights: { attention },
    enter: arrive,
    keepsCamera: true,
    // boarding: a few steps to the open doorway as the doors begin to close, then cut
    exit(done, { rig, portrait }) {
      ride = { t: 0, done, stage: 0 };
      rig.go({ position: V(door - 0.1, 1.55, -0.55), target: V(door + 0.15, 1.4, 2.4), fov: portrait ? 56 : 44 }, 1.1);
    },
    reset() { train.group.position.x = FRONT_X; arriving = null; ride = null; speed = 0; train.openDoors(false); },
    update(t, dt, held, hovered) {
      artifacts.forEach(a => {
        if (a.handle) a.handle.update(dt, a === held, reducedMotion);
        a.object.updateMatrixWorld();
        a.focus.setFromMatrixPosition(a.object.matrixWorld);
      });
      artifacts[3].focus.set(door, 1.3, 0.55);
      // hover: paper lifts a centimetre, the map brightens
      ["letter", "ticket"].forEach(k => {
        const a = artifacts.find(x => x.id === `station-${k}`);
        hover[k] += ((hovered === a ? 1 : 0) - hover[k]) * Math.min(1, dt * 8);
        if (homes[k].progress === 0) a.object.position.y = homeY[k] + hover[k] * 0.012;
      });
      hover.map += ((hovered === artifacts[2] ? 1 : 0) - hover.map) * Math.min(1, dt * 6);
      mapFace.material.color.setScalar(1.12 + hover.map * 0.18);

      drops.material.uniforms.time.value = reducedMotion ? 0 : t; // rain holds still for reduced motion
      if (arriving) {
        arriving.t += dt;
        const k = Math.min(1, arriving.t / 7);
        train.group.position.x = FRONT_X + 90 * Math.pow(1 - k, 3);
        if (k >= 1) { arriving = null; doorWait = 0.6; }
      }
      if (doorWait >= 0) { doorWait -= dt; if (doorWait < 0) { train.openDoors(true); boardT = 0; } }
      if (ride) {
        ride.t += dt;
        if (ride.stage === 0 && ride.t > 0.55) { ride.stage = 1; train.openDoors(false); face.material.map = boards.closing; }
        if (ride.stage === 1 && ride.t > 1.05 && ride.done) { const d = ride.done; ride.done = null; d(); }
      } else if (train.doorsOpen === 1 && !reducedMotion) {
        // waiting with the doors open: the board alternates between the doors and the next stop
        boardT += dt;
        face.material.map = Math.floor(boardT / 4) % 2 ? boards.next : boards.open;
      }
      train.update(t, dt, { speed, reduced: reducedMotion });
      if (!reducedMotion) {
        flicker -= dt;
        if (flicker < 0) flicker = 3 + Math.random() * 6;
        const off = flicker < 0.25 && Math.sin(t * 60) > 0;
        tubeTired.color.copy(tubeColour).multiplyScalar(off ? 0.35 : 2.4);
        lamps[1].intensity = off ? 2 : 10;
      }
    },
  };
}
