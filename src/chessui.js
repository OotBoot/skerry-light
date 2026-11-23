'use strict';
// Skerry Chess: the board on the screen, the card on the title screen, and a game against a bot or another player.
// The rules and the bots are in src/chess.js; playing online is src/chnet.js.
//
// The screen (#chUI) is plain HTML over the menu: the board is 64 buttons, each piece an SVG drawn here (CH_SVG). There
// are two sets: the classic set for standard chess, and the Skerry set for Skerry rules (keeper, lantern, tower,
// cutter, gannet and hand, Light against the Wreckers), with the reef's rocks and the Light drawn on the board.
// Tap or click a piece and then a square (its moves are marked), or drag it. Keys: the arrows move a cursor round the
// board and Enter or Space picks up and puts down; Esc lets go, or opens the menu. Controller: the D-pad moves the
// cursor, A picks up and puts down, B lets go, Start the menu.
// Against a bot: you choose white, black or either, the bot thinks for up to two seconds (on Hard), and Take back
// undoes your last move and its reply. An unfinished game against a bot is kept and offered again on the card.
// What's kept (localStorage 'skerry-chess'): the settings, the unfinished game, and your record against each bot and
// online, for each set of rules.
// Debug and tests: CHS is the state; chDebug(o) starts a game (o as chStart's), chDebugMoves(['e2e4', ...]) plays moves.

var CHS = { on: false, G: null, v: 'std', opp: 'fair', me: 1, flip: false, sel: -1, cur: 52, busy: false, net: null, endShown: false, padPrev: [], names: ['', ''], drawOffer: false };
const chStore = { get() { try { return JSON.parse(localStorage.getItem('skerry-chess') || '{}') || {}; } catch (e) { return {}; } }, set(v) { try { localStorage.setItem('skerry-chess', JSON.stringify(v)); } catch (e) {} } };
const chEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const CH_NAMES = { std: ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'], sk: ['', 'hand', 'gannet', 'cutter', 'tower', 'lantern', 'keeper'] };
const CH_SIDES = { std: ['White', 'Black'], sk: ['the Light', 'the Wreckers'] };
const CH_SKILLN = { easy: 'Easy', fair: 'Fair', hard: 'Hard' };

// ---------- the pieces ----------
// Each piece in a 45 by 45 box on a common foot. Colours by side and set: the classic set cream and ebony, the Skerry
// set lamplit brass for the Light and tarred black and red for the Wreckers.
const CH_BASE = '<path d="M9.5 40h26v-3.2c0-1.6-1.2-2.8-2.8-2.8H12.3c-1.6 0-2.8 1.2-2.8 2.8z"/>';
const CH_SHAPES = {
  std: {
    1: '<path d="M15.5 34c0-5.5 2.7-9.6 5.2-11.5h3.6c2.5 1.9 5.2 6 5.2 11.5z"/><ellipse cx="22.5" cy="22" rx="6.2" ry="1.9"/><circle cx="22.5" cy="15" r="5.6"/>',
    2: '<path d="M13.5 34c0-6.5 3.5-9.5 6.8-12.5-3.4.4-6.2 1.9-8.2 3.9-2-1.2-2.3-3.4-.8-5.4 3-4 7-7.8 9-12.2l1.8 3.3C28 12 33 17.5 33 25.5V34z"/><circle class="d" cx="19" cy="13.5" r="1.3"/>',
    3: '<path d="M15 34c0-6 2.2-10 4.2-12.2h6.6C27.8 24 30 28 30 34z"/><path d="M22.5 8.5c-4.2 3.6-7.2 7.6-7.2 10.6 0 3 3.2 4.2 7.2 4.2s7.2-1.2 7.2-4.2c0-3-3-7-7.2-10.6z"/><circle cx="22.5" cy="6.8" r="2.2"/><path class="d" d="M24.8 12.5l-3.6 5" fill="none"/>',
    4: '<path d="M14.5 34l1.6-15.2h12.8l1.6 15.2z"/><path d="M12 19.5h21v-9h-4.2v3.2h-3.6v-3.2h-5.4v3.2h-3.6v-3.2H12z"/>',
    5: '<path d="M13.5 34l-2.6-17.5 5.6 8.2 2-11.4 4 10.6 4-10.6 2 11.4 5.6-8.2-2.6 17.5z"/><circle cx="10.6" cy="15" r="2.3"/><circle cx="18.4" cy="11.6" r="2.3"/><circle cx="22.5" cy="10.4" r="2.3"/><circle cx="26.6" cy="11.6" r="2.3"/><circle cx="34.4" cy="15" r="2.3"/>',
    6: '<path d="M14.5 34c-1-6-4.6-9-4.6-13.4 0-3.4 3.4-5.4 6.6-3.4l6 3.8 6-3.8c3.2-2 6.6 0 6.6 3.4 0 4.4-3.6 7.4-4.6 13.4z"/><path d="M21 4h3v3.2h3.2v3H24v6.6h-3v-6.6h-3.2v-3H21z"/>',
  },
  sk: {
    // a hand: a deckhand in a sou'wester
    1: '<path d="M15.5 34c0-5.5 2.7-9.4 5-11h4c2.3 1.6 5 5.5 5 11z"/><circle cx="22.5" cy="17" r="4.8"/><path d="M13.8 15.6c2.4-1.2 5.4-1.8 8.7-1.8s6.3.6 8.7 1.8c-1.4-4.8-4.6-7.6-8.7-7.6s-7.3 2.8-8.7 7.6z"/>',
    // a gannet: a seabird with its long bill, head up
    2: '<path d="M12.5 34c.5-5.5 3.2-9.6 7-12 -1.2-3-1.4-6.4.6-9.4 1.6-2.4 4.4-3.4 6.8-2.6l9 3.2-8.6.6c.6 2.4.2 5-1 7.4 4.8 2.2 7.2 6.6 7.2 12.8z"/><circle class="d" cx="24.2" cy="12.6" r="1.2"/><path class="d" d="M19.5 27c3 1.2 6.4 1.2 9.5-.2" fill="none"/>',
    // a cutter: a hull and one tall sail
    3: '<path d="M11 28h23l-3.6 6H14.6z"/><path d="M23.4 5.5v21.5h9.2C31.4 18.6 28.4 11 23.4 5.5z"/><path d="M21.6 9.5v17.5h-8.4c1.6-6.6 4.6-12.6 8.4-17.5z"/><path class="d" d="M22.5 5v23" fill="none"/>',
    // a tower: a lighthouse, banded, with its lantern room
    4: '<path d="M15.8 34l2.6-18.5h8.2l2.6 18.5z"/><path class="d" d="M17.5 22.5h10M16.8 28h11.4" fill="none"/><path d="M16.4 15.5h12.2v-2.2H16.4z"/><path d="M18.6 13.3V9.4h7.8v3.9z"/><path d="M17.6 9.4l4.9-4.2 4.9 4.2z"/><circle class="g" cx="22.5" cy="11.4" r="1.5"/>',
    // a lantern: Maren's hand lantern, ringed on top, its flame lit
    5: '<path d="M14.8 34l1.6-3h12.2l1.6 3z"/><path d="M16 31V15.6h13V31z"/><path d="M14.6 15.6h15.8l-2.4-4.2H17z"/><path d="M19.2 11.4c0-2.4 1.4-4.2 3.3-4.2s3.3 1.8 3.3 4.2" fill="none"/><path class="g" d="M22.5 18.2c-2.2 2.6-3 4.6-3 6.4 0 2 1.4 3.4 3 3.4s3-1.4 3-3.4c0-1.8-.8-3.8-3-6.4z"/><path class="d" d="M18.6 15.6V31M26.4 15.6V31" fill="none"/>',
    // a keeper: the keeper in his peaked cap, his lamp's badge on it
    6: '<path d="M12.5 34c0-7 4-11.4 7.2-12.6h5.6c3.2 1.2 7.2 5.6 7.2 12.6z"/><circle cx="22.5" cy="16.4" r="5.4"/><path d="M15.2 12.4c.4-3.6 3.4-6 7.3-6s6.9 2.4 7.3 6z"/><path d="M14 12.4h17l-1.8 2H15.4z"/><circle class="g" cx="22.5" cy="9.6" r="1.4"/><path class="d" d="M22.5 22v12" fill="none"/>',
  },
};
function chPieceSvg(p, v) {
  if (!p) return '';
  const ty = Math.abs(p), w = p > 0, set = v === 'sk' ? 'sk' : 'std';
  const cls = 'chp ' + set + (w ? ' w' : ' b');
  return `<svg class="${cls}" viewBox="0 0 45 45" aria-hidden="true"><g>${CH_BASE}${CH_SHAPES[set][ty]}</g></svg>`;
}
const CH_ROCK_SVG = '<svg class="chrock" viewBox="0 0 45 45" aria-hidden="true"><ellipse class="foam" cx="22.5" cy="31" rx="19" ry="7"/><path class="rk" d="M6 31c1-6 4-9 7-11 1-5 5-9 9-9 5 0 7 4 9 7 4 1 7 6 8 13z"/><path class="rkl" d="M13 20c2 1 3 3 3 6M22 11c-1 4 0 7 3 9M31 18c-1 3-1 6 1 9" fill="none"/></svg>';

// ---------- the board ----------
function chBuildBoard() {
  const bd = $('chBoard'); if (!bd || bd.querySelectorAll('.chsq').length === 64) return;
  bd.textContent = '';
  for (let i = 0; i < 64; i++) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chsq'; b.dataset.i = i; b.tabIndex = -1;
    bd.append(b);
  }
  bd.addEventListener('pointerdown', chPointerDown);
}
// screen cell i (0 top left) to board square, as the board is turned
function chCellSq(i) { const r = i >> 3, f = i & 7; return CHS.flip ? r * 8 + (7 - f) : (7 - r) * 8 + f; }
function chSqCell(s) { const r = s >> 3, f = s & 7; return CHS.flip ? r * 8 + (7 - f) : (7 - r) * 8 + f; }
function chRender() {
  if (!CHS.G) return;
  chBuildBoard();
  const G = CHS.G, P = G.P, bd = $('chBoard'), cells = bd.children, last = G.last;
  const targets = CHS.sel >= 0 ? G.legal.filter(m => m.f === CHS.sel) : [];
  const chk = chInCheck(P) ? P.ks[P.side] : -1;
  bd.classList.toggle('sk', G.v === 'sk');
  for (let i = 0; i < 64; i++) {
    const s = chCellSq(i), el = cells[i], f = s & 7, r = s >> 3, p = P.b[s];
    const dark = ((f + r) & 1) === 0;
    let c = 'chsq ' + (dark ? 'dk' : 'lt');
    if (P.rock[s]) c += ' rock';
    if (P.light[s]) c += ' light';
    if (last && (s === last.f || s === last.t)) c += ' last';
    if (s === CHS.sel) c += ' sel';
    const tg = targets.find(m => m.t === s);
    if (tg) c += ((p && tg.k !== 6) || tg.k === 2) ? ' cap' : ' to';   // (the keeper's swap onto its own hand shows as a move)
    if (s === chk) c += ' check';
    if (s === CHS.cur && CHS.kb) c += ' cur';
    if (p && CHS.mine(p) && !G.res) c += ' own';
    el.className = c;
    const key = (P.rock[s] ? 'R' : '') + p + G.v + (i & 7 ? '' : r) + ((i >> 3) === 7 ? f : '') + CHS.flip;
    if (el.dataset.k !== key) {
      el.dataset.k = key;
      let h = P.rock[s] ? CH_ROCK_SVG : chPieceSvg(p, G.v);
      // the files and ranks along the edges
      if ((i & 7) === 0) h += `<span class="crd rk">${r + 1}</span>`;
      if ((i >> 3) === 7) h += `<span class="crd fl">${'abcdefgh'[f]}</span>`;
      el.innerHTML = h;
    }
    const nm = P.rock[s] ? 'a rock' : p ? `${p > 0 ? CH_SIDES[G.v][0] : CH_SIDES[G.v][1]}'s ${CH_NAMES[G.v][Math.abs(p)]}` : 'empty';
    el.setAttribute('aria-label', chSqName(s) + ', ' + nm + (P.light[s] ? ', the Light' : ''));
  }
  chRenderSide();
}
function chAnimate(m) {
  const bd = $('chBoard'); if (!bd || !m) return;
  const from = bd.children[chSqCell(m.f)], to = bd.children[chSqCell(m.t)];
  if (!from || !to) return;
  if (m.k === 5) { chBeam(from, to); return; }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const slide = (el, src, dst) => {
    const svg = dst.querySelector('svg.chp'); if (!svg) return;
    const a = src.getBoundingClientRect(), b = dst.getBoundingClientRect();
    svg.style.transition = 'none'; svg.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px)`; svg.style.zIndex = 5;
    void svg.offsetWidth;
    svg.style.transition = 'transform 0.18s ease-out'; svg.style.transform = '';
    setTimeout(() => { svg.style.zIndex = ''; }, 220);
  };
  slide(null, from, to);
  if (m.k === 6) slide(null, to, from);   // (the keeper's swap: the hand goes the other way)
}
// a tower's beam: a line of light from the tower to what it hits, there and gone
function chBeam(from, to) {
  const bd = $('chBoard'), r = bd.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const x0 = a.left + a.width / 2 - r.left, y0 = a.top + a.height / 2 - r.top, x1 = b.left + b.width / 2 - r.left, y1 = b.top + b.height / 2 - r.top;
  const el = document.createElement('div'); el.className = 'chbeam';
  el.style.left = x0 + 'px'; el.style.top = y0 + 'px'; el.style.width = Math.hypot(x1 - x0, y1 - y0) + 'px'; el.style.transform = `rotate(${Math.atan2(y1 - y0, x1 - x0)}rad)`;
  bd.append(el); to.classList.add('hit');
  setTimeout(() => { el.remove(); to.classList.remove('hit'); }, 650);
}
// the names, what each side has taken, the status and the moves
function chRenderSide() {
  const G = CHS.G, v = G.v;
  const taken = side => G.caps.filter(c => (c > 0) !== (side > 0)).map(c => Math.abs(c)).sort((a, b) => b - a);
  const pts = v === 'sk' ? [0, 1, 3, 4, 5, 8, 0] : [0, 1, 3, 3, 5, 9, 0];
  const worth = side => taken(side).reduce((s, t) => s + pts[t], 0);
  const row = (id, side) => {
    const el = $(id); if (!el) return;
    const diff = worth(side) - worth(-side), nm = side === CHS.me ? CHS.names[0] : CHS.names[1];
    const turn = !G.res && G.P.side === side;
    el.classList.toggle('turn', turn);
    const k = nm + side + turn + taken(side).join('') + diff + v;
    if (el.dataset.k === k) return; el.dataset.k = k;
    el.innerHTML = `<span class="chdot ${side > 0 ? 'w' : 'b'} ${v}"></span><span class="nm">${chEsc(nm)}</span><span class="caps">${taken(side).map(t => chPieceSvg(-side * t, v)).join('')}${diff > 0 ? `<b>+${diff}</b>` : ''}</span>`;
  };
  row('chTopRow', CHS.flip ? 1 : -1); row('chBotRow', CHS.flip ? -1 : 1);
  $('chStatus').textContent = chStatusText();
  $('chGuide').hidden = v !== 'sk';
  $('chRules').textContent = CH_VARIANTS[v].name + (CHS.net ? ' · online' : ` · against ${CH_BOTS[CHS.opp].name} (${CH_SKILLN[CHS.opp]})`);
  const ol = $('chMoves'), n = Math.ceil(G.san.length / 2);
  if (ol.dataset.n !== String(G.san.length)) {
    ol.dataset.n = G.san.length; ol.textContent = '';
    for (let i = 0; i < n; i++) { const li = document.createElement('li'); li.innerHTML = `<span class="mn">${i + 1}.</span><span>${chEsc(G.san[i * 2])}</span><span>${chEsc(G.san[i * 2 + 1] || '')}</span>`; ol.append(li); }
    ol.scrollTop = ol.scrollHeight;
  }
  $('chUndo').hidden = !!CHS.net; $('chUndo').disabled = CHS.busy || !!G.res || G.uci.length < (CHS.me > 0 ? 1 : 2);
  $('chDraw').hidden = !CHS.net; $('chDraw').disabled = !!G.res;
  $('chDraw').textContent = CHS.net && typeof chnDrawState === 'function' ? chnDrawState() : 'Offer a draw';
  $('chResign').disabled = !!G.res;
}
function chStatusText() {
  const G = CHS.G, v = G.v, side = G.P.side, sides = CH_SIDES[v];
  if (G.res) return chResultText(G.res);
  const who = side === CHS.me ? 'Your move' : CHS.net ? `${CHS.names[1]} to move` : `${CHS.names[1]} is thinking…`;
  const col = side > 0 ? sides[0] : sides[1];
  const chk = chInCheck(G.P) ? (v === 'sk' ? ' Your keeper is in check!' : ' Check!') : '';
  const msg = CHS.netMsg ? ' ' + CHS.netMsg : '';
  return `${who} (${col}).${side === CHS.me ? chk : chk ? ' Check.' : ''}${msg}`;
}
function chResultText(r) {
  const v = CHS.G.v, sides = CH_SIDES[v], wn = r.w > 0 ? sides[0] : sides[1], ln = r.w > 0 ? sides[1] : sides[0];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const wins = cap(wn) + (v === 'sk' && r.w < 0 ? ' win.' : ' wins.');
  switch (r.why) {
    case 'mate': return `Checkmate. ${wins}`;
    case 'light': return `${cap(wn)}'s keeper has reached the Light. ${wins}`;
    case 'stalemate': return 'Stalemate. A draw.';
    case 'repetition': return 'The same position three times. A draw.';
    case 'fifty': return 'Fifty moves with no capture or pawn move. A draw.';
    case 'material': return 'Neither side can checkmate any more. A draw.';
    case 'agreed': return 'A draw, agreed.';
    case 'resign': return `${cap(r.who || ln)} resigned. ${wins}`;
    case 'left': return `${r.who || 'Your opponent'} left the game. You win.`;
  }
  return 'Game over.';
}

// ---------- moving ----------
CHS.mine = p => !!p && (p > 0) === (CHS.me > 0);
function chCanMove() { return CHS.on && CHS.G && !CHS.G.res && !CHS.busy && CHS.G.P.side === CHS.me && $('chPromo').hidden && $('chMenu').hidden; }
function chClickSq(s) {
  if (!CHS.G) return;
  const G = CHS.G, p = G.P.b[s];
  if (!chCanMove()) { if (p && CHS.mine(p)) { CHS.sel = -1; chRender(); } return; }
  if (CHS.sel >= 0) {
    const ms = G.legal.filter(m => m.f === CHS.sel && m.t === s);
    if (ms.length) { if (ms.length > 1 || ms[0].pr) chAskPromo(ms); else chHumanMove(ms[0]); return; }
  }
  if (p && CHS.mine(p) && G.legal.some(m => m.f === s)) { CHS.sel = s === CHS.sel ? -1 : s; chSnd('pick'); }
  else CHS.sel = -1;
  chRender();
}
function chAskPromo(ms) {
  const box = $('chPromoBtns'), v = CHS.G.v; box.textContent = '';
  for (const pr of [5, 4, 3, 2]) {
    const m = ms.find(x => x.pr === pr); if (!m) continue;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chpromo'; b.innerHTML = chPieceSvg(pr * CHS.me, v) + `<span>${CH_NAMES[v][pr]}</span>`;
    b.addEventListener('click', () => { $('chPromo').hidden = true; chHumanMove(m); });
    box.append(b);
  }
  $('chPromo').hidden = false; setTimeout(() => { const b = box.querySelector('button'); if (b) b.focus({ preventScroll: true }); }, 30);
}
function chHumanMove(m) {
  if (!m || !chCanMove()) return;
  chApply(m);
  if (CHS.net) { if (typeof chnMoved === 'function') chnMoved(); }
  else chBotTurn();
}
function chApply(m) {
  const G = CHS.G, check0 = m.cap || m.k === 2;
  if (!chPlay(G, m)) return false;
  CHS.sel = -1; chRender(); chAnimate(G.last);
  chSnd(G.res ? 'none' : chInCheck(G.P) ? 'check' : check0 ? 'take' : m.k >= 3 ? 'castle' : 'move');
  chSave();
  if (G.res) chEnded();
  return true;
}
function chBotTurn() {
  const G = CHS.G;
  if (!CHS.on || G.res || G.P.side === CHS.me || CHS.net) return;
  CHS.busy = true; chRenderSide();
  const g0 = G, t0 = performance.now();
  // (a moment first, so the move just made is drawn before the bot sits and thinks)
  setTimeout(() => {
    if (CHS.G !== g0 || !CHS.on) return;
    let m = null; try { m = chBot(G, CHS.opp); } catch (e) { console.error(e); m = G.legal[0]; }
    const wait = Math.max(0, 420 - (performance.now() - t0));
    setTimeout(() => { if (CHS.G !== g0 || !CHS.on) return; CHS.busy = false; if (m) chApply(m); chRenderSide(); }, wait);
  }, 60);
}
function chUndo() {
  if (CHS.net || CHS.busy || !CHS.G || CHS.G.res) return;
  const u = CHS.G.uci.slice();
  // back to the last position with you to move: your move and the bot's reply
  u.pop(); if ((u.length % 2 === 0) !== (CHS.me > 0)) u.pop();
  CHS.G = chReplay(CHS.v, u); CHS.sel = -1; chSave(); chRender(); chSnd('pick');
}

// ---------- pointer: tap, or drag ----------
function chPointerDown(e) {
  const cell = e.target.closest('.chsq'); if (!cell) return;
  const s = chCellSq(+cell.dataset.i); CHS.kb = false;
  const p = CHS.G && CHS.G.P.b[s];
  // (a tap on one of your own pieces that the chosen piece can move to, such as the keeper's swap, makes that move)
  const swap = CHS.sel >= 0 && CHS.G && CHS.G.legal.some(m => m.f === CHS.sel && m.t === s);
  if (swap || !(chCanMove() && p && CHS.mine(p))) { chClickSq(s); return; }
  e.preventDefault();
  const svg = cell.querySelector('svg.chp'), r0 = cell.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
  let drag = false;
  const wasSel = CHS.sel === s;
  if (!wasSel) { CHS.sel = s; chSnd('pick'); chRender(); }
  const live = $('chBoard').children[+cell.dataset.i].querySelector('svg.chp') || svg;
  const move = ev => {
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    if (!drag && Math.hypot(dx, dy) > 6) { drag = true; live.classList.add('drag'); }
    if (drag) live.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;
  };
  const up = ev => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    live.classList.remove('drag'); live.style.transform = '';
    if (!drag) { if (wasSel) { CHS.sel = -1; chRender(); } return; }
    const el = document.elementFromPoint(ev.clientX, ev.clientY), c2 = el && el.closest && el.closest('.chsq');
    const t = c2 ? chCellSq(+c2.dataset.i) : -1;
    if (t >= 0 && t !== s) chClickSq(t); else chRender();
    void r0;
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}

// ---------- keys and the controller ----------
function chCursor(df, dr) {
  // (the cursor moves as you see the board)
  const sgn = CHS.flip ? -1 : 1, f = (CHS.cur & 7) + df * sgn, r = (CHS.cur >> 3) + dr * sgn;
  if (f < 0 || f > 7 || r < 0 || r > 7) return;
  CHS.cur = r * 8 + f; CHS.kb = true; chRender();
}
function chKeyDown(e) {
  if (state !== 'chess') return;
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.key !== 'Escape') return;
  const k = e.key;
  if (k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (!$('chPromo').hidden) { $('chPromo').hidden = true; CHS.sel = -1; chRender(); } else if (!$('chEnd').hidden) return; else if (CHS.sel >= 0) { CHS.sel = -1; chRender(); } else chMenuOpen($('chMenu').hidden); return; }
  if (!$('chMenu').hidden || !$('chPromo').hidden || !$('chEnd').hidden) return;
  e.stopImmediatePropagation();
  if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.ch-side')) return;   // (the buttons beside the board keep their keys)
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[k];
  if (d) { e.preventDefault(); if (!CHS.kb) { CHS.kb = true; if (CHS.sel >= 0) CHS.cur = CHS.sel; chRender(); return; } chCursor(d[0], d[1]); return; }
  if (k === 'Enter' || k === ' ') { e.preventDefault(); if (!CHS.kb) { CHS.kb = true; chRender(); return; } chClickSq(CHS.cur); }
  else if ((k === 'f' || k === 'F') && !e.repeat) chFlip();
}
addEventListener("keydown", chKeyDown, true);
function chPadPoll() {
  const p = typeof firstPad === 'function' ? firstPad() : null; if (!p) return;
  const now = p.buttons.map(b => b.pressed), prev = CHS.padPrev, down = i => now[i] && !prev[i]; CHS.padPrev = now;
  const ov = !$('chPromo').hidden ? 'chPromo' : !$('chEnd').hidden ? 'chEnd' : !$('chMenu').hidden ? 'chMenu' : null;
  if (ov) {
    if (ov === 'chMenu' && (down(1) || down(9))) { chMenuOpen(false); return; }
    const bs = [...$(ov).querySelectorAll('button:not([hidden])')], i = bs.indexOf(document.activeElement);
    if (down(12) || down(14)) (bs[(i - 1 + bs.length) % bs.length] || bs[0]).focus(); if (down(13) || down(15)) (bs[(i + 1) % bs.length] || bs[0]).focus();
    if (down(0) && document.activeElement && bs.includes(document.activeElement)) document.activeElement.click();
    return;
  }
  CHS.padAx = CHS.padAx || [0, 0];
  const ax = Math.abs(p.axes[0] || 0) > 0.5 ? Math.sign(p.axes[0]) : 0, ay = Math.abs(p.axes[1] || 0) > 0.5 ? -Math.sign(p.axes[1]) : 0;
  const sx = ax !== CHS.padAx[0] ? ax : 0, sy = ay !== CHS.padAx[1] ? ay : 0; CHS.padAx = [ax, ay];
  const df = (down(15) ? 1 : 0) - (down(14) ? 1 : 0) + sx, dr = (down(12) ? 1 : 0) - (down(13) ? 1 : 0) + sy;
  if (df || dr) { if (!CHS.kb) { CHS.kb = true; chRender(); } else chCursor(Math.sign(df), Math.sign(dr)); }
  if (down(0)) { if (!CHS.kb) { CHS.kb = true; chRender(); } else chClickSq(CHS.cur); }
  if (down(1) && CHS.sel >= 0) { CHS.sel = -1; chRender(); }
  if (down(3)) chFlip();
  if (down(9)) chMenuOpen(true);
}

// ---------- sound (Web Audio, src/audio.js) ----------
function chSnd(k) {
  if (typeof AUD === 'undefined' || !AUD.ctx) return;
  try {
    if (k === 'pick') tone(1200, 'sine', 0.001, 0.03, 0.05);
    else if (k === 'move') { noise('bandpass', 1800, 2.5, 0.001, 0.18, 0.06); tone(300, 'triangle', 0.001, 0.08, 0.07); }
    else if (k === 'take') { noise('bandpass', 1100, 1.8, 0.001, 0.3, 0.1); tone(180, 'triangle', 0.001, 0.14, 0.12); }
    else if (k === 'castle') { noise('bandpass', 1800, 2.5, 0.001, 0.16, 0.06); setTimeout(() => { try { noise('bandpass', 1500, 2.5, 0.001, 0.16, 0.06); } catch (e) {} }, 90); }
    else if (k === 'check') { noise('bandpass', 1800, 2.5, 0.001, 0.16, 0.06); tone(660, 'triangle', 0.002, 0.1, 0.3); tone(990, 'sine', 0.002, 0.05, 0.3); }
    else if (k === 'win') { if (typeof sfxChime === 'function') sfxChime(); if (typeof sfxBell === 'function') sfxBell(); }
    else if (k === 'lose') { tone(330, 'triangle', 0.01, 0.1, 0.6, { to: 220 }); }
    else if (k === 'draw') { tone(523, 'sine', 0.01, 0.08, 0.5); tone(392, 'sine', 0.01, 0.06, 0.6); }
  } catch (e) {}
}

// ---------- the game: starting, saving, ending ----------
// o: { v 'std' | 'sk', opp 'easy' | 'fair' | 'hard', me 1 | -1 (or 0 for either), uci (moves to replay, to resume),
//      net { g, names } for a game online (src/chnet.js) }
function chStart(o) {
  o = o || {};
  const v = o.v === 'sk' ? 'sk' : 'std', opp = CH_BOTS[o.opp] ? o.opp : 'fair';
  const me = o.me === 1 || o.me === -1 ? o.me : (Math.random() < 0.5 ? 1 : -1);
  Object.assign(CHS, { on: true, v, opp, me, flip: me < 0, sel: -1, cur: me > 0 ? 12 : 52, kb: false, busy: false, net: o.net || null, endShown: false, netMsg: '' });
  CHS.G = o.uci && o.uci.length ? chReplay(v, o.uci) : chGame(v);
  CHS.names = o.net ? [chMyName(), o.net.opp || 'Your opponent'] : [chMyName(), CH_BOTS[opp].name];
  CHS.set = { v, opp, me: o.me || 0 };
  chEnter();
  chRender();
  if (!o.net) { const st = chStore.get(); st.set = { v, opp, me: o.me || 0 }; chStore.set(st); chSave(); chBotTurn(); }
}
function chMyName() { const n = ($('chNick') && $('chNick').value.trim()) || (typeof NET !== 'undefined' && NET.nick) || ''; return n.slice(0, 16) || 'You'; }
function chSave() {
  if (CHS.net || !CHS.G) return;
  const st = chStore.get();
  st.game = CHS.G.res ? null : { v: CHS.v, opp: CHS.opp, me: CHS.me, uci: CHS.G.uci.slice() };
  chStore.set(st);
}
function chRecord(res) {
  const st = chStore.get(), key = CHS.net ? 'net' : CHS.opp;
  st.rec = st.rec || {}; st.rec[CHS.v] = st.rec[CHS.v] || {};
  const r = st.rec[CHS.v][key] || (st.rec[CHS.v][key] = { w: 0, d: 0, l: 0 });
  if (res.w === 0) r.d++; else if (res.w === CHS.me) r.w++; else r.l++;
  chStore.set(st);
}
function chEnded() {
  const G = CHS.G; if (CHS.endShown || !G.res) return;
  CHS.endShown = true; CHS.busy = false; chRecord(G.res); chSave();
  chSnd(G.res.w === 0 ? 'draw' : G.res.w === CHS.me ? 'win' : 'lose');
  chRender();
  setTimeout(() => {
    if (!CHS.on || CHS.G !== G) return;
    const r = G.res;
    $('chEndHead').textContent = r.w === 0 ? 'A draw' : r.w === CHS.me ? 'You win' : 'You lose';
    $('chEndSub').textContent = chResultText(r);
    $('chEndMoves').textContent = `${Math.ceil(G.san.length / 2)} move${Math.ceil(G.san.length / 2) === 1 ? '' : 's'}.`;
    $('chAgain').textContent = CHS.net ? 'Rematch' : 'Play again';
    $('chEnd').hidden = false; setTimeout(() => $('chAgain').focus({ preventScroll: true }), 30);
  }, r0Delay(G.res));
}
const r0Delay = r => r.why === 'resign' || r.why === 'agreed' || r.why === 'left' ? 200 : 1100;
// someone resigned (side), or a draw was agreed, or the other player left: the game ends by word, not by a move
function chEndBy(res) { if (!CHS.G || CHS.G.res) return; CHS.G.res = res; chEnded(); }
function chResign() {
  if (!CHS.G || CHS.G.res) return;
  chMenuOpen(false);
  if (CHS.net && typeof chnResign === 'function') chnResign();
  chEndBy({ w: -CHS.me, why: 'resign', who: 'You' });
}
function chFlip() { CHS.flip = !CHS.flip; chRender(); }
function chMenuOpen(on) { if (!CHS.on) return; $('chMenu').hidden = !on; $('chMenuResume').hidden = false; $('chMenuResign').hidden = !!(CHS.G && CHS.G.res); $('chMenuLeave').textContent = CHS.net && CHS.G && !CHS.G.res ? 'Resign and leave' : CHS.net ? 'Leave' : 'Leave (the game is kept)'; if (on) setTimeout(() => $('chMenuResume').focus({ preventScroll: true }), 30); }

function chEnter() {
  try { audioInit(); } catch (e) {}
  state = 'chess'; paused = false;
  $('titleCard').hidden = true; $('hud').hidden = true; $('logbox').hidden = true; $('biomeBanner').hidden = true;
  $('chUI').hidden = false; $('chMenu').hidden = true; $('chEnd').hidden = true; $('chPromo').hidden = true;
  document.body.classList.add('chon');
}
function chExit() {
  const wasNet = !!CHS.net;
  if (wasNet && CHS.G && !CHS.G.res && typeof chnResign === 'function') chnResign();
  CHS.on = false; CHS.net = null; CHS.busy = false;
  if (wasNet && typeof chnStop === 'function') chnStop();
  $('chUI').hidden = true; document.body.classList.remove('chon');
  state = 'title'; toTitle();
  setTimeout(() => { const c = $('chTitle'); if (c) c.scrollIntoView({ block: 'start' }); chCardRender(); }, 60);
}
function chFrame() {
  chPadPoll();
  if (CHS.net && typeof chnTick === 'function') chnTick();
}

// ---------- the card on the title screen ----------
function chCardRender() {
  const el = $('chRecord'); if (!el) return;
  const st = chStore.get(), rec = st.rec || {}, out = [];
  for (const v of ['std', 'sk']) {
    const R = rec[v] || {}, parts = [];
    for (const k of ['easy', 'fair', 'hard', 'net']) { const r = R[k]; if (r && r.w + r.d + r.l) parts.push(`${k === 'net' ? 'online' : CH_SKILLN[k]} ${r.w}–${r.d}–${r.l}`); }
    if (parts.length) out.push(`${CH_VARIANTS[v].name}: ${parts.join(', ')}`);
  }
  el.textContent = out.length ? 'Your record (won–drawn–lost) · ' + out.join(' · ') : 'No games played yet.';
  const g = st.game, rb = $('chResume');
  if (rb) { rb.hidden = !(g && Array.isArray(g.uci) && g.uci.length); if (!rb.hidden) rb.textContent = `Resume your game (${CH_VARIANTS[g.v === 'sk' ? 'sk' : 'std'].name}, ${CH_SKILLN[g.opp] || 'Fair'}, move ${Math.floor(g.uci.length / 2) + 1})`; }
}
function chPlayLocal() {
  if (typeof CHN !== 'undefined' && CHN.code && typeof chnLeave === 'function') chnLeave();
  const me = { w: 1, b: -1 }[$('chSide').value] || 0;
  chStart({ v: $('chVar').value, opp: $('chSkill').value, me });
}
function chResume() {
  const g = chStore.get().game; if (!g || !Array.isArray(g.uci)) return;
  chStart({ v: g.v, opp: g.opp, me: g.me === -1 ? -1 : 1, uci: g.uci.filter(u => typeof u === 'string').slice(0, 1200) });
}
function chDebug(o) { chStart(Object.assign({ v: 'std', opp: 'easy', me: 1 }, o || {})); }
function chDebugMoves(list) { for (const u of list) { const m = chFromUci(CHS.G.P, u, CHS.G.legal); if (m) chApply(m); } chRender(); }

(function chInit() {
  if (!$('chTitle')) return;
  const st = chStore.get(), set = st.set || {};
  if (set.v) $('chVar').value = set.v === 'sk' ? 'sk' : 'std';
  if (set.opp && CH_BOTS[set.opp]) $('chSkill').value = set.opp;
  if (set.me) $('chSide').value = set.me > 0 ? 'w' : 'b';
  if (st.nick) $('chNick').value = String(st.nick).slice(0, 16);
  $('chNick').addEventListener('change', () => { const s = chStore.get(); s.nick = $('chNick').value.slice(0, 16); chStore.set(s); });
  $('chPlay').addEventListener('click', chPlayLocal);
  $('chResume').addEventListener('click', chResume);
  $('chSettings').addEventListener('click', () => $('titleSettings').click());
  if ($('chBanner')) $('chBanner').addEventListener('click', () => { $('chTitle').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('chPlay').focus({ preventScroll: true }), 400); });
  $('chUndo').addEventListener('click', chUndo);
  $('chFlip').addEventListener('click', chFlip);
  $('chResign').addEventListener('click', () => { if (CHS.G && !CHS.G.res) { $('chMenu').hidden = false; $('chMenuResign').hidden = false; setTimeout(() => $('chMenuResign').focus({ preventScroll: true }), 30); } });
  $('chDraw').addEventListener('click', () => { if (typeof chnDraw === 'function') chnDraw(); });
  $('chMenuBtn').addEventListener('click', () => chMenuOpen(true));
  $('chMenuResume').addEventListener('click', () => chMenuOpen(false));
  $('chMenuResign').addEventListener('click', chResign);
  $('chMenuLeave').addEventListener('click', chExit);
  $('chPromoCancel').addEventListener('click', () => { $('chPromo').hidden = true; CHS.sel = -1; chRender(); });
  $('chAgain').addEventListener('click', () => { if (CHS.net) { if (typeof chnRematch === 'function') chnRematch(); return; } $('chEnd').hidden = true; chStart(Object.assign({}, CHS.set)); });
  $('chEndMenu').addEventListener('click', chExit);
  $('chEndLook').addEventListener('click', () => { $('chEnd').hidden = true; });
  chCardRender();
})();
