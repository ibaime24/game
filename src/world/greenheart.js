// The Greenheart: a pocket of Valenwood carried north long ago, reached through the Hollow Elder in the deep
// woods by the western mountains. Graht-oaks a hundred metres tall, a canopy so dense the day comes through it
// in shafts, glowing mushrooms in the roots, motes drifting in the green air — and the Bosmer town of Falinor
// built around the greatest tree of all.
import * as THREE from 'three';
import { createNoise2D, fbm, smoothstep, lerp } from '../core/noise.js';
import { Terrain } from './terrain.js';
import { M, textPlank } from './builder.js';
import * as TG from './texgen.js';
import { buildTreeMesh } from './vegetation.js';
import { PropScatter, hasProp, placeProp, propVariants } from './props.js';
import { distToSegment } from './layout.js';

const PI = Math.PI, TAU = PI * 2;
const noise = createNoise2D(4711);
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export const GH = {
  arrival: { x: 0, z: 158, yaw: PI },
  exitTree: { x: 0, z: 174 },
  town: { x: 0, z: -12 },
  greatR: 10,
  pond: { x: 30, z: 22, r: 9 },
  range: { x: -50, z: 20 },
  grove: { x: -78, z: -48 },
  bounds: [-215, -215, 215, 215],
};
const PATHS = [
  [[0, 166], [6, 130], [-8, 95], [4, 55], [0, 20]],
  [[-12, 0], [-40, 12], [-56, 20]],
  [[-20, -14], [-50, -34], [-72, -44]],
];
export function pathDist(x, z) {
  let d = Infinity;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}

export function ghHeight(x, z) {
  let h = fbm(noise, x / 70, z / 70, 3) * 6 + fbm(noise, x / 17 + 5, z / 17, 2) * 1.2;
  // the world ends in a ring of rising, root-tangled hills
  const r = Math.max(Math.abs(x), Math.abs(z));
  h += Math.pow(smoothstep(170, 225, r), 1.5) * 38;
  // Falinor's clearing, the range, the grove and the arrival glade are level
  const dt = Math.hypot(x - GH.town.x, z - GH.town.z);
  h = lerp(h, 1.5, smoothstep(52, 34, dt));
  for (const [c, rad] of [[GH.range, 16], [GH.grove, 20], [GH.arrival, 14]]) h = lerp(h, 1.5 + fbm(noise, c.x / 40, c.z / 40, 1), smoothstep(rad + 10, rad, Math.hypot(x - c.x, z - c.z)));
  // paths are gently worn into the ground
  h -= smoothstep(4, 1, pathDist(x, z)) * 0.25;
  // a lily pond beside the town
  const dp = Math.hypot(x - GH.pond.x, z - GH.pond.z);
  h = lerp(h, 0.2, smoothstep(GH.pond.r + 3, GH.pond.r - 2, dp));
  return h;
}

function ghColor(x, z, h, ny, out) {
  const n = fbm(noise, x / 8, z / 8, 2), m = fbm(noise, x / 40, z / 40, 2);
  // deep moss, rich with gold where the light falls
  let r = 0.42 + n * 0.08 + m * 0.06, g = 0.6 + n * 0.1, b = 0.3 + m * 0.04;
  const p = smoothstep(3, 1, pathDist(x, z));
  r = lerp(r, 0.62, p); g = lerp(g, 0.5, p); b = lerp(b, 0.34, p);
  if (ny < 0.85) { r *= 0.85; g *= 0.8; b *= 0.8; }
  out[0] = r; out[1] = g; out[2] = b;
}

// ------------------------------------------------------------------ materials
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const bark = TG.barkTex();
  const tiled = (t, rx, ry) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
  const grass = TG.grassTex();
  MATS = {
    bark: new THREE.MeshStandardMaterial({ map: tiled(bark.map, 4, 12), normalMap: tiled(bark.normalMap, 4, 12), color: 0xb8a088, roughness: 0.95 }),
    root: new THREE.MeshStandardMaterial({ map: tiled(bark.map, 2, 2), normalMap: tiled(bark.normalMap, 2, 2), color: 0xa89078, roughness: 0.95 }),
    moss: new THREE.MeshStandardMaterial({ map: tiled(grass.map, 3, 4), color: 0x7aa04a, roughness: 1 }),
    limb: new THREE.MeshStandardMaterial({ map: tiled(bark.map, 1, 6), normalMap: tiled(bark.normalMap, 1, 6), color: 0xa89078, roughness: 0.95 }),
    vine: new THREE.MeshStandardMaterial({ color: 0x5a7038, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.92, alphaTest: 0.2 }),
    capGlow: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    stem: new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.7, emissive: 0x304030, emissiveIntensity: 0.4 }),
    wood: new THREE.MeshStandardMaterial({ map: tiled(TG.woodTex('planks').map, 1, 1), color: 0xc8a070, roughness: 0.85 }),
    thatch: new THREE.MeshStandardMaterial({ color: 0x5a7a34, roughness: 1, side: THREE.DoubleSide }),
    lantern: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 0.9) }),
    wisp: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 2.2, 1.5) }),
  };
  return MATS;
}

// ------------------------------------------------------------------ god rays
function rayMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uSeed: { value: Math.random() * 10 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, forceSinglePass: true, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uTime; uniform float uNight; uniform float uSeed; varying vec2 vUv;
      void main(){
        float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
        float soft = smoothstep(0.0, 0.7, across);
        float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        float shimmer = 0.75 + 0.25 * sin(uTime * 0.7 + uSeed + vUv.y * 6.0);
        vec3 day = vec3(1.0, 0.86, 0.55), night = vec3(0.45, 0.6, 1.0);
        vec3 col = mix(day, night, uNight) * mix(0.16, 0.08, uNight);
        gl_FragColor = vec4(col * soft * along * shimmer, 1.0);
      }`,
  });
}

// ------------------------------------------------------------------ a graht-oak
/** A colossal tree: buttress roots, a mossy foot, a trunk like a tower, limbs reaching out to the canopy crowns. */
function grahtOak(b, H, x, z, R, height, r, crownList, opts = {}) {
  const Ms = mats();
  const h0 = H(x, z) - 0.6;
  // trunk, slightly irregular
  const geo = new THREE.CylinderGeometry(R * 0.55, R, height, 24, 12, false);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
    const a = Math.atan2(vz, vx);
    const k = 1 + Math.sin(a * 5 + vy * 0.05 + x) * 0.06 + Math.sin(a * 11 - vy * 0.13) * 0.03;
    p.setX(i, vx * k); p.setZ(i, vz * k);
  }
  geo.computeVertexNormals();
  const trunk = new THREE.Mesh(geo, Ms.bark);
  trunk.position.set(x, h0 + height / 2, z);
  trunk.castShadow = true; trunk.receiveShadow = true;
  b.add(trunk);
  b.col.addCircle(x, z, R * 1.0, h0 - 2, h0 + height, { walkable: false });
  // moss creeping up the foot of the trunk
  const moss = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.97, R * 1.04, 6, 24, 1, true), Ms.moss);
  moss.position.set(x, h0 + 3, z);
  moss.receiveShadow = true;
  b.add(moss);
  // buttress roots: great fins of wood flaring out across the ground
  const nRoots = opts.roots ?? 7;
  for (let k = 0; k < nRoots; k++) {
    const a = (k / nRoots) * TAU + r() * 0.4;
    const len = R * (1.4 + r() * 0.9), ht = R * (0.9 + r() * 0.5);
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.quadraticCurveTo(len * 0.35, ht * 0.25, len, 0); sh.lineTo(0, ht); sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, { depth: R * 0.18, bevelEnabled: true, bevelThickness: R * 0.06, bevelSize: R * 0.05, bevelSegments: 2 });
    rg.translate(0, 0, -R * 0.09);
    const root = new THREE.Mesh(rg, Ms.root);
    root.position.set(x + Math.cos(a) * R * 0.75, h0 - 0.3, z + Math.sin(a) * R * 0.75);
    root.rotation.y = -a;
    root.castShadow = true; root.receiveShadow = true;
    b.add(root);
    const cx = x + Math.cos(a) * (R * 0.75 + len * 0.4), cz = z + Math.sin(a) * (R * 0.75 + len * 0.4);
    b.col.addBox(cx, cz, len * 0.42, R * 0.14, -a, h0 - 1, h0 + ht * 0.45, { walkable: false });
  }
  // limbs reaching out from high on the trunk, each ending in a crown of the canopy
  const top = h0 + height;
  const nLimbs = opts.limbs ?? 4 + Math.floor(r() * 3);
  for (let k = 0; k < nLimbs; k++) {
    const a = (k / nLimbs) * TAU + r() * 0.8;
    const y0 = h0 + height * (0.6 + r() * 0.25);
    const reach = R * (3 + r() * 2.5) + 8;
    const from = new THREE.Vector3(x + Math.cos(a) * R * 0.5, y0, z + Math.sin(a) * R * 0.5);
    const to = new THREE.Vector3(x + Math.cos(a) * reach, y0 + 8 + r() * 10, z + Math.sin(a) * reach);
    const len = from.distanceTo(to);
    const lg = new THREE.CylinderGeometry(R * 0.12, R * 0.28, len, 10);
    const limb = new THREE.Mesh(lg, Ms.limb);
    limb.position.copy(from).lerp(to, 0.5);
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    limb.castShadow = true;
    b.add(limb);
    crownList.push({ x: to.x, y: to.y - 6, z: to.z, s: 3.4 + r() * 1.6, rot: r() * TAU });
    // hanging moss from the limb
    for (let v = 0; v < 3; v++) {
      const t = 0.35 + v * 0.22;
      const at = from.clone().lerp(to, t);
      // tapering to a wisp at the bottom, like old-man's-beard
      const sg = new THREE.PlaneGeometry(0.5 + r() * 0.5, 4 + r() * 6, 1, 4);
      const sp = sg.attributes.position, sh = sg.parameters.height;
      for (let j = 0; j < sp.count; j++) { const t = (sh / 2 - sp.getY(j)) / sh; sp.setX(j, sp.getX(j) * (1 - t * 0.9)); sp.setZ(j, Math.sin(t * 3 + j) * 0.15 * t); }
      const strand = new THREE.Mesh(sg, Ms.vine);
      strand.position.set(at.x, at.y - 3 - r() * 2, at.z);
      strand.rotation.y = r() * PI;
      b.add(strand);
    }
  }
  crownList.push({ x, y: top - 4, z, s: 4.2 + r() * 1.5, rot: r() * TAU });
  return { h0, top };
}

/** A Bosmer pod-house: a round wall of woven wood under a domed roof of living leaves. */
function pod(b, x, y0, z, rad, face, name) {
  const Ms = mats();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad, 2.7, 18, 1), Ms.wood);
  wall.position.set(x, y0 + 1.35, z);
  wall.castShadow = true; wall.receiveShadow = true;
  b.add(wall);
  for (let k = 0; k < 3; k++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(rad * (0.93 + k * 0.035), 0.06, 5, 24), M('timber'));
    band.rotation.x = PI / 2; band.position.set(x, y0 + 0.3 + k * 1.1, z);
    b.add(band);
  }
  const roof = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.25, 18, 10, 0, TAU, 0, PI * 0.55), Ms.thatch);
  roof.scale.y = 0.8;
  roof.position.set(x, y0 + 2.55, z);
  roof.castShadow = true;
  b.add(roof);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 6), Ms.thatch);
  tip.position.set(x, y0 + 2.55 + rad * 1.0 + 0.4, z);
  b.add(tip);
  b.col.addCircle(x, z, rad, y0, y0 + 3.6, { walkable: false });
  // a round door and a glowing lantern beside it
  const dx = Math.sin(face), dz = Math.cos(face);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16), M('dark'));
  door.position.set(x + dx * (rad + 0.02), y0 + 0.95, z + dz * (rad + 0.02));
  door.rotation.y = face;
  door.scale.y = 1.35;
  b.add(door);
  const lx = x + dx * (rad + 0.2) + dz * 1.0, lz = z + dz * (rad + 0.2) - dx * 1.0;
  hangingLantern(b, lx, y0 + 2.3, lz);
  b.interact({ kind: 'door', name, locked: true, lockMsg: `The round door of ${name} is shut. Inside someone is humming.`, pos: new THREE.Vector3(x + dx * (rad + 0.6), y0 + 1.1, z + dz * (rad + 0.6)), radius: 1.2, verb: 'Open' });
}

/** A paper-and-vine lantern hanging from a hook, glowing warm gold (or spirit-green). */
function hangingLantern(b, x, y, z, spirit = false) {
  const Ms = mats();
  const g = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), spirit ? Ms.wisp : Ms.lantern);
  g.scale.y = 1.3;
  g.position.set(x, y, z);
  b.add(g);
  b.cyl(0.01, 0.01, 0.5, 'iron', x, y + 0.45, z, { seg: 4, collide: false, cast: false });
  b.light(spirit ? 0x8affc0 : 0xffc870, spirit ? 7 : 9, 11, x, y - 0.2, z, { flicker: false });
}

// ------------------------------------------------------------------ the region
export function buildGreenheart(b, game) {
  const terrain = new Terrain({
    size: 460, seg: 184, heightFn: ghHeight, colorFn: ghColor, detailRepeat: 5,
    material: (() => { const t = TG.grassTex(); return new THREE.MeshStandardMaterial({ vertexColors: true, map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1 }); })(),
  });
  terrain.mesh.receiveShadow = true;
  b.add(terrain.mesh);
  b.col.ground = (x, z) => terrain.heightAt(x, z);
  const H = (x, z) => terrain.heightAt(x, z);
  const r = rng(2024);
  const state = { terrain, rays: [] };
  const crowns = [];

  // ---- the graht-oaks: the Great Tree of Falinor, and dozens more filling the forest
  const T = GH.town;
  const great = grahtOak(b, H, T.x, T.z, GH.greatR, 104, r, crowns, { roots: 11, limbs: 8 });
  state.great = great;
  const giants = [];
  for (let gx = -200; gx <= 200; gx += 30) for (let gz = -200; gz <= 200; gz += 30) {
    const x = gx + (r() - 0.5) * 20, z = gz + (r() - 0.5) * 20;
    if (Math.hypot(x - T.x, z - T.z) < 60) continue;
    if (pathDist(x, z) < 12) continue;
    if ([GH.range, GH.grove, GH.arrival, GH.pond].some((c) => Math.hypot(x - c.x, z - c.z) < 26)) continue;
    const edge = Math.max(Math.abs(x), Math.abs(z)) > 170;
    const R = (edge ? 5 : 3) + r() * 2.8;
    grahtOak(b, H, x, z, R, 60 + r() * 30 + R * 2, r, crowns);
    giants.push({ x, z, R });
  }
  // the exit: a hollow in a giant behind the arrival glade, glowing with the way home
  {
    const E = GH.exitTree;
    const R = 6.5;
    const { h0 } = grahtOak(b, H, E.x, E.z + R * 0.6, R, 80, r, crowns, { roots: 6 });
    const arch = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20, 0, PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.6, 0.9), transparent: true, opacity: 0.85 }));
    arch.position.set(E.x, h0 + 0.6 + 2.0, E.z + 0.4 - R * 0.4);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.0), arch.material);
    door.position.set(E.x, h0 + 0.6 + 1.0, E.z + 0.4 - R * 0.4);
    b.add(arch, door);
    b.light(0xd8ffb0, 18, 14, E.x, h0 + 2.5, E.z - R * 0.4 - 1.5, { flicker: false });
    b.emitter('sparkle', E.x, h0 + 2, E.z - R * 0.4 - 0.5, 3, { spread: 1.5 });
    b.interact({ kind: 'door', cell: 'world', exit: true, name: 'Cyrodiil', pos: new THREE.Vector3(E.x, h0 + 1.5, E.z - R * 0.4 - 1.2), radius: 1.8, verb: 'Exit' });
  }

  // ---- the canopy: instanced crowns of leaves, so dense the day comes through only in shafts
  {
    const kinds = [['oak', 1], ['oak', 7], ['beech', 12]];
    const groups = kinds.map(() => []);
    crowns.forEach((c, i) => groups[i % kinds.length].push(c));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pp = new THREE.Vector3();
    kinds.forEach(([kind, seed], k) => {
      const ref = buildTreeMesh(kind, 1, seed);
      const list = groups[k];
      // only the leaves: the crown's own trunk, scaled up this far, would read as a stump hanging in the air
      const hidden = ref.material[0].clone();
      hidden.visible = false;
      const im = new THREE.InstancedMesh(ref.geometry, [hidden, ...ref.material.slice(1)], list.length);
      list.forEach((c, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.rot);
        s.set(c.s * 1.6, c.s * 1.2, c.s * 1.6);
        pp.set(c.x, c.y, c.z);
        m4.compose(pp, q, s);
        im.setMatrixAt(i, m4);
        im.setColorAt(i, new THREE.Color().setHSL(0.24 + (r() - 0.5) * 0.06, 0.35, 0.72 + r() * 0.2));
      });
      im.castShadow = true;
      im.receiveShadow = true;
      im.customDepthMaterial = ref.customDepthMaterial;
      im.frustumCulled = false;
      im.userData.dynamic = true;
      b.add(im);
    });
    // a lower storey of ordinary trees between the giants
    const under = [];
    for (let i = 0; i < 160; i++) {
      const x = (r() - 0.5) * 400, z = (r() - 0.5) * 400;
      if (Math.hypot(x - T.x, z - T.z) < 40 || pathDist(x, z) < 6) continue;
      if ([GH.range, GH.grove, GH.arrival, GH.pond].some((c) => Math.hypot(x - c.x, z - c.z) < 18)) continue;
      if (giants.some((g) => Math.hypot(x - g.x, z - g.z) < g.R * 2.2)) continue;
      under.push([x, z]);
    }
    const ref = buildTreeMesh('beech', 1, 11);
    const im = new THREE.InstancedMesh(ref.geometry, ref.material, under.length);
    under.forEach(([x, z], i) => {
      const sc = 1.0 + r() * 0.9;
      m4.compose(pp.set(x, H(x, z) - 0.2, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * TAU), s.set(sc, sc * (0.9 + r() * 0.4), sc));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color().setHSL(0.22 + (r() - 0.5) * 0.06, 0.3, 0.7 + r() * 0.2));
      b.col.addCircle(x, z, 0.45 * sc, H(x, z) - 1, H(x, z) + 6, { walkable: false });
    });
    im.castShadow = true; im.receiveShadow = true; im.customDepthMaterial = ref.customDepthMaterial; im.frustumCulled = false;
    im.userData.dynamic = true;
    b.add(im);
  }

  // ---- shafts of light falling through gaps in the canopy
  const gaps = [];
  for (let i = 0; i < 34; i++) {
    const x = (r() - 0.5) * 360, z = (r() - 0.5) * 360;
    const gy = H(x, z);
    const w = 3 + r() * 6, len = 70;
    const tilt = 0.32, dir = 0.6;
    const g = new THREE.Group();
    for (let k = 0; k < 2; k++) {
      const mat = rayMaterial();
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
      pl.rotation.y = k * PI / 2;
      g.add(pl);
      state.rays.push(mat);
    }
    g.position.set(x + Math.sin(dir) * len * 0.5 * Math.sin(tilt), gy + len * 0.5 * Math.cos(tilt), z + Math.cos(dir) * len * 0.5 * Math.sin(tilt));
    g.rotation.set(tilt * Math.cos(dir), 0, -tilt * Math.sin(dir));
    gaps.push([x + Math.sin(dir) * len * Math.sin(tilt), z + Math.cos(dir) * len * Math.sin(tilt), w]);
    g.renderOrder = 6;
    g.userData.dynamic = true;
    g.traverse((o) => { o.userData.dynamic = true; });
    b.add(g);
  }

  // ---- the roof of the world: a sea of leaves high overhead, broken only where the light shafts fall
  {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      const k = 1 + Math.sin(vx * 4.1 + vz * 2.3) * 0.14 + Math.sin(vy * 5.7 - vx * 3.1) * 0.1;
      p.setXYZ(i, vx * k, vy * k, vz * k);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x4f7a2c, emissive: 0x1c3a0e, emissiveIntensity: 0.6, roughness: 1, flatShading: true });
    const spots = [];
    for (let gx = -228; gx <= 228; gx += 15) for (let gz = -228; gz <= 228; gz += 15) {
      const x = gx + (r() - 0.5) * 9, z = gz + (r() - 0.5) * 9;
      if (gaps.some(([ax, az, w]) => Math.hypot(x - ax, z - az) < 10 + w)) continue;
      spots.push([x, z]);
    }
    const im = new THREE.InstancedMesh(geo, mat, spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pp = new THREE.Vector3();
    spots.forEach(([x, z], i) => {
      const rad = 11 + r() * 6;
      m4.compose(pp.set(x, H(x, z) + 74 + r() * 14, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * TAU), s.set(rad, rad * (0.35 + r() * 0.2), rad));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color().setHSL(0.25 + (r() - 0.5) * 0.05, 0.45, 0.4 + r() * 0.2));
    });
    im.frustumCulled = false;
    im.userData.dynamic = true;
    b.add(im);
    // and all around, the forest going on forever into the green haze
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(226, 226, 400, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x506a3c, side: THREE.BackSide, fog: false }));
    wall.position.y = 60;
    b.add(wall);
    state.wall = wall.material;
  }

  // ---- glowing mushrooms clustered in the roots, and magical motes in the air
  {
    const capGeo = new THREE.SphereGeometry(0.22, 10, 6, 0, TAU, 0, PI / 2);
    capGeo.scale(1, 0.6, 1);
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.3, 6);
    stemGeo.translate(0, -0.15, 0);
    const spots = [];
    const roots = [...giants, { x: T.x, z: T.z, R: GH.greatR }];
    for (const g of roots) {
      const n = 6 + Math.floor(r() * 10);
      for (let i = 0; i < n; i++) {
        const a = r() * TAU, d = g.R * (1.05 + r() * 1.2);
        spots.push([g.x + Math.cos(a) * d, g.z + Math.sin(a) * d, 0.6 + r() * 1.6, r()]);
      }
    }
    const caps = new THREE.InstancedMesh(capGeo, mats().capGlow, spots.length);
    const stems = new THREE.InstancedMesh(stemGeo, mats().stem, spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pp = new THREE.Vector3();
    const glowCols = [[0.3, 1.8, 1.6], [0.9, 0.5, 2.0], [1.9, 1.4, 0.4], [0.5, 1.9, 0.7]];
    spots.forEach(([x, z, sc, hue], i) => {
      const y = H(x, z) + 0.3 * sc;
      m4.compose(pp.set(x, y, z), q.identity(), s.set(sc, sc, sc));
      caps.setMatrixAt(i, m4);
      stems.setMatrixAt(i, m4);
      const c = glowCols[Math.floor(hue * glowCols.length)];
      caps.setColorAt(i, new THREE.Color(c[0], c[1], c[2]));
    });
    for (const im of [caps, stems]) { im.frustumCulled = false; im.userData.dynamic = true; b.add(im); }
    // a soft light at some of the larger clusters
    for (let i = 0; i < spots.length; i += 9) {
      const [x, z, , hue] = spots[i];
      const c = glowCols[Math.floor(hue * glowCols.length)];
      b.light(new THREE.Color(c[0] / 2, c[1] / 2, c[2] / 2).getHex(), 5, 7, x, H(x, z) + 0.8, z, { flicker: false });
    }
    // motes and fireflies drifting through the green air everywhere
    for (let i = 0; i < 40; i++) {
      const x = (r() - 0.5) * 380, z = (r() - 0.5) * 380;
      b.emitter(i % 3 ? 'firefly' : 'sparkle', x, H(x, z) + 1.5, z, 1.2, { spread: 12, range: 70 });
    }
  }

  // ---- the forest floor: ferns, shrubs, fallen giants, mossy stones
  if (hasProp('fern_02')) {
    const sc = new PropScatter(60);
    const pick = (id) => Math.floor(r() * propVariants(id));
    for (let i = 0; i < 4200; i++) {
      const x = (r() - 0.5) * 420, z = (r() - 0.5) * 420;
      if (pathDist(x, z) < 2.6) continue;
      if (Math.hypot(x - T.x, z - T.z) < GH.greatR + 2) continue;
      if (Math.hypot(x - GH.pond.x, z - GH.pond.z) < GH.pond.r + 1) continue;
      const h = H(x, z), q = r(), rot = r() * TAU;
      const inTown = Math.hypot(x - T.x, z - T.z) < 44;
      if (q < (inTown ? 0.25 : 0.55)) sc.add('fern_02', x, h - 0.05, z, { variant: pick('fern_02'), height: 0.9 + r() * 0.9, rotY: rot, maxDist: 75 });
      else if (q < 0.7) sc.add('shrub_02', x, h - 0.05, z, { variant: pick('shrub_02'), height: 1.0 + r() * 1.2, rotY: rot, maxDist: 110 });
      else if (q < 0.78) sc.add('nettle_plant', x, h - 0.03, z, { variant: pick('nettle_plant'), height: 0.6 + r() * 0.4, rotY: rot, maxDist: 60 });
      else if (q < 0.8 && !inTown) {
        sc.add('dead_tree_trunk_02', x, h - 0.12, z, { scale: 1.2 + r() * 0.8, rotY: rot, maxDist: 180, shadow: true });
        b.col.addBox(x, z, 2.4, 0.6, rot, h - 1, h + 1, { walkable: true });
      } else if (q < 0.83) sc.add('rock_moss_set_01', x, h - 0.25, z, { variant: pick('rock_moss_set_01'), scale: 0.6 + r() * 1.0, rotY: rot, maxDist: 160, shadow: true });
      else if (q < 0.86) sc.add('root_cluster_01', x, h - 0.05, z, { variant: 0, scale: 1 + r() * 0.8, rotY: rot, maxDist: 100 });
      else if (q < 0.9) sc.add(r() < 0.5 ? 'celandine_01' : 'dandelion_01', x, h - 0.02, z, { variant: pick('celandine_01'), height: 0.35 + r() * 0.2, rotY: rot, maxDist: 50 });
    }
    state.scatter = sc;
  }

  // ---- the lily pond
  {
    const P = GH.pond;
    const water = new THREE.Mesh(new THREE.CircleGeometry(P.r + 1.5, 32), new THREE.MeshStandardMaterial({ color: 0x1e3a2c, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.9 }));
    water.rotation.x = -PI / 2;
    water.position.set(P.x, 0.95, P.z);
    b.add(water);
    const pad = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.7, side: THREE.DoubleSide });
    const bloom = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.2, 1.7) });
    for (let i = 0; i < 18; i++) {
      const a = r() * TAU, d = r() * (P.r - 1);
      const lp = new THREE.Mesh(new THREE.CircleGeometry(0.35 + r() * 0.3, 10, 0.3, TAU - 0.3), pad);
      lp.rotation.x = -PI / 2;
      lp.position.set(P.x + Math.cos(a) * d, 0.97, P.z + Math.sin(a) * d);
      b.add(lp);
      if (i % 3 === 0) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bloom); f.position.copy(lp.position).setY(1.05); b.add(f); }
    }
    b.emitter('firefly', P.x, 1.5, P.z, 2, { spread: 6 });
  }

  // ---- Falinor: the town in the roots and boughs of the Great Tree
  {
    const R = GH.greatR, y0 = H(T.x, T.z);
    // a ring platform high on the trunk, reached by a spiral stair
    const PY = y0 + 8;
    const segs = 24, inner = R - 0.2, width = 4.6;
    const stairEnd = PI / 2 + 0.2 + 17 * 0.145; // where the stair arrives
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * TAU;
      const rc = inner + width / 2;
      const len = (TAU * rc) / segs + 0.25;
      b.box(len, 0.35, width, mats().wood, T.x + Math.cos(a) * rc, PY, T.z + Math.sin(a) * rc, -(a + PI / 2));
      // railing, with a gap where the stair comes up
      const gap = Math.abs(((a - stairEnd + PI) % TAU + TAU) % TAU - PI) < 0.4;
      const ro = inner + width - 0.1;
      b.cyl(0.07, 0.08, 1.1, 'timber', T.x + Math.cos(a) * ro, PY + 0.7, T.z + Math.sin(a) * ro, { seg: 5, collide: false });
      if (!gap) b.col.addBox(T.x + Math.cos(a) * ro, T.z + Math.sin(a) * ro, len / 2, 0.15, -(a + PI / 2), PY, PY + 1.3, { walkable: false });
      if (i % 3 === 0) hangingLantern(b, T.x + Math.cos(a) * (ro + 0.4), PY - 0.6, T.z + Math.sin(a) * (ro + 0.4), i % 6 === 0);
    }
    const rope = new THREE.Mesh(new THREE.TorusGeometry(inner + width - 0.1, 0.035, 4, 64), M('timber'));
    rope.rotation.x = PI / 2; rope.position.set(T.x, PY + 1.2, T.z);
    b.add(rope);
    // the spiral stair: solid steps of wood winding up round the trunk
    for (let k = 0; k < 18; k++) {
      const a = PI / 2 + 0.2 + k * 0.145, top = y0 + 0.45 * (k + 1);
      const rc = inner + width + 1.15;
      b.box(2.4, top - y0 + 0.3, 2.3, mats().wood, T.x + Math.cos(a) * rc, (top + y0 - 0.3) / 2, T.z + Math.sin(a) * rc, -(a + PI / 2));
    }
    // two pod-houses up on the ring, and the Treethane's hall carved into the foot of the tree
    pod(b, T.x + Math.cos(-0.6) * (R + 3.4), PY + 0.17, T.z + Math.sin(-0.6) * (R + 3.4), 1.5, PI / 2 + 0.6 + PI, 'Bough-House of the Archers');
    pod(b, T.x + Math.cos(2.4) * (R + 3.4), PY + 0.17, T.z + Math.sin(2.4) * (R + 3.4), 1.5, -2.4 + PI / 2 + PI, 'The Dreamer\'s Pod');
    {
      const a = -PI / 2 - 0.5; // north-west face
      const hx = T.x + Math.cos(a) * (R + 0.1), hz = T.z + Math.sin(a) * (R + 0.1);
      const door = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20, 0, PI), mats().lantern);
      door.position.set(hx, y0 + 2.1, hz); door.rotation.y = -a + PI / 2;
      b.add(door);
      const dl = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.1), mats().lantern);
      dl.position.set(hx, y0 + 1.05, hz); dl.rotation.y = -a + PI / 2;
      b.add(dl);
      b.light(0xffc870, 14, 12, hx + Math.cos(a) * 2, y0 + 2.4, hz + Math.sin(a) * 2, { flicker: true });
      b.interact({ kind: 'sign', name: "The Treethane's Hall", text: 'A doorway shaped like a seed, carved into the living wood of the Great Tree, warm light and the smell of roasting meat spilling out of it. The Treethane keeps her court inside — she will come down when she is needed.', pos: new THREE.Vector3(hx + Math.cos(a) * 1.4, y0 + 1.2, hz + Math.sin(a) * 1.4), radius: 1.6, verb: 'Examine' });
    }
    // pod-houses round the clearing
    const homes = [[0.2, 26, "Thaldir's Pod"], [1.1, 28, "Ninwe's Pod"], [2.2, 27, 'The Fletcher\'s Pod'], [3.4, 25, "Aralen's Pod"], [4.6, 29, 'The Hunters\' Lodge']];
    for (const [a, d, name] of homes) {
      const x = T.x + Math.cos(a) * d, z = T.z + Math.sin(a) * d;
      pod(b, x, H(x, z) - 0.1, z, 2.6 + r() * 0.6, Math.atan2(T.x - x, T.z - z), name);
    }
    // Mirieth's stall
    {
      const sx = T.x + 15, sz = T.z + 14, rot = -0.8;
      b.box(3.0, 0.9, 1.2, mats().wood, sx, H(sx, sz) + 0.45, sz, rot);
      const awn = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 6, 0, TAU, 0, PI / 3), mats().thatch);
      awn.scale.set(1, 0.4, 0.7); awn.position.set(sx, H(sx, sz) + 2.5, sz); awn.rotation.y = rot;
      b.add(awn);
      for (const s of [-1, 1]) b.cyl(0.06, 0.07, 2.5, 'timber', sx + Math.cos(-rot) * s * 1.3, H(sx, sz) + 1.25, sz + Math.sin(-rot) * s * 1.3, { seg: 5, collide: false });
      hangingLantern(b, sx, H(sx, sz) + 2.2, sz);
    }
    // the shrine of Y'ffre: a ring of standing roots round a glowing seed
    {
      const sx = T.x - 22, sz = T.z + 20, h = H(sx, sz);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * TAU;
        const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(sx + Math.cos(a) * 2.6, h - 0.3, sz + Math.sin(a) * 2.6), new THREE.Vector3(sx + Math.cos(a) * 2.4, h + 1.8, sz + Math.sin(a) * 2.4), new THREE.Vector3(sx + Math.cos(a) * 1.4, h + 3.2, sz + Math.sin(a) * 1.4)]);
        const t = new THREE.Mesh(new THREE.TubeGeometry(cv, 10, 0.18, 6), mats().root);
        t.castShadow = true;
        b.add(t);
      }
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), mats().wisp);
      seed.scale.y = 1.3; seed.position.set(sx, h + 1.4, sz);
      b.add(seed);
      b.light(0x8affc0, 14, 12, sx, h + 1.8, sz, { flicker: false });
      b.emitter('sparkle', sx, h + 1.5, sz, 4, { spread: 1 });
      b.interact({ kind: 'shrine', id: 'shrine_yffre', name: "Shrine of Y'ffre", deity: "Y'ffre, the Storyteller", pos: new THREE.Vector3(sx, h + 1.2, sz + 2.4), radius: 1.6, verb: 'Pray' });
    }
    // a carved signboard at the edge of town
    {
      const sx = 4, sz = 38, h = H(sx, sz);
      b.cyl(0.08, 0.1, 2.8, 'timber', sx, h + 1.4, sz, { seg: 6 });
      const s1 = textPlank('Falinor', 1.5, 0.34, '#3a4a22', '#f0e8c0');
      s1.position.set(sx, h + 2.45, sz); b.add(s1);
      const s2 = textPlank('Tumbling Grove  <', 1.4, 0.28, '#3a4a22', '#f0e8c0');
      s2.position.set(sx + 0.2, h + 2.0, sz); s2.rotation.y = 0.6; b.add(s2);
    }
    // lanterns strung along the paths through town
    for (const [x, z] of [[2, 40], [-4, 30], [8, 30], [-30, 6], [-44, 14], [-34, -24], [-55, -36], [20, 34]]) {
      b.cyl(0.08, 0.1, 2.6, 'timber', x, H(x, z) + 1.3, z, { seg: 6 });
      hangingLantern(b, x + 0.4, H(x, z) + 2.4, z, (x + z) % 3 === 0);
    }
  }

  // ---- the archery range: straw targets painted with rings
  {
    const Rg = GH.range;
    const tex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      const cols = ['#e8d8a0', '#c83a2a', '#e8d8a0', '#2a5ac8', '#e8d8a0', '#e8c040'];
      cols.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(64, 64, 62 - i * 11, 0, TAU); g.fill(); });
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    for (let i = 0; i < 3; i++) {
      const x = Rg.x - 12 + i * 4, z = Rg.z - 8, h = H(x, z);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
      face.position.set(x, h + 1.4, z + 0.12); b.add(face);
      b.cyl(0.75, 0.75, 0.25, 'hay', x, h + 1.4, z, { seg: 16, collide: false }).rotation.x = PI / 2;
      for (const s of [-1, 1]) b.box(0.08, 1.4, 0.08, 'timber', x + s * 0.5, h + 0.7, z - 0.2, 0, { collide: false, rx: 0.2 });
    }
    b.interact({ kind: 'sign', name: 'Archery Butts', text: 'Three straw targets, bristling with old arrows. Someone has hung a little wooden plaque from the middle one: "ERANWE GREENFLETCH, MISSED ONCE, 3E 391. NEVER AGAIN."', pos: new THREE.Vector3(Rg.x - 8, H(Rg.x - 8, Rg.z - 8) + 1.2, Rg.z - 7.4), radius: 1.6, verb: 'Read' });
  }

  // ---- the Tumbling Grove, where the Chipmunk Moot is held
  {
    const G = GH.grove;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + r() * 0.5, d = 8 + r() * 6;
      const x = G.x + Math.cos(a) * d, z = G.z + Math.sin(a) * d;
      if (i % 2 && hasProp('tree_stump_02')) placeProp(b, 'tree_stump_02', x, H(x, z) - 0.05, z, { scale: 0.9 + r() * 0.5 });
      else if (hasProp('dead_tree_trunk_02')) placeProp(b, 'dead_tree_trunk_02', x, H(x, z) - 0.1, z, { scale: 0.9, rot: a });
    }
    // little flags on poles mark the bounds of the Moot
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, x = G.x + Math.cos(a) * 17, z = G.z + Math.sin(a) * 17;
      b.cyl(0.04, 0.05, 2.2, 'timber', x, H(x, z) + 1.1, z, { seg: 5, collide: false });
      b.box(0.5, 0.3, 0.02, i % 2 ? 'cloth@e8c040' : 'cloth@3a8a3a', x + 0.26, H(x, z) + 2.0, z, 0, { collide: false, cast: false });
    }
  }

  state.crowns = crowns.length;
  return state;
}

/** The way in: the Hollow Elder, a giant of a tree in the deep woods by the western mountains. */
export function buildHollowElder(b, terrain, L) {
  const H = (x, z) => terrain.heightAt(x, z);
  const r = rng(77);
  const crowns = [];
  const R = 3.6;
  const { h0 } = grahtOak(b, H, L.x, L.z, R, 46, r, crowns, { roots: 7, limbs: 5 });
  for (const c of crowns) {
    const t = buildTreeMesh('oak', c.s * 0.85, 7);
    t.position.set(c.x, c.y, c.z);
    t.rotation.y = c.rot;
    b.add(t);
  }
  // the doorway: a split in the trunk, filled with green-gold light, facing east toward the road
  const face = PI / 2;
  const dx = Math.sin(face), dz = Math.cos(face);
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.7, 0.8), transparent: true, opacity: 0.9 });
  const arch = new THREE.Mesh(new THREE.CircleGeometry(0.95, 18, 0, PI), glow);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.7), glow);
  arch.position.set(L.x + dx * (R + 0.05), h0 + 0.6 + 1.7, L.z + dz * (R + 0.05));
  door.position.set(L.x + dx * (R + 0.05), h0 + 0.6 + 0.85, L.z + dz * (R + 0.05));
  arch.rotation.y = door.rotation.y = face;
  b.add(arch, door);
  b.light(0xd8ffb0, 16, 14, L.x + dx * (R + 2), h0 + 2, L.z + dz * (R + 2), { flicker: false });
  b.emitter('sparkle', L.x + dx * (R + 0.8), h0 + 1.6, L.z + dz * (R + 0.8), 3, { spread: 1.2 });
  b.emitter('firefly', L.x + dx * (R + 3), h0 + 1, L.z + dz * (R + 3), 2, { spread: 6 });
  b.interact({ kind: 'door', cell: 'greenheart', name: 'The Hollow Elder', pos: new THREE.Vector3(L.x + dx * (R + 0.9), h0 + 1.6, L.z + dz * (R + 0.9)), radius: 1.6, verb: 'Enter' });
  b.interact({ kind: 'sign', name: 'The Hollow Elder', text: 'An oak so vast it seems to belong to another country, split at the foot as if it had opened a door. The light inside is green and gold and moving, like sun through leaves, though it is dark in the trunk. Warm air breathes out of it, smelling of moss and rain.\n\nCut into the bark beside the opening, in the curling script of the Bosmer: "WHAT Y\'FFRE TOLD, Y\'FFRE KEEPS."', pos: new THREE.Vector3(L.x + dx * (R + 0.6) + dz * 1.5, h0 + 1.4, L.z + dz * (R + 0.6) - dx * 1.5), radius: 1.0, verb: 'Read' });
}
