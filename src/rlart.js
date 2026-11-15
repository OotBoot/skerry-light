'use strict';
// Rival Lights: the cards' pictures, and the card face the deck builder shows.
//
// Every one of the 32 cards (src/rlcards.js) has a portrait of its own, painted here in 2D canvas with paths and
// gradients and no image files: a backdrop of sky and sea tinted for its type (troops at dusk over the race, spells
// in a violet night, buildings in lamplight amber on the rocks), then the figure, the crabs, the birds, the spell's
// burst or the building drawn over it, lit from the upper left, with a dark edge on everything so it reads at the
// size of a thumbnail. A brush grain and a vignette over the top give it the look of a little oil painting.
//
// Each picture is drawn once in a square of 100 units, at a size from a few steps (64, 128, 256, 512 pixels), and kept;
// a canvas of any size or shape asking for it gets the cached one scaled to cover it. So the hand in the match
// (src/rlhud.js) and the deck builder (src/rldeck.js) can ask as often as they like.
//
// The global API:
//   rlCardArt(id, canvas)        paints card id's portrait into canvas (any size, cropped to cover it)
//   rlCardFace(id, el, px)       a complete card element: the portrait, the name, the oil cost in a lamp-oil drop and
//                                the type's tint; fills el if given (else makes a div), the portrait px wide (default 96)
//   RL_TYPE                      each type's name and colour, for the deck builder

var RL_TYPE = {
  troop: { n: 'Troop', many: 'Troops', c: '#5fa8d8', dark: '#16324a' },
  spell: { n: 'Spell', many: 'Spells', c: '#b88aff', dark: '#2c1a4a' },
  building: { n: 'Building', many: 'Buildings', c: '#e8a050', dark: '#4a2a12' },
};
var RLA = { cache: {}, grain: null };

// ---------- small painting tools (all in the 100-unit square) ----------
function rlaRand(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function rlaLin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(Array.isArray(c) ? c[0] : i / Math.max(1, stops.length - 1), Array.isArray(c) ? c[1] : c)); return gr; }
function rlaRad(g, x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((c, i) => gr.addColorStop(Array.isArray(c) ? c[0] : i / Math.max(1, stops.length - 1), Array.isArray(c) ? c[1] : c)); return gr; }
function rlaGlow(g, x, y, r, col, a) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a == null ? 1 : a; g.fillStyle = rlaRad(g, x, y, 0, r, [col, [0.35, col.length === 7 ? col + '88' : col], [1, 'rgba(0,0,0,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
function rlaPoly(g, pts, fill, edge, lw) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (edge !== false) { g.strokeStyle = edge || 'rgba(8,6,10,0.7)'; g.lineWidth = lw || 1.1; g.lineJoin = 'round'; g.stroke(); } }
function rlaEll(g, x, y, rx, ry, fill, edge, lw, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, 6.2832); if (fill) { g.fillStyle = fill; g.fill(); } if (edge !== false) { g.strokeStyle = edge || 'rgba(8,6,10,0.7)'; g.lineWidth = lw || 1.1; g.stroke(); } }
// a limb or a pole: a thick round-capped stroke with a dark edge under it
function rlaLimb(g, pts, w, col, edge) { const run = () => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }; g.lineCap = 'round'; g.lineJoin = 'round'; if (edge !== false) { g.strokeStyle = edge || 'rgba(8,6,10,0.75)'; g.lineWidth = w + 1.8; run(); } g.strokeStyle = col; g.lineWidth = w; run(); }
// a colour lit from the upper left: light at the top-left of a box, the colour, and a shadow at the bottom-right
function rlaLit(g, x0, y0, x1, y1, col, k) { k = k == null ? 0.35 : k; return rlaLin(g, x0, y0, x1, y1, [rlaMix(col, '#fff4dc', k), col, rlaMix(col, '#05060c', k * 1.4)]); }
function rlaMix(a, b, t) { const p = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)], A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }

// the backdrops
function rlaSky(g, top, mid, low, hz) { g.fillStyle = rlaLin(g, 0, 0, 0, hz, [top, [0.6, mid], [1, low]]); g.fillRect(0, 0, 100, hz + 1); }
function rlaSea(g, hz, c1, c2, R, glint) {
  g.fillStyle = rlaLin(g, 0, hz, 0, 100, [c1, c2]); g.fillRect(0, hz, 100, 100 - hz);
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) { const y = hz + 2 + Math.pow(R(), 1.6) * (100 - hz), w = 3 + R() * 10 * (1 + (y - hz) / 40); g.strokeStyle = glint || 'rgba(255,236,200,0.22)'; g.globalAlpha = 0.25 + R() * 0.5; g.lineWidth = 0.5 + (y - hz) / 60; g.beginPath(); const x = R() * 100; g.moveTo(x, y); g.lineTo(x + w, y); g.stroke(); }
  g.globalAlpha = 1;
}
function rlaSun(g, x, y, r, col) { rlaGlow(g, x, y, r * 4, col, 0.55); rlaEll(g, x, y, r, r, rlaRad(g, x - r * 0.3, y - r * 0.3, 0, r, ['#fffaf0', col]), false); }
function rlaMoon(g, x, y, r) { rlaGlow(g, x, y, r * 3.5, '#c8d8ff', 0.4); rlaEll(g, x, y, r, r, rlaRad(g, x - r * 0.3, y - r * 0.3, 0, r * 1.1, ['#fdfbf0', '#c8ccd8']), false); g.fillStyle = 'rgba(120,128,150,0.35)'; rlaEll(g, x + r * 0.25, y + r * 0.1, r * 0.22, r * 0.18, 'rgba(120,128,150,0.35)', false); rlaEll(g, x - r * 0.3, y - r * 0.25, r * 0.14, r * 0.12, 'rgba(120,128,150,0.3)', false); }
function rlaStars(g, R, n, hz) { g.fillStyle = '#fff8e8'; for (let i = 0; i < n; i++) { g.globalAlpha = 0.3 + R() * 0.7; const s = R() < 0.15 ? 0.9 : 0.5; g.fillRect(R() * 100, R() * hz * 0.85, s, s); } g.globalAlpha = 1; }
// a rocky bank across the foot of the picture, its top a ragged line about y
function rlaBank(g, y, col, R, seam) {
  const pts = [[-2, 102], [-2, y + 2]]; for (let x = 0; x <= 104; x += 6) pts.push([x, y + (R() - 0.5) * 4 + Math.sin(x * 0.11) * 1.5]); pts.push([104, 102]);
  rlaPoly(g, pts, rlaLin(g, 0, y - 3, 0, 100, [rlaMix(col, '#fff0d0', 0.18), col, rlaMix(col, '#000000', 0.5)]), 'rgba(5,5,8,0.6)', 1);
  g.strokeStyle = seam || 'rgba(0,0,0,0.28)'; g.lineWidth = 0.7; for (let i = 0; i < 9; i++) { const x = R() * 100, yy = y + 4 + R() * (98 - y); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 4 + R() * 7, yy + (R() - 0.5) * 3); g.stroke(); }
}
// a far rock with a lighthouse on it, a silhouette on the horizon (the rival light)
function rlaFarLight(g, x, hz, s, col, lit) {
  rlaPoly(g, [[x - 9 * s, hz + 0.5], [x - 5 * s, hz - 2.5 * s], [x + 4 * s, hz - 3 * s], [x + 9 * s, hz + 0.5]], col, false);
  g.fillStyle = col; g.fillRect(x - 1.1 * s, hz - 10 * s, 2.2 * s, 7.5 * s); g.fillRect(x - 1.6 * s, hz - 11.5 * s, 3.2 * s, 1.6 * s);
  if (lit) { rlaGlow(g, x, hz - 11 * s, 7 * s, lit, 0.9); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22; g.fillStyle = lit; g.beginPath(); g.moveTo(x, hz - 11 * s); g.lineTo(x + 40 * s, hz - 15 * s); g.lineTo(x + 40 * s, hz - 6 * s); g.closePath(); g.fill(); g.restore(); }
}
function rlaMist(g, y, h, col, a, R) { g.save(); g.globalAlpha = a; for (let i = 0; i < 9; i++) { const x = R() * 110 - 5, w = 18 + R() * 30, yy = y + (R() - 0.5) * h; g.fillStyle = rlaRad(g, x, yy, 0, w, [col, [1, 'rgba(0,0,0,0)']]); g.beginPath(); g.ellipse(x, yy, w, w * 0.35, 0, 0, 6.2832); g.fill(); } g.restore(); }

// ---------- people ----------
// a figure standing on (x, y), about 60 * s units tall. o: coat, legs, skin, hat, hatc, item, item2, face (1 right,
// -1 left), pose ('stand' | 'raise' (the front arm up) | 'throw' | 'run' | 'aim' | 'carry'), dress (a skirt), stripe
// (a striped jersey), eyes (glowing eyes, a colour), weed, ragged, lean
function rlaMan(g, o) {
  const s = o.s || 1, H = 60 * s, x = o.x, y = o.y, f = o.face || 1, lean = (o.lean || 0) * f;
  const skin = o.skin || '#e0b48c', coat = o.coat || '#34506a', legs = o.legs || '#2a2a34', boots = o.boots || '#1a1410';
  const hipY = y - H * 0.44, neckY = y - H * 0.8, hx = x + lean * H * 0.1, nx = x + lean * H * 0.22, hr = H * 0.085, headY = neckY - hr * 1.05;
  const run = o.pose === 'run' || !!o.run, lw = H * 0.085;
  // the legs (the back one darker)
  if (o.dress) rlaPoly(g, [[nx - H * 0.11, neckY + H * 0.12], [nx + H * 0.11, neckY + H * 0.12], [hx + H * 0.2, y - H * 0.03], [hx - H * 0.2, y - H * 0.03]], rlaLit(g, x - H * 0.2, neckY, x + H * 0.2, y, o.dress), null, 1);
  else {
    const st = run ? H * 0.16 : H * 0.07;
    rlaLimb(g, [[hx - H * 0.03 * f, hipY], [hx - st * f + (run ? -H * 0.04 * f : 0), y - H * 0.2], [hx - st * f - (run ? H * 0.06 * f : 0), y - H * 0.02]], lw * 1.05, rlaMix(legs, '#000000', 0.25));
    rlaLimb(g, [[hx + H * 0.03 * f, hipY], [hx + st * f + (run ? H * 0.06 * f : 0), y - H * 0.24], [hx + st * f + (run ? H * 0.02 * f : 0), y - H * 0.02]], lw * 1.05, legs);
    if (o.ragged) { g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.6; }
    rlaEll(g, hx - st * f - (run ? H * 0.06 * f : 0) + H * 0.03 * f, y - H * 0.015, H * 0.06, H * 0.028, o.bare ? skin : boots);
    rlaEll(g, hx + st * f + (run ? H * 0.02 * f : 0) + H * 0.03 * f, y - H * 0.015, H * 0.06, H * 0.028, o.bare ? skin : boots);
  }
  // the back arm
  const sh = [nx - H * 0.1 * f, neckY + H * 0.05], shF = [nx + H * 0.1 * f, neckY + H * 0.05];
  const backArm = o.pose === 'aim' ? [sh, [nx + H * 0.12 * f, neckY + H * 0.2], [nx + H * 0.28 * f, neckY + H * 0.14]] : o.pose === 'carry' ? [sh, [nx - H * 0.05 * f, neckY + H * 0.2], [nx + H * 0.15 * f, neckY + H * 0.2]] : run ? [sh, [nx - H * 0.22 * f, neckY + H * 0.18], [nx - H * 0.3 * f, neckY + H * 0.08]] : o.pose === 'throw' ? [sh, [nx - H * 0.15 * f, neckY + H * 0.2], [nx - H * 0.08 * f, neckY + H * 0.3]] : [sh, [nx - H * 0.16 * f, neckY + H * 0.2], [nx - H * 0.15 * f, neckY + H * 0.34]];
  rlaLimb(g, backArm, lw * 0.95, rlaMix(coat, '#000000', 0.3));
  const backHand = backArm[backArm.length - 1];
  rlaEll(g, backHand[0], backHand[1], H * 0.035, H * 0.035, skin);
  if (o.item2) rlaItem(g, o.item2, backHand[0], backHand[1], H, -f, o);
  // the body
  const bw = H * (o.dress ? 0.1 : 0.13);
  const body = [[nx - bw, neckY], [nx + bw, neckY], [hx + bw * 0.9, hipY + H * (o.long ? 0.14 : 0.03)], [hx - bw * 0.9, hipY + H * (o.long ? 0.14 : 0.03)]];
  rlaPoly(g, body, rlaLit(g, nx - bw, neckY, nx + bw, hipY, coat, 0.4), null, 1.1);
  if (o.stripe) { g.save(); g.beginPath(); body.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.clip(); g.fillStyle = o.stripe; for (let k = 0; k < 6; k++) g.fillRect(x - H * 0.3, neckY + H * 0.03 + k * H * 0.065, H * 0.6, H * 0.028); g.restore(); }
  if (o.buttons) { g.fillStyle = o.buttons; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(nx + H * 0.015 * f + (hx - nx) * k / 4, neckY + H * 0.07 + k * H * 0.075, H * 0.013, 0, 6.2832); g.fill(); } }
  if (o.belt) { g.fillStyle = o.belt; g.fillRect(hx - bw * 0.95, hipY - H * 0.035, bw * 1.9, H * 0.035); }
  if (o.ragged) { g.fillStyle = rlaMix(coat, '#000000', 0.35); for (let k = 0; k < 4; k++) rlaPoly(g, [[hx - bw + k * bw * 0.5, hipY + H * 0.02], [hx - bw + (k + 0.5) * bw * 0.5, hipY + H * 0.08], [hx - bw + (k + 1) * bw * 0.5, hipY + H * 0.02]], rlaMix(coat, '#000000', 0.15), false); }
  if (o.scarf) { rlaLimb(g, [[nx - bw * 0.8, neckY + H * 0.02], [nx + bw * 0.8, neckY + H * 0.02]], H * 0.04, o.scarf, false); rlaLimb(g, [[nx - bw * 0.5 * f, neckY + H * 0.03], [nx - bw * 0.9 * f, neckY + H * 0.14]], H * 0.03, o.scarf, false); }
  // the head
  rlaEll(g, nx + H * 0.01 * f, headY, hr, hr * 1.08, rlaRad(g, nx - hr * 0.3 * f, headY - hr * 0.4, 0, hr * 1.3, [rlaMix(skin, '#ffffff', 0.25), skin, rlaMix(skin, '#000000', 0.35)]));
  if (o.beard) rlaPoly(g, [[nx - hr * 0.7, headY + hr * 0.2], [nx + hr * 0.8 * f + hr * 0.1, headY + hr * 0.25], [nx + hr * 0.3 * f, headY + hr * 1.35], [nx - hr * 0.3 * f, headY + hr * 1.2]], o.beard, false);
  if (o.eyes) { rlaGlow(g, nx + hr * 0.45 * f, headY - hr * 0.05, hr * 1.1, o.eyes, 0.8); g.fillStyle = '#ffffff'; g.fillRect(nx + hr * 0.3 * f - 0.4, headY - hr * 0.15, 0.9, 0.9); g.fillRect(nx + hr * 0.75 * f - 0.4, headY - hr * 0.15, 0.9, 0.9); }
  else { g.fillStyle = 'rgba(20,10,8,0.85)'; g.fillRect(nx + hr * 0.45 * f - 0.35, headY - hr * 0.12, 0.8, 0.9); }
  rlaHat(g, o.hat, o.hatc, nx + H * 0.01 * f, headY, hr, f);
  if (o.weed) { g.strokeStyle = o.weed; g.lineWidth = 0.9; g.lineCap = 'round'; for (let k = 0; k < 5; k++) { const sx = nx - hr + k * hr * 0.5; g.beginPath(); g.moveTo(sx, headY - hr * 0.7); g.quadraticCurveTo(sx - 1.5, headY + hr * 0.5, sx + (k % 2 ? 1 : -1), headY + hr * (1.2 + k * 0.25)); g.stroke(); } for (let k = 0; k < 3; k++) { const sx = nx - bw * 0.6 + k * bw * 0.6; g.beginPath(); g.moveTo(sx, neckY + H * 0.05); g.quadraticCurveTo(sx + 1, neckY + H * 0.2, sx - 1, neckY + H * 0.32); g.stroke(); } }
  // the front arm, and what it holds
  const fa = o.pose === 'raise' ? [shF, [nx + H * 0.2 * f, neckY - H * 0.04], [nx + H * 0.22 * f, neckY - H * 0.2]]
    : o.pose === 'throw' ? [shF, [nx - H * 0.02 * f, neckY - H * 0.12], [nx - H * 0.12 * f, neckY - H * 0.24]]
    : o.pose === 'aim' ? [shF, [nx + H * 0.16 * f, neckY + H * 0.12], [nx + H * 0.3 * f, neckY + H * 0.06]]
    : o.pose === 'carry' ? [shF, [nx + H * 0.14 * f, neckY + H * 0.16], [nx + H * 0.2 * f, neckY + H * 0.14]]
    : run ? [shF, [nx + H * 0.2 * f, neckY + H * 0.14], [nx + H * 0.3 * f, neckY + H * 0.03]]
    : o.pose === 'reach' ? [shF, [nx + H * 0.2 * f, neckY + H * 0.08], [nx + H * 0.33 * f, neckY + H * 0.02]]
    : [shF, [nx + H * 0.17 * f, neckY + H * 0.18], [nx + H * 0.2 * f, neckY + H * 0.32]];
  const hand = fa[fa.length - 1];
  if (o.item && o.itemBehind) rlaItem(g, o.item, hand[0], hand[1], H, f, o);
  rlaLimb(g, fa, lw * 0.95, coat);
  if (o.item && !o.itemBehind) rlaItem(g, o.item, hand[0], hand[1], H, f, o);
  rlaEll(g, hand[0], hand[1], H * 0.037, H * 0.037, skin);
  return { head: [nx, headY], hand, back: backHand, hr };
}
function rlaHat(g, hat, col, x, y, r, f) {
  switch (hat) {
    case 'cap': rlaPoly(g, [[x - r * 1.05, y - r * 0.25], [x - r * 0.9, y - r * 0.95], [x + r * 0.6, y - r * 1.05], [x + r * 1.0, y - r * 0.6], [x + r * 1.65 * f, y - r * 0.35]], col || '#4a4038'); break;
    case 'sou': rlaPoly(g, [[x - r * 1.5, y - r * 0.05], [x - r * 0.85, y - r * 1.05], [x + r * 0.3, y - r * 1.3], [x + r * 0.95, y - r * 0.8], [x + r * 1.55, y - r * 0.15], [x + r * 0.2, y - r * 0.5]], col || '#e8c030'); break;
    case 'tricorn': rlaPoly(g, [[x - r * 1.7, y - r * 0.6], [x - r * 0.5, y - r * 1.0], [x, y - r * 1.75], [x + r * 0.5, y - r * 1.0], [x + r * 1.7, y - r * 0.6], [x, y - r * 0.55]], col || '#1e1a1c'); g.strokeStyle = '#c8a050'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - r * 1.5, y - r * 0.62); g.lineTo(x, y - r * 0.62); g.lineTo(x + r * 1.5, y - r * 0.62); g.stroke(); break;
    case 'peaked': rlaPoly(g, [[x - r * 0.95, y - r * 0.5], [x - r * 1.05, y - r * 1.2], [x + r * 1.05, y - r * 1.3], [x + r * 0.95, y - r * 0.5]], col || '#1a2236'); rlaPoly(g, [[x - r * 0.2 * f, y - r * 0.5], [x + r * 1.55 * f, y - r * 0.35], [x + r * 0.9 * f, y - r * 0.6]], '#0c0e14', false); rlaEll(g, x + r * 0.2 * f, y - r * 0.95, r * 0.22, r * 0.18, '#e8c060', false); break;
    case 'bandana': rlaPoly(g, [[x - r * 1.05, y - r * 0.25], [x - r * 0.7, y - r * 1.05], [x + r * 0.8, y - r * 1.0], [x + r * 1.05, y - r * 0.3]], col || '#b02a24'); rlaLimb(g, [[x - r * 1.0 * f, y - r * 0.4], [x - r * 1.7 * f, y + r * 0.1]], r * 0.3, col || '#b02a24', false); break;
    case 'hood': rlaPoly(g, [[x - r * 1.35, y + r * 1.0], [x - r * 1.3, y - r * 0.6], [x - r * 0.2, y - r * 1.55], [x + r * 0.9, y - r * 1.1], [x + r * 1.35, y - r * 0.2], [x + r * 0.9, y - r * 0.4], [x - r * 0.3, y - r * 0.9], [x - r * 0.6, y + r * 0.6]], col || '#2a2632'); break;
    case 'bonnet': rlaPoly(g, [[x - r * 1.1, y + r * 0.4], [x - r * 1.15, y - r * 0.7], [x - r * 0.1, y - r * 1.35], [x + r * 1.1, y - r * 1.05], [x + r * 1.45 * f, y - r * 0.2], [x + r * 0.6, y - r * 0.6], [x - r * 0.5, y - r * 0.4]], col || '#6a4a5a'); break;
    case 'knit': rlaPoly(g, [[x - r * 1.0, y - r * 0.35], [x - r * 0.8, y - r * 1.15], [x + r * 0.2, y - r * 1.45], [x + r * 0.95, y - r * 1.0], [x + r * 1.0, y - r * 0.35]], col || '#8a2a2a'); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - r, y - r * 0.55, r * 2, r * 0.22); break;
    case 'hair': rlaPoly(g, [[x - r * 1.05, y + r * 0.1], [x - r * 0.9, y - r * 0.9], [x + r * 0.3, y - r * 1.2], [x + r * 1.0, y - r * 0.6], [x + r * 0.5, y - r * 0.5], [x - r * 0.4, y - r * 0.3]], col || '#3a2418'); break;
  }
}
// what a figure holds, in its hand at (x, y)
function rlaItem(g, it, x, y, H, f, o) {
  const k = H / 60;
  switch (it) {
    case 'pin': rlaLimb(g, [[x - 2 * k * f, y + 5 * k], [x + 3 * k * f, y - 9 * k]], 2.6 * k, '#8a5a32'); rlaEll(g, x + 3.4 * k * f, y - 10 * k, 1.9 * k, 2.6 * k, '#a06a3a'); break;
    case 'knife': rlaLimb(g, [[x, y], [x + 4 * k * f, y - 4 * k]], 1 * k, '#c8ccd4'); break;
    case 'crowbar': rlaLimb(g, [[x - 2 * k * f, y + 8 * k], [x + 2 * k * f, y - 10 * k], [x + 4.5 * k * f, y - 11 * k]], 1.4 * k, '#4a4a52'); break;
    case 'lantern': { const ly = y + 5 * k; g.strokeStyle = '#1a1410'; g.lineWidth = 0.6 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x, ly - 2 * k); g.stroke(); rlaGlow(g, x, ly + 1.5 * k, 14 * k, '#ffb040', 0.9); rlaPoly(g, [[x - 2.2 * k, ly - 1.5 * k], [x + 2.2 * k, ly - 1.5 * k], [x + 2.6 * k, ly + 4.5 * k], [x - 2.6 * k, ly + 4.5 * k]], rlaRad(g, x, ly + 1.5 * k, 0, 3.5 * k, ['#fff4c0', '#ffa030']), '#1a1410', 0.8); break; }
    case 'harpoon': { const a = [x - 8 * k * f, y + 12 * k], b = [x + 10 * k * f, y - 16 * k]; rlaLimb(g, [a, b], 1.6 * k, '#8a6a42'); rlaPoly(g, [[b[0] - 1.6 * k, b[1] + 1 * k], [b[0] + 4.5 * k * f, b[1] - 6 * k], [b[0] + 1.8 * k, b[1] + 1.6 * k]], '#b8bcc4'); rlaPoly(g, [[b[0], b[1]], [b[0] - 1.4 * k * f, b[1] - 2.5 * k], [b[0] + 0.5 * k * f, b[1] - 1.2 * k]], '#b8bcc4'); break; }
    case 'carbine': { rlaLimb(g, [[x - 9 * k * f, y + 2.5 * k], [x + 14 * k * f, y - 2.5 * k]], 1.6 * k, '#2a2a30'); rlaLimb(g, [[x - 11 * k * f, y + 3.5 * k], [x - 3 * k * f, y + 1.5 * k]], 2.8 * k, '#6a4428'); break; }
    case 'cutlass': { const b = [x + 9 * k * f, y - 13 * k]; g.strokeStyle = 'rgba(8,6,10,0.7)'; g.lineWidth = 3.2 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 7 * k * f, y - 4 * k, b[0], b[1]); g.stroke(); g.strokeStyle = rlaLin(g, x, y, b[0], b[1], ['#8a8e98', '#f4f6fa']); g.lineWidth = 2 * k; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 7 * k * f, y - 4 * k, b[0], b[1]); g.stroke(); rlaLimb(g, [[x - 2.4 * k, y + 1.2 * k], [x + 2.4 * k, y - 1.2 * k]], 1.2 * k, '#c8a040'); break; }
    case 'pole': { const b = [x + 6 * k * f, y - 30 * k]; rlaLimb(g, [[x - 2 * k * f, y + 10 * k], b], 1.4 * k, '#6a4a2a'); rlaGlow(g, b[0], b[1] - 2 * k, 12 * k, '#ff9a30', 1); rlaPoly(g, [[b[0] - 1.5 * k, b[1]], [b[0], b[1] - 6 * k], [b[0] + 1.6 * k, b[1]]], '#ffe08a', false); break; }
    case 'pistol': { rlaLimb(g, [[x, y], [x + 4 * k * f, y - 3 * k]], 2.2 * k, '#3a3030'); rlaLimb(g, [[x + 0.3 * k * f, y + 0.4 * k], [x - 0.6 * k * f, y + 3 * k]], 1.8 * k, '#6a4428'); break; }
    case 'falselight': { const b = [x + 12 * k * f, y - 18 * k]; rlaLimb(g, [[x - 2 * k * f, y + 4 * k], b], 1.4 * k, '#3a2a1a'); g.strokeStyle = '#1a1410'; g.lineWidth = 0.6 * k; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] + 2 * k * f, b[1] + 6 * k); g.stroke(); const lx = b[0] + 2 * k * f, ly = b[1] + 8 * k; rlaGlow(g, lx, ly, 22 * k, '#ffd070', 1); rlaEll(g, lx, ly, 2.6 * k, 3 * k, rlaRad(g, lx, ly, 0, 3 * k, ['#ffffff', '#ffc040']), '#1a1410', 0.7); break; }
    case 'cask': { const cx = x + 4 * k * f, cy = y - 2 * k; rlaEll(g, cx, cy, 6 * k, 7 * k, rlaLit(g, cx - 6 * k, cy - 7 * k, cx + 6 * k, cy + 7 * k, '#8a5a30', 0.4)); g.strokeStyle = '#2a2a2e'; g.lineWidth = 1.1 * k; for (const dy of [-4, 0, 4]) { g.beginPath(); g.ellipse(cx, cy + dy * k, 5.8 * k * Math.sqrt(1 - (dy * dy) / 49), 1 * k, 0, 0, 6.2832); g.stroke(); } g.strokeStyle = '#d8c8a0'; g.lineWidth = 0.6 * k; g.beginPath(); g.moveTo(cx + 1 * k * f, cy - 7 * k); g.quadraticCurveTo(cx + 3 * k * f, cy - 11 * k, cx + 5.5 * k * f, cy - 11 * k); g.stroke(); rlaGlow(g, cx + 5.5 * k * f, cy - 11 * k, 7 * k, '#ffc040', 1); rlaSparks(g, cx + 5.5 * k * f, cy - 11 * k, 5 * k, 7, '#ffe8a0', rlaRand('cask')); break; }
  }
}
function rlaSparks(g, x, y, r, n, col, R) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = col; g.lineCap = 'round'; for (let i = 0; i < n; i++) { const a = R() * 6.283, d = r * (0.4 + R() * 0.8); g.globalAlpha = 0.5 + R() * 0.5; g.lineWidth = 0.5 + R() * 0.6; g.beginPath(); g.moveTo(x + Math.cos(a) * d * 0.4, y + Math.sin(a) * d * 0.4); g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); g.stroke(); } g.restore(); }
function rlaBubbles(g, R, n, x0, x1, y0, y1, col) { g.strokeStyle = col || 'rgba(220,255,250,0.6)'; g.lineWidth = 0.5; for (let i = 0; i < n; i++) { const r = 0.6 + R() * 1.6; g.beginPath(); g.arc(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), r, 0, 6.2832); g.stroke(); } }

// ---------- crabs and birds ----------
// a crab facing you, its body centred on (x, y), about 30 * s units across
function rlaCrab(g, x, y, s, col, o) {
  o = o || {}; const w = 13 * s, h = 8.5 * s, dark = rlaMix(col, '#000000', 0.45);
  // the legs, four a side, bent
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const ax = x + sd * w * 0.7, ay = y + h * (-0.1 + i * 0.22), kx = x + sd * w * (1.35 + i * 0.08), ky = ay - h * (0.5 - i * 0.12), fx = x + sd * w * (1.55 + i * 0.12), fy = y + h * (0.9 + i * 0.1); rlaLimb(g, [[ax, ay], [kx, ky], [fx, fy]], 1.6 * s, dark); }
  // the claws, raised
  for (const sd of [-1, 1]) {
    const ax = x + sd * w * 0.6, ay = y - h * 0.3, ex = x + sd * w * 1.2, ey = y - h * 1.1, cx = x + sd * w * (o.wide ? 1.25 : 1.0), cy = y - h * 1.9;
    rlaLimb(g, [[ax, ay], [ex, ey]], 2.6 * s, rlaMix(col, '#000000', 0.2));
    const cr = 4.2 * s * (o.claw || 1);
    rlaPoly(g, [[ex - cr * 0.6, ey], [cx - cr, cy - cr * 0.2], [cx - cr * 0.3, cy - cr * 1.5], [cx, cy - cr * 0.5], [cx + cr * 0.4, cy - cr * 1.4], [cx + cr * 0.95, cy - cr * 0.1], [ex + cr * 0.6, ey + cr * 0.2]], rlaLit(g, cx - cr, cy - cr * 1.5, cx + cr, ey, col, 0.45), null, 1);
  }
  // the shell
  rlaEll(g, x, y, w, h, rlaRad(g, x - w * 0.3, y - h * 0.5, 0, w * 1.2, [rlaMix(col, '#fff0d8', 0.45), col, dark]), null, 1.2);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.6 * s; g.beginPath(); g.ellipse(x, y + h * 0.15, w * 0.6, h * 0.45, 0, 3.4, 6.0); g.stroke();
  g.fillStyle = 'rgba(255,240,210,0.3)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - w * 0.4 + i * w * 0.35, y - h * 0.35 + (i % 2) * h * 0.1, 0.8 * s, 0, 6.2832); g.fill(); }
  // the eyes on their stalks
  for (const sd of [-1, 1]) { rlaLimb(g, [[x + sd * w * 0.2, y - h * 0.8], [x + sd * w * 0.28, y - h * 1.35]], 1 * s, dark, false); rlaEll(g, x + sd * w * 0.28, y - h * 1.45, 1.4 * s, 1.4 * s, o.eyes || '#151018', false); if (o.eyes) rlaGlow(g, x + sd * w * 0.28, y - h * 1.45, 4 * s, o.eyes, 0.8); else { g.fillStyle = '#fff'; g.fillRect(x + sd * w * 0.28 - 0.5 * s, y - h * 1.6, 0.6 * s, 0.6 * s); } }
}
// a gull with its wings up, centred on (x, y), span about 40 * s; flip mirrors it
function rlaGull(g, x, y, s, flip, ph) {
  g.save(); g.translate(x, y); g.scale(s * (flip ? -1 : 1), s); const up = ph == null ? 1 : ph;
  // the far wing
  rlaPoly(g, [[-2, -1], [-10, -8 * up - 4], [-20, -10 * up - 2], [-12, -3 * up], [-4, 2]], rlaLin(g, -20, -12, 0, 2, ['#5a6270', '#9aa2ae']), null, 0.9);
  rlaEll(g, 0, 0, 9, 3.4, rlaLin(g, 0, -4, 0, 4, ['#ffffff', '#c8ccd4']), null, 0.9);
  rlaPoly(g, [[-8, -0.5], [-14, -2.5], [-13.5, 2], [-8, 1.8]], '#e8eaee', null, 0.8);
  rlaEll(g, 8.5, -2, 3.2, 2.8, '#ffffff', null, 0.9);
  rlaPoly(g, [[11, -2.2], [15.5, -1.4], [11, -0.6]], '#f0c030', null, 0.6); g.fillStyle = '#d02a20'; g.fillRect(13, -1.4, 0.9, 0.7);
  g.fillStyle = '#1a1410'; g.fillRect(9.4, -3, 0.9, 0.9);
  // the near wing, its black tip
  rlaPoly(g, [[-1, -1], [6, -9 * up - 3], [16, -13 * up - 4], [24, -12 * up - 6], [10, -3 * up], [3, 1.5]], rlaLin(g, 0, -14, 20, 0, ['#c8ccd6', '#8a92a0']), null, 0.9);
  rlaPoly(g, [[16, -13 * up - 4], [24, -12 * up - 6], [18, -9 * up - 3]], '#1a1a20', false);
  g.restore();
}

// ---------- the pictures ----------
// each draws into g (already in the 100-unit square) with R, a seeded random for its id
var RL_ART = {
  // ---- troops ----
  mudlarks(g, R) {
    rlaSky(g, '#5a6a8a', '#d0a080', '#f0c890', 46); rlaSun(g, 72, 40, 5, '#ffd8a0');
    // the mudflat: wet sheen, runnels
    g.fillStyle = rlaLin(g, 0, 46, 0, 100, ['#8a7a6a', '#5a4a3a', '#3a2e24']); g.fillRect(0, 46, 100, 54);
    g.fillStyle = 'rgba(255,220,170,0.35)'; for (let i = 0; i < 7; i++) rlaEll(g, R() * 100, 52 + R() * 40, 6 + R() * 12, 0.8 + R() * 1.2, 'rgba(255,214,160,0.35)', false);
    rlaEll(g, 70, 52, 20, 1.6, 'rgba(255,230,190,0.5)', false);
    rlaMan(g, { x: 24, y: 86, s: 0.62, coat: '#6a5a42', legs: '#4a4034', skin: '#d8a880', hat: 'cap', hatc: '#3a3028', item: 'knife', face: 1, pose: 'reach', ragged: 1, bare: 1 });
    rlaMan(g, { x: 74, y: 82, s: 0.56, coat: '#7a4a3a', legs: '#3a3430', skin: '#e0b090', hat: 'hair', hatc: '#6a3a1a', face: -1, pose: 'run', ragged: 1, bare: 1, item2: 'knife' });
    rlaMan(g, { x: 50, y: 96, s: 0.72, coat: '#4a5a5a', legs: '#3a3a30', skin: '#d8a078', hat: 'knit', hatc: '#8a3a2a', item: 'knife', face: 1, pose: 'raise', ragged: 1, bare: 1 });
    g.fillStyle = '#e8e0d0'; for (let i = 0; i < 5; i++) rlaEll(g, 10 + R() * 80, 88 + R() * 10, 1.4, 0.9, '#e8dcc8', 'rgba(0,0,0,0.4)', 0.5);
  },
  deckhand(g, R) {
    rlaSky(g, '#22324e', '#5a5a78', '#c88a6a', 58); rlaSea(g, 58, '#2a3a4e', '#16202e', R);
    // a ship's rigging behind
    g.strokeStyle = 'rgba(16,14,20,0.8)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(14, 100); g.lineTo(14, 4); g.stroke(); g.lineWidth = 0.6; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(14, 8 + i * 6); g.lineTo(-4, 50 + i * 3); g.stroke(); g.beginPath(); g.moveTo(14, 8 + i * 6); g.lineTo(34, 54 + i * 3); g.stroke(); } g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 16); g.lineTo(30, 14); g.stroke();
    g.fillStyle = rlaLin(g, 0, 84, 0, 100, ['#6a4a30', '#3a2818']); g.fillRect(0, 84, 100, 16); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 87 + i * 4); g.lineTo(100, 87 + i * 4); g.stroke(); }
    rlaMan(g, { x: 54, y: 94, s: 1.25, coat: '#2a3a5a', stripe: '#e8e4d8', legs: '#3a3a44', skin: '#d8a880', hat: 'cap', hatc: '#2a2a30', item: 'pin', face: 1, pose: 'raise', beard: '#5a3a20', belt: '#3a2818' });
  },
  shorecrabs(g, R) {
    rlaSky(g, '#3a5070', '#8aa0b0', '#d8c8a8', 30); rlaSea(g, 30, '#4a6a7a', '#3a5a6a', R);
    g.fillStyle = rlaLin(g, 0, 40, 0, 100, ['#c8b08a', '#8a7458']); rlaPoly(g, [[0, 44], [30, 40], [70, 42], [100, 38], [100, 100], [0, 100]], rlaLin(g, 0, 38, 0, 100, ['#d0b890', '#8a7458']), false);
    rlaPoly(g, [[0, 44], [30, 40], [70, 42], [100, 38], [100, 41], [70, 45], [30, 43], [0, 47]], 'rgba(255,255,255,0.55)', false);
    for (let i = 0; i < 9; i++) rlaEll(g, R() * 100, 50 + R() * 48, 2 + R() * 4, 1.4 + R() * 2.4, rlaLit(g, 0, 50, 6, 60, '#7a7068'), 'rgba(0,0,0,0.5)', 0.6);
    const at = [[22, 56, 0.6], [74, 54, 0.55], [48, 62, 0.7], [16, 80, 0.85], [80, 78, 0.8], [50, 86, 1.0]];
    for (const [x, y, s] of at) rlaCrab(g, x, y, s, R() < 0.5 ? '#d0502a' : '#c0402a');
  },
  powdermonkey(g, R) {
    rlaSky(g, '#2a1e2e', '#6a3a3a', '#d8703a', 60); rlaSea(g, 60, '#3a2a2a', '#1a1418', R, 'rgba(255,180,100,0.3)');
    rlaBank(g, 84, '#4a3a30', R);
    rlaGlow(g, 66, 40, 30, '#ff8a30', 0.35);
    // dust and speed behind him
    g.strokeStyle = 'rgba(255,220,170,0.35)'; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { g.lineWidth = 1 + R(); g.beginPath(); const y = 48 + i * 7; g.moveTo(4 + R() * 6, y); g.lineTo(22 + R() * 10, y); g.stroke(); }
    rlaMan(g, { x: 46, y: 92, s: 1.05, coat: '#8a6a4a', legs: '#4a3a2a', skin: '#e0b088', hat: 'bandana', hatc: '#c0302a', item: 'cask', face: 1, pose: 'carry', run: 1, bare: 1, ragged: 1, lean: 0.8 });
  },
  wreckers(g, R) {
    rlaSky(g, '#0c1020', '#1e2238', '#3a3048', 58); rlaStars(g, R, 30, 58); rlaSea(g, 58, '#1a2030', '#0a0e16', R, 'rgba(255,190,110,0.25)');
    // the wreck on the rocks
    rlaPoly(g, [[56, 60], [64, 50], [86, 52], [92, 60]], '#16141a', false); g.strokeStyle = '#16141a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(72, 51); g.lineTo(66, 28); g.stroke(); g.lineWidth = 0.6; g.beginPath(); g.moveTo(66, 28); g.lineTo(88, 52); g.moveTo(66, 34); g.lineTo(58, 52); g.stroke();
    rlaBank(g, 82, '#2a2830', R);
    rlaMan(g, { x: 20, y: 94, s: 0.95, coat: '#3a3028', legs: '#2a2420', skin: '#c89a78', hat: 'tricorn', item: 'crowbar', face: 1, pose: 'stand', long: 1 });
    rlaMan(g, { x: 80, y: 95, s: 0.95, coat: '#2e3a2e', legs: '#222420', skin: '#c89a78', hat: 'knit', hatc: '#4a2a2a', item: 'crowbar', face: -1, pose: 'stand', beard: '#3a2a1a' });
    rlaMan(g, { x: 50, y: 98, s: 1.15, coat: '#4a3424', legs: '#2a2420', skin: '#d0a07a', hat: 'cap', hatc: '#2a2420', item: 'lantern', item2: 'crowbar', face: 1, pose: 'raise', long: 1, scarf: '#8a2a20' });
  },
  harpooner(g, R) {
    rlaSky(g, '#3a5a7a', '#8ab0c0', '#e0d8c0', 56); rlaSea(g, 56, '#3a6070', '#1a3040', R, 'rgba(255,255,255,0.35)');
    // a whale's back far out
    rlaPoly(g, [[66, 57], [74, 53], [86, 54], [92, 57]], '#1a2a34', false); rlaPoly(g, [[90, 56], [94, 50], [98, 49], [95, 53], [93, 57]], '#1a2a34', false);
    rlaPoly(g, [[-2, 100], [-2, 82], [30, 76], [70, 80], [102, 78], [102, 100]], rlaLin(g, 0, 76, 0, 100, ['#5a4a3a', '#2a1e14']), 'rgba(0,0,0,0.6)');
    rlaMan(g, { x: 46, y: 92, s: 1.15, coat: '#6a5a3a', legs: '#3a3428', skin: '#d0a078', hat: 'knit', hatc: '#3a4a6a', item: 'harpoon', face: 1, pose: 'throw', beard: '#6a4a2a', belt: '#2a1e14', lean: -0.3 });
  },
  drowned(g, R) {
    g.fillStyle = rlaLin(g, 0, 0, 0, 100, ['#0e3a3c', '#08242a', '#04141a']); g.fillRect(0, 0, 100, 100);
    g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { g.globalAlpha = 0.08; g.fillStyle = '#8affe0'; const x = 10 + i * 20 + R() * 8; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, 0); g.lineTo(x + 22, 100); g.lineTo(x + 10, 100); g.closePath(); g.fill(); } g.restore();
    // weed rising from the bottom
    for (let i = 0; i < 9; i++) { const x = R() * 100; rlaLimb(g, [[x, 102], [x + (R() - 0.5) * 8, 80], [x + (R() - 0.5) * 12, 60 + R() * 15]], 1.4 + R(), '#1e4a2a', false); }
    rlaMan(g, { x: 50, y: 98, s: 1.3, coat: '#2a4a4a', legs: '#1e3434', skin: '#8ab4a0', hat: 'none', item: 'none', face: 1, pose: 'reach', eyes: '#9affd8', weed: '#3a7a3a', ragged: 1, stripe: 'rgba(200,220,210,0.35)' });
    rlaBubbles(g, R, 14, 30, 80, 6, 50);
  },
  gulls(g, R) {
    rlaSky(g, '#3a6a9a', '#8ab8d8', '#e8eef0', 82); rlaSea(g, 82, '#3a6a80', '#2a4a5a', R, 'rgba(255,255,255,0.5)');
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,0.5)'; rlaEll(g, R() * 100, 10 + R() * 50, 10 + R() * 14, 2.5 + R() * 2, 'rgba(255,255,255,0.4)', false); }
    rlaGull(g, 74, 22, 0.55, true, 0.7); rlaGull(g, 26, 34, 0.7, false, 1.1); rlaGull(g, 78, 58, 0.85, true, 0.4); rlaGull(g, 34, 70, 1.15, false, 0.9);
  },
  fogwraith(g, R) {
    g.fillStyle = rlaLin(g, 0, 0, 0, 100, ['#5a6470', '#8a949e', '#aab2b8']); g.fillRect(0, 0, 100, 100);
    rlaMist(g, 30, 30, '#e8eef0', 0.5, R);
    // the wraith: a long hooded shape that thins to nothing at its foot
    g.save(); g.fillStyle = rlaLin(g, 0, 18, 0, 96, ['rgba(40,46,56,0.95)', 'rgba(60,68,80,0.85)', [1, 'rgba(160,170,180,0)']]);
    g.beginPath(); g.moveTo(50, 14); g.bezierCurveTo(66, 14, 70, 30, 70, 40); g.bezierCurveTo(80, 52, 84, 70, 88, 92); g.bezierCurveTo(72, 84, 64, 96, 50, 88); g.bezierCurveTo(38, 96, 26, 84, 14, 94); g.bezierCurveTo(20, 70, 24, 52, 32, 40); g.bezierCurveTo(32, 26, 36, 14, 50, 14); g.fill(); g.restore();
    // its arms, reaching out
    rlaLimb(g, [[34, 44], [20, 52], [10, 50]], 4, 'rgba(50,58,68,0.85)', false); rlaLimb(g, [[66, 44], [80, 50], [92, 44]], 4, 'rgba(50,58,68,0.85)', false);
    g.strokeStyle = 'rgba(30,34,40,0.8)'; g.lineWidth = 0.8; for (const [x, y, d] of [[10, 50, -1], [92, 44, 1]]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + d * 4, y - 2 + k * 2.4); g.stroke(); }
    rlaEll(g, 50, 32, 9, 11, '#0c1016', false);
    rlaGlow(g, 46, 32, 6, '#b8f4ff', 1); rlaGlow(g, 55, 32, 6, '#b8f4ff', 1); g.fillStyle = '#ffffff'; g.fillRect(45.3, 31.3, 1.4, 1.2); g.fillRect(54.3, 31.3, 1.4, 1.2);
    rlaMist(g, 84, 14, '#eef2f4', 0.75, R);
  },
  coastguard(g, R) {
    rlaSky(g, '#2a3a58', '#6a7a98', '#c8b8a8', 56); rlaSea(g, 56, '#3a4a5e', '#1e2838', R);
    rlaFarLight(g, 50, 56, 0.9, '#1a2030', '#ffe8a0');
    rlaBank(g, 84, '#3a3a40', R);
    rlaMan(g, { x: 62, y: 90, s: 0.92, coat: '#1e2a48', legs: '#1a1e2a', skin: '#d8a880', hat: 'peaked', item: 'carbine', face: 1, pose: 'aim', buttons: '#e8c060', belt: '#e8e0cc' });
    rlaMan(g, { x: 34, y: 98, s: 1.1, coat: '#22304e', legs: '#1a1e2a', skin: '#d0a078', hat: 'peaked', item: 'carbine', face: 1, pose: 'aim', buttons: '#e8c060', belt: '#e8e0cc', beard: '#4a3020' });
  },
  cormorant(g, R) {
    rlaSky(g, '#4a5a6a', '#8a9aa0', '#c8c0b0', 62); rlaSea(g, 62, '#3a5058', '#1a2a30', R);
    // the rock, white with droppings
    rlaPoly(g, [[18, 100], [24, 80], [40, 72], [62, 74], [80, 82], [86, 100]], rlaLin(g, 30, 72, 70, 100, ['#5a5450', '#2a2624']), 'rgba(0,0,0,0.6)');
    g.fillStyle = 'rgba(240,236,220,0.6)'; for (let i = 0; i < 12; i++) rlaEll(g, 30 + R() * 46, 75 + R() * 10, 1 + R() * 2, 0.5 + R(), 'rgba(240,236,224,0.6)', false);
    // wings spread to dry
    const wing = (sd) => rlaPoly(g, [[50 + sd * 4, 44], [50 + sd * 18, 26], [50 + sd * 34, 22], [50 + sd * 44, 30], [50 + sd * 38, 34], [50 + sd * 42, 40], [50 + sd * 32, 42], [50 + sd * 34, 50], [50 + sd * 20, 52], [50 + sd * 6, 58]], rlaLin(g, 50, 20, 50 + sd * 44, 56, ['#2a2e34', '#101216']), null, 1);
    wing(-1); wing(1);
    g.strokeStyle = 'rgba(120,140,130,0.4)'; g.lineWidth = 0.5; for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(50 + sd * 8, 48 - k); g.lineTo(50 + sd * (26 + k * 3), 28 + k * 2); g.stroke(); }
    rlaEll(g, 50, 56, 7, 14, rlaLin(g, 44, 44, 56, 70, ['#2a3030', '#0c0e10']));
    rlaLimb(g, [[50, 44], [52, 34], [50, 26]], 4, '#16191c');
    rlaEll(g, 51, 24, 4, 3.4, '#16191c'); rlaPoly(g, [[54, 23], [62, 25], [61, 26.5], [54, 25.6]], '#8a7a5a', null, 0.6); rlaEll(g, 53, 23.6, 0.9, 0.9, '#3aff9a', false); rlaGlow(g, 53, 23.6, 2, '#3affa0', 0.6);
    rlaLimb(g, [[46, 68], [45, 74]], 1.4, '#16191c'); rlaLimb(g, [[54, 68], [55, 74]], 1.4, '#16191c');
  },
  gannet(g, R) {
    rlaSky(g, '#2a5a8a', '#6aa0c8', '#c8e0e8', 78); rlaSea(g, 78, '#2a6070', '#163a48', R, 'rgba(255,255,255,0.5)');
    // the splash it's about to make, and a fish below
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.8; rlaEll(g, 54, 86, 14, 3, false, 'rgba(255,255,255,0.6)', 0.8); rlaEll(g, 54, 86, 22, 4.5, false, 'rgba(255,255,255,0.3)', 0.6);
    rlaEll(g, 58, 94, 4, 1.4, '#a8c0c8', 'rgba(0,0,0,0.3)', 0.5);
    // diving: speed lines along its path
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineCap = 'round'; for (let i = 0; i < 5; i++) { g.lineWidth = 0.7; const o = (i - 2) * 4; g.beginPath(); g.moveTo(22 + o, 4); g.lineTo(36 + o, 30); g.stroke(); }
    g.save(); g.translate(48, 50); g.rotate(1.15);
    rlaPoly(g, [[-26, -4], [-6, -6], [6, -3], [6, 3], [-6, 6], [-26, 4], [-22, 0]], rlaLin(g, 0, -6, 0, 6, ['#ffffff', '#d0d4dc']), null, 1);
    rlaPoly(g, [[-20, -4.2], [-30, -9], [-26, -3]], '#16161c', false); rlaPoly(g, [[-20, 4.2], [-30, 9], [-26, 3]], '#16161c', false);
    rlaPoly(g, [[-4, -5.5], [-24, -7.5], [-28, -6], [-8, -3]], rlaLin(g, -24, -7, -4, -4, ['#16161c', '#d8dce4']), null, 0.8);
    rlaEll(g, 7, 0, 5, 4.2, rlaLin(g, 2, -4, 12, 4, ['#f8e8a8', '#e0c060']), null, 0.9);
    rlaPoly(g, [[11, -1.6], [24, 0], [11, 1.4]], '#a8b0b8', null, 0.7);
    g.fillStyle = '#10141a'; g.fillRect(9, -2, 1, 1); g.strokeStyle = '#2a2a34'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(9, -2); g.lineTo(12, -0.5); g.stroke();
    g.restore();
  },
  diver(g, R) {
    g.fillStyle = rlaLin(g, 0, 0, 0, 100, ['#1a4a48', '#0e2e30', '#071a1c']); g.fillRect(0, 0, 100, 100);
    g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { g.globalAlpha = 0.07; g.fillStyle = '#c8ffe8'; const x = 20 + i * 22; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, 0); g.lineTo(x - 6, 100); g.lineTo(x - 14, 100); g.closePath(); g.fill(); } g.restore();
    g.fillStyle = 'rgba(40,60,50,0.8)'; rlaPoly(g, [[-2, 100], [-2, 90], [40, 88], [102, 92], [102, 100]], '#2a3a30', false);
    // the hose up to the surface
    g.strokeStyle = '#3a3a30'; g.lineWidth = 2; g.beginPath(); g.moveTo(60, 28); g.bezierCurveTo(72, 14, 80, 6, 88, -2); g.stroke();
    // the suit
    rlaMan(g, { x: 50, y: 98, s: 1.15, coat: '#8a8068', legs: '#7a7058', boots: '#2a2a2e', skin: '#5a5040', hat: 'none', face: 1, pose: 'raise', item: 'none', belt: '#4a4a52' });
    // the helmet over the head, brass, with its round glass
    const hx = 51, hy = 34; rlaEll(g, hx, hy + 9, 13, 4.5, rlaLit(g, hx - 13, hy + 5, hx + 13, hy + 13, '#b88a3a'));
    rlaEll(g, hx, hy, 11.5, 12, rlaRad(g, hx - 4, hy - 5, 1, 15, ['#ffe8a0', '#c8902a', '#5a3a10']));
    for (const [px, py, pr] of [[hx + 4, hy + 1, 5], [hx - 7, hy, 2.6]]) { rlaEll(g, px, py, pr + 1.4, pr + 1.4, '#8a6420', 'rgba(0,0,0,0.6)', 0.8); rlaEll(g, px, py, pr, pr, rlaRad(g, px - pr * 0.3, py - pr * 0.3, 0, pr, ['#d8fff0', '#3a8a7a', '#0a2a28']), false); }
    g.fillStyle = '#6a4a18'; for (let a = 0; a < 6; a++) { const aa = a / 6 * 6.283; rlaEll(g, hx + 4 + Math.cos(aa) * 6, hy + 1 + Math.sin(aa) * 6, 0.7, 0.7, '#ffe8a0', false); }
    rlaGlow(g, hx + 4, hy + 1, 8, '#8affd8', 0.5);
    rlaBubbles(g, R, 16, 56, 76, 2, 24);
  },
  bosun(g, R) {
    rlaSky(g, '#3a2a3a', '#8a5a5a', '#e09a6a', 60); rlaSea(g, 60, '#4a3a40', '#1e1a22', R, 'rgba(255,200,150,0.3)');
    g.fillStyle = rlaLin(g, 0, 86, 0, 100, ['#6a4a30', '#3a2818']); g.fillRect(0, 86, 100, 14);
    rlaMan(g, { x: 46, y: 96, s: 1.25, coat: '#8a2a24', legs: '#e8e0cc', boots: '#1a1410', skin: '#d8a880', hat: 'tricorn', item: 'cutlass', face: 1, pose: 'raise', buttons: '#e8c060', belt: '#2a1a10', long: 1, run: 1, lean: 0.6 });
    // the flash on the blade
    rlaSparks(g, 81, 20, 8, 8, '#ffffff', R); rlaGlow(g, 81, 21, 7, '#ffffff', 0.7);
  },
  lamplighter(g, R) {
    rlaSky(g, '#141a30', '#2a2a48', '#5a3a4a', 60); rlaStars(g, R, 20, 50); rlaSea(g, 60, '#1e2234', '#0e1018', R, 'rgba(255,170,90,0.3)');
    rlaBank(g, 86, '#3a3030', R);
    // burning oil, spattered in an arc and alight where it fell
    for (let i = 0; i < 8; i++) { const a = -0.6 + i * 0.18, x = 64 + Math.cos(a) * 30, y = 30 + Math.sin(a) * 12 + i * 4; rlaGlow(g, x, y, 4 + R() * 2, '#ff9030', 0.9); rlaEll(g, x, y, 1, 1, '#fff0b0', false); }
    for (const x of [74, 86, 92]) { rlaGlow(g, x, 88, 9, '#ff7a20', 0.9); rlaPoly(g, [[x - 3, 89], [x - 1, 82], [x, 85], [x + 1.4, 80], [x + 3, 89]], '#ffc050', false); }
    rlaMan(g, { x: 38, y: 96, s: 1.15, coat: '#3a4a3a', dress: '#4a3a4a', skin: '#e0b090', hat: 'bonnet', hatc: '#6a3a3a', item: 'pole', face: 1, pose: 'raise', scarf: '#c8a060' });
  },
  hermit(g, R) {
    rlaSky(g, '#3a4a5a', '#7a8a90', '#b8a890', 50); rlaSea(g, 50, '#3a5058', '#22343a', R);
    rlaPoly(g, [[-2, 100], [-2, 74], [20, 70], [50, 76], [80, 70], [102, 74], [102, 100]], rlaLin(g, 0, 70, 0, 100, ['#6a6058', '#2e2824']), 'rgba(0,0,0,0.6)');
    for (let i = 0; i < 6; i++) rlaEll(g, R() * 100, 78 + R() * 20, 2 + R() * 3, 1 + R(), '#3a4a30', false);
    // the whelk shell, a great spiral
    const sx = 54, sy = 50; rlaPoly(g, [[22, 70], [30, 44], [50, 26], [72, 18], [84, 22], [80, 34], [86, 52], [74, 68], [48, 74]], rlaRad(g, 50, 36, 4, 48, ['#f4e0c0', '#c89a6a', '#6a4a30']), null, 1.3);
    g.strokeStyle = 'rgba(80,50,30,0.7)'; g.lineWidth = 1.1; g.beginPath(); for (let a = 0; a < 14; a += 0.2) { const r = 2 + a * 2.2, x = sx + 6 + Math.cos(a) * r, y = sy - 6 + Math.sin(a) * r * 0.8; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.strokeStyle = 'rgba(255,240,220,0.4)'; g.lineWidth = 0.6; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(34 + k * 7, 66 - k * 3); g.lineTo(44 + k * 6, 30 - k * 1); g.stroke(); }
    // the crab coming out of it, big claws
    rlaCrab(g, 30, 72, 1.1, '#b8402a', { claw: 1.4 });
  },
  drownedcrew(g, R) {
    rlaSky(g, '#0e1a22', '#1a3038', '#2a4a48', 46); rlaMoon(g, 76, 16, 5); rlaSea(g, 46, '#16302e', '#08141a', R, 'rgba(190,255,230,0.25)');
    // rank behind rank, coming up out of the water
    const rows = [[46, 0.45, 9], [60, 0.62, 6], [78, 0.82, 4]];
    for (const [y, s, n] of rows) {
      for (let i = 0; i < n; i++) { const x = (i + 0.5) / n * 100 + (R() - 0.5) * 6; rlaMan(g, { x, y: y + 16 * s, s, coat: rlaMix('#1e3a38', '#0a1a1a', 1 - s), legs: '#1a2a2a', skin: rlaMix('#7aa494', '#2a4a44', 1 - s), hat: R() < 0.4 ? 'knit' : R() < 0.5 ? 'tricorn' : 'none', hatc: '#1a2a2a', item: R() < 0.5 ? 'crowbar' : 'none', face: R() < 0.5 ? 1 : -1, pose: R() < 0.4 ? 'raise' : 'reach', eyes: '#9affd8', weed: '#2a5a3a', ragged: 1 }); }
      g.fillStyle = rlaLin(g, 0, y + 4 * s, 0, y + 20 * s, ['rgba(16,40,42,0.0)', 'rgba(10,26,30,0.95)']); g.fillRect(0, y + 4 * s, 100, 22 * s);
      g.strokeStyle = 'rgba(190,255,230,0.35)'; g.lineWidth = 0.6; for (let i = 0; i < 6; i++) { const x = R() * 100; g.beginPath(); g.moveTo(x, y + 9 * s); g.lineTo(x + 8, y + 9 * s); g.stroke(); }
    }
  },
  mooncusser(g, R) {
    rlaSky(g, '#0a0c1a', '#1a1a30', '#2a2438', 70); rlaStars(g, R, 40, 70); rlaMoon(g, 24, 22, 9);
    rlaSea(g, 70, '#141626', '#06070e', R, 'rgba(255,214,120,0.35)');
    // a ship far out, steering for his light
    rlaPoly(g, [[10, 70], [12, 67], [22, 67], [24, 70]], '#0a0a12', false); g.fillStyle = '#0a0a12'; g.fillRect(16, 58, 0.8, 9); rlaPoly(g, [[17, 59], [22, 63], [17, 64]], '#0a0a12', false);
    rlaPoly(g, [[30, 100], [44, 80], [70, 74], [102, 78], [102, 100]], rlaLin(g, 0, 74, 0, 100, ['#24202a', '#0a080e']), 'rgba(0,0,0,0.6)');
    rlaMan(g, { x: 70, y: 90, s: 1.1, coat: '#22202a', legs: '#16141a', skin: '#a88a78', hat: 'hood', hatc: '#16141c', item: 'falselight', face: -1, pose: 'raise', long: 1, eyes: '#ffd070' });
  },
  lightkeeper(g, R) {
    rlaSky(g, '#141e38', '#2a3a5a', '#6a6078', 62); rlaStars(g, R, 25, 60); rlaSea(g, 62, '#1e2a40', '#0c1220', R);
    // the light behind, its beam
    g.fillStyle = rlaLin(g, 14, 0, 26, 0, ['#c8c0b0', '#f0ece0', '#9a948a']); rlaPoly(g, [[12, 100], [15, 30], [25, 30], [28, 100]], rlaLin(g, 12, 0, 28, 0, ['#d8d0c0', '#f4f0e8', '#8a8478']), 'rgba(0,0,0,0.5)');
    g.fillStyle = '#b0302a'; rlaPoly(g, [[13.6, 60], [26.4, 60], [26.8, 68], [13.2, 68]], '#b0302a', false); rlaPoly(g, [[14.6, 40], [25.4, 40], [25.7, 47], [14.3, 47]], '#b0302a', false);
    g.fillStyle = '#1a1a20'; g.fillRect(13, 28, 14, 2.4); g.fillRect(15, 20, 10, 8); g.fillStyle = rlaRad(g, 20, 24, 0, 6, ['#ffffff', '#ffe08a']); g.fillRect(16, 21, 8, 6); rlaPoly(g, [[14, 20], [20, 14], [26, 20]], '#1a1a20', false);
    rlaGlow(g, 20, 24, 18, '#ffe08a', 0.8); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18; g.fillStyle = '#fff0b0'; g.beginPath(); g.moveTo(20, 24); g.lineTo(110, 6); g.lineTo(110, 34); g.closePath(); g.fill(); g.restore();
    rlaBank(g, 88, '#34323a', R);
    // the flare he's just fired, and its trail
    g.strokeStyle = 'rgba(255,170,140,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(74, 46); g.quadraticCurveTo(82, 20, 88, 10); g.stroke(); rlaGlow(g, 88, 10, 12, '#ff6a4a', 1); rlaEll(g, 88, 10, 1.6, 1.6, '#fff0e0', false);
    rlaMan(g, { x: 56, y: 98, s: 1.2, coat: '#1a2440', legs: '#141a2a', skin: '#d8a880', hat: 'peaked', item: 'pistol', face: 1, pose: 'raise', buttons: '#e8c060', beard: '#c8c0b0', long: 1 });
  },
  keelback(g, R) {
    rlaSky(g, '#1e2a30', '#3a4a48', '#6a7a68', 58); rlaSea(g, 58, '#22383a', '#0c1a1c', R, 'rgba(210,255,230,0.3)');
    // the coils, arching out of the water, the ridge of spines along them
    const body = t => [8 + t * 84, 58 - Math.sin(t * Math.PI * 1.6 - 0.2) * 30 * (t < 0.62 ? 1 : 0.6) + (t > 0.62 ? 8 : 0)];
    const N = 40, top = [], bot = [];
    for (let i = 0; i <= N; i++) { const t = i / N, [x, y] = body(t), w = 5 + Math.sin(t * Math.PI) * 4; top.push([x, y - w]); bot.push([x, y + w]); }
    g.save(); g.beginPath(); g.rect(0, 0, 100, 64); g.clip();
    rlaPoly(g, top.concat(bot.reverse()), rlaLin(g, 0, 20, 0, 64, ['#4a6a4a', '#2a4030', '#14201a']), null, 1.2);
    g.fillStyle = 'rgba(200,230,180,0.25)'; for (let i = 2; i < N - 2; i += 2) { const [x, y] = body(i / N); rlaEll(g, x, y + 2, 1.8, 1.2, 'rgba(210,240,190,0.3)', false); }
    for (let i = 1; i < N; i += 2) { const [x, y] = body(i / N), w = 5 + Math.sin(i / N * Math.PI) * 4; rlaPoly(g, [[x - 2, y - w + 0.5], [x + 0.4, y - w - 5 - Math.sin(i / N * Math.PI) * 3], [x + 2.2, y - w + 0.5]], '#8a3a2a', 'rgba(0,0,0,0.5)', 0.6); }
    g.restore();
    // the head, rearing at the left
    const [hx, hy] = body(0.02); rlaPoly(g, [[hx - 4, hy - 12], [hx + 10, hy - 18], [hx + 20, hy - 14], [hx + 18, hy - 6], [hx + 2, hy - 2]], rlaLit(g, hx, hy - 18, hx + 20, hy, '#4a6a4a'), null, 1.1);
    rlaPoly(g, [[hx + 16, hy - 9], [hx + 22, hy - 8], [hx + 16, hy - 6]], '#e8e0c8', false);
    rlaGlow(g, hx + 12, hy - 13, 5, '#ffd040', 1); rlaEll(g, hx + 12, hy - 13, 1.4, 1, '#ffe080', false);
    for (let i = 0; i < 3; i++) rlaPoly(g, [[hx + 2 + i * 4, hy - 16 + i], [hx - 2 + i * 4, hy - 24 + i * 1.5], [hx + 5 + i * 4, hy - 16.5 + i]], '#8a3a2a', 'rgba(0,0,0,0.5)', 0.6);
    // white water where it breaks the surface
    g.fillStyle = 'rgba(255,255,255,0.7)'; for (const t of [0.0, 0.31, 0.62, 0.98]) { const [x] = body(t); rlaEll(g, x, 60, 8, 1.8, 'rgba(240,255,250,0.65)', false); }
    rlaBubbles(g, R, 10, 0, 100, 64, 90, 'rgba(220,255,240,0.4)');
  },
  kelp(g, R) {
    rlaSky(g, '#1e2a24', '#3a4a3a', '#5a6a4a', 54); rlaSea(g, 54, '#243a30', '#101c16', R);
    rlaBank(g, 86, '#2a2a24', R);
    // the heap: strands of weed in layers, darker inside
    const strand = (x0, y0, x1, y1, w, col) => { rlaLimb(g, [[x0, y0], [x0 + (x1 - x0) * 0.4 + (R() - 0.5) * 8, y0 + (y1 - y0) * 0.5], [x1, y1]], w, col, 'rgba(6,10,6,0.6)'); };
    for (let i = 0; i < 26; i++) { const a = -Math.PI * (0.05 + R() * 0.9), r = 22 + R() * 14; strand(50, 60, 50 + Math.cos(a) * r, 92 - Math.abs(Math.sin(a)) * (r + 10), 3 + R() * 2.5, R() < 0.5 ? '#2a5a2a' : '#3a6a26'); }
    rlaEll(g, 50, 60, 22, 26, rlaRad(g, 44, 50, 2, 30, ['#4a7a2a', '#2a4a1e', '#142410']), null, 1.2);
    for (let i = 0; i < 18; i++) { const x = 32 + R() * 36, y = 38 + R() * 40; strand(x, y - 6, x + (R() - 0.5) * 10, y + 10, 2 + R() * 1.5, R() < 0.5 ? '#3a6a24' : '#5a7a2a'); }
    // its arms, trailing
    strand(32, 56, 12, 78, 5, '#3a6a26'); strand(12, 78, 8, 92, 3.5, '#3a6a26'); strand(68, 54, 88, 70, 5, '#2e5a24'); strand(88, 70, 92, 88, 3.5, '#2e5a24');
    // bladders, and the eyes in it
    for (let i = 0; i < 8; i++) rlaEll(g, 34 + R() * 32, 44 + R() * 36, 1.8, 1.4, '#8a8a3a', 'rgba(0,0,0,0.5)', 0.5);
    rlaGlow(g, 43, 50, 7, '#e8ff60', 1); rlaGlow(g, 57, 49, 7, '#e8ff60', 1); g.fillStyle = '#ffffe0'; g.fillRect(42.3, 49.4, 1.6, 1.2); g.fillRect(56.3, 48.4, 1.6, 1.2);
    g.strokeStyle = 'rgba(180,220,200,0.5)'; g.lineWidth = 0.6; for (let i = 0; i < 10; i++) { const x = 30 + R() * 40, y = 70 + R() * 20; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 2 + R() * 3); g.stroke(); }
  },
  crabking(g, R) {
    rlaSky(g, '#2a0e16', '#7a2a2a', '#e0703a', 56); rlaSun(g, 50, 52, 9, '#ffb060'); rlaSea(g, 56, '#4a2020', '#1a0c10', R, 'rgba(255,170,100,0.4)');
    rlaPoly(g, [[-2, 100], [-2, 82], [26, 76], [74, 78], [102, 80], [102, 100]], rlaLin(g, 0, 76, 0, 100, ['#4a2a24', '#1a0e0c']), 'rgba(0,0,0,0.6)');
    rlaCrab(g, 50, 70, 2.25, '#a82a22', { wide: 1, claw: 1.15, eyes: '#ffd040' });
    // the crown: barnacles and a ring of coral points
    const cx = 50, cy = 51; rlaPoly(g, [[cx - 13, cy + 4], [cx - 14, cy - 4], [cx - 9, cy], [cx - 7, cy - 9], [cx - 3, cy - 1], [cx, cy - 12], [cx + 3, cy - 1], [cx + 7, cy - 9], [cx + 9, cy], [cx + 14, cy - 4], [cx + 13, cy + 4]], rlaLin(g, cx, cy - 12, cx, cy + 4, ['#fff0a0', '#e0a830', '#8a5a14']), null, 1);
    for (const [x, y, c] of [[cx - 7, cy + 1, '#3affd0'], [cx, cy, '#ff5a8a'], [cx + 7, cy + 1, '#3affd0']]) { rlaEll(g, x, y, 1.6, 1.6, c, 'rgba(0,0,0,0.5)', 0.5); }
    g.fillStyle = 'rgba(230,220,200,0.6)'; for (let i = 0; i < 12; i++) rlaEll(g, 30 + R() * 40, 66 + R() * 10, 1.2, 1, 'rgba(230,224,210,0.55)', 'rgba(0,0,0,0.35)', 0.4);
  },
  // ---- spells ----
  flare(g, R) {
    rlaSky(g, '#100a24', '#24184a', '#3a2a5a', 74); rlaStars(g, R, 30, 74); rlaSea(g, 74, '#1e1a3a', '#0a0818', R, 'rgba(255,255,255,0.4)');
    g.strokeStyle = 'rgba(220,210,255,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(20, 100); g.quadraticCurveTo(34, 54, 52, 36); g.stroke();
    rlaGlow(g, 54, 34, 52, '#d8d0ff', 0.7); rlaGlow(g, 54, 34, 22, '#ffffff', 1);
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffffff'; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + R() * 0.2, l = 14 + R() * 18; g.globalAlpha = 0.4 + R() * 0.4; g.lineWidth = 0.6 + R(); g.beginPath(); g.moveTo(54 + Math.cos(a) * 5, 34 + Math.sin(a) * 5); g.lineTo(54 + Math.cos(a) * l, 34 + Math.sin(a) * l); g.stroke(); } g.restore();
    rlaEll(g, 54, 34, 3.4, 3.4, '#ffffff', false);
    // sparks falling
    for (let i = 0; i < 14; i++) { const x = 40 + R() * 30, y = 44 + R() * 34; rlaGlow(g, x, y, 2.4, '#ffd8f0', 0.9); g.strokeStyle = 'rgba(255,220,240,0.4)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 1, y - 4); g.stroke(); }
    // the light it throws on the water
    g.fillStyle = 'rgba(255,255,255,0.35)'; rlaEll(g, 54, 82, 26, 3, 'rgba(240,236,255,0.35)', false);
  },
  cannonshot(g, R) {
    rlaSky(g, '#1a1230', '#3a2a58', '#8a5a7a', 70); rlaSea(g, 70, '#2a2448', '#0e0c1e', R);
    // the battery's walls on the left, its muzzle flash
    rlaPoly(g, [[-2, 100], [-2, 62], [20, 62], [20, 58], [26, 58], [26, 64], [32, 66], [32, 100]], rlaLin(g, 0, 58, 0, 100, ['#5a5468', '#24202e']), 'rgba(0,0,0,0.6)');
    rlaGlow(g, 30, 60, 10, '#ffb050', 0.8);
    // smoke along the arc, thicker behind
    for (let i = 0; i < 14; i++) { const t = i / 14, x = 30 + t * 50, y = 60 - Math.sin(t * Math.PI * 0.8) * 42; g.fillStyle = rlaRad(g, x, y, 0, 6 + (1 - t) * 6, ['rgba(220,210,230,0.5)', 'rgba(200,190,220,0)']); g.beginPath(); g.arc(x, y, 6 + (1 - t) * 6, 0, 6.283); g.fill(); }
    // the shot itself
    const bx = 80, by = 26; rlaGlow(g, bx, by, 14, '#ffc080', 0.5);
    rlaEll(g, bx, by, 8, 8, rlaRad(g, bx - 3, by - 3, 0.5, 10, ['#8a8a9a', '#3a3a46', '#0c0c12']), 'rgba(0,0,0,0.8)', 1.2);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineCap = 'round'; for (let i = 0; i < 4; i++) { g.lineWidth = 0.8; g.beginPath(); g.moveTo(bx - 10 - i * 2, by + 4 + i * 3); g.lineTo(bx - 20 - i * 3, by + 10 + i * 3); g.stroke(); }
    // where it's going to land
    rlaEll(g, 84, 84, 10, 2.4, false, 'rgba(255,200,160,0.7)', 0.8); rlaEll(g, 84, 84, 5, 1.2, false, 'rgba(255,200,160,0.9)', 0.8);
  },
  roguewave(g, R) {
    rlaSky(g, '#1a2a3a', '#3a5a6a', '#8aa8b0', 50);
    g.fillStyle = rlaLin(g, 0, 50, 0, 100, ['#1e4a50', '#0e2a30']); g.fillRect(0, 50, 100, 50);
    // the wall of water curling over from the left
    g.beginPath(); g.moveTo(-2, 100); g.lineTo(-2, 30); g.bezierCurveTo(10, 8, 46, 4, 66, 16); g.bezierCurveTo(78, 24, 76, 40, 66, 40); g.bezierCurveTo(58, 40, 56, 32, 60, 28); g.bezierCurveTo(48, 28, 44, 50, 56, 66); g.bezierCurveTo(70, 84, 90, 88, 102, 90); g.lineTo(102, 100); g.closePath();
    g.fillStyle = rlaLin(g, 0, 10, 60, 90, ['#4aa89a', '#1e6a6a', '#0a3038']); g.fill(); g.strokeStyle = 'rgba(0,10,14,0.6)'; g.lineWidth = 1.1; g.stroke();
    // light through its face
    g.save(); g.clip(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rlaRad(g, 30, 40, 2, 34, ['rgba(160,255,220,0.35)', 'rgba(0,0,0,0)']); g.fillRect(0, 0, 100, 100); g.strokeStyle = 'rgba(200,255,240,0.25)'; g.lineWidth = 0.8; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(4 + i * 6, 96); g.bezierCurveTo(8 + i * 6, 60, 20 + i * 5, 30, 40 + i * 3, 14 + i); g.stroke(); } g.restore();
    // the foam along its lip, spray
    g.strokeStyle = '#f0fffa'; g.lineCap = 'round'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(4, 22); g.bezierCurveTo(20, 6, 50, 4, 66, 16); g.bezierCurveTo(76, 24, 74, 36, 66, 38); g.stroke();
    for (let i = 0; i < 30; i++) { const t = R(), x = 10 + t * 64 + (R() - 0.3) * 8, y = 14 - Math.sin(t * Math.PI) * 6 + (R() - 0.5) * 8; rlaEll(g, x, y, 0.6 + R() * 1.2, 0.6 + R() * 1.2, 'rgba(240,255,250,0.85)', false); }
    rlaMist(g, 14, 8, '#e8fff8', 0.35, R);
    // a little boat about to go under it
    rlaPoly(g, [[76, 84], [92, 84], [89, 88], [79, 88]], '#3a2a1e', 'rgba(0,0,0,0.6)', 0.6); g.fillStyle = '#2a1e14'; g.fillRect(83.6, 72, 0.8, 12); rlaPoly(g, [[84.6, 73], [90, 81], [84.6, 81]], '#d8d0b8', 'rgba(0,0,0,0.5)', 0.5);
  },
  haar(g, R) {
    rlaSky(g, '#3a3e50', '#6a6e80', '#8a8c98', 64); rlaSea(g, 64, '#3a3e4c', '#22242e', R, 'rgba(255,255,255,0.2)');
    rlaFarLight(g, 30, 64, 1.2, '#2a2c38', '#ffe0a0'); rlaGlow(g, 30, 50, 26, '#ffe8b0', 0.5);
    // the fog bank rolling in: layered, brighter at its top
    for (let k = 0; k < 4; k++) { const y = 30 + k * 16; g.fillStyle = rlaLin(g, 0, y - 10, 0, y + 30, ['rgba(230,232,240,0.0)', 'rgba(220,224,236,0.75)', 'rgba(190,196,210,0.6)']); g.beginPath(); g.moveTo(-2, y + 30); for (let x = -2; x <= 104; x += 8) g.lineTo(x, y + Math.sin(x * 0.12 + k) * 4 - (R() * 3)); g.lineTo(104, y + 40); g.lineTo(-2, y + 40); g.closePath(); g.fill(); }
    rlaMist(g, 50, 30, '#ffffff', 0.4, R); rlaGlow(g, 30, 50, 14, '#ffe0a0', 0.55);
    // shapes inside it, dim and slowed
    g.fillStyle = 'rgba(70,74,90,0.45)'; for (const [x, s] of [[60, 0.5], [74, 0.6], [86, 0.45]]) { rlaEll(g, x, 66 - 18 * s, 2.8 * s * 2, 3 * s * 2, 'rgba(70,74,92,0.45)', false); g.fillRect(x - 3 * s * 2, 66 - 14 * s, 6 * s * 2, 14 * s * 1.4); }
    rlaMist(g, 76, 14, '#eef0f6', 0.55, R);
    g.fillStyle = 'rgba(184,138,255,0.12)'; g.fillRect(0, 0, 100, 100);
  },
  powderkeg(g, R) {
    rlaSky(g, '#140c20', '#3a1a34', '#6a2a3a', 74); rlaSea(g, 74, '#2a1428', '#100810', R, 'rgba(255,170,90,0.4)');
    // the blast
    rlaGlow(g, 50, 50, 56, '#ff7a30', 0.75); rlaGlow(g, 50, 50, 28, '#ffe0a0', 1);
    g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + R() * 0.3, l = 24 + R() * 22; g.fillStyle = 'rgba(255,190,90,0.35)'; g.beginPath(); g.moveTo(50 + Math.cos(a - 0.12) * 8, 50 + Math.sin(a - 0.12) * 8); g.lineTo(50 + Math.cos(a) * l, 50 + Math.sin(a) * l); g.lineTo(50 + Math.cos(a + 0.12) * 8, 50 + Math.sin(a + 0.12) * 8); g.closePath(); g.fill(); } g.restore();
    // staves flying out
    for (let i = 0; i < 7; i++) { const a = R() * 6.283, d = 18 + R() * 20, x = 50 + Math.cos(a) * d, y = 50 + Math.sin(a) * d; g.save(); g.translate(x, y); g.rotate(a + 1.2); rlaPoly(g, [[-4, -1.2], [4, -1.6], [4, 1.6], [-4, 1.2]], '#6a4424', 'rgba(0,0,0,0.6)', 0.6); g.restore(); }
    // the hoop of the keg, still whole, and smoke
    g.strokeStyle = '#2a2a2e'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(50, 50, 14, 6, -0.3, 0, 6.283); g.stroke();
    for (let i = 0; i < 10; i++) { const a = R() * 6.283, d = 30 + R() * 14; g.fillStyle = rlaRad(g, 50 + Math.cos(a) * d, 50 + Math.sin(a) * d, 0, 8, ['rgba(90,60,70,0.6)', 'rgba(60,40,50,0)']); g.beginPath(); g.arc(50 + Math.cos(a) * d, 50 + Math.sin(a) * d, 8, 0, 6.283); g.fill(); }
    rlaSparks(g, 50, 50, 46, 26, '#fff0c0', R);
  },
  stormbolts(g, R) {
    rlaSky(g, '#0c0a1c', '#1e1a3a', '#2e2a4a', 82); rlaSea(g, 82, '#1a1830', '#08070e', R, 'rgba(200,220,255,0.4)');
    // the clouds
    for (let i = 0; i < 10; i++) { const x = R() * 100, y = 4 + R() * 16, r = 10 + R() * 12; g.fillStyle = rlaRad(g, x, y, 0, r, ['rgba(70,64,110,0.85)', 'rgba(40,36,70,0)']); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    // the storm glass, its glass cracked, the crystals inside
    const gx = 50, gy = 46;
    rlaPoly(g, [[gx - 3, gy - 22], [gx + 3, gy - 22], [gx + 3, gy - 14], [gx + 9, gy - 4], [gx + 9, gy + 14], [gx - 9, gy + 14], [gx - 9, gy - 4], [gx - 3, gy - 14]], rlaLin(g, gx - 9, 0, gx + 9, 0, ['rgba(200,230,255,0.55)', 'rgba(140,170,220,0.25)', 'rgba(200,230,255,0.5)']), 'rgba(220,240,255,0.9)', 0.9);
    for (let i = 0; i < 7; i++) { const x = gx - 6 + R() * 12, y = gy + 2 + R() * 10; rlaPoly(g, [[x, y + 3], [x + 1, y - 2 - R() * 4], [x + 2, y + 3]], 'rgba(240,250,255,0.85)', false); }
    rlaPoly(g, [[gx - 10, gy + 14], [gx + 10, gy + 14], [gx + 11, gy + 18], [gx - 11, gy + 18]], '#6a4a2a', 'rgba(0,0,0,0.6)', 0.8);
    g.strokeStyle = '#ffffff'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(gx + 2, gy - 8); g.lineTo(gx - 1, gy - 3); g.lineTo(gx + 3, gy + 1); g.lineTo(gx - 2, gy + 6); g.stroke();
    rlaGlow(g, gx, gy, 18, '#b8d8ff', 0.6);
    // three bolts out of the cloud
    const bolt = (x0, x1, w) => { const pts = [[x0, 8]]; let x = x0; for (let y = 8; y < 88; y += 8) { x += (x1 - x0) / 10 + (R() - 0.5) * 8; pts.push([x, y]); } g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(170,200,255,0.4)'; g.lineWidth = w * 4; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = w; g.stroke(); g.restore(); rlaGlow(g, pts[pts.length - 1][0], 88, 8, '#c8e0ff', 0.9); };
    bolt(14, 18, 1.2); bolt(84, 82, 1.3); bolt(30, 34, 0.9);
  },
  // ---- buildings ----
  battery(g, R) {
    rlaSky(g, '#2a1e1a', '#6a4a34', '#c8884a', 56); rlaSea(g, 56, '#4a3a30', '#22180e', R, 'rgba(255,200,140,0.3)');
    // the stone emplacement: dressed blocks, an embrasure
    const wall = [[6, 100], [6, 50], [94, 50], [94, 100]]; rlaPoly(g, wall, rlaLin(g, 0, 50, 0, 100, ['#9a8a74', '#6a5a48', '#3a3028']), 'rgba(0,0,0,0.6)');
    g.strokeStyle = 'rgba(30,20,14,0.5)'; g.lineWidth = 0.7; for (let r = 0; r < 6; r++) { const y = 50 + r * 8.4; g.beginPath(); g.moveTo(6, y); g.lineTo(94, y); g.stroke(); for (let c = 0; c < 7; c++) { const x = 6 + (c + (r % 2) * 0.5) * 13; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8.4); g.stroke(); } }
    rlaPoly(g, [[34, 50], [40, 62], [60, 62], [66, 50]], '#1e1814', 'rgba(0,0,0,0.7)');
    rlaPoly(g, [[4, 50], [4, 44], [96, 44], [96, 50]], rlaLin(g, 0, 44, 0, 50, ['#b8a890', '#7a6a58']), 'rgba(0,0,0,0.6)');
    // the gun, pointing out at you, and smoke
    rlaEll(g, 50, 50, 12, 9, rlaRad(g, 46, 46, 1, 14, ['#5a5a64', '#22222a', '#0a0a0e']), 'rgba(0,0,0,0.8)', 1.2);
    rlaEll(g, 50, 50, 8, 6, '#2a2a30', 'rgba(0,0,0,0.8)', 0.8); rlaEll(g, 50, 50, 5, 3.6, '#060608', false);
    rlaGlow(g, 50, 50, 18, '#ffb050', 0.45);
    for (let i = 0; i < 8; i++) { const x = 30 + R() * 40, y = 18 + R() * 22, r = 6 + R() * 8; g.fillStyle = rlaRad(g, x, y, 0, r, ['rgba(210,196,180,0.55)', 'rgba(200,190,170,0)']); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    // shot piled beside it
    for (const [x, y] of [[16, 40], [21, 40], [18.5, 36], [80, 40], [85, 40], [82.5, 36]]) rlaEll(g, x, y, 2.6, 2.6, rlaRad(g, x - 0.8, y - 0.8, 0, 3, ['#6a6a74', '#1a1a20']), 'rgba(0,0,0,0.7)', 0.6);
  },
  swivel(g, R) {
    rlaSky(g, '#24202a', '#5a4a4a', '#b8805a', 60); rlaSea(g, 60, '#3a3438', '#1a161a', R, 'rgba(255,200,140,0.3)');
    rlaBank(g, 80, '#4a4038', R);
    // the post, iron-bound, and the gun on its fork
    rlaPoly(g, [[44, 84], [46, 44], [54, 44], [56, 84]], rlaLit(g, 44, 44, 56, 84, '#6a4a2a'), null, 1.1);
    g.fillStyle = '#2a2a30'; for (const y of [52, 64, 76]) g.fillRect(44.6, y, 11, 2);
    rlaLimb(g, [[46, 44], [44, 38]], 2, '#3a3a44'); rlaLimb(g, [[54, 44], [56, 38]], 2, '#3a3a44');
    g.save(); g.translate(50, 37); g.rotate(-0.18);
    rlaPoly(g, [[-20, -3.6], [22, -2.6], [26, -4.4], [26, 4.4], [22, 2.6], [-20, 3.6]], rlaLin(g, 0, -4, 0, 4, ['#6a6a74', '#2a2a32', '#0c0c10']), 'rgba(0,0,0,0.85)', 1);
    rlaEll(g, 26, 0, 1.4, 4.4, '#08080a', 'rgba(0,0,0,0.8)', 0.8); rlaEll(g, -21, 0, 4, 4, rlaRad(g, -22, -1, 0, 4, ['#5a5a64', '#16161c']), 'rgba(0,0,0,0.8)', 0.8);
    rlaGlow(g, 30, 0, 9, '#ffb040', 1); rlaPoly(g, [[27, -2], [36, -4], [33, 0], [37, 3], [27, 2]], '#ffe8a0', false);
    for (let i = 0; i < 4; i++) { const x = 38 + i * 6, r = 3 + i * 1.6; g.fillStyle = rlaRad(g, x, -i, 0, r, ['rgba(220,210,200,0.6)', 'rgba(200,190,180,0)']); g.beginPath(); g.arc(x, -i, r, 0, 6.283); g.fill(); }
    rlaLimb(g, [[-24, 0], [-34, 4]], 1.6, '#6a4a2a');
    g.fillStyle = '#c8a050'; g.fillRect(4, -3.8, 1.6, 7.6); g.fillRect(16, -3.8, 1.6, 7.6);
    g.restore();
    // its arc of fire, and what it's turning to: a bird, a man
    g.strokeStyle = 'rgba(255,220,160,0.4)'; g.setLineDash([2, 2]); g.lineWidth = 0.8; g.beginPath(); g.arc(50, 37, 40, -2.7, -0.3); g.stroke(); g.setLineDash([]);
    rlaGull(g, 88, 12, 0.28, true, 1);
  },
  bellbuoy(g, R) {
    rlaSky(g, '#22303e', '#5a6a78', '#9aa4a8', 52); rlaSea(g, 52, '#2a4050', '#10202a', R);
    // rings spreading from its toll
    for (let i = 0; i < 4; i++) rlaEll(g, 50, 84, 18 + i * 11, 4 + i * 2.4, false, 'rgba(220,240,255,' + (0.5 - i * 0.1) + ')', 0.8);
    // the float, red and black
    rlaPoly(g, [[30, 84], [34, 74], [66, 74], [70, 84], [62, 90], [38, 90]], rlaLin(g, 30, 74, 70, 90, ['#e04a3a', '#a02a22', '#4a1210']), null, 1.2);
    g.fillStyle = '#1a1a1e'; g.fillRect(33, 78, 34, 4);
    // the cage, and the bell in it
    g.strokeStyle = '#1a1a20'; g.lineWidth = 1.6; g.lineCap = 'round'; for (const [a, b] of [[38, 44], [62, 56], [44, 46], [56, 54]]) { g.beginPath(); g.moveTo(a, 74); g.lineTo(b, 30); g.stroke(); }
    g.lineWidth = 1.2; for (const y of [40, 54, 64]) { const w = 7 + (y - 30) * 0.18; g.beginPath(); g.moveTo(50 - w, y); g.lineTo(50 + w, y); g.stroke(); }
    rlaPoly(g, [[44, 30], [56, 30], [50, 24]], '#1a1a20', false); rlaEll(g, 50, 22, 2.2, 2.2, '#ffe08a', false); rlaGlow(g, 50, 22, 8, '#ffe08a', 0.8);
    rlaPoly(g, [[44, 52], [45, 44], [48, 40], [52, 40], [55, 44], [56, 52], [58, 54], [42, 54]], rlaLin(g, 42, 40, 58, 54, ['#ffe8a0', '#c8902a', '#6a4410']), null, 1);
    rlaEll(g, 50, 55.4, 1.6, 1.6, '#4a3010', false);
    // its toll, a few marks in the air
    g.strokeStyle = 'rgba(255,240,200,0.6)'; g.lineWidth = 0.9; for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(50, 48, 12 + k * 5, sd > 0 ? -0.5 : Math.PI - 0.5, sd > 0 ? 0.5 : Math.PI + 0.5); g.stroke(); }
  },
  wreckfire(g, R) {
    rlaSky(g, '#0a0a16', '#16142a', '#2a1e30', 58); rlaStars(g, R, 26, 58); rlaSea(g, 58, '#1a1624', '#08070e', R, 'rgba(255,180,100,0.4)');
    // the wreck it calls in, on the rocks out there
    rlaPoly(g, [[66, 59], [72, 52], [90, 54], [94, 59]], '#0c0a10', false); g.strokeStyle = '#0c0a10'; g.lineWidth = 1; g.beginPath(); g.moveTo(80, 53); g.lineTo(84, 34); g.stroke();
    rlaBank(g, 78, '#2a2424', R);
    rlaGlow(g, 42, 70, 46, '#ff7a20', 0.6);
    // the false lantern on its pole, swinging
    rlaLimb(g, [[64, 82], [66, 34]], 1.8, '#3a2a1a'); rlaLimb(g, [[66, 36], [76, 34]], 1.2, '#3a2a1a'); rlaGlow(g, 76, 42, 16, '#ffd060', 1); rlaPoly(g, [[73.6, 38], [78.4, 38], [79, 46], [73, 46]], rlaRad(g, 76, 42, 0, 4, ['#ffffff', '#ffc040']), '#1a1410', 0.7);
    // the bonfire: logs, flames, sparks going up
    for (const [a, b, c, d] of [[26, 86, 56, 76], [28, 76, 58, 86], [32, 88, 52, 72]]) rlaLimb(g, [[a, b], [c, d]], 3.2, '#4a2e1a');
    const flame = (x, y, w, h, col) => { g.beginPath(); g.moveTo(x - w, y); g.bezierCurveTo(x - w, y - h * 0.5, x - w * 0.2, y - h * 0.6, x, y - h); g.bezierCurveTo(x + w * 0.3, y - h * 0.6, x + w, y - h * 0.4, x + w, y); g.closePath(); g.fillStyle = col; g.fill(); };
    flame(42, 82, 14, 36, rlaLin(g, 0, 46, 0, 82, ['rgba(255,120,40,0.0)', '#ff6a20', '#c02a10'])); flame(38, 82, 9, 26, rlaLin(g, 0, 56, 0, 82, ['#ffb040', '#ff7a20'])); flame(46, 82, 7, 22, rlaLin(g, 0, 60, 0, 82, ['#ffe080', '#ffa030'])); flame(42, 82, 4, 13, '#fff4c0');
    for (let i = 0; i < 14; i++) { const x = 30 + R() * 24, y = 20 + R() * 40; rlaEll(g, x, y, 0.6, 0.6, '#ffd080', false); rlaGlow(g, x, y, 2, '#ff9a30', 0.8); }
    // a wrecker coming to it out of the dark
    rlaMan(g, { x: 86, y: 96, s: 0.7, coat: '#1e1a18', legs: '#141210', skin: '#8a6a58', hat: 'tricorn', item: 'crowbar', face: -1, pose: 'stand' });
  },
};

// ---------- the finish: grain and a vignette ----------
function rlaGrain() {
  if (RLA.grain) return RLA.grain;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), R = rlaRand('grain');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  // short dabs of a brush in all directions, light and dark
  g.lineCap = 'round';
  for (let i = 0; i < 1800; i++) { const x = R() * 256, y = R() * 256, a = R() * 3.1416 * 0.6 - 0.9, l = 2 + R() * 7, v = Math.round(90 + R() * 76); g.strokeStyle = `rgb(${v},${v},${v})`; g.globalAlpha = 0.35 + R() * 0.4; g.lineWidth = 0.8 + R() * 1.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return (RLA.grain = c);
}
function rlaPaint(id, px) {
  const key = id + ':' + px; if (RLA.cache[key]) return RLA.cache[key];
  const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d');
  g.save(); g.scale(px / 100, px / 100);
  const card = typeof RL_CARD !== 'undefined' && RL_CARD[id], fn = RL_ART[id];
  try {
    if (fn) fn(g, rlaRand(id));
    else { const T = RL_TYPE[card ? card.type : 'troop'] || RL_TYPE.troop; g.fillStyle = rlaLin(g, 0, 0, 0, 100, [T.dark, '#05070c']); g.fillRect(0, 0, 100, 100); g.fillStyle = T.c; g.font = '40px Georgia, serif'; g.textAlign = 'center'; g.fillText('?', 50, 64); }
  } catch (e) { g.restore(); g.save(); g.scale(px / 100, px / 100); g.fillStyle = '#2a2a34'; g.fillRect(0, 0, 100, 100); }
  g.restore();
  // a wash of the type's colour round the edges, the grain, the vignette
  const T = RL_TYPE[card ? card.type : 'troop'] || RL_TYPE.troop;
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = px <= 64 ? 0.22 : 0.32; g.drawImage(rlaGrain(), 0, 0, px, px); g.restore();
  g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = rlaRad(g, px / 2, px / 2, px * 0.2, px * 0.75, ['rgba(0,0,0,0)', T.c]); g.globalAlpha = 0.5; g.fillRect(0, 0, px, px); g.restore();
  g.fillStyle = rlaRad(g, px * 0.45, px * 0.42, px * 0.3, px * 0.78, ['rgba(0,0,0,0)', 'rgba(4,5,10,0.55)']); g.fillRect(0, 0, px, px);
  return (RLA.cache[key] = c);
}
function rlCardArt(id, canvas) {
  if (!canvas || !canvas.getContext) return;
  const w = canvas.width || 64, h = canvas.height || 64, need = Math.max(w, h), px = need <= 64 ? 64 : need <= 128 ? 128 : need <= 256 ? 256 : 512;
  const src = rlaPaint(id, px), g = canvas.getContext('2d'), s = Math.max(w, h) / px;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.imageSmoothingQuality = 'high';
  g.drawImage(src, (w - px * s) / 2, (h - px * s) / 2, px * s, px * s); g.restore();
}

// ---------- the card face ----------
// a lamp-oil drop with the cost in it, the portrait in a frame of the type's colour, and the name on a plate under it
function rlCardFace(id, el, px) {
  const c = typeof RL_CARD !== 'undefined' && RL_CARD[id], d = el || document.createElement('div');
  px = px || 96; d.textContent = '';
  d.className = 'rlface rl-' + (c ? c.type : 'troop'); d.dataset.id = id;
  const T = RL_TYPE[c ? c.type : 'troop'] || RL_TYPE.troop; d.style.setProperty('--tc', T.c); d.style.setProperty('--td', T.dark);
  const pic = document.createElement('span'); pic.className = 'rlpic';
  const cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.height = Math.round(px * dpr); cv.setAttribute('aria-hidden', 'true');
  rlCardArt(id, cv); pic.appendChild(cv);
  const oil = document.createElement('span'); oil.className = 'rloil'; oil.title = (c ? c.cost : '?') + ' oil'; const ob = document.createElement('b'); ob.textContent = c ? c.cost : '?'; oil.appendChild(ob);
  const nm = document.createElement('span'); nm.className = 'rlname'; nm.textContent = c ? c.n : id;
  d.append(pic, oil, nm);
  return d;
}
