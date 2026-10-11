// World meshes for loose items: scanned props where an item has one, otherwise simple stand-ins.
import * as THREE from 'three';
import { ITEMS } from '../data/items.js';
import { buildWeaponMesh, mat } from '../actors/models.js';
import { makeProp, hasProp } from './props.js';
import { buildLightMesh } from '../fx/torch.js';

const STANDIN = { bread: 0xc8a060, cheese: 0xf0d050, apple: 0xc02020, silver_cup: 0xd0d0d8, silver_plate: 0xd0d0d8, lockpick: 0x888888, sweetroll: 0xe0b070, venison: 0x8a3a2a };
const ITEM_PROP = { apple: 'food_apple_01', silver_cup: 'brass_goblets', silver_plate: 'carved_wooden_plate' };

/** A mesh (or group) for an item resting on a surface at y = 0. */
export function itemMesh(id) {
  const it = ITEMS[id];
  if (it?.type === 'weapon' && it.look) {
    const m = buildWeaponMesh(it.look);
    m.rotation.z = Math.PI / 2;
    m.position.y = 0.03;
    const g = new THREE.Group();
    g.add(m);
    return g;
  }
  if (it?.type === 'light') {
    // a torch or lantern laid down on its side
    const g = new THREE.Group();
    const m = buildLightMesh(it);
    m.rotation.z = Math.PI / 2 - 0.12;
    m.position.set(0.25, 0.03, 0);
    g.add(m);
    return g;
  }
  const propId = it?.prop || ITEM_PROP[id];
  if (propId && hasProp(propId)) {
    const g = makeProp(propId, { variant: it?.propVariant ?? 0 });
    if (id === 'silver_cup') g.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.color.setRGB(1.3, 1.3, 1.35); o.material.metalness = 1; } });
    return g;
  }
  let geo;
  if (id.startsWith('libram_page')) {
    // a loose page of glowing vellum, slightly curled
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(0.32, 0.42, 4, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / 0.32 + 0.5) * Math.PI) * 0.04);
    geo.computeVertexNormals();
    const page = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf6eedc, emissive: 0xb090ff, emissiveIntensity: 0.35, roughness: 0.9, side: THREE.DoubleSide }));
    page.rotation.set(-1.2, 0.3, 0.2);
    page.position.y = 0.05;
    g.add(page);
    return g;
  }
  if (id === 'cheese_wheel') {
    const g = new THREE.Group();
    const rind = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 20), mat(0xe8b840, { rough: 0.7 }));
    rind.position.y = 0.06;
    rind.castShadow = true;
    const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.125, 20, 1, false, 0, 0.7), mat(0xf6dc80, { rough: 0.85 }));
    wedge.position.y = 0.06;
    g.add(rind, wedge);
    return g;
  }
  if (id.startsWith('potion')) geo = new THREE.CylinderGeometry(0.05, 0.07, 0.22, 8);
  else if (id === 'silver_cup') geo = new THREE.CylinderGeometry(0.06, 0.04, 0.14, 8);
  else if (id === 'silver_plate') geo = new THREE.CylinderGeometry(0.16, 0.14, 0.03, 12);
  else if (id.startsWith('book') || it?.type === 'book') geo = new THREE.BoxGeometry(0.22, 0.06, 0.3);
  else if (id === 'bread' || id === 'sweetroll') geo = new THREE.CapsuleGeometry(0.07, 0.16, 3, 6).rotateZ(Math.PI / 2);
  else if (id === 'lockpick') geo = new THREE.BoxGeometry(0.15, 0.01, 0.02);
  else if (it?.type === 'ingredient') geo = new THREE.SphereGeometry(0.07, 8, 6);
  else geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const color = it?.color ?? STANDIN[id] ?? (it?.type === 'book' ? 0x5a2a1a : 0x8a6a3a);
  const isMetal = id.startsWith('silver');
  const m = new THREE.Mesh(geo, mat(color, isMetal ? { metal: 0.9, rough: 0.25 } : id.startsWith('potion') ? { rough: 0.1, emissive: color, ei: 0.2 } : {}));
  geo.computeBoundingBox();
  m.position.y = -geo.boundingBox.min.y;
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}
