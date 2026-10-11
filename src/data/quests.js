// Quest definitions and the quest/journal manager.
import { LOCATIONS } from '../world/layout.js';

export const QUESTS = {
  mq_amulet: {
    name: 'Deliver the Amulet', main: true,
    stages: {
      10: { text: 'Emperor Uriel Septim VII lies dead in the sewers beneath the Imperial City, struck down by Mythic Dawn assassins. With his dying breath he pressed the Amulet of Kings into my hands and bade me take it to a man named Jauffre, at Weynon Priory near Chorrol.', target: { npc: 'jauffre', cell: 'priory', world: LOCATIONS.priory } },
      100: { text: 'I gave the Amulet of Kings to Jauffre, Grandmaster of the Blades.', done: true },
    },
  },
  mq_gate: {
    name: 'Breaking the Siege of Kvatch', main: true,
    stages: {
      10: { text: 'Jauffre told me that an Oblivion Gate has torn open before the city of Kvatch. Daedra pour from it unchecked. I should find Captain Savlian Matius at the siege camp below the city.', target: { npc: 'savlian', world: { x: -360, z: 240 } } },
      20: { text: 'Savlian Matius says the gate cannot be closed from this side. Someone must enter the Deadlands and take the Sigil Stone that anchors it. I must enter the Oblivion Gate.', target: { world: LOCATIONS.gate } },
      30: { text: 'I have entered the Deadlands. Far ahead a tower of black stone vents fire into the sky — the Sigil Keep. The Sigil Stone must be at its heart.', target: { cell: 'oblivion', x: 0, z: -110, sigil: true } },
      40: { text: 'I tore the Sigil Stone from its fiery column and the Gate collapsed around me. I am back in Tamriel. I should tell Savlian Matius.', target: { npc: 'savlian', world: { x: -360, z: 240 } } },
      50: { text: 'Savlian Matius and his soldiers can hold Kvatch now. I should return to Jauffre at Weynon Priory with the news.', target: { npc: 'jauffre', cell: 'priory', world: LOCATIONS.priory } },
      100: { text: 'Jauffre named me a Hero of Kvatch and a friend of the Blades. The jaws of Oblivion have been shut — for now. And then he told me who the Emperor\'s heir is.', done: true },
    },
  },
  ms_heirloom: {
    name: 'The Jemane Heirloom',
    stages: {
      10: { text: 'Reynald Jemane of Chorrol asked me to recover his grandfather\'s sword from the Ayleid ruin of Vilverin, east of the Imperial Sewers exit. His grandfather fell there, and something guards the blade still.', target: { cell: 'vilverin', world: LOCATIONS.vilverin, item: 'jemane_blade' } },
      20: { text: 'I found the Jemane Heirloom Blade deep within Vilverin. I should return it to Reynald Jemane in Chorrol.', target: { npc: 'reynald', world: LOCATIONS.chorrol } },
      100: { text: 'Reynald was overjoyed to see his grandfather\'s blade again, and paid me well for it.', done: true },
    },
  },
  ms_bounty: {
    name: 'Bounty: Black Brugo',
    stages: {
      10: { text: 'Captain Bernadette Peneles of the Chorrol Guard has posted a bounty on the bandit chieftain Black Brugo, who camps along the Black Road far to the east. Proof of his death will earn me 300 septims.', target: { world: LOCATIONS.bandit_camp, npc: 'black_brugo' } },
      20: { text: 'Black Brugo is dead. I took his signet ring as proof. Captain Peneles in Chorrol will want to see it.', target: { npc: 'captain', world: LOCATIONS.chorrol } },
      100: { text: 'Captain Peneles paid the bounty on Black Brugo. The Black Road is a little safer.', done: true },
    },
  },
};

// main quest, act two
const KVATCH_CHAPEL = { x: -446, z: 341.5 };
Object.assign(QUESTS, {
  mq_heir: {
    name: 'Find the Heir', main: true,
    stages: {
      10: { text: 'Jauffre has told me the secret he kept from the start: Uriel Septim had a son. His name is Martin, and he is a priest of Akatosh — at Kvatch. Savlian\'s soldiers speak of survivors holed up in the ruined Chapel of Akatosh inside the walls. If Martin lives, he is there.', target: { world: KVATCH_CHAPEL, cell: 'kvatch_chapel' } },
      20: { text: 'Daedra have broken into the Chapel of Akatosh. I have to drive them out before they reach the survivors.', target: { cell: 'kvatch_chapel', npc: 'martin' } },
      30: { text: 'The chapel is safe, for now. I should speak to Martin, the priest — and find a way to make him believe who he is.', target: { cell: 'kvatch_chapel', npc: 'martin' } },
      40: { text: 'Martin has agreed to come with me to Weynon Priory. I must keep him alive on the road — he is the last of the Septim blood.', target: { world: LOCATIONS.priory, npc: 'martin' } },
      100: { text: 'I brought Martin Septim to Weynon Priory.', done: true },
    },
  },
  mq_priory: {
    name: 'Weynon Priory', main: true,
    stages: {
      10: { text: 'Smoke over Weynon Priory. Robed killers are cutting down the monks — the Mythic Dawn. I must stop them, and keep Martin alive.', target: { world: LOCATIONS.priory } },
      20: { text: 'The assassins are dead. I should find Jauffre inside Weynon House.', target: { npc: 'jauffre', cell: 'priory', world: LOCATIONS.priory } },
      30: { text: 'The Amulet of Kings is gone — taken in the attack. Jauffre asks me to search the assassins\' bodies for anything that tells us where it went.', target: { world: LOCATIONS.priory } },
      100: { text: 'One of the assassins carried orders from the Mythic Dawn. The Amulet is in their Master\'s hands.', done: true },
    },
  },
  mq_dawn: {
    name: 'The Path of Dawn', main: true,
    stages: {
      10: { text: 'The assassins\' orders say a Mythic Dawn agent waits beneath the Great Oak of Chorrol "when the night is deepest". Someone in Chorrol may have seen him — someone who watches the Oak more closely than anyone should.', target: { world: { x: -376, z: -296 } } },
      15: { text: 'Glarthir, Chorrol\'s most suspicious citizen, has been keeping a list. A hooded man stands beneath the Great Oak every night between eleven and three. I should be there.', target: { world: { x: -376, z: -296 }, npc: 'aurelian' } },
      20: { text: 'I have the first volume of the Commentaries on the Mysterium Xarxes, Mankar Camoran\'s book of revelations. Somewhere in its pages is the way to the Mythic Dawn\'s hidden shrine.', target: { item: 'commentaries_1' } },
      30: { text: '"Read me as the Dawn reads the world: by its first light." The Commentaries hide something in plain sight. If I cannot find it, Martin — who knows more of Daedra worship than a priest should — might.', target: { npc: ['martin', 'martin_priory'], cell: 'priory', world: LOCATIONS.priory } },
      40: { text: 'The first letter of each passage spells out the shrine\'s hiding place: FORT SUTCH. It is an old Imperial fort on the Gold Coast road, in the hills west of Kvatch.', target: { world: LOCATIONS.fort_sutch } },
      100: { text: 'I found the hidden shrine of the Mythic Dawn at Fort Sutch.', done: true },
    },
  },
  mq_shrine: {
    name: 'Dagon Shrine', main: true,
    stages: {
      10: { text: 'Fort Sutch hides the Mythic Dawn\'s shrine to Mehrunes Dagon. If I wear one of their robes, the faithful may take me for one of their own — long enough, at least, to find the Amulet, or what they have done with it.', target: { cell: 'fort_sutch', world: LOCATIONS.fort_sutch, npc: 'ruma_camoran' } },
      20: { text: 'Ruma Camoran, Mankar\'s daughter, preached the end of the world from the altar. The Amulet is gone, carried into Paradise by Mankar himself. But the Mysterium Xarxes — the book that opens the way — lies on the altar.', target: { cell: 'fort_sutch', item: 'mysterium_xarxes' } },
      30: { text: 'I have the Mysterium Xarxes. Now I have to get out of Fort Sutch alive.', target: { cell: 'fort_sutch', world: LOCATIONS.priory } },
      40: { text: 'I escaped Fort Sutch with the Mysterium Xarxes. Martin is waiting at Weynon Priory.', target: { npc: ['martin', 'martin_priory'], cell: 'priory', world: LOCATIONS.priory } },
      100: { text: 'Martin has the Mysterium Xarxes. He believes he can use it to follow Mankar Camoran into his Paradise and take back the Amulet of Kings. It will not be quick, and it will not be safe. But for the first time since the Emperor died, we know where the enemy is.', done: true },
    },
  },
});

// side quest: The Libram of Lesser Wonders
const CHORROL_OAK = { x: -380, z: -300 };
QUESTS.sq_wizard = {
  name: 'The Libram of Lesser Wonders',
  stages: {
    10: { text: 'Aldous Quillwhistle, a cheerful wizard who keeps a crooked tower in the north-west of Chorrol, scattered three pages of his spellbook with a misfiring Breeze Charm while trying to cool his tea. One is caught high in the Great Oak (he taught me Telekinesis to fetch it). One was nibbled by Henrietta, a hen in the coop behind the houses on the west side of town, who now glows. The third is being carried about by a will-o\'-the-wisp in the woods beyond the east gate. A single spell should pop it.', target: { world: CHORROL_OAK } },
    20: { text: 'I have found one of the Libram\'s pages. Two more to go: the Great Oak, Henrietta the hen, and the wisp beyond the east gate.', target: { world: CHORROL_OAK } },
    30: { text: 'Two pages found. One more.', target: { world: CHORROL_OAK } },
    40: { text: 'I have all three pages of the Libram of Lesser Wonders. Aldous will be waiting in Quillwhistle\'s Spire.', target: { npc: 'aldous', cell: 'quill_spire', world: { x: -435, z: -248 } } },
    50: { text: 'Aldous is binding the pages back into the Libram. It is, he assures me, perfectly safe.', target: { npc: 'aldous', cell: 'quill_spire' } },
    100: { text: 'The Libram of Lesser Wonders is whole again. Aldous Quillwhistle\'s spells are now for sale at Quillwhistle\'s Spire: twenty-five of them, each stranger than the last.', done: true },
  },
};

// side quest: The Ballad of the Hero
const PINCH_SHORE = { x: 91, z: 66 };
QUESTS.sq_bard = {
  name: 'The Ballad of the Hero',
  stages: {
    10: { text: 'Tillmon Larkspur, a bard of tremendous confidence and limited talent, is composing a ballad about the Hero of Kvatch — me — outside the Roxey Inn. Unfortunately his lute, Lady Plucksworth, was stolen by a mudcrab. He says it went toward the lake shore, north-east of the inn.', target: { world: PINCH_SHORE, npc: 'sir_pinchington' } },
    20: { text: 'I took Lady Plucksworth back from Sir Pinchington, a mudcrab of unusual size and attitude. Tillmon will want her back.', target: { npc: ['tillmon', 'tillmon_inn'], world: { x: 54, z: 40 } } },
    30: { text: 'Tillmon needs a word that rhymes with "Oblivion". He suggests I ask the three wisest people he knows: M\'aiq the Liar, who wanders the roads near the Sewers exit; Mirabelle Monet at the Roxey Inn; and Glarthir in Chorrol.', target: { npc: ['maiq', 'roxey_keeper', 'glarthir'] } },
    40: { text: 'I have three rhymes for "Oblivion", each worse than the last. Tillmon will be thrilled.', target: { npc: ['tillmon', 'tillmon_inn'], world: { x: 54, z: 40 } } },
    50: { text: 'Every premiere needs an audience. Tillmon has asked me to invite three of the good people of Chorrol to hear his ballad at the Grey Mare.', target: { world: { x: -380, z: -296 } } },
    60: { text: 'Three people of Chorrol have agreed to come, some of them willingly. Tillmon will perform at the Grey Mare in Chorrol tonight, between seven and eleven in the evening.', target: { npc: 'tillmon_inn', cell: 'inn', world: LOCATIONS.chorrol } },
    70: { text: 'The Ballad of the Hero of Kvatch has begun. There is no stopping it now.', target: { npc: 'tillmon_inn', cell: 'inn' } },
    80: { text: 'Tillmon Larkspur was never a bard. Halfway through the last verse, it rained cheese, and he turned out to be Sheogorath, the Daedric Prince of Madness, who apparently does this sort of thing for fun. He would like a word.', target: { npc: 'sheogorath', cell: 'inn' } },
    100: { text: 'Sheogorath thanked me for the best evening he had had in a century, paid me in gold and cheese, and left me the Lute of the Mad God. Then he vanished in a puff of butterflies. The Grey Mare will be finding cheese in the rafters for weeks.', done: true },
  },
};

// side quest: The Unfinished Map
QUESTS.sq_map = {
  name: 'The Unfinished Map',
  stages: {
    10: { text: 'Ysolde Vane, an old cartographer coughing her life away at the Grey Mare in Chorrol, gave me the last map drawn by her partner Corvin Ashby, who vanished forty years ago. Three marks in his hand: a ring of stones in the hills west of Chorrol, a bell drawn in the waters of Lake Rumare, and a tree with an eye. She wants to know what became of him. I\'ll start with the stones.', target: { world: LOCATIONS.hollow_stones } },
    20: { text: 'On the altar of the Hollow Stones I found a waymark Corvin left for Ysolde: the door "hears only the bell\'s true note, and only in the hour that belongs to no day." He left a bellwright\'s fork on the altar for her — but it is gone. The second mark is a bell in the south-western shallows of Lake Rumare.', target: { world: LOCATIONS.drowned_bell } },
    30: { text: 'In the drowned chapel I found the bellwright\'s tuning fork — and a torn journal page in a small, neat hand. I have seen that hand before, in the margins of Corvin\'s map. The last mark is a tree with an eye, in the woods south-west of the Sewers exit. Someone lives there.', target: { world: LOCATIONS.old_marrow, npc: 'old_marrow' } },
    40: { text: 'Old Marrow says the hour that belongs to no day is midnight: the door in the Hollow Stones answers only between eleven and one. The Ayleids counted the night from moonrise — Moon, Stars, Sun. And Corvin did not go to the stones alone. A woman went with him, and came back down the path by herself.', target: { world: LOCATIONS.hollow_stones } },
    50: { text: 'At midnight I struck the tuning fork against the altar of the Hollow Stones, and a door of light opened in the hill. Nenalatha — the city that keeps time. Corvin went in forty years ago.', target: { cell: 'nenalatha', world: LOCATIONS.hollow_stones } },
    60: { text: 'The way into Nenalatha\'s Hall of Hours is barred by a gate of fused light. Three pedestals stand before it: Sun, Moon and Star. Corvin\'s waymark and Old Marrow agreed on the order the elves counted their night.', target: { cell: 'nenalatha', x: 0, z: 0 } },
    70: { text: 'The seal is broken. Beyond lies the Hall of Hours — and something still keeps watch there.', target: { cell: 'nenalatha', npc: 'archivist' } },
    75: { text: 'The Archivist is destroyed. In the heart of the hall stands a welkynd crystal, and inside it, not a day older than in Ysolde\'s sketches, is Corvin Ashby. Beside him, on a lectern, the Atlas of Hours feeds the crystal its light. If I strike the crystal with the fork, the Atlas will burn out and Corvin will walk free. If I take the Atlas, the crystal will go dark — and him with it.', target: { cell: 'nenalatha', crystal: true } },
    80: { text: 'I shattered the crystal. Corvin Ashby lives — forty years late, and determined to see Ysolde before the end. I should bring him to the Grey Mare in Chorrol.', target: { npc: 'ysolde', cell: 'inn', world: LOCATIONS.chorrol } },
    85: { text: 'I took the Atlas of Hours. The crystal went dark, and Corvin with it. I should go back to Ysolde at the Grey Mare and tell her... something.', target: { npc: 'ysolde', cell: 'inn', world: LOCATIONS.chorrol } },
    100: { text: 'Corvin and Ysolde met again at the Grey Mare. She confessed that she had sealed him in Nenalatha, and he forgave her. She died a little before dawn, holding his hand. Corvin gave me his ring, and the map — finished at last, in two hands.', done: true },
    110: { text: 'I told Ysolde what I found in Nenalatha. She confessed that she had sealed Corvin in the ruin herself, forty years ago, and died that night with the secret finally spoken. The Atlas of Hours is mine.', done: true },
  },
};

// side story: The Lantern in the Wood — four quests about the Corwyn fire of 3E 349
const SHOP = { x: -380, z: -300 };
QUESTS.sq_lantern = {
  name: 'The Lantern in the Wood',
  stages: {
    10: { text: 'Seed-Neeus of Northern Goods and Trade in Chorrol is selling more lamp oil than she has in years: nobody will take the south road after dark. Something walks the woods south of town with a lantern. Her courier, Bram Hollis, saw it three nights ago and has not been right since. He is sitting in the back of her shop.', target: { npc: 'bram', cell: 'shop', world: SHOP } },
    20: { text: 'Bram says he left the Priory road to cut through the woods south of Chorrol, along an old charcoal-burners\' track, and came to a clearing. A pale woman with a lantern came out of the trees, calling "Tam! Tam, come home!" — and then she called it at HIM. He dropped Seed-Neeus\'s delivery crate and ran. She only walks after dark.', target: { world: LOCATIONS.corwyn_clearing } },
    30: { text: 'I found the clearing: a burned-out cottage, two cold kilns and two stone cairns, all of it eighty years overgrown. Bram\'s crate is here somewhere. If the lantern woman walks at night, I should come back after dark — eight in the evening until five in the morning.', target: { world: LOCATIONS.corwyn_clearing, npc: 'maela' } },
    40: { text: 'The lantern woman is a ghost, and she does not know it. She thinks the woods are still burning and that her son Tam, seven years old, is lost somewhere in the smoke. She begged me to find him. He has a wooden fox his father carved. I should bring Bram\'s crate back to Seed-Neeus and tell her what walks in her woods.', target: { npc: 'seed_neeus', cell: 'shop', world: SHOP } },
    100: { text: 'I told Seed-Neeus about the ghost in the clearing and returned her delivery crate. She paid me — and asked me not to stop. "A ghost that wants something keeps wanting it," she said. "Find out what she needs."', done: true },
  },
};
QUESTS.sq_ashes = {
  name: 'Ashes and Embers',
  stages: {
    10: { text: 'Seed-Neeus thinks I should learn what happened at the clearing. Two places to start: the burned cottage itself, which I should search by daylight, and Emfrid at the Grey Mare, whose family has kept the inn — and its gossip — for four generations.', target: { world: LOCATIONS.corwyn_clearing } },
    20: { text: 'In the ruins of the Corwyns\' cottage I found Maela Corwyn\'s household book, and under the burned cot, a child\'s slate. Tam scratched a message on it the night of the fire: "MA FIRE GON FOR HELP GARD TAM", with an arrow toward Chorrol. Tam did not die in the fire. He ran for the guard. Someone in Chorrol must remember a boy who came out of the burning woods.', target: { npc: 'emfrid', cell: 'inn', world: SHOP } },
    30: { text: 'Emfrid remembers her grandmother\'s story: that autumn, Marcus Bruiant came back from a wine run with a half-starved boy he had found on the south road, a boy who did not speak for a year. The Bruiants raised him as their own. His name is Rimalus Bruiant, he is ninety-one years old, and he is sitting in the corner of the Grey Mare.', target: { npc: 'inn_patron', cell: 'inn', world: SHOP } },
    40: { text: 'Rimalus Bruiant was born Tam Corwyn. He has carried his father\'s wooden fox for eighty-four years. He ran for help that night, and was found and carried away, and never went back — and when he heard the ghost was calling his name he would not believe it. He will not set foot in those woods while "the burned ones" walk them. I should tell his mother he is alive.', target: { world: LOCATIONS.corwyn_clearing, npc: 'maela' } },
    100: { text: 'I told Maela Corwyn her son is alive. She cannot come to him: a Dunmer woman stole her lantern the night of the fire, and where the lantern goes, Maela must follow. Every night the witch takes a little more of her light to raise the burned dead out of the ash. She lives under the old barrow mound just east of the clearing.', done: true },
  },
};
QUESTS.sq_gloam = {
  name: 'The Lamplighter',
  stages: {
    10: { text: 'A necromancer has kept Maela Corwyn\'s ghost on a leash for eighty-four years, and uses her light to raise the dead of the old fire. Her lair is the Gloamwood Barrow, just east of the Corwyns\' clearing.', target: { world: LOCATIONS.gloamwood_barrow, cell: 'gloam_barrow' } },
    20: { text: 'The Gloamwood Barrow stinks of old smoke. Lanterns burn green in its niches — and there is something in every one of them. The Lamplighter is somewhere below.', target: { cell: 'gloam_barrow', npc: 'ilvaine' } },
    25: { text: 'Ilvaine Seddrel, the Lamplighter, is dead. The green lanterns have gone dark, and the things inside them are gone. Maela\'s lantern must be on the witch\'s body.', target: { cell: 'gloam_barrow', item: 'maela_lantern' } },
    30: { text: 'I have Maela\'s lantern — a charcoal-burner\'s lantern on a carrying pole, still burning after eighty-four years. Ilvaine\'s daybook says she set the fire of 3E 349 herself, to fill her soul gems. I should return the lantern to Maela at the clearing, after dark.', target: { world: LOCATIONS.corwyn_clearing, npc: 'maela' } },
    100: { text: 'Maela Corwyn has her lantern back, and she is no one\'s leash any more. But she will not rest. "Bring me my boy," she said. "I have been calling him so long."', done: true },
  },
};
QUESTS.sq_home = {
  name: 'Come Home',
  stages: {
    10: { text: 'With the Lamplighter dead, the woods are safe again. I should tell Rimalus — Tam — at the Grey Mare, and ask him to come and see his mother.', target: { npc: 'inn_patron', cell: 'inn', world: SHOP } },
    20: { text: 'Tam Corwyn has agreed to walk into the woods he ran out of eighty-four years ago. He is ninety-one and slow, and he wants to go after dark, when she walks. I should take him to the clearing between eight in the evening and five in the morning, and keep him safe on the way.', target: { world: LOCATIONS.corwyn_clearing, npc: 'maela' } },
    100: { text: 'In the clearing where his home had burned, Tam Corwyn showed his mother the wooden fox, and sang her the song she used to sing him. She knew him. "You went for help," she said. "You were such a good boy." Then she was gone, gently, all at once, like a lamp turned down. She left her lantern for me. It will never go out.', done: true },
  },
};

// side story: The White Hare — five quests in the snows around Wintersmeet
const HARE = { inn: { x: -180, z: -566 }, town: { x: -180, z: -548 } };
QUESTS.sq_hare1 = {
  name: 'The Hare That Didn\'t Come',
  stages: {
    10: { text: 'Every winter, on the morning of the first snowfall, a white hare appears on the roof of the Snow Hare inn in Wintersmeet, and stays until the thaw. This year the first snow came early and thick — and the hare never came. The snow has not stopped since. Sigrun Warmhands is worried, and so, she says, is Old Brynja, who knows more about the hare than anyone.', target: { npc: 'brynja', world: HARE.town } },
    20: { text: 'Old Brynja says the white hare is no ordinary hare but a blessing of Kynareth, Lady of the Sky, who brings the first snow down the mountain and sleeps out the summer at the Skyward Shrine, high on the slope north-west of the village. If something has happened to her, the shrine is the place to look. Brynja gave me the old Lightwatch hymn to read on the way.', target: { world: LOCATIONS.skyward_shrine } },
    30: { text: 'The Skyward Shrine is buried in drifts. Someone has been here: there is a sprung snare by the altar, set with the craft of a real trapper. I should search the shrine for anything else.', target: { world: LOCATIONS.skyward_shrine } },
    40: { text: 'By the snare I found a tuft of white fur that glows faintly in the dark, and a trapper\'s tag carved with a name: VARN. The hare was taken alive. I should bring what I found to Brynja.', target: { npc: 'brynja', world: HARE.town } },
    100: { text: 'Brynja knew the name at once: Varn Ice-Eye, a trapper who keeps a camp in the woods west of Wintersmeet and sells pelts to anyone who asks no questions. The fur still glows, she says, so the hare is alive. And where a Kynareth-blessed creature has walked, the snow remembers.', done: true },
  },
};
QUESTS.sq_hare2 = {
  name: 'Tracks in the Snow',
  stages: {
    10: { text: 'Brynja says the hare\'s footprints will still glow where she was carried. A trail of pale blue tracks runs down from the Skyward Shrine toward the woods in the west. I should follow it to Varn Ice-Eye\'s camp.', target: { world: LOCATIONS.varns_camp, npc: 'varn' } },
    20: { text: 'I found Varn Ice-Eye\'s camp: a lean-to hung with pelts, cages, and a man who does not want to talk to me. I need to get the truth out of him one way or another — coin, persuasion, the evidence in my pack, or a blade.', target: { npc: 'varn', world: LOCATIONS.varns_camp } },
    30: { text: 'Varn sold the white hare for a purse of Imperial silver to an old man in a grey Legion cloak, who lives in the abandoned watch-spire on the mountain above Wintersmeet — the Rime Spire. "Winter is the only wall the Daedra can\'t burn," the old man said. I should go up to the spire.', target: { world: LOCATIONS.rime_spire } },
    40: { text: 'I could not get near the Rime Spire. A wall of howling wind circles the tower, so strong it threw me back down the slope like a leaf. That is no natural weather. Brynja may know how to walk through Kynareth\'s wind.', target: { npc: 'brynja', world: HARE.town } },
    100: { text: 'Brynja says the wind around the spire is Kynareth\'s own breath, stolen and turned into a wall. Only a Wind-Charm, braided by the old rite from three gifts of winter, will let me walk through it.', done: true },
  },
};
QUESTS.sq_hare3 = {
  name: 'The Three Gifts',
  stages: {
    10: { text: 'To braid a Wind-Charm, Brynja needs three gifts of winter: heartwood from the Grandfather Fir, the oldest tree on the knoll east of the village (Gunnar knows it); a Glimmerfin, the silver fish that rises under the ice only at night (Erlend fishes the pond); and a Kynareth\'s loaf baked with snowberries (Matilde bakes, but the berries must be picked from the bushes round the frozen pond).', target: { world: HARE.town } },
    20: { text: 'One of the three gifts of winter is in my pack. Two to go.', target: { world: HARE.town } },
    30: { text: 'Two of the three gifts of winter are in my pack. One more.', target: { world: HARE.town } },
    40: { text: 'I have all three gifts of winter: the Grandfather Fir\'s heartwood, a Glimmerfin from under the ice, and Kynareth\'s loaf. Brynja is waiting.', target: { npc: 'brynja', world: HARE.town } },
    100: { text: 'Brynja braided the Wind-Charm by the fire: heartwood for the bones of it, the Glimmerfin\'s silver scales for its voice, and the loaf burned as an offering to the Lady of the Sky. It hums when the wind blows. Now the Rime Spire.', done: true },
  },
};
QUESTS.sq_hare4 = {
  name: 'The Rime Spire',
  stages: {
    10: { text: 'With Kynareth\'s Wind-Charm I can walk through the wall of wind around the Rime Spire, on the mountain north-east of Wintersmeet. The white hare is inside.', target: { world: LOCATIONS.rime_spire, cell: 'rime_spire' } },
    20: { text: 'The Wind-Charm sang and the wind parted around me. The Rime Spire stands open. Inside, the cold is deeper than any winter.', target: { world: LOCATIONS.rime_spire, cell: 'rime_spire' } },
    30: { text: 'The Rime Spire is choked with ice. Walls of it seal the way up, and the tower\'s old braziers stand cold. Fire should melt the ice — a torch, or a Flare spell.', target: { cell: 'rime_spire' } },
    40: { text: 'The ice is melted and the way to the top of the spire is open. Someone is waiting there.', target: { cell: 'rime_spire', npc: 'cassius' } },
    50: { text: 'At the top of the spire, beside a cage of frost holding the white hare, I met Magister Cassius Frey, once a Battlemage of the Imperial Legion. He saw Kvatch burn. He means to bury the north under a winter that never ends, so that Mehrunes Dagon\'s fire can never reach Bruma, Chorrol or Wintersmeet. I have to talk him out of it — or stop him.', target: { cell: 'rime_spire', npc: 'cassius' } },
    60: { text: 'Cassius Frey is dead. The frost around the hare\'s cage is already cracking. I should free her.', target: { cell: 'rime_spire' } },
    70: { text: 'Cassius Frey has let go. He has unsealed the cage and stands back from it as if it might bite. The hare is waiting.', target: { cell: 'rime_spire' } },
    100: { text: 'I opened the cage. The white hare looked at me for a long moment, then went up through the roof of the Rime Spire like a falling star going the wrong way. Outside, the endless snow has stopped.', done: true },
  },
};
QUESTS.sq_hare5 = {
  name: 'Lightwatch',
  stages: {
    10: { text: 'The snow has stopped over Wintersmeet. Sigrun Warmhands will want to hear what happened.', target: { npc: 'sigrun', cell: 'snow_hare', world: HARE.town } },
    20: { text: 'Sigrun has proclaimed a Lightwatch, the old festival of the first snow, for tonight. The whole village will gather at the great fir on the green between seven and eleven in the evening. I am, she says, the guest of honour, and I am not allowed to be late.', target: { world: { x: -180, z: -545 } } },
    100: { text: 'Wintersmeet kept the Lightwatch under a clear sky. Brynja sang the hymn, Matilde handed out sweetrolls, the sky burst into colour, and at the end of it, on the ridge of the Snow Hare\'s roof, a small white hare sat in the moonlight as if she had never been away. The village gave me the Mantle of the First Snow.', done: true },
  },
};

// side quest: A Crown of Starflowers
const HOB = { x: 580, z: 240 };
QUESTS.sq_pup = {
  name: 'A Crown of Starflowers',
  stages: {
    10: { text: 'Hob Furrowfield, a wandering tinker who travels the meadows east of Lake Rumare with his wagon and his dog Honey, has a litter of puppies and one of them has chosen me — it says so, apparently, by chewing my boot. By the old custom of his family, a pup goes to its new home wearing a crown of ten starflowers. His back won\'t let him bend to pick them. The little pale-blue flowers grow all over the meadow around his wagon.', target: { world: HOB } },
    20: { text: 'I have ten starflowers. Hob will weave them into a crown.', target: { npc: 'hob', world: HOB } },
    100: { text: 'Hob wove the starflowers into a crown, put it round the pup\'s neck, and let me give the pup a name. I have a dog. My dog has a crown. Life is good.', done: true },
  },
};

// side quest: Ten White Rabbits
const DEN = { x: 60, z: -520 }, HOLLOW = { x: 205, z: -552 };
QUESTS.sq_bunnies = {
  name: 'Ten White Rabbits',
  stages: {
    5: { text: 'Gunnar Split-Log says there are no snow rabbits in the woods this winter: every snare he sets comes up empty. He saw little goblin footprints in the north-east hills, and a sack that squeaked.', target: { world: DEN } },
    10: { text: 'In the snowy hills north-east of Wintersmeet I found a small goblin named Snikkit, guarding an iron cage with ten white rabbits in it. He does not seem to want to fight. He seems to want to cry.', target: { npc: 'snikkit', world: DEN } },
    20: { text: 'Chief Gorbag Skullsnow of the Frostfang goblins has ordered Snikkit to bring ten white rabbits to Frostfang Hollow for the Moonfeast stew — or go into the pot himself. But Snikkit has named them all. He begged me to help him fool the Chief. I could help him, or take the rabbits from him by force, or try the cage\'s lock while he isn\'t looking.', target: { npc: 'snikkit', world: DEN } },
    30: { text: 'Snikkit\'s plan: a pie that tastes exactly like rabbit stew, with no rabbit in it. Matilde Brindle bakes in Wintersmeet — her Mock Rabbit Pie needs two potatoes, three snowberries and a cut of venison. Snikkit gave me his Mark, a chewed bone that should keep his tribe from stabbing me.', target: { npc: 'matilde', world: { x: -167, z: -553 } } },
    40: { text: 'I have Matilde\'s Mock Rabbit Pie. Now to bring it to Chief Gorbag at Frostfang Hollow, east of Snikkit\'s den, and convince him it is rabbit stew. Snikkit\'s Mark in my pack should keep the Frostfang from attacking — so long as I don\'t give them a reason.', target: { world: HOLLOW, npc: 'gorbag' } },
    50: { text: 'Chief Gorbag ate the entire pie, declared it the finest rabbit stew in the history of the Frostfang, and pardoned Snikkit. I should tell Snikkit he is free — and so are his rabbits.', target: { npc: 'snikkit', world: DEN } },
    55: { text: 'Chief Gorbag Skullsnow is dead, and the Frostfang will not be making demands of anyone for a while. Snikkit is free. I should tell him.', target: { npc: 'snikkit', world: DEN } },
    60: { text: 'Snikkit is dead. His cage key will be on his body; the rabbits are still locked in.', target: { world: DEN } },
    100: { text: 'Snikkit opened the cage, said goodbye to each of his rabbits by name, and watched them bound away into the snow. They are already spreading through the white hills. He gave me his lucky stone, which was, unfortunately, in his mouth.', done: true },
    110: { text: 'I opened the cage, and ten white rabbits bounded away into the snow. They are already spreading through the white hills.', done: true },
  },
};

export class QuestLog {
  constructor() {
    this.stages = {};
    this.log = []; // {quest, stage, text, day}
    this.active = 'mq_amulet';
    this.listeners = [];
  }
  stage(q) { return this.stages[q] || 0; }
  started(q) { return this.stage(q) > 0; }
  done(q) { return !!QUESTS[q].stages[this.stage(q)]?.done; }
  set(q, stage, day = 0) {
    const def = QUESTS[q];
    if (!def || !def.stages[stage]) throw new Error(`Bad quest stage ${q}:${stage}`);
    if (this.stage(q) >= stage) return false;
    this.stages[q] = stage;
    this.log.push({ quest: q, stage, text: def.stages[stage].text, day });
    if (!def.stages[stage].done) this.active = q;
    else if (this.active === q) this.active = Object.keys(this.stages).find((k) => !this.done(k)) || null;
    for (const l of this.listeners) l(q, stage);
    return true;
  }
  current() {
    if (!this.active || this.done(this.active)) return null;
    const q = this.active;
    return { id: q, def: QUESTS[q], stage: this.stage(q), info: QUESTS[q].stages[this.stage(q)] };
  }
  list() {
    return Object.keys(this.stages).map((q) => ({ id: q, def: QUESTS[q], stage: this.stages[q], done: this.done(q) }));
  }
  toJSON() { return { stages: this.stages, log: this.log, active: this.active }; }
  load(o) {
    this.stages = o?.stages || {};
    this.log = o?.log || [];
    this.active = o?.active ?? null;
  }
}
