// The overworld: a compact slice of Cyrodiil around Lake Rumare.
// North is -Z, East is +X. Water level is y = 0.
import { createNoise2D, fbm, ridged, smoothstep, lerp } from '../core/noise.js';

export const WORLD_HALF = 800;
export const WATER_LEVEL = 0;

export const LAKE = { x: 260, z: 260, r: 300, inner: 205 };
export const ISLAND = { x: 260, z: 260, r: 92, h: 5 };

export const LOCATIONS = {
  sewer: { name: 'Imperial Sewers Exit', x: 30, z: 128, icon: 'cave', discovered: true },
  imperial_city: { name: 'Imperial City', x: 260, z: 260, icon: 'city', discovered: true },
  chorrol: { name: 'Chorrol', x: -380, z: -300, icon: 'city', discovered: false },
  priory: { name: 'Weynon Priory', x: -250, z: -150, icon: 'settlement', discovered: false },
  kvatch: { name: 'Kvatch', x: -450, z: 340, icon: 'city', discovered: false },
  gate: { name: 'Oblivion Gate', x: -395, z: 265, icon: 'gate', discovered: false },
  vilverin: { name: 'Vilverin', x: 150, z: -40, icon: 'ruin', discovered: false },
  bandit_camp: { name: 'Black Road Camp', x: 340, z: -360, icon: 'camp', discovered: false },
  wayshrine_akatosh: { name: 'Wayshrine of Akatosh', x: -110, z: -70, icon: 'shrine', discovered: false },
  wayshrine_dibella: { name: 'Wayshrine of Dibella', x: -250, z: 140, icon: 'shrine', discovered: false },
  roxey_inn: { name: 'Roxey Inn', x: 60, z: 30, icon: 'settlement', discovered: false },
  fort_sutch: { name: 'Fort Sutch', x: -580, z: 380, icon: 'ruin', discovered: false },
  hollow_stones: { name: 'The Hollow Stones', x: -600, z: -380, icon: 'ruin', discovered: false },
  drowned_bell: { name: 'The Drowned Bell', x: 90, z: 403, icon: 'ruin', discovered: false },
  old_marrow: { name: "Old Marrow's Camp", x: -100, z: 260, icon: 'camp', discovered: false },
  corwyn_clearing: { name: "Corwyn's Clearing", x: -390, z: -94, icon: 'camp', discovered: false },
  gloamwood_barrow: { name: 'Gloamwood Barrow', x: -357, z: -112, icon: 'ruin', discovered: false },
  wintersmeet: { name: 'Wintersmeet', x: -180, z: -548, icon: 'settlement', discovered: false },
  hobs_wagon: { name: "Hob's Wagon", x: 580, z: 240, icon: 'camp', discovered: false },
  snikkits_den: { name: "Snikkit's Den", x: 60, z: -520, icon: 'camp', discovered: false },
  frostfang_hollow: { name: 'Frostfang Hollow', x: 205, z: -552, icon: 'camp', discovered: false },
  hollow_elder: { name: 'The Hollow Elder', x: -565, z: -95, icon: 'cave', discovered: false },
  skyward_shrine: { name: 'Skyward Shrine', x: -250, z: -603, icon: 'shrine', discovered: false },
  varns_camp: { name: "Varn's Camp", x: -330, z: -540, icon: 'camp', discovered: false },
  rime_spire: { name: 'The Rime Spire', x: -92, z: -636, icon: 'ruin', discovered: false },
  starfall: { name: 'Starfall Observatory', x: 30, z: -612, icon: 'ruin', discovered: false },
  hollow_gate: { name: 'The Hollow Gate', x: 325, z: -612, icon: 'ruin', discovered: false },
  smugglers_cut: { name: "The Smugglers' Cut", x: -470, z: 640, icon: 'cave', discovered: false },
};

// ---------------------------------------------------------------- the snows of the Jerall foothills
// North of Chorrol the land climbs toward the Jerall Mountains and the snow comes down to meet it.
// The snowline wanders; shaders reproduce the same curve (see SNOW_GLSL) so trees and ground agree.
export const SNOWLINE = -455;
// Above SNOW_HEIGHT the snow lies everywhere, so every ridge and peak round the world wears a white cap.
export const SNOW_HEIGHT = 58;
export function snowCover(x, z, h) {
  const zz = z + Math.sin(x * 0.05) * 12 + Math.sin(x * 0.013 + 1.7) * 18;
  const north = smoothstep(SNOWLINE + 25, SNOWLINE - 55, zz);
  if (north >= 1) return 1;
  const y = h ?? heightAt(x, z);
  return Math.max(north, smoothstep(SNOW_HEIGHT, SNOW_HEIGHT + 22, y + Math.sin(x * 0.07 + z * 0.05) * 4));
}
// ---------------------------------------------------------------- Wintersmeet
// A hamlet on the north road in the Jerall foothills. Plan relative to the town's centre, like Chorrol's:
// [u, v, width, depth, facing, name, style] (facing 0 = door to the south, +z).
export const WINTERSMEET_HOUSES = [
  [0, -18, 13, 9, 0, 'The Snow Hare', 'inn'],
  [-18, -10, 8, 7, Math.PI / 2, 'Sigrun\'s Rooms', 'one'],
  [18, -10, 8, 7, -Math.PI / 2, 'Matilde\'s Bakery', 'shop'],
  [-20, 8, 7, 7, Math.PI / 2, 'Gunnar\'s House', 'one'],
  [20, 8, 8, 6, -Math.PI / 2, 'Erlend\'s House'],
  [-10, 24, 7, 6, Math.PI, 'Old Brynja\'s Cottage', 'one'],
  [11, 25, 8, 6, Math.PI, 'The Cold Forge', 'one'],
];
/** 0..1: the trodden ground of Wintersmeet: a cobbled ring round the town tree, the lane in from the road, door paths. */
export function wintersmeetPaving(x, z) {
  const W = LOCATIONS.wintersmeet;
  const u = x - W.x, v = z - W.z;
  if (Math.abs(u) > 34 || Math.abs(v) > 34) return 0;
  let p = smoothstep(1.6, 0.6, Math.abs(Math.hypot(u, v - 1) - 7.5)); // ring round the tree
  p = Math.max(p, smoothstep(2.0, 1.2, Math.abs(u + 1)) * (v > 6 && v < 34 ? 1 : 0)); // the lane from the road
  for (const [hu, hv, w, d, f] of WINTERSMEET_HOUSES) {
    const fx = Math.sin(f), fz = Math.cos(f);
    const du = u - (hu + fx * (d / 2 + 2.4)), dv = v - (hv + fz * (d / 2 + 2.4));
    const along = Math.abs(du * fx + dv * fz), across = Math.abs(du * fz - dv * fx);
    if (along < 2.6 && across < 1.0) p = Math.max(p, 0.9);
  }
  return p;
}
/** Where the legendary swords rest: [item id, x, z, light colour]. */
export const LEGEND_SWORDS = [
  ['sunfall', -90, -95, 0xffc060], ['starfang', 602, 262, 0x8ab0ff], ['winters_edge', -330, -610, 0x9ad8ff],
  ['verdant_thorn', -260, 40, 0x8aff8a], ['voidreaver', -500, 300, 0xff3020],
];
export const SNOW_GLSL = `float snowCover(vec3 p) {
  float zz = p.z + sin(p.x * 0.05) * 12.0 + sin(p.x * 0.013 + 1.7) * 18.0;
  float north = smoothstep(${(SNOWLINE + 25).toFixed(1)}, ${(SNOWLINE - 55).toFixed(1)}, zz);
  return max(north, smoothstep(${SNOW_HEIGHT.toFixed(1)}, ${(SNOW_HEIGHT + 22).toFixed(1)}, p.y + sin(p.x * 0.07 + p.z * 0.05) * 4.0));
}`;

// Flattened areas: {x, z, r (full-flat radius), fall (blend width), h}
export const FLATS = [
  { x: 30, z: 128, r: 16, fall: 30, h: 3.2 }, // sewer exit
  { x: -380, z: -300, r: 88, fall: 50, h: 24 }, // Chorrol
  { x: -250, z: -150, r: 32, fall: 35, h: 18 }, // Priory
  { x: 150, z: -40, r: 22, fall: 30, h: 12 }, // Vilverin
  { x: 340, z: -360, r: 26, fall: 30, h: 20 }, // bandit camp
  { x: -450, z: 340, r: 60, fall: 40, h: 46 }, // Kvatch plateau
  { x: -395, z: 265, r: 22, fall: 30, h: 36 }, // gate plateau
  { x: 60, z: 30, r: 20, fall: 25, h: 9 }, // Roxey inn
  { x: 6, z: 252, r: 9, fall: 20, h: 4.6 }, // west bridge landing
  { x: -600, z: -380, r: 14, fall: 22, h: 29 }, // the Hollow Stones
  { x: -580, z: 380, r: 22, fall: 24, h: 33.8 }, // Fort Sutch
  { x: 90, z: 403, r: 6, fall: 7, h: 1.15 }, // the Drowned Bell islet
  { x: -100, z: 260, r: 9, fall: 16, h: 21.5 }, // Old Marrow's camp
  { x: -390, z: -94, r: 13, fall: 16, h: 27.0 }, // Corwyn's Clearing
  { x: -357, z: -112, r: 6, fall: 12, h: 21.0 }, // Gloamwood Barrow
  { x: -180, z: -548, r: 34, fall: 30, h: 30.5 }, // Wintersmeet
  { x: 580, z: 240, r: 8, fall: 14, h: 12.4 }, // Hob's wagon, in the starflower meadow east of the lake
  { x: 60, z: -520, r: 7, fall: 12, h: 28.5 }, // Snikkit's den
  { x: 205, z: -552, r: 15, fall: 16, h: 32 }, // Frostfang Hollow
  { x: -565, z: -95, r: 9, fall: 12, h: 20 }, // the Hollow Elder
  // the five legendary swords' pedestals
  { x: -90, z: -95, r: 3.5, fall: 7, h: 18.4 }, // Sunfall, on the rise behind the Wayshrine of Akatosh
  { x: 602, z: 262, r: 3.5, fall: 7, h: 10.1 }, // Starfang, in the starflower meadow
  { x: -330, z: -610, r: 3.5, fall: 8, h: 68.6 }, // Winter's Edge, on a ridge in the Jerall foothills
  { x: -260, z: 40, r: 3.5, fall: 7, h: 13.1 }, // Verdant Thorn, deep in the Great Forest
  { x: -500, z: 300, r: 3.5, fall: 7, h: 46.1 }, // Voidreaver, in the ashes of Kvatch
  { x: -250, z: -603, r: 7, fall: 12, h: 49.5 }, // the Skyward Shrine
  { x: -330, z: -540, r: 9, fall: 14, h: 33.5 }, // Varn's camp
  { x: -92, z: -636, r: 12, fall: 18, h: 60 }, // the Rime Spire's ledge
  { x: -136, z: -597, r: 3, fall: 9, h: 45 }, // ...and the old track cut up to it
  { x: -122, z: -608, r: 3, fall: 9, h: 49.5 },
  { x: -110, z: -619, r: 3, fall: 9, h: 54.5 },
  { x: -470, z: 640, r: 8, fall: 12, h: 15 }, // the Smugglers' Cut, at the foot of the southern mountains
  // the Hollow King: the Guild's ruined observatory on a shoulder of the Jerall, and the Hollow Gate's apron
  { x: 30, z: -611, r: 9, fall: 13, h: 37 }, // Starfall Observatory
  { x: 325, z: -603, r: 11, fall: 12, h: 47 }, // the Hollow Gate's apron, at the foot of the cliff
];

export const ROADS = [
  [[30, 118], [10, 70], [-40, 10], [-110, -55], [-190, -110], [-250, -130], [-320, -200], [-380, -238]],
  [[-110, -55], [-160, 40], [-250, 130], [-320, 200], [-370, 240], [-395, 255]],
  [[-395, 275], [-420, 300], [-450, 312]],
  [[10, 70], [60, 40], [110, -10], [145, -30]],
  [[110, -10], [180, -120], [250, -230], [300, -320], [325, -350]],
  [[30, 118], [8, 190], [6, 248]],
  [[-320, -300], [-200, -310], [-60, -260], [100, -200], [180, -120]],
  // the north road, climbing from the Chorrol road into the snow to Wintersmeet
  [[-200, -310], [-206, -380], [-196, -440], [-188, -500], [-182, -520]],
  // the old watch track from Wintersmeet up to the Rime Spire
  [[-166, -568], [-140, -590], [-116, -612], [-100, -626]],
  // the Guild's old observatory road, past Snikkit's Den and up onto the shoulder at Starfall
  [[60, -528], [48, -556], [36, -578], [30, -598], [30, -604]],
  // the founders' track from Frostfang Hollow north-east to the Hollow Gate
  [[218, -556], [252, -572], [286, -588], [312, -598], [325, -602]],
];

// The Hollow King: anchor points round the two world sites (the rest is in world/hollowking.js)
export const HK = {
  starfallDoor: { x: 30, z: -606.6 }, // the observatory door, facing south down the road
  starfallReturn: { x: 30, z: -604.4, yaw: Math.PI }, // just outside it, looking away
  gateDoor: { x: 325, z: -614.2 }, // the black-ice door in the cliff, facing south
  gateFront: { x: 325, z: -607.8, yaw: 0 }, // where you stand with the Ember for the rite, facing the door
  gateReturn: { x: 325, z: -606, yaw: Math.PI }, // just outside the gate, looking away from it
  gateSpawns: [[313, -600], [337, -600], [318, -592], [332, -592], [307, -607], [343, -606]],
};

export const BRIDGE = { x0: 8, z0: 252, x1: 172, z1: 258, y: 4.7, width: 6 };

const noise = createNoise2D(1337);
const noise2 = createNoise2D(4242);

export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + dx * t, cz = az + dz * t;
  return Math.hypot(px - cx, pz - cz);
}

export function roadDistance(x, z) {
  let best = Infinity;
  for (const road of ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      const [ax, az] = road[i], [bx, bz] = road[i + 1];
      // cheap reject
      if (x < Math.min(ax, bx) - best || x > Math.max(ax, bx) + best) continue;
      if (z < Math.min(az, bz) - best || z > Math.max(az, bz) + best) continue;
      const d = distToSegment(x, z, ax, az, bx, bz);
      if (d < best) best = d;
    }
  }
  return best;
}

/** Analytic terrain height. The mesh samples this; runtime queries use the mesh grid. */
export function heightAt(x, z) {
  let h = 14 + fbm(noise, x / 380, z / 380, 5) * 17;
  // hills strengthen to the north-west
  const hill = smoothstep(-100, -500, z + x * 0.4);
  h += ridged(noise2, x / 170, z / 170, 4) * 26 * (0.35 + hill);
  // mountain ring at the edges of the world
  const edge = Math.max(Math.abs(x), Math.abs(z));
  if (edge > 600) {
    const e = (edge - 600) / 200;
    h += e * e * 160 + ridged(noise2, x / 90, z / 90, 3) * 40 * e;
  }
  // Jerall foothills along the north
  if (z < -520) {
    const e = smoothstep(-520, -760, z);
    h += e * 90 * (0.6 + 0.4 * ridged(noise, x / 120, z / 120, 3));
  }
  // Kvatch hill
  {
    const d = Math.hypot(x + 450, z - 340);
    h += 34 * Math.exp(-(d * d) / (2 * 110 * 110));
  }
  // Lake Rumare
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < LAKE.r) {
    const t = smoothstep(LAKE.r, LAKE.inner, dl);
    h = lerp(h, -9 + fbm(noise, x / 60, z / 60, 2) * 2, t);
  }
  // Imperial City island
  if (dl < ISLAND.r + 30) {
    const t = smoothstep(ISLAND.r + 30, ISLAND.r, dl);
    h = lerp(h, ISLAND.h, t);
  }
  // flattened settlements
  for (const f of FLATS) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d < f.r + f.fall) {
      const t = smoothstep(f.r + f.fall, f.r, d);
      h = lerp(h, f.h, t);
    }
  }
  // roads: gently smooth by pulling toward a low-frequency version of the land
  return h;
}

// ---------------------------------------------------------------- Chorrol
// Town plan, relative to the Great Oak: walls at +-62, the south gate at +z, the east gate at +x,
// the castle to the north. Houses: [u, v, width, depth, facing(rad), name, style]
// facing: 0 = door to the south (+z), PI = north, PI/2 = east, -PI/2 = west.
const PI2 = Math.PI / 2;
export const CHORROL_HOUSES = [
  // south-east
  [11, 30, 8, 8, -PI2, 'Honditar\'s House'], [11, 39, 7, 8, -PI2, 'Casta Scribonia\'s House', 'one'],
  [33, 12, 9, 7, Math.PI, 'Renoit\'s Books', 'shop'], [52, 22, 8, 7, -PI2, 'Alberic Litte\'s House'],
  [52, 33, 8, 7, -PI2, 'Jirolin Corlan\'s House', 'one'], [30, 52, 9, 7, Math.PI, 'Talasma\'s House'],
  [52, 54, 7, 6, Math.PI, 'Bargol\'s Cottage', 'one'],
  // south-west
  [-11, 20, 7, 7, PI2, 'Francois Motierre\'s House', 'one'], [-11, 40, 8, 7, PI2, 'Wavrick Tannery', 'shop'],
  [-11, 52, 8, 7, PI2, 'Earana\'s House'], [-28, 52, 9, 7, Math.PI, 'Orag\'s House', 'one'],
  [-32, 12, 8, 7, Math.PI, 'The Oak and Crosier', 'shop'], [-54, 26, 8, 7, PI2, 'Lazy Kaslowyn\'s House', 'one'],
  // north-west
  [-11, -18, 8, 7, PI2, 'Nermus\'s House'], [-36, -10, 8, 7, 0, 'Seed-Neeus\'s Rooms'],
  [-52, -12, 8, 7, 0, 'Vilena Donton\'s House', 'one'], [-40, -28, 9, 7, PI2, 'Modryn Oreyn\'s House'],
  [-28, -40, 8, 7, PI2, 'Countess\'s Steward', 'one'],
  // north-east
  [12, -24, 7, 7, -PI2, 'Chorrol Scriptorium', 'one'], [36, -8, 9, 7, 0, 'Fire and Steel', 'shop'],
  [52, -14, 8, 7, -PI2, 'Map Collector\'s House'], [52, -34, 8, 7, -PI2, 'Guard Barracks', 'one'],
  [34, -44, 9, 7, 0, 'Chorrol Stables Office', 'one'],
];

/** 0..1: how paved the ground of Chorrol is (avenues, the plaza ring, the castle forecourt). */
export function chorrolPaving(x, z) {
  const u = x + 380, v = z + 300;
  if (Math.abs(u) > 61 || Math.abs(v) > 61) return 0;
  const r = Math.hypot(u, v);
  let p = 0;
  // the plaza ring round the Great Oak (the oak itself stands in a garden)
  p = Math.max(p, smoothstep(4.8, 3.8, Math.abs(r - 16.5)));
  if (r > 12.5) {
    p = Math.max(p, smoothstep(4.6, 3.6, Math.abs(u)) * (v > -40 ? 1 : 0)); // castle road and south gate
    p = Math.max(p, smoothstep(4.6, 3.6, Math.abs(v)) * (u > -58 ? 1 : 0)); // east gate road
  }
  // castle forecourt
  if (v < -26 && v > -40) p = Math.max(p, smoothstep(17, 15, Math.abs(u)));
  // short paths to every front door
  for (const [hu, hv, w, d, f] of CHORROL_HOUSES) {
    const fx = Math.sin(f), fz = Math.cos(f);
    const du = u - (hu + fx * (d / 2 + 2)), dv = v - (hv + fz * (d / 2 + 2));
    const along = Math.abs(du * fx + dv * fz), across = Math.abs(du * fz - dv * fx);
    if (along < 2.4 && across < 1.1) p = Math.max(p, 1);
  }
  return p;
}

/** Slope-independent "biome" helpers used for colouring and vegetation. */
export function forestDensity(x, z) {
  const n = fbm(noise2, x / 220 + 10, z / 220 - 4, 3);
  return smoothstep(-0.15, 0.45, n);
}

export function isInSettlement(x, z, pad = 0) {
  for (const f of FLATS) {
    if (Math.hypot(x - f.x, z - f.z) < f.r + pad) return true;
  }
  return false;
}

export const KVATCH_BURN = { x: -430, z: 310, r: 170 };

// ---------------------------------------------------------------- Brinewhistle Cove
// A pirate cove on the Abecean coast, its own little world beyond the Smugglers' Cut (see cove.js).
// The sea lies to the south (+z); cliffs close it in to the north, east and west.
/** Where the beach meets the sea (height 0): a crescent, curving out toward the headlands at either end. */
export function shoreZ(x) {
  return 23 + Math.sin(x * 0.07) * 1.5 + smoothstep(22, 46, Math.abs(x)) * 7;
}
// A small, close cove: grassy headlands wrap round a crescent beach; the town clusters round a sandy plaza
// and the bonfire, the beached Herring at its heart and shacks on stilts stepping up the slope behind.
export const COVE = {
  bounds: [-95, -85, 95, 115],
  arrival: { x: 0, z: -57, yaw: Math.PI }, // on the ledge outside the tunnel, looking down over the town to the sea
  exitDoor: { x: 0, z: -63.5 }, // the tunnel door back to Cyrodiil, at the foot of the bank behind the ledge
  worldReturn: { x: -470, z: 638, yaw: 0 }, // in front of the Smugglers' Cut, facing north toward Fort Sutch
  town: { x: -2, z: 4 }, // the plaza
  herring: { x: 21, z: 12, rot: -0.12 }, // long axis roughly east-west, heeled over toward the sea
  herringDoor: { x: 20.6, z: 9.0 },
  rail: { x: 19, y: 8.5, z: 11.8 }, // refined against the hull when the cove is built
  tavern: { x: -21, z: -6 }, tavernDoor: { x: -21, z: -0.8 },
  fire: { x: -2, z: 6 },
  pierStart: { x: 4, z: 16 }, pierEnd: { x: 4, z: 62 }, jolly: { x: 7.5, z: 56 },
  pierWait: { x: 5, z: 50 },
  barrel: { x: 0.5, z: 18 },
  nook: { x: -36, z: 21 },
  grottoDoor: { x: -49, z: 10 },
  lighthouse: { x: 56, z: 44 }, lighthouseSteps: { x: 49.5, z: 40 },
  gullstack: { x: 30, z: 96 },
  meringue: { x: -24, z: 118, rot: 0.15 },
  // where the drowned wade ashore: just out in the shallows in front of town
  beach: [-26, -19, -12, -5, 2, 9, 16, 23, 30, 36].map((x) => [x, Math.round((shoreZ(x) + 3.5) * 10) / 10]),
  grummBeach: { x: -9, z: 0 },
};
