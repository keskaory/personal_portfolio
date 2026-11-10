// Hands (simplified: fingers grouped, a separate thumb), the phone, rings,
// the bracelet, and the white earphone cord. Hands ride on the hand bones;
// the cord is rebuilt each frame so it follows the pose.
import * as THREE from "three";
import { loft, chainRings } from "./loft.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildHands(config, sk, mats) {
  const { world, bones, extra } = sk;
  const out = {};
  ["L", "R"].forEach(s => {
    const sx = s === "L" ? 1 : -1;
    const wrist = extra.wrist(s);
    const tip = extra.fingertip(s);
    const palmIn = V(-sx, 0, 0); // the palm faces the body when relaxed
    // the hand: wrist, palm, knuckles, the grouped fingers curling slightly forward
    const joints = [wrist, wrist.clone().lerp(tip, 0.45).add(V(0, 0, 0.004)), wrist.clone().lerp(tip, 0.72).add(V(-sx * 0.003, 0, 0.008)), tip.clone().add(V(-sx * 0.008, 0.012, 0.016))];
    const rings = chainRings(joints, [0, 0, 0], t => {
      const w = t < 0.4 ? 0.024 + t * 0.045 : 0.042 - (t - 0.4) * 0.03;
      const d = t < 0.4 ? 0.017 - t * 0.004 : 0.0155 - (t - 0.4) * 0.012;
      return { w, df: d, db: d * 0.9, exp: 2.4 };
    }, { steps: 12, front: palmIn });
    const hand = new THREE.Mesh(loft(rings, { segments: 14 }), mats.skin);
    hand.castShadow = true;
    // thumb on the front side of the hand
    const tb = wrist.clone().add(V(-sx * 0.012, -0.028, 0.02));
    const thumbRings = chainRings([tb, tb.clone().add(V(-sx * 0.006, -0.04, 0.018)), tb.clone().add(V(-sx * 0.01, -0.068, 0.02))], [0, 0], t => ({ w: 0.012 - t * 0.003, df: 0.0105 - t * 0.002, db: 0.0105 - t * 0.002, exp: 2 }), { steps: 6 });
    const thumb = new THREE.Mesh(loft(thumbRings, { segments: 10 }), mats.skin);
    thumb.castShadow = true;
    const g = new THREE.Group();
    g.add(hand, thumb);
    g.position.sub(world[`hand.${s}`]);
    bones[`hand.${s}`].add(g);
    out[s] = g;
  });

  // a ring on the right hand and the chain bracelet on the left wrist
  // a silver ring on the right hand, around the index finger at the front edge
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0098, 0.0024, 6, 16), mats.silver);
  ring.position.set(0.0, -0.118, 0.03);
  ring.rotation.set(Math.PI / 2, 0, 0);
  bones["hand.R"].add(ring);
  const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.0024, 6, 32), mats.silver);
  bracelet.rotation.x = Math.PI / 2;
  bracelet.position.set(0, 0.004, 0);
  bones["hand.L"].add(bracelet);

  // the phone, held in the right hand
  let phone = null;
  if (config.outfit?.phone) {
    phone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.071, 0.146, 0.008), mats.phone);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.138), mats.screen);
    screen.position.z = 0.0042;
    body.castShadow = true;
    phone.add(body, screen);
    phone.position.set(0.012, -0.085, 0.03);
    phone.rotation.set(-0.15, 0.25, 0.2);
    bones["hand.R"].add(phone);
    const jack = new THREE.Object3D();
    jack.position.set(0, -0.073, 0);
    phone.add(jack);
    phone.userData.jack = jack;
  }
  return { hands: out, phone };
}

// A thin tube whose path is recomputed every frame, without reallocating.
export class Cord {
  constructor(mat, { radius = 0.0011, steps = 40, radial = 5 } = {}) {
    this.steps = steps; this.radial = radial; this.radius = radius;
    const count = (steps + 1) * (radial + 1);
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    const idx = [];
    for (let s = 0; s < steps; s++) for (let k = 0; k < radial; k++) {
      const a = s * (radial + 1) + k, b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, 1, 0)], false, "centripetal");
    this._t = new THREE.Vector3(); this._n = new THREE.Vector3(); this._b = new THREE.Vector3(); this._p = new THREE.Vector3();
  }
  update(points) {
    this.curve.points = points;
    const up = V(0, 0, 1);
    for (let s = 0; s <= this.steps; s++) {
      const t = s / this.steps;
      this.curve.getPointAt(t, this._p);
      this.curve.getTangentAt(t, this._t);
      this._n.crossVectors(this._t, up);
      if (this._n.lengthSq() < 1e-6) this._n.set(1, 0, 0);
      this._n.normalize();
      this._b.crossVectors(this._t, this._n).normalize();
      for (let k = 0; k <= this.radial; k++) {
        const a = (k / this.radial) * Math.PI * 2;
        const c = Math.cos(a) * this.radius, sn = Math.sin(a) * this.radius;
        const i = (s * (this.radial + 1) + k) * 3;
        this.pos[i] = this._p.x + this._n.x * c + this._b.x * sn;
        this.pos[i + 1] = this._p.y + this._n.y * c + this._b.y * sn;
        this.pos[i + 2] = this._p.z + this._n.z * c + this._b.z * sn;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }
}
