'use strict';
// Skerry Clash, first person (v224): a duel where two bots play the cards and each keeper takes the field as one of
// their own troops. Your side's bot (src/rlbot.js rlBotTick, run for both sides while RL.fp) spends the oil and sets
// the cards down; whenever a troop of yours is on the field you may take it over and fight as it, in first person,
// and swap to any other of yours as more come down. Alone, the other side is the bot at the level on the card; online,
// the other keeper has the other bot and does the same (the host's screen runs both bots, as it runs the match).
//
// The rules side (on the host, or alone): RL.fpc[side] is what that side's keeper is doing with the troop they hold,
// { u its unit's id, mx my the way they're walking (arena tiles, length at most 1), f the way they face (as u.face:
// atan2(dx, dy)), a 1 while they strike, at the clock when it was last heard }. rlUnit (src/rl.js) hands a held unit
// to rlfpUnit, which walks it by mx my (the race and the towers still in the way, through rlSeparate), faces it by f,
// 1.6 times its own pace (RLFP_PACE), and strikes, on its own rhythm, whatever is in reach in front of it (rlfpAim: the nearest in a cone round f, wider
// for the ones that strike up close). A held troop that isn't heard from for four seconds goes back to its own wits.
// Buildings can't be held, and spells are cast by the bot as ever. Q uses your champion's ability, as in a duel.
// The snapshot carries fp [u0, u1], the troop each side holds, so the guest and the watchers see who is where (a name
// plate over the rival's). The guest's input goes to the host as fi [u, mx*100, my*100, f*100, a] in its duel
// presence (src/rlnet.js), at most about every 50 to 100 ms while it changes; the host puts it in RL.fpc[1].
//
// This screen's side (RLFP): which troop you hold (u), your view (yaw, pitch: the view is your own, so it turns at
// once even on the guest), the keys, the mouse (pointer lock on the canvas), a controller (left stick walk, right
// stick look, RT or A strike, LB/RB the previous or next troop, Y the newest, B let go), and on a touch screen a stick
// on the left, a look pad on the right and a Strike button. The view: rlfpCam (called by src/rl3d.js rl3dDraw)
// puts the camera at the held troop's eyes and hides its model; with nothing held the board shows as in a duel. The
// HUD (#rlFp, built here): a crosshair, what you're aiming at and its strength, your troop's card and health, the
// row of your troops on the field to pick from (1 to 9, Tab for the next), a word when your bot sends a new one
// (F takes it), a map of the race with you on it, and red at the edges when you're hurt.

var RLFP = { u: 0, yaw: 0, pitch: -0.12, keys: {}, atk: false, mAtk: false, tAtk: false, lock: false, autoT: 0, free: false, seenU: 0, offer: 0, offerT: 0, netK: '', eyeFor: 0, eye: 1.3, camOn: false,
  hpLast: 0, hurt: 0, bob: 0, pickK: '', stick: null, look: null, padPrev: [], tgK: '', meK: '', ui: false, said: 0 };
const RLFP_STALE = 4;   // seconds without a word before a held troop goes back to its own wits
const RLFP_PACE = 1.6;  // a held troop walks this much quicker than on its own (the duel's pace is slow for first person)

// ---------- starting ----------
function rlfpPlayBot(lvl) {
  lvl = lvl || ($('rlBotLvl') && $('rlBotLvl').value) || 'normal'; if (!RL_BOTNM[lvl]) lvl = 'normal';
  const mine = typeof rlDeckMine === 'function' ? rlDeckMine() : RL_DEFAULT_DECK, sk = typeof rlSkinMine === 'function' ? rlSkinMine() : '';
  rlStart({ mode: 'bot', me: 0, fp: true, names: [rlMyName(), RL_BOTNM[lvl]], decks: [mine, typeof rlBotDeck === 'function' ? rlBotDeck(lvl) : RL_DEFAULT_DECK], skins: [sk || '', ''], lvl });
}
function rlfpReset() {
  Object.assign(RLFP, { u: 0, yaw: RL.me ? Math.PI : 0, pitch: -0.12, keys: {}, atk: false, mAtk: false, tAtk: false, autoT: 0, free: false, seenU: RL.nid, offer: 0, offerT: 0, netK: '', eyeFor: 0, camOn: false, hpLast: 0, hurt: 0, pickK: '', tgK: '', meK: '', said: 0 });
  rlfpUiBuild();
  const el = $('rlFp'); if (el) el.hidden = !RL.fp;
  $('rlUI').classList.toggle('fp', !!RL.fp);
  if (!RL.fp) rlfpUnlock();
}

// ---------- the rules (host or alone) ----------
// what a keeper says they're doing with the troop they hold (checked: their own, standing, not a building)
function rlfpCtl(side, uid, mx, my, f, a) {
  if (!RL.fp || !RL.fpc || !(side === 0 || side === 1)) return;
  uid = uid | 0; const u = uid ? RL.U.find(q => q.id === uid) : null;
  if (!u || u.side !== side || u.bld || u.hp <= 0) { RL.fpc[side] = null; return; }
  mx = +mx || 0; my = +my || 0; const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  RL.fpc[side] = { u: uid, mx, my, f: isFinite(+f) ? +f : u.face, a: a ? 1 : 0, at: RL.clk };
}
// the held unit's id for a side ('' on the guest comes from the snapshot)
function rlfpHeld(side) { if (!RL.fp) return 0; if (RL.fpU && rlIsGuest()) return RL.fpU[side] | 0; const c = RL.fpc && RL.fpc[side]; return c && RL.clk - c.at <= RLFP_STALE ? c.u : 0; }
// what's in front of u to strike, facing f: { T, reach (it can be struck now), gap }
function rlfpAim(u, C, f) {
  if (!u || !C) return null;
  const near = C.rng < 1.2, cone = near ? 1.05 : 0.42, lim = C.rng + (near ? 0.45 : 0.25), leap = C.ab === 'leap' && !(u.lpcd > 0) ? (C.lp || 3) : 0;
  let best = null, bs = 1e9;
  const look = (e, r) => {
    const d = rlD(u, e), gap = d - r - u.size * 0.6; if (gap > Math.max(lim, leap)) return;
    if (C.minr && d - r < C.minr) return;
    let da = Math.atan2(e.x - u.x, e.y - u.y) - f; da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
    if (da > cone && d > r + u.size + 0.2) return;
    const s = da * 1.6 + Math.max(0, gap) * 0.12 + (e.k ? 0.05 : 0); if (s < bs) { bs = s; best = { T: e, reach: gap <= lim, gap }; }
  };
  for (const e of RL.U) if (rlCanHit(C.tg, u.side, e) && !(e.dep > 0)) look(e, e.size || 0.4);
  for (const t of RL.T) if (t.hp > 0 && t.side !== u.side && !(RL.n3)) look(t, t.r);
  return best;
}
// a held unit's tick (from rlUnit, after its slows and stuns): true when it was held and has been moved here
function rlfpUnit(u, C, dt, k) {
  if (!RL.fp || u.bld || !RL.fpc) return false;
  const c = RL.fpc[u.side]; if (!c || c.u !== u.id || RL.clk - c.at > RLFP_STALE) return false;
  // (the Surgeon mends as it always does, wherever it's walked)
  if (C.ab === 'heal') {
    u.hlT -= dt;
    if (u.hlT <= 0) { u.hlT = 1; let n = 0; for (const q of RL.U) if (q !== u && q.side === u.side && !q.bld && q.hp > 0 && q.dep <= 0 && rlD(u, q) <= C.rng + q.size * 0.5) { if (q.hp < q.max) n++; q.hp = Math.min(q.max, q.hp + (C.hl || 0)); q.mendT = 1.1; } if (n) rlFx('heal', { c: u.c, x: u.x, y: u.y, side: u.side, r: C.rng }); }
  }
  u.face = c.f; u.rt = 0; let struck = false;
  if (c.a && C.dmg && C.ab !== 'heal') {
    const A = rlfpAim(u, C, c.f), T = A && A.T;
    if (T) {
      u.tg = T.id;
      if (!A.reach && C.ab === 'leap' && !(u.lpcd > 0) && rlDry(u.x, u.y, T.x, T.y)) {
        // (the Ship's Cat: a pounce onto it, biting as it lands)
        const d = rlD(u, T) || 1e-3, back = rlR(T) + u.size * 0.6 + C.rng * 0.4, fx = u.x, fy = u.y;
        u.px = u.x; u.py = u.y; u.x = T.x - (T.x - u.x) / d * back; u.y = T.y - (T.y - u.y) / d * back; rlWater(u);
        rlFx('leap', { c: u.c, x: fx, y: fy, tx: u.x, ty: u.y, side: u.side }); u.lpcd = 3; u.st = 'hit'; rlStrike(u, T, C); u.cd = C.hit; return true;
      }
      if (A.reach) {
        struck = true; u.st = 'hit';
        if (C.ab === 'ramp') { u.rpT += dt; u.rp = u.rpT >= 4 ? 2 : u.rpT >= 2 ? 1 : 0; }
        if (u.cd <= 0) { rlStrike(u, T, C); u.cd = C.hit; }
      }
    }
  }
  if (!struck) { u.rpT = 0; u.rp = 0; if (!c.a) u.tg = 0; }
  const m = Math.hypot(c.mx, c.my);
  if (m > 0.05) {
    if (C.ab === 'charge' && !u.chg && u.run >= 2) { u.chg = 1; rlFx('flash', { c: u.c, x: u.x, y: u.y, side: u.side, r: 0 }); }
    const sp = C.spd * RLFP_PACE * k * (u.chg ? 2 : 1) * (u.tar ? 0.5 : 1) * (struck ? 0.6 : 1), step = sp * dt;
    u.x += c.mx * step; u.y += c.my * step; u.run += step * m;
    if (!struck) u.st = 'walk';
  } else { u.run = 0; u.chg = 0; if (!struck) u.st = 'idle'; }
  return true;
}

// ---------- this screen ----------
const rlfpMine = () => RL.U.filter(u => u.side === RL.me && !u.bld && u.hp > 0);
function rlfpUnitMine() { if (!RLFP.u) return null; const u = RL.U.find(q => q.id === RLFP.u); return u && u.hp > 0 && u.side === RL.me ? u : null; }
function rlfpTake(u) {
  if (!u || rlIsSpec()) return;
  if (RLFP.u !== u.id) { RLFP.yaw = isFinite(u.face) ? u.face : (RL.me ? Math.PI : 0); RLFP.pitch = u.air ? -0.32 : -0.12; RLFP.hpLast = u.hp; RLFP.eyeFor = 0; }
  RLFP.u = u.id; RLFP.free = false; RLFP.offer = 0; RLFP.hurt = 0;
  if (typeof rlHudSay === 'function') { const C = RL_CARD[u.c] || {}; rlHudSay(C.cnt > 1 ? `You are one of the ${C.n}` : `You are the ${C.n || 'troop'}`, 1.4); }
}
function rlfpLetGo() { RLFP.u = 0; RLFP.free = true; RLFP.atk = false; rlfpUnlock(); }
function rlfpCycle(d) { const L = rlfpMine(); if (!L.length) return; let i = L.findIndex(u => u.id === RLFP.u); i = i < 0 ? (d > 0 ? 0 : L.length - 1) : (i + d + L.length) % L.length; rlfpTake(L[i]); }
function rlfpNewest() { const L = rlfpMine(); return L.length ? L[L.length - 1] : null; }
function rlfpUnlock() { try { if (document.pointerLockElement === $('rlCv')) document.exitPointerLock(); } catch (e) {} }
// keys (from src/rlhud.js's own key handler, so nothing else hears them): true when taken
function rlfpKey(e, down) {
  if (!RL.on || !RL.fp || rlIsSpec()) return false;
  const k = e.key, K = k.length === 1 ? k.toLowerCase() : k;
  if (K === 'Escape') { if (down) { RLFP.keys = {}; RLFP.atk = false; } return false; }
  if (!$('rlPause').hidden) return false;
  const move = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift'];
  if (move.includes(K)) { e.preventDefault(); RLFP.keys[K] = down; if (K === ' ') RLFP.atk = down; return true; }
  if (!down || e.repeat) return true;
  if (K === 'Tab') { e.preventDefault(); rlfpCycle(e.shiftKey ? -1 : 1); return true; }
  if (K === 'f') { const n = RLFP.offer ? RL.U.find(u => u.id === RLFP.offer && u.hp > 0) : rlfpNewest(); if (n) rlfpTake(n); return true; }
  if (K === 'r') { rlfpLetGo(); return true; }
  const n = '123456789'.indexOf(k); if (n >= 0) { const L = rlfpMine().slice(-9); if (L[n]) rlfpTake(L[n]); return true; }
  if ((K === 'q' || k === '0') && typeof rlTryAb === 'function') { rlTryAb(); return true; }
  return false;
}
// the input as the way you walk (arena tiles) and strike
function rlfpInput(dt) {
  const K = RLFP.keys; let fw = (K.w || K.ArrowUp ? 1 : 0) - (K.s || K.ArrowDown ? 1 : 0), st = (K.d ? 1 : 0) - (K.a ? 1 : 0);
  RLFP.yaw += ((K.ArrowRight ? 1 : 0) - (K.ArrowLeft ? 1 : 0)) * dt * 2.4;
  // a controller (read here: src/gamepad.js only drives menus on this screen)
  const p = typeof firstPad === 'function' ? firstPad() : null; let padAtk = false;
  if (p) {
    const z = v => Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82, now = p.buttons.map(b => b.pressed), dn = i => now[i] && !RLFP.padPrev[i];
    const lx = z(p.axes[0] || 0), ly = z(p.axes[1] || 0), rx = z(p.axes[2] || 0), ry = z(p.axes[3] || 0);
    if (lx || ly) { st += lx; fw -= ly; }
    RLFP.yaw += rx * Math.abs(rx) * dt * 3.2; RLFP.pitch -= ry * Math.abs(ry) * dt * 2;
    padAtk = (p.buttons[7] && p.buttons[7].value > 0.4) || !!now[0];
    if (dn(5)) rlfpCycle(1); if (dn(4)) rlfpCycle(-1); if (dn(3)) { const n = RLFP.offer ? RL.U.find(u => u.id === RLFP.offer && u.hp > 0) : rlfpNewest(); if (n) rlfpTake(n); }
    if (dn(1)) rlfpLetGo(); if (dn(2) && typeof rlTryAb === 'function') rlTryAb(); if (dn(9)) rlPauseOpen($('rlPause').hidden);
    RLFP.padPrev = now;
  }
  // a touch screen: the stick on the left
  if (RLFP.stick) { const s = RLFP.stick, dx = (s.x - s.x0) / 50, dy = (s.y - s.y0) / 50; st += Math.max(-1, Math.min(1, dx)); fw -= Math.max(-1, Math.min(1, dy)); }
  RLFP.pitch = Math.max(-1.2, Math.min(0.9, RLFP.pitch));
  const f = RLFP.yaw, sf = Math.sin(f), cf = Math.cos(f);
  let mx = fw * sf + st * cf, my = fw * cf - st * sf; const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  return { mx, my, f, a: RLFP.atk || RLFP.mAtk || RLFP.tAtk || padAtk };
}
// every frame (src/rl.js rlFrame, before the ticks): what you hold, and what you're doing with it
function rlfpFrame(dt) {
  if (!RL.on || !RL.fp) return;
  if (!RLFP.ui) rlfpReset();
  const spec = rlIsSpec(), paused = !$('rlPause').hidden;
  // (new troops of yours: a word, and one to take straight away if you hold nothing)
  if (!spec) {
    let newest = null; for (const u of RL.U) if (u.id > RLFP.seenU && u.side === RL.me && !u.bld && u.hp > 0) { if (!newest || u.id > newest.id) newest = u; }
    const hi = RL.U.reduce((a, u) => Math.max(a, u.id), RLFP.seenU); RLFP.seenU = hi;
    if (newest && RLFP.u && newest.id !== RLFP.u) { RLFP.offer = newest.id; RLFP.offerT = 4; }
    if (RLFP.offerT > 0) { RLFP.offerT -= dt; if (RLFP.offerT <= 0) RLFP.offer = 0; }
    const u = rlfpUnitMine();
    if (RLFP.u && !u) { RLFP.u = 0; RLFP.autoT = 1.2; RLFP.atk = RLFP.mAtk = false; if (typeof rlHudSay === 'function') rlHudSay('Your troop has fallen', 1.6, true); }
    if (!RLFP.u && !RLFP.free && RL.ph !== 'over') { RLFP.autoT -= dt; if (RLFP.autoT <= 0) { const n = rlfpNewest(); if (n) rlfpTake(n); } }
    if (u && u.hp < RLFP.hpLast - 0.5) RLFP.hurt = Math.min(1, RLFP.hurt + (RLFP.hpLast - u.hp) / u.max * 4 + 0.15);
    RLFP.hpLast = u ? u.hp : 0;
  }
  RLFP.hurt = Math.max(0, RLFP.hurt - dt * 1.6);
  const I = !spec && !paused && RL.ph === 'play' ? rlfpInput(dt) : { mx: 0, my: 0, f: RLFP.yaw, a: false };
  if (!RLFP.u) { I.mx = I.my = 0; I.a = false; }
  RLFP.cur = I;
  if (!spec && !rlIsGuest()) rlfpCtl(RL.me, RLFP.u, I.mx, I.my, I.f, I.a);
  rlfpHud(dt);
}
// the guest's word to the host (src/rlnet.js), and whether it's time to send it
function rlfpNetOut() { const I = RLFP.cur || {}; return [RLFP.u | 0, Math.round((I.mx || 0) * 100), Math.round((I.my || 0) * 100), Math.round((I.f || 0) * 50) * 2, I.a ? 1 : 0]; }
function rlfpNetDue(ms) { if (!RL.fp) return false; const k = rlfpNetOut().join(','); if (k !== RLFP.netK && ms > (typeof NET !== 'undefined' && NET.via === 'claude' ? 100 : 50)) { RLFP.netK = k; return true; } return false; }
function rlfpNetIn(side, fi) { if (!Array.isArray(fi)) { rlfpCtl(side, 0); return; } rlfpCtl(side, fi[0], (+fi[1] || 0) / 100, (+fi[2] || 0) / 100, (+fi[3] || 0) / 100, fi[4]); }

// ---------- the view (from src/rl3d.js rl3dDraw): true when the camera is at your troop's eyes ----------
function rlfpCam(dt) {
  const C = RL3.cam, u = RL.fp && !rlIsSpec() ? rlfpUnitMine() : null;
  if (!u) { if (RLFP.camOn) { RLFP.camOn = false; C.near = 0.5; C.updateProjectionMatrix(); RL3.fitKey = ''; } return false; }
  const H = RL3.units.get(u.id), [x, y] = rlPos(u);
  if (H && RLFP.eyeFor !== u.id && H.rise >= 1) { const b = new THREE.Box3().setFromObject(H.g); RLFP.eye = Math.max(0.55, Math.min(4, (b.max.y - H.g.position.y) * 0.9)); RLFP.eyeFor = u.id; }
  const walk = u.st === 'walk'; RLFP.bob += dt * (walk ? 9 : 0);
  const bob = walk && !u.air ? Math.sin(RLFP.bob) * 0.04 : u.air ? Math.sin(RL3.t * 2) * 0.06 : 0, base = H ? H.g.position.y : RL_G0;
  C.fov = innerWidth < innerHeight ? 80 : 72; C.near = 0.05; C.aspect = innerWidth / innerHeight; C.clearViewOffset(); C.updateProjectionMatrix();
  const p = rv(x, y, 0); C.position.set(p.x, base + RLFP.eye + bob, p.z);
  const f = RLFP.yaw, pt = RLFP.pitch;
  C.lookAt(C.position.x + Math.sin(f) * Math.cos(pt), C.position.y + Math.sin(pt), C.position.z - Math.cos(f) * Math.cos(pt));
  RL3.fitKey = ''; RLFP.camOn = true;
  return true;
}
// (src/rl3d.js asks which unit not to draw: the one you're looking out of)
function rlfpHidden() { return RLFP.camOn ? RLFP.u : 0; }

// ---------- the HUD ----------
function rlfpUiBuild() {
  if (RLFP.ui || !$('rlUI')) return; RLFP.ui = true;
  const el = document.createElement('div'); el.className = 'rl-fp'; el.id = 'rlFp'; el.hidden = true;
  el.innerHTML = '<div class="rl-fphurt" id="rlFpHurt"></div><div class="rl-fpx" id="rlFpX"><i></i></div><div class="rl-fptg" id="rlFpTg" hidden><b></b><i><s></s></i></div>'
    + '<div class="rl-fpme" id="rlFpMe" hidden><canvas width="96" height="112"></canvas><div><b></b><i><s></s></i><small></small></div></div>'
    + '<canvas class="rl-fpmap" id="rlFpMap" width="108" height="192"></canvas><div class="rl-fpnew" id="rlFpNew" hidden></div>'
    + '<div class="rl-fpwait" id="rlFpWait" hidden></div><div class="rl-fppick" id="rlFpPick" aria-label="Your troops on the field"></div>'
    + '<div class="rl-fpstick" id="rlFpStick" hidden><i></i></div><button class="rl-fpstrike" id="rlFpStrike" type="button">Strike</button>'
    + '<div class="rl-fphint" id="rlFpHint">Click to look round · WASD walk · Space or click strike · Tab next troop · F take the new one · R let go</div>';
  $('rlUI').insertBefore(el, $('rlDrag'));
  const cv = $('rlCv'), nw = $('rlFpNew');
  nw.addEventListener('click', () => { const n = RLFP.offer && RL.U.find(u => u.id === RLFP.offer && u.hp > 0); if (n) rlfpTake(n); });
  const sb = $('rlFpStrike');
  sb.addEventListener('pointerdown', e => { e.preventDefault(); RLFP.tAtk = true; try { sb.setPointerCapture(e.pointerId); } catch (er) {} });
  for (const ev of ['pointerup', 'pointercancel']) sb.addEventListener(ev, () => { RLFP.tAtk = false; });
  // the mouse: a click locks the pointer to look round, then the left button strikes
  cv.addEventListener('pointerdown', e => {
    if (!RL.on || !RL.fp || rlIsSpec()) return;
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      if (!RLFP.u) { const n = rlfpNewest(); if (n) rlfpTake(n); return; }
      if (document.pointerLockElement !== cv) { try { cv.requestPointerLock(); } catch (er) {} return; }
      RLFP.mAtk = true; return;
    }
    // a touch: the left of the screen is the stick, the right looks round
    if (!RLFP.u) { const n = rlfpNewest(); if (n) rlfpTake(n); }
    const t = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
    if (e.clientX < innerWidth * 0.45 && !RLFP.stick) { RLFP.stick = t; const s = $('rlFpStick'); s.hidden = false; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; s.firstChild.style.transform = ''; }
    else if (!RLFP.look) RLFP.look = t;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  cv.addEventListener('pointermove', e => {
    if (!RL.fp) return;
    if (e.pointerType === 'mouse') { if (document.pointerLockElement === cv) { RLFP.yaw += (e.movementX || 0) * 0.0032; RLFP.pitch -= (e.movementY || 0) * 0.0028; } return; }
    const S = RLFP.stick, L = RLFP.look;
    if (S && S.id === e.pointerId) { S.x = e.clientX; S.y = e.clientY; const dx = Math.max(-50, Math.min(50, S.x - S.x0)), dy = Math.max(-50, Math.min(50, S.y - S.y0)); $('rlFpStick').firstChild.style.transform = `translate(${dx}px, ${dy}px)`; }
    if (L && L.id === e.pointerId) { RLFP.yaw += (e.clientX - L.x) * 0.006; RLFP.pitch -= (e.clientY - L.y) * 0.005; L.x = e.clientX; L.y = e.clientY; }
  });
  const end = e => { if (RLFP.stick && RLFP.stick.id === e.pointerId) { RLFP.stick = null; $('rlFpStick').hidden = true; } if (RLFP.look && RLFP.look.id === e.pointerId) RLFP.look = null; if (e.pointerType === 'mouse') RLFP.mAtk = false; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  document.addEventListener('pointerlockchange', () => { RLFP.lock = document.pointerLockElement === cv; if (!RLFP.lock) RLFP.mAtk = false; const h = $('rlFpHint'); if (h) h.classList.toggle('dim', RLFP.lock); });
  addEventListener('blur', () => { RLFP.keys = {}; RLFP.atk = RLFP.mAtk = RLFP.tAtk = false; });
}
function rlfpHud(dt) {
  const el = $('rlFp'); if (!el) return;
  if (el.hidden) el.hidden = false; if (!$('rlUI').classList.contains('fp')) $('rlUI').classList.add('fp');
  const spec = rlIsSpec(), u = rlfpUnitMine(), C = u ? RL_CARD[u.c] : null, cam = RLFP.camOn;
  el.classList.toggle('held', !!cam); el.classList.toggle('spec', spec);
  $('rlFpHurt').style.opacity = (RLFP.hurt * 0.85).toFixed(2);
  // what's in front of you
  const A = u && C && C.dmg && C.ab !== 'heal' ? rlfpAim(u, C, RLFP.yaw) : null, tg = $('rlFpTg');
  if (A && cam) {
    const T = A.T, nm = T.k ? (T.k === 'great' ? 'Great Light' : 'Lamp Tower') : (RL_CARD[T.c] || {}).n || '', key = nm + Math.ceil(T.hp) + A.reach;
    if (RLFP.tgK !== key) { RLFP.tgK = key; tg.firstChild.textContent = nm + ' · ' + Math.max(0, Math.ceil(T.hp)); tg.lastChild.firstChild.style.width = (Math.max(0, T.hp) / (T.max || 1) * 100).toFixed(1) + '%'; tg.classList.toggle('far', !A.reach); }
    tg.hidden = false; $('rlFpX').classList.toggle('on', A.reach);
  } else { tg.hidden = true; $('rlFpX').classList.remove('on'); }
  // your troop
  const me = $('rlFpMe');
  if (u) {
    const key = u.id + '|' + Math.ceil(u.hp);
    if (RLFP.meK !== key) {
      if (!RLFP.meK.startsWith(u.id + '|')) rlFace(me.querySelector('canvas'), u.c);
      RLFP.meK = key; me.querySelector('b').textContent = C.n; me.querySelector('s').style.width = (u.hp / u.max * 100).toFixed(1) + '%';
      me.querySelector('small').textContent = Math.ceil(u.hp) + ' / ' + Math.round(u.max) + (C.ab === 'heal' ? ' · mends all round it' : C.tg === 'build' ? ' · strikes buildings and towers' : C.air ? ' · flies' : '');
    }
    me.hidden = false;
  } else me.hidden = true;
  // the word: waiting, or a new one to take
  const wait = $('rlFpWait'), mine = spec ? [] : rlfpMine();
  const ws = spec ? '' : RL.ph === 'count' ? 'Your keeper plays the cards. Take the field as any troop they send.' : !u && RL.ph === 'play' ? (mine.length ? (RLFP.free ? 'Pick a troop below, or press F' : 'Taking the field…') : 'Waiting for your keeper to send a troop…') : '';
  if (wait.textContent !== ws) wait.textContent = ws; wait.hidden = !ws;
  const nw = $('rlFpNew'), on = RLFP.offer && RL.U.find(q => q.id === RLFP.offer && q.hp > 0);
  if (on) { const s = `New: ${(RL_CARD[on.c] || {}).n || 'troop'} · F to take it`; if (nw.textContent !== s) nw.textContent = s; nw.hidden = false; } else nw.hidden = true;
  // the row of your troops
  const pick = $('rlFpPick'), L = mine.slice(-9), pk = L.map(q => q.id).join(',') + '/' + RLFP.u;
  if (pk !== RLFP.pickK) {
    RLFP.pickK = pk; pick.textContent = '';
    L.forEach((q, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rl-fpu' + (q.id === RLFP.u ? ' sel' : ''); b.dataset.id = q.id; b.title = (RL_CARD[q.c] || {}).n || '';
      b.innerHTML = '<canvas width="96" height="112"></canvas><i><s></s></i><kbd>' + (i + 1) + '</kbd>';
      rlFace(b.querySelector('canvas'), q.c);
      b.addEventListener('click', e => { e.preventDefault(); const t = RL.U.find(z => z.id === q.id && z.hp > 0); if (t) rlfpTake(t); });
      pick.append(b);
    });
  }
  for (const b of pick.children) { const q = RL.U.find(z => z.id === +b.dataset.id); if (q) b.querySelector('s').style.width = (Math.max(0, q.hp) / q.max * 100).toFixed(0) + '%'; }
  rlfpMap(); rlfpRivalTag();
}
// the map of the race: your rock at the bottom, the towers, everyone on the field, and you with your view
function rlfpMap() {
  const cv = $('rlFpMap'); if (!cv) return; const g = cv.getContext('2d'), W = cv.width, Hh = cv.height, me = RL.me;
  const X = x => (me ? RLC.W - x : x) / RLC.W * W, Y = y => (me ? y : RLC.H - y) / RLC.H * Hh;
  g.clearRect(0, 0, W, Hh); g.fillStyle = 'rgba(14,30,48,0.82)'; g.fillRect(0, 0, W, Hh);
  g.fillStyle = 'rgba(96,104,84,0.9)'; g.fillRect(0, Math.min(Y(0), Y(RLC.R0)), W, Math.abs(Y(RLC.R0) - Y(0))); g.fillRect(0, Math.min(Y(RLC.R1), Y(RLC.H)), W, Math.abs(Y(RLC.H) - Y(RLC.R1)));
  g.fillStyle = 'rgba(150,140,120,0.95)'; for (const cx of RLC.LX) g.fillRect(Math.min(X(cx - RLC.CW), X(cx + RLC.CW)), Math.min(Y(RLC.R0), Y(RLC.R1)), Math.abs(X(cx + RLC.CW) - X(cx - RLC.CW)), Math.abs(Y(RLC.R1) - Y(RLC.R0)));
  const held = [rlfpHeld(0), rlfpHeld(1)];
  for (const t of RL.T) { if (t.hp <= 0) continue; const s = t.k === 'great' ? 9 : 7; g.fillStyle = t.side === me ? '#5aa2ff' : '#ff6352'; g.fillRect(X(t.x) - s / 2, Y(t.y) - s / 2, s, s); }
  for (const u of RL.U) { if (u.hp <= 0) continue; const h = held[u.side] === u.id; g.fillStyle = h ? '#fff4c0' : u.side === me ? '#9cc8ff' : '#ff9a8a'; const r = h ? 3.2 : u.bld ? 2.6 : 1.8; g.beginPath(); g.arc(X(u.x), Y(u.y), r, 0, 7); g.fill(); }
  const u = rlfpUnitMine();
  if (u && RLFP.camOn) { const [x, y] = rlPos(u), s = me ? -1 : 1, f = RLFP.yaw, px = X(x), py = Y(y); g.strokeStyle = 'rgba(255,244,192,0.85)'; g.lineWidth = 1.5; g.beginPath(); for (const a of [-0.55, 0.55]) { g.moveTo(px, py); g.lineTo(px + Math.sin(f + a) * 16 * s, py - Math.cos(f + a) * 16 * s); } g.stroke(); }
}
// a name plate over the troop the rival holds (src/rl3d.js puts it there through rl3dProject)
function rlfpRivalTag() {
  let tag = $('rlFpRival'); const id = RL.fp && !rlIsSpec() ? rlfpHeld(1 - RL.me) : 0, u = id ? RL.U.find(q => q.id === id && q.hp > 0) : null;
  if (!u) { if (tag) tag.hidden = true; return; }
  if (!tag) { tag = document.createElement('div'); tag.id = 'rlFpRival'; tag.className = 'rl-fprival'; $('rlUI').insertBefore(tag, $('rlDrag')); }
  const [x, y] = rlPos(u), p = rl3dProject(x, y, RL_G0 + (u.air ? 3.6 : 2.2));
  if (!p || !p.on) { tag.hidden = true; return; }
  const nm = RL.names[1 - RL.me] || 'Rival'; if (tag.textContent !== nm) tag.textContent = nm;
  tag.hidden = false; tag.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
}
(function rlfpInit() { const b = typeof $ === 'function' && $('rlFpPlay'); if (b) b.addEventListener('click', () => rlfpPlayBot()); })();
