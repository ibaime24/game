// First-person arms + weapon, rendered in a separate overlay pass.
import * as THREE from 'three';
import { game } from './game.js';
import { ITEMS } from './data/items.js';
import { RACES } from './data/stats.js';
import { SPELLS } from './data/spells.js';
import { buildWeaponMesh, buildShieldMesh, buildArrowMesh, mat } from './actors/models.js';
import { softSprite } from './world/textures.js';
import * as TG from './world/texgen.js';
import { KitArms } from './fpArms.js';
import { buildLightMesh } from './fx/torch.js';
import { attachBladeFx, bladeLightColor } from './fx/bladefx.js';
import { magicTextures, setLinePoints } from './fx/magic.js';
import { buildCarriedFlame } from './fx/flames.js';
import { isKitReady } from './actors/characterKit.js';

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

// Casting gestures for the left hand, in camera space: keyframes [t, x, y, z, open(0..1), fingers dir, fist dir]
const F = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const GESTURES = {
  push: [[0, -0.2, -0.2, -0.42, 0.3, F(0.2, 1, -0.3), F(1, 0, 0.2)], [0.3, -0.24, -0.16, -0.36, 0.2, F(0.2, 1, 0.1), F(1, 0, 0.2)], [0.45, -0.1, -0.12, -0.7, 1, F(0.1, 0.9, -0.5), F(1, 0, 0.2)], [1, -0.12, -0.15, -0.62, 1, F(0.1, 0.9, -0.6), F(1, 0, 0.2)]],
  raise: [[0, -0.22, -0.32, -0.45, 0.4, F(0, 0.3, -1), F(1, 0, 0)], [0.25, -0.2, -0.05, -0.5, 0.8, F(0, 1, -0.3), F(1, 0, 0.3)], [0.42, -0.14, 0.24, -0.48, 1, F(0, 1, -0.1), F(1, 0, 0.5)], [1, -0.16, 0.12, -0.5, 1, F(0, 1, -0.2), F(1, 0, 0.5)]],
  sweep: [[0, -0.36, -0.18, -0.42, 0.6, F(-0.3, 0.8, -0.5), F(1, 0, 0.1)], [0.22, -0.44, -0.14, -0.4, 0.8, F(-0.4, 0.8, -0.4), F(1, 0.1, 0.1)], [0.5, 0.12, -0.2, -0.56, 1, F(0.5, 0.7, -0.5), F(1, -0.1, 0)], [1, 0.06, -0.22, -0.52, 1, F(0.4, 0.7, -0.5), F(1, -0.1, 0)]],
  slam: [[0, -0.18, -0.25, -0.45, 0.3, F(0, 0.4, -1), F(1, 0, 0)], [0.3, -0.16, 0.06, -0.5, 0.8, F(0, -0.2, -1), F(1, 0, 0)], [0.44, -0.16, -0.42, -0.56, 1, F(0, -0.3, -1), F(1, 0, 0)], [1, -0.17, -0.36, -0.55, 1, F(0, -0.2, -1), F(1, 0, 0)]],
  pull: [[0, -0.18, -0.18, -0.48, 0.6, F(0, 0.6, -1), F(1, 0, 0)], [0.32, -0.12, -0.12, -0.74, 1, F(0, 0.5, -1), F(1, 0, 0)], [0.45, -0.13, -0.13, -0.7, 0, F(0, 0.5, -1), F(1, 0, 0)], [0.7, -0.22, -0.2, -0.38, 0, F(0, 0.8, -0.5), F(1, 0, 0)], [1, -0.22, -0.22, -0.4, 0.2, F(0, 0.8, -0.5), F(1, 0, 0)]],
  self: [[0, -0.2, -0.28, -0.45, 0.3, F(0, 1, -0.4), F(1, 0, 0)], [0.3, -0.05, -0.28, -0.33, 0.8, F(0.2, 1, 0.3), F(1, 0, 0.3)], [0.5, -0.06, -0.26, -0.34, 1, F(0.2, 1, 0.4), F(1, 0, 0.3)], [1, -0.16, -0.22, -0.5, 1, F(0, 1, -0.3), F(1, 0, 0)]],
  flick: [[0, -0.2, -0.22, -0.44, 0.1, F(0, 0.5, -1), F(1, 0, 0)], [0.32, -0.24, -0.2, -0.4, 0, F(0, 0.8, -0.2), F(1, 0, 0)], [0.42, -0.08, -0.12, -0.64, 1, F(0.1, 0.4, -1), F(1, 0, 0.2)], [1, -0.1, -0.14, -0.6, 1, F(0.1, 0.5, -1), F(1, 0, 0.2)]],
};
// Melee swings for the first-person arms, in camera space: where the grip is and which way the blade points.
// Every key stays within the arm's reach (the shoulder sits ~0.2 m behind the eye, the arm is ~0.49 m long),
// so the IK never clamps and the hand really travels the arc. Keys: [t, grip, blade, ease into the next key].
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const READY = { pos: V(0.23, -0.19, -0.23), blade: D(-0.22, 0.92, -0.3) };
const BLOCK = { pos: V(0.1, -0.08, -0.25), blade: D(-1, 0.12, -0.25) };
const SWINGS = {
  // forehand: cock the blade up past the right shoulder, then cut down and across to the lower left
  fore: { trail: [0.33, 0.6], keys: [
    [0, READY.pos, READY.blade, 'io'],
    [0.24, V(0.25, -0.06, -0.2), D(0.3, 0.9, 0.3), 'io'],
    [0.33, V(0.27, -0.04, -0.19), D(0.45, 0.8, 0.4), 'in'],
    [0.42, V(0.1, -0.14, -0.25), D(-0.85, 0.35, -0.4), 'out'],
    [0.52, V(-0.04, -0.22, -0.2), D(-0.6, -0.55, -0.55), 'out'],
    [0.64, V(-0.04, -0.27, -0.17), D(-0.4, -0.8, -0.4), 'io'],
    [1, READY.pos, READY.blade, 'io'],
  ] },
  // backhand: draw the blade back low across the body, then sweep out flat to the right
  back: { trail: [0.33, 0.6], keys: [
    [0, READY.pos, READY.blade, 'io'],
    [0.24, V(0.0, -0.17, -0.2), D(-0.75, 0.45, 0.45), 'io'],
    [0.33, V(-0.03, -0.16, -0.18), D(-0.8, 0.35, 0.5), 'in'],
    [0.42, V(0.12, -0.12, -0.25), D(-0.15, 0.35, -0.92), 'out'],
    [0.52, V(0.29, -0.14, -0.18), D(0.85, -0.05, -0.5), 'out'],
    [0.64, V(0.32, -0.21, -0.12), D(0.7, -0.45, -0.1), 'io'],
    [1, READY.pos, READY.blade, 'io'],
  ] },
  // power attack: heave the weapon up over your head, hang there a beat, and chop straight down the middle
  power: { trail: [0.4, 0.66], keys: [
    [0, READY.pos, READY.blade, 'io'],
    [0.28, V(0.21, 0.06, -0.14), D(0.1, 0.75, 0.65), 'io'],
    [0.4, V(0.21, 0.08, -0.13), D(0.1, 0.6, 0.8), 'in'],
    [0.5, V(0.08, -0.1, -0.24), D(-0.05, 0.3, -0.95), 'out'],
    [0.6, V(0.06, -0.22, -0.21), D(-0.1, -0.75, -0.65), 'out'],
    [0.76, V(0.06, -0.27, -0.17), D(-0.15, -0.82, -0.5), 'io'],
    [1, READY.pos, READY.blade, 'io'],
  ] },
};
const EASE = {
  io: (f) => f * f * (3 - 2 * f),
  in: (f) => f * f * f,
  out: (f) => 1 - (1 - f) ** 2.2,
};
const catmull = (a, b, c, d, f, out) => {
  const f2 = f * f, f3 = f2 * f;
  return out.set(0, 0, 0)
    .addScaledVector(a, -0.5 * f3 + f2 - 0.5 * f)
    .addScaledVector(b, 1.5 * f3 - 2.5 * f2 + 1)
    .addScaledVector(c, -1.5 * f3 + 2 * f2 + 0.5 * f)
    .addScaledVector(d, 0.5 * f3 - 0.5 * f2);
};
/** Spherical interpolation between two unit vectors. */
function slerpDir(a, b, f, out) {
  const th = Math.acos(Math.min(1, Math.max(-1, a.dot(b))));
  if (th < 1e-3) return out.copy(a).lerp(b, f).normalize();
  const s = Math.sin(th);
  return out.copy(a).multiplyScalar(Math.sin((1 - f) * th) / s).addScaledVector(b, Math.sin(f * th) / s).normalize();
}
/** Grip position and blade direction of a swing at time t (0..1): a smooth arc through the keys. */
function sampleSwing(S, t, pos, blade) {
  const K = S.keys;
  let i = 0;
  while (i < K.length - 2 && K[i + 1][0] <= t) i++;
  const a = K[i], b = K[i + 1];
  const f = EASE[a[3]](Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))));
  catmull(K[Math.max(0, i - 1)][1], a[1], b[1], K[Math.min(K.length - 1, i + 2)][1], f, pos);
  slerpDir(a[2], b[2], f, blade);
}
const TRAIL_N = 18;
const _sp = new THREE.Vector3(), _sb = new THREE.Vector3(), _tp = new THREE.Vector3();

const _gv = new THREE.Vector3();
/** Sample a gesture at time t: { pos, open, fingers, fist, w (blend weight) }. */
function gesture(anim, t) {
  const K = GESTURES[anim] || GESTURES.push;
  let i = 0;
  while (i < K.length - 2 && K[i + 1][0] <= t) i++;
  const a = K[i], b = K[i + 1];
  let f = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])));
  f = f * f * (3 - 2 * f);
  const w = Math.min(1, t / 0.1) * Math.min(1, (1 - t) / 0.25);
  return {
    pos: new THREE.Vector3(a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f),
    open: a[4] + (b[4] - a[4]) * f,
    fingers: _gv.copy(a[5]).lerp(b[5], f).normalize().clone(),
    fist: a[6].clone().lerp(b[6], f).normalize(),
    w: Math.max(0, w),
  };
}

export class ViewModel {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.01, 10);
    this.amb = new THREE.HemisphereLight(0xffffff, 0x404040, 1.2);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.position.set(0.5, 1, 0.3);
    this.scene.add(this.amb, this.sun);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.drawOffset = 1; // 1 = lowered, 0 = ready
    this.castGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite(), color: 0xff8040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.castGlow.scale.setScalar(0.18);
    // charge-up: motes spiralling into the palm, and a light that colours the hand
    this.castMotes = new THREE.Group();
    const MT = magicTextures();
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 2 ? MT.star : softSprite(), color: 0xff8040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      m.userData.phase = i / 10;
      this.castMotes.add(m);
    }
    this.scene.add(this.castMotes);
    this.castLight = new THREE.PointLight(0xff8040, 0, 1.2, 2);
    this.scene.add(this.castLight);
    // the element gathers in the palm: a flame, a turning snowflake, or a star of lightning
    const sm = (tex) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.castStar = sm(MT.star);
    this.castFlake = sm(MT.flake);
    this.palmFlame = buildCarriedFlame(0.07, { halo: 3 });
    this.palmFlame.userData.uniforms.uNight.value = 1;
    this.palmArcs = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe8f0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.palmArcs.frustumCulled = false;
    this.scene.add(this.castStar, this.castFlake, this.palmFlame, this.palmArcs);
    // the carried torch warms the hand and sleeve holding it
    this.torchLight = new THREE.PointLight(0xff9440, 0, 2.5, 2);
    this.scene.add(this.torchLight);
    this.torchTip = new THREE.Vector3(); // world position of the flame base (valid while torchMesh is shown)
    // an elemental blade lights the hand that holds it
    this.bladeLight = new THREE.PointLight(0xff8030, 0, 2.6, 2);
    this.scene.add(this.bladeLight);
    this.bladeTip = new THREE.Vector3();
    this.bladeShown = false;
    this.torchHeld = false;
    this.torchScale = 0.78; // a touch under life size: it sits much nearer the eye than an outstretched arm would
    // the swing trail: a ribbon swept by the blade through the fast part of each stroke
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TRAIL_N + 1) * 2 * 3), 3));
    tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array((TRAIL_N + 1) * 2 * 3), 3));
    const idx = [];
    for (let i = 0; i < TRAIL_N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    tg.setIndex(idx);
    this.trail = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.trail.frustumCulled = false;
    this.trail.visible = false;
    this.scene.add(this.trail);
    this.trailCol = new THREE.Color();
    // the weapon lags a little behind the view when you look around
    this.sway = new THREE.Vector2();
    this.swingPos = READY.pos.clone();
    this.swingBlade = READY.blade.clone();
    this.blockK = 0;
    this.bladeLen = 0.9;
    this.rebuild();
  }

  arm(skin, sleeve, gauntlet) {
    const g = new THREE.Group();
    const skinT = TG.skinTex(), fab = TG.fabricTex(), plate = TG.plateTex();
    const skinM = new THREE.MeshStandardMaterial({ color: skin, map: skinT.map, normalMap: skinT.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.6 });
    const glove = gauntlet != null ? new THREE.MeshStandardMaterial({ color: gauntlet, map: plate.map, normalMap: plate.normalMap, roughness: 0.35, metalness: 0.7 }) : skinM;
    const sleeveM = new THREE.MeshStandardMaterial({ color: sleeve, map: fab.map, normalMap: fab.normalMap, roughness: 0.9 });
    // tapered forearm (wrist at the hand, elbow toward the camera)
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.05, 0.34, 14, 3), gauntlet != null ? glove : skinM);
    fore.rotation.x = Math.PI / 2;
    fore.position.z = 0.19;
    g.add(fore);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.22, 14, 1, true), sleeveM);
    sl.rotation.x = Math.PI / 2;
    sl.position.z = 0.4;
    g.add(sl);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.01, 6, 16), sleeveM);
    cuff.position.z = 0.3;
    g.add(cuff);
    // a gripping hand: palm, curled fingers, thumb
    const hand = new THREE.Group();
    g.add(hand);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), glove);
    palm.scale.set(0.95, 0.7, 1.3);
    hand.add(palm);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.035, 3, 8), glove);
      f.position.set(-0.026 + i * 0.017, 0.012, -0.045);
      f.rotation.x = 1.2;
      hand.add(f);
      const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.022, 3, 8), glove);
      tip.position.set(-0.026 + i * 0.017, -0.012, -0.06);
      tip.rotation.x = 2.6;
      hand.add(tip);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.04, 3, 8), glove);
    thumb.position.set(-0.045, 0.012, -0.02);
    thumb.rotation.set(0.9, 0, 0.9);
    hand.add(thumb);
    g.userData.hand = hand;
    return g;
  }

  rebuild() {
    const p = game.player;
    this.root.clear();
    this.kit = null;
    if (!p) return;
    if (isKitReady() && p.modelOpts && this.buildKit(p)) return;
    const race = RACES[p.ch.race];
    const chest = p.equipped.chest ? ITEMS[p.equipped.chest] : null;
    const hands = p.equipped.hands ? ITEMS[p.equipped.hands] : null;
    const sleeve = chest ? chest.color : 0x8a7a60;
    this.right = this.arm(race.skin, sleeve, hands?.color);
    this.left = this.arm(race.skin, sleeve, hands?.color);
    this.root.add(this.right, this.left);
    const w = p.equippedWeapon();
    this.weaponMesh = null;
    this.bowMesh = null;
    this.arrowMesh = null;
    if (w?.look) {
      const m = buildWeaponMesh(w.look);
      if (w.skill === 'marksman') {
        m.rotation.set(0, Math.PI / 2, 0.0);
        this.left.userData.hand.add(m);
        this.bowMesh = m;
        this.arrowMesh = buildArrowMesh();
        this.arrowMesh.scale.setScalar(0.9);
        this.root.add(this.arrowMesh);
      } else {
        m.rotation.x = -Math.PI / 2 + 0.75; // blade points forward and up
        m.scale.setScalar(0.8);
        this.right.userData.hand.add(m);
        this.weaponMesh = m;
        attachBladeFx(m, w.look);
      }
    }
    this.shieldMesh = null;
    this.torchMesh = null;
    if (p.torchLit) {
      this.torchMesh = buildLightMesh(ITEMS[p.equipped.shield]);
      this.torchMesh.scale.setScalar(this.torchScale);
      this.torchMesh.rotation.x = -Math.PI / 2 + 1.25;
      this.left.userData.hand.add(this.torchMesh);
    } else if (p.equipped.shield && w?.skill !== 'marksman') {
      this.shieldMesh = buildShieldMesh(ITEMS[p.equipped.shield].color);
      this.shieldMesh.position.set(0.05, 0, 0.05);
      this.shieldMesh.scale.setScalar(0.62);
      this.shieldMesh.rotation.y = 0;
      this.left.userData.hand.add(this.shieldMesh);
    }
    this.left.userData.hand.add(this.castGlow);
    this.castGlow.position.set(0, 0.02, -0.08);
  }

  /** Real arms from the character kit. Returns false to fall back to the simple arms. */
  buildKit(p) {
    const kit = new KitArms(p.modelOpts);
    if (!kit.ok) return false;
    this.kit = kit;
    this.root.add(kit.root);
    const w = p.equippedWeapon();
    this.weaponMesh = null; this.bowMesh = null; this.arrowMesh = null; this.shieldMesh = null;
    if (w?.look) {
      const m = buildWeaponMesh(w.look);
      if (w.skill === 'marksman') {
        kit.side.l.grip.add(m);
        this.bowMesh = m;
        this.arrowMesh = buildArrowMesh();
        this.root.add(this.arrowMesh);
      } else {
        const box = new THREE.Box3().setFromObject(m);
        this.bladeLen = Math.max(0.3, box.max.y);
        kit.side.r.grip.add(m);
        this.weaponMesh = m;
        attachBladeFx(m, w.look);
        const fx = w.look.fx;
        this.trailCol.setHex(fx === 'fire' ? 0xff9a50 : fx === 'shock' ? 0x9ac0ff : fx ? bladeLightColor(fx) : 0xdfe6ee);
      }
    }
    this.torchMesh = null;
    if (p.torchLit) {
      this.torchMesh = buildLightMesh(ITEMS[p.equipped.shield]);
      this.torchMesh.scale.setScalar(this.torchScale);
      kit.side.l.grip.add(this.torchMesh);
    } else if (p.equipped.shield && w?.skill !== 'marksman') {
      this.shieldMesh = buildShieldMesh(ITEMS[p.equipped.shield].color);
      this.shieldMesh.scale.setScalar(0.72);
      kit.side.l.grip.add(this.shieldMesh);
    }
    this.root.add(this.castGlow);
    this.right = this.left = null;
    this.kitFingers = { r: 0, l: 0 };
    return true;
  }

  update(dt, mainCam) {
    const p = game.player;
    if (!p) return;
    if (!this.kit && isKitReady() && p.modelOpts) this.rebuild();
    this.camera.fov = mainCam.fov;
    this.camera.aspect = mainCam.aspect;
    this.camera.updateProjectionMatrix();
    this.root.visible = !p.thirdPerson && !p.dead && game.state === 'playing' && (this.drawOffset < 0.97 || p.castT >= 0 || !!this.torchMesh);
    this.scene.environment = game.scene.environment;
    this.scene.environmentIntensity = (game.scene.environmentIntensity ?? 0.4) * 1.4;
    // lighting follows world
    if (game.cell && !game.cell.interior) {
      this.sun.color.copy(game.sunLight.color);
      this.sun.intensity = game.sunLight.intensity * 0.6;
      this.amb.color.copy(game.hemi.color);
      this.amb.intensity = 0.6 + game.hemi.intensity * 0.6;
    } else {
      this.sun.color.set(0xffd8a0); this.sun.intensity = 0.9;
      this.amb.color.set(0xffe0c0); this.amb.intensity = 1.1;
    }

    const ready = p.weaponOut || p.attackT >= 0 || p.blocking || p.drawT >= 0;
    this.drawOffset = lerp(this.drawOffset, ready ? 0 : 1, Math.min(1, dt * 8));
    const t = game.clockT;
    const bobAmt = Math.min(1, (p.speedNow || 0) / 5);
    // look-sway: the arms trail the view a touch, then spring back
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const dYaw = this._yaw === undefined ? 0 : wrap(p.yaw - this._yaw), dPitch = this._pitch === undefined ? 0 : p.pitch - this._pitch;
    this._yaw = p.yaw; this._pitch = p.pitch;
    const k = Math.min(1, dt * 9), inv = dt > 0 ? 1 / dt : 0;
    this.sway.x += (THREE.MathUtils.clamp(dYaw * inv * 0.008, -0.045, 0.045) - this.sway.x) * k;
    this.sway.y += (THREE.MathUtils.clamp(-dPitch * inv * 0.008, -0.035, 0.035) - this.sway.y) * k;
    const bx = Math.sin(p.bob || 0) * 0.012 * bobAmt + this.sway.x;
    const by = -Math.abs(Math.cos(p.bob || 0)) * 0.012 * bobAmt + Math.sin(t * 1.6) * 0.003 + this.sway.y;

    const R = this.right, L = this.left;
    const low = this.drawOffset;
    const bow = !!this.bowMesh;
    // the torch is held up whenever the hand isn't busy with a spell or a drawn bow
    const torch = !!this.torchMesh && p.castT < 0 && (!bow || low > 0.5);
    this.torchHeld = torch;
    if (this.torchMesh) this.torchMesh.visible = torch;
    if (this.bowMesh && this.torchMesh) this.bowMesh.visible = !torch;
    // with a torch up the arms stay on screen, so a sheathed weapon has to be put away properly
    if (this.weaponMesh) this.weaponMesh.visible = !this.torchMesh || low < 0.6;

    // ---------------- right arm
    // base pose: hand at lower right, forearm pointing back toward camera
    let rx = 0.26 + bx, ry = -0.26 + by - low * 0.7, rz = -0.42;
    let rrx = 0.25, rry = 0.15, rrz = -0.1;
    if (!this.weaponMesh && !bow) { rx = 0.22 + bx; ry = -0.24 + by - low * 0.4; rrx = 0.1; }
    if (p.attackT >= 0) {
      const a = p.attackT;
      if (!this.weaponMesh) {
        // punch
        const k = a < 0.4 ? ease(a / 0.4) : 1 - ease((a - 0.4) / 0.6);
        rz -= k * 0.3; rx -= k * 0.12; ry += k * 0.05;
      } else if (p.attackKind === 'power') {
        if (a < 0.4) { const k = ease(a / 0.4); ry += k * 0.28; rrx += k * 1.1; rx -= k * 0.08; }
        else if (a < 0.62) { const k = ease((a - 0.4) / 0.22); ry += 0.28 - k * 0.45; rrx += 1.1 - k * 2.0; rx -= 0.08; rz -= k * 0.1; }
        else { const k = ease((a - 0.62) / 0.38); ry += -0.17 + k * 0.17; rrx += -0.9 + k * 0.9; rx -= 0.08 * (1 - k); rz -= 0.1 * (1 - k); }
      } else {
        if (a < 0.32) { const k = ease(a / 0.32); rx += k * 0.12; ry += k * 0.12; rry += k * 0.9; rrz -= k * 0.6; }
        else if (a < 0.58) { const k = ease((a - 0.32) / 0.26); rx += 0.12 - k * 0.5; ry += 0.12 - k * 0.12; rry += 0.9 - k * 2.2; rrz -= 0.6 - k * 1.0; rz -= k * 0.08; }
        else { const k = ease((a - 0.58) / 0.42); rx += -0.38 + k * 0.38; rry += -1.3 + k * 1.3; rrz += 0.4 * (1 - k); rz -= 0.08 * (1 - k); }
      }
    } else if (p.attackHold > 0.1 && this.weaponMesh) {
      const k = Math.min(1, (p.attackHold - 0.1) / 0.25);
      ry += k * 0.1; rrx += k * 0.5;
    }
    if (p.blocking && !this.shieldMesh) {
      rx = 0.05; ry = -0.12; rz = -0.4; rrx = 0.2; rry = 0.0; rrz = 1.35;
    }
    if (bow) {
      // drawing hand
      const d = p.drawT >= 0 ? ease(p.drawT) : 0;
      rx = lerp(0.2, 0.06, d > 0 ? 1 : 0) + bx; ry = -0.25 + by - low * 0.35 + (d > 0 ? 0.13 : 0); rz = -0.55 + d * 0.3;
      rrx = 0; rry = 0; rrz = 0;
    }
    if (!this.kit) {
      R.position.set(rx, ry, rz);
      R.rotation.set(rrx, rry, rrz);
    }

    // ---------------- left arm
    let lx = -0.3 + bx, ly = -0.4 + by - 0.3, lz = -0.42;
    let lrx = 0.2, lry = -0.1, lrz = 0.1;
    if (this.shieldMesh) { ly = -0.36 + by - low * 0.5; lx = -0.4 + bx; lz = -0.48; lry = -0.5; }
    if (p.blocking && this.shieldMesh) { lx = -0.1; ly = -0.16; lz = -0.42; lry = 0.0; lrx = 0.1; }
    if (this.shieldMesh) this.shieldMesh.visible = p.castT < 0;
    if (p.castT >= 0) {
      const G = gesture(p.castAnim, Math.min(1, p.castT));
      lx = lerp(lx, G.pos.x, G.w); ly = lerp(ly, G.pos.y + by, G.w); lz = lerp(lz, G.pos.z, G.w); lrx = lerp(lrx, -0.1, G.w);
      this.gest = G;
    } else this.gest = null;
    if (bow && !torch) {
      lx = -0.08 + bx; ly = -0.14 + by - low * 0.4; lz = -0.6; lrx = 0; lry = 0; lrz = 0.15;
    }
    if (torch) {
      // held out at the lower left, breathing a little; it dips toward the guard when blocking
      lx = -0.35 + bx + Math.sin(t * 0.9) * 0.006; ly = -0.32 + by + Math.sin(t * 1.3) * 0.005 - (p.blocking ? 0.06 : 0); lz = -0.56;
      lrx = 0; lry = 0; lrz = 0;
    }
    const swing = this.kit && this.weaponMesh ? this.swingPose(dt, p, bx, by, low, t) : null;
    if (this.kit) this.poseKit(dt, p, { rx, ry, rz, rrx, rry, rrz, lx, ly, lz, lrx, lry, lrz, bow: bow && !torch, rbow: bow, torch, by, swing });
    else {
      L.position.set(lx, ly, lz);
      L.rotation.set(lrx, lry, lrz);
    }
    this.updateTrail(p, swing);

    // the torch: where its flame sits in the world, and its warm light on the arm
    if (this.torchMesh) {
      this.root.updateMatrixWorld(true);
      const tip = this.torchMesh.userData.tip.getWorldPosition(new THREE.Vector3());
      this.torchLight.position.copy(tip).add(new THREE.Vector3(0.08, 0.14, 0.1));
      this.torchLight.intensity = torch ? 1.1 * (0.85 + 0.15 * Math.sin(t * 9.7) * Math.sin(t * 6.1)) : 0;
      mainCam.updateMatrixWorld();
      this.torchTip.copy(tip).applyMatrix4(mainCam.matrixWorld);
    } else this.torchLight.intensity = 0;

    // an elemental blade: where it glows in the world, and its light on the hands
    const fxKind = this.weaponMesh && p.equippedWeapon()?.look?.fx;
    this.bladeShown = !!fxKind && this.weaponMesh.visible && this.root.visible && this.drawOffset < 0.6;
    if (this.bladeShown) {
      this.root.updateMatrixWorld(true);
      const mid = this.weaponMesh.localToWorld(new THREE.Vector3(0, 0.55, 0));
      this.bladeLight.position.copy(mid).add(new THREE.Vector3(0, 0.05, 0.12));
      this.bladeLight.color.setHex(fxKind === 'fire' ? 0xff8030 : fxKind === 'shock' ? 0x8ab8ff : bladeLightColor(fxKind));
      this.bladeLight.intensity = (fxKind === 'fire' ? 0.9 : 1.1) * (0.8 + Math.random() * (fxKind === 'shock' ? 0.5 : 0.25));
      mainCam.updateMatrixWorld();
      this.bladeTip.copy(mid).applyMatrix4(mainCam.matrixWorld);
    } else this.bladeLight.intensity = 0;

    // casting glow
    const sp = SPELLS[p.selectedSpell];
    if (this.kit) this.castGlow.position.copy(this.kitPalm || this.castGlow.position);
    this.castGlow.visible = p.castT >= 0;
    if (sp) this.castGlow.material.color.setHex(sp.color);
    this.castGlow.scale.setScalar(this.kit ? 0.06 + (p.castT >= 0 ? Math.sin(p.castT * Math.PI) * 0.12 : 0) : 0.12 + (p.castT >= 0 ? Math.sin(p.castT * Math.PI) * 0.25 : 0));
    const charging = p.castT >= 0 && this.root.visible;
    const centre = this.castGlow.getWorldPosition(new THREE.Vector3());
    this.castMotes.visible = charging;
    // the element in the palm
    const el = sp?.element || (sp?.color ? null : null);
    const k0 = charging ? Math.sin(Math.min(1, p.castT) * Math.PI) : 0;
    this.palmFlame.visible = charging && el === 'fire';
    this.castFlake.visible = charging && el === 'frost';
    this.palmArcs.visible = charging && el === 'shock';
    this.castStar.visible = charging;
    if (charging) {
      this.castStar.position.copy(centre);
      this.castStar.material.color.setHex(sp.color).lerp(new THREE.Color(1, 1, 1), 0.5);
      this.castStar.scale.setScalar((el === 'shock' ? 0.16 + Math.random() * 0.1 : 0.12) * (0.4 + k0));
      this.castStar.material.rotation += dt * (el === 'shock' ? 9 : 2);
      if (el === 'fire') {
        this.palmFlame.position.copy(centre).add(new THREE.Vector3(0, -0.02, 0));
        this.palmFlame.scale.setScalar(0.4 + k0 * 0.9);
        this.palmFlame.userData.uniforms.uTime.value = t;
      }
      if (el === 'frost') {
        this.castFlake.position.copy(centre);
        this.castFlake.scale.setScalar(0.07 + k0 * 0.1);
        this.castFlake.material.color.setRGB(0.8, 0.94, 1);
        this.castFlake.material.rotation += dt * 4;
      }
      if (el === 'shock') {
        const pts = [];
        for (let a = 0; a < 4; a++) {
          let q = centre.clone();
          for (let s = 0; s < 4; s++) {
            const n = q.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06));
            pts.push(q, n);
            q = n;
          }
        }
        setLinePoints(this.palmArcs, pts);
      }
    }
    this.castLight.intensity = charging ? Math.sin(Math.min(1, p.castT) * Math.PI) * 0.9 : 0;
    if (sp) this.castLight.color.setHex(sp.color);
    this.castLight.position.copy(centre).add(new THREE.Vector3(0, 0.05, 0.08));
    if (charging) {
      const k = Math.min(1, p.castT / 0.4);
      for (const m of this.castMotes.children) {
        const ph = (m.userData.phase + t * 1.6) % 1;
        const a = m.userData.phase * Math.PI * 2 + t * 7;
        const rad = 0.16 * (1 - ph) * (1.2 - k * 0.6);
        m.position.set(centre.x + Math.cos(a) * rad, centre.y + Math.sin(a * 1.3) * rad * 0.6, centre.z + Math.sin(a) * rad);
        m.scale.setScalar(0.03 + ph * 0.035);
        m.material.opacity = Math.sin(ph * Math.PI);
        if (sp) m.material.color.setHex(sp.color);
      }
    }

    // nocked arrow
    if (this.arrowMesh) {
      this.arrowMesh.visible = p.drawT >= 0;
      if (p.drawT >= 0) {
        const d = ease(p.drawT);
        this.arrowMesh.position.set(-0.07, -0.12 + by, -0.55 + d * 0.3 - 0.05);
        this.arrowMesh.rotation.set(0, 0, 0);
      }
      // bend string
      const str = this.bowMesh?.getObjectByName('string');
      if (str) str.position.x = str.userData.baseX - (p.drawT >= 0 ? ease(p.drawT) * 0.25 : 0);
    }
    // bow zoom
    const targetFov = game.settings.fov - (p.drawT >= 0 ? ease(p.drawT) * 12 : 0);
    if (Math.abs(mainCam.fov - targetFov) > 0.01) {
      mainCam.fov = lerp(mainCam.fov, targetFov, Math.min(1, dt * 8));
      mainCam.updateProjectionMatrix();
    }
  }

  /** Where the sword hand is and where the blade points: ready, swinging, charging a power attack, or blocking. */
  swingPose(dt, p, bx, by, low, t) {
    const pos = this.swingPos, blade = this.swingBlade;
    let name = null;
    this.blockK += ((p.blocking && !this.shieldMesh ? 1 : 0) - this.blockK) * Math.min(1, dt * 14);
    if (p.attackT >= 0) {
      name = p.attackKind === 'power' ? 'power' : (p.swingN || 0) % 2 ? 'back' : 'fore';
      sampleSwing(SWINGS[name], Math.min(1, p.attackT), pos, blade);
    } else {
      // ready, breathing; holding the button heaves the weapon back toward the overhead windup
      _sp.copy(READY.pos);
      _sb.copy(READY.blade);
      _sb.x += Math.sin(t * 0.8) * 0.025; _sb.normalize();
      if (p.attackHold > 0.1) sampleSwing(SWINGS.power, EASE.io(Math.min(1, (p.attackHold - 0.1) / 0.25)) * 0.3, _sp, _sb);
      if (this.blockK > 0.001) { _sp.lerp(BLOCK.pos, this.blockK); slerpDir(_sb, BLOCK.blade, this.blockK, _sb); }
      const k = Math.min(1, dt * 16);
      pos.lerp(_sp, k);
      slerpDir(blade, _sb, k, blade);
    }
    const out = this._swingOut || (this._swingOut = { pos: new THREE.Vector3(), blade: new THREE.Vector3(), name: null, off: new THREE.Vector3() });
    out.off.set(bx, by - low * 0.42, low * 0.06);
    out.pos.copy(pos).add(out.off);
    out.blade.copy(blade);
    out.name = name;
    return out;
  }

  /** A ribbon swept by the blade over the last stretch of the swing, bright through the fast part of the stroke. */
  updateTrail(p, swing) {
    const T = this.trail;
    T.visible = !!swing?.name && this.root.visible && this.weaponMesh?.visible;
    if (!T.visible) return;
    const S = SWINGS[swing.name], [w0, w1] = S.trail;
    const now = Math.min(1, p.attackT), span = 0.14;
    const pa = T.geometry.attributes.position, ca = T.geometry.attributes.color;
    const L = this.bladeLen, c = this.trailCol;
    let peak = 0;
    for (let i = 0; i <= TRAIL_N; i++) {
      const ts = Math.max(0, now - span * (1 - i / TRAIL_N));
      sampleSwing(S, ts, _tp, _sb);
      _tp.add(swing.off);
      const win = THREE.MathUtils.smoothstep(ts, w0, w0 + 0.03) * (1 - THREE.MathUtils.smoothstep(ts, w1 - 0.08, w1));
      const a = (i / TRAIL_N) ** 1.6 * win * 0.38;
      peak = Math.max(peak, a);
      pa.setXYZ(i * 2, _tp.x + _sb.x * L * 0.5, _tp.y + _sb.y * L * 0.5, _tp.z + _sb.z * L * 0.5);
      pa.setXYZ(i * 2 + 1, _tp.x + _sb.x * L, _tp.y + _sb.y * L, _tp.z + _sb.z * L);
      ca.setXYZ(i * 2, c.r * a * 0.15, c.g * a * 0.15, c.b * a * 0.15);
      ca.setXYZ(i * 2 + 1, c.r * a, c.g * a, c.b * a);
    }
    pa.needsUpdate = true; ca.needsUpdate = true;
    T.visible = peak > 0.01;
  }

  /** Pose the kit arms from the same targets the simple arms use. */
  poseKit(dt, p, P) {
    const K = this.kit;
    // the right hand: blade direction from the swing angles; fingers follow the forearm
    const bladeQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.rrx, P.rry, P.rrz));
    let fist = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2 + 0.75).applyQuaternion(bladeQ);
    const rT = new THREE.Vector3(P.rx, P.ry, P.rz);
    let fingers = rT.clone().sub(K.shoulder.r).normalize();
    let rPose = this.weaponMesh ? 'grip' : 'fist';
    if (!this.weaponMesh && !P.rbow) { fist = new THREE.Vector3(-0.35, 1, 0.1).applyQuaternion(bladeQ); }
    if (P.rbow) { fist.set(0, 1, 0); fingers.set(0.1, 0, -1); rPose = 'grip'; }
    if (P.swing) {
      // the blade goes exactly where the swing says; the wrist turns the fingers to wrap round it
      rT.copy(P.swing.pos);
      fist = P.swing.blade.clone();
      fingers = rT.clone().sub(K.shoulder.r).normalize();
      fingers.addScaledVector(fist, -fingers.dot(fist)).normalize();
    }
    K.poseArm('r', rT, fingers, fist, new THREE.Vector3(0.8, -1, 0.5));
    // the left hand: shield, bow, a spell, or held low
    const lT = new THREE.Vector3(P.lx, P.ly, P.lz);
    let lF = lT.clone().sub(K.shoulder.l).normalize(), lFist = new THREE.Vector3(0.3, 1, 0);
    let lPose = 'fist';
    if (this.shieldMesh) {
      lF.set(1, 0.1, -0.7); lFist.set(0, 1, 0); lPose = 'grip';
      // keep the shield off the camera; raise it to cover the body when blocking
      lT.set(p.blocking ? -0.2 : -0.36, p.blocking ? -0.24 : P.ly - 0.04, p.blocking ? -0.56 : -0.52);
    }
    if (P.bow) { lF.set(0, 0, -1); lFist.set(0.05, 1, 0); lPose = 'grip'; }
    if (P.torch) { lF.set(0.75, -0.25, -0.6).normalize(); lFist.set(0.2, 1, -0.6).normalize(); lPose = 'grip'; }
    const G = this.gest;
    if (G && !P.bow) {
      lF.lerp(G.fingers, G.w).normalize();
      lFist.lerp(G.fist, G.w).normalize();
      lPose = G.open > 0.5 ? 'open' : 'fist';
    } else if (!P.torch) lFist.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(P.lrx, P.lry, P.lrz)));
    K.poseArm('l', lT, lF, lFist, new THREE.Vector3(-0.8, -1, 0.5));
    // fingers ease between poses
    const f = this.kitFingers;
    f.r += ((rPose === 'grip' ? 0 : 1) - f.r) * Math.min(1, dt * 10);
    f.l += ((G && !P.bow ? G.open : lPose === 'open' ? 1 : 0) - f.l) * Math.min(1, dt * (G ? 18 : 10));
    K.setFingers('r', 'grip', 'fist', f.r);
    K.setFingers('l', G && !P.bow ? 'fist' : lPose === 'fist' ? 'fist' : 'grip', 'open', f.l);
    // a palm-centred anchor for the spell glow
    this.kitPalm = K.side.l.grip.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.02, 0.03, -0.06));
  }

  render(renderer) {
    if (!this.root.visible) return;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }
}
