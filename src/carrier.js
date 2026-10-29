// The Carrier: a modern supercarrier, after the newest class of nuclear carriers. Flat flight deck with an
// angled landing deck to port, the island aft on the starboard side, aircraft parked forward.
//   + six planks, floodlights (her lantern lights the water 1.6 times as far), a little faster flat out
//   + a scout jet (J, or B on a controller): it launches off the bow and flies a loop out ahead along your
//     course and back, its searchlight lighting the rocks under it. Reloads in JET_CD seconds.
//   - huge (40 m long, wide): more of her to hit rocks with; slow to get going and slow to turn

const JET = { CD: 25, OUT: 3.6, BACK: 3.6, TAKEOFF: 0.8, R: 55, ALT: 30, REACH: 330 };
const CARRIER_ZD = 6;   // flight deck height above the water

// ---------- the scout jet ----------
function launchJet() {
  if (state !== 'play' || ship.boat !== 'carrier' || !g || g.attract) return;
  if (g.backrooms) { addLog('No room to fly in here. The ceiling is too low.', 'w'); return; }
  if (g.sky) return;
  if (g.jet || (g.jetCd || 0) > 0) return;
  g.jet = { t: 0, x: ship.x, y: ship.y, z: CARRIER_ZD + 1, h: ship.h };
  g.jetCd = JET.CD;
  sfxJet();
  if (typeof padRumble === 'function') padRumble(0.5, 0.6, 500);
  addLog('Scout jet away. Its searchlight will sweep the water along your course.', 'p');
}
function updateJet(dt) {
  if (!g) return;
  if (g.jetCd > 0) g.jetCd -= dt;
  const j = g.jet; if (!j) return;
  j.t += dt;
  const fx = Math.sin(ship.h), fy = Math.cos(ship.h), rx = Math.cos(ship.h), ry = -Math.sin(ship.h);
  const boat = BOAT_BY_ID[ship.boat] || BOATS[0];
  let d, lat, z;
  if (j.t < JET.TAKEOFF) {
    // racing down the catapult to the bow
    const k = j.t / JET.TAKEOFF; d = -boat.len * 0.25 + (boat.bow + boat.len * 0.25) * k * k; lat = -1.5; z = CARRIER_ZD + 1 + k * k * 2;
  } else if (j.t < JET.TAKEOFF + JET.OUT) {
    const k = (j.t - JET.TAKEOFF) / JET.OUT; d = boat.bow + (JET.REACH - boat.bow) * (1 - (1 - k) * (1 - k)); lat = -1.5 + Math.sin(k * Math.PI) * 25; z = CARRIER_ZD + 3 + (JET.ALT - CARRIER_ZD - 3) * Math.min(1, k * 3);
  } else if (j.t < JET.TAKEOFF + JET.OUT + JET.BACK) {
    // round in a wide turn and back down the other side of your course
    const k = (j.t - JET.TAKEOFF - JET.OUT) / JET.BACK; d = JET.REACH * (1 - k) - 30 * k; lat = 25 + Math.sin(k * Math.PI) * 30 - 60 * k; z = JET.ALT + k * 10;
  } else { g.jet = null; return; }
  const px = j.x, py = j.y;
  j.x = ship.x + fx * d + rx * lat; j.y = ship.y + fy * d + ry * lat; j.z = z;
  if (Math.hypot(j.x - px, j.y - py) > 0.01) j.h = bearingOf(j.x - px, j.y - py);
}
// how much the jet's searchlight lights a point on the water
function jetAt(x, y) {
  const j = g && g.jet; if (!j || j.t < JET.TAKEOFF + 0.4) return 0;
  const d = Math.hypot(x - j.x, y - j.y);
  return d < JET.R ? Math.min(1, (1 - d / JET.R) * 1.8) : 0;
}
function jetItem(push) { if (g.jet && g.jet.t > JET.TAKEOFF * 0.6) push('jet', g.jet, g.jet.z); }
function drawJet(j) {
  const sh = Math.sin(j.h), ch = Math.cos(j.h);
  const Wp = (u, w, z) => [j.x + sh * u + ch * w, j.y + ch * u - sh * w, j.z + z];
  // the searchlight: a pale pool on the water and a faint cone up to the jet
  if (j.t > JET.TAKEOFF + 0.4) {
    const ring = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; ring.push([j.x + Math.cos(a) * JET.R * 0.8, j.y + Math.sin(a) * JET.R * 0.8, 0]); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    fillPoly(ring, 'rgba(255,248,225,0.07)');
    const top = polyProj([[j.x, j.y, j.z]]), l = polyProj([ring[4]]), r = polyProj([ring[12]]);
    if (top.length && l.length && r.length) { ctx.fillStyle = 'rgba(255,248,225,0.05)'; ctx.beginPath(); ctx.moveTo(top[0].x, top[0].y); ctx.lineTo(l[0].x, l[0].y); ctx.lineTo(r[0].x, r[0].y); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // the jet: a delta seen from wherever you are
  fillPoly([Wp(4, 0, 0), Wp(-1, -3.4, 0), Wp(-3.2, -1, 0), Wp(-3.2, 1, 0), Wp(-1, 3.4, 0)], '#6a7078');
  fillPoly([Wp(-1.5, 0, 0), Wp(-3.2, 0, 0), Wp(-3.4, 0, 1.6)], '#4a5058');
  const L = polyProj([Wp(-1, -3.4, 0)]), R = polyProj([Wp(-1, 3.4, 0)]), T = polyProj([Wp(-3.3, 0, 0)]);
  if (L.length) lamp(L[0].x, L[0].y, '#ff3a2a', 1.6);
  if (R.length) lamp(R[0].x, R[0].y, '#3aff7a', 1.6);
  if (T.length) { lamp(T[0].x, T[0].y, '#ff9a40', 2.4); if (Math.sin(g.t * 9) > 0.7) lamp(T[0].x, T[0].y - 2, '#ffffff', 2); }
}

// ---------- the ship, as your crew (and the chase camera) sees her ----------
function drawCarrier3D(o, skin, boat, vis, opts) {
  opts = opts || {};
  const tier = skinTier(skin);
  const Lh = boat.len / 2, Bh = boat.beam, Bd = boat.beam * 1.45, Zd = CARRIER_ZD;
  const bob = Math.sin((o.bob || 0) * 2.2) * 0.12, heel = (o.rudder || 0) * 0.05;
  const sh = Math.sin(o.h), ch = Math.cos(o.h);
  const W3 = (u, w, z) => [o.x + sh * u + ch * w, o.y + ch * u - sh * w, z + bob + w * heel];
  const lit = Math.max(opts.minLit || 0.25, Math.min(1, vis));
  const shade = (c, k) => {
    const h = String(c).replace('#', ''), v = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) || 0);
    const night = [5, 7, 11];
    return 'rgb(' + v.map((x, i) => Math.round((night[i] + (x - night[i]) * lit) * (1 - k))).join(',') + ')';
  };
  const P = (u, w, z) => { const q = polyProj([W3(u, w, z)]); return q.length ? q[0] : null; };
  const cam0 = [camX, camY];
  ctx.save();
  ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
  const fx = skinFx(skin);
  if (fx === 'ghost' && !reduceMotion) ctx.globalAlpha *= 0.62 + 0.25 * Math.sin(g.t * 1.7);

  // wake
  const sp = Math.min(1, (o.v || 0) / 14);
  if (sp > 0.05) {
    ctx.strokeStyle = `rgba(225,236,250,${0.12 + 0.2 * sp})`; ctx.lineWidth = 1.2;
    for (const s of [-1, 1]) { const p = polyProj([W3(Lh, 0, 0.05), W3(-Lh * 0.1, s * Bh * 1.6, 0.05), W3(-Lh * 1.3, s * Bh * 2.6, 0.05)]); if (p.length === 3) { ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.quadraticCurveTo(p[1].x, p[1].y, p[2].x, p[2].y); ctx.stroke(); } }
  }
  shipFxBefore(skin, P, Lh, Bd, Zd, Zd + 12);

  // the hull: sides up to the hangar deck, blunt stern, a long raked bow
  const ST = [{ u: -1, w: 0.9 }, { u: -0.6, w: 1 }, { u: 0.35, w: 1 }, { u: 0.75, w: 0.7 }, { u: 1, w: 0.12 }];
  const faces = [];
  for (const side of [-1, 1]) for (let i = 0; i < ST.length - 1; i++) {
    const a = ST[i], b = ST[i + 1];
    const tA = W3(a.u * Lh, side * a.w * Bh * 1.08, Zd - 0.8), tB = W3(b.u * Lh, side * b.w * Bh * 1.08, Zd - 0.8);
    const wA = W3(a.u * Lh * 0.97, side * a.w * Bh * 0.86, 0), wB = W3(b.u * Lh * 0.97, side * b.w * Bh * 0.86, 0);
    const mx = (tA[0] + tB[0]) / 2, my = (tA[1] + tB[1]) / 2, ex = tB[0] - tA[0], ey = tB[1] - tA[1];
    let nx = ey, ny = -ex; if (side < 0) { nx = -nx; ny = -ny; }
    if ((cam0[0] - mx) * nx + (cam0[1] - my) * ny < 0) continue;
    faces.push({ tA, tB, wA, wB, d: Math.hypot(cam0[0] - mx, cam0[1] - my), i, side });
  }
  { const tl = W3(-Lh, -Bh * 0.97, Zd - 0.8), tr = W3(-Lh, Bh * 0.97, Zd - 0.8), bl = W3(-Lh * 0.97, -Bh * 0.77, 0), br = W3(-Lh * 0.97, Bh * 0.77, 0);
    if ((cam0[0] - (tl[0] + tr[0]) / 2) * -sh + (cam0[1] - (tl[1] + tr[1]) / 2) * -ch > 0) faces.push({ tA: tl, tB: tr, wA: bl, wB: br, d: 1e9, i: -1, side: 0 }); }
  faces.sort((a, b) => b.d - a.d);
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  for (const f of faces) {
    const band = (t0, t1, col) => fillPoly([lerp(f.wA, f.tA, t0), lerp(f.wB, f.tB, t0), lerp(f.wB, f.tB, t1), lerp(f.wA, f.tA, t1)], col);
    const k = f.side === 0 ? 0.25 : 0.08 + 0.12 * Math.abs(Math.sin(f.i + 1));
    band(0, 0.12, shade(tier >= 3 ? '#6a2a1e' : '#3a2a26', k));     // boot-top, just showing
    band(0.12, 1, shade(skin.hull, k));
    if (tier >= 2) band(0.55, 0.6, shade(skin.sail, k));
    // a row of lit openings along the hangar deck
    if (f.side && f.d < 400 && f.i >= 1 && f.i <= 2) for (let t = 0.1; t < 0.95; t += 0.16) {
      const q = polyProj([lerp(lerp(f.wA, f.tA, 0.82), lerp(f.wB, f.tB, 0.82), t)]);
      if (q.length) { ctx.fillStyle = skin.lantern; ctx.globalAlpha *= 0.7; const s = Math.max(1, 0.35 * q[0].s); ctx.fillRect(q[0].x - s / 2, q[0].y - s / 2, s, s * 0.7); ctx.globalAlpha /= 0.7; }
    }
  }

  // the flight deck: a slab overhanging the hull, with the angled deck sticking out to port
  const deck = [[Lh * 1.02, -Bd * 0.42], [Lh * 1.02, Bd * 0.45], [Lh * 0.55, Bd], [-Lh * 0.95, Bd], [-Lh * 1.05, Bd * 0.7], [-Lh * 1.05, -Bd * 0.85], [-Lh * 0.35, -Bd * 1.3], [Lh * 0.3, -Bd * 1.35], [Lh * 0.62, -Bd * 0.75]];
  const D = (p, z) => W3(p[0], p[1], z);
  // its edge, where it faces the camera
  for (let i = 0; i < deck.length; i++) {
    const a = deck[i], b = deck[(i + 1) % deck.length];
    const A = D(a, Zd), Bv = D(b, Zd), mx = (A[0] + Bv[0]) / 2, my = (A[1] + Bv[1]) / 2;
    // the outward normal (the deck is listed clockwise seen from above)
    const ex = Bv[0] - A[0], ey = Bv[1] - A[1], nx = -ey, ny = ex;
    if ((cam0[0] - mx) * nx + (cam0[1] - my) * ny > 0) fillPoly([D(a, Zd - 0.9), D(b, Zd - 0.9), D(b, Zd), D(a, Zd)], shade(skin.hull, 0.35));
  }
  if (camH > Zd + bob - 0.2) {
    fillPoly(deck.map(p => D(p, Zd)), shade(skin.deck[0], 0));
    // markings: the centreline down the landing area, its edge lines, the bow catapult tracks
    const line = (a, b, col, wdt) => { const p = polyProj([D(a, Zd + 0.02), D(b, Zd + 0.02)]); if (p.length === 2) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.6, wdt * p[0].s); ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke(); } };
    const mark = shade(skin.rail, 0), acc = shade(skin.sail, 0);
    line([-Lh * 1.0, -Bd * 0.05], [Lh * 0.35, -Bd * 1.05], mark, 0.18);
    line([-Lh * 0.95, Bd * 0.3], [Lh * 0.45, -Bd * 0.7], acc, 0.15);
    line([-Lh * 0.95, -Bd * 0.45], [Lh * 0.25, -Bd * 1.28], acc, 0.15);
    for (const w of [-0.15, 0.25]) line([Lh * 0.15, Bd * w], [Lh * 1.0, Bd * w], 'rgba(10,10,12,0.6)', 0.12);
    // parked aircraft along the starboard bow
    for (let i = 0; i < 4; i++) {
      const u = Lh * (0.75 - i * 0.16), w = Bd * 0.7, s = 1.2;
      fillPoly([D([u + 2 * s, w], Zd + 0.3), D([u - 1 * s, w - 2.2 * s], Zd + 0.3), D([u - 1.6 * s, w], Zd + 0.3), D([u - 1 * s, w + 2.2 * s], Zd + 0.3)], shade('#5a6068', 0.1));
    }
    // edge lights
    for (let i = 0; i < deck.length; i++) {
      const a = deck[i], b = deck[(i + 1) % deck.length];
      for (let t = 0; t < 1; t += 0.34) { const q = polyProj([D([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], Zd + 0.1)]); if (q.length) { ctx.fillStyle = tier >= 5 ? '#ffd34d' : skin.lantern; ctx.fillRect(q[0].x - 0.8, q[0].y - 0.8, 1.6, 1.6); } }
    }
  }

  // the island: a tall block aft on the starboard side, with a mast and radar faces
  const iu0 = -Lh * 0.5, iu1 = -Lh * 0.28, iw0 = Bd * 0.62, iw1 = Bd * 0.92, iz = Zd + 7;
  const box = [[iu0, iw0], [iu1, iw0], [iu1, iw1], [iu0, iw1]];
  const isl = shade(skin.wood, 0.05), islD = shade(skin.wood, 0.3);
  for (let i = 0; i < 4; i++) {
    const a = box[i], b = box[(i + 1) % 4], A = D(a, Zd), Bv = D(b, Zd);
    const mx = (A[0] + Bv[0]) / 2, my = (A[1] + Bv[1]) / 2, ex = Bv[0] - A[0], ey = Bv[1] - A[1], nx = -ey, ny = ex;
    if ((cam0[0] - mx) * nx + (cam0[1] - my) * ny > 0) {
      fillPoly([D(a, Zd), D(b, Zd), D(b, iz), D(a, iz)], i % 2 ? islD : isl);
      // bridge windows near the top
      const p = polyProj([D(a, iz - 1.2), D(b, iz - 1.2)]);
      if (p.length === 2) { ctx.strokeStyle = skin.lantern; ctx.globalAlpha *= 0.85; ctx.lineWidth = Math.max(1, 0.5 * p[0].s); ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke(); ctx.globalAlpha /= 0.85; }
    }
  }
  if (camH > iz) fillPoly(box.map(p => D(p, iz)), isl);
  const mu = (iu0 + iu1) / 2, mw = (iw0 + iw1) / 2;
  const mb = P(mu, mw, iz), mt = P(mu, mw, iz + 5);
  if (mb && mt) {
    ctx.strokeStyle = islD; ctx.lineWidth = Math.max(1, 0.4 * mb.s); ctx.beginPath(); ctx.moveTo(mb.x, mb.y); ctx.lineTo(mt.x, mt.y); ctx.stroke();
    const yard = [P(mu, mw - 2, iz + 3.6), P(mu, mw + 2, iz + 3.6)];
    if (yard[0] && yard[1]) { ctx.lineWidth = Math.max(0.8, 0.2 * mb.s); ctx.beginPath(); ctx.moveTo(yard[0].x, yard[0].y); ctx.lineTo(yard[1].x, yard[1].y); ctx.stroke(); }
    // a radar face turning on the yard
    const rot = g.t * 1.4, rc = P(mu, mw, iz + 2.4);
    if (rc) { ctx.fillStyle = islD; const rw = 1.6 * rc.s * Math.abs(Math.cos(rot)) + 0.6; ctx.fillRect(rc.x - rw, rc.y - 0.6 * rc.s, rw * 2, 1.2 * rc.s); }
    lamp(mt.x, mt.y, tier >= 5 ? '#ffd34d' : '#ff5a4a', Math.max(1.5, 0.6 * Math.sqrt(mt.s) * 2) * (0.7 + 0.3 * Math.sin(g.t * 3)));
  }
  if (opts.pennant && mt) drawPennant(ctx, mt.x, mt.y, Math.min(46, Math.max(5, 1.5 * mt.s)), opts.pennant, g.t + (o.bob || 0));
  const ln = P(-Lh * 0.98, 0, Zd + 0.5);
  if (ln) { ctx.globalAlpha = 1; lamp(ln.x, ln.y, opts.lantern || skin.lantern, Math.max(2, 1.6 * Math.sqrt(ln.s))); }
  if (tier >= 5 && !reduceMotion && mt) { ctx.fillStyle = 'rgba(255,232,150,0.8)'; for (let i = 0; i < 5; i++) { const a = g.t * 1.5 + i * 1.3, r = 3 * mt.s; ctx.fillRect(mt.x + Math.cos(a) * r, mt.y + 6 * mt.s * (0.3 + 0.2 * i) + Math.sin(a) * r * 0.3, 1.5, 1.5); } }
  shipFxAfter(skin, P, Lh, Bd, Zd, 12);
  ctx.restore();
  return mt || P(0, 0, Zd + 10);
}

// ---------- the view from the flight deck ----------
function buildCarrierDeck(boat, skin) {
  const key = W + 'x' + H + '@' + dpr + boat.id + skin.id;
  if (GFX.deckKey === key && GFX.deck) return GFX.deck;
  GFX.deckKey = key;
  const tipY = H * boat.tipY;
  const c = offscreen(W * dpr, H * dpr), d = c.getContext('2d');
  d.scale(dpr, dpr);
  const tier = typeof skinTier === 'function' ? skinTier(skin) : 0;
  // the deck runs out to a broad, flat bow; the angled deck juts off to port
  const portC = [cx - W * 0.34, tipY + (H - tipY) * 0.16], bowL = [cx - W * 0.13, tipY], bowR = [cx + W * 0.13, tipY];
  const deckPath = () => { d.beginPath(); d.moveTo(-W * 0.1, H + 2); d.lineTo(portC[0], portC[1]); d.lineTo(bowL[0], bowL[1]); d.lineTo(bowR[0], bowR[1]); d.lineTo(W * 1.1, H + 2); d.closePath(); };
  const base = d.createLinearGradient(0, tipY, 0, H);
  base.addColorStop(0, skin.deck[0]); base.addColorStop(1, skin.deck[1]);
  d.fillStyle = base; deckPath(); d.fill();
  d.save(); deckPath(); d.clip();
  // non-skid: fine speckle, and the darker smears of tyre rubber down the landing area
  for (let i = 0; i < 2500; i++) { const y = tipY + (H - tipY) * Math.pow(Math.random(), 0.7), x = Math.random() * W; d.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.08)'; d.fillRect(x, y, 1.2, 1.2); }
  d.fillStyle = 'rgba(0,0,0,0.12)';
  d.beginPath(); d.moveTo(cx - W * 0.02, H); d.lineTo(cx - W * 0.25, tipY + (H - tipY) * 0.2); d.lineTo(cx - W * 0.2, tipY + (H - tipY) * 0.2); d.lineTo(cx + W * 0.22, H); d.closePath(); d.fill();
  // the markings: centreline of the landing area (dashed), its edges, the foul line, the catapult tracks
  const L = (x0, y0, x1, y1, col, w, dash) => { d.strokeStyle = col; d.lineWidth = w; d.setLineDash(dash || []); d.beginPath(); d.moveTo(x0, y0); d.lineTo(x1, y1); d.stroke(); d.setLineDash([]); };
  const yA = tipY + (H - tipY) * 0.18;
  L(cx + W * 0.1, H, cx - W * 0.235, yA, skin.rail, 4, [26, 18]);
  L(cx - W * 0.3, H, cx - W * 0.33, yA + 6, skin.rail, 2.5);
  L(cx + W * 0.42, H, cx - W * 0.12, yA - 4, tier >= 2 ? skin.sail : '#d8c040', 2.5);
  for (const x0 of [-0.04, 0.07]) { L(cx + W * x0 * 2.2, H, cx + W * x0, tipY + 2, 'rgba(0,0,0,0.55)', 2); L(cx + W * x0 * 2.2 + 3, H, cx + W * x0 + 1, tipY + 2, 'rgba(255,255,255,0.08)', 1); }
  // a jet blast deflector across the catapult, folded flat
  d.fillStyle = 'rgba(0,0,0,0.25)'; d.fillRect(cx - W * 0.06, tipY + (H - tipY) * 0.42, W * 0.18, 5);
  d.restore();
  // the deck edge: a catwalk and safety netting, with edge lights
  for (const [a, b] of [[[-W * 0.1, H + 2], portC], [portC, bowL], [bowL, bowR], [bowR, [W * 1.1, H + 2]]]) {
    d.strokeStyle = mix(skin.hull, '#000000', 0.3); d.lineWidth = boat.rail + 2; d.beginPath(); d.moveTo(a[0], a[1]); d.lineTo(b[0], b[1]); d.stroke();
    d.strokeStyle = 'rgba(200,200,200,0.15)'; d.lineWidth = 1;
    for (let t = 0; t < 1; t += 0.03) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; d.beginPath(); d.moveTo(x, y); d.lineTo(x + 3, y + 5); d.stroke(); }
    d.fillStyle = tier >= 5 ? '#ffd34d' : skin.lantern;
    for (let t = 0.05; t < 1; t += 0.12) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; d.fillRect(x - 1.5, y - 1.5, 3, 3); }
  }
  GFX.deck = c;
  return c;
}

function drawCarrierDeck(boat, skin) {
  const tipY = H * boat.tipY, lit = g.glare;
  ctx.drawImage(buildCarrierDeck(boat, skin), 0, 0, W, H);
  if (lit > 0.02) {
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(150,140,120,${lit * 0.4})`;
    ctx.beginPath(); ctx.moveTo(-W * 0.1, H + 2); ctx.lineTo(cx - W * 0.34, tipY + (H - tipY) * 0.16); ctx.lineTo(cx - W * 0.13, tipY); ctx.lineTo(cx + W * 0.13, tipY); ctx.lineTo(W * 1.1, H + 2); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  drawDeckFx(skin, tipY, W * 0.6, boat.rail);
  // floodlights washing the deck
  const pool = ctx.createRadialGradient(cx, H * 0.95, 10, cx, H * 0.95, Math.max(W, H) * 0.55);
  pool.addColorStop(0, 'rgba(255,232,190,0.12)'); pool.addColorStop(1, 'rgba(255,232,190,0)');
  ctx.fillStyle = pool; ctx.fillRect(0, tipY, W, H - tipY);
  // the scout jet: waiting on the catapult, then hurled off the bow
  const j = g.jet, jx0 = cx + W * 0.07 * 1.6, jy0 = tipY + (H - tipY) * 0.62;
  if (!j && !(g.jetCd > 0)) drawDeckJet(jx0, jy0, Math.min(W, H) * 0.12, 1);
  else if (j && j.t < JET.TAKEOFF) { const k = j.t / JET.TAKEOFF, kk = k * k; drawDeckJet(jx0 + (cx + W * 0.07 - jx0) * kk, jy0 + (tipY - jy0) * kk, Math.min(W, H) * 0.12 * (1 - kk * 0.8), 1 - kk * 0.3); }
  // a jackstaff on the bow with your pennant
  const pen = 'pennant' in ship ? ship.pennant : myPennant();
  if (pen) {
    const px = cx, py = tipY + 1, staff = Math.max(14, H * 0.03);
    ctx.strokeStyle = mix(skin.hull, '#ffffff', 0.2); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - staff); ctx.stroke();
    ctx.globalAlpha = Math.max(0.55, Math.min(1, 0.55 + g.glare)); drawPennant(ctx, px + 1, py - staff + 2, Math.min(56, W * 0.06), pen, g.t); ctx.globalAlpha = 1;
  }
  updateSpray(tipY);
  const lx = cx + Math.min(W * 0.28, 220), ly = H * 0.8;
  const lf = lanternFlick();
  drawLantern(lx, ly - 8, skin.lantern, lf.flick, lf.lean);
}
// a little grey jet seen from behind, on the deck
function drawDeckJet(x, y, s, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  ctx.fillStyle = '#4a5058';
  ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(s * 0.55, s * 0.12); ctx.lineTo(s * 0.12, s * 0.1); ctx.lineTo(s * 0.1, s * 0.25); ctx.lineTo(-s * 0.1, s * 0.25); ctx.lineTo(-s * 0.12, s * 0.1); ctx.lineTo(-s * 0.55, s * 0.12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5a6068'; ctx.fillRect(-s * 0.03, -s * 0.15, s * 0.06, s * 0.32);
  for (const sd of [-1, 1]) { ctx.fillStyle = '#3a3e44'; ctx.beginPath(); ctx.moveTo(sd * s * 0.07, s * 0.05); ctx.lineTo(sd * s * 0.2, -s * 0.12); ctx.lineTo(sd * s * 0.11, s * 0.18); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#ff9a40'; ctx.globalAlpha = a * (0.5 + 0.3 * Math.sin(g.t * 20)); ctx.beginPath(); ctx.arc(0, s * 0.27, s * 0.05, 0, 6.28); ctx.fill();
  ctx.restore();
}

// ---------- the little picture in the crates and boat picker ----------
function carrierPreview(skin, size) {
  const tier = typeof skinTier === 'function' ? skinTier(skin) : 0;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 80'); svg.setAttribute('width', size); svg.setAttribute('height', size * 2 / 3);
  svg.setAttribute('aria-hidden', 'true');
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
  const gold = '#e8c050', sternX = 6, bowX = 114, deckY = 46;
  el('path', { d: `M${sternX - 2} 64 Q60 69 ${bowX + 4} 61`, stroke: 'rgba(220,232,245,0.35)', 'stroke-width': 1.5, fill: 'none' });
  // hull: a long low hull with a raked bow
  el('path', { d: `M${sternX + 2} ${deckY + 2} L${bowX} ${deckY + 1} L${bowX - 12} ${deckY + 16} L${sternX + 6} ${deckY + 16} Z`, fill: skin.hull });
  el('path', { d: `M${sternX + 5} ${deckY + 13} L${bowX - 10} ${deckY + 13} L${bowX - 12} ${deckY + 16} L${sternX + 6} ${deckY + 16} Z`, fill: tier >= 3 ? '#7a3a22' : 'rgba(0,0,0,0.35)' });
  if (tier >= 2) el('line', { x1: sternX + 4, y1: deckY + 8, x2: bowX - 6, y2: deckY + 7, stroke: skin.sail, 'stroke-width': 1.3 });
  for (let i = 0; i < 9; i++) el('rect', { x: sternX + 12 + i * 10, y: deckY + 5, width: 2.4, height: 1.4, fill: skin.lantern, opacity: 0.8 });
  // the flight deck slab, overhanging
  el('rect', { x: sternX, y: deckY - 2, width: bowX - sternX + 2, height: 4, fill: skin.deck[0] });
  el('line', { x1: sternX, y1: deckY - 2, x2: bowX + 2, y2: deckY - 2, stroke: tier >= 5 ? gold : skin.rail, 'stroke-width': 1 });
  // parked aircraft on the bow
  for (let i = 0; i < 4; i++) el('path', { d: `M${78 + i * 8} ${deckY - 2} l3 -3 l3 3 Z`, fill: '#7a8088' });
  // the island, aft of amidships, with a mast and radar
  el('rect', { x: 34, y: deckY - 18, width: 16, height: 16, fill: skin.wood });
  el('rect', { x: 34, y: deckY - 15, width: 16, height: 2, fill: skin.lantern, opacity: 0.85 });
  el('line', { x1: 42, y1: deckY - 18, x2: 42, y2: deckY - 30, stroke: skin.wood, 'stroke-width': 1.6 });
  el('line', { x1: 37, y1: deckY - 26, x2: 47, y2: deckY - 26, stroke: skin.wood, 'stroke-width': 1 });
  el('rect', { x: 38.5, y: deckY - 23, width: 7, height: 3, fill: skin.wood });
  el('circle', { cx: 42, cy: deckY - 31, r: 1.6, fill: tier >= 5 ? gold : '#ff5a4a' });
  el('circle', { cx: sternX + 3, cy: deckY - 4, r: 4, fill: skin.lantern, opacity: 0.3 });
  if (tier >= 5) for (const [sx, sy] of [[30, deckY - 26], [58, deckY - 12], [100, deckY - 8]]) el('circle', { cx: sx, cy: sy, r: 0.9, fill: '#fff2c0' });
  if (typeof previewFx === 'function') previewFx(svg, skin, null, { sternX, bowX, deckY });
  return svg;
}
