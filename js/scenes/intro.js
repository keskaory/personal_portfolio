// Introduction, 11:50 pm. A low wooden surface by the wall, lit by one lamp:
// a typed letter (the bio), the folded resume, a photo print leaning on the
// wall, keys and a pen. The title card on screen carries the professional
// facts; the objects are where you pick up the detail.
import * as THREE from "three";
import { plasterTexture, woodTexture } from "../objects/textures.js";
import { createLetter, createResume, createPrint } from "../objects/paper.js";
import { makeHandle, pose } from "../core/handling.js";
import { linkOr } from "../lib/content.js";

export function buildIntro(scene, { site }, { reducedMotion = false } = {}) {
  const { person, links } = site;
  scene.background = new THREE.Color("#050505");

  // ---- the room
  const WALL_Z = -0.22;
  const plaster = plasterTexture();
  plaster.repeat.set(3, 2);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), new THREE.MeshStandardMaterial({ map: plaster, color: "#8a7f70", roughness: 0.95 }));
  wall.position.set(0, 0.7, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);

  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.42 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.035, 0.44), wood);
  top.position.set(0.15, -0.0175, WALL_Z + 0.22);
  top.receiveShadow = true;
  scene.add(top);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: "#1d140d", roughness: 0.6 }));
  apron.position.set(0.15, -0.285, WALL_Z + 0.21);
  scene.add(apron);

  // ---- the lamp at the right edge of the frame
  const lamp = new THREE.Group();
  lamp.position.set(0.62, 0, -0.13);
  const brass = new THREE.MeshStandardMaterial({ color: "#8a6a3e", metalness: 1, roughness: 0.35 });
  const baseM = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.022, 48), new THREE.MeshStandardMaterial({ color: "#20221f", roughness: 0.4 }));
  baseM.position.y = 0.011;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.26, 16), brass);
  stem.position.y = 0.15;
  const shadeProf = [new THREE.Vector2(0.13, 0), new THREE.Vector2(0.085, 0.16)];
  const shadeMat = new THREE.MeshStandardMaterial({ color: "#d6c6a8", emissive: new THREE.Color("#ffad5e"), emissiveIntensity: 0.4, roughness: 1, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.LatheGeometry(shadeProf, 64), shadeMat);
  shade.position.y = 0.2;
  [baseM, stem].forEach(m => { m.castShadow = true; });
  lamp.add(baseM, stem, shade);
  scene.add(lamp);

  // ---- light
  const pool = new THREE.SpotLight("#ffc38a", 2.6, 2.5, 0.95, 1, 1.6);
  pool.position.set(0.62, 0.22, -0.13);
  pool.target.position.set(0.18, 0, 0.02);
  pool.castShadow = true;
  pool.shadow.mapSize.set(2048, 2048);
  pool.shadow.bias = -0.0002;
  pool.shadow.radius = 4;
  scene.add(pool, pool.target);
  const glow = new THREE.PointLight("#ffb36b", 0.45, 2.2, 1.6);
  glow.position.set(0.62, 0.3, -0.13);
  scene.add(glow);
  // faint cool light from a doorway somewhere to the left
  const door = new THREE.SpotLight("#a6bdb6", 2.2, 5, 0.5, 1, 1.4);
  door.position.set(-1.4, 0.9, 0.9);
  door.target.position.set(0.1, 0, -0.1);
  scene.add(door, door.target);
  scene.add(new THREE.HemisphereLight("#161b1a", "#080605", 0.3));
  const attention = new THREE.SpotLight("#ffdcb5", 0, 2.4, 0.16, 1, 2);
  attention.position.set(0.2, 0.5, 0.8);
  scene.add(attention, attention.target);

  // ---- things on the surface
  const letter = new THREE.Group();
  letter.add(createLetter(person, true));
  scene.add(letter);

  const resume = createResume(person, !linkOr(links.resume, ""));
  scene.add(resume);

  const print = createPrint(person.photo, !person.photo);
  const printGroup = new THREE.Group();
  print.position.y = 0.058;
  printGroup.add(print);
  scene.add(printGroup);

  // keys and a pen: small, not interactive, there to make it lived-in
  const steel = new THREE.MeshStandardMaterial({ color: "#a9a8a2", metalness: 1, roughness: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0013, 8, 40), steel);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(-0.03, 0.0014, 0.11);
  const key = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.002, 0.012), brass);
  key.position.set(-0.002, 0.001, 0.125);
  key.rotation.y = -0.5;
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.13, 20), new THREE.MeshStandardMaterial({ color: "#0d0d0d", roughness: 0.25 }));
  pen.rotation.set(0, 0.35, Math.PI / 2);
  pen.position.set(0.25, 0.0045, 0.15);
  [ring, key, pen].forEach(m => { m.castShadow = true; scene.add(m); });

  // ---- handling: where each object rests and where it is held
  const handles = {
    letter: makeHandle(letter, { home: pose(0.11, 0.0006, 0.03, 0, 0.09, 0), held: pose(0.13, 0.11, 0.2, 1.05, 0.0, 0), lift: 0.03 }),
    resume: makeHandle(resume, {
      home: pose(0.32, 0.0008, 0.08, 0, -0.28, 0), held: pose(0.25, 0.12, 0.2, 1.05, 0, 0), lift: 0.03,
      extra: k => resume.userData.setOpen(k),
    }),
    photo: makeHandle(printGroup, { home: pose(0.31, 0, WALL_Z + 0.02, -0.17, -0.06, 0), held: pose(0.28, 0.06, 0.06, -0.05, -0.1, 0), lift: 0.01 }),
  };

  // close-ups are framed from the held pose; the note sits on the left
  const closeUp = (h, portrait, dist = 0.3) => {
    const c = h.held.position;
    if (portrait) {
      return { side: "bottom", position: new THREE.Vector3(c.x, c.y + 0.06, c.z + dist * 1.45), target: new THREE.Vector3(c.x, c.y - 0.045, c.z), fov: 32 };
    }
    return { side: "left", position: new THREE.Vector3(c.x - 0.02, c.y + 0.05, c.z + dist), target: new THREE.Vector3(c.x - 0.075, c.y, c.z), fov: 30 };
  };
  const pushIn = h => {
    const c = h.held.position;
    return { position: new THREE.Vector3(c.x, c.y + 0.02, c.z + 0.12), target: c.clone(), fov: 26 };
  };

  const resumeHref = linkOr(links.resume, "contents.html#resume");
  const artifacts = [
    {
      id: "intro-letter", kind: "about", stop: "rest", hit: letter.children[0], object: letter, handle: handles.letter,
      caption: "A letter: who I am",
      page: "contents.html#about",
      panel: () => ({
        title: person.name,
        meta: `${person.school}. ${person.graduation}.`,
        body: person.bio[0],
        actions: [{ label: "More about me", href: "contents.html#about", page: true }],
        sample: true,
      }),
    },
    {
      id: "intro-resume", kind: "resume", stop: "rest", hit: resume, object: resume, handle: handles.resume,
      caption: "Resume",
      page: null,
      panel: () => ({
        title: "Resume",
        meta: links.resume ? "PDF" : "The PDF isn't linked yet.",
        body: "",
        actions: [{ label: "Open the resume", href: resumeHref, page: !links.resume }],
        sample: !links.resume,
      }),
    },
    {
      id: "intro-photo", kind: "photo", stop: "rest", hit: print, object: printGroup, handle: handles.photo,
      caption: person.photo ? "A photo" : "A photo, still to come",
      page: null,
      panel: () => ({
        title: person.photo ? "A photo" : "A photo goes here",
        body: person.photo ? "" : "Add a photo of yourself in content/site.json under person.photo.",
        actions: [],
        sample: !person.photo,
      }),
    },
  ];
  artifacts.forEach(a => {
    a.focus = new THREE.Vector3();
    a.hit.userData.id = a.id;
    a.examine = portrait => closeUp(a.handle, portrait, a.kind === "photo" ? 0.24 : 0.3);
    a.leave = () => pushIn(a.handle);
  });
  // the resume's folded panels are separate meshes; pick them all
  resume.traverse(o => { if (o.isMesh) o.userData.id = "intro-resume"; });
  print.userData.id = "intro-photo";
  letter.children[0].userData.id = "intro-letter";
  artifacts.find(a => a.id === "intro-resume").hits = [];
  resume.traverse(o => { if (o.isMesh) artifacts.find(a => a.id === "intro-resume").hits.push(o); });

  const restFocusPoint = new THREE.Vector3(0.18, 0.02, 0.04);
  return {
    artifacts,
    shots: {
      rest: { position: new THREE.Vector3(-0.02, 0.34, 0.66), target: new THREE.Vector3(0.05, 0.03, -0.02), fov: 30 },
      restPortrait: { position: new THREE.Vector3(0.2, 0.52, 0.72), target: new THREE.Vector3(0.21, 0.0, 0.0), fov: 36 },
    },
    restFocus: () => restFocusPoint,
    lights: { attention },
    update(t, dt, held) {
      artifacts.forEach(a => {
        a.handle.update(dt, a === held, reducedMotion);
        a.object.updateMatrixWorld();
        a.focus.setFromMatrixPosition(a.object.matrixWorld);
      });
      // the lamp's fabric has the faintest flicker of an old bulb
      if (!reducedMotion) shadeMat.emissiveIntensity = 0.4 + Math.sin(t * 7.1) * 0.006 + Math.sin(t * 2.3) * 0.008;
    },
  };
}
