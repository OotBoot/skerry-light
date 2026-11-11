// The Gannet's Locker boat skins: a grade above the Admiral's, alive in the drowned crew's sea-green and the hoard's gold.
//
// Four boat skins only the Lighthouse's pirate tokens unlock (src/zmegg.js), one for each boat. They wear everything
// an Admiral skin wears (gold trim, the breathing glow, the sparkles round the rig, from src/skinfx.js), and on top of
// it all the Locker's own look, shared by the four:
//   the crew's lights   eight sea-green lights circling her just under the water, bobbing as they go
//   corposant           cold green fire flickering on her mastheads (St Elmo's fire)
//   doubloons           gold coins tumbling off her rail into the sea, turning as they fall, and a glint where they go in
// and each has a signature of its own:
//   gannetghost   The Gannet's Ghost      (brig)    the drowned brig herself: green ghost-fire licking up her sails,
//                                                   which flicker see-through, and her crew's eight lights come up out
//                                                   of the sea to circle her rig
//   c_crossing    Maren's Crossing        (cutter)  a storm lantern swinging at her bow, throwing a road of gold light
//                                                   over the water ahead, and a wake of gold that lingers behind her
//   b_doubloon    The Black Doubloon      (barque)  black sails with a great gold doubloon turning on the mainsail,
//                                                   coins raining off the yards, and a black flag at the masthead
//   k_drowned     The Drowned Fleet       (carrier) two ghost brigs of the Gannet's line sail in escort either side of
//                                                   her, and green lights run her flight deck's edges
//
// How it's wired: admiralSig (src/admiralfx.js) hands back a LOCKER_SIG entry (with locker: true) for these, so
// everything that asks "is this an Admiral?" gives them the Admiral base; each admiralfx function then hands the
// signature part to the matching locker function here. skinTier (src/ship3d.js) puts them at 6, above the Admiral.
// Cost: as the Admiral looks. Near ships only get the full detail, every soft light is one of render.js's cached lamp
// sprites with its size capped, particle counts are fixed and small, and nothing builds a gradient per particle. With
// reduced motion it all holds still.

var LOCKER_SIG = {
  gannetghost: { sig: 'ghost',    glow: '#3ee0b4', hi: '#d0fff0', sheen: '#7affd0', locker: true },
  c_crossing:  { sig: 'crossing', glow: '#ffd34d', hi: '#fff3c4', sheen: '#9affd8', locker: true },
  b_doubloon:  { sig: 'hoard',    glow: '#ffd34d', hi: '#fff0a0', sheen: '#7affd0', locker: true },
  k_drowned:   { sig: 'fleet',    glow: '#3ee0b4', hi: '#d0fff0', sheen: '#9affd8', locker: true },
};
const LK_GREEN = '#3ee0b4', LK_PALE = '#d0fff0', LK_GOLD = '#ffd34d', LK_WHITE = '#fff3c4';
// (a cap on every soft light here: the Admiral's own is 320, these stay well under it)
const lkGlow = (x, y, col, r, a) => admGlow(x, y, col, Math.min(r, 140), a);

// ---------- small things drawn often ----------
// a gold coin, edge-on as it turns (spin in radians)
function lkCoin(x, y, r, spin, a) {
  if (r < 0.6 || a <= 0.02) return;
  const c = Math.cos(spin), rx = Math.max(0.15, Math.abs(c)) * r;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = c > 0 ? '#e8b830' : '#c89420';
  ctx.beginPath(); ctx.ellipse(x, y, rx, r, 0, 0, 6.283); ctx.fill();
  if (r > 2.5) { ctx.strokeStyle = '#8a6010'; ctx.lineWidth = Math.max(0.6, r * 0.12); ctx.beginPath(); ctx.ellipse(x, y, rx * 0.72, r * 0.72, 0, 0, 6.283); ctx.stroke(); }
  ctx.fillStyle = LK_WHITE; ctx.globalAlpha = Math.min(1, a) * (0.5 + 0.5 * Math.abs(Math.sin(spin * 2)));
  ctx.beginPath(); ctx.ellipse(x - rx * 0.3, y - r * 0.35, rx * 0.25, r * 0.22, 0, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
}
// a tongue of cold green fire, h tall, flickering
function lkFlame(x, y, h, t, i, a) {
  if (h < 1.5 || a <= 0.02) return;
  const fl = 0.75 + 0.25 * Math.sin(t * 13 + i * 2.1) + 0.12 * Math.sin(t * 29 + i), hh = h * fl, w = h * 0.32, sw = Math.sin(t * 5 + i) * w * 0.6;
  ctx.globalAlpha = Math.min(1, a) * 0.8; ctx.fillStyle = LK_GREEN;
  ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 1.1, y - hh * 0.55, x + sw, y - hh); ctx.quadraticCurveTo(x + w * 1.1, y - hh * 0.55, x + w, y); ctx.quadraticCurveTo(x, y + w * 0.7, x - w, y); ctx.fill();
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = LK_PALE;
  ctx.beginPath(); ctx.moveTo(x - w * 0.45, y); ctx.quadraticCurveTo(x - w * 0.4, y - hh * 0.4, x + sw * 0.6, y - hh * 0.62); ctx.quadraticCurveTo(x + w * 0.4, y - hh * 0.4, x + w * 0.45, y); ctx.fill();
  lkGlow(x, y - hh * 0.4, LK_GREEN, h * 1.6, a * 0.45);
}
// one of the crew's lights: a green soul-light with a white heart
function lkSoul(x, y, r, a) { lkGlow(x, y, LK_GREEN, r * 3.2, a * 0.55); lkGlow(x, y, LK_PALE, r * 1.1, a * 0.9); }
// a ghost brig of the Gannet's line, at (u0, w0) beside the ship, L half-length, sailing with her (lighter blend)
function lkGhostShip(P, u0, w0, L, t, a, bob) {
  const z0 = Math.sin(t * 1.1 + bob) * L * 0.02, hh = L * 0.16, hull = [], q = (u, z) => P(u0 + u, w0, z0 + z);
  const pts = [q(-L, hh * 0.9), q(-L * 0.8, 0), q(L * 0.7, 0), q(L * 1.05, hh * 1.4), q(L * 0.6, hh), q(-L, hh)];
  for (const p of pts) { if (!p) return; hull.push(p); }
  ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#2a8a74';
  ctx.beginPath(); hull.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = a * 0.8; ctx.strokeStyle = LK_GREEN; ctx.lineWidth = Math.max(1, hull[0].s * 0.12); ctx.stroke();
  const mh = L * 1.4;
  for (const m of [-0.25, 0.25]) {
    const b = q(m * L * 1.6, hh), tp = q(m * L * 1.6, mh); if (!b || !tp) continue;
    ctx.globalAlpha = a * 0.7; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tp.x, tp.y); ctx.stroke();
    for (const [z0s, z1s, wd] of [[0.3, 0.6, 0.42], [0.64, 0.92, 0.32]]) {
      const s0 = q(m * L * 1.6 - L * wd, mh * z0s), s1 = q(m * L * 1.6 + L * wd, mh * z0s), s2 = q(m * L * 1.6 + L * wd * 0.85, mh * z1s), s3 = q(m * L * 1.6 - L * wd * 0.85, mh * z1s);
      if (!s0 || !s1 || !s2 || !s3) continue;
      // the sails flicker, ragged, as a ghost's would
      ctx.globalAlpha = a * (0.18 + 0.1 * Math.sin(t * 3 + m * 9 + z0s * 5)); ctx.fillStyle = LK_PALE;
      ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.lineTo(s3.x, s3.y); ctx.closePath(); ctx.fill();
    }
    lkFlame(tp.x, tp.y, Math.max(2, tp.s * 0.9), t, m * 7 + bob, a * 0.8);
  }
  // her stern lantern
  const st = q(-L * 0.9, hh * 1.6); if (st) lkGlow(st.x, st.y, LK_GREEN, Math.max(4, st.s * 2.2), a * 0.7);
}

// ---------- on a 3D ship, behind it ----------
function lockerFxBefore(skin, a, P, Lh, B, Zd, mastH, s) {
  const t = admT(), full = s > 5, sig = a.sig;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // the crew's lights, circling just under the water round her: the far half here, the near half after the hull
  lkSouls(P, Lh, B, t, full, -1);
  if (sig === 'crossing') {
    // the lantern's road of gold over the water ahead of her bow, broken by the swell
    for (let i = 0; i < (full ? 12 : 5); i++) {
      const k = i / 12, p = P(Lh * (1.1 + k * 6), Math.sin(t * 1.3 + i * 0.9) * B * 0.3, 0); if (!p) continue;
      const tw = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.25); lkGlow(0, 0, LK_GOLD, Math.max(4, B * 2.2 * p.s * (1 - k * 0.4)), (0.4 - k * 0.2) * tw); ctx.restore();
    }
    // and her wake, gold, lingering behind
    for (let i = 0; i < (full ? 10 : 4); i++) {
      const life = (t * 0.25 + i / 10) % 1, p = P(-Lh * (1 + life * 5), Math.sin(i * 2.3) * B * (0.3 + life * 1.2), 0); if (!p) continue;
      lkGlow(p.x, p.y, i % 3 ? LK_GOLD : LK_GREEN, Math.max(2, p.s * (1.2 + life)), (1 - life) * 0.5);
    }
  } else if (sig === 'fleet' && full) {
    lkFleet(P, Lh, B, t, -1);
  }
  ctx.restore();
}
// eight lights in a ring round her under the water; half -1 the far side of her, +1 the near
function lkSouls(P, Lh, B, t, full, half) {
  const ctr = P(0, 0, 0); if (!ctr) return;
  const n = full ? 8 : 4;
  for (let i = 0; i < n; i++) {
    const an = t * 0.35 + i * 6.283 / n, p = P(Math.cos(an) * Lh * 1.3, Math.sin(an) * B * 2.8, -0.4 + Math.sin(t * 1.6 + i) * 0.3);
    if (!p || (p.s - ctr.s) * half < 0) continue;
    lkSoul(p.x, p.y, Math.max(1.5, p.s * 0.45), 0.55 + 0.25 * Math.sin(t * 2.3 + i * 1.9));
  }
}
// the Drowned Fleet's escort: one ghost brig off each beam; half -1 the far one, +1 the near one
function lkFleet(P, Lh, B, t, half) {
  const ctr = P(0, 0, 0); if (!ctr) return;
  for (const sd of [-1, 1]) {
    const w0 = sd * B * 2.7, u0 = Lh * 0.55 + Math.sin(t * 0.3 + sd) * Lh * 0.08, m = P(u0, w0, 0);
    if (!m || (m.s - ctr.s) * half < 0) continue;
    lkGhostShip(P, u0, w0, Lh * 0.32, t, 0.6 + 0.2 * Math.sin(t * 0.9 + sd * 2), sd * 3);
  }
}

// ---------- on one face of the hull ----------
function lockerHullFx(skin, a, f, at, Lh) {
  const t = admT(), sig = a.sig, ga = ctx.globalAlpha;
  const quad = (s0, s1, h0, h1, col) => fillPoly([at(s0, h0), at(s1, h0), at(s1, h1), at(s0, h1)], col);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const pos = f.side ? (f.i + 0.5) / 6 : -0.05;
  // the shared look: the drowned crew's green breathing in her topsides, and a gold seam under the rail that
  // a bright pulse chases from bow to stern
  ctx.globalAlpha = ga * (0.2 + 0.12 * Math.sin(t * 1.9 + pos * 4)); quad(0, 1, 0.3, 0.8, sig === 'hoard' || sig === 'crossing' ? '#1c6a58' : LK_GREEN);
  const sw = 1.25 - ((t * 0.5) % 1.6), sh = Math.exp(-((pos - sw) * (pos - sw)) * 30);
  ctx.globalAlpha = ga * (0.35 + sh * 0.65); quad(0, 1, 0.8, 0.85, LK_GOLD);
  if (sh > 0.05) { ctx.globalAlpha = ga * sh * 0.5; quad(0, 1, 0.3, 0.86, LK_PALE); }
  if (sig === 'ghost') {
    // her planks flicker as if the sea showed through them
    const fl = hash(Math.floor(t * 9) + f.i * 13, 141);
    if (fl > 0.7) { ctx.globalAlpha = ga * (fl - 0.7) * 1.6; quad(0, 1, 0.1, 0.78, LK_PALE); }
  } else if (sig === 'hoard') {
    // gold glinting on the black planks, as if she were built of the hoard
    for (let k = 0; k < 4; k++) { const tw = Math.max(0, Math.sin(t * 2.6 + k * 1.9 + f.i * 1.3)); if (tw > 0.4) { ctx.globalAlpha = ga * tw; quad(k / 4 + 0.05, k / 4 + 0.11, 0.45 + 0.2 * hash(k, f.i), 0.53 + 0.2 * hash(k, f.i), LK_GOLD); } }
  } else if (sig === 'fleet') {
    // green lights along her waterline, like weed glowing on a wreck
    for (let k = 0; k < 6; k++) { ctx.globalAlpha = ga * (0.4 + 0.5 * Math.max(0, Math.sin(t * 3 - (pos * 6 + k) * 1.1))); quad(k / 6 + 0.02, k / 6 + 0.1, 0.14, 0.2, LK_GREEN); }
  } else if (sig === 'crossing') {
    ctx.globalAlpha = ga * (0.18 + 0.1 * Math.sin(t * 7) * Math.sin(t * 3.1)); quad(0.6, 1, 0.3, 0.84, LK_GOLD);
  }
  ctx.restore();
}

// ---------- on a sail ----------
function lockerSailFx(skin, a, pts, main) {
  const q = polyProj(pts); if (q.length < 3) return;
  const t = admT(), sig = a.sig;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of q) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
  const w = x1 - x0, h = y1 - y0; if (w < 3 || h < 3) return;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ga = ctx.globalAlpha;
  ctx.save();
  ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  ctx.globalCompositeOperation = 'lighter';
  if (sig === 'ghost') {
    ctx.clip();
    // green ghost-fire licking up from the foot of the cloth
    const lg = ctx.createLinearGradient(0, y1, 0, y0); lg.addColorStop(0, LK_GREEN); lg.addColorStop(0.55, '#3ee0b400');
    ctx.globalAlpha = ga * (0.5 + 0.2 * Math.sin(t * 6 + mx * 0.02)); ctx.fillStyle = lg; ctx.fillRect(x0, y0, w, h);
    for (let i = 0; i < 4; i++) lkFlame(x0 + w * (0.15 + i * 0.23), y1, h * (0.28 + 0.12 * Math.sin(t * 3 + i * 2)), t, i + mx * 0.01, ga * 0.6);
    // and the cloth itself comes and goes
    ctx.globalCompositeOperation = 'source-over';
    const fl = 0.5 + 0.5 * Math.sin(t * 1.3 + mx * 0.01);
    ctx.globalAlpha = ga * 0.28 * fl; ctx.fillStyle = '#04120f'; ctx.fillRect(x0, y0, w, h);
  } else if (sig === 'hoard' && main) {
    ctx.clip();
    ctx.globalAlpha = ga * (0.12 + 0.06 * Math.sin(t * 1.5)); ctx.fillStyle = LK_GOLD; ctx.fillRect(x0, y0, w, h);
    // the great doubloon on the mainsail, turning slowly, with the saltire on it
    const r = Math.min(w, h) * 0.3, spin = t * 0.8, c = Math.cos(spin), rx = Math.max(0.12, Math.abs(c)) * r;
    lkGlow(mx, my, LK_GOLD, r * 2.2, ga * 0.5);
    lkCoin(mx, my, r, spin, ga);
    if (Math.abs(c) > 0.3) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ga * Math.abs(c); ctx.strokeStyle = '#3a2408'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.moveTo(mx - rx * 0.45, my - r * 0.45); ctx.lineTo(mx + rx * 0.45, my + r * 0.45); ctx.moveTo(mx + rx * 0.45, my - r * 0.45); ctx.lineTo(mx - rx * 0.45, my + r * 0.45); ctx.stroke(); }
  } else if (sig === 'hoard') {
    ctx.globalAlpha = ga * (0.1 + 0.07 * Math.sin(t * 2 + mx * 0.02)); ctx.fillStyle = LK_GOLD; ctx.fill();
  } else if (sig === 'crossing') {
    ctx.clip();
    // the lantern's light washing up the cloth from the bow
    const k = (t * 0.4) % 1.4 - 0.2, yb = y1 - k * h;
    ctx.globalAlpha = ga * 0.16; ctx.fillStyle = LK_GOLD; ctx.fillRect(x0, y0, w, h);
    ctx.globalAlpha = ga * 0.4; ctx.fillStyle = LK_WHITE; ctx.fillRect(x0, yb - h * 0.06, w, h * 0.12);
    ctx.globalAlpha = ga * 0.2; ctx.fillStyle = LK_GREEN; ctx.fillRect(x0, yb - h * 0.2, w, h * 0.4);
  }
  ctx.restore();
}

// ---------- on a 3D ship, in front ----------
function lockerFxAfter(skin, a, P, Lh, B, Zd, mastH, s) {
  const t = admT(), full = s > 5, sig = a.sig, carrier = skin.boat === 'carrier';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  lkSouls(P, Lh, B, t, full, 1);
  if (sig === 'fleet' && full) lkFleet(P, Lh, B, t, 1);
  // corposant: cold green fire on every masthead (the carrier's on her mast and the island's corners)
  const heads = carrier ? [[-Lh * 0.2, B * 0.6, Zd + mastH], [Lh * 0.05, B * 0.6, Zd + mastH * 0.6]] : admMasts(skin, Lh).map(u => [u, 0, Zd + mastH * 1.02]);
  heads.forEach(([u, w, z], i) => { const p = P(u, w, z); if (p) lkFlame(p.x, p.y, Math.min(46, Math.max(3, p.s * 1.4)), t, i * 3.3, 0.9); });
  // doubloons tumbling off her rail into the sea, each with a glint where it goes in
  const n = full ? (sig === 'hoard' ? 14 : 8) : 3;
  for (let i = 0; i < n; i++) {
    const life = (t * 0.45 + hash(i, 151)) % 1, sd = i % 2 ? 1 : -1, u = (hash(i, 152) * 2 - 1) * Lh * 0.8;
    // the hoard's rain from the yards; the rest drop off the rail
    const z0 = sig === 'hoard' ? Zd + mastH * (0.5 + hash(i, 153) * 0.4) : Zd, z = z0 * (1 - life * life);
    const p = P(u - life * 2, sd * B * (1.05 + life * 0.5), z); if (!p) continue;
    if (life > 0.93) { lkGlow(p.x, p.y, LK_GOLD, Math.max(3, p.s * 1.2), (1 - life) * 10); continue; }
    lkCoin(p.x, p.y, Math.min(10, Math.max(1, p.s * 0.28)), t * 7 + i, 0.95);
  }
  if (sig === 'ghost') {
    // the crew, come up out of the sea: eight lights circling the rig with trails behind them
    const m = admMasts(skin, Lh);
    for (let i = 0; i < (full ? 8 : 3); i++) {
      const mu = m[i % m.length];
      for (let k = 0; k < 3; k++) {
        const an = t * 0.9 + i * 0.785 - k * 0.12, p = P(mu + Math.cos(an) * Lh * 0.35, Math.sin(an) * B * 1.8, Zd + mastH * (0.4 + 0.25 * Math.sin(t * 0.7 + i)));
        if (!p) continue;
        if (!k) lkSoul(p.x, p.y, Math.min(12, Math.max(1.5, p.s * 0.4)), 0.95); else lkGlow(p.x, p.y, LK_GREEN, Math.min(30, Math.max(2, p.s * 0.6)), 0.3 / k);
      }
    }
  } else if (sig === 'crossing') {
    // the storm lantern at her bow, swinging
    const sway = Math.sin(t * 1.7) * 0.5, p = P(Lh * 0.95 + sway * 0.4, sway, Zd + 1.4);
    if (p) {
      const fl = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 7.3);
      lkGlow(p.x, p.y, LK_GOLD, Math.max(10, p.s * 5) * fl, 0.65);
      lkGlow(p.x, p.y, LK_GREEN, Math.max(16, p.s * 8), 0.2);
      lkGlow(p.x, p.y, '#ffffff', Math.max(3, p.s * 0.9), 0.95);
    }
  } else if (sig === 'hoard') {
    // a black flag at her masthead, with the bone-white saltire on it
    const m = admMasts(skin, Lh), mu = m[Math.floor(m.length / 2)];
    const p0 = P(mu, 0, Zd + mastH * 1.08), L = Math.max(4, mastH * 0.22);
    if (p0) {
      const pts = [];
      for (let k = 0; k <= 4; k++) { const p = P(mu - k * L * 0.25, Math.sin(t * 4 - k * 0.9) * L * 0.08 * k, Zd + mastH * 1.08 - L * 0.1 + Math.sin(t * 4 - k) * L * 0.04); if (!p) return ctx.restore(); pts.push(p); }
      const hgt = L * 0.32 * p0.s;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.95; ctx.fillStyle = '#060608';
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); for (let k = 4; k >= 0; k--) ctx.lineTo(pts[k].x, pts[k].y + hgt); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ece4cf'; ctx.lineWidth = Math.max(0.8, hgt * 0.12);
      ctx.beginPath(); ctx.moveTo(pts[1].x, pts[1].y + hgt * 0.15); ctx.lineTo(pts[3].x, pts[3].y + hgt * 0.85); ctx.moveTo(pts[3].x, pts[3].y + hgt * 0.15); ctx.lineTo(pts[1].x, pts[1].y + hgt * 0.85); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      lkGlow(pts[2].x, pts[2].y + hgt / 2, LK_GREEN, hgt * 2.5, 0.25);
    }
  } else if (sig === 'fleet') {
    // green lights chasing round the flight deck's edge
    for (let i = 0; i < (full ? 16 : 6); i++) {
      const k = i / (full ? 16 : 6), sd = i % 2 ? 1 : -1, chase = Math.max(0, Math.sin(t * 4 - k * 12)), p = P(Lh * (k * 2 - 1) * 0.95, sd * B * 0.95, Zd + 0.3);
      if (p) lkGlow(p.x, p.y, LK_GREEN, Math.min(24, Math.max(2, p.s * 0.8)), 0.2 + 0.7 * chase);
    }
  }
  ctx.restore();
}

// ---------- on your deck, first person ----------
function lockerDeckFx(skin, a, tipY, DW, railT) {
  const t = admT(), sig = a.sig;
  const rx = (sd, k) => cx + sd * DW + (sd * 6 - sd * DW) * k, ry = k => (H - 4) + (tipY + 2 - (H - 4)) * k;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // the shared look: a green-and-gold pulse running up both rails, gold glinting along them, and cold fire at the bow
  { const k = (t * 0.5) % 1.4; if (k < 1) for (const sd of [-1, 1]) { lkGlow(rx(sd, k), ry(k) - railT * 0.5, LK_GREEN, railT * 4 * (1.2 - k * 0.7), 0.6 * Math.sin(k * Math.PI)); lkGlow(rx(sd, k), ry(k) - railT * 0.5, LK_GOLD, railT * 1.6 * (1.2 - k * 0.7), 0.7 * Math.sin(k * Math.PI)); } }
  for (let i = 0; i < 8; i++) { const sd = i % 2 ? 1 : -1, k = 0.05 + hash(i, 161) * 0.75, tw = Math.max(0, Math.sin(t * 2.2 + i * 1.7)); if (tw > 0.3) lkCoin(rx(sd, k), ry(k) - railT * 1.2, 3 + (1 - k) * 6, t * 3 + i, tw); }
  lkFlame(cx, tipY + 2, Math.min(H * 0.11, 70), t, 0, 0.95);
  // the crew's lights under the water ahead of the bow, wheeling slowly
  for (let i = 0; i < 8; i++) { const an = t * 0.3 + i * 0.785, x = cx + Math.cos(an) * W * 0.3, y = (hy - pitchY) + (tipY - (hy - pitchY)) * (0.45 + 0.3 * Math.sin(an)); if (y > hy - pitchY) lkSoul(x, y, 3 + 3 * (y - hy + pitchY) / Math.max(1, tipY - hy + pitchY), 0.5); }
  if (sig === 'ghost') {
    // her crew's lights drifting round you over the deck
    for (let i = 0; i < 8; i++) {
      const an = t * 0.35 + i * 0.785, x = cx + Math.cos(an) * W * 0.42, y = tipY - H * 0.05 + Math.sin(an * 1.3 + i) * H * 0.18;
      lkSoul(x, y, 7 + 3 * Math.sin(t * 2 + i), 0.75);
    }
  } else if (sig === 'crossing') {
    // the lantern swinging at the bow, and its road of gold running out over the water to the horizon
    const sw = Math.sin(t * 1.7), lx = cx + sw * 14, ly = tipY - 18 + Math.abs(sw) * 3, fl = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 7.3);
    for (let i = 0; i < 9; i++) { const k = i / 9, y = tipY + (hy - pitchY - tipY) * k * 1.05, x = cx + Math.sin(t * 1.3 + i) * 10 * (1 - k); ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.22); lkGlow(0, 0, LK_GOLD, (1 - k * 0.7) * W * 0.12, 0.35 * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7))); ctx.restore(); }
    lkGlow(lx, ly, LK_GOLD, 60 * fl, 0.55); lkGlow(lx, ly, '#ffffff', 10, 0.95);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.9; ctx.strokeStyle = '#2a2014'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, tipY - 34); ctx.lineTo(lx, ly - 8); ctx.stroke(); ctx.strokeRect(lx - 6, ly - 8, 12, 16);
  } else if (sig === 'hoard') {
    // now and then a coin comes spinning down past you from the yards
    for (let i = 0; i < 7; i++) { const life = (t * 0.22 + hash(i, 171)) % 1, x = W * (0.1 + 0.8 * hash(i, 172)) + Math.sin(t + i) * 20, y = -20 + life * (H * 0.85); lkCoin(x, y, 5 + hash(i, 173) * 4, t * 6 + i, 0.9); }
  } else if (sig === 'fleet') {
    // her escort, ghost brigs on the horizon either side, and the deck's edge lights chasing
    for (const sd of [-1, 1]) {
      const x = cx + sd * W * 0.36, y = hy - pitchY, L = Math.min(W, H) * 0.07, a2 = 0.5 + 0.2 * Math.sin(t * 0.9 + sd);
      ctx.globalAlpha = a2 * 0.5; ctx.fillStyle = '#2a8a74'; ctx.beginPath(); ctx.moveTo(x - L, y - L * 0.12); ctx.lineTo(x + L * 1.1, y - L * 0.2); ctx.lineTo(x + L * 0.8, y + L * 0.06); ctx.lineTo(x - L * 0.85, y + L * 0.06); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = a2 * 0.35; ctx.fillStyle = LK_PALE;
      for (const m of [-0.35, 0.35]) { ctx.fillRect(x + m * L - L * 0.3, y - L * 1.05, L * 0.6, L * 0.35); ctx.fillRect(x + m * L - L * 0.38, y - L * 0.62, L * 0.76, L * 0.4); }
      for (const m of [-0.35, 0.35]) lkFlame(x + m * L, y - L * 1.1, L * 0.3, t, m * 5 + sd, a2);
    }
    for (const sd of [-1, 1]) for (let i = 0; i < 8; i++) { const k = i / 8, chase = Math.max(0, Math.sin(t * 4 - k * 9)); lkGlow(rx(sd, k), ry(k) - railT * 0.3, LK_GREEN, railT * 1.5 + 4, 0.15 + 0.7 * chase); }
  }
  ctx.restore();
}

// ---------- in a crate preview (SVG, animated with SMIL) ----------
function lockerPreviewFx(svg, skin, a, geo) {
  const NS = 'http://www.w3.org/2000/svg', still = typeof reduceMotion !== 'undefined' && reduceMotion;
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
  const anim = (node, attrs, tag) => { if (still) return node; const e = document.createElementNS(NS, tag || 'animate'); for (const k in attrs) e.setAttribute(k, attrs[k]); if (!e.getAttribute('repeatCount')) e.setAttribute('repeatCount', 'indefinite'); node.appendChild(e); return node; };
  const behind = node => { const d = svg.querySelector('defs'), ref = d && d.nextSibling ? d.nextSibling.nextSibling : svg.firstChild; svg.insertBefore(node, ref); return node; };
  const { sternX = 12, bowX = 104, deckY = 54 } = geo || {}, mid = (sternX + bowX) / 2, sig = a.sig;
  // a sea-green glow rising behind her, and a gold-and-green sheen across the picture
  behind(anim(el('ellipse', { cx: mid, cy: 46, rx: 54, ry: 30, fill: LK_GREEN, opacity: 0.3, filter: 'url(#fxblur)' }), { attributeName: 'opacity', values: '0.18;0.5;0.18', dur: '2.8s' }));
  const sheen = el('rect', { x: -30, y: 0, width: 16, height: 80, fill: LK_GREEN, opacity: 0.25, transform: 'skewX(-18)', filter: 'url(#fxblur2)' });
  anim(sheen, { attributeName: 'x', values: '-30;150', dur: '2.4s' });
  // the crew's lights circling under her
  for (let i = 0; i < 8; i++) {
    const c = el('circle', { cx: mid, cy: 70, r: 1.6, fill: LK_PALE, opacity: 0.9 });
    const ph = (i / 8 * 6).toFixed(2);
    anim(c, { attributeName: 'cx', values: `${mid - 46};${mid};${mid + 46};${mid};${mid - 46}`, dur: '6s', begin: '-' + ph + 's' });
    anim(c, { attributeName: 'cy', values: '69;73;69;66;69', dur: '6s', begin: '-' + ph + 's' });
    anim(c, { attributeName: 'opacity', values: '0.9;1;0.9;0.35;0.9', dur: '6s', begin: '-' + ph + 's' });
  }
  // doubloons dropping off her rail, turning as they fall
  for (let i = 0; i < 5; i++) {
    const x = sternX + 14 + i * (bowX - sternX - 28) / 4, co = el('ellipse', { cx: x, cy: deckY, rx: 1.8, ry: 1.8, fill: '#e8b830', stroke: '#8a6010', 'stroke-width': 0.4 });
    const b = (i * 0.37).toFixed(2) + 's';
    anim(co, { attributeName: 'cy', values: `${deckY};${deckY + 16}`, dur: '1.5s', begin: b }); anim(co, { attributeName: 'rx', values: '1.8;0.3;1.8;0.3;1.8', dur: '1.5s', begin: b }); anim(co, { attributeName: 'opacity', values: '1;1;0', keyTimes: '0;0.8;1', dur: '1.5s', begin: b });
  }
  // cold fire at the mastheads
  const bt = BOAT_BY_ID[skin.boat] || BOATS[0], half = 46 * bt.len / 27, top = deckY - 44 * Math.min(1, bt.len / 22) * (bt.id === 'cutter' ? 1.05 : 1);
  const heads = bt.masts.length ? bt.masts.map(m => [58 + m * half * 1.6, top]) : [[44, deckY - 33]];
  for (const [hx, hyy] of heads) {
    const fl = el('path', { d: `M${hx - 2} ${hyy} Q${hx} ${hyy - 7} ${hx} ${hyy - 8} Q${hx} ${hyy - 7} ${hx + 2} ${hyy} Z`, fill: LK_GREEN, filter: 'url(#fxblur2)' });
    anim(fl, { attributeName: 'd', values: `M${hx - 2} ${hyy} Q${hx - 1} ${hyy - 6} ${hx - 1} ${hyy - 8} Q${hx + 1} ${hyy - 6} ${hx + 2} ${hyy} Z;M${hx - 2} ${hyy} Q${hx + 1} ${hyy - 5} ${hx + 1.5} ${hyy - 6} Q${hx + 1} ${hyy - 5} ${hx + 2} ${hyy} Z;M${hx - 2} ${hyy} Q${hx - 1} ${hyy - 6} ${hx - 1} ${hyy - 8} Q${hx + 1} ${hyy - 6} ${hx + 2} ${hyy} Z`, dur: '0.5s' });
    el('circle', { cx: hx, cy: hyy - 2, r: 1, fill: LK_PALE });
  }
  if (sig === 'ghost') {
    // she comes and goes, and her crew's lights wheel about her rig
    anim(svg, { attributeName: 'opacity', values: '1;0.6;1;0.8;1', dur: '3.4s' });
    for (let i = 0; i < 4; i++) { const g1 = el('g', { transform: `translate(${mid} 30)` }); el('circle', { cx: 24, cy: 0, r: 1.5, fill: LK_PALE }, g1); el('circle', { cx: 24, cy: 0, r: 3.5, fill: LK_GREEN, opacity: 0.5 }, g1); anim(g1, { attributeName: 'transform', type: 'rotate', values: `${i * 90};${i * 90 + 360}`, additive: 'sum', dur: '4s' }, 'animateTransform'); g1.setAttribute('transform', `translate(${mid} 30) scale(1 0.45)`); }
  } else if (sig === 'crossing') {
    const lx = bowX + 4, ly = deckY - 10;
    behind(el('path', { d: `M${lx} ${deckY + 12} L130 ${deckY + 9} L130 ${deckY + 18} Z`, fill: LK_GOLD, opacity: 0.35, filter: 'url(#fxblur2)' }));
    const lamp = el('g', {});
    el('circle', { cx: lx, cy: ly, r: 7, fill: LK_GOLD, opacity: 0.35, filter: 'url(#fxblur2)' }, lamp); el('rect', { x: lx - 1.6, y: ly - 2.2, width: 3.2, height: 4.4, fill: '#fff3c4', stroke: '#2a2014', 'stroke-width': 0.5 }, lamp);
    anim(lamp, { attributeName: 'transform', type: 'rotate', values: `-14 ${lx} ${ly - 6};14 ${lx} ${ly - 6};-14 ${lx} ${ly - 6}`, dur: '2.2s' }, 'animateTransform');
    for (let i = 0; i < 5; i++) { const d = el('circle', { cx: sternX - 2 - i * 4, cy: deckY + 12 + (i % 2) * 2, r: 1.4, fill: i % 2 ? LK_GREEN : LK_GOLD, opacity: 0.6 }); anim(d, { attributeName: 'opacity', values: '0.9;0.1;0.9', dur: '1.8s', begin: (i * 0.3) + 's' }); }
  } else if (sig === 'hoard') {
    const m = bt.masts[Math.floor(bt.masts.length / 2)], mxp = 58 + m * half * 1.6, cy = deckY - 22;
    const coin = el('ellipse', { cx: mxp, cy, rx: 6, ry: 6, fill: '#e8b830', stroke: '#8a6010', 'stroke-width': 0.8 });
    anim(coin, { attributeName: 'rx', values: '6;0.6;6', dur: '3s' });
    const x = el('path', { d: `M${mxp - 3} ${cy - 3} L${mxp + 3} ${cy + 3} M${mxp + 3} ${cy - 3} L${mxp - 3} ${cy + 3}`, stroke: '#3a2408', 'stroke-width': 1 });
    anim(x, { attributeName: 'opacity', values: '1;0;1', dur: '3s' });
    const flag = el('path', { d: `M${mxp} ${top - 1} l-9 1 l0 5 l9 -1 Z`, fill: '#060608', stroke: '#ece4cf', 'stroke-width': 0.3 });
    anim(flag, { attributeName: 'd', values: `M${mxp} ${top - 1} l-9 1 l0 5 l9 -1 Z;M${mxp} ${top - 1} l-9 -1 l0 5 l9 1 Z;M${mxp} ${top - 1} l-9 1 l0 5 l9 -1 Z`, dur: '1.2s' });
    for (let i = 0; i < 7; i++) { const cx0 = 22 + hash(i, 181) * 76, c = el('ellipse', { cx: cx0, cy: 6, rx: 1.4, ry: 1.4, fill: '#ffd34d' }); const b = (i * 0.4).toFixed(1) + 's'; anim(c, { attributeName: 'cy', values: `${top + 4};${deckY + 14}`, dur: '2s', begin: b }); anim(c, { attributeName: 'rx', values: '1.4;0.2;1.4', dur: '0.5s' }); anim(c, { attributeName: 'opacity', values: '0;1;1;0', dur: '2s', begin: b }); }
  } else if (sig === 'fleet') {
    for (const [sx, sy, sc] of [[14, 34, 0.5], [96, 30, 0.42]]) {
      const gs = behind(el('g', { transform: `translate(${sx} ${sy}) scale(${sc})`, opacity: 0.55 }));
      el('path', { d: 'M-22 8 L20 8 L26 0 L-24 2 Z', fill: '#2a8a74', stroke: LK_GREEN, 'stroke-width': 1 }, gs);
      for (const m of [-8, 8]) { el('line', { x1: m, y1: 2, x2: m, y2: -26, stroke: LK_GREEN, 'stroke-width': 1 }, gs); el('rect', { x: m - 7, y: -22, width: 14, height: 8, fill: LK_PALE, opacity: 0.4 }, gs); el('rect', { x: m - 8, y: -12, width: 16, height: 10, fill: LK_PALE, opacity: 0.4 }, gs); }
      anim(gs, { attributeName: 'opacity', values: '0.25;0.65;0.25', dur: '3.6s' });
    }
    for (let i = 0; i < 10; i++) { const x = sternX + 4 + i * (bowX - sternX - 8) / 9, d = el('circle', { cx: x, cy: deckY - 3, r: 1, fill: LK_GREEN, opacity: 0.4 }); anim(d, { attributeName: 'opacity', values: '0.25;1;0.25;0.25', keyTimes: '0;0.1;0.25;1', dur: '1.1s', begin: (i * 0.1).toFixed(2) + 's' }); }
  }
}
