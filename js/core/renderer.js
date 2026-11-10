// Renderer setup, quality level, resizing and the render loop.
import * as THREE from "three";

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch {
    return false;
  }
}

// "high" on most laptops and desktops, "low" on phones and weak machines.
export function pickQuality() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  const saveData = navigator.connection && navigator.connection.saveData;
  return coarse || cores <= 4 || saveData ? "low" : "high";
}

export function createRenderer(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  const maxDpr = quality === "high" ? 1.75 : 1.25;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

// Calls `frame(time, dt)` every frame, pauses while the tab is hidden, and
// reports a slow average frame rate once so the caller can lower quality.
export function startLoop(renderer, frame, { onSlow } = {}) {
  const clock = new THREE.Clock();
  let elapsed = 0;
  let samples = [];
  let reported = false;

  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    frame(elapsed, dt);

    if (!reported && elapsed > 1.5) {
      samples.push(dt);
      if (samples.length >= 90) {
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        reported = true;
        if (avg > 1 / 38 && onSlow) onSlow();
      }
    }
  };
  renderer.setAnimationLoop(tick);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
    } else {
      clock.getDelta(); // drop the time spent hidden
      renderer.setAnimationLoop(tick);
    }
  });
}
