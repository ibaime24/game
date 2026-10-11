// Sky dome with day/night cycle, clouds, stars and Tamriel's two moons.
import * as THREE from 'three';

const KEYS = [
  // hour, zenith, horizon, light colour, light intensity, ambient sky, ambient ground, ambient intensity, fog
  // night is a deep, saturated storybook indigo lit by a cold blue moon
  [0, 0x140c50, 0x4430ac, 0xa4aeff, 1.25, 0x5060b6, 0x26382c, 1.2, 0x221c64],
  [4.5, 0x170f5a, 0x4a34b2, 0xa4aeff, 1.15, 0x5060b6, 0x26382c, 1.15, 0x261f6a],
  [6, 0x24407a, 0xe8a070, 0xffb070, 1.5, 0x5a6c96, 0x3a3220, 0.65, 0xc8a080],
  [7.5, 0x2a62b8, 0xbcd0e6, 0xffe6c0, 2.9, 0x86a6d6, 0x4a4a2c, 0.85, 0xb4c8e0],
  [12, 0x1f5cc0, 0xa8c6ea, 0xfff6e4, 3.4, 0x8cb0e6, 0x50502e, 0.95, 0xa8c2e2],
  [17, 0x2560b4, 0xb8cce4, 0xffecd0, 3.0, 0x88a8da, 0x4c4a2c, 0.9, 0xb0c4de],
  [19, 0x2a3c78, 0xf2945a, 0xff9a5a, 1.6, 0x6a6a94, 0x3a2e1e, 0.7, 0xcc8a66],
  [20.2, 0x1c185e, 0x6a44a8, 0x9a90e8, 0.95, 0x4a46a0, 0x181c18, 0.9, 0x2e2a72],
  [21.5, 0x160e54, 0x4632b0, 0xa4aeff, 1.2, 0x5060b6, 0x26382c, 1.2, 0x241e68],
  [24, 0x140c50, 0x4430ac, 0xa4aeff, 1.25, 0x5060b6, 0x26382c, 1.2, 0x221c64],
];

const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function lerpHex(a, b, t, out) {
  tmpA.setHex(a); tmpB.setHex(b);
  return out.copy(tmpA).lerp(tmpB, t);
}

const vert = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const frag = /* glsl */`
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uMoonDir;
uniform float uNight;
uniform float uTime;
uniform float uTint;
uniform float uCloud;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; }
  return s;
}

// directions -> a cube-map face and its uv, so stars sit evenly over the sky without polar pinching
vec2 faceUV(vec3 d, out float face) {
  vec3 a = abs(d);
  if (a.x >= a.y && a.x >= a.z) { face = d.x > 0.0 ? 0.0 : 1.0; return d.zy / a.x; }
  if (a.y >= a.z) { face = d.y > 0.0 ? 2.0 : 3.0; return d.xz / a.y; }
  face = d.z > 0.0 ? 4.0 : 5.0; return d.xy / a.z;
}

// one layer of stars: a star in some grid cells, a soft core, and four-point diffraction spikes on the bright ones
vec3 starLayer(vec3 d, float N, float keep, float bright, float spikes, float salt) {
  float f;
  vec2 uv = faceUV(d, f) * N;
  vec2 cell = floor(uv);
  vec2 k = cell + f * 97.13 + salt;
  float h = hash(k);
  if (h > keep) return vec3(0.0);
  vec2 off = (vec2(hash(k + 3.1), hash(k + 7.7)) - 0.5) * 0.5;
  vec2 q = fract(uv) - 0.5 - off;
  float mag = pow(hash(k + 11.3), 4.0);
  float tw = 0.55 + 0.45 * sin(uTime * (1.3 + h * 5.0) + h * 91.0) * sin(uTime * (0.7 + h * 2.3) + h * 13.0);
  float r2 = dot(q, q);
  float core = exp(-r2 * mix(900.0, 260.0, mag));
  float glow = exp(-r2 * 60.0) * 0.12 * mag;
  float sp = (exp(-abs(q.y) * 160.0) * exp(-abs(q.x) * 7.0) + exp(-abs(q.x) * 160.0) * exp(-abs(q.y) * 7.0)) * spikes * smoothstep(0.25, 1.0, mag);
  vec3 tint = mix(vec3(0.72, 0.8, 1.0), vec3(1.0, 0.92, 0.78), hash(k + 5.0));
  return tint * (core * (0.35 + mag * 2.6) + glow + sp * 1.6) * tw * bright;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float night = uNight;
  vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.45));
  // at night a luminous violet band hugs the horizon
  col += uHorizon * vec3(0.55, 0.35, 0.9) * exp(-max(h, 0.0) * 9.0) * 0.55 * night;
  if (h < 0.0) col = mix(uHorizon, uHorizon * 0.55, clamp(-h * 4.0, 0.0, 1.0));

  // sun
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(s, 1200.0) * 40.0 + pow(s, 40.0) * 0.6 + pow(s, 8.0) * 0.25 + pow(s, 2.0) * 0.08) * (1.0 - night * 0.9);

  // the Milky Way: a faint, mottled violet river across the sky
  float band = 0.0;
  if (night > 0.01 && h > -0.05) {
    vec3 nb = normalize(vec3(0.42, 0.38, 0.82));
    float bd = dot(d, nb);
    band = exp(-bd * bd * 30.0) * (0.35 + 0.65 * fbm(d.xz * 7.0 / (abs(d.y) + 0.4) + 3.0));
    col += vec3(0.32, 0.28, 0.62) * band * 0.22 * night;
  }

  // stars: many small, a few large with spikes, more of them inside the Milky Way
  vec3 stars = vec3(0.0);
  if (night > 0.01 && h > -0.05) {
    float vis = smoothstep(0.35, 0.85, night) * smoothstep(-0.05, 0.12, h);
    stars += starLayer(d, 95.0, 0.16 + band * 0.25, 1.0, 0.0, 0.0);
    stars += starLayer(d, 40.0, 0.07 + band * 0.05, 1.6, 1.0, 17.0);
    stars += starLayer(d, 14.0, 0.05, 2.2, 1.0, 41.0);
    stars *= vis;
  }

  // the moons: Masser large and pale silver, Secunda small and bright, both haloed
  vec3 m1 = normalize(uMoonDir);
  vec3 m2 = normalize(uMoonDir + vec3(0.2, 0.1, -0.12));
  float md1 = max(dot(d, m1), 0.0), md2 = max(dot(d, m2), 0.0);
  float moonVis = clamp(night + 0.2, 0.0, 1.0);
  vec3 halo = vec3(0.6, 0.6, 1.0) * (pow(md1, 1400.0) * 0.45 + pow(md1, 160.0) * 0.13 + pow(md1, 16.0) * 0.07 + pow(md1, 3.0) * 0.03);
  halo += vec3(0.7, 0.75, 1.0) * pow(md2, 3000.0) * 0.12;
  col += halo * moonVis;
  vec3 moonCol = vec3(0.0); float moonA = 0.0;
  {
    float R = 0.045;
    vec3 t1 = normalize(cross(m1, vec3(0.0, 1.0, 0.0)));
    vec3 t2 = cross(t1, m1);
    vec2 lc = vec2(dot(d, t1), dot(d, t2)) / R;
    float r = length(lc);
    if (dot(d, m1) > 0.0 && r < 1.05) {
      float maria = smoothstep(0.48, 0.68, fbm(lc * 2.2 + 4.0));
      float crater = fbm(lc * 7.0 + 9.0);
      float pits = smoothstep(0.62, 0.78, vnoise(lc * 11.0 + 2.0));
      float limb = 0.62 + 0.38 * pow(max(0.0, 1.0 - r * r), 0.35);
      vec3 c = mix(vec3(1.0, 0.95, 0.96), vec3(0.62, 0.62, 0.86), maria * 0.75);
      c *= (1.0 - maria * 0.18 + (crater - 0.5) * 0.22 - pits * 0.08) * limb;
      // bright enough to glow, held under the bloom threshold so the seas stay legible
      moonCol = c * 0.7;
      moonA = smoothstep(1.02, 0.97, r);
    }
    float R2 = 0.018;
    vec3 u1 = normalize(cross(m2, vec3(0.0, 1.0, 0.0)));
    vec3 u2 = cross(u1, m2);
    vec2 lc2 = vec2(dot(d, u1), dot(d, u2)) / R2;
    float r2 = length(lc2);
    if (dot(d, m2) > 0.0 && r2 < 1.05 && moonA < 0.5) {
      moonCol = vec3(0.86, 0.9, 1.0) * (0.8 + 0.2 * vnoise(lc2 * 5.0)) * 1.15;
      moonA = smoothstep(1.02, 0.94, r2);
    }
  }

  // clouds
  float cov = 0.0;
  if (h > -0.02) {
    float hc = max(h, 0.0);
    vec2 uv = d.xz / (hc + 0.09) * 0.75 + vec2(uTime * 0.003, uTime * 0.0015);
    float n = fbm(uv);
    float n2 = fbm(uv * 2.1 + 7.0) * 0.5;
    float dens = n * 0.75 + n2 * 0.35;
    // at night the clouds thin into soft drifting wisps
    cov = smoothstep(0.44 - uCloud * 0.2 - night * 0.03, 0.74 + night * 0.04, dens);
    float day = 1.0 - night * 0.92;
    // self-shadowing: compare density toward the light (the sun by day, Masser by night)
    vec3 L = night > 0.5 ? m1 : uSunDir;
    vec2 off = normalize(L.xz + 1e-4) * 0.08;
    float toward = fbm(uv + off) * 0.75 + n2 * 0.35;
    float lit = clamp(0.62 + (dens - toward) * 5.0, 0.25, 1.15);
    vec3 shadowCol = mix(uHorizon, uTop, 0.35) * 0.95;
    vec3 litCol = mix(vec3(1.0, 0.98, 0.95), uSunColor, 0.35) * 1.05;
    vec3 dayCloud = mix(shadowCol, litCol, lit);
    dayCloud += uSunColor * pow(s, 6.0) * (1.0 - cov) * 1.2;
    // moonlit: violet-blue bodies, silver edges near the moon
    vec3 nShadow = mix(uTop, uHorizon, 0.55) * vec3(0.95, 0.85, 1.1) * 1.05;
    vec3 nLit = mix(uHorizon * 2.1, vec3(0.46, 0.44, 0.98), 0.35);
    vec3 nightCloud = mix(nShadow, nLit, smoothstep(0.35, 1.1, lit));
    nightCloud += vec3(0.75, 0.78, 1.0) * pow(md1, 22.0) * (0.35 + (1.0 - cov) * 0.9);
    vec3 cloudCol = mix(dayCloud, nightCloud, smoothstep(0.2, 0.8, night));
    float fade = smoothstep(-0.02, 0.16, h);
    float a = cov * fade * mix(0.92, 0.84, night);
    // stars and moons shine through thin cloud, vanish behind thick cloud
    col += stars * (1.0 - a);
    col = mix(col, moonCol, moonA * (1.0 - a * 0.85));
    col = mix(col, cloudCol, a);
    // cirrus streaks high up
    vec2 cuv = d.xz / (hc + 0.25) * vec2(0.6, 2.4) + vec2(uTime * 0.002, 0.0);
    float ci = smoothstep(0.55, 0.8, fbm(cuv * 1.4)) * smoothstep(0.1, 0.4, h) * (1.0 - cov);
    col = mix(col, mix(vec3(1.0) * day + uSunColor * 0.1, nLit, night), ci * mix(0.35, 0.06, night));
  } else {
    col += stars;
  }

  // Oblivion tint
  col = mix(col, vec3(0.55, 0.08, 0.02) + col * vec3(0.4, 0.1, 0.05), uTint * (0.6 + 0.3 * h));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Sky {
  constructor() {
    this.uniforms = {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uNight: { value: 0 },
      uTime: { value: 0 },
      uTint: { value: 0 },
      uCloud: { value: 0.5 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;

    this.sunDir = new THREE.Vector3();
    this.lightDir = new THREE.Vector3();
    this.sunColor = new THREE.Color();
    this.sunIntensity = 1;
    this.ambSky = new THREE.Color();
    this.ambGround = new THREE.Color();
    this.ambIntensity = 1;
    this.fogColor = new THREE.Color();
    this.night = 0;
  }

  update(hours, camPos, t, tint = 0, overcast = 0) {
    const hr = ((hours % 24) + 24) % 24;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1][0] <= hr) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const f = (hr - a[0]) / (b[0] - a[0]);
    const u = this.uniforms;
    lerpHex(a[1], b[1], f, u.uTop.value);
    lerpHex(a[2], b[2], f, u.uHorizon.value);
    lerpHex(a[3], b[3], f, this.sunColor);
    this.sunIntensity = a[4] + (b[4] - a[4]) * f;
    lerpHex(a[5], b[5], f, this.ambSky);
    lerpHex(a[6], b[6], f, this.ambGround);
    this.ambIntensity = a[7] + (b[7] - a[7]) * f;
    lerpHex(a[8], b[8], f, this.fogColor);

    // sun arc: rises east (+x) at 6, zenith-ish at 12, sets west at 18
    const ang = ((hr - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(ang), Math.sin(ang) * 0.92, 0.32).normalize();
    // Masser rides a lower arc in the south-east, where you can see it over the trees
    const moonAng = ang + Math.PI * 0.95;
    u.uMoonDir.value.set(Math.cos(moonAng) * 0.85, Math.sin(moonAng) * 0.55 + 0.12, 0.62).normalize();
    this.night = THREE.MathUtils.clamp(-this.sunDir.y * 4 + 0.15, 0, 1);
    u.uNight.value = this.night;
    u.uSunDir.value.copy(this.sunDir);
    u.uSunColor.value.copy(this.sunColor);
    u.uTime.value = t;
    u.uTint.value = tint;
    // light comes from the sun by day, the moons by night
    if (this.sunDir.y > 0.02) this.lightDir.copy(this.sunDir);
    else this.lightDir.copy(u.uMoonDir.value);
    if (this.lightDir.y < 0.15) { this.lightDir.y = 0.15; this.lightDir.normalize(); }

    // weather: heavy cloud greys the sky, dims the sun and flattens the light
    u.uCloud.value = 0.5 + overcast * 0.9;
    if (overcast > 0) {
      const grey = new THREE.Color().setScalar(0.35 + (1 - this.night) * 0.25);
      const lum = (c) => c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
      for (const c of [u.uTop.value, u.uHorizon.value, this.fogColor]) {
        const l = lum(c);
        c.lerp(new THREE.Color(l, l, l * 1.04).lerp(grey, 0.3), overcast * 0.75);
      }
      this.sunIntensity *= 1 - overcast * 0.8;
      this.ambIntensity *= 1 + overcast * 0.25;
      this.ambSky.lerp(new THREE.Color(0x8a9098), overcast * 0.5);
      this.sunColor.lerp(new THREE.Color(0xb0b4b8), overcast * 0.5);
    }
    if (tint > 0) {
      const red = new THREE.Color(0x9a2a10);
      this.fogColor.lerp(red, tint * 0.8);
      this.sunColor.lerp(new THREE.Color(0xff7040), tint * 0.7);
      this.ambSky.lerp(new THREE.Color(0xa04020), tint * 0.6);
    }
    this.mesh.position.copy(camPos);
  }
}
