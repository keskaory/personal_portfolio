// A window pane with the night city behind it and rain on the glass: still
// drops, a few that slide, condensation toward the bottom. The city sits at
// a fake depth behind the pane so it shifts as the camera moves. Shared by
// the restaurant and the apartment (the ledge has its own copy).
import * as THREE from "three";
import { cityTexture } from "./textures.js";

export function rainWindow(width, height, { brightness = 0.9, depth = 0.22, fog = 0.35, tint = [1, 1, 1] } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tCity: { value: cityTexture() },
      time: { value: 0 },
      brightness: { value: brightness },
      depth: { value: depth },
      fogAmt: { value: fog },
      tint: { value: new THREE.Vector3(...tint) },
      aspect: { value: width / height },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tCity;
      uniform float time, brightness, depth, fogAmt, aspect;
      uniform vec3 tint;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }
      vec3 drops(vec2 uv, float scale, float size) {
        vec2 g = uv * scale;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        vec2 h = hash2(id);
        vec2 c = (h - 0.5) * 0.7;
        float r = size * (0.35 + 0.65 * h.y);
        vec2 d = (f - c) / r;
        float m = smoothstep(1.0, 0.85, length(d)) * step(0.45, h.x);
        return vec3(d * m, m);
      }
      vec3 runners(vec2 uv) {
        float cols = 9.0;
        float col = floor(uv.x * cols);
        vec2 h = hash2(vec2(col, 7.0));
        if (h.x < 0.55) return vec3(0.0);
        float y = fract(uv.y + time * (0.012 + h.y * 0.02) + h.x * 3.0);
        vec2 p = vec2(fract(uv.x * cols) - 0.5 - (h.y - 0.5) * 0.5, (y - 0.5) * 6.0);
        vec2 d = p / vec2(0.07, 0.11);
        float m = smoothstep(1.0, 0.8, length(d));
        return vec3(d * m, m);
      }
      void main() {
        vec3 view = normalize(cameraPosition - vWorld);
        // parallax in the pane's own plane
        vec3 n = normalize(vNormalW);
        vec3 t = normalize(cross(vec3(0.0, 1.0, 0.0), n));
        vec3 b = cross(n, t);
        vec2 par = -vec2(dot(view, t), dot(view, b)) / max(dot(view, n), 0.2) * depth * 0.25;
        vec2 cuv = vUv * 0.8 + 0.1 + par;
        vec2 duv = vec2(vUv.x * aspect, vUv.y);
        vec3 a = drops(duv, 38.0, 0.24);
        vec3 bb = drops(duv + 3.1, 70.0, 0.3);
        vec3 r = runners(vec2(vUv.x * aspect * 0.8, vUv.y));
        vec2 lens = a.xy * 0.018 + bb.xy * 0.01 + r.xy * 0.02;
        float mask = max(max(a.z, bb.z), r.z);
        vec3 col = texture2D(tCity, cuv - lens).rgb;
        vec3 inDrop = texture2D(tCity, cuv - lens * 3.0).rgb * 1.15;
        col = mix(col, inDrop, mask * 0.6);
        col *= 1.0 - smoothstep(0.55, 1.0, length(a.xy)) * a.z * 0.2;
        col = mix(col, vec3(0.06, 0.08, 0.075), smoothstep(0.3, 0.0, vUv.y) * fogAmt);
        gl_FragColor = vec4(col * brightness * tint, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.userData.tick = t => (mat.uniforms.time.value = t);
  return mesh;
}
