// Skinned humanoid: one skeleton, a handful of SkinnedMeshes (one per material) with smooth
// joint weights, painted faces and textured clothing. Exposes the same bone handles
// (hips, torso, neck, head, L/R shoulder-elbow-hand, LL/RL hip-knee) the animator drives.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TG from '../world/texgen.js';

const B = { hips: 0, torso: 1, neck: 2, head: 3, shL: 4, elL: 5, haL: 6, shR: 7, elR: 8, haR: 9, hipL: 10, knL: 11, hipR: 12, knR: 13 };
const PARENT = [-1, 0, 1, 2, 1, 4, 5, 1, 7, 8, 0, 10, 0, 12];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ----------------------------------------------------------------- materials (cached)
const mats = new Map();
function material(key, make) {
  if (!mats.has(key)) mats.set(key, make());
  return mats.get(key);
}
function skinMat(hex, o) {
  return material(`skin${hex}${o.opacity || ''}`, () => {
    const t = TG.skinTex();
    return new THREE.MeshStandardMaterial({ color: hex, map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.62, transparent: !!o.opacity, opacity: o.opacity || 1, depthWrite: !o.opacity });
  });
}
function fabricMat(hex, o, kind = 'fabric') {
  return material(`${kind}${hex}${o.opacity || ''}`, () => {
    const t = kind === 'leather' ? TG.leatherTex() : TG.fabricTex();
    return new THREE.MeshStandardMaterial({ color: hex, map: t.map, normalMap: t.normalMap, roughness: kind === 'leather' ? 0.7 : 0.92, transparent: !!o.opacity, opacity: o.opacity || 1, depthWrite: !o.opacity, side: THREE.DoubleSide, forceSinglePass: true });
  });
}
function plateMat(hex) {
  return material(`plate${hex}`, () => {
    const t = TG.plateTex();
    return new THREE.MeshStandardMaterial({ color: hex, map: t.map, normalMap: t.normalMap, roughness: 0.36, metalness: 0.72 });
  });
}
function hairMat(hex) {
  return material(`hair${hex}`, () => {
    const t = TG.hairTex();
    return new THREE.MeshStandardMaterial({ color: hex, map: t.map, normalMap: t.normalMap, roughness: 0.7, side: THREE.DoubleSide });
  });
}
function faceMat(o) {
  const kind = o.head === 'goblin' || o.head === 'scamp' ? 'human' : o.head;
  return material(`face${o.skin}${kind}${o.female}${o.opacity || ''}`, () => new THREE.MeshStandardMaterial({
    color: 0xffffff, map: TG.faceTex(o.skin, kind, o.eyeColor ?? 0x5a7aa0, !!o.female), roughness: 0.6,
    transparent: !!o.opacity, opacity: o.opacity || 1, depthWrite: !o.opacity,
  }));
}
function glowMat(hex) {
  return material(`glow${hex}`, () => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 3, roughness: 0.3 }));
}
function plainMat(hex, rough = 0.6, metal = 0) {
  return material(`plain${hex}${rough}${metal}`, () => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal }));
}

// ----------------------------------------------------------------- geometry helpers
function prep(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}

/** Assign skin weights: bound to `bone`, blending toward `blend.to` by blend.fn(y). */
function skin(geo, bone, blend = null) {
  const p = geo.attributes.position;
  const idx = new Uint16Array(p.count * 4), wt = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) {
    const w = blend ? blend.fn(p.getY(i), p.getX(i), p.getZ(i)) : 0;
    idx[i * 4] = bone; wt[i * 4] = 1 - w;
    idx[i * 4 + 1] = blend ? blend.to : 0; wt[i * 4 + 1] = w;
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(wt, 4));
  return geo;
}

/** Tapered limb between two points (vertical in bind pose), rounded ends. */
function limbGeo(x, yTop, yBot, rTop, rBot, radial = 10, zScale = 1) {
  const len = yTop - yBot;
  const g = new THREE.CylinderGeometry(rTop, rBot, len, radial, 4, false);
  const cap1 = new THREE.SphereGeometry(rTop, radial, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  cap1.translate(0, len / 2, 0);
  const cap2 = new THREE.SphereGeometry(rBot, radial, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  cap2.translate(0, -len / 2, 0);
  const m = mergeGeometries([prep(g), prep(cap1), prep(cap2)]);
  m.scale(1, 1, zScale);
  m.translate(x, (yTop + yBot) / 2, 0);
  return m;
}

function ellipsoid(r, sx, sy, sz, x, y, z, ws = 16, hs = 12) {
  const g = prep(new THREE.SphereGeometry(r, ws, hs));
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}

/** Front-project face UVs onto head geometry; the back of the head maps to plain skin. */
function faceUV(geo, cy, z0 = 0.0) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (z > z0) uv.setXY(i, 0.5 + x / 0.27, 0.5 + (y - cy) / 0.3);
    else uv.setXY(i, 0.04, 0.5 + (y - cy) / 0.3);
  }
  return geo;
}

// ----------------------------------------------------------------- the builder
/**
 * opts: skin, hair, hairStyle('short'|'long'|'bald'|'mohawk'), shirt, pants, boots, scale, bulk,
 *       head('human'|'cat'|'lizard'|'orc'|'skull'|'goblin'|'scamp'|'dremora'), horns, tail,
 *       opacity, bones, armor({chest, head, legs, feet, hands}), robe, emissiveEyes, elfEars, beard,
 *       sleeves, female, eyeColor
 */
export function buildSkinnedHumanoid(opts = {}) {
  const o = { skin: 0xd8a888, hair: 0x3a2a1a, hairStyle: 'short', shirt: 0x7a6a50, pants: 0x4a3a2a, boots: 0x2a2018, scale: 1, bulk: 1, head: 'human', ...opts };
  const b = o.bulk;
  const fem = !!o.female;
  const bone = !!o.bones;
  const parts = new Map(); // material -> geometries
  const add = (mat, geo) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); };

  const skinM = bone ? plainMat(o.skin, 0.75) : skinMat(o.skin, o);
  const topM = o.armor?.chest ? plateMat(o.armor.chest) : fabricMat(o.shirt, o);
  const legM = o.armor?.legs ? plateMat(o.armor.legs) : fabricMat(o.pants, o, o.robe ? 'fabric' : 'leather');
  const bootM = o.armor?.feet ? plateMat(o.armor.feet) : fabricMat(o.boots, o, 'leather');
  const handM = o.armor?.hands ? plateMat(o.armor.hands) : skinM;
  const beltM = fabricMat(0x3a2414, o, 'leather');

  const sx = 0.2 * b * (fem ? 0.9 : 1); // shoulder x
  const hx = 0.1 * b * (fem ? 1.05 : 1); // hip x

  // ---- torso & pelvis
  if (bone) {
    add(skinM, skin(limbGeo(0, 1.56, 0.98, 0.028, 0.03, 6), B.torso, { to: B.hips, fn: (y) => 1 - smooth(0.98, 1.1, y) }));
    for (let i = 0; i < 5; i++) {
      const rib = prep(new THREE.TorusGeometry(0.12 - i * 0.008, 0.013, 5, 14));
      rib.rotateX(Math.PI / 2); rib.scale(1.15, 1, 0.8); rib.translate(0, 1.44 - i * 0.07, 0);
      add(skinM, skin(rib, B.torso));
    }
    add(skinM, skin(ellipsoid(0.12, 1.3, 0.55, 0.8, 0, 0.94, 0), B.hips));
    if (o.robe) {
      // a lich's robe, rotted to lace: a mantle hung from the shoulders, flaring to a ragged hem near the floor
      const prof = [[0.05, 1.6], [0.17, 1.55], [0.22, 1.42], [0.2, 1.2], [0.22, 1.0], [0.28, 0.7], [0.34, 0.4], [0.38, 0.12]];
      const robe = prep(new THREE.LatheGeometry(prof.map(([rr, y]) => new THREE.Vector2(rr * b, y)), 22));
      robe.scale(1.18, 1, 0.86);
      const rp = robe.attributes.position;
      for (let i = 0; i < rp.count; i++) {
        const y = rp.getY(i), x = rp.getX(i), z = rp.getZ(i);
        // a tattered hem: tongues of cloth of different lengths
        if (y < 0.5) rp.setY(i, y + (0.5 - y) * Math.max(0, Math.sin(Math.atan2(z, x) * 7) * 0.7 + Math.sin(Math.atan2(z, x) * 17) * 0.35));
      }
      robe.computeVertexNormals();
      add(topM, skin(robe, B.torso, { to: B.hips, fn: (y) => 1 - smooth(0.95, 1.2, y) }));
    }
  } else {
    const prof = fem
      ? [[0.001, 0.84], [0.14, 0.86], [0.175, 0.95], [0.15, 1.05], [0.125, 1.13], [0.15, 1.27], [0.16, 1.36], [0.165, 1.45], [0.14, 1.52], [0.07, 1.575], [0.001, 1.58]]
      : [[0.001, 0.84], [0.14, 0.86], [0.165, 0.95], [0.15, 1.05], [0.145, 1.13], [0.168, 1.27], [0.18, 1.38], [0.18, 1.46], [0.15, 1.53], [0.07, 1.58], [0.001, 1.585]];
    const torso = prep(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * b, y)), 20));
    torso.scale(1.22, 1, 0.74);
    // flatten the back a touch and push the chest forward
    const tp = torso.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const y = tp.getY(i), z = tp.getZ(i);
      if (z > 0 && y > 1.2 && y < 1.48) tp.setZ(i, z * (1.12 + (fem ? 0.12 : 0) * Math.sin(((y - 1.2) / 0.28) * Math.PI)));
    }
    torso.computeVertexNormals();
    add(topM, skin(torso, B.torso, { to: B.hips, fn: (y) => 1 - smooth(0.93, 1.08, y) }));
    // belt
    const belt = prep(new THREE.TorusGeometry(0.155 * b, 0.022, 6, 22));
    belt.rotateX(Math.PI / 2); belt.scale(1.22, 1, 0.76); belt.translate(0, 0.99, 0);
    add(beltM, skin(belt, B.hips));
    add(plainMat(0xb0902a, 0.35, 0.8), skin(prep(new THREE.BoxGeometry(0.05, 0.04, 0.015)).translate(0, 0.99, 0.12 * b + 0.01), B.hips));
    if (o.robe) {
      const skirt = prep(new THREE.CylinderGeometry(0.19 * b, 0.33 * b, 0.78, 18, 3, true));
      skirt.scale(1.15, 1, 0.85); skirt.translate(0, 0.6, 0);
      add(topM, skin(skirt, B.hips));
    } else if (o.armor?.chest) {
      // plate skirt (tassets)
      const tas = prep(new THREE.CylinderGeometry(0.17 * b, 0.21 * b, 0.2, 16, 1, true));
      tas.scale(1.2, 1, 0.8); tas.translate(0, 0.86, 0);
      add(topM, skin(tas, B.hips));
    }
    if (o.armor?.chest) {
      for (const s of [-1, 1]) {
        const pa = prep(new THREE.SphereGeometry(0.095, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55));
        pa.scale(1.1, 0.9, 1.05); pa.translate(s * sx * 1.05, 1.5, 0);
        add(topM, skin(pa, s < 0 ? B.shL : B.shR));
      }
    }
  }

  // ---- neck & head
  add(skinM, skin(limbGeo(0, 1.68, 1.54, 0.048, 0.055, 10), B.neck, { to: B.torso, fn: (y) => 1 - smooth(1.55, 1.62, y) }));
  const cy = 1.755;
  const faceM = faceMat(o);
  const headParts = [];
  if (o.head === 'skull') {
    headParts.push(ellipsoid(0.11, 0.9, 1.02, 1.05, 0, cy + 0.01, 0), ellipsoid(0.07, 1, 0.6, 1.1, 0, cy - 0.07, 0.03));
  } else {
    headParts.push(ellipsoid(0.115, 0.9, 1.08, 1.0, 0, cy, 0.005, 24, 18));
    headParts.push(ellipsoid(0.08, 1.0, 0.82, 1.0, 0, cy - 0.065, 0.03, 16, 10)); // jaw
    if (o.head === 'cat') headParts.push(ellipsoid(0.055, 1.1, 0.75, 1.0, 0, cy - 0.03, 0.08));
    if (o.head === 'lizard') headParts.push(ellipsoid(0.06, 1.0, 0.75, 1.9, 0, cy - 0.035, 0.09));
    if (o.head === 'orc') headParts.push(ellipsoid(0.07, 1.25, 0.7, 1.0, 0, cy - 0.075, 0.04));
  }
  for (const g of headParts) add(faceM, skin(faceUV(g, cy, -0.01), B.head));
  // nose
  if (o.head === 'human' || o.head === 'orc' || o.head === 'goblin' || o.head === 'dremora' || o.head === 'scamp') {
    const nose = prep(new THREE.ConeGeometry(0.018, 0.05, 6));
    nose.rotateX(-1.2); nose.scale(1, 1, 0.8); nose.translate(0, cy - 0.008, 0.112);
    add(skinM, skin(nose, B.head));
  }
  // ears
  for (const s of [-1, 1]) {
    if (o.head === 'cat') {
      const ear = prep(new THREE.ConeGeometry(0.035, 0.08, 5)); ear.translate(s * 0.065, cy + 0.12, -0.01);
      add(skinM, skin(ear, B.head));
    } else if (o.elfEars || o.head === 'goblin' || o.head === 'scamp') {
      const ear = prep(new THREE.ConeGeometry(0.025, o.head === 'goblin' || o.head === 'scamp' ? 0.16 : 0.1, 5));
      ear.rotateZ(-s * 1.15); ear.translate(s * 0.13, cy + 0.03, -0.01);
      add(skinM, skin(ear, B.head));
    } else if (o.head !== 'skull' && o.head !== 'lizard') {
      add(skinM, skin(ellipsoid(0.028, 0.4, 1, 0.7, s * 0.105, cy, -0.005, 8, 6), B.head));
    }
  }
  if (o.head === 'orc') for (const s of [-1, 1]) {
    const tusk = prep(new THREE.ConeGeometry(0.01, 0.04, 5)); tusk.translate(s * 0.035, cy - 0.06, 0.1);
    add(plainMat(0xf0e8d0), skin(tusk, B.head));
  }
  if (o.horns || o.head === 'scamp' || o.head === 'dremora' || o.head === 'lizard') {
    const n = o.head === 'lizard' ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const s = n === 2 ? (i ? 1 : -1) : (i - 1.5) / 1.5;
      const horn = prep(new THREE.ConeGeometry(o.head === 'lizard' ? 0.012 : 0.022, o.head === 'dremora' ? 0.22 : 0.11, 6));
      horn.rotateX(o.head === 'lizard' ? -2.2 : -0.45); horn.rotateZ(-s * 0.45);
      horn.translate(s * 0.06, cy + (o.head === 'lizard' ? 0.06 : 0.11), o.head === 'lizard' ? -0.08 : -0.02);
      add(plainMat(o.head === 'lizard' ? o.hair : 0x1a1210, 0.5), skin(horn, B.head));
    }
  }
  if (o.emissiveEyes) for (const s of [-1, 1]) {
    add(glowMat(o.emissiveEyes), skin(ellipsoid(0.014, 1, 0.8, 0.5, s * 0.035, cy + 0.02, 0.108, 8, 6), B.head));
  }
  // hair / helmet
  if (o.armor?.head) {
    const helmM = plateMat(o.armor.head);
    const cap = prep(new THREE.SphereGeometry(0.132, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.62));
    cap.scale(0.95, 1.08, 1.05); cap.translate(0, cy + 0.01, 0);
    add(helmM, skin(cap, B.head));
    add(helmM, skin(prep(new THREE.BoxGeometry(0.02, 0.09, 0.02)).translate(0, cy - 0.005, 0.135), B.head));
    const rim = prep(new THREE.TorusGeometry(0.128, 0.012, 5, 22)); rim.rotateX(Math.PI / 2); rim.scale(0.95, 1, 1.05); rim.translate(0, cy + 0.035, 0);
    add(helmM, skin(rim, B.head));
  } else if (o.hairStyle !== 'bald' && o.head !== 'lizard' && o.head !== 'skull') {
    const hm = hairMat(o.hair);
    const cap = prep(new THREE.SphereGeometry(0.124, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5));
    cap.scale(0.93, 1.12, 1.07); cap.translate(0, cy + 0.012, -0.004);
    add(hm, skin(cap, B.head));
    const back = prep(new THREE.SphereGeometry(0.121, 18, 10, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.45, Math.PI * 0.35));
    back.rotateY(Math.PI); back.scale(0.95, 1.1, 1.05); back.translate(0, cy, -0.006);
    add(hm, skin(back, B.head));
    if (o.hairStyle === 'long' || fem) {
      // theta 0.6π..1.4π puts the hair fall behind the head (z < 0)
      const fall = prep(new THREE.CylinderGeometry(0.105, 0.135, 0.28, 14, 2, true, Math.PI * 0.6, Math.PI * 0.8));
      fall.translate(0, cy - 0.12, -0.02);
      add(hm, skin(fall, B.head, { to: B.neck, fn: (y) => 1 - smooth(cy - 0.2, cy - 0.05, y) }));
    }
    if (o.hairStyle === 'mohawk') add(hm, skin(prep(new THREE.BoxGeometry(0.03, 0.07, 0.22)).translate(0, cy + 0.13, -0.01), B.head));
    if (o.beard) {
      const beard = prep(new THREE.SphereGeometry(0.085, 14, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.5));
      beard.scale(1.0, 1.1, 0.95); beard.translate(0, cy - 0.04, 0.03);
      add(hm, skin(beard, B.head));
    }
  }

  // ---- arms
  for (const side of [-1, 1]) {
    const sh = side < 0 ? B.shL : B.shR, el = side < 0 ? B.elL : B.elR, ha = side < 0 ? B.haL : B.haR;
    const x = side * sx;
    if (bone) {
      add(skinM, skin(limbGeo(x, 1.5, 1.23, 0.022, 0.02, 6), sh));
      add(skinM, skin(limbGeo(x, 1.21, 0.95, 0.018, 0.017, 6), el));
    } else {
      const sleeve = o.sleeves === false && !o.armor?.chest ? skinM : topM;
      add(sleeve, skin(limbGeo(x, 1.5, 1.23, 0.066 * b, 0.055 * b, 12), sh, { to: B.torso, fn: (y) => smooth(1.46, 1.53, y) * 0.55 }));
      add(o.armor?.hands ? handM : (o.robe ? topM : skinM), skin(limbGeo(x, 1.23, 0.97, 0.054 * b, 0.04 * b, 12), el, { to: sh, fn: (y) => smooth(1.18, 1.26, y) * 0.5 }));
    }
    // hand: palm + thumb
    const palm = ellipsoid(0.042, 0.75, 1.25, 0.5, x, 0.905, 0.008, 12, 8);
    const thumb = prep(new THREE.CapsuleGeometry(0.012, 0.03, 3, 6)); thumb.rotateZ(side * 0.6); thumb.translate(x + side * -0.022, 0.92, 0.02);
    add(handM, skin(mergeGeometries([palm, prep(thumb)]), ha, { to: el, fn: (y) => smooth(0.93, 0.97, y) * 0.5 }));
  }

  // ---- legs
  for (const side of [-1, 1]) {
    const hp = side < 0 ? B.hipL : B.hipR, kn = side < 0 ? B.knL : B.knR;
    const x = side * hx;
    if (bone) {
      add(skinM, skin(limbGeo(x, 0.9, 0.49, 0.024, 0.022, 6), hp));
      add(skinM, skin(limbGeo(x, 0.46, 0.07, 0.02, 0.018, 6), kn));
    } else {
      const thighM = o.robe ? skinM : legM;
      add(thighM, skin(limbGeo(x, 0.92, 0.48, 0.09 * b, 0.064 * b, 12), hp, { to: B.hips, fn: (y) => smooth(0.84, 0.94, y) * 0.6 }));
      add(o.armor?.legs ? legM : (o.robe ? skinM : legM), skin(limbGeo(x, 0.48, 0.1, 0.06 * b, 0.042 * b, 12), kn, { to: hp, fn: (y) => smooth(0.43, 0.52, y) * 0.5 }));
      if (!o.armor?.legs) {
        const shaft = prep(new THREE.CylinderGeometry(0.066 * b, 0.058 * b, 0.26, 12, 1, true));
        shaft.translate(x, 0.2, 0);
        add(bootM, skin(shaft, kn));
      }
    }
    // foot / boot
    const foot = prep(new THREE.CapsuleGeometry(0.048, 0.13, 4, 10));
    foot.rotateX(Math.PI / 2); foot.scale(1.05, 0.72, 1); foot.translate(x, 0.04, 0.045);
    add(bone ? skinM : bootM, skin(foot, kn));
  }

  // ---- tail
  if (o.tail) {
    // apex direction (0,-0.6,-0.8): hangs back and down from the base of the spine
    const t = prep(new THREE.ConeGeometry(0.045, 0.75, 8, 4));
    t.rotateX(-2.214); t.translate(0, 0.695, -0.42);
    add(o.tailColor ? skinMat(o.tailColor, o) : skinM, skin(t, B.hips));
  }

  // ---- skeleton
  const bindPos = [
    [0, 0.95, 0], [0, 1.01, 0], [0, 1.59, 0], [0, 1.76, 0],
    [-sx, 1.51, 0], [-sx, 1.22, 0], [-sx, 0.94, 0],
    [sx, 1.51, 0], [sx, 1.22, 0], [sx, 0.94, 0],
    [-hx, 0.9, 0], [-hx, 0.47, 0], [hx, 0.9, 0], [hx, 0.47, 0],
  ];
  const bones = bindPos.map(() => new THREE.Bone());
  bones.forEach((bn, i) => {
    const pp = PARENT[i] >= 0 ? bindPos[PARENT[i]] : [0, 0, 0];
    bn.position.set(bindPos[i][0] - pp[0], bindPos[i][1] - pp[1], bindPos[i][2] - pp[2]);
    if (PARENT[i] >= 0) bones[PARENT[i]].add(bn);
  });
  const skeleton = new THREE.Skeleton(bones);

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(o.scale);
  root.add(body);
  body.add(bones[0]);
  body.updateMatrixWorld(true);
  const meshes = [];
  for (const [mat, list] of parts) {
    const geo = mergeGeometries(list);
    geo.computeBoundingSphere();
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(skeleton);
    m.castShadow = !o.opacity;
    m.receiveShadow = true;
    m.frustumCulled = false;
    body.add(m);
    meshes.push(m);
  }

  // handles matching the animator's expectations
  const L = { shoulder: bones[B.shL], elbow: bones[B.elL], hand: bones[B.haL] };
  const R = { shoulder: bones[B.shR], elbow: bones[B.elR], hand: bones[B.haR] };
  const weaponSlot = new THREE.Group();
  weaponSlot.rotation.x = Math.PI / 2;
  weaponSlot.position.y = -0.03;
  R.hand.add(weaponSlot);
  const shieldSlot = new THREE.Group();
  shieldSlot.position.set(-0.07, -0.12, 0);
  shieldSlot.rotation.y = -Math.PI / 2;
  L.elbow.add(shieldSlot);
  return {
    type: 'humanoid', root, body, skeleton, meshes,
    hips: bones[B.hips], torso: bones[B.torso], neck: bones[B.neck], head: bones[B.head],
    L, R, LL: { hip: bones[B.hipL], knee: bones[B.knL] }, RL: { hip: bones[B.hipR], knee: bones[B.knR] },
    weaponSlot, shieldSlot, height: 1.8 * o.scale, opts: o, floating: !!o.float,
  };
}


// ----------------------------------------------------------------- skinned quadruped (wolves, rats)
function furMat(hex) {
  return material(`fur${hex}`, () => {
    const t = TG.furTex();
    return new THREE.MeshStandardMaterial({ color: hex, map: t.map, normalMap: t.normalMap, roughness: 0.95, vertexColors: true });
  });
}

function shadeBelly(geo, cyBody, lighten = 0.35) {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = p.getY(i) < cyBody ? 1 + lighten : 0.92;
    col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/** opts as the old quadruped: color, len, height, headSize, tail, ears, eyes */
export function buildSkinnedQuadruped(opts = {}) {
  const o = { color: 0x6a6460, len: 1.0, height: 0.75, headSize: 0.2, tail: true, ears: true, ...opts };
  const H = o.height, L = o.len, hs = o.headSize;
  const Q = { body: 0, neck: 1, head: 2, tail: 3, h0: 4, k0: 5, h1: 6, k1: 7, h2: 8, k2: 9, h3: 10, k3: 11 };
  const legSpots = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
  const legLen = H * 0.55;
  const bindPos = [[0, H, 0], [0, H * 1.15, L * 0.6], [0, H * 1.15 + 0.08, L * 0.6 + 0.12], [0, H * 1.1, -L * 0.55]];
  legSpots.forEach(([sx, sz]) => { bindPos.push([sx * H * 0.2, H * 0.95, sz * L * 0.42]); bindPos.push([sx * H * 0.2, H * 0.95 - legLen * 0.7, sz * L * 0.42]); });
  const PAR = [-1, 0, 1, 0, 0, 4, 0, 6, 0, 8, 0, 10];
  const parts = new Map();
  const fm = furMat(o.color);
  const add = (mat, geo) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); };
  const vc = (g) => (g.attributes.color ? g : shadeBelly(g, -1e9, 0));

  // torso: long ellipsoid with a deeper chest
  // a well-fed animal (the Admiral) is wider and hangs lower in the belly
  const fat = o.fat || 1;
  const torso = ellipsoid(1, H * 0.3 * fat, H * 0.33 * (1 + (fat - 1) * 0.6), L * 0.62, 0, H * (1.0 - (fat - 1) * 0.08), -L * 0.02, 20, 14);
  const tp = torso.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const z = tp.getZ(i);
    if (z > 0) { tp.setY(i, tp.getY(i) + (tp.getY(i) - H) * 0.25 * (z / (L * 0.62))); tp.setX(i, tp.getX(i) * (1 + 0.15 * z / (L * 0.62))); }
  }
  torso.computeVertexNormals();
  add(fm, skin(shadeBelly(torso, H * 0.88), Q.body));
  // neck
  const neck = prep(new THREE.CylinderGeometry(H * 0.15, H * 0.22, L * 0.42, 12, 3, true));
  neck.rotateX(-1.1); neck.translate(0, H * 1.12, L * 0.5);
  add(fm, skin(shadeBelly(neck, H * 1.02), Q.neck, { to: Q.body, fn: (y, x, z) => 1 - smooth(L * 0.42, L * 0.62, z) }));
  // head: skull + snout + nose + ears
  const hy = bindPos[Q.head][1], hz = bindPos[Q.head][2];
  add(fm, skin(shadeBelly(ellipsoid(hs * 0.62, 1.0, 0.9, 1.1, 0, hy, hz), hy - hs * 0.2), Q.head));
  const snout = ellipsoid(hs * 0.42, 0.85, 0.65, 1.7, 0, hy - hs * 0.15, hz + hs * 0.75);
  add(fm, skin(shadeBelly(snout, hy - hs * 0.25), Q.head));
  add(plainMat(0x151010, 0.4), skin(ellipsoid(hs * 0.11, 1.2, 0.8, 0.8, 0, hy - hs * 0.08, hz + hs * 1.42, 8, 6), Q.head));
  for (const sx of [-1, 1]) {
    add(glowMat(o.eyes ?? 0xd8a020), skin(ellipsoid(hs * 0.075, 1, 0.8, 0.6, sx * hs * 0.3, hy + hs * 0.12, hz + hs * 0.55, 8, 6), Q.head));
    if (o.ears) {
      const ear = prep(new THREE.ConeGeometry(hs * 0.2, hs * 0.55, 5));
      ear.rotateZ(-sx * 0.25); ear.translate(sx * hs * 0.35, hy + hs * 0.62, hz - hs * 0.1);
      add(fm, skin(vc(ear), Q.head));
    }
  }
  // legs
  legSpots.forEach(([sx, sz], li) => {
    const hip = Q.h0 + li * 2, knee = hip + 1;
    const [x, y0, z] = bindPos[hip];
    const yK = bindPos[knee][1];
    const thigh = limbGeo(x, y0 + H * 0.05, yK, H * 0.11, H * 0.065, 10);
    thigh.translate(0, 0, z);
    add(fm, skin(vc(thigh), hip, { to: Q.body, fn: (y) => smooth(y0 - H * 0.08, y0 + H * 0.06, y) * 0.6 }));
    const shin = limbGeo(x, yK, 0.04, H * 0.06, H * 0.045, 8);
    shin.translate(0, 0, z + (sz > 0 ? 0.01 : -0.02));
    add(fm, skin(vc(shin), knee, { to: hip, fn: (y) => smooth(yK - 0.03, yK + 0.05, y) * 0.5 }));
    const paw = ellipsoid(H * 0.07, 1, 0.55, 1.4, x, 0.03, z + H * 0.04, 8, 6);
    // one white sock, front left
    add(o.sock && li === 0 ? plainMat(0xf2eee6, 0.9) : fm, skin(vc(paw), knee));
    if (o.sock && li === 0) add(plainMat(0xf2eee6, 0.9), skin(vc(limbGeo(x, yK * 0.55, 0.04, H * 0.066, H * 0.05, 8).translate(0, 0, z + 0.01)), knee));
  });
  // tail
  if (o.tail) {
    const t = prep(new THREE.ConeGeometry(H * 0.09, L * 0.65, 8, 4));
    t.rotateX(Math.PI); t.translate(0, -L * 0.3, 0);
    // in the tail bone's local frame (rotated -2.2 about x), hanging down/back
    t.rotateX(-2.2);
    const [tx, ty, tz] = bindPos[Q.tail];
    t.translate(tx, ty, tz);
    add(fm, skin(vc(t), Q.tail));
  }

  const bones = bindPos.map(() => new THREE.Bone());
  bones.forEach((bn, i) => {
    const pp = PAR[i] >= 0 ? bindPos[PAR[i]] : [0, 0, 0];
    bn.position.set(bindPos[i][0] - pp[0], bindPos[i][1] - pp[1], bindPos[i][2] - pp[2]);
    if (PAR[i] >= 0) bones[PAR[i]].add(bn);
  });
  const skeleton = new THREE.Skeleton(bones);
  const root = new THREE.Group();
  root.add(bones[0]);
  root.updateMatrixWorld(true);
  for (const [mat, list] of parts) {
    const geo = mergeGeometries(list.map((g) => (g.attributes.color ? g : shadeBelly(g, -1e9, 0))));
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(skeleton);
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    root.add(m);
  }
  const tail = o.tail ? bones[Q.tail] : null;
  return {
    type: 'quadruped', root, body: bones[Q.body], neck: bones[Q.neck], head: bones[Q.head], tail,
    legs: legSpots.map(([sx, sz], li) => ({ hip: bones[Q.h0 + li * 2], knee: bones[Q.h0 + li * 2 + 1], phase: sx * sz > 0 ? 0 : Math.PI })),
    height: H + 0.2, opts: o,
  };
}
