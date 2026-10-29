// Boats, crates, skins and pennants.
//
// There are four boats, each with its own stats, and one kind of crate, the Skerry Crate, which can
// hold anything: a skin for any boat, a pennant or a flare colour. Each voyage earns a crate: one if
// you went down, and more for each harbour in a row (5, 8, 13...). Open crates from your crate
// inventory: a reel spins and lands on your prize. Skins change your deck, bowsprit and lantern as you see them, and your hull and
// sails as your crew sees them; pennants fly from your bowsprit, and from your masthead for your
// crew. Gold (Admiral) items only ever appear in the reel when one is your prize.
// Everything is kept in this browser (localStorage), so it's yours on this device.

const RARITIES = [
  { id: 'deckhand', name: 'Deckhand', color: '#3fb4ff', odds: 0.7992 },
  { id: 'bosun',    name: 'Bosun',    color: '#a43dff', odds: 0.1598 },
  { id: 'mate',     name: 'Mate',     color: '#ff3fb0', odds: 0.032 },
  { id: 'captain',  name: 'Captain',  color: '#ff4b3b', odds: 0.0064 },
  { id: 'admiral',  name: 'Admiral',  color: '#ffc234', odds: 0.0026 },
];

// hull: planks before she sinks; accel and turn multiply how fast she gathers way and answers the helm
// deckW/tipY/rail shape the bow you see from the deck; len/masts shape the ship your crew sees
const BOATS = [
  { id: 'brig',   name: 'Brig',   blurb: 'The all-rounder: four planks, good speed and steering, a carpenter who patches a plank every 40 seconds, and floating crates reload her flare and bell.', hull: 4, accel: 1.3, turn: 1.2, carpenter: 40, beam: 2.6, len: 20, masts: [-0.2, 0.18], deckW: 0.75, tipY: 0.72, rail: 10, bow: 5 },
  { id: 'cutter', name: 'Cutter', blurb: 'Light and quick, turns on a penny, but two hits and she goes.', hull: 2, accel: 1.7, turn: 1.4, beam: 2, len: 15, masts: [0.05], deckW: 0.58, tipY: 0.75, rail: 7, bow: 4 },
  { id: 'barque', name: 'Barque', blurb: 'A heavy three-master with a short-range bow gun that blows away a rock in her path, reloading in 3 seconds. Takes a beating.', hull: 5, accel: 0.8, turn: 0.9, beam: 3.4, len: 27, masts: [-0.28, 0.02, 0.3], deckW: 0.95, tipY: 0.68, rail: 14, bow: 7 },
  { id: 'carrier', name: 'Carrier', blurb: 'A modern supercarrier. Six planks of steel and floodlights that light the water much further out, and she launches a scout jet (J) that flies ahead lighting the rocks on your course. But she is huge, slow to get going and slow to turn: there is a lot of her to hit things with.', hull: 6, accel: 0.6, turn: 0.7, top: 1.08, lamp: 1.6, jet: true, beam: 5.2, len: 40, masts: [], deckW: 1.2, tipY: 0.6, rail: 4, bow: 15 },
];
const BOAT_BY_ID = Object.fromEntries(BOATS.map(b => [b.id, b]));
const CRATE_TYPES = [{ id: 'skerry', name: 'Skerry Crate', holds: 'boat skins, flags and flare colours' }];
// the inventory has a tab for each kind of loot
const LOOT_VIEWS = [{ id: 'skins', name: 'Boat skins' }, { id: 'flags', name: 'Flags' }, { id: 'flares', name: 'Flares' }];
const CRATE_BY_ID = Object.fromEntries(LOOT_VIEWS.map(c => [c.id, c]));

// deck: [near, far] planking; rail; wood (bowsprit); lantern; hull and sail are what crewmates see
const BRIG_SKINS = [
  { id: 'plain',      name: 'Brig, as built',      rarity: null,       deck: ['#1a130d', '#0c0806'], rail: '#1e140c', wood: '#140d08', lantern: '#ffcf86', hull: '#4b3a2b', sail: '#d8cdb0' },
  { id: 'tarred',     name: 'Tarred Oak',          rarity: 'deckhand', deck: ['#141210', '#070605'], rail: '#0d0b09', wood: '#0a0807', lantern: '#ffcf86', hull: '#1f1b17', sail: '#cfc6ae' },
  { id: 'grey',       name: "Fisherman's Grey",    rarity: 'deckhand', deck: ['#24262a', '#101114'], rail: '#2c2f34', wood: '#1c1e22', lantern: '#f4e3b8', hull: '#55595f', sail: '#c9cbc8' },
  { id: 'harbour',    name: 'Harbour Blue',        rarity: 'deckhand', deck: ['#16202e', '#0a0f17'], rail: '#1d3a5f', wood: '#13243a', lantern: '#ffd88a', hull: '#2c4f7c', sail: '#dfe4ea' },
  { id: 'bleached',   name: 'Salt-Bleached',       rarity: 'deckhand', deck: ['#3a342c', '#1c1915'], rail: '#57503f', wood: '#4a4335', lantern: '#fff1cf', hull: '#9c927c', sail: '#f1ece0' },
  { id: 'mackerel',   name: 'Mackerel Stripe',     rarity: 'deckhand', deck: ['#18241f', '#0b120f'], rail: '#2b5c4b', wood: '#1d3a30', lantern: '#e8f7c8', hull: '#2f6a58', sail: '#d9e7df' },
  { id: 'copper',     name: 'Copper Bottom',       rarity: 'bosun',    deck: ['#2c1a10', '#140a05'], rail: '#8a4a22', wood: '#5c2f15', lantern: '#ffb26b', hull: '#b0612c', sail: '#ead7bf' },
  { id: 'gannetw',    name: 'Gannet White',        rarity: 'bosun',    deck: ['#2d2c29', '#141412'], rail: '#d9d4c7', wood: '#bdb6a6', lantern: '#ffffff', hull: '#e8e3d6', sail: '#ffffff' },
  { id: 'petrel',     name: 'Storm Petrel',        rarity: 'bosun',    deck: ['#15151c', '#07070b'], rail: '#3b3550', wood: '#262236', lantern: '#c9b8ff', hull: '#3d3756', sail: '#8d85a8' },
  { id: 'wrecker',    name: "Wrecker's Red",       rarity: 'mate',     deck: ['#2a0f0d', '#120403'], rail: '#8f1f19', wood: '#5a1410', lantern: '#ff6b5a', hull: '#9b231b', sail: '#3a1714' },
  { id: 'selkie',     name: 'Selkie Green',        rarity: 'mate',     deck: ['#0f241f', '#04110d'], rail: '#1f7a63', wood: '#11483a', lantern: '#7dffd8', hull: '#1c8c70', sail: '#bff2e2' },
  { id: 'maren',      name: "Maren's Lantern",     rarity: 'captain',  deck: ['#1f1a12', '#0c0905'], rail: '#e4b25a', wood: '#7a5620', lantern: '#ffe9a8', hull: '#2a2016', sail: '#f7d98b' },
  { id: 'drowned',    name: 'The Drowned Crew',    rarity: 'captain',  deck: ['#16201d', '#070c0b'], rail: '#7f938a', wood: '#3e4b46', lantern: '#c8ffe9', hull: '#5d6d66', sail: '#a9b8b1' },
  { id: 'plimsoll',   name: 'Plimsoll Blue',       rarity: 'admiral',  deck: ['#0d2433', '#041019'], rail: '#5fd3ff', wood: '#1b6f96', lantern: '#9ff0ff', hull: '#2fb1e8', sail: '#ffffff' },
  { id: 'skerrygold', name: 'Skerry Gold',         rarity: 'admiral',  deck: ['#2e230a', '#130e03'], rail: '#ffd34d', wood: '#a37a12', lantern: '#fff3c4', hull: '#d9a520', sail: '#fff1b8' },
  { id: 'pilot',      name: 'Pilot Cutter',        rarity: 'deckhand', deck: ['#1b1a16', '#0b0a08'], rail: '#26324a', wood: '#1a2233', lantern: '#ffd88a', hull: '#22304d', sail: '#d8c7a0' },
  { id: 'herring',    name: 'Herring Silver',      rarity: 'deckhand', deck: ['#22272b', '#0e1113'], rail: '#8c99a3', wood: '#59636b', lantern: '#eef6ff', hull: '#9aa7b0', sail: '#e7edf1' },
  { id: 'peat',       name: 'Peat Brown',          rarity: 'deckhand', deck: ['#20170f', '#0d0905'], rail: '#3a2817', wood: '#2a1c10', lantern: '#ffc27a', hull: '#5a3d22', sail: '#c9b08a' },
  { id: 'seafog',     name: 'Sea Fog',             rarity: 'deckhand', deck: ['#262b30', '#111417'], rail: '#7d8b97', wood: '#4d5862', lantern: '#e3f0ff', hull: '#8796a3', sail: '#d4dde5' },
  { id: 'lobster',    name: 'Lobster Pot',         rarity: 'deckhand', deck: ['#25160f', '#0f0806'], rail: '#a3482a', wood: '#5e2a17', lantern: '#ffb380', hull: '#b9532e', sail: '#e8d9c4' },
  { id: 'kelp',       name: 'Kelp Forest',         rarity: 'bosun',    deck: ['#10190f', '#050a05'], rail: '#3f6b2c', wood: '#26401a', lantern: '#d6ff9e', hull: '#3c5e2a', sail: '#a8c08c' },
  { id: 'midnight',   name: 'Midnight Watch',      rarity: 'bosun',    deck: ['#0b0f1c', '#03050b'], rail: '#2a3a6b', wood: '#141d38', lantern: '#ffffff', hull: '#1a2547', sail: '#3a4a7a' },
  { id: 'puffin',     name: 'Puffin',              rarity: 'bosun',    deck: ['#141414', '#060606'], rail: '#ff8a2a', wood: '#1c1c1c', lantern: '#ffd0a0', hull: '#141414', sail: '#f5f5f5' },
  { id: 'stripe',     name: 'Lighthouse Stripe',   rarity: 'mate',     deck: ['#241312', '#0e0605'], rail: '#f2efe8', wood: '#a5413a', lantern: '#ffe9a8', hull: '#c43a30', sail: '#f7f3ea' },
  { id: 'aurora',     name: 'Northern Lights',     rarity: 'mate',     deck: ['#0d1820', '#040a0f'], rail: '#6effc4', wood: '#3a2c6b', lantern: '#b98cff', hull: '#2a5c6b', sail: '#8fffd9' },
  { id: 'knockwood',  name: "Knock's Timber",      rarity: 'captain',  deck: ['#3a2410', '#1a0f05'], rail: '#d99a52', wood: '#b9773a', lantern: '#ffd68a', hull: '#c98a4a', sail: '#f0d9b0' },
  { id: 'ghost',      name: 'Ghost Ship',          rarity: 'captain',  deck: ['#2a3438', '#11171a'], rail: '#cfe6ee', wood: '#8fa8b0', lantern: '#c8f4ff', hull: '#b8ccd2', sail: '#eefbff' },
  { id: 'abyss',      name: 'Abyssal Black',       rarity: 'admiral',  deck: ['#050607', '#000000'], rail: '#00e5ff', wood: '#0a0c0e', lantern: '#00e5ff', hull: '#07090b', sail: '#0f1418' },
  { id: 'coal',       name: 'Coal Barge',          rarity: 'deckhand', deck: ['#131313', '#060606'], rail: '#2b2b2b', wood: '#1a1a1a', lantern: '#ffb35c', hull: '#2a2a2a', sail: '#8c8579' },
  { id: 'driftwood',  name: 'Driftwood',           rarity: 'deckhand', deck: ['#2c2721', '#141210'], rail: '#7a6e5e', wood: '#5c5245', lantern: '#fff0d0', hull: '#8a7d6a', sail: '#ddd3c1' },
  { id: 'rust',       name: 'Rust Bucket',         rarity: 'bosun',    deck: ['#26140c', '#100804'], rail: '#8f3f16', wood: '#5a2a10', lantern: '#ff9e5e', hull: '#7d3412', sail: '#c4a283' },
  { id: 'mermaid',    name: 'Mermaid Teal',        rarity: 'bosun',    deck: ['#0c1f22', '#040e10'], rail: '#2cc2b5', wood: '#127a72', lantern: '#c0fff5', hull: '#169c90', sail: '#e2fffb' },
  { id: 'witch',      name: 'Witch Light',         rarity: 'mate',     deck: ['#160f20', '#08040e'], rail: '#7d3fd1', wood: '#3d1f6b', lantern: '#c27bff', hull: '#2d1a4d', sail: '#b58cff' },
  { id: 'wreckers',   name: "Wreckers' Colours",   rarity: 'captain',  deck: ['#1b120e', '#0a0605'], rail: '#e46c4f', wood: '#2c3a2c', lantern: '#86cfae', hull: '#4a1f18', sail: '#2c4a3a' },
  { id: 'gannet',     name: 'The Gannet, Restored', rarity: 'admiral', deck: ['#2a241a', '#120f0a'], rail: '#f2d27a', wood: '#efe6d2', lantern: '#fff6dc', hull: '#f4efe3', sail: '#ffffff' },
  // from the far seas
  { id: 'fjordfrost', name: 'Fjord Frost',         rarity: 'deckhand', deck: ['#1c2830', '#0a1116'], rail: '#a9d4e8', wood: '#5c8298', lantern: '#e8f8ff', hull: '#7fa9c0', sail: '#eef8fc' },
  { id: 'olive',      name: 'Olive Grove',         rarity: 'deckhand', deck: ['#1d1d12', '#0c0c07'], rail: '#7d7a3e', wood: '#4a4824', lantern: '#fff0b8', hull: '#6b6936', sail: '#e6e0c4' },
  { id: 'duskmauve',  name: 'Dusk Mauve',          rarity: 'deckhand', deck: ['#221d26', '#0e0b10'], rail: '#9a8098', wood: '#5a4a5e', lantern: '#ffd6c0', hull: '#8a7088', sail: '#e8dce6' },
  { id: 'basalt',     name: 'Basalt and Ember',    rarity: 'bosun',    deck: ['#151112', '#070506'], rail: '#ff6a2a', wood: '#2a2224', lantern: '#ffb070', hull: '#231c1d', sail: '#5a4a48' },
  { id: 'lagoon',     name: 'Lagoon Turquoise',    rarity: 'bosun',    deck: ['#0c2226', '#041012'], rail: '#3fe0d0', wood: '#1a8a84', lantern: '#c8fff6', hull: '#22b8ac', sail: '#f2fff8' },
  { id: 'barrowmoss', name: 'Barrow Moss',         rarity: 'bosun',    deck: ['#141a12', '#070a06'], rail: '#6a8a4a', wood: '#3a4a2c', lantern: '#c8f0a0', hull: '#4a5a40', sail: '#a8b498' },
  { id: 'shoal',      name: 'Crystal Shoal',       rarity: 'mate',     deck: ['#160f28', '#080412'], rail: '#8aeaff', wood: '#4a2a8a', lantern: '#e0b8ff', hull: '#5a3aa8', sail: '#d8c8ff' },
  { id: 'siren',      name: 'Siren Song',          rarity: 'mate',     deck: ['#1a1222', '#0a060e'], rail: '#f2d27a', wood: '#5a4a6a', lantern: '#ffe0a8', hull: '#4a3c58', sail: '#f2e8d8' },
  { id: 'portal',     name: 'Through the Portal',  rarity: 'captain',  deck: ['#140a20', '#06030c'], rail: '#b060ff', wood: '#1c1030', lantern: '#d090ff', hull: '#170d24', sail: '#7a3ad0' },
  { id: 'lavaforged', name: 'Lava-Forged',         rarity: 'admiral',  deck: ['#1c0a06', '#0a0302'], rail: '#ffb030', wood: '#3a120a', lantern: '#ffd070', hull: '#5a1a0c', sail: '#ff8a30' },
];
const CUTTER_SKINS = [
  { id: 'c_plain',    name: 'Cutter, as built',    rarity: null,       deck: ['#1d1610', '#0d0907'], rail: '#2a1d12', wood: '#1a120b', lantern: '#ffcf86', hull: '#5a4330', sail: '#ddd2b6' },
  { id: 'c_regatta',  name: 'Regatta White',       rarity: 'deckhand', deck: ['#2a2a28', '#121211'], rail: '#e9e6de', wood: '#c9c3b5', lantern: '#ffffff', hull: '#efece4', sail: '#ffffff' },
  { id: 'c_customs',  name: 'Customs Grey',        rarity: 'deckhand', deck: ['#1f2226', '#0c0d0f'], rail: '#4e5660', wood: '#3a4049', lantern: '#e6eef8', hull: '#5d6772', sail: '#c2c9d1' },
  { id: 'c_oyster',   name: 'Oyster Shell',        rarity: 'deckhand', deck: ['#2b2723', '#13110f'], rail: '#b9ab98', wood: '#8a7e6e', lantern: '#fff4e0', hull: '#c9bba6', sail: '#efe7da' },
  { id: 'c_pilot',    name: 'Pilot Yellow',        rarity: 'deckhand', deck: ['#221d0f', '#0f0c05'], rail: '#e0b52a', wood: '#7a6216', lantern: '#fff2b0', hull: '#d6a91c', sail: '#f4ecd2' },
  { id: 'c_tide',     name: 'Tidewater',           rarity: 'deckhand', deck: ['#14201f', '#070e0d'], rail: '#3f7f7a', wood: '#25504c', lantern: '#d8fff8', hull: '#3c7a74', sail: '#d6ece8' },
  { id: 'c_smuggler', name: "Smuggler's Night",    rarity: 'bosun',    deck: ['#0d0d10', '#040405'], rail: '#33303b', wood: '#1d1b22', lantern: '#ff9f5a', hull: '#1b1a20', sail: '#2b2933' },
  { id: 'c_revenue',  name: 'Revenue Blue',        rarity: 'bosun',    deck: ['#101827', '#050912'], rail: '#d9b85a', wood: '#1d2c4a', lantern: '#ffe7a0', hull: '#1f3463', sail: '#eef1f7' },
  { id: 'c_glass',    name: 'Sea Glass',           rarity: 'bosun',    deck: ['#13221e', '#06100d'], rail: '#8fe0c4', wood: '#4f9a84', lantern: '#e6fff6', hull: '#7cc9b0', sail: '#dff7ef' },
  { id: 'c_sunset',   name: 'Sunset Regatta',      rarity: 'mate',     deck: ['#2a140f', '#120705'], rail: '#ff8a4c', wood: '#a3402a', lantern: '#ffd08a', hull: '#e0582f', sail: '#ffcf8a' },
  { id: 'c_coral',    name: 'Coral Reef',          rarity: 'mate',     deck: ['#2a1418', '#11070a'], rail: '#ff7b8f', wood: '#2f8a8a', lantern: '#ffd6dc', hull: '#ff6f85', sail: '#fff0e6' },
  { id: 'c_bolt',     name: 'Lightning Bolt',      rarity: 'captain',  deck: ['#0e0f1a', '#04040a'], rail: '#ffe14d', wood: '#2a2d55', lantern: '#fff8b0', hull: '#22264a', sail: '#ffe14d' },
  { id: 'c_gull',     name: 'Silver Gull',         rarity: 'admiral',  deck: ['#24282c', '#0e1012'], rail: '#e8eef4', wood: '#aeb8c2', lantern: '#ffffff', hull: '#cfd8e0', sail: '#ffffff' },
  // from the far seas
  { id: 'c_snow',     name: 'Snowfield',           rarity: 'deckhand', deck: ['#262c30', '#101315'], rail: '#f2f8fc', wood: '#9ab0bc', lantern: '#ffffff', hull: '#e4eef4', sail: '#ffffff' },
  { id: 'c_sand',     name: 'Lagoon Sand',         rarity: 'deckhand', deck: ['#2a2418', '#120f0a'], rail: '#e0c890', wood: '#9a8656', lantern: '#fff4d0', hull: '#d4bc84', sail: '#f8f0dc' },
  { id: 'c_marble',   name: 'Temple Marble',       rarity: 'deckhand', deck: ['#2a2826', '#121110'], rail: '#ece4d0', wood: '#ab9f88', lantern: '#fff0d0', hull: '#ddd4c0', sail: '#f6f0e4' },
  { id: 'c_ash',      name: 'Ash Cloud',           rarity: 'bosun',    deck: ['#1a1818', '#090808'], rail: '#ff7a3a', wood: '#3a3434', lantern: '#ffb07a', hull: '#4a4444', sail: '#8a8282' },
  { id: 'c_firefly',  name: 'Firefly',             rarity: 'bosun',    deck: ['#101a10', '#050a05'], rail: '#d8ff7a', wood: '#2a3a20', lantern: '#e8ff9a', hull: '#24301c', sail: '#c8d8a8' },
  { id: 'c_lamp',     name: 'Street Lamp',         rarity: 'bosun',    deck: ['#1c1822', '#0a080e'], rail: '#ffd6a0', wood: '#2a2430', lantern: '#ffd6a0', hull: '#3a3442', sail: '#d8ccd8' },
  { id: 'c_echo',     name: 'The Echo',            rarity: 'mate',     deck: ['#2a2830', '#121116'], rail: '#f4f0f8', wood: '#a8a0b0', lantern: '#ffffff', hull: '#cfc8d6', sail: '#f8f4fc' },
  { id: 'c_kite',     name: 'Cinder Kite',         rarity: 'mate',     deck: ['#1c0e0a', '#0a0504'], rail: '#ff7a2a', wood: '#2c1612', lantern: '#ffa050', hull: '#2a1512', sail: '#1c1110' },
  { id: 'c_aurora',   name: 'Fjord Aurora',        rarity: 'captain',  deck: ['#0a1820', '#030a0f'], rail: '#50ffaa', wood: '#123a4a', lantern: '#a0fff0', hull: '#0e3040', sail: '#7affd0' },
  { id: 'c_sleeper',  name: "The Sleeper's Eye",   rarity: 'admiral',  deck: ['#24202c', '#0e0c12'], rail: '#fff8ff', wood: '#7a7088', lantern: '#f6f0ff', hull: '#e6e0f0', sail: '#fffaff' },
];
const BARQUE_SKINS = [
  { id: 'b_plain',    name: 'Barque, as built',    rarity: null,       deck: ['#17110c', '#0a0705'], rail: '#1b120b', wood: '#120c07', lantern: '#ffcf86', hull: '#3f3125', sail: '#d4c9ab' },
  { id: 'b_whaler',   name: "Whaler's Tar",        rarity: 'deckhand', deck: ['#121010', '#060505'], rail: '#1f1b19', wood: '#151210', lantern: '#ffc27a', hull: '#1d1917', sail: '#b9ae96' },
  { id: 'b_grain',    name: 'Grain Barque',        rarity: 'deckhand', deck: ['#2a2214', '#120e08'], rail: '#8a6d3a', wood: '#5e4a26', lantern: '#ffe0a0', hull: '#9c7b40', sail: '#e9dcbc' },
  { id: 'b_iron',     name: 'Iron Grey',           rarity: 'deckhand', deck: ['#1b1d20', '#0a0b0c'], rail: '#3d4248', wood: '#2a2e33', lantern: '#e0e8f0', hull: '#43494f', sail: '#a9afb5' },
  { id: 'b_oak',      name: 'Oak and Pitch',       rarity: 'deckhand', deck: ['#21170e', '#0e0905'], rail: '#6b4a2a', wood: '#3e2a16', lantern: '#ffcf86', hull: '#5e4126', sail: '#dccfb0' },
  { id: 'b_canvas',   name: 'Canvas Brown',        rarity: 'deckhand', deck: ['#221a12', '#0f0b07'], rail: '#7a5e40', wood: '#4d3a26', lantern: '#ffd9a0', hull: '#6a5038', sail: '#c4a77e' },
  { id: 'b_emigrant', name: 'Emigrant Green',      rarity: 'bosun',    deck: ['#0f1a12', '#050b07'], rail: '#d9c27a', wood: '#1f3d28', lantern: '#fff0b8', hull: '#244a31', sail: '#ece6d2' },
  { id: 'b_tea',      name: 'Tea Clipper',         rarity: 'bosun',    deck: ['#1a0f0b', '#0a0504'], rail: '#c99a52', wood: '#3a1d12', lantern: '#ffd68a', hull: '#2a120b', sail: '#f6efe0' },
  { id: 'b_sheath',   name: 'Copper Sheath',       rarity: 'bosun',    deck: ['#2a180e', '#120a05'], rail: '#d07a3a', wood: '#6b3a18', lantern: '#ffb87a', hull: '#a85a26', sail: '#e9d6bc' },
  { id: 'b_ice',      name: 'Ice Barque',          rarity: 'mate',     deck: ['#1a2630', '#0a1016'], rail: '#bfe6ff', wood: '#6f97b3', lantern: '#e6f7ff', hull: '#9cc6e0', sail: '#f2fbff' },
  { id: 'b_spice',    name: 'Spice Route',         rarity: 'mate',     deck: ['#2a1508', '#120803'], rail: '#ffb238', wood: '#8a2f12', lantern: '#ffcf70', hull: '#b8461b', sail: '#ffd98a' },
  { id: 'b_dutchman', name: 'Flying Dutchman',     rarity: 'captain',  deck: ['#0f1a17', '#040a08'], rail: '#7affc8', wood: '#1d3a30', lantern: '#9affd8', hull: '#163027', sail: '#5c8f7c' },
  { id: 'b_royal',    name: 'Royal Barque',        rarity: 'admiral',  deck: ['#1e1428', '#0c0712'], rail: '#ffd34d', wood: '#4a2a6b', lantern: '#fff0c0', hull: '#4b2470', sail: '#fff6d8' },
  // from the far seas
  { id: 'b_slate',    name: 'Slate',               rarity: 'deckhand', deck: ['#1c1e22', '#0b0c0e'], rail: '#5a606a', wood: '#3a3e46', lantern: '#e8eef6', hull: '#4c525c', sail: '#b8bcc4' },
  { id: 'b_wine',     name: 'Wine-Dark',           rarity: 'deckhand', deck: ['#1e1020', '#0c060e'], rail: '#7a3a6a', wood: '#3a1838', lantern: '#ffd0b0', hull: '#5a2448', sail: '#e8d6dc' },
  { id: 'b_mist',     name: 'Morning Mist',        rarity: 'deckhand', deck: ['#262a2c', '#101213'], rail: '#b8c4c8', wood: '#7a8488', lantern: '#f4fbff', hull: '#a4b0b4', sail: '#eef2f4' },
  { id: 'b_cypress',  name: 'Cypress',             rarity: 'bosun',    deck: ['#0e140f', '#050805'], rail: '#3a5a3a', wood: '#1c2a1c', lantern: '#ffcf80', hull: '#1e2e20', sail: '#c8c0a0' },
  { id: 'b_emberglass', name: 'Ember Glass',       rarity: 'bosun',    deck: ['#1a0c08', '#0a0403'], rail: '#ffc060', wood: '#4a1e10', lantern: '#ffe090', hull: '#6a2410', sail: '#e8a060' },
  { id: 'b_grave',    name: 'Gravestone',          rarity: 'bosun',    deck: ['#1c1e1a', '#0a0b09'], rail: '#8a8e84', wood: '#4a4e46', lantern: '#c8e0b0', hull: '#6a6e64', sail: '#b0b4a8' },
  { id: 'b_whirl',    name: 'Whirlpool',           rarity: 'mate',     deck: ['#120c20', '#06040e'], rail: '#d8d0f0', wood: '#30204a', lantern: '#e8e0ff', hull: '#2a1d3e', sail: '#b8acd8' },
  { id: 'b_moth',     name: 'Furnace Moth',        rarity: 'mate',     deck: ['#1e0e08', '#0c0503'], rail: '#ffc860', wood: '#3a0c06', lantern: '#ffb040', hull: '#d0461a', sail: '#ffa040' },
  { id: 'b_cyclops',  name: "The Cyclops' Eye",    rarity: 'captain',  deck: ['#1c140c', '#0a0705'], rail: '#ffb040', wood: '#5a4232', lantern: '#ffc860', hull: '#4a3628', sail: '#e8d8c0' },
  { id: 'b_fleece',   name: 'Golden Fleece',       rarity: 'admiral',  deck: ['#241a0a', '#100b04'], rail: '#ffe07a', wood: '#8a6a1a', lantern: '#fff4c8', hull: '#e8c040', sail: '#fff8dc' },
];
// the carrier: deck is the flight deck (near, far), rail the deck markings, wood the island and
// superstructure, lantern her lights, hull the hull, sail the accent stripe
const CARRIER_SKINS = [
  { id: 'k_plain',    name: 'Carrier, haze grey',  rarity: null,       deck: ['#2a2d31', '#16181b'], rail: '#e8e8e0', wood: '#6a7078', lantern: '#ffe6b0', hull: '#5c636b', sail: '#d8c040' },
  { id: 'k_fleet',    name: 'Fleet Grey',          rarity: 'deckhand', deck: ['#26292c', '#141618'], rail: '#f0f0ea', wood: '#7a8088', lantern: '#fff0c8', hull: '#6c737b', sail: '#f0d040' },
  { id: 'k_dark',     name: 'Dark Hull',           rarity: 'deckhand', deck: ['#1e2023', '#0e0f11'], rail: '#d8d8d0', wood: '#3e434a', lantern: '#ffe0a0', hull: '#33383e', sail: '#c8b040' },
  { id: 'k_arctic',   name: 'Arctic White',        rarity: 'deckhand', deck: ['#33373b', '#1a1c1f'], rail: '#ffffff', wood: '#d8dee4', lantern: '#eef8ff', hull: '#c8d0d8', sail: '#7ab8e0' },
  { id: 'k_sand',     name: 'Desert Tan',          rarity: 'deckhand', deck: ['#2e2a24', '#171511'], rail: '#f4ecd8', wood: '#9a8a6a', lantern: '#fff0c0', hull: '#8a7a5c', sail: '#e0a040' },
  { id: 'k_slate',    name: 'Slate Blue',          rarity: 'deckhand', deck: ['#23272e', '#111419'], rail: '#e0e8f0', wood: '#4c5a6e', lantern: '#e6f0ff', hull: '#3e4c60', sail: '#e8e8e0' },
  { id: 'k_dazzle',   name: 'Dazzle Stripes',      rarity: 'bosun',    deck: ['#26282b', '#121315'], rail: '#ffffff', wood: '#1a1c20', lantern: '#ffffff', hull: '#e8e8e8', sail: '#141414' },
  { id: 'k_night',    name: 'Night Ops',           rarity: 'bosun',    deck: ['#141518', '#08090a'], rail: '#ff4a3a', wood: '#22252a', lantern: '#ff6a5a', hull: '#1c1f24', sail: '#ff4a3a' },
  { id: 'k_jungle',   name: 'Jungle Green',        rarity: 'bosun',    deck: ['#1c211c', '#0c100c'], rail: '#e0e8c8', wood: '#3e5a3a', lantern: '#e8ffc8', hull: '#34503a', sail: '#c8b048' },
  { id: 'k_rust',     name: 'Mothballed',          rarity: 'bosun',    deck: ['#2a221c', '#14100c'], rail: '#d8c8b0', wood: '#7a4a2a', lantern: '#ffb070', hull: '#6a3e22', sail: '#a85a2a' },
  { id: 'k_neon',     name: 'Neon Deck',           rarity: 'mate',     deck: ['#141420', '#08080f'], rail: '#3affff', wood: '#2a1a4a', lantern: '#ff4af0', hull: '#1a1a30', sail: '#ff4af0' },
  { id: 'k_carbon',   name: 'Carbon Black',        rarity: 'mate',     deck: ['#0e0f10', '#050506'], rail: '#7a8088', wood: '#1a1c1e', lantern: '#c8e0ff', hull: '#121416', sail: '#3a8aff' },
  { id: 'k_tiger',    name: 'Tiger Stripe',        rarity: 'mate',     deck: ['#2a1e12', '#140e08'], rail: '#ffa030', wood: '#1a120a', lantern: '#ffc860', hull: '#d07a20', sail: '#1a120a' },
  { id: 'k_stealth',  name: 'Stealth',             rarity: 'captain',  deck: ['#0a0b0e', '#030304'], rail: '#6a5aff', wood: '#101218', lantern: '#9a8aff', hull: '#0e1014', sail: '#6a5aff' },
  { id: 'k_ghost',    name: 'Ghost Fleet',         rarity: 'captain',  deck: ['#2a3436', '#121819'], rail: '#c8fff0', wood: '#7a9a96', lantern: '#c8fff0', hull: '#8aa8a4', sail: '#e0fff8' },
  { id: 'k_admiral',  name: 'Admiral of the Fleet', rarity: 'admiral', deck: ['#24282e', '#10121a'], rail: '#ffd34d', wood: '#1e2a48', lantern: '#fff0c0', hull: '#1a2440', sail: '#ffd34d' },
  { id: 'k_aurora',   name: 'Aurora Flagship',     rarity: 'admiral',  deck: ['#10181e', '#060a0e'], rail: '#7affd8', wood: '#203a5a', lantern: '#b8a0ff', hull: '#1a3048', sail: '#7affd8' },
];

const SKINS = BRIG_SKINS.map(s => Object.assign({ boat: 'brig' }, s))
  .concat(CUTTER_SKINS.map(s => Object.assign({ boat: 'cutter' }, s)))
  .concat(BARQUE_SKINS.map(s => Object.assign({ boat: 'barque' }, s)))
  .concat(CARRIER_SKINS.map(s => Object.assign({ boat: 'carrier' }, s)));
const SKIN_BY_ID = Object.fromEntries(SKINS.map(s => [s.id, s]));
const PLAIN = { brig: 'plain', cutter: 'c_plain', barque: 'b_plain', carrier: 'k_plain' };

// pennants: a small flag, in a pattern of one or two colours
const PENNANTS = [
  { id: 'p_red',      kind: 'pennant', name: 'Red Pennant',        rarity: 'deckhand', colors: ['#c8372d', '#c8372d'], pattern: 'solid' },
  { id: 'p_navy',     kind: 'pennant', name: 'Navy Pennant',       rarity: 'deckhand', colors: ['#24365e', '#24365e'], pattern: 'solid' },
  { id: 'p_white',    kind: 'pennant', name: 'White Pennant',      rarity: 'deckhand', colors: ['#f1ede4', '#f1ede4'], pattern: 'solid' },
  { id: 'p_green',    kind: 'pennant', name: 'Harbour Green',      rarity: 'deckhand', colors: ['#2f8a5b', '#2f8a5b'], pattern: 'solid' },
  { id: 'p_split',    kind: 'pennant', name: 'Split Ensign',       rarity: 'bosun',    colors: ['#2c5aa0', '#f1ede4'], pattern: 'split' },
  { id: 'p_pilot',    kind: 'pennant', name: 'Pilot Flag',         rarity: 'bosun',    colors: ['#f2c230', '#1a1a1a'], pattern: 'check' },
  { id: 'p_gull',     kind: 'pennant', name: 'Herring Gull',       rarity: 'bosun',    colors: ['#f1ede4', '#8c99a3'], pattern: 'stripes' },
  { id: 'p_storm',    kind: 'pennant', name: 'Storm Warning',      rarity: 'mate',     colors: ['#d0281f', '#111111'], pattern: 'square' },
  { id: 'p_selkie',   kind: 'pennant', name: 'Selkie Banner',      rarity: 'mate',     colors: ['#1c8c70', '#bff2e2'], pattern: 'stripes' },
  { id: 'p_keeper',   kind: 'pennant', name: "Keeper's Colours",   rarity: 'captain',  colors: ['#ffd34d', '#1d3a5f'], pattern: 'stripes' },
  { id: 'p_maren',    kind: 'pennant', name: "Maren's Shawl",      rarity: 'captain',  colors: ['#5a2b2b', '#e8d9c4'], pattern: 'split' },
  { id: 'p_laces',    kind: 'pennant', name: "Plimsoll's Laces",   rarity: 'admiral',  colors: ['#5fd3ff', '#ffffff'], pattern: 'check' },
  { id: 'p_tan',      kind: 'pennant', name: 'Tanbark',            rarity: 'deckhand', colors: ['#8a4a26', '#8a4a26'], pattern: 'solid' },
  { id: 'p_sky',      kind: 'pennant', name: 'Fair Weather',       rarity: 'deckhand', colors: ['#7fb8e6', '#7fb8e6'], pattern: 'solid' },
  { id: 'p_mackerel', kind: 'pennant', name: 'Mackerel Sky',       rarity: 'deckhand', colors: ['#3f6f8f', '#c9d6df'], pattern: 'stripes' },
  { id: 'p_ochre',    kind: 'pennant', name: 'Ochre and Black',    rarity: 'bosun',    colors: ['#d39a2c', '#161616'], pattern: 'split' },
  { id: 'p_quarantine', kind: 'pennant', name: 'Quarantine Yellow', rarity: 'bosun',   colors: ['#f4d21c', '#f4d21c'], pattern: 'solid' },
  { id: 'p_lighthouse', kind: 'pennant', name: 'Lighthouse Stripe', rarity: 'mate',    colors: ['#f1ede4', '#c8372d'], pattern: 'stripes' },
  { id: 'p_backrooms', kind: 'pennant', name: 'Yellow Rooms',     rarity: 'captain',  colors: ['#d9c25a', '#6b5f25'], pattern: 'check' },
  { id: 'p_verity',   kind: 'pennant', name: "Verity's Grin",      rarity: 'admiral',  colors: ['#f2d21c', '#111111'], pattern: 'square' },
];
// flare skins: the colour of the star, the glow it throws, and (for the best ones) a second colour
// it changes to, or a slow cycle through colours. Your crew sees your flares in your colour.
const FLARES = [
  { id: 'f_red',      kind: 'flare', name: 'Distress Red',     rarity: null,       glow: '#ff8a5a', core: '#fff3d6' },
  { id: 'f_white',    kind: 'flare', name: 'Magnesium White',  rarity: 'deckhand', glow: '#e9eeff', core: '#ffffff' },
  { id: 'f_amber',    kind: 'flare', name: 'Amber Star',       rarity: 'deckhand', glow: '#ffb238', core: '#fff0c0' },
  { id: 'f_green',    kind: 'flare', name: 'Green Star',       rarity: 'deckhand', glow: '#4cff7a', core: '#e8ffe8' },
  { id: 'f_blue',     kind: 'flare', name: 'Blue Light',       rarity: 'deckhand', glow: '#4c8dff', core: '#e0ecff' },
  { id: 'f_violet',   kind: 'flare', name: 'Violet Signal',    rarity: 'bosun',    glow: '#a85cff', core: '#f0e2ff' },
  { id: 'f_pink',     kind: 'flare', name: 'Rose Rocket',      rarity: 'bosun',    glow: '#ff5cb8', core: '#ffe2f2' },
  { id: 'f_teal',     kind: 'flare', name: 'Sea Glass',        rarity: 'bosun',    glow: '#3ee6d2', core: '#e2fffb' },
  { id: 'f_redgreen', kind: 'flare', name: 'Pier Lamps',       rarity: 'mate',     glow: '#e46c4f', core: '#fff3d6', glow2: '#86cfae' },
  { id: 'f_gold',     kind: 'flare', name: 'Gold Rain',        rarity: 'mate',     glow: '#ffd34d', core: '#fff8d0', sparks: true },
  { id: 'f_maren',    kind: 'flare', name: "Maren's Lantern",  rarity: 'captain',  glow: '#9affd8', core: '#f0fff8', glow2: '#3a6b5c', flicker: true },
  { id: 'f_exit',     kind: 'flare', name: 'Exit Sign',        rarity: 'captain',  glow: '#3dff7a', core: '#d6ffe2', glow2: '#d9c25a' },
  { id: 'f_aurora',   kind: 'flare', name: 'Aurora',           rarity: 'admiral',  glow: '#5cffb8', core: '#ffffff', cycle: true, sparks: true },
];
const FLARE_BY_ID = Object.fromEntries(FLARES.map(f => [f.id, f]));
// the colour a flare shows at a given age (seconds since it went up)
function flareColour(fs, age) {
  fs = fs || FLARES[0];
  if (fs.cycle) { const h = (age * 60) % 360; return 'hsl(' + h.toFixed(0) + ',100%,62%)'; }
  if (fs.glow2) return Math.floor(age * (fs.flicker ? 6 : 2)) % 2 ? fs.glow2 : fs.glow;
  return fs.glow;
}
const PENNANT_BY_ID = Object.fromEntries(PENNANTS.map(p => [p.id, p]));
const LOOT_BY_ID = Object.assign({}, SKIN_BY_ID, PENNANT_BY_ID, FLARE_BY_ID);
const lootFor = () => SKINS.filter(s => s.rarity).concat(PENNANTS, FLARES.filter(f => f.rarity));
const rarityOf = s => RARITIES.find(r => r.id === s.rarity);

const CRATES = {
  crates: { skerry: 0 },
  owned: {}, opened: 0, equipped: { brig: 'plain', cutter: 'c_plain', barque: 'b_plain', carrier: 'k_plain' }, pennant: null, flare: null,
  boat: 'brig', opening: false, pending: null, view: 'skins',
};
function totalCrates() { return CRATES.crates.skerry; }
function loadCrates() {
  let fresh = true;
  try {
    const raw = localStorage.getItem('skerry-crates');
    if (raw) {
      fresh = false;
      const d = JSON.parse(raw);
      // older saves kept one plain number of crates and one skin: those were all for the brig
      // older saves: one plain number, or Brig/Cutter/Barque crates. Those all become Boat Skin Crates.
      const n = v => Math.max(0, Math.min(99999, v | 0));
      // (any older kinds of crate, per boat or per loot type, all become Skerry Crates)
      if (typeof d.crates === 'number') CRATES.crates.skerry = n(d.crates);
      else if (d.crates && typeof d.crates === 'object') CRATES.crates.skerry = n(Object.values(d.crates).reduce((a, v) => a + (v | 0), 0));
      CRATES.owned = d.owned && typeof d.owned === 'object' ? d.owned : {};
      CRATES.opened = n(d.opened);
      if (typeof d.equipped === 'string') { if (SKIN_BY_ID[d.equipped] && SKIN_BY_ID[d.equipped].boat === 'brig') CRATES.equipped.brig = d.equipped; }
      else if (d.equipped && typeof d.equipped === 'object') for (const b of BOATS) { const s = SKIN_BY_ID[d.equipped[b.id]]; if (s && s.boat === b.id) CRATES.equipped[b.id] = s.id; }
      CRATES.pennant = PENNANT_BY_ID[d.pennant] ? d.pennant : null;
      CRATES.boat = BOAT_BY_ID[d.boat] ? d.boat : 'brig';
      CRATES.flare = FLARE_BY_ID[d.flare] ? d.flare : null;
      // a crate whose reel was still spinning when the page closed: the prize is still yours
      if (LOOT_BY_ID[d.pending]) { CRATES.owned[d.pending] = (CRATES.owned[d.pending] | 0) + 1; }
      CRATES.pending = null;
    }
  } catch (e) {}
  if (fresh) CRATES.crates.skerry = 1;   // a first crate to try
  saveCrates();
}
function saveData() {
  return { crates: CRATES.crates, opened: CRATES.opened, owned: CRATES.owned, equipped: CRATES.equipped, pennant: CRATES.pennant, flare: CRATES.flare, boat: CRATES.boat };
}
function saveCrates() {
  try { localStorage.setItem('skerry-crates', JSON.stringify(Object.assign(saveData(), { pending: CRATES.pending }))); } catch (e) {}
  cloudSaveSoon();
  if (typeof renderBackupDot === 'function') renderBackupDot();
}

// ---------- keeping your loot safe ----------
// Browser storage alone isn't enough: links opened inside other apps (Discord, Snapchat, Messages...),
// private windows and cleared site data all start empty. So there are two backups:
//  - on claude.ai, your save also lives in your account (a private record only you can read)
//  - anywhere, a save code you can copy and paste into another browser to bring everything across
// Merging never loses anything: you keep every item either side has, and the larger crate count.
function mergeSave(d, takeLooks) {
  if (!d || typeof d !== 'object') return false;
  let changed = false;
  if (d.owned && typeof d.owned === 'object') for (const [id, n] of Object.entries(d.owned)) {
    if (!LOOT_BY_ID[id]) continue;
    const v = Math.max(0, Math.min(99999, n | 0));
    if (v > (CRATES.owned[id] | 0)) { CRATES.owned[id] = v; changed = true; }
  }
  const cr = d.crates && typeof d.crates === 'object' ? Object.values(d.crates).reduce((a, v) => a + (v | 0), 0) : (d.crates | 0);
  // crates: compare everything ever earned (unopened + opened), so reloading an old code can't hand back
  // crates you've since opened
  const earned = Math.max(cr + Math.max(0, d.opened | 0), CRATES.crates.skerry + (CRATES.opened | 0));
  const opened = Math.max(CRATES.opened | 0, Math.max(0, d.opened | 0));
  const left = Math.min(99999, Math.max(0, earned - opened));
  if (left !== CRATES.crates.skerry || opened !== (CRATES.opened | 0)) { CRATES.crates.skerry = left; CRATES.opened = opened; changed = true; }
  if (takeLooks) {
    if (d.equipped && typeof d.equipped === 'object') for (const b of BOATS) {
      const sk = SKIN_BY_ID[d.equipped[b.id]];
      if (sk && sk.boat === b.id && (!sk.rarity || CRATES.owned[sk.id]) && CRATES.equipped[b.id] !== sk.id) { CRATES.equipped[b.id] = sk.id; changed = true; }
    }
    if (PENNANT_BY_ID[d.pennant] && CRATES.owned[d.pennant] && CRATES.pennant !== d.pennant) { CRATES.pennant = d.pennant; changed = true; }
    if (FLARE_BY_ID[d.flare] && CRATES.owned[d.flare] && CRATES.flare !== d.flare) { CRATES.flare = d.flare; changed = true; }
    if (BOAT_BY_ID[d.boat] && CRATES.boat !== d.boat) { CRATES.boat = d.boat; changed = true; }
  }
  return changed;
}
function afterMerge() { saveCrates(); renderCrates(); updateCrateButtons(); renderBackupDot(); if (typeof crewMode !== 'undefined' && crewMode) send(); }

// the save code: your save, packed into one line of text
function saveCode() {
  const d = saveData();
  const packed = { c: d.crates.skerry, n: d.opened | 0, o: d.owned, e: d.equipped, p: d.pennant, f: d.flare, b: d.boat };
  return 'SKERRY-' + btoa(unescape(encodeURIComponent(JSON.stringify(packed)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function readSaveCode(text) {
  // accepts a bare code, a save link, or a save file's text
  const m = String(text || '').match(/SKERRY-([A-Za-z0-9+/_-]+)/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const o = JSON.parse(decodeURIComponent(escape(atob(b64 + '==='.slice((b64.length + 3) % 4)))));
    return { crates: o.c | 0, opened: o.n | 0, owned: o.o, equipped: o.e, pennant: o.p, flare: o.f, boat: o.b };
  } catch (e) { return null; }
}

// your account, on claude.ai
const CLOUD = { ref: null, timer: 0, status: '' };
async function cloudInit() {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const id = user && await user.id();
    if (!db || !id) return;
    CLOUD.ref = db.doc('data/users/' + id + '/skerry');
    const snap = await CLOUD.ref.get();
    if (snap.exists) {
      // what's in your account wins for how your ships look; nothing you own here is lost
      if (mergeSave(snap.data(), true)) afterMerge();
    }
    CLOUD.status = 'Saved to your claude.ai account.';
    cloudSaveSoon(0);
    renderSaveBox();
  } catch (e) { CLOUD.ref = null; }
}
function cloudSaveSoon(delay) {
  if (!CLOUD.ref) return;
  clearTimeout(CLOUD.timer);
  CLOUD.timer = setTimeout(() => {
    CLOUD.ref.set(Object.assign(saveData(), { savedAt: Date.now() })).then(() => { CLOUD.status = 'Saved to your claude.ai account.'; renderSaveBox(); })
      .catch(() => { CLOUD.status = 'Couldn\u2019t save to your account just now; it\u2019s still saved in this browser.'; renderSaveBox(); });
  }, delay == null ? 1500 : delay);
}

function renderSaveBox() {
  const st = $('saveStatus'); if (!st) return;
  st.textContent = CLOUD.ref ? CLOUD.status : 'Saved in this browser only. Back it up in one tap: you get a link that loads your save on any phone or browser.';
}
// ---------- one-tap backups ----------
// A save link opens the game and loads your save, on any phone or browser. On claude.ai the page
// can't be linked to like that (and your save is kept in your account there), so it's the plain code.
function saveLink() {
  if (window.claude && typeof window.claude.use === 'function') return null;
  return location.origin + location.pathname + '#load=' + saveCode();
}
function lootSize() { return Object.values(CRATES.owned).reduce((a, v) => a + (v | 0), 0) + (CRATES.crates.skerry | 0); }
function markBackedUp() { try { localStorage.setItem('skerry-backup', String(lootSize())); } catch (e) {} renderBackupDot(); }
function needsBackup() { let b = 0; try { b = +localStorage.getItem('skerry-backup') || 0; } catch (e) {} return lootSize() > b && Object.keys(CRATES.owned).length > 0; }
function renderBackupDot() { for (const b of document.querySelectorAll('.backupBtn')) b.classList.toggle('due', needsBackup()); }
// the quickest way to keep it: the phone's share sheet (Messages, Notes, email...), else copy the link
async function backupNow(msgEl) {
  const link = saveLink(), text = link || saveCode();
  const say = t => { if (msgEl) msgEl.textContent = t; if (typeof toast === 'function') toast(t, 'Save backed up'); };
  if (navigator.share && link) {
    try {
      await navigator.share({ title: 'My Skerry Light save', text: 'Open this link to load my Skerry Light save:', url: link });
      markBackedUp(); say('Save sent. Open that link on any phone or browser to get everything back.'); return;
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); markBackedUp(); say(link ? 'Save link copied. Paste it somewhere safe (a note, a message to yourself); opening it loads your save anywhere.' : 'Save code copied. Paste it somewhere safe, and into Load a save code to bring it back.'); return; } catch (e) {}
  const input = $('saveInput'); if (input) { showCrates(); input.value = text; input.focus(); input.select(); }
  say('Copy the save in the box and keep it somewhere safe.');
}
function downloadSave() {
  const text = 'Skerry Light save\n\n' + (saveLink() ? 'Open this link to load it:\n' + saveLink() + '\n\nOr paste this code into Load a save code:\n' : 'Paste this code into Load a save code:\n') + saveCode() + '\n';
  // on claude.ai a page can only hand over a file through the viewer's download prompt
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('downloads').then(dl => {
      if (dl) dl.save({ filename: 'skerry-light-save.txt', data: text }).then(() => markBackedUp()).catch(() => {});
    });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = 'skerry-light-save.txt';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  markBackedUp();
}
function loadSaveText(text, msgEl) {
  const d = readSaveCode(text);
  const say = t => { if (msgEl) msgEl.textContent = t; };
  if (!d) { say('That doesn\u2019t look like a Skerry Light save.'); return false; }
  if (CRATES.opening) return false;
  const changed = mergeSave(d, true);
  afterMerge(); markBackedUp();
  say(changed ? 'Save loaded: everything from it is now here too.' : 'You already have everything in that save.');
  return true;
}
// opening a save link: load it (nothing you already have is ever taken away), then tidy the address
function loadFromLink() {
  const m = (location.hash || '').match(/^#load=(SKERRY-[A-Za-z0-9+/_-]+)/);
  if (!m) return;
  const d = readSaveCode(m[1]);
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  if (!d) return;
  const changed = mergeSave(d, true);
  afterMerge(); markBackedUp();
  setTimeout(() => toast(changed ? 'Your save was loaded from the link. Welcome back aboard.' : 'That save link has nothing new for this browser.', 'Save loaded'), 600);
}

function setupSaveBox() {
  const copy = $('saveCopy'), load = $('saveLoad'), input = $('saveInput'), msg = $('saveMsg');
  if (!copy) return;
  copy.addEventListener('click', () => backupNow(msg));
  load.addEventListener('click', () => loadSaveText(input.value, msg));
  $('saveFile').addEventListener('click', () => { downloadSave(); msg.textContent = 'Save file downloaded (skerry-light-save.txt). Keep it, and load it back with Load a save file.'; });
  $('saveFileIn').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { loadSaveText(await f.text(), msg); } catch (err) { msg.textContent = 'Couldn\u2019t read that file.'; }
    e.target.value = '';
  });
  $('saveFilePick').addEventListener('click', () => $('saveFileIn').click());
  for (const b of document.querySelectorAll('.backupBtn')) b.addEventListener('click', () => backupNow(null));
  renderSaveBox();
  renderBackupDot();
}
function myBoat() { return BOAT_BY_ID[CRATES.boat] || BOATS[0]; }
function mySkin() { return SKIN_BY_ID[CRATES.equipped[CRATES.boat]] || SKIN_BY_ID[PLAIN[CRATES.boat]]; }
function myPennant() { return PENNANT_BY_ID[CRATES.pennant] || null; }
function myFlare() { return FLARE_BY_ID[CRATES.flare] || FLARES[0]; }
function equip(item) {
  if (item.kind === 'pennant') CRATES.pennant = CRATES.pennant === item.id ? null : item.id;
  else if (item.kind === 'flare') CRATES.flare = item.rarity ? item.id : null;
  else CRATES.equipped[item.boat] = item.id;
  saveCrates(); renderCrates(); renderBoatPicks();
  if (crewMode) send();
}
function chooseBoat(id) {
  if (!BOAT_BY_ID[id] || state === 'play') return;
  CRATES.boat = id;
  saveCrates(); renderCrates(); updateCrateButtons();
  if (crewMode) { send(); if (!$('crewCard').hidden && typeof renderCrewCard === 'function') renderCrewCard(); }
}

// a crate of a random kind for every voyage, two for making harbour (each rolled separately)
// end of a voyage: one crate if she went down (and any floating crates aboard go down with her);
// for making harbour SK.HARBOUR_CRATES, plus every floating crate you hauled aboard, counted double
// the harbour reward follows the Fibonacci sequence for each voyage in a row you make harbour:
// 5, 8, 13, 21, 34, 55... (voyage 1 again after a sinking, so the streak starts over)
function harbourReward() {
  const steps = Math.min(SK.HARBOUR_STEPS, Math.max(1, g ? g.n : 1));
  let a = 3, b = SK.HARBOUR_CRATES;   // 3, 5 -> 8 -> 13 ...
  for (let i = 1; i < steps; i++) { const c = a + b; a = b; b = c; }
  return b;
}
function grantCrate(n, harbour) {
  if (!g || g.attract || g.crateGiven) return;
  n = n || 1;
  g.crateGiven = true;
  CRATES.crates.skerry += n;
  saveCrates();
  updateCrateButtons();
  const found = g.found || 0;
  const text = harbour
    ? 'Made harbour on voyage ' + g.n + ': ' + harbourReward() + ' Skerry Crates' + (g.n > 1 ? ' (' + g.n + ' in a row)' : '') + (found ? ', plus the ' + found + (found === 1 ? ' crate' : ' crates') + ' you hauled aboard, counted double: +' + found * 2 : '') + '. Open them from the menu.'
    : 'You found a Skerry Crate in the wreckage.' + (found ? ' The ' + found + (found === 1 ? ' crate' : ' crates') + ' you hauled aboard went down with her.' : '') + ' Open it from the menu.';
  toast(text, '+' + n + ' Skerry Crate' + (n > 1 ? 's' : ''));
}

// a floating crate hauled aboard: it's only yours if you make harbour with it (where it counts double)
function collectPickup(p) {
  p.taken = true;
  g.found++;
  renderFound();
  sfxPickup();
  burst(p.x, p.y, ['#ffd88a', '#c89a52', '#ffffff'], 18, 5, 7);
  // the Brig's crew restock from it: flare and bell ready again at once
  let restocked = false;
  if (ship.boat === 'brig' && (g.flareCd > 0 || g.bell > 0)) { g.flareCd = 0; g.bell = 0; restocked = true; sfxChime(); }
  if (restocked) addLog('The crew restocked from the crate: flare and bell ready.', 'p');
  addLog('Hauled a floating crate aboard (' + g.found + ' aboard). Make harbour and each one is worth two; sink and they\u2019re lost.', 'p');
}
function renderFound() {
  const b = $('foundBox'); if (!b) return;
  b.hidden = !g || !g.found;
  if (g && g.found) $('found').textContent = g.found;
}
function updatePickups() {
  if (!g.pickups || g.attract || state !== 'play') return;
  for (const p of g.pickups) if (!p.taken && Math.hypot(p.x - ship.x, p.y - ship.y) < SK.PICKUP_RADIUS && (!g.sky || Math.abs((p.z || 0) - ship.z) < 8)) collectPickup(p);
}
// a wooden crate bobbing on the water, with a little lantern lashed on top so you can find it in the dark
function drawPickup(o, p, vis) {
  const s = p.s, bob = Math.sin(g.t * 2 + o.ph) * 0.25 * s, sz = Math.max(4, 3.6 * s), x = p.x, y = p.y + bob;
  const lit = Math.max(0.35, vis);
  // in the sky it hangs from a little balloon
  if (g.sky) { ctx.strokeStyle = 'rgba(200,190,170,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - sz); ctx.lineTo(x, y - sz * 3.2); ctx.stroke(); ctx.fillStyle = 'rgba(210,80,60,0.85)'; ctx.beginPath(); ctx.ellipse(x, y - sz * 4, sz * 0.9, sz * 1.1, 0, 0, 6.28); ctx.fill(); }
  // glow first, visible from far away
  const pulse = 1 + 0.12 * Math.sin(g.t * 4 + o.ph);
  const gl = Math.max(2.5, 1.3 * Math.sqrt(s)) * pulse;
  // a faint pillar of golden light rising from it, so you can spot it from a long way off
  const top = y - Math.max(30, 22 * s), pw = Math.max(2, sz * 0.3);
  const pg = ctx.createLinearGradient(0, top, 0, y);
  pg.addColorStop(0, 'rgba(255,210,120,0)'); pg.addColorStop(1, `rgba(255,210,120,${0.1 * pulse})`);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = pg; ctx.fillRect(x - pw / 2, top, pw, y - top);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.55; lamp(x, y - sz * 1.15, '#ffc46e', gl); ctx.globalAlpha = 1;
  // a twinkle above it
  if (!reduceMotion) { const tw = 0.5 + 0.5 * Math.sin(g.t * 6 + o.ph * 3); ctx.fillStyle = `rgba(255,240,200,${0.5 * tw})`; const k = Math.max(1.2, sz * 0.1); ctx.fillRect(x - k / 2, y - sz * 1.9 - k, k, k * 3); ctx.fillRect(x - k * 1.5, y - sz * 1.9, k * 3, k); }
  if (sz < 5) { ctx.fillStyle = '#ffd88a'; ctx.fillRect(x - 1.5, y - sz - 1.5, 3, 3); return; }
  ctx.globalAlpha = lit;
  ctx.fillStyle = 'rgba(220,232,245,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y, sz * 0.9, Math.max(1, sz * 0.12), 0, 0, 6.28); ctx.fill();
  // the box, its planks, and a rope band
  ctx.fillStyle = '#7a5530'; ctx.fillRect(x - sz / 2, y - sz * 0.8, sz, sz * 0.8);
  ctx.fillStyle = '#9a7040'; ctx.fillRect(x - sz / 2, y - sz * 0.8, sz, sz * 0.12);
  ctx.strokeStyle = 'rgba(40,25,10,0.8)'; ctx.lineWidth = Math.max(0.8, sz * 0.04);
  ctx.strokeRect(x - sz / 2, y - sz * 0.8, sz, sz * 0.8);
  ctx.beginPath(); ctx.moveTo(x - sz / 2, y - sz * 0.4); ctx.lineTo(x + sz / 2, y - sz * 0.4); ctx.moveTo(x - sz / 2, y - sz * 0.8); ctx.lineTo(x + sz / 2, y); ctx.stroke();
  ctx.strokeStyle = '#c8a874'; ctx.lineWidth = Math.max(1, sz * 0.06);
  ctx.beginPath(); ctx.moveTo(x, y - sz * 0.8); ctx.lineTo(x, y); ctx.stroke();
  // the lantern
  ctx.fillStyle = '#2a1e14'; ctx.fillRect(x - sz * 0.12, y - sz * 1.3, sz * 0.24, sz * 0.4);
  ctx.fillStyle = '#ffd88a'; ctx.fillRect(x - sz * 0.08, y - sz * 1.25, sz * 0.16, sz * 0.3);
  ctx.globalAlpha = 1;
}

function rollSkin(crate) {
  let r = Math.random(), rarity = RARITIES[0];
  for (const ra of RARITIES) { if (r < ra.odds) { rarity = ra; break; } r -= ra.odds; }
  const pool = lootFor().filter(s => s.rarity === rarity.id);
  return pool[(Math.random() * pool.length) | 0];
}
// the cards that scroll past in the reel never include gold, so any gold you see is your prize
function rollFiller(crate) {
  let it;
  do { it = rollSkin(crate); } while (it.rarity === 'admiral');
  return it;
}

// a pennant, drawn on any canvas: pole top at (x, y), flying to the right, size = length
function drawPennant(c, x, y, size, pen, t) {
  const n = 8, pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, wave = Math.sin(t * 6 - u * 5) * size * 0.07 * u;
    pts.push([x + u * size, y + wave, size * 0.36 * (1 - u)]);
  }
  const strip = (from, to, col) => {
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i <= n; i++) { const [px, py, hw] = pts[i]; const a = py - hw + 2 * hw * from; i ? c.lineTo(px, a) : c.moveTo(px, a); }
    for (let i = n; i >= 0; i--) { const [px, py, hw] = pts[i]; c.lineTo(px, py - hw + 2 * hw * to); }
    c.closePath(); c.fill();
  };
  const [a, b] = pen.colors;
  if (pen.pattern === 'split') { strip(0, 0.5, a); strip(0.5, 1, b); }
  else if (pen.pattern === 'stripes') { for (let i = 0; i < 4; i++) strip(i / 4, (i + 1) / 4, i % 2 ? b : a); }
  else if (pen.pattern === 'check') { strip(0, 1, a); c.save(); c.beginPath(); for (let i = 0; i <= n; i++) { const [px, py, hw] = pts[i]; i ? c.lineTo(px, py - hw) : c.moveTo(px, py - hw); } for (let i = n; i >= 0; i--) { const [px, py, hw] = pts[i]; c.lineTo(px, py + hw); } c.closePath(); c.clip(); c.fillStyle = b; const q = size * 0.18; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect(x + i * q, y - size * 0.36 + j * q, q, q); c.restore(); }
  else if (pen.pattern === 'square') { strip(0, 1, a); c.fillStyle = b; c.fillRect(x + size * 0.12, y - size * 0.1, size * 0.2, size * 0.2); }
  else strip(0, 1, a);
}

// ---------- UI ----------
function skinPreview(skin, size) {
  const boat = BOAT_BY_ID[skin.boat] || BOATS[0];
  if (boat.id === 'carrier' && typeof carrierPreview === 'function') return carrierPreview(skin, size);
  const tier = typeof skinTier === 'function' ? skinTier(skin) : 0;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 80'); svg.setAttribute('width', size); svg.setAttribute('height', size * 2 / 3);
  svg.setAttribute('aria-hidden', 'true');
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
  const gold = '#e8c050', rail = tier >= 5 ? gold : skin.rail;
  const half = 46 * boat.len / 27, cxp = 58, deckY = 54, top = deckY - 44 * Math.min(1, boat.len / 22) * (boat.id === 'cutter' ? 1.05 : 1);
  const bowX = cxp + half, sternX = cxp - half;
  // water and a little wake
  el('path', { d: `M${sternX - 8} 66 Q60 71 ${bowX + 10} 63`, stroke: 'rgba(220,232,245,0.35)', 'stroke-width': 1.5, fill: 'none' });
  // bowsprit and stays
  el('line', { x1: bowX - 3, y1: deckY - 2, x2: bowX + 13, y2: deckY - 9, stroke: skin.wood, 'stroke-width': 1.6 });
  const fore = cxp + Math.max(...boat.masts) * half * 1.6;
  el('line', { x1: bowX + 13, y1: deckY - 9, x2: fore, y2: top, stroke: 'rgba(30,24,18,0.8)', 'stroke-width': 0.6 });
  // jib
  el('path', { d: `M${bowX + 11} ${deckY - 9} L${fore + 3} ${top + 6} L${fore + 3} ${deckY - 6} Z`, fill: skin.sail, opacity: 0.95 });
  // masts and sails
  for (const m of boat.masts) {
    const mx = cxp + m * half * 1.6;
    el('line', { x1: mx, y1: deckY, x2: mx, y2: top, stroke: skin.wood, 'stroke-width': 2 });
    const sails = [];
    if (boat.id === 'cutter') sails.push(`M${mx - 1} ${deckY - 5} L${sternX + 4} ${deckY - 4} L${mx - 18} ${top + 10} L${mx - 1} ${top + 2} Z`);
    else {
      const sw = boat.masts.length === 2 ? 12 : 10;
      sails.push(`M${mx - sw} ${deckY - 6} L${mx + sw} ${deckY - 6} L${mx + sw * 0.85} ${deckY - 21} L${mx - sw * 0.85} ${deckY - 21} Z`);
      sails.push(`M${mx - sw * 0.8} ${deckY - 23} L${mx + sw * 0.8} ${deckY - 23} L${mx + sw * 0.65} ${top + 3} L${mx - sw * 0.65} ${top + 3} Z`);
    }
    for (const d of sails) {
      el('path', { d, fill: skin.sail, stroke: tier >= 5 ? gold : 'none', 'stroke-width': tier >= 5 ? 0.9 : 0 });
    }
    if (tier >= 3) {   // coloured bands across the sails
      const y0 = boat.id === 'cutter' ? deckY - 16 : deckY - 15;
      el('rect', { x: mx - (boat.id === 'cutter' ? 16 : 11), y: y0, width: boat.id === 'cutter' ? 15 : 22, height: 2.2, fill: rail, opacity: 0.9 });
      if (boat.id !== 'cutter') el('rect', { x: mx - 9, y: deckY - 32, width: 18, height: 1.8, fill: rail, opacity: 0.9 });
    }
    if (tier >= 4) el('circle', { cx: boat.id === 'cutter' ? mx - 9 : mx, cy: deckY - 11, r: 2.4, fill: tier >= 5 ? gold : rail });
    // yards
    if (boat.id !== 'cutter') for (const y of [deckY - 21, top + 3]) el('line', { x1: mx - 11, y1: y, x2: mx + 11, y2: y, stroke: skin.wood, 'stroke-width': 0.9 });
  }
  // hull: bottom paint, topsides, a stripe, and the rail
  const hullPath = `M${sternX} ${deckY} L${bowX} ${deckY - 3} L${bowX - 9} ${deckY + 11} L${sternX + 8} ${deckY + 12} Z`;
  el('path', { d: hullPath, fill: skin.hull });
  el('path', { d: `M${sternX + 5} ${deckY + 8} L${bowX - 6} ${deckY + 6.5} L${bowX - 9} ${deckY + 11} L${sternX + 8} ${deckY + 12} Z`, fill: tier >= 3 ? '#7a3a22' : 'rgba(0,0,0,0.35)' });
  if (tier >= 2) el('line', { x1: sternX + 2, y1: deckY + 4, x2: bowX - 3, y2: deckY + 1.5, stroke: skin.sail, 'stroke-width': 1.3, opacity: 0.85 });
  el('line', { x1: sternX, y1: deckY, x2: bowX, y2: deckY - 3, stroke: rail, 'stroke-width': 2.2 });
  // gunports on the brig and barque
  if (boat.id !== 'cutter') for (let i = 0; i < (boat.id === 'barque' ? 5 : 3); i++) {
    const gx = sternX + 12 + i * ((bowX - sternX - 24) / Math.max(1, (boat.id === 'barque' ? 4 : 2)));
    el('rect', { x: gx - 1.5, y: deckY + 2.5 - (gx - sternX) * 0.03, width: 3, height: 2.6, fill: '#0c0a08' });
  }
  // stern lantern
  el('circle', { cx: sternX + 4, cy: deckY - 6, r: 2.2, fill: skin.lantern });
  el('circle', { cx: sternX + 4, cy: deckY - 6, r: 5, fill: skin.lantern, opacity: 0.25 });
  if (tier >= 5) for (const [sx, sy] of [[fore - 8, top + 4], [fore + 9, top + 14], [sternX + 16, deckY - 20]]) el('circle', { cx: sx, cy: sy, r: 0.9, fill: '#fff2c0' });
  if (typeof previewFx === 'function') previewFx(svg, skin, null, { sternX, bowX, deckY });
  return svg;
}
function pennantPreview(pen, size) {
  const cnv = document.createElement('canvas');
  const k = 2; cnv.width = size * k; cnv.height = size * 2 / 3 * k;
  cnv.style.width = size + 'px'; cnv.style.height = (size * 2 / 3) + 'px';
  cnv.setAttribute('aria-hidden', 'true');
  const c = cnv.getContext('2d'); c.scale(k, k);
  c.fillStyle = '#5a4a3a'; c.fillRect(size * 0.2, size * 0.1, 2.5, size * 0.55);
  drawPennant(c, size * 0.2 + 2.5, size * 0.22, size * 0.62, pen, 0.6);
  return cnv;
}
function flarePreview(fs, size) {
  const cnv = document.createElement('canvas');
  const k = 2; cnv.width = size * k; cnv.height = size * 2 / 3 * k;
  cnv.style.width = size + 'px'; cnv.style.height = (size * 2 / 3) + 'px';
  cnv.setAttribute('aria-hidden', 'true');
  const c = cnv.getContext('2d'); c.scale(k, k);
  const x = size / 2, y = size * 0.24, col = fs.cycle ? 'hsl(150,100%,62%)' : fs.glow;
  // a smoky trail up from the water, the star, and its glow
  c.strokeStyle = 'rgba(220,220,230,0.25)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(x - 6, size * 0.62); c.quadraticCurveTo(x - 10, size * 0.4, x, y); c.stroke();
  const gr = c.createRadialGradient(x, y, 0, x, y, size * 0.3);
  gr.addColorStop(0, col); gr.addColorStop(0.35, col + (col.startsWith('#') ? '88' : '')); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.beginPath(); c.arc(x, y, size * 0.3, 0, 6.28); c.fill();
  if (fs.glow2) { c.fillStyle = fs.glow2; c.beginPath(); c.arc(x + size * 0.12, y + size * 0.06, 3, 0, 6.28); c.fill(); }
  if (fs.sparks) { c.fillStyle = fs.core; for (let i = 0; i < 7; i++) { const a = i * 0.9, d = size * (0.12 + (i % 3) * 0.05); c.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d + 4, 1.5, 1.5); } }
  c.fillStyle = fs.core; c.beginPath(); c.arc(x, y, 3, 0, 6.28); c.fill();
  c.fillStyle = 'rgba(200,215,235,0.25)'; c.fillRect(size * 0.15, size * 0.62, size * 0.7, 1.5);
  return cnv;
}
function itemCard(skin, cls) {
  const d = document.createElement('div');
  const ra = rarityOf(skin);
  d.className = 'skincard r-' + (ra ? ra.id : 'standard') + (cls ? ' ' + cls : '');
  d.style.setProperty('--rc', ra ? ra.color : '#8f98ab');
  // one to five pips for the grade, so it reads without relying on colour alone
  const level = ra ? RARITIES.indexOf(ra) + 1 : 0;
  if (level) {
    const pips = document.createElement('span'); pips.className = 'pips'; pips.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < level; i++) pips.appendChild(document.createElement('i'));
    d.appendChild(pips);
  }
  d.appendChild(skin.kind === 'pennant' ? pennantPreview(skin, 96) : skin.kind === 'flare' ? flarePreview(skin, 96) : skinPreview(skin, 96));
  const n = document.createElement('b'); n.textContent = skin.name; d.appendChild(n);
  const what = skin.kind === 'pennant' ? 'pennant' : skin.kind === 'flare' ? 'flare' : (BOAT_BY_ID[skin.boat] || BOATS[0]).name;
  const r = document.createElement('small'); r.textContent = (ra ? ra.name : 'Standard') + ' · ' + what; d.appendChild(r);
  return d;
}

function updateCrateButtons() {
  for (const b of document.querySelectorAll('.crateOpenBtn')) b.textContent = 'Crates · ' + totalCrates();
  for (const b of document.querySelectorAll('.crateAllBtn')) { b.hidden = totalCrates() < 2; b.textContent = 'Open all ' + totalCrates(); }
  renderBoatPicks();
}
// a quick boat switcher on the menus, so you can change ship without opening the crates
function renderBoatPicks() {
  const sailing = state === 'play';
  for (const box of document.querySelectorAll('.boatpick')) {
    if (box.childElementCount !== BOATS.length) {
      box.textContent = '';
      for (const b of BOATS) {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'pick'; btn.dataset.boat = b.id;
        const nm = document.createElement('b'); nm.textContent = b.name;
        const st = document.createElement('small'); st.textContent = 'Hull ' + b.hull + ' · ' + (b.id === 'brig' ? 'repairs' : b.jet ? 'scout jet' : b.accel > 1.5 ? 'quick' : b.accel < 1 ? 'slow' : 'steady');
        btn.append(skinPreview(SKIN_BY_ID[CRATES.equipped[b.id]] || SKIN_BY_ID[PLAIN[b.id]], 44), nm, st);
        btn.addEventListener('click', () => chooseBoat(b.id));
        box.appendChild(btn);
      }
    }
    for (const btn of box.children) {
      const on = btn.dataset.boat === CRATES.boat;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.disabled = sailing;
      const b = BOAT_BY_ID[btn.dataset.boat];
      const svg = btn.querySelector('svg'), fresh = skinPreview(SKIN_BY_ID[CRATES.equipped[b.id]] || SKIN_BY_ID[PLAIN[b.id]], 44);
      if (svg) svg.replaceWith(fresh);
    }
  }
}

function showCrates() {
  audioInit();
  $('crateCard').hidden = false;
  renderCrates();
  $('crateCard').scrollTop = 0;
  $('crateClose').focus({ preventScroll: true });
}
function hideCrates() { if (!CRATES.opening) $('crateCard').hidden = true; }

function statBar(label, value, max) {
  const row = document.createElement('div'); row.className = 'stat';
  const l = document.createElement('span'); l.textContent = label;
  const bar = document.createElement('i'); bar.style.setProperty('--v', Math.min(1, value / max).toFixed(2));
  row.append(l, bar);
  return row;
}

function renderCrates() {
  const sailing = state === 'play';
  // the three boats
  const bl = $('boatList'); bl.textContent = '';
  for (const b of BOATS) {
    const card = document.createElement('div');
    card.className = 'boatcard' + (CRATES.boat === b.id ? ' chosen' : '');
    card.appendChild(skinPreview(SKIN_BY_ID[CRATES.equipped[b.id]] || SKIN_BY_ID[PLAIN[b.id]], 110));
    const h = document.createElement('b'); h.textContent = b.name; card.appendChild(h);
    const p = document.createElement('small'); p.textContent = b.blurb; card.appendChild(p);
    card.appendChild(statBar('Hull ' + b.hull, b.hull, 6));
    card.appendChild(statBar('Acceleration', b.accel, 1.7));
    card.appendChild(statBar('Steering', b.turn, 1.4));
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'tool';
    btn.textContent = CRATES.boat === b.id ? 'Sailing this boat' : 'Sail this boat';
    btn.disabled = CRATES.boat === b.id || sailing;
    btn.addEventListener('click', () => chooseBoat(b.id));
    card.appendChild(btn);
    bl.appendChild(card);
  }

  // crate inventory
  const ci = $('crateTypes'); ci.textContent = '';
  for (const c of CRATE_TYPES) {
    const row = document.createElement('div');
    row.className = 'cratetype viewing';
    const box = document.createElement('span'); box.className = 'cratebox'; box.setAttribute('aria-hidden', 'true');
    const nm = document.createElement('b'); nm.textContent = c.name;
    const n = document.createElement('small'); n.textContent = (CRATES.crates[c.id] === 1 ? '1 crate' : CRATES.crates[c.id] + ' crates') + ' · ' + c.holds;
    const open = document.createElement('button'); open.type = 'button'; open.className = CRATES.crates[c.id] > 0 ? 'primary small' : 'tool';
    open.textContent = CRATES.opening ? 'Opening…' : CRATES.crates[c.id] > 0 ? 'Open' : 'None yet';
    open.disabled = CRATES.crates[c.id] <= 0 || CRATES.opening;
    open.addEventListener('click', () => openCrate(c.id));
    const all = document.createElement('button'); all.type = 'button'; all.className = 'tool';
    all.textContent = 'Open all';
    all.hidden = CRATES.crates[c.id] < 2;
    all.disabled = CRATES.opening;
    all.addEventListener('click', () => openAll(c.id));
    row.append(box, nm, n, all, open);
    ci.appendChild(row);
  }
  $('crateClose').disabled = CRATES.opening;

  // odds
  const odds = $('crateOdds'); odds.textContent = '';
  for (const ra of RARITIES) {
    const li = document.createElement('li');
    li.style.setProperty('--rc', ra.color);
    li.textContent = ra.name + ' · ' + (ra.odds * 100).toFixed(ra.odds < 0.01 ? 2 : 1) + '%';
    odds.appendChild(li);
  }

  // what you own, for the crate being viewed
  const view = CRATE_BY_ID[CRATES.view] ? CRATES.view : 'skins';
  const tabs = $('lootTabs'); tabs.textContent = '';
  for (const v of LOOT_VIEWS) {
    const t = document.createElement('button'); t.type = 'button'; t.className = 'tool' + (v.id === view ? ' on' : '');
    t.textContent = v.name; t.setAttribute('aria-pressed', v.id === view ? 'true' : 'false');
    t.addEventListener('click', () => { CRATES.view = v.id; renderCrates(); });
    tabs.appendChild(t);
  }
  $('invHead').textContent = view === 'skins' ? 'Boat skins' : view === 'flags' ? 'Flags' : 'Flare colours';
  const inv = $('crateInv'); inv.textContent = '';
  const addCard = (item, count, isOn, locked) => {
    const card = itemCard(item, (isOn ? 'equipped' : '') + (locked ? ' locked' : ''));
    if (count > 1) { const c = document.createElement('span'); c.className = 'dupes'; c.textContent = '×' + count; card.appendChild(c); }
    if (!locked) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool';
      if (item.kind === 'pennant') b.textContent = isOn ? 'Take down' : 'Fly it';
      else { b.textContent = isOn ? 'Equipped' : 'Equip'; b.disabled = isOn; }
      b.addEventListener('click', () => equip(item));
      card.appendChild(b);
    }
    inv.appendChild(card);
  };
  const sub = text => { const h = document.createElement('span'); h.className = 'invsub'; h.textContent = text; inv.appendChild(h); };
  let owned = 0, total = 0;
  if (view === 'skins') {
    for (const b of BOATS) {
      sub(b.name + (CRATES.boat === b.id ? ' · sailing' : ''));
      for (const s of SKINS.filter(s => s.boat === b.id)) {
        const count = !s.rarity ? 1 : (CRATES.owned[s.id] | 0);
        addCard(s, count, CRATES.equipped[b.id] === s.id, !count);
        total++; if (count) owned++;
      }
    }
  } else if (view === 'flags') {
    for (const p of PENNANTS) { const count = CRATES.owned[p.id] | 0; addCard(p, count, CRATES.pennant === p.id, !count); total++; if (count) owned++; }
  } else {
    for (const f of FLARES) {
      const count = !f.rarity ? 1 : (CRATES.owned[f.id] | 0);
      addCard(f, count, myFlare().id === f.id, !count); total++; if (count) owned++;
    }
  }
  $('crateCollected').textContent = owned + ' of ' + total + ' collected';
}

// the reel: a strip of loot that spins and settles on the prize under the marker
function openCrate(type) {
  if (CRATES.opening || !CRATES.crates[type]) return;
  CRATES.opening = true;
  CRATES.crates[type]--; CRATES.opened = (CRATES.opened | 0) + 1;
  const prize = rollSkin(type);
  CRATES.pending = prize.id;   // kept safe until the reel lands
  saveCrates();
  renderCrates();
  updateCrateButtons();
  $('crateResult').hidden = true;
  spinReel(prize, type, reduceMotion ? 600 : 6000, () => finishOpen(prize));
}

// scroll the reel into view, then spin a strip of loot that settles on `prize` under the marker
function spinReel(prize, type, dur, done) {
  // bring the reel into view by scrolling the sheet up and down only (never sideways)
  requestAnimationFrame(() => {
    const sheet = $('crateCard'), r = $('crateReel').getBoundingClientRect(), sr = sheet.getBoundingClientRect();
    if (sheet.scrollLeft) sheet.scrollLeft = 0;   // (before the smooth scroll: setting it after cancels it)
    if (r.top < sr.top + 70 || r.bottom > sr.bottom - 10) sheet.scrollTo({ top: sheet.scrollTop + r.top - sr.top - sr.height * 0.25, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  const reel = $('crateReel'), strip = $('crateStrip');
  strip.textContent = '';
  const N = 56, WIN = 48;
  for (let i = 0; i < N; i++) strip.appendChild(itemCard(i === WIN ? prize : rollFiller(type), 'reelitem'));
  const cardW = strip.firstChild.getBoundingClientRect().width + 8;   // card plus gap
  const viewW = reel.getBoundingClientRect().width;
  const end = WIN * cardW + cardW / 2 - viewW / 2 + (Math.random() - 0.5) * cardW * 0.7;
  const t0 = performance.now();
  let lastIdx = -1;
  const step = now => {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 4);
    const x = end * e;
    strip.style.transform = 'translateX(' + (-x) + 'px)';
    const idx = Math.floor((x + viewW / 2) / cardW);
    if (idx !== lastIdx) { lastIdx = idx; sfxTick(); }
    if (t < 1) requestAnimationFrame(step);
    else done();
  };
  strip.style.transform = 'translateX(0)';
  requestAnimationFrame(step);
}
// open every crate at once: a quick spin of the reel that lands on your best pull, then the whole haul
function openAll(type) {
  const count = CRATES.crates[type] | 0;
  if (CRATES.opening || count < 1) return;
  const byGrade = {}, fresh = [];
  let best = null;
  for (let i = 0; i < count; i++) {
    const prize = rollSkin(type);
    const had = CRATES.owned[prize.id] | 0;
    CRATES.owned[prize.id] = had + 1;
    if (!had && !fresh.includes(prize)) fresh.push(prize);
    byGrade[prize.rarity] = (byGrade[prize.rarity] || 0) + 1;
    if (!best || RARITIES.findIndex(r => r.id === prize.rarity) > RARITIES.findIndex(r => r.id === best.rarity)) best = prize;
  }
  CRATES.crates[type] = 0; CRATES.opened = (CRATES.opened | 0) + count;
  saveCrates();
  CRATES.opening = true;
  $('crateResult').hidden = true;
  renderCrates();
  updateCrateButtons();
  spinReel(best, type, reduceMotion ? 400 : 2600, () => showHaul(count, byGrade, fresh, best));
}
function showHaul(count, byGrade, fresh, best) {
  CRATES.opening = false;
  const bra = rarityOf(best);
  sfxReveal(RARITIES.indexOf(bra));
  const res = $('crateResult');
  res.textContent = '';
  res.style.setProperty('--rc', bra.color);
  res.className = 'result haul r-' + bra.id;
  const h = document.createElement('p'); h.className = 'won';
  h.textContent = 'Opened ' + count + (count === 1 ? ' crate' : ' crates');
  const sub = document.createElement('small');
  sub.textContent = fresh.length ? fresh.length + (fresh.length === 1 ? ' new item' : ' new items') + ' · best: ' + best.name : 'Nothing new this time · best: ' + best.name;
  const grades = document.createElement('ul'); grades.className = 'odds';
  for (const ra of RARITIES) {
    if (!byGrade[ra.id]) continue;
    const li = document.createElement('li'); li.style.setProperty('--rc', ra.color);
    li.textContent = ra.name + ' \u00d7 ' + byGrade[ra.id];
    grades.appendChild(li);
  }
  res.append(h, sub, grades);
  // the new finds, best first
  if (fresh.length) {
    const order = it => -RARITIES.findIndex(r => r.id === it.rarity);
    const strip = document.createElement('div'); strip.className = 'haulstrip';
    for (const it of fresh.sort((a, b) => order(a) - order(b)).slice(0, 24)) strip.appendChild(itemCard(it, 'reelitem'));
    if (fresh.length > 24) { const more = document.createElement('small'); more.textContent = '+' + (fresh.length - 24) + ' more'; strip.appendChild(more); }
    res.appendChild(strip);
  }
  res.hidden = false;
  CRATES.view = best.kind === 'pennant' ? 'flags' : best.kind === 'flare' ? 'flares' : 'skins';
  renderCrates();
  updateCrateButtons();
  // glide down so the reel and the haul under it are both in view
  requestAnimationFrame(() => {
    const sheet = $('crateCard'), rr = $('crateReel').getBoundingClientRect(), sr = sheet.getBoundingClientRect();
    sheet.scrollTo({ top: sheet.scrollTop + rr.top - sr.top - 70, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

function finishOpen(prize) {
  CRATES.opening = false;
  CRATES.owned[prize.id] = (CRATES.owned[prize.id] | 0) + 1;
  CRATES.pending = null;
  CRATES.view = prize.kind === 'pennant' ? 'flags' : prize.kind === 'flare' ? 'flares' : 'skins';
  saveCrates();
  const ra = rarityOf(prize);
  sfxReveal(RARITIES.indexOf(ra));
  const res = $('crateResult');
  res.textContent = '';
  res.style.setProperty('--rc', ra.color);
  res.className = 'result r-' + ra.id;
  const h = document.createElement('p'); h.className = 'won';
  h.textContent = (CRATES.owned[prize.id] > 1 ? 'Another ' : 'New: ') + prize.name;
  const r = document.createElement('small');
  r.textContent = ra.name + ' grade' + (prize.kind === 'pennant' ? ' · pennant' : prize.kind === 'flare' ? ' · flare colour' : ' · ' + BOAT_BY_ID[prize.boat].name + ' skin');
  const eq = document.createElement('button'); eq.type = 'button'; eq.className = 'primary';
  eq.textContent = (prize.kind === 'pennant' ? 'Fly ' : 'Equip ') + prize.name + (prize.boat ? ' on the ' + BOAT_BY_ID[prize.boat].name : '');
  eq.addEventListener('click', () => { if (prize.kind === 'pennant') CRATES.pennant = null; equip(prize); eq.textContent = prize.kind === 'pennant' ? 'Flying' : 'Equipped'; eq.disabled = true; });
  res.append(h, r, eq);
  res.hidden = false;
  renderCrates();
  updateCrateButtons();
}

let toastTimer = 0;
// a short note; on a phone it's a small tag at the top, out of the way of the buttons
function toast(text, short) {
  const t = $('toast'); if (!t) return;
  const phone = innerWidth <= 520;
  t.textContent = phone && short ? short : text; t.hidden = false;
  // with a card open, keep clear of its buttons: show it at the top instead
  t.classList.toggle('oncard', !!document.querySelector('.overlay:not([hidden])'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, phone ? 2500 : 5000);
}

loadCrates();
setupSaveBox();
loadFromLink();
cloudInit();
for (const b of document.querySelectorAll('.crateOpenBtn')) b.addEventListener('click', showCrates);
// open every crate straight from a menu: shows the crates screen with the haul
for (const b of document.querySelectorAll('.crateAllBtn')) b.addEventListener('click', () => { showCrates(); openAll('skerry'); });
$('crateClose').addEventListener('click', hideCrates);
$('crateCard').addEventListener('keydown', e => { if (e.key === 'Escape') hideCrates(); });
updateCrateButtons();
