// The Nether's own enemies. On a Nether voyage these three are the only ones out there:
// no pool draw, no Maren, no Drowned, no Knock, no Verity. All three are drawn in code.

const NETHER_TRIO = ['cinderkite', 'slagwader', 'furnacemoth'];
Object.assign(FOE_NAMES, { cinderkite: 'The Cinder Kite', slagwader: 'The Slag Wader', furnacemoth: 'The Furnace Moth' });
Object.assign(FOE_INTRO, {
  cinderkite: 'Something like a burning sail is gliding high over the lava. When it spits fire, an orange ring marks where it lands: get out of it. A flare drives it off.',
  slagwader: 'A hunched shape of black slag is rising out of the lava ahead and wading towards you. Don’t let it reach the bow: ring the bell to cool it and sink it.',
  furnacemoth: 'A moth the size of a sail, wings like hot coals, is coming for your lantern. If it lands, it smothers the light and then sets you alight. Fire a flare and it will chase that instead.',
});

const netherGlowVis = o => Math.max(0.8, foeVis(o));

Object.assign(FOE_KINDS, {
  // glides in wide circles high overhead and spits fireballs at where you're going
  cinderkite: {
    h: 10, max: 1, every: [24, 34], fly: true, vis: netherGlowVis,
    spawn() {
      const p = aheadPt(rand(200, 260), (Math.random() < 0.5 ? -1 : 1) * rand(40, 90));
      return { x: p.x, y: p.y, z: 42, a: bearingOf(p.x - ship.x, p.y - ship.y), ph: rand(0, 6), shotT: rand(5, 7), life: 32, flee: 0 };
    },
    update(f, dt) {
      f.ph += dt; f.life -= dt;
      if (f.life < 0 && f.flee <= 0) f.flee = 3;
      if (f.flee > 0) {
        // climbing away from the flare's glare
        f.flee -= dt; f.z += 18 * dt;
        const b = bearingOf(f.x - ship.x, f.y - ship.y); f.x += Math.sin(b) * 40 * dt; f.y += Math.cos(b) * 40 * dt;
        if (f.flee <= 0) f.dead = true;
        return;
      }
      // circle the ship, a little ahead of it
      f.a += dt * 0.25;
      const c = aheadPt(60, 0), R = 110, tx = c.x + Math.sin(f.a) * R, ty = c.y + Math.cos(f.a) * R;
      f.x += (tx - f.x) * Math.min(1, dt * 0.8); f.y += (ty - f.y) * Math.min(1, dt * 0.8);
      if (!g.backrooms) f.y = Math.max(50, f.y);
      f.shotT -= dt;
      if (f.shotT <= 0 && dist(f) < 260) {
        f.shotT = rand(7.5, 10) * Math.max(0.75, 1 - (g.n - 2) * 0.03);
        const dur = 2.8, p = aheadPt(ship.v * dur + rand(-4, 8), rand(-6, 6));
        if (!g.backrooms) p.y = Math.max(46, p.y);
        hazard({ kind: 'fireball', x: f.x, y: f.y, z: f.z, x0: f.x, y0: f.y, z0: f.z, x1: p.x, y1: p.y, fuse: dur, dur, r: 9 });
        hazard({ kind: 'scorch', x: p.x, y: p.y, r: 9, life: dur });
        sfxFoe('roar', panOf(f), 0.8);
      }
      if (Math.random() < dt * 0.25) sfxFoe('flap', panOf(f), 0.4);
      if (f.life <= 0) f.dead = true;
    },
    flare(f, x, y) { if (f.flee <= 0 && Math.hypot(f.x - x, f.y - y) < SK.FLARE_RADIUS * 1.6) { f.flee = 4; return 'The Cinder Kite shied away from the flare and climbed off into the smoke.'; } },
    draw(f, q, vis) {
      const s = q.s, L = 11 * s, flap = Math.sin(f.ph * 2.2) * 0.3;
      ctx.save(); ctx.globalAlpha = vis; ctx.translate(q.x, q.y);
      ctx.rotate(Math.sin(f.ph * 0.7) * 0.12);
      const edge = [];
      edge.push([0, -3.2 * s], [L * 0.55, -1.2 * s + flap * L * 0.2], [L, flap * L * 0.45]);
      // ragged trailing edge, tip to tail and back out to the other tip
      for (let i = 1; i <= 6; i++) { const k = i / 6, x = L * (1 - k), y = flap * L * 0.45 * (1 - k) + 4.5 * s * k + (i % 2 ? 1.4 : -0.3) * s * (0.5 + 0.5 * Math.sin(f.ph * 5 + i)); edge.push([x, y]); }
      for (let i = 5; i >= 1; i--) { const k = i / 6, x = -L * (1 - k), y = flap * L * 0.45 * (1 - k) + 4.5 * s * k + (i % 2 ? 1.4 : -0.3) * s * (0.5 + 0.5 * Math.sin(f.ph * 5 + i + 2)); edge.push([x, y]); }
      edge.push([-L, flap * L * 0.45], [-L * 0.55, -1.2 * s + flap * L * 0.2]);
      const path = () => { ctx.beginPath(); edge.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
      const gr = ctx.createLinearGradient(0, -3 * s, 0, 5 * s);
      gr.addColorStop(0, '#2c1612'); gr.addColorStop(1, '#120807');
      ctx.fillStyle = gr; path(); ctx.fill();
      // smouldering edges
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,${110 + 40 * Math.sin(f.ph * 4) | 0},40,0.85)`; ctx.lineWidth = Math.max(1, 0.35 * s); path(); ctx.stroke();
      // the hot hollow in its middle
      lamp(0, 0.5 * s, '#ff7a2a', Math.max(2, 0.9 * s));
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(0, 0.5 * s, Math.max(1, 0.5 * s), 0, 6.28); ctx.fill();
      ctx.fillStyle = '#1a0a08'; ctx.beginPath(); ctx.arc(0, 0.5 * s, Math.max(0.5, 0.25 * s), 0, 6.28); ctx.fill();
      // two long streamers trailing behind
      ctx.strokeStyle = 'rgba(40,20,16,0.9)'; ctx.lineWidth = Math.max(1, 0.25 * s);
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 1.2 * s, 4 * s); ctx.quadraticCurveTo(sd * (2 + Math.sin(f.ph * 3) * 1.5) * s, 9 * s, sd * (1 + Math.sin(f.ph * 2 + sd) * 2) * s, 13 * s); ctx.stroke(); }
      // embers dripping off it
      ctx.fillStyle = '#ffa040';
      for (let i = 0; i < 6; i++) { const k = (f.ph * 0.6 + i / 6) % 1; ctx.globalAlpha = vis * (1 - k); ctx.fillRect((Math.sin(i * 2.3) * L * 0.7), 3 * s + k * 14 * s, Math.max(1, 0.3 * s), Math.max(1, 0.3 * s)); }
      ctx.restore(); ctx.globalAlpha = 1;
    },
  },

  // rises out of the lava ahead and wades at you; if it reaches the bow it holds on and burns.
  // The bell cools it and it sinks back.
  slagwader: {
    h: 8, max: 1, every: [22, 32], vis: netherGlowVis,
    spawn() {
      const p = aheadPt(rand(120, 170), rand(-30, 30));
      if (!okWater(p) || g.rocks.some(r => Math.hypot(r.x - p.x, r.y - p.y) < r.r + 8)) return null;
      sfxFoe('groan', panOf(p), 0.8);
      return { x: p.x, y: p.y, rise: 0, ph: rand(0, 6), hold: 0, sink: 0, life: 40, cd: 0 };
    },
    update(f, dt) {
      f.ph += dt; f.life -= dt; if (f.cd > 0) f.cd -= dt;
      if (f.sink > 0) { f.sink -= dt; f.rise = Math.max(0, f.rise - dt * 0.6); if (f.sink <= 0 || f.rise <= 0) f.dead = true; return; }
      f.rise = Math.min(1, f.rise + dt * 0.5);
      const d = dist(f);
      if (f.hold > 0) {
        // clinging to the bow: dragging you down and scorching the planks
        f.hold -= dt; g.mods.slow = Math.min(g.mods.slow, 0.45);
        const p = aheadPt(5, 0); f.x = p.x; f.y = p.y;
        if (f.hold <= 0) { foeHit('the Slag Wader'); sfxFoe('grunt', 0, 1); throwBack(f, 70); f.cd = 4; }
        return;
      }
      if (f.rise > 0.6) {
        const sp = 2.4 + g.n * 0.12, b = bearingOf(ship.x - f.x, ship.y - f.y);
        f.x += Math.sin(b) * sp * dt; f.y += Math.cos(b) * sp * dt;
        if (Math.random() < dt * 0.2) sfxFoe('groan', panOf(f), Math.max(0.2, 1 - d / 200) * 0.6);
      }
      if (d < 6 && f.cd <= 0 && f.rise > 0.6) { f.hold = 4.5; sfxFoe('grunt', 0, 1); g.shake = Math.max(g.shake, 0.4); addLog('The Slag Wader has the bow! Ring the bell!', 'w'); }
      if (f.life <= 0) f.sink = 3;
    },
    bell(f) { if (f.sink <= 0 && dist(f) < 140) { f.sink = 3; f.hold = 0; return 'The bell rang out and the Slag Wader cooled, cracked and sank back into the lava.'; } },
    draw(f, q, vis) {
      const s = q.s, H = 8 * s, up = f.rise;
      const walk = f.rise > 0.6 && f.sink <= 0 ? Math.sin(f.ph * 3) : 0;
      ctx.save(); ctx.globalAlpha = vis; ctx.translate(q.x, q.y);
      // the lava boiling round its legs
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,110,30,0.45)'; ctx.beginPath(); ctx.ellipse(0, 0, 3.6 * s, 0.8 * s, 0, 0, 6.28); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.rect(-8 * s, -H * 1.3, 16 * s, H * 1.3); ctx.clip();   // nothing below the surface
      ctx.translate(0, (1 - up) * H);
      ctx.rotate(walk * 0.05);
      const body = [[-1.6, 0], [-2.2, -3], [-2.6, -5.6], [-1.8, -6.8], [-0.6, -7.2], [0.2, -8], [1.2, -7.8], [1.6, -7], [2.6, -6.2], [2.4, -3.2], [1.6, 0]];
      const gr = ctx.createLinearGradient(-2.6 * s, 0, 2.6 * s, 0);
      gr.addColorStop(0, '#1c1312'); gr.addColorStop(0.5, '#2e1e1b'); gr.addColorStop(1, '#120c0b');
      ctx.fillStyle = gr; ctx.beginPath(); body.forEach((p, i) => i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s)); ctx.closePath(); ctx.fill();
      // long arms hanging down into the lava
      ctx.strokeStyle = '#1a1110'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, 0.9 * s);
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 2.3 * s, -6 * s); ctx.quadraticCurveTo(sd * 3.6 * s, -3.5 * s, sd * (3.2 + walk * sd * 0.4) * s, -0.4 * s); ctx.stroke(); }
      // glowing cracks, and one hot slit for a face
      ctx.globalCompositeOperation = 'lighter';
      const glow = f.sink > 0 ? Math.max(0, f.sink / 3) : 0.7 + 0.3 * Math.sin(f.ph * 2.5);
      ctx.strokeStyle = `rgba(255,120,30,${0.8 * glow})`; ctx.lineWidth = Math.max(0.8, 0.22 * s);
      ctx.beginPath();
      ctx.moveTo(-1.2 * s, -1 * s); ctx.lineTo(-0.6 * s, -3 * s); ctx.lineTo(-1.1 * s, -4.6 * s); ctx.lineTo(-0.4 * s, -6.2 * s);
      ctx.moveTo(1.2 * s, -0.6 * s); ctx.lineTo(0.7 * s, -2.4 * s); ctx.lineTo(1.5 * s, -4 * s);
      ctx.moveTo(-0.2 * s, -4 * s); ctx.lineTo(0.6 * s, -5.2 * s);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,230,140,${glow})`; ctx.fillRect(-0.2 * s, -7.3 * s, 1.3 * s, Math.max(1, 0.25 * s));
      lamp(0.45 * s, -7.2 * s, '#ff8a30', Math.max(1, 0.5 * s) * glow);
      ctx.restore(); ctx.globalAlpha = 1;
    },
  },

  // flutters in towards your lantern; if it lands, the light goes dim and then the deck catches.
  // A flare is brighter than your lantern: it chases that and burns up in it.
  furnacemoth: {
    h: 6, max: 1, every: [26, 38], fly: true, vis: netherGlowVis,
    spawn() {
      const p = aheadPt(rand(90, 140), (Math.random() < 0.5 ? -1 : 1) * rand(60, 110));
      return { x: p.x, y: p.y, z: 9, ph: rand(0, 6), on: false, t: 0, warned: false, chase: null, life: 50 };
    },
    update(f, dt) {
      f.ph += dt; f.life -= dt;
      if (f.chase) {
        const c = f.chase, d = Math.hypot(c.x - f.x, c.y - f.y);
        const b = bearingOf(c.x - f.x, c.y - f.y); f.x += Math.sin(b) * 30 * dt; f.y += Math.cos(b) * 30 * dt; f.z += (40 - f.z) * dt * 0.8;
        c.t -= dt;
        if (d < 6 || c.t <= 0) { burst(f.x, f.y, ['#ffb040', '#ff6a2a', '#fff0b0'], 40, 14, f.z); sfxFoe('crack', panOf(f), 0.7); f.dead = true; }
        return;
      }
      if (f.on) {
        // smothering the lantern
        g.mods.lantern = Math.min(g.mods.lantern, 0.35);
        f.x = ship.x; f.y = ship.y; f.z = 6; f.t += dt;
        if (f.t > 3.5 && !f.warned) { f.warned = true; addLog('The Furnace Moth is smothering your lantern and the planks are smoking. Fire a flare!', 'w'); }
        if (f.t > 10) { foeHit('the Furnace Moth'); f.on = false; f.t = 0; f.warned = false; throwBack(f, 120); f.z = 12; }
        if (Math.random() < dt * 0.8) sfxFoe('flap', 0, 0.5);
        return;
      }
      // fluttering in, weaving
      const d = dist(f), b = bearingOf(ship.x - f.x, ship.y - f.y) + Math.sin(f.ph * 1.3) * 0.6, sp = 7 + g.n * 0.2 + Math.max(0, ship.v - 9) * 0.7;
      f.x += Math.sin(b) * sp * dt; f.y += Math.cos(b) * sp * dt; f.z = 8 + Math.sin(f.ph * 2) * 2;
      if (Math.random() < dt * 0.3 && d < 120) sfxFoe('flap', panOf(f), 0.5);
      if (d < 5) { f.on = true; f.t = 0; sfxFoe('flap', 0, 1); addLog('The Furnace Moth landed on your lantern. The light is going.', 'w'); }
      if (f.life <= 0 && !f.on) f.dead = true;
    },
    flare(f, x, y) { if (!f.chase && (f.on || Math.hypot(f.x - x, f.y - y) < SK.FLARE_RADIUS * 2)) { f.on = false; f.chase = { x, y, t: 5 }; return 'The Furnace Moth let go of the lantern and went for the flare.'; } },
    draw(f, q, vis) { drawMoth(f, q.x, q.y, q.s, vis); },
  },
});

function drawMoth(f, x, y, s, vis) {
  const open = 0.35 + 0.65 * Math.abs(Math.cos(f.ph * 9));
  ctx.save(); ctx.globalAlpha = vis; ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter';
  lamp(0, 0, '#ff8a2a', Math.max(2, 1.4 * s));
  ctx.globalCompositeOperation = 'source-over';
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(sd * open, 1);
    // forewing
    const fw = ctx.createRadialGradient(1.6 * s, -1.2 * s, 0, 1.6 * s, -1.2 * s, 3 * s);
    fw.addColorStop(0, '#ffc860'); fw.addColorStop(0.45, '#d0461a'); fw.addColorStop(1, '#3a0c06');
    ctx.fillStyle = fw;
    ctx.beginPath(); ctx.moveTo(0.2 * s, -0.6 * s); ctx.quadraticCurveTo(2 * s, -3.6 * s, 3.8 * s, -2.6 * s); ctx.quadraticCurveTo(3.4 * s, -0.4 * s, 0.3 * s, 0.4 * s); ctx.closePath(); ctx.fill();
    // hindwing
    const hw = ctx.createRadialGradient(1.2 * s, 1 * s, 0, 1.2 * s, 1 * s, 2.2 * s);
    hw.addColorStop(0, '#ff9a40'); hw.addColorStop(1, '#2e0a06');
    ctx.fillStyle = hw;
    ctx.beginPath(); ctx.moveTo(0.3 * s, 0.2 * s); ctx.quadraticCurveTo(2.8 * s, 0.4 * s, 2.2 * s, 2.4 * s); ctx.quadraticCurveTo(1 * s, 2.6 * s, 0.2 * s, 1 * s); ctx.closePath(); ctx.fill();
    // a dark eye on each forewing, with a hot ring
    ctx.fillStyle = '#1a0806'; ctx.beginPath(); ctx.arc(2.1 * s, -1.6 * s, 0.5 * s, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,120,0.8)'; ctx.lineWidth = Math.max(0.5, 0.12 * s); ctx.stroke();
    ctx.restore();
  }
  // furry body and feathery antennae
  ctx.fillStyle = '#2a1410'; ctx.beginPath(); ctx.ellipse(0, 0.3 * s, 0.45 * s, 1.6 * s, 0, 0, 6.28); ctx.fill();
  ctx.strokeStyle = '#3a1c14'; ctx.lineWidth = Math.max(0.6, 0.12 * s);
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -1.2 * s); ctx.quadraticCurveTo(sd * 0.6 * s, -2.4 * s, sd * 1.3 * s, -2.8 * s); ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}

// when it's on your lantern in first person, it's right there on the deck in front of you
function drawMothOnLantern() {
  if (VIEW.third || !g.foes || !g.foes.furnacemoth) return;
  const f = g.foes.furnacemoth.list.find(o => o.on && !o.dead); if (!f) return;
  const lx = cx + Math.min(W * 0.28, 220), ly = H * 0.8 - 14;
  drawMoth(f, lx, ly, Math.min(W, H) * 0.035, 1);
  // smoke rising off the planks as it goes on
  if (f.t > 2 && !reduceMotion) {
    for (let i = 0; i < 8; i++) { const k = (g.t * 0.5 + i / 8) % 1; ctx.fillStyle = `rgba(60,50,48,${0.4 * (1 - k)})`; ctx.beginPath(); ctx.arc(lx + Math.sin(i * 2 + g.t) * 20, ly + 30 - k * 120, 8 + k * 20, 0, 6.28); ctx.fill(); }
  }
}
