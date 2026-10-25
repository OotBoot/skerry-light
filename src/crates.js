// Crates and ship skins.
//
// You earn one Skerry Crate each time a voyage ends for you, made harbour or lost. Open crates from
// the menu: a reel of skins spins and lands on your prize. Skins change your deck, bowsprit and
// lantern as you see them, and your hull and sails as your crewmates see them. Crates and skins are
// kept in this browser (localStorage), so they're yours on this device.

const RARITIES = [
  { id: 'deckhand', name: 'Deckhand', color: '#4b69ff', odds: 0.7992 },
  { id: 'bosun',    name: 'Bosun',    color: '#8847ff', odds: 0.1598 },
  { id: 'mate',     name: 'Mate',     color: '#d32ce6', odds: 0.032 },
  { id: 'captain',  name: 'Captain',  color: '#eb4b4b', odds: 0.0064 },
  { id: 'admiral',  name: 'Admiral',  color: '#e4ae39', odds: 0.0026 },
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
];
const SKIN_BY_ID = Object.fromEntries(SKINS.map(s => [s.id, s]));
const rarityOf = s => RARITIES.find(r => r.id === s.rarity);

const CRATES = { crates: 0, owned: {}, equipped: 'plain', opening: false, pending: null };
function loadCrates() {
  try {
    const d = JSON.parse(localStorage.getItem('skerry-crates') || '{}');
    CRATES.crates = Math.max(0, Math.min(999, d.crates | 0));
    CRATES.owned = d.owned && typeof d.owned === 'object' ? d.owned : {};
    CRATES.equipped = SKIN_BY_ID[d.equipped] ? d.equipped : 'plain';
    // a crate whose reel was still spinning when the page closed: the prize is still yours
    if (SKIN_BY_ID[d.pending]) { CRATES.owned[d.pending] = (CRATES.owned[d.pending] | 0) + 1; saveCrates(); }
  } catch (e) {}
  // a first crate to try, the first time
  try { if (!localStorage.getItem('skerry-crates')) { CRATES.crates = 1; saveCrates(); } } catch (e) {}
}
function saveCrates() {
  try { localStorage.setItem('skerry-crates', JSON.stringify({ crates: CRATES.crates, owned: CRATES.owned, equipped: CRATES.equipped, pending: CRATES.pending })); } catch (e) {}
}
function mySkin() { return SKIN_BY_ID[CRATES.equipped] || SKINS[0]; }

// one crate per voyage played
function grantCrate() {
  if (!g || g.attract || g.crateGiven) return;
  g.crateGiven = true;
  CRATES.crates++;
  saveCrates();
  updateCrateButtons();
  toast('You found a Skerry Crate in the wreckage. Open it from the menu.');
}

function rollSkin() {
  let r = Math.random(), rarity = RARITIES[0];
  for (const ra of RARITIES) { if (r < ra.odds) { rarity = ra; break; } r -= ra.odds; }
  const pool = SKINS.filter(s => s.rarity === rarity.id);
  return pool[(Math.random() * pool.length) | 0];
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
function itemCard(skin, cls) {
  const d = document.createElement('div');
  d.className = 'skincard' + (cls ? ' ' + cls : '');
  const ra = rarityOf(skin);
  d.style.setProperty('--rc', ra ? ra.color : '#8f98ab');
  d.appendChild(skinPreview(skin, 96));
  const n = document.createElement('b'); n.textContent = skin.name; d.appendChild(n);
  const r = document.createElement('small'); r.textContent = ra ? ra.name : 'Standard'; d.appendChild(r);
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
  for (const s of SKINS) {
    const count = s.id === 'plain' ? 1 : (CRATES.owned[s.id] | 0);
    if (!count) continue;
    const card = itemCard(s, CRATES.equipped === s.id ? 'equipped' : '');
    if (count > 1) { const c = document.createElement('span'); c.className = 'dupes'; c.textContent = '×' + count; card.appendChild(c); }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tool';
    b.textContent = CRATES.equipped === s.id ? 'Equipped' : 'Equip';
    b.disabled = CRATES.equipped === s.id;
    b.addEventListener('click', () => { CRATES.equipped = s.id; saveCrates(); renderCrates(); if (crewMode) send(); });
    card.appendChild(b);
    inv.appendChild(card);
  }
  const owned = SKINS.filter(s => s.id === 'plain' || CRATES.owned[s.id]).length;
  $('crateCollected').textContent = owned + ' of ' + SKINS.length + ' skins collected';
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
  const h = document.createElement('p'); h.className = 'won';
  h.textContent = (CRATES.owned[prize.id] > 1 ? 'Another ' : 'New: ') + prize.name;
  const r = document.createElement('small'); r.textContent = ra.name + ' grade';
  const eq = document.createElement('button'); eq.type = 'button'; eq.className = 'primary';
  eq.textContent = 'Equip ' + prize.name;
  eq.addEventListener('click', () => { CRATES.equipped = prize.id; saveCrates(); renderCrates(); if (crewMode) send(); eq.textContent = 'Equipped'; eq.disabled = true; });
  res.append(h, r, eq);
  res.hidden = false;
  renderCrates();
  updateCrateButtons();
}

let toastTimer = 0;
function toast(text) {
  const t = $('toast'); if (!t) return;
  t.textContent = text; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 5000);
}

loadCrates();
for (const b of document.querySelectorAll('.crateOpenBtn')) b.addEventListener('click', showCrates);
$('crateOpen').addEventListener('click', openCrate);
$('crateClose').addEventListener('click', hideCrates);
$('crateCard').addEventListener('keydown', e => { if (e.key === 'Escape') hideCrates(); });
updateCrateButtons();
