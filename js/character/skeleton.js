// The character's skeleton, in a relaxed rest pose (arms hanging slightly
// away from the body). Every bone starts unrotated, so a pose rotation like
// { x: -0.4 } on an upper arm simply swings it forward.
// The character faces +z; its left is +x.
import * as THREE from "three";

// rest positions for a 1.78 m figure (scaled for other heights)
const REST = {
  hips: [0, 0.955, 0],
  spine: [0, 1.09, -0.005],
  chest: [0, 1.25, -0.01],
  neck: [0, 1.465, -0.012],
  head: [0, 1.536, 0.0],
  "shoulder.L": [0.035, 1.425, -0.015],
  "upperArm.L": [0.185, 1.405, -0.02],
  "forearm.L": [0.225, 1.115, -0.025],
  "hand.L": [0.245, 0.865, -0.01],
  "thigh.L": [0.088, 0.925, 0.0],
  "shin.L": [0.098, 0.5, 0.012],
  "foot.L": [0.104, 0.085, -0.005],
};
// right side mirrors the left
Object.keys(REST).filter(k => k.endsWith(".L")).forEach(k => {
  const [x, y, z] = REST[k];
  REST[k.replace(".L", ".R")] = [-x, y, z];
});

const PARENT = {
  hips: null,
  spine: "hips",
  chest: "spine",
  neck: "chest",
  head: "neck",
  "shoulder.L": "chest", "shoulder.R": "chest",
  "upperArm.L": "shoulder.L", "upperArm.R": "shoulder.R",
  "forearm.L": "upperArm.L", "forearm.R": "upperArm.R",
  "hand.L": "forearm.L", "hand.R": "forearm.R",
  "thigh.L": "hips", "thigh.R": "hips",
  "shin.L": "thigh.L", "shin.R": "thigh.R",
  "foot.L": "shin.L", "foot.R": "shin.R",
};

export function buildSkeleton(height = 1.78) {
  const k = height / 1.78;
  const world = {};
  Object.entries(REST).forEach(([name, p]) => (world[name] = new THREE.Vector3(...p).multiplyScalar(k)));

  const bones = {};
  const list = [];
  const order = Object.keys(PARENT);
  order.forEach(name => {
    const b = new THREE.Bone();
    b.name = name;
    // pitch first, then yaw: so a forearm can bend forward and then turn inward
    b.rotation.order = "YXZ";
    bones[name] = b;
    list.push(b);
  });
  order.forEach(name => {
    const parent = PARENT[name];
    const b = bones[name];
    if (parent) {
      bones[parent].add(b);
      b.position.subVectors(world[name], world[parent]);
    } else {
      b.position.copy(world[name]);
    }
  });

  const root = bones.hips;
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list);
  const index = Object.fromEntries(list.map((b, i) => [b.name, i]));

  // handy extra points the meshes need (not bones)
  const extra = {
    wrist: s => world[`hand.${s}`].clone(),
    fingertip: s => world[`hand.${s}`].clone().add(new THREE.Vector3(Math.sign(world[`hand.${s}`].x) * 0.004, -0.185 * k, 0.01 * k)),
    ankle: s => world[`foot.${s}`].clone(),
    toe: s => world[`foot.${s}`].clone().add(new THREE.Vector3(Math.sign(world[`foot.${s}`].x) * 0.006, -0.06 * k, 0.17 * k)),
  };
  return { skeleton, bones, index, world, root, k, extra };
}

export const BONE_NAMES = Object.keys(PARENT);
