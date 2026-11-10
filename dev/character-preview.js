// The character on its own: neutral studio light, orbit controls, views that
// match the reference photos, and buttons for every pose and gesture.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createCharacter } from "../js/character/index.js";
import { bakeFace, loadImage } from "./face-bake.js";

const REFS = [
  { file: "outfit-front.png", label: "Outfit, front", view: "front" },
  { file: "outfit-standing.webp", label: "Outfit, standing", view: "three" },
  { file: "hair-side.jpg", label: "Hair, side", view: "hair" },
  { file: "face-front.jpg", label: "Face, front", view: "face" },
  { file: "pose-pillar.jpg", label: "Standing pose", view: "front" },
  { file: "seated.png", label: "Seated", view: "seated" },
  { file: "hair-side-2.png", label: "Hair, other side", view: "right" },
];

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#9c9e9d");
const camera = new THREE.PerspectiveCamera(22, 1, 0.05, 50);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 1.0, 0);

// studio light: warm key, cool fill, a rim from behind
const key = new THREE.DirectionalLight("#fff1e2", 2.4);
key.position.set(1.6, 2.6, 2.2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -1.2;
key.shadow.camera.right = key.shadow.camera.top = 1.2;
key.shadow.bias = -0.0004;
scene.add(key);
const fill = new THREE.DirectionalLight("#dfe8f0", 0.8);
fill.position.set(-2, 1.4, 1.5);
scene.add(fill);
const rim = new THREE.DirectionalLight("#ffffff", 1.2);
rim.position.set(-0.8, 2.2, -2.4);
scene.add(rim);
scene.add(new THREE.HemisphereLight("#f2f2f0", "#6e706f", 0.9));
const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64), new THREE.MeshStandardMaterial({ color: "#a7a9a8", roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// a stool, table and bowl for checking the seated pose
const props = new THREE.Group();
const wood = new THREE.MeshStandardMaterial({ color: "#8a6b4e", roughness: 0.6 });
const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.45, 24), wood);
stool.position.set(0, 0.225, -0.06);
const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.6), wood);
table.position.set(0, 0.74, 0.5);
const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.73, 12), wood);
leg.position.set(0, 0.365, 0.6);
const bowl = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.03, 0), new THREE.Vector2(0.075, 0.03), new THREE.Vector2(0.09, 0.075)], 32), new THREE.MeshStandardMaterial({ color: "#f1ede4", roughness: 0.3, side: THREE.DoubleSide }));
bowl.position.set(0.04, 0.755, 0.3);
[stool, table, leg, bowl].forEach(m => { m.castShadow = m.receiveShadow = true; props.add(m); });
props.visible = false;
scene.add(props);

const config = await fetch("../content/character.json").then(r => r.json());
// bake the face from the reference photo (dev only); the site loads the saved result
let faceImage = null;
try {
  const photo = await loadImage(`../${config.face.photo.src}`);
  const baked = bakeFace(photo, config.face.photo);
  faceImage = baked.canvas;
  document.getElementById("face-out").getContext("2d").drawImage(baked.canvas, 0, 0);
  window.bakedFace = { dataURL: () => baked.canvas.toDataURL("image/png"), skin: baked.skin };
} catch (err) {
  console.warn("Face bake skipped:", err);
}
const kaory = createCharacter(config, { pose: "standing", faceImage });
scene.add(kaory.group);
const bonesHelper = new THREE.SkeletonHelper(kaory.group);
bonesHelper.visible = false;
scene.add(bonesHelper);

// ---- camera views that match the reference photos
const VIEWS = {
  front: { pos: [0, 1.0, 6], target: [0, 0.92, 0] },
  three: { pos: [2.9, 1.25, 4.1], target: [0, 0.95, 0] },
  left: { pos: [5.2, 1.0, 0], target: [0, 0.95, 0] },
  right: { pos: [-5.2, 1.0, 0], target: [0, 0.95, 0] },
  back: { pos: [0, 1.1, -5.2], target: [0, 0.95, 0] },
  face: { pos: [0.08, 1.7, 1.25], target: [0, 1.665, 0] },
  hair: { pos: [1.3, 1.72, -0.1], target: [0, 1.67, 0] },
  seated: { pos: [-0.9, 1.2, 2.4], target: [0, 0.8, 0.15] },
};
let tween = null;
function setView(name, instant = false) {
  const v = VIEWS[name];
  if (!v) return;
  const to = { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target) };
  if (instant) { camera.position.copy(to.pos); controls.target.copy(to.target); return; }
  tween = { from: { pos: camera.position.clone(), target: controls.target.clone() }, to, t: 0 };
}
setView("three", true);

// ---- reference photos
const refs = document.getElementById("refs");
const big = document.getElementById("ref-img");
REFS.forEach((r, i) => {
  const b = document.createElement("button");
  b.title = r.label;
  b.setAttribute("aria-label", `Reference: ${r.label}`);
  b.innerHTML = `<img src="ref/${r.file}" alt="">`;
  b.addEventListener("click", () => { big.src = `ref/${r.file}`; big.alt = r.label; setView(r.view); });
  refs.appendChild(b);
  if (i === 0) { big.src = `ref/${r.file}`; big.alt = r.label; }
});

// ---- controls
const pressed = (el, on) => el.setAttribute("aria-pressed", on ? "true" : "false");
document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
document.querySelectorAll("[data-pose]").forEach(b => b.addEventListener("click", () => {
  kaory.setPose(b.dataset.pose, 0.9);
  props.visible = b.dataset.pose === "seated";
  document.querySelectorAll("[data-pose]").forEach(x => pressed(x, x === b));
  if (b.dataset.pose === "seated") setView("seated");
}));
document.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.act === "blink") kaory.blink(); else kaory.gesture(b.dataset.act);
}));
const state = { follow: true, smile: false, wire: false, bones: false, turntable: false };
document.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => {
  const k = b.dataset.toggle;
  state[k] = !state[k];
  pressed(b, state[k]);
  if (k === "smile") kaory.smile(state.smile ? 1 : 0);
  if (k === "wire") kaory.group.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => (m.wireframe = state.wire)); });
  if (k === "bones") bonesHelper.visible = state.bones;
}));

// cursor following: look at a point along the pointer's ray, about as far as the camera is
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerIn = false;
canvas.addEventListener("pointermove", e => {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  pointerIn = true;
});
canvas.addEventListener("pointerleave", () => (pointerIn = false));
const headPos = new THREE.Vector3();

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 0.8);
    const k = tween.t * tween.t * (3 - 2 * tween.t);
    camera.position.lerpVectors(tween.from.pos, tween.to.pos, k);
    controls.target.lerpVectors(tween.from.target, tween.to.target, k);
    if (tween.t === 1) tween = null;
  }
  if (state.turntable) kaory.group.rotation.y += dt * 0.4;
  if (state.follow && pointerIn) {
    ray.setFromCamera(ndc, camera);
    kaory.skeleton.bones.head.getWorldPosition(headPos);
    kaory.lookAt(ray.ray.at(camera.position.distanceTo(headPos) * 0.9, new THREE.Vector3()));
  } else {
    kaory.lookAt(null);
  }
  kaory.update(dt);
  controls.update();
  renderer.render(scene, camera);
});
window.kaoryPreview = { kaory, setView };
