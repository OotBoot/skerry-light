'use strict';
// The patch notes log, shown on the main menu's Patch Notes page (src/patchnotesui.js draws it).
// Every change pushed to main adds an entry here for its version, newest at the top, and bumps VERSION in src/config.js to match.
// An entry: { v: version, date: 'YYYY-MM-DD', title: a short headline, and any of these sections, each a list of lines:
//   New (new things to play), Balance (numbers changed), Changes (how something works now), Fixes (bugs put right), Sound (music and sound) }
// Begin a line with the game it touches and a colon ("Maren's End: ...") and that part is shown in bold.
// Write them like real patch notes: plain, short, from the player's side. Leave secrets out entirely: no Easter eggs, secret bosses, secret rewards or hidden options, not even a hint.
var PATCH_NOTES = [
  { v: 236, date: '2026-11-18', title: "Maren's End: free to move under the sea wall", Fixes: [
    "The Chronicle of the Light, Maren's End: in the last part, under the fort's sea wall, everyone was held fast where they came out of the old drain and couldn't move. The bed below the wall is open again, so you can reach the bells and the wrecks.",
  ] },
  { v: 235, date: '2026-11-18', title: "Online limits, made safer", Fixes: [
    "Online: if the server can't tell where a player is connecting from, it no longer counts everyone as one address, so the new 12-connection limit can never shut out a crowd of real players.",
  ] },
  { v: 234, date: '2026-11-18', title: "Fairer online play", Changes: [
    "Online: one address can now hold at most 12 connections at once, so a single person can no longer fill the server and lock everyone else out. A busy household or classroom still fits.",
    "Scoreboards and cloud saves: the limits on how often scores and saves can be sent now go by each player's real address, so they can't be dodged.",
  ] },
  { v: 233, date: '2026-11-18', title: "Hold to skip cutscenes", New: [
    "The Chronicle of the Light: cutscenes can be skipped again. Hold Space or Enter (A on a controller, or a finger on the screen) for a second. A ring in the corner fills while you hold, and a tap does nothing.",
    "The Chronicle of the Light: in co-op, holding casts your vote to skip, and the cutscene only skips once everyone has voted. The corner shows how many have voted, who has, and who's still watching.",
  ] },
  { v: 232, date: '2026-11-18', title: "Maren's End: the Old Drain for the whole crew", Changes: [
    "Maren's End, The Old Drain: the drowned stop coming once anyone reaches the Cistern Hall. Any already up sink back, so you can work out the lamps in peace.",
    "Maren's End, The Old Drain: everyone can now turn the cistern lamps, not just whoever carries Maren's Lantern.",
    "Maren's End, The Old Drain: anyone can light a brazier while the lantern is close to it, whether someone is carrying it or it's lying on the stones. If the carrier goes down, the rest of the crew can still light the braziers around them.",
  ] },
  { v: 231, date: '2026-11-18', title: "Weapons back in hand on Freebooters' Sea", Fixes: [
    "The Chronicle of the Light: Freebooters' Sea, Crowsnest Rock and Saltcote: you can draw and fire your weapons again after the cutscene. Your gun is now only put away while your arms are full with the hoard.",
  ] },
  { v: 230, date: '2026-11-18', title: "Full screen stays on after cutscenes", Fixes: [
    "The Chronicle of the Light: cutscenes no longer let go of your mouse, so pressing Escape while one plays no longer takes the game out of full screen. When the cutscene ends you're straight back in control, with no click needed to look around again.",
  ] },
  { v: 229, date: '2026-11-18', title: "Flares for the Gannet's spars", Changes: [
    "The Chronicle of the Light: The Gannet's Wake, Her Lantern: when you reach the ring of spars, everyone aboard is handed a flare pistol (slot 3). Shoot a flare into each of the four tall spars to light it. You no longer need to bring the cutter alongside and fire from the forward deck.",
    "The Chronicle of the Light: The Gannet's Wake, Her Lantern: the tall spars are much easier to hit, catching a flare anywhere within 9 m of the mast, from the water to well above its top.",
    "The Chronicle of the Light: The Gannet's Wake, Her Lantern: firing the cutter's flare locker in the ring always lights one of the spars, the nearest one still dark.",
  ] },
  { v: 228, date: '2026-11-18', title: "The next mission opens straight away", Fixes: [
    "The Chronicle of the Light: finishing a mission now opens the next one straight away, with no need to reload the page. The mission list also moves on to it for you, and in co-op the host's lobby picks it too.",
  ] },
  { v: 227, date: '2026-11-18', title: "Missions wait for every calling", Changes: [
    "The Chronicle of the Light: a mission no longer starts until everyone in the crew has picked a calling. The opening cutscene, the clock and the enemies all wait, and anyone who has already picked sees who is still choosing. If someone hasn't picked after 90 seconds, the mission starts without waiting for them, and they stay safe at the picker until they choose.",
  ] },
  { v: 226, date: '2026-11-18', title: "The menu stays where you put it", Fixes: [
    "Opening the game from an old invite link, or from a tab left open on a Skerry Light crew, no longer sends you to Skerry Light on every launch.",
    "Picking another game on the main menu while an invite was still being looked for could jump you back to Skerry Light. Once you choose something yourself, the invite now steps aside.",
    "The address bar no longer keeps an old crew's name after an invite has been used, so a reload or a reopened tab starts on the main menu.",
  ] },
  { v: 225, date: '2026-11-18', title: "Skerry Clash: First person for three keepers", New: [
    "Skerry Clash: Three keepers now has a First person option. Press Three keepers, first person on the card: a bot plays the cards for all three keepers, and you fight as your own troops on the round skerry.",
    "Skerry Clash: online, tick First person in a match for three. Every keeper takes the field as their own troops, and a bot takes any empty seat.",
    "Skerry Clash: in First person for three, the map is round with your rock at the bottom, and each rival's held troop has a name tag in their colour.",
  ] },
  { v: 224, date: '2026-11-18', title: "Skerry Clash: First person", New: [
    "Skerry Clash: new First person mode. A bot plays the cards for each side, and you take the field as any troop yours sends: walk it, look round and strike what's in front of you, in first person.",
    "Skerry Clash: swap to any of your troops on the field at any time from the row along the bottom (1 to 9, or Tab). When your bot sends a new one, press F to take it. If yours falls, you take the newest straight away.",
    "Skerry Clash: First person online: host it from the lobby (Host first person, or tick First person). Your rival gets the other bot and does the same, and you can see which troop they're holding.",
    "Skerry Clash: First person works with mouse and keyboard, a controller (sticks to walk and look, RT to strike, LB/RB to swap) and touch (a stick on the left, drag on the right to look, and a Strike button). A small map shows the race and where you are.",
  ], Changes: [
    "Skerry Clash: in First person, the troop you hold walks a bit faster than it would on its own. First person matches give crates but aren't rated.",
  ] },
  { v: 223, date: '2026-11-17', title: "Skerry Clash rating follows your username", Changes: [
    "Skerry Clash: your rating (MMR) now belongs to your username alone. Play under the same name on any device and every win or loss moves the same rating, with no more \"username taken\" for a name rated on another save.",
    "Skerry Clash: a device that has never played under your name shows that name's real rating as soon as you type it in, instead of starting from 1000.",
  ] },
  { v: 222, date: '2026-11-17', title: "Fresnel Lamp toned down in the Chronicle", Balance: [
    "The Chronicle of the Light: the Keeper's Fresnel Lamp burns for 70% less, in line with the other guns. It still burns everything caught in its beam at once. Keeper's Last Light and the raids are unchanged.",
  ] },
  { v: 221, date: '2026-11-17', title: "Callings for the Chronicle", New: [
    "The Chronicle of the Light: four callings of its own, picked at the start of each mission in place of Maren's End's three. Each has two weapons, a trait that is always on, its own jump, a grenade (G) and an ultimate (X).",
    "The Chronicle of the Light: the Keeper carries the Fresnel Lamp and Pepperbox. Lantern-Bearer mends you and friends within 9 m a knock every five seconds; Lamp Step bursts a ring of light under you in mid-air; the Storm Lantern lights, slows and scorches everything near it for twelve seconds; Rekindle burns and throws back everything within 14 m, mends every friend there to full and gets the fallen up.",
    "The Chronicle of the Light: the Wrecker carries the Punt Gun and Cutlass. Hard as Nails takes a quarter off every knock; Lunge hurls you forward through them in mid-air; the Grapple-Chain drags everything within 8 m into a heap, then bursts; Wreckers' Fury turns every shot into a wide cleave for twelve seconds, halves knocks and mends a knock for each one dropped.",
    "The Chronicle of the Light: the Riding Officer carries the Longarm and Pepperbox. Dead Eye makes head shots hit a third harder and every gun load a quarter quicker; Hang Fire holds you steady in mid-air for up to two seconds; the Rescue Rocket flies nearly flat and bursts where it strikes, lighting what survives; Rocket Barrage brings twelve rockets down about the spot you're looking at.",
    "The Chronicle of the Light: the Lampwright carries the Avtomat and Harpoon gun. Gunsmith makes your guns hit 15% harder; Grapnel Line hauls you to whatever you're looking at, up to 22 m; the Lens Sentry burns the nearest enemy within 16 m for fourteen seconds; the Great Lens burns three at a time within 20 m for sixteen seconds, slows them and halves the knocks on friends beside it.",
    "The Chronicle of the Light: the picker shows how many missions you've seen through with each calling. That count is kept in your save code and merges with your other devices.",
  ], Changes: [
    "The Chronicle of the Light: in co-op each player picks their own calling and everyone sees what the others throw and set down. A crew is strongest with one of each, but any calling can carry a mission alone.",
  ] },
  { v: 220, date: '2026-11-17', title: "The First Fire, kinder", Balance: [
    "The Chronicle of the Light: The First Fire is easier to keep alight in every part. Driftwood: one bundle fewer to stack before you can light it.",
    "The Chronicle of the Light: The First Fire: in The Haar and The Ship the fire burns down about a third slower, starts fuller, and each bundle of driftwood gives more. Fog banks come less often, drift in slower and smother less of it, and the drowned kick it apart about half as fast.",
    "The Chronicle of the Light: The First Fire: brands last longer, more driftwood washes up, and once the fire's down to embers you have 24 seconds to feed it instead of 14. In The Ship, the ship loses sight of a dimmed fire more slowly.",
  ], Changes: [
    "The Chronicle of the Light: cinematics can no longer be skipped. Each plays through to the end, for everyone together.",
  ] },
  { v: 219, date: '2026-11-17', title: "The Chronicle of the Light, voiced", Sound: [
    "The Chronicle of the Light: every line in all fourteen missions is now spoken aloud, 615 in all, with each character keeping the same voice from mission to mission. Distant shouts carry across the water, and the drowned sound like the drowned.",
    "The Chronicle of the Light: new music for the campaign: themes for tense nights, sailing, fighting, bosses, sorrow and fog, a hopeful closing theme and a victory theme, plus a flamenco cove fight in The Mooncussers, the first lighting of the Light, and a last hymn for The Drowned Reach. Elsewhere the missions draw on the other games' music.",
    "The Chronicle of the Light: real recordings for the campaign's sound effects: fires catching and fed, fog smothering flame, winches, capstans and clockwork, sleet on the lantern glass, ships striking rock, muskets, oars, the flood in Wrackhaven's streets and more.",
  ], Changes: [
    "The Chronicle of the Light: a mission's music, sounds and voices load when you start it, so the game stays light on memory. Subtitles now stay up for as long as a line is spoken.",
  ] },
  { v: 218, date: '2026-11-16', title: "The Chronicle of the Light", New: [
    "The Chronicle of the Light: a tenth game, a story campaign for one to four. Fourteen missions play the Skerries' timeline from the lore compendium, from the first fire on Lantern Rock to the war on the Drowned Reach, in five acts.",
    "The Chronicle of the Light: every mission has its own ground, goals and fights, often in parts of known places you haven't walked before: carry the lens up the new tower, sail behind Plimsoll, hold the keeper's station through the winter, get the townsfolk out of drowning Wrackhaven, and more, each with a fight to finish it.",
    "The Chronicle of the Light: cinematics open and close every mission and mark the key moments inside it, with the people of the story speaking their parts. Space, Enter, a tap or A skips one; together, once everyone has asked.",
    "The Chronicle of the Light: The Kittiwake tells the first account of Verity, aboard a fishing smack off the Near Skerries in February 1888.",
    "The Chronicle of the Light: progress is kept in your browser and your save code, and missions open in order. Finishing a mission the first time gives a weapon crate and an outfit crate. A failed mission can be tried again from the part you reached.",
    "The Chronicle of the Light: play together from the card's own lobby or an invite link. The host runs the mission and the fights grow with the crew." ] },
  { v: 217, date: '2026-11-16', title: "Skerry Clash: better watching", New: [
    "Skerry Clash: you can now watch a Triple Draft online. Both keepers show side by side over the arena, each with the round they're on, the three cards they're choosing from, the card they take, and the deck they're building. When the draft ends you carry straight on into watching the duel.",
    "Skerry Clash: watchers now see every keeper's hand and next card under their name, with an oil bar beside their oil, and the card each keeper has picked up to play lights up. Cards a keeper can't afford yet are dimmed." ], Fixes: [
    "Skerry Clash: watching a Triple Draft no longer leaves you stuck in the lobby until the duel starts." ] },
  { v: 216, date: '2026-11-16', title: "Skerry Clash: room for three", Fixes: [
    "Skerry Clash: invite links to a Three keepers match turned the third keeper away as if the room were full. All three can now join from an invite.",
    "Skerry Clash: Host a duel now always hosts a duel, even if your last room was set to Three keepers.",
    "Skerry Clash: a keeper on a slower device is no longer counted as gone while their arena is still loading at the start of a Three keepers match." ], Changes: [
    "Skerry Clash: a new Host three keepers button beside Host a duel and Host a triple draft opens a room for three straight away." ] },
  { v: 215, date: '2026-11-16', title: "Lore compendium: three new tales", New: [
    "Lore compendium: Skerry Clash now has its own tale, with new pages for the Race, the Threefold Skerry, the keepers of the Race, the Great Lights and Lamp Towers (and the Lampwright's Crate), the hands that cross the causeways, and the triple draft.",
    "Lore compendium: Skerry Links has its own tale, with all nine holes, the view of the Light from the course, and the ball and club crates.",
    "Lore compendium: The Original has its own tale, The Early Watches, from the years the keeper swung the beam by hand.",
    "Lore compendium: Maren Holm and Plimsoll's pages now tell how they fight on the Race, and the timeline, the main page and Did you know have caught up with the new tales." ] },
  { v: 214, date: '2026-11-16', title: "Skerry Clash: Triple Draft, your own cards", Changes: [
    "Skerry Clash: in a Triple Draft each keeper is now offered their own cards instead of the same ones. Both of you still get the same theme each round, but never the same three.",
    "Skerry Clash: you can now see your rival's three options each round, just under your own. You never see which one they took. Online it shows the round your rival is on, against the bot the same round as yours." ] },
  { v: 213, date: '2026-11-16', title: "Skerry Clash: Three keepers", New: [
    "Skerry Clash: a new Three keepers mode, every keeper for themselves. Three rocks share one round skerry, cut apart by three channels, with a causeway over each one to your two neighbours.",
    "Skerry Clash: each keeper has a Great Light and two Lamp Towers, one facing each neighbour. Your troops go for whichever rival is nearer, so you can send a push at either side.",
    "Skerry Clash: lose your Great Light and you're out, with your other towers and troops. A keeper who leaves an online match is out too. The last Great Light burning wins. At time the keeper with the most towers standing wins, with overtime if it's level.",
    "Skerry Clash: play it against two bots with Three keepers on the card, at the difficulty you've chosen. Online, the host ticks Three keepers in the lobby and up to three can join; a bot takes any empty seat. Up to eight can still watch.",
    "Skerry Clash: the third keeper plays in gold, with their name, oil and towers in a plate of their own, and the end card shows the finishing order.",
    "Skerry Clash: Three keepers matches earn tower crates, one for finishing and one more for a win, but aren't rated and don't change your duel record." ], Balance: [
    "Skerry Clash: in Three keepers, towers have four fifths of a duel tower's health, since every keeper's oil is split between two rivals." ] },
  { v: 212, date: '2026-11-16', title: "Skerry Clash: crate opening", Changes: [
    "Skerry Clash: the Lampwright's Crate now opens with the same reel as the Skerry Crate, spinning through towers and settling on your prize.",
    "Skerry Clash: Open all on the Lampwright's Crate now spins the reel to your best pull before showing the haul, like the other crates." ] },
  { v: 211, date: '2026-11-16', title: "Skerry Clash: Triple Draft in the arena", Changes: [
    "Skerry Clash: the Triple Draft now happens inside the game. The arena comes up with both keepers' towers, and you pick your cards at the foot of the screen, then the duel starts right there.",
    "Skerry Clash: hosting online now has its own Host a triple draft button next to Host a duel. You can still switch it on or off in the lobby before you start." ] },
  { v: 210, date: '2026-11-16', title: "Skerry Clash: emotes", New: [
    "Skerry Clash: emotes. A new button at the bottom left of the match (or the E key) opens ten of them: Ahoy!, Well played, Ha ha ha!, Nooo…, Grrr!, Wow!, Hmm…, Oops!, Good luck! and Thanks!, starring the keeper, a shore crab, a puffin, a drowned sailor, a herring gull and a grey seal.",
    "Skerry Clash: the emote you pick pops up in an animated bubble over your Great Light, with its own sound. Your rival sees and hears it online, and so does everyone watching.",
    "Skerry Clash: Mute rival in the emote picker hides the other keeper's emotes for the rest of the match.",
    "Skerry Clash: the bot now emotes now and then: a hello at the start, a laugh when it takes a tower, a grumble when it loses one, and sometimes an answer to yours." ], Changes: [
    "Skerry Clash: you can send one emote every 1.2 seconds and up to four in any ten seconds. The button dims while you wait." ] },
  { v: 209, date: '2026-11-16', title: "Skerry Clash: champions buffed", Balance: [
    "Skerry Clash: all champions are stronger.",
    "Skerry Clash: Maren Holm: hit points 1900 to 2300, damage 175 to 210. Sea-Green Light lasts 5 seconds (was 4), deals 170 a second (was 130), and its cooldown is 13 seconds (was 16).",
    "Skerry Clash: Plimsoll: hit points 1500 to 1800, damage 210 to 250. Blood in the Water bites for 3.5 times his damage (was 3), his faster attacks last 5 seconds (was 4), and its cooldown is 9 seconds (was 11)." ] },
  { v: 208, date: '2026-11-16', title: "Skerry Clash: champion tweaks", Changes: [
    "Skerry Clash: small sound and balance tweaks to a champion." ] },
  { v: 207, date: '2026-11-16', title: "Skerry Clash: Triple Draft", New: [
    "Skerry Clash: a new Triple Draft mode. Instead of bringing your own deck, both keepers build one on the spot: eight rounds, three cards each round, take one and the other two are gone.",
    "Skerry Clash: both keepers are offered exactly the same cards, and no card comes up twice in one draft. Each round has a theme (a big hitter, something that hits flyers, a spell that strikes, a cheap troop, a building or a spell, or anything goes), so every drafted deck has a fighting chance.",
    "Skerry Clash: play it against the bot with the new Triple draft button on the Skerry Clash card. The bot drafts from the same offers, and Again on the end screen starts a fresh draft.",
    "Skerry Clash: online, the host can tick Triple draft in the lobby, and the list of duels shows which ones are drafts. Each pick has 15 seconds, you can see how far your rival has got, and the duel starts as soon as both decks are done." ], Fixes: [
    "Skerry Clash: the list of online duels now shows the host's rating beside their name, as it was meant to." ] },
  { v: 206, date: '2026-11-16', title: "Skerry Clash: champions", New: [
    "Skerry Clash: champions are here. Maren Holm and Plimsoll join the deck builder as champion cards, with a gold frame and their own Champions filter. A deck can hold one champion.",
    "Skerry Clash: a champion plays like a troop, but its card stays out of your hand while it's on the field and only comes back once it falls.",
    "Skerry Clash: while your champion is out, a round ability button appears above your hand (or press Q). Using it costs oil, then it has a cooldown before you can use it again.",
    "Skerry Clash: Maren Holm (5 oil) carries her lantern into battle and can hit flyers. Her ability, Sea-Green Light (2 oil, 16 s cooldown), makes her untouchable for 4 seconds while every enemy within 3 tiles is slowed and takes 130 damage a second.",
    "Skerry Clash: Plimsoll (4 oil) is a fast melee fighter. His ability, Blood in the Water (1 oil, 11 s cooldown), lunges up to 6 tiles onto the strongest enemy nearby for triple damage, then doubles his attack speed for 4 seconds.",
    "Skerry Clash: the bot sometimes brings a champion and uses its ability when it counts." ] },
  { v: 205, date: '2026-11-16', title: "Skerry Clash: Shipwreck cost", Balance: [
    "Skerry Clash: Shipwreck now costs 5 oil, down from 6. Now that it can only land on your own rock it's a defensive card, and its price comes down to match. Its damage and size are unchanged." ] },
  { v: 204, date: '2026-11-16', title: "Skerry Clash: watch duels live", New: [
    "Skerry Clash: watch any online duel live. Every duel in the list now has a Watch button, whether it's waiting, full or under way. Up to 8 people can watch one duel.",
    "Skerry Clash: watchers see the whole board, both keepers' names, lights put out, oil and the clock, and can swap ends to follow either keeper. They can't play, and watching never touches anyone's rating or crates.",
    "Skerry Clash: both keepers see how many people are watching, and the lobby lists the watchers by name.",
    "Skerry Clash: an invite link to a duel that's full or already started now lets you watch it instead.",
    "Skerry Clash: watchers stay for the rematch, and you can stop watching at any time from the menu." ], Balance: [
    "Skerry Clash: Shipwreck can now only be dropped on your own rock, wherever a troop could go, instead of anywhere on the arena." ] },
  { v: 203, date: '2026-11-16', title: "Skerry Clash: random decks", New: [
    "Skerry Clash: a new Random button in the deck builder fills the deck you're editing with 8 random cards. It always builds something playable: a damage spell, a card that goes for towers or hits hard, at least two cards that can hit flyers, a few cheap cards, and an average cost between 2.8 and 4.2 oil. Tap it again for another." ] },
  { v: 202, date: '2026-11-16', title: "Skerry Clash: ratings and a leaderboard", New: [
    "Skerry Clash: every player now has an MMR rating, starting at 1000. It belongs to your username, and only your save can play under that name.",
    "Skerry Clash: online duels move your rating the most, depending on how your rating compares to your rival's. Matches against the bot count at half weight, against a fixed rating for each level: Easy 800, Normal 1100, Hard 1300. A draw counts as half a win.",
    "Skerry Clash: a new Skerry Clash board on the scoreboard ranks everyone by rating, with their wins and matches played.",
    "Skerry Clash: the end screen shows how much your rating went up or down, the game's card shows your rating and your best, and the online lobby shows each keeper's rating beside their name." ], Changes: [
    "Skerry Clash: leaving an online duel before it ends counts as a loss. A duel cut off by a lost connection isn't rated.",
    "Skerry Clash: changing your username starts a fresh rating under the new name. If the name you pick is already taken, you'll be asked to choose another." ] },
  { v: 201, date: '2026-11-16', title: "Rival Lights is now Skerry Clash", Changes: [
    "Skerry Clash: the duel of lights for two has a new name. Rival Lights is now Skerry Clash on the main menu, its card, the pause menu and invites. Your decks, record and tower skins carry over untouched." ] },
  { v: 200, date: '2026-11-16', title: "Skerry Clash: 32 new cards and a full rebalance", New: [
    "Skerry Clash: 32 new cards, 64 in all. Troops: Bilge Rats, Will-o'-the-Wisp, Ship's Cat, Puffin Squadron, Fishwives, Net Thrower, Grenadier, Lobster Knight, Storm Petrel, Press Gang, Siren, Ship's Surgeon, Rocket Crew, Anchor Swinger, Sea Eagle, Wrecker Chief, Smugglers, Crab Mother, Kraken's Arm and Stormcaller.",
    "Skerry Clash: new spells: Tide Pull, Lamp Oil, Fair Wind, Brine Rain, Shipwreck and Whirlpool. New buildings: Tar Barrel, Fog Horn, Mortar Pit, Burning Lens, Martello Tower and Oil Store.",
    "Skerry Clash: new abilities to go with them: pouncing, shells that soak damage, healing, life drain, spinning splash, rallying cries, chain lightning, pulls, damage over time, haste, knockback, a long-range mortar, a lens that burns hotter the longer it holds a target, and an oil store that pays you lamp oil.",
    "Skerry Clash: every new card has its own portrait, 3D model and effects, and the deck builder explains each new ability in plain words.",
    "Skerry Clash: the bot knows all 64 cards and builds its decks from the whole set." ], Balance: [
    "Skerry Clash: every card and tower rescaled to a new health and damage curve. Lamp Towers now have 3,050 health and the Great Light 4,800, and both hit for 109. Troops and buildings are much sturdier to match: the Deckhand has 900 health, The Diver 1,360 and hits for 700, the Crab King has 5,600.",
    "Skerry Clash: spells now deal 25 to 30% of their damage to towers.",
    "Skerry Clash: many cards tuned after hundreds of test matches, so no card wins far more or less often than the rest." ], Changes: [
    "Skerry Clash: a match still level when overtime ends now goes to whoever's most damaged tower has more health left. Only an exact tie is a draw." ] },
  { v: 199, date: '2026-11-15', title: "Skerry Clash: sturdier big cards, softer towers", Balance: [
    "Skerry Clash: Lamp Tower damage down from 58 to 51 a shot, and the Great Light's from 80 to 70.",
    "Skerry Clash: Hermit Crab health up from 2,000 to 2,450.",
    "Skerry Clash: Drowned Crew health up from 120 to 140 each.",
    "Skerry Clash: Mooncusser health up from 720 to 900.",
    "Skerry Clash: Head Keeper health up from 680 to 850.",
    "Skerry Clash: Wreckers' Fire health up from 820 to 1,000.",
    "Skerry Clash: Keelback health up from 1,650 to 2,050.",
    "Skerry Clash: Kelp Horror health up from 2,700 to 3,300.",
    "Skerry Clash: Crab King health up from 3,500 to 4,300." ] },
  { v: 198, date: '2026-11-15', title: "New game: Skerry Clash", New: [
    "Skerry Clash: a new game for two, with its own card on the main menu. Two keepers face each other across a tidal race, each guarding a Great Light and two Lamp Towers. Spend lamp oil to play cards from your hand of four, send your troops over the two causeways, and put out the other keeper's lights.",
    "Skerry Clash: 32 cards to choose from: 22 troops (Mudlarks, Shore Crabs, the Wrecker Gang, Gull Flock, the Fog Wraith, The Diver, the Mooncusser, the Keelback, the Kelp Horror, the Crab King and more), 6 spells (Signal Flare, Cannon Shot, Rogue Wave, The Haar, Powder Keg, Storm Glass) and 4 buildings (Sea Battery, Swivel Gun, Bell Buoy, Wreckers' Fire).",
    "Skerry Clash: build a deck of 8 in the Keeper's Locker. Three deck slots, filters, every card's numbers in plain words, and a warning if your deck can't hit anything in the air.",
    "Skerry Clash: three-minute matches. Every tower you fell puts out a light; fell the Great Light and you win at once. Oil comes twice as fast in the last minute, and a level match goes to a minute of sudden death overtime.",
    "Skerry Clash: duel a bot (Easy, Normal or Hard), or play online against a friend: host a duel, share the invite, and the host starts it.",
    "Skerry Clash: 18 tower skins from the Lampwright's Crate, from red-and-white bands and an iron screw-pile to glowing and living Admiral towers. Your towers wear your skin in every match, and online your rival sees it too.",
    "Skerry Clash: earn a tower crate for every match you finish and another for every win. Your first crate is free.",
    "Saves: your Skerry Clash decks, record and tower skins are kept in your save link, code, file and cloud save with everything else." ] },
  { v: 197, date: '2026-11-14', title: "Much faster loading", Changes: [
    "The online game's page is now about 1.7 MB to download instead of 15 MB, so the menu appears several times sooner, most of all on slower connections.",
    "Sound effects and music now download in the background after the menu appears, and your browser keeps them. Until a sound arrives you'll hear the game's built-in version of it.",
    "After an update, returning players only download the small page again, not every sound." ] },
  { v: 196, date: '2026-11-14', title: "Battery saver: cooler phones", New: [
    "Settings: a new Battery saver option (Auto, On or Off). With it on, the game draws 30 frames a second instead of 60 and renders at a slightly lower resolution, so phones and tablets run much cooler and the battery lasts far longer. Auto turns it on for phones and tablets.",
    "Every mode runs at exactly the same speed with the saver on: boats, shots, zombies and golf balls move just as fast, only fewer frames are drawn." ], Changes: [
    "Menus and the pause screen now draw at 30 frames a second on every device.",
    "Switching to another app or tab now puts the game's sound to sleep in every mode, not just a solo voyage, and wakes it when you come back.",
    "The automatic resolution in the 3D views and on Skerry Links no longer mistakes the 30 frame cap for a slow device." ] },
  { v: 195, date: '2026-11-14', title: "Out of bounds and stuck spots", Fixes: [
    "Keeper's Last Light: at the Lighthouse you can no longer hop over the low walls beside the jetty's steps and wander off round the rock.",
    "Keeper's Last Light: at the Lighthouse you can no longer jump over the lantern gallery's parapet and drop off the tower.",
    "Keeper's Last Light: in Wrackhaven's town hall the rail round the stair hole now stops you, so you can't step or jump between the Records Room and the Council Chamber without opening the door between them, or drop onto the stair below its gate.",
    "Keeper's Last Light: Wrackhaven's banisters round the stair holes now lie flat instead of sloping up into the air.",
    "Keeper's Last Light and the raids: coming down from a jump onto a cart, a pot, a cask or a rail no longer leaves you stuck inside it; you slide off its edge instead.",
    "Keeper's Last Light and the raids: a high jump at a window no longer carries you out through the wall above it.",
    "Maren's End: you can no longer jump off the side of the Long Pier, or over the Sea Battery's parapet into the sea.",
    "The Gannet's Wake: you can no longer get out of the flooded cable tier through its far wall." ] },
  { v: 194, date: '2026-11-14', title: "Skerry Links: tap-ins drop", Changes: [
    "Skerry Links: a putt that dies right by the hole now usually topples in. A ball stopping within about 11 inches creeps on into the cup, and no putt is left hanging a few inches short any more." ] },
  { v: 193, date: '2026-11-14', title: "Skerry Links: smoother frame rate", Changes: [
    "Skerry Links: the course now keeps itself smooth. If your device can't keep up, the 3D view drops its resolution a step at a time until it can, and climbs back when there's room to spare.",
    "Skerry Links: phones and high-resolution screens draw the course at a slightly lower resolution, without edge smoothing, which costs a lot there and is hard to see on a small screen.",
    "Skerry Links: the aim line, mini map, wind dial and swing meter are only redrawn when something on them changes, and the lighthouse beam is cheaper to draw." ] },
  { v: 192, date: '2026-11-14', title: "Skerry Links: the whole course in view", New: [
    "Skerry Links: the nine holes now sit together on one course. The 1st to the 3rd run south down the inland side, and the 4th to the 9th run north along the cliffs, each tee just past the last green. From any hole you can see the other eight in the distance, with their fairways, greens, bunkers, trees and a flag on every green, drawn simply so the game stays smooth." ] },
  { v: 191, date: '2026-11-14', title: "Skerry Links: the harbour, and a clearer phone screen", New: [
    "Skerry Links: a little harbour lies under the cliffs on the holes by the sea, with a stone quay, a breakwater, cottages and two boats moored. Ships come in past the Light and thread their way between the skerries lying across the way, then round the breakwater to the quay. After dark the quay lamps are lit." ], Changes: [
    "Skerry Links: on phones the club box now sits on the left and the swing meter on the right, so the middle of the screen stays clear for the shot." ] },
  { v: 190, date: '2026-11-13', title: "Skerry Links: one beam", Changes: [
    "Skerry Links: Skerry Light now throws a single beam, turning once every ten seconds." ] },
  { v: 189, date: '2026-11-13', title: "Skerry Links: from midday to night, and the Light", New: [
    "Skerry Links: the round now runs through the day. The 1st is played at midday, the sun drops hole by hole, the 6th is played at sunset, and the 7th, 8th and 9th by moonlight under the stars.",
    "Skerry Links: Skerry Light stands off in the distance from every hole, on its rock out at sea (or on a far hill from the inland holes). By day its lamp is dark. From sunset it turns, its two beams sweeping round with a flash as one swings towards you, and the keeper's window is lit.",
    "Skerry Links: out beyond the Light lies a reef of skerries, and ships come in past it on the far side, keeping well clear. After dark they show their lanterns." ] },
  { v: 188, date: '2026-11-13', title: "Skerry Links: ball and club crates, and your outfit on the course", New: [
    "Skerry Links: your golfer now wears the outfit you've chosen from the Tailor's Crate, hat and all, shimmering, glowing or alight just as on the island. Online, everyone sees each other's.",
    "Skerry Links: Ball crates. The Chandler's Crate holds one of 18 balls across all five grades. Bosun balls leave a coloured trail, Mate balls shimmer and throw sparks, Captain balls glow, and the three Admiral balls are alive: The Skerry Light, The Maelstrom and Verity's Grin.",
    "Skerry Links: Club crates. The Shipwright's Crate holds one of 14 sets of clubs made from a ship's gear: oars, a belaying pin, a boat-hook, anchors, whalebone, harpoons, a narwhal tusk, a lantern and a kraken's arm, up to the Admirals' Keeper's Beam and Drowned Trident.",
    "Skerry Links: earn a ball crate every 3 holes and a club crate every 6, plus a ball crate for a birdie and a club crate for an eagle. Your first of each is free. Open them from the buttons on the Skerry Links card." ], Changes: [
    "Saves: your golf balls and clubs are kept in your save link, code, file and cloud save with everything else." ] },
  { v: 187, date: '2026-11-13', title: "Skerry Links: easier putting and chipping", Changes: [
    "Skerry Links: putts roll out more freely and ease to a stop instead of dying suddenly, and greens break about half as much, so a putt no longer hooks away in its last foot.",
    "Skerry Links: a slow ball right by the cup is drawn in, and the cup takes a gently rolling ball a touch further from its centre.",
    "Skerry Links: stopping the meter anywhere in the green zone now hits exactly the power you set. The zone is wider on the putter, the putter's meter runs slower, and a putt that misses the zone is only out by about half as much.",
    "Skerry Links: on a short chip the swing meter rescales so your chosen power sits at 70% of the bar (its marks show the real percentages), so you no longer have to dab at the bottom of it." ] },
  { v: 186, date: '2026-11-13', title: "Skerry Links: green heat map", New: [
    "Skerry Links: a Slope toggle for putting (the Slope button, H, or Back on a controller). It colours the green from blue (low) to red (high) with a contour line every 2.5 cm, so you can read the break at a glance. It stays as you left it." ], Changes: [
    "Skerry Links: the swing meter sits higher on wide screens so the Power bar no longer covers it." ] },
  { v: 185, date: '2026-11-13', title: "Skerry Links: power bar and a new flight camera", New: [
    "Skerry Links: a Power bar for each shot. Drag it (or Z and X, or LT and RT) to set the distance you're going for; it moves a green zone on the swing meter, the landing ring and a crosshair on the map. Stop the meter in the green to hit it that far. It starts at the right power for the distance to the pin." ], Changes: [
    "Skerry Links: the camera now follows the ball in flight from high up behind and off to one side, looking down on it, instead of from just behind." ] },
  { v: 184, date: '2026-11-13', title: "Skerry Links: card wording", Changes: [
    "Skerry Links: tidied the course description on its card." ] },
  { v: 183, date: '2026-11-13', title: "New game: Skerry Links", New: [
    "Skerry Links: a new game of golf, with its own card on the main menu. Nine holes along the headland, par 36: in from the gate, down to the cove, then out along the cliffs to the little par 3 on the point and over the chasm on the 8th.",
    "Skerry Links: pick a club (driver down to sand wedge, each showing its carry), aim left and right, and time the swing meter: once to start, once to set the power (past 100% is an overswing), once more on the strike line. Early hooks it, late slices it.",
    "Skerry Links: wind on every hole, bounces and roll that depend on where the ball lands, trees that catch it, the sea and a creek that cost a stroke, and quick, sloping greens with arrows showing which way they fall. The putter's meter is a length, with a scale to suit the putt.",
    "Skerry Links: play alone, with up to four taking turns on one screen, or online with up to four (Host a round on its card, or Share invite). Choose all nine holes or three at a time, the wind, and a gentler swing meter.",
    "Skerry Links: a scorecard after every hole (Tab or Y any time), your best round kept on the card, and its own column on the Scoreboard: full rounds of nine, lowest first, with holes played and birdies. The card shows the top five rounds.",
    "Skerry Links: keyboard, mouse, touch buttons and controller all work. The map in the corner shows the whole hole, and M shows it from above." ], Changes: [
    "Main menu: Skerry Links is game 8 on the desk menu (press 8), with its own banner on phones." ], Sound: [
    "Skerry Links: the strike, the putt, the ball landing on turf, green or sand, the rattle in the cup, a splash in the sea, applause for a birdie, and the sea below the cliffs, all following your volume setting." ] },
  { v: 182, date: '2026-11-13', title: "The Original: ships find their way home", Fixes: [
    "The Original: ships no longer run onto the shore beside the harbour. They now line up and come into the harbour mouth from above, and give the shore and the lighthouse rock a wide berth, lit or not.",
    "The Original: a ship you've lit now properly avoids every rock you've shown her. Instead of swerving at the last moment, she plots a course to the harbour round all the rocks she remembers and sails it, and plots again each time you show her a new one." ] },
  { v: 181, date: '2026-11-13', title: "New: The Original", New: [
    "The Original: Skerry Light as it began, remade as a flat 2D game for one. Find it in its own Featured spot at the very top of the main menu.",
    "The Original: you are the keeper. Ships stand in for the harbour through the skerries and can't see the rocks, so swing the lighthouse beam to show them. A ship remembers the rocks you light for as long as her ring holds any light; let it run dry and she forgets them all.",
    "The Original: ships pick up speed all night with no limit. Ring the fog bell (Space, or double tap on a phone) to slow every ship for a few seconds. Each night brings one more ship; lose three in one night and you start over. Your best night is kept.",
    "The Original: play with a mouse, the keyboard, a touchscreen or a controller. ‹ Menu or Esc takes you back to the main menu, and your night waits paused until you return." ], Sound: [
    "The Original: the bell, a chime for every ship safe home and the crunch of a wreck, all following your volume setting." ] },
  { v: 180, date: '2026-11-13', title: "Smoother frame rate on foot", Changes: [
    "Keeper's Last Light, the raids, Fog Run and Freebooters' Sea: rooms, stages and the drowned are now drawn in far fewer pieces. The Lighthouse went from about a thousand separate draws a frame to under three hundred, so it runs noticeably smoother, especially on laptops.",
    "Wreckers' Night: the other wreckers' figures cost much less to draw, and the island's cover is worked out with far less waste each frame, so fights with several players in view hold their frame rate better.",
    "Every game in 3D: when the game lowers the resolution to keep up, it no longer keeps stepping back up to a resolution that was just too slow, which caused a hitch every few seconds on some machines." ], Fixes: [
    "Wreckers' Night and The Gannet's Wake: fixed a hitch the first few times the lighthouse beam swept on or off, while the game rebuilt its lighting." ] },
  { v: 179, date: '2026-11-13', title: "Unstuck button", New: [
    "Unstuck: a new button in the in-game menu (Esc, or Start on a controller) in Wreckers' Night, Keeper's Last Light, the raids, Fog Run and Freebooters' Sea. Caught on a rock or a corner? It steps you to a clear spot within a metre of where you stand.",
    "Unstuck only picks a spot you could have walked to, so it never takes you through a wall, a shut door or out of a window. It works in co-op, can be used every 5 seconds, and not while you're down or at the wheel." ] },
  { v: 178, date: '2026-11-13', title: "Directional sound, and volume in every menu", Sound: [
    "Every game: sounds now come from where they happen. Gunshots, the drowned, bosses, boats, splashes, bells and creatures are panned to the side they're on, and sounds behind you are muffled, so you can tell ahead from behind and turn to find them. Best with headphones.",
    "Wreckers' Night, Keeper's Last Light, the raids, Fog Run and Freebooters' Sea: other players' shots, the drowned's moans, boards being torn off windows, doors, power-ups and every boss's footsteps and attacks are all directional now. Before, many of these played dead centre.",
    "Skerry Light: things behind the boat no longer sound as if they're hard left or hard right, and rocks blown apart by a crewmate's gun are now directional too." ], Changes: [
    "Volume is now a slider, from off to 100% in steps of 5%, and it's in every in-game menu: the Settings card, Skerry Light's pause card, the menu in Wreckers' Night, Keeper's Last Light, the raids, Fog Run and Freebooters' Sea, and the Drowned Reach's menu. They're all the same setting, so changing it in one changes it everywhere." ] },
  { v: 177, date: '2026-11-13', title: "Keeper's Last Light: every crab shows in co-op", Fixes: [
    "Keeper's Last Light: in a crab round with three or four players, some crabs could be invisible to everyone but the host. Every living crab now shows on every screen." ] },
  { v: 176, date: '2026-11-12', title: "New game: Freebooters' Sea", New: [
    "Freebooters' Sea: a new open-ended game for one to four players, with its own card on the title screen and its own lobby. Crew the keeper's cutter on the Wide Water, a big open sea of twelve islands and the outpost of Saltcote, and sail wherever you like for as long as you like.",
    "Freebooters' Sea: drop anchor off any island and go ashore. Pick up what's lying about, carry it back to the landing boat to stow it in the hold, and sell the hold at the factor's table in Saltcote for sovereigns shared by the crew.",
    "Freebooters' Sea: voyages from the board at Saltcote, one at a time, from three companies. Gilt & Gull Company hoard charts (find the X by its landmarks and dig), Bellmen bounties (clear a drowned camp and kill its captain for his bell) and Tidewrights salvage (anchor over a wreck and dive for its cargo).",
    "Freebooters' Sea: four swivel guns on the cutter's rails. Man one, aim and fire at the Mooncussers' black sloops, which hunt the sea, fire broadsides that hole your deck and send boarders over the rail. Sink one and haul its loot out of the water.",
    "Freebooters' Sea: a chart table on deck shows the whole sea, your ship and your voyage's marks. M (or View on a controller) shows your voyage's charts.",
    "Freebooters' Sea: going down never ends the session. Bleed out and you're back on your feet in 10 seconds. If the cutter sinks, the crew washes up at Saltcote in a fresh one, but what was in the hold is lost.",
    "Freebooters' Sea: what you keep. A weapon or outfit crate for every 1,000 sovereigns a session earns, a standing from 1 to 10 with each company, and a pirate token every time a standing goes up.",
    "Freebooters' Sea: its own scoreboard column (best session, voyages done in it, sovereigns in all), saved to the cloud with everything else. Invite links and rejoining work as in the other co-op games.",
    "Freebooters' Sea: a lore compendium entry for the Wide Water, Saltcote, the black sloops and the three companies." ], Fixes: [
    "Rejoining a night, raid or Fog Run after a dropped connection now works again." ] },
  { v: 175, date: '2026-11-12', title: "Faster wake-up for the online game", Fixes: [
    "The online game wakes from sleep much faster. The first visit after a quiet spell no longer waits about a minute and a half for the server to get ready." ] },
  { v: 174, date: '2026-11-12', title: "Fog Run: two dozen new cards", New: [
    "Fog Run: 24 new salvage cards, each with its own effect, including new relics and new crew cards.",
    "Fog Run: cursed relics, which give a strong gift at a real cost and are marked as cursed on the card: Fog in the Eyes, the Drowned Man's Bargain and the Mooncusser's Pact.",
    "Fog Run: the Beachcomber's Sack deals you four cards a hand from then on, and a Message in a Bottle makes your next hand all Captain's cards.",
    "Fog Run: the chart fragment marks unlock new cards: Keeper's Log and Pilot's Chart at 10, Twin Fuse and Blue Lights at 25, the Mooncusser's Pact at 50, and The Light Keeps Watch at 100.",
    "Fog Run: new cards for the sail. For the crew: Caulking Iron, Toll for the Drowned and Blue Lights. For you: the Shipwright's Mallet and St Elmo's Medal." ] },
  { v: 173, date: '2026-11-12', title: "Fog Run: thicker fog, harder mirrors", Balance: [
    "Fog Run: the fog is much thicker. You can see 55 m in the Near Skerries (was 140), 38 m in the Grey Reach (was 90) and 24 m in the Haar (was 50). Each island you light pushes it back 5 m. The Haar Lifts and the Keeper's Oilcan matter a lot more now.",
    "Fog Run: Bend the Beam is harder. The beam must pass through 4, 5 or 6 mirror posts depending on the reach, and 2 or 3 decoy posts stand along the wrong paths." ], Changes: [
    "Fog Run: the fog is now a solid wall of haar. Past it there's nothing, not even the sky or the shapes of far rocks and islands.",
    "Fog Run: in Bend the Beam every mirror post is geared to another, which turns a step with it. The geared post glows blue while you stand at the first." ] },
  { v: 172, date: '2026-11-12', title: "Fog Run: six new Unknown islands", New: [
    "Fog Run: the Castaway. A living man by a driftwood fire. Speak to him and the drowned come for him: keep them off him for 40 seconds. Save him and he mends everyone, stows a spare plank aboard and leaves a Captain's card in everyone's salvage. Let them crowd him and he's gone.",
    "Fog Run: the Dicing Man. A drowned sailor at an upturned barrel. Throw once each: seven or more and he pays out what a wreck's chest would, a double six pays twice, and under seven costs you 300 points and a hit.",
    "Fog Run: the Keeper's Oil. Four casks of lamp oil scattered across the island. Each one broached pushes the fog back 8 m for the rest of the reach. Find all four for a Captain's card.",
    "Fog Run: the Wreckers' Gold. Take a share (500 points a reach, once each), but every share wakes a rush of runners and the beacon won't light for 20 seconds after.",
    "Fog Run: the Fog's Bargain. A whispering standing stone. Give it all your points (500 at the least) for a relic you don't have yet, once each.",
    "Fog Run: a Message in a Bottle. Read it for 2 chart fragments, yours to keep. The first to read it also finds a shorter way: a fair wind for the next sail." ], Changes: [
    "Fog Run: Unknown islands now draw from ten encounters instead of four, so a plain fight turns up far less often." ] },
  { v: 171, date: '2026-11-12', title: "Playing together after a win", Fixes: [
    "Keeper's Last Light, Skerry Raids and Fog Run: after a game together you can now host or join a different one straight away. Hosting or joining from another game's card takes you out of the old lobby for you, instead of leaving the buttons missing.",
    "Skerry Raids and Fog Run: playing alone from a card no longer does nothing while you're still in another game's lobby.",
    "Skerry Raids and Fog Run: winning no longer knocks you down just before the victory screen. Everyone standing stays standing, anyone down gets back up, the screen turns gold with the win instead of red with \"They dragged you down\", and you hear the round-won sound instead of the game-over knell." ] },
  { v: 170, date: '2026-11-12', title: "Fog Run: a broader Light", Balance: [
    "Fog Run: the Light's beam is three times as wide. At sea it shows the rocks for three times as long on each sweep.",
    "Fog Run: on Lantern Rock the beam lights the Fog-Keeper for about four seconds each sweep, up from just over one." ] },
  { v: 169, date: '2026-11-12', title: "A main menu for big screens", New: [
    "Main menu: on a desktop or any wide screen, the menu is laid out for a mouse, keyboard and controller. The six games are listed down the left, the one you pick fills the middle in full, and the scoreboard sits on the right (or under the list on a narrower screen). No more scrolling past every card to find your game.",
    "Main menu: choose a game with a click, the up and down arrows, or the keys 1 to 6. On a controller, LB and RB step through the games. The game you last picked is remembered on this device." ], Changes: [
    "Main menu: phones and tablets held upright keep the menu exactly as it was." ] },
  { v: 168, date: '2026-11-11', title: "The Skerry Compendium", New: [
    "Main menu: a new Lore compendium button, beside Patch notes, opens the Skerry Compendium: the whole story of the Light in one place, laid out like a wiki.",
    "Lore: 70 articles tying every game into one history, from the first fire on Lantern Rock, through the wreck of the Gannet and the voyages of 1888, to Maren's End and the wars of the Drowned Reach. Characters, creatures, places, factions, ships, objects and events, each with an infobox and links to the rest.",
    "Lore: a single timeline of the Skerries, and a page for each of the seven tales (Skerry Light, Wreckers' Night, The Gannet's Wake, Keeper's Last Light, Fog Run, Maren's End and Drowned Reach) saying where it fits.",
    "Lore: search as you type, a Random article button, a featured article and a page from the keeper's log on the main page each day, and a Back button. Esc or B on a controller closes it." ] },
  { v: 167, date: '2026-11-11', title: "A smaller scoreboard", New: [
    "Main menu: the scoreboard has a Minimise button at its top. It shrinks the board down to a small bar, and Show opens it again. The game remembers which you picked on this device." ] },
  { v: 166, date: '2026-11-11', title: "Fog Run: the chart closes ashore", Fixes: [
    "Fog Run: if the chart was still open when the cutter beached, it now closes as you land instead of staying over the island." ] },
  { v: 165, date: '2026-11-11', title: "Fog Run: new islands and puzzles", New: [
    "Fog Run: two new Fight rules. Clear the Shore: send back every drowned man as they come up in waves. The Crab Tide: a crab swarm while the tide comes in and the beach shrinks every 15 seconds. Stay out of the water.",
    "Fog Run: Elite islands. One of the Lighthouse's bosses (the Diver, the Mooncusser or the Keelback), a little weaker, plus the drowned. Put it down for a Captain's card in everyone's salvage.",
    "Fog Run: Puzzle islands, four of them: Bend the Beam (turn mirror posts to carry a beam to the beacon), Knock's Garden (figureheads that only move when nobody's watching), the Bell Buoys (ring the bells in the fog horn's tune) and the Tide Stones (hold four plates down at once to raise the causeway).",
    "Fog Run: Wreck islands. A wreck's sea chest with a gun or a reforge in it for each of you. Some wrecks are guarded.",
    "Fog Run: Chapel islands. A rest: everyone's mended, the lost come home and every extra life is given back.",
    "Fog Run: Unknown islands. You only find out what's there when you land.",
    "Fog Run: the Lost Man's Bell. Together, once someone is lost in the fog, a bell rises on the island. Ring it to bring them back." ], Fixes: [
    "Fog Run: island messages now name the right player when playing together." ] },
  { v: 164, date: '2026-11-11', title: "Fog Run: the salvage", New: [
    "Fog Run: after every island you light, each of you is dealt three salvage cards of your own. Keep one. You have 20 seconds, then the left-hand card is taken for you.",
    "Fog Run: guns from the wreck (any wall gun or wreck-chest gun), the Lampwright's Spark (reforge the gun in your hand), and a Rum Tot (your ultimate and grenade ready now).",
    "Fog Run: relics, kept to the end of the run and shown beside your stamina: Keeper's Oilcan, Gull Feather, Drowned Man's Ring, Salt in the Wound, Plimsoll's Tooth, a cork for each tonic, and more to find.",
    "Fog Run: crew cards that help everyone aboard: Fresh Planks, A Second Lamp, Fair Wind, The Haar Lifts and, together, Call Them Home. Only one crew card in any hand.",
    "Fog Run: together, Maren's Ribbon gives you back your extra life.",
    "Fog Run: cards come in three rarities, Deckhand, Bosun and Captain. Rarer cards turn up more the further out you sail, and new cards join the salvage as you collect chart fragments." ] },
  { v: 163, date: '2026-11-11', title: "The Fog-Keeper", New: [
    "Fog Run: Lantern Rock, the last stop of every run. A bare rock in the thickest of the fog, the stump of a dead lighthouse in its middle and three lamp braziers round it.",
    "Fog Run: a new boss, the Fog-Keeper, the drowned keeper who has been putting the lights out. Only light hurts him: a burning brazier's ring, the flare from the stand by the landing, or the Light's beam as it sweeps over the rock.",
    "Fog Run: his fog puts the braziers out one at a time. Hold Use at a dark brazier to light it again.",
    "Fog Run: watch his lantern. When it goes black, get out of its swing.",
    "Fog Run: at half strength he climbs his tower and puts out the Light's beam. After that you need two braziers burning for their light to count.",
    "Fog Run: bring him down and the dead light burns again, the fog lifts, and the run is won." ] },
  { v: 162, date: '2026-11-11', title: "Fog Run: the chart", New: [
    "Fog Run: the run now follows a chart. Seven islands across three reaches of sea, with two or three to choose between at every stop and the ways between them branching, like a map in a roguelike. Every run's chart is different.",
    "Fog Run: as each sail begins the chart opens and the crew votes on the next island. Five seconds after the first vote it's settled: the most votes wins, and the host breaks a tie. Alone, your pick is the course.",
    "Fog Run: a chart table on deck, port side aft of the hatch, shows the route so far. Use it to open the chart again.",
    "Fog Run: each island on the chart shows what kind it is, its island and where it leads. More kinds of island are on the way." ], Changes: [
    "Fog Run: the cutter never waits for the vote. She sails on while you choose, and if nobody votes in time (or she comes in sight of the islands) the chart picks one." ] },
  { v: 161, date: '2026-11-11', title: "Fog Run: what you keep", New: [
    "Fog Run: runs now pay out. You get a weapon or outfit crate for every two islands lit, and three more for a win.",
    "Fog Run: every beacon you light gives you a chart fragment, kept for good. The Fog Run card shows how many you have.",
    "Scoreboard: Fog Run has its own column, showing the furthest island reached, the time through a won run, and the islands lit." ] },
  { v: 160, date: '2026-11-11', title: "Aim down the sights with every gun", New: [
    "Every gun can now aim down its sights, not just the Longarm and the Avtomat: right mouse, LT on a controller, or Aim on a phone. Works in Wreckers' Night, Keeper's Last Light, the raids and Fog Run, including every gun from the wreck chest.",
    "Aiming brings the gun up to the middle of the screen with a small dot for a crosshair, zooms in a little (more for the harpoon gun and pistols, less for the blunderbuss and punt gun) and slows your look to match." ], Changes: [
    "Shotguns keep their full spread while aiming. Blades still can't aim." ] },
  { v: 159, date: '2026-11-11', title: "Fog Run music on claude.ai", Fixes: [
    "Fog Run: its music now plays in the claude.ai version of the game too." ] },
  { v: 158, date: '2026-11-11', title: "Fog Run", New: [
    "Fog Run: a new game, alone or up to four together, with its own card on the main menu. Something out in the haar has been putting out the lights of the outer rocks; take the keeper's cutter out and light them again.",
    "Fog Run: sail the cutter through the rocks to an island, beach her and go ashore. Light the island's beacon and keep the drowned off it for a minute. If they put it out, light it again.",
    "Fog Run: the fog gets thicker the further out you sail, and every run is different.",
    "Fog Run: alone, going down ends the run. Together, each of you has one extra life. After that you're lost in the fog until the crew lights the next beacon, and the run ends if everyone is lost at once or the cutter sinks.",
    "Fog Run: its own lobby, invite links and rejoin. More islands, rewards between them and a boss at the end are on the way." ], Sound: [
    "Fog Run: its own music at sea, ashore and for the win." ] },
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
