import { describe, it, expect } from 'vitest';
import { heightAt, LOCATIONS, FLATS, ROADS, BRIDGE, LAKE, WATER_LEVEL } from '../src/world/layout.js';
import { INTERIORS, parseMap, floodCheck } from '../src/world/interiors.js';
import { obHeight, OB, pathX } from '../src/world/oblivion.js';
import { NPCS } from '../src/data/actors.js';

describe('overworld layout', () => {
  it('every location and road vertex is above water', () => {
    for (const [id, L] of Object.entries(LOCATIONS)) expect(heightAt(L.x, L.z), id).toBeGreaterThan(WATER_LEVEL + 1);
    for (const road of ROADS) for (const [x, z] of road) expect(heightAt(x, z), `${x},${z}`).toBeGreaterThan(WATER_LEVEL);
  });
  it('settlements are flat', () => {
    for (const f of FLATS) {
      const hs = [0, 1, 2, 3].map((k) => heightAt(f.x + Math.cos(k) * f.r * 0.8, f.z + Math.sin(k) * f.r * 0.8));
      for (const h of hs) expect(Math.abs(h - f.h)).toBeLessThan(0.05);
    }
  });
  it('Lake Rumare is under water and the bridge spans it', () => {
    expect(heightAt(LAKE.x + 150, LAKE.z)).toBeLessThan(WATER_LEVEL - 3);
    expect(Math.abs(heightAt(BRIDGE.x0, BRIDGE.z0) - BRIDGE.y)).toBeLessThan(0.6);
    expect(Math.abs(heightAt(BRIDGE.x1, BRIDGE.z1) - BRIDGE.y)).toBeLessThan(0.6);
  });
});

describe('interiors', () => {
  for (const [id, def] of Object.entries(INTERIORS)) {
    it(`${id}: map is rectangular, has an exit and is fully connected`, () => {
      const widths = new Set(def.map.map((r) => r.length));
      expect(widths.size).toBe(1);
      const grid = parseMap(def.map);
      expect(grid.flat().filter((c) => c === 'D')).toHaveLength(1);
      expect(floodCheck(grid)).toMatchObject({ ok: true });
      for (const slot of Object.keys(def.npcs || {})) expect(grid.flat()).toContain(slot);
    });
  }
  it('interior NPCs are assigned to a slot of their cell', () => {
    for (const n of NPCS.filter((x) => !['world', 'none', 'greenheart', 'cove'].includes(x.cell))) { // 'none': spawned by quests; greenheart, cove: outdoor regions
      const def = INTERIORS[n.cell];
      expect(Object.values(def.npcs), n.id).toContain(n.id);
    }
  });
});

describe('Deadlands', () => {
  it('the path from the return portal to the Sigil Tower stays above lava', () => {
    for (let z = OB.start.z; z > OB.tower.z + 20; z -= 2) {
      expect(obHeight(pathX(z), z), `z=${z}`).toBeGreaterThan(OB.lava + 1);
    }
  });
});
