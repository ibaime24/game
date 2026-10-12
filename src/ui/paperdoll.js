// The inventory's portrait: your character standing face-on in their current gear, idling gently on a little
// lit plinth. It has its own small renderer (it lives in a DOM canvas while the game is paused behind the menu)
// and rebuilds the body whenever the inventory redraws, so it always shows what you are wearing.
import * as THREE from 'three';
import { animateRig } from '../actors/models.js';

let shared = null;

function setup() {
  const canvas = document.createElement('canvas');
  canvas.className = 'paperdoll';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 0.62, 0.1, 50);
  // a warm key light, a cool rim from behind, and a soft fill: a portrait in a painter's studio
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x3a2a1c, 1.1));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.6);
  key.position.set(1.6, 3.2, 3.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2.4, bottom: -0.2, near: 0.5, far: 10 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ac0ff, 2.2);
  rim.position.set(-2.2, 2.6, -2.8);
  scene.add(rim);
  // a round plinth of dark wood with a brass rim, and a soft shadow-catcher on it
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.12, 40), new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.6 }));
  plinth.position.y = -0.06;
  plinth.receiveShadow = true;
  scene.add(plinth);
  const brass = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.018, 8, 48), new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.8, roughness: 0.35 }));
  brass.rotation.x = Math.PI / 2;
  brass.position.y = 0.0;
  scene.add(brass);
  return { canvas, renderer, scene, camera, rig: null, raf: 0, t0: 0, spin: 0, drag: null };
}

/** Show the paper doll for `player` inside `container`, sized `w` x `h` CSS pixels. */
export function showPaperDoll(player, container, w = 240, h = 400) {
  shared ||= setup();
  const S = shared;
  S.renderer.setSize(w, h, false);
  S.canvas.style.width = w + 'px';
  S.canvas.style.height = h + 'px';
  S.camera.aspect = w / h;
  S.camera.updateProjectionMatrix();
  container.append(S.canvas);
  // the body, in whatever is equipped right now
  if (S.rig) { S.scene.remove(S.rig.root); S.rig = null; }
  const built = player.buildRig({ portrait: true });
  const rig = built.model;
  rig.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  if (built.weapon) built.weapon.visible = true;
  S.scene.add(rig.root);
  S.rig = rig;
  const height = rig.height || 1.8;
  S.camera.position.set(0, height * 0.56, height * 2.55);
  S.camera.lookAt(0, height * 0.5, 0);
  const anim = { phase: 0, moveSpeed: 0, attack: -1, block: false, cast: -1, dead: 0, stagger: 0, draw: -1, weaponOut: false, sneak: false, lookPitch: 0 };
  // drag to turn the model round; it eases back to face you when you let go
  S.canvas.onpointerdown = (e) => { S.drag = { x: e.clientX, spin: S.spin }; S.canvas.setPointerCapture(e.pointerId); };
  S.canvas.onpointermove = (e) => { if (S.drag) S.spin = S.drag.spin + (e.clientX - S.drag.x) * 0.012; };
  S.canvas.onpointerup = () => { S.drag = null; };
  cancelAnimationFrame(S.raf);
  S.t0 = performance.now();
  const frame = () => {
    // stop drawing once the inventory has closed or switched tabs
    if (!S.canvas.isConnected) { S.scene.remove(S.rig?.root); S.rig = null; return; }
    const t = (performance.now() - S.t0) / 1000;
    if (!S.drag) S.spin *= 0.94;
    rig.root.rotation.y = S.spin + Math.sin(t * 0.5) * 0.08;
    rig.root.position.set(0, 0, 0);
    animateRig(rig, anim, t);
    S.renderer.render(S.scene, S.camera);
    S.raf = requestAnimationFrame(frame);
  };
  frame();
}
