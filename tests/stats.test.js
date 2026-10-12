import { describe, it, expect } from 'vitest';
import {
  createCharacter, exerciseSkill, canLevelUp, applyLevelUp, attributeBonus, skillXpNeeded, levelNeeded, LEVEL_ATTR_GAIN,
  weaponDamage, armorMultiplier, blockReduction, spellCost, priceMultiplier, detectChance,
  maxMagicka, baseHealth, RACES, CLASSES, BIRTHSIGNS, SKILL_IDS, ATTRIBUTES,
} from '../src/data/stats.js';
import { ITEMS } from '../src/data/items.js';

describe('character creation', () => {
  it('gives major skills a 25 base plus specialization and racial bonuses', () => {
    const ch = createCharacter({ race: 'nord', cls: 'warrior', sign: 'warrior' });
    // blade: major (25) + combat spec (5) + nord (10)
    expect(ch.skills.blade).toBe(40);
    // alchemy: minor (5), magic spec, no bonus
    expect(ch.skills.alchemy).toBe(5);
    expect(ch.majors).toHaveLength(7);
  });

  it('applies favored attributes and birthsign bonuses', () => {
    const ch = createCharacter({ race: 'imperial', cls: 'warrior', sign: 'warrior' });
    expect(ch.attrs.strength).toBe(RACES.imperial.attrs.strength + 5 + 10);
    expect(ch.attrs.endurance).toBe(RACES.imperial.attrs.endurance + 5 + 10);
  });

  it('adds racial and birthsign magicka', () => {
    const plain = createCharacter({ race: 'imperial', cls: 'mage', sign: 'warrior' });
    const altmerAtronach = createCharacter({ race: 'altmer', cls: 'mage', sign: 'atronach' });
    expect(maxMagicka(altmerAtronach) - (altmerAtronach.attrs.intelligence * 2)).toBe(250);
    expect(maxMagicka(plain)).toBe(plain.attrs.intelligence * 2);
  });

  it('every class kit and race references valid data', () => {
    for (const c of Object.values(CLASSES)) {
      expect(c.majors).toHaveLength(7);
      for (const s of c.majors) expect(SKILL_IDS).toContain(s);
      for (const spec of c.kit) expect(ITEMS[spec.split('*')[0]]).toBeDefined();
    }
    for (const r of Object.values(RACES)) for (const s of Object.keys(r.skills)) expect(SKILL_IDS).toContain(s);
    for (const b of Object.values(BIRTHSIGNS)) for (const a of Object.keys(b.attrs || {})) expect(ATTRIBUTES).toContain(a);
  });
});

describe('skill progression and leveling', () => {
  it('raises a skill after enough uses and counts major increases', () => {
    const ch = createCharacter({ race: 'imperial', cls: 'warrior', sign: 'warrior' });
    const start = ch.skills.blade;
    const need = skillXpNeeded(ch, 'blade');
    const events = exerciseSkill(ch, 'blade', need);
    expect(ch.skills.blade).toBe(start + 1);
    expect(events[0]).toMatchObject({ type: 'skill', skill: 'blade', value: start + 1 });
    expect(ch.levelProgress).toBe(1);
    expect(ch.attrIncreases.strength).toBe(1);
  });

  it('every skill counts toward the next level, minor ones too', () => {
    const ch = createCharacter({ race: 'imperial', cls: 'warrior', sign: 'warrior' });
    exerciseSkill(ch, 'alchemy', skillXpNeeded(ch, 'alchemy'));
    expect(ch.levelProgress).toBe(1);
  });

  it('signals readiness after enough skill increases, and levels one chosen attribute', () => {
    const ch = createCharacter({ race: 'imperial', cls: 'warrior', sign: 'warrior' });
    expect(levelNeeded(ch)).toBe(7);
    let ready = false;
    for (let i = 0; i < 200 && !ready; i++) {
      ready = exerciseSkill(ch, i % 2 ? 'blade' : 'alchemy', 100).some((e) => e.type === 'levelReady');
    }
    expect(ready).toBe(true);
    expect(canLevelUp(ch)).toBe(true);
    const str = ch.attrs.strength;
    const hp = baseHealth(ch);
    const gains = applyLevelUp(ch, 'strength');
    expect(ch.level).toBe(2);
    expect(gains.strength).toBe(LEVEL_ATTR_GAIN);
    expect(ch.attrs.strength).toBe(str + LEVEL_ATTR_GAIN);
    expect(baseHealth(ch)).toBeGreaterThan(hp + 9);
    expect(levelNeeded(ch)).toBe(9);
  });

  it('rejects invalid level-up choices', () => {
    const ch = createCharacter({});
    expect(() => applyLevelUp(ch, 'strength')).toThrow();
    ch.levelProgress = 10;
    expect(() => applyLevelUp(ch, 'wisdom')).toThrow();
    expect(() => applyLevelUp(ch, ['strength', 'luck'])).toThrow();
  });

  it('uses Oblivion attribute multipliers', () => {
    expect([0, 1, 4, 5, 7, 8, 9, 10, 15].map(attributeBonus)).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('caps skills at 100', () => {
    const ch = createCharacter({});
    ch.skills.blade = 100;
    expect(exerciseSkill(ch, 'blade', 1000)).toEqual([]);
    expect(ch.skills.blade).toBe(100);
  });
});

describe('combat formulas', () => {
  const ch = createCharacter({ race: 'nord', cls: 'warrior', sign: 'warrior' });
  const sword = ITEMS.iron_longsword;
  it('power and sneak attacks multiply damage', () => {
    const base = weaponDamage(ch, sword);
    expect(weaponDamage(ch, sword, { power: true })).toBeGreaterThan(base * 1.6);
    expect(weaponDamage(ch, sword, { sneak: true })).toBeGreaterThanOrEqual(base * 2.9);
    expect(weaponDamage(ch, ITEMS.iron_bow, { sneak: true })).toBeLessThan(weaponDamage(ch, ITEMS.iron_bow) * 2.2);
  });
  it('low fatigue reduces damage', () => {
    expect(weaponDamage(ch, sword, { fatigueRatio: 0 })).toBeLessThan(weaponDamage(ch, sword));
  });
  it('armor reduction is capped at 85%', () => {
    expect(armorMultiplier(0)).toBe(1);
    expect(armorMultiplier(50)).toBeCloseTo(0.5);
    expect(armorMultiplier(500)).toBeCloseTo(0.15);
  });
  it('shields block better than weapons', () => {
    expect(blockReduction(30, true)).toBeGreaterThan(blockReduction(30, false));
    expect(blockReduction(1000, true)).toBeLessThanOrEqual(0.9);
  });
  it('spell cost falls with skill but never below 1', () => {
    expect(spellCost(20, 100)).toBeLessThan(spellCost(20, 10));
    expect(spellCost(1, 100)).toBe(1);
  });
});

describe('economy & stealth', () => {
  it('buying always costs more than selling', () => {
    for (const merc of [0, 50, 100]) for (const disp of [0, 50, 100]) {
      expect(priceMultiplier(merc, disp, true)).toBeGreaterThan(priceMultiplier(merc, disp, false));
    }
  });
  it('sneaking, distance, darkness and invisibility reduce detection', () => {
    const open = detectChance(30, 40, 5, false, true, 1);
    const sneaking = detectChance(30, 40, 5, true, false, 1);
    const far = detectChance(30, 40, 25, true, false, 1);
    const dark = detectChance(30, 40, 5, true, false, 0);
    expect(sneaking).toBeLessThan(open);
    expect(far).toBeLessThan(sneaking);
    expect(dark).toBeLessThan(sneaking);
    expect(detectChance(30, 40, 1, false, true, 1, true)).toBe(0);
  });
});
