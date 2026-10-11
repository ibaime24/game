// Unique armour sets, sculpted piece by piece and pinned to the character's skeleton so they move with it:
//  - Starwarden Plate: midnight-blue enamel and gold, a crescent-moon crest, a glowing visor and a cape of stars.
//  - Emberforge Armour: blackened steel split by molten seams, a horned helm with burning eyes, embers rising.
//  - Frostbloom Raiment: pale silver scale under ice crystals that grow from the shoulders, a crown of ice, falling snow.
// Each piece belongs to an equipment slot (head, chest, hands, legs, feet); wear several for the full silhouette.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const r = Math.random;

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------ textures
let TEX = null;
function textures() {
  if (TEX) return TEX;
  TEX = {
    // a cape cut from the night sky: deep indigo, a Milky Way smear, stars and four-point glints, a gold hem
    starCloth: canvasTex(256, 512, (g, W, H) => {
      const grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#1a1850'); grd.addColorStop(1, '#0c0a2a');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.18; g.fillStyle = '#8a7ad8';
      for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(W * 0.3 + i * 4 + r() * 30, i * 13, 40, 18, 0.9, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,${200 + r() * 55},${0.4 + r() * 0.6})`; g.fillRect(r() * W, r() * H, 1.5, 1.5); }
      g.strokeStyle = '#fff6d8'; g.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const x = r() * W, y = r() * H * 0.9, s = 4 + r() * 7;
        g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
      }
      g.fillStyle = '#c8a040'; g.fillRect(0, H - 22, W, 10);
      g.fillStyle = '#e8c868';
      for (let x = 6; x < W; x += 22) { g.beginPath(); g.moveTo(x, H - 12); g.lineTo(x + 6, H - 2); g.lineTo(x + 12, H - 12); g.fill(); }
    }),
    // glowing runes etched into enamel (emissive mask)
    starRunes: canvasTex(256, 256, (g, W, H) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.lineCap = 'round';
      for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
        const x = 20 + i * 40, y = 50 + row * 80;
        g.beginPath();
        const k = (i + row) % 4;
        if (k === 0) { g.arc(x, y, 8, 0.4, TAU - 0.4); }
        else if (k === 1) { g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.moveTo(x, y - 8); g.lineTo(x, y + 8); }
        else if (k === 2) { g.moveTo(x - 7, y + 7); g.lineTo(x, y - 8); g.lineTo(x + 7, y + 7); }
        else { g.arc(x, y, 6, 0, TAU); g.moveTo(x, y - 12); g.lineTo(x, y - 7); }
        g.stroke();
      }
    }, false),
    // blackened steel with molten cracks: a dark base map and a matching emissive map
    emberBase: canvasTex(256, 256, (g, W, H) => {
      g.fillStyle = '#2a2420'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 1800; i++) { const v = 25 + r() * 30; g.fillStyle = `rgb(${v},${v * 0.85},${v * 0.75})`; g.fillRect(r() * W, r() * H, 2, 2); }
      emberCracks(g, W, H, '#100c0a', 5);
    }),
    emberGlow: canvasTex(256, 256, (g, W, H) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.shadowColor = '#ff6a10'; g.shadowBlur = 8;
      emberCracks(g, W, H, '#ffb040', 2.2);
    }),
    // overlapping silver scales, and a frost-rune emissive mask
    scale: canvasTex(128, 128, (g, W, H) => {
      g.fillStyle = '#c8d4e0'; g.fillRect(0, 0, W, H);
      for (let row = 0; row < 9; row++) for (let i = -1; i < 9; i++) {
        const x = i * 16 + (row % 2) * 8, y = row * 14;
        const grd = g.createRadialGradient(x + 8, y + 2, 1, x + 8, y + 4, 12);
        grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.7, '#d8e4f0'); grd.addColorStop(1, '#8a9ab0');
        g.fillStyle = grd; g.beginPath(); g.arc(x + 8, y + 2, 9, 0, Math.PI); g.fill();
      }
    }),
    frostRunes: canvasTex(256, 256, (g, W, H) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.shadowColor = '#bfe8ff'; g.shadowBlur = 6;
      for (let i = 0; i < 7; i++) {
        const x = 20 + r() * (W - 40), y = 20 + r() * (H - 40), s = 10 + r() * 8;
        g.save(); g.translate(x, y);
        for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s); g.moveTo(0, -s * 0.55); g.lineTo(s * 0.3, -s * 0.8); g.moveTo(0, -s * 0.55); g.lineTo(-s * 0.3, -s * 0.8); g.stroke(); }
        g.restore();
      }
    }, false),
    fur: canvasTex(128, 64, (g, W, H) => {
      g.fillStyle = '#e8ecf0'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 900; i++) { const v = 200 + r() * 55; g.strokeStyle = `rgba(${v},${v},${v + 5},0.8)`; g.lineWidth = 1; const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + 4 + r() * 5); g.stroke(); }
    }),
  };
  return TEX;
}

function emberCracks(g, W, H, color, width) {
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  const seed = [0.13, 0.71, 0.42, 0.88, 0.27, 0.59, 0.05, 0.94, 0.36, 0.66];
  for (let c = 0; c < 10; c++) {
    let x = seed[c] * W, y = seed[(c + 3) % 10] * H, a = seed[(c + 5) % 10] * TAU;
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 14; s++) {
      a += (Math.sin(c * 7 + s * 3.1) * 0.9);
      x += Math.cos(a) * 12; y += Math.sin(a) * 12;
      g.lineTo(((x % W) + W) % W, ((y % H) + H) % H);
      if (s % 5 === 4) { g.stroke(); g.beginPath(); g.moveTo(((x % W) + W) % W, ((y % H) + H) % H); }
    }
    g.stroke();
  }
}

// ------------------------------------------------------------------ materials
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const T = textures();
  const std = (o) => new THREE.MeshStandardMaterial(o);
  MATS = {
    starwarden: {
      plate: std({ color: 0x1e2c66, metalness: 0.85, roughness: 0.28, emissive: 0x6a9aff, emissiveMap: T.starRunes, emissiveIntensity: 0.9 }),
      plain: std({ color: 0x1e2c66, metalness: 0.85, roughness: 0.3 }),
      trim: std({ color: 0xe0b852, metalness: 1, roughness: 0.22 }),
      glow: std({ color: 0xc8e0ff, emissive: 0x8ab8ff, emissiveIntensity: 2.6 }),
      cloth: std({ map: T.starCloth, roughness: 0.85, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: T.starCloth, emissiveIntensity: 0.25 }),
      dark: std({ color: 0x0a0c18, roughness: 0.6, metalness: 0.4 }),
    },
    emberforge: {
      plate: std({ map: T.emberBase, metalness: 0.75, roughness: 0.42, emissive: 0xff5a10, emissiveMap: T.emberGlow, emissiveIntensity: 1.6 }),
      plain: std({ color: 0x241e1a, metalness: 0.75, roughness: 0.45 }),
      trim: std({ color: 0x6a4a2a, metalness: 0.9, roughness: 0.35 }),
      glow: std({ color: 0xffd090, emissive: 0xff6a10, emissiveIntensity: 3.2 }),
      bone: std({ color: 0xd8c8a8, roughness: 0.55 }),
      cloth: std({ color: 0x4a1410, roughness: 0.9, side: THREE.DoubleSide }),
      dark: std({ color: 0x0a0806, roughness: 0.7 }),
    },
    frostbloom: {
      plate: std({ map: T.scale, color: 0xeef4fa, metalness: 0.7, roughness: 0.25, emissive: 0x7ac8ff, emissiveMap: T.frostRunes, emissiveIntensity: 0.9 }),
      plain: std({ color: 0xdfe8f2, metalness: 0.75, roughness: 0.22 }),
      trim: std({ color: 0x9ac8f0, metalness: 0.9, roughness: 0.2 }),
      glow: std({ color: 0xe8f8ff, emissive: 0x9ad8ff, emissiveIntensity: 2.2 }),
      ice: new THREE.MeshPhysicalMaterial({ color: 0xcfeeff, metalness: 0, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.78, emissive: 0x5aa8f0, emissiveIntensity: 0.55, clearcoat: 1, forceSinglePass: true }),
      fur: std({ map: T.fur, roughness: 1 }),
      cloth: std({ color: 0xdfe8f4, roughness: 0.9, side: THREE.DoubleSide }),
    },
  };
  return MATS;
}

// ------------------------------------------------------------------ geometry helpers
const M = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
/** A curved plate: a slice of an open, slightly tapered cylinder (theta 0 faces +Z). */
function shell(rTop, rBot, h, from, len, seg = 20) {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg, 3, true, from, len);
}
/** A dome (top part of a sphere). */
function dome(rad, phi = 0.55, seg = 18) {
  return new THREE.SphereGeometry(rad, seg, 10, 0, TAU, 0, Math.PI * phi);
}
/** A tapering horn made of stacked cones along a curve. */
function horn(curve, r0, n = 7, mat) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const a = curve.getPoint(t0), b = curve.getPoint(t1);
    const len = a.distanceTo(b);
    const c = M(new THREE.CylinderGeometry(r0 * (1 - t1) + 0.003, r0 * (1 - t0) + 0.003, len * 1.08, 8), mat);
    c.position.copy(a).lerp(b, 0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(c);
  }
  return g;
}
/** An ice crystal: a long hexagonal shard with a point. */
function crystal(len, rad, mat) {
  const g = new THREE.Group();
  const body = M(new THREE.CylinderGeometry(rad, rad * 0.9, len * 0.75, 6), mat);
  body.position.y = len * 0.375;
  const tip = M(new THREE.ConeGeometry(rad, len * 0.25, 6), mat);
  tip.position.y = len * 0.875;
  g.add(body, tip);
  return g;
}
/** A gold-trim ring around part of a circle, lying flat (in XZ). */
function trimArc(rad, from, len, tube, mat) {
  const t = M(new THREE.TorusGeometry(rad, tube, 5, 24, len), mat);
  t.rotation.x = Math.PI / 2;
  t.rotation.z = -from - len + Math.PI / 2;
  return t;
}
/** A four-point star (flat), for crests and studs. */
function starShape(R, rIn) {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 2, rad = i % 2 ? rIn : R;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 });
}

// ------------------------------------------------------------------ the pieces
// Each builder returns { group, bone } pairs in BIND-POSE WORLD space; the caller pins them to bones.
// J: joint world positions, side vectors etc. (see dressArmor)

function helmet(set, J, Ms) {
  const g = new THREE.Group();
  const hr = 0.135;
  if (set === 'starwarden') {
    const d = M(dome(hr, 0.62), Ms.plate); d.scale.set(1.0, 1.08, 1.12); g.add(d);
    // face plate with a glowing T visor
    const face = M(shell(hr * 1.02, hr * 0.92, 0.16, -1.1, 2.2, 18), Ms.plain); face.position.y = -0.045; face.scale.z = 1.1; g.add(face);
    const vis = M(new THREE.BoxGeometry(0.15, 0.016, 0.02), Ms.glow); vis.position.set(0, 0.0, hr * 1.13); g.add(vis);
    const vis2 = M(new THREE.BoxGeometry(0.018, 0.08, 0.02), Ms.glow); vis2.position.set(0, -0.04, hr * 1.12); g.add(vis2);
    // gold rim and a ridge
    const rim = M(new THREE.TorusGeometry(hr * 1.02, 0.008, 5, 28), Ms.trim); rim.rotation.x = Math.PI / 2; rim.position.y = 0.012; rim.scale.set(1, 1.12, 1); g.add(rim);
    const ridge = M(new THREE.TorusGeometry(hr * 1.05, 0.012, 5, 20, Math.PI), Ms.trim); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1.1, 1.08, 1); g.add(ridge);
    // crest: a crescent moon cradling a star, high above
    const moon = M(new THREE.TorusGeometry(0.075, 0.014, 6, 20, Math.PI * 1.3), Ms.trim);
    moon.position.set(0, hr * 1.3, -0.01); moon.rotation.set(0, Math.PI / 2, -Math.PI * 0.65 + Math.PI / 2); g.add(moon);
    const star = M(starShape(0.045, 0.012), Ms.glow); star.position.set(0, hr * 1.37, -0.005); star.rotation.y = Math.PI / 2; g.add(star);
    g.userData.glint = star;
    // cheek guards
    for (const s of [-1, 1]) { const ch = M(new THREE.BoxGeometry(0.012, 0.09, 0.08), Ms.trim); ch.position.set(s * hr * 0.98, -0.06, 0.04); g.add(ch); }
  } else if (set === 'emberforge') {
    const d = M(dome(hr * 1.02, 0.66), Ms.plate); d.scale.set(1.02, 1.0, 1.12); g.add(d);
    const face = M(shell(hr * 1.04, hr * 0.86, 0.17, -1.2, 2.4, 18), Ms.plate); face.position.y = -0.05; face.scale.z = 1.12; g.add(face);
    // burning eye slits, angled into a scowl
    for (const s of [-1, 1]) { const e = M(new THREE.BoxGeometry(0.055, 0.014, 0.02), Ms.glow); e.position.set(s * 0.035, 0.0, hr * 1.12); e.rotation.z = s * 0.25; g.add(e); }
    const mouth = M(new THREE.BoxGeometry(0.01, 0.06, 0.02), Ms.dark); mouth.position.set(0, -0.06, hr * 1.1); g.add(mouth);
    // a crown of short spikes along the ridge
    for (let i = 0; i < 5; i++) { const sp = M(new THREE.ConeGeometry(0.014, 0.07, 5), Ms.trim); const a = -0.9 + i * 0.45; sp.position.set(0, Math.cos(a) * hr * 1.0 + 0.02, Math.sin(a) * hr * 1.0); sp.rotation.x = a; g.add(sp); }
    // great ram horns sweeping back and up
    for (const s of [-1, 1]) {
      const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(s * hr * 0.85, 0.03, 0.0), new THREE.Vector3(s * 0.2, 0.06, -0.04), new THREE.Vector3(s * 0.25, 0.16, -0.1), new THREE.Vector3(s * 0.2, 0.26, -0.07), new THREE.Vector3(s * 0.15, 0.3, 0.02)]);
      g.add(horn(cv, 0.04, 9, Ms.bone));
    }
  } else {
    // Frostbloom: an open-faced silver circlet rising into a crown of ice, with feathered wings at the temples
    const band = M(new THREE.TorusGeometry(hr * 1.0, 0.016, 6, 30), Ms.plain); band.rotation.x = Math.PI / 2; band.position.y = 0.035; band.scale.set(1, 1.12, 1); g.add(band);
    const gem = M(new THREE.OctahedronGeometry(0.022, 0), Ms.glow); gem.position.set(0, 0.04, hr * 1.13); gem.scale.set(1, 1.4, 0.6); g.add(gem);
    g.userData.glint = gem;
    const cap = M(dome(hr * 0.98, 0.42), Ms.plate); cap.position.y = 0.035; cap.scale.set(1, 0.8, 1.1); g.add(cap);
    for (let i = 0; i < 7; i++) {
      const a = -0.75 + i * 0.25;
      const c = crystal(0.08 + (3 - Math.abs(i - 3)) * 0.035, 0.012, Ms.ice);
      c.position.set(Math.sin(a) * hr * 0.98, 0.05, Math.cos(a) * hr * 1.08);
      c.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
      g.add(c);
    }
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const f = M(new THREE.BoxGeometry(0.008, 0.02, 0.11 - k * 0.018), Ms.plain);
        f.position.set(s * hr * 1.02, 0.05 + k * 0.022, -0.03 - k * 0.012);
        f.rotation.set(0.5 + k * 0.12, 0, 0);
        g.add(f);
      }
    }
  }
  return g;
}

/** Breastplate + backplate + gorget + faulds (chest piece). */
function cuirass(set, J, Ms) {
  const parts = [];
  const sw = J.shoulderHalf;
  const top = Math.max(J.chest.y + 0.12, J.neck.y - 0.06), bot = J.pelvis.y + 0.02, h = top - bot;
  const cy = (top + bot) / 2;
  const body = new THREE.Group();
  body.position.set(J.chest.x, cy, J.chest.z);
  const plateMat = Ms.plate;
  const front = M(shell(sw * 1.02, sw * 0.86, h, -1.35, 2.7, 24), plateMat); front.scale.z = 0.92; body.add(front);
  const back = M(shell(sw * 1.0, sw * 0.84, h, Math.PI - 1.3, 2.6, 20), Ms.plain); back.scale.z = 0.85; body.add(back);
  // the pectoral swell and a centre ridge
  for (const s of [-1, 1]) { const p = M(new THREE.SphereGeometry(sw * 0.42, 14, 10, 0, TAU, 0, Math.PI / 2), plateMat); p.rotation.x = Math.PI / 2; p.scale.set(1.0, 0.28, 0.9); p.position.set(s * sw * 0.36, h * 0.2, sw * 0.86); body.add(p); }
  const ridge = M(new THREE.BoxGeometry(0.018, h * 0.8, 0.02), Ms.trim); ridge.position.set(0, -h * 0.05, sw * 0.92); body.add(ridge);
  // trim along top and bottom edges
  const tt = trimArc(sw * 1.03, -1.35, 2.7, 0.009, Ms.trim); tt.position.y = h / 2; tt.scale.y = 0.92; body.add(tt);
  const tb = trimArc(sw * 0.87, -1.35, 2.7, 0.009, Ms.trim); tb.position.y = -h / 2; tb.scale.y = 0.92; body.add(tb);
  // gorget around the neck
  const gor = M(new THREE.CylinderGeometry(0.07, 0.1, 0.07, 18, 1, true), Ms.plain); gor.position.set(0, h / 2 + 0.03, 0); body.add(gor);
  parts.push({ bone: 'spine_03', group: body });
  // faulds: a skirt of lames below the belt, with tassets on the hips
  const skirt = new THREE.Group();
  skirt.position.set(J.pelvis.x, J.pelvis.y - 0.02, J.pelvis.z);
  for (let k = 0; k < 2; k++) { const l = M(shell(sw * 0.86 + k * 0.012, sw * 0.9 + k * 0.016, 0.07, -1.6, 3.2, 20), Ms.plain); l.position.y = -k * 0.06; l.scale.z = 0.8; skirt.add(l); }
  for (const s of [-1, 1]) { const ta = M(new THREE.BoxGeometry(0.12, 0.17, 0.012), plateMat); ta.position.set(s * sw * 0.62, -0.15, sw * 0.42); ta.rotation.set(-0.1, s * 0.5, s * 0.08); skirt.add(ta); const tr = M(new THREE.BoxGeometry(0.124, 0.012, 0.016), Ms.trim); tr.position.copy(ta.position).add(new THREE.Vector3(0, -0.085, 0)); tr.rotation.copy(ta.rotation); skirt.add(tr); }
  parts.push({ bone: 'pelvis', group: skirt });

  // set signatures
  if (set === 'starwarden') {
    // a great star-cloak from the shoulders, and a sunburst-star on the breast
    const star = M(starShape(0.07, 0.018), Ms.glow); star.position.set(0, h * 0.2, sw * 0.96); body.add(star);
    body.userData.glint = star;
    const cape = buildCape(sw * 2.3, (top - J.knee.y) * 1.05, Ms.cloth);
    cape.position.set(J.chest.x, top - 0.02, J.chest.z - sw * 0.8);
    parts.push({ bone: 'spine_03', group: cape, cape: true });
  } else if (set === 'emberforge') {
    // a molten heart glowing through the breastplate, and a tattered war-cloak
    const heart = M(new THREE.SphereGeometry(0.038, 12, 10), Ms.glow); heart.position.set(0, h * 0.2, sw * 0.95); heart.scale.z = 0.5; body.add(heart);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const sp = M(new THREE.ConeGeometry(0.012, 0.05, 4), Ms.trim); sp.position.set(Math.cos(a) * 0.06, h * 0.2 + Math.sin(a) * 0.06, sw * 0.96); sp.rotation.set(Math.PI / 2, 0, a - Math.PI / 2); sp.rotation.z = a - Math.PI / 2; body.add(sp); }
    const cape = buildCape(sw * 2.1, (top - J.knee.y) * 0.95, Ms.cloth, true);
    cape.position.set(J.chest.x, top - 0.02, J.chest.z - sw * 0.8);
    parts.push({ bone: 'spine_03', group: cape, cape: true });
  } else {
    // a mantle of white fur over the shoulders, and a frost-jewel at the throat
    const mant = M(new THREE.TorusGeometry(0.15, 0.06, 8, 24), Ms.fur); mant.rotation.x = Math.PI / 2; mant.scale.set(1.15, 0.85, 1); mant.position.y = h / 2 + 0.02; body.add(mant);
    const jewel = M(new THREE.OctahedronGeometry(0.03, 0), Ms.glow); jewel.position.set(0, h / 2 - 0.03, sw * 0.97); jewel.scale.set(1, 1.5, 0.6); body.add(jewel);
    body.userData.glint = jewel;
    const cape = buildCape(sw * 2.0, (top - J.knee.y) * 1.0, Ms.cloth);
    cape.position.set(J.chest.x, top - 0.02, J.chest.z - sw * 0.8);
    parts.push({ bone: 'spine_03', group: cape, cape: true });
  }
  // pauldrons ride the upper arms
  for (const s of ['l', 'r']) parts.push({ bone: 'upperarm_' + s, group: pauldron(set, J, Ms, s) });
  return parts;
}

function buildCape(w, h, mat, tattered = false) {
  const geo = new THREE.PlaneGeometry(w, h, 8, 12);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const v = Math.min(1, Math.max(0, (h / 2 - y) / h)); // 0 at the shoulders, 1 at the hem
    p.setZ(i, -Math.pow(v, 1.4) * 0.12 - Math.cos((x / w) * Math.PI) * 0.06 * (1 - v * 0.5));
    p.setX(i, x * (0.75 + v * 0.35));
    if (tattered && v > 0.82) p.setY(i, y + Math.abs(Math.sin(x * 37)) * 0.09);
  }
  geo.translate(0, -h / 2, 0);
  geo.computeVertexNormals();
  const g = new THREE.Group();
  const m = M(geo, mat);
  g.add(m);
  g.userData.capeMesh = m;
  return g;
}

function pauldron(set, J, Ms, s) {
  const g = new THREE.Group();
  const sh = J['shoulder_' + s];
  const out = J['out_' + s]; // unit vector pointing away from the body along the arm
  g.position.copy(sh).addScaledVector(out, 0.02).add(new THREE.Vector3(0, 0.035, 0));
  const R = 0.12;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), out);
  if (set === 'starwarden') {
    for (let k = 0; k < 3; k++) {
      const d = M(dome(R - k * 0.012, 0.5), k ? Ms.plain : Ms.plate);
      d.scale.set(1.25, 0.75, 1.15);
      d.position.set(k * 0.035, -k * 0.045, 0);
      d.rotation.z = -0.35 - k * 0.12;
      g.add(d);
      const tr = M(new THREE.TorusGeometry(R - k * 0.012, 0.007, 5, 24), Ms.trim); tr.rotation.x = Math.PI / 2; tr.scale.set(1.25, 1.15, 1); tr.position.copy(d.position); tr.rotation.y = 0; tr.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -0.35 - k * 0.12); g.add(tr);
    }
    const stud = M(starShape(0.035, 0.01), Ms.glow); stud.position.set(0.02, 0.06, 0); stud.rotation.set(-Math.PI / 2, 0, 0); stud.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -0.4); g.add(stud);
  } else if (set === 'emberforge') {
    const d = M(dome(R * 1.08, 0.55), Ms.plate); d.scale.set(1.25, 0.85, 1.2); d.rotation.z = -0.3; g.add(d);
    const d2 = M(dome(R * 0.95, 0.5), Ms.plate); d2.scale.set(1.2, 0.7, 1.15); d2.position.set(0.04, -0.05, 0); d2.rotation.z = -0.5; g.add(d2);
    // three great spikes curving up and out
    for (let k = 0; k < 3; k++) {
      const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.02 + k * 0.04, 0.06, (k - 1) * 0.06), new THREE.Vector3(0.0 + k * 0.05, 0.14, (k - 1) * 0.08), new THREE.Vector3(0.03 + k * 0.06, 0.22 - k * 0.02, (k - 1) * 0.1)]);
      g.add(horn(cv, 0.022, 5, Ms.trim));
    }
  } else {
    const d = M(dome(R * 0.95, 0.5), Ms.plate); d.scale.set(1.2, 0.7, 1.15); d.rotation.z = -0.35; g.add(d);
    const fur = M(new THREE.TorusGeometry(R * 0.9, 0.03, 6, 20), Ms.fur); fur.rotation.x = Math.PI / 2; fur.scale.set(1.3, 1.2, 1); fur.position.y = -0.03; g.add(fur);
    // a cluster of ice crystals growing from the shoulder
    const lens = [0.2, 0.15, 0.13, 0.11, 0.09];
    lens.forEach((L, k) => {
      const c = crystal(L, 0.016 + L * 0.06, Ms.ice);
      const a = (k / lens.length) * TAU;
      c.position.set(0.02 + Math.cos(a) * 0.03, 0.04, Math.sin(a) * 0.04);
      c.rotation.set(Math.sin(a) * 0.5, 0, -0.5 - Math.cos(a) * 0.3);
      g.add(c);
    });
  }
  // orient: built with +X pointing outward along the arm
  const wrap = new THREE.Group();
  wrap.position.copy(g.position);
  g.position.set(0, 0, 0);
  wrap.quaternion.copy(q);
  wrap.add(g);
  return wrap;
}

function gauntlets(set, J, Ms) {
  const parts = [];
  for (const s of ['l', 'r']) {
    const el = J['elbow_' + s], wr = J['wrist_' + s];
    const dir = wr.clone().sub(el).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const cuff = new THREE.Group();
    cuff.position.copy(el).lerp(wr, 0.62);
    cuff.quaternion.copy(q);
    const c = M(new THREE.CylinderGeometry(0.058, 0.048, 0.16, 16, 1, true), Ms.plate); cuff.add(c);
    const ring = M(new THREE.TorusGeometry(0.058, 0.008, 5, 18), Ms.trim); ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; cuff.add(ring);
    const ring2 = M(new THREE.TorusGeometry(0.049, 0.007, 5, 18), Ms.trim); ring2.rotation.x = Math.PI / 2; ring2.position.y = -0.08; cuff.add(ring2);
    if (set === 'emberforge') for (let k = 0; k < 3; k++) { const sp = M(new THREE.ConeGeometry(0.012, 0.06, 4), Ms.trim); const a = k * 0.6 - 0.6; sp.position.set(Math.sin(a) * 0.06, 0.02 - k * 0.04, Math.cos(a) * 0.06); sp.rotation.set(Math.PI / 2 - 0.4, a, 0); cuff.add(sp); }
    if (set === 'frostbloom') { const cr = crystal(0.09, 0.012, Ms.ice); cr.position.set(0, 0.0, 0.055); cr.rotation.x = 1.25; cuff.add(cr); }
    if (set === 'starwarden') { const st = M(starShape(0.025, 0.008), Ms.glow); st.position.set(0, 0, 0.062); cuff.add(st); }
    cuff.traverse((o) => { o.userData.fpArm = true; });
    parts.push({ bone: 'lowerarm_' + s, group: cuff });
    // a plate over the back of the hand
    const hand = J['hand_' + s];
    const hp = new THREE.Group();
    hp.position.copy(wr).lerp(hand, 1.4);
    hp.quaternion.copy(q);
    const pl = M(new THREE.BoxGeometry(0.075, 0.08, 0.016), Ms.plain); pl.position.z = 0.025; hp.add(pl);
    hp.traverse((o) => { o.userData.fpArm = true; });
    parts.push({ bone: 'hand_' + s, group: hp });
  }
  return parts;
}

function greaves(set, J, Ms) {
  const parts = [];
  for (const s of ['l', 'r']) {
    const hip = J['hip_' + s], knee = J['knee_' + s];
    const dir = knee.clone().sub(hip).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    const thigh = new THREE.Group();
    thigh.position.copy(hip).lerp(knee, 0.5);
    thigh.quaternion.copy(q);
    const tp = M(shell(0.085, 0.075, hip.distanceTo(knee) * 0.8, -1.3, 2.6, 14), Ms.plate); tp.scale.z = 1.05; thigh.add(tp);
    parts.push({ bone: 'thigh_' + s, group: thigh });
    // the knee cop, with a fan
    const cop = new THREE.Group();
    cop.position.copy(knee).add(new THREE.Vector3(0, 0.0, 0.065));
    const k1 = M(new THREE.SphereGeometry(0.05, 12, 10), Ms.plain); k1.scale.z = 0.6; cop.add(k1);
    const fan = M(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 14, 1, false, -1.2, 2.4), Ms.trim); fan.rotation.x = Math.PI / 2; fan.position.z = -0.01; cop.add(fan);
    if (set === 'emberforge') { const sp = M(new THREE.ConeGeometry(0.018, 0.08, 5), Ms.trim); sp.rotation.x = Math.PI / 2; sp.position.z = 0.05; cop.add(sp); }
    if (set === 'starwarden') { const st = M(starShape(0.028, 0.008), Ms.glow); st.position.z = 0.03; cop.add(st); }
    if (set === 'frostbloom') { const cr = crystal(0.07, 0.01, Ms.ice); cr.rotation.x = 1.2; cr.position.z = 0.02; cop.add(cr); }
    parts.push({ bone: 'calf_' + s, group: cop });
  }
  return parts;
}

function boots(set, J, Ms) {
  const parts = [];
  for (const s of ['l', 'r']) {
    const knee = J['knee_' + s], ankle = J['ankle_' + s];
    const dir = ankle.clone().sub(knee).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    const shin = new THREE.Group();
    shin.position.copy(knee).lerp(ankle, 0.55);
    shin.quaternion.copy(q);
    const sp = M(shell(0.068, 0.058, knee.distanceTo(ankle) * 0.85, -1.4, 2.8, 14), Ms.plate); shin.add(sp);
    const ridge = M(new THREE.BoxGeometry(0.012, knee.distanceTo(ankle) * 0.8, 0.012), Ms.trim); ridge.position.z = 0.066; shin.add(ridge);
    parts.push({ bone: 'calf_' + s, group: shin });
    // the sabaton: overlapping lames over the instep
    const foot = new THREE.Group();
    foot.position.copy(J['foot_' + s]).add(new THREE.Vector3(0, 0.035, 0.06));
    for (let k = 0; k < 3; k++) { const l = M(new THREE.CylinderGeometry(0.05 - k * 0.004, 0.05 - k * 0.004, 0.05, 12, 1, true, -1.4, 2.8), k % 2 ? Ms.plain : Ms.plate); l.rotation.x = Math.PI / 2; l.position.set(0, -k * 0.008, k * 0.045); l.scale.set(1, 1, 0.7); foot.add(l); }
    parts.push({ bone: 'foot_' + s, group: foot });
  }
  return parts;
}

// ------------------------------------------------------------------ dressing and animation
const active = new Set();

/**
 * Dress a kit rig. slots: { head?: setId, chest?: setId, hands?: setId, legs?: setId, feet?: setId }.
 * B(name) -> bone; attach(bone, mesh, worldPos, worldQuat) pins a mesh in bind pose.
 */
export function dressArmor(rig, B, attach, slots) {
  if (!slots || !Object.values(slots).some(Boolean)) return;
  const wp = (n) => { const b = B(n); return b ? b.getWorldPosition(new THREE.Vector3()) : null; };
  const J = {
    head: wp('Head'), neck: wp('neck_01'), chest: wp('spine_03'), pelvis: wp('pelvis'),
  };
  for (const s of ['l', 'r']) {
    J['shoulder_' + s] = wp('upperarm_' + s); J['elbow_' + s] = wp('lowerarm_' + s); J['wrist_' + s] = wp('hand_' + s);
    J['hand_' + s] = wp('middle_01_' + s) || J['wrist_' + s];
    J['hip_' + s] = wp('thigh_' + s); J['knee_' + s] = wp('calf_' + s); J['ankle_' + s] = wp('foot_' + s); J['foot_' + s] = wp('ball_' + s) || J['ankle_' + s];
  }
  if (!J.head || !J.chest || !J.shoulder_l) return;
  J.shoulderHalf = Math.max(0.15, J.shoulder_l.distanceTo(J.shoulder_r) / 2 * 0.95);
  for (const s of ['l', 'r']) J['out_' + s] = J['elbow_' + s].clone().sub(J['shoulder_' + s]).setY(0).normalize();
  J.knee = J.knee_l.clone().lerp(J.knee_r, 0.5);
  const all = mats();
  const fx = { rig, sets: new Set(), capes: [], glints: [], emitters: [], t: r() * 10 };
  const pin = (boneName, group) => {
    const bone = B(boneName);
    if (!bone) return;
    const pos = group.position.clone(), quat = group.quaternion.clone();
    group.position.set(0, 0, 0); group.quaternion.identity();
    attach(bone, group, pos, quat);
    group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    if (group.userData.glint) fx.glints.push(group.userData.glint);
    group.traverse((o) => { if (o.userData.glint) fx.glints.push(o.userData.glint); });
  };
  for (const [slot, set] of Object.entries(slots)) {
    if (!set || !all[set]) continue;
    const Ms = all[set];
    fx.sets.add(set);
    if (slot === 'head') {
      const h = helmet(set, J, Ms);
      h.position.copy(J.head).add(new THREE.Vector3(0, 0.1, -0.005));
      pin('Head', h);
      fx.emitters.push({ group: h, set, y: 0.12 });
    } else if (slot === 'chest') {
      for (const p of cuirass(set, J, Ms)) {
        pin(p.bone, p.group);
        if (p.cape) fx.capes.push(p.group);
        else if (p.bone === 'spine_03') fx.emitters.push({ group: p.group, set, y: 0.05 });
      }
    } else if (slot === 'hands') for (const p of gauntlets(set, J, Ms)) pin(p.bone, p.group);
    else if (slot === 'legs') for (const p of greaves(set, J, Ms)) pin(p.bone, p.group);
    else if (slot === 'feet') for (const p of boots(set, J, Ms)) pin(p.bone, p.group);
  }
  rig.armorFx = fx;
  active.add(fx);
}

const _v = new THREE.Vector3(), _c = new THREE.Color();
const SET_FX = {
  starwarden: { color: [0.75, 0.85, 1.0], shape: 'star', rate: 2.5, vy: 0.25, size: 0.22, life: 1.4 },
  emberforge: { color: [1.0, 0.55, 0.15], shape: 'pixel', rate: 9, vy: 1.1, size: 0.07, life: 1.2 },
  frostbloom: { color: [0.85, 0.95, 1.0], shape: 'flake', rate: 4, vy: -0.25, size: 0.16, life: 1.8 },
};

function onScene(o) { while (o.parent) o = o.parent; return o.isScene; }

/** Animate every dressed character: capes stir, glints pulse, and each set breathes its element into the air. */
export function updateArmorFx(t, dt, particles) {
  for (const fx of active) {
    const root = fx.rig.root;
    if (!onScene(root)) { if (!root.parent) active.delete(fx); continue; }
    if (!root.visible) continue;
    fx.t += dt;
    // a cape trails a little behind movement and stirs in the wind
    const moved = fx.last ? root.getWorldPosition(_v).distanceTo(fx.last) / Math.max(dt, 1e-3) : 0;
    fx.last = (fx.last || new THREE.Vector3()).copy(root.getWorldPosition(_v));
    fx.speed = (fx.speed || 0) + (Math.min(6, moved) - (fx.speed || 0)) * Math.min(1, dt * 4);
    for (const c of fx.capes) c.rotation.x = -0.06 - fx.speed * 0.06 - Math.sin(fx.t * 1.7) * 0.03 - Math.sin(fx.t * 3.1) * 0.015;
    for (const g of fx.glints) g.scale.setScalar(1 + Math.sin(fx.t * 3 + g.id) * 0.12);
    if (!particles || fx.rig.noFx) continue;
    for (const em of fx.emitters) {
      const S = SET_FX[em.set];
      if (r() > dt * S.rate) continue;
      em.group.localToWorld(_v.set((r() - 0.5) * 0.3, em.y + (r() - 0.5) * 0.2, (r() - 0.5) * 0.25));
      _c.setRGB(...S.color);
      particles.emit({ x: _v.x, y: _v.y, z: _v.z, vx: (r() - 0.5) * 0.3, vy: S.vy * (0.6 + r() * 0.8), vz: (r() - 0.5) * 0.3, drag: 0.6, life: S.life * (0.6 + r() * 0.6), size: S.size * (0.7 + r() * 0.6), color: _c, shape: S.shape });
    }
  }
}

/** The armour set of an equipped item, if any. */
export const ARMOR_SETS = ['starwarden', 'emberforge', 'frostbloom'];
