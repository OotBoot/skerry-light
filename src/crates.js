// Crates, ship skins and pennants.
//
// You earn one Skerry Crate each time a voyage ends for you, made harbour or lost. Open crates from
// the menu: a reel spins and lands on your prize, a skin or a pennant. Skins change your deck,
// bowsprit and lantern as you see them, and your hull and sails as your crewmates see them.
// Pennants fly from your bowsprit, and from your masthead for your crew. Everything is kept in this
// browser (localStorage), so it's yours on this device.

const RARITIES = [
  { id: 'deckhand', name: 'Deckhand', color: '#3fb4ff', odds: 0.7992 },
  { id: 'bosun',    name: 'Bosun',    color: '#a43dff', odds: 0.1598 },
  { id: 'mate',     name: 'Mate',     color: '#ff3fb0', odds: 0.032 },
  { id: 'captain',  name: 'Captain',  color: '#ff4b3b', odds: 0.0064 },
  { id: 'admiral',  name: 'Admiral',  color: '#ffc234', odds: 0.0026 },
];

// deck: [near, far] planking; rail; wood (bowsprit); lantern; hull and sail are what crewmates see
const SKINS = [
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
];
const SKIN_BY_ID = Object.fromEntries(SKINS.map(s => [s.id, s]));

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
];
const PENNANT_BY_ID = Object.fromEntries(PENNANTS.map(p => [p.id, p]));
const LOOT = SKINS.filter(s => s.rarity).concat(PENNANTS);
const LOOT_BY_ID = Object.assign({}, SKIN_BY_ID, PENNANT_BY_ID);
const rarityOf = s => RARITIES.find(r => r.id === s.rarity);

const CRATES = { crates: 0, owned: {}, equipped: 'plain', pennant: null, opening: false, pending: null };
function loadCrates() {
  try {
    const d = JSON.parse(localStorage.getItem('skerry-crates') || '{}');
    CRATES.crates = Math.max(0, Math.min(999, d.crates | 0));
    CRATES.owned = d.owned && typeof d.owned === 'object' ? d.owned : {};
    CRATES.equipped = SKIN_BY_ID[d.equipped] ? d.equipped : 'plain';
    CRATES.pennant = PENNANT_BY_ID[d.pennant] ? d.pennant : null;
    // a crate whose reel was still spinning when the page closed: the prize is still yours
    if (LOOT_BY_ID[d.pending]) { CRATES.owned[d.pending] = (CRATES.owned[d.pending] | 0) + 1; saveCrates(); }
  } catch (e) {}
  // a first crate to try, the first time
  try { if (!localStorage.getItem('skerry-crates')) { CRATES.crates = 1; saveCrates(); } } catch (e) {}
}
function saveCrates() {
  try { localStorage.setItem('skerry-crates', JSON.stringify({ crates: CRATES.crates, owned: CRATES.owned, equipped: CRATES.equipped, pennant: CRATES.pennant, pending: CRATES.pending })); } catch (e) {}
}
function mySkin() { return SKIN_BY_ID[CRATES.equipped] || SKINS[0]; }
function myPennant() { return PENNANT_BY_ID[CRATES.pennant] || null; }
function equip(item) {
  if (item.kind === 'pennant') CRATES.pennant = CRATES.pennant === item.id ? null : item.id;
  else CRATES.equipped = item.id;
  saveCrates(); renderCrates();
  if (crewMode) send();
}

// one crate per voyage played
function grantCrate() {
  if (!g || g.attract || g.crateGiven) return;
  g.crateGiven = true;
  CRATES.crates++;
  saveCrates();
  updateCrateButtons();
  toast('You found a Skerry Crate in the wreckage. Open it from the menu.', '+1 crate');
}

function rollSkin() {
  let r = Math.random(), rarity = RARITIES[0];
  for (const ra of RARITIES) { if (r < ra.odds) { rarity = ra; break; } r -= ra.odds; }
  const pool = LOOT.filter(s => s.rarity === rarity.id);
  return pool[(Math.random() * pool.length) | 0];
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
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 80'); svg.setAttribute('width', size); svg.setAttribute('height', size * 2 / 3);
  svg.setAttribute('aria-hidden', 'true');
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
  el('path', { d: 'M8 64 Q60 70 112 60 L104 52 L14 54 Z', fill: 'rgba(220,232,245,0.25)' });
  el('line', { x1: 44, y1: 54, x2: 44, y2: 10, stroke: skin.wood, 'stroke-width': 2.5 });
  el('line', { x1: 74, y1: 54, x2: 74, y2: 14, stroke: skin.wood, 'stroke-width': 2.5 });
  el('path', { d: 'M30 48 L58 48 L54 14 L34 14 Z', fill: skin.sail });
  el('path', { d: 'M61 48 L87 48 L83 18 L65 18 Z', fill: skin.sail });
  el('path', { d: 'M12 54 L108 50 L100 64 L22 66 Z', fill: skin.hull });
  el('line', { x1: 14, y1: 54, x2: 107, y2: 50, stroke: skin.rail, 'stroke-width': 2 });
  el('circle', { cx: 96, cy: 44, r: 3, fill: skin.lantern });
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
  d.appendChild(skin.kind === 'pennant' ? pennantPreview(skin, 96) : skinPreview(skin, 96));
  const n = document.createElement('b'); n.textContent = skin.name; d.appendChild(n);
  const r = document.createElement('small'); r.textContent = (ra ? ra.name : 'Standard') + (skin.kind === 'pennant' ? ' · pennant' : ''); d.appendChild(r);
  return d;
}

function updateCrateButtons() {
  for (const b of document.querySelectorAll('.crateOpenBtn')) b.textContent = 'Crates · ' + CRATES.crates;
}

function showCrates() {
  audioInit();
  $('crateCard').hidden = false;
  renderCrates();
  $('crateOpen').focus();
}
function hideCrates() { if (!CRATES.opening) $('crateCard').hidden = true; }

function renderCrates() {
  $('crateCount').textContent = CRATES.crates === 1 ? '1 crate' : CRATES.crates + ' crates';
  $('crateOpen').disabled = CRATES.crates <= 0 || CRATES.opening;
  $('crateOpen').textContent = CRATES.opening ? 'Opening…' : CRATES.crates > 0 ? 'Open a crate' : 'No crates. Play a voyage to earn one';
  $('crateClose').disabled = CRATES.opening;
  // what's inside, by rarity
  const odds = $('crateOdds'); odds.textContent = '';
  for (const ra of RARITIES) {
    const li = document.createElement('li');
    li.style.setProperty('--rc', ra.color);
    li.textContent = ra.name + ' · ' + (ra.odds * 100).toFixed(ra.odds < 0.01 ? 2 : 1) + '%';
    odds.appendChild(li);
  }
  const inv = $('crateInv'); inv.textContent = '';
  const addCard = (item, count, isOn) => {
    const card = itemCard(item, isOn ? 'equipped' : '');
    if (count > 1) { const c = document.createElement('span'); c.className = 'dupes'; c.textContent = '×' + count; card.appendChild(c); }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tool';
    if (item.kind === 'pennant') b.textContent = isOn ? 'Take down' : 'Fly it';
    else { b.textContent = isOn ? 'Equipped' : 'Equip'; b.disabled = isOn; }
    b.addEventListener('click', () => equip(item));
    card.appendChild(b);
    inv.appendChild(card);
  };
  for (const s of SKINS) {
    const count = s.id === 'plain' ? 1 : (CRATES.owned[s.id] | 0);
    if (count) addCard(s, count, CRATES.equipped === s.id);
  }
  for (const p of PENNANTS) {
    const count = CRATES.owned[p.id] | 0;
    if (count) addCard(p, count, CRATES.pennant === p.id);
  }
  const skinsOwned = SKINS.filter(s => s.id === 'plain' || CRATES.owned[s.id]).length;
  const pensOwned = PENNANTS.filter(p => CRATES.owned[p.id]).length;
  $('crateCollected').textContent = skinsOwned + ' of ' + SKINS.length + ' skins · ' + pensOwned + ' of ' + PENNANTS.length + ' pennants';
}

// the reel: a strip of skins that spins and settles on the prize under the marker
function openCrate() {
  if (CRATES.crates <= 0 || CRATES.opening) return;
  CRATES.opening = true;
  CRATES.crates--;
  const prize = rollSkin();
  CRATES.pending = prize.id;   // kept safe until the reel lands
  saveCrates();
  renderCrates();
  $('crateResult').hidden = true;

  const reel = $('crateReel'), strip = $('crateStrip');
  strip.textContent = '';
  const N = 56, WIN = 48;
  for (let i = 0; i < N; i++) strip.appendChild(itemCard(i === WIN ? prize : rollSkin(), 'reelitem'));
  const cardW = strip.firstChild.getBoundingClientRect().width + 8;   // card plus gap
  const view = reel.getBoundingClientRect().width;
  const end = WIN * cardW + cardW / 2 - view / 2 + (Math.random() - 0.5) * cardW * 0.7;
  const dur = reduceMotion ? 600 : 6000, t0 = performance.now();
  let lastIdx = -1;
  const step = now => {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 4);
    const x = end * e;
    strip.style.transform = 'translateX(' + (-x) + 'px)';
    const idx = Math.floor((x + view / 2) / cardW);
    if (idx !== lastIdx) { lastIdx = idx; sfxTick(); }
    if (t < 1) requestAnimationFrame(step);
    else finishOpen(prize);
  };
  strip.style.transform = 'translateX(0)';
  requestAnimationFrame(step);
}
function finishOpen(prize) {
  CRATES.opening = false;
  CRATES.owned[prize.id] = (CRATES.owned[prize.id] | 0) + 1;
  CRATES.pending = null;
  saveCrates();
  const ra = rarityOf(prize);
  sfxReveal(RARITIES.indexOf(ra));
  const res = $('crateResult');
  res.textContent = '';
  res.style.setProperty('--rc', ra.color);
  res.className = 'result r-' + ra.id;
  const h = document.createElement('p'); h.className = 'won';
  h.textContent = (CRATES.owned[prize.id] > 1 ? 'Another ' : 'New: ') + prize.name;
  const r = document.createElement('small'); r.textContent = ra.name + ' grade';
  const eq = document.createElement('button'); eq.type = 'button'; eq.className = 'primary';
  eq.textContent = (prize.kind === 'pennant' ? 'Fly ' : 'Equip ') + prize.name;
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
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, phone ? 2500 : 5000);
}

loadCrates();
for (const b of document.querySelectorAll('.crateOpenBtn')) b.addEventListener('click', showCrates);
$('crateOpen').addEventListener('click', openCrate);
$('crateClose').addEventListener('click', hideCrates);
$('crateCard').addEventListener('keydown', e => { if (e.key === 'Escape') hideCrates(); });
updateCrateButtons();
