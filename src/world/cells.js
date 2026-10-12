// Cells: the overworld, interiors and the Deadlands. Each owns its scene graph, colliders and actors.
import * as THREE from 'three';
import { CollisionWorld } from '../core/collision.js';
import { Terrain } from './terrain.js';
import { createTerrainMaterial } from './terrainMaterial.js';
import { createReflectiveWater } from './water.js';
import { buildVegetation } from './vegetation.js';
import { Builder, mergeStatic, M } from './builder.js';
import { buildWorldStructures } from './structures.js';
import { buildWorldScatter } from './scatter.js';
import { buildQuestSites, buildMainQuestSites, buildCorwynSites, buildHobsWagon } from './questSites.js';
import { buildWintersmeet, buildWhiteHareSites, buildRabbitSites } from './wintersmeet.js';
import { buildLegendarySwords, buildArmorDisplay } from './legendary.js';
import { buildGreenheart, buildHollowElder, GH } from './greenheart.js';
import { buildCove, buildSmugglersCut, buildLostCatPoster } from './cove.js';
import { CHORROL_CRITTERS } from './chorrol.js';
import { buildKitRig } from '../actors/kitRig.js';
import { isKitReady, getClip } from '../actors/characterKit.js';
import { RACES } from '../data/stats.js';
import { buildInterior, INTERIORS } from './interiors.js';
import { buildOblivion, OB, OB_SPAWNS } from './oblivion.js';
import {
  heightAt, roadDistance, forestDensity, LOCATIONS, KVATCH_BURN, WATER_LEVEL, LAKE, chorrolPaving, snowCover, wintersmeetPaving, COVE,
} from './layout.js';
import { createNoise2D, fbm, smoothstep, lerp } from '../core/noise.js';
import { NPCS } from '../data/actors.js';

const cnoise = createNoise2D(31);

/** Meshes that must stay separate objects (they get hidden, moved or animated). */
function keepSet(cell) {
  const keep = new Set();
  for (const it of cell.interactables) if (it.mesh) keep.add(it.mesh);
  if (cell.terrain) keep.add(cell.terrain.mesh);
  if (cell.water) keep.add(cell.water);
  return keep;
}

export class Cell {
  constructor(id, name, interior) {
    this.id = id;
    this.name = name;
    this.interior = interior;
    this.group = new THREE.Group();
    this.group.name = 'cell:' + id;
    this.actors = [];
    this.interactables = [];
    this.lights = [];
    this.emitters = [];
    this.spawns = [];
    this.spin = [];
    this.waterLevel = undefined;
    this.bounds = null;
    this.music = 'explore';
    this.lightLevel = 0.6;
    this.fog = { color: new THREE.Color(0x000000), near: 10, far: 60 };
    this.ambient = { sky: new THREE.Color(0xffffff), ground: new THREE.Color(0x202020), intensity: 0.5 };
    this.hasSky = false;
    this.sunlit = false;
  }

  absorb(b) {
    this.interactables.push(...b.interactables);
    this.lights.push(...b.lights);
    this.emitters.push(...b.emitters);
    this.group.traverse((o) => { if (o.userData.spin) this.spin.push(o); });
  }
}

// ------------------------------------------------------------------ overworld
/** Splat weights + macro tint for the overworld. out = [tint r,g,b, grass, dirt, rock, sand, snow, cobble] */
function worldSplat(x, z, h, ny, out) {
  const n = fbm(cnoise, x / 60, z / 60, 3);
  const n2 = cnoise(x / 9, z / 9);
  let grass = 1, dirt = 0, rock = 0, sand = 0, snow = 0, cobble = 0;
  // tint: lush greens in lowlands, drier/yellower patches, cooler in the hills
  let tr = 0.95 + n * 0.12, tg = 1.0 + n * 0.06, tb = 0.9;
  const dry = smoothstep(0.2, 0.6, n);
  tr += dry * 0.18; tg += dry * 0.05; tb -= dry * 0.08;
  // forest floor: darker, more dirt and leaf litter
  const f = forestDensity(x, z);
  dirt += f * 0.35 * (0.6 + n2 * 0.4);
  tr -= f * 0.12; tg -= f * 0.1; tb -= f * 0.08;
  // slopes and high ground become rock
  rock = Math.max(smoothstep(0.88, 0.72, ny), smoothstep(65, 105, h) * 0.8);
  grass *= 1 - rock;
  snow = smoothstep(150, 200, h) * (0.7 + n2 * 0.3);
  rock = Math.max(rock, smoothstep(90, 130, h));
  grass *= 1 - rock;
  // shores
  sand = smoothstep(2.6, 0.8, h) * (1 - rock);
  if (h < -0.5) { sand = 0.7; dirt += 0.4; grass = 0; }
  grass *= 1 - sand;
  // roads and trampled ground
  const rd = roadDistance(x, z);
  const road = smoothstep(4.0, 1.8, rd) * (0.8 + n2 * 0.2);
  dirt += road * 3;
  grass *= 1 - road;
  const dc = Math.hypot(x - LOCATIONS.chorrol.x, z - LOCATIONS.chorrol.z);
  const inTown = smoothstep(64, 58, dc);
  if (inTown > 0) {
    const pave = chorrolPaving(x, z);
    cobble = Math.max(cobble, pave * (0.9 + n2 * 0.1));
    grass *= 1 - pave;
    // well-kept town lawns: fewer bare patches than the wilds
    dirt += inTown * (1 - pave) * 0.12 * (0.5 + n2 * 0.5);
  }
  for (const L of [LOCATIONS.priory, LOCATIONS.bandit_camp, LOCATIONS.roxey_inn, LOCATIONS.vilverin]) {
    const d = Math.hypot(x - L.x, z - L.z);
    dirt += smoothstep(16, 6, d) * 0.6;
  }
  // the snows of the Jerall foothills: deep drifts, trodden paths, grass buried, a colder light on everything
  const cover = snowCover(x, z, h);
  if (cover > 0) {
    // snow lies thick on the flats and slides off steep faces, leaving the rock bare and dark
    // (the highest peaks hold it even on their steep faces)
    const drift = cover * (0.82 + n2 * 0.18) * lerp(0.32 + 0.68 * smoothstep(0.55, 0.85, ny), 1, smoothstep(85, 125, h) * 0.85);
    const lane = wintersmeetPaving(x, z);
    snow = Math.max(snow, drift * (1 - road * 0.55) * (1 - lane * 0.62));
    cobble = Math.max(cobble, lane * 0.85);
    grass *= 1 - cover * 0.92;
    dirt *= 1 - cover * 0.4;
    tr -= cover * 0.06; tg -= cover * 0.02; tb += cover * 0.06;
  }
  // Kvatch ash
  const burn = smoothstep(KVATCH_BURN.r, KVATCH_BURN.r * 0.45, Math.hypot(x - KVATCH_BURN.x, z - KVATCH_BURN.z));
  dirt += burn * 1.5; grass *= 1 - burn * 0.85;
  tr *= 1 - burn * 0.55; tg *= 1 - burn * 0.62; tb *= 1 - burn * 0.6;
  out[0] = tr; out[1] = tg; out[2] = tb;
  out[3] = Math.max(0, grass); out[4] = dirt; out[5] = rock; out[6] = sand; out[7] = snow; out[8] = cobble;
}

export function createWorldCell(game) {
  const cell = new Cell('world', 'Cyrodiil', false);
  const terrain = new Terrain({ size: 1600, seg: 400, heightFn: heightAt, colorFn: worldSplat, splat: true, material: createTerrainMaterial() });
  cell.terrain = terrain;
  cell.group.add(terrain.mesh);
  const collision = new CollisionWorld((x, z) => terrain.heightAt(x, z), 16);
  cell.collision = collision;
  cell.water = createReflectiveWater(1700, WATER_LEVEL, () => [...(cell.vegetation?.reflectionHide(LAKE) || []), cell.scatter, ...(game.particles ? [game.particles.add.points, game.particles.alpha.points] : []), game.sunAnchor, game.sunFlare?.userData.ghosts].filter(Boolean));
  cell.group.add(cell.water);
  cell.waterLevel = WATER_LEVEL;
  cell.bounds = [-770, -770, 770, 770];
  cell.hasSky = true;
  cell.sunlit = true;
  cell.lightLevel = 1;

  const b = new Builder(cell.group, collision);
  const state = {};
  buildWorldStructures(b, terrain, state);
  state.quest = buildQuestSites(b, terrain, game);
  state.corwyn = buildCorwynSites(b, terrain, game);
  state.wintersmeet = buildWintersmeet(b, terrain);
  state.whiteHare = buildWhiteHareSites(b, terrain, game);
  state.hob = buildHobsWagon(b, terrain, game);
  state.rabbits = buildRabbitSites(b, terrain, game);
  state.legendary = buildLegendarySwords(b, terrain, game);
  buildHollowElder(b, terrain, LOCATIONS.hollow_elder);
  buildSmugglersCut(b, terrain, LOCATIONS.smugglers_cut);
  if (b.libramPage && !game.taken.libram_page_oak_pickup) {
    const pg = b.libramPage;
    const it = game.placeItem(b, 'libram_page_oak', pg.x, pg.y, pg.z, 'libram_page_oak_pickup', { rot: 0.6, radius: 0.6 });
    b.emitter('sparkle', pg.x, pg.y + 0.3, pg.z, 2, { range: 90 });
  }
  buildMainQuestSites(b, terrain);
  cell.state = state;
  cell.absorb(b);
  cell.mergedMeshes = mergeStatic(cell.group, keepSet(cell));
  cell.vegetation = buildVegetation(terrain, collision, cell.group, game.renderer);
  const b2 = new Builder(cell.group, collision);
  cell.scatterStats = buildWorldScatter(cell, terrain, collision, b2);
  cell.interactables.push(...b2.interactables);
  cell.lights.push(...b2.lights);

  // creature spawn points
  const S = (list, x, z, count = 1, radius = 8, extra = {}) => cell.spawns.push({ list, x, z, count, radius, ...extra, active: false, actors: [], respawnAt: -1 });
  S('shore', 60, 175, 2, 10); S('shore', 120, 75, 2, 10); S('shore', 20, 330, 2, 10); S('shore', 450, 300, 2, 12); S('shore', 300, 40, 1, 8); S('shore', 360, 470, 2, 10);
  S('wildlife', -20, -40, 3, 14); S('wildlife', 90, -260, 2, 14); S('wildlife', -300, -60, 3, 16); S('wildlife', -140, 300, 2, 14); S('wildlife', 380, -60, 3, 16); S('wildlife', -520, 40, 2, 14); S('wildlife', 200, 560, 2, 14);
  S('forest', -40, -150, 2); S('forest', 60, -120, 1); S('forest', -200, 20, 2); S('forest', -180, -260, 1); S('forest', 230, -80, 2);
  S('forest', -300, 60, 2); S('forest', 40, -330, 2); S('forest', 200, -420, 1); S('forest', 450, -150, 2); S('forest', -520, -100, 2);
  S('forest', -120, 220, 1); S('forest', 480, 80, 2); S('forest', -560, 180, 1); S('forest', -40, 420, 2); S('forest', 140, 520, 1);
  S('bandits', 340, -360, 3, 9); S('bandits', 180, -125, 1, 4);
  S('daedra', -380, 250, 2, 10, { needsGate: true });
  S('daedra', -440, 330, 2, 20, { needsGate: true });
  S(null, 335, -365, 1, 1, { unique: 'black_brugo' });
  S('undead_night', -470, 360, 1, 12, { nightOnly: true });
  S('dawn', -580, 395, 3, 7);
  S(null, LOCATIONS.chorrol.x + 92, LOCATIONS.chorrol.z + 6, 1, 1, { unique: 'wisp', needsFlag: 'wizardQuest' });
  S(null, 91, 66, 1, 1, { unique: 'sir_pinchington' }); S('shore', 97, 72, 2, 6);
  S('shore', 96, 396, 2, 5); S(null, 89, 402, 1, 1, { unique: 'bell_warden' });
  S('undead_night', 160, -48, 2, 10, { nightOnly: true });
  // the Lamplighter's ash-dead walk the woods around the Corwyns' clearing by night, until she is dead
  // wolves hunt the snowy woods of the foothills
  S('snow', -60, -520, 2, 14); S('snow', -280, -470, 2, 14); S('snow', 40, -470, 2, 12); S('snow', -420, -520, 2, 14);
  for (const [x, z] of [[-372, -76], [-414, -108], [-398, -64]]) S('ashen', x, z, 2, 6, { nightOnly: true, needsFlag: 'ashenWalk', needsNoFlag: 'lamplighterDead' });

  // townsfolk
  for (const npc of NPCS.filter((n) => n.cell === 'world' && !(n.spawnIf && !game.flags[n.spawnIf]) && !(n.spawnUnless && game.flags[n.spawnUnless]))) {
    const y = collision.groundHeight(npc.x, npc.z);
    game.spawnNpc(cell, npc, npc.x, y, npc.z);
  }
  // the Frostfang: Chief Gorbag on his throne and his warband round the fire (peaceful unless provoked)
  {
    const Hh = state.rabbits.hollow;
    const band = game.flags.frostfangHostile;
    const mk = (tpl, x, z, uid, yaw) => {
      const a = game.spawnCreature(cell, tpl, x, collision.ground(x, z), z, { uid, yaw });
      a.faction = 'neutral';
      a.def = { ...a.def, band: 'frostfang' };
      a.hostileToPlayer = !!band;
      return a;
    };
    if (!game.flags.killed.goblin_chief) { const g = mk('goblin_chief', Hh.throne.x, Hh.throne.z, 'gorbag', 0); g.def.stationary = true; g.homeYaw = 0; }
    [['goblin', -3, 2], ['goblin', 3, -2.5], ['goblin_berserker', -2.5, -3], ['goblin', 2, 3.5]].forEach(([t, dx, dz], i) => {
      const a = mk(t, Hh.x + dx, Hh.z + dz, 'frostfang_' + i, Math.atan2(-dx, -dz));
      a.def.wander = 5;
    });
  }
  // white rabbits all over the snows, once Snikkit's ten are free
  for (const [x, z] of [[-380, -505], [-250, -525], [-120, -505], [-40, -560], [60, -495], [150, -500], [260, -520], [-200, -600], [-310, -585], [-60, -620], [110, -600]]) S('rabbits', x, z, 3, 14, { needsFlag: 'rabbitsFreed' });
  // Honey and her pups round Hob's wagon (one fewer once you've taken yours)
  {
    const B = state.hob.bed;
    // on the grass by their blanket, away from the wagon (whose roof counts as somewhere to stand)
    const at = (x, z) => [x, collision.ground(x, z), z];
    game.spawnCreature(cell, 'mother_dog', ...at(B.x - 0.5, B.z - 0.6), { uid: 'honey', yaw: 1 });
    for (let i = 0; i < (game.flags.dogAdopted ? 2 : 3); i++) game.spawnCreature(cell, 'puppy', ...at(B.x - 2.2 - i * 0.9, B.z - 1.4 + (i - 1) * 0.9), { uid: 'pup_' + i, yaw: i * 2 });
  }
  // town critters
  for (const [tpl, u, v] of CHORROL_CRITTERS) {
    const x = LOCATIONS.chorrol.x + u, z = LOCATIONS.chorrol.z + v;
    game.spawnCreature(cell, tpl, x, collision.groundHeight(x, z, 500), z, { yaw: Math.random() * 6.28 });
  }
  // door return points
  for (const it of cell.interactables) {
    if (it.kind === 'door' && it.cell) {
      game.doorReturns[it.cell] = { x: it.pos.x, z: it.pos.z, yaw: null, from: it.pos.clone() };
    }
  }
  return cell;
}

// ------------------------------------------------------------------ interiors
export function createInteriorCell(game, id) {
  const def = INTERIORS[id];
  const cell = new Cell(id, def.name, true);
  cell.collision = new CollisionWorld(() => 0, 8);
  const b = new Builder(cell.group, cell.collision);
  const meta = buildInterior(b, id);
  cell.meta = meta;
  cell.bounds = meta.bounds;
  cell.music = def.music;
  cell.dungeon = !!def.dungeon;
  cell.lightLevel = def.lightLevel;
  cell.fog.color.setHex(def.fog[0]); cell.fog.near = def.fog[1]; cell.fog.far = def.fog[2];
  cell.ambient.sky.setHex(def.ambient[0]); cell.ambient.ground.setHex(def.ambient[1]); cell.ambient.intensity = def.ambient[2];

  // named NPCs
  for (const [slot, npcId] of Object.entries(def.npcs || {})) {
    const npc = NPCS.find((n) => n.id === npcId);
    const p = meta.npcs[slot];
    if (npc?.spawnIf && !game.flags[npc.spawnIf]) continue;
    if (npc?.spawnUnless && game.flags[npc.spawnUnless]) continue;
    if (npc && p) game.spawnNpc(cell, npc, p.x, 0, p.z, Math.PI);
  }
  // enemies
  if (def.spawnList) {
    for (const p of meta.enemies) game.spawnLeveled(cell, def.spawnList, p.x, 0, p.z);
  }
  if (meta.boss) {
    const tpl = def.boss || (id === 'sigil' ? 'dremora_kynval' : 'skeleton_champion');
    if (!game.flags.killed?.[tpl]) game.spawnCreature(cell, tpl, meta.boss.x, 0, meta.boss.z, { uid: tpl });
  }
  // quest items
  if (meta.heirloom && !game.taken['jemane_blade_pickup']) {
    game.placeItem(b, 'jemane_blade', meta.heirloom.x, 1.05, meta.heirloom.z, 'jemane_blade_pickup');
  }
  // the Grey Mare: a LOST CAT poster pinned high on the east wall, above the furniture
  if (id === 'inn') {
    const [wx, wz] = meta.at(11, 6);
    buildLostCatPoster(b, wx + meta.T / 2 - 0.03, 2.05, wz, -Math.PI / 2, 'poster_inn');
  }
  if (meta.crystal) buildHallOfHours(game, cell, b, meta);
  buildArmorDisplay(game, cell, b, meta, id);
  if (meta.statue) buildDagonShrine(game, cell, b, meta);
  if (meta.sigil) {
    const s = meta.sigil;
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), new THREE.MeshStandardMaterial({ color: 0xffa060, emissive: 0xff4010, emissiveIntensity: 3 }));
    stone.position.set(s.x, 2.2, s.z);
    stone.userData.spin = true;
    cell.group.add(stone);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 40, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff5010, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(s.x, 20, s.z);
    cell.group.add(beam);
    b.light(0xff6020, 60, 30, s.x, 3, s.z, { flicker: true });
    b.emitter('flame', s.x, 0.2, s.z, 30, { color: 0xff5010, size: 1.3 });
    b.interact({ kind: 'sigil', name: 'Sigil Stone', pos: new THREE.Vector3(s.x, 2.2, s.z), radius: 1.6, verb: 'Take', mesh: stone, beam });
  }
  cell.absorb(b);
  mergeStatic(cell.group, keepSet(cell));
  return cell;
}

/** The shrine of Mehrunes Dagon beneath Fort Sutch: his statue, the faithful, and the Mysterium Xarxes. */
function buildDagonShrine(game, cell, b, meta) {
  const st = meta.statue;
  if (isKitReady()) {
    const rig = buildKitRig({ head: 'dremora', horns: true, armor: { chest: 0x301010 }, scale: 3.0, hairStyle: 'bald' });
    if (rig) {
      const stone = M('obrock');
      rig.root.traverse((o) => { if (o.isMesh) { o.material = stone; o.castShadow = true; } });
      rig.root.position.set(st.x, 0.8, st.z);
      const clip = getClip('Spell_Simple_Idle_Loop') || getClip('Sword_Idle');
      if (clip) { const a = rig.mixer.clipAction(clip); a.play(); a.paused = true; a.time = clip.duration * 0.4; rig.mixer.update(0); }
      b.add(rig.root);
    }
  }
  b.col.addCircle(st.x, st.z, 1.6, -1, 7);
  b.interact({ kind: 'sign', name: 'Statue of Mehrunes Dagon', text: 'The Prince of Destruction, carved from black stone shot through with veins that glow like coals. Offerings lie at his feet: knives, rings, a child\'s shoe. The sculptor has given him a patient face, which is somehow the worst part.', pos: new THREE.Vector3(st.x, 1.6, st.z + 1.6), radius: 1.6, verb: 'Examine' });
  for (const c of meta.cultists || []) {
    const a = game.spawnCreature(cell, c.tpl, c.x, 0, c.z, { yaw: Math.atan2(st.x - c.x, st.z - c.z) });
    a.homeYaw = a.yaw;
    a.def.stationary = true;
  }
  if (meta.xarxes && !game.taken.xarxes_pickup) game.placeItem(b, 'mysterium_xarxes', meta.xarxes.x, 1.06, meta.xarxes.z, 'xarxes_pickup', { rot: 0.2 });
}

/** Corvin in his welkynd crystal, and the Atlas of Hours on its lectern, joined by a stream of light. */
function buildHallOfHours(game, cell, b, meta) {
  const { crystal: cp, atlas: ap } = meta;
  if (!game.flags.nenGate) game.flags.nenSeq = [];
  // the crystal
  const cmat = new THREE.MeshStandardMaterial({ color: 0x9ad0ff, emissive: 0x3a80ff, emissiveIntensity: 0.9, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true });
  const shell = new THREE.Mesh(new THREE.OctahedronGeometry(1.25, 0), cmat);
  shell.scale.set(0.95, 1.75, 0.95);
  shell.position.set(cp.x, 2.1, cp.z);
  shell.userData.dynamic = true;
  shell.renderOrder = 2;
  const holder = new THREE.Group();
  holder.add(shell);
  // Corvin, caught mid-step
  if (isKitReady()) {
    const R = RACES.imperial;
    const rig = buildKitRig({ skin: R.skin, hair: 0x5a3a20, beard: true, shirt: 0x4a5a6a, hairStyle: 'short' });
    if (rig) {
      rig.root.position.set(cp.x, 0.55, cp.z);
      rig.root.rotation.y = Math.PI / 2;
      const clip = getClip('Walk_Loop');
      if (clip) { const a = rig.mixer.clipAction(clip); a.play(); a.paused = true; a.time = clip.duration * 0.3; rig.mixer.update(0); }
      holder.add(rig.root);
      holder.userData.figure = rig;
    }
  }
  b.cyl(1.3, 1.5, 0.5, 'ayleid', cp.x, 0.25, cp.z, { seg: 10 });
  b.add(holder);
  b.col.addCircle(cp.x, cp.z, 1.3, -1, 4);
  const crystal = b.interact({ kind: 'crystal', id: 'nen_crystal', name: 'Welkynd Crystal', pos: new THREE.Vector3(cp.x + 1.4, 1.6, cp.z), radius: 1.8, verb: 'Examine', mesh: holder, shell, cmat });
  // the lectern and the Atlas
  b.box(0.7, 1.1, 0.5, 'ayleid', ap.x, 0.55, ap.z, Math.PI / 2);
  const book = new THREE.Group();
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xe8eef8, emissive: 0x80b0ff, emissiveIntensity: 0.7, roughness: 0.4, metalness: 0.6 });
  for (const s of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.44), pageMat);
    page.position.set(s * 0.16, 0, 0);
    page.rotation.z = -s * 0.12;
    book.add(page);
  }
  book.position.set(ap.x, 1.16, ap.z);
  book.rotation.set(0, Math.PI / 2, -0.25);
  book.userData.dynamic = true;
  b.add(book);
  // the stream of light from book to crystal
  const dx = cp.x - ap.x, dz = cp.z - ap.z, len = Math.hypot(dx, dz);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0x6aa8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.set((cp.x + ap.x) / 2, 1.6, (cp.z + ap.z) / 2);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, 0, dz).normalize());
  beam.userData.dynamic = true;
  b.add(beam);
  const atlas = b.interact({ kind: 'atlas', id: 'nen_atlas', name: 'The Atlas of Hours', pos: new THREE.Vector3(ap.x, 1.2, ap.z), radius: 1.2, verb: 'Examine', mesh: book, beam });
  b.light(0x6aa8ff, 30, 16, cp.x + 1, 2.5, cp.z, { flicker: false });
  cell.hall = { crystal, atlas, beam, shell, holder, book };
  game.applyHallState?.(cell);
}

// ------------------------------------------------------------------ the Deadlands
/** The Greenheart: a little Valenwood beyond the Hollow Elder. */
export function createGreenheartCell(game) {
  const cell = new Cell('greenheart', 'The Greenheart', false);
  const b = new Builder(cell.group, null);
  b.col = new CollisionWorld(() => 0, 16);
  const state = buildGreenheart(b, game);
  cell.collision = b.col;
  cell.terrain = state.terrain;
  cell.state = state;
  cell.absorb(b);
  if (state.scatter) cell.scatter = state.scatter.build(cell.group);
  mergeStatic(cell.group, keepSet(cell));
  cell.bounds = GH.bounds;
  cell.hasSky = true;
  cell.sunlit = true;
  cell.music = 'explore';
  cell.lightLevel = 0.6;
  cell.arrival = GH.arrival;
  // the folk of Falinor, deer in the glades and chipmunks everywhere
  for (const npc of NPCS.filter((n) => n.cell === 'greenheart')) game.spawnNpc(cell, npc, npc.x, cell.collision.groundHeight(npc.x, npc.z, 500), npc.z);
  const S = (list, x, z, count, radius) => cell.spawns.push({ list, x, z, count, radius, active: false, actors: [], respawnAt: -1 });
  for (const [x, z] of [[60, 80], [-70, 90], [90, -60], [-110, 30], [40, -120], [-40, -140], [130, 60], [-140, -90]]) S('greenheart', x, z, 3, 12);
  for (const [x, z] of [[20, 30], [-30, 30], [10, -45], [-18, -40]]) S('greenheart', x, z, 2, 6);
  return cell;
}

/** Brinewhistle Cove: the pirates' town on the Abecean coast, beyond the Smugglers' Cut. */
export function createCoveCell(game) {
  const cell = new Cell('cove', 'Brinewhistle Cove', false);
  const b = new Builder(cell.group, null);
  b.col = new CollisionWorld(() => 0, 16);
  const state = buildCove(b, game);
  cell.collision = b.col;
  cell.terrain = state.terrain;
  cell.state = state;
  cell.water = createReflectiveWater(1400, WATER_LEVEL, () => [cell.scatter, ...(game.particles ? [game.particles.add.points, game.particles.alpha.points] : []), game.sunAnchor, game.sunFlare?.userData.ghosts].filter(Boolean));
  cell.group.add(cell.water);
  cell.waterLevel = WATER_LEVEL;
  cell.absorb(b);
  if (state.scatter) cell.scatter = state.scatter.build(cell.group);
  mergeStatic(cell.group, keepSet(cell));
  cell.bounds = COVE.bounds;
  cell.hasSky = true;
  cell.sunlit = true;
  cell.music = 'explore';
  cell.lightLevel = 0.9;
  cell.arrival = COVE.arrival;
  // the crew and the folk of Brinewhistle
  for (const npc of NPCS.filter((n) => n.cell === 'cove')) {
    if (npc.spawnIf && !game.flags[npc.spawnIf]) continue;
    if (npc.spawnUnless && game.flags[npc.spawnUnless]) continue;
    game.spawnNpc(cell, npc, npc.x, cell.collision.groundHeight(npc.x, npc.z, 500), npc.z);
  }
  // mudcrabs along the west beach, and a pair guarding the Nook
  const S = (list, x, z, count, radius) => cell.spawns.push({ list, x, z, count, radius, active: false, actors: [], respawnAt: -1 });
  for (const [x, z] of [[-30, 26], [-44, 30], [38, 30]]) S('cove_shore', x, z, 2, 5);
  S('cove_shore', COVE.nook.x + 2, COVE.nook.z + 6, 2, 3);
  return cell;
}

export function createOblivionCell(game) {
  const cell = new Cell('oblivion', 'The Deadlands', false);
  const b = new Builder(cell.group, null);
  const state = {};
  // terrain first so the collision world can use it
  const tmpCol = new CollisionWorld(() => 0, 16);
  b.col = tmpCol;
  const terrain = buildOblivion(b, state);
  tmpCol.ground = (x, z) => terrain.heightAt(x, z);
  cell.collision = tmpCol;
  cell.terrain = terrain;
  cell.state = state;
  cell.absorb(b);
  mergeStatic(cell.group, keepSet(cell));
  cell.lava = OB.lava;
  cell.bounds = [-200, -200, 200, 200];
  cell.hasSky = true;
  cell.skyTint = 1;
  cell.sunlit = true;
  cell.music = 'oblivion';
  cell.lightLevel = 0.8;
  for (const sp of OB_SPAWNS) {
    for (let i = 0; i < sp.count; i++) {
      const x = sp.x + (Math.random() - 0.5) * 8, z = sp.z + (Math.random() - 0.5) * 8;
      game.spawnLeveled(cell, 'daedra', x, terrain.heightAt(x, z), z);
    }
  }
  cell.arrival = { x: OB.start.x, z: OB.start.z, yaw: 0 };
  return cell;
}
