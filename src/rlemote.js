'use strict';
// Skerry Clash: the emotes. Ten little pictures of the coast's own folk (the keeper, a shore crab, a herring gull, a
// puffin, a drowned sailor, a grey seal), each with a word and its own few notes, that a keeper may send in the middle
// of a duel. The button at the bottom left (or E) opens the picker; the one chosen pops up as a bubble over the
// sender's Great Light for a couple of seconds, moving (the keeper waves, the crab laughs till it shakes, the gull's
// fish falls), and both keepers and everyone watching see and hear it. Mute in the picker hides the rival's.
//
// How it travels: an emote is an event like any other (rlFx('emote', { c: its id, side })), so it rides in the host's
// snapshot (src/rl.js, rlSnap) to the guest and the watchers; the guest's goes to the host in its list of taps as the
// card 'e:<id>' (rlnRequest, src/rlnet.js), and the host's rlnRead hands it to rlEmote. The guest shows its own at
// once rather than waiting for it to come back. Spam: a keeper may send one every 1.2 s and four in any ten seconds
// (the host allows a little more, so a guest's sends bunched up by the network still go through).
// The bot (against the computer) now and then has its say too: a greeting at the start, a laugh when it puts out a
// light, a grumble when it loses one, and sometimes an answer to yours; never more than seven in a match.
// Drawn here on small canvases each frame (rlEmoDraw); the sound is synth (tone and noise, src/audio.js).

const RL_EMO = [
  { id: 'em_ahoy', w: 'Ahoy!', who: 'keeper' }, { id: 'em_gg', w: 'Well played', who: 'keeper' },
  { id: 'em_laugh', w: 'Ha ha ha!', who: 'crab' }, { id: 'em_cry', w: 'Nooo…', who: 'keeper' },
  { id: 'em_angry', w: 'Grrr!', who: 'crab' }, { id: 'em_wow', w: 'Wow!', who: 'puffin' },
  { id: 'em_think', w: 'Hmm…', who: 'drowned' }, { id: 'em_oops', w: 'Oops!', who: 'gull' },
  { id: 'em_luck', w: 'Good luck!', who: 'seal' }, { id: 'em_thanks', w: 'Thanks!', who: 'gull' },
];
const RL_EMI = {}; RL_EMO.forEach(e => { RL_EMI[e.id] = e; });
const RLE = { GAP: 1.2, N: 4, WIN: 10, LIFE: 2.6, BOTMAX: 7 };
const EM = { open: false, mute: false, seen: 0, bub: [null, null], sent: [], host: [[], []], bot: { n: 0, at: 0, q: [], seen: 0 }, cv: [] };

// ---------- the rules (on the host) ----------
// may this side send now? t is the clock of whoever's counting; gap and n the limits
function rlEmoOk(list, t, gap, n) { while (list.length && t - list[0] > RLE.WIN) list.shift(); return !(list.length && t - list[list.length - 1] < gap) && list.length < n; }
// the host (or the screen against the bot) puts an emote out for side
function rlEmote(side, id) {
  if (!RL.on || !RL_EMI[id] || (side !== 0 && side !== 1) || (RL.ph !== 'play' && RL.ph !== 'count')) return false;
  const t = performance.now() / 1000; if (!rlEmoOk(EM.host[side], t, RLE.GAP * 0.6, RLE.N + 1)) return false;
  EM.host[side].push(t); rlFx('emote', { c: id, x: 9, y: side ? 29 : 3, side }); return true;
}

// ---------- this screen's keeper ----------
function rlEmoCan() { return RL.on && !rlIsSpec() && (RL.ph === 'play' || RL.ph === 'count'); }
function rlEmoWait() { const t = performance.now() / 1000; return rlEmoOk(EM.sent, t, RLE.GAP, RLE.N) ? 0 : 1; }
function rlEmoSend(id) {
  if (!rlEmoCan() || !RL_EMI[id]) return false;
  const t = performance.now() / 1000; if (!rlEmoOk(EM.sent, t, RLE.GAP, RLE.N)) { if (typeof rlHudSay === 'function') rlHudSay('Wait a moment before the next one', 1, true); return false; }
  EM.sent.push(t); rlEmoOpen(false);
  if (rlIsGuest()) { if (typeof rlnRequest === 'function') rlnRequest({ c: 'e:' + id, x: 0, y: 0 }); rlEmoShow(RL.me, id); }
  else rlEmote(RL.me, id);
  if (RL.mode === 'bot') rlEmoBotHear(id);
  return true;
}
function rlEmoOpen(on) {
  EM.open = on == null ? !EM.open : !!on; if (!rlEmoCan()) EM.open = false;
  const p = $('rlEmoPick'); if (!p) return; p.hidden = !EM.open; $('rlEmoBtn').classList.toggle('on', EM.open);
  if (EM.open) EM.cv.forEach((cv, i) => rlEmoDraw(cv, RL_EMO[i].id, 0.7, true));
}
function rlEmoMute(on) {
  EM.mute = on == null ? !EM.mute : !!on;
  const b = $('rlEmoMute'); if (b) { b.textContent = EM.mute ? 'Unmute rival' : 'Mute rival'; b.classList.toggle('on', EM.mute); }
  if ($('rlName0')) $('rlName0').classList.toggle('muted', EM.mute);
  if (EM.mute) EM.bub[1 - RL.me] = null;
}

// ---------- the bubbles ----------
function rlEmoShow(side, id) {
  if (EM.mute && side !== RL.me && !rlIsSpec()) return;
  EM.bub[side] = { id, t0: performance.now() / 1000 };
  rlEmoSnd(id, side === RL.me || rlIsSpec() ? 1 : 0.8);
}
function rlEmoReset() {
  EM.open = false; EM.seen = RL.nid - 1; EM.bub = [null, null]; EM.sent = []; EM.host = [[], []]; EM.bot = { n: 0, at: 0, q: [], seen: RL.nid - 1 };
  rlEmoMute(false); rlEmoOpen(false);
  const b = $('rlEmoBtn'); if (b) b.hidden = rlIsSpec();
  for (const i of [0, 1]) { const d = $('rlEmoB' + i); if (d) d.hidden = true; }
}
// every frame, from rlHud: new emotes in the events, the bot's, and the bubbles where the Great Lights are
function rlEmoHud(dt) {
  if (!RL.on) return;
  let hi = EM.seen;
  for (const f of RL.FX) {
    if (f.k !== 'emote' || f.id <= EM.seen) continue; hi = Math.max(hi, f.id);
    if (rlIsGuest() && !rlIsSpec() && f.side === RL.me) continue;   // (the guest showed its own already)
    rlEmoShow(f.side, f.c);
  }
  EM.seen = hi;
  if (RL.mode === 'bot') rlEmoBot();
  if (EM.open && !rlEmoCan()) rlEmoOpen(false);
  const btn = $('rlEmoBtn'); if (btn) btn.classList.toggle('wait', !!rlEmoWait());
  const now = performance.now() / 1000;
  for (const side of [0, 1]) {
    const d = $('rlEmoB' + side), b = EM.bub[side]; if (!d) continue;
    if (!b || now - b.t0 > RLE.LIFE || RL.ph === 'over') { EM.bub[side] = null; if (!d.hidden) d.hidden = true; continue; }
    const T = RL.T[side * 3], p = T && typeof rl3dProject === 'function' ? rl3dProject(T.x, T.y, (typeof RL_G0 !== 'undefined' ? RL_G0 : 0.6) + 7.4) : null;
    const mine = side === RL.me, top = !mine;   // (a watcher's RL.me is the end it watches from)
    let x = p ? p.x : innerWidth / 2, y = p ? p.y : (top ? 120 : innerHeight - 220);
    // (keep it on the screen and clear of the bars at the top and the hand at the bottom)
    const bot = $('rlBottom') && !$('rlBottom').hidden && !rlIsSpec() ? $('rlBottom').getBoundingClientRect().top : innerHeight;
    x = Math.max(80, Math.min(innerWidth - 80, x)); y = top ? Math.max(66, y + 10) : Math.min(bot - 8, y);
    if (d.hidden || d.dataset.t !== String(b.t0)) { d.dataset.t = String(b.t0); d.hidden = false; d.className = 'rl-emob ' + (mine ? 'mine' : 'theirs') + (top ? ' top' : ''); d.lastChild.textContent = RL_EMI[b.id].w; d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); }
    d.classList.toggle('out', now - b.t0 > RLE.LIFE - 0.3);
    d.style.left = Math.round(x) + 'px'; d.style.top = Math.round(y) + 'px';
    rlEmoDraw(d.firstChild, b.id, now - b.t0);
  }
}

// ---------- the bot's say ----------
function rlEmoBotQ(id, delay, p) { if (EM.bot.n + EM.bot.q.length >= RLE.BOTMAX || Math.random() > p) return; EM.bot.q.push({ id, at: performance.now() / 1000 + delay }); }
const rlEmoPickOf = a => a[Math.floor(Math.random() * a.length)];
function rlEmoBotHear(id) {
  const ans = { em_ahoy: ['em_ahoy', 'em_luck'], em_luck: ['em_thanks', 'em_luck'], em_gg: ['em_thanks', 'em_gg'], em_laugh: ['em_angry', 'em_think'], em_angry: ['em_laugh', 'em_oops'], em_cry: ['em_laugh', 'em_think'], em_wow: ['em_thanks'], em_thanks: ['em_gg'] }[id] || ['em_think', 'em_wow'];
  rlEmoBotQ(rlEmoPickOf(ans), 1 + Math.random() * 1.4, 0.4);
}
function rlEmoBot() {
  const B = EM.bot, bot = 1 - RL.me, now = performance.now() / 1000;
  if (!B.started && RL.ph === 'count') { B.started = true; rlEmoBotQ(rlEmoPickOf(['em_ahoy', 'em_luck']), 0.6 + Math.random(), 0.35); }
  let hi = B.seen;
  for (const f of RL.FX) {
    if (f.id <= B.seen) continue; hi = Math.max(hi, f.id);
    if (f.k === 'crown') { if (f.side === bot) rlEmoBotQ(rlEmoPickOf(['em_laugh', 'em_wow', 'em_laugh']), 0.8 + Math.random(), 0.6); else rlEmoBotQ(rlEmoPickOf(['em_cry', 'em_angry', 'em_oops']), 0.8 + Math.random(), 0.5); }
  }
  B.seen = hi;
  if (RL.ph === 'play' && RL.left < 20 && !B.late && RL.crowns[bot] > RL.crowns[RL.me]) { B.late = true; rlEmoBotQ('em_gg', 0.5, 0.3); }
  if (B.q.length && B.q[0].at <= now) { const e = B.q.shift(); if ($('rlPause').hidden && rlEmote(bot, e.id)) { B.n++; } }
}

// ---------- the sounds ----------
function rlEmoSnd(id, v) {
  if (typeof AUD === 'undefined' || !AUD.ctx || typeof tone !== 'function') return;
  v = (v == null ? 1 : v) * 0.8;
  const T = (f, ty, a, p, d, o) => tone(f, ty, a, p * v, d, o);
  try {
    if (id === 'em_ahoy') { T(700, 'sine', 0.02, 0.14, 0.22, { to: 1250 }); T(1250, 'sine', 0.01, 0.12, 0.35, { delay: 0.22, to: 1050 }); }
    else if (id === 'em_gg') { [523, 659, 784].forEach((f, i) => T(f, 'triangle', 0.01, 0.12, 0.5, { delay: i * 0.09 })); }
    else if (id === 'em_laugh') { for (let i = 0; i < 5; i++) { T(520 - i * 30, 'square', 0.005, 0.05, 0.08, { delay: i * 0.11, to: 420 - i * 30 }); } }
    else if (id === 'em_cry') { T(620, 'sine', 0.05, 0.14, 0.5, { to: 380 }); T(560, 'sine', 0.05, 0.12, 0.6, { delay: 0.45, to: 300 }); }
    else if (id === 'em_angry') { T(110, 'sawtooth', 0.02, 0.1, 0.45, { to: 85 }); T(140, 'sawtooth', 0.02, 0.06, 0.4, { delay: 0.05, to: 100 }); if (typeof noise === 'function') noise('lowpass', 500, 1, 0.01, 0.06 * v, 0.35); }
    else if (id === 'em_wow') { T(320, 'triangle', 0.02, 0.14, 0.45, { to: 960 }); T(960, 'sine', 0.01, 0.08, 0.4, { delay: 0.35 }); }
    else if (id === 'em_think') { T(196, 'sine', 0.05, 0.12, 0.6); T(247, 'sine', 0.05, 0.1, 0.6, { delay: 0.3 }); }
    else if (id === 'em_oops') { T(880, 'triangle', 0.01, 0.12, 0.35, { to: 260 }); if (typeof noise === 'function') noise('bandpass', 1400, 1.5, 0.01, 0.07 * v, 0.25, { delay: 0.32 }); }
    else if (id === 'em_luck') { [392, 494, 587, 784].forEach((f, i) => T(f, 'sine', 0.01, 0.11, 0.35, { delay: i * 0.08 })); }
    else if (id === 'em_thanks') { T(784, 'sine', 0.01, 0.13, 0.3); T(1047, 'sine', 0.01, 0.13, 0.45, { delay: 0.14 }); }
  } catch (e) {}
}

// ---------- the pictures ----------
// each drawn on a square canvas, s its size; t seconds since it popped (fixed for the picker's still faces)
function rlEmoDraw(cv, id, t, still) {
  const E = RL_EMI[id]; if (!cv || !E) return;
  const c = cv.getContext('2d'), s = cv.width, k = s / 100, P = Math.PI;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, s, s); c.setTransform(k, 0, 0, k, 0, 0);
  c.lineJoin = c.lineCap = 'round';
  const W = Math.sin(t * 9), bob = still ? 0 : Math.sin(t * 5) * 1.6;
  const circ = (x, y, r, f, st, lw) => { c.beginPath(); c.arc(x, y, r, 0, P * 2); if (f) { c.fillStyle = f; c.fill(); } if (st) { c.strokeStyle = st; c.lineWidth = lw || 2.5; c.stroke(); } };
  const ell = (x, y, rx, ry, rot, f, st, lw) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, P * 2); if (f) { c.fillStyle = f; c.fill(); } if (st) { c.strokeStyle = st; c.lineWidth = lw || 2.5; c.stroke(); } };
  const line = (pts, st, lw) => { c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.strokeStyle = st; c.lineWidth = lw || 2.5; c.stroke(); };
  const INK = '#1b1e2a';
  // the eyes and mouths every face shares
  const eyes = (x, y, gap, kind, r) => {
    r = r || 4;
    for (const sx of [-1, 1]) {
      const ex = x + sx * gap;
      if (kind === 'shut') line([[ex - r, y], [ex, y + r * 0.7], [ex + r, y]], INK, 2.4);
      else if (kind === 'happy') line([[ex - r, y + 1], [ex, y - r * 0.8], [ex + r, y + 1]], INK, 2.4);
      else if (kind === 'cross') { line([[ex - r, y - r * 0.4 - sx * 2], [ex + r, y + r * 0.4 - sx * 2]], INK, 2.6); circ(ex, y + 2, r * 0.6, INK); }
      else if (kind === 'big') { circ(ex, y, r * 1.6, '#fff', INK, 2); circ(ex, y + 0.5, r * 0.8, INK); circ(ex + 1, y - 1, r * 0.3, '#fff'); }
      else if (kind === 'up') { circ(ex, y, r * 1.1, '#fff', INK, 1.8); circ(ex + 1.5, y - 1.8, r * 0.55, INK); }
      else if (kind === 'wink' && sx > 0) line([[ex - r, y], [ex, y - r * 0.6], [ex + r, y]], INK, 2.4);
      else { circ(ex, y, r * 0.75, INK); circ(ex + 1, y - 1, r * 0.25, '#fff'); }
    }
  };
  // characters, centred about (50, 52)
  const keeper = (face, mouth, opt) => {
    opt = opt || {}; const y = 52 + bob;
    ell(50, y + 6, 26, 24, 0, '#f1c9a0', INK, 2.5);                                  // the face
    c.beginPath(); c.moveTo(26, y + 6); c.quadraticCurveTo(28, y + 40, 50, y + 42); c.quadraticCurveTo(72, y + 40, 74, y + 6); c.quadraticCurveTo(62, y + 22, 50, y + 20); c.quadraticCurveTo(38, y + 22, 26, y + 6); c.fillStyle = '#eef0f2'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2.2; c.stroke();   // the beard
    ell(39, y + 13, 5, 3, 0, 'rgba(230,110,100,0.45)'); ell(61, y + 13, 5, 3, 0, 'rgba(230,110,100,0.45)');
    eyes(50, y + 4, 10, face);
    if (mouth === 'smile') { c.beginPath(); c.arc(50, y + 17, 7, 0.15 * P, 0.85 * P); c.strokeStyle = INK; c.lineWidth = 2.4; c.stroke(); }
    else if (mouth === 'open') ell(50, y + 21, 6, 5 + (still ? 0 : Math.abs(W)), 0, '#7a2a2a', INK, 2);
    else if (mouth === 'sad') { c.beginPath(); c.arc(50, y + 26, 7, 1.15 * P, 1.85 * P); c.strokeStyle = INK; c.lineWidth = 2.4; c.stroke(); }
    const tip = opt.tip || 0;                                                          // the cap (tipped by tip)
    c.save(); c.translate(50, y - 14 - tip * 6); c.rotate(-tip * 0.35);
    c.beginPath(); c.moveTo(-27, 2); c.lineTo(27, 2); c.lineTo(22, -14); c.quadraticCurveTo(0, -22, -22, -14); c.closePath(); c.fillStyle = '#1f3a66'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2.4; c.stroke();
    c.fillStyle = '#16233d'; c.fillRect(-28, 0, 56, 6); c.strokeRect(-28, 0, 56, 6);
    circ(0, -8, 4, '#ffcf5a', INK, 1.5);                                               // the lamp badge
    c.restore();
  };
  const crab = (face, mouth, shake, col) => {
    const jx = shake ? Math.sin(t * 38) * 2 : 0, y = 58 + bob; col = col || '#e0502e';
    c.save(); c.translate(jx, 0);
    for (const sx of [-1, 1]) {
      line([[50 + sx * 22, y + 8], [50 + sx * 34, y + 22], [50 + sx * 30, y + 30]], INK, 3);
      line([[50 + sx * 18, y + 12], [50 + sx * 26, y + 28]], INK, 3);
      const cl = shake ? Math.abs(Math.sin(t * 14)) * 0.5 : 0.25;                       // the claws, snapping
      c.save(); c.translate(50 + sx * 34, y - 14); c.rotate(sx * -0.4);
      ell(0, 0, 11, 9, 0, col, INK, 2.4); c.beginPath(); c.moveTo(0, 0); c.lineTo(sx * -4, -10); c.lineTo(sx * 10, -6 + cl * 12); c.closePath(); c.fillStyle = '#fff6e6'; c.fill();
      c.restore();
      line([[50 + sx * 22, y - 4], [50 + sx * 30, y - 8]], INK, 3);
      line([[50 + sx * 8, y - 14], [50 + sx * 10, y - 24]], INK, 2.4);                      // the eyestalks
    }
    ell(50, y, 26, 18, 0, col, INK, 2.6);
    eyes(50, y - 26, 10, face, 4.2);
    if (mouth === 'laugh') { c.beginPath(); c.arc(50, y + 2, 9, 0, P); c.closePath(); c.fillStyle = '#6a1c1c'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); }
    else if (mouth === 'grit') { c.fillStyle = '#fff'; c.fillRect(40, y + 2, 20, 7); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(40, y + 2, 20, 7); line([[45, y + 2], [45, y + 9]], INK, 1.5); line([[50, y + 2], [50, y + 9]], INK, 1.5); line([[55, y + 2], [55, y + 9]], INK, 1.5); }
    c.restore();
  };
  const gull = (face, mouth, opt) => {
    opt = opt || {}; const y = 54 + bob;
    ell(50, y + 26, 30, 16, 0, '#d8dde3', INK, 2.4);                                    // the body
    ell(50, y, 22, 21, 0, '#fbfcfd', INK, 2.5);                                         // the head
    eyes(50, y - 4, 9, face, 3.6);
    c.beginPath(); c.moveTo(42, y + 6); c.lineTo(72, y + 9); c.lineTo(42, y + 14); c.closePath(); c.fillStyle = '#f5c631'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();   // the beak
    circ(64, y + 11, 2, '#d9402a');
    if (mouth === 'open') { c.beginPath(); c.moveTo(42, y + 12); c.lineTo(66, y + 16); c.lineTo(42, y + 18); c.closePath(); c.fillStyle = '#f5c631'; c.fill(); c.stroke(); }
  };
  const puffin = (face) => {
    const hop = still ? 0 : -Math.abs(Math.sin(t * 7)) * 5, y = 54 + hop;
    ell(50, y + 26, 26, 17, 0, '#22252e', INK, 2.4); ell(50, y + 30, 16, 12, 0, '#f4f2ee');
    circ(50, y, 23, '#22252e', INK, 2.5); ell(50, y + 3, 17, 15, 0, '#f2f0ea');
    eyes(50, y - 2, 8, face, 3.4);
    c.beginPath(); c.moveTo(43, y + 7); c.quadraticCurveTo(50, y + 2, 57, y + 7); c.lineTo(50, y + 26); c.closePath(); c.fillStyle = '#ee7a2a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    line([[45, y + 12], [55, y + 12]], '#f6c742', 2);
    ell(50, y + 19, 4, 3, 0, '#7a2a2a');                                                // a gasp
  };
  const drowned = (face) => {
    const y = 52 + bob;
    ell(50, y + 4, 24, 26, 0, '#8fb8a8', INK, 2.5);
    for (let i = 0; i < 6; i++) { const x = 30 + i * 8, sw = still ? 0 : Math.sin(t * 3 + i) * 2.5; line([[x, y - 18], [x - 2 + sw, y - 6], [x + sw, y + 8]], '#2f6a3a', 3.2); }   // the weed hair
    eyes(50, y + 2, 9, face, 3.8);
    line([[44, y + 17], [52, y + 15], [57, y + 17]], INK, 2.4);
    c.save(); c.translate(64, y + 22); c.rotate(-0.4); ell(0, 0, 7, 9, 0, '#8fb8a8', INK, 2.2); c.restore();   // a hand at the chin
    const q = still ? 1 : Math.min(1, t * 2);                                           // the question mark, rising
    c.globalAlpha = q; c.font = 'bold 26px Georgia, serif'; c.fillStyle = '#ffd88a'; c.strokeStyle = INK; c.lineWidth = 3; c.strokeText('?', 76, y - 14 - (still ? 0 : (t % 1.2) * 6)); c.fillText('?', 76, y - 14 - (still ? 0 : (t % 1.2) * 6)); c.globalAlpha = 1;
  };
  const seal = (face) => {
    const y = 56 + bob, fl = still ? 0.3 : Math.sin(t * 10) * 0.5;
    ell(50, y + 20, 30, 20, 0, '#8d96a3', INK, 2.4);
    circ(50, y, 22, '#9aa3b0', INK, 2.5);
    for (const sx of [-1, 1]) { c.save(); c.translate(50 + sx * 26, y + 18); c.rotate(sx * (0.9 + fl)); ell(0, -8, 6, 12, 0, '#7f8896', INK, 2.2); c.restore(); }
    eyes(50, y - 4, 9, face, 4.6);
    ell(50, y + 6, 8, 5, 0, '#b9c0ca'); circ(50, y + 3, 3, INK);
    c.beginPath(); c.arc(50, y + 8, 5, 0.1 * P, 0.9 * P); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    for (const sx of [-1, 1]) for (let i = -1; i <= 1; i++) line([[50 + sx * 9, y + 6 + i * 2], [50 + sx * 20, y + 4 + i * 4]], INK, 1);
  };
  // the extras: tears, steam, a heart, a fish, a waving hand, sparkles
  const tears = () => { for (const sx of [-1, 1]) { const d = still ? 0.5 : (t * 1.4 + (sx > 0 ? 0.5 : 0)) % 1; c.globalAlpha = 1 - d * 0.6; ell(50 + sx * 12, 60 + d * 26 + bob, 3, 4.5, 0, '#6ac0ff', INK, 1.2); c.globalAlpha = 1; } };
  const steam = () => { for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { const d = still ? 0.4 : (t * 1.6 + i * 0.5) % 1; c.globalAlpha = 1 - d; circ(50 + sx * (20 + d * 10), 22 - d * 18, 4 + d * 5, '#e8e8f0', INK, 1.2); c.globalAlpha = 1; } };
  const heart = (x, y, r) => { c.beginPath(); c.moveTo(x, y + r * 0.9); c.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4); c.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); c.fillStyle = '#ff5a7a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); };
  const sparks = n => { for (let i = 0; i < n; i++) { const a = i / n * P * 2 + t, r = 40 + (still ? 0 : Math.sin(t * 6 + i) * 3), x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r * 0.8; line([[x - 3, y], [x + 3, y]], '#ffd84a', 2); line([[x, y - 3], [x, y + 3]], '#ffd84a', 2); } };
  if (id === 'em_ahoy') {
    keeper('happy', 'open');
    const a = still ? 0.3 : Math.sin(t * 10) * 0.45; c.save(); c.translate(84, 64 + bob); c.rotate(a);   // the hand, waving
    line([[0, 18], [0, 0]], '#1f3a66', 7); circ(0, -6, 8, '#f1c9a0', INK, 2.2); for (let i = -1; i <= 1; i++) line([[i * 4, -12], [i * 5, -19]], INK, 2); c.restore();
  } else if (id === 'em_gg') {
    keeper('shut', 'smile', { tip: still ? 0.6 : Math.max(0, Math.sin(Math.min(t, 1.6) * P / 1.6 * 2)) }); sparks(still ? 0 : 5);
  } else if (id === 'em_laugh') { crab('shut', 'laugh', true); if (!still) { c.font = 'bold 13px Georgia, serif'; c.fillStyle = '#ffe6a0'; c.strokeStyle = INK; c.lineWidth = 3; const o = (t * 2) % 1; c.globalAlpha = 1 - o; c.strokeText('HA', 70, 20 - o * 10); c.fillText('HA', 70, 20 - o * 10); c.strokeText('HA', 8, 30 - o * 10); c.fillText('HA', 8, 30 - o * 10); c.globalAlpha = 1; } }
  else if (id === 'em_cry') { keeper('shut', 'sad'); tears(); }
  else if (id === 'em_angry') { const pu = still ? 0 : (Math.sin(t * 12) + 1) / 2; crab('cross', 'grit', !still && t < 0.8, `rgb(${210 + pu * 40},${60 - pu * 30},${30})`); steam(); }
  else if (id === 'em_wow') { puffin('big'); sparks(still ? 4 : 6); }
  else if (id === 'em_think') drowned('up');
  else if (id === 'em_oops') {
    gull('big', 'open');
    const d = still ? 0.4 : Math.min(1, t * 0.9);                                       // the herring, falling
    c.save(); c.translate(58 + d * 12, 72 + d * d * 16); c.rotate(0.6 + d * 2.5); ell(0, 0, 12, 4.5, 0, '#b8c8d8', INK, 1.8); c.beginPath(); c.moveTo(11, 0); c.lineTo(17, -5); c.lineTo(17, 5); c.closePath(); c.fillStyle = '#b8c8d8'; c.fill(); c.stroke(); c.restore();
  } else if (id === 'em_luck') { seal('happy'); const s = still ? 1 : 0.85 + Math.sin(t * 6) * 0.15; c.save(); c.translate(82, 22); c.scale(s, s); c.font = 'bold 22px Georgia, serif'; c.fillStyle = '#ffd84a'; c.strokeStyle = INK; c.lineWidth = 3; c.strokeText('★', -9, 8); c.fillText('★', -9, 8); c.restore(); }
  else if (id === 'em_thanks') { gull('happy'); const hy = still ? 0 : -((t * 0.9) % 1) * 16, s = still ? 1 : 1 + Math.sin(t * 8) * 0.12; c.globalAlpha = still ? 1 : 1 - Math.max(0, (t * 0.9) % 1 - 0.6) * 2; heart(80, 26 + hy, 9 * s); heart(18, 36 + hy * 0.7, 6 * s); c.globalAlpha = 1; }
}

// ---------- the controls ----------
(function rlEmoInit() {
  const ui = $('rlUI'); if (!ui) return;
  const btn = document.createElement('button'); btn.id = 'rlEmoBtn'; btn.className = 'rl-emobtn'; btn.type = 'button'; btn.title = 'Emotes (E)'; btn.setAttribute('aria-label', 'Emotes');
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor"/><circle cx="8.5" cy="10" r="1.3" fill="#141a2c"/><circle cx="15.5" cy="10" r="1.3" fill="#141a2c"/><path d="M8.5 13q3.5 2.6 7 0" stroke="#141a2c" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
  const pick = document.createElement('div'); pick.id = 'rlEmoPick'; pick.className = 'rl-emopick'; pick.hidden = true; pick.setAttribute('role', 'menu');
  const grid = document.createElement('div'); grid.className = 'rl-emogrid';
  RL_EMO.forEach((e, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rl-emoi'; b.title = e.w; b.setAttribute('role', 'menuitem');
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; EM.cv[i] = cv;
    const s = document.createElement('span'); s.textContent = e.w; b.append(cv, s);
    b.addEventListener('click', ev => { ev.stopPropagation(); rlEmoSend(e.id); });
    grid.append(b);
  });
  const mute = document.createElement('button'); mute.type = 'button'; mute.id = 'rlEmoMute'; mute.className = 'tool rl-emomute'; mute.textContent = 'Mute rival';
  mute.addEventListener('click', ev => { ev.stopPropagation(); rlEmoMute(); });
  pick.append(grid, mute);
  btn.addEventListener('click', ev => { ev.stopPropagation(); rlEmoOpen(); });
  for (const side of [0, 1]) { const d = document.createElement('div'); d.id = 'rlEmoB' + side; d.className = 'rl-emob'; d.hidden = true; d.setAttribute('aria-hidden', 'true'); const cv = document.createElement('canvas'); cv.width = cv.height = 160; const w = document.createElement('b'); d.append(cv, w); ui.append(d); }
  ui.append(btn, pick);
  // (a click anywhere else closes the picker)
  ui.addEventListener('pointerdown', e => { if (EM.open && !pick.contains(e.target) && e.target !== btn && !btn.contains(e.target)) rlEmoOpen(false); });
})();
