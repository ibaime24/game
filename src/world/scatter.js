// Overworld dressing with the scanned props: forest-floor undergrowth, rocks and fallen logs,
// meadow flowers, shoreline stones, harvestable herbs, glowing nirnroot by the lake, a pier and a ship.
import * as THREE from 'three';
import { PropScatter, makeProp, hasProp, propVariants, placeProp } from './props.js';
import { roadDistance, forestDensity, isInSettlement, LOCATIONS, KVATCH_BURN, LAKE, BRIDGE, distToSegment, snowCover } from './layout.js';

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// herb props and the ingredient each yields
const HERBS = [
  { prop: 'fern_02', item: 'somnalius', name: 'Somnalius Fern', forest: true, height: [0.7, 1.0] },
  { prop: 'dandelion_01', item: 'st_jahns_wort', name: "St. Jahn's Wort", forest: false, height: [0.4, 0.55] },
  { prop: 'celandine_01', item: 'ladys_mantle', name: "Lady's Mantle", forest: false, height: [0.4, 0.55] },
  { prop: 'nettle_plant', item: 'ladys_smock', name: "Lady's Smock", forest: true, height: [0.6, 0.85] },
];

export function buildWorldScatter(cell, terrain, collision, b) {
  if (!hasProp('fern_02')) return null;
  const rand = mulberry32(9001);
  const sc = new PropScatter(120);
  const keepClear = [...Object.values(LOCATIONS).map((l) => [l.x, l.z, 20]), [LOCATIONS.chorrol.x, LOCATIONS.chorrol.z, 92], [LOCATIONS.wintersmeet.x, LOCATIONS.wintersmeet.z, 44]];
  const clear = (x, z) => keepClear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)
    || distToSegment(x, z, BRIDGE.x0, BRIDGE.z0, BRIDGE.x1, BRIDGE.z1) < 8;
  const nv = (id) => propVariants(id);
  const pick = (id) => Math.floor(rand() * nv(id));

  const step = 5;
  let count = 0;
  for (let gx = -720; gx < 720; gx += step) {
    for (let gz = -720; gz < 720; gz += step) {
      const x = gx + rand() * step, z = gz + rand() * step;
      const h = terrain.heightAt(x, z);
      if (h < -0.3 || h > 160) continue;
      const rd = roadDistance(x, z);
      if (rd < 3.5 || isInSettlement(x, z, 4) || clear(x, z)) continue;
      const ny = terrain.normalAt(x, z).y;
      const dens = forestDensity(x, z);
      const burnt = Math.hypot(x - KVATCH_BURN.x, z - KVATCH_BURN.z) < KVATCH_BURN.r;
      const r = rand();
      const rot = rand() * Math.PI * 2;

      // shoreline: pebbles and driftwood
      if (h < 1.6) {
        if (r < 0.1) sc.add(['rock_07', 'rock_09', 'stone_01'][Math.floor(rand() * 3)], x, h - 0.05, z, { variant: Math.floor(rand() * 4), scale: 3 + rand() * 6, rotY: rot, maxDist: 80 });
        else if (r < 0.115) sc.add('dead_tree_trunk', x, h - 0.08, z, { scale: 0.6 + rand() * 0.5, rotY: rot, maxDist: 140, shadow: true });
        continue;
      }
      // deep snow buries the undergrowth: only fallen trunks, stumps and dead branches show
      const sn = snowCover(x, z, h);
      if (sn > 0.45) {
        if (r < 0.012) {
          sc.add('dead_tree_trunk_02', x, h - 0.12, z, { scale: 0.7 + rand() * 0.5, rotY: rot, maxDist: 180, shadow: true });
          collision.addBox(x, z, 1.6, 0.4, rot, h - 1, h + 0.7, { walkable: true });
        } else if (r < 0.022) {
          sc.add(rand() < 0.5 ? 'tree_stump_01' : 'tree_stump_02', x, h - 0.1, z, { scale: 0.6 + rand() * 0.5, rotY: rot, maxDist: 160, shadow: true });
          collision.addCircle(x, z, 0.45, h - 1, h + 0.45, { walkable: true });
        } else if (r < 0.04 && ny > 0.86) sc.add('dry_branches_medium_01', x, h - 0.03, z, { scale: 0.8 + rand() * 0.8, rotY: rot, maxDist: 60 });
        else if (r > 0.993 && h < 120) {
          const s = sc.add('boulder_01', x, h - 0.3, z, { scale: 0.7 + rand() * 0.9, rotY: rot, maxDist: 320, shadow: true });
          if (s) collision.addCircle(x, z, Math.min(s.x, s.z) * 0.45, h - 1, h + s.y * 0.85, { walkable: true });
        }
        continue;
      }
      // steep or high ground: mossy rock sets and boulders
      if (ny < 0.86 || h > 70) {
        if (r < 0.06) {
          const id = rand() < 0.5 ? 'rock_moss_set_01' : 'rock_moss_set_02';
          const s = sc.add(id, x, h - 0.25, z, { variant: pick(id), scale: 0.8 + rand() * 1.4, rotY: rot, maxDist: 260, shadow: true });
          if (s && Math.max(s.x, s.z) > 1.2) collision.addCircle(x, z, Math.min(s.x, s.z) * 0.4, h - 1, h + s.y * 0.8, { walkable: true });
        } else if (r < 0.075) {
          const s = sc.add(rand() < 0.5 ? 'boulder_01' : 'namaqualand_boulder_02', x, h - 0.3, z, { scale: 0.8 + rand() * 1.2, rotY: rot, maxDist: 320, shadow: true });
          collision.addCircle(x, z, Math.min(s.x, s.z) * 0.45, h - 1, h + s.y * 0.85, { walkable: true });
        }
        continue;
      }
      if (burnt) {
        if (r < 0.03) sc.add('dead_tree_trunk_02', x, h - 0.1, z, { scale: 0.8 + rand() * 0.4, rotY: rot, maxDist: 160, shadow: true });
        else if (r < 0.06) sc.add('dry_branches_medium_01', x, h - 0.03, z, { scale: 1 + rand(), rotY: rot, maxDist: 70 });
        continue;
      }
      if (dens > 0.3) {
        // forest floor
        if (r < 0.34 * dens) sc.add('fern_02', x, h - 0.05, z, { variant: pick('fern_02'), height: 0.65 + rand() * 0.5, rotY: rot, maxDist: 70 });
        else if (r < 0.42 * dens) sc.add('shrub_02', x, h - 0.05, z, { variant: pick('shrub_02'), height: 1.0 + rand() * 0.9, rotY: rot, maxDist: 120 });
        else if (r < 0.48 * dens) sc.add('nettle_plant', x, h - 0.03, z, { variant: pick('nettle_plant'), height: 0.5 + rand() * 0.35, rotY: rot, maxDist: 55 });
        else if (r < 0.495 * dens) {
          sc.add('dead_tree_trunk_02', x, h - 0.12, z, { scale: 0.7 + rand() * 0.5, rotY: rot, maxDist: 180, shadow: true });
          collision.addBox(x, z, 1.6, 0.4, rot, h - 1, h + 0.7, { walkable: true });
        } else if (r < 0.51 * dens) {
          const id = rand() < 0.5 ? 'tree_stump_01' : 'tree_stump_02';
          sc.add(id, x, h - 0.12, z, { scale: 0.6 + rand() * 0.5, rotY: rot, maxDist: 160, shadow: true });
          collision.addCircle(x, z, 0.45, h - 1, h + 0.45, { walkable: true });
        } else if (r < 0.525 * dens) sc.add(rand() < 0.5 ? 'root_cluster_01' : 'pine_roots', x, h - 0.05, z, { variant: 0, scale: 0.6 + rand() * 0.4, rotY: rot, maxDist: 100 });
        else if (r < 0.55 * dens) sc.add('dry_branches_medium_01', x, h - 0.03, z, { scale: 0.8 + rand() * 0.8, rotY: rot, maxDist: 60 });
        else if (r < 0.6 * dens) sc.add('shrub_01', x, h - 0.03, z, { variant: pick('shrub_01'), height: 0.6 + rand() * 0.5, rotY: rot, maxDist: 75 });
      } else {
        // meadows and road verges: wildflowers, low shrubs, the odd rock
        if (r < 0.07) sc.add('dandelion_01', x, h - 0.02, z, { variant: pick('dandelion_01'), height: 0.3 + rand() * 0.2, rotY: rot, maxDist: 50 });
        else if (r < 0.12) sc.add('celandine_01', x, h - 0.02, z, { variant: pick('celandine_01'), height: 0.3 + rand() * 0.2, rotY: rot, maxDist: 50 });
        else if (r < 0.15) sc.add('shrub_03', x, h - 0.03, z, { variant: pick('shrub_03'), height: 0.6 + rand() * 0.5, rotY: rot, maxDist: 80 });
        else if (r < 0.17) sc.add('shrub_04', x, h - 0.03, z, { variant: pick('shrub_04'), height: 0.5 + rand() * 0.4, rotY: rot, maxDist: 70 });
        else if (r < 0.178) sc.add('rock_moss_set_02', x, h - 0.2, z, { variant: pick('rock_moss_set_02'), scale: 0.4 + rand() * 0.5, rotY: rot, maxDist: 160 });
      }
      count++;
    }
  }
  cell.scatter = sc.build(cell.group);

  // ---- harvestable herbs: individual plants near roads and clearings
  let herbN = 0;
  for (let i = 0; i < 2400 && herbN < 260; i++) {
    const x = (rand() - 0.5) * 1400, z = (rand() - 0.5) * 1400;
    const h = terrain.heightAt(x, z);
    if (h < 2 || h > 90 || isInSettlement(x, z, 6) || clear(x, z)) continue;
    const rd = roadDistance(x, z);
    if (rd < 4 || rd > 60) continue;
    if (terrain.normalAt(x, z).y < 0.88) continue;
    const dens = forestDensity(x, z);
    const options = HERBS.filter((hb) => hb.forest === dens > 0.35);
    const hb = options[Math.floor(rand() * options.length)];
    const g = makeProp(hb.prop, { variant: Math.floor(rand() * propVariants(hb.prop)), height: hb.height[0] + rand() * (hb.height[1] - hb.height[0]) });
    if (!g) continue;
    g.position.set(x, h - 0.03, z);
    g.rotation.y = rand() * 6.28;
    g.traverse((o) => { o.castShadow = false; });
    b.add(g);
    b.interact({ kind: 'harvest', id: `herb_${herbN++}`, name: hb.name, item: hb.item, pos: new THREE.Vector3(x, h + 0.3, z), radius: 0.9, verb: 'Harvest', mesh: g });
  }

  // ---- nirnroot: rare glowing plants on the lake shore
  const nirnMat = new THREE.MeshStandardMaterial({ color: 0x6a9a50, emissive: 0x58ff90, emissiveIntensity: 0.9, roughness: 0.6 });
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0x7a8a50, emissive: 0x204020, roughness: 0.8 });
  let nirnN = 0;
  for (let i = 0; i < 4000 && nirnN < 14; i++) {
    const a = rand() * Math.PI * 2;
    const rr = LAKE.inner + rand() * (LAKE.r - LAKE.inner + 30);
    const x = LAKE.x + Math.cos(a) * rr, z = LAKE.z + Math.sin(a) * rr;
    const h = terrain.heightAt(x, z);
    if (h < 0.5 || h > 2.4 || isInSettlement(x, z, 6) || clear(x, z)) continue;
    const g = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.75, 5), stalkMat);
    stalk.position.y = 0.37;
    g.add(stalk);
    for (let k = 0; k < 4; k++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 4), nirnMat);
      leaf.scale.set(1.3, 0.25, 0.55);
      const ka = k * 1.57 + 0.4;
      leaf.position.set(Math.cos(ka) * 0.11, 0.1 + k * 0.05, Math.sin(ka) * 0.11);
      leaf.rotation.y = -ka;
      g.add(leaf);
    }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), nirnMat);
    bulb.position.y = 0.78;
    g.add(bulb);
    g.position.set(x, h - 0.02, z);
    g.userData.nirnroot = true;
    b.add(g);
    b.interact({ kind: 'harvest', id: `nirn_${nirnN++}`, name: 'Nirnroot', item: 'nirnroot', respawnDays: 10, pos: new THREE.Vector3(x, h + 0.5, z), radius: 1.0, verb: 'Harvest', mesh: g, chime: true });
  }

  // ---- a fishing pier and a merchant ship below the sewer exit
  if (hasProp('wine_barrel_01')) {
    const S = LOCATIONS.sewer;
    const dir = new THREE.Vector2(LAKE.x - S.x, LAKE.z - S.z).normalize();
    let px = S.x, pz = S.z;
    for (let k = 0; k < 200; k++) {
      px += dir.x; pz += dir.y;
      if (terrain.heightAt(px, pz) < 0.4) break;
    }
    const rot = Math.atan2(dir.x, dir.y);
    // plank deck on timber posts, running 18 m out into the lake
    const deckY = 1.15, len = 18, wid = 2.6;
    const cx = px + dir.x * (len / 2 - 2), cz = pz + dir.y * (len / 2 - 2);
    b.box(wid, 0.16, len, 'floor', cx, deckY - 0.08, cz, rot, { walkable: true, tile: 1 });
    const P0 = (lx, lz) => [cx + lx * Math.cos(rot) + lz * Math.sin(rot), cz - lx * Math.sin(rot) + lz * Math.cos(rot)];
    for (let k = 0; k <= 6; k++) {
      for (const sx of [-1, 1]) {
        const [qx, qz] = P0(sx * (wid / 2 - 0.1), -len / 2 + 0.3 + k * (len - 0.6) / 6);
        b.cyl(0.11, 0.13, deckY + 2.6, 'timber', qx, deckY - (deckY + 2.6) / 2 + 0.35, qz, { seg: 7, collide: false });
      }
      const [rx, rz] = P0(0, -len / 2 + 0.3 + k * (len - 0.6) / 6);
      b.box(wid + 0.3, 0.14, 0.2, 'timber', rx, deckY - 0.22, rz, rot, { collide: false });
    }
    // barrels and crates on the pier
    const P = P0;
    const [b1x, b1z] = P(0.8, 3); placeProp(b, 'wine_barrel_01', b1x, deckY, b1z, { scale: 1.1 });
    const [b2x, b2z] = P(-0.9, -2); placeProp(b, 'wooden_crate_02', b2x, deckY, b2z, { rot: rot + 0.2 });
    const [b3x, b3z] = P(0.9, -6); placeProp(b, 'wooden_bucket_02', b3x, deckY, b3z, {});
    if (hasProp('dutch_ship_medium')) {
      const ship = makeProp('dutch_ship_medium');
      const [sx, sz] = P(14, len / 2 + 4);
      ship.position.set(sx, -2.0, sz);
      ship.rotation.y = rot + Math.PI / 2;
      b.add(ship);
      b.col.addBox(sx, sz, 11, 3.2, rot + Math.PI / 2, -2, 6);
      b.interact({ kind: 'sign', name: 'The Bloated Float', text: 'A weathered merchant galleon rides at anchor in the shallows. Her gangplank is drawn up; the crew went ashore at the Imperial City docks and never came back. The name on her stern reads THE BLOATED FLOAT.', pos: new THREE.Vector3(sx, 2, sz), radius: 9, verb: 'Examine' });
    }
  }
  return { count, herbs: herbN, nirn: nirnN };
}
