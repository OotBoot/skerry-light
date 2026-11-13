'use strict';
// Skerry Links: ball and club crates, the looks of your golf.
//
// A crate system of its own, like the outfit crates (src/ocrates.js) and kept apart from them and from the boat, weapon
// and banner crates: its own save (localStorage 'skerry-gkrates'), counts and card, opened from Ball crates or Club
// crates on the Skerry Links card. It borrows the boat crates' grades and odds (RARITIES), their card styles and the
// reel sounds, without changing any of them. Two crates on the one card:
//   the Chandler's Crate   a ball: its paint and pattern, the colour of its trail, and how it shines
//   the Shipwright's Crate a set of clubs made from what a ship carries: oars, belaying pins, boat-hooks, anchors,
//                          whalebone, harpoons, a narwhal's tusk, a lantern, a kraken's arm, a lighthouse, a trident
// The better the grade, the more it does:
//   Deckhand  a colour or a simple pattern
//   Bosun     a richer pattern, and a coloured trail behind the ball
//   Mate      it shimmers, the pattern moves, and the ball throws sparks as it flies
//   Captain   it glows, pulsing, with a halo round the ball
//   Admiral   alive: the Skerry Light's ball turns its beam as it goes, the Maelstrom's swirls, and Verity's Grin
//             is his own face, blinking up at you; the Admiral clubs carry a lamp room with its beam turning, or
//             the drowned sea's green fire and bubbles rising off the prongs
// What the golfer wears is your outfit from the Tailor's Crate (src/ocrates.js), in 3D in src/gfdress.js.
//
// Earning: a ball crate for every 3 holes you finish and a club crate for every 6 (the count carries over between
// rounds), a ball crate more for a birdie and a club crate more for an eagle or better. The first of each is free.
//
// The global API, for the 3D view (src/gfdress.js) and the round played together (src/golfnet.js):
//   gkBall(id) / gkClub(id) -> a ball or club by id (null for the plain one or an unknown id)
//   gkMine()                -> what you play with: { oc, ball, club } (ids, '' for plain)
//   gkData() / gkMerge(d, takeLooks) -> for the one save that carries everything (src/crates.js)

const GK_KEY = 'skerry-gkrates';
const GK_BALL_HOLES = 3, GK_CLUB_HOLES = 6;

// balls: [id, name, rarity, base, second colour, pattern, extra (c3 a third colour, trail, fx, adm)]
const GK_BALL_ROWS = [
  ['b_gull',     'Gull’s Egg',          'deckhand', '#ece6d6', '#6e675c', 'speckle'],
  ['b_buoy',     'Harbour Buoy',        'deckhand', '#d83a2a', '#f4efe2', 'band'],
  ['b_oilskin',  'Oilskin Yellow',      'deckhand', '#e8c030', '#6a5010', 'seam'],
  ['b_seaglass', 'Sea-Glass Green',     'deckhand', '#86d2aa', '#e8fff0', 'frost'],
  ['b_tarred',   'Tarred Rope',         'deckhand', '#3a3228', '#a8885a', 'twist'],
  ['b_compass',  'Ship’s Compass',      'bosun',    '#f0e8d0', '#1a2a4a', 'compass',  { c3: '#c03030', trail: '#ffe0a0' }],
  ['b_signal',   'Signal Flags',        'bosun',    '#f4efe2', '#2a4ad8', 'quarters', { c3: '#e8c030', trail: '#9ab8ff' }],
  ['b_float',    'Glass Net Float',     'bosun',    '#2f8494', '#c8a060', 'net',      { trail: '#8fe0ee' }],
  ['b_mackerel', 'Mackerel',            'bosun',    '#4f86a6', '#14202e', 'tiger',    { c3: '#e8eef2', trail: '#a8d8f0' }],
  ['b_pearl',    'Moon Pearl',          'mate',     '#f2ecf6', '#c4b4ff', 'pearl',    { c3: '#ffc8e0', trail: '#e8dcff', fx: 'shimmer', glow: '#d8ccff' }],
  ['b_phos',     'Phosphor Tide',       'mate',     '#0c3a3c', '#62ffd4', 'waves',    { trail: '#62ffd4', fx: 'shimmer', glow: '#62ffd4' }],
  ['b_aurora',   'Northern Lights',     'mate',     '#121c34', '#7affb0', 'aurora',   { c3: '#b07aff', trail: '#9affc8', fx: 'shimmer', glow: '#7affb0' }],
  ['b_ember',    'Ember Isle',          'captain',  '#2a0e08', '#ff7a2a', 'cracks',   { trail: '#ff9a40', fx: 'glow', glow: '#ff8a30' }],
  ['b_corpse',   'The Corpse Light',    'captain',  '#0e1a14', '#7affb0', 'wisp',     { trail: '#7affb0', fx: 'glow', glow: '#7affb0' }],
  ['b_storm',    'Storm Glass',         'captain',  '#161a2c', '#b8f0ff', 'bolts',    { trail: '#b8f0ff', fx: 'glow', glow: '#9ae0ff' }],
  ['b_light',    'The Skerry Light',    'admiral',  '#f4ecd0', '#ffc23a', 'light',    { trail: '#ffe08a', fx: 'aura', glow: '#ffd88a', adm: 'light' }],
  ['b_maelstrom','The Maelstrom',       'admiral',  '#140a2a', '#62e0ff', 'whirl',    { c3: '#c06aff', trail: '#8ad8ff', fx: 'aura', glow: '#7ad0ff', adm: 'whirl' }],
  ['b_verity',   'Verity’s Grin',       'admiral',  '#e8d41a', '#060504', 'verity',   { trail: '#ffe24a', fx: 'aura', glow: '#ffe24a', adm: 'verity' }],
];
// clubs: [id, name, rarity, style, shaft, head, accent, extra (glow, fx, adm, glass)]
const GK_CLUB_ROWS = [
  ['k_oar',     'Driftwood Oar',        'deckhand', 'oar',        '#8a6a48', '#a8885e', '#d8c8a0'],
  ['k_pin',     'Belaying Pin',         'deckhand', 'pin',        '#6a4a2a', '#7e5832', '#c8a060'],
  ['k_hook',    'Boat-Hook',            'deckhand', 'hook',       '#7a5a3a', '#4a4a52', '#c8b890'],
  ['k_anchor',  'Rope-Bound Anchor',    'deckhand', 'anchor',     '#4a4640', '#3a3a3e', '#c8b890'],
  ['k_brass',   'Brass Anchor',         'bosun',    'anchor',     '#24242a', '#e0b050', '#a02828'],
  ['k_bone',    'Whalebone',            'bosun',    'bone',       '#e8e0cc', '#d8cfb8', '#3a2a1e'],
  ['k_harpoon', 'Whaler’s Harpoon',     'bosun',    'harpoon',    '#6a4a2a', '#9a9aa2', '#c8b890'],
  ['k_narwhal', 'Narwhal Tusk',         'mate',     'tusk',       '#efe8d8', '#f8f4ea', '#9ae0ff', { fx: 'shimmer', glow: '#bfefff' }],
  ['k_glass',   'Sea-Glass Oar',        'mate',     'oar',        '#5ac8b0', '#8ef0d8', '#e8fff8', { fx: 'shimmer', glow: '#8ef0d8', glass: 1 }],
  ['k_ember',   'Ember Harpoon',        'captain',  'harpoon',    '#2a1008', '#ff7a2a', '#ffb050', { fx: 'glow', glow: '#ff8a30' }],
  ['k_corpse',  'Corpse-Light Lantern', 'captain',  'lantern',    '#24302a', '#1a2a20', '#7affb0', { fx: 'glow', glow: '#7affb0' }],
  ['k_kraken',  'Kraken’s Arm',         'captain',  'tentacle',   '#4a1a5a', '#6a2a7a', '#e0a8ff', { fx: 'glow', glow: '#c06aff' }],
  ['k_beam',    'The Keeper’s Beam',    'admiral',  'lighthouse', '#c89a30', '#f4ecd0', '#c03030', { fx: 'aura', glow: '#ffd88a', adm: 'beam' }],
  ['k_trident', 'The Drowned Trident',  'admiral',  'trident',    '#2a5a50', '#5a9a88', '#7affe0', { fx: 'aura', glow: '#3affc8', adm: 'drowned' }],
];
const GK_BALLS = GK_BALL_ROWS.map(([id, name, rarity, base, c2, pat, x]) => Object.freeze(Object.assign({ id, name, rarity, base, c2, pat, kind: 'ball' }, x || {})));
const GK_CLUBS = GK_CLUB_ROWS.map(([id, name, rarity, style, shaft, head, accent, x]) => Object.freeze(Object.assign({ id, name, rarity, style, shaft, head, accent, kind: 'club' }, x || {})));
const GK_BY_ID = Object.fromEntries(GK_BALLS.concat(GK_CLUBS).map(o => [o.id, o]));
const gkBall = id => (typeof id === 'string' && GK_BY_ID[id] && GK_BY_ID[id].kind === 'ball' && GK_BY_ID[id]) || null;
const gkClub = id => (typeof id === 'string' && GK_BY_ID[id] && GK_BY_ID[id].kind === 'club' && GK_BY_ID[id]) || null;
const gkRarityOf = o => RARITIES.find(r => r.id === o.rarity);
const gkLevel = o => o && o.rarity ? RARITIES.findIndex(r => r.id === o.rarity) + 1 : 0;
const GK_KINDS = {
  ball: { list: GK_BALLS, crate: 'Chandler’s Crate', what: 'a ball for the links', one: 'ball', many: 'balls', plain: 'Plain white', btn: 'Ball crates' },
  club: { list: GK_CLUBS, crate: 'Shipwright’s Crate', what: 'a set of clubs made from a ship’s gear', one: 'set of clubs', many: 'sets of clubs', plain: 'Keeper’s hickory', btn: 'Club crates' },
};

var GK = { ball: { crates: 0, opened: 0, owned: {}, eq: '' }, club: { crates: 0, opened: 0, owned: {}, eq: '' }, holes: 0, seen: '', tab: 'ball', pending: null, opening: false, opener: null };

// ---------- saving ----------
function gkLoad() {
  let fresh = true;
  try {
    const raw = localStorage.getItem(GK_KEY);
    if (raw) {
      fresh = false;
      const d = JSON.parse(raw) || {}, n = v => Math.max(0, Math.min(99999, v | 0));
      for (const k of ['ball', 'club']) {
        const s = d[k] || {}, S = GK[k];
        S.crates = n(s.crates); S.opened = n(s.opened); S.owned = {};
        if (s.owned && typeof s.owned === 'object') for (const [id, c] of Object.entries(s.owned)) if (GK_BY_ID[id] && GK_BY_ID[id].kind === k && n(c)) S.owned[id] = n(c);
        S.eq = GK_BY_ID[s.eq] && S.owned[s.eq] ? s.eq : '';
      }
      GK.holes = n(d.holes);
      if (GK_BY_ID[d.pending]) { const p = GK_BY_ID[d.pending]; GK[p.kind].owned[p.id] = (GK[p.kind].owned[p.id] | 0) + 1; }
    }
  } catch (e) {}
  if (fresh) { GK.ball.crates = 1; GK.club.crates = 1; }
  GK.pending = null;
  gkSave(true);
}
function gkSave(quiet) {
  try { localStorage.setItem(GK_KEY, JSON.stringify({ ball: GK.ball, club: GK.club, holes: GK.holes, pending: GK.pending })); } catch (e) {}
  if (!quiet && typeof cloudSaveSoon === 'function') try { cloudSaveSoon(); } catch (e) {}
}
// for the one save that carries everything (src/crates.js saveData / mergeSave): every ball and club either side has,
// crates by everything ever earned, and its looks only if takeLooks
function gkData() { return { b: { c: GK.ball.crates, n: GK.ball.opened, o: GK.ball.owned, e: GK.ball.eq }, k: { c: GK.club.crates, n: GK.club.opened, o: GK.club.owned, e: GK.club.eq }, h: GK.holes }; }
function gkMerge(d, takeLooks) {
  if (!d || typeof d !== 'object') return false;
  let changed = false;
  const n = v => Math.max(0, Math.min(99999, v | 0));
  for (const [k, s] of [['ball', d.b], ['club', d.k]]) {
    if (!s || typeof s !== 'object') continue;
    const S = GK[k];
    if (s.o && typeof s.o === 'object') for (const [id, c] of Object.entries(s.o)) if (GK_BY_ID[id] && GK_BY_ID[id].kind === k && n(c) > (S.owned[id] | 0)) { S.owned[id] = n(c); changed = true; }
    const earned = Math.max(n(s.c) + n(s.n), S.crates + S.opened), opened = Math.max(S.opened, n(s.n)), left = Math.min(99999, Math.max(0, earned - opened));
    if (left !== S.crates || opened !== S.opened) { S.crates = left; S.opened = opened; changed = true; }
    if (takeLooks && GK_BY_ID[s.e] && S.owned[s.e] && S.eq !== s.e) { S.eq = s.e; changed = true; }
  }
  if (n(d.h) > GK.holes) { GK.holes = n(d.h); changed = true; }
  if (changed) { gkSave(true); gkRender(); }
  return changed;
}
function gkMine() { return { oc: typeof ocEquippedId === 'function' ? ocEquippedId() : '', ball: GK.ball.owned[GK.ball.eq] ? GK.ball.eq : '', club: GK.club.owned[GK.club.eq] ? GK.club.eq : '' }; }

// ---------- earning: as each hole ends (src/golf.js gfHoleDone), for your own score on it ----------
function gkGrant(k, n, why) {
  GK[k].crates = Math.min(99999, GK[k].crates + n); gkSave(); gkRender();
  return '+' + n + ' ' + (k === 'ball' ? 'ball' : 'club') + ' crate' + (n > 1 ? 's' : '') + ' (' + why + ')';
}
function gkHole() {
  if (typeof GF === 'undefined' || !GF.on) return;
  const p = GF.P[GF.me], H = GF.H; if (!p || !H || p.gone) return;
  const key = GF.seed + ':' + GF.hi; if (GK.seen === key) return; GK.seen = key;
  const sc = p.sc[GF.hi]; if (sc == null) return;
  GK.holes++;
  const got = [];
  if (GK.holes % GK_BALL_HOLES === 0) got.push(gkGrant('ball', 1, GK_BALL_HOLES + ' holes played'));
  if (GK.holes % GK_CLUB_HOLES === 0) got.push(gkGrant('club', 1, GK_CLUB_HOLES + ' holes played'));
  if (sc < GFC.MAXS && sc - H.par <= -1) got.push(gkGrant('ball', 1, 'a birdie'));
  if (sc < GFC.MAXS && sc - H.par <= -2) got.push(gkGrant('club', 1, sc === 1 ? 'a hole in one' : 'an eagle'));
  if (!got.length) { gkSave(); return; }
  if (typeof toast === 'function') toast(got.join(' · ') + '. Open them from the Skerry Links card.', got[0]);
}

// ---------- rolling ----------
function gkRoll(k) {
  let r = Math.random(), rarity = RARITIES[0];
  for (const ra of RARITIES) { if (r < ra.odds) { rarity = ra; break; } r -= ra.odds; }
  const pool = GK_KINDS[k].list.filter(o => o.rarity === rarity.id);
  return pool[(Math.random() * pool.length) | 0];
}
function gkFiller(k) { let o; do { o = gkRoll(k); } while (o.rarity === 'admiral'); return o; }

// ---------- the ball's paint: one painter for the card's picture and the 3D ball's texture (an equirectangular map) ----------
// (W by H, H half of W; t the time, for the ones that move)
function gkRand(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function gkPaintBall(g, b, W, H, t) {
  const o = b || { base: '#f4f2ea', c2: '#d8d4c8', pat: 'dimples', id: 'plain' }, R = gkRand(o.id), c3 = o.c3 || o.c2;
  g.save(); g.fillStyle = o.base; g.fillRect(0, 0, W, H);
  const line = (w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; };
  switch (o.pat) {
    case 'dimples': g.fillStyle = o.c2; for (let j = 1; j < 9; j++) for (let i = 0; i < 18; i++) { g.globalAlpha = 0.45; g.beginPath(); g.arc((i + (j % 2) * 0.5) / 18 * W, j / 9 * H, H * 0.018, 0, 6.283); g.fill(); } break;
    case 'speckle': g.fillStyle = o.c2; for (let i = 0; i < 140; i++) { g.globalAlpha = 0.35 + R() * 0.6; g.beginPath(); g.ellipse(R() * W, H * (0.08 + R() * 0.84), H * (0.006 + R() * 0.018), H * (0.005 + R() * 0.012), R() * 3, 0, 6.283); g.fill(); } break;
    case 'band': g.fillStyle = o.c2; g.fillRect(0, H * 0.36, W, H * 0.28); g.fillStyle = o.base; g.fillRect(0, H * 0.47, W, H * 0.06); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, H * 0.34, W, H * 0.02); g.fillRect(0, H * 0.64, W, H * 0.02); break;
    case 'seam': line(H * 0.035, o.c2); for (const ph of [0, Math.PI]) { g.beginPath(); for (let x = 0; x <= W; x += 4) g.lineTo(x, H * (0.5 + 0.28 * Math.sin(x / W * 6.283 * 2 + ph))); g.stroke(); } break;
    case 'frost': for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H, r = H * (0.04 + R() * 0.12), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, o.c2 + 'aa'); gr.addColorStop(1, o.c2 + '00'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } break;
    case 'twist': line(H * 0.07, o.c2); for (let k = -6; k < 14; k++) { g.beginPath(); g.moveTo(k * W / 8, 0); g.lineTo(k * W / 8 + W * 0.5, H); g.stroke(); } line(H * 0.02, 'rgba(0,0,0,0.35)'); for (let k = -6; k < 14; k++) { g.beginPath(); g.moveTo(k * W / 8 + H * 0.05, 0); g.lineTo(k * W / 8 + W * 0.5 + H * 0.05, H); g.stroke(); } break;
    case 'compass': {
      line(H * 0.008, o.c2); g.globalAlpha = 0.5; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(i / 12 * W, 0); g.lineTo(i / 12 * W, H); g.stroke(); } g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.globalAlpha = 1;
      for (const cx of [W * 0.25, W * 0.75]) { const cy = H / 2, r = H * 0.34; g.fillStyle = o.c2; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, l = i % 2 ? r * 0.55 : r; g.fillStyle = i === 0 ? c3 : o.c2; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.3) * r * 0.16, cy + Math.sin(a - 0.3) * r * 0.16); g.lineTo(cx + Math.cos(a) * l * 0.5, cy + Math.sin(a) * l); g.lineTo(cx + Math.cos(a + 0.3) * r * 0.16, cy + Math.sin(a + 0.3) * r * 0.16); g.closePath(); g.fill(); }
        line(H * 0.012, o.c2); g.beginPath(); g.ellipse(cx, cy, r * 0.52, r * 1.04, 0, 0, 6.283); g.stroke(); }
      break; }
    case 'quarters': g.fillStyle = o.c2; g.fillRect(0, 0, W / 4, H / 2); g.fillRect(W / 2, 0, W / 4, H / 2); g.fillRect(W / 4, H / 2, W / 4, H / 2); g.fillRect(W * 0.75, H / 2, W / 4, H / 2); g.fillStyle = c3; g.fillRect(0, H * 0.46, W, H * 0.08); for (let i = 0; i < 4; i++) g.fillRect(i * W / 4 + W / 8 - H * 0.04, 0, H * 0.08, H); break;
    case 'net': { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); line(H * 0.03, o.c2); for (let k = -8; k < 16; k++) { g.beginPath(); g.moveTo(k * W / 10, 0); g.lineTo(k * W / 10 + H, H); g.stroke(); g.beginPath(); g.moveTo(k * W / 10, 0); g.lineTo(k * W / 10 - H, H); g.stroke(); } g.fillStyle = o.c2; for (let k = 0; k < 20; k++) for (let j = 1; j < 5; j++) { g.beginPath(); g.arc(k * W / 10 + (j % 2) * W / 20, j * H / 5, H * 0.03, 0, 6.283); g.fill(); } break; }
    case 'tiger': g.fillStyle = c3; g.fillRect(0, H * 0.55, W, H * 0.45); line(H * 0.035, o.c2); for (let i = 0; i < 22; i++) { const x0 = i / 22 * W; g.beginPath(); for (let y = 0; y <= H * 0.52; y += 3) g.lineTo(x0 + Math.sin(y / H * 18 + i) * H * 0.04, y); g.stroke(); } g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(0, H * 0.52, W, H * 0.04); break;
    case 'pearl': for (let i = 0; i < 6; i++) { const y = ((i / 6 + t * 0.03) % 1) * H, gr = g.createLinearGradient(0, y - H * 0.15, 0, y + H * 0.15); const c = i % 2 ? o.c2 : c3; gr.addColorStop(0, c + '00'); gr.addColorStop(0.5, c + 'aa'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(0, y - H * 0.15, W, H * 0.3); } break;
    case 'waves': line(H * 0.03, o.c2); for (let j = 0; j < 6; j++) { g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + j); g.beginPath(); for (let x = 0; x <= W; x += 4) g.lineTo(x, H * (0.12 + j * 0.15) + Math.sin(x / W * 6.283 * 3 + t * 1.5 + j) * H * 0.04); g.stroke(); } break;
    case 'aurora': for (let i = 0; i < 14; i++) { const x = (i / 14 + Math.sin(t * 0.3 + i) * 0.02) * W, c = i % 3 ? o.c2 : c3, gr = g.createLinearGradient(0, H * 0.15, 0, H * 0.7); gr.addColorStop(0, c + '00'); gr.addColorStop(0.6, c + 'cc'); gr.addColorStop(1, c + '00'); g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7); g.fillStyle = gr; g.fillRect(x, H * 0.15, W / 22, H * 0.55); } break;
    case 'cracks': case 'bolts': case 'wisp': {
      const n = o.pat === 'wisp' ? 7 : 12;
      for (let i = 0; i < n; i++) {
        let x = R() * W, y = R() * H; const pts = [[x, y]];
        for (let s = 0; s < 8; s++) { if (o.pat === 'wisp') { x += H * 0.08; y += Math.sin(s * 0.9 + i) * H * 0.06; } else { x += (R() - 0.5) * H * 0.3; y += (R() - 0.3) * H * 0.18; } pts.push([x, y]); }
        for (const [w, a] of [[H * 0.07, 0.25], [H * 0.022, 1]]) { line(w, o.c2); g.globalAlpha = a * (o.pat === 'wisp' ? 0.6 + 0.4 * Math.sin(t * 2 + i) : 1); g.beginPath(); pts.forEach(([px, py]) => g.lineTo(px, py)); g.stroke(); }
      }
      g.globalAlpha = 1; break; }
    case 'light': {
      // gold filigree on cream, and the beam going round
      line(H * 0.018, o.c2); for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) { const x = (i + 0.5) / 8 * W, y = (j + 0.5) / 3 * H; g.beginPath(); g.arc(x, y, H * 0.08, 0, 4.7); g.stroke(); g.beginPath(); g.arc(x + H * 0.09, y + H * 0.09, H * 0.045, 3.1, 7.5); g.stroke(); }
      const bx = ((t * 0.35) % 1) * W; for (const off of [0, W / 2]) { const x = (bx + off) % W, gr = g.createLinearGradient(x - W * 0.1, 0, x + W * 0.1, 0); gr.addColorStop(0, 'rgba(255,246,216,0)'); gr.addColorStop(0.5, 'rgba(255,250,230,0.95)'); gr.addColorStop(1, 'rgba(255,246,216,0)'); g.fillStyle = gr; g.fillRect(x - W * 0.1, 0, W * 0.2, H); if (x < W * 0.1) { g.fillRect(x - W * 0.1 + W, 0, W * 0.2, H); } }
      g.fillStyle = '#c03030'; g.fillRect(0, H * 0.46, W, H * 0.08); break; }
    case 'whirl': {
      for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 40; s++) { const f = s / 40, x = ((arm / 3 + f * 0.8 + t * 0.12) % 1) * W, y = H * (0.05 + f * 0.9); g.globalAlpha = 0.9 - f * 0.4; g.fillStyle = arm % 2 ? c3 : o.c2; g.beginPath(); g.arc(x, y, H * (0.03 + 0.05 * (1 - Math.abs(f - 0.5) * 2)), 0, 6.283); g.fill(); }
      g.globalAlpha = 1; g.fillStyle = '#ffffff'; for (let i = 0; i < 20; i++) { if (Math.sin(t * 4 + i * 2.3) > 0.6) g.fillRect(R() * W, R() * H, H * 0.02, H * 0.02); } break; }
    case 'verity': g.fillStyle = 'rgba(255,250,210,0.4)'; g.beginPath(); g.ellipse(W * 0.2, H * 0.3, W * 0.06, H * 0.08, 0, 0, 6.283); g.fill(); break;
  }
  g.restore();
}
// the card's picture of a ball: the paint turning on it, shaded round, its glow and its trail
function gkDrawBall(cv, b, t) {
  const g = cv.getContext('2d'), Wd = cv.width, Hd = cv.height, tt = reduceMotion ? 0 : t;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const bg = g.createLinearGradient(0, 0, 0, Hd); bg.addColorStop(0, '#2a4a5e'); bg.addColorStop(0.62, '#3a6a4a'); bg.addColorStop(1, '#2a5236'); g.fillStyle = bg; g.fillRect(0, 0, Wd, Hd);
  const r = Hd * 0.3, cx = Wd * 0.56, cy = Hd * 0.48;
  // its trail, off to the left and up
  if (b && b.trail) { const gr = g.createLinearGradient(cx - Wd * 0.5, cy - r * 1.4, cx, cy); gr.addColorStop(0, b.trail + '00'); gr.addColorStop(1, b.trail + 'cc'); g.strokeStyle = gr; g.lineWidth = r * 0.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - Wd * 0.5, cy - r * 1.6); g.quadraticCurveTo(cx - Wd * 0.2, cy - r * 1.2, cx - r * 0.3, cy); g.stroke(); }
  if (b && b.fx) {
    const pulse = b.fx === 'glow' ? 0.6 + 0.3 * Math.sin(tt * 2) : b.fx === 'aura' ? 0.8 + 0.2 * Math.sin(tt * 2.6) : 0.35 + 0.2 * Math.sin(tt * 2.2);
    const gr = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.4); gr.addColorStop(0, b.glow + 'cc'); gr.addColorStop(1, b.glow + '00'); g.globalAlpha = pulse; g.fillStyle = gr; g.fillRect(0, 0, Wd, Hd); g.globalAlpha = 1;
  }
  if (b && b.adm === 'light') { g.save(); g.globalCompositeOperation = 'lighter'; const a = tt * 0.9; for (const [off, al] of [[0, 0.35], [Math.PI, 0.18]]) { g.globalAlpha = al * (0.6 + 0.4 * Math.abs(Math.cos(a + off))); g.fillStyle = '#fff0b8'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a + off - 0.14) * Wd, cy + Math.sin(a + off - 0.14) * Hd * 0.5); g.lineTo(cx + Math.cos(a + off + 0.14) * Wd, cy + Math.sin(a + off + 0.14) * Hd * 0.5); g.closePath(); g.fill(); } g.restore(); }
  // the shadow on the grass
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx + r * 0.2, cy + r * 1.05, r * 0.9, r * 0.22, 0, 0, 6.283); g.fill();
  if (b && b.adm === 'verity' && typeof vyFace === 'function') {
    vyFace(g, cx, cy - Math.abs(Math.sin(tt * 2.1)) * r * 0.12, r, tt, 0, 1, Math.sin(tt * 0.6));
  } else {
    // the paint, turning (a strip of it, squeezed towards the edges)
    const P = gkDrawBall.cv || (gkDrawBall.cv = document.createElement('canvas')); P.width = 128; P.height = 64;
    gkPaintBall(P.getContext('2d'), b, 128, 64, tt);
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.clip();
    const off = (tt * 0.12 % 1) * 128, sl = 24;
    for (let i = 0; i < sl; i++) { const a0 = -Math.PI / 2 + i / sl * Math.PI, a1 = a0 + Math.PI / sl, x0 = cx + Math.sin(a0) * r, x1 = cx + Math.sin(a1) * r; const sx = (off + i / sl * 64) % 128; g.drawImage(P, sx, 0, Math.min(64 / sl + 0.5, 128 - sx), 64, x0, cy - r, x1 - x0 + 0.6, r * 2); }
    const sh = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05); sh.addColorStop(0, 'rgba(255,255,255,0.45)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = sh; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
  }
  // sparks off the better ones
  if (b && (b.fx === 'aura' || b.fx === 'glow') && !reduceMotion) { g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const a = tt * 0.9 + i * 1.05, rr = r * (1.4 + 0.3 * Math.sin(tt * 2 + i)); if (Math.sin(tt * 3 + i * 2) > 0.1) g.fillRect(cx + Math.cos(a) * rr - 1, cy + Math.sin(a) * rr * 0.8 - 1, 2, 2); } }
}
// the card's picture of a set of clubs: one of them, its head at the bottom
function gkDrawClub(cv, k, t) {
  const g = cv.getContext('2d'), Wd = cv.width, Hd = cv.height, tt = reduceMotion ? 0 : t, s = Hd / 94;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const bg = g.createLinearGradient(0, 0, 0, Hd); bg.addColorStop(0, '#1e2a38'); bg.addColorStop(1, '#12202a'); g.fillStyle = bg; g.fillRect(0, 0, Wd, Hd);
  const o = k || { style: 'plain', shaft: '#c9c9c9', head: '#8a8a8a', accent: '#2a2420' };
  g.save(); g.translate(Wd / 2, Hd / 2); g.scale(s, s); g.rotate(-0.55);   // (the shaft along -y, the head at +y)
  const pulse = o.fx === 'glow' ? 0.6 + 0.35 * Math.sin(tt * 2) : o.fx === 'aura' ? 0.8 + 0.2 * Math.sin(tt * 2.6) : o.fx === 'shimmer' ? 0.35 + 0.25 * Math.sin(tt * 2.2) : 0;
  if (o.fx) { const gr = g.createRadialGradient(0, 30, 2, 0, 30, 40); gr.addColorStop(0, o.glow + 'aa'); gr.addColorStop(1, o.glow + '00'); g.globalAlpha = pulse; g.fillStyle = gr; g.fillRect(-60, -10, 120, 80); g.globalAlpha = 1; }
  const glow = c => { if (o.fx === 'glow' || o.fx === 'aura') { g.shadowColor = o.glow; g.shadowBlur = 4 + pulse * 8; } else g.shadowBlur = 0; };
  const shaftW = o.style === 'oar' || o.style === 'pin' || o.style === 'hook' || o.style === 'harpoon' ? 3.4 : o.style === 'tentacle' ? 4 : 2.4;
  // the grip and the shaft
  g.fillStyle = o.accent; g.fillRect(-shaftW / 2 - 0.6, -46, shaftW + 1.2, 14);
  if (o.style === 'tentacle') { g.strokeStyle = o.shaft; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); for (let y = -34; y <= 26; y += 2) g.lineTo(Math.sin(y * 0.12 + tt * 2) * 2.4, y); g.stroke(); g.fillStyle = o.accent; for (let y = -30; y < 24; y += 6) { g.beginPath(); g.arc(Math.sin(y * 0.12 + tt * 2) * 2.4 + 1.6, y, 0.9, 0, 6.283); g.fill(); } }
  else if (o.style === 'tusk') { g.fillStyle = o.shaft; g.beginPath(); g.moveTo(-2, -34); g.lineTo(2, -34); g.lineTo(1, 26); g.lineTo(-1, 26); g.fill(); g.strokeStyle = 'rgba(80,70,50,0.5)'; g.lineWidth = 0.6; for (let y = -34; y < 26; y += 3) { g.beginPath(); g.moveTo(-2, y); g.lineTo(2, y + 2.5); g.stroke(); } }
  else { g.globalAlpha = o.glass ? 0.75 : 1; g.fillStyle = o.shaft; g.fillRect(-shaftW / 2, -34, shaftW, 60); g.globalAlpha = 1; }
  if (o.style === 'bone') { g.fillStyle = o.accent; for (let y = -28; y < 24; y += 9) g.fillRect(-1.2, y, 2.4, 0.7); }
  if (o.style === 'lighthouse') { g.fillStyle = o.accent; for (let y = -30; y < 24; y += 10) g.fillRect(-shaftW / 2, y, shaftW, 4); }
  if (o.style === 'anchor' || o.style === 'hook') { g.strokeStyle = o.accent; g.lineWidth = 0.9; for (let y = -30; y < -16; y += 1.6) { g.beginPath(); g.moveTo(-shaftW / 2 - 0.4, y); g.lineTo(shaftW / 2 + 0.4, y + 1.2); g.stroke(); } }
  // the head
  g.fillStyle = o.head; g.strokeStyle = o.head;
  switch (o.style) {
    case 'oar': g.globalAlpha = o.glass ? 0.8 : 1; glow(); g.beginPath(); g.ellipse(0, 36, 7, 13, 0, 0, 6.283); g.fill(); g.shadowBlur = 0; g.globalAlpha = 1; g.fillStyle = o.accent; g.fillRect(-1, 22, 2, 26); break;
    case 'pin': g.beginPath(); g.ellipse(0, 33, 5.5, 8, 0, 0, 6.283); g.fill(); g.fillStyle = o.accent; g.fillRect(-5, 26, 10, 1.5); g.fillRect(-5, 39, 10, 1.5); break;
    case 'hook': g.fillStyle = '#4a4a52'; g.beginPath(); g.moveTo(-1.6, 26); g.lineTo(1.6, 26); g.lineTo(0, 44); g.fill(); g.lineWidth = 2.6; g.strokeStyle = '#4a4a52'; g.beginPath(); g.arc(6, 31, 5.5, Math.PI, Math.PI * 2.3); g.stroke(); break;
    case 'anchor': g.lineWidth = 3; g.beginPath(); g.arc(0, 30, 11, 0.15, Math.PI - 0.15); g.stroke(); g.beginPath(); g.moveTo(-14, 30); g.lineTo(-9, 34); g.lineTo(-11, 26); g.fill(); g.beginPath(); g.moveTo(14, 30); g.lineTo(9, 34); g.lineTo(11, 26); g.fill(); g.fillRect(-7, 22, 14, 2.2); break;
    case 'bone': g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 26); g.quadraticCurveTo(2, 40, 14, 40); g.stroke(); g.fillStyle = o.accent; for (let i = 0; i < 4; i++) g.fillRect(2 + i * 3, 37, 1.2, 2.2); break;
    case 'harpoon': glow(); g.fillStyle = o.head; g.fillRect(-2.2, 24, 4.4, 6); g.beginPath(); g.moveTo(-5, 30); g.lineTo(5, 30); g.lineTo(0, 46); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-5, 30); g.lineTo(-8, 26); g.lineTo(-3, 33); g.fill(); g.beginPath(); g.moveTo(5, 30); g.lineTo(8, 26); g.lineTo(3, 33); g.fill(); g.shadowBlur = 0; break;
    case 'tusk': g.fillStyle = o.head; g.beginPath(); g.moveTo(-2, 26); g.quadraticCurveTo(2, 38, 12, 40); g.quadraticCurveTo(4, 34, 2, 26); g.fill(); break;
    case 'lantern': g.fillStyle = '#3a3a3e'; g.fillRect(-4.5, 26, 9, 2); g.fillRect(-4.5, 39, 9, 2); glow(); g.fillStyle = o.accent; g.globalAlpha = 0.65 + pulse * 0.35; g.fillRect(-3.5, 28, 7, 11); g.globalAlpha = 1; g.shadowBlur = 0; g.strokeStyle = '#3a3a3e'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 28); g.lineTo(0, 39); g.stroke(); break;
    case 'tentacle': glow(); g.strokeStyle = o.head; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(Math.sin(26 * 0.12 + tt * 2) * 2.4, 26); g.quadraticCurveTo(4, 44, 12, 38); g.quadraticCurveTo(14, 32, 9, 33); g.stroke(); g.shadowBlur = 0; break;
    case 'lighthouse': {
      g.fillStyle = '#c89a30'; g.fillRect(-6, 26, 12, 2); glow(); g.fillStyle = '#fff0b8'; g.globalAlpha = 0.8 + 0.2 * pulse; g.fillRect(-4.5, 28, 9, 9); g.globalAlpha = 1; g.shadowBlur = 0;
      g.strokeStyle = '#c89a30'; g.lineWidth = 0.7; for (let x = -3; x <= 3; x += 3) { g.beginPath(); g.moveTo(x, 28); g.lineTo(x, 37); g.stroke(); }
      g.fillStyle = '#c89a30'; g.beginPath(); g.moveTo(-6, 37); g.lineTo(6, 37); g.lineTo(0, 44); g.closePath(); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter'; const a = tt * 1.1; for (const [off, al] of [[0, 0.3], [Math.PI, 0.15]]) { g.globalAlpha = al * (0.6 + 0.4 * Math.abs(Math.cos(a + off))); g.fillStyle = '#fff0b8'; g.beginPath(); g.moveTo(0, 32); g.lineTo(Math.cos(a + off - 0.15) * 70, 32 + Math.sin(a + off - 0.15) * 20); g.lineTo(Math.cos(a + off + 0.15) * 70, 32 + Math.sin(a + off + 0.15) * 20); g.closePath(); g.fill(); } g.restore();
      break; }
    case 'trident': glow(); g.fillStyle = o.head; g.fillRect(-10, 24, 20, 3); for (const x of [-9, 0, 9]) { g.beginPath(); g.moveTo(x - 1.6, 27); g.lineTo(x + 1.6, 27); g.lineTo(x, x ? 40 : 44); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x, x ? 40 : 44); g.lineTo(x - 2.4, x ? 36 : 40); g.lineTo(x, x ? 37 : 41); g.fill(); } g.shadowBlur = 0;
      if (!reduceMotion) { g.strokeStyle = '#c8fff4'; g.lineWidth = 0.6; for (let i = 0; i < 8; i++) { const life = (tt * (0.25 + i * 0.03) + i * 0.37) % 1, x = (i % 3 - 1) * 9 + Math.sin(tt * 3 + i) * 1.5, y = 40 - life * 60; g.globalAlpha = Math.min(1, life * 5, (1 - life) * 3); g.beginPath(); g.arc(x, y, 0.8 + (i % 3) * 0.4, 0, 6.283); g.stroke(); } g.globalAlpha = 1; }
      break;
    default: g.fillRect(-1.5, 26, 9, 5); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-1.5, 30, 9, 1);
  }
  g.restore();
  if (o.fx === 'shimmer' && !reduceMotion) { const x = ((tt * 0.4) % 1.6 - 0.3) * Wd, gr = g.createLinearGradient(x - 20, 0, x + 20, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Hd); }
}
function gkPreview(it, kind, w) {
  const cv = document.createElement('canvas'); cv.width = Math.round(w * 1.6); cv.height = Math.round(w * 1.2);
  cv.style.width = Math.round(w * 0.95) + 'px'; cv.style.height = Math.round(w * 0.71) + 'px'; cv.className = 'gkprev';
  cv._it = it; cv._k = kind; (kind === 'ball' ? gkDrawBall : gkDrawClub)(cv, it, 0);
  return cv;
}
let gkTick = 0;
setInterval(() => {
  const card = $('gkrateCard'); if (!card || card.hidden || reduceMotion) return;
  const t = performance.now() / 1000, all = ++gkTick % 2 === 0;
  for (const cv of card.querySelectorAll('canvas.gkprev')) if (cv._it && (cv._it.fx || cv._it.trail) && (all || cv._it.adm)) (cv._k === 'ball' ? gkDrawBall : gkDrawClub)(cv, cv._it, t);
}, 50);

function gkCard(it, kind, cls) {
  const d = document.createElement('div'), ra = it ? gkRarityOf(it) : null;
  d.className = 'skincard gkskin r-' + (ra ? ra.id : 'standard') + (cls ? ' ' + cls : '');
  d.style.setProperty('--rc', ra ? ra.color : '#8f98ab');
  const level = gkLevel(it);
  if (level) { const pips = document.createElement('span'); pips.className = 'pips'; pips.setAttribute('aria-hidden', 'true'); for (let i = 0; i < level; i++) pips.appendChild(document.createElement('i')); d.appendChild(pips); }
  d.appendChild(gkPreview(it, kind, 104));
  const n = document.createElement('b'); n.textContent = it ? it.name : GK_KINDS[kind].plain; d.appendChild(n);
  const r = document.createElement('small'); r.textContent = (ra ? ra.name : 'Standard') + ' · ' + (kind === 'ball' ? 'ball' : 'clubs'); d.appendChild(r);
  return d;
}

// ---------- the card ----------
function gkShow(e) {
  try { audioInit(); } catch (err) {}
  GK.opener = e && e.currentTarget || document.activeElement;
  const k = GK.opener && GK.opener.dataset && GK.opener.dataset.kind; if (k === 'ball' || k === 'club') GK.tab = k;
  const card = $('gkrateCard'); card.hidden = false; $('gkResult').hidden = true; gkRender(); card.scrollTop = 0;
  $('gkrateClose').focus({ preventScroll: true });
}
function gkHide() {
  if (GK.opening) return;
  const card = $('gkrateCard'); if (card.hidden) return;
  card.hidden = true;
  const back = GK.opener && document.contains(GK.opener) && GK.opener.offsetParent ? GK.opener : $('gkrateBallBtn');
  if (back) try { back.focus({ preventScroll: true }); } catch (err) {}
}
function gkEquip(kind, id) {
  if (id && !GK[kind].owned[id]) return;
  GK[kind].eq = id || ''; gkSave(); gkRender();
  if (typeof GFN !== 'undefined' && GFN.code && typeof gfnSendLobby === 'function') try { gfnSendLobby(); } catch (e) {}
}
function gkRender() {
  for (const b of document.querySelectorAll('.gkrateBtn')) { const k = b.dataset.kind; if (GK[k]) b.textContent = GK_KINDS[k].btn + ' · ' + GK[k].crates; }
  const card = $('gkrateCard'); if (!card || card.hidden) return;
  const tabs = $('gkTabs'); tabs.textContent = '';
  for (const k of ['ball', 'club']) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tool' + (GK.tab === k ? ' on' : ''); b.setAttribute('aria-pressed', GK.tab === k ? 'true' : 'false'); b.textContent = k === 'ball' ? 'Balls' : 'Clubs'; b.disabled = GK.opening; b.addEventListener('click', () => { GK.tab = k; $('gkResult').hidden = true; gkRender(); }); tabs.appendChild(b); }
  const ci = $('gkTypes'); ci.textContent = '';
  for (const k of ['ball', 'club']) {
    const S = GK[k], K = GK_KINDS[k];
    const row = document.createElement('div'); row.className = 'cratetype' + (GK.tab === k ? ' viewing' : '');
    const box = document.createElement('span'); box.className = 'cratebox gkbox gk-' + k; box.setAttribute('aria-hidden', 'true');
    const nm = document.createElement('b'); nm.textContent = K.crate;
    const n = document.createElement('small'); n.textContent = (S.crates === 1 ? '1 crate' : S.crates + ' crates') + ' · ' + K.what;
    const open = document.createElement('button'); open.type = 'button'; open.className = S.crates > 0 ? 'primary small' : 'tool';
    open.textContent = GK.opening ? 'Opening…' : S.crates > 0 ? 'Open' : 'None yet'; open.disabled = S.crates <= 0 || GK.opening; open.addEventListener('click', () => gkOpen(k));
    const all = document.createElement('button'); all.type = 'button'; all.className = 'tool'; all.textContent = 'Open all'; all.hidden = S.crates < 2; all.disabled = GK.opening; all.addEventListener('click', () => gkOpenAll(k));
    row.append(box, nm, n, all, open); ci.appendChild(row);
  }
  $('gkrateClose').disabled = GK.opening;
  const lb = GK_BALL_HOLES - GK.holes % GK_BALL_HOLES, lc = GK_CLUB_HOLES - GK.holes % GK_CLUB_HOLES;
  $('gkProgress').textContent = `Next ball crate in ${lb} ${lb === 1 ? 'hole' : 'holes'}, next club crate in ${lc}. A birdie earns a ball crate too, an eagle a club crate.`;
  $('gkBar').style.setProperty('--v', ((GK.holes % GK_CLUB_HOLES) / GK_CLUB_HOLES).toFixed(2));
  const odds = $('gkOdds'); odds.textContent = '';
  for (const ra of RARITIES) { const li = document.createElement('li'); li.style.setProperty('--rc', ra.color); li.textContent = ra.name + ' · ' + (ra.odds * 100).toFixed(ra.odds < 0.01 ? 2 : 1) + '%'; odds.appendChild(li); }
  const kind = GK.tab, S = GK[kind], K = GK_KINDS[kind];
  $('gkInvHead').textContent = kind === 'ball' ? 'Your balls' : 'Your clubs';
  const inv = $('gkInv'); inv.textContent = '';
  let owned = 0, lastGrade = null;
  for (const it of [null].concat(K.list)) {
    const gr = it ? it.rarity : 'standard';
    if (gr !== lastGrade) {
      lastGrade = gr;
      const ra = it ? gkRarityOf(it) : null, mine = K.list.filter(x => x.rarity === gr);
      const sub = document.createElement('span'); sub.className = 'invsub';
      sub.textContent = ra ? `${ra.name} · ${mine.filter(x => S.owned[x.id]).length} of ${mine.length}` : 'Standard';
      inv.appendChild(sub);
    }
    const id = it ? it.id : '', count = !it ? 1 : (S.owned[id] | 0), isOn = (S.owned[S.eq] ? S.eq : '') === id;
    const c = gkCard(it, kind, (isOn ? 'equipped' : '') + (count ? '' : ' locked'));
    if (count > 1) { const dd = document.createElement('span'); dd.className = 'dupes'; dd.textContent = '×' + count; c.appendChild(dd); }
    if (count) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tool'; b.textContent = isOn ? 'Playing' : 'Play with'; b.disabled = isOn;
      b.setAttribute('aria-label', (isOn ? 'Playing with ' : 'Play with ') + (it ? it.name : K.plain));
      b.addEventListener('click', () => gkEquip(kind, id));
      c.appendChild(b);
      if (it) owned++;
    } else c.setAttribute('aria-label', it.name + ', not found yet');
    inv.appendChild(c);
  }
  $('gkCollected').textContent = owned + ' of ' + K.list.length + ' found';
}

// ---------- opening ----------
function gkOpen(k) {
  const S = GK[k]; if (GK.opening || S.crates <= 0) return;
  GK.opening = true; GK.tab = k; S.crates--; S.opened++;
  const prize = gkRoll(k); GK.pending = prize.id; gkSave();
  $('gkResult').hidden = true; gkRender();
  gkSpin(prize, k, reduceMotion ? 600 : 6000, () => gkFinish(prize));
}
function gkSpin(prize, k, dur, done) {
  requestAnimationFrame(() => {
    const sheet = $('gkrateCard'), r = $('gkReel').getBoundingClientRect(), sr = sheet.getBoundingClientRect();
    if (r.top < sr.top + 70 || r.bottom > sr.bottom - 10) sheet.scrollTo({ top: sheet.scrollTop + r.top - sr.top - sr.height * 0.25, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  const reel = $('gkReel'), strip = $('gkStrip'); strip.textContent = '';
  const N = 56, WIN = 48;
  for (let i = 0; i < N; i++) strip.appendChild(gkCard(i === WIN ? prize : gkFiller(k), k, 'reelitem'));
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
function gkFinish(prize) {
  const k = prize.kind, S = GK[k];
  GK.opening = false; S.owned[prize.id] = (S.owned[prize.id] | 0) + 1; GK.pending = null; gkSave();
  const ra = gkRarityOf(prize);
  try { sfxReveal(RARITIES.indexOf(ra)); } catch (e) {}
  const res = $('gkResult'); res.textContent = ''; res.style.setProperty('--rc', ra.color); res.className = 'result r-' + ra.id;
  const h = document.createElement('p'); h.className = 'won'; h.textContent = (S.owned[prize.id] > 1 ? 'Another ' : 'New: ') + prize.name;
  const r = document.createElement('small'); r.textContent = ra.name + ' grade · ' + (k === 'ball' ? 'ball' : 'clubs');
  const on = S.eq === prize.id;
  const eq = document.createElement('button'); eq.type = 'button'; eq.className = 'primary'; eq.textContent = on ? 'Playing' : 'Play with it'; eq.disabled = on;
  eq.addEventListener('click', () => { gkEquip(k, prize.id); eq.textContent = 'Playing'; eq.disabled = true; });
  res.append(h, r, eq); res.hidden = false; gkRender();
  if (!on) eq.focus({ preventScroll: true });
}
function gkOpenAll(k) {
  const S = GK[k], count = S.crates; if (GK.opening || count < 1) return;
  const byGrade = {}, fresh = []; let best = null;
  for (let i = 0; i < count; i++) {
    const prize = gkRoll(k), had = S.owned[prize.id] | 0; S.owned[prize.id] = had + 1;
    if (!had && !fresh.includes(prize)) fresh.push(prize);
    byGrade[prize.rarity] = (byGrade[prize.rarity] || 0) + 1;
    if (!best || gkLevel(prize) > gkLevel(best)) best = prize;
  }
  S.crates = 0; S.opened += count; gkSave();
  GK.opening = true; GK.tab = k; $('gkResult').hidden = true; gkRender();
  gkSpin(best, k, reduceMotion ? 400 : 2600, () => {
    GK.opening = false;
    const bra = gkRarityOf(best); try { sfxReveal(RARITIES.indexOf(bra)); } catch (e) {}
    const res = $('gkResult'); res.textContent = ''; res.style.setProperty('--rc', bra.color); res.className = 'result haul r-' + bra.id;
    const h = document.createElement('p'); h.className = 'won'; h.textContent = 'Opened ' + count + (count === 1 ? ' crate' : ' crates');
    const K = GK_KINDS[k], sub = document.createElement('small'); sub.textContent = (fresh.length ? fresh.length + ' new ' + (fresh.length === 1 ? K.one : K.many) : 'Nothing new this time') + ' · best: ' + best.name;
    const grades = document.createElement('ul'); grades.className = 'odds';
    for (const ra of RARITIES) { if (!byGrade[ra.id]) continue; const li = document.createElement('li'); li.style.setProperty('--rc', ra.color); li.textContent = ra.name + ' × ' + byGrade[ra.id]; grades.appendChild(li); }
    res.append(h, sub, grades);
    if (fresh.length) { const strip = document.createElement('div'); strip.className = 'haulstrip'; for (const it of fresh.sort((a, b) => gkLevel(b) - gkLevel(a))) strip.appendChild(gkCard(it, k, 'reelitem')); res.appendChild(strip); }
    res.hidden = false; gkRender();
  });
}

// ---------- hooked onto the round (src/golf.js) and the round together (src/golfnet.js) ----------
// each hole's end earns towards crates; and your looks go out with your name, so the others see your outfit, ball and clubs
if (typeof gfHoleDone === 'function') { const o = gfHoleDone; gfHoleDone = function () { const r = o.apply(this, arguments); try { gkHole(); } catch (e) {} return r; }; }
if (typeof gfnBase === 'function') { const o = gfnBase; gfnBase = function () { const z = o.apply(this, arguments), m = gkMine(); z.lk = [m.oc, m.ball, m.club]; return z; }; }

gkLoad();
for (const b of document.querySelectorAll('.gkrateBtn')) b.addEventListener('click', gkShow);
if ($('gkrateClose')) $('gkrateClose').addEventListener('click', gkHide);
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const card = $('gkrateCard'); if (!card || card.hidden) return;
  e.preventDefault(); e.stopPropagation(); gkHide();
}, true);
gkRender();
