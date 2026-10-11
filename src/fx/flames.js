// Firelight: every torch, brazier, campfire and hearth in a cell gets a procedural flame (noise-driven,
// camera-facing, licking upward), a soft glow halo, and a warm pool of light on the ground beneath it.
// Street lanterns get halos and pools too. Each layer is a single instanced draw call.
import * as THREE from 'three';

const NOISE = /* glsl */`
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm3(vec2 p) { return vn(p) * 0.55 + vn(p * 2.03 + 1.7) * 0.3 + vn(p * 4.1 + 3.1) * 0.15; }
`;

// ------------------------------------------------------------------ flames
const flameVert = /* glsl */`
attribute vec3 iPos;
attribute vec2 iSize;
attribute float iSeed;
uniform float uTime;
uniform vec3 uDrift;
varying vec2 vUv;
varying float vSeed;
void main() {
  vUv = uv;
  vSeed = iSeed;
  // instances sit in the mesh's frame (identity for the static firelight, a hand for a carried torch);
  // the flame itself always rises straight up in world space
  vec3 base = (modelMatrix * vec4(iPos, 1.0)).xyz;
  vec2 size = iSize * length(modelMatrix[0].xyz);
  // cylindrical billboard: turn to face the camera around the vertical axis
  vec3 toCam = cameraPosition - base;
  toCam.y = 0.0;
  vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + 1e-5);
  float sway = sin(uTime * 2.3 + iSeed * 20.0) * 0.06 * uv.y * uv.y;
  vec3 wp = base + right * ((position.x + sway) * size.x) + vec3(0.0, position.y * size.y, 0.0);
  // a moving torch trails its flame
  wp += uDrift * uv.y * uv.y * size.y;
  // nudge toward the camera so walls behind a sconce don't slice the flame
  wp += normalize(toCam + 1e-5) * size.x * 0.25;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const flameFrag = /* glsl */`
uniform float uTime;
uniform float uBright;
uniform float uGhost;
varying vec2 vUv;
varying float vSeed;
${NOISE}
void main() {
  vec2 uv = vUv;
  float t = uTime * (1.3 + fract(vSeed * 7.3) * 0.5) + vSeed * 17.0;
  // turbulence rising through the flame
  float n = fbm3(vec2(uv.x * 3.2 + vSeed * 9.0, uv.y * 2.6 - t * 2.1));
  float n2 = fbm3(vec2(uv.x * 7.0 - vSeed * 3.0, uv.y * 6.0 - t * 3.6));
  float x = (uv.x - 0.5) * 2.0;
  x += (n - 0.5) * 0.9 * uv.y + (n2 - 0.5) * 0.25 * uv.y;
  float y = uv.y;
  // teardrop: wide and round at the base, tapering to licking tongues
  float w = mix(0.95, 0.06, pow(y, 0.9)) * (0.9 + 0.1 * sin(t * 3.0));
  float body = 1.0 - smoothstep(w * 0.35, w, abs(x));
  body *= smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(0.75, 1.0, y));
  float tongues = smoothstep(0.25, 0.7, n * 0.9 + n2 * 0.35 + (1.0 - y) * 0.75);
  float heat = body * tongues * (1.15 - y * 0.75);
  vec3 c = vec3(0.6, 0.07, 0.01);
  c = mix(c, vec3(1.0, 0.3, 0.03), smoothstep(0.06, 0.32, heat));
  c = mix(c, vec3(1.0, 0.6, 0.12), smoothstep(0.32, 0.62, heat));
  c = mix(c, vec3(1.0, 0.86, 0.5), smoothstep(0.72, 1.0, heat));
  // spectral fire: the same flame, burning cold blue-white
  c = mix(c, vec3(0.5, 0.72, 1.0) * (0.35 + heat * 0.9), uGhost);
  float a = smoothstep(0.02, 0.3, heat);
  gl_FragColor = vec4(c * uBright * (0.7 + heat * 0.95), a);
}`;

// ------------------------------------------------------------------ halos
const haloVert = /* glsl */`
attribute vec3 iPos;
attribute float iSize;
attribute vec3 iColor;
attribute float iNight;
attribute float iSeed;
uniform float uTime;
uniform float uNight;
varying vec2 vUv;
varying vec3 vColor;
varying float vI;
void main() {
  vUv = uv - 0.5;
  // lanterns glow only after dark; fires glow faintly by day and strongly at night
  float flick = 0.86 + 0.14 * sin(uTime * 9.0 + iSeed * 30.0) * sin(uTime * 5.3 + iSeed * 11.0);
  vI = mix(mix(0.12, 1.0, uNight), uNight, iNight) * flick;
  vColor = iColor;
  vec3 base = (modelMatrix * vec4(iPos, 1.0)).xyz;
  vec3 toCam = normalize(cameraPosition - base);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam) + 1e-5);
  vec3 up = cross(toCam, right);
  float s = iSize * length(modelMatrix[0].xyz) * (0.95 + 0.05 * flick);
  vec3 wp = base + toCam * s * 0.45 + (right * position.x + up * position.y) * s;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const haloFrag = /* glsl */`
uniform float uBright;
varying vec2 vUv;
varying vec3 vColor;
varying float vI;
void main() {
  float r = length(vUv) * 2.0;
  float g = exp(-r * r * 7.0) * 0.9 + exp(-r * 3.2) * 0.25;
  g *= 1.0 - smoothstep(0.8, 1.0, r);
  gl_FragColor = vec4(vColor * g * vI * uBright, 1.0);
}`;

// ------------------------------------------------------------------ light pools on the ground
const poolVert = /* glsl */`
attribute vec3 iPos;
attribute float iSize;
attribute vec3 iColor;
attribute float iNight;
attribute float iSeed;
uniform float uTime;
uniform float uNight;
varying vec2 vUv;
varying vec3 vColor;
varying float vI;
void main() {
  vUv = uv - 0.5;
  float flick = 0.8 + 0.2 * sin(uTime * 8.0 + iSeed * 30.0) * sin(uTime * 4.7 + iSeed * 7.0);
  vI = mix(mix(0.06, 1.0, uNight), uNight, iNight) * mix(flick, 1.0, iNight);
  vColor = iColor;
  vec3 wp = iPos + vec3(position.x, 0.0, -position.y) * iSize;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const poolFrag = /* glsl */`
uniform float uBright;
varying vec2 vUv;
varying vec3 vColor;
varying float vI;
void main() {
  float r = length(vUv) * 2.0;
  float g = pow(max(0.0, 1.0 - r), 2.2);
  gl_FragColor = vec4(vColor * g * vI * uBright, 1.0);
}`;

function instanced(base, attrs, count) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.attributes.position = base.attributes.position;
  g.attributes.uv = base.attributes.uv;
  for (const [name, size, data] of attrs) g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(data), size));
  g.instanceCount = count;
  return g;
}

const additive = (vertexShader, fragmentShader, uniforms, depthTest = true) => new THREE.ShaderMaterial({
  vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, depthTest,
  blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, forceSinglePass: true,
});

/**
 * Build the firelight for a cell from its flame emitters and night lights.
 * Returns { group, update(t, night) } or null if the cell has none.
 */
export function buildFirelight(cell) {
  const col = cell.collision;
  const flames = cell.emitters.filter((e) => e.kind === 'flame');
  const lanterns = cell.lights.filter((l) => l.night && !flames.some((f) => f.pos.distanceTo(l.pos) < 1.2));
  if (!flames.length && !lanterns.length) return null;
  const group = new THREE.Group();
  group.name = 'firelight';
  const uniforms = { uTime: { value: 0 }, uNight: { value: 1 }, uBright: { value: 1 } };

  // flames
  if (flames.length) {
    const P = [], S = [], R = [];
    for (const e of flames) {
      const w = e.size ?? Math.min(1.3, Math.max(0.4, 0.3 + e.rate * 0.035));
      e.flameSize = w;
      P.push(e.pos.x, e.pos.y - w * 0.12, e.pos.z);
      S.push(w, w * 2.1);
      R.push(Math.random());
    }
    const base = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    const m = new THREE.Mesh(instanced(base, [['iPos', 3, P], ['iSize', 2, S], ['iSeed', 1, R]], flames.length),
      additive(flameVert, flameFrag, { uTime: uniforms.uTime, uBright: { value: 1.0 }, uDrift: { value: new THREE.Vector3() }, uGhost: { value: 0 } }));
    m.frustumCulled = false;
    m.renderOrder = 7;
    group.add(m);
  }

  // halos and ground pools for every fire and lantern
  const hP = [], hS = [], hC = [], hN = [], hR = [];
  const pP = [], pS = [], pC = [], pN = [], pR = [];
  const warm = new THREE.Color();
  const addPool = (x, y, z, size, c, night, seed) => {
    // sample a ring around the light: pedestals, sconces and walls are "walkable" tops, so the floor is the
    // lowest level that most of the samples agree on, and the decal only goes down where that floor is flat
    const hs = [col.groundHeight(x, z, y + 0.4)];
    for (const r of [1.3, size * 0.4]) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) hs.push(col.groundHeight(x + dx * r, z + dz * r, y + 0.4));
    }
    const level = Math.min(...hs);
    if (y - level > 6) return;
    if (hs.filter((h) => h - level < 0.35).length < 6) return;
    pP.push(x, level + 0.04, z); pS.push(size); pC.push(c.r, c.g, c.b); pN.push(night); pR.push(seed);
  };
  for (const e of flames) {
    const w = e.flameSize;
    warm.set(e.color ?? 0xff7020).lerp(new THREE.Color(0xff9a40), 0.5);
    const seed = Math.random();
    hP.push(e.pos.x, e.pos.y + w * 0.75, e.pos.z); hS.push(w * 4.2); hC.push(warm.r * 0.9, warm.g * 0.75, warm.b * 0.6); hN.push(0); hR.push(seed);
    addPool(e.pos.x, e.pos.y, e.pos.z, Math.min(16, 5 + w * 7), new THREE.Color(0.55, 0.28, 0.08), 0, seed);
  }
  for (const l of lanterns) {
    const seed = Math.random();
    warm.copy(l.color);
    hP.push(l.pos.x, l.pos.y, l.pos.z); hS.push(1.7); hC.push(warm.r * 0.75, warm.g * 0.62, warm.b * 0.45); hN.push(1); hR.push(seed);
    addPool(l.pos.x, l.pos.y, l.pos.z, 7.5, new THREE.Color(0.42, 0.26, 0.1), 1, seed);
  }
  const quad = new THREE.PlaneGeometry(1, 1);
  if (hP.length) {
    const halos = new THREE.Mesh(instanced(quad, [['iPos', 3, hP], ['iSize', 1, hS], ['iColor', 3, hC], ['iNight', 1, hN], ['iSeed', 1, hR]], hS.length),
      additive(haloVert, haloFrag, { uTime: uniforms.uTime, uNight: uniforms.uNight, uBright: { value: 0.45 } }));
    halos.frustumCulled = false;
    halos.renderOrder = 8;
    group.add(halos);
  }
  if (pP.length) {
    const pools = new THREE.Mesh(instanced(quad, [['iPos', 3, pP], ['iSize', 1, pS], ['iColor', 3, pC], ['iNight', 1, pN], ['iSeed', 1, pR]], pS.length),
      additive(poolVert, poolFrag, { uTime: uniforms.uTime, uNight: uniforms.uNight, uBright: { value: 0.55 } }));
    pools.material.polygonOffset = true;
    pools.material.polygonOffsetFactor = -4;
    pools.frustumCulled = false;
    pools.renderOrder = 2;
    group.add(pools);
  }
  return {
    group,
    flames,
    update(t, night) {
      uniforms.uTime.value = t;
      uniforms.uNight.value = night;
    },
  };
}

/**
 * A single flame with its glow, for something carried: the flame base sits at the group's origin and
 * follows it. userData.uniforms holds uTime, uNight and uDrift (world-space lean, e.g. from movement).
 */
export function buildCarriedFlame(w, { halo = 3.2, color = 0xff8a30, ghost = 0 } = {}) {
  const uniforms = { uTime: { value: 0 }, uNight: { value: 1 }, uDrift: { value: new THREE.Vector3() }, uGhost: { value: ghost } };
  const g = new THREE.Group();
  const seed = Math.random();
  // two interleaved tongues make a bushier, livelier fire than one
  const flame = new THREE.Mesh(
    instanced(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), [
      ['iPos', 3, [0, -w * 0.12, 0, w * 0.18, -w * 0.15, w * 0.05]],
      ['iSize', 2, [w * 1.2, w * 2.0, w * 0.85, w * 1.55]],
      ['iSeed', 1, [seed, (seed + 0.37) % 1]],
    ], 2),
    additive(flameVert, flameFrag, { uTime: uniforms.uTime, uBright: { value: 1.0 }, uDrift: uniforms.uDrift, uGhost: uniforms.uGhost }));
  flame.frustumCulled = false;
  flame.renderOrder = 7;
  g.add(flame);
  g.userData.flameBright = flame.material.uniforms.uBright;
  if (halo > 0) {
    const c = new THREE.Color(color);
    const glow = new THREE.Mesh(
      instanced(new THREE.PlaneGeometry(1, 1), [['iPos', 3, [0, w * 0.75, 0]], ['iSize', 1, [w * halo]], ['iColor', 3, [c.r * 0.9, c.g * 0.75, c.b * 0.6]], ['iNight', 1, [0]], ['iSeed', 1, [seed]]], 1),
      additive(haloVert, haloFrag, { uTime: uniforms.uTime, uNight: uniforms.uNight, uBright: { value: 0.45 } }));
    glow.frustumCulled = false;
    glow.renderOrder = 8;
    g.add(glow);
    g.userData.haloBright = glow.material.uniforms.uBright;
  }
  g.userData.uniforms = uniforms;
  return g;
}
