// The Places In Between: its own three, and nothing else out there (no pool, no Maren, Drowned, Knock or Verity).
//   The Doors   a row of doors across your course. The dark ones put you back where you've already been;
//               the lit one lets you through further on. The gaps between are open water.
//   The Echo    a pale copy of your own ship sailing straight at you, steering the mirror of how you steer,
//               a moment late. Turn late and hard, or ring the bell and it breaks like glass.
//   The Sleeper a vast face under the glass ahead of you. When the water brightens it is waking: ring the
//               bell to settle it. If its eyes open, everything slows to a crawl and a plank goes.

const BETWEEN_TRIO = ['doors', 'echo', 'sleeper'];
const SPECIAL_TRIOS = { nether: NETHER_TRIO, odyssey: ODYSSEY_TRIO, between: BETWEEN_TRIO };
Object.assign(FOE_NAMES, { doors: 'the Doors', echo: 'the Echo', sleeper: 'the Sleeper' });
Object.assign(FOE_INTRO, {
  doors: 'A row of doors is standing in the water across your course. The dark ones lead back to where you’ve already been. Go through the lit one, or round them all.',
  echo: 'A pale ship is coming straight at you. It is yours: it steers the mirror of how you steer, a moment late. Turn late and hard, or ring the bell to break it.',
  sleeper: 'There is a face under the water ahead, as big as a harbour, asleep. When the water over it brightens it is waking: ring the bell to settle it.',
});

const doorRight = f => ({ x: Math.cos(f.h), y: -Math.sin(f.h) });
const doorFwd = f => ({ x: Math.sin(f.h), y: Math.cos(f.h) });

// move the ship along its heading by d metres (back if negative), clear of rocks and the shore
function shiftShip(d) {
  const fx = Math.sin(ship.h), fy = Math.cos(ship.h);
  for (const lat of [0, 25, -25, 50, -50]) {
    const x = ship.x + fx * d + fy * lat, y = Math.max(60, ship.y + fy * d - fx * lat);
    if (!g.rocks.some(r => !r.gone && Math.hypot(r.x - x, r.y - y) < r.r + 12)) { ship.x = x; ship.y = y; return true; }
  }
  return false;
}

Object.assign(FOE_KINDS, {
  doors: {
    h: 10, max: 1, every: [18, 26], vis: () => 0.95,
    spawn() {
      const c = aheadPt(rand(150, 190), rand(-10, 10)), f = { x: c.x, y: c.y, h: ship.h, life: 50, prev: null, used: false };
      const r = doorRight(f), lit = Math.floor(rand(0, 4));
      f.doors = [-27, -9, 9, 27].map((lat, i) => ({ lat, lit: i === lit, open: 0 }));
      for (const d of f.doors) {
        const x = f.x + r.x * d.lat, y = f.y + r.y * d.lat;
        if (!okWater({ x, y }) || g.rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + 8)) return null;
      }
      sfxFoe('door', panOf(f), 0.5);
      return f;
    },
    update(f, dt) {
      f.life -= dt;
      const fw = doorFwd(f), r = doorRight(f), rx = ship.x - f.x, ry = ship.y - f.y;
      const along = rx * fw.x + ry * fw.y, lat = rx * r.x + ry * r.y;
      for (const d of f.doors) {
        const near = Math.abs(along) < 45 && Math.abs(lat - d.lat) < 14;
        const was = d.open; d.open = clamp(d.open + (near ? dt : -dt) * 1.2, 0, 1);
        if (was === 0 && d.open > 0) sfxFoe('door', panOf(f), 0.6);
      }
      if (!f.used && f.prev != null && f.prev < 0 && along >= 0) {
        const d = f.doors.find(d => Math.abs(lat - d.lat) < 4);
        if (d) {
          f.used = true;
          g.flash = Math.max(g.flash, 0.5); sfxFoe('door', 0, 1);
          if (d.lit) { shiftShip(110); addLog('The lit door opened onto open water further on.', 'p'); }
          else { shiftShip(-170); addLog('Through the dark door, and you’re back somewhere you’ve already sailed.', 'w'); }
        }
      }
      f.prev = along;
      if (along > 80 || f.life <= 0) f.dead = true;
    },
    draw(f, q, vis) {
      const r = doorRight(f), fw = doorFwd(f), W2 = 3.2, H2 = 10, T = 0.7;
      // draw the doors far to near across your view
      const list = f.doors.map(d => ({ d, x: f.x + r.x * d.lat, y: f.y + r.y * d.lat })).map(o => Object.assign(o, { c: cam(o.x, o.y, 0) })).filter(o => o.c.f > SK.NEAR).sort((a, b) => b.c.f - a.c.f);
      ctx.globalAlpha = vis;
      for (const { d, x, y } of list) {
        const P = (u, z, v) => [x + r.x * u + fw.x * (v || 0), y + r.y * u + fw.y * (v || 0), z];
        // the opening: black, or warm light
        fillPoly([P(-W2, 0), P(W2, 0), P(W2, H2), P(-W2, H2)], d.open > 0.05 ? (d.lit ? 'rgba(255,214,160,0.95)' : '#07050a') : '#2a2430');
        // the door itself, swinging open on its left hinge (towards you)
        const a = d.open * 1.35, ex = Math.cos(a) * W2 * 2, ev = -Math.sin(a) * W2 * 2;
        fillPoly([P(-W2, 0), P(-W2 + ex, 0, ev), P(-W2 + ex, H2, ev), P(-W2, H2)], d.lit ? '#6a5a4c' : '#3c3444');
        // the frame
        fillPoly([P(-W2 - T, 0), P(-W2, 0), P(-W2, H2 + T), P(-W2 - T, H2 + T)], '#d8d0d8');
        fillPoly([P(W2, 0), P(W2 + T, 0), P(W2 + T, H2 + T), P(W2, H2 + T)], '#c0b8c4');
        fillPoly([P(-W2 - T, H2), P(W2 + T, H2), P(W2 + T, H2 + T), P(-W2 - T, H2 + T)], '#e8e0e8');
        if (d.lit) { const c = cam(x, y, H2 * 0.5); if (c.f > SK.NEAR) { const p = proj(c); ctx.globalCompositeOperation = 'lighter'; lamp(p.x, p.y, '#ffd6a0', Math.max(3, 2.5 * p.s)); ctx.globalCompositeOperation = 'source-over'; } }
      }
      ctx.globalAlpha = 1;
    },
  },

  echo: {
    h: 8, max: 1, every: [20, 30], vis: () => 0.85,
    spawn() {
      const p = aheadPt(rand(220, 260), rand(-12, 12));
      if (!okWater(p)) return null;
      sfxFoe('hum', panOf(p), 0.6);
      return { x: p.x, y: p.y, h: ship.h + Math.PI, v: 8, bob: 0, rudder: 0, sail: 1, hist: [], t: 0, fade: 0, life: 40 };
    },
    update(f, dt) {
      f.t += dt; f.life -= dt; f.bob += dt * 2;
      if (f.fade > 0) { f.fade -= dt; if (f.fade <= 0) f.dead = true; return; }
      // steer the mirror of your helm, half a second late
      f.hist.push({ t: f.t, r: ship.rudder });
      while (f.hist.length > 2 && f.hist[1].t < f.t - 0.55) f.hist.shift();
      f.rudder = -f.hist[0].r;
      f.h += f.rudder * 0.55 * dt * 0.9;
      f.v = Math.max(7, ship.v * 0.8 + 5);
      f.x += Math.sin(f.h) * f.v * dt; f.y += Math.cos(f.h) * f.v * dt;
      const d = dist(f);
      if (d < 9) { foeHit('the Echo'); sfxFoe('shatter', 0, 1); f.fade = 0.8; addLog('Your echo ran into you and broke apart.', 'w'); return; }
      const fw = fwd(), along = (f.x - ship.x) * fw.x + (f.y - ship.y) * fw.y;
      if (along < -40 || f.life <= 0 || (!g.backrooms && f.y < 45)) f.fade = 0.8;
    },
    bell(f) { if (f.fade <= 0 && dist(f) < 280) { f.fade = 0.8; sfxFoe('shatter', panOf(f), 1); return 'The bell rang and the pale ship shattered like a mirror.'; } },
    draw(f, q, vis) {
      const a = (f.fade > 0 ? f.fade / 0.8 : 1) * 0.6 * vis;
      ctx.save(); ctx.filter = 'grayscale(1) brightness(1.7)';
      drawShip3D(f, ship.skin || mySkin(), BOAT_BY_ID[ship.boat] || BOATS[0], 1, { alpha: a, sailAlpha: a, minLit: 1, brace: 0.5 });
      ctx.restore();
    },
  },

  sleeper: {
    h: 1, max: 1, every: [18, 26], vis: () => 1,
    spawn() { const p = aheadPt(60, 0); return { x: p.x, y: p.y, ph: 0, sleep: rand(6, 9), stir: 0, open: 0, fadeIn: 0, life: 70, told: false }; },
    update(f, dt) {
      f.ph += dt; f.life -= dt; f.fadeIn = Math.min(1, f.fadeIn + dt / 3);
      // it stays out ahead of you, under the glass
      const p = aheadPt(60, Math.sin(f.ph * 0.2) * 12);
      f.x += (p.x - f.x) * Math.min(1, dt * 0.5); f.y += (p.y - f.y) * Math.min(1, dt * 0.5);
      if (f.open > 0) {
        f.open -= dt;
        g.mods.slow = Math.min(g.mods.slow, 0.3); g.mods.cap = Math.min(g.mods.cap, 5); g.mods.lantern = Math.min(g.mods.lantern, 0.5);
        if (f.open <= 0) f.sleep = rand(12, 18);
      } else if (f.stir > 0) {
        f.stir -= dt;
        if (f.stir <= 0) { f.open = 5; foeHit('the Sleeper'); sfxFoe('hum', 0, 1); addLog('Its eyes opened. Everything has slowed to a crawl.', 'w'); }
      } else {
        f.sleep -= dt;
        if (f.sleep <= 0) { f.stir = 3.5; sfxFoe('hum', 0, 0.8); if (!f.told) { f.told = true; addLog('The water over the face is brightening. It’s waking. Ring the bell!', 'w'); } }
        if (f.life <= 0) f.dead = true;
      }
    },
    bell(f) {
      if (f.stir > 0) { f.stir = 0; f.sleep = rand(12, 18); return 'The bell rang out over the glass and the Sleeper settled again.'; }
      if (f.open <= 0) f.sleep = Math.max(f.sleep, rand(8, 12));
    },
    draw(f) {
      const k = f.stir > 0 ? 1 - f.stir / 3.5 : f.open > 0 ? 1 : 0;
      const base = (0.12 + 0.18 * k) * f.fadeIn * (f.life < 3 ? Math.max(0, f.life / 3) : 1);
      const fw = fwd(), rt = { x: fw.y, y: -fw.x };
      // a point on the face: u across (right), v along (away from you)
      const P = (u, v) => { const c = cam(f.x + rt.x * u + fw.x * v, f.y + rt.y * u + fw.y * v, -0.3); return c.f > SK.NEAR ? proj(c) : null; };
      const loop = (fn, n, close) => { ctx.beginPath(); let ok = false; for (let i = 0; i <= n; i++) { const p = fn(i / n); if (!p) { ok = false; continue; } ok ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); ok = true; } if (close) ctx.closePath(); };
      ctx.save();
      // the glow of it under the water, brighter as it wakes
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(235,225,245,${base * 0.6})`; loop(t => P(Math.cos(t * 6.28) * 26, Math.sin(t * 6.28) * 34), 36, true); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = `rgba(245,238,250,${Math.min(0.9, base * 3.2)})`; ctx.lineWidth = 2;
      loop(t => P(Math.cos(t * 6.28) * 26, Math.sin(t * 6.28) * 34), 36, true); ctx.stroke();
      // the eyes: shut lines, a flutter, or open and pale
      const open = f.open > 0 ? 1 : f.stir > 0 ? Math.max(0, Math.sin(f.ph * 9)) * 0.35 * k : 0;
      for (const sx of [-1, 1]) {
        const ex = sx * 9, ev = 10;
        if (open > 0.05) {
          ctx.fillStyle = `rgba(250,248,255,${0.35 + 0.5 * open})`; loop(t => P(ex + Math.cos(t * 6.28) * 5, ev + Math.sin(t * 6.28) * 3.2 * open), 20, true); ctx.fill();
          ctx.fillStyle = `rgba(30,20,40,${0.8 * open})`; loop(t => P(ex + Math.cos(t * 6.28) * 1.6, ev + Math.sin(t * 6.28) * 1.6 * open), 12, true); ctx.fill();
        } else { loop(t => P(ex - 5 + t * 10, ev - Math.sin(t * Math.PI) * 1.2), 10); ctx.stroke(); }
      }
      // nose and a calm mouth
      loop(t => P(Math.sin(t * Math.PI) * 1.5, 2 - t * 6), 8); ctx.stroke();
      loop(t => P(-7 + t * 14, -14 + Math.sin(t * Math.PI) * (f.open > 0 ? -2 : 1)), 12); ctx.stroke();
      ctx.restore();
    },
  },
});

// while the Sleeper's eyes are open the world goes pale
function drawBetweenOverlays() {
  if (!g.foes || !g.foes.sleeper) return;
  const f = g.foes.sleeper.list.find(o => o.open > 0); if (!f) return;
  const a = Math.min(1, f.open / 1.5, (5 - f.open) / 0.6) * 0.35;
  ctx.fillStyle = `rgba(230,220,240,${a})`; ctx.fillRect(0, 0, W, H);
}
