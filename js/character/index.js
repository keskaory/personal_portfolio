// createCharacter(config, options) -> the character, ready for any scene.
//
//   const kaory = createCharacter(config, { pose: "standing", faceImage });
//   scene.add(kaory.group);
//   kaory.lookAt(worldPoint);   // or null to look ahead
//   kaory.setPose("seated");
//   kaory.gesture("lookDownLine");
//   kaory.update(dt);           // every frame
//
// Appearance comes from content/character.json; the face texture is the
// baked image at config.face.texture (made with dev/character.html's bake
// tool); poses and gestures from poses.js.
import * as THREE from "three";
import { buildSkeleton } from "./skeleton.js";
import { buildHead } from "./head.js";
import { buildHair } from "./hair.js";
import { buildOutfit } from "./outfit.js";
import { buildHands } from "./hands.js";
import { Animator } from "./animator.js";
import { FaceTexture, FACE_TEX } from "./face-texture.js";

// if there is no baked face yet, a plain skin-colored stand-in
function blankFace(skin) {
  const c = document.createElement("canvas");
  c.width = FACE_TEX.w; c.height = FACE_TEX.h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function materials(config, face) {
  const c = config.colors;
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
  return {
    face: new THREE.MeshStandardMaterial({ map: face.texture, roughness: 0.72, vertexColors: true }),
    skinHead: std(c.skin, { roughness: 0.72, vertexColors: true }),
    skin: std(c.skin, { roughness: 0.72 }),
    skinShadow: std(c.skinShadow, { roughness: 0.8 }),
    silver: std(c.silver, { metalness: 1, roughness: 0.3 }),
    chopsticks: std(c.chopsticks || "#3f7a58", { roughness: 0.45 }),
  };
}

export function createCharacter(config, { pose = "standing", reducedMotion = false, faceImage = null } = {}) {
  const face = new FaceTexture(faceImage || blankFace(config.colors.skin), { iris: config.colors.iris, mole: config.face?.mole !== false ? config.face?.molePos : null });
  const mats = materials(config, face);
  const group = new THREE.Group();
  group.name = "character";
  const sk = buildSkeleton(config.height || 1.78);
  group.add(sk.root);

  // head and hair ride on the head bone
  const { head } = buildHead(config, mats);
  sk.bones.head.add(head);
  const hair = buildHair(config, config.colors);
  head.add(hair.group);

  // neck: a short faceted tube between the hood and the jaw
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.051, 0.12, 10, 1, true), mats.skin);
  neck.position.set(0, 0.045, -0.008);
  neck.castShadow = true;
  sk.bones.neck.add(neck);

  const outfit = buildOutfit(config, sk, mats);
  outfit.skinned.forEach(m => group.add(m));
  buildHands({ ...config, outfit: { ...config.outfit, phone: false } }, sk, mats);

  // green chopsticks for the seated pose
  const chopsticks = new THREE.Group();
  [0, 1].forEach(i => {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0034, 0.23, 6), mats.chopsticks);
    stick.position.set(0.004 + i * 0.01, -0.09, 0.03 + i * 0.006);
    stick.rotation.set(1.25 + i * 0.12, 0, -0.1);
    stick.castShadow = true;
    chopsticks.add(stick);
  });
  chopsticks.visible = false;
  sk.bones["hand.R"].add(chopsticks);

  group.updateMatrixWorld(true);
  outfit.skinned.forEach(m => m.bind(sk.skeleton));

  const animator = new Animator(sk, face, group, { reducedMotion });

  function setPose(name, duration = 0.8) {
    animator.setPose(name, duration);
    const seated = name === "seated";
    chopsticks.visible = seated;
    animator.setIdleGestures(seated ? ["eat"] : ["lookDownLine", "lookDown", "shiftWeight"]);
  }
  setPose(pose, 0);

  return {
    group,
    skeleton: sk,
    materials: mats,
    face,
    setPose,
    lookAt: p => animator.lookAt(p),
    smile: v => animator.smile(v),
    blink: () => animator.blink(),
    gesture: name => animator.gesture(name),
    get pose() { return animator.poseName; },
    update(dt) { animator.update(dt); },
  };
}
