'use strict';
// Rival Lights: your decks, the deck builder, and the one save the meta layer keeps.
//
// The save. Everything Rival Lights keeps between matches lives in one object under localStorage 'skerry-rival'
// (RLV): the three deck slots and which one you play, your record (src/rlcrates.js rlRecord), and the tower crates
// and skins (src/rlcrates.js). It goes into the game's one save with everything else through rkData() / rkMerge()
// (src/rlcrates.js, hooked into src/crates.js beside the golf's), and like every save there it is only ever merged,
// never replaced. This file loads it; src/rlcrates.js checks the skins in it once it knows them.
//
// The decks. Three slots, Deck 1 to 3, each exactly 8 different cards from the 64 in src/rlcards.js, and the one you
// last chose is the one you play (rlDeckMine()). A fresh slot holds the starter deck (RL_DEFAULT_DECK). An id that is
// no longer a card, a duplicate or a short deck is mended from the starter deck on load, so a deck is always whole.
//
// The deck builder (#rlDeckCard, opened by #rlDeckBtn on the Rival Lights card): the slot tabs, your 8 cards across
// the top with their average oil and a few words on the deck's shape (how cheap its cheapest four are, whether
// anything in it can hit flyers), then the whole collection below, filtered by type and sorted by cost, name or type.
// Tap any card for everything about it in plain words. To change the deck you swap, one for one, so it always holds
// 8 and never the same card twice: pick a card from the collection and then the deck card it replaces, or a deck card
// and then the collection card to put in its place. Every card is a button (Tab, Enter, Escape to let go or close),
// and on a phone the details sit in a panel along the foot of the screen.
//
// The global API:
//   rlDeckMine()        -> the 8 ids of the deck you play
//   rlDeckShow() / rlDeckHide()
//   rlCardWords(id)     -> { rows: [[label, value]...], ab: a sentence on its ability or '' } (the HUD may use it)
//   RLV, rlvSave()      the save (src/rlcrates.js reads and writes its parts)

var RL_SAVE_KEY = 'skerry-rival';
var RLV = { decks: [], dk: 0, st: { p: 0, w: 0, l: 0, d: 0, s: 0, bs: 0, cr: 0 }, c: 0, n: 0, o: {}, e: '', pending: null, fresh: true };
var RLD = { sel: null, filter: 'all', sort: 'cost', opener: null, msg: '', flash: '' };

function rlCardList() { return typeof RL_CARDS !== 'undefined' ? RL_CARDS : []; }
function rlCardById(id) { return typeof RL_CARD !== 'undefined' ? RL_CARD[id] || null : null; }
function rlStarter() { return typeof RL_DEFAULT_DECK !== 'undefined' ? RL_DEFAULT_DECK.slice() : []; }
// a deck made whole: 8 different real cards, filled from the starter deck (then the cheapest cards) where it falls short
function rlDeckFix(d) {
  const known = rlCardList().length > 0, out = [];
  for (const id of Array.isArray(d) ? d : []) if (typeof id === 'string' && (!known || rlCardById(id)) && !out.includes(id) && out.length < 8) out.push(id);
  for (const id of rlStarter().concat(rlCardList().slice().sort((a, b) => a.cost - b.cost).map(c => c.id))) { if (out.length >= 8) break; if (!out.includes(id)) out.push(id); }
  return out;
}

// ---------- the save ----------
function rlvLoad() {
  try {
    const raw = localStorage.getItem(RL_SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw) || {}, n = v => Math.max(0, Math.min(999999, v | 0));
      RLV.fresh = false;
      RLV.decks = [0, 1, 2].map(i => rlDeckFix(d.decks && d.decks[i]));
      RLV.dk = Math.max(0, Math.min(2, d.dk | 0));
      const s = d.st || {}; for (const k of Object.keys(RLV.st)) RLV.st[k] = n(s[k]);
      RLV.c = n(d.c); RLV.n = n(d.n); RLV.o = {}; if (d.o && typeof d.o === 'object') for (const [id, c] of Object.entries(d.o)) if (typeof id === 'string' && n(c)) RLV.o[id] = n(c);
      RLV.e = typeof d.e === 'string' ? d.e : ''; RLV.pending = typeof d.pending === 'string' ? d.pending : null;
    }
  } catch (e) {}
  if (RLV.decks.length !== 3) RLV.decks = [0, 1, 2].map(() => rlDeckFix(rlStarter()));
}
function rlvSave(quiet) {
  try { localStorage.setItem(RL_SAVE_KEY, JSON.stringify({ decks: RLV.decks, dk: RLV.dk, st: RLV.st, c: RLV.c, n: RLV.n, o: RLV.o, e: RLV.e, pending: RLV.pending })); } catch (e) {}
  if (!quiet && typeof cloudSaveSoon === 'function') try { cloudSaveSoon(); } catch (e) {}
}
function rlDeckMine() { const d = RLV.decks[RLV.dk]; return d && d.length === 8 ? d.slice() : rlDeckFix(rlStarter()); }

// ---------- a card in plain words ----------
function rlCardWords(id) {
  const c = rlCardById(id); if (!c) return { rows: [], ab: '' };
  const rows = [], sp = v => v >= 1.8 ? 'Very fast' : v >= 1.3 ? 'Fast' : v >= 0.95 ? 'Medium' : 'Slow';
  const reach = r => r < 1.2 ? 'Close quarters' : r + ' tiles';
  const tg = { ground: 'Troops on the ground, and buildings', any: 'Anything, flyers too', build: 'Only buildings and towers' };
  const every = (d, h) => d + (h ? ' every ' + h + ' s' : '') + (h ? ' (' + Math.round(d / h) + ' a second)' : '');
  const S = c.sp && rlCardById(c.sp), sn = c.sn || 1, them = (n, C) => n > 1 ? n + ' ' + (C ? C.n : c.sp) : (C ? C.n : c.sp);
  if (c.type === 'troop') {
    rows.push(['Comes', c.cnt > 1 ? c.cnt + ' of them' : 'Alone']);
    rows.push(['Hit points', c.hp + (c.cnt > 1 ? ' each' : '')]);
    if (c.sh) rows.push(['Shell', c.sh + ', spent before its hit points']);
    if (c.ab === 'heal') rows.push(['Mends', c.hl + ' a second, every friend within ' + c.rng + ' tiles']);
    else if (c.ab === 'burst') rows.push(['Damage', c.dmg + ' once, as it bursts, ' + c.sp + ' tiles round']);
    else rows.push(['Damage', every(c.dmg, c.hit) + (c.ab === 'spin' ? ', on everyone within ' + c.sp + ' tiles of it' : c.sp && typeof c.sp === 'number' ? ', splashing ' + c.sp + ' tiles round' : '') + (c.ab === 'chain' ? ', leaping on to ' + c.ch + ' more' : '')]);
    if (c.ab !== 'heal') rows.push(['Reach', reach(c.rng)]);
    if (c.ab === 'leap') rows.push(['Pounce', 'Up to ' + c.lp + ' tiles']);
    rows.push(['Speed', sp(c.spd)]);
    rows.push(['Goes for', c.ab === 'heal' ? 'Its friends: it keeps beside them' : tg[c.tg] || c.tg]);
    rows.push(['Moves', c.air ? 'Flies, straight over the race; only what hits flyers can touch it' : 'On foot, over the causeways']);
    if (c.ab === 'deathspawn' && S) rows.push(['When it falls', them(sn, S) + ' come out']);
  } else if (c.type === 'spell') {
    rows.push(['Where', 'Anywhere on the rocks or the race']);
    rows.push(['Radius', c.r + ' tiles']);
    if (c.dur) rows.push(['Lasts', c.dur + ' seconds']);
    if (c.ab === 'dot') { rows.push(['Damage', c.dmg + ' a second to troops and buildings, ' + c.dmg * c.dur + ' in all']); rows.push(['To towers', Math.round(c.dmg * c.tw) + ' a second (' + Math.round(c.tw * 100) + '%), ' + Math.round(c.dmg * c.tw * c.dur) + ' in all']); }
    else if (c.ab === 'whirl') { rows.push(['Damage', c.dmg + ' every half second (' + c.dmg * 2 + ' a second), ' + c.dmg * 2 * c.dur + ' in all']); rows.push(['To towers', Math.round(c.dmg * 2 * c.tw) + ' a second (' + Math.round(c.tw * 100) + '%)']); }
    else if (c.dmg) { rows.push(['Damage', c.dmg + ' to troops and buildings']); rows.push(['To towers', Math.round(c.dmg * c.tw) + ' (' + Math.round(c.tw * 100) + '%)']); }
    if (c.ab === 'mend') rows.push(['Mends', c.hl + ' a second, ' + c.hl * c.dur + ' in all']);
    if (c.ab === 'summon' && S) rows.push(['Brings', S.n + ' (' + (S.cnt > 1 ? S.cnt + ' of them, ' : '') + S.hp + ' hit points' + (S.cnt > 1 ? ' each' : '') + ')']);
  } else {
    rows.push(['Hit points', String(c.hp)]);
    rows.push(['Lasts', c.life + ' s, wearing down as it stands']);
    if (c.dmg) {
      rows.push(['Damage', c.ab === 'ramp' ? every(c.dmg, c.hit) + ', climbing to three times that after 2 s on one target and eight times after 4 s' : every(c.dmg, c.hit) + (c.sp ? ', splashing ' + c.sp + ' tiles round' : '')]);
      rows.push(['Range', c.minr ? c.minr + ' to ' + c.rng + ' tiles (nothing nearer)' : reach(c.rng)]);
      rows.push(['Shoots at', c.ab === 'blast' ? 'Walkers all round it' : tg[c.tg] || c.tg]);
    }
    if (c.ab === 'tar') rows.push(['Mires', 'Enemy walkers within ' + c.rng + ' tiles, to half speed']);
    if (c.ab === 'oil') rows.push(['Oil', 'One every ' + c.ev + ' s, about ' + Math.floor(c.life / c.ev) + ' over its life']);
    if (c.ab === 'spawn' && S) rows.push(['Sends', (S.cnt > 1 ? (sn > 1 ? sn : 'One') + ' of the ' + S.n : them(sn, S)) + ' every ' + c.ev + ' s']);
  }
  const ab = {
    revive: 'Rises once more at half his hit points when he falls.',
    bomb: 'Runs at the nearest building and bursts on reaching it (' + c.dmg + ' damage, ' + c.sp + ' tiles round), going up with it.',
    cloak: 'Nothing can strike it for its first ' + c.cl + ' seconds.',
    charge: 'After 2 tiles of running it charges at twice the speed, and its first blow does double.',
    slowhit: 'Each blow slows what it hits by 35% for 2 seconds.',
    lob: c.type === 'building' ? 'Its shells arc high and come down where the target stood, bursting ' + c.sp + ' tiles round, so a quick walker can dodge them; it can\'t aim at anything within ' + c.minr + ' tiles.' : 'Lands ' + c.fl + ' s after you cast it, so lead a moving target.',
    stun: 'Stuns everything under it for ' + c.st + ' s.',
    wave: 'Rolls ' + c.len + ' tiles forward from where you cast it, ' + c.w + ' tiles wide, knocking walkers back ' + c.kb + ' tiles.',
    haar: 'A fog bank for ' + c.dur + ' seconds: enemies inside move and strike 45% slower.',
    bolts: 'Strikes the ' + c.k + ' enemies with the most hit points inside it.',
    lure: 'Every walker within ' + c.rng + ' tiles turns on it, and each toll of its bell (every 4 s) slows them for a moment.',
    spawn: 'Calls ' + (sn > 1 ? sn + ' ' + (S ? S.n : 'wreckers') : 'a wrecker') + ' to it every ' + c.ev + ' seconds while it stands.',
    burst: 'Drifts at the nearest enemy, bird or walker or tower, and bursts on it for ' + c.dmg + ' all round (' + c.sp + ' tiles), going out with it.',
    leap: 'Pounces on anything within ' + c.lp + ' tiles on the same rock, and its first bite lands as it does; it can pounce again 3 s later.',
    shield: 'Its shell soaks the first ' + c.sh + ' damage, whatever strikes it, before its hit points take any.',
    drain: 'Half of every hit she lands mends her (' + Math.round(c.dmg / 2) + ' a hit).',
    heal: 'Never strikes. Once a second it mends every friend within ' + c.rng + ' tiles by ' + c.hl + ', and it keeps close behind the friend nearest it.',
    spin: 'Each swing lands on every enemy within ' + c.sp + ' tiles of her, not only the one she aims at.',
    rally: 'Friends within 4 tiles of him strike 30% faster.',
    deathspawn: 'When she falls, ' + them(sn, S) + ' scatter from where she stood.',
    chain: 'Each bolt strikes its target, then leaps on to ' + c.ch + ' more enemies, each within 3 tiles of the last, at full damage.',
    pull: 'Drags every enemy on foot in the circle to its middle at once (never over the race), then strikes everything there.',
    mend: 'For ' + c.dur + ' seconds your troops in the circle mend ' + c.hl + ' a second.',
    haste: 'For ' + c.dur + ' seconds your troops in the circle move and strike 40% faster.',
    dot: 'For ' + c.dur + ' seconds everything of the enemy\'s in the circle takes ' + c.dmg + ' a second, towers ' + Math.round(c.tw * 100) + '% of it.',
    summon: 'Strikes everything in the circle, then ' + (S ? (S.cnt > 1 ? 'the ' + S.n + ' climb' : S.n + ' climbs') : 'a crew climbs') + ' out on your side, there, wherever you cast it (on the nearer bank if it lands in the race).',
    whirl: 'For ' + c.dur + ' seconds it drags enemies on foot to its middle, 3 tiles a second, striking everything inside every half second.',
    tar: 'Enemy walkers within ' + c.rng + ' tiles move at half speed (they strike as fast as ever). Fires nothing.',
    blast: 'Every ' + c.hit + ' seconds, if a walker is within ' + c.rng + ' tiles, it bellows: ' + c.dmg + ' to every walker there, knocking them ' + c.kb + ' tiles back.',
    ramp: 'It burns hotter the longer it holds one target: three times after 2 s, eight times after 4 s; a new target starts it cool again.',
    oil: 'Gives you one lamp oil every ' + c.ev + ' seconds while it stands. Keep it out of reach at the back.',
  }[c.ab] || '';
  return { rows, ab };
}

// ---------- the builder ----------
function rlDeckShow(e) {
  try { audioInit(); } catch (err) {}
  RLD.opener = e && e.currentTarget || document.activeElement; RLD.sel = null;
  const card = $('rlDeckCard'); if (!card) return;
  card.hidden = false; rlDeckRender(); card.scrollTop = 0;
  $('rlDeckClose').focus({ preventScroll: true });
}
function rlDeckHide() {
  const card = $('rlDeckCard'); if (!card || card.hidden) return;
  card.hidden = true; RLD.sel = null; rlDeckBtnLabel();
  const back = RLD.opener && document.contains(RLD.opener) && RLD.opener.offsetParent ? RLD.opener : $('rlDeckBtn');
  if (back) try { back.focus({ preventScroll: true }); } catch (err) {}
}
function rlDeckBtnLabel() {
  const b = $('rlDeckBtn'); if (!b) return;
  const d = rlDeckMine(), avg = d.reduce((a, id) => a + ((rlCardById(id) || {}).cost || 0), 0) / 8;
  b.textContent = 'Deck ' + (RLV.dk + 1) + (rlCardList().length ? ' · ' + avg.toFixed(1) + ' oil' : '');
}
function rlDeckPick(from, id) {
  const deck = RLV.decks[RLV.dk], s = RLD.sel;
  // a second tap on the chosen card lets it go
  if (s && s.from === from && s.id === id) { RLD.sel = null; rlDeckRender(); return; }
  // a swap: one from the deck and one from the collection that isn't in it
  if (s && s.from !== from) {
    const out = from === 'deck' ? id : s.id, inn = from === 'deck' ? s.id : id;
    if (deck.includes(out) && !deck.includes(inn)) {
      deck[deck.indexOf(out)] = inn; rlvSave(); RLD.sel = null; RLD.flash = inn;
      try { sfxTick(); } catch (err) {}
      const ci = rlCardById(inn), co = rlCardById(out);
      RLD.msg = (ci ? ci.n : inn) + ' in, ' + (co ? co.n : out) + ' out.';
      rlDeckRender(); const el = $('rlDkDeck').querySelector('[data-id="' + inn + '"]'); if (el) el.focus({ preventScroll: true });
      return;
    }
  }
  RLD.sel = { from: from === 'col' && deck.includes(id) ? 'deck' : from, id }; rlDeckRender();
}
function rlDeckSay(t) { RLD.msg = t; const h = $('rlDkHint'); if (h && !$('rlDeckCard').hidden) rlDeckRender(); }
function rlDeckRender() {
  rlDeckBtnLabel();
  const card = $('rlDeckCard'); if (!card || card.hidden) return;
  const deck = RLV.decks[RLV.dk], s = RLD.sel, cards = rlCardList();
  // the slot tabs
  const tabs = $('rlDkTabs'); tabs.textContent = '';
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rldk-tab' + (RLV.dk === i ? ' on' : ''); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', RLV.dk === i ? 'true' : 'false');
    const avg = RLV.decks[i].reduce((a, id) => a + ((rlCardById(id) || {}).cost || 0), 0) / 8;
    b.innerHTML = '<b>Deck ' + (i + 1) + '</b><small>' + (RLV.dk === i ? 'Playing' : avg.toFixed(1) + ' oil') + '</small>';
    b.addEventListener('click', () => { RLV.dk = i; RLD.sel = null; rlvSave(); rlDeckSay('Deck ' + (i + 1) + ' is the one you play.'); });
    tabs.appendChild(b);
  }
  // the 8
  const dv = $('rlDkDeck'); dv.textContent = '';
  const want = s && s.from === 'col' && !deck.includes(s.id);
  deck.forEach((id, i) => {
    const c = rlCardById(id), b = document.createElement('button'); b.type = 'button';
    b.className = 'rldk-c' + (s && s.from === 'deck' && s.id === id ? ' sel' : '') + (want ? ' swap' : '') + (RLD.flash === id ? ' flash' : '');
    b.dataset.id = id; b.setAttribute('aria-label', (c ? c.n + ', ' + c.cost + ' oil, ' + RL_TYPE[c.type].n.toLowerCase() : id) + ', deck card ' + (i + 1) + (want ? '. Swap it out' : ''));
    b.appendChild(rlCardFace(id, null, 96)); b.addEventListener('click', () => rlDeckPick('deck', id));
    dv.appendChild(b);
  });
  RLD.flash = '';
  // its shape
  const cs = deck.map(rlCardById).filter(Boolean), avg = cs.reduce((a, c) => a + c.cost, 0) / Math.max(1, cs.length);
  const four = cs.map(c => c.cost).sort((a, b) => a - b).slice(0, 4).reduce((a, v) => a + v, 0);
  const air = cs.filter(c => c.tg === 'any' && c.type !== 'spell' || c.type === 'spell' && c.dmg > 0).length;
  const mix = { troop: 0, spell: 0, building: 0 }; for (const c of cs) mix[c.type]++;
  $('rlDkAvg').innerHTML = '<span class="rldk-drop" aria-hidden="true"></span><b>' + avg.toFixed(1) + '</b> average oil';
  $('rlDkMix').textContent = [[mix.troop, 'troop'], [mix.spell, 'spell'], [mix.building, 'building']].map(([k, w]) => k + ' ' + w + (k === 1 ? '' : 's')).join(' · ') + ' · cheapest four ' + four + ' oil' + (air ? '' : ' · nothing hits flyers!');
  $('rlDkMix').classList.toggle('warn', !air);
  // what to do next
  $('rlDkHint').textContent = RLD.msg || (!s ? 'Tap a card to read it. To change your deck, pick a card below, then the deck card it replaces.'
    : s.from === 'col' ? 'Now tap the deck card that ' + (rlCardById(s.id) || {}).n + ' replaces.'
    : 'Tap a card below to put it in place of ' + (rlCardById(s.id) || {}).n + ', or tap it again to let go.');
  RLD.msg = '';
  // the details
  const det = $('rlDkDetail'); det.textContent = ''; det.hidden = false; det.classList.toggle('empty', !(s && rlCardById(s.id)));
  if (s && rlCardById(s.id)) {
    const c = rlCardById(s.id), W = rlCardWords(s.id), T = RL_TYPE[c.type];
    det.style.setProperty('--tc', T.c);
    const big = rlCardFace(s.id, null, 180); big.classList.add('big');
    const txt = document.createElement('div'); txt.className = 'rldk-dtxt';
    const h = document.createElement('h2'); h.textContent = c.n;
    const sub = document.createElement('p'); sub.className = 'rldk-dsub'; sub.textContent = c.cost + ' oil · ' + T.n + (deck.includes(c.id) ? ' · in your deck' : '');
    const line = document.createElement('p'); line.className = 'rldk-dline'; line.textContent = c.d;
    const dl = document.createElement('dl'); for (const [k, v] of W.rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; dl.append(dt, dd); }
    txt.append(h, sub, line, dl);
    if (W.ab) { const ab = document.createElement('p'); ab.className = 'rldk-dab'; ab.textContent = W.ab; txt.appendChild(ab); }
    // a card from the collection: the deck right here to swap it into, so a phone needn't scroll back up
    if (s.from === 'col' && !deck.includes(c.id)) {
      const sw = document.createElement('div'); sw.className = 'rldk-swap'; const lab = document.createElement('span'); lab.textContent = 'Swap it in for'; sw.appendChild(lab);
      const row = document.createElement('div'); row.className = 'rldk-swaprow';
      for (const id of deck) { const dc = rlCardById(id), mb = document.createElement('button'); mb.type = 'button'; mb.className = 'rldk-mini'; mb.title = dc ? dc.n : id; mb.setAttribute('aria-label', 'Swap ' + c.n + ' in for ' + (dc ? dc.n : id));
        const cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.height = Math.round(44 * dpr); rlCardArt(id, cv); const cb = document.createElement('b'); cb.textContent = dc ? dc.cost : ''; mb.append(cv, cb);
        mb.addEventListener('click', () => rlDeckPick('deck', id)); row.appendChild(mb); }
      sw.appendChild(row); txt.appendChild(sw);
    }
    const x = document.createElement('button'); x.type = 'button'; x.className = 'tool rldk-dx'; x.textContent = '✕'; x.setAttribute('aria-label', 'Let go of ' + c.n); x.addEventListener('click', () => { RLD.sel = null; rlDeckRender(); });
    det.append(big, txt, x);
  } else { const p = document.createElement('p'); p.innerHTML = '<b>' + cards.length + ' cards</b> from the rocks, the race and the haar. Tap any of them to read it.'; det.appendChild(p); }
  // the filters
  const fl = $('rlDkFilter'); fl.textContent = '';
  for (const [k, n] of [['all', 'All ' + cards.length], ['troop', 'Troops'], ['spell', 'Spells'], ['building', 'Buildings']]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rldk-chip' + (RLD.filter === k ? ' on' : '') + ' f-' + k; b.textContent = n; b.setAttribute('aria-pressed', RLD.filter === k ? 'true' : 'false');
    b.addEventListener('click', () => { RLD.filter = k; rlDeckRender(); }); fl.appendChild(b);
  }
  const so = $('rlDkSort'); if (so.value !== RLD.sort) so.value = RLD.sort;
  // the collection
  const col = $('rlDkCol'); col.textContent = '';
  const ord = { troop: 0, spell: 1, building: 2 };
  const list = cards.filter(c => RLD.filter === 'all' || c.type === RLD.filter).slice().sort((a, b) => RLD.sort === 'name' ? a.n.localeCompare(b.n) : RLD.sort === 'type' ? ord[a.type] - ord[b.type] || a.cost - b.cost : a.cost - b.cost || ord[a.type] - ord[b.type] || a.n.localeCompare(b.n));
  const swapIn = s && s.from === 'deck';
  for (const c of list) {
    const inDeck = deck.includes(c.id), b = document.createElement('button'); b.type = 'button';
    b.className = 'rldk-c' + (inDeck ? ' indeck' : '') + (s && s.from === 'col' && s.id === c.id ? ' sel' : '') + (swapIn && !inDeck ? ' swap' : '');
    b.dataset.id = c.id; b.setAttribute('aria-label', c.n + ', ' + c.cost + ' oil, ' + RL_TYPE[c.type].n.toLowerCase() + (inDeck ? ', in your deck' : swapIn ? '. Put it in' : ''));
    b.appendChild(rlCardFace(c.id, null, 96));
    if (inDeck) { const t = document.createElement('span'); t.className = 'rldk-in'; t.textContent = 'In deck'; b.appendChild(t); }
    b.addEventListener('click', () => rlDeckPick('col', c.id));
    col.appendChild(b);
  }
}
function rlDeckReset() {
  RLV.decks[RLV.dk] = rlDeckFix(rlStarter()); RLD.sel = null; rlvSave();
  rlDeckSay('Deck ' + (RLV.dk + 1) + ' is the starter deck again.');
}

rlvLoad();
if ($('rlDeckBtn')) $('rlDeckBtn').addEventListener('click', rlDeckShow);
if ($('rlDeckClose')) $('rlDeckClose').addEventListener('click', rlDeckHide);
if ($('rlDkReset')) $('rlDkReset').addEventListener('click', rlDeckReset);
if ($('rlDkSort')) $('rlDkSort').addEventListener('change', e => { RLD.sort = e.target.value; rlDeckRender(); });
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const card = $('rlDeckCard'); if (!card || card.hidden) return;
  e.preventDefault(); e.stopPropagation();
  if (RLD.sel) { RLD.sel = null; rlDeckRender(); } else rlDeckHide();
}, true);
rlDeckBtnLabel();
