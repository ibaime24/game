import { describe, it, expect } from 'vitest';
import { Inventory, ITEMS, LOOT, rollLoot, parseSpec, FLOWERS } from '../src/data/items.js';
import { SPELLS, SPELL_SHOP, SPELL_PRICES } from '../src/data/spells.js';
import { TEMPLATES, LEVELED, PEOPLE, NPCS, pickLeveled } from '../src/data/actors.js';
import { DIALOGUE, MERCHANTS } from '../src/data/dialogue.js';
import { QUESTS, QuestLog } from '../src/data/quests.js';
import { BIRTHSIGNS, CLASSES, SKILLS } from '../src/data/stats.js';
import { mulberry32 } from '../src/core/noise.js';

describe('Inventory', () => {
  it('adds, removes, counts and weighs', () => {
    const inv = new Inventory();
    inv.add('gold', 50);
    inv.add('iron_longsword');
    inv.add('iron_arrow', 10);
    expect(inv.gold).toBe(50);
    expect(inv.weight()).toBeCloseTo(16 + 1);
    expect(inv.remove('iron_arrow', 25)).toBe(10);
    expect(inv.has('iron_arrow')).toBe(false);
    expect(() => inv.add('not_an_item')).toThrow();
  });
  it('round-trips through JSON and drops unknown ids', () => {
    const inv = new Inventory();
    inv.add('bread', 3);
    const back = Inventory.fromJSON({ ...inv.toJSON(), removed_item: 2 });
    expect(back.count('bread')).toBe(3);
    expect(back.entries()).toHaveLength(1);
  });
});

describe('data integrity', () => {
  it('the Greenheart and the Chipmunk Moot are complete', () => {
    expect(QUESTS.sq_moot.stages[100].done).toBe(true);
    expect(SPELLS.spirit_deer).toMatchObject({ kind: 'summon', creature: 'spirit_deer' });
    expect(TEMPLATES.spirit_deer.ai).toBe('support');
    expect(TEMPLATES.chipmunk.taggable).toBe(true);
    for (const id of ['eranwe', 'velandil', 'mirieth']) expect(NPCS.find((n) => n.id === id)?.cell, id).toBe('greenheart');
    for (const d of ['eranwe', 'velandil', 'mirieth', 'falinor_folk']) expect(DIALOGUE[d], d).toBeTruthy();
    expect(ITEMS.blunt_arrow.type).toBe('arrow');
  });
  it('the legendary swords and armour sets are complete', () => {
    const swords = Object.values(ITEMS).filter((i) => i.legendary);
    expect(swords.map((s) => s.id).sort()).toEqual(['starfang', 'sunfall', 'verdant_thorn', 'voidreaver', 'winters_edge']);
    for (const s of swords) expect(s.look.design, s.id).toBeTruthy();
    for (const set of ['starwarden', 'emberforge', 'frostbloom']) {
      const slots = Object.values(ITEMS).filter((i) => i.set === set).map((i) => i.slot).sort();
      expect(slots, set).toEqual(['chest', 'feet', 'hands', 'head', 'legs']);
    }
  });
  it('the rabbit quest is complete and its pieces exist', () => {
    const st = QUESTS.sq_bunnies.stages;
    expect(st[100].done && st[110].done).toBe(true);
    for (const id of ['snikkit_key', 'snikkit_token', 'mock_rabbit_pie', 'snikkit_stone']) expect(ITEMS[id], id).toBeTruthy();
    expect(NPCS.find((n) => n.id === 'snikkit')).toMatchObject({ faction: 'neutral', extraLoot: ['snikkit_key'] });
    expect(TEMPLATES.goblin_chief).toMatchObject({ faction: 'neutral', dialogue: 'gorbag' });
    expect(TEMPLATES.snow_rabbit.body.kind).toBe('rabbit');
    for (const d of ['snikkit', 'gorbag']) expect(DIALOGUE[d], d).toBeTruthy();
    expect(DIALOGUE.matilde.topics.some((t) => t.id === 'mock_pie')).toBe(true);
    expect(pickLeveled('rabbits', 1, () => 0)).toBe('snow_rabbit');
  });
  it('the dog quest is complete and its pieces exist', () => {
    expect(Object.values(QUESTS.sq_pup.stages).some((st) => st.done)).toBe(true);
    expect(ITEMS.starflower).toBeTruthy();
    expect(NPCS.find((n) => n.id === 'hob')).toMatchObject({ cell: 'world', dialogue: 'hob' });
    expect(DIALOGUE.hob.topics.map((t) => t.id)).toEqual(expect.arrayContaining(['puppies', 'flowers']));
    for (const t of ['dog', 'mother_dog', 'puppy']) expect(TEMPLATES[t].pettable, t).toBe(true);
    expect(TEMPLATES.dog.faction).toBe('ally');
  });
  it('the White Hare questline is complete and its pieces exist', () => {
    for (let i = 1; i <= 5; i++) expect(Object.values(QUESTS['sq_hare' + i].stages).some((st) => st.done), 'sq_hare' + i).toBe(true);
    for (const id of ['brynja_hymn', 'hare_fur', 'trap_tag', 'varn_ledger', 'fir_heartwood', 'lucky_lure', 'glimmerfin', 'snowberry', 'kynareth_loaf', 'wind_charm', 'cassius_journal', 'frostward_ring', 'first_snow_mantle']) expect(ITEMS[id], id).toBeTruthy();
    for (const id of ['sigrun', 'erlend', 'gunnar', 'matilde', 'brynja', 'varn', 'cassius', 'cassius_home']) expect(NPCS.find((n) => n.id === id), id).toBeTruthy();
    for (const d of ['sigrun', 'brynja', 'gunnar', 'erlend', 'matilde', 'varn', 'cassius']) expect(DIALOGUE[d], d).toBeTruthy();
    expect(DIALOGUE.brynja.topics.map((t) => t.id)).toEqual(expect.arrayContaining(['missing_hare', 'shrine_find', 'wind', 'gifts']));
    expect(DIALOGUE.cassius.topics.map((t) => t.id)).toEqual(expect.arrayContaining(['closed', 'hymn', 'kill', 'fight']));
    expect(NPCS.find((n) => n.id === 'cassius').extraLoot).toContain('frostward_ring');
    expect(TEMPLATES.frost_atronach && TEMPLATES.ice_wraith).toBeTruthy();
  });
  it('the Corwyn questline is complete and its pieces exist', () => {
    for (const q of ['sq_lantern', 'sq_ashes', 'sq_gloam', 'sq_home']) {
      expect(Object.values(QUESTS[q].stages).some((st) => st.done), q).toBe(true);
    }
    for (const id of ['delivery_crate', 'tams_slate', 'maela_household_book', 'ilvaine_journal', 'maela_lantern']) expect(ITEMS[id], id).toBeTruthy();
    expect(ITEMS.maela_lantern).toMatchObject({ type: 'light', slot: 'shield', lightStyle: 'lantern' });
    expect(ITEMS.maela_lantern.rank).toBeGreaterThan(ITEMS.torch.rank);
    for (const id of ['bram', 'maela', 'inn_patron', 'seed_neeus']) expect(NPCS.find((n) => n.id === id), id).toBeTruthy();
    for (const d of ['seed_neeus', 'bram', 'maela', 'rimalus']) expect(DIALOGUE[d], d).toBeTruthy();
    expect(TEMPLATES.ilvaine.extraLoot).toContain('maela_lantern');
    expect(pickLeveled('ashen', 1, () => 0)).toBe('ashen_dead');
  });
  it('the torch is an off-hand light that no class kit replaces', () => {
    expect(ITEMS.torch).toMatchObject({ type: 'light', slot: 'shield' });
    for (const c of Object.values(CLASSES)) expect(c.kit.map((s) => parseSpec(s)[0])).not.toContain('torch');
  });
  it('loot tables reference real items', () => {
    for (const rows of Object.values(LOOT)) for (const [id] of rows) expect(ITEMS[id], id).toBeDefined();
  });
  it('rollLoot is deterministic for a seeded rng', () => {
    const a = rollLoot('chest_common', mulberry32(5));
    const b = rollLoot('chest_common', mulberry32(5));
    expect(a).toEqual(b);
  });
  it('templates reference real items, spells and loot tables', () => {
    for (const [id, t] of Object.entries({ ...TEMPLATES, ...PEOPLE })) {
      if (t.weapon) expect(ITEMS[t.weapon], id).toBeDefined();
      if (t.shield) expect(ITEMS[t.shield], id).toBeDefined();
      if (Array.isArray(t.armor)) for (const a of t.armor) expect(ITEMS[a], id).toBeDefined();
      for (const s of t.spells || []) expect(SPELLS[s], id).toBeDefined();
      if (t.loot) expect(LOOT[t.loot], id).toBeDefined();
    }
  });
  it('leveled lists only name existing templates and always yield something', () => {
    for (const [list, rows] of Object.entries(LEVELED)) {
      for (const [id] of rows) expect(TEMPLATES[id], id).toBeDefined();
      expect(TEMPLATES[pickLeveled(list, 1, () => 0.5)]).toBeDefined();
    }
    // higher level unlocks tougher monsters
    const lvl1 = new Set(Array.from({ length: 200 }, (_, i) => pickLeveled('forest', 1, mulberry32(i))));
    expect(lvl1.has('timber_wolf')).toBe(false);
  });
  it('NPCs reference valid outfits and dialogue', () => {
    for (const n of NPCS) {
      expect(PEOPLE[n.tpl], n.id).toBeDefined();
      if (n.dialogue) expect(DIALOGUE[n.dialogue], n.id).toBeDefined();
      if (n.merchant) expect(MERCHANTS[n.merchant], n.id).toBeDefined();
    }
  });
  it('merchant stock and spells are valid', () => {
    for (const m of Object.values(MERCHANTS)) for (const spec of m.stock) expect(ITEMS[parseSpec(spec)[0]], spec).toBeDefined();
    for (const id of [...SPELL_SHOP, ...Object.keys(SPELL_PRICES)]) expect(SPELLS[id], id).toBeDefined();
    for (const id of FLOWERS) expect(ITEMS[id]?.type, id).toBe('ingredient');
    for (const sp of Object.values(SPELLS)) expect(SKILLS[sp.school], sp.id).toBeDefined();
    for (const c of Object.values(CLASSES)) for (const s of c.spells || []) expect(SPELLS[s]).toBeDefined();
    for (const b of Object.values(BIRTHSIGNS)) { if (b.power) expect(SPELLS[b.power]).toBeDefined(); for (const s of b.spells || []) expect(SPELLS[s]).toBeDefined(); }
  });
});

describe('QuestLog', () => {
  it('advances forward only and tracks the active quest', () => {
    const q = new QuestLog();
    const seen = [];
    q.listeners.push((id, st) => seen.push(`${id}:${st}`));
    expect(q.set('mq_amulet', 10)).toBe(true);
    expect(q.current().id).toBe('mq_amulet');
    expect(q.set('mq_amulet', 10)).toBe(false);
    q.set('mq_amulet', 100);
    expect(q.done('mq_amulet')).toBe(true);
    expect(q.current()).toBeNull();
    q.set('ms_bounty', 10);
    expect(q.current().id).toBe('ms_bounty');
    expect(() => q.set('ms_bounty', 15)).toThrow();
    expect(seen).toEqual(['mq_amulet:10', 'mq_amulet:100', 'ms_bounty:10']);
    const copy = new QuestLog();
    copy.load(JSON.parse(JSON.stringify(q)));
    expect(copy.stage('ms_bounty')).toBe(10);
    expect(copy.log).toHaveLength(3);
  });
  it('every quest has an ending stage', () => {
    for (const [id, def] of Object.entries(QUESTS)) expect(Object.values(def.stages).some((s) => s.done), id).toBe(true);
  });
});
