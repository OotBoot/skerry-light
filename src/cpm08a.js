'use strict';
// The Chronicle of the Light, mission 8, Part I: The North Landing (cp_m08rock). 14 December 1888, a year to the
// night after the Gannet went down. The back of Skerry Light's own rock, the side the raid never shows: the boat
// slip in the gully under the tower's north face, where the keeper's cutter is kept drawn up on her cradle out of
// the swell, the oil store's back door and the boat shed either side, and the tower itself standing over it all,
// white with its two red bands, lit and turning (src/zombies.js's Light, at the rock's own south end: Z.far).
//  - Out past the rocks, a mile off, the Gannet's bell. Holm goes up to light the lamp and keep it, and leaves you to
//    make the cutter ready: three loads to carry down to her on the slip (the flare box from the oil store, the
//    grapnel and line from the boat shed, the cask of lamp oil from the tower door). One load to a pair of hands;
//    whoever goes down drops theirs where they fall. The drowned climb up out of the gully and the shore rocks
//    the while, more of them the more of you, and each toll of the bell brings a few more.
//  - All three aboard: Holm on the gallery, the lamp lit, and a lantern out on the water that isn't his (a
//    cinematic, m08_gallery). Then knock out the two chocks under her (hold Use at each) while they come up the slip
//    at you, and she runs down into the sea: the part is done.
// Laid out by FPI_GEN.cpm08rock. Host-authoritative: the host keeps the loads (where each lies, who carries it), the
// chocks and the drowned, and sends them in m8r; a joined player asks to take a load ('m8take'), stow it ('m8stow')
// and, while holding Use at a chock, to knock at it ('m8chock'). Lines through cpSay (cp_m08_05 on).

const CPM8R = {
  R: 52, START: [-3, 8], TOWER: [0, -30], FOOT: 14, CUT: [0, 38], STOW_R: 5, SLIP: [0, 31, 4.6, 18],
  LOADS: [
    { n: 'the flare box', at: [15, -10.5], c: '#d86a4a' },
    { n: 'the grapnel and line', at: [-14.5, -8.5], c: '#a8a8a8' },
    { n: 'the cask of lamp oil', at: [4, -13.2], c: '#c8a060' },
  ],
  CHOCKS: [[-2.3, 34.2], [2.3, 34.2]], CHOCK_T: 2.6, TOLL: 19, LEVEL: 7,
};
const CPM8R_PH = ['load', 'gallery', 'chocks', 'gone'];

// ---------- its look, and laying it out ----------
FPS_ISLES.cpm08rock = Object.assign({}, FPS_ISLES.light, { name: 'the north landing under the Light', indoor: false, rocks: [0, 4, 7, 2], wrecks: [0], sky: '90,100,130', skyA: 0.05,
  fog: ['#080a10', 30, 420], mist: '60,66,80', mistA: 0.1, birds: ['gull', 0], tufts: ['#3e4632', 26], pebbles: 160, pools: 6, wrack: 70, nLights: 6, keep: false, arena: false, noGround: false });
// the tower's foot: its plinth and the rock round it, solid (its look is the Light's own, Z.far)
FPI_K.cpm8foot = { col: '#3a3c40', noShadow: true, sol(p) { return [fpiCirc(p, 0, 0, CPM8R.FOOT, 1.4)]; }, b3() {} };
FPI_GEN.cpm08rock = {
  built: true,
  set(H) {
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }, W = (x, y) => [H.CX + x, H.CY + y], R = H.R, put = (k, x, y, a, o) => { const [wx, wy] = W(x, y); H.put(k, wx, wy, a, o || {}); };
    // the Light, at the south end of its own rock, close over you
    Z.far = { X: CPM8R.TOWER[0], Y: CPM8R.TOWER[1] };
    put('cpm8foot', ...CPM8R.TOWER, 0);
    // the oil store's back (east) and the boat shed (west): low stone sheds against the rock, a lamp by each door
    put('block', 19, -14, 0.1, { w: 6, d: 4.4, hh: 2.7, col: '#8a8678', trim: '#3a2a24' });
    put('block', -19, -12, -0.12, { w: 6.4, d: 5, hh: 2.9, col: '#6a5a48', trim: '#2e2a26' });
    for (const [x, y] of [[15.6, -11.8], [-15.4, -9.6], [2.4, -14.6]]) { const [wx, wy] = W(x, y); fpiLanternPost(H, wx, wy, 0); }
    put('sacks', 21.5, -10.8, 0.2); put('sacks', -21.2, -8.6, -0.4, { c: '#5a5040' }); put('rowboat', -23, -4, 1.4, { len: 3.8 });
    // the slip: a ramp of dressed stone down the gully to the water, the cutter drawn up on her cradle at its foot
    { const [x, y, w, d] = CPM8R.SLIP; put('block', x, y, 0, { w, d, hh: 0.12, col: '#5c5a52' }); }
    put('boat', ...CPM8R.CUT, 0, { len: 9.6, beam: 3.0, paint: '#2e3e52', upright: true });
    for (const [x, y] of CPM8R.CHOCKS) put('block', x, y, 0, { w: 0.8, d: 0.6, hh: 0.55, col: '#4a3a2a' });
    put('bollard', -3.6, 22.5, 0, { rope: true }); put('bollard', 3.6, 22.5, 0, { rope: true });
    put('bellframe', 7, 18, -0.4);
    for (const [x, y, a, l] of [[-8, 24, 0.4, 3.2], [9.5, 27, 2.2, 2.8], [-11, 6, 1.1, 3.6]]) put('log', x, y, a, { len: l, rad: 0.2 });
    // the shore rocks, where they climb up out of the water
    for (let i = 0; i < 14; i++) { const a = -0.2 + i / 13 * (Math.PI + 0.4), d = CPM8R.R - 6 - R(0, 6), [wx, wy] = W(Math.cos(a) * d, Math.sin(a) * d); if (Math.abs(Math.cos(a) * d) < 6 && Math.sin(a) * d > 20) continue; H.put('stone', wx, wy, R(0, H.TAU), { w: R(2.4, 4.4), d: R(1.8, 3), hh: R(0.8, 1.6) }); }
    H.light(H.CX - 0.5, H.CY + 22, 1.6, '#ffc070', 8, 'lantern'); H.light(H.CX + 17, H.CY - 11, 1.6, '#ffb860', 7, 'lantern'); H.light(H.CX - 16, H.CY - 9, 1.6, '#ffb860', 7, 'lantern');
    ZMD.START = CPM8R.START.slice();
  },
  props(H) { fpiScatter(H, 8, 1.6, 10, H.IR - 8, 3, (x, y) => { if (Math.abs(x - H.CX) < 5 && y - H.CY > 16) return; H.put('stone', x, y, H.R(0, H.TAU), { w: H.R(0.8, 1.8), d: H.R(0.6, 1.4), hh: H.R(0.3, 0.7) }, true); }); },
  decor() {},
};

// ---------- the stage ----------
cpStage('m08rock', {
  n: 'The North Landing', mend: true,
  map: { start: CPM8R.START.slice(), top: 0, R: CPM8R.R, isle: 'cpm08rock', shore: () => -999, nav: [-CPM8R.R, CPM8R.R, -CPM8R.R, CPM8R.R], zones: { rock: { n: 'the north landing', r: [-CPM8R.R, CPM8R.R, -CPM8R.R, CPM8R.R], sky: true } } },
  music: () => 'cpm08rock',
  enter() {
    Object.assign(RAID.st, { m8: true, ph: 'load', loads: CPM8R.LOADS.map(L => { const [x, y] = cpkW(...L.at); return { st: 0, x, y, by: '' }; }), chock: [0, 0], spT: 6, tollT: 7, pend: 0, said: {}, holdT: 0, goneT: 0, ambT: 2 });
    ZM.round = Math.max(ZM.round, CPM8R.LEVEL);
    FPS.me.h = Math.PI * 0.85;
    if (ZM.net === 'client') return;
    cpm8rObj();
  },
  tick(dt) { cpm8rTick(dt); },
  me(dt) { cpm8rMe(dt); },
  q(sid, k, a) { cpm8rAsk(sid, k, a); },
  pack(o) { const S = RAID.st; o.m8r = [CPM8R_PH.indexOf(S.ph), S.loads.map(L => [L.st, Math.round((L.x - FPSC.CX) * 10), Math.round((L.y - FPSC.CY) * 10), L.by || '']), S.chock.map(c => Math.round(c * 100))]; },
  apply(o) {
    const S = RAID.st, a = o.m8r; if (!Array.isArray(a) || !S.loads) return;
    S.ph = CPM8R_PH[a[0] | 0] || 'load';
    if (Array.isArray(a[1])) a[1].slice(0, 3).forEach((e, i) => { if (!Array.isArray(e)) return; const L = S.loads[i]; L.st = e[0] | 0; L.x = FPSC.CX + e[1] / 10; L.y = FPSC.CY + e[2] / 10; L.by = String(e[3] || ''); });
    if (Array.isArray(a[2])) S.chock = a[2].slice(0, 2).map(v => (+v || 0) / 100);
  },
  consider(c) {
    const S = RAID.st; if (!S.loads) return;
    S.loads.forEach((L, i) => { if (L.st === 0) c({ k: 'm8load', i }, L.x, L.y, 0, 2.2, false); });
    if (S.ph === 'load') { const [x, y] = cpkW(...CPM8R.CUT); c({ k: 'm8stow' }, x, y - 3.4, 0, CPM8R.STOW_R, false); }
    if (S.ph === 'chocks') CPM8R.CHOCKS.forEach(([cx, cy], i) => { if (S.chock[i] < 1) { const [x, y] = cpkW(cx, cy); c({ k: 'm8chock', i }, x, y, 0, 1.9, false); } });
  },
  prompt(o) {
    const S = RAID.st, mine = cpm8rMine();
    if (o.k === 'm8load') return mine >= 0 ? { text: `Your hands are full (${CPM8R.LOADS[mine].n})` } : { text: `Take up ${CPM8R.LOADS[o.i].n}`, free: true };
    if (o.k === 'm8stow') return mine >= 0 ? { text: `Stow ${CPM8R.LOADS[mine].n} aboard the cutter`, free: true } : { text: `The keeper’s cutter: ${S.loads.filter(L => L.st === 2).length} of 3 loads aboard` };
    if (o.k === 'm8chock') return { text: 'Hold to knock out the chock', hold: true };
    return null;
  },
  use(o) {
    const S = RAID.st;
    if (o.k === 'm8load') { if (cpm8rMine() >= 0 || S.pend > 0) { zmSound('no'); return true; } S.pend = 0.6; raidAsk('m8take', o.i); return true; }
    if (o.k === 'm8stow') { if (cpm8rMine() < 0 || S.pend > 0) { zmSound('no'); return true; } S.pend = 0.6; raidAsk('m8stow', 0); return true; }
    if (o.k === 'm8chock') return true;
    return false;
  },
  hud(phone, mono, fell) { cpm8rHud(phone, mono, fell); },
  b3(grp) { cpm8r3dBuild(grp); },
  f3(dt) { cpm8r3d(dt); },
  exit() { CPM8R3.on = false; },
});

// ---------- hosting or alone ----------
const cpm8rMine = () => { const S = RAID.st; return S.loads ? S.loads.findIndex(L => L.st === 1 && L.by === FPS.me.id) : -1; };
const cpm8rWho = sid => sid === FPS.me.id ? FPS.me : FPS.remote.get(sid);
const cpm8rGone = sid => sid === FPS.me.id ? (FPS.me.dead > 0 || zmIsDown()) : (() => { const r = FPS.remote.get(sid); return !r || r.left || r.dead || r.down; })();
// the objective and the waypoint: the nearest load still lying, or the cutter while one's being carried; the chocks
function cpm8rObj() {
  const S = RAID.st, n = S.loads.filter(L => L.st === 2).length;
  if (S.ph === 'load') {
    cpObjective(`Load the cutter on the slip: flares, grapnel and line, lamp oil (${n} of 3 aboard)`);
    const lying = S.loads.map((L, i) => [L, i]).filter(([L]) => L.st === 0);
    if (S.loads.some(L => L.st === 1)) cpWaypoint(CPM8R.CUT[0], CPM8R.CUT[1] - 3, 'The cutter', 1.6);
    else if (lying.length) { const [L, i] = lying[0]; cpWaypoint(L.x - FPSC.CX, L.y - FPSC.CY, CPM8R.LOADS[i].n[4].toUpperCase() + CPM8R.LOADS[i].n.slice(5), 0.8); }
  } else if (S.ph === 'chocks') { cpObjective(`Knock out the chocks and run her down the slip (${S.chock.filter(c => c >= 1).length} of 2)`); const i = S.chock[0] < 1 ? 0 : 1; cpWaypoint(CPM8R.CHOCKS[i][0], CPM8R.CHOCKS[i][1], 'A chock', 0.6); }
  else { cpObjective(''); cpWaypoint(null); }
}
function cpm8rAsk(sid, k, a) {
  const S = RAID.st, who = cpm8rWho(sid); if (!S.m8 || !who || cpm8rGone(sid)) return;
  if (k === 'm8take') { const L = S.loads[clamp(a | 0, 0, 2)]; if (!L || L.st !== 0 || S.loads.some(q => q.st === 1 && q.by === sid) || Math.hypot(who.x - L.x, who.y - L.y) > 3.2) return; L.st = 1; L.by = sid; cpEvent('m8take', [S.loads.indexOf(L), sid]); cpm8rObj(); return; }
  if (k === 'm8stow') {
    const L = S.loads.find(q => q.st === 1 && q.by === sid), [x, y] = cpkW(...CPM8R.CUT); if (!L || Math.hypot(who.x - x, who.y - (y - 3.4)) > CPM8R.STOW_R + 1.2) return;
    L.st = 2; L.by = ''; const n = S.loads.filter(q => q.st === 2).length; cpEvent('m8stow', [S.loads.indexOf(L), sid, n]);
    if (n === 1) cpSay('holm', 'That’s one aboard. Mind the gully: they’re climbing up out of it.', 'cp_m08_05');
    if (n === 2) cpSay('m8cox', 'One more load, and she’s ready for the water.', 'cp_m08_07');
    if (n === 3) { S.ph = 'gallery'; cpObjective(''); cpWaypoint(null); for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); cpCine('m08_gallery', () => { S.ph = 'chocks'; S.spT = 2; cpm8rObj(); cpEvent('m8chocks'); }); }
    else cpm8rObj();
    return;
  }
  if (k === 'm8chock') {
    const i = clamp(a | 0, 0, 1), [x, y] = cpkW(...CPM8R.CHOCKS[i]); if (S.ph !== 'chocks' || S.chock[i] >= 1 || Math.hypot(who.x - x, who.y - y) > 2.6) return;
    S.chock[i] = Math.min(1, S.chock[i] + 0.25 / CPM8R.CHOCK_T);
    if (S.chock[i] >= 1) {
      cpEvent('m8chock', i); const n = S.chock.filter(c => c >= 1).length;
      if (n === 1) cpSay('m8cox', 'One chock out. The other, quick, before they’re all over her!', 'cp_m08_11');
      if (n === 2) { S.ph = 'gone'; S.goneT = 0; cpObjective(''); cpWaypoint(null); cpSay('m8cox', 'She’s running! Down the slip and jump aboard!', 'cp_m08_12'); for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); }
      else cpm8rObj();
    }
  }
}
function cpm8rTick(dt) {
  const S = RAID.st, n = Math.max(1, ZM.hum.length); if (!S.m8) return;
  // a load whose bearer goes down (or leaves) falls where they were
  S.loads.forEach((L, i) => { if (L.st !== 1) return; const w = cpm8rWho(L.by); if (w) { L.x = w.x; L.y = w.y; } if (cpm8rGone(L.by)) { L.st = 0; L.by = ''; cpEvent('m8drop', i); cpm8rObj(); } });
  if (S.ph === 'gone') { S.goneT += dt; if (S.goneT > 3.2) cpDone(); return; }
  if (S.ph === 'gallery') return;
  // the Gannet's bell, a mile out: each toll brings a few more up out of the water
  S.tollT -= dt;
  if (S.tollT <= 0) { S.tollT = CPM8R.TOLL * (0.85 + Math.random() * 0.3); cpEvent('m8toll'); for (let k = 0; k < 1 + Math.ceil(n / 2); k++) cpm8rRise(); if (!S.said.toll) { S.said.toll = 1; cpSay('m8cox', 'There she tolls again. Nearer, or I’m a Dutchman.', 'cp_m08_06'); } }
  // and the trickle between
  S.spT -= dt;
  const hard = S.ph === 'chocks' ? 1 : S.loads.filter(L => L.st === 2).length / 3;
  if (S.spT <= 0) { S.spT = (5.2 - 2.4 * hard) * (0.75 + Math.random() * 0.5) / Math.sqrt(1 + 0.6 * (n - 1)); cpm8rRise(); }
}
// one of the drowned, up out of the water over the shore rocks (the north, east and west sides; and up the slip)
function cpm8rRise() {
  const S = RAID.st, n = Math.max(1, ZM.hum.length), alive = ZM.z.filter(z => !z.dead).length; if (alive >= 4 + 2 * n + (S.ph === 'chocks' ? 3 : 0)) return null;
  for (let t = 0; t < 14; t++) {
    const slip = S.ph === 'chocks' && Math.random() < 0.4, a = slip ? Math.PI / 2 + (Math.random() - 0.5) * 0.25 : -0.15 + Math.random() * (Math.PI + 0.3), d = slip ? CPM8R.R - 4 : CPM8R.R - 4 - Math.random() * 6;
    const [x, y] = cpkW(Math.cos(a) * d, Math.sin(a) * d); if (cpkNear(x, y, 9)) continue;
    const u = Math.random(), kind = u < 0.15 + 0.15 * (S.ph === 'chocks') ? 'run' : u < 0.75 ? 'jog' : 'walk';
    const z = raidSpawnAt(x, y, { kind, hp: zmHp(CPM8R.LEVEL) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)), rise: 1.2 });
    if (z) zmSound('moan', Math.hypot(x - FPS.me.x, y - FPS.me.y), fpsEar(x, y), z.kind);
    return z;
  }
  return null;
}
cpOn('m8toll', () => { try { if (!soundOff()) sfxBellFar(0.35, 0.55); } catch (e) {} CPM8R3.toll = 1; fpsFeed('Out past the rocks, the Gannet’s bell tolls. They come up out of the water at the sound of it.'); });
cpOn('m8take', a => { try { if (!soundOff()) sfxPlay('pickup', { vol: 0.5 }); } catch (e) {} const sid = Array.isArray(a) ? a[1] : '', L = CPM8R.LOADS[Array.isArray(a) ? a[0] | 0 : 0]; if (L && sid !== FPS.me.id) fpsFeed(`${gwsNick(sid)} takes up ${L.n}.`); else if (L) fpsFeed(`You take up ${L.n}. Down the slip to the cutter with it.`); });
cpOn('m8stow', a => { try { if (!soundOff()) sfxPlay('chest', { vol: 0.5 }); } catch (e) {} const L = CPM8R.LOADS[Array.isArray(a) ? a[0] | 0 : 0], n = Array.isArray(a) ? a[2] | 0 : 0; ZM.banner = { text: `${n} of 3 aboard`, t: 2.6, small: true, col: L ? L.c : '#ffd88a', sub: L ? L.n + ', stowed' : '' }; });
cpOn('m8drop', i => { const L = CPM8R.LOADS[i | 0]; if (L) fpsFeed(`${L.n[0].toUpperCase() + L.n.slice(1)} falls where its bearer went down. Someone take it up.`); });
cpOn('m8chocks', () => { ZM.banner = { text: 'Knock out the chocks', t: 4, sub: 'one each side of her keel · then she runs', col: '#ffd8a0' }; if (typeof raidRespawn === 'function') raidRespawn(); });
cpOn('m8chock', i => { try { const [x, y] = cpkW(...CPM8R.CHOCKS[clamp(i | 0, 0, 1)]); if (!soundOff() && !sfxPlay('chock', { vol: 0.9, pan: fpsEar(x, y), out: true })) { tone(140, 'square', 0.002, 0.12, 0.2, { to: 70 }); noise('bandpass', 700, 2, 0.002, 0.2, 0.3); } } catch (e) {} CPM8R3.shake = 0.5; });

// ---------- everyone ----------
function cpm8rMe(dt) {
  const S = RAID.st; if (!S.m8) return;
  if (S.pend > 0) S.pend -= dt;
  // holding Use at a chock: a knock at it every quarter second (the host counts them)
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near, alive = !(FPS.me.dead > 0) && !zmIsDown() && !ZM.ghost;
  if (hold && o && o.k === 'm8chock' && alive && S.ph === 'chocks') { S.holdT += dt; if (S.holdT >= 0.25) { S.holdT -= 0.25; raidAsk('m8chock', o.i); try { if (!soundOff()) tone(220 + Math.random() * 40, 'triangle', 0.002, 0.06, 0.12, { to: 120 }); } catch (e) {} } } else S.holdT = 0;
  // the swell in the gully, and the gulls' rock
  S.ambT -= dt; if (S.ambT <= 0) { S.ambT = 3 + Math.random() * 4; try { if (!soundOff()) noise('bandpass', 500, 0.8, 0.6, 1.4, 0.06, { pan: (Math.random() - 0.5) * 1.2 }); } catch (e) {} }
}
function cpm8rHud(phone, mono, fell) {
  const S = RAID.st; if (!S.m8) return;
  const mine = cpm8rMine();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (mine >= 0) { ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(255,224,170,0.9)'; ctx.fillText(`CARRYING · ${CPM8R.LOADS[mine].n.toUpperCase()} · DOWN THE SLIP TO THE CUTTER`, cx, H - (phone ? 120 : 84)); }
  const o = ZM.near;
  if (S.ph === 'chocks' && o && o.k === 'm8chock') { const k = clamp(S.chock[o.i] || 0, 0, 1); ctx.strokeStyle = 'rgba(255,210,150,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke(); ctx.strokeStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke(); }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// ---------- in 3D: the loads, the cutter's mast and gear, the chocks, the toll over the water ----------
const CPM8R3 = { on: false, toll: 0, shake: 0 };
function cpm8r3dBuild(grp) {
  const T = CPM8R3, G0 = FPSC.GROUND, S = RAID.st; T.on = true; T.toll = 0; T.shake = 0;
  const soft = z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'), lam = c => new THREE.MeshLambertMaterial({ color: c });
  const glow = (c, s, o) => { const g0 = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o == null ? 0.5 : o })); g0.scale.setScalar(s); return g0; };
  // the three loads: a red-painted flare box, a grapnel on a coil of line, a cask
  T.loads = CPM8R.LOADS.map((L, i) => {
    const g3 = new THREE.Group(); grp.add(g3);
    if (i === 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.55), lam('#8a3424')); b.position.y = 0.25; g3.add(b); const l = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 0.59), lam('#3a2a1e')); l.position.y = 0.5; g3.add(l); }
    else if (i === 1) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.1, 6, 14), lam('#8a7650')); c.rotation.x = Math.PI / 2; c.position.y = 0.12; g3.add(c); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), lam('#4a4c50')); s.position.y = 0.5; g3.add(s); for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.36), lam('#4a4c50')); const a = k / 4 * 6.283; f.position.set(Math.cos(a) * 0.14, 0.9, Math.sin(a) * 0.14); f.rotation.y = -a; f.rotation.x = 0.5; g3.add(f); } }
    else { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.75, 10), lam('#6a4a2e')); c.position.y = 0.38; g3.add(c); for (const y of [0.12, 0.64]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.05, 10), lam('#2c2e30')); h.position.y = y; g3.add(h); } }
    const gl = glow(new THREE.Color(L.c), 1.6, 0.35); gl.position.y = 0.6; g3.add(gl);
    return { g3, gl };
  });
  // the cutter's mast, boom and furled sail, standing up off her on the slip
  { const [x, y] = cpkW(...CPM8R.CUT), m = new THREE.Group(); m.position.copy(z3v(x, y + 1.2, G0 + 0.9)); grp.add(m);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 9, 8), lam('#6a5440')); mast.position.y = 4.5; m.add(mast);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 6), lam('#5a4630')); boom.rotation.x = Math.PI / 2; boom.position.set(0, 1.4, 2.3); m.add(boom);
    const furl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4.2, 8), lam('#8a826e')); furl.rotation.x = Math.PI / 2; furl.position.set(0, 1.62, 2.2); m.add(furl);
    const lan = glow(0xffc070, 1.4, 0.7); lan.position.set(0, 3.2, 0.2); m.add(lan); T.cutLan = lan; T.mast = m; }
  // the chocks' wedges under her keel (knocked out: gone)
  T.chocks = CPM8R.CHOCKS.map(([cx0, cy0]) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.9), lam('#7a5a3a')); const [x, y] = cpkW(cx0 * 0.6, cy0 + 0.6); w.position.copy(z3v(x, y, G0 + 0.18)); grp.add(w); return w; });
  // the stowed loads, sat on her deck
  T.aboard = T.loads.map((L, i) => { const s = L.g3.clone(); const [x, y] = cpkW(CPM8R.CUT[0] + (i - 1) * 0.9, CPM8R.CUT[1] - 1.5 + i * 0.6); s.position.copy(z3v(x, y, G0 + 0.95)); s.visible = false; grp.add(s); return s; });
  // the sea's flash when the bell tolls (far out to the north: the glow over the water where she lies)
  T.far = glow(0x8ac8c0, 120, 0); { const [x, y] = cpkW(-150, 1600); T.far.position.copy(z3v(x, y, G0 + 10)); } T.far.material.fog = false; grp.add(T.far);
  void S;
}
function cpm8r3d(dt) {
  const T = CPM8R3, S = RAID.st; if (!T.on || !S.m8 || !S.loads) return;
  const t = g.t, G0 = FPSC.GROUND, m = FPS.me;
  S.loads.forEach((L, i) => {
    const o = T.loads[i]; T.aboard[i].visible = L.st === 2;
    if (L.st === 2 || (L.st === 1 && L.by === m.id)) { o.g3.visible = false; return; }
    o.g3.visible = true;
    if (L.st === 0) { o.g3.position.copy(z3v(L.x, L.y, G0)); o.g3.rotation.y = i * 1.3; o.gl.material.opacity = 0.25 + 0.15 * Math.sin(t * 3 + i); }
    else { const r = FPS.remote.get(L.by); if (!r) { o.g3.visible = false; return; } o.g3.position.copy(z3v(r.x + Math.sin(r.h || 0) * 0.5, r.y + Math.cos(r.h || 0) * 0.5, G0 + (r.jz || 0) + 0.7)); o.g3.rotation.y = -(r.h || 0); o.gl.material.opacity = 0.12; }
  });
  T.chocks.forEach((w, i) => { w.visible = (S.chock[i] || 0) < 1; });
  if (T.toll > 0) { T.toll = Math.max(0, T.toll - dt / 2.5); } T.far.material.opacity = 0.05 + T.toll * 0.25;
  if (T.shake > 0) { T.shake = Math.max(0, T.shake - dt); FPS.eyeLag = (FPS.eyeLag || 0) + (Math.random() - 0.5) * 0.04 * T.shake; }
  T.cutLan.material.opacity = 0.6 + 0.1 * Math.sin(t * 7);
}
