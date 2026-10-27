// The enemy pool. Each voyage draws three enemies from it (never the same as your last voyage, solo);
// only those three appear. Maren is always out there, and Plimsoll is always your guide.
//
// The Drowned, Knock and Verity live in enemies.js and verity.js; the rest are here. Each kind has a
// spawn/update/draw. They share a few things: `g.mods` (things they do to your ship this frame:
// a pull on the helm, a spin, slowing, a speed cap, a dimmed lantern), `g.hazards` (things they leave
// on the water: rings, slicks, eggs, ice, roots) and the overlays (a camera flash, a banana splat).

const FOE_ASSETS = {
  dancer: 'assets/foes/dancer.webp', crocbomber: 'assets/foes/crocbomber.webp', cactusmammoth: 'assets/foes/cactusmammoth.webp',
  pigeon: 'assets/foes/pigeon.webp', coconutbull: 'assets/foes/coconutbull.webp', bananadolphin: 'assets/foes/bananadolphin.webp',
  toucan: 'assets/foes/toucan.webp', brute: 'assets/foes/brute.webp', tyrefrog: 'assets/foes/tyrefrog.webp',
  assassin: 'assets/foes/assassin.webp', goose: 'assets/foes/goose.webp', shrimpcat: 'assets/foes/shrimpcat.webp',
  fridgecamel: 'assets/foes/fridgecamel.webp', condiments: 'assets/foes/condiments.webp', gentleman: 'assets/foes/gentleman.webp',
  smuggler: 'assets/foes/smuggler.webp', bananaape: 'assets/foes/bananaape.webp', rootman: 'assets/foes/rootman.webp',
};
const FOE_IMG = {};
for (const k in FOE_ASSETS) { FOE_IMG[k] = new Image(); FOE_IMG[k].src = FOE_ASSETS[k]; }

const FOE_NAMES = {
  dancer: 'The Dancer', crocbomber: 'The Croc Bomber', cactusmammoth: 'The Cactus Mammoth', pigeon: 'The Informer',
  coconutbull: 'The Coconut Bull', bananadolphin: 'The Banana Dolphin', toucan: 'The Toucan', brute: 'The Juiced Brute',
  tyrefrog: 'The Tyre Frog', assassin: 'The Assassin Cup', goose: 'The Bomber Goose', shrimpcat: 'The Shrimp Cat',
  fridgecamel: 'The Fridge Camel', condiments: 'The Condiment Twins', gentleman: 'The Gentleman', smuggler: 'The Smuggler',
  bananaape: 'The Banana Ape', rootman: 'The Root Hermit', drowned: 'the Drowned', knock: 'Knock', verity: 'Verity',
};
const FOE_POOL = Object.keys(FOE_NAMES);
const FOE_INTRO = {
  dancer: 'A ballerina is spinning on the water ahead. Her whirl drags at the helm. The bell stops her.',
  crocbomber: 'Engines overhead: the Croc Bomber. Steer out of the red rings before the bombs land.',
  cactusmammoth: 'Something stands on the water like a rock, bristling with spines. Give it a wide berth.',
  pigeon: 'A pigeon in a trench coat is keeping pace with you. When its red light blinks, look away.',
  coconutbull: 'A trumpet from the side: the Coconut Bull is lining up to charge. Dodge it.',
  bananadolphin: 'A dolphin in a banana leapt across your bow. Steer round the peel slicks.',
  toucan: 'A toucan circles high. If it dives, ring the bell or it takes your flare.',
  brute: 'Something muscled is swimming after you. If he grabs the bow, ring the bell.',
  tyrefrog: 'A frog in a tyre is bouncing across the sea. Watch where its shadow lands.',
  assassin: 'You hear a blade but see nothing. When it goes shing, change speed or turn.',
  goose: 'A goose with propellers is laying eggs on the water. Don’t touch them.',
  shrimpcat: 'A shrimp-cat is circling the hull. If it clings on, turn hard to shake it off.',
  fridgecamel: 'A camel carrying a fridge walks the sea, freezing it as it goes. Mind the ice.',
  condiments: 'Two figures are closing in from either side. Turn hard as they close, so they don’t meet with you between them.',
  gentleman: 'A huge gentleman in a top hat rose from the sea. Keep clear of his arm.',
  smuggler: 'A gunman on a rock. He fires when you’re in the light. Stay in the dark.',
  bananaape: 'An ape in a banana is throwing fruit at your sails. Keep moving.',
  rootman: 'A root-covered hermit points at you. Turn across the roots before they reach you.',
};
let lastTrio = null;
try { lastTrio = JSON.parse(localStorage.getItem('skerry-trio') || 'null'); } catch (e) {}

// draw this voyage's three: from the crew's seed in a crew, so everyone gets the same
function pickTrio(seed) {
  const rng = seed != null ? seeded((seed ^ 0x5bd1e995) >>> 0) : Math.random;
  let pool = FOE_POOL.slice();
  if (seed == null && Array.isArray(lastTrio)) { const fresh = pool.filter(k => !lastTrio.includes(k)); if (fresh.length >= 3) pool = fresh; }
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  if (seed == null) { lastTrio = out; try { localStorage.setItem('skerry-trio', JSON.stringify(out)); } catch (e) {} }
  return out;
}
const hasFoe = k => !g || !g.trio || g.trio.includes(k);

function newFoes(trio) {
  const F = {};
  for (const k of trio) if (FOE_KINDS[k]) F[k] = { t: rand(6, 14), list: [], intro: false };
  return F;
}
function resetMods() {
  g.mods = { pull: 0, spinDir: 0, slow: 1, cap: Infinity, lantern: 1 };
}

// ---------- helpers ----------
const fwd = () => ({ x: Math.sin(ship.h), y: Math.cos(ship.h) });
function aheadPt(d, lat) { const f = fwd(); return { x: ship.x + f.x * d + f.y * lat, y: ship.y + f.y * d - f.x * lat }; }
function okWater(p) { return g.backrooms ? true : p.y > 40; }
const dist = (o) => Math.hypot(o.x - ship.x, o.y - ship.y);
const panOf = (o) => clamp(angDiff(bearingOf(o.x - ship.x, o.y - ship.y), ship.h) / (fov / 2), -1, 1);
const inView = (o) => Math.abs(angDiff(bearingOf(o.x - ship.x, o.y - ship.y), ship.h)) < fov / 2 + 0.05;
function intro(k) { const F = g.foes[k]; if (F && !F.intro) { F.intro = true; addLog(FOE_INTRO[k], 'w'); } }
function foeHit(what) { if (ship.inv <= 0) hit(0, -1, what); }
// how well you can see something out here: the usual light, but nothing close is ever pitch black
function foeVis(o, stealth) {
  const v = visibility(o.x, o.y);
  if (stealth) return Math.max(v * 0.6, flareAt(o.x, o.y));
  return Math.max(v, Math.max(0, 1 - dist(o) / 220) * 0.55);
}
function hazard(h) { g.hazards.push(Object.assign({ t: 0 }, h)); return h; }
const ceilingZ = z => g.backrooms ? Math.min(z, SK.BACKROOMS_CEIL - 2) : z;
function nextMarenStage() {
  const m = g.maren;
  if (m.active && m.stage < SK.MAREN_STAGES.length - 1) { m.stage++; placeMaren(m.stage); }
}

// ---------- the kinds ----------
const FOE_KINDS = {
  // spins on the water ahead; her whirlpool drags your bow towards her. The bell stops her.
  dancer: {
    h: 6, spawn() { const p = aheadPt(rand(150, 200), (Math.random() < 0.5 ? -1 : 1) * rand(35, 70)); return okWater(p) && { x: p.x, y: p.y, ph: 0, spin: 0, rest: 2, stun: 0, cd: 0 }; },
    max: 1, every: [20, 30],
    update(f, dt) {
      f.ph += dt; if (f.stun > 0) f.stun -= dt; if (f.cd > 0) f.cd -= dt;
      // keep drifting to stay out ahead of the ship
      const d = dist(f);
      if (d > 230) { const p = aheadPt(170, rand(-40, 40)); if (okWater(p)) { f.x = p.x; f.y = p.y; } }
      if (f.stun <= 0) {
        if (f.spin > 0) { f.spin -= dt; if (f.spin <= 0) f.rest = rand(4, 7); }
        else { f.rest -= dt; if (f.rest <= 0) { f.spin = rand(7, 10); if (d < 260) sfxFoe('whirl', panOf(f), 0.7); } }
      }
      if (f.spin > 0 && f.stun <= 0 && d < 190) {
        const side = angDiff(bearingOf(f.x - ship.x, f.y - ship.y), ship.h);
        g.mods.pull += clamp(side * 5, -1, 1) * 0.8 * Math.min(1, 1.3 * (1 - d / 190));
        if (Math.random() < dt * 0.8) sfxFoe('whirl', panOf(f), 0.4 * (1 - d / 190));
      }
      if (d < 9 && f.cd <= 0) { f.cd = 3; foeHit('the Dancer'); const p = aheadPt(220, rand(-60, 60)); if (okWater(p)) { f.x = p.x; f.y = p.y; } }
    },
    bell(f) { if (dist(f) < 220) { f.stun = 10; f.spin = 0; return 'The Dancer stops mid-pirouette.'; } },
    draw(f, q, vis) {
      const spinning = f.spin > 0 && f.stun <= 0;
      drawSprite('dancer', q, 6, vis, { flipX: spinning ? Math.cos(f.ph * 9) : 1, bob: Math.sin(f.ph * 2) * 0.2 });
      if (spinning) { // the whirlpool on the water around her
        ctx.save(); ctx.globalAlpha = 0.35 * vis; ctx.strokeStyle = 'rgba(200,220,245,0.8)'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) { const r = (8 + i * 6 + (f.ph * 6) % 6) * q.s; ctx.beginPath(); ctx.ellipse(q.x, q.y, r, r * 0.18, 0, 0, 6.28); ctx.stroke(); }
        ctx.restore();
      }
    },
  },

  // drones overhead and drops bombs on your course: steer out of the red rings
  crocbomber: {
    h: 9, max: 1, every: [22, 32], fly: true,
    spawn() { const p = aheadPt(-260, rand(-40, 40)); return { x: p.x, y: p.y, z: ceilingZ(38), h: ship.h, drops: 3, dropT: 0, life: 14, droned: false }; },
    update(f, dt) {
      const sp = 34; f.x += Math.sin(f.h) * sp * dt; f.y += Math.cos(f.h) * sp * dt; f.life -= dt;
      f.h += angDiff(ship.h, f.h) * Math.min(1, dt * 0.4);
      const d = dist(f);
      if (!f.droned && d < 300) { f.droned = true; sfxFoe('drone', panOf(f), 0.9); }
      f.dropT -= dt;
      if (f.drops > 0 && d < 140 && f.dropT <= 0) {
        f.drops--; f.dropT = 0.8;
        // aim where you'll be in 2 s, give or take
        const lead = ship.v * 2, p = aheadPt(lead + rand(-6, 10), rand(-8, 8));
        hazard({ kind: 'ring', x: p.x, y: p.y, r: 13, fuse: 2 });
        sfxFoe('whistle', panOf(p), 0.6);
      }
      if (f.life <= 0) f.dead = true;
    },
    draw(f, q, vis) { drawSprite('crocbomber', q, 9, Math.max(0.7, vis), { flipX: angDiff(f.h, yaw) > 0 ? -1 : 1, noReflect: true }); },
  },

  // stands still on the water like a skerry; come too close and it fires a ring of spines
  cactusmammoth: {
    h: 9, max: 2, every: [10, 16],
    spawn() { const p = aheadPt(rand(260, 360), rand(-35, 35)); return okWater(p) && !g.rocks.some(r => Math.hypot(r.x - p.x, r.y - p.y) < r.r + 15) && { x: p.x, y: p.y, cd: 0, ph: rand(0, 6) }; },
    update(f, dt) {
      if (f.cd > 0) f.cd -= dt;
      const d = dist(f);
      if (d < 30 && f.cd <= 0) {
        f.cd = 6;
        burst(f.x, f.y, ['#8bbf6a', '#cfe8a8', '#556b3a'], 40, 14, 6);
        sfxFoe('spines', panOf(f), 1);
        foeHit('the Cactus Mammoth’s spines');
      }
      if (d > 600) f.dead = true;
    },
    draw(f, q, vis) { drawSprite('cactusmammoth', q, 9, vis * (visibility(f.x, f.y) > 0.05 || dist(f) < 60 ? 1 : 0.15)); },
    vis: f => Math.max(visibility(f.x, f.y), afterglow(f), dist(f) < 50 ? 0.6 : 0),
  },

  // keeps pace with you; when its red light blinks it takes a photo: look away, or Maren learns where you are
  pigeon: {
    h: 3, max: 1, every: [22, 30], fly: true,
    spawn() { const side = Math.random() < 0.5 ? -1 : 1, p = aheadPt(30, side * 45); return { x: p.x, y: p.y, z: ceilingZ(8), side, t: 0, phase: 'follow', charge: 0, life: 40 }; },
    update(f, dt) {
      f.t += dt; f.life -= dt;
      const target = aheadPt(35 + Math.sin(f.t * 0.5) * 10, f.side * 40);
      f.x += (target.x - f.x) * Math.min(1, dt * 1.5); f.y += (target.y - f.y) * Math.min(1, dt * 1.5);
      if (f.phase === 'follow' && f.t > 7) { f.phase = 'charge'; f.charge = 2; }
      if (f.phase === 'charge') {
        f.charge -= dt;
        if (Math.floor(f.charge * 4) !== Math.floor((f.charge + dt) * 4)) sfxFoe('click', panOf(f), 0.5);
        if (f.charge <= 0) {
          f.phase = 'follow'; f.t = 0;
          if (inView(f)) {
            g.flash = 3; sfxFoe('camera', panOf(f), 1);
            nextMarenStage();
            addLog('Flash! The Informer got your picture, and Maren knows where you are.', 'w');
          } else addLog('A flash off to the side. You didn’t look; Maren learned nothing.', 'p');
        }
      }
      if (f.life <= 0) f.dead = true;
    },
    bell(f) { if (dist(f) < 150) { f.dead = true; return 'The Informer flapped off in a panic.'; } },
    draw(f, q, vis) {
      drawSprite('pigeon', q, 3, Math.max(0.7, vis), { noReflect: true, flipX: f.side });
      if (f.phase === 'charge' && Math.floor(f.charge * 4) % 2 === 0) { lamp(q.x + f.side * 0.5 * q.s, q.y - 1.6 * q.s, '#ff3030', Math.max(2, 0.4 * q.s)); }
    },
  },

  // lines up beside you, trumpets, and charges in a straight line
  coconutbull: {
    h: 5, max: 1, every: [16, 24],
    spawn() {
      const side = Math.random() < 0.5 ? -1 : 1, p = aheadPt(ship.v * 2.2, side * 80);
      if (!okWater(p)) return null;
      sfxFoe('trumpet', side, 0.9);
      return { x: p.x, y: p.y, side, wait: 1.6, dx: 0, dy: 0, ran: 0, hitDone: false };
    },
    update(f, dt) {
      if (f.wait > 0) {
        f.wait -= dt;
        if (f.wait <= 0) { const t = aheadPt(ship.v * 2.4, 0), d = Math.hypot(t.x - f.x, t.y - f.y) || 1; f.dx = (t.x - f.x) / d; f.dy = (t.y - f.y) / d; }
        return;
      }
      const sp = 32; f.x += f.dx * sp * dt; f.y += f.dy * sp * dt; f.ran += sp * dt;
      if (!f.hitDone && dist(f) < 8) {
        f.hitDone = true; foeHit('the Coconut Bull');
        ship.x += f.dx * 5; ship.y += f.dy * 5; ship.h += f.side * -0.4;
      }
      if (f.ran > 260) f.dead = true;
    },
    draw(f, q, vis) { drawSprite('coconutbull', q, 5, vis, { flipX: f.side, bob: f.wait > 0 ? 0 : Math.abs(Math.sin(g.t * 12)) * 0.4 }); },
  },

  // leaps across your path, leaving peel slicks that spin the ship
  bananadolphin: {
    h: 4, max: 1, every: [11, 17], fly: true,
    spawn() {
      const side = Math.random() < 0.5 ? -1 : 1, a = aheadPt(rand(45, 70), side * 40), b = aheadPt(rand(50, 80), -side * 40);
      if (!okWater(a) || !okWater(b)) return null;
      return { x: a.x, y: a.y, z: 0, ax: a.x, ay: a.y, bx: b.x, by: b.y, k: 0, dropped: 0, side };
    },
    update(f, dt) {
      f.k += dt / 1.6;
      f.x = f.ax + (f.bx - f.ax) * f.k; f.y = f.ay + (f.by - f.ay) * f.k; f.z = Math.sin(Math.min(1, f.k) * Math.PI) * 9;
      const n = Math.floor(f.k * 4);
      if (n > f.dropped && f.k < 1) { f.dropped = n; hazard({ kind: 'slick', x: f.x, y: f.y, r: 6, life: 30 }); }
      if (f.k >= 1) { f.dead = true; sfxSplash(panOf(f), 0.8); }
    },
    draw(f, q, vis) { drawSprite('bananadolphin', q, 4, Math.max(0.6, vis), { flipX: f.side, rot: (f.k - 0.5) * f.side * 1.2, noReflect: f.z > 1 }); },
  },

  // circles high, then dives for your flare; the bell scares it off
  toucan: {
    h: 2.6, max: 1, every: [16, 24], fly: true,
    spawn() { const p = aheadPt(80, rand(-60, 60)); return { x: p.x, y: p.y, z: ceilingZ(30), a: rand(0, 6), t: 0, dive: 0, sx: 0, sy: 0, sz: 0 }; },
    update(f, dt) {
      f.t += dt;
      if (f.dive === 0) {
        f.a += dt * 0.8;
        const c = aheadPt(30, 0);
        f.x = c.x + Math.cos(f.a) * 70; f.y = c.y + Math.sin(f.a) * 70; f.z = ceilingZ(30);
        if (f.t > 9) { f.dive = 0.001; f.sx = f.x; f.sy = f.y; f.sz = f.z; sfxFoe('caw', panOf(f), 0.9); }
      } else {
        f.dive += dt / 2.5;
        const k = Math.min(1, f.dive);
        f.x = f.sx + (ship.x - f.sx) * k; f.y = f.sy + (ship.y - f.sy) * k; f.z = f.sz + (4 - f.sz) * k;
        if (k >= 1) {
          g.flareCd = SK.FLARE_COOLDOWN; flareShown = -1;
          addLog('The Toucan snatched your flare and flew off with it. It has to reload.', 'w');
          sfxFoe('caw', 0, 1); f.dead = true;
        }
      }
    },
    bell(f) { if (dist(f) < 160) { f.dead = true; return 'The Toucan flapped away from the bell.'; } },
    draw(f, q, vis) { drawSprite('toucan', q, 2.6, Math.max(0.75, vis), { noReflect: true, flipX: Math.sin(f.a) > 0 ? 1 : -1, bob: Math.sin(g.t * 10) * 0.15 }); },
  },

  // swims after you and grabs the bow: you crawl, and after 4 s he squeezes off a plank
  brute: {
    h: 4.5, max: 1, every: [14, 22],
    spawn() { const p = aheadPt(-rand(35, 50), rand(-20, 20)); return okWater(p) && { x: p.x, y: p.y, hold: 0, ph: 0 }; },
    update(f, dt) {
      f.ph += dt * 6;
      if (f.hold > 0) {
        const b = aheadPt(8, 0); f.x = b.x; f.y = b.y;
        g.mods.slow = Math.min(g.mods.slow, 0.33);
        f.hold -= dt;
        if (f.hold <= 0) { foeHit('the Juiced Brute’s squeeze'); throwBack(f, 120); }
        return;
      }
      // a sprinter: always a little faster than you, so only the bell gets rid of him
      const d = dist(f) || 1, sp = Math.max(8, ship.v * 1.2 + 3 + g.n * 0.2);
      f.x += (ship.x - f.x) / d * sp * dt; f.y += (ship.y - f.y) / d * sp * dt;
      if (d < 7) { f.hold = 4; sfxFoe('grunt', panOf(f), 1); addLog('The Brute has the bow! Ring the bell to break his grip.', 'w'); }
      if (d > 400) f.dead = true;
    },
    bell(f) { if (dist(f) < 150) { throwBack(f, 140); return 'The Brute let go and sank back.'; } },
    draw(f, q, vis) { drawSprite('brute', q, 4.5, vis, { bob: Math.sin(f.ph) * 0.2, sink: f.hold > 0 ? 0.3 : 0.45 }); },
  },

  // bounces across the sea; each landing rocks you, and a landing on you costs a plank
  tyrefrog: {
    h: 4, max: 1, every: [14, 20], fly: true,
    spawn() { const p = aheadPt(rand(90, 130), rand(-50, 50)); return okWater(p) && { x: p.x, y: p.y, z: 0, fx: p.x, fy: p.y, tx: p.x, ty: p.y, k: 1, hops: 6 }; },
    update(f, dt) {
      if (f.k >= 1) {
        if (f.hops-- <= 0) { f.dead = true; return; }
        f.fx = f.x; f.fy = f.y;
        const t = aheadPt(ship.v * 2.2 + rand(-4, 8), rand(-10, 10));
        f.tx = f.x + (t.x - f.x) * 0.7; f.ty = f.y + (t.y - f.y) * 0.7; f.k = 0;
        f.shadow = hazard({ kind: 'shadow', x: f.tx, y: f.ty, r: 6, life: 2.2 });
        sfxFoe('croak', panOf(f), 0.7);
      }
      f.k = Math.min(1, f.k + dt / 2.2);
      f.x = f.fx + (f.tx - f.fx) * f.k; f.y = f.fy + (f.ty - f.fy) * f.k; f.z = Math.sin(f.k * Math.PI) * 18;
      if (f.k >= 1) {
        const d = dist(f);
        sfxSplash(panOf(f), Math.max(0.2, 1 - d / 120)); burst(f.x, f.y, ['#c8d6e8', '#ece4cf'], 18, 8, 7);
        if (d < 40) { ship.h += (Math.random() < 0.5 ? -1 : 1) * 0.3 * (1 - d / 40); g.shake = Math.max(g.shake, 0.3); }
        if (d < 7) foeHit('the Tyre Frog');
      }
    },
    draw(f, q, vis) { drawSprite('tyrefrog', q, 4, Math.max(0.65, vis), { noReflect: f.z > 1, rot: Math.sin(f.k * Math.PI * 2) * 0.3 }); },
  },

  // invisible except in a flare: appears beside you with a 'shing' and slashes a second later
  assassin: {
    h: 3.2, max: 1, every: [13, 19],
    spawn() {
      const p = aheadPt(ship.v * 1.0 + 3, (Math.random() < 0.5 ? -1 : 1) * 5);
      sfxFoe('shing', panOf(p), 1);
      return { x: p.x, y: p.y, fuse: 1.0, done: false };
    },
    update(f, dt) {
      f.fuse -= dt;
      if (!f.done && f.fuse <= 0) {
        f.done = true;
        if (dist(f) < 9) { sfxFoe('slash', 0, 1); foeHit('the Assassin Cup'); }
        else { sfxFoe('whoosh', panOf(f), 0.6); addLog('A blade cut the air behind you. Missed.', 'p'); }
      }
      if (f.fuse < -0.6) f.dead = true;
    },
    draw(f, q, vis) {
      const v = Math.max(flareAt(f.x, f.y), f.fuse < 0 ? 0.9 : 0.08 + 0.05 * Math.sin(g.t * 20));
      drawSprite('assassin', q, 3.2, v, { flipX: Math.sin(g.t * 3) > 0 ? 1 : -1 });
    },
  },

  // flies over and lays floating egg-mines in your path; the bell sinks them
  goose: {
    h: 5, max: 1, every: [24, 34], fly: true,
    spawn() { const p = aheadPt(-90, rand(-30, 30)); sfxFoe('honk', panOf(p), 0.8); return { x: p.x, y: p.y, z: ceilingZ(24), h: ship.h, eggs: 5, eggT: 0, life: 20 }; },
    update(f, dt) {
      const sp = 30; f.x += Math.sin(f.h) * sp * dt; f.y += Math.cos(f.h) * sp * dt; f.life -= dt;
      f.eggT -= dt;
      const ahead = (f.x - ship.x) * Math.sin(ship.h) + (f.y - ship.y) * Math.cos(ship.h);
      if (f.eggs > 0 && ahead > 30 && f.eggT <= 0) {
        f.eggs--; f.eggT = 0.5;
        hazard({ kind: 'egg', x: f.x + rand(-10, 10), y: f.y + rand(-10, 10), r: 3.5, life: 60, vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5) });
        if (Math.random() < 0.5) sfxFoe('honk', panOf(f), 0.5);
      }
      if (f.life <= 0) f.dead = true;
    },
    draw(f, q, vis) { drawSprite('goose', q, 5, Math.max(0.7, vis), { noReflect: true, flipX: angDiff(f.h, yaw) > 0 ? -1 : 1, bob: Math.sin(g.t * 4) * 0.3 }); },
    bellHaz: true,
  },

  // circles the hull, then leaps aboard and clings on: your lantern dims. Turn hard to shake it.
  shrimpcat: {
    h: 2.4, max: 1, every: [18, 26],
    spawn() { const p = aheadPt(rand(30, 60), (Math.random() < 0.5 ? -1 : 1) * 50); return okWater(p) && { x: p.x, y: p.y, on: false, shake: 0, dir: 0, ph: 0 }; },
    update(f, dt) {
      f.ph += dt;
      if (f.on) {
        const b = aheadPt(6, 1.2); f.x = b.x; f.y = b.y;
        g.mods.lantern = Math.min(g.mods.lantern, 0.5);
        if (Math.random() < dt * 0.4) sfxFoe('meow', 0, 0.6);
        const r = ship.rudder;
        if (Math.abs(r) > 0.75 && Math.sign(r) === f.dir) f.shake += dt; else { f.dir = Math.sign(r) || f.dir || 1; f.shake = Math.max(0, f.shake - dt); }
        if (f.shake > 2) { addLog('You shook the Shrimp Cat off. It hissed into the sea.', 'p'); sfxFoe('meow', 0, 1); throwBack(f, 100); f.on = false; f.dead = true; }
        return;
      }
      const d = dist(f) || 1, sp = Math.max(9, ship.v + 3);
      f.x += (ship.x - f.x) / d * sp * dt; f.y += (ship.y - f.y) / d * sp * dt;
      if (d < 12) { f.on = true; sfxFoe('meow', 0, 1); addLog('The Shrimp Cat is on the hull! Your lantern dims. Turn hard one way to shake it off.', 'w'); }
      if (d > 300) f.dead = true;
    },
    draw(f, q, vis) { drawSprite('shrimpcat', q, 2.4, Math.max(0.7, vis), { bob: Math.sin(f.ph * 5) * 0.15, sink: f.on ? 0 : 0.2 }); },
  },

  // walks the sea freezing it: ice floes are solid and slow you; flares melt them
  fridgecamel: {
    h: 6, max: 1, every: [18, 26],
    spawn() { const p = aheadPt(rand(140, 180), (Math.random() < 0.5 ? -1 : 1) * rand(30, 60)); return okWater(p) && { x: p.x, y: p.y, iceT: 0, life: 40, ph: 0 }; },
    update(f, dt) {
      f.ph += dt; f.life -= dt;
      // amble towards your path, staying out ahead
      const t = aheadPt(110, 0), d = Math.hypot(t.x - f.x, t.y - f.y) || 1;
      f.x += (t.x - f.x) / d * 3 * dt; f.y += (t.y - f.y) / d * 3 * dt;
      f.iceT -= dt;
      if (f.iceT <= 0 && dist(f) < 260) {
        f.iceT = 2.5;
        const a = rand(0, 6.28), r = rand(6, 16);
        hazard({ kind: 'ice', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, r: rand(5, 9), life: 20, ph: rand(0, 6) });
        if (Math.random() < 0.3) sfxFoe('freeze', panOf(f), 0.5);
      }
      if (f.life <= 0) f.dead = true;
    },
    draw(f, q, vis) { drawSprite('fridgecamel', q, 6, vis, { bob: Math.abs(Math.sin(f.ph * 2)) * 0.2 }); },
  },

  // two of them flank you; if they meet with you between them, you're seasoned
  condiments: {
    h: 3, max: 2, every: [22, 30],
    spawn() {
      const live = g.foes.condiments.list.filter(o => !o.dead);
      if (live.length) return null;
      const L = aheadPt(rand(10, 30), -70), R = aheadPt(rand(10, 30), 70);
      const pair = [{ x: L.x, y: L.y, side: -1, half: 0 }, { x: R.x, y: R.y, side: 1, half: 1 }];
      g.foes.condiments.list.push(pair[1]);
      return pair[0];
    },
    update(f, dt) {
      const sp = Math.min(20, ship.v + 6), d = dist(f) || 1;
      // each heads for its own flank of your ship
      // turning hard flings both of them to the outside of the turn, onto the same side
      const flung = Math.abs(ship.rudder) > 0.7 ? -Math.sign(ship.rudder) : 0;
      const t = aheadPt(4, (flung || f.side) * (flung ? 18 + f.half * 8 : 10)), td = Math.hypot(t.x - f.x, t.y - f.y) || 1;
      f.x += (t.x - f.x) / td * sp * dt; f.y += (t.y - f.y) / td * sp * dt;
      if (f.half === 0) {
        const o = g.foes.condiments.list.find(x => x !== f && !x.dead); if (!o) { f.dead = true; return; }
        const d2 = dist(o);
        if (d < 22 && d2 < 22) {
          const a = Math.abs(angDiff(bearingOf(f.x - ship.x, f.y - ship.y), bearingOf(o.x - ship.x, o.y - ship.y)));
          if (a > 2.0) { foeHit('the Condiment Twins'); sfxFoe('shake', 0, 1); addLog('Seasoned! The Twins met with you between them.', 'w'); f.dead = o.dead = true; }
        }
      }
      if (d > 500) f.dead = true;
    },
    bell(f) { if (dist(f) < 160) { throwBack(f, 130); return 'The Twins tumbled back from the bell.'; } },
    draw(f, q, vis) { drawSprite('condiments', q, 3, vis, { flipX: f.side, bob: Math.abs(Math.sin(g.t * 8 + f.half)) * 0.2 }); },
  },

  // rises from the sea in your way and sweeps his arm; the bell sinks him
  gentleman: {
    h: 14, max: 1, every: [20, 30],
    spawn() { const p = aheadPt(rand(100, 140), rand(-25, 25)); return okWater(p) && { x: p.x, y: p.y, rise: 0, life: 25, sweep: 3, swing: 0 }; },
    update(f, dt) {
      f.rise = Math.min(1, f.rise + dt / 2); f.life -= dt;
      if (f.rise === dt / 2) sfxFoe('rumble', panOf(f), 1);
      f.sweep -= dt; if (f.swing > 0) f.swing -= dt;
      const d = dist(f);
      if (f.sweep <= 0) { f.sweep = 4; f.swing = 0.8; if (d < 120) sfxFoe('whoosh', panOf(f), 0.8); if (d < 26) foeHit('the Gentleman’s arm'); }
      // he's solid
      if (d < 10 + 6 && state === 'play') { const nx = (ship.x - f.x) / (d || 1), ny = (ship.y - f.y) / (d || 1); ship.x = f.x + nx * 16; ship.y = f.y + ny * 16; ship.v = Math.min(ship.v, 3); }
      if (f.life <= 0) f.dead = true;
    },
    bell(f) { if (dist(f) < 220) { f.dead = true; g.foes.gentleman.t = 6; return 'The Gentleman sank with a dignified bubble.'; } },
    draw(f, q, vis) { drawSprite('gentleman', q, 14, Math.max(0.5, vis), { sink: 1 - f.rise, rot: f.swing > 0 ? Math.sin((0.8 - f.swing) * 8) * 0.12 : 0 }); },
  },

  // stands on a rock and fires when you're in the light
  smuggler: {
    h: 2.8, max: 1, every: [16, 24],
    spawn() {
      const rocks = g.rocks.filter(r => !r.gone && Math.hypot(r.x - ship.x, r.y - ship.y) > 150 && Math.hypot(r.x - ship.x, r.y - ship.y) < 320);
      let p = rocks.length ? rocks[(Math.random() * rocks.length) | 0] : aheadPt(220, rand(-80, 80));
      return { x: p.x, y: p.y, z: p.r ? p.r * 0.7 : 0, rock: p.r ? p : null, cd: 3, aim: 0, life: 50 };
    },
    update(f, dt) {
      f.life -= dt; if (f.cd > 0) f.cd -= dt;
      const lit = litAt(ship.x, ship.y) > 0.25 || flareAt(ship.x, ship.y) > 0.1;
      const clear = !g.rocks.some(r => r !== f.rock && !r.gone && segHitsCircle(f.x, f.y, ship.x, ship.y, r));
      if (f.aim > 0) {
        f.aim -= dt;
        if (f.aim <= 0) {
          sfxFoe('gun', panOf(f), Math.max(0.3, 1 - dist(f) / 400));
          f.muzzle = 0.15;
          if (lit && clear) foeHit('the Smuggler’s bullets'); else addLog('Bullets whined past in the dark.', 'p');
          f.cd = 5;
        }
      } else if (f.cd <= 0 && lit && clear && dist(f) < 380) { f.aim = 0.7; sfxFoe('click', panOf(f), 0.8); }
      if (f.muzzle > 0) f.muzzle -= dt;
      if (f.life <= 0 || dist(f) > 500) f.dead = true;
    },
    draw(f, q, vis) {
      drawSprite('smuggler', q, 2.8, Math.max(0.6, vis), { noReflect: !!f.rock });
      if (f.aim > 0 || f.muzzle > 0) lamp(q.x, q.y - 2 * q.s, f.muzzle > 0 ? '#ffe08a' : '#ff4a3a', Math.max(2, (f.muzzle > 0 ? 1.2 : 0.4) * q.s));
    },
  },

  // throws bananas at your sails: a splat on your view and your speed capped
  bananaape: {
    h: 3.5, max: 1, every: [16, 22],
    spawn() { const side = Math.random() < 0.5 ? -1 : 1, p = aheadPt(rand(30, 60), side * rand(50, 75)); return okWater(p) && { x: p.x, y: p.y, side, throwT: 2, life: 30, stun: 0, ph: 0 }; },
    update(f, dt) {
      f.ph += dt; f.life -= dt;
      if (f.stun > 0) { f.stun -= dt; return; }
      // keeps pace off your beam
      const t = aheadPt(40, f.side * 60); f.x += (t.x - f.x) * Math.min(1, dt * 0.6); f.y += (t.y - f.y) * Math.min(1, dt * 0.6);
      f.throwT -= dt;
      if (f.throwT <= 0) {
        f.throwT = 5;
        const land = aheadPt(ship.v * 1.2, 0);
        hazard({ kind: 'banana', x: f.x, y: f.y, x0: f.x, y0: f.y, x1: land.x + rand(-3, 3), y1: land.y + rand(-3, 3), fuse: 1.2, dur: 1.2, r: 7 });
        sfxFoe('throw', panOf(f), 0.7);
      }
      if (f.life <= 0) f.dead = true;
    },
    bell(f) { if (dist(f) < 160) { f.stun = 20; return 'The Banana Ape ducked under the water.'; } },
    draw(f, q, vis) { if (f.stun > 0) return; drawSprite('bananaape', q, 3.5, vis, { flipX: -f.side, bob: Math.sin(f.ph * 3) * 0.2 }); },
  },

  // points at you, and a line of roots bursts up from the sea towards your ship
  rootman: {
    h: 7, max: 1, every: [18, 26],
    spawn() { const p = aheadPt(rand(120, 160), (Math.random() < 0.5 ? -1 : 1) * rand(40, 80)); return okWater(p) && { x: p.x, y: p.y, pointT: 3, line: null, life: 45 }; },
    update(f, dt) {
      f.life -= dt; f.pointT -= dt;
      if (f.pointT <= 0 && !f.line && dist(f) < 260) {
        const t = aheadPt(ship.v * 1.5, 0), d = Math.hypot(t.x - f.x, t.y - f.y) || 1;
        f.line = { dx: (t.x - f.x) / d, dy: (t.y - f.y) / d, n: 0, k: 0, max: Math.min(24, Math.ceil(d / 8) + 4) };
        sfxFoe('creak', panOf(f), 1);
      }
      if (f.line) {
        f.line.k -= dt;
        if (f.line.k <= 0) {
          f.line.k = 0.22; f.line.n++;
          const x = f.x + f.line.dx * 8 * f.line.n, y = f.y + f.line.dy * 8 * f.line.n;
          hazard({ kind: 'root', x, y, r: 3, life: 15, grow: 0 });
          if (f.line.n % 3 === 0) sfxFoe('crack', panOf({ x, y }), 0.5);
          if (f.line.n >= f.line.max) { f.line = null; f.pointT = 12; }
        }
      }
      if (f.life <= 0) f.dead = true;
    },
    draw(f, q, vis) { drawSprite('rootman', q, 7, vis, { rot: f.line ? -0.08 : 0 }); },
  },
};

function throwBack(f, d) {
  const b = bearingOf(f.x - ship.x, f.y - ship.y);
  f.x = ship.x + Math.sin(b) * d; f.y = ship.y + Math.cos(b) * d; f.hold = 0;
  if (!g.backrooms) f.y = Math.max(45, f.y);
}
function segHitsCircle(x0, y0, x1, y1, c) {
  const q = closestOnSeg(c.x, c.y, { x1: x0, y1: y0, x2: x1, y2: y1 });
  return Math.hypot(q.x - c.x, q.y - c.y) < c.r;
}

// ---------- each frame ----------
function updateFoes(dt) {
  resetMods();
  if (g.flash > 0) g.flash -= dt;
  if (g.splat > 0) g.splat -= dt;
  if (g.spinT > 0) { g.spinT -= dt; g.mods.spinDir = g.spinDir; }
  if (g.capT > 0) { g.capT -= dt; g.mods.cap = 8; }
  if (g.attract || state !== 'play' || !g.foes) return;
  for (const k in g.foes) {
    const F = g.foes[k], K = FOE_KINDS[k];
    F.t -= dt;
    const live = F.list.filter(o => !o.dead).length;
    if (F.t <= 0 && live < K.max) {
      const o = K.spawn();
      if (o) { F.list.push(o); intro(k); }
      F.t = rand(K.every[0], K.every[1]) * Math.max(0.55, 1 - (g.n - 1) * 0.06);
    }
    if (k === 'cactusmammoth') rememberLit(F.list);
    for (const o of F.list) if (!o.dead) K.update(o, dt);
    F.list = F.list.filter(o => !o.dead);
  }
  updateHazards(dt);
}

function updateHazards(dt) {
  const keep = [];
  for (const h of g.hazards) {
    h.t += dt;
    const d = Math.hypot(h.x - ship.x, h.y - ship.y);
    if (h.kind === 'ring') {
      h.fuse -= dt;
      if (h.fuse <= 0) {
        burst(h.x, h.y, ['#ffb050', '#ff6a2a', '#e8eef8', '#c8d6e8'], 40, 16, 14);
        sfxFoe('boom', panOf(h), Math.max(0.25, 1 - d / 250)); g.shake = Math.max(g.shake, d < 60 ? 0.5 : 0.15);
        if (d < h.r + 2) foeHit('a bomb');
        continue;
      }
    } else if (h.kind === 'banana') {
      h.fuse -= dt;
      const k = 1 - h.fuse / h.dur;
      h.x = h.x0 + (h.x1 - h.x0) * k; h.y = h.y0 + (h.y1 - h.y0) * k; h.z = Math.sin(k * Math.PI) * 12;
      if (h.fuse <= 0) {
        if (Math.hypot(h.x1 - ship.x, h.y1 - ship.y) < h.r + 4) { g.splat = 3; g.capT = 5; sfxFoe('splat', 0, 1); addLog('Splat! A banana in the sails. You’ll crawl for a few seconds.', 'w'); }
        else sfxSplash(panOf(h), 0.4);
        continue;
      }
    } else {
      if (h.life != null) { h.life -= dt; if (h.life <= 0) continue; }
      if (h.vx) { h.x += h.vx * dt; h.y += h.vy * dt; }
      if (h.kind === 'slick' && d < h.r + 3 && !(g.spinT > 0)) {
        g.spinT = 2; g.spinDir = Math.random() < 0.5 ? -1 : 1; sfxFoe('slip', 0, 1);
        addLog('Banana peel! The helm is spinning.', 'w');
      }
      if (h.kind === 'egg' && d < h.r + 3) { burst(h.x, h.y, ['#f8f2dc', '#ffcf86', '#ff6a2a'], 30, 12, 9); sfxFoe('boom', 0, 0.8); foeHit('a goose egg'); continue; }
      if (h.kind === 'root') { h.grow = Math.min(1, h.grow + dt * 3); if (d < h.r + 3 && h.grow > 0.5) { foeHit('the roots'); } }
      if (h.kind === 'ice' && d < h.r + 4) {
        g.mods.slow = Math.min(g.mods.slow, 0.55);
        // the floe is solid: push the ship clear
        if (d < h.r + 2) { const nx = (ship.x - h.x) / (d || 1), ny = (ship.y - h.y) / (d || 1); ship.x = h.x + nx * (h.r + 2); ship.y = h.y + ny * (h.r + 2); }
      }
    }
    keep.push(h);
  }
  g.hazards = keep;
}

// the bell and a flare reach some of them
function foesHearBell() {
  if (!g.foes) return null;
  let said = null;
  for (const k in g.foes) {
    const K = FOE_KINDS[k];
    if (K.bell) for (const o of g.foes[k].list) { const m = !o.dead && K.bell(o); if (m) said = said || m; }
    if (K.bellHaz) {
      const n0 = g.hazards.length;
      g.hazards = g.hazards.filter(h => !(h.kind === 'egg' && Math.hypot(h.x - ship.x, h.y - ship.y) < 150));
      if (g.hazards.length < n0) said = said || 'The eggs nearby sank at the sound of the bell.';
    }
  }
  return said;
}
function foesSeeFlare(x, y) {
  if (!g.hazards) return;
  const n0 = g.hazards.length;
  g.hazards = g.hazards.filter(h => !(h.kind === 'ice' && Math.hypot(h.x - x, h.y - y) < SK.FLARE_RADIUS * 0.6));
  if (g.hazards.length < n0) addLog('The flare’s heat melted the ice around you.', 'p');
}

// ---------- drawing ----------
// a sprite standing on (or above) the water at world point q, `h` metres tall
function drawSprite(id, q, h, vis, o) {
  o = o || {};
  const img = FOE_IMG[id]; if (!img || !imgReady(img) || vis < 0.02) return;
  const hh = h * 1.5 * q.s, ww = hh * img.naturalWidth / img.naturalHeight;   // a bit larger than life, so they read at a distance
  const sink = (o.sink || 0) * hh, bob = (o.bob || 0) * q.s;
  ctx.save();
  ctx.translate(q.x, q.y - bob + sink);
  if (o.rot) ctx.rotate(o.rot);
  const fx = o.flipX == null ? 1 : (Math.abs(o.flipX) < 0.15 ? 0.15 * Math.sign(o.flipX || 1) : o.flipX);
  ctx.scale(fx, 1);
  if (!o.noReflect) { ctx.globalAlpha = vis * 0.18; ctx.save(); ctx.scale(1, -0.35); ctx.drawImage(img, -ww / 2, -hh + sink / 0.35, ww, hh); ctx.restore(); }
  ctx.globalAlpha = vis;
  if (sink > 0) { ctx.beginPath(); ctx.rect(-ww, -hh * 2, ww * 2, hh * 2 - sink); ctx.clip(); }
  ctx.drawImage(img, -ww / 2, -hh, ww, hh);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// everything this voyage's enemies have on the water, for the scene's far-to-near sort
function foeItems(add) {
  if (!g.foes) return;
  for (const k in g.foes) for (const o of g.foes[k].list) if (!o.dead) add('foe', o, o.z || 0, k);
  for (const h of g.hazards) add('hazard', h, h.z || 0);
}
function drawFoe(k, o, q) {
  const K = FOE_KINDS[k];
  const vis = K.vis ? K.vis(o) : foeVis(o, k === 'assassin');
  K.draw(o, q, vis);
}
function drawHazard(h, q) {
  const vis = Math.max(visibility(h.x, h.y), Math.max(0, 1 - Math.hypot(h.x - ship.x, h.y - ship.y) / 160) * 0.6);
  const s = q.s, k = h.r * s;
  ctx.save();
  if (h.kind === 'ring') {   // a red warning ring, tightening as the bomb falls
    const f = Math.max(0, h.fuse / 2), pulse = 0.6 + 0.4 * Math.sin(g.t * 18);
    ctx.strokeStyle = `rgba(255,70,50,${0.5 + 0.4 * pulse})`; ctx.lineWidth = Math.max(1.5, 0.3 * s);
    ctx.beginPath(); ctx.ellipse(q.x, q.y, k, k * 0.25, 0, 0, 6.28); ctx.stroke();
    ctx.globalAlpha = 0.25 + 0.2 * (1 - f); ctx.fillStyle = '#ff3a2a';
    ctx.beginPath(); ctx.ellipse(q.x, q.y, k * (1 - f), k * 0.25 * (1 - f), 0, 0, 6.28); ctx.fill();
  } else if (h.kind === 'shadow') {
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#000';
    const g2 = Math.min(1, h.t / 2.2); ctx.beginPath(); ctx.ellipse(q.x, q.y, k * (0.5 + g2), k * 0.25 * (0.5 + g2), 0, 0, 6.28); ctx.fill();
  } else if (h.kind === 'slick') {
    ctx.globalAlpha = Math.min(1, vis + 0.3) * Math.min(1, h.life / 3);
    ctx.fillStyle = 'rgba(255,220,80,0.55)'; ctx.beginPath(); ctx.ellipse(q.x, q.y, k, k * 0.22, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#f2d03a'; for (let i = 0; i < 3; i++) { const a = i * 2.1 + h.x; ctx.fillRect(q.x + Math.cos(a) * k * 0.5, q.y + Math.sin(a) * k * 0.08, Math.max(2, k * 0.25), Math.max(1, k * 0.08)); }
  } else if (h.kind === 'egg') {
    const e = Math.max(2, 1.4 * s), bob = Math.sin(g.t * 2 + h.x) * 0.15 * s;
    lamp(q.x, q.y - e * 0.5, '#ffd27a', Math.max(1.5, e * 0.5));
    ctx.globalAlpha = Math.max(0.6, vis); ctx.fillStyle = '#f4eedc';
    ctx.beginPath(); ctx.ellipse(q.x, q.y - e * 0.6 - bob, e * 0.7, e, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#c8402a'; ctx.fillRect(q.x - e * 0.15, q.y - e * 1.4 - bob, e * 0.3, e * 0.3);
  } else if (h.kind === 'ice') {
    ctx.globalAlpha = Math.max(0.5, vis) * Math.min(1, h.life / 3);
    ctx.fillStyle = '#cfe8f4'; ctx.beginPath();
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, rr = k * (0.75 + 0.25 * Math.sin(h.ph + i * 1.7)); const px = q.x + Math.cos(a) * rr, py = q.y + Math.sin(a) * rr * 0.25 - (i % 2 ? 0 : 0.6 * s); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(q.x - k * 0.3, q.y - 0.8 * s, k * 0.4, Math.max(1, 0.3 * s));
  } else if (h.kind === 'root') {
    const gw = h.grow * Math.min(1, h.life / 2), tall = 5 * s * gw;
    ctx.globalAlpha = Math.max(0.5, vis); ctx.strokeStyle = '#4a3420'; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { ctx.lineWidth = Math.max(1.5, 0.6 * s); ctx.beginPath(); ctx.moveTo(q.x + i * k * 0.4, q.y); ctx.quadraticCurveTo(q.x + i * k * 0.9, q.y - tall * 0.6, q.x + i * k * 0.2 + Math.sin(h.x + i) * k * 0.3, q.y - tall); ctx.stroke(); }
    ctx.fillStyle = 'rgba(60,90,40,0.8)'; ctx.beginPath(); ctx.arc(q.x, q.y - tall, Math.max(1, 0.5 * s * gw), 0, 6.28); ctx.fill();
  } else if (h.kind === 'banana') {
    const img = FOE_IMG.bananaape; const e = Math.max(3, 1.2 * s);
    ctx.globalAlpha = 1; ctx.fillStyle = '#f2d03a'; ctx.translate(q.x, q.y); ctx.rotate(g.t * 8);
    ctx.beginPath(); ctx.ellipse(0, 0, e, e * 0.35, 0, 0, 6.28); ctx.fill();
  }
  ctx.restore();
}

// screen overlays: the Informer's flash and a banana in the sails
function drawFoeOverlays() {
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, g.flash / 1.5)})`; ctx.fillRect(0, 0, W, H); }
  if (g.splat > 0) {
    const a = Math.min(1, g.splat / 1.2);
    ctx.save(); ctx.globalAlpha = a * 0.85;
    for (let i = 0; i < 9; i++) {
      const x = W * (0.25 + hash(i, 31) * 0.5), y = H * (0.2 + hash(i, 32) * 0.45), r = Math.min(W, H) * (0.05 + hash(i, 33) * 0.08);
      ctx.fillStyle = i % 3 ? '#f2d03a' : '#e8c05a';
      ctx.beginPath(); ctx.ellipse(x, y + (3 - g.splat) * 20 * hash(i, 34), r, r * 0.7, hash(i, 35) * 3, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }
}

// the voyage's line-up, for the log at the start
function trioLine() {
  if (!g.trio) return '';
  const n = g.trio.map(k => FOE_NAMES[k]);
  return 'Tonight: ' + n[0] + ', ' + n[1] + ' and ' + n[2] + '.';
}
