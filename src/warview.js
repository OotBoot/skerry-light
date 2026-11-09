// The Drowned Reach, drawn and steered: the map on the canvas, the camera, your clicks and taps, and the
// panels round the edge (leaderboard, clock, orders, log, pacts). war.js is the game underneath.

const WV = {
  cam: { x: WARC.W / 2, y: WARC.H / 2, z: 6 }, zmin: 3, zmax: 30,
  terr: null, own: null, night: null, ownImg: null, nightImg: null, cols: [], tideDrawn: null,
  hover: -1, mode: null, drag: null, pinch: null, moved: false, touch: false, uiT: 0, boardT: 0, lastLog: 0, msg: null, msgT: 0, labels: [],
};

// ---------- colours ----------
function wvRgb(hsl) {
  const m = /hsl\((\d+),(\d+)%,(\d+)%\)/.exec(hsl); if (!m) return [200, 200, 200];
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255 | 0, f(h) * 255 | 0, f(h - 1 / 3) * 255 | 0];
}

// ---------- the still layers ----------
function wvTerrain() {
  const W = WARC.W, H = WARC.H, c = WV.terr || (WV.terr = document.createElement('canvas')); c.width = W; c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data, rng = seeded(WAR.seed ^ 0x5a5a);
  for (let i = 0; i < W * H; i++) {
    const t = WAR.map[i], k = i * 4, n = rng();
    let r, gg, b;
    if (t === 0) { r = 18 + n * 8; gg = 36 + n * 10; b = 62 + n * 12; let sh = 0; warNeighbours(i, j => { if (WAR.map[j] >= 1) sh++; }); if (sh) { r += 10; gg += 16; b += 14; } }
    else if (t === 1) { if (WAR.tideHigh) { r = 40 + n * 10; gg = 66 + n * 12; b = 84 + n * 10; } else { r = 150 + n * 18; gg = 138 + n * 16; b = 100 + n * 12; } }
    else if (t === 2) { r = 96 + n * 20; gg = 112 + n * 18; b = 62 + n * 12; }
    else if (t === 3) { r = 128 + n * 16; gg = 118 + n * 14; b = 96 + n * 12; }
    else { r = 90; gg = 86; b = 82; }
    // the shore a touch paler
    if (t >= 2 && t !== 4) { let sea = 0; warNeighbours(i, j => { if (WAR.map[j] <= 1) sea++; }); if (sea) { r += 24; gg += 18; b += 8; } }
    d[k] = r; d[k + 1] = gg; d[k + 2] = b; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  WV.tideDrawn = WAR.tideHigh;
}
function wvLayers() {
  const W = WARC.W, H = WARC.H;
  WV.own = document.createElement('canvas'); WV.own.width = W; WV.own.height = H; WV.ownG = WV.own.getContext('2d'); WV.ownImg = WV.ownG.createImageData(W, H);
  WV.night = document.createElement('canvas'); WV.night.width = W; WV.night.height = H; WV.nightG = WV.night.getContext('2d'); WV.nightImg = WV.nightG.createImageData(W, H);
  WV.cols = WAR.nations.map(n => wvRgb(n.col));
}
// ---------- the fog of war ----------
// By day you see everything. At night you see only what's lit (the beam, beacons, flares, harbour lights) and the
// land near your own and your allies'; everywhere else is fog, and other nations show as they were at dusk.
function wvFogOn() { return WAR.phase === 'play' && warDark() > 0.05 && !WAR.spectate; }
function wvVision() {
  const n = WAR.map.length, vis = WV.vis && WV.vis.length === n ? WV.vis : (WV.vis = new Uint8Array(n)), dist = WV.vdist && WV.vdist.length === n ? WV.vdist : (WV.vdist = new Uint8Array(n));
  const me = WAR.nations[WAR.me], R = 4;
  dist.fill(255); const q = WV.vq && WV.vq.length === n ? WV.vq : (WV.vq = new Int32Array(n)); let qt = 0, qh = 0;
  for (let i = 0; i < n; i++) { const o = WAR.owner[i]; if (o === WAR.me || (o >= 0 && me.allies.has(o))) { dist[i] = 0; q[qt++] = i; } }
  while (qh < qt) { const i = q[qh++], d = dist[i]; if (d >= R) continue; warNeighbours(i, j => { if (dist[j] > d + 1) { dist[j] = d + 1; q[qt++] = j; } }); }
  for (let i = 0; i < n; i++) vis[i] = dist[i] <= R || WAR.lit[i] >= 1 ? 1 : 0;
  // what you remember: refreshed wherever you can see
  const seen = WV.seen2 && WV.seen2.length === n ? WV.seen2 : (WV.seen2 = new Int16Array(n));
  if (!WV.seenInit) { seen.set(WAR.owner); WV.seenInit = true; }
  for (let i = 0; i < n; i++) if (vis[i]) seen[i] = WAR.owner[i];
}
// is a tile visible to you right now?
const wvSees = i => !WV.fog || (i >= 0 && WV.vis && WV.vis[i] === 1);
function wvOwners() {
  const W = WARC.W, H = WARC.H, d = WV.ownImg.data, me = WAR.me;
  const own = WV.fog ? WV.seen2 : WAR.owner;
  for (let i = 0; i < W * H; i++) {
    const o = own[i], k = i * 4;
    if (o === -1 || !warIsLand(i)) { d[k + 3] = 0; continue; }
    if (o === WARC.DR) { d[k] = 40; d[k + 1] = 70; d[k + 2] = 66; d[k + 3] = 215; continue; }
    const c = WV.cols[o]; let border = false;
    const x = i % W; if (x > 0 && own[i - 1] !== o) border = true; else if (x < W - 1 && own[i + 1] !== o) border = true; else if (i >= W && own[i - W] !== o) border = true; else if (i < W * (H - 1) && own[i + W] !== o) border = true;
    const a = border ? 240 : 140, f = border ? 1.0 : 0.85;
    d[k] = c[0] * f; d[k + 1] = c[1] * f; d[k + 2] = c[2] * f; d[k + 3] = a;
    if (o === me && border) { d[k] = Math.min(255, c[0] * 1.15 + 20); d[k + 1] = Math.min(255, c[1] * 1.15 + 20); d[k + 2] = Math.min(255, c[2] * 1.15 + 20); }
  }
  WV.ownG.putImageData(WV.ownImg, 0, 0);
}
function wvNight(dark) {
  const d = WV.nightImg.data, lit = WAR.lit, vis = WV.vis, fog = WV.fog, rng = WV.fogNoise || (WV.fogNoise = (() => { const a = new Uint8Array(WARC.W * WARC.H); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 30) | 0; return a; })());
  for (let i = 0; i < d.length / 4; i++) {
    const k = i * 4;
    if (fog && !vis[i]) { const nz = rng[i] || 0; d[k] = 22 + nz * 0.4; d[k + 1] = 28 + nz * 0.4; d[k + 2] = 40 + nz * 0.5; d[k + 3] = dark * (222 + nz * 0.8); continue; }
    d[k] = 4; d[k + 1] = 6; d[k + 2] = 14; d[k + 3] = dark * (lit[i] >= 2 ? 10 : lit[i] >= 1 ? 70 : 120);
  }
  WV.nightG.putImageData(WV.nightImg, 0, 0);
}

// ---------- the camera ----------
function wvFit() {
  const z = Math.min(W / WARC.W, H / WARC.H); WV.zmin = z * 0.95; WV.cam.z = Math.max(WV.cam.z, WV.zmin);
  wvClamp();
}
function wvClamp() {
  const c = WV.cam;
  c.z = clamp(c.z, WV.zmin, WV.zmax);
  // (no bounds on where you pan: drag the map anywhere, even off its edges)
  if (!isFinite(c.x) || !isFinite(c.y)) { c.x = WARC.W / 2; c.y = WARC.H / 2; }
}
const wvSx = tx => (tx - WV.cam.x) * WV.cam.z + W / 2, wvSy = ty => (ty - WV.cam.y) * WV.cam.z + H / 2;
function wvTileAt(px, py) {
  const tx = Math.floor((px - W / 2) / WV.cam.z + WV.cam.x), ty = Math.floor((py - H / 2) / WV.cam.z + WV.cam.y);
  if (tx < 0 || ty < 0 || tx >= WARC.W || ty >= WARC.H) return -1; return warIdx(tx, ty);
}
function wvZoomAt(px, py, f) {
  const c = WV.cam, bx = (px - W / 2) / c.z + c.x, by = (py - H / 2) / c.z + c.y;
  c.z = clamp(c.z * f, WV.zmin, WV.zmax);
  c.x = bx - (px - W / 2) / c.z; c.y = by - (py - H / 2) / c.z; wvClamp();
}

// ---------- drawing ----------
function warDraw(dt) {
  if (!WAR.on) return;
  if (!WV.terr || WV.tideDrawn !== WAR.tideHigh) wvTerrain();
  if (!WV.own) wvLayers();
  // when the war begins, the camera goes to your landing (where you chose, or where you were put)
  if (WAR.phase === 'play' && !WV.focused) {
    const me = WAR.nations[WAR.me], at = me.spawn != null && me.spawn >= 0 ? [warX(me.spawn), warY(me.spawn)] : me.tiles > 0 && (me.cx || me.cy) ? [me.cx, me.cy] : null;
    if (at) { WV.focused = true; WV.cam.x = at[0] + 0.5; WV.cam.y = at[1] + 0.5; WV.cam.z = clamp(Math.max(10, WV.zmin * 2.5), WV.zmin, WV.zmax); wvClamp(); }
  }
  const c = WV.cam, z = c.z, ox = wvSx(0), oy = wvSy(0), dark = WAR.phase === 'play' ? warDark() : 0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // the sea beyond the map
  const sg = ctx.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, dark > 0.5 ? '#05070f' : '#0c1424'); sg.addColorStop(1, dark > 0.5 ? '#03040a' : '#070b16');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(WV.terr, ox, oy, WARC.W * z, WARC.H * z);
  // the fog of war comes down at nightfall; at dusk, everyone else's standing is noted (that's what you'll see in the fog)
  const fog = wvFogOn();
  if (fog && !WV.fog) { WV.snap = WAR.nations.map(n => ({ tiles: n.tiles, troops: n.troops, cx: n.cx, cy: n.cy, alive: n.alive })); WV.seenInit = false; }
  WV.fog = fog;
  if (fog) wvVision(); else WV.seenInit = false;
  if (fog && !WV.fogSaid) { WV.fogSaid = true; warLog('Night falls. Fog covers the Reach; only the Light\u2019s beam and your own lights show what the others are doing.'); }
  if (!fog) WV.fogSaid = false;
  wvOwners(); ctx.drawImage(WV.own, ox, oy, WARC.W * z, WARC.H * z);
  if (dark > 0.01) { wvNight(dark); ctx.drawImage(WV.night, ox, oy, WARC.W * z, WARC.H * z); }
  ctx.imageSmoothingEnabled = true;
  // the beam: the Light is dark by day; at night a wide wedge sweeps out from it, and shows everything it crosses
  const lx = wvSx(WARC.W / 2), ly = wvSy(WARC.H / 2), len = Math.hypot(W, H) * 1.2 + Math.hypot(WARC.W, WARC.H) * z;
  if (dark > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createRadialGradient(lx, ly, 2 * z, lx, ly, len * 0.7); bg.addColorStop(0, `rgba(255,216,138,${0.22 * dark})`); bg.addColorStop(1, 'rgba(255,216,138,0)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, len, WAR.beam - WARC.BEAM_HALF, WAR.beam + WARC.BEAM_HALF); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  wvDrawStructs(z);
  wvDrawFlares(z, dark);
  wvDrawBoats(z);
  wvDrawAttacks(z);
  wvDrawEvents(z);
  wvDrawLight(lx, ly, z);
  wvDrawLabels(z);
  wvDrawHover(z);
  wvDrawVignette(dark);
  WV.uiT += dt; if (WV.uiT > 0.25) { WV.uiT = 0; wvPanels(); wvPacts(); }
  if (WV.tipT > 0) WV.tipT -= dt; wvTip();
}
function wvDrawRails(z) {
  if (!WAR.rails || !WAR.rails.length) return;
  for (const [a, b, o] of WAR.rails) {
    if (o !== WAR.me && !(wvSees(a) && wvSees(b))) continue;
    const x1 = wvSx(warX(a) + 0.5), y1 = wvSy(warY(a) + 0.5), x2 = wvSx(warX(b) + 0.5), y2 = wvSy(warY(b) + 0.5);
    if (Math.max(x1, x2) < -20 || Math.min(x1, x2) > W + 20 || Math.max(y1, y2) < -20 || Math.min(y1, y2) > H + 20) continue;
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) continue;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L, px = -uy, py = ux, g = Math.max(1.2, z * 0.22);
    // sleepers, then two rails, in the owner's colour edged dark
    ctx.strokeStyle = 'rgba(60,44,30,0.9)'; ctx.lineWidth = Math.max(1, z * 0.12); ctx.beginPath();
    const step = Math.max(4, z * 0.7);
    for (let d = step / 2; d < L; d += step) { const cx = x1 + ux * d, cy = y1 + uy * d; ctx.moveTo(cx - px * g * 1.6, cy - py * g * 1.6); ctx.lineTo(cx + px * g * 1.6, cy + py * g * 1.6); }
    ctx.stroke();
    ctx.strokeStyle = WAR.nations[o].col; ctx.lineWidth = Math.max(1, z * 0.09);
    ctx.beginPath(); ctx.moveTo(x1 - px * g, y1 - py * g); ctx.lineTo(x2 - px * g, y2 - py * g); ctx.moveTo(x1 + px * g, y1 + py * g); ctx.lineTo(x2 + px * g, y2 + py * g); ctx.stroke();
  }
}
function wvDrawStructs(z) {
  wvDrawRails(z);
  const s = Math.max(4, z * 0.9);
  for (const [i, st] of WAR.structs) {
    if (st.owner !== WAR.me && !wvSees(i) && st.type !== 'beacon') continue;   // (a lit beacon shows through the fog)
    const x = wvSx(warX(i) + 0.5), y = wvSy(warY(i) + 0.5); if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
    const col = WAR.nations[st.owner].col;
    ctx.lineWidth = Math.max(1, z * 0.12);
    if (st.type === 'city') {
      // a huddle of houses round a spire, roofs in the owner's colour; gold coins when its railroad pays double
      const k = s * 1.25;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(x, y + k * 0.55, k * 1.05, k * 0.3, 0, 0, 6.283); ctx.fill();
      for (const [dx, dy, w, h] of [[-0.55, 0.1, 0.5, 0.5], [0.5, 0.15, 0.55, 0.45], [-0.05, 0.3, 0.6, 0.45]]) {
        const hx = x + dx * k, hy = y + dy * k;
        ctx.fillStyle = '#d8ccb0'; ctx.fillRect(hx - w * k / 2, hy - h * k / 2, w * k, h * k);
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(hx - w * k * 0.6, hy - h * k / 2); ctx.lineTo(hx, hy - h * k * 1.05); ctx.lineTo(hx + w * k * 0.6, hy - h * k / 2); ctx.closePath(); ctx.fill();
        if (z > 5) { ctx.fillStyle = 'rgba(255,216,138,0.85)'; ctx.fillRect(hx - k * 0.06, hy - k * 0.05, k * 0.12, k * 0.12); }
      }
      ctx.fillStyle = '#b8ac90'; ctx.fillRect(x - k * 0.12, y - k * 0.95, k * 0.24, k * 0.75); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - k * 0.17, y - k * 0.95); ctx.lineTo(x, y - k * 1.45); ctx.lineTo(x + k * 0.17, y - k * 0.95); ctx.closePath(); ctx.fill();
      if (WAR.railed && WAR.railed.has(i) && z > 3) { ctx.fillStyle = '#ffd88a'; ctx.font = `bold ${Math.max(9, z * 1.1)}px "Courier Prime", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('×2', x + k * 0.9, y - k * 0.7); }
    } else if (st.type === 'factory') {
      // a long works with a saw-tooth roof and two smoking chimneys
      const k = s * 1.2;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(x, y + k * 0.5, k * 1.1, k * 0.28, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#5a4a3c'; ctx.fillRect(x - k * 0.9, y - k * 0.25, k * 1.8, k * 0.7);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - k * 0.9, y - k * 0.25);
      for (let t = 0; t < 3; t++) { const bx = x - k * 0.9 + t * k * 0.6; ctx.lineTo(bx + k * 0.6, y - k * 0.6); ctx.lineTo(bx + k * 0.6, y - k * 0.25); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2e24'; for (const cx of [-0.55, 0.65]) ctx.fillRect(x + cx * k - k * 0.09, y - k * 1.0, k * 0.18, k * 0.8);
      if (z > 3) for (const cx of [-0.55, 0.65]) for (let p = 0; p < 3; p++) { const t = (WAR.t * 0.6 + p / 3 + cx) % 1; ctx.fillStyle = `rgba(200,200,205,${0.35 * (1 - t)})`; ctx.beginPath(); ctx.arc(x + cx * k + t * k * 0.6, y - k * 1.05 - t * k * 1.1, k * (0.12 + t * 0.25), 0, 6.283); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,200,110,0.8)'; for (let t = 0; t < 4; t++) ctx.fillRect(x - k * 0.75 + t * k * 0.42, y + k * 0.02, k * 0.14, k * 0.14);
    } else if (st.type === 'harbour') {
      ctx.strokeStyle = '#e8dcc0'; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.4); ctx.lineTo(x, y + s * 0.35); ctx.moveTo(x - s * 0.3, y + s * 0.1); ctx.quadraticCurveTo(x, y + s * 0.5, x + s * 0.3, y + s * 0.1); ctx.stroke();
    } else if (st.type === 'tower') {
      ctx.fillStyle = '#2a2622'; ctx.strokeStyle = col; ctx.fillRect(x - s * 0.4, y - s * 0.55, s * 0.8, s * 1.1); ctx.strokeRect(x - s * 0.4, y - s * 0.55, s * 0.8, s * 1.1);
      ctx.fillStyle = '#e8dcc0'; for (let k = -1; k <= 1; k++) ctx.fillRect(x + k * s * 0.3 - s * 0.1, y - s * 0.7, s * 0.2, s * 0.18);
    } else {
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.2); g.addColorStop(0, 'rgba(255,200,110,0.55)'); g.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 2.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#3a3026'; ctx.beginPath(); ctx.moveTo(x - s * 0.35, y + s * 0.55); ctx.lineTo(x + s * 0.35, y + s * 0.55); ctx.lineTo(x, y - s * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd88a'; ctx.beginPath(); ctx.arc(x, y - s * 0.6, s * 0.28, 0, 6.283); ctx.fill();
    }
  }
}
function wvDrawFlares(z, dark) {
  for (const f of WAR.flares) {
    const x = wvSx(f.x + 0.5), y = wvSy(f.y + 0.5), r = (f.r || WARC.FLARE_R) * z, a = Math.min(1, f.t / 6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (f.fire) { g.addColorStop(0, `rgba(255,120,40,${0.55 * a})`); g.addColorStop(0.6, `rgba(120,40,10,${0.25 * a})`); g.addColorStop(1, 'rgba(60,20,0,0)'); }
    else { g.addColorStop(0, `rgba(255,120,80,${0.5 * a})`); g.addColorStop(1, 'rgba(255,120,80,0)'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    if (!f.fire) { ctx.fillStyle = `rgba(255,230,200,${a})`; ctx.beginPath(); ctx.arc(x, y - z * 2 * Math.min(1, f.t / WARC.FLARE_T + 0.4), Math.max(1.5, z * 0.25), 0, 6.283); ctx.fill(); }
  }
}
function wvDrawBoats(z) {
  const s = Math.max(5, z * 1.1);
  for (const b of WAR.boats) {
    if (b.from !== WAR.me && !wvSees(warIdx(clamp(Math.round(b.x), 0, WARC.W - 1), clamp(Math.round(b.y), 0, WARC.H - 1)))) continue;
    const x = wvSx(b.x + 0.5), y = wvSy(b.y + 0.5), col = WAR.nations[b.from].col;
    const nx = b.i < b.path.length - 1 ? warX(b.path[b.i + 1]) : b.x, ny = b.i < b.path.length - 1 ? warY(b.path[b.i + 1]) : b.y, a = b.ang != null ? b.ang : Math.atan2(ny - b.y, nx - b.x);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    // wake
    ctx.strokeStyle = 'rgba(200,220,240,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-s * 0.6, 0); ctx.lineTo(-s * 2.2, -s * 0.5); ctx.moveTo(-s * 0.6, 0); ctx.lineTo(-s * 2.2, s * 0.5); ctx.stroke();
    ctx.fillStyle = b.kind === 'fire' ? '#3a1e10' : '#3a2a1e'; ctx.beginPath(); ctx.moveTo(s * 0.8, 0); ctx.lineTo(-s * 0.5, -s * 0.38); ctx.lineTo(-s * 0.6, 0); ctx.lineTo(-s * 0.5, s * 0.38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = b.kind === 'fire' ? '#ff9a40' : col; ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.05); ctx.lineTo(0.3 * s, -s * 0.05); ctx.lineTo(0, -s * 0.9); ctx.closePath(); ctx.fill();
    if (b.kind === 'fire') { ctx.fillStyle = 'rgba(255,140,40,0.5)'; ctx.beginPath(); ctx.arc(0, 0, s * 0.9 + Math.sin(b.t * 9) * 1.5, 0, 6.283); ctx.fill(); }
    if (b.hit > 0) { b.hit -= 0.016; ctx.fillStyle = 'rgba(255,220,160,0.6)'; ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, 6.283); ctx.fill(); }
    ctx.restore();
    if (b.kind !== 'fire' && z > 4) { ctx.fillStyle = '#ece4cf'; ctx.font = `${Math.max(9, z * 1.3)}px "Courier Prime", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(warFmt(b.troops), x, y - s * 1.1); }
  }
}
function wvDrawAttacks(z) {
  // each attack: its strength at the front, drawn where the front is
  for (const at of WAR.attacks) {
    const front = at.frontCache && WAR.t - at.frontCache.t < 0.5 ? at.frontCache.f : (at.frontCache = { t: WAR.t, f: warFrontier(at) }).f;
    if (!front.length) continue;
    let sx = 0, sy = 0; for (const j of front) { sx += warX(j); sy += warY(j); } sx = sx / front.length + 0.5; sy = sy / front.length + 0.5;
    if (at.from !== WAR.me && !wvSees(warIdx(clamp(Math.floor(sx), 0, WARC.W - 1), clamp(Math.floor(sy), 0, WARC.H - 1)))) continue;
    const a = WAR.nations[at.from], x = wvSx(sx), y = wvSy(sy); if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
    ctx.strokeStyle = a.col; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -WAR.t * 20;
    if (!WV.fog || a.isMe) { ctx.beginPath(); ctx.moveTo(wvSx(a.cx + 0.5), wvSy(a.cy + 0.5)); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; const txt = `⚔ ${warFmt(at.troops)}`; ctx.font = `bold ${Math.max(10, Math.min(14, z * 1.6))}px "Courier Prime", monospace`;
    const tw = ctx.measureText(txt).width; ctx.fillRect(x - tw / 2 - 3, y - 8, tw + 6, 16);
    ctx.fillStyle = at.target === WAR.me ? '#ff9a7a' : a.isMe ? '#ffd88a' : '#ece4cf'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y);
  }
}
function wvDrawEvents(z) {
  for (const e of WAR.events) {
    if (e.kind === 'boom') { const x = wvSx(e.x + 0.5), y = wvSy(e.y + 0.5), k = 1 - e.t / 1.2; ctx.strokeStyle = `rgba(255,160,60,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, (WARC.FIRE_R + 2) * z * k, 0, 6.283); ctx.stroke(); }
  }
}
function wvDrawLight(lx, ly, z) {
  const s = Math.max(5, z * 1.4);
  ctx.fillStyle = '#e8e0cc'; ctx.fillRect(lx - s * 0.3, ly - s * 1.4, s * 0.6, s * 1.6);
  ctx.fillStyle = '#1b1713'; ctx.fillRect(lx - s * 0.4, ly - s * 1.6, s * 0.8, s * 0.25);
  // the lamp: dark by day, lit at night
  const on = WAR.phase === 'play' ? warDark() : 0;
  if (on > 0.02) { const g = ctx.createRadialGradient(lx, ly - s * 1.35, 0, lx, ly - s * 1.35, s * 1.6); g.addColorStop(0, `rgba(255,216,138,${0.9 * on})`); g.addColorStop(1, 'rgba(255,216,138,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly - s * 1.35, s * 1.6, 0, 6.283); ctx.fill(); }
  else { ctx.fillStyle = '#4a4236'; ctx.fillRect(lx - s * 0.22, ly - s * 1.5, s * 0.44, s * 0.3); }
  const lo = warLightOwner();
  if (lo >= 0 && z > 3) { ctx.fillStyle = '#ffd88a'; ctx.font = `${Math.max(9, z * 1.5)}px "Courier Prime", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`Keeper: ${WAR.nations[lo].name}`, lx, ly + s * 0.6); }
}
function wvDrawLabels(z) {
  // islands, faint; nations at their hearts with their strength
  if (z > 2.2) {
    ctx.font = `italic ${Math.max(9, Math.min(16, z * 2.2))}px "Courier Prime", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const r of WAR.regions) { if (r.tiles < 40) continue; const x = wvSx(r.x + 0.5), y = wvSy(r.y + 0.5); if (x < -80 || x > W + 80 || y < -20 || y > H + 20) continue; ctx.fillStyle = r.owner >= 0 ? 'rgba(255,216,138,0.55)' : 'rgba(236,228,207,0.3)'; ctx.fillText(r.name + (r.owner >= 0 ? ' ✦' : ''), x, y + Math.max(10, z * 2.4)); }
  }
  for (const n of WAR.nations) {
    const hid = WV.fog && !n.isMe && !n.allies.has(WAR.me), sn = hid && WV.snap ? WV.snap[n.id] : null;
    const ncx = sn ? sn.cx : n.cx, ncy = sn ? sn.cy : n.cy, ntiles = sn ? sn.tiles : n.tiles;
    if (!(sn ? sn.alive : n.alive) || ntiles < 6) continue;
    const seenNow = hid ? wvSees(warIdx(clamp(Math.floor(ncx), 0, WARC.W - 1), clamp(Math.floor(ncy), 0, WARC.H - 1))) : true;
    const x = wvSx(ncx + 0.5), y = wvSy(ncy + 0.5); if (x < -60 || x > W + 60 || y < -20 || y > H + 20) continue;
    const big = Math.max(10, Math.min(15, z * 1.7 + Math.sqrt(ntiles) * 0.25));
    ctx.font = `${n.isMe ? 'bold ' : ''}${big}px "Courier Prime", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = n.isMe ? '#ffd88a' : '#f2ecda';
    const nm = ntiles > 25 || z > 5 ? n.name : '';
    if (hid && !seenNow) ctx.globalAlpha = 0.55;
    if (nm) { ctx.strokeText(nm, x, y - big * 0.6); ctx.fillText(nm, x, y - big * 0.6); }
    const tr = hid && !seenNow ? '?' : `${warFmt(n.troops)}${n.bell > 0 ? ' 🔔' : ''}${n.allies.has(WAR.me) && !n.isMe ? ' ☍' : ''}`;
    ctx.font = `${big * 0.95}px "Courier Prime", monospace`; ctx.strokeText(tr, x, y + (nm ? big * 0.55 : 0)); ctx.fillText(tr, x, y + (nm ? big * 0.55 : 0));
    ctx.globalAlpha = 1;
  }
}
function wvDrawHover(z) {
  const i = WV.hover;
  if (WAR.phase === 'spawn') {
    const pick = WAR.spawnPick >= 0 ? WAR.spawnPick : i;
    if (pick >= 0) {
      const ok = warGoodSpawn(pick, WAR.spawnTaken), x = wvSx(warX(pick) + 0.5), y = wvSy(warY(pick) + 0.5);
      ctx.strokeStyle = ok ? '#ffd88a' : '#ff6a5a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, 2.6 * z, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      if (WAR.spawnPick >= 0) { ctx.fillStyle = 'rgba(255,216,138,0.2)'; ctx.beginPath(); ctx.arc(x, y, 2.6 * z, 0, 6.283); ctx.fill(); }
    }
    return;
  }
  if ((i < 0 && WV.mode !== 'harbour') || WV.touch && !WV.mode) return;
  if (WV.mode === 'harbour') {
    // your free shore glows, and the tile the harbour would snap to is ringed
    ctx.fillStyle = 'rgba(255,216,138,0.35)';
    const x0 = Math.max(0, Math.floor(WV.cam.x - W / 2 / z) - 1), x1 = Math.min(WARC.W - 1, Math.ceil(WV.cam.x + W / 2 / z) + 1), y0 = Math.max(0, Math.floor(WV.cam.y - H / 2 / z) - 1), y1 = Math.min(WARC.H - 1, Math.ceil(WV.cam.y + H / 2 / z) + 1);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const j = warIdx(tx, ty); if (WAR.owner[j] === WAR.me && WAR.map[j] >= 2 && WAR.map[j] !== 4 && !WAR.structs.has(j) && warShore(j)) ctx.fillRect(wvSx(tx), wvSy(ty), z, z); }
    const sn = i >= 0 ? wvNearestShore(i, WV.touch ? 5 : 3) : -1;
    if (sn >= 0) { ctx.strokeStyle = '#ffd88a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wvSx(warX(sn) + 0.5), wvSy(warY(sn) + 0.5), Math.max(6, z * 1.2), 0, 6.283); ctx.stroke(); }
    if (WV.touch) return;
  }
  if (i < 0) return;
  const x = wvSx(warX(i)), y = wvSy(warY(i));
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, z, z);
  if (WV.mode === 'flare' || WV.mode === 'fireship' || WV.mode === 'beacon' || WV.mode === 'tower' || WV.mode === 'factory') {
    const r = WV.mode === 'flare' ? WARC.FLARE_R : WV.mode === 'fireship' ? WARC.FIRE_R : WV.mode === 'beacon' ? WARC.BEACON_R : WV.mode === 'factory' ? WARC.FACTORY_R : WARC.TOWER_R;
    ctx.strokeStyle = 'rgba(255,216,138,0.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x + z / 2, y + z / 2, r * z, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
  }
}
function wvDrawVignette(dark) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.35 + dark * 0.25})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (WV.msg && WV.msgT > 0) { WV.msgT -= 0.016; ctx.font = '13px "Courier Prime", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = `rgba(255,154,122,${Math.min(1, WV.msgT)})`; ctx.fillText(WV.msg, W / 2, H * 0.3); }
}

// ---------- the panels ----------
function wvPanels() {
  const me = WAR.nations[WAR.me];
  const f = (WAR.t % WARC.DAY) / WARC.DAY, part = f < 0.56 ? 'Day' : f < WARC.NIGHT_FROM ? 'Dusk' : f < WARC.NIGHT_TO ? 'Night' : 'Dawn';
  const tideLeft = Math.ceil(WARC.TIDE / 2 - (WAR.tideT % (WARC.TIDE / 2)));
  const narrow = W < 720;
  $('warClock').textContent = WAR.phase === 'spawn' ? `${narrow ? 'Landing' : 'Choose your landing'} · ${Math.ceil(WAR.spawnT)} s${WAR.net && (WAR.net === 'client' ? WN.ready : WAR.spawnReady[WAR.me]) ? (narrow ? ' · ready' : ' · ready, waiting for the others') : ''}` : narrow ? `D${WAR.day} · ${part} · ${WAR.tideHigh ? 'high' : 'low'} ${tideLeft}s` : `Day ${WAR.day} · ${part} · ${WAR.tideHigh ? 'high water' : 'low water'}, turns in ${tideLeft} s`;
  $('warSpawnBar').hidden = WAR.phase !== 'spawn';
  $('warTroops').textContent = `${warFmt(me.troops)} / ${warFmt(me.maxTroops)}`;
  $('warGold').textContent = Math.floor(me.gold);
  $('warLand').textContent = `${me.tiles} · ${(me.tiles / WAR.landTiles * 100).toFixed(1).replace(/^(\d{3,}).*/, '100.0')}%`;
  $('warRatioOut').textContent = `${Math.round(WAR.ratio * 100)}% · ${warFmt(me.troops * WAR.ratio)}`;
  const cost = t => warStructCost(me, t);
  $('warHarbour').querySelector('small').textContent = `${cost('harbour')} g`; $('warTower').querySelector('small').textContent = `${cost('tower')} g`; $('warBeacon').querySelector('small').textContent = `${cost('beacon')} g`; $('warCity').querySelector('small').textContent = `${cost('city')} g`; $('warFactory').querySelector('small').textContent = `${cost('factory')} g`;
  $('warFlareBtn').querySelector('small').textContent = me.flareCd > 0 ? `${Math.ceil(me.flareCd)} s` : `${WARC.COSTS.flare} g`;
  $('warFireBtn').querySelector('small').textContent = me.harbours < 1 ? 'needs harbour' : me.fireCd > 0 ? `${Math.ceil(me.fireCd)} s` : `${WARC.COSTS.fireship} g`;
  $('warBellBtn').querySelector('small').textContent = me.bell > 0 ? 'ringing' : me.bellCd > 0 ? `${Math.ceil(me.bellCd)} s` : 'ready';
  for (const [id, m] of [['warCity', 'city'], ['warFactory', 'factory'], ['warHarbour', 'harbour'], ['warTower', 'tower'], ['warBeacon', 'beacon'], ['warFlareBtn', 'flare'], ['warFireBtn', 'fireship']]) $(id).classList.toggle('on', WV.mode === m);
  $('warActions').classList.toggle('dead', !me.alive);
  // the leaderboard, with pacts and the Keeper marked
  WV.boardT++;
  if (WV.boardT % 2 === 0) {
    const fogd = n => WV.fog && !n.isMe && !n.allies.has(WAR.me) && WV.snap ? WV.snap[n.id] : null;
    const T = n => { const s = fogd(n); return s ? s.tiles : n.tiles; }, A = n => { const s = fogd(n); return s ? s.alive : n.alive; };
    const rows = WAR.nations.filter(A).sort((a, b) => T(b) - T(a));
    const top = rows.slice(0, 8); if (me.alive && !top.includes(me)) top.push(me);
    const dead = WAR.nations.filter(n => !A(n)).length;
    $('warBoard').innerHTML = top.map(n => `<li class="${n.isMe ? 'me' : ''}${n.allies.has(WAR.me) && !n.isMe ? ' ally' : ''}"><i style="background:${n.col}"></i><span>${rows.indexOf(n) + 1}. ${wvEsc(n.name)}${n.light ? ' ✦' : ''}${n.allies.has(WAR.me) && !n.isMe ? ' ☍' : ''}</span><b>${(T(n) / WAR.landTiles * 100).toFixed(1).replace(/^(\d{3,}).*/, '100.0')}%</b><em>${fogd(n) ? '?' : warFmt(n.troops)}</em></li>`).join('') +
      `<li class="sum">${WV.fog ? 'Night: the others as they stood at dusk' : `${rows.length} nations stand${dead ? `, ${dead} fallen` : ''}`}</li>`;
  }
  // the log, newest at the bottom
  if (WAR.logDirty) { WAR.logDirty = false; const last = WAR.log.slice(-7); $('warLog').innerHTML = last.map(l => `<p class="${l.kind}">${wvEsc(l.text)}</p>`).join(''); const el = $('warLog'); el.scrollTop = el.scrollHeight; }
  // pact offers
  const pr = $('warPrompts');
  const want = WAR.prompts.map(p => p.from).join(',');
  if (pr.dataset.k !== want) {
    pr.dataset.k = want; pr.innerHTML = '';
    for (const p of WAR.prompts) {
      const d = document.createElement('div'); d.className = 'warprompt'; d.innerHTML = `<p>${wvEsc(p.text)}</p>`;
      const yes = document.createElement('button'); yes.className = 'primary'; yes.textContent = 'Swear it'; yes.onclick = () => wvAnswer(p, true);
      const no = document.createElement('button'); no.className = 'tool'; no.textContent = 'Refuse'; no.onclick = () => wvAnswer(p, false);
      const row = document.createElement('div'); row.className = 'btnrow'; row.append(yes, no); d.append(row); pr.append(d);
    }
  }
}
function wvAnswer(p, yes) { warDo('y', p.from, yes ? 1 : 0); const k = WAR.prompts.indexOf(p); if (k >= 0) WAR.prompts.splice(k, 1); wvPanels(); }
// ---------- the nations panel: ask for a pact, or break one ----------
function wvPactsOpen(on) { $('warPacts').classList.toggle('open', on); if (on) { WV.pactsKey = ''; wvPacts(); } }
function wvPacts() {
  const el = $('warPactsList'); if (!$('warPacts').classList.contains('open')) return;
  const me = WAR.nations[WAR.me], fogd = n => WV.fog && !me.allies.has(n.id) && WV.snap ? WV.snap[n.id] : null;
  const rows = WAR.nations.filter(n => !n.isMe && (fogd(n) ? fogd(n).alive : n.alive)).sort((a, b) => (b.allies.has(WAR.me) - a.allies.has(WAR.me)) || ((fogd(b) || b).tiles - (fogd(a) || a).tiles));
  const mood = r => r > 0.3 ? ['friendly', 'Friendly'] : r > -0.1 ? ['wary', 'Wary'] : r > -0.5 ? ['cold', 'Cold'] : ['hostile', 'Hostile'];
  const key = rows.map(n => `${n.id}:${me.allies.has(n.id) ? Math.ceil((me.allies.get(n.id) - WAR.t) / 10) : 0}:${mood(n.rel[WAR.me])[0]}:${n.reqCd > 0 ? Math.ceil(n.reqCd) : 0}:${WAR.attacks.some(a => a.from === n.id && a.target === WAR.me) ? 1 : 0}:${Math.round((fogd(n) || n).tiles / WAR.landTiles * 1000)}`).join('|');
  if (key === WV.pactsKey) return; WV.pactsKey = key;
  el.innerHTML = '';
  for (const n of rows) {
    const ally = me.allies.has(n.id), [mk, ml] = mood(n.rel[WAR.me]), war = WAR.attacks.some(a => a.from === n.id && a.target === WAR.me) || WAR.attacks.some(a => a.from === WAR.me && a.target === n.id);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'warpact' + (ally ? ' ally' : '');
    const status = (n.human ? 'A player · ' : '') + (ally ? `Sworn · ${Math.ceil((me.allies.get(n.id) - WAR.t))} s left · tap to break` : n.reqCd > 0 && !n.human ? `Refused · ask again in ${Math.ceil(n.reqCd)} s` : war ? 'At war with you · tap to ask for peace' : 'Tap to ask for a pact');
    btn.innerHTML = `<i style="background:${n.col}"></i><span class="nm">${wvEsc(n.name)}</span><span class="pct">${((fogd(n) || n).tiles / WAR.landTiles * 100).toFixed(1).replace(/^(\d{3,}).*/, '100.0')}%</span><span class="mood ${mk}">${ml}</span><small>${status}</small>`;
    btn.addEventListener('click', () => wvPactTap(n));
    el.append(btn);
  }
  if (!rows.length) el.innerHTML = '<p class="muted">No one else stands.</p>';
}
function wvPactTap(n) {
  const me = WAR.nations[WAR.me]; if (!me.alive || WAR.phase !== 'play') return;
  if (me.allies.has(n.id)) {
    // tapping a sworn nation again breaks the pact: an oath broken, which everyone remembers
    if (WV.breakArm === n.id && WAR.t - WV.breakT < 4) { warDo('x', n.id); WV.breakArm = -1; wvSay(`You break your pact with ${n.name}.`); }
    else { WV.breakArm = n.id; WV.breakT = WAR.t; wvSay(`Tap ${n.name} again to break your pact. Every nation will remember.`); }
  } else {
    if (n.reqCd > 0 && !n.human) { wvSay(`${n.name} will not hear you yet.`); return; }
    const why = warDo('p', n.id);
    if (WAR.net === 'client' || n.human) wvSay(why || `Your offer goes to ${n.name}.`);
    else if (!why) wvSay(`${n.name} swears a pact with you.`); else wvSay(`${n.name} refuses: ${why}.`);
  }
  WV.pactsKey = ''; wvPacts();
}
// names come from other players in a war played together: never let them be read as markup
const wvEsc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function wvSay(t) { WV.msg = t; WV.msgT = 2.5; }

// ---------- orders ----------
function wvOrderAt(i) {
  if (i < 0) return;
  const me = WAR.nations[WAR.me];
  if (WAR.phase === 'spawn') { if (!warSpawnMe(i)) wvSay('Not there: open land on a big enough island, away from the others.'); else { if (WAR.net === 'client') warDo('s', i); wvSay(WAR.net ? 'Your landing is marked. Tap Ready, or wait.' : 'Your landing is marked. Tap Land now, or wait.'); } return; }
  if (!me.alive) return;
  if (!warIsLand(i) || WAR.map[i] === 4) { if (WAR.map[i] === 4) wvSay('The Light stands on its rock; take the rock around it.'); return; }
  const o = WAR.owner[i], client = WAR.net === 'client';
  // (joined to someone else's war, the quick checks are made here and the rest by the host, who answers in the log)
  if (WV.mode === 'flare') { const why = (client && (me.flareCd > 0 ? 'The flare gun is still hot.' : me.gold < WARC.COSTS.flare ? 'Not enough gold.' : '')) || warDo('l', i); if (why) wvSay(why); else WV.mode = null; return; }
  if (WV.mode === 'fireship') { const why = (client && (me.harbours < 1 ? 'A fire-ship needs a harbour.' : me.gold < WARC.COSTS.fireship ? 'Not enough gold.' : '')) || warDo('f', i); if (why) wvSay(why); else WV.mode = null; return; }
  if (WV.mode === 'harbour' || WV.mode === 'tower' || WV.mode === 'beacon' || WV.mode === 'city' || WV.mode === 'factory') {
    // a harbour snaps to the nearest shore tile of yours (within a few tiles of the tap), so you needn't hit the exact edge
    const at = WV.mode === 'harbour' ? wvNearestShore(i, WV.touch ? 5 : 3) : i;
    const tile = at < 0 ? i : at, why = (client && warCanBuild(me, WV.mode, tile)) || warDo('u', WV.mode, tile); if (why) wvSay(at < 0 && WV.mode === 'harbour' ? 'No shore of yours near there.' : why); else WV.mode = null; return;
  }
  if (o === WAR.me) { const s = WAR.structs.get(i); wvSay(s ? `Your ${s.type} on ${warPlace(i)}.` : `Your land on ${warPlace(i)}. Pick a building below to raise it here.`); return; }
  if (o >= 0 && me.allies.has(o)) { wvSay(`${WAR.nations[o].name} are sworn to you. Break the pact by attacking anyway? Tap again.`); if (WV.lastAlly === i) { WV.lastAlly = -1; } else { WV.lastAlly = i; return; } }
  const troops = me.troops * WAR.ratio;
  if (troops < 1) { wvSay('You have no people to send.'); return; }
  // by land if the border touches, else by sea
  const bord = warBorders(WAR.me), byLand = o === -1 ? bord.neutral > 0 && wvSameShore(i) : o === WARC.DR ? bord.dr > 0 && wvSameShore(i) : bord.out.has(o) && wvSameShore(i);
  if (byLand) { warDo('a', o, WAR.ratio, i); return; }
  const why = warDo('b', i, WAR.ratio); if (why) wvSay(why);
}
// your nearest free shore tile to a tapped tile, within r tiles
function wvNearestShore(i, r) {
  const x0 = warX(i), y0 = warY(i); let best = -1, bd = 1e9;
  for (let y = Math.max(0, y0 - r); y <= Math.min(WARC.H - 1, y0 + r); y++) for (let x = Math.max(0, x0 - r); x <= Math.min(WARC.W - 1, x0 + r); x++) {
    const j = warIdx(x, y); if (WAR.owner[j] !== WAR.me || WAR.map[j] < 2 || WAR.map[j] === 4 || WAR.structs.has(j) || !warShore(j)) continue;
    const d = (x - x0) * (x - x0) + (y - y0) * (y - y0); if (d < bd) { bd = d; best = j; }
  }
  return best;
}
// is this tile on land that joins yours (at this tide)?
function wvSameShore(target) {
  const seen = WV.seen || (WV.seen = new Uint8Array(WAR.map.length)); seen.fill(0);
  const q = [target]; seen[target] = 1; let qh = 0;
  while (qh < q.length) { const i = q[qh++]; if (WAR.owner[i] === WAR.me) return true; warNeighbours(i, j => { if (!seen[j] && warIsLand(j)) { seen[j] = 1; q.push(j); } }); }
  return false;
}
// what each thing in the build menu does: shown in a banner at the top while it's picked
const WV_TIPS = {
  city: ['City', () => `${warStructCost(WAR.nations[WAR.me], 'city')} gold · Room for more of your people: your population cap rises by ${warFmt(WARC.CITY_POP)} and grows a little faster. Pays ${WARC.CITY_GOLD * 1} gold a second, double when a factory's railroad reaches it. Build on your land, inland is safest.`],
  factory: ['Factory', () => `${warStructCost(WAR.nations[WAR.me], 'factory')} gold · Lays railroads out to every city of yours within ${WARC.FACTORY_R} tiles and joins them to each other. Cities on its railroads pay double gold. Build it among your cities.`],
  harbour: ['Harbour', () => `${warStructCost(WAR.nations[WAR.me], 'harbour')} gold · Built on your shore. Brings in gold, lights the shore round it at night, and lets you send fire-ships. Tap your coast; it snaps to the nearest shore tile.`],
  tower: ['Watchtower', () => `${warStructCost(WAR.nations[WAR.me], 'tower')} gold · Enemies pay far more to take your land within ${WARC.TOWER_R} tiles of it, and it fires on enemy boats that pass. Best on a border.`],
  beacon: ['Beacon', () => `${warStructCost(WAR.nations[WAR.me], 'beacon')} gold · A fire that lights ${WARC.BEACON_R} tiles round it all night: the drowned can't come up there, and it sees through the fog. Best on a dark shore.`],
  flare: ['Flare', () => `${WARC.COSTS.flare} gold · Bursts over any spot you tap, lights ${WARC.FLARE_R} tiles for ${WARC.FLARE_T} s, clears the drowned off that land and shows it through the fog.`],
  fireship: ['Fire-ship', () => `${WARC.COSTS.fireship} gold · Needs a harbour. Sails to the enemy shore you tap and burns everything within ${WARC.FIRE_R} tiles of where it lands, people, land and buildings, friend or foe.`],
  bell: ['The bell', () => `Free, every ${WARC.BELL_CD} s · For ${WARC.BELL_T} s your land costs attackers far more to take, and your own attacks are heartened.`],
};
function wvTip() {
  const key = WV.mode || (WV.tipT > 0 ? WV.tipKey : null), el = $('warTip');
  if (!key || !WV_TIPS[key]) { if (!el.hidden) el.hidden = true; WV.tipShown = null; return; }
  const [head, body] = WV_TIPS[key], txt = body();
  if (WV.tipShown === key + txt && !el.hidden) return;
  WV.tipShown = key + txt; el.hidden = false;
  el.innerHTML = `<b>${head}</b><span>${txt}</span>${WV.mode ? '<small>Tap the map to place it · tap the button again or Esc to cancel</small>' : ''}`;
}
function wvMode(m) { WV.mode = WV.mode === m ? null : m; WV.tipT = 0; wvPanels(); wvTip(); }

// ---------- input ----------
function wvPointerDown(e) {
  if (!WAR.on || e.target !== cv) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  WV.touch = e.pointerType === 'touch';
  WV.pts = WV.pts || new Map(); WV.pts.set(e.pointerId, { x: px, y: py });
  if (WV.pts.size === 2) { const [a, b] = [...WV.pts.values()]; WV.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: WV.cam.z }; WV.drag = null; return; }
  if (e.button === 2) { WV.mode = null; wvPanels(); return; }
  WV.drag = { x: px, y: py, cx: WV.cam.x, cy: WV.cam.y, id: e.pointerId }; WV.moved = false;
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
}
function wvPointerMove(e) {
  if (!WAR.on) return;
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  if (WV.pts && WV.pts.has(e.pointerId)) WV.pts.set(e.pointerId, { x: px, y: py });
  if (WV.pinch && WV.pts && WV.pts.size === 2) {
    const [a, b] = [...WV.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    wvZoomAt(mx, my, (WV.pinch.z * d / Math.max(1, WV.pinch.d)) / WV.cam.z); return;
  }
  if (WV.drag && WV.drag.id === e.pointerId) {
    const dx = px - WV.drag.x, dy = py - WV.drag.y;
    if (Math.hypot(dx, dy) > 5) WV.moved = true;
    if (WV.moved) { WV.cam.x = WV.drag.cx - dx / WV.cam.z; WV.cam.y = WV.drag.cy - dy / WV.cam.z; wvClamp(); }
  }
  if (e.pointerType !== 'touch') WV.hover = wvTileAt(px, py);
}
function wvPointerUp(e) {
  if (!WAR.on) return;
  if (WV.pts) WV.pts.delete(e.pointerId);
  if (WV.pinch) { if (!WV.pts || WV.pts.size < 2) WV.pinch = null; WV.drag = null; return; }
  if (WV.drag && WV.drag.id === e.pointerId) {
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    if (!WV.moved && e.button !== 2) { const i = wvTileAt(px, py); WV.hover = i; wvOrderAt(i); }
    WV.drag = null;
  }
}
function wvWheel(e) { if (!WAR.on || e.target !== cv) return; e.preventDefault(); const r = cv.getBoundingClientRect(); wvZoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15); }
function wvKey(e) {
  if (!WAR.on) return;
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  e.stopImmediatePropagation();
  const k = e.code;
  if (k === 'Escape') { e.preventDefault(); if (WV.mode) { WV.mode = null; wvPanels(); } else wvMenu(!$('warMenu').hidden ? false : true); return; }
  if (!$('warMenu').hidden) return;
  if (k === 'Space') { e.preventDefault(); if (!WAR.net) { WAR.paused = !WAR.paused; wvSpeedUi(); } }
  else if (/^Digit[123]$/.test(k)) { if (!WAR.net) wvSpeed(k === 'Digit1' ? 1 : k === 'Digit2' ? 2 : 4); }
  else if (k === 'KeyC') wvMode('city'); else if (k === 'KeyV') wvMode('factory');
  else if (k === 'KeyH') wvMode('harbour'); else if (k === 'KeyT') wvMode('tower'); else if (k === 'KeyG') wvMode('beacon'); else if (k === 'KeyF') wvMode('flare'); else if (k === 'KeyX') wvMode('fireship');
  else if (k === 'KeyB') { const why = warDo('r'); if (why) wvSay(why); }
  else if (k === 'KeyQ' || k === 'KeyE') { WAR.ratio = clamp(WAR.ratio + (k === 'KeyE' ? 0.1 : -0.1), 0.05, 1); $('warRatio').value = Math.round(WAR.ratio * 100); wvPanels(); }
  else if (k === 'Enter' && WAR.phase === 'spawn') wvLandNow();
  else if (k === 'Tab') { e.preventDefault(); $('warSide').classList.toggle('open'); }
  else if (/Arrow/.test(k) || /Key[WASD]/.test(k)) { const s = 20 / WV.cam.z; if (k === 'ArrowLeft' || k === 'KeyA') WV.cam.x -= s; if (k === 'ArrowRight' || k === 'KeyD') WV.cam.x += s; if (k === 'ArrowUp' || k === 'KeyW') WV.cam.y -= s; if (k === 'ArrowDown' || k === 'KeyS') WV.cam.y += s; wvClamp(); }
  else if (k === 'Minus' || k === 'Equal') wvZoomAt(W / 2, H / 2, k === 'Equal' ? 1.25 : 0.8);
}
function wvSpeed(s) { WAR.speed = s; WAR.paused = false; wvSpeedUi(); }
function wvSpeedUi() { for (const b of document.querySelectorAll('#warSpeed button')) b.classList.toggle('on', WAR.paused ? b.dataset.s === '0' : +b.dataset.s === WAR.speed); }
function wvMenu(on) { $('warMenu').hidden = !on; if (WAR.net) return; if (on) { WV.wasPaused = WAR.paused; WAR.paused = true; } else WAR.paused = !!WV.wasPaused; wvSpeedUi(); }
// land now: alone, at once; played together, you're ready (everyone lands when all are, or when the clock runs out)
function wvLandNow() {
  if (WAR.phase !== 'spawn') return;
  if (!WAR.net) { warBeginPlay(); return; }
  warDo('n'); wvSay('Ready. Everyone lands when all are ready, or when the clock runs out.'); wvPanels();
}

// ---------- start, stop, results ----------
function warViewStart() {
  WV.touch = matchMedia('(pointer: coarse)').matches;
  WV.cam = { x: WARC.W / 2, y: WARC.H / 2, z: 6 }; WV.focused = false; WV.terr = null; WV.own = null; WV.mode = null; WV.hover = -1; WV.msgT = 0; WV.fog = false; WV.vis = null; WV.seen2 = null; WV.vdist = null; WV.vq = null; WV.fogNoise = null; WV.snap = null; WV.seenInit = false; WV.fogSaid = false;
  wvFit();
  const n = WAR.nations[WAR.me];
  $('warUI').hidden = false; $('warOver').hidden = true; $('warMenu').hidden = true; $('warPacts').classList.remove('open'); WV.breakArm = -1;
  $('warRatio').value = Math.round(WAR.ratio * 100);
  $('warMe').innerHTML = `<i style="background:${n.col}"></i>`; $('warMe').append(document.createTextNode(n.name));
  $('warSpeed').hidden = !!WAR.net;
  $('warLandNow').textContent = WAR.net ? 'Ready' : 'Land now';
  wvSpeedUi(); wvPanels();
  $('warLog').innerHTML = '';
}
function warViewStop() { $('warUI').hidden = true; $('warOver').hidden = true; $('warMenu').hidden = true; $('stage').classList.remove('warmode'); }
function warShowResult(r) {
  const el = $('warOver'); el.hidden = false;
  $('warOverHead').textContent = r.how === 'won' ? 'The Reach is yours' : r.how === 'beaten' ? 'The Reach is theirs' : r.how === 'gone' ? 'The war ends' : 'Your line ends';
  $('warOverText').textContent = r.how === 'won'
    ? `By day ${r.days} you hold ${(r.share * 100).toFixed(0)}% of the land. The Light shines for you.`
    : r.how === 'beaten' ? `${r.by || 'Another nation'} won the war on day ${r.days}. You held ${(r.share * 100).toFixed(0)}% of the land at the end, took ${r.taken} tiles and ended ${r.kills} nation${r.kills === 1 ? '' : 's'}.`
    : r.how === 'gone' ? `The host left on day ${r.days}, and the war can't go on without them.`
    : `${r.by ? r.by + ' took the last of your land' : 'The sea took the last of your land'} on day ${r.days}. You had taken ${r.taken} tiles and ended ${r.kills} nation${r.kills === 1 ? '' : 's'}.`;
  $('warWatch').hidden = r.how === 'gone';
  const st = warLoadStats();
  $('warOverStats').textContent = `Games ${st.games || 0} · won ${st.wins || 0} · most land taken ${st.bestTiles || 0} · longest ${st.bestDays || 0} day${st.bestDays === 1 ? '' : 's'}`;
}

// the game's own start, from the title card
// the screen given over to the war (alone or together)
function warEnter() {
  try { audioInit(); } catch (e) {}
  WAR.saved = { state }; state = 'war'; paused = false;
  $('titleCard').hidden = true; $('hud').hidden = true; $('logbox').hidden = true; $('biomeBanner').hidden = true;
  $('stage').classList.add('warmode');
}
function warGo() {
  if (WAR.on) return;
  if (typeof WN !== 'undefined' && WN.code) wnLeave();   // (a solo game takes you out of any lobby)
  const bots = clamp(parseInt($('warBots').value, 10) || 16, 1, 50);
  const seedIn = ($('warSeed').value || '').trim();
  let seed = 0; if (seedIn) { for (let i = 0; i < seedIn.length; i++) seed = (seed * 31 + seedIn.charCodeAt(i)) >>> 0; } else seed = (Math.random() * 4294967295) >>> 0;
  warEnter();
  const diff = $('warDiff').value || 'normal';
  try { localStorage.setItem('skerry-war-diff', diff); } catch (e) {}
  warStart(bots, seed, diff);
  warViewStart();
  try { localStorage.setItem('skerry-war-bots', String(bots)); } catch (e) {}
}

// ---------- wiring ----------
addEventListener('pointerdown', wvPointerDown, true);
addEventListener('pointermove', wvPointerMove, true);
addEventListener('pointerup', wvPointerUp, true);
addEventListener('pointercancel', wvPointerUp, true);
addEventListener('wheel', wvWheel, { passive: false, capture: true });
addEventListener('keydown', wvKey, true);
addEventListener('contextmenu', e => { if (WAR.on && e.target === cv) e.preventDefault(); }, true);
addEventListener('resize', () => { if (WAR.on) wvFit(); });
(() => {
  $('warPlay').addEventListener('click', warGo);
  $('warBanner').addEventListener('click', () => { $('warTitle').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('warPlay').focus({ preventScroll: true }), 400); });
  $('warNick').addEventListener('keydown', e => { if (e.key === 'Enter') warGo(); });
  try { const b = localStorage.getItem('skerry-war-bots'); if (b) $('warBots').value = b; const d = localStorage.getItem('skerry-war-diff'); if (d && WAR_DIFF[d]) $('warDiff').value = d; } catch (e) {}
  $('warPactsBtn').addEventListener('click', () => wvPactsOpen(!$('warPacts').classList.contains('open')));
  $('warPactsClose').addEventListener('click', () => wvPactsOpen(false));
  $('warBots').addEventListener('input', () => { $('warBotsOut').textContent = $('warBots').value; }); $('warBotsOut').textContent = $('warBots').value;
  $('warRatio').addEventListener('input', () => { WAR.ratio = (+$('warRatio').value) / 100; wvPanels(); });
  $('warCity').addEventListener('click', () => wvMode('city')); $('warFactory').addEventListener('click', () => wvMode('factory'));
  $('warHarbour').addEventListener('click', () => wvMode('harbour')); $('warTower').addEventListener('click', () => wvMode('tower')); $('warBeacon').addEventListener('click', () => wvMode('beacon'));
  $('warFlareBtn').addEventListener('click', () => wvMode('flare')); $('warFireBtn').addEventListener('click', () => wvMode('fireship'));
  $('warBellBtn').addEventListener('click', () => { WV.mode = null; WV.tipKey = 'bell'; WV.tipT = 5; wvTip(); const why = warDo('r'); if (why) wvSay(why); });
  for (const b of document.querySelectorAll('#warSpeed button')) b.addEventListener('click', () => { const s = +b.dataset.s; if (s === 0) { WAR.paused = !WAR.paused; wvSpeedUi(); } else wvSpeed(s); });
  $('warMenuBtn').addEventListener('click', () => wvMenu(true)); $('warResume').addEventListener('click', () => wvMenu(false)); $('warLeave').addEventListener('click', warStop);
  $('warSideBtn').addEventListener('click', () => $('warSide').classList.toggle('open'));
  $('warLandNow').addEventListener('click', wvLandNow);
  $('warRandomLand').addEventListener('click', () => { if (WAR.phase !== 'spawn') return; WAR.spawnPick = -1; if (WAR.net === 'client') warDo('s', -1); wvLandNow(); });
  $('warWatch').addEventListener('click', () => { $('warOver').hidden = true; });
  $('warOverLeave').addEventListener('click', warStop);
  $('warHowBtn').addEventListener('click', () => { $('warHow').hidden = !$('warHow').hidden; });
  const st = warLoadStats(); if (st.games) $('warRecord').textContent = `You have fought ${st.games} war${st.games === 1 ? '' : 's'} and won ${st.wins || 0}.`;
})();
