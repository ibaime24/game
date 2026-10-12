// Dialogue: greetings and topics for each NPC. Topic handlers may advance quests.
// Each topic: { id, label, show?(g, npc), say(g, npc) -> string }

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const RUMORS = [
  'I saw a mudcrab the other day. Horrible creatures.',
  'They say the Emperor and all three of his sons were murdered on the same night. Who could do such a thing?',
  'There are whispers of a cult — the Mythic Dawn. They say they worship a Daedric Prince.',
  'Refugees from Kvatch keep pouring through the gates. They talk of a great burning door, and monsters walking out of it.',
  'The Ayleid ruins are full of welkynd stones. Worth a fortune — if the dead don\'t get you first.',
  'Bandits on the Black Road again. Someone ought to do something about Black Brugo.',
  'The Great Oak has stood in Chorrol longer than anyone can remember. As long as it stands, so does the town.',
  'Did you hear? The Elder Council has sealed the Imperial City. Nobody in, nobody out.',
  'I hear a Khajiit has been wandering the roads telling everyone the most outrageous stories.',
  'If you need supplies, Seed-Neeus at Northern Goods and Trade will treat you fairly. She\'s good people.',
  'There\'s an old woman wasting away upstairs at the Grey Mare. Used to draw maps for the Emperor, they say. Asks every traveller the same question.',
  'Nobody takes the south road after dark any more. There\'s a light that walks in the woods south of town, they say — a woman with a lantern, calling a name.',
  'Fishermen won\'t go near the south-west shallows. There was a chapel there once, before the lake took it. Some nights you can still hear the bell.',
];

// who in Chorrol can be talked into the premiere, and how they take it
const INVITEES = {
  reynald: 'A ballad? About the Hero of Kvatch? ...You ARE the Hero of Kvatch. And you\'re inviting people to a song about yourself. That\'s either very brave or very sad. I\'ll come. I want to see which.',
  laythe: 'Oh, I love a bard! The last one who came through Chorrol was so handsome. He couldn\'t sing either. I\'ll bring a cushion.',
  valus: 'Is there food? ...There\'s food. All right. I\'ll sit at the back, near the food.',
  dar_jee: 'Dar Jee has heard Breton bards before. Dar Jee has also been stabbed. Dar Jee will compare the two experiences. Yes. Dar Jee comes.',
  teekeeus: 'Teekeeus has studied the effect of music on the mind. Mostly it is bad. Teekeeus will come for research. Teekeeus will bring notes. And earplugs.',
};

const generic = [
  { id: 'rumors', label: 'Rumors', say: () => pick(RUMORS) },
];

const mainTopics = [
  { id: 'kvatch', label: 'Kvatch', show: (g) => g.quests.started('mq_gate') && !g.quests.done('mq_gate'),
    say: () => 'Kvatch is gone. Burned to the ground by the Daedra. The survivors are camped below the walls — what\'s left of them.' },
  { id: 'gate', label: 'Oblivion Gates', show: (g) => g.quests.started('mq_gate'),
    say: (g) => g.flags.gateClosed ? 'They say someone walked into the gate before Kvatch and shut it from the inside! Can you imagine?' : 'A door into Oblivion itself, right outside Kvatch. I pray to the Nine they don\'t open one here.' },
];

export const DIALOGUE = {
  citizen: {
    greeting: (g, npc) => pick([
      'Yes? What do you want?', 'Good day to you.', 'Can I help you with something?',
      g.player.ch.race === 'khajiit' ? 'Keep your paws where I can see them, cat.' : 'Fine weather we\'re having.',
      'Stay out of trouble, stranger.',
    ]),
    topics: [...generic, ...mainTopics,
      { id: 'invite', label: "Tillmon's premiere", show: (g, npc) => g.quests.stage('sq_bard') === 50 && INVITEES[npc.uid] && !g.flags['invited_' + npc.uid],
        say: (g, npc) => { g.flags['invited_' + npc.uid] = true; g.bardInvited(npc.uid); return INVITEES[npc.uid]; } },
      { id: 'chorrol', label: 'Chorrol', say: () => 'Chorrol is a fine town. Quiet. The Countess Arriana Valga keeps the guard sharp, and the Great Oak keeps watch over us all.' },
    ],
  },
  guard: {
    greeting: (g) => g.crime.bounty > 0 ? 'Watch yourself, criminal.' : pick(['Citizen.', 'Move along.', 'Keep your weapon sheathed in town.', 'Stay out of trouble, and you won\'t get any.']),
    topics: [...generic, ...mainTopics,
      { id: 'crime', label: 'Crime', say: (g) => g.crime.bounty > 0 ? `You have a bounty of ${g.crime.bounty} gold on your head. Pay it to any guard.` : 'Chorrol is a law-abiding town. Let\'s keep it that way.' },
    ],
  },
  soldier: {
    greeting: () => pick(['We hold the line, for Kvatch!', 'Stay back from the gate, civilian.', 'Another one of those things came out an hour ago. We barely put it down.']),
    topics: [...generic, ...mainTopics],
  },
  captain: {
    greeting: (g) => g.quests.stage('ms_bounty') === 20 ? 'Well? Is Brugo dead?' : 'Captain Peneles, Chorrol Guard. Speak quickly, I\'m busy.',
    topics: [...generic, ...mainTopics,
      { id: 'brugo', label: 'Black Brugo', show: (g) => !g.quests.done('ms_bounty'),
        say: (g) => {
          const st = g.quests.stage('ms_bounty');
          if (st === 0) {
            g.quests.set('ms_bounty', 10, g.day());
            g.giveItem('bounty_letter', 1);
            return 'Black Brugo. An Orc bandit chief camped out on the Black Road, east of the lake. He and his cutthroats have killed six travellers this month. I can\'t spare the men to root him out. Bring me proof of his death and the Countess will pay you 300 septims. Here — the bounty notice.';
          }
          if (st === 10) return 'His camp is along the Black Road, northeast of the Imperial City. Look for the palisade. Bring me proof he\'s dead.';
          if (st === 20 && g.player.inventory.has('brugo_head')) {
            g.takeItem('brugo_head', 1);
            g.takeItem('bounty_letter', 1);
            g.giveItem('gold', 300);
            g.giveItem('steel_helmet', 1);
            g.quests.set('ms_bounty', 100, g.day());
            return 'Brugo\'s ring! You actually did it. Here\'s your 300 septims — and take this helmet from the armory, with the Countess\'s thanks. You\'d make a fine guard, if you ever want the work.';
          }
          return 'Where\'s the proof? No proof, no bounty.';
        } },
      { id: 'crime', label: 'Crime', say: (g) => g.crime.bounty > 0 ? `There is a ${g.crime.bounty} gold bounty on your head. Don't make me collect it.` : 'Keep your nose clean and we\'ll get along.' },
    ],
  },
  reynald: {
    greeting: (g) => g.quests.stage('ms_heirloom') === 100 ? 'My friend! Grandfather\'s blade hangs above my hearth now, thanks to you.' : 'Reynald Jemane, at your service. And no, I don\'t have a twin brother, before you ask.',
    topics: [...generic, ...mainTopics,
      { id: 'invite', label: "Tillmon's premiere", show: (g, npc) => g.quests.stage('sq_bard') === 50 && INVITEES[npc.uid] && !g.flags['invited_' + npc.uid],
        say: (g, npc) => { g.flags['invited_' + npc.uid] = true; g.bardInvited(npc.uid); return INVITEES[npc.uid]; } },
      { id: 'heirloom', label: 'Jemane Heirloom', show: (g) => !g.quests.done('ms_heirloom'),
        say: (g) => {
          const st = g.quests.stage('ms_heirloom');
          if (st === 0) {
            g.quests.set('ms_heirloom', 10, g.day());
            return 'My grandfather was an adventurer — a foolish one. He went into the Ayleid ruin of Vilverin forty years ago and never came out. The Jemane blade went with him. I\'m no fighter, but you look capable. Bring that sword home and I\'ll pay you 200 gold. Vilverin lies east of the old sewer exit, near the lake. Beware: they say a dead knight still guards its deepest vault.';
          }
          if (g.player.inventory.has('jemane_blade')) {
            g.takeItem('jemane_blade', 1);
            g.giveItem('gold', 200);
            g.giveItem('potion_health', 2);
            if (st < 20) g.quests.set('ms_heirloom', 20, g.day());
            g.quests.set('ms_heirloom', 100, g.day());
            return 'By the Nine... grandfather\'s sword! I never thought I\'d see it. Here, 200 gold as promised, and some potions — you look like you\'ve earned them. Thank you, truly.';
          }
          return 'The blade is somewhere in Vilverin, east of the old sewer exit. Please hurry — and come back alive.';
        } },
    ],
  },
  teekeeus: {
    greeting: () => 'Teekeeus of the Mages Guild. If you have coin, Teekeeus has spells.',
    topics: [...generic, ...mainTopics,
      { id: 'invite', label: "Tillmon's premiere", show: (g, npc) => g.quests.stage('sq_bard') === 50 && INVITEES[npc.uid] && !g.flags['invited_' + npc.uid],
        say: (g, npc) => { g.flags['invited_' + npc.uid] = true; g.bardInvited(npc.uid); return INVITEES[npc.uid]; } },
      { id: 'magic', label: 'Magic', say: () => 'Every spell belongs to a school. Destruction, Restoration, Alteration, Conjuration, Illusion, Mysticism. Cast them and you will grow stronger in that school. Novice spells first — you cannot cast what you do not understand.' },
    ],
  },
  innkeeper: {
    greeting: () => 'Welcome to the Grey Mare! Food, drink, a bed for the night — what\'ll it be?',
    topics: [...generic, ...mainTopics,
      { id: 'ysolde_rumor', label: 'Ysolde Vane', show: (g) => !g.flags.ysoldeGone,
        say: () => 'Poor Ysolde. Drew half the maps in the Imperial library, they say, and now she can\'t climb the stairs. She\'s waiting on someone, I think. Asks every traveller if they\'ve been to the hills west of here. Be kind to her.' },
      { id: 'greymare', label: 'Grey Mare', say: () => 'Best inn in Chorrol. Well, the only one that\'ll let a Nord run it. A room is 10 gold a night.' },
      { id: 'corwyn_fire', label: 'The Corwyn fire', show: (g) => g.quests.started('sq_ashes') && g.quests.stage('sq_ashes') < 30,
        say: (g) => {
          if (!g.player.inventory.has('tams_slate')) return 'The Corwyn fire? Before my time, and before my mother\'s. My grandmother told it: the autumn of \'49 half the Great Forest burned, south of the walls. The charcoal-burners, Osric and Maela, died in it, and their little boy with them, they said, though nobody ever found him. Woodcutters built cairns for the two they found. Nobody\'s lived out there since.\n\nWhy? Is this about Bram and his lantern lady? *She lowers her voice.* My grandmother said the fire started in the wrong place. West of the kilns, where nothing was lit. She never said what she meant by it.';
          g.quests.set('sq_ashes', 30, g.day());
          return '*She reads the slate twice, then sets it down very carefully on the bar.* "Gone for help." Oh, the poor lamb.\n\nWait. Wait — my grandmother told this part too, and I never put the two together. That same autumn old Marcus Bruiant came back from a wine run to Skingrad with a boy in the back of his wagon. Found him half-dead in a ditch on the south road, covered in soot. The child didn\'t speak a word for a year, and the Bruiants raised him as their own.\n\n*She looks past you, into the corner of the common room, where a very old man sits with a cup of wine he never drinks.*\n\nThat\'s Rimalus. Rimalus Bruiant. He\'s been sitting in that chair since before I was born.';
        } },
    ],
  },
  innkeeper_roxey: {
    greeting: () => 'Welcome, traveller! The common room\'s full of poor souls from Kvatch, but I can sell you some food for the road.',
    topics: [...generic, ...mainTopics,
      { id: 'rhyme', label: 'A rhyme for "Oblivion"', show: (g) => g.quests.stage('sq_bard') === 30 && !g.flags.rhymeMirabelle,
        say: (g) => { g.flags.rhymeMirabelle = true; g.bardRhymeFound(); return '*She sighs the sigh of a woman who has heard the same lute for nine nights.* "Sad civilian." That\'s me. I\'m the sad civilian. Tell him that\'s my rhyme and that if he plays the bit about the sewers again before breakfast, I\'m putting turnips in his bed.'; } },
      { id: 'tillmon', label: 'Tillmon Larkspur', show: (g) => !g.flags.bardRevealed,
        say: () => 'Tillmon? He arrived a fortnight ago, paid for a month in cheese — actual cheese, a whole wheel — and has been singing at my geese ever since. The geese have left. I\'d leave too, if it weren\'t my inn.' },
    ],
  },
  merchant: {
    greeting: () => 'Welcome to Northern Goods and Trade. Seed-Neeus sells only quality wares.',
    topics: [...generic, ...mainTopics,
      { id: 'goods', label: 'Northern Goods', say: () => 'Weapons, armor, potions, lockpicks. Seed-Neeus buys what adventurers find, too — at a fair price.' },
    ],
  },
  maborel: {
    greeting: () => 'Peace of the Nine be with you. I am Prior Maborel.',
    topics: [...generic, ...mainTopics,
      { id: 'jauffre', label: 'Jauffre', say: () => 'Brother Jauffre? You will find him inside Weynon House, at his desk as always.' },
    ],
  },
  jauffre: {
    greeting: (g) => {
      if (!g.quests.done('mq_amulet')) return 'I am Jauffre. What brings you to Weynon Priory?';
      if (g.quests.stage('mq_priory') === 20) return 'You. Thank the Nine. Come in — bar the door behind you.';
      if (g.quests.stage('mq_shrine') === 100) return 'Martin has barely slept since you brought him that book. Neither have I.';
      if (g.quests.stage('mq_gate') === 100) return 'Welcome back, Hero of Kvatch. The Blades are in your debt.';
      return 'Have you news from Kvatch?';
    },
    topics: [...generic,
      { id: 'amulet', label: 'Amulet of Kings', show: (g) => !g.quests.done('mq_amulet'),
        say: (g) => {
          if (!g.player.inventory.has('amulet_of_kings')) return 'The Amulet of Kings? Do not speak of it lightly. Unless you have it with you, we have nothing to discuss.';
          g.takeItem('amulet_of_kings', 1);
          g.quests.set('mq_amulet', 100, g.day());
          g.quests.set('mq_gate', 10, g.day());
          g.giveItem('gold', 100);
          g.giveItem('potion_health', 2);
          return 'The Amulet of Kings! Then Uriel Septim is dead, and the Blades have failed him. ... He trusted you with this. I will trust you too. The Emperor\'s last heir lives — I will see to him. But there is something more urgent. Word came this morning: an Oblivion Gate has opened before the city of Kvatch. The city is burning. If the Gate is not closed, more will follow. Find Captain Savlian Matius at the siege camp southwest of here. Take this gold and these potions. Go, and may Talos guide you.';
        } },
      { id: 'heir_late', label: 'The Emperor\'s heir', show: (g) => g.quests.done('mq_gate') && !g.quests.started('mq_heir'),
        say: (g) => {
          g.quests.set('mq_heir', 10, g.day());
          g.flags.chapelOpen = true;
          return 'I have kept something from you. The Emperor had a son — Martin, born out of wedlock and hidden from the Elder Council. For twenty years he has been a priest of Akatosh in Kvatch. Savlian\'s men say survivors are still holed up in the Chapel of Akatosh, inside the walls. If Martin lives, he is there. Find him, and bring him here.';
        } },
      { id: 'heir', label: 'Martin', show: (g) => g.quests.started('mq_heir') && g.quests.stage('mq_heir') < 100,
        say: (g) => g.quests.stage('mq_heir') >= 40 ? 'You found him? Then bring him here, quickly. Every hour he spends on the road is an hour the Mythic Dawn could find him.' : 'The Chapel of Akatosh, inside Kvatch\'s walls. Martin will not know who he is — the Emperor wanted it so. He may not believe you. Make him.' },
      { id: 'attack', label: 'The attack', show: (g) => g.quests.stage('mq_priory') === 20,
        say: (g) => {
          g.quests.set('mq_priory', 30, g.day());
          g.flags.martinAtPriory = true;
          const m = g.cell.actors.find((a) => a.uid === 'martin');
          if (m) { m.following = false; m.state = 'idle'; m.def.stationary = true; g.flags.martinFollowing = false; }
          return 'They came over the wall at noon, dressed as pilgrims. Prior Maborel saw the knives too late. Brother Piner is dead. And— *he sits down heavily* —the Amulet of Kings is gone. I kept it here, in the chest by my desk. I thought no one would think to look in a priory.\n\nThis is Martin? *He stands and bows, stiffly.* Your Highness. Forgive the welcome.\n\nThose were Mythic Dawn. They knew exactly what they were looking for, and they knew Martin might be here. Search their bodies. If they carried anything — orders, a token, anything — I need to see it. Martin will stay with me. No one gets through that door again.';
        } },
      { id: 'orders', label: 'Mythic Dawn orders', show: (g) => g.quests.stage('mq_priory') === 30 && g.player.inventory.has('dawn_orders'),
        say: (g) => {
          g.quests.set('mq_priory', 100, g.day());
          g.quests.set('mq_dawn', 10, g.day());
          return '"The Master has the chain." *He reads it twice.* Then the Amulet is already beyond our reach — unless we find this Master.\n\n"Our brother waits beneath the Great Oak when the night is deepest." In Chorrol. Under the eyes of the Countess\'s own guard. Bold.\n\nFind this brother. Follow him, buy him, break him — I don\'t care which. The Mythic Dawn have a shrine somewhere, and we need to know where. Someone in Chorrol must have noticed a stranger at the Oak at night. Ask around.';
        } },
      { id: 'commentaries', label: 'The Commentaries', show: (g) => g.quests.stage('mq_dawn') >= 20 && g.quests.stage('mq_dawn') < 40,
        say: () => 'Mankar Camoran\'s Commentaries. I\'ve heard of them; I\'ve never read them, and I would rather not start. Show them to Martin. He\'s a scholar — and if half of what I suspect about his youth is true, he knows the Daedra better than any priest should.' },
      { id: 'gate', label: 'Oblivion Gate', show: (g) => g.quests.started('mq_gate') && g.quests.stage('mq_gate') < 50,
        say: (g) => g.flags.gateClosed ? 'You closed it? Then speak to Savlian Matius — and come back to me.' : 'The Gate stands before Kvatch, southwest along the road past the Wayshrine of Dibella. Captain Matius holds a camp below it. Be careful. No one who has entered a Gate has returned.' },
      { id: 'kvatch', label: 'Kvatch', show: (g) => g.quests.stage('mq_gate') === 50,
        say: (g) => {
          g.quests.set('mq_gate', 100, g.day());
          g.giveItem('akaviri_katana', 1);
          g.giveItem('gold', 500);
          g.quests.set('mq_heir', 10, g.day());
          g.flags.chapelOpen = true;
          return 'You walked into Oblivion and came back with a Sigil Stone. Talos preserve us — I had begun to think no one could. Take this katana. It belonged to a Blade who fell at the Emperor\'s side.\n\nAnd now I owe you the truth I kept back when you first came. The Emperor had a son. Not one of the princes — another, born out of wedlock and hidden even from the Elder Council. Only the Blades knew. His name is Martin, and for twenty years he has been a priest of Akatosh... in Kvatch.\n\nYou see why my blood ran cold when the messenger came. Savlian\'s men say a handful of survivors are still holed up in the Chapel of Akatosh, inside the walls. If Martin is alive, he is there. Find him. Bring him here. Without a Septim on the throne, the Dragonfires will never be lit again — and every gate in Tamriel will open.';
        } },
    ],
  },
  savlian: {
    greeting: (g) => {
      const st = g.quests.stage('mq_gate');
      if (st >= 40) return 'You... you closed it! I saw the Gate collapse with my own eyes!';
      return 'Captain Savlian Matius, Kvatch City Guard. What\'s left of it. Turn back, civilian — this is no place for you.';
    },
    topics: [...generic,
      { id: 'gate', label: 'Oblivion Gate', show: (g) => g.quests.started('mq_gate'),
        say: (g) => {
          const st = g.quests.stage('mq_gate');
          if (st === 10) {
            g.quests.set('mq_gate', 20, g.day());
            return 'Jauffre sent you? Then you know what we face. That Gate opened two nights ago, and the Daedra came through in a flood. Kvatch fell before dawn. We\'ve learned one thing: the Gate is anchored by something on the other side — a Sigil Stone, in a tower. Take it, and the Gate closes. I\'ve sent men in. None came back. If you\'re willing... the Gate is right there. We\'ll hold this side.';
          }
          if (st === 20 || st === 30) return 'Go through the Gate, find the tower, take the Sigil Stone. Simple to say. May the Nine be with you.';
          if (st === 40) {
            g.quests.set('mq_gate', 50, g.day());
            g.giveItem('steel_shield', 1);
            g.giveItem('potion_health', 3);
            return 'By Akatosh, you did it! The Gate is gone! Kvatch owes you a debt we can never repay. Take this shield — it was mine, and I can think of no better hands for it. Go and tell Jauffre: Kvatch still stands, in spirit if not in stone.';
          }
          return 'Kvatch will rebuild. Thanks to you.';
        } },
      { id: 'chapel', label: 'Chapel of Akatosh', show: (g) => g.quests.started('mq_heir') && g.quests.stage('mq_heir') < 40,
        say: () => 'The chapel? A few of ours got inside when the walls fell — the Earl\'s cousin, a priest, some townsfolk. We hear them ringing the bell at night so we know they\'re alive. The Daedra still prowl inside the walls. Go in through the breach on the north side and head for the steeple. Gods go with you.' },
      ...mainTopics.filter((t) => t.id === 'kvatch'),
    ],
  },
  maiq: {
    greeting: () => 'M\'aiq knows much, tells some. M\'aiq knows many things others do not.',
    topics: [
      { id: 'rhyme', label: 'A rhyme for "Oblivion"', show: (g) => g.quests.stage('sq_bard') === 30 && !g.flags.rhymeMaiq,
        say: (g) => { g.flags.rhymeMaiq = true; g.bardRhymeFound(); return 'A rhyme? For Oblivion? *He thinks very hard.* "Trivial bun." M\'aiq is very proud of this one. M\'aiq has been saving it for many years, for exactly this moment. Tell the bard M\'aiq wants no credit. Only a small statue.'; } },

      { id: 'maiq', label: 'M\'aiq the Liar', say: () => pick([
        'M\'aiq has heard that some people can walk through walls. M\'aiq has never seen this, but M\'aiq tries anyway. It hurts.',
        'Mudcrabs are terrible creatures, yes? M\'aiq thinks they plot against us. Quietly. With their claws.',
        'Some say there is a land of snow to the north, with dragons. M\'aiq thinks dragons are a story for kittens. Probably.',
        'M\'aiq once held a conversation with a guard about the weather that lasted three days. The guard is still talking.',
        'Why do people stand so close when they talk? M\'aiq likes to keep a good distance. Perhaps one arm.',
        'M\'aiq has heard of a hero who closes the gates to Oblivion with his bare hands. M\'aiq prefers doors with handles.',
        'People always want to know what M\'aiq is carrying. M\'aiq carries two things: nothing, and opinions.',
        'Horses? M\'aiq does not ride horses. M\'aiq walks. Horses are for people in a hurry to leave M\'aiq.',
      ]) },
      ...generic,
    ],
  },
  glarthir: {
    greeting: () => 'Shh! Not so loud! They\'re watching. They\'re always watching.',
    topics: [...generic,
      { id: 'rhyme', label: 'A rhyme for "Oblivion"', show: (g) => g.quests.stage('sq_bard') === 30 && !g.flags.rhymeGlarthir,
        say: (g) => { g.flags.rhymeGlarthir = true; g.bardRhymeFound(); return 'A rhyme? Why do you want a rhyme? Who sent you? ... A bard. Of course. They\'re the worst kind of spy; they write everything DOWN. Fine. "Grim Vivian." There\'s a Vivian in Chorrol. She\'s very grim. She waters her plants at midnight. Put HER in your song and see how she likes it.'; } },
      { id: 'hooded', label: 'A stranger at the Oak', show: (g) => g.quests.stage('mq_dawn') === 10,
        say: (g) => {
          g.quests.set('mq_dawn', 15, g.day());
          return '*He freezes, then grabs your sleeve.* You see him too? Nobody believes me! Nobody!\n\n*He produces a much-folded paper covered in tiny writing.* Hooded man. Imperial, I think — good boots, too good for a pilgrim. Stands under the Great Oak every night from eleven o\'clock until three, looking at nothing. Then he leaves by the east gate. I\'ve written it down. Eighteen nights in a row. The guards laughed at me.\n\nYou won\'t tell him I told you? You won\'t tell ANYONE? ...Why are you smiling?';
        } },
      { id: 'watching', label: 'Watching?', say: () => pick([
        'Everyone in this town is in on it. Ask anyone — no, don\'t ask anyone! That\'s exactly what they want.',
        'The guards? Especially the guards. Haven\'t you noticed how they never stop walking around?',
        'I keep a list. Names. Times. Who looked at the Great Oak, and for how long. You\'re on it now. Sorry.',
      ]) },
    ],
  },
};

// ---------------------------------------------------------------- The Unfinished Map
const NEAR = (g, id, r = 7) => g.cell.actors.find((a) => a.uid === id && !a.dead && a.pos.distanceTo(g.player.pos) < r);

DIALOGUE.ysolde = {
  greeting: (g) => {
    const st = g.quests.stage('sq_map');
    if (st === 0) return '*cough* Forgive me. The healers call it the grey wasting. I call it being old. You have road dust on your boots — sit a moment, if you can spare it.';
    if (st === 80 && NEAR(g, 'corvin')) return '...';
    if (st >= 80) return 'You\'re back. *She grips the table edge.* Tell me. Please.';
    return pick(['Any word of Corvin? *cough* Take your time. I have... a little left.', 'Did you find the stones? He loved those stones.', 'Read the map from the beginning. He always said I skipped to the end.']);
  },
  topics: [
    { id: 'map', label: "Corvin's Map", show: (g) => g.quests.stage('sq_map') < 80,
      say: (g) => {
        const st = g.quests.stage('sq_map');
        if (st === 0) {
          g.quests.set('sq_map', 10, g.day());
          g.giveItem('unfinished_map', 1);
          g.giveItem('gold', 50);
          return 'Forty years ago Corvin Ashby and I were the Emperor\'s cartographers. We mapped every stone of the Heartland together. Then he found something no map had ever shown — an Ayleid city that kept time the way a purse keeps coin. Nenalatha. He went looking for it one autumn, and he never came back.\n\nThis is his last map. Three marks in his hand: a ring of stones in the hills west of Chorrol, a bell in the waters of Lake Rumare, and a tree with an eye. I never had the courage to follow them. Now I haven\'t the time. Will you? I don\'t want treasure. I want to know. Here — fifty septims, for the road. It\'s most of what I have.';
        }
        if (st < 50) return 'Follow the marks in order: the stones, then the bell, then the tree. Corvin always said a map is a story — you have to read it from the beginning.';
        return 'You found the door? *Her hand is shaking.* Then go in. Whatever is in there... I need to know.';
      } },
    { id: 'corvin', label: 'Corvin', show: (g) => g.quests.started('sq_map') && g.quests.stage('sq_map') < 80,
      say: () => 'He laughed at everything, even the rain. He could draw a coastline from memory after sailing past it once. I loved him, and I envied him, and for forty years I have not been able to tell you which of those was louder.' },
    { id: 'page', label: 'The journal page', show: (g) => g.player.inventory.has('ysolde_page') && g.quests.stage('sq_map') < 80 && !g.flags.ysoldeAdmitted,
      say: (g) => {
        g.flags.ysoldeAdmitted = true;
        return '*She reads it without touching it. A long silence.*\n\nYes. It\'s my hand. I was at the stones the night he went in, and at the bell the morning after. I threw the fork into the water so I could never go back. I told myself it was to keep anyone from following him. It was so that no one would ever know what I had done.\n\nPlease. Keep going. Find him — find what\'s left of him. Then I will tell you all of it. I swear it on every map I ever signed.';
      } },
    { id: 'reunion', label: 'Corvin is here', show: (g) => g.quests.stage('sq_map') === 80 && !!NEAR(g, 'corvin', 9),
      say: (g) => {
        g.finishUnfinishedMap('reunion');
        return 'Corvin? *The cup slips from her fingers and rolls across the table.* No. No, you — you haven\'t aged a day.\n\nCORVIN: Hello, Ysa. You look terrible.\n\nYSOLDE: I sealed you in. Do you understand? I took the fork from the altar while the note was still ringing and I let the door close on you, and I told the whole Empire you were lost in the hills. Forty years—\n\nCORVIN: I know. I heard the note stop. I\'ve had a long time to think about it. Well — about a minute, from where I stood. Long enough.\n\nYSOLDE: You can\'t forgive that.\n\nCORVIN: I\'m the only one who gets to decide. Now move over. You\'re taking up the whole bench.';
      } },
    { id: 'lie', label: '"He died long ago."', show: (g) => g.quests.stage('sq_map') === 85,
      say: (g) => {
        g.finishUnfinishedMap('lie');
        return 'Dead. *She closes her eyes.* Then it was quick, at least. And then I can tell you, because it can\'t hurt him now.\n\nI followed him to the stones that night. When the door opened I saw what was inside — a whole city of light, and his name on it forever, and mine nowhere. When he went in, I took the fork off the altar, and the door folded shut behind him like a page. I sat outside until dawn telling myself I would open it in the morning. I never did.\n\nThank you for lying to me so kindly. No — don\'t. I know what a lie looks like; I\'ve told one for forty years. Take my purse. I won\'t be needing it.';
      } },
    { id: 'truth', label: '"I found him. I chose the Atlas."', show: (g) => g.quests.stage('sq_map') === 85,
      say: (g) => {
        g.finishUnfinishedMap('truth');
        return 'You found him alive. And you left him there. *She laughs, and it turns into a long cough.*\n\nNo. No, I don\'t get to judge you. I stood at that same door forty years ago and did the same thing, for the same reason: because the thing on the other side shone brighter than he did, and I wanted it to be mine.\n\nWe\'re the same, you and I. Keep your Atlas. Read it carefully. It\'s the only thing either of us ever got for him.';
      } },
    ...generic,
  ],
};

DIALOGUE.marrow = {
  greeting: (g) => g.quests.stage('sq_map') >= 40 ? 'Back again? Marrow told you everything Marrow knows. Go and ring your bell.' : pick(['Hm. Another one walking the old roads. Marrow doesn\'t get visitors. Marrow likes it that way.', 'Mind the fire. Mind the herbs. Mind your own business, mostly.']),
  topics: [
    { id: 'corvin', label: 'Corvin Ashby', show: (g) => g.quests.stage('sq_map') >= 10 && g.quests.stage('sq_map') < 40,
      say: (g, npc) => {
        const reveal = 'Corvin sat right where you\'re standing, forty years ago, drunk on cheap wine and luckier than any man deserves. Said he\'d found the door in the Hollow Stones. Said it only answers the bell\'s note in the hour that belongs to no day — midnight, you fool, the one hour that\'s neither yesterday nor tomorrow. Between eleven and one, he said. No earlier, no later.\n\nAnd he said the old elves counted their night from moonrise. Moon, then the stars, then the sun come round again. Made me repeat it twice. Thought I\'d forget. Marrow forgets nothing.\n\nHe wasn\'t alone, either. A woman came up the path after him. Breton. Ink on her fingers. Next morning she came back down alone, and she wouldn\'t look at my fire.';
        if (g.quests.stage('sq_map') < 30) return 'Corvin? Marrow knew a Corvin. Marrow knows a lot of things. Come back when you\'ve followed his map further than the first page.';
        if (g.player.inventory.has('cyrodilic_brandy')) {
          g.takeItem('cyrodilic_brandy', 1);
          g.quests.set('sq_map', 40, g.day());
          return 'Is that... Cyrodilic? Now THERE\'S a friend worth the name. *He uncorks it with his teeth.*\n\n' + reveal;
        }
        if (npc.disposition >= 70) {
          g.quests.set('sq_map', 40, g.day());
          return 'Hm. You\'ve got honest eyes, for a city type. Fine.\n\n' + reveal;
        }
        return 'Corvin? Maybe Marrow knew him. Maybe Marrow\'s throat is too dry to remember. *He eyes your pack.* (A bottle of Cyrodilic Brandy might loosen his tongue — or a warmer opinion of you. Emfrid at the Grey Mare keeps a few bottles.)';
      } },
    { id: 'eye', label: 'The tree with an eye', show: (g) => g.quests.started('sq_map'),
      say: () => 'Marrow carved that eye. Keeps the forest honest. Corvin put it on his map and called it a landmark. Marrow called it rude. We were both right.' },
    { id: 'woods', label: 'These woods', say: () => 'Somnalius ferns, lady\'s smock, nirnroot down by the water if your ears are good — it sings, nirnroot. Pick what you need and no more. The forest remembers greedy hands.' },
    ...generic,
  ],
};

DIALOGUE.corvin = {
  greeting: (g) => g.flags.corvinHome ? 'She kept every map we ever drew. Did you know that? Under the bed. Forty years of them.' : pick(['Forty years. You\'d think the world would have had the decency to change more.', 'Lead on. I\'ve been standing still long enough.', 'Is it always this bright out here? I\'d forgotten.']),
  topics: [
    { id: 'ysolde', label: 'Ysolde', show: (g) => !g.flags.corvinHome,
      say: () => 'She\'s alive? Then what are we standing here for? The Grey Mare, in Chorrol. I know the way — well, I knew it forty years ago. You lead.' },
    { id: 'nenalatha', label: 'Nenalatha', say: () => 'The Ayleids built it to keep time. Not count it — keep it, the way you keep a coin in a purse. The Atlas held every hour that ever passed in that hall. Including mine. Every one of them felt like the same second.' },
    { id: 'maps', label: 'Maps', show: (g) => !!g.flags.corvinHome,
      say: () => 'I\'m going to finish them. All of them. It should take me about forty years. That seems fair.' },
    ...generic,
  ],
};

// ---------------------------------------------------------------- main quest, act two
const near = (g, id, r = 8) => g.cell.actors.find((a) => a.uid === id && !a.dead && a.pos.distanceTo(g.player.pos) < r);

DIALOGUE.martin = {
  greeting: (g) => {
    const h = g.quests.stage('mq_heir');
    if (h === 20) return 'Not now! Help them — the Daedra are inside!';
    if (h === 30) return 'Akatosh preserve us — they\'re gone? You fought your way in here? Who in Oblivion are you?';
    if (h === 40) return pick(['Lead on. I\'ll try not to slow you down.', 'I keep looking back at the smoke. I can\'t stop.', 'If I am who you say I am... no. One step at a time.']);
    if (g.quests.stage('mq_shrine') === 40) return 'You came back. And you\'re carrying something that makes my teeth ache. Is that—?';
    if (g.quests.stage('mq_shrine') === 100) return 'Every page fights me. Every page. But I am winning, slowly.';
    return pick(['Jauffre insists on calling me "Your Highness". I keep looking over my shoulder for whoever he means.', 'Is there news?', 'I have been praying. I am not sure anyone is listening.']);
  },
  topics: [
    { id: 'kvatch', label: 'Kvatch', show: (g) => g.quests.stage('mq_heir') >= 30 && g.quests.stage('mq_heir') < 100,
      say: () => 'Kvatch was my home for twenty years. I baptized half the children in this city. I watched the sky open and spill fire into the streets, and all I could do was bar the chapel door and pray. Akatosh did not answer. You did. I don\'t know what that means yet.' },
    { id: 'father', label: 'Your father', show: (g) => g.quests.stage('mq_heir') === 30,
      say: () => 'My father was a farmer outside Bravil, and my mother... I never knew my mother. What is this? Why would anyone fight through a burning city to ask a priest about his parents?\n\nThe Emperor? Uriel Septim? *He laughs, too loudly.* No. No, I would know. Wouldn\'t I? You will have to do better than a story, friend. I have heard a great many stories in the confessional.' },
    { id: 'proof', label: 'The Blade\'s katana', show: (g) => g.quests.stage('mq_heir') === 30 && g.player.inventory.has('akaviri_katana'),
      say: (g, npc) => {
        npc.following = true;
        g.flags.martinFollowing = true;
        g.flags.martinLeftChapel = true;
        g.quests.set('mq_heir', 40, g.day());
        return '*He takes the blade and turns it in the light. On the guard, almost worn away, is the Dragon of the Septims, and beneath it the mark of the Blades.*\n\nThis was carried by one of the Emperor\'s own bodyguards. And they gave it to you, to give to... me.\n\n*A long silence.* When I was a boy, a man used to visit our farm once a year. He never gave his name. He wore a sword just like this one.\n\nAll right. All right. I\'ll come to Weynon Priory and hear what this Jauffre has to say. Tierra, Jakben — the soldiers are at the camp below the walls; go to them at first light. I\'m... I\'m sorry.';
      } },
    { id: 'trust', label: 'Trust me', show: (g) => g.quests.stage('mq_heir') === 30,
      say: (g, npc) => {
        if (npc.disposition < 65) return 'Trust you? An hour ago I didn\'t know you existed. You are asking me to walk out of the only safe place left in this city because of a story. (He needs proof — or more reason to trust you than he has.)';
        npc.following = true;
        g.flags.martinFollowing = true;
        g.flags.martinLeftChapel = true;
        g.quests.set('mq_heir', 40, g.day());
        return '*He studies your face for a long time.* You came in here through a city full of Daedra, for a stranger. People who lie do not usually work that hard.\n\nVery well. I will come to Weynon Priory and hear this Jauffre out. If it\'s madness, at least it is a madness with walls around it.';
      } },
    { id: 'daedra', label: 'The Daedra', show: (g) => g.quests.stage('mq_heir') >= 40,
      say: () => 'You might as well know, since everyone else seems to know more about me than I do. When I was young I did not serve Akatosh. I served... other masters. Sanguine, mostly; Hermaeus Mora, when I was feeling clever. It ended badly. People died. I went into the priesthood to forget it. It seems the Daedra did not forget me.' },
    { id: 'commentaries', label: 'The Commentaries', show: (g) => g.quests.stage('mq_dawn') >= 20 && g.quests.stage('mq_dawn') < 40 && g.player.inventory.has('commentaries_1'),
      say: (g) => {
        g.quests.set('mq_dawn', 40, g.day());
        return '*He reads with a professional, faintly disgusted calm.* Typical. Mankar writes like a man who has spent too long talking to a Daedric Prince and has started to believe the Prince is listening.\n\n"Read me as the Dawn reads the world: by its first light." And again at the end: "The Dawn always writes in first light." He is practically shouting it. Look — the first letter of each passage. F, O, R, T... S, U, T, C, H.\n\nFort Sutch. An old Legion fort on the Gold Coast road, west of Kvatch. "Where the Emperor\'s soldiers once watched the road and kept nothing." That\'s their shrine. That\'s where you\'ll find Mankar\'s people — and, Gods help us, maybe the Amulet.';
      } },
    { id: 'xarxes', label: 'The Mysterium Xarxes', show: (g) => g.quests.stage('mq_shrine') === 40 && g.player.inventory.has('mysterium_xarxes'),
      say: (g) => {
        g.takeItem('mysterium_xarxes', 1);
        g.quests.set('mq_shrine', 100, g.day());
        g.giveItem('blades_cuirass', 1);
        g.giveItem('gold', 600);
        g.ui.queueAfterDialogue = () => g.ui.showEnding();
        return '*He does not take it at first. When he does, he holds it the way you would hold a sleeping snake.*\n\nThe Mysterium Xarxes. Written by Mehrunes Dagon in his own hand — if "hand" is the word. This is the key to Mankar Camoran\'s Paradise. He built a whole realm of Oblivion out of this book, and he took the Amulet of Kings there because he believed no one could follow.\n\nHe is wrong. It will take time to unravel the ritual, and the ritual will want things — a Daedric artifact, the blood of a Divine, a Great Welkynd Stone from the heart of some Ayleid ruin. Terrible, precious things. But I can open the way. I know I can.\n\nYou did this. You walked into their shrine and walked out with their god\'s own book. Jauffre wants you to have this — the armour of a Blade. I want you to have something else: my thanks, for an hour ago in Kvatch, and every hour since.';
      } },
    ...generic,
  ],
};

DIALOGUE.jakben = {
  greeting: (g) => g.quests.stage('mq_heir') <= 20 ? 'Is it over? Are they gone?' : 'Jakben, Earl of Imbel. Formerly of a city with walls.',
  topics: [
    { id: 'kvatch', label: 'Kvatch', say: () => 'My cousin the Count fought them in his own hall. I heard him until I couldn\'t. Martin got us in here and kept us alive on prayers and stale bread. If you are taking him somewhere, take him somewhere better than this.' },
    { id: 'martin', label: 'Martin', show: (g) => g.quests.stage('mq_heir') >= 30, say: () => 'Strange man for a priest. Knows far too much about Daedra. Thank the Nine he does — he knew which ones would fear the chapel bell.' },
    ...generic,
  ],
};
DIALOGUE.kvatch_refugee = {
  greeting: () => pick(['I want to go home. There is no home.', 'Bless you. Bless you.', 'Is the camp still there? The soldiers?']),
  topics: [...generic],
};

DIALOGUE.recruiter = {
  greeting: (g) => g.flags.dawnInitiate ? 'Dawn\'s beauty, initiate. Go. The shrine awaits you.' : 'Dawn\'s beauty to you, stranger. You have the look of someone searching. Most people pass this tree without seeing it. You stopped.',
  topics: [
    { id: 'dawn', label: 'The Mythic Dawn', show: (g) => !g.flags.dawnInitiate && g.quests.stage('mq_dawn') < 20,
      say: () => 'Ah. You have heard the name. Then you have heard lies about us — that we are murderers, cultists, worshippers of destruction. We are only awake. The world is ending; we simply refuse to sleep through it.\n\nThe Master, Mankar Camoran, has written a book that opens eyes. Would you read it, if I gave it to you? Would you wear the robe?' },
    { id: 'join', label: '"I want to join."', show: (g) => !g.flags.dawnInitiate && g.quests.stage('mq_dawn') < 20,
      say: (g, npc) => {
        g.flags.dawnInitiate = true;
        g.giveItem('mythic_dawn_robe', 1);
        g.giveItem('commentaries_1', 1);
        g.quests.set('mq_dawn', 20, g.day());
        setTimeout(() => { npc.def.activeHours = [99, 99]; g.flags.recruiterGone = true; }, 4000);
        return 'Then take these. The robe of the faithful, and the first book of the Commentaries.\n\nI will not tell you where the Shrine is. No one is told. Those who understand the Master\'s words will find their way; those who do not were never meant to. Read it as the Dawn reads the world.\n\nWear the robe when you arrive, and the faithful will know you. Dawn\'s beauty, initiate. We will not meet again.';
      } },
    { id: 'threaten', label: '"Tell me where the Amulet is."', show: (g) => !g.flags.dawnInitiate && g.quests.stage('mq_dawn') < 20,
      say: (g, npc) => {
        setTimeout(() => { npc.faction = 'monster'; npc.hostileToPlayer = true; npc.setTarget(g.player); }, 50);
        return '*His smile doesn\'t move, but his hand does — into his sleeve.* The Blades. Of course. The Master said you would come sniffing.\n\n*Red light crawls over his body and hardens into armour.* Dagon take you!';
      } },
  ],
};

// ---------------------------------------------------------------- The Libram of Lesser Wonders
DIALOGUE.aldous = {
  greeting: (g) => {
    const st = g.quests.stage('sq_wizard');
    if (st === 0) return '*A small, round, white-bearded Breton in a robe covered in embroidered stars looks up from a teacup that is steaming in three different colours.* Oh! A visitor! Mind the orrery, it bites. Not literally. Mostly not literally.';
    if (st === 40) return 'Is that — you found them? All three? Oh, give them here, give them here!';
    if (st === 50) return 'Shh! Shh. The binding is very delicate. Also very exciting. Mostly exciting.';
    if (st === 100) return pick(['Welcome back to the Spire! Twenty-five wonders, all for sale, all mostly safe.', 'Ah, my favourite page-fetcher! What shall it be today? Something sparkly?', 'Have you tried Festival Fireworks indoors yet? Don\'t. I mean it this time.']);
    return pick(['Any luck with the pages? Remember — the Oak, Henrietta, and the wisp.', 'Look up at the Oak and pull with your will, not your arm. Your arm is far too short.', 'Henrietta is shy. Approach slowly. Hum something.']);
  },
  topics: [
    { id: 'libram', label: 'The Libram', show: (g) => g.quests.stage('sq_wizard') === 0,
      say: (g) => {
        g.quests.set('sq_wizard', 10, g.day());
        g.flags.wizardQuest = true;
        if (!g.player.spells.includes('telekinesis')) g.player.spells.push('telekinesis');
        g.ui.notify('You learned Telekinesis.');
        g.spawnHenrietta();
        g.countLibramPages();
        return 'Aldous Quillwhistle, Wizard of Small Wonders, late of the Arcane University. Very late. They asked me to leave after the Archmage\'s birthday. The fireworks were a gift! Nobody was badly singed!\n\nThis is — was — my life\'s work: the Libram of Lesser Wonders. Spells the University never bothered to teach. Spells for pulling things, and leaping, and seeing in the dark, and making the sky go BANG in nice colours. And this morning I tried to cool my tea with a Breeze Charm, and blew three pages clean out of the window.\n\nOne is caught up in the Great Oak, far too high for me. Here — let me teach you Telekinesis. Look at the page and pull with your mind. One fluttered into the hen coop behind the houses on the west side, and Henrietta ate a bit of it, and now she glows. Catch her, gently. And the third... the wind caught a will-o\'-the-wisp out past the east gate, and it has been playing keep-away with my page ever since. Wisps are made of moonlight and nonsense; one good spell will pop it. Any spell at all.\n\nBring them back and I will open my book to you. All twenty-five wonders. For a reasonable fee. Wizards must eat.';
      } },
    { id: 'pages', label: 'The pages', show: (g) => g.quests.stage('sq_wizard') >= 10 && g.quests.stage('sq_wizard') < 50,
      say: (g, npc) => {
        const n = g.countLibramPages();
        if (n < 3) return `${n} of 3! Splendid. The Great Oak, Henrietta, and the wisp past the east gate. I would help, but I am very busy drinking this tea before it turns into a frog again.`;
        for (const id of ['libram_page_oak', 'libram_page_hen', 'libram_page_wisp']) g.takeItem(id, 1);
        g.quests.set('sq_wizard', 50, g.day());
        g.ui.queueAfterDialogue = () => g.startWizardRitual(npc);
        return 'All three! The Oak page — a bit leafy. Henrietta\'s page — a bit nibbled. The wisp\'s page — cold as a fish. Perfect! Stand back. No, further. A little further. Now — watch.';
      } },
    { id: 'university', label: 'The Arcane University', say: () => 'Oh, the University is very grand. Very serious. They teach you to throw fire at things and to heal the wounds you get from having fire thrown at you. Very useful. But nobody ever taught me to make a candle dance, and I think that is a terrible shame. So I wrote it down myself. And then I wrote down another one. Forty years later, here we are.' },
    { id: 'henrietta', label: 'Henrietta', show: (g) => g.quests.started('sq_wizard') && !g.player.inventory.has('libram_page_hen') && g.quests.stage('sq_wizard') < 50,
      say: () => 'Henrietta is a hen of great character and very little sense. She ate a corner of the page about small lights, and now she glows like a lantern and will not let anyone near her. Approach slowly. Do not make eye contact. She takes eye contact as a challenge.' },
    { id: 'wonders', label: 'Your spells', show: (g) => g.quests.done('sq_wizard'),
      say: () => 'Twenty-five wonders! Lightning that hops from foe to foe, a meteor from a clear sky, a bound sword, a spectral wolf, a sunbeam, a leap that would make a kestrel jealous — and Festival Fireworks, my masterpiece. Each one has its own gesture; your hands will learn them. Ask to see my spells and pick whatever takes your fancy.' },
    ...generic,
  ],
};

// ---------------------------------------------------------------- The Ballad of the Hero
DIALOGUE.tillmon = {
  greeting: (g) => {
    const st = g.quests.stage('sq_bard');
    if (st === 0) return '*He strikes a dramatic pose and holds it slightly too long.* You! Yes, you, with the face! Do you know who I am? No? Excellent. Nobody does. YET.';
    if (st === 10) return 'Any sign of her? Lady Plucksworth? She\'s about so big, lute-shaped, probably being pinched.';
    if (st === 60 || st === 70) return g.cell.id === 'inn' ? 'The audience! The candlelight! The faint smell of mead! Darling, I was BORN for this. Several times.' : 'Tonight! The Grey Mare! Seven until eleven! Bring a handkerchief. Bring two.';
    return pick(['Ah, my muse! My subject! My unpaid assistant!', 'Did you know that nothing rhymes with "Kvatch"? I have checked. I have checked for nine days.', 'I\'m working on a new verse. It\'s about you. You\'re very brave in it, and slightly taller.']);
  },
  topics: [
    { id: 'ballad', label: 'Your ballad', show: (g) => g.quests.stage('sq_bard') === 0,
      say: (g) => {
        g.quests.set('sq_bard', 10, g.day());
        if (g.player.inventory.has('lady_plucksworth')) g.quests.set('sq_bard', 20, g.day());
        return 'Tillmon Larkspur, Bard of the Third Verse — the first two were lost in a fire. Well, a puddle. I am composing the greatest ballad Cyrodiil has ever heard: THE BALLAD OF THE HERO OF KVATCH! A tale of courage! Of fire! Of the sewers, briefly!\n\nThere is one small problem. My lute, Lady Plucksworth, has been stolen. By a mudcrab. A large one, with a sort of... knowing look. It scuttled off toward the lake shore, north-east of here, with her in its claws. I would retrieve her myself, but I bruise like a peach, and also I am afraid of crabs.\n\nWait. Wait. You\'re — you\'re HIM! Or HER! The Hero! Oh, this is perfect. This is a verse in itself.';
      } },
    { id: 'lute', label: 'Lady Plucksworth', show: (g) => (g.quests.stage('sq_bard') === 10 || g.quests.stage('sq_bard') === 20),
      say: (g) => {
        if (!g.player.inventory.has('lady_plucksworth')) return 'She went north-east, toward the water. Follow the shore. Follow the sound of pinching.';
        g.takeItem('lady_plucksworth', 1);
        g.quests.set('sq_bard', 30, g.day());
        return '*He clutches the lute to his chest and weeps openly.* My lady! What did he DO to you? There\'s a dent. There\'s a dent shaped like a pinch. Oh, I\'ll write a song about this too.\n\nSir Pinchington, you say? He told you his NAME? ...Interesting. Very interesting. Never mind.\n\nNow then. The ballad is nearly finished. I have only one problem left: I need a word that rhymes with "Oblivion". Ask the three wisest people I know. M\'aiq the Liar, who wanders the roads near the Sewers exit. Mirabelle at the Roxey Inn, who has heard every song I know, whether she wanted to or not. And Glarthir in Chorrol, who is not wise, but is very, very thorough.';
      } },
    { id: 'rhymes', label: 'Rhymes for "Oblivion"', show: (g) => g.quests.stage('sq_bard') === 30 || g.quests.stage('sq_bard') === 40,
      say: (g) => {
        if (g.quests.stage('sq_bard') === 30) return `You have ${g.bardRhymeCount()} of three. M\'aiq, Mirabelle, Glarthir. Wise, weary, and wary. That\'s alliteration. You\'re welcome.`;
        g.quests.set('sq_bard', 50, g.day());
        return '"Trivial bun." "Grim Vivian." "Sad civilian." *He writes them down with enormous care.* They\'re terrible. They\'re PERFECT. Nobody will be able to look away.\n\nThere is one thing left, and it\'s the most important. A premiere needs an audience. Go to Chorrol and invite three of its finest citizens to the Grey Mare. Tell them it\'s free. Tell them there\'s mead. Do not tell them how long it is.';
      } },
    { id: 'premiere', label: 'The premiere', show: (g) => g.quests.stage('sq_bard') === 50,
      say: (g) => `Three guests, darling. You have ${g.bardInviteCount()} so far. Reynald Jemane, Laythe Wavrick, Valus Odiil, Dar Jee, Teekeeus — any of them. Charm them. Bribe them. Lie, if you must; I always do.` },
    { id: 'perform', label: 'Begin the performance', show: (g) => (g.quests.stage('sq_bard') === 60 || (g.quests.stage('sq_bard') === 70 && !g.bardShow)) && g.cell.id === 'inn',
      say: (g) => {
        const hr = ((g.time.hours % 24) + 24) % 24;
        if (hr < 19 || hr >= 23) return 'Now? In the DAYLIGHT? Darling, no. Bards perform between seven and eleven in the evening. Daylight shows the sweat. Come back tonight. (Wait until evening — T.)';
        g.ui.queueAfterDialogue = () => g.startBardPerformance();
        return '*He tunes Lady Plucksworth. It takes a while. It does not help.* Ladies. Gentlemen. Dar Jee. Tonight, for the first and possibly last time anywhere...';
      } },
    { id: 'uncle', label: 'Your family', show: (g) => !g.flags.bardRevealed && g.quests.started('sq_bard'),
      say: () => pick(['My uncle? Lives on an island. Shivering, mostly. Talks to his cheese. Lovely man. We\'re very close. Uncomfortably close, some might say. I might say.', 'Family? I have dozens. Hundreds. Some days I am all of them. Ha! Ha. Ignore me.', 'My mother always said I had two voices: one for singing and one for ordering cheese. I\'ve never been able to tell them apart.']) },
    ...generic,
  ],
};

DIALOGUE.sheogorath = {
  greeting: () => pick(['Ah! The hero! Or the audience! Or the cheese! One of those.', 'Don\'t mind the butterflies. They\'re with me.', 'Splendid evening. Splendid! I haven\'t had this much fun since I turned a Countess into a very small goat.']),
  topics: [
    { id: 'who', label: 'Who are you?', show: (g) => g.quests.stage('sq_bard') === 80,
      say: () => 'Who am I? WHO AM I? I\'m a lot of people, mortal. Tonight I was a bard. Tomorrow I might be a slightly damp sock. But most days, I\'m Sheogorath, Prince of Madness, Lord of the Never-There, Sovereign of the Shivering Isles, and the best lute player in all the planes of Oblivion — which, as it happens, rhymes with nothing. I CHECKED.\n\nYou see, I was bored. Terribly bored. Your Mehrunes Dagon has been stomping about, knocking on gates, very serious, very loud. So I thought: what this war needs is a song. A bad one. The worst one. And a hero to fetch my lute from a crab.' },
    { id: 'tillmon', label: 'What happened to Tillmon?', show: (g) => g.quests.stage('sq_bard') >= 80,
      say: () => 'Tillmon? Tillmon was me. Is me. Will be me again on Tuesdays. He\'s a very good bard, you know. In the sense that he\'s very bad at being a bard. It\'s a whole artistic statement. Don\'t worry your little head.' },
    { id: 'pinchington', label: 'Sir Pinchington', show: (g) => g.quests.stage('sq_bard') >= 80,
      say: () => 'Oh, Pinchington! One of my courtiers. Had him take the lute so I\'d have an excuse to meet you. He\'s a Duke now. Well — he was a Duke. You killed him. He\'s fine. He\'s in the Isles, being a Duke and dead at the same time. It\'s very fashionable.' },
    { id: 'payment', label: 'About my payment...', show: (g) => g.quests.stage('sq_bard') === 80,
      say: (g) => {
        g.quests.set('sq_bard', 100, g.day());
        g.giveItem('gold', 300);
        g.giveItem('madgod_lute', 1);
        g.giveItem('cheese_wheel', 3);
        g.giveItem('tillmon_songbook', 1);
        g.ui.queueAfterDialogue = () => g.sheogorathDeparts();
        return 'Payment! Of course, of course. Gold — boring, but traditional. Cheese — less boring, more traditional. And this: the Lute of the Mad God. Play it whenever you like. Something will happen. I genuinely have no idea what. That\'s the best part!\n\nAnd keep the songbook. Every word of it is true, apart from the words.\n\nNow, I must be off. Busy, busy. Somewhere there\'s a guard in Bravil who still thinks his shoes are his own. Farewell, mortal! Mind the cheese on your way out.';
      } },
  ],
};

// ---------------------------------------------------------------- The Lantern in the Wood
const LULLABY = '"Little fox, little fox, curl up tight — the dark is just the day with its eyes shut at night."';

DIALOGUE.seed_neeus = {
  greeting: (g) => {
    if (g.quests.done('sq_home') && !g.flags.seedPaid) return 'You! Bram says the south road is quiet. Bram says a great many things. Is it true?';
    if (g.quests.stage('sq_lantern') === 0) return 'Welcome to Northern Goods and Trade. Weapons, armour, lockpicks — and lamp oil. Everyone wants lamp oil this month.';
    return pick(['Welcome back to Northern Goods and Trade.', 'Seed-Neeus sells only quality wares. Mostly to quality customers.', 'Mind Bram. He jumps.']);
  },
  topics: [
    { id: 'lamp_oil', label: 'Lamp oil', show: (g) => g.quests.stage('sq_lantern') === 0,
      say: (g) => {
        g.quests.set('sq_lantern', 10, g.day());
        return 'I have sold more lamp oil this month than all of last year, and I do not like why. Nobody will take the south road after dark. The farmers say there is a woman in the woods south of town who walks with a lantern, and if you follow the light you do not come back the same.\n\nI would call it tavern talk, except for Bram. My courier. Big Nord lad, frightened of nothing, carries a crate of candles to Weynon Priory every week. Three nights ago he cut through the woods to save an hour, and came back without the crate and without his colour. He has been sitting in the back of my shop ever since, drinking tea and staring at the door.\n\nTalk to him. Find out what walks in my woods. I will pay for the answer — and for the crate, if you find it. Those were good candles.';
      } },
    { id: 'report', label: 'The lantern woman', show: (g) => g.quests.stage('sq_lantern') >= 20 && g.quests.stage('sq_lantern') < 100,
      say: (g) => {
        const st = g.quests.stage('sq_lantern');
        if (st < 40) return 'Bram says she walks only after dark. So: go after dark. I sell torches. I am told everyone already has one.';
        if (!g.player.inventory.has('delivery_crate')) return 'A ghost. *Her tail goes very still.* I believe you. Now — my crate? Bram dropped it in that clearing. Bring it back and we will talk about payment.';
        g.takeItem('delivery_crate', 1);
        g.giveItem('gold', 75);
        g.quests.set('sq_lantern', 100, g.day());
        g.quests.set('sq_ashes', 10, g.day());
        return 'A ghost who thinks the fire is still burning, looking for a little boy. *She sets the crate down very gently, as if something inside might wake.* The Corwyn fire. My hatchling-nurse used to tell that story to make us behave. Half the Great Forest burned, before my time — before Emfrid\'s mother\'s time.\n\nHere. Seventy-five, for the crate and the truth.\n\nAnd... do not stop. Among my people we say a ghost is a question nobody answered. A ghost that wants something will keep wanting it, and the woods will stay dark until she has it. Search what is left of that cottage, in daylight. And ask Emfrid at the Grey Mare; her family has poured ale and gossip in this town for four generations. Someone remembers.';
      } },
    { id: 'corwyns', label: 'The Corwyns', show: (g) => g.quests.started('sq_ashes') && !g.quests.done('sq_home'),
      say: (g) => {
        if (g.quests.stage('sq_ashes') < 20) return 'Search the cottage by daylight, and ask Emfrid. Ghosts are patient. We need not be careless.';
        if (g.quests.stage('sq_ashes') < 40) return 'The boy lived? *She blinks, slowly.* Then he grew up. People who grow up go somewhere. Ask Emfrid who came out of those woods.';
        return 'Old Rimalus. All these years, buying his pipe-leaf at my counter. Tomorrow I will give him the good leaf, and say nothing. Go on. Finish it.';
      } },
    { id: 'woods_quiet', label: 'The woods are quiet', show: (g) => g.quests.done('sq_home') && !g.flags.seedPaid,
      say: (g) => {
        g.flags.seedPaid = true;
        g.giveItem('gold', 250);
        g.giveItem('potion_health', 2);
        return '*She listens to the whole of it without interrupting, which you suspect is rare.* So the lantern woman went home, in the end, and the witch who lit the fire is ash herself. That is a good shape for a story. My hatchling-nurse would have liked it.\n\nTwo hundred and fifty, and two good potions, and Bram goes back on the Priory run tomorrow — by day, he insists, which is fine. And if old Rimalus ever wants a lantern, it is on the house. Forever.';
      } },
    { id: 'goods', label: 'Northern Goods', say: () => 'Weapons, armour, potions, lockpicks, torches. I buy what adventurers find, too, at a fair price. Fairer than the Imperial City. Much fairer than Bravil.' },
    ...generic, ...mainTopics,
  ],
};

DIALOGUE.bram = {
  greeting: (g) => {
    if (g.quests.done('sq_home')) return pick(['Back on the Priory run tomorrow. Daylight only. Seed-Neeus says I\'m a coward. I say I\'m alive.', 'They say she\'s gone to rest. Good. I\'ll still take the long way round.']);
    if (g.quests.stage('sq_lantern') >= 20) return 'Did you see her? Don\'t tell me. ...Tell me.';
    return '*A big young Nord wrapped in a horse blanket, holding a mug of tea with both hands.* ...Oh. You\'re not her. Good. Sorry. Hello.';
  },
  topics: [
    { id: 'lantern', label: 'The lantern woman', show: (g) => g.quests.stage('sq_lantern') === 10,
      say: (g) => {
        g.quests.set('sq_lantern', 20, g.day());
        return 'I\'m not a coward. I want that said first. I\'ve killed a wolf with a candle crate. Twice.\n\nI was late for the Priory, so I left the road at the big bend and cut south through the woods, along an old charcoal-burners\' track. There\'s a clearing in there — burned-out cottage, a pair of kilns, little stone cairns. Nobody goes there. I was halfway across when the light came out of the trees. A lantern. Held up high, like she was looking for something on the ground.\n\nShe was calling. "Tam! Tam, come home! Tam!" Over and over, so tired. And then she turned and saw me and the lantern came right up to my face, and I could see the trees through her, and she said — gentle, like my mam — "Tam? Is that you? You\'ve grown so tall."\n\nI dropped the crate. I don\'t remember the road. She only comes out after dark, they say. Don\'t go after dark. Or do. I\'m not your mam.';
      } },
    { id: 'tam', label: '"Tam"', show: (g) => g.quests.stage('sq_lantern') >= 20 && !g.quests.done('sq_home'),
      say: () => 'Never heard the name in my life. I\'m Bram. Bram Hollis, of Bruma. But the way she said it... like she\'d been saying it so long it had worn smooth.' },
    { id: 'work', label: 'Your work', say: () => 'Courier. Candles and lamp oil to the Priory, salt fish back, sometimes letters. It\'s good work. Quiet. Mostly quiet. Usually.' },
    ...generic,
  ],
};

DIALOGUE.maela = {
  greeting: (g) => {
    if (g.quests.stage('sq_home') === 20) return '*The lantern is steady now, and golden.* Is he coming? You said he was coming. I can wait. I am good at waiting.';
    if (g.flags.maelaFreed) return '*She holds her lantern up and looks at it as if she has never seen it before.* It\'s warm again. Thank you. Now — my boy.';
    if (g.quests.stage('sq_ashes') >= 40) return '*She does not look at you; she is watching the trees.* You came back. Have you news?';
    if (g.quests.stage('sq_lantern') >= 40) return pick(['*She is calling into the trees.* Tam! Tam, come home! ...Oh. It\'s you. Have you seen him?', `*She is humming, very quietly.* ${LULLABY}`, 'The smoke is so thick tonight. Can you smell it? Why can\'t anyone smell it?']);
    return '*She turns, lantern held high, and its light passes straight through you.* Tam? ...No. No, you\'re far too tall. Forgive me. Have you seen a little boy? So high, brown hair, a wooden fox in his hand? The trees are burning. He\'ll be so frightened.';
  },
  topics: [
    { id: 'son', label: 'Your son', show: (g) => g.quests.stage('sq_lantern') >= 20 && g.quests.stage('sq_lantern') < 40,
      say: (g, npc) => {
        g.quests.set('sq_lantern', 40, g.day());
        g.flags.maelaNamed = true;
        npc.name = 'Maela Corwyn';
        return 'Tam. My Tam. Seven last Rain\'s Hand. I\'m Maela — Maela Corwyn. My husband Osric burns charcoal for the Priory; that\'s our cottage, just there. *She points at the roofless black shell without seeing it.*\n\nThe fire came out of the west at dusk. Osric ran to the kilns to wet them down and I went in for Tam, and his cot was EMPTY. He\'s been out there all this time in the smoke. I\'ve been looking and looking and the trees won\'t stop burning.\n\nHe has a little wooden fox. Osric carved it for him; he won\'t sleep without it. I used to sing to him — ' + LULLABY + ' — if you hear a little boy singing that, it\'s him.\n\nPlease. You can go where I can\'t. I can\'t seem to leave the clearing. Find my boy and bring him home.';
      } },
    { id: 'fire', label: 'The fire', show: (g) => g.quests.stage('sq_lantern') >= 40 && !g.flags.maelaFreed,
      say: () => 'It\'s still burning. Can\'t you see? *Embers drift around her that are not there.* Every night it burns, and every night I go into the trees with the lantern, and every night I come back here without him. That isn\'t right, is it. That isn\'t how nights go.' },
    { id: 'year', label: 'What year is it?', show: (g) => g.quests.stage('sq_lantern') >= 40 && !g.flags.maelaFreed,
      say: () => 'What a question. It\'s the forty-ninth year of — of the Third Era, of Pelagius the — *she falters.* You\'re looking at me so strangely. Everyone looks at me so strangely. The courier boy looked at me like that. Like I was the one who was lost.' },
    { id: 'alive', label: 'Tam is alive', show: (g) => g.quests.stage('sq_ashes') === 40,
      say: (g) => {
        g.quests.set('sq_ashes', 100, g.day());
        g.quests.set('sq_gloam', 10, g.day());
        return '*The lantern shakes in her hand.* Alive. Alive? He ran for help. Of course he did. Of course he did, he\'s Osric\'s boy, he— *She laughs, and it is the worst sound you have ever heard.* Ninety-one years old. My little fox. I have been calling a child who has been an old man for longer than I was ever alive.\n\nThen why — why hasn\'t he — no. No, I know why. Because they\'re in the trees. The burned ones. And because I can\'t go to him. I have tried, every night. I get to the edge of the clearing and the light pulls me back.\n\nIt isn\'t mine any more. *She lifts the lantern; it is a ghost of a lantern, and you can see through it.* She took it. The night of the fire there was a Dunmer woman in the trees with a green lamp and a bag of black stones, and when I — when I fell, she took my lantern out of my hand, and where it goes, I go. Every night she draws a little more of my light out of it, and the dead get up out of the ash.\n\nShe lives under the old barrow mound, east of here, where the ground drops toward the stream. Go carefully. She has had eighty years to get good at this.';
      } },
    { id: 'lantern_back', label: 'Your lantern', show: (g) => g.quests.stage('sq_gloam') === 30 && g.player.inventory.has('maela_lantern'),
      say: (g, npc) => {
        g.takeItem('maela_lantern', 1);
        g.flags.maelaFreed = true;
        g.quests.set('sq_gloam', 100, g.day());
        g.quests.set('sq_home', 10, g.day());
        g.ui.queueAfterDialogue = () => g.maelaLanternReturned(npc);
        return '*She reaches for the lantern, and her fingers close on it. Real wood, real tin. She makes a sound like someone setting down something very heavy.*\n\nOh. Oh, it\'s warm. I\'d forgotten it was warm.\n\nShe\'s gone? Truly? Then nothing pulls at me tonight. I could walk to the road. I could walk to Chorrol. *She looks at the road, and does not go.* No. I won\'t go to him like this — a thing that walks out of the dark at an old man. I\'ll wait here. This is home. This is where he left from.\n\nBring me my boy. Please. I have been calling him so long.';
      } },
    { id: 'here', label: 'Your son is here', show: (g, npc) => g.quests.stage('sq_home') === 20 && !!NEAR(g, 'inn_patron', 14) && !g.corwynScene,
      say: (g, npc) => {
        g.ui.queueAfterDialogue = () => g.startCorwynReunion(npc);
        return '*She lowers the lantern. Behind you, very slowly, an old man is walking into the clearing.*';
      } },
    { id: 'lullaby', label: 'Your song', show: (g) => g.quests.stage('sq_lantern') >= 40,
      say: () => `*She sings it softly, and for a moment the wood is very quiet.*\n\n${LULLABY}\n\nOsric made it up. He couldn't sing, so he said it, and Tam laughed every time.` },
  ],
};

DIALOGUE.rimalus = {
  greeting: (g) => {
    const h = g.quests.stage('sq_home'), a = g.quests.stage('sq_ashes');
    if (g.quests.done('sq_home')) return pick(['Sit down, sit down. Have you eaten? You look thin. ...Ma always said that. I find I say it now.', '*He turns the wooden fox over in his fingers and smiles at it.* Eighty-four years. You\'d think I\'d have learned to whittle by now.']);
    if (g.flags.tamFollowing) return pick(['My knees are older than your grandfather. Go slow.', 'Is it far? It isn\'t far. I know it isn\'t far. I used to run it.', 'Talk to me about something. Anything. Not the woods.']);
    if (a === 30) return '*A very old man in a good coat, with a cup of mulled wine he is not drinking.* You\'ve been looking at me since you came in. If you\'re selling something, I\'m too old. If you\'re collecting a debt, I\'m too poor. If you\'re a Countess\'s by-blow come to claim your inheritance, I\'m delighted.';
    return '*A very old man nursing a cup of mulled wine he is not drinking.* Hm? Oh. Sit, if you like. Don\'t expect conversation. I gave it up for my health.';
  },
  topics: [
    { id: 'tam', label: 'Tam Corwyn', show: (g) => g.quests.stage('sq_ashes') === 30 && !g.flags.tamAdmitted,
      say: (g) => g.player.inventory.has('tams_slate')
        ? 'Never heard the name. *His hand goes to something on a cord under his shirt, and stays there.* I\'m a Bruiant. Rimalus Bruiant. My father was Marcus Bruiant, wine merchant, may he rest. You want to talk to somebody about the Corwyns, you go and— what\'s that you\'ve got there?'
        : 'Never heard the name. *His hand goes to something on a cord under his shirt, and stays there.* I\'m a Bruiant. Rimalus Bruiant. My father was Marcus Bruiant, wine merchant. If there\'s nothing else, I\'d like to sit with my wine.' },
    { id: 'slate', label: 'Show him the slate', show: (g) => g.quests.stage('sq_ashes') === 30 && g.player.inventory.has('tams_slate'),
      say: (g) => {
        g.flags.tamAdmitted = true;
        g.quests.set('sq_ashes', 40, g.day());
        return '*He takes the slate in both hands, and his thumb finds the arrow without looking, as if it has been looking for it for eighty-four years.*\n\nG-O-N. I never could spell "gone". Ma was teaching me. She said I had a lazy E.\n\n*He is quiet for a long time. Then he draws the cord out from under his shirt. On it hangs a little wooden fox, its ears worn smooth by thumbs.*\n\nI woke up and the window was orange. Ma wasn\'t in the cottage — I thought she\'d gone to Pa at the kilns. Pa always said: if there\'s trouble, Tam, you run for the guard. So I wrote it on my slate so she\'d know, like a big boy, and I ran. East, toward the road. The smoke was so thick. I fell down in a ditch and I don\'t remember after that.\n\nThe Bruiants found me on the south road two days later. I didn\'t speak for a year. When I did, I\'d decided there wasn\'t a fire and there wasn\'t a cottage and I\'d always been Rimalus. Easier, you see. A child can decide a thing like that, and an old man can go on deciding it every morning for eighty-four years.\n\nAnd now you\'re telling me she\'s out there. Calling. *His voice cracks right down the middle.* No. I left her. I ran and I left her. And I hear there are things in those woods now, burned things, walking. I can\'t. Don\'t ask me.';
      } },
    { id: 'woods', label: 'The woods', show: (g) => !g.quests.done('sq_home'),
      say: (g) => g.quests.stage('sq_home') >= 10
        ? 'The witch is dead? You\'re certain? *He looks at his wine.* Then there\'s nothing between me and it but my own two feet. That\'s worse, somehow.'
        : g.flags.tamAdmitted ? 'Something\'s wrong with those woods. Bram Hollis came in white as milk a few nights back. Burned things walking, the farmers say. I won\'t go. I\'m sorry. I won\'t.' : 'Don\'t care for the woods. Never have. Too many trees. You can\'t see what\'s coming.' },
    { id: 'come', label: 'Come and see her', show: (g) => g.quests.stage('sq_home') === 10,
      say: (g, npc) => {
        g.quests.set('sq_home', 20, g.day());
        npc.following = true;
        npc.def.stationary = false;
        g.flags.tamFollowing = true;
        return '*He stands up. It takes a while. He does not let you help.*\n\nI\'ve had eighty-four years to think of what to say to her, and I haven\'t got a single word ready. Isn\'t that a thing.\n\nAfter dark, then. She walks after dark. *He tucks the fox inside his coat, over his heart.* Lead on. And go slow — I\'m ninety-one, not nine.';
      } },
    { id: 'fox', label: 'The wooden fox', show: (g) => g.flags.tamAdmitted,
      say: (g) => g.quests.done('sq_home') ? 'She held it. Just for a moment, at the end. I felt her hand. *He closes his own hand around it.* I\'ll be buried with it. Not soon, mind. I\'ve a lot of sitting still to catch up on.' : 'Pa carved it from an apple bough the summer I was five. One ear\'s shorter than the other — he said it was listening for me. I\'ve never once taken it off. Not to bathe, not to marry, not to bury the Bruiants. Funny, for a boy who decided none of it happened.' },
    { id: 'chorrol', label: 'Chorrol', say: () => 'I\'ve watched four Counts and two Countesses come and go from that castle. The Great Oak hasn\'t changed. Neither has the beer.' },
    ...generic,
  ],
};

// ---------------------------------------------------------------- Wintersmeet
const snowTopics = [
  { id: 'wintersmeet', label: 'Wintersmeet', say: () => pick([
    'Wintersmeet\'s where the north road meets the snow. Half a day to Chorrol if the drifts are kind, two days to Bruma if they aren\'t. Folk stop here to thaw out before the pass, and some of them never leave. That\'s how we got Matilde.',
    'Seven houses, one inn, one tree, and more snow than you\'d think the sky could hold. We like it. Somebody has to.',
  ]) },
  { id: 'snow', label: 'The snow', say: () => pick([
    'It came early this year, and thick. Old Brynja says that means a hard winter. Old Brynja says that every year. She\'s been right forty years running.',
    'The Jerall send it down every autumn like clockwork. Keep to the road — the drifts in the woods will swallow you to the waist, and the wolves know it.',
  ]) },
];

DIALOGUE.sigrun = {
  greeting: (g) => pick([
    'Come in, come in, shut the door — you\'re letting the warm out! Sit by the fire. You look like a snowman somebody gave up on.',
    'Welcome to the Snow Hare! Mulled wine\'s on the hob, the beds are aired, and the fire hasn\'t gone out since the Emperor was a boy. Which Emperor, I couldn\'t tell you.',
    g.cell.id === 'snow_hare' && g.time.hours % 24 > 19 ? 'Evening! Grab a stool before Erlend starts on the one about the slaughterfish.' : 'Back again? Your stool\'s where you left it.',
  ]),
  topics: [
    { id: 'hare', label: 'The Snow Hare', say: () => 'Every winter, the first snowfall, a white hare comes and sits on our roof. Right on the ridge, bold as a Countess. My grandmother named the inn for her. Nobody\'s ever seen her come or go — she\'s just there one morning, and gone the morning the thaw comes. Brynja says she\'s a blessing of Kynareth. Erlend says she\'s a very confused hare. I say she\'s good for business.' },
    { id: 'wine', label: 'Mulled wine', say: () => 'Red wine, honey, cloves, a curl of orange peel from the Gold Coast — that\'s what costs — and one secret thing I\'ll take to my grave. Ten septims and it\'ll warm you from your ears to your toes. Want a cup? Barter, and I\'ll pour.' },
    { id: 'room', label: 'A room', say: () => 'Ten gold for the night, and that includes a hot stone for your feet. The beds by the hearth are yours once you\'ve paid. Snore quietly; Erlend doesn\'t.' },
    ...snowTopics, ...generic,
  ],
};

DIALOGUE.erlend = {
  greeting: () => pick(['*He holds up his hands about three feet apart.* It was THIS big. Don\'t look at me like that.', 'Sit, sit. You fish? No? Pity. A person who doesn\'t fish has no stories, only lies.', 'Ah! A new face. Good. Everyone else has heard all my stories. Some of them twice. Some of them were there.']),
  topics: [
    { id: 'fish', label: 'Ice fishing', say: () => 'You cut a hole in the pond, you drop a line, you sit, you wait. And you wait. And while you\'re waiting you think about your whole life, and your mother, and why you didn\'t marry that girl in Bruma. Then a fish bites and you forget all of it. Best thing in the world.' },
    { id: 'slaughterfish', label: 'The slaughterfish', say: () => '*He leans in.* Last winter. Middle of the night. Something takes my line so hard it pulls me flat on the ice. I hang on. It pulls. I pull. Three hours! And up through the hole comes a slaughterfish the size of a rowing boat, all teeth, looking at me like I owe it money.\n\n...And then the line broke. *He sits back.* So you\'ll have to take my word for it. Sigrun doesn\'t. Gunnar doesn\'t. But you will, won\'t you. You\'ve got an honest face.' },
    { id: 'stool', label: 'The stool by the pond', say: () => 'That stool has my name on it. Carved in. ERLEND. And still Gunnar sits on it. Says he can\'t read. He can read. He reads the price of firewood very well.' },
    ...snowTopics, ...generic,
  ],
};

DIALOGUE.gunnar = {
  greeting: () => pick(['Mind the woodpile. It\'s stacked just how I like it.', 'Snow\'s coming. Snow\'s always coming.', '*He leans on his axe and nods, once. For Gunnar, this is a speech.*']),
  topics: [
    { id: 'wood', label: 'Firewood', say: () => 'Every house in Wintersmeet burns my wood. Every hearth, every brazier, every pie in Matilde\'s oven. Without me this whole village is seven icicles and an inn. *He considers.* Write that down somewhere.' },
    { id: 'erlend', label: 'Erlend', say: () => 'He told you about the slaughterfish? *He sighs through his beard.* It was a boot. I was there. It was a boot with a fish in it. A small fish.' },
    ...snowTopics, ...generic,
  ],
};

DIALOGUE.matilde = {
  greeting: () => pick(['Sweetrolls! Hot sweetrolls! And bread, and apple cakes, if Gunnar hasn\'t eaten them all — oh! A customer. Hello!', 'Come and get them while they\'re warm — they don\'t stay warm long up here. Neither do I.', 'You\'ve got the look of someone who hasn\'t had a sweetroll in far too long.']),
  topics: [
    { id: 'bakery', label: 'The bakery', say: () => 'I came up from High Rock to cross the pass to Skyrim. Stopped at the Snow Hare for one night, ate one of Sigrun\'s honey cakes and thought: I can do better than that. That was eleven years ago. I still can\'t do better than that. But I keep trying, and everybody gets to eat the attempts.' },
    { id: 'sweetroll', label: 'Sweetrolls', say: () => 'The trick is the icing. Snow-cold butter, Gunnar\'s honey, and you beat it until your arm falls off. Then you beat it some more with the other arm. Three septims each, or four for ten if you don\'t tell Sigrun I gave you a deal.' },
    ...snowTopics, ...generic,
  ],
};

DIALOGUE.brynja = {
  greeting: () => pick(['*An old Nord woman in three shawls peers up at you.* Hm. Taller than the last one.', 'Hard winter coming. You can smell it.', 'You\'ve come up the north road. I can tell by your boots — they\'re still surprised.']),
  topics: [
    { id: 'tree', label: 'The fir tree', say: () => 'My grandfather\'s grandfather planted that fir when Wintersmeet was two huts and a goat. Every child born here gets a ribbon on its lowest branches. Mine\'s the white one at the bottom. It was red, once. Everything was, once.' },
    { id: 'kynareth', label: 'Kynareth', say: () => 'The Lady of the Sky sends the snow and the wind and the birds. You don\'t curse the snow up here, not even when it\'s up to your hips. You say thank you, and you shovel. That\'s prayer, in Wintersmeet.' },
    { id: 'hare', label: 'The white hare', say: () => 'Sigrun\'s hare? She\'s real enough. I\'ve seen her every first snow for seventy years. Same hare. Hares don\'t live seventy years. *She smiles with all of her remaining teeth.* Draw your own conclusions.' },
    ...snowTopics, ...generic,
  ],
};

// ---------------------------------------------------------------- The White Hare
const HQ = (g, q) => g.quests.stage(q);
const giftCount = (g) => ['fir_heartwood', 'glimmerfin', 'kynareth_loaf'].filter((id) => g.player.inventory.has(id)).length;

const sigrunGreet = DIALOGUE.sigrun.greeting;
DIALOGUE.sigrun.greeting = (g, npc) => {
  if (HQ(g, 'sq_hare1') === 0 && g.quests.stage('sq_hare5') === 0) return '*She is standing at the window, watching the snow come down, and does not turn round at once.* Oh — welcome, welcome. Forgive me. Shut the door, would you? It\'s just... it hasn\'t stopped in nine days.';
  if (HQ(g, 'sq_hare5') === 10) return '*She is already at the door, pulling it open on a clear, still night full of stars.* It stopped. It STOPPED. All at once, an hour ago, like someone closed a window. Tell me it was you.';
  if (HQ(g, 'sq_hare5') === 20) return 'Tonight! At the fir, seven till eleven. Wear something warm. Wear something festive. Wear both, it\'s Wintersmeet.';
  if (g.quests.done('sq_hare5')) return pick(['Every morning I go out and look up at the roof first thing. She\'s still there. Every morning.', 'The guest of honour! Your stool by the fire is yours for life. Erlend has been told.']);
  return sigrunGreet(g, npc);
};
DIALOGUE.sigrun.topics.unshift(
  { id: 'white_hare', label: 'The white hare', show: (g) => HQ(g, 'sq_hare1') === 0,
    say: (g) => {
      g.quests.set('sq_hare1', 10, g.day());
      return 'You\'ve heard about our hare? Every winter, the morning of the first snow, she\'s on the ridge of our roof. White as the snow, bold as you please, and there she stays until the thaw. My grandmother saw her. Her grandmother saw her. In the snowy years and the mild ones, in war and in plague, she has never once missed.\n\nThis year the first snow came three weeks early, and so thick you couldn\'t see the fir from the door. And the hare never came. And the snow hasn\'t stopped. Nine days. The woodpile\'s half gone, the north road\'s nearly shut, and Gunnar says the drifts on the pass are higher than his house.\n\nI know how it sounds. A grown woman fretting over a rabbit. But Brynja is frightened, and Brynja is never frightened. Will you talk to her? She knows more about that hare than anyone alive. She\'ll be out on the green — she always is, snow or no snow.';
    } },
  { id: 'hare_news', label: 'The white hare', show: (g) => HQ(g, 'sq_hare1') > 0 && HQ(g, 'sq_hare5') === 0,
    say: (g) => {
      const t = HQ(g, 'sq_hare4');
      if (t >= 10) return 'You\'re going up to that spire? On the mountain? In THIS? *She presses a cup of mulled wine into your hands and does not take no for an answer.* Drink that first. Then go.';
      if (HQ(g, 'sq_hare3') > 0) return 'Brynja has half the village running errands for her — Gunnar up the knoll, Erlend at his hole, Matilde up to her elbows in dough. It\'s the busiest I\'ve seen this place since the year the bridge washed out. Whatever it\'s for, I hope it works.';
      if (HQ(g, 'sq_hare2') > 0) return 'Varn Ice-Eye? *Her mouth goes thin.* He drinks here when he has coin, and I take it because coin is coin. He snared her? He SNARED her? I\'ll water his mead till the end of his days.';
      return 'Have you found Brynja yet? Out on the green, usually, talking to the fir tree. It doesn\'t answer. She doesn\'t mind.';
    } },
  { id: 'lightwatch', label: 'The snow has stopped', show: (g) => HQ(g, 'sq_hare5') === 10,
    say: (g) => {
      g.quests.set('sq_hare5', 20, g.day());
      return '*She listens to the whole story with both hands over her mouth.* A Battlemage. In the old spire. Keeping her in a CAGE, to make a winter to wall out the Daedra. And you went up through Kynareth\'s own wind and brought her out.\n\nRight. RIGHT. *She claps once, very loudly, and Erlend falls off his stool.* There\'s only one thing for it. We\'re keeping the Lightwatch. Tonight. It\'s the old festival of the first snow — we light the fir, Brynja sings the hymn, Matilde bakes until she falls over, Gunnar lets off the rockets he isn\'t supposed to have, and we watch the roof and wait for her to come home.\n\nSeven o\'clock, at the fir. You\'re the guest of honour. That means you can\'t be late and you can\'t leave early and you have to eat whatever Matilde gives you. Go and get warm. Go on!';
    } },
);

DIALOGUE.brynja.greeting = (g) => {
  if (HQ(g, 'sq_hare1') === 10) return '*She does not look away from the falling snow.* Sigrun sent you. Good. Someone has to go up the mountain, and my knees went up it for the last time in the reign of Pelagius.';
  if (HQ(g, 'sq_hare1') === 40) return 'You found something at the shrine. I can see it in your face. Show me.';
  if (HQ(g, 'sq_hare2') === 40) return '*She looks at your windburned face and nods slowly.* The spire threw you back. Yes. It would.';
  if (HQ(g, 'sq_hare3') > 0 && HQ(g, 'sq_hare3') < 100) return giftCount(g) >= 3 ? 'All three? Heartwood, Glimmerfin and the loaf. Come, come — give them here.' : `The gifts. ${giftCount(g)} of three. The fir, the fish, the loaf. Winter waits for no one, but it will wait for those three.`;
  if (g.quests.done('sq_hare5')) return pick(['She\'s on the roof. I looked. Every morning I look. Seventy-one years, and I still look.', 'You\'ll come back for next year\'s Lightwatch. That isn\'t a question.']);
  return pick(['*An old Nord woman in three shawls peers up at you.* Hm. Taller than the last one.', 'Hard winter coming. You can smell it.', 'You\'ve come up the north road. I can tell by your boots — they\'re still surprised.']);
};
DIALOGUE.brynja.topics.unshift(
  { id: 'missing_hare', label: 'The missing hare', show: (g) => HQ(g, 'sq_hare1') === 10,
    say: (g) => {
      g.quests.set('sq_hare1', 20, g.day());
      g.giveItem('brynja_hymn', 1);
      return 'She isn\'t a hare. Well — she is a hare, the way the Great Oak in Chorrol is a tree. But she\'s more. Kynareth sends her. The Lady of the Sky shakes the snow out of her sleeves every autumn, and the hare runs down the mountain ahead of it so that we know it\'s coming, and so that we know it\'s a blessing and not a curse. While she sits on that roof, the snow is kind. It falls, and it stops, and it lies soft.\n\nThis snow is not kind. It doesn\'t stop. It\'s angry, or it\'s being made to fall, and I don\'t know which is worse.\n\nIn summer she sleeps at the Skyward Shrine, up the slope north-west of the village — follow the cairns. If something has happened to her, it happened there. Go and look. And take this — the Lightwatch hymn. If you find her, sing it to her. Badly, if you must. She won\'t mind.';
    } },
  { id: 'shrine_find', label: 'What I found at the shrine', show: (g) => HQ(g, 'sq_hare1') >= 30 && HQ(g, 'sq_hare1') < 100 && g.player.inventory.has('hare_fur') && g.player.inventory.has('trap_tag'),
    say: (g) => {
      g.quests.set('sq_hare1', 100, g.day());
      g.quests.set('sq_hare2', 10, g.day());
      g.giveItem('gold', 50);
      return '*She takes the tuft of fur and holds it in her cupped hands, and in the shadow of her palms it glows.* Alive. She\'s alive. Thank the Lady.\n\nAnd this — *she turns the tag over and spits, neatly, into the snow.* Varn. Varn Ice-Eye. Traps anything with a pelt and sells it to anyone with a purse. He keeps a camp in the woods west of here, past the frozen stream. He drinks at the Snow Hare when he has money, and Sigrun lets him, Kynareth forgive her.\n\nYou won\'t have to search for his camp. Where something blessed has walked — or been carried — the snow remembers. Go back up to the shrine and look down the slope, west. You\'ll see. Here — fifty septims, from the village. We\'ll find more if you bring her home.';
    } },
  { id: 'wind', label: 'The wind around the spire', show: (g) => HQ(g, 'sq_hare2') === 40,
    say: (g) => {
      g.quests.set('sq_hare2', 100, g.day());
      g.quests.set('sq_hare3', 10, g.day());
      return 'That wind is the Lady\'s breath. Somebody has stolen it and wound it round that tower like a bandage, and nothing goes through it — not you, not me, not a bird. Not the Daedra either, I expect, and I expect that\'s the point.\n\nBut the old Nords who first came over the Jerall knew how to walk through Kynareth\'s wind. They braided a Wind-Charm, and the wind went round them like water round a stone. I know the rite. My grandmother taught me. I have never needed it. I need it now.\n\nIt wants three gifts of winter. Something old: heartwood from the Grandfather Fir, on the knoll east of the village — ask Gunnar, he knows that tree better than his own wife. Something living: a Glimmerfin, the silver fish that rises under the ice only at night — Erlend fishes the pond, though he\'ll tell you it\'s the sea. And something made with love: a Kynareth\'s loaf, baked with snowberries — Matilde will bake it, if you pick the berries yourself from the bushes round the pond. That part matters. Don\'t ask me why. Bring me all three.';
    } },
  { id: 'gifts', label: 'The three gifts', show: (g) => HQ(g, 'sq_hare3') >= 10 && HQ(g, 'sq_hare3') < 100,
    say: (g) => {
      if (giftCount(g) < 3) {
        const need = [];
        if (!g.player.inventory.has('fir_heartwood')) need.push('heartwood from the Grandfather Fir (Gunnar)');
        if (!g.player.inventory.has('glimmerfin')) need.push('a Glimmerfin from under the ice, at night (Erlend)');
        if (!g.player.inventory.has('kynareth_loaf')) need.push('a Kynareth\'s loaf with snowberries you picked yourself (Matilde)');
        return `Still wanting: ${need.join('; ')}. The snow doesn't care how long you take. I do, a little.`;
      }
      for (const id of ['fir_heartwood', 'glimmerfin', 'kynareth_loaf']) g.takeItem(id, 1);
      g.giveItem('wind_charm', 1);
      g.quests.set('sq_hare3', 100, g.day());
      g.quests.set('sq_hare4', 10, g.day());
      return '*She sits you down by the brazier on the green and works without speaking. The heartwood she splits with a little knife into four pale ribs. The Glimmerfin she thanks, out loud, before she scales it, and the scales she threads one by one on a cord pulled from her own grey braid. The loaf she breaks, and puts half of it into the brazier, where it burns with a smell of honey and summer. The other half she eats, and offers you a piece.*\n\n"The Lady gets half," she says, with her mouth full. "Nobody ever said which half."\n\n*When she is done, she puts the charm in your palm. In the wind off the mountain it begins, very softly, to hum.*\n\nWear it close. When you walk into the wind, it\'ll sing, and the wind will go round you. Go and bring her home.';
    } },
);

DIALOGUE.gunnar.topics.unshift(
  { id: 'fir', label: 'The Grandfather Fir', show: (g) => HQ(g, 'sq_hare3') >= 10 && HQ(g, 'sq_hare3') < 100 && !g.player.inventory.has('fir_heartwood') && !g.flags.heartwoodTaken,
    say: (g) => {
      g.flags.gunnarFir = true;
      return '*For a long moment he says nothing at all. Then he puts down his axe, which you have never seen him do.*\n\nBrynja\'s rite. Hm.\n\nThe Grandfather Fir. On the knoll, east, past the pond. Biggest tree you\'ll ever see. Lightning split it when my father was a boy. There\'s a branch it threw down that night, still lying in the snow. Seventy years and it hasn\'t rotted. Heartwood\'s red as a fox. Take your piece from that. Not from the tree. Never from the tree.\n\nAnd mind the wolves. They den under its roots in a hard winter. *He picks the axe back up.* That\'s all.';
    } },
);
DIALOGUE.erlend.topics.unshift(
  { id: 'glimmerfin', label: 'The Glimmerfin', show: (g) => HQ(g, 'sq_hare3') >= 10 && HQ(g, 'sq_hare3') < 100 && !g.player.inventory.has('glimmerfin'),
    say: (g) => {
      if (g.player.inventory.has('lucky_lure')) return 'Night-time, the hole by the pond, my lure on the line, and patience. Eight in the evening until four in the morning. They\'re shy of the sun, Glimmerfins. Shy of everything, really. Like me, with women.';
      g.giveItem('lucky_lure', 1);
      return '*His face lights up like a brazier.* A GLIMMERFIN. Oh, now you\'re talking my language. Silver as a new septim, and they glow, they actually glow, like a candle under the ice. They only come up in the dark. Never by day. Brynja wants one for her rite, eh? Then you\'ll want this.\n\n*He unpins a little bone lure from his hat and presses it into your hand as if it is made of gold.*\n\nMy lucky lure. Caught every fish worth catching in this pond. Go out to my hole after dark — eight till four — drop the line, and wait. And if you see anything the size of a rowing boat, you come and get me.';
    } },
);
DIALOGUE.matilde.topics.unshift(
  { id: 'loaf', label: 'Kynareth\'s loaf', show: (g) => HQ(g, 'sq_hare3') >= 10 && HQ(g, 'sq_hare3') < 100 && !g.player.inventory.has('kynareth_loaf'),
    say: (g) => {
      if (g.player.inventory.count('snowberry') < 5) return `A Kynareth's loaf! Oh, I haven't baked one since my first winter here. Honey, flour, a scoring of the four winds on top — and snowberries. Brynja always says the berries have to be picked by whoever's asking for the loaf, or it doesn't count. The bushes grow round the frozen pond, past the stall: little blue berries under the snow. Bring me five. You have ${g.player.inventory.count('snowberry')}.`;
      g.takeItem('snowberry', 5);
      g.giveItem('kynareth_loaf', 1);
      return '*She tips the berries into a bowl that is already full of dough, as if she has been waiting for exactly this, and in a whirl of flour and elbows and humming the loaf is shaped, scored with a cross of four winds, and slid into the brick oven at the back of the stall. You wait. It smells like the best morning of your life.*\n\nThere. Kynareth\'s loaf. Don\'t eat it! It\'s for the Lady. *She pauses.* I baked a second one, by accident, for me. That one I\'m eating.';
    } },
);

DIALOGUE.varn = {
  greeting: (g) => {
    if (HQ(g, 'sq_hare2') >= 30) return 'You got what you came for. Now get off my snow.';
    return pick(['*A big grizzled Nord looks up from scraping a pelt, and his one pale, clouded eye looks up a second later.* Lost? Go back the way you came.', 'Nothing here for you. Unless you\'re buying fox.', 'Mind the snares. Or don\'t. Saves me setting new ones.']);
  },
  topics: [
    { id: 'hare', label: 'The white hare', show: (g) => HQ(g, 'sq_hare2') >= 10 && HQ(g, 'sq_hare2') < 30 && !g.flags.varnTalked,
      say: () => 'Hare? Lots of hares in these woods. Brown ones, white ones. Snow hares go white in winter, didn\'t your mother tell you? *He goes back to his scraping, harder than before.* Don\'t know anything about any particular hare.' },
    { id: 'tag', label: 'This tag has your name on it', show: (g) => HQ(g, 'sq_hare2') >= 10 && HQ(g, 'sq_hare2') < 30 && g.player.inventory.has('trap_tag') && !g.flags.varnTalked,
      say: (g) => {
        g.flags.varnTalked = true;
        return '*He looks at the tag for a long time.* So I set a snare at the old shrine. No law against it. Caught something. Sold it. No law against that either.\n\n*He spits.* And before you ask: no. I don\'t say who buys from me. Man who talks about his buyers doesn\'t have buyers for long. Not unless he\'s given a very good reason.';
      } },
    { id: 'pay', label: 'Pay him for the name (100 gold)', show: (g) => HQ(g, 'sq_hare2') >= 10 && HQ(g, 'sq_hare2') < 30 && g.flags.varnTalked,
      say: (g) => {
        if (g.player.inventory.gold < 100) return 'A hundred. You haven\'t got a hundred. Come back when you have, or don\'t.';
        g.player.removeItem('gold', 100);
        g.audio.play('gold');
        return g.varnTalks();
      } },
    { id: 'curse', label: 'That hare is Kynareth\'s', show: (g) => HQ(g, 'sq_hare2') >= 10 && HQ(g, 'sq_hare2') < 30 && g.flags.varnTalked,
      say: (g, npc) => {
        if (npc.disposition < 55 && (g.player.ch.skills.speechcraft || 0) < 35) return '*He laughs, but it is a short laugh.* Kynareth\'s. Sure. And I\'m the Emperor\'s cousin. (He doesn\'t believe you enough. Win him round, or find another way.)';
        return '*His hand stops on the pelt.* ...It glowed. In the cage, all the way up the mountain. Hummed, like. And it hasn\'t stopped snowing since, has it. Not once. *He rubs his clouded eye.* My mother used to leave milk out for the snow hare. Gods. All right. All right.\n\n' + g.varnTalks();
      } },
    { id: 'threat', label: 'Tell me, or else', show: (g) => HQ(g, 'sq_hare2') >= 10 && HQ(g, 'sq_hare2') < 30,
      say: (g, npc) => {
        setTimeout(() => { npc.faction = 'monster'; npc.hostileToPlayer = true; npc.setTarget(g.player); npc.say('Or else what? I skin things for a living, friend!', true); }, 60);
        return '*He stands up, and keeps standing up for longer than you expected. He reaches for his axe.*';
      } },
    { id: 'trade', label: 'Your trade', say: () => 'Fox, wolf, the odd snow bear if I\'m feeling lucky. Bruma pays best, Chorrol pays fastest, the Imperial City pays in promises. I don\'t do promises.' },
    ...generic,
  ],
};

DIALOGUE.cassius = {
  greeting: (g, npc) => {
    if (npc.uid === 'cassius_home') return pick(['*He is sitting by the Snow Hare\'s fire with a cup of mulled wine he keeps forgetting to drink, watching the window.* She\'s still on the roof. I keep checking. Sigrun says that\'s normal here.', 'Brynja has been teaching me the hymn. I am, she says, the worst singer she has heard in seventy years. I feel this is progress.']);
    if (g.flags.cassiusSpared) return 'Go on. Open it. She\'s been looking at you since you came in, not at me.';
    return '*An old man in a grey Legion cloak stands beside a cage of frost, one hand resting on the bars as if to comfort whatever is inside. His other hand is wreathed in cold blue light.* So the charm worked. I wondered if the old woman still knew the rite. Come no closer, please. I would very much rather not hurt you.';
  },
  topics: [
    { id: 'why', label: 'Why the hare?', show: (g, npc) => npc.uid === 'cassius' && !g.flags.cassiusSpared,
      say: (g) => {
        if (HQ(g, 'sq_hare4') < 50) g.quests.set('sq_hare4', 50, g.day());
        return 'Because the Daedra are made of fire. Have you seen them? Of course you have, everyone has seen them now. Scamps, clannfear, the Dremora with their burning blades — every one of them Dagon\'s fire given legs. I have watched a scamp step into a snowbank and scream like a kettle.\n\nShe is Kynareth\'s. While she sits in that cage, the winter does what I tell it. One more month and the snow will stand twenty feet deep from the Jerall to the Great Forest, and no Gate will open in it, and nothing that burns will ever come over it. Bruma will live. Chorrol will live. Wintersmeet will live.\n\nCold. They will be cold. But they will be alive, which is more than I can say for Kvatch.';
      } },
    { id: 'kvatch', label: 'Kvatch', show: (g, npc) => npc.uid === 'cassius' || g.flags.cassiusHome,
      say: () => 'I was a Battlemage of the Fourth Legion, retired to Kvatch to grow old and grow grapes. I was in the Count\'s hall when the Gate opened. I held the north stair for an hour with nothing but frost and a broken sword. I watched the city burn down to its stones. I watched the Count go into the fire after his son.\n\nI walked out with forty people. There were eight thousand in that city. *His voice does not change at all.* I have done the arithmetic many times.' },
    { id: 'closed', label: 'The Gates can be closed. I closed one.', show: (g, npc) => npc.uid === 'cassius' && !g.flags.cassiusSpared && HQ(g, 'sq_hare4') >= 50 && !!g.flags.gateClosed,
      say: (g, npc) => {
        g.ui.queueAfterDialogue = () => g.cassiusRelents(npc);
        return '*He stares at you.* The Gate at Kvatch. They said it closed. They said someone walked into it. I thought — I thought it was a story the soldiers told to keep their nerve. *He takes his hand off the cage, slowly, the way you take your hand off a wound.*\n\nYou went IN. Into the fire. And you came out, and it shut behind you. Then it can be done. Then it is not hopeless. Then I am not the only wall.\n\n*He sits down, very suddenly, on the cold stone, and for a while he does not say anything at all.*';
      } },
    { id: 'hymn', label: 'Read him the Lightwatch hymn', show: (g, npc) => npc.uid === 'cassius' && !g.flags.cassiusSpared && HQ(g, 'sq_hare4') >= 50 && g.player.inventory.has('brynja_hymn'),
      say: (g, npc) => {
        g.ui.queueAfterDialogue = () => g.cassiusRelents(npc);
        return '*You read the old hymn out loud. Lady of the high air... we have swept the step, we have banked the fire, we have lit the lamp. Let her find the way. You stumble on the last line.*\n\n*He says it with you. "Light the way home." His mouth keeps moving after the words stop.*\n\nMy mother sang that. In Bruma, when I was a boy, every first snow, we stood in the street with candles and watched the rooftops. I had forgotten. Seventy years in the Legion and I had forgotten. *He looks at the cage as if he has only just seen what is in it.*\n\nShe was meant to come home. And I put her in a box to save a town that has been waiting for her at its window for nine days. What have I done. What have I DONE.';
      } },
    { id: 'kill', label: 'Your winter will kill Wintersmeet', show: (g, npc) => npc.uid === 'cassius' && !g.flags.cassiusSpared && HQ(g, 'sq_hare4') >= 50,
      say: (g, npc) => {
        if ((g.player.ch.skills.speechcraft || 0) < 40 && npc.disposition < 70) return '*He flinches, then squares his shoulders.* A hard winter. They have had hard winters. They will have harder. Better cold than ash. (He isn\'t ready to hear it. Something closer to his heart might reach him.)';
        g.ui.queueAfterDialogue = () => g.cassiusRelents(npc);
        return 'Nine days of snow, you said. The woodpile half gone. The road nearly shut. *He goes quiet.* Twenty feet of snow. No road. No wood. No bread coming up from Chorrol. I made the arithmetic for the Daedra and forgot to make it for the people.\n\n*He looks at his own hand, wreathed in frost, as if it belongs to someone else.* I would have saved them the way Kvatch was saved. Gods help me. All right. All right. Let her go.';
      } },
    { id: 'fight', label: 'Then I\'ll take her from you', show: (g, npc) => npc.uid === 'cassius' && !g.flags.cassiusSpared && HQ(g, 'sq_hare4') >= 50,
      say: (g, npc) => {
        setTimeout(() => g.cassiusFights(npc), 60);
        return '*The light in his hand turns from blue to white.* I held the north stair at Kvatch for an hour. I can hold this one. Forgive me.';
      } },
    { id: 'staying', label: 'Wintersmeet', show: (g, npc) => npc.uid === 'cassius_home',
      say: () => 'Sigrun has given me the little room over the kitchen and a job carrying wood for Gunnar, who has not said a word to me in a week. I think it is the friendliest silence I have ever received. I go up to the shrine some mornings. To say sorry. The Lady has not answered, but the snow has been very kind.' },
  ],
};

// ---------------------------------------------------------------- A Crown of Starflowers
DIALOGUE.hob = {
  greeting: (g) => {
    const st = g.quests.stage('sq_pup');
    if (st === 0) return '*A weathered old Imperial in a patched coat leans on a walking stick beside a painted wagon. Around his feet tumble three golden puppies.* Mind your boots, friend — that one\'s a chewer. Oh, too late. He likes you. He likes everybody, but he likes you most, you can tell by the drool.';
    if (st === 20 || (st === 10 && g.player.inventory.count('starflower') >= 10)) return 'Is that — ten? Ten starflowers! Bring them here, bring them here.';
    if (st === 10) return `How's the picking going? ${g.player.inventory.count('starflower')} of ten, by the look of your hands. They grow all over this meadow — little pale-blue ones. Easiest to spot at dusk, when they start to glow.`;
    if (g.quests.done('sq_pup')) return pick([`How's ${g.flags.dogName || 'the pup'}? Feeding them right? Not too much cheese, now. Cheese makes them sing.`, 'Honey misses that one, I think. She keeps counting them. Two. Two. She looks at me like I\'ve lost one in a pocket.', 'Every road\'s a good road with a dog on it. My father said that. My father had eleven dogs and no house.']);
    return pick(['Lovely day for walking. They\'re all lovely days for walking, if you\'re walking with the right company.', 'Pots mended, knives sharpened, stories told. Two of those are free.']);
  },
  topics: [
    { id: 'puppies', label: 'The puppies', show: (g) => g.quests.stage('sq_pup') === 0,
      say: (g) => {
        g.quests.set('sq_pup', 10, g.day());
        g.countStarflowers();
        return 'Honey\'s litter. Five weeks old, three of them left, and every one of them a menace. The big one there\'s decided you\'re his, and when a pup decides, there\'s no arguing — I should know, Honey decided on me fifteen years ago in a ditch outside Skingrad and I\'ve been hers ever since.\n\nYou can have him, and gladly. But it\'s got to be done properly. In my family, a pup goes off to its new home wearing a crown of starflowers — ten of them, woven into a ring, so it never forgets the meadow it was born in. My mother did it, and hers did, and I\'ll not be the one to stop.\n\nTrouble is my back. I bend down to pick a flower these days, I\'m down there till spring. They grow all over this meadow: little pale-blue things with a golden heart, five petals. They glow a bit at dusk. Pick me ten and I\'ll weave the crown.';
      } },
    { id: 'flowers', label: 'Ten starflowers', show: (g) => g.quests.stage('sq_pup') >= 10 && g.quests.stage('sq_pup') < 100,
      say: (g) => {
        const n = g.player.inventory.count('starflower');
        if (n < 10) return `${n} of ten. Keep at it — they're all round the wagon, in the long grass. Look for the blue.`;
        g.takeItem('starflower', 10);
        g.ui.queueAfterDialogue = () => g.adoptPuppy();
        return '*He lowers himself onto the wagon step with a creak and a groan, and his old fingers fly — stem over stem, a twist, a tuck — until there\'s a small ring of pale-blue flowers in his palm. He whistles once, and the big pup comes bounding over, all paws and ears, and sits as if it has been practising.*\n\nThere. Hold still, you lump. *He settles the crown round the pup\'s neck.* Now. He\'s yours, and you\'re his. Only thing left is a name.';
      } },
    { id: 'honey', label: 'Honey', say: () => 'Fifteen years old and still the best dog in Cyrodiil. She found me, you know, not the other way round. I was lying in a ditch feeling sorry for myself and she sat on me until I stopped. Best thing that ever happened to me. Second best is the wagon.' },
    { id: 'wandering', label: 'Your travels', say: () => 'I mend pots, sharpen knives, and walk. Bravil to Bruma, Skingrad to Cheydinhal, and round the lake more times than I can count. A man who stays still gets old. A man who walks gets old too, but he sees more on the way.' },
    ...generic,
  ],
};

// ---------------------------------------------------------------- Ten White Rabbits
const RABBITS = ['Fluff', 'Other Fluff', 'Snowball', 'Lord Thumpington', 'Dave', 'Nibbles', 'Big Ears', 'Small Ears', 'Crumpet', 'Moonpie'];
const BQ = (g) => g.quests.stage('sq_bunnies');

DIALOGUE.snikkit = {
  greeting: (g) => {
    const st = BQ(g);
    if (g.quests.done('sq_bunnies')) return pick(['*Snikkit is sitting in the snow with his chin in his hands, watching a white rabbit nibble something a little way off.* That one is Dave. Dave came back to visit. Dave is Snikkit\'s favourite. Do not tell the others.', 'Snikkit is going to be a rabbit-watcher now. Not a rabbit-catcher. A WATCHER. It is a much better job. Nobody shouts.']);
    if (st === 50 || st === 55) return '*He is hopping from foot to foot.* You are back! You are alive! Is Snikkit... is Snikkit going in the pot?';
    if (st >= 30 && st < 50) return 'Pie? Is there pie yet? Snikkit has been thinking about the pie. Not eating it. Just thinking. Hurry, before Snikkit thinks too hard.';
    if (st >= 20) return pick(['*He is whispering to the cage.* ...and Lord Thumpington gets the extra carrot because he is the bravest, yes he is...', 'You came back. Good. Snikkit was worried you were a stew-person after all.']);
    return '*A small, scrawny goblin leaps up from beside an iron cage, brandishing a dagger the size of a butter knife, and then immediately hides behind the cage.* GO AWAY! These are NOT rabbits! They are... snow. Very fluffy snow. With ears.';
  },
  topics: [
    { id: 'rabbits', label: 'The rabbits', show: (g) => BQ(g) < 20 && !g.flags.rabbitsFreed,
      say: (g) => {
        g.quests.set('sq_bunnies', 20, g.day());
        return '*His ears droop until they are nearly horizontal.* ...They are rabbits. Ten of them. White ones. Snikkit caught them, one by one, for weeks, with his own snares and his own two hands, because the Chief said.\n\nChief Gorbag Skullsnow of the Frostfang. Biggest goblin in the Jerall. The Moonfeast is coming, and the Chief wants white-rabbit stew, and the Chief said: Snikkit, you are small and quick and useless, bring me ten white rabbits by Moonfeast or YOU are the stew.\n\nSo Snikkit caught them. And then Snikkit fed them. And then Snikkit named them. ' + RABBITS.join(', ') + '. Moonpie is the little one.\n\n*He wipes his nose on his arm.* Snikkit cannot put Moonpie in a stew. Snikkit cannot go in a stew either. Snikkit is stuck. Unless... you are big. You have the face of a clever-person. Will you help Snikkit fool the Chief?';
      } },
    { id: 'help', label: '"I\'ll help you fool the Chief."', show: (g) => BQ(g) === 20,
      say: (g) => {
        g.quests.set('sq_bunnies', 30, g.day());
        g.giveItem('snikkit_token', 1);
        return '*He punches the air so hard he falls over.* YES! Snikkit has a plan. Snikkit has had a plan for days but no one to do it.\n\nThe Chief does not know what rabbit tastes like. Nobody in the Frostfang has ever caught one — they are too fast and too white and the snow is too white. So: we give him a stew that is NOT rabbit but TASTES like rabbit, and he says "mmm, rabbit", and everybody lives!\n\nThe big humans in the village with the tree. One of them makes the pies. Snikkit smells them from here when the wind is right. Ask the pie-human for a pie that tastes like rabbit. Then take it to Frostfang Hollow, east of here, and give it to the Chief.\n\nTake this. *He presses a chewed bone into your hand.* Snikkit\'s Mark. Show it, and the Frostfang will not stab you. Probably. Do not stab them first. That always makes them stab back.';
      } },
    { id: 'fight', label: '"Hand over those rabbits."', show: (g) => BQ(g) === 20 || BQ(g) === 30 || BQ(g) === 40,
      say: (g, npc) => {
        setTimeout(() => g.provokeBand(npc), 60);
        return '*His face crumples, and then hardens, which on a goblin his size is mostly a matter of eyebrows.* No. NO. You will have to go through Snikkit! Snikkit is VERY SMALL BUT VERY BITEY!';
      } },
    { id: 'chief', label: 'Chief Gorbag', show: (g) => BQ(g) >= 20 && BQ(g) < 50,
      say: () => 'Gorbag is the biggest goblin in the Jerall. He has a bone in his hair. It is someone else\'s bone. He shouts a lot. He likes shiny things and loud things and stew, mostly stew. He is not very clever, but he is very, very big, and those two things go together better than you would think.' },
    { id: 'free', label: 'You\'re free', show: (g) => BQ(g) === 50 || BQ(g) === 55,
      say: (g) => {
        g.ui.queueAfterDialogue = () => g.releaseRabbits('blessing');
        return BQ(g) === 50
          ? '*He goes very still.* The Chief ate it? All of it? And said "rabbit"? *A slow, enormous grin spreads across his face, showing every one of his eleven teeth.* Snikkit is not stew. Snikkit is NOT STEW!\n\nThen they do not need the cage. Come. Come and watch.'
          : '*He stares at you.* The Chief is... dead? Gorbag? Big Gorbag? *He thinks about this for a long time.* Snikkit is not sad. Snikkit thought Snikkit would be sad. Snikkit is mostly hungry.\n\nWell. Then nobody needs rabbit stew. Come. Come and watch.';
      } },
    { id: 'names', label: 'Their names', show: (g) => !g.flags.rabbitsFreed,
      say: () => 'Fluff is the oldest. Other Fluff looks like Fluff but is a different rabbit, Snikkit is very sure. Snowball bites. Lord Thumpington stamps when he is cross, which is always. Dave is just Dave. Nibbles eats the cage. Big Ears and Small Ears are brothers. Crumpet is round. Moonpie is the littlest and the best and if you tell the others Snikkit will deny it.' },
    { id: 'after', label: 'The rabbits', show: (g) => !!g.flags.rabbitsFreed,
      say: () => 'They are all over the snow now, the whole white hills, all the way to the big human village. Some of them have had babies already. Rabbits are very good at that. Snikkit has started naming the babies. Snikkit is up to forty-one.' },
  ],
};

DIALOGUE.gorbag = {
  greeting: (g) => {
    if (BQ(g) >= 50) return pick(['*He pats his enormous belly.* Pie-human! The stew-bringer! Gorbag still dreams of that stew. When you bring more stew?', 'Moonfeast was BEST Moonfeast. Gorbag makes you honorary Frostfang. You get nothing. It is an honour.']);
    if (!g.player.inventory.has('snikkit_token')) return '*A huge goblin in a bear-skull helm rises from a throne of stacked crates.* WHO walks into Frostfang Hollow without Mark? Smells like spy. Smells like LUNCH.';
    return '*A huge goblin in a bear-skull helm looks you up and down, then at the chewed bone in your hand.* Hrm. Snikkit\'s Mark. Snikkit is small and useless. Why does big thing carry useless Mark?';
  },
  topics: [
    { id: 'pie', label: 'Present the "rabbit stew"', show: (g) => BQ(g) === 40 && g.player.inventory.has('mock_rabbit_pie'),
      say: (g, npc) => {
        if (!g.player.inventory.has('snikkit_token')) {
          setTimeout(() => g.provokeBand(npc), 60);
          return '*He sniffs the pie, then you.* No Mark. Stranger bring food to Gorbag\'s camp? Poison! SPY! FROSTFANG, TO ME!';
        }
        g.takeItem('mock_rabbit_pie', 1);
        g.ui.queueAfterDialogue = () => g.gorbagFeast(npc);
        return '*You set the steaming pie in front of him. His nostrils flare. His eyes go wide. Every goblin in the Hollow stops what it is doing.*\n\nThis is... rabbit? White rabbit? From Snikkit? *He breaks off a piece of crust the size of a shield and shoves it in his mouth. He chews. He chews for a long time.*';
      } },
    { id: 'snikkit', label: 'About Snikkit', show: (g) => BQ(g) >= 20 && BQ(g) < 50,
      say: () => 'Snikkit! Snikkit owes Gorbag ten white rabbits for Moonfeast. Snikkit brings rabbits, Snikkit lives. Snikkit does not bring rabbits, Snikkit is rabbit. Very simple. Gorbag is a very fair chief.' },
    { id: 'fight', label: '"Snikkit is under my protection."', show: (g) => BQ(g) >= 20 && BQ(g) < 50,
      say: (g, npc) => {
        setTimeout(() => g.provokeBand(npc), 60);
        return '*He laughs, a sound like a landslide, and reaches for an enormous mace.* Then big thing goes in the pot WITH Snikkit! More stew for everybody! FROSTFANG!';
      } },
    ...generic,
  ],
};

// Gunnar knows the rabbits have gone
DIALOGUE.gunnar.topics.unshift({ id: 'snow_rabbits', label: 'Snow rabbits', show: (g) => BQ(g) === 0 && !g.flags.rabbitsFreed,
  say: (g) => {
    g.quests.set('sq_bunnies', 5, g.day());
    return '*He scowls at the woods.* None. Not one. Every winter the white rabbits come down out of the hills and I snare a few for the pot. This winter, every snare empty, and not a track in the snow.\n\nExcept goblin tracks. Little ones. North-east, in the hills past the Grandfather Fir. Saw one carrying a sack. The sack squeaked.';
  } });
DIALOGUE.gunnar.topics.unshift({ id: 'rabbits_back', label: 'The rabbits are back', show: (g) => !!g.flags.rabbitsFreed,
  say: () => 'Seen them. White rabbits in every hollow from here to the Spire, more than I can remember. *He pauses.* Haven\'t set a snare since. Don\'t know why. Getting soft.' });

// Matilde bakes the decoy
DIALOGUE.matilde.topics.unshift({ id: 'mock_pie', label: 'Mock Rabbit Pie', show: (g) => BQ(g) === 30,
  say: (g) => {
    const inv = g.player.inventory;
    const have = [inv.count('potato') >= 2, inv.count('snowberry') >= 3, inv.count('venison') >= 1];
    if (!have.every(Boolean)) return `A pie that tastes like rabbit but has no rabbit in it? For a goblin chief? *She stares at you, then laughs so hard she has to sit down on a flour sack.* Oh, I have to make this. I HAVE to.\n\nThe trick is venison, cooked slow with snowberries — they give it that sweet, wild taste — and potato to make it rich. Bring me two potatoes, three snowberries and a cut of venison. Sigrun sells potatoes and venison at the Snow Hare; the berries grow round the frozen pond. (You have: potatoes ${inv.count('potato')}/2, snowberries ${inv.count('snowberry')}/3, venison ${inv.count('venison')}/1.)`;
    g.takeItem('potato', 2); g.takeItem('snowberry', 3); g.takeItem('venison', 1);
    g.giveItem('mock_rabbit_pie', 1);
    g.quests.set('sq_bunnies', 40, g.day());
    return '*She works like a whirlwind: the venison sizzling in butter, the snowberries popping in the pan, the potatoes mashed rich and golden, everything folded into a crust the size of a cartwheel and crimped all round with her thumbs. When it comes out of the oven, the whole stall smells exactly, uncannily, like rabbit stew.*\n\nThere. Mock Rabbit Pie. No rabbits were harmed in the making of this pie. *She hands it over with a wink.* Tell your goblin he owes me a recipe for something. Anything. Goblins must cook something.';
  } });

// ---------------------------------------------------------------- The Greenheart
const MQ = (g) => g.quests.stage('sq_moot');
const greenTopics = [
  { id: 'greenheart', label: 'The Greenheart', say: () => pick([
    'When the Bosmer came north with the Alessians, a few of us would not leave the trees behind. So the trees came too. Y\'ffre told the forest a story about a little Valenwood in the snows of the north, and the forest believed it. That was three thousand years ago. It is still believing.',
    'Outside, you have oaks you can put your arms around. Here, we have oaks you can put a town around. We have done exactly that.',
  ]) },
  { id: 'green_pact', label: 'The Green Pact', say: () => 'We do not harm living wood or green things — not to build, not to burn, not to carve. Everything you see here was grown, or fallen, or asked for. We eat meat, only meat, and we eat all of it. The chipmunks are safe, though. Too small. Too fast. Too annoying.' },
];

DIALOGUE.eranwe = {
  greeting: (g) => {
    if (g.moot) return 'Quiet! You are on the clock!';
    if (MQ(g) === 20) return '*She lowers her bow and grins, every one of her sharp teeth showing.* Ten. TEN. You did not even hit one twice. Come here, outlander.';
    if (g.quests.done('sq_moot')) return pick(['Has the Hart come when you called? It will. It always comes for someone who has shot straight in the Grove.', 'The chipmunks still talk about you. In a bad way.']);
    if (MQ(g) === 10) return 'Ready? The Grove is ready. The chipmunks are always ready. That is the whole problem.';
    return '*A wiry Bosmer with an enormous bow leans against a stump, watching a chipmunk on a branch watch her back.* An outlander in the Greenheart. And you carry yourself like you might know which end of an arrow to hold. Do you?';
  },
  topics: [
    { id: 'moot', label: 'The Chipmunk Moot', show: (g) => MQ(g) === 0,
      say: (g) => {
        g.quests.set('sq_moot', 10, g.day());
        if (!g.player.inventory.has('practice_bow')) g.giveItem('practice_bow', 1);
        g.giveItem('blunt_arrow', 40);
        return 'Every child of Falinor sits the Moot before they are allowed a real bow. Here is how it goes. The Tumbling Grove fills with chipmunks — Y\'ffre\'s little tricksters, fast as rumour and twice as rude. I play my song. Before the song ends, you must tag ten of them with blunted arrows. Blunted, mind. The Green Pact does not cover chipmunks, but I do.\n\nTake this practice bow, and these — the knobbed arrows. Tag ten, and I will teach you something no outlander has learned in a hundred years: how to call a Spirit Hart of the Greenheart, who walks beside the worthy and closes their wounds.\n\nTell me when you are ready. And do not chase them. You will never catch a chipmunk by chasing it. Be still. Be patient. Be quicker than they think you are.';
      } },
    { id: 'begin', label: '"I\'m ready. Start the Moot."', show: (g) => MQ(g) === 10 && !g.moot && g.cell.id === 'greenheart',
      say: (g, npc) => {
        g.ui.queueAfterDialogue = () => g.startMoot(npc);
        return '*She lifts a little bone flute to her lips and winks.* Arrow on the string, outlander. The song is short. The chipmunks are not slow. Begin!';
      } },
    { id: 'rules', label: 'The rules', show: (g) => MQ(g) === 10,
      say: () => 'Ten tags before my song ends — two minutes, near enough. Only arrows count; I want to see your aim, not your boots. Any arrow will do but use the blunted ones, or the Treethane will have words with both of us. If you miss the song, no shame: we try again. Most children need six tries. One needed forty. He is now our best archer. Do not tell him I said so.' },
    { id: 'reward', label: 'The Spirit Hart', show: (g) => MQ(g) === 20,
      say: (g) => {
        g.quests.set('sq_moot', 100, g.day());
        if (!g.player.spells.includes('spirit_deer')) g.player.spells.push('spirit_deer');
        g.giveItem('gold', 75);
        g.ui.notify('You learned Summon Spirit Hart.');
        g.audio.play('chime', 1);
        return '*She takes your hand, turns it palm-up, and draws on it with one fingertip — a circle, an antler, a spiral — and the lines glow green where she drew them.*\n\nThe Hart is the Greenheart\'s own spirit. It does not fight; it does not need to. It walks beside you, and while you bleed, it mends you. Call it when the fight is bad, and it will come. Call it when the fight is good, and it will come anyway, and look at you reproachfully.\n\nYou shot well. The chipmunks will be complaining about you for a generation. That is the highest honour Falinor has.';
      } },
    { id: 'eranwe_self', label: 'Your bow', say: () => 'Grown, not made: a bough the Great Tree let fall the year I was born. I have missed with it once, in 3E 391. There is a plaque. I hate the plaque.' },
    ...greenTopics, ...generic,
  ],
};

DIALOGUE.velandil = {
  greeting: () => pick(['*An ancient Bosmer woman in a robe of living moss looks down at you from the ring of the Great Tree.* Welcome, outlander. Few come through the Elder. Fewer leave wanting to.', 'The Tree says you smell of snow. Have you been north? Of course you have. Everything here is north, from where we started.']),
  topics: [
    { id: 'falinor', label: 'Falinor', say: () => 'Falinor is the town of the Great Tree, and the Great Tree is Falinor. Forty of us, and two hundred chipmunks, and one very old tree who has heard every argument we have ever had. I am the Treethane, which means I listen to the arguments first.' },
    { id: 'elder', label: 'The Hollow Elder', say: () => 'The door you came through. Y\'ffre left it open so that we would never forget the world outside, and so that the world outside would never quite forget us. Most who find it think they dreamed us afterwards. I hope you will not.' },
    ...greenTopics, ...generic,
  ],
};

DIALOGUE.mirieth = {
  greeting: () => pick(['Arrows! Bows! Meat, smoked, salted, or still arguing! What do you need, outlander?', 'You look like someone who has been tagging chipmunks. Buy more arrows. You will need more arrows.']),
  topics: [
    { id: 'wares', label: 'Your wares', say: () => 'Arrows from our own fletchers — goose and owl feather, never cut from a living thing. Bows grown from fallen boughs. Potions the Treethane brews. And meat. We are Bosmer. There is always meat.' },
    ...greenTopics, ...generic,
  ],
};

DIALOGUE.falinor_folk = {
  greeting: () => pick(['Y\'ffre\'s light on you, outlander.', 'Mind the roots. They move when you are not looking. Probably.', 'Have you sat the Chipmunk Moot yet? I sat it eleven times. Eleven.', 'Do not climb the Great Tree without asking. Ask the tree, I mean.']),
  topics: [...greenTopics, ...generic],
};

// ---------------------------------------------------------------- The Admiral (Brinewhistle Cove)
const CQ = (g, q) => g.quests.stage(q);
// Grumm's insults, and the retorts the rest of the crew will teach you (the last you earn on the Captain's armchair)
export const INSULTS = [
  { insult: 'My grandmother had a sharper wit than you, and she was a barnacle.', retort: 'That explains the family resemblance.', from: 'odette' },
  { insult: 'I\'ve seen sardines with more courage than you!', retort: 'And you ate them all, by the look of you.', from: 'odette' },
  { insult: 'When I\'m done with you, they\'ll use you as a mop!', retort: 'Good. Then this deck will finally get cleaned.', from: 'jzhirr' },
  { insult: 'Your knots are so loose the tide unties them!', retort: 'At least my knots don\'t come with a pom-pom.', from: 'jzhirr' },
  { insult: 'Not even the Admiral would sit on you!', retort: 'She did, this morning. Ask her.', from: 'lap' },
];
const COVE_RUMORS = [
  'The Herring hasn\'t moved in eleven years. The Captain says she\'s "resting between voyages". The gulls say she\'s a house.',
  'Never sit in the sunny spot on the Herring\'s rail. It\'s in the Articles. It\'s the most enforced article we have.',
  'Fog over the Gullstack some nights. Green lights in it. Odette says it\'s marsh-gas. Odette says a lot of things in a very firm voice.',
  'Don\'t go in the Drowned Grotto. There\'s a mudcrab in there the size of a rowboat. Grumm named her. Grumm names everything.',
  'J\'zhirr navigates by the stars, he says. Mostly he navigates by naps.',
];
const learnRetorts = (g, from) => {
  const known = (g.flags.retorts ||= []);
  const fresh = INSULTS.map((x, i) => [x, i]).filter(([x, i]) => x.from === from && !known.includes(i));
  for (const [, i] of fresh) known.push(i);
  if (fresh.length) g.ui.notify(`Retort${fresh.length > 1 ? 's' : ''} learned.`);
  return fresh.map(([x]) => `When he says: "${x.insult}"\nYou say: "${x.retort}"`).join('\n\n');
};
const crewChat = { id: 'rumors', label: 'Rumors', say: () => pick(COVE_RUMORS) };

DIALOGUE.gallowglass = {
  greeting: (g, npc) => {
    if (npc.uid === 'gallowglass_pier') return '*The Captain stands at the end of the pier with his old cabin-boy\'s scarf knotted at his throat, staring into the fog.* Ready when you are, Cat\'s-Paw. The boat\'s the one with the cat painted on it. They all have cats painted on them. The small one.';
    if (npc.uid === 'gallowglass_follow') return '*He keeps his voice low.* She\'s in the stern cabin. I can hear her. I\'d know that voice under the sea. I HAVE known it, under the sea, every night for forty years.';
    const c1 = CQ(g, 'sq_cat1');
    if (c1 < 20) return '*A big man in a magnificent red coat sits slumped at his chart table, the coat so thick with orange cat hair that it is mostly orange. His eyes are red. He is holding a very small hat.* Arr. Arrr. ...Sorry. I haven\'t slept. What d\'you want?';
    if (c1 < 60) return pick(['Any sign of her? Any sign at all? I put her fish out. She didn\'t eat it. SOMEONE ate it. It was Grumm.', '*He is holding the tiny bicorne to his chest.* She\'s never been gone this long. Not even the time with the seagull.']);
    if (CQ(g, 'sq_cat5') >= 30 && !g.flags.namingNightDone) return '*He is crouched by the sea chest, enormous and tearful, making small noises at the kittens.* Four of them. FOUR. Look at their little FEET.';
    if (g.flags.namingNightDone) return pick(['Cat\'s-Paw! The Admiral\'s asleep on the rail and the kittens are asleep on the Admiral. It\'s the best day of my life. Every day is, now.', 'Arr. That\'s a happy "arr". You can tell by the beard.']);
    if (CQ(g, 'sq_cat3') >= 30 && CQ(g, 'sq_cat4') < 100) return '*He has not taken off his coat. He has not sat down. He looks out of the porthole at the fog.* She\'s out there. I know where she is. I\'ve always known where she is.';
    return pick(['Ahoy, Cat\'s-Paw. The Admiral\'s on the rail, the sun\'s out, and the sea\'s exactly where I left it.', '*He is brushing the Admiral, who is pretending not to enjoy it.* Who\'s a terror of the Abecean? Who\'s a FEARSOME little — oh, it\'s you. Arr.']);
  },
  topics: [
    { id: 'admiral', label: 'The Admiral', show: (g, npc) => npc.uid === 'gallowglass' && CQ(g, 'sq_cat1') < 20,
      say: (g) => {
        if (CQ(g, 'sq_cat1') < 10) g.quests.set('sq_cat1', 10, g.day());
        g.quests.set('sq_cat1', 20, g.day());
        return 'Admiral Marmalade. Commander of the Indignant Herring, by the Articles. Orange. Dignified. Large — don\'t tell her I said large. Two days gone. TWO DAYS. I\'ve not eaten. I\'ve not slept. I threatened to keelhaul the sea, and the sea just sat there.\n\n*He wipes his nose on a sleeve that leaves an orange streak.* Ask the crew who saw her last. Odette\'s at the Mitten, Grumm\'ll be on the beach knitting, and J\'zhirr\'s up by the lighthouse "navigating". Find her and there\'s a reward. A big one. I\'ll think of what.';
      } },
    { id: 'back', label: 'She\'s back', show: (g, npc) => npc.uid === 'gallowglass' && CQ(g, 'sq_cat1') === 60,
      say: (g) => {
        g.ui.queueAfterDialogue = () => g.admiralComesHome();
        return '*He lets out a noise no pirate has made before or since and gets down on his knees on the planks.* ADMIRAL! Oh, you terrible, wonderful — come here — come to — *The Admiral walks past his outstretched arms and sits down on your foot.*\n\n*A long silence.*\n\nEleven years. ELEVEN YEARS I\'ve fed you. *He stands, with great dignity, and does not look at you.* ...Fine. FINE. She likes you. Marvellous.\n\n*Then he sees the collar in your hand, and all the colour goes out of his face.* Where did you — no. Never mind. I don\'t want to know. Put that away.\n\n*He counts out fifty septims, very carefully, the way a man counts when he\'s thinking about something else.* Your reward. And — since she\'ll sit by you — the crew\'ll want you. Read the Articles. All of them. Especially seven.';
      } },
    { id: 'trials', label: 'The Three Trials', show: (g, npc) => npc.uid === 'gallowglass' && CQ(g, 'sq_cat2') >= 10 && CQ(g, 'sq_cat2') < 40,
      say: (g) => {
        const left = [!g.flags.trialSardine && 'TRIBUTE — the Admiral eats one thing as tribute, and J\'zhirr knows what it is', !g.flags.trialLap && 'PATIENCE — ask Odette, and mind my armchair', !g.flags.trialTongues && 'TONGUES — beat Grumm at insult duelling, which nobody has done since the Siege of Anvil Docks'].filter(Boolean);
        return 'Article Twelve. The Admiral\'s trials. She set them herself — well, I wrote them down, but she was there, and she didn\'t object, which is how she signs things.\n\nStill to do:\n — ' + left.join(';\n — ') + '.';
      } },
    { id: 'done', label: 'The trials are done', show: (g, npc) => npc.uid === 'gallowglass' && CQ(g, 'sq_cat2') === 40,
      say: (g) => {
        g.ui.queueAfterDialogue = () => g.catsPawCeremony();
        return '*He actually smiles.* All three? Tribute paid, patience proven, and Grumm out-insulted? Grumm\'s been sulking on the beach for an hour. That\'s how I knew.\n\nThen it\'s official. All hands! ALL HANDS! *Nobody comes. He clears his throat.* ...The Admiral will see you on deck.';
      } },
    { id: 'collar', label: 'The brass collar', show: (g, npc) => npc.uid === 'gallowglass' && g.player.inventory.has('crumpet_collar') && CQ(g, 'sq_cat3') < 40,
      say: () => '*He doesn\'t look at it.* It\'s an old collar. The sea throws up old things. There\'s nothing to — I said put it AWAY, Cat\'s-Paw. *Then, quieter:* Please.' },
    { id: 'fog', label: 'The fog', show: (g, npc) => npc.uid === 'gallowglass' && CQ(g, 'sq_cat3') >= 10 && CQ(g, 'sq_cat3') < 20,
      say: () => 'It comes in after dark, off the Gullstack. Smells of wet rope and old pipe smoke. I\'ve only smelled that once before. *He looks at the Admiral, then at the door, then at the Admiral.* Stay the night in the cove, would you? Humour an old sailor. I\'d feel better with a Cat\'s-Paw on the beach.' },
    { id: 'brisk', label: 'Mother Brisk', show: (g, npc) => npc.uid === 'gallowglass' && CQ(g, 'sq_cat3') === 40,
      say: (g) => {
        g.quests.set('sq_cat3', 50, g.day());
        return '*He sits down very slowly, the way a ship settles on a sandbar.* Fennick\'s right. A ginger lad, and he cried a great deal. It was me.\n\nI was twelve. Cabin boy on the Dread Meringue, Mother Brisk\'s ship. Best captain on the Abecean, and she had a cat — Crumpet — orange as a sunset, with one white sock, and meaner than a customs officer. The night we hit the Gullstack, Mother put Crumpet in my arms and said, "Get her to the jolly boat, Rourke. Don\'t you let go."\n\n*His big hands open and close on nothing.* The water was black and cold, and she was fighting me, and I... I let go. I felt her go. I made the boat. Nobody else did.\n\nForty years I\'ve kept orange cats. I tell myself it\'s because I like them. *He laughs, wetly.* The Meringue only sails in fog, and you can\'t see her at all without a drowned light. Her crew carried ghost-lanterns. Green ones. Ask the skeleton — he\'ll know where his went.';
      } },
    { id: 'lantern', label: 'The ghost-lantern', show: (g, npc) => npc.uid === 'gallowglass' && CQ(g, 'sq_cat3') === 70,
      say: (g) => {
        g.quests.set('sq_cat3', 100, g.day());
        g.flags.jollyReady = true;
        g.quests.set('sq_cat4', 10, g.day());
        g.applyCoveWorld?.();
        return '*He looks at the green flame for a long while. Then he reaches up to a nail over the chart table, where a faded blue scarf has hung for so long it has a shape, and ties it round his throat with a sailor\'s knot.*\n\nI\'m not twelve any more. We row tonight. Meet me at the jolly boat at the end of the pier after dark, and bring that light. *He tries to say something else, and settles for:* Arr.';
      } },
    { id: 'row', label: 'Let\'s row out', show: (g, npc) => npc.uid === 'gallowglass_pier' && CQ(g, 'sq_cat4') >= 10 && CQ(g, 'sq_cat4') < 100,
      say: (g) => g.player.inventory.has('ghost_lantern') ? 'Then get in the boat. You row. I\'ll hold the lantern up and try not to be sick. A pirate captain who gets seasick. Don\'t tell the crew. The crew know.' : 'Not without the ghost-lantern, Cat\'s-Paw. We\'d row in circles till dawn.' },
    { id: 'kittens', label: 'Kittens!', show: (g, npc) => npc.uid === 'gallowglass' && CQ(g, 'sq_cat5') === 30,
      say: (g) => {
        g.quests.set('sq_cat5', 40, g.day());
        return '*He is already crying.* She wasn\'t lost. Either time. She was looking for somewhere SAFE. In MY sea chest. On Grumm\'s wool. Oh, he\'s going to be unbearable about this.\n\n*He stands up and wipes his face with the whole of his sleeve.* There\'ll be a Naming Night. Tonight, at the fire on the beach, at sundown — between seven and eleven. The whole crew. Every last hand, and the skeleton. And you\'ll stand at the front, Cat\'s-Paw. That\'s an order. From me. Not from her. She\'s busy.';
      } },
    { id: 'herring', label: 'The Indignant Herring', show: (g, npc) => npc.uid === 'gallowglass',
      say: () => 'Finest ship on the Abecean, once. Ran aground eleven years ago in a fog, chasing a merchant cog that turned out to be a whale. We\'ve been "refitting" since. *He pats the hull.* She\'ll sail again. When the Admiral says so.' },
    crewChat,
  ],
};

DIALOGUE.odette = {
  greeting: (g) => {
    if (CQ(g, 'sq_cat1') >= 20 && CQ(g, 'sq_cat1') < 30) return '*A tall Redguard woman stirs an enormous pot with — you look twice — a ladle where her left hand should be. The right is a hook.* You\'re looking for the cat. Everyone is looking for the cat. Sit down, have some stew, and I\'ll tell you about the cat.';
    return pick(['Stew\'s on. Stew\'s always on. Don\'t ask what\'s in it, and I won\'t ask what you\'ve been fighting.', '*She raps the counter with her ladle.* Two-Hooks Lark. First mate, cook, and the only one here who can read a tide table.', 'Wipe your boots. This was a ship before it was a tavern, and it was a tidy ship.']);
  },
  topics: [
    { id: 'seen', label: 'Have you seen the Admiral?', show: (g) => CQ(g, 'sq_cat1') >= 20 && CQ(g, 'sq_cat1') < 30,
      say: (g) => {
        g.quests.set('sq_cat1', 30, g.day());
        g.giveItem('smoked_herring', 1);
        g.applyCoveWorld?.();
        return 'Seen her? She robbed me. Day before yesterday, bold as brass — hopped on the galley table, took a whole smoked herring in her jaws, looked me in the eye, and waddled out the door with it. West, along the beach. Took her a quarter of an hour to get out of sight.\n\n*She hooks a second herring off the rack and hands it to you.* Here. For luring. She\'ll come to fish when she won\'t come to the Captain. Look for the prints in the sand past the last shack.';
      } },
    { id: 'more', label: 'Another smoked herring?', show: (g) => CQ(g, 'sq_cat1') >= 30 && CQ(g, 'sq_cat1') < 50 && !g.player.inventory.has('smoked_herring'),
      say: (g) => { g.giveItem('smoked_herring', 1); return '*She sighs and hooks down another.* That\'s the last free one. After that it\'s three septims, same as the gulls pay.'; } },
    { id: 'lap', label: 'The Lap', show: (g) => CQ(g, 'sq_cat2') >= 10 && CQ(g, 'sq_cat2') < 100 && !g.flags.trialLap,
      say: () => 'The Trial of Patience. Simplest thing in the world, and nobody can do it. Go into the Herring, sit in the Captain\'s armchair, and wait for the Admiral to choose your lap. She will. Then you hold still while she goes to sleep.\n\nAnd I mean STILL. You twitch, you scratch, you so much as think about your dinner, and she\'s off, and she\'ll hold it against you. Grumm tried eleven times. He sneezed.' },
    { id: 'insults', label: 'Insults', show: (g) => CQ(g, 'sq_cat2') >= 10 && !g.flags.trialTongues,
      say: (g) => {
        const t = learnRetorts(g, 'odette');
        return t ? '*She leans on the counter.* Duelling Grumm? Then you\'ll want ammunition. He always opens with his grandmother, and he always does the sardine one when he\'s losing.\n\n' + t + '\n\nJ\'zhirr knows a couple more, if you can keep him awake long enough.' : 'I\'ve told you all mine. J\'zhirr has the rest. And for the last one — well. Sit in the Captain\'s chair and you\'ll find out.';
      } },
    { id: 'hooks', label: 'Your hooks', say: () => '*She holds up the ladle.* Lost the hand to a shark off Stros M\'Kai. Lost the other to a different shark off Stros M\'Kai. Same day. I don\'t go to Stros M\'Kai any more. The Captain had the ladle made for me. Best present I ever got.' },
    { id: 'captain', label: 'The Captain', say: () => 'Rourke Gallowglass is the softest man who ever flew a black flag. He once surrendered a whole prize ship because the merchant captain\'s cat looked sad. Don\'t tell him I said so. Don\'t tell him I said "once", either.' },
    crewChat,
  ],
};

DIALOGUE.grumm = {
  greeting: (g) => {
    if (g.flags.trialTongues) return pick(['*He is knitting furiously.* Don\'t talk to me. I\'m knitting my feelings.', 'Rematch. Some day. When I\'ve thought of better ones. ...I\'ve been thinking for a week.']);
    return pick(['*A huge Orc sits on an upturned boat, knitting something very small and very orange.* Mind the wool.', 'Grumm gro-Shank. Bosun. Undefeated insult champion of the Abecean Sea. Also I knit.', '*He holds up a tiny jumper.* For the Admiral. She won\'t wear it. She never wears them. I keep making them.']);
  },
  topics: [
    { id: 'seen', label: 'Have you seen the Admiral?', show: (g) => CQ(g, 'sq_cat1') >= 20 && CQ(g, 'sq_cat1') < 60,
      say: () => 'Not since the day before yesterday. She\'s been funny lately. Fat — fatter — and grumpy, and sleeping in odd places. In the bread oven. In my boot. And she keeps pulling the wool out of my basket and running off with it. Half a skein of good Skingrad orange, gone.\n\n*He frowns at the basket.* You don\'t think she\'s taken up knitting?' },
    { id: 'duel', label: 'The insult duel', show: (g) => CQ(g, 'sq_cat2') >= 10 && !g.flags.trialTongues,
      say: () => 'The gentleperson\'s swordfight. No blades, no blood — just wit. I insult you, you answer. Good answer and the insult bounces off. Bad answer and you\'re done. Three in a row and you beat me, which you won\'t.\n\nI\'m not teaching you any answers, mind. That\'d be cheating. Ask around. Then come back and say "I challenge you", if you dare.' },
    { id: 'challenge', label: 'I challenge you!', show: (g) => CQ(g, 'sq_cat2') >= 10 && !g.flags.trialTongues,
      say: (g, npc) => {
        g.ui.queueAfterDialogue = () => g.insultDuel(npc);
        return '*He puts down his knitting, cracks his knuckles one at a time, and stands up, and up, and up.* On guard.';
      } },
    { id: 'gone', label: 'The Admiral\'s run off again', show: (g) => CQ(g, 'sq_cat5') === 10,
      say: (g) => {
        g.quests.set('sq_cat5', 20, g.day());
        return '*He is staring into his basket.* All my wool\'s gone. ALL of it. Every skein. Even the stripy one I was saving.\n\n*He points, mournfully, at a trail of orange fluff and little paw prints leading straight back up the beach and in through the door of the Herring.* She went that way. With my stripy one.';
      } },
    { id: 'knitting', label: 'Your knitting', say: () => 'My mum taught me. Orcs knit, you know. Long winters in the Wrothgarians. You either knit or you fight, and you can\'t fight all winter. *He holds up something orange with four sleeves.* That\'s a jumper for the Admiral. Four sleeves. Took a while to work out.' },
    crewChat,
  ],
};

DIALOGUE.jzhirr = {
  greeting: (g) => pick(['*A lean Khajiit lies on the lighthouse steps with his eyes closed and a sextant on his chest.* This one is navigating. Do not disturb.', 'You want the cat? Everyone wants the cat. No one wants J\'zhirr. J\'zhirr is ALSO a cat.', '*He opens one eye.* The stars are where they were. The sea is where it was. Navigation complete.']),
  topics: [
    { id: 'seen', label: 'Have you seen the Admiral?', show: (g) => CQ(g, 'sq_cat1') >= 20 && CQ(g, 'sq_cat1') < 60,
      say: () => 'She is a cat. Cats go where they go. This one would know, being ALSO a cat.\n\n*He sniffs.* She went west, toward the old arch on the beach. This one smelled herring on the wind. Stolen herring. The worst kind of herring, and also the best.' },
    { id: 'rank', label: 'The Admiral outranks you?', show: (g) => CQ(g, 'sq_cat1') >= 20,
      say: () => 'Article One. The Admiral outranks all hands. J\'zhirr has read the Articles many times, looking for the part where it says "except J\'zhirr, who is also a cat, and a navigator, and has thumbs". It is not there. J\'zhirr has written it in, in pencil. Odette rubs it out.' },
    { id: 'sardine', label: 'The Golden Sardine', show: (g) => CQ(g, 'sq_cat2') >= 10 && !g.flags.trialSardine,
      say: (g) => {
        if (g.player.inventory.has('proper_hook')) return 'Off the end of the pier. At dawn — between five and eight. The golden sardine comes up with the sun, and goes down when the gulls wake. Patience. You will catch plain herring first. Many plain herring.';
        g.giveItem('proper_hook', 1);
        return 'The Trial of Tribute. The Admiral accepts only one tribute: the golden sardine, which runs in the shallows off the end of the pier at dawn, between five and eight. Shines like a coin. Tastes like — J\'zhirr does not know what it tastes like. J\'zhirr has never been ALLOWED.\n\n*He unpins a brass hook from his collar and holds it out, then doesn\'t let go of it for a moment.* This is a PROPER hook. Bring it back.';
      } },
    { id: 'insults', label: 'Insults', show: (g) => CQ(g, 'sq_cat2') >= 10 && !g.flags.trialTongues,
      say: (g) => {
        const t = learnRetorts(g, 'jzhirr');
        return t ? 'Grumm\'s insults? J\'zhirr has heard them all, many times, through the floor of the Mitten. Here. Insult him with his own boredom.\n\n' + t : 'J\'zhirr has given you everything. Even the hook. Go away and win, so J\'zhirr can nap.';
      } },
    { id: 'stars', label: 'Navigation', say: () => 'The trick of navigation is this: know where you are, know where you are going, and have a nap in between. J\'zhirr has never lost a ship. J\'zhirr has never been allowed to steer one either. These facts are probably related.' },
    crewChat,
  ],
};

DIALOGUE.fennick = {
  greeting: (g) => {
    if (CQ(g, 'sq_cat4') >= 60) return '*The skeleton in the barrel waves a bony hand.* Is it done, then? Is Mother at rest? I felt the Meringue go. Like a tide going out inside my ribs. Very restful. I may have a little nap myself. In about forty years.';
    return pick(['*A skeleton in a barrel, draped in seaweed, raises its hat — it doesn\'t have a hat — raises its HAND, politely.* Good evening. I am so very sorry about the raid.', 'Fishbones Fennick, gunner\'s mate of the Dread Meringue, formerly. Currently, a barrel. Mind the drip.', 'Lovely evening. I think. I\'ve rather lost my sense of evenings.']);
  },
  topics: [
    { id: 'where', label: 'Where is the Admiral?', show: (g) => CQ(g, 'sq_cat3') >= 30 && CQ(g, 'sq_cat3') < 40,
      say: (g) => {
        if (CQ(g, 'sq_cat3') < 35) g.quests.set('sq_cat3', 35, g.day());
        g.quests.set('sq_cat3', 40, g.day());
        return 'Aboard the Meringue, I\'m afraid, with Mother Brisk. Do sit down — no, there\'s nowhere to sit. Sorry.\n\nMother thinks your Admiral is HER cat. Crumpet. Crumpet went down with the ship forty years ago when we struck the Gullstack, and Mother\'s been searching ever since. Can\'t rest without her. None of us can. We go where Mother goes. Then this fog came up and she saw an orange cat on a ship\'s rail and — well. Ghosts see poorly in daylight, and worse in fog, and all orange cats look alike to the dead.\n\nThere was a cabin boy, you know. Mother gave Crumpet to him to carry to the boat. Ginger lad. Cried a great deal. Never did find out what became of him.';
      } },
    { id: 'lantern', label: 'A ghost-lantern', show: (g) => CQ(g, 'sq_cat3') === 50,
      say: (g) => {
        g.quests.set('sq_cat3', 60, g.day());
        return 'A drowned light! Oh, yes, we all had one. Mother\'s orders: a light that burns in any weather, so the Meringue could always find her crew. Mine went when I washed up in that sea cave in the west cliffs — the Drowned Grotto, your lot call it. Left it on a rock, beside a lady of some size.\n\n*He lowers his voice, which makes no sense for a skull.* She pinches.';
      } },
    { id: 'meringue', label: 'The Dread Meringue', say: () => 'Finest ship that ever sailed the Abecean. Forty guns, three masts, and a figurehead of Mother Brisk holding a cat. The cat was the scary part. We sank on a clear night — fog came out of nowhere, and the Gullstack came out of the fog. Mother always said she\'d sail till she found Crumpet. Mother always meant what she said.' },
    { id: 'legs', label: 'Your legs', say: () => 'Somewhere off the Gullstack, I imagine, having a lovely time. I hope they\'re together. They were always close.' },
  ],
};

DIALOGUE.brisk = {
  greeting: (g) => {
    if (g.flags.briskRested) return '*She is fading, smiling, a cat in her arms.*';
    return '*A tall woman made of fog and green light sits in a great carved chair, a tricorn on her head, stroking the Admiral, who sits rigid on her lap with an expression of profound personal insult.* Who\'s this, then? Come to steal my Crumpet back? Over my dead body. *She considers.* Over my second dead body.';
  },
  topics: [
    { id: 'give', label: 'Give her back', show: (g) => !g.flags.briskRested,
      say: () => 'Give her BACK? She\'s mine. Forty years I\'ve sailed in circles through every fog on the Abecean looking for this cat, and I find her sitting on a beached HULK with a fat old fool feeding her fish off a silver plate. She was wasted on him. She\'s home now. Aren\'t you, my precious, my terror, my — ow. She bit me. She always bit me. That\'s how I know.' },
    { id: 'not', label: 'That\'s not Crumpet', show: (g) => !g.flags.briskRested,
      say: () => 'Of course it\'s Crumpet. Orange. Fat. Rude. Hates being held. *She holds the Admiral up at arm\'s length in the green gloom, squinting.* ...She\'s put on weight. And lost a sock. Cats do that. Forty years in the sea, you\'d lose a sock.' },
    { id: 'crumpet', label: 'Show her Crumpet', show: (g) => !g.flags.briskRested && !!g.flags.crumpetFound,
      say: (g, npc) => {
        g.ui.queueAfterDialogue = () => g.briskRests(npc, 'crumpet');
        return '*You step aside. Behind you, glowing faintly in the dark of the cabin, a small orange cat with one white sock sits down, curls her tail round her feet, and looks at Mother Brisk.*\n\n*Mother Brisk goes absolutely still.*\n\n...Crumpet?\n\n*The ghost-cat crosses the floor in three unhurried steps, jumps up onto her lap, shoulders the Admiral off it, and turns round twice. The Admiral lands on the deck with a thump and stalks over to you, outraged.*\n\nThere you are. There you ARE, you terrible animal. Where have you BEEN?';
      } },
    { id: 'rourke', label: 'Let Rourke speak', show: (g) => !g.flags.briskRested && !g.flags.rourkeRefused && CQ(g, 'sq_cat3') >= 50 && g.cell.actors.some((a) => a.uid === 'gallowglass_follow' && !a.dead),
      say: (g, npc) => {
        const ok = g.player.inventory.has('crumpet_collar') || (g.player.ch.skills.speechcraft || 0) >= 40;
        const intro = '*The Captain steps past you, takes off his hat, and stands there in the green light with his old blue scarf at his throat.*\n\n"Mother. It\'s me. It\'s Rourke. The cabin boy." *She stares.* "You got old," she says.\n\n"I let go of her, Mother. In the water. You told me not to, and I let go. I\'m sorry. I\'ve been sorry every day."\n\n';
        if (!ok) { g.flags.rourkeRefused = true; return intro + '*Mother Brisk looks at him for a long time.* Sorry doesn\'t bring her back, boy. And here she is, back. I\'m not letting go of her twice. *She pulls the Admiral closer.* (She isn\'t convinced. Something of Crumpet\'s own might reach her — or another way.)'; }
        g.ui.queueAfterDialogue = () => g.briskRests(npc, 'rourke');
        return intro + (g.player.inventory.has('crumpet_collar') ? '*You hold out the old brass collar. Mother Brisk takes it and turns it over in her fog-grey fingers.* She never let me put it on her. Not once. She\'d have it off in a minute and hide it in the bilge.\n\n' : '') + '*She looks down at the Admiral, properly, for the first time.* ...This isn\'t Crumpet. Is it. Crumpet had a white sock. Crumpet never sat still this long in her life.\n\n*She lifts the Admiral off her lap, gently, and sets her down.* You were twelve, Rourke. You were twelve years old in black water. I should never have asked it. *Her voice cracks like an old hull.* Find my girl for me, if you can. And keep my hat. The wind keeps taking it anyway.';
      } },
    { id: 'fight', label: 'Then I\'ll take her from you', show: (g) => !g.flags.briskRested,
      say: (g, npc) => {
        setTimeout(() => g.briskFights(npc), 60);
        return '*She stands, and keeps standing, until her tricorn brushes the beams.* ALL HANDS! REPEL BOARDERS!';
      } },
  ],
};

// ---------------------------------------------------------------- The Hollow King (the Mages Guild of Chorrol)
const MG = (g, q) => g.quests.stage(q);
const speech = (g) => g.player.ch.skills.speechcraft || 0;

DIALOGUE.teekeeus.topics.unshift(
  { id: 'hall', label: 'The Guild hall', show: (g) => MG(g, 'sq_mg1') < 10,
    say: (g) => {
      g.quests.set('sq_mg1', 10, g.day());
      g.giveItem('ward_token', 1);
      g.giveItem('guild_supplies', 1);
      return '*The Argonian\'s crest flattens.* Nine days. Nine days Teekeeus has sold spells in the rain while the hall stands warm and empty. Not empty. Sealed. The Magister says "a scrying accident". Teekeeus has been in the Guild forty years. Teekeeus knows what an accident sounds like, and it does not sound like knocking on the shutters at night.\n\n*He presses a disc of blue glass into your hand.* This morning a note came under the door. The Magister asks for "someone who can be trusted with fire". The ward will let through whoever carries this token. Take them the crate, too. They will be out of tea. A Guild without tea is a Guild without hope.';
    } },
  { id: 'hall_after', label: 'The Guild', show: (g) => MG(g, 'sq_mg1') >= 100,
    say: (g) => g.flags.mgMagister ? 'Magister! *He bows so low his crest touches the cobbles.* Teekeeus always said you had the look. Teekeeus said it to nobody, but he said it.' : 'The hall is open again. Teekeeus can sell spells INDOORS. You do not know what this means to a lizard in a Chorrol autumn.' },
);

DIALOGUE.ondine = {
  greeting: (g, npc) => {
    if (npc.uid === 'ondine_follow') return pick(['Keep the Ember up. The dark down here is older than it looks.', '*She is muttering the founders\' rite under her breath, over and over, like a woman checking her pockets for keys.*', 'Forty years in this Guild and I have never been this far from a library.']);
    if (g.flags.mgMagister) return pick(['Magister. *She says it with a straight face, and then doesn\'t quite manage it.* Tea?', 'The pool shows only the sky now. I keep looking anyway.']);
    if (MG(g, 'sq_mg1') <= 20 && !g.flags.mgLamps) return '*A tall Breton woman in a frost-stiffened robe looks up from beside a pool of black ice, holding a teacup in both hands as if it were the last warm thing in the world.* You came. And you brought — is that tea? Teekeeus, you magnificent lizard. Sit. No, don\'t sit, everything is frozen to everything. Stand near the lamps. They don\'t work either.';
    return pick(['*She is watching the pool.* It is never quite still. Have you noticed? Even frozen.', 'Ondine Vell. Magister of this Chapter for nineteen years, and of this icebox for nine days.']);
  },
  topics: [
    { id: 'pool', label: 'The pool', show: (g, npc) => npc.uid === 'ondine' && MG(g, 'sq_mg1') >= 20 && !g.flags.mgLamps,
      say: () => 'The Founders\' Pool. Every Chapter has a scrying basin; ours is older than the Chapter itself. Nine days ago Bastien was on watch — Bastien Lorne, my best apprentice, eighteen and too clever by a mile — and the pool froze, all at once, like a breath held. And something looked up out of the ice at him.\n\nHe came to me white as paper and said a skeleton in a crown had looked at him and smiled. By morning he was gone. I sealed the hall that night, with all of us inside, in case whatever looked out could also look in.\n\nThe Warding Lamps round the pool went out the same night. They won\'t take an ordinary flame. Merle knows more about the lamps than I do. She reads the boring books.' },
    { id: 'key', label: 'The study key', show: (g, npc) => npc.uid === 'ondine' && MG(g, 'sq_mg1') >= 30 && MG(g, 'sq_mg1') < 100 && !g.player.inventory.has('guild_study_key') && !g.player.inventory.has('guild_charter'),
      say: (g) => { g.giveItem('guild_study_key', 1); return 'The Charter? It\'s in my study, in the case on the desk. *She works a long brass key off her chain.* Nobody has read it in forty years except to check the founders spelled their own names right. If it tells you how to light those lamps, I will read it every night for the rest of my life.'; } },
    { id: 'flame', label: 'The Founders\' Flame', show: (g, npc) => npc.uid === 'ondine' && MG(g, 'sq_mg1') === 50,
      say: (g) => {
        g.ui.queueAfterDialogue = () => g.guildMembership();
        return '*She stands at the edge of the pool for a long time, looking into the blue-white fire, before she says anything.*\n\nThen it is true. All of it. The Charter\'s margin, the old Arch-Mage\'s riddles, the lamps nobody was allowed to let go out.\n\nThe first Magister of this Chapter was a man called Severin Ashgrave. Brilliant. Kind, they say, once. He believed a mind was the only thing in the world worth keeping, and he found a way to keep his: he split his soul into three Hearts of black ice and became a lich. His own friends — Corve, Stonevoice, Thalindor, the names on our Charter — sealed him under the Jerall Mountains, in the halls he had dug for himself. They could not kill him while his Hearts beat. And they could not break the Hearts, because the only fire hot enough to do it is THIS one, and they had not yet lit it. So they hid the Hearts, one each, as far apart as they could, and swore never to say where.\n\nThe seal is failing. The Gates thin everything. And the face in the ice was his.\n\n*She dips a little Guild lantern into the flame, and the flame comes up out of the pool into the glass as if it had been waiting to be asked.*';
      } },
    { id: 'bastien', label: 'Bastien', show: (g, npc) => npc.uid === 'ondine' && MG(g, 'sq_mg2') === 50,
      say: (g) => {
        g.quests.set('sq_mg2', 100, g.day());
        if (!g.player.spells.includes('sunbolt')) g.player.spells.push('sunbolt');
        g.flags.mgHearts = true;
        g.quests.set('sq_mg3', 10, g.day());
        g.applyPersistentState?.(g.cell);
        g.ui.notify('You learned Sunbolt.');
        return '*She reads Aldous\'s translation twice. Then she folds it very small and puts it in her sleeve.*\n\nNot taken. Fetching. *She looks at the empty cot by the window.* I should have seen it. He never could leave a locked door alone. Neither could I, at his age.\n\nThe Spire, the Ruin, the Hollow. The Rime Spire, in the north — Hrolfa Stonevoice built a watchtower there. Vilverin, the Ayleid ruin by the lake — Thalindor loved the old elves. And Corve sealed hers in a cave under the Jerall, which on a modern map is — *she squints* — Frostfang Hollow. Goblins. Of course it is goblins.\n\nTake this. *White fire gathers in her palm and jumps to yours.* Sunbolt. The dead hate it more than they hate anything. Find the Hearts before he does. Hold each one up in the Ember\'s light, and break it.';
      } },
    { id: 'hearts', label: 'The Hearts', show: (g, npc) => npc.uid === 'ondine' && MG(g, 'sq_mg3') === 40,
      say: (g) => {
        g.ui.queueAfterDialogue = () => g.ondineJoins();
        return 'Two broken, and the third in Bastien\'s hands, going north-east to his master. *She is already pulling on a travelling cloak.*\n\nThe Hollow Gate is under the Jerall past Frostfang Hollow. It opens only to the founders\' rite and the founders\' fire, and I am the only living person who knows the rite, because I spent last night learning it off the back of the Charter.\n\nI\'m coming with you. Don\'t argue. I made that boy an apprentice. I\'ll bring him home or I\'ll bury him myself.';
      } },
    { id: 'over', label: 'It\'s over', show: (g, npc) => npc.uid === 'ondine' && MG(g, 'sq_mg5') === 40,
      say: (g) => {
        g.ui.queueAfterDialogue = () => g.guildMagister();
        return '*She has been sitting by the pool waiting for you, and she stands too fast and has to hold the rim.*\n\nIt thawed. An hour ago. All at once, like a breath let go. It shows only the sky now. *She laughs, a little shakily.* I didn\'t know whether that meant you\'d won or you\'d died. I decided it meant you\'d won, because otherwise I\'d have had to go down there myself, and my knees are sixty-three years old.\n\nThe Chapter needs a Magister who has seen what the Charter is for. I have been Magister for nineteen years and I only found out nine days ago. *She takes off the heavy chain of office and holds it out.* Don\'t make me say anything sentimental. Take the study. The chest is yours. The bed is terrible.';
      } },
    { id: 'ashgrave', label: 'Severin Ashgrave', show: (g) => MG(g, 'sq_mg1') >= 100,
      say: (g) => g.flags.ashgraveDead ? 'His name is cut under the floor of the pool. "S. Ashgrave, First Magister, who chose this stone." I am leaving it there. We should remember the price, not just the man.' : 'He chose this hall\'s stone. He lit its first lamp. And every Magister since has kept that flame burning without knowing it was the only thing between Chorrol and him. I find that either very beautiful or very stupid. Probably both. Most of the Guild is.' },
    { id: 'guild', label: 'The Guild', show: (g, npc) => npc.uid === 'ondine',
      say: (g) => g.flags.mgMember ? 'Associates may use the library, the beds and the spell table. Apprentices may use the library and complain. Magisters may use everything and are blamed for everything.' : 'The Guild of Mages: we study, we teach, we sell spells to people who should not have them. Help us, and you\'ll be one of us.' },
  ],
};

DIALOGUE.merle = {
  greeting: (g) => {
    if (g.flags.bastienHome) return pick(['He\'s back. He\'s actually back. He keeps apologising to the furniture.', 'Bastien wrote to his mother. Four pages. She wrote back eight.']);
    if (g.flags.bastienDead) return '*She is sitting at Bastien\'s desk, very still, with one of his books open in front of her. She doesn\'t look up.* I\'m keeping it how he left it.';
    return pick(['*A young Nord woman in three blankets and a pointed hat peers at you over a steaming mug.* Are you real? Sorry. Nine days. We started a betting pool on who\'d go mad first. I had Ondine. It\'s been me.', 'Don\'t touch the pool. Don\'t look in the pool. I looked in the pool. Don\'t.']);
  },
  topics: [
    { id: 'lamps', label: 'The Warding Lamps', show: (g) => MG(g, 'sq_mg1') >= 20 && MG(g, 'sq_mg1') < 40 && !g.flags.mgLamps,
      say: (g) => {
        if (MG(g, 'sq_mg1') < 30) g.quests.set('sq_mg1', 30, g.day());
        return 'The lamps are lit from the Founders\' Flame, which "lives in the stone" — that\'s what the old index says. Every apprentice learns the line and nobody learns what it means. But the rite for waking it is written down. It has to be. It\'ll be in the Charter of the Chapter, and the Charter\'s in Ondine\'s study, behind the gate. She\'s got the key. She has every key. She sleeps on them like a dragon.';
      } },
    { id: 'bastien', label: 'Bastien', show: (g) => MG(g, 'sq_mg1') >= 20 && !g.flags.bastienHome && !g.flags.bastienDead,
      say: (g) => {
        const give = !g.player.inventory.has('bastien_letter') && !g.flags.mgLetterGiven;
        if (give) { g.flags.mgLetterGiven = true; g.giveItem('bastien_letter', 1); }
        return 'He\'s my best friend. He\'s the cleverest person in this Guild, including Ondine, and he knows it, which is his problem. He never could leave a question alone. If something spoke to him out of that pool, he\'ll have answered it.' + (give ? '\n\n*She takes an envelope from her sleeve, sealed with a violet.* This came for him the day after he went. His mother writes every week. He stopped opening them in the spring — said he was too busy. If you find him... give it to him. Make him read it.' : '');
      } },
    { id: 'guildlife', label: 'Guild life', say: () => 'Mornings, theory. Afternoons, practice. Evenings, putting out whatever caught fire during practice. Teekeeus brings sweetrolls on Fridays. It\'s a good life. It was a good life. It will be again. *She doesn\'t sound sure.*' },
  ],
};

DIALOGUE.aldous.topics.unshift(
  { id: 'cipher', label: 'Bastien\'s notebook', show: (g) => MG(g, 'sq_mg2') === 40 && g.player.inventory.has('bastien_notes'),
    say: (g) => {
      g.quests.set('sq_mg2', 50, g.day());
      return '*He takes the notebook, opens it at the rings, and goes completely silent, which you have never seen him do.*\n\nAshgrave\'s Sigil-Script. Nobody has written in this for four hundred years. Oh, this is WONDERFUL. Oh, this is TERRIBLE. *He runs a finger along the circles.* The Chorrol Chapter threw me out forty years ago for frivolity, you know. Frivolity! I said the Guild had forgotten how to have fun. I did not say it had forgotten how to be afraid. Clearly it had.\n\n*He reads aloud, slowly.* "The Master says: the Spire, the Ruin, the Hollow. Fetch my hearts and I will teach you everything. I will teach you to never stop."\n\n*He closes the book very gently.* That boy isn\'t a prisoner. He\'s a courier. Take this to Ondine. Tell her — no. Don\'t tell her I said anything. Just tell her I\'m sorry.';
    } },
);

DIALOGUE.cassius.topics.unshift(
  { id: 'heart', label: 'Ashgrave\'s Heart', show: (g, npc) => npc.uid === 'cassius_home' && MG(g, 'sq_mg3') >= 10 && !g.flags.heartRime,
    say: (g) => {
      const give = !g.flags.mgCassiusGift;
      if (give) { g.flags.mgCassiusGift = true; g.giveItem('frost_ward', 2); }
      return '*He puts down his cup.* The Spire. Yes. There was always a cold under the floor of the top room that wasn\'t mine. I used to stand on that flagstone by the cage and feel it humming up through my boots. I thought it was guilt. *A dry laugh.* It turns out it was a lich.' + (give ? '\n\nTake these. Frost Ward. I brewed them for the walk up the mountain. If something down there is made of winter, you\'ll want a coat.' : '');
    } },
);

DIALOGUE.gorbag.topics.unshift(
  { id: 'rock', label: 'The cold shiny rock', show: (g) => MG(g, 'sq_mg3') >= 10 && !g.flags.heartFrostfang,
    say: (g) => {
      g.ui.queueAfterDialogue = () => g.frostfangHeartGone();
      return '*Gorbag scratches under his bear-skull helm.* Cold shiny rock? In silver cage? Goes thump, thump, thump, very creepy? Gorbag\'s grandfather\'s grandfather found it in back of cave. Gorbag used it to keep stew cold.\n\nIs gone. Sad human boy came. Thin. Big eyes. Robe. Gave Gorbag FORTY SWEETROLLS. *He holds up four fingers, then remembers, then holds up more.* FORTY. Gorbag is not made of stone. Gorbag is a little bit made of stone. But not THAT much.\n\n*He rummages in his throne and hands you a filthy scrap of paper.* Boy wrote receipt. Very polite. Went that way. *He points north-east, up into the mountains.* Gorbag told him: eat a sweetroll, sad boy. He did not eat a sweetroll.';
    } },
);

DIALOGUE.bastien = {
  greeting: (g, npc) => {
    if (npc.uid === 'bastien_home') return pick(['*He looks up from a book and goes red to the ears.* Hello. Sorry. Hello. I\'m reading something BORING. On purpose. Merle says it\'s good for me.', 'I wrote to my mother. Merle checked. Twice.']);
    if (npc.uid === 'bastien_follow') return pick(['I know the way. That\'s the worst part. I know the way.', 'Stay out of the blue fire. It isn\'t fire.']);
    if (g.flags.bastienSaved) return '*He is sitting with his head in his hands.*';
    return '*A thin young man in a frost-whitened apprentice\'s robe kneels by a brazier of cold blue flame, a cage of silver and black ice cradled in his lap. He looks up, and his eyes are the same blue as the fire.* He said you\'d come. He said to wait for you. He said you\'d try to talk.\n\n*His voice cracks.* Please don\'t. It\'s worse when people talk.';
  },
  topics: [
    { id: 'letter', label: 'Give him his mother\'s letter', show: (g, npc) => npc.uid === 'bastien' && !g.flags.bastienSaved && g.player.inventory.has('bastien_letter'),
      say: (g, npc) => {
        g.ui.queueAfterDialogue = () => g.bastienRedeemed(npc, false);
        return '*He stares at the violet seal for a long time. Then he breaks it, with shaking fingers, and reads. You watch the blue go out of his eyes a little at a time, like frost going off a window.*\n\n"...and I know you\'re busy, my clever boy, but please eat something warm, and please remember that you don\'t have to know everything to be loved..."\n\n*He folds it against his chest.* She still writes. Every week. I stopped opening them. He told me — he said they were distractions. *He holds the silver cage out to you as if it were burning him.* Take it. Please. Before he notices.';
      } },
    { id: 'home', label: 'Come home, Bastien', show: (g, npc) => npc.uid === 'bastien' && !g.flags.bastienSaved && !g.flags.bastienRefused,
      say: (g, npc) => {
        const ondine = g.cell.actors.some((a) => a.uid === 'ondine_follow' && !a.dead);
        if (speech(g) >= 50 || (ondine && speech(g) >= 30)) {
          g.ui.queueAfterDialogue = () => g.bastienRedeemed(npc, false);
          return (ondine ? '*Ondine steps past you and kneels on the cold stone in front of him, the way you would with a frightened dog.* "Bastien. It\'s me. You left your cocoa on the windowsill. It froze. I kept it."\n\n' : '') + '*He makes a sound that is half a laugh and half something else.* He promised I\'d never have to stop. Never stop learning, never stop knowing, never sleep, never forget. And I thought — that\'s what I want. That\'s all I\'ve ever wanted.\n\n*He looks down at the Heart.* But he\'s been down here four hundred years, and he hasn\'t learned anything. He\'s just been… keeping. *He holds it out.* Take it. Please.';
        }
        g.flags.bastienRefused = true;
        return '*He flinches.* Home. Home to what? To being the apprentice who almost understood? He\'s going to teach me EVERYTHING. *His hands tighten on the cage.* (He isn\'t listening — not to that. Something closer to his heart might reach him.)';
      } },
    { id: 'offer', label: 'Come with us and learn something real', show: (g, npc) => npc.uid === 'bastien' && !g.flags.bastienSaved && !!g.flags.mgMember && !g.flags.bastienOfferRefused,
      say: (g, npc) => {
        if (speech(g) >= 40 || npc.disposition >= 60) {
          g.ui.queueAfterDialogue = () => g.bastienRedeemed(npc, true);
          return 'Something real. *He says it the way you would test ice.* He never teaches. He only tells. I\'ve asked him a hundred questions and every answer is "later, when you are like me".\n\n*He stands, unsteady, the Heart held against his chest.* All right. But I want to be the one who breaks it. In front of him. I want him to see me do it.';
        }
        g.flags.bastienOfferRefused = true;
        return '*He laughs, thin and cracked.* The Guild taught me to fold parchment and fetch tea. He taught me how the stars are wound. (He doesn\'t believe you. Not yet.)';
      } },
    { id: 'fight', label: 'Then I\'ll take it from you', show: (g, npc) => npc.uid === 'bastien' && !g.flags.bastienSaved,
      say: (g, npc) => {
        setTimeout(() => g.bastienFights(npc), 60);
        return '*The blue fire in his eyes flares white.* I\'m sorry. I\'m SORRY. He said you\'d say that.';
      } },
    { id: 'after', label: 'How are you?', show: (g, npc) => npc.uid === 'bastien_home',
      say: () => 'Better. Worse. Better. I dream about the ice, but I wake up and Merle\'s left a sweetroll on my desk, and it\'s hard to stay haunted with a sweetroll on your desk. I\'m going to learn everything the slow way. One boring book at a time.' },
  ],
};

DIALOGUE.hollow_king = {
  greeting: (g) => {
    if (g.flags.hollowKingFighting) return '';
    return '*On a throne of black ice sits what is left of a tall man in a magister\'s robe, rotted to lace. A crown of black ice rests on his skull, and in his eye-sockets two points of blue fire turn slowly toward you.*\n\nAh. The one with the lamp. *His voice is courteous, unhurried, faintly amused, the voice of a lecturer who has all the time in the world.* Come in. Mind the wards; my friends painted them on the floor four hundred years ago, and they still sting. Will you sit? No. Nobody ever sits.';
  },
  topics: [
    { id: 'guild', label: 'The Guild', show: (g) => !g.flags.hollowKingFighting,
      say: () => 'I built your Chapter. I chose its stone. I lit its first lamp, and I would have lit the last. Ask your Magister whose name is cut under the floor of her pool. *The blue fire flickers.* It is mine. They kept my flame burning for four hundred years to keep me out. There is a joke in that, and I have had a long time to enjoy it.' },
    { id: 'bastien', label: 'Bastien', show: (g) => !g.flags.hollowKingFighting && (g.flags.bastienSaved || g.flags.bastienDead),
      say: (g) => g.flags.bastienSaved ? 'You have taken my apprentice. A pity. He listened so beautifully. *A pause.* He will forget everything I taught him, you know. Mortals do. That is the whole tragedy of you.' : 'You killed the boy. *The fire in his eyes is very still.* I would have kept him. Every thought he ever had, kept for ever. You have thrown him away. And you call ME the monster.' },
    { id: 'why', label: 'Why?', show: (g) => !g.flags.hollowKingFighting,
      say: () => 'Because a mind is the only thing in the world worth keeping, and the world insists on throwing them away. I watched my teacher die with half a theory in her head. I watched the best of my students forget, year by year, until they were nothing but kindly old men who could not remember their own proofs. So I kept mine. Is that so terrible?\n\n*He leans forward on his throne.* I have been alone in the dark for four hundred years. I have not forgotten one thing. Not one.' },
    { id: 'offer', label: 'Teach me', show: (g) => !g.flags.hollowKingFighting,
      say: (g, npc) => {
        g.ui.queueAfterDialogue = () => g.hollowKingFights(npc, true);
        return '*The blue fire brightens with something like delight.* Yes. YES. I knew you had the look. Kneel, and give me your hand, and I will show you how the stars are wound—\n\n*His bony fingers close on yours, and the cold goes into you like a needle, and you understand, too late, that the first thing a lich teaches is how to hold still. The words of every spell you know freeze in your throat.*\n\nOh, I am sorry. That was a test. You failed it. Everyone does.';
      } },
    { id: 'fight', label: 'It ends here, Ashgrave', show: (g) => !g.flags.hollowKingFighting,
      say: (g, npc) => {
        g.ui.queueAfterDialogue = () => g.hollowKingFights(npc, false);
        return '*He rises from the throne, and keeps rising, until he is floating a hand\'s breadth above the dais, his robe drifting as if under water.* Ends? My dear. Nothing ends. That was rather the point.';
      } },
  ],
};

export const MERCHANTS = {
  general: {
    gold: 800,
    stock: ['iron_dagger*2', 'iron_shortsword', 'iron_longsword', 'steel_longsword', 'iron_mace', 'steel_mace', 'iron_waraxe', 'iron_bow', 'elven_bow', 'iron_arrow*60', 'steel_arrow*30',
      'fur_cuirass', 'fur_helmet', 'fur_boots', 'fur_greaves', 'fur_shield', 'leather_cuirass', 'leather_helmet', 'leather_boots', 'leather_greaves', 'leather_gauntlets',
      'iron_cuirass', 'iron_helmet', 'iron_greaves', 'iron_boots', 'iron_gauntlets', 'iron_shield', 'steel_cuirass', 'steel_shield', 'elven_cuirass',
      'lockpick*20', 'potion_health_light*5', 'potion_health*2', 'potion_magicka*3', 'potion_fatigue*4', 'book_ayleids', 'book_mudcrab'],
  },
  inn: { gold: 300, stock: ['bread*6', 'cheese*6', 'apple*8', 'sweetroll*4', 'mead*6', 'wine_tamika*3', 'wine_surilie*2', 'cyrodilic_brandy*2', 'potion_fatigue*3', 'potion_health_light*2'] },
  snowhare: { gold: 300, stock: ['mulled_wine*8', 'mead*4', 'bread*4', 'cheese*4', 'sweetroll*4', 'venison*3', 'potato*4', 'potion_fatigue*2', 'torch*3'] },
  bosmer: { gold: 400, stock: ['blunt_arrow*40', 'iron_arrow*40', 'steel_arrow*30', 'practice_bow', 'elven_bow', 'potion_health*3', 'potion_magicka*2', 'venison*6', 'mead*3'] },
  bakery: { gold: 120, stock: ['sweetroll*12', 'bread*8', 'apple*6', 'pear*4', 'cheese*3'] },
  food: { gold: 150, stock: ['bread*5', 'cheese*4', 'apple*6', 'onion*4', 'potato*4', 'pear*3', 'venison*3', 'mead*3', 'cyrodilic_brandy*1', 'red_mushroom*3'] },
  spells: { gold: 400, stock: ['potion_magicka*4', 'blue_flower*4', 'ring_of_the_wizard'], spells: true },
  guild: { gold: 600, stock: ['potion_magicka*6', 'potion_health*3', 'potion_health_light*4', 'frost_ward*2', 'blue_flower*6', 'ladys_smock*4', 'welkynd_stone', 'ring_of_the_wizard', 'mage_robe'] },
  brinewhistle: { gold: 300, stock: ['smoked_herring*8', 'herring*6', 'fish_stew*4', 'rum*6', 'bread*4', 'cheese*3', 'potion_health_light*2', 'potion_fatigue*2', 'lockpick*5', 'iron_arrow*20'] },
  wizard: { gold: 500, stock: ['potion_magicka*6', 'potion_health*2', 'welkynd_stone', 'blue_flower*6', 'ladys_smock*4', 'nirnroot', 'ring_of_the_wizard', 'candelabra', 'magnifying_lens', 'ships_compass'] },
};
