'use strict';
// Rival Lights: the 32 cards. Data only; the rules that read it are in src/rl.js.
//
// Two keepers' rocks face each other across a tidal race, each with its Great Light and two Lamp Towers. Each player
// builds a deck of 8 from these 32 (src/rldeck.js), holds 4 in hand, and spends lamp oil (0 to 10, filling over
// time) to send crews, crabs, the drowned and the birds across the two causeways, cast spells, or set down
// buildings. Every card's name, unit and look comes from the Skerry Light world.
//
// A card: { id, n name, cost oil, type 'troop' | 'spell' | 'building', d a line for the card, and its numbers }
//   troops:    hp, dmg (per hit), hit (seconds between hits), rng (tiles; under 1.2 is melee), spd (tiles a second),
//              tg what it goes for ('ground', 'any' (ground and air), 'build' (only buildings and towers)),
//              air (it flies: over the water, and only 'any' attackers can hit it), cnt (how many come), sp (splash
//              radius in tiles), size (body radius in tiles), and an optional ab (ability, read by src/rl.js):
//                revive    rises once more at half its hp when it falls
//                bomb      runs at buildings and bursts on reaching one (sp radius, dmg), dying
//                cloak     can't be targeted for its first cl seconds
//                charge    after 2 tiles of running it charges (twice the speed) and its first hit does twice
//                slowhit   each hit slows its target by 35% for 2 s
//   spells:    r (radius in tiles), dmg, tw (fraction of dmg dealt to towers), and an optional ab:
//                lob       lands after a flight of fl seconds
//                stun      stuns for st seconds
//                wave      rolls forward len tiles, w tiles wide, knocking ground units back kb tiles
//                haar      a fog bank for dur seconds: enemies inside move and strike 45% slower
//                bolts     strikes the k enemies with the most hp in range
//   buildings: hp, life (seconds; it wears down to nothing over its life), and as troops for anything it shoots
//              (dmg, hit, rng, tg); an optional ab:
//                lure      ground enemies within rng tiles turn on it; every 4 s it rings, slowing them for 1 s
//                spawn     sends out a sp unit (a card id) every ev seconds
// A spawned unit that is not a card of its own (the Wreckers' Fire's wreckers) uses the card it names.

const RL_SPD = { slow: 0.8, med: 1.1, fast: 1.5, vfast: 2.0 };
const RL_CARDS = [
  // troops
  { id: 'mudlarks', n: 'Mudlarks', cost: 1, type: 'troop', hp: 70, dmg: 50, hit: 1.0, rng: 0.8, spd: RL_SPD.fast, tg: 'ground', cnt: 3, size: 0.3,
    d: 'Three ragged children off the mudflats, quick with a cockle knife.' },
  { id: 'deckhand', n: 'Deckhand', cost: 2, type: 'troop', hp: 520, dmg: 85, hit: 1.1, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.45,
    d: 'A steady hand with a belaying pin. Cheap, and holds the line.' },
  { id: 'shorecrabs', n: 'Shore Crabs', cost: 2, type: 'troop', hp: 85, dmg: 45, hit: 1.0, rng: 0.7, spd: RL_SPD.fast, tg: 'ground', cnt: 6, size: 0.28,
    d: 'A scuttling tide of them, out from under every stone.' },
  { id: 'powdermonkey', n: 'Powder Monkey', cost: 2, type: 'troop', hp: 210, dmg: 420, hit: 1.0, rng: 0.5, spd: RL_SPD.vfast, tg: 'build', cnt: 1, sp: 1.2, size: 0.35, ab: 'bomb',
    d: 'Runs a lit cask of powder at the nearest building, and goes up with it.' },
  { id: 'wreckers', n: 'Wrecker Gang', cost: 3, type: 'troop', hp: 280, dmg: 80, hit: 1.1, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 3, size: 0.42,
    d: 'Three wreckers with lanterns and crowbars, out for what washes up.' },
  { id: 'harpooner', n: 'Harpooner', cost: 3, type: 'troop', hp: 320, dmg: 115, hit: 1.4, rng: 5.5, spd: RL_SPD.med, tg: 'any', cnt: 1, size: 0.42,
    d: 'A whaler\'s iron, thrown far and true. Hits birds on the wing.' },
  { id: 'drowned', n: 'Drowned Sailor', cost: 3, type: 'troop', hp: 600, dmg: 100, hit: 1.2, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.45, ab: 'revive',
    d: 'Down he goes, and up he comes again, weed in his hair.' },
  { id: 'gulls', n: 'Gull Flock', cost: 3, type: 'troop', hp: 95, dmg: 50, hit: 1.0, rng: 0.9, spd: RL_SPD.vfast, tg: 'any', air: true, cnt: 4, size: 0.3,
    d: 'Four herring gulls, screaming. They fly straight over the race.' },
  { id: 'fogwraith', n: 'Fog Wraith', cost: 3, type: 'troop', hp: 460, dmg: 150, hit: 1.2, rng: 0.8, spd: RL_SPD.fast, tg: 'ground', cnt: 1, size: 0.42, ab: 'cloak', cl: 3,
    d: 'Comes in with the haar. Nothing can strike it for its first 3 seconds.' },
  { id: 'coastguard', n: 'Coastguard Pair', cost: 4, type: 'troop', hp: 280, dmg: 85, hit: 1.1, rng: 5, spd: RL_SPD.med, tg: 'any', cnt: 2, size: 0.42,
    d: 'Two revenue men with carbines, sworn to stop the wreckers.' },
  { id: 'cormorant', n: 'Cormorant', cost: 4, type: 'troop', hp: 520, dmg: 105, hit: 1.2, rng: 3, spd: RL_SPD.med, tg: 'any', air: true, cnt: 1, size: 0.45,
    d: 'A black diver of the skerries that spits stones from the air.' },
  { id: 'gannet', n: 'Gannet', cost: 4, type: 'troop', hp: 400, dmg: 270, hit: 1.8, rng: 0.9, spd: RL_SPD.vfast, tg: 'ground', air: true, cnt: 1, size: 0.45,
    d: 'Folds its wings and drops like a spear on anything on the ground.' },
  { id: 'diver', n: 'The Diver', cost: 4, type: 'troop', hp: 1150, dmg: 210, hit: 1.4, rng: 0.9, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.55,
    d: 'Brass helmet, lead boots, and a fist like a mooring weight.' },
  { id: 'bosun', n: 'Cutlass Bosun', cost: 4, type: 'troop', hp: 820, dmg: 130, hit: 0.8, rng: 0.9, spd: RL_SPD.fast, tg: 'ground', cnt: 1, size: 0.5,
    d: 'Quick on his feet and quicker with the blade.' },
  { id: 'lamplighter', n: 'Lamplighter', cost: 4, type: 'troop', hp: 360, dmg: 95, hit: 1.4, rng: 4, spd: RL_SPD.med, tg: 'any', cnt: 1, sp: 1.0, size: 0.42,
    d: 'Flings burning oil from her lighting pole. Splashes all round.' },
  { id: 'hermit', n: 'Hermit Crab', cost: 5, type: 'troop', hp: 2450, dmg: 125, hit: 1.5, rng: 0.9, spd: RL_SPD.slow, tg: 'build', cnt: 1, size: 0.75,
    d: 'A great crab in a borrowed whelk shell. Walks only at buildings.' },
  { id: 'drownedcrew', n: 'Drowned Crew', cost: 5, type: 'troop', hp: 140, dmg: 60, hit: 1.1, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 8, size: 0.38,
    d: 'A whole ship\'s company, come up out of the race together.' },
  { id: 'mooncusser', n: 'Mooncusser', cost: 5, type: 'troop', hp: 900, dmg: 135, hit: 1.6, rng: 5, spd: RL_SPD.slow, tg: 'ground', cnt: 1, sp: 1.3, size: 0.5,
    d: 'Swings a false light that burns everything it falls on.' },
  { id: 'lightkeeper', n: 'Head Keeper', cost: 5, type: 'troop', hp: 850, dmg: 160, hit: 1.3, rng: 6, spd: RL_SPD.med, tg: 'any', cnt: 1, size: 0.45,
    d: 'The keeper of the light, with a signal pistol and long sight.' },
  { id: 'keelback', n: 'Keelback', cost: 6, type: 'troop', hp: 2050, dmg: 230, hit: 1.6, rng: 1.0, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.7, ab: 'charge',
    d: 'Something long and ridged that charges up out of the shallows.' },
  { id: 'kelp', n: 'Kelp Horror', cost: 6, type: 'troop', hp: 3300, dmg: 115, hit: 1.5, rng: 1.0, spd: RL_SPD.slow, tg: 'ground', cnt: 1, size: 0.75, ab: 'slowhit',
    d: 'A heap of weed that walks. What it touches moves slower.' },
  { id: 'crabking', n: 'Crab King', cost: 7, type: 'troop', hp: 4300, dmg: 270, hit: 1.8, rng: 1.0, spd: RL_SPD.slow, tg: 'build', cnt: 1, size: 0.95,
    d: 'The old king of the reef. Ignores everything but the towers.' },
  // spells
  { id: 'flare', n: 'Signal Flare', cost: 2, type: 'spell', r: 2.5, dmg: 190, tw: 0.4, ab: 'stun', st: 0.5,
    d: 'A white flash that burns and dazzles everything under it.' },
  { id: 'cannonshot', n: 'Cannon Shot', cost: 3, type: 'spell', r: 2.5, dmg: 460, tw: 0.35, ab: 'lob', fl: 0.9,
    d: 'A round shot lobbed from the battery. Lands a moment later.' },
  { id: 'roguewave', n: 'Rogue Wave', cost: 3, type: 'spell', r: 1.5, dmg: 200, tw: 0.35, ab: 'wave', len: 9, w: 3, kb: 1.5,
    d: 'A wall of green water that rolls forward and knocks them back.' },
  { id: 'haar', n: 'The Haar', cost: 3, type: 'spell', r: 3, dmg: 0, tw: 0, ab: 'haar', dur: 5,
    d: 'A sea fog rolls in. Enemies inside move and strike slower.' },
  { id: 'powderkeg', n: 'Powder Keg', cost: 4, type: 'spell', r: 3, dmg: 640, tw: 0.35, ab: 'lob', fl: 1.2,
    d: 'A whole keg of powder, slung over and touched off.' },
  { id: 'stormbolts', n: 'Storm Glass', cost: 6, type: 'spell', r: 3.5, dmg: 880, tw: 0.3, ab: 'bolts', k: 3,
    d: 'The glass breaks and three bolts fall on the strongest there.' },
  // buildings
  { id: 'battery', n: 'Sea Battery', cost: 3, type: 'building', hp: 900, life: 30, dmg: 125, hit: 0.9, rng: 5.5, tg: 'ground', size: 0.9,
    d: 'An iron gun in a stone emplacement. Ground targets only.' },
  { id: 'swivel', n: 'Swivel Gun', cost: 4, type: 'building', hp: 720, life: 35, dmg: 70, hit: 0.6, rng: 7, tg: 'any', size: 0.8,
    d: 'A rail gun on a post that turns to anything, bird or man.' },
  { id: 'bellbuoy', n: 'Bell Buoy', cost: 4, type: 'building', hp: 1600, life: 40, dmg: 0, hit: 4, rng: 5, tg: 'ground', size: 0.9, ab: 'lure',
    d: 'Its bell draws every walker near it, and its toll slows them.' },
  { id: 'wreckfire', n: "Wreckers' Fire", cost: 5, type: 'building', hp: 1000, life: 40, dmg: 0, hit: 0, rng: 0, tg: 'ground', size: 0.9, ab: 'spawn', sp: 'wreckers', ev: 5,
    d: 'A false light on the shore. A wrecker comes to it every 5 seconds.' },
];
const RL_CARD = {}; for (const c of RL_CARDS) RL_CARD[c.id] = c;
// a deck to start with, until you build your own: cheap, with something for the air and a spell
const RL_DEFAULT_DECK = ['deckhand', 'shorecrabs', 'harpooner', 'gulls', 'diver', 'hermit', 'cannonshot', 'battery'];
