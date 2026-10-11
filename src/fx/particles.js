// GPU point-sprite particle pools: one additive (fire/magic), one alpha-blended (blood/smoke/dust).
import * as THREE from 'three';

// Shapes: 0 a soft round mote, 1 a four-point star glint (long thin rays, like the night sky's stars),
// 2 a six-armed snowflake, 3 a chunky retro pixel-diamond. Shaped particles spin as they live.
const vert = /* glsl */`
attribute float aSize;
attribute vec4 aColor;
attribute vec2 aShape;
varying vec4 vColor;
varying vec2 vShape;
uniform float uScale;
void main() {
  vColor = aColor;
  vShape = aShape;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  // shaped sparks right in front of the lens would balloon into blurry blobs: cap them and fade them out
  if (aShape.x > 0.5) gl_PointSize = min(gl_PointSize, 56.0);
  vColor.a *= smoothstep(0.35, 1.3, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const frag = /* glsl */`
varying vec4 vColor;
varying vec2 vShape;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float s = vShape.x;
  float a;
  if (s < 0.5) {
    float d = length(c) * 2.0;
    a = smoothstep(1.0, 0.0, d);
    a *= a;
  } else {
    float cs = cos(vShape.y), sn = sin(vShape.y);
    vec2 q = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs) * 2.0;
    if (s < 1.5) {
      // four-point star: a hot core and two long, thin, tapering rays
      float core = exp(-dot(q, q) * 18.0);
      float rays = exp(-abs(q.y) * 26.0) * (1.0 - smoothstep(0.0, 1.0, abs(q.x))) + exp(-abs(q.x) * 26.0) * (1.0 - smoothstep(0.0, 1.0, abs(q.y)));
      float diag = (exp(-abs(q.x + q.y) * 40.0) + exp(-abs(q.x - q.y) * 40.0)) * (1.0 - smoothstep(0.0, 0.45, length(q))) * 0.5;
      a = min(1.0, core * 1.4 + rays + diag);
    } else if (s < 2.5) {
      // snowflake: six arms with little side-branches, and a bright heart
      float ang = atan(q.y, q.x);
      float rr = length(q);
      float sector = mod(ang + 0.2618, 1.0472) - 0.5236;
      vec2 p = vec2(cos(sector), sin(sector)) * rr;
      float arm = exp(-abs(p.y) * 40.0) * (1.0 - smoothstep(0.75, 1.0, rr));
      float twig = exp(-abs(abs(p.y) - (p.x - 0.45) * 0.9) * 40.0) * step(0.45, p.x) * step(p.x, 0.75);
      a = min(1.0, arm + twig * 0.8 + exp(-rr * rr * 30.0));
    } else {
      // retro pixel: a crisp, chunky diamond with a stepped edge
      vec2 px = floor(abs(q) * 5.0 + 0.5) / 5.0;
      a = step(px.x + px.y, 0.8) * (0.75 + 0.25 * step(px.x + px.y, 0.4));
    }
  }
  if (vColor.a * a < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
}`;

class Pool {
  constructor(max, additive) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.base = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.life = new Float32Array(max);
    this.life0 = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.shape = new Float32Array(max * 2); // shape id, current rotation
    this.spin = new Float32Array(max);
    this.twinkle = new Float32Array(max);
    this.alive = 0;
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aColor', this.colAttr);
    geo.setAttribute('aSize', this.sizeAttr);
    this.shapeAttr = new THREE.BufferAttribute(this.shape, 2).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aShape', this.shapeAttr);
    geo.setDrawRange(0, 0);
    this.uniforms = { uScale: { value: 400 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  emit(p) {
    if (this.alive >= this.max) return;
    const i = this.alive++;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    this.vel[i * 3] = p.vx || 0; this.vel[i * 3 + 1] = p.vy || 0; this.vel[i * 3 + 2] = p.vz || 0;
    const c = p.color;
    this.base[i * 4] = c.r; this.base[i * 4 + 1] = c.g; this.base[i * 4 + 2] = c.b; this.base[i * 4 + 3] = p.alpha ?? 1;
    this.size0[i] = p.size ?? 0.3;
    this.grow[i] = p.grow ?? 0;
    this.life[i] = this.life0[i] = p.life ?? 1;
    this.grav[i] = p.gravity ?? 0;
    this.drag[i] = p.drag ?? 0;
    this.shape[i * 2] = SHAPES[p.shape] ?? 0;
    this.shape[i * 2 + 1] = p.rot ?? Math.random() * 6.28;
    this.spin[i] = p.spin ?? (p.shape ? (Math.random() - 0.5) * 3 : 0);
    this.twinkle[i] = p.twinkle ?? (p.shape === 'star' ? 8 + Math.random() * 10 : 0);
  }

  update(dt) {
    let i = 0;
    while (i < this.alive) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // swap-remove
        const j = --this.alive;
        if (i !== j) this._copy(j, i);
        continue;
      }
      const k = 1 - this.life[i] / this.life0[i];
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 2] *= d;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.size0[i] * (1 + this.grow[i] * k);
      const fade = k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9;
      this.col[i * 4] = this.base[i * 4];
      this.col[i * 4 + 1] = this.base[i * 4 + 1];
      this.col[i * 4 + 2] = this.base[i * 4 + 2];
      this.shape[i * 2 + 1] += this.spin[i] * dt;
      const tw = this.twinkle[i] ? 0.55 + 0.45 * Math.sin(this.life[i] * this.twinkle[i] + i) : 1;
      this.col[i * 4 + 3] = this.base[i * 4 + 3] * fade * tw;
      i++;
    }
    this.points.geometry.setDrawRange(0, this.alive);
    this.posAttr.needsUpdate = this.colAttr.needsUpdate = this.sizeAttr.needsUpdate = this.shapeAttr.needsUpdate = true;
  }

  _copy(from, to) {
    for (let c = 0; c < 3; c++) { this.pos[to * 3 + c] = this.pos[from * 3 + c]; this.vel[to * 3 + c] = this.vel[from * 3 + c]; }
    for (let c = 0; c < 4; c++) { this.base[to * 4 + c] = this.base[from * 4 + c]; this.col[to * 4 + c] = this.col[from * 4 + c]; }
    this.size[to] = this.size[from]; this.size0[to] = this.size0[from]; this.grow[to] = this.grow[from];
    this.life[to] = this.life[from]; this.life0[to] = this.life0[from];
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from];
    this.shape[to * 2] = this.shape[from * 2]; this.shape[to * 2 + 1] = this.shape[from * 2 + 1];
    this.spin[to] = this.spin[from]; this.twinkle[to] = this.twinkle[from];
  }

  clear() { this.alive = 0; this.points.geometry.setDrawRange(0, 0); }
}

const C = new THREE.Color();
const SHAPES = { dot: 0, star: 1, flake: 2, pixel: 3 };
const WHITE = new THREE.Color(1, 1, 1);

export class Particles {
  constructor(scene) {
    this.add = new Pool(4000, true);
    this.alpha = new Pool(2000, false);
    scene.add(this.add.points, this.alpha.points);
  }
  attach(scene) { scene.add(this.add.points, this.alpha.points); }
  setViewport(h) { this.add.uniforms.uScale.value = this.alpha.uniforms.uScale.value = h * 0.9; }
  clear() { this.add.clear(); this.alpha.clear(); }
  update(dt) { this.add.update(dt); this.alpha.update(dt); }

  emit(p, additive = true) { (additive ? this.add : this.alpha).emit(p); }

  burst(pos, kind, n = 12, color) {
    const r = Math.random;
    for (let i = 0; i < n; i++) {
      switch (kind) {
        case 'blood':
          C.setRGB(0.45 + r() * 0.2, 0.02, 0.02);
          this.alpha.emit({ x: pos.x, y: pos.y, z: pos.z, vx: (r() - 0.5) * 3, vy: r() * 3, vz: (r() - 0.5) * 3, gravity: 9, life: 0.6 + r() * 0.4, size: 0.12, color: C, alpha: 0.9 });
          break;
        case 'bone':
          C.setRGB(0.9, 0.88, 0.8);
          this.alpha.emit({ x: pos.x, y: pos.y, z: pos.z, vx: (r() - 0.5) * 3, vy: r() * 3, vz: (r() - 0.5) * 3, gravity: 9, life: 0.6, size: 0.08, color: C });
          break;
        case 'spark':
          C.setRGB(1, 0.85, 0.5);
          this.add.emit({ x: pos.x, y: pos.y, z: pos.z, vx: (r() - 0.5) * 6, vy: r() * 4, vz: (r() - 0.5) * 6, gravity: 12, life: 0.3 + r() * 0.3, size: 0.06, color: C });
          break;
        case 'fire': {
          C.set(color ?? 0xff6020);
          this.add.emit({ x: pos.x + (r() - 0.5) * 0.4, y: pos.y, z: pos.z + (r() - 0.5) * 0.4, vx: (r() - 0.5) * 5, vy: r() * 4, vz: (r() - 0.5) * 5, gravity: -1, drag: 2, life: 0.5 + r() * 0.5, size: 0.6 + r() * 0.6, grow: 1.2, color: C });
          break;
        }
        case 'flame': {
          C.set(color ?? 0xff7020);
          this.add.emit({ x: pos.x + (r() - 0.5) * 0.35, y: pos.y, z: pos.z + (r() - 0.5) * 0.35, vx: (r() - 0.5) * 0.3, vy: 1.2 + r() * 1.2, vz: (r() - 0.5) * 0.3, drag: 1, life: 0.45 + r() * 0.35, size: 0.28 + r() * 0.22, grow: -0.6, color: C });
          break;
        }
        case 'magic': {
          C.set(color ?? 0x80a0ff);
          const a = r() * Math.PI * 2, b = r() * Math.PI;
          // every magical burst glitters: soft motes, four-point star glints and the odd chunky pixel
          const sh = i % 3 === 0 ? 'star' : i % 4 === 1 ? 'pixel' : undefined;
          this.add.emit({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * Math.sin(b) * 3, vy: Math.cos(b) * 3, vz: Math.sin(a) * Math.sin(b) * 3, drag: 3, life: 0.6 + r() * 0.5, size: sh === 'star' ? 0.5 : sh ? 0.14 : 0.25, grow: -0.5, color: sh === 'star' ? C.clone().lerp(WHITE, 0.45) : C, shape: sh });
          break;
        }
        case 'heal': {
          C.set(color ?? 0x80ff90);
          const a = r() * Math.PI * 2, rad = 0.5 + r() * 0.3;
          this.add.emit({ x: pos.x + Math.cos(a) * rad, y: pos.y + r() * 1.6, z: pos.z + Math.sin(a) * rad, vy: 1 + r(), life: 1 + r() * 0.5, size: 0.18, color: C });
          break;
        }
        case 'dust':
          C.setRGB(0.6, 0.55, 0.45);
          this.alpha.emit({ x: pos.x + (r() - 0.5), y: pos.y, z: pos.z + (r() - 0.5), vx: (r() - 0.5) * 1, vy: r() * 0.6, vz: (r() - 0.5) * 1, drag: 1, life: 1.2, size: 0.6, grow: 1.5, color: C, alpha: 0.35 });
          break;
        case 'smoke':
          C.setRGB(0.15, 0.13, 0.12);
          this.alpha.emit({ x: pos.x + (r() - 0.5) * 0.5, y: pos.y, z: pos.z + (r() - 0.5) * 0.5, vx: (r() - 0.5) * 0.4, vy: 1 + r(), vz: (r() - 0.5) * 0.4, life: 3, size: 1, grow: 3, color: C, alpha: 0.35 });
          break;
        case 'splash':
          C.setRGB(0.8, 0.9, 1);
          this.alpha.emit({ x: pos.x, y: pos.y, z: pos.z, vx: (r() - 0.5) * 2, vy: 2 + r() * 2, vz: (r() - 0.5) * 2, gravity: 9, life: 0.6, size: 0.15, color: C, alpha: 0.7 });
          break;
        case 'butterfly': {
          // a fluttering speck of colour drifting over the flowers
          C.setHSL([0.0, 0.08, 0.14, 0.55, 0.62, 0.83, 0.92][Math.floor(r() * 7)], 0.85, 0.68);
          this.alpha.emit({ x: pos.x, y: pos.y + r() * 0.6, z: pos.z, vx: (r() - 0.5) * 1.2, vy: 0.15 + r() * 0.35, vz: (r() - 0.5) * 1.2, drag: 0.2, gravity: 0.05, life: 3 + r() * 2, size: 0.14, color: C, alpha: 0.95 });
          break;
        }
        case 'firefly': {
          C.setRGB(0.85, 1, 0.35);
          this.add.emit({ x: pos.x, y: pos.y + r() * 1.2, z: pos.z, vx: (r() - 0.5) * 0.5, vy: (r() - 0.5) * 0.25, vz: (r() - 0.5) * 0.5, drag: 0.1, life: 2 + r() * 2.5, size: 0.11, color: C });
          break;
        }
        case 'fountain': {
          C.setRGB(0.82, 0.92, 1);
          const a = r() * Math.PI * 2, sp = 1.4 + r() * 0.4;
          this.alpha.emit({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * sp * 0.55, vy: 2.6 + r() * 0.6, vz: Math.sin(a) * sp * 0.55, gravity: 7, life: 0.85, size: 0.12, grow: 0.6, color: C, alpha: 0.7 });
          break;
        }
        case 'fountain_low': {
          C.setRGB(0.82, 0.92, 1);
          const a = r() * Math.PI * 2;
          this.alpha.emit({ x: pos.x + Math.cos(a) * 1.0, y: pos.y, z: pos.z + Math.sin(a) * 1.0, vx: Math.cos(a) * 0.9, vy: 0.4, vz: Math.sin(a) * 0.9, gravity: 6, life: 0.55, size: 0.1, color: C, alpha: 0.6 });
          break;
        }
        case 'torchspark': {
          // a bright ember spat upward from a fire, drifting and winking out
          C.setRGB(1, 0.55 + r() * 0.35, 0.15 + r() * 0.15);
          this.add.emit({ x: pos.x + (r() - 0.5) * 0.3, y: pos.y, z: pos.z + (r() - 0.5) * 0.3, vx: (r() - 0.5) * 0.9, vy: 1.2 + r() * 1.8, vz: (r() - 0.5) * 0.9, drag: 0.8, gravity: -0.3, life: 0.7 + r() * 1.1, size: 0.045 + r() * 0.04, grow: -0.6, color: C });
          break;
        }
        case 'bubble': {
          C.set(color ?? 0xc8a0ff);
          this.add.emit({ x: pos.x + (r() - 0.5) * 0.6, y: pos.y, z: pos.z + (r() - 0.5) * 0.6, vx: 0, vy: 0.35 + r() * 0.3, vz: 0, life: 0.9, size: 0.09 + r() * 0.06, grow: 0.6, color: C });
          break;
        }
        case 'sparkle': {
          C.setHSL(r() < 0.5 ? 0.75 + r() * 0.1 : 0.12 + r() * 0.05, 0.9, 0.7);
          this.add.emit({ x: pos.x + (r() - 0.5) * 2, y: pos.y + (r() - 0.5) * 2, z: pos.z + (r() - 0.5) * 2, vx: (r() - 0.5) * 0.3, vy: -0.2 - r() * 0.3, vz: (r() - 0.5) * 0.3, life: 1.6 + r(), size: 0.1, color: C });
          break;
        }
        case 'ember':
          C.setRGB(1, 0.4 + r() * 0.3, 0.1);
          this.add.emit({ x: pos.x + (r() - 0.5) * 2, y: pos.y, z: pos.z + (r() - 0.5) * 2, vx: (r() - 0.5) * 0.5, vy: 1 + r() * 2, vz: (r() - 0.5) * 0.5, life: 2 + r() * 2, size: 0.1, color: C });
          break;
      }
    }
  }
}
