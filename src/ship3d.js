// Ships as proper 3D models (drawn with the same perspective camera as the rest of the world), and
// the third-person chase camera. Used for your crewmates' ships, and for your own in third person.
//
// The hull is a set of stations from stern to bow, each with a half-width and a deck height; the
// sides are quads between the waterline and the deck edge, banded into bottom paint, topsides and a
// rail stripe. On top: the deck, a hatch and a cabin, masts with tiers of sails (or a gaff main on the
// cutter), a jib, the bowsprit, rigging, the pennant and a stern lantern. Rarer skins add more:
// a rail stripe (Bosun), striped sails (Mate), a sail emblem (Captain) and gold trim (Admiral).

const VIEW = { third: false };
try { VIEW.third = localStorage.getItem('skerry-view') === '3'; } catch (e) {}

function setThirdPerson(on) {
  VIEW.third = !!on;
  try { localStorage.setItem('skerry-view', VIEW.third ? '3' : '1'); } catch (e) {}
  const b = $('viewBtn'); if (b) { b.textContent = VIEW.third ? '1st person' : '3rd person'; b.setAttribute('aria-pressed', VIEW.third ? 'true' : 'false'); }
}
function toggleView() { setThirdPerson(!VIEW.third); }

// how a skin dresses up with its grade: 0 standard ... 5 admiral
function skinTier(skin) { const i = RARITIES.findIndex(r => r.id === skin.rarity); return i < 0 ? 0 : i + 1; }

// where the chase camera sits: behind and above, pulled in if a wall in the rooms is in the way
const CHASE = { back: 44, horizon: 0.16, bottom: 0.97, phoneHorizon: 0.3 };   // horizon and ship's waterline as fractions of the screen height   // horizon: where the skyline sits on screen (looking down a little)
function chaseCamera(sh) {
  // (in the rooms, walls between the camera and your ship are cut away rather than pulling the camera in)
  const boat = BOAT_BY_ID[sh.boat] || BOATS[0];
  const phone = W < 600;
  const back = CHASE.back * (boat.len / 20) ** 0.5 * (phone ? 0.8 : 1);
  CHASE.cut = back - boat.len * 0.6;
  // high enough that your ship sits near the bottom of the screen (CHASE.bottom), with plenty of sea ahead
  // (on a phone, keep the ship clear of the buttons along the bottom)
  const lb = $('logbox'), lbTop = lb && !lb.hidden ? lb.getBoundingClientRect().top - cv.getBoundingClientRect().top : H;
  const target = phone ? Math.min(H * 0.84, lbTop - H * 0.1) : H * CHASE.bottom;
  // aim with the stern (the nearest part of the ship), so the whole hull clears the target line
  const near = Math.max(4, back - boat.len * 0.5);
  let up = (target - hy) * near / focal, horizon = null;
  up = Math.max(8, Math.min(60, up));
  // under the Backrooms' low ceiling the camera can't go that high: raise the horizon instead,
  // so the ship still sits low on the screen
  if (g.backrooms && up > SK.BACKROOMS_CEIL - 2) { up = SK.BACKROOMS_CEIL - 2; horizon = target - up * focal / near; }
  return { x: sh.x - Math.sin(sh.h) * back, y: sh.y - Math.cos(sh.h) * back, z: up, horizon };
}

// stern (-1) to bow (+1): half-width of the deck, and how much the sheer rises
const STATIONS = [
  { u: -1, w: 0.62, sheer: 0.35 }, { u: -0.75, w: 0.9, sheer: 0.12 }, { u: -0.35, w: 1, sheer: 0 },
  { u: 0.1, w: 1, sheer: 0 }, { u: 0.5, w: 0.84, sheer: 0.08 }, { u: 0.8, w: 0.5, sheer: 0.25 }, { u: 1, w: 0, sheer: 0.5 },
];

function drawShip3D(o, skin, boat, vis, opts) {
  opts = opts || {};
  const tier = skinTier(skin);
  const Lh = boat.len / 2, B = boat.beam * 1.25, Zd = boat.id === 'cutter' ? 1.5 : boat.id === 'barque' ? 2.6 : 2;
  const bob = Math.sin((o.bob || 0) * 2.2) * 0.25, heel = (o.rudder || 0) * 0.12;
  const sh = Math.sin(o.h), ch = Math.cos(o.h);
  // local (u forward, w to starboard, z up) to a camera-space point
  const W = (u, w, z) => [o.x + sh * u + ch * w, o.y + ch * u - sh * w, z + bob + w * heel];
  const lit = Math.max(opts.minLit || 0.25, Math.min(1, vis));
  // lit by its own stern lantern: a touch of warmth over the skin's colours
  const shade = (c, k) => {
    // one step from the skin colour: night-dark, a touch of lantern warmth, then darkened by k
    const h = String(c).replace('#', ''), v = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) || 0);
    const night = [5, 7, 11], warm = [255, 207, 134];
    const out = v.map((x, i) => { let y = night[i] + (x - night[i]) * lit; y += (warm[i] - y) * 0.08 * lit; return Math.round(y * (1 - k)); });
    return 'rgb(' + out.join(',') + ')';
  };
  const camAt = [camX, camY];
  ctx.save();
  ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;

  // wake: two white lines off the bow and a smear astern, stronger with speed
  const sp = Math.min(1, (o.v || 0) / 14);
  if (sp > 0.05) {
    ctx.strokeStyle = `rgba(225,236,250,${0.12 + 0.2 * sp})`; ctx.lineWidth = 1;
    for (const s of [-1, 1]) {
      const p = polyProj([W(Lh * 0.95, 0, 0.05), W(-Lh * 0.1, s * B * (1.4 + sp * 0.6), 0.05), W(-Lh * 0.9, s * B * (2 + sp), 0.05)]);
      if (p.length === 3) { ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.quadraticCurveTo(p[1].x, p[1].y, p[2].x, p[2].y); ctx.stroke(); }
    }
  }

  // hull sides, banded, only the ones facing the camera, far ones first
  const faces = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < STATIONS.length - 1; i++) {
      const a = STATIONS[i], b = STATIONS[i + 1];
      const deckA = W(a.u * Lh, side * a.w * B, Zd + a.sheer), deckB = W(b.u * Lh, side * b.w * B, Zd + b.sheer);
      const wlA = W(a.u * Lh * 0.97, side * a.w * B * 0.82, 0), wlB = W(b.u * Lh * 0.97, side * b.w * B * 0.82, 0);
      // outward normal in the water plane, to cull the sides facing away
      const mx = (deckA[0] + deckB[0]) / 2, my = (deckA[1] + deckB[1]) / 2;
      const ex = deckB[0] - deckA[0], ey = deckB[1] - deckA[1];
      let nx = ey, ny = -ex; if (side < 0) { nx = -nx; ny = -ny; }
      if ((camAt[0] - mx) * nx + (camAt[1] - my) * ny < 0) continue;
      faces.push({ deckA, deckB, wlA, wlB, d: Math.hypot(camAt[0] - mx, camAt[1] - my), i, side });
    }
  }
  // the transom across the stern
  { const s0 = STATIONS[0];
    const tl = W(-Lh, -s0.w * B, Zd + s0.sheer), tr = W(-Lh, s0.w * B, Zd + s0.sheer), bl = W(-Lh * 0.97, -s0.w * B * 0.82, 0), br = W(-Lh * 0.97, s0.w * B * 0.82, 0);
    const tx = (tl[0] + tr[0]) / 2, ty = (tl[1] + tr[1]) / 2;
    if ((camAt[0] - tx) * -sh + (camAt[1] - ty) * -ch > 0) faces.push({ deckA: tl, deckB: tr, wlA: bl, wlB: br, d: Math.hypot(camAt[0] - tx, camAt[1] - ty), i: -1, side: 0 });
  }
  faces.sort((a, b) => b.d - a.d);
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  const hullC = skin.hull, railC = tier >= 5 ? '#e8c050' : skin.rail, bottomC = tier >= 3 ? '#7a3a22' : mix(skin.hull, '#000000', 0.55);
  for (const f of faces) {
    const band = (t0, t1, col) => fillPoly([lerp(f.wlA, f.deckA, t0), lerp(f.wlB, f.deckB, t0), lerp(f.wlB, f.deckB, t1), lerp(f.wlA, f.deckA, t1)], col);
    const k = f.side === 0 ? 0.25 : 0.1 + 0.15 * Math.abs(Math.sin(f.i));
    band(0, 0.3, shade(bottomC, k));
    band(0.3, 0.84, shade(hullC, k));
    // planking seams
    if (f.d < 200) for (const t of [0.45, 0.6, 0.72]) {
      const p = polyProj([lerp(f.wlA, f.deckA, t), lerp(f.wlB, f.deckB, t)]);
      if (p.length === 2) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke(); }
    }
    if (tier >= 2) band(0.62, 0.68, shade(skin.sail, k));   // a painted stripe along the topsides
    band(0.84, 1, shade(railC, k * 0.6));
    // gunports on the brig and barque
    if (f.side && boat.id !== 'cutter' && f.i >= 1 && f.i <= 4 && f.d < 260) {
      for (const t of [0.3, 0.7]) {
        const c0 = lerp(lerp(f.wlA, f.deckA, 0.5), lerp(f.wlB, f.deckB, 0.5), t), c1 = lerp(lerp(f.wlA, f.deckA, 0.72), lerp(f.wlB, f.deckB, 0.72), t);
        const q0 = polyProj([c0]), q1 = polyProj([c1]);
        if (q0.length && q1.length) { const s = Math.max(1, Math.abs(q0[0].y - q1[0].y)); ctx.fillStyle = 'rgba(10,8,6,0.85)'; ctx.fillRect(q0[0].x - s * 0.5, q1[0].y, s, s); }
      }
    }
  }
  // deck, with a hatch and (on the bigger boats) a cabin aft
  const deckPts = [];
  for (const s of STATIONS) deckPts.push(W(s.u * Lh, s.w * B, Zd + s.sheer));
  for (let i = STATIONS.length - 1; i >= 0; i--) { const s = STATIONS[i]; deckPts.push(W(s.u * Lh, -s.w * B, Zd + s.sheer)); }
  fillPoly(deckPts, shade(skin.deck[0], 0));
  fillPoly([W(Lh * 0.1, -B * 0.25, Zd + 0.02), W(Lh * 0.3, -B * 0.25, Zd + 0.02), W(Lh * 0.3, B * 0.25, Zd + 0.02), W(Lh * 0.1, B * 0.25, Zd + 0.02)], shade(skin.wood, 0.2));
  if (boat.id !== 'cutter') {
    const cz = Zd + 1.2;
    fillPoly([W(-Lh * 0.85, -B * 0.4, Zd), W(-Lh * 0.55, -B * 0.4, Zd), W(-Lh * 0.55, -B * 0.4, cz), W(-Lh * 0.85, -B * 0.4, cz)], shade(skin.wood, 0.35));
    fillPoly([W(-Lh * 0.85, B * 0.4, Zd), W(-Lh * 0.55, B * 0.4, Zd), W(-Lh * 0.55, B * 0.4, cz), W(-Lh * 0.85, B * 0.4, cz)], shade(skin.wood, 0.35));
    fillPoly([W(-Lh * 0.55, -B * 0.4, Zd), W(-Lh * 0.55, B * 0.4, Zd), W(-Lh * 0.55, B * 0.4, cz), W(-Lh * 0.55, -B * 0.4, cz)], shade(skin.wood, 0.2));
    fillPoly([W(-Lh * 0.85, -B * 0.42, cz), W(-Lh * 0.55, -B * 0.42, cz), W(-Lh * 0.55, B * 0.42, cz), W(-Lh * 0.85, B * 0.42, cz)], shade(skin.rail, 0.1));
  }

  // rig: masts, sails, jib, bowsprit and rigging, far parts first
  const mastH = boat.id === 'cutter' ? boat.len * 1.15 : boat.len * 0.95;
  const masts = boat.masts.map(m => Math.max(-0.7, Math.min(0.6, m * 1.6)) * Lh);
  const tipU = Lh * 1.45, tipZ = Zd + 1.4;
  const parts = [];
  const line = (a, b, col, w) => parts.push({ d: dist3(a, b), draw: () => { const p = polyProj([a, b]); if (p.length === 2) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.6, w * p[0].s); ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke(); } } });
  const dist3 = (a, b) => Math.hypot(camAt[0] - (a[0] + b[0]) / 2, camAt[1] - (a[1] + b[1]) / 2);
  const sailCol = shade(skin.sail, 0.05);
  const sail = (pts, stripes) => parts.push({ d: Math.hypot(camAt[0] - pts[0][0], camAt[1] - pts[0][1]) - 0.5, draw: () => {
    const ga = ctx.globalAlpha; if (opts.sailAlpha) ctx.globalAlpha = ga * opts.sailAlpha;
    fillPoly(pts, sailCol);
    if (stripes && tier >= 3) { // two coloured bands across the sail
      const L = (t) => [lerp(pts[0], pts[3], t), lerp(pts[1], pts[2], t)];
      for (const [t0, t1] of [[0.3, 0.4], [0.6, 0.7]]) { const [a0, b0] = L(t0), [a1, b1] = L(t1); fillPoly([a0, b0, b1, a1], shade(skin.rail, 0.1)); }
    }
    if (stripes && tier >= 4) { // an emblem in the middle of the sail
      const c = polyProj([lerp(lerp(pts[0], pts[1], 0.5), lerp(pts[3], pts[2], 0.5), 0.5)]);
      if (c.length) { ctx.fillStyle = tier >= 5 ? '#e8c050' : shade(skin.rail, 0); ctx.beginPath(); ctx.arc(c[0].x, c[0].y, Math.max(1, 0.9 * c[0].s), 0, 6.28); ctx.fill(); }
    }
    if (tier >= 5) { // gold trim round the edge
      const p = polyProj(pts); if (p.length > 2) { ctx.strokeStyle = 'rgba(232,192,80,0.9)'; ctx.lineWidth = Math.max(0.8, 0.12 * p[0].s); ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.stroke(); }
    }
    ctx.globalAlpha = ga;
  } });
  const mastC = shade(skin.wood, 0.3);
  for (const mu of masts) {
    const base = W(mu, 0, Zd), top = W(mu, 0, Zd + mastH);
    line(base, top, mastC, 0.35);
    if (boat.id === 'cutter') {
      // gaff mainsail, fore and aft, and a long boom
      sail([W(mu - 0.3, 0, Zd + 1.2), W(-Lh * 0.95, 0, Zd + 1.4), W(-Lh * 0.7, 0, Zd + mastH * 0.72), W(mu - 0.3, 0, Zd + mastH * 0.9)], true);
      line(W(mu, 0, Zd + 1.2), W(-Lh * 1.05, 0, Zd + 1.4), mastC, 0.25);
    } else {
      // square sails: a course and a topsail on each mast, bellied a little forward, and a yard on each
      // the yards are braced round (opts.brace radians, starboard yardarm swung aft), so the sails
      // are seen at an angle rather than square across the view
      const sw = B * 1.7, br = opts.brace || 0, bs = Math.sin(br), bc = Math.cos(br);
      const Y = (u, w, z) => W(u - w * bs, w * bc, z);
      const tiers = [[0.22, 0.55, 1], [0.58, 0.86, 0.8]];
      for (const [z0, z1, wk] of tiers) {
        const za = Zd + mastH * z0, zb = Zd + mastH * z1, bel = 0.9;
        sail([Y(mu + 0.4 + bel * 0.4, -sw * wk, za), Y(mu + 0.4 + bel * 0.4, sw * wk, za), Y(mu + 0.4, sw * wk * 0.86, zb), Y(mu + 0.4, -sw * wk * 0.86, zb)], true);
        line(Y(mu + 0.35, -sw * wk * 0.9, zb), Y(mu + 0.35, sw * wk * 0.9, zb), mastC, 0.18);
      }
    }
    // shrouds down to the rails
    for (const s of [-1, 1]) line(W(mu, 0, Zd + mastH * 0.88), W(mu - Lh * 0.08, s * B, Zd + 0.3), 'rgba(20,16,12,0.7)', 0.06);
  }
  // bowsprit, jib and stays
  const fore = masts.reduce((a, b) => Math.max(a, b), -1e9);
  line(W(Lh * 0.9, 0, Zd + 0.5), W(tipU, 0, tipZ), mastC, 0.25);
  sail([W(tipU * 0.97, 0, tipZ), W(fore + 1, 0, Zd + 1.4), W(fore + 0.5, 0, Zd + mastH * 0.82)], false);
  line(W(tipU, 0, tipZ), W(fore, 0, Zd + mastH), 'rgba(20,16,12,0.75)', 0.06);
  if (masts.length > 1) for (let i = 0; i < masts.length - 1; i++) line(W(masts[i], 0, Zd + mastH * 0.95), W(masts[i + 1], 0, Zd + mastH * 0.95), 'rgba(20,16,12,0.6)', 0.05);
  const aft = masts.reduce((a, b) => Math.min(a, b), 1e9);
  line(W(aft, 0, Zd + mastH), W(-Lh * 0.95, 0, Zd + 0.6), 'rgba(20,16,12,0.6)', 0.05);
  parts.sort((a, b) => b.d - a.d);
  for (const p of parts) p.draw();

  // pennant at the masthead, and the stern lantern
  const head = polyProj([W(fore, 0, Zd + mastH)]);
  if (opts.pennant && head.length) drawPennant(ctx, head[0].x, head[0].y, Math.min(46, Math.max(5, 1.5 * head[0].s)), opts.pennant, g.t + (o.bob || 0));
  const ln = polyProj([W(-Lh * 0.95, 0, Zd + 1.6)]);
  if (ln.length) { ctx.globalAlpha = 1; lamp(ln[0].x, ln[0].y, opts.lantern || skin.lantern, Math.max(1.8, 1.3 * Math.sqrt(ln[0].s))); }
  // a few sparkles on admiral skins
  if (tier >= 5 && !reduceMotion && head.length) {
    ctx.fillStyle = 'rgba(255,232,150,0.8)';
    for (let i = 0; i < 4; i++) { const a = g.t * 1.5 + i * 1.6, r = 1.5 * head[0].s; ctx.fillRect(head[0].x + Math.cos(a) * r, head[0].y + mastH * 0.4 * head[0].s * (0.3 + 0.2 * i) + Math.sin(a) * r * 0.4, 1.5, 1.5); }
  }
  ctx.restore();
  return head.length ? head[0] : null;
}
