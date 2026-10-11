// The white hare of the first snow: a small, round, long-eared hare, and (when she is more than a hare)
// a soft blue glow about her.
import * as THREE from 'three';

let mats = null;
function hareMats() {
  if (mats) return mats;
  mats = {
    fur: new THREE.MeshStandardMaterial({ color: 0xf6f8ff, roughness: 0.95, emissive: 0x8ab8ff, emissiveIntensity: 0.0 }),
    inner: new THREE.MeshStandardMaterial({ color: 0xf0c8d0, roughness: 0.9 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x1a1420, roughness: 0.2, metalness: 0.3 }),
    nose: new THREE.MeshStandardMaterial({ color: 0xe8a0b0, roughness: 0.6 }),
  };
  return mats;
}

/** A sitting hare, about 0.45 m tall, facing +Z. opts.glow: 0..1 spirit-glow. */
export function buildHareMesh({ glow = 0 } = {}) {
  const M = hareMats();
  const fur = glow ? M.fur.clone() : M.fur;
  if (glow) fur.emissiveIntensity = glow * 0.6;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), fur);
  body.scale.set(1, 0.95, 1.25);
  body.position.set(0, 0.17, -0.02);
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), fur);
  haunch.position.set(0, 0.12, -0.12);
  haunch.scale.set(1.3, 1, 1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), fur);
  head.scale.set(0.95, 0.95, 1.15);
  head.position.set(0, 0.33, 0.12);
  g.add(body, haunch, head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), fur);
    ear.scale.set(0.7, 2.6, 0.35);
    ear.position.set(s * 0.045, 0.49, 0.08);
    ear.rotation.set(-0.25, 0, s * -0.18);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.inner);
    inner.scale.set(0.55, 2.4, 0.2);
    inner.position.set(s * 0.045, 0.49, 0.093);
    inner.rotation.copy(ear.rotation);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.eye);
    eye.position.set(s * 0.06, 0.35, 0.2);
    g.add(ear, inner, eye);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), M.nose);
  nose.position.set(0, 0.32, 0.235);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), fur);
  tail.position.set(0, 0.16, -0.27);
  for (const s of [-1, 1]) {
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), fur);
    paw.scale.set(1, 0.7, 1.6);
    paw.position.set(s * 0.05, 0.03, 0.13);
    g.add(paw);
  }
  g.add(nose, tail);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.fur = fur;
  return g;
}
