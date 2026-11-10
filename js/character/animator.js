// Procedural animation: pose blending, breathing, a slow weight shift,
// head and eyes following a target, blinking, a soft smile, and short
// gestures layered on top. Nothing here knows about any particular scene.
import * as THREE from "three";
import { POSES, GESTURES } from "./poses.js";

const AXES = ["x", "y", "z"];
const ease = t => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class Animator {
  constructor(sk, faceRig, group, { reducedMotion = false } = {}) {
    this.sk = sk;
    this.face = faceRig;
    this.group = group;
    this.reduced = reducedMotion;
    this.current = {};   // bone -> {x,y,z} of the blended pose
    this.from = null;
    this.to = null;
    this.blendT = 1;
    this.blendDur = 1;
    this.hips = new THREE.Vector3();
    this.hipsFrom = new THREE.Vector3();
    this.hipsTo = new THREE.Vector3();
    this.poseName = null;

    this.target = null;  // world point to look at, or null
    this.look = { yaw: 0, pitch: 0 };
    this.eye = { x: 0, y: 0 };
    this.lookAmount = 1;

    this.blinkAt = 1.5;
    this.blinkT = -1;
    this.doubleBlink = false;
    this.smileTarget = 0;
    this.smileNow = 0;

    this.gestures = [];
    this.idleGestures = [];
    this.nextIdle = 6;
    this.time = 0;
    this._inv = new THREE.Matrix4();
    this._v = new THREE.Vector3();
  }

  setPose(name, duration = 0.8) {
    const p = POSES[name];
    if (!p) return;
    this.poseName = name;
    this.from = JSON.parse(JSON.stringify(this.current));
    this.to = {};
    Object.keys(this.sk.bones).forEach(b => { this.to[b] = { x: 0, y: 0, z: 0, ...(p[b] || {}) }; });
    this.hipsFrom.copy(this.hips);
    this.hipsTo.set(...(p.hipsOffset || [0, 0, 0]));
    this.blendDur = Math.max(0.0001, duration);
    this.blendT = duration === 0 ? 1 : 0;
    if (duration === 0) this._applyBlend(1);
  }

  setIdleGestures(list) { this.idleGestures = list; this.nextIdle = this.time + 4 + Math.random() * 4; }
  lookAt(point) { this.target = point ? point.clone() : null; }
  smile(v) { this.smileTarget = clamp(v, 0, 1); }
  blink() { this.blinkT = 0; }
  gesture(name) {
    const g = GESTURES[name];
    if (!g || this.reduced) return;
    this.gestures = this.gestures.filter(x => x.name !== name);
    this.gestures.push({ name, g, t: 0 });
  }

  _applyBlend(k) {
    Object.keys(this.sk.bones).forEach(b => {
      const a = (this.from && this.from[b]) || { x: 0, y: 0, z: 0 };
      const c = this.to[b];
      this.current[b] = { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k, z: a.z + (c.z - a.z) * k };
    });
    this.hips.lerpVectors(this.hipsFrom, this.hipsTo, k);
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    const bones = this.sk.bones;

    if (this.blendT < 1) {
      this.blendT = Math.min(1, this.blendT + dt / this.blendDur);
      this._applyBlend(ease(this.blendT));
    }

    // start from the pose
    const rot = {};
    Object.keys(bones).forEach(b => (rot[b] = { ...(this.current[b] || { x: 0, y: 0, z: 0 }) }));

    // gestures
    let lookWeight = 1;
    this.gestures = this.gestures.filter(gs => {
      gs.t += dt;
      const { keys, duration, bones: gb } = gs.g;
      if (gs.t >= duration) return false;
      let w = 0;
      for (let i = 1; i < keys.length; i++) {
        if (gs.t <= keys[i][0]) {
          const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
          w = v0 + (v1 - v0) * ease((gs.t - t0) / (t1 - t0));
          break;
        }
      }
      Object.entries(gb).forEach(([b, r]) => AXES.forEach(ax => { if (r[ax]) rot[b][ax] += r[ax] * w; }));
      lookWeight = Math.min(lookWeight, 1 - (1 - gs.g.lookWeight) * w);
      return true;
    });
    if (!this.reduced && this.idleGestures.length && t > this.nextIdle && !this.gestures.length) {
      this.gesture(this.idleGestures[Math.floor(Math.random() * this.idleGestures.length)]);
      this.nextIdle = t + 8 + Math.random() * 8;
    }

    // breathing and a slow shift of weight
    if (!this.reduced) {
      const breath = Math.sin(t * (Math.PI * 2) / 4.4);
      rot.chest.x += breath * 0.012;
      rot.spine.x += breath * 0.004;
      rot["shoulder.L"].z += breath * 0.008;
      rot["shoulder.R"].z -= breath * 0.008;
      if (this.poseName !== "seated") {
        rot.hips.z += Math.sin(t * 0.37) * 0.008;
        rot.hips.y += Math.sin(t * 0.23 + 1) * 0.01;
        rot.chest.z -= Math.sin(t * 0.37) * 0.006;
      }
    }

    // looking: split between neck and head, eyes lead
    let wantYaw = 0, wantPitch = 0;
    if (this.target && !this.reduced) {
      this.group.updateMatrixWorld();
      this._inv.copy(this.group.matrixWorld).invert();
      const local = this._v.copy(this.target).applyMatrix4(this._inv);
      const headPos = new THREE.Vector3().setFromMatrixPosition(bones.head.matrixWorld).applyMatrix4(this._inv).add(new THREE.Vector3(0, 0.1, 0));
      const d = local.sub(headPos);
      wantYaw = clamp(Math.atan2(d.x, d.z), -0.75, 0.75);
      wantPitch = clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.4, 0.35);
    }
    wantYaw *= lookWeight;
    wantPitch *= lookWeight;
    const k = 1 - Math.exp(-dt * 3.2);
    this.look.yaw += (wantYaw - this.look.yaw) * k;
    this.look.pitch += (wantPitch - this.look.pitch) * k;
    rot.neck.y += this.look.yaw * 0.4;
    rot.head.y += this.look.yaw * 0.6;
    rot.neck.x -= this.look.pitch * 0.35;
    rot.head.x -= this.look.pitch * 0.65;
    // eyes lead the head: they look where the head hasn't turned yet (-1..1)
    const ke = 1 - Math.exp(-dt * 14);
    this.eye.x += (clamp((wantYaw - this.look.yaw) * 3 + wantYaw * 0.6, -1, 1) - this.eye.x) * ke;
    this.eye.y += (clamp((wantPitch - this.look.pitch) * 3 + wantPitch * 0.8, -1, 1) - this.eye.y) * ke;

    // apply to bones
    Object.keys(bones).forEach(b => bones[b].rotation.set(rot[b].x, rot[b].y, rot[b].z));
    bones.hips.position.copy(this.sk.world.hips).add(this.hips);

    // eyes and lids
    if (this.blinkT < 0 && t > this.blinkAt) {
      this.blinkT = 0;
      this.doubleBlink = Math.random() < 0.15;
    }
    let close = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const d = 0.17;
      close = Math.sin(Math.min(1, this.blinkT / d) * Math.PI);
      if (this.blinkT >= d) {
        if (this.doubleBlink) { this.doubleBlink = false; this.blinkT = -0.0; this.blinkT = 0; this.blinkAt = t; }
        else { this.blinkT = -1; this.blinkAt = t + 2.2 + Math.random() * 4.5; }
      }
    }
    // a heavy, slightly brooding upper lid; it drops a little more when looking down
    const lid = 0.26 + Math.max(0, -this.look.pitch) * 0.4;
    this.smileNow += (this.smileTarget - this.smileNow) * (1 - Math.exp(-dt * 5));
    this.face.set(this.eye.x, -this.eye.y, close, lid - this.smileNow * 0.08);
  }
}
