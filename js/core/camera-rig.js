// Moves the camera between composed shots. A shot is a position, a point
// to look at, and a field of view. Moves are eased and fairly slow; on top
// of the shot there is a very small pointer offset and a slow drift so the
// frame never feels locked off.
import * as THREE from "three";

// One easing curve for every move: a cubic Hermite from 0 to 1 with chosen slopes at the
// ends. With both slopes 0 it is smoothstep (gentler than an in-out cubic, which hits three
// times the average speed mid-move). A slope above 0 lets a move start or end already moving,
// so two moves either side of a cut join at the same speed instead of stopping and starting.
// Slopes are in "whole move per whole duration" units and kept small so it never overshoots.
const hermite = (t, m0, m1) => {
  const t2 = t * t, t3 = t2 * t;
  return (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) + (t3 - t2) * m1;
};

export class CameraRig {
  constructor(camera, { reducedMotion = false } = {}) {
    this.camera = camera;
    this.reduced = reducedMotion;
    this.pos = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.fov = camera.fov;
    this.from = null;
    this.to = null;
    this.t = 1;
    this.duration = 1;
    this.pointer = new THREE.Vector2();
    this.offset = new THREE.Vector2();
    this.parallax = 0.012; // meters at the edge of the screen
    this.onArrive = null;
    this.v0 = 0;
    this.v1 = 0;
    this.curve = null;   // a move through several shots (see path)
    this.sway = 0;       // 0..1: the gentle roll of a moving train
  }

  // a copy of where the camera is headed (or resting)
  get shot() { return { position: this.pos.clone(), target: this.target.clone(), fov: this.fov }; }

  // finish the current move now, at its end
  finish() {
    if (this.t >= 1) return;
    const f = this.onArrive;
    this.set(this.to);
    f?.();
  }

  // jump straight to a shot
  set(shot) {
    this.onArrive = null;
    this.curve = null;
    this.pos.copy(shot.position);
    this.target.copy(shot.target);
    this.fov = shot.fov;
    this.t = 1;
    this.to = shot;
  }

  // move to a shot over `duration` seconds
  // `v0`/`v1`: slopes at the start and end (see hermite above), 0 = from rest / to rest
  go(shot, duration = 1.6, onArrive = null, { v0 = 0, v1 = 0 } = {}) {
    this.curve = null;
    if (this.reduced) duration = 0;
    this.v0 = Math.min(v0, 1.2);
    this.v1 = Math.min(v1, 1.2);
    this.from = { position: this.pos.clone(), target: this.target.clone(), fov: this.fov };
    this.to = shot;
    this.duration = Math.max(duration, 0.0001);
    this.t = duration === 0 ? 1 : 0;
    if (duration === 0) { this.set(shot); onArrive?.(); return; }
    this.onArrive = onArrive;
  }

  // move through several shots in one continuous stroke: the camera and the point it looks at
  // each follow a smooth curve through the given shots, at even speed along the curve, with
  // the same easing as go(). Used for walking up to the train and in through its doors.
  path(shots, duration, onArrive = null, { v0 = 0, v1 = 0 } = {}) {
    const all = [{ position: this.pos.clone(), target: this.target.clone(), fov: this.fov }, ...shots];
    this.go(shots[shots.length - 1], duration, onArrive, { v0, v1 });
    if (this.t >= 1) return;
    this.curve = {
      pos: new THREE.CatmullRomCurve3(all.map(s => s.position), false, "centripetal"),
      target: new THREE.CatmullRomCurve3(all.map(s => s.target), false, "centripetal"),
      fov: all.map(s => s.fov),
    };
  }

  get moving() { return this.t < 1; }

  setPointer(x, y) { this.pointer.set(x, y); }

  update(dt, time) {
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / this.duration);
      const k = hermite(this.t, this.v0, this.v1);
      if (this.curve) {
        const u = THREE.MathUtils.clamp(k, 0, 1);
        this.curve.pos.getPointAt(u, this.pos);
        this.curve.target.getPointAt(u, this.target);
        const f = this.curve.fov, x = u * (f.length - 1), i = Math.min(f.length - 2, Math.floor(x));
        this.fov = THREE.MathUtils.lerp(f[i], f[i + 1], x - i);
      } else {
        this.pos.lerpVectors(this.from.position, this.to.position, k);
        this.target.lerpVectors(this.from.target, this.to.target, k);
        this.fov = THREE.MathUtils.lerp(this.from.fov, this.to.fov, k);
      }
      if (this.t === 1) this.curve = null;
      if (this.t === 1 && this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); }
    }

    // pointer offset eases in slowly, so it reads as a held camera, not a mouse-follow
    const amp = this.reduced ? 0 : this.parallax;
    this.offset.x += (this.pointer.x * amp - this.offset.x) * Math.min(1, dt * 1.6);
    this.offset.y += (this.pointer.y * amp * 0.6 - this.offset.y) * Math.min(1, dt * 1.6);

    // slow breathing drift
    const drift = this.reduced ? 0 : 0.0015;
    const dx = Math.sin(time * 0.31) * drift;
    const dy = Math.sin(time * 0.23 + 1.3) * drift * 0.6;

    const cam = this.camera;
    const forward = new THREE.Vector3().subVectors(this.target, this.pos).normalize();
    const right = new THREE.Vector3().crossVectors(forward, cam.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward);

    // riding: a slow side-to-side roll and a little bounce from the track
    const sw = this.reduced ? 0 : this.sway;
    const sx = sw * (Math.sin(time * 1.7) * 0.012 + Math.sin(time * 4.3) * 0.003);
    const sy = sw * Math.abs(Math.sin(time * 5.1)) * 0.004;
    cam.position.copy(this.pos)
      .addScaledVector(right, this.offset.x + dx + sx)
      .addScaledVector(up, this.offset.y + dy + sy);
    cam.lookAt(this.target);
    if (sw) cam.rotateZ(sw * Math.sin(time * 1.7 + 0.6) * 0.006);
    if (cam.fov !== this.fov) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }
}
