// Wreckers' Night: weapon skin crates.
//
// A crate system of its own for the six Wreckers' Night weapons, kept completely apart from the
// boat crates in crates.js: its own save (localStorage 'skerry-wcrates'), its own crate count, its
// own card. It never reads or writes CRATES, voyages or crews. It borrows the boat crates' grades
// and odds (RARITIES), their card styles, and the reel sounds, without changing any of them.
//
// Each weapon has a plain finish everyone owns, and ten skins to find: 3 Deckhand, 2 Bosun, 2 Mate,
// 2 Captain and 1 Admiral. A skin gives the 3D gun its colours:
//   metal (barrels, blade), dark (lock, hammer, sight tube), wood (stock, grip), brass (bands,
//   guard, caps), accent (inlay, wire, rope) and glow (an emissive accent, Captain and Admiral only).
//
// Earning: one crate for every 5 kills (the count carries over between rounds and visits), and one
// for each round you see out on the island, if you were ashore for at least a minute of it.
//
// The global API, for the gun renderer and fps.js:
//   wcEquippedSkin(weaponId) -> the skin equipped on that weapon (its plain finish if none)
//   wcEarn('kill' | 'round') -> counts towards / grants weapon crates, and saves
//   wcRender()               -> refreshes the weapon crate button and card

const WC_KEY = 'skerry-wcrates';
const WC_KILLS_PER_CRATE = 5;
const WC_ROUND_MIN_SECONDS = 60;

const WC_WEAPONS = [
  { id: 'pepperbox',   name: 'Pepperbox' },
  { id: 'blunderbuss', name: 'Blunderbuss' },
  { id: 'longarm',     name: 'Longarm' },
  { id: 'harpoon',     name: 'Harpoon gun' },
  { id: 'cutlass',     name: 'Cutlass' },
  { id: 'avtomat',     name: 'Avtomat' },
];
const WC_WEAPON_BY_ID = Object.fromEntries(WC_WEAPONS.map(w => [w.id, w]));

// [id, name, rarity, metal, dark, wood, brass, accent, glow]
const WC_SKIN_ROWS = {
  pepperbox: [
    ['pb_plain',    'Pepperbox, as cast',      null,       '#5c5e66', '#2c2d33', '#5a3620', '#8a6a2c', '#cfc4a8', null],
    ['pb_gundeck',  'Gun-Deck Black',          'deckhand', '#2a2c31', '#141518', '#3a2416', '#6b5428', '#8a8f98', null],
    ['pb_driftwood','Driftwood Grip',          'deckhand', '#6a6c70', '#34352f', '#8a7d6a', '#7a6a4a', '#ddd3c1', null],
    ['pb_herring',  'Herring Scale',           'deckhand', '#9aa7b0', '#4c565e', '#3e2a1a', '#a8a8a0', '#e7edf1', null],
    ['pb_rime',     'Fjord Rime',              'bosun',    '#a9c8dc', '#3a5468', '#e8f2f8', '#c8dce8', '#ffffff', null],
    ['pb_barrow',   'Barrow Bronze',           'bosun',    '#4f6a52', '#26322a', '#2a2018', '#6f9a6a', '#c8f0a0', null],
    ['pb_ember',    'Ember Isle Ash',          'mate',     '#2a2224', '#120c0d', '#1c1416', '#ff6a2a', '#ffb070', null],
    ['pb_selkie',   'Selkie Pearl',            'mate',     '#2a6a62', '#123430', '#e8f4ee', '#7dffd8', '#bff2e2', null],
    ['pb_lamproom', 'Lamp-Room Brass',         'captain',  '#c99a40', '#4a3418', '#2a1a10', '#ffd68a', '#fff1cf', '#ffcf86'],
    ['pb_drowned',  'The Drowned Bosun',       'captain',  '#5d6d66', '#1e2826', '#3e4b46', '#7f938a', '#c8ffe9', '#9affd8'],
    ['pb_skerry',   'The Skerry Light',        'admiral',  '#f2e6c4', '#3a2a10', '#1a120a', '#ffd34d', '#ffffff', '#fff3c4'],
  ],
  blunderbuss: [
    ['bb_plain',    'Blunderbuss, as forged',  null,       '#7a6a50', '#2e2a26', '#4a2e1a', '#a8823a', '#d8c8a0', null],
    ['bb_tar',      'Tarred Stock',            'deckhand', '#3d3f42', '#151515', '#1d1917', '#6a5a3a', '#8c8579', null],
    ['bb_salt',     'Salt-Crusted',            'deckhand', '#8c8a84', '#4a4844', '#9c927c', '#b8b0a0', '#f1ece0', null],
    ['bb_lobster',  'Lobster Pot',             'deckhand', '#5a4a40', '#2a1a14', '#b9532e', '#a3482a', '#ffb380', null],
    ['bb_lavatube', 'Lava Tube',               'bosun',    '#231c1d', '#0e0a0b', '#3a2a26', '#ff6a2a', '#ffb070', null],
    ['bb_lagoon',   'Lagoon Shell',            'bosun',    '#22b8ac', '#0c4a46', '#e0c890', '#f2fff8', '#3fe0d0', null],
    ['bb_kraken',   'Kraken Ink',              'mate',     '#2d1a4d', '#120a20', '#1c1030', '#7d3fd1', '#c27bff', null],
    ['bb_siren',    "Siren's Horn",            'mate',     '#5a2448', '#24101e', '#3a1838', '#f2d27a', '#ffe0a8', null],
    ['bb_furnace',  'Furnace Mouth',           'captain',  '#3a120a', '#1a0604', '#1c0a06', '#ffb030', '#ff8a30', '#ff7a2a'],
    ['bb_bowchaser',"The Gannet's Bow Chaser", 'captain',  '#f4efe3', '#4a4030', '#7a5620', '#f2d27a', '#ffffff', '#ffe9a8'],
    ['bb_charybdis','Mouth of Charybdis',      'admiral',  '#1a1030', '#08040e', '#2a1d3e', '#ffe07a', '#d8d0f0', '#b8a0ff'],
  ],
  longarm: [
    ['la_plain',    'Longarm, as issued',      null,       '#4c5058', '#22252a', '#5e4126', '#8a6a2c', '#c8bfa8', null],
    ['la_coast',    'Coastguard Grey',         'deckhand', '#5d6772', '#2a2e33', '#4e5660', '#9aa0a8', '#e6eef8', null],
    ['la_peat',     'Peat Stock',              'deckhand', '#3a3a36', '#1a1a16', '#3a2817', '#6a5030', '#c9b08a', null],
    ['la_fog',      'Fog Bank',                'deckhand', '#8796a3', '#4d5862', '#7d8b97', '#b8c4c8', '#e3f0ff', null],
    ['la_middle',   'Middle Watch',            'bosun',    '#1a2547', '#0b0f1c', '#141d38', '#c8d0ff', '#ffffff', null],
    ['la_bone',     'Barrow Bone',             'bosun',    '#6a6e64', '#2a2c28', '#d8d0b8', '#8a8e84', '#c8e0b0', null],
    ['la_aurora',   'Aurora Sight',            'mate',     '#2a5c6b', '#0d1820', '#3a2c6b', '#6effc4', '#b98cff', null],
    ['la_quartz',   'Shoal Quartz',            'mate',     '#5a3aa8', '#160f28', '#4a2a8a', '#8aeaff', '#e0b8ff', null],
    ['la_keeper',   "The Keeper's Glass",      'captain',  '#2a3a5a', '#0e1424', '#6b4a2a', '#ffd34d', '#fff0c0', '#ffe9a8'],
    ['la_between',  'The Door Between',        'captain',  '#cfc8d6', '#3a3442', '#8a7088', '#ffd6a0', '#f8f4fc', '#ffcf9a'],
    ['la_plimsoll', "Plimsoll's Eye",          'admiral',  '#2fb1e8', '#0d2433', '#1b6f96', '#ffffff', '#9ff0ff', '#5fd3ff'],
  ],
  harpoon: [
    ['hp_plain',    'Harpoon gun, as rigged',  null,       '#5a5650', '#26241f', '#5a3d22', '#8a6a2c', '#c9b08a', null],
    ['hp_tar',      "Whaler's Tar",            'deckhand', '#2a2826', '#121110', '#1d1917', '#5e4a2a', '#b9ae96', null],
    ['hp_oak',      'Rope and Oak',            'deckhand', '#4a4a46', '#1e1e1a', '#8a6d3a', '#9c7b40', '#e9dcbc', null],
    ['hp_scrimshaw','Scrimshaw',               'deckhand', '#8a8478', '#3a3630', '#e8e0cc', '#a89878', '#3a3a3a', null],
    ['hp_rivets',   'Copper Rivets',           'bosun',    '#b0612c', '#4a2410', '#3a2416', '#d07a3a', '#ead7bf', null],
    ['hp_kelp',     'Kelp Wrack',              'bosun',    '#3c5e2a', '#142010', '#26401a', '#8aa860', '#d6ff9e', null],
    ['hp_iceberg',  'Iceberg Blue',            'mate',     '#9cc6e0', '#2a4a60', '#e8f6ff', '#bfe6ff', '#ffffff', null],
    ['hp_coral',    'Coral Lagoon',            'mate',     '#ff6f85', '#5a1a26', '#2f8a8a', '#ffd6dc', '#fff0e6', null],
    ['hp_cyclops',  "The Cyclops' Eye",        'captain',  '#4a3628', '#1c140c', '#5a4232', '#ffb040', '#e8d8c0', '#ffc860'],
    ['hp_angler',   'Anglerfish Lure',         'captain',  '#0e1a1c', '#040a0b', '#12302c', '#2a8a7a', '#7affd8', '#7affd8'],
    ['hp_leviathan','Golden Leviathan',        'admiral',  '#e8c040', '#4a3810', '#8a6a1a', '#fff4c8', '#ffe07a', '#fff0a0'],
  ],
  cutlass: [
    ['cl_plain',    'Cutlass, as ground',      null,       '#9aa0a8', '#4a4e54', '#2a1d12', '#3a3c40', '#8a7a5a', null],
    ['cl_boarding', 'Boarding Steel',          'deckhand', '#b8bec6', '#5a6068', '#1a1a1a', '#2c2e32', '#6a6a6a', null],
    ['cl_rope',     'Rope-Bound',              'deckhand', '#a0a4a8', '#50545a', '#c9b08a', '#5a4a30', '#8a6d3a', null],
    ['cl_rust',     'Rust-Pitted',             'deckhand', '#8a5a3a', '#4a2a14', '#2a1a10', '#7d3412', '#c4a283', null],
    ['cl_obsidian', 'Obsidian Edge',           'bosun',    '#4a1e10', '#1a0a06', '#2a1612', '#ffc060', '#ffe090', null],
    ['cl_fjordmoon','Moon on the Fjord',       'bosun',    '#dfeef8', '#7fa9c0', '#1c2830', '#a9d4e8', '#ffffff', null],
    ['cl_candle',   'Corpse Candle',           'mate',     '#b58cff', '#3d1f6b', '#160f20', '#7d3fd1', '#c27bff', null],
    ['cl_gannet',   'Ghost of the Gannet',     'mate',     '#cfe6ee', '#7a9a96', '#2a3438', '#c8fff0', '#eefbff', null],
    ['cl_dusk',     'Dusk at the Door',        'captain',  '#e8dce6', '#5a4a5e', '#221d26', '#ffd6c0', '#9a8098', '#ffcf9a'],
    ['cl_wrecker',  "Wrecker's Lantern",       'captain',  '#2a2a2e', '#0e0e10', '#4a1f18', '#e46c4f', '#86cfae', '#ff6b5a'],
    ['cl_lastlamp', 'The Last Lamp',           'admiral',  '#fff6dc', '#a37a12', '#1a1208', '#ffd34d', '#ffffff', '#fff3c4'],
  ],
  avtomat: [
    ['av_plain',    'Avtomat, as stamped',     null,       '#4a4d54', '#202227', '#6a3e22', '#8a6a2c', '#c8bfa8', null],
    ['av_rigging',  'Rigging Tar',             'deckhand', '#2c2e33', '#121316', '#2a1c12', '#5e4a2a', '#9a9286', null],
    ['av_birch',    'Birch and Pewter',        'deckhand', '#8a8e94', '#3a3c40', '#d8c8a0', '#9a9a94', '#e8e4dc', null],
    ['av_kelp',     'Kelp-Wrapped',            'deckhand', '#3e4a3a', '#1a2218', '#4a5a32', '#7a8a4a', '#b8d088', null],
    ['av_frost',    'Hoarfrost',               'bosun',    '#c4d8e4', '#4a6274', '#eef4f8', '#a8c8dc', '#ffffff', null],
    ['av_signal',   'Signal Red',              'bosun',    '#7a2a22', '#2a0e0c', '#3a1e14', '#d8a040', '#ffd8a0', null],
    ['av_abyss',    'Abyssal Blue',            'mate',     '#1a3a6a', '#0a1428', '#14284a', '#5ab0ff', '#a8e0ff', null],
    ['av_coral',    'Coral Reef',              'mate',     '#d86a5a', '#4a1a18', '#f2e0c8', '#ffb070', '#fff0d8', null],
    ['av_storm',    'Stormglass',              'captain',  '#3a4250', '#12161c', '#2a3240', '#b8f0ff', '#e0f8ff', '#8ae8ff'],
    ['av_bonfire',  "The Wreckers' Bonfire",   'captain',  '#2a1810', '#100804', '#3a1a0a', '#ff9a3a', '#ffd080', '#ff8a3a'],
    ['av_ninth',    'The Ninth Wave',          'admiral',  '#e8f0f4', '#2a3a48', '#1a2630', '#ffe08a', '#ffffff', '#bfe8ff'],
  ],
};
const WC_SKINS = [];
for (const w of WC_WEAPONS) for (const [id, name, rarity, metal, dark, wood, brass, accent, glow] of WC_SKIN_ROWS[w.id])
  WC_SKINS.push(Object.freeze({ id, weapon: w.id, name, rarity, metal, dark, wood, brass, accent, glow }));
const WC_SKIN_BY_ID = Object.fromEntries(WC_SKINS.map(s => [s.id, s]));
const WC_PLAIN = Object.fromEntries(WC_WEAPONS.map(w => [w.id, WC_SKINS.find(s => s.weapon === w.id && !s.rarity).id]));
const wcRarityOf = s => RARITIES.find(r => r.id === s.rarity);
const wcLevel = s => s && s.rarity ? RARITIES.findIndex(r => r.id === s.rarity) + 1 : 0;

const WC = {
  crates: 0, opened: 0, kills: 0, owned: {}, equipped: Object.assign({}, WC_PLAIN),
  pending: null, opening: false, view: 'all', ashore: 0, wasOn: false, opener: null,
};

// ---------- saving ----------
function wcLoad() {
  let fresh = true;
  try {
    const raw = localStorage.getItem(WC_KEY);
    if (raw) {
      fresh = false;
      const d = JSON.parse(raw) || {};
      const n = v => Math.max(0, Math.min(99999, v | 0));
      WC.crates = n(d.crates); WC.opened = n(d.opened); WC.kills = n(d.kills) % WC_KILLS_PER_CRATE;
      WC.owned = {};
      if (d.owned && typeof d.owned === 'object') for (const [id, c] of Object.entries(d.owned)) if (WC_SKIN_BY_ID[id] && WC_SKIN_BY_ID[id].rarity && n(c)) WC.owned[id] = n(c);
      if (d.equipped && typeof d.equipped === 'object') for (const w of WC_WEAPONS) {
        const s = WC_SKIN_BY_ID[d.equipped[w.id]];
        if (s && s.weapon === w.id && (!s.rarity || WC.owned[s.id])) WC.equipped[w.id] = s.id;
      }
      // a crate whose reel was still spinning when the page closed: the prize is still yours
      if (WC_SKIN_BY_ID[d.pending] && WC_SKIN_BY_ID[d.pending].rarity) WC.owned[d.pending] = (WC.owned[d.pending] | 0) + 1;
    }
  } catch (e) {}
  if (fresh) WC.crates = 1;   // a first crate to try
  WC.pending = null;
  wcSave();
}
function wcData() { return { crates: WC.crates, opened: WC.opened, kills: WC.kills, owned: WC.owned, equipped: WC.equipped }; }
function wcSave() {
  try { localStorage.setItem(WC_KEY, JSON.stringify(Object.assign(wcData(), { pending: WC.pending }))); } catch (e) {}
}

// a save code for your weapon skins alone (separate from the boat save code)
function wcSaveCode() {
  const d = wcData();
  const packed = { c: d.crates, n: d.opened, k: d.kills, o: d.owned, e: d.equipped };
  return 'WCRATES-' + btoa(unescape(encodeURIComponent(JSON.stringify(packed)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function wcReadCode(text) {
  const m = String(text || '').match(/WCRATES-([A-Za-z0-9+/_-]+)/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const o = JSON.parse(decodeURIComponent(escape(atob(b64 + '==='.slice((b64.length + 3) % 4)))));
    return o && typeof o === 'object' ? o : null;
  } catch (e) { return null; }
}
// merging never loses anything: every skin either side has, and crates by everything ever earned
function wcMerge(o) {
  let changed = false;
  const n = v => Math.max(0, Math.min(99999, v | 0));
  if (o.o && typeof o.o === 'object') for (const [id, c] of Object.entries(o.o)) {
    if (!WC_SKIN_BY_ID[id] || !WC_SKIN_BY_ID[id].rarity) continue;
    if (n(c) > (WC.owned[id] | 0)) { WC.owned[id] = n(c); changed = true; }
  }
  const earned = Math.max(n(o.c) + n(o.n), WC.crates + WC.opened), opened = Math.max(WC.opened, n(o.n));
  const left = Math.min(99999, Math.max(0, earned - opened));
  if (left !== WC.crates || opened !== WC.opened) { WC.crates = left; WC.opened = opened; changed = true; }
  if (o.e && typeof o.e === 'object') for (const w of WC_WEAPONS) {
    const s = WC_SKIN_BY_ID[o.e[w.id]];
    if (s && s.weapon === w.id && (!s.rarity || WC.owned[s.id]) && WC.equipped[w.id] !== s.id) { WC.equipped[w.id] = s.id; changed = true; }
  }
  return changed;
}

// ---------- the API ----------
function wcEquippedSkin(weaponId) {
  const s = WC_SKIN_BY_ID[WC.equipped[weaponId]];
  if (s && s.weapon === weaponId) return s;
  return WC_SKIN_BY_ID[WC_PLAIN[weaponId]] || WC_SKIN_BY_ID[WC_PLAIN.pepperbox];
}
function wcGrant(n, why) {
  WC.crates = Math.min(99999, WC.crates + n);
  wcSave(); wcRender();
  const short = '+' + n + ' weapon crate' + (n > 1 ? 's' : '');
  if (typeof FPS !== 'undefined' && FPS.on && typeof fpsFeed === 'function') fpsFeed(short + ' (' + why + ')');
  else if (typeof toast === 'function') toast(short + ': ' + why + '. Open it from the Wreckers’ Night card.', short);
}
function wcEarn(reason) {
  if (reason === 'kill') {
    WC.kills++;
    if (WC.kills >= WC_KILLS_PER_CRATE) { WC.kills = 0; wcGrant(1, WC_KILLS_PER_CRATE + ' kills'); }
    else { wcSave(); wcRender(); }
  } else if (reason === 'round') {
    // only for a round you were actually out on the island for (at least a minute of it)
    const ok = WC.ashore >= WC_ROUND_MIN_SECONDS;
    WC.ashore = 0;
    if (ok) wcGrant(1, 'saw the round out');
  }
}
// time ashore this round: counted while Wreckers' Night is on, and reset when you leave the island
setInterval(() => {
  const on = typeof FPS !== 'undefined' && !!FPS.on;
  if (on) WC.ashore++;
  else if (WC.wasOn) WC.ashore = 0;
  WC.wasOn = on;
}, 1000);

// ---------- rolling ----------
function wcRoll() {
  let r = Math.random(), rarity = RARITIES[0];
  for (const ra of RARITIES) { if (r < ra.odds) { rarity = ra; break; } r -= ra.odds; }
  const pool = WC_SKINS.filter(s => s.rarity === rarity.id);
  return pool[(Math.random() * pool.length) | 0];
}
// the cards that scroll past in the reel never include gold, so any gold you see is your prize
function wcFiller() { let s; do { s = wcRoll(); } while (s.rarity === 'admiral'); return s; }

// ---------- pictures of the weapons ----------
let wcSvgN = 0;
function wcPreview(skin, size) {
  const NS = 'http://www.w3.org/2000/svg', uid = 'wc' + (++wcSvgN);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 60'); svg.setAttribute('width', size); svg.setAttribute('height', size / 2);
  svg.setAttribute('aria-hidden', 'true'); svg.classList.add('wcsvg');
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
  const tier = wcLevel(skin), { metal, dark, wood, brass, accent, glow } = skin;
  const line = '#0a0806';
  // a halo behind the finest finishes
  if (glow) {
    const defs = el('defs', {});
    const rg = el('radialGradient', { id: uid + 'g' }, defs);
    el('stop', { offset: '0', 'stop-color': glow, 'stop-opacity': tier >= 5 ? 0.55 : 0.38 }, rg);
    el('stop', { offset: '1', 'stop-color': glow, 'stop-opacity': 0 }, rg);
    el('ellipse', { cx: 62, cy: 31, rx: 58, ry: 24, fill: `url(#${uid}g)` });
  }
  const P = (d, fill, extra) => el('path', Object.assign({ d, fill, stroke: line, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, extra || {}));
  const L = (x1, y1, x2, y2, stroke, w, extra) => el('line', Object.assign({ x1, y1, x2, y2, stroke, 'stroke-width': w, 'stroke-linecap': 'round' }, extra || {}));
  const R = (x, y, w, h, fill, extra) => el('rect', Object.assign({ x, y, width: w, height: h, fill, stroke: line, 'stroke-width': 0.8 }, extra || {}));
  const gem = (x, y) => { if (!glow) return; el('circle', { cx: x, cy: y, r: 4.5, fill: glow, opacity: 0.35 }); el('circle', { cx: x, cy: y, r: 1.8, fill: glow }); };
  const scroll = (x, y) => { if (tier >= 3) el('path', { d: `M${x} ${y} q3 -3 6 0 t6 0`, fill: 'none', stroke: brass, 'stroke-width': 0.8, opacity: 0.9 }); };
  const w = skin.weapon;
  if (w === 'pepperbox') {
    P('M27 30 C19 34 14 44 17 55 L28 55 C27 46 29 38 35 33 Z', wood);              // bird's-head grip
    R(16.5, 52.5, 12, 3, brass, { rx: 1 });                                            // butt cap
    P('M31 34 Q33 45 42 37', 'none', { stroke: brass, 'stroke-width': 1.6 });        // trigger guard
    L(36, 34, 37, 40, dark, 1.4);
    R(26, 22, 16, 13, metal, { rx: 2 });                                               // frame
    P('M30 23 L43 13 L46 15 L35 25 Z', dark);                                          // bar hammer
    R(42, 17, 56, 20, metal, { rx: 4 });                                               // barrel cluster
    for (const y of [21.5, 27, 32.5]) L(44, y, 96, y, dark, 1);
    R(42, 16.5, 4, 21, brass, { rx: 1 });                                              // breech band
    R(95, 16.5, 4, 21, brass, { rx: 1 });                                              // muzzle band
    for (const y of [21, 27, 33]) el('circle', { cx: 101, cy: y, r: 1.5, fill: line });
    if (tier >= 2) L(48, 19, 92, 19, accent, 1, { opacity: 0.9 });
    scroll(60, 35); scroll(28, 31);
    gem(34, 28);
  } else if (w === 'blunderbuss') {
    P('M4 37 C12 33 24 29 34 27 L37 34 L34 40 C26 42 14 48 6 52 Z', wood);           // stock
    R(3, 36, 3, 16, brass, { rx: 1, transform: 'rotate(-18 4 44)' });                  // butt plate
    P('M34 26 L88 24.5 L114 13 L116 41 L88 30.5 L34 33 Z', metal);                    // flaring barrel
    R(34, 32, 52, 4, wood);                                                            // forestock
    R(34, 25, 12, 10, dark, { rx: 1 });                                                // lock plate
    P('M38 25 L44 17 L47 18 L42 26 Z', dark);                                          // cock
    P('M38 35 Q41 43 47 36', 'none', { stroke: brass, 'stroke-width': 1.5 });
    for (const x of [52, 74]) R(x, 24, 3, 9, brass);
    P('M112 13 L116 12 L118 42 L114 41 Z', brass);                                     // muzzle rim
    if (tier >= 2) L(56, 28.5, 86, 27.5, accent, 1);
    scroll(90, 29); scroll(18, 41);
    gem(41, 30);
  } else if (w === 'longarm') {
    P('M2 37 C10 33 18 30 26 29 L30 33 L28 39 C20 40 10 44 3 46 Z', wood);           // stock
    R(28, 30, 54, 5, wood, { rx: 1 });                                                 // forestock
    R(28, 27.5, 90, 3.2, metal);                                                       // long barrel
    R(116, 26.5, 3, 5, brass);
    for (const x of [46, 64, 80]) R(x, 29, 2, 6.5, brass);                             // bands
    R(30, 25, 9, 9, dark, { rx: 1 });                                                  // lock
    P('M33 35 Q35 42 41 36', 'none', { stroke: brass, 'stroke-width': 1.4 });
    L(50, 27.5, 50, 23, dark, 1.4); L(74, 27.5, 74, 23, dark, 1.4);                   // sight mounts
    R(42, 17, 44, 6, dark, { rx: 1.5 });                                               // telescope tube
    R(40, 16, 4, 8, brass, { rx: 1 });                                                 // eyepiece
    R(84, 15, 6, 10, brass, { rx: 1 });                                                // objective
    if (tier >= 2) L(46, 20, 82, 20, accent, 1);
    el('circle', { cx: 90, cy: 20, r: 2, fill: glow || '#9fc8e8', opacity: glow ? 1 : 0.5 });   // a glint on the lens
    scroll(8, 40); scroll(56, 33);
  } else if (w === 'harpoon') {
    P('M4 40 C12 36 20 32 28 31 L31 37 L28 43 C20 45 12 50 6 53 Z', wood);           // stock
    R(28, 25, 52, 14, metal, { rx: 3 });                                               // heavy barrel
    for (const x of [30, 52, 76]) R(x, 24, 3.5, 16, brass, { rx: 1 });
    R(36, 38, 9, 6, dark);                                                             // trigger block
    P('M38 44 Q41 50 46 44', 'none', { stroke: brass, 'stroke-width': 1.4 });
    L(80, 32, 106, 32, dark, 2.4);                                                     // shaft
    P('M104 25 L119 32 L104 39 L107 32 Z', metal);                                     // the head
    P('M104 25 L101 29 M104 39 L101 35', 'none', { stroke: metal, 'stroke-width': 1.4 });
    // the line, coiled at the gun and run out to the shaft
    el('ellipse', { cx: 54, cy: 47, rx: 9, ry: 5, fill: 'none', stroke: accent, 'stroke-width': 1.6 });
    el('ellipse', { cx: 54, cy: 47, rx: 5.5, ry: 3, fill: 'none', stroke: accent, 'stroke-width': 1.2 });
    P('M63 47 Q78 45 84 33', 'none', { stroke: accent, 'stroke-width': 1.2 });
    if (tier >= 2) L(36, 28.5, 74, 28.5, accent, 1);
    scroll(40, 35); scroll(10, 44);
    gem(112, 32);
  } else if (w === 'avtomat') {
    P('M3 34 C10 32 18 31 26 30 L28 36 L26 44 C18 44 10 46 4 48 Z', wood);           // stock
    R(2, 33, 3, 15, brass, { rx: 1 });                                                 // butt plate
    R(56, 27, 30, 8, wood, { rx: 1.5 });                                               // handguard
    R(86, 28.5, 28, 3.5, metal);                                                       // barrel
    R(113, 27, 7, 6.5, dark, { rx: 1 });                                               // muzzle brake
    R(26, 25, 31, 11, metal, { rx: 1.5 });                                             // receiver
    R(26, 23.5, 31, 3, dark);                                                          // its cover
    for (const x of [56, 84]) R(x, 26, 2.5, 10, brass);                                // bands
    R(29, 20.5, 6, 3.5, dark);                                                         // rear sight
    L(109, 28.5, 109, 22.5, dark, 1.4);                                                // front post
    P('M105 23 Q109 18 113 23', 'none', { stroke: dark, 'stroke-width': 1.2 });        // its hood
    P('M44 36 L50 36 L47 49 L41 49 Z', wood);                                          // pistol grip
    P('M37 36 Q40 43 45 37', 'none', { stroke: brass, 'stroke-width': 1.4 });         // trigger guard
    P('M51 36 L59 36 Q61 46 66 53 L58 56 Q53 46 51 36 Z', dark);                      // curved magazine
    L(58.5, 55.5, 66, 53, accent, 2);                                                  // its base plate
    el('circle', { cx: 38, cy: 26.5, r: 1.8, fill: brass, stroke: line, 'stroke-width': 0.6 });   // charging handle
    if (tier >= 2) L(59, 31, 82, 31, accent, 1);
    scroll(68, 33); scroll(12, 42);
    gem(32, 30);
  } else {   // cutlass
    el('circle', { cx: 6, cy: 32, r: 3.4, fill: brass, stroke: line, 'stroke-width': 0.8 });   // pommel
    R(8, 29, 20, 6, wood, { rx: 2 });                                                  // grip
    for (let x = 11; x < 27; x += 3) L(x, 29.4, x + 1.5, 34.6, accent, 0.9);          // wire wrap
    P('M27 20 Q36 20 34 32 Q36 46 26 46 Q12 46 6 37', 'none', { stroke: brass, 'stroke-width': 3, 'stroke-linecap': 'round' });   // basket guard
    R(27, 25, 5, 14, brass, { rx: 1.5 });
    P('M32 28 L94 25 Q110 24 118 15 Q114 32 96 36 L32 36 Z', metal);                   // the blade
    L(36, 30, 92, 28.5, dark, 1.2, { opacity: 0.8 });                                  // fuller
    if (tier >= 2) L(36, 33.5, 90, 33, accent, 0.9, { opacity: 0.9 });
    scroll(48, 31); scroll(70, 30);
    gem(29.5, 32);
  }
  if (tier >= 5) for (const [sx, sy] of [[20, 14], [100, 48], [70, 10], [112, 8]]) {
    el('path', { d: `M${sx} ${sy - 3} L${sx + 0.8} ${sy} L${sx} ${sy + 3} L${sx - 0.8} ${sy} Z M${sx - 3} ${sy} L${sx} ${sy + 0.8} L${sx + 3} ${sy} L${sx} ${sy - 0.8} Z`, fill: '#fff4c8' });
  }
  return svg;
}

function wcCard(skin, cls) {
  const d = document.createElement('div');
  const ra = wcRarityOf(skin);
  d.className = 'skincard wcskin r-' + (ra ? ra.id : 'standard') + (cls ? ' ' + cls : '');
  d.style.setProperty('--rc', ra ? ra.color : '#8f98ab');
  const level = wcLevel(skin);
  if (level) {
    const pips = document.createElement('span'); pips.className = 'pips'; pips.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < level; i++) pips.appendChild(document.createElement('i'));
    d.appendChild(pips);
  }
  d.appendChild(wcPreview(skin, 104));
  const n = document.createElement('b'); n.textContent = skin.name; d.appendChild(n);
  const r = document.createElement('small'); r.textContent = (ra ? ra.name : 'Standard') + ' · ' + WC_WEAPON_BY_ID[skin.weapon].name; d.appendChild(r);
  return d;
}

// ---------- the card ----------
function wcShow(e) {
  try { audioInit(); } catch (err) {}
  WC.opener = e && e.currentTarget || document.activeElement;
  const card = $('wcrateCard');
  card.hidden = false;
  wcRender();
  card.scrollTop = 0;
  $('wcrateClose').focus({ preventScroll: true });
}
function wcHide() {
  if (WC.opening) return;
  const card = $('wcrateCard');
  if (card.hidden) return;
  card.hidden = true;
  const back = WC.opener && document.contains(WC.opener) && WC.opener.offsetParent ? WC.opener : $('wcrateBtn');
  if (back) try { back.focus({ preventScroll: true }); } catch (err) {}
}
function wcEquip(skin) {
  if (skin.rarity && !WC.owned[skin.id]) return;
  WC.equipped[skin.weapon] = skin.id;
  wcSave(); wcRender();
  try { dispatchEvent(new CustomEvent('wcskin', { detail: { weapon: skin.weapon, skin } })); } catch (e) {}
}

function wcRender() {
  for (const b of document.querySelectorAll('.wcrateBtn')) b.textContent = 'Weapon crates · ' + WC.crates;
  const card = $('wcrateCard');
  if (!card || card.hidden) return;

  // the crate row
  const ci = $('wcTypes'); ci.textContent = '';
  const row = document.createElement('div'); row.className = 'cratetype viewing';
  const box = document.createElement('span'); box.className = 'cratebox wcbox'; box.setAttribute('aria-hidden', 'true');
  const nm = document.createElement('b'); nm.textContent = 'Gunsmith’s Crate';
  const n = document.createElement('small'); n.textContent = (WC.crates === 1 ? '1 crate' : WC.crates + ' crates') + ' · a skin for any of the six weapons';
  const open = document.createElement('button'); open.type = 'button'; open.className = WC.crates > 0 ? 'primary small' : 'tool';
  open.textContent = WC.opening ? 'Opening…' : WC.crates > 0 ? 'Open' : 'None yet';
  open.disabled = WC.crates <= 0 || WC.opening;
  open.addEventListener('click', wcOpen);
  const all = document.createElement('button'); all.type = 'button'; all.className = 'tool';
  all.textContent = 'Open all'; all.hidden = WC.crates < 2; all.disabled = WC.opening;
  all.addEventListener('click', wcOpenAll);
  row.append(box, nm, n, all, open);
  ci.appendChild(row);
  $('wcrateClose').disabled = WC.opening;

  // earning progress
  const left = WC_KILLS_PER_CRATE - WC.kills;
  $('wcProgress').textContent = 'Next crate in ' + left + (left === 1 ? ' kill' : ' kills') + ' (' + WC.kills + ' of ' + WC_KILLS_PER_CRATE + '), or see a round out on the island.';
  const bar = $('wcBar'); if (bar) bar.style.setProperty('--v', (WC.kills / WC_KILLS_PER_CRATE).toFixed(2));

  // odds: the same table as the boat crates
  const odds = $('wcOdds'); odds.textContent = '';
  for (const ra of RARITIES) {
    const li = document.createElement('li'); li.style.setProperty('--rc', ra.color);
    li.textContent = ra.name + ' · ' + (ra.odds * 100).toFixed(ra.odds < 0.01 ? 2 : 1) + '%';
    odds.appendChild(li);
  }

  // which weapon to show
  const tabs = $('wcTabs'); tabs.textContent = '';
  for (const v of [{ id: 'all', name: 'All' }].concat(WC_WEAPONS)) {
    const t = document.createElement('button'); t.type = 'button'; t.className = 'tool' + (v.id === WC.view ? ' on' : '');
    t.textContent = v.id === 'harpoon' ? 'Harpoon' : v.name; t.setAttribute('aria-pressed', v.id === WC.view ? 'true' : 'false');
    t.addEventListener('click', () => { WC.view = v.id; wcRender(); const f = $('wcTabs').querySelector('[aria-pressed="true"]'); if (f) f.focus({ preventScroll: true }); });
    tabs.appendChild(t);
  }

  // the collection
  const inv = $('wcInv'); inv.textContent = '';
  let owned = 0, total = 0;
  for (const w of WC_WEAPONS) {
    if (WC.view !== 'all' && WC.view !== w.id) continue;
    const sub = document.createElement('span'); sub.className = 'invsub';
    const mine = WC_SKINS.filter(s => s.weapon === w.id), got = mine.filter(s => !s.rarity || WC.owned[s.id]).length;
    sub.textContent = w.name + ' · ' + got + ' of ' + mine.length;
    inv.appendChild(sub);
    for (const s of mine) {
      const count = !s.rarity ? 1 : (WC.owned[s.id] | 0), isOn = WC.equipped[w.id] === s.id;
      const c = wcCard(s, (isOn ? 'equipped' : '') + (count ? '' : ' locked'));
      if (count > 1) { const dd = document.createElement('span'); dd.className = 'dupes'; dd.textContent = '×' + count; c.appendChild(dd); }
      if (count) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tool';
        b.textContent = isOn ? 'Equipped' : 'Equip'; b.disabled = isOn;
        b.setAttribute('aria-label', (isOn ? 'Equipped: ' : 'Equip ') + s.name + ' on the ' + w.name);
        b.addEventListener('click', () => { wcEquip(s); const f = [...$('wcInv').querySelectorAll('.skincard')].find(k => k.dataset.id === s.id); if (f) { const nb = f.querySelector('button'); if (nb) nb.focus({ preventScroll: true }); } });
        c.appendChild(b);
      } else c.setAttribute('aria-label', s.name + ', not found yet');
      c.dataset.id = s.id;
      inv.appendChild(c);
      total++; if (count) owned++;
    }
  }
  $('wcCollected').textContent = owned + ' of ' + total + ' collected';
  const st = $('wcSaveStatus'); if (st && !st.textContent) st.textContent = 'Weapon skins are saved in this browser, apart from your boat crates. Copy the code to keep them safe or move them to another browser.';
}

// ---------- opening ----------
function wcOpen() {
  if (WC.opening || WC.crates <= 0) return;
  WC.opening = true;
  WC.crates--; WC.opened++;
  const prize = wcRoll();
  WC.pending = prize.id;   // kept safe until the reel lands
  wcSave();
  $('wcResult').hidden = true;
  wcRender();
  wcSpin(prize, reduceMotion ? 600 : 6000, () => wcFinish(prize));
}
function wcSpin(prize, dur, done) {
  requestAnimationFrame(() => {
    const sheet = $('wcrateCard'), r = $('wcReel').getBoundingClientRect(), sr = sheet.getBoundingClientRect();
    if (sheet.scrollLeft) sheet.scrollLeft = 0;
    if (r.top < sr.top + 70 || r.bottom > sr.bottom - 10) sheet.scrollTo({ top: sheet.scrollTop + r.top - sr.top - sr.height * 0.25, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  const reel = $('wcReel'), strip = $('wcStrip');
  strip.textContent = '';
  const N = 56, WIN = 48;
  for (let i = 0; i < N; i++) strip.appendChild(wcCard(i === WIN ? prize : wcFiller(), 'reelitem'));
  const cardW = strip.firstChild.getBoundingClientRect().width + 8;
  const viewW = reel.getBoundingClientRect().width;
  const end = WIN * cardW + cardW / 2 - viewW / 2 + (Math.random() - 0.5) * cardW * 0.7;
  const t0 = performance.now();
  let lastIdx = -1;
  const step = now => {
    const t = Math.min(1, (now - t0) / dur), x = end * (1 - Math.pow(1 - t, 4));
    strip.style.transform = 'translateX(' + (-x) + 'px)';
    const idx = Math.floor((x + viewW / 2) / cardW);
    if (idx !== lastIdx) { lastIdx = idx; try { sfxTick(); } catch (e) {} }
    if (t < 1) requestAnimationFrame(step); else done();
  };
  strip.style.transform = 'translateX(0)';
  requestAnimationFrame(step);
}
function wcFinish(prize) {
  WC.opening = false;
  WC.owned[prize.id] = (WC.owned[prize.id] | 0) + 1;
  WC.pending = null;
  WC.view = WC.view === 'all' ? 'all' : prize.weapon;
  wcSave();
  const ra = wcRarityOf(prize);
  try { sfxReveal(RARITIES.indexOf(ra)); } catch (e) {}
  const res = $('wcResult');
  res.textContent = '';
  res.style.setProperty('--rc', ra.color);
  res.className = 'result r-' + ra.id;
  const h = document.createElement('p'); h.className = 'won';
  h.textContent = (WC.owned[prize.id] > 1 ? 'Another ' : 'New: ') + prize.name;
  const r = document.createElement('small'); r.textContent = ra.name + ' grade · ' + WC_WEAPON_BY_ID[prize.weapon].name + ' skin';
  const on = WC.equipped[prize.weapon] === prize.id;
  const eq = document.createElement('button'); eq.type = 'button'; eq.className = 'primary';
  eq.textContent = on ? 'Equipped' : 'Equip on the ' + WC_WEAPON_BY_ID[prize.weapon].name; eq.disabled = on;
  eq.addEventListener('click', () => { wcEquip(prize); eq.textContent = 'Equipped'; eq.disabled = true; });
  res.append(h, r, eq);
  res.hidden = false;
  wcRender();
  if (!on) eq.focus({ preventScroll: true });
}
function wcOpenAll() {
  const count = WC.crates;
  if (WC.opening || count < 1) return;
  const byGrade = {}, fresh = [];
  let best = null;
  for (let i = 0; i < count; i++) {
    const prize = wcRoll(), had = WC.owned[prize.id] | 0;
    WC.owned[prize.id] = had + 1;
    if (!had && !fresh.includes(prize)) fresh.push(prize);
    byGrade[prize.rarity] = (byGrade[prize.rarity] || 0) + 1;
    if (!best || wcLevel(prize) > wcLevel(best)) best = prize;
  }
  WC.crates = 0; WC.opened += count;
  wcSave();
  WC.opening = true;
  $('wcResult').hidden = true;
  wcRender();
  wcSpin(best, reduceMotion ? 400 : 2600, () => wcHaul(count, byGrade, fresh, best));
}
function wcHaul(count, byGrade, fresh, best) {
  WC.opening = false;
  const bra = wcRarityOf(best);
  try { sfxReveal(RARITIES.indexOf(bra)); } catch (e) {}
  const res = $('wcResult');
  res.textContent = '';
  res.style.setProperty('--rc', bra.color);
  res.className = 'result haul r-' + bra.id;
  const h = document.createElement('p'); h.className = 'won';
  h.textContent = 'Opened ' + count + (count === 1 ? ' crate' : ' crates');
  const sub = document.createElement('small');
  sub.textContent = (fresh.length ? fresh.length + (fresh.length === 1 ? ' new skin' : ' new skins') : 'Nothing new this time') + ' · best: ' + best.name;
  const grades = document.createElement('ul'); grades.className = 'odds';
  for (const ra of RARITIES) {
    if (!byGrade[ra.id]) continue;
    const li = document.createElement('li'); li.style.setProperty('--rc', ra.color);
    li.textContent = ra.name + ' × ' + byGrade[ra.id];
    grades.appendChild(li);
  }
  res.append(h, sub, grades);
  if (fresh.length) {
    const strip = document.createElement('div'); strip.className = 'haulstrip';
    for (const it of fresh.sort((a, b) => wcLevel(b) - wcLevel(a)).slice(0, 24)) strip.appendChild(wcCard(it, 'reelitem'));
    if (fresh.length > 24) { const more = document.createElement('small'); more.textContent = '+' + (fresh.length - 24) + ' more'; strip.appendChild(more); }
    res.appendChild(strip);
  }
  res.hidden = false;
  wcRender();
  requestAnimationFrame(() => {
    const sheet = $('wcrateCard'), rr = $('wcReel').getBoundingClientRect(), sr = sheet.getBoundingClientRect();
    sheet.scrollTo({ top: sheet.scrollTop + rr.top - sr.top - 70, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

// ---------- the save code box ----------
function wcSetupSave() {
  const copy = $('wcSaveCopy'), load = $('wcSaveLoad'), input = $('wcSaveInput'), msg = $('wcSaveMsg');
  if (!copy) return;
  copy.addEventListener('click', async () => {
    const code = wcSaveCode();
    try { await navigator.clipboard.writeText(code); msg.textContent = 'Weapon save code copied. Keep it somewhere safe, and paste it into Load code to bring your skins back.'; return; } catch (e) {}
    input.value = code; input.focus(); input.select();
    msg.textContent = 'Copy the code in the box and keep it somewhere safe.';
  });
  load.addEventListener('click', () => {
    if (WC.opening) return;
    const o = wcReadCode(input.value);
    if (!o) { msg.textContent = 'That doesn’t look like a weapon crate code (WCRATES-...).'; return; }
    const changed = wcMerge(o);
    wcSave(); wcRender();
    msg.textContent = changed ? 'Loaded: everything from that code is now here too.' : 'You already have everything in that code.';
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') load.click(); });
}

wcLoad();
wcSetupSave();
for (const b of document.querySelectorAll('.wcrateBtn')) b.addEventListener('click', wcShow);
$('wcrateClose').addEventListener('click', wcHide);
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const card = $('wcrateCard');
  if (!card || card.hidden) return;
  e.preventDefault(); e.stopPropagation();
  wcHide();
}, true);
wcRender();
