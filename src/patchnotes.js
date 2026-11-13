'use strict';
// The patch notes log, shown on the main menu's Patch Notes page (src/patchnotesui.js draws it).
// Every change pushed to main adds an entry here for its version, newest at the top, and bumps VERSION in src/config.js to match.
// An entry: { v: version, date: 'YYYY-MM-DD', title: a short headline, and any of these sections, each a list of lines:
//   New (new things to play), Balance (numbers changed), Changes (how something works now), Fixes (bugs put right), Sound (music and sound) }
// Begin a line with the game it touches and a colon ("Maren's End: ...") and that part is shown in bold.
// Write them like real patch notes: plain, short, from the player's side. Leave secrets out entirely: no Easter eggs, secret bosses, secret rewards or hidden options, not even a hint.
var PATCH_NOTES = [
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
