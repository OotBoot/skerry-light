'use strict';
// The Chronicle of the Light, mission 8, Part III: By Flarelight (cp_m08deck). Up her side and over the rail onto
// the risen Gannet's weather deck (the Quarterdeck's own deck, src/gwcapt.js: her masts and torn sails, the wheel,
// the flare lockers, the ship's bell on the forecastle, the Light off to the west), but not the raid's fight.
//  - First, the waist in the dark. Her figurehead has walked off her bow and stands on her forecastle: Knock, who
//    moves only while none of you has him in sight (or in a flare's light). Out of the main hatch, aft of you, comes
//    the Bosun with his boarding axe, the guard of her hold come up on deck. Put the Bosun down with Knock at your
//    backs; if Knock reaches one of you he takes half their health and throws them down the deck, and goes back to
//    the bow to wait; the ship's bell freezes him where he is, as it always did.
//  - Then Crane (a cinematic, m08_crane): up through his own deck by the wheel, and his black sail already up the
//    port side between her and the Light. By flarelight only, from the start. Two halyards hold the black sail up,
//    belayed on the port rail: hold Use at each to cut it, and the sail comes down and the Light's beam crosses the
//    deck again, until he hauls it back up (and while he hauls it nothing touches him).
//  - At a third of his strength, a lantern under the port rail (a cinematic, m08_maren): her skiff, a year late. The
//    black sail burns, the Light's beam is on the deck for good, and her lantern lights him whenever he stands on
//    her side of the ship. Put him down, and she goes down under you all (the outro).
// The Quarterdeck's stage underneath (its layout, its hull, its Crane, its lockers and bell, its word gc), with this
// part's own on top: Knock, the Bosun, the halyards and her lantern, and its own end (no token: the mission's outro).
// Host-authoritative: the host runs Knock, the halyards and the phases and sends them in m8d; a joined player asks to
// cut at a halyard ('m8hal'). Lines through cpSay (cp_m08_25 on).

const CPM8D = {
  KNOCK: [0, 19.5], BOSUN: [1.6, -5.2], HAL: [[-4.15, -7.2], [-4.15, 9.8]], HAL_T: 2.4, DOWN: 18, MAREN: 0.34,
  KN_SP: 3.9, KN_SEE: 30, KN_FOV: 0.78, KN_REACH: 1.2, KN_REST: 9, KN_BELL: 12,
  ALIVE: 4, ALIVE_MORE: 2, TRICKLE: [4.5, 7], LEVEL: 10,
};
const CPM8D_PH = ['bosun', 'crane0', 'crane', 'maren0', 'maren', 'won'];

// ---------- the stage ----------
(function () {
  const G0 = RAID_STAGES.gwcapt;
  cpStage('m08deck', Object.assign({}, G0, {
    n: 'By Flarelight',
    music: () => { const p = RAID.st.m8d ? RAID.st.m8d.ph : 'bosun'; return p === 'bosun' || p === 'crane0' ? 'cpm08deck' : p === 'maren' || p === 'maren0' ? 'cpm08last' : 'cpm08crane'; },
    enter() {
      G0.enter();
      GCW.wait = 1e9; GCW.mine = true;
      const [kx, ky] = cpkW(...CPM8D.KNOCK);
      RAID.st.m8d = { ph: 'bosun', t: 0, trickT: 5, said: {}, hal: [0, 0], down: 0, holdT: 0, litAgo: 9, kb: [0, 0], scare: 0,
        kn: { x: kx, y: ky, tx: kx, ty: ky, jz: GCC.FC, h: Math.PI, mv: 0, seen: 0, rest: 4, fig: 0, ph: 0, zpad: 0.5, fl: GCC.FC } };
      ZM.round = Math.max(ZM.round, CPM8D.LEVEL);
      if (ZM.net === 'client') return;
      cpm8dBosun();
      cpObjective(''); cpWaypoint(null);
      cpSay('bosun', 'Nobody walks her deck without the captain’s leave. Nobody.', 'cp_m08_25');
    },
    tick(dt) { G0.tick(dt); cpm8dTick(dt); },
    me(dt) { G0.me(dt); cpm8dMe(dt); },
    q(sid, k, a) {
      if (k === 'm8hal') return cpm8dHal(sid, a | 0);
      G0.q(sid, k, a);
      // the ship's bell: Knock freezes where he stands
      if (k === 'bell') { const K = RAID.st.m8d.kn; if (!K.fig && GCW.bell > GCC.BELL - 0.5) { K.rest = Math.max(K.rest, CPM8D.KN_BELL); cpEvent('m8kbell'); } }
    },
    kill(d, how, by) { cpm8dKill(d, how, by); },
    hurt(d, dmg, code, by) { return cpm8dHurt(d, dmg, code, by); },
    pack(o) { G0.pack(o); const D = RAID.st.m8d, K = D.kn; o.m8d = [CPM8D_PH.indexOf(D.ph), Math.round((K.x - FPSC.CX) * 10), Math.round((K.y - FPSC.CY) * 10), Math.round(K.h * 100), (K.mv ? 1 : 0) | (K.rest > 0 ? 2 : 0) | (K.fig ? 4 : 0), K.seen | 0, Math.round(D.hal[0] * 100), Math.round(D.hal[1] * 100), Math.round(D.down * 10)]; },
    apply(o) {
      G0.apply(o); const D = RAID.st.m8d, a = o.m8d; if (!D || !Array.isArray(a)) return; const K = D.kn;
      D.ph = CPM8D_PH[a[0] | 0] || 'bosun'; const tx = FPSC.CX + a[1] / 10, ty = FPSC.CY + a[2] / 10; if (Math.hypot(tx - K.x, ty - K.y) > 4) { K.x = tx; K.y = ty; } K.tx = tx; K.ty = ty; K.th = a[3] / 100;
      K.mv = a[4] & 1; K.rest = a[4] & 2 ? 1 : 0; K.fig = a[4] & 4 ? 1 : 0; K.seen = a[5] | 0; D.hal = [(+a[6] || 0) / 100, (+a[7] || 0) / 100]; D.down = (+a[8] || 0) / 10;
    },
    consider(c) { G0.consider(c); const D = RAID.st.m8d; if (cpm8dHalOk()) CPM8D.HAL.forEach(([x0, y0], i) => { if (D.hal[i] < 1) { const [x, y] = cpkW(x0, y0); c({ k: 'm8hal', i }, x, y, 0, 1.8, false); } }); },
    prompt(o) { if (o.k === 'm8hal') return { text: 'Hold to cut the black sail’s halyard', hold: true }; return G0.prompt(o); },
    use(o) { if (o.k === 'm8hal') return true; return G0.use(o); },
    hud(phone, mono, fell) { cpm8dHud(phone, mono, fell, G0); },
    b3(grp) { G0.b3(grp); cpm8d3dBuild(grp); },
    f3(dt) { G0.f3(dt); cpm8d3d(dt); },
    exit() { G0.exit(); CPM8D3.on = false; },
  }));
})();

// ---------- the light on him: flares, the beam with the sail down, her lantern ----------
function cpm8dLit() {
  const D = RAID.st.m8d; if (!D || !GCW.on) return false;
  if (gcFlares()) return true;
  if ((GCW.sail || 0) < 0.25 && gwInBeam(gcBeamAt(), GCC.BEAM_W)) return true;
  if (D.ph === 'maren') { const M = gcCrane(); if (M && M.x - FPSC.CX < -0.8) return true; }
  return false;
}
function cpm8dHurt(d, dmg, code, by) {
  if (!d || d.bt !== 'crane') return dmg;
  const mine = !by || by === FPS.me.id, D = RAID.st.m8d, lit = cpm8dLit() || (!mine && D && D.litAgo < GCC.LIT_GRACE);
  if (!lit || d.act === 'rise' || d.act === 'hoist') { if (mine) gcDarkHit(d, !lit ? 'dark' : d.act); return 0; }
  if (mine) { raidBossDamage(dmg * (ZM_DMG[code] == null ? 1 : ZM_DMG[code])); GCW.litHit = 0.25; }
  return dmg;
}
// the halyards can be cut while the sail's up and he's fighting (not before he's come, nor once she's burnt it)
const cpm8dHalOk = () => { const D = RAID.st.m8d; return !!D && D.ph === 'crane' && GCW.st === 'fight' && (GCW.sail || 0) > 0.9 && D.down <= 0; };

// ---------- hosting or alone ----------
function cpm8dBosun() {
  if (typeof ZBT === 'undefined' || !ZBT.bosun) return;
  const T = ZBT.bosun, [x, y] = cpkW(...CPM8D.BOSUN), zn = ++ZM.zc, n = Math.max(1, ZM.hum.length), hp = zbHpOf('bosun', CPM8D.LEVEL, n) * 0.85;
  const z = { drowned: true, zm: true, boss: true, bt: 'bosun', zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x, y, jz: 0, fl: 0, hp, max: hp, sp: T.sp(), st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 4, swCd: 1.5, ix: x, iy: y, ax: x, ay: y, lx: x, ly: y, raid: true };
  if (T.init) T.init(z);
  zbMake(z, 'bosun'); ZM.z.push(z); FPS.drowned = ZM.z;
  if (typeof ZB !== 'undefined') { zbNew(); ZB.seen.add(zn); }
  RAID.st.m8d.bz = zn;
  for (let i = 0; i < 20; i++) fpsPuff(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2, FPSC.GROUND + Math.random() * 2, '140,170,170', 3);
}
function cpm8dTick(dt) {
  const S = RAID.st, D = S.m8d, K = D && D.kn, n = Math.max(1, ZM.hum.length); if (!D || !GCW.on) return;
  D.t += dt; D.litAgo = cpm8dLit() ? 0 : D.litAgo + dt;
  if (D.ph === 'bosun') {
    cpm8dKnock(dt);
    if (D.t > 7 && !D.said.kn) { D.said.kn = 1; cpSay('m8cox', 'Keep your eyes on that figurehead! It only moves while nobody’s looking at it!', 'cp_m08_26'); }
    // a few of her drowned, up over the rails the while
    D.trickT -= dt;
    if (D.trickT <= 0) { D.trickT = (CPM8D.TRICKLE[0] + Math.random() * (CPM8D.TRICKLE[1] - CPM8D.TRICKLE[0])) / (1 + 0.25 * (n - 1)); const alive = ZM.z.filter(z => !z.dead && !z.boss).length; if (alive < CPM8D.ALIVE + CPM8D.ALIVE_MORE * (n - 1)) gcSpawn(gcSpots(1, Math.random() * 1e6)[0]); }
    // (the Bosun gone some other way: on, all the same)
    if (D.t > 2 && !ZM.z.some(z => z.zn === D.bz && !z.dead)) cpm8dBosunDown();
    return;
  }
  const M = gcCrane();
  if (D.ph === 'crane') {
    // the halyards cut: the sail comes down for a while, then he hauls it up again
    if (D.down > 0) {
      D.down -= dt; D.sailK = Math.max(0, (D.sailK == null ? 1 : D.sailK) - dt / 1.2); GCW.sail = D.sailK;
      if (D.down <= 0 && M && !M.dead) { D.down = 0; D.hal = [0, 0]; D.sailK = 1; GCW.sail = 0; if (M.act) { M.act = null; M.at = 0; } zbStart(M, 'hoist'); if (!D.said.re) { D.said.re = 1; cpSay('crane', 'Hoist it again, you dogs! Shut that Light off my deck!', 'cp_m08_31'); } }
    }
    if (D.t > 6 && !D.said.hal) { D.said.hal = 1; cpSay('m8cox', 'Only a flare will show him now. Cut the halyards on the port rail and that sail comes down!', 'cp_m08_29'); }
    if (M && !M.dead && M.act !== 'rise' && M.hp <= M.max * CPM8D.MAREN) {
      D.ph = 'maren0'; D.down = 0; if (M.act) { M.act = null; M.at = 0; }
      for (const z of ZM.z) if (!z.dead && !z.boss) { gcOverSide(z); zmKill(z, false, '', 'flash'); }
      cpCine('m08_maren', () => { D.ph = 'maren'; GCW.sail = 0; cpEvent('m8maren'); cpSay('m8cox', 'The black sail’s burning! Her lantern’s on him: finish him!', 'cp_m08_35'); });
    }
  }
  if (D.ph === 'maren') GCW.sail = 0;
}
function cpm8dBosunDown() {
  const S = RAID.st, D = S.m8d; if (D.ph !== 'bosun') return;
  D.ph = 'crane0'; const K = D.kn, [kx, ky] = cpkW(...CPM8D.KNOCK); K.x = kx; K.y = ky; K.jz = GCC.FC; K.h = Math.PI; K.mv = 0; K.fig = 1;
  for (const z of ZM.z) if (!z.dead && !z.boss) { gcOverSide(z); zmKill(z, false, '', 'flash'); }
  cpCine('m08_crane', () => { D.ph = 'crane'; D.t = 0; GCW.p2 = 1; GCW.sail = 1; GCW.wait = 0.2; cpEvent('m8crane'); });
}
function cpm8dKill(d, how, by) {
  const D = RAID.st.m8d; if (!D) return;
  if (d.bt === 'bosun' && D.ph === 'bosun') { cpm8dBosunDown(); return; }
  if (d.bt === 'crane' && d.boss && GCW.st === 'fight') {
    GCW.st = 'won'; GCW.wonT = 3.2; GCW.mine = true; D.ph = 'won';
    for (const z of ZM.z) if (!z.dead && !z.boss) zmKill(z, false, '', 'flash');
    gcLine('Captain Absalom Crane goes down to the deck of his ship, and is still. Under you, she starts to go.');
  }
}
// cut at a halyard: a quarter second's worth of cutting, from whoever's holding Use at it
function cpm8dHal(sid, i) {
  const D = RAID.st.m8d, who = sid === FPS.me.id ? FPS.me : FPS.remote.get(sid); if (!who || !cpm8dHalOk()) return;
  i = clamp(i, 0, 1); const [x, y] = cpkW(...CPM8D.HAL[i]); if (Math.hypot(who.x - x, who.y - y) > 2.6 || D.hal[i] >= 1) return;
  D.hal[i] = Math.min(1, D.hal[i] + 0.25 / CPM8D.HAL_T);
  if (D.hal[i] >= 1) { cpEvent('m8hal', i); if (D.hal.every(h => h >= 1)) { D.down = CPM8D.DOWN; cpEvent('m8down'); if (!D.said.down) { D.said.down = 1; cpSay('m8cox', 'Down she comes! The Light’s on the deck again!', 'cp_m08_30'); } } }
}
// Knock: frozen while one of you has him in sight, or a flare lights the deck; else on for the nearest of you
function cpm8dSees(x, y, h, K) { const dx = K.x - x, dy = K.y - y, d = Math.hypot(dx, dy); return d < CPM8D.KN_SEE && (d < 0.8 || Math.abs(angDiff(bearingOf(dx, dy), h)) < CPM8D.KN_FOV + Math.atan2(0.5, d)); }
function cpm8dKnock(dt) {
  const D = RAID.st.m8d, K = D.kn, P = ZM.players || [], m = FPS.me;
  if (K.fig) { K.mv = 0; return; }
  let seen = 0;
  if (!(m.dead > 0) && !zmIsDown() && !ZM.ghost && cpm8dSees(m.x, m.y, m.h, K)) seen++;
  if (ZM.net === 'host') for (const r of FPS.remote.values()) if (!r.dead && !r.down && !r.left && r.x != null && cpm8dSees(r.tx != null ? r.tx : r.x, r.ty != null ? r.ty : r.y, r.th != null ? r.th : r.h || 0, K)) seen++;
  if (gcFlares()) seen++;
  K.seen = seen; K.mv = 0;
  if (K.rest > 0) { K.rest -= dt; return; }
  if (seen || !P.length) return;
  let best = null, bd = 1e9; for (const p of P) { const d = Math.hypot(p.x - K.x, p.y - K.y); if (d < bd) { bd = d; best = p; } }
  if (!best) return;
  const want = bearingOf(best.x - K.x, best.y - K.y), s = Math.min(bd, CPM8D.KN_SP * dt);
  K.h += angDiff(want, K.h) * Math.min(1, dt * 6);
  const x0 = K.x, y0 = K.y;
  for (const dh of [0, 0.6, -0.6, 1.2, -1.2]) { const a = want + dh, nx = K.x + Math.sin(a) * s, ny = K.y + Math.cos(a) * s; if (gcInside(nx - FPSC.CX, ny - FPSC.CY, 0.3)) { K.x = nx; K.y = ny; break; } }
  K.jz = gcDeckZ(K.y - FPSC.CY); K.mv = Math.hypot(K.x - x0, K.y - y0) > 0.001 ? 1 : 0;
  if (bd < CPM8D.KN_REACH) { cpEvent('m8kn', best.sid); K.rest = CPM8D.KN_REST; const [kx, ky] = cpkW(...CPM8D.KNOCK); K.x = kx; K.y = ky; K.jz = GCC.FC; K.h = Math.PI; }
}
cpOn('m8kn', sid => {
  const D = RAID.st.m8d; if (!D) return;
  try { if (!soundOff()) sfxKnock(0, 1, 0.08); } catch (e) {}
  if (sid === FPS.me.id && !(FPS.me.dead > 0) && !zmIsDown()) {
    D.scare = SK.KNOCK_SCARE_TIME; try { if (!soundOff()) sfxKnockScare(); } catch (e) {}
    const m = FPS.me; m.iframe = 0; fpsHurt(gcHalf()); FPS.hurtT = 0.9; D.kb = [Math.sin(m.h + Math.PI) * 9, Math.cos(m.h + Math.PI) * 9];
    fpsFeed('Knock reached you, and threw you down the deck. He’s gone back to her bow.');
  } else fpsFeed(`Knock reached ${gwsNick(sid)}. He’s gone back to her bow, for now.`);
});
cpOn('m8kbell', () => fpsFeed('At the bell Knock stops dead where he stands, like the carving he is.'));
cpOn('m8crane', () => { if (typeof raidRespawn === 'function') raidRespawn(); ZM.banner = { text: 'Captain Absalom Crane', t: 4.5, col: '#c8e0d0', sub: 'by flarelight: his black sail is up · cut its halyards on the port rail' }; });
cpOn('m8hal', i => { try { const [x, y] = cpkW(...CPM8D.HAL[clamp(i | 0, 0, 1)]); if (!soundOff() && !sfxPlay('halyard', { vol: 0.9, pan: fpsEar(x, y), out: true })) { noise('bandpass', 1800, 2, 0.002, 0.25, 0.4); tone(90, 'sine', 0.01, 0.3, 0.3, { to: 50 }); } } catch (e) {} fpsFeed(`The ${i ? 'forward' : 'after'} halyard parts with a crack.`); });
cpOn('m8down', () => { try { if (!soundOff()) sfxSplash(0, 0.7); } catch (e) {} ZM.banner = { text: 'The black sail comes down', t: 3.4, small: true, col: '#ffe0a0', sub: 'the Light’s beam crosses the deck again · shoot when it’s on him' }; });
cpOn('m8maren', () => { if (typeof raidRespawn === 'function') raidRespawn(); ZM.banner = { text: 'Her lantern', t: 4, col: '#ffd890', sub: 'the black sail burns · her lantern lights him on the port side' }; });

// ---------- everyone ----------
function cpm8dMe(dt) {
  const S = RAID.st, D = S.m8d, m = FPS.me; if (!D || !GCW.on) return;
  const K = D.kn;
  if (ZM.net === 'client') { const k = Math.min(1, dt * 12); K.x += (K.tx - K.x) * k; K.y += (K.ty - K.y) * k; K.h += angDiff(K.th || 0, K.h) * k; K.jz = gcDeckZ(K.y - FPSC.CY); if (D.down > 0) D.down = Math.max(0, D.down - dt); }
  // the light, by this part's say, for the HUD and his bar
  GCW.lit = cpm8dLit();
  if (D.scare > 0) D.scare -= dt;
  if (Math.hypot(D.kb[0], D.kb[1]) > 0.1) { zmMove(m, D.kb[0] * dt, D.kb[1] * dt); const k = Math.exp(-dt * 3.2); D.kb[0] *= k; D.kb[1] *= k; } else D.kb = [0, 0];
  // his knocks on wood, three, while he moves (nearer, quicker)
  D.warnT = (D.warnT || 0) - dt;
  if (K.mv && !K.fig) { const kd = Math.hypot(K.x - m.x, K.y - m.y); if (kd < 30 && D.warnT <= 0) { const k = 1 - kd / 30; try { if (!soundOff()) sfxKnock(fpsEar(K.x, K.y), 0.3 + 0.7 * k, 0.26 - 0.16 * k); } catch (e) {} D.warnT = 0.8 + 2.4 * (1 - k); D.knockT = 1.4; } }
  if (D.knockT > 0) D.knockT -= dt;
  // holding Use at a halyard: a cut every quarter second (the host counts them)
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near, alive = !(m.dead > 0) && !zmIsDown() && !ZM.ghost;
  if (hold && o && o.k === 'm8hal' && alive && cpm8dHalOk()) { D.holdT += dt; if (D.holdT >= 0.25) { D.holdT -= 0.25; raidAsk('m8hal', o.i); try { if (!soundOff()) noise('bandpass', 2600, 3, 0.002, 0.06, 0.12); } catch (e) {} } } else D.holdT = 0;
}
function cpm8dHud(phone, mono, fell, G0) {
  const S = RAID.st, D = S.m8d, m = FPS.me; if (!D) return;
  const L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 46), dy = phone ? 14 : 17, t = g.t;
  if (D.ph === 'bosun' || D.ph === 'crane0') {
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
    ctx.font = fell(phone ? 15 : 20); ctx.fillStyle = 'rgba(220,200,160,0.95)'; ctx.fillText('Put down the Bosun', L, top, W * 0.5);
    ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(236,228,207,0.75)'; ctx.fillText('and keep Knock, at her bow, in someone’s sight', L, top + (phone ? 20 : 26), W * 0.5);
    ctx.fillText(`${GCW.bell > 0 ? '◦' : '•'} The ship’s bell (freezes Knock): ${GCW.bell > 0 ? Math.ceil(GCW.bell) + ' s' : 'ready'}`, L, top + (phone ? 20 : 26) + dy, W * 0.5);
    GC_LOCK.forEach(([, , side], i) => { const f = GCW.fl[i]; ctx.fillText(`${f.cd > 0 ? '◦' : '•'} Flare locker, ${side}: ${gcFlareOn(i) ? 'burning' : f.cd > 0 ? Math.ceil(f.cd) + ' s' : 'ready (a flare holds Knock too)'}`, L, top + (phone ? 20 : 26) + dy * (2 + i), W * 0.5); });
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    fpsHudNote(top + (phone ? 20 : 26) + dy * 4 + 4);
    // Knock: moving, or held
    const K = D.kn, yk = H - (phone ? 150 : 100); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!K.fig && !(m.dead > 0)) {
      if (K.mv) { const p = 0.6 + 0.4 * Math.sin(t * 9); ctx.font = fell(phone ? 18 : 24); ctx.fillStyle = `rgba(255,${120 + 40 * p | 0},70,${0.7 + 0.3 * p})`; ctx.fillText('KNOCK IS MOVING', cx, yk); }
      else if (K.rest > 0) { ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(200,190,170,0.6)'; ctx.fillText('KNOCK IS STILL · FOR NOW', cx, yk); }
      else if (K.seen) { ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(170,220,200,0.8)'; ctx.fillText('KNOCK IS STILL · HELD IN SIGHT', cx, yk); }
      if (D.knockT > 0) { const a = angDiff(bearingOf(K.x - m.x, K.y - m.y), m.h), r = phone ? 70 : 96, k = Math.min(1, D.knockT / 0.6); ctx.save(); ctx.translate(cx, H / 2); ctx.rotate(a); ctx.globalAlpha = 0.85 * k; ctx.fillStyle = '#ffb070'; ctx.beginPath(); ctx.moveTo(0, -r - 16); ctx.lineTo(-10, -r); ctx.lineTo(10, -r); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = `rgba(255,190,130,${0.8 * k})`; ctx.fillText('KNOCK · KNOCK · KNOCK', cx, H / 2 + r + 18); }
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  } else {
    // the Quarterdeck's own, with the beam's lines when the sail's down
    const p2 = GCW.p2; if ((GCW.sail || 0) < 0.5) GCW.p2 = 0;
    G0.hud(phone, mono, fell); GCW.p2 = p2;
    if (D.ph === 'crane' && GCW.st === 'fight') {
      const yy = top + (phone ? 20 : 26) + dy * 5 + 6; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 12); ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
      if (D.down > 0) { ctx.fillStyle = 'rgba(255,214,140,0.9)'; ctx.fillText(`The black sail is down: ${Math.ceil(D.down)} s till he hauls it up`, L, yy, W * 0.5); }
      else if ((GCW.sail || 0) > 0.9) { ctx.fillStyle = 'rgba(255,190,150,0.9)'; ctx.fillText(`Halyards on the port rail: ${D.hal.map((h, i) => (i ? 'forward ' : 'after ') + (h >= 1 ? 'cut' : Math.round(h * 100) + '%')).join(' · ')}`, L, yy, W * 0.5); }
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; fpsHudNote(yy + dy + 4);
    }
    if (D.ph === 'maren' && GCW.st === 'fight') { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(255,220,150,0.9)'; ctx.fillText('Her lantern lights him whenever he stands on the port side', L, top + (phone ? 20 : 26) + dy * 5 + 6, W * 0.5); }
    const o = ZM.near;
    if (o && o.k === 'm8hal') { const k = clamp(D.hal[o.i] || 0, 0, 1); ctx.strokeStyle = 'rgba(255,190,150,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke(); ctx.strokeStyle = '#ffb890'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke(); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  if (D.scare > 0) { ctx.save(); drawKnockScare(SK.KNOCK_SCARE_TIME - D.scare); ctx.restore(); }
}

// ---------- in 3D: Knock, the halyards, her skiff under the port rail ----------
const CPM8D3 = { on: false };
function cpm8d3dBuild(grp) {
  const T = CPM8D3; T.on = true; T.kn = null;
  if (typeof rfBuildKnock === 'function') { const M = rfBuildKnock(); M.body.scale.setScalar(KN.S); grp.add(M.root); M.wood.color.setScalar(0.62); M.limbM.color.multiplyScalar(0.7); T.kn = M; T.ph = 0; }
  // the halyards: a line from each belaying pin on the port rail up to the black sail's yard, cut away once cut
  const rope = new THREE.LineBasicMaterial({ color: 0x8a7650 }), G0 = FPSC.GROUND;
  T.hal = CPM8D.HAL.map(([x0, y0]) => { const [x, y] = cpkW(x0, y0), geo = new THREE.BufferGeometry().setFromPoints([z3v(x, y, G0 + 1.2), z3v(x - 1.35, y, G0 + 17.5)]), l = new THREE.Line(geo, rope); grp.add(l); const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), z3Lam('#6a5a40')); pin.position.copy(z3v(x, y, G0 + 1.2)); grp.add(pin); return l; });
  // her skiff, alongside to port, her lantern lifted (shown from the cinematic on)
  const soft = z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'), glowSp = (c, s, o) => { const g0 = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o && o.opacity != null ? o.opacity : 0.7 })); g0.scale.setScalar(s); return g0; };
  T.sk = cpm8Skiff(c => z3Lam(c), glowSp); const [sx, sy] = cpkW(-9.5, 2); T.sk.S.position.copy(z3v(sx, sy, G0 - GCC.FB - 0.2)); T.sk.S.visible = false; grp.add(T.sk.S);
  T.mar = typeof cpm5MarenActor === 'function' ? cpm5MarenActor(T.sk.S, 1.7) : null; if (T.mar) T.mar.P.position.set(0, 0.35, 0.6);
  T.burn = glowSp(0xff8a3a, 14, { opacity: 0 }); { const [x, y] = cpkW(-5.6, 3.5); T.burn.position.copy(z3v(x, y, G0 + 8)); } grp.add(T.burn);
}
function cpm8d3d(dt) {
  const T = CPM8D3, D = RAID.st.m8d; if (!T.on || !D) return;
  const K = D.kn, M = T.kn, t = g.t, G0 = FPSC.GROUND;
  if (M) {
    M.root.position.copy(z3v(K.x, K.y, G0 + (K.jz || 0))); M.root.rotation.set(0, -K.h, 0);
    if (K.mv) T.ph += dt * 4.2; const st = Math.sin(T.ph);
    M.torso.rotation.set(-0.08, Math.sin(T.ph) * 0.07, 0);
    for (const [i, A] of [[0.25 - st * 0.35, 0.18, 0.3], [st * 0.45, -0.18, 0.35]].entries()) { M.arms[i].sh.rotation.set(A[0], 0, A[1]); M.arms[i].el.rotation.set(A[2], 0, 0); }
    for (const [i, A] of [[st * 0.5, Math.max(0, -st) * 0.7], [-st * 0.5, Math.max(0, st) * 0.7]].entries()) { M.legs[i].hp.rotation.set(-A[0], 0, 0); M.legs[i].kn.rotation.set(A[1], 0, 0); M.legs[i].ft.rotation.set(-A[0] + A[1] * 0.4, 0, 0); }
    if (M.bat) M.bat.rotation.set(0.4, 0, -0.6);
    const m = FPS.me, d = angDiff(bearingOf(m.x - K.x, m.y - K.y), K.h), ex = clamp(d, -1.2, 1.2) * 0.009; for (const e of M.eyes) e.ir.position.set(Math.abs(d) < 2 ? ex : 0, 0, -0.021);
  }
  const sailUp = (GCW.sail || 0) > 0.5; T.hal.forEach((l, i) => { l.visible = sailUp && (D.hal[i] || 0) < 1 && D.ph !== 'maren'; });
  const mar = D.ph === 'maren' || D.ph === 'maren0';
  T.sk.S.visible = mar; if (mar) { T.sk.S.position.y = G0 - GCC.FB - 0.2 + Math.sin(t * 1.1) * 0.08; const f = 0.85 + 0.15 * Math.sin(t * 9); T.sk.halo.material.opacity = 0.8 * f; T.sk.light.intensity = 2 * f; T.sk.big.material.opacity = 0.3; }
  T.burnK = D.ph === 'maren' ? Math.min(1, (T.burnK || 0) + dt / 1.5) * 1 : 0; T.burn.material.opacity = D.ph === 'maren' ? Math.max(0, 0.7 - (T.burnK || 0) * 0.5) * (0.8 + 0.2 * Math.sin(t * 13)) : 0;
}
