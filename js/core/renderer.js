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

// How sharp to render: the screen's own density, but within a budget of pixels, so a large
// retina window doesn't cost three times what a laptop screen does. The scene is soft and
// grainy by design; past about 2.4 million pixels nobody can see the difference.
const BUDGET = { high: 2.4e6, low: 1.3e6 };
export function pixelRatioFor(quality, scale = 1) {
  const maxDpr = quality === "high" ? 1.75 : 1.25;
  const fit = Math.sqrt(BUDGET[quality] / Math.max(1, innerWidth * innerHeight));
  return Math.max(0.6, Math.min(window.devicePixelRatio || 1, maxDpr, fit) * scale);
}

export function createRenderer(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatioFor(quality));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

// Calls `frame(time, dt)` every frame and pauses while the tab is hidden. It keeps an eye on
// the frame rate the whole time, not just at the start: whenever the last couple of seconds ran
// slower than about 40 fps it calls onSlow, so the caller can step quality down (each call one
// step), and it waits a little after each step to see whether that was enough.
export function startLoop(renderer, frame, { onSlow } = {}) {
  const clock = new THREE.Clock();
  let elapsed = 0;
  let samples = [];
  let settleUntil = 1.5;

  const tick = () => {
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    elapsed += dt;
    frame(elapsed, dt);

    if (elapsed > settleUntil && raw < 0.25) { // a long gap is a stall or a hidden tab, not slowness
      samples.push(raw);
      if (samples.length >= 100) {
        samples.sort((a, b) => a - b);
        const typical = samples[Math.floor(samples.length * 0.6)]; // ignore the odd hitch at a cut
        samples = [];
        if (typical > 1 / 40 && onSlow) { onSlow(); settleUntil = elapsed + 1.0; }
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
