'use strict';
// The patch notes log, shown on the main menu's Patch Notes page (src/patchnotesui.js draws it).
// Every change pushed to main adds an entry here for its version, newest at the top, and bumps VERSION in src/config.js to match.
// An entry: { v: version, date: 'YYYY-MM-DD', title: a short headline, and any of these sections, each a list of lines:
//   New (new things to play), Balance (numbers changed), Changes (how something works now), Fixes (bugs put right), Sound (music and sound) }
// Begin a line with the game it touches and a colon ("Maren's End: ...") and that part is shown in bold.
// Write them like real patch notes: plain, short, from the player's side. Never give away a secret here (the Easter egg's steps, where the secret boss hides).
var PATCH_NOTES = [
  { v: 145, date: '2026-11-11', title: 'Blunderbuss fan', Changes: [
    "Keeper's Last Light and Maren's End: the Blunderbuss now fires its shot in a wide, flat fan from side to side, so one blast sweeps across a whole line of them.",
    "It fires more balls (28) and each one hits harder, so a single target in front of you still takes about as much as before: about 60 up close and 29 at 8 m. Five of them standing abreast at 8 m now take 23 to 30 each." ] },
  { v: 144, date: '2026-11-11', title: 'Verity speaks up', Sound: [
    "Verity's Grin: while you wear it in a game, every second there's a 1 in 50 chance Verity's voice plays." ] },
  { v: 143, date: '2026-11-11', title: 'Verity’s Wardrobe', New: [
    "Maren's End: Verity now drops his whole wardrobe the first time you take his Piece of Eight: 12 cosmetics no crate holds, in their own yellow grade.",
    "Outfit: Verity's Grin. His smiling head on your shoulders, blinking and grinning, with three little Veritys circling you.",
    "Weapon finishes for all six weapons, covered in his blinking, grinning faces, with a ripple of light running down the gun every few seconds. Each weapon has its own touch: a grin round the blunderbuss's bell, his eye in the longarm's scope, his tongue down the harpoon gun, teeth along the cutlass.",
    "Boat skins for all four boats: Verity's Smile (Brig), The Little Helper (Cutter), The Yellow Room (Barque) and Many Happy Faces (Carrier), each with its own moving look on the ship and from the deck.",
    "Drowned Reach: Verity's Smile banner, with his faces blinking across your land.",
    "Verity's Wardrobe also shows in the Gannet's Locker, so you can see what you have and equip it there." ], Sound: [
    "Verity's Wardrobe: he giggles when you equip any of it. His finishes squeak with every shot and giggle at every kill, his outfit giggles when you take a knock, and his boats giggle at every crate and now and then at sea. The Little Helper boings, The Yellow Room's lights buzz, and Many Happy Faces' balloons pop." ] },
  { v: 142, date: '2026-11-11', title: 'Knife when down', Changes: [
    "Keeper's Last Light: when you're down and your pepperbox is empty with nothing left to load, Fire (or the knife key or button) slashes with your knife from the floor." ] },
  { v: 141, date: '2026-11-11', title: 'Patch notes', New: [
    "Main menu: a Patch Notes button under the game banners opens this page, listing every recent update. Each update from now on adds its notes here." ] },
  { v: 140, date: '2026-11-11', title: 'Fresnel Lamp fix', Fixes: [
    "Fresnel Lamp: its beam now burns whatever part of an enemy it's on, head to foot. It only ever checked a spot at waist height, which on Maren was below her knees, so it never burned her." ], Balance: [
    "Fresnel Lamp: broad enemies are easier to keep in the beam." ] },
  { v: 139, date: '2026-11-11', title: 'A shorter Deep Path', Balance: [
    "Maren's End: the Deep Path is a quarter shorter, with 18 braziers and 16 wrecking balls." ], Fixes: [
    "Maren's End: for players who joined a raid, the wrecking balls now swing smoothly instead of jumping." ] },
  { v: 138, date: '2026-11-11', title: 'Blunderbuss buff', Balance: [
    "Keeper's Last Light and Maren's End: the Blunderbuss fires 18 balls at three times the weight, in a tighter cone. Each ball carries on into the one behind.",
    "Blunderbuss damage now holds full to 9 m, falling away to 30% at 30 m.",
    "Blunderbuss: two charges a load, reloaded in three quarters of the time, with 40 in reserve (64 with Spring Tide 3).",
    "Maren's End: the Blunderbuss fires 4 shots a load and reloads in under 2 s." ] },
  { v: 137, date: '2026-11-11', title: 'Bottomless reserves', Changes: [
    "Maren's End: every gun's reserve ammunition is bottomless. You still reload; the reserve count shows ∞.",
    "Maren's End: the only salvage that drops is Double Salvage." ] },
  { v: 136, date: '2026-11-11', title: 'Flare Pistol burn', Balance: [
    "Flare Pistol: anything caught in its fire is soaked and keeps burning for 2 s after it walks out, enough to finish any ordinary drowned." ] },
  { v: 135, date: '2026-11-11', title: 'Apothecary and grenades', Balance: [
    "Maren's End: the Apothecary goes in with the Duck's-Foot (6 volleys a load, 1.6 s reload, 72 in reserve).",
    "Maren's End: every grenade hits twice as hard over twice the area.",
    "Maren's End: the Wellspring is twice as wide." ] },
  { v: 134, date: '2026-11-11', title: 'Horizon haze fix', Fixes: [
    "Wreckers' Night: the haze along the horizon no longer shows through walls in first person." ] },
  { v: 133, date: '2026-11-11', title: 'Revive timer', Changes: [
    "Keeper's Last Light and Maren's End: while someone is getting you up, your bleed-out clock stops. If they let go, it runs on from where it was." ] },
  { v: 132, date: '2026-11-11', title: 'Controller cursor fix', Fixes: [
    "Controller: the on-screen cursor now hides as soon as any game starts. It used to linger at its last spot over Wreckers' Night, Drowned Reach and Keeper's Last Light." ] },
  { v: 131, date: '2026-11-11', title: 'Restless secret', Changes: [
    "Maren's End: the secret doesn't stay put any more. Each raid is different." ] },
  { v: 130, date: '2026-11-11', title: 'Something in the deep', New: [
    "Maren's End: something new is hiding down there, with a pirate token for those who find it. Keep your lantern up." ] },
  { v: 129, date: '2026-11-11', title: 'The Deep Path, extended', Changes: [
    "Maren's End: the Deep Path runs about twice as far, round the outside of the cave then back round the inside to the door in the middle, with 24 braziers and 22 wrecking balls along it." ] },
  { v: 128, date: '2026-11-11', title: 'The storm clears the field', Changes: [
    "Maren's End: as Maren calls up her storm, the sea takes back every drowned and every other boss (her soul stays). Nothing more comes until she's done." ] },
  { v: 127, date: '2026-11-11', title: 'A gentler storm', Balance: [
    "Maren's End: a fifth fewer drowned during Maren's storm, and they come a fifth slower. The farthest go back to the sea as the storm arrives." ] },
  { v: 126, date: '2026-11-11', title: 'Reforged weapons', Balance: [
    "Maren's End: a reforged weapon hits the drowned as hard as it does at the Lighthouse again. The raid's bosses still take its plain damage." ] },
  { v: 125, date: '2026-11-11', title: "Bigger bell circles", Balance: [
    "Maren's End: the bell's circles are half as wide again (about 15 m across), and the drowned and other bosses wade 40% slower inside them." ] },
  { v: 124, date: '2026-11-11', title: "Don't stare at the false light", Changes: [
    "Keeper's Last Light and Maren's End: the Mooncusser's false light burns if you stare. Half a second looking straight at the open light costs a knock, and another for every second more." ] },
  { v: 123, date: '2026-11-11', title: "Maren's End for two", Changes: [
    "Maren's End: the bridge's circles count who's on their feet. A pair with one down gets the lone player's minute and a half.",
    "Maren's End: anyone bled out comes back at each step of the bridge and the fort, so everyone can take Maren's token.",
    "Maren's End: the Knock's song breaks by who's still standing.",
    "Maren's End: extra bosses beside Maren come one at a time for one or two players, two at a time for three or four." ] },
  { v: 122, date: '2026-11-11', title: 'Storm practice moves', Changes: [
    "Settings: Practise: Maren's storm moves off the raid card into Settings." ] },
  { v: 121, date: '2026-11-11', title: 'Bell and rings', Fixes: [
    "Maren's End: Maren no longer calls rings while the bell tolls, and the bell waits for a ring she's calling." ] },
  { v: 120, date: '2026-11-11', title: "Maren's soul", Changes: [
    "Maren's End: Maren's soul drifts as it used to, drawn bigger and easier to hit, and high enough over the sea to be shot over the wall from the Plaza." ] },
  { v: 119, date: '2026-11-11', title: 'Cleaner main menu', Changes: [
    "Main menu: the compass strip no longer shows behind it (only out at sea)." ] },
  { v: 118, date: '2026-11-11', title: 'Practise the storm', New: [
    "Maren's End: Practise: Maren's storm. Alone, straight to Maren at a third of her health. No token and no score." ], Sound: [
    "Maren's End: her storm's wind sits low in the background, a third as loud and gusting less.",
    "Maren's End: her storm's line is spoken once only." ] },
  { v: 117, date: '2026-11-11', title: "Maren's second phase", Fixes: [
    "Maren's End: Maren's second phase rebuilt on top of the Mooncussers' change so both work together." ] },
  { v: 116, date: '2026-11-11', title: 'Mooncusser pole swing', Balance: [
    "Keeper's Last Light and Maren's End: the Mooncussers' pole swing deals two knocks." ] },
  { v: 115, date: '2026-11-11', title: 'Maren calls the storm', New: [
    "Maren's End: Maren has a second phase at a third of her health. She calls up the storm and can't be hurt while she does; every light in the fort goes out but your lantern, her eyes and the lightning; she takes a quarter less damage and strikes faster; and a drowned bell tolls three times. Outside the sea-green circles at the third toll, you lose half your health." ], Balance: [
    "Maren's End: Maren's Weight lands at once as a 10% slow, then builds from there." ], Sound: [
    "Maren's End: a new theme for Maren's stand in the storm (a tolling bell, choir and drums), with a thunder crack on every lightning flash and a high, gusting wind." ] },
  { v: 114, date: '2026-11-11', title: 'Pier and Black Water', Balance: [
    "Maren's End: only the pier's drowned are 30% quicker; the cave's stay slowed.",
    "Maren's End: in Black Water the near circles are twice the size and well apart, and every kill counts while they're held." ] },
  { v: 113, date: '2026-11-11', title: "Maren's Weight", Balance: [
    "Maren's End: Maren's Weight settles 30% faster (full in about fifteen seconds)." ] },
  { v: 112, date: '2026-11-11', title: 'Victory screen', New: [
    "Maren's End: a victory screen once Maren's token is taken. Everyone stands together on the sea wall at sunset in their outfits, with the MVP in the middle on a gold step and three best stats under each player.",
    "Maren's End: from the victory screen, spend your pirate token, play again or go back to the main menu. The raid ends once everyone has taken her token (45 s at most)." ] },
  { v: 111, date: '2026-11-11', title: "Maren's ring and soul", Balance: [
    "Maren's End: Maren's ring is a fifth wider.",
    "Maren's End: her soul takes 30 hits (weak-spot hits, a gold bar under its mark, everyone's hits adding up) and darts about quicker." ], Sound: [
    "Maren's End: a second-phase theme for Maren, her fury: a screaming choir, war drums and a frenzied fiddle over a storm tide, swelling as her tide floods in." ] },
  { v: 110, date: '2026-11-11', title: "The Gannet's Locker", New: [
    "The Gannet's Locker: a finish for every weapon and a skin for every boat, a grade above the Admiral." ] },
  { v: 109, date: '2026-11-11', title: 'Maintenance', Fixes: [
    "Brings together two updates that both shipped as version 108." ] },
  { v: 108, date: '2026-11-11', title: 'The Swallow, reshaped', Changes: [
    "Maren's End: the Swallow is a funnel, its mouth twice as wide (its throat as before), with nothing to catch on and the fall held in its throat. Every kill counts while one of you holds the platform; its drowned are 30% quicker.",
    "Maren's End: the far Lighthouse sweeps one beam, not two, flaring only when it faces you." ], Sound: [
    "Maren's End: when Maren falls, a bittersweet sunset theme plays over the sea: a slow shanty on fiddle and concertina over warm strings, a ship's horn and the waves." ] },
  { v: 107, date: '2026-11-11', title: 'A light on the far shore', New: [
    "Maren's End: from the Sea Battery you can see the Lighthouse, lit and turning, on the far shore." ] },
  { v: 106, date: '2026-11-11', title: 'Harder bosses', Balance: [
    "Maren's End: every boss and miniboss is 15% stronger there (the Divers, the Mooncussers, the Knock and Maren; the helmeted Divers take sixteen cuts), with each player's share on top.",
    "Maren's End: no tonics in the fort (the Mystery Box and the Lampwright's Bench stay). Reforging in the raid gives only the weapon's look and its own trick, not harder hits or bigger loads." ] },
  { v: 105, date: '2026-11-11', title: 'Stamina', New: [
    "Maren's End: a stamina bar beside your health. Ten seconds of sprinting, fifteen to refill from empty, and you're out of breath at empty until it's back to a quarter." ], Balance: [
    "Maren's End: Maren and the Knock are fiercer. Every blow takes half your health (three of six, six of twelve with Stout Heart), with quicker wind-ups, shorter waits between blows, and both move faster." ] },
  { v: 104, date: '2026-11-11', title: 'The Long Pier', Changes: [
    "Maren's End: the pier is wider and runs out over the hole to a round platform. The drowned follow you up the pier from halfway; send thirty back on the platform and it gives way." ] },
  { v: 103, date: '2026-11-11', title: 'The Flensing Yard', New: [
    "Wreckers' Night: a new map, the Flensing Yard, a derelict whaling station's fenced yard on the sand with a climbable timber lookout in the middle, oil tanks, pipes on trestles, the flensing shed, boiler house, try-works and a jawbone arch.",
    "Wreckers' Night: every round now rotates through three maps: the Bonded Quay, Pilchard Row and the Flensing Yard.",
    "Wreckers' Night: you can climb. Walk up the lookout's stair, stand on its platform and drop off its edge." ], Fixes: [
    "Wreckers' Night: you no longer respawn outside the Bonded Quay's walls." ], Sound: [
    "Maren's End: the fall's music is now a dark, deep chant of low voices that swells all the way down and peaks as you hit the floor." ] },
  { v: 102, date: '2026-11-11', title: 'The cave path', Changes: [
    "Maren's End: the cave's path is a fifth wider (its arena, the braziers' reach, the ring and the wrecking balls' swing with it), and its drowned are a tenth slower." ], Sound: [
    "Maren's End: a sad, ghostly theme for the Long Pier over the dry sea bed, and a ghostly wail that grows all the way down the Swallow." ] },
];
