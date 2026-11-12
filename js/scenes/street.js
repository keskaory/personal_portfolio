// The street outside the restaurant, seen once, as you arrive (and as you leave). A small
// family place that has been here for decades: no name over the door, just a little lit sign
// in the window, the menu in a frame by the door, tiles and old paint. Across
// wet tarmac from up the road, the shopfront with its warm window and door against the cool
// of the street lamp, rain falling through the light, a car's lights passing behind you.
// Built around the restaurant's real window, so what you see through the glass is the room
// itself. The restaurant's window wall is at x = -1.0, the street out toward -x.
import * as THREE from "three";
import { concrete } from "../objects/station-textures.js";
import { roughnessMap } from "../objects/surface.js";
import { seeded } from "../objects/textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// rain: short streaks falling through a box of air
export function rainLines(count, [x0, x1], [y0, y1], [z0, z1]) {
  const pos = new Float32Array(count * 6), tip = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0), z = z0 + Math.random() * (z1 - z0);
    pos.set([x, y, z, x, y, z], i * 6);
    tip[i * 2 + 1] = 1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("tip", new THREE.BufferAttribute(tip, 1));
  const h = y1 - y0;
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float tip; uniform float time; varying float vTip;
      void main() {
        vec3 p = position;
        float speed = 6.5 + fract(p.x * 13.1 + p.z * 7.3) * 3.0;
        p.y = mod(p.y - time * speed - ${y0.toFixed(2)}, ${h.toFixed(2)}) + ${y0.toFixed(2)};
        p.y += tip * 0.22; p.z -= tip * 0.02;
        vTip = tip;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vTip;
      void main() { gl_FragColor = vec4(vec3(0.7, 0.8, 0.78), 0.12 + vTip * 0.12); }`,
  });
  return new THREE.LineSegments(g, mat);
}

// a soft streak of reflected light lying on wet ground: brightest at the source, breaking up as it runs toward you
function reflectionTex(seed) {
  const [c, ctx] = cv(64, 256);
  const rand = seeded(seed);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.35, "rgba(255,255,255,0.4)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 256);
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 140; i++) { ctx.fillStyle = `rgba(0,0,0,${0.2 + rand() * 0.5})`; ctx.fillRect(rand() * 64, rand() * 256, 4 + rand() * 30, 1 + rand() * 4); }
  ctx.globalCompositeOperation = "destination-in";
  const s = ctx.createLinearGradient(0, 0, 64, 0);
  s.addColorStop(0, "rgba(0,0,0,0)"); s.addColorStop(0.5, "rgba(0,0,0,1)"); s.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = s; ctx.fillRect(0, 0, 64, 256);
  return tex(c);
}

function shutterTex() {
  const [c, ctx] = cv(256, 256);
  ctx.fillStyle = "#4b504c"; ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) { ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.fillRect(0, y, 256, 1); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, y + 3, 256, 2); }
  const rand = seeded(733);
  for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(30,20,10,${rand() * 0.25})`; ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 30, 8 + rand() * 60); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

// a small lightbox hung inside the window: the one word, the way these places say what they serve
function phoSignTex() {
  const [c, ctx] = cv(256, 112);
  const g = ctx.createLinearGradient(0, 0, 0, 112); g.addColorStop(0, "#fff1d2"); g.addColorStop(1, "#f0d9a8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 112);
  ctx.fillStyle = "#b52a1d"; ctx.font = "700 64px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("PHỞ", 128, 60);
  ctx.fillStyle = "rgba(120,80,30,0.12)"; ctx.fillRect(0, 96, 256, 16); // a little sun-faded at the foot
  return tex(c);
}
// the menu in a glazed frame by the door: a page of lines and a few faded food photos
function menuBoardTex() {
  const [c, ctx] = cv(128, 192);
  const rand = seeded(741);
  ctx.fillStyle = "#efe4cb"; ctx.fillRect(0, 0, 128, 192);
  ctx.fillStyle = "#b52a1d"; ctx.fillRect(10, 10, 108, 12);
  const photos = ["#b8743a", "#a8552a", "#c79a4a", "#8a6a3a"];
  photos.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(10 + (i % 2) * 56, 30 + Math.floor(i / 2) * 40, 50, 34); });
  ctx.fillStyle = "rgba(40,30,20,0.55)";
  for (let y = 116; y < 182; y += 8) { ctx.fillRect(10, y, 60 + rand() * 30, 3); ctx.fillRect(104, y, 14, 3); }
  ctx.fillStyle = "rgba(160,120,60,0.18)"; ctx.fillRect(0, 0, 128, 192); // yellowed
  return tex(c);
}
// the front: small tiles to waist height, then painted render, the paint old and stained where
// the rain runs off the awning and down from the sills
function facadeTex(seed) {
  const [c, ctx] = cv(512, 512);
  const rand = seeded(seed);
  const TILE = 0.9 / 4.8 * 512; // waist height on a 4.8 m wall
  ctx.fillStyle = "#6d7a70"; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2200; i++) { ctx.fillStyle = `rgba(${rand() < 0.5 ? "30,36,32" : "190,200,190"},${rand() * 0.06})`; ctx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 10, 2 + rand() * 6); }
  for (let i = 0; i < 40; i++) {
    const x = rand() * 512, w = 2 + rand() * 6, gg = ctx.createLinearGradient(0, 512 - 330 + rand() * 60, 0, 512);
    gg.addColorStop(0, "rgba(30,34,30,0)"); gg.addColorStop(1, `rgba(30,34,30,${0.12 + rand() * 0.2})`);
    ctx.fillStyle = gg; ctx.fillRect(x, 0, w, 512);
  }
  ctx.fillStyle = "#b8b2a2"; ctx.fillRect(0, 512 - TILE, 512, TILE);
  for (let y = 512 - TILE; y < 512; y += 9) for (let x = (y / 9) % 2 * 4; x < 512; x += 9) {
    const v = 150 + rand() * 50; ctx.fillStyle = `rgb(${v},${v - 6},${v - 18})`; ctx.fillRect(x + 1, y + 1, 7, 7);
  }
  ctx.fillStyle = "rgba(40,36,30,0.25)"; ctx.fillRect(0, 512 - TILE - 4, 512, 6); // a dark line where tile meets paint
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(40,30,20,${rand() * 0.15})`; ctx.fillRect(rand() * 512, 512 - TILE + rand() * TILE, 6 + rand() * 30, 2 + rand() * 8); }
  return tex(c);
}

// the door: glass in a dark frame, the warm room behind it
function doorTex() {
  const [c, ctx] = cv(128, 256);
  // the room through the glass: warm at head height, darker low down where the counter is
  const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#5e3f22"); g.addColorStop(0.35, "#8a5a2c"); g.addColorStop(0.7, "#3e2814"); g.addColorStop(1, "#1a110a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = "rgba(255,200,130,0.16)"; ctx.beginPath(); ctx.ellipse(76, 60, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); // a lamp deep inside
  ctx.fillStyle = "rgba(255,238,205,0.2)"; ctx.fillRect(24, 96, 16, 22);       // opening hours, taped on the glass
  // the street reflected: a cool streak across the glass
  const r = ctx.createLinearGradient(0, 0, 128, 256); r.addColorStop(0.3, "rgba(150,210,200,0)"); r.addColorStop(0.45, "rgba(150,210,200,0.16)"); r.addColorStop(0.6, "rgba(150,210,200,0)");
  ctx.fillStyle = r; ctx.fillRect(0, 0, 128, 256);
  // frame, mid rail, push bar
  ctx.fillStyle = "#1b1d1c"; ctx.fillRect(0, 0, 128, 8); ctx.fillRect(0, 248, 128, 8); ctx.fillRect(0, 0, 8, 256); ctx.fillRect(120, 0, 8, 256); ctx.fillRect(0, 150, 128, 10);
  ctx.fillStyle = "#8d918e"; ctx.fillRect(16, 128, 96, 5);
  return tex(c);
}

export function buildStreet(scene, { reducedMotion = false } = {}) {
  const g = new THREE.Group();
  scene.add(g);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
  const wallMap = facadeTex(471);
  const wall = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.8, envMapIntensity: 0.5 });

  // ---- the shopfront: a wall round the window, up past the frame
  const FX = -1.18;
  add(new THREE.BoxGeometry(0.12, 4.8, 5.0), wall, FX, 2.4, -3.45);
  add(new THREE.BoxGeometry(0.12, 4.8, 5.0), wall, FX, 2.4, 3.45);
  // under and over the window: the same wall, its texture cropped to match (tiles below, paint above)
  const crop = (y0, y1) => { const m = wallMap.clone(); m.repeat.set(1, (y1 - y0) / 4.8); m.offset.set(0, y0 / 4.8); m.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: m, roughness: 0.8, envMapIntensity: 0.5 }); };
  add(new THREE.BoxGeometry(0.12, 0.88, 1.9), crop(0, 0.88), FX, 0.44, 0);
  add(new THREE.BoxGeometry(0.12, 2.68, 1.9), crop(2.12, 4.8), FX, 3.46, 0);
  const metal = new THREE.MeshStandardMaterial({ color: "#2a2d2b", metalness: 0.6, roughness: 0.45 });
  add(new THREE.BoxGeometry(0.16, 0.05, 2.0), metal, -1.27, 0.88, 0); // the sill outside
  // the window's aluminium frame from outside, dulled and a little pitted with age
  const alu = new THREE.MeshStandardMaterial({ color: "#8e938c", metalness: 0.55, roughness: 0.55, roughnessMap: roughnessMap(743, { wear: 1 }) });
  add(new THREE.BoxGeometry(0.05, 0.05, 1.92), alu, -1.255, 2.13, 0);
  [-0.96, 0.96].forEach(z => add(new THREE.BoxGeometry(0.05, 1.28, 0.05), alu, -1.255, 1.5, z));
  // inside the window, top corner: the little lit sign, its back plain to the room
  const phoSign = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.19), new THREE.MeshBasicMaterial({ map: phoSignTex(), color: new THREE.Color(1.1, 1.05, 0.98) }));
  phoSign.position.set(-1.078, 1.93, 0.56); phoSign.rotation.y = -Math.PI / 2; // just outside the rain pane, so the room never sees it
  g.add(phoSign);
  add(new THREE.BoxGeometry(0.03, 0.21, 0.46), metal, -1.06, 1.93, 0.56);
  add(new THREE.CylinderGeometry(0.0015, 0.0015, 0.17, 4), metal, -1.06, 2.115, 0.4);
  add(new THREE.CylinderGeometry(0.0015, 0.0015, 0.17, 4), metal, -1.06, 2.115, 0.72);

  // the door, to the right of the window, its glass lit from inside
  add(new THREE.BoxGeometry(0.08, 2.3, 1.06), metal, -1.27, 1.15, 1.75);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.12), new THREE.MeshBasicMaterial({ map: doorTex(), color: new THREE.Color(0.95, 0.92, 0.88) }));
  door.position.set(-1.315, 1.08, 1.75); door.rotation.y = -Math.PI / 2;
  g.add(door);

  // an awning over window and door, its edge lit warm from underneath
  const awningMat = new THREE.MeshStandardMaterial({ color: "#2b4a3f", roughness: 0.85, side: THREE.DoubleSide }); // canvas, faded by years of sun
  const awning = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 3.6), awningMat);
  awning.position.set(-1.6, 2.5, 0.6); awning.rotation.z = 0.34; // sloping down and out from the wall
  g.add(awning);
  add(new THREE.BoxGeometry(0.02, 0.16, 3.6), awningMat, -1.95, 2.25, 0.6); // the valance
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 3.4), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd29a").multiplyScalar(0.9) }));
  strip.position.set(-1.9, 2.16, 0.6); g.add(strip);
  // by the door, the menu in a glazed frame, lit by a small lamp over it
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.54), new THREE.MeshBasicMaterial({ map: menuBoardTex(), color: new THREE.Color(0.9, 0.86, 0.8) }));
  board.position.set(-1.27, 1.45, 2.62); board.rotation.y = -Math.PI / 2;
  g.add(board);
  add(new THREE.BoxGeometry(0.04, 0.6, 0.42), metal, -1.245, 1.45, 2.62);

  // next door, shut for the night: a roller shutter
  const shutter = new THREE.MeshStandardMaterial({ map: shutterTex(), roughness: 0.5, metalness: 0.5, envMapIntensity: 0.6 });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.5), shutter);
  sh.position.set(-1.25, 1.25, -3.3); sh.rotation.y = -Math.PI / 2; g.add(sh);
  add(new THREE.BoxGeometry(0.14, 0.24, 3.5), metal, -1.26, 2.6, -3.3);

  // flats above: one window lit behind a curtain, the others dark
  [[-1.0, 3.95, false], [0.9, 3.95, true], [3.0, 3.95, false], [-3.2, 3.95, false]].forEach(([z, y, on]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ color: on ? new THREE.Color("#c98f52").multiplyScalar(0.75) : new THREE.Color("#0c1312") }));
    m.position.set(-1.245, y, z); m.rotation.y = -Math.PI / 2; g.add(m);
  });

  // ---- the pavement, the kerb, the road: all wet
  const paving = new THREE.MeshStandardMaterial({ map: concrete("#4a4d48", 477), roughness: 0.35, roughnessMap: roughnessMap(479, { wet: 1, repeat: [3, 6] }), envMapIntensity: 1.1 });
  add(new THREE.BoxGeometry(2.4, 0.15, 14), paving, -2.44, -0.045, 0);
  add(new THREE.BoxGeometry(0.16, 0.18, 14), new THREE.MeshStandardMaterial({ color: "#6b6e69", roughness: 0.6 }), -3.7, -0.06, 0);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: "#151817", roughness: 0.18, roughnessMap: roughnessMap(481, { wet: 1, repeat: [4, 4] }), metalness: 0, envMapIntensity: 1.3 }));
  road.rotation.x = -Math.PI / 2; road.position.set(-10.8, -0.15, 0);
  g.add(road);
  // a faded centre line
  for (let z = -6; z < 7; z += 2.4) add(new THREE.BoxGeometry(0.1, 0.002, 1.2), new THREE.MeshStandardMaterial({ color: "#8f8f84", roughness: 0.5 }), -7.4, -0.149, z);

  // reflections of the lights on the wet ground, stretched toward you
  const streak = (colour, strength, x, z, w, len, seed) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({
      map: reflectionTex(seed), color: new THREE.Color(colour).multiplyScalar(strength), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8,
    }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; // the streak runs out from the shop toward the road
    m.position.set(x - len / 2, 0.032, z);
    g.add(m);
    return m;
  };
  streak("#ffc27a", 0.55, -1.3, 0, 1.4, 2.3, 11);         // the window, on the pavement
  streak("#ffb067", 0.45, -1.3, 1.75, 0.8, 2.3, 12);      // the door
  const roadStreak = (colour, strength, z, w, seed) => {
    const m = streak(colour, strength, -3.8, z, w, 5.5, seed);
    m.position.y = -0.148;
    return m;
  };
  roadStreak("#ffc27a", 0.32, 0.1, 1.2, 13);
  roadStreak("#8fd6c6", 0.4, -2.6, 0.7, 14);
  roadStreak("#ff5a44", 0.25, 0.6, 0.9, 15);

  // ---- the street lamp on this side, cool, its light on the shopfront and the rain
  const post = new THREE.MeshStandardMaterial({ color: "#2b302e", metalness: 0.5, roughness: 0.5 });
  add(new THREE.CylinderGeometry(0.06, 0.08, 4.4, 12), post, -3.4, 2.2, -2.6);
  const arm = add(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 10), post, -3.0, 4.32, -2.6);
  arm.rotation.z = Math.PI / 2;
  add(new THREE.BoxGeometry(0.42, 0.1, 0.22), post, -2.55, 4.3, -2.6);
  const bulb = add(new THREE.BoxGeometry(0.36, 0.02, 0.16), new THREE.MeshBasicMaterial({ color: new THREE.Color("#d9fff3").multiplyScalar(1.6) }), -2.55, 4.24, -2.6);
  bulb.receiveShadow = false;
  const lamp = new THREE.SpotLight("#a8e0d2", 26, 12, 0.85, 0.7, 1.5);
  lamp.position.set(-2.55, 4.2, -2.6); lamp.target.position.set(-2.0, 0, -1.2);
  g.add(lamp, lamp.target);
  // the warm spill from the door onto the pavement
  const doorLight = new THREE.PointLight("#ffb46c", 2.2, 2.4, 2);
  doorLight.position.set(-1.7, 1.9, 1.75);
  g.add(doorLight);

  // ---- a car passing behind you: its lights sweep across the street and the shopfront, right to left
  const car = new THREE.SpotLight("#fff0d8", 0, 16, 0.5, 0.8, 1.2);
  car.position.set(-10.5, 0.75, 8); car.target.position.set(-1.2, 1.0, 2);
  g.add(car, car.target);
  let carT = -1;

  const rain = rainLines(1500, [-9.5, -1.5], [-0.2, 5.0], [-6, 7]);
  g.add(rain);

  return {
    group: g,
    // the shot: from up the street on the far kerb, looking back across the road through the window,
    // the lit room inside; the door at the right
    // nearly square on, across the road, the window in the middle of the frame where the
    // carriage window was in the shot before; the door at the right
    shot: portrait => portrait
      ? { position: V(-6.3, 1.4, 0.75), target: V(-1.1, 1.62, 0.35), fov: 54 }
      : { position: V(-6.8, 1.4, 1.05), target: V(-1.1, 1.62, 0.45), fov: 40 },
    passCar() { if (!reducedMotion) carT = 0; },
    update(t, dt) {
      rain.material.uniforms.time.value = reducedMotion ? 0 : t;
      if (carT >= 0) {
        carT += dt;
        const k = Math.min(1, carT / 1.7);
        const z = 8 - k * 16; // right to left across the frame
        car.position.z = z; car.target.position.z = z - 4;
        car.intensity = Math.sin(Math.PI * k) * 60;
        if (k >= 1) { carT = -1; car.intensity = 0; }
      }
    },
  };
}
