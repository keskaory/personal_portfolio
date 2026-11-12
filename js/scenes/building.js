// Home from outside: the block the apartment is in, seen once from the alley below as you get
// back (and as you leave). An older residential building: small mosaic tiles streaked where the
// air conditioners drip, a grid of other people's windows (a few lit, one with a television's
// blue), rain in the street light. The apartment's own window is the real one, so the room is
// what you see through it, and its lamp is what comes on.
// The apartment's back wall, with the window, is at z = -1.9; outside is toward -z.
import * as THREE from "three";
import { seeded } from "../objects/textures.js";
import { roughnessMap } from "../objects/surface.js";
import { rainLines } from "./street.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function mosaicTex(seed) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const rand = seeded(seed);
  ctx.fillStyle = "#6b6a62"; ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 8) for (let x = 0; x < 256; x += 8) {
    const v = 150 + rand() * 40; ctx.fillStyle = `rgb(${v},${v - 4},${v - 14})`; ctx.fillRect(x + 1, y + 1, 6, 6);
  }
  for (let i = 0; i < 18; i++) {
    const x = rand() * 256, gg = ctx.createLinearGradient(0, rand() * 120, 0, 256);
    gg.addColorStop(0, "rgba(40,38,32,0)"); gg.addColorStop(1, `rgba(40,38,32,${0.15 + rand() * 0.25})`);
    ctx.fillStyle = gg; ctx.fillRect(x, 0, 3 + rand() * 8, 256);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

export function buildBuilding(scene, { reducedMotion = false } = {}) {
  const g = new THREE.Group();
  scene.add(g);
  const FZ = -2.06; // the wall's middle; its outside face is at z = -2.12
  const tiles = (w, h) => { const t = mosaicTex(611); const m = t.clone(); m.repeat.set(w / 2.4, h / 2.4); m.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: m, roughness: 0.7, envMapIntensity: 0.6 }); };
  const slab = (x0, x1, y0, y1) => {
    const w = x1 - x0, h = y1 - y0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), tiles(w, h));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, FZ);
    m.receiveShadow = true;
    g.add(m);
  };
  // the wall round the apartment's window opening (x -1.2..0.6, y 0.85..2.15)
  slab(-9, -1.2, -10, 10); slab(0.6, 9, -10, 10); slab(-1.2, 0.6, -10, 0.85); slab(-1.2, 0.6, 2.15, 10);
  const frame = new THREE.MeshStandardMaterial({ color: "#8a8e88", metalness: 0.5, roughness: 0.55 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.BoxGeometry(1.86, 0.05, 0.06), frame, -0.3, 2.15, -2.14);
  add(new THREE.BoxGeometry(1.86, 0.06, 0.12), frame, -0.3, 0.84, -2.17);

  // the neighbours: windows above, below and either side, floors 3 m apart
  const rand = seeded(619);
  const dark = new THREE.MeshBasicMaterial({ color: "#0a1112" });
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color("#b88a5a").multiplyScalar(0.36) });
  const curtain = new THREE.MeshBasicMaterial({ color: new THREE.Color("#d2b48a").multiplyScalar(0.3) });
  const tv = new THREE.MeshBasicMaterial({ color: new THREE.Color("#7fa6c4").multiplyScalar(0.45) });
  const ac = new THREE.MeshStandardMaterial({ color: "#a7a9a2", roughness: 0.6, metalness: 0.2 });
  const grille = new THREE.MeshStandardMaterial({ color: "#3a3d3a", roughness: 0.7 });
  let tvPane = null;
  [-8.15, -5.15, -2.15, 0.85, 3.85, 6.85].forEach(y => [-6.6, -3.9, -0.3, 2.4, 5.1].forEach(x => {
    if (x === -0.3 && y === 0.85) return; // that one is home
    const lit = rand();
    const mat = lit < 0.16 ? warm : lit < 0.26 ? curtain : lit < 0.3 && !tvPane ? tv : dark;
    const w = add(new THREE.PlaneGeometry(1.6, 1.15), mat, x, y + 0.62, -2.125);
    w.rotation.y = Math.PI;
    if (mat === tv) tvPane = w;
    add(new THREE.BoxGeometry(1.7, 0.05, 0.08), frame, x, y + 1.22, -2.15);
    add(new THREE.BoxGeometry(1.7, 0.06, 0.14), frame, x, y + 0.02, -2.18);
    if (rand() < 0.55) { // an air conditioner on a bracket under the window
      add(new THREE.BoxGeometry(0.72, 0.44, 0.42), ac, x + (rand() - 0.5) * 0.6, y - 0.4, -2.35);
      add(new THREE.BoxGeometry(0.6, 0.32, 0.01), grille, x + (rand() - 0.5) * 0.02, y - 0.4, -2.565);
    }
  }));
  // home's window from outside: the lamp's warmth on the wet glass, there when the lamp is on
  const [gc, gx] = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 96; return [c, c.getContext("2d")]; })();
  const gg = gx.createRadialGradient(92, 70, 4, 80, 56, 90);
  gg.addColorStop(0, "rgba(255,190,110,0.9)"); gg.addColorStop(0.5, "rgba(255,170,90,0.45)"); gg.addColorStop(1, "rgba(255,160,80,0.12)");
  gx.fillStyle = gg; gx.fillRect(0, 0, 128, 96);
  const glowTex = new THREE.CanvasTexture(gc); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.3), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(-0.3, 1.5, -2.0); glow.rotation.y = Math.PI;
  g.add(glow);
  // home's own air conditioner, under its window
  add(new THREE.BoxGeometry(0.72, 0.44, 0.42), ac, 0.1, 0.45, -2.35);
  add(new THREE.BoxGeometry(0.6, 0.32, 0.01), grille, 0.1, 0.45, -2.565);
  // a drainpipe down the face
  add(new THREE.CylinderGeometry(0.05, 0.05, 20, 10), new THREE.MeshStandardMaterial({ color: "#4a4f4b", roughness: 0.6 }), 1.25, 0, -2.2);

  // the alley below: wet ground, the street light on its bracket, rain through its light
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), new THREE.MeshStandardMaterial({ color: "#181b1a", roughness: 0.2, roughnessMap: roughnessMap(623, { wet: 1, repeat: [4, 3] }), envMapIntensity: 1.2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -10, -9);
  g.add(ground);
  const lamp = new THREE.SpotLight("#a9dccf", 40, 16, 0.7, 0.8, 1.4);
  lamp.position.set(3.2, -5.5, -4.2); lamp.target.position.set(-0.5, -9, -3);
  lamp.visible = false; // on only for the shot from the alley
  g.add(lamp, lamp.target);
  add(new THREE.BoxGeometry(0.4, 0.1, 0.2), grille, 3.2, -5.4, -4.2);
  add(new THREE.BoxGeometry(0.34, 0.02, 0.14), new THREE.MeshBasicMaterial({ color: new THREE.Color("#d8fff1").multiplyScalar(1.5) }), 3.2, -5.46, -4.2);
  add(new THREE.BoxGeometry(0.06, 0.06, 2.0), grille, 3.2, -5.4, -3.2);
  const rain = rainLines(1400, [-4, 5], [-10, 4], [-12, -2.6]);
  g.add(rain);

  g.visible = false;
  return {
    group: g,
    // from the alley, looking up at the window: home in the middle of the frame
    shot: portrait => portrait
      ? { position: V(0.9, -6.4, -10.2), target: V(-0.3, 1.2, -2.0), fov: 54 }
      : { position: V(1.4, -6.6, -10.8), target: V(-0.3, 1.0, -2.0), fov: 40 },
    // how much of the lamp shows on the glass, 0..1
    // the whole outside exists only for its shot: from inside it's all behind the walls, and drawing
    // it anyway costs more than the room itself
    setLit(on) { g.visible = on; lamp.visible = on; },
    glow(k) { glow.material.opacity = 0.55 * k; },
    update(t) {
      rain.material.uniforms.time.value = reducedMotion ? 0 : t;
      if (tvPane && !reducedMotion) tvPane.material.color.setRGB(0.32, 0.45, 0.56).multiplyScalar(0.8 + Math.sin(t * 7) * 0.08 + Math.sin(t * 2.3) * 0.12);
    },
  };
}
