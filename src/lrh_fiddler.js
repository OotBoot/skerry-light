'use strict';
// The Lamp Road: Fiddler, the ship's fiddler from the Mermaid, who plays his crew along. His kit, his bot, his
// crosshair, the sharp note, the aura he plays (Slow Air or Hornpipe: rings and notes on the ground round him), the
// bosun's call, the reel and All Hands, their sounds (the fiddle synthesised) and events, and (below) his art. A hero
// file as the guide at the top of src/lr.js has it. His tune (p.tune: 0 Slow Air, 1 Hornpipe) and the time left on All
// Hands (p.allT) go to the guests in his snapshot, so everyone sees and hears the right aura.

// ---------- the play ----------
// the tunes: what each is called on the HUD, the notes the Sharp Note plays through (Hz), and their colours
var LRH_FIDDLER_TUNES = [
  { n: '♪ Slow Air', short: 'Air', col: 0x9cffc0, notes: [392, 440, 494, 587, 494, 440, 392, 330] },
  { n: '♪ Hornpipe', short: 'Pipe', col: 0x8ad8ff, notes: [587, 659, 740, 784, 880, 784, 740, 659] },
];
lrDefHero({
  id: 'fiddler', n: 'Fiddler', title: 'The Ship’s Fiddler', role: 'support', hp: 225, spd: 5.6, r: 0.4, h: 1.8, mag: 20, reloadT: 1.5, ultCost: 1700,
  cd: { a1: 8, a2: 9, alt: 0 }, range: 42, projSpeed: 50, heals: true, healRange: 0.01, actT: { alt: 0.45, a1: 0.9, a2: 0.6, ult: 1.6 },
  blurb: 'An old fiddler from the Mermaid in a battered top hat. His tunes mend his crew or quicken them, and his notes sting.',
  kit: {
    pri: ['Sharp Note', 'A bright note that flies true and bends a little towards whoever it’s near.'],
    alt: ['♪ Slow Air', 'Tap to change your tune: Slow Air mends allies near you, Hornpipe quickens them.', 'Tune'],
    a1: ['Bosun’s Call', 'A shrill pipe: allies near you mend at once, the most hurt of them twice as much.', 'Call'],
    a2: ['Reel', 'A wild skirl that throws back enemies close to you and leaves them slowed.'],
    ult: ['All Hands', 'Everyone sings: allies near you take less damage, and you play both tunes twice as strong.', 'All Hands'],
  },
  how: { fidNote: 'Sharp Note', fidReel: 'Reel' },
  // the Sharp Note (and the aura he plays, set going the first time he can play)
  fire(p, dt, I, H) {
    if (!LRM.zones.some(z => z.k === 'fidAura' && z.owner === p.i)) lrAddZone({ k: 'fidAura', team: p.team, owner: p.i, x: p.x, y: p.y, z: p.z, r: 8, t: 1 });
    if (!(I.fire && p.fireT >= 0.3 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--; p.noteN = ((p.noteN || 0) + 1) % 8;
    lrSpawnProj(p, 'fidNote', 50, { dy: -0.15 });
    lrFxPush('fidNote', { v: p.i, x: p.x, y: p.y + 1.45, z: p.z, m: p.noteN, tune: p.allT > 0 ? 2 : p.tune | 0 });
  },
  // Change Tune: a tap swaps Slow Air and Hornpipe (not while All Hands plays both)
  alt(p, dt, I) {
    const press = I.alt && !p.altWas; p.altWas = !!I.alt;
    if (!press || p.allT > 0) return;
    p.tune = p.tune ? 0 : 1; p.act = { k: 'alt', t: 0 };
    lrFxPush('fidTune', { v: p.i, x: p.x, y: p.y + 1.4, z: p.z, tune: p.tune, team: p.team });
  },
  // Bosun's Call: 70 to every ally within 10 m (him too), twice that to the most hurt of the others
  a1(p, dt, I, H) {
    if (!(I.a1 && p.cd.a1 <= 0)) return;
    p.cd.a1 = H.cd.a1; p.act = { k: 'a1', t: 0 };
    const near = lrAlliesIn(p, p.x, p.z, 10).filter(q => Math.abs(q.y - p.y) < 4), low = near.filter(q => q !== p && q.hp < q.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    for (const q of near) lrHeal(q, q === low ? 140 : 70, p);
    lrFxPush('fidCall', { v: p.i, x: p.x, y: p.y, z: p.z, team: p.team, n: near.length });
  },
  // Reel: enemies within 6 m (in his sight) thrown back, nicked (10) and slowed 40% for two seconds
  a2(p, dt, I, H) {
    if (!(I.a2 && p.cd.a2 <= 0)) return;
    p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 };
    for (const q of lrFoesIn(p, p.x, p.z, 6)) {
      if (Math.abs(q.y - p.y) > 3 || !lrSees({ x: p.x, y: p.y + 1.2, z: p.z }, { x: q.x, y: q.y + 1, z: q.z })) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1;
      lrHurt(q, 10, p, 'fidReel'); lrKnock(q, dx / d * 10, 4.5, dz / d * 10, 0.4); lrSlow(q, 0.6, 2, 'fidReel');
    }
    lrFxPush('fidReel', { v: p.i, x: p.x, y: p.y, z: p.z, team: p.team });
  },
  // All Hands: seven seconds of the shanty (the aura does the rest)
  ult(p) { p.allT = 7; lrFxPush('fidAll', { v: p.i, x: p.x, y: p.y, z: p.z, team: p.team }); },
  tick(p, dt) { if (p.allT > 0) p.allT = Math.max(0, p.allT - dt); },
  reset(p, why) { p.allT = 0; p.altWas = false; if (why === 'hero') p.tune = 0; },
  // (online: the tune and All Hands' time; a guest's own change of tune is kept a moment till the host has heard it)
  snap: p => (p.tune || p.allT > 0) ? [p.tune | 0, lrR(p.allT || 0, 10)] : 0,
  unsnap(p, x, mine) { if (!(mine && performance.now() - (p.tuneAt || -1e9) < 700)) p.tune = x[0] | 0; p.allT = +x[1] || 0; },
  // the HUD: the secondary named for the tune he's playing, always lit (he never stops)
  abil(p, k) {
    if (k === 'alt') { const T = LRH_FIDDLER_TUNES[p.tune ? 1 : 0], kit = LR_HEROES.fiddler.kit.alt; kit[0] = p.allT > 0 ? '♪ Both tunes' : T.n; kit[2] = p.allT > 0 ? 'Both' : T.short; return { on: p.alive }; }
    return { on: p.act.k === k };
  },
  // a guest's own note flown at once, and its own change of tune heard and seen at once
  guestFire(p, I, H, ey, d) {
    const press = I.alt && !p.altWasG; p.altWasG = !!I.alt;
    if (press && !(p.allT > 0)) { p.tune = p.tune ? 0 : 1; p.tuneAt = performance.now(); p.act = { k: 'alt', t: 0 }; lrLocalFx({ k: 'fidTune', v: p.i, x: p.x, y: p.y + 1.4, z: p.z, tune: p.tune, team: p.team }); }
    if (!(I.fire && p.fireT >= 0.3 && p.ammo > 0 && p.reload <= 0)) return;
    p.fireT = 0; p.ammo--; LRM.shotAt = performance.now(); p.noteN = ((p.noteN || 0) + 1) % 8;
    LRM.proj.push({ id: -(++LRM.nid), k: 'fidNote', team: p.team, owner: p.i, x: p.x, y: ey - 0.15, z: p.z, vx: d[0] * 50, vy: d[1] * 50, vz: d[2] * 50, t: 0, hit: [], own: 1 });
    lrLocalFx({ k: 'fidNote', v: p.i, x: p.x, y: p.y + 1.45, z: p.z, m: p.noteN, tune: p.allT > 0 ? 2 : p.tune | 0 });
  },
  // the bot (the generic one shoots and keeps him by the hurt): Slow Air while anyone near is hurt, Hornpipe on the
  // move; the call for a hurt crew, the reel on anyone on top of him, All Hands in a real fight with the crew about him
  bot(p, ai, B) {
    const { S, I, tg, hpF, hurt, foes, pals } = B;
    const near = pals.filter(f => f.q.alive && f.d < 9.5), missing = near.reduce((s, f) => s + f.q.maxHp - f.q.hp, 0), low = near.some(f => f.q.hp / f.q.maxHp < 0.45);
    const fight = foes.filter(f => f.d < 24).length;
    if (p.ult >= 1 && near.length + 1 >= Math.max(2, S.clump) && fight >= 2 && (missing > 150 || fight >= 3 || hpF < 0.6)) { I.ult = true; return; }
    if (hurt && hpF < 0.4) ai.retreat = true;
    if (p.cd.a1 <= 0 && (missing >= 130 || low || (hpF < 0.5 && hurt))) { I.a1 = true; return; }
    if (p.cd.a2 <= 0) { const close = foes.filter(f => f.d < 5.5); if (close.length >= 2 || (close.length && (hurt || hpF < 0.7 || (LR_HEROES[close[0].q.hero] || {}).melee))) { I.a2 = true; return; } }
    const want = missing > 50 || near.some(f => f.q.hp / f.q.maxHp < 0.9) || !near.length ? 0 : (!tg || ai.tgtD > 14 ? 1 : 0);
    if (want !== (p.tune | 0) && !(p.allT > 0) && LRM.t - (ai.tuneAt || -9) > 4) { ai.tuneAt = LRM.t; I.alt = true; }
  },
  // his crosshair: a ring with four short ticks; the tune's name under it for a moment after a change
  cross(c, cx, cy, me) {
    c.beginPath(); c.arc(cx, cy, 9, 0, 7); c.stroke(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(cx + dx * 12, cy + dy * 12); c.lineTo(cx + dx * 17, cy + dy * 17); c.stroke(); } c.beginPath(); c.arc(cx, cy, 1.6, 0, 7); c.fill();
    if (me.act.k === 'alt' || me.allT > 0) { const T = LRH_FIDDLER_TUNES[me.tune ? 1 : 0]; c.fillStyle = me.allT > 0 ? '#fff0a0' : '#' + T.col.toString(16).padStart(6, '0'); c.font = '600 12px "Courier Prime", monospace'; c.textAlign = 'center'; c.fillText(me.allT > 0 ? 'All Hands · ' + Math.ceil(me.allT) : T.n, cx, cy + 34); }
  },
});
// the sharp note: flies straight at 50 m/s, bending (up to 1.6 rad/s) towards an enemy within 4 degrees of its line
// and 40 m; 20 to the first enemy or wall it meets
lrDefProj('fidNote', { grav: false, own: true, step(j, dt, M) {
  const { sx, sy, sz, L, dx, dy, dz, a } = M;
  const h = lrRayHit(sx, sy, sz, dx, dy, dz, { team: j.team, skip: j.owner, pad: 0.15, max: L });
  if (h.t < L) { if (h.p) lrHurt(h.p, 20, a, 'fidNote'); else if (h.wall) lrWallHurt(h.wall, 20, a); lrFxPush('spark', { x: h.x, y: h.y, z: h.z, bolt: 1 }); return true; }
  let best = null, ba = 0.07;
  for (const q of LRM.P) {
    if (!q.alive || q.team === j.team) continue; const ox = q.x - sx, oy = q.y + q.h * 0.6 - sy, oz = q.z - sz, l = Math.hypot(ox, oy, oz); if (l > 40 || l < 0.5) continue;
    const an = Math.acos(lrClamp((ox * dx + oy * dy + oz * dz) / l, -1, 1)); if (an < ba) { ba = an; best = [ox / l, oy / l, oz / l]; }
  }
  if (best) { const v = L / dt, k = Math.min(1, 1.6 * dt / Math.max(ba, 1e-3)); const nx = dx + (best[0] - dx) * k, ny = dy + (best[1] - dy) * k, nz = dz + (best[2] - dz) * k, n = Math.hypot(nx, ny, nz) || 1; j.vx = nx / n * v; j.vy = ny / n * v; j.vz = nz / n * v; }
  return j.t > 1.1;
} });
// the aura: a zone that follows him while he lives; Slow Air mends allies (not himself) 22 a second, Hornpipe quickens
// them (and him) by a quarter; under All Hands both at double strength, and every ally within 20 m takes 40% less
lrDefZone('fidAura', {
  tick(z, dt, a) {
    if (!a || !a.alive || a.hero !== 'fiddler' || LRM.ph === 'over') { z.t = 0; return; }
    z.t = 1; z.x = a.x; z.y = a.y; z.z = a.z; z.r = 8;
    if (a.allT > 0) for (const q of LRM.P) if (q.alive && q.team === a.team && Math.hypot(q.x - a.x, q.z - a.z) <= 20 && Math.abs(q.y - a.y) < 6 && !(q.drT > 0.3 && q.dr < 0.6)) lrGuard(q, 0.6, 0.25);
  },
  touch(z, q, dt, a) {
    if (z.t <= 0 || !a || q.team !== z.team) return;
    const both = a.allT > 0, k = both ? 2 : 1;
    // (what the aura mends fills his ultimate at half the rate: it's always playing)
    if ((both || !a.tune) && q !== a) { const d = lrHeal(q, 22 * k * dt, a); a.ult = Math.max(0, a.ult - d * 0.5 / LR_HEROES.fiddler.ultCost); }
    if (both || a.tune) lrSlow(q, 1 + 0.25 * k, 0.2, 'fidPipe');
  },
});
lrDefEvent('fidNote', { own: true, sound: (f, at) => at('fidNote' + (f.tune === 2 ? 2 : f.tune ? 1 : 0) + ((f.m | 0) % 8), 0.9) });
lrDefEvent('fidTune', { own: true, sound: (f, at) => at(f.tune ? 'fidPipe' : 'fidAir') });
lrDefEvent('fidCall', { sound: (f, at) => at('fidCall', 1.2) });
lrDefEvent('fidReel', { sound: (f, at) => at('fidReel', 1.2), shake: (f, me) => LRM.P[f.v] && me.team !== LRM.P[f.v].team && Math.hypot(f.x - me.x, f.z - me.z) < 6.5 ? 0.35 : 0 });
lrDefEvent('fidAll', { sound: (f, at) => at('fidAll', 1.5) });
// the fiddle: a bowed note is a sawtooth with a softer octave over it, a quick swell and a slower fade
function lrhFiddlerBowed(f, v, e, dur, delay) { const o = { pan: e.pan, delay: delay || 0 }; tone(f, 'sawtooth', 0.025, 0.05 * v, dur, o); tone(f * 2, 'triangle', 0.02, 0.035 * v, dur * 0.9, o); tone(f * 1.003, 'sine', 0.03, 0.05 * v, dur * 1.1, o); }
for (let tn = 0; tn < 3; tn++) for (let n = 0; n < 8; n++) lrDefSnd('fidNote' + tn + n, (v, e) => { const T = LRH_FIDDLER_TUNES[tn === 2 ? n % 2 : tn]; lrhFiddlerBowed(T.notes[n] * (tn === 2 ? 1.5 : 1), v, e, tn === 1 ? 0.14 : 0.22); if (tn === 2) lrhFiddlerBowed(T.notes[n] * 0.75, v * 0.8, e, 0.22); });
lrDefSnd('fidAir', (v, e) => { [392, 494, 440, 392].forEach((f, i) => lrhFiddlerBowed(f, v, e, 0.32, i * 0.16)); });
lrDefSnd('fidPipe', (v, e) => { [587, 740, 880, 740, 988].forEach((f, i) => lrhFiddlerBowed(f, v, e, 0.11, i * 0.07)); });
lrDefSnd('fidCall', (v, e) => { for (let i = 0; i < 6; i++) tone(i % 2 ? 2350 : 2050, 'sine', 0.004, 0.09 * v, 0.07, { pan: e.pan, delay: i * 0.06 }); tone(1900, 'sine', 0.01, 0.12 * v, 0.5, { to: 2600, pan: e.pan, delay: 0.36 }); });
lrDefSnd('fidReel', (v, e, rec, o) => { [659, 784, 880, 988, 1175, 988, 880, 1175].forEach((f, i) => lrhFiddlerBowed(f, v * 1.2, e, 0.07, i * 0.04)); noise('lowpass', 260, 1, 0.002, 0.35 * v, 0.2, o); noise('lowpass', 300, 1, 0.002, 0.3 * v, 0.18, Object.assign({}, o, { delay: 0.22 })); });
lrDefSnd('fidAll', (v, e) => { [392, 392, 440, 494, 392, 494, 587, 523, 494, 440].forEach((f, i) => { lrhFiddlerBowed(f, v, e, 0.24, i * 0.17); lrhFiddlerBowed(f * 1.5, v * 0.6, e, 0.24, i * 0.17); tone(f / 2, 'triangle', 0.03, 0.06 * v, 0.25, { pan: e.pan, delay: i * 0.17 }); }); });

// ---------- the art ----------
// (built from src/lrhero.js's rig and batch helpers: lrhRig, lrhLegs, lrhArms, lrhBase, lrhDead, lrhHands, lrBatch)
// a note drawn on a canvas (0: a quaver, 1: two beamed), white, for sprites to tint
function lrhFiddlerNoteTex(k) {
  const key = 'fidNote' + k; if (LRHM.tex[key]) return LRHM.tex[key];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gl = x.createRadialGradient(32, 32, 2, 32, 32, 32); gl.addColorStop(0, 'rgba(255,255,255,0.35)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gl; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 4.5; x.lineCap = 'round';
  const head = (hx, hy) => { x.save(); x.translate(hx, hy); x.rotate(-0.45); x.beginPath(); x.ellipse(0, 0, 8.5, 6, 0, 0, 7); x.fill(); x.restore(); };
  if (!k) { head(26, 46); x.beginPath(); x.moveTo(33.5, 44); x.lineTo(33.5, 12); x.stroke(); x.beginPath(); x.moveTo(33.5, 12); x.quadraticCurveTo(46, 20, 44, 32); x.stroke(); }
  else { head(18, 48); head(42, 42); x.beginPath(); x.moveTo(25.5, 46); x.lineTo(25.5, 16); x.moveTo(49.5, 40); x.lineTo(49.5, 10); x.stroke(); x.lineWidth = 7; x.beginPath(); x.moveTo(25.5, 16); x.lineTo(49.5, 10); x.stroke(); }
  return (LRHM.tex[key] = new THREE.CanvasTexture(c));
}
// the fiddle into batch b (its chin end at the origin, the scroll along -z, the top +y; the strings glowing gl, a
// ribbon rib on the scroll), and the bow (the frog at the origin, the stick along -x, the hair along y 0)
function lrhFiddlerFiddle(b, gl, rib) {
  const wood = 0x9a4a1c, top = 0xb8642a, ebony = 0x1a1410;
  b.L.add('sph:10', wood, 0, 0, -0.08, 0, 0, 0, 0.105, 0.034, 0.095); b.L.add('sph:10', wood, 0, 0, -0.25, 0, 0, 0, 0.088, 0.034, 0.078);
  b.L.add('box', wood, 0, 0, -0.165, 0, 0, 0, 0.12, 0.066, 0.1); b.L.add('sph:10', top, 0, 0.012, -0.16, 0, 0, 0, 0.08, 0.026, 0.14);
  for (const s of [-1, 1]) { b.L.add('box', ebony, s * 0.035, 0.036, -0.155, 0, 0, s * 0.2, 0.006, 0.004, 0.05); b.L.add('box', 0xe8c080, s * 0.1, 0, -0.165, 0, 0, 0, 0.012, 0.03, 0.06); }
  b.L.add('box', ebony, 0, 0.034, -0.02, 0, 0, 0, 0.05, 0.02, 0.05);                                     // the chin rest
  b.L.add('box', ebony, 0, 0.04, -0.07, 0, 0, 0, 0.034, 0.01, 0.06);                                     // the tailpiece
  b.L.add('box', 0xe8d8b0, 0, 0.048, -0.135, 0, 0, 0, 0.05, 0.026, 0.006);                               // the bridge
  b.L.add('box', ebony, 0, 0.04, -0.3, 0, 0, 0, 0.034, 0.012, 0.25);                                     // the fingerboard
  b.L.add('box', wood, 0, 0.018, -0.4, 0, 0, 0, 0.028, 0.028, 0.15);
  b.L.add('box', wood, 0, 0.02, -0.5, 0, 0, 0, 0.03, 0.04, 0.07); b.L.add('sph:8', wood, 0, 0.03, -0.55, 0, 0, 0, 0.026, 0.03, 0.026);
  for (let k = 0; k < 4; k++) b.L.add('cyl:5', ebony, 0, 0.022, -0.475 - k * 0.018, 0, 0, Math.PI / 2, 0.006, 0.08, 0.006);
  for (let k = 0; k < 4; k++) b.G.add('box', gl, -0.012 + k * 0.008, 0.052, -0.27, 0, 0, 0, 0.0025, 0.0025, 0.42);
  if (rib) { b.L.add('box', rib, 0.02, 0.0, -0.53, 0, 0, 0.3, 0.012, 0.09, 0.02); b.L.add('box', rib, -0.015, -0.01, -0.52, 0, 0, -0.4, 0.012, 0.08, 0.02); }
}
function lrhFiddlerBow(b) {
  b.L.add('cyl:5', 0x3a2418, -0.36, 0.022, 0, 0, 0, Math.PI / 2, 0.0055, 0.74, 0.0055);
  b.L.add('box', 0xf0ead8, -0.35, 0, 0, 0, 0, 0, 0.66, 0.004, 0.009);
  b.L.add('box', 0x141010, 0, 0.012, 0, 0, 0, 0, 0.04, 0.03, 0.016); b.L.add('box', 0xc8c8c8, 0.024, 0.02, 0, 0, 0, 0, 0.012, 0.012, 0.012);
  b.L.add('box', 0xe8e0d0, -0.72, 0.012, 0, 0, 0, 0, 0.014, 0.032, 0.01);
}
// a point on the bow (in its own space) in the spine's
const lrhFiddlerAt = (fid, bow, x, y, z, out) => { fid.updateMatrix(); bow.updateMatrix(); return out.set(x, y, z).applyMatrix4(bow.matrix).applyMatrix4(fid.matrix); };
// ---------- Fiddler: the old fiddler of the Mermaid ----------
function lrhFiddler(team) {
  const m = lrhRig('fiddler', team), TC = m.TC, t = m.team;
  const coat = t ? 0xa63c31 : 0x2d5c8e, coat2 = t ? 0x8a2f27 : 0x24507e, facing = t ? 0x2a2522 : TC.main, waist = t ? 0x332b27 : 0xd8a838, breech = 0x4a3a2c, patch = 0x8a7050, patch2 = 0x5a6a48, hat = 0x1e1a18, white = 0xf2f0ea;
  lrhLegs(m, 0.1, 0.48, 0.46, (L, S, s, a, b) => {
    L.L.add('cyl:8:1.25', breech, 0, -a / 2, 0, 0, 0, 0, 0.078, a, 0.078);
    L.L.add('box', LRH_BRASS, s * 0.06, -a + 0.04, -0.03, 0, 0, 0, 0.02, 0.025, 0.02);
    S.L.add('cyl:8', 0xe8e0cc, 0, -b * 0.42, 0, 0, 0, 0, 0.06, b * 0.84, 0.06);                         // stockings, striped in the crew's colour
    for (let k = 0; k < 4; k++) S.L.add('cyl:8', TC.main, 0, -0.08 - k * 0.075, 0, 0, 0, 0, 0.062, 0.028, 0.062);
    S.L.add('box', 0x1a1614, 0, -b + 0.035, -0.045, 0, 0, 0, 0.1, 0.07, 0.24); S.L.add('box', LRH_BRASS, 0, -b + 0.075, -0.1, 0, 0, 0, 0.06, 0.02, 0.03);
  });
  m.P(m.hips).L.add('cyl:10', breech, 0, -0.03, 0, 0, 0, 0, 0.15, 0.14, 0.11);
  m.spine = lrhNode(m.hips, 0, 0.05, 0, 'spine');
  const sp = m.P(m.spine);
  // the frock coat open over the waistcoat, its lapels and buttons, patches on the back, a white neckcloth
  sp.L.add('cyl:10:1.2', coat, 0, 0.2, 0.01, 0, 0, 0, 0.16, 0.44, 0.12);
  sp.L.add('box', waist, 0, 0.17, -0.105, 0, 0, 0, 0.16, 0.34, 0.03);
  for (let k = 0; k < 5; k++) sp.L.add('sph:4', LRH_BRASS, 0.04, 0.04 + k * 0.06, -0.123, 0, 0, 0, 0.012);
  for (const s of [-1, 1]) sp.L.add('box', facing, s * 0.095, 0.28, -0.115, 0, 0, s * 0.18, 0.05, 0.3, 0.025);
  sp.L.add('box', patch, 0.05, 0.25, 0.13, 0, 0, 0.12, 0.11, 0.12, 0.012); sp.L.add('box', 0x3a2a1a, 0.05, 0.25, 0.137, 0, 0, 0.12, 0.112, 0.006, 0.004);
  sp.L.add('box', patch2, -0.08, 0.1, 0.125, 0, 0, -0.1, 0.07, 0.08, 0.012);
  sp.L.add('sph:8', white, 0, 0.42, -0.07, 0, 0, 0, 0.07, 0.06, 0.05); sp.L.add('box', white, 0, 0.36, -0.12, 0, 0, 0, 0.05, 0.08, 0.02);
  sp.L.add('cyl:10', coat, 0, 0.44, 0, 0, 0, 0, 0.08, 0.06, 0.08);
  for (const s of [-1, 1]) sp.L.add('box', facing, s * 0.12, 0.4, -0.02, 0, 0, s * 0.3, 0.12, 0.05, 0.2);   // the collar turned out
  m.head = lrhNode(m.spine, 0, 0.5, 0, 'head');
  const hd = m.P(m.head);
  hd.L.add('sph:10', 0xdca890, 0, 0.11, 0, 0, 0, 0, 0.1, 0.115, 0.105);
  hd.L.add('sph:6', 0xd07a68, 0, 0.09, -0.112, 0, 0, 0, 0.032, 0.034, 0.036);                            // a fiddler's nose
  for (const s of [-1, 1]) {
    hd.L.add('sph:4', 0x201814, s * 0.04, 0.135, -0.094, 0, 0, 0, 0.012);
    hd.L.add('box', white, s * 0.042, 0.162, -0.098, 0, 0, s * -0.25, 0.05, 0.022, 0.022);               // bushy brows
    hd.L.add('sph:6', white, s * 0.08, 0.055, -0.035, 0, 0, s * 0.15, 0.04, 0.09, 0.06);                 // mutton-chop whiskers
    hd.L.add('sph:6', white, s * 0.04, 0.062, -0.104, 0, 0, s * 0.45, 0.055, 0.02, 0.028);               // the drooping moustache
    hd.L.add('sph:6', 0xd8d4cc, s * 0.075, 0.12, 0.05, 0, 0, 0, 0.035, 0.045, 0.055);
  }
  hd.L.add('sph:6', 0xd8d4cc, 0, 0.1, 0.075, 0, 0, 0, 0.075, 0.055, 0.04);
  // the battered top hat, tipped over one eye, its band and ribbons in the crew's colours, a playing card in the band
  m.hat = lrhNode(m.head, 0.01, 0.2, 0, 'hat'); m.hat.rotation.set(-0.08, 0, -0.14);
  const ht = m.P(m.hat);
  ht.L.add('cyl:14', hat, 0, 0, 0, 0, 0, 0, 0.175, 0.016, 0.165); ht.L.add('cyl:10:1.1', hat, 0, 0.115, 0, 0, 0, 0.04, 0.105, 0.22, 0.1);
  ht.L.add('cyl:10', 0x2e2824, 0.006, 0.228, 0, 0, 0, 0.1, 0.112, 0.012, 0.106); ht.L.add('box', 0x2e2824, 0.07, 0.17, -0.06, 0.3, 0.6, 0.4, 0.06, 0.08, 0.02);
  ht.L.add('cyl:10', TC.main, 0, 0.035, 0, 0, 0, 0, 0.108, 0.045, 0.103);
  ht.L.add('box', 0xf4f0e0, -0.06, 0.075, -0.08, 0, 0.6, 0.15, 0.04, 0.06, 0.004); ht.L.add('box', 0xc8302a, -0.06, 0.08, -0.083, 0, 0.6, 0.15, 0.012, 0.012, 0.003);
  m.rib = lrhNode(m.hat, 0, 0.04, 0.1); { const R = m.P(m.rib); R.L.add('box', TC.main, 0.025, -0.13, 0.005, 0, 0, 0.12, 0.03, 0.26, 0.008); R.L.add('box', t ? 0x1a1614 : TC.trim, -0.02, -0.11, 0.0, 0, 0, -0.1, 0.03, 0.22, 0.008); }
  lrhArms(m, 0.19, 0.41, 0, 0.3, 0.29, (A, F, H, s, a, b) => {
    A.L.add('sph:8', coat, 0, 0, 0, 0, 0, 0, 0.075, 0.07, 0.075);
    A.L.add('cyl:8:1.1', coat, 0, -a / 2, 0, 0, 0, 0, 0.052, a, 0.052);
    F.L.add('box', s < 0 ? patch : patch2, 0, -0.02, 0.045, 0, 0, 0, 0.06, 0.07, 0.02);                  // patched elbows
    F.L.add('cyl:8', coat, 0, -b * 0.4, 0, 0, 0, 0, 0.048, b * 0.8, 0.048);
    F.L.add('cyl:8', facing, 0, -b * 0.8, 0, 0, 0, 0, 0.068, 0.08, 0.068);                                // the big turned-back cuffs
    F.L.add('cyl:8:1.3', white, 0, -b * 0.96, 0, 0, 0, 0, 0.036, 0.03, 0.036);
    H.L.add('box', 0xdca890, 0, -0.035, 0, 0, 0, 0, 0.05, 0.08, 0.07);
  });
  // the coat's skirts, to the knee, that swing as he goes
  m.coat = [];
  for (const [x, z, ry, w, l] of [[-0.075, 0.09, 0.1, 0.15, 0.6], [0.075, 0.09, -0.1, 0.15, 0.6], [-0.135, -0.01, -Math.PI / 2 + 0.25, 0.18, 0.52], [0.135, -0.01, Math.PI / 2 - 0.25, 0.18, 0.52], [-0.09, -0.085, Math.PI - 0.3, 0.09, 0.48], [0.09, -0.085, Math.PI + 0.3, 0.09, 0.48]]) {
    const pv = lrhNode(m.hips, x, 0.08, z); pv.rotation.y = ry; const panel = lrhNode(pv, 0, 0, 0); const B = m.P(panel);
    B.L.add('box', coat2, 0, -l / 2, 0.02, 0, 0, 0, w, l, 0.025); B.L.add('box', facing, 0, -l + 0.02, 0.022, 0, 0, 0, w, 0.04, 0.03);
    if (x > 0 && z > 0) B.L.add('box', patch, 0.01, -0.36, 0.036, 0, 0, 0.2, 0.08, 0.09, 0.008);
    m.coat.push(panel);
  }
  // the fiddle under his chin (pointing out to his left), the bow in his right hand (a child of the fiddle, to play it)
  m.fid = lrhNode(m.spine, -0.12, 0.45, -0.13, 'fiddle'); m.fid.rotation.order = 'YXZ';
  lrhFiddlerFiddle(m.P(m.fid), TC.glow, TC.main);
  m.bow = lrhNode(m.fid, 0.36, 0.058, -0.12, 'bow'); lrhFiddlerBow(m.P(m.bow));
  m.muzzle = lrhNode(m.fid, 0, 0.07, -0.16, 'muzzle');
  m.fidGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.fidGlow.position.set(0, 0.06, -0.16); m.fidGlow.scale.setScalar(0.5); m.fid.add(m.fidGlow);
  // the bosun's pipe, in his right hand while he blows it
  m.pipe = lrhNode(m.handR, 0, -0.07, -0.02); { const B = m.P(m.pipe); B.L.add('cyl:6', LRH_BRASS, 0, 0, -0.05, Math.PI / 2, 0, 0, 0.01, 0.12, 0.01); B.L.add('sph:6', LRH_BRASS, 0, -0.012, 0.02, 0, 0, 0, 0.025); B.L.add('box', LRH_BRASS, 0, -0.02, -0.04, 0, 0, 0, 0.006, 0.03, 0.05); } m.pipe.visible = false;
  m.anim = lrhFiddlerAnim;
  return m.finish();
}

function lrhFiddlerAnim(m, pose, dt) {
  lrhBase(m, pose, dt);
  const act = pose.act || {}, k = act.k, t = act.t || 0, p = pose.pitch || 0, st = m.st;
  const V = m.v || (m.v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() }), fid = m.fid, bow = m.bow;
  // an old man's stoop, his head laid over on the fiddle
  m.spine.rotation.x += 0.08 + p * 0.18;
  m.head.rotation.x += p * 0.45 - 0.05; m.head.rotation.y = 0.28; m.head.rotation.z = 0.2;
  // always playing: long easy strokes; a quick hard one for each note fired (each the other way to the last)
  st.bt = (st.bt || 0) + dt * (2.4 + Math.min(1, st.run) * 2);
  let s = Math.sin(st.bt) * 0.16, glow = 0.25;
  const fz = pose.fire != null && pose.fire >= 0 && pose.fire < 0.22;
  if (fz) { if (st.lastF == null || pose.fire < st.lastF) st.fdir = -(st.fdir || 1); s = st.fdir * (-0.22 + 0.44 * lrhSm(0, 0.13, pose.fire)); glow = 1 - pose.fire / 0.22; }
  st.lastF = pose.fire;
  fid.position.set(-0.12, 0.45, -0.13); fid.rotation.set(0.12 + p * 0.3, 0.75, -0.5);
  bow.position.set(0.36 + s, 0.058, -0.12); bow.rotation.set(0, 0.1, -0.06);
  const r = Math.min(1, st.run);
  let TL = null, TR = null, pipe = false;
  // a change of tune: the bow lifted off in a flourish and brought down again
  if (k === 'alt' && t < 0.45) { const u = Math.sin(t / 0.45 * Math.PI); bow.position.y += 0.22 * u; bow.position.x += 0.08 * u; bow.rotation.z += 1.1 * u; fid.rotation.x += 0.25 * u; glow = Math.max(glow, u); }
  // the bosun's call: the bow laid along the neck in his left hand, the pipe up to his lips in his right
  if (k === 'a1' && t < 0.9) {
    const w = lrhSm(0, 0.15, t) * (1 - lrhSm(0.75, 0.9, t)); pipe = w > 0.3;
    bow.position.lerp(V.c.set(0.03, -0.035, 0.08), w); bow.rotation.set(0, lrhLerp(0.1, -Math.PI / 2, w), lrhLerp(-0.06, 0, w));
    fid.rotation.x -= 0.35 * w; fid.position.y -= 0.06 * w;
    m.head.rotation.x -= 0.2 * w; m.head.rotation.y *= 1 - w; m.head.rotation.z *= 1 - w;
    if (w > 0) TR = lrhFiddlerAt(fid, bow, 0.006, 0.012, 0, V.b).lerp(V.d.set(0.03, 0.56, -0.2), w);
  }
  // the reel: a hop and a stamp, the bow sawing like fury
  if (k === 'a2' && t < 0.6) {
    const u = Math.sin(t / 0.6 * Math.PI); s = Math.sin(t * 42) * 0.22; glow = 1;
    m.body.position.y += 0.14 * u; m.legR.rotation.x += 0.9 * u; m.shinR.rotation.x -= 1.0 * u; m.legL.rotation.x -= 0.2 * u;
    m.spine.rotation.y += 0.35 * Math.sin(t / 0.6 * Math.PI * 2); bow.position.x = 0.36 + s;
  }
  // All Hands: the fiddle up high, his head back to sing, the bow going hard and a foot stamping time
  if (k === 'ult' && t < 1.6) {
    const u = lrhSm(0, 0.25, t) * (1 - lrhSm(1.35, 1.6, t)); s = Math.sin(t * 30) * 0.22; glow = 1.4 * u + glow * (1 - u);
    fid.rotation.x += 0.45 * u; fid.position.y += 0.05 * u; m.spine.rotation.x -= 0.25 * u; m.head.rotation.x -= 0.35 * u;
    const st2 = Math.max(0, Math.sin(t * 9)); m.legL.rotation.x += 0.4 * st2 * u; m.shinL.rotation.x -= 0.5 * st2 * u; bow.position.x = 0.36 + s;
  }
  // the reload: tuning up, a hand at the pegs
  if (pose.reload > 0 && k !== 'a1') { bow.position.set(0.42, -0.06, -0.05); bow.rotation.set(0, 0.2, 0.5); fid.rotation.x += 0.2; TR = lrhAt(fid, 0.03, 0.04, -0.5, V.b); m.head.rotation.x += 0.15; }
  // the coat swings as he goes; the ribbons stream
  m.coat.forEach((c, i) => { const sw = i < 2 ? 0.3 * r + Math.abs(Math.sin(st.ph)) * 0.1 * r : i < 4 ? 0.08 * r : Math.max(0, i === 4 ? m.legL.rotation.x : m.legR.rotation.x) * 0.8; c.rotation.set(-(0.06 + sw + st.air * 0.35), 0, 0); });
  st.tt = (st.tt || 0) + dt; m.rib.rotation.set(0.15 + r * 0.7 + st.air * 0.4 + Math.sin(st.tt * 9) * 0.12 * (0.3 + r), 0, Math.sin(st.tt * 5) * 0.1);
  if (!TL) TL = lrhAt(fid, 0, -0.005, -0.44, V.a);
  if (!TR) TR = lrhFiddlerAt(fid, bow, 0.006, 0.012, 0, V.b);
  m.pipe.visible = pipe;
  if (lrhDead(m, pose, 1)) { TL = V.a.set(-0.5, 0.25, 0.1); TR = V.b.set(0.5, 0.2, 0.15); fid.position.set(-0.45, -0.3, -0.1); fid.rotation.set(-1.2, 0.4, 0.4); bow.position.set(0.6, -0.2, 0.2); m.coat.forEach(c => c.rotation.set(0, 0, 0)); glow = 0; m.pipe.visible = false; }
  lrhHands(m, TL, TR, null, V.c.set(0.9, -0.7, 0.5));
  m.glow.color.setScalar(0.55 + glow * 0.6); m.fidGlow.material.opacity = 0.15 + glow * 0.6; m.fidGlow.scale.setScalar(0.35 + glow * 0.4);
}

// the hands, the fiddle and the bow in first person: the fiddle out from under his chin to the lower left, the bow
// across it from the lower right (V: what src/lrhero.js's lrViewModel gives a view to build in)
function lrhFiddlerView(V) {
  const { root, st, mk, B, flashSpr } = V; let muzzle, anim;
  const me = typeof lrMe === 'function' ? lrMe() : null, TC = LRH_TEAM[me && me.team ? 1 : 0], cuff = me && me.team ? 0x2a2522 : TC.main, sleeve = me && me.team ? 0xa63c31 : 0x2d5c8e;
  const fid = mk(root, -0.2, -0.27, -0.24); fid.rotation.order = 'YXZ';
  const fb = B(fid); lrhFiddlerFiddle(fb, TC.glow, TC.main);
  const bow = mk(fid, 0.36, 0.058, -0.12), bb = B(bow); lrhFiddlerBow(bb);
  // his right hand on the frog, its cuff; his left round the neck, fingers on the board
  const hR = mk(bow, 0.0, 0.0, 0.0), r = B(hR);
  r.L.add('box', 0xdca890, 0.01, 0.0, 0.0, 0, 0, 0, 0.05, 0.06, 0.06); r.L.add('box', 0xdca890, -0.02, 0.01, -0.03, 0, 0, 0, 0.03, 0.02, 0.03);
  r.L.add('cyl:8:1.4', 0xf2f0ea, 0.05, -0.02, 0.03, 0, 0, -1.2, 0.03, 0.04, 0.03); r.L.add('cyl:8', cuff, 0.09, -0.04, 0.05, 0, 0, -1.2, 0.05, 0.06, 0.05); r.L.add('cyl:8', sleeve, 0.17, -0.08, 0.08, 0, 0, -1.2, 0.042, 0.14, 0.042);
  const hL = mk(fid, 0, 0.0, -0.44), l = B(hL);
  l.L.add('box', 0xdca890, -0.02, -0.01, 0, 0, 0, 0, 0.03, 0.06, 0.05); for (let k = 0; k < 3; k++) l.L.add('box', 0xdca890, 0.012, 0.035, 0.02 - k * 0.022, 0, 0, 0, 0.03, 0.012, 0.014);
  l.L.add('cyl:8:1.4', 0xf2f0ea, -0.04, -0.03, 0.03, 0.9, 0, 0.4, 0.028, 0.04, 0.028); l.L.add('cyl:8', cuff, -0.06, -0.06, 0.06, 0.9, 0, 0.4, 0.045, 0.06, 0.045); l.L.add('cyl:8', sleeve, -0.1, -0.12, 0.12, 0.9, 0, 0.4, 0.04, 0.16, 0.04);
  // the bosun's pipe, raised in a hand of its own
  const pp = mk(root, 0.16, -0.42, -0.3), pb = B(pp);
  pb.L.add('box', 0xdca890, 0, 0, 0, 0, 0, 0, 0.05, 0.05, 0.07); pb.L.add('cyl:6', LRH_BRASS, -0.01, 0.03, -0.06, 1.4, 0.4, 0, 0.008, 0.1, 0.008); pb.L.add('sph:6', LRH_BRASS, -0.03, 0.04, -0.11, 0, 0, 0, 0.02); pb.L.add('cyl:8', cuff, 0.02, -0.05, 0.05, 0.8, 0, 0, 0.042, 0.06, 0.042);
  pp.visible = false;
  const tg = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xffffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); tg.position.set(0, 0.06, -0.17); tg.scale.setScalar(0.16); fid.add(tg);
  const fl = flashSpr(0xffffff, 0.12); fl.material.map = lrhFiddlerNoteTex(0); fl.position.set(0, 0.12, -0.22); fid.add(fl);
  muzzle = mk(fid, 0, 0.07, -0.16);
  anim = (s, dt) => {
    const k = s.act && s.act.k, t = (s.act && s.act.t) || 0, M = typeof lrMe === 'function' ? lrMe() : null, tune = M && M.allT > 0 ? 2 : M && M.tune ? 1 : 0;
    st.bt = (st.bt || 0) + dt * (tune === 1 ? 6 : tune === 2 ? 9 : 2.6);
    let bs = Math.sin(st.bt) * 0.1, gk = 0.45, lift = 0, tilt = 0;
    const fz = s.fire != null && s.fire >= 0 && s.fire < 0.22;
    if (fz) { if (st.lastF == null || s.fire < st.lastF) st.fdir = -(st.fdir || 1); bs = st.fdir * (-0.2 + 0.4 * lrhSm(0, 0.12, s.fire)); gk = 1.2 - s.fire * 3; }
    st.lastF = s.fire;
    fid.position.set(-0.2, -0.27, -0.24); fid.rotation.set(0.2, 0.95, -0.3);
    bow.position.set(0.34 + bs, 0.058, -0.12); bow.rotation.set(0, 0.1, -0.05); pp.visible = false;
    if (k === 'alt' && t < 0.45) { const u = Math.sin(t / 0.45 * Math.PI); lift = 0.16 * u; tilt = 1.0 * u; gk = 1.2; }
    if (k === 'a1' && t < 0.9) { const w = lrhSm(0, 0.12, t) * (1 - lrhSm(0.75, 0.9, t)); bow.position.y -= 0.35 * w; bow.position.x += 0.1 * w; pp.visible = w > 0.05; pp.position.set(lrhLerp(0.16, 0.05, w), lrhLerp(-0.42, -0.19, w), lrhLerp(-0.3, -0.24, w)); pp.rotation.set(0.3 * w, 0, 0); fid.position.y -= 0.05 * w; }
    if (k === 'a2' && t < 0.6) { const u = Math.sin(t / 0.6 * Math.PI); bs = Math.sin(t * 40) * 0.2; bow.position.x = 0.34 + bs; fid.position.y += 0.04 * u; fid.rotation.z -= 0.25 * u; gk = 1.4; }
    if (k === 'ult' && t < 1.6) { const u = lrhSm(0, 0.25, t) * (1 - lrhSm(1.35, 1.6, t)); bs = Math.sin(t * 28) * 0.2; bow.position.x = 0.34 + bs; fid.position.y += 0.07 * u; fid.rotation.x += 0.25 * u; gk = 1 + u; }
    if (s.reload > 0) { const q = Math.min(1, s.reload * 4); bow.position.y -= 0.25 * q; fid.rotation.x += 0.3 * q; fid.position.y -= 0.03 * q; }
    bow.position.y += lift; bow.rotation.z += tilt;
    const T = tune === 2 ? 0xfff0a0 : LRH_FIDDLER_TUNES[tune].col; tg.material.color.setHex(T); tg.material.opacity = Math.min(1, 0.3 + gk * 0.4);
    fl.material.color.setHex(T); fl.material.opacity = fz && s.fire < 0.15 ? 1 - s.fire / 0.15 : 0; fl.position.y = 0.1 + (fz ? s.fire * 0.6 : 0);
  };
  return { muzzle, anim };
}
lrDefHeroArt('fiddler', { spec: { h: 1.8, hipY: 0.95, stride: 1.65, spd: 5.6 }, model: lrhFiddler, view: lrhFiddlerView, portraitY: 0.32 });

// the sharp note in flight: a glowing note that turns to face you, a trail of light behind it
lrDefProjArt('fidNote', (g, TC, add) => {
  const core = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: lrhFiddlerNoteTex(Math.random() < 0.5 ? 0 : 1), color: 0xffffff, transparent: true, opacity: 1, depthWrite: false }))); core.scale.setScalar(0.42);
  const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))); s.scale.setScalar(0.8);
  lrhTrailer(g, core, 5, new THREE.SpriteMaterial({ map: lrGlowTex(), color: TC.glow, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }), 0.45);
  g.children.forEach(c => { if (c.isSprite && c !== s && c !== core) c.scale.setScalar(0.35); });
  const t0 = performance.now(); s.onBeforeRender = () => { core.material.rotation = Math.sin((performance.now() - t0) / 90) * 0.4; };
});
// the aura round him: a ring of 8 m in the crew's colour, a dashed ring turning inside it, notes rising and drifting
// in the tune's colour (green Slow Air, blue Hornpipe, both and gold under All Hands, with the 20 m ring of the shanty)
lrDefZoneArt('fidAura', (g, TC) => {
  const ring = lrhRingMesh(7.8, 8, TC.glow, 0.5); g.add(ring);
  const ring2 = lrhRingMesh(7.2, 7.32, 0xffffff, 0.3); g.add(ring2);
  const dash = new THREE.Group(); g.add(dash); const dg = new THREE.RingGeometry(7.45, 7.6, 6, 1, 0, 0.3), dm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let k = 0; k < 16; k++) { const d = new THREE.Mesh(dg, dm); d.rotation.set(-Math.PI / 2, 0, k / 16 * Math.PI * 2); d.position.y = 0.06; dash.add(d); }
  const fill = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshBasicMaterial({ color: TC.glow, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false })); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.04; g.add(fill);
  const big = lrhRingMesh(19.6, 20, 0xfff0a0, 0); g.add(big);
  const notes = []; for (let k = 0; k < 18; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrhFiddlerNoteTex(k % 3 === 0 ? 1 : 0), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); g.add(s); notes.push({ s, a: Math.random() * 6.28, r: 1.2 + Math.random() * 6.4, p: Math.random(), w: 0.3 + Math.random() * 0.5 }); }
  const cA = new THREE.Color(LRH_FIDDLER_TUNES[0].col), cB = new THREE.Color(LRH_FIDDLER_TUNES[1].col), cG = new THREE.Color(0xfff0a0);
  return (z, dt, T) => {
    const o = LRM.P[z.owner], A = LRM.alpha || 0;
    if (o) g.position.set(o.px + (o.x - o.px) * A, o.py + (o.y - o.py) * A, o.pz + (o.z - o.pz) * A);
    const both = !!(o && o.allT > 0), tune = o && o.tune ? 1 : 0, life = z.t != null ? lrhClamp(z.t / 0.3, 0, 1) : 1, fast = both ? 2.2 : tune ? 1.8 : 0.7;
    ring.material.color.setHex(both ? 0xfff0a0 : TC.glow); ring.material.opacity = (0.4 + Math.sin(T * (both ? 8 : 3)) * 0.12) * life;
    ring2.material.color.copy(tune ? cB : cA); ring2.material.opacity = (both ? 0.5 : 0.28) * life; dm.color.copy(both ? cG : tune ? cB : cA); dm.opacity = 0.4 * life;
    dash.rotation.y = T * (tune || both ? 0.9 : 0.25); fill.material.opacity = (both ? 0.1 : 0.05) * life;
    big.material.opacity = both ? (0.35 + Math.sin(T * 5) * 0.12) * life : 0;
    notes.forEach((q, i) => {
      const u = (T * q.w * fast * 0.5 + q.p) % 1, a = q.a + T * (tune || both ? 0.6 : 0.18) * (i % 2 ? 1 : -1), hop = tune || both ? Math.abs(Math.sin(T * 6 + i)) * 0.25 : 0;
      q.s.position.set(Math.cos(a) * q.r, 0.3 + u * 2.4 + hop, Math.sin(a) * q.r); q.s.scale.setScalar((both ? 0.5 : 0.38) * (0.7 + Math.sin(u * Math.PI) * 0.5));
      q.s.material.color.copy(both ? (i % 2 ? cA : cB) : tune ? cB : cA); q.s.material.opacity = 0.9 * Math.sin(u * Math.PI) * life; q.s.material.rotation = Math.sin(T * 2 + i) * 0.3;
    });
  };
});
// notes flung out (the change of tune, the call, the reel, All Hands): a pool of note sprites of its own
lrDefFx('fidBurst', {
  init(X) { return { pool: X.pool(40, k => ({ obj: new THREE.Sprite(new THREE.SpriteMaterial({ map: lrhFiddlerNoteTex(k % 2), color: 0xffffff, transparent: true, depthWrite: false })), v: new THREE.Vector3() })) }; },
  spawn(o, X, s) {
    for (let k = 0; k < (o.n || 8); k++) {
      const n = X.take(s.pool), a = Math.random() * 6.28 + k, sp = (o.sp || 2) * (0.6 + Math.random() * 0.6);
      n.obj.position.set(o.x + Math.cos(a) * (o.r0 || 0.3), o.y + Math.random() * 0.4, o.z + Math.sin(a) * (o.r0 || 0.3)); n.v.set(Math.cos(a) * sp, (o.up || 1.5) * (0.7 + Math.random() * 0.6), Math.sin(a) * sp);
      n.obj.material.color.setHex(Array.isArray(o.col) ? o.col[k % o.col.length] : o.col || 0xffffff); n.obj.material.opacity = 1; n.obj.scale.setScalar(o.s || 0.35); n.obj.visible = true; n.life = n.max = (o.life || 1) * (0.7 + Math.random() * 0.5);
    }
  },
  update(dt, X, s) { for (const n of s.pool) { if (n.life <= 0) continue; n.life -= dt; if (n.life <= 0) { n.obj.visible = false; continue; } n.v.multiplyScalar(1 - dt * 1.5); n.obj.position.addScaledVector(n.v, dt); n.obj.material.opacity = Math.min(1, n.life / n.max * 2); n.obj.material.rotation = Math.sin(n.life * 8) * 0.4; } },
});
lrDefFx('fidNote', (o, X) => { const T = o.tune === 2 ? 0xfff0a0 : LRH_FIDDLER_TUNES[o.tune ? 1 : 0].col; X.K.fidBurst({ x: o.x, y: o.y, z: o.z, n: 1, col: T, sp: 0.6, up: 1.2, life: 0.6, s: 0.25 }); });
lrDefFx('fidTune', (o, X) => { const T = LRH_FIDDLER_TUNES[o.tune ? 1 : 0].col; X.K.fidBurst({ x: o.x, y: o.y, z: o.z, n: 10, col: T, sp: 2.2, up: 1.6, life: 1.1, s: 0.38 }); X.ring(o.x, X.gy(o.x, o.z) + 0.07, o.z, 0.5, 8, T, 0.6, 0.6); });
lrDefFx('fidCall', (o, X) => { const y = X.gy(o.x, o.z) + 0.08; X.ring(o.x, y, o.z, 0.5, 10, 0xb8ffc8, 0.7, 0.8); X.ring(o.x, y + 0.05, o.z, 0.3, 6, 0xffffff, 0.5, 0.6); X.sprite(o.x, o.y + 1.6, o.z, 0xfff0c0, 1.6, 0.3); X.K.fidBurst({ x: o.x, y: o.y + 1.5, z: o.z, n: 8, col: [0x9cffc0, 0xffffff], sp: 3.5, up: 1, life: 0.9, s: 0.32 }); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, d = 2 + Math.random() * 7; X.sprite(o.x + Math.cos(a) * d, y + 0.2, o.z + Math.sin(a) * d, 0x9cffc0, 0.3, 0.9, 0, 1.6, 0, -0.1); } });
lrDefFx('fidReel', (o, X) => { const y = X.gy(o.x, o.z) + 0.1, c = X.TCol(o.team); X.ring(o.x, y, o.z, 0.6, 6.5, c.glow, 0.45, 0.9); X.ring(o.x, y + 0.6, o.z, 0.4, 5.5, 0xffffff, 0.35, 0.5); X.burst(o.x, o.y + 0.3, o.z, 0xd8c8a0, 12, 4, 0.25, 0.4, 0.5); X.K.fidBurst({ x: o.x, y: o.y + 1.1, z: o.z, n: 12, col: [c.glow, 0xffffff], sp: 8, up: 0.8, life: 0.6, s: 0.4 }); });
lrDefFx('fidAll', (o, X) => { const y = X.gy(o.x, o.z) + 0.08; X.ring(o.x, y, o.z, 1, 20, 0xfff0a0, 1.0, 0.8); X.ring(o.x, y + 0.04, o.z, 0.5, 8, 0xffffff, 0.6, 0.7); X.sprite(o.x, o.y + 1.6, o.z, 0xfff0a0, 3, 0.5); X.K.fidBurst({ x: o.x, y: o.y + 1.6, z: o.z, n: 20, col: [0x9cffc0, 0x8ad8ff, 0xfff0a0], sp: 4, up: 3, life: 1.6, s: 0.45 }); });
