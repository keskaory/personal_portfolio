// Fragment: the window ledge, 1:10 am. Fragrance bottles on a painted sill
// in front of a rainy window. Light comes from a streetlight outside and a
// lamp somewhere behind the viewer.
//
// Coordinates: meters, y up, the sill's top surface at y = 0,
// the camera looks toward -z (toward the window).
import * as THREE from "three";
import { createBottle } from "../objects/bottle.js";
import { urls } from "../lib/content.js";
import { sillTexture, plasterTexture, cityTexture, clothTexture, pagesTexture } from "../objects/textures.js";

const GLASS_Z = -0.15;  // window glass plane
const WALL_Z = -0.02;   // inside face of the wall
const OPEN = { x0: -0.62, x1: 0.62, y0: 0, y1: 1.15 }; // window opening

// ---- window: city plate + rain, in one shader so it can be refracted by the bottles
function windowGlass() {
  const city = cityTexture();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tCity: { value: city },
      time: { value: 0 },
      brightness: { value: 0.9 },
      depth: { value: 0.22 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tCity;
      uniform float time, brightness, depth;
      varying vec2 vUv;
      varying vec3 vWorld;

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }

      // a layer of still droplets: returns the lens offset and a mask
      vec3 drops(vec2 uv, float scale, float size) {
        vec2 g = uv * scale;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        vec2 h = hash2(id);
        vec2 c = (h - 0.5) * 0.7;
        float r = size * (0.35 + 0.65 * h.y);
        vec2 d = (f - c) / r;
        float m = smoothstep(1.0, 0.85, length(d)) * step(0.45, h.x);
        return vec3(d * m, m);
      }

      // a few drops that slide down slowly, leaving nothing behind
      vec3 runners(vec2 uv) {
        float cols = 9.0;
        float col = floor(uv.x * cols);
        vec2 h = hash2(vec2(col, 7.0));
        if (h.x < 0.55) return vec3(0.0);
        float speed = 0.012 + h.y * 0.02;
        float y = fract(uv.y + time * speed + h.x * 3.0);
        vec2 p = vec2(fract(uv.x * cols) - 0.5 - (h.y - 0.5) * 0.5, (y - 0.5) * 6.0);
        vec2 d = p / vec2(0.07, 0.11);
        float m = smoothstep(1.0, 0.8, length(d));
        return vec3(d * m, m);
      }

      void main() {
        // fake depth: the city sits some distance behind the glass
        vec3 view = normalize(cameraPosition - vWorld);
        vec2 par = -view.xy / max(view.z, 0.2) * depth * 0.25;
        vec2 cuv = vUv * 0.86 + 0.07 + par;

        vec3 a = drops(vUv * vec2(1.1, 1.0), 64.0, 0.2);
        vec3 b = drops(vUv * vec2(1.1, 1.0) + 3.1, 120.0, 0.26);
        vec3 r = runners(vUv);
        vec2 lens = a.xy * 0.018 + b.xy * 0.01 + r.xy * 0.02;
        float mask = max(max(a.z, b.z), r.z);

        // drops flip and sharpen the light behind them a little
        vec3 col = texture2D(tCity, cuv - lens).rgb;
        vec3 inDrop = texture2D(tCity, cuv - lens * 3.0).rgb * 1.15;
        col = mix(col, inDrop, mask * 0.55);
        // dark rim at the edge of each drop
        float rim = max(max(smoothstep(0.55, 1.0, length(a.xy)) * a.z, smoothstep(0.55, 1.0, length(b.xy)) * b.z), 0.0);
        col *= 1.0 - rim * 0.18;
        // a little condensation haze toward the bottom of the pane
        col = mix(col, vec3(0.05, 0.07, 0.065), smoothstep(0.25, 0.0, vUv.y) * 0.35);

        gl_FragColor = vec4(col * brightness, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(OPEN.x1 - OPEN.x0, OPEN.y1 - OPEN.y0), mat);
  mesh.position.set(0, (OPEN.y0 + OPEN.y1) / 2, GLASS_Z);
  return mesh;
}

// ---- the wall, window frame, sill
function room() {
  const g = new THREE.Group();
  const plaster = plasterTexture();
  plaster.repeat.set(2, 2);
  const wallMat = new THREE.MeshStandardMaterial({ map: plaster, color: "#8c857a", roughness: 0.95 });
  const frameMat = new THREE.MeshStandardMaterial({ color: "#c9c2b2", roughness: 0.6 });
  const sillMat = new THREE.MeshStandardMaterial({ map: sillTexture(), roughness: 0.48 });

  const box = (w, h, d, x, y, z, mat, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  const T = 0.12; // wall thickness inside the room
  // wall around the opening
  box(2, 2.2, T, OPEN.x0 - 1, 0.6, WALL_Z - T / 2, wallMat);
  box(2, 2.2, T, OPEN.x1 + 1, 0.6, WALL_Z - T / 2, wallMat);
  box(OPEN.x1 - OPEN.x0, 1, T, 0, OPEN.y1 + 0.5, WALL_Z - T / 2, wallMat);
  box(OPEN.x1 - OPEN.x0 + 2, 1, T, 0, -0.5 - 0.035, WALL_Z - T / 2 + 0.002, wallMat);
  // window reveal (the sides of the opening)
  const rd = WALL_Z - GLASS_Z;
  box(0.02, OPEN.y1, rd, OPEN.x0 - 0.01, OPEN.y1 / 2, GLASS_Z + rd / 2, wallMat);
  box(0.02, OPEN.y1, rd, OPEN.x1 + 0.01, OPEN.y1 / 2, GLASS_Z + rd / 2, wallMat);

  // window frame: bottom rail, one upright, one transom
  const fz = GLASS_Z + 0.012;
  box(OPEN.x1 - OPEN.x0, 0.045, 0.035, 0, 0.0225, fz, frameMat);
  box(0.032, OPEN.y1, 0.035, 0.07, OPEN.y1 / 2, fz, frameMat);
  box(OPEN.x1 - OPEN.x0, 0.03, 0.035, 0, 0.34, fz, frameMat);
  // a glazing bead along the bottom of each pane
  box(OPEN.x1 - OPEN.x0, 0.008, 0.01, 0, 0.049, fz + 0.02, frameMat);

  // the sill, projecting into the room
  const sillDepth = 0.25;
  const sill = box(1.5, 0.032, sillDepth, 0, -0.016, GLASS_Z + 0.03 + sillDepth / 2 - 0.03, sillMat);
  sill.castShadow = false;

  return g;
}

// ---- a sheer curtain at the right edge, moving very slightly
function curtain() {
  const w = 0.42, h = 1.3;
  const geo = new THREE.PlaneGeometry(w, h, 24, 30);
  const base = geo.attributes.position.array.slice();
  const mat = new THREE.MeshPhysicalMaterial({
    color: "#efe8da",
    transmission: 0.82,
    roughness: 0.75,
    thickness: 0.001,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0.36, h / 2 + 0.006, -0.035); // hem just clears the sill
  mesh.rotation.y = -0.18;
  mesh.userData.update = (t, reduced) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], y = base[i + 1];
      const fromTop = (h / 2 - y) / h; // 0 at the rod, 1 at the hem
      const folds = Math.sin(x * 46) * 0.012 + Math.sin(x * 19 + 1.2) * 0.008;
      const sway = reduced ? 0 : Math.sin(t * 0.45 + y * 2.2 + x * 3) * 0.006 * fromTop;
      p[i + 2] = folds + sway;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return mesh;
}

// ---- a closed book lying on the sill
function book() {
  const g = new THREE.Group();
  const w = 0.135, d = 0.205, th = 0.026;
  const cover = new THREE.MeshStandardMaterial({ map: clothTexture("#33403b"), roughness: 0.85 });
  const pages = new THREE.MeshStandardMaterial({ map: pagesTexture(), roughness: 0.9 });
  // boards
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.003, d), cover);
  top.position.y = th - 0.0015;
  const bottom = top.clone();
  bottom.position.y = 0.0015;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.004, th, d), cover);
  spine.position.x = -w / 2 + 0.002;
  const block = new THREE.Mesh(new THREE.BoxGeometry(w - 0.008, th - 0.006, d - 0.008), pages);
  block.position.set(0.002, th / 2, 0);
  [top, bottom, spine, block].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
  return g;
}

export function buildLedge(scene, { fragrances }, { reducedMotion = false } = {}) {
  scene.background = new THREE.Color("#050706");
  scene.add(room());
  const glass = windowGlass();
  scene.add(glass);
  const veil = curtain();
  scene.add(veil);

  const b = book();
  b.position.set(0.17, 0, 0.0);
  b.rotation.y = 0.32;
  scene.add(b);

  // ---- light
  // streetlight outside, high and to the right; the window frame casts its shadow
  const street = new THREE.SpotLight("#cfe0d6", 42, 8, 0.32, 0.75, 1.6);
  street.position.set(1.15, 1.9, -2.3);
  street.target.position.set(-0.12, 0.0, 0.0);
  street.castShadow = true;
  street.shadow.mapSize.set(2048, 2048);
  street.shadow.bias = -0.00015;
  street.shadow.normalBias = 0.01;
  street.shadow.radius = 3;
  street.shadow.camera.near = 1;
  street.shadow.camera.far = 6;
  scene.add(street, street.target);

  // a warm lamp in the room, behind and to the right of the viewer
  const lamp = new THREE.PointLight("#ffd2a1", 1.15, 4, 1.8);
  lamp.position.set(0.55, 0.38, 0.85);
  scene.add(lamp);

  // a faint red from somewhere down the street, off to the left
  const red = new THREE.PointLight("#9c2a22", 0.6, 3, 2);
  red.position.set(-1.1, 0.4, -1.4);
  scene.add(red);

  // a soft light that falls a little more on whatever you look at
  const attention = new THREE.SpotLight("#ffd9b0", 0, 2.5, 0.12, 1, 2);
  attention.position.set(0.25, 0.32, 0.9);
  scene.add(attention, attention.target);

  scene.add(new THREE.HemisphereLight("#1c2624", "#0b0a08", 0.35));

  // ---- the bottles, arranged left of center, not in a neat row
  const spots = [
    { x: -0.215, z: 0.005, ry: 0.12 },
    { x: -0.135, z: 0.035, ry: -0.2 },
    { x: -0.07, z: 0.06, ry: 0.35 },
  ];
  const artifacts = fragrances.slice(0, spots.length).map((data, i) => {
    const bottle = createBottle(data, i + 1);
    const s = spots[i];
    bottle.group.position.set(s.x, 0, s.z);
    bottle.group.rotation.y = s.ry;
    scene.add(bottle.group);
    const home = new THREE.Vector3(s.x, 0, s.z);
    const a = {
      id: data.id,
      kind: "fragrance",
      stop: "rest",
      hit: bottle.hit,
      focus: new THREE.Vector3(), // updated every frame
      caption: `${data.name}, ${data.size} ml`,
      page: urls.fragrance(data.id),
      data,
      bottle,
      home,
      restY: s.ry,
      spin: s.ry, // the angle the bottle is turning toward
      panel: () => ({
        title: data.name,
        meta: `${data.size} ml`,
        body: data.short,
        hint: "Drag to turn it.",
        actions: [{ label: "Read about it", href: urls.fragrance(data.id), page: true }],
        sample: data.sample,
      }),
      examine: portrait => examineShot(a, portrait),
      leave: () => {
        const f = a.focus;
        return { position: new THREE.Vector3(f.x, f.y, f.z + bottle.height * 0.75), target: f.clone(), fov: 22 };
      },
      drag: dx => { a.spin += dx * 0.012; },
      // turn back to the label-forward angle nearest to where it is, never unwinding several turns
      release: () => {
        const turns = Math.round((bottle.group.rotation.y - a.restY) / (Math.PI * 2));
        a.spin = a.restY + turns * Math.PI * 2;
      },
    };
    return a;
  });
  const updateFocus = a => a.focus.copy(a.bottle.focus).applyMatrix4(a.bottle.group.matrixWorld);
  scene.updateMatrixWorld();
  artifacts.forEach(updateFocus);

  // close-up of one bottle, framed from its size so the whole bottle is in
  // view, sitting to one side so the note has room
  function examineShot(a, portrait) {
    const h = a.bottle.height;
    const mid = new THREE.Vector3(a.home.x, h * 0.5, a.home.z);
    if (portrait) {
      const d = h * 3.6;
      return { side: "bottom", position: new THREE.Vector3(mid.x + 0.01, mid.y + d * 0.08, mid.z + d), target: new THREE.Vector3(mid.x, mid.y - d * 0.065, mid.z), fov: 27 };
    }
    // the note goes on whichever side has no other bottles
    const side = artifacts.some(o => o !== a && o.home.x < a.home.x) ? "right" : "left";
    const k = side === "right" ? 1 : -1;
    const d = h * 2.75;
    return {
      side,
      position: new THREE.Vector3(mid.x - k * d * 0.05, mid.y + d * 0.06, mid.z + d),
      target: new THREE.Vector3(mid.x + k * d * 0.16, mid.y + d * 0.01, mid.z),
      fov: 26,
    };
  }

  const shots = {
    rest: { position: new THREE.Vector3(-0.055, 0.1, 0.6), target: new THREE.Vector3(-0.1, 0.075, -0.02), fov: 27 },
    restPortrait: { position: new THREE.Vector3(-0.135, 0.2, 0.92), target: new THREE.Vector3(-0.135, 0.135, 0.0), fov: 32 },
  };

  // default focus: the middle bottle
  const fallbackFocus = new THREE.Vector3(-0.13, 0.06, 0.03);

  return {
    artifacts,
    shots,
    restFocus: () => (artifacts[1] ? artifacts[1].focus : fallbackFocus),
    lights: { attention, street },
    update(t, dt) {
      artifacts.forEach(a => {
        const g = a.bottle.group;
        g.rotation.y += (a.spin - g.rotation.y) * Math.min(1, dt * 5);
        g.updateMatrixWorld();
        updateFocus(a);
      });
      glass.material.uniforms.time.value = t;
      veil.userData.update(t, reducedMotion);
      // the red light outside breathes very slowly
      red.intensity = reducedMotion ? 0.5 : 0.45 + Math.sin(t * 0.21) * 0.15;
    },
  };
}
