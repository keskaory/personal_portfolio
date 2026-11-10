// Poses as data: bone rotations in radians (x swings forward/back, y twists,
// z swings sideways), plus an optional hips offset in meters.
// A negative x on an upper arm or thigh swings it forward; a negative x on a
// forearm bends the elbow; a positive x on a shin bends the knee.
// "L" is the character's left (+x).

export const POSES = {
  // standing on the platform, weight on the right leg, holding the phone at the waist
  standing: {
    hips: { y: 0.05, z: -0.025 },
    spine: { x: 0.03, z: 0.012 },
    chest: { x: 0.02, z: 0.01 },
    neck: { x: 0.12 },
    head: { x: -0.02, z: 0.02 },
    "shoulder.L": { z: -0.02 },
    "shoulder.R": { z: 0.02 },
    // arms hanging loose, a slight bend at the elbow
    "upperArm.L": { x: -0.05, z: -0.06 },
    "forearm.L": { x: -0.2, y: 0.1 },
    "hand.L": { y: 0.15, z: -0.05 },
    "upperArm.R": { x: -0.03, z: 0.07 },
    "forearm.R": { x: -0.24, y: -0.1 },
    "hand.R": { y: -0.2, z: 0.05 },
    "thigh.L": { x: -0.06, z: 0.035 },
    "shin.L": { x: 0.14 },
    "foot.L": { x: -0.06, y: 0.18 },
    "thigh.R": { z: -0.025 },
    "foot.R": { y: -0.08 },
  },

  // relaxed: arms hanging, for checking proportions
  relaxed: {
    neck: { x: 0.06 },
    head: { x: -0.04 },
    "upperArm.L": { z: -0.06 },
    "upperArm.R": { z: 0.06 },
    "forearm.L": { x: -0.12 },
    "forearm.R": { x: -0.12 },
  },

  // at the restaurant table: bowl in the left hand, chopsticks in the right
  seated: {
    hipsOffset: [0, -0.49, 0.02],
    hips: { x: 0.05 },
    spine: { x: 0.12 },
    chest: { x: 0.1 },
    neck: { x: 0.02 },
    head: { x: -0.12 },
    "upperArm.L": { x: -0.55, z: -0.22 },
    "forearm.L": { x: -1.3, y: -0.55 },
    "hand.L": { x: 0.2, y: 0.4, z: -0.9 },
    "upperArm.R": { x: -0.7, z: 0.28 },
    "forearm.R": { x: -1.55, y: 0.5 },
    "hand.R": { x: 0.4, y: -0.3, z: 0.6 },
    "thigh.L": { x: -1.5, z: 0.06 },
    "shin.L": { x: 1.48 },
    "thigh.R": { x: -1.48, z: -0.05 },
    "shin.R": { x: 1.5 },
    "foot.L": { x: 0.05 },
    "foot.R": { x: 0.05 },
  },
};

// short gestures layered on top of a pose: keyframes of extra rotation over time (seconds)
export const GESTURES = {
  // look down the platform, toward the character's left
  lookDownLine: { duration: 3.2, keys: [[0, 0], [0.8, 1], [2.4, 1], [3.2, 0]], bones: { neck: { y: 0.35 }, head: { y: 0.45, x: -0.04 } }, lookWeight: 0 },
  // a glance down at the floor, then back up
  lookDown: { duration: 2.6, keys: [[0, 0], [0.6, 1], [1.9, 1], [2.6, 0]], bones: { neck: { x: 0.16 }, head: { x: 0.26 } }, lookWeight: 0.1 },
  // shift weight from one leg to the other and back
  shiftWeight: { duration: 4.0, keys: [[0, 0], [1.4, 1], [2.6, 1], [4.0, 0]], bones: { hips: { z: 0.04, y: -0.05 }, "thigh.L": { x: 0.06, z: -0.03 }, "shin.L": { x: -0.12 }, "thigh.R": { x: -0.05 }, "shin.R": { x: 0.1 }, chest: { z: -0.02 } }, lookWeight: 0.8 },
  // seated: lift the chopsticks toward the mouth and back
  eat: { duration: 3.0, keys: [[0, 0], [1.0, 1], [1.6, 1], [3.0, 0]], bones: { "upperArm.R": { x: -0.15 }, "forearm.R": { x: -0.35 }, head: { x: 0.08 }, spine: { x: 0.03 } }, lookWeight: 0.2 },
};
