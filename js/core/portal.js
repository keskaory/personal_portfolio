// The window every scene change passes through. Each scene names one window
// (its middle, which way it faces, how tall the opening is) and this frames it
// the same way everywhere: square on, the opening filling the same share of
// the frame at the same lens, so cutting from one window to the next lines up.
import * as THREE from "three";

const FILL = 0.7;                          // the opening's height, as a share of the frame's
const FOV = { landscape: 34, portrait: 50 };

// center: the middle of the glass; facing: the way the glass faces (toward the camera);
// height: the opening's height in metres
export function windowShot(center, facing, height, portrait) {
  const fov = portrait ? FOV.portrait : FOV.landscape;
  const distance = height / FILL / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
  const n = facing.clone().normalize();
  return {
    shot: { position: center.clone().addScaledVector(n, distance), target: center.clone(), fov },
    glass: center.clone(),
  };
}
