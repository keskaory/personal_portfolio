// Post-processing: depth of field, then one final pass for the color grade,
// grain and vignette. Everything is kept deliberately light.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// Runs after tone mapping, so values here are display values.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grain: { value: 0.035 },
    vignette: { value: 0.32 },
    saturation: { value: 0.86 },
    // shadows lean green-teal, highlights lean warm: the late-night grade
    shadowTint: { value: new THREE.Vector3(-0.012, 0.006, 0.004) },
    highlightTint: { value: new THREE.Vector3(1.03, 1.0, 0.93) },
    exposure: { value: 1 },
    // scene changes: a soft band of passing light; -1 means off
    sweep: { value: -1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time, grain, vignette, saturation, exposure, sweep;
    uniform vec3 shadowTint, highlightTint;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb * exposure;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));

      c = mix(vec3(l), c, saturation);
      // split tone
      c += shadowTint * (1.0 - smoothstep(0.0, 0.45, l));
      c = mix(c, c * highlightTint, smoothstep(0.35, 0.9, l));
      // a gentle toe so blacks are deep but not crushed
      c = max(c, 0.0);
      c = c * c * (3.0 - 2.0 * c) * 0.25 + c * 0.75;

      // passing light during a scene change, like headlights crossing the lens
      if (sweep > -0.5) {
        float p = vUv.x * 0.85 + (1.0 - vUv.y) * 0.25;
        float band = exp(-pow((p - sweep) * 4.5, 2.0));
        c += vec3(1.0, 0.8, 0.58) * band * 0.3;
      }

      // vignette
      vec2 d = vUv - 0.5;
      d.x *= 1.25;
      c *= 1.0 - vignette * smoothstep(0.25, 0.85, length(d));

      // grain, strongest in the midtones like film
      float n = hash(vUv * vec2(1931.0, 1173.0) + fract(time * 23.17)) - 0.5;
      c += n * grain * (0.35 + 0.65 * (1.0 - abs(l - 0.45) * 2.0));

      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera, { depthOfField = true } = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const bokeh = new BokehPass(scene, camera, { focus: 0.6, aperture: 0.02, maxblur: 0.012 });
  bokeh.enabled = depthOfField;
  composer.addPass(bokeh);

  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  return {
    composer,
    bokeh,
    grade,
    setFocus(distance, aperture) {
      bokeh.uniforms.focus.value = distance;
      if (aperture !== undefined) bokeh.uniforms.aperture.value = aperture;
    },
    setSize(w, h) { composer.setSize(w, h); },
    // switch which scene is drawn
    setScene(scene) {
      composer.passes[0].scene = scene;
      bokeh.scene = scene;
    },
    render(time) {
      grade.uniforms.time.value = time;
      composer.render();
    },
  };
}
