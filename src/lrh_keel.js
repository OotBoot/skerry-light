'use strict';
// The Lamp Road: Keel, the Shipwright, a tank. A broad shipwright from the slipway: a riveting gun that sprays nails, a
// great tarred plank held up before him, a shoulder-first bound off the slipway, a slap of hot pitch that shields him
// and those near him, and Launching Day, when the chocks are knocked out and he slides down the ways with a hull's
// weight behind him. His kit (the play, on the host unless said), his bot, his crosshair, his sounds and events, and
// (below) his art: the figure, the gun and the plank in first person, the plank set up, his effects. A hero file as the
// guide at the top of src/lr.js has it.

// ---------- the play ----------
const LRH_KEEL = { pW: 1.8, pH: 2.2, pD: 1.2, pHp: 900, pBack: 90, pWait: 2, nails: 8, nail: 6.5, spread: 0.05, lnV: 15, lnT: 0.6, ldV: 17, ldT: 0.85 };
function lrhKeelPlank(p) { for (const w of LRM.walls) if (w.k === 'keelplank' && w.owner === p.i) return w; return null; }
// the plank stood before him, square to his look (a little further while he's going fast, so he never runs into it)
function lrhKeelPlace(p, w) {
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), ahead = Math.max(0, p.vx * fx + p.vz * fz) * 0.04;
  const d = lrClamp(lrRay(p.x, p.y + 1.0, p.z, fx, 0, fz, LRH_KEEL.pD + 0.6) - 0.35, 0.95, LRH_KEEL.pD) + ahead;
  w.x = p.x + fx * d; w.z = p.z + fz * d; w.y = p.y - 0.05; w.yaw = p.yaw;
}
const lrhKeelHolding = (p, I) => I.alt && p.cd.alt <= 0 && (p.pkHp == null || p.pkHp > 1);
// a nail's damage at range t: full to 10 m, a third of it by 25
const lrhKeelFall = t => t <= 10 ? 1 : t >= 25 ? 0.35 : 1 - 0.65 * (t - 10) / 15;
// the bodies he meets while he bounds (Launch) or slides (Launching Day): on the host, each tick either runs
function lrhKeelRam(p) {
  const fwd = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)];
  if (p.act.k === 'a1' && p.act.t < LRH_KEEL.lnT + 0.05 && !p.lnHit) {
    const [fx, fz] = fwd(p.lnYaw == null ? p.yaw : p.lnYaw);
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > p.r + q.r + 0.45 || Math.abs(q.y - p.y) > 2) continue;
      p.lnHit = true; lrHurt(q, 30, p, 'launch');
      const sd = (dx * -fz + dz * fx) >= 0 ? 1 : -1; lrKnock(q, -fz * sd * 6 + fx * 4, 3, fx * sd * 6 + fz * 4, 0.3); lrStun(q, 0.6, p);
      lrKnock(p, -fx * 2, 2.5, -fz * 2, 0.2);    // (he rebounds: which ends the bound wherever he's moved)
      lrFxPush('launchhit', { x: q.x, y: q.y + 1.2, z: q.z, v: p.i, team: p.team });
      break;
    }
  }
  if (p.act.k === 'ult' && p.act.t < LRH_KEEL.ldT + 0.15) {
    const [fx, fz] = fwd(p.ldYaw == null ? p.yaw : p.ldYaw), hit = p.ldHit || (p.ldHit = []);
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team || hit.includes(q.i)) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > p.r + q.r + 0.9 || Math.abs(q.y - p.y) > 2.5) continue;
      hit.push(q.i); lrHurt(q, 140, p, 'launchday');
      if (q.alive) { const sd = (dx * -fz + dz * fx) >= 0 ? 1 : -1; lrKnock(q, -fz * sd * 7 + fx * 6, 5.5, fx * sd * 7 + fz * 6, 0.45); lrStun(q, 1.4, p); }
    }
    for (const w of LRM.walls) { if (w.team === p.team || hit.includes('w' + w.id)) continue; if (Math.hypot(w.x - p.x, w.z - p.z) < 2.2) { hit.push('w' + w.id); lrWallHurt(w, 250, p); } }
  }
}
lrDefHero({
  id: 'keel', n: 'Keel', title: 'The Shipwright', role: 'tank', hp: 525, spd: 5.0, r: 0.6, h: 2.1, mag: 10, reloadT: 2, ultCost: 1600,
  cd: { a1: 7, a2: 11, alt: 4 }, range: 18, botClose: 9, actT: { a1: 0.6, a2: 0.6, ult: 1.1 }, own: ['a1'], stepVol: 1.4,
  blurb: 'A broad shipwright off the slipway with a riveting gun and a great tarred plank. He builds a wall and drives it in.',
  kit: {
    pri: ['Nail Gun', 'A spray of eight nails: hard close in, weaker past 10 m.', 'Nails'],
    alt: ['Plank Shield', 'Hold to raise the plank before you: it stops shots from the front. Slower, and no nailing, while it’s up.', 'Plank'],
    a1: ['Launch', 'Bound shoulder-first 9 m: the first enemy you meet is hurt, knocked aside and stunned.', 'Launch'],
    a2: ['Caulk', 'Slap hot pitch on yourself and allies within 6 m: 120 overhealth for 5 s.', 'Caulk'],
    ult: ['Launching Day', 'Knock out the chocks and slide 14 m: everyone in your way is hurt and knocked flat.', 'Launch!'],
  },
  how: { nails: 'Nail Gun', launch: 'Launch', launchday: 'Launching Day' },
  reset(p) {
    p.pkHp = LRH_KEEL.pHp; p.pkBroke = false; p.pkDown = 9; p.caulk = null; p.lnHit = true; p.ldOn = false;
    if (LRM.walls.some(w => w.k === 'keelplank' && w.owner === p.i)) LRM.walls = LRM.walls.filter(w => !(w.k === 'keelplank' && w.owner === p.i));
  },
  // the Nail Gun: eight nails in a small cone, each its own line, added up for each body they find (half again to the head)
  fire(p, dt, I, H) {
    if (!(I.fire && p.fireT >= 0.6 && p.ammo > 0 && p.reload <= 0) || lrhKeelHolding(p, I)) return;
    p.fireT = 0; p.ammo--;
    const ey = p.y + lrEyeH(p), got = {}, walls = new Map(), c = lrDir(p.yaw, p.pitch), mid = lrRayHit(p.x, ey, p.z, c[0], c[1], c[2], { team: p.team, skip: p.i, max: 40 });
    for (let k = 0; k < LRH_KEEL.nails; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * LRH_KEEL.spread, d = lrDir(p.yaw + Math.cos(a) * r, p.pitch + Math.sin(a) * r);
      const h = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, max: 40 });
      if (h.p) { const g = got[h.p.i] || (got[h.p.i] = { n: 0, head: false }); g.n += LRH_KEEL.nail * lrhKeelFall(h.t) * (h.head ? 1.5 : 1); g.head = g.head || h.head; }
      else if (h.wall) walls.set(h.wall, (walls.get(h.wall) || 0) + LRH_KEEL.nail);
    }
    lrFxPush('nails', { x: p.x, y: ey - 0.2, z: p.z, x2: mid.x, y2: mid.y, z2: mid.z, yaw: p.yaw, pitch: p.pitch, team: p.team, v: p.i, a: p.i });
    for (const i in got) lrHurt(LRM.P[i], got[i].n, p, 'nails', got[i].head);
    for (const [w, n] of walls) lrWallHurt(w, n, p);
  },
  // the Plank Shield: up while the button is, before him; it mends 90 a second once it's been down two seconds; broken,
  // it's four seconds coming back (the wall's gone hook), at half
  alt(p, dt, I, H) {
    let w = lrhKeelPlank(p);
    if (p.pkBroke && p.cd.alt <= 0) { p.pkBroke = false; p.pkHp = Math.max(p.pkHp, LRH_KEEL.pHp / 2); }
    if (lrhKeelHolding(p, I)) {
      if (!w) { w = lrAddWall(p, 'keelplank', p.x, p.y, p.z, p.yaw, p.pkHp, 0.25); p.act = { k: 'alt', t: 0 }; lrFxPush('plankup', { x: p.x, y: p.y + 1.1, z: p.z, v: p.i }); }
      lrhKeelPlace(p, w); w.t = 0.25; p.pkHp = w.hp; p.pkDown = 0;
    } else if (w) { if (w.hp > 0) { p.pkHp = w.hp; LRM.walls = LRM.walls.filter(o => o !== w); } }
    else { p.pkDown += dt; if (p.pkDown >= LRH_KEEL.pWait) p.pkHp = Math.min(LRH_KEEL.pHp, p.pkHp + LRH_KEEL.pBack * dt); }
  },
  // (Launch itself starts in body, wherever he's moved; here, on the host, what he meets while he bounds or slides)
  a1(p) { lrhKeelRam(p); },
  // Caulk: hot pitch on himself and every ally within 6 m: 120 overhealth that holds for five seconds
  a2(p, dt, I, H) {
    if (!(I.a2 && p.cd.a2 <= 0)) return;
    const vs = lrAlliesIn(p, p.x, p.z, 6).filter(q => Math.abs(q.y - p.y) < 3).map(q => q.i);
    for (const i of vs) lrShield(LRM.P[i], 120, p, 120);
    p.caulk = { t: 5, vs }; p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 };
    lrFxPush('caulk', { x: p.x, y: p.y + 1.2, z: p.z, v: p.i, team: p.team, vs });
  },
  // Launching Day: the slide is his body's (move, wherever he's moved); here its start
  ult(p) { p.ldYaw = p.yaw; p.ldOn = true; p.ldHit = []; lrFxPush('launchday', { x: p.x, y: p.y, z: p.z, yaw: p.yaw, v: p.i, team: p.team }); },
  // the pitch holds while its five seconds last (it doesn't fade as overhealth else does), then what's left of it goes
  tick(p, dt) {
    const C = p.caulk; if (!C || !lrHost()) return;
    C.t -= dt;
    for (const i of C.vs) { const q = LRM.P[i]; if (!q || !q.alive) continue; if (C.t > 0) { if (q.oh > 0 && q.oh < 120) q.oh = Math.min(120, q.oh + LR_OH_DECAY * dt); } else q.oh = Math.max(0, q.oh - 120); }
    if (C.t <= 0) p.caulk = null;
  },
  // (wherever he's moved) slower behind the plank; Launch's bound and Launching Day's slide; the plank kept before him
  speed: (p, I) => lrhKeelHolding(p, I) ? 0.7 : 1,
  body(p, dt, I, H) {
    if (!(I.a1 && p.cd.a1 <= 0 && p.act.k !== 'a1' && p.act.k !== 'ult')) return;
    p.act = { k: 'a1', t: 0 }; p.cd.a1 = H.cd.a1; p.lnYaw = p.yaw; p.lnHit = false; p.vy = 4.5; p.gnd = false;
    lrFxPush('launch', { x: p.x, y: p.y, z: p.z, yaw: p.yaw, v: p.i, team: p.team });
  },
  move(p) {
    const w = lrhKeelPlank(p); if (w) lrhKeelPlace(p, w);
    if (p.act.k === 'a1' && p.act.t < LRH_KEEL.lnT && !p.lnHit) {
      if (p.knockT > 0 && p.act.t > 0.05) { p.lnHit = true; return false; }
      p.vx = -Math.sin(p.lnYaw) * LRH_KEEL.lnV; p.vz = -Math.cos(p.lnYaw) * LRH_KEEL.lnV; return true;
    }
    if (p.act.k === 'ult' && p.act.t < LRH_KEEL.ldT) {
      if (!p.ldOn) { p.ldOn = true; p.ldYaw = p.yaw; }
      p.vx = -Math.sin(p.ldYaw) * LRH_KEEL.ldV; p.vz = -Math.cos(p.ldYaw) * LRH_KEEL.ldV; return true;
    }
    p.ldOn = false; return false;
  },
  // online: a guest's own bound, seen there at once, and the host told of it; a guest's own nails
  ownUse(p, k) { if (k === 'a1') lrLocalFx({ k: 'launch', x: p.x, y: p.y, z: p.z, yaw: p.yaw, v: p.i, team: p.team }); },
  ownHost(p, k, u) { p.lnYaw = lrAng(u[5]); p.lnHit = false; lrFxPush('launch', { x: u[2], y: u[3], z: u[4], yaw: p.lnYaw, v: p.i, team: p.team }); },
  guestFire(p, I, H, ey) {
    if (!(I.fire && p.fireT >= 0.6 && p.ammo > 0 && p.reload <= 0) || lrhKeelHolding(p, I)) return;
    p.fireT = 0; p.ammo--; LRM.shotAt = performance.now();
    const c = lrDir(p.yaw, p.pitch), h = lrRayHit(p.x, ey, p.z, c[0], c[1], c[2], { team: p.team, skip: p.i, max: 40 });
    lrLocalFx({ k: 'nails', x: p.x, y: ey - 0.2, z: p.z, x2: h.x, y2: h.y, z2: h.z, yaw: p.yaw, pitch: p.pitch, team: p.team, v: p.i, a: p.i });
  },
  // the plank's health, for a guest's crosshair (nothing while it's whole)
  snap: p => p.pkHp < LRH_KEEL.pHp - 0.5 ? [Math.round(Math.max(0, p.pkHp))] : 0,
  unsnap(p, x) { p.pkHp = x.length ? x[0] : LRH_KEEL.pHp; },
  abil(p, k) { return { on: (k === 'alt' && !!lrhKeelPlank(p)) || (k === 'a2' && !!p.caulk) }; },
  // the bot: Launching Day down a line of them, Caulk when he or those round him are hurt, Launch into someone close
  // ahead, the plank up a while when he's taking it from range
  bot(p, ai, B) {
    const { S, I, tg, hpF, hurt, foes, pals, C, at, mode } = B, yawTo = q => Math.atan2(-(q.x - p.x), -(q.z - p.z));
    if (p.ult >= 1 && tg && ai.tgtD < 12) {
      const y = yawTo(tg), fx = -Math.sin(y), fz = -Math.cos(y);
      const n = foes.filter(f => { const ox = f.q.x - p.x, oz = f.q.z - p.z, al = ox * fx + oz * fz; return al > 0 && al < 14 && Math.abs(ox * fz - oz * fx) < 1.8; }).length;
      if (n >= S.clump || (n >= 2 && Math.hypot(tg.x - C.x, tg.z - C.z) < 7) || (tg.hp < 150 && LR_HEROES[tg.hero].role !== 'tank')) { mode({ at: at(tg), press: 'ult', pressAt: LRM.t + 0.15 }); return; }
    }
    if (p.cd.a2 <= 0) { const n = pals.filter(f => f.d < 5.5 && f.q.hp / f.q.maxHp < 0.75).length; if ((hurt && hpF < 0.7) || n >= 2 || (n >= 1 && hurt)) { I.a2 = true; return; } }
    if (p.cd.a1 <= 0 && tg && ai.tgtD > 3.5 && ai.tgtD < 9 && !ai.retreat) { mode({ at: at(tg), press: 'a1', pressAt: LRM.t + 0.15 }); return; }
    if (p.cd.alt <= 0 && tg && hurt && ai.tgtD > 10 && p.pkHp > 300 && hpF < 0.9) mode({ at: at(tg), press: 'alt', pressAt: LRM.t, once: false, until: LRM.t + 1.2 + Math.random() * 1.3 });
  },
  // his crosshair: a ring as wide as his nails spread, and the plank's health beneath while it's up or hurt
  cross(c, cx, cy, me) {
    c.beginPath(); c.arc(cx, cy, 24, 0, 7); c.stroke(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(cx + dx * 20, cy + dy * 20); c.lineTo(cx + dx * 28, cy + dy * 28); c.stroke(); }
    c.beginPath(); c.arc(cx, cy, 1.8, 0, 7); c.fill();
    const f = lrClamp((me.pkHp == null ? LRH_KEEL.pHp : me.pkHp) / LRH_KEEL.pHp, 0, 1), up = !!lrhKeelPlank(me);
    if (up || f < 0.999) { const w = 70, y = cy + 36; c.save(); c.globalAlpha = up ? 0.9 : 0.5; c.strokeRect(cx - w / 2, y, w, 6); c.fillRect(cx - w / 2 + 1, y + 1, (w - 2) * f, 4); c.restore(); }
  },
});
// the plank: when it's broken his four seconds start; when it's only lowered (or he was stunned holding it) it keeps its health
lrDefWall('keelplank', { w: LRH_KEEL.pW, h: LRH_KEEL.pH, gone(w, o) { if (!o || o.hero !== 'keel') return; if (w.hp > 0) { o.pkHp = w.hp; return; } o.pkHp = 0; o.pkBroke = true; o.pkDown = 0; o.cd.alt = LR_HEROES.keel.cd.alt; } });
lrDefEvent('nails', { own: true, sound: (f, at, me, mine) => at('keelnails', mine ? 1 : 0.85) });
lrDefEvent('plankup', { sound: (f, at) => at('keelplank') });
lrDefEvent('launch', { own: true, sound: (f, at) => at('keellaunch') });
lrDefEvent('launchhit', { sound: (f, at) => at('keelthump') });
lrDefEvent('caulk', { sound: (f, at) => at('keelcaulk') });
lrDefEvent('launchday', { sound: (f, at) => at('keelways', 1.4), shake: (f, me) => Math.hypot(f.x - me.x, f.z - me.z) < 16 ? 0.45 : 0 });
lrDefSnd('keelnails', (v, e, rec, o) => { if (!rec('pepperbox', 0.5 * v, { rate: 1.7 })) noise('highpass', 1800, 1, 0.001, 0.35 * v, 0.08, o); for (let k = 0; k < 3; k++) tone(1800 + k * 300, 'square', 0.001, 0.04 * v, 0.03, { delay: 0.015 * k, pan: e.pan }); noise('lowpass', 900, 1, 0.001, 0.25 * v, 0.1, o); });
lrDefSnd('keelplank', (v, e, rec, o) => { if (!rec('board', 0.8 * v)) noise('lowpass', 300, 1, 0.001, 0.4 * v, 0.2, o); tone(110, 'triangle', 0.001, 0.15 * v, 0.15, { pan: e.pan }); });
lrDefSnd('keellaunch', (v, e, rec, o) => { if (!rec('charge', 0.7 * v, { rate: 1.25 })) noise('lowpass', 400, 1, 0.03, 0.35 * v, 0.4, o); });
lrDefSnd('keelthump', (v, e, rec, o) => { if (!rec('slam', 0.8 * v, { rate: 1.2 })) noise('lowpass', 260, 1, 0.001, 0.5 * v, 0.3, o); tone(80, 'sine', 0.001, 0.3 * v, 0.25, { pan: e.pan }); });
lrDefSnd('keelcaulk', (v, e, rec, o) => { if (!rec('splat', 0.8 * v)) noise('lowpass', 500, 0.8, 0.002, 0.45 * v, 0.35, o); if (!rec('steam', 0.35 * v, { delay: 0.05 })) noise('highpass', 3000, 0.7, 0.05, 0.12 * v, 0.6, o); });
lrDefSnd('keelways', (v, e, rec, o) => { if (!rec('keelback', 1 * v)) noise('lowpass', 200, 0.8, 0.05, 0.6 * v, 1.1, o); if (!rec('creak', 0.7 * v, { delay: 0.1 })) tone(70, 'sawtooth', 0.05, 0.25 * v, 0.9, { to: 45, pan: e.pan }); rec('chock', 0.8 * v); });

// ---------- the art ----------
// (built from src/lrhero.js's rig and batch helpers: lrhRig, lrhLegs, lrhArms, lrhBase, lrhDead, lrhHands, lrBatch)
const LRH_PITCH = 0x1e1812;
// the plank: boards of tarred oak side by side, caulked seams, iron bands riveted across, a roundel of the crew's
// colours, a peep slit, into batch L; w by h, t thick, centred at its bottom middle, its face towards -z
function lrhKeelPlankParts(L, TC, w, h, t, slit) {
  const n = 4, bw = w / n;
  for (let i = 0; i < n; i++) L.add('box', [0x3a2c20, 0x33271c, 0x3e3024, 0x30251a][i], -w / 2 + bw * (i + 0.5), h / 2, 0, 0, 0, 0, bw - 0.012, h - (i % 2) * 0.04, t);
  for (let i = 1; i < n; i++) L.add('box', 0x6a5a40, -w / 2 + bw * i, h / 2, -t / 2 - 0.004, 0, 0, 0, 0.012, h * 0.98, 0.01);
  for (const y of [0.16, 0.5, 0.84]) {
    L.add('box', LRH_IRON, 0, h * y, -t / 2 - 0.012, 0, 0, 0, w + 0.03, h * 0.055, 0.02); L.add('box', LRH_IRON, 0, h * y, t / 2 + 0.012, 0, 0, 0, w + 0.03, h * 0.055, 0.02);
    for (let i = 0; i < 8; i++) L.add('sph:4', 0x8a8c90, -w / 2 + w * (i + 0.5) / 8, h * y, -t / 2 - 0.025, 0, 0, 0, Math.min(0.03, w * 0.012));
  }
  L.add('box', TC.main, -w / 2 + 0.02, h / 2, -t / 2 - 0.01, 0, 0, 0, 0.04, h, 0.012); L.add('box', TC.main, w / 2 - 0.02, h / 2, -t / 2 - 0.01, 0, 0, 0, 0.04, h, 0.012);
  L.add('cyl:16', TC.main, 0, h * 0.62, -t / 2 - 0.02, Math.PI / 2, 0, 0, w * 0.2, 0.02, w * 0.2);
  L.add('cyl:16', TC.trim, 0, h * 0.62, -t / 2 - 0.03, Math.PI / 2, 0, 0, w * 0.13, 0.02, w * 0.13);
  L.add('box', TC.main, 0, h * 0.62, -t / 2 - 0.04, 0, 0, Math.PI / 4, w * 0.06, w * 0.24, 0.012); L.add('box', TC.main, 0, h * 0.62, -t / 2 - 0.04, 0, 0, -Math.PI / 4, w * 0.06, w * 0.24, 0.012);
  if (slit) L.add('box', 0x0a0806, 0, h * 0.79, -t / 2 - 0.02, 0, 0, 0, w * 0.35, h * 0.025, 0.02);
}
// ---------- Keel: the shipwright in his smock, the plank on his back ----------
function lrhKeel(team) {
  const m = lrhRig('keel', team), TC = m.TC, t = m.team;
  const smock = t ? 0x553834 : 0x5a86b4, smock2 = t ? 0x40292a : 0x4a72a0, trou = t ? 0x2e2824 : 0x3a3a38, skin = 0xd09a78, leath = 0x5a3a22, boot = 0x2a2018;
  // the legs: canvas trousers, leather gaiters over stout boots
  lrhLegs(m, 0.2, 0.46, 0.45, (L, S, s, a, b) => {
    L.L.add('cyl:10:1.15', trou, 0, -a / 2, 0, 0, 0, 0, 0.14, a, 0.14);
    S.L.add('cyl:10:1.1', trou, 0, -b * 0.25, 0, 0, 0, 0, 0.12, b * 0.5, 0.12);
    S.L.add('cyl:10:1.05', leath, 0, -b * 0.62, 0, 0, 0, 0, 0.125, b * 0.5, 0.125);
    for (const y of [0.45, 0.62, 0.79]) S.L.add('box', LRH_BRASS, s * 0.12, -b * y, 0, 0, 0, 0, 0.02, 0.03, 0.04);
    S.L.add('box', boot, 0, -b + 0.05, -0.05, 0, 0, 0, 0.21, 0.12, 0.34);
    S.L.add('box', 0x141210, 0, -b, -0.05, 0, 0, 0, 0.22, 0.03, 0.36);
  });
  m.P(m.hips).L.add('cyl:12', trou, 0, -0.04, 0, 0, 0, 0, 0.34, 0.16, 0.27);
  m.spine = lrhNode(m.hips, 0, 0.07, 0, 'spine');
  const sp = m.P(m.spine);
  // the smock: broad canvas, a yoke across the shoulders, a deep pocket; the hem flares over the hips
  sp.L.add('cyl:14:0.95', smock, 0, 0.34, 0, 0, 0, 0, 0.42, 0.6, 0.31);
  sp.L.add('sph:14', smock, 0, 0.62, 0, 0, 0, 0, 0.42, 0.18, 0.3);
  sp.L.add('cyl:14:0.8', smock, 0, -0.08, 0, 0, 0, 0, 0.44, 0.24, 0.33);
  sp.L.add('box', smock2, 0, 0.56, -0.255, 0, 0, 0, 0.5, 0.12, 0.08);
  sp.L.add('box', smock2, 0.16, 0.3, -0.31, 0, 0, 0, 0.16, 0.14, 0.02);
  for (const s of [-1, 1]) sp.L.add('box', smock2, s * 0.43, 0.4, 0, 0, 0, s * 0.08, 0.02, 0.4, 0.28);
  // the neckerchief and its knot, in the crew's colour; a stripe of it on the smock's yoke
  sp.L.add('tor:12:0.4', TC.main, 0, 0.72, 0, Math.PI / 2, 0, 0, 0.16, 0.16, 0.12);
  sp.L.add('box', TC.main, 0.0, 0.62, -0.2, 0.2, 0, Math.PI / 4, 0.1, 0.1, 0.04); sp.L.add('cone:4', TC.main, 0.03, 0.5, -0.24, 0.25, 0, 0.2, 0.06, 0.16, 0.03);
  sp.L.add('box', TC.main, 0, 0.5, -0.3, 0, 0, 0, 0.52, 0.035, 0.02);
  // the tool belt: caulking irons, a mallet, a pouch of nails; the adze hung at his right hip
  sp.L.add('cyl:14', leath, 0, 0.02, 0, 0, 0, 0, 0.44, 0.08, 0.33);
  sp.L.add('box', LRH_BRASS, 0, 0.02, -0.33, 0, 0, 0, 0.09, 0.07, 0.02);
  for (let k = 0; k < 4; k++) { const a = -0.9 + k * 0.28, x = Math.sin(a) * 0.45, z = -Math.cos(a) * 0.34; sp.L.add('box', LRH_LEATH, x, -0.02, z, 0, -a, 0, 0.05, 0.12, 0.03); sp.L.add('box', 0x7a7c80, x, 0.08, z, 0, -a, 0, 0.03, 0.12, 0.012); sp.L.add('cyl:6', LRH_WOOD, x, -0.1, z, 0, 0, 0, 0.018, 0.1, 0.018); }
  sp.L.add('box', leath, -0.32, -0.06, -0.24, 0, 0.6, 0, 0.14, 0.14, 0.08);
  m.adze = lrhNode(m.spine, 0.44, -0.02, 0.08, 'adze'); m.adze.rotation.set(0.2, 0, 0.12);
  { const A = m.P(m.adze).L; A.add('cyl:6', LRH_WOOD, 0, -0.2, 0, 0, 0, 0, 0.025, 0.55, 0.025); A.add('box', LRH_IRON, 0, -0.48, -0.07, 0.5, 0, 0, 0.11, 0.04, 0.2); A.add('box', 0x9a9ca0, 0, -0.54, -0.17, 0.5, 0, 0, 0.12, 0.015, 0.03); }
  // the plank, slung on his back on a strap
  m.plankBack = lrhNode(m.spine, 0, -0.3, 0.37, 'plankBack'); m.plankBack.rotation.set(0.08, Math.PI, 0.1);
  lrhKeelPlankParts(m.P(m.plankBack).L, TC, 0.95, 1.4, 0.07, false);
  sp.L.add('box', leath, 0, 0.4, 0, 0, 0, 0.75, 0.06, 0.95, 0.66);
  // the head: broad and weathered, mutton-chop whiskers, a leather cap with a band of the crew's colour and a short peak
  m.head = lrhNode(m.spine, 0, 0.75, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('cyl:10', skin, 0, 0.0, 0, 0, 0, 0, 0.12, 0.12, 0.12);
  hd.L.add('sph:12', skin, 0, 0.15, -0.01, 0, 0, 0, 0.15, 0.16, 0.15);
  hd.L.add('box', skin, 0, 0.07, -0.07, 0, 0, 0, 0.22, 0.1, 0.15);
  for (const s of [-1, 1]) hd.L.add('box', 0x7a5030, s * 0.12, 0.08, -0.06, 0, s * 0.3, 0, 0.05, 0.14, 0.1);   // the whiskers
  hd.L.add('box', 0x7a5030, 0, 0.1, -0.15, 0, 0, 0, 0.12, 0.025, 0.02);
  hd.L.add('cone:4', 0xb88464, 0, 0.15, -0.165, -Math.PI / 2, Math.PI / 4, 0, 0.028, 0.06, 0.028);
  for (const s of [-1, 1]) hd.L.add('sph:5', 0x141010, s * 0.05, 0.18, -0.14, 0, 0, 0, 0.016);
  hd.L.add('box', 0x5a3a20, 0, 0.21, -0.14, 0, 0, 0, 0.19, 0.025, 0.02);
  hd.L.add('cyl:12:0.92', leath, 0, 0.29, 0.0, 0, 0, 0, 0.165, 0.12, 0.16);
  hd.L.add('cyl:12', TC.main, 0, 0.25, 0.0, 0, 0, 0, 0.17, 0.045, 0.165);
  hd.L.add('cyl:12', 0x4a2e18, 0, 0.35, 0.0, 0, 0, 0, 0.15, 0.025, 0.145);
  hd.L.add('box', 0x3a2414, 0, 0.235, -0.19, -0.25, 0, 0, 0.22, 0.02, 0.1);
  // the arms: smock sleeves rolled to the elbow, brawny forearms with leather bracers, big hands
  lrhArms(m, 0.47, 0.56, 0, 0.4, 0.4, (A, F, Hn, s, a, b) => {
    A.L.add('sph:10', smock, 0, -0.02, 0, 0, 0, 0, 0.16, 0.15, 0.16);
    A.L.add('cyl:10:1.1', smock, 0, -a / 2, 0, 0, 0, 0, 0.12, a, 0.12);
    A.L.add('cyl:10', smock2, 0, -a + 0.03, 0, 0, 0, 0, 0.135, 0.08, 0.135);
    F.L.add('cyl:10:0.8', skin, 0, -b * 0.3, 0, 0, 0, 0, 0.115, b * 0.6, 0.115);
    F.L.add('cyl:10:0.95', leath, 0, -b * 0.75, 0, 0, 0, 0, 0.105, b * 0.4, 0.105);
    F.L.add('cyl:10', TC.main, 0, -b * 0.58, 0, 0, 0, 0, 0.11, 0.03, 0.11);
    Hn.L.add('sph:8', skin, 0, -0.07, -0.01, 0, 0, 0, 0.085, 0.095, 0.08);
    Hn.L.add('box', 0xb88464, 0, -0.11, -0.055, 0, 0, 0, 0.13, 0.05, 0.05);
  });
  // the riveting gun in his right hand: an iron body, a brass drum of nails, a short flared barrel, a wooden grip
  m.gun = lrhNode(m.spine, 0.26, 0.22, -0.45, 'gun');
  { const G = m.P(m.gun); lrhKeelGunParts(G.L, G.G, TC, 1.25); }
  m.muzzle = lrhNode(m.gun, 0, 0.06, -0.52, 'muzzle');
  // the pitch pot (Caulk), in his left hand while he slaps it on
  m.pot = lrhNode(m.handL, 0, -0.12, 0, 'pot'); { const B = m.P(m.pot); B.L.add('cyl:10:1.15', 0x2a2420, 0, -0.08, 0, 0, 0, 0, 0.1, 0.16, 0.1); B.L.add('cyl:10', LRH_PITCH, 0, 0.0, 0, 0, 0, 0, 0.1, 0.02, 0.1); B.L.add('tor:8:0.15', LRH_IRON, 0, 0.04, 0, 0, Math.PI / 2, 0, 0.1); B.L.add('cyl:6', LRH_WOOD, 0.03, 0.06, 0, 0, 0, 0.3, 0.015, 0.18, 0.015); B.G.add('sph:6', 0xff8a30, 0, 0.01, 0, 0, 0, 0, 0.06, 0.012, 0.06); } m.pot.visible = false;
  m.anim = lrhAnimKeel;
  return m.finish();
}
// the gun, along its -z, its grip at the origin; s its scale (B the lit batch, G the glowing one)
function lrhKeelGunParts(B, G, TC, s) {
  B.add('cyl:6', LRH_WOOD, 0, -0.04 * s, 0.02 * s, -0.3, 0, 0, 0.03 * s, 0.14 * s, 0.035 * s);
  B.add('box', LRH_IRON, 0, 0.06 * s, -0.1 * s, 0, 0, 0, 0.09 * s, 0.11 * s, 0.3 * s);
  B.add('box', 0x2c2e32, 0, 0.12 * s, -0.1 * s, 0, 0, 0, 0.07 * s, 0.03 * s, 0.26 * s);
  B.add('cyl:12', LRH_BRASS, -0.075 * s, 0.07 * s, -0.08 * s, 0, 0, Math.PI / 2, 0.075 * s, 0.07 * s, 0.075 * s);
  B.add('cyl:12', 0x8a6a28, -0.115 * s, 0.07 * s, -0.08 * s, 0, 0, Math.PI / 2, 0.03 * s, 0.015 * s, 0.03 * s);
  B.add('cyl:8', LRH_IRON, 0, 0.05 * s, -0.31 * s, Math.PI / 2, 0, 0, 0.032 * s, 0.14 * s, 0.032 * s);
  B.add('cyl:8:0.6', 0x4a4c52, 0, 0.05 * s, -0.39 * s, Math.PI / 2, 0, 0, 0.045 * s, 0.05 * s, 0.045 * s);
  B.add('box', TC.main, 0, 0.06 * s, 0.0 * s, 0, 0, 0, 0.095 * s, 0.03 * s, 0.06 * s);
  B.add('cyl:6', 0x2a2420, 0.05 * s, 0.0, 0.08 * s, 0.4, 0, 0, 0.012 * s, 0.14 * s, 0.012 * s);   // the air hose
  G.add('cyl:8', 0xffa050, 0, 0.05 * s, -0.415 * s, Math.PI / 2, 0, 0, 0.018 * s, 0.005 * s, 0.018 * s);
}
function lrhAnimKeel(m, pose, dt) {
  lrhBase(m, pose, dt);
  const act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() });
  // ready: the gun held out at his right side along his look, his left hand under the barrel
  m.head.rotation.x += p * 0.45; m.spine.rotation.x += p * 0.1;
  const gun = m.gun; gun.position.set(0.27, 0.24 + p * 0.25, -0.46); gun.rotation.set(p * 0.9, 0, 0);
  m.plankBack.visible = true; m.pot.visible = false;
  // a shot kicks the gun up and back a touch; a reload, the drum turned up to his left hand
  const f = pose.fire != null && pose.fire >= 0 && pose.fire < 0.3 ? 1 - pose.fire / 0.3 : 0;
  if (f > 0) { gun.position.z += 0.07 * f; gun.position.y += 0.03 * f; gun.rotation.x += 0.35 * f; }
  let left = true;
  if (pose.reload > 0) { gun.position.set(0.2, 0.3, -0.36); gun.rotation.set(0.5, 0.3, 0.9); }
  if (pose.alt && k !== 'ult') { m.plankBack.visible = false; gun.position.set(0.36, 0.08, -0.3); gun.rotation.set(-0.6, 0, 0); left = false; m.spine.rotation.x -= 0.08; }
  let ql = 0, ql2 = 0, qu = 0;
  if (k === 'a1' && t < 0.65) {
    // Launch: bent low, left shoulder first, the gun tucked in, the knees drawn up in the air
    ql = lrhSm(0, 0.08, t) * (1 - lrhSm(0.5, 0.65, t));
    m.spine.rotation.x -= 0.55 * ql; m.spine.rotation.y -= 0.7 * ql; m.head.rotation.x += 0.45 * ql; m.head.rotation.y = 0.5 * ql;
    gun.position.lerp(V.c.set(0.2, 0.25, -0.22), ql); gun.rotation.x = lrhLerp(gun.rotation.x, -0.9, ql);
    m.legL.rotation.x += 0.6 * ql; m.shinL.rotation.x -= 0.9 * ql; m.legR.rotation.x -= 0.3 * ql;
  }
  if (k === 'a2' && t < 0.6) {
    // Caulk: the pitch pot swung up and slapped round
    ql2 = lrhSm(0, 0.1, t) * (1 - lrhSm(0.45, 0.6, t)); const sw = lrhSm(0.1, 0.3, t);
    m.pot.visible = ql2 > 0.05; m.spine.rotation.y += lrhLerp(0.35, -0.35, sw) * ql2;
    V.d = V.d || new THREE.Vector3(); V.d.set(lrhLerp(-0.55, 0.1, sw), lrhLerp(0.1, 0.6, sw), lrhLerp(-0.2, -0.55, sw));
  }
  if (k === 'ult' && t < 1.1) {
    // Launching Day: down on the ways in a crouch, the gun and his left fist back, leaning into the slide
    qu = lrhSm(0, 0.12, t) * (1 - lrhSm(0.95, 1.1, t));
    m.hips.position.y -= 0.32 * qu; m.legL.rotation.x += 1.0 * qu; m.shinL.rotation.x -= 1.5 * qu; m.legR.rotation.x += 0.2 * qu; m.shinR.rotation.x -= 0.9 * qu;
    m.spine.rotation.x -= 0.35 * qu; m.head.rotation.x += 0.3 * qu;
    gun.position.lerp(V.c.set(0.5, 0.15, 0.15), qu); gun.rotation.x = lrhLerp(gun.rotation.x, -1.2, qu);
  }
  let TR = lrhAt(gun, 0, -0.03, 0.02, V.b), TL = lrhAt(gun, 0.02, 0.0, -0.24, V.a);
  if (!left) TL = V.a.set(-0.18, 0.5, -0.68);
  if (ql > 0) TL.lerp(V.c.set(-0.35, 0.3, -0.25), ql);
  if (ql2 > 0) TL.lerp(V.d, ql2);
  if (qu > 0) TL.lerp(V.c.set(-0.5, 0.0, 0.25), qu);
  if (lrhDead(m, pose, 1)) { TL = V.a.set(-0.7, 0.2, -0.2); TR = V.b.set(0.7, 0.2, -0.2); gun.position.set(0.7, 0.1, -0.3); m.plankBack.visible = true; m.pot.visible = false; }
  lrhHands(m, TL, TR);
}

// a fist seen in first person (s: 1 the right hand, -1 the left), its forearm running back towards the eye: skin, a
// leather bracer banded in the crew's colour, the smock's rolled sleeve
function lrhKeelFist(o, s, TC, skin, sleeve) {
  o.L.add('box', skin, 0, 0, 0, 0, 0, 0, 0.07, 0.065, 0.075);
  for (let k = 0; k < 4; k++) o.L.add('box', k % 2 ? skin : 0xc28e6c, 0, 0.024 - k * 0.017, -0.042, 0.2, 0, 0, 0.074, 0.016, 0.028);
  o.L.add('box', skin, -s * 0.038, 0.028, -0.028, 0.3, 0, s * 0.5, 0.024, 0.045, 0.028);
  o.L.add('cyl:10:0.92', 0x5a3a22, 0, -0.006, 0.1, Math.PI / 2, 0, 0, 0.05, 0.12, 0.046);
  o.L.add('cyl:10', TC.main, 0, -0.006, 0.12, Math.PI / 2, 0, 0, 0.052, 0.02, 0.048);
  o.L.add('cyl:10:0.85', skin, 0, -0.01, 0.24, Math.PI / 2, 0, 0, 0.056, 0.17, 0.052);
  o.L.add('cyl:10', sleeve, 0, -0.012, 0.35, Math.PI / 2, 0, 0, 0.07, 0.07, 0.064);
}
// the gun and his hands in first person (the plank itself stands before him in the world, seen faint)
function lrhKeelView(V) {
  const { root, mk, B, flashSpr } = V, me = typeof lrMe === 'function' && LRM.P.length ? lrMe() : null, t1 = !!(me && me.team), TC = LRH_TEAM[t1 ? 1 : 0], skin = 0xd09a78, sleeve = t1 ? 0x553834 : 0x5a86b4;
  const GP = [0.22, -0.22, -0.36], LP = [-0.28, -0.3, -0.44];
  const G = mk(root, ...GP), g = B(G); lrhKeelGunParts(g.L, g.G, TC, 0.6);
  const fr = mk(G, 0.0, -0.035, 0.015), f = B(fr); fr.rotation.x = -0.35; lrhKeelFist(f, 1, TC, skin, sleeve);
  const Lh = mk(root, ...LP), l = B(Lh); lrhKeelFist(l, -1, TC, skin, sleeve);
  const flash = flashSpr(0xffc070, 0.1); G.add(flash); flash.position.set(0, 0.03, -0.27);
  const muzzle = mk(G, 0, 0.03, -0.26);
  const anim = (s) => {
    const f = s.fire != null && s.fire >= 0 && s.fire < 0.3 ? 1 - s.fire / 0.3 : 0, k = s.act && s.act.k, t = (s.act && s.act.t) || 0;
    G.position.set(GP[0], GP[1] + 0.025 * f, GP[2] + 0.04 * f); G.rotation.set(0.14 * f, 0, 0); Lh.position.set(...LP); Lh.rotation.set(0, 0, 0);
    flash.material.opacity = s.fire != null && s.fire < 0.05 ? 1 : 0;
    if (s.reload > 0) { const q = Math.sin(Math.min(1, s.reload / 2) * Math.PI); G.rotation.set(0.5 * q, 0, 0.6 * q); G.position.y -= 0.05 * q; Lh.position.set(-0.08, -0.22, -0.4); }
    if (s.alt) { Lh.position.set(-0.18, -0.24, -0.5); Lh.rotation.set(0.5, 0, 0.4); G.position.set(0.26, -0.28, -0.32); G.rotation.set(-0.35, 0, 0.3); }
    if (k === 'a1' && t < 0.65) { const q = lrhSm(0, 0.08, t) * (1 - lrhSm(0.5, 0.65, t)); G.position.x += 0.05 * q; G.position.y -= 0.07 * q; Lh.position.set(lrhLerp(LP[0], -0.16, q), lrhLerp(LP[1], -0.2, q), -0.4); Lh.rotation.z = 0.8 * q; }
    if (k === 'a2' && t < 0.6) { const q = lrhSm(0, 0.1, t) * (1 - lrhSm(0.45, 0.6, t)); Lh.position.set(lrhLerp(LP[0], -0.12, q), lrhLerp(LP[1], -0.2, q), -0.45); Lh.rotation.x = 0.8 * q; }
    if (k === 'ult' && t < 1.1) { const q = lrhSm(0, 0.12, t) * (1 - lrhSm(0.95, 1.1, t)); G.position.y -= 0.1 * q; G.position.x += 0.04 * q; Lh.position.set(-0.34, -0.36, -0.4); }
  };
  return { muzzle, anim };
}
lrDefHeroArt('keel', { spec: { h: 2.1, hipY: 0.96, stride: 1.9, spd: 5.0 }, model: lrhKeel, view: lrhKeelView, portraitY: 0.3 });

// the plank set up before him, 1.8 x 2.2 m, centred at its bottom middle, facing +-z, a grip and two braces behind; seen
// faint by Keel himself through his own eyes, so it doesn't blind him
function lrhKeelPlankArt(team) {
  const TC = LRH_TEAM[team ? 1 : 0], B = lrBatch(), g = new THREE.Group(); g.name = 'lrWall:keelplank';
  lrhKeelPlankParts(B, TC, LRH_KEEL.pW, LRH_KEEL.pH, 0.14, true);
  B.add('box', LRH_WOOD, 0, 1.25, 0.14, 0, 0, 0, 0.5, 0.06, 0.08); B.add('cyl:6', LRH_LEATH, 0, 1.25, 0.2, 0, 0, Math.PI / 2, 0.025, 0.4, 0.025);
  for (const s of [-1, 1]) B.rod([s * 0.6, 0.1, 0.07], [s * 0.6, 1.9, 0.07], 0.035, LRH_IRON, 5);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }), mesh = B.mesh(mat); g.add(mesh);
  mesh.onBeforeRender = () => {
    let own = false; const me = lrMe();
    if (me && me.alive && me.hero === 'keel') for (const w of LRM.walls) if (w.k === 'keelplank' && w.owner === me.i && Math.abs(w.x - g.position.x) < 0.01 && Math.abs(w.z - g.position.z) < 0.01) own = true;
    const op = own ? 0.16 : 1; if (mat.opacity !== op) { mat.opacity = op; mat.depthWrite = op === 1; }
  };
  return g;
}
lrDefWallArt('keelplank', lrhKeelPlankArt);

// the effects: the nails (eight bright streaks along his look to about where they strike), the bound's dust and the
// thump of meeting someone, the pitch slapped on (and dripping off each ally it covers for its five seconds), and
// Launching Day's slide: a ghostly hull's bow in the crew's colours driving forward round him, tallow smoking behind
lrDefFx('nails', (o, X) => {
  const c = X.TCol(o.team), me = lrMe(), mine = me && o.a === me.i && me.alive, d0 = Math.hypot(o.x2 - o.x, o.y2 - o.y, o.z2 - o.z) || 10, sy = Math.sin(o.yaw || 0), cy = Math.cos(o.yaw || 0);
  const sx = o.x - sy * 0.5 + cy * (mine ? 0.22 : 0.3), sz = o.z - cy * 0.5 - sy * (mine ? 0.22 : 0.3), syy = o.y - (mine ? 0.1 : 0);
  for (let k = 0; k < 8; k++) {
    const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * LRH_KEEL.spread, d = lrDir((o.yaw || 0) + Math.cos(a) * r, (o.pitch || 0) + Math.sin(a) * r), L = Math.min(40, d0 * (0.9 + Math.random() * 0.15));
    const f0 = 0.15 + Math.random() * 0.3; X.rod(sx + d[0] * L * f0, syy + d[1] * L * f0, sz + d[2] * L * f0, sx + d[0] * L, syy + d[1] * L, sz + d[2] * L, 0.012, k % 2 ? 0xfff0d0 : c.glow, 0.08, 0.9);
    if (d0 < 39) X.sprite(sx + d[0] * L, syy + d[1] * L, sz + d[2] * L, 0xffd090, 0.18, 0.12);
  }
  X.sprite(sx, syy, sz, 0xffc070, 0.45, 0.06); X.smoke(sx, syy, sz, 1, 0.2, 0.4, 0x8a8478);
});
lrDefFx('plankup', (o, X) => { X.smoke(o.x - Math.sin(0) * 0, X.gy(o.x, o.z) + 0.2, o.z, 2, 0.4, 0.5, 0x7a7064); });
lrDefFx('launch', (o, X) => { const y = X.gy(o.x, o.z); for (let k = 0; k < 6; k++) X.sprite(o.x + (Math.random() - 0.5), y + 0.2 + Math.random() * 0.3, o.z + (Math.random() - 0.5), 0x8a8478, 0.5 + Math.random() * 0.4, 0.7, Math.sin(o.yaw || 0) * 2 + (Math.random() - 0.5), 0.8, Math.cos(o.yaw || 0) * 2 + (Math.random() - 0.5), 1.2, 0, true); X.ring(o.x, y + 0.06, o.z, 0.3, 1.8, X.TCol(o.team).main, 0.35, 0.6); });
lrDefFx('launchhit', (o, X) => { X.sprite(o.x, o.y, o.z, 0xfff0c0, 1.4, 0.12); X.burst(o.x, o.y, o.z, 0xd8c8a0, 10, 4, 0.18, 0.4, 1); X.ring(o.x, X.gy(o.x, o.z) + 0.08, o.z, 0.4, 2.4, X.TCol(o.team).glow, 0.4, 0.7); });
lrDefFx('caulk', {
  init(X) { return X.pool(3, () => ({ obj: new THREE.Group() })); },
  spawn(o, X, P) {
    const s = X.take(P); s.o = o; s.life = s.max = 5; s.drip = 0;
    X.ring(o.x, X.gy(o.x, o.z) + 0.07, o.z, 0.5, 6, 0x3a2a1a, 0.5, 0.7); X.smoke(o.x, o.y + 0.2, o.z, 3, 0.6, 1.0, 0x6a6058);
    for (const i of o.vs || []) { const q = LRM.P[i]; if (!q) continue; for (let k = 0; k < 10; k++) X.sprite(q.x + (Math.random() - 0.5) * 0.8, q.y + 0.5 + Math.random() * 1.3, q.z + (Math.random() - 0.5) * 0.8, LRH_PITCH, 0.45, 1.0, (Math.random() - 0.5) * 2.5, 1.8, (Math.random() - 0.5) * 2.5, 0.2, 9, true); X.sprite(q.x, q.y + 1.1, q.z, 0xffa040, 1.3, 0.3); X.ring(q.x, X.gy(q.x, q.z) + 0.07, q.z, 0.3, 1.0, 0xffa040, 0.6, 0.7); X.smoke(q.x, q.y + 1.4, q.z, 2, 0.4, 0.9, 0x9a9088); }
  },
  update(dt, X, P) {
    for (const s of P) {
      if (s.life <= 0) continue; s.life -= dt; s.drip -= dt; if (s.drip > 0) continue; s.drip = 0.08;
      for (const i of s.o.vs || []) { const q = LRM.P[i]; if (!q || !q.alive || !(q.oh > 0)) continue; const a = Math.random() * 6.28; X.sprite(q.x + Math.cos(a) * q.r, q.y + 0.4 + Math.random() * q.h * 0.6, q.z + Math.sin(a) * q.r, LRH_PITCH, 0.22, 0.7, 0, -0.6, 0, 0, 3, true); if (Math.random() < 0.5) X.sprite(q.x + Math.cos(a) * q.r, q.y + 0.5 + Math.random() * q.h * 0.5, q.z + Math.sin(a) * q.r, 0xffb060, 0.12, 0.3); }
    }
  },
});
lrDefFx('launchday', {
  // the bow of a hull: planking in the crew's colours, a wale and a stem, a ghost round him; the ways' tallow smoking behind
  init(X) {
    return X.pool(2, () => {
      const g = new THREE.Group(), mk = (TC) => {
        const B = lrBatch();
        for (const s of [-1, 1]) for (let j = 0; j < 5; j++) { const y = 0.25 + j * 0.42; B.add('box', j === 3 ? TC.main : j === 4 ? TC.trim : 0x4a3622, s * (0.85 - j * 0.04), y, -0.8, 0, s * 0.42, 0, 0.08, 0.4, 3.2); }
        B.add('box', 0x3a2a1c, 0, 1.2, -2.25, 0, 0, 0, 0.14, 2.3, 0.16); B.add('box', TC.main, 0, 2.35, -2.25, 0, 0, 0, 0.18, 0.1, 0.2);
        B.add('box', 0x3a2a1c, 0, 0.05, 0.2, 0, 0, 0, 1.9, 0.12, 2.6);
        return B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, emissive: 0x201810 }));
      };
      const h0 = mk(LRH_TEAM[0]), h1 = mk(LRH_TEAM[1]); g.add(h0); g.add(h1); return { obj: g, h: [h0, h1] };
    });
  },
  spawn(o, X, P) { const s = X.take(P); s.o = o; s.obj.visible = true; s.life = s.max = 1.0; s.h[0].visible = !o.team; s.h[1].visible = !!o.team; s.tr = 0; const y = X.gy(o.x, o.z); X.smoke(o.x, y + 0.2, o.z, 5, 0.8, 1.0, 0x8a8478); X.sprite(o.x, y + 1, o.z, X.TCol(o.team).glow, 2.4, 0.2); },
  update(dt, X, P) {
    for (const s of P) {
      if (s.life <= 0) continue; s.life -= dt; const a = LRM.P[s.o.v]; if (s.life <= 0 || !a || !a.alive) { s.obj.visible = false; s.life = 0; continue; }
      const T = s.max - s.life, op = lrhSm(0, 0.1, T) * (1 - lrhSm(0.8, 1.0, T)), yaw = s.o.yaw || 0, me = lrMe(), mine = me && a === me && me.alive;
      s.obj.position.set(a.x, a.y, a.z); s.obj.rotation.set(0, yaw, 0); for (const h of s.h) h.material.opacity = op * (mine ? 0.3 : 0.85);
      s.tr -= dt; if (s.tr <= 0 && T < 0.9) { s.tr = 0.04; const y = X.gy(a.x, a.z); for (const sd of [-1, 1]) X.sprite(a.x + Math.cos(yaw) * sd * 0.7, y + 0.1, a.z - Math.sin(yaw) * sd * 0.7, 0xe8e0c8, 0.5, 0.9, 0, 0.5, 0, 0.6, 0, true); for (const sd of [-1, 1]) X.sprite(a.x - Math.sin(yaw) * 2.3 + Math.cos(yaw) * sd * 0.3, y + 0.3, a.z - Math.cos(yaw) * 2.3 - Math.sin(yaw) * sd * 0.3, 0xe8f4ff, 0.7, 0.4, Math.cos(yaw) * sd * 4 - Math.sin(yaw) * 2, 3, -Math.sin(yaw) * sd * 4 - Math.cos(yaw) * 2, 0.8, 9); }
    }
  },
});
