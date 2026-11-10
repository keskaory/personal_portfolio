// The outfit: a slightly oversized black hoodie (hood bunched at the back of
// the neck, drawstrings, front pocket, ribbed cuffs and hem), black straight
// pants with a slight break, and chunky black lace-up boots. Low-poly
// shapes; the detail is painted into the textures and darkened into the
// vertices, PS2-style. Torso, sleeves and legs are skinned; the rest rides
// rigidly on a bone.
import * as THREE from "three";
import { loft, upRing, chainRings, ribbon } from "./loft.js";
import { hoodieBody, hoodieSleeve, hoodFabric, trousers, bootUpper, bootSole, rib } from "./clothing-textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// torso weights by height: hips -> spine -> chest -> neck
function torsoBones(y, ix) {
  if (y < 1.0) return [[ix.hips, 1]];
  if (y < 1.16) { const w = smooth(1.0, 1.16, y); return [[ix.hips, 1 - w], [ix.spine, w]]; }
  if (y < 1.33) { const w = smooth(1.16, 1.33, y); return [[ix.spine, 1 - w], [ix.chest, w]]; }
  if (y < 1.47) return [[ix.chest, 1]];
  const w = smooth(1.47, 1.53, y);
  return [[ix.chest, 1 - w], [ix.neck, w]];
}

// materials here read baked shading from vertex colors; a piece without any
// would render black, so give it plain white
function ensureColor(geo) {
  if (!geo.attributes.color) {
    geo.setAttribute("color", new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count * 3).fill(1), 3));
  }
  return geo;
}

export function buildOutfit(config, sk, mats) {
  const { index: ix, world, bones, extra } = sk;
  const c = config.colors;
  const hi = c.clothHighlight || "74,80,92";
  const skinned = [];
  const rigid = [];
  const S = (geo, mat) => { const m = new THREE.SkinnedMesh(ensureColor(geo), mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; skinned.push(m); return m; };
  const R = (geo, mat, bone) => {
    const m = new THREE.Mesh(ensureColor(geo), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.position.sub(world[bone]);
    bones[bone].add(m);
    rigid.push(m);
    return m;
  };
  const cloth = (map, extraOpts = {}) => new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.95, ...extraOpts });

  const mHoodie = cloth(hoodieBody(c.hoodie, hi));
  const mSleeve = cloth(hoodieSleeve(c.hoodie, hi));
  const mHood = cloth(hoodFabric(c.hoodie, hi), { side: THREE.DoubleSide });
  const mRib = new THREE.MeshStandardMaterial({ map: rib(c.hoodieRib || c.hoodie, hi), roughness: 1 });
  const mPants = cloth(trousers(c.pants, hi));
  const mBoot = cloth(bootUpper(c.boots, "120,124,132"), { roughness: 0.55 });
  const mSole = new THREE.MeshStandardMaterial({ map: bootSole(), roughness: 0.85 });
  const mString = new THREE.MeshStandardMaterial({ color: c.drawstring || "#2b2c30", roughness: 0.8 });

  // ---- hoodie body: slightly oversized, dropped shoulders, a pocket bulge in front
  const TZ = -0.012;
    const body = [
    [0.925, 0.178, 0.114, 0.106],
    [0.97, 0.185, 0.118, 0.108],
    [1.05, 0.184, 0.12, 0.108],
    [1.14, 0.182, 0.121, 0.108],
    [1.24, 0.182, 0.122, 0.11],
    [1.32, 0.188, 0.116, 0.108],
    [1.37, 0.182, 0.102, 0.098],
    [1.402, 0.16, 0.087, 0.086],
    [1.428, 0.128, 0.077, 0.076],
    [1.452, 0.085, 0.07, 0.07],
    [1.475, 0.066, 0.062, 0.062],
  ].map(([y, w, df, db]) => upRing(y, TZ, w, df, db, { exp: 2.3, bones: torsoBones(y, ix) }));
  const torsoShade = (ri, t, a, p) => {
    const sideDark = 1 - 0.22 * Math.pow(Math.abs(Math.sin(a)), 4);
    const pit = p[1] > 1.2 && p[1] < 1.37 && Math.abs(Math.sin(a)) > 0.85 ? 0.72 : 1;
    const hem = t < 0.08 ? 0.9 + t * 1.25 : 1;
    return sideDark * pit * hem;
  };
  S(loft(body, { segments: 14, capStart: false, capEnd: false, skinned: true, shade: torsoShade }), mHoodie);

  // ribbed hem band
  const hem = [0.872, 0.895, 0.93].map((y, i) => upRing(y, TZ, 0.172 + i * 0.003, 0.111 + i * 0.002, 0.103 + i * 0.002, { exp: 2.3, bones: torsoBones(y, ix) }));
  S(loft(hem, { segments: 14, skinned: true, capStart: false, capEnd: false }), mRib);

  // ---- sleeves, roomy, with ribbed cuffs
  ["L", "R"].forEach(s => {
    const sx = s === "L" ? 1 : -1;
    const top = V(sx * 0.135, 1.37, -0.022);
    const elbow = world[`forearm.${s}`].clone();
    const wrist = extra.wrist(s).add(V(0, 0.022, 0));
    const joints = [top, world[`upperArm.${s}`].clone().add(V(sx * 0.008, -0.06, 0)), elbow, wrist];
    const rings = chainRings(joints, [ix[`shoulder.${s}`], ix[`upperArm.${s}`], ix[`forearm.${s}`]], t => {
      const w = 0.064 - t * 0.016 + Math.sin(t * Math.PI) * 0.004;
      return { w, df: w * 0.92, db: w * 0.9, exp: 2.1 };
    }, { steps: 12, blend: 0.06 });
    // the inner side of the sleeve, toward the body, sits in shadow
    const shade = (ri, t, a, p) => (Math.abs(p[0]) < Math.abs(rings[ri].center.x) - 0.02 ? 0.72 : 1) * (t > 0.85 ? 0.9 : 1);
    S(loft(rings, { segments: 10, capStart: false, capEnd: false, skinned: true, shade }), mSleeve);
    const cuffRings = chainRings([wrist.clone().add(V(0, 0.028, 0)), wrist.clone().add(V(0, -0.026, 0))], [ix[`forearm.${s}`]], () => ({ w: 0.047, df: 0.044, db: 0.044, exp: 2.1 }), { steps: 2 });
    cuffRings.forEach((r, i) => { r.bones = i === 0 ? [[ix[`forearm.${s}`], 1]] : [[ix[`forearm.${s}`], 0.6], [ix[`hand.${s}`], 0.4]]; });
    S(loft(cuffRings, { segments: 10, skinned: true, capStart: false, capEnd: false }), mRib);
  });

  // ---- hood: rolled around the back of the neck, the bulk lying on the upper back
  const roll = [V(0.034, 1.462, 0.082), V(0.074, 1.49, 0.03), V(0.076, 1.515, -0.05), V(0.0, 1.528, -0.092), V(-0.076, 1.515, -0.05), V(-0.074, 1.49, 0.03), V(-0.034, 1.462, 0.082)];
  R(ribbon(roll, { width: t => 0.034 + Math.sin(t * Math.PI) * 0.016, thickness: () => 0.022, outward: p => V(p.x, 0.25, p.z - TZ).normalize(), segments: 6, steps: 20 }), mHood, "chest");
  const pile = R(new THREE.SphereGeometry(1, 9, 6), mHood, "chest");
  pile.scale.set(0.13, 0.085, 0.055);
  pile.position.add(V(0, 1.43, -0.125));
  pile.rotation.x = 0.45;
  // drawstrings with metal tips
  [1, -1].forEach(s => {
    const a = V(s * 0.03, 1.452, 0.092), b = V(s * 0.036, 1.28, 0.118);
    const len = a.distanceTo(b);
    const str = R(new THREE.CylinderGeometry(0.0032, 0.0032, len, 5), mString, "chest");
    str.position.add(a.clone().lerp(b, 0.5));
    str.lookAt(new THREE.Vector3());
    str.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    const tip = R(new THREE.CylinderGeometry(0.0036, 0.0036, 0.016, 6), mats.silver, "chest");
    tip.position.add(b.clone().add(V(0, -0.006, 0.001)));
  });

  // ---- pants: straight, slightly wide, breaking over the boots
  const seat = [0.8, 0.86, 0.94, 1.03].map((y, i) => upRing(y, -0.005, 0.16 + i * 0.004, 0.098, 0.115 - (i === 0 ? 0.02 : 0), { exp: 2.3, bones: [[ix.hips, 1]] }));
  S(loft(seat, { segments: 14, skinned: true, capEnd: false }), mPants);
  ["L", "R"].forEach(s => {
    const sx = s === "L" ? 1 : -1;
    const waist = V(sx * 0.082, 1.0, -0.004);
    const hip = world[`thigh.${s}`].clone();
    const knee = world[`shin.${s}`].clone();
    const hemPt = extra.ankle(s).add(V(0, -0.045, 0.02));
    const rings = chainRings([waist, hip, knee, hemPt], [ix.hips, ix[`thigh.${s}`], ix[`shin.${s}`]], t => {
      let w = 0.088 - t * 0.014;
      if (t > 0.92) w += (t - 0.92) * 0.1;
      return { w, df: w * 0.96, db: w * 0.98, exp: 2.15, offset: t > 0.9 ? V(0, 0, (t - 0.9) * 0.06) : null };
    }, { steps: 16, blend: 0.07 });
    const shade = (ri, t, a, p) => {
      const inner = Math.abs(p[0]) < Math.abs(rings[ri].center.x) - 0.03 ? 0.74 : 1;
      const backKnee = t > 0.42 && t < 0.56 && p[2] < rings[ri].center.z - 0.04 ? 0.78 : 1;
      return inner * backKnee * (t < 0.1 ? 0.8 : 1);
    };
    S(loft(rings, { segments: 12, skinned: true, capStart: false, capEnd: true, shade }), mPants);
  });

  // ---- boots: chunky lace-up leather on a thick lugged sole
  ["L", "R"].forEach(s => {
    const sx = s === "L" ? 1 : -1;
    const fx = world[`foot.${s}`].x + sx * 0.004;
    const sections = [
      [-0.072, 0.075, 0.036, 0.075, 0.05],
      [-0.05, 0.08, 0.046, 0.08, 0.058],
      [0.0, 0.075, 0.05, 0.072, 0.054],
      [0.05, 0.058, 0.052, 0.05, 0.04],
      [0.1, 0.05, 0.052, 0.034, 0.032],
      [0.15, 0.045, 0.049, 0.026, 0.028],
      [0.186, 0.042, 0.038, 0.018, 0.024],
      [0.202, 0.04, 0.016, 0.009, 0.016],
    ];
    const upper = sections.map(([z, yc, w, top, bot]) => ({ center: V(fx, yc, z), side: V(1, 0, 0), fwd: V(0, 1, 0), w, df: top, db: bot, exp: 2.6 }));
    R(loft(upper, { segments: 12, shade: (ri, t, a, p) => (p[1] < 0.05 ? 0.8 : 1) }), mBoot, `foot.${s}`);
    const sole = sections.map(([z, , w]) => ({ center: V(fx, 0.02, z), side: V(1, 0, 0), fwd: V(0, 1, 0), w: w + 0.008, df: 0.02, db: 0.02, exp: 5 }));
    R(loft(sole, { segments: 12 }), mSole, `foot.${s}`);
  });

  return { skinned, rigid };
}
