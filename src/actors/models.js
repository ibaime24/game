// Procedural low-poly character & creature models with code-driven animation.
import * as THREE from 'three';
import { buildHareMesh } from '../world/hare.js';
import { buildUniqueBlade } from './uniqueBlades.js';
import { animateKit } from './kitRig.js';
import { buildSkinnedHumanoid, buildSkinnedQuadruped } from './humanoid.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.75, metalness: opts.metal ?? 0, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, depthWrite: !opts.opacity, flatShading: !!opts.flat }));
  }
  return matCache.get(key);
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = false;
  return m;
}
const cap = (r, l, seg = 6) => new THREE.CapsuleGeometry(r, l, 3, seg);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const sph = (r, ws = 10, hs = 8) => new THREE.SphereGeometry(r, ws, hs);

// ---------------------------------------------------------------- weapons
export function buildWeaponMesh(look) {
  if (look?.design) return buildUniqueBlade(look);
  const g = new THREE.Group();
  if (!look) return g;
  const metalOpts = { rough: 0.35, metal: 0.8, emissive: look.glow || 0, ei: look.glow ? 0.6 : 0 };
  const blade = mat(look.color, metalOpts);
  const hilt = mat(look.hilt || 0x4a3020, { rough: 0.8 });
  const L = look.len;
  switch (look.kind) {
    case 'sword':
    case 'dagger':
    case 'katana': {
      const w = look.kind === 'dagger' ? 0.022 : look.kind === 'katana' ? 0.016 : 0.026;
      const curve = look.kind === 'katana' ? 0.04 : 0;
      // tapered blade profile with a point; extruded and bevelled so the edges catch the light
      const sh = new THREE.Shape();
      sh.moveTo(-w, 0);
      sh.lineTo(-w * 0.82 + curve, L * 0.82);
      sh.lineTo(curve * 1.3, L + 0.05);
      sh.lineTo(w * 0.82 + curve, L * 0.82);
      sh.lineTo(w, 0);
      sh.closePath();
      const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.004, bevelSize: w * 0.35, bevelSegments: 2, curveSegments: 1 });
      bg.translate(0, 0.11, -0.002);
      g.add(mesh(bg, blade));
      // fuller groove line
      const fuller = mesh(box(0.006, L * 0.62, 0.012), mat(0x50545a, { metal: 0.8, rough: 0.5 }), curve * 0.4, 0.11 + L * 0.34, 0);
      if (look.kind !== 'katana') g.add(fuller);
      // cross-guard with curled quillons (or a round tsuba)
      if (look.kind === 'katana') {
        const ts = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 14), mat(0x2a2a2a, { metal: 0.7, rough: 0.4 }), 0, 0.1, 0);
        g.add(ts);
      } else {
        const gw = look.kind === 'dagger' ? 0.13 : 0.2;
        g.add(mesh(box(gw, 0.026, 0.035), blade, 0, 0.1, 0));
        for (const sx of [-1, 1]) g.add(mesh(sph(0.018, 8, 6), blade, sx * gw / 2, 0.1, 0));
      }
      const grip = mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.18, 10), mat(look.hilt || 0x4a3020, { rough: 0.85 }), 0, 0, 0);
      g.add(grip);
      for (let k = 0; k < 5; k++) g.add(mesh(new THREE.TorusGeometry(0.019, 0.003, 4, 10), mat(0x2a1a10), 0, -0.07 + k * 0.035, 0)).children;
      g.children.slice(-5).forEach((ring) => { ring.rotation.x = Math.PI / 2; });
      g.add(mesh(sph(0.028, 10, 8), blade, 0, -0.105, 0));
      break;
    }
    case 'mace': {
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, L, 6), hilt, 0, L / 2 - 0.12, 0));
      const head = mesh(new THREE.DodecahedronGeometry(0.09, 0), blade, 0, L - 0.08, 0);
      g.add(head);
      for (let i = 0; i < 4; i++) {
        const f = mesh(box(0.02, 0.16, 0.08), blade, 0, L - 0.08, 0);
        f.rotation.y = (i * Math.PI) / 4;
        f.position.x = Math.cos(i * Math.PI / 2) * 0.06;
        f.position.z = Math.sin(i * Math.PI / 2) * 0.06;
        g.add(f);
      }
      break;
    }
    case 'axe': {
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, L, 6), hilt, 0, L / 2 - 0.12, 0));
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.04); shape.lineTo(0.2, -0.12); shape.quadraticCurveTo(0.26, 0, 0.2, 0.12); shape.lineTo(0, 0.05);
      const ag = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false });
      ag.translate(0.0, 0, -0.006);
      g.add(mesh(ag, blade, 0.02, L - 0.2, 0));
      break;
    }
    case 'bow': {
      const arc = new THREE.TorusGeometry(L / 2, 0.022, 5, 16, Math.PI * 0.7);
      arc.rotateZ(-Math.PI * 0.35); // arc centred on +x: limbs up/down, belly toward +x
      const a = mesh(arc, mat(look.color, { rough: 0.6, metal: look.color === 0xc0a040 ? 0.6 : 0 }), -L / 2, 0, 0);
      g.add(a);
      const chord = Math.sin(Math.PI * 0.35) * L;
      const sx = -L / 2 + Math.cos(Math.PI * 0.35) * L / 2;
      const string = mesh(new THREE.CylinderGeometry(0.004, 0.004, chord, 3), mat(0xddddcc), sx, 0, 0);
      string.name = 'string';
      string.userData.baseX = sx;
      g.add(string);
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6), hilt, 0.0, 0, 0));
      break;
    }
  }
  return mergeByMaterial(g);
}

/** Collapse a hand-built prop into one mesh per material (named parts stay separate for animation). */
export function mergeByMaterial(g) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const buckets = new Map();
  const keep = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name) { keep.push(o); return; }
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(o);
  });
  const out = new THREE.Group();
  out.position.copy(g.position); out.quaternion.copy(g.quaternion); out.scale.copy(g.scale);
  for (const [material, list] of buckets) {
    const geos = list.map((o) => {
      let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.clearGroups();
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      return geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    });
    const merged = geos.length > 1 ? mergeGeometries(geos) : geos[0];
    if (!merged) { for (const o of list) keep.push(o); continue; }
    const m = new THREE.Mesh(merged, material);
    m.castShadow = true;
    out.add(m);
  }
  for (const o of keep) {
    const m = o.clone();
    new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld).decompose(m.position, m.quaternion, m.scale);
    out.add(m);
  }
  out.userData = g.userData;
  return out;
}

/** Orient a bow held in a hanging humanoid hand so it is upright when the arm is raised forward. */
export function attachBow(hand, bowMesh) {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0));
  bowMesh.quaternion.setFromRotationMatrix(m);
  hand.add(bowMesh);
}

export function buildShieldMesh(color) {
  const g = new THREE.Group();
  const s = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), mat(color, { rough: 0.5, metal: 0.5 }));
  s.rotation.x = Math.PI / 2;
  g.add(s);
  const boss = mesh(sph(0.07, 8, 6), mat(0x999999, { rough: 0.3, metal: 0.9 }), 0, 0, -0.03);
  g.add(boss);
  const rim = mesh(new THREE.TorusGeometry(0.3, 0.02, 4, 20), mat(0x6a6a6a, { rough: 0.4, metal: 0.8 }));
  g.add(rim);
  return g;
}

export function buildArrowMesh() {
  const g = new THREE.Group();
  const shaft = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.75, 4), mat(0x8a6a40));
  shaft.rotation.x = Math.PI / 2;
  g.add(shaft);
  const tip = mesh(new THREE.ConeGeometry(0.02, 0.07, 4), mat(0x888888, { metal: 0.8, rough: 0.4 }), 0, 0, -0.4);
  tip.rotation.x = -Math.PI / 2;
  g.add(tip);
  const fl = mesh(box(0.05, 0.005, 0.1), mat(0xdddddd), 0, 0, 0.33);
  g.add(fl);
  return g;
}

// ---------------------------------------------------------------- humanoid
/**
 * opts: skin, hair, hairStyle('short'|'long'|'bald'|'mohawk'), shirt, pants, boots, scale, bulk,
 *       head('human'|'cat'|'lizard'|'orc'|'skull'|'goblin'|'scamp'|'dremora'), horns, tail,
 *       opacity, bones, armor({chest, head, legs, feet, hands}), robe, emissiveEyes
 */
export function buildHumanoid(opts = {}) {
  return buildSkinnedHumanoid(opts);
}

/** Original primitive-based humanoid (kept for reference/fallback). */
export function buildHumanoidLegacy(opts = {}) {
  const o = { skin: 0xd8a888, hair: 0x3a2a1a, hairStyle: 'short', shirt: 0x7a6a50, pants: 0x4a3a2a, boots: 0x2a2018, scale: 1, bulk: 1, head: 'human', ...opts };
  const extra = o.opacity ? { opacity: o.opacity } : {};
  const skinM = mat(o.skin, { rough: 0.7, ...extra, emissive: o.bones ? 0x000000 : 0 });
  const shirtM = mat(o.armor?.chest ?? o.shirt, o.armor?.chest ? { rough: 0.4, metal: 0.6, ...extra } : { ...extra });
  const pantsM = mat(o.armor?.legs ?? o.pants, o.armor?.legs ? { rough: 0.45, metal: 0.5, ...extra } : { ...extra });
  const bootM = mat(o.armor?.feet ?? o.boots, { ...extra });
  const handM = o.armor?.hands ? mat(o.armor.hands, { metal: 0.5, rough: 0.5 }) : skinM;
  const hairM = mat(o.hair, { rough: 0.9 });
  const b = o.bulk;
  const bone = !!o.bones;

  const root = new THREE.Group();
  const body = new THREE.Group(); // scaled container
  body.scale.setScalar(o.scale);
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  body.add(hips);
  hips.add(mesh(box(0.32 * b, 0.16, 0.2 * b), pantsM, 0, 0, 0));

  const torso = new THREE.Group();
  torso.position.y = 0.06;
  hips.add(torso);
  if (bone) {
    torso.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), skinM, 0, 0.28, 0));
    for (let i = 0; i < 4; i++) {
      const rib = mesh(new THREE.TorusGeometry(0.13 - i * 0.01, 0.015, 4, 10), skinM, 0, 0.42 - i * 0.07, 0.0);
      rib.rotation.x = Math.PI / 2;
      rib.scale.set(1.1, 0.8, 1);
      torso.add(rib);
    }
  } else {
    const chest = mesh(cap(0.17 * b, 0.26, 8), shirtM, 0, 0.3, 0);
    chest.scale.set(1.25, 1, 0.75);
    torso.add(chest);
    if (o.robe) {
      const skirt = mesh(new THREE.CylinderGeometry(0.2 * b, 0.32 * b, 0.75, 10, 1, true), shirtM, 0, -0.38, 0);
      skirt.material = mat(o.armor?.chest ?? o.shirt, { ...extra });
      skirt.material.side = THREE.DoubleSide;
      torso.add(skirt);
    }
    if (o.armor?.chest) {
      const pauldronM = mat(o.armor.chest, { rough: 0.35, metal: 0.7 });
      torso.add(mesh(sph(0.09, 8, 6), pauldronM, -0.23 * b, 0.47, 0));
      torso.add(mesh(sph(0.09, 8, 6), pauldronM, 0.23 * b, 0.47, 0));
    }
    // belt
    torso.add(mesh(new THREE.CylinderGeometry(0.17 * b, 0.17 * b, 0.05, 10), mat(0x2a1a10), 0, 0.02, 0));
  }

  // neck + head
  const neck = new THREE.Group();
  neck.position.y = 0.58;
  torso.add(neck);
  neck.add(mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.1, 6), skinM, 0, 0.03, 0));
  const head = new THREE.Group();
  head.position.y = 0.17;
  neck.add(head);
  buildHead(head, o, skinM, hairM);

  // arms
  const makeArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.22 * b, 0.5, 0);
    torso.add(shoulder);
    const upper = mesh(bone ? new THREE.CylinderGeometry(0.025, 0.025, 0.28, 4) : cap(0.055 * b, 0.2), o.armor?.chest ? shirtM : (o.sleeves === false ? skinM : shirtM), 0, -0.14, 0);
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);
    elbow.add(mesh(bone ? new THREE.CylinderGeometry(0.02, 0.02, 0.26, 4) : cap(0.045 * b, 0.18), o.armor?.hands ? handM : skinM, 0, -0.13, 0));
    const hand = new THREE.Group();
    hand.position.y = -0.28;
    elbow.add(hand);
    hand.add(mesh(sph(0.045, 6, 5), handM, 0, 0, 0));
    return { shoulder, elbow, hand };
  };
  const L = makeArm(-1), R = makeArm(1);

  // legs
  const makeLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1 * b, -0.05, 0);
    hips.add(hip);
    hip.add(mesh(bone ? new THREE.CylinderGeometry(0.025, 0.025, 0.42, 4) : cap(0.075 * b, 0.3), o.robe ? skinM : pantsM, 0, -0.21, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.43;
    hip.add(knee);
    knee.add(mesh(bone ? new THREE.CylinderGeometry(0.022, 0.022, 0.4, 4) : cap(0.06 * b, 0.3), o.armor?.legs ? pantsM : (o.robe ? skinM : pantsM), 0, -0.2, 0));
    const foot = mesh(box(0.1, 0.07, 0.22), bootM, 0, -0.43, 0.05);
    knee.add(foot);
    if (!o.armor?.legs && !bone) knee.add(mesh(new THREE.CylinderGeometry(0.068, 0.065, 0.18, 7), bootM, 0, -0.33, 0));
    return { hip, knee };
  };
  const LL = makeLeg(-1), RL = makeLeg(1);

  if (o.tail) {
    const tail = new THREE.Group();
    tail.position.set(0, -0.02, -0.1);
    hips.add(tail);
    const t = mesh(new THREE.ConeGeometry(0.05, 0.7, 6), mat(o.tailColor ?? o.skin), 0, -0.3, -0.12);
    t.rotation.x = 2.6;
    tail.add(t);
  }

  // weapon & shield attach points
  const weaponSlot = new THREE.Group();
  weaponSlot.rotation.x = Math.PI / 2; // point forward when arm hangs
  R.hand.add(weaponSlot);
  const shieldSlot = new THREE.Group();
  shieldSlot.position.set(-0.07, -0.12, 0);
  shieldSlot.rotation.y = -Math.PI / 2;
  L.elbow.add(shieldSlot);

  const rig = {
    type: 'humanoid', root, body, hips, torso, neck, head,
    L, R, LL, RL, weaponSlot, shieldSlot,
    height: 1.8 * o.scale, opts: o, floating: !!o.float,
  };
  return rig;
}

function buildHead(head, o, skinM, hairM) {
  const kind = o.head;
  const eyeM = mat(o.emissiveEyes ?? 0x101010, o.emissiveEyes ? { emissive: o.emissiveEyes, ei: 2 } : {});
  if (kind === 'skull') {
    const sk = mesh(sph(0.11, 10, 8), skinM, 0, 0.02, 0);
    sk.scale.set(0.9, 1, 1.05);
    head.add(sk);
    head.add(mesh(box(0.1, 0.05, 0.08), skinM, 0, -0.08, 0.04));
    head.add(mesh(sph(0.025, 6, 4), mat(0x000000, { emissive: o.emissiveEyes ?? 0x000000, ei: 2 }), -0.04, 0.03, 0.09));
    head.add(mesh(sph(0.025, 6, 4), mat(0x000000, { emissive: o.emissiveEyes ?? 0x000000, ei: 2 }), 0.04, 0.03, 0.09));
    return;
  }
  const skull = mesh(sph(0.12, 12, 10), skinM, 0, 0, 0);
  skull.scale.set(0.88, 1.08, 1);
  head.add(skull);
  // jaw/chin
  head.add(mesh(box(0.13, 0.08, 0.12), skinM, 0, -0.07, 0.03));
  // eyes
  head.add(mesh(sph(0.018, 6, 4), eyeM, -0.042, 0.02, 0.1));
  head.add(mesh(sph(0.018, 6, 4), eyeM, 0.042, 0.02, 0.1));
  // brow
  head.add(mesh(box(0.12, 0.02, 0.03), mat(o.hair, {}), 0, 0.055, 0.1));

  if (kind === 'cat') {
    const snout = mesh(box(0.09, 0.06, 0.08), skinM, 0, -0.03, 0.12);
    head.add(snout);
    head.add(mesh(sph(0.015, 5, 4), mat(0x221111), 0, 0.0, 0.165));
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.04, 0.09, 4), skinM, s * 0.07, 0.13, 0);
      head.add(ear);
    }
  } else if (kind === 'lizard') {
    const snout = mesh(box(0.1, 0.07, 0.16), skinM, 0, -0.04, 0.13);
    head.add(snout);
    for (let i = 0; i < 4; i++) {
      const horn = mesh(new THREE.ConeGeometry(0.015, 0.1, 4), hairM, (i - 1.5) * 0.04, 0.08, -0.1);
      horn.rotation.x = -2.2;
      head.add(horn);
    }
  } else {
    head.add(mesh(box(0.03, 0.05, 0.04), skinM, 0, -0.01, 0.12)); // nose
  }
  if (kind === 'orc') {
    for (const s of [-1, 1]) {
      const tusk = mesh(new THREE.ConeGeometry(0.012, 0.05, 4), mat(0xf0e8d0), s * 0.04, -0.08, 0.1);
      head.add(tusk);
    }
    head.children[1].scale.set(1.2, 1.1, 1.1);
  }
  if (kind === 'goblin' || kind === 'scamp' || o.elfEars) {
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.03, 0.16, 4), skinM, s * 0.12, 0.04, -0.01);
      ear.rotation.z = -s * 1.2;
      head.add(ear);
    }
  }
  if (o.horns || kind === 'scamp' || kind === 'dremora') {
    for (const s of [-1, 1]) {
      const horn = mesh(new THREE.ConeGeometry(0.025, kind === 'dremora' ? 0.22 : 0.12, 5), mat(0x1a1210), s * 0.06, 0.12, -0.02);
      horn.rotation.z = -s * 0.5;
      horn.rotation.x = -0.4;
      head.add(horn);
    }
  }
  // hair
  if (o.armor?.head) {
    const helm = mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(o.armor.head, { metal: 0.7, rough: 0.35 }), 0, 0.02, -0.005);
    helm.scale.set(0.95, 1.1, 1.05);
    head.add(helm);
  } else if (o.hairStyle !== 'bald' && kind !== 'lizard') {
    const hair = mesh(new THREE.SphereGeometry(0.128, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, 0, 0.012, -0.01);
    hair.scale.set(0.92, 1.12, 1.05);
    head.add(hair);
    if (o.hairStyle === 'long') head.add(mesh(box(0.2, 0.22, 0.06), hairM, 0, -0.08, -0.1));
    if (o.hairStyle === 'mohawk') head.add(mesh(box(0.03, 0.08, 0.2), hairM, 0, 0.13, -0.01));
    if (o.beard) head.add(mesh(box(0.12, 0.09, 0.06), hairM, 0, -0.1, 0.07));
  }
}

// ---------------------------------------------------------------- creatures
export function buildQuadruped(opts = {}) {
  return buildSkinnedQuadruped(opts);
}

export function buildQuadrupedLegacy(opts = {}) {
  const o = { color: 0x6a6460, belly: 0x9a9088, len: 1.0, height: 0.75, headSize: 0.2, tail: true, ears: true, ...opts };
  const furM = mat(o.color, { rough: 0.95 });
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = o.height;
  root.add(body);
  const torso = mesh(cap(o.height * 0.32, o.len * 0.8, 8), furM);
  torso.rotation.x = Math.PI / 2;
  body.add(torso);
  const neck = new THREE.Group();
  neck.position.set(0, o.height * 0.15, o.len * 0.6);
  body.add(neck);
  const head = new THREE.Group();
  head.position.set(0, 0.08, 0.12);
  neck.add(head);
  const h = mesh(box(o.headSize * 1.1, o.headSize, o.headSize * 1.3), furM);
  head.add(h);
  const snout = mesh(box(o.headSize * 0.55, o.headSize * 0.5, o.headSize * 0.9), furM, 0, -0.03, o.headSize * 1.0);
  head.add(snout);
  head.add(mesh(sph(0.025, 5, 4), mat(0x111111), 0, 0.0, o.headSize * 1.45));
  const eyeM = mat(o.eyes ?? 0xffcc33, { emissive: o.eyes ?? 0x332200, ei: 0.6 });
  head.add(mesh(sph(0.022, 5, 4), eyeM, -o.headSize * 0.35, o.headSize * 0.2, o.headSize * 0.6));
  head.add(mesh(sph(0.022, 5, 4), eyeM, o.headSize * 0.35, o.headSize * 0.2, o.headSize * 0.6));
  if (o.ears) {
    for (const s of [-1, 1]) head.add(mesh(new THREE.ConeGeometry(0.045, 0.12, 4), furM, s * o.headSize * 0.35, o.headSize * 0.6, -0.02));
  }
  const legs = [];
  const legLen = o.height * 0.55;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const hip = new THREE.Group();
    hip.position.set(sx * o.height * 0.2, -o.height * 0.05, sz * o.len * 0.42);
    body.add(hip);
    hip.add(mesh(cap(0.05 * o.height * 1.6, legLen * 0.5), furM, 0, -legLen * 0.35, 0));
    const knee = new THREE.Group();
    knee.position.y = -legLen * 0.7;
    hip.add(knee);
    knee.add(mesh(cap(0.035 * o.height * 1.6, legLen * 0.4), furM, 0, -legLen * 0.25, 0));
    legs.push({ hip, knee, phase: sx * sz > 0 ? 0 : Math.PI });
  }
  let tail = null;
  if (o.tail) {
    tail = new THREE.Group();
    tail.position.set(0, o.height * 0.1, -o.len * 0.55);
    body.add(tail);
    const t = mesh(new THREE.ConeGeometry(0.06, o.len * 0.6, 5), furM, 0, -o.len * 0.25, 0);
    t.rotation.x = Math.PI;
    tail.add(t);
    tail.rotation.x = -2.2;
  }
  return { type: 'quadruped', root, body, neck, head, legs, tail, height: o.height + 0.2, opts: o };
}

export function buildMudcrab(opts = {}) {
  const shellM = mat(opts.color ?? 0x8a6a4a, { rough: 0.6, flat: true });
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.3;
  root.add(body);
  const shell = mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), shellM);
  shell.scale.set(1, 0.55, 0.8);
  body.add(shell);
  const under = mesh(new THREE.CylinderGeometry(0.5, 0.45, 0.08, 10), mat(0xa08a6a), 0, -0.02, 0);
  under.scale.set(1, 1, 0.8);
  body.add(under);
  const eyeM = mat(0x111111);
  for (const s of [-1, 1]) {
    const stalk = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 4), shellM, s * 0.1, 0.25, 0.32);
    body.add(stalk);
    body.add(mesh(sph(0.03, 5, 4), eyeM, s * 0.1, 0.32, 0.32));
  }
  const legs = [];
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(s * 0.4, 0, -0.15 + i * 0.15);
      body.add(hip);
      const l = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.4, 4), shellM, s * 0.12, -0.12, 0);
      l.rotation.z = s * 0.9;
      hip.add(l);
      legs.push({ hip, knee: hip, phase: i * 2 + (s > 0 ? Math.PI : 0) });
    }
  }
  const claws = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.3, 0.02, 0.35);
    body.add(arm);
    const c = mesh(box(0.14, 0.1, 0.22), shellM, 0, 0, 0.12);
    arm.add(c);
    claws.push(arm);
  }
  return { type: 'crab', root, body, legs, claws, height: 0.6 };
}

export function buildClannfear() {
  const skin = mat(0x6a5a3a, { rough: 0.8, flat: true });
  const frill = mat(0x9a3a20, { rough: 0.7 });
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 1.1;
  root.add(body);
  const torso = mesh(cap(0.32, 0.9, 8), skin);
  torso.rotation.x = Math.PI / 2 - 0.2;
  body.add(torso);
  const neck = new THREE.Group();
  neck.position.set(0, 0.25, 0.65);
  body.add(neck);
  const head = new THREE.Group();
  neck.add(head);
  head.add(mesh(box(0.3, 0.3, 0.55), skin, 0, 0, 0.2));
  const fr = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 10, 1, false, 0, Math.PI), frill, 0, 0.15, -0.05);
  fr.rotation.x = Math.PI / 2 + 0.4;
  fr.rotation.z = Math.PI / 2;
  head.add(fr);
  for (const s of [-1, 1]) {
    const horn = mesh(new THREE.ConeGeometry(0.04, 0.35, 5), mat(0xe0d0b0), s * 0.12, 0.2, 0.2);
    horn.rotation.x = 0.9;
    head.add(horn);
    head.add(mesh(sph(0.03, 5, 4), mat(0xffcc00, { emissive: 0xff8800, ei: 1 }), s * 0.13, 0.06, 0.38));
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.25, -0.1, -0.05);
    body.add(hip);
    hip.add(mesh(cap(0.12, 0.4), skin, 0, -0.3, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.6;
    hip.add(knee);
    knee.add(mesh(cap(0.07, 0.35), skin, 0, -0.22, -0.05));
    legs.push({ hip, knee, phase: s > 0 ? 0 : Math.PI });
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.0, -0.6);
  body.add(tail);
  const t = mesh(new THREE.ConeGeometry(0.2, 1.3, 6), skin, 0, 0, -0.6);
  t.rotation.x = -Math.PI / 2;
  tail.add(t);
  // little arms
  for (const s of [-1, 1]) {
    const a = mesh(cap(0.04, 0.2), skin, s * 0.22, 0.0, 0.5);
    a.rotation.x = 0.8;
    body.add(a);
  }
  return { type: 'raptor', root, body, neck, head, legs, tail, height: 1.6 };
}

// ---------------------------------------------------------------- animation
/**
 * state: { phase, moveSpeed (m/s), attack (-1 or 0..1), attackKind, block, cast (-1/0..1),
 *          dead (0..1), stagger (0..1), sneak, draw (0..1 bow), weaponOut }
 */
export function animateRig(rig, s, t) {
  if (rig.kit) return animateKit(rig, s, t);
  switch (rig.type) {
    case 'humanoid': return animateHumanoid(rig, s, t);
    case 'quadruped': return animateQuad(rig, s, t);
    case 'crab': return animateCrab(rig, s, t);
    case 'bird': return animateBird(rig, s, t);
    case 'rabbit': return animateRabbit(rig, s, t);
    case 'wisp': return animateWisp(rig, s, t);
    case 'raptor': return animateRaptor(rig, s, t);
  }
}

function poseGroup(rig) {
  if (!rig.pose) {
    // an inner group so death/hover offsets never touch the actor's world transform
    rig.pose = new THREE.Group();
    for (const c of [...rig.root.children]) rig.pose.add(c);
    rig.root.add(rig.pose);
  }
  return rig.pose;
}

function deathPose(rig, s) {
  const pose = poseGroup(rig);
  if (s.dead > 0) {
    const d = Math.min(1, s.dead);
    const e = 1 - Math.pow(1 - d, 3);
    pose.rotation.x = rig.type === 'humanoid' ? -e * Math.PI / 2 : 0;
    pose.rotation.z = rig.type !== 'humanoid' ? e * Math.PI / 2 : 0;
    pose.position.y = rig.type === 'humanoid' ? e * 0.15 : e * 0.1 * (rig.height || 1);
    return true;
  }
  pose.rotation.x = 0;
  pose.rotation.z = 0;
  pose.position.y = 0;
  return false;
}

function animateHumanoid(r, s, t) {
  const speed = s.moveSpeed || 0;
  const amp = Math.min(1, speed / 4.5);
  const ph = s.phase || 0;
  const sw = Math.sin(ph);
  const dead = deathPose(r, s);
  const hover = r.floating ? Math.sin(t * 2) * 0.08 + 0.15 : 0;

  // legs
  r.LL.hip.rotation.x = sw * 0.7 * amp;
  r.RL.hip.rotation.x = -sw * 0.7 * amp;
  r.LL.knee.rotation.x = Math.max(0, -Math.cos(ph)) * 1.0 * amp;
  r.RL.knee.rotation.x = Math.max(0, Math.cos(ph)) * 1.0 * amp;
  r.hips.position.y = 0.95 + Math.abs(Math.cos(ph)) * 0.04 * amp + hover;
  if (s.sneak) {
    r.hips.position.y -= 0.22;
    r.LL.hip.rotation.x -= 0.6; r.RL.hip.rotation.x -= 0.6;
    r.LL.knee.rotation.x += 0.9; r.RL.knee.rotation.x += 0.9;
    r.torso.rotation.x = 0.35;
  } else {
    r.torso.rotation.x = r.opts.hunch ?? 0.04;
  }

  // arms default swing
  let rsx = -sw * 0.5 * amp, rsz = 0.12, rex = -0.25 - amp * 0.3;
  let lsx = sw * 0.5 * amp, lsz = -0.12, lex = -0.25 - amp * 0.3;
  let rsy = 0, twist = 0;
  if (s.weaponOut) { rex = -0.9; rsx = -0.25 - sw * 0.15 * amp; }
  if (r.opts.zombieArms) { rsx = lsx = -1.4; rex = lex = -0.1; }

  if (s.attack >= 0) {
    const a = s.attack;
    if (s.attackKind === 'bite' || s.attackKind === 'punch') {
      const k = a < 0.4 ? a / 0.4 : 1 - (a - 0.4) / 0.6;
      rsx = -1.5 * k; rex = -0.2; twist = -0.3 * k;
    } else if (s.attackKind === 'power') {
      // overhead chop
      if (a < 0.45) { const k = a / 0.45; rsx = -2.9 * k; rex = -0.6 * k; twist = 0.1 * k; }
      else if (a < 0.65) { const k = (a - 0.45) / 0.2; rsx = -2.9 + 2.6 * k; rex = -0.6 + 0.4 * k; }
      else { const k = (a - 0.65) / 0.35; rsx = -0.3 * (1 - k); rex = -0.2 - 0.7 * k; }
      r.torso.rotation.x += a > 0.45 && a < 0.7 ? 0.25 : 0;
    } else {
      // horizontal slash right-to-left
      if (a < 0.35) { const k = a / 0.35; rsx = -1.3 * k; rsz = 0.12 + 1.0 * k; rex = -1.2 * k; twist = 0.5 * k; }
      else if (a < 0.6) { const k = (a - 0.35) / 0.25; rsx = -1.3 - 0.2 * k; rsz = 1.12 - 1.5 * k; rex = -1.2 + 1.0 * k; twist = 0.5 - 1.1 * k; }
      else { const k = (a - 0.6) / 0.4; rsx = -1.5 * (1 - k) - 0.25 * k; rsz = -0.38 * (1 - k) + 0.12 * k; rex = -0.2 - 0.7 * k; twist = -0.6 * (1 - k); }
    }
  }
  if (s.cast >= 0) {
    const k = Math.sin(Math.min(1, s.cast) * Math.PI);
    rsx = -1.5 * k + rsx * (1 - k); rex = -0.1 * k + rex * (1 - k);
    lsx = -1.2 * k + lsx * (1 - k);
  }
  if (s.draw >= 0) {
    lsx = -1.55; lsz = -0.15; lex = 0;
    rsx = -1.55; rsz = 0.4 + s.draw * 0.6; rex = -1.4 * s.draw;
    twist = -0.4;
  }
  if (s.block) {
    lsx = -1.25; lsz = 0.5; lex = -1.3;
    if (!r.hasShield) { rsx = -1.0; rsz = -0.4; rex = -1.2; }
  }
  if (s.stagger > 0) {
    r.torso.rotation.x -= Math.sin(s.stagger * Math.PI) * 0.35;
  }
  r.R.shoulder.rotation.set(rsx, rsy, rsz);
  r.R.elbow.rotation.x = rex;
  r.L.shoulder.rotation.set(lsx, 0, lsz);
  r.L.elbow.rotation.x = lex;
  r.torso.rotation.y = twist;
  r.neck.rotation.y = -twist * 0.6;
  r.neck.rotation.x = s.lookPitch || 0;
  if (dead) {
    r.L.shoulder.rotation.set(-2.6, 0, -0.4);
    r.R.shoulder.rotation.set(-2.6, 0, 0.4);
  }
}

function animateQuad(r, s, t) {
  const dead = deathPose(r, s);
  const speed = s.moveSpeed || 0;
  const amp = Math.min(1, speed / 6);
  const ph = s.phase || 0;
  for (const l of r.legs) {
    const sw = Math.sin(ph + l.phase);
    l.hip.rotation.x = sw * 0.8 * amp;
    l.knee.rotation.x = Math.max(0, Math.cos(ph + l.phase)) * 0.8 * amp;
  }
  r.body.position.y = r.opts.height + Math.abs(Math.sin(ph)) * 0.05 * amp;
  r.body.rotation.x = 0;
  r.body.position.z = 0;
  r.neck.rotation.x = Math.sin(t * 1.3) * 0.05;
  if (r.tail) r.tail.rotation.y = Math.sin(t * 3 + ph) * 0.3;
  if (s.attack >= 0) {
    const k = Math.sin(Math.min(1, s.attack) * Math.PI);
    r.body.position.z = k * 0.45;
    r.body.rotation.x = -k * 0.25;
    r.neck.rotation.x = k * 0.5;
  }
  if (s.stagger > 0) r.body.rotation.x += Math.sin(s.stagger * Math.PI) * 0.3;
  if (dead) for (const l of r.legs) { l.hip.rotation.x = 0.3; l.knee.rotation.x = 0.4; }
}

/** A will-o'-the-wisp: a bobbing mote of cold light with a soft halo. */
let wispTex = null;
export function buildWisp(opts = {}) {
  if (!wispTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    wispTex = new THREE.CanvasTexture(c);
  }
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 1.3;
  root.add(body);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe8fbff }));
  body.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: wispTex, color: opts.color ?? 0x80e0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.setScalar(0.9);
  body.add(halo);
  const tails = [];
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Sprite(halo.material);
    t.scale.setScalar(0.35 - i * 0.06);
    body.add(t);
    tails.push(t);
  }
  return { type: 'wisp', root, body, halo, tails, height: 1.5 };
}
function animateWisp(r, s, t) {
  r.body.position.y = 1.3 + Math.sin(t * 2.3) * 0.25;
  r.body.position.x = Math.sin(t * 1.7) * 0.15;
  r.halo.scale.setScalar(0.8 + Math.sin(t * 9) * 0.12);
  r.tails.forEach((tl, i) => tl.position.set(Math.sin(t * 3 - i * 0.6) * 0.12 * (i + 1), -0.12 * (i + 1) + Math.cos(t * 4 - i) * 0.05, Math.cos(t * 3 - i * 0.6) * 0.12 * (i + 1)));
}

/** A plump hen (or rooster): round body, little wings, comb and wattle, stick legs. */
/** A white snow rabbit: the hare mesh in a rig that hops. */
export function buildRabbit(opts = {}) {
  const root = new THREE.Group();
  const body = buildHareMesh({ glow: 0 });
  body.scale.setScalar(opts.scale ?? 0.8);
  root.add(body);
  return { type: 'rabbit', root, body, height: 0.4, phase0: Math.random() * 6 };
}

function animateRabbit(r, s, t) {
  if (deathPose(r, s)) return;
  const amp = Math.min(1, (s.moveSpeed || 0) / 1.2);
  const ph = (s.phase || 0) * 1.6;
  // bounding: up and forward in arcs, ears back while airborne
  const hop = Math.abs(Math.sin(ph));
  r.body.position.y = hop * 0.22 * amp;
  r.body.rotation.x = -Math.cos(ph) * 0.35 * amp;
  // at rest: a nose-twitch and the odd look round
  if (amp < 0.1) {
    const k = (t + r.phase0) % 5;
    r.body.rotation.y = k < 0.6 ? Math.sin(k / 0.6 * Math.PI) * 0.5 : 0;
    r.body.position.y = k > 3 && k < 3.3 ? Math.sin((k - 3) / 0.3 * Math.PI) * 0.06 : 0;
  }
}

export function buildChicken(opts = {}) {
  const feather = mat(opts.color ?? 0xf4ece0, { rough: 0.95 });
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.26;
  root.add(body);
  const torso = mesh(sph(0.17, 14, 10), feather);
  torso.scale.set(0.85, 0.8, 1.1);
  body.add(torso);
  const tail = mesh(new THREE.ConeGeometry(0.1, 0.2, 6), opts.rooster ? mat(0x3a5a3a, { rough: 0.5, metal: 0.3 }) : feather, 0, 0.08, -0.17);
  tail.rotation.x = -2.4;
  body.add(tail);
  for (const s of [-1, 1]) {
    const wing = mesh(sph(0.1, 8, 6), feather, s * 0.13, 0.01, -0.02);
    wing.scale.set(0.35, 0.7, 1.1);
    body.add(wing);
  }
  const neck = new THREE.Group();
  neck.position.set(0, 0.1, 0.13);
  body.add(neck);
  const head = mesh(sph(0.075, 10, 8), feather, 0, 0.11, 0.03);
  neck.add(head);
  const comb = mesh(box(0.025, 0.06, 0.08), mat(0xd82a2a, { rough: 0.6 }), 0, 0.075, 0.0);
  head.add(comb);
  const wattle = mesh(sph(0.022, 6, 4), mat(0xd82a2a, { rough: 0.6 }), 0, -0.05, 0.05);
  head.add(wattle);
  const beak = mesh(new THREE.ConeGeometry(0.022, 0.06, 5), mat(0xf0a830, { rough: 0.5 }), 0, -0.005, 0.085);
  beak.rotation.x = Math.PI / 2;
  head.add(beak);
  for (const s of [-1, 1]) head.add(mesh(sph(0.013, 6, 4), mat(0x101010, { rough: 0.3 }), s * 0.05, 0.015, 0.045));
  const legM = mat(0xe8a830, { rough: 0.6 });
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group();
    hip.position.set(s * 0.06, 0.13, 0);
    root.add(hip);
    hip.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.13, 4), legM, 0, -0.065, 0));
    const foot = mesh(box(0.05, 0.012, 0.06), legM, 0, -0.13, 0.02);
    hip.add(foot);
    return { hip, phase: s > 0 ? 0 : Math.PI };
  });
  return { type: 'bird', root, body, neck, head, legs, height: 0.45, peckT: Math.random() * 5 };
}

function animateBird(r, s, t) {
  deathPose(r, s);
  const ph = s.phase || 0;
  const amp = Math.min(1, (s.moveSpeed || 0) / 1.5);
  for (const l of r.legs) l.hip.rotation.x = Math.sin(ph * 2 + l.phase) * 0.7 * amp;
  r.body.rotation.z = Math.sin(ph * 2) * 0.08 * amp;
  r.body.position.y = 0.26 + Math.abs(Math.sin(ph * 2)) * 0.02 * amp;
  // the head jerks forward with each step; at rest it pecks at the ground now and then
  let peck = 0;
  if (amp < 0.1) {
    const k = (t + r.peckT) % 4.5;
    peck = k < 0.5 ? Math.sin((k / 0.5) * Math.PI) : 0;
  }
  r.neck.rotation.x = peck * 1.2 + Math.max(0, Math.sin(ph * 2)) * 0.2 * amp;
  r.head.rotation.y = amp < 0.1 && !peck ? Math.sin(t * 1.3 + r.peckT) * 0.6 : 0;
}

function animateCrab(r, s, t) {
  deathPose(r, s);
  const ph = s.phase || 0;
  const amp = Math.min(1, (s.moveSpeed || 0) / 3);
  r.legs.forEach((l) => { l.hip.rotation.y = Math.sin(ph * 1.5 + l.phase) * 0.5 * amp; l.hip.rotation.x = Math.cos(ph * 1.5 + l.phase) * 0.3 * amp; });
  const snap = s.attack >= 0 ? Math.sin(s.attack * Math.PI) : 0;
  r.claws.forEach((c, i) => {
    c.rotation.y = (i ? -1 : 1) * (0.2 + Math.sin(t * 4 + i) * 0.1 + snap * 0.6);
    c.rotation.x = -snap * 0.8;
  });
  r.body.position.y = 0.3 + Math.abs(Math.sin(ph * 1.5)) * 0.03 * amp;
}

function animateRaptor(r, s, t) {
  const dead = deathPose(r, s);
  const ph = s.phase || 0;
  const amp = Math.min(1, (s.moveSpeed || 0) / 6);
  for (const l of r.legs) {
    const sw = Math.sin(ph + l.phase);
    l.hip.rotation.x = sw * 0.9 * amp;
    l.knee.rotation.x = Math.max(0, Math.cos(ph + l.phase)) * 1.0 * amp + 0.2;
  }
  r.body.position.y = 1.1 + Math.abs(Math.sin(ph)) * 0.06 * amp;
  r.tail.rotation.y = Math.sin(t * 2 + ph) * 0.25;
  r.body.rotation.x = 0;
  r.neck.rotation.x = 0;
  if (s.attack >= 0) {
    const k = Math.sin(s.attack * Math.PI);
    r.body.rotation.x = k * 0.35;
    r.neck.rotation.x = k * 0.6;
  }
  if (dead) for (const l of r.legs) l.hip.rotation.x = 0.4;
}
