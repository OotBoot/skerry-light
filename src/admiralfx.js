// The Admiral boat skins' signature looks. Every Admiral skin shares a strong base (a brighter breathing
// glow, a sheen sweeping along the hull, sparkles round the rig, from src/skinfx.js), and each of the eleven
// adds one look of its own, in its own colours, drawn on its 3D ship (third person and crewmates), on your
// deck in first person, and animated in its crate preview and on its crate card:
//
//   plimsoll    Plimsoll Blue          an electric-blue waterline of light, rippling along the hull
//   skerrygold  Skerry Gold            a lighthouse beam turning from the masthead
//   abyss       Abyssal Black          a black-hole aura with a cyan ring, sparks spiralling into it
//   gannet      The Gannet, Restored   white feathers drifting down, the sails glowing white
//   lavaforged  Lava-Forged            molten cracks pulsing along the hull, fire dripping into the sea
//   c_gull      Silver Gull            moonlit silver shimmer over the sails, gulls wheeling the masthead
//   c_sleeper   The Sleeper's Eye      a glowing eye on the mainsail that opens and blinks, lilac dream-motes
//   b_royal     Royal Barque           purple and gold banners of light streaming off the mastheads, a crown
//   b_fleece    Golden Fleece          warm gold wool glowing on the sails, gold dust rising
//   k_admiral   Admiral of the Fleet   gold braid lights chasing round the deck edge, a turning starburst
//   k_aurora    Aurora Flagship        aurora curtains rippling in the sky above her
//
// Cost: only near ships (a few pixels per metre or more) get the full detail; far ones get the shared base
// and a cheap hint. Particles are capped, soft lights come from render.js's cached lamp sprites, and with
// reduced motion everything holds still.

const ADMIRAL_SIG = {
  plimsoll:   { sig: 'waterline', glow: '#5fd3ff', hi: '#e8faff', sheen: '#bff0ff' },
  skerrygold: { sig: 'beam',      glow: '#ffd34d', hi: '#fff3c4', sheen: '#fff2c0' },
  abyss:      { sig: 'blackhole', glow: '#00e5ff', hi: '#c8fdff', sheen: '#7ff4ff' },
  gannet:     { sig: 'feathers',  glow: '#fff6dc', hi: '#ffffff', sheen: '#fff8e8' },
  lavaforged: { sig: 'molten',    glow: '#ff7a1e', hi: '#ffd070', sheen: '#ffb030' },
  c_gull:     { sig: 'gulls',     glow: '#cfe4ff', hi: '#ffffff', sheen: '#e8eef4' },
  c_sleeper:  { sig: 'eye',       glow: '#c8a8ff', hi: '#f6f0ff', sheen: '#e6d8ff' },
  b_royal:    { sig: 'royal',     glow: '#a050ff', hi: '#ffd34d', sheen: '#fff0c0' },
  b_fleece:   { sig: 'fleece',    glow: '#ffd34d', hi: '#fff4c8', sheen: '#ffe07a' },
  k_admiral:  { sig: 'braid',     glow: '#ffd34d', hi: '#fff0c0', sheen: '#fff2c0' },
  k_aurora:   { sig: 'aurora',    glow: '#7affd8', hi: '#e0fff6', sheen: '#b8a0ff' },
};
function admiralSig(skin) { return skin && skin.rarity === 'admiral' ? ADMIRAL_SIG[skin.id] || null : null; }
// the aurora's colour, drifting green to teal to violet and back
const AURORA_COLS = ['#7affd8', '#5cffa0', '#7ad8ff', '#b8a0ff', '#e07aff'];
function auroraCol(x) { const n = AURORA_COLS.length, i = ((Math.floor(x) % n) + n) % n; return AURORA_COLS[i]; }
// time for the effects: frozen with reduced motion
function admT() { return reduceMotion ? 1.7 : g.t; }
// a soft additive light from a cached sprite (colour must be #rrggbb); the caller sets 'lighter'
function admGlow(x, y, col, r, a) { if (!(r > 0.3) || a <= 0.01) return; if (r > 320) r = 320;   // (a cap: a glow filling the screen costs a lot to fill and adds little)
  ctx.globalAlpha = Math.min(1, a); ctx.drawImage(lampSprite(col), x - r, y - r, r * 2, r * 2); }
// half-width of a sailing hull (fraction of its beam) at k, -1 stern to +1 bow, from ship3d's STATIONS
function admHullW(k) {
  for (let i = 0; i < STATIONS.length - 1; i++) { const a = STATIONS[i], b = STATIONS[i + 1]; if (k <= b.u) { const f = (k - a.u) / (b.u - a.u); return a.w + (b.w - a.w) * Math.max(0, f); } }
  return 0;
}
function admMasts(skin, Lh) { const b = BOAT_BY_ID[skin.boat] || BOATS[0]; return b.masts.length ? b.masts.map(m => Math.max(-0.7, Math.min(0.6, m * 1.6)) * Lh) : [-Lh * 0.39]; }

// ---------- on a 3D ship, behind it (drawn before the hull) ----------
function admiralFxBefore(skin, P, Lh, B, Zd, mastH, s) {
  const a = admiralSig(skin); if (!a || g.sky) return;
  const t = admT(), full = s > 5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (a.sig === 'waterline' && full) {
    // the Plimsoll line on the water: an electric-blue ring of light hugging her waterline (the hull hides
    // the inside of it), rippling, with bright pulses running from bow to stern
    ctx.strokeStyle = '#5fd3ff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const sd of [-1, 1]) {
      // one soft wide stroke for the glow, then the bright core segment by segment so its ripple shows
      let prev = null, wide = 3;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const u = k / 12 * 2 - 1, rip = 0.5 + 0.5 * Math.sin(t * 5 - u * 9);
        const p = P(u * Lh * 0.99, sd * (admHullW(u) * B * 0.86 + 0.25 + rip * 0.25), 0.05); if (!p) continue;
        if (prev) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
        prev = p; wide = Math.max(wide, p.s * 0.9);
      }
      ctx.globalAlpha = 0.35; ctx.lineWidth = wide; ctx.stroke();
      prev = null;
      for (let k = 0; k <= 12; k++) {
        const u = k / 12 * 2 - 1, rip = 0.5 + 0.5 * Math.sin(t * 5 - u * 9);
        const p = P(u * Lh * 0.99, sd * (admHullW(u) * B * 0.86 + 0.25 + rip * 0.25), 0.05);
        if (p && prev) { ctx.globalAlpha = 0.55 + 0.45 * rip; ctx.lineWidth = Math.max(1, p.s * 0.18); ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        prev = p;
      }
      for (let i = 0; i < 3; i++) {
        const u = 1 - ((t * 0.5 + i / 3) % 1) * 2, p = P(u * Lh * 0.99, sd * (admHullW(u) * B * 0.86 + 0.4), 0.05);
        if (p) admGlow(p.x, p.y, '#e8faff', Math.max(4, p.s * 1.4), 0.8);
      }
    }
  } else if (a.sig === 'blackhole') {
    // the dark: a black disc swallowing the light behind her, ringed by a slowly turning cyan accretion disc
    const c = P(0, 0, Zd + mastH * 0.45); if (c) {
      const R = Math.min(220, Math.max(10, mastH * 0.55 * c.s));
      // the void swallowing the light round her
      ctx.globalCompositeOperation = 'source-over';
      const gr = ctx.createRadialGradient(c.x, c.y, R * 0.2, c.x, c.y, R * 1.6);
      gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.4, 'rgba(0,6,10,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.6, 0, 6.28); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      admGlow(c.x, c.y, '#00e5ff', R * 0.9, 0.1 + 0.05 * Math.sin(t * 3));
      // the far half of the accretion disc circling her
      if (full) admDisc(P, Lh, B, Zd, mastH, t, -1);
    }
  } else if (a.sig === 'aurora') {
    // aurora curtains: rippling ribbons of light hanging in the sky above her, green below, violet above
    // (hung a little ahead of her, so they show over the bow from the chase camera too)
    const N = full ? 22 : 8, curtains = full ? 3 : 1, base = Zd + mastH * 0.55, top = base + Math.max(12, mastH * 1.3);
    for (let k = 0; k < curtains; k++) {
      const wOff = (k - 1) * B * 1.8, uOff = Lh * (0.7 + k * 0.35), prev = []; let lg = null, lgCol = '';
      for (let i = 0; i <= N; i++) {
        const u = uOff + (i / N * 2 - 1) * Lh * 1.6, wv = Math.sin(t * 0.6 + i * 0.22 + k * 2) * B * 1.6;
        const zb = base + k * 2 + Math.sin(t * 0.9 + i * 0.3 + k) * 1.2, h = (top - base) * (0.7 + 0.3 * Math.sin(t * 0.5 + i * 0.17 + k * 1.7));
        const p0 = P(u, wOff + wv, zb), p1 = P(u, wOff + wv, zb + h);
        if (p0 && p1 && prev.length) {
          const q0 = prev[0], q1 = prev[1];
          // (one gradient per colour band, reused along the curtain)
          const col = auroraCol(t * 0.3 + i * 0.05 + k * 1.5);
          if (col !== lgCol) { lgCol = col; lg = ctx.createLinearGradient(0, p0.y, 0, p1.y); lg.addColorStop(0, col + '00'); lg.addColorStop(0.12, col); lg.addColorStop(0.4, col + '99'); lg.addColorStop(1, '#b8a0ff00'); }
          ctx.globalAlpha = (0.13 + 0.11 * Math.sin(t * 1.6 + i * 0.9 + k * 3) + 0.06 * Math.sin(t * 4.3 + i * 2.1)) * (full ? 1 : 0.8);
          ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(q1.x, q1.y); ctx.closePath(); ctx.fill();
        }
        prev[0] = p0; prev[1] = p1; if (!p0 || !p1) prev.length = 0;
      }
    }
  }
  ctx.restore();
}

// Abyssal Black's accretion disc: three streams of cyan circling her in a tilted ring round the rig.
// half -1 draws the far half (behind the ship), +1 the near half (in front of it)
function admDisc(P, Lh, B, Zd, mastH, t, half) {
  const ctr = P(0, 0, Zd + mastH * 0.4); if (!ctr) return;
  ctx.strokeStyle = '#00e5ff'; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const ru = Lh * (1.15 + k * 0.18), rw = B * (3.2 + k * 0.6), N = 28;
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const an = i / N * 6.283, p = P(Math.cos(an) * ru, Math.sin(an) * rw, Zd + mastH * 0.4 + Math.sin(an) * mastH * 0.12);
      if (p && prev && (p.s - ctr.s) * half >= 0) {
        // brightness streams round the ring
        const st = 0.5 + 0.5 * Math.sin(an * 3 - t * (2.2 + k * 0.5) + k * 2);
        ctx.globalAlpha = (0.15 + 0.6 * st * st) * (1 - k * 0.22); ctx.lineWidth = Math.max(1, Math.min(4, p.s * (0.25 - k * 0.05)));
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      prev = p;
    }
  }
}

// ---------- on one face of the hull (ship3d calls this for each side and the transom it draws) ----------
// at(s, h): a point on the face, s along it (0 aft, 1 forward), h up it (0 waterline, 1 deck)
function admiralHullFx(skin, f, at, Lh) {
  const a = admiralSig(skin); if (!a) return;
  const t = admT();
  const quad = (s0, s1, h0, h1, col) => fillPoly([at(s0, h0), at(s1, h0), at(s1, h1), at(s0, h1)], col);
  const ga = ctx.globalAlpha;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // the shared Admiral sheen: a bright band of light sweeping from bow to stern along the topsides
  const pos = f.side ? (f.i + 0.5) / 6 : -0.05, sw = 1.25 - ((t * 0.45) % 1.6);
  const sh = Math.exp(-((pos - sw) * (pos - sw)) * 30);
  if (sh > 0.03) { ctx.globalAlpha = ga * sh * 0.55; quad(0, 1, 0.32, 0.86, a.sheen); }
  if (a.sig === 'waterline') {
    // the Plimsoll line, lit: an electric-blue band at the waterline, its brightness rippling along her
    for (let k = 0; k < 3; k++) {
      const s0 = k / 3, rip = 0.5 + 0.5 * Math.sin(t * 5 - (pos + s0 / 6) * 22);
      ctx.globalAlpha = ga * (0.45 + 0.5 * rip); quad(s0, s0 + 1 / 3, 0.22, 0.34, '#5fd3ff');
      ctx.globalAlpha = ga * rip * 0.8; quad(s0, s0 + 1 / 3, 0.26, 0.3, '#e8faff');
    }
  } else if (a.sig === 'molten') {
    // molten cracks: a jagged seam of fire across the planks, glowing and fading
    const seed = (f.i + 2) * 7 + (f.side + 1) * 31, beat = 0.55 + 0.45 * Math.sin(t * 2.6 + f.i * 1.3);
    ctx.globalAlpha = ga * beat * 0.3; quad(0, 1, 0.3, 0.8, '#ff3a0a');
    for (let c = 0; c < 2; c++) {
      const pts = [];
      for (let k = 0; k <= 5; k++) pts.push(at(k / 5, 0.35 + c * 0.25 + (hash(seed + k, c + 40) - 0.5) * 0.22));
      const q = polyProj(pts); if (q.length < 2) continue;
      ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ff5a14'; ctx.lineWidth = Math.max(3, q[0].s * 0.6); ctx.globalAlpha = ga * beat * 0.55; ctx.stroke();
      ctx.strokeStyle = '#ffb030'; ctx.lineWidth = Math.max(1.5, q[0].s * 0.22); ctx.globalAlpha = ga * beat; ctx.stroke();
      ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = Math.max(0.7, q[0].s * 0.07); ctx.stroke();
    }
  } else if (a.sig === 'royal') {
    // royal purple light breathing in the topsides, a gold line pulsing under the rail
    ctx.globalAlpha = ga * (0.25 + 0.15 * Math.sin(t * 1.8)); quad(0, 1, 0.34, 0.74, '#7a30d0');
    ctx.globalAlpha = ga * (0.5 + 0.4 * Math.sin(t * 3 - pos * 8)); quad(0, 1, 0.79, 0.83, '#ffd34d');
  } else if (a.sig === 'fleece') {
    // golden wool: soft gold tufts glowing along the topsides
    ctx.globalAlpha = ga * (0.22 + 0.12 * Math.sin(t * 1.5 + pos * 5)); quad(0, 1, 0.3, 0.84, '#ffd34d');
  } else if (a.sig === 'gulls') {
    // moonlight running over silver paint
    const m = 0.5 + 0.5 * Math.sin(t * 1.3 - pos * 9);
    ctx.globalAlpha = ga * m * 0.35; quad(0, 1, 0.4, 0.84, '#e8eef4');
  } else if (a.sig === 'blackhole') {
    // cold cyan seams flickering in the black planking
    ctx.globalAlpha = ga * (0.35 + 0.35 * Math.sin(t * 4 + pos * 12)); quad(0, 1, 0.83, 0.86, '#00e5ff');
  } else if (a.sig === 'feathers' || a.sig === 'eye') {
    ctx.globalAlpha = ga * (0.18 + 0.1 * Math.sin(t * 2)); quad(0, 1, 0.34, 0.84, a.glow);
  } else if (a.sig === 'beam') {
    ctx.globalAlpha = ga * (0.18 + 0.1 * Math.sin(t * 2)); quad(0, 1, 0.34, 0.84, '#ffd34d');
  }
  ctx.restore();
}

// ---------- on a sail (ship3d calls this for each sail of a near ship; `main` is a striped sail) ----------
function admiralSailFx(skin, pts, main) {
  const a = admiralSig(skin); if (!a || pts.length < 3) return;
  const q = polyProj(pts); if (q.length < 3) return;
  const t = admT();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of q) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
  const w = x1 - x0, h = y1 - y0; if (w < 3 || h < 3) return;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const ga = ctx.globalAlpha;
  ctx.save();
  // the sail's outline: filled straight for a flat wash of light, clipped to only for the patterned looks
  ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  ctx.globalCompositeOperation = 'lighter';
  if (a.sig === 'gulls' || a.sig === 'fleece' && main) ctx.clip();
  if (a.sig === 'feathers') {
    // the Gannet's sails shine white, a slow bright breath
    ctx.globalAlpha = ga * (0.36 + 0.16 * Math.sin(t * 1.7)); ctx.fillStyle = '#ffffff'; ctx.fill();
  } else if (a.sig === 'gulls') {
    // moonlit shimmer: a pale silver band running up the cloth
    const k = (t * 0.35) % 1.4 - 0.2, yb = y1 - k * h;
    ctx.globalAlpha = ga * 0.5; ctx.fillStyle = '#e8f2ff'; ctx.fillRect(x0, yb - h * 0.08, w, h * 0.16);
    ctx.globalAlpha = ga * 0.25; ctx.fillRect(x0, yb - h * 0.2, w, h * 0.4);
  } else if (a.sig === 'fleece' && !main) {
    ctx.globalAlpha = ga * (0.14 + 0.08 * Math.sin(t * 1.5)); ctx.fillStyle = '#ffd34d'; ctx.fill();
  } else if (a.sig === 'fleece') {
    // golden wool: curly tufts of warm light bubbling over the canvas
    for (let i = 0; i < 3; i++) admGlow(x0 + w * hash(i, 61), y0 + h * hash(i, 62), '#ffd34d', Math.min(w, h) * (0.25 + 0.12 * Math.sin(t * 2 + i * 1.7)), ga * 0.3);
    // and the fleece's curls, little rings of gold turning in the cloth
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.018);
    const cr = Math.min(w, h) * 0.06;
    for (let i = 0; i < 10; i++) {
      const x = x0 + w * (0.1 + 0.8 * hash(i, 63)), y = y0 + h * (0.1 + 0.8 * hash(i, 64)), a0 = t * 1.5 + i;
      ctx.globalAlpha = ga * (0.4 + 0.3 * Math.sin(t * 2.5 + i)); ctx.beginPath(); ctx.arc(x, y, cr, a0, a0 + 4.4); ctx.stroke();
    }
  } else if (a.sig === 'royal' && main) {
    // a royal purple light rising up the foot of the cloth
    const lg = ctx.createLinearGradient(0, y1, 0, y0); lg.addColorStop(0, '#a050ff'); lg.addColorStop(0.5, '#a050ff00');
    ctx.globalAlpha = ga * (0.45 + 0.2 * Math.sin(t * 2)); ctx.fillStyle = lg; ctx.fill();
  } else if (a.sig === 'beam' || a.sig === 'waterline' || a.sig === 'molten') {
    // a breath of the skin's own light in the cloth
    ctx.globalAlpha = ga * (0.1 + 0.08 * Math.sin(t * 2 + mx * 0.01)); ctx.fillStyle = a.glow; ctx.fill();
  }
  ctx.restore();
  if (a.sig === 'eye' && main) admEye(mx, my + h * 0.05, Math.min(w * 0.42, h * 0.32), t, ga);
}
// a white feather: a curved vane either side of a quill, soft at the tip
function admFeather(x, y, L, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#f6f8fc';
  ctx.beginPath(); ctx.moveTo(-L, 0); ctx.quadraticCurveTo(-L * 0.2, -L * 0.42, L, -L * 0.05); ctx.quadraticCurveTo(0, L * 0.3, -L, 0); ctx.fill();
  ctx.strokeStyle = '#b8c0cc'; ctx.lineWidth = Math.max(0.6, L * 0.07); ctx.beginPath(); ctx.moveTo(-L * 1.25, L * 0.05); ctx.quadraticCurveTo(0, -L * 0.08, L, -L * 0.05); ctx.stroke();
  ctx.restore();
}
// the Sleeper's Eye: an almond eye that lies shut, slowly opens, looks about, and blinks
function admEye(x, y, r, t, ga) {
  if (r < 2) return;
  const cyc = (t * 0.16) % 1;   // shut, opening, open (with a blink), closing
  let open = cyc < 0.1 ? 0 : cyc < 0.22 ? (cyc - 0.1) / 0.12 : cyc < 0.9 ? 1 : 1 - (cyc - 0.9) / 0.1;
  if (cyc > 0.55 && cyc < 0.58) open = 0.1;
  open = open * open * (3 - 2 * open);
  const rh = r * 0.55 * Math.max(0.04, open);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  admGlow(x, y, '#c8a8ff', r * 1.7, ga * (0.2 + 0.25 * open));
  // the eye itself is painted, not added, so it shows dark on a white sail
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ga * 0.95;
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y - rh * 2, x + r, y); ctx.quadraticCurveTo(x, y + rh * 2, x - r, y); ctx.closePath();
  ctx.fillStyle = '#5a3a8a'; ctx.fill();
  ctx.strokeStyle = '#f6f0ff'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
  // lashes along the lower lid, so even shut it reads as a sleeping eye
  ctx.lineWidth = Math.max(1, r * 0.05); ctx.beginPath();
  for (let i = 1; i < 6; i++) { const f = i / 6 * 2 - 1, lx = x + f * r * 0.8, ly = y + rh * (1 - f * f) * 1.5; ctx.moveTo(lx, ly); ctx.lineTo(lx + f * r * 0.12, ly + r * 0.2); }
  ctx.stroke();
  if (open > 0.15) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y - rh * 2, x + r, y); ctx.quadraticCurveTo(x, y + rh * 2, x - r, y); ctx.clip();
    ctx.globalAlpha = Math.min(1, ga * 1.3);
    const lx = x + Math.sin(t * 0.7) * r * 0.3;
    ctx.fillStyle = '#b48cff'; ctx.beginPath(); ctx.arc(lx, y, r * 0.42, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#e6d8ff'; ctx.beginPath(); ctx.arc(lx, y, r * 0.28, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#1a0d2a'; ctx.beginPath(); ctx.ellipse(lx, y, r * 0.07, r * 0.26, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lx - r * 0.12, y - r * 0.12, r * 0.07, 0, 6.28); ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; admGlow(lx, y, '#b48cff', r * 0.7, ga * 0.5 * open);
  }
  ctx.restore();
}

// ---------- on a 3D ship, in front (drawn after the rig) ----------
function admiralFxAfter(skin, P, Lh, B, Zd, mastH, s) {
  const a = admiralSig(skin); if (!a || g.sky) return;
  const t = admT(), full = s > 5, carrier = skin.boat === 'carrier';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const sig = a.sig;
  if (sig === 'beam') {
    // a lighthouse lantern at the masthead, its beam sweeping round
    const top = P(admMasts(skin, Lh)[0], 0, Zd + mastH * 1.02);
    if (top) {
      // two beams back to back, like the Light's own, dipping to the sea where they land
      const R = Math.max(30, Lh * 2.6), spread = 0.2, mu0 = admMasts(skin, Lh)[0];
      for (let b = 0; b < 2; b++) {
        const ang = t * 1.1 + b * Math.PI;
        const e0 = P(mu0 + Math.cos(ang - spread) * R, Math.sin(ang - spread) * R, 0.5), e1 = P(mu0 + Math.cos(ang + spread) * R, Math.sin(ang + spread) * R, 0.5);
        if (!e0 || !e1) continue;
        const ex = (e0.x + e1.x) / 2, ey = (e0.y + e1.y) / 2;
        const lg = ctx.createLinearGradient(top.x, top.y, ex, ey);
        lg.addColorStop(0, '#fff3c4'); lg.addColorStop(0.3, '#ffd34d88'); lg.addColorStop(1, '#ffd34d11');
        ctx.globalAlpha = 0.5; ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.closePath(); ctx.fill();
        admGlow(ex, ey, '#ffd34d', Math.max(8, Math.abs(e1.x - e0.x) * 0.7 + 6), 0.45);
      }
      // the lantern room at the masthead, flashing as it turns
      admGlow(top.x, top.y, '#ffd34d', Math.max(8, top.s * 3.5), 0.55 + 0.25 * Math.sin(t * 4));
      admGlow(top.x, top.y, '#ffffff', Math.max(3, top.s * 1.1), 0.9);
    }
  } else if (sig === 'blackhole') {
    // the near half of the disc, then the core: a hard black sphere ringed by a thin cyan photon ring,
    // hanging between the masts, with cyan sparks spiralling down into it
    if (full) admDisc(P, Lh, B, Zd, mastH, t, 1);
    const c = P(0, 0, Zd + mastH * 0.62); if (c) {
      const R = Math.min(40, Math.max(3, mastH * 0.09 * c.s)), n = full ? 22 : 8;
      admGlow(c.x, c.y, '#00e5ff', R * 3.2, 0.35 + 0.1 * Math.sin(t * 3));
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, 6.28); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#7ff4ff'; ctx.lineWidth = Math.max(1, R * 0.12); ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 4);
      ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.08, 0, 6.28); ctx.stroke();
      ctx.lineWidth = Math.max(1, R * 0.1); ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, R * 2.2, R * 0.45, -0.18, Math.PI * 1.05, Math.PI * 1.95, true); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const life = (t * 0.35 + hash(i, 71)) % 1, r = R * 1.1 + (1 - life) * R * 7, an = hash(i, 72) * 6.28 + life * 7;
        const x = c.x + Math.cos(an) * r, y = c.y + Math.sin(an) * r * 0.5, k = Math.min(4, Math.max(1, (1 - life) * R * 0.18 + 1));
        ctx.globalAlpha = Math.sin(life * Math.PI) * 0.95; ctx.fillStyle = i % 3 ? '#00e5ff' : '#e0ffff';
        ctx.fillRect(x - k, y - k * 0.4, k * 2, k * 0.8); ctx.fillRect(x - k * 0.4, y - k, k * 0.8, k * 2);
      }
    }
  } else if (sig === 'feathers') {
    // white seabird feathers drifting down past the sails, rocking as they fall
    const n = full ? 14 : 5;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) {
      const life = (t * 0.12 + hash(i, 81)) % 1;
      const p = P((hash(i, 82) * 2 - 1) * Lh * 1.1 - life * 4, (hash(i, 83) * 2 - 1) * B * 2.2 + Math.sin(t * 1.4 + i) * 1.2, Zd + mastH * (1.05 - life * 1.05)); if (!p) continue;
      const L = Math.min(18, Math.max(2.5, p.s * 0.5)), rot = Math.sin(t * 2 + i * 1.9) * 0.9 + i;
      ctx.globalAlpha = Math.min(1, Math.sin(life * Math.PI) * 1.6) * 0.85;
      admFeather(p.x, p.y, L, rot);
    }
  } else if (sig === 'molten') {
    // fire dripping off the deck edge into the sea, each drop hissing out in a small glow
    const n = full ? 12 : 4;
    for (let i = 0; i < n; i++) {
      const life = (t * 0.7 + hash(i, 91)) % 1, sd = i % 2 ? 1 : -1, u = (hash(i, 92) * 1.6 - 0.8);
      const p = P(u * Lh, sd * admHullW(u) * B * (0.95 - life * 0.1), Zd * (1 - life * life)); if (!p) continue;
      const k = Math.max(1.2, p.s * 0.22);
      ctx.globalAlpha = 0.95; ctx.fillStyle = life < 0.5 ? '#ffd070' : '#ff5a14';
      ctx.fillRect(p.x - k * 0.5, p.y - k * 1.6, k, k * 2.2);
      admGlow(p.x, p.y, '#ff7a1e', k * 3, 0.5);
      if (life > 0.9) admGlow(p.x, p.y, '#ffb030', k * 6, (1 - life) * 6);
    }
  } else if (sig === 'gulls') {
    // a pale moon-glow at the masthead and gulls wheeling round it, catching the light
    const mu = admMasts(skin, Lh)[0], top = P(mu, 0, Zd + mastH);
    if (top) admGlow(top.x, top.y + top.s * 2, '#cfe4ff', Math.max(8, top.s * 7), 0.3);
    ctx.strokeStyle = '#eef4fa'; ctx.lineCap = 'round';
    for (let i = 0; i < (full ? 5 : 2); i++) {
      const an = t * (0.5 + i * 0.07) + i * 1.26, rr = Lh * (0.7 + 0.25 * (i % 3));
      const p = P(mu + Math.cos(an) * rr, Math.sin(an) * rr * 0.9, Zd + mastH * (0.7 + 0.08 * (i % 3) + 0.08 * Math.sin(t * 0.6 + i))); if (!p) continue;
      const L = Math.min(26, Math.max(4, p.s * 0.85)), fl = Math.sin(t * 6 + i * 2) * 0.45;
      ctx.globalAlpha = 0.9; ctx.lineWidth = Math.max(1, L * 0.16);
      ctx.beginPath(); ctx.moveTo(p.x - L, p.y - L * fl); ctx.quadraticCurveTo(p.x - L * 0.45, p.y - L * 0.5, p.x, p.y); ctx.quadraticCurveTo(p.x + L * 0.45, p.y - L * 0.5, p.x + L, p.y - L * fl); ctx.stroke();
      admGlow(p.x, p.y, '#cfe4ff', L * 1.2, 0.2);
    }
  } else if (sig === 'eye') {
    // lilac dream-motes floating up round the rig, swaying
    for (let i = 0; i < (full ? 16 : 6); i++) {
      const life = (t * 0.15 + hash(i, 101)) % 1;
      const p = P((hash(i, 102) * 2 - 1) * Lh * 0.9 + Math.sin(t * 0.8 + i) * 1.5, (hash(i, 103) * 2 - 1) * B * 2, Zd + life * mastH * 1.1); if (!p) continue;
      admGlow(p.x, p.y, i % 3 ? '#c8a8ff' : '#f6f0ff', Math.max(3, p.s * 0.8), Math.sin(life * Math.PI) * 0.85);
    }
  } else if (sig === 'royal') {
    // banners of light streaming aft from each masthead, purple edged with gold, and a crown over the main
    const ms = admMasts(skin, Lh);
    if (full) for (const mu of ms) {
      let prev = null;
      for (let k = 0; k <= 10; k++) {
        // streaming out to leeward from the top of each lower mast, rippling like silk
        const f = k / 10, p = P(mu - f * Lh * 0.25 + Math.sin(t * 2.2 - f * 5 + mu) * f * 1.2, B * (0.3 + f * 3.2), Zd + mastH * 0.56 + Math.sin(t * 3 - f * 6 + mu) * f * 1.6 - f * 2);
        if (p && prev) {
          ctx.globalAlpha = 0.55 * (1 - f * 0.7); ctx.strokeStyle = '#a050ff'; ctx.lineWidth = Math.max(2, p.s * 0.9 * (1 - f * 0.5)); ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          ctx.globalAlpha = 0.85 * (1 - f * 0.6); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = Math.max(0.8, p.s * 0.16); ctx.stroke();
        }
        prev = p;
      }
    }
    // the crown rides over her stern, above the lantern, where the chase camera and crewmates both see it
    const c = P(-Lh * 0.92, 0, Zd + 4 + Math.sin(t * 1.5) * 0.3);
    if (c) {
      const r = Math.min(22, Math.max(4, c.s * 1.1));
      admGlow(c.x, c.y, '#a050ff', r * 3, 0.45 + 0.15 * Math.sin(t * 2));
      admGlow(c.x, c.y, '#ffd34d', r * 1.8, 0.5);
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffd34d';
      ctx.beginPath(); ctx.moveTo(c.x - r, c.y + r * 0.5); ctx.lineTo(c.x - r, c.y - r * 0.4); ctx.lineTo(c.x - r * 0.5, c.y); ctx.lineTo(c.x, c.y - r * 0.7); ctx.lineTo(c.x + r * 0.5, c.y); ctx.lineTo(c.x + r, c.y - r * 0.4); ctx.lineTo(c.x + r, c.y + r * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff4a8a'; ctx.fillRect(c.x - r * 0.12, c.y + r * 0.05, r * 0.24, r * 0.24);
    }
  } else if (sig === 'fleece') {
    // gold dust rising off her, twinkling
    ctx.fillStyle = '#ffe07a';
    for (let i = 0; i < (full ? 26 : 8); i++) {
      const life = (t * 0.25 + hash(i, 111)) % 1;
      const p = P((hash(i, 112) * 2 - 1) * Lh * 0.9 + Math.sin(t + i) * 0.8, (hash(i, 113) * 2 - 1) * B * 1.4, Zd + life * mastH * 1.2); if (!p) continue;
      const k = Math.max(1, p.s * 0.16) * (0.6 + 0.4 * Math.sin(t * 7 + i * 3));
      ctx.globalAlpha = Math.sin(life * Math.PI); ctx.fillRect(p.x - k, p.y - k, k * 2, k * 2);
      if (i % 4 === 0) admGlow(p.x, p.y, '#ffd34d', k * 4, 0.4 * Math.sin(life * Math.PI));
    }
  } else if (sig === 'braid') {
    // gold braid: a string of lights round the flight deck edge with gold chasing along it
    const n = full ? 18 : 8, deckZ = Zd + 0.15;
    for (const sd of [-1, 1]) for (let i = 0; i <= n; i++) {
      const u = (i / n * 1.95 - 1) * Lh, p = P(u, sd * B * (u > Lh * 0.75 ? 0.6 : 1), deckZ); if (!p) continue;
      const ch = Math.pow(0.5 + 0.5 * Math.cos((i / n * 12 - t * 5) + (sd > 0 ? 0 : 3)), 6);
      ctx.globalAlpha = 0.5 + 0.5 * ch; ctx.fillStyle = ch > 0.5 ? '#ffffff' : '#ffd34d';
      const k = Math.max(1, p.s * 0.22); ctx.fillRect(p.x - k, p.y - k, k * 2, k * 2);
      if (ch > 0.3) admGlow(p.x, p.y, '#ffd34d', k * 5, ch * 0.7);
    }
    // the starburst: gold rays turning round the island's masthead
    const c = carrier ? P(-Lh * 0.39, B * 0.77, Zd + mastH) : P(admMasts(skin, Lh)[0], 0, Zd + mastH);
    if (c) {
      const R = Math.max(10, c.s * 5) * (0.85 + 0.15 * Math.sin(t * 2.5));
      ctx.strokeStyle = '#ffe9a0'; ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const an = t * 0.6 + i * Math.PI / 6, L = R * (i % 2 ? 0.55 : 1);
        ctx.globalAlpha = i % 2 ? 0.45 : 0.75; ctx.lineWidth = Math.max(1, c.s * (i % 2 ? 0.12 : 0.22));
        ctx.beginPath(); ctx.moveTo(c.x + Math.cos(an) * R * 0.12, c.y + Math.sin(an) * R * 0.12); ctx.lineTo(c.x + Math.cos(an) * L, c.y + Math.sin(an) * L); ctx.stroke();
      }
      admGlow(c.x, c.y, '#ffd34d', R * 0.8, 0.7); admGlow(c.x, c.y, '#ffffff', R * 0.25, 0.9);
    }
  } else if (sig === 'aurora' && full) {
    // a shimmer of aurora light coming down onto her deck
    for (let i = 0; i < 10; i++) {
      const life = (t * 0.2 + hash(i, 121)) % 1;
      const p = P((hash(i, 122) * 2 - 1) * Lh, (hash(i, 123) * 2 - 1) * B, Zd + mastH + 4 - life * (mastH + 2)); if (!p) continue;
      admGlow(p.x, p.y, auroraCol(i + t * 0.3), Math.max(3, p.s * 0.9), Math.sin(life * Math.PI) * 0.7);
    }
  }
  ctx.restore();
}

// ---------- on your deck, first person ----------
function admiralDeckFx(skin, tipY, DW, railT) {
  const a = admiralSig(skin); if (!a) return;
  const t = admT(), sig = a.sig;
  const rx = (sd, k) => cx + sd * DW + (sd * 6 - sd * DW) * k, ry = k => (H - 4) + (tipY + 2 - (H - 4)) * k;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // the shared base: a gold sheen running up both rails to the bow
  { const k = (t * 0.45) % 1.4;
    if (k < 1) for (const sd of [-1, 1]) admGlow(rx(sd, k), ry(k) - railT * 0.5, a.sheen.length === 7 ? a.sheen : '#fff2c0', railT * 3.5 * (1.2 - k * 0.7), 0.6 * Math.sin(k * Math.PI)); }
  if (sig === 'waterline') {
    // electric-blue light rippling along the rails
    ctx.strokeStyle = '#5fd3ff'; ctx.lineCap = 'round';
    for (const sd of [-1, 1]) for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = pass ? 0.9 : 0.3; ctx.lineWidth = pass ? 2 : railT * 1.2; ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const k = i / 24, x = rx(sd, k), y = ry(k) - railT * 0.6 + Math.sin(t * 6 - k * 18) * railT * 0.35 * (1 - k * 0.6); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
  } else if (sig === 'beam') {
    // the masthead's lighthouse beam sweeping across the sky ahead
    // (it comes from the masthead above and behind you, so it fans out over the bow and down to the sea)
    const ang = Math.sin(t * 0.55) * 1.1, ox = cx, oy = -H * 0.15, L = H * 1.4;
    const lg = ctx.createLinearGradient(ox, oy, ox + Math.sin(ang) * L, oy + Math.cos(ang) * L);
    lg.addColorStop(0, '#fff3c4'); lg.addColorStop(0.35, '#ffd34d88'); lg.addColorStop(1, '#ffd34d00');
    ctx.globalAlpha = 0.45; ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.sin(ang - 0.14) * L, oy + Math.cos(ang - 0.14) * L); ctx.lineTo(ox + Math.sin(ang + 0.14) * L, oy + Math.cos(ang + 0.14) * L); ctx.closePath(); ctx.fill();
    // where it lands on the water ahead, a travelling pool of gold
    const wx = ox + Math.tan(ang) * (hy + H * 0.08 - oy);
    if (wx > -200 && wx < W + 200) { ctx.save(); ctx.translate(wx, hy + H * 0.08); ctx.scale(1, 0.18); admGlow(0, 0, '#ffd34d', H * 0.4, 0.5); ctx.restore(); }
  } else if (sig === 'blackhole') {
    // the dark gathers ahead of the bow, cyan sparks spiralling into it
    const bx = cx, by = tipY - H * 0.12, R = Math.min(W, H) * 0.22;
    ctx.globalCompositeOperation = 'source-over';
    const gr = ctx.createRadialGradient(bx, by, R * 0.05, bx, by, R);
    gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(bx - R, by - R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4; ctx.setLineDash([R * 0.4, R * 0.15]); ctx.lineDashOffset = -t * R;
    ctx.beginPath(); ctx.ellipse(bx, by, R * 0.7, R * 0.2, -0.1, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 20; i++) {
      const life = (t * 0.3 + hash(i, 71)) % 1, r = (1 - life) * R * 1.3, an = hash(i, 72) * 6.28 + life * 7;
      ctx.globalAlpha = Math.sin(life * Math.PI); ctx.fillStyle = i % 3 ? '#00e5ff' : '#e0ffff';
      const k = 1 + (1 - life) * 2.5; ctx.fillRect(bx + Math.cos(an) * r - k, by + Math.sin(an) * r * 0.4 - k * 0.4, k * 2, k * 0.8);
    }
  } else if (sig === 'feathers') {
    // white feathers drifting down across your view
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      const life = (t * 0.09 + hash(i, 81)) % 1, x = W * hash(i, 82) + Math.sin(t * 1.2 + i) * 30, y = -20 + life * (H + 40), L = 6 + hash(i, 83) * 8;
      ctx.globalAlpha = 0.8; admFeather(x, y, L, Math.sin(t * 1.8 + i * 2) * 0.9 + i);
    }
  } else if (sig === 'molten') {
    // molten cracks glowing along the rails, fire dripping off them
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      // jagged cracks of molten light running in from the rail across the planks, each pulsing in turn
      for (let c = 0; c < 6; c++) {
        const k0 = 0.04 + c * 0.13 + hash(c, 94 + sd) * 0.05, beat = 0.45 + 0.55 * Math.max(0, Math.sin(t * 2.6 - c * 0.9 + sd));
        let x = rx(sd, k0), y = ry(k0); const len = (1 - k0) * DW * 0.32 + 12, sc = 1 - k0 * 0.8;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 1; j <= 5; j++) { x -= sd * len / 5; y += (hash(c * 7 + j, 98 + sd) - 0.5) * 22 * sc + 4 * sc; ctx.lineTo(x, y); }
        ctx.strokeStyle = '#ff3a0a'; ctx.lineWidth = 9 * sc; ctx.globalAlpha = 0.35 * beat; ctx.stroke();
        ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 3.5 * sc; ctx.globalAlpha = 0.8 * beat; ctx.stroke();
        ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 1.2 * sc; ctx.globalAlpha = beat; ctx.stroke();
      }
      for (let i = 0; i < 6; i++) { const life = (t * 0.8 + hash(i, 96 + sd)) % 1, k = hash(i, 97 + sd) * 0.8; ctx.globalAlpha = 1 - life; ctx.fillStyle = life < 0.4 ? '#ffd070' : '#ff5a14'; ctx.fillRect(rx(sd, k) - 1.5, ry(k) + life * 60, 3, 6); }
    }
  } else if (sig === 'gulls') {
    // gulls wheeling in the sky ahead, catching the moonlight
    ctx.strokeStyle = '#eef4fa'; ctx.lineCap = 'round'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const an = t * (0.35 + i * 0.05) + i * 1.3, x = cx + Math.cos(an) * W * (0.18 + i * 0.04), y = hy - H * 0.2 + Math.sin(an) * H * 0.06 - i * 8, L = 10 + i * 2, fl = Math.sin(t * 5 + i * 2) * 0.45;
      ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(x - L, y - L * fl); ctx.quadraticCurveTo(x - L * 0.45, y - L * 0.5, x, y); ctx.quadraticCurveTo(x + L * 0.45, y - L * 0.5, x + L, y - L * fl); ctx.stroke();
    }
    for (const sd of [-1, 1]) { const k = 1 - (t * 0.3 + (sd > 0 ? 0.5 : 0)) % 1; admGlow(rx(sd, k), ry(k) - railT * 0.5, '#e8eef4', railT * 4, 0.5); }
  } else if (sig === 'eye') {
    // the Sleeper's eye in the sky ahead, and lilac motes drifting up off the deck
    admEye(cx, hy - H * 0.2, Math.min(W, H) * 0.09, t, 0.55);
    for (let i = 0; i < 14; i++) { const life = (t * 0.12 + hash(i, 101)) % 1; admGlow(W * hash(i, 102) + Math.sin(t + i) * 20, H - life * (H - tipY) * 1.4, i % 3 ? '#c8a8ff' : '#f6f0ff', 8, Math.sin(life * Math.PI) * 0.8); }
  } else if (sig === 'royal') {
    // purple and gold banners of light rising from the rails, a crown glowing over the bow
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      const k = 0.15 + i * 0.3, x = rx(sd, k), y = ry(k) - railT;
      ctx.strokeStyle = '#a050ff'; ctx.lineWidth = 10 - i * 2; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 1; j <= 8; j++) { const f = j / 8; ctx.lineTo(x + Math.sin(t * 2.5 - f * 5 + i) * 14 * f, y - f * (120 - i * 25)); }
      ctx.stroke(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8; ctx.stroke();
    }
    admGlow(cx, tipY - 28, '#a050ff', 60, 0.45 + 0.15 * Math.sin(t * 2)); admGlow(cx, tipY - 28, '#ffd34d', 30, 0.5);
  } else if (sig === 'fleece') {
    // gold dust rising past you, a warm glow on the deck
    admGlow(cx, H * 0.85, '#ffd34d', DW * 0.9, 0.18 + 0.06 * Math.sin(t * 1.5));
    ctx.fillStyle = '#ffe07a';
    for (let i = 0; i < 26; i++) { const life = (t * 0.18 + hash(i, 111)) % 1, x = cx + (hash(i, 112) * 2 - 1) * DW * 0.9 + Math.sin(t + i) * 10, y = H - life * H * 0.8, k = 1 + 1.5 * Math.abs(Math.sin(t * 6 + i)); ctx.globalAlpha = Math.sin(life * Math.PI); ctx.fillRect(x - k, y - k, k * 2, k * 2); }
  } else if (sig === 'braid') {
    // gold braid lights chasing up the deck edges, a starburst over the bow
    for (const sd of [-1, 1]) for (let i = 0; i <= 16; i++) {
      const k = i / 16, ch = Math.pow(0.5 + 0.5 * Math.cos(k * 12 - t * 5), 6), x = rx(sd, k), y = ry(k) - 3;
      ctx.globalAlpha = 0.4 + 0.6 * ch; ctx.fillStyle = ch > 0.5 ? '#ffffff' : '#ffd34d'; ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      if (ch > 0.3) admGlow(x, y, '#ffd34d', 18, ch * 0.6);
    }
    const sx = cx, sy = tipY - 40, R = 46 * (0.85 + 0.15 * Math.sin(t * 2.5));
    ctx.strokeStyle = '#ffe9a0'; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const an = t * 0.6 + i * Math.PI / 6, L = R * (i % 2 ? 0.55 : 1); ctx.globalAlpha = i % 2 ? 0.4 : 0.7; ctx.lineWidth = i % 2 ? 1.5 : 2.5; ctx.beginPath(); ctx.moveTo(sx + Math.cos(an) * 6, sy + Math.sin(an) * 6); ctx.lineTo(sx + Math.cos(an) * L, sy + Math.sin(an) * L); ctx.stroke(); }
    admGlow(sx, sy, '#ffd34d', 34, 0.7); admGlow(sx, sy, '#ffffff', 10, 0.9);
  } else if (sig === 'aurora') {
    // aurora curtains rippling across the sky ahead
    const N = 30, base = hy - H * 0.06, top = hy - H * 0.42;
    for (let c = 0; c < 2; c++) {
      let px = null, pb = 0, pt = 0;
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * W, b = base - c * H * 0.05 + Math.sin(t * 0.8 + i * 0.4 + c * 2) * H * 0.03, tp = top + Math.sin(t * 0.5 + i * 0.25 + c) * H * 0.08;
        if (px !== null) {
          const col = auroraCol(t * 0.4 + i * 0.1 + c * 2), lg = ctx.createLinearGradient(0, b, 0, tp);
          lg.addColorStop(0, col); lg.addColorStop(1, '#b8a0ff00');
          ctx.globalAlpha = 0.14 + 0.1 * Math.sin(t * 1.6 + i * 0.7 + c * 3); ctx.fillStyle = lg;
          ctx.beginPath(); ctx.moveTo(px, pb); ctx.lineTo(x, b); ctx.lineTo(x, tp); ctx.lineTo(px, pt); ctx.closePath(); ctx.fill();
        }
        px = x; pb = b; pt = tp;
      }
    }
  }
  ctx.restore();
}

// ---------- in a crate preview (SVG, animated with SMIL) ----------
function admiralPreviewFx(svg, skin, geo) {
  const a = admiralSig(skin); if (!a) return;
  const NS = 'http://www.w3.org/2000/svg', still = typeof reduceMotion !== 'undefined' && reduceMotion;
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
  const anim = (node, attrs, tag) => { if (still) return node; const e = document.createElementNS(NS, tag || 'animate'); for (const k in attrs) e.setAttribute(k, attrs[k]); if (!e.getAttribute('repeatCount')) e.setAttribute('repeatCount', 'indefinite'); node.appendChild(e); return node; };
  // behind the ship: just after the halo that previewFx puts first
  const behind = (node) => { const d = svg.querySelector('defs'), ref = d && d.nextSibling ? d.nextSibling.nextSibling : svg.firstChild; svg.insertBefore(node, ref); return node; };
  const { sternX = 12, bowX = 104, deckY = 54 } = geo || {};
  const mid = (sternX + bowX) / 2, sig = a.sig;
  // the shared base: a bright gold sheen sweeping across the whole picture
  const sheen = el('rect', { x: -30, y: 0, width: 14, height: 80, fill: a.sheen, opacity: 0.2, transform: 'skewX(-18)', filter: 'url(#fxblur2)' });
  anim(sheen, { attributeName: 'x', values: '-30;150', dur: '2.8s' });
  if (sig === 'waterline') {
    const l = el('path', { d: `M${sternX + 6} ${deckY + 8} Q${mid} ${deckY + 9} ${bowX - 7} ${deckY + 6}`, stroke: '#5fd3ff', 'stroke-width': 1.8, fill: 'none', 'stroke-dasharray': '6 3', filter: 'url(#fxblur2)' });
    anim(l, { attributeName: 'stroke-dashoffset', values: '0;-18', dur: '0.8s' });
    anim(el('path', { d: `M${sternX + 6} ${deckY + 8} Q${mid} ${deckY + 9} ${bowX - 7} ${deckY + 6}`, stroke: '#e8faff', 'stroke-width': 0.8, fill: 'none' }), { attributeName: 'opacity', values: '0.4;1;0.4', dur: '0.9s' });
    for (let i = 0; i < 3; i++) {
      const r = el('ellipse', { cx: mid, cy: 68, rx: 10, ry: 2, fill: 'none', stroke: '#5fd3ff', 'stroke-width': 0.6, opacity: still ? 0.4 : 0 });
      anim(r, { attributeName: 'rx', values: '8;56', dur: '2.4s', begin: (i * 0.8) + 's' }); anim(r, { attributeName: 'opacity', values: '0.8;0', dur: '2.4s', begin: (i * 0.8) + 's' });
    }
  } else if (sig === 'beam') {
    const g0 = el('g', { transform: `translate(${mid + 4} 10)` });
    const beam = el('path', { d: 'M0 0 L64 -14 L64 14 Z M0 0 L-64 -14 L-64 14 Z', fill: 'url(#admbeam)', opacity: 0.9 }, g0);
    anim(beam, { attributeName: 'transform', type: 'rotate', values: '0;360', dur: '4s' }, 'animateTransform');
    el('circle', { cx: 0, cy: 0, r: 2.4, fill: '#fff3c4' }, g0);
  } else if (sig === 'blackhole') {
    behind(el('circle', { cx: mid, cy: 32, r: 30, fill: 'url(#admhole)' }));
    el('circle', { cx: mid, cy: 30, r: 5.5, fill: '#000', stroke: '#7ff4ff', 'stroke-width': 0.9 });
    const ring = el('ellipse', { cx: mid, cy: 32, rx: 30, ry: 9, fill: 'none', stroke: '#00e5ff', 'stroke-width': 1, 'stroke-dasharray': '14 5', opacity: 0.8 });
    anim(ring, { attributeName: 'stroke-dashoffset', values: '0;-38', dur: '1.6s' });
    for (let i = 0; i < 8; i++) {
      const g1 = el('g', { transform: `translate(${mid} 32)` }), c = el('circle', { cx: 32, cy: 0, r: 1.1, fill: i % 3 ? '#00e5ff' : '#e0ffff' }, g1);
      anim(c, { attributeName: 'cx', values: '34;0', dur: '2.2s', begin: (i * 0.27).toFixed(2) + 's' });
      anim(g1, { attributeName: 'transform', type: 'rotate', values: `${i * 45};${i * 45 + 420}`, additive: 'sum', dur: '2.2s', begin: (i * 0.27).toFixed(2) + 's' }, 'animateTransform');
    }
  } else if (sig === 'feathers') {
    behind(anim(el('ellipse', { cx: mid, cy: 30, rx: 34, ry: 24, fill: '#ffffff', opacity: 0.25, filter: 'url(#fxblur)' }), { attributeName: 'opacity', values: '0.15;0.45;0.15', dur: '2.4s' }));
    for (let i = 0; i < 6; i++) {
      const x = 20 + hash(i, 82) * 80, f = el('ellipse', { cx: x, cy: 0, rx: 3.2, ry: 0.9, fill: '#ffffff', opacity: 0.9 });
      anim(f, { attributeName: 'cy', values: '-4;72', dur: (4 + hash(i, 83) * 2).toFixed(1) + 's', begin: (i * 0.7).toFixed(1) + 's' });
      anim(f, { attributeName: 'cx', values: `${x};${x + 6};${x - 4};${x + 3}`, dur: '3s' });
    }
  } else if (sig === 'molten') {
    const cr = el('path', { d: `M${sternX + 8} ${deckY + 4} l8 3 l7 -2 l9 3 l8 -3 l9 2 l10 -2 l9 3 l8 -2`, stroke: '#ff7a1e', 'stroke-width': 1.3, fill: 'none', filter: 'url(#fxblur2)' });
    anim(cr, { attributeName: 'opacity', values: '0.3;1;0.3', dur: '1.4s' });
    el('path', { d: `M${sternX + 8} ${deckY + 4} l8 3 l7 -2 l9 3 l8 -3 l9 2 l10 -2 l9 3 l8 -2`, stroke: '#ffd070', 'stroke-width': 0.5, fill: 'none' });
    for (let i = 0; i < 5; i++) {
      const x = sternX + 14 + i * (bowX - sternX - 28) / 4, d = el('rect', { x, y: deckY + 6, width: 1.4, height: 3, fill: i % 2 ? '#ffd070' : '#ff5a14' });
      anim(d, { attributeName: 'y', values: `${deckY + 6};${deckY + 17}`, dur: '1.1s', begin: (i * 0.23).toFixed(2) + 's' });
      anim(d, { attributeName: 'opacity', values: '1;0', dur: '1.1s', begin: (i * 0.23).toFixed(2) + 's' });
    }
  } else if (sig === 'gulls') {
    behind(el('circle', { cx: 92, cy: 12, r: 8, fill: '#e8eef4', opacity: 0.5, filter: 'url(#fxblur2)' }));
    for (let i = 0; i < 3; i++) {
      const g1 = el('g', {}), gull = el('path', { d: 'M-4 0 Q-2 -2 0 0 Q2 -2 4 0', stroke: '#eef4fa', 'stroke-width': 0.9, fill: 'none' }, g1);
      anim(gull, { attributeName: 'd', values: 'M-4 -1 Q-2 -2 0 0 Q2 -2 4 -1;M-4 1 Q-2 -1 0 0 Q2 -1 4 1;M-4 -1 Q-2 -2 0 0 Q2 -2 4 -1', dur: '0.6s' });
      anim(g1, { attributeName: 'transform', type: 'translate', values: `${30 + i * 20} ${10 + i * 4};${70 + i * 10} ${6 + i * 3};${90 - i * 6} ${18 + i * 2};${30 + i * 20} ${10 + i * 4}`, dur: (5 + i).toString() + 's' }, 'animateTransform');
    }
    const sh2 = el('rect', { x: sternX + 10, y: 60, width: bowX - sternX - 20, height: 5, fill: '#e8f2ff', opacity: 0.25, filter: 'url(#fxblur2)' });
    anim(sh2, { attributeName: 'y', values: '60;6', dur: '3s' });
  } else if (sig === 'eye') {
    const bt = BOAT_BY_ID[skin.boat] || BOATS[0], mx = 58 + bt.masts[0] * (46 * bt.len / 27) * 1.6, ex = bt.id === 'cutter' ? mx - 10 : mx, ey = bt.id === 'cutter' ? deckY - 17 : deckY - 13;
    behind(el('circle', { cx: ex, cy: ey, r: 14, fill: '#c8a8ff', opacity: 0.4, filter: 'url(#fxblur)' }));
    const lid = el('path', { d: `M${ex - 8} ${ey} Q${ex} ${ey - 7} ${ex + 8} ${ey} Q${ex} ${ey + 7} ${ex - 8} ${ey} Z`, fill: '#5a3a8a', stroke: '#f6f0ff', 'stroke-width': 0.7 });
    const open = `M${ex - 8} ${ey} Q${ex} ${ey - 7} ${ex + 8} ${ey} Q${ex} ${ey + 7} ${ex - 8} ${ey} Z`, shut = `M${ex - 8} ${ey} Q${ex} ${ey - 0.4} ${ex + 8} ${ey} Q${ex} ${ey + 0.4} ${ex - 8} ${ey} Z`;
    const vals = [shut, shut, open, open, shut, open, open, shut].join(';'), kt = '0;0.15;0.3;0.55;0.57;0.6;0.85;1';
    anim(lid, { attributeName: 'd', values: vals, keyTimes: kt, dur: '5s' });
    const iris = el('circle', { cx: ex, cy: ey, r: 2.8, fill: '#b48cff' });
    anim(iris, { attributeName: 'r', values: '0;0;2.8;2.8;0;2.8;2.8;0', keyTimes: kt, dur: '5s' });
    const pupil = el('ellipse', { cx: ex, cy: ey, rx: 0.5, ry: 1.8, fill: '#1a0d2a' });
    anim(pupil, { attributeName: 'ry', values: '0;0;1.8;1.8;0;1.8;1.8;0', keyTimes: kt, dur: '5s' });
    for (let i = 0; i < 6; i++) { const m = el('circle', { cx: 20 + hash(i, 102) * 80, cy: 70, r: 1.3, fill: '#d8c0ff', opacity: 0 }); anim(m, { attributeName: 'cy', values: '70;8', dur: '4s', begin: (i * 0.66).toFixed(2) + 's' }); anim(m, { attributeName: 'opacity', values: '0;0.9;0', dur: '4s', begin: (i * 0.66).toFixed(2) + 's' }); }
  } else if (sig === 'royal') {
    behind(anim(el('ellipse', { cx: mid, cy: 34, rx: 46, ry: 28, fill: '#a050ff', opacity: 0.3, filter: 'url(#fxblur)' }), { attributeName: 'opacity', values: '0.2;0.45;0.2', dur: '2.2s' }));
    const masts = (BOAT_BY_ID[skin.boat] || BOATS[0]).masts, half = 46 * (BOAT_BY_ID[skin.boat] || BOATS[0]).len / 27;
    for (const m of masts) {
      const mx = 58 + m * half * 1.6, ty = 12;
      const b = el('path', { d: `M${mx} ${ty} q-8 -3 -16 0 t-14 0`, stroke: '#a050ff', 'stroke-width': 2.6, fill: 'none', opacity: 0.7 });
      anim(b, { attributeName: 'd', values: `M${mx} ${ty} q-8 -3 -16 0 t-14 0;M${mx} ${ty} q-8 3 -16 0 t-14 0;M${mx} ${ty} q-8 -3 -16 0 t-14 0`, dur: '1.4s' });
      const gl = el('path', { d: `M${mx} ${ty} q-8 -3 -16 0 t-14 0`, stroke: '#ffd34d', 'stroke-width': 0.6, fill: 'none' });
      anim(gl, { attributeName: 'd', values: `M${mx} ${ty} q-8 -3 -16 0 t-14 0;M${mx} ${ty} q-8 3 -16 0 t-14 0;M${mx} ${ty} q-8 -3 -16 0 t-14 0`, dur: '1.4s' });
    }
    const cx0 = 58 + masts[Math.floor(masts.length / 2)] * half * 1.6;
    const crown = el('path', { d: `M${cx0 - 5} 7 L${cx0 - 5} 2 L${cx0 - 2.5} 4.5 L${cx0} 0.5 L${cx0 + 2.5} 4.5 L${cx0 + 5} 2 L${cx0 + 5} 7 Z`, fill: '#ffd34d', stroke: '#fff0c0', 'stroke-width': 0.4 });
    anim(crown, { attributeName: 'opacity', values: '0.7;1;0.7', dur: '1.6s' });
  } else if (sig === 'fleece') {
    for (let i = 0; i < 5; i++) behind(anim(el('circle', { cx: 30 + hash(i, 61) * 60, cy: 14 + hash(i, 62) * 30, r: 7, fill: '#ffd34d', opacity: 0.3, filter: 'url(#fxblur2)' }), { attributeName: 'r', values: '5;9;5', dur: (1.8 + i * 0.3).toFixed(1) + 's' }));
    for (let i = 0; i < 9; i++) { const d = el('rect', { x: 18 + hash(i, 112) * 84, y: 70, width: 1.3, height: 1.3, fill: '#ffe07a', opacity: 0 }); anim(d, { attributeName: 'y', values: '68;4', dur: '3.2s', begin: (i * 0.35).toFixed(2) + 's' }); anim(d, { attributeName: 'opacity', values: '0;1;0', dur: '3.2s', begin: (i * 0.35).toFixed(2) + 's' }); }
  } else if (sig === 'braid') {
    for (let i = 0; i < 12; i++) { const x = sternX + 2 + i * (bowX - sternX) / 11, d = el('circle', { cx: x, cy: deckY - 2, r: 1, fill: '#ffd34d', opacity: 0.4 }); anim(d, { attributeName: 'opacity', values: '0.3;1;0.3;0.3', keyTimes: '0;0.1;0.25;1', dur: '1.2s', begin: (i * 0.1).toFixed(2) + 's' }); }
    const sb = el('g', { transform: 'translate(42 15)' }), rays = [];
    for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6, L = i % 2 ? 6 : 11; rays.push(`M${(Math.cos(an) * 1.5).toFixed(2)} ${(Math.sin(an) * 1.5).toFixed(2)} L${(Math.cos(an) * L).toFixed(2)} ${(Math.sin(an) * L).toFixed(2)}`); }
    const r = el('path', { d: rays.join(' '), stroke: '#ffe9a0', 'stroke-width': 0.8, 'stroke-linecap': 'round' }, sb);
    anim(r, { attributeName: 'transform', type: 'rotate', values: '0;360', dur: '8s' }, 'animateTransform');
    anim(el('circle', { cx: 0, cy: 0, r: 4, fill: '#ffd34d', filter: 'url(#fxblur2)' }, sb), { attributeName: 'r', values: '3;5;3', dur: '1.5s' });
  } else if (sig === 'aurora') {
    for (let c = 0; c < 3; c++) {
      const y = 4 + c * 5, p = el('path', { d: `M0 ${y + 14} Q30 ${y} 60 ${y + 10} T120 ${y + 6} L120 ${y - 6} Q90 ${y - 14} 60 ${y - 2} T0 ${y} Z`, fill: AURORA_COLS[c * 2 % AURORA_COLS.length], opacity: 0.3, filter: 'url(#fxblur2)' });
      behind(p);
      anim(p, { attributeName: 'd', values: `M0 ${y + 14} Q30 ${y} 60 ${y + 10} T120 ${y + 6} L120 ${y - 6} Q90 ${y - 14} 60 ${y - 2} T0 ${y} Z;M0 ${y + 8} Q30 ${y + 14} 60 ${y + 4} T120 ${y + 12} L120 ${y} Q90 ${y - 4} 60 ${y - 10} T0 ${y - 4} Z;M0 ${y + 14} Q30 ${y} 60 ${y + 10} T120 ${y + 6} L120 ${y - 6} Q90 ${y - 14} 60 ${y - 2} T0 ${y} Z`, dur: (4 + c) + 's' });
      anim(p, { attributeName: 'fill', values: '#7affd8;#7ad8ff;#b8a0ff;#5cffa0;#7affd8', dur: (6 + c * 1.5) + 's' });
    }
  }
  // gradients and a light blur these use (the same in every preview, so repeated ids are harmless)
  const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(NS, 'defs'), svg.firstChild);
  defs.insertAdjacentHTML('beforeend', '<filter id="fxblur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>'
    + '<radialGradient id="admbeam" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.95"/><stop offset="1" stop-color="#ffd34d" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="admhole"><stop offset="0.25" stop-color="#000" stop-opacity="0.95"/><stop offset="0.7" stop-color="#001018" stop-opacity="0.6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>');
}
