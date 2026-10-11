// Where the legendary things wait: five swords driven into stone pedestals under columns of light, and three
// armour sets displayed on stands deep in the dungeons that suit them.
import * as THREE from 'three';
import { M } from './builder.js';
import { ITEMS } from '../data/items.js';
import { buildWeaponMesh } from '../actors/models.js';
import { attachBladeFx } from '../fx/bladefx.js';
import { buildKitRig } from '../actors/kitRig.js';
import { getClip, isKitReady } from '../actors/characterKit.js';
import { magicTextures } from '../fx/magic.js';
import { LEGEND_SWORDS } from './layout.js';

/** A column of soft light rising into the sky, fading with height. */
function lightColumn(color, height = 46, radius = 0.32) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, forceSinglePass: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
      void main(){
        float fade = pow(max(1.0 - vUv.y, 1e-3), 2.2) * smoothstep(0.0, 0.04, vUv.y);
        float rib = 0.75 + 0.25 * sin(vUv.x * 6.2832 * 3.0 + uTime * 1.5);
        float pulse = 0.8 + 0.2 * sin(uTime * 2.0 - vUv.y * 20.0);
        float edge = smoothstep(0.0, 0.5, 1.0 - abs(vUv.x * 2.0 - 1.0));
        gl_FragColor = vec4(uColor * fade * rib * pulse * 0.13, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius, height, 16, 1, true), mat);
  m.position.y = height / 2;
  return m;
}

/** A sword driven point-first into a rune-ringed stone, beneath a column of light. */
function swordPedestal(b, terrain, game, id, x, z, color) {
  const h0 = terrain.heightAt(x, z);
  const item = ITEMS[id];
  const T = magicTextures();
  const stone = M('stone');
  const dark = M('darkstone');
  // three stepped stone discs and a block of rough rock
  for (const [rad, hh, y, mat] of [[1.5, 0.3, 0.15, dark], [1.15, 0.28, 0.44, stone], [0.8, 0.26, 0.71, stone]]) b.cyl(rad, rad * 1.05, hh, mat, x, h0 + y, z, { seg: 12, walkable: true });
  const block = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), M('rock'));
  block.scale.set(1, 0.7, 0.9);
  block.position.set(x, h0 + 1.0, z);
  block.castShadow = true;
  b.add(block);
  b.col.addCircle(x, z, 0.6, h0, h0 + 1.3, { walkable: true });
  // a ring of runes glowing on the top step, in the sword's own colour
  const runes = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: T.runes, color: new THREE.Color(color), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  runes.rotation.x = -Math.PI / 2;
  runes.position.set(x, h0 + 0.59, z);
  runes.userData.dynamic = true;
  b.add(runes);
  // the sword itself, buried a hand's breadth in the stone, leaning a little
  const g = new THREE.Group();
  const sword = buildWeaponMesh(item.look);
  sword.rotation.z = Math.PI;
  sword.position.y = (item.look.len || 1) + 0.12;
  g.add(sword);
  g.position.set(x, h0 + 1.05, z);
  g.rotation.set(0.08, Math.random() * 6, 0.1);
  g.userData.dynamic = true;
  g.traverse((o) => { o.userData.dynamic = true; });
  b.add(g);
  attachBladeFx(sword, item.look, { world: true });
  const beam = lightColumn(color);
  beam.position.x = x; beam.position.z = z; beam.position.y += h0 + 1;
  beam.userData.dynamic = true;
  b.add(beam);
  const light = b.light(color, 16, 14, x, h0 + 2.2, z, { flicker: false });
  const it = b.interact({ kind: 'legendsword', id: 'legend_' + id, legend: true, item: id, name: item.name, pos: new THREE.Vector3(x, h0 + 1.6, z), radius: 1.4, verb: 'Draw', mesh: g, extra: [beam, runes], light });
  return { it, beam, runes };
}

export function buildLegendarySwords(b, terrain, game) {
  const out = [];
  for (const [id, x, z, color] of LEGEND_SWORDS) out.push(swordPedestal(b, terrain, game, id, x, z, color));
  return out;
}

/** Animate the columns and rune rings (called from the game loop while in the overworld). */
export function updateLegendary(state, t) {
  for (const s of state || []) {
    s.beam.material.uniforms.uTime.value = t;
    s.runes.rotation.z = t * 0.15;
    s.runes.material.opacity = 0.6 + Math.sin(t * 1.7) * 0.2;
  }
}

// ------------------------------------------------------------------ armour stands
const DISPLAYS = {
  nenalatha: { set: 'starwarden', near: (m) => m.atlas || m.boss, offset: [0, 4.5] },
  gloam_barrow: { set: 'emberforge', near: (m) => m.ritual, offset: [-5, 0] },
  rime_spire: { set: 'frostbloom', near: (m) => m.cage, offset: [5, 0] },
};

/** The open floor tile nearest a point, clear of walls on every side. */
function openSpot(meta, x, z) {
  const g = meta.grid;
  let best = null, bd = Infinity;
  for (let r = 1; r < g.length - 1; r++) for (let c = 1; c < g[0].length - 1; c++) {
    if (g[r][c] !== '.') continue;
    let ok = true;
    for (let dr = -1; dr <= 1 && ok; dr++) for (let dc = -1; dc <= 1; dc++) if ('#D'.includes(g[r + dr][c + dc])) { ok = false; break; }
    if (!ok) continue;
    const [wx, wz] = meta.at(c, r);
    const d = Math.hypot(wx - x, wz - z);
    if (d < bd) { bd = d; best = [wx, wz]; }
  }
  return best;
}

export function buildArmorDisplay(game, cell, b, meta, id) {
  const D = DISPLAYS[id];
  if (!D || !isKitReady()) return;
  const near = D.near(meta);
  if (!near || !meta.grid) return;
  const spot = openSpot(meta, near.x + D.offset[0], near.z + D.offset[1]);
  if (!spot) return;
  const [x, z] = spot;
  const pieces = Object.values(ITEMS).filter((it) => it.set === D.set);
  const slots = Object.fromEntries(pieces.map((it) => [it.slot, D.set]));
  const color = pieces[0].color;
  // a wooden mannequin wearing the whole set
  const cloth = { starwarden: 0x2a3a88, emberforge: 0x3a2420, frostbloom: 0xc4d2e4 }[D.set];
  const rig = buildKitRig({ skin: 0x8a6a48, hairStyle: 'bald', headless: true, kitOutfit: 'ranger', kitTint: cloth, kitTintExact: true, armor: { chest: color }, armorSets: slots });
  if (!rig) return;
  const clip = getClip('Idle_Loop') || getClip('Sword_Idle');
  if (clip) { const a = rig.mixer.clipAction(clip); a.play(); rig.mixer.update(0.4); a.paused = true; }
  const yaw = Math.atan2((meta.arrival?.x ?? 0) - x, (meta.arrival?.z ?? 0) - z);
  rig.root.position.set(x, 0.16, z);
  rig.root.rotation.y = yaw;
  const g = new THREE.Group();
  g.add(rig.root);
  b.add(g);
  // a round plinth, a brass plaque and a light that picks it out of the dark
  b.cyl(0.6, 0.66, 0.16, 'darkstone', x, 0.08, z, { seg: 16 });
  const plaqueLight = b.light(color === 0x2a2420 ? 0xff7a30 : color === 0x1e2c66 ? 0x8ab0ff : 0xbfe6ff, 22, 9, x, 3.2, z, { flicker: false });
  b.interact({ kind: 'legendarmor', id: 'legend_' + D.set, legend: true, set: D.set, pieces: pieces.map((p) => p.id), name: pieces[0].name.split(' ')[0] + (D.set === 'frostbloom' ? ' Raiment' : D.set === 'emberforge' ? ' Armour' : ' Plate'), pos: new THREE.Vector3(x, 1.2, z), radius: 1.3, verb: 'Take', mesh: g, light: plaqueLight });
  cell.armorDisplay = { rig, g };
}
