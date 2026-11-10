// Geometry helpers for the character.
//
// loft(): builds a closed tube through a list of rings. Each ring has a
// center, an orientation (tangent + "front" direction) and a cross-section
// shape. Optionally each ring is weighted to one or two bones, so the tube
// bends smoothly at joints when used as a SkinnedMesh.
//
// The cross-section is a superellipse with separate half-depths in front and
// behind, which covers torsos, sleeves, trouser legs, heads and shoes.
import * as THREE from "three";

// point on a cross-section at angle a (0 = front, increasing toward +side)
function sectionPoint(s, a) {
  const c = Math.cos(a), sn = Math.sin(a);
  const e = s.exp ?? 2.2;
  const sx = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e);
  const sz = Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
  const depth = c >= 0 ? s.df : s.db;
  // optional per-angle bulge, e.g. a nose ridge or a dropped shoulder
  const bump = s.bump ? s.bump(a) : 0;
  return { x: sx * (s.w + bump * Math.abs(sn)), z: sz * (depth + bump * Math.abs(c)) };
}

/**
 * rings: [{ center: Vector3, side: Vector3 (unit, the section's +x),
 *           fwd: Vector3 (unit, the section's +z, "front"),
 *           w (half-width), df / db (half-depth in front / behind), exp?, bump?(a),
 *           bones?: [[index, weight], ...] }]
 * opts: { segments, capStart, capEnd, uScale }
 */
export function loft(rings, { segments = 20, capStart = true, capEnd = true, skinned = false, shade = null } = {}) {
  // shade(ringIndex, t, angle, point) -> 0..1: baked darkening stored as vertex color
  const pos = [], uv = [], idx = [], si = [], sw = [], col = [];
  const n = segments;
  const pushSkin = bones => {
    const b = bones || [[0, 1]];
    si.push(b[0][0], (b[1] || [0])[0], 0, 0);
    sw.push(b[0][1], (b[1] || [0, 0])[1], 0, 0);
  };

  rings.forEach((r, ri) => {
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2 - Math.PI; // seam at the back
      const p = sectionPoint(r, a);
      pos.push(
        r.center.x + r.side.x * p.x + r.fwd.x * p.z,
        r.center.y + r.side.y * p.x + r.fwd.y * p.z,
        r.center.z + r.side.z * p.x + r.fwd.z * p.z,
      );
      uv.push(k / n, ri / (rings.length - 1));
      if (skinned) pushSkin(r.bones);
      if (shade) {
        const v = shade(ri, ri / (rings.length - 1), a, pos.slice(-3));
        col.push(v, v, v);
      }
    }
  });
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let k = 0; k < n; k++) {
      const a = ri * (n + 1) + k, b = a + n + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const cap = (ri, flip) => {
    const r = rings[ri];
    const c = pos.length / 3;
    pos.push(r.center.x, r.center.y, r.center.z);
    uv.push(0.5, ri === 0 ? 0 : 1);
    if (skinned) pushSkin(r.bones);
    if (shade) col.push(...col.slice(ri * (n + 1) * 3, ri * (n + 1) * 3 + 3));
    for (let k = 0; k < n; k++) {
      const a = ri * (n + 1) + k;
      if (flip) idx.push(c, a + 1, a); else idx.push(c, a, a + 1);
    }
  };
  if (capStart) cap(0, true);
  if (capEnd) cap(rings.length - 1, false);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  if (skinned) {
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  }
  if (shade) g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Rings along a chain of joint positions (e.g. shoulder, elbow, wrist), with
 * radii given as a function of t along the whole chain (0..1). Each ring is
 * weighted to the bone of its segment, blending into the next bone near joints.
 * profile(t) -> { w, df, db, exp?, offset?: Vector3 }
 */
export function chainRings(joints, boneIndices, profile, { steps = 24, blend = 0.05, front = new THREE.Vector3(0, 0, 1) } = {}) {
  const lengths = [];
  let total = 0;
  for (let i = 0; i < joints.length - 1; i++) {
    const l = joints[i].distanceTo(joints[i + 1]);
    lengths.push(l);
    total += l;
  }
  const rings = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    let d = t * total, seg = 0;
    while (seg < lengths.length - 1 && d > lengths[seg]) { d -= lengths[seg]; seg++; }
    const local = Math.min(1, d / lengths[seg]);
    const a = joints[seg], b = joints[seg + 1];
    const center = new THREE.Vector3().lerpVectors(a, b, local);
    const tangent = new THREE.Vector3().subVectors(b, a).normalize();
    // keep "front" perpendicular to the chain
    const f = front.clone().sub(tangent.clone().multiplyScalar(front.dot(tangent))).normalize();
    // same handedness as upRing, so the winding faces outward
    const side = new THREE.Vector3().crossVectors(tangent, f).normalize();
    const p = profile(t);
    if (p.offset) center.add(p.offset);

    // weights: blend across joints within `blend` meters
    const distToEnd = (1 - local) * lengths[seg];
    const distToStart = local * lengths[seg];
    let bones = [[boneIndices[seg], 1]];
    if (seg < lengths.length - 1 && distToEnd < blend) {
      const w = 0.5 * (1 - distToEnd / blend);
      bones = [[boneIndices[seg], 1 - w], [boneIndices[seg + 1], w]];
    } else if (seg > 0 && distToStart < blend) {
      const w = 0.5 * (1 - distToStart / blend);
      bones = [[boneIndices[seg], 1 - w], [boneIndices[seg - 1], w]];
    }
    rings.push({ center, side, fwd: f, ...p, bones });
  }
  return rings;
}

/**
 * A tapered, flattened tube along a curve: used for hair clumps, straps,
 * cords and scarf ends. `outward(p)` gives the direction the flat side faces.
 * width(t), thickness(t) in meters.
 */
export function ribbon(points, { width, thickness, outward, segments = 6, steps = 16 }) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const pos = [], uv = [], idx = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const p = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    let N = outward(p).clone();
    N.sub(T.clone().multiplyScalar(N.dot(T))).normalize();
    const B = new THREE.Vector3().crossVectors(T, N).normalize();
    const w = width(t), th = thickness(t);
    for (let k = 0; k <= segments; k++) {
      const a = (k / segments) * Math.PI * 2;
      const x = Math.cos(a) * w, y = Math.sin(a) * th;
      pos.push(p.x + B.x * x + N.x * y, p.y + B.y * x + N.y * y, p.z + B.z * x + N.z * y);
      uv.push(k / segments, t);
    }
  }
  for (let s = 0; s < steps; s++) {
    for (let k = 0; k < segments; k++) {
      const a = s * (segments + 1) + k, b = a + segments + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// helper: a vertical ring for things built along the y axis
export const upRing = (y, cz, w, df, db, extra = {}) => ({
  center: new THREE.Vector3(0, y, cz),
  side: new THREE.Vector3(1, 0, 0),
  fwd: new THREE.Vector3(0, 0, 1),
  w, df, db, ...extra,
});
