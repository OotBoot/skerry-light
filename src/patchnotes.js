'use strict';
// The patch notes log, shown on the main menu's Patch Notes page (src/patchnotesui.js draws it).
// Every change pushed to main adds an entry here for its version, newest at the top, and bumps VERSION in src/config.js to match.
// An entry: { v: version, date: 'YYYY-MM-DD', title: a short headline, and any of these sections, each a list of lines:
//   New (new things to play), Balance (numbers changed), Changes (how something works now), Fixes (bugs put right), Sound (music and sound) }
// Begin a line with the game it touches and a colon ("Maren's End: ...") and that part is shown in bold.
// Write them like real patch notes: plain, short, from the player's side. Leave secrets out entirely: no Easter eggs, secret bosses, secret rewards or hidden options, not even a hint.
var PATCH_NOTES = [
  { v: 157, date: '2026-11-11', title: "Menu tidy", Changes: [
    "Main menu: small tidy-up." ] },
  { v: 156, date: '2026-11-11', title: "Tidier patch notes", Changes: [
    "Patch notes: older entries trimmed down to what matters for everyday play." ] },
  { v: 155, date: '2026-11-11', title: "Rejoin a game in progress", New: [
    "Every mode played together: drop out of a game (a reload, a crash, a phone that slept or lost signal) and you can rejoin it as the same player. Open the game again within fifteen minutes and a Rejoin bar at the top of the main menu takes you back in while the game is still going.",
    "The lobby list marks a game you dropped out of \"tap to rejoin\", and your old invite link takes you back in too.",
    "Keeper's Last Light and the raids: you come back with your points (plus anything earned for you while you were gone), weapons, ammunition, tonics, reforged weapons, calling, ultimate charge and health, where you stood, and down or out if you were.",
    "Drowned Reach: you get your nation back, even if a bot had taken it over, and the whole map is sent to you again.",
    "Wreckers' Night: within the same round your deaths, weapon, health, flares and place on the island come back, and kills already paid in crate keys aren't paid twice.",
    "Skerry Light crews: back in your old place in the crew (the host stays the host), and out on the same voyage where your ship was, with its hull." ], Changes: [
    "Everyone else sees when a player is back. If the host of a Lighthouse night, a raid or a war drops out, that game still ends for everyone." ] },
  { v: 154, date: '2026-11-11', title: "Skerry Raids", Changes: [
    "Raids: the raid card on the main menu is now called Skerry Raids, since it holds both raids. Maren's End keeps its name as a raid." ] },
  { v: 153, date: '2026-11-11', title: "A faster fall", Balance: [
    "Maren's End: you fall down the Swallow 30% faster, about twenty seconds from the platform to the floor." ], Sound: [
    "Maren's End: the falling chant plays 30% faster to keep up, and still peaks just as you land." ] },
  { v: 151, date: '2026-11-11', title: "The Gannet’s Wake: Captain Crane", New: [
    "The Gannet's Wake, Part III, The Quarterdeck: the whole raid is in. Through the captain's cabin and up on to the Gannet's deck, where Captain Absalom Crane is waiting.",
    "He can only be hurt while light is on him: the Light's beam as it sweeps across the deck, or a flare fired from one of the two flare lockers. Shots in the dark do nothing.",
    "Ring the ship's bell at the forecastle to stagger him and throw his crew over the side. Watch for his boat hook, the bellow through his speaking trumpet, and his call for all hands.",
    "At half strength he hoists a black sail that cuts off the Light, and the Gannet starts to founder. From then on only flares light him, so take turns at the lockers.",
    "He drops a pirate token for each of you, and the raid ends on the victory screen. Flares fired and times the bell was rung now count among the MVP stats." ], Changes: [
    "Raids: the callings picker names the raid you're in." ], Sound: [
    "The Gannet's Wake: Captain Crane's fight and his second phase use the new raid music, with its own dawn theme when he goes down." ] },
  { v: 149, date: '2026-11-11', title: "Blunderbuss toned down", Changes: [
    "Keeper's Last Light and Maren's End: the Blunderbuss hits much less hard and its shot falls away far sooner (full strength only out to 4 m, nearly nothing past 14 m). It keeps its wide fan.",
    "Its damage over time is now in line with the other guns: about 7 a second on one target at 4 m and 4 at 6 m, against the Avtomat's 5 (10 with head shots) and the Longarm's 4 (6.5).",
    "Maren's End: back to 3 shots a load (about 3 seconds to load all three)." ] },
  { v: 148, date: '2026-11-11', title: "The Gannet’s Wake gets its music", Sound: [
    "The Gannet's Wake: The Skerries now has its own music, a tense sea shanty at night over low strings, a creaking hull and a far-off bell.",
    "The Gannet's Wake: Below Decks has its own music too: creaking timbers, dripping water and slow, knocking suspense.",
    "The Gannet's Wake: music for the captain's fight, his ship foundering, and dawn after the raid is in, ready for the last part." ] },
  { v: 147, date: '2026-11-11', title: "The Gannet’s Wake: Below Decks", New: [
    "The Gannet's Wake, Part II, Below Decks: climb aboard the risen Gannet and go down through her gun deck, hold, cable tier and forecastle.",
    "Knock is loose below. He only moves while none of you can see him, and three knocks on wood warn you he's coming. If he reaches you, you're down.",
    "The captain's cabin is locked on three keys: one on the Bosun in the hold, one under the black water of the flooded cable tier (hold your breath), and one round Knock's own neck, taken only while someone keeps him still.",
    "The raid now ends at the open cabin door. The last part, her captain, is coming soon." ] },
  { v: 146, date: '2026-11-11', title: "A second raid: The Gannet’s Wake", New: [
    "Raids: a second raid, The Gannet's Wake. Pick it at the top of the raid card; the lobby shows which raid each one is, and it has its own column on the scoreboard.",
    "The Gannet's Wake, Part I, The Skerries: sail the keeper's cutter out through the rocks together. One of you takes the wheel, the rest work the deck. The rocks only show in the Light's beam.",
    "Ring the ship's bell to drive Maren back, fire flares from the locker aft, patch the holes before the flood sinks her, keep inside Plimsoll's ring, and throw the drowned back over the rail.",
    "At the Gannet's mark she rises out of the sea alongside. The rest of the raid, aboard her, is coming soon." ] },
  { v: 145, date: '2026-11-11', title: "Blunderbuss fan", Changes: [
    "Keeper's Last Light and Maren's End: the Blunderbuss now fires its shot in a wide, flat fan from side to side, so one blast sweeps across a whole line of them.",
    "It fires more balls (28) and each one hits harder, so a single target in front of you still takes about as much as before: about 60 up close and 29 at 8 m. Five of them standing abreast at 8 m now take 23 to 30 each." ] },
  { v: 142, date: '2026-11-11', title: "Knife when down", Changes: [
    "Keeper's Last Light: when you're down and your pepperbox is empty with nothing left to load, Fire (or the knife key or button) slashes with your knife from the floor." ] },
  { v: 141, date: '2026-11-11', title: "Patch notes", New: [
    "Main menu: a Patch Notes button under the game banners opens this page, listing every recent update. Each update from now on adds its notes here." ] },
  { v: 140, date: '2026-11-11', title: "Fresnel Lamp fix", Balance: [
    "Fresnel Lamp: broad enemies are easier to keep in the beam." ], Fixes: [
    "Fresnel Lamp: its beam now burns whatever part of an enemy it's on, head to foot. It only ever checked a spot at waist height, which on Maren was below her knees, so it never burned her." ] },
  { v: 139, date: '2026-11-11', title: "A shorter Deep Path", Balance: [
    "Maren's End: the Deep Path is a quarter shorter, with 18 braziers and 16 wrecking balls." ], Fixes: [
    "Maren's End: for players who joined a raid, the wrecking balls now swing smoothly instead of jumping." ] },
  { v: 138, date: '2026-11-11', title: "Blunderbuss buff", Balance: [
    "Keeper's Last Light and Maren's End: the Blunderbuss fires 18 balls at three times the weight, in a tighter cone. Each ball carries on into the one behind.",
    "Blunderbuss damage now holds full to 9 m, falling away to 30% at 30 m.",
    "Blunderbuss: two charges a load, reloaded in three quarters of the time, with 40 in reserve (64 with Spring Tide 3).",
    "Maren's End: the Blunderbuss fires 4 shots a load and reloads in under 2 s." ] },
  { v: 137, date: '2026-11-11', title: "Bottomless reserves", Changes: [
    "Maren's End: every gun's reserve ammunition is bottomless. You still reload; the reserve count shows ∞.",
    "Maren's End: the only salvage that drops is Double Salvage." ] },
  { v: 136, date: '2026-11-11', title: "Flare Pistol burn", Balance: [
    "Flare Pistol: anything caught in its fire is soaked and keeps burning for 2 s after it walks out, enough to finish any ordinary drowned." ] },
  { v: 135, date: '2026-11-11', title: "Apothecary and grenades", Balance: [
    "Maren's End: the Apothecary goes in with the Duck's-Foot (6 volleys a load, 1.6 s reload, 72 in reserve).",
    "Maren's End: every grenade hits twice as hard over twice the area.",
    "Maren's End: the Wellspring is twice as wide." ] },
  { v: 134, date: '2026-11-11', title: "Horizon haze fix", Fixes: [
    "Wreckers' Night: the haze along the horizon no longer shows through walls in first person." ] },
  { v: 133, date: '2026-11-11', title: "Revive timer", Changes: [
    "Keeper's Last Light and Maren's End: while someone is getting you up, your bleed-out clock stops. If they let go, it runs on from where it was." ] },
  { v: 132, date: '2026-11-11', title: "Controller cursor fix", Fixes: [
    "Controller: the on-screen cursor now hides as soon as any game starts. It used to linger at its last spot over Wreckers' Night, Drowned Reach and Keeper's Last Light." ] },
  { v: 129, date: '2026-11-11', title: "The Deep Path, extended", Changes: [
    "Maren's End: the Deep Path runs about twice as far, round the outside of the cave then back round the inside to the door in the middle, with 24 braziers and 22 wrecking balls along it." ] },
  { v: 128, date: '2026-11-11', title: "The storm clears the field", Changes: [
    "Maren's End: as Maren calls up her storm, the sea takes back every drowned and every other boss (her soul stays). Nothing more comes until she's done." ] },
  { v: 127, date: '2026-11-11', title: "A gentler storm", Balance: [
    "Maren's End: a fifth fewer drowned during Maren's storm, and they come a fifth slower. The farthest go back to the sea as the storm arrives." ] },
  { v: 126, date: '2026-11-11', title: "Reforged weapons", Balance: [
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
  { v: 122, date: '2026-11-11', title: "Storm practice moves", Changes: [
    "Settings: Practise: Maren's storm moves off the raid card into Settings." ] },
  { v: 121, date: '2026-11-11', title: "Bell and rings", Fixes: [
    "Maren's End: Maren no longer calls rings while the bell tolls, and the bell waits for a ring she's calling." ] },
  { v: 120, date: '2026-11-11', title: "Maren's soul", Changes: [
    "Maren's End: Maren's soul drifts as it used to, drawn bigger and easier to hit, and high enough over the sea to be shot over the wall from the Plaza." ] },
  { v: 119, date: '2026-11-11', title: "Cleaner main menu", Changes: [
    "Main menu: the compass strip no longer shows behind it (only out at sea)." ] },
  { v: 118, date: '2026-11-11', title: "Practise the storm", New: [
    "Maren's End: Practise: Maren's storm. Alone, straight to Maren at a third of her health. No token and no score." ], Sound: [
    "Maren's End: her storm's wind sits low in the background, a third as loud and gusting less.",
    "Maren's End: her storm's line is spoken once only." ] },
  { v: 117, date: '2026-11-11', title: "Maren's second phase", Fixes: [
    "Maren's End: Maren's second phase rebuilt on top of the Mooncussers' change so both work together." ] },
  { v: 116, date: '2026-11-11', title: "Mooncusser pole swing", Balance: [
    "Keeper's Last Light and Maren's End: the Mooncussers' pole swing deals two knocks." ] },
  { v: 115, date: '2026-11-11', title: "Maren calls the storm", New: [
    "Maren's End: Maren has a second phase at a third of her health. She calls up the storm and can't be hurt while she does; every light in the fort goes out but your lantern, her eyes and the lightning; she takes a quarter less damage and strikes faster; and a drowned bell tolls three times. Outside the sea-green circles at the third toll, you lose half your health." ], Balance: [
    "Maren's End: Maren's Weight lands at once as a 10% slow, then builds from there." ], Sound: [
    "Maren's End: a new theme for Maren's stand in the storm (a tolling bell, choir and drums), with a thunder crack on every lightning flash and a high, gusting wind." ] },
  { v: 114, date: '2026-11-11', title: "Pier and Black Water", Balance: [
    "Maren's End: only the pier's drowned are 30% quicker; the cave's stay slowed.",
    "Maren's End: in Black Water the near circles are twice the size and well apart, and every kill counts while they're held." ] },
  { v: 113, date: '2026-11-11', title: "Maren's Weight", Balance: [
    "Maren's End: Maren's Weight settles 30% faster (full in about fifteen seconds)." ] },
  { v: 112, date: '2026-11-11', title: "Victory screen", New: [
    "Maren's End: a victory screen once Maren's token is taken. Everyone stands together on the sea wall at sunset in their outfits, with the MVP in the middle on a gold step and three best stats under each player.",
    "Maren's End: from the victory screen, spend your pirate token, play again or go back to the main menu. The raid ends once everyone has taken her token (45 s at most)." ] },
  { v: 111, date: '2026-11-11', title: "Maren's ring and soul", Balance: [
    "Maren's End: Maren's ring is a fifth wider.",
    "Maren's End: her soul takes 30 hits (weak-spot hits, a gold bar under its mark, everyone's hits adding up) and darts about quicker." ], Sound: [
    "Maren's End: a second-phase theme for Maren, her fury: a screaming choir, war drums and a frenzied fiddle over a storm tide, swelling as her tide floods in." ] },
  { v: 110, date: '2026-11-11', title: "The Gannet's Locker", New: [
    "The Gannet's Locker: a finish for every weapon and a skin for every boat, a grade above the Admiral." ] },
  { v: 109, date: '2026-11-11', title: "Maintenance", Fixes: [
    "Brings together two updates that both shipped as version 108." ] },
  { v: 108, date: '2026-11-11', title: "The Swallow, reshaped", Changes: [
    "Maren's End: the Swallow is a funnel, its mouth twice as wide (its throat as before), with nothing to catch on and the fall held in its throat. Every kill counts while one of you holds the platform; its drowned are 30% quicker.",
    "Maren's End: the far Lighthouse sweeps one beam, not two, flaring only when it faces you." ], Sound: [
    "Maren's End: when Maren falls, a bittersweet sunset theme plays over the sea: a slow shanty on fiddle and concertina over warm strings, a ship's horn and the waves." ] },
  { v: 107, date: '2026-11-11', title: "A light on the far shore", New: [
    "Maren's End: from the Sea Battery you can see the Lighthouse, lit and turning, on the far shore." ] },
  { v: 106, date: '2026-11-11', title: "Harder bosses", Balance: [
    "Maren's End: every boss and miniboss is 15% stronger there (the Divers, the Mooncussers, the Knock and Maren; the helmeted Divers take sixteen cuts), with each player's share on top.",
    "Maren's End: no tonics in the fort (the Mystery Box and the Lampwright's Bench stay). Reforging in the raid gives only the weapon's look and its own trick, not harder hits or bigger loads." ] },
  { v: 105, date: '2026-11-11', title: "Stamina", New: [
    "Maren's End: a stamina bar beside your health. Ten seconds of sprinting, fifteen to refill from empty, and you're out of breath at empty until it's back to a quarter." ], Balance: [
    "Maren's End: Maren and the Knock are fiercer. Every blow takes half your health (three of six, six of twelve with Stout Heart), with quicker wind-ups, shorter waits between blows, and both move faster." ] },
  { v: 104, date: '2026-11-11', title: "The Long Pier", Changes: [
    "Maren's End: the pier is wider and runs out over the hole to a round platform. The drowned follow you up the pier from halfway; send thirty back on the platform and it gives way." ] },
  { v: 103, date: '2026-11-11', title: "The Flensing Yard", New: [
    "Wreckers' Night: a new map, the Flensing Yard, a derelict whaling station's fenced yard on the sand with a climbable timber lookout in the middle, oil tanks, pipes on trestles, the flensing shed, boiler house, try-works and a jawbone arch.",
    "Wreckers' Night: every round now rotates through three maps: the Bonded Quay, Pilchard Row and the Flensing Yard.",
    "Wreckers' Night: you can climb. Walk up the lookout's stair, stand on its platform and drop off its edge." ], Fixes: [
    "Wreckers' Night: you no longer respawn outside the Bonded Quay's walls." ], Sound: [
    "Maren's End: the fall's music is now a dark, deep chant of low voices that swells all the way down and peaks as you hit the floor." ] },
  { v: 102, date: '2026-11-11', title: "The cave path", Changes: [
    "Maren's End: the cave's path is a fifth wider (its arena, the braziers' reach, the ring and the wrecking balls' swing with it), and its drowned are a tenth slower." ], Sound: [
    "Maren's End: a sad, ghostly theme for the Long Pier over the dry sea bed, and a ghostly wail that grows all the way down the Swallow." ] },
];
