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
  // flying: just behind and a little above the plane, wherever it is in the sky
  if (g && g.sky) return { x: sh.x - Math.sin(sh.h) * 26, y: sh.y - Math.cos(sh.h) * 26, z: (sh.z || 0) + 7 - (sh.pitch || 0) * 8, horizon: H * (W < 600 ? 0.42 : 0.4) + (sh.pitch || 0) * focal * 0.5 };
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
  if (g && g.sky) return drawPlane3D(o, skin, boat, vis, opts);
  if (boat.id === 'carrier') return drawCarrier3D(o, skin, boat, vis, opts);
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
  const fx = skinFx(skin);
  if (fx === 'ghost' && !reduceMotion) ctx.globalAlpha *= 0.62 + 0.25 * Math.sin(g.t * 1.7) + 0.08 * Math.sin(g.t * 7.3);
  const P = (u, w, z) => { const q = polyProj([W(u, w, z)]); return q.length ? q[0] : null; };
  // how much detail is worth drawing: pixels per metre at the ship
  const mid = P(0, 0, Zd), ppm = mid ? mid.s : 0, near = ppm > 2.2, close = ppm > 5;
  const seam = (a, b, col, w) => { const p = polyProj([a, b]); if (p.length === 2) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke(); } };

  // wake: two white lines off the bow and a smear astern, stronger with speed
  const sp = Math.min(1, (o.v || 0) / 14);
  if (sp > 0.05) {
    ctx.strokeStyle = `rgba(225,236,250,${0.12 + 0.2 * sp})`; ctx.lineWidth = 1;
    for (const s of [-1, 1]) {
      const p = polyProj([W(Lh * 0.95, 0, 0.05), W(-Lh * 0.1, s * B * (1.4 + sp * 0.6), 0.05), W(-Lh * 0.9, s * B * (2 + sp), 0.05)]);
      if (p.length === 3) { ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.quadraticCurveTo(p[1].x, p[1].y, p[2].x, p[2].y); ctx.stroke(); }
    }
  }

  shipFxBefore(skin, P, Lh, B, Zd, boat.id === 'cutter' ? boat.len * 1.15 : boat.len * 0.95);

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
  // a point on the face being drawn (s along it from aft, h up it from the waterline), for the Admiral looks
  let curF = null; const atF = (s, h) => lerp(lerp(curF.wlA, curF.wlB, s), lerp(curF.deckA, curF.deckB, s), h);
  const hullC = skin.hull, railC = tier >= 5 ? '#e8c050' : skin.rail, bottomC = tier >= 3 ? '#7a3a22' : mix(skin.hull, '#000000', 0.55);
  for (const f of faces) {
    const band = (t0, t1, col) => fillPoly([lerp(f.wlA, f.deckA, t0), lerp(f.wlB, f.deckB, t0), lerp(f.wlB, f.deckB, t1), lerp(f.wlA, f.deckA, t1)], col);
    const k = f.side === 0 ? 0.25 : 0.1 + 0.15 * Math.abs(Math.sin(f.i));
    band(0, 0.3, shade(bottomC, k));
    band(0.3, 0.84, shade(hullC, k));
    // a pale boot-top along the waterline, and a heavy wale below the rail
    band(0.27, 0.31, shade('#cfc7b0', k + 0.15));
    band(0.74, 0.79, shade(mix(String(hullC).length === 7 ? hullC : '#3a2a1e', '#000000', 0.45), k));
    // planking seams, closer together the nearer you are
    if (near) {
      const step = close ? 0.055 : 0.11;
      for (let t = 0.36; t < 0.74; t += step) seam(lerp(f.wlA, f.deckA, t), lerp(f.wlB, f.deckB, t), 'rgba(0,0,0,0.22)', 0.7);
      // butt joints, staggered plank ends
      if (close && f.side) for (let r = 0; r < 6; r++) {
        const t0 = 0.36 + r * 0.06, x = ((r * 0.37 + f.i * 0.21) % 1);
        seam(lerp(lerp(f.wlA, f.deckA, t0), lerp(f.wlB, f.deckB, t0), x), lerp(lerp(f.wlA, f.deckA, t0 + 0.055), lerp(f.wlB, f.deckB, t0 + 0.055), x), 'rgba(0,0,0,0.2)', 0.6);
      }
    } else if (f.d < 200) for (const t of [0.45, 0.6, 0.72]) seam(lerp(f.wlA, f.deckA, t), lerp(f.wlB, f.deckB, t), 'rgba(0,0,0,0.25)', 0.8);
    if (tier >= 2) band(0.62, 0.68, shade(skin.sail, k));   // a painted stripe along the topsides
    // the stern: a row of lit cabin windows, framed, and carved trim on the finer skins
    if (f.side === 0 && near) {
      for (let i = 0; i < 4; i++) {
        const t0 = 0.16 + i * 0.18, t1 = t0 + 0.12, lo = 0.6, hi = 0.76;
        const a = lerp(lerp(f.wlA, f.wlB, t0), lerp(f.deckA, f.deckB, t0), lo), b = lerp(lerp(f.wlA, f.wlB, t1), lerp(f.deckA, f.deckB, t1), lo);
        const c = lerp(lerp(f.wlA, f.wlB, t1), lerp(f.deckA, f.deckB, t1), hi), d = lerp(lerp(f.wlA, f.wlB, t0), lerp(f.deckA, f.deckB, t0), hi);
        fillPoly([a, b, c, d], shade(skin.rail, 0.5));
        fillPoly([lerp(a, c, 0.15), lerp(b, d, 0.15), lerp(c, a, 0.15), lerp(d, b, 0.15)], `rgba(255,${190 + 20 * Math.sin(g.t * 2 + i)},110,${0.55 + 0.3 * lit})`);
      }
      if (tier >= 3) band(0.82, 0.86, tier >= 5 ? '#e8c050' : shade(skin.rail, 0));
    }
    band(0.84, 1, shade(railC, k * 0.6));
    // flowing paint: a wave of the effect's colour travelling along the topsides
    const fa = f.side ? hullFlowAlpha(skin, f.i) : 0;
    if (fa > 0.02) { const ga = ctx.globalAlpha; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * fa; band(0.5, 0.84, fxColour(skin, fx, g.t + f.i * 0.4)); ctx.restore(); }
    // an Admiral's own look on the hull (src/admiralfx.js), on close ships only
    if (tier >= 5 && close) { curF = f; admiralHullFx(skin, f, atF, Lh); }
    // gunports on the brig and barque
    if (f.side && boat.id !== 'cutter' && f.i >= 1 && f.i <= 4 && f.d < 260) {
      for (const t of [0.3, 0.7]) {
        const c0 = lerp(lerp(f.wlA, f.deckA, 0.5), lerp(f.wlB, f.deckB, 0.5), t), c1 = lerp(lerp(f.wlA, f.deckA, 0.72), lerp(f.wlB, f.deckB, 0.72), t);
        const q0 = polyProj([c0]), q1 = polyProj([c1]);
        if (q0.length && q1.length) {
          const s = Math.max(1, Math.abs(q0[0].y - q1[0].y)), x = q0[0].x - s * 0.5, y = q1[0].y;
          if (s > 4) {
            // the open lid above, its red inside, and the gun's muzzle in the dark
            ctx.fillStyle = shade(railC, 0.3); ctx.fillRect(x - s * 0.08, y - s * 0.55, s * 1.16, s * 0.45);
            ctx.fillStyle = 'rgba(120,28,18,0.9)'; ctx.fillRect(x - s * 0.08, y - s * 0.08, s * 1.16, s * 1.16);
            ctx.fillStyle = 'rgba(10,8,6,0.92)'; ctx.fillRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88);
            ctx.fillStyle = '#16161a'; ctx.beginPath(); ctx.arc(x + s * 0.5, y + s * 0.52, s * 0.26, 0, 6.28); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.beginPath(); ctx.arc(x + s * 0.5, y + s * 0.52, s * 0.13, 0, 6.28); ctx.fill();
          } else { ctx.fillStyle = 'rgba(10,8,6,0.85)'; ctx.fillRect(x, y, s, s); }
        }
      }
    }
  }
  // the cutter has round brass-rimmed portholes instead of guns
  if (boat.id === 'cutter' && near) for (const f of faces) {
    if (!f.side || f.i < 1 || f.i > 4) continue;
    const c = polyProj([lerp(lerp(f.wlA, f.deckA, 0.6), lerp(f.wlB, f.deckB, 0.6), 0.5)]); if (!c.length) continue;
    const r = Math.max(1, c[0].s * 0.22);
    ctx.fillStyle = '#b08a3c'; ctx.beginPath(); ctx.arc(c[0].x, c[0].y, r, 0, 6.28); ctx.fill();
    ctx.fillStyle = `rgba(255,205,130,${0.5 + 0.3 * lit})`; ctx.beginPath(); ctx.arc(c[0].x, c[0].y, r * 0.65, 0, 6.28); ctx.fill();
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
    if (near) {
      // a skylight on the cabin roof and two lit windows in its front
      fillPoly([W(-Lh * 0.76, -B * 0.16, cz + 0.02), W(-Lh * 0.64, -B * 0.16, cz + 0.02), W(-Lh * 0.64, B * 0.16, cz + 0.02), W(-Lh * 0.76, B * 0.16, cz + 0.02)], `rgba(255,200,120,${0.35 + 0.25 * lit})`);
      for (const s of [-1, 1]) fillPoly([W(-Lh * 0.55 + 0.02, s * B * 0.12, Zd + 0.45), W(-Lh * 0.55 + 0.02, s * B * 0.28, Zd + 0.45), W(-Lh * 0.55 + 0.02, s * B * 0.28, Zd + 0.9), W(-Lh * 0.55 + 0.02, s * B * 0.12, Zd + 0.9)], `rgba(255,205,130,${0.5 + 0.3 * lit})`);
    }
  }
  if (near) {
    // deck planking running fore and aft
    for (let w = -0.6; w <= 0.61; w += close ? 0.15 : 0.3) seam(W(-Lh * 0.82, w * B, Zd + 0.01), W(Lh * 0.48, w * B, Zd + 0.01), 'rgba(0,0,0,0.2)', 0.6);
    // the hatch's grating
    for (let i = 1; i < 4; i++) {
      seam(W(Lh * (0.1 + 0.05 * i), -B * 0.25, Zd + 0.03), W(Lh * (0.1 + 0.05 * i), B * 0.25, Zd + 0.03), 'rgba(0,0,0,0.45)', 0.7);
      seam(W(Lh * 0.1, B * (-0.25 + 0.125 * i), Zd + 0.03), W(Lh * 0.3, B * (-0.25 + 0.125 * i), Zd + 0.03), 'rgba(0,0,0,0.45)', 0.7);
    }
    // the capstan: a drum with its bars
    const cu = boat.id === 'cutter' ? Lh * 0.45 : -Lh * 0.3, ring = (r, z) => { const out = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; out.push(W(cu + Math.cos(a) * r, Math.sin(a) * r, z)); } return out; };
    fillPoly(ring(0.55, Zd + 0.9), shade(skin.wood, 0.1));
    for (let i = 0; i < 4; i++) { const a = i / 4 * 3.1416 + 0.4; seam(W(cu - Math.cos(a) * 1.4, -Math.sin(a) * 1.4, Zd + 0.75), W(cu + Math.cos(a) * 1.4, Math.sin(a) * 1.4, Zd + 0.75), shade(skin.wood, 0.4), Math.max(0.6, ppm * 0.08)); }
    // barrels lashed by the foremast
    for (const [bu, bw] of [[0.42, 0.55], [0.38, -0.6], [0.47, -0.45]]) {
      if (boat.id === 'cutter') break;
      const top = []; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; top.push(W(Lh * bu + Math.cos(a) * 0.35, B * bw + Math.sin(a) * 0.35, Zd + 0.75)); }
      fillPoly(top, shade(skin.wood, 0.05));
    }
    // the barque carries her ship's boat upturned amidships
    if (boat.id === 'barque') {
      const bu = -Lh * 0.05, bl = Lh * 0.2, bb = B * 0.3, bz = Zd + 0.9;
      fillPoly([W(bu + bl, 0, bz), W(bu + bl * 0.4, bb, bz), W(bu - bl, bb * 0.8, bz), W(bu - bl, -bb * 0.8, bz), W(bu + bl * 0.4, -bb, bz)], shade(skin.hull, 0.15));
      seam(W(bu + bl, 0, bz + 0.01), W(bu - bl, 0, bz + 0.01), 'rgba(0,0,0,0.35)', 0.8);
    }
    // a figurehead under the bowsprit on the finer skins
    if (tier >= 3) { const fh = P(Lh * 1.02, 0, Zd * 0.75); if (fh) { ctx.fillStyle = tier >= 5 ? '#e8c050' : shade(skin.rail, 0); ctx.beginPath(); ctx.ellipse(fh.x, fh.y, Math.max(1, fh.s * 0.3), Math.max(1.5, fh.s * 0.6), 0, 0, 6.28); ctx.fill(); } }
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
    if (near && pts.length === 4) {
      // canvas: the lower half in the belly's shadow, panel seams down the cloth, a row of reef points
      const Lr = (t) => [lerp(pts[0], pts[3], t), lerp(pts[1], pts[2], t)];
      const [m0, m1] = Lr(0.5);
      fillPoly([pts[0], pts[1], m1, m0], 'rgba(0,0,0,0.12)');
      for (let i = 1; i < 6; i++) seam(lerp(pts[0], pts[1], i / 6), lerp(pts[3], pts[2], i / 6), 'rgba(0,0,0,0.13)', 0.6);
      if (close) { const [r0, r1] = Lr(0.82); for (let i = 1; i < 12; i++) { const c = polyProj([lerp(r0, r1, i / 12)]); if (c.length) { ctx.fillStyle = 'rgba(30,24,16,0.45)'; ctx.fillRect(c[0].x - 0.6, c[0].y - 0.6, 1.3, Math.max(1.3, c[0].s * 0.3)); } } }
    }
    if (stripes && tier >= 3) { // two coloured bands across the sail
      const L = (t) => [lerp(pts[0], pts[3], t), lerp(pts[1], pts[2], t)];
      const off = sailFlow(skin);
      for (const [t0, t1] of [[0.3, 0.4], [0.6, 0.7]]) {
        const s0 = (t0 + off) % 1, s1 = Math.min(1, s0 + (t1 - t0));
        const [a0, b0] = L(s0), [a1, b1] = L(s1);
        fillPoly([a0, b0, b1, a1], fx === 'aurora' ? fxColour(skin, fx, g.t + t0 * 4) : shade(skin.rail, 0.1));
      }
    }
    if (stripes && tier >= 4) { // an emblem in the middle of the sail
      const c = polyProj([lerp(lerp(pts[0], pts[1], 0.5), lerp(pts[3], pts[2], 0.5), 0.5)]);
      if (c.length) { ctx.fillStyle = tier >= 5 ? '#e8c050' : shade(skin.rail, 0); ctx.beginPath(); ctx.arc(c[0].x, c[0].y, Math.max(1, 0.9 * c[0].s), 0, 6.28); ctx.fill(); }
    }
    if (tier >= 5) { // gold trim round the edge
      const p = polyProj(pts); if (p.length > 2) { ctx.strokeStyle = 'rgba(232,192,80,0.9)'; ctx.lineWidth = Math.max(0.8, 0.12 * p[0].s); ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.stroke(); }
      if (close) admiralSailFx(skin, pts, stripes);   // and its own look in the cloth
    }
    ctx.globalAlpha = ga;
  } });
  const mastC = shade(skin.wood, 0.3), ropeC = 'rgba(20,16,12,0.7)';
  if (near) {
    // the rail round the deck on its stanchions
    for (const s of [-1, 1]) for (let i = 0; i < STATIONS.length - 1; i++) {
      const a = STATIONS[i], b = STATIONS[i + 1];
      const pa = W(a.u * Lh * 0.98, s * a.w * B * 0.97, Zd + a.sheer + 0.9), pb = W(b.u * Lh * 0.98, s * b.w * B * 0.97, Zd + b.sheer + 0.9);
      line(pa, pb, shade(railC, 0.15), 0.12);
      line(W(a.u * Lh * 0.98, s * a.w * B * 0.97, Zd + a.sheer), pa, shade(railC, 0.35), 0.08);
    }
    // the ship's wheel, just forward of the cabin (or right aft on the cutter)
    const wu = boat.id === 'cutter' ? -Lh * 0.72 : -Lh * 0.5, wz = Zd + 1.25, wr = 0.75, rim = [];
    const spin = (o.rudder || 0) * 2;
    for (let i = 0; i <= 16; i++) { const a = i / 16 * 6.283 + spin; rim.push(W(wu, Math.cos(a) * wr, wz + Math.sin(a) * wr)); }
    for (let i = 0; i < 16; i++) line(rim[i], rim[i + 1], shade(skin.wood, 0.1), 0.09);
    for (let i = 0; i < 4; i++) { const a = i / 4 * 3.1416 + spin; line(W(wu, -Math.cos(a) * wr * 1.25, wz - Math.sin(a) * wr * 1.25), W(wu, Math.cos(a) * wr * 1.25, wz + Math.sin(a) * wr * 1.25), shade(skin.wood, 0.25), 0.06); }
    line(W(wu, 0, Zd), W(wu, 0, wz), shade(skin.wood, 0.3), 0.15);
  }
  for (const mu of masts) {
    const base = W(mu, 0, Zd), top = W(mu, 0, Zd + mastH);
    // a stout lower mast, a slimmer topmast above the top
    line(base, W(mu, 0, Zd + mastH * 0.57), mastC, 0.42);
    line(W(mu, 0, Zd + mastH * 0.5), top, mastC, 0.26);
    if (near) {
      // the top (a platform where the mast steps up), and a crow's nest near the head
      for (const [zf, r] of [[0.56, 1.1], [0.86, 0.55]]) {
        const z = Zd + mastH * zf, pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; pts.push(W(mu + Math.cos(a) * r * 0.8, Math.sin(a) * r, z)); }
        parts.push({ d: dist3(base, top) - 0.3, draw: () => fillPoly(pts, shade(skin.wood, 0.35)) });
      }
    }
    if (boat.id === 'cutter') {
      // gaff mainsail, fore and aft, and a long boom
      // the boom swung out to one side by the brace, so the mainsail shows its face from astern
      const gb = opts.brace || 0, G = (u, z) => W(mu + (u - mu) * Math.cos(gb), (u - mu) * -Math.sin(gb) * -1, z);
      sail([G(mu - 0.3, Zd + 1.2), G(-Lh * 0.95, Zd + 1.4), G(-Lh * 0.7, Zd + mastH * 0.72), G(mu - 0.3, Zd + mastH * 0.9)], true);
      line(G(mu, Zd + 1.2), G(-Lh * 1.05, Zd + 1.4), mastC, 0.25);
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
        // footrope under the yard, and the yard's lifts up to the mast
        if (near) {
          line(Y(mu + 0.3, -sw * wk * 0.88, zb - 0.7), Y(mu + 0.3, sw * wk * 0.88, zb - 0.7), ropeC, 0.04);
          for (const s of [-1, 1]) line(Y(mu + 0.35, s * sw * wk * 0.88, zb), W(mu, 0, zb + mastH * 0.12), ropeC, 0.035);
        }
      }
    }
    // shrouds down to the rails
    for (const s of [-1, 1]) {
      const t0 = W(mu, 0, Zd + mastH * 0.56), a0 = W(mu - Lh * 0.05, s * B, Zd + 0.4), a1 = W(mu - Lh * 0.12, s * B, Zd + 0.4);
      line(W(mu, 0, Zd + mastH * 0.88), W(mu - Lh * 0.08, s * B, Zd + 0.3), ropeC, 0.06);
      if (near) {
        // the lower shrouds in pairs, with ratlines across them to climb by
        line(t0, a0, ropeC, 0.05); line(t0, a1, ropeC, 0.05);
        const n = close ? 12 : 6;
        for (let i = 1; i < n; i++) { const t = i / n; line(lerp(a0, t0, t), lerp(a1, t0, t), 'rgba(20,16,12,0.5)', 0.03); }
      }
    }
  }
  // brig and barque: a spanker, the fore-and-aft sail behind the mizzen, on its boom and gaff
  if (boat.id !== 'cutter') {
    const am = masts.reduce((a, b) => Math.min(a, b), 1e9), gb = (opts.brace || 0) * 0.6;
    const G = (u, z) => W(am + (u - am) * Math.cos(gb), (u - am) * Math.sin(gb), z);
    sail([G(am - 0.3, Zd + 2.2), G(-Lh * 0.95, Zd + 2.4), G(-Lh * 0.72, Zd + mastH * 0.5), G(am - 0.3, Zd + mastH * 0.56)], false);
    line(G(am, Zd + 2.2), G(-Lh * 1.05, Zd + 2.4), mastC, 0.16);
    line(G(am, Zd + mastH * 0.56), G(-Lh * 0.72, Zd + mastH * 0.5), mastC, 0.13);
    // the ensign flying from the gaff end
    const fe = G(-Lh * 0.72, Zd + mastH * 0.5), wv = Math.sin(g.t * 4 + (o.bob || 0)) * 0.4;
    parts.push({ d: dist3(fe, fe) - 0.2, draw: () => fillPoly([fe, [fe[0] - sh * 1.6, fe[1] - ch * 1.6, fe[2] + wv * 0.6], [fe[0] - sh * 1.5, fe[1] - ch * 1.5, fe[2] - 1 + wv * 0.6], [fe[0], fe[1], fe[2] - 1]], shade(skin.rail, 0)) });
  }
  // bowsprit, jib and stays
  const fore = masts.reduce((a, b) => Math.max(a, b), -1e9);
  line(W(Lh * 0.9, 0, Zd + 0.5), W(tipU, 0, tipZ), mastC, 0.25);
  sail([W(tipU * 0.97, 0, tipZ), W(fore + 1, 0, Zd + 1.4), W(fore + 0.5, 0, Zd + mastH * 0.82)], false);
  if (near) {
    // a jib boom run out past the bowsprit, with a flying jib, and the martingale stay beneath
    const jbU = tipU + Lh * 0.28, jbZ = tipZ + 0.5;
    line(W(tipU * 0.95, 0, tipZ), W(jbU, 0, jbZ), mastC, 0.15);
    sail([W(jbU * 0.98, 0, jbZ), W(tipU * 0.9, 0, tipZ + 1.2), W(fore + 0.7, 0, Zd + mastH * 0.95)], false);
    line(W(jbU, 0, jbZ), W(Lh * 1.05, 0, Zd * 0.4), ropeC, 0.04);
    line(W(jbU, 0, jbZ), W(fore, 0, Zd + mastH), ropeC, 0.04);
  }
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
  shipFxAfter(skin, P, Lh, B, Zd, mastH);
  ctx.restore();
  return head.length ? head[0] : null;
}
