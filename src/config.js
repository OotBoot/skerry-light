'use strict';
// Skerry Light: tuning, asset paths and lore.
// World units are metres. The lighthouse stands at the origin on the shoreline (y = 0);
// north (+y) is open sea. Bearings: 0 = north, positive = east.

const SK = {
  HALF_BEAM: 0.15,        // half-width of the lighthouse beam, radians
  SHADE: 1.75,            // the landward side of the lamp is blacked out past this bearing
  WORLD: 2.5,             // how far out to sea the voyages start, compared with the first versions
  BEAM_RANGE: 3600,
  CAM_H: 5,               // eye height on deck
  NEAR: 1,
  HULL: 3,
  // the Brig's carpenter: seconds per plank patched at sea (set per boat as `carpenter`)
  PICKUPS: 12,            // floating crates to find on the first voyage (one more each voyage after)
  PICKUP_RADIUS: 12,      // sail this close to one to haul it aboard
  HARBOUR_CRATES: 5,      // crates for making harbour on voyage 1; then Fibonacci for each voyage in a row: 5, 8, 13, 21...
  HARBOUR_STEPS: 15,      // ...for up to this many voyages in a row (voyage 15 pays 4,181; it stays there after)
  CANNON_CHARGES: 1,      // the Barque's bow gun: shots it holds
  CANNON_RELOAD: 3,       // seconds to reload after a shot
  CANNON_RANGE: 45,       // metres ahead it watches (less at low speed: about a second and a half of sailing)
  SEEN_HOLD: 0,           // seconds a rock stays fully visible after the beam passes over it
  SEEN_FADE: 3,           // ...then it fades out over this long
  IMPACT: 4.5,          // m/s closing speed that stoves in a plank; slower than that is a scrape
  HARBOUR: { x: 230, y: 30 },
  BACKROOMS_CHANCE: 1 / 20,
  FORCE_BACKROOMS: typeof location !== 'undefined' && /[?&#]backrooms\b/.test(location.href),
  BACKROOMS_CELL: 64,     // metres per room
  BACKROOMS_CEIL: 14,     // ceiling height
  VERITY_TIME: 20,        // seconds he sits on the bow smiling before he changes
  VERITY_MORPH: 1.6,
  VERITY_SCARE_TIME: 1.5,
  LANTERN: 48,            // reach of your own deck lantern
  MAREN_STAGES: [400, 260, 160, 90, 35],   // how far away she stands at each stage
  // she comes one stage nearer every full turn of the beam, and slowly follows the ship between turns
  PLIMSOLL_GUARD: 45,     // this close to Plimsoll and she holds where she is
  PLIMSOLL_PATIENCE: 4,   // seconds he waits for a ship that falls behind before walking on
  CREW_GUARD: 55,         // the same, for ships sailing close together
  BELL_COOLDOWN: 15,
  BELL_PUSH: 3,           // stages the bell drives her back
  CREW_BELL_RANGE: 160,
  DROWNED_SPEED: 5,       // m/s
  DROWNED_OUTRUN: 9,      // a ship going faster than this shakes them off
  FLARE_COOLDOWN: 35, FLARE_TIME: 7, FLARE_RADIUS: 350,
  REPAIR_DIST: 45, REPAIR_TIME: 10,
  SCARE_TIME: 1.8,
  // Crew server for copies hosted on your own site, e.g. 'wss://skerry-light.onrender.com/ws'.
  // Leave empty to use the server the page itself was loaded from. Not used on claude.ai.
  SERVER: '',

  ASSETS: {
    maren: 'assets/maren.png',
    plimsoll: 'assets/plimsoll.png',
    knock: 'assets/knock.png',
    verity: 'assets/verity.png',
    verity2: 'assets/verity2.png',
    verityVoice: 'assets/verity.mp3',
  },
  KNOCK_ASPECT: 201 / 474,
  KNOCK_SPEED: 8,         // m/s at least, and always faster than the ship; only while nobody is looking at him
  KNOCK_STUN: 20,         // seconds the bell freezes him
  KNOCK_SCARE_TIME: 1.4,  // his jumpscare when he reaches the hull
  MAREN_ASPECT: 170 / 295,
  PLIM_ASPECT: 380 / 309,

  WRECK_NAMES: ['Brae Lass', 'Kittiwake', 'Morning Star', 'Ellen Rose', 'Solan', 'Fair Isle', 'Jessie Ann'],

  BACKROOMS_LOG: { date: 'No date', text: 'Sailed the Wren into the yellow rooms again tonight. Wet carpet under the keel, the tubes humming, every room like the last. The shark walked ahead as if he knew it. Something smiled at me from the bowsprit and said it could help. I did not let it.' },
  // Pages from the keeper's log, read one per harbour reached. The first six follow the six seas in the
  // order the voyages go round them (Skerry, Fjord, Ember, Lagoon, Barrows, Shoals), then the story goes on.
  LOG: [
    { date: '14 December 1887', text: 'The lamp failed in the second hour. The brig Gannet was coming in under the cliffs with no light to steer by. Maren took the skiff and a hand lantern out toward her. I could not stop her.' },
    { date: '15 December 1887', text: 'The Gannet is on the skerries with all hands. The skiff came ashore at the harbour steps this morning, empty. Maren’s lantern was still lit. That night the sea froze from the steps to the horizon, and there were mountains behind the headland, white to the top. We have no mountains.' },
    { date: '2 January 1888', text: 'A shark walked up out of the surf at dawn, wearing the blue shoes of the Gannet’s cabin boy. He stood on the sand and looked at me, then walked back into the sea. All night the sky over the headland had been red, as if the hills were burning, and the rocks in the bay were warm to the touch.' },
    { date: '9 January 1888', text: 'The schooner Wren came through the skerries last night without a scratch. Her master swears a shark in shoes walked ahead of her on the water the whole way in. The men call him Plimsoll now. The Wren’s wake was glowing green, and there were palm trees on the cliffs. In January.' },
    { date: '20 January 1888', text: 'Fishermen say a woman stands on the water when the lamp turns. Each turn she is a little nearer. She keeps away from the shark. There was fog off the shore tonight, and a churchyard on the cliff where the sheep field was. The stones in the bay have names cut in them. Some are the Gannet’s crew.' },
    { date: '3 February 1888', text: 'I saw her tonight from the gallery, close under a ship’s bow. I rang the bell as hard as I could and she was gone. She came back two turns later. The rocks were glass tonight, purple and lit from inside, and when the bell rang they sang back.' },
    { date: '11 February 1888', text: 'The Gannet’s figurehead is gone from the wreck. Old Pascoe says he saw it walking on the water with a belaying pin, and that it stops dead the moment you put a light on it. You hear it before you see it: three knocks on wood.' },
    { date: '28 February 1888', text: 'A hand off the Kittiwake told me of a small yellow thing, round as a lamp glass and smiling, that sat on his deck and said it wanted to help. He put a flare in its face and it rolled over the side. The ships that let it sit there do not come in. Its name, he says, is Verity.' },
    { date: '14 March 1888', text: 'The stories from the boats have grown strange. A ballerina spinning on the water. A goose with propellers, laying eggs. A frog in a tyre. A gentleman in a top hat taller than this tower. I would laugh, but Pascoe came in tonight with a plank stove in by a coconut, and no two nights are the same three.' },
    { date: '2 April 1888', text: 'It is not the same sea each night. I have counted six: our own, the ice, the fire, the warm green water, the fog and the glass. They come round in turn, as regular as the lamp. The only things that never change are the light, the shark in his shoes, and her.' },
    { date: '19 April 1888', text: 'The Wren’s mate swears they sailed through a ring of black stone standing in the water and came out on a sea of fire under a roof of red rock, with burning rivers pouring out of it. A sail that spat fire, a man of slag, a moth as big as a topsail. Maren was not there. Even she will not follow a ship into that.' },
    { date: '6 May 1888', text: 'A night of warm wind and a golden moon, white temples on the headland, and singing from a rock in the bay. The schoolmaster read me the story it comes from, older than the Bible. A whirlpool that swallows ships, a giant with one eye. The Solan rang her bell through the singing and lived.' },
    { date: '30 May 1888', text: 'Pascoe went out at dusk and came back three days later with a day’s beard. He says the sea went still as glass and the light stopped. Doors stood in the water, and stairs went up into the clouds. A pale copy of his own boat sailed straight at him. A face lay under the water, asleep, and he rang the bell to keep it that way.' },
    { date: '21 June 1888', text: 'Twice now a ship has come in out of yellow rooms, with wet carpet under her keel and the hum of lamps I have never heard. The shark led them out to a green sign. I asked Plimsoll where the rooms are. He only looked at the lamp.' },
    { date: '12 August 1888', text: 'A ship came in tonight with no sails at all. Iron, longer than the harbour, flat as a table on top and lit like a town. Things flew off her deck with a roar and swept the water with lights. Her crew spoke of a year I will not write down. Plimsoll walked ahead of her too.' },
    { date: '30 October 1888', text: 'There are crates in the water now, each with its own little lamp. The boats that haul them aboard come in painted every colour of the sea: ice, ember, coral, gold. I do not know who sets them adrift. Whoever it is, they want us to keep sailing.' },
    { date: '14 December 1888', text: 'A year tonight. I lit the lamp myself and stood on the gallery until dawn. She was out there, rowing toward where the Gannet was, and the lantern in her skiff was still lit. When the lamp turned, she looked up at me.' },
    { date: 'Undated', text: 'If you are reading this, keep Plimsoll close and keep the bell ready. Whatever sea you wake on, the light is still turning and she is still rowing out to the Gannet. She will take any ship that lets her come aboard.' },
  ],
  // the far seas each have their own page, read when you make harbour there
  SEA_LOG: {
    nether: { date: 'No date', text: 'Written in the margin, in a hand not mine: came back through the black ring with the paint blistered off her and ash in every seam. No woman on that sea. Worse things in her place. The light was there too, burning red. It always comes with you.' },
    odyssey: { date: 'No date', text: 'Pasted in, a page from the schoolmaster’s book, the ink run with salt: the singers on the rock, the whirlpool and the cave of the one-eyed shepherd. In pencil beneath it: we drowned the singing with the bell, sailed hard round the water that turned, and blinded the giant with a flare. Home by the lamp.' },
    sky: { date: 'No date', text: 'A page in a different hand, in pencil: flew in from the clouds tonight, no keel under me, the lamp turning below like a coin in a well. Stacks of storm cloud as tall as cathedrals, and lightning in them. Birds at my height. The shark was walking on the cloud tops, and he led me down.' },
    between: { date: 'No date', text: 'This page is blank except for one line, written very carefully: the lit door, not the dark ones. Keep the bell ready for the face. It is still asleep. Do not wake it.' },
  },
};
