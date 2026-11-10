// The head, PS2-style: a deliberately low-poly, angular mesh (jaw corner,
// cheekbone plane, brow ridge, nose planes) carrying a stylized face texture
// baked from the reference photo. Eyes, brows and the mole live in that
// texture, as they did in games of the era; the eyes are redrawn live so
// they can follow the cursor and blink (see face-texture.js).
//
// Built in the head bone's local space: origin at the base of the skull,
// y up, face toward +z. Proportions follow the front photo (eye to mouth
// about 1.35x mouth to chin).
import * as THREE from "three";
import { loft, upRing, chainRings } from "./loft.js";

// [y, centerZ, halfWidth, frontDepth, backDepth, exponent], chin to crown
const SLICES = [
  [-0.002, 0.058, 0.018, 0.012, 0.012, 2.0],
  [0.008, 0.052, 0.031, 0.022, 0.022, 2.2],
  [0.022, 0.04, 0.048, 0.036, 0.036, 2.7],
  [0.036, 0.028, 0.059, 0.052, 0.05, 2.9],
  [0.054, 0.018, 0.064, 0.07, 0.064, 2.6],
  [0.08, 0.01, 0.068, 0.083, 0.08, 2.4],
  [0.1, 0.007, 0.071, 0.088, 0.088, 2.4],
  [0.117, 0.005, 0.072, 0.089, 0.094, 2.3],
  [0.137, 0.002, 0.073, 0.088, 0.098, 2.2],
  [0.165, -0.003, 0.07, 0.08, 0.097, 2.1],
  [0.195, -0.009, 0.06, 0.062, 0.083, 2.0],
  [0.215, -0.012, 0.042, 0.04, 0.058, 2.0],
  [0.228, -0.013, 0.014, 0.012, 0.018, 2.0],
];

// The face texture covers this rectangle of the head, seen from the front.
export const FACE_RECT = { x0: -0.085, x1: 0.085, y0: -0.02, y1: 0.21 };
export const FACE_FEATURES = { eyeY: 0.117, eyeX: 0.031, eyeHalfW: 0.0122, eyeHalfH: 0.0046, mouthY: 0.05, noseY: 0.082 };

const faceUV = (x, y) => [
  (x - FACE_RECT.x0) / (FACE_RECT.x1 - FACE_RECT.x0),
  (y - FACE_RECT.y0) / (FACE_RECT.y1 - FACE_RECT.y0),
];

// small sculpted planes on top of the slices
function sculpt(y) {
  return a => {
    const aa = Math.abs(a);
    let b = 0;
    if (y > 0.09 && y < 0.11) b += 0.003 * Math.max(0, Math.cos((aa - 1.05) * 3));   // cheekbones
    if (y > 0.11 && y < 0.125) b -= 0.002 * Math.max(0, Math.cos((aa - 0.42) * 4)); // eye sockets
    if (y > 0.13 && y < 0.145) b += 0.002 * Math.max(0, Math.cos(aa * 1.6));        // brow ridge
    if (y > 0.04 && y < 0.06) b += 0.0025 * Math.max(0, Math.cos(aa * 5));          // lips
    if (y > 0.03 && y < 0.04) b += 0.002 * Math.max(0, Math.cos((aa - 1.25) * 3));  // jaw corner
    return b;
  };
}

// Give the front-facing triangles the face texture and the rest plain skin.
function splitFaceGroups(geo, frontTest) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, ...faceUV(pos.getX(i), pos.getY(i)));
  const index = geo.index.array;
  const front = [], back = [];
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i], b = index[i + 1], c = index[i + 2];
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
    const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
    const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    (frontTest(cx, cy, cz) ? front : back).push(a, b, c);
  }
  geo.setIndex([...front, ...back]);
  geo.clearGroups();
  geo.addGroup(0, front.length, 0);
  geo.addGroup(front.length, back.length, 1);
  return geo;
}

export function buildHead(config, mats) {
  const head = new THREE.Group();
  head.name = "headGroup";

  const rings = SLICES.map(([y, cz, w, df, db, exp]) => upRing(y, cz, w, df, db, { exp, bump: sculpt(y) }));
  // baked darkening under the jaw and toward the sides of the head
  const shade = (ri, t, a, p) => (p[1] < 0.02 ? 0.82 : 1) * (1 - 0.08 * Math.pow(Math.abs(Math.sin(a)), 3));
  const geo = loft(rings, { segments: 16, shade });
  const sliceZ = y => {
    for (let i = 1; i < SLICES.length; i++) if (y <= SLICES[i][0]) return SLICES[i][1];
    return 0;
  };
  splitFaceGroups(geo, (x, y, z) => z > sliceZ(y) + 0.02 && Math.abs(x) < 0.07 && y < 0.2);
  const skull = new THREE.Mesh(geo, [mats.face, mats.skinHead]);
  skull.castShadow = true;
  head.add(skull);

  // nose: a few planes from the bridge to the tip, textured from the photo too
  const bridge = new THREE.Vector3(0, 0.124, 0.094);
  const tip = new THREE.Vector3(0, 0.081, 0.108);
  const noseRings = chainRings([bridge, tip], [0], t => ({ w: 0.006 + t * 0.008, df: 0.004 + t * 0.006, db: 0.006, exp: 2 }), { steps: 4, front: new THREE.Vector3(0, 0.3, 1) });
  const noseGeo = loft(noseRings, { segments: 6, capStart: false });
  const np = noseGeo.attributes.position, nuv = noseGeo.attributes.uv;
  for (let i = 0; i < np.count; i++) nuv.setXY(i, ...faceUV(np.getX(i), np.getY(i)));
  // the face material reads baked shading from vertex colors: give the nose plain white
  noseGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Array(np.count * 3).fill(1), 3));
  head.add(new THREE.Mesh(noseGeo, mats.face));

  // ears: simple faceted shapes, with the earrings from the photos
  [1, -1].forEach(side => {
    const ear = new THREE.Group();
    ear.position.set(side * 0.073, 0.106, -0.006);
    ear.rotation.set(0, side * 0.35, side * -0.08);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mats.skin);
    outer.scale.set(0.007, 0.029, 0.016);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5), mats.skinShadow);
    inner.scale.set(0.004, 0.016, 0.009);
    inner.position.set(side * 0.004, 0.002, 0.002);
    ear.add(outer, inner);
    const list = config.face?.earrings?.[side > 0 ? "left" : "right"] || [];
    list.forEach((kind, i) => {
      if (kind === "hoop") {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.0055, 0.0011, 6, 16), mats.silver);
        hoop.position.set(side * 0.003, -0.025 + i * 0.0035, 0.004 - i * 0.004);
        hoop.rotation.y = Math.PI / 2;
        ear.add(hoop);
      } else {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 6, 5), mats.silver);
        stud.position.set(side * 0.006, 0.012 - i * 0.006, 0.004);
        ear.add(stud);
      }
    });
    head.add(ear);
  });

  return { head };
}

// half-width of the head at height y, used to mask the face texture
export function headHalfWidth(y) {
  if (y <= SLICES[0][0]) return SLICES[0][2];
  for (let i = 1; i < SLICES.length; i++) {
    const a = SLICES[i - 1], b = SLICES[i];
    if (y <= b[0]) return a[2] + (b[2] - a[2]) * ((y - a[0]) / (b[0] - a[0]));
  }
  return SLICES[SLICES.length - 1][2];
}
