// The carried torch: a pitch-wrapped stick in the off hand, a live flame that trails as you move,
// a flickering warm light that throws firelight over whatever is near, and the odd spark and curl of smoke.
import * as THREE from 'three';
import * as TG from '../world/texgen.js';
import { buildCarriedFlame } from './flames.js';

const TIP_Y = 0.38; // top of the wrapped head, in the torch's own frame (grip at the origin, +Y up the handle)

let _mats = null;
function torchMats() {
  if (_mats) return _mats;
  const wood = TG.woodTex('timber'), cloth = TG.fabricTex();
  const grain = wood.map.clone();
  grain.center.set(0.5, 0.5);
  grain.rotation = Math.PI / 2; // run the grain along the handle
  grain.needsUpdate = true;
  _mats = {
    wood: new THREE.MeshStandardMaterial({ color: 0xe8d0b0, map: grain, normalMap: wood.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.85 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x3e3a36, roughness: 0.45, metalness: 0.8 }),
    // pitch-soaked rag, smouldering in the weave
    wrap: new THREE.MeshStandardMaterial({ color: 0x241a14, map: cloth.map, normalMap: cloth.normalMap, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 1 }),
    cord: new THREE.MeshStandardMaterial({ color: 0x4a3622, roughness: 0.9 }),
    embers: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.85, 0.18) }),
  };
  return _mats;
}

/** A torch without its flame (the flame lives in the world scene so it blooms). userData.tip marks the flame base. */
export function buildTorchMesh() {
  const M = torchMats();
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.46, 10), M.wood);
  handle.position.y = 0.03;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.025, 0.035, 12), M.iron);
  collar.position.y = 0.265;
  // lumpy wound rags: bulge the head with a twisted ripple that runs round it like wrapping
  const hg = new THREE.CylinderGeometry(0.036, 0.031, 0.1, 18, 6);
  const hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const a = Math.atan2(z, x);
    const k = 1 + (Math.sin(a * 3 + y * 95) * 0.09 + Math.sin(a * 7 - y * 160) * 0.05) * Math.min(1, (0.05 - Math.abs(y)) * 40 + 0.3);
    hp.setX(i, x * k); hp.setZ(i, z * k);
  }
  hg.computeVertexNormals();
  const head = new THREE.Mesh(hg, M.wrap);
  head.position.y = 0.325;
  const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.02, 12), M.embers);
  embers.position.y = TIP_Y - 0.005;
  g.add(handle, collar, head, embers);
  for (const y of [0.295, 0.35]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 5, 14), M.cord);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const tip = new THREE.Object3D();
  tip.position.y = TIP_Y;
  g.add(tip);
  g.userData.tip = tip;
  return g;
}

/**
 * A charcoal-burner's lantern mounted on a carrying pole: tin cap, four bars, amber glass and a candle.
 * Same frame as the torch (grip at the origin, +Y up the pole); userData.tip marks the candle flame.
 */
export function buildLanternMesh() {
  const M = torchMats();
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.015, 0.64, 8), M.wood);
  pole.position.y = 0.1;
  g.add(pole);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.05, 10), M.iron);
  cup.position.y = 0.42;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.07, 0.022, 12), M.iron);
  plate.position.y = 0.455;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.068, 0.16, 12, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffd890, emissive: 0xff9a30, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.y = 0.545;
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0xf2e8d0, roughness: 0.6, emissive: 0xffb060, emissiveIntensity: 0.25 }));
  candle.position.y = 0.49;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.075, 12), M.iron);
  cap.position.y = 0.66;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 5, 14), M.iron);
  ring.position.y = 0.715;
  g.add(cup, plate, glass, candle, cap, ring);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.18, 0.012), M.iron);
    bar.position.set(Math.cos(a) * 0.068, 0.545, Math.sin(a) * 0.068);
    g.add(bar);
  }
  g.traverse((o) => { if (o.isMesh && o !== glass) o.castShadow = true; });
  const tip = new THREE.Object3D();
  tip.position.y = 0.515;
  g.add(tip);
  g.userData.tip = tip;
  return g;
}

/** The mesh for a carried light item. */
export function buildLightMesh(item) {
  return item?.lightStyle === 'lantern' ? buildLanternMesh() : buildTorchMesh();
}

// how each kind of carried light burns
const STYLES = {
  torch: { flame: 0.11, halo: 3.4, color: 0xff9440, intensity: 15, distance: 15, decay: 1.7, flicker: 1, sparks: true },
  lantern: { flame: 0.042, halo: 7.5, color: 0xffc27a, intensity: 17, distance: 19, decay: 1.6, flicker: 0.35, sparks: false },
};

/**
 * The world half of the torch: flame, light and sparks, placed each frame at the tip of whichever torch
 * mesh is being shown (the first-person hand or the third-person model).
 */
export class CarriedTorch {
  constructor(scene) {
    this.flames = {};
    for (const [k, st] of Object.entries(STYLES)) {
      const f = buildCarriedFlame(st.flame, { halo: st.halo, color: st.color });
      f.visible = false;
      scene.add(f);
      this.flames[k] = f;
    }
    this.style = 'torch';
    this.flame = this.flames.torch;
    this.light = new THREE.PointLight(0xff9440, 0, 15, 1.7);
    scene.add(this.light);
    this.lit = 0; // eases in when lit, out when doused
    this.last = new THREE.Vector3();
    this.drift = new THREE.Vector3();
    this.sparkAcc = 0;
    this.u = this.flame.userData.uniforms;
  }

  attach(scene) {
    scene.add(...Object.values(this.flames), this.light);
  }

  /**
   * @param tip world position of the flame base, or null when no torch is held
   * @param opts { t, night, firstPerson, visible, particles, scale, style }
   */
  update(dt, tip, { t, night, firstPerson, visible = true, particles, scale = 1, style = 'torch' }) {
    const on = !!tip;
    if (on && style !== this.style && STYLES[style]) {
      this.flame.visible = false;
      this.style = style;
      this.flame = this.flames[style];
      this.u = this.flame.userData.uniforms;
    }
    const S = STYLES[this.style];
    this.lit += ((on ? 1 : 0) - this.lit) * Math.min(1, dt * (on ? 5 : 9));
    if (!on && this.lit < 0.01) {
      this.lit = 0;
      this.light.intensity = 0;
      this.flame.visible = false;
      return;
    }
    if (on) {
      // the flame trails behind the torch's own motion (walking, turning, swinging)
      if (this.last.lengthSq() > 0 && dt > 0) {
        const v = tip.clone().sub(this.last).divideScalar(dt);
        if (v.lengthSq() < 400) this.drift.lerp(v.multiplyScalar(-0.07).setY(Math.max(-0.1, v.y * -0.03)).clampLength(0, 0.7), Math.min(1, dt * 8));
      }
      this.last.copy(tip);
      this.flame.position.copy(tip);
    }
    this.u.uTime.value = t;
    this.u.uNight.value = Math.max(0.35, night);
    this.u.uDrift.value.copy(this.drift);
    this.flame.visible = visible && this.lit > 0.05;
    this.flame.scale.setScalar((0.4 + this.lit * 0.6) * scale);
    // in first person the flame must sit over the hand even when a wall is close, and right in front of the
    // eye it needs less glare to read as a flame rather than a blaze
    for (const m of this.flame.children) m.material.depthTest = !firstPerson;
    this.flame.userData.flameBright.value = firstPerson ? 0.62 : 0.9;
    this.flame.userData.haloBright.value = firstPerson ? 0.22 : 0.45;

    // firelight: layered flicker (slow breathing, quick gutters), the light bobbing with the flame
    const f = 1 - S.flicker * (0.16 - 0.08 * Math.sin(t * 2.1) - 0.05 * Math.sin(t * 9.7 + 1.3) * Math.sin(t * 6.1) - 0.03 * Math.sin(t * 23.0));
    this.light.color.setHex(S.color);
    this.light.distance = S.distance;
    this.light.decay = S.decay;
    this.light.intensity = S.intensity * f * this.lit;
    this.light.position.copy(this.flame.position).add(new THREE.Vector3(Math.sin(t * 7.3) * 0.02 * S.flicker, 0.12 + Math.sin(t * 5.1) * 0.02 * S.flicker, Math.cos(t * 6.7) * 0.02 * S.flicker));

    // sparks and smoke
    if (on && visible && particles && S.sparks) {
      this.sparkAcc += dt * 4;
      while (this.sparkAcc >= 1) {
        this.sparkAcc -= 1;
        const p = this.flame.position.clone();
        p.y += 0.12;
        if (Math.random() < 0.7) particles.burst(p, 'torchspark', 1, 0xff8a30);
        if (!firstPerson && Math.random() < 0.12) particles.burst(p.setY(p.y + 0.15), 'smoke', 1);
      }
    }
  }
}
