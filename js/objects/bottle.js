// A fragrance bottle built from lathe profiles: a straight-sided glass
// cylinder with a thick base, rounded shoulder, short neck, metal collar
// and a plain cap, with a typed paper label. Units are meters.
import * as THREE from "three";
import { labelTexture } from "./textures.js";

// Rough real-world proportions for the three common sizes.
const SIZES = {
  100: { r: 0.0235, body: 0.112, base: 0.009, neck: 0.0085, capR: 0.0118, capH: 0.034, labelH: 0.052 },
  50:  { r: 0.0190, body: 0.090, base: 0.008, neck: 0.0075, capR: 0.0102, capH: 0.029, labelH: 0.043 },
  15:  { r: 0.0125, body: 0.062, base: 0.006, neck: 0.0058, capR: 0.0074, capH: 0.022, labelH: 0.030 },
};
const WALL = 0.0016;

// points along a rounded corner, from angle a0 to a1 (radians)
function arc(cx, cy, rad, a0, a1, steps = 6) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    pts.push(new THREE.Vector2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
  }
  return pts;
}

function outerProfile(s) {
  const { r, body, neck } = s;
  const bottomR = 0.0018;
  const shoulderR = 0.005;
  return [
    new THREE.Vector2(0, 0),
    ...arc(r - bottomR, bottomR, bottomR, -Math.PI / 2, 0),
    ...arc(r - shoulderR, body - shoulderR, shoulderR, 0, Math.PI / 2, 8),
    new THREE.Vector2(neck + 0.0015, body + 0.0004),
    ...arc(neck + 0.0015, body + 0.0015, 0.0011, -Math.PI / 2, -Math.PI, 4),
    new THREE.Vector2(neck, body + 0.006),
  ];
}

function liquidProfile(s, fill) {
  const ri = s.r - WALL;
  const y0 = s.base;
  const y1 = y0 + fill * (s.body - s.base - 0.006);
  return [
    new THREE.Vector2(0, y0),
    ...arc(ri - 0.0012, y0 + 0.0012, 0.0012, -Math.PI / 2, 0, 4),
    new THREE.Vector2(ri, y1 - 0.0008),
    // the meniscus climbs the glass a little
    new THREE.Vector2(ri - 0.0006, y1),
    new THREE.Vector2(0, y1 - 0.0002),
  ];
}

function capProfile(s) {
  const { capR, capH } = s;
  const e = 0.0012;
  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(capR, 0),
    ...arc(capR - e, capH - e, e, 0, Math.PI / 2, 5),
    new THREE.Vector2(0, capH),
  ];
}

// Materials shared by every bottle (created once).
let shared = null;
function sharedMaterials() {
  if (shared) return shared;
  shared = {
    // The glass shell only adds reflections and highlights on top of what is
    // behind it. Refraction happens in the liquid and the thick base, which
    // is where most of the visible bending is in a real bottle.
    shell: new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      roughness: 0.03,
      metalness: 0,
      ior: 1.5,
      specularIntensity: 1,
      envMapIntensity: 1.6,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    base: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1,
      roughness: 0.04,
      ior: 1.5,
      thickness: 0.02,
      attenuationColor: new THREE.Color("#cfe0d8"),
      attenuationDistance: 0.06,
      envMapIntensity: 1.2,
    }),
    collar: new THREE.MeshStandardMaterial({ color: "#b9b4aa", metalness: 1, roughness: 0.32 }),
    cap: new THREE.MeshStandardMaterial({ color: "#151413", metalness: 0, roughness: 0.52 }),
    labelBack: new THREE.MeshStandardMaterial({ color: "#d9d2c0", roughness: 0.9, side: THREE.BackSide }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
  };
  return shared;
}

export function createBottle(data, seed = 1) {
  const s = SIZES[data.size] || SIZES[50];
  const m = sharedMaterials();
  const group = new THREE.Group();
  group.name = data.id;

  // glass shell
  const shell = new THREE.Mesh(new THREE.LatheGeometry(outerProfile(s), 96), m.shell);
  shell.renderOrder = 2;
  group.add(shell);

  // thick glass base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(s.r - 0.0005, s.r - 0.0008, s.base, 96), m.base);
  base.position.y = s.base / 2;
  base.castShadow = true;
  group.add(base);

  // liquid
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1,
    roughness: 0,
    ior: 1.36,
    thickness: (s.r - WALL) * 2,
    attenuationColor: new THREE.Color(data.tint || "#efe4c8"),
    attenuationDistance: 0.12,
    envMapIntensity: 0.6,
  });
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(liquidProfile(s, data.fill ?? 0.7), 96), liquidMat);
  liquid.castShadow = true;
  group.add(liquid);

  // paper label, wrapped around the front
  const theta = Math.min(1.7, 0.042 / s.r);
  const labelR = s.r + 0.0002;
  const labelGeo = new THREE.CylinderGeometry(labelR, labelR, s.labelH, 64, 1, true, -theta / 2, theta);
  // transparent so the liquid behind it doesn't refract a second copy of the label
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTexture(data.label || [data.name], seed), roughness: 0.86, transparent: true });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.renderOrder = 3;
  const labelY = s.base + (s.body - s.base) * 0.5;
  label.position.y = labelY;
  label.castShadow = true;
  group.add(label);
  const labelBack = new THREE.Mesh(labelGeo, m.labelBack);
  labelBack.position.y = labelY;
  labelBack.scale.setScalar(0.999);
  group.add(labelBack);

  // metal collar where the pump is crimped on
  const collarH = 0.011;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(s.neck + 0.0012, s.neck + 0.0014, collarH, 64), m.collar);
  collar.position.y = s.body + 0.004 + collarH / 2;
  collar.castShadow = true;
  group.add(collar);

  // cap
  const cap = new THREE.Mesh(new THREE.LatheGeometry(capProfile(s), 64), m.cap);
  cap.position.y = s.body + 0.0045;
  cap.castShadow = true;
  group.add(cap);

  const height = s.body + 0.0045 + s.capH;

  // invisible, slightly larger cylinder used for pointer picking
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 1.25, s.r * 1.25, height, 16), m.hit);
  hit.position.y = height / 2;
  hit.userData.id = data.id;
  group.add(hit);

  return {
    group,
    hit,
    height,
    radius: s.r,
    // where the camera looks and focuses on this bottle (local space)
    focus: new THREE.Vector3(0, labelY, 0),
    dispose() {
      group.traverse(o => {
        if (o.geometry) o.geometry.dispose();
      });
      liquidMat.dispose();
      labelMat.map.dispose();
      labelMat.dispose();
    },
  };
}
