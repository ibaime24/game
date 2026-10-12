// Brinewhistle Cove: a pirate town on the Abecean coast, reached through the Smugglers' Cut in the southern
// mountains. A sandy terrace under a ring of cliffs, scruffy painted shacks on stilts, the Salty Mitten, the
// beached Indignant Herring heeled over on the sand, a long pier, a dead lighthouse on the east headland, gulls
// on every roof — and, out in the fog some nights, the Dread Meringue.
//
// A note on colour: M('base@hex') multiplies the base texture by the tint, so tints must stay light
// (around 0xb0..0xf0 per channel) or timber comes out black.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNoise2D, fbm, ridged, smoothstep, lerp } from '../core/noise.js';
import { Terrain } from './terrain.js';
import { createTerrainMaterial } from './terrainMaterial.js';
import { M, textPlank } from './builder.js';
import { PropScatter, hasProp, makeProp, placeProp, propVariants } from './props.js';
import { buildTreeMesh } from './vegetation.js';
import { distToSegment, COVE, shoreZ } from './layout.js';

const PI = Math.PI, TAU = PI * 2;
const noise = createNoise2D(5150);
const noise2 = createNoise2D(919);
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// the switchback path from the tunnel ledge down the bank behind town: [x, z, height]
const PATH = [[0, -56, 29.5], [22, -52, 25.5], [-20, -46, 20], [20, -40, 13.5], [-16, -34, 8], [2, -26, 5.2]];
const LEDGE = { x: 0, z: -58, r: 5, fall: 5, h: 29.5 };
const HEADLAND = { x: 56, z: 44, r: 7, fall: 7, h: 12 };
// worn sand paths between the buildings (filled in once the town is laid out: see buildCove)
const WALKS = [];

/** Distance to the cliff path, and the path's height at the nearest point. */
function pathAt(x, z) {
  let best = Infinity, bh = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az, ah] = PATH[i], [bx, bz, bh2] = PATH[i + 1];
    const d = distToSegment(x, z, ax, az, bx, bz);
    if (d < best) {
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = d; bh = lerp(ah, bh2, t);
    }
  }
  return [best, bh];
}
function walkDist(x, z) {
  let d = Infinity;
  for (const [ax, az, bx, bz] of WALKS) d = Math.min(d, distToSegment(x, z, ax, az, bx, bz));
  return d;
}

/** How far out toward the surrounding hills a point lies: < 0.75 is the cove floor, 1.4+ the hilltops. */
function rim(x, z) {
  if (z < 8) return Math.hypot(x / 62, (z - 8) / 52);
  return Math.abs(x) / lerp(62, 50, smoothstep(8, 70, z));
}

export function coveHeight(x, z) {
  const n = fbm(noise, x / 40, z / 40, 3);
  const s = z - shoreZ(x); // metres seaward of the waterline
  // the floor of the cove: a terrace rising gently toward the hills behind town, a smooth beach, the sea floor
  const land = 2.6 + smoothstep(10, -34, z) * 3.0 + n * 0.5 * smoothstep(-10, -20, s);
  let h;
  if (s < 0) h = lerp(0.2, land, smoothstep(0, -13, s));
  else h = Math.max(-10 + n, 0.2 - s * 0.16 - Math.max(0, s - 8) * 0.08);
  // rounded, grassy hills all round, running out into the sea as two headlands
  const r = rim(x, z);
  const mod = 0.8 + 0.45 * fbm(noise2, x / 70 + 3, z / 70, 3);
  let hill = (28 * smoothstep(0.75, 1.4, r) + 16 * smoothstep(1.3, 2.0, r)) * mod;
  if (z > 8) hill *= lerp(1, 0.62, smoothstep(10, 70, z)) * smoothstep(110, 60, z);
  h += hill;
  // the lighthouse's grassy knoll at the tip of the east headland
  const dh = Math.hypot(x - HEADLAND.x, z - HEADLAND.z);
  h = Math.max(h, lerp(h, HEADLAND.h + n * 0.4, smoothstep(HEADLAND.r + HEADLAND.fall, HEADLAND.r, dh)));
  // a rocky shoal under the Gullstack (the stack itself is built of rock, not terrain)
  const dg = Math.hypot(x - COVE.gullstack.x, z - COVE.gullstack.z);
  h = Math.max(h, lerp(h, -2.5 + n, smoothstep(14, 7, dg)));
  // the path is cut into the slope, and the tunnel opens on a level ledge
  const [pd, ph] = pathAt(x, z);
  h = lerp(h, ph, smoothstep(3.6, 1.6, pd));
  const dl = Math.hypot(x - LEDGE.x, z - LEDGE.z);
  h = lerp(h, LEDGE.h, smoothstep(LEDGE.r + LEDGE.fall, LEDGE.r, dl));
  return h;
}

/** Splat weights for the shared terrain shader: out = [tint r,g,b, grass, dirt, rock, sand, snow, cobble]. */
function coveSplat(x, z, h, ny, out) {
  const n = fbm(noise, x / 9, z / 9, 2), m = fbm(noise2, x / 30, z / 30, 2);
  let grass = 0.75 + m * 0.3, dirt = 0.03, rock = 0, sand = 0.25;
  // sea-meadow green on the hills, going gold on the dunes by the town
  let tr = 1.0 + n * 0.06, tg = 1.05, tb = 0.85;
  const dune = smoothstep(9, 4, h);
  tr += dune * 0.1; tb -= dune * 0.03; sand += dune * 0.2;
  // bare rock only where the slope is steep
  rock = smoothstep(0.78, 0.6, ny);
  // pale golden sand, darkening and going faintly green-grey where it's wet, then the sea floor
  sand = Math.max(sand, smoothstep(3.0, 1.6, h)) * (1 - rock);
  if (h < 2.2) { tr = 1.14; tg = 1.06; tb = 0.88; }
  const wet = smoothstep(0.8, 0.0, h);
  tr = lerp(tr, 0.7, wet * 0.55); tg = lerp(tg, 0.72, wet * 0.5); tb = lerp(tb, 0.66, wet * 0.45);
  if (h < -0.5) { sand = 1; grass = 0; tr = 0.62; tg = 0.72; tb = 0.68; }
  grass *= (1 - rock) * (1 - smoothstep(2.6, 1.8, h));
  // the cliff path, the sandy plaza round the bonfire, and worn paths between the buildings
  const [pd] = pathAt(x, z);
  dirt += smoothstep(2.4, 1.0, pd) * 1.4;
  const plaza = smoothstep(10, 7, Math.hypot(x - COVE.fire.x, z - COVE.fire.z));
  const walk = smoothstep(1.6, 0.6, walkDist(x, z)) * (0.75 + n * 0.25);
  const trod = Math.max(plaza, walk);
  sand += trod * 2.2; dirt += trod * 0.35; grass *= 1 - trod * 0.92;
  if (trod > 0) { tr = lerp(tr, 1.12, trod); tg = lerp(tg, 1.04, trod); tb = lerp(tb, 0.86, trod); }
  out[0] = tr; out[1] = tg; out[2] = tb;
  out[3] = Math.max(0, grass); out[4] = dirt; out[5] = rock; out[6] = sand; out[7] = 0; out[8] = 0;
}

// ------------------------------------------------------------------ materials
let _mats = null;
/** A textured base material lightened (or coloured) by a linear colour multiplier; values above 1 brighten. */
function tint(name, r, g, b) {
  const m = M(name).clone();
  m.color.setRGB(r, g, b);
  return m;
}
function mats() {
  if (_mats) return _mats;
  _mats = {
    // salt-bleached timber in a few shades, whitewash, and grey-green weathered boards
    walls: [tint('timber', 1.75, 1.6, 1.38), M('plaster@f4efe4'), tint('wood', 1.6, 1.5, 1.32), tint('timber', 1.3, 1.5, 1.45)],
    post: tint('timber', 1.55, 1.42, 1.22),
    plank: tint('wood', 1.55, 1.42, 1.22),
    roofs: [M('roofred'), tint('roof', 1.3, 1.25, 1.2), tint('roofred', 1.15, 0.95, 0.85)],
    // painted doors and shutters: faded teal, pillar-box red, sea green, mustard, cream
    paint: [tint('wood', 0.55, 1.25, 1.3), tint('wood', 1.6, 0.5, 0.38), tint('wood', 0.7, 1.3, 0.65), tint('wood', 1.7, 1.3, 0.42), tint('wood', 1.8, 1.7, 1.5)],
    hull: tint('wood', 1.75, 1.55, 1.28),
    rope: new THREE.MeshStandardMaterial({ color: 0xb09a70, roughness: 1 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x8e887c, roughness: 0.95 }),
    wetRock: new THREE.MeshStandardMaterial({ color: 0x6e726c, roughness: 0.7 }),
    fish: new THREE.MeshStandardMaterial({ color: 0xa8a090, roughness: 0.4, metalness: 0.3 }),
    // yarn in the Admiral's colours: orange, cream, sage green
    wool: [0xe08a30, 0xf0e4c8, 0x7aa05a, 0xd8b070].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 })),
    black: new THREE.MeshBasicMaterial({ color: 0x050403 }),
  };
  return _mats;
}

/** A craggy rock: a displaced, flat-shaded icosahedron (one of six shapes). */
const _cragGeos = [];
function cragGeo(k) {
  k %= 6;
  if (_cragGeos[k]) return _cragGeos[k];
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const nz = createNoise2D(300 + k * 17);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // lumpy, with horizontal bedding ledges
    const f = 0.8 + fbm(nz, x * 1.4 + y * 0.6, z * 1.4 - y * 0.8, 4) * 0.4 + Math.sin(y * 7 + k) * 0.035;
    p.setXYZ(i, x * f, y * f, z * f);
  }
  g.computeVertexNormals();
  return (_cragGeos[k] = g);
}
function crag(b, mat, x, y, z, sx, sy, sz, k = 0, o = {}) {
  const m = new THREE.Mesh(cragGeo(k), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(o.rx || 0, o.ry ?? k * 1.7, o.rz || 0);
  m.castShadow = true; m.receiveShadow = true;
  b.add(m);
  if (o.collide !== false) b.col.addCircle(x, z, Math.min(sx, sz) * 0.85, y - sy, y + sy * 0.8, { walkable: false });
  return m;
}

/** A big natural boulder: one of the scanned rock props scaled to `size` across (a craggy rock if none load). */
const BOULDERS = ['namaqualand_boulder_02', 'boulder_01', 'rock_moss_set_02', 'rock_moss_set_01'];
function boulder(b, x, y, z, size, rot, k = 0, o = {}) {
  const ids = BOULDERS.filter((id) => hasProp(id));
  if (ids.length) {
    const id = ids[k % ids.length];
    const g = placeProp(b, id, x, y, z, { fit: size, rot, collide: false, variant: k % Math.max(1, propVariants(id)) });
    if (o.collide !== false) b.col.addCircle(x, z, size * 0.4, y - 1, y + g.userData.propSize.y, { walkable: false });
    return g;
  }
  return crag(b, mats().rock, x, y + size * 0.2, z, size * 0.5, size * 0.4, size * 0.45, k, o);
}

/** A canvas-painted plane. draw(ctx, w, h). */
function paintedPlane(w, h, px, draw, o = {}) {
  const c = document.createElement('canvas');
  c.width = px; c.height = Math.round(px * h / w);
  draw(c.getContext('2d'), c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, alphaTest: o.alphaTest ?? 0 });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

let _netMat = null;
function netMaterial() {
  if (_netMat) return _netMat;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 96;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(90,76,52,1)'; g.lineWidth = 2;
  for (let i = -96; i < 128 + 96; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 96, 96); g.stroke(); g.beginPath(); g.moveTo(i, 96); g.lineTo(i + 96, 0); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  _netMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide, transparent: true, alphaTest: 0.4 });
  return _netMat;
}

// ------------------------------------------------------------------ the LOST CAT poster
let _posterMat = null;
function posterMaterial() {
  if (_posterMat) return _posterMat;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 360;
  const g = c.getContext('2d');
  g.fillStyle = '#e8dcb8'; g.fillRect(0, 0, 256, 360);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(120,90,40,${Math.random() * 0.08})`; g.fillRect(Math.random() * 256, Math.random() * 360, 2 + Math.random() * 10, 1 + Math.random() * 3); }
  g.fillStyle = '#2a1a10'; g.textAlign = 'center';
  g.font = 'bold 46px Georgia, serif'; g.fillText('LOST CAT', 128, 52);
  // a fat cat, drawn by someone who loves her very much and draws very badly
  g.lineWidth = 3; g.strokeStyle = '#2a1a10'; g.fillStyle = '#e08a30';
  g.beginPath(); g.ellipse(128, 170, 70, 52, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(128, 108, 28, 0, TAU); g.fill(); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 10, 86); g.lineTo(128 + s * 24, 70); g.lineTo(128 + s * 27, 94); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.moveTo(196, 180); g.quadraticCurveTo(232, 150, 214, 120); g.stroke();
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(128 + s * 10, 112 + k * 3); g.lineTo(128 + s * 36, 108 + k * 8); g.stroke(); }
  g.fillStyle = '#2a1a10'; g.fillRect(117, 102, 5, 5); g.fillRect(134, 102, 5, 5);
  // her hat
  g.beginPath(); g.ellipse(128, 78, 40, 10, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(96, 78); g.quadraticCurveTo(128, 40, 160, 78); g.fill();
  g.fillStyle = '#d0a030'; g.beginPath(); g.arc(128, 66, 4, 0, TAU); g.fill();
  g.fillStyle = '#2a1a10';
  g.font = 'bold 19px Georgia, serif'; g.fillText("ANSWERS TO 'ADMIRAL'.", 128, 254);
  g.font = 'italic 18px Georgia, serif'; g.fillText('DOES NOT ANSWER.', 128, 282);
  g.font = 'bold 34px Georgia, serif'; g.fillStyle = '#8a1a10'; g.fillText('REWARD', 128, 326);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  _posterMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  return _posterMat;
}
const POSTER_TEXT = 'A hand-lettered poster, nailed up crooked. Under a drawing of an enormous orange cat in an admiral\'s hat:\n\n"LOST CAT. Answers to ADMIRAL. Does not answer. Very fat, very orange, wears a hat (her own). Last seen: everywhere. Do not approach with dogs.\n\nREWARD. Enquire aboard the INDIGNANT HERRING, Brinewhistle Cove — through the Smugglers\' Cut, south of Fort Sutch.\n\n— Capt. R. Gallowglass (heartbroken)"';
/** A LOST CAT poster nailed to a wall or post, facing rotY (0 = facing +z). */
export function buildLostCatPoster(b, x, y, z, rotY, id) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.59), posterMaterial());
  m.position.set(x, y, z);
  m.rotation.set(0, rotY, (Math.random() - 0.5) * 0.12);
  b.add(m);
  const fx = Math.sin(rotY), fz = Math.cos(rotY);
  return b.interact({ kind: 'catposter', id, name: 'A Lost Cat Poster', text: POSTER_TEXT, pos: new THREE.Vector3(x + fx * 0.5, y - 0.3, z + fz * 0.5), radius: 1.2, verb: 'Read' });
}

// ------------------------------------------------------------------ gulls
/** A gull as one geometry with vertex colours, feet at y = 0, beak toward +x. spread: wings out (flying). */
function gullGeo(spread) {
  const parts = [];
  const add = (g, hex) => {
    const c = new THREE.Color(hex);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  };
  add(new THREE.SphereGeometry(0.12, 8, 6).scale(1.9, 0.9, 0.9).translate(0, 0.17, 0), 0xf4f4f0);
  add(new THREE.SphereGeometry(0.075, 8, 6).translate(0.2, 0.25, 0), 0xf8f8f4);
  add(new THREE.ConeGeometry(0.022, 0.09, 5).rotateZ(-PI / 2).translate(0.3, 0.24, 0), 0xe8b020);
  add(new THREE.BoxGeometry(0.14, 0.025, 0.11).translate(-0.25, 0.19, 0), 0x9aa0a8);
  if (spread) {
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(0.16, 0.015, 0.42).rotateX(-s * 0.18).translate(0, 0.22, s * 0.28), 0xa8aeb4);
      add(new THREE.BoxGeometry(0.1, 0.012, 0.16).rotateX(-s * 0.4).translate(-0.02, 0.26, s * 0.55), 0x2a2a2e);
    }
  } else {
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(0.3, 0.06, 0.04).translate(-0.04, 0.2, s * 0.1), 0x9aa0a8);
      add(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4).translate(0, 0.05, s * 0.04), 0xe89040);
    }
  }
  return mergeGeometries(parts);
}
let _gullMat = null;
function gullMaterial() { return (_gullMat ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })); }

/** Gulls perched at [x, y, z, yaw] spots: one instanced mesh. */
function perchedGulls(b, spots) {
  const im = new THREE.InstancedMesh(gullGeo(false), gullMaterial(), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, y, z, a], i) => { m4.compose(p.set(x, y, z), q.setFromAxisAngle(up, a), s.setScalar(0.9 + (i % 3) * 0.1)); im.setMatrixAt(i, m4); });
  im.castShadow = true;
  b.add(im);
}
/** A flock wheeling over a spot: the group spins (cell.spin), carrying the gulls round in a ring. */
function flock(b, x, y, z, n, r0, r1, seed) {
  const r = rng(seed);
  const im = new THREE.InstancedMesh(gullGeo(true), gullMaterial(), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1.3, 1.3, 1.3), p = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.6, rad = r0 + r() * (r1 - r0);
    // the group turns +y, so each gull flies along the tangent (sin a, 0, -cos a), banking into the turn
    e.set(0.35, PI / 2 - a, 0, 'YXZ');
    m4.compose(p.set(Math.cos(a) * rad, (r() - 0.5) * 6, Math.sin(a) * rad), q.setFromEuler(e), s);
    im.setMatrixAt(i, m4);
  }
  im.frustumCulled = false;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(im);
  g.userData.spin = true;
  g.userData.dynamic = true;
  b.add(g);
  return g;
}

// ------------------------------------------------------------------ small pieces
/** A clinker-built rowboat. Returns its group (origin at the keel, bow toward +x). */
function rowboat(len, beam, depth, mat, name) {
  const g = new THREE.Group();
  const shellMat = mat.clone(); shellMat.side = THREE.DoubleSide;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 8, 0, TAU, PI / 2, PI / 2), shellMat);
  shell.scale.set(len / 2, depth, beam / 2);
  shell.position.y = depth;
  shell.castShadow = true;
  g.add(shell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 5, 28), M('timber@d8c8b0'));
  rim.rotation.x = PI / 2; rim.scale.set(len / 2, beam / 2, 1); rim.position.y = depth;
  g.add(rim);
  for (const t of [-0.25, 0.2]) {
    const th = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, beam * 0.88), M('wood@e0d4bc'));
    th.position.set(t * len, depth * 0.72, 0);
    g.add(th);
  }
  if (name) {
    for (const s of [-1, 1]) {
      const p = textPlank(name, 0.62, 0.15, '#2c3a40', '#e8e0c8');
      p.scale.z = 0.2;
      p.position.set(len * 0.3, depth * 0.78, s * beam * 0.44);
      p.rotation.y = s > 0 ? 0 : PI;
      p.rotation.x = -s * 0.35;
      g.add(p);
    }
  }
  return g;
}

/** A fishing net hung to dry between two poles. */
function netFrame(b, H, x, z, rot) {
  const y = H(x, z);
  for (const s of [-1, 1]) b.cyl(0.05, 0.06, 2.4, mats().post, x + Math.cos(rot) * s * 1.15, y + 1.2, z - Math.sin(rot) * s * 1.15, { seg: 5, collide: false });
  b.cyl(0.03, 0.03, 2.5, mats().post, x, y + 2.35, z, { seg: 4, collide: false }).rotation.set(0, rot, PI / 2);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7, 6, 1), netMaterial());
  // let it sag a little in the middle
  const p = net.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / 2.2 + 0.5) * PI) * 0.18);
  net.geometry.computeVertexNormals();
  net.position.set(x, y + 1.45, z);
  net.rotation.y = rot;
  net.castShadow = true;
  b.add(net);
  b.col.addBox(x, z, 1.2, 0.15, rot, y, y + 2.4);
}

/** A scruffy shack on stilts, door facing `face` (0 = +z), its floor `lift` m up; `loft` adds a second storey.
 *  Its porch has a rail and is reached by steps (or, for the tall ones, a ladder and a gangway).
 *  Returns the ridge (for gulls) and the foot of the steps. */
function shack(b, H, x, z, face, lift, name, text, k, loft = false) {
  const m = mats();
  const w = 6, d = 4.6;
  const g0 = Math.min(H(x - 3, z - 2.3), H(x + 3, z - 2.3), H(x - 3, z + 2.3), H(x + 3, z + 2.3), H(x, z));
  const fy = g0 + lift;
  const cs = Math.cos(face), sn = Math.sin(face);
  const P = (u, v) => [x + u * cs + v * sn, z - u * sn + v * cs];
  const wall = m.walls[k % m.walls.length], paint = m.paint[k % m.paint.length], trim = m.paint[(k + 2) % m.paint.length];
  const wh = loft ? 4.3 : 2.6; // wall height
  const porch = d / 2 + 1.5;
  // stilts
  for (const [u, v] of [[-2.8, -2.1], [2.8, -2.1], [-2.8, 2.1], [2.8, 2.1], [-2.8, porch], [2.8, porch]]) {
    const [px, pz] = P(u, v);
    const hy = H(px, pz) - 0.4;
    b.cyl(0.13, 0.16, fy - hy, m.post, px, (fy + hy) / 2, pz, { seg: 6, collide: false });
  }
  // the deck, running out in front as a porch with a rail
  const [px0, pz0] = P(0, 0.75);
  b.box(w + 0.6, 0.22, d + 2.5, m.plank, px0, fy, pz0, face);
  for (let i = 0; i <= 10; i++) {
    const u = -3.2 + i * 0.64;
    if (Math.abs(u) < 0.75) continue; // the gap where the steps come up
    const [rx, rz] = P(u, porch + 0.15);
    b.box(0.06, 0.8, 0.06, m.post, rx, fy + 0.5, rz, face, { collide: false });
  }
  for (const s of [-1, 1]) {
    const [rx, rz] = P(s * 2.05, porch + 0.15);
    b.box(2.4, 0.07, 0.07, m.post, rx, fy + 0.88, rz, face, { collide: false });
  }
  const [hx, hz] = P(0, -0.2);
  b.box(w - 0.4, wh, d - 0.6, wall, hx, fy + 0.11 + wh / 2, hz, face, { walkable: false });
  // corner posts and a painted band under the eaves
  for (const [u, v] of [[-2.75, -2.15], [2.75, -2.15], [-2.75, 1.75], [2.75, 1.75]]) {
    const [cx, cz] = P(u, v);
    b.box(0.17, wh + 0.1, 0.17, m.post, cx, fy + 0.16 + wh / 2, cz, face, { collide: false });
  }
  const front = (d - 0.6) / 2 - 0.2 + 0.03;
  const [ex, ez] = P(0, front + 0.02);
  b.box(w - 0.2, 0.18, 0.05, trim, ex, fy + wh - 0.05, ez, face, { collide: false });
  // the roof, with a patch or two nailed over the leaks
  const roofMat = m.roofs[k % m.roofs.length];
  const ry = fy + 0.11 + wh;
  b.roof(w + 0.5, d + 0.5, 1.5, roofMat, hx, ry, hz, face);
  const pitch = Math.atan2(1.5, (d + 0.5) / 2);
  for (let i = 0; i < 1 + (k % 2); i++) {
    const u = -1.6 + i * 2.6, v = i ? -1.0 : 1.0;
    const [qx, qz] = P(u, v - 0.2);
    const patch = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.8), m.roofs[(k + 1 + i) % m.roofs.length]);
    patch.rotation.order = 'YXZ';
    patch.rotation.set(v > 0 ? pitch : -pitch, face, 0);
    patch.position.set(qx, ry + 1.5 * 0.5 + 0.06, qz);
    b.add(patch);
  }
  // a stovepipe
  const [sx0, sz0] = P(1.7, -1.1);
  b.cyl(0.11, 0.11, 1.5, 'iron', sx0, ry + 1.0, sz0, { seg: 8, collide: false });
  // the door, and windows with painted shutters (the glass glows warm after dark)
  const [dx, dz] = P(0, front);
  b.box(1.0, 1.95, 0.06, paint, dx, fy + 1.09, dz, face, { collide: false });
  const rows = loft ? [1.55, 3.35] : [1.55];
  for (const wy of rows) {
    for (const s of (wy > 2 ? [0] : [-1, 1])) {
      const [wx, wz] = P(s * 1.8, front);
      b.box(0.66, 0.55, 0.05, 'window', wx, fy + wy, wz, face, { collide: false });
      for (const t of [-1, 1]) {
        const [tx, tz] = P(s * 1.8 + t * 0.5, front + 0.02);
        b.box(0.3, 0.64, 0.04, trim, tx, fy + wy, tz, face, { collide: false });
      }
    }
  }
  // a window in each side wall too
  for (const s of [-1, 1]) {
    const [wx, wz] = P(s * (w / 2 - 0.18), -0.2);
    b.box(0.05, 0.5, 0.6, 'window', wx, fy + 1.6, wz, face, { collide: false });
  }
  if (loft) {
    // a little hoist beam under the upper window, for hauling up nets
    const [bx1, bz1] = P(0, front + 0.6);
    b.box(0.14, 0.14, 1.2, m.post, bx1, fy + wh - 0.3, bz1, face, { collide: false });
  }
  // a little name board over the door
  const nb = textPlank(name, 1.6, 0.26, ['#3a6a7a', '#8a3a2a', '#3a6a4a', '#8a6a2a'][k % 4], '#f4ecd8');
  const [nx, nz] = P(0, front + 0.05);
  nb.position.set(nx, fy + 2.3, nz);
  nb.rotation.y = face;
  b.add(nb);
  // steps down to the sand, or a ladder (and a plank gangway) if the porch stands high
  let foot;
  if (lift > 2.1) {
    const [lx, lz] = P(0, porch + 0.35);
    const g = H(lx, lz);
    for (const s of [-1, 1]) {
      const [ax, az] = P(s * 0.25, porch + 0.3);
      b.box(0.06, fy - g + 0.9, 0.06, m.post, ax, (fy + g + 0.9) / 2, az, face, { collide: false });
    }
    for (let y = g + 0.3; y < fy; y += 0.32) b.box(0.5, 0.04, 0.05, m.post, lx, y, lz, face, { collide: false });
    for (let i = 0; i < 6; i++) {
      const [sx, sz] = P(2.0, porch + 0.55 + i * 0.6);
      b.box(1.0, 0.16, 0.6, m.plank, sx, fy - (i + 1) * (lift / 6) + 0.08, sz, face);
    }
    foot = P(2.0, porch + 0.55 + 6 * 0.6);
  } else {
    const n = Math.max(2, Math.round(lift / 0.4));
    for (let i = 0; i < n; i++) {
      const [sx, sz] = P(0, porch + 0.3 + i * 0.42);
      b.box(1.3, 0.16, 0.44, m.plank, sx, fy - (i + 1) * (lift / (n + 0.5)) + 0.08, sz, face);
    }
    foot = P(0, porch + 0.3 + n * 0.42 + 0.2);
  }
  const [ix, iz] = P(0, porch - 0.6);
  b.interact({ kind: 'sign', name, text, pos: new THREE.Vector3(ix, fy + 1.2, iz), radius: 1.6, verb: 'Knock' });
  // a barrel or a crate on the porch, and a pot of flowers
  const [bx, bz] = P(-2.5, porch - 0.5);
  const prop = ['wine_barrel_01', 'wooden_crate_02', 'wooden_barrels_01', 'wooden_bucket_02'][k % 4];
  if (hasProp(prop)) placeProp(b, prop, bx, fy + 0.11, bz, { rot: face + k, scale: 0.9, collide: false });
  const [fx, fz] = P(2.5, porch - 0.4);
  b.cyl(0.18, 0.14, 0.3, tint('wood', 1.5, 0.7, 0.5), fx, fy + 0.26, fz, { seg: 8, collide: false });
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: [0xe85a8a, 0xf0c030, 0xe8603a][k % 3], roughness: 0.8 }));
  bloom.position.set(fx, fy + 0.5, fz); bloom.scale.y = 0.7;
  b.add(bloom);
  return { hx, hz, y: ry + 1.5, face, foot, fy };
}

/** A rack of fish drying in the wind. Pushes fish transforms onto `fish`. */
function fishRack(b, H, x, z, rot, fish) {
  const y = H(x, z);
  const cs = Math.cos(rot), sn = Math.sin(rot);
  for (const s of [-1, 1]) b.box(0.08, 2.0, 0.08, mats().post, x + cs * s * 1.4, y + 1.0, z - sn * s * 1.4, rot, { collide: false, rz: s * 0.18 });
  b.cyl(0.03, 0.03, 3.0, mats().post, x, y + 1.85, z, { seg: 5, collide: false }).rotation.set(0, rot, PI / 2);
  for (let k = 0; k < 9; k++) {
    const u = -1.2 + k * 0.3;
    fish.push([x + cs * u, y + 1.55, z - sn * u, rot]);
  }
  b.col.addBox(x, z, 1.5, 0.2, rot, y, y + 2);
}

/** A lantern on a pole: the light only burns at night. Returns the pole top. */
function lanternPole(b, H, x, z, light = true) {
  const y = H(x, z);
  b.cyl(0.07, 0.09, 3.0, mats().post, x, y + 1.5, z, { seg: 6 });
  b.box(0.7, 0.06, 0.06, mats().post, x + 0.3, y + 2.9, z, 0, { collide: false });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.32, 6), M('lanternglow'));
  lamp.position.set(x + 0.58, y + 2.65, z);
  b.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 6), M('iron'));
  cap.position.set(x + 0.58, y + 2.88, z);
  b.add(cap);
  if (light) b.light(0xffb060, 14, 14, x + 0.58, y + 2.6, z, { night: true });
  return [x, y + 3.0, z];
}

/** Strings of bunting: one instanced mesh of pennants hung along sagging ropes. lines: [[ax,ay,az, bx,by,bz], ...] */
function bunting(b, lines) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.17, 0, 0, 0.17, 0, 0, 0, -0.38, 0]), 3));
  geo.computeVertexNormals();
  const cols = [0xd83a2a, 0xf0c030, 0x3a7ad8, 0xf4f0e4, 0x4aa85a].map((c) => new THREE.Color(c));
  const spots = [];
  const rope = [];
  for (const [ax, ay, az, bx, by, bz] of lines) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(2, Math.floor(len / 0.5));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const y = lerp(ay, by, t) - Math.sin(t * PI) * len * 0.06;
      pts.push(new THREE.Vector3(lerp(ax, bx, t), y, lerp(az, bz, t)));
      if (i > 0 && i < n) spots.push([pts[i], Math.atan2(bx - ax, bz - az) - PI / 2]);
    }
    rope.push(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.015, 3), mats().rope));
  }
  for (const r of rope) b.add(r);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide });
  const im = new THREE.InstancedMesh(geo, mat, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([p, a], i) => {
    m4.compose(p, q.setFromAxisAngle(up, a), s);
    im.setMatrixAt(i, m4);
    im.setColorAt(i, cols[i % cols.length]);
  });
  b.add(im);
}

/** A washing line between two posts, hung with shirts, breeches and one very small jumper. */
function washingLine(b, H, ax, az, bx, bz) {
  const ya = H(ax, az), yb = H(bx, bz);
  for (const [x, z, y] of [[ax, az, ya], [bx, bz, yb]]) b.cyl(0.06, 0.07, 2.3, mats().post, x, y + 1.15, z, { seg: 6 });
  const len = Math.hypot(bx - ax, bz - az), rot = Math.atan2(bx - ax, bz - az) - PI / 2;
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(lerp(ax, bx, t), lerp(ya, yb, t) + 2.2 - Math.sin(t * PI) * 0.25, lerp(az, bz, t))); }
  b.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.012, 3), mats().rope));
  const geo = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide });
  // [t along the line, width, height, colour]
  const clothes = [[0.12, 0.55, 0.65, 0xf4f0e4], [0.24, 0.4, 0.8, 0x3a5a8a], [0.36, 0.6, 0.7, 0xd84a3a], [0.47, 0.18, 0.2, 0xe08a30], [0.56, 0.55, 0.6, 0xf0d060], [0.68, 0.42, 0.82, 0x6a5a48], [0.8, 0.6, 0.66, 0x7ac080], [0.9, 0.5, 0.5, 0xf4f0e4]];
  const im = new THREE.InstancedMesh(geo, mat, clothes.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  clothes.forEach(([t, w, h, c], i) => {
    m4.compose(p.set(lerp(ax, bx, t), lerp(ya, yb, t) + 2.2 - Math.sin(t * PI) * 0.25, lerp(az, bz, t)), q.setFromAxisAngle(up, rot), s.set(w, h, 1));
    im.setMatrixAt(i, m4);
    im.setColorAt(i, new THREE.Color(c));
  });
  im.castShadow = true;
  b.add(im);
  b.col.addBox((ax + bx) / 2, (az + bz) / 2, len / 2, 0.15, rot, Math.min(ya, yb) + 1.3, Math.max(ya, yb) + 2.3, { walkable: false });
}

/** A soft, flickering-looking bonfire flame: crossed additive planes that turn slowly (hidden by default). */
function fireFlames(x, y, z) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 100, 4, 32, 84, 60);
  grd.addColorStop(0, 'rgba(255,240,180,1)'); grd.addColorStop(0.35, 'rgba(255,170,60,0.9)'); grd.addColorStop(0.7, 'rgba(230,80,20,0.4)'); grd.addColorStop(1, 'rgba(120,20,0,0)');
  g.fillStyle = grd;
  g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(54, 50, 62, 90, 32, 126); g.bezierCurveTo(2, 90, 10, 50, 32, 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  for (let k = 0; k < 3; k++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.3 - k * 0.2, 2.0 - k * 0.3).translate(0, (2.0 - k * 0.3) / 2, 0), mat);
    f.rotation.y = (k / 3) * PI;
    f.renderOrder = 7;
    grp.add(f);
  }
  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.8, 14), new THREE.MeshStandardMaterial({ color: 0x401808, emissive: 0xff5010, emissiveIntensity: 1.6, roughness: 1 }));
  coals.rotation.x = -PI / 2; coals.position.y = 0.06;
  grp.add(coals);
  grp.visible = false;
  grp.userData.spin = true;
  grp.userData.dynamic = true;
  return grp;
}

/** A boardwalk of planks laid a hand's breadth above the sand, following the ground in short pieces. */
function boardwalk(b, H, pts, width = 1.5) {
  const m = mats();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len / 3));
    const ry = Math.atan2(-(bz - az), bx - ax);
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, tm = (t0 + t1) / 2;
      const x0 = lerp(ax, bx, t0), z0 = lerp(az, bz, t0), x1 = lerp(ax, bx, t1), z1 = lerp(az, bz, t1);
      const cx = lerp(ax, bx, tm), cz = lerp(az, bz, tm);
      const y = Math.max(H(x0, z0), H(x1, z1), H(cx, cz)) + 0.2;
      b.box(len / n + 0.05, 0.1, width, m.plank, cx, y, cz, ry, { tile: 1.2 });
      for (const s of [-1, 1]) b.cyl(0.06, 0.07, 0.6, m.post, x0 + s * Math.sin(ry) * width * 0.45, y - 0.25, z0 + s * Math.cos(ry) * width * 0.45, { seg: 5, collide: false });
    }
  }
}

/** A little fenced kitchen garden: cabbages, onions, a row of marigolds, and a scarecrow in a tricorn. */
function garden(b, H, x, z, rot) {
  const m = mats();
  const y = H(x, z);
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (u, v) => [x + u * cs + v * sn, z - u * sn + v * cs];
  const W = 5, D = 3.4;
  // pickets all round, one instanced mesh
  const pick = [];
  for (let u = -W / 2; u <= W / 2 + 0.01; u += 0.32) for (const v of [-D / 2, D / 2]) pick.push(P(u, v));
  for (let v = -D / 2 + 0.32; v < D / 2; v += 0.32) for (const u of [-W / 2, W / 2]) if (!(u > 0 && Math.abs(v) < 0.5)) pick.push(P(u, v));
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.75, 0.04).translate(0, 0.375, 0), M('plaster@f4efe4'), pick.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  pick.forEach(([px, pz], i) => { m4.compose(p.set(px, H(px, pz) - 0.05, pz), q, s); pm.setMatrixAt(i, m4); });
  pm.castShadow = true;
  b.add(pm);
  b.col.addBox(x, z, W / 2, D / 2, rot, y - 1, y + 0.75, { walkable: false });
  // dark earth, and the beds
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.3, D - 0.3), new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 }));
  soil.rotation.set(-PI / 2, 0, rot);
  soil.position.set(x, y + 0.03, z);
  b.add(soil);
  const cab = [], flo = [];
  for (let u = -1.9; u <= 1.9; u += 0.55) {
    for (const v of [-0.9, -0.3]) cab.push([...P(u, v), 0.9 + Math.random() * 0.3]);
    flo.push([...P(u, 0.6), 0], [...P(u + 0.27, 0.95), 1]);
  }
  const cm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 6).scale(1, 0.75, 1), new THREE.MeshStandardMaterial({ color: 0x8ab858, roughness: 0.8 }), cab.length);
  cab.forEach(([px, pz, sc], i) => { m4.compose(p.set(px, y + 0.13, pz), q, s.setScalar(sc)); cm.setMatrixAt(i, m4); });
  b.add(cm);
  const fm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.8 }), flo.length);
  const fcols = [new THREE.Color(0xf0a020), new THREE.Color(0xe85a30)];
  flo.forEach(([px, pz, c], i) => { m4.compose(p.set(px, y + 0.32, pz), q, s.setScalar(1)); fm.setMatrixAt(i, m4); fm.setColorAt(i, fcols[c]); });
  b.add(fm);
  // the scarecrow, dressed as a pirate, who has scared nothing in years
  const [sx, sz] = P(1.6, 0.9);
  b.cyl(0.04, 0.05, 1.8, m.post, sx, y + 0.9, sz, { seg: 5, collide: false });
  b.box(1.1, 0.05, 0.05, m.post, sx, y + 1.45, sz, rot, { collide: false });
  b.box(0.5, 0.6, 0.2, m.paint[1], sx, y + 1.3, sz, rot, { collide: false });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), M('hay'));
  head.position.set(sx, y + 1.78, sz);
  b.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.16, 3), new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.9 }));
  hat.position.set(sx, y + 1.95, sz);
  b.add(hat);
}

/** Surf where the sea meets the sand: a thin, broken, soft-edged strip of foam following the shore. */
function surfLine(b, H, x0, x1) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 32;
  const g = c.getContext('2d');
  // clumps of froth with gaps between, fading out at both edges of the strip
  for (let k = 0; k < 16; k++) {
    const cx = Math.random() * 512, len = 14 + Math.random() * 40;
    for (let i = 0; i < len * 1.4; i++) {
      const x = cx + (Math.random() - 0.5) * len, y = 16 + (Math.random() - 0.5) * 18;
      g.fillStyle = `rgba(255,255,255,${(0.25 + Math.random() * 0.5) * Math.sin((y / 32) * PI)})`;
      g.beginPath(); g.arc(((x % 512) + 512) % 512, y, 0.8 + Math.random() * 2.2, 0, TAU); g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  const step = 1.2, rows = [0.5, 0, -0.5];
  const nx = Math.ceil((x1 - x0) / step) + 1;
  const pos = new Float32Array(nx * rows.length * 3), uv = new Float32Array(nx * rows.length * 2), idx = [];
  for (let i = 0; i < nx; i++) {
    const x = x0 + i * step, sz = shoreZ(x);
    rows.forEach((dz, j) => {
      const z = sz + dz, k = i * rows.length + j;
      pos[k * 3] = x; pos[k * 3 + 1] = Math.max(H(x, z), 0) + 0.03; pos[k * 3 + 2] = z;
      uv[k * 2] = x / 24; uv[k * 2 + 1] = j / (rows.length - 1);
      if (i > 0 && j > 0) { const a = k - rows.length - 1, bb = k - rows.length, cc = k - 1; idx.push(a, cc, bb, bb, cc, k); }
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const foam = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd8d6ce, roughness: 0.9, alphaMap: tex, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide }));
  foam.renderOrder = 3;
  foam.userData.dynamic = true;
  b.add(foam);
  return tex;
}

/** Pines in clumps on the hilltops, and outcrops of rock on the steep faces. */
function hillsides(b, H, terrain, r) {
  const pines = [];
  for (let i = 0; i < 400 && pines.length < 70; i++) {
    const x = (r() - 0.5) * 290, z = -140 + r() * 200;
    const q = rim(x, z);
    if (q < 1.25 || z > 50) continue;
    if (Math.abs(x) < 9 && z < -50 && z > -75) continue; // keep the tunnel and the ledge clear
    if (terrain.normalAt(x, z).y < 0.85) continue;
    // in clumps
    const n = 2 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) pines.push([x + (r() - 0.5) * 9, z + (r() - 0.5) * 9]);
  }
  const ref = buildTreeMesh('pine', 1, 23);
  const im = new THREE.InstancedMesh(ref.geometry, ref.material, pines.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  pines.forEach(([x, z], i) => {
    const sc = 0.8 + r() * 0.7;
    m4.compose(p.set(x, H(x, z) - 0.3, z), q.setFromAxisAngle(up, r() * TAU), s.set(sc, sc * (0.85 + r() * 0.35), sc));
    im.setMatrixAt(i, m4);
    im.setColorAt(i, new THREE.Color().setHSL(0.3 + (r() - 0.5) * 0.05, 0.3, 0.7 + r() * 0.2));
  });
  im.castShadow = true; im.receiveShadow = true;
  im.customDepthMaterial = ref.customDepthMaterial;
  im.frustumCulled = false;
  im.userData.dynamic = true;
  b.add(im);
  // outcrops: big, half-buried crags where the hillside is steepest
  let n = 0;
  for (let i = 0; i < 900 && n < 12; i++) {
    const x = (r() - 0.5) * 230, z = -110 + r() * 180;
    const h = H(x, z);
    if (h < 3 || h > 34 || rim(x, z) < 0.9) continue;
    if (terrain.normalAt(x, z).y > 0.8) continue;
    const sc = 4 + r() * 6;
    boulder(b, x, h - sc * 0.25, z, sc, r() * TAU, n);
    n++;
  }
}

// ------------------------------------------------------------------ the cove
// shacks round the plaza: [x, z, height of the porch, name, what you find when you knock, second storey]
// (each faces the bonfire)
const SHACKS = [
  [-37, -6, 1.4, 'Bilgewater Shack', 'A shack on stilts, patched with old sail. A sign on the door says GONE FISHING. Underneath, in a different hand: SINCE SPRING.', false],
  [-25, -21, 2.4, "Kettle's Nets", 'The door is open a crack. Nets, floats and an astonishing number of cork stoppers fill the room. Nobody answers.', true],
  [-7, -26, 1.9, 'The Leaning Lobster', 'The whole shack leans gently to the left, as if listening. A painted lobster on the door is giving you a thumbs-up, which lobsters cannot do.', false],
  [11, -24, 2.6, "Mother Gull's", 'Somebody inside is snoring like a foghorn. You decide to let them.', true],
  [26, -15, 1.7, 'Odds and Sods', 'SHIP\'S CHANDLER — ROPE, TAR, PEGS, GOSSIP. CLOSED FOR GOSSIP.', false],
  [38, -2, 1.3, 'Three Planks Short', 'True to its name, the porch is three planks short. A note pinned to the door: "MIND THE GAP. — MGMT."', false],
];
const shackFace = (x, z) => Math.atan2(COVE.fire.x - x, COVE.fire.z - z);
const GARDEN = { x: -36, z: 9, rot: 0.35 };

/** The worn sand paths: plaza to every door, the pier, the cliff path and the garden gate. */
function layWalks() {
  WALKS.length = 0;
  const F = COVE.fire;
  const to = (x, z) => WALKS.push([F.x, F.z, x, z]);
  for (const [x, z] of SHACKS) { const f = shackFace(x, z); to(x + Math.sin(f) * 7.5, z + Math.cos(f) * 7.5); }
  to(COVE.tavernDoor.x, COVE.tavernDoor.z + 1);
  to(COVE.herringDoor.x, COVE.herringDoor.z - 1);
  to(COVE.pierStart.x, COVE.pierStart.z - 3);
  to(PATH[PATH.length - 1][0], PATH[PATH.length - 1][1]);
  to(GARDEN.x + 3, GARDEN.z);
}

export function buildCove(b, game) {
  layWalks();
  const terrain = new Terrain({ size: 300, seg: 200, heightFn: coveHeight, colorFn: coveSplat, splat: true, material: createTerrainMaterial() });
  terrain.mesh.receiveShadow = true;
  b.add(terrain.mesh);
  b.col.ground = (x, z) => terrain.heightAt(x, z);
  const H = (x, z) => terrain.heightAt(x, z);
  const r = rng(808);
  const m = mats();
  const state = { terrain };
  const gulls = []; // perches: [x, y, z, yaw]

  // ---- the hills: pines on the tops, rock outcrops on the steep faces
  hillsides(b, H, terrain, r);

  // ---- the tunnel mouth in a tor of rock behind the ledge, and the way back to Cyrodiil
  {
    const E = COVE.exitDoor, y = H(E.x, E.z + 4);
    boulder(b, E.x + 0.5, y - 2.5, E.z - 6.5, 13, 0.3, 0, { collide: false });
    for (const s of [-1, 1]) boulder(b, E.x + s * 5.4, y - 1.2, E.z - 2.0, 6.5, s * 1.7, s > 0 ? 1 : 2, { collide: false });
    boulder(b, E.x - 0.3, y + 2.9, E.z - 2.4, 4.6, 1.1, 3, { collide: false });
    b.col.addBox(E.x, E.z - 3, 7.5, 3, 0, y - 2, y + 9, { walkable: false });
    b.box(2.6, 3.0, 2.4, m.black, E.x, y + 1.5, E.z - 1.0, 0, { collide: false, cast: false });
    for (const s of [-1, 1]) b.box(0.3, 3.2, 0.3, m.post, E.x + s * 1.4, y + 1.6, E.z + 0.5, 0, { collide: false });
    b.box(3.3, 0.32, 0.36, m.post, E.x, y + 3.25, E.z + 0.5, 0, { collide: false });
    const sign = textPlank("THE SMUGGLERS' CUT", 2.2, 0.3, '#2a1e14', '#e8d8a8');
    sign.position.set(E.x, y + 3.65, E.z + 0.6);
    b.add(sign);
    b.interact({ kind: 'door', cell: 'world', exit: true, coveExit: true, name: 'Cyrodiil', pos: new THREE.Vector3(E.x, y + 1.4, E.z + 1.6), radius: 1.6, verb: 'Exit' });
    lanternPole(b, H, E.x + 3.2, E.z + 2.2);
    buildLostCatPoster(b, E.x - 1.62, y + 1.7, E.z + 0.7, 0, 'poster_cove');
    // a rope rail down the first stretch of the path
    for (let k = 0; k < 6; k++) {
      const t = k / 5, px = lerp(PATH[0][0], PATH[1][0], t), pz = lerp(PATH[0][1], PATH[1][1], t) - 1.8;
      b.cyl(0.06, 0.07, 1.1, m.post, px, H(px, pz) + 0.55, pz, { seg: 5, collide: false });
    }
  }

  // ---- Brinewhistle: scruffy painted shacks on stilts round the plaza, stepping up the slope, joined by a boardwalk
  const feet = [];
  SHACKS.forEach(([x, z, lift, name, text, loft], k) => {
    const f = shackFace(x, z);
    const s = shack(b, H, x, z, f, lift, name, text, k, loft);
    feet.push(s.foot);
    for (const u of [-1.8, 0.4, 2.0].slice(0, 1 + (k % 3))) gulls.push([s.hx + Math.cos(f) * u, s.y, s.hz - Math.sin(f) * u, f + (k % 2 ? 0 : PI)]);
  });
  boardwalk(b, H, feet);
  garden(b, H, GARDEN.x, GARDEN.z, GARDEN.rot);

  const fish = [];
  fishRack(b, H, -29, 12, 0.6, fish);
  fishRack(b, H, 37, 9, -0.5, fish);
  fishRack(b, H, -13, -13, 0.2, fish);
  {
    const geo = new THREE.SphereGeometry(0.1, 8, 5);
    geo.scale(1, 2.6, 0.35);
    const im = new THREE.InstancedMesh(geo, m.fish, fish.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    fish.forEach(([x, y, z, rot], i) => { m4.compose(p.set(x, y - 0.12, z), q.setFromEuler(new THREE.Euler(0, rot + PI / 2, (r() - 0.5) * 0.3)), s); im.setMatrixAt(i, m4); });
    im.castShadow = true;
    b.add(im);
  }
  // nets drying on frames down by the sand, and a washing line between the back shacks
  for (const [x, z, rot] of [[-20, 16, -0.2], [-31, 17, 0.4], [13, 19, 0.1], [33, 19, -0.3]]) netFrame(b, H, x, z, rot);
  washingLine(b, H, -19.5, -27.5, -12.5, -29.5);
  // lobster pots, rope coils, barrels and crates everywhere a pirate might put one down
  {
    const pot = new THREE.CylinderGeometry(0.32, 0.38, 0.5, 8, 1, true);
    const potMat = new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 1, wireframe: true });
    const coil = new THREE.TorusGeometry(0.3, 0.07, 5, 14);
    for (const [x, z] of [[-26, 14], [-25, 15.2], [-12, 17], [10, 16], [11, 17.2], [29, 21], [-1, 19.5], [-31, 1], [31, -7]]) {
      const pm = new THREE.Mesh(pot, potMat);
      pm.position.set(x, H(x, z) + 0.25, z);
      b.add(pm);
      const c = new THREE.Mesh(coil, m.rope);
      c.rotation.x = PI / 2;
      c.position.set(x + 0.8, H(x + 0.8, z + 0.3) + 0.07, z + 0.3);
      b.add(c);
    }
    const props = [
      [-15, 1.5, 'wooden_crate_02'], [-14, 2.7, 'wine_barrel_01'], [12, 3, 'wooden_barrels_01'], [13.5, 4.5, 'wooden_crate_01'], [-27.5, 0, 'wine_barrel_01'],
      [27, 6, 'wine_barrel_01'], [28.2, 7, 'wooden_crate_02'], [33, -7.5, 'wooden_barrels_01'], [-11, -6, 'wooden_crate_01'], [-10, -4.6, 'wooden_bucket_02'],
      [3, -11, 'wine_barrel_01'], [4.2, -11.4, 'wine_barrel_01'], [18, -7, 'wooden_crate_02'], [-31, -14, 'wooden_bucket_01'], [8, 12, 'wooden_crate_01'],
    ];
    for (const [x, z, id] of props) if (hasProp(id)) placeProp(b, id, x, H(x, z), z, { rot: r() * TAU, scale: 1.1 });
  }
  // rowboats drawn up on the sand, painted every colour the chandler had
  {
    const boats = [[-17, 19.5, 0.3, 0, false, 'MACKEREL'], [-27, 19, -0.5, 1, true, null], [25, 20.5, 0.9, 2, false, 'POLITE DOG'], [36, 23.5, -0.2, 3, false, null]];
    for (const [x, z, rot, pi, upturned, name] of boats) {
      const bt = rowboat(3.4, 1.35, 0.5, m.paint[pi], name);
      const y = H(x, z);
      bt.position.set(x, upturned ? y + 1.0 : y - 0.08, z);
      bt.rotation.set(0, rot, upturned ? PI : 0.08);
      b.add(bt);
      b.col.addBox(x, z, 1.7, 0.68, rot, y - 0.5, y + 0.5, { walkable: true });
      if (!upturned) gulls.push([x + Math.cos(rot) * 1.4, y + 0.5, z - Math.sin(rot) * 1.4, rot]);
    }
  }
  // lanterns: three along the boardwalk burn after dark; the rest are for show
  const poles = [[-15, -11, true], [-2, -15, true], [12, -12, true], [-29, -2, false], [30, -3, false], [8, 5, false], [-11, 12, false]].map(([x, z, l]) => lanternPole(b, H, x, z, l));
  for (const [x, y, z] of poles.slice(0, 5)) if (r() < 0.8) gulls.push([x, y, z, r() * TAU]);

  // ---- the Salty Mitten: the stern half of a wrecked galleon, stood upright on the terrace as a tavern
  buildMitten(b, H, gulls);

  // ---- the Indignant Herring, beached and heeled over toward the sea: the heart of the town
  buildHerring(b, H, state);
  {
    const R = COVE.rail;
    for (const dx of [-4, 2.5, 5]) gulls.push([R.x + dx, R.y, R.z, PI / 2]);
  }

  // ---- bunting strung round the square on tall poles, and out to the Herring and the Mitten
  {
    const P = [[-11, -4], [8, -4], [9, 12], [-12, 13]].map(([x, z]) => {
      const y = H(x, z);
      b.cyl(0.08, 0.1, 5.6, m.post, x, y + 2.8, z, { seg: 6 });
      return [x, y + 5.5, z];
    });
    const lines = [];
    for (let i = 0; i < 4; i++) { const [a, c] = [P[i], P[(i + 1) % 4]]; lines.push([...a, ...c]); }
    lines.push([...P[2], COVE.herring.x - 6, COVE.rail.y + 3, COVE.herring.z - 0.5]);
    lines.push([...P[3], COVE.tavern.x + 4.4, H(COVE.tavern.x, COVE.tavern.z) + 6.0, COVE.tavern.z + 3.6]);
    lines.push([...P[0], COVE.tavern.x, H(COVE.tavern.x, COVE.tavern.z) + 10.6, COVE.tavern.z - 1.5]);
    bunting(b, lines);
    for (const [x, y, z] of P) gulls.push([x, y + 0.05, z, r() * TAU]);
  }

  // ---- the pier, the fishing spot at its end, and the jolly boat moored alongside
  {
    const z0 = 12, z1 = COVE.pierEnd.z + 2, top = 3.0, x = COVE.pierStart.x;
    b.box(3, 0.22, z1 - z0, m.plank, x, top - 0.11, (z0 + z1) / 2, 0, { walkable: true, tile: 1.5 });
    for (const s of [-1, 1]) b.box(0.18, 0.2, z1 - z0, m.post, x + s * 1.5, top - 0.25, (z0 + z1) / 2, 0, { collide: false });
    for (let z = z0 + 2; z <= z1; z += 5) {
      for (const s of [-1, 1]) {
        const sb = H(x + s * 1.4, z) - 0.5;
        b.cyl(0.14, 0.17, top - sb, m.post, x + s * 1.4, (top + sb) / 2 - 0.2, z, { seg: 7, collide: false });
      }
    }
    // bollards (gulls sit on them), a bucket, a lantern at the end
    for (const [u, v] of [[-1.2, z1 - 0.6], [1.2, z1 - 0.6], [1.2, COVE.jolly.z - 1], [-1.2, 40], [1.2, 28]]) {
      b.cyl(0.16, 0.2, 0.5, M('timber@b0a490'), x + u, top + 0.25, v, { seg: 8 });
      if (v !== COVE.jolly.z - 1) gulls.push([x + u, top + 0.5, v, r() * TAU]);
    }
    if (hasProp('wooden_bucket_02')) placeProp(b, 'wooden_bucket_02', x - 0.9, top, z1 - 2.2, { scale: 0.9 });
    if (hasProp('wooden_crate_02')) placeProp(b, 'wooden_crate_02', x - 0.8, top, 20, { rot: 0.2 });
    lanternPole(b, (px, pz) => (Math.abs(px - x) < 2 && pz > z0 ? top : H(px, pz)), x - 1.2, z1 - 1.2);
    const E = COVE.pierEnd;
    b.interact({ kind: 'fishspot', id: 'pier_end', name: 'End of the Pier', text: 'The boards end over deep green water. Old hooks are stuck in the bollards, and someone has carved a tally of fish into the end post — and, under it, a much longer tally labelled "ONES THAT GOT AWAY". Shoals of something silver turn in the water far below.', pos: new THREE.Vector3(E.x, top + 0.8, E.z + 0.8), radius: 1.6, verb: 'Fish' });
    const J = COVE.jolly;
    const boat = rowboat(3.6, 1.45, 0.55, M('wood@6a9ad0'), 'JOLLY');
    boat.position.set(J.x, -0.18, J.z);
    boat.rotation.y = PI / 2;
    boat.userData.dynamic = true;
    boat.traverse((o) => { o.userData.dynamic = true; });
    b.add(boat);
    state.jollyBoat = boat;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 4), m.rope);
    rope.position.set(J.x - 1.1, 1.6, J.z - 1.4);
    rope.rotation.set(0.5, 0, 0.9);
    b.add(rope);
    b.interact({ kind: 'jollyboat', id: 'jolly_boat', name: 'The Jolly Boat', pos: new THREE.Vector3(x + 1.3, top + 0.7, J.z), radius: 1.8, verb: 'Row out' });
    // Fennick's barrel by the foot of the pier: open-topped, no lid, no collider (he lives in it)
    const B = COVE.barrel, by = H(B.x, B.z);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.4, 1.0, 12, 1, true), M('wood@c8b090').clone());
    barrel.material.side = THREE.DoubleSide;
    barrel.position.set(B.x, by + 0.5, B.z);
    barrel.castShadow = true;
    b.add(barrel);
    for (const hy of [0.18, 0.82]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(hy < 0.5 ? 0.42 : 0.455, 0.025, 4, 20), M('iron'));
      hoop.rotation.x = PI / 2; hoop.position.set(B.x, by + hy, B.z);
      b.add(hoop);
    }
  }

  // ---- the bonfire ring on the sand (lit after dark and for Naming Night)
  {
    const F = COVE.fire, y = H(F.x, F.z);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU;
      crag(b, m.rock, F.x + Math.cos(a) * 1.5, H(F.x + Math.cos(a) * 1.5, F.z + Math.sin(a) * 1.5) + 0.1, F.z + Math.sin(a) * 1.5, 0.32, 0.22, 0.3, i, { collide: false });
    }
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.6, 6), M('timber@a89a88'));
      log.position.set(F.x, y + 0.35, F.z);
      log.rotation.set(0.95, i * PI / 4, 0);
      log.castShadow = true;
      b.add(log);
    }
    const ash = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16), new THREE.MeshStandardMaterial({ color: 0x4a4440, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
    ash.rotation.x = -PI / 2; ash.position.set(F.x, y + 0.04, F.z);
    b.add(ash);
    b.col.addCircle(F.x, F.z, 1.2, y - 1, y + 0.4, { walkable: false });
    state.fire = { x: F.x, y, z: F.z };
    state.fireLight = b.light(0xff8a3a, 30, 20, F.x, y + 1.4, F.z, { flicker: true });
    state.fireLight.on = false;
    // embers rise from it (not a 'flame' emitter: those get an always-on flame from the firelight pass)
    state.fireEmitter = b.emitter('ember', F.x, y + 0.6, F.z, 0, { color: 0xff7020, spread: 0.6 });
    state.fireMesh = fireFlames(F.x, y + 0.1, F.z);
    b.add(state.fireMesh);
    // bleached driftwood logs to sit on round it
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3;
      const lx = F.x + Math.cos(a) * 4.2, lz = F.z + Math.sin(a) * 4.2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 7), M('wood@ece4d8'));
      log.position.set(lx, H(lx, lz) + 0.2, lz);
      log.rotation.set(0, PI / 2 - a, PI / 2); // lying tangent to the ring
      log.castShadow = true;
      b.add(log);
      b.col.addBox(lx, lz, 1.1, 0.25, PI / 2 - a, H(lx, lz), H(lx, lz) + 0.42, { walkable: true });
    }
  }

  // ---- Crumpet's Nook: a sea arch on the west beach, with a rotten rowboat in it
  {
    const N = COVE.nook, y = H(N.x, N.z);
    // two legs of weathered rock and a span across the top, the arch open to the sea
    for (const s of [-1, 1]) {
      boulder(b, N.x + s * 5.6, y - 1.0, N.z, 6.5, s * 0.8, s > 0 ? 0 : 1);
      boulder(b, N.x + s * 5.2, y + 3.2, N.z + 0.4, 5.0, s * 2.2, s > 0 ? 1 : 0, { collide: false });
    }
    boulder(b, N.x, y + 5.6, N.z + 0.3, 13, PI / 2 + 0.1, 0, { collide: false });
    const boat = rowboat(3.4, 1.35, 0.5, M('wood@b8b4a8'), 'CRUMPET');
    boat.position.set(N.x, y - 0.12, N.z - 1);
    boat.rotation.set(0, 0.4, 0.06);
    b.add(boat);
    // a heap of stolen wool, kneaded into a nest
    const yarn = new THREE.SphereGeometry(0.14, 10, 8);
    for (let i = 0; i < 16; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * 0.55;
      const w = new THREE.Mesh(yarn, m.wool[i % 4]);
      w.position.set(N.x + Math.cos(a) * d, y + 0.3 + (0.55 - d) * 0.2, N.z - 1 + Math.sin(a) * d * 0.6);
      w.scale.set(1, 0.85, 1).multiplyScalar(0.8 + r() * 0.5);
      b.add(w);
    }
    b.interact({ kind: 'sign', name: 'A Rotten Rowboat', text: 'An old jolly boat, grey with age and soft as cake, dragged up under the arch long ago and left to the gulls. Faded paint on the bow still spells out CRUMPET. Someone small, round and orange has been making a nest in it out of what is clearly somebody else\'s knitting.', pos: new THREE.Vector3(N.x + 1.8, y + 0.9, N.z + 0.4), radius: 1.6, verb: 'Examine' });
  }

  // ---- the Drowned Grotto, a sea cave in the foot of the west cliffs
  {
    const G = COVE.grottoDoor, y = H(G.x, G.z);
    const mx = G.x - 3.6;
    for (let i = 0; i < 6; i++) {
      const a = (i / 5) * PI;
      crag(b, m.wetRock, mx - 0.8, y + Math.sin(a) * 3.6 + 0.2, G.z + Math.cos(a) * 3.9, 2.0, 2.0 + r(), 2.3, i, { collide: false });
    }
    boulder(b, mx - 6.5, y - 2, G.z - 0.5, 13, 1.2, 0, { collide: false });
    boulder(b, mx - 3.5, y - 1, G.z + 6.5, 7, 2.4, 1, { collide: false });
    boulder(b, mx - 3.5, y - 1, G.z - 7, 7.5, 0.4, 2, { collide: false });
    b.col.addBox(mx - 3, G.z, 4, 9, 0, y - 2, y + 9, { walkable: false });
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(2.2, 18, 0, PI), m.black);
    mouth.position.set(mx + 0.4, y + 0.3, G.z);
    mouth.rotation.y = PI / 2;
    mouth.scale.y = 1.25;
    b.add(mouth);
    const low = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.6), m.black);
    low.position.set(mx + 0.4, y + 0.0, G.z); low.rotation.y = PI / 2;
    b.add(low);
    const weed = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 1, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.2 + r() * 1.2), weed);
      s.position.set(mx + 0.9, y + 2.6 - r() * 0.4, G.z - 1.8 + i * 0.45);
      s.rotation.y = PI / 2;
      b.add(s);
    }
    b.interact({ kind: 'door', cell: 'drowned_grotto', name: 'The Drowned Grotto', pos: new THREE.Vector3(G.x, y + 1.4, G.z), radius: 1.8, verb: 'Enter' });
  }

  // ---- the lighthouse on the east headland: out of use, its lamp room dark
  {
    const L = COVE.lighthouse, y = H(L.x, L.z) - 0.3;
    b.cyl(3.6, 3.9, 1.6, 'whitestone@c8c0b0', L.x, y + 0.8, L.z, { seg: 16, walkable: true });
    b.cyl(2.5, 3.1, 16, 'whitestone@ece4d4', L.x, y + 9.6, L.z, { seg: 16 });
    for (const [by, rad] of [[5.2, 2.98], [11.4, 2.72]]) b.cyl(rad, rad + 0.08, 2.0, 'plaster@d84a3a', L.x, y + by, L.z, { seg: 16, collide: false });
    b.cyl(3.0, 3.0, 0.3, 'iron', L.x, y + 17.7, L.z, { seg: 16, collide: false });
    b.cyl(1.8, 1.8, 2.4, 'window', L.x, y + 19.0, L.z, { seg: 12, collide: false });
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.8, 12), M('roofred'));
    cap.position.set(L.x, y + 21.1, L.z); cap.castShadow = true;
    b.add(cap);
    for (let k = 0; k < 5; k++) gulls.push([L.x + Math.cos(k * 1.3) * 2.85, y + 17.85, L.z + Math.sin(k * 1.3) * 2.85, k * 1.3 + PI / 2]);
    const S = COVE.lighthouseSteps;
    const a = Math.atan2(S.x - L.x, S.z - L.z);
    const dx = Math.sin(a), dz = Math.cos(a);
    b.box(1.2, 2.2, 0.12, m.paint[1], L.x + dx * 3.05, y + 2.7, L.z + dz * 3.05, a, { collide: false });
    for (let k = 0; k < 4; k++) b.box(1.8, 0.3, 0.6, 'whitestone@d8d0c0', L.x + dx * (4.1 + k * 0.6), y + 1.45 - k * 0.38, L.z + dz * (4.1 + k * 0.6), a);
    b.interact({ kind: 'sign', name: 'The Lighthouse', text: 'The lighthouse door is nailed shut, with a newer board across it painted NO. The lamp at the top has been dark for years — the crew say a lighthouse is a terrible thing to have outside a pirate town, and they are not wrong.', pos: new THREE.Vector3(L.x + dx * 4.2, y + 2.4, L.z + dz * 4.2), radius: 1.6, verb: 'Examine' });
  }

  // ---- the Gullstack: a craggy sea stack, white with gulls, foam round its foot
  buildGullstack(b, gulls);

  // ---- the Dread Meringue, riding at anchor in the fog (hidden until she comes)
  buildMeringue(b, state);

  // ---- surf along the waterline
  surfLine(b, H, -46, 46);

  // ---- gulls: perched on every roof, rail and bollard, and wheeling over the town and the stack
  perchedGulls(b, gulls);
  state.gulls = [flock(b, 2, 22, 4, 7, 8, 14, 31), flock(b, COVE.gullstack.x, 32, COVE.gullstack.z, 6, 7, 12, 77)];

  // ---- paw prints from the town beach west to the Nook, and wet boot prints from the Herring to the sea
  state.pawPrints = prints(b, H, [[-6, 20], [-16, 21], [-26, 21.6], [-32, 21.6], [-35.5, 20.2]], 0.34, 0.06, 0.11, 'paw');
  const HD = COVE.herringDoor;
  state.wetPrints = prints(b, H, [[HD.x, HD.z - 0.4], [12, 7.5], [8, 12], [8.5, 18], [9.5, 23], [10.5, 27]], 0.7, 0.14, 0.28, 'boot');

  // ---- the sea's edge: a band of fog on the horizon so the world doesn't stop at a line
  {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, '#000'); grd.addColorStop(0.55, '#888'); grd.addColorStop(0.75, '#fff'); grd.addColorStop(1, '#fff');
    g.fillStyle = grd; g.fillRect(0, 0, 4, 128);
    const alpha = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8a9aa8, alphaMap: alpha, transparent: true, depthWrite: false, fog: false, side: THREE.BackSide });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(640, 640, 90, 48, 1, true), mat);
    wall.position.y = 30;
    wall.renderOrder = 2;
    wall.userData.dynamic = true;
    b.add(wall);
    state.wall = mat;
  }

  // ---- scatter: dune grass on the terrace, driftwood and pebbles on the sand, mossy boulders at the cliff foot
  {
    const sc = new PropScatter(50);
    const pick = (id) => Math.floor(r() * Math.max(1, propVariants(id)));
    const T = COVE.town;
    const walks = [feet, [[-3, -17.2], [-2, -6]], [feet[4], [22, 1.6]], [feet[0], [-27, 2.4]]];
    const nearWalk = (x, z) => walks.some((w) => w.some((p, i) => i > 0 && distToSegment(x, z, w[i - 1][0], w[i - 1][1], p[0], p[1]) < 1.3));
    const clear = (x, z) => {
      if (Math.hypot(x - T.x, z - T.z) < 9) return false;
      if (Math.abs(x - COVE.herring.x) < 14 && z > 4 && z < 19) return false;
      if (Math.abs(x - COVE.tavern.x) < 6.5 && Math.abs(z - COVE.tavern.z) < 6) return false;
      if (Math.abs(x - COVE.pierStart.x) < 2.5 && z > 8) return false;
      if (SHACKS.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 4.5)) return false;
      if (Math.hypot(x - COVE.fire.x, z - COVE.fire.z) < 5.5) return false;
      if (Math.hypot(x - GARDEN.x, z - GARDEN.z) < 3.6) return false;
      if (nearWalk(x, z)) return false;
      return pathAt(x, z)[0] > 2.2;
    };
    for (let i = 0; i < 3200; i++) {
      const x = (r() - 0.5) * 290, z = -135 + r() * 185;
      if (!clear(x, z)) continue;
      const h = H(x, z), q = r(), rot = r() * TAU;
      if (h < 0.3) continue;
      const ny = terrain.normalAt(x, z).y;
      if (h > 2.4 && h < 26 && ny > 0.8) {
        if (q < 0.55) sc.add('shrub_04', x, h - 0.05, z, { variant: pick('shrub_04'), height: 0.35 + r() * 0.5, rotY: rot, maxDist: 70 });
        else if (q < 0.68) sc.add('nettle_plant', x, h - 0.03, z, { variant: pick('nettle_plant'), height: 0.5 + r() * 0.35, rotY: rot, maxDist: 55 });
        else if (q < 0.71) sc.add('shrub_02', x, h - 0.05, z, { variant: pick('shrub_02'), height: 0.8 + r() * 0.6, rotY: rot, maxDist: 100 });
        else if (q < 0.73) sc.add(r() < 0.5 ? 'celandine_01' : 'dandelion_01', x, h - 0.02, z, { variant: pick('celandine_01'), height: 0.3 + r() * 0.2, rotY: rot, maxDist: 45 });
      } else if (h < 2.4) {
        if (q < 0.09) sc.add(r() < 0.5 ? 'dead_tree_trunk' : 'dead_tree_trunk_02', x, h - 0.1, z, { scale: 0.4 + r() * 0.35, rotY: rot, maxDist: 140, shadow: true });
        else if (q < 0.15) sc.add('dry_branches_medium_01', x, h - 0.05, z, { scale: 0.7 + r() * 0.5, rotY: rot, maxDist: 70 });
        else if (q < 0.32) sc.add('stone_01', x, h - 0.05, z, { variant: pick('stone_01'), scale: 0.4 + r() * 0.6, rotY: rot, maxDist: 60 });
      } else if (ny < 0.8 && h < 34 && q < 0.12) {
        const id = q < 0.04 ? 'rock_moss_set_01' : q < 0.07 ? 'rock_moss_set_02' : q < 0.1 ? 'boulder_01' : 'rock_07';
        const s = 0.9 + r() * 1.8;
        if (sc.add(id, x, h - 0.4, z, { variant: pick(id), scale: s, rotY: rot, maxDist: 200, shadow: true })) b.col.addCircle(x, z, 0.8 * s, h - 1, h + 1.2 * s, { walkable: false });
      }
    }
    state.scatter = sc;
  }
  return state;
}

/** Prints laid along a path, alternating left and right: 'paw' (a cat's) or 'boot' (a drowned sailor's, wet). */
function prints(b, H, pts, step, side, size, kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  if (kind === 'paw') {
    g.beginPath(); g.ellipse(32, 40, 13, 11, 0, 0, TAU); g.fill();
    for (const [x, y] of [[17, 22], [27, 15], [38, 15], [48, 22]]) { g.beginPath(); g.ellipse(x, y, 5.5, 6.5, 0, 0, TAU); g.fill(); }
  } else {
    g.beginPath(); g.ellipse(32, 22, 12, 17, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(32, 50, 9, 10, 0, 0, TAU); g.fill();
  }
  const alpha = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshStandardMaterial({
    color: kind === 'paw' ? 0x6a5a40 : 0x2a2a24, alphaMap: alpha, transparent: true, depthWrite: false,
    roughness: kind === 'paw' ? 1 : 0.25, metalness: kind === 'paw' ? 0 : 0.2, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const geo = new THREE.PlaneGeometry(size, size);
  geo.rotateX(-PI / 2);
  const list = [];
  let flip = 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / len, dz = (bz - az) / len;
    for (let t = 0; t < len; t += step) {
      flip = -flip;
      const x = ax + dx * t - dz * side * flip, z = az + dz * t + dx * side * flip;
      list.push([x, H(x, z) + 0.025, z, Math.atan2(-dx, -dz)]);
    }
  }
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  list.forEach(([x, y, z, a], i) => { m4.compose(p.set(x, y, z), q.setFromAxisAngle(up, a), s); im.setMatrixAt(i, m4); });
  im.renderOrder = 3;
  im.frustumCulled = false;
  const grp = new THREE.Group();
  grp.add(im);
  grp.visible = false;
  grp.userData.dynamic = true;
  b.add(grp);
  return grp;
}

/** The Salty Mitten: half a galleon's stern stood on the sand — a curved hull, a painted transom with a
 *  gallery of windows over the door, gilt quarter-pieces, stern lanterns, and a stub of mizzen mast. */
function buildMitten(b, H, gulls) {
  const m = mats();
  const T = COVE.tavern, y = H(T.x, T.z) - 0.3;
  const len = 8, top = 5.6, front = T.z + len / 2;
  // the hull section, swelling at the bilge and tucking in toward the deck
  const sh = new THREE.Shape();
  sh.moveTo(-3.7, 0);
  sh.bezierCurveTo(-4.7, 0.5, -5.15, 2.2, -5.05, 3.4);
  sh.bezierCurveTo(-4.95, 4.5, -4.7, 5.2, -4.5, top);
  sh.lineTo(4.5, top);
  sh.bezierCurveTo(4.7, 5.2, 4.95, 4.5, 5.05, 3.4);
  sh.bezierCurveTo(5.15, 2.2, 4.7, 0.5, 3.7, 0);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -len / 2);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.5, uv.getY(i) / 2.5);
  const hull = new THREE.Mesh(geo, m.hull);
  hull.position.set(T.x, y, T.z);
  hull.castShadow = true; hull.receiveShadow = true;
  b.add(hull);
  b.col.addBox(T.x, T.z, 5.05, len / 2, 0, y - 1, y + top, { walkable: false });
  // a row of windows down each side of the hull, and the painted wales: yellow at the bilge, teal under the deck
  for (const s of [-1, 1]) for (const v of [-2.6, 0, 2.6]) b.box(0.06, 0.6, 0.8, 'window', T.x + s * 5.12, y + 2.5, T.z + v, 0, { collide: false });
  for (const s of [-1, 1]) {
    b.box(0.14, 0.32, len + 0.04, m.paint[3], T.x + s * 5.06, y + 3.4, T.z, 0, { collide: false });
    b.box(0.14, 0.26, len + 0.04, m.paint[0], T.x + s * 4.66, y + 5.0, T.z, 0, { collide: false });
  }
  // the transom: the gallery of windows, gilt trim, the name board and the door
  b.box(8.6, 1.7, 0.9, m.paint[0], T.x, y + 4.2, front + 0.45, 0, { collide: false });
  for (const gy of [3.32, 5.08]) b.box(8.8, 0.14, 1.0, 'gold', T.x, y + gy, front + 0.48, 0, { collide: false });
  for (let k = 0; k < 5; k++) {
    b.box(1.1, 1.05, 0.05, 'window', T.x - 3.4 + k * 1.7, y + 4.2, front + 0.92, 0, { collide: false });
    b.box(0.12, 1.3, 0.08, 'gold', T.x - 4.25 + k * 1.7, y + 4.2, front + 0.93, 0, { collide: false });
  }
  b.box(0.12, 1.3, 0.08, 'gold', T.x + 4.25, y + 4.2, front + 0.93, 0, { collide: false });
  // a little balcony rail under the gallery
  b.box(8.6, 0.1, 0.5, m.plank, T.x, y + 3.15, front + 1.15, 0, { collide: false });
  for (let k = 0; k <= 12; k++) b.box(0.05, 0.4, 0.05, m.post, T.x - 4.2 + k * 0.7, y + 3.4, front + 1.35, 0, { collide: false });
  // gilded quarter-pieces at the corners, and the stern lanterns above them
  for (const s of [-1, 1]) {
    b.cyl(0.2, 0.26, 2.6, 'gold', T.x + s * 4.45, y + 4.2, front + 0.2, { seg: 8, collide: false });
    b.cyl(0.05, 0.05, 1.0, 'iron', T.x + s * 4.2, y + top + 0.5, front + 0.1, { seg: 5, collide: false });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.6, 6), M('lanternglow'));
    lamp.position.set(T.x + s * 4.2, y + top + 1.1, front + 0.1);
    b.add(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 6), M('gold'));
    cap.position.set(T.x + s * 4.2, y + top + 1.55, front + 0.1);
    b.add(cap);
  }
  const name = textPlank('THE SALTY MITTEN', 4.2, 0.48, '#2a4a7a', '#f0d070');
  name.position.set(T.x, y + 2.8, front + 0.08);
  b.add(name);
  b.box(1.4, 2.3, 0.1, m.paint[1], COVE.tavernDoor.x, y + 1.15, front + 0.04, 0, { collide: false });
  for (const s of [-1, 1]) b.box(0.16, 2.5, 0.14, 'gold', COVE.tavernDoor.x + s * 0.78, y + 1.25, front + 0.07, 0, { collide: false });
  b.box(2.0, 0.2, 0.8, m.plank, COVE.tavernDoor.x, y + 0.1, front + 0.45, 0, { walkable: true });
  for (const s of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.34, 6), M('lanternglow'));
    lamp.position.set(COVE.tavernDoor.x + s * 1.25, y + 2.1, front + 0.25);
    b.add(lamp);
  }
  b.light(0xffb060, 16, 13, COVE.tavernDoor.x, y + 2.3, front + 1.4, { night: true });
  // the painted sign on its bracket
  const sign = paintedPlane(2.0, 1.0, 256, (g, w, h) => {
    g.fillStyle = '#2a4a7a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8c048'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#d83a2a';
    g.beginPath(); g.ellipse(w * 0.22, h * 0.52, 26, 38, -0.2, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(w * 0.32, h * 0.6, 10, 18, 0.9, 0, TAU); g.fill();
    g.fillStyle = '#f4ecd8'; g.fillRect(w * 0.13, h * 0.8, 46, 12);
    g.fillStyle = '#f0d890'; g.textAlign = 'center';
    g.font = 'bold 30px Georgia, serif'; g.fillText('THE SALTY', w * 0.63, h * 0.44);
    g.fillText('MITTEN', w * 0.63, h * 0.76);
  }, { side: THREE.DoubleSide });
  sign.position.set(COVE.tavernDoor.x + 2.4, y + 2.4, front + 1.3);
  sign.rotation.y = PI / 2;
  b.add(sign);
  b.box(0.08, 0.08, 1.4, 'iron', COVE.tavernDoor.x + 2.4, y + 2.95, front + 0.7, 0, { collide: false });
  b.interact({ kind: 'door', cell: 'salty_mitten', name: 'The Salty Mitten', pos: new THREE.Vector3(COVE.tavernDoor.x, y + 1.3, COVE.tavernDoor.z), radius: 1.5, verb: 'Enter' });
  // the cut end of the hull, boarded over with planks
  for (let k = 0; k < 7; k++) b.box(1.25, 4.6, 0.08, k % 2 ? m.walls[2] : m.walls[0], T.x - 3.75 + k * 1.25, y + 2.6, T.z - len / 2 - 0.05, 0, { collide: false });
  // on deck: a rail, a stub of mizzen mast with a yard and a pennant
  for (let k = 0; k <= 10; k++) for (const s of [-1, 1]) b.box(0.08, 0.6, 0.08, m.post, T.x + s * 4.4, y + top + 0.3, T.z - len / 2 + k * 0.8, 0, { collide: false });
  b.cyl(0.24, 0.3, 6.0, m.post, T.x, y + top + 3.0, T.z - 1.5, { seg: 8, collide: false });
  b.cyl(0.08, 0.08, 4.4, m.post, T.x, y + top + 5.2, T.z - 1.5, { seg: 5, collide: false }).rotation.z = PI / 2;
  const pen = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.2, 3), new THREE.MeshStandardMaterial({ color: 0xd83a2a, roughness: 0.9, side: THREE.DoubleSide }));
  pen.rotation.z = -PI / 2; pen.scale.z = 0.05;
  pen.position.set(T.x + 1.1, y + top + 5.9, T.z - 1.5);
  b.add(pen);
  gulls.push([T.x, y + top + 6.0, T.z - 1.5, 0.4], [T.x - 4.4, y + top + 0.6, T.z + 2, PI / 2]);
  // benches out front
  for (const s of [-1, 1]) b.box(2.2, 0.45, 0.5, m.plank, T.x + s * 3.4, y + 0.42, front + 2.0, 0, { walkable: true });
}

/** The Indignant Herring: a three-master run aground eleven years ago, heeled over on the sand. */
function buildHerring(b, H, state) {
  const S = COVE.herring;
  const g0 = H(S.x, S.z);
  const heel = 0.35; // about 20 degrees, leaning toward the sea
  const outer = new THREE.Group();
  outer.position.set(S.x, g0 - 1.0, S.z);
  outer.rotation.y = S.rot;
  const inner = new THREE.Group();
  inner.rotation.x = heel;
  outer.add(inner);
  const hullParts = [];
  const ship = hasProp('dutch_ship_medium') && makeProp('dutch_ship_medium');
  if (ship) {
    // no sails: they rotted away years ago, and the crew sold what was left as blankets
    ship.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.material.name || '').toLowerCase();
      if (n.includes('sail')) o.visible = false;
      else if (n.includes('hull')) {
        hullParts.push(o);
        // sun-bleached: the scanned timber is very dark for a ship that has sat on a beach for eleven years
        o.material = o.material.clone();
        o.material.color.setRGB(1.9, 1.75, 1.55);
      }
    });
    inner.add(ship);
  } else {
    // a plain hull of boxes if the scanned ship isn't available
    const hull = new THREE.Mesh(new THREE.BoxGeometry(22, 5.5, 5.2), M('timber@c8b8a0'));
    hull.position.y = 2.75;
    inner.add(hull);
    hullParts.push(hull);
    for (const mx of [-6, 0, 6]) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 14, 8), M('timber')); mast.position.set(mx, 12, 0); inner.add(mast); }
  }
  // windows cut into her side where the crew made cabins of her, lit warm at night
  for (const wx of [-7.5, -4.5, 4.5, 7.5]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.06), M('window'));
    win.position.set(wx, 3.1, -2.66);
    inner.add(win);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.04), mats().paint[0]);
    frame.position.set(wx, 3.1, -2.63);
    inner.add(frame);
  }
  // three cannons along the high side, pointing grandly at nothing
  const cannons = [];
  const barrelGeo = new THREE.CylinderGeometry(0.16, 0.22, 1.5, 10);
  for (const cx of [-5, 0, 5]) {
    const c = new THREE.Mesh(barrelGeo, M('iron'));
    c.rotation.x = PI / 2;
    c.position.set(cx, 5.0, -2.75);
    c.castShadow = true;
    inner.add(c);
    cannons.push(new THREE.Vector3(cx, 5.0, -3.55));
  }
  outer.userData.dynamic = true;
  b.add(outer);
  outer.updateMatrixWorld(true);
  state.cannons = cannons.map((v) => inner.localToWorld(v.clone()));
  // find the deck under the Admiral's sunning spot on the high rail
  const R = COVE.rail;
  if (hullParts.length) {
    const ray = new THREE.Raycaster(new THREE.Vector3(R.x, g0 + 30, R.z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(hullParts, false)[0];
    if (hit && hit.point.y > g0 + 2) R.y = Math.round(hit.point.y * 100) / 100;
  }
  state.rail = { x: R.x, y: R.y, z: R.z };
  // she can't be walked through or climbed; the top of the collider is the Admiral's rail
  const cs = Math.cos(S.rot), sn = Math.sin(S.rot);
  b.col.addBox(S.x + sn * 1.1, S.z + cs * 1.1, 11.6, 3.1, S.rot, g0 - 2, R.y, { walkable: true });
  // a doorway cut into the hull on the town side, with a porch of timber round it
  const D = COVE.herringDoor;
  const dy = H(D.x, D.z);
  const dz = D.z + 0.85;
  const m = mats();
  for (const s of [-1, 1]) b.box(0.26, 2.7, 0.26, m.post, D.x + s * 0.85, dy + 1.35, dz, S.rot, { collide: false });
  b.box(2.1, 0.3, 0.4, m.post, D.x, dy + 2.75, dz, S.rot, { collide: false });
  b.box(1.4, 2.4, 0.1, m.paint[2], D.x, dy + 1.2, dz + 0.1, S.rot, { collide: false });
  b.box(1.6, 0.16, 0.7, m.plank, D.x, dy + 0.08, dz - 0.4, S.rot, { collide: false });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.32, 6), M('lanternglow'));
  lamp.position.set(D.x + 1.2, dy + 2.4, dz - 0.15);
  b.add(lamp);
  b.light(0xffb060, 12, 11, D.x + 1.2, dy + 2.4, dz - 0.8, { night: true });
  const name = textPlank('INDIGNANT HERRING', 2.6, 0.34, '#2a4a7a', '#f0d890');
  name.position.set(D.x, dy + 3.25, dz - 0.05);
  b.add(name);
  b.interact({ kind: 'door', cell: 'herring', name: 'The Indignant Herring', pos: new THREE.Vector3(D.x, dy + 1.3, D.z), radius: 1.5, verb: 'Enter' });
  // and a cat-sized rope ladder from the rail down to the sand
  const top = new THREE.Vector3(R.x - 1.6, R.y + 0.1, R.z - 0.4), foot = new THREE.Vector3(R.x - 1.6, H(R.x - 1.6, D.z + 0.6) + 0.05, D.z + 0.6);
  const len = top.distanceTo(foot);
  const mid = top.clone().add(foot).multiplyScalar(0.5);
  const lad = new THREE.Group();
  lad.position.copy(mid);
  lad.lookAt(top);
  for (const s of [-1, 1]) { const rr = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 4), m.rope); rr.rotation.x = PI / 2; rr.position.x = s * 0.14; lad.add(rr); }
  for (let k = 1; k < len / 0.3; k++) { const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), m.post); rung.rotation.z = PI / 2; rung.position.z = -len / 2 + k * 0.3; lad.add(rung); }
  lad.userData.dynamic = true;
  b.add(lad);
  b.interact({ kind: 'sign', name: 'The Indignant Herring', text: 'A three-masted galleon lying on her side in the sand, as if she had simply sat down one day and refused to go on. Her sails are long gone; her rigging hangs slack; three cannons on her high side point grandly at the sky. Somebody has hung a very small rope ladder from her rail to the beach, about the width of a cat.', pos: new THREE.Vector3(S.x - 12.5, g0 + 1.2, S.z), radius: 3, verb: 'Examine' });
}

/** The Gullstack: a craggy column of rock standing out in the sea, streaked white, foam at its foot. */
function buildGullstack(b, gulls) {
  const G = COVE.gullstack;
  const r = rng(1919);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true });
  const white = new THREE.Color(0xe8e6de), grey = new THREE.Color(0x7e7970), dark = new THREE.Color(0x4a4844);
  // [height of centre, radii x/y/z, offset x/z]: a broad skirt, a tall column, a leaning shoulder
  const tiers = [[-1.5, 11, 4.5, 10, 0, 0], [9, 5.6, 13, 5.2, 0.5, -0.3], [6, 4.2, 8, 3.8, -3.6, 1.6]];
  const meshes = [];
  tiers.forEach(([cy, rx, ry, rz, ox, oz], k) => {
    const geo = cragGeo(k + 1).clone();
    geo.scale(rx, ry, rz);
    geo.rotateY(r() * TAU);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const wy = p.getY(i) + cy, ang = Math.atan2(p.getZ(i), p.getX(i));
      // dark and wet near the sea, pale streaks running down from the gull ledges near the top
      c.copy(grey).lerp(dark, smoothstep(3, -1, wy));
      const streak = Math.sin(ang * 13 + k * 2.1 + Math.sin(wy * 0.4) * 1.5) * 0.5 + 0.5;
      c.lerp(white, smoothstep(0.86, 0.97, streak) * smoothstep(10, 19, wy) * 0.8 + smoothstep(20, 22.5, wy) * 0.5);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(G.x + ox, cy, G.z + oz);
    mesh.castShadow = true; mesh.receiveShadow = true;
    b.add(mesh);
    meshes.push(mesh);
  });
  b.col.addCircle(G.x, G.z, 8, -12, 24, { walkable: false });
  // gulls on the ledges: drop a ray onto the rock to find each perch
  const ray = new THREE.Raycaster();
  for (const mm of meshes) mm.updateMatrixWorld(true);
  for (let i = 0; i < 14; i++) {
    const a = r() * TAU, d = r() * 4.5;
    ray.set(new THREE.Vector3(G.x + Math.cos(a) * d, 40, G.z + Math.sin(a) * d), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(meshes, false)[0];
    if (hit && hit.point.y > 14) gulls.push([hit.point.x, hit.point.y, hit.point.z, r() * TAU]);
  }
  // surf breaking round its foot
  const c = document.createElement('canvas');
  c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.6})`; g.beginPath(); g.arc(Math.random() * 256, 4 + Math.random() * 18 * Math.random(), 1 + Math.random() * 3, 0, TAU); g.fill(); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(4, 1);
  const foam = new THREE.Mesh(new THREE.RingGeometry(8.5, 13, 48, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: tex, transparent: true, depthWrite: false }));
  // ring UVs run radially; remap so the noise runs round the ring
  const uv = foam.geometry.attributes.uv, fp = foam.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const x = fp.getX(i), y = fp.getY(i);
    uv.setXY(i, (Math.atan2(y, x) / TAU + 0.5), 1 - (Math.hypot(x, y) - 8.5) / 4.5);
  }
  foam.rotation.x = -PI / 2;
  foam.position.set(G.x, 0.06, G.z);
  foam.renderOrder = 3;
  b.add(foam);
  for (let i = 0; i < 6; i++) {
    const a = r() * TAU;
    crag(b, mats().wetRock, G.x + Math.cos(a) * (10 + r() * 3), -0.6 + r() * 0.8, G.z + Math.sin(a) * (10 + r() * 3), 1.2 + r() * 1.5, 1 + r(), 1.2 + r() * 1.5, i, { collide: false });
  }
}

/** The Dread Meringue: a ghost of a ship, translucent and green-lit, out in the fog. */
function buildMeringue(b, state) {
  const S = COVE.meringue;
  const group = new THREE.Group();
  group.position.set(S.x, -2.2, S.z);
  group.rotation.y = S.rot;
  const matsList = [];
  const ghost = (base) => {
    const m = new THREE.MeshStandardMaterial({
      color: 0x8aa89a, emissive: 0x2a8a5a, emissiveIntensity: 0.55, roughness: 0.9, map: base?.map || null,
      transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
    });
    m.userData.baseOpacity = 0.5;
    matsList.push(m);
    return m;
  };
  const ship = hasProp('dutch_ship_medium') && makeProp('dutch_ship_medium');
  if (ship) {
    ship.traverse((o) => { if (o.isMesh) { o.material = ghost(o.material); o.castShadow = false; } });
    // she lists, and her sails hang in rags
    ship.rotation.z = 0.08;
    group.add(ship);
  } else {
    const gm = ghost(null);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(22, 5, 5), gm); hull.position.y = 3; group.add(hull);
    for (const mx of [-6, 0, 6]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 16, 8), gm); mast.position.set(mx, 12, 0); group.add(mast);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), gm); sail.position.set(mx, 12, 0.3); sail.rotation.y = PI / 2; group.add(sail);
    }
  }
  // green lanterns at bow, stern and masthead
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xa0ffc0, emissive: 0x40ff90, emissiveIntensity: 3, transparent: true, opacity: 0.9, depthWrite: false });
  lanternMat.userData.baseOpacity = 0.9;
  matsList.push(lanternMat);
  const lights = [];
  for (const [lx, ly, lz] of [[10, 8.5, 0], [-10, 9.5, 0], [1.5, 20, 0]]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), lanternMat);
    l.position.set(lx, ly, lz);
    group.add(l);
    const w = new THREE.Vector3(lx, ly, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), S.rot).add(group.position);
    const light = b.light(0x50ff90, 40, 50, w.x, w.y, w.z, { flicker: true });
    light.on = false;
    lights.push(light);
  }
  group.visible = false;
  group.userData.dynamic = true;
  group.traverse((o) => { o.userData.dynamic = true; o.renderOrder = 4; });
  b.add(group);
  state.meringue = group;
  state.meringueMats = matsList;
  state.meringueLights = lights;
}

// ------------------------------------------------------------------ the way in, in Cyrodiil
/** The Smugglers' Cut: a tarred door set into a rocky outcrop at the foot of the southern mountains. */
export function buildSmugglersCut(b, terrain, L) {
  const H = (x, z) => terrain.heightAt(x, z);
  const r = rng(4242);
  const dz = L.z + 7.5; // the door, set into the rock, looking north
  const y = H(L.x, L.z + 5);
  const m = mats();
  // the outcrop: a few great boulders, the door between the two in front
  const big = ['namaqualand_boulder_02', 'boulder_01'].find((id) => hasProp(id));
  if (big) {
    placeProp(b, big, L.x + 0.5, y - 2.4, dz + 7.5, { fit: 12, rot: 0.4, collide: false });
    placeProp(b, big, L.x - 6.4, y - 1.2, dz + 2.4, { fit: 6.5, rot: 2.1, collide: false });
    placeProp(b, hasProp('boulder_01') ? 'boulder_01' : big, L.x + 6.2, y - 1.0, dz + 2.2, { fit: 6.2, rot: 4.0, collide: false });
    if (hasProp('rock_07')) placeProp(b, 'rock_07', L.x - 0.4, y + 3.3, dz + 1.8, { fit: 4.6, rot: 1.2, collide: false });
  } else {
    crag(b, m.rock, L.x, y + 1.5, dz + 6.5, 6, 5, 5, 1, { collide: false });
    crag(b, m.rock, L.x - 6, y + 0.8, dz + 2.4, 3.2, 3, 3, 2, { collide: false });
    crag(b, m.rock, L.x + 6, y + 0.8, dz + 2.2, 3.1, 2.8, 3, 3, { collide: false });
    crag(b, m.rock, L.x, y + 4.0, dz + 2.0, 2.4, 1.3, 2.0, 4, { collide: false });
  }
  b.col.addBox(L.x, dz + 4.5, 10.5, 3.6, 0, y - 3, y + 14, { walkable: false });
  // the tunnel mouth: a timbered portal and a tarred door, black passage behind it
  b.box(2.4, 2.9, 3.0, m.black, L.x, y + 1.45, dz + 1.7, 0, { collide: false, cast: false });
  for (const s of [-1, 1]) b.box(0.32, 3.2, 0.32, m.post, L.x + s * 1.35, y + 1.6, dz, 0, { collide: false });
  b.box(3.2, 0.34, 0.4, m.post, L.x, y + 3.3, dz, 0, { collide: false });
  b.box(2.3, 2.75, 0.12, M('timber@b0a088'), L.x, y + 1.4, dz + 0.1, 0, { collide: false });
  for (const sy of [0.6, 2.2]) b.box(2.2, 0.1, 0.03, 'iron', L.x, y + sy, dz + 0.02, 0, { collide: false });
  const sign = textPlank("THE SMUGGLERS' CUT", 2.4, 0.32, '#2a1e14', '#e8d8a8');
  sign.position.set(L.x, y + 3.75, dz - 0.05);
  sign.rotation.y = PI;
  b.add(sign);
  b.interact({ kind: 'door', cell: 'cove', name: "The Smugglers' Cut", pos: new THREE.Vector3(L.x, y + 1.4, dz - 1.2), radius: 1.6, verb: 'Enter' });
  b.interact({ kind: 'sign', name: "The Smugglers' Cut", text: 'A tarred door set into a heap of boulders at the foot of the mountains, its frame black with age. Salt air breathes through the gaps round it — though the sea is a long way off — and you can hear, very faintly, gulls.\n\nSomeone has scratched into the lintel: TO THE COVE. MIND THE CAT.', pos: new THREE.Vector3(L.x - 2.6, y + 1.3, dz - 1.0), radius: 1.0, verb: 'Read' });
  buildLostCatPoster(b, L.x + 1.85, y + 1.7, dz - 0.18, PI, 'poster_cut');
  // a lantern on a post beside the door
  b.cyl(0.07, 0.09, 2.8, m.post, L.x - 2.2, y + 1.4, dz - 0.8, { seg: 6 });
  b.box(0.5, 0.06, 0.06, m.post, L.x - 2.0, y + 2.75, dz - 0.8, 0, { collide: false });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.32, 6), M('lanternglow'));
  lamp.position.set(L.x - 1.8, y + 2.5, dz - 0.8);
  b.add(lamp);
  b.light(0xffb060, 12, 12, L.x - 1.8, y + 2.6, dz - 1.2, { night: true });
  // old crates the smugglers left behind
  for (const [u, v, id] of [[3.2, -1.5, 'wooden_crate_02'], [3.9, -0.2, 'wine_barrel_01']]) if (hasProp(id)) placeProp(b, id, L.x + u, H(L.x + u, dz + v), dz + v, { rot: r() * TAU });
}
