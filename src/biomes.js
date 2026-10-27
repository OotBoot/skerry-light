// Biomes: the first voyage is always Skerry Light's own grey rocks; after that the voyages go round
// six different seas in turn. Each has its own sky, water, coast, rock skin and weather.
// Pure looks: rocks, routes and enemies are the same whatever the biome.

const BIOMES = {
  skerry: {
    name: 'Skerry Light', intro: '',
    sky: ['#02040a', '#060c1c', '#0e1a36', '#1a2744'],
    sea: ['#15213a', '#0b1528', '#060d1b', '#03070f'],
    glitter: '225,230,240', haze: '70,92,135', dust: '200,210,235', star: '236,232,215', cloud: '150,165,195', halo: '220,226,240',
    waves: '170,200,235', beam: '120,150,190',
    ground: '#05080a', cliff: ['#081009', '#09120b'], cliffTop: 'rgba(120,140,170,0.12)', cliffH: 1, topDepth: 1.5,
    head: ['#0a110c', '#0c140e'], surf: '210,225,240', wall: '#0d1210', roof: '#151a17', win: '#ffc46e',
    rock: { g: ['#5a5f68', '#33373e', '#14161a'], facet: 'rgba(150,158,170,0.22)', crack: 'rgba(20,22,26,0.5)', rim: '255,224,165', band: 'rgba(20,34,24,0.85)', foam: '210,225,242', kind: 'stone', h: 1 },
    fx: 'drizzle', land: null,
  },
  fjord: {
    name: 'the Frozen Fjord', intro: 'Ice in the water tonight. The rocks are bergs, and they are harder than they look.',
    sky: ['#010509', '#03101a', '#082636', '#134050'],
    sea: ['#1b3c4a', '#0d2633', '#061722', '#020a10'],
    glitter: '215,240,255', haze: '110,170,190', dust: '200,235,245', star: '230,245,255', cloud: '170,200,215', halo: '210,240,255', moonTint: '#d6efff',
    waves: '190,230,245', beam: '130,180,205',
    ground: '#0b151a', cliff: ['#1a2a34', '#1e313c'], cliffTop: 'rgba(232,246,255,0.6)', cliffH: 1.25, topDepth: 5,
    head: ['#16252d', '#1a2b34'], surf: '225,245,255', wall: '#1a2328', roof: '#dce8ee', win: '#ffd28e',
    rock: { g: ['#e4f4fb', '#8dbbd2', '#2a5370'], facet: 'rgba(255,255,255,0.38)', crack: 'rgba(40,100,140,0.55)', rim: '200,240,255', band: 'rgba(30,80,110,0.7)', foam: '225,245,255', kind: 'ice', h: 1.45 },
    fx: 'snow', aurora: ['80,255,170', '60,200,255'], land: 'peaks',
  },
  ember: {
    name: 'the Ember Isles', intro: 'The sky is red over the mountain. The rocks here are black glass, still warm inside.',
    sky: ['#050102', '#130405', '#310b07', '#621a0b'],
    sea: ['#2c130e', '#180a08', '#0c0505', '#050202'],
    glitter: '255,150,90', haze: '170,60,30', dust: '255,190,160', star: '255,220,200', cloud: '120,70,60', halo: '255,150,110', moonTint: '#ff7b55',
    waves: '255,150,110', beam: '200,120,90',
    ground: '#070404', cliff: ['#150c0b', '#190e0c'], cliffTop: 'rgba(255,100,40,0.22)', cliffH: 1.1, topDepth: 1.5,
    head: ['#130a09', '#170c0a'], surf: '255,190,160', wall: '#120a09', roof: '#1c100d', win: '#ff9548',
    rock: { g: ['#4c3e3f', '#231b1c', '#0b0808'], facet: 'rgba(120,95,95,0.25)', crack: 'rgba(8,4,4,0.7)', rim: '255,150,80', band: 'rgba(40,12,8,0.9)', foam: '255,200,170', kind: 'basalt', h: 1.15 },
    fx: 'ash', glow: '255,80,30', land: 'volcano',
  },
  lagoon: {
    name: 'the Coral Lagoon', intro: 'Warm water, glowing where you cut it. The reefs are pretty, and just as hard as rock.',
    sky: ['#01060e', '#04142a', '#0a2c48', '#134a66'],
    sea: ['#0f505c', '#0a3a44', '#062a32', '#02141a'],
    glitter: '210,250,255', haze: '80,180,200', dust: '200,240,250', star: '240,250,240', cloud: '140,190,210', halo: '220,245,255',
    waves: '140,255,240', beam: '110,190,200',
    ground: '#0d130f', cliff: ['#2c2b1f', '#302f22'], cliffTop: 'rgba(235,225,185,0.28)', cliffH: 0.32, topDepth: 1,
    head: ['#1f1f17', '#232319'], surf: '200,255,245', wall: '#2a2216', roof: '#3a3020', win: '#ffd890',
    rock: { g: ['#e8957c', '#a04a58', '#3c1828'], facet: 'rgba(255,205,185,0.25)', crack: 'rgba(80,20,40,0.35)', rim: '255,224,180', band: 'rgba(20,70,70,0.8)', foam: '190,255,245', kind: 'coral', h: 0.95 },
    fx: 'fireflies', biolum: true, land: 'palms',
  },
  barrows: {
    name: 'the Barrow Shore', intro: 'Fog off the graveyard. Some of these rocks have names cut into them.',
    sky: ['#060807', '#0e1211', '#1e2423', '#353d3b'],
    sea: ['#1f2826', '#131a18', '#0a0e0d', '#040606'],
    glitter: '200,215,200', haze: '130,145,140', dust: '190,200,195', star: '210,220,210', cloud: '120,135,130', halo: '200,215,205', moonTint: '#c4d0c0',
    waves: '170,190,180', beam: '130,150,140',
    ground: '#060807', cliff: ['#0e120f', '#101411'], cliffTop: 'rgba(150,165,150,0.12)', cliffH: 0.8, topDepth: 1.5,
    head: ['#0d110e', '#0f130f'], surf: '200,215,205', wall: '#141815', roof: '#0c0f0d', win: '#b6e09a',
    rock: { g: ['#767b6e', '#42473e', '#171a15'], facet: 'rgba(175,185,160,0.18)', crack: 'rgba(15,18,14,0.6)', rim: '225,230,200', band: 'rgba(42,72,30,0.9)', foam: '205,215,210', kind: 'grave', h: 1 },
    fx: 'fog', land: 'graves', cloudy: 1,
  },
  shoals: {
    name: 'the Crystal Shoals', intro: 'The rocks are singing. Crystal, all of it, lit from the inside.',
    sky: ['#04010a', '#0e0420', '#22104a', '#3a1a6c'],
    sea: ['#26165e', '#150b3c', '#0a0626', '#040212'],
    glitter: '225,190,255', haze: '150,100,220', dust: '220,200,255', star: '240,225,255', cloud: '150,120,210', halo: '220,190,255', moonTint: '#e2c8ff',
    waves: '200,170,255', beam: '160,130,220',
    ground: '#06040c', cliff: ['#130c24', '#170f2a'], cliffTop: 'rgba(170,130,255,0.22)', cliffH: 1, topDepth: 1.5,
    head: ['#120b20', '#150d26'], surf: '215,200,255', wall: '#151024', roof: '#1e1634', win: '#cfa8ff',
    rock: { g: ['#4d3c7c', '#251a4a', '#0c0820'], facet: 'rgba(185,145,255,0.25)', crack: 'rgba(120,240,255,0.45)', rim: '225,185,255', band: 'rgba(20,10,50,0.85)', foam: '205,195,255', kind: 'crystal', h: 1 },
    fx: 'motes', aurora: ['255,90,210', '140,90,255'], moon2: true, land: 'spires',
  },
  // the rare one: one voyage in twenty (never the first) you sail through a portal into the Nether
  nether: {
    name: 'the Nether', intro: 'Through the portal. A sea of lava under a roof of red rock, and lava pouring down out of it. The lighthouse came with you.',
    sky: ['#0b0202', '#170404', '#260806', '#3a0e09'],
    sea: ['#6a1c06', '#401004', '#240703', '#120302'],
    glitter: '255,170,60', haze: '255,90,30', dust: '255,120,60', star: '255,180,90', cloud: '90,30,20', halo: '255,120,60',
    waves: '255,180,80', beam: '255,150,80',
    ground: '#1a0504', cliff: ['#3a0d0a', '#430f0b'], cliffTop: 'rgba(255,110,40,0.25)', cliffH: 1.4, topDepth: 2,
    head: ['#2e0a08', '#360c09'], surf: '255,170,80', wall: '#2a0a08', roof: '#1a0605', win: '#ffb040',
    rock: { g: ['#7e2219', '#4a120d', '#1c0605'], facet: 'rgba(255,120,90,0.12)', crack: 'rgba(30,6,4,0.6)', rim: '255,170,90', band: 'rgba(255,110,30,0.55)', foam: '255,160,70', kind: 'nether', h: 1.3, blocky: true },
    fx: 'ash', glow: '255,70,20', land: 'lavafalls', cavern: true, lavaSea: true,
  },
};
const NETHER_CHANCE = 1 / 20;
const NETHER_FORCE = (() => { try { return /[?&#]nether\b/.test(location.href); } catch (e) { return false; } })();
const BIOME_ORDER = ['skerry', 'fjord', 'ember', 'lagoon', 'barrows', 'shoals'];
const BIOME_FORCE = (() => { try { const m = location.search.match(/[?&]biome=(\w+)/); return m && BIOMES[m[1]] ? m[1] : null; } catch (e) { return null; } })();

// voyage 1 is always Skerry Light; after that they go round all six in turn, so a crew sees the same sea
function biomeFor(n, attract) {
  if (BIOME_FORCE) return BIOME_FORCE;
  if (attract || n <= 1) return 'skerry';
  return BIOME_ORDER[(n - 1) % BIOME_ORDER.length];
}
function curBiome() {
  if (!g || g.backrooms) return BIOMES.skerry;
  // on the way through the portal you're still in the sea you came from
  if (g.portal && !g.portal.through) return BIOMES[g.portal.from] || BIOMES.skerry;
  return BIOMES[g.biome] || BIOMES.skerry;
}
function biomeLine() {
  if (g && g.portal && !g.portal.through) return 'A ring of black stone stands up out of the water dead ahead, full of swirling purple light. You are sailing straight into it.';
  const B = curBiome(); return B.intro ? B.name[0].toUpperCase() + B.name.slice(1) + '. ' + B.intro : ''; }

// one in twenty voyages after the first goes to the Nether; rolled from the crew's seed so a crew goes together
function rollNether(n, attract, seed) {
  if (attract) return false;
  if (seed == null && NETHER_FORCE) return true;
  if (n <= 1) return false;
  const r = seed != null ? seeded((seed ^ 0x2545f491) >>> 0)() : Math.random();
  return r < NETHER_CHANCE;
}

// ---------- the landscape behind the coast ----------
const LAND = { peaks: [], volcano: [], palms: [], graves: [], spires: [], church: { x: 420, y: -150 } };
(() => {
  // far mountains (the fjord): two ranges, the nearer one darker
  for (let x = -4200; x <= 4200; x += rand(260, 420)) LAND.peaks.push({ x, y: -900 - rand(0, 300), w: rand(260, 480), h: rand(240, 480), far: 1 });
  for (let x = -3000; x <= 3000; x += rand(220, 360)) LAND.peaks.push({ x, y: -380 - rand(0, 120), w: rand(180, 300), h: rand(120, 260), far: 0 });
  for (let i = 0; i < 70; i++) { const a = rand(-Math.PI, Math.PI), d = rand(1500, 3200); LAND.lavafalls = LAND.lavafalls || []; LAND.lavafalls.push({ x: Math.sin(a) * d, y: Math.cos(a) * d + 900, w: rand(6, 18), ph: rand(0, 6) }); }
  for (let i = 0; i < 26; i++) { LAND.glow = LAND.glow || []; LAND.glow.push({ b: rand(-Math.PI, Math.PI), e: rand(0.25, 0.75), s: rand(0.6, 1.6), seed: (Math.random() * 1e6) | 0 }); }
  LAND.volcano.push({ x: -650, y: -1500, w: 1100, h: 640, top: 0.12 }, { x: 1600, y: -1150, w: 600, h: 300, top: 0.15 });
  for (let x = -2400; x <= 2400; x += rand(40, 110)) LAND.palms.push({ x, h: rand(9, 16), lean: rand(-0.35, 0.35), ph: rand(0, 6) });
  for (let x = -2400; x <= 2400; x += rand(70, 170)) LAND.graves.push({ x, h: rand(12, 22), ph: rand(0, 6), br: 2 + Math.floor(rand(0, 3)) });
  for (let x = -3600; x <= 3600; x += rand(200, 380)) LAND.spires.push({ x, y: -500 - rand(0, 500), w: rand(18, 45), h: rand(160, 420), lean: rand(-0.12, 0.12), hue: Math.random() < 0.5 ? 0 : 1 });
  for (let x = -2200; x <= 2200; x += rand(120, 260)) LAND.spires.push({ x, w: rand(4, 9), h: rand(25, 70), lean: rand(-0.2, 0.2), hue: Math.random() < 0.5 ? 0 : 1, near: 1 });
})();

// where the cliff top is at a given x along the coast (things that stand on it sit there)
function cliffAt(x) { const i = Math.max(0, Math.min(cliffs.length - 1, Math.round((x + 3200) / 80))); return cliffs[i]; }
const onCam = (x, y, z) => { const c = cam(x, y, z); return c.f > SK.NEAR ? proj(c) : null; };

// the far landscape: drawn after the ground, before the cliffs
function drawLandFar(B) {
  if (B.land === 'peaks') {
    for (const far of [1, 0]) for (const p of LAND.peaks) {
      if (p.far !== far) continue;
      const body = far ? '#13232c' : '#0e1b22', snow = far ? 'rgba(205,228,240,0.55)' : 'rgba(225,240,250,0.75)';
      fillPoly([[p.x - p.w, p.y, 0], [p.x, p.y, p.h], [p.x + p.w, p.y, 0]], body);
      // a snowfield on the upper slopes, ragged along its lower edge
      const k = 0.36, sx = p.w * k;
      fillPoly([[p.x - sx, p.y, p.h * (1 - k)], [p.x - sx * 0.5, p.y, p.h * (1 - k * 0.7)], [p.x - sx * 0.1, p.y, p.h * (1 - k * 1.15)], [p.x + sx * 0.35, p.y, p.h * (1 - k * 0.75)], [p.x + sx, p.y, p.h * (1 - k)], [p.x, p.y, p.h]], snow);
      // moonlit side
      fillPoly([[p.x, p.y, p.h], [p.x + p.w, p.y, 0], [p.x + p.w * 0.55, p.y, 0]], 'rgba(150,190,215,0.08)');
    }
  } else if (B.land === 'volcano') {
    for (const v of LAND.volcano) {
      const tw = v.w * v.top;
      fillPoly([[v.x - v.w, v.y, 0], [v.x - tw, v.y, v.h], [v.x + tw, v.y, v.h], [v.x + v.w, v.y, 0]], '#150a09');
      fillPoly([[v.x + tw, v.y, v.h], [v.x + v.w, v.y, 0], [v.x + v.w * 0.5, v.y, 0]], 'rgba(255,90,40,0.05)');
      const top = onCam(v.x, v.y, v.h); if (!top) continue;
      // rivers of lava down the flanks
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = Math.max(1, 3 * top.s);
      for (let i = 0; i < 4; i++) {
        const sx = (i - 1.5) * tw * 0.6, pulse = 0.55 + 0.25 * Math.sin(g.t * 1.3 + i * 1.7);
        ctx.strokeStyle = `rgba(255,${90 + i * 20},30,${pulse})`;
        ctx.beginPath();
        for (let s = 0; s <= 8; s++) {
          const f = s / 8, x = v.x + sx + (sx * 3 + Math.sin(i * 3 + f * 5) * v.w * 0.05) * f, z = v.h * (1 - f * 0.92);
          const q = onCam(x, v.y + 1, z); if (!q) continue;
          s ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        }
        ctx.stroke();
      }
      // the crater's glow and a column of lit smoke
      lamp(top.x, top.y, '#ff6a28', Math.max(4, tw * top.s * 0.5));
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 7; i++) {
        const k = ((g.t * 0.05 + i / 7) % 1), q = onCam(v.x + k * v.w * 0.5 + Math.sin(i * 2) * tw * 0.4, v.y, v.h + k * v.h * 0.9); if (!q) continue;
        const r = (tw * 0.6 + k * v.w * 0.35) * q.s;
        const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
        gr.addColorStop(0, `rgba(${90 - k * 40 | 0},${40 - k * 20 | 0},${36 - k * 16 | 0},${0.5 * (1 - k)})`); gr.addColorStop(1, 'rgba(40,20,18,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 6.28); ctx.fill();
      }
    }
  } else if (B.land === 'spires') {
    for (const s of LAND.spires) if (!s.near) spire(s);
  } else if (B.land === 'lavafalls') {
    drawLavafalls();
  } else if (B.land === 'graves') {
    // a ruined chapel up on the shore, its tower broken off
    const c = LAND.church;
    fillPoly([[c.x - 30, c.y, 0], [c.x + 30, c.y, 0], [c.x + 30, c.y, 26], [c.x - 30, c.y, 26]], '#0b0e0c');
    fillPoly([[c.x - 32, c.y, 26], [c.x + 10, c.y, 26], [c.x - 8, c.y, 40]], '#0a0d0b');
    fillPoly([[c.x + 18, c.y, 0], [c.x + 34, c.y, 0], [c.x + 34, c.y, 58], [c.x + 29, c.y, 63], [c.x + 24, c.y, 55], [c.x + 18, c.y, 60]], '#0c0f0d');
    for (const wx of [-18, -4, 26]) { const q = onCam(c.x + wx, c.y + 0.1, wx > 20 ? 44 : 14); if (q) { ctx.fillStyle = 'rgba(160,220,140,0.35)'; ctx.fillRect(q.x - 2 * q.s, q.y - 4 * q.s, 4 * q.s, 7 * q.s); } }
  }
}

function spire(s) {
  if (s.near && s.y == null) { const cl = cliffAt(s.x); s.y = cl.y - 1; s.z0 = cl.z; }
  const z0 = s.z0 || 0, y = s.y;
  const pts = [[s.x - s.w, y, z0], [s.x - s.w * 0.4 + s.lean * s.h * 0.5, y, z0 + s.h * 0.85], [s.x + s.lean * s.h, y, z0 + s.h], [s.x + s.w * 0.5 + s.lean * s.h * 0.4, y, z0 + s.h * 0.7], [s.x + s.w, y, z0]];
  fillPoly(pts, s.near ? 'rgba(70,40,130,0.85)' : 'rgba(46,26,92,0.9)');
  fillPoly([pts[0], pts[1], pts[2], [s.x, y, z0]], s.hue ? 'rgba(120,240,255,0.12)' : 'rgba(255,120,220,0.12)');
  const tip = onCam(s.x + s.lean * s.h, y, z0 + s.h); if (!tip) return;
  ctx.globalCompositeOperation = 'lighter';
  lamp(tip.x, tip.y, s.hue ? '#7ae6ff' : '#ff7ad8', Math.max(1.5, (s.near ? 3 : 8) * Math.sqrt(tip.s)) * (0.8 + 0.2 * Math.sin(g.t * 2 + s.x)));
  ctx.globalCompositeOperation = 'source-over';
}

// things standing on the cliff tops: drawn after the cliffs
function drawLandNear(B) {
  if (B.land === 'palms') {
    for (const p of LAND.palms) {
      const cl = cliffAt(p.x), py = cl.y - 1, pz = cl.z * B.cliffH;
      const base = onCam(p.x, py, pz); if (!base || base.x < -80 || base.x > W + 80) continue;
      const sway = Math.sin(g.t * 0.8 + p.ph) * 0.05;
      const tx = p.x + (p.lean + sway) * p.h, top = onCam(tx, py, pz + p.h); if (!top) continue;
      ctx.strokeStyle = '#0c0f0a'; ctx.lineWidth = Math.max(1, 0.8 * base.s); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.quadraticCurveTo(base.x, (base.y + top.y) / 2, top.x, top.y); ctx.stroke();
      ctx.lineWidth = Math.max(1, 0.6 * top.s);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28 + p.ph, len = (5 + (i % 2)) * top.s, dx = Math.cos(a) * len, droop = (2 + Math.abs(Math.sin(a)) * 2) * top.s;
        ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(top.x + dx * 0.6, top.y - Math.abs(Math.sin(a)) * len * 0.3 - top.s * 1.5, top.x + dx, top.y + droop); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  } else if (B.land === 'graves') {
    for (const t of LAND.graves) {
      const cl = cliffAt(t.x), ty = cl.y - 1, tz = cl.z * B.cliffH;
      const base = onCam(t.x, ty, tz); if (!base || base.x < -80 || base.x > W + 80) continue;
      const top = onCam(t.x, ty, tz + t.h); if (!top) continue;
      ctx.strokeStyle = '#080a09'; ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1, 1.1 * base.s);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.lineWidth = Math.max(0.7, 0.45 * base.s);
      for (let i = 0; i < t.br; i++) {
        const f = 0.45 + i * 0.18, sx = top.x, sy = base.y + (top.y - base.y) * f, d = (i % 2 ? 1 : -1), L = (5 + i) * base.s;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + d * L * 0.7, sy - L * 0.6); ctx.lineTo(sx + d * L, sy - L * 0.5 + Math.sin(t.ph) * L * 0.2); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  } else if (B.land === 'spires') {
    for (const s of LAND.spires) if (s.near) spire(s);
  }
}

// columns of lava pouring out of the roof into the sea, far off all round
function drawLavafalls() {
  const list = LAND.lavafalls.map(f => ({ f, c: cam(f.x, f.y, 0) })).filter(o => o.c.f > 20).sort((a, b) => b.c.f - a.c.f);
  ctx.globalCompositeOperation = 'lighter';
  for (const { f, c } of list) {
    const b = proj(c); if (b.x < -200 || b.x > W + 200) continue;
    const w = Math.max(1.5, f.w * b.s), top = -10;
    const fade = Math.max(0.25, 1 - c.f / 3600);
    // a wide soft glow, then the bright core
    const gl = ctx.createLinearGradient(b.x - w * 4, 0, b.x + w * 4, 0);
    gl.addColorStop(0, 'rgba(255,90,20,0)'); gl.addColorStop(0.5, `rgba(255,110,30,${0.22 * fade})`); gl.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = gl; ctx.fillRect(b.x - w * 4, top, w * 8, b.y - top);
    const core = ctx.createLinearGradient(b.x - w / 2, 0, b.x + w / 2, 0);
    core.addColorStop(0, `rgba(255,120,20,${0.7 * fade})`); core.addColorStop(0.5, `rgba(255,${200 + 30 * Math.sin(g.t * 3 + f.ph) | 0},90,${0.95 * fade})`); core.addColorStop(1, `rgba(255,120,20,${0.7 * fade})`);
    ctx.fillStyle = core; ctx.fillRect(b.x - w / 2, top, w, b.y - top);
    // the splash where it lands
    lamp(b.x, b.y, '#ff7a20', Math.max(2, w * 0.9) * fade);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// the roof of the cavern: blocky red rock, with clumps of glowing stone hanging from it
function drawCavernRoof(B) {
  if (!GFX.rack) {
    const T = 96, c = offscreen(T, T), q = c.getContext('2d');
    for (let y = 0; y < T; y += 8) for (let x = 0; x < T; x += 8) {
      const v = Math.random(); q.fillStyle = v < 0.08 ? '#5a1510' : v < 0.5 ? '#2a0806' : v < 0.85 ? '#330a07' : '#1d0504';
      q.fillRect(x, y, 8, 8);
    }
    GFX.rack = c; GFX.rackPat = ctx.createPattern(c, 'repeat');
  }
  const y1 = hy - Math.max(30, H * 0.06);
  ctx.save();
  ctx.translate(-yaw * focal * 0.5, 0);
  ctx.fillStyle = GFX.rackPat; ctx.fillRect(yaw * focal * 0.5 - W, -H, W * 3, y1 + H);
  ctx.restore();
  // the roof fades into red haze towards the horizon
  const hz = ctx.createLinearGradient(0, 0, 0, hy);
  hz.addColorStop(0, 'rgba(20,4,3,0.55)'); hz.addColorStop(0.6, 'rgba(60,12,8,0.5)'); hz.addColorStop(1, 'rgba(120,30,12,0.95)');
  ctx.fillStyle = hz; ctx.fillRect(-W, -H, W * 3, hy + H);
  // glowstone clumps
  for (const s of LAND.glow) {
    const p = skyPos(s.b, s.e); if (!p || p.y > hy - 20) continue;
    const z = focal * 0.012 * s.s;
    ctx.globalCompositeOperation = 'lighter';
    lamp(p.x, p.y, '#ffb84a', z * 1.6);
    ctx.globalCompositeOperation = 'source-over';
    let k = s.seed;
    for (let i = 0; i < 14; i++) {
      k = (k * 1103515245 + 12345) & 0x7fffffff;
      const dx = ((k % 9) - 4) * z * 0.45, dy = (((k >> 4) % 7) - 2) * z * 0.45;
      ctx.fillStyle = i % 3 ? '#ffd76a' : '#fff2a8'; ctx.fillRect(p.x + dx, p.y + dy, z * 0.45, z * 0.45);
    }
  }
}

// ---------- the sky ----------
function drawSkyExtras(B) {
  if (B.aurora && !reduceMotion) {
    // curtains of light across part of the sky, rippling slowly
    const g0 = ctx.createLinearGradient(0, hy - Math.tan(0.62) * focal, 0, hy - Math.tan(0.1) * focal);
    g0.addColorStop(0, `rgba(${B.aurora[1]},0)`); g0.addColorStop(0.5, `rgba(${B.aurora[1]},0.2)`); g0.addColorStop(0.85, `rgba(${B.aurora[0]},0.35)`); g0.addColorStop(1, `rgba(${B.aurora[0]},0)`);
    ctx.fillStyle = g0; ctx.globalCompositeOperation = 'lighter';
    const y0 = hy - Math.tan(0.62) * focal, y1 = hy - Math.tan(0.1) * focal;
    for (let i = 0; i < 120; i++) {
      const b = -1.1 + i * 0.018 + Math.sin(i * 0.15 + g.t * 0.2) * 0.04;
      const p = skyPos(b + Math.PI, 0.3); if (!p) continue;
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(i * 0.23 + g.t * 0.6) * Math.sin(i * 0.07 - g.t * 0.25));
      const lift = Math.sin(i * 0.09 + g.t * 0.3) * (y1 - y0) * 0.18;
      ctx.globalAlpha = a; ctx.fillRect(p.x, y0 + lift, Math.max(2, focal * 0.022), (y1 - y0) * (0.7 + 0.3 * Math.sin(i * 0.4)));
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (B.glow) {
    const gr = ctx.createLinearGradient(0, hy - H * 0.3, 0, hy + 4);
    gr.addColorStop(0, `rgba(${B.glow},0)`); gr.addColorStop(1, `rgba(${B.glow},${0.22 + 0.04 * Math.sin(g.t * 0.9)})`);
    ctx.fillStyle = gr; ctx.fillRect(-W, hy - H * 0.3, W * 3, H * 0.3 + 4);
  }
  if (B.moon2) {
    const p = skyPos(MOON.b + 0.5, 0.42);
    if (p) { const r = Math.max(6, focal * 0.009); lamp(p.x, p.y, '#9ad8ff', r * 0.9); ctx.fillStyle = '#d8f2ff'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.28); ctx.fill(); }
  }
}

// ---------- rock skins ----------
// called inside the rock's clip, after the base shading
function rockSkinInside(B, r, x, y, w, h) {
  const k = B.rock.kind;
  const topAt = i => ({ x: x - w / 2 + w * i / (r.prof.length - 1), y: y - r.prof[i] * h });
  if (k === 'ice') {
    // blue light deep inside, and snow lying along the top
    const ig = ctx.createRadialGradient(x, y - h * 0.35, 0, x, y - h * 0.35, w * 0.45);
    ig.addColorStop(0, 'rgba(120,220,255,0.35)'); ig.addColorStop(1, 'rgba(120,220,255,0)');
    ctx.fillStyle = ig; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = 'rgba(248,252,255,0.9)'; ctx.beginPath();
    r.prof.forEach((v, i) => { const p = topAt(i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    for (let i = r.prof.length - 1; i >= 0; i--) { const p = topAt(i); ctx.lineTo(p.x, p.y + h * (0.08 + 0.06 * Math.abs(Math.sin(r.ph * 5 + i * 2)))); }
    ctx.fill();
  } else if (k === 'basalt') {
    // stacked columns, with glowing cracks of lava between them
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(0.6, w * 0.01); ctx.beginPath();
    for (let i = 1; i < 7; i++) { const cx_ = x - w / 2 + w * i / 7; ctx.moveTo(cx_, y); ctx.lineTo(cx_ + w * 0.01, y - h); }
    ctx.stroke();
    const pulse = 0.55 + 0.35 * Math.sin(g.t * 2.1 + r.ph * 3);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,${110 + 40 * pulse | 0},40,${0.75 * pulse})`; ctx.lineWidth = Math.max(0.8, w * 0.014);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      let px = x - w * 0.3 + w * 0.28 * i, py = y - h * (0.75 - i * 0.1);
      ctx.moveTo(px, py);
      for (let s = 0; s < 4; s++) { px += Math.sin(r.ph * 7 + i * 3 + s * 2) * w * 0.06; py += h * 0.16; ctx.lineTo(px, py); }
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  } else if (k === 'coral') {
    // knobbly polyps all over, a few faintly glowing
    for (let i = 0; i < 22; i++) {
      const fx = x - w * 0.45 + w * 0.9 * ((Math.sin(r.ph * 13 + i * 7.3) + 1) / 2), fy = y - h * ((Math.sin(r.ph * 5 + i * 3.1) + 1) / 2) * 0.9;
      const rr = Math.max(0.8, Math.min(7, w * (0.01 + 0.007 * ((i * 7) % 3))));
      ctx.fillStyle = i % 5 === 0 ? 'rgba(140,255,230,0.55)' : i % 2 ? 'rgba(255,190,170,0.4)' : 'rgba(90,20,40,0.35)';
      ctx.beginPath(); ctx.arc(fx, fy, rr, 0, 6.28); ctx.fill();
    }
  } else if (k === 'grave') {
    // moss and lichen creeping up from the water
    for (let i = 0; i < 16; i++) {
      const fx = x - w * 0.48 + w * 0.96 * ((Math.sin(r.ph * 11 + i * 5.7) + 1) / 2), fy = y - h * (0.1 + 0.5 * ((Math.sin(r.ph * 3 + i * 2.3) + 1) / 2) ** 2);
      ctx.fillStyle = i % 3 ? 'rgba(60,95,40,0.55)' : 'rgba(170,175,110,0.35)';
      ctx.beginPath(); ctx.ellipse(fx, fy, Math.max(1, w * 0.06), Math.max(0.7, w * 0.025), 0, 0, 6.28); ctx.fill();
    }
  } else if (k === 'nether') {
    // netherrack blocks, a few glowing with ore, and a vein of lava
    const bs = Math.max(3, w / 9);
    for (let by = y - h; by < y; by += bs) for (let bx = x - w / 2; bx < x + w / 2; bx += bs) {
      const v = Math.abs(Math.sin(bx * 12.9898 / bs + by * 78.233 / bs + r.ph * 43.1)) % 1;
      if (v < 0.07) { ctx.fillStyle = `rgba(255,${180 + 40 * Math.sin(g.t * 2 + v * 50) | 0},70,0.85)`; ctx.fillRect(bx + bs * 0.2, by + bs * 0.2, bs * 0.6, bs * 0.6); }
      else { ctx.fillStyle = v < 0.4 ? 'rgba(0,0,0,0.22)' : v < 0.7 ? 'rgba(255,90,60,0.1)' : 'rgba(0,0,0,0.08)'; ctx.fillRect(bx, by, bs - 0.5, bs - 0.5); }
    }
  } else if (k === 'crystal') {
    // light moving through the stone
    const sweep = ((g.t * 0.35 + r.ph) % 2) - 0.5;
    const sg = ctx.createLinearGradient(x - w / 2 + sweep * w, y - h, x - w / 2 + sweep * w + w * 0.3, y);
    sg.addColorStop(0, 'rgba(160,240,255,0)'); sg.addColorStop(0.5, 'rgba(160,240,255,0.3)'); sg.addColorStop(1, 'rgba(160,240,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - w / 2, y - h, w, h);
  }
}

// after the clip: things that stick up out of the rock's outline
function rockSkinOutside(B, r, x, y, w, h) {
  const k = B.rock.kind;
  let hi = 0; r.prof.forEach((v, i) => { if (v > r.prof[hi]) hi = i; });
  const tx = x - w / 2 + w * hi / (r.prof.length - 1), ty = y - r.prof[hi] * h;
  if (k === 'coral') {
    // branching fingers on the top
    ctx.strokeStyle = '#c86a6a'; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const j = Math.min(r.prof.length - 1, Math.max(0, hi - 2 + i + (i > 1 ? 1 : 0)));
      const bx = x - w / 2 + w * j / (r.prof.length - 1), by = y - r.prof[j] * h + h * 0.03, L = h * (0.25 + 0.1 * Math.sin(r.ph + i)), lean = Math.sin(r.ph * 3 + i) * 0.5;
      ctx.lineWidth = Math.max(1, w * 0.03);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + lean * L * 0.4, by - L);
      ctx.moveTo(bx + lean * L * 0.2, by - L * 0.5); ctx.lineTo(bx + lean * L * 0.2 + L * 0.3, by - L * 0.85);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,170,150,0.9)'; ctx.beginPath(); ctx.arc(bx + lean * L * 0.4, by - L, Math.max(1, w * 0.02), 0, 6.28); ctx.fill();
    }
    ctx.lineCap = 'butt';
  } else if (k === 'grave') {
    // a leaning headstone on the summit
    const sw = w * 0.16, sh = h * 0.45, lean = Math.sin(r.ph * 4) * 0.18;
    ctx.save(); ctx.translate(tx, ty + h * 0.06); ctx.rotate(lean);
    ctx.fillStyle = '#5c6058';
    ctx.beginPath(); ctx.moveTo(-sw / 2, 0); ctx.lineTo(-sw / 2, -sh * 0.75); ctx.arc(0, -sh * 0.75, sw / 2, Math.PI, 0); ctx.lineTo(sw / 2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(20,24,18,0.6)';
    ctx.fillRect(-sw * 0.06, -sh * 0.85, sw * 0.12, sh * 0.45); ctx.fillRect(-sw * 0.25, -sh * 0.72, sw * 0.5, sw * 0.12);
    ctx.fillStyle = 'rgba(60,95,40,0.6)'; ctx.fillRect(-sw / 2, -sh * 0.15, sw, sh * 0.15);
    ctx.restore();
  } else if (k === 'crystal') {
    // shards growing out of the top, glowing at the tips
    for (let i = 0; i < 4; i++) {
      const j = Math.min(r.prof.length - 1, Math.max(0, hi - 1 + i - (i > 2 ? 3 : 0)));
      const bx = x - w / 2 + w * j / (r.prof.length - 1), by = y - r.prof[j] * h + h * 0.12;
      const L = h * (0.5 + 0.35 * ((Math.sin(r.ph * 9 + i * 4) + 1) / 2)), sw = w * 0.06, lean = Math.sin(r.ph * 5 + i * 2) * 0.35;
      const hue = (i + Math.round(r.ph * 3)) % 2;
      const cg = ctx.createLinearGradient(bx, by, bx + lean * L, by - L);
      cg.addColorStop(0, hue ? 'rgba(70,40,150,0.95)' : 'rgba(40,90,150,0.95)'); cg.addColorStop(1, hue ? 'rgba(255,150,240,0.95)' : 'rgba(150,245,255,0.95)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.moveTo(bx - sw, by); ctx.lineTo(bx - sw * 0.6 + lean * L * 0.8, by - L * 0.8); ctx.lineTo(bx + lean * L, by - L); ctx.lineTo(bx + sw * 0.7 + lean * L * 0.75, by - L * 0.75); ctx.lineTo(bx + sw, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.moveTo(bx - sw * 0.2, by); ctx.lineTo(bx + lean * L, by - L); ctx.lineTo(bx + sw * 0.7 + lean * L * 0.75, by - L * 0.75); ctx.lineTo(bx + sw, by); ctx.closePath(); ctx.fill();
      if (w > 14) { ctx.globalCompositeOperation = 'lighter'; lamp(bx + lean * L, by - L, hue ? '#ff8ae0' : '#8aeaff', Math.max(1.2, w * 0.03) * (0.8 + 0.2 * Math.sin(g.t * 3 + i + r.ph))); ctx.globalCompositeOperation = 'source-over'; }
    }
  } else if (k === 'ice' && w > 20) {
    // icicles hanging from the overhang into the water
    ctx.fillStyle = 'rgba(220,245,255,0.7)';
    for (let i = 0; i < 5; i++) { const ix = x - w * 0.35 + w * 0.17 * i, iy = y - h * 0.16; ctx.beginPath(); ctx.moveTo(ix - w * 0.012, iy); ctx.lineTo(ix + w * 0.012, iy); ctx.lineTo(ix, iy + h * (0.08 + 0.05 * Math.sin(i + r.ph))); ctx.fill(); }
  } else if (k === 'basalt' && !reduceMotion && w > 18) {
    // steam where the hot rock meets the sea
    const sk = (g.t * 0.5 + r.ph) % 1;
    ctx.fillStyle = `rgba(230,210,200,${0.18 * (1 - sk)})`;
    ctx.beginPath(); ctx.ellipse(x + Math.sin(r.ph) * w * 0.2, y - h * 0.2 - sk * h * 0.8, w * (0.12 + sk * 0.2), h * (0.08 + sk * 0.12), 0, 0, 6.28); ctx.fill();
  }
}

// ---------- weather ----------
const FX = { snow: [], ash: [], flies: [], motes: [], fog: [] };
(() => {
  for (let i = 0; i < 160; i++) FX.snow.push({ x: rand(0, 1), y: rand(0, 1), v: rand(0.4, 1), s: rand(1, 2.6), ph: rand(0, 6) });
  for (let i = 0; i < 90; i++) FX.ash.push({ x: rand(0, 1), y: rand(0, 1), v: rand(0.4, 1.2), s: rand(1, 2.2), ph: rand(0, 6), ember: Math.random() < 0.4 });
  for (let i = 0; i < 36; i++) FX.flies.push({ x: rand(0, 1), y: rand(0.2, 0.85), ph: rand(0, 6), sp: rand(0.2, 0.6) });
  for (let i = 0; i < 70; i++) FX.motes.push({ x: rand(0, 1), y: rand(0, 1), v: rand(0.2, 0.6), ph: rand(0, 6), hue: Math.random() < 0.5 });
  for (let i = 0; i < 6; i++) FX.fog.push({ x: rand(0, 1), y: rand(-0.06, 0.12), w: rand(0.6, 1.3), h: rand(0.05, 0.12), v: rand(0.006, 0.02) * (Math.random() < 0.5 ? -1 : 1) });
})();

// returns true if the biome drew its own weather (so the default drizzle is skipped)
function drawBiomeWeather(B) {
  const lean = Math.min(0.4, ship.v / 60) + ship.rudder * 0.1;
  if (B.fx === 'snow') {
    ctx.fillStyle = 'rgba(235,245,255,0.75)';
    for (const f of FX.snow) {
      f.y += 0.0022 * f.v; if (f.y > 1.03) { f.y = -0.03; f.x = Math.random(); }
      const x = (f.x + Math.sin(g.t * 0.8 + f.ph) * 0.01 - lean * f.y * 0.05) * W, y = f.y * H;
      ctx.fillRect(x, y, f.s, f.s);
    }
    return true;
  }
  if (B.fx === 'ash') {
    for (const f of FX.ash) {
      if (f.ember) { f.y -= 0.0018 * f.v; if (f.y < -0.03) { f.y = 1.03; f.x = Math.random(); } }
      else { f.y += 0.0012 * f.v; if (f.y > 1.03) { f.y = -0.03; f.x = Math.random(); } }
      const x = (f.x + Math.sin(g.t * 0.6 + f.ph) * 0.015) * W, y = f.y * H;
      if (f.ember) { const fl = 0.5 + 0.5 * Math.sin(g.t * 6 + f.ph * 4); ctx.fillStyle = `rgba(255,${120 + 60 * fl | 0},50,${0.4 + 0.5 * fl})`; }
      else ctx.fillStyle = 'rgba(120,110,110,0.45)';
      ctx.fillRect(x, y, f.s, f.s);
    }
    return true;
  }
  if (B.fx === 'fireflies') {
    for (const f of FX.flies) {
      const x = (f.x + Math.sin(g.t * f.sp + f.ph) * 0.05) * W, y = (f.y + Math.sin(g.t * f.sp * 1.3 + f.ph * 2) * 0.03) * H;
      const a = Math.max(0, Math.sin(g.t * 1.5 + f.ph * 3));
      if (a < 0.05) continue;
      ctx.globalAlpha = a * 0.8; lamp(x, y, '#d8ff7a', 1.6); ctx.globalAlpha = 1;
    }
    return true;
  }
  if (B.fx === 'motes') {
    for (const f of FX.motes) {
      f.y -= 0.0006 * f.v; if (f.y < -0.03) { f.y = 1.03; f.x = Math.random(); }
      const tw = 0.5 + 0.5 * Math.sin(g.t * 3 + f.ph * 5);
      ctx.fillStyle = f.hue ? `rgba(160,240,255,${0.25 + 0.6 * tw})` : `rgba(255,160,240,${0.25 + 0.6 * tw})`;
      const s = 1 + tw * 1.4; ctx.fillRect((f.x + Math.sin(g.t * 0.4 + f.ph) * 0.01) * W, f.y * H, s, s);
    }
    return true;
  }
  if (B.fx === 'fog') {
    // banks of fog rolling along the water, thickest at the horizon
    const base = ctx.createLinearGradient(0, hy - H * 0.12, 0, hy + H * 0.2);
    base.addColorStop(0, 'rgba(140,155,150,0)'); base.addColorStop(0.4, 'rgba(140,155,150,0.28)'); base.addColorStop(1, 'rgba(140,155,150,0)');
    ctx.fillStyle = base; ctx.fillRect(0, hy - H * 0.12, W, H * 0.32);
    for (const f of FX.fog) {
      f.x += f.v * 0.016; if (f.x > 1.6) f.x = -0.6; if (f.x < -0.6) f.x = 1.6;
      const x = f.x * W - yaw * W * 0.3, y = hy + f.y * H, rw = f.w * W * 0.5, rh = f.h * H;
      const xx = ((x % (W * 2.2)) + W * 2.2) % (W * 2.2) - W * 0.6;
      const gr = ctx.createRadialGradient(xx, y, 0, xx, y, rw);
      gr.addColorStop(0, 'rgba(150,165,160,0.22)'); gr.addColorStop(1, 'rgba(150,165,160,0)');
      ctx.save(); ctx.translate(xx, y); ctx.scale(1, rh / rw); ctx.translate(-xx, -y);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(xx, y, rw, 0, 6.28); ctx.fill(); ctx.restore();
    }
    return false;   // and the drizzle too
  }
  return false;
}

// a lava sea: bright patches welling up and bursting near you
function drawLavaSea(B) {
  if (!B.lavaSea) return;
  ctx.globalCompositeOperation = 'lighter';
  const T = 400;
  for (let i = 0; i < 60; i++) {
    const gx = Math.floor(camX / T) * T + ((i * 137) % 10) * (T / 10) * 3 - T, gy = Math.floor(camY / T) * T + ((i * 71) % 12) * (T / 12) * 3 - T;
    const c = cam(gx, gy, 0); if (c.f < 4) continue;
    const q = proj(c); if (q.x < -50 || q.x > W + 50) continue;
    const ph = (g.t * 0.35 + i * 0.37) % 1, a = Math.sin(ph * Math.PI);
    const r = Math.max(2, (3 + (i % 4) * 2) * q.s * (0.6 + ph * 0.6));
    ctx.fillStyle = `rgba(255,${120 + (i % 3) * 30},30,${0.3 * a})`;
    ctx.beginPath(); ctx.ellipse(q.x, q.y, r, r * 0.25, 0, 0, 6.28); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// glowing water in the lagoon: wherever the hull cuts the sea it lights up
function drawBiolum(B) {
  if (!B.biolum || reduceMotion) return;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const a = i * 2.4, d = 6 + (i * 7) % 60;
    const wx = ship.x + Math.sin(a) * d, wy = ship.y + Math.cos(a) * d;
    const c = cam(wx, wy, 0); if (c.f < 3) continue;
    const q = proj(c), tw = Math.max(0, Math.sin(g.t * 2 + i * 1.7));
    const near = Math.max(0, 1 - d / 60) * (0.3 + Math.min(1, ship.v / 10) * 0.7);
    ctx.fillStyle = `rgba(80,255,220,${0.5 * tw * near})`;
    const s = Math.max(1, q.s * 0.25); ctx.fillRect(q.x, q.y, s, s * 0.5);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- the portal ----------
// The Nether voyage opens in the sea you came from, with a portal standing in the water dead ahead.
// It comes at you, you sail through it in a rush of purple, and come out the other side in the Nether.
const PORTAL = { PASS: 2.6, END: 4.4, W: 15.4, H: 19.8, B: 2.2 };

function startPortal(from) {
  g.portal = { t: 0, from: from === 'nether' ? 'skerry' : from, through: false };
  if (typeof sfxPortal === 'function') sfxPortal(0);
}
function updatePortal(dt) {
  const P = g.portal; if (!P) return;
  P.t += dt;
  if (!P.through && P.t >= PORTAL.PASS) {
    P.through = true;
    if (typeof sfxPortal === 'function') sfxPortal(1);
    if (typeof padRumble === 'function') padRumble(0.6, 0.8, 600);
    addLog(BIOMES.nether.name[0].toUpperCase() + BIOMES.nether.name.slice(1) + '. ' + BIOMES.nether.intro, 'w');
  }
  if (P.t >= PORTAL.END) g.portal = null;
}
// distance of the portal ahead of the camera, closing fast
function portalDist() { const k = Math.min(1, g.portal.t / PORTAL.PASS); return (130 + (VIEW.third ? CHASE.back : 0)) * Math.pow(1 - k, 1.2) + 0.2; }
function portalItem(push) {
  if (!g.portal || g.portal.through) return;
  const d = portalDist(), o = { x: camX + Math.sin(yaw) * d, y: camY + Math.cos(yaw) * d };
  push('portal', o, 0);
}
function drawPortal(o) {
  // big enough that the camera goes through it, even the high chase camera in third person
  const sc = Math.max(1, camH * 1.4 / PORTAL.H);
  const rx = Math.cos(yaw), ry = -Math.sin(yaw), B = PORTAL.B * sc;
  const pt = (u, z) => [o.x + rx * u, o.y + ry * u, z];
  const quad = (u0, z0, u1, z1, col) => fillPoly([pt(u0, z0), pt(u1, z0), pt(u1, z1), pt(u0, z1)], col);
  const cols = Math.round(PORTAL.W / PORTAL.B), rows = Math.round(PORTAL.H / PORTAL.B), u0 = -cols * B / 2;
  // the swirling purple inside first, so the frame sits over its edges
  const inner = polyProj([pt(u0 + B, B), pt(-u0 - B, B), pt(-u0 - B, rows * B - B), pt(u0 + B, rows * B - B)]);
  if (inner.length >= 3) {
    ctx.save();
    ctx.beginPath(); inner.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.clip();
    const xs = inner.map(q => q.x), ys = inner.map(q => q.y);
    const x0 = Math.max(-50, Math.min(...xs)), x1 = Math.min(W + 50, Math.max(...xs)), y0 = Math.max(-50, Math.min(...ys)), y1 = Math.min(H + 50, Math.max(...ys));
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
    const gr = ctx.createRadialGradient(mx, my, 0, mx, my, R);
    gr.addColorStop(0, 'rgba(210,140,255,0.85)'); gr.addColorStop(0.5, 'rgba(120,40,210,0.75)'); gr.addColorStop(1, 'rgba(70,10,140,0.8)');
    ctx.fillStyle = gr; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // pixels of light swirling round
    const px = Math.max(2, R * 0.03);
    for (let i = 0; i < 140; i++) {
      const a = i * 0.61 + g.t * (2 + (i % 3)) * (i % 2 ? 1 : -1), rr = R * (((i * 0.137) % 1) * 0.9 + 0.05) * (1 + 0.1 * Math.sin(g.t * 3 + i));
      ctx.fillStyle = i % 4 ? `rgba(190,110,255,${0.4 + 0.3 * Math.sin(g.t * 5 + i)})` : 'rgba(240,210,255,0.8)';
      ctx.fillRect(mx + Math.cos(a) * rr * (x1 - x0) / (2 * R), my + Math.sin(a) * rr * (y1 - y0) / (2 * R), px, px);
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    lamp(mx, my, '#a050ff', Math.min(400, R * 0.5));
    ctx.globalCompositeOperation = 'source-over';
  }
  // the frame: blocks of glossy black stone
  const shades = ['#120a1c', '#170d24', '#0d0714', '#1c1030'];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) continue;
    const ua = u0 + c * B, za = r * B - 0.6;
    quad(ua, za, ua + B, za + B, shades[(r * 7 + c * 3) % 4]);
    quad(ua + B * 0.08, za + B * 0.8, ua + B * 0.6, za + B * 0.92, 'rgba(140,100,200,0.25)');
  }
}
// on the screen: the purple closes in as you reach it, then fills everything and clears in the Nether
function drawPortalOverlay() {
  const P = g.portal; if (!P) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let a;
  if (!P.through) a = Math.pow(Math.min(1, P.t / PORTAL.PASS), 4) * 0.7;
  else { const k = (P.t - PORTAL.PASS) / (PORTAL.END - PORTAL.PASS); a = k < 0.25 ? 1 : Math.max(0, 1 - (k - 0.25) / 0.75); }
  if (a <= 0.01) return;
  const vg = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * (P.through ? 0 : 0.3), cx, H / 2, Math.hypot(W, H) * 0.6);
  vg.addColorStop(0, `rgba(150,60,240,${P.through ? a * 0.9 : 0})`); vg.addColorStop(1, `rgba(90,20,170,${a})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (!reduceMotion) {
    const R = Math.hypot(W, H) * 0.55, px = Math.max(3, R * 0.012);
    for (let i = 0; i < 220; i++) {
      const ang = i * 0.61 + g.t * (1.5 + (i % 3)) * (i % 2 ? 1 : -1), rr = R * ((i * 0.137) % 1);
      ctx.fillStyle = `rgba(${i % 4 ? '200,130,255' : '245,225,255'},${a * (0.35 + 0.3 * Math.sin(g.t * 6 + i))})`;
      ctx.fillRect(cx + Math.cos(ang) * rr, H / 2 + Math.sin(ang) * rr * 0.7, px, px);
    }
  }
}
