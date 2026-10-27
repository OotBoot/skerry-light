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
  // Pages from the keeper's log, read one per harbour reached.
  LOG: [
    { date: '14 December 1887', text: 'The lamp failed in the second hour. The brig Gannet was coming in under the cliffs with no light to steer by. Maren took the skiff and a hand lantern out toward her. I could not stop her.' },
    { date: '15 December 1887', text: 'The Gannet is on the skerries with all hands. The skiff came ashore at the harbour steps this morning, empty. Maren’s lantern was still lit.' },
    { date: '2 January 1888', text: 'A shark walked up out of the surf at dawn, wearing the blue shoes of the Gannet’s cabin boy. He stood on the sand and looked at me, then walked back into the sea.' },
    { date: '9 January 1888', text: 'The schooner Wren came through the skerries last night without a scratch. Her master swears a shark in shoes walked ahead of her on the water the whole way in. The men call him Plimsoll now.' },
    { date: '20 January 1888', text: 'Fishermen say a woman stands on the water when the lamp turns. Each turn she is a little nearer. She keeps away from the shark. She will not go near him.' },
    { date: '3 February 1888', text: 'I saw her tonight from the gallery, close under a ship’s bow. I rang the bell as hard as I could and she was gone. She came back two turns later.' },
    { date: '11 February 1888', text: 'The Gannet\u2019s figurehead is gone from the wreck. Old Pascoe says he saw it walking on the water with a belaying pin, and that it stops dead the moment you put a light on it. You hear it before you see it: three knocks on wood.' },
    { date: 'Undated', text: 'If you are reading this, keep Plimsoll close and keep the bell ready. She is still rowing out to the Gannet. She will take any ship that lets her come aboard.' },
  ],
};
