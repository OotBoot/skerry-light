'use strict';
// Skerry Clash: the champions (v204). Three of the world's own, from src/rlcards.js RL_CHAMPS: Maren Holm, the keeper's
// wife come back over the rocks with her lantern; Plimsoll, the shark in the cabin boy's blue shoes; and Verity, the
// small smiling yellow orb who wants to help. One at most in a deck. The rules (the card kept out of the cycle while
// the champion stands, the ability for oil once its cooldown is over) are in src/rl.js (rlAbility, rlChampTick); the
// button over the hand is src/rlhud.js's rlHudAb; the deck builder's gold frame and the one-a-deck rule are in
// src/rldeck.js. This file is the rest of them:
//   rlChampModel(c, trim)  their 3D models (src/rl3d.js asks after its own builders): facing +z, trim the side's colour.
//                          Each has a hidden 'aura' that shows while the ability is on; Verity has two bodies, 'orb'
//                          and 'tall', and while his ability is on he stands up as the tall one (assets/verity2.png)
//   rlChampAnim(...)       what moves on them each frame (after src/rl3d.js's own animation)
//   rlChampFx(f, ...)      the 'champ' event: the ability going off
//   RL_CHAMP_ART           their card portraits (src/rlart.js paints from it), in its 100-unit square
//   rlBotChamp(side, L)    when the bot uses its champion's ability

// ---------- the models ----------
function rlChampModel(c, TR) {
  const W = rlMat;
  if (c === 'maren') {
    // a tall woman in a long dark dress, wet hair down her back, a lantern held high in her left hand
    const g = rlPerson({ s: 1.15, skin: 0xb8c8bc, coat: 0x1c2a2c, skirt: 0x16221f, sleeve: 0x1c2a2c, trim: TR, deep: 0.9,
      hat: (h, s) => { rlAdd(h, gSph(0.17 * s, 8), W(0x141614), [0, 0.03 * s, -0.035 * s], null, [1, 1.05, 1.05]); rlAdd(h, gBox(0.26 * s, 0.5 * s, 0.1 * s), W(0x141614), [0, -0.22 * s, -0.12 * s]); },
      left: (a, s) => { a.rotation.x = -2.5; rlLantern(a, [0, -0.46 * s, 0.04], 0.9, 0x9affd0, 'lamp'); },
      extra: (b, s) => { for (const y of [0.18, 0.3]) rlAdd(b, gTor(0.27 * s - y * 0.12, 0.012 * s, 14), W(0x5a8a7a, { em: 0x0a2a20 }), [0, y * s, 0], [Math.PI / 2, 0, 0]); } });
    const au = rlGrp(g, [0, 0, 0], 'aura'); au.visible = false;
    rlAdd(au, gSph(1.1, 14), W(0x6affc8, { add: 1, op: 0.16 }), [0, 0.9, 0], null, [1, 0.9, 1]);
    rlGlowSpr(au, [0, 1.0, 0], 0x7affd0, 3.4, 'auraGlow');
    rlAdd(g, gTor(0.5, 0.035, 18), W(0xffd070, { em: 0x6a4a10 }), [0, 0.03, 0], [Math.PI / 2, 0, 0]);   // (a champion's gold ring)
    return g;
  }
  if (c === 'plimsoll') {
    // a shark walking upright: a grey body, white belly, a snout full of teeth, a fin on his back, fins for arms, and blue shoes
    const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body'), skin = W(0x6a7c8c), belly = W(0xe8eae4), blue = W(0x2a5ad8), dark = W(0x101418);
    for (const [n, sx] of [['legL', -1], ['legR', 1]]) { const l = rlGrp(b, [sx * 0.13, 0.42, 0], n); rlAdd(l, gBox(0.13, 0.38, 0.15), skin, [0, -0.2, 0]); rlAdd(l, gBox(0.17, 0.11, 0.3), blue, [0, -0.4, 0.05]); rlAdd(l, gBox(0.18, 0.025, 0.31), W(0xf0f0f0), [0, -0.455, 0.05]); }
    rlAdd(b, gSph(0.34, 10), skin, [0, 0.82, 0], null, [0.95, 1.45, 0.9]);
    rlAdd(b, gSph(0.3, 10), belly, [0, 0.76, 0.08], null, [0.8, 1.3, 0.75]);
    const hd = rlGrp(b, [0, 1.28, 0.02], 'head');
    rlAdd(hd, gCone(0.25, 0.5, 9), skin, [0, 0.04, 0.2], [Math.PI / 2 - 0.25, 0, 0]);
    rlAdd(hd, gSph(0.26, 9), skin, [0, 0, -0.02], null, [1, 0.9, 1]);
    rlAdd(hd, gBox(0.36, 0.06, 0.24), dark, [0, -0.1, 0.18]);
    for (let i = 0; i < 6; i++) rlAdd(hd, gCone(0.025, 0.06, 4), W(0xffffff), [-0.14 + i * 0.056, -0.08, 0.3 - Math.abs(i - 2.5) * 0.025], [Math.PI, 0, 0]);
    for (const sx of [-1, 1]) rlAdd(hd, gSph(0.04, 6), dark, [sx * 0.2, 0.06, 0.1]);
    rlAdd(b, gCone(0.16, 0.42, 4), skin, [0, 1.2, -0.3], [-0.6, 0, 0], [0.35, 1, 1]);   // (the dorsal fin)
    const tl = rlGrp(b, [0, 0.55, -0.3], 'tail'); rlAdd(tl, gCone(0.13, 0.4, 6), skin, [0, 0, -0.18], [-Math.PI / 2 - 0.4, 0, 0]); rlAdd(tl, gCone(0.12, 0.34, 4), skin, [0, 0.15, -0.38], [-0.3, 0, 0], [0.25, 1, 1]); rlAdd(tl, gCone(0.1, 0.26, 4), skin, [0, -0.1, -0.36], [Math.PI + 0.5, 0, 0], [0.25, 1, 1]);
    for (const [n, sx] of [['armL', -1], ['armR', 1]]) { const a = rlGrp(b, [sx * 0.33, 0.98, 0.02], n); rlAdd(a, gCone(0.12, 0.44, 4), skin, [sx * 0.05, -0.2, 0], [0, 0, sx * 0.4 + Math.PI], [0.3, 1, 1]); }
    const au = rlGrp(g, [0, 0, 0], 'aura'); au.visible = false; rlGlowSpr(au, [0, 0.9, 0], 0xff3020, 3, 'auraGlow');
    rlAdd(g, gTor(0.5, 0.035, 18), W(0xffd070, { em: 0x6a4a10 }), [0, 0.03, 0], [Math.PI / 2, 0, 0]);
    rlAdd(g, gTor(0.42, 0.03, 16), W(TR), [0, 0.04, 0], [Math.PI / 2, 0, 0]);
    return g;
  }
  if (c === 'verity') {
    const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body'), yel = W(0xe8d41a, { em: 0x3a3200 }), blk = W(0x060504, { basic: 1 }), tongue = W(0xf0e070, { em: 0x302808 });
    // the orb: a smiling yellow egg, a little taller than wide, with a black grin and a tongue
    const orb = rlGrp(b, [0, 0, 0], 'orb');
    rlAdd(orb, gSph(0.36, 14), yel, [0, 0.42, 0], null, [0.86, 1.05, 0.86]);
    for (const sx of [-1, 1]) rlAdd(orb, gSph(0.04, 6), blk, [sx * 0.1, 0.55, 0.29], null, [0.8, 1.6, 0.5]);
    rlAdd(orb, gSph(0.15, 10, 1), blk, [0, 0.34, 0.25], null, [1, 0.6, 0.45]);
    rlAdd(orb, gSph(0.08, 8), tongue, [0, 0.29, 0.3], null, [1, 0.35, 0.4]);
    rlAdd(orb, gSph(0.015, 5), blk, [-0.11, 0.18, 0.28]);
    // and what he really looks like: thin as a rake, arms down past his knees, a long neck and a grin too wide
    const tall = rlGrp(b, [0, 0, 0], 'tall'); tall.visible = false;
    const thin = (p, h, r, par) => rlAdd(par || tall, gCyl(r * 0.8, r, h, 7), yel, p);
    for (const [n, sx] of [['legL', -1], ['legR', 1]]) { const l = rlGrp(tall, [sx * 0.12, 1.25, 0], n); thin([0, -0.62, 0], 1.25, 0.05, l); rlAdd(l, gBox(0.08, 0.04, 0.2), yel, [0, -1.24, 0.06]); }
    rlAdd(tall, gSph(0.2, 9), yel, [0, 1.75, 0], null, [1, 1.6, 0.7]);
    for (let i = 0; i < 4; i++) rlAdd(tall, gTor(0.15, 0.012, 10, Math.PI), W(0xb8a410), [0, 1.85 + i * 0.07, 0.02], [0, 0, Math.PI]);
    thin([0, 2.25, 0], 0.32, 0.04);
    const hd = rlGrp(tall, [0, 2.5, 0], 'tallHead'); rlAdd(hd, gSph(0.17, 10), yel, [0, 0, 0], null, [0.9, 1.15, 0.95]);
    rlAdd(hd, gBox(0.22, 0.07, 0.05), W(0xfffbe8), [0, -0.05, 0.14]); rlAdd(hd, gBox(0.24, 0.01, 0.06), blk, [0, -0.05, 0.145]);
    for (const sx of [-1, 1]) rlAdd(hd, gSph(0.03, 6), blk, [sx * 0.06, 0.06, 0.14]);
    for (const [n, sx] of [['armL', -1], ['armR', 1]]) { const a = rlGrp(tall, [sx * 0.22, 2.08, 0], n); thin([sx * 0.02, -0.65, 0], 1.3, 0.035, a); rlAdd(a, gSph(0.05, 6), yel, [sx * 0.03, -1.32, 0], null, [0.8, 1.6, 0.8]); }
    const au = rlGrp(g, [0, 0, 0], 'aura'); au.visible = false; rlGlowSpr(au, [0, 1.4, 0], 0xffe24a, 3.6, 'auraGlow');
    rlAdd(g, gTor(0.5, 0.035, 18), W(0xffd070, { em: 0x6a4a10 }), [0, 0.03, 0], [Math.PI / 2, 0, 0]);
    rlAdd(g, gTor(0.42, 0.03, 16), W(TR), [0, 0.04, 0], [Math.PI / 2, 0, 0]);
    return rlWrap(g, 1);
  }
  return null;
}

// ---------- each frame ----------
function rlChampAnim(u, H, x, y, t, dt, walk, hit, pulse) {
  const P = H.P, on = u.abT > 0;
  H.on = (H.on || 0) + ((on ? 1 : 0) - (H.on || 0)) * Math.min(1, dt * 6);
  if (P.aura) { P.aura.visible = H.on > 0.03; if (P.aura.visible) P.aura.scale.setScalar(0.8 + H.on * 0.2 + Math.sin(t * 5 + H.ph) * 0.05); }
  if (u.c === 'maren') {
    if (P.lamp) P.lamp.rotation.z = Math.sin(t * 1.8 + H.ph) * 0.15;
    if (P.body) P.body.position.y += 0.08 + Math.sin(t * 1.4 + H.ph) * 0.04;   // (she doesn't quite touch the rock)
    if (on && Math.random() < dt * 14) { const a = Math.random() * 6.283, d = Math.random() * 2.6; rl3dPart(true, rv(x + Math.cos(a) * d, y + Math.sin(a) * d, RL_G0 + 0.2), { v: [0, 0.9 + Math.random(), 0], s0: 0.35, s1: 0.05, life: 0.9, col: 0x7affd0 }); }
  } else if (u.c === 'plimsoll') {
    if (P.tail) P.tail.rotation.y = Math.sin(t * (walk ? 9 : 3) + H.ph) * (on ? 0.7 : 0.35);
    if (P.head) P.head.rotation.x = hit ? -pulse * 0.5 : 0;
    if (on && P.body) P.body.rotation.y = Math.sin(t * 30) * 0.06;
  } else if (u.c === 'verity') {
    const tall = H.on > 0.5;
    if (P.orb) { P.orb.visible = !tall; P.orb.position.y = walk ? Math.abs(Math.sin(H.ph)) * 0.18 : Math.abs(Math.sin(t * 2 + H.ph)) * 0.04; P.orb.rotation.z = walk ? Math.sin(H.ph) * 0.12 : 0; }
    if (P.tall) { P.tall.visible = tall; P.tall.scale.setScalar(0.5 + H.on * 0.32); }
    if (P.tallHead) P.tallHead.rotation.z = Math.sin(t * 2.3) * 0.15;
    if (P.body && tall) P.body.rotation.x = hit ? pulse * 0.35 : 0;
  }
}

// ---------- the ability going off ----------
function rlChampFx(f, P, smoke, sparks) {
  const r = f.r || 3;
  if (f.c === 'maren') {
    rl3dRing(P(0.06), r, 0x6affc8, 0.9, 0.8); rl3dRing(P(0.3), r * 0.7, 0xc8fff0, 0.7, 0.6, true);
    rl3dPart(true, P(1.2), { s0: 2, s1: 5, life: 0.6, col: 0x7affd0 });
    for (let i = 0; i < 16; i++) rl3dPart(true, P(0.3 + i * 0.1), { v: [(Math.random() - 0.5) * 1.6, 1.4, (Math.random() - 0.5) * 1.6], s0: 0.45, s1: 0.08, life: 1.1, col: 0x8affd8, delay: i * 0.03 });
  } else if (f.c === 'plimsoll') {
    rl3dRing(P(0.06), 1.4, 0xff4a30, 0.5, 0.8); sparks(10, 0xff6a50, 3, 0.8);
    for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28; rl3dPart(false, P(0.4), { v: [Math.cos(a) * 1.6, 2 + Math.random() * 2, Math.sin(a) * 1.6], g: 9, s0: 0.25, s1: 0.15, life: 0.6, col: 0xd8f0f0, op: 0.9 }); }
  } else if (f.c === 'verity') {
    for (let i = 0; i < 3; i++) rl3dRing(P(0.08 + i * 0.1), r * (0.6 + i * 0.25), 0xffe24a, 0.8, 0.8 - i * 0.2, false, i * 0.12);
    rl3dPart(true, P(1.4), { s0: 1.5, s1: 6, life: 0.5, col: 0xfff0a0 }); smoke(8, 0x3a3410, 0.9, 1.0, 0.4);
    RL3.shake = Math.max(RL3.shake || 0, 0.25);
  }
}

// ---------- the bot ----------
// its champion's ability, when it would do the most: Maren's light when she's among enemies or hard pressed, Plimsoll's
// lunge at something worth biting, Verity's true face on a crowd or at a tower. Easy is slower to think of it.
function rlBotChamp(side, L) {
  if (typeof rlChampUnit !== 'function') return false;
  const u = rlChampUnit(side); if (!u || rlAbWhy(side)) return false;
  if (Math.random() < (L.rnd || 0) * 1.5) return false;
  const A = RL_CARD[u.c].champ, foes = RL.U.filter(e => e.side !== side && e.hp > 0 && !e.bld && rlD(u, e) <= A.r);
  const atTower = u.st === 'hit' && u.tg && RL.T.some(t => t.id === u.tg && t.hp > 0);
  let go = false;
  if (u.c === 'maren') go = foes.length >= 2 || (foes.length && u.hp < u.max * 0.55) || atTower;
  else if (u.c === 'plimsoll') { const T = rlPlimTarget(u, A); go = !!T && (T.k || T.hp >= 450); }
  else if (u.c === 'verity') go = foes.length >= 2 || atTower || (foes.length && u.hp < u.max * 0.5);
  return go && rlAbility(side);
}

// ---------- the portraits ----------
var RL_CHAMP_ART = {
  maren(g, R) {
    // a winter night at sea, the skerries black, and Maren coming up out of the water with her lantern raised
    rlaSky(g, '#06100f', '#123028', '#2a5a4a', 62); rlaStars(g, R, 26, 50); rlaMoon(g, 80, 16, 5);
    rlaSea(g, 62, '#12302a', '#061410', R, '#8affd8');
    for (const [x, w] of [[6, 14], [92, 16]]) rlaPoly(g, [[x - w, 100], [x - w * 0.6, 66], [x, 60], [x + w * 0.5, 68], [x + w, 100]], '#050806', false);
    rlaGlow(g, 66, 22, 30, '#6affc8', 0.55);
    rlaMan(g, { x: 50, y: 104, s: 1.5, dress: '#16221f', coat: '#1c2a2c', skin: '#b8c8bc', hat: 'hair', hatc: '#0e100e', face: 1, pose: 'raise', item: 'lantern', eyes: '#9affd8', weed: '#2a5a3a' });
    rlaGlow(g, 66, 30, 12, '#c8fff0', 0.8);
    rlaMist(g, 92, 10, 'rgba(160,255,220,0.35)', 0.6, R);
  },
  plimsoll(g, R) {
    // dawn over the harbour mouth, Plimsoll walking ahead up the shingle in his blue shoes
    rlaSky(g, '#2a3a5a', '#a07a8a', '#f0c090', 54); rlaSun(g, 24, 50, 6, '#ffd8a0'); rlaSea(g, 54, '#3a5a72', '#22364a', R, '#ffe0b0');
    g.fillStyle = rlaLin(g, 0, 80, 0, 100, ['#8a8070', '#4a4438']); g.fillRect(0, 80, 100, 20);
    for (let i = 0; i < 22; i++) rlaEll(g, R() * 100, 82 + R() * 18, 1 + R() * 1.6, 0.6 + R(), '#a89a86', 'rgba(0,0,0,0.3)', 0.4);
    const x = 52, grey = '#6a7c8c';
    // legs and the blue shoes
    for (const [dx, dy] of [[-7, 0], [7, -2]]) { rlaLimb(g, [[x + dx * 0.6, 66], [x + dx, 90 + dy]], 6, grey); rlaEll(g, x + dx + 3, 93 + dy, 7, 3.2, rlaLit(g, x + dx - 4, 90 + dy, x + dx + 10, 96 + dy, '#2a5ad8')); rlaEll(g, x + dx + 3, 95.5 + dy, 7, 1, '#f0f0f0', false); }
    // the body, the belly, the fin
    rlaPoly(g, [[x - 4, 6], [x + 12, 22], [x + 20, 30], [x + 4, 30]], grey, null, 1);
    rlaEll(g, x, 46, 17, 26, rlaLit(g, x - 17, 20, x + 17, 72, grey));
    rlaEll(g, x + 4, 50, 10, 19, rlaLit(g, x - 6, 30, x + 14, 70, '#e8eae4', 0.2), false);
    // the snout, the eye, the teeth
    rlaPoly(g, [[x - 12, 30], [x + 30, 26], [x + 34, 30], [x + 12, 38], [x - 10, 38]], rlaLit(g, x - 12, 24, x + 30, 40, grey), null, 1);
    rlaPoly(g, [[x + 2, 34], [x + 30, 31], [x + 12, 40], [x - 2, 40]], '#141018', false);
    g.fillStyle = '#ffffff'; for (let i = 0; i < 7; i++) rlaPoly(g, [[x + 4 + i * 3.6, 33.5 - i * 0.3], [x + 5.8 + i * 3.6, 37], [x + 7.6 + i * 3.6, 33.2 - i * 0.3]], '#ffffff', false);
    rlaEll(g, x + 10, 27, 1.8, 1.8, '#06080a', false); g.fillStyle = '#ffffff'; g.fillRect(x + 10, 26, 0.7, 0.7);
    // fins for arms, the tail behind
    rlaPoly(g, [[x + 12, 46], [x + 26, 60], [x + 12, 56]], rlaMix(grey, '#000000', 0.15), null, 1);
    rlaPoly(g, [[x - 14, 46], [x - 26, 58], [x - 14, 54]], rlaMix(grey, '#000000', 0.3), null, 1);
    rlaPoly(g, [[x - 14, 64], [x - 34, 56], [x - 28, 66], [x - 34, 78], [x - 14, 70]], rlaMix(grey, '#000000', 0.2), null, 1);
  },
  verity(g, R) {
    // a corner of a deck at night, a round yellow orb smiling up at you
    rlaSky(g, '#0a0c14', '#1a1c2a', '#2a2a38', 70); rlaStars(g, R, 14, 60);
    g.fillStyle = rlaLin(g, 0, 70, 0, 100, ['#5a4028', '#2a1c10']); g.fillRect(0, 70, 100, 30);
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.6; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 74 + i * 6); g.lineTo(100, 72 + i * 6.5); g.stroke(); }
    rlaGlow(g, 50, 52, 40, '#ffe24a', 0.4);
    rlaEll(g, 50, 92, 26, 4, 'rgba(0,0,0,0.5)', false);
    rlaEll(g, 50, 54, 28, 36, rlaRad(g, 40, 38, 2, 40, ['#fff6a0', '#f2d21c', '#a08a00']));
    for (const x of [41, 59]) rlaEll(g, x, 42, 2.6, 5, '#060504', false);
    g.beginPath(); g.moveTo(30, 56); g.quadraticCurveTo(50, 54, 70, 56); g.quadraticCurveTo(66, 80, 50, 80); g.quadraticCurveTo(34, 80, 30, 56); g.closePath(); g.fillStyle = '#060504'; g.fill();
    rlaEll(g, 50, 74, 10, 4, '#f0e070', false);
    rlaEll(g, 37, 84, 1.2, 1.2, '#060504', false);
  },
};
