// The Wine-Dark Sea's own enemies, out of the old stories. On an Odyssey voyage these three are the
// only ones out there: no pool draw, no Maren, no Drowned, no Knock, no Verity. All drawn in code.

const ODYSSEY_TRIO = ['sirens', 'charybdis', 'cyclops'];
Object.assign(FOE_NAMES, { sirens: 'the Sirens', charybdis: 'Charybdis', cyclops: 'the Cyclops' });
Object.assign(FOE_INTRO, {
  sirens: 'Singing, sweet and close, from a rock off the bow: the Sirens. Their song drags your helm towards their rock. Ring the bell to drown them out.',
  charybdis: 'The sea ahead is starting to turn. Charybdis is opening a whirlpool on your course. Sail hard round it: at full sail you can pull clear, but don’t let it take you into the middle.',
  cyclops: 'A one-eyed giant is wading out of the shallows with a rock in his fist. Watch for the pale ring where it will land. A flare in his eye blinds him for a while.',
});

Object.assign(FOE_KINDS, {
  // three of them on a rock, singing; the song hauls the helm round to their rock
  sirens: {
    h: 4, max: 1, every: [22, 32], vis: o => Math.max(0.7, foeVis(o)),
    spawn() {
      const p = aheadPt(rand(170, 220), (Math.random() < 0.5 ? -1 : 1) * rand(50, 90));
      if (!okWater(p) || g.rocks.some(r => Math.hypot(r.x - p.x, r.y - p.y) < r.r + 20)) return null;
      return { x: p.x, y: p.y, ph: rand(0, 6), hush: 0, songT: 0, life: 50, cd: 0 };
    },
    update(f, dt) {
      f.ph += dt; f.life -= dt; if (f.cd > 0) f.cd -= dt;
      if (f.hush > 0) f.hush -= dt;
      const d = dist(f);
      if (f.hush <= 0 && d < 240) {
        const side = angDiff(bearingOf(f.x - ship.x, f.y - ship.y), ship.h);
        g.mods.pull += clamp(side * 4, -1, 1) * 0.75 * Math.min(1, 1.5 * (1 - d / 240));
        f.songT -= dt;
        if (f.songT <= 0) { f.songT = 2.4; sfxFoe('song', panOf(f), Math.max(0.25, 1 - d / 240)); }
      }
      // their rock is solid: they want you on it
      if (d < 14 && f.cd <= 0) { f.cd = 3; foeHit('the Sirens’ rock'); const b = bearingOf(ship.x - f.x, ship.y - f.y); ship.x = f.x + Math.sin(b) * 16; ship.y = f.y + Math.cos(b) * 16; }
      if (f.life <= 0) f.dead = true;
    },
    bell(f) { if (dist(f) < 260 && f.hush <= 0) { f.hush = 15; return 'The bell drowned out the Sirens. For a while all you can hear is the sea.'; } },
    draw(f, q, vis) {
      const s = q.s;
      ctx.save(); ctx.globalAlpha = vis; ctx.translate(q.x, q.y);
      // their rock
      ctx.fillStyle = 'rgba(235,230,245,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 11 * s, 1.4 * s, 0, 0, 6.28); ctx.fill();
      const rg = ctx.createLinearGradient(0, -3.5 * s, 0, 0); rg.addColorStop(0, '#9a8e78'); rg.addColorStop(1, '#2e2820');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(-9 * s, 0); ctx.lineTo(-7 * s, -2.4 * s); ctx.lineTo(-3 * s, -3.4 * s); ctx.lineTo(2 * s, -3.6 * s); ctx.lineTo(6.5 * s, -2.6 * s); ctx.lineTo(9 * s, 0); ctx.closePath(); ctx.fill();
      // the three singers, each a woman with a bird's wings, swaying
      for (let i = 0; i < 3; i++) {
        const bx = (i - 1) * 4.2 * s, by = -3.3 * s - (i === 1 ? 0.4 * s : 0), sway = Math.sin(f.ph * 1.4 + i * 2) * 0.08;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(sway);
        const open = 0.6 + 0.4 * Math.sin(f.ph * 0.9 + i);
        for (const sd of [-1, 1]) {
          ctx.fillStyle = i % 2 ? '#5a4a6a' : '#4a3c58';
          ctx.beginPath(); ctx.moveTo(sd * 0.3 * s, -3.4 * s); ctx.quadraticCurveTo(sd * 2.6 * open * s, -4.6 * s, sd * 3 * open * s, -2 * s); ctx.lineTo(sd * 1.6 * open * s, -1.8 * s); ctx.lineTo(sd * 2.2 * open * s, -0.8 * s); ctx.lineTo(sd * 0.4 * s, -1.4 * s); ctx.closePath(); ctx.fill();
        }
        // a pale gown and body
        const bg = ctx.createLinearGradient(-0.6 * s, 0, 0.6 * s, 0); bg.addColorStop(0, '#b8aa98'); bg.addColorStop(0.5, '#f2e8d8'); bg.addColorStop(1, '#a89a88');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-0.9 * s, 0); ctx.lineTo(-0.45 * s, -3.4 * s); ctx.lineTo(0.45 * s, -3.4 * s); ctx.lineTo(0.9 * s, 0); ctx.closePath(); ctx.fill();
        // head tipped back mid-song, long dark hair
        ctx.fillStyle = '#e8dccb'; ctx.beginPath(); ctx.arc(0, -3.9 * s, 0.45 * s, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#1c1418'; ctx.beginPath(); ctx.moveTo(-0.5 * s, -4.1 * s); ctx.quadraticCurveTo(-0.9 * s, -2.8 * s, -0.4 * s, -2.2 * s); ctx.lineTo(0.4 * s, -2.2 * s); ctx.quadraticCurveTo(0.9 * s, -2.8 * s, 0.5 * s, -4.1 * s); ctx.quadraticCurveTo(0, -4.6 * s, -0.5 * s, -4.1 * s); ctx.fill();
        ctx.fillStyle = '#e8dccb'; ctx.beginPath(); ctx.arc(0, -3.85 * s, 0.32 * s, 0, 6.28); ctx.fill();
        if (f.hush <= 0) { ctx.fillStyle = '#3a1a1a'; ctx.beginPath(); ctx.ellipse(0, -3.65 * s, 0.1 * s, 0.13 * s, 0, 0, 6.28); ctx.fill(); }
        ctx.restore();
      }
      // the song, rising off them in golden notes
      if (f.hush <= 0 && s > 0.6) {
        ctx.font = `${Math.max(9, 1.4 * s) | 0}px serif`; ctx.textAlign = 'center';
        for (let i = 0; i < 5; i++) { const k = (f.ph * 0.35 + i / 5) % 1; ctx.fillStyle = `rgba(255,220,140,${0.8 * (1 - k)})`; ctx.fillText(i % 2 ? '♪' : '♫', Math.sin(i * 2 + f.ph) * 5 * s, -6 * s - k * 8 * s); }
      }
      ctx.restore(); ctx.globalAlpha = 1;
    },
  },

  // a whirlpool that opens on your course and drags the ship in; the middle of it breaks planks
  charybdis: {
    h: 2, max: 1, every: [20, 30], vis: () => 1,
    spawn() {
      const p = aheadPt(rand(170, 220), rand(-25, 25));
      if (!okWater(p) || g.rocks.some(r => Math.hypot(r.x - p.x, r.y - p.y) < r.r + 40)) return null;
      sfxFoe('gurgle', panOf(p), 0.7);
      return { x: p.x, y: p.y, grow: 0, rot: 0, life: 28, gT: 0, close: 0, R: 34 };
    },
    update(f, dt) {
      f.life -= dt; f.rot += dt * (1.2 + f.grow);
      if (f.close > 0) { f.close -= dt; f.grow = Math.max(0, f.grow - dt); if (f.close <= 0) f.dead = true; return; }
      f.grow = Math.min(1, f.grow + dt / 3);
      const d = dist(f), reach = f.R * 2.6;
      if (d < reach && f.grow > 0.3) {
        // the current: round and in, stronger towards the middle
        const k = (1 - d / reach) * f.grow, b = bearingOf(f.x - ship.x, f.y - ship.y);
        const inward = 8 * k, round = 6 * k;
        ship.x += (Math.sin(b) * inward + Math.cos(b) * round) * dt; ship.y += (Math.cos(b) * inward - Math.sin(b) * round) * dt;
        g.mods.pull += clamp(angDiff(b, ship.h) * 2, -1, 1) * 0.3 * k;
        f.gT -= dt; if (f.gT <= 0) { f.gT = 1.6; sfxFoe('gurgle', panOf(f), 0.4 + k * 0.6); }
      }
      if (d < 8 && f.grow > 0.5) { foeHit('Charybdis'); g.shake = Math.max(g.shake, 0.7); f.close = 1.5; addLog('Charybdis spun you round and spat you out. The whirlpool closes.', 'w'); }
      if (f.life <= 0) f.close = 2;
    },
    draw(f, q, vis) {
      const R = f.R * f.grow; if (R < 1) return;
      ctx.save();
      // the hollow in the middle
      const ring = (r, z) => { const pts = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * 6.28; const c = cam(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, z); if (c.f < SK.NEAR) return null; pts.push(proj(c)); } return pts; };
      const hole = ring(R * 0.35, -1.5);
      if (hole) { ctx.fillStyle = 'rgba(4,2,8,0.85)'; ctx.beginPath(); hole.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.fill(); }
      const dark = ring(R, 0);
      if (dark) { ctx.fillStyle = 'rgba(10,4,18,0.35)'; ctx.beginPath(); dark.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.fill(); }
      // spiral arms of foam winding in
      ctx.strokeStyle = 'rgba(235,225,245,0.32)'; ctx.lineWidth = Math.max(1, Math.min(4, q.s * 0.25));
      for (let arm = 0; arm < 6; arm++) {
        ctx.beginPath(); let started = false;
        for (let i = 0; i <= 24; i++) {
          const t = i / 24, r = R * (1.15 - t * 0.85), a = arm / 6 * 6.28 + t * 4 + f.rot;
          const c = cam(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, -t * 1.2); if (c.f < SK.NEAR) { started = false; continue; }
          const p = proj(c); started ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); started = true;
        }
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // a one-eyed giant in the shallows, hurling rocks at where you're going; a flare in his eye blinds him
  cyclops: {
    h: 18, max: 1, every: [22, 30], vis: o => Math.max(0.6, foeVis(o)),
    spawn() {
      const p = aheadPt(rand(150, 200), (Math.random() < 0.5 ? -1 : 1) * rand(70, 110));
      if (!okWater(p) || g.rocks.some(r => Math.hypot(r.x - p.x, r.y - p.y) < r.r + 15)) return null;
      sfxFoe('roar', panOf(p), 0.9);
      return { x: p.x, y: p.y, ph: rand(0, 6), throwT: 3, wind: 0, blind: 0, rise: 0, life: 45 };
    },
    update(f, dt) {
      f.ph += dt; f.life -= dt; f.rise = Math.min(1, f.rise + dt * 0.4);
      if (f.blind > 0) { f.blind -= dt; f.wind = 0; if (Math.random() < dt * 0.4) sfxFoe('roar', panOf(f), 0.5); }
      else if (f.wind > 0) {
        f.wind -= dt;
        if (f.wind <= 0) {
          const dur = 2.6, p = aheadPt(ship.v * dur + rand(-4, 8), rand(-7, 7));
          if (!g.backrooms) p.y = Math.max(46, p.y);
          const side = angDiff(bearingOf(f.x - ship.x, f.y - ship.y), yaw) > 0 ? 1 : -1;
          hazard({ kind: 'fireball', style: 'boulder', x: f.x, y: f.y, z: 22, x0: f.x, y0: f.y, z0: 22, x1: p.x, y1: p.y, fuse: dur, dur, r: 10, side });
          hazard({ kind: 'scorch', style: 'boulder', x: p.x, y: p.y, r: 10, life: dur });
          sfxFoe('throw', panOf(f), 1);
        }
      } else if (f.rise >= 1) {
        f.throwT -= dt;
        if (f.throwT <= 0 && dist(f) < 300) { f.throwT = rand(5, 7) * Math.max(0.6, 1 - (g.n - 2) * 0.04); f.wind = 1.2; sfxFoe('grunt', panOf(f), 0.8); }
      }
      if (f.life <= 0) f.dead = true;
    },
    flare(f, x, y) { if (f.blind <= 0 && Math.hypot(f.x - x, f.y - y) < SK.FLARE_RADIUS * 1.2) { f.blind = 12; sfxFoe('roar', panOf(f), 1); return 'The flare caught the Cyclops full in his eye. He is roaring and clutching his face.'; } },
    draw(f, q, vis) {
      const s = q.s, sink = (1 - f.rise) * 18 * s, lift = f.wind > 0 ? 1 - f.wind / 1.2 : 0;
      ctx.save(); ctx.globalAlpha = vis; ctx.translate(q.x, q.y);
      ctx.fillStyle = 'rgba(235,230,245,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 6 * s, 1 * s, 0, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.rect(-20 * s, -30 * s, 40 * s, 30 * s); ctx.clip();   // wading: hidden below the thighs
      ctx.translate(0, sink); ctx.rotate(Math.sin(f.ph * 0.8) * 0.03);
      const skin = ctx.createLinearGradient(-4 * s, 0, 4 * s, 0); skin.addColorStop(0, '#5a4232'); skin.addColorStop(0.5, '#9a7458'); skin.addColorStop(1, '#4a3628');
      // legs, a hide round his waist, and the great chest
      ctx.fillStyle = skin;
      ctx.fillRect(-3 * s, -5 * s, 2.4 * s, 5 * s); ctx.fillRect(0.6 * s, -5 * s, 2.4 * s, 5 * s);
      ctx.fillStyle = '#3a2a1c'; ctx.beginPath(); ctx.moveTo(-3.8 * s, -4 * s); ctx.lineTo(3.8 * s, -4 * s); ctx.lineTo(3.4 * s, -7 * s); ctx.lineTo(-3.4 * s, -7 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(-3.4 * s, -7 * s); ctx.lineTo(3.4 * s, -7 * s); ctx.lineTo(4.4 * s, -13 * s); ctx.lineTo(-4.4 * s, -13 * s); ctx.closePath(); ctx.fill();
      // arms: the throwing one swings up over his head with the rock
      ctx.strokeStyle = '#7a5c46'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, 1.4 * s);
      ctx.beginPath(); ctx.moveTo(-4 * s, -12.5 * s); ctx.lineTo(-5.4 * s, -7 * s); ctx.stroke();
      const ax = 4.6 * s - lift * 2 * s, ay = -8 * s - lift * 9 * s;
      ctx.beginPath(); ctx.moveTo(4 * s, -12.5 * s); ctx.lineTo(ax, ay); ctx.stroke();
      if (f.wind > 0 || (f.blind <= 0 && f.rise >= 1)) { ctx.fillStyle = '#6a6258'; ctx.beginPath(); ctx.arc(ax, ay - 0.8 * s, 1.5 * s, 0, 6.28); ctx.fill(); }
      if (f.blind > 0) { ctx.beginPath(); ctx.moveTo(-4 * s, -12.5 * s); ctx.lineTo(-1 * s, -15.2 * s); ctx.stroke(); }
      // the head: wild hair, a heavy beard and the one eye
      ctx.fillStyle = '#8a6850'; ctx.beginPath(); ctx.arc(0, -15 * s, 2.2 * s, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#20160e'; ctx.beginPath(); ctx.moveTo(-2.3 * s, -15 * s); ctx.quadraticCurveTo(0, -18.6 * s, 2.3 * s, -15 * s); ctx.quadraticCurveTo(0, -16.6 * s, -2.3 * s, -15 * s); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-1.8 * s, -14 * s); ctx.quadraticCurveTo(0, -10.4 * s, 1.8 * s, -14 * s); ctx.quadraticCurveTo(0, -13 * s, -1.8 * s, -14 * s); ctx.fill();
      if (f.blind > 0) { ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = Math.max(1, 0.25 * s); ctx.beginPath(); ctx.moveTo(-0.9 * s, -15.4 * s); ctx.lineTo(0.9 * s, -15.4 * s); ctx.stroke(); }
      else {
        ctx.fillStyle = '#f0ead8'; ctx.beginPath(); ctx.ellipse(0, -15.4 * s, 1 * s, 0.7 * s, 0, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#c8801a'; ctx.beginPath(); ctx.arc(0, -15.4 * s, 0.45 * s, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#100804'; ctx.beginPath(); ctx.arc(0, -15.4 * s, 0.22 * s, 0, 6.28); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; lamp(0, -15.4 * s, '#ffb040', Math.max(1, 0.4 * s)); ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore(); ctx.globalAlpha = 1;
    },
  },
});
