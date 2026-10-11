// Adapter that turns a kit character (characterKit.js) into a game rig: weapon/shield/bow slots
// computed from the hand bones, racial and creature accessories, and an animation state machine
// that maps the game's combat/movement state onto Universal Animation Library clips.
import * as THREE from 'three';
import { buildKitCharacter, getClip } from './characterKit.js';
import { dressArmor } from './armorSets.js';

const v = new THREE.Vector3(), v2 = new THREE.Vector3(), q = new THREE.Quaternion();

function worldPos(bone) { return bone.getWorldPosition(new THREE.Vector3()); }

/** Convert a world-space direction (in bind pose) to a bone's local space. */
function toLocalDir(bone, dir) {
  bone.getWorldQuaternion(q);
  return dir.clone().applyQuaternion(q.invert()).normalize();
}
function toLocalPoint(bone, p) {
  return bone.worldToLocal(p.clone());
}

const accMat = new Map();
function mat(hex, o = {}) {
  const k = hex + JSON.stringify(o);
  if (!accMat.has(k)) accMat.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1 }));
  return accMat.get(k);
}

/** Attach a rigid mesh to a bone at a world-space bind position/orientation. */
function attach(bone, mesh, worldPosition, worldQuat = null) {
  bone.add(mesh);
  mesh.position.copy(toLocalPoint(bone, worldPosition));
  if (worldQuat) {
    bone.getWorldQuaternion(q);
    mesh.quaternion.copy(q.invert().multiply(worldQuat));
  }
  mesh.castShadow = true;
  return mesh;
}

/**
 * opts: as buildHumanoid's (skin, hair, hairStyle, head, female, beard, armor, robe, scale, opacity,
 *       emissiveEyes, tail, horns, elfEars, shirt, hunch, zombieArms) plus kitOutfit/kitTint.
 */
export function buildKitRig(opts) {
  const head = opts.head || 'human';
  const female = !!opts.female;
  const hasArmor = !!opts.armor && Object.keys(opts.armor).length > 0;
  let outfit = opts.kitOutfit || (hasArmor ? 'ranger' : 'peasant');
  if (head === 'scamp') outfit = 'none';
  const styleMap = { short: female ? 'buns' : 'parted', long: 'long', bald: 'bald', mohawk: 'buzzed', buzzed: 'buzzed' };
  let hairStyle = styleMap[opts.hairStyle] || (female ? 'long' : 'parted');
  if (['lizard', 'scamp', 'dremora', 'goblin', 'skull'].includes(head)) hairStyle = 'bald';
  if (opts.armor?.head) hairStyle = 'bald';
  const PALETTE = [0x7a5a3a, 0x5a6a3a, 0x7a3a2a, 0x3a4a6a, 0x8a7a50, 0x5a3a4a, 0x6a6a5a, 0x4a5a5a];
  const tint = opts.kitTint ?? (hasArmor ? opts.armor.chest : opts.shirt) ?? PALETTE[Math.floor(Math.random() * PALETTE.length)];
  const c = buildKitCharacter({
    sex: female ? 'female' : 'male',
    outfit,
    skin: opts.skin,
    hair: opts.hair,
    hairStyle,
    beard: !!opts.beard && !female,
    outfitTint: tint != null ? (opts.kitTintExact ? tint : lighten(tint)) : undefined,
    eyes: opts.emissiveEyes,
    scale: opts.scale,
    opacity: opts.opacity,
    hideParts: [...(opts.hood ? [] : ['Hood']), ...(opts.armorSets?.chest ? ['Pauldron'] : [])],
    headless: opts.headless,
  });
  if (!c) return null;
  const B = (n) => c.bones.get(n);
  c.root.updateMatrixWorld(true);

  // ---- weapon slot in the right fist: blade runs from the pinky side to the index side (forward)
  const slot = (hand, index, pinky, middle) => {
    const h = worldPos(hand), i = worldPos(index), p = worldPos(pinky), m = worldPos(middle);
    const axis = i.clone().sub(p).normalize();
    const fingers = m.clone().sub(h).normalize();
    const grip = h.clone().lerp(m, 0.9).addScaledVector(new THREE.Vector3().crossVectors(axis, fingers).normalize(), -0.025);
    const g = new THREE.Group();
    // local +Y of the slot along the fist axis; +X toward the fingers
    const yAxis = axis, xAxis = fingers.clone().addScaledVector(axis, -fingers.dot(axis)).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis);
    const wq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
    attach(hand, g, grip, wq);
    return g;
  };
  const weaponSlot = slot(B('hand_r'), B('index_01_r'), B('pinky_01_r'), B('middle_01_r'));
  const bowSlot = slot(B('hand_l'), B('index_01_l'), B('pinky_01_l'), B('middle_01_l'));
  // tilt the blade toward the thumb so idle/guard/block poses point it forward (calibrated against the UAL sword clips)
  weaponSlot.rotateX(-Math.PI / 6);
  // bows: belly toward the fingers (away from the archer)
  bowSlot.rotation.y += Math.PI;
  // shield on the back of the left forearm (+Y in the T-pose bind)
  const fa = B('lowerarm_l');
  const mid = worldPos(fa).lerp(worldPos(B('hand_l')), 0.45).add(new THREE.Vector3(0, 0.07, 0));
  const shieldSlot = new THREE.Group();
  attach(fa, shieldSlot, mid, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));

  // ---- accessories: helmets, horns, ears, tails
  const H = B('Head');
  const headTop = worldPos(H).add(new THREE.Vector3(0, 0.1, 0));
  if (opts.armor?.head && !opts.armorSets?.head) {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(opts.armor.head, { metal: 0.75, rough: 0.35 }));
    helm.scale.set(0.95, 1.05, 1.08);
    attach(H, helm, headTop.clone().add(new THREE.Vector3(0, -0.02, -0.005)));
    const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), mat(opts.armor.head, { metal: 0.75, rough: 0.35 }));
    attach(H, nasal, headTop.clone().add(new THREE.Vector3(0, -0.09, 0.13)));
  }
  if (head === 'cat' || head === 'goblin' || head === 'scamp' || opts.elfEars) {
    for (const s of [-1, 1]) {
      const big = head === 'goblin' || head === 'scamp';
      const ear = new THREE.Mesh(new THREE.ConeGeometry(head === 'cat' ? 0.04 : 0.025, head === 'cat' ? 0.09 : big ? 0.16 : 0.09, 6), mat(opts.skin ?? 0xc89a7a, { rough: 0.8 }));
      const p = head === 'cat' ? headTop.clone().add(new THREE.Vector3(s * 0.07, 0.0, -0.02)) : headTop.clone().add(new THREE.Vector3(s * 0.11, -0.08, -0.02));
      const rotq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, head === 'cat' ? -s * 0.2 : -s * 1.15));
      attach(H, ear, p, rotq);
    }
  }
  if (opts.horns || head === 'scamp' || head === 'dremora' || head === 'lizard') {
    const n = head === 'lizard' ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const s = n === 2 ? (i ? 1 : -1) : (i - 1.5) / 1.5;
      const horn = new THREE.Mesh(new THREE.ConeGeometry(head === 'lizard' ? 0.014 : 0.024, head === 'dremora' ? 0.24 : 0.12, 7), mat(head === 'lizard' ? (opts.hair ?? 0x5a3a20) : 0x1a1210, { rough: 0.5 }));
      const p = headTop.clone().add(new THREE.Vector3(s * 0.06, head === 'lizard' ? -0.03 : 0.0, head === 'lizard' ? -0.09 : -0.02));
      const rotq = new THREE.Quaternion().setFromEuler(new THREE.Euler(head === 'lizard' ? -2.3 : -0.5, 0, -s * 0.45));
      attach(H, horn, p, rotq);
    }
  }
  if (head === 'lizard') {
    // snout ridge so Argonians read as reptilian
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat(opts.skin ?? 0x5a7a48, { rough: 0.7 }));
    snout.scale.set(0.85, 0.6, 1.4);
    attach(H, snout, worldPos(H).add(new THREE.Vector3(0, 0.02, 0.1)));
  }
  if (opts.tail) {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.75, 8, 4), mat(opts.tailColor ?? opts.skin ?? 0x8a6a4a, { rough: 0.85 }));
    const pel = B('pelvis');
    attach(pel, tail, worldPos(pel).add(new THREE.Vector3(0, -0.2, -0.32)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-2.3, 0, 0)));
  }

  const rig = {
    type: 'humanoid', kit: true, root: c.root, body: c.model, mixer: c.mixer, bones: c.bones,
    weaponSlot, shieldSlot, bowSlot,
    L: { hand: B('hand_l'), elbow: B('lowerarm_l'), shoulder: B('upperarm_l') },
    R: { hand: B('hand_r'), elbow: B('lowerarm_r'), shoulder: B('upperarm_r') },
    head: H, neck: B('neck_01'), hips: B('pelvis'), torso: B('spine_02'),
    height: 1.8 * (opts.scale || 1), opts, floating: !!opts.float,
    actions: {}, current: null, lastT: null, deathPlayed: false,
  };
  if (opts.armorSets) dressArmor(rig, B, attach, opts.armorSets);
  return rig;
}

/** Outfit textures are already coloured; tint gently toward the outfit colour so they keep their detail. */
function lighten(hex) {
  return new THREE.Color(0xffffff).lerp(new THREE.Color(hex), 0.55).getHex();
}

// ---------------------------------------------------------------- animation
function action(rig, name) {
  if (rig.actions[name]) return rig.actions[name];
  const clip = getClip(name);
  if (!clip) return null;
  const a = rig.mixer.clipAction(clip);
  rig.actions[name] = a;
  return a;
}

function setAction(rig, name, { loop = true, fade = 0.2, timeScale = 1, synced = null } = {}) {
  let a = action(rig, name);
  if (!a) a = action(rig, 'Idle_Loop');
  if (!a) return;
  if (rig.current !== a) {
    a.reset();
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = !loop;
    a.enabled = true;
    a.setEffectiveWeight(1);
    a.play();
    if (rig.current) rig.current.crossFadeTo(a, fade, false);
    rig.current = a;
  }
  if (synced !== null) {
    a.timeScale = 0;
    a.time = Math.min(a.getClip().duration - 0.001, Math.max(0, synced) * a.getClip().duration);
  } else {
    a.timeScale = timeScale;
  }
}

// ---------------------------------------------------------------- torch arm
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _rq = new THREE.Quaternion();
/** Swing a bone (by weight w) so the direction to its child points along dir (world space). */
function aimBone(bone, child, dir, w) {
  const from = child.getWorldPosition(_a).sub(bone.getWorldPosition(_b)).normalize();
  _q.setFromUnitVectors(from, dir).multiply(bone.getWorldQuaternion(_wq));
  _q.premultiply(bone.parent.getWorldQuaternion(_pq).invert());
  bone.quaternion.slerp(_q, w);
}
/** Lay the left arm over the clip: upper arm down and a little out, forearm raised forward, torch held up. */
function holdTorchArm(rig, w) {
  rig.root.getWorldQuaternion(_rq);
  aimBone(rig.L.shoulder, rig.L.elbow, _d.set(0.3, -0.82, 0.4).normalize().applyQuaternion(_rq), w);
  aimBone(rig.L.elbow, rig.L.hand, _d.set(0.1, 0.42, 0.9).normalize().applyQuaternion(_rq), w);
}

/**
 * state: { moveSpeed, attack (-1|0..1), attackKind, block, cast, draw, dead, stagger, sneak, weaponOut, talking, swimming }
 */
export function animateKit(rig, s, t) {
  const dt = rig.lastT === null ? 0 : Math.min(0.1, Math.max(0, t - rig.lastT));
  rig.lastT = t;
  const zombie = !!rig.opts.zombieArms;
  const speed = s.moveSpeed || 0;
  if (s.dead > 0) {
    setAction(rig, 'Death01', { loop: false, fade: 0.15 });
  } else if (s.attack >= 0) {
    const kind = s.attackKind;
    const clip = zombie ? 'Zombie_Scratch'
      : kind === 'punch' || kind === 'bite' ? (rig.punchAlt ? 'Punch_Cross' : 'Punch_Jab')
      : kind === 'power' ? 'Sword_Attack'
      : ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C'][rig.swing || 0];
    if (rig.lastAttack !== kind || s.attack < rig.prevAttack) { rig.swing = Math.floor(Math.random() * 3); rig.punchAlt = !rig.punchAlt; }
    rig.prevAttack = s.attack;
    rig.lastAttack = kind;
    setAction(rig, clip, { loop: false, fade: 0.08, synced: Math.min(1, s.attack * 0.95 + 0.02) });
  } else if (s.cast >= 0) {
    setAction(rig, s.castClip || 'Spell_Simple_Shoot', { loop: false, fade: 0.1, synced: Math.min(1, s.cast) });
  } else if (s.draw >= 0) {
    setAction(rig, 'Pistol_Aim_Neutral', { fade: 0.15 });
  } else if (s.block) {
    setAction(rig, rig.hasShield ? 'Idle_Shield_Loop' : 'Sword_Block', { loop: !!rig.hasShield, fade: 0.12, synced: rig.hasShield ? null : 0.35 });
  } else if (s.stagger > 0.15) {
    setAction(rig, 'Hit_Chest', { loop: false, fade: 0.06, synced: (1 - s.stagger) / 0.85 });
  } else if (s.swimming) {
    setAction(rig, speed > 0.4 ? 'Swim_Fwd_Loop' : 'Swim_Idle_Loop');
  } else if (speed > 0.3) {
    if (zombie) setAction(rig, 'Zombie_Walk_Fwd_Loop', { timeScale: Math.max(0.6, speed / 1.2) });
    else if (s.sneak) setAction(rig, 'Crouch_Fwd_Loop', { timeScale: Math.max(0.6, speed / 1.6) });
    else if (speed < 2.6) setAction(rig, 'Walk_Loop', { timeScale: Math.max(0.6, speed / 1.5) });
    else if (speed < 6.2) setAction(rig, 'Jog_Fwd_Loop', { timeScale: Math.max(0.7, speed / 4.2) });
    else setAction(rig, 'Sprint_Loop', { timeScale: speed / 6.5 });
  } else if (s.sneak) {
    setAction(rig, 'Crouch_Idle_Loop');
  } else if (zombie) {
    setAction(rig, 'Zombie_Idle_Loop');
  } else if (s.talking) {
    setAction(rig, 'Idle_Talking_Loop', { fade: 0.4 });
  } else if (s.idleAnim) {
    setAction(rig, s.idleAnim, { fade: 0.4 });
  } else if (s.weaponOut) {
    setAction(rig, rig.hasShield ? 'Idle_Shield_Loop' : 'Sword_Idle', { fade: 0.3 });
  } else {
    setAction(rig, 'Idle_Loop', { fade: 0.4 });
  }
  rig.mixer.update(dt);
  // a carried torch is held up and forward, except while the arm is busy fighting, casting or swimming
  if (rig.holdTorch) {
    const want = s.dead > 0 || s.attack >= 0 || s.cast >= 0 || s.draw >= 0 || s.swimming ? 0 : 1;
    rig.torchW = (rig.torchW ?? want) + (want - (rig.torchW ?? want)) * Math.min(1, dt * 6);
    if (rig.torchW > 0.01) holdTorchArm(rig, rig.torchW);
  }
  // ghosts drift above the ground
  if (rig.floating && rig.body) rig.body.position.y = 0.15 + Math.sin(t * 2) * 0.08;
}
