// Moves the camera between composed shots. A shot is a position, a point
// to look at, and a field of view. Moves are eased and fairly slow; on top
// of the shot there is a very small pointer offset and a slow drift so the
// frame never feels locked off.
import * as THREE from "three";

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
  }

  // jump straight to a shot
  set(shot) {
    this.pos.copy(shot.position);
    this.target.copy(shot.target);
    this.fov = shot.fov;
    this.t = 1;
    this.to = shot;
  }

  // move to a shot over `duration` seconds
  go(shot, duration = 1.6, onArrive = null) {
    if (this.reduced) duration = 0;
    this.from = { position: this.pos.clone(), target: this.target.clone(), fov: this.fov };
    this.to = shot;
    this.duration = Math.max(duration, 0.0001);
    this.t = duration === 0 ? 1 : 0;
    if (duration === 0) this.set(shot);
    this.onArrive = onArrive;
    if (duration === 0 && onArrive) onArrive();
  }

  get moving() { return this.t < 1; }

  setPointer(x, y) { this.pointer.set(x, y); }

  update(dt, time) {
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / this.duration);
      const k = ease(this.t);
      this.pos.lerpVectors(this.from.position, this.to.position, k);
      this.target.lerpVectors(this.from.target, this.to.target, k);
      this.fov = THREE.MathUtils.lerp(this.from.fov, this.to.fov, k);
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

    cam.position.copy(this.pos)
      .addScaledVector(right, this.offset.x + dx)
      .addScaledVector(up, this.offset.y + dy);
    cam.lookAt(this.target);
    if (cam.fov !== this.fov) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }
}
