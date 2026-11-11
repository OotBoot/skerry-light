'use strict';
// Verity's Wardrobe: twelve cosmetics only Verity drops (src/raidverity.js), the first time you take his Piece of Eight.
//
// The whole suite, one of everything: an outfit, a finish for each of the six weapons, a skin for each of the four boats
// and a banner. They're in the Gannet's Locker's grade (rarity 'pirate', six pips, never in a crate) under his own name
// and colour (RARITY_VERITY, src/crates.js), and they live in their own stores' tables (marked [verity]) so the saves,
// the backups and the cloud keep them like anything else. Every one of them moves, and every one of them makes a sound:
//   Verity's Grin      (outfit)  his own head on your shoulders: the smiling yellow egg, blinking, its grin widening,
//                                 his yellow alight in the coat's trim, and three little Veritys circling you, smiling
//                                 your way. You giggle when you take a knock, and in a game, each second, there's
//                                 a 1 in 50 chance his voice plays.
//   The finishes       (weapons) his faces set all over the gun, blinking in their own time and grinning wider, and his
//                                 giggle running down it as a ripple of light every three seconds; each weapon its own
//                                 touch (src/wcadmiral.js, theme 7): Little Helper (pepperbox: more faces), Big Grin (a
//                                 great grin round the blunderbuss's bell), He's Watching (his eye in the longarm's
//                                 scope), Tongue Out (his tongue down the harpoon gun), All Teeth (a row of teeth along
//                                 the cutlass's edge), Giggle Box (the avtomat's faces roll round it). Every shot
//                                 squeaks like a toy; every kill, he giggles.
//   The boat skins     (boats)   his yellow breathing in her topsides with a grin along her side, his giggle running
//                                 bow to stern, little smiling faces bobbing up in her wake to watch her go, and smiling
//                                 orbs at her mastheads; and each its own: Verity's Smile (brig: his great face on the
//                                 mainsail, its eyes looking about; from her deck his face rises over the horizon like a
//                                 moon), The Little Helper (cutter: a little Verity hopping over the waves beside her),
//                                 The Yellow Room (barque: his room's damp wallpaper on her sails and strip lights along
//                                 her rails, buzzing, flickering, going out), Many Happy Faces (carrier: Verity balloons
//                                 tethered over her flight deck, bobbing). At sea now and then he giggles (or the Helper
//                                 boings, or the strip lights buzz), and he giggles at every crate you haul aboard.
//   Verity's Smile     (banner)  his yellow over your land, damp-stained, with his faces in it, blinking in waves and
//                                 grinning, giggles rippling out across it and his room's strip lights flickering on
//                                 your borders.
// Equipping any of them, he giggles.
//
// Hooks (each a line marked [verity]): src/crates.js, ocrates.js, wcrates.js and rcrates.js (the items, and the grade's
// name); src/wcadmiral.js (the finishes' shader branch, and its card pictures here, vyWcaSvg); src/fpsbody.js (vyDress,
// vyPose); src/raidverity.js (vyGrant, as his token's taken). Everything else is wrapped from here: the Locker's boat
// skin functions (src/lockerfx.js, for the entries with vy), rcPainter, ocDrawPreview, the four equips, ptRender (his
// items shown in the Gannet's Locker too), fpsShoot, fpsHurt, wcEarn, zmEarnKill and collectPickup (the sounds).

const VYC = { Y: '#f2d21c', HI: '#fff6c8', GLOW: '#ffe24a', DEEP: '#5a4a00', BLACK: '#060504', TONGUE: '#f0e070', PAPER: '#c2b25c' };
// what he drops: [id, which store]
const VY_ITEMS = [
  ['vy_grin', 'outfit'],
  ['vy_pb', 'weapon'], ['vy_bb', 'weapon'], ['vy_la', 'weapon'], ['vy_hp', 'weapon'], ['vy_cl', 'weapon'], ['vy_av', 'weapon'],
  ['vy_brig', 'boat'], ['vy_cutter', 'boat'], ['vy_barque', 'boat'], ['vy_carrier', 'boat'],
  ['vy_banner', 'banner'],
];
const vyIs = s => { const id = s && typeof s === 'object' ? s.id : s; return typeof id === 'string' && id.slice(0, 3) === 'vy_'; };
// (a face's blink: shut for a moment now and then, each in its own time; 1 open)
const vyBlink = (t, i) => { const p = ((t * 0.27 + i * 0.137) % 1 + 1) % 1; return p < 0.035 ? 0.12 : 1; };

// ---------- his voice, and the rest of the sounds ----------
const VYA = { kill: 0, hurt: 0, amb: 25, gig: 0 };
function vyVoice(rate, vol) {
  const now = performance.now(); if (now - VYA.gig < 900) return; VYA.gig = now;
  try { if (typeof loadVerityVoice === 'function') loadVerityVoice(); if (typeof sfxVerity === 'function') sfxVerity(rate, vol); } catch (e) {}
}
// a squeak, as from a rubber toy (each a little different)
function vySqueak(k) { try { const f = 950 + Math.random() * 350; tone(f, 'sine', 0.004, 0.07 * k, 0.07, { to: f * 1.6 }); tone(f * 1.5, 'triangle', 0.004, 0.025 * k, 0.05, { delay: 0.05, to: f * 1.1 }); } catch (e) {} }
// the Helper landing: a boing and a splash
function vyBoing() { try { tone(220, 'sine', 0.005, 0.16, 0.35, { to: 620 }); tone(330, 'triangle', 0.005, 0.05, 0.3, { to: 880, delay: 0.02 }); noise('lowpass', 900, 1, 0.01, 0.12, 0.4, { delay: 0.3 }); } catch (e) {} }
// the strip lights: a buzz that catches and stutters
function vyBuzz() { try { for (let i = 0; i < 4; i++) tone(118 + (i % 2) * 2, 'sawtooth', 0.01, 0.03, 0.18, { delay: i * 0.22 + Math.random() * 0.08 }); noise('bandpass', 2400, 6, 0.005, 0.02, 0.6); } catch (e) {} }
// (when a balloon bobs up against another)
function vyPop() { try { tone(700, 'sine', 0.002, 0.08, 0.06, { to: 300 }); } catch (e) {} }
// is the gun in your hands wearing one of his
function vyArmed() {
  try { return typeof FPS !== 'undefined' && FPS.on && typeof WC !== 'undefined' && vyIs(WC.equipped[FPS.weapon]); } catch (e) { return false; }
}
const vyWearing = () => { try { return typeof ocEquippedId === 'function' && vyIs(ocEquippedId()); } catch (e) { return false; } };
const vyBoatSkin = () => { try { const s = typeof mySkin === 'function' ? mySkin() : null; return vyIs(s) ? s : null; } catch (e) { return null; } };
function vyKillGiggle() { const now = performance.now(); if (now - VYA.kill < 2500) return; VYA.kill = now; vyVoice(1.3 + Math.random() * 0.15, 0.4); }

// ---------- his face, in 2D: the yellow egg, his eyes (shut for a moment now and then), the grin and its tongue ----------
// (q a canvas context; r its half-height; i its own time; look how far its eyes look aside, -1 to 1)
function vyFace(q, x, y, r, t, i, a, look) {
  if (!(r > 0.8) || a <= 0.02) return;
  q.save(); q.globalCompositeOperation = 'source-over'; q.globalAlpha = Math.min(1, a);
  q.fillStyle = '#e8d41a'; q.beginPath(); q.ellipse(x, y, r * 0.82, r, 0, 0, 6.2832); q.fill();
  if (r > 3) { q.fillStyle = 'rgba(255,250,210,0.45)'; q.beginPath(); q.ellipse(x - r * 0.3, y - r * 0.5, r * 0.22, r * 0.14, -0.5, 0, 6.2832); q.fill(); q.fillStyle = 'rgba(90,70,0,0.3)'; q.beginPath(); q.ellipse(x + r * 0.1, y + r * 0.55, r * 0.6, r * 0.35, 0, 0, Math.PI); q.fill(); }
  if (r > 1.6) {
    const bl = vyBlink(t, i), lk = (look || 0) * r * 0.06, gw = 1 + 0.1 * Math.sin(t * 1.7 + i * 2.3);
    q.fillStyle = VYC.BLACK;
    for (const s of [-1, 1]) { q.beginPath(); q.ellipse(x + s * r * 0.22 + lk, y - r * 0.28, Math.max(0.5, r * 0.07), Math.max(0.4, r * 0.15 * bl), 0, 0, 6.2832); q.fill(); }
    const mw = r * 0.44 * gw, my = y + r * 0.04;
    q.beginPath(); q.moveTo(x - mw, my); q.quadraticCurveTo(x, my + r * 0.14, x + mw, my); q.quadraticCurveTo(x, my + r * 0.66, x - mw, my); q.fill();
    if (r > 5) { q.fillStyle = VYC.TONGUE; q.beginPath(); q.ellipse(x, my + r * 0.36, r * 0.17, r * 0.08, 0, 0, 6.2832); q.fill(); q.fillStyle = VYC.BLACK; q.beginPath(); q.arc(x - r * 0.24, y + r * 0.55, Math.max(0.4, r * 0.025), 0, 6.2832); q.fill(); }
  }
  q.restore();
}
const vyGlow = (x, y, col, r, a) => admGlow(x, y, col, Math.min(r, 150), a);

// ---------- the boat skins: on a 3D ship, behind it ----------
const VY_SIG = { vy_brig: 'smile', vy_cutter: 'helper', vy_barque: 'room', vy_carrier: 'faces' };
for (const id in VY_SIG) LOCKER_SIG[id] = { sig: VY_SIG[id], glow: VYC.Y, hi: VYC.HI, sheen: VYC.GLOW, locker: true, vy: true };
function vyFxBefore(skin, a, P, Lh, B, Zd, mastH, s) {
  const t = admT(), full = s > 5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // his yellow on the water round her
  const c0 = P(0, 0, 0); if (c0) { ctx.save(); ctx.translate(c0.x, c0.y); ctx.scale(1, 0.3); vyGlow(0, 0, VYC.Y, Math.max(8, Lh * 1.5 * c0.s), 0.22 + 0.08 * Math.sin(t * 1.9)); ctx.restore(); }
  // little faces bobbing up in her wake, watching her go, and sinking again
  const n = full ? 6 : 3;
  for (let i = 0; i < n; i++) {
    const life = (t * 0.16 + i / n) % 1, p = P(-Lh * (1.15 + life * 4), (hash(i, 301) - 0.5) * B * 3.2, -0.7 + Math.sin(life * Math.PI) * 1.0); if (!p) continue;
    const r = Math.min(26, Math.max(1.2, p.s * 0.7)), al = Math.sin(life * Math.PI);
    vyGlow(p.x, p.y, VYC.GLOW, r * 2.4, al * 0.35);
    vyFace(ctx, p.x, p.y, r, t, i + 3, al * 0.95, Math.sin(t * 0.8 + i));
  }
  ctx.restore();
}
// ---------- on one face of the hull ----------
function vyHullFx(skin, a, f, at, Lh) {
  const t = admT(), sig = a.sig, ga = ctx.globalAlpha;
  const quad = (s0, s1, h0, h1, col) => fillPoly([at(s0, h0), at(s1, h0), at(s1, h1), at(s0, h1)], col);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const pos = f.side ? (f.i + 0.5) / 6 : -0.05;
  ctx.globalAlpha = ga * (0.18 + 0.1 * Math.sin(t * 1.9 + pos * 4)); quad(0, 1, 0.3, 0.8, VYC.GLOW);
  // his giggle: a bright band running bow to stern every three seconds
  const sw = 1.25 - ((t / 3) % 1) * 1.6, sh = Math.exp(-((pos - sw) * (pos - sw)) * 30);
  if (sh > 0.03) { ctx.globalAlpha = ga * sh * 0.55; quad(0, 1, 0.2, 0.86, VYC.HI); }
  ctx.globalCompositeOperation = 'source-over';
  if (sig === 'room') {
    // his room's wallpaper, its stripes and its damp
    for (let k = 0; k < 6; k++) { ctx.globalAlpha = ga * 0.16; quad(k / 6 + 0.03, k / 6 + 0.07, 0.2, 0.84, '#6a5a18'); }
    ctx.globalAlpha = ga * 0.22; quad(0.2 + 0.3 * hash(f.i, 311), 0.45 + 0.3 * hash(f.i, 311), 0.2, 0.42, '#5a4a14');
  } else if (f.side) {
    // a grin along her side, ear to ear, with its teeth chattering
    const u0 = f.i / 6, y = u => 0.66 - 0.2 * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.12) / 0.76)));
    for (let k = 0; k < 4; k++) {
      const s0 = k / 4, s1 = (k + 1) / 4, u = u0 + (s0 + s1) / 12; if (u < 0.12 || u > 0.88) continue;
      const yy = y(u);
      ctx.globalAlpha = ga * 0.85; fillPoly([at(s0, y(u0 + s0 / 6) - 0.06), at(s1, y(u0 + s1 / 6) - 0.06), at(s1, y(u0 + s1 / 6) + 0.03), at(s0, y(u0 + s0 / 6) + 0.03)], VYC.BLACK);
      const ch = 0.02 * Math.max(0, Math.sin(t * 9 + k + f.i * 4));
      ctx.globalAlpha = ga * 0.9; quad(s0 + 0.05, s1 - 0.05, yy - 0.005 - ch, yy + 0.028, '#f4f0e0');
    }
  }
  ctx.restore();
}
// ---------- on a sail ----------
function vySailFx(skin, a, pts, main) {
  const q = polyProj(pts); if (q.length < 3) return;
  const t = admT(), sig = a.sig;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of q) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
  const w = x1 - x0, h = y1 - y0; if (w < 3 || h < 3) return;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ga = ctx.globalAlpha;
  ctx.save();
  ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = ga * (0.12 + 0.06 * Math.sin(t * 1.5 + mx * 0.01)); ctx.fillStyle = VYC.GLOW; ctx.fillRect(x0, y0, w, h);
  if (sig === 'smile' && main) {
    // his great face on the mainsail, its eyes looking about
    vyGlow(mx, my, VYC.GLOW, Math.min(w, h) * 0.9, ga * 0.45);
    vyFace(ctx, mx, my, Math.min(w * 0.55, h * 0.42), t, 0, Math.min(1, ga * 1.8), Math.sin(t * 0.6) * 1.2);
  } else if (sig === 'room') {
    // his room's damp wallpaper, and the light going out now and then
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 8; k++) { ctx.globalAlpha = ga * 0.18; ctx.fillStyle = '#7a6a20'; ctx.fillRect(x0 + w * (k + 0.4) / 8, y0, w * 0.04, h); }
    ctx.globalAlpha = ga * 0.25; ctx.fillStyle = '#5a4a14'; ctx.beginPath(); ctx.ellipse(mx - w * 0.15, y1 - h * 0.12, w * 0.3, h * 0.18, 0, 0, 6.2832); ctx.fill();
    const fl = hash(Math.floor(t * 7), 321); if (fl > 0.85) { ctx.globalAlpha = ga * 0.35; ctx.fillStyle = '#000000'; ctx.fillRect(x0, y0, w, h); }
  } else if (sig === 'faces' || (sig === 'helper' && main)) {
    // his smile printed on the cloth, blinking
    const n = sig === 'faces' && w > 30 ? 2 : 1;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) vyFace(ctx, x0 + w * (i + 0.5) / n, y0 + h * (j + 0.5) / n, Math.min(w, h) * 0.3 / n, t, i * 2 + j + 1, ga * 0.9, 0);
  }
  ctx.restore();
}
// ---------- on a 3D ship, in front ----------
function vyFxAfter(skin, a, P, Lh, B, Zd, mastH, s) {
  const t = admT(), full = s > 5, sig = a.sig, carrier = skin.boat === 'carrier';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // little smiling orbs at her mastheads, bobbing
  const heads = carrier ? [[-Lh * 0.2, B * 0.6, Zd + mastH]] : admMasts(skin, Lh).map(u => [u, 0, Zd + mastH * 1.06]);
  heads.forEach(([u, w, z], i) => { const p = P(u, w, z + Math.abs(Math.sin(t * 2.4 + i)) * 0.6); if (!p) return; const r = Math.min(18, Math.max(1.5, p.s * 0.55)); vyGlow(p.x, p.y, VYC.GLOW, r * 3, 0.5); vyFace(ctx, p.x, p.y, r, t, i + 7, 1, Math.sin(t * 0.7 + i)); });
  if (sig === 'helper') {
    // the Little Helper: hopping over the waves beside her, a splash where he lands
    const ph = (t * 0.55) % 1, hop = Math.sin(ph * Math.PI), u = Lh * (0.15 + 0.25 * Math.sin(t * 0.21)), w = B * 2.4;
    const p = P(u, w, 0.9 + hop * 2.4), pw = P(u, w, 0);
    if (pw && ph > 0.9) { ctx.save(); ctx.translate(pw.x, pw.y); ctx.scale(1, 0.3); vyGlow(0, 0, '#d8f0ff', Math.max(4, pw.s * 2.4 * (1 - ph) * 8), 0.6); ctx.restore(); }
    if (p) { const r = Math.min(40, Math.max(2, p.s * 1.0)); vyGlow(p.x, p.y, VYC.GLOW, r * 2.6, 0.45); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 + (1 - hop) * 0.12, 1 - (1 - hop) * 0.12); vyFace(ctx, 0, 0, r, t, 11, 1, 0.8); ctx.restore(); }
  } else if (sig === 'room') {
    // his room's strip lights along both rails, buzzing, one going out now and then
    const n = full ? 7 : 3;
    for (const sd of [-1, 1]) for (let i = 0; i < n; i++) {
      const u0 = Lh * (-0.8 + 1.6 * (i + 0.2) / n), u1 = u0 + Lh * 1.6 * 0.5 / n, pa = P(u0, sd * B * 0.9, Zd + 1.9), pb = P(u1, sd * B * 0.9, Zd + 1.9);
      if (!pa || !pb) continue;
      const out = hash(Math.floor(t * 6) + i * 7 + (sd > 0 ? 3 : 0), 331) > 0.9, fl = out ? 0.08 : 0.85 + 0.15 * Math.sin(t * 50 + i);
      vyGlow((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, '#fff0c0', Math.min(60, Math.max(4, pa.s * 1.6)), 0.4 * fl);
      ctx.globalAlpha = fl; ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = Math.max(1, pa.s * 0.12); ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    }
  } else if (sig === 'faces') {
    // Verity balloons tethered over her flight deck, bobbing and drifting on their strings
    const n = full ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const u = Lh * (-0.7 + 1.4 * (i + 0.5) / n), w = (i % 2 ? 1 : -1) * B * 0.35, z = Zd + mastH * (0.5 + 0.18 * Math.sin(t * 1.1 + i * 1.7)), sway = Math.sin(t * 0.9 + i) * B * 0.25;
      const p = P(u, w + sway, z), base = P(u, w, Zd); if (!p || !base) continue;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.7; ctx.strokeStyle = '#2a2208'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.quadraticCurveTo((base.x + p.x) / 2 + Math.sin(t * 2 + i) * 4, (base.y + p.y) / 2, p.x, p.y); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      const r = Math.min(36, Math.max(2, p.s * 1.1)); vyGlow(p.x, p.y, VYC.GLOW, r * 2.2, 0.35); vyFace(ctx, p.x, p.y, r, t, i + 13, 1, Math.sin(t * 0.5 + i));
    }
  }
  ctx.restore();
}
// ---------- on your deck, first person ----------
function vyDeckFx(skin, a, tipY, DW, railT) {
  const t = admT(), sig = a.sig, hz = hy - pitchY;
  const rx = (sd, k) => cx + sd * DW + (sd * 6 - sd * DW) * k, ry = k => (H - 4) + (tipY + 2 - (H - 4)) * k;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // his giggle running up both rails, and his yellow at the bow
  { const k = ((t / 3) % 1) * 1.3; if (k < 1) for (const sd of [-1, 1]) vyGlow(rx(sd, k), ry(k) - railT * 0.5, VYC.GLOW, railT * 4 * (1.2 - k * 0.7), 0.7 * Math.sin(k * Math.PI)); }
  vyGlow(cx, tipY, VYC.GLOW, Math.min(W, H) * 0.12, 0.3 + 0.1 * Math.sin(t * 1.9));
  if (sig === 'smile') {
    // his face rising over the horizon ahead, like a moon, its eyes on you
    const r = Math.min(W, H) * 0.13, y = hz - r * (0.35 + 0.08 * Math.sin(t * 0.3));
    vyGlow(cx, y, VYC.GLOW, r * 2.4, 0.35);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hz); ctx.clip(); vyFace(ctx, cx, y, r, t, 0, 0.75, Math.sin(t * 0.4) * 0.6); ctx.restore();
  } else if (sig === 'helper') {
    // the Little Helper hopping over the waves ahead of the bow
    const ph = (t * 0.55) % 1, hop = Math.sin(ph * Math.PI), x = cx + Math.sin(t * 0.37) * W * 0.18, base = tipY + (hz - tipY) * 0.45, r = Math.min(W, H) * 0.035;
    if (ph > 0.9) { ctx.save(); ctx.translate(x, base + r); ctx.scale(1, 0.25); vyGlow(0, 0, '#d8f0ff', r * 3 * (1 - ph) * 8, 0.6); ctx.restore(); }
    vyGlow(x, base - hop * r * 2.5, VYC.GLOW, r * 2.5, 0.45); vyFace(ctx, x, base - hop * r * 2.5, r, t, 11, 1, Math.sin(t * 0.5));
  } else if (sig === 'room') {
    // his room's strip lights overhead, buzzing and stuttering, and his yellow over everything
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.06; ctx.fillStyle = VYC.Y; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const out = hash(Math.floor(t * 6) + i * 5, 341) > 0.88, fl = out ? 0.05 : 0.85 + 0.15 * Math.sin(t * 50 + i), x = W * (0.2 + i * 0.3), y = H * 0.06, w = W * 0.14;
      ctx.globalCompositeOperation = 'lighter'; vyGlow(x, y, '#fff0c0', w * 0.9, 0.45 * fl);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.5 + 0.5 * fl; ctx.fillStyle = out ? '#5a5440' : '#fffbe8'; ctx.fillRect(x - w / 2, y - 4, w, 8);
    }
  } else if (sig === 'faces') {
    // his balloons drifting up past you, one after another
    for (let i = 0; i < 5; i++) {
      const life = (t * 0.07 + i / 5) % 1, x = W * (0.12 + 0.76 * hash(i, 351)) + Math.sin(t * 0.8 + i) * 20, y = H * 1.05 - life * H * 1.2, r = Math.min(W, H) * (0.03 + 0.02 * hash(i, 352));
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.6; ctx.strokeStyle = '#2a2208'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.quadraticCurveTo(x + Math.sin(t * 2 + i) * 8, y + r * 3, x, y + r * 5); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; vyGlow(x, y, VYC.GLOW, r * 2.2, 0.3); vyFace(ctx, x, y, r, t, i + 13, 1, Math.sin(t * 0.5 + i));
    }
  }
  ctx.restore();
}
// ---------- in a crate preview (SVG, animated with SMIL) ----------
function vySvgFace(el, parent, x, y, r, k, still) {
  const f = el('g', {}, parent);
  el('ellipse', { cx: x, cy: y, rx: r * 0.82, ry: r, fill: '#e8d41a' }, f);
  el('ellipse', { cx: x - r * 0.3, cy: y - r * 0.5, rx: r * 0.22, ry: r * 0.14, fill: '#fffbe0', opacity: 0.5 }, f);
  for (const s of [-1, 1]) {
    const e = el('ellipse', { cx: x + s * r * 0.22, cy: y - r * 0.28, rx: r * 0.07, ry: r * 0.15, fill: VYC.BLACK }, f);
    if (!still) el('animate', { attributeName: 'ry', values: `${r * 0.15};${r * 0.15};${r * 0.02};${r * 0.15}`, keyTimes: '0;0.9;0.94;1', dur: (3.4 + k * 0.7) + 's', repeatCount: 'indefinite' }, e);
  }
  const my = y + r * 0.04, mw = r * 0.44;
  el('path', { d: `M${x - mw} ${my} Q${x} ${my + r * 0.14} ${x + mw} ${my} Q${x} ${my + r * 0.66} ${x - mw} ${my} Z`, fill: VYC.BLACK }, f);
  el('ellipse', { cx: x, cy: my + r * 0.36, rx: r * 0.17, ry: r * 0.08, fill: VYC.TONGUE }, f);
  return f;
}
function vyPreviewFx(svg, skin, a, geo) {
  const NS = 'http://www.w3.org/2000/svg', still = typeof reduceMotion !== 'undefined' && reduceMotion;
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
  const anim = (node, attrs, tag) => { if (still) return node; const e = document.createElementNS(NS, tag || 'animate'); for (const k in attrs) e.setAttribute(k, attrs[k]); if (!e.getAttribute('repeatCount')) e.setAttribute('repeatCount', 'indefinite'); node.appendChild(e); return node; };
  const behind = node => { const d = svg.querySelector('defs'), ref = d && d.nextSibling ? d.nextSibling.nextSibling : svg.firstChild; svg.insertBefore(node, ref); return node; };
  const { sternX = 12, bowX = 104, deckY = 54 } = geo || {}, mid = (sternX + bowX) / 2, sig = a.sig;
  const bt = BOAT_BY_ID[skin.boat] || BOATS[0], half = 46 * bt.len / 27, top = deckY - 44 * Math.min(1, bt.len / 22) * (bt.id === 'cutter' ? 1.05 : 1);
  // his yellow behind her, breathing, and his giggle running across the picture
  behind(anim(el('ellipse', { cx: mid, cy: 46, rx: 54, ry: 30, fill: VYC.Y, opacity: 0.3, filter: 'url(#fxblur)' }), { attributeName: 'opacity', values: '0.18;0.5;0.18', dur: '2.8s' }));
  anim(el('rect', { x: -30, y: 0, width: 16, height: 80, fill: VYC.HI, opacity: 0.25, transform: 'skewX(-18)', filter: 'url(#fxblur2)' }), { attributeName: 'x', values: '-30;150', dur: '3s' });
  // little faces bobbing up in her wake
  for (let i = 0; i < 3; i++) { const g = vySvgFace(el, svg, sternX - 4 - i * 9, deckY + 12, 3, i, still); anim(g, { attributeName: 'opacity', values: '0;1;1;0', dur: '3s', begin: (i * 1) + 's' }); anim(g, { attributeName: 'transform', type: 'translate', values: '0 4;0 0;0 4', dur: '3s', begin: (i * 1) + 's' }, 'animateTransform'); }
  // smiling orbs at her mastheads
  const heads = bt.masts.length ? bt.masts.map(m => [58 + m * half * 1.6, top - 3]) : [[44, deckY - 36]];
  heads.forEach(([hx, hyy], i) => anim(vySvgFace(el, svg, hx, hyy, 2.6, i + 4, still), { attributeName: 'transform', type: 'translate', values: '0 0;0 -1.5;0 0', dur: (0.9 + i * 0.1) + 's' }, 'animateTransform'));
  if (sig === 'smile') {
    const m = bt.masts[Math.floor(bt.masts.length / 2)] || 0, mxp = 58 + m * half * 1.6;
    vySvgFace(el, svg, mxp, deckY - 24, 9, 0, still);
  } else if (sig === 'helper') {
    const g = vySvgFace(el, svg, bowX - 8, deckY + 6, 5, 9, still);
    anim(g, { attributeName: 'transform', type: 'translate', values: '0 0;-8 -12;-16 0;-8 -12;0 0', keyTimes: '0;0.25;0.5;0.75;1', dur: '1.8s' }, 'animateTransform');
  } else if (sig === 'room') {
    for (let i = 0; i < 5; i++) { const x = sternX + 10 + i * (bowX - sternX - 20) / 4, l = el('rect', { x: x - 5, y: deckY - 12, width: 10, height: 2, fill: '#fffbe8' }); el('rect', { x: x - 8, y: deckY - 14, width: 16, height: 6, fill: '#fff0c0', opacity: 0.35, filter: 'url(#fxblur2)' }); anim(l, { attributeName: 'opacity', values: '1;1;0.1;1;0.2;1', keyTimes: '0;0.6;0.62;0.66;0.68;1', dur: (2 + i * 0.37) + 's' }); }
  } else if (sig === 'faces') {
    for (let i = 0; i < 4; i++) {
      const x = sternX + 18 + i * (bowX - sternX - 36) / 3, y = deckY - 26 - (i % 2) * 6;
      el('line', { x1: x, y1: deckY - 2, x2: x, y2: y + 4, stroke: '#2a2208', 'stroke-width': 0.4 });
      anim(vySvgFace(el, svg, x, y, 4, i + 2, still), { attributeName: 'transform', type: 'translate', values: '0 0;1 -2;0 0', dur: (1.6 + i * 0.3) + 's' }, 'animateTransform');
    }
  }
}
// (the Locker's functions hand his boats to the ones above)
{
  const wrapLk = (orig, mine) => function (skin, a, ...r) { return a && a.vy ? mine(skin, a, ...r) : orig.call(this, skin, a, ...r); };
  lockerFxBefore = wrapLk(lockerFxBefore, vyFxBefore);
  lockerHullFx = wrapLk(lockerHullFx, vyHullFx);
  lockerSailFx = wrapLk(lockerSailFx, vySailFx);
  lockerFxAfter = wrapLk(lockerFxAfter, vyFxAfter);
  lockerDeckFx = wrapLk(lockerDeckFx, vyDeckFx);
  lockerPreviewFx = (o => function (svg, skin, a, geo) { return a && a.vy ? vyPreviewFx(svg, skin, a, geo) : o.call(this, svg, skin, a, geo); })(lockerPreviewFx);
}

// ---------- the weapon finishes' card pictures (src/wcadmiral.js wcaSvg, theme 7) ----------
function vyWcaSvg(svg, over, back, T, uid, el, anim, grad) {
  const still = typeof reduceMotion !== 'undefined' && reduceMotion;
  // his faces over the gun, blinking, and his giggle running down it
  for (let i = 0; i < 5; i++) vySvgFace(el, over, 20 + i * 20, 26 + (i % 2) * 8, 5.5, i, still);
  grad('g', [[0, T.a, 0], [0.5, '#ffffff', 1], [1, T.a, 0]], 'linearGradient', { x1: 0, x2: 1 });
  const band = el('rect', { x: -30, y: 0, width: 18, height: 60, fill: `url(#${uid}g)` }, over);
  anim(band, { type: 'translate', values: '0 0;170 0', dur: '3s' });
  // and a little one peeping over the gun, hopping
  const g = vySvgFace(el, svg, 100, 12, 6, 7, still);
  anim(g, { type: 'translate', values: '0 0;0 -4;0 0', dur: '0.9s' });
}

// ---------- the outfit: his head on your shoulders (src/fpsbody.js) ----------
function vyDress(F) {
  if (typeof rvGeo !== 'function' || typeof rvOrb !== 'function') return null;
  const Q = rvGeo(), H0 = F.head;
  // the wrecker's own head goes, and the hat and neck: his egg sits down in the collar
  H0.children.forEach(o => { o.visible = false; });
  const yellow = fbMat('#e8d41a', { flatShading: false }), black = fbMat('#060504', { flatShading: false, side: THREE.DoubleSide }), tongue = fbMat('#f0e070', { flatShading: false, side: THREE.DoubleSide });
  yellow.emissive = new THREE.Color('#3a3200');
  const keep = o => o.traverse(m => { m.userData.keep = true; });
  const S = 0.135, orb = rvOrb(Q, yellow, black, tongue); orb.o.scale.setScalar(S); orb.o.position.set(0, 0.11 - S * RVO.Y, 0.005); H0.add(orb.o); keep(orb.o);
  // three little ones circling you, smiling the way you look
  const minis = [];
  for (let i = 0; i < 3; i++) { const m = rvOrb(Q, yellow, black, tongue); m.o.scale.setScalar(0.07); F.root.add(m.o); keep(m.o); minis.push(m); }
  return { orb, minis, yellow };
}
function vyPose(F, s) {
  const V = F.vy, t = reduceMotion ? 0 : s.t, op = s.op;
  const bl = vyBlink(t, 0);
  for (const e of V.orb.eyes) e.scale.y = 0.1 * bl;
  V.orb.face.scale.x = 1 + 0.08 * Math.sin(t * 1.7);
  V.orb.body.rotation.z = Math.sin(t * 0.9) * 0.1; V.orb.body.position.y = Math.abs(Math.sin(t * 2.1)) * 0.04;
  V.yellow.emissive.setRGB(0.24 + 0.08 * Math.sin(t * 2.2), 0.2 + 0.07 * Math.sin(t * 2.2), 0.0);
  V.minis.forEach((m, i) => {
    const an = t * 0.9 + i * 2.094, hop = Math.abs(Math.sin(t * 2.6 + i * 1.3));
    m.o.visible = op > 0.05;
    m.o.position.set(Math.cos(an) * 0.6, 0.95 + 0.35 * Math.sin(t * 1.1 + i * 2) + hop * 0.12, Math.sin(an) * 0.6);
    m.o.rotation.y = Math.sin(an) * 0.7;   // (facing the way you face, turning a little as they go round)
    for (const e of m.eyes) e.scale.y = 0.1 * vyBlink(t, i + 1);
  });
}
// the crate card's picture: his face for a head, and the little ones circling
{
  const o0 = ocDrawPreview;
  ocDrawPreview = function (cv, oc, t) {
    o0.call(this, cv, oc, t);
    if (!oc || !oc.vy) return;
    const q = cv.getContext('2d'), k = cv.height / 100, tt = reduceMotion ? 0 : t;
    q.save(); q.translate(cv.width / 2, 0); q.scale(k, k);
    // (his head over the wrecker's, and his hat)
    q.fillStyle = '#121a28'; q.fillRect(-20, 0, 40, 34);
    q.fillStyle = oc.coat; q.beginPath(); q.moveTo(-17, 36); q.lineTo(17, 36); q.lineTo(15, 33); q.lineTo(-15, 33); q.fill();
    const gr = q.createRadialGradient(0, 22, 2, 0, 22, 22); gr.addColorStop(0, 'rgba(255,226,74,0.6)'); gr.addColorStop(1, 'rgba(255,226,74,0)'); q.fillStyle = gr; q.fillRect(-24, 0, 48, 44);
    vyFace(q, 0, 21 + Math.abs(Math.sin(tt * 2.1)) * -1, 13, tt, 0, 1, Math.sin(tt * 0.6));
    for (let i = 0; i < 3; i++) { const an = tt * 0.9 + i * 2.094, x = Math.cos(an) * 30, y = 52 + Math.sin(an) * 9; if (Math.sin(an) < 0) q.globalAlpha = 0.55; vyFace(q, x, y, 4.2, tt, i + 1, Math.sin(an) < 0 ? 0.55 : 1, 0); q.globalAlpha = 1; }
    q.restore();
  };
}

// ---------- the banner (src/rcrates.js rcPainter) ----------
const vyRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function vyPainter(skin) {
  const A = vyRgb(skin.cols[0]), Bc = vyRgb(skin.cols[1]), C = vyRgb(skin.cols[2]), G = vyRgb(skin.glow), K = [8, 6, 4], T = vyRgb(VYC.TONGUE);
  const mix = (p, q, k, o) => { o[0] = p[0] + (q[0] - p[0]) * k; o[1] = p[1] + (q[1] - p[1]) * k; o[2] = p[2] + (q[2] - p[2]) * k; };
  const f = (x, y, t, bd, o) => {
    // his yellow, damp-stained
    const damp = Math.sin(x * 0.09 + Math.sin(y * 0.07) * 2) * Math.sin(y * 0.11 - x * 0.03);
    mix(A, Bc, Math.max(0, damp) * 0.45, o); o[3] = 0;
    // his faces in it (one in each cell, eleven across), blinking in waves and grinning, giggles rippling out round them
    const S = 11, cx0 = Math.floor(x / S), cy0 = Math.floor(y / S), h = rcHash(cx0, cy0), lx = x - cx0 * S - 5, ly = y - cy0 * S - 5, r2 = lx * lx + ly * ly;
    const ring = Math.sin(Math.sqrt(r2) * 1.1 - t * 3 - h * 6);
    if (h > 0.3 && r2 <= 21) {
      mix(o, C, 0.35 + 0.15 * Math.sin(t * 2 + h * 9), o);
      const blink = Math.sin(t * 0.9 - (cx0 + cy0) * 0.6 + h * 3) > 0.93, wide = Math.sin(t * 1.4 + h * 20) > 0.5;
      const eye = (lx === -2 || lx === 2) && (blink ? ly === -1 : (ly === -2 || ly === -1));
      const mouth = (ly === 1 && Math.abs(lx) === 3) || (ly === 2 && Math.abs(lx) <= 2) || (wide && ly === 3 && Math.abs(lx) <= 1);
      if (eye || mouth) { o[0] = K[0]; o[1] = K[1]; o[2] = K[2]; if (wide && ly === 3 && lx === 0) mix(o, T, 0.8, o); }
      else if (lx === -2 && ly === -3) { mix(o, [255, 255, 240], 0.5, o); }
      o[3] = 0.08 + 0.1 * Math.max(0, ring);
    } else if (r2 < 42 && ring > 0.6) { mix(o, C, (ring - 0.6) * 1.2, o); o[3] = (ring - 0.6) * 0.35; }
    // now and then a glint on a face
    const g2 = rcHash(x, y); if (g2 > 0.993 && Math.sin(t * 5 + g2 * 300) > 0.6) { mix(o, C, 0.9, o); o[4] = 0.8; o[5] = 0; }
    // his room's strip lights flickering along your borders
    if (bd) { const out = rcHash(Math.floor((x + y) / 6), Math.floor(t * 6)) > 0.9; mix(o, out ? K : G, out ? 0.5 : 0.75 + 0.25 * Math.sin(t * 40 + x), o); }
  };
  f.glints = ['#fff6c8', '#ffffff']; f.glow = G; f.lit = true; f.level = 6; f.moves = true;
  return f;
}
{ const o0 = rcPainter; rcPainter = function (skin) { return skin && skin.kind === 'verity' ? vyPainter(skin) : o0.call(this, skin); }; }

// ---------- getting them: everything at once, the first time his token's taken (src/raidverity.js rvMe) ----------
// (how many were new: 0 if you had them all)
function vyGrant() {
  let n = 0; const touched = new Set();
  for (const [id, kind] of VY_ITEMS) {
    try {
      if (kind === 'outfit' && typeof OC !== 'undefined' && !OC.owned[id]) { OC.owned[id] = 1; touched.add('oc'); n++; }
      else if (kind === 'weapon' && typeof WC !== 'undefined' && !WC.owned[id]) { WC.owned[id] = 1; touched.add('wc'); n++; }
      else if (kind === 'banner' && typeof RC !== 'undefined' && !RC.owned[id]) { RC.owned[id] = 1; touched.add('rc'); n++; }
      else if (kind === 'boat' && typeof CRATES !== 'undefined' && !CRATES.owned[id]) { CRATES.owned[id] = 1; touched.add('bt'); n++; }
    } catch (e) {}
  }
  try { if (touched.has('oc')) { ocSave(); ocRender(); } } catch (e) {}
  try { if (touched.has('wc')) { wcSave(); wcRender(); } } catch (e) {}
  try { if (touched.has('rc')) { rcSave(); rcRender(); } } catch (e) {}
  try { if (touched.has('bt')) { saveCrates(); renderCrates(); } } catch (e) {}
  try { if (n && typeof cloudSaveSoon === 'function') cloudSaveSoon(); } catch (e) {}
  if (n) setTimeout(() => vyVoice(1.2, 0.8), 1500);
  return n;
}
// one of his, in its own store
function vyItem(id) {
  const kind = (VY_ITEMS.find(it => it[0] === id) || [])[1];
  if (kind === 'outfit') return { kind, it: OC_BY_ID[id], have: () => !!OC.owned[id], on: () => ocEquippedId() === id, equip: () => ocEquip(id), card: () => ocCard(OC_BY_ID[id]), verb: ['Wear', 'Wearing'] };
  if (kind === 'weapon') { const s = WC_SKIN_BY_ID[id]; return { kind, it: s, have: () => !!WC.owned[id], on: () => WC.equipped[s.weapon] === id, equip: () => wcEquip(s), card: () => wcCard(s), verb: ['Equip', 'Equipped'] }; }
  if (kind === 'banner') return { kind, it: RC_SKIN_BY_ID[id], have: () => !!RC.owned[id], on: () => rcEquippedId() === id, equip: () => rcEquip(id), card: () => rcCard(RC_SKIN_BY_ID[id]), verb: ['Fly', 'Flying'] };
  if (kind === 'boat') { const s = SKIN_BY_ID[id]; return { kind, it: s, have: () => !!CRATES.owned[id], on: () => CRATES.equipped[s.boat] === id, equip: () => equip(s), card: () => itemCard(s), verb: ['Equip', 'Equipped'] }; }
  return null;
}
// his wardrobe in the Gannet's Locker too, under the Locker's own (not for tokens: he drops it)
{
  const o0 = ptRender;
  ptRender = function () {
    o0.apply(this, arguments);
    const card = typeof $ === 'function' && $('ptCard'), inv = card && !card.hidden && $('ptInv'); if (!inv) return;
    const sub = document.createElement('span'); sub.className = 'invsub'; sub.textContent = 'Verity’s Wardrobe · dropped by Verity, in Maren’s End'; inv.appendChild(sub);
    for (const [id] of VY_ITEMS) {
      const I = vyItem(id); if (!I || !I.it) continue;
      const have = I.have(), on = have && I.on(), c = I.card(); if (!have) c.classList.add('locked'); if (on) c.classList.add('equipped'); c.dataset.id = id;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tool';
      if (!have) { b.textContent = 'Verity drops it'; b.disabled = true; }
      else { b.textContent = on ? I.verb[1] : I.verb[0]; b.disabled = on; b.setAttribute('aria-label', (on ? I.verb[1] + ': ' : I.verb[0] + ' ') + I.it.name); b.addEventListener('click', () => { I.equip(); ptRender(); }); }
      c.appendChild(b); inv.appendChild(c);
    }
  };
}
// his grade on the cards: the Locker's, in his yellow, with his smile
(function vyStyle() {
  const st = document.createElement('style'); st.id = 'vyStyle';
  st.textContent = `
.skincard.r-verity { overflow: hidden; isolation: isolate; background: #141004; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rc) 60%, transparent), 0 0 18px -4px var(--rc); }
.skincard.r-verity b { color: #fff6c8; }
.skincard.r-verity::after { content: ""; position: absolute; inset: -60%; z-index: -2; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0 18%, #f2d21c 26%, transparent 34% 52%, #fff6c8 58%, transparent 64% 100%);
  animation: vyTurn 3.2s linear infinite; opacity: 0.6; }
.skincard.r-verity::before { content: ""; position: absolute; inset: 2px; z-index: -1; pointer-events: none; border-radius: inherit;
  background: radial-gradient(circle at 50% 118%, rgba(6,5,4,0.9) 0 18%, transparent 19%), linear-gradient(180deg, rgba(24,20,6,0.97) 35%, rgba(70,58,8,0.97)); }
.skincard.r-verity .pips i { background: linear-gradient(180deg, #fff6c8, #f2d21c); box-shadow: 0 0 4px #f2d21c; }
.skincard.r-verity small { color: #ffe24a; text-shadow: 0 0 6px rgba(242,210,28,0.6); }
@keyframes vyTurn { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .skincard.r-verity::after { animation: none; } }
`;
  document.head.appendChild(st);
})();

// ---------- the sounds ----------
{
  // equipping any of his: he giggles
  const gig = () => { try { if (typeof loadVerityVoice === 'function') loadVerityVoice(); } catch (e) {} setTimeout(() => vyVoice(1.3, 0.5), 60); };
  const o1 = ocEquip; ocEquip = function (id) { const r = o1.apply(this, arguments); if (vyIs(id)) gig(); return r; };
  const o2 = wcEquip; wcEquip = function (s) { const r = o2.apply(this, arguments); if (vyIs(s)) gig(); return r; };
  const o3 = rcEquip; rcEquip = function (id) { const r = o3.apply(this, arguments); if (vyIs(id)) gig(); return r; };
  const o4 = equip; equip = function (s) { const r = o4.apply(this, arguments); if (vyIs(s)) gig(); return r; };
  // his finishes: every shot squeaks, every kill he giggles
  const o5 = fpsShoot; fpsShoot = function () { const n0 = FPS.vmShots || 0, r = o5.apply(this, arguments); if ((FPS.vmShots || 0) !== n0 && vyArmed()) vySqueak(fpsW().melee ? 0.6 : 1); return r; };
  const o6 = zmEarnKill; zmEarnKill = function () { const r = o6.apply(this, arguments); if (vyArmed()) vyKillGiggle(); return r; };
  const o7 = wcEarn; wcEarn = function (why) { const r = o7.apply(this, arguments); if (why === 'kill' && typeof FPS !== 'undefined' && FPS.on && !FPS.zm && vyArmed()) vyKillGiggle(); return r; };
  // his outfit: you giggle when you take a knock
  const o8 = fpsHurt; fpsHurt = function () { const r = o8.apply(this, arguments); const now = performance.now(); if (vyWearing() && now - VYA.hurt > 5000) { VYA.hurt = now; vyVoice(1.15 + Math.random() * 0.2, 0.35); } return r; };
  // his boats: a giggle for every crate hauled aboard
  const o9 = collectPickup; collectPickup = function () { const r = o9.apply(this, arguments); if (vyBoatSkin()) setTimeout(() => vyVoice(1.35, 0.45), 250); return r; };
}
// and at sea, now and then: his giggle (Verity's Smile), the Helper's boing, the strip lights' buzz, or a balloon's pop
setInterval(() => {
  try {
    if (typeof state === 'undefined' || state !== 'play' || !g || g.attract || (typeof document !== 'undefined' && document.hidden)) return;
    const s = vyBoatSkin(); if (!s) return;
    if (typeof loadVerityVoice === 'function') loadVerityVoice();
    if (--VYA.amb > 0) return;
    VYA.amb = 25 + Math.random() * 35;
    const sig = VY_SIG[s.id];
    if (sig === 'helper') vyBoing(); else if (sig === 'room') vyBuzz(); else if (sig === 'faces') { vyPop(); setTimeout(() => vyVoice(1.4, 0.3), 300); } else vyVoice(1.2 + Math.random() * 0.2, 0.35);
  } catch (e) {}
}, 1000);
// his outfit, in a game: a 1 in 50 chance each second that he speaks up (his voice, as in his room)
setInterval(() => {
  try {
    if (typeof FPS === 'undefined' || !FPS.on || (typeof document !== 'undefined' && document.hidden) || !vyWearing()) return;
    if (typeof loadVerityVoice === 'function') loadVerityVoice();
    if (Math.random() < 1 / 50) vyVoice(1, 0.6);
  } catch (e) {}
}, 1000);
