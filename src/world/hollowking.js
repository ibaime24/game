// The Hollow King: the places of the Mages Guild questline. In Cyrodiil, the Guild's ruined Starfall
// Observatory on a snowy shoulder of the Jerall, and the Hollow Gate, a door of black ice in the cliffs north-east
// of Frostfang Hollow. Indoors (set pieces laid on the marker cells of the maps in interiors.js): the Founders' Pool
// in the Chorrol hall, the Seal-Orrery, the founders' old camp, the Bone Stair, and the Throne of Ashgrave.
//
// Colour note (as in cove.js): M('base@hex') multiplies the base texture by the tint, so tints stay light.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../core/noise.js';
import { M, textPlank } from './builder.js';
import { hasProp, placeProp } from './props.js';
import { LOCATIONS, HK } from './layout.js';

const PI = Math.PI, TAU = PI * 2;
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const dyn = (o) => { o.userData.dynamic = true; o.traverse((c) => { c.userData.dynamic = true; }); return o; };

// ------------------------------------------------------------------ shared materials and pieces
let _m = null;
function mats() {
  if (_m) return _m;
  _m = {
    // black ice: deep blue-black, glassy, with a faint cold light inside it
    blackIce: new THREE.MeshStandardMaterial({ color: 0x1e2e46, roughness: 0.05, metalness: 0.55, emissive: 0x0a1630, emissiveIntensity: 0.8, transparent: true, opacity: 0.93, envMapIntensity: 1.6 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0xb08a50, roughness: 0.38, metalness: 0.85 }),
    verdigris: new THREE.MeshStandardMaterial({ color: 0x7aa898, roughness: 0.55, metalness: 0.55 }),
    frostRock: new THREE.MeshStandardMaterial({ color: 0x8e96a2, roughness: 0.92, flatShading: true }),
    paleStone: new THREE.MeshStandardMaterial({ color: 0xc4c8cc, roughness: 0.9, flatShading: true }),
    reliefStone: new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.85 }),
    panelStone: new THREE.MeshStandardMaterial({ color: 0x7c8696, roughness: 0.92 }),
    snow: new THREE.MeshStandardMaterial({ color: 0xccd6e4, roughness: 0.9 }),
    bone: M('bone'),
    cloth: new THREE.MeshStandardMaterial({ color: 0x46526a, roughness: 1, side: THREE.DoubleSide }),
    rune: new THREE.MeshStandardMaterial({ color: 0x9ac8ff, emissive: 0x4a90ff, emissiveIntensity: 0.6, roughness: 0.4 }),
  };
  return _m;
}

/** A craggy rock: a displaced, flat-shaded icosahedron (six shapes). */
const _crags = [];
function cragGeo(k) {
  k %= 6;
  if (_crags[k]) return _crags[k];
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const nz = createNoise2D(910 + k * 31);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = 0.78 + fbm(nz, x * 1.3 + y * 0.7, z * 1.3 - y * 0.6, 4) * 0.45 + Math.sin(y * 6 + k) * 0.03;
    p.setXYZ(i, x * f, y * f, z * f);
  }
  g.computeVertexNormals();
  return (_crags[k] = g);
}
function crag(b, mat, x, y, z, sx, sy, sz, k = 0, rot = 0) {
  const m = new THREE.Mesh(cragGeo(k), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(0, rot + k * 1.3, 0);
  m.castShadow = true; m.receiveShadow = true;
  b.add(m);
  return m;
}
/** A soft drift of snow: a smooth, low mound with a gently rippled top. */
let _driftGeo = null;
function driftGeo() {
  if (_driftGeo) return _driftGeo;
  const g = new THREE.SphereGeometry(1, 20, 8, 0, TAU, 0, PI / 2);
  const p = g.attributes.position;
  const nz = createNoise2D(4040);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = 1 + nz(x * 1.6, z * 1.6) * 0.12;
    p.setXYZ(i, x * f, y * (0.85 + nz(x * 2.5 + 3, z * 2.5) * 0.25), z * f);
  }
  g.computeVertexNormals();
  return (_driftGeo = g);
}
function drift(b, x, y, z, r, h = 0.35) {
  const m = new THREE.Mesh(driftGeo(), mats().snow);
  m.position.set(x, y - 0.06, z);
  m.scale.set(r, h, r * (0.7 + ((x * 13 + z * 7) % 1 + 1) % 1 * 0.5));
  m.rotation.y = x * 0.37 + z * 0.11;
  m.receiveShadow = true;
  b.add(m);
}
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** A soft additive glow card (radial), for haloes behind things. */
function glowCard(w, h, color, opacity = 0.6) {
  const tex = canvasTex(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.renderOrder = 6;
  return m;
}
/** A tall, soft, turning flame of crossed additive cards. colours: [core, mid, edge] rgba strings. */
function softFlame(height, width, cols) {
  const tex = canvasTex(64, 128, (g) => {
    const grd = g.createRadialGradient(32, 104, 3, 32, 84, 64);
    grd.addColorStop(0, cols[0]); grd.addColorStop(0.35, cols[1]); grd.addColorStop(0.75, cols[2]); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(54, 50, 62, 92, 32, 126); g.bezierCurveTo(2, 92, 10, 50, 32, 2); g.fill();
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const grp = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const hh = height * (1 - k * 0.14);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(width * (1 - k * 0.15), hh).translate(0, hh / 2, 0), mat);
    f.rotation.y = (k / 3) * PI;
    f.renderOrder = 7;
    grp.add(f);
  }
  grp.userData.spin = true;
  return grp;
}
const COLD_FIRE = ['rgba(235,248,255,1)', 'rgba(120,190,255,0.9)', 'rgba(40,90,220,0.35)'];
/** A cold-fire brazier: an iron bowl on a tripod with a pale blue flame. lit=false leaves it frosted and dark. */
function coldBrazier(b, x, y, z, lit = true, s = 1, withLight = true) {
  b.cyl(0.42 * s, 0.26 * s, 0.32 * s, 'iron', x, y + 1.0 * s, z, { seg: 10, collide: false });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 1.0 * s, 5), M('iron'));
    leg.position.set(x + Math.cos(a) * 0.22 * s, y + 0.48 * s, z + Math.sin(a) * 0.22 * s);
    leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    b.add(leg);
  }
  b.col.addCircle(x, z, 0.35 * s, y, y + 1.2 * s);
  if (!lit) {
    const frost = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * s, 0.38 * s, 0.05, 10), mats().snow);
    frost.position.set(x, y + 1.15 * s, z);
    b.add(frost);
    return null;
  }
  const f = softFlame(1.1 * s, 0.7 * s, COLD_FIRE);
  f.position.set(x, y + 1.12 * s, z);
  b.add(dyn(f));
  f.userData.spin = true;
  b.emitter('sparkle', x, y + 1.6 * s, z, 1.2, { color: 0xa8d8ff, spread: 0.3, range: 50 });
  return withLight ? b.light(0xb0ccff, 18 * s, 13 * s, x, y + 1.8 * s, z, { flicker: true }) : null;
}
/** A banner on a crossbar: deep blue Guild cloth with the gold eye, or the founders' three hearts. torn: ragged hem. */
function bannerTex(device, torn) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = device === 'founders' ? '#33415e' : '#2c3f78';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h * 0.82);
    if (torn) { for (let i = 8; i >= 0; i--) g.lineTo(w * i / 8, h * (0.78 + ((i * 37) % 11) / 40)); }
    else { g.lineTo(w / 2, h); g.lineTo(0, h * 0.82); }
    g.closePath(); g.fill();
    g.strokeStyle = '#d8b050'; g.lineWidth = 4;
    g.strokeRect(6, 6, w - 12, h * 0.7);
    g.fillStyle = '#e8c060'; g.strokeStyle = '#e8c060';
    if (device === 'founders') {
      for (let k = 0; k < 3; k++) {
        const cx = w / 2 + (k - 1) * 30, cy = h * 0.36 + (k === 1 ? -14 : 8);
        g.beginPath(); g.moveTo(cx, cy + 12); g.bezierCurveTo(cx - 16, cy - 2, cx - 8, cy - 14, cx, cy - 5); g.bezierCurveTo(cx + 8, cy - 14, cx + 16, cy - 2, cx, cy + 12); g.fill();
      }
    } else {
      // the eye of the Mages Guild
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(w * 0.18, h * 0.36); g.quadraticCurveTo(w / 2, h * 0.2, w * 0.82, h * 0.36); g.quadraticCurveTo(w / 2, h * 0.52, w * 0.18, h * 0.36); g.stroke();
      g.beginPath(); g.arc(w / 2, h * 0.36, 13, 0, TAU); g.fill();
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 30, h * 0.36 + Math.sin(a) * 30); g.lineTo(w / 2 + Math.cos(a) * 40, h * 0.36 + Math.sin(a) * 40); g.stroke(); }
    }
  });
}
function banner(b, x, y, z, rotY, w = 1.1, h = 2.2, device = 'guild', torn = false) {
  const mat = new THREE.MeshStandardMaterial({ map: bannerTex(device, torn), transparent: true, alphaTest: 0.3, roughness: 0.95, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(w, h, 4, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 2.2 + p.getX(i)) * 0.05);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y - h / 2, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  b.add(m);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w + 0.2, 6), M('gold'));
  bar.rotation.z = PI / 2; bar.rotation.y = rotY;
  bar.position.set(x, y + 0.02, z);
  b.add(bar);
  return m;
}
/** A star chart: a navy sheet of constellations in gold, in a thin frame. */
let _chartTex = null;
function starChartTex() {
  return (_chartTex ||= canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#18233e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(220,190,110,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.arc(w / 2, h / 2, 80, 0, TAU); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 52, 0, TAU); g.stroke();
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 52, h / 2 + Math.sin(a) * 52); g.lineTo(w / 2 + Math.cos(a) * 80, h / 2 + Math.sin(a) * 80); g.stroke(); }
    const r = rng(77);
    g.fillStyle = '#f0e0a8';
    const stars = [];
    for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, s = r() < 0.15 ? 2.2 : 1; stars.push([x, y]); g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(240,210,130,0.7)';
    for (let c = 0; c < 6; c++) { g.beginPath(); const s0 = stars[c * 7]; g.moveTo(s0[0], s0[1]); for (let k = 1; k < 5; k++) { const s1 = stars[c * 7 + k]; g.lineTo(s1[0], s1[1]); } g.stroke(); }
    g.strokeStyle = '#c8a050'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  }));
}
/** Frost: a feathery pale-blue decal, lying flat or on a wall. */
let _frostTex = null;
function frostTex() {
  // an alpha map is read from the green channel: paint grey-on-black, not white-on-transparent
  return (_frostTex ||= canvasTex(256, 256, (g, w, h) => {
    const r = rng(311);
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,0.32)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.12)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.4;
    const fern = (x, y, a, len, d) => {
      if (d > 3 || len < 4) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      for (let k = 1; k < 4; k++) {
        const t = k / 4, px = x + (x2 - x) * t, py = y + (y2 - y) * t;
        fern(px, py, a + 0.7, len * 0.35, d + 1); fern(px, py, a - 0.7, len * 0.35, d + 1);
      }
    };
    for (let i = 0; i < 18; i++) { const a = r() * TAU, d = 30 + r() * 60; fern(128 + Math.cos(a) * d * 0.4, 128 + Math.sin(a) * d * 0.4, a, 30 + r() * 30, 0); }
    // a soft edge, so no decal ever shows its square
    const fade = g.createRadialGradient(128, 128, 90, 128, 128, 128);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fade; g.fillRect(0, 0, w, h);
  }, false));
}
let _frostMat = null;
function frostDecal(b, x, y, z, size, rx = -PI / 2, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), _frostMat ||= new THREE.MeshStandardMaterial({ color: 0xeaf4ff, alphaMap: frostTex(), transparent: true, opacity: 0.9, depthWrite: false, roughness: 0.3, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  m.renderOrder = 2;
  b.add(dyn(m));
  return m;
}
/** Icicles hanging in a row from (x0,z0) to (x1,z1) at height y. */
function icicles(b, y, x0, z0, x1, z1, n, len = 0.9, seed = 3) {
  const r = rng(seed);
  // point down: the base at the attachment height, the tip a length below it
  const geo = new THREE.ConeGeometry(0.06, 1, 5).rotateX(PI).translate(0, -0.5, 0);
  const im = new THREE.InstancedMesh(geo, M('ice'), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const t = (i + r() * 0.6) / n;
    const l = len * (0.3 + r() * 0.9);
    m4.compose(p.set(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t), q.identity(), s.set(0.6 + r() * 0.9, l, 0.6 + r() * 0.9));
    im.setMatrixAt(i, m4);
  }
  b.add(im);
}
/**
 * A cliff face: a broad sheet of rock pushed in and out by noise, curving back at its ends and top, with ledges
 * where the strata run, and the texture tiled at a real-world scale.
 */
function cliffFace(x, y, z, w, h) {
  const geo = new THREE.PlaneGeometry(w, h, 64, 36);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  const nz = createNoise2D(6060);
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + h / 2; // v: 0 at the foot
    const edge = Math.abs(u) / (w / 2);
    // bulge and crag; the strata as soft horizontal ledges; the sheet curves away at the sides and leans back up top
    let d = fbm(nz, u / 9, v / 9, 4) * 2.6 + fbm(nz, u / 3 + 7, v / 3, 2) * 0.55 + Math.sin(v * 0.9 + fbm(nz, u / 20, 2, 1) * 3) * 0.35;
    d -= edge * edge * 9 + Math.max(0, v - h * 0.55) * 0.5;
    // keep the door's recess and the relief panel flat-backed
    const door = Math.max(0, 1 - Math.max(Math.abs(u) / 9, Math.abs(v - 12) / 13));
    d = d * (1 - Math.min(1, door * 2.5)) - door * 0.4;
    p.setXYZ(i, u, p.getY(i), d);
    uv.setXY(i, (u + w / 2) / 13, v / 13);
  }
  geo.computeVertexNormals();
  // colour by strata and snow (flat-shaded, untextured: the scanned rock tiles into a sponge at this size)
  const n = geo.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const up = n.getY(i), v = p.getY(i) + h / 2;
    const band = Math.sin(v * 1.3 + fbm(nz, p.getX(i) / 15, v / 15, 2) * 4) * 0.5 + 0.5;
    // dark, cold, blue-grey stone: the black ice of the door should be the only thing darker
    c.setRGB(0.2 + band * 0.1, 0.21 + band * 0.09, 0.26 + band * 0.09);
    c.multiplyScalar(0.85 + fbm(nz, p.getX(i) / 2.5, v / 2.5, 2) * 0.3);
    // snow on every ledge that faces up even a little, thick along the crest, patchy elsewhere
    const patch = 0.6 + fbm(nz, p.getX(i) / 4, p.getY(i) / 4, 2) * 0.8;
    const snow = Math.min(1, Math.max(0, (up - 0.58) * 3.2) * patch + Math.max(0, (v - h * 0.84) / (h * 0.1)) * patch);
    c.lerp(new THREE.Color(0.92, 0.95, 1.0), Math.min(1, snow));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

/** Old bones lying in snow or dust: a skull and a few long bones. */
function bones(b, x, y, z, r) {
  const m = mats().bone;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), m);
  skull.scale.set(1, 0.9, 1.2);
  skull.position.set(x, y + 0.08, z);
  skull.rotation.set(r() * 0.6, r() * TAU, 0.3);
  b.add(skull);
  for (let k = 0; k < 4; k++) {
    const bn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4 + r() * 0.3, 5), m);
    bn.rotation.set(PI / 2, r() * TAU, 0);
    bn.position.set(x + (r() - 0.5) * 0.8, y + 0.04, z + (r() - 0.5) * 0.8);
    b.add(bn);
  }
}
/** A robed, hooded founder in stone relief, both arms raising an orb over their head. Returns the orb mesh. */
function founderFigure(b, x, y, z, rotY, h, orbColor, stone) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  // the robe: flared at the hem, narrow at the waist, broad at the shoulders
  const prof = [[0.3, 0], [0.27, 0.06], [0.2, 0.3], [0.16, 0.48], [0.19, 0.62], [0.2, 0.7], [0.12, 0.76], [0.07, 0.78]];
  const robe = new THREE.LatheGeometry(prof.map(([r, v]) => new THREE.Vector2(r * h, v * h)), 14);
  const body = new THREE.Mesh(robe, stone);
  body.scale.z = 0.6; // half sunk in the panel
  body.castShadow = true;
  g.add(body);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(h * 0.075, 12, 10), stone);
  hood.scale.set(1, 1.2, 0.9);
  hood.position.y = h * 0.84;
  g.add(hood);
  const cowl = new THREE.Mesh(new THREE.ConeGeometry(h * 0.08, h * 0.14, 10, 1, true), stone);
  cowl.position.y = h * 0.92;
  g.add(cowl);
  // the arms rise from the shoulders to the orb above the head
  const orbY = h * 1.1;
  for (const s of [-1, 1]) {
    const sh = new THREE.Vector3(s * h * 0.17, h * 0.71, 0), hand = new THREE.Vector3(s * h * 0.06, orbY - h * 0.05, h * 0.02);
    const len = sh.distanceTo(hand);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.03, h * 0.045, len, 8), stone);
    arm.position.copy(sh).add(hand).multiplyScalar(0.5);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hand.clone().sub(sh).normalize());
    g.add(arm);
  }
  const orbMat = new THREE.MeshStandardMaterial({ color: orbColor, emissive: orbColor, emissiveIntensity: 0.12, roughness: 0.25, metalness: 0.2 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(h * 0.075, 18, 14), orbMat);
  orb.position.set(0, orbY, h * 0.03);
  g.add(orb);
  b.add(g);
  return orb;
}

// ------------------------------------------------------------------ Starfall Observatory (world)
/** The Guild's old observatory on its snowy shoulder: a squat round tower under a cracked bronze dome. */
export function buildStarfall(b, terrain) {
  const L = LOCATIONS.starfall;
  const H = (x, z) => terrain.heightAt(x, z);
  const y = H(L.x, L.z);
  const m = mats();
  const r = rng(1616);
  const R = 5;
  // a plinth, the tower, string courses of darker stone
  b.cyl(R + 0.7, R + 1.0, 1.0, 'whitestone@dce0e6', L.x, y + 0.2, L.z, { seg: 24 });
  const tower = b.cyl(R, R + 0.2, 8.2, 'whitestone@eef0f4', L.x, y + 4.6, L.z, { seg: 24, tile: 3 });
  tower.castShadow = true;
  for (const cy of [3.0, 6.6]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.12, 0.14, 6, 40), M('whitestone@b8bcc4'));
    ring.rotation.x = PI / 2; ring.position.set(L.x, y + cy, L.z);
    b.add(ring);
  }
  // arrow-slit windows, a cold faint glow in them (someone has left a welkynd lamp burning up there)
  const slit = new THREE.MeshStandardMaterial({ color: 0x182030, emissive: 0x6a9aff, emissiveIntensity: 0.55, roughness: 0.2 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.5;
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 0.1), slit);
    w.position.set(L.x + Math.cos(a) * (R + 0.04), y + 5.2, L.z + Math.sin(a) * (R + 0.04));
    w.rotation.y = -a + PI / 2;
    b.add(w);
  }
  // the dome: weathered bronze gone green, with a great crack open to the sky, snow drifted on its lip
  const domeY = y + 8.7;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R + 0.1, 28, 14, 0.6, TAU * 0.86, 0, PI / 2), m.verdigris);
  dome.position.set(L.x, domeY, L.z);
  dome.castShadow = true; dome.receiveShadow = true;
  b.add(dome);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(R - 0.05, 28, 14, 0.6, TAU * 0.86, 0, PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.9, side: THREE.BackSide }));
  inner.position.copy(dome.position);
  b.add(inner);
  for (let k = 0; k < 8; k++) {
    const a = 0.6 + (k / 8) * TAU * 0.86;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(R + 0.16, 0.08, 5, 18, PI / 2), m.bronze);
    rib.rotation.set(0, -a, PI / 2);
    rib.position.set(L.x, domeY, L.z);
    b.add(rib);
  }
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 8), m.bronze);
  finial.position.set(L.x, domeY + R + 0.5, L.z);
  b.add(finial);
  drift(b, L.x + Math.cos(0.3) * (R - 1.2), domeY + 1.2, L.z + Math.sin(0.3) * (R - 1.2), 1.4, 0.5);
  // the great brass telescope, poking out through the crack, askew
  const tel = new THREE.Group();
  tel.position.set(L.x + Math.cos(0.3) * 2.0, domeY + 0.8, L.z + Math.sin(0.3) * 2.0);
  tel.rotation.set(0, -0.3 + PI / 2, -0.62);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 7.5, 16), m.bronze);
  tube.position.y = 2.6;
  tel.add(tube);
  for (const ty of [0.2, 2.6, 5.4]) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.6 - ty * 0.03, 0.06, 6, 20), M('iron')); band.rotation.x = PI / 2; band.position.y = ty; tel.add(band); }
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.4, 18), new THREE.MeshStandardMaterial({ color: 0x9ac0e0, roughness: 0.05, metalness: 0.6, emissive: 0x2a4a7a, emissiveIntensity: 0.6 }));
  lens.rotation.x = -PI / 2; lens.position.y = 6.36;
  tel.add(lens);
  tel.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  b.add(tel);
  // the arched door on the south side, a lintel with the Guild's eye, and a cold lantern
  const D = HK.starfallDoor;
  const dz = L.z + R + 0.02;
  b.box(1.6, 2.6, 0.5, 'whitestone@c8ccd4', D.x, y + 1.3, dz + 0.02, 0, { collide: false });
  b.box(1.25, 2.3, 0.12, 'timber@c0a888', D.x, y + 1.2, dz + 0.28, 0, { collide: false });
  for (const hy of [0.6, 1.8]) b.box(1.2, 0.07, 0.04, 'iron', D.x, y + hy, dz + 0.35, 0, { collide: false, cast: false });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.16, 6, 14, PI), M('whitestone@c8ccd4'));
  arch.position.set(D.x, y + 2.55, dz + 0.3);
  b.add(arch);
  const eye = textPlank('MAGES GUILD · STARFALL', 1.8, 0.26, '#2c3f78', '#e8c060');
  eye.position.set(D.x, y + 3.6, dz + 0.32);
  b.add(eye);
  b.interact({ kind: 'door', cell: 'starfall_observatory', name: 'Starfall Observatory', pos: new THREE.Vector3(D.x, y + 1.3, D.z + 0.4), radius: 1.5, verb: 'Enter' });
  // a lantern post by the door: its glass long cold
  b.cyl(0.07, 0.09, 3.0, 'iron', D.x + 1.9, y + 1.5, dz + 1.2, { seg: 6 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.36, 6), new THREE.MeshStandardMaterial({ color: 0xc8d8e8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.6 }));
  lamp.position.set(D.x + 1.9, y + 3.1, dz + 1.2);
  b.add(lamp);
  // the courtyard wall, half fallen; tumbled blocks and drifts in the snow
  const stone = 'whitestone@d0d4da';
  for (let k = 0; k < 14; k++) {
    const a = PI * 0.15 + (k / 13) * PI * 0.7;
    if (k === 6 || k === 7) continue; // the gap where the road comes in
    const wx = L.x + Math.cos(a) * 9.5, wz = L.z + Math.sin(a) * 9.5;
    const hh = k % 4 === 1 ? 0.5 : 1.0 + r() * 1.2;
    b.box(2.2, hh, 0.6, stone, wx, H(wx, wz) + hh / 2 - 0.1, wz, -a + PI / 2);
    if (r() < 0.5) drift(b, wx, H(wx, wz) + 0.1, wz + 0.4, 1.2, 0.3);
  }
  for (let k = 0; k < 7; k++) {
    const a = PI * 0.2 + r() * PI * 0.6, d = 7.5 + r() * 4;
    const bx = L.x + Math.cos(a) * d, bz = L.z + Math.sin(a) * d;
    b.box(0.7 + r() * 0.5, 0.45, 0.5, stone, bx, H(bx, bz) + 0.2, bz, r() * 3, { collide: false, rx: (r() - 0.5) * 0.3 });
  }
  for (let k = 0; k < 9; k++) {
    const a = r() * TAU, d = R + 0.8 + r() * 1.6;
    drift(b, L.x + Math.cos(a) * d, H(L.x + Math.cos(a) * d, L.z + Math.sin(a) * d) + 0.15, L.z + Math.sin(a) * d, 1.0 + r() * 1.2, 0.35 + r() * 0.3);
  }
  // the old Guild banner on a pole, torn, snapping in the wind off the mountain
  b.cyl(0.07, 0.09, 5.5, 'timber@c0b098', L.x - 3.4, y + 2.75, L.z + R + 2.4, { seg: 6 });
  banner(b, L.x - 2.85, y + 5.2, L.z + R + 2.4, 0, 1.0, 2.0, 'guild', true);
  // a signpost where the road comes up
  const sp = { x: 30, z: -597 };
  const sy = H(sp.x, sp.z);
  b.cyl(0.06, 0.08, 2.2, 'timber@c0b098', sp.x + 2.2, sy + 1.1, sp.z, { seg: 6 });
  const sign = textPlank('STARFALL — MAGES GUILD', 1.5, 0.28, '#2c3f78', '#e8d8a8');
  sign.position.set(sp.x + 2.2, sy + 1.9, sp.z + 0.06);
  b.add(sign);
}

// ------------------------------------------------------------------ The Hollow Gate (world)
/**
 * The Hollow Gate: a door of black ice set into a cliff at the foot of the north-east Jerall, under a relief of
 * the three founders holding up their orbs: sun, moon, star. Returns { gateDoor, founderOrbs, gateLight, gateGlow }.
 */
export function buildHollowGate(b, terrain, game) {
  const H = (x, z) => terrain.heightAt(x, z);
  const G = HK.gateDoor;
  const y = H(G.x, G.z + 6);
  const m = mats();
  const r = rng(2323);
  const state = { gateGlow: [] };
  // the cliff: great scanned boulders heaped into a face, the door set into its foot (crags if none load)
  const face = G.z - 2.0;
  const rockMat = m.frostRock;
  b.add(cliffFace(G.x, y - 3, face - 0.6, 70, 46));
  // boulders heaped at the cliff foot either side, to bed it into the slope
  const bigIds = ['namaqualand_boulder_02', 'boulder_01', 'rock_07'].filter((id) => hasProp(id));
  const masses = [[-12.5, 6.5, 0.4, 1.0], [12.5, 6.5, 2.1, 1.0], [-21, 8, 1.0, 1.5], [21.5, 8, 4.0, 1.5], [-29, 7, 2.5, 2.5], [29, 7, 1.6, 2.5]];
  masses.forEach(([dx, size, rot, fwd], k) => {
    if (bigIds.length) placeProp(b, bigIds[k % bigIds.length], G.x + dx, y - size * 0.12, face + fwd, { fit: size, rot, collide: false });
    else crag(b, rockMat, G.x + dx, y + size * 0.15, face + fwd, size * 0.5, size * 0.4, size * 0.45, k, rot);
  });
  b.col.addBox(G.x, face - 4, 27, 4.5, 0, y - 3, y + 26, { walkable: false });
  // snow lying on the ledges of the cliff
  for (const [dx, dy, sz] of [[-12, 8.5, 4], [12.5, 8.5, 4], [0, 19.5, 5], [-18, 5.5, 3], [18.5, 6, 3], [-6.5, 15.5, 2.5], [6.5, 15.5, 2.5]]) drift(b, G.x + dx, y + dy, face - 2.2, sz, 0.55);
  // the relief panel: a great slab of grey stone over the door, the three founders standing out of it in white
  const panelY = y + 14.2;
  // an arched niche cut back into the rock over the door, the three founders standing in it
  const frameMat = M('whitestone@c0c6cf');
  {
    const nw = 15, nh = 9;
    const sh = new THREE.Shape();
    sh.moveTo(-nw / 2, 0); sh.lineTo(nw / 2, 0); sh.lineTo(nw / 2, nh * 0.6);
    sh.quadraticCurveTo(nw / 2, nh, 0, nh); sh.quadraticCurveTo(-nw / 2, nh, -nw / 2, nh * 0.6); sh.closePath();
    const back = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), m.panelStone);
    back.position.set(G.x, panelY - 4.4, face + 0.25);
    back.receiveShadow = true;
    b.add(back);
    const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sh.getPoints(24).map((q) => new THREE.Vector3(q.x, q.y, 0))), 60, 0.32, 6, true), frameMat);
    rim.position.copy(back.position).add(new THREE.Vector3(0, 0, 0.3));
    rim.castShadow = true;
    b.add(rim);
    b.box(nw + 1.4, 0.7, 1.6, frameMat, G.x, panelY - 4.4, face + 0.7, 0, { collide: false }); // the ledge they stand on
  }
  // sun, moon, star: Ilsabet Corve, Hrolfa Stonevoice, Thalindor of the Greenward
  state.founderOrbs = [[-4.6, 0xffc860], [0, 0xb8d0ff], [4.6, 0xe8f4ff]].map(([dx, col]) => founderFigure(b, G.x + dx, panelY - 4.05, face + 0.95, 0, 6.6, col, m.reliefStone));
  for (const o of state.founderOrbs) o.material.emissiveIntensity = 0.35;
  icicles(b, panelY - 4.75, G.x - 8, face + 1.45, G.x + 8, face + 1.45, 34, 1.4, 11);
  // the door: a pointed arch of black ice, deep and glassy, with a cold light far down inside it
  const dw = 6.2, dh = 9.6;
  const sh = new THREE.Shape();
  sh.moveTo(-dw / 2, 0); sh.lineTo(-dw / 2, dh * 0.62);
  sh.quadraticCurveTo(-dw / 2, dh * 0.92, 0, dh);
  sh.quadraticCurveTo(dw / 2, dh * 0.92, dw / 2, dh * 0.62);
  sh.lineTo(dw / 2, 0); sh.closePath();
  const doorGeo = new THREE.ExtrudeGeometry(sh, { depth: 1.0, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2, curveSegments: 14 });
  doorGeo.translate(0, 0, -0.5);
  const gate = new THREE.Group();
  gate.position.set(G.x, y, G.z);
  const iceMat = m.blackIce.clone();
  const ice = new THREE.Mesh(doorGeo, iceMat);
  ice.castShadow = true;
  gate.add(ice);
  // the light within: a soft cold glow behind the ice, and a seam of rune-light up the middle
  const glow = glowCard(dw * 0.9, dh * 0.9, 0x3a6aff, 0.3);
  glow.position.set(0, dh * 0.46, -0.2);
  gate.add(glow);
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x9ac8ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.08, dh * 0.92), seamMat);
  seam.position.set(0, dh * 0.47, 0.64);
  gate.add(seam);
  // carved in the ice: a crown, and the three hearts round it
  const carve = canvasTex(256, 256, (g) => {
    g.strokeStyle = 'rgba(200,225,255,0.95)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(68, 150); g.lineTo(68, 96); g.lineTo(98, 124); g.lineTo(128, 80); g.lineTo(158, 124); g.lineTo(188, 96); g.lineTo(188, 150); g.closePath(); g.stroke();
    for (let k = 0; k < 3; k++) {
      const cx = 78 + k * 50, cy = 200;
      g.beginPath(); g.moveTo(cx, cy + 14); g.bezierCurveTo(cx - 18, cy, cx - 10, cy - 15, cx, cy - 6); g.bezierCurveTo(cx + 10, cy - 15, cx + 18, cy, cx, cy + 14); g.stroke();
    }
    g.beginPath(); g.arc(128, 128, 118, 0, TAU); g.stroke();
  });
  const carveMat = new THREE.MeshBasicMaterial({ map: carve, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x8ab8ff });
  const carving = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), carveMat);
  carving.position.set(0, dh * 0.58, 0.66);
  gate.add(carving);
  b.add(dyn(gate));
  state.gateDoor = gate;
  state.gateGlow.push(iceMat, seamMat, carveMat, glow.material);
  b.col.addBox(G.x, G.z, dw / 2, 0.7, 0, y - 1, y + dh);
  // the door frame: two carved posts of pale stone, runes running up them
  for (const s of [-1, 1]) {
    b.box(1.1, dh + 0.6, 1.4, frameMat, G.x + s * (dw / 2 + 0.6), y + (dh + 0.6) / 2, G.z, 0);
    const runeMat = m.rune.clone();
    runeMat.emissiveIntensity = 0.35;
    state.gateGlow.push(runeMat);
    for (let k = 0; k < 6; k++) {
      const rn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.04), runeMat);
      rn.position.set(G.x + s * (dw / 2 + 0.6), y + 1.0 + k * 1.45, G.z + 0.72);
      rn.rotation.z = (k % 2 ? 0.4 : -0.3);
      b.add(rn);
    }
  }
  b.box(dw + 2.8, 0.9, 1.5, frameMat, G.x, y + dh + 0.2, G.z, 0, { collide: false });
  icicles(b, y + dh - 0.3, G.x - dw / 2 - 1, G.z + 0.78, G.x + dw / 2 + 1, G.z + 0.78, 22, 0.9, 5);
  // a flight of three broad steps up to the door, frosted
  for (let k = 0; k < 3; k++) b.box(dw + 3.5 - k * 0.6, 0.22, 1.1, 'whitestone@d4d8de', G.x, y + 0.11 + k * 0.22 - 0.15, G.z + 3.0 - k * 1.0, 0, { walkable: true });
  frostDecal(b, G.x, y + 0.5, G.z + 2.0, 6.5);
  // cold-fire braziers either side of the apron, long out, rimed with frost
  for (const s of [-1, 1]) coldBrazier(b, G.x + s * 6.8, y, G.z + 4.6, false, 1.2);
  // the light that wakes when the rite is done
  state.gateLight = b.light(0x7aaaff, 34, 26, G.x, y + 5, G.z + 3.5, { flicker: false });
  state.gateLight.on = false;
  // the founders' banner, its pole snapped and leaning, and the bones of those who came before
  {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.5, 6), M('timber@b8a890'));
    pole.position.set(G.x - 9.5, y + 2.4, G.z + 6.5);
    pole.rotation.z = 0.32;
    pole.castShadow = true;
    b.add(pole);
    const bn = banner(b, G.x - 9.0, y + 4.6, G.z + 6.55, 0, 1.0, 2.1, 'founders', true);
    bn.rotation.z = 0.32;
  }
  bones(b, G.x + 4.2, y, G.z + 7.2, r);
  bones(b, G.x - 3.0, y, G.z + 9.0, r);
  bones(b, G.x + 9.0, y, G.z + 5.0, r);
  // a rusted sword and a cracked shield where somebody made a last stand
  b.box(0.08, 0.04, 1.1, 'iron', G.x + 4.8, y + 0.05, G.z + 7.6, 0.8, { collide: false });
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), M('timber@b0a080'));
  shield.position.set(G.x + 3.6, y + 0.05, G.z + 8.0);
  shield.rotation.x = 0.15;
  b.add(shield);
  // drifts and fallen rock round the apron
  for (let k = 0; k < 14; k++) {
    const a = PI * 0.1 + r() * PI * 0.8, d = 8 + r() * 10;
    const x = G.x + Math.cos(a) * d * 1.3, z = G.z + 2 + Math.sin(a) * d;
    if (r() < 0.55) drift(b, x, H(x, z) + 0.1, z, 1.2 + r() * 1.8, 0.35 + r() * 0.4);
    else crag(b, rockMat, x, H(x, z) + 0.2, z, 0.6 + r() * 1.2, 0.5 + r() * 0.8, 0.6 + r() * 1.0, k, r() * 3);
  }
  b.interact({ kind: 'hollowgate', id: 'hollow_gate', name: 'The Hollow Gate', pos: new THREE.Vector3(G.x, y + 1.6, G.z + 2.4), radius: 2.5, verb: 'Examine' });
  b.interact({ kind: 'door', cell: 'hollow_gate_hall', name: 'The Hollow Gate', pos: new THREE.Vector3(G.x, y + 1.4, G.z + 1.3), radius: 1.8, verb: 'Enter', requireFlag: 'hollowGateOpen' });
  return state;
}

// ------------------------------------------------------------------ indoors: set pieces on the map markers
// A marker char in a map pushes { x, z, gx, gz } onto meta.marks[char]; each interior below reads its own.
const first = (meta, ch) => meta.marks?.[ch]?.[0];
/** Which side of grid cell (gx, gz) has a wall: [dx, dz] pointing at it, or null. */
function wallDir(grid, gx, gz) {
  for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (grid[gz + dz]?.[gx + dx] === '#') return [dx, dz];
  return null;
}
/** Something flat (a chart, a banner, a niche face) on the wall beside marker cell p, facing into the room. */
function onWall(meta, p, inset = 0.02) {
  const d = wallDir(meta.grid, p.gx, p.gz);
  if (!d) return null;
  const T = meta.T;
  return { x: p.x + d[0] * (T / 2 - inset), z: p.z + d[1] * (T / 2 - inset), rotY: Math.atan2(-d[0], -d[1]), d };
}

export function decorateHollowInterior(game, cell, b, meta, id) {
  if (id === 'mages_guild') guildHall(b, meta);
  else if (id === 'starfall_observatory') observatory(b, meta);
  else if (id === 'hollow_gate_hall') gateHall(b, meta);
  else if (id === 'bone_stair') boneStair(b, meta);
  else if (id === 'ashgrave_throne') throneHall(b, meta);
  else if (id === 'rime_spire') rimeHeartstone(b, meta);
  else if (id === 'vilverin') vilverinNiche(b, meta);
}

/** The Chorrol Mages Guild: the Founders' Pool, its three Warding Lamps, the study, the library. */
function guildHall(b, meta) {
  const m = mats();
  const P = first(meta, '*');
  // the pool: a round basin of pale stone, its surface a disc of black ice with a crowned face deep inside
  b.cyl(2.75, 2.9, 0.16, 'whitestone@e4e0d8', P.x, 0.08, P.z, { seg: 36, collide: false });
  b.cyl(2.35, 2.5, 0.3, 'whitestone@ece8e0', P.x, 0.2, P.z, { seg: 32, collide: false });
  // carved rim: the founders' three hearts in gold round the outside of the basin
  for (let k = 0; k < 3; k++) {
    const a = PI / 2 + (k / 3) * TAU;
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M('gold'));
    heart.scale.set(1, 1, 0.4);
    heart.position.set(P.x + Math.cos(a) * 2.52, 0.3, P.z + Math.sin(a) * 2.52);
    heart.rotation.y = -a + PI / 2;
    b.add(heart);
  }
  // the cold of the pool: a pale blue light low over the ice, against the warm candlelight of the hall
  meta.coldLight = b.light(0x6a9aff, 9, 8, P.x, 1.1, P.z, { flicker: false });
  const lip = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.24, 8, 40), M('whitestone@f2eee6'));
  lip.rotation.x = PI / 2; lip.position.set(P.x, 0.42, P.z);
  lip.castShadow = true;
  b.add(lip);
  b.col.addCircle(P.x, P.z, 2.3, 0, 0.5, { walkable: false });
  // a ring of gold inlaid in the floor round the basin, with the three founders' signs at the lamps
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.05, 3.15, 64), M('gold'));
  ring.rotation.x = -PI / 2; ring.position.set(P.x, 0.012, P.z);
  b.add(ring);
  const ice = new THREE.Group();
  const iceDisc = new THREE.Mesh(new THREE.CircleGeometry(1.86, 48), m.blackIce.clone());
  iceDisc.rotation.x = -PI / 2; iceDisc.position.y = 0.36;
  ice.add(iceDisc);
  const face = canvasTex(256, 256, (g) => {
    // cracks across the ice, and under them the ghost of a crowned skull looking up
    g.strokeStyle = 'rgba(210,230,255,0.75)'; g.lineWidth = 1.5;
    const r = rng(41);
    for (let k = 0; k < 9; k++) { let x = 128, y = 128; g.beginPath(); g.moveTo(x, y); const a = r() * TAU; for (let s = 0; s < 6; s++) { x += Math.cos(a + (r() - 0.5)) * 20; y += Math.sin(a + (r() - 0.5)) * 20; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(140,190,255,0.32)';
    g.beginPath(); g.ellipse(128, 136, 40, 50, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(10,20,40,0.6)';
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(128 + sx * 15, 128, 9, 11, 0, 0, TAU); g.fill(); }
    g.beginPath(); g.moveTo(128, 140); g.lineTo(122, 152); g.lineTo(134, 152); g.fill();
    g.fillStyle = 'rgba(160,210,255,0.4)';
    g.beginPath(); g.moveTo(92, 92); g.lineTo(100, 70); g.lineTo(114, 86); g.lineTo(128, 62); g.lineTo(142, 86); g.lineTo(156, 70); g.lineTo(164, 92); g.closePath(); g.fill();
  });
  const faceMat = new THREE.MeshBasicMaterial({ map: face, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xb8d8ff });
  const facePlane = new THREE.Mesh(new THREE.CircleGeometry(1.8, 40), faceMat);
  facePlane.rotation.x = -PI / 2; facePlane.position.y = 0.375;
  ice.add(facePlane);
  ice.position.set(P.x, 0, P.z);
  ice.userData.mats = [iceDisc.material, faceMat];
  b.add(dyn(ice));
  // the Founders' Flame: hidden until the lamps are lit
  const flame = softFlame(3.2, 1.5, ['rgba(250,253,255,1)', 'rgba(150,205,255,0.9)', 'rgba(60,110,255,0.35)']);
  flame.position.set(P.x, 0.36, P.z);
  const halo = glowCard(4, 4, 0x8ab8ff, 0.5);
  halo.position.y = 1.6;
  flame.add(halo);
  flame.visible = false;
  b.add(dyn(flame));
  flame.userData.spin = true;
  const light = b.light(0xa8d0ff, 34, 18, P.x, 2.4, P.z, { flicker: false });
  light.on = false;
  meta.pool = { x: P.x, z: P.z, ice, flame, light };
  b.interact({ kind: 'founderpool', id: 'founder_pool', name: "The Founders' Pool", pos: new THREE.Vector3(P.x, 0.8, P.z + 2.3), radius: 2.0, verb: 'Look' });
  // the three Warding Lamps on tall bronze stands: sun to the east, moon to the west, star to the north
  meta.lamps = [];
  for (const [n, dx, dz, label] of [['sun', 3.6, 0, 'the Sun'], ['moon', -3.6, 0, 'the Moon'], ['star', 0, -3.6, 'the Star']]) {
    const lx = P.x + dx, lz = P.z + dz;
    b.cyl(0.4, 0.5, 0.18, m.bronze, lx, 0.09, lz, { seg: 12, collide: false });
    b.cyl(0.06, 0.09, 1.7, m.bronze, lx, 0.95, lz, { seg: 8 });
    const knop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), m.bronze);
    knop.position.set(lx, 1.2, lz);
    b.add(knop);
    b.cyl(0.36, 0.18, 0.22, m.bronze, lx, 1.9, lz, { seg: 14, collide: false });
    // the emblem, on a little arm over the bowl
    let em;
    if (n === 'sun') {
      em = new THREE.Group();
      em.add(new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), M('gold')));
      for (let k = 0; k < 10; k++) { const ray = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), M('gold')); const a = (k / 10) * TAU; ray.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0); ray.rotation.z = a - PI / 2; em.add(ray); }
    } else if (n === 'moon') em = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 20, PI * 1.3), new THREE.MeshStandardMaterial({ color: 0xd8e0f0, roughness: 0.3, metalness: 0.8 }));
    else em = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), new THREE.MeshStandardMaterial({ color: 0xe8f0ff, roughness: 0.25, metalness: 0.7 }));
    em.position.set(lx, 2.55, lz);
    em.rotation.y = Math.atan2(P.x - lx, P.z - lz);
    if (n === 'moon') em.rotation.z = 0.6;
    b.add(em);
    const it = b.interact({ kind: 'wardlamp', id: `lamp_${n}`, n, name: `The Lamp of ${label}`, pos: new THREE.Vector3(lx, 1.6, lz), radius: 1.3, verb: 'Light' });
    meta.lamps.push({ n, x: lx, z: lz, it, flamePos: new THREE.Vector3(lx, 2.02, lz) });
  }
  // frost: feathered over the floor round the pool and creeping up the walls (hidden when the flame wakes)
  meta.frost = [];
  meta.frost.push(frostDecal(b, P.x, 0.02, P.z, 10.5));
  const r = rng(8);
  for (let k = 0; k < 7; k++) {
    const a = r() * TAU, d = 5.5 + r() * 4;
    meta.frost.push(frostDecal(b, P.x + Math.cos(a) * d, 0.021 + k * 0.001, P.z + Math.sin(a) * d, 2.5 + r() * 2.5));
  }
  for (const c of meta.marks['^'] || []) {
    const w = onWall(meta, c, 0.03);
    if (w) meta.frost.push(frostDecal(b, w.x, 3.4, w.z, 2.2, 0, w.rotY));
  }
  // star charts and Guild banners on the walls
  (meta.marks['^'] || []).forEach((c, i) => {
    const w = onWall(meta, c);
    if (!w) return;
    if (i % 2 === 0) {
      const chart = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.28), new THREE.MeshStandardMaterial({ map: starChartTex(), roughness: 0.8 }));
      chart.position.set(w.x, 2.3, w.z);
      chart.rotation.y = w.rotY;
      b.add(chart);
    } else banner(b, w.x - w.d[0] * 0.04, 4.1, w.z - w.d[1] * 0.04, w.rotY, 1.1, 2.4, 'guild', false);
  });
  // the study: the Magister's desk (the Charter goes on it), her bed and her chest; the door locked
  const desk = first(meta, '!');
  if (desk) {
    const w = onWall(meta, desk, 0.5) || { x: desk.x, z: desk.z, rotY: 0 };
    const top = 0.86;
    b.box(1.7, 0.08, 0.85, 'wood@d8c0a0', w.x, top - 0.04, w.z, w.rotY);
    for (const [u, v] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) b.box(0.08, top - 0.08, 0.08, 'wood@b89878', w.x + u * Math.cos(w.rotY) + v * Math.sin(w.rotY), (top - 0.08) / 2, w.z - u * Math.sin(w.rotY) + v * Math.cos(w.rotY), w.rotY, { collide: false });
    b.col.addBox(w.x, w.z, 0.85, 0.42, w.rotY, 0, top);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ color: 0xf0e6cc, roughness: 1 }));
    paper.rotation.set(-PI / 2, 0, 0.3); paper.position.set(w.x + 0.45, top + 0.003, w.z + 0.1);
    b.add(paper);
    if (hasProp('wooden_candlestick')) placeProp(b, 'wooden_candlestick', w.x - 0.6, top, w.z - 0.15, { collide: false });
    b.light(0xffc070, 4, 6, w.x - 0.4, top + 0.9, w.z + 0.6, { flicker: true });
    meta.charter = { x: w.x, y: top + 0.02, z: w.z };
  }
  const bedP = first(meta, '%');
  if (bedP) {
    if (hasProp('GothicBed_01')) placeProp(b, 'GothicBed_01', bedP.x, 0, bedP.z, { rot: 0, collide: false, scale: 0.95 });
    else { b.box(1.1, 0.45, 2.1, 'timber', bedP.x, 0.22, bedP.z, 0); b.box(1.0, 0.16, 1.95, 'clothred', bedP.x, 0.52, bedP.z, 0, { collide: false }); }
    b.col.addBox(bedP.x, bedP.z, 0.7, 1.0, 0, 0, 0.6, { walkable: true });
    b.interact({ kind: 'bed', id: 'magister_bed', name: 'Bed', owner: 'Ondine Vell', pos: new THREE.Vector3(bedP.x, 0.8, bedP.z), radius: 1.2, verb: 'Sleep' });
  }
  const chestP = first(meta, '$');
  if (chestP) {
    const g = new THREE.Group();
    g.position.set(chestP.x, 0, chestP.z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.65), M('wood@c8a880'));
    body.position.y = 0.28; g.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.1, 12, 1, false, 0, PI), M('wood@c8a880'));
    lid.rotation.z = PI / 2; lid.position.y = 0.55; g.add(lid);
    for (const sx of [-0.4, 0.4]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.68), M('gold')); band.position.set(sx, 0.3, 0); g.add(band); }
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), M('gold'));
    eye.position.set(0, 0.38, 0.33); g.add(eye);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    b.add(g);
    b.col.addBox(chestP.x, chestP.z, 0.55, 0.33, 0, 0, 0.8);
    meta.magisterChest = { x: chestP.x, z: chestP.z };
    b.interact({ kind: 'container', id: 'magister_chest', name: "The Magister's Chest", requireFlag: 'mgMagister', pos: new THREE.Vector3(chestP.x, 0.8, chestP.z + 0.5), radius: 1.1, verb: 'Open' });
  }
  const gateP = first(meta, '=');
  if (gateP) {
    // the study door: dark oak in the wall gap, a brass ward-sigil on it (the lock: Ondine has the key)
    const T = meta.T;
    const vertical = meta.grid[gateP.gz - 1]?.[gateP.gx] === '#' && meta.grid[gateP.gz + 1]?.[gateP.gx] === '#';
    const g = new THREE.Group();
    g.position.set(gateP.x, 0, gateP.z);
    if (vertical) g.rotation.y = PI / 2;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(T * 0.84, 2.9, 0.18), M('wood@b89070'));
    leaf.position.y = 1.45; g.add(leaf);
    const sig = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 20), M('gold'));
    sig.position.set(0, 1.6, 0.1); g.add(sig);
    const sig2 = sig.clone(); sig2.position.z = -0.1; g.add(sig2);
    for (const sy of [0.5, 2.5]) { const strap = new THREE.Mesh(new THREE.BoxGeometry(T * 0.8, 0.08, 0.22), M('iron')); strap.position.y = sy; g.add(strap); }
    b.add(dyn(g));
    b.box(T, meta.H - 2.9, 0.5, 'plaster@efe8dc', gateP.x, 2.9 + (meta.H - 2.9) / 2, gateP.z, vertical ? PI / 2 : 0, { collide: false });
    const col = vertical ? b.col.addBox(gateP.x, gateP.z, 0.25, T / 2, 0, -1, meta.H + 1) : b.col.addBox(gateP.x, gateP.z, T / 2, 0.25, 0, -1, meta.H + 1);
    b.interact({ kind: 'gatebars', id: 'guild_study_gate', name: "The Magister's Study", lock: { level: 2, key: 'guild_study_key' }, pos: new THREE.Vector3(gateP.x, 1.4, gateP.z + (vertical ? 0 : 0.6)), radius: 1.6, verb: 'Open', mesh: g, collider: col });
  }
  // warm light under the chandeliers, and candles on the tables
  for (const c of meta.marks['&'] || []) b.light(0xffc888, 18, 14, c.x, meta.H - 1.4, c.z, { flicker: true });
  // tall bookcases against the walls, crammed with books
  for (const c of meta.marks['('] || []) {
    const w = onWall(meta, c, 0.36);
    if (!w) continue;
    if (hasProp('wooden_bookshelf_worn')) {
      const sh = placeProp(b, 'wooden_bookshelf_worn', w.x, 0, w.z, { rot: w.rotY, scale: 1.15 });
      const top = sh.userData.propSize.y;
      for (const sy of [0.98, 1.43]) if (hasProp('book_encyclopedia_set_01')) placeProp(b, 'book_encyclopedia_set_01', w.x, sy * 1.15, w.z, { rot: w.rotY, collide: false });
      if (hasProp('ceramic_vase_01')) placeProp(b, 'ceramic_vase_01', w.x, top, w.z, { collide: false, scale: 0.9 });
    } else b.box(1.6, 2.5, 0.45, 'wood@c8a880', w.x, 1.25, w.z, w.rotY);
  }
  wainscot(b, meta, 'wood@d8bc98', 1.25);
  // tall arched windows, daylight pale in the leaded glass
  for (const c of meta.marks['<'] || []) archWindow(b, meta, c, 2.9, 1.3, 2.6);
}

/** A tall arched window in the wall beside marker cell c: stone surround, leaded panes, daylight in the glass. */
const _winMat = new THREE.MeshStandardMaterial({ color: 0x8aa4c4, emissive: 0xc8dcff, emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.3 });
const _nightWinMat = new THREE.MeshStandardMaterial({ color: 0x1a2a48, emissive: 0x3a5a9a, emissiveIntensity: 0.7, roughness: 0.1, metalness: 0.3 });
function archWindow(b, meta, c, y, w, h, glassMat = _winMat) {
  const at = onWall(meta, c, 0.04);
  if (!at) return;
  const g = new THREE.Group();
  g.position.set(at.x, y, at.z);
  g.rotation.y = at.rotY;
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, -h / 2); sh.lineTo(w / 2, -h / 2); sh.lineTo(w / 2, h / 2 - w / 2);
  sh.absarc(0, h / 2 - w / 2, w / 2, 0, PI, false); sh.closePath();
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(sh, 12), glassMat);
  g.add(glass);
  const lead = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6, metalness: 0.6 });
  for (let k = -1; k <= 1; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, h * 0.9, 0.03), lead); bar.position.set(k * w / 4, -0.05, 0.02); g.add(bar); }
  for (let k = 0; k < 4; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, 0.03), lead); bar.position.set(0, -h / 2 + (k + 1) * h / 5, 0.02); g.add(bar); }
  const frame = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + 0.06, 0.09, 6, 16, PI), M('whitestone@e8e4dc'));
  frame.position.set(0, h / 2 - w / 2, 0.04);
  g.add(frame);
  for (const s of [-1, 1]) { const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, h - w / 2, 0.14), M('whitestone@e8e4dc')); jamb.position.set(s * (w / 2 + 0.06), -w / 4, 0.04); g.add(jamb); }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.12, 0.3), M('whitestone@e8e4dc'));
  sill.position.set(0, -h / 2 - 0.05, 0.1);
  g.add(sill);
  b.add(g);
}

/** Panelling along every wall of a room: a wooden dado to `h`, with a moulded rail along its top. */
function wainscot(b, meta, mat, h) {
  const T = meta.T, grid = meta.grid;
  for (let gz = 1; gz < grid.length - 1; gz++) for (let gx = 1; gx < grid[0].length - 1; gx++) {
    const c = grid[gz][gx];
    if (c === '#' || c === ' ' || c === 'D' || c === '=') continue;
    const [cx, cz] = meta.at(gx, gz);
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (grid[gz + dz]?.[gx + dx] !== '#') continue;
      const rot = dx ? PI / 2 : 0;
      const px = cx + dx * (T / 2 - 0.04), pz = cz + dz * (T / 2 - 0.04);
      b.box(T, h, 0.06, mat, px, h / 2, pz, rot, { collide: false, cast: false });
      b.box(T, 0.09, 0.12, mat, px - dx * 0.03, h + 0.03, pz - dz * 0.03, rot, { collide: false, cast: false });
    }
  }
}

/** Starfall Observatory: moonlight through the broken dome, snow on the floor, the cracked Seal-Orrery. */
function observatory(b, meta) {
  const m = mats();
  const O = first(meta, '*');
  const H = meta.H;
  // the shaft of cold light (and snow) falling through the crack in the dome, onto a drift on the floor
  const beamTex = canvasTex(32, 128, (g) => { const grd = g.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 32, 128); });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, H, 20, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: 0x9ab8e0, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  // the moon comes straight down through the oculus onto the orrery
  const Bp = O;
  beam.position.set(Bp.x, H / 2, Bp.z);
  beam.renderOrder = 6;
  b.add(dyn(beam));
  const hole = new THREE.Mesh(new THREE.CircleGeometry(2.3, 24), new THREE.MeshBasicMaterial({ color: 0x8aa8d4, fog: false }));
  hole.rotation.x = PI / 2; hole.position.set(Bp.x, H - 0.02, Bp.z);
  b.add(hole);
  for (let k = 0; k < 14; k++) {
    // a few stars in the sliver of night sky
    const a = k * 2.4, d = 0.3 + (k % 5) * 0.4;
    const st = new THREE.Mesh(new THREE.CircleGeometry(0.025 + (k % 3) * 0.012, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
    st.rotation.x = PI / 2; st.position.set(Bp.x + Math.cos(a) * d, H - 0.03, Bp.z + Math.sin(a) * d);
    b.add(st);
  }
  drift(b, Bp.x + 2.6, 0.05, Bp.z + 1.4, 1.3, 0.55);
  drift(b, Bp.x - 2.3, 0.05, Bp.z - 1.3, 1.0, 0.45);
  b.emitter('sparkle', Bp.x, H - 1, Bp.z, 4, { color: 0xeaf4ff, spread: 2.2, range: 40 });
  b.light(0xa8c4ff, 34, 24, Bp.x, H - 1.5, Bp.z, { flicker: false });
  // the dome's skeleton under the roof: a brass oculus ring and bronze ribs running out from it to the walls
  const oc = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.16, 8, 40), m.bronze);
  oc.rotation.x = PI / 2; oc.position.set(Bp.x, H - 0.25, Bp.z);
  b.add(oc);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.12, 6, 64), m.bronze);
  ring2.rotation.x = PI / 2; ring2.position.set(Bp.x, H - 1.35, Bp.z);
  b.add(ring2);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU, len = 13;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, len), m.bronze);
    const mid = 2.4 + len / 2;
    rib.position.set(Bp.x + Math.cos(a) * mid, H - 0.25 - 0.09 * mid, Bp.z + Math.sin(a) * mid);
    rib.rotation.order = 'YXZ';
    rib.rotation.set(0.09 * Math.sign(1), -a + PI / 2, 0);
    rib.rotation.x = 0.09;
    b.add(rib);
  }
  // the Seal-Orrery: a great brass armillary on a stone drum; nine spheres, three of them black ice
  b.cyl(1.2, 1.45, 1.1, 'whitestone@d0d4da', O.x, 0.55, O.z, { seg: 16 });
  const orr = new THREE.Group();
  orr.position.set(O.x, 2.9, O.z);
  const brass = m.bronze;
  const spheres = [0xd8b060, 0xb8c8e8, 0x1a2a40, 0xc89070, 0x1a2a40, 0x98c0a0, 0xe0d8c0, 0x1a2a40, 0xb0a8d8];
  for (let k = 0; k < 4; k++) {
    const ringG = new THREE.Group();
    ringG.rotation.set(0.4 + k * 0.42, k * 0.9, 0.15 * k);
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.75 + k * 0.32, 0.03, 6, 48, k === 3 ? PI * 1.35 : TAU), brass);
    tor.rotation.x = PI / 2;
    ringG.add(tor);
    orr.add(ringG);
  }
  spheres.forEach((col, i) => {
    const a = (i / 9) * TAU, rr = 0.9 + (i % 4) * 0.32, yy = Math.sin(i * 1.7) * 0.6;
    const black = col === 0x1a2a40;
    const s = new THREE.Mesh(new THREE.SphereGeometry(black ? 0.16 : 0.12, 14, 10), black ? m.blackIce : new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.5 }));
    s.position.set(Math.cos(a) * rr, yy, Math.sin(a) * rr);
    orr.add(s);
    if (black) { const h = glowCard(0.9, 0.9, 0x4a80ff, 0.45); h.position.copy(s.position); orr.add(h); }
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffa040, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.6 }));
  orr.add(core);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.9, 8), brass);
  stem.position.y = -1.0;
  orr.add(stem);
  orr.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  b.add(dyn(orr));
  // the fourth ring lies cracked on the floor where it fell
  const fallen = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.035, 6, 40, PI * 0.6), brass);
  fallen.rotation.set(-PI / 2, 0, 1.2);
  fallen.position.set(O.x + 1.6, 0.05, O.z + 1.4);
  b.add(fallen);
  b.light(0x6a9aff, 12, 9, O.x, 3.2, O.z, { flicker: false });
  meta.orrery = { x: O.x, z: O.z };
  b.interact({ kind: 'sealorrery', id: 'seal_orrery', name: 'The Seal-Orrery', pos: new THREE.Vector3(O.x, 1.4, O.z + 1.7), radius: 1.8, verb: 'Examine' });
  // Bastien's corner: a bedroll, a desk heaped with papers, a lantern burned down to nothing
  const N = first(meta, '!');
  if (N) {
    const w = onWall(meta, N, 0.5) || { x: N.x, z: N.z, rotY: 0 };
    const top = 0.84;
    b.box(1.5, 0.08, 0.8, 'wood@c8b090', w.x, top - 0.04, w.z, w.rotY);
    for (const [u, v] of [[-0.65, -0.32], [0.65, -0.32], [-0.65, 0.32], [0.65, 0.32]]) b.box(0.07, top - 0.08, 0.07, 'wood@b09878', w.x + u * Math.cos(w.rotY) + v * Math.sin(w.rotY), (top - 0.08) / 2, w.z - u * Math.sin(w.rotY) + v * Math.cos(w.rotY), w.rotY, { collide: false });
    b.col.addBox(w.x, w.z, 0.75, 0.4, w.rotY, 0, top);
    const r = rng(19);
    for (let k = 0; k < 6; k++) {
      const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ color: 0xf0e6cc, roughness: 1, side: THREE.DoubleSide }));
      pp.rotation.set(-PI / 2, 0, r() * TAU);
      const onFloor = k > 3;
      pp.position.set(w.x + (r() - 0.5) * (onFloor ? 2.4 : 1.2), onFloor ? 0.01 : top + 0.003 + k * 0.001, w.z + (r() - 0.5) * (onFloor ? 2.0 : 0.5));
      b.add(pp);
    }
    // the bedroll beside the desk
    const roll = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 2.0), new THREE.MeshStandardMaterial({ color: 0x6a5a8a, roughness: 1 }));
    roll.position.set(w.x + 1.6 * Math.cos(w.rotY), 0.06, w.z - 1.6 * Math.sin(w.rotY));
    roll.rotation.y = w.rotY;
    b.add(roll);
    meta.notes = { x: w.x - 0.3, y: top + 0.02, z: w.z };
    if (hasProp('wooden_candlestick')) placeProp(b, 'wooden_candlestick', w.x + 0.55, top, w.z, { collide: false });
    b.light(0xffb868, 3.5, 6, w.x + 0.3 - Math.sin(w.rotY) * -0.8, top + 1.2, w.z - Math.cos(w.rotY) * -0.8, { flicker: true });
    const wk = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshStandardMaterial({ color: 0x9ac0ff, emissive: 0x4a80ff, emissiveIntensity: 0.9, roughness: 0.2 }));
    wk.position.set(w.x - 0.6, top + 0.16, w.z + 0.1);
    b.add(wk);
  }
  // a timber gallery along the north wall, where the Guild's astronomers sat with their charts
  {
    const T = meta.T, rows = meta.grid.length, cols = meta.grid[0].length;
    const [x0, zN] = meta.at(1, 1), [x1] = meta.at(cols - 2, 1);
    const gz = zN - T / 2 + 1.3, gy = 4.4;
    b.box(x1 - x0 + T, 0.22, 2.6, 'wood@d0b898', (x0 + x1) / 2, gy, gz, 0, { collide: false });
    for (let x = x0 - T / 2 + 0.4; x <= x1 + T / 2 - 0.4; x += 1.2) b.box(0.07, 1.0, 0.07, 'wood@c0a888', x, gy + 0.6, gz + 1.2, 0, { collide: false, cast: false });
    b.box(x1 - x0 + T, 0.08, 0.1, 'wood@c0a888', (x0 + x1) / 2, gy + 1.1, gz + 1.25, 0, { collide: false });
    for (let x = x0; x <= x1; x += T * 3) b.cyl(0.14, 0.16, gy, 'wood@c0a888', x, gy / 2, gz + 1.15, { seg: 8 });
    // charts and a small telescope up on the gallery
    for (let k = 0; k < 3; k++) {
      const chart = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshStandardMaterial({ map: starChartTex(), roughness: 0.8 }));
      chart.position.set(x0 + (k + 0.5) * (x1 - x0) / 3, gy + 2.2, zN - T / 2 + 0.03);
      b.add(chart);
    }
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 12), m.bronze);
    scope.position.set((x0 + x1) / 2 + 3, gy + 1.6, gz);
    scope.rotation.set(0.6, 0, -0.4);
    b.add(scope);
  }
  for (const c of meta.marks['<'] || []) archWindow(b, meta, c, 4.6, 1.4, 3.2, _nightWinMat);
  // frost on the walls, snow drifted into the corners, toppled shelves and fallen masonry
  for (const c of meta.marks['^'] || []) {
    const w = onWall(meta, c, 0.03);
    if (w) frostDecal(b, w.x, 2.6, w.z, 3, 0, w.rotY);
  }
  const r = rng(52);
  for (const c of meta.marks['_'] || []) drift(b, c.x + (r() - 0.5), 0.05, c.z + (r() - 0.5), 0.9 + r() * 0.6, 0.45 + r() * 0.3);
  for (let k = 0; k < 6; k++) frostDecal(b, O.x + (r() - 0.5) * 14, 0.02 + k * 0.001, O.z + (r() - 0.5) * 12, 2 + r() * 3);
  // the Guild banner on the wall
  const bn = first(meta, '+');
  if (bn) { const w = onWall(meta, bn); if (w) banner(b, w.x - w.d[0] * 0.04, 4.6, w.z - w.d[1] * 0.04, w.rotY, 1.2, 2.6, 'guild', true); }
}

/** The founders' camp, four hundred years cold, inside the Hollow Gate; and the way down. */
function gateHall(b, meta) {
  const m = mats();
  const r = rng(77);
  const C = first(meta, '!');
  if (C) {
    // a ring of hearthstones round a cold firepit, three bedrolls, a crate, and the bones of the last one
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU;
      crag(b, m.frostRock, C.x + Math.cos(a) * 0.9, 0.12, C.z + Math.sin(a) * 0.9, 0.24, 0.18, 0.22, k);
    }
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.75, 14), new THREE.MeshStandardMaterial({ color: 0x5a5658, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
    ash.rotation.x = -PI / 2; ash.position.set(C.x, 0.02, C.z);
    b.add(ash);
    for (let k = 0; k < 3; k++) {
      const a = 0.4 + k * 1.9;
      const roll = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 1.9), new THREE.MeshStandardMaterial({ color: [0x5a6a8a, 0x7a5a4a, 0x4a6a5a][k], roughness: 1 }));
      roll.position.set(C.x + Math.cos(a) * 2.4, 0.05, C.z + Math.sin(a) * 2.4);
      roll.rotation.y = -a;
      b.add(roll);
      frostDecal(b, roll.position.x, 0.11, roll.position.z, 1.6);
    }
    bones(b, C.x + Math.cos(0.4) * 2.4, 0.1, C.z + Math.sin(0.4) * 2.4, r);
    if (hasProp('wooden_crate_02')) placeProp(b, 'wooden_crate_02', C.x - 1.8, 0, C.z - 1.6, { rot: 0.4, scale: 1.1 });
    else b.box(0.9, 0.9, 0.9, 'wood', C.x - 1.8, 0.45, C.z - 1.6, 0.4);
    meta.journal = { x: C.x - 1.8, y: 1.02, z: C.z - 1.6 };
    // a founders' lantern on a post by the camp: it has burned gold for four hundred years, and still does
    b.cyl(0.05, 0.07, 1.8, 'iron', C.x + 1.2, 0.9, C.z + 1.5, { seg: 6 });
    const lf = softFlame(0.42, 0.24, ['rgba(255,250,220,1)', 'rgba(255,200,110,0.9)', 'rgba(220,120,40,0.35)']);
    lf.position.set(C.x + 1.2, 1.78, C.z + 1.5);
    b.add(dyn(lf));
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.44, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.8, roughness: 0.5, wireframe: true }));
    cage.position.set(C.x + 1.2, 1.98, C.z + 1.5);
    b.add(cage);
    b.light(0xffc070, 16, 12, C.x + 1.2, 2.1, C.z + 1.5, { flicker: true });
    // a founders' banner hung on a pole over the camp
    b.cyl(0.05, 0.06, 3.6, 'timber@c0b098', C.x + 1.9, 1.8, C.z - 1.8, { seg: 6 });
    banner(b, C.x + 2.4, 3.5, C.z - 1.8, 0, 0.9, 1.8, 'founders', true);
  }
  // black ice sheathing the walls, frost everywhere, cold blue fire in iron braziers
  for (const c of meta.marks['^'] || []) {
    const w = onWall(meta, c, 0.25);
    if (!w) continue;
    const slab = new THREE.Mesh(cragGeo(c.gx % 6), m.blackIce);
    slab.position.set(w.x, 2.2 + r() * 1.5, w.z);
    slab.scale.set(1.2 + r(), 2.2 + r() * 1.2, 0.35);
    slab.rotation.y = w.rotY;
    b.add(slab);
    frostDecal(b, w.x + w.d[0] * -0.2, 3.2, w.z + w.d[1] * -0.2, 2.6, 0, w.rotY);
  }
  for (const c of meta.marks['&'] || []) coldBrazier(b, c.x, 0, c.z, true);
  for (let k = 0; k < 7; k++) icicles(b, meta.H - 0.05, (r() - 0.5) * 30, (r() - 0.5) * 20, (r() - 0.5) * 30, (r() - 0.5) * 20, 10, 1.8, k + 50);
  b.light(0x9ab8e8, 16, 34, 0, meta.H - 1.2, 0, { flicker: false });
  for (let k = 0; k < 10; k++) {
    const p = meta.enemies[k % Math.max(1, meta.enemies.length)];
    if (p) frostDecal(b, p.x + (r() - 0.5) * 3, 0.02 + k * 0.001, p.z + (r() - 0.5) * 3, 2.5 + r() * 2.5);
  }
  // the way down: a black arch in the far wall, breathing cold
  const S = first(meta, '>');
  if (S) {
    const w = onWall(meta, S, 0.1) || { x: S.x, z: S.z, rotY: 0, d: [0, -1] };
    const arch = new THREE.Group();
    arch.position.set(w.x, 0, w.z);
    arch.rotation.y = w.rotY;
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), new THREE.MeshBasicMaterial({ color: 0x02040a }));
    dark.position.set(0, 1.7, 0.02);
    arch.add(dark);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.8, 0.5), m.paleStone); post.position.set(s * 1.4, 1.9, 0.1); arch.add(post); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.5, 0.55), m.paleStone);
    top.position.set(0, 3.9, 0.1);
    arch.add(top);
    const glow = glowCard(2.4, 2.4, 0x3a6aff, 0.35);
    glow.position.set(0, 1.0, 0.05);
    arch.add(glow);
    b.add(arch);
    const ip = new THREE.Vector3(w.x - w.d[0] * 0.8, 1.4, w.z - w.d[1] * 0.8);
    b.interact({ kind: 'door', cell: 'bone_stair', name: 'The Bone Stair', pos: ip, radius: 1.6, verb: 'Descend' });
    b.light(0x5a8aff, 12, 8, ip.x, 2.2, ip.z, { flicker: false });
  }
}

/** The Bone Stair: a long cold way down, the walls full of skulls, frozen falls, cold fire on the landings. */
function boneStair(b, meta) {
  const m = mats();
  const r = rng(99);
  const T = meta.T, Hh = meta.H;
  // ossuary niches along the walls: arched recesses in pale stone, bones stacked like firewood, skulls on top
  const skulls = [], longBones = [];
  const niche = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 1 });
  const frame = M('stone@c4ccd8');
  let n0 = 0;
  for (let gz = 1; gz < meta.grid.length - 1; gz++) for (let gx = 1; gx < meta.grid[0].length - 1; gx++) {
    const c = meta.grid[gz][gx];
    if (c !== '.' && c !== 'e' && c !== '-') continue;
    const d = wallDir(meta.grid, gx, gz);
    if (!d || (n0++ % 2)) continue;
    const [cx, cz] = meta.at(gx, gz);
    const wx = cx + d[0] * (T / 2 - 0.02), wz = cz + d[1] * (T / 2 - 0.02);
    const rotY = Math.atan2(-d[0], -d[1]);
    const cs = Math.cos(rotY), sn = Math.sin(rotY);
    for (const [ny, nh] of [[0.25, 1.5], [2.15, 1.5]]) {
      const back = new THREE.Mesh(new THREE.PlaneGeometry(T * 0.62, nh), niche);
      back.position.set(wx, ny + nh / 2, wz);
      back.rotation.y = rotY;
      b.add(back);
      // jambs and a round arch over the recess
      for (const s2 of [-1, 1]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.22, nh, 0.3), frame);
        jamb.position.set(wx + cs * s2 * T * 0.33 - d[0] * 0.1, ny + nh / 2, wz - sn * s2 * T * 0.33 - d[1] * 0.1);
        jamb.rotation.y = rotY;
        b.add(jamb);
      }
      const arch = new THREE.Mesh(new THREE.TorusGeometry(T * 0.33, 0.11, 5, 14, PI), frame);
      arch.position.set(wx - d[0] * 0.1, ny + nh - 0.05, wz - d[1] * 0.1);
      arch.rotation.y = rotY;
      b.add(arch);
      // bones stacked crosswise, three courses, and a row of skulls on top looking out
      for (let course = 0; course < 3; course++) {
        for (let k = 0; k < 6; k++) {
          const u = (k - 2.5) * 0.17;
          longBones.push([wx - d[0] * 0.2 + cs * u, ny + 0.08 + course * 0.13, wz - d[1] * 0.2 - sn * u, rotY]);
        }
      }
      for (let k = 0; k < 5; k++) {
        const u = (k - 2) * T * 0.11;
        skulls.push([wx - d[0] * 0.22 + cs * u, ny + 0.55, wz - d[1] * 0.22 - sn * u, rotY + (r() - 0.5) * 0.6]);
      }
    }
  }
  if (longBones.length) {
    const geo = new THREE.CylinderGeometry(0.035, 0.035, 0.42, 5);
    geo.rotateX(PI / 2);
    const im = new THREE.InstancedMesh(geo, m.bone, longBones.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    longBones.forEach(([x, y, z, a], i) => { m4.compose(p.set(x, y, z), q.setFromAxisAngle(up, a + (i % 3 - 1) * 0.08), sc); im.setMatrixAt(i, m4); });
    b.add(im);
  }
  if (skulls.length) {
    const geo = new THREE.SphereGeometry(0.1, 9, 7);
    geo.scale(1, 0.92, 1.15);
    const im = new THREE.InstancedMesh(geo, m.bone, skulls.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    skulls.forEach(([x, y, z, a], i) => { m4.compose(p.set(x, y, z), q.setFromAxisAngle(up, a), s.setScalar(0.85 + (i % 4) * 0.08)); im.setMatrixAt(i, m4); });
    b.add(im);
    // eye sockets: two dark dots on each skull, as a second instanced mesh
    const eyes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 5, 4), new THREE.MeshBasicMaterial({ color: 0x0a0a10 }), skulls.length * 2);
    let n = 0;
    s.setScalar(1);
    skulls.forEach(([x, y, z, a]) => {
      for (const sx of [-1, 1]) { const ex = x + Math.cos(a) * sx * 0.036 + Math.sin(a) * 0.105, ez = z - Math.sin(a) * sx * 0.036 + Math.cos(a) * 0.105; m4.compose(p.set(ex, y + 0.015, ez), q.identity(), s); eyes.setMatrixAt(n++, m4); }
    });
    b.add(eyes);
  }
  // frozen waterfalls pouring down the walls into pools of ice
  for (const c of meta.marks['='] || []) {
    const w = onWall(meta, c, 0.3);
    if (!w) continue;
    const geo = new THREE.PlaneGeometry(T * 0.7, Hh, 6, 12);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 2.1 + p.getX(i) * 3) * 0.12 + 0.12);
    geo.computeVertexNormals();
    const fall = new THREE.Mesh(geo, M('ice'));
    fall.position.set(w.x, Hh / 2, w.z);
    fall.rotation.y = w.rotY;
    b.add(fall);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(T * 0.55, 20), new THREE.MeshStandardMaterial({ color: 0xbcd8f4, roughness: 0.05, metalness: 0.3, emissive: 0x2a4a80, emissiveIntensity: 0.3 }));
    pool.rotation.x = -PI / 2;
    pool.position.set(w.x - w.d[0] * 0.9, 0.03, w.z - w.d[1] * 0.9);
    b.add(pool);
    icicles(b, Hh - 0.1, w.x - Math.cos(w.rotY) * T * 0.4, w.z + Math.sin(w.rotY) * T * 0.4, w.x + Math.cos(w.rotY) * T * 0.4, w.z - Math.sin(w.rotY) * T * 0.4, 9, 1.4, c.gx);
    b.light(0x7ab0ff, 10, 9, w.x - w.d[0] * 1.2, 1.6, w.z - w.d[1] * 1.2, { flicker: false });
  }
  for (const c of meta.marks['&'] || []) coldBrazier(b, c.x, 0, c.z, true);
  // the steps of the stair: worn stone treads across the corridor every few metres, so it reads as going down
  for (const c of meta.marks['-'] || []) {
    // an east-west run of corridor has wall above or below it: its treads run across, north to south
    const ew = meta.grid[c.gz - 1]?.[c.gx] === '#' || meta.grid[c.gz + 1]?.[c.gx] === '#';
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * T * 0.3;
      b.box(ew ? 0.35 : T * 0.98, 0.06 + k * 0.03, ew ? T * 0.98 : 0.35, 'whitestone@c8ccd4', c.x + (ew ? off : 0), 0.03, c.z + (ew ? 0 : off), 0, { collide: false, cast: false });
    }
  }
  for (let k = 0; k < 16; k++) {
    const p = meta.enemies[k % Math.max(1, meta.enemies.length)];
    if (p) frostDecal(b, p.x + (r() - 0.5) * 4, 0.02 + k * 0.001, p.z + (r() - 0.5) * 4, 2 + r() * 3);
  }
  // Bastien's landing
  const Bs = first(meta, '!');
  if (Bs) meta.bastien = { x: Bs.x, z: Bs.z };
  // the doors of the Hollow King: a pair of great black-ice leaves carved with a crown
  const D = first(meta, '}');
  if (D) {
    const vertical = meta.grid[D.gz - 1]?.[D.gx] === '#' && meta.grid[D.gz + 1]?.[D.gx] === '#';
    const g = new THREE.Group();
    g.position.set(D.x, 0, D.z);
    if (vertical) g.rotation.y = PI / 2;
    const dh = Math.min(6.5, Hh - 0.5);
    for (const sx of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(T * 0.49, dh, 0.5), m.blackIce);
      leaf.position.set(sx * T * 0.25, dh / 2, 0);
      g.add(leaf);
    }
    const crown = canvasTex(256, 256, (cg) => {
      cg.strokeStyle = 'rgba(200,225,255,1)'; cg.lineWidth = 7;
      cg.beginPath(); cg.moveTo(48, 170); cg.lineTo(48, 90); cg.lineTo(88, 130); cg.lineTo(128, 60); cg.lineTo(168, 130); cg.lineTo(208, 90); cg.lineTo(208, 170); cg.closePath(); cg.stroke();
      cg.beginPath(); cg.moveTo(48, 196); cg.lineTo(208, 196); cg.stroke();
    });
    for (const sz of [0.27, -0.27]) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: crown, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x7aa8ff, side: THREE.DoubleSide }));
      c.position.set(0, dh * 0.62, sz);
      g.add(c);
    }
    b.add(dyn(g));
    const col = vertical ? b.col.addBox(D.x, D.z, 0.3, T / 2, 0, -1, Hh + 1) : b.col.addBox(D.x, D.z, T / 2, 0.3, 0, -1, Hh + 1);
    // the wall over the doors
    b.box(T, Hh - dh, 0.8, meta.def.wall, D.x, dh + (Hh - dh) / 2, D.z, vertical ? PI / 2 : 0, { collide: false });
    const front = first(meta, '{') || { x: D.x, z: D.z + T };
    b.interact({ kind: 'thronedoor', id: 'throne_door', name: 'The Doors of the Hollow King', openFlag: 'hollowThroneOpen', pos: new THREE.Vector3(front.x, 1.6, front.z), radius: 2.0, verb: 'Open', mesh: g, collider: col });
    b.light(0x6a9aff, 18, 12, front.x, 3, front.z, { flicker: false });
  }
  const E = first(meta, ')');
  if (E) {
    // beyond the doors, the last arch: dark, and cold enough to see your breath in the light of it
    const w = onWall(meta, E, 0.1) || { x: E.x, z: E.z, rotY: 0, d: [0, -1] };
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5), new THREE.MeshBasicMaterial({ color: 0x010206 }));
    dark.position.set(w.x, 2.5, w.z);
    dark.rotation.y = w.rotY;
    b.add(dark);
    const glow = glowCard(3.6, 4.4, 0x3a6aff, 0.4);
    glow.position.set(w.x - w.d[0] * 0.05, 2.2, w.z - w.d[1] * 0.05);
    glow.rotation.y = w.rotY;
    b.add(glow);
    b.interact({ kind: 'door', cell: 'ashgrave_throne', name: 'The Throne of Ashgrave', pos: new THREE.Vector3(w.x - w.d[0] * 0.9, 1.4, w.z - w.d[1] * 0.9), radius: 1.8, verb: 'Enter', requireFlag: 'hollowThroneOpen' });
  }
}

/** The Throne of Ashgrave: a vast round-feeling hall under the mountain, the throne of black ice on its dais. */
function throneHall(b, meta) {
  const m = mats();
  const r = rng(404);
  const T = meta.T, Hh = meta.H;
  const S = first(meta, '*');
  // the dais: three broad tiers of pale stone, frost-rimed, and the throne of black ice on top
  const tiers = [[7.2, 0.4], [5.6, 0.8], [4.0, 1.2]];
  for (const [rad, top] of tiers) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad + 0.25, 0.4, 40), M('whitestone@dce0e8'));
    t.position.set(S.x, top - 0.2, S.z - 1.5);
    t.castShadow = true; t.receiveShadow = true;
    b.add(t);
    b.col.addCircle(S.x, S.z - 1.5, rad, top - 0.4, top, { walkable: true });
  }
  const dy = 1.2;
  const throne = new THREE.Group();
  throne.position.set(S.x, dy, S.z - 2.8);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.6), m.blackIce);
  seat.position.y = 0.4; throne.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.6, 0.6), m.blackIce);
  back.position.set(0, 2.6, -0.6); throne.add(back);
  for (let k = 0; k < 7; k++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.2 + (k === 3 ? 0.12 : 0), 1.6 + (k === 3 ? 1.6 : (3 - Math.abs(k - 3)) * 0.35), 6), m.blackIce);
    spike.position.set(-0.95 + k * 0.32, 5.3 + (k === 3 ? 0.8 : 0), -0.6);
    throne.add(spike);
  }
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 1.6), m.blackIce); arm.position.set(s * 1.1, 0.9, 0); throne.add(arm); }
  throne.scale.setScalar(1.55);
  throne.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  b.add(throne);
  b.col.addBox(S.x, S.z - 2.8, 1.8, 1.5, 0, dy, dy + 9);
  // a shaft of pale light falling through a fissure in the mountain onto the throne
  {
    const shaftTex = canvasTex(32, 128, (g) => { const grd = g.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, 'rgba(255,255,255,0.85)'); grd.addColorStop(1, 'rgba(255,255,255,0.05)'); g.fillStyle = grd; g.fillRect(0, 0, 32, 128); });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 4.6, Hh, 24, 1, true), new THREE.MeshBasicMaterial({ map: shaftTex, color: 0xb8d0f8, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    shaft.position.set(S.x, Hh / 2, S.z - 2.2);
    shaft.renderOrder = 6;
    b.add(dyn(shaft));
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 6), new THREE.MeshBasicMaterial({ color: 0xc8dcff, fog: false }));
    crack.rotation.x = PI / 2; crack.rotation.z = 0.3;
    crack.position.set(S.x, Hh - 0.03, S.z - 2.2);
    b.add(crack);
    b.emitter('sparkle', S.x, Hh - 2, S.z - 2.2, 3, { color: 0xe0ecff, spread: 2.5, range: 70 });
    b.light(0xc8dcff, 40, 26, S.x, Hh - 3, S.z - 1, { flicker: false });
  }
  // massive columns down both sides of the hall, sheathed in black ice, banners hung toward the aisle
  for (const c of meta.marks['('] || []) {
    b.box(3.8, 1.0, 3.8, 'stone@c8d0dc', c.x, 0.5, c.z, 0);
    const shaft2 = b.cyl(1.35, 1.45, Hh - 2, 'stone@c0c8d6', c.x, 1.0 + (Hh - 2) / 2, c.z, { seg: 18, tile: 3 });
    shaft2.castShadow = true;
    b.box(3.6, 1.0, 3.6, 'stone@c8d0dc', c.x, Hh - 0.5, c.z, 0, { collide: false });
    for (let k = 0; k < 3; k++) {
      const a = r() * TAU;
      const ice = new THREE.Mesh(cragGeo(k + c.gz), m.blackIce);
      ice.position.set(c.x + Math.cos(a) * 1.3, 1.5 + r() * 6, c.z + Math.sin(a) * 1.3);
      ice.scale.set(0.6, 1.8 + r() * 1.5, 0.6);
      b.add(ice);
    }
    icicles(b, Hh - 1.05, c.x - 1.7, c.z + 1.8, c.x + 1.7, c.z + 1.8, 8, 1.6, c.gz * 7 + c.gx);
    const inward = c.x < S.x ? 1 : -1;
    banner(b, c.x + inward * 1.47, Hh - 2.4, c.z, inward > 0 ? PI / 2 : -PI / 2, 1.6, 6.5, 'founders', false);
  }
  // tall pointed arches carved into the walls, deep shadow in each
  {
    const archMat = M('stone@c4ccda');
    const shadow = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 1 });
    let k2 = 0;
    for (let gz = 1; gz < meta.grid.length - 1; gz++) for (let gx = 1; gx < meta.grid[0].length - 1; gx++) {
      const ch = meta.grid[gz][gx];
      if (ch === '#' || ch === '|' || ch === '%' || (k2++ % 2)) continue;
      const w = onWall(meta, { x: meta.at(gx, gz)[0], z: meta.at(gx, gz)[1], gx, gz }, 0.04);
      if (!w || (w.d[1] === 1)) continue; // not on the entrance wall
      const aw = 2.6, ah = 8.5;
      const sh = new THREE.Shape();
      sh.moveTo(-aw / 2, 0); sh.lineTo(aw / 2, 0); sh.lineTo(aw / 2, ah * 0.7);
      sh.quadraticCurveTo(aw / 2, ah * 0.92, 0, ah); sh.quadraticCurveTo(-aw / 2, ah * 0.92, -aw / 2, ah * 0.7); sh.closePath();
      const rec = new THREE.Mesh(new THREE.ShapeGeometry(sh, 10), shadow);
      rec.position.set(w.x, 0.6, w.z);
      rec.rotation.y = w.rotY;
      b.add(rec);
      const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sh.getPoints(16).slice(1, -1).map((q) => new THREE.Vector3(q.x, q.y, 0))), 30, 0.18, 5, false), archMat);
      rim.position.set(w.x - w.d[0] * 0.12, 0.6, w.z - w.d[1] * 0.12);
      rim.rotation.y = w.rotY;
      b.add(rim);
    }
  }
  // a cold fill high in the vault, so the walls and columns read out of the dark
  b.light(0x8aa8e0, 18, 60, S.x, Hh - 2, S.z + 12, { flicker: false });
  // the cold light behind the throne, as if the mountain itself were looking over his shoulder
  const back2 = glowCard(20, 20, 0x5a8aff, 0.5);
  back2.position.set(S.x, dy + 6.5, S.z - 5.4);
  b.add(back2);

  // the founders' wards: a great ring of runes inlaid in the floor round the dais, glowing faintly gold
  const runeTex = canvasTex(1024, 1024, (g) => {
    g.strokeStyle = 'rgba(255,215,140,0.95)';
    g.lineWidth = 6;
    for (const rr of [500, 440]) { g.beginPath(); g.arc(512, 512, rr, 0, TAU); g.stroke(); }
    g.lineWidth = 4;
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * TAU;
      g.save(); g.translate(512 + Math.cos(a) * 470, 512 + Math.sin(a) * 470); g.rotate(a + PI / 2);
      g.beginPath();
      const t = k % 4;
      if (t === 0) { g.moveTo(-10, -12); g.lineTo(0, 12); g.lineTo(10, -12); }
      else if (t === 1) { g.arc(0, 0, 10, 0.4, TAU - 0.4); }
      else if (t === 2) { g.moveTo(-10, 0); g.lineTo(10, 0); g.moveTo(0, -12); g.lineTo(0, 12); }
      else { g.moveTo(-8, -12); g.lineTo(8, -12); g.lineTo(-8, 12); g.lineTo(8, 12); }
      g.stroke(); g.restore();
    }
    // three hearts at the cardinal points, the seal the founders laid
    g.fillStyle = 'rgba(255,215,140,0.9)';
    for (let k = 0; k < 3; k++) {
      const a = PI / 2 + (k / 3) * TAU;
      const cx = 512 + Math.cos(a) * 470, cy = 512 + Math.sin(a) * 470;
      g.beginPath(); g.moveTo(cx, cy + 22); g.bezierCurveTo(cx - 30, cy, cx - 16, cy - 26, cx, cy - 10); g.bezierCurveTo(cx + 16, cy - 26, cx + 30, cy, cx, cy + 22); g.fill();
    }
  });
  const runeMat = new THREE.MeshBasicMaterial({ map: runeTex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffd8a0 });
  const C = { x: S.x, z: S.z - 1.5 };
  const runes = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), runeMat);
  runes.rotation.x = -PI / 2; runes.position.set(C.x, 0.03, C.z);
  b.add(dyn(runes));
  meta.runes = runeMat;
  // the three Ward-Pillars: tall crystals of welkynd light in iron cradles round the dais
  meta.pillars = [];
  // (the marks run north to south: the one behind the throne first, then the two flanking the dais)
  (meta.marks['+'] || []).forEach((p, i) => {
    const n = i + 1;
    const behind = p.z < S.z - 3;
    b.cyl(0.9, 1.1, behind ? 1.3 : 0.5, 'whitestone@d0d4dc', p.x, behind ? 0.65 : 0.25, p.z, { seg: 10 });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), new THREE.MeshStandardMaterial({ color: 0x9ac8ff, emissive: 0x4a90ff, emissiveIntensity: 2.4, roughness: 0.15, transparent: true, opacity: 0.88 }));
    crystal.scale.set(0.7, 3.0, 0.7);
    crystal.position.set(p.x, behind ? 5.2 : 3.4, p.z);
    if (behind) crystal.scale.set(0.85, 3.6, 0.85);
    crystal.userData.spin = true;
    b.add(dyn(crystal));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + PI / 4;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6.2, 5), M('iron'));
      bar.position.set(p.x + Math.cos(a) * 0.75, behind ? 4.6 : 3.3, p.z + Math.sin(a) * 0.75);
      if (behind) bar.scale.y = 1.3;
      b.add(bar);
    }
    b.col.addCircle(p.x, p.z, 1.0, 0, 6.5);
    const light = b.light(0x7ab0ff, 26, 16, p.x, behind ? 5.4 : 3.4, p.z + (behind ? 1.5 : 0), { flicker: false });
    // the one behind the throne is reached round the side of it, on the top of the dais
    const ip = behind ? new THREE.Vector3(p.x + 2.2, 1.9, p.z + 0.8) : new THREE.Vector3(p.x, 1.4, p.z + 1.3);
    const it = b.interact({ kind: 'shieldpillar', id: `pillar_${n}`, n, name: 'Ward-Pillar', pos: ip, radius: 2.2, verb: 'Shatter' });
    meta.pillars.push({ n, x: p.x, z: p.z, it, mesh: crystal, light });
  });
  // frozen pillars round the hall glitter with frost; icicles hang from the dark ceiling
  for (const c of meta.marks['^'] || []) {
    const w = onWall(meta, c, 0.03);
    if (w) frostDecal(b, w.x, 3.0 + r() * 2, w.z, 3.5, 0, w.rotY);
  }
  for (let k = 0; k < 12; k++) frostDecal(b, S.x + (r() - 0.5) * 30, 0.02 + k * 0.001, S.z + 4 + (r() - 0.5) * 24, 3 + r() * 4);
  for (let k = 0; k < 8; k++) {
    const x = S.x + (r() - 0.5) * 34, z = S.z + 6 + (r() - 0.5) * 26;
    icicles(b, Hh - 0.05, x - 2, z, x + 2, z + (r() - 0.5), 9, 2.2, k + 30);
  }
  // the processional aisle: cold-fire braziers either side, every other one lit bright
  (meta.marks['&'] || []).forEach((c, i) => coldBrazier(b, c.x, 0, c.z, true, 1.4, i % 2 === 0));
  // dark banners of the old chapter, hung from the gallery of the hall
  for (const c of meta.marks['%'] || []) {
    const w = onWall(meta, c);
    if (w) banner(b, w.x - w.d[0] * 0.05, Hh - 1.5, w.z - w.d[1] * 0.05, w.rotY, 1.6, 5.5, 'founders', true);
  }
  // the crack of daylight that opens when he falls: a slit in the east wall and a shaft of warm light
  const Dl = first(meta, '|');
  if (Dl) {
    const w = onWall(meta, Dl, 0.05) || { x: Dl.x, z: Dl.z, rotY: 0, d: [1, 0] };
    const grp = new THREE.Group();
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 1.2), fog: false }));
    slit.position.set(w.x, 2.9, w.z);
    slit.rotation.y = w.rotY;
    grp.add(slit);
    const shaftTex = canvasTex(32, 128, (g) => { const grd = g.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, 'rgba(255,240,200,0.9)'); grd.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = grd; g.fillRect(0, 0, 32, 128); });
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 9), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    shaft.position.set(w.x - w.d[0] * 4.2, 2.6, w.z - w.d[1] * 4.2);
    shaft.rotation.set(-PI / 2 + 0.3, w.rotY, 0, 'YXZ');
    grp.add(shaft);
    grp.visible = false;
    b.add(dyn(grp));
    const light = b.light(0xffe0b0, 30, 18, w.x - w.d[0] * 2, 2.5, w.z - w.d[1] * 2, { flicker: false });
    light.on = false;
    grp.userData.light = light;
    meta.daylight = grp;
    meta.daylightLight = light;
    b.interact({ kind: 'door', cell: 'world', name: 'A Crack of Daylight', verb: 'Climb out', requireFlag: 'ashgraveDead', at: HK.gateReturn, pos: new THREE.Vector3(w.x - w.d[0] * 0.9, 1.4, w.z - w.d[1] * 0.9), radius: 1.6 });
  }
}

// ------------------------------------------------------------------ the founders' hiding places in older ruins
/** The Rime Spire: a flagstone beside the frost cage, carved with Hrolfa Stonevoice's rune. */
function rimeHeartstone(b, meta) {
  if (!meta.cage) return;
  const x = meta.cage.x + 2.3, z = meta.cage.z + 0.4;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 1.3), M('whitestone@c8d4e2'));
  slab.position.set(x, 0.06, z);
  slab.receiveShadow = true;
  b.add(slab);
  const rune = canvasTex(128, 128, (g) => {
    g.strokeStyle = 'rgba(200,225,255,1)'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(64, 14); g.lineTo(64, 114); g.moveTo(64, 40); g.lineTo(28, 76); g.moveTo(64, 40); g.lineTo(100, 76); g.moveTo(40, 100); g.lineTo(88, 100); g.stroke();
    g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.stroke();
  });
  const rm = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: rune, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x8ab8ff }));
  rm.rotation.x = -PI / 2; rm.position.set(x, 0.125, z);
  b.add(dyn(rm));
  meta.heartStone = { x, z, slab, rune: rm };
  b.interact({ kind: 'heartstone', id: 'rime_heartstone', name: 'A Rune-Carved Flagstone', verb: 'Lift', requireFlag: 'mgHearts', pos: new THREE.Vector3(x, 0.5, z), radius: 1.3 });
}
/** Vilverin: a niche in the east wall of the sealed chamber, marked with Thalindor's oak leaf. */
function vilverinNiche(b, meta) {
  const [x0, z0] = meta.at(26, 13);
  const T = meta.T;
  const wx = x0 + T / 2 - 0.02, z = z0;
  // the frame of the niche, a recess of dark stone, and the oak-leaf glyph over it
  for (const s of [-1, 1]) b.box(0.3, 2.4, 0.35, 'ayleid', wx - 0.15, 1.2, z + s * 0.75, 0, { collide: false });
  b.box(0.3, 0.35, 1.8, 'ayleid', wx - 0.15, 2.5, z, 0, { collide: false });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.1), new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 1 }));
  back.position.set(wx - 0.01, 1.1, z); back.rotation.y = -PI / 2;
  b.add(back);
  const leaf = canvasTex(128, 128, (g) => {
    g.strokeStyle = 'rgba(170,255,180,1)'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(64, 116); g.lineTo(64, 20); g.stroke();
    g.beginPath(); g.moveTo(64, 20);
    for (const [dx, dy] of [[-30, 36], [-14, 50], [-34, 70], [-12, 84], [-26, 104]]) g.lineTo(64 + dx, dy);
    g.lineTo(64, 116);
    for (const [dx, dy] of [[26, 104], [12, 84], [34, 70], [14, 50], [30, 36]].reverse()) g.lineTo(64 + dx, dy);
    g.closePath(); g.stroke();
  });
  const glyph = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: leaf, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x9affb0 }));
  glyph.position.set(wx - 0.32, 2.5, z); glyph.rotation.y = -PI / 2;
  b.add(dyn(glyph));
  // the stone that seals it (game.js slides it aside); it stays visible whatever the quest stage
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.05, 1.25), M('ayleid'));
  slab.position.set(wx - 0.14, 1.03, z);
  slab.castShadow = true;
  b.add(dyn(slab));
  meta.heartNiche = { x: wx - 0.6, z, slab, glyph };
  b.interact({ kind: 'heartniche', id: 'vilverin_niche', name: 'A Glyph-Carved Niche', verb: 'Examine', requireFlag: 'mgHearts', slab, glyph, pos: new THREE.Vector3(wx - 0.9, 1.4, z), radius: 1.5 });
}
