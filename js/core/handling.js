// Moving an object between where it rests and where it is held, with a
// small lift on the way so it clears whatever it lies on. Used for paper,
// slides and files. `extra(p)` lets an object do more as it is picked up
// (unfold, open a cover), with p going 0 to 1.
import * as THREE from "three";

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function makeHandle(object, { home, held, lift = 0.02, duration = 1.0, extra = null }) {
  const qHome = new THREE.Quaternion().setFromEuler(home.rotation);
  const qHeld = new THREE.Quaternion().setFromEuler(held.rotation);
  let p = 0;
  const apply = () => {
    const k = ease(p);
    object.position.lerpVectors(home.position, held.position, k);
    object.position.y += Math.sin(Math.PI * k) * lift;
    object.quaternion.slerpQuaternions(qHome, qHeld, k);
    if (extra) extra(k);
  };
  apply();
  return {
    held,
    get progress() { return p; },
    update(dt, isHeld, reduced) {
      const target = isHeld ? 1 : 0;
      if (p === target) return;
      const step = reduced ? 1 : dt / duration;
      p = isHeld ? Math.min(1, p + step) : Math.max(0, p - step);
      apply();
    },
  };
}

// pose helper: position + Euler rotation
export const pose = (x, y, z, rx = 0, ry = 0, rz = 0) => ({ position: new THREE.Vector3(x, y, z), rotation: new THREE.Euler(rx, ry, rz) });
