'use strict';
// Skerry Clash: what's over the 3D view (#rlUI in index.html). Along the top, the rival's name and the lights they've
// put out (the crowns), the clock, and yours; over each tower its strength; along the bottom the next card, your hand
// of four (each with its oil cost; a card you can't yet pay for is dimmed, filling as the oil comes), and the oil bar
// in ten segments. Word of the match (double oil, overtime, a light out) comes up in the middle.
// Playing a card: tap or click it, then the arena (the zone you may use shows light, the rest red, and a ghost shows
// the troop or the spell's reach where it would go); or drag it from the hand onto the arena; or keys 1 to 4 and a
// click. Escape (or the menu button) opens the pause card: Resume, Leave. The end card: the result, the lights put
// out, and Again (against the bot) or Back to the menu.
// Card faces come from rlCardArt(id, canvas) (src/rlart.js, Meta's) when it's there; else a plain coloured face.

const RH = { sel: -1, drag: null, hover: null, faces: ['', '', '', '', ''], say: 0, key: '', sayQ: [], seen: 0, cntShown: -1, flashT: 0 };
const RL_TYPECOL = { troop: ['#2d4f6e', '#16283a'], spell: ['#8a5a1e', '#3e2a10'], building: ['#5a554e', '#2a2724'] };

function rlHudReset() {
  RH.sel = -1; RH.drag = null; RH.hover = null; RH.faces = ['', '', '', '', '']; RH.key = ''; RH.sayQ = []; RH.seen = RL.nid - 1; RH.cntShown = -1;
  $('rlName0').textContent = RL.names[1 - RL.me]; $('rlName1').textContent = RL.names[RL.me];
  $('rlToast').classList.remove('on'); $('rlCount').classList.remove('on');
  if (typeof rl3dGhost === 'function') rl3dGhost(null);
  rlHudTowers(true);
}
// a card's face: Meta's art if it's there, else a coloured face with the name
function rlFace(cv, id) {
  const C = RL_CARD[id]; if (!C) return;
  const W = cv.width, H = cv.height, c = cv.getContext('2d');
  if (typeof rlCardArt === 'function') { try { c.clearRect(0, 0, W, H); rlCardArt(id, cv); return; } catch (e) { console.error(e); } }
  const col = RL_TYPECOL[C.type] || RL_TYPECOL.troop, g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // a faint keepers' chart behind, then the picture (the model, rendered once, src/rl3d.js)
  c.strokeStyle = 'rgba(255,240,210,0.06)'; c.lineWidth = 1; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(0, H * i / 6); c.lineTo(W, H * i / 6); c.stroke(); c.beginPath(); c.moveTo(W * i / 6, 0); c.lineTo(W * i / 6, H); c.stroke(); }
  const pic = typeof rl3dPortrait === 'function' ? rl3dPortrait(id) : null;
  if (pic) c.drawImage(pic, 0, 0, W, H);
  else { c.fillStyle = 'rgba(255,240,210,0.85)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${Math.round(W * 0.34)}px "IM Fell English SC", Georgia, serif`; c.fillText(C.n.slice(0, 1), W / 2, H * 0.43); }
  c.strokeStyle = 'rgba(255,230,180,0.35)'; c.lineWidth = Math.max(2, W / 50); c.strokeRect(1, 1, W - 2, H - 2);
}
// the line of word in the middle (warn: a quick red one, for a card that can't go there)
function rlHudSay(text, secs, warn) {
  const el = $('rlToast'); el.textContent = text; el.classList.toggle('warn', !!warn); el.classList.add('on'); RH.say = secs || 2;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}
function rlHudFlash(k) { const el = $('rlFlash'); el.style.transition = 'none'; el.style.opacity = String(Math.min(0.6, k)); void el.offsetWidth; el.style.transition = 'opacity 0.45s'; el.style.opacity = '0'; }
const rlClock = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function rlPips(n, el, mine) { const want = [0, 1, 2].map(i => i < n ? 'on' : '').join(','); if (el.dataset.k === want) return; el.dataset.k = want; el.textContent = ''; for (let i = 0; i < 3; i++) { const p = document.createElement('i'); if (i < n) p.className = 'on'; el.append(p); } el.classList.toggle('me', !!mine); }
// over each tower, its strength (positioned on the screen from the 3D view)
function rlHudTowers(force) {
  const box = $('rlTw'); if (!box) return;
  if (force || box.children.length !== RL.T.length) { box.textContent = ''; for (const t of RL.T) { const d = document.createElement('div'); d.className = 'rl-twl'; d.innerHTML = '<b></b><i><s></s></i>'; box.append(d); } }
  RL.T.forEach((t, i) => {
    const d = box.children[i], p = typeof rl3dProject === 'function' ? rl3dProject(t.x, t.y, RL_G0 + (t.k === 'great' ? 6.4 : 4.7)) : null;
    if (!p || t.hp <= 0 || (t.k === 'great' && !t.awake && t.hp >= t.max && false)) { d.hidden = true; return; }
    d.hidden = false; d.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
    d.className = 'rl-twl ' + (t.side === RL.me ? 'mine' : 'theirs') + (t.k === 'great' ? ' great' : '') + (t.awake ? '' : ' sleep');
    const hp = Math.ceil(t.hp); if (d.dataset.hp !== String(hp)) { d.dataset.hp = String(hp); d.firstChild.textContent = hp; d.lastChild.firstChild.style.width = (t.hp / t.max * 100).toFixed(1) + '%'; }
  });
}
// every frame
function rlHud(dt) {
  if (!RL.on) return;
  const me = RL.me, they = 1 - me, oil = RL.oil[me];
  // the clock and the lights out
  const ck = $('rlClock'), cs = rlClock(RL.ph === 'count' ? RLC.LEN : RL.left);
  if (ck.textContent !== cs) ck.textContent = cs;
  ck.classList.toggle('low', RL.ph === 'play' && RL.left <= 10);
  const sub = RL.ot ? 'Overtime' : RL.dbl ? 'Double oil' : 'Time left'; if ($('rlClockSub').textContent !== sub) $('rlClockSub').textContent = sub;
  $('rlClockBox').classList.toggle('hot', RL.dbl || RL.ot);
  rlPips(RL.crowns[they], $('rlCr0'), false); rlPips(RL.crowns[me], $('rlCr1'), true);
  // the countdown
  if (RL.ph === 'count') { const n = Math.ceil(RL.cnt); if (n !== RH.cntShown) { RH.cntShown = n; const el = $('rlCount'); el.textContent = n > 0 ? String(n) : ''; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); if (n > 0) rlSnd('tick'); } }
  else if (RH.cntShown !== 0 && RL.ph === 'play') { RH.cntShown = 0; const el = $('rlCount'); el.textContent = 'Light the lamps!'; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on', 'go'); setTimeout(() => el.classList.remove('on', 'go'), 1100); }
  // the hand
  for (let i = 0; i < 4; i++) {
    const b = $('rlC' + i), id = RL.hand[me][i], C = RL_CARD[id]; if (!C) continue;
    if (RH.faces[i] !== id) { RH.faces[i] = id; rlFace(b.querySelector('canvas'), id); b.querySelector('.rl-cost').textContent = C.cost; b.querySelector('.rl-nm').textContent = C.n; b.title = `${C.n} (${C.cost}): ${C.d}`; b.classList.remove('deal'); void b.offsetWidth; b.classList.add('deal'); if (RH.sel === i) RH.sel = -1; }
    const short = oil < C.cost - 1e-6, pend = RL.pend && RL.pend.c === id;
    b.classList.toggle('short', short); b.classList.toggle('sel', RH.sel === i); b.classList.toggle('pend', !!pend);
    b.querySelector('.rl-wait').style.height = short ? ((1 - oil / C.cost) * 100).toFixed(1) + '%' : '0%';
  }
  const nx = RL.next[me]; if (RH.faces[4] !== nx && RL_CARD[nx]) { RH.faces[4] = nx; rlFace($('rlNextCv'), nx); $('rlNextCost').textContent = RL_CARD[nx].cost; }
  // the oil
  const ok = Math.floor(oil + 1e-6), segs = $('rlOilBar').children;
  for (let i = 0; i < 10; i++) { const s = segs[i], f = Math.max(0, Math.min(1, oil - i)); s.firstChild.style.width = (f * 100).toFixed(1) + '%'; s.classList.toggle('full', f >= 1); }
  $('rlOilN').textContent = ok; $('rlOil').classList.toggle('dbl', RL.dbl);
  // the zone and the ghost
  const selId = RH.drag && RH.drag.on ? RL.hand[me][RH.drag.i] : RH.sel >= 0 ? RL.hand[me][RH.sel] : null, selC = RL_CARD[selId];
  if (typeof rl3dZone === 'function') rl3dZone(!!selC && selC.type !== 'spell' && RL.ph !== 'over');
  if (typeof rl3dGhost === 'function') {
    if (selC && RH.hover) rl3dGhost({ c: selId, x: RH.hover.x, y: RH.hover.y, ok: !rlWhyNot(me, selId, RH.hover.x, RH.hover.y) });
    else if (RL.pend) rl3dGhost({ c: RL.pend.c, x: RL.pend.x, y: RL.pend.y, ok: true });
    else rl3dGhost(null);
  }
  $('rlUI').classList.toggle('picking', !!selC);
  // the word of the match, from its events
  let hi = RH.seen;
  for (const f of RL.FX) {
    if (f.id <= RH.seen) continue; hi = Math.max(hi, f.id);
    if (f.k === 'dbl') rlHudSay('Double oil!', 2.4);
    else if (f.k === 'ot') rlHudSay('Overtime: the next light out wins', 3);
    else if (f.k === 'crown') rlHudSay(f.side === me ? 'You put out a light!' : `${RL.names[they]} puts out a light`, 2.4);
  }
  RH.seen = hi;
  if (RH.say > 0) { RH.say -= dt; if (RH.say <= 0) $('rlToast').classList.remove('on'); }
  rlHudTowers(false);
}
// the end card
function rlHudEnd() {
  const me = RL.me, w = RL.win, el = $('rlEnd');
  $('rlEndHead').textContent = w === 2 ? 'A draw' : w === me ? 'Victory' : 'Defeat';
  el.classList.toggle('won', w === me); el.classList.toggle('lost', w !== me && w !== 2);
  $('rlEndSub').textContent = w === 2 ? 'Neither light gave way.' : w === me ? (RL.crowns[me] >= 3 ? `${RL.names[1 - me]}'s Great Light is out.` : 'Your lights burn on.') : (RL.crowns[1 - me] >= 3 ? 'Your Great Light is out.' : `${RL.names[1 - me]} held the water.`);
  rlPips(RL.crowns[me], $('rlEndMe'), true); rlPips(RL.crowns[1 - me], $('rlEndThem'), false);
  $('rlEndMeN').textContent = RL.names[me]; $('rlEndThemN').textContent = RL.names[1 - me];
  $('rlAgain').hidden = RL.mode !== 'bot';
  el.hidden = false; setTimeout(() => ($('rlAgain').hidden ? $('rlMenu') : $('rlAgain')).focus({ preventScroll: true }), 40);
}

// ---------- the controls ----------
function rlSel(i) {
  if (!RL.on || RL.ph === 'over') return;
  RH.sel = RH.sel === i ? -1 : i;
  if (RH.sel >= 0) { const C = RL_CARD[RL.hand[RL.me][i]]; if (C && RL.oil[RL.me] < C.cost - 1e-6) rlHudSay(`${C.n} needs ${C.cost} oil`, 1, true); }
}
function rlOverArena(cx, cy) { const b = $('rlBottom').getBoundingClientRect(); if (cy >= b.top - 4 && cx >= b.left && cx <= b.right) return null; return rl3dPick(cx, cy); }
function rlPlace(i, p) {
  const id = RL.hand[RL.me][i]; if (!id || !p) return false;
  const ok = rlTry(id, p.x, p.y); if (ok) { RH.sel = -1; RH.hover = null; }
  return ok;
}
(function rlHudInit() {
  if (!$('rlUI')) return;
  const ui = $('rlUI');
  for (let i = 0; i < 4; i++) {
    const b = $('rlC' + i);
    b.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault(); RH.drag = { i, x0: e.clientX, y0: e.clientY, on: false, id: e.pointerId };
      try { b.setPointerCapture(e.pointerId); } catch (er) {}
    });
    b.addEventListener('pointermove', e => {
      const D = RH.drag; if (!D || D.i !== i) return;
      if (!D.on && Math.hypot(e.clientX - D.x0, e.clientY - D.y0) > 12) { D.on = true; RH.sel = i; const dc = $('rlDrag'); dc.hidden = false; rlFace(dc.querySelector('canvas'), RL.hand[RL.me][i]); }
      if (D.on) { const dc = $('rlDrag'); dc.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -110%)`; RH.hover = rlOverArena(e.clientX, e.clientY); dc.classList.toggle('over', !!RH.hover); }
    });
    const up = e => {
      const D = RH.drag; if (!D || D.i !== i) return; RH.drag = null; $('rlDrag').hidden = true;
      if (D.on) { const p = rlOverArena(e.clientX, e.clientY); if (p) { if (!rlPlace(i, p)) RH.sel = i; } else RH.sel = i; }
      else rlSel(i);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', () => { RH.drag = null; $('rlDrag').hidden = true; });
  }
  const cv = $('rlCv');
  cv.addEventListener('pointermove', e => { if (RH.sel >= 0 && !RH.drag) RH.hover = rl3dPick(e.clientX, e.clientY); });
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !RH.drag) RH.hover = null; });
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (RH.sel < 0) return;
    const p = rl3dPick(e.clientX, e.clientY); RH.hover = p;
    if (p) rlPlace(RH.sel, p);
  });
  $('rlMenuBtn').addEventListener('click', () => rlPauseOpen(true));
  $('rlResume').addEventListener('click', () => rlPauseOpen(false));
  $('rlLeave').addEventListener('click', rlQuit);
  $('rlMenu').addEventListener('click', rlQuit);
  $('rlAgain').addEventListener('click', () => { if (RL.mode !== 'bot') return; const lvl = RL.bot.lvl; $('rlEnd').hidden = true; RL.on = false; rlPlayBot(lvl); });
  addEventListener('keydown', e => {
    if (state !== 'rival') return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.key !== 'Escape') return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); if (!$('rlEnd').hidden) return; if (RH.sel >= 0) { RH.sel = -1; return; } rlPauseOpen($('rlPause').hidden); return; }
    if (!$('rlPause').hidden || e.repeat) return;
    const n = '1234'.indexOf(e.key); if (n >= 0) { e.preventDefault(); rlSel(n); }
  }, true);
  addEventListener('keyup', e => { if (state === 'rival') e.stopImmediatePropagation(); }, true);
  addEventListener('resize', () => { if (RL.on && typeof rl3dResize === 'function') rl3dResize(); });
  ui.addEventListener('contextmenu', e => e.preventDefault());
})();
