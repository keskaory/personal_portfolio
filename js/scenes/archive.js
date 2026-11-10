// What I've Done, after midnight. An archive room: a steel flat-file cabinet
// with a lightbox on one side (projects as slides) and case files under a
// hanging lamp on the other (experience). Two stops, one room: the camera
// tracks along the cabinet between them.
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { plasterTexture } from "../objects/textures.js";
import { createSlide } from "../objects/slide.js";
import { createCaseFile } from "../objects/paper.js";
import { makeHandle, pose } from "../core/handling.js";
import { urls, linkOr } from "../lib/content.js";

const LIGHTBOX = { x: -0.33, z: 0.0, w: 0.46, d: 0.34 };
const FILES = { x: 0.3, z: -0.01 };

export function buildArchive(scene, { projects, experience }, { reducedMotion = false } = {}) {
  RectAreaLightUniformsLib.init();
  scene.background = new THREE.Color("#040505");

  // ---- the room: back wall with shelves of archive boxes in near darkness
  const plaster = plasterTexture();
  plaster.repeat.set(3, 2);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.6), new THREE.MeshStandardMaterial({ map: plaster, color: "#5d625c", roughness: 0.95 }));
  wall.position.set(0, 0.6, -0.62);
  wall.receiveShadow = true;
  scene.add(wall);
  const shelfMat = new THREE.MeshStandardMaterial({ color: "#2a2c28", roughness: 0.7 });
  const boxMat = new THREE.MeshStandardMaterial({ color: "#6b6152", roughness: 0.9 });
  const plateMat = new THREE.MeshStandardMaterial({ color: "#d5cfbf", roughness: 0.8 });
  [0.18, 0.56].forEach((y, row) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.02, 0.3), shelfMat);
    shelf.position.set(0, y, -0.47);
    shelf.receiveShadow = true;
    scene.add(shelf);
    for (let i = 0; i < 11; i++) {
      if ((i * 7 + row * 3) % 5 === 0) continue; // a gap here and there
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.27), boxMat);
      b.position.set(-0.82 + i * 0.155, y + 0.14, -0.47);
      b.rotation.y = ((i * 13 + row) % 7 - 3) * 0.008;
      b.castShadow = b.receiveShadow = true;
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), plateMat);
      plate.position.set(0, 0.04, 0.1351);
      b.add(plate);
      scene.add(b);
    }
  });

  // ---- the flat-file cabinet; its top is y = 0
  const steel = new THREE.MeshStandardMaterial({ color: "#3b4540", metalness: 0.35, roughness: 0.55 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.86, 0.64), steel);
  cab.position.set(0, -0.43, 0);
  cab.receiveShadow = true;
  scene.add(cab);
  const handleMat = new THREE.MeshStandardMaterial({ color: "#a8a59c", metalness: 1, roughness: 0.3 });
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 2; c++) {
      const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.15, 0.006), steel);
      drawer.position.set(-0.37 + c * 0.74, -0.09 - r * 0.165, 0.323);
      scene.add(drawer);
      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, 0.012), handleMat);
      pull.position.set(drawer.position.x, drawer.position.y - 0.035, 0.33);
      const holder = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03), plateMat);
      holder.position.set(drawer.position.x, drawer.position.y + 0.03, 0.3265);
      scene.add(pull, holder);
    }
  }

  // ---- the lightbox
  const lb = new THREE.Group();
  lb.position.set(LIGHTBOX.x, 0, LIGHTBOX.z);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(LIGHTBOX.w, 0.03, LIGHTBOX.d), new THREE.MeshStandardMaterial({ color: "#2b2d2b", roughness: 0.5 }));
  frame.position.y = 0.015;
  frame.castShadow = frame.receiveShadow = true;
  const panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#e9ede6").multiplyScalar(0.72) });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(LIGHTBOX.w - 0.03, LIGHTBOX.d - 0.03), panelMat);
  panel.rotation.x = -Math.PI / 2;
  panel.position.y = 0.0305;
  lb.add(frame, panel);
  const area = new THREE.RectAreaLight("#e8efe9", 5, LIGHTBOX.w - 0.03, LIGHTBOX.d - 0.03);
  area.position.set(0, 0.031, 0);
  area.lookAt(0, 1, 0);
  lb.add(area);
  // a loupe left on the glass
  const loupe = new THREE.Group();
  const loupeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.019, 0.028, 40, 1, true), new THREE.MeshStandardMaterial({ color: "#060606", roughness: 0.55, side: THREE.DoubleSide }));
  loupeBody.position.y = 0.014;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.016, 40), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transmission: 1, roughness: 0.02, ior: 1.5, thickness: 0.006 }));
  lens.rotation.x = -Math.PI / 2;
  lens.position.y = 0.028;
  loupeBody.castShadow = true;
  loupe.add(loupeBody, lens);
  loupe.position.set(0.13, 0.0305, 0.07);
  lb.add(loupe);
  scene.add(lb);

  // ---- light
  // hanging lamp over the files
  const shadeOuter = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.012, 0.09), new THREE.Vector2(0.03, 0.08), new THREE.Vector2(0.12, 0.0)], 48), new THREE.MeshStandardMaterial({ color: "#26332d", roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }));
  shadeOuter.position.set(FILES.x, 0.62, FILES.z);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 1, 8), new THREE.MeshBasicMaterial({ color: "#0a0a0a" }));
  cord.position.set(FILES.x, 1.21, FILES.z);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 20, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd9a8").multiplyScalar(3) }));
  bulb.position.set(FILES.x, 0.6, FILES.z);
  scene.add(shadeOuter, cord, bulb);
  const hanging = new THREE.SpotLight("#ffc890", 2.4, 2.5, 0.62, 0.8, 1.6);
  hanging.position.set(FILES.x, 0.58, FILES.z);
  hanging.target.position.set(FILES.x, 0, FILES.z + 0.05);
  hanging.castShadow = true;
  hanging.shadow.mapSize.set(2048, 2048);
  hanging.shadow.bias = -0.0002;
  hanging.shadow.radius = 4;
  scene.add(hanging, hanging.target);
  // cool light from a high window off to the left
  const window_ = new THREE.SpotLight("#9fb6b0", 5, 6, 0.55, 1, 1.4);
  window_.position.set(-1.5, 1.3, 0.7);
  window_.target.position.set(-0.1, 0, -0.3);
  scene.add(window_, window_.target);
  // a little light for the case files from the room, so they don't depend on the lamp alone
  // a soft light from above the lightbox, so the typed mounts can be read
  const overhead = new THREE.SpotLight("#ffe1bd", 1.6, 2, 0.5, 1, 1.5);
  overhead.position.set(LIGHTBOX.x + 0.1, 0.7, 0.45);
  overhead.target.position.set(LIGHTBOX.x, 0, -0.02);
  scene.add(overhead, overhead.target);
  scene.add(new THREE.HemisphereLight("#151a19", "#060606", 0.3));
  const attention = new THREE.SpotLight("#ffe2c2", 0, 2.4, 0.14, 1, 2);
  attention.position.set(0, 0.7, 0.8);
  scene.add(attention, attention.target);

  // ---- projects: slides laid out on the lightbox in a grid that fits however many there are
  const n = projects.length;
  const cols = Math.min(Math.max(n, 1), 4);
  const rows = Math.ceil(n / cols);
  const gap = 0.075;
  // held up at eye level, against the dark room rather than the bright glass
  const heldSlide = pose(LIGHTBOX.x - 0.05, 0.2, 0.12, 1.42, 0, 0);
  const artifacts = [];
  projects.forEach((p, i) => {
    const slide = createSlide(p, i);
    const c = i % cols, r = Math.floor(i / cols);
    const x = LIGHTBOX.x + (c - (cols - 1) / 2) * gap - 0.03;
    const z = LIGHTBOX.z + (r - (rows - 1) / 2) * gap - 0.02;
    const jitter = ((i * 37) % 11 - 5) * 0.012;
    scene.add(slide.group);
    const handle = makeHandle(slide.group, { home: pose(x, 0.0306, z, 0, jitter, 0), held: heldSlide, lift: 0.04, duration: 1.1 });
    slide.hit.userData.id = p.id;
    const actions = [];
    if (p.caseStudy) actions.push({ label: "Read the case study", href: urls.project(p.id), page: true });
    if (linkOr(p.github, "")) actions.push({ label: "Code on GitHub", href: p.github });
    artifacts.push({
      id: p.id, kind: "project", stop: "projects", hit: slide.hit, object: slide.group, handle,
      caption: p.title,
      page: p.caseStudy ? urls.project(p.id) : null,
      panel: () => ({
        title: p.title,
        meta: (p.stack || []).join(" · "),
        body: p.summary || p.description,
        facts: (p.results || []).slice(0, 3),
        actions,
        hint: p.caseStudy ? "" : "No case study for this one yet.",
        sample: p.sample,
      }),
      examine: portrait => {
        const h = heldSlide.position;
        return portrait
          ? { side: "bottom", position: new THREE.Vector3(h.x, h.y + 0.01, h.z + 0.3), target: new THREE.Vector3(h.x, h.y - 0.03, h.z), fov: 30 }
          : { side: "right", position: new THREE.Vector3(h.x + 0.05, h.y + 0.004, h.z + 0.26), target: new THREE.Vector3(h.x + 0.06, h.y, h.z), fov: 24 };
      },
      leave: () => ({ position: new THREE.Vector3(heldSlide.position.x, heldSlide.position.y, heldSlide.position.z + 0.07), target: heldSlide.position.clone(), fov: 22 }),
    });
  });

  // ---- experience: case files fanned under the lamp, the first one on top
  const heldFile = pose(FILES.x + 0.02, 0.016, 0.17, 0, -0.04, 0);
  const files = experience.length;
  // two plain folders underneath, so the pile looks like part of an archive
  [0, 1].forEach(k => {
    const blank = createCaseFile({ organization: "", role: "", dates: "", responsibilities: [], contributions: [] }, 90 + k);
    blank.position.set(FILES.x + 0.05 - k * 0.07, 0.0013 * k, FILES.z - 0.03 + k * 0.02);
    blank.rotation.y = 0.2 - k * 0.32;
    scene.add(blank);
  });
  experience.forEach((e, i) => {
    const file = createCaseFile(e, i);
    const layer = files - 1 - i; // first entry ends up on top
    scene.add(file);
    const home = pose(FILES.x - 0.02 + layer * 0.035, 0.005 + layer * 0.0035, FILES.z + layer * 0.03, 0, -0.08 + layer * 0.1, 0);
    const handle = makeHandle(file, { home, held: heldFile, lift: 0.02 + layer * 0.004, duration: 1.2, extra: k => file.userData.setOpen(Math.max(0, (k - 0.35) / 0.65)) });
    const hits = [];
    file.traverse(o => { if (o.isMesh) { o.userData.id = e.id; hits.push(o); } });
    const actions = e.caseStudy ? [{ label: "Read the case study", href: urls.experience(e.id), page: true }] : [];
    artifacts.push({
      id: e.id, kind: "experience", stop: "experience", hits, object: file, handle,
      caption: `${e.organization}, ${e.dates}`,
      page: e.caseStudy ? urls.experience(e.id) : null,
      panel: () => ({
        title: e.organization,
        meta: `${e.role} · ${e.dates}`,
        body: e.summary,
        list: { heading: "What I did", items: [...(e.contributions || [])].slice(0, 3) },
        actions,
        sample: e.sample,
      }),
      examine: portrait => portrait
        ? { side: "bottom", position: new THREE.Vector3(FILES.x - 0.06, 0.62, 0.42), target: new THREE.Vector3(FILES.x - 0.06, 0, 0.2), fov: 38 }
        : { side: "right", position: new THREE.Vector3(FILES.x + 0.06, 0.42, 0.5), target: new THREE.Vector3(FILES.x + 0.07, 0, 0.14), fov: 36 },
      leave: () => ({ position: new THREE.Vector3(FILES.x, 0.2, 0.16), target: new THREE.Vector3(FILES.x, 0.01, 0.13), fov: 28 }),
    });
  });

  artifacts.forEach(a => { a.focus = new THREE.Vector3(); });

  const lightboxCenter = new THREE.Vector3(LIGHTBOX.x, 0.03, LIGHTBOX.z);
  const filesCenter = new THREE.Vector3(FILES.x, 0.01, FILES.z);
  return {
    artifacts,
    shots: {
      projects: { position: new THREE.Vector3(LIGHTBOX.x - 0.03, 0.27, 0.27), target: new THREE.Vector3(LIGHTBOX.x - 0.02, 0.02, -0.035), fov: 32 },
      projectsPortrait: { position: new THREE.Vector3(LIGHTBOX.x - 0.03, 0.46, 0.34), target: new THREE.Vector3(LIGHTBOX.x - 0.03, 0, -0.02), fov: 36 },
      experience: { position: new THREE.Vector3(FILES.x - 0.04, 0.42, 0.66), target: new THREE.Vector3(FILES.x, 0.03, 0.0), fov: 34 },
      experiencePortrait: { position: new THREE.Vector3(FILES.x - 0.02, 0.7, 0.52), target: new THREE.Vector3(FILES.x - 0.02, 0, 0.04), fov: 42 },
    },
    restFocus: shot => (shot === "experience" ? filesCenter : lightboxCenter),
    lights: { attention },
    update(t, dt, held) {
      artifacts.forEach(a => {
        a.handle.update(dt, a === held, reducedMotion);
        a.object.updateMatrixWorld();
        a.focus.setFromMatrixPosition(a.object.matrixWorld);
      });
    },
  };
}
