# Oblivion — a fan-made tribute

A playable, from-scratch browser homage to *The Elder Scrolls IV: Oblivion*, built with Three.js.
Models, foliage, sky, sound effects and music are generated procedurally at runtime. Surface textures are photo-scanned materials from Poly Haven, and loading screens, wall paintings and book plates use public-domain paintings from the National Gallery of Art — all CC0 (see Credits).

Not affiliated with or endorsed by Bethesda Softworks.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run build      # production build in dist/
```

Click the game window to capture the mouse. Press **Esc** to pause.

## Controls

| Key | Action |
| --- | --- |
| W A S D / mouse | Move / look |
| Left click | Attack (hold for a power attack) · hold and release to fire a bow |
| Right click | Block |
| Q | Cast the selected spell |
| E | Activate — talk, open, take, enter, pray, sleep |
| Space | Jump / swim up |
| Shift | Sprint (drains fatigue) |
| C | Toggle sneak |
| R | Ready / sheathe weapon |
| F | First / third person (mouse wheel zooms) |
| Hold V | Swing the camera round to look at yourself from the front |
| U | Level up (when ready): choose an attribute |
| Tab or I | Menus — K character, B magic, M map, J journal |
| T | Wait |
| L | Light / douse your torch |
| 1–8 | Hotkeys — hover an item or spell in the menu and press a number |
| F5 / F9 | Quicksave / quickload |

## What's in it

**World** — a compact Cyrodiil around Lake Rumare: the Imperial City and White-Gold Tower on their island with a walkable bridge, the walled town of Chorrol with its Great Oak, Weynon Priory, burning Kvatch and the **Oblivion Gate** before it, the Ayleid ruin of Vilverin, the Black Road bandit camp, wayshrines, signposts and the Roxey Inn. Day/night cycle with two moons, clouds and stars, animated water, wind-blown grass and trees, shadows and bloom. The sky turns red as you near the Gate.

**The snows and Wintersmeet** — north of Chorrol the land climbs toward the Jerall Mountains and the snow comes down to meet it: drifts that thin to bare rock on the steep faces, frosted pines and boulders, a few straw-pale stalks poking through, crunching footsteps, a cold pale haze, and snow drifting down (rain turns to snowstorms up here). The north road leads up to **Wintersmeet**, a storybook hamlet of seven snow-capped, icicled cottages round a great fir hung with coloured lamps and a star, with wreaths on the doors, fairy-light bunting, snowmen, braziers, a sled and woodpiles, a frozen pond with Erlend's ice-fishing hole, and Matilde's sweetroll stall. **The Snow Hare** inn serves mulled wine by the hearth and rents beds for the night (Sigrun Warmhands; Erlend Ice-Fisher tells tall tales). Wolves hunt the snowy woods. Wintersmeet is on the map and can be fast-travelled to once discovered.

**Side story: *The White Hare*** (five quests, about an hour and a half) — the white hare that sits on the Snow Hare's roof every first snowfall never came this year, and the snow over Wintersmeet won't stop. Follow her glowing tracks from Kynareth's Skyward Shrine to a poacher's camp, gather the three gifts of winter (heartwood from the Grandfather Fir, a Glimmerfin caught through the ice at night, and a snowberry loaf) so Old Brynja can braid a Wind-Charm, walk through the stolen wind around the Rime Spire, melt its ice with fire, and face Cassius Frey, a Kvatch survivor trying to wall the north in endless winter — talk him down three different ways, or fight him. Then keep the Lightwatch with the whole village: sky lanterns, a hymn, fireworks, and a white hare on the roof.

**Chorrol** — a proper walled town of around thirty timber-framed and stone houses, built from a town plan in `src/world/layout.js` (`CHORROL_HOUSES`) and `src/world/chorrol.js`.
- **Houses:** painted shutters, window boxes of flowers, balconies, dormers, shop awnings and signs, and smoking chimneys.
- **Streets:** cobbled avenues and door paths. The Great Oak stands in a flower garden ringed by a hedge and benches.
- **Market:** four stalls of produce, crockery and tools.
- **Lighting:** iron lantern posts that glow at night, and torches along the walls.
- **Gates and castle:** the gates stand open with raised portcullises. Green-and-gold oak banners hang on the towers, gates and castle. Castle Chorrol gains a great tower, battlements, a dressed-stone doorway and braziers.
- **Storybook look:** pastel plaster cottages with tinted tile roofs, painted doors and round gable windows. Climbing roses, hanging flower baskets, doorstep flower pots and little picket-fenced front gardens. Bunting and fairy lights are strung round the plaza and across the avenues, and a tiered fountain stands in the castle forecourt. There are toadstool fairy rings, chickens round a hen coop, and cats. Butterflies come out by day and fireflies at night, and the colour grade is warmer and sunnier inside the walls.
- **Around town:** the Chapel of Stendarr's railed graveyard, washing lines and woodpiles in back gardens, a notice board, a horse trough, and more townsfolk about the streets.

**Interiors** — the Grey Mare inn, Northern Goods and Trade, Weynon House, the Vilverin dungeon and the Sigil Keep; plus the Deadlands beyond the Gate, with lava seas and a Sigil Tower venting fire into the sky.

**Character** — 10 races, 10 classes, 13 birthsigns, 8 attributes and all 21 skills. Skills improve by use, and leveling works like Skyrim's, only gentler: **every** skill increase counts toward your next level (7 for level 2, two more for each level after). When you're ready, press U (or sleep) and choose one attribute to raise by 5; your Health rises by 10 with every level too. The inventory shows a portrait of your character standing in their current gear, with every hat and helmet on (drag it to turn them round).

**Combat & magic** — melee with power attacks, blocking (shields block best), sneak attacks (×3 melee, ×2 bows), archery with draw strength, armour ratings, fatigue. Destruction, Restoration, Alteration, Conjuration, Illusion and Mysticism spells, plus once-a-day birthsign powers. Enemies: wolves, rats, mudcrabs, bandits (melee, archers, hedge wizards), goblins, skeletons, zombies, ghosts, scamps, clannfears and dremora — level-scaled, with summons, guards and fleeing townsfolk.

**Quests** — the main quest runs *Deliver the Amulet* → *Breaking the Siege of Kvatch* (enter the Gate, take the Sigil Stone) → **act two**, roughly another hour:
- *Find the Heir*: rescue Martin from the Daedra-besieged Chapel of Akatosh inside burned Kvatch, then convince him who he is (the Blade's katana is proof, or win his trust) and escort him to Weynon Priory.
- *Weynon Priory*: the Mythic Dawn attack as you arrive, and the Amulet of Kings is stolen.
- *The Path of Dawn*: a Dawn agent meets his contacts under Chorrol's Great Oak, but only between 11 pm and 3 am. Paranoid Glarthir has been keeping a list. Join the cult (robe and book) or kill him for them, then solve the hidden message in Mankar Camoran's *Commentaries*, or ask Martin.
- *Dagon Shrine*: infiltrate Fort Sutch disguised in the cult's robe, sit through Ruma Camoran's sermon, and steal the *Mysterium Xarxes*. Sneak it away unseen, or fight Ruma and her summoned dremora on the way out.

Side quests: *The Jemane Heirloom* (Vilverin) and *Bounty: Black Brugo*.

**Side story: *The Ballad of the Hero*** (about 20 minutes, comedy) — Tillmon Larkspur, a gloriously untalented bard outside the Roxey Inn, is writing a ballad about you. Rescue his lute from Sir Pinchington the Unpleasant, a mudcrab with opinions. Collect rhymes for "Oblivion" from M'aiq, Mirabelle and Glarthir, round up an audience in Chorrol, and attend the premiere at the Grey Mare. Then stay for the last verse. There is a surprise, and there is cheese.

**Side quest: *The Libram of Lesser Wonders*** — Aldous Quillwhistle, a cheerful wizard in a crooked tower in north-west Chorrol, blew three pages out of his spellbook. Pull one out of the Great Oak with Telekinesis, catch Henrietta (a hen who ate one and now glows), and pop a will-o'-the-wisp outside the east gate. He then sells **27 new spells**, each with its own casting gesture and effect: Chain Lightning, Frost Nova, Call Meteor, Acid Spray, Arcane Missiles, Wall of Flame, Thunderclap, Rejuvenation, Sunbeam, Turn Undead, Life Drain, Leap of the Kestrel, Stoneskin, Telekinesis, Blink, Haste, Spectral Wolf, Bound Sword, Bound Flame Blade, Bound Storm Blade, Ghost Knight, Calm, Frenzy, Night-Eye, Festival Fireworks, Mark and Recall, and Reveal.

Every quest — stages, NPCs, locations, choices, rewards and flags — is documented in **[QUESTS.md](QUESTS.md)**.

**Side story: *The Unfinished Map*** (roughly 30–60 minutes) — Ysolde Vane, a dying cartographer at the Grey Mare in Chorrol, hands you the last map drawn by her partner Corvin Ashby, who vanished forty years ago. Follow his three marks: the Hollow Stones in the western hills, the Drowned Bell in the shallows of Lake Rumare (guarded by mudcrabs and a vengeful ghost), and Old Marrow, a hermit in the south-western woods who won't talk without a bottle of Cyrodilic Brandy or a warmer opinion of you. Strike the bellwright's fork on the altar at midnight to open the Ayleid ruin of Nenalatha, solve the pedestal seal and face the Archivist. At the heart of the Hall of Hours you must choose between freeing Corvin and taking the Atlas of Hours, and then decide what to tell Ysolde. There are three endings.

**Wildlife & weather** — deer and does graze the meadows and bolt when you come near. Wolves will hunt them. The weather drifts between clear skies, cloud, overcast, rain, thunderstorms and morning fog, with a rain sound that is muffled indoors.

**Things to find** — scanned props everywhere: barrels, crates, wine racks, goblets, jugs, candlesticks, books, tools, furniture, statues and wall-hung arms. Most small items can be picked up, and taking them from someone's home is theft. There is new food and drink (pears, onions, potatoes, venison, sweetrolls, mead, wines, Cyrodilic Brandy). Harvestable herbs grow along the roads: Somnalius ferns, St. Jahn's Wort, Lady's Mantle and Lady's Smock. Glowing, chiming nirnroot grows on the lake shore. A merchant galleon rides at anchor off a pier below the Sewers exit.

**Graphics** — texture-splatted terrain (grass, dirt, rock, sand, snow, cobblestone) with normal maps and anti-tiling; SpeedTree-style trees built from bark-textured limbs and alpha-tested leaf/needle cards, with wind, fake ambient occlusion and baked impostor LODs for distant forests; dense textured grass and meadow flowers; rigged, motion-captured-style characters (Quaternius base bodies, fantasy outfits, hair and 100+ animation clips: walking, jogging, sword combos, blocking, spellcasting, hit reactions, deaths and zombie shambles, plus idle gestures for townsfolk), retinted per race, with helmets, horns, ears and tails added for guards, daedra, goblins, Khajiit and Argonians; forest-floor undergrowth, fallen logs, stumps, roots and mossy rock outcrops scattered in distance-culled instanced chunks; planar-reflection lake; dynamic sky with lit cumulus, cirrus, two moons and stars; a storybook night of deep violet-indigo skies, four-point twinkling stars, a Milky Way band, a detailed haloed Masser beside Secunda, moonlit purple clouds with silver linings and cool blue mist; procedural firelight for every torch, brazier, campfire and hearth (noise-driven licking flames, flickering glow halos, warm light pools on cobbles and drifting sparks); every class starts with a carried torch (L) held up in the off hand in first and third person, its flame trailing as you move and throwing flickering firelight and sparks around you — it stows your shield, gives way to a drawn bow or a spell, hisses out in water and makes you easier to spot; image-based lighting captured from the sky; aerial-perspective haze, lens flare, bloom and a colour grade. A quality preset (Low → Ultra) and dynamic resolution keep it near 60 fps.

**Side story: *The Lantern in the Wood*** (four quests, about an hour) — Seed-Neeus at Northern Goods and Trade in Chorrol can't sell lamp oil fast enough: something with a lantern walks the woods south of town, and her courier came home white as milk. Find the burned charcoal-burners' clearing, meet a ghost who doesn't know she's dead and is still looking for her little boy, dig into the forest fire of 3E 349, uncover who the boy grew up to be, break into the Gloamwood Barrow to destroy the necromancer who lit the fire, and bring a ninety-one-year-old man to meet his mother at midnight. The reward is Maela's Lantern, a light that never goes out.

**Side quest: *Ten White Rabbits*** — in the snowy hills north-east of Wintersmeet, a tiny, soft-hearted goblin named Snikkit guards a cage of ten white rabbits he has named, one by one, and must deliver to his chieftain for the Moonfeast stew — or go in the pot himself. Help him fool Chief Gorbag Skullsnow with Matilde's Mock Rabbit Pie (carried into the Frostfang goblin camp under Snikkit's Mark), fight him for the key, or pick the cage's lock behind his back. However it goes, white rabbits spread through the snows afterwards. The snow itself now caps every high ridge and peak in the world.

**Side quest: *A Crown of Starflowers*** — on the far side of Lake Rumare, east of the Imperial City, an old tinker named Hob wanders a meadow with his painted wagon, his dog Honey and her three puppies. One pup has chosen you. Pick ten glowing starflowers from the meadow so Hob can weave the crown his family's custom demands, then name your new dog (Biscuit, Bramble, Pip or Sir Woofington). Your dog follows you everywhere, fights beside you, grows up over a few days, and can be petted (and told to stay or come along) with E.

**The Greenheart and Falinor** — deep in the western woods below the mountains stands the **Hollow Elder**, an oak so vast it seems to belong to another country, split at the foot and glowing green-gold inside. Step through and you are in a pocket of Valenwood: graht-oaks a hundred metres tall with buttress roots like walls and moss hanging from their limbs, a roof of leaves so dense the day falls only in shafts, glowing mushrooms among the roots, fireflies and motes in the green air, ferns, fallen giants and a lily pond. At its heart is **Falinor**, a little wood-elf town built around the Great Tree: a ring platform reached by a spiral stair, leaf-roofed pod-houses, paper lanterns, a shrine to Y'ffre, a bowyer's stall and an archery range. Deer and chipmunks roam everywhere.

**Side quest: *The Chipmunk Moot*** — Eranwe Greenfletch, Falinor's bow-master, challenges you to the rite every Bosmer child sits: tag ten chipmunks with blunted arrows in the Tumbling Grove before her two-minute song ends (they are only offended, never harmed). Win, and she teaches you **Summon Spirit Hart**: a deer of green light that follows you into battle and keeps mending your wounds.

**Brinewhistle Cove** — through the Smugglers' Cut, a timbered door in the rocks south of Fort Sutch, a tunnel opens high above a little pirate cove on the Abecean: shacks on stilts, a tavern built from half a ship's stern, a bonfire on the sand, a long pier, a lighthouse on the headland, and the *Indignant Herring*, a pirate ship beached eleven years ago and now the Captain's house. The sea runs to the horizon and you can swim in it.

**Questline: *The Admiral*** (five quests) — the crew of the *Herring* answer to **Admiral Marmalade**, a very fat orange cat in a tiny bicorne, and to Captain Rourke Gallowglass, who loves her more than the sea. Find her when she goes missing (bring a smoked herring); pass her three trials to join the crew (catch a golden sardine at dawn, sit perfectly still for 45 seconds while she sleeps on your lap, and win an insult duel with the Orc bosun); hold the beach when the drowned crew of the ghost ship *Dread Meringue* come out of the night fog and steal her; row out to the ghost ship with the Captain and settle things with Mother Brisk (three endings, one involving a very shy ghost cat); then come home for Naming Night, and a kitten of your own. Rewards include **Purrsuit**, a cutlass whose strikes startle foes into running.

**Questline: *The Hollow King*** (the Mages Guild, five quests) — the Chorrol Guild hall has been sealed for nine days, and Teekeeus is selling spells in the rain. Carry a ward-token inside and relight the three Warding Lamps in the founders' order to wake the Founders' Flame in the frozen scrying pool, and learn why it has burned for four hundred years: Severin Ashgrave, the Chapter's first Magister, made himself a lich and was sealed under the Jerall Mountains with his soul split into three Hearts. Follow a missing apprentice to a ruined observatory in the snow; race him to the three Hearts (in the Rime Spire, in Vilverin, and in the goblins' stew-cooler at Frostfang Hollow) and break them in the Founders' Ember; open the Hollow Gate with the Magister's rite while the dead climb out of the snow; meet the boy on the Bone Stair (save him, win him over, or fight him); and end the Hollow King on his throne of black ice, with his ward-pillars, his Bone Knights and his very polite offer. Rewards: the Founders' Ember (a lantern the dead fear), **Sunbolt**, the **Crown of the Hollow King**, Summon Bone Knight, and the rank of Magister with your own study. Associates can buy the Guild's own spells from Merle: **Starfall**, **Founders' Light**, **Hollow Step**, **Founders' Ward**, and, for the Magister, the lich's **Ring of Rime**.

**Quest guide** — [QUEST_GUIDE.md](QUEST_GUIDE.md) lists every quest, how to start it, and every stage of it.

**Pets** — your dog (from *A Crown of Starflowers*) and your kitten follow you through every door, into every place, on fast travel and across saves. They can't be killed, only knocked down for a moment. Pet them to tell them to stay or come along.

**Legendary arms** — five unique swords rest point-down in rune-ringed stone pedestals under columns of coloured light, and three unique armour sets stand on display deep in the dungeons. Every piece is sculpted onto the skeleton and has its own living effects.
- **Sunfall** (on the rise behind the Wayshrine of Akatosh): a broad golden blade with a white-hot core and a sunburst guard; fire damage, doubled against the undead.
- **Starfang** (in the starflower meadow east of the lake): a midnight sabre with a glowing moon-edge and five twinkling stars caught in its curve; now and then a star falls on what it strikes.
- **Winter's Edge** (on a ridge in the Jerall foothills): a jagged blade of clear ice; frost that slows.
- **Verdant Thorn** (deep in the Great Forest): a blade wound with a flowering vine; poison and life-drain, and it drifts petals.
- **Voidreaver** (in the ashes of Kvatch): a serrated, hooked Daedric cleaver veined with red light; it drinks health and magicka and trails smoke.
- **Starwarden Plate** (Nenalatha): midnight enamel and gold, a crescent-moon crest, a glowing visor and a cape cut from the night sky.
- **Emberforge Armour** (the Gloamwood Barrow): blackened steel split by molten seams, a ram-horned helm with burning eyes, a tattered war-cloak, rising embers.
- **Frostbloom Raiment** (the Rime Spire): silver scale and white fur, ice crystals growing from the shoulders, a crown of ice, drifting snowflakes.

**Magic** — every elemental spell has its own look, in the storybook-night style of the sky: bolts carry a hot core inside a turning four-point star glint, fire trails a comet's tail of flame and chunky pixel embers and bursts into a crown of real flames; frost tumbles out snowflakes and shatters into ice shards under a spinning flake; lightning crackles with forking arcs and spits pixel sparks and star flickers that keep twinkling where it struck. The casting hand gathers the element (a flame, a snowflake or a ball of arcs) before it flies. Mages, Battlemages and Spellswords can conjure a **Bound Flame Blade** (sets foes burning) or a **Bound Storm Blade** (lightning leaps to a second foe), animated blades that light up the world around you; both are also sold among Aldous Quillwhistle's Wonders.

**Magicka** regenerates three times faster than in Oblivion, so magic is something you use, not ration.

**Money** — you start with 25 gold and earn more from loot, chests, selling to merchants, and quests: every quest you finish pays 100 gold on top of its own reward. Wildflowers (Starflower, St. Jahn's Wort, Lady's Mantle, Lady's Smock, Columbine Root) trade for a flat 20 gold each, and every spell in every shop (Teekeeus in Chorrol, and Aldous's Wonders) costs a flat 40 gold.

**Systems** — topic-based dialogue with disposition, a persuasion mini-game and bribes; barter and a spell merchant; lockpicking mini-game; containers and theft; crime, bounty and guards ("Stop right there, criminal scum!") with fines, jail or resisting arrest; renting rooms; wait/sleep; compass with quest markers; parchment map with fast travel; journal; save/load (localStorage); generative music that shifts for combat, night, dungeons and Oblivion.

## Code layout

```
src/
  game.js            game loop, cells, time, lighting, crime, saving, activation
  player.js          movement physics, combat, magic, equipment
  viewmodel.js       first-person arms and weapons
  combat.js          hostility, damage pipeline, projectiles
  admiral.js         the Brinewhistle Cove questline (mixed into game)
  guild.js           the Mages Guild questline, The Hollow King (mixed into game)
  audio.js           synthesized SFX and generative music
  actors/            character kit (rigged CC0 models + clip state machine), procedural fallbacks, AI
  data/              rules (stats), items, spells, actors, dialogue, quests
  world/             terrain, sky, weather, water, vegetation, props & scatter, architecture, interiors,
                     quest sites, the Deadlands, the Greenheart, Brinewhistle Cove
  ui/ui.js           HUD, compass, menus, dialogue, barter, lockpicking, screens
tests/               Vitest unit tests for rules, collision, data integrity and world layout
```

## Credits

- **Paintings** — National Gallery of Art, Washington, Open Access (CC0): Thomas Cole, Claude Lorrain, Meindert Hobbema, Jacob van Ruisdael, Camille Corot, Albert Bierstadt, Caspar David Friedrich, J. M. W. Turner, John Martin, Jasper Cropsey, Hubert Robert, Rembrandt, Holbein, Memling, El Greco and others. The full list (title, artist, date) is in `src/data/art.js` and on the in-game Credits screen. Images live in `public/art/`.
- **Textures** — Poly Haven (polyhaven.com), CC0. Asset ids are listed in `src/world/photoTextures.js`; files live in `public/textures/`. If any are missing the game falls back to procedural textures.
- **3D props** — Poly Haven (polyhaven.com), CC0: furniture, barrels, crates, tableware, tools, statues, plants, rocks, logs and the *Dutch ship*. They are optimized with glTF-Transform (meshopt geometry and WebP textures) into `public/models/`, and the ids are listed in `src/world/props.js`. Missing models fall back to simple shapes.
- **Characters & animation** — Quaternius (quaternius.com), CC0: *Universal Base Characters*, *Modular Character Outfits – Fantasy* and *Universal Animation Library* 1 & 2, in `public/characters/`. If they fail to load, the game uses its procedural characters instead.
