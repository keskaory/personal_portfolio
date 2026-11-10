// A 35mm slide: a card mount with the project's title typed on it and the
// picture (or its placeholder) as a transparency in the window. The
// transparency glows because it is lit from behind.
import * as THREE from "three";
import { drawPlaceholder, hashString } from "../lib/placeholder-art.js";
import { stamp } from "./paper.js";

const SIZE = 0.05;          // mounts are 50 mm square
const WIN_W = 0.036, WIN_H = 0.024; // the 36 x 24 mm frame

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

function mountTexture(project, index) {
  const N = 800;
  const [c, ctx] = canvas(N, N);
  ctx.fillStyle = "#e8e2d4";
  ctx.fillRect(0, 0, N, N);
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * N, Math.random() * N, 2, 2);
  }
  // the window, dark until the transparency is laid over it
  const ww = (WIN_W / SIZE) * N, wh = (WIN_H / SIZE) * N;
  ctx.fillStyle = "#111";
  ctx.fillRect((N - ww) / 2, (N - wh) / 2, ww, wh);

  // typed title along the top border, shortened if it is long
  ctx.fillStyle = "rgba(24,20,16,0.85)";
  ctx.font = `44px "Courier Prime", "Courier New", monospace`;
  let title = project.title;
  while (ctx.measureText(title).width > N - 90 && title.length > 4) title = title.slice(0, -2);
  if (title !== project.title) title = title.trimEnd() + "…";
  ctx.fillText(title, 45, 110);
  // number and stack along the bottom border
  ctx.font = `34px "Courier Prime", "Courier New", monospace`;
  ctx.fillText(String(index + 1).padStart(2, "0"), 45, N - 60);
  let stack = (project.stack || []).join(" · ");
  while (ctx.measureText(stack).width > N - 200 && stack.length > 4) stack = stack.slice(0, -2);
  ctx.fillText(stack, 130, N - 60);
  if (project.sample) stamp(ctx, N - 270, N - 118, 46, "SAMPLE", 0.06);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function pictureTexture(project) {
  const p = project.preview || {};
  if (p.image) {
    const t = new THREE.TextureLoader().load(p.image);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const [c] = canvas(900, 600);
  drawPlaceholder(c, { format: p.format || "chart", seed: hashString(project.id), label: project.sample ? "Sample preview" : "" });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createSlide(project, index) {
  const group = new THREE.Group();
  const mountMat = new THREE.MeshStandardMaterial({ map: mountTexture(project, index), roughness: 0.8 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: "#d9d2c2", roughness: 0.85 });
  // box faces: +x, -x, +y (top), -y, +z, -z
  const mount = new THREE.Mesh(new THREE.BoxGeometry(SIZE, 0.0016, SIZE), [edgeMat, edgeMat, mountMat, edgeMat, edgeMat, edgeMat]);
  mount.position.y = 0.0008;
  mount.castShadow = true;
  group.add(mount);

  // the transparency: unlit, so it reads as light coming through film
  const picMat = new THREE.MeshBasicMaterial({ map: pictureTexture(project), color: new THREE.Color(1.15, 1.12, 1.08) });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W, WIN_H), picMat);
  pic.rotation.x = -Math.PI / 2;
  pic.position.y = 0.00165;
  group.add(pic);

  const hit = new THREE.Mesh(new THREE.BoxGeometry(SIZE * 1.1, 0.012, SIZE * 1.1), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.004;
  group.add(hit);

  return { group, hit, size: SIZE, picture: picMat };
}
