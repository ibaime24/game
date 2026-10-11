// Overworld weather: clear, cloudy, overcast, rain, thunderstorms and morning fog.
// Weather changes every few in-game hours and blends smoothly; rain is a field of streaks
// that follows the camera and falls in the vertex shader.
import * as THREE from 'three';

const KINDS = {
  clear: { overcast: 0, rain: 0, fog: 0 },
  cloudy: { overcast: 0.45, rain: 0, fog: 0.1 },
  overcast: { overcast: 0.8, rain: 0, fog: 0.25 },
  rain: { overcast: 0.95, rain: 0.8, fog: 0.4 },
  storm: { overcast: 1, rain: 1, fog: 0.5, thunder: true },
  fog: { overcast: 0.55, rain: 0, fog: 1 },
};
// [kind, weight]
const TABLE = [['clear', 5], ['cloudy', 4], ['overcast', 2], ['rain', 2], ['storm', 0.7], ['fog', 1]];

const RAIN_N = 8000, BOX = 40, HEIGHT = 26;
const SNOW_N = 6000, SBOX = 48, SHEIGHT = 22;

export class Weather {
  constructor(scene) {
    this.kind = 'clear';
    this.cur = { overcast: 0, rain: 0, fog: 0 };
    this.nextChange = 4; // in-game hours until the next roll
    this.flash = 0;
    this.thunderT = 8;
    const pos = new Float32Array(RAIN_N * 2 * 3);
    const seed = new Float32Array(RAIN_N * 2);
    for (let i = 0; i < RAIN_N; i++) {
      const x = (Math.random() - 0.5) * BOX, y = Math.random() * HEIGHT, z = (Math.random() - 0.5) * BOX;
      pos.set([x, y, z, x, y, z], i * 6);
      seed[i * 2] = seed[i * 2 + 1] = Math.random();
    }
    const end = new Float32Array(RAIN_N * 2);
    for (let i = 0; i < RAIN_N; i++) end[i * 2 + 1] = 1;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.uniforms = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uAmount: { value: 0 }, uColor: { value: new THREE.Color(0xaab4c0) } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        attribute float aSeed; attribute float aEnd;
        uniform float uTime; uniform vec3 uCam; uniform float uAmount;
        varying float vA;
        void main() {
          vec3 p = position;
          float speed = 16.0 + aSeed * 6.0;
          p.y = mod(p.y - uTime * speed, ${HEIGHT.toFixed(1)});
          // wrap the field around the camera so it never runs out
          p.x = mod(p.x - uCam.x + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)} + uCam.x;
          p.z = mod(p.z - uCam.z + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)} + uCam.z;
          p.y += uCam.y - 8.0;
          p.y += aEnd * 0.55;
          p.x += aEnd * 0.06;
          vA = step(aSeed, uAmount) * (0.35 + aEnd * 0.4);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor; varying float vA;
        void main() { if (vA <= 0.0) discard; gl_FragColor = vec4(uColor, vA); }`,
    });
    this.rainMesh = new THREE.LineSegments(g, mat);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.renderOrder = 5;
    this.rainMesh.visible = false;
    scene.add(this.rainMesh);

    // snow: soft round flakes drifting down and sideways, wrapped around the camera like the rain
    const sp = new Float32Array(SNOW_N * 3), ss = new Float32Array(SNOW_N);
    for (let i = 0; i < SNOW_N; i++) {
      sp.set([(Math.random() - 0.5) * SBOX, Math.random() * SHEIGHT, (Math.random() - 0.5) * SBOX], i * 3);
      ss[i] = Math.random();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
    this.snowUniforms = { uTime: this.uniforms.uTime, uCam: this.uniforms.uCam, uAmount: { value: 0 }, uWind: { value: new THREE.Vector2(0.6, 0.25) }, uScale: { value: 400 } };
    this.snowMesh = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.snowUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        attribute float aSeed;
        uniform float uTime; uniform vec3 uCam; uniform float uAmount; uniform vec2 uWind; uniform float uScale;
        varying float vA;
        void main() {
          vec3 p = position;
          float fall = 1.1 + aSeed * 1.3;
          p.y = mod(p.y - uTime * fall, ${SHEIGHT.toFixed(1)});
          // each flake tumbles on its own little circle as the wind carries it
          float ph = aSeed * 40.0 + uTime * (0.6 + aSeed);
          p.x += uWind.x * uTime + sin(ph) * 0.45;
          p.z += uWind.y * uTime + cos(ph * 0.8) * 0.45;
          p.x = mod(p.x - uCam.x + ${(SBOX / 2).toFixed(1)}, ${SBOX.toFixed(1)}) - ${(SBOX / 2).toFixed(1)} + uCam.x;
          p.z = mod(p.z - uCam.z + ${(SBOX / 2).toFixed(1)}, ${SBOX.toFixed(1)}) - ${(SBOX / 2).toFixed(1)} + uCam.z;
          p.y += uCam.y - 7.0;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          gl_PointSize = (0.05 + aSeed * 0.05) * uScale / max(d, 0.5);
          vA = step(aSeed, uAmount) * smoothstep(${(SBOX / 2).toFixed(1)}, ${(SBOX / 2 - 8).toFixed(1)}, length(p.xz - uCam.xz)) * smoothstep(0.3, 1.2, d);
        }`,
      fragmentShader: /* glsl */`
        varying float vA;
        void main() {
          if (vA <= 0.0) discard;
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.35, r) * vA * 0.85;
          gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a);
        }`,
    }));
    this.snowMesh.frustumCulled = false;
    this.snowMesh.renderOrder = 5;
    this.snowMesh.visible = false;
    scene.add(this.snowMesh);
  }

  set(kind) {
    if (KINDS[kind]) this.kind = kind;
  }

  roll() {
    let total = 0;
    for (const [, w] of TABLE) total += w;
    let r = Math.random() * total;
    for (const [k, w] of TABLE) { r -= w; if (r <= 0) return k; }
    return 'clear';
  }

  /** dtHours: in-game hours elapsed. outdoors: whether to show rain. snowy: 0..1, how far into the snows the camera is. */
  update(dt, dtHours, hours, cam, t, outdoors, audio, snowy = 0, snowBase = 0.18) {
    this.nextChange -= dtHours;
    if (this.nextChange <= 0) {
      let k = this.roll();
      // mist settles in the early morning
      const hr = hours % 24;
      if (hr > 4 && hr < 8 && Math.random() < 0.35) k = 'fog';
      this.kind = k;
      this.nextChange = 3 + Math.random() * 6;
    }
    const target = KINDS[this.kind];
    const rate = Math.min(1, dt * 0.08);
    for (const key of ['overcast', 'rain', 'fog']) this.cur[key] += (target[key] - this.cur[key]) * rate;
    // thunder & lightning
    this.flash = Math.max(0, this.flash - dt * 3);
    if (target.thunder && outdoors) {
      this.thunderT -= dt;
      if (this.thunderT <= 0) {
        this.thunderT = 7 + Math.random() * 16;
        this.flash = 1;
        setTimeout(() => audio?.play('thunder', 0.6 + Math.random() * 0.4), 300 + Math.random() * 2500);
      }
    }
    const u = this.uniforms;
    u.uTime.value = t;
    u.uCam.value.copy(cam);
    // in the snows the rain comes down as snow, and a light fall drifts down even on clear days
    const sn = outdoors ? snowy : 0;
    u.uAmount.value = outdoors ? this.cur.rain * (1 - sn) : 0;
    this.rainMesh.visible = outdoors && this.cur.rain * (1 - sn) > 0.02;
    const snowAmt = sn * Math.min(1, Math.max(0, snowBase + (snowBase > 0 ? this.cur.overcast * 0.45 + this.cur.rain * 0.7 : this.cur.rain * 0.5)));
    this.snowUniforms.uAmount.value = snowAmt;
    this.snowUniforms.uWind.value.set(0.5 + this.cur.rain * 2.2, 0.2 + this.cur.rain * 0.8);
    this.snowMesh.visible = snowAmt > 0.01;
    this.snowy = sn;
    audio?.setRain(this.cur.rain * (1 - sn), !outdoors);
    return this.cur;
  }

  toJSON() { return { kind: this.kind, next: this.nextChange }; }
  load(o) {
    if (!o) return;
    this.kind = KINDS[o.kind] ? o.kind : 'clear';
    this.nextChange = o.next ?? 4;
    Object.assign(this.cur, KINDS[this.kind]);
  }
}
