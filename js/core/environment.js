// Builds the reflection map from a tiny invisible "room": dark walls, one
// bright window and a warm lamp off to the side. Glass and metal then
// reflect the same light sources the scene actually has.
import * as THREE from "three";

export function createEnvironment(renderer, { window: win = "#9fb8b2", lamp = "#ffb070" } = {}) {
  const env = new THREE.Scene();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(6, 4, 6),
    new THREE.MeshBasicMaterial({ color: "#0b0d0c", side: THREE.BackSide })
  );
  box.position.y = 1.5;
  env.add(box);

  const glow = (color, strength, w, h, pos, look) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.copy(pos);
    mesh.lookAt(look);
    env.add(mesh);
  };
  const center = new THREE.Vector3(0, 0.3, 0);
  // the window behind the bottles
  glow(win, 1.4, 1.4, 1.1, new THREE.Vector3(0, 0.6, -1.2), center);
  // a narrow bright strip, like a streetlight seen through the glass
  glow("#ffd29a", 4, 0.12, 0.6, new THREE.Vector3(0.7, 0.9, -1.1), center);
  // a lamp somewhere in the room, behind and to the right of the viewer
  glow(lamp, 1.2, 0.5, 0.5, new THREE.Vector3(1.6, 0.8, 1.8), center);
  // faint bounce from the ceiling
  glow("#3a3530", 0.6, 3, 3, new THREE.Vector3(0, 2.8, 0), center);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.035);
  pmrem.dispose();
  env.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return target.texture;
}
