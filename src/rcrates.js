// The Drowned Reach: banner crates, skins for the colour of your land on the map.
//
// A crate system of its own, like the weapon crates (wcrates.js) and kept apart from them and from the boat
// crates: its own save (localStorage 'skerry-rcrates'), count and card, opened from Banner crates on the
// Drowned Reach card. It borrows the boat crates' grades and odds (RARITIES), their card styles and the reel
// sounds, without changing any of them.
//
// Thirty-one banners to find, 10 Deckhand, 7 Bosun, 6 Mate, 5 Captain and 3 Admiral (the common grades between them
// run through the colours of the rainbow), and the plain one: your nation's own colour, which everyone has. The better the grade, the more the banner does on the map:
//   Deckhand  a colour or a simple pattern
//   Bosun     a richer pattern, and a lit edge along your borders
//   Mate      the pattern moves (a running tide, a bloom of phosphor)
//   Captain   it moves, and your borders glow, pulsing
//   Admiral   alive with light: each in its own way (the Keeper's Beam, the Drowned Crown, the Prism), with a soft bloom
//             where its light is brightest, glints of light over the land, and the brightest glow
//
// Earning: one crate for each war you see through (three minutes or more), two more for a win, and one for
// every 400 tiles you take (the count carries over between wars). The first one is free.
//
// The global API, for the map (warview.js) and the war played together (warnet.js):
//   rcEquippedId()      -> the banner equipped ('' for the plain colour)
//   rcSkin(id)          -> a banner by id (null for none or an unknown one)
//   rcPainter(skin)     -> fn(x, y, t, border, out) writing a tile's [r, g, b] into out
//   rcEarn(how)         -> 'war' at a war's end (with {won, t}); tiles are counted on their own

const RC_KEY = 'skerry-rcrates';
const RC_TILES_PER_CRATE = 400;
const RC_WAR_MIN_SECONDS = 180;

// [id, name, rarity, kind, colours, glow]
const RC_ROWS = [
  ['rc_slate',   'Harbour Slate',        'deckhand', 'solid',   ['#5a7590'], null],
  ['rc_sail',    'Sailcloth Stripes',    'deckhand', 'stripes', ['#ddd2b4', '#a4987a'], null],
  ['rc_kelp',    'Kelp Check',           'deckhand', 'check',   ['#4a7a40', '#2c4c2a'], null],
  ['rc_tartan',  'Tartan of the Isles',  'bosun',    'tartan',  ['#2a4a7a', '#8a2a2a', '#e8d8a0'], null],
  ['rc_scale',   'Herring Scale',        'bosun',    'scales',  ['#4aa0b8', '#1a4a62'], null],
  ['rc_tide',    'Running Tide',         'mate',     'tide',    ['#14598a', '#7ad8f0'], null],
  ['rc_phos',    'Phosphor Bloom',       'mate',     'bloom',   ['#0c3a3c', '#62ffd4'], null],
  ['rc_ember',   'Ember Coast',          'captain',  'ember',   ['#3a0c04', '#ff6a1a', '#ffd870'], '#ff7a2a'],
  ['rc_aurora',  'Northern Lights',      'captain',  'aurora',  ['#140a34', '#3affb0', '#b06aff'], '#86ffd8'],
  ['rc_keeper',  'The Keeper’s Beam',    'admiral',  'beam',    ['#8a6410', '#ffd34d', '#fffaf0'], '#fff0b0'],
  // the rainbow, in the common grades: a plain colour or a simple pattern for each, then patterns, then moving ones
  ['rc_lobster', 'Lobster Red',          'deckhand', 'solid',   ['#c43a2c'], null],
  ['rc_marigold','Marigold Stripes',     'deckhand', 'stripes', ['#f39a2c', '#c0661a'], null],
  ['rc_gorse',   'Gorse Yellow',         'deckhand', 'solid',   ['#e8c62a'], null],
  ['rc_seaglass','Sea Glass',            'deckhand', 'solid',   ['#3fae7a'], null],
  ['rc_harbour', 'Harbour Blue Stripes', 'deckhand', 'stripes', ['#3a7ad8', '#1f4a94'], null],
  ['rc_indigo',  'Indigo Night',         'deckhand', 'solid',   ['#3c3aa0'], null],
  ['rc_heather', 'Heather Check',        'deckhand', 'check',   ['#9a5ccc', '#64368e'], null],
  ['rc_rose',    'Rose Tartan',          'bosun',    'tartan',  ['#a82a3a', '#f08aa0', '#ffe6c8'], null],
  ['rc_saffron', 'Saffron Scale',        'bosun',    'scales',  ['#ffb02a', '#b0500e'], null],
  ['rc_lemon',   'Lemon Lattice',        'bosun',    'tartan',  ['#d8b818', '#fff07a', '#6a5a10'], null],
  ['rc_fern',    'Fern Scale',           'bosun',    'scales',  ['#6ad050', '#1e5a24'], null],
  ['rc_violet',  'Violet Tartan',        'bosun',    'tartan',  ['#5a2a8a', '#c08aff', '#f0e0ff'], null],
  ['rc_crimson', 'Crimson Tide',         'mate',     'tide',    ['#7a0e18', '#ff5a5a'], null],
  ['rc_sunrise', 'Sunrise Tide',         'mate',     'tide',    ['#e0601a', '#ffe070'], null],
  ['rc_spring',  'Spring Bloom',         'mate',     'bloom',   ['#2a5a1a', '#d8ff6a'], null],
  ['rc_amethyst','Amethyst Bloom',       'mate',     'bloom',   ['#2a0e4a', '#d08aff'], null],
  // rarer
  ['rc_ink',     'Kraken Ink',           'captain',  'ink',     ['#12061e', '#4a1a7a', '#e0a0ff'], '#b66aff'],
  ['rc_frost',   'Frost Fire',           'captain',  'ember',   ['#0a1a3a', '#3aa0ff', '#e8fbff'], '#8ad8ff'],
  ['rc_squall',  'Rainbow Squall',       'captain',  'rainbow', ['#30303a', '#e0e0e0', '#ffffff'], '#ffffff'],
  ['rc_crown',   'The Drowned Crown',    'admiral',  'ripples', ['#062a2a', '#1aa08a', '#c8fff0'], '#7affe0'],
  ['rc_prism',   'Prism of the Light',   'admiral',  'prism',   ['#202030', '#ffffff', '#ffffff'], '#ffffff'],
  // [pirate tokens] src/zmegg.js: only ever unlocked with the Lighthouse's pirate tokens, never in a crate
  ['rc_hoard',   'The Gannet’s Hoard',   'pirate',   'hoard',   ['#06070b', '#14302c', '#ffd34d'], '#3ee0b4'],
];
const RC_BASE = { rainbow: '#e0a040', prism: '#d8c8ff' };
const RC_SKINS = RC_ROWS.map(([id, name, rarity, kind, cols, glow]) => Object.freeze({ id, name, rarity, kind, cols, glow, base: RC_BASE[kind] || cols[cols.length > 2 ? 1 : 0] }));
const RC_PLAIN = Object.freeze({ id: '', name: 'Your nation’s colour', rarity: null, kind: 'plain', cols: ['#c8b890'], glow: null, base: null });
const RC_SKIN_BY_ID = Object.fromEntries(RC_SKINS.map(s => [s.id, s]));
const rcRarityOf = s => RARITIES.find(r => r.id === s.rarity) || (s.rarity === 'pirate' ? RARITY_PIRATE : undefined);   // [pirate tokens]
const rcLevel = s => s && s.rarity ? (s.rarity === 'pirate' ? 5 : RARITIES.findIndex(r => r.id === s.rarity) + 1) : 0;
const rcSkin = id => (typeof id === 'string' && RC_SKIN_BY_ID[id]) || null;

const RC = { crates: 0, opened: 0, tiles: 0, owned: {}, equipped: '', pending: null, opening: false, opener: null, lastTaken: null };

// ---------- painting a tile ----------
const rcHex = h => { const v = parseInt(String(h).slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
// a colour round the wheel: h in 0..1, s and v 0..1, into out
function rcHsv(h, sat, v, o) {
  h = ((h % 1) + 1) % 1; const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - sat), q = v * (1 - f * sat), t = v * (1 - (1 - f) * sat);
  // (a switch, not a table, so nothing is made per tile)
  let r, g, b; switch (i % 6) { case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break; case 2: r = p; g = v; b = t; break; case 3: r = p; g = q; b = v; break; case 4: r = t; g = p; b = v; break; default: r = v; g = p; b = q; }
  o[0] = r * 255; o[1] = g * 255; o[2] = b * 255;
}
const RC_BONE = [232, 224, 200];   // [pirate tokens]
const rcHash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1024 / 1024;
// the Drowned Crown's crown, 7 wide and 5 high (bit u of row v), and its drowned gold
const RC_CROWN = [0b1001001, 0b1101011, 0b1111111, 0b1111111, 0b0111110], RC_CROWN_C = [236, 230, 140];
function rcPainter(skin) {
  if (!skin) return null;
  const C = skin.cols.map(rcHex), [a, b, c] = [C[0], C[1] || C[0], C[2] || C[1] || C[0]];
  const mix = (p, q, k, o) => { o[0] = p[0] + (q[0] - p[0]) * k; o[1] = p[1] + (q[1] - p[1]) * k; o[2] = p[2] + (q[2] - p[2]) * k; };
  const tmp = [0, 0, 0];
  const edge = (o, k) => { o[0] += (255 - o[0]) * k; o[1] += (255 - o[1]) * k; o[2] += (255 - o[2]) * k; };
  const G = skin.glow ? rcHex(skin.glow) : null;
  let f;
  switch (skin.kind) {
    case 'solid': f = (x, y, t, bd, o) => { const n = (rcHash(x, y) - 0.5) * 16; o[0] = a[0] + n; o[1] = a[1] + n; o[2] = a[2] + n; }; break;
    case 'stripes': f = (x, y, t, bd, o) => { const p = Math.floor((x + y) / 3) & 1 ? a : b; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }; break;
    case 'check': f = (x, y, t, bd, o) => { const p = ((x >> 1) + (y >> 1)) & 1 ? a : b; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }; break;
    case 'tartan': f = (x, y, t, bd, o) => {
      o[0] = a[0]; o[1] = a[1]; o[2] = a[2];
      if (x % 7 < 2) mix(o, b, 0.55, o); if (y % 7 < 2) mix(o, b, 0.55, o);
      if (x % 7 === 4 || y % 7 === 4) mix(o, c, 0.5, o);
      if (bd) edge(o, 0.35);
    }; break;
    case 'scales': f = (x, y, t, bd, o) => {
      const row = Math.floor(y / 3), u = (x + (row & 1) * 2) % 4, v = y % 3, k = v / 3 + Math.abs(u - 1.5) * 0.12;
      mix(a, b, Math.min(1, k), o);
      if (bd) edge(o, 0.35);
    }; break;
    case 'tide': f = (x, y, t, bd, o) => {
      const s = Math.sin(x * 0.35 + y * 0.2 - t * 1.6), k = Math.round((s + 1) * 2) / 4;
      mix(a, b, k, o); if (bd) edge(o, 0.3);
    }; break;
    case 'bloom': f = (x, y, t, bd, o) => {
      const h = rcHash(x, y), s = Math.max(0, Math.sin(t * 1.8 + h * 25)), k = s * s * s * s;
      mix(a, b, 0.15 + k * 0.85, o); if (bd) edge(o, 0.3);
    }; break;
    case 'ember': f = (x, y, t, bd, o) => {
      const h = rcHash(x, y), n = Math.sin(x * 0.9 + t * 3 + h * 6) * Math.sin(y * 0.7 - t * 2.3) * 0.5 + 0.5, heat = Math.min(1, n * 0.85 + h * 0.25 + (bd ? 0.3 : 0));
      if (heat < 0.5) mix(a, b, heat * 2, o); else mix(b, c, (heat - 0.5) * 2, o);
    }; break;
    case 'aurora': f = (x, y, t, bd, o) => {
      const k = Math.sin(x * 0.12 + t * 0.6 + Math.sin(y * 0.15 + t * 0.4) * 2) * 0.5 + 0.5, lit = Math.sin(y * 0.3 - t * 1.2 + x * 0.05) * 0.5 + 0.5;
      mix(b, c, k, tmp); mix(a, tmp, 0.35 + lit * 0.65, o); if (bd) mix(o, G, 0.6, o);
    }; break;
    case 'beam': f = (x, y, t, bd, o) => {
      // gold, rippling with light like beaten leaf
      const sh = Math.sin((x + y) * 0.15 + t * 0.5) * 0.6 + Math.sin(x * 0.31 - y * 0.23 - t * 1.3) * 0.4;
      mix(a, b, 0.42 + 0.3 * sh, o);
      // the Light's beam sweeping across your land: a white-hot core, a soft wide bloom, and a fainter beam crossing it
      const p = ((x * 0.8 + y * 0.6 - t * 12) % 48 + 48) % 48, d = Math.abs(p - 24);
      let lit = 0;
      if (d < 11) { const k = 1 - d / 11; lit = k * k; mix(o, b, k * 0.7, o); if (d < 3) mix(o, c, (1 - d / 3) * 0.95, o); }
      const p2 = ((x * 0.55 - y * 0.85 - t * 9) % 95 + 95) % 95, d2 = Math.abs(p2 - 47);
      if (d2 < 7) { const k = (1 - d2 / 7) * 0.45; mix(o, c, k, o); lit = Math.max(lit, k * 0.6); }
      o[3] = lit > 0.3 ? lit : 0;
      // sparkles: motes catching the light, thickest where the beam is
      const h = rcHash(x, y), tw = Math.sin(t * 5 + h * 200);
      if (h > 0.985 - lit * 0.05 && tw > 0.55) { mix(o, c, 0.95, o); o[4] = (tw - 0.55) * 2.2 * (0.4 + lit); o[5] = h > 0.993 ? 1 : 0; }
      if (bd) mix(o, G, 0.75 + 0.25 * Math.sin((x - y) * 0.4 - t * 4), o);
    }; f.glints = ['#fff0b0', '#ffffff']; break;
    case 'ink': f = (x, y, t, bd, o) => {
      // ink clouds curling through the water
      const n = Math.sin(x * 0.2 + Math.sin(y * 0.17 + t * 0.7) * 2 + t * 0.3) * Math.sin(y * 0.21 - t * 0.5 + Math.sin(x * 0.13 + t * 0.2) * 2);
      mix(a, b, n * 0.5 + 0.5, o); if (n > 0.75) mix(o, c, (n - 0.75) * 3, o); if (bd) mix(o, G, 0.6, o);
    }; break;
    case 'rainbow': f = (x, y, t, bd, o) => {
      // the colours of the rainbow running across your land in a squall
      rcHsv(x * 0.035 + y * 0.018 - t * 0.12 + Math.sin(y * 0.1 + t) * 0.05, 0.7, 0.95, o);
      const rain = rcHash(x, y + Math.floor(t * 8)); if (rain > 0.96) mix(o, c, 0.6, o);
      if (bd) mix(o, G, 0.55, o);
    }; break;
    case 'ripples': f = (x, y, t, bd, o) => {
      // the deep, with the light coming down through it in a net of caustics
      const ca = Math.sin(x * 0.42 + y * 0.17 + t * 0.7) + Math.sin(y * 0.38 - x * 0.13 - t * 0.5);
      mix(a, b, 0.3 + 0.22 * Math.sin(x * 0.08 + y * 0.06 + t * 0.4) + Math.max(0, ca - 0.9) * 0.35, o);
      // rings of water-light rising from drowned things below, spreading and fading
      const S = 13, cx = Math.floor(x / S), cy = Math.floor(y / S), h = rcHash(cx, cy), h2 = rcHash(cy, cx);
      const lx = x - cx * S - 6.5 - (h - 0.5) * 4, ly = y - cy * S - 6.5 - (h2 - 0.5) * 4, r = Math.sqrt(lx * lx + ly * ly);
      const ring = Math.sin(r * 0.9 - t * 3 - h * 6), fade = Math.max(0, 1 - r / 11);
      let lit = 0;
      if (ring > 0.35) { lit = (ring - 0.35) * 1.6 * fade; mix(o, c, Math.min(1, lit * 1.3), o); }
      // and in some of them the Crown itself, glowing gold-green under the water
      if (h > 0.55) {
        const u = Math.floor(lx + 3.5) | 0, v = Math.floor(ly + 2.5) | 0;
        if (u >= 0 && u < 7 && v >= 0 && v < 5 && (RC_CROWN[v] >> u) & 1) { const pulse = 0.6 + 0.4 * Math.sin(t * 2 + h * 9); mix(o, RC_CROWN_C, 0.55 + 0.4 * pulse, o); lit = Math.max(lit, 0.7 * pulse); if (v === 0 && Math.sin(t * 3 + u + h * 20) > 0.8) { o[4] = 0.8; o[5] = 1; } }
        else if (r < 5) lit = Math.max(lit, (1 - r / 5) * 0.35 * (0.6 + 0.4 * Math.sin(t * 2 + h * 9)));
      }
      o[3] = Math.min(1, lit);
      // bubbles drifting up through it, winking as they go
      const by = Math.floor(y + t * 2.4 + rcHash(x, 7) * 50), bub = rcHash(x + ((by >> 2) & 1), by);
      if (bub > 0.975) { mix(o, c, 0.9, o); if (bub > 0.993) { o[4] = 0.7; o[5] = 0; } }
      if (bd) mix(o, G, 0.7 + 0.3 * Math.sin((x + y) * 0.3 - t * 2.5), o);
    }; f.glints = ['#c8fff0', '#fff0a0']; break;
    case 'prism': f = (x, y, t, bd, o) => {
      // cut glass: facets, each turning through the spectrum a little apart from its neighbours and flashing
      const F = 6, fx = Math.floor(x / F), fy = Math.floor(y / F), fh = rcHash(fx * 2 + ((x % F) > (y % F) ? 1 : 0), fy);
      const fl = Math.sin(t * 2.2 + fh * 20);
      rcHsv((x - y) * 0.022 + t * 0.08 + fh * 0.12, 0.6, 0.55 + 0.25 * fl, o);
      // the Light's beam sweeping through it, white at its heart, split into a fan of colour either side
      const p = ((x * 0.6 + y * 0.8 - t * 16) % 80 + 80) % 80, d = p - 40, ad = Math.abs(d);
      let lit = fl > 0.92 ? (fl - 0.92) * 5 : 0;
      if (ad < 22) {
        if (ad < 6) { lit = 1 - ad / 6; mix(o, c, 0.55 + lit * 0.45, o); }
        else { const k = 1 - (ad - 6) / 16; rcHsv((ad - 6) / 16 * 0.8, 0.9, 1, tmp); mix(o, tmp, 0.45 + k * 0.5, o); lit = Math.max(lit, k * k * 0.7); }
      }
      o[3] = lit;
      const h = rcHash(x, y), tw = Math.sin(t * 6 + h * 300);
      if (h > 0.975 && tw > 0.5) { mix(o, c, 0.95, o); o[4] = (tw - 0.5) * 2; o[5] = (h * 4000 | 0) % 7; }
      if (bd) { rcHsv((x + y) * 0.03 - t * 0.3, 0.35, 1, tmp); mix(o, tmp, 0.75, o); }
    }; f.glints = ['#ffffff', '#ff6a6a', '#ffc25a', '#fff36a', '#6aff8a', '#6ac8ff', '#c07aff']; break;
    case 'hoard': f = (x, y, t, bd, o) => {
      // [pirate tokens] the Gannet's hoard: black water, gold coins winking in it, the black flag's bone-white saltire
      mix(a, b, 0.3 + 0.25 * Math.sin(x * 0.11 - y * 0.07 + t * 0.5), o);
      const S = 7, cx = Math.floor(x / S), cy = Math.floor(y / S), h = rcHash(cx, cy), dx = x - cx * S - 3, dy = y - cy * S - 3, r2 = dx * dx + dy * dy;
      if (h > 0.4 && r2 <= 5) { const wink = Math.max(0, Math.sin(t * 1.4 + h * 40)); mix(o, c, 0.6 + 0.4 * wink, o); if (r2 <= 1 && wink > 0.92) { o[0] = o[1] = o[2] = 255; } }
      const u = ((x + y) % 23 + 23) % 23, v = ((x - y) % 23 + 23) % 23;
      if (u < 1 || v < 1) mix(o, RC_BONE, 0.4, o);
      if (bd) mix(o, G, 0.7, o);
    }; break;
    default: f = (x, y, t, bd, o) => { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; };
  }
  f.glow = G; f.lit = !!f.glints; f.level = rcLevel(skin); f.moves = skin.rarity === 'mate' || skin.rarity === 'captain' || skin.rarity === 'admiral' || skin.rarity === 'pirate';
  return f;
}
// a glint for the Admiral banners: a soft dot of light with a four-pointed star through it, one small sprite per colour
const RC_GLINTS = new Map();
function rcGlint(col) {
  let s = RC_GLINTS.get(col);
  if (!s) {
    s = document.createElement('canvas'); s.width = s.height = 32;
    const q = s.getContext('2d'), gr = q.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, col + 'ff'); gr.addColorStop(0.2, col + '80'); gr.addColorStop(1, col + '00');
    q.fillStyle = gr; q.fillRect(0, 0, 32, 32);
    q.fillStyle = '#ffffff'; q.beginPath(); q.moveTo(0, 16); q.lineTo(16, 14.6); q.lineTo(32, 16); q.lineTo(16, 17.4); q.closePath(); q.moveTo(16, 0); q.lineTo(17.4, 16); q.lineTo(16, 32); q.lineTo(14.6, 16); q.closePath(); q.fill();
    RC_GLINTS.set(col, s);
  }
  return s;
}
// how strongly a banner's border glows just now (0 for none)
function rcGlowAt(skin, t) {
  if (!skin || !skin.glow) return 0;
  return skin.rarity === 'admiral' || skin.rarity === 'pirate' ? 0.75 + 0.25 * Math.sin(t * 2.4) : 0.5 + 0.2 * Math.sin(t * 1.8);
}

// ---------- saving ----------
function rcLoad() {
  let fresh = true;
  try {
    const raw = localStorage.getItem(RC_KEY);
    if (raw) {
      fresh = false;
      const d = JSON.parse(raw) || {}, n = v => Math.max(0, Math.min(99999, v | 0));
      RC.crates = n(d.crates); RC.opened = n(d.opened); RC.tiles = n(d.tiles) % RC_TILES_PER_CRATE;
      RC.owned = {}; if (d.owned && typeof d.owned === 'object') for (const [id, c] of Object.entries(d.owned)) if (RC_SKIN_BY_ID[id] && n(c)) RC.owned[id] = n(c);
      if (RC_SKIN_BY_ID[d.pending]) RC.owned[d.pending] = (RC.owned[d.pending] | 0) + 1;   // a reel still spinning when the page closed
      RC.equipped = RC_SKIN_BY_ID[d.equipped] && RC.owned[d.equipped] ? d.equipped : '';
    }
  } catch (e) {}
  if (fresh) RC.crates = 1;
  RC.pending = null;
  rcSave();
}
function rcSave() { try { localStorage.setItem(RC_KEY, JSON.stringify({ crates: RC.crates, opened: RC.opened, tiles: RC.tiles, owned: RC.owned, equipped: RC.equipped, pending: RC.pending })); } catch (e) {} }
// for the one save that carries everything (src/crates.js saveData / mergeSave), as for the outfits (ocMerge)
function rcData() { return { crates: RC.crates, opened: RC.opened, owned: RC.owned, equipped: RC.equipped }; }
function rcMerge(d, takeLooks) {
  if (!d || typeof d !== 'object') return false;
  let changed = false;
  const n = v => Math.max(0, Math.min(99999, v | 0));
  if (d.owned && typeof d.owned === 'object') for (const [id, c] of Object.entries(d.owned)) if (RC_SKIN_BY_ID[id] && n(c) > (RC.owned[id] | 0)) { RC.owned[id] = n(c); changed = true; }
  const earned = Math.max(n(d.crates) + n(d.opened), RC.crates + RC.opened), opened = Math.max(RC.opened, n(d.opened)), left = Math.min(99999, Math.max(0, earned - opened));
  if (left !== RC.crates || opened !== RC.opened) { RC.crates = left; RC.opened = opened; changed = true; }
  if (takeLooks && RC_SKIN_BY_ID[d.equipped] && RC.owned[d.equipped] && RC.equipped !== d.equipped) { RC.equipped = d.equipped; changed = true; }
  if (changed) rcSave();
  return changed;
}
function rcEquippedId() { return RC.equipped && RC.owned[RC.equipped] ? RC.equipped : ''; }

// ---------- earning ----------
function rcGrant(n, why) {
  RC.crates = Math.min(99999, RC.crates + n); rcSave(); rcRender();
  const short = '+' + n + ' banner crate' + (n > 1 ? 's' : '');
  if (typeof WAR !== 'undefined' && WAR.on && typeof warLog === 'function') warLog(`${short} (${why}).`, 'good', WAR.me);
  else if (typeof toast === 'function') toast(short + ': ' + why + '. Open it from the Drowned Reach card.', short);
}
function rcEarn(how, o) {
  if (how !== 'war' || !o) return;
  if ((o.t || 0) < RC_WAR_MIN_SECONDS) return;
  rcGrant(o.won ? 3 : 1, o.won ? 'a war won' : 'a war seen through');
}
// land taken: counted while a war is on
setInterval(() => {
  if (typeof WAR === 'undefined' || !WAR.on || WAR.phase !== 'play' || !WAR.nations || !WAR.nations[WAR.me]) { RC.lastTaken = null; return; }
  const taken = WAR.nations[WAR.me].taken | 0;
  if (RC.lastTaken == null || taken < RC.lastTaken) { RC.lastTaken = taken; return; }
  const add = taken - RC.lastTaken; RC.lastTaken = taken; if (add <= 0) return;
  RC.tiles += add;
  let got = 0; while (RC.tiles >= RC_TILES_PER_CRATE) { RC.tiles -= RC_TILES_PER_CRATE; got++; }
  if (got) rcGrant(got, RC_TILES_PER_CRATE + ' tiles taken'); else rcSave();
}, 1000);

// ---------- rolling ----------
function rcRoll() {
  let r = Math.random(), rarity = RARITIES[0];
  for (const ra of RARITIES) { if (r < ra.odds) { rarity = ra; break; } r -= ra.odds; }
  const pool = RC_SKINS.filter(s => s.rarity === rarity.id);
  return pool[(Math.random() * pool.length) | 0];
}
// a banner for a bot nation, from a seeded rng (so everyone in a war played together gives each bot the same):
// a little under half fly one, rolled at the crate's own odds; or an Admiral's
function rcRollWith(rng, admiral) {
  let rarity = RARITIES[RARITIES.length - 1];
  if (!admiral) { let r = rng(); rarity = RARITIES[0]; for (const ra of RARITIES) { if (r < ra.odds) { rarity = ra; break; } r -= ra.odds; } }
  const pool = RC_SKINS.filter(s => s.rarity === rarity.id);
  return pool[(rng() * pool.length) | 0];
}
// the cards that scroll past in the reel never include gold, so any gold you see is your prize
function rcFiller() { let s; do { s = rcRoll(); } while (s.rarity === 'admiral'); return s; }

// ---------- pictures: a little island in the banner, alive for the grades that move ----------
const RC_PW = 52, RC_PH = 30;
const RC_MASK = (() => {
  const m = new Uint8Array(RC_PW * RC_PH), rng = seeded(1887);
  const blobs = [[16, 15, 11], [30, 13, 12], [41, 18, 8], [24, 21, 7]];
  for (let y = 0; y < RC_PH; y++) for (let x = 0; x < RC_PW; x++) {
    let v = 0; for (const [bx, by, r] of blobs) { const d = Math.hypot(x - bx, (y - by) * 1.2) / r; v = Math.max(v, 1 - d * d); }
    v += (rng() - 0.5) * 0.25;
    m[y * RC_PW + x] = v > 0.18 ? 1 : 0;
  }
  return m;
})();
function rcDrawPreview(cv, skin, t) {
  const g = cv.getContext('2d'), off = cv._off || (cv._off = document.createElement('canvas'));
  off.width = RC_PW; off.height = RC_PH;
  const og = off.getContext('2d'), img = og.createImageData(RC_PW, RC_PH), d = img.data, out = [0, 0, 0, 0, 0, 0];
  const paint = rcPainter(skin), plain = [200, 184, 144], lit = paint && paint.lit, glints = [];
  // the Admiral banners' bloom, kept at half size so it comes out soft when drawn up
  const bl = lit ? cv._bl || (cv._bl = document.createElement('canvas')) : null, BW = RC_PW >> 1, BH = RC_PH >> 1;
  let bimg = null; if (bl) { bl.width = BW; bl.height = BH; bimg = bl.getContext('2d').createImageData(BW, BH); }
  for (let y = 0; y < RC_PH; y++) for (let x = 0; x < RC_PW; x++) {
    const i = y * RC_PW + x, k = i * 4; if (!RC_MASK[i]) { d[k + 3] = 0; continue; }
    const bd = x === 0 || y === 0 || x === RC_PW - 1 || y === RC_PH - 1 || !RC_MASK[i - 1] || !RC_MASK[i + 1] || !RC_MASK[i - RC_PW] || !RC_MASK[i + RC_PW];
    out[3] = out[4] = 0;
    if (paint) paint(x, y, t, bd, out); else { out[0] = plain[0]; out[1] = plain[1]; out[2] = plain[2]; if (bd) { out[0] = 240; out[1] = 228; out[2] = 196; } }
    d[k] = out[0]; d[k + 1] = out[1]; d[k + 2] = out[2]; d[k + 3] = 255;
    if (bimg && out[3] > 0) { const q = ((y >> 1) * BW + (x >> 1)) * 4, bd2 = bimg.data, al = out[3] * 220; if (al > bd2[q + 3]) { bd2[q] = out[0]; bd2[q + 1] = out[1]; bd2[q + 2] = out[2]; bd2[q + 3] = al; } }
    if (lit && out[4] > 0 && glints.length < 60) glints.push(x, y, out[4], out[5] | 0);
  }
  og.putImageData(img, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  // the sea behind
  g.fillStyle = '#12233a'; g.fillRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = false;
  const glow = rcGlowAt(skin, t);
  if (glow) { g.save(); g.shadowColor = skin.glow; g.shadowBlur = 6 + glow * 10; g.globalAlpha = 0.5 + glow * 0.5; g.drawImage(off, 0, 0, cv.width, cv.height); g.restore(); }
  g.drawImage(off, 0, 0, cv.width, cv.height);
  if (bl) {
    // light over the top: the bloom, soft, and the glints
    bl.getContext('2d').putImageData(bimg, 0, 0);
    const sx = cv.width / RC_PW, sy = cv.height / RC_PH;
    g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
    g.globalAlpha = 0.32; g.drawImage(bl, -sx, -sy, cv.width + 2 * sx, cv.height + 2 * sy);
    g.globalAlpha = 0.22; g.drawImage(bl, -4 * sx, -4 * sy, cv.width + 8 * sx, cv.height + 8 * sy);
    for (let j = 0; j < glints.length; j += 4) { const R = sx * (2 + 3 * Math.min(1, glints[j + 2])); g.globalAlpha = Math.min(1, glints[j + 2] + 0.2); g.drawImage(rcGlint(paint.glints[glints[j + 3]] || '#ffffff'), (glints[j] + 0.5) * sx - R, (glints[j + 1] + 0.5) * sy - R, R * 2, R * 2); }
    g.restore();
  }
}
function rcPreview(skin, w) {
  const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = Math.round(w * 2 * RC_PH / RC_PW);
  cv.style.width = w + 'px'; cv.style.height = Math.round(w * RC_PH / RC_PW) + 'px'; cv.className = 'rcprev';
  cv._skin = skin; rcDrawPreview(cv, skin, 0);
  return cv;
}
// the moving banners move on their cards too, while the card is open (a few times a second is plenty)
setInterval(() => {
  const card = $('rcrateCard'); if (!card || card.hidden || reduceMotion) return;
  const t = performance.now() / 1000;
  RC.tick = (RC.tick | 0) + 1;
  // the Admiral banners every time (they're the brightest and quickest), the rest every other
  for (const cv of card.querySelectorAll('canvas.rcprev')) { const s = cv._skin; if (s && s.rarity && s.rarity !== 'deckhand' && s.rarity !== 'bosun' && (s.rarity === 'admiral' || !(RC.tick & 1))) rcDrawPreview(cv, s, t); }
}, 50);

function rcCard(skin, cls) {
  const d = document.createElement('div'), ra = skin.rarity ? rcRarityOf(skin) : null;
  d.className = 'skincard rcskin r-' + (ra ? ra.id : 'standard') + (cls ? ' ' + cls : '');
  d.style.setProperty('--rc', ra ? ra.color : '#8f98ab');
  const level = rcLevel(skin);
  if (level) { const pips = document.createElement('span'); pips.className = 'pips'; pips.setAttribute('aria-hidden', 'true'); for (let i = 0; i < level; i++) pips.appendChild(document.createElement('i')); d.appendChild(pips); }
  d.appendChild(rcPreview(skin, 104));
  const n = document.createElement('b'); n.textContent = skin.name; d.appendChild(n);
  const r = document.createElement('small'); r.textContent = (ra ? ra.name : 'Standard') + ' · banner'; d.appendChild(r);
  return d;
}

// ---------- the card ----------
function rcShow(e) {
  try { audioInit(); } catch (err) {}
  RC.opener = e && e.currentTarget || document.activeElement;
  const card = $('rcrateCard'); card.hidden = false; rcRender(); card.scrollTop = 0;
  $('rcrateClose').focus({ preventScroll: true });
}
function rcHide() {
  if (RC.opening) return;
  const card = $('rcrateCard'); if (card.hidden) return;
  card.hidden = true;
  const back = RC.opener && document.contains(RC.opener) && RC.opener.offsetParent ? RC.opener : $('rcrateBtn');
  if (back) try { back.focus({ preventScroll: true }); } catch (err) {}
}
function rcEquip(id) {
  if (id && !RC.owned[id]) return;
  RC.equipped = id || ''; rcSave(); rcRender();
  if (typeof wnSendLobby === 'function' && typeof WN !== 'undefined' && WN.code) wnSendLobby();
}
function rcRender() {
  for (const b of document.querySelectorAll('.rcrateBtn')) b.textContent = 'Banner crates · ' + RC.crates;
  const card = $('rcrateCard'); if (!card || card.hidden) return;
  const ci = $('rcTypes'); ci.textContent = '';
  const row = document.createElement('div'); row.className = 'cratetype viewing';
  const box = document.createElement('span'); box.className = 'cratebox rcbox'; box.setAttribute('aria-hidden', 'true');
  const nm = document.createElement('b'); nm.textContent = 'Herald’s Crate';
  const n = document.createElement('small'); n.textContent = (RC.crates === 1 ? '1 crate' : RC.crates + ' crates') + ' · a banner for your land';
  const open = document.createElement('button'); open.type = 'button'; open.className = RC.crates > 0 ? 'primary small' : 'tool';
  open.textContent = RC.opening ? 'Opening…' : RC.crates > 0 ? 'Open' : 'None yet'; open.disabled = RC.crates <= 0 || RC.opening; open.addEventListener('click', rcOpen);
  const all = document.createElement('button'); all.type = 'button'; all.className = 'tool'; all.textContent = 'Open all'; all.hidden = RC.crates < 2; all.disabled = RC.opening; all.addEventListener('click', rcOpenAll);
  row.append(box, nm, n, all, open); ci.appendChild(row);
  $('rcrateClose').disabled = RC.opening;
  const left = RC_TILES_PER_CRATE - RC.tiles;
  $('rcProgress').textContent = `Next crate in ${left} tiles taken (${RC.tiles} of ${RC_TILES_PER_CRATE}), or see a war through (three minutes or more; a win pays three).`;
  $('rcBar').style.setProperty('--v', (RC.tiles / RC_TILES_PER_CRATE).toFixed(2));
  const odds = $('rcOdds'); odds.textContent = '';
  for (const ra of RARITIES) { const li = document.createElement('li'); li.style.setProperty('--rc', ra.color); li.textContent = ra.name + ' · ' + (ra.odds * 100).toFixed(ra.odds < 0.01 ? 2 : 1) + '%'; odds.appendChild(li); }
  const inv = $('rcInv'); inv.textContent = '';
  let owned = 0;
  let lastGrade = null;
  for (const s of [RC_PLAIN].concat(RC_SKINS.filter(k => k.rarity !== 'pirate' || RC.owned[k.id]).sort((p, q) => rcLevel(p) - rcLevel(q)))) {   // [pirate tokens] shown once unlocked
    // a heading for each grade, with how many of it you've found
    const gr = s.rarity || 'standard';
    if (gr !== lastGrade) {
      lastGrade = gr;
      const ra = s.rarity ? rcRarityOf(s) : null, mine = RC_SKINS.filter(k => k.rarity === s.rarity);
      const sub = document.createElement('span'); sub.className = 'invsub';
      sub.textContent = ra ? `${ra.name} · ${mine.filter(k => RC.owned[k.id]).length} of ${mine.length}` : 'Standard';
      inv.appendChild(sub);
    }
    const count = !s.rarity ? 1 : (RC.owned[s.id] | 0), isOn = rcEquippedId() === s.id;
    const c = rcCard(s, (isOn ? 'equipped' : '') + (count ? '' : ' locked'));
    if (count > 1) { const dd = document.createElement('span'); dd.className = 'dupes'; dd.textContent = '×' + count; c.appendChild(dd); }
    if (count) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tool'; b.textContent = isOn ? 'Flying' : 'Fly it'; b.disabled = isOn;
      b.setAttribute('aria-label', (isOn ? 'Flying: ' : 'Fly ') + s.name);
      b.addEventListener('click', () => { rcEquip(s.id); });
      c.appendChild(b);
      if (s.rarity) owned++;
    } else c.setAttribute('aria-label', s.name + ', not found yet');
    inv.appendChild(c);
  }
  $('rcCollected').textContent = owned + ' of ' + RC_SKINS.filter(k => k.rarity !== 'pirate' || RC.owned[k.id]).length + ' found';
}

// ---------- opening ----------
function rcOpen() {
  if (RC.opening || RC.crates <= 0) return;
  RC.opening = true; RC.crates--; RC.opened++;
  const prize = rcRoll(); RC.pending = prize.id; rcSave();
  $('rcResult').hidden = true; rcRender();
  rcSpin(prize, reduceMotion ? 600 : 6000, () => rcFinish(prize));
}
function rcSpin(prize, dur, done) {
  requestAnimationFrame(() => {
    const sheet = $('rcrateCard'), r = $('rcReel').getBoundingClientRect(), sr = sheet.getBoundingClientRect();
    if (r.top < sr.top + 70 || r.bottom > sr.bottom - 10) sheet.scrollTo({ top: sheet.scrollTop + r.top - sr.top - sr.height * 0.25, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  const reel = $('rcReel'), strip = $('rcStrip'); strip.textContent = '';
  const N = 56, WIN = 48;
  for (let i = 0; i < N; i++) strip.appendChild(rcCard(i === WIN ? prize : rcFiller(), 'reelitem'));
  const cardW = strip.firstChild.getBoundingClientRect().width + 8, viewW = reel.getBoundingClientRect().width;
  const end = WIN * cardW + cardW / 2 - viewW / 2 + (Math.random() - 0.5) * cardW * 0.7, t0 = performance.now();
  let lastIdx = -1;
  const step = now => {
    const t = Math.min(1, (now - t0) / dur), x = end * (1 - Math.pow(1 - t, 4));
    strip.style.transform = 'translateX(' + (-x) + 'px)';
    const idx = Math.floor((x + viewW / 2) / cardW);
    if (idx !== lastIdx) { lastIdx = idx; try { sfxTick(); } catch (e) {} }
    if (t < 1) requestAnimationFrame(step); else done();
  };
  strip.style.transform = 'translateX(0)'; requestAnimationFrame(step);
}
function rcFinish(prize) {
  RC.opening = false; RC.owned[prize.id] = (RC.owned[prize.id] | 0) + 1; RC.pending = null; rcSave();
  const ra = rcRarityOf(prize);
  try { sfxReveal(RARITIES.indexOf(ra)); } catch (e) {}
  const res = $('rcResult'); res.textContent = ''; res.style.setProperty('--rc', ra.color); res.className = 'result r-' + ra.id;
  const h = document.createElement('p'); h.className = 'won'; h.textContent = (RC.owned[prize.id] > 1 ? 'Another ' : 'New: ') + prize.name;
  const r = document.createElement('small'); r.textContent = ra.name + ' grade · banner for your land';
  const on = rcEquippedId() === prize.id;
  const eq = document.createElement('button'); eq.type = 'button'; eq.className = 'primary'; eq.textContent = on ? 'Flying' : 'Fly it'; eq.disabled = on;
  eq.addEventListener('click', () => { rcEquip(prize.id); eq.textContent = 'Flying'; eq.disabled = true; });
  res.append(h, r, eq); res.hidden = false; rcRender();
  if (!on) eq.focus({ preventScroll: true });
}
function rcOpenAll() {
  const count = RC.crates; if (RC.opening || count < 1) return;
  const byGrade = {}, fresh = []; let best = null;
  for (let i = 0; i < count; i++) {
    const prize = rcRoll(), had = RC.owned[prize.id] | 0; RC.owned[prize.id] = had + 1;
    if (!had && !fresh.includes(prize)) fresh.push(prize);
    byGrade[prize.rarity] = (byGrade[prize.rarity] || 0) + 1;
    if (!best || rcLevel(prize) > rcLevel(best)) best = prize;
  }
  RC.crates = 0; RC.opened += count; rcSave();
  RC.opening = true; $('rcResult').hidden = true; rcRender();
  rcSpin(best, reduceMotion ? 400 : 2600, () => {
    RC.opening = false;
    const bra = rcRarityOf(best); try { sfxReveal(RARITIES.indexOf(bra)); } catch (e) {}
    const res = $('rcResult'); res.textContent = ''; res.style.setProperty('--rc', bra.color); res.className = 'result haul r-' + bra.id;
    const h = document.createElement('p'); h.className = 'won'; h.textContent = 'Opened ' + count + (count === 1 ? ' crate' : ' crates');
    const sub = document.createElement('small'); sub.textContent = (fresh.length ? fresh.length + (fresh.length === 1 ? ' new banner' : ' new banners') : 'Nothing new this time') + ' · best: ' + best.name;
    const grades = document.createElement('ul'); grades.className = 'odds';
    for (const ra of RARITIES) { if (!byGrade[ra.id]) continue; const li = document.createElement('li'); li.style.setProperty('--rc', ra.color); li.textContent = ra.name + ' × ' + byGrade[ra.id]; grades.appendChild(li); }
    res.append(h, sub, grades);
    if (fresh.length) { const strip = document.createElement('div'); strip.className = 'haulstrip'; for (const it of fresh.sort((a, b) => rcLevel(b) - rcLevel(a))) strip.appendChild(rcCard(it, 'reelitem')); res.appendChild(strip); }
    res.hidden = false; rcRender();
  });
}

rcLoad();
for (const b of document.querySelectorAll('.rcrateBtn')) b.addEventListener('click', rcShow);
if ($('rcrateClose')) $('rcrateClose').addEventListener('click', rcHide);
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const card = $('rcrateCard'); if (!card || card.hidden) return;
  e.preventDefault(); e.stopPropagation(); rcHide();
}, true);
rcRender();
