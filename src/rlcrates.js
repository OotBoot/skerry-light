'use strict';
// Skerry Clash: tower skins, the Lampwright's Crate they come from, your record, and the wiring of the card.
//
// The towers. Each side's rock has its Great Light and two Lamp Towers, and a skin dresses all three at once: the
// tower's paint or stone, its lantern, the colour of its lamp, and how it shines. rlTowerMesh(id, kind, side) builds
// one as a THREE.Group for the match's view (src/rl3d.js): base at y = 0, centred, the Great Light about 5 tiles tall
// and 3.2 across its foot, a Lamp Tower about 3.5 tall and 2.4 across. Whatever the skin, the side's colour (blue for
// side 0, red for side 1) is on the ring round the plinth, the gallery rail and the pennant on the vane, so you can
// always tell whose tower it is. userData.lamp is the lamp (the view may brighten or dim it), userData.tick(t) moves
// whatever moves. A plain whitewashed tower for '' or an unknown id.
//
// A crate system of its own, like the golf's (src/gfcrates.js): it borrows the boat crates' grades and odds
// (RARITIES), their card styles and the reel sounds, without changing any of them. 18 skins across the grades, and
// the better the grade, the more it does:
//   Deckhand  a paint or a stone: whitewash and red bands, a black coil, granite, an iron screw-pile, tarred timber
//   Bosun     a richer finish: a brass lantern room, a Martello tower of dressed stone, daymark chequers, lichen
//   Mate      it shimmers: a sheen runs up the tower (sea-glass, moonlit rock, hoarfrost)
//   Captain   it glows, pulsing, with a halo round the lamp (ember, corpse light, thunderhead)
//   Admiral   alive: a turning beam, and the Northern Lights' ribbons, the Maelstrom's swirl of sparks round the
//             tower, or the Drowned Light hung with weed with its bubbles rising
//
// The record (rlRecord(r), which src/rl.js calls as each match ends): played, won, lost, drawn, the streak and the
// best streak, crowns taken. And the earnings: a crate for every match finished and one more for a win; the first
// crate is free. All of it is in the one save, 'skerry-rival' (src/rldeck.js RLV), merged into the game's save by
// rkData() / rkMerge(d, takeLooks) from src/crates.js.
//
// The global API:
//   rlSkinMine()                 -> the chosen skin's id ('' plain)
//   rlSkin(id)                   -> the skin's data, or null
//   rlTowerMesh(id, kind, side)  -> THREE.Group ('great' | 'lamp', side 0 | 1)
//   rlRecord(r)                  r = { win, draw, crowns, lost, bot, lvl }
//   rkData() / rkMerge(d, takeLooks) for the one save (src/crates.js)

const RLK_ROWS = [
  // id, name, grade, pattern, main colour, second colour, extra
  ['t_redband', 'Whitewash and Red', 'deckhand', 'bands', '#f2eee4', '#c0302a', { cap: '#1e1e22' }],
  ['t_coil', 'The Black Coil', 'deckhand', 'spiral', '#f0ece2', '#1a1a1e', { cap: '#1a1a1e' }],
  ['t_granite', 'Granite Course', 'deckhand', 'blocks', '#8e8c88', '#6a6866', { cap: '#2a3a3a', rock: '#4a4a48' }],
  ['t_pile', 'Iron Screw-Pile', 'deckhand', 'boards', '#b03a2a', '#e8e0cc', { shape: 'pile', cap: '#2a2a2e', metal: '#2a2a2e' }],
  ['t_timber', 'Tarred Timber', 'deckhand', 'planks', '#3a2e24', '#1e1814', { sides: 8, cap: '#5a4a3a' }],
  ['t_brass', 'Brass Lantern', 'bosun', 'bands', '#2e4a3a', '#d8a840', { thin: 1, cap: '#d8a840', metal: '#d8a840', lamp: '#ffe0a0' }],
  ['t_martello', 'Martello Stone', 'bosun', 'blocks', '#bcae8e', '#9a8a6a', { shape: 'martello', cap: '#4a4038', rock: '#5a5246' }],
  ['t_daymark', 'Daymark Chequers', 'bosun', 'chequer', '#f0ece0', '#c03028', { cap: '#1e1e22' }],
  ['t_lichen', 'Lichen and Limewash', 'bosun', 'lichen', '#e8e4d4', '#c8b040', { cap: '#3a4a3a', rock: '#3e4a40' }],
  ['t_seaglass', 'Sea-Glass Light', 'mate', 'glass', '#6ac8b0', '#c8fff0', { fx: 'shimmer', glow: '#9affe0', lamp: '#d8fff4', cap: '#2a5a50' }],
  ['t_moon', 'Moonlit Rock', 'mate', 'moon', '#9aa6c4', '#e8eeff', { fx: 'shimmer', glow: '#c8d8ff', lamp: '#e8f0ff', cap: '#2a3048', rock: '#3a4058' }],
  ['t_frost', 'Hoarfrost', 'mate', 'frost', '#cfe6f2', '#ffffff', { fx: 'shimmer', glow: '#bfe8ff', lamp: '#f0faff', cap: '#5a7a8a' }],
  ['t_ember', 'Ember Light', 'captain', 'cracks', '#4a2416', '#ff7a2a', { fx: 'glow', glow: '#ff8a30', lamp: '#ffb060', cap: '#1a0a06', rock: '#2a1a14' }],
  ['t_corpse', 'Corpse Light', 'captain', 'veins', '#2a3e32', '#7affb0', { fx: 'glow', glow: '#7affb0', lamp: '#9affc8', cap: '#0e1a12', rock: '#1e2a24' }],
  ['t_thunder', 'Thunderhead', 'captain', 'bolts', '#2c3454', '#b8f0ff', { fx: 'glow', glow: '#9ae0ff', lamp: '#e0f8ff', cap: '#0e1020', rock: '#24283a' }],
  ['t_aurora', 'Northern Lights', 'admiral', 'ribbons', '#101a30', '#7affb0', { c3: '#b07aff', fx: 'aura', adm: 'aurora', glow: '#7affb0', lamp: '#e0fff0', cap: '#0a1020', rock: '#1a2234' }],
  ['t_maelstrom', 'The Maelstrom', 'admiral', 'whirl', '#140a2a', '#62e0ff', { c3: '#c06aff', fx: 'aura', adm: 'whirl', glow: '#7ad0ff', lamp: '#d8f4ff', cap: '#0a0618', rock: '#1e1430' }],
  ['t_drowned', 'The Drowned Light', 'admiral', 'weed', '#1e3a34', '#3aff9a', { fx: 'aura', adm: 'drowned', glow: '#3aff9a', lamp: '#7affc0', cap: '#0e201c', rock: '#1a2a26', metal: '#2a4a40' }],
];
const RLK_SKINS = RLK_ROWS.map(([id, name, rarity, pat, c1, c2, x]) => Object.freeze(Object.assign({ id, name, rarity, pat, c1, c2 }, x || {})));
const RLK_BY_ID = Object.fromEntries(RLK_SKINS.map(s => [s.id, s]));
const RLK_PLAIN = Object.freeze({ id: '', name: 'Plain Whitewash', pat: 'plain', c1: '#efebe0', c2: '#d8d2c4', cap: '#22242a' });
const RLK_SIDE = ['#3a8ae8', '#e0483a'];
var RLK = { opening: false, opener: null, prev: {}, gl: null, tex: {} };
function rlSkin(id) { return (typeof id === 'string' && RLK_BY_ID[id]) || null; }
function rlSkinMine() { return RLV.o[RLV.e] && RLK_BY_ID[RLV.e] ? RLV.e : ''; }
function rlkRarity(s) { return s && s.rarity ? RARITIES.find(r => r.id === s.rarity) : null; }
function rlkLevel(s) { return s && s.rarity ? RARITIES.findIndex(r => r.id === s.rarity) + 1 : 0; }

// ---------- the tower's paint: a canvas wrapped round its body (u round it, the top of the canvas at its top) ----------
function rlkPaint(sk, W, H, em) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rlaRand(sk.id || 'plain');
  const line = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; };
  // the emissive map: black, with only what glows drawn on it
  if (em) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
  else { g.fillStyle = sk.c1; g.fillRect(0, 0, W, H); }
  const glowCol = sk.c2;
  switch (sk.pat) {
    case 'plain': case 'bands': {
      if (em) break;
      // weathering streaks running down from the gallery
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(80,70,60,' + (0.03 + R() * 0.05) + ')'; g.fillRect(R() * W, 0, 1 + R() * 3, H * (0.2 + R() * 0.6)); }
      if (sk.pat === 'bands') { g.fillStyle = sk.c2; const n = sk.thin ? 5 : 2; for (let i = 0; i < n; i++) { const y = H * ((i + 0.5) / n) - H * (sk.thin ? 0.02 : 0.11); g.fillRect(0, y, W, H * (sk.thin ? 0.04 : 0.2)); } }
      break; }
    case 'spiral': if (em) break; g.fillStyle = sk.c2; for (let k = -4; k < 6; k++) { g.beginPath(); const o = k * H / 2.5; g.moveTo(0, o); g.lineTo(W, o - H / 2.5 * 1.0); g.lineTo(W, o - H / 2.5 * 0.5); g.lineTo(0, o + H / 2.5 * 0.5); g.closePath(); g.fill(); } break;
    case 'blocks': case 'lichen': {
      if (em) break;
      const rows = sk.pat === 'blocks' ? 14 : 0, cols = 8;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const x = (q + (r % 2) * 0.5) * W / cols, y = r * H / rows, v = (R() - 0.5) * 0.2; g.fillStyle = rlaMix(sk.c1, v > 0 ? '#ffffff' : '#000000', Math.abs(v)); g.fillRect(x, y, W / cols, H / rows); if (x + W / cols > W) g.fillRect(x - W, y, W / cols, H / rows); }
      if (rows) { line(1.5, sk.c2); for (let r = 0; r <= rows; r++) { g.beginPath(); g.moveTo(0, r * H / rows); g.lineTo(W, r * H / rows); g.stroke(); for (let q = 0; q <= cols; q++) { const x = (q + (r % 2) * 0.5) * W / cols % W; g.beginPath(); g.moveTo(x, r * H / rows); g.lineTo(x, (r + 1) * H / rows); g.stroke(); } } }
      if (sk.pat === 'lichen') for (let i = 0; i < 70; i++) { const x = R() * W, y = H * (0.3 + Math.pow(R(), 0.6) * 0.7), r = 2 + R() * 7; g.fillStyle = R() < 0.6 ? sk.c2 : '#8a9a5a'; g.globalAlpha = 0.5 + R() * 0.4; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.globalAlpha = 1; }
      break; }
    case 'chequer': if (em) break; g.fillStyle = sk.c2; for (let r = 0; r < 8; r++) for (let q = 0; q < 6; q++) if ((r + q) % 2) g.fillRect(q * W / 6, r * H / 8, W / 6, H / 8); break;
    case 'boards': if (em) break; line(1, 'rgba(0,0,0,0.3)'); for (let q = 0; q < 12; q++) { g.beginPath(); g.moveTo(q * W / 12, 0); g.lineTo(q * W / 12, H); g.stroke(); } g.fillStyle = sk.c2; for (let q = 0; q < 6; q++) g.fillRect((q + 0.3) * W / 6, H * 0.35, W / 6 * 0.4, H * 0.3); break;
    case 'planks': if (em) break; for (let q = 0; q < 16; q++) { g.fillStyle = rlaMix(sk.c1, '#000000', R() * 0.35); g.fillRect(q * W / 16, 0, W / 16 - 1, H); } line(1.2, sk.c2); for (let r = 1; r < 6; r++) { g.beginPath(); g.moveTo(0, r * H / 6); g.lineTo(W, r * H / 6); g.stroke(); } break;
    case 'glass': case 'moon': case 'frost': {
      if (!em) { g.fillStyle = rlaLin(g, 0, 0, 0, H, [sk.c2, sk.c1, rlaMix(sk.c1, '#000000', 0.3)]); g.fillRect(0, 0, W, H); }
      if (sk.pat === 'glass') { line(1.4, em ? 'rgba(160,255,220,0.5)' : 'rgba(255,255,255,0.45)'); for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 30, y + 10 + R() * 20); g.lineTo(x + (R() - 0.5) * 30, y + 30 + R() * 20); g.stroke(); } }
      if (sk.pat === 'moon') for (let i = 0; i < 30; i++) { const x = R() * W, y = R() * H, r = 2 + R() * 6; g.fillStyle = em ? 'rgba(200,215,255,0.35)' : 'rgba(60,70,100,0.35)'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
      if (sk.pat === 'frost') { line(1, em ? 'rgba(200,240,255,0.6)' : 'rgba(255,255,255,0.8)'); for (let i = 0; i < 22; i++) { const x = R() * W, y = R() * H, l = 4 + R() * 9; for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a * 1.047) * l, y + Math.sin(a * 1.047) * l); g.stroke(); } } }
      break; }
    case 'cracks': case 'veins': case 'bolts': {
      for (let i = 0; i < (sk.pat === 'veins' ? 9 : 14); i++) {
        let x = R() * W, y = sk.pat === 'bolts' ? 0 : R() * H; const pts = [[x, y]];
        for (let s = 0; s < 10; s++) { if (sk.pat === 'veins') { x += (R() - 0.5) * 18; y += H / 12; } else if (sk.pat === 'bolts') { x += (R() - 0.5) * 26; y += H / 10; } else { x += (R() - 0.5) * 30; y += (R() - 0.4) * 24; } pts.push([x, y]); }
        for (const [w, a] of em ? [[7, 0.35], [2.5, 1]] : [[3, 0.6]]) { line(w, em ? glowCol : rlaMix(sk.c1, '#000000', 0.5)); g.globalAlpha = a; g.beginPath(); pts.forEach(([px, py], j) => j ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); }
        g.globalAlpha = 1;
      }
      break; }
    case 'ribbons': {
      for (let i = 0; i < 9; i++) { const x0 = i / 9 * W, c = i % 3 ? sk.c2 : sk.c3; g.fillStyle = rlaLin(g, 0, 0, 0, H, [c + '00', [0.3, c + (em ? 'ff' : '66')], [0.7, c + (em ? '88' : '33')], [1, c + '00']]); g.beginPath(); g.moveTo(x0, 0); for (let y = 0; y <= H; y += 8) g.lineTo(x0 + Math.sin(y * 0.04 + i) * 10, y); for (let y = H; y >= 0; y -= 8) g.lineTo(x0 + 9 + Math.sin(y * 0.04 + i) * 10, y); g.closePath(); g.fill(); }
      if (!em) { g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { g.globalAlpha = 0.4 + R() * 0.6; g.fillRect(R() * W, R() * H, 1.4, 1.4); } g.globalAlpha = 1; }
      break; }
    case 'whirl': {
      for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 50; s++) { const f = s / 50, x = ((arm / 3 + f * 0.9) % 1) * W, y = H * f; g.globalAlpha = em ? 0.9 : 0.5; g.fillStyle = arm % 2 ? sk.c3 : sk.c2; g.beginPath(); g.arc(x, y, 3 + 5 * (1 - Math.abs(f - 0.5) * 2), 0, 6.283); g.fill(); }
      g.globalAlpha = 1; break; }
    case 'weed': {
      if (!em) { for (let i = 0; i < 50; i++) { g.fillStyle = rlaMix(sk.c1, '#000000', R() * 0.4); g.fillRect(R() * W, R() * H, 6 + R() * 14, 4 + R() * 10); } }
      for (let i = 0; i < 16; i++) { const x = R() * W; line(em ? 2 : 4, em ? 'rgba(60,255,150,0.6)' : '#2a5a2a'); g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < H * (0.4 + R() * 0.5); y += 6) g.lineTo(x + Math.sin(y * 0.08 + i) * 4, y); g.stroke(); }
      if (!em) { g.fillStyle = 'rgba(220,230,210,0.6)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(R() * W, H * (0.6 + R() * 0.4), 1.5 + R() * 2, 0, 6.283); g.fill(); } }
      break; }
  }
  return c;
}
function rlkTex(sk) {
  const key = sk.id || 'plain'; if (RLK.tex[key]) return RLK.tex[key];
  const mk = cv => { const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; if ('colorSpace' in t) t.colorSpace = 'srgb'; else if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; return t; };
  const map = mk(rlkPaint(sk, 128, 256, false)), em = sk.fx ? mk(rlkPaint(sk, 128, 256, true)) : null;
  return (RLK.tex[key] = { map, em });
}
var RLK_SPR = null;
function rlkDot() {
  if (RLK_SPR) return RLK_SPR;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = rlaRad(g, 32, 32, 0, 32, ['rgba(255,255,255,1)', [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, 64, 64);
  return (RLK_SPR = new THREE.CanvasTexture(c));
}
var RLK_SHEEN = null;
function rlkSheen() {
  if (RLK_SHEEN) return RLK_SHEEN;
  const c = document.createElement('canvas'); c.width = 16; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = rlaLin(g, 0, 0, 0, 128, ['rgba(255,255,255,0)', [0.42, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,1)'], [0.58, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, 16, 128);
  const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; return (RLK_SHEEN = t);
}

// ---------- the mesh ----------
function rlTowerMesh(id, kind, side) {
  const sk = rlSkin(id) || RLK_PLAIN, great = kind !== 'lamp', H = great ? 5 : 3.5, R = great ? 1.6 : 1.2;
  const G = new THREE.Group(), C = v => new THREE.Color(v), trim = C(RLK_SIDE[side === 1 ? 1 : 0]);
  const lam = (c, x) => new THREE.MeshLambertMaterial(Object.assign({ color: C(c) }, x || {}));
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); G.add(m); return m; };
  const T = rlkTex(sk), lampC = C(sk.lamp || '#fff0c0'), glowC = C(sk.glow || sk.lamp || '#ffe8a0');
  const metal = lam(sk.metal || '#24262c'), capM = lam(sk.cap || '#22242a'), rockM = lam(sk.rock || '#4a4640', { flatShading: true }), trimM = lam(trim, { emissive: trim, emissiveIntensity: 0.35 });
  const bodyM = lam('#ffffff', { map: T.map });
  if (T.em) { bodyM.emissive = C('#ffffff'); bodyM.emissiveMap = T.em; bodyM.emissiveIntensity = sk.fx === 'shimmer' ? 0.35 : 0.9; }
  const shape = sk.shape || 'round', sides = sk.sides || 28;
  let y0 = H * 0.13, y1 = H * 0.72, rTop = R * 0.5, bodies = [];
  // the rock it stands on (not the screw-pile: that stands on its legs in the shallows)
  if (shape !== 'pile') {
    const rk = add(new THREE.CylinderGeometry(R * 0.92, R * 1.0, H * 0.11, 9), rockM, 0, H * 0.055, 0); rk.rotation.y = 0.3;
    add(new THREE.CylinderGeometry(R * 0.86, R * 0.88, H * 0.035, sides), trimM, 0, H * 0.11 + H * 0.0175, 0);
  }
  if (shape === 'round') {
    bodies.push(add(new THREE.CylinderGeometry(rTop, R * 0.76, y1 - y0, sides, 1), bodyM, 0, (y0 + y1) / 2, 0));
  } else if (shape === 'martello') {
    // a squat drum of dressed stone with a parapet, and a short light tower on it
    const yd = H * 0.42;
    bodies.push(add(new THREE.CylinderGeometry(R * 0.86, R * 0.9, yd - y0, sides, 1), bodyM, 0, (y0 + yd) / 2, 0));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, m = add(new THREE.BoxGeometry(R * 0.28, H * 0.05, R * 0.14), lam(sk.c2), Math.cos(a) * R * 0.82, yd + H * 0.025, Math.sin(a) * R * 0.82); m.rotation.y = -a + Math.PI / 2; }
    add(new THREE.CylinderGeometry(R * 0.8, R * 0.8, H * 0.012, sides), capM, 0, yd, 0);
    rTop = R * 0.42; bodies.push(add(new THREE.CylinderGeometry(rTop, R * 0.5, y1 - yd, sides, 1), bodyM, 0, (yd + y1) / 2, 0));
  } else {
    // the screw-pile: iron legs out of the water, braced, and a cottage on them
    const yc = H * 0.44, legR = R * 0.9;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x0 = Math.cos(a) * legR, z0 = Math.sin(a) * legR, x1 = Math.cos(a) * R * 0.5, z1 = Math.sin(a) * R * 0.5, len = Math.hypot(x0 - x1, yc, z0 - z1);
      const leg = add(new THREE.CylinderGeometry(R * 0.05, R * 0.06, len, 6), metal, (x0 + x1) / 2, yc / 2, (z0 + z1) / 2); leg.lookAt(x1, yc, z1); leg.rotateX(Math.PI / 2);
      add(new THREE.CylinderGeometry(R * 0.11, R * 0.13, H * 0.03, 8), trimM, x0, H * 0.015, z0); }
    add(new THREE.TorusGeometry(R * 0.72, R * 0.03, 4, 12), metal, 0, yc * 0.5, 0).rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(R * 0.62, R * 0.62, H * 0.025, 6), metal, 0, yc, 0);
    bodies.push(add(new THREE.CylinderGeometry(R * 0.56, R * 0.56, H * 0.17, 6, 1), bodyM, 0, yc + H * 0.085, 0));
    add(new THREE.ConeGeometry(R * 0.72, H * 0.1, 6), capM, 0, yc + H * 0.17 + H * 0.05, 0);
    rTop = R * 0.36;
  }
  // the gallery, and its rail in the side's colour
  const gr = rTop + R * 0.2;
  add(new THREE.CylinderGeometry(gr, gr * 0.92, H * 0.03, sides), metal, 0, y1 + H * 0.015, 0);
  const rail = add(new THREE.CylinderGeometry(gr * 0.98, gr * 0.98, H * 0.045, sides, 1, true), lam(trim, { emissive: trim, emissiveIntensity: 0.4, side: THREE.DoubleSide }), 0, y1 + H * 0.03 + H * 0.0225, 0);
  // the lantern: a glass room, its frame, the lamp in it, the cap
  const lr = rTop * 0.82, ly = y1 + H * 0.03, lh = H * 0.12;
  add(new THREE.CylinderGeometry(lr * 1.04, lr * 1.04, H * 0.015, sides), metal, 0, ly + H * 0.0075, 0);
  const glass = add(new THREE.CylinderGeometry(lr, lr, lh, 12, 1, true), new THREE.MeshBasicMaterial({ color: lampC, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), 0, ly + lh / 2, 0);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(new THREE.BoxGeometry(lr * 0.1, lh, lr * 0.1), metal, Math.cos(a) * lr, ly + lh / 2, Math.sin(a) * lr); }
  const lamp = add(new THREE.SphereGeometry(lr * 0.55, 12, 8), new THREE.MeshBasicMaterial({ color: lampC }), 0, ly + lh / 2, 0);
  const capY = ly + lh;
  add(new THREE.CylinderGeometry(lr * 1.12, lr * 1.12, H * 0.012, sides), capM, 0, capY, 0);
  add(new THREE.SphereGeometry(lr * 1.02, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, capY, 0);
  // the vane: a staff, a ball and the side's pennant
  const vy = capY + lr * 1.02;
  add(new THREE.CylinderGeometry(R * 0.02, R * 0.02, H * 0.09, 5), metal, 0, vy + H * 0.045, 0);
  add(new THREE.SphereGeometry(R * 0.05, 8, 6), capM, 0, vy + H * 0.02, 0);
  const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(R * 0.42, -H * 0.018); fs.lineTo(0, -H * 0.04); fs.closePath();
  const flag = add(new THREE.ShapeGeometry(fs), new THREE.MeshBasicMaterial({ color: trim, side: THREE.DoubleSide }), 0, vy + H * 0.088, 0);
  // the door, in the side's colour (facing +z)
  if (shape !== 'pile') { const dy = shape === 'martello' ? y0 : y0, dz = shape === 'martello' ? R * 0.89 : R * 0.75; add(new THREE.BoxGeometry(R * 0.26, H * 0.085, R * 0.08), trimM, 0, dy + H * 0.0425, dz); }
  // the lamp's glow, always
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: rlkDot(), color: glowC, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75 }));
  halo.position.set(0, ly + lh / 2, 0); halo.scale.setScalar(R * 1.6); G.add(halo);
  const fx = [];
  // Mate and up: a sheen running up the tower
  if (sk.fx) {
    const sheen = rlkSheen().clone(); sheen.needsUpdate = true; sheen.wrapT = THREE.RepeatWrapping;
    const shM = new THREE.MeshBasicMaterial({ map: sheen, color: glowC, transparent: true, opacity: sk.fx === 'shimmer' ? 0.45 : 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const b of bodies) { const m = new THREE.Mesh(b.geometry, shM); m.position.copy(b.position); m.scale.setScalar(1.015); G.add(m); }
    fx.push(t => { sheen.offset.y = -t * 0.35; });
  }
  // Captain and up: the body's glow pulses, and the halo with it
  if (sk.fx === 'glow' || sk.fx === 'aura') {
    const disc = add(new THREE.CircleGeometry(R * 1.5, 24), new THREE.MeshBasicMaterial({ map: rlkDot(), color: glowC, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.02, 0); disc.rotation.x = -Math.PI / 2;
    fx.push(t => { const p = 0.5 + 0.5 * Math.sin(t * 2.2); bodyM.emissiveIntensity = 0.55 + 0.6 * p; halo.scale.setScalar(R * (1.7 + 0.6 * p)); halo.material.opacity = 0.6 + 0.35 * p; disc.material.opacity = 0.25 + 0.3 * p; });
  }
  // Admiral: alive
  if (sk.fx === 'aura') {
    // the beam, turning, and its fainter twin
    const beamG = new THREE.Group(); beamG.position.set(0, ly + lh / 2, 0); G.add(beamG);
    const bl = H * 0.95, bm = new THREE.MeshBasicMaterial({ color: glowC, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const [dir, op] of [[1, 1], [-1, 0.5]]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(lr * 1.6, bl, 12, 1, true), op < 1 ? bm.clone() : bm); if (op < 1) cone.material.opacity = 0.07; cone.rotation.z = dir * Math.PI / 2; cone.position.x = -dir * bl / 2; beamG.add(cone); }
    fx.push(t => { beamG.rotation.y = t * 1.1; });
    const dot = rlkDot(), c2 = C(sk.c2), c3 = C(sk.c3 || sk.c2);
    if (sk.adm === 'aurora') {
      // ribbons of light hung round the top, waving
      const rib = []; for (let i = 0; i < 3; i++) { const tex = rlkTex(sk).em.clone(); tex.needsUpdate = true; tex.wrapS = THREE.RepeatWrapping;
        const m = add(new THREE.CylinderGeometry(gr * (1.25 + i * 0.25), gr * (1.6 + i * 0.3), H * (0.42 - i * 0.06), 32, 1, true), new THREE.MeshBasicMaterial({ map: tex, color: i % 2 ? c3 : c2, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, y1 - H * (0.06 + i * 0.05), 0);
        rib.push([m, tex, i]); }
      fx.push(t => { for (const [m, tex, i] of rib) { m.rotation.y = t * (0.15 + i * 0.07) * (i % 2 ? -1 : 1); tex.offset.x = t * 0.03 * (i + 1); m.material.opacity = 0.35 + 0.25 * Math.sin(t * 1.3 + i * 2); } });
    } else {
      // particles: the Maelstrom's sparks swirling up round the tower, the Drowned Light's bubbles
      const N = sk.adm === 'whirl' ? 70 : 40, pos = new Float32Array(N * 3), seed = [];
      for (let i = 0; i < N; i++) seed.push([Math.random(), Math.random(), Math.random()]);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dot, color: sk.adm === 'whirl' ? c2 : C('#c8fff0'), size: R * (sk.adm === 'whirl' ? 0.22 : 0.16), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      pts.frustumCulled = false; G.add(pts);
      fx.push(t => {
        for (let i = 0; i < N; i++) { const [a, b, c] = seed[i], f = (b + t * (sk.adm === 'whirl' ? 0.12 : 0.09) * (0.6 + c)) % 1;
          if (sk.adm === 'whirl') { const ang = a * 6.283 + t * (1.6 + c) + f * 9, r = R * (1.15 - f * 0.55) + c * R * 0.2; pos[i * 3] = Math.cos(ang) * r; pos[i * 3 + 1] = H * (0.08 + f * 0.75); pos[i * 3 + 2] = Math.sin(ang) * r; }
          else { const ang = a * 6.283, r = R * (0.62 + c * 0.35); pos[i * 3] = Math.cos(ang) * r + Math.sin(t * 2 + i) * 0.06; pos[i * 3 + 1] = H * (0.05 + f * 0.85); pos[i * 3 + 2] = Math.sin(ang) * r; } }
        geo.attributes.position.needsUpdate = true;
      });
      if (sk.adm === 'whirl') {
        // and a ring of the swirl at its foot, turning
        const ring = add(new THREE.RingGeometry(R * 0.95, R * 1.5, 40, 1), new THREE.MeshBasicMaterial({ map: rlkTex(sk).em, color: c3, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, 0.03, 0); ring.rotation.x = -Math.PI / 2;
        fx.push(t => { ring.rotation.z = -t * 0.9; });
      } else {
        // weed hung from the gallery, swaying
        const weed = []; const wm = new THREE.MeshLambertMaterial({ color: C('#2a6a3a'), emissive: C('#0a3a1a'), side: THREE.DoubleSide });
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.2, len = H * (0.12 + (i % 3) * 0.06), p = new THREE.Group(); p.position.set(Math.cos(a) * gr * 0.98, y1 + H * 0.02, Math.sin(a) * gr * 0.98); p.rotation.y = -a;
          const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.12, len), wm); m.position.y = -len / 2; p.add(m); G.add(p); weed.push([p, i]); }
        fx.push(t => { for (const [p, i] of weed) p.rotation.z = Math.sin(t * 1.4 + i) * 0.18; });
      }
    }
  }
  G.userData.lamp = lamp; G.userData.skin = sk.id || ''; G.userData.kind = great ? 'great' : 'lamp';
  G.userData.tick = t => { for (const f of fx) f(t); };
  G.userData.flag = flag; G.userData.rail = rail; G.userData.glass = glass;
  return G;
}

// ---------- previews: the Great Light and a Lamp Tower, rendered once to a small picture and kept ----------
function rlkGL() {
  if (RLK.gl !== null) return RLK.gl;
  try {
    const cv = document.createElement('canvas'); cv.width = 240; cv.height = 300;
    const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(240, 300, false);
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xdfe8ff, 0x302820, 0.95)); const sun = new THREE.DirectionalLight(0xfff0d8, 0.9); sun.position.set(-4, 8, 6); sc.add(sun);
    const cam = new THREE.PerspectiveCamera(30, 240 / 300, 0.1, 100); cam.position.set(1.9, 5.6, 15.5); cam.lookAt(1.25, 2.3, 0);
    RLK.gl = { r, sc, cam, cv, sets: {} };
  } catch (e) { RLK.gl = false; }
  return RLK.gl;
}
function rlkDrawPreview(cv, sk, t) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, id = sk ? sk.id : '';
  g.setTransform(1, 0, 0, 1, 0, 0);
  // a night over the race behind it
  g.fillStyle = rlaLin(g, 0, 0, 0, H, ['#121c30', '#24344a', '#1a2a38']); g.fillRect(0, 0, W, H);
  g.fillStyle = rlaLin(g, 0, H * 0.72, 0, H, ['#1e3446', '#0e1a26']); g.fillRect(0, H * 0.72, W, H * 0.28);
  const gl = rlkGL();
  if (gl) {
    let set = gl.sets[id];
    if (!set) { set = new THREE.Group(); const a = rlTowerMesh(id, 'great', 0), b = rlTowerMesh(id, 'lamp', 0); b.position.set(3.0, 0, -1.2); set.add(a, b); set.userData.parts = [a, b]; gl.sets[id] = set; }
    gl.sc.add(set); for (const p of set.userData.parts) p.userData.tick(t || 1.2);
    gl.r.render(gl.sc, gl.cam); gl.sc.remove(set);
    g.drawImage(gl.cv, 0, 0, W, H);
  } else {
    // no WebGL: a flat picture of it
    const s = sk || RLK_PLAIN, x = W * 0.42, b = H * 0.86, h = H * 0.7, w = W * 0.2;
    g.fillStyle = s.rock || '#4a4640'; g.fillRect(x - w * 0.8, b - h * 0.1, w * 1.6, h * 0.1);
    g.fillStyle = s.c1; g.beginPath(); g.moveTo(x - w * 0.5, b - h * 0.1); g.lineTo(x - w * 0.32, b - h * 0.75); g.lineTo(x + w * 0.32, b - h * 0.75); g.lineTo(x + w * 0.5, b - h * 0.1); g.fill();
    g.fillStyle = s.c2; g.fillRect(x - w * 0.42, b - h * 0.42, w * 0.84, h * 0.08);
    g.fillStyle = s.lamp || '#fff0c0'; g.fillRect(x - w * 0.22, b - h * 0.88, w * 0.44, h * 0.12); g.fillStyle = s.cap || '#222'; g.fillRect(x - w * 0.3, b - h * 0.92, w * 0.6, h * 0.05);
  }
}
function rlkPreview(sk, w) {
  const cv = document.createElement('canvas'); cv.width = Math.round(w * 1.2); cv.height = Math.round(w * 1.5);
  cv.style.width = Math.round(w * 0.8) + 'px'; cv.style.height = Math.round(w) + 'px'; cv.className = 'rlkprev';
  cv._sk = sk; cv.setAttribute('aria-hidden', 'true');
  // the still ones are drawn once and copied after that
  const key = (sk ? sk.id : '') + ':' + cv.width;
  if (RLK.prev[key] && !(sk && sk.fx)) cv.getContext('2d').drawImage(RLK.prev[key], 0, 0);
  else { rlkDrawPreview(cv, sk, 1.2); if (!(sk && sk.fx)) { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); RLK.prev[key] = c; } }
  return cv;
}
let rlkTickN = 0;
setInterval(() => {
  const card = $('rlCrateCard'); if (!card || card.hidden || reduceMotion) return;
  const t = performance.now() / 1000, all = ++rlkTickN % 3 === 0;
  for (const cv of card.querySelectorAll('canvas.rlkprev')) if (cv._sk && cv._sk.fx && (all || cv._sk.fx === 'aura') && cv.getBoundingClientRect().bottom > 0) rlkDrawPreview(cv, cv._sk, t);
}, 90);
function rlkCard(sk, cls) {
  const d = document.createElement('div'), ra = rlkRarity(sk);
  d.className = 'skincard rlkskin r-' + (ra ? ra.id : 'standard') + (cls ? ' ' + cls : '');
  d.style.setProperty('--rc', ra ? ra.color : '#8f98ab');
  const level = rlkLevel(sk);
  if (level) { const pips = document.createElement('span'); pips.className = 'pips'; pips.setAttribute('aria-hidden', 'true'); for (let i = 0; i < level; i++) pips.appendChild(document.createElement('i')); d.appendChild(pips); }
  d.appendChild(rlkPreview(sk, 104));
  const n = document.createElement('b'); n.textContent = sk ? sk.name : RLK_PLAIN.name; d.appendChild(n);
  const r = document.createElement('small'); r.textContent = (ra ? ra.name : 'Standard') + ' · towers'; d.appendChild(r);
  return d;
}

// ---------- rolling ----------
function rlkRoll() {
  let r = Math.random(), rarity = RARITIES[0];
  for (const ra of RARITIES) { if (r < ra.odds) { rarity = ra; break; } r -= ra.odds; }
  const pool = RLK_SKINS.filter(s => s.rarity === rarity.id);
  return pool[(Math.random() * pool.length) | 0];
}
function rlkFiller() { let s; do { s = rlkRoll(); } while (s.rarity === 'admiral'); return s; }

// ---------- the card ----------
function rlkShow(e, toInv) {
  try { audioInit(); } catch (err) {}
  RLK.opener = e && e.currentTarget || document.activeElement;
  const card = $('rlCrateCard'); if (!card) return;
  card.hidden = false; $('rlkResult').hidden = true; rlkRender(); card.scrollTop = 0;
  $('rlkClose').focus({ preventScroll: true });
  if (toInv) requestAnimationFrame(() => { const h = $('rlkInvHead'); if (h) h.scrollIntoView({ block: 'start' }); });
}
function rlkHide() {
  if (RLK.opening) return;
  const card = $('rlCrateCard'); if (!card || card.hidden) return;
  card.hidden = true;
  const back = RLK.opener && document.contains(RLK.opener) && RLK.opener.offsetParent ? RLK.opener : $('rlCrateBtn');
  if (back) try { back.focus({ preventScroll: true }); } catch (err) {}
}
function rlkEquip(id) {
  if (id && !RLV.o[id]) return;
  RLV.e = id || ''; rlvSave(); rlkRender();
  if (typeof rlnSendLobby === 'function') try { rlnSendLobby(); } catch (e) {}
}
function rlkButtons() {
  const c = $('rlCrateBtn'); if (c) c.textContent = 'Tower crates · ' + RLV.c;
  const s = $('rlSkinBtn'), mine = rlSkin(rlSkinMine()); if (s) s.textContent = 'Towers: ' + (mine ? mine.name : RLK_PLAIN.name);
}
function rlkRender() {
  rlkButtons(); rlStatsRender();
  const card = $('rlCrateCard'); if (!card || card.hidden) return;
  const ci = $('rlkTypes'); ci.textContent = '';
  const row = document.createElement('div'); row.className = 'cratetype viewing';
  const box = document.createElement('span'); box.className = 'cratebox rlkbox'; box.setAttribute('aria-hidden', 'true');
  const nm = document.createElement('b'); nm.textContent = 'The Lampwright’s Crate';
  const n = document.createElement('small'); n.textContent = (RLV.c === 1 ? '1 crate' : RLV.c + ' crates') + ' · a set of towers for your rock';
  const open = document.createElement('button'); open.type = 'button'; open.className = RLV.c > 0 ? 'primary small' : 'tool';
  open.textContent = RLK.opening ? 'Opening…' : RLV.c > 0 ? 'Open' : 'None yet'; open.disabled = RLV.c <= 0 || RLK.opening; open.addEventListener('click', rlkOpen);
  const all = document.createElement('button'); all.type = 'button'; all.className = 'tool'; all.textContent = 'Open all'; all.hidden = RLV.c < 2; all.disabled = RLK.opening; all.addEventListener('click', rlkOpenAll);
  row.append(box, nm, n, all, open); ci.appendChild(row);
  $('rlkClose').disabled = RLK.opening;
  $('rlkProgress').textContent = 'A crate for every duel you finish, and one more for every win. ' + (RLV.n ? RLV.n + ' opened so far.' : 'The first one is on the house.');
  const odds = $('rlkOdds'); odds.textContent = '';
  for (const ra of RARITIES) { const li = document.createElement('li'); li.style.setProperty('--rc', ra.color); li.textContent = ra.name + ' · ' + (ra.odds * 100).toFixed(ra.odds < 0.01 ? 2 : 1) + '%'; odds.appendChild(li); }
  const inv = $('rlkInv'); inv.textContent = '';
  let owned = 0, last = null; const on = rlSkinMine();
  for (const sk of [null].concat(RLK_SKINS)) {
    const gr = sk ? sk.rarity : 'standard';
    if (gr !== last) { last = gr; const ra = sk ? rlkRarity(sk) : null, mine = RLK_SKINS.filter(x => x.rarity === gr); const sub = document.createElement('span'); sub.className = 'invsub'; sub.textContent = ra ? ra.name + ' · ' + mine.filter(x => RLV.o[x.id]).length + ' of ' + mine.length : 'Standard'; inv.appendChild(sub); }
    const id = sk ? sk.id : '', count = !sk ? 1 : (RLV.o[id] | 0), isOn = on === id;
    const c = rlkCard(sk, (isOn ? 'equipped' : '') + (count ? '' : ' locked'));
    if (count > 1) { const dd = document.createElement('span'); dd.className = 'dupes'; dd.textContent = '×' + count; c.appendChild(dd); }
    if (count) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tool'; b.textContent = isOn ? 'Standing' : 'Raise these'; b.disabled = isOn;
      b.setAttribute('aria-label', (isOn ? 'Your towers: ' : 'Raise ') + (sk ? sk.name : RLK_PLAIN.name)); b.addEventListener('click', () => rlkEquip(id)); c.appendChild(b);
      if (sk) owned++;
    } else c.setAttribute('aria-label', sk.name + ', not found yet');
    inv.appendChild(c);
  }
  $('rlkCollected').textContent = owned + ' of ' + RLK_SKINS.length + ' found';
}
function rlkOpen() {
  if (RLK.opening || RLV.c <= 0) return;
  RLK.opening = true; RLV.c--; RLV.n++;
  const prize = rlkRoll(); RLV.pending = prize.id; rlvSave();
  $('rlkResult').hidden = true; rlkRender();
  rlkSpin(prize, reduceMotion ? 600 : 6000, () => rlkFinish(prize));
}
function rlkSpin(prize, dur, done) {
  requestAnimationFrame(() => { const sheet = $('rlCrateCard'), r = $('rlkReel').getBoundingClientRect(), sr = sheet.getBoundingClientRect(); if (r.top < sr.top + 70 || r.bottom > sr.bottom - 10) sheet.scrollTo({ top: sheet.scrollTop + r.top - sr.top - sr.height * 0.25, behavior: reduceMotion ? 'auto' : 'smooth' }); });
  const reel = $('rlkReel'), strip = $('rlkStrip'); strip.textContent = '';
  const N = 56, WIN = 48;
  for (let i = 0; i < N; i++) strip.appendChild(rlkCard(i === WIN ? prize : rlkFiller(), 'reelitem'));
  const cardW = strip.firstChild.getBoundingClientRect().width + 8, viewW = reel.getBoundingClientRect().width;
  const end = WIN * cardW + cardW / 2 - viewW / 2 + (Math.random() - 0.5) * cardW * 0.7, t0 = performance.now();
  let lastIdx = -1;
  const step = now => { const t = Math.min(1, (now - t0) / dur), x = end * (1 - Math.pow(1 - t, 4)); strip.style.transform = 'translateX(' + (-x) + 'px)'; const idx = Math.floor((x + viewW / 2) / cardW); if (idx !== lastIdx) { lastIdx = idx; try { sfxTick(); } catch (e) {} } if (t < 1) requestAnimationFrame(step); else done(); };
  strip.style.transform = 'translateX(0)'; requestAnimationFrame(step);
}
function rlkFinish(prize) {
  RLK.opening = false; RLV.o[prize.id] = (RLV.o[prize.id] | 0) + 1; RLV.pending = null; rlvSave();
  const ra = rlkRarity(prize);
  try { sfxReveal(RARITIES.indexOf(ra)); } catch (e) {}
  const res = $('rlkResult'); res.textContent = ''; res.style.setProperty('--rc', ra.color); res.className = 'result r-' + ra.id;
  const h = document.createElement('p'); h.className = 'won'; h.textContent = (RLV.o[prize.id] > 1 ? 'Another ' : 'New: ') + prize.name;
  const r = document.createElement('small'); r.textContent = ra.name + ' grade · towers';
  const on = rlSkinMine() === prize.id;
  const eq = document.createElement('button'); eq.type = 'button'; eq.className = 'primary'; eq.textContent = on ? 'Standing' : 'Raise them'; eq.disabled = on;
  eq.addEventListener('click', () => { rlkEquip(prize.id); eq.textContent = 'Standing'; eq.disabled = true; });
  res.append(h, r, eq); res.hidden = false; rlkRender();
  if (!on) eq.focus({ preventScroll: true });
}
function rlkOpenAll() {
  const count = RLV.c; if (RLK.opening || count < 1) return;
  const byGrade = {}, fresh = []; let best = null;
  for (let i = 0; i < count; i++) { const p = rlkRoll(); if (!RLV.o[p.id] && !fresh.includes(p)) fresh.push(p); RLV.o[p.id] = (RLV.o[p.id] | 0) + 1; byGrade[p.rarity] = (byGrade[p.rarity] | 0) + 1; if (!best || rlkLevel(p) > rlkLevel(best)) best = p; }
  RLV.c = 0; RLV.n += count; rlvSave();
  const ra = rlkRarity(best); try { sfxReveal(RARITIES.indexOf(ra)); } catch (e) {}
  const res = $('rlkResult'); res.textContent = ''; res.style.setProperty('--rc', ra.color); res.className = 'result haul r-' + ra.id;
  const h = document.createElement('p'); h.className = 'won'; h.textContent = count + ' crates opened';
  const sub = document.createElement('small'); sub.textContent = fresh.length ? fresh.length + ' new · best ' + best.name : 'Nothing new this time · best ' + best.name;
  const grades = document.createElement('ul'); grades.className = 'odds';
  for (const g of RARITIES) { if (!byGrade[g.id]) continue; const li = document.createElement('li'); li.style.setProperty('--rc', g.color); li.textContent = g.name + ' × ' + byGrade[g.id]; grades.appendChild(li); }
  res.append(h, sub, grades);
  if (fresh.length) { const strip = document.createElement('div'); strip.className = 'haulstrip'; for (const it of fresh.sort((a, b) => rlkLevel(b) - rlkLevel(a))) strip.appendChild(rlkCard(it, 'reelitem')); res.appendChild(strip); }
  res.hidden = false; rlkRender();
}

// ---------- the record, and the crates it earns ----------
function rlStatsRender() {
  const el = $('rlStats'); if (!el) return;
  const s = RLV.st;
  el.textContent = !s.p ? 'No duels fought yet. Your first tower crate is waiting, on the house.'
    : `${s.p} ${s.p === 1 ? 'duel' : 'duels'}: ${s.w} won, ${s.l} lost${s.d ? ', ' + s.d + ' drawn' : ''} · ${s.cr} ${s.cr === 1 ? 'crown' : 'crowns'} taken · ` + (s.s > 1 ? `${s.s} wins running (best ${s.bs})` : `best run ${s.bs} ${s.bs === 1 ? 'win' : 'wins'}`);
}
function rlRecord(r) {
  r = r || {}; const s = RLV.st, win = !!r.win && !r.draw, draw = !!r.draw;
  s.p++; s.cr += Math.max(0, Math.min(3, r.crowns | 0));
  if (draw) { s.d++; s.s = 0; } else if (win) { s.w++; s.s++; s.bs = Math.max(s.bs, s.s); } else { s.l++; s.s = 0; }
  const got = 1 + (win ? 1 : 0); RLV.c = Math.min(99999, RLV.c + got); rlvSave(); rlkRender();
  const what = draw ? 'A draw' : win ? (s.s > 2 ? s.s + ' wins running' : 'A win') : 'Duel over';
  if (typeof toast === 'function') toast(what + ': +' + got + ' tower crate' + (got > 1 ? 's' : '') + '. Open them from the Skerry Clash card.', '+' + got + ' tower crate' + (got > 1 ? 's' : ''));
}

// ---------- the one save (src/crates.js saveData / mergeSave) ----------
// decks, record, crates and skins; merged so nothing is lost: every skin either side has, the counts by the larger,
// crates by everything ever earned, and the deck you play and the skin you raise only if takeLooks
function rkData() { return { d: RLV.decks, k: RLV.dk, s: RLV.st, c: RLV.c, n: RLV.n, o: RLV.o, e: RLV.e }; }
function rkMerge(d, takeLooks) {
  if (!d || typeof d !== 'object') return false;
  let changed = false; const n = v => Math.max(0, Math.min(999999, v | 0));
  if (d.o && typeof d.o === 'object') for (const [id, c] of Object.entries(d.o)) if (RLK_BY_ID[id] && n(c) > (RLV.o[id] | 0)) { RLV.o[id] = n(c); changed = true; }
  const earned = Math.max(n(d.c) + n(d.n), RLV.c + RLV.n), opened = Math.max(RLV.n, n(d.n)), left = Math.min(99999, Math.max(0, earned - opened));
  if (left !== RLV.c || opened !== RLV.n) { RLV.c = left; RLV.n = opened; changed = true; }
  if (d.s && typeof d.s === 'object') {
    const theirsNewer = n(d.s.p) > RLV.st.p;
    for (const k of ['p', 'w', 'l', 'd', 'cr', 'bs']) if (n(d.s[k]) > RLV.st[k]) { RLV.st[k] = n(d.s[k]); changed = true; }
    if (theirsNewer && n(d.s.s) !== RLV.st.s) { RLV.st.s = n(d.s.s); changed = true; }
  }
  if (takeLooks) {
    if (Array.isArray(d.d)) for (let i = 0; i < 3; i++) if (Array.isArray(d.d[i])) { const fx = rlDeckFix(d.d[i]); if (fx.join() !== RLV.decks[i].join()) { RLV.decks[i] = fx; changed = true; } }
    if ((d.k | 0) >= 0 && (d.k | 0) <= 2 && (d.k | 0) !== RLV.dk && d.k != null) { RLV.dk = d.k | 0; changed = true; }
    if (typeof d.e === 'string' && (d.e === '' || RLV.o[d.e] && RLK_BY_ID[d.e]) && RLV.e !== d.e) { RLV.e = d.e; changed = true; }
  }
  if (changed) { rlvSave(true); rlkRender(); if (typeof rlDeckRender === 'function') rlDeckRender(); }
  return changed;
}

// ---------- the card's wiring ----------
(function rlkInit() {
  // the save's crates and skins, checked now that the skins are known: the first crate free, a skin being opened
  // when the page closed is yours, an unknown skin is dropped
  if (RLV.fresh) RLV.c = Math.max(RLV.c, 1);
  if (RLV.pending && RLK_BY_ID[RLV.pending]) RLV.o[RLV.pending] = (RLV.o[RLV.pending] | 0) + 1;
  RLV.pending = null;
  for (const id of Object.keys(RLV.o)) if (!RLK_BY_ID[id]) delete RLV.o[id];
  if (RLV.e && !RLV.o[RLV.e]) RLV.e = '';
  rlvSave(true);
  const lv = $('rlBotLvl'); if (lv) { try { const v = localStorage.getItem('skerry-rival-lvl'); if (v && [...lv.options].some(o => o.value === v)) lv.value = v; } catch (e) {} lv.addEventListener('change', () => { try { localStorage.setItem('skerry-rival-lvl', lv.value); } catch (e) {} }); }
  if ($('rlPlay')) $('rlPlay').addEventListener('click', () => { if (typeof rlPlayBot === 'function') rlPlayBot(); else if (typeof toast === 'function') toast('The duel isn\'t ready in this build yet.'); });
  if ($('rlBanner')) $('rlBanner').addEventListener('click', () => { const c = $('rlTitle'); if (!c) return; if (typeof MD !== 'undefined' && MD.on && typeof mdPick === 'function') mdPick('rlTitle', true); c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('rlPlay').focus({ preventScroll: true }), 400); });
  if ($('rlCrateBtn')) $('rlCrateBtn').addEventListener('click', e => rlkShow(e));
  if ($('rlSkinBtn')) $('rlSkinBtn').addEventListener('click', e => rlkShow(e, true));
  if ($('rlkClose')) $('rlkClose').addEventListener('click', rlkHide);
  addEventListener('keydown', e => { if (e.key !== 'Escape') return; const card = $('rlCrateCard'); if (!card || card.hidden) return; e.preventDefault(); e.stopPropagation(); rlkHide(); }, true);
  rlkRender();
})();
