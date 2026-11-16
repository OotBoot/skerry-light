'use strict';
// Skerry Clash: the triple draft. Instead of bringing your own deck, both keepers build one on the spot: eight rounds,
// three cards offered each round, take one. The two you leave are gone. After the eighth pick the duel begins with the
// eight you took.
//
// The offers come from a seed (rldOffers(seed)), so both screens of an online duel see the very same three each round,
// and both keepers are offered the same cards: it's who picks better that counts, not who was dealt better. No card is
// offered twice in one draft (24 different cards in all). Each round has a theme, so every drafted deck can hold its
// own: a big hitter, two rounds of things that hit flyers, a striking spell, two cheap troops, a building or a spell,
// and one where anything goes. The order of the rounds is shuffled by the seed.
//
// The draft happens in the game itself: the arena comes up, empty but for the six towers, seen from your own end
// (rldScene: RL.ph 'draft' with RL.on false, so the match doesn't run and the online code still counts it as the lobby;
// src/rl.js's rlFrame only draws), and the three cards sit over it at the foot of the screen. When both decks are
// done rlStart begins the duel on the same screen; leaving or a draft called off goes back to the menu (rlExit).
// Against the bot (rldBot, #rlDraftBot on the Skerry Clash card) there's no clock; the bot drafts from the same offers
// (rldBotPicks: easy at random, normal and hard keeping its average oil near 3.6 and taking the stronger card). Online
// (src/rlnet.js) each pick has 15 seconds, and a card is taken for you at random when it runs out; when you're done
// your deck goes to the host in your lobby presence (dd), who checks every card was one of that round's offers
// (rldValid) and starts the duel with both decks.
//
// The global API:
//   rldOffers(seed)          -> [[3 ids] x 8] and .th, the theme of each round
//   rldValid(seed, deck)     -> true if each of the 8 was one of its round's three
//   rldOpen(o)               the draft, in the arena: o = { seed, net (online, with the clock), vs (the rival's name),
//                            me (0 or 1, which end you see it from), names, skins, done(deck) }
//   rldClose(keep)           shuts it without finishing (done is not called), and leaves the arena unless keep (the
//                            duel is about to begin there)
//   rldRival(n)              online: how many the rival has picked, for the line under the offers
//   RLDR                     the draft under way (on, seed, offers, picks, net)

var RLDR = { on: false, seed: 0, offers: [], picks: [], net: false, vs: '', done: null, rival: -1, t0: 0, tm: null, lock: false };
const RLD_ROUNDS = 8, RLD_PICK = 15;   // (seconds a pick online)
const RLD_TH = { win: 'A big hitter', air: 'Something that hits flyers', hit: 'A spell that strikes', cheap: 'A cheap troop', tool: 'A building or a spell', any: 'Anything goes' };
// the pools each theme draws from (as the bot deals its decks, src/rlbot.js)
function rldPool(th) {
  const all = RL_CARDS;
  if (th === 'win') return all.filter(C => C.type === 'troop' && (C.tg === 'build' && C.ab !== 'bomb' || C.hp * (C.cnt || 1) >= 2000));
  if (th === 'air') return all.filter(C => C.type !== 'spell' && C.tg === 'any' && C.dmg > 0 && C.ab !== 'burst');
  if (th === 'hit') return all.filter(C => C.type === 'spell' && C.dmg > 0 && C.ab !== 'summon');
  if (th === 'cheap') return all.filter(C => C.type === 'troop' && C.cost <= 2);
  if (th === 'tool') return all.filter(C => C.type !== 'troop');
  return all;
}
function rldOffers(seed) {
  const R = rlRng(((seed >>> 0) ^ 0x5bd1e995) >>> 0), used = new Set(), out = [];
  const th = ['win', 'air', 'air', 'hit', 'cheap', 'cheap', 'tool', 'any'];
  for (let i = th.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [th[i], th[j]] = [th[j], th[i]]; }
  for (const t of th) {
    const o = [];
    for (const L of [rldPool(t), RL_CARDS]) {   // (the theme's own first; anything, should it run short)
      const left = L.filter(C => !used.has(C.id));
      while (o.length < 3 && left.length) { const C = left.splice((R() * left.length) | 0, 1)[0]; used.add(C.id); o.push(C.id); }
    }
    out.push(o);
  }
  out.th = th;
  return out;
}
function rldValid(seed, d) { if (!Array.isArray(d) || d.length !== RLD_ROUNDS) return false; const O = rldOffers(seed); return d.every((id, i) => O[i].includes(id)); }
// the bot's picks: easy at random; otherwise the card that keeps its average oil nearest 3.6, the stronger fighter on a near tie
function rldBotPicks(O, lvl) {
  const d = [];
  for (const o of O) {
    if (lvl === 'easy') { d.push(o[(Math.random() * 3) | 0]); continue; }
    const sum = d.reduce((a, id) => a + RL_CARD[id].cost, 0), left = RLD_ROUNDS - d.length;
    const score = id => { const C = RL_CARD[id], avg = (sum + C.cost + 3.6 * (left - 1)) / RLD_ROUNDS, v = typeof rlBotVal === 'function' ? rlBotVal(C) : 0;
      return -Math.abs(avg - 3.6) * 4 + (C.type === 'spell' ? 1.2 : Math.min(2, v / 1500)) + Math.random() * (lvl === 'hard' ? 0.3 : 1); };
    d.push(o.slice().sort((a, b) => score(b) - score(a))[0]);
  }
  return d;
}

// ---------- the draft screen ----------
function rldOpen(o) {
  o = o || {};
  Object.assign(RLDR, { on: true, seed: o.seed >>> 0, offers: rldOffers(o.seed >>> 0), picks: [], net: !!o.net, vs: o.vs || '', done: o.done || null, rival: -1, t0: performance.now(), lock: false });
  try { audioInit(); } catch (e) {}
  const card = $('rlDraftCard'); if (!card) return;
  for (const id of ['rlDeckCard', 'rlCrateCard']) { const e = $(id); if (e) e.hidden = true; }
  rldScene(o);
  card.hidden = false; card.scrollTop = 0; rldRender();
  clearInterval(RLDR.tm); RLDR.tm = setInterval(rldClock, 100);
}
function rldClose(keep) {
  RLDR.on = false; RLDR.done = null; clearInterval(RLDR.tm); RLDR.tm = null; const c = $('rlDraftCard'); if (c) c.hidden = true;
  if ($('rlUI')) $('rlUI').classList.remove('drafting');
  if (!keep && RL.ph === 'draft' && !RL.on && typeof rlExit === 'function') rlExit();
}
// the arena for the draft: the match set up as rlStart does (towers, names, skins), then held before it begins
function rldScene(o) {
  if (RL.on || typeof rlStart !== 'function') return;
  rlStart({ mode: 'bot', me: o.me === 1 ? 1 : 0, names: o.names, skins: o.skins });
  Object.assign(RL, { on: false, ph: 'draft', FX: [] });
  $('rlUI').classList.add('drafting'); $('rlPause').hidden = true;
}
function rldRival(n) { if (RLDR.rival === n) return; RLDR.rival = n; if (RLDR.on) rldHint(); }
function rldPick(id) {
  const r = RLDR.picks.length;
  if (!RLDR.on || RLDR.lock || r >= RLD_ROUNDS || !RLDR.offers[r].includes(id)) return;
  RLDR.picks.push(id); RLDR.lock = true;
  try { sfxTick(); } catch (e) {}
  const el = $('rlDrOffer'); if (el) for (const b of el.children) b.classList.add(b.dataset.id === id ? 'took' : 'left');
  setTimeout(() => {
    RLDR.lock = false; RLDR.t0 = performance.now(); if (!RLDR.on) return;
    rldRender();
    if (RLDR.picks.length >= RLD_ROUNDS && RLDR.done) { const f = RLDR.done, d = RLDR.picks.slice(); if (!RLDR.net) RLDR.done = null; setTimeout(() => { if (RLDR.on) f(d); }, RLDR.net ? 0 : 700); }
  }, 380);
}
// online, the clock on each pick: at nought a card is taken at random
function rldClock() {
  if (!RLDR.on || !RLDR.net || RLDR.lock || RLDR.picks.length >= RLD_ROUNDS) return;
  const left = RLD_PICK - (performance.now() - RLDR.t0) / 1000, bar = $('rlDrTime');
  if (bar) { bar.hidden = false; bar.firstChild.style.width = Math.max(0, left / RLD_PICK * 100) + '%'; bar.classList.toggle('low', left < 5); bar.lastChild.textContent = Math.max(0, Math.ceil(left)) + ' s'; }
  if (left <= 0) { const o = RLDR.offers[RLDR.picks.length]; rldPick(o[(Math.random() * o.length) | 0]); }
}
function rldHint() {
  const h = $('rlDrHint'); if (!h) return;
  const n = RLDR.picks.length, vs = rlnCleanName(RLDR.vs) || 'Your rival';
  const riv = RLDR.net && RLDR.rival >= 0 ? (RLDR.rival >= RLD_ROUNDS ? vs + ' has finished drafting.' : vs + ' has picked ' + RLDR.rival + ' of 8.') : '';
  h.textContent = n >= RLD_ROUNDS ? (RLDR.net ? (RLDR.rival >= RLD_ROUNDS ? 'Both decks are drafted. Lighting the lamps…' : 'Your deck is drafted. Waiting for ' + vs + ' to finish (' + Math.max(0, RLDR.rival) + ' of 8).') : 'Your deck is drafted. Lighting the lamps…')
    : 'Take one. The other two are gone for good.' + (RLDR.net ? ' A card is taken for you if the clock runs out.' : '') + (riv ? ' ' + riv : '');
}
const rlnCleanName = v => String(v == null ? '' : v).replace(/[\u0000-\u001f<>&"]/g, '').trim().slice(0, 16);
function rldRender() {
  const card = $('rlDraftCard'); if (!card || card.hidden) return;
  const n = RLDR.picks.length, fin = n >= RLD_ROUNDS, th = RLDR.offers.th || [];
  $('rlDrEye').textContent = 'Skerry Clash · triple draft' + (RLDR.vs ? ' · against ' + rlnCleanName(RLDR.vs) : '');
  $('rlDrHead').textContent = fin ? 'Your deck is ready' : 'Round ' + (n + 1) + ' of 8';
  $('rlDrTheme').textContent = fin ? '' : RLD_TH[th[n]] || '';
  const bar = $('rlDrTime'); if (bar) bar.hidden = !RLDR.net || fin;
  // the three
  const of = $('rlDrOffer'); of.textContent = ''; of.hidden = fin;
  if (!fin) RLDR.offers[n].forEach((id, k) => {
    const c = RL_CARD[id], b = document.createElement('button'); b.type = 'button'; b.className = 'rldr-c'; b.dataset.id = id;
    b.setAttribute('aria-label', 'Take ' + c.n + ', ' + c.cost + ' oil, ' + RL_TYPE[c.type].n.toLowerCase() + '. ' + c.d);
    b.appendChild(rlCardFace(id, null, 150));
    const W = typeof rlCardWords === 'function' ? rlCardWords(id) : { rows: [] }, tx = document.createElement('div'); tx.className = 'rldr-txt';
    const ln = document.createElement('p'); ln.className = 'rldr-line'; ln.textContent = c.d; tx.appendChild(ln);
    const dl = document.createElement('dl'); for (const [a, v] of W.rows.slice(0, 3)) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = a; dd.textContent = v; dl.append(dt, dd); } tx.appendChild(dl);
    const k1 = document.createElement('span'); k1.className = 'rldr-key'; k1.textContent = 'Take it · ' + (k + 1); tx.appendChild(k1);
    b.appendChild(tx); b.addEventListener('click', () => rldPick(id)); of.appendChild(b);
  });
  // the deck so far
  const dv = $('rlDrDeck'); dv.textContent = '';
  for (let i = 0; i < RLD_ROUNDS; i++) {
    const s = document.createElement('div'); s.className = 'rldr-slot' + (i === n ? ' now' : '');
    if (RLDR.picks[i]) s.appendChild(rlCardFace(RLDR.picks[i], null, 72)); else { const e = document.createElement('span'); e.textContent = i + 1; s.appendChild(e); }
    dv.appendChild(s);
  }
  const cs = RLDR.picks.map(id => RL_CARD[id]), avg = cs.reduce((a, c) => a + c.cost, 0) / Math.max(1, cs.length);
  $('rlDrAvg').textContent = cs.length ? avg.toFixed(1) + ' average oil' : '';
  rldHint();
  if (!fin) setTimeout(() => { const f = of.firstChild; if (f && RLDR.on && document.activeElement === document.body) f.focus({ preventScroll: true }); }, 30);
}
// leaving the draft: against the bot, back to the card; online, out of the lobby too (the other side hears of it)
function rldLeave() {
  if (!RLDR.on) return;
  const net = RLDR.net; rldClose();
  if (net && typeof rlnLeave === 'function') rlnLeave();
  try { sfxTick(); } catch (e) {}
}
// against the bot: draft, the bot drafts from the same offers, and the duel begins
function rldBot(lvl) {
  lvl = typeof lvl === 'string' ? lvl : ($('rlBotLvl') && $('rlBotLvl').value) || 'normal'; if (!RL_BOTNM[lvl]) lvl = 'normal';
  const seed = (Math.random() * 4294967295) >>> 0;
  const sk = typeof rlSkinMine === 'function' ? rlSkinMine() : '';
  rldOpen({ seed, vs: RL_BOTNM[lvl], me: 0, names: [rlMyName(), RL_BOTNM[lvl]], skins: [sk || '', ''], done: deck => {
    rldClose(true);
    rlStart({ mode: 'bot', me: 0, names: [rlMyName(), RL_BOTNM[lvl]], decks: [deck, rldBotPicks(rldOffers(seed), lvl)], skins: [sk || '', ''], lvl, draft: 1 });
  } });
}

(function rldInit() {
  if ($('rlDraftBot')) $('rlDraftBot').addEventListener('click', () => rldBot());
  if ($('rlDrLeave')) $('rlDrLeave').addEventListener('click', rldLeave);
  addEventListener('keydown', e => {
    if (!RLDR.on || $('rlDraftCard').hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); rldLeave(); return; }
    const k = '123'.indexOf(e.key), o = RLDR.offers[RLDR.picks.length];
    if (k >= 0 && o && !e.repeat) { e.preventDefault(); e.stopPropagation(); rldPick(o[k]); }
  }, true);
})();
