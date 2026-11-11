// Wreckers' Night: outfit crates, skins for your wrecker.
//
// A crate system of its own, beside the weapon crates (wcrates.js) and kept apart from them and from the boat and
// banner crates: its own save (localStorage 'skerry-ocrates'), count and card, opened from Outfit crates on the
// Wreckers' Night card. It borrows the boat crates' grades and odds (RARITIES), their card styles and the reel
// sounds, without changing any of them.
//
// An outfit dresses your figure (fpsbody.js): the coat, its trim, the sash and waistcoat, the breeches, the
// buttons, and the hat and its style (a tricorn, a bicorne, a sou'wester, a knitted watch cap, or a hood). It's
// what everyone else on the island sees you in, too. The better the grade, the more it does:
//   Deckhand  working clothes, in the colours of the sea's trades
//   Bosun     uniforms and better cloth: a bicorne, gold buttons
//   Mate      the trim shimmers
//   Captain   trim and sash glow, pulsing, and the eyes glow
//   Admiral   the whole coat alight, glowing eyes, and a halo; each its own living light (src/ocadmiral.js): the
//             Drowned Captain deep water and ghost-fire, the Keeper of the Light gold filigree and the beam
// Without one you wear your boat skin's colours, as before.
//
// Earning: one crate for every 6 kills (the count carries over), and one for each round you see out ashore
// (a minute or more of it). The first one is free.
//
// The global API, for the figures (fpsbody.js) and fps.js:
//   ocEquippedId()  -> the outfit you wear ('' for none)
//   ocOutfit(id)    -> an outfit by id (null for none or an unknown one)
//   ocEarn(why)     -> 'kill' | 'round'

const OC_KEY = 'skerry-ocrates';
const OC_KILLS_PER_CRATE = 6;
const OC_ROUND_MIN_SECONDS = 60;

// [id, name, rarity, coat, trim, sash, hat, style, extra]
const OC_ROWS = [
  ['oc_oilskin', 'Oilskin Yellow',          'deckhand', '#d8b030', '#6a5010', '#2a2a2a', '#d8b030', 'souwester'],
  ['oc_pea',     'Navy Pea Coat',           'deckhand', '#1e2a44', '#c8c0a0', '#8a1a1a', '#1e2a44', 'watchcap'],
  ['oc_gansey',  'Fisher’s Gansey',         'deckhand', '#6a4a2a', '#c8b890', '#3a6a8a', '#8a2a1a', 'watchcap'],
  ['oc_tar',     'Tarred Canvas',           'deckhand', '#2a2620', '#5a5040', '#a07030', '#141210', 'tricorn'],
  ['oc_marsh',   'Saltmarsh Green',         'deckhand', '#3a5a3a', '#a0a070', '#d8c070', '#2a3a2a', 'tricorn'],
  ['oc_brick',   'Brick Red Smock',         'deckhand', '#8a3020', '#e0c890', '#2a4060', '#e0c890', 'watchcap'],
  ['oc_bosun',   'Bosun’s Blues',           'bosun',    '#24407a', '#e0c060', '#a02828', '#14203a', 'bicorne',   { brass: '#e0c060' }],
  ['oc_customs', 'Customs Man',             'bosun',    '#2a2a30', '#c03030', '#c03030', '#18181c', 'bicorne'],
  ['oc_whaler',  'Whaler',                  'bosun',    '#4a5a5a', '#d0c0a0', '#6a3a1a', '#3a4a4a', 'souwester'],
  ['oc_harbour', 'Harbourmaster',           'bosun',    '#e8e0d0', '#2a3a5a', '#2a3a5a', '#e8e0d0', 'tricorn',   { breeches: '#e0d8c8', brass: '#d8b860' }],
  ['oc_phos',    'Phosphor Watch',          'mate',     '#0c3a3c', '#62ffd4', '#1a6a5a', '#0a2a2a', 'watchcap',  { fx: 'shimmer' }],
  ['oc_petrel',  'Storm Petrel',            'mate',     '#2a3040', '#b8f0ff', '#4a6a8a', '#1a1e28', 'souwester', { fx: 'shimmer' }],
  ['oc_smuggler','Ember Smuggler',          'mate',     '#3a1208', '#ff8a30', '#ffb050', '#200a04', 'tricorn',   { fx: 'shimmer' }],
  ['oc_corpse',  'The Corpse Light',        'captain',  '#1a2a20', '#7affb0', '#3a6a4a', '#121a16', 'hood',      { fx: 'glow', eyes: '#b8ffd8' }],
  ['oc_gold',    'Admiralty Gold',          'captain',  '#142040', '#ffd34d', '#ffd34d', '#0e1630', 'bicorne',   { fx: 'glow', eyes: '#fff0b0', brass: '#ffd34d' }],
  ['oc_herald',  'The Kraken’s Herald',     'captain',  '#2a0e3a', '#c06aff', '#8a3acc', '#1a0828', 'tricorn',   { fx: 'glow', eyes: '#e0a8ff' }],
  ['oc_drowned', 'The Drowned Captain',     'admiral',  '#0e2a2a', '#7affe0', '#1aa08a', '#082020', 'hood',      { fx: 'aura', adm: 'drowned', glow: '#7affe0', eyes: '#c8fff0', halo: '#4affd8' }],
  ['oc_keeper',  'The Keeper of the Light', 'admiral',  '#e8d8a8', '#ffd34d', '#fff0b0', '#f4ecd0', 'tricorn',   { fx: 'aura', adm: 'keeper', glow: '#ffd88a', eyes: '#fff4c8', halo: '#ffe08a', breeches: '#d8c8a0', brass: '#ffe08a' }],
  // [pirate tokens] src/zmegg.js: only ever unlocked with the Lighthouse's pirate tokens, never in a crate (no crate rolls 'pirate')
  ['oc_gannetcap','Captain of the Gannet',  'pirate',   '#141a22', '#e0b040', '#8a1a1a', '#0c0e12', 'bicorne',   { fx: 'aura', glow: '#7affd0', eyes: '#c8fff0', halo: '#3ee0b4', brass: '#ffd34d', waist: '#3a1410', breeches: '#2a2420' }],
  ['oc_marenoil', 'Maren’s Oilskins',       'pirate',   '#c8962a', '#fff0b0', '#2a4a6a', '#b8862a', 'souwester', { fx: 'glow', glow: '#ffd88a', eyes: '#fff4c8', halo: '#ffe0a0', breeches: '#3a3a3a', brass: '#e0c060' }],
  // [verity] Verity's Wardrobe (src/verityfx.js): only ever dropped by Verity, in Maren's End, never in a crate
  ['vy_grin',    'Verity’s Grin',          'pirate',   '#e8d41a', '#1a1406', '#060504', '#e8d41a', 'verity',    { fx: 'aura', vy: 1, glow: '#ffe24a', halo: '#ffd820', brass: '#060504', waist: '#2a2208', breeches: '#b8a414' }],
];
const OC_OUTFITS = OC_ROWS.map(([id, name, rarity, coat, trim, sash, hat, style, x]) => Object.freeze(Object.assign({ id, name, rarity, coat, trim, sash, hat, style }, x || {})));
const OC_BY_ID = Object.fromEntries(OC_OUTFITS.map(o => [o.id, o]));
const ocOutfit = id => (typeof id === 'string' && OC_BY_ID[id]) || null;
const ocRarityOf = o => RARITIES.find(r => r.id === o.rarity) || (o.rarity === 'pirate' ? rarityPirate(o) : undefined);   // [pirate tokens] ([verity] his own grade's name)
const ocLevel = o => o && o.rarity ? (o.rarity === 'pirate' ? 6 : RARITIES.findIndex(r => r.id === o.rarity) + 1) : 0;

const OC = { crates: 0, opened: 0, kills: 0, owned: {}, equipped: '', pending: null, opening: false, opener: null, ashore: 0, wasOn: false };

// ---------- saving ----------
function ocLoad() {
  let fresh = true;
  try {
    const raw = localStorage.getItem(OC_KEY);
    if (raw) {
      fresh = false;
      const d = JSON.parse(raw) || {}, n = v => Math.max(0, Math.min(99999, v | 0));
      OC.crates = n(d.crates); OC.opened = n(d.opened); OC.kills = n(d.kills) % OC_KILLS_PER_CRATE;
      OC.owned = {}; if (d.owned && typeof d.owned === 'object') for (const [id, c] of Object.entries(d.owned)) if (OC_BY_ID[id] && n(c)) OC.owned[id] = n(c);
      if (OC_BY_ID[d.pending]) OC.owned[d.pending] = (OC.owned[d.pending] | 0) + 1;
      OC.equipped = OC_BY_ID[d.equipped] && OC.owned[d.equipped] ? d.equipped : '';
    }
  } catch (e) {}
  if (fresh) OC.crates = 1;
  OC.pending = null;
  ocSave();
}
function ocSave() { try { localStorage.setItem(OC_KEY, JSON.stringify({ crates: OC.crates, opened: OC.opened, kills: OC.kills, owned: OC.owned, equipped: OC.equipped, pending: OC.pending })); } catch (e) {} }
// for the one save that carries everything (src/crates.js saveData / mergeSave): what's yours, and folding another
// save in (every outfit either side has, crates by everything ever earned; its outfit worn only if takeLooks)
function ocData() { return { crates: OC.crates, opened: OC.opened, owned: OC.owned, equipped: OC.equipped }; }
function ocMerge(d, takeLooks) {
  if (!d || typeof d !== 'object') return false;
  let changed = false;
  const n = v => Math.max(0, Math.min(99999, v | 0));
  if (d.owned && typeof d.owned === 'object') for (const [id, c] of Object.entries(d.owned)) if (OC_BY_ID[id] && n(c) > (OC.owned[id] | 0)) { OC.owned[id] = n(c); changed = true; }
  const earned = Math.max(n(d.crates) + n(d.opened), OC.crates + OC.opened), opened = Math.max(OC.opened, n(d.opened)), left = Math.min(99999, Math.max(0, earned - opened));
  if (left !== OC.crates || opened !== OC.opened) { OC.crates = left; OC.opened = opened; changed = true; }
  if (takeLooks && OC_BY_ID[d.equipped] && OC.owned[d.equipped] && OC.equipped !== d.equipped) { OC.equipped = d.equipped; changed = true; }
  if (changed) ocSave();
  return changed;
}
function ocEquippedId() { return OC.equipped && OC.owned[OC.equipped] ? OC.equipped : ''; }

// ---------- earning ----------
function ocGrant(n, why) {
  OC.crates = Math.min(99999, OC.crates + n); ocSave(); ocRender();
  const short = '+' + n + ' outfit crate' + (n > 1 ? 's' : '');
  if (typeof FPS !== 'undefined' && FPS.on && typeof fpsFeed === 'function') fpsFeed(short + ' (' + why + ')');
  else if (typeof toast === 'function') toast(short + ': ' + why + '. Open it from the Wreckers’ Night card.', short);
}
function ocEarn(why) {
  if (why === 'kill') { OC.kills++; if (OC.kills >= OC_KILLS_PER_CRATE) { OC.kills = 0; ocGrant(1, OC_KILLS_PER_CRATE + ' kills'); } else { ocSave(); ocRender(); } }
  else if (why === 'round') { const ok = OC.ashore >= OC_ROUND_MIN_SECONDS; OC.ashore = 0; if (ok) ocGrant(1, 'saw the round out'); }
}
setInterval(() => { const on = typeof FPS !== 'undefined' && !!FPS.on; if (on) OC.ashore++; else if (OC.wasOn) OC.ashore = 0; OC.wasOn = on; }, 1000);

// ---------- rolling ----------
function ocRoll() {
  let r = Math.random(), rarity = RARITIES[0];
  for (const ra of RARITIES) { if (r < ra.odds) { rarity = ra; break; } r -= ra.odds; }
  const pool = OC_OUTFITS.filter(o => o.rarity === rarity.id);
  return pool[(Math.random() * pool.length) | 0];
}
// a wrecker's outfit (the bots): about half come ashore in one, rolled at the crate's own odds; or an Admiral's
function ocBotOutfit(admiral) {
  if (admiral) { const pool = OC_OUTFITS.filter(o => o.rarity === 'admiral'); return pool[(Math.random() * pool.length) | 0].id; }
  return Math.random() < 0.55 ? ocRoll().id : '';
}
function ocFiller() { let o; do { o = ocRoll(); } while (o.rarity === 'admiral'); return o; }

// ---------- pictures: the wrecker, from the front, in the outfit ----------
function ocDrawPreview(cv, oc, t) {
  const g = cv.getContext('2d'), Wd = cv.width, Hd = cv.height, k = Hd / 100;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  g.fillStyle = '#121a28'; g.fillRect(0, 0, Wd, Hd);
  const plain = { coat: '#3a2a1e', trim: '#7a5a3a', sash: '#a03028', hat: '#1b1713', style: 'tricorn' };
  const o = oc || plain, cx = Wd / 2;
  g.save(); g.translate(cx, 0); g.scale(k, k);
  const tt = reduceMotion ? 0 : t;
  const pulse = o.fx === 'shimmer' ? 0.35 + 0.3 * Math.sin(tt * 2.2) : o.fx === 'glow' ? 0.6 + 0.3 * Math.sin(tt * 1.8) : o.fx === 'aura' ? 0.75 + 0.25 * Math.sin(tt * 2.6) : 0;
  if (o.adm) ocAdmDraw(g, o, tt, 0);
  // the halo
  if (o.halo && !o.adm) { const gr = g.createRadialGradient(0, 50, 4, 0, 50, 46); gr.addColorStop(0, o.halo + 'aa'); gr.addColorStop(1, o.halo + '00'); g.globalAlpha = 0.5 + 0.3 * Math.sin(tt * 1.6); g.fillStyle = gr; g.fillRect(-50, 0, 100, 100); g.globalAlpha = 1; }
  const glowOn = (col, f) => { if (!o.fx) return; g.shadowColor = col; g.shadowBlur = 4 + f * 10; };
  const off = () => { g.shadowBlur = 0; };
  // boots and breeches
  g.fillStyle = '#2a1c14'; g.fillRect(-11, 80, 8, 16); g.fillRect(3, 80, 8, 16);
  g.fillStyle = o.breeches || '#4a3f33'; g.fillRect(-11, 66, 8, 15); g.fillRect(3, 66, 8, 15);
  // the coat, open at the front over the waistcoat
  if (o.fx === 'aura') glowOn(o.glow || o.trim, pulse);
  g.fillStyle = o.coat; g.beginPath(); g.moveTo(-17, 36); g.lineTo(17, 36); g.lineTo(21, 86); g.lineTo(-21, 86); g.closePath(); g.fill(); off();
  if (o.adm) ocAdmDraw(g, o, tt, 1);
  g.fillStyle = o.waist || '#3a2e24'; g.beginPath(); g.moveTo(-6, 37); g.lineTo(6, 37); g.lineTo(5, 66); g.lineTo(-5, 66); g.closePath(); g.fill();
  // trim, lapels, sash, buttons
  glowOn(o.glow || o.trim, pulse);
  g.fillStyle = o.trim; g.fillRect(-8, 37, 3, 48); g.fillRect(5, 37, 3, 48); g.fillRect(-21, 83, 42, 3);
  g.fillStyle = o.sash; g.fillRect(-16, 58, 32, 4); g.fillRect(-18, 58, 4, 12);
  off();
  g.fillStyle = o.brass || '#b8913c'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-10, 42 + i * 9, 1.2, 0, 6.28); g.fill(); g.beginPath(); g.arc(10, 42 + i * 9, 1.2, 0, 6.28); g.fill(); }
  // arms
  g.fillStyle = o.coat; g.fillRect(-24, 38, 7, 30); g.fillRect(17, 38, 7, 30);
  g.fillStyle = o.trim; g.fillRect(-24, 64, 7, 4); g.fillRect(17, 64, 7, 4);
  g.fillStyle = '#9a7058'; g.fillRect(-23, 68, 5, 5); g.fillRect(18, 68, 5, 5);
  // the head
  g.fillStyle = '#9a7058'; g.beginPath(); g.ellipse(0, 26, 8, 9.5, 0, 0, 6.28); g.fill();
  g.fillStyle = '#d6cfbd'; g.beginPath(); g.moveTo(-4, 35); g.lineTo(4, 35); g.lineTo(0, 41); g.closePath(); g.fill();
  // eyes
  if (o.eyes) { glowOn(o.eyes, pulse); g.fillStyle = o.eyes; g.fillRect(-4.5, 24, 2.4, 2); g.fillRect(2.1, 24, 2.4, 2); off(); }
  else { g.fillStyle = '#2a1c14'; g.fillRect(-4, 24.5, 1.6, 1.6); g.fillRect(2.4, 24.5, 1.6, 1.6); }
  // the hat
  g.fillStyle = o.hat;
  if (o.style === 'bicorne') { g.beginPath(); g.moveTo(-20, 19); g.quadraticCurveTo(-12, 3, 0, 1); g.quadraticCurveTo(12, 3, 20, 19); g.closePath(); g.fill(); glowOn(o.glow || o.trim, pulse); g.strokeStyle = o.trim; g.lineWidth = 1.2; g.stroke(); off(); g.fillStyle = o.sash; g.beginPath(); g.arc(0, 11, 2.5, 0, 6.28); g.fill(); }
  else if (o.style === 'souwester') { g.beginPath(); g.ellipse(0, 18, 9.5, 8, 0, Math.PI, 0); g.fill(); g.beginPath(); g.moveTo(-16, 21); g.quadraticCurveTo(0, 13, 16, 21); g.lineTo(14, 23); g.quadraticCurveTo(0, 17, -14, 23); g.closePath(); g.fill(); g.strokeStyle = o.trim; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-7, 22); g.lineTo(-6, 36); g.moveTo(7, 22); g.lineTo(6, 36); g.stroke(); }
  else if (o.style === 'watchcap') { g.beginPath(); g.ellipse(0, 19, 8.6, 9, 0, Math.PI, 0); g.fill(); g.fillStyle = o.trim; g.fillRect(-8.8, 17, 17.6, 4); }
  else if (o.style === 'hood') { g.beginPath(); g.moveTo(-12, 40); g.quadraticCurveTo(-14, 10, 0, 9); g.quadraticCurveTo(14, 10, 12, 40); g.lineTo(8, 40); g.quadraticCurveTo(10, 18, 0, 17); g.quadraticCurveTo(-10, 18, -8, 40); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-8, 17, 16, 6); }
  else { g.beginPath(); g.moveTo(-17, 18); g.lineTo(17, 18); g.lineTo(9, 9); g.lineTo(0, 11); g.lineTo(-9, 9); g.closePath(); g.fill(); g.fillRect(-8, 10, 16, 7); glowOn(o.glow || o.trim, pulse); g.strokeStyle = o.trim; g.lineWidth = 1; g.beginPath(); g.moveTo(-17, 18); g.lineTo(-9, 9); g.moveTo(17, 18); g.lineTo(9, 9); g.stroke(); off(); }
  // sparkles on the Admirals' (and the two Admirals' own: bubbles rising, or warm motes)
  if (o.adm) ocAdmDraw(g, o, tt, 2);
  else if (o.fx === 'aura' && !reduceMotion) { g.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { const a = tt * 0.8 + i * 1.26, r = 30 + 6 * Math.sin(tt * 2 + i); if (Math.sin(tt * 3 + i * 2) > 0.2) g.fillRect(Math.cos(a) * r * 0.7 - 0.8, 50 + Math.sin(a) * r - 0.8, 1.6, 1.6); } }
  g.restore();
}
// the Admirals' own light, in the picture (as on the figure, src/ocadmiral.js). step 0: behind the figure (the
// halo, and the deep water's light or the lighthouse beam); 1: over the coat (veins, caustics and drips, or gold
// filigree and the beam sweeping across); 2: in front (bubbles, or motes)
function ocAdmDraw(g, o, t, step) {
  const dr = o.adm === 'drowned', P = (n, k) => 0.5 + 0.5 * Math.sin(t * k + n);
  g.save();
  if (step === 0) {
    g.globalCompositeOperation = 'lighter';
    if (dr) {
      // shafts of light down through the water
      for (let i = 0; i < 4; i++) { const x = -60 + i * 34 + 10 * Math.sin(t * 0.4 + i * 2); g.globalAlpha = 0.07 + 0.06 * P(i * 1.7, 0.9); g.fillStyle = '#5affd8'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 10, 0); g.lineTo(x + 28, 100); g.lineTo(x + 14, 100); g.closePath(); g.fill(); }
      // the ghost-fire halo: tongues of green flame round the head
      g.globalAlpha = 1; g.shadowColor = '#3affc8'; g.shadowBlur = 6;
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * Math.PI * 2, up = 0.55 + 0.45 * Math.cos(a), len = (2 + 7 * up) * (0.5 + 0.5 * P(i * 2.3, 7 + (i % 3)));
        const ca = Math.sin(a), sa = -Math.cos(a), r0 = 12;
        g.fillStyle = i % 2 ? '#3affc8' : '#9affe6'; g.globalAlpha = 0.5 + 0.4 * P(i, 5);
        g.beginPath(); g.moveTo(ca * r0 - sa * 1.6, 25 + sa * r0 + ca * 1.6); g.lineTo(ca * (r0 + len) + sa * Math.sin(t * 6 + i) * 1.2, 25 + sa * (r0 + len)); g.lineTo(ca * r0 + sa * 1.6, 25 + sa * r0 - ca * 1.6); g.closePath(); g.fill();
      }
      g.globalAlpha = 0.9; g.strokeStyle = '#c8fff4'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 25, 12, 0, 6.283); g.stroke();
    } else {
      // the lighthouse beam turning round behind, and its fainter twin
      const b = t * 0.9;
      for (const [off, al] of [[0, 0.3], [Math.PI, 0.14]]) {
        const a = b + off; g.globalAlpha = al * (0.6 + 0.4 * Math.abs(Math.cos(a))); g.fillStyle = '#fff0b8';
        g.beginPath(); g.moveTo(0, 25); g.lineTo(Math.cos(a - 0.13) * 90, 25 + Math.sin(a - 0.13) * 40); g.lineTo(Math.cos(a + 0.13) * 90, 25 + Math.sin(a + 0.13) * 40); g.closePath(); g.fill();
      }
      // the radiant halo: rays turning both ways, a ring, and jewels going round it
      g.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + t * 0.35, l = i % 2 ? 7 : 11; g.globalAlpha = 0.35 + 0.3 * P(i, 2); g.strokeStyle = '#ffd34d'; g.lineWidth = i % 2 ? 0.7 : 1.1; g.beginPath(); g.moveTo(Math.cos(a) * 14, 25 + Math.sin(a) * 14); g.lineTo(Math.cos(a) * (14 + l), 25 + Math.sin(a) * (14 + l)); g.stroke(); }
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 - t * 0.22; g.globalAlpha = 0.25; g.strokeStyle = '#fff6d8'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(Math.cos(a) * 13, 25 + Math.sin(a) * 13); g.lineTo(Math.cos(a) * 25, 25 + Math.sin(a) * 25); g.stroke(); }
      g.globalAlpha = 1; g.shadowColor = '#ffc23a'; g.shadowBlur = 6; g.strokeStyle = '#ffd34d'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 25, 13, 0, 6.283); g.stroke();
      g.fillStyle = '#fff6d8'; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + t * 0.3; g.beginPath(); g.arc(Math.cos(a) * 13, 25 + Math.sin(a) * 13, 1, 0, 6.283); g.fill(); }
    }
  } else if (step === 1) {
    g.beginPath(); g.moveTo(-17, 36); g.lineTo(17, 36); g.lineTo(21, 86); g.lineTo(-21, 86); g.closePath(); g.clip();
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    if (dr) {
      // caustics drifting over it
      g.strokeStyle = '#5affd8'; g.lineWidth = 0.6;
      for (let i = 0; i < 6; i++) { const y0 = 38 + i * 8 + 3 * Math.sin(t * 0.7 + i); g.globalAlpha = 0.14 + 0.1 * P(i, 1.3); g.beginPath(); for (let x = -22; x <= 22; x += 4) g.lineTo(x, y0 + 2.5 * Math.sin(x * 0.35 + t * 1.6 + i * 1.9)); g.stroke(); }
      // veins, pulses of light climbing them
      g.strokeStyle = '#7affe0'; g.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) {
        const x0 = -13 + i * 8.5; g.beginPath(); for (let y = 86; y >= 36; y -= 3) g.lineTo(x0 + 2.4 * Math.sin(y * 0.22 + i * 1.7), y);
        g.globalAlpha = 0.3; g.setLineDash([]); g.stroke();
        g.globalAlpha = 1; g.shadowColor = '#3affc8'; g.shadowBlur = 4; g.setLineDash([5, 14]); g.lineDashOffset = t * 18 + i * 6; g.stroke(); g.shadowBlur = 0;
      }
      g.setLineDash([]);
      // water running down it
      g.fillStyle = '#c8fff4'; for (let i = 0; i < 3; i++) { const y = 36 + ((t * (14 + i * 5) + i * 17) % 52), x = -15 + i * 14; g.globalAlpha = 0.9; g.fillRect(x - 0.5, y, 1, 1.6); g.globalAlpha = 0.3; g.fillRect(x - 0.4, y - 5, 0.8, 5); }
    } else {
      // gold filigree, shimmering
      g.strokeStyle = '#ffc23a'; g.lineWidth = 0.7; g.shadowColor = '#ffd34d'; g.shadowBlur = 3;
      for (let i = 0; i < 6; i++) {
        const sx = i % 2 ? 1 : -1, y = 44 + (i >> 1) * 14, x = sx * 13; g.globalAlpha = 0.55 + 0.45 * P(i * 1.3 + y * 0.1, 2.2);
        g.beginPath(); g.arc(x, y, 3.2, 0, 4.7); g.stroke(); g.beginPath(); g.arc(x - sx * 3.5, y + 4.5, 2, 3.1, 7.5); g.stroke();
        g.beginPath(); g.moveTo(x, y + 3.2); g.quadraticCurveTo(x + sx * 5, y + 7, x + sx * 2, y + 11); g.stroke();
      }
      g.shadowBlur = 0;
      // the beam sweeping across
      const bx = ((t * 16) % 70) - 35, gr = g.createLinearGradient(bx - 7, 0, bx + 7, 0);
      gr.addColorStop(0, 'rgba(255,246,216,0)'); gr.addColorStop(0.5, 'rgba(255,246,216,0.55)'); gr.addColorStop(1, 'rgba(255,246,216,0)');
      g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(bx - 7, 36, 14, 50);
    }
  } else {
    g.globalCompositeOperation = 'lighter';
    if (dr) {
      g.strokeStyle = '#c8fff4'; g.lineWidth = 0.6;
      for (let i = 0; i < 10; i++) { const life = (t * (0.18 + i * 0.013) + i * 0.37) % 1, x = (i % 2 ? 1 : -1) * (24 + (i * 7) % 14) + 2 * Math.sin(t * 2.4 + i), y = 96 - life * 86, r = 0.8 + (i % 3) * 0.5;
        g.globalAlpha = Math.min(1, life * 6, (1 - life) * 3); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.stroke(); }
    } else {
      g.fillStyle = '#ffe08a';
      for (let i = 0; i < 12; i++) { const life = (t * (0.12 + i * 0.01) + i * 0.29) % 1, a = i * 2.1 + life * 4, x = Math.cos(a) * (22 + (i % 4) * 4), y = 94 - life * 88;
        g.globalAlpha = Math.min(1, life * 6, (1 - life) * 3) * (0.5 + 0.5 * P(i * 3, 6)); g.fillRect(x - 0.7, y - 0.7, 1.4, 1.4); }
    }
  }
  g.restore();
}
function ocPreview(oc, w) {
  const cv = document.createElement('canvas'); cv.width = Math.round(w * 1.6); cv.height = Math.round(w * 1.2);
  cv.style.width = Math.round(w * 0.95) + 'px'; cv.style.height = Math.round(w * 0.71) + 'px'; cv.className = 'ocprev';
  cv._oc = oc; ocDrawPreview(cv, oc, 0);
  return cv;
}
// (the Admirals' twice as often as the rest, so they move smoothly)
let ocTick = 0;
setInterval(() => {
  const card = $('ocrateCard'); if (!card || card.hidden || reduceMotion) return;
  const t = performance.now() / 1000, all = ++ocTick % 2 === 0;
  for (const cv of card.querySelectorAll('canvas.ocprev')) if (cv._oc && cv._oc.fx && (all || cv._oc.adm)) ocDrawPreview(cv, cv._oc, t);
}, 50);

function ocCard(oc, cls) {
  const d = document.createElement('div'), ra = oc && oc.rarity ? ocRarityOf(oc) : null;
  d.className = 'skincard ocskin r-' + (ra ? ra.id : 'standard') + (cls ? ' ' + cls : '');
  d.style.setProperty('--rc', ra ? ra.color : '#8f98ab');
  const level = ocLevel(oc);
  if (level) { const pips = document.createElement('span'); pips.className = 'pips'; pips.setAttribute('aria-hidden', 'true'); for (let i = 0; i < level; i++) pips.appendChild(document.createElement('i')); d.appendChild(pips); }
  d.appendChild(ocPreview(oc, 104));
  const n = document.createElement('b'); n.textContent = oc ? oc.name : 'Your boat’s colours'; d.appendChild(n);
  const r = document.createElement('small'); r.textContent = (ra ? ra.name : 'Standard') + ' · outfit'; d.appendChild(r);
  return d;
}

// ---------- the card ----------
function ocShow(e) {
  try { audioInit(); } catch (err) {}
  OC.opener = e && e.currentTarget || document.activeElement;
  const card = $('ocrateCard'); card.hidden = false; ocRender(); card.scrollTop = 0;
  $('ocrateClose').focus({ preventScroll: true });
}
function ocHide() {
  if (OC.opening) return;
  const card = $('ocrateCard'); if (card.hidden) return;
  card.hidden = true;
  const back = OC.opener && document.contains(OC.opener) && OC.opener.offsetParent ? OC.opener : $('ocrateBtn');
  if (back) try { back.focus({ preventScroll: true }); } catch (err) {}
}
function ocEquip(id) {
  if (id && !OC.owned[id]) return;
  OC.equipped = id || ''; ocSave(); ocRender();
  if (typeof FPS !== 'undefined' && FPS.on && typeof fpsSend === 'function') fpsSend();
}
function ocRender() {
  for (const b of document.querySelectorAll('.ocrateBtn')) b.textContent = 'Outfit crates · ' + OC.crates;
  const card = $('ocrateCard'); if (!card || card.hidden) return;
  const ci = $('ocTypes'); ci.textContent = '';
  const row = document.createElement('div'); row.className = 'cratetype viewing';
  const box = document.createElement('span'); box.className = 'cratebox ocbox'; box.setAttribute('aria-hidden', 'true');
  const nm = document.createElement('b'); nm.textContent = 'Tailor’s Crate';
  const n = document.createElement('small'); n.textContent = (OC.crates === 1 ? '1 crate' : OC.crates + ' crates') + ' · an outfit for your wrecker';
  const open = document.createElement('button'); open.type = 'button'; open.className = OC.crates > 0 ? 'primary small' : 'tool';
  open.textContent = OC.opening ? 'Opening…' : OC.crates > 0 ? 'Open' : 'None yet'; open.disabled = OC.crates <= 0 || OC.opening; open.addEventListener('click', ocOpen);
  const all = document.createElement('button'); all.type = 'button'; all.className = 'tool'; all.textContent = 'Open all'; all.hidden = OC.crates < 2; all.disabled = OC.opening; all.addEventListener('click', ocOpenAll);
  row.append(box, nm, n, all, open); ci.appendChild(row);
  $('ocrateClose').disabled = OC.opening;
  const left = OC_KILLS_PER_CRATE - OC.kills;
  $('ocProgress').textContent = 'Next crate in ' + left + (left === 1 ? ' kill' : ' kills') + ' (' + OC.kills + ' of ' + OC_KILLS_PER_CRATE + '), or see a round out on the island.';
  $('ocBar').style.setProperty('--v', (OC.kills / OC_KILLS_PER_CRATE).toFixed(2));
  const odds = $('ocOdds'); odds.textContent = '';
  for (const ra of RARITIES) { const li = document.createElement('li'); li.style.setProperty('--rc', ra.color); li.textContent = ra.name + ' · ' + (ra.odds * 100).toFixed(ra.odds < 0.01 ? 2 : 1) + '%'; odds.appendChild(li); }
  const inv = $('ocInv'); inv.textContent = '';
  let owned = 0, lastGrade = null;
  for (const oc of [null].concat(OC_OUTFITS.filter(o => o.rarity !== 'pirate' || OC.owned[o.id]))) {   // [pirate tokens] shown once unlocked
    const gr = oc ? oc.rarity : 'standard';
    if (gr !== lastGrade) {
      lastGrade = gr;
      const ra = oc ? ocRarityOf(oc) : null, mine = OC_OUTFITS.filter(k => k.rarity === gr);
      const sub = document.createElement('span'); sub.className = 'invsub';
      sub.textContent = ra ? `${ra.name} · ${mine.filter(k => OC.owned[k.id]).length} of ${mine.length}` : 'Standard';
      inv.appendChild(sub);
    }
    const id = oc ? oc.id : '', count = !oc ? 1 : (OC.owned[id] | 0), isOn = ocEquippedId() === id;
    const c = ocCard(oc, (isOn ? 'equipped' : '') + (count ? '' : ' locked'));
    if (count > 1) { const dd = document.createElement('span'); dd.className = 'dupes'; dd.textContent = '×' + count; c.appendChild(dd); }
    if (count) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tool'; b.textContent = isOn ? 'Wearing' : 'Wear'; b.disabled = isOn;
      b.setAttribute('aria-label', (isOn ? 'Wearing: ' : 'Wear ') + (oc ? oc.name : 'your boat’s colours'));
      b.addEventListener('click', () => ocEquip(id));
      c.appendChild(b);
      if (oc) owned++;
    } else c.setAttribute('aria-label', oc.name + ', not found yet');
    inv.appendChild(c);
  }
  $('ocCollected').textContent = owned + ' of ' + OC_OUTFITS.filter(o => o.rarity !== 'pirate' || OC.owned[o.id]).length + ' found';
}

// ---------- opening ----------
function ocOpen() {
  if (OC.opening || OC.crates <= 0) return;
  OC.opening = true; OC.crates--; OC.opened++;
  const prize = ocRoll(); OC.pending = prize.id; ocSave();
  $('ocResult').hidden = true; ocRender();
  ocSpin(prize, reduceMotion ? 600 : 6000, () => ocFinish(prize));
}
function ocSpin(prize, dur, done) {
  requestAnimationFrame(() => {
    const sheet = $('ocrateCard'), r = $('ocReel').getBoundingClientRect(), sr = sheet.getBoundingClientRect();
    if (r.top < sr.top + 70 || r.bottom > sr.bottom - 10) sheet.scrollTo({ top: sheet.scrollTop + r.top - sr.top - sr.height * 0.25, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  const reel = $('ocReel'), strip = $('ocStrip'); strip.textContent = '';
  const N = 56, WIN = 48;
  for (let i = 0; i < N; i++) strip.appendChild(ocCard(i === WIN ? prize : ocFiller(), 'reelitem'));
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
function ocFinish(prize) {
  OC.opening = false; OC.owned[prize.id] = (OC.owned[prize.id] | 0) + 1; OC.pending = null; ocSave();
  const ra = ocRarityOf(prize);
  try { sfxReveal(RARITIES.indexOf(ra)); } catch (e) {}
  const res = $('ocResult'); res.textContent = ''; res.style.setProperty('--rc', ra.color); res.className = 'result r-' + ra.id;
  const h = document.createElement('p'); h.className = 'won'; h.textContent = (OC.owned[prize.id] > 1 ? 'Another ' : 'New: ') + prize.name;
  const r = document.createElement('small'); r.textContent = ra.name + ' grade · outfit';
  const on = ocEquippedId() === prize.id;
  const eq = document.createElement('button'); eq.type = 'button'; eq.className = 'primary'; eq.textContent = on ? 'Wearing' : 'Wear it'; eq.disabled = on;
  eq.addEventListener('click', () => { ocEquip(prize.id); eq.textContent = 'Wearing'; eq.disabled = true; });
  res.append(h, r, eq); res.hidden = false; ocRender();
  if (!on) eq.focus({ preventScroll: true });
}
function ocOpenAll() {
  const count = OC.crates; if (OC.opening || count < 1) return;
  const byGrade = {}, fresh = []; let best = null;
  for (let i = 0; i < count; i++) {
    const prize = ocRoll(), had = OC.owned[prize.id] | 0; OC.owned[prize.id] = had + 1;
    if (!had && !fresh.includes(prize)) fresh.push(prize);
    byGrade[prize.rarity] = (byGrade[prize.rarity] || 0) + 1;
    if (!best || ocLevel(prize) > ocLevel(best)) best = prize;
  }
  OC.crates = 0; OC.opened += count; ocSave();
  OC.opening = true; $('ocResult').hidden = true; ocRender();
  ocSpin(best, reduceMotion ? 400 : 2600, () => {
    OC.opening = false;
    const bra = ocRarityOf(best); try { sfxReveal(RARITIES.indexOf(bra)); } catch (e) {}
    const res = $('ocResult'); res.textContent = ''; res.style.setProperty('--rc', bra.color); res.className = 'result haul r-' + bra.id;
    const h = document.createElement('p'); h.className = 'won'; h.textContent = 'Opened ' + count + (count === 1 ? ' crate' : ' crates');
    const sub = document.createElement('small'); sub.textContent = (fresh.length ? fresh.length + (fresh.length === 1 ? ' new outfit' : ' new outfits') : 'Nothing new this time') + ' · best: ' + best.name;
    const grades = document.createElement('ul'); grades.className = 'odds';
    for (const ra of RARITIES) { if (!byGrade[ra.id]) continue; const li = document.createElement('li'); li.style.setProperty('--rc', ra.color); li.textContent = ra.name + ' × ' + byGrade[ra.id]; grades.appendChild(li); }
    res.append(h, sub, grades);
    if (fresh.length) { const strip = document.createElement('div'); strip.className = 'haulstrip'; for (const it of fresh.sort((a, b) => ocLevel(b) - ocLevel(a))) strip.appendChild(ocCard(it, 'reelitem')); res.appendChild(strip); }
    res.hidden = false; ocRender();
  });
}

ocLoad();
for (const b of document.querySelectorAll('.ocrateBtn')) b.addEventListener('click', ocShow);
if ($('ocrateClose')) $('ocrateClose').addEventListener('click', ocHide);
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const card = $('ocrateCard'); if (!card || card.hidden) return;
  e.preventDefault(); e.stopPropagation(); ocHide();
}, true);
ocRender();
