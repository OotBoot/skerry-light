// Maren's End: the Knock, Bat of Maren. When the third Mooncusser falls it comes before her: up through the
// flagstones of the Plaza, a plank of driftwood half again as tall as Maren, with a face, thin bare limbs and a bat.
// Put it down and Maren is angered: a pause, and she rises out of the sea (src/raidfort.js runs the stage).
//  - Its model is built after its picture (assets/knock.png): a tall plank of orange wood for a body, big round eyes,
//    a long nose and a wide grin on its upper end, thin arms and long thin legs, bare feet, a bat in its right hand.
//  - Its blows, each its own:
// Every blow of its takes half your health (rfHalf, src/raidfort.js), as Maren's do.
//      the swing: close in, a flat swing of the bat that knocks you back;
//      three knocks: it raps the bat on the flagstones three times, and each rap sends a ring out across the floor
//        (jump over them);
//      the cleave: the bat up over its head and down, and the floor splits in a line towards you (step
//        off the line);
//      the throw: it hurls the bat at you end over end, and it comes back to its hand (going and coming).
//  - Its song: at three quarters, half and a quarter of its strength it stands and sings, beating the bat into its
//    other hand (15 s). While it sings a shot barely hurts it (a tenth), and a bar fills under its own: if the song is
//    sung through, the whole squad is killed. Every hit fills a break meter instead; fill it and the song's broken and
//    the Knock is knocked senseless for a moment. Its weight is set so a full squad, shooting well, breaks it about nine
//    seconds in (RFK.BRK: 48 alone, 40 more for each of you after).
// A boss kind on src/zmboss.js's framework (ZBT.knock), host-authoritative like the rest: each player judges its blows
// on themselves (judge), from the blow and how far into it it is, and where it's aimed (ix, iy; ax, ay).

const RFK = {
  HP: 40, PTS: 2000, RAD: 1.05, TALL: 9.2, HEADZ: 6.9, PAD: 0.9, SP: 3.6, S: 9.2,   // (its size: S is its height)
  BAT: 6.2, BAT_ARC: 1.3, NEAR: 3.6,   // (the swing's reach and arc)
  WAVES: [0.6, 1.0, 1.4], WAVE_V: 12, WAVE_R: 20, WAVE_W: 0.9, KNOCK_AT: 5, KNOCK_SIDE: 1.3,   // (three knocks: when each lands, how fast and far its ring runs)
  CLEAVE_L: 26, CLEAVE_W: 1.4, CLEAVE_V: 34,   // (the cleave's line: how long, how wide, how fast it splits)
  HURL_OUT: 0.65, HURL_R: 1.5, HURL_MAX: 30, HURL_H: 2.2,   // (the throw: each way's time, how near counts, how far, how high)
  AT: [0, 4], DEEP: -9.5,   // (where it comes up: local x, y; how far under the flagstones it starts)
  SONG_AT: [0.75, 0.5, 0.25], SONG: 15, SONG_HURT: 0.1, BEAT: 0.5, DAZED: 3.2,   // (its song: at which strengths, how long, how little a shot hurts it meanwhile)
  BRK: 48, BRK_MORE: 40,   // (what breaks the song: damage, alone; and for each of you after)
};
const RFK_T = { song: { hit: RFK.SONG, end: RFK.SONG + 0.4 }, dazed: { hit: 99, end: RFK.DAZED }, emerge: { hit: 99, end: 3.6 }, bat: { hit: 0.55, end: 1.05 }, knocks: { hit: 0.6, end: 2.0 }, cleave: { hit: 0.9, end: 1.75 }, hurl: { hit: 0.55, end: 0.55 + RFK.HURL_OUT * 2 + 0.35 }, smash: { hit: 0.8, end: 1.3 } };
ZB_KINDS.push('knock');
for (const a of ['emerge', 'bat', 'knocks', 'cleave', 'hurl', 'song', 'dazed']) if (!ZB_ACT.includes(a)) ZB_ACT.push(a);

// where its thrown bat is at time t into the throw (null while it's in its hand): out to the mark and back
function rfkBatAt(z, t) {
  const T = RFK_T.hurl, u = (t - T.hit) / RFK.HURL_OUT;
  if (!(u > 0) || u >= 2) return null;
  const k = u < 1 ? 1 - (1 - u) * (1 - u) : 1 - (u - 1) * (u - 1);
  return [zbL(z.ax, z.ix, k), zbL(z.ay, z.iy, k), (z.jz || 0) + RFK.HURL_H + Math.sin(k * Math.PI) * 1.4];
}
const rfkGrounded = m => (m.jz || 0) - (m.fl || 0) < 0.25 && !((m.vz || 0) > 0.5);
function rfkHurt(n, px, py) {
  const m = FPS.me;
  fpsHurt(n, null, null); zmSound('hit'); FPS.hurtT = 0.9; FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.25, -0.8, 0.8);
  // (knocked back, away from px, py)
  if (px != null) { const dx = m.x - px, dy = m.y - py, l = Math.hypot(dx, dy) || 1; for (let i = 0; i < 6; i++) zmMove(m, dx / l * 0.32, dy / l * 0.32); }
}

ZBT.knock = {
  n: 'The Knock', N: 'The Knock', sub: 'Bat of Maren', col: '#e0a060', warn: '255,190,110', big: 'cleave', puff: '170,120,70',
  bar: ['#5a3418', '#e0a060'],
  hp: RFK.HP, pts: RFK.PTS, rad: RFK.RAD, tall: RFK.TALL, headZ: RFK.HEADZ, pad: RFK.PAD, crowd: 1.5, near: RFK.NEAR, through: 1.6, scale: 1.6,
  sp: () => RFK.SP,
  win: () => false,
  acts: RFK_T,
  arriveLine: () => 'Three knocks on wood, and up through the flagstones of the Plaza: the Knock, Maren’s bat. Put it down, and she comes.',
  smashLine: () => '',
  killLine: (who, pts) => `${who} split the Knock (+${pts}).`,
  init(z) { z.kCd = 1.5; z.last = ''; z.songN = 0; z.songCd = 0; z.brk = 0; z.brkMax = 1; },
  cool(z, dt) { if (z.kCd > 0) z.kCd -= dt; if (z.songCd > 0) z.songCd -= dt; },
  think(z, p, d, dz, level) {
    // (at three quarters, half and a quarter of its strength: its song)
    if (z.songN < RFK.SONG_AT.length && z.songCd <= 0 && z.hp / z.max <= RFK.SONG_AT[z.songN]) return 'song';
    if (level && d < RFK.BAT - 0.6 && z.swCd <= 0) return 'bat';
    if (z.kCd > 0) return null;
    const can = [];
    if (d < RFK.WAVE_R - 4) can.push('knocks');
    if (level && d < RFK.CLEAVE_L - 3) can.push('cleave');
    if (d > 7 && d < RFK.HURL_MAX - 2) can.push('hurl');
    const pick = can.filter(a => a !== z.last);
    const L = pick.length ? pick : can;
    return L.length ? L[(Math.random() * L.length) | 0] : null;
  },
  start(z, act, p) {
    if (act === 'bat') { z.swCd = 1.0 + Math.random() * 0.4; return; }
    if (act === 'emerge') return;
    if (act === 'song') { z.songN++; z.brk = 0; z.brkMax = RFK.BRK + RFK.BRK_MORE * (rfN() - 1); return; }
    if (act === 'dazed') { z.swCd = Math.max(z.swCd, 1); z.kCd = Math.max(z.kCd, 2); return; }
    z.last = act; z.kCd = 1.4 + Math.random() * 1.0; z.swCd = Math.max(z.swCd, 0.6);
    z.ax = z.x; z.ay = z.y;
    if (act === 'knocks') { z.ix = z.x + Math.sin(z.h) * RFK.KNOCK_AT + Math.cos(z.h) * RFK.KNOCK_SIDE; z.iy = z.y + Math.cos(z.h) * RFK.KNOCK_AT - Math.sin(z.h) * RFK.KNOCK_SIDE; }
    else if (p) rfkAim(z, p, act);
  },
  during(z, dt, nearest, was) {
    if (z.act === 'emerge') {
      // (up through the flagstones, the stone breaking round it)
      const k = Math.min(1, z.at / RFK_T.emerge.end), e = zbE(k);
      z.jz = zbL(RFK.DEEP, 0, e); z.fl = 0;
      if (Math.random() < dt * 40) { const a = Math.random() * 6.283, r = 1 + Math.random() * 2.6; fpsPuff(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, FPSC.GROUND + 0.2 + Math.random() * 1.5, '140,120,100', 3); }
      return;
    }
    // (singing: broken once its break meter's full)
    if (z.act === 'song') { ZBT.knock.judge(z, was, z.at); if (z.brk >= z.brkMax) { rfkBroken(z); zbStart(z, 'dazed'); } return; }
    if (z.act === 'dazed') return;
    const p = nearest(z.x, z.y, z.jz), T = RFK_T[z.act];
    if (p && T) {
      if (z.act === 'bat' && z.at < T.hit * 0.7) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 4);
      // (the cleave and the throw follow whoever they're for, for the first half of the wind-up; then they're set)
      if ((z.act === 'cleave' || z.act === 'hurl') && z.at < T.hit * 0.55) rfkAim(z, p, z.act);
      if (z.act === 'knocks' && z.at < T.hit * 0.5) { z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 3); z.ix = z.x + Math.sin(z.h) * RFK.KNOCK_AT + Math.cos(z.h) * RFK.KNOCK_SIDE; z.iy = z.y + Math.cos(z.h) * RFK.KNOCK_AT - Math.sin(z.h) * RFK.KNOCK_SIDE; }
    }
    ZBT.knock.judge(z, was, z.at);
  },
  // (on every screen, for its own player) what its blows did between at0 and at1
  judge(z, at0, at1) {
    if (z.kSeq !== z.aseq) { z.kSeq = z.aseq; z.kh = 0; z.ks = 0; z.sb = -1; }
    const m = FPS.me, ok = zbOk(), G0 = FPSC.GROUND, dm = Math.hypot(z.x - m.x, z.y - m.y);
    if (z.act === 'song') {
      // (its song, beat by beat: a note, and the bat into its hand)
      const b = Math.floor(at1 / RFK.BEAT);
      if (b !== z.sb && b < RFK_SONG.length) { z.sb = b; rfkSing(b, dm); }
      return;
    }
    if (z.act === 'knocks') {
      const iz = zmFloorAt(z.ix, z.iy, 12, 0.3), d = Math.hypot(m.x - z.ix, m.y - z.iy);
      RFK.WAVES.forEach((ti, i) => {
        const b = 1 << i;
        if (at0 < ti && at1 >= ti && !(z.ks & b)) {
          z.ks |= b; rfkSound('knock', dm);
          for (let j = 0; j < 14; j++) { const a = j / 14 * 6.283; fpsPuff(z.ix + Math.cos(a) * 0.9, z.iy + Math.sin(a) * 0.9, G0 + iz + 0.2, '170,140,100', 2.5); }
        }
        const r0 = Math.max(0, (at0 - ti) * RFK.WAVE_V), r1 = (at1 - ti) * RFK.WAVE_V;
        if (r1 <= 0 || r0 > RFK.WAVE_R || (z.kh & b)) return;
        if (ok && d > r0 - RFK.WAVE_W && d < r1 + RFK.WAVE_W * 0.5 && Math.abs((m.jz || 0) - iz) < 1.3 && rfkGrounded(m)) { z.kh |= b; rfkHurt(rfHalf(), z.ix, z.iy); }
      });
    } else if (z.act === 'cleave') {
      const H = RFK_T.cleave.hit; if (at1 <= H) return;
      const L = Math.hypot(z.ix - z.ax, z.iy - z.ay) || 1, ux = (z.ix - z.ax) / L, uy = (z.iy - z.ay) / L;
      const s0 = Math.max(0, (at0 - H) * RFK.CLEAVE_V) - 0.6, s1 = Math.min(RFK.CLEAVE_L, (at1 - H) * RFK.CLEAVE_V) + 0.6;
      const rx = m.x - z.ax, ry = m.y - z.ay, along = rx * ux + ry * uy, side = Math.abs(rx * uy - ry * ux);
      if (!(z.kh & 8) && ok && along > Math.max(1.2, s0) && along < s1 && side < RFK.CLEAVE_W && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.3 && rfkGrounded(m)) {
        z.kh |= 8; fpsHurt(rfHalf(), null, null); zmSound('hit'); FPS.hurtT = 1.0; FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.35, -0.8, 0.8);
      }
    } else if (z.act === 'hurl') {
      // (the bat's way between at0 and at1, a few points along it: did it pass through me)
      for (let i = 0; i <= 4; i++) {
        const t = zbL(at0, at1, i / 4), q = rfkBatAt(z, t); if (!q) continue;
        const b = t < RFK_T.hurl.hit + RFK.HURL_OUT ? 16 : 32;
        if (!(z.kh & b) && ok && Math.hypot(q[0] - m.x, q[1] - m.y) < RFK.HURL_R && Math.abs(q[2] - ((m.jz || 0) + 1.1)) < 1.6) { z.kh |= b; rfkHurt(rfHalf(), q[0], q[1]); }
      }
      const back = RFK_T.hurl.hit + RFK.HURL_OUT * 2;
      if (at0 < back && at1 >= back) rfkSound('catch', dm);
    }
  },
  strike(z) {
    const m = FPS.me, d = Math.hypot(z.x - m.x, z.y - m.y), G0 = FPSC.GROUND;
    if (z.act === 'song') { rfkSongEnd(); return; }
    if (z.act === 'bat') {
      rfkSound('bat', d);
      if (zbOk() && d < RFK.BAT && Math.abs(angDiff(bearingOf(m.x - z.x, m.y - z.y), z.h)) < RFK.BAT_ARC && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.6) { rfkHurt(rfHalf(), z.x, z.y); rfkSound('thwack', 0); }
      return;
    }
    if (z.act === 'cleave') {
      rfkSound('cleave', d);
      const L = Math.hypot(z.ix - z.ax, z.iy - z.ay) || 1, ux = (z.ix - z.ax) / L, uy = (z.iy - z.ay) / L;
      for (let s = 1.5; s < RFK.CLEAVE_L; s += 1.1) { const x = z.ax + ux * s, y = z.ay + uy * s, iz = zmFloorAt(x, y, 12, 0.3); fpsPuff(x + (Math.random() - 0.5), y + (Math.random() - 0.5), G0 + iz + 0.2 + Math.random(), '150,125,95', 3); }
      return;
    }
    if (z.act === 'hurl') rfkSound('hurl', d);
  },
  after(z, a) { if (a === 'dazed') z.songCd = 6; if (a === 'emerge') { z.st = 'in'; z.jz = z.fl = 0; zmSettle(z); z.kCd = 1.5; } },
  // (singing, a shot barely hurts it and goes to its break meter instead)
  hurtK(z, how, dmg) {
    const k = how === 'burn' ? 0.6 : 1;
    if (z.act !== 'song') return k;
    if (dmg > 0 && how !== 'lamp') z.brk += dmg * k;
    return k * RFK.SONG_HURT;
  },
  // (the bar under its own while it sings: the song, and how near it is to breaking)
  songBar: z => z.act === 'song' && !z.dead ? { k: clamp((z.at || 0) / RFK.SONG, 0, 1), c: '#d0304a', b: clamp(RF.kbrk || 0, 0, 1), bc: '#ffe08a' } : null,
  endOf: (z, act) => RFK_T[act] ? RFK_T[act].end : 0,
  actSound(z, act) {
    const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y);
    if (act === 'emerge') rfkSound('arrive', d); else if (act === 'cleave') rfkSound('raise', d);
    else if (act === 'song') { ZM.banner = { text: 'The Knock’s Song', t: 3, col: '#ff7a7a', sub: 'shoot it to break the song, or it’s the end of all of you' }; fpsFeed('The Knock begins to sing. Break its song before it ends.'); rfkSound('song', d); }
    else if (act === 'dazed' && ZM.net === 'client') rfkBroken(z);
  },
  sound: (k, d) => rfkSound(k, d),
  build: () => rfBuildKnock(),
  reset(z, M) { M.root.rotation.set(0, 0, 0); M.root.visible = true; M.bat.visible = true; },
  pose: (z, M, dt) => rfPoseKnock(z, M, dt),
};
// the cleave's line, or the throw's mark: at whoever it's for (the throw carries on a little past them)
function rfkAim(z, p, act) {
  z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * 0.5;
  const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1;
  const L = act === 'hurl' ? Math.min(RFK.HURL_MAX, d + 3) : RFK.CLEAVE_L;
  z.ax = z.x; z.ay = z.y; z.ix = z.x + dx / d * L; z.iy = z.y + dy / d * L;
}
// its sounds: wood (from the recordings where there's one, src/sfxbank.js), and its three knocks (src/audio.js)
function rfkSound(k, d) {
  const v = clamp(1 - (d || 0) / 70, 0.15, 1), play = (n, vol) => { try { return typeof sfxPlay === 'function' && sfxPlay(n, { vol: vol * v, vary: 0.06 }); } catch (e) { return false; } };
  const knock = (vol, gap) => { try { if (typeof sfxKnock === 'function') sfxKnock(0, vol * v, gap); } catch (e) {} };
  if (k === 'arrive') { knock(1, 0.34); play('debris', 1); play('thunder', 0.7); try { if (typeof sfxSting === 'function') sfxSting(); } catch (e) {} return; }
  if (k === 'groan') { knock(0.55, 0.26); return; }
  if (k === 'bat' || k === 'hurl') { play('swish', 1); return; }
  if (k === 'thwack' || k === 'catch') { play('board', 1); return; }
  if (k === 'knock') { play('slam', 0.8); play('board', 0.7); return; }
  if (k === 'raise') { play('creak', 0.9); return; }
  if (k === 'cleave') { play('slam', 1); play('debris', 1); play('explode', 0.35); return; }
  if (k === 'die') { play('debris', 1); play('board', 1); knock(0.9, 0.5); return; }
  if (k === 'song') { knock(0.8, 0.22); return; }
  if (k === 'broken') { play('board', 1); play('slam', 0.7); return; }
  if (k === 'songend') { knock(1, 0.45); play('thunder', 1); try { if (typeof sfxSting === 'function') sfxSting(); } catch (e) {} return; }
}

// ---------- its song ----------
// four lines, a beat each half second (MIDI notes; 0 a rest), and the words
const RFK_SONG = [64, 64, 62, 60, 62, 64, 57, 0, 64, 64, 62, 60, 59, 57, 59, 0, 64, 67, 65, 64, 62, 60, 62, 0, 60, 59, 57, 59, 60, 57];
const RFK_WORDS = ['Knock once for the lantern,', 'knock twice for the tide,', 'knock three for the sailor', 'who sleeps down inside.'];
function rfkSing(b, d) {
  const v = clamp(1 - (d || 0) / 70, 0.25, 1), n = RFK_SONG[b];
  try {
    if (typeof tone === 'function') {
      if (n) { const f = 440 * Math.pow(2, (n - 69) / 12); tone(f, 'triangle', 0.02, 0.13 * v, 0.42); tone(f / 2, 'sine', 0.02, 0.08 * v, 0.45); tone(f * 1.005, 'sawtooth', 0.04, 0.02 * v, 0.35); }
      // (the bat into its hand)
      tone(150, 'triangle', 0.002, 0.22 * v, 0.1, { to: 90 }); if (typeof noise === 'function') noise('bandpass', 900, 3, 0.002, 0.12 * v, 0.06);
    }
  } catch (e) {}
}
// its song broken: it's knocked senseless (on every screen)
function rfkBroken(z) {
  ZM.banner = { text: 'The song is broken', t: 2.6, col: '#ffe08a', sub: 'the Knock reels', small: true };
  fpsFeed('The Knock’s song is broken. It reels, senseless.');
  rfkSound('broken', Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y));
}
// its song sung through: the end of all of you (the host's word ends the night for everyone)
function rfkSongEnd() {
  ZM.banner = { text: 'Knock, knock, knock', t: 5, col: '#ff5a6a', sub: 'the Knock’s song is sung' };
  fpsFeed('The Knock’s song is sung. Knock, knock, knock.');
  rfkSound('songend', 0);
  if (ZM.net !== 'client' && typeof zmEnd === 'function') { ZM.perks = {}; zmEnd(); }
}

// ---------- its model: built after its picture ----------
// Everything is built to a height of 1 and scaled to RFK.S. Its front is -z (as all of them): its right hand is +x.
const RFKG = {};
function rfkGeo() {
  if (RFKG.ok) return RFKG;
  const Q = RFKG;
  // the wood: orange-brown, with a grain running up it
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d'), rnd = seeded(0x6b0c);
  x.fillStyle = '#b8743c'; x.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 40; i++) { const gx = rnd() * 64, w = 0.5 + rnd() * 2; x.strokeStyle = `rgba(${rnd() < 0.5 ? '120,64,24' : '214,150,90'},${0.25 + rnd() * 0.35})`; x.lineWidth = w; x.beginPath(); x.moveTo(gx, 0); for (let y = 0; y <= 256; y += 16) x.lineTo(gx + Math.sin(y * 0.03 + i) * 2.5, y); x.stroke(); }
  for (let i = 0; i < 3; i++) { const kx = 10 + rnd() * 44, ky = 20 + rnd() * 216; x.strokeStyle = 'rgba(100,52,20,0.6)'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(kx, ky, 3, 7, 0, 0, 6.283); x.stroke(); }
  Q.tex = new THREE.CanvasTexture(c);
  Q.plank = new THREE.BoxGeometry(0.21, 0.6, 0.1, 2, 6, 1); Q.plank.translate(0, 0.3, 0);
  Q.cap = new THREE.CylinderGeometry(0.105, 0.105, 0.1, 16, 1, false, -Math.PI / 2, Math.PI); Q.cap.rotateX(-Math.PI / 2); Q.cap.scale(1, 0.32, 1);
  Q.eye = new THREE.SphereGeometry(0.036, 16, 12);
  Q.iris = new THREE.SphereGeometry(0.019, 12, 8);
  Q.pupil = new THREE.SphereGeometry(0.01, 8, 6);
  Q.lid = new THREE.SphereGeometry(0.039, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
  Q.brow = new THREE.BoxGeometry(0.05, 0.008, 0.012);
  Q.nose = new THREE.SphereGeometry(0.02, 10, 8); Q.nose.scale(0.8, 1.8, 1.1);
  Q.mouth = new THREE.TorusGeometry(0.042, 0.009, 6, 18, Math.PI); Q.mouth.rotateZ(Math.PI);
  Q.teeth = new THREE.BoxGeometry(0.06, 0.012, 0.006);
  Q.cheek = new THREE.SphereGeometry(0.02, 10, 8);
  Q.limb = new THREE.CylinderGeometry(0.012, 0.01, 1, 8); Q.limb.translate(0, -0.5, 0);
  Q.leg = new THREE.CylinderGeometry(0.017, 0.013, 1, 8); Q.leg.translate(0, -0.5, 0);
  Q.joint = new THREE.SphereGeometry(0.019, 8, 6);
  Q.hand = new THREE.SphereGeometry(0.018, 8, 6); Q.hand.scale(1, 1.3, 0.7);
  Q.finger = new THREE.CylinderGeometry(0.004, 0.003, 0.03, 4); Q.finger.translate(0, -0.015, 0);
  Q.foot = new THREE.BoxGeometry(0.04, 0.018, 0.075); Q.foot.translate(0, 0.009, -0.025);
  Q.toe = new THREE.SphereGeometry(0.008, 6, 5);
  // the bat: its knob, the handle, swelling to the barrel; from the grip (0) down along -y
  Q.bat = new THREE.CylinderGeometry(0.007, 0.022, 0.3, 12); Q.bat.translate(0, -0.2, 0);
  Q.handle = new THREE.CylinderGeometry(0.007, 0.007, 0.07, 8); Q.handle.translate(0, -0.015, 0);
  Q.knob = new THREE.SphereGeometry(0.011, 8, 6); Q.knob.translate(0, 0.02, 0);
  Q.batEnd = new THREE.SphereGeometry(0.022, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); Q.batEnd.translate(0, -0.35, 0);
  Q.ok = true;
  return Q;
}
// a bat (a group, its grip at the origin, along -y)
function rfkBat(Q, mat) {
  const b = new THREE.Group();
  for (const g of [Q.bat, Q.handle, Q.knob, Q.batEnd]) b.add(new THREE.Mesh(g, mat));
  return b;
}
function rfBuildKnock() {
  const Q = rfkGeo(), root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(RFK.S);
  const wood = new THREE.MeshPhongMaterial({ color: 0xffffff, map: Q.tex, specular: 0x302010, shininess: 14 });
  const limbM = new THREE.MeshPhongMaterial({ color: 0xb87840, specular: 0x201008, shininess: 10 });
  const white = new THREE.MeshPhongMaterial({ color: 0xf4efe6, specular: 0x666666, shininess: 60 });
  const iris = new THREE.MeshPhongMaterial({ color: 0x5a3a1c, shininess: 40 });
  const black = new THREE.MeshBasicMaterial({ color: 0x080604 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x5a2c12 });
  const mouthM = new THREE.MeshLambertMaterial({ color: 0x3a0e08 });
  const batM = new THREE.MeshPhongMaterial({ color: 0xc8925a, specular: 0x403020, shininess: 25 });
  const mesh = (geo, mat, x, y, zz, parent) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, zz || 0); parent.add(o); return o; };
  const hips = new THREE.Group(); hips.position.y = 0.39; body.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  mesh(Q.plank, wood, 0, 0, 0, torso);
  mesh(Q.cap, wood, 0, 0.6, 0, torso);
  // its face, on the plank's upper end
  const F = -0.052, eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.045, 0.47, F); torso.add(e);
    mesh(Q.eye, white, 0, 0, 0, e).scale.set(1, 1.05, 0.7);
    const ir = mesh(Q.iris, iris, 0, 0, -0.021, e); mesh(Q.pupil, black, 0, 0, -0.012, ir);
    const lid = mesh(Q.lid, wood, 0, 0.002, 0, e); lid.rotation.x = -0.35; lid.scale.set(1, 1, 0.75);
    const br = mesh(Q.brow, dark, 0, 0.045, -0.006, e); br.rotation.z = s * -0.18;
    eyes.push({ e, ir });
  }
  const nose = mesh(Q.nose, wood, 0, 0.415, F - 0.012, torso); nose.rotation.x = 0.25;
  const mouth = mesh(Q.mouth, mouthM, 0, 0.385, F + 0.002, torso);
  mesh(Q.teeth, white, 0, 0.371, F - 0.002, torso);
  for (const s of [-1, 1]) mesh(Q.cheek, wood, s * 0.058, 0.39, F + 0.006, torso);
  // its arms: thin, from the plank's sides (each: the upper arm, the elbow, the forearm and hand)
  const arm = s => {
    const sh = new THREE.Group(); sh.position.set(s * 0.112, 0.37, 0); torso.add(sh);
    mesh(Q.joint, limbM, 0, 0, 0, sh).scale.setScalar(0.8);
    mesh(Q.limb, limbM, 0, 0, 0, sh).scale.y = 0.16;
    const el = new THREE.Group(); el.position.y = -0.16; sh.add(el);
    mesh(Q.joint, limbM, 0, 0, 0, el).scale.setScalar(0.7);
    mesh(Q.limb, limbM, 0, 0, 0, el).scale.y = 0.15;
    const hd = new THREE.Group(); hd.position.y = -0.16; el.add(hd);
    mesh(Q.hand, limbM, 0, 0, 0, hd);
    for (let i = 0; i < 4; i++) { const f = mesh(Q.finger, limbM, (i - 1.5) * 0.008, -0.018, -0.004, hd); f.rotation.x = 0.5; }
    return { sh, el, hd };
  };
  const arms = [arm(1), arm(-1)];
  const bat = rfkBat(Q, batM); arms[0].hd.add(bat);
  // its legs: long and thin, knobbly knees, bare feet
  const leg = s => {
    const hp = new THREE.Group(); hp.position.set(s * 0.05, 0.005, 0); hips.add(hp);
    mesh(Q.leg, limbM, 0, 0, 0, hp).scale.y = 0.19;
    const kn = new THREE.Group(); kn.position.y = -0.19; hp.add(kn);
    mesh(Q.joint, limbM, 0, 0, 0, kn);
    mesh(Q.leg, limbM, 0, 0, 0, kn).scale.set(0.9, 0.18, 0.9);
    const ft = new THREE.Group(); ft.position.y = -0.185; kn.add(ft);
    mesh(Q.foot, limbM, 0, -0.005, 0, ft);
    for (let i = 0; i < 5; i++) mesh(Q.toe, limbM, (i - 2) * 0.008, 0.004, -0.064 + Math.abs(i - 2) * 0.004, ft);
    return { hp, kn, ft };
  };
  const legs = [leg(1), leg(-1)];
  return { root, body, hips, torso, eyes, mouth, arms, legs, bat, wood, limbM };
}
// its pose: striding, its bat at its side; its blows; its fall
function rfPoseKnock(z, M, dt) {
  const G0 = FPSC.GROUND, t = g.t, act = z.dead ? null : z.act, at = z.at || 0, sw = reduceMotion ? 0 : 1;
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.set(0, -z.h, 0);
  const moving = z.walk && !act && !z.dead;
  z.ph = (z.ph || 0) + dt * (moving ? 3.2 : 0);
  const st = Math.sin(z.ph), bob = moving ? Math.abs(Math.cos(z.ph)) * 0.012 : 0;
  M.body.position.y = bob * RFK.S * sw;
  M.torso.rotation.set(0, Math.sin(z.ph) * 0.06 * sw, Math.sin(t * 0.8 + z.seed) * 0.02 * sw);
  // legs: [hip x (forward), knee x (bend)]
  let LR = [st * 0.45, Math.max(0, -st) * 0.6], LL = [-st * 0.45, Math.max(0, st) * 0.6];
  if (!moving) { LR = [0.06, 0.08]; LL = [-0.04, 0.05]; }
  // arms: [shoulder x (forward), shoulder z (out), elbow x (bend)]; the bat in its right hand: [x, z] in the hand
  let crouch = 0, R = [0.2 - st * 0.2, 0.2, 0.25], L = [st * 0.35, -0.2, 0.25], B = [0.4, -0.6];   // (its bat hangs down across it, as in its picture)
  if (act === 'emerge') { R = [-0.4, 0.9, 0.6]; L = [-0.4, -0.9, 0.6]; B = [0.4, 0]; }
  else if (act === 'song') {
    // (singing: its bat beaten into its other hand on every beat, swaying, its mouth working)
    const u = (at % RFK.BEAT) / RFK.BEAT, hit = u < 0.18 ? 1 - u / 0.18 : 0, lift = Math.sin(Math.min(1, u / 0.85) * Math.PI);
    R = [1.0 + 0.35 * lift, 0.35, 0.9 - 0.3 * lift]; B = [1.3 + 0.5 * lift, 0.9];
    L = [1.15, -0.35, 1.0 - 0.1 * hit];
    M.torso.rotation.z += Math.sin(at * Math.PI / (RFK.BEAT * 2)) * 0.07 * sw;
    M.torso.rotation.x = -0.05 * hit;
    LR = [0.05, 0.05 + 0.1 * hit]; LL = [-0.05, 0.05 + 0.1 * hit];
    M.mouth.scale.set(1, 1 + 0.9 * Math.abs(Math.sin(at * Math.PI / RFK.BEAT)), 1);
  } else if (act === 'dazed') {
    // (knocked senseless: slumped, arms hanging, the bat's point on the stones, swaying)
    const k = zbE(Math.min(1, at / 0.4)) * (1 - zbE(clamp((at - RFK.DAZED + 0.6) / 0.6, 0, 1)));
    R = [0.15, 0.25 * k + 0.2, 0.1]; L = [0.1, -0.3 * k - 0.2, 0.1]; B = [zbL(0.4, 0.1, k), zbL(-0.6, 0, k)];
    M.torso.rotation.x = 0.25 * k; M.torso.rotation.z += Math.sin(at * 3) * 0.12 * k;
    crouch = 0.3 * k;
  } else if (act === 'bat') {
    // (wound back, then flat across, then through)
    const T = RFK_T.bat, wind = zbE(Math.min(1, at / (T.hit - 0.12))), go = zbE(clamp((at - T.hit + 0.12) / 0.3, 0, 1)), back = zbE(clamp((at - T.hit - 0.3) / (T.end - T.hit - 0.3), 0, 1));
    // (low, at the height of a man: bent at the knees, its arm out and down, its whole body turning)
    R = [zbL(0.2, 0.45, wind), zbL(0.2, 0.5, wind), zbL(0.25, 0.05, wind)]; B = [zbL(0.4, 0.5, wind), zbL(-0.6, 0.35, wind)];
    M.torso.rotation.y += zbL(0, -1.1, wind) + zbL(0, 2.2, go) - zbL(0, 1.1, back);
    crouch = 0.7 * wind * (1 - back);
    if (back > 0) { R = [zbL(0.45, 0.2, back), zbL(0.5, 0.2, back), zbL(0.05, 0.25, back)]; B = [zbL(0.5, 0.4, back), zbL(0.35, -0.6, back)]; }
  } else if (act === 'knocks') {
    // (up, and down onto the flagstones: three times)
    let dn = 0;
    for (const ti of RFK.WAVES) { const u = at - ti; if (u > -0.32 && u < 0.28) dn = Math.max(dn, u < 0 ? zbE((u + 0.32) / 0.32) : 1 - zbE(u / 0.28) * 0.85); }
    const raise = zbE(Math.min(1, at / 0.5)), done = zbE(clamp((at - RFK.WAVES[2] - 0.3) / 0.5, 0, 1));
    const up = raise * (1 - done);
    R = [zbL(0.35, zbL(2.6, 0.95, dn), up), zbL(0.22, 0.05, up), zbL(0.45, 0.1, up)]; B = [zbL(0.4, 0.2, up), zbL(-0.6, 0, up)];
    L = [zbL(L[0], zbL(2.4, 0.95, dn), up), zbL(-0.2, -0.05, up), zbL(0.25, 0.1, up)];
    crouch = dn * up;
  } else if (act === 'cleave') {
    // (up over its head, held, and down)
    const T = RFK_T.cleave, up = zbE(Math.min(1, at / (T.hit - 0.2))), dn = zbE(clamp((at - T.hit + 0.12) / 0.14, 0, 1)), rec = zbE(clamp((at - T.hit - 0.4) / (T.end - T.hit - 0.4), 0, 1));
    const a = zbL(zbL(0.2, 3.0, up), 0.95, dn);
    R = [zbL(a, 0.2, rec), zbL(0.2, 0.08, 1 - rec), zbL(0.25, 0.05, 1 - rec)]; L = [zbL(zbL(0, 2.9, up), 0.95, dn) * (1 - rec), -0.08, 0.1];
    B = [zbL(0.4, 0.2, 1 - rec), zbL(-0.6, 0, 1 - rec)];
    M.torso.rotation.x = 0.12 * up * (1 - dn); crouch = dn * (1 - rec);
  } else if (act === 'hurl') {
    // (back, and over: the bat leaves its hand; its hand held out, until the bat comes back to it)
    const T = RFK_T.hurl, wind = zbE(Math.min(1, at / T.hit)), thr = zbE(clamp((at - T.hit + 0.1) / 0.2, 0, 1)), rec = zbE(clamp((at - T.end + 0.45) / 0.45, 0, 1));
    R = [zbL(zbL(0.35, -1.4, wind), 1.6, thr), 0.25, 0.3]; if (rec > 0) R = [zbL(1.6, 0.35, rec), 0.22, 0.45];
    M.torso.rotation.y += zbL(0, -0.6, wind) + zbL(0, 0.9, thr) - zbL(0, 0.3, rec);
  }
  // (bent over at the hips and the knees, to bring the bat down onto the flagstones)
  if (crouch > 0) { M.torso.rotation.x -= 0.55 * crouch; M.body.position.y -= 0.75 * crouch; LR = [0.45 * crouch, 0.9 * crouch]; LL = [0.45 * crouch, 0.9 * crouch]; }
  M.bat.visible = !(act === 'hurl' && rfkBatAt(z, at));
  for (const [i, A] of [R, L].entries()) { M.arms[i].sh.rotation.set(A[0], 0, A[1]); M.arms[i].el.rotation.set(A[2], 0, 0); }
  M.bat.rotation.set(B[0], 0, B[1]);
  for (const [i, A] of [LR, LL].entries()) { M.legs[i].hp.rotation.set(-A[0], 0, 0); M.legs[i].kn.rotation.set(A[1], 0, 0); M.legs[i].ft.rotation.set(-A[0] + A[1] * 0.4 - (A[1] * 0.0), 0, 0); }
  // its eyes: rolling about, and on you when it swings
  const look = act ? 0 : Math.sin(t * 0.9 + z.seed) * 0.008;
  if (act !== 'song') M.mouth.scale.set(1, 1, 1);
  // (dazed: its eyes roll round)
  if (act === 'dazed') M.eyes.forEach((e, i) => e.ir.position.set(Math.cos(t * 9 + i * 3) * 0.009, Math.sin(t * 9 + i * 3) * 0.009, -0.021));
  else for (const e of M.eyes) e.ir.position.set(look, Math.sin(t * 0.6) * 0.004, -0.021);
  // a pale flash where a shot lands
  const flash = z.hitT > 0 ? Math.min(1, z.hitT / 0.15) : 0;
  M.wood.emissive.setRGB(flash * 0.35, flash * 0.25, flash * 0.15); M.limbM.emissive.setRGB(flash * 0.3, flash * 0.2, flash * 0.1);
  if (z.dead) {
    // down: it topples over backwards like a felled plank, and sinks into the stone
    const k = Math.min(1, (z.deadT || 0) / 1.3), s = Math.min(1, Math.max(0, (z.deadT || 0) - 2) / 2.5);
    M.root.rotation.set(-zbE(k) * 1.5, -z.h, 0, 'YXZ');
    M.root.position.y -= s * s * 3;
    if (k >= 1 && !z.thud) { z.thud = true; rfkSound('die', Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y)); for (let i = 0; i < 20; i++) { const r = Math.random() * 8; fpsPuff(z.x - Math.sin(z.h) * r, z.y - Math.cos(z.h) * r, G0 + (z.jz || 0) + 0.3, '160,130,100', 3); } }
    M.root.visible = s < 1;
  }
}

// ---------- in 3D: its thrown bat, its rings of knocks, the cleave's line ----------
const RFK3 = {};
function rfk3dBuild(grp) {
  RFK3.ok = false;
  if (!RF.on) return;
  const Q = rfkGeo();
  RFK3.bat = rfkBat(Q, new THREE.MeshPhongMaterial({ color: 0xc8925a, specular: 0x403020, shininess: 25 })); RFK3.bat.scale.setScalar(RFK.S); RFK3.bat.visible = false; grp.add(RFK3.bat);
  const add = (geo, col, op) => { const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); o.visible = false; grp.add(o); return o; };
  const ring = new THREE.RingGeometry(0.9, 1, 56); ring.rotateX(-Math.PI / 2);
  RFK3.waves = RFK.WAVES.map(() => add(ring, 0xffb060, 0.8));
  const strip = new THREE.PlaneGeometry(1, 1); strip.translate(0, 0.5, 0); strip.rotateX(-Math.PI / 2);
  RFK3.line = add(strip, 0xff9040, 0.3); RFK3.crack = add(strip, 0xffd090, 0.8);
  RFK3.ok = true;
}
function rfk3d(dt) {
  if (!RF.on || !RFK3.ok) return;
  const G0 = FPSC.GROUND, t = g.t;
  const K = ZM.z.find(z => z.bt === 'knock' && !z.dead && z.act);
  const act = K ? K.act : null, at = K ? K.at || 0 : 0;
  // the bat in flight, end over end
  const q = act === 'hurl' ? rfkBatAt(K, at) : null;
  RFK3.bat.visible = !!q;
  if (q) { RFK3.bat.position.copy(z3v(q[0], q[1], G0 + q[2])); RFK3.bat.rotation.set(t * 14, -K.h, Math.PI / 2, 'YXZ'); }
  // the rings of its knocks
  RFK3.waves.forEach((w, i) => {
    const r = act === 'knocks' ? (at - RFK.WAVES[i]) * RFK.WAVE_V : -1;
    w.visible = r > 0.2 && r < RFK.WAVE_R;
    if (w.visible) { const iz = zmFloorAt(K.ix, K.iy, 12, 0.3); w.position.copy(z3v(K.ix, K.iy, G0 + iz + 0.07)); w.scale.set(r, 1, r); w.material.opacity = 0.85 * (1 - r / RFK.WAVE_R); }
  });
  // the cleave's line: glowing while the bat's up, then split along it
  const cl = act === 'cleave', H = RFK_T.cleave.hit;
  RFK3.line.visible = cl && at < H + 0.6; RFK3.crack.visible = cl && at > H;
  if (cl) {
    const L = Math.hypot(K.ix - K.ax, K.iy - K.ay) || 1, h = bearingOf(K.ix - K.ax, K.iy - K.ay), iz = zmFloorAt(K.ax, K.ay, 12, 0.3);
    for (const o of [RFK3.line, RFK3.crack]) { o.position.copy(z3v(K.ax, K.ay, G0 + iz + 0.06)); o.rotation.set(0, -h, 0); }
    const k = clamp(at / H, 0, 1);
    RFK3.line.scale.set(RFK.CLEAVE_W * 2, 1, RFK.CLEAVE_L); RFK3.line.material.opacity = (0.1 + 0.35 * k * (0.7 + 0.3 * Math.sin(t * (8 + k * 16)))) * (at > H ? Math.max(0, 1 - (at - H) / 0.6) : 1);
    const s = clamp((at - H) * RFK.CLEAVE_V, 0.01, RFK.CLEAVE_L);
    RFK3.crack.scale.set(0.45, 1, s); RFK3.crack.material.opacity = 0.9 * Math.max(0, 1 - Math.max(0, at - H - 0.8) / 0.5);
  }
}
