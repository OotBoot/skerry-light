'use strict';
// Skerry Clash: the 64 cards. Data only; the rules that read it are in src/rl.js.
//
// Two keepers' rocks face each other across a tidal race, each with its Great Light and two Lamp Towers. Each player
// builds a deck of 8 from these 64 (src/rldeck.js), holds 4 in hand, and spends lamp oil (0 to 10, filling over
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
// Added with the second 32 (v200):
//   troops:    burst      flies at the nearest enemy (any) and bursts on it (sp radius, dmg), dying
//              leap       pounces on a target within lp tiles, landing its first hit at once
//              shield     a shell that soaks the first sh damage before its hp
//              drain      half of the damage it deals mends it
//              heal       never strikes; mends friends within rng tiles hl a second
//              spin       its hits land on every enemy within sp of itself (not of its target)
//              rally      friends within 4 tiles strike 30% faster
//              deathspawn when it falls, sn of the sp card come out where it stood
//              chain      each hit leaps on to ch more enemies within 3 tiles, at full damage
//   spells:    pull       drags enemy ground troops in r to the middle, then dmg
//              mend       your troops in r mend hl a second for dur seconds
//              haste      your troops in r move and strike 40% faster for dur seconds
//              dot        dmg a second to enemies in r for dur seconds (towers take tw of it)
//              summon     dmg in r, then the sp card's troops appear there for the caster
//              whirl      for dur seconds drags enemy ground troops in r to the middle, dmg every half second
//   buildings: tar        enemy ground troops within rng move at half speed
//              blast      every hit seconds, dmg to ground enemies within rng and knocks them back kb tiles
//              lob        (on a building) its shot arcs over (sp splash) and it can't hit anything nearer than minr
//              ramp       its damage climbs the longer it holds the same target: x1, then x3 after 2 s, x8 after 4 s
//              oil        gives its owner 1 oil every ev seconds
//              spawn may carry sn, how many come each time (1 if not given)
// A spawned unit that is not a card of its own (the Wreckers' Fire's wreckers) uses the card it names.

const RL_SPD = { slow: 0.8, med: 1.1, fast: 1.5, vfast: 2.0 };
const RL_CARDS = [
  // troops
  { id: 'mudlarks', n: 'Mudlarks', cost: 1, type: 'troop', hp: 81, dmg: 81, hit: 1.0, rng: 0.8, spd: RL_SPD.fast, tg: 'ground', cnt: 3, size: 0.3,
    d: 'Three ragged children off the mudflats, quick with a cockle knife.' },
  { id: 'deckhand', n: 'Deckhand', cost: 2, type: 'troop', hp: 900, dmg: 140, hit: 1.1, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.45,
    d: 'A steady hand with a belaying pin. Cheap, and holds the line.' },
  { id: 'shorecrabs', n: 'Shore Crabs', cost: 2, type: 'troop', hp: 130, dmg: 85, hit: 1.0, rng: 0.7, spd: RL_SPD.fast, tg: 'ground', cnt: 6, size: 0.28,
    d: 'A scuttling tide of them, out from under every stone.' },
  { id: 'powdermonkey', n: 'Powder Monkey', cost: 2, type: 'troop', hp: 380, dmg: 640, hit: 1.0, rng: 0.5, spd: RL_SPD.vfast, tg: 'build', cnt: 1, sp: 1.2, size: 0.35, ab: 'bomb',
    d: 'Runs a lit cask of powder at the nearest building, and goes up with it.' },
  { id: 'wreckers', n: 'Wrecker Gang', cost: 3, type: 'troop', hp: 600, dmg: 160, hit: 1.3, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 3, size: 0.42,
    d: 'Three wreckers with lanterns and crowbars, out for what washes up.' },
  { id: 'harpooner', n: 'Harpooner', cost: 3, type: 'troop', hp: 600, dmg: 220, hit: 1.4, rng: 5.5, spd: RL_SPD.med, tg: 'any', cnt: 1, size: 0.42,
    d: 'A whaler\'s iron, thrown far and true. Hits birds on the wing.' },
  { id: 'drowned', n: 'Drowned Sailor', cost: 3, type: 'troop', hp: 1100, dmg: 180, hit: 1.2, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.45, ab: 'revive',
    d: 'Down he goes, and up he comes again, weed in his hair.' },
  { id: 'gulls', n: 'Gull Flock', cost: 3, type: 'troop', hp: 175, dmg: 90, hit: 1.0, rng: 0.9, spd: RL_SPD.vfast, tg: 'any', air: true, cnt: 4, size: 0.3,
    d: 'Four herring gulls, screaming. They fly straight over the race.' },
  { id: 'fogwraith', n: 'Fog Wraith', cost: 3, type: 'troop', hp: 900, dmg: 190, hit: 1.0, rng: 0.8, spd: RL_SPD.fast, tg: 'ground', cnt: 1, size: 0.42, ab: 'cloak', cl: 3,
    d: 'Comes in with the haar. Nothing can strike it for its first 3 seconds.' },
  { id: 'coastguard', n: 'Coastguard Pair', cost: 4, type: 'troop', hp: 480, dmg: 135, hit: 1.1, rng: 5, spd: RL_SPD.med, tg: 'any', cnt: 2, size: 0.42,
    d: 'Two revenue men with carbines, sworn to stop the wreckers.' },
  { id: 'cormorant', n: 'Cormorant', cost: 4, type: 'troop', hp: 1100, dmg: 190, hit: 1.3, rng: 3, spd: RL_SPD.med, tg: 'any', air: true, cnt: 1, size: 0.45,
    d: 'A black diver of the skerries that spits stones from the air.' },
  { id: 'gannet', n: 'Gannet', cost: 4, type: 'troop', hp: 720, dmg: 420, hit: 1.8, rng: 0.9, spd: RL_SPD.vfast, tg: 'ground', air: true, cnt: 1, size: 0.45,
    d: 'Folds its wings and drops like a spear on anything on the ground.' },
  { id: 'diver', n: 'The Diver', cost: 4, type: 'troop', hp: 1360, dmg: 700, hit: 1.6, rng: 0.9, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.55,
    d: 'Brass helmet, lead boots, and a fist like a mooring weight.' },
  { id: 'bosun', n: 'Cutlass Bosun', cost: 4, type: 'troop', hp: 1450, dmg: 220, hit: 0.9, rng: 0.9, spd: RL_SPD.fast, tg: 'ground', cnt: 1, size: 0.5,
    d: 'Quick on his feet and quicker with the blade.' },
  { id: 'lamplighter', n: 'Lamplighter', cost: 4, type: 'troop', hp: 620, dmg: 230, hit: 1.4, rng: 4, spd: RL_SPD.med, tg: 'any', cnt: 1, sp: 1.0, size: 0.42,
    d: 'Flings burning oil from her lighting pole. Splashes all round.' },
  { id: 'hermit', n: 'Hermit Crab', cost: 5, type: 'troop', hp: 4000, dmg: 250, hit: 1.5, rng: 0.9, spd: RL_SPD.slow, tg: 'build', cnt: 1, size: 0.75,
    d: 'A great crab in a borrowed whelk shell. Walks only at buildings.' },
  { id: 'drownedcrew', n: 'Drowned Crew', cost: 5, type: 'troop', hp: 330, dmg: 120, hit: 1.1, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 8, size: 0.38,
    d: 'A whole ship\'s company, come up out of the race together.' },
  { id: 'mooncusser', n: 'Mooncusser', cost: 5, type: 'troop', hp: 1200, dmg: 220, hit: 1.6, rng: 5, spd: RL_SPD.slow, tg: 'ground', cnt: 1, sp: 1.3, size: 0.5,
    d: 'Swings a false light that burns everything it falls on.' },
  { id: 'lightkeeper', n: 'Head Keeper', cost: 5, type: 'troop', hp: 1100, dmg: 250, hit: 1.3, rng: 6, spd: RL_SPD.med, tg: 'any', cnt: 1, size: 0.45,
    d: 'The keeper of the light, with a signal pistol and long sight.' },
  { id: 'keelback', n: 'Keelback', cost: 6, type: 'troop', hp: 2200, dmg: 420, hit: 1.5, rng: 1.0, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.7, ab: 'charge',
    d: 'Something long and ridged that charges up out of the shallows.' },
  { id: 'kelp', n: 'Kelp Horror', cost: 6, type: 'troop', hp: 4400, dmg: 180, hit: 1.5, rng: 1.0, spd: RL_SPD.slow, tg: 'ground', cnt: 1, size: 0.75, ab: 'slowhit',
    d: 'A heap of weed that walks. What it touches moves slower.' },
  { id: 'crabking', n: 'Crab King', cost: 7, type: 'troop', hp: 5600, dmg: 360, hit: 1.8, rng: 1.0, spd: RL_SPD.slow, tg: 'build', cnt: 1, size: 0.95,
    d: 'The old king of the reef. Ignores everything but the towers.' },
  // spells
  { id: 'flare', n: 'Signal Flare', cost: 2, type: 'spell', r: 2.5, dmg: 190, tw: 0.3, ab: 'stun', st: 0.5,
    d: 'A white flash that burns and dazzles everything under it.' },
  { id: 'cannonshot', n: 'Cannon Shot', cost: 3, type: 'spell', r: 2.5, dmg: 520, tw: 0.3, ab: 'lob', fl: 0.9,
    d: 'A round shot lobbed from the battery. Lands a moment later.' },
  { id: 'roguewave', n: 'Rogue Wave', cost: 3, type: 'spell', r: 1.5, dmg: 290, tw: 0.25, ab: 'wave', len: 9, w: 3, kb: 1.5,
    d: 'A wall of green water that rolls forward and knocks them back.' },
  { id: 'haar', n: 'The Haar', cost: 3, type: 'spell', r: 3, dmg: 0, tw: 0, ab: 'haar', dur: 5,
    d: 'A sea fog rolls in. Enemies inside move and strike slower.' },
  { id: 'powderkeg', n: 'Powder Keg', cost: 4, type: 'spell', r: 3, dmg: 760, tw: 0.3, ab: 'lob', fl: 1.2,
    d: 'A whole keg of powder, slung over and touched off.' },
  { id: 'stormbolts', n: 'Storm Glass', cost: 6, type: 'spell', r: 3.5, dmg: 1000, tw: 0.3, ab: 'bolts', k: 3,
    d: 'The glass breaks and three bolts fall on the strongest there.' },
  // buildings
  { id: 'battery', n: 'Sea Battery', cost: 3, type: 'building', hp: 900, life: 30, dmg: 210, hit: 0.9, rng: 5.5, tg: 'ground', size: 0.9,
    d: 'An iron gun in a stone emplacement. Ground targets only.' },
  { id: 'swivel', n: 'Swivel Gun', cost: 4, type: 'building', hp: 1200, life: 35, dmg: 130, hit: 0.7, rng: 7, tg: 'any', size: 0.8,
    d: 'A rail gun on a post that turns to anything, bird or man.' },
  { id: 'bellbuoy', n: 'Bell Buoy', cost: 4, type: 'building', hp: 2300, life: 40, dmg: 0, hit: 4, rng: 5, tg: 'ground', size: 0.9, ab: 'lure',
    d: 'Its bell draws every walker near it, and its toll slows them.' },
  { id: 'wreckfire', n: "Wreckers' Fire", cost: 5, type: 'building', hp: 1300, life: 40, dmg: 0, hit: 0, rng: 0, tg: 'ground', size: 0.9, ab: 'spawn', sp: 'wreckers', ev: 5,
    d: 'A false light on the shore. A wrecker comes to it every 5 seconds.' },
  // ---------- the second 32 (v200) ----------
  // troops
  { id: 'bilgerats', n: 'Bilge Rats', cost: 1, type: 'troop', hp: 70, dmg: 70, hit: 0.9, rng: 0.6, spd: RL_SPD.vfast, tg: 'ground', cnt: 4, size: 0.25,
    d: 'Four rats up out of the bilges, all teeth.' },
  { id: 'wisp', n: "Will-o'-the-Wisp", cost: 1, type: 'troop', hp: 90, dmg: 200, hit: 1.0, rng: 0.5, spd: RL_SPD.vfast, tg: 'any', air: true, cnt: 1, sp: 1.5, size: 0.28, ab: 'burst',
    d: 'A marsh light that drifts to the nearest foe and bursts against it.' },
  { id: 'shipscat', n: "Ship's Cat", cost: 2, type: 'troop', hp: 640, dmg: 130, hit: 0.9, rng: 0.7, spd: RL_SPD.fast, tg: 'ground', cnt: 1, size: 0.32, ab: 'leap', lp: 3.5,
    d: 'Pounces on anything within 3.5 tiles, and its first bite lands at once.' },
  { id: 'puffins', n: 'Puffin Squadron', cost: 2, type: 'troop', hp: 130, dmg: 75, hit: 1.0, rng: 0.9, spd: RL_SPD.vfast, tg: 'any', air: true, cnt: 3, size: 0.26,
    d: 'Three puffins, whirring low and fast over the water.' },
  { id: 'fishwives', n: 'Fishwives', cost: 3, type: 'troop', hp: 420, dmg: 120, hit: 1.1, rng: 3.5, spd: RL_SPD.med, tg: 'any', cnt: 2, size: 0.4,
    d: 'Two fishwives flinging herring and gutting knives. They hit birds too.' },
  { id: 'netthrower', n: 'Net Thrower', cost: 3, type: 'troop', hp: 820, dmg: 125, hit: 1.3, rng: 4.5, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.42, ab: 'slowhit',
    d: 'Casts a weighted net. Whatever it lands on moves slower.' },
  { id: 'grenadier', n: 'Grenadier', cost: 3, type: 'troop', hp: 520, dmg: 170, hit: 1.4, rng: 5, spd: RL_SPD.med, tg: 'ground', cnt: 1, sp: 1.5, size: 0.42,
    d: 'Lobs a fizzing powder grenade into the thick of them.' },
  { id: 'lobster', n: 'Lobster Knight', cost: 3, type: 'troop', hp: 1300, dmg: 150, hit: 1.2, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.5, ab: 'shield', sh: 400,
    d: 'His shell takes the first 400 damage before he feels a thing.' },
  { id: 'petrel', n: 'Storm Petrel', cost: 3, type: 'troop', hp: 700, dmg: 125, hit: 1.1, rng: 3.5, spd: RL_SPD.fast, tg: 'any', air: true, cnt: 1, size: 0.35,
    d: 'A little black bird of the gale, quick and hard to pin down.' },
  { id: 'pressgang', n: 'Press Gang', cost: 4, type: 'troop', hp: 850, dmg: 160, hit: 1.2, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 2, size: 0.45,
    d: 'Two bruisers with a cudgel and a sack, rounding up hands.' },
  { id: 'siren', n: 'Siren', cost: 4, type: 'troop', hp: 720, dmg: 155, hit: 1.2, rng: 5, spd: RL_SPD.med, tg: 'any', cnt: 1, size: 0.42, ab: 'drain',
    d: 'Sings from the rocks. Half of every hit she lands mends her.' },
  { id: 'surgeon', n: "Ship's Surgeon", cost: 4, type: 'troop', hp: 820, dmg: 0, hit: 1.0, rng: 3, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.42, ab: 'heal', hl: 95,
    d: 'Mends every friend within 3 tiles, 95 a second. Never strikes.' },
  { id: 'rocketcrew', n: 'Rocket Crew', cost: 4, type: 'troop', hp: 740, dmg: 350, hit: 1.8, rng: 6.5, spd: RL_SPD.med, tg: 'build', cnt: 1, size: 0.45,
    d: 'Fires life-saving rockets at buildings and towers from long range.' },
  { id: 'anchorman', n: 'Anchor Swinger', cost: 4, type: 'troop', hp: 1650, dmg: 230, hit: 1.5, rng: 1.0, spd: RL_SPD.med, tg: 'ground', cnt: 1, sp: 1.6, size: 0.55, ab: 'spin',
    d: 'Swings a kedge anchor round on its chain, hitting everyone about her.' },
  { id: 'seaeagle', n: 'Sea Eagle', cost: 5, type: 'troop', hp: 2100, dmg: 210, hit: 1.4, rng: 1.0, spd: RL_SPD.med, tg: 'any', air: true, cnt: 1, size: 0.65,
    d: 'A great white-tailed eagle. Tough, and it takes whatever it fancies.' },
  { id: 'wreckerchief', n: 'Wrecker Chief', cost: 5, type: 'troop', hp: 2250, dmg: 300, hit: 1.4, rng: 0.9, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.55, ab: 'rally',
    d: 'Friends within 4 tiles of him strike 30% faster.' },
  { id: 'smugglers', n: 'Smugglers', cost: 5, type: 'troop', hp: 520, dmg: 150, hit: 1.2, rng: 0.8, spd: RL_SPD.fast, tg: 'ground', cnt: 4, size: 0.4,
    d: 'Four of them off a lugger, quick and quiet, with knives.' },
  { id: 'crabmother', n: 'Crab Mother', cost: 6, type: 'troop', hp: 3700, dmg: 210, hit: 1.6, rng: 1.0, spd: RL_SPD.slow, tg: 'build', cnt: 1, size: 0.85, ab: 'deathspawn', sp: 'shorecrabs', sn: 6,
    d: 'Walks at buildings. When she falls, six shore crabs scatter from her.' },
  { id: 'krakenarm', n: "Kraken's Arm", cost: 7, type: 'troop', hp: 3700, dmg: 290, hit: 1.8, rng: 1.1, spd: RL_SPD.slow, tg: 'ground', cnt: 1, sp: 1.8, size: 0.85,
    d: 'A single arm as thick as a mast, out of the race. Each slap hits all round.' },
  { id: 'stormcaller', n: 'Stormcaller', cost: 7, type: 'troop', hp: 1500, dmg: 260, hit: 1.6, rng: 5.5, spd: RL_SPD.med, tg: 'any', cnt: 1, size: 0.48, ab: 'chain', ch: 2,
    d: 'An old woman with a knotted cord. Her lightning leaps on to two more.' },
  // spells
  { id: 'tidepull', n: 'Tide Pull', cost: 2, type: 'spell', r: 3, dmg: 110, tw: 0.25, ab: 'pull',
    d: 'The ebb drags every enemy on foot in the circle to its middle.' },
  { id: 'lampoil', n: 'Lamp Oil', cost: 3, type: 'spell', r: 3, dmg: 0, tw: 0, ab: 'mend', dur: 5, hl: 130,
    d: 'Your troops in the circle mend 130 a second for 5 seconds.' },
  { id: 'fairwind', n: 'Fair Wind', cost: 3, type: 'spell', r: 4, dmg: 0, tw: 0, ab: 'haste', dur: 6,
    d: 'Your troops in the circle move and strike 40% faster for 6 seconds.' },
  { id: 'brinerain', n: 'Brine Rain', cost: 4, type: 'spell', r: 3.5, dmg: 90, tw: 0.3, ab: 'dot', dur: 4,
    d: 'Stinging rain: 90 damage a second for 4 seconds, towers too.' },
  { id: 'shipwreck', n: 'Shipwreck', cost: 5, type: 'spell', r: 2.5, dmg: 260, tw: 0.3, ab: 'summon', sp: 'wreckers',
    d: 'A hulk crashes down on your own rock, and the Wrecker Gang climbs out of the wreck.' },
  { id: 'whirlpool', n: 'Whirlpool', cost: 5, type: 'spell', r: 3.5, dmg: 70, tw: 0.25, ab: 'whirl', dur: 3,
    d: 'For 3 seconds it drags enemies on foot to its middle, 140 damage a second.' },
  // buildings
  { id: 'tarpit', n: 'Tar Barrel', cost: 2, type: 'building', hp: 650, life: 25, dmg: 0, hit: 0, rng: 2.5, tg: 'ground', size: 0.6, ab: 'tar',
    d: 'Spilt tar: enemies on foot within 2.5 tiles move at half speed.' },
  { id: 'foghorn', n: 'Fog Horn', cost: 3, type: 'building', hp: 1200, life: 25, dmg: 110, hit: 3, rng: 4, tg: 'ground', size: 0.8, ab: 'blast', kb: 1.2,
    d: 'Every 3 seconds it bellows, knocking walkers within 4 tiles back.' },
  { id: 'mortar', n: 'Mortar Pit', cost: 4, type: 'building', hp: 1100, life: 30, dmg: 260, hit: 4, rng: 11.5, minr: 3.5, tg: 'ground', sp: 1.8, size: 0.85, ab: 'lob',
    d: 'Lobs a shell very far, splashing where it lands. Can\'t hit anything close.' },
  { id: 'burnlens', n: 'Burning Lens', cost: 5, type: 'building', hp: 1600, life: 30, dmg: 40, hit: 0.4, rng: 6, tg: 'any', size: 0.85, ab: 'ramp',
    d: 'A lighthouse lens that focuses the sun. It burns hotter the longer it holds a target.' },
  { id: 'martello', n: 'Martello Tower', cost: 5, type: 'building', hp: 2400, life: 40, dmg: 170, hit: 1.0, rng: 6.5, tg: 'any', size: 1.0,
    d: 'A squat stone fort with a gun on the roof. Shoots anything.' },
  { id: 'oilstore', n: 'Oil Store', cost: 6, type: 'building', hp: 1000, life: 70, dmg: 0, hit: 0, rng: 0, tg: 'ground', size: 0.85, ab: 'oil', ev: 8.5,
    d: 'A store of lamp oil: gives you one oil every 8.5 seconds while it stands.' },
];
// The champions (v204): three of the world's own, one at most in a deck (it takes one of the 8 places). A champion
// is a troop (type 'troop', champ: its ability) with two differences: while it's on the field its card doesn't come
// round again (it goes back into the cycle when the champion falls), and its ability is used from a button of its own,
// for oil, once its cooldown is over. The rules are in src/rl.js (rlAbility), the rest in src/rlchamp.js.
//   champ: { n the ability's name, cost oil, cd seconds before it can be used again (and at first, cd0), dur seconds
//            it lasts, d a line for it, and what it does by the champion's id:
//     maren     Sea-Green Light: for dur seconds nothing can hurt her, and every enemy within r tiles is slowed and
//               takes dps a second (towers tw of it)
//     plimsoll  Blood in the Water: he lunges up to r tiles on to the enemy with the most hit points (on the same dry
//               rock), bites for mul times his damage as he lands, then strikes fast times as fast for dur seconds
//     verity    I Want to Help: he shows what he really looks like; every enemy troop within r tiles is stunned for st
//               seconds, he mends hl, and for dur seconds his hits do mul times and land on everyone within sp tiles of him.
//               And always: nothing slows or stuns him (the bell does nothing to him)
const RL_CHAMPS = [
  { id: 'maren', n: 'Maren Holm', cost: 5, type: 'troop', hp: 2300, dmg: 210, hit: 1.2, rng: 3, spd: RL_SPD.med, tg: 'any', cnt: 1, size: 0.5,
    champ: { n: 'Sea-Green Light', cost: 2, cd: 13, cd0: 3, dur: 5, r: 3, dps: 170, tw: 0.35, d: 'For 5 seconds nothing can hurt her, and every enemy within 3 tiles is slowed and drowns 170 a second.' },
    d: 'The keeper\u2019s wife, come back over the rocks with her lantern. Its light reaches flyers too.' },
  { id: 'plimsoll', n: 'Plimsoll', cost: 4, type: 'troop', hp: 1800, dmg: 250, hit: 1.1, rng: 0.9, spd: RL_SPD.fast, tg: 'ground', cnt: 1, size: 0.5,
    champ: { n: 'Blood in the Water', cost: 1, cd: 9, cd0: 2, dur: 5, r: 6, mul: 3.5, fast: 2, d: 'He lunges up to 6 tiles on to the strongest enemy near him, bites for three and a half times, then strikes twice as fast for 5 seconds.' },
    d: 'The shark in the cabin boy\u2019s blue shoes. He knows the way through the skerries.' },
  { id: 'verity', n: 'Verity', cost: 4, type: 'troop', hp: 1600, dmg: 180, hit: 1.0, rng: 0.8, spd: RL_SPD.med, tg: 'ground', cnt: 1, size: 0.45,
    champ: { n: 'I Want to Help', cost: 2, cd: 16, cd0: 4, dur: 6, r: 4, st: 1.5, mul: 2.5, sp: 1.6, hl: 650, d: 'He stops smiling and mends 650: enemy troops within 4 tiles freeze for 1.5 s, and for 6 seconds his hits do two and a half times, on everyone round him.' },
    d: 'A small yellow orb, smiling, who says he wants to help. Nothing slows him or stuns him.' },
];
const RL_CARD = {}; for (const c of RL_CARDS.concat(RL_CHAMPS)) RL_CARD[c.id] = c;
const rlIsChamp = id => !!(RL_CARD[id] && RL_CARD[id].champ);
// a deck to start with, until you build your own: cheap, with something for the air and a spell
const RL_DEFAULT_DECK = ['deckhand', 'shorecrabs', 'harpooner', 'gulls', 'diver', 'hermit', 'cannonshot', 'battery'];
