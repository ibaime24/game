// Item database. Weapons, armour, potions, misc, quest items.

const W = (id, name, skill, damage, speed, reach, weight, value, look) => ({
  id, name, type: 'weapon', skill, damage, speed, reach, weight, value, look,
});
const AR = (id, name, slot, armorType, rating, weight, value, color) => ({
  id, name, type: 'armor', slot, armorType, rating, weight, value, color,
});

export const ITEMS = {};
const add = (it) => { ITEMS[it.id] = it; return it; };

// ---- Weapons ---- look: {kind, blade color, hilt color, length}
add(W('iron_dagger', 'Iron Dagger', 'blade', 5, 1.4, 2.2, 3, 12, { kind: 'dagger', color: 0x9a9a9a, hilt: 0x4a3020, len: 0.45 }));
add(W('iron_shortsword', 'Iron Shortsword', 'blade', 8, 1.15, 2.5, 10, 30, { kind: 'sword', color: 0x9a9a9a, hilt: 0x4a3020, len: 0.75 }));
add(W('iron_longsword', 'Iron Longsword', 'blade', 10, 1.0, 2.7, 16, 40, { kind: 'sword', color: 0x9a9a9a, hilt: 0x4a3020, len: 0.95 }));
add(W('steel_longsword', 'Steel Longsword', 'blade', 12, 1.0, 2.7, 18, 90, { kind: 'sword', color: 0xc8ccd2, hilt: 0x2a2a30, len: 0.98 }));
add(W('elven_longsword', 'Elven Longsword', 'blade', 15, 1.05, 2.75, 14, 400, { kind: 'sword', color: 0xe0c060, hilt: 0x806020, len: 1.0 }));
add(W('glass_longsword', 'Glass Longsword', 'blade', 18, 1.05, 2.75, 15, 1100, { kind: 'sword', color: 0x70e090, hilt: 0x406040, len: 1.0, glow: 0x40ff80 }));
add(W('akaviri_katana', 'Akaviri Katana', 'blade', 17, 1.15, 2.8, 14, 900, { kind: 'katana', color: 0xdadada, hilt: 0x601010, len: 1.0 }));
add(W('daedric_longsword', 'Daedric Longsword', 'blade', 20, 1.0, 2.8, 22, 2500, { kind: 'sword', color: 0x301818, hilt: 0x601010, len: 1.05, glow: 0xff3010 }));
add(W('jemane_blade', 'Jemane Heirloom Blade', 'blade', 13, 1.1, 2.7, 12, 250, { kind: 'sword', color: 0xd8d0b0, hilt: 0x2040a0, len: 0.9, glow: 0x6080ff }));
add(W('iron_mace', 'Iron Mace', 'blunt', 11, 0.9, 2.5, 18, 35, { kind: 'mace', color: 0x8a8a8a, hilt: 0x4a3020, len: 0.8 }));
add(W('steel_mace', 'Steel Mace', 'blunt', 13, 0.9, 2.5, 20, 80, { kind: 'mace', color: 0xc0c4c8, hilt: 0x2a2a30, len: 0.82 }));
add(W('iron_waraxe', 'Iron War Axe', 'blunt', 12, 0.95, 2.5, 16, 38, { kind: 'axe', color: 0x8a8a8a, hilt: 0x4a3020, len: 0.8 }));
add(W('iron_bow', 'Iron Bow', 'marksman', 8, 1, 0, 12, 40, { kind: 'bow', color: 0x5a4a3a, len: 1.3 }));
add(W('elven_bow', 'Elven Bow', 'marksman', 13, 1, 0, 10, 380, { kind: 'bow', color: 0xc0a040, len: 1.35 }));
add(W('daedric_claws', 'Claws', 'handtohand', 6, 1.2, 2.2, 0, 0, null));
// conjured elemental blades: their strikes carry fire or lightning, and their looks are animated (see fx/bladefx.js)
add({ ...W('flame_blade', 'Bound Flame Blade', 'blade', 15, 1.1, 2.75, 0, 0, { kind: 'sword', color: 0x1a0c08, hilt: 0x2a0a04, len: 1.02, glow: 0x5a1604, fx: 'fire' }), quest: true, element: 'fire', elementDamage: 10, desc: 'A sword of living fire, conjured into your hand. Its strikes burn, and what it burns keeps burning.' });
add({ ...W('storm_blade', 'Bound Storm Blade', 'blade', 14, 1.2, 2.75, 0, 0, { kind: 'sword', color: 0x8aa4d8, hilt: 0x2a3a7a, len: 1.02, glow: 0x4a78ff, fx: 'shock' }), quest: true, element: 'shock', elementDamage: 9, desc: 'A sword of crackling lightning, conjured into your hand. Every strike leaps to a second foe.' });
add({ ...W('bound_sword', 'Bound Sword', 'blade', 16, 1.1, 2.7, 0, 0, { kind: 'sword', color: 0x8ad8ff, hilt: 0x3a6aa0, len: 1.0, glow: 0x60c0ff }), quest: true, desc: 'A blade of conjured light. It will not last.' });

add({ id: 'iron_arrow', name: 'Iron Arrow', type: 'arrow', damage: 6, weight: 0.1, value: 1 });
add({ id: 'steel_arrow', name: 'Steel Arrow', type: 'arrow', damage: 9, weight: 0.1, value: 2 });

// ---- Armour ----
add(AR('fur_cuirass', 'Fur Cuirass', 'chest', 'light', 5, 8, 20, 0x7a5a3a));
add(AR('fur_helmet', 'Fur Helmet', 'head', 'light', 2, 2, 8, 0x7a5a3a));
add(AR('fur_boots', 'Fur Boots', 'feet', 'light', 2, 3, 8, 0x6a4a2a));
add(AR('fur_greaves', 'Fur Greaves', 'legs', 'light', 3, 5, 12, 0x6a4a2a));
add(AR('fur_shield', 'Fur Shield', 'shield', 'light', 5, 6, 15, 0x6a4a2a));
add(AR('leather_cuirass', 'Leather Cuirass', 'chest', 'light', 7, 12, 40, 0x5a3a20));
add(AR('leather_helmet', 'Leather Helmet', 'head', 'light', 3, 3, 15, 0x5a3a20));
add(AR('leather_boots', 'Leather Boots', 'feet', 'light', 3, 4, 15, 0x4a2a14));
add(AR('leather_greaves', 'Leather Greaves', 'legs', 'light', 4, 6, 20, 0x4a2a14));
add(AR('leather_gauntlets', 'Leather Gauntlets', 'hands', 'light', 2, 2, 10, 0x4a2a14));
add(AR('elven_cuirass', 'Elven Cuirass', 'chest', 'light', 12, 15, 400, 0xc8a840));
add(AR('glass_cuirass', 'Glass Cuirass', 'chest', 'light', 16, 18, 1200, 0x60c080));
add(AR('iron_cuirass', 'Iron Cuirass', 'chest', 'heavy', 10, 30, 60, 0x7a7a80));
add(AR('iron_helmet', 'Iron Helmet', 'head', 'heavy', 4, 6, 20, 0x7a7a80));
add(AR('iron_greaves', 'Iron Greaves', 'legs', 'heavy', 6, 18, 40, 0x6a6a70));
add(AR('iron_boots', 'Iron Boots', 'feet', 'heavy', 4, 10, 20, 0x6a6a70));
add(AR('iron_gauntlets', 'Iron Gauntlets', 'hands', 'heavy', 3, 5, 15, 0x6a6a70));
add(AR('iron_shield', 'Iron Shield', 'shield', 'heavy', 8, 14, 40, 0x7a7a80));
add(AR('steel_cuirass', 'Steel Cuirass', 'chest', 'heavy', 13, 32, 150, 0xb8bcc4));
add(AR('steel_helmet', 'Steel Helmet', 'head', 'heavy', 5, 7, 50, 0xb8bcc4));
add(AR('steel_shield', 'Steel Shield', 'shield', 'heavy', 10, 16, 90, 0xb8bcc4));
add(AR('daedric_cuirass', 'Daedric Cuirass', 'chest', 'heavy', 20, 45, 3000, 0x2a1414));
add(AR('chorrol_cuirass', 'Chorrol Guard Cuirass', 'chest', 'heavy', 12, 30, 0, 0x2a6030));
add({ ...AR('mage_robe', 'Apprentice Robe', 'chest', 'cloth', 0, 2, 25, 0x3a3a7a), fortifyMagicka: 15 });
add({ ...AR('prisoner_rags', 'Prisoner Rags', 'chest', 'cloth', 0, 1, 1, 0x8a7a60) });
add({ ...AR('amulet_of_kings', 'Amulet of Kings', 'amulet', 'cloth', 0, 0.5, 0, 0xc02020), quest: true, desc: 'The sacred amulet of the Septim emperors. It glows with an inner red fire.' });
add({ ...AR('ring_of_vitality', 'Ring of Vitality', 'ring', 'cloth', 0, 0.1, 300, 0x40c040), fortifyHealth: 25 });
add({ ...AR('ring_of_the_wizard', 'Ring of the Wizard', 'ring', 'cloth', 0, 0.1, 400, 0x4060ff), fortifyMagicka: 40 });

// ---- Legendary swords (each rests on its own pedestal somewhere in Cyrodiil; see world/legendary.js)
const LEG = (id, name, damage, speed, reach, weight, value, design, fx, extra, desc) => add({ ...W(id, name, 'blade', damage, speed, reach, weight, value, { kind: 'sword', design, fx, len: extra.len ?? 1.0 }), legendary: true, desc, ...extra });
LEG('sunfall', 'Sunfall', 19, 1.0, 2.8, 16, 3500, 'sunfall', 'sun', { element: 'fire', elementDamage: 6, bane: 'undead', len: 1.02 },
  'A broad golden sword with a white-hot heart, forged, they say, from the last light of the Dragonfires. It burns, and it burns the restless dead twice over. Found on the hill behind the Wayshrine of Akatosh.');
LEG('starfang', 'Starfang', 16, 1.3, 2.75, 9, 3200, 'starfang', 'star', { element: 'shock', elementDamage: 5, starfall: true, len: 1.0 },
  'A slender midnight-blue sabre whose edge glows like the rim of the moon. Five stars are caught in its curve; now and then one of them falls on whatever it strikes. Found in the starflower meadow east of the lake.');
LEG('winters_edge', "Winter's Edge", 18, 1.0, 2.75, 14, 3400, 'winters_edge', 'frost', { element: 'frost', elementDamage: 7, len: 0.98 },
  'A jagged blade of ice that never melts, clear enough to see the snow through. Its cold bites deep and slows whatever it cuts. Found on a wind-scoured ridge high in the Jerall foothills.');
LEG('verdant_thorn', 'Verdant Thorn', 15, 1.15, 2.7, 11, 3000, 'verdant_thorn', 'thorn', { element: 'poison', elementDamage: 5, drain: 4, len: 0.95 },
  'A green-gold blade wound with a living vine that still flowers. Its thorns poison, and every wound it opens mends a little of yours. Found in the deepest part of the Great Forest.');
LEG('voidreaver', 'Voidreaver', 24, 0.85, 2.85, 24, 4000, 'voidreaver', 'void', { element: 'fire', elementDamage: 5, drain: 5, drainMagicka: 5, len: 1.05 },
  'A black Daedric cleaver, serrated and hooked, split by veins of red light that pulse like a heartbeat. It drinks the life and magicka of everything it cuts. Found in the ashes of Kvatch.');

// ---- Legendary armour sets (each displayed on a stand in a dungeon; see world/legendary.js)
const SET = (set, armorType, color, pieces, bonus, desc) => {
  for (const [slot, id, name, rating, weight] of pieces) add({ ...AR(id, name, slot, armorType, rating, weight, 400 + rating * 60, color), set, ...bonus, desc });
};
SET('starwarden', 'heavy', 0x1e2c66, [
  ['chest', 'starwarden_cuirass', 'Starwarden Cuirass', 21, 30], ['head', 'starwarden_helm', 'Starwarden Helm', 7, 7],
  ['hands', 'starwarden_gauntlets', 'Starwarden Gauntlets', 5, 5], ['legs', 'starwarden_greaves', 'Starwarden Greaves', 9, 16], ['feet', 'starwarden_boots', 'Starwarden Boots', 6, 9],
], { fortifyMagicka: 8 }, 'Midnight-blue enamel over gold-trimmed steel, etched with glowing runes, crested with a crescent moon and cloaked in a cape cut from the night sky. The armour of the Ayleid Starwardens who kept watch over Nenalatha.');
SET('emberforge', 'heavy', 0x2a2420, [
  ['chest', 'emberforge_cuirass', 'Emberforge Cuirass', 24, 34], ['head', 'emberforge_helm', 'Emberforge Helm', 8, 8],
  ['hands', 'emberforge_gauntlets', 'Emberforge Gauntlets', 6, 6], ['legs', 'emberforge_greaves', 'Emberforge Greaves', 10, 18], ['feet', 'emberforge_boots', 'Emberforge Boots', 7, 10],
], { fortifyHealth: 10 }, 'Blackened steel split by seams of molten light, with a horned helm whose eyes burn like coals. Forged, the Lamplighter\'s daybook claims, in the fire of 3E 349 itself.');
SET('frostbloom', 'light', 0xdfe8f2, [
  ['chest', 'frostbloom_cuirass', 'Frostbloom Cuirass', 15, 12], ['head', 'frostbloom_circlet', 'Frostbloom Circlet', 5, 2],
  ['hands', 'frostbloom_gauntlets', 'Frostbloom Bracers', 4, 3], ['legs', 'frostbloom_greaves', 'Frostbloom Greaves', 6, 6], ['feet', 'frostbloom_boots', 'Frostbloom Boots', 4, 4],
], { fortifyHealth: 6, fortifyMagicka: 6 }, 'Pale silver scale under a white fur mantle, with ice crystals that grow from the shoulders and a crown of ice. Kynareth\'s own frost runs through it in glowing runes.');

// ---- The Chipmunk Moot
add({ ...W('practice_bow', 'Greenheart Practice Bow', 'marksman', 5, 1, 0, 6, 25, { kind: 'bow', color: 0x7a5a32, len: 1.2 }), desc: 'A light hunting bow of springy yew, bound with green thread. The Bosmer of Falinor learn on bows like this before they can walk.' });
add({ id: 'blunt_arrow', name: 'Blunted Practice Arrow', type: 'arrow', damage: 1, weight: 0.05, value: 0, desc: 'An arrow with a knob of soft leather where the point should be. It stings. It does not kill. Ask any chipmunk.' });

// ---- Light ---- carried in the off hand, in place of a shield
add({ id: 'torch', name: 'Torch', type: 'light', slot: 'shield', rank: 1, weight: 1, value: 2, desc: 'A stout stick wrapped in pitch-soaked rags. It lights the dark around you, and makes you easier to see. Press L to light or douse it.' });

// ---- Potions ----
const P = (id, name, effects, value, color) => add({ id, name, type: 'potion', effects, weight: 0.5, value, color });
P('potion_health_light', 'Light Potion of Healing', [{ type: 'health', amount: 40 }], 25, 0xd02020);
P('potion_health', 'Potion of Healing', [{ type: 'health', amount: 80 }], 60, 0xff3030);
P('potion_magicka', 'Potion of Magicka', [{ type: 'magicka', amount: 60 }], 50, 0x3050ff);
P('potion_fatigue', 'Potion of Vigor', [{ type: 'fatigue', amount: 100 }], 20, 0x30c030);
P('potion_cure', 'Elixir of Mara', [{ type: 'health', amount: 200 }, { type: 'fatigue', amount: 200 }], 200, 0xffd060);

// ---- Ingredients (edible, train Alchemy) ----
const I = (id, name, effects, value) => add({ id, name, type: 'ingredient', effects, weight: 0.1, value });
I('apple', 'Apple', [{ type: 'fatigue', amount: 10 }], 1);
I('bread', 'Bread Loaf', [{ type: 'fatigue', amount: 12 }], 2);
I('cheese', 'Cheese Wedge', [{ type: 'health', amount: 4 }], 3);
I('wolf_pelt', 'Wolf Pelt', [], 6);
I('mudcrab_chitin', 'Mudcrab Chitin', [{ type: 'health', amount: 2 }], 3);
I('bonemeal', 'Bonemeal', [{ type: 'fatigue', amount: 4 }], 2);
I('daedra_heart', 'Daedra Heart', [{ type: 'magicka', amount: 25 }], 80);
I('red_mushroom', 'Fly Amanita', [{ type: 'health', amount: 6 }], 2);
I('blue_flower', 'Columbine Root', [{ type: 'magicka', amount: 8 }], 2);
I('ectoplasm', 'Ectoplasm', [{ type: 'magicka', amount: 6 }], 10);
I('frost_salts', 'Frost Salts', [{ type: 'magicka', amount: 15 }], 45);
// food & drink (props: scanned models used when the item lies in the world)
const F = (id, name, effects, value, prop, extra = {}) => add({ id, name, type: 'ingredient', effects, weight: 0.2, value, prop, ...extra });
F('onion', 'Onion', [{ type: 'fatigue', amount: 6 }], 1, 'yellow_onion');
F('pear', 'Pear', [{ type: 'fatigue', amount: 8 }], 2, 'food_pears_asian_01');
F('potato', 'Potato', [{ type: 'fatigue', amount: 8 }], 1, 'sweet_potato');
F('lemon', 'Lemon', [{ type: 'magicka', amount: 3 }], 3, 'lemon');
F('sweetroll', 'Sweetroll', [{ type: 'fatigue', amount: 20 }], 4);
F('venison', 'Venison', [{ type: 'health', amount: 8 }, { type: 'fatigue', amount: 10 }], 5);
F('wine_tamika', "Tamika's West Weald Wine", [{ type: 'fatigue', amount: 25 }], 22, 'wine_bottles_01', { propVariant: 0, weight: 1 });
F('wine_surilie', 'Surilie Brothers Wine', [{ type: 'fatigue', amount: 30 }], 30, 'wine_bottles_01', { propVariant: 2, weight: 1 });
F('mead', 'Mead', [{ type: 'fatigue', amount: 15 }], 8, 'wine_bottles_01', { propVariant: 1, weight: 1 });
F('mulled_wine', 'Mulled Wine', [{ type: 'fatigue', amount: 35 }, { type: 'health', amount: 8 }], 14, 'wine_bottles_01', { propVariant: 2, weight: 1, desc: 'Red wine warmed with cloves, honey and orange peel, the way they make it at the Snow Hare. It warms you right down to your boots.' });
F('cyrodilic_brandy', 'Cyrodilic Brandy', [{ type: 'fatigue', amount: 40 }, { type: 'health', amount: -5 }], 40, 'wine_bottles_01', { propVariant: 3, weight: 1 });
// wild plants (harvested from the scanned plants in the overworld)
I('somnalius', 'Somnalius Frond', [{ type: 'magicka', amount: 5 }], 3);
I('st_jahns_wort', "St. Jahn's Wort", [{ type: 'fatigue', amount: 6 }], 2);
I('ladys_mantle', "Lady's Mantle Leaves", [{ type: 'health', amount: 6 }], 2);
I('ladys_smock', "Lady's Smock Leaves", [{ type: 'magicka', amount: 6 }], 2);
I('nirnroot', 'Nirnroot', [{ type: 'health', amount: 12 }, { type: 'magicka', amount: 12 }], 10);

// flowers trade at a flat price, whatever your Mercantile
export const FLOWER_PRICE = 20;
export const FLOWERS = ['starflower', 'st_jahns_wort', 'ladys_mantle', 'ladys_smock', 'blue_flower'];

// ---- Misc ----
add({ id: 'gold', name: 'Gold', type: 'gold', weight: 0, value: 1 });
add({ id: 'lockpick', name: 'Lockpick', type: 'misc', weight: 0, value: 4 });
add({ id: 'vilverin_key', name: 'Vilverin Gate Key', type: 'key', weight: 0, value: 0, quest: true, desc: 'A heavy iron key, green with age.' });
add({ id: 'sigil_stone', name: 'Sigil Stone', type: 'misc', weight: 1, value: 1000, quest: true, desc: 'A Daedric stone of terrible power, torn from the heart of a Sigil Keep.' });
add({ id: 'silver_cup', name: 'Silver Cup', type: 'misc', weight: 1, value: 25 });
add({ id: 'silver_plate', name: 'Silver Plate', type: 'misc', weight: 1, value: 30 });
add({ id: 'pearl', name: 'Pearl', type: 'misc', weight: 0.1, value: 40 });
add({ id: 'welkynd_stone', name: 'Welkynd Stone', type: 'misc', weight: 1, value: 150, desc: 'A glowing Ayleid crystal. Can restore magicka (use).', effects: [{ type: 'magicka', amount: 200 }], usable: true });
add({ id: 'varla_stone', name: 'Varla Stone', type: 'misc', weight: 1, value: 400 });
add({ id: 'book_ayleids', name: 'Ruins of Kemel-Ze', type: 'book', weight: 1, value: 20, text: 'The Ayleids, or Heartland High Elves, ruled Cyrodiil long before the coming of men. Their pale stone ruins still dot the land, lit by the eternal blue light of welkynd stones. Beware: the dead do not rest easy within.' });
add({ id: 'book_mudcrab', name: 'On Mudcrabs', type: 'book', weight: 1, value: 5, text: 'Mudcrabs. Horrible creatures. I hate those things. That is the whole of my scholarly treatise.' });
add({ id: 'book_gates', name: 'Mysterious Akavir', type: 'book', weight: 1, value: 15, text: 'When the Dragonfires of the Imperial City go dark, the barriers between Tamriel and the realms of Oblivion grow thin. Only one of the blood of the Dragon may relight them.' });
add({ id: 'bounty_letter', name: 'Bounty Notice: Black Brugo', type: 'book', weight: 0, value: 0, quest: true, text: 'WANTED: the bandit chieftain Black Brugo, who preys upon travellers on the Black Road. 300 septims for proof of his death. Bring it to the Captain of the Chorrol Guard.' });
add({ id: 'brugo_head', name: "Brugo's Signet Ring", type: 'misc', weight: 0, value: 0, quest: true });
// ---- Main quest, act two
add(W('dawn_blade', 'Mythic Dawn Blade', 'blade', 13, 1.05, 2.7, 14, 180, { kind: 'sword', color: 0x6a1a14, hilt: 0x2a0a08, len: 0.95, glow: 0xff3010 }));
add({ ...AR('mythic_dawn_robe', 'Mythic Dawn Robe', 'chest', 'cloth', 0, 2, 40, 0x8a1414), fortifyMagicka: 10, desc: 'A crimson hooded robe of the Mythic Dawn. Wearing it, you might pass among the faithful — if no one looks too closely.' });
add(AR('blades_cuirass', 'Blades Cuirass', 'chest', 'heavy', 17, 28, 900, 0xb08a40));
add({ id: 'dawn_orders', name: 'Mythic Dawn Orders', type: 'book', weight: 0, value: 0, quest: true, text: 'Written in a cramped red hand on fine paper, and sealed with a sun rising out of a mouth of teeth.\n\n"The Master has the chain. The old monk at Weynon is to be silenced, and the bastard priest with him if he is found there.\n\nWhen it is done, do not return to the Shrine by the Gold Coast road. Go to Chorrol. Our brother waits beneath the Great Oak when the night is deepest, and he will see you safely home. If you are taken, you know nothing. If you are killed, you are already in Paradise.\n\nDawn\'s beauty."' });
add({ id: 'commentaries_1', name: 'Commentaries on the Mysterium Xarxes, Book One', type: 'book', weight: 1, value: 50, quest: true, text: '"Read me as the Dawn reads the world: by its first light."\n\nFirst, the Dawn. Know that the world you were given is a prison wrought by false gods, who carved it from the flesh of the Lord of Change and named the theft \'creation\'.\n\nOnly the patient may walk the Path. The scales of the Dragon are counted in hours, and every hour that passes is one less between the Septim and the dark.\n\nRecall that the Lord of Destruction is no destroyer as the ignorant mean it. He breaks the egg so that the bird may fly. He is the chisel that frees the statue from the stone.\n\nThis book is a door, and a door is also a wall. Most who read it will see only the wall. You, initiate, are not most.\n\nStrike not at the guard but at the chain he guards. When the Amulet no longer rests upon a Septim\'s breast, the old covenant fails, and the Gates may open.\n\nUnderstand that Paradise is not a reward. It is a return. Gaiar Alata, the Garden of Dagon, waits for those who wake.\n\nTarry not at the threshold. The Dawn comes once to each soul, and those who sleep through it sleep forever.\n\nCount yourself among the chosen when you descend to the shrine, where the Emperor\'s soldiers once watched the Gold Coast road and kept nothing.\n\nHear the words beneath the words. The Dawn always writes in first light.\n\n— M.C.' });
add({ id: 'mysterium_xarxes', name: 'Mysterium Xarxes', type: 'book', weight: 3, value: 0, quest: true, color: 0x3a0808, desc: 'The book of Mehrunes Dagon. It is warm, and it is heavier than it should be.', text: 'The binding is a skin you do not want to identify. The pages are not written so much as scarred.\n\nYou read one line — something about a garden, and a door that is also a mouth — and when you look up, the light has changed, as if an hour has passed.\n\nYou close the book. Martin will know what to do with it. You hope.' });

// ---- The Libram of Lesser Wonders
const PAGE = (id, name, text) => add({ id, name, type: 'book', weight: 0, value: 0, quest: true, text, color: 0xf6eedc });
PAGE('libram_page_oak', 'Libram Page: "Of Pulling and Pushing"', 'A page of thick, cream-coloured vellum, covered edge to edge in tiny looping script and drawings of hands. Some of the drawings move when you are not looking directly at them. A leaf is still stuck to one corner.');
PAGE('libram_page_hen', 'Libram Page: "Of Small Lights"', 'A slightly nibbled page. The ink glows faintly lilac in the dark, and there is a beak-shaped notch out of the margin. The surviving text describes, in great detail, how to make a candle flame do a little dance.');
PAGE('libram_page_wisp', 'Libram Page: "Of Wind and Weather"', 'This page is cold to the touch and smells of rain. It describes the Breeze Charm in loving detail, followed by the note "DO NOT CAST NEAR TEA" underlined three times, in a different and more recent ink.');
add({ id: 'libram', name: 'The Libram of Lesser Wonders', type: 'book', weight: 2, value: 0, quest: true, text: 'Aldous Quillwhistle\'s great work: a fat, shabby, overstuffed spellbook with a star on the cover that winks. It is full of spells nobody at the Arcane University thought worth teaching: spells for pulling, for leaping, for lighting, for fireworks, for seeing in the dark.\n\nOn the flyleaf: "Magic should be useful. Magic should also, occasionally, be fun. — A.Q."' });

// ---- The Ballad of the Hero
add({ id: 'lady_plucksworth', name: 'Lady Plucksworth (a Lute)', type: 'misc', weight: 3, value: 0, quest: true, desc: 'A battered lute, slightly damp, with one string missing and a pinch-shaped dent in the body. Someone has painted a small, smug face on the soundboard.' });
add({ id: 'cheese_wheel', name: 'Wheel of Cheese', type: 'ingredient', effects: [{ type: 'health', amount: 15 }, { type: 'fatigue', amount: 10 }], weight: 2, value: 8, color: 0xf0c850, desc: 'A whole wheel of very good cheese. It is slightly warm, as if someone was sitting on it.' });
add({ id: 'madgod_lute', name: 'Lute of the Mad God', type: 'misc', weight: 2, value: 1500, usable: true, madlute: true, desc: 'A lute of purple wood that tunes itself. Play it (use) and something will happen. Nobody, including the lute, knows what.' });
add({ id: 'tillmon_songbook', name: "Tillmon Larkspur's Songbook", type: 'book', weight: 1, value: 5, text: 'THE BALLAD OF THE HERO OF KVATCH\nby Tillmon Larkspur, Bard of the Third Verse (the first two are lost)\n\nOh, there came from the sewers a hero so bold,\nwho was damp, and confused, and a little bit cold.\nThey were handed an amulet, told not to lose it,\nand walked into Cyrodiil, wondering whose it...\n\n(Chorus)\nSing hey for the hero! Sing ho for the sword!\nSing anything rhyming with "Kvatch", my lord!\n(Nothing rhymes with "Kvatch".)\n\nThey went through a gate to the realm of Oblivion,\nwhich rhymes, as we know, with a small trivial bun,\nand also grim Vivian, and one sad civilian,\nand nothing at all, when you think of it, ever, oh dear.\n\nThe margin is full of crossed-out attempts: "Oblivion / bob-livy-on", "Oblivion / I\'ll be in \'em", and, circled three times, "ASK UNCLE".' });

// ---- The Unfinished Map
add({ id: 'unfinished_map', name: "Corvin's Unfinished Map", type: 'book', weight: 0, value: 0, quest: true, text: 'A surveyor\'s map of the Heartland, drawn in a quick, confident hand and never finished. Coastlines are inked; the interior is pencil. Three marks stand out, circled twice:\n\n — a ring of nine stones in the hills west of Chorrol;\n — a bell, drawn sinking into the south-western shallows of Lake Rumare;\n — a tree with an open eye, deep in the woods south-west of the old Sewers exit.\n\nIn the margin, in a smaller, neater hand: "Read it from the beginning, Ysa. You always skip to the end." And beneath, in the neat hand again, much later and much shakier: "I never did."' });
add({ id: 'corvin_waymark', name: "Corvin's Waymark", type: 'book', weight: 0, value: 0, quest: true, text: 'A square of oiled leather, weighted on the altar with a flat stone. The ink has held for forty years.\n\n"Ysa — if you are reading this, you came after all, and I am an idiot for doubting it.\n\nThe door is real. It hears only the bell\'s true note, and only in the hour that belongs to no day. I left the bellwright\'s fork on the altar for you. Bring it when you come.\n\nThe glyphs on the rim are a lock, not a decoration. Moon, stars, sun — the elves counted their night from moonrise. Don\'t let them tell you otherwise.\n\n— C."' });
add({ id: 'tuning_fork', name: "Bellwright's Tuning Fork", type: 'misc', weight: 0.5, value: 0, quest: true, desc: 'A tuning fork of pale Ayleid metal, cold to the touch. Struck, it rings a note that seems to go on after you stop hearing it.' });
add({ id: 'ysolde_page', name: 'Torn Journal Page', type: 'book', weight: 0, value: 0, quest: true, text: 'Water has eaten the edges, but the middle is legible. The hand is small and neat — the same hand as the margin notes on Corvin\'s map.\n\n"...took the fork from the altar while the note was still ringing. The door folded shut like a page. I could hear him on the other side for a long time. Then I couldn\'t.\n\nI am going to say he was lost in the hills. I am going to say I searched for a month. I will throw this fork into the drowned chapel where no one will ever ring it again, and I will write every map he would have written, and they will have my name on them.\n\nGods forgive me. He won\'t have to. He\'ll never know."' });
add({ id: 'atlas_of_hours', name: 'The Atlas of Hours', type: 'book', weight: 2, value: 3000, atlas: true, desc: 'An Ayleid book of silver pages, each a map of the same hall at a different hour. Once each day, reading it restores you completely.', text: 'Every page is the same map of the same hall, drawn at a different hour. In the earliest pages the hall is full of Ayleids. In the later ones it is empty, then dark. In the last few, a man in a surveyor\'s coat stands in the middle of the hall, and does not move from page to page.\n\nThe silver is warm. Turning the pages, you feel the hours you have lost today come quietly back to you.' });
add({ ...AR('corvins_ring', "Corvin's Waymark Ring", 'ring', 'cloth', 0, 0.1, 600, 0x70b0ff), fortifyHealth: 20, fortifyMagicka: 20, desc: 'A silver ring engraved with a compass rose. The needle in its face still points to wherever you most want to go.' });
add({ id: 'finished_map', name: 'The Finished Map', type: 'book', weight: 0, value: 0, quest: true, text: 'Corvin\'s map, finished at last — in two hands. His quick strokes fill the hills and forests; her neat lettering names every stream and shrine. In the bottom corner, where a cartographer signs, there are two names, and between them, very small, a drawing of a bell.' });

// ---- The Lantern in the Wood (the Corwyn questline)
add({ id: 'delivery_crate', name: "Seed-Neeus's Delivery Crate", type: 'misc', weight: 4, value: 0, quest: true, prop: 'wooden_crate_01', desc: 'A small crate stencilled NORTHERN GOODS AND TRADE — CHORROL, full of beeswax candles packed in straw for Weynon Priory. One corner is scorched, which is odd, because nothing near it has burned in eighty years.' });
add({ id: 'maela_household_book', name: "Maela Corwyn's Household Book", type: 'book', weight: 1, value: 0, quest: true, text: 'A thin ledger, its covers fused into a single black crust. Only the last pages can be pried apart. The hand is round and careful, a woman who learned her letters late and was proud of them.\n\n"Third of Frostfall. Osric sold forty sacks to the Priory. Tam ate all the honey. Tam says he did not eat the honey.\n\nNinth of Frostfall. The Dunmer woman came back. Grey hood, a lantern that burns green, a satchel of black stones that click when she walks. She wants to buy the ash from the kilns — not charcoal, ASH — and she asked how many folk live in the wood, and how far to the nearest guard. Osric sent her off. She smiled at Tam. I did not like it.\n\nTenth of Frostfall. Smoke in the west at dusk, though Osric swears no kiln is lit. The dogs will not stop barking. Tam is asleep with his fox. I have filled the lantern. I will sit up."\n\nThere are no more entries.' });
add({ id: 'tams_slate', name: "A Child's Slate", type: 'book', weight: 1, value: 0, quest: true, text: 'A little writing slate in a wooden frame, the kind children learn their letters on. The frame is charred black, but the slate itself has kept what was scratched into it, in big uneven capitals:\n\n     MA\n     FIRE\n     GON FOR HELP\n     GARD\n     TAM\n\nAn arrow, pointing east — toward the road, and Chorrol.' });
add({ id: 'ilvaine_journal', name: "Ilvaine Seddrel's Daybook", type: 'book', weight: 1, value: 0, quest: true, text: 'A daybook bound in grey leather, the entries spanning a very long time.\n\n3E 349, Frostfall. "The charcoal-burners would not sell me their ash. No matter. A forest is a kiln, if you are patient with it. Thirty-one souls from one autumn night — the gems are full, and still warm.\n\nOne would not go in. The mother. She went back into the burning trees with a lantern, calling for her whelp, and when she died she simply... kept calling. A soul that will not be gathered is a soul that can be anchored. I have taken her lantern. Where the lantern goes, she must follow. A light no one can put out — and a lure no traveller can resist."\n\n3E 431. "Traven has banned the Art. The Guild hunts us like dogs. I have returned to the barrow. The mother is still here, still calling, eighty years on. Grief is the purest fuel there is."\n\n3E 433, Last Seed. "The Oblivion Gates thin the world. The burned ones answer me now when I call them up out of the ash. A courier boy came through the wood last week and nearly followed her light all the way to my door. Soon I will not need to wait for travellers. Soon I will walk into Chorrol with an army of the ash I made."' });
add({ id: 'maela_lantern', name: "Maela's Lantern", type: 'light', slot: 'shield', lightStyle: 'lantern', rank: 2, weight: 2, value: 0, quest: true, desc: 'A charcoal-burner\'s lantern on a carrying pole, its little flame burning a steady, kindly gold. It has not gone out in eighty-four years, and it will not go out now. Brighter and wider than a torch, and it never gutters, even in water. Press L to raise or lower it.' });

// ---- The White Hare (the Wintersmeet questline)
add({ id: 'brynja_hymn', name: 'The Lightwatch Hymn', type: 'book', weight: 0, value: 0, quest: true, text: 'A scrap of birch-bark, written over in Old Brynja\'s careful runes and, beneath them, in Cyrodilic for those who never learned:\n\nLady of the high air, who shakes the white from your sleeves,\nwho sends the hare down the mountain before the first flake falls —\nwe have swept the step, we have banked the fire, we have lit the lamp.\nLet her find the way. Let her find the way home.\n\nLight the way home, Lady. Light the way home.\n\n(In the margin, in a much younger hand: "Brynja sings this flat. Don\'t tell her. — S.")' });
add({ id: 'hare_fur', name: 'Tuft of Glowing Fur', type: 'misc', weight: 0, value: 0, quest: true, desc: 'A tuft of fur whiter than the snow it was lying in. In shadow, it glows faintly blue, like moonlight on a frozen lake. It is warm.' });
add({ id: 'trap_tag', name: 'Trapper\'s Tag', type: 'misc', weight: 0, value: 0, quest: true, desc: 'A notched wooden tag of the kind trappers tie to their snares so no one else can claim the catch. Burned into it: VARN.' });
add({ id: 'varn_ledger', name: 'Varn\'s Ledger', type: 'book', weight: 0.5, value: 0, quest: true, text: 'A greasy little book of pelts and prices, in a hand that has never troubled itself with spelling.\n\n"3 wolf, 2 fox, sold Bruma, 40.\n1 snow bear (small), sold Chorrol, 90. Bear not dead. Buyer not happy.\n\nWHITE HARE. Took at the old shrine, first snow. Never seen one glow before. Old man in grey cloak waiting at the bottom of the shrine path like he knew. Paid 300 SILVER. Says bring it to the Rime Spire, no questions. Says winter is the only wall the Daedra cant burn.\n\nNo questions. Easiest 300 I ever made.\n\n(Underneath, smaller:) Cage hummed all the way up the mountain. Didnt like it."' });
add({ id: 'fir_heartwood', name: 'Grandfather Fir Heartwood', type: 'misc', weight: 2, value: 0, quest: true, desc: 'A spar of fragrant red heartwood from a lightning-split branch of the Grandfather Fir. It smells of resin and old summers. The first gift of winter.' });
add({ id: 'lucky_lure', name: 'Erlend\'s Lucky Lure', type: 'misc', weight: 0, value: 0, quest: true, desc: 'A fishing lure carved from bone and inlaid with a sliver of mother-of-pearl, tied with a red thread. Erlend swears it has caught every fish worth catching in this pond. Erlend swears a lot of things.' });
add({ id: 'glimmerfin', name: 'Glimmerfin', type: 'misc', weight: 1, value: 0, quest: true, desc: 'A slender silver fish whose scales hold light the way frost does. It is still alive, somehow, and not at all bothered by being out of the water. The second gift of winter.' });
add({ id: 'snowberry', name: 'Snowberries', type: 'ingredient', effects: [{ type: 'magicka', amount: 6 }, { type: 'fatigue', amount: 4 }], weight: 0.1, value: 4, desc: 'Small pale-blue berries that ripen under the snow. Sharp, sweet, and cold on the tongue.' });
add({ id: 'kynareth_loaf', name: 'Kynareth\'s Loaf', type: 'misc', weight: 1, value: 0, quest: true, desc: 'A round honey loaf studded with snowberries, scored on top with Kynareth\'s sign of the four winds. It is still warm and smells unbearably good. It is an offering. Do not eat it. The third gift of winter.' });
add({ id: 'wind_charm', name: 'Kynareth\'s Wind-Charm', type: 'misc', weight: 0.5, value: 0, quest: true, desc: 'A charm braided from fir heartwood and silver fish-scale on a cord of Brynja\'s grey hair. When the wind blows it hums, very softly, a note that makes the wind go round it.' });
add({ id: 'cassius_journal', name: 'Cassius Frey\'s Journal', type: 'book', weight: 1, value: 0, text: 'The handwriting starts neat, Legion-trained, and gets smaller and smaller as the pages go on.\n\n"Kvatch. I will not write about Kvatch. I have written it out eleven times and burned it eleven times.\n\nThe Gates breathe fire. Everything Dagon sends is fire — scamps, clannfear, the Dremora with their burning blades. I have watched a scamp step into a snowbank and scream. Fire hates the cold. Fire cannot cross what it cannot melt.\n\nThe hare is Kynareth\'s. The trapper did not know what he had; I did. With her in the cage, the winter does what I tell it. One more month and the snow will stand twenty feet deep from the Jerall to the Great Forest, and nothing that burns will ever come over it.\n\nWintersmeet will be cold. Wintersmeet will live.\n\nWintersmeet will be cold."' });
add({ ...AR('frostward_ring', 'Frostward Ring', 'ring', 'cloth', 0, 0.1, 500, 0x9ad8ff), fortifyMagicka: 30, desc: 'A ring of pale blue silver, rimed with frost that never melts. Cassius Frey wore it at Kvatch.' });
add({ ...AR('first_snow_mantle', 'Mantle of the First Snow', 'amulet', 'cloth', 0, 0.5, 1200, 0xeef6ff), fortifyHealth: 20, fortifyMagicka: 20, desc: 'A small silver hare on a chain of braided white wool, given by the people of Wintersmeet. It is always cool to the touch, and in the dark it glows, very faintly, blue.' });

// ---- A Crown of Starflowers
add({ id: 'starflower', name: 'Starflower', type: 'ingredient', effects: [{ type: 'magicka', amount: 4 }, { type: 'fatigue', amount: 4 }], weight: 0, value: 3, desc: 'A small wildflower with five pale petals the colour of a winter sky and a golden heart. In the dark the petals glow, very faintly, like the stars they are named for.' });
add({ id: 'starflower_crown', name: 'Crown of Starflowers', type: 'misc', weight: 0, value: 0, quest: true, desc: 'Ten starflowers woven into a little ring, just the right size for a puppy\'s neck.' });

// ---- Ten White Rabbits
add({ id: 'snikkit_key', name: "Snikkit's Cage Key", type: 'key', weight: 0, value: 0, quest: true, desc: 'A crooked little iron key on a loop of red wool. Someone has scratched a rabbit on the bow, very badly. It may be a cat.' });
add({ id: 'snikkit_token', name: "Snikkit's Mark", type: 'misc', weight: 0, value: 0, quest: true, desc: 'A chewed bone with three notches and a squiggle cut into it. Among the Frostfang goblins this means "this one is with Snikkit, do not stab". Probably.' });
add({ id: 'mock_rabbit_pie', name: 'Mock Rabbit Pie', type: 'misc', weight: 2, value: 0, quest: true, desc: 'A golden, steaming pie the size of a cartwheel, made by Matilde Brindle of Wintersmeet. It smells exactly like rabbit stew. There is not a single rabbit in it. That is the point.' });
add({ ...AR('snikkit_stone', "Snikkit's Lucky Stone", 'ring', 'cloth', 0, 0.1, 350, 0xd8e8f0), fortifyHealth: 15, fortifyMagicka: 10, desc: 'A smooth white pebble with a hole in it, threaded on a loop of wire. Snikkit swears it is the luckiest stone in the Jerall. It was in his mouth for most of the conversation.' });

// household clutter
const C = (id, name, value, weight, prop, extra = {}) => add({ id, name, type: 'misc', value, weight, prop, ...extra });
C('brass_goblet', 'Brass Goblet', 8, 1, 'brass_goblets', { propVariant: 1 });
C('wooden_bowl', 'Wooden Bowl', 1, 1, 'wooden_bowl_02');
C('wooden_plate', 'Carved Wooden Plate', 2, 1, 'carved_wooden_plate');
C('clay_jug', 'Clay Jug', 3, 2, 'jug_01');
C('pewter_pitcher', 'Pewter Pitcher', 10, 2, 'metal_jug');
C('candlestick', 'Wooden Candlestick', 2, 1, 'wooden_candlestick');
C('candelabra', 'Brass Candelabra', 35, 4, 'brass_candleholders', { propVariant: 1 });
C('brass_pot', 'Brass Cooking Pot', 12, 4, 'brass_pot_01');
C('hammer', 'Hammer', 3, 3, 'wooden_hammer_01');
C('saw', 'Saw', 3, 3, 'handsaw_wood');
C('spade', 'Shovel', 4, 6, 'rusted_spade_01');
C('hatchet', 'Woodcutter\'s Hatchet', 4, 4, 'hatchet');
C('ships_compass', "Ship's Compass", 60, 1, 'seadogs_compass');
C('magnifying_lens', 'Magnifying Lens', 45, 1, 'magnifying_glass_01');
C('ceramic_vase', 'Glazed Vase', 15, 3, 'ceramic_vase_01');
C('painted_vase', 'Painted Vase', 30, 3, 'antique_ceramic_vase_01');
C('oil_lamp', 'Oil Lamp', 12, 3, 'vintage_oil_lamp');
C('lantern', 'Lantern', 8, 2, 'wooden_lantern_01');
C('marble_bust', 'Marble Bust of Tiber Septim', 150, 15, 'marble_bust_01');
C('horse_figurine', 'Horse Figurine', 90, 1, 'horse_statue_01');
C('wicker_basket', 'Wicker Basket', 2, 2, 'wicker_basket_01');
C('broom', 'Broom', 1, 3, 'wooden_broom');

export function getItem(id) {
  const it = ITEMS[id];
  if (!it) throw new Error('Unknown item ' + id);
  return it;
}

/** Parse "id*count" spec into [id, count] */
export function parseSpec(spec) {
  const [id, n] = spec.split('*');
  return [id, n ? parseInt(n, 10) : 1];
}

export class Inventory {
  constructor() {
    this.items = new Map(); // id -> count
  }
  add(id, n = 1) {
    if (n <= 0) return;
    getItem(id);
    this.items.set(id, (this.items.get(id) || 0) + n);
  }
  remove(id, n = 1) {
    const c = this.items.get(id) || 0;
    const r = Math.min(c, n);
    if (c - r <= 0) this.items.delete(id); else this.items.set(id, c - r);
    return r;
  }
  count(id) { return this.items.get(id) || 0; }
  has(id, n = 1) { return this.count(id) >= n; }
  get gold() { return this.count('gold'); }
  weight() {
    let w = 0;
    for (const [id, c] of this.items) w += (ITEMS[id]?.weight || 0) * c;
    return w;
  }
  entries() {
    return [...this.items.entries()].map(([id, count]) => ({ id, count, item: ITEMS[id] }));
  }
  toJSON() { return Object.fromEntries(this.items); }
  static fromJSON(o) {
    const inv = new Inventory();
    for (const [id, c] of Object.entries(o || {})) if (ITEMS[id]) inv.items.set(id, c);
    return inv;
  }
}

/** Leveled loot tables. */
export const LOOT = {
  dawn: [['gold', 15, 40, 1], ['potion_health_light', 1, 1, 0.4], ['mythic_dawn_robe', 1, 1, 0.25]],
  bandit: [['gold', 5, 30, 1], ['mead', 1, 1, 0.2], ['venison', 1, 1, 0.2], ['potion_health_light', 1, 1, 0.4], ['iron_arrow', 3, 10, 0.3], ['lockpick', 1, 2, 0.3], ['bread', 1, 1, 0.3]],
  goblin: [['gold', 1, 10, 0.6], ['red_mushroom', 1, 2, 0.4], ['iron_dagger', 1, 1, 0.2]],
  wolf: [['wolf_pelt', 1, 1, 0.9]],
  mudcrab: [['mudcrab_chitin', 1, 1, 0.8], ['pearl', 1, 1, 0.08]],
  rat: [['cheese', 1, 1, 0.1]],
  deer: [['venison', 1, 2, 1]],
  chicken: [['bonemeal', 1, 1, 0.3]],
  none: [],
  skeleton: [['bonemeal', 1, 2, 0.8], ['gold', 3, 15, 0.4]],
  zombie: [['gold', 2, 12, 0.3], ['red_mushroom', 1, 1, 0.3]],
  ghost: [['ectoplasm', 1, 1, 1]],
  frost: [['frost_salts', 1, 1, 0.8], ['gold', 5, 20, 0.3]],
  ashen: [['bonemeal', 1, 2, 0.7], ['gold', 2, 10, 0.4], ['ectoplasm', 1, 1, 0.15]],
  daedra: [['daedra_heart', 1, 1, 0.5], ['gold', 10, 40, 0.5], ['potion_magicka', 1, 1, 0.2]],
  chest_common: [['gold', 10, 50, 0.9], ['candlestick', 1, 1, 0.2], ['brass_goblet', 1, 2, 0.2], ['wine_surilie', 1, 1, 0.15], ['potion_health_light', 1, 2, 0.5], ['lockpick', 1, 3, 0.4], ['iron_arrow', 5, 15, 0.3], ['silver_cup', 1, 1, 0.3], ['potion_magicka', 1, 1, 0.25]],
  chest_ayleid: [['gold', 40, 120, 1], ['welkynd_stone', 1, 1, 0.6], ['potion_health', 1, 2, 0.5], ['ring_of_vitality', 1, 1, 0.15], ['elven_bow', 1, 1, 0.1], ['steel_arrow', 5, 15, 0.4]],
  chest_boss: [['gold', 100, 250, 1], ['potion_health', 2, 3, 1], ['elven_cuirass', 1, 1, 0.5], ['steel_longsword', 1, 1, 0.5], ['ring_of_the_wizard', 1, 1, 0.3]],
  barrel: [['apple', 1, 3, 0.5], ['bread', 1, 2, 0.4], ['cheese', 1, 2, 0.3], ['blue_flower', 1, 2, 0.2], ['onion', 1, 3, 0.35], ['potato', 1, 3, 0.35], ['pear', 1, 2, 0.2], ['mead', 1, 1, 0.15]],
  crate: [['hammer', 1, 1, 0.2], ['saw', 1, 1, 0.1], ['lantern', 1, 1, 0.15], ['clay_jug', 1, 1, 0.2], ['wooden_bowl', 1, 2, 0.25], ['lockpick', 1, 2, 0.25], ['iron_arrow', 3, 10, 0.2], ['wine_tamika', 1, 1, 0.1]],
  wine_rack: [['wine_tamika', 1, 2, 0.6], ['wine_surilie', 1, 1, 0.3], ['mead', 1, 2, 0.5], ['cyrodilic_brandy', 1, 1, 0.12]],
};

export function rollLoot(table, rand = Math.random, level = 1) {
  const out = [];
  for (const [id, lo, hi, chance] of LOOT[table] || []) {
    if (rand() < chance) {
      let n = lo + Math.floor(rand() * (hi - lo + 1));
      if (id === 'gold') n = Math.round(n * (1 + (level - 1) * 0.2));
      out.push([id, n]);
    }
  }
  return out;
}
