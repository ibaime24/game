// First-person arms built from the player's own rigged character: the body is placed so its eyes sit at
// the view camera, everything above the shoulders is hidden, and each arm is posed every frame with
// two-bone IK so the hands land where the viewmodel wants them, gripping weapons with sampled finger poses.
import * as THREE from 'three';
import { buildKitRig } from './actors/kitRig.js';
import { getClip } from './actors/characterKit.js';

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _m = new THREE.Matrix4();

export class KitArms {
  constructor(opts) {
    const rig = buildKitRig({ ...opts, scale: 1 });
    this.ok = !!rig;
    if (!rig) return;
    this.rig = rig;
    rig.noFx = true; // armour sparkles belong to the world, not to the first-person hands
    this.root = new THREE.Group();
    this.root.add(rig.root);
    const B = (n) => rig.bones.get(n);
    // show only the arms and the shirt they come out of
    rig.root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.frustumCulled = false;
      o.visible = (o.isSkinnedMesh && /Arms|Body/.test(o.name) && !/Belt|Head|Hood/.test(o.name)) || !!o.userData.fpArm;
    });
    this.side = {};
    for (const s of ['r', 'l']) {
      this.side[s] = {
        clav: B('clavicle_' + s), upper: B('upperarm_' + s), lower: B('lowerarm_' + s), hand: B('hand_' + s),
        fingers: FINGERS.flatMap((f) => [1, 2, 3].map((k) => B(`${f}_0${k}_${s}`)).filter(Boolean)),
      };
    }
    // a relaxed base pose, then finger poses sampled from the animation library
    this.sample('Idle_Loop', 0);
    rig.root.updateMatrixWorld(true);
    this.base = new Map();
    for (const s of ['r', 'l']) for (const b of [this.side[s].upper, this.side[s].lower, this.side[s].hand]) this.base.set(b, b.quaternion.clone());
    this.sample('Idle_Loop', 0);
    rig.root.updateMatrixWorld(true);
    this.poses = {
      r: { open: this.fingerPose('r', 'Spell_Simple_Shoot', 0.45), grip: this.curl('r', 0.85), fist: this.curl('r', 1) },
      l: { open: this.fingerPose('l', 'Spell_Simple_Shoot', 0.45), grip: this.curl('l', 0.85), fist: this.curl('l', 1) },
    };
    this.sample('Idle_Loop', 0);
    rig.root.updateMatrixWorld(true);
    // grip frames: +Y along the fist (pinky -> index), +X along the fingers; weapons hang off these
    for (const s of ['r', 'l']) {
      const S = this.side[s];
      const h = S.hand.getWorldPosition(new THREE.Vector3());
      const idx = B(`index_01_${s}`).getWorldPosition(new THREE.Vector3());
      const pnk = B(`pinky_01_${s}`).getWorldPosition(new THREE.Vector3());
      const mid = B(`middle_01_${s}`).getWorldPosition(new THREE.Vector3());
      const toLocalDir = (d) => d.clone().applyQuaternion(S.hand.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
      S.fingerDir = toLocalDir(mid.clone().sub(h));
      S.fistDir = toLocalDir(idx.clone().sub(pnk));
      // orthonormal local basis of the hand: f (fingers), t (fist axis), n
      const f = S.fingerDir.clone();
      const t = S.fistDir.clone().addScaledVector(f, -S.fistDir.dot(f)).normalize();
      S.localBasis = new THREE.Matrix4().makeBasis(f, t, new THREE.Vector3().crossVectors(f, t));
      const grip = new THREE.Group();
      S.hand.add(grip);
      // the handle sits across the palm, just in front of it
      const palmN = new THREE.Vector3().crossVectors(mid.clone().sub(h), idx.clone().sub(pnk)).normalize();
      if (B(`thumb_02_${s}`).getWorldPosition(new THREE.Vector3()).sub(h).dot(palmN) < 0) palmN.negate();
      grip.position.copy(S.hand.worldToLocal(h.clone().lerp(mid, 0.72).addScaledVector(palmN, 0.03)));
      grip.quaternion.setFromRotationMatrix(S.localBasis);
      S.grip = grip;
    }
    // put the eyes on the camera, facing -Z
    rig.root.rotation.y = Math.PI;
    rig.root.updateMatrixWorld(true);
    const head = B('Head').getWorldPosition(new THREE.Vector3());
    const eye = head.add(new THREE.Vector3(0, 0.08, -0.1));
    rig.root.position.set(-eye.x, -eye.y, -eye.z + 0.06);
    rig.root.updateMatrixWorld(true);
    this.shoulder = { r: this.side.r.upper.getWorldPosition(new THREE.Vector3()), l: this.side.l.upper.getWorldPosition(new THREE.Vector3()) };
  }

  sample(name, f) {
    const clip = getClip(name);
    if (!clip) return;
    const mixer = this.rig.mixer;
    mixer.stopAllAction();
    const a = mixer.clipAction(clip);
    a.reset().play();
    a.time = f * clip.duration;
    mixer.update(0);
    a.stop();
  }

  /**
   * A closed hand built procedurally: each finger joint turns about the knuckle line toward the palm.
   * amount 1 = a tight fist, ~0.85 = wrapped round a grip.
   */
  curl(s, amount) {
    const B = (n) => this.rig.bones.get(n);
    const S = this.side[s];
    this.rig.root.updateMatrixWorld(true);
    const P = (n) => B(n).getWorldPosition(new THREE.Vector3());
    const h = S.hand.getWorldPosition(new THREE.Vector3());
    const f = P(`middle_01_${s}`).sub(h).normalize();
    const t = P(`index_01_${s}`).sub(P(`pinky_01_${s}`)).normalize();
    const n = new THREE.Vector3().crossVectors(f, t).normalize();
    // the thumb sits on the palm side
    if (P(`thumb_02_${s}`).sub(h).dot(n) < 0) n.negate();
    const out = [];
    for (const b of S.fingers) {
      const name = b.name;
      const joint = +name.match(/_0(\d)_/)[1];
      const thumb = name.startsWith('thumb');
      const ang = (thumb ? [0, 0.4, 0.6, 0.55][joint] : [0, 1.45, 1.65, 1.2][joint]) * amount;
      // rotation axis (world): turning about it must carry the finger toward the palm
      const axis = thumb ? f.clone() : t.clone();
      const bw = b.getWorldQuaternion(new THREE.Quaternion());
      const tip = (b.children[0] ? b.children[0].getWorldPosition(new THREE.Vector3()) : b.getWorldPosition(new THREE.Vector3()).addScaledVector(f, 0.02)).sub(b.getWorldPosition(new THREE.Vector3()));
      const test = tip.clone().applyAxisAngle(axis, 0.3);
      if (test.sub(tip).dot(n) < 0) axis.negate();
      const local = axis.applyQuaternion(bw.clone().invert()).normalize();
      out.push(b.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(local, ang)));
    }
    return out;
  }

  fingerPose(s, name, f) {
    this.sample(name, f);
    return this.side[s].fingers.map((b) => b.quaternion.clone());
  }

  /** Blend finger bones between two sampled poses. */
  setFingers(s, a, b, k) {
    const P = this.poses[s], fs = this.side[s].fingers;
    for (let i = 0; i < fs.length; i++) fs[i].quaternion.copy(P[a][i]).slerp(P[b][i], k);
  }

  /** Rotate `bone` so the point `child` (world) moves onto `target` (world). */
  aim(bone, child, target) {
    const bp = bone.getWorldPosition(_v1);
    const from = _v2.copy(child).sub(bp).normalize();
    const to = _v3.copy(target).sub(bp).normalize();
    _q1.setFromUnitVectors(from, to);
    bone.getWorldQuaternion(_q2);
    _q2.premultiply(_q1);
    bone.parent.getWorldQuaternion(_q1).invert();
    bone.quaternion.copy(_q1.multiply(_q2));
    bone.updateMatrixWorld(true);
  }

  /**
   * Pose one arm: the grip centre goes to `target`; the hand is turned so its fingers point along `fingers`
   * and its fist axis (where a blade or bow limb runs) along `fist`. `pole` bends the elbow.
   */
  poseArm(s, target, fingers, fist, pole) {
    const S = this.side[s];
    for (const b of [S.upper, S.lower, S.hand]) b.quaternion.copy(this.base.get(b));
    this.rig.root.updateMatrixWorld(true);
    // hand orientation first, so we know where the wrist must be for the grip to reach the target
    const F = fingers.clone().normalize();
    const T = fist.clone().addScaledVector(F, -fist.dot(F)).normalize();
    const world = new THREE.Matrix4().makeBasis(F, T, new THREE.Vector3().crossVectors(F, T));
    const handWorldQ = new THREE.Quaternion().setFromRotationMatrix(_m.copy(world).multiply(new THREE.Matrix4().copy(S.localBasis).invert()));
    const gripOffset = S.grip.position.clone().applyQuaternion(handWorldQ);
    const wrist = target.clone().sub(gripOffset);
    // two-bone IK
    const sp = S.upper.getWorldPosition(new THREE.Vector3());
    const ep = S.lower.getWorldPosition(new THREE.Vector3());
    const hp = S.hand.getWorldPosition(new THREE.Vector3());
    const a = sp.distanceTo(ep), b = ep.distanceTo(hp);
    const d = wrist.clone().sub(sp);
    const dist = Math.min(a + b - 0.002, Math.max(Math.abs(a - b) + 0.01, d.length()));
    const dir = d.normalize();
    const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
    const elbow = sp.clone().addScaledVector(dir, a * cosA).addScaledVector(pp, a * sinA);
    this.aim(S.upper, ep, elbow);
    this.aim(S.lower, S.hand.getWorldPosition(new THREE.Vector3()), sp.clone().addScaledVector(dir, dist));
    // hand orientation in world space -> local
    S.lower.getWorldQuaternion(_q1).invert();
    S.hand.quaternion.copy(_q1.multiply(handWorldQ));
    S.hand.updateMatrixWorld(true);
  }

  dispose() {
    this.root.parent?.remove(this.root);
  }
}
