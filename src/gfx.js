// The detailed look: sky, moon, clouds, sea glitter, coast, lighthouse, rocks, deck and atmosphere.
// Anything expensive (gradients, textures, sprites) is drawn once into an offscreen canvas and reused;
// the caches are rebuilt only when the screen size, boat or skin changes.

const GFX = { key: '', sky: null, vignette: null, grain: null, grainPat: null, moon: null, clouds: [], deck: null, deckKey: '' };
const MOON = { b: Math.PI * 0.985, e: 0.2 };   // bearing and elevation (radians) of the moon: out over the land, ahead as you come in
const cliffs = [], dust = [], drizzle = [], spray = [];
(() => {
  // a ragged cliff line along the coast behind the harbour
  let z = 38;
  for (let x = -3200; x <= 3200; x += 80) { z = Math.max(18, Math.min(70, z + rand(-10, 10))); cliffs.push({ x, z, y: -40 - rand(0, 30) }); }
  // the Milky Way: a faint band of dust across the sky
  for (let i = 0; i < 700; i++) {
    const t = rand(-Math.PI, Math.PI), off = (rand(0, 1) + rand(0, 1) + rand(0, 1) - 1.5) * 0.16;
    dust.push({ b: t, e: 0.2 + 0.32 * (0.5 + 0.5 * Math.sin(t * 0.8 + 1.1)) + off, a: rand(0.05, 0.22) });
  }
  for (let i = 0; i < 90; i++) drizzle.push({ x: rand(0, 1), y: rand(0, 1), l: rand(8, 18), v: rand(0.9, 1.4) });
})();

function offscreen(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

function buildCaches() {
  const key = W + 'x' + H + '@' + dpr;
  if (GFX.key === key) return;
  GFX.key = key;
  // night sky gradient, tall enough for the horizon to bob and roll
  const sh = Math.ceil(H * 1.2);
  GFX.sky = offscreen(4, sh);
  const s = GFX.sky.getContext('2d'), gr = s.createLinearGradient(0, 0, 0, sh);
  gr.addColorStop(0, '#02040a'); gr.addColorStop(0.45, '#060c1c'); gr.addColorStop(0.8, '#0e1a36'); gr.addColorStop(1, '#1a2744');
  s.fillStyle = gr; s.fillRect(0, 0, 4, sh);
  // vignette
  GFX.vignette = offscreen(W * dpr, H * dpr);
  const v = GFX.vignette.getContext('2d');
  const vg = v.createRadialGradient(W * dpr / 2, H * dpr * 0.48, Math.min(W, H) * dpr * 0.35, W * dpr / 2, H * dpr * 0.5, Math.hypot(W, H) * dpr * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  v.fillStyle = vg; v.fillRect(0, 0, W * dpr, H * dpr);
  // film grain tile
  if (!GFX.grain) {
    GFX.grain = offscreen(128, 128);
    const n = GFX.grain.getContext('2d'), id = n.createImageData(128, 128);
    for (let i = 0; i < id.data.length; i += 4) { const c = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = c; id.data[i + 3] = 22; }
    n.putImageData(id, 0, 0);
    GFX.grainPat = ctx.createPattern(GFX.grain, 'repeat');
  }
  // the moon: a pale disc with soft craters
  if (!GFX.moon) {
    const R = 64; GFX.moon = offscreen(R * 2, R * 2);
    const m = GFX.moon.getContext('2d');
    const mg = m.createRadialGradient(R * 0.8, R * 0.75, R * 0.1, R, R, R);
    mg.addColorStop(0, '#fffbe8'); mg.addColorStop(0.7, '#e9e2c8'); mg.addColorStop(1, '#bdb69c');
    m.fillStyle = mg; m.beginPath(); m.arc(R, R, R - 1, 0, 6.28); m.fill();
    m.save(); m.beginPath(); m.arc(R, R, R - 1, 0, 6.28); m.clip();
    for (const [x, y, r, a] of [[0.7, 0.8, 0.22, 0.16], [1.25, 0.65, 0.14, 0.14], [1.1, 1.3, 0.26, 0.12], [0.55, 1.25, 0.12, 0.15], [1.45, 1.05, 0.1, 0.13], [0.95, 0.45, 0.08, 0.12]]) {
      m.fillStyle = `rgba(110,104,86,${a})`; m.beginPath(); m.arc(R * x, R * y, R * r, 0, 6.28); m.fill();
    }
    m.restore();
  }
  // soft cloud sprites
  if (!GFX.clouds.length) {
    for (let k = 0; k < 6; k++) {
      const cw = 420, ch = 120, c = offscreen(cw, ch), q = c.getContext('2d');
      for (let i = 0; i < 26; i++) {
        const x = rand(60, cw - 60), y = rand(ch * 0.35, ch * 0.75), r = rand(22, 54);
        const bg = q.createRadialGradient(x, y, 0, x, y, r);
        bg.addColorStop(0, 'rgba(150,165,195,0.22)'); bg.addColorStop(1, 'rgba(150,165,195,0)');
        q.fillStyle = bg; q.beginPath(); q.arc(x, y, r, 0, 6.28); q.fill();
      }
      GFX.clouds.push({ img: c, b: rand(-Math.PI, Math.PI), e: rand(0.08, 0.42), s: rand(0.8, 1.6), v: rand(0.004, 0.012) });
    }
  }
}

// screen position of a direction in the sky (bearing, elevation), or null if out of view
function skyPos(b, e) {
  const d = angDiff(b, yaw); if (Math.abs(d) > fov / 2 + 0.5) return null;
  return { x: cx + Math.tan(d) * focal, y: hy - Math.tan(e) * focal };
}

function drawSky() {
  buildCaches();
  ctx.drawImage(GFX.sky, -W, hy - GFX.sky.height + H * 0.02, W * 3, GFX.sky.height);
  // Milky Way dust, then the stars
  for (const d of dust) {
    const p = skyPos(d.b, d.e); if (!p || p.y < -20 || p.y > hy) continue;
    ctx.fillStyle = `rgba(200,210,235,${d.a})`; ctx.fillRect(p.x, p.y, 1, 1);
  }
  for (const st of stars) {
    const p = skyPos(st.b, st.e); if (!p || p.y < -40) continue;
    const tw = 0.7 + 0.3 * Math.sin(g.t * (1.5 + st.m) + st.ph);
    ctx.fillStyle = `rgba(236,232,215,${0.2 + 0.6 * st.m * tw})`;
    const sz = st.m > 0.85 ? 2 : st.m > 0.6 ? 1.4 : 1; ctx.fillRect(p.x, p.y, sz, sz);
  }
  // the moon and its halo
  const mp = skyPos(MOON.b, MOON.e);
  if (mp) {
    const r = Math.max(14, focal * 0.022);
    const halo = ctx.createRadialGradient(mp.x, mp.y, r * 0.8, mp.x, mp.y, r * 9);
    halo.addColorStop(0, 'rgba(220,226,240,0.28)'); halo.addColorStop(0.3, 'rgba(160,180,220,0.08)'); halo.addColorStop(1, 'rgba(120,140,190,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mp.x, mp.y, r * 9, 0, 6.28); ctx.fill();
    ctx.drawImage(GFX.moon, mp.x - r, mp.y - r, r * 2, r * 2);
  }
  // clouds drifting slowly across, their edges lit where they pass the moon
  for (const c of GFX.clouds) {
    const b = c.b + g.t * c.v;
    const p = skyPos(b, c.e); if (!p) continue;
    const w = focal * 0.55 * c.s, h = w * c.img.height / c.img.width;
    const nearMoon = mp ? Math.max(0, 1 - Math.hypot(p.x - mp.x, p.y - mp.y) / (w * 0.8)) : 0;
    ctx.globalAlpha = 0.55 + nearMoon * 0.45;
    ctx.drawImage(c.img, p.x - w / 2, p.y - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}

function drawSea() {
  const sea = ctx.createLinearGradient(0, hy, 0, H);
  sea.addColorStop(0, '#15213a'); sea.addColorStop(0.04, '#0b1528'); sea.addColorStop(0.5, '#060d1b'); sea.addColorStop(1, '#03070f');
  ctx.fillStyle = sea; ctx.fillRect(-W, hy, W * 3, H * 2);
  // moon glitter: a broken path of light on the water under the moon, widening towards you
  const mp = skyPos(MOON.b, MOON.e);
  if (mp && !reduceMotion) {
    ctx.fillStyle = 'rgba(225,230,240,0.5)';
    const seed = Math.floor(g.t * 6);
    for (let i = 0; i < 120; i++) {
      const k = ((i * 9301 + seed * 49297) % 233280) / 233280, k2 = ((i * 7919 + seed * 104729) % 9973) / 9973;
      const depth = Math.pow(i / 120, 1.6);
      const y = hy + 2 + depth * (H - hy) * 0.85;
      const spread = 6 + depth * W * 0.16;
      const x = mp.x + (k - 0.5) * 2 * spread;
      const len = 2 + depth * 18 * k2;
      ctx.globalAlpha = (1 - depth * 0.7) * (0.25 + 0.5 * k2);
      ctx.fillRect(x - len / 2, y, len, 1 + depth * 1.5);
    }
    ctx.globalAlpha = 1;
  }
  // haze where the sea meets the sky
  const hz = ctx.createLinearGradient(0, hy - 16, 0, hy + 22);
  hz.addColorStop(0, 'rgba(60,80,120,0)'); hz.addColorStop(0.45, 'rgba(70,92,135,0.22)'); hz.addColorStop(1, 'rgba(60,80,120,0)');
  ctx.fillStyle = hz; ctx.fillRect(-W, hy - 16, W * 3, 38);
}

// the coast: a ragged line of cliffs, the headland under the light, the piers and the harbour cottages
function drawCoast() {
  const HB = SK.HARBOUR;
  fillPoly([[-15000, 0, 1.5], [15000, 0, 1.5], [15000, -15000, 1.5], [-15000, -15000, 1.5]], '#05080a');
  for (let i = 0; i < cliffs.length - 1; i++) {
    const a = cliffs[i], b = cliffs[i + 1];
    if (cam(a.x, a.y, 0).f < SK.NEAR && cam(b.x, b.y, 0).f < SK.NEAR) continue;
    fillPoly([[a.x, a.y, 0], [a.x, a.y, a.z], [b.x, b.y, b.z], [b.x, b.y, 0]], i % 2 ? '#081009' : '#09120b');
    // moonlight on the cliff tops
    fillPoly([[a.x, a.y, a.z], [b.x, b.y, b.z], [b.x, b.y, b.z - 1.5], [a.x, a.y, a.z - 1.5]], 'rgba(120,140,170,0.12)');
  }
  // the headland the lighthouse stands on, with a little surf at its foot
  fillPoly([[-45, 6, 0], [45, 6, 0], [40, 4, 22], [-40, 4, 22]], '#0a110c');
  fillPoly([[-40, 4, 22], [40, 4, 22], [55, -60, 22], [-60, -60, 22]], '#0c140e');
  fillPoly([[-48, 8, 0.2], [48, 8, 0.2], [45, 6, 1.4], [-45, 6, 1.4]], 'rgba(210,225,240,' + (0.12 + 0.06 * Math.sin(g.t * 1.4)) + ')');
  // stone piers with a lighter top course
  for (const sx of [-1, 1]) {
    const x0 = HB.x + sx * 20, x1 = HB.x + sx * 26;
    fillPoly([[x0, -2, 0], [x0, 46, 0], [x0, 46, 2.4], [x0, -2, 2.4]], '#16130f');
    fillPoly([[Math.min(x0, x1), -2, 2.4], [Math.max(x0, x1), -2, 2.4], [Math.max(x0, x1), 46, 2.4], [Math.min(x0, x1), 46, 2.4]], '#24201a');
    fillPoly([[x0, 46, 0.1], [x1, 46, 0.1], [x1, 46.8, 1], [x0, 46.8, 1]], 'rgba(210,225,240,0.18)');
  }
  // cottages along the waterfront: walls, roofs and a lit window each
  for (const t of town) {
    const w = 7 + (t.ph % 3), d = 5, hgt = t.z * 0.45 + 4, x = t.x, y = t.y;
    const front = cam(x, y + d, 0); if (front.f < SK.NEAR + 2) continue;
    fillPoly([[x - w / 2, y + d, 0], [x + w / 2, y + d, 0], [x + w / 2, y + d, hgt], [x - w / 2, y + d, hgt]], '#0d1210');
    fillPoly([[x - w / 2 - 0.6, y + d, hgt], [x + w / 2 + 0.6, y + d, hgt], [x, y + d, hgt + w * 0.45]], '#151a17');
    const win = proj(cam(x + (t.ph % 2 - 0.5) * w * 0.4, y + d + 0.05, hgt * 0.45));
    const ws = Math.max(1.4, win.s * 1.3), flick = 0.55 + 0.25 * Math.sin(g.t * 0.7 + t.ph);
    ctx.fillStyle = `rgba(255,196,110,${flick})`; ctx.fillRect(win.x - ws / 2, win.y - ws, ws, ws * 1.2);
    if (ws > 3) { ctx.globalAlpha = 0.25 * flick; lamp(win.x, win.y - ws / 2, '#ffc46e', ws * 0.9); ctx.globalAlpha = 1; }
  }
}

// Skerry Light itself: a white tower with red bands, a gallery, the glass lantern room and its cap
function drawLighthouse(beamOn, fl, fr, far) {
  const base = cam(0, 0, 22), top = cam(0, 0, 52);
  if (base.f > SK.NEAR) {
    const b = proj(base), t = proj(top), hb = 4.2 * b.s, ht = 3 * t.s;
    // the keeper's cottage beside it, one window lit
    const ck = cam(12, -6, 22);
    if (ck.f > SK.NEAR) {
      const k = proj(ck), cw = 9 * k.s, chh = 4.5 * k.s;
      ctx.fillStyle = '#1b1d1c'; ctx.fillRect(k.x - cw / 2, k.y - chh, cw, chh);
      ctx.fillStyle = '#121413'; ctx.beginPath(); ctx.moveTo(k.x - cw / 2 - 2, k.y - chh); ctx.lineTo(k.x, k.y - chh - 3.5 * k.s); ctx.lineTo(k.x + cw / 2 + 2, k.y - chh); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,120,0.85)'; ctx.fillRect(k.x - cw * 0.2, k.y - chh * 0.65, Math.max(1.5, cw * 0.14), Math.max(1.5, chh * 0.3));
    }
    // tower body, shaded across from the lit side
    const tg = ctx.createLinearGradient(b.x - hb, 0, b.x + hb, 0);
    tg.addColorStop(0, '#3c3b37'); tg.addColorStop(0.45, '#8a877c'); tg.addColorStop(1, '#2a2925');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.moveTo(b.x - hb * 1.3, b.y); ctx.lineTo(b.x + hb * 1.3, b.y); ctx.lineTo(t.x + ht, t.y); ctx.lineTo(t.x - ht, t.y); ctx.closePath(); ctx.fill();
    // red bands
    ctx.save(); ctx.beginPath(); ctx.moveTo(b.x - hb * 1.3, b.y); ctx.lineTo(b.x + hb * 1.3, b.y); ctx.lineTo(t.x + ht, t.y); ctx.lineTo(t.x - ht, t.y); ctx.closePath(); ctx.clip();
    for (const [f0, f1] of [[0.18, 0.34], [0.55, 0.71]]) {
      const y0 = b.y + (t.y - b.y) * f0, y1 = b.y + (t.y - b.y) * f1;
      const bg = ctx.createLinearGradient(b.x - hb, 0, b.x + hb, 0);
      bg.addColorStop(0, '#3a1612'); bg.addColorStop(0.45, '#8a3226'); bg.addColorStop(1, '#2a100c');
      ctx.fillStyle = bg; ctx.fillRect(b.x - hb * 2, y1, hb * 4, y0 - y1);
    }
    // a couple of small windows up the tower
    ctx.fillStyle = 'rgba(255,205,130,0.55)';
    for (const f of [0.45, 0.82]) { const y = b.y + (t.y - b.y) * f; ctx.fillRect(b.x - Math.max(0.8, hb * 0.12), y, Math.max(1.2, hb * 0.24), Math.max(1.5, (b.y - t.y) * 0.03)); }
    ctx.restore();
    // gallery, lantern room and cap
    const gw = ht * 1.7, lh = Math.max(3, (b.y - t.y) * 0.16);
    ctx.fillStyle = '#1c1b18'; ctx.fillRect(t.x - gw, t.y - Math.max(1.2, lh * 0.12), gw * 2, Math.max(1.2, lh * 0.14));
    ctx.strokeStyle = 'rgba(30,28,24,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(t.x - gw, t.y - lh * 0.35); ctx.lineTo(t.x + gw, t.y - lh * 0.35); ctx.stroke();
    const facing = 1 - Math.min(1, Math.abs(angDiff(g.beam, bearingOf(camX, camY))) / 0.5);
    const shown = Math.abs(bearingOf(camX, camY)) < SK.SHADE ? facing : 0;
    const glass = ctx.createLinearGradient(0, t.y - lh, 0, t.y);
    glass.addColorStop(0, `rgba(255,230,170,${0.6 + 0.4 * shown})`); glass.addColorStop(1, `rgba(255,200,110,${0.5 + 0.5 * shown})`);
    ctx.fillStyle = glass; ctx.fillRect(t.x - ht * 0.95, t.y - lh, ht * 1.9, lh);
    ctx.strokeStyle = 'rgba(40,30,20,0.6)';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(t.x + i * ht * 0.6, t.y - lh); ctx.lineTo(t.x + i * ht * 0.6, t.y); ctx.stroke(); }
    ctx.fillStyle = '#1a1714';
    ctx.beginPath(); ctx.moveTo(t.x - ht * 1.15, t.y - lh); ctx.quadraticCurveTo(t.x, t.y - lh * 1.9, t.x + ht * 1.15, t.y - lh); ctx.fill();
    lamp(t.x, t.y - lh * 0.5, '#ffd88a', Math.max(2.5, 2 * Math.sqrt(t.s)) * (1 + shown * 6));
  }
  // the beam: a cone of light from the lamp, bright at the source and fading with distance
  if (beamOn) {
    const L = cam(0, 0, 54), pl = cam(fl[0], fl[1], 54), pr = cam(fr[0], fr[1], 54);
    if (L.f > SK.NEAR || pl.f > SK.NEAR || pr.f > SK.NEAR) {
      const spread = far * Math.tan(SK.HALF_BEAM) * 0.4;
      const pts = polyProj([[0, 0, 54], [fl[0], fl[1], 54 + spread], [fr[0], fr[1], 54 + spread], [fr[0], fr[1], 54 - spread], [fl[0], fl[1], 54 - spread]]);
      if (pts.length >= 3) {
        const lp = L.f > SK.NEAR ? proj(L) : pts[0];
        // fade along the beam in screen space, over the first part of its length
        const fx0 = (pts[1].x + pts[pts.length - 1].x) / 2, fy0 = (pts[1].y + pts[pts.length - 1].y) / 2;
        const fx = lp.x + (fx0 - lp.x) * 0.55, fy = lp.y + (fy0 - lp.y) * 0.55;
        const bg = ctx.createLinearGradient(lp.x, lp.y, fx, fy);
        bg.addColorStop(0, 'rgba(255,226,165,0.16)'); bg.addColorStop(0.12, 'rgba(255,216,138,0.07)'); bg.addColorStop(0.5, 'rgba(200,205,220,0.025)'); bg.addColorStop(1, 'rgba(200,205,220,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = bg; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
}

// a skerry: a shaded lump of rock with weed at the waterline, foam working round it,
// and a bright rim on the side the lighthouse is shining from
function drawRockDetailed(r, p, vis) {
  if (vis < 0.02) return;
  const w = r.r * 2.2 * p.s, h = r.r * 0.85 * p.s, x = p.x, y = p.y;
  ctx.globalAlpha = vis;
  // foam ring, breathing with the swell
  const sw = Math.sin(g.t * 1.7 + r.ph);
  ctx.fillStyle = 'rgba(210,225,242,0.22)';
  ctx.beginPath(); ctx.ellipse(x, y + h * 0.02, w * (0.72 + sw * 0.04), Math.max(1, w * 0.07), 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = 'rgba(235,243,255,0.38)';
  ctx.beginPath(); ctx.ellipse(x, y, w * (0.6 + sw * 0.03), Math.max(1, w * 0.04), 0, 0, 6.28); ctx.fill();
  // body
  const body = () => {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y);
    r.prof.forEach((v, i) => ctx.lineTo(x - w / 2 + w * i / (r.prof.length - 1), y - v * h));
    ctx.lineTo(x + w / 2, y); ctx.closePath();
  };
  const bg = ctx.createLinearGradient(0, y - h, 0, y);
  bg.addColorStop(0, '#5a5f68'); bg.addColorStop(0.5, '#33373e'); bg.addColorStop(1, '#14161a');
  ctx.fillStyle = bg; body(); ctx.fill();
  ctx.save(); body(); ctx.clip();
  // facets
  ctx.fillStyle = 'rgba(150,158,170,0.22)';
  ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - r.prof[1] * h * 0.9);
  r.prof.slice(1, 5).forEach((v, i) => ctx.lineTo(x - w * 0.3 + w * 0.15 * (i + 1), y - v * h * 0.97));
  ctx.lineTo(x + w * 0.05, y - h * 0.15); ctx.lineTo(x - w * 0.25, y - h * 0.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,22,26,0.5)'; ctx.lineWidth = Math.max(0.6, w * 0.012);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) { const fx = x - w * 0.3 + w * 0.25 * i + Math.sin(r.ph + i) * w * 0.05; ctx.moveTo(fx, y - h * 0.8); ctx.lineTo(fx + w * 0.06, y - h * 0.2); }
  ctx.stroke();
  // rim light from the lighthouse side
  const toLight = angDiff(bearingOf(-r.x, -r.y), yaw), side = toLight > 0 ? 1 : -1;
  const rim = ctx.createLinearGradient(x + side * w / 2, 0, x, 0);
  rim.addColorStop(0, 'rgba(255,224,165,0.5)'); rim.addColorStop(0.28, 'rgba(255,224,165,0)');
  ctx.fillStyle = rim; ctx.fillRect(x - w / 2, y - h, w, h);
  // dark wet weed along the waterline
  ctx.fillStyle = 'rgba(20,34,24,0.85)'; ctx.fillRect(x - w / 2, y - h * 0.14, w, h * 0.14);
  ctx.fillStyle = 'rgba(220,235,250,0.16)'; ctx.fillRect(x - w / 2, y - h * 0.17, w, Math.max(0.6, h * 0.025));
  ctx.restore();
  // spray flicking up off the rock now and then
  if (!reduceMotion && w > 18) {
    const k = (g.t * 0.8 + r.ph) % 3;
    if (k < 0.6) {
      ctx.fillStyle = `rgba(235,242,252,${0.5 * (1 - k / 0.6)})`;
      for (let i = 0; i < 6; i++) { const a = r.ph * 3 + i; ctx.fillRect(x + Math.cos(a) * w * 0.4, y - k * h * 0.9 - Math.abs(Math.sin(a)) * h * 0.3, 1.6, 1.6); }
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- the deck ----------
// Drawn into a cached picture (planks, grain, nails, caulking, rails, rope) and then lit per frame.
function buildDeck(boat, skin) {
  const key = W + 'x' + H + '@' + dpr + boat.id + skin.id;
  if (GFX.deckKey === key && GFX.deck) return GFX.deck;
  GFX.deckKey = key;
  const tipY = H * boat.tipY, DW = W * boat.deckW;
  const c = offscreen(W * dpr, H * dpr), d = c.getContext('2d');
  d.scale(dpr, dpr);
  const deckPath = () => { d.beginPath(); d.moveTo(cx - DW, H + 2); d.lineTo(cx, tipY); d.lineTo(cx + DW, H + 2); d.closePath(); };
  const base = d.createLinearGradient(0, tipY, 0, H);
  base.addColorStop(0, skin.deck[0]); base.addColorStop(1, skin.deck[1]);
  d.fillStyle = base; deckPath(); d.fill();
  d.save(); deckPath(); d.clip();
  // planks fanning out from the bow, alternating a touch lighter and darker
  const N = 14;
  for (let i = 0; i < N; i++) {
    const a = -1 + (2 * i) / N, b2 = -1 + (2 * (i + 1)) / N;
    d.fillStyle = i % 2 ? 'rgba(255,240,210,0.035)' : 'rgba(0,0,0,0.06)';
    d.beginPath(); d.moveTo(cx, tipY); d.lineTo(cx + a * DW, H + 2); d.lineTo(cx + b2 * DW, H + 2); d.closePath(); d.fill();
    // wood grain: faint streaks along each plank
    d.strokeStyle = 'rgba(0,0,0,0.12)'; d.lineWidth = 0.7;
    for (let k = 0; k < 4; k++) {
      const m = a + (b2 - a) * (0.2 + k * 0.2), t0 = rand(0.15, 0.5), t1 = t0 + rand(0.15, 0.35);
      d.beginPath(); d.moveTo(cx + m * DW * t0, tipY + (H - tipY) * t0); d.lineTo(cx + m * DW * t1, tipY + (H - tipY) * t1); d.stroke();
    }
  }
  // caulked seams between the planks
  d.strokeStyle = 'rgba(0,0,0,0.6)'; d.lineWidth = 1.2;
  for (let i = 0; i <= N; i++) { const a = -1 + (2 * i) / N; d.beginPath(); d.moveTo(cx, tipY); d.lineTo(cx + a * DW, H + 2); d.stroke(); }
  // butt joints and nail heads along the deck beams
  for (let row = 1; row <= 5; row++) {
    const t = Math.pow(row / 6, 1.3), y = tipY + (H - tipY) * t, half = DW * t;
    d.strokeStyle = 'rgba(0,0,0,0.35)'; d.lineWidth = 1;
    for (let i = 0; i < N; i++) {
      if ((i + row) % 3) continue;
      const a = -1 + (2 * i) / N, b2 = -1 + (2 * (i + 1)) / N;
      d.beginPath(); d.moveTo(cx + a * half, y); d.lineTo(cx + b2 * half, y); d.stroke();
    }
    d.fillStyle = 'rgba(20,16,12,0.7)';
    for (let i = 0; i < N; i++) { const a = -1 + (2 * i + 1) / N; const nx = cx + a * half; d.fillRect(nx - 1.2 - t, y - 1, 1.4 + t * 1.4, 1.4 + t * 1.4); d.fillRect(nx + 1.2, y - 1, 1.4 + t * 1.4, 1.4 + t * 1.4); }
  }
  // a coil of rope on the planks
  const rx = cx - DW * 0.42, ry = tipY + (H - tipY) * 0.72, rr = Math.max(14, (H - tipY) * 0.11);
  for (let i = 0; i < 6; i++) {
    d.strokeStyle = i % 2 ? '#8a7350' : '#6e5a3c'; d.lineWidth = Math.max(2, rr * 0.16);
    d.beginPath(); d.ellipse(rx, ry, rr * (1 - i * 0.13), rr * 0.42 * (1 - i * 0.13), 0, 0, 6.28); d.stroke();
  }
  d.restore();
  // bulwarks: the rail, its stanchions and a highlight along the cap
  const railT = boat.rail;
  for (const s of [-1, 1]) {
    const x0 = cx + s * DW, y0 = H - 4, x1 = cx + s * 6, y1 = tipY + 2;
    d.strokeStyle = skin.wood; d.lineWidth = 2;
    for (let i = 1; i < 7; i++) { const t = i / 7, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t; d.beginPath(); d.moveTo(px, py); d.lineTo(px, py + railT * (1.6 - t)); d.stroke(); }
    const rg = d.createLinearGradient(x0, y0 - railT, x0, y0 + railT);
    rg.addColorStop(0, mix(skin.rail, '#ffffff', 0.25)); rg.addColorStop(0.5, skin.rail); rg.addColorStop(1, mix(skin.rail, '#000000', 0.5));
    d.strokeStyle = rg; d.lineWidth = railT; d.lineCap = 'round';
    d.beginPath(); d.moveTo(x0, y0); d.lineTo(x1, y1); d.stroke();
    d.strokeStyle = 'rgba(255,230,190,0.22)'; d.lineWidth = 1.2;
    d.beginPath(); d.moveTo(x0, y0 - railT * 0.4); d.lineTo(x1, y1 - railT * 0.3); d.stroke();
  }
  // rarer skins dress the deck up: a painted stripe along the rail (Bosun and up), brass fittings
  // (Captain and up) and a gilded rail cap (Admiral)
  const tier = typeof skinTier === 'function' ? skinTier(skin) : 0;
  for (const sd of [-1, 1]) {
    const x0 = cx + sd * DW, y0 = H - 4, x1 = cx + sd * 6, y1 = tipY + 2;
    if (tier >= 2) { d.strokeStyle = skin.sail; d.globalAlpha = 0.55; d.lineWidth = Math.max(1.5, railT * 0.22); d.beginPath(); d.moveTo(x0, y0 + railT * 0.25); d.lineTo(x1, y1 + railT * 0.2); d.stroke(); d.globalAlpha = 1; }
    if (tier >= 5) { d.strokeStyle = '#e8c050'; d.lineWidth = Math.max(1.5, railT * 0.2); d.beginPath(); d.moveTo(x0, y0 - railT * 0.42); d.lineTo(x1, y1 - railT * 0.35); d.stroke(); }
  }
  // a pair of mooring cleats near the bow
  d.fillStyle = tier >= 4 ? '#b08a3c' : mix(skin.wood, '#000000', 0.3);
  for (const s of [-1, 1]) { const kx = cx + s * DW * 0.16, ky = tipY + (H - tipY) * 0.25; d.fillRect(kx - 7, ky - 2, 14, 4); d.fillRect(kx - 2, ky - 4, 4, 6); }
  GFX.deck = c;
  return c;
}

// bow spray: droplets thrown up off the stem as she cuts through the water, more the faster she goes
function updateSpray(tipY) {
  const sp = Math.min(1, ship.v / 18);
  if (!reduceMotion && Math.random() < sp * 0.9) {
    for (let i = 0; i < 2; i++) spray.push({ x: cx + rand(-1, 1) * W * 0.08, y: tipY + 4, vx: rand(-1, 1) * W * 0.25, vy: -rand(80, 180) * (0.5 + sp), life: rand(0.35, 0.7), max: 0.7 });
  }
  const dt = 1 / 60;
  for (const s of spray) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 420 * dt; s.life -= dt; }
  while (spray.length && spray[0].life <= 0) spray.shift();
  if (spray.length > 120) spray.splice(0, spray.length - 120);
  ctx.fillStyle = 'rgba(225,236,250,0.8)';
  for (const s of spray) { if (s.life <= 0) continue; ctx.globalAlpha = s.life / s.max * 0.7; ctx.fillRect(s.x, s.y, 2, 2); }
  ctx.globalAlpha = 1;
}

// a caged deck lantern on a short post
function drawLantern(lx, ly, colour, flick) {
  ctx.strokeStyle = '#1c140d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly + 10); ctx.lineTo(lx, ly + 34); ctx.stroke();
  ctx.globalAlpha = flick;
  lamp(lx, ly, colour, 9);
  const gl = ctx.createLinearGradient(0, ly - 9, 0, ly + 8);
  gl.addColorStop(0, mix(colour, '#ffffff', 0.6)); gl.addColorStop(1, colour);
  ctx.fillStyle = gl; ctx.fillRect(lx - 5, ly - 8, 10, 15);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#231a12'; ctx.lineWidth = 1.4;
  ctx.strokeRect(lx - 5.5, ly - 8.5, 11, 16);
  ctx.beginPath(); ctx.moveTo(lx, ly - 8.5); ctx.lineTo(lx, ly + 7.5); ctx.stroke();
  ctx.fillStyle = '#231a12';
  ctx.beginPath(); ctx.moveTo(lx - 7, ly - 8.5); ctx.lineTo(lx, ly - 14); ctx.lineTo(lx + 7, ly - 8.5); ctx.fill();
  ctx.fillRect(lx - 7, ly + 7, 14, 3);
  ctx.beginPath(); ctx.arc(lx, ly - 16, 2.4, 0, 6.28); ctx.strokeStyle = '#231a12'; ctx.stroke();
}

// ---------- atmosphere over everything ----------
function drawAtmosphere() {
  buildCaches();
  // light drizzle on open water, slanting with the wind and the ship's speed
  if (!g.backrooms && !reduceMotion) {
    const lean = 0.18 + Math.min(0.4, ship.v / 60) + ship.rudder * 0.1;
    ctx.strokeStyle = 'rgba(190,205,230,0.13)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of drizzle) {
      d.y += 0.018 * d.v; if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); }
      const x = d.x * W, y = d.y * H;
      ctx.moveTo(x, y); ctx.lineTo(x - d.l * lean, y + d.l);
    }
    ctx.stroke();
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(GFX.vignette, 0, 0);
  if (GFX.grainPat && !reduceMotion) {
    ctx.globalAlpha = 0.6;
    ctx.translate((Math.random() * 128) | 0, (Math.random() * 128) | 0);
    ctx.fillStyle = GFX.grainPat; ctx.fillRect(-128, -128, W * dpr + 256, H * dpr + 256);
  }
  ctx.restore();
}
