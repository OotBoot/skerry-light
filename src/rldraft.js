'use strict';
// Skerry Clash: the triple draft. Instead of bringing your own deck, both keepers build one on the spot: eight rounds,
// three cards offered each round, take one. The two you leave are gone. After the eighth pick the duel begins with the
// eight you took.
//
// The offers come from a seed (rldOffersBoth(seed)), so both screens of an online duel agree on them. Each keeper gets
// their own three each round (none of them the other keeper's three that round, where the theme allows), and sees the
// other's three under their own (rldTheirs), but never which one the other took. No card is offered twice to the same
// keeper (24 different cards each). Each round has a theme, so every drafted deck can hold its
// own: a big hitter, two rounds of things that hit flyers, a striking spell, two cheap troops, a building or a spell,
// and one where anything goes. The order of the rounds is shuffled by the seed.
//
// The draft happens in the game itself: the arena comes up, empty but for the six towers, seen from your own end
// (rldScene: RL.ph 'draft' with RL.on false, so the match doesn't run and the online code still counts it as the lobby;
// src/rl.js's rlFrame only draws), and the three cards sit over it at the foot of the screen. When both decks are
// done rlStart begins the duel on the same screen; leaving or a draft called off goes back to the menu (rlExit).
// Against the bot (rldBot, #rlDraftBot on the Skerry Clash card) there's no clock; the bot drafts from its own offers
// (rldBotPicks: easy at random, normal and hard keeping its average oil near 3.6 and taking the stronger card). Online
// (src/rlnet.js) each pick has 15 seconds, and a card is taken for you at random when it runs out; when you're done
// your deck goes to the host in your lobby presence (dd), who checks every card was one of that round's offers
// (rldValid) and starts the duel with both decks.
//
// The global API:
//   rldOffersBoth(seed)      -> [side 0's, side 1's], each [[3 ids] x 8] with .th, the theme of each round (the same for both)
//   rldOffers(seed, side)    -> that side's
//   rldValid(seed, deck, side) -> true if each of the 8 was one of that side's three that round
//   rldOpen(o)               the draft, in the arena: o = { seed, net (online, with the clock), vs (the rival's name),
//                            me (0 or 1, which end you see it from), names, skins, done(deck) }
//   rldClose(keep)           shuts it without finishing (done is not called), and leaves the arena unless keep (the
//                            duel is about to begin there)
//   rldRival(n)              online: how many the rival has picked, for the line under the offers
//   rldWatch(o)              a watcher's view of an online draft (src/rlnet.js): o = { seed, names, skins }; the same
//                            arena and card, but with both keepers side by side, each with the round they're on, the
//                            three they're choosing from and the deck so far. A watcher can't pick.
//   rldWatchSet(i, picks)    how far keeper i has got (their picks so far, from their lobby presence's dd.pk)
//   RLDR                     the draft under way (as above; spec, wo both keepers' offers, wp [picks, picks] when watching)

var RLDR = { spec: false, wp: [[], []], wn: ['', ''], pick: null, on: false, seed: 0, offers: [], picks: [], net: false, vs: '', done: null, rival: -1, t0: 0, tm: null, lock: false };
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
// both keepers' offers: the same theme each round, different cards (none of one side's three in the other's that
// round, where the theme's pool allows), and no card twice for the same keeper
function rldOffersBoth(seed) {
  const R = rlRng(((seed >>> 0) ^ 0x5bd1e995) >>> 0), used = [new Set(), new Set()], out = [[], []];
  const th = ['win', 'air', 'air', 'hit', 'cheap', 'cheap', 'tool', 'any'];
  for (let i = th.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [th[i], th[j]] = [th[j], th[i]]; }
  for (const t of th) {
    const both = [];
    for (const s of [0, 1]) {
      const o = [];
      for (const L of [rldPool(t).filter(C => !both.includes(C.id)), rldPool(t), RL_CARDS]) {   // (the theme's own, not the other's this round; then the theme's own; then anything)
        const left = L.filter(C => !used[s].has(C.id) && !o.includes(C.id));
        while (o.length < 3 && left.length) { const C = left.splice((R() * left.length) | 0, 1)[0]; used[s].add(C.id); o.push(C.id); }
      }
      both.push(...o); out[s].push(o);
    }
  }
  out[0].th = th; out[1].th = th;
  return out;
}
function rldOffers(seed, side) { return rldOffersBoth(seed)[side === 1 ? 1 : 0]; }
function rldValid(seed, d, side) { if (!Array.isArray(d) || d.length !== RLD_ROUNDS) return false; const O = rldOffers(seed, side); return d.every((id, i) => O[i].includes(id)); }
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
  const me = o.me === 1 ? 1 : 0, OB = rldOffersBoth(o.seed >>> 0);
  Object.assign(RLDR, { spec: false, on: true, seed: o.seed >>> 0, me, offers: OB[me], ro: OB[1 - me], picks: [], net: !!o.net, vs: o.vs || '', done: o.done || null, pick: o.pick || null, rival: -1, t0: performance.now(), lock: false });
  try { audioInit(); } catch (e) {}
  const card = $('rlDraftCard'); if (!card) return;
  for (const id of ['rlDeckCard', 'rlCrateCard']) { const e = $(id); if (e) e.hidden = true; }
  rldScene(o); if ($('rlDrRival')) $('rlDrRival').dataset.k = '';
  card.hidden = false; card.scrollTop = 0; rldRender();
  clearInterval(RLDR.tm); RLDR.tm = setInterval(rldClock, 100);
}
function rldClose(keep) {
  RLDR.on = false; RLDR.spec = false; RLDR.pick = null; if ($('rlDraftCard')) $('rlDraftCard').classList.remove('spec'); RLDR.done = null; clearInterval(RLDR.tm); RLDR.tm = null; const c = $('rlDraftCard'); if (c) c.hidden = true;
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
function rldRival(n) { if (RLDR.rival === n) return; RLDR.rival = n; if (RLDR.on) { rldHint(); rldTheirs(); } }
// the rival's three this round (theirs, which online may be ahead of or behind yours), never which they took
function rldTheirs() {
  const el = $('rlDrRival'); if (!el) return;
  const r = RLDR.net ? RLDR.rival : RLDR.picks.length, vs = rlnCleanName(RLDR.vs) || 'Your rival';
  const key = r + '|' + vs; if (el.dataset.k === key) return; el.dataset.k = key; el.textContent = '';
  if (r < 0 || r >= RLD_ROUNDS || !RLDR.ro[r]) { el.hidden = r < RLD_ROUNDS; if (!el.hidden) { const p = document.createElement('span'); p.className = 'rldr-rvh'; p.textContent = vs + ' has drafted their deck.'; el.appendChild(p); } return; }
  el.hidden = false;
  const h = document.createElement('span'); h.className = 'rldr-rvh'; h.textContent = vs + '’s choices' + (RLDR.net ? ', round ' + (r + 1) : '') + ':'; el.appendChild(h);
  for (const id of RLDR.ro[r]) { const c = RL_CARD[id], f = rlCardFace(id, null, 74); f.title = c ? c.n + ' · ' + c.cost + ' oil' : id; el.appendChild(f); }
}
function rldPick(id) {
  const r = RLDR.picks.length;
  if (!RLDR.on || RLDR.spec || RLDR.lock || r >= RLD_ROUNDS || !RLDR.offers[r].includes(id)) return;
  RLDR.picks.push(id); RLDR.lock = true;
  if (RLDR.pick) { try { RLDR.pick(RLDR.picks.slice()); } catch (e) { console.error(e); } }   // (online: the pick out to the rival and the watchers at once)
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
  if (!RLDR.on || RLDR.spec || !RLDR.net || RLDR.lock || RLDR.picks.length >= RLD_ROUNDS) return;
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
  const wv = $('rlDrWatch'); if (wv) wv.hidden = !RLDR.spec;
  for (const id of ['rlDrHint', 'rlDrDeck', 'rlDrAvg']) { const e = $(id); if (e) e.hidden = RLDR.spec; }
  for (const id of ['rlDrOffer', 'rlDrRival', 'rlDrTime']) { const e = $(id); if (e && RLDR.spec) e.hidden = true; }
  const dh = card.querySelector('.rldr-deckhead'); if (dh) dh.hidden = RLDR.spec;
  if (RLDR.spec) { rldRenderWatch(); return; }
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
  rldTheirs();
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
// ---------- watching a draft online ----------
function rldWatch(o) {
  o = o || {};
  const OB = rldOffersBoth(o.seed >>> 0);
  Object.assign(RLDR, { on: true, spec: true, seed: o.seed >>> 0, me: 0, offers: OB[0], ro: OB[1], wo: OB, picks: [], wp: [[], []], wn: (o.names || []).slice(0, 2).map(rlnCleanName), net: true, vs: '', done: null, pick: null, rival: -1, t0: performance.now(), lock: false, wk: '', wl: null });
  const card = $('rlDraftCard'); if (!card) return;
  for (const id of ['rlDeckCard', 'rlCrateCard']) { const e = $(id); if (e) e.hidden = true; }
  rldScene({ me: 0, names: o.names, skins: o.skins });
  card.classList.add('spec'); card.hidden = false; card.scrollTop = 0; clearInterval(RLDR.tm); RLDR.tm = null; rldRender();
}
// keeper i's picks so far (only cards that were really on offer in that round, in order, eight at most)
function rldWatchSet(i, picks) {
  if (!RLDR.on || !RLDR.spec || (i !== 0 && i !== 1)) return;
  const P = []; if (Array.isArray(picks)) for (let r = 0; r < Math.min(RLD_ROUNDS, picks.length); r++) { if (!RLDR.wo[i][r].includes(picks[r])) break; P.push(picks[r]); }
  if (P.length < RLDR.wp[i].length && P.join() === RLDR.wp[i].slice(0, P.length).join()) return;   // (an older word than we've had)
  RLDR.wp[i] = P; rldRenderWatch();
}
// both keepers side by side: who, which round and its theme, the three they're choosing from (for a moment after a
// pick, the round just gone with the card they took lit up), and the deck so far with its average oil
function rldRenderWatch() {
  const wv = $('rlDrWatch'), card = $('rlDraftCard'); if (!wv || !card || card.hidden) return;
  const now = performance.now(), L = RLDR.wl || (RLDR.wl = { n: [0, 0], at: [0, 0] });
  RLDR.wp.forEach((P, i) => { if (P.length > L.n[i]) { L.at[i] = now + 900; setTimeout(rldRenderWatch, 920); } L.n[i] = P.length; });
  const lit = L.at.map(t => t > now), key = JSON.stringify(RLDR.wp) + lit.join() + RLDR.wn.join('|'); if (RLDR.wk === key) return; RLDR.wk = key;
  const done = RLDR.wp.map(p => p.length >= RLD_ROUNDS);
  $('rlDrEye').textContent = 'Skerry Clash · triple draft · watching';
  $('rlDrHead').textContent = done[0] && done[1] ? 'Both decks are drafted' : 'Watching the draft';
  $('rlDrTheme').textContent = done[0] && done[1] ? 'Lighting the lamps…' : 'Each keeper’s three, and the deck they’re building';
  wv.textContent = '';
  RLDR.wp.forEach((P, i) => {
    const n = P.length, col = document.createElement('section'); col.className = 'rldr-wk' + (i ? ' them' : ' us');
    const hd = document.createElement('div'); hd.className = 'rldr-wkhead';
    const nm = document.createElement('b'); nm.textContent = RLDR.wn[i] || (i ? 'The guest' : 'The host');
    const rd = document.createElement('span'); const th = RLDR.wo[i].th || []; rd.textContent = n >= RLD_ROUNDS ? 'Deck done' : `Round ${n + 1} of 8 · ${RLD_TH[th[n]] || ''}`;
    hd.append(nm, rd); col.appendChild(hd);
    const r = lit[i] ? n - 1 : n, of = document.createElement('div'); of.className = 'rldr-woffer';
    if (r < RLD_ROUNDS) RLDR.wo[i][r].forEach(id => { const c = document.createElement('div'); c.className = 'rldr-wc' + (lit[i] ? (P[r] === id ? ' took' : ' left') : ''); c.title = RL_CARD[id].n + ' (' + RL_CARD[id].cost + '): ' + RL_CARD[id].d; c.appendChild(rlCardFace(id, null, 96)); of.appendChild(c); });
    else { const p = document.createElement('p'); p.className = 'muted'; p.textContent = done[1 - i] ? 'Ready.' : 'Waiting for the other deck.'; of.appendChild(p); }
    col.appendChild(of);
    const dv = document.createElement('div'); dv.className = 'rldr-deck rldr-wdeck';
    for (let k = 0; k < RLD_ROUNDS; k++) { const s = document.createElement('div'); s.className = 'rldr-slot' + (k === n ? ' now' : ''); if (P[k]) s.appendChild(rlCardFace(P[k], null, 48)); else { const e = document.createElement('span'); e.textContent = k + 1; s.appendChild(e); } dv.appendChild(s); }
    col.appendChild(dv);
    const avg = n ? P.reduce((a, id) => a + RL_CARD[id].cost, 0) / n : 0, ft = document.createElement('small'); ft.className = 'rldr-wavg'; ft.textContent = n ? `${n} of 8 taken · ${avg.toFixed(1)} average oil` : 'Nothing taken yet';
    col.appendChild(ft); wv.appendChild(col);
  });
}
// leaving the draft: against the bot, back to the card; online, out of the lobby too (the other side hears of it)
function rldLeave() {
  if (!RLDR.on) return;
  const net = RLDR.net; rldClose();
  if (net && typeof rlnLeave === 'function') rlnLeave();
  try { sfxTick(); } catch (e) {}
}
// against the bot: draft, the bot drafts from its own offers, and the duel begins
function rldBot(lvl) {
  lvl = typeof lvl === 'string' ? lvl : ($('rlBotLvl') && $('rlBotLvl').value) || 'normal'; if (!RL_BOTNM[lvl]) lvl = 'normal';
  const seed = (Math.random() * 4294967295) >>> 0;
  const sk = typeof rlSkinMine === 'function' ? rlSkinMine() : '';
  rldOpen({ seed, vs: RL_BOTNM[lvl], me: 0, names: [rlMyName(), RL_BOTNM[lvl]], skins: [sk || '', ''], done: deck => {
    rldClose(true);
    rlStart({ mode: 'bot', me: 0, names: [rlMyName(), RL_BOTNM[lvl]], decks: [deck, rldBotPicks(rldOffers(seed, 1), lvl)], skins: [sk || '', ''], lvl, draft: 1 });
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
