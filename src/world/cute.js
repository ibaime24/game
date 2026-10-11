// Storybook dressing for towns: climbing roses, hanging flower baskets, bunting strung with fairy
// lights, white picket fences round cottage gardens, toadstools, flower pots, and a tiered fountain.
import * as THREE from 'three';
import { M } from './builder.js';
import { hasProp, makeProp } from './props.js';

const PI = Math.PI;
const cache = {};

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Climbing roses: tangled stems and leaves dotted with blooms. */
function roseMat(kind) {
  const key = 'rose' + kind;
  if (cache[key]) return cache[key];
  const blooms = { pink: ['#f4a0b8', '#e8789a', '#fbd0dc'], red: ['#d83a48', '#b82a3a', '#f06070'], white: ['#fff6ee', '#f6e8dc', '#ffffff'], gold: ['#f8d060', '#f0b040', '#fff0a0'] }[kind];
  let seed = kind.length * 977;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tex = canvasTex(256, 512, (g, W, H) => {
    // stems climbing from the bottom
    g.strokeStyle = '#4a3a20'; g.lineWidth = 3;
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      let x = W * (0.15 + rnd() * 0.7), y = H;
      g.moveTo(x, y);
      while (y > H * 0.04) { x += (rnd() - 0.5) * 40; y -= 20 + rnd() * 30; g.lineTo(Math.max(8, Math.min(W - 8, x)), y); }
      g.stroke();
    }
    // leaves, densest near the stems' tops
    for (let i = 0; i < 520; i++) {
      const x = rnd() * W, y = H * (0.02 + rnd() * 0.96);
      if (rnd() > 0.35 + (1 - y / H) * 0.6 && y > H * 0.5) continue;
      g.fillStyle = ['#3a6a2a', '#4a7a32', '#2e5a24', '#5a8a3a'][Math.floor(rnd() * 4)];
      g.beginPath(); g.ellipse(x, y, 7 + rnd() * 5, 4 + rnd() * 3, rnd() * PI, 0, PI * 2); g.fill();
    }
    // blooms: layered rings with a darker heart
    for (let i = 0; i < 70; i++) {
      const x = 12 + rnd() * (W - 24), y = H * (0.03 + rnd() * 0.8), r = 6 + rnd() * 6;
      const [a, b, c] = blooms;
      g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill();
      g.fillStyle = a; g.beginPath(); g.arc(x, y, r * 0.75, 0, PI * 2); g.fill();
      g.fillStyle = b; g.beginPath(); g.arc(x + r * 0.1, y + r * 0.1, r * 0.38, 0, PI * 2); g.fill();
    }
  });
  cache[key] = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, forceSinglePass: true });
  return cache[key];
}

/** A rose vine on a wall: (x, z) on the wall face, facing `rot`, `w` wide and `h` tall. */
export function roseVine(b, x, y0, z, rot, w, h, kind = 'pink') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roseMat(kind));
  m.position.set(x + Math.sin(rot) * 0.06, y0 + h / 2, z + Math.cos(rot) * 0.06);
  m.rotation.y = rot;
  m.receiveShadow = true;
  b.add(m);
  return m;
}

/** Bunting: a sagging string of little pennants between two points, with fairy lights between them. */
let buntingMat = null;
export function bunting(b, a, c, sag = 0.9, lights = true) {
  const cols = [0xe86a6a, 0xf6c04a, 0x6ab0e0, 0x8ad07a, 0xe090d0, 0xf6f0e0, 0xf09a50];
  const pos = [], col = [];
  const len = a.distanceTo(c);
  const n = Math.max(4, Math.round(len / 0.55));
  const P = (t) => new THREE.Vector3().lerpVectors(a, c, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0));
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.1) / n, t1 = (i + 0.9) / n;
    const p0 = P(t0), p1 = P(t1);
    const tip = p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, -0.36, 0));
    pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, tip.x, tip.y, tip.z);
    tmp.setHex(cols[i % cols.length]);
    for (let k = 0; k < 3; k++) col.push(tmp.r, tmp.g, tmp.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  buntingMat ||= new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, forceSinglePass: true });
  const flags = new THREE.Mesh(g, buntingMat);
  flags.castShadow = true;
  b.add(flags);
  // the cord
  const pts = [];
  for (let i = 0; i <= 24; i++) pts.push(P(i / 24));
  const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 3), M('timber'));
  b.add(cord);
  if (lights) {
    // warm fairy lights between the pennants (they glow with the street lanterns)
    const bulbs = [];
    for (let i = 0; i <= n; i++) {
      const p = P(i / n);
      const s = new THREE.SphereGeometry(0.045, 6, 4);
      s.translate(p.x, p.y - 0.04, p.z);
      bulbs.push(s);
    }
    for (const s of bulbs) b.add(new THREE.Mesh(s, M('lanternglow')));
  }
}

/** A hanging basket: moss bowl overflowing with flowers and trailing leaves, on three chains. */
export function hangingBasket(b, x, y, z, seed = 1) {
  const g = new THREE.Group();
  seed = Math.abs(Math.round(seed));
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, PI * 2, PI / 2, PI / 2), M('plaster@4a5a2a'));
  g.add(bowl);
  const flowerCols = [0xf4a0c0, 0xffffff, 0xf8d050, 0xb080e0, 0xf07060, 0x80b0f0];
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4 + seed, r = 0.06 + (i % 4) * 0.045;
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.045 + (i % 3) * 0.012, 6, 4), M('plaster@' + flowerCols[(i + seed) % flowerCols.length].toString(16).padStart(6, '0')));
    f.position.set(Math.cos(a) * r, 0.02 + (i % 2) * 0.04, Math.sin(a) * r);
    g.add(f);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + seed;
    const trail = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.32 + (i % 3) * 0.1, 4), M('plaster@4a7a32'));
    trail.position.set(Math.cos(a) * 0.2, -0.16, Math.sin(a) * 0.2);
    trail.rotation.x = PI;
    g.add(trail);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 3), M('iron'));
    ch.position.set(Math.cos(a) * 0.1, 0.24, Math.sin(a) * 0.1);
    ch.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    g.add(ch);
  }
  // bake into world space so the static merger can batch every basket in town into a few meshes
  g.position.set(x, y, z);
  g.updateMatrixWorld(true);
  for (const o of [...g.children]) {
    o.geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
    o.castShadow = false;
    b.add(o);
  }
  return g;
}

/** A terracotta pot of flowers. */
export function flowerPot(b, x, y, z, seed = 0, scale = 1) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.14 * scale, 0.32 * scale, 12), M('wood@c8704a'));
  pot.position.set(x, y + 0.16 * scale, z);
  pot.castShadow = true;
  b.add(pot);
  if (hasProp('celandine_01')) {
    const id = ['celandine_01', 'dandelion_01', 'nettle_plant'][seed % 3];
    const f = makeProp(id, { variant: seed, height: 0.4 * scale, shadow: false });
    f.position.set(x, y + 0.3 * scale, z);
    f.rotation.y = seed;
    b.add(f);
  }
}

/** Toadstools: red caps with white spots. */
let capMat = null;
export function toadstools(b, x, y, z, n = 5, seed = 1, big = 1) {
  capMat ||= new THREE.MeshStandardMaterial({
    roughness: 0.55,
    map: canvasTex(128, 64, (g, W, H) => {
      g.fillStyle = '#d23a2a'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff4e8';
      for (let i = 0; i < 26; i++) { g.beginPath(); g.arc((i * 37) % W, ((i * 53) % (H * 0.8)) + 4, 3 + (i % 3) * 2, 0, PI * 2); g.fill(); }
    }),
  });
  const stem = M('plaster@fff4e6');
  let s = seed * 7919;
  const rnd = () => (s = (s * 16807 + 11) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const sc = (0.5 + rnd() * 0.8) * big;
    const px = x + (rnd() - 0.5) * 0.9 * big, pz = z + (rnd() - 0.5) * 0.9 * big;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * sc, 0.05 * sc, 0.22 * sc, 8), stem);
    st.position.set(px, y + 0.11 * sc, pz);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12 * sc, 14, 8, 0, PI * 2, 0, PI / 2), capMat);
    cap.scale.y = 0.7;
    cap.position.set(px, y + 0.21 * sc, pz);
    cap.rotation.set((rnd() - 0.5) * 0.3, rnd() * 6, (rnd() - 0.5) * 0.3);
    st.castShadow = cap.castShadow = true;
    b.add(st); b.add(cap);
  }
}

/** A white picket fence along a line, with optional gap. */
export function picketFence(b, a, c, h0, color = 'plaster@fffaf0') {
  const len = Math.hypot(c.x - a.x, c.z - a.z);
  const rot = Math.atan2(c.x - a.x, c.z - a.z);
  const n = Math.max(2, Math.round(len / 0.22));
  const paint = M(color);
  const geos = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (c.x - a.x) * t, z = a.z + (c.z - a.z) * t;
    const p = new THREE.BoxGeometry(0.07, 0.62, 0.025);
    p.translate(0, 0.31, 0);
    const tip = new THREE.ConeGeometry(0.05, 0.1, 4);
    tip.rotateY(PI / 4);
    tip.translate(0, 0.67, 0);
    for (const g of [p, tip]) { g.rotateY(rot + PI / 2); g.translate(x, h0, z); geos.push(g); }
  }
  for (const hy of [0.18, 0.46]) {
    const r = new THREE.BoxGeometry(0.035, 0.05, len);
    r.rotateY(rot);
    r.translate((a.x + c.x) / 2, h0 + hy, (a.z + c.z) / 2);
    geos.push(r);
  }
  for (const g of geos) { const m = new THREE.Mesh(g, paint); m.castShadow = true; b.add(m); }
  b.col.addBox((a.x + c.x) / 2, (a.z + c.z) / 2, 0.06, len / 2, rot, h0, h0 + 0.7);
}

/** A three-tier stone fountain with spray. */
export function fountain(b, x, z, h0) {
  const stone = M('whitestone@fff2e2');
  const water = new THREE.MeshStandardMaterial({ color: 0x6ab8d8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.75, forceSinglePass: true });
  // octagonal basin
  b.cyl(2.4, 2.6, 0.7, stone, x, h0 + 0.35, z, { seg: 8 });
  const w0 = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.05, 8), water);
  w0.position.set(x, h0 + 0.62, z);
  b.add(w0);
  b.cyl(0.35, 0.45, 2.2, stone, x, h0 + 1.1, z, { seg: 10, collide: false });
  // middle bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.5, 0.35, 16), stone);
  bowl.position.set(x, h0 + 1.95, z);
  bowl.castShadow = true;
  b.add(bowl);
  const w1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.04, 16), water);
  w1.position.set(x, h0 + 2.11, z);
  b.add(w1);
  b.cyl(0.14, 0.2, 0.9, stone, x, h0 + 2.5, z, { seg: 8, collide: false });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.2, 0.22, 12), stone);
  top.position.set(x, h0 + 2.98, z);
  b.add(top);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), stone);
  fin.position.set(x, h0 + 3.22, z);
  b.add(fin);
  b.emitter('fountain', x, h0 + 3.2, z, 26, { range: 70 });
  b.emitter('fountain_low', x, h0 + 2.1, z, 16, { range: 60 });
  b.interact({ kind: 'sign', name: 'Fountain of the Oak', text: 'Coins glint at the bottom of the basin. A worn plaque reads: "GIVEN TO THE PEOPLE OF CHORROL BY THE COUNTESS ARRIANA VALGA, THAT NO ONE IN HER CITY SHOULD GO THIRSTY, OR WITHOUT SOMEWHERE TO SIT."\n\nSomeone has scratched underneath: "or without a wish."', pos: new THREE.Vector3(x, h0 + 0.9, z + 2.6), radius: 1.6, verb: 'Read' });
}
