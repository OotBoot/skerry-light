// The Open Sky: one voyage in twenty (never the first) you aren't sailing at all. You're flying a little
// propeller plane over a sea of cloud at night, free to climb, dive, bank and turn, threading between
// towering storm clouds. The clouds are the rocks: hit one and the turbulence costs you a plank.
// Lightning lights them up now and then. Come down low between the runway lamps to land.
// Its own three enemies, and nothing else: the Thunderhead, the Petrels and the Squall.

const SKYF = { Z0: 34, ZMIN: 3, ZMAX: 120, LAND: 14, SPEED: 12, PLANE: { bow: 5, len: 10, beam: 3 } };

// ---------- setting up the voyage ----------
// every rock becomes a stack of one to three clouds at different heights over the same spot, so the
// route Plimsoll knows is still clear at any height, and the gaps between are yours to find
function setupSky(seed) {
  g.sky = true;
  ship.z = SKYF.Z0; ship.pitch = 0; ship.vz = 0;
  g.wrecks = []; g.timber = [];
  g.lightning = 0; g.ltT = 4; g.skyHint = 0;
  const rng = seed != null ? seeded((seed ^ 0x6b1d3) >>> 0) : Math.random;
  const R = (a, b) => a + rng() * (b - a);
  const clouds = [];
  for (const r of g.rocks) {
    const n = 1 + (rng() < 0.6 ? 1 : 0) + (rng() < 0.3 ? 1 : 0);
    const rz = Math.max(9, r.r * 1.3), used = [];
    for (let k = 0; k < n; k++) {
      let z = 0, tries = 0;
      do { z = R(10, 100); tries++; } while (tries < 12 && used.some(u => Math.abs(u - z) < rz * 2 + 12));
      used.push(z);
      const puffs = []; for (let i = 0; i < 12; i++) puffs.push({ dx: R(-0.75, 0.75), dz: R(-0.8, 0.85), s: R(0.6, 1.05) });
      clouds.push(Object.assign({}, r, { z, rz, puffs, flash: 0, seenT: null, seenV: 0 }));
    }
  }
  g.rocks = clouds;
  for (const p of g.pickups || []) p.z = R(10, 70);
}

// ---------- flying ----------
// ↑ climbs and ↓ dives (the stick, not the throttle); diving gathers speed and climbing costs it
function skyFlight(dt, pitchIn, boat) {
  const target = clamp(pitchIn, -1, 1) * 0.42;
  ship.pitch += (target - ship.pitch) * Math.min(1, dt * 3);
  const vT = Math.min(g.mods.cap, (SKYF.SPEED - ship.pitch * 9) * g.mods.slow * (boat.top || 1));
  ship.v += (vT - ship.v) * Math.min(1, dt * 1.5);
  ship.sail = 0.7;
  ship.z += Math.sin(ship.pitch) * ship.v * dt;
  if (ship.z < SKYF.ZMIN) {
    // skimming the cloud floor: it drags at you
    ship.z = SKYF.ZMIN; ship.pitch = Math.max(ship.pitch, 0); ship.v *= 1 - dt * 0.8;
    if (!g.floorWarned) { g.floorWarned = true; addLog('You’re skimming the cloud floor. Pull up!', 'w'); }
  }
  if (ship.z > SKYF.ZMAX) { ship.z = SKYF.ZMAX; ship.pitch = Math.min(ship.pitch, 0); }
  // lightning, every few seconds, lights every cloud for a moment
  g.ltT -= dt;
  if (g.ltT <= 0) {
    g.ltT = rand(6, 11); g.lightning = 1;
    const near = g.rocks.filter(r => Math.hypot(r.x - ship.x, r.y - ship.y) < 500);
    if (near.length) near[(Math.random() * near.length) | 0].flash = 0.6;
    setTimeout(() => sfxFoe('rumble', rand(-0.6, 0.6), 0.6), 600);
  }
  if (g.lightning > 0) g.lightning = Math.max(0, g.lightning - dt * 2.5);
  for (const r of g.rocks) if (r.flash > 0) r.flash -= dt;
  // too high to land over the runway
  const inGap = Math.abs(ship.x - SK.HARBOUR.x) < 18;
  if (inGap && ship.y < 90 && ship.z >= SKYF.LAND && !g.skyHint) { g.skyHint = 1; addLog('Too high to land. Dive (↓) to come in below ' + SKYF.LAND + ' m between the runway lamps.', 'w'); }
}

// how well you can see a cloud: the beam, your landing light (weaker the further above or below),
// a flare, the carrier's jet, and lightning
function cloudVis(o) {
  const dz = Math.abs((o.z || 0) - (ship.z || 0));
  const v = litAt(o.x, o.y) * 1.3 + lanternAt(o.x, o.y) * clamp(1 - dz / 45, 0, 1) + flareAt(o.x, o.y) + jetAt(o.x, o.y) + (g.lightning || 0) * 0.9 + Math.max(0, o.flash || 0) * 1.5;
  return Math.min(1, v);
}

// ---------- drawing ----------
const SKY_PUFF = {};
function puffSprite(col) {
  if (!SKY_PUFF[col]) {
    const c = offscreen(64, 64), q = c.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.55, `rgba(${col},0.85)`); gr.addColorStop(1, `rgba(${col},0)`);
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64); SKY_PUFF[col] = c;
  }
  return SKY_PUFF[col];
}
// a storm cloud: a dark billowing mass, its tops caught by whatever light there is
function drawCloud(o, q) {
  const vis = Math.max(cloudVis(o), afterglow(o) * 0.9);
  if (vis < 0.03) return;
  const R = o.r * 1.3 * q.s, Rz = o.rz * 1.1 * q.s;
  const dark = puffSprite('34,40,62'), lite = puffSprite('205,215,240');
  for (const p of o.puffs) {
    const x = q.x + p.dx * R * 0.7, y = q.y - p.dz * Rz * 0.75, s = p.s * Math.min(R, Rz) * 1.15;
    ctx.globalAlpha = vis * 0.9; ctx.drawImage(dark, x - s, y - s, s * 2, s * 2);
  }
  for (const p of o.puffs) {
    if (p.dz < 0) continue;
    const x = q.x + p.dx * R * 0.7, y = q.y - p.dz * Rz * 0.75 - p.s * Rz * 0.25, s = p.s * Math.min(R, Rz) * 0.7;
    ctx.globalAlpha = vis * 0.35; ctx.drawImage(lite, x - s, y - s, s * 2, s * 2);
  }
  if (o.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, o.flash * 2); lamp(q.x, q.y, '#c8d8ff', Math.max(4, R * 0.35)); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
}

// the plane, for the chase camera and your crew: fuselage, wings, tail, a spinning prop
function drawPlane3D(o, skin, boat, vis, opts) {
  opts = opts || {};
  const tier = skinTier(skin);
  const sh = Math.sin(o.h), ch = Math.cos(o.h), p = o.pitch || 0, b = (o.rudder || 0) * 0.55;
  const cp = Math.cos(p), sp = Math.sin(p), cb = Math.cos(b), sb = Math.sin(b), z0 = (o.z || 0) + Math.sin((o.bob || 0) * 1.7) * 0.15;
  // local: u forward, w starboard, z up; bank about u, then pitch about w
  const K = 1.5;
  const W3 = (u0, w0, zz) => { const u = u0 * K, w = w0 * K, z = zz * K; const w1 = w * cb - z * sb, z1 = w * sb + z * cb, u2 = u * cp - z1 * sp, z2 = u * sp + z1 * cp; return [o.x + sh * u2 + ch * w1, o.y + ch * u2 - sh * w1, z0 + z2]; };
  const lit = Math.max(opts.minLit || 0.35, Math.min(1, vis));
  const shade = (c, k) => { const h = String(c).replace('#', ''), v = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) || 0), n = [8, 10, 16]; return 'rgb(' + v.map((x, i) => Math.round((n[i] + (x - n[i]) * lit) * (1 - k))).join(',') + ')'; };
  const P = (u, w, z) => { const q = polyProj([W3(u, w, z)]); return q.length ? q[0] : null; };
  ctx.save(); ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
  const fx = skinFx(skin);
  shipFxBefore(skin, P, 4.5, 5, 0, 2);
  const parts = [];
  const dist = pt => Math.hypot(camX - pt[0], camY - pt[1], camH - pt[2]);
  const poly = (pts, col) => parts.push({ d: dist(pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length, a[2] + q[2] / pts.length], [0, 0, 0])), draw: () => fillPoly(pts, col) });
  // wings, a touch of dihedral
  for (const s of [-1, 1]) poly([W3(1.4, 0, 0), W3(1.0, s * 5.5, 0.35), W3(-0.2, s * 5.5, 0.35), W3(-0.6, 0, 0)], shade(skin.sail, s > 0 ? 0.05 : 0.15));
  if (tier >= 3) for (const s of [-1, 1]) poly([W3(0.5, s * 4.2, 0.37), W3(0.3, s * 5.3, 0.37), W3(-0.05, s * 5.3, 0.37), W3(0.15, s * 4.2, 0.37)], shade(skin.rail, 0));
  // tailplane and fin
  for (const s of [-1, 1]) poly([W3(-3.4, 0, 0.2), W3(-3.7, s * 2, 0.25), W3(-4.3, s * 2, 0.25), W3(-4.4, 0, 0.2)], shade(skin.sail, 0.2));
  poly([W3(-3.2, 0, 0.4), W3(-4.5, 0, 2.1), W3(-4.6, 0, 2.1), W3(-4.5, 0, 0.3)], shade(skin.hull, 0.15));
  // fuselage: two side panels and a top, tapering to the tail
  for (const s of [-1, 1]) poly([W3(3.6, s * 0.55, -0.4), W3(3.6, s * 0.55, 0.5), W3(-4.4, s * 0.12, 0.45), W3(-4.4, s * 0.12, 0.1)], shade(skin.hull, s > 0 ? 0.1 : 0.25));
  poly([W3(3.6, -0.55, 0.5), W3(3.6, 0.55, 0.5), W3(-4.4, 0.12, 0.45), W3(-4.4, -0.12, 0.45)], shade(skin.hull, 0));
  poly([W3(1.8, -0.45, 0.55), W3(1.8, 0.45, 0.55), W3(0.2, 0.35, 1.15), W3(0.2, -0.35, 1.15)], `rgba(${tier >= 4 ? '255,220,140' : '170,200,230'},0.55)`);   // the canopy
  parts.sort((a, b2) => b2.d - a.d);
  for (const q of parts) q.draw();
  // the propeller disc and its blur
  const nose = P(3.8, 0, 0.05);
  if (nose) {
    const r = Math.max(2, 1.4 * nose.s);
    ctx.fillStyle = 'rgba(220,225,235,0.12)'; ctx.beginPath(); ctx.arc(nose.x, nose.y, r, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,34,0.35)'; ctx.lineWidth = Math.max(1, r * 0.12); const a = g.t * 40;
    ctx.beginPath(); ctx.moveTo(nose.x + Math.cos(a) * r, nose.y + Math.sin(a) * r); ctx.lineTo(nose.x - Math.cos(a) * r, nose.y - Math.sin(a) * r); ctx.stroke();
  }
  // nav lights: red to port, green to starboard, a white strobe on the tail; the skin's lamp in the cockpit
  const L = P(0.4, -5.5, 0.4), Rr = P(0.4, 5.5, 0.4), T = P(-4.6, 0, 2.1), C = P(1, 0, 1);
  ctx.globalAlpha = 1;
  if (L) lamp(L.x, L.y, '#ff3a2a', Math.max(1.4, 0.35 * L.s));
  if (Rr) lamp(Rr.x, Rr.y, '#3aff7a', Math.max(1.4, 0.35 * Rr.s));
  if (T && Math.sin(g.t * 7 + (o.bob || 0)) > 0.85) lamp(T.x, T.y, '#ffffff', Math.max(1.5, 0.4 * T.s));
  if (C) lamp(C.x, C.y, opts.lantern || skin.lantern, Math.max(1.5, 0.35 * C.s));
  if (opts.pennant && T) drawPennant(ctx, T.x, T.y, Math.min(40, Math.max(5, 1.3 * T.s)), opts.pennant, g.t + (o.bob || 0));
  shipFxAfter(skin, P, 4.5, 5, 0, 2);
  ctx.restore();
  return T || nose;
}

// the view from the cockpit: canopy frame, the cowling and the prop, and the instrument panel
function drawCockpit(skin) {
  const tier = skinTier(skin);
  // canopy struts
  ctx.strokeStyle = mix(skin.wood, '#000000', 0.45); ctx.lineWidth = Math.max(8, W * 0.012); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.73); ctx.lineTo(W * 0.27, -10); ctx.moveTo(W * 0.94, H * 0.73); ctx.lineTo(W * 0.73, -10); ctx.stroke();
  ctx.lineWidth = Math.max(5, W * 0.007); ctx.beginPath(); ctx.moveTo(W * 0.27, H * 0.02); ctx.quadraticCurveTo(cx, -H * 0.03, W * 0.73, H * 0.02); ctx.stroke();
  ctx.lineCap = 'butt';
  // the propeller: a pale disc with a blade flicking round
  const px = cx, py = H * 0.6, pr = Math.min(W * 0.2, H * 0.2);
  ctx.fillStyle = 'rgba(220,226,236,0.06)'; ctx.beginPath(); ctx.ellipse(px, py, pr, pr * 0.95, 0, 0, 6.28); ctx.fill();
  if (!reduceMotion) {
    ctx.strokeStyle = 'rgba(20,20,24,0.22)'; ctx.lineWidth = pr * 0.12;
    for (const k of [0, Math.PI]) { const a = g.t * 31 + k; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * pr, py + Math.sin(a) * pr * 0.95); ctx.stroke(); }
  }
  // the cowling
  const cg = ctx.createLinearGradient(cx - W * 0.14, 0, cx + W * 0.14, 0);
  cg.addColorStop(0, mix(skin.hull, '#000000', 0.55)); cg.addColorStop(0.5, mix(skin.hull, '#ffffff', 0.12)); cg.addColorStop(1, mix(skin.hull, '#000000', 0.6));
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.moveTo(cx - W * 0.16, H * 0.73); ctx.quadraticCurveTo(cx - W * 0.1, H * 0.615, cx, H * 0.605); ctx.quadraticCurveTo(cx + W * 0.1, H * 0.615, cx + W * 0.16, H * 0.73); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#16161a'; ctx.beginPath(); ctx.arc(px, py, Math.max(4, pr * 0.07), 0, 6.28); ctx.fill();
  if (tier >= 2) { ctx.strokeStyle = skin.sail; ctx.lineWidth = Math.max(2, H * 0.006); ctx.beginPath(); ctx.moveTo(cx - W * 0.12, H * 0.68); ctx.quadraticCurveTo(cx, H * 0.635, cx + W * 0.12, H * 0.68); ctx.stroke(); }
  // the instrument panel
  const pg = ctx.createLinearGradient(0, H * 0.78, 0, H);
  pg.addColorStop(0, mix(skin.deck[0], '#000000', 0.2)); pg.addColorStop(1, mix(skin.deck[1], '#000000', 0.4));
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.moveTo(-5, H + 5); ctx.lineTo(-5, H * 0.74); ctx.quadraticCurveTo(cx, H * 0.67, W + 5, H * 0.74); ctx.lineTo(W + 5, H + 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tier >= 5 ? '#e8c050' : skin.rail; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-5, H * 0.74); ctx.quadraticCurveTo(cx, H * 0.67, W + 5, H * 0.74); ctx.stroke();
  // four gauges: speed, altitude, heading, hull (up on the panel, clear of the buttons below)
  const gr = Math.min(W, H) * 0.042, gy = H * 0.755;
  const gauges = [
    ['KTS', Math.min(1, ship.v / 25)], ['ALT', clamp(ship.z / SKYF.ZMAX, 0, 1)], ['HDG', null], ['HULL', ship.hull / ship.maxHull],
  ];
  gauges.forEach(([label, v], i) => {
    const x = cx + (i - 1.5) * Math.min(W * 0.17, gr * 4.2);
    ctx.fillStyle = '#0b0c10'; ctx.beginPath(); ctx.arc(x, gy, gr, 0, 6.28); ctx.fill();
    ctx.strokeStyle = tier >= 5 ? '#e8c050' : mix(skin.rail, '#000000', 0.2); ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 0.35; lamp(x, gy, skin.lantern && skin.lantern.length === 7 ? skin.lantern : '#ffcf86', gr * 0.35); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(230,230,220,0.35)'; ctx.lineWidth = 1;
    for (let t = 0; t < 8; t++) { const a = -Math.PI * 1.25 + t / 7 * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * gr * 0.78, gy + Math.sin(a) * gr * 0.78); ctx.lineTo(x + Math.cos(a) * gr * 0.92, gy + Math.sin(a) * gr * 0.92); ctx.stroke(); }
    const a = v == null ? -ship.h - Math.PI / 2 : -Math.PI * 1.25 + v * Math.PI * 1.5;
    ctx.strokeStyle = label === 'HULL' && v < 0.4 ? '#ff6a5a' : skin.lantern || '#ffcf86'; ctx.lineWidth = Math.max(1.5, gr * 0.08);
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + Math.cos(a) * gr * 0.75, gy + Math.sin(a) * gr * 0.75); ctx.stroke();
    ctx.fillStyle = 'rgba(220,220,210,0.6)'; ctx.font = `${Math.max(8, gr * 0.28) | 0}px "Courier Prime", monospace`; ctx.textAlign = 'center';
    ctx.fillText(label, x, gy + gr * 0.55);
  });
  // an artificial horizon in the middle of the panel would crowd it; the bank shows in the view itself
}

// the runway lamps where the pier would be, and a strobe leading in
function drawRunway() {
  const HB = SK.HARBOUR;
  for (const sx of [-1, 1]) for (let y = 0; y <= 60; y += 6) {
    const c = cam(HB.x + sx * 16, y, 0.5); if (c.f < SK.NEAR) continue;
    const q = proj(c); lamp(q.x, q.y, sx < 0 ? '#e46c4f' : '#86cfae', Math.max(1.2, 0.5 * Math.sqrt(q.s)));
  }
  const k = Math.floor(g.t * 6) % 8;
  const c = cam(HB.x, 60 + k * 14, 0.6); if (c.f > SK.NEAR) { const q = proj(c); lamp(q.x, q.y, '#ffffff', Math.max(1.5, 0.6 * Math.sqrt(q.s))); }
}

// wind streaks rushing past, quicker the faster you fly
const SKY_STREAKS = []; for (let i = 0; i < 40; i++) SKY_STREAKS.push({ x: Math.random(), y: Math.random(), l: 0.02 + Math.random() * 0.05 });
function drawSkyWeather() {
  const sp = Math.min(1, ship.v / 20);
  ctx.strokeStyle = `rgba(210,220,240,${0.06 + 0.1 * sp})`; ctx.lineWidth = 1; ctx.beginPath();
  for (const s of SKY_STREAKS) {
    s.y += 0.01 + sp * 0.03; if (s.y > 1.1) { s.y = -0.1; s.x = Math.random(); }
    const x = cx + (s.x - 0.5) * W * (0.6 + s.y), y = H * 0.5 + (s.y - 0.5) * H;
    const dx = (x - cx) * s.l * 3, dy = (y - H * 0.5) * s.l * 3;
    ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy);
  }
  ctx.stroke();
  if (g.lightning > 0) { ctx.fillStyle = `rgba(220,230,255,${g.lightning * 0.22})`; ctx.fillRect(0, 0, W, H); }
  return true;
}

// ---------- the sky's own three ----------
const SKY_TRIO = ['thunder', 'petrels', 'squall'];
SPECIAL_TRIOS.sky = SKY_TRIO;
Object.assign(FOE_NAMES, { thunder: 'the Thunderhead', petrels: 'the Petrels', squall: 'the Squall' });
Object.assign(FOE_INTRO, {
  thunder: 'A cloud ahead is flickering from inside: the Thunderhead. When a ring of white light opens round you, get out of it before the bolt comes down.',
  petrels: 'A flock of storm petrels is crossing your course at your height. Climb, dive or turn, or sound the horn (the bell) to scatter them.',
  squall: 'The air is starting to shove. The Squall throws a gust at you from one side and pushes you down: lean into it and climb.',
});
Object.assign(FOE_KINDS, {
  thunder: {
    h: 1, max: 1, every: [16, 24], vis: () => 1,
    spawn() {
      const t = aheadPt(ship.v * 2.4 + rand(-4, 10), rand(-8, 8));
      sfxFoe('rumble', panOf(t), 0.5);
      return { x: t.x, y: t.y, z: ship.z, fuse: 2.4, r: 9, done: false, t: 0 };
    },
    update(f, dt) {
      f.t += dt; f.fuse -= dt; f.z += (ship.z - f.z) * Math.min(1, dt * 2);
      if (!f.done && f.fuse <= 0) {
        f.done = true; g.lightning = Math.max(g.lightning, 1); g.shake = Math.max(g.shake, 0.4);
        sfxFoe('boom', panOf(f), 1); sfxFoe('crack', panOf(f), 1);
        if (Math.hypot(ship.x - f.x, ship.y - f.y) < f.r + 2) foeHit('a lightning bolt');
      }
      if (f.fuse < -0.5) f.dead = true;
    },
    draw(f, q) {
      const k = q.s * f.r;
      if (!f.done) {
        // a ring of white light at your height, tightening to the strike
        const p = 1 - Math.max(0, f.fuse / 2.4), pulse = 0.6 + 0.4 * Math.sin(g.t * 16);
        ctx.strokeStyle = `rgba(220,235,255,${0.5 + 0.4 * pulse})`; ctx.lineWidth = Math.max(1.5, 0.3 * q.s);
        ctx.beginPath(); ctx.ellipse(q.x, q.y, k, k * 0.3, 0, 0, 6.28); ctx.stroke();
        ctx.fillStyle = `rgba(200,220,255,${0.12 + 0.2 * p})`; ctx.beginPath(); ctx.ellipse(q.x, q.y, k * p, k * 0.3 * p, 0, 0, 6.28); ctx.fill();
      } else {
        // the bolt, top of the screen down through the ring
        ctx.strokeStyle = 'rgba(235,242,255,0.95)'; ctx.lineWidth = Math.max(2, 0.25 * q.s); ctx.beginPath();
        let x = q.x + rand(-20, 20), y = -10; ctx.moveTo(x, y);
        while (y < q.y) { y += rand(15, 40); x += rand(-14, 14); ctx.lineTo(x, Math.min(y, q.y)); }
        ctx.stroke();
      }
    },
  },
  petrels: {
    h: 1, max: 1, every: [18, 26], fly: true, vis: () => 0.9,
    spawn() {
      // timed so the flock crosses your course just as you reach it
      const side = Math.random() < 0.5 ? -1 : 1, p = aheadPt(ship.v * (70 / 13) + rand(-6, 6), side * 70), fx = Math.cos(ship.h) * -side, fy = -Math.sin(ship.h) * -side;
      const birds = []; for (let i = 0; i < 14; i++) birds.push({ dx: rand(-7, 7), dy: rand(-7, 7), dz: rand(-3, 3), ph: rand(0, 6) });
      return { x: p.x, y: p.y, z: ship.z + rand(-3, 3), vx: fx * 13, vy: fy * 13, birds, life: 14, hit: false, scatter: 0 };
    },
    update(f, dt) {
      f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.scatter > 0) { f.scatter += dt; f.z += 12 * dt; if (f.scatter > 2) f.dead = true; return; }
      const d = Math.hypot(f.x - ship.x, f.y - ship.y, (f.z - ship.z) * 1.3);
      if (!f.hit && d < 8) { f.hit = true; foeHit('a birdstrike'); sfxFoe('caw', 0, 1); f.scatter = 0.01; }
      if (Math.random() < dt * 0.6 && d < 200) sfxFoe('caw', panOf(f), 0.3);
      if (f.life <= 0) f.dead = true;
    },
    bell(f) { if (f.scatter <= 0 && dist(f) < 160) { f.scatter = 0.01; return 'The horn scattered the petrels.'; } },
    draw(f, q, vis) {
      ctx.strokeStyle = `rgba(20,22,30,${0.9 * vis})`; ctx.lineWidth = Math.max(1, 0.18 * q.s);
      const spread = 1 + f.scatter * 3;
      ctx.beginPath();
      for (const b of f.birds) {
        const x = q.x + b.dx * spread * q.s, y = q.y - b.dz * spread * q.s + b.dy * 0.3 * q.s, w = Math.max(2, 0.9 * q.s), fl = Math.sin(g.t * 14 + b.ph) * w * 0.5;
        ctx.moveTo(x - w, y - fl); ctx.lineTo(x, y); ctx.lineTo(x + w, y - fl);
      }
      ctx.stroke();
    },
  },
  squall: {
    h: 1, max: 1, every: [20, 30], vis: () => 0,
    spawn() {
      const side = Math.random() < 0.5 ? -1 : 1, p = aheadPt(30, side * 40);
      sfxFoe('whoosh', side, 0.8);
      addLog('Gust coming from ' + (side < 0 ? 'port' : 'starboard') + '! Lean into it and climb.', 'w');
      return { x: p.x, y: p.y, z: ship.z, side, warn: 1.8, push: 3.2, ph: 0 };
    },
    update(f, dt) {
      f.ph += dt;
      const p = aheadPt(30, f.side * 40); f.x = p.x; f.y = p.y; f.z = ship.z;
      if (f.warn > 0) { f.warn -= dt; return; }
      f.push -= dt;
      // shoves you sideways (away from where it came from) and down
      const rx = Math.cos(ship.h), ry = -Math.sin(ship.h);
      ship.x -= rx * f.side * 6 * dt; ship.y -= ry * f.side * 6 * dt; ship.z -= 3 * dt;
      g.shake = Math.max(g.shake, 0.12);
      if (Math.random() < dt * 2) sfxFoe('whoosh', f.side, 0.4);
      if (f.push <= 0) f.dead = true;
    },
    draw() {},
  },
});
// the squall's streaks across the screen (drawn over everything, from the side the gust comes from)
function drawSquall() {
  if (!g.foes || !g.foes.squall) return;
  for (const f of g.foes.squall.list) {
    if (f.dead) continue;
    const a = f.warn > 0 ? 0.25 * (1 - f.warn / 1.8) : 0.45;
    ctx.strokeStyle = `rgba(220,230,250,${a})`; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const y = H * (0.15 + ((i * 0.37 + f.ph * 0.6) % 0.7)), k = ((f.ph * 1.8 + i * 0.13) % 1);
      const x = f.side < 0 ? k * W : W - k * W, L = W * 0.12 * (0.5 + (i % 3) * 0.3);
      ctx.moveTo(x, y); ctx.lineTo(x - f.side * L, y + L * 0.12);
    }
    ctx.stroke();
  }
}

// the engine's drone while you're flying
function skyHum(on) {
  if (!AUD.ctx) return;
  if (on && !AUD.engine) {
    const c = AUD.ctx, gn = c.createGain(); gn.gain.value = 0;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter();
    o1.type = 'sawtooth'; o1.frequency.value = 72; o2.type = 'square'; o2.frequency.value = 36;
    f.type = 'lowpass'; f.frequency.value = 500;
    o1.connect(f); o2.connect(f); f.connect(gn).connect(AUD.master);
    o1.start(); o2.start();
    gn.gain.setTargetAtTime(0.03, c.currentTime, 0.6);
    AUD.engine = { gn, o1, o2 };
  } else if (!on && AUD.engine) {
    const h = AUD.engine; AUD.engine = null;
    h.gn.gain.setTargetAtTime(0, AUD.ctx.currentTime, 0.2);
    setTimeout(() => { try { h.o1.stop(); h.o2.stop(); } catch (e) {} }, 1200);
  } else if (on && AUD.engine && ship) {
    AUD.engine.o1.frequency.setTargetAtTime(60 + ship.v * 2 - (ship.pitch || 0) * 20, AUD.ctx.currentTime, 0.2);
  }
}

// remember which clouds you've seen, by their own light (like rocks fading after the beam passes)
function rememberClouds() {
  for (const o of g.rocks) {
    const v = cloudVis(o);
    if (v > 0.3 && (o.seenT == null || v >= afterglow(o))) { o.seenT = g.t; o.seenV = Math.min(1, v); }
  }
}
