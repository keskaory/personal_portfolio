// Post-processing: depth of field, then one final pass for the color grade,
// grain and vignette. Everything is kept deliberately light.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { BokehShader } from "three/addons/shaders/BokehShader.js";
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
    sweepGain: { value: 0.3 },   // how bright the band is at its middle
    sweepWidth: { value: 4.5 },  // larger is narrower
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time, grain, vignette, saturation, exposure, sweep, sweepGain, sweepWidth;
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
        float band = exp(-pow((p - sweep) * sweepWidth, 2.0));
        c += vec3(1.0, 0.8, 0.58) * band * sweepGain;
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

// Depth of field from the depth the main render already wrote. (three's BokehPass draws the
// whole scene a second time just to get depth, which doubled the cost of every frame it ran.)
class DepthBokehPass extends Pass {
  constructor(camera, { focus, aperture, maxblur }) {
    super();
    this.camera = camera;
    const uniforms = THREE.UniformsUtils.clone(BokehShader.uniforms);
    uniforms.focus.value = focus;
    uniforms.aperture.value = aperture;
    uniforms.maxblur.value = maxblur;
    this.uniforms = uniforms;
    this.fsQuad = new FullScreenQuad(new THREE.ShaderMaterial({
      defines: { DEPTH_PACKING: 0, PERSPECTIVE_CAMERA: 1 },
      uniforms, vertexShader: BokehShader.vertexShader,
      // pixels in focus (blur under about half a pixel) skip the forty samples and pass through
      fragmentShader: BokehShader.fragmentShader.replace(
        "vec2 dofblur9 = dofblur * 0.9;",
        "if ( abs( dofblur.x ) * 0.4 < 0.00045 ) { gl_FragColor = texture2D( tColor, vUv ); return; }\n\t\t\tvec2 dofblur9 = dofblur * 0.9;",
      ),
    }));
  }
  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tColor.value = readBuffer.texture;
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    this.uniforms.nearClip.value = this.camera.near;
    this.uniforms.farClip.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }
  setSize(w, h) { this.uniforms.aspect.value = w / h; }
}

export function createPost(renderer, scene, camera, { depthOfField = true } = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  // both of the composer's buffers carry a depth texture, so the depth of field can read it
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(size.x, size.y) });
  const composer = new EffectComposer(renderer, target);
  if (!composer.renderTarget2.depthTexture || composer.renderTarget2.depthTexture === target.depthTexture) composer.renderTarget2.depthTexture = new THREE.DepthTexture(size.x, size.y);
  composer.addPass(new RenderPass(scene, camera));

  const bokeh = new DepthBokehPass(camera, { focus: 0.6, aperture: 0.02, maxblur: 0.012 });
  bokeh.enabled = depthOfField;
  composer.addPass(bokeh);

  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  return {
    composer,
    bokeh,
    grade,
    allowDof: depthOfField,
    setFocus(distance, aperture) {
      bokeh.uniforms.focus.value = distance;
      if (aperture !== undefined) bokeh.uniforms.aperture.value = aperture;
      // the blur pass costs the same whether it blurs or not: skip it when there's nothing to blur
      bokeh.enabled = this.allowDof && bokeh.uniforms.aperture.value > 0.0012;
    },
    setSize(w, h) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }, // follow the renderer's resolution
    // switch which scene is drawn
    setScene(scene) {
      composer.passes[0].scene = scene;
    },
    render(time) {
      grade.uniforms.time.value = time;
      composer.render();
    },
  };
}
