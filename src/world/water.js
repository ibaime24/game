// Water: a planar-reflection lake (overworld) and a cheap fresnel shader (fallback).
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { pnoise } from './texgen.js';

function waterNormals() {
  const S = 256;
  const h = pnoise(S, 8, 404, 5, 0.55);
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    const dx = (h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)]) * 6;
    const dy = (h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x]) * 6;
    const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
    data[i * 4] = (-dx * inv * 0.5 + 0.5) * 255;
    data[i * 4 + 1] = (-dy * inv * 0.5 + 0.5) * 255;
    data[i * 4 + 2] = (inv * 0.5 + 0.5) * 255;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Planar-reflection water. hide: objects to hide while rendering the mirror (grass, particles). */
export function createReflectiveWater(size, level, hide = () => []) {
  const geo = new THREE.PlaneGeometry(size, size);
  const water = new Water(geo, {
    textureWidth: 640, textureHeight: 640,
    waterNormals: waterNormals(),
    sunDirection: new THREE.Vector3(0, 1, 0),
    sunColor: 0xffffff,
    waterColor: 0x0f2a33,
    distortionScale: 2.2,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = level;
  water.material.uniforms.size.value = 3.2;
  water.renderOrder = 1;
  const baseRender = water.onBeforeRender;
  let frame = 0, lastEye = new THREE.Vector3(1e9, 0, 0);
  water.onBeforeRender = function (renderer, scene, camera, ...rest) {
    // the mirror is expensive: refresh every other frame unless the camera moved a lot
    frame++;
    if (globalThis.__game && globalThis.__game.reflectionsOn === false) return;
    const moved = lastEye.distanceToSquared(camera.position) > 0.25;
    if (!moved && frame % 2) return;
    // far from the lake the reflection is a sliver under heavy haze: refresh rarely
    const far = Math.hypot(camera.position.x - 260, camera.position.z - 260) > 520;
    if (far && frame % 30) return;
    lastEye.copy(camera.position);
    const hidden = hide().filter((o) => o.visible);
    for (const o of hidden) o.visible = false;
    baseRender.call(this, renderer, scene, camera, ...rest);
    for (const o of hidden) o.visible = true;
  };
  water.userData.update = (t, sky) => {
    const u = water.material.uniforms;
    u.time.value = t * 0.6;
    if (sky) {
      u.sunDirection.value.copy(sky.sunDir);
      u.sunColor.value.copy(sky.sunColor).multiplyScalar(sky.sunDir.y > 0 ? 0.9 : 0.12);
      u.waterColor.value.setHex(0x12303a).lerp(sky.fogColor, 0.12).multiplyScalar(0.6 + 0.4 * (1 - sky.night));
    }
  };
  return water;
}

const vert = /* glsl */`
uniform float uTime;
varying vec3 vWorld;
varying float vFogDepth;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.y += sin(wp.x * 0.15 + uTime * 1.1) * 0.05 + cos(wp.z * 0.12 + uTime * 0.9) * 0.05;
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */`
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uOpacity;
uniform float uEmissive;
varying vec3 vWorld;
varying float vFogDepth;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float waves(vec2 p) {
  float t = uTime;
  return vnoise(p * 0.35 + vec2(t * 0.25, t * 0.15)) * 0.5
       + vnoise(p * 0.9 - vec2(t * 0.35, -t * 0.2)) * 0.3
       + vnoise(p * 2.3 + vec2(-t * 0.5, t * 0.45)) * 0.2;
}
void main() {
  vec2 p = vWorld.xz;
  float e = 0.15;
  float h0 = waves(p);
  vec3 n = normalize(vec3(waves(p - vec2(e, 0.0)) - waves(p + vec2(e, 0.0)), 0.9, waves(p - vec2(0.0, e)) - waves(p + vec2(0.0, e))));
  vec3 v = normalize(cameraPosition - vWorld);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 r = reflect(-v, n);
  vec3 sky = mix(uSkyHorizon, uSkyTop, clamp(r.y, 0.0, 1.0));
  vec3 base = mix(uShallow, uDeep, clamp(h0, 0.0, 1.0));
  vec3 col = mix(base, sky * 0.65, clamp(fres * 0.75, 0.0, 1.0));
  float spec = pow(max(dot(r, uSunDir), 0.0), 220.0);
  col += uSunColor * spec * 1.2;
  col += base * uEmissive;
  float fogF = smoothstep(uFogNear, uFogFar, vFogDepth);
  col = mix(col, uFogColor, fogF);
  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createWater(size = 1600, level = 0, opts = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(opts.deep ?? 0x0c2a34) },
    uShallow: { value: new THREE.Color(opts.shallow ?? 0x2a5a5a) },
    uSkyTop: { value: new THREE.Color(0x4070b0) },
    uSkyHorizon: { value: new THREE.Color(0xb0c8e0) },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color(0xffffff) },
    uFogColor: { value: new THREE.Color(0xb0c4d8) },
    uFogNear: { value: 100 },
    uFogFar: { value: 1000 },
    uOpacity: { value: opts.opacity ?? 0.88 },
    uEmissive: { value: opts.emissive ?? 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: true,
  });
  const geo = new THREE.PlaneGeometry(size, size, 64, 64);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = level;
  mesh.renderOrder = 1;
  mesh.userData.update = (t, sky, fog) => {
    uniforms.uTime.value = t;
    if (sky) {
      uniforms.uSkyTop.value.copy(sky.uniforms.uTop.value);
      uniforms.uSkyHorizon.value.copy(sky.uniforms.uHorizon.value);
      uniforms.uSunDir.value.copy(sky.sunDir);
      uniforms.uSunColor.value.copy(sky.sunColor).multiplyScalar(sky.sunDir.y > 0 ? 1 : 0.15);
    }
    if (fog) {
      uniforms.uFogColor.value.copy(fog.color);
      uniforms.uFogNear.value = fog.near;
      uniforms.uFogFar.value = fog.far;
    }
  };
  return mesh;
}
