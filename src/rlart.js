'use strict';
// Skerry Clash: the cards' pictures, and the card face the deck builder shows.
//
// Every one of the 64 cards (src/rlcards.js) has a portrait of its own, painted here in 2D canvas with paths and
// gradients and no image files: a backdrop of sky and sea tinted for its type (troops at dusk over the race, spells
// in a violet night, buildings in lamplight amber on the rocks), then the figure, the crabs, the birds, the spell's
// burst or the building drawn over it, lit from the upper left, with a dark edge on everything so it reads at the
// size of a thumbnail. A brush grain and a vignette over the top give it the look of a little oil painting.
// The second 32 (v200) share the same tools, with a few more: tapering tubes for tails and arms, flames, smoke,
// lightning, the lamp-oil drop, herring, rats, puffins and an anchor; and more things to hold and wear.
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
    case 'mitre': rlaPoly(g, [[x - r * 1.0, y - r * 0.45], [x - r * 0.8, y - r * 1.6], [x - r * 0.15, y - r * 3.0], [x + r * 0.55, y - r * 2.7], [x + r * 1.0, y - r * 0.45]], col || '#2a2a50'); rlaPoly(g, [[x - r * 0.25 * f - r * 0.5, y - r * 0.55], [x - r * 0.3 * f, y - r * 2.6], [x + r * 0.75 * f, y - r * 0.55]], '#d8b050', 'rgba(60,40,10,0.6)', 0.5); break;
    case 'tophat': rlaPoly(g, [[x - r * 0.85, y - r * 0.7], [x - r * 0.95, y - r * 2.5], [x + r * 0.95, y - r * 2.5], [x + r * 0.85, y - r * 0.7]], col || '#16161c'); rlaPoly(g, [[x - r * 1.5, y - r * 0.5], [x + r * 1.5, y - r * 0.5], [x + r * 1.4, y - r * 0.85], [x - r * 1.4, y - r * 0.85]], col || '#16161c'); g.fillStyle = '#5a2a2a'; g.fillRect(x - r * 0.88, y - r * 1.15, r * 1.76, r * 0.3); break;
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
    case 'fish': rlaFish(g, x + 2 * k * f, y - 4 * k, k * 1.1, f > 0 ? -1.2 : Math.PI + 1.2); break;
    case 'grenade': { const cx = x + 1.5 * k * f, cy = y - 2.5 * k, fx = cx + 2 * k * f, fy = cy - 7.5 * k; rlaEll(g, cx, cy, 3.6 * k, 3.6 * k, rlaRad(g, cx - k, cy - k, 0, 4.4 * k, ['#7a7a84', '#24242a', '#0a0a0e'])); g.fillStyle = '#3a3a40'; g.fillRect(cx - 1.1 * k, cy - 4.8 * k, 2.2 * k, 1.6 * k); g.strokeStyle = '#d8c8a0'; g.lineWidth = 0.6 * k; g.beginPath(); g.moveTo(cx, cy - 4.8 * k); g.quadraticCurveTo(cx, fy, fx, fy); g.stroke(); rlaGlow(g, fx, fy, 7 * k, '#ffc040', 1); rlaSparks(g, fx, fy, 5 * k, 8, '#ffe8a0', rlaRand('grenade')); break; }
    case 'cudgel': rlaLimb(g, [[x - 1.5 * k * f, y + 3 * k], [x + 4 * k * f, y - 12 * k]], 2.4 * k, '#5a3a20'); rlaEll(g, x + 4.8 * k * f, y - 13.5 * k, 3.2 * k, 3.8 * k, rlaLit(g, x, y - 17 * k, x + 8 * k, y - 10 * k, '#6a4428', 0.4)); break;
    case 'vial': { const cx = x + 1 * k * f, cy = y - 5 * k; rlaGlow(g, cx, cy, 14 * k, '#a0ff90', 0.9); rlaPoly(g, [[cx - 1 * k, cy - 6 * k], [cx + 1 * k, cy - 6 * k], [cx + 1 * k, cy - 3 * k], [cx + 3 * k, cy], [cx + 3 * k, cy + 3.5 * k], [cx - 3 * k, cy + 3.5 * k], [cx - 3 * k, cy], [cx - 1 * k, cy - 3 * k]], rlaRad(g, cx, cy + k, 0, 4 * k, ['#f0fff0', '#7aee7a', '#2a8a3a']), '#14301a', 0.7); rlaEll(g, cx, cy - 6.6 * k, 1.2 * k, 0.9 * k, '#8a6a42', false); break; }
    case 'bag': { const cy = y + 3 * k; rlaLimb(g, [[x - 2 * k, cy + 1 * k], [x, y], [x + 2 * k, cy + 1 * k]], 0.8 * k, '#2a1a10', false); rlaPoly(g, [[x - 5.5 * k, cy + 1 * k], [x + 5.5 * k, cy + 1 * k], [x + 6.5 * k, cy + 7 * k], [x - 6.5 * k, cy + 7 * k]], rlaLit(g, x - 6 * k, cy, x + 6 * k, cy + 7 * k, '#5a2e1a', 0.4)); g.fillStyle = '#d8b050'; g.fillRect(x - 1 * k, cy + 0.6 * k, 2 * k, 1.4 * k); break; }
    case 'cord': { g.strokeStyle = '#d8c8a0'; g.lineWidth = 0.7 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 3 * k * f, y + 5 * k, x - 2 * k * f, y + 9 * k, x + 2 * k * f, y + 15 * k); g.stroke(); for (const t of [0.3, 0.6, 0.9]) { const kx = x + (t * 2 - 0.4) * k * f, ky = y + t * 15 * k; rlaGlow(g, kx, ky, 4 * k, '#c8dcff', 0.9); rlaEll(g, kx, ky, 1 * k, 1 * k, '#f0f4ff', false); } break; }
    case 'keg': { const cx = x + 3 * k * f, cy = y - 3 * k; rlaEll(g, cx, cy, 6 * k, 7 * k, rlaLit(g, cx - 6 * k, cy - 7 * k, cx + 6 * k, cy + 7 * k, '#7a5030', 0.4)); g.strokeStyle = '#2a2a2e'; g.lineWidth = 1.1 * k; for (const dy of [-4, 0, 4]) { g.beginPath(); g.ellipse(cx, cy + dy * k, 5.8 * k * Math.sqrt(1 - (dy * dy) / 49), 1 * k, 0, 0, 6.2832); g.stroke(); } break; }
    case 'linstock': rlaLimb(g, [[x - 4 * k * f, y + 4 * k], [x + 10 * k * f, y - 3 * k]], 1.3 * k, '#5a3a20'); rlaGlow(g, x + 10.5 * k * f, y - 3.3 * k, 6 * k, '#ff9030', 1); rlaEll(g, x + 10.5 * k * f, y - 3.3 * k, 1 * k, 1 * k, '#ffe8a0', false); break;
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

// ---------- more painting tools, for the second 32 ----------
// points along a cubic curve from p0 to p3, n steps
function rlaBez(p0, p1, p2, p3, n) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
// a tapering tube along a spine of points (a tail, an arm), w0 wide at its root to w1 at its tip; gives back both edges
function rlaTube(g, pts, w0, w1, fill, edge) {
  const L = [], Rt = [], W = [];
  for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2; W.push(w); L.push([pts[i][0] - dy / l * w, pts[i][1] + dx / l * w]); Rt.push([pts[i][0] + dy / l * w, pts[i][1] - dx / l * w]); }
  rlaPoly(g, L.concat(Rt.slice().reverse()), fill, edge); return { L, R: Rt, W };
}
// a flame standing on (x, y), w wide at its foot and h tall
function rlaFlame(g, x, y, w, h, col) { g.beginPath(); g.moveTo(x - w, y); g.bezierCurveTo(x - w, y - h * 0.5, x - w * 0.2, y - h * 0.6, x, y - h); g.bezierCurveTo(x + w * 0.3, y - h * 0.6, x + w, y - h * 0.4, x + w, y); g.closePath(); g.fillStyle = col; g.fill(); }
// a soft puff of smoke or cloud
function rlaPuff(g, x, y, r, col, clear) { g.fillStyle = rlaRad(g, x, y, 0, r, [col, [1, clear || 'rgba(0,0,0,0)']]); g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); }
// a bolt of lightning from a to b: a wide pale glow and a white core, a flash where it lands
function rlaZig(g, a, b, w, R) {
  const pts = [a], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, n = Math.max(3, Math.round(l / 7));
  for (let i = 1; i < n; i++) { const t = i / n, j = (R() - 0.5) * l * 0.22; pts.push([a[0] + dx * t - dy / l * j, a[1] + dy * t + dx / l * j]); } pts.push(b);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round'; const run = () => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
  g.strokeStyle = 'rgba(160,190,255,0.35)'; g.lineWidth = w * 4.5; run(); g.strokeStyle = '#ffffff'; g.lineWidth = w; run(); g.restore();
  rlaGlow(g, b[0], b[1], 9 * w, '#c8dcff', 0.9);
}
// a drop of lamp oil, its round foot on (x, y), r its radius, glowing gold
function rlaDrop(g, x, y, r, col) {
  g.beginPath(); g.moveTo(x, y - r * 2.3); g.bezierCurveTo(x + r * 0.35, y - r * 1.5, x + r, y - r * 0.9, x + r, y); g.arc(x, y, r, 0, Math.PI); g.bezierCurveTo(x - r, y - r * 0.9, x - r * 0.35, y - r * 1.5, x, y - r * 2.3); g.closePath();
  g.fillStyle = rlaRad(g, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.7, ['#fffbe0', col, rlaMix(col, '#2a1000', 0.6)]); g.fill(); g.strokeStyle = 'rgba(40,20,0,0.75)'; g.lineWidth = Math.max(0.8, r * 0.09); g.stroke();
  rlaEll(g, x - r * 0.42, y - r * 0.35, r * 0.18, r * 0.42, 'rgba(255,255,255,0.75)', false, 0, 0.35);
}
// a herring, its middle on (x, y), s its size, turned a radians
function rlaFish(g, x, y, s, a) {
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  rlaPoly(g, [[-5, 0], [-8.6, -2.6], [-8, 2.6]], '#7a8a98', null, 0.6);
  rlaEll(g, 0, 0, 6, 1.9, rlaLin(g, 0, -2, 0, 2, ['#3a4a5e', '#a8bac8', '#f0f4f6']), null, 0.7);
  g.fillStyle = '#10141a'; g.fillRect(3.4, -0.8, 0.8, 0.8); g.restore();
}
// a rat side on, standing on (x, y), about 40 * s long with its tail; f 1 faces right, -1 left
function rlaRat(g, x, y, s, f, col) {
  col = col || '#5e4e44'; const dark = rlaMix(col, '#000000', 0.5), pink = '#c88a80';
  g.lineCap = 'round'; g.strokeStyle = 'rgba(8,6,10,0.7)'; g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(x - 8 * s * f, y - 3 * s); g.quadraticCurveTo(x - 20 * s * f, y, x - 25 * s * f, y - 9 * s); g.stroke();
  g.strokeStyle = pink; g.lineWidth = 1.2 * s; g.stroke();
  rlaLimb(g, [[x - 6 * s * f, y - 3 * s], [x - 9 * s * f, y + 0.5 * s]], 2 * s, dark); rlaLimb(g, [[x + 5 * s * f, y - 2 * s], [x + 3 * s * f, y + 0.5 * s]], 1.6 * s, dark);
  rlaEll(g, x - 1 * s * f, y - 5 * s, 10 * s, 5.6 * s, rlaRad(g, x - 3 * s * f, y - 9 * s, 0, 12 * s, [rlaMix(col, '#fff0d8', 0.32), col, dark]), null, 1);
  rlaLimb(g, [[x - 3 * s * f, y - 3 * s], [x - 1 * s * f, y + 0.5 * s]], 2 * s, col); rlaLimb(g, [[x + 7 * s * f, y - 3 * s], [x + 9 * s * f, y + 0.5 * s]], 1.6 * s, col);
  rlaPoly(g, [[x + 5 * s * f, y - 9.5 * s], [x + 17.5 * s * f, y - 4 * s], [x + 16 * s * f, y - 2.4 * s], [x + 6 * s * f, y - 1.5 * s]], rlaLit(g, x + 5 * s * f, y - 10 * s, x + 17 * s * f, y - 2 * s, col, 0.3), null, 1);
  rlaEll(g, x + 17.4 * s * f, y - 3.6 * s, 1.1 * s, 1 * s, pink, false);
  rlaPoly(g, [[x + 14.8 * s * f, y - 2.6 * s], [x + 15.6 * s * f, y - 0.6 * s], [x + 16.4 * s * f, y - 2.4 * s]], '#f4eee0', false);
  rlaEll(g, x + 7.5 * s * f, y - 9.6 * s, 2.6 * s, 3 * s, rlaMix(pink, '#000000', 0.2), null, 0.8);
  rlaGlow(g, x + 12 * s * f, y - 6 * s, 3.4 * s, '#ff3a2a', 0.85); rlaEll(g, x + 12 * s * f, y - 6 * s, 0.8 * s, 0.8 * s, '#ffb0a0', false);
  g.strokeStyle = 'rgba(240,230,220,0.5)'; g.lineWidth = 0.3 * s; for (const d of [-1.4, 0, 1.4]) { g.beginPath(); g.moveTo(x + 16 * s * f, y - 3.4 * s); g.lineTo(x + 21 * s * f, y - 3.4 * s + d * s); g.stroke(); }
}
// a puffin in flight facing right (flip mirrors it), centred on (x, y), span about 34 * s; up lifts the wings
function rlaPuffin(g, x, y, s, flip, up) {
  g.save(); g.translate(x, y); g.scale(s * (flip ? -1 : 1), s); up = up == null ? 1 : up;
  rlaPoly(g, [[-2, -2], [-7, -9 * up - 3], [-14, -12 * up - 2], [-9, -3 * up], [-3, 1]], '#121218', null, 0.8);
  rlaPoly(g, [[-7, 2.5], [-11.5, 5], [-10, 6.6], [-5.5, 4]], '#f07a2a', null, 0.5);
  rlaPoly(g, [[-7, -2], [-12, -1], [-7, 2]], '#16161c', null, 0.7);
  rlaEll(g, 0, 0, 9, 4.8, '#18181e', null, 0.9); rlaEll(g, 1.5, 2, 7, 2.8, rlaLin(g, 0, 0, 0, 5, ['#ffffff', '#c8c8c4']), false);
  rlaEll(g, 8, -2.4, 4.4, 4.2, '#18181e', null, 0.9); rlaEll(g, 8.8, -1.6, 3.2, 3, rlaLin(g, 6, -4, 10, 2, ['#ffffff', '#d0d0cc']), false);
  rlaPoly(g, [[11.2, -4.4], [17, -1.2], [11.2, 1.6]], rlaLin(g, 11, -4, 16, 1, ['#ffa040', '#e05a1a']), null, 0.6);
  rlaPoly(g, [[11.2, -4.4], [12.8, -3.4], [12.8, 0.8], [11.2, 1.6]], '#4a5a70', false); g.strokeStyle = '#ffd860'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(14.2, -2.6); g.lineTo(14.2, 0.4); g.stroke();
  rlaEll(g, 9.6, -2.6, 0.9, 0.9, '#d84a2a', false); g.fillStyle = '#0a0a0e'; g.fillRect(9.3, -2.9, 0.6, 0.6);
  rlaPoly(g, [[-1, -1], [3, -9 * up - 3], [9, -13 * up - 2], [7, -4 * up], [2, 1.5]], rlaLin(g, 0, -14, 6, 0, ['#2a2a34', '#0c0c10']), null, 0.8);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.5; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(4, -6 * up, 9 + k * 2.2, -2.4, -1.2); g.stroke(); }
  g.restore();
}
// a kedge anchor, its middle on (x, y), turned rot radians (0 hangs crown down)
function rlaAnchor(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); const iron = rlaLin(g, -10, -16, 10, 16, ['#9aa0ac', '#4a4e58', '#16181e']);
  rlaEll(g, 0, -17.5, 3, 3, false, 'rgba(8,6,10,0.75)', 3.2); rlaEll(g, 0, -17.5, 3, 3, false, '#6a6e78', 1.6);
  rlaLimb(g, [[-9, -11], [9, -11]], 2.4, '#5a3a20'); rlaLimb(g, [[0, -15], [0, 13]], 3.2, '#5a5e68');
  g.lineCap = 'round'; g.strokeStyle = 'rgba(8,6,10,0.75)'; g.lineWidth = 5; g.beginPath(); g.moveTo(-12, 4); g.quadraticCurveTo(-10, 15, 0, 15); g.quadraticCurveTo(10, 15, 12, 4); g.stroke(); g.strokeStyle = iron; g.lineWidth = 3.2; g.stroke();
  for (const sd of [-1, 1]) rlaPoly(g, [[sd * 12, 0], [sd * 15.5, 6.5], [sd * 9.5, 6]], iron, null, 1);
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
  },  // ---- the second 32 (v200): troops ----
  bilgerats(g, R) {
    rlaSky(g, '#2a2234', '#6a4a4a', '#c8805a', 36); rlaSea(g, 36, '#3a3040', '#1a1620', R, 'rgba(255,190,130,0.3)');
    // the bulwark and the deck, a hatch with lamplight down in it, a coil of rope
    rlaPoly(g, [[-2, 46], [-2, 38], [102, 38], [102, 46]], rlaLin(g, 0, 38, 0, 46, ['#8a6a44', '#3a2818']), 'rgba(0,0,0,0.6)');
    g.fillStyle = rlaLin(g, 0, 46, 0, 100, ['#5e4028', '#2a1a10']); g.fillRect(0, 46, 100, 54);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.5; for (let i = 0; i < 7; i++) { const y = 50 + i * i * 0.9 + i * 4; g.beginPath(); g.moveTo(0, y); g.lineTo(100, y); g.stroke(); }
    rlaPoly(g, [[50, 48], [94, 48], [100, 64], [45, 64]], rlaLin(g, 0, 48, 0, 64, ['#8a6a44', '#4a3020']), 'rgba(0,0,0,0.7)');
    rlaPoly(g, [[53.5, 49.6], [90.5, 49.6], [95.5, 62.4], [49, 62.4]], '#0e0906', false); rlaGlow(g, 72, 60, 20, '#ff9a40', 0.6);
    for (let i = 0; i < 3; i++) rlaEll(g, 16, 54 - i * 2, 13 - i * 3, 4.4 - i * 0.9, false, i % 2 ? '#a88a5a' : '#c8aa78', 2);
    // four of them, all teeth and red eyes
    rlaRat(g, 76, 60, 0.7, -1); rlaRat(g, 36, 66, 0.9, -1); rlaRat(g, 74, 84, 1.25, -1); rlaRat(g, 30, 96, 1.5, 1);
  },
  wisp(g, R) {
    rlaSky(g, '#0e1424', '#222a40', '#40384e', 60); rlaStars(g, R, 18, 56);
    g.fillStyle = rlaLin(g, 0, 60, 0, 100, ['#1c2420', '#0a0e0c']); g.fillRect(0, 60, 100, 40);
    // still pools in the marsh with the sky in them, and the wisp's light in the near one
    for (const [x, y, w] of [[30, 68, 22], [70, 82, 28], [16, 92, 14]]) rlaEll(g, x, y, w, w * 0.14, rlaLin(g, 0, y - 3, 0, y + 3, ['#3e4660', '#1a2030']), 'rgba(0,0,0,0.5)', 0.6);
    g.save(); g.globalCompositeOperation = 'lighter'; rlaEll(g, 58, 82, 18, 2.6, rlaRad(g, 58, 82, 0, 18, ['rgba(150,255,220,0.55)', 'rgba(0,0,0,0)']), false); g.restore();
    // reeds and bulrushes either side
    const reed = (x, y, h, lean, head) => { rlaLimb(g, [[x, y], [x + lean * 0.5, y - h * 0.6], [x + lean, y - h]], 0.8, '#1a2418', 'rgba(0,0,0,0.5)'); if (head) rlaEll(g, x + lean * 0.95, y - h * 0.9, 1.1, 3, '#3a2418', 'rgba(0,0,0,0.6)', 0.5, lean * 0.03); };
    for (let i = 0; i < 28; i++) { const x = i < 14 ? R() * 24 : 78 + R() * 24; reed(x, 101, 22 + R() * 30, (R() - 0.5) * 8, R() < 0.4); }
    // two more far off, and the wisp itself, its trail behind it
    rlaGlow(g, 18, 58, 6, '#9affd8', 0.7); rlaGlow(g, 86, 54, 4, '#9affd8', 0.6);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rlaLin(g, 26, 76, 54, 44, ['rgba(120,255,210,0)', 'rgba(160,255,225,0.55)']); g.beginPath(); g.moveTo(48, 39); g.bezierCurveTo(38, 46, 32, 60, 24, 76); g.bezierCurveTo(38, 62, 46, 56, 59, 49); g.closePath(); g.fill(); g.restore();
    rlaGlow(g, 54, 44, 36, '#7affd0', 0.55); rlaGlow(g, 54, 44, 15, '#e0fff4', 1);
    rlaEll(g, 54, 44, 6, 7, rlaRad(g, 53, 42, 0, 7.5, ['#ffffff', '#d0fff2', 'rgba(140,255,220,0.7)']), false);
    rlaSparks(g, 54, 44, 15, 12, '#c8fff0', R);
  },
  shipscat(g, R) {
    rlaSky(g, '#24304a', '#7a6070', '#e0a070', 62); rlaSun(g, 20, 58, 5, '#ffc890'); rlaSea(g, 62, '#3a4458', '#1a2030', R, 'rgba(255,200,150,0.3)');
    // the rail it springs from, a belaying pin in it, and the rat it's after
    rlaPoly(g, [[-2, 100], [-2, 80], [102, 80], [102, 100]], rlaLin(g, 0, 80, 0, 100, ['#6a4a30', '#2a1a10']), 'rgba(0,0,0,0.6)');
    rlaPoly(g, [[-2, 82], [-2, 75], [102, 75], [102, 82]], rlaLin(g, 0, 75, 0, 82, ['#b08458', '#5a3a22']), 'rgba(0,0,0,0.7)');
    rlaLimb(g, [[10, 86], [10, 68]], 2.4, '#8a5a32'); rlaEll(g, 10, 67, 2, 2.6, '#a06a3a');
    rlaRat(g, 88, 75, 0.42, 1);
    // the cat in mid-leap, stretched out, claws first
    const C = '#dc8a3e', D = '#8a4a1a', C2 = rlaMix(C, '#000000', 0.28);
    rlaLimb(g, [[33, 52], [22, 46], [15, 34], [19, 26]], 3.8, C);
    rlaLimb(g, [[38, 56], [27, 63], [16, 68]], 4.8, C2); rlaLimb(g, [[42, 57], [31, 67], [22, 74]], 4.8, C);
    rlaLimb(g, [[62, 50], [72, 54], [82, 50]], 4.2, C2);
    rlaEll(g, 50, 51, 18, 8, rlaLit(g, 32, 43, 68, 59, C, 0.4), null, 1.2, -0.22);
    g.save(); g.beginPath(); g.ellipse(50, 51, 18, 8, -0.22, 0, 6.2832); g.clip(); g.strokeStyle = D; g.lineWidth = 1.8; for (let i = 0; i < 6; i++) { const x = 36 + i * 5.2; g.beginPath(); g.moveTo(x + 2, 40); g.lineTo(x - 1, 51); g.stroke(); } rlaEll(g, 55, 57, 11, 3.2, '#f2e2c8', false, 0, -0.22); g.restore();
    rlaLimb(g, [[63, 46], [73, 43], [85, 39]], 4.2, C);
    g.strokeStyle = '#f8f4ea'; g.lineWidth = 0.6; g.lineCap = 'round'; for (const [x, y] of [[85, 39], [82, 50]]) for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + 1.5, y + k * 1.2); g.lineTo(x + 3.6, y + k * 1.8 - 0.4); g.stroke(); }
    // its head, ears flat, mouth open
    const hx = 71, hy = 38;
    rlaPoly(g, [[hx - 6, hy - 4], [hx - 7, hy - 12], [hx - 1, hy - 7]], C, null, 1); rlaPoly(g, [[hx + 1, hy - 7], [hx + 6, hy - 12], [hx + 6.5, hy - 3]], C, null, 1);
    rlaPoly(g, [[hx - 5.4, hy - 5], [hx - 6, hy - 10], [hx - 2.4, hy - 7]], '#e8a090', false);
    rlaEll(g, hx, hy, 7.6, 7, rlaRad(g, hx - 3, hy - 3, 0, 9, [rlaMix(C, '#fff0d8', 0.4), C, C2]), null, 1.1);
    g.strokeStyle = D; g.lineWidth = 1; for (const dx of [-2, 0, 2]) { g.beginPath(); g.moveTo(hx + dx, hy - 7); g.lineTo(hx + dx * 0.6, hy - 3.6); g.stroke(); }
    rlaEll(g, hx + 3.6, hy + 2.6, 4, 3, '#f2e2c8', false);
    rlaEll(g, hx + 4.4, hy + 4.4, 2.2, 1.6, '#3a1010', false); g.fillStyle = '#ffffff'; rlaPoly(g, [[hx + 3, hy + 3.2], [hx + 3.5, hy + 5], [hx + 4, hy + 3.2]], '#ffffff', false); rlaPoly(g, [[hx + 5, hy + 3.2], [hx + 5.5, hy + 5], [hx + 6, hy + 3.2]], '#ffffff', false);
    for (const ex of [hx - 1.8, hx + 3.4]) { rlaGlow(g, ex, hy - 1, 3.4, '#d0ff60', 0.7); rlaEll(g, ex, hy - 1, 1.5, 1.3, '#e0ff70', 'rgba(0,0,0,0.6)', 0.4); g.fillStyle = '#101008'; g.fillRect(ex - 0.25, hy - 2.1, 0.5, 2.2); }
    rlaEll(g, hx + 6.4, hy + 1, 0.9, 0.7, '#d07a70', false);
    g.strokeStyle = 'rgba(255,250,240,0.6)'; g.lineWidth = 0.3; for (const d of [-1, 0.2, 1.4]) { g.beginPath(); g.moveTo(hx + 6, hy + 2); g.lineTo(hx + 12, hy + 1 + d * 1.6); g.stroke(); }
    g.strokeStyle = 'rgba(255,240,210,0.4)'; g.lineWidth = 0.8; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(8 + i * 3, 40 + i * 7); g.lineTo(20 + i * 3, 40 + i * 7); g.stroke(); }
  },
  puffins(g, R) {
    rlaSky(g, '#3a5a80', '#9ab0c0', '#f0d8b0', 74); rlaSun(g, 82, 70, 4, '#ffe0b0'); rlaSea(g, 74, '#3a6078', '#1a3040', R, 'rgba(255,240,210,0.45)');
    // the stack where they nest, turf on its top
    rlaPoly(g, [[2, 75], [6, 52], [14, 46], [24, 48], [28, 75]], rlaLin(g, 0, 46, 0, 75, ['#6a6058', '#2a2624']), false);
    rlaPoly(g, [[5, 54], [7, 48], [14, 44], [24, 46], [26, 50], [14, 48]], '#5a7a3a', false);
    for (let i = 0; i < 5; i++) rlaEll(g, 8 + R() * 16, 56 + R() * 14, 0.7, 0.9, '#f0ece0', false);
    rlaPuffin(g, 72, 22, 0.95, false, 1.1); rlaPuffin(g, 34, 38, 1.2, false, 0.35); rlaPuffin(g, 58, 62, 1.7, false, 0.9);
    g.fillStyle = 'rgba(255,255,255,0.5)'; for (const x of [40, 52, 64]) rlaEll(g, x, 88, 3, 0.6, 'rgba(255,255,255,0.5)', false);
  },
  fishwives(g, R) {
    rlaSky(g, '#2e3a58', '#8a7080', '#e8a878', 58); rlaSea(g, 58, '#3a4a5e', '#1e2838', R);
    // the quay, and a creel of herring
    g.fillStyle = rlaLin(g, 0, 84, 0, 100, ['#7a6a5a', '#3a3028']); g.fillRect(0, 84, 100, 16); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.6; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 12 + 4, 84); g.lineTo(i * 12 + 2, 100); g.stroke(); }
    for (let i = 0; i < 5; i++) rlaFish(g, 80 + i * 3, 82 + (i % 2), 0.8, -1.3 - i * 0.12);
    rlaPoly(g, [[74, 84], [96, 84], [93, 96], [77, 96]], rlaLit(g, 74, 84, 96, 96, '#8a6a3a', 0.4), null, 1); g.strokeStyle = 'rgba(40,24,10,0.6)'; g.lineWidth = 0.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(75, 87 + i * 3); g.lineTo(95, 87 + i * 3); g.stroke(); }
    // herring flung through the air
    for (const [x, y, a] of [[62, 22, 0.3], [76, 30, -0.2], [88, 16, 0.1]]) { g.strokeStyle = 'rgba(255,240,220,0.4)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x - 14, y + 4); g.lineTo(x - 6, y + 1); g.stroke(); rlaFish(g, x, y, 1.1, a); }
    rlaMan(g, { x: 70, y: 96, s: 0.92, coat: '#5a3a3a', dress: '#3a4a64', skin: '#e0b090', hat: 'bonnet', hatc: '#d8d0c0', item: 'knife', face: -1, pose: 'raise', scarf: '#8a6a4a' });
    rlaMan(g, { x: 34, y: 98, s: 1.15, coat: '#4a5a4a', dress: '#7a3a34', skin: '#e0a888', hat: 'bonnet', hatc: '#ece4d4', item: 'fish', face: 1, pose: 'throw', scarf: '#c8a060' });
  },
  netthrower(g, R) {
    rlaSky(g, '#24324e', '#6a6a88', '#d8a080', 64); rlaSea(g, 64, '#2e4058', '#141e2e', R);
    rlaBank(g, 88, '#3e3a3a', R);
    const m = rlaMan(g, { x: 26, y: 96, s: 1.05, coat: '#5a4a32', legs: '#3a3428', skin: '#d8a880', hat: 'sou', hatc: '#d8b030', face: 1, pose: 'raise', beard: '#6a4a2a', belt: '#2a1e14' });
    // the net opening in the air, lead weights round its rim, the line back to his hand
    const nx = 68, ny = 34, rx = 27, ry = 16, rot = 0.2;
    g.strokeStyle = 'rgba(230,220,190,0.8)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(m.hand[0], m.hand[1]); g.quadraticCurveTo(48, 30, nx - 4, ny + 2); g.stroke();
    g.save(); g.beginPath(); g.ellipse(nx, ny, rx, ry, rot, 0, 6.2832); g.fillStyle = 'rgba(220,210,180,0.14)'; g.fill(); g.clip();
    for (const [col, w] of [['rgba(10,10,16,0.45)', 1.5], ['rgba(236,226,196,0.9)', 0.7]]) { g.strokeStyle = col; g.lineWidth = w; for (let i = -9; i <= 9; i++) { g.beginPath(); g.moveTo(nx + i * 6 - 30, ny - 30); g.lineTo(nx + i * 6 + 30, ny + 30); g.stroke(); g.beginPath(); g.moveTo(nx + i * 6 + 30, ny - 30); g.lineTo(nx + i * 6 - 30, ny + 30); g.stroke(); } }
    g.restore();
    rlaEll(g, nx, ny, rx, ry, false, 'rgba(10,10,16,0.6)', 2.6, rot); rlaEll(g, nx, ny, rx, ry, false, '#f0e4c0', 1.2, rot);
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; rlaEll(g, nx + ex * Math.cos(rot) - ey * Math.sin(rot), ny + ex * Math.sin(rot) + ey * Math.cos(rot), 1.4, 1.4, '#3a3a44', 'rgba(0,0,0,0.7)', 0.5); }
  },
  grenadier(g, R) {
    rlaSky(g, '#2a2236', '#7a4a4a', '#e08a50', 64); rlaSea(g, 64, '#3e3038', '#1a1418', R, 'rgba(255,180,110,0.3)');
    // the last one he threw, bursting out on the rocks
    rlaPoly(g, [[70, 65], [76, 60], [90, 59], [98, 65]], '#2a2026', false);
    rlaPuff(g, 84, 54, 10, 'rgba(120,90,90,0.6)'); rlaGlow(g, 84, 58, 16, '#ffb050', 0.9); rlaSparks(g, 84, 58, 12, 14, '#fff0c0', R);
    rlaBank(g, 86, '#4a3a32', R);
    rlaMan(g, { x: 44, y: 96, s: 1.2, coat: '#a8302a', legs: '#e8e0cc', boots: '#1a1410', skin: '#d8a880', hat: 'mitre', hatc: '#2a2a50', item: 'grenade', face: 1, pose: 'throw', buttons: '#e8c060', belt: '#e8e0cc', lean: -0.2 });
  },
  lobster(g, R) {
    rlaSky(g, '#22304a', '#6a6a80', '#c8a088', 60); rlaSea(g, 60, '#2e4252', '#14202a', R);
    rlaPoly(g, [[-2, 100], [-2, 88], [30, 84], [70, 88], [102, 84], [102, 100]], rlaLin(g, 0, 84, 0, 100, ['#5a5048', '#221c18']), 'rgba(0,0,0,0.6)');
    const C = '#c4442c', C2 = rlaMix(C, '#000000', 0.35), cx = 54;
    // long feelers swept back
    for (const sd of [-1, 1]) rlaLimb(g, rlaBez([cx + sd * 2, 34], [cx + sd * 10, 18], [cx + sd * 24, 6], [cx + sd * 44, 4], 10), 0.9, '#d86040');
    // the fan of his tail on the rock, and its plates up to his body
    for (let i = -2; i <= 2; i++) rlaPoly(g, [[cx + i * 2.6, 88], [cx + i * 6.5 - 3, 97], [cx + i * 6.5 + 3, 97]], rlaLit(g, cx - 14, 88, cx + 14, 97, C, 0.3), null, 0.8);
    for (let i = 0; i < 5; i++) { const y = 86 - i * 5.4, w = 6 + i * 0.9; rlaEll(g, cx, y, w, 3.6, rlaLit(g, cx - w, y - 3, cx + w, y + 3, C, 0.4), null, 1); }
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) rlaLimb(g, [[cx + sd * 6, 60 + i * 3], [cx + sd * (13 + i), 64 + i * 4], [cx + sd * (12 + i * 2), 77 + i * 3]], 1.3, C2);
    // the scallop shell he carries for a shield, glowing at its rim
    const sx = 30, sy = 60, sr = 14; rlaGlow(g, sx, sy - 2, 24, '#ffe0a0', 0.45);
    // the body, the raised claw
    rlaLimb(g, [[cx + 8, 48], [cx + 18, 44], [cx + 22, 32]], 3.4, C);
    { const ex = cx + 22, ey = 32, kx = cx + 24, ky = 22, cr = 7; rlaPoly(g, [[ex - cr * 0.6, ey], [kx - cr, ky - cr * 0.2], [kx - cr * 0.3, ky - cr * 1.5], [kx, ky - cr * 0.5], [kx + cr * 0.4, ky - cr * 1.4], [kx + cr * 0.95, ky - cr * 0.1], [ex + cr * 0.6, ey + cr * 0.2]], rlaLit(g, kx - cr, ky - cr * 1.5, kx + cr, ey, C, 0.45), null, 1.1); }
    rlaEll(g, cx, 52, 10, 14, rlaRad(g, cx - 4, 44, 1, 18, [rlaMix(C, '#fff0d8', 0.4), C, rlaMix(C, '#000000', 0.5)]), null, 1.2);
    g.strokeStyle = 'rgba(40,10,6,0.45)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(cx, 40); g.lineTo(cx, 64); g.stroke(); for (let i = 0; i < 6; i++) rlaEll(g, cx - 4 + (i % 3) * 4, 46 + Math.floor(i / 3) * 8, 0.8, 0.8, 'rgba(255,230,200,0.35)', false);
    rlaPoly(g, [[cx - 5, 41], [cx, 30], [cx + 5, 41]], rlaLit(g, cx - 5, 30, cx + 5, 41, C, 0.4), null, 1);
    for (const sd of [-1, 1]) { rlaLimb(g, [[cx + sd * 2.5, 38], [cx + sd * 4.6, 34]], 0.9, C2, false); rlaEll(g, cx + sd * 4.8, 33.4, 1.5, 1.5, '#100a0c', false); g.fillStyle = '#fff'; g.fillRect(cx + sd * 4.8 - 0.6, 32.6, 0.6, 0.6); }
    rlaLimb(g, [[cx - 8, 50], [cx - 14, 56], [sx + 4, sy + 2]], 3.2, C);
    g.beginPath(); g.moveTo(sx - 4, sy + 10); g.lineTo(sx - sr, sy - 1); g.arc(sx, sy - 1, sr, Math.PI, 0); g.lineTo(sx + 4, sy + 10); g.closePath(); g.fillStyle = rlaRad(g, sx - 4, sy - 8, 1, sr * 1.3, ['#fff4e0', '#e8b890', '#a0603a']); g.fill(); g.strokeStyle = 'rgba(8,6,10,0.75)'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = 'rgba(120,60,30,0.6)'; g.lineWidth = 0.7; for (let i = 1; i < 9; i++) { const a = Math.PI + i / 9 * Math.PI; g.beginPath(); g.moveTo(sx, sy + 9); g.lineTo(sx + Math.cos(a) * sr, sy - 1 + Math.sin(a) * sr); g.stroke(); }
    rlaPoly(g, [[sx - 6, sy + 10], [sx - 5, sy + 6.5], [sx + 5, sy + 6.5], [sx + 6, sy + 10]], '#d8a070', null, 0.8);
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,230,160,0.6)'; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy - 1, sr + 1.6, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.restore();
  },
  petrel(g, R) {
    rlaSky(g, '#161c2a', '#2e3a50', '#5a647e', 66);
    for (let i = 0; i < 9; i++) rlaPuff(g, R() * 100, 4 + R() * 18, 12 + R() * 10, 'rgba(14,18,28,0.8)');
    rlaSea(g, 66, '#1e2c3a', '#0a1218', R, 'rgba(220,240,255,0.35)');
    // the rain, slanting, and a great sea heaving up under it, spray off its crest
    g.strokeStyle = 'rgba(200,220,240,0.22)'; g.lineWidth = 0.5; for (let i = 0; i < 40; i++) { const x = R() * 110, y = R() * 90; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 8); g.stroke(); }
    g.beginPath(); g.moveTo(-2, 101); g.lineTo(-2, 84); g.bezierCurveTo(20, 80, 36, 70, 52, 72); g.bezierCurveTo(64, 73, 72, 82, 86, 84); g.bezierCurveTo(94, 85, 98, 82, 102, 80); g.lineTo(102, 101); g.closePath();
    g.fillStyle = rlaLin(g, 0, 70, 0, 100, ['#3a6070', '#1a3040', '#0a141a']); g.fill(); g.strokeStyle = 'rgba(0,8,12,0.6)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = '#e8f6ff'; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(26, 77); g.bezierCurveTo(36, 71, 44, 70, 52, 72); g.bezierCurveTo(60, 73, 66, 77, 72, 80); g.stroke();
    for (let i = 0; i < 18; i++) rlaEll(g, 34 + R() * 34, 66 + R() * 8, 0.5 + R() * 0.8, 0.5 + R() * 0.8, 'rgba(240,250,255,0.75)', false);
    // the petrel, black, wings swept back like a sickle, feet pattering on the water
    g.save(); g.translate(48, 46); g.scale(1.6, 1.6);
    rlaPoly(g, [[-2, -1], [-7, -9], [-16, -17], [-24, -20], [-12, -5], [-4, 2]], rlaLin(g, -24, -20, 0, 0, ['#2a2c34', '#101216']), null, 0.8);
    g.strokeStyle = '#18181e'; g.lineWidth = 0.5; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(-1 + sd, 2); g.lineTo(sd * 1.5, 13); g.stroke(); rlaPoly(g, [[sd * 1.5 - 1, 13], [sd * 1.5 + 1, 13], [sd * 1.5, 14.4]], '#18181e', false); }
    rlaPoly(g, [[-8, -2], [-13, -2.4], [-13, 2.4], [-8, 2]], '#16181c', null, 0.7);
    rlaEll(g, 0, 0, 9, 3.6, rlaLin(g, 0, -4, 0, 4, ['#3a3c44', '#121418']), null, 0.9); rlaEll(g, -8.6, 0.6, 1.3, 1.3, '#f4f4f0', false);
    rlaEll(g, 8.5, -1.5, 3.4, 3, '#1a1c22', null, 0.8); rlaPoly(g, [[11.4, -2], [14, -1.2], [11.4, -0.4]], '#0a0a0e', false); g.fillStyle = '#e8e8f0'; g.fillRect(9.4, -2.6, 0.6, 0.6);
    rlaPoly(g, [[-1, -1], [3, -9], [10, -17], [22, -21], [11, -7], [3, 1.5]], rlaLin(g, 0, -20, 20, 0, ['#34363e', '#0e1014']), null, 0.8);
    g.strokeStyle = 'rgba(170,170,180,0.55)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(2, -3); g.lineTo(12, -13); g.stroke();
    g.restore();
    rlaBubbles(g, R, 6, 44, 56, 66, 70, 'rgba(240,250,255,0.6)');
  },
  pressgang(g, R) {
    rlaSky(g, '#161a2c', '#3a3448', '#7a5050', 56); rlaStars(g, R, 14, 50); rlaSea(g, 56, '#22263a', '#0e1018', R, 'rgba(255,180,110,0.25)');
    // a tavern wall on the left with its window lit, and the cobbles of the quay
    rlaPoly(g, [[-2, 88], [-2, 18], [24, 24], [24, 88]], rlaLin(g, 0, 18, 24, 88, ['#5a4a40', '#2a2220']), 'rgba(0,0,0,0.6)');
    rlaGlow(g, 12, 48, 28, '#ffa040', 0.5); rlaPoly(g, [[5, 40], [19, 40], [19, 56], [5, 56]], rlaRad(g, 12, 48, 0, 10, ['#fff0b0', '#ffa040']), '#1a1410', 1); g.fillStyle = '#1a1410'; g.fillRect(11.4, 40, 1.2, 16); g.fillRect(5, 47.4, 14, 1.2);
    rlaLimb(g, [[24, 30], [34, 30]], 1, '#1a1410'); rlaPoly(g, [[27, 31], [34, 31], [34, 38], [27, 38]], '#5a3a22', 'rgba(0,0,0,0.6)', 0.6);
    g.fillStyle = rlaLin(g, 0, 84, 0, 100, ['#3e3634', '#1a1616']); g.fillRect(0, 84, 100, 16); for (let i = 0; i < 16; i++) rlaEll(g, R() * 100, 87 + R() * 12, 2.6, 1.2, 'rgba(120,100,90,0.3)', 'rgba(0,0,0,0.3)', 0.4);
    // the sack over the big one's shoulder
    rlaPoly(g, [[70, 36], [78, 28], [90, 30], [96, 40], [92, 52], [82, 54], [74, 48]], rlaLit(g, 70, 28, 96, 54, '#a89070', 0.4), null, 1.1); rlaLimb(g, [[74, 37], [70, 33]], 1.2, '#5a4a30');
    g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(80, 32); g.quadraticCurveTo(84, 42, 82, 52); g.stroke();
    rlaMan(g, { x: 76, y: 96, s: 1.1, coat: '#3a3a2a', legs: '#2a2620', skin: '#c8987a', hat: 'knit', hatc: '#2a2a3a', face: -1, pose: 'stand', beard: '#3a2a1a', long: 1 });
    rlaMan(g, { x: 44, y: 98, s: 1.25, coat: '#4a2e24', legs: '#2a2420', skin: '#d0a07a', hat: 'cap', hatc: '#1e1a18', item: 'cudgel', face: 1, pose: 'raise', beard: '#2a1a10', scarf: '#7a2a20', belt: '#1a1410' });
  },
  siren(g, R) {
    rlaSky(g, '#1e2440', '#6a4a6a', '#d88a7a', 60); rlaSun(g, 82, 58, 6, '#ffb090'); rlaSea(g, 60, '#3a3a58', '#141628', R, 'rgba(255,190,170,0.35)');
    // her rock, weed on it
    rlaPoly(g, [[8, 101], [16, 82], [30, 72], [56, 70], [72, 76], [82, 90], [86, 101]], rlaLin(g, 30, 70, 60, 100, ['#5e5460', '#221c24']), 'rgba(0,0,0,0.6)');
    for (let i = 0; i < 7; i++) rlaEll(g, 22 + R() * 56, 76 + R() * 20, 2.4 + R() * 3, 0.9 + R(), '#2a4a34', false);
    // the long hair behind her
    rlaPoly(g, [[40, 36], [46, 30], [54, 33], [58, 44], [64, 56], [70, 66], [60, 64], [54, 56], [48, 48]], rlaLin(g, 40, 30, 70, 66, ['#b0404a', '#6a1e2a']), null, 1);
    // the tail, curled down over the rock's edge into the sea, its fin
    const tail = rlaBez([50, 68], [64, 80], [44, 94], [24, 88], 18); rlaTube(g, tail, 13, 3, rlaLin(g, 20, 70, 60, 94, ['#6ad8bc', '#2a8a7a', '#124a44']));
    g.strokeStyle = 'rgba(200,255,240,0.45)'; g.lineWidth = 0.5; for (let i = 2; i < 15; i += 1.5) { const [x, y] = tail[Math.floor(i)], r = 2.4 - i * 0.1; g.beginPath(); g.arc(x, y, r, 0.3, 2.8); g.stroke(); }
    rlaPoly(g, [[25, 88], [14, 80], [12, 86], [18, 90], [12, 96], [16, 98], [25, 90]], 'rgba(90,210,190,0.85)', null, 0.9);
    // her body and arms, the shells
    rlaLimb(g, [[45, 50], [38, 60], [34, 70]], 3, '#e0c4b4'); rlaEll(g, 34, 70, 1.8, 1.6, '#e0c4b4');
    rlaPoly(g, [[43, 47], [52, 47], [56, 70], [44, 70]], rlaLit(g, 43, 47, 56, 70, '#e8ccbc', 0.4), null, 1);
    for (const x of [46.2, 51.4]) rlaEll(g, x, 53.6, 2.6, 2.2, rlaLin(g, x, 51, x, 56, ['#fff0e0', '#d89878']), 'rgba(60,20,20,0.6)', 0.5);
    rlaLimb(g, [[51, 49], [58, 46], [63, 40]], 3, '#e8ccbc'); rlaEll(g, 63.4, 39.4, 1.8, 1.6, '#e8ccbc');
    // her head, turned up, singing
    rlaEll(g, 48, 41, 5.4, 5.8, rlaRad(g, 46, 39, 0, 7, ['#fff0e6', '#e8ccbc', '#a8887a']), null, 1);
    rlaEll(g, 51.4, 43.4, 1.2, 1.5, '#5a1a24', false); g.strokeStyle = '#3a1a1a'; g.lineWidth = 0.5; g.beginPath(); g.arc(50.4, 39.6, 1.2, 0.2, 2.6); g.stroke();
    rlaPoly(g, [[42.4, 42], [42.6, 36], [47, 34.6], [52.6, 36], [49, 37], [45, 39.4], [44.6, 46]], '#b0404a', false);
    // her song, rings of light going out over the race
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; for (let k = 0; k < 4; k++) { g.strokeStyle = 'rgba(225,195,255,' + (0.7 - k * 0.13) + ')'; g.lineWidth = 1.4; g.beginPath(); g.arc(53, 42, 9 + k * 8, -1.1, 0.25); g.stroke(); } g.restore();
    for (const [x, y] of [[72, 22], [84, 32], [78, 12], [90, 20]]) { rlaGlow(g, x, y, 4, '#e8d0ff', 0.9); rlaEll(g, x, y, 0.9, 0.9, '#ffffff', false); }
  },
  surgeon(g, R) {
    rlaSky(g, '#22304a', '#6a6a7a', '#c8a888', 62); rlaSea(g, 62, '#2e3e52', '#141e2c', R);
    rlaBank(g, 88, '#3a3a3e', R);
    // the mending about him: a ring of light on the rock, motes rising
    g.save(); g.globalCompositeOperation = 'lighter'; rlaEll(g, 50, 92, 38, 6, rlaRad(g, 50, 92, 0, 38, ['rgba(160,255,150,0.45)', 'rgba(0,0,0,0)']), false); rlaEll(g, 50, 92, 36, 5.4, false, 'rgba(190,255,170,0.6)', 0.8); g.restore();
    const m = rlaMan(g, { x: 48, y: 96, s: 1.2, coat: '#262830', legs: '#1e1e24', skin: '#e0b48c', hat: 'tophat', item: 'vial', item2: 'bag', face: 1, pose: 'raise', long: 1, scarf: '#ece8e0', buttons: '#c8a050' });
    // his spectacles
    const [hx, hy] = m.head; g.strokeStyle = '#e8d8a0'; g.lineWidth = 0.5; g.beginPath(); g.arc(hx + m.hr * 0.5, hy - m.hr * 0.05, m.hr * 0.3, 0, 6.2832); g.stroke(); g.beginPath(); g.moveTo(hx + m.hr * 0.2, hy - m.hr * 0.05); g.lineTo(hx - m.hr * 0.5, hy - m.hr * 0.2); g.stroke();
    for (let i = 0; i < 16; i++) { const x = 18 + R() * 64, y = 30 + R() * 58; rlaGlow(g, x, y, 2.6, '#c8ffb0', 0.9); g.strokeStyle = 'rgba(220,255,200,0.7)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x - 1.4, y); g.lineTo(x + 1.4, y); g.moveTo(x, y - 1.4); g.lineTo(x, y + 1.4); g.stroke(); }
  },
  rocketcrew(g, R) {
    rlaSky(g, '#1e2440', '#5a4a68', '#d0806a', 66); rlaStars(g, R, 12, 40); rlaSea(g, 66, '#2e3448', '#121624', R);
    rlaFarLight(g, 88, 66, 1.0, '#1a1c2a', '#ffe0a0');
    rlaBank(g, 86, '#3a3434', R);
    // the rocket's trail and the line it pays out, from the frame to high over the race
    for (let i = 0; i < 9; i++) { const t = i / 9, x = 58 + t * 22, y = 68 - Math.sin(t * 1.4) * 54; rlaPuff(g, x, y, 4 + (1 - t) * 5, 'rgba(220,210,220,0.4)'); }
    g.strokeStyle = 'rgba(255,220,170,0.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(58, 68); g.quadraticCurveTo(66, 30, 78, 18); g.stroke();
    g.strokeStyle = '#d8c8a0'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(66, 88); g.quadraticCurveTo(70, 40, 77, 19); g.stroke();
    g.save(); g.translate(80, 15); g.rotate(-0.85);
    rlaGlow(g, -8, 0, 12, '#ffb040', 1); rlaPoly(g, [[-6, -1.6], [-14, 0], [-6, 1.6]], '#fff0b0', false);
    rlaPoly(g, [[-6, -2.4], [5, -2.4], [5, 2.4], [-6, 2.4]], rlaLin(g, 0, -2.4, 0, 2.4, ['#e8e0d0', '#a89a88', '#5a4e44']), null, 0.8);
    rlaPoly(g, [[5, -2.4], [10, 0], [5, 2.4]], '#c03a2a', null, 0.8); rlaLimb(g, [[-6, 0], [-20, 0]], 0.8, '#6a4a2a');
    g.restore();
    // the iron trough on its legs, the box of line
    rlaLimb(g, [[54, 76], [44, 88]], 1.4, '#3a3a40'); rlaLimb(g, [[56, 74], [64, 88]], 1.4, '#3a3a40'); rlaLimb(g, [[48, 86], [60, 66]], 2.8, '#4a4a54');
    rlaGlow(g, 58, 68, 10, '#ff9a40', 0.7);
    rlaPoly(g, [[62, 84], [74, 84], [74, 92], [62, 92]], rlaLit(g, 62, 84, 74, 92, '#6a4a2a', 0.4), null, 0.9); for (let i = 0; i < 3; i++) rlaEll(g, 68, 84 - i * 0.8, 5 - i, 1.4, false, '#d8c8a0', 0.7);
    rlaMan(g, { x: 30, y: 96, s: 1.0, coat: '#2a3450', legs: '#1e2230', skin: '#d8a880', hat: 'sou', hatc: '#e0b830', item: 'linstock', face: 1, pose: 'aim', belt: '#1a1a20', beard: '#5a3a20' });
  },
  anchorman(g, R) {
    rlaSky(g, '#24304c', '#7a6a80', '#e0a07a', 62); rlaSea(g, 62, '#34465c', '#16202e', R);
    rlaBank(g, 88, '#403a38', R);
    // the swing: a blur round her
    const blur = (a0, a1) => { g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; for (let k = 0; k < 3; k++) { g.strokeStyle = 'rgba(220,230,255,' + (0.4 - k * 0.11) + ')'; g.lineWidth = 3.2 - k; g.beginPath(); g.ellipse(48, 54, 38 - k * 4, 13 - k * 1.2, -0.12, a0, a1); g.stroke(); } g.restore(); };
    blur(Math.PI * 1.05, Math.PI * 1.9);
    const m = rlaMan(g, { x: 44, y: 96, s: 1.2, coat: '#2a3a5a', stripe: '#e0dcd0', dress: '#5a3a3a', skin: '#e0a888', hat: 'knit', hatc: '#8a2a2a', face: 1, pose: 'reach', scarf: '#c8a060' });
    blur(Math.PI * 0.15, Math.PI * 0.9);
    // the chain, and the anchor flying out on the end of it
    const ax = 70, ay = 46, [hx, hy] = m.hand, n = 7;
    for (let i = 0; i <= n; i++) { const t = i / n, x = hx + (ax - 4 - hx) * t, y = hy + (ay - hy) * t; rlaEll(g, x, y, i % 2 ? 1.8 : 1.1, i % 2 ? 1.1 : 1.8, false, 'rgba(8,6,10,0.7)', 1.6, -0.2); rlaEll(g, x, y, i % 2 ? 1.8 : 1.1, i % 2 ? 1.1 : 1.8, false, '#8a8e98', 0.8, -0.2); }
    g.strokeStyle = 'rgba(230,236,255,0.5)'; g.lineWidth = 0.8; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(48, 54, 36 + i * 2.5, -0.95, -0.35); g.stroke(); }
    rlaAnchor(g, ax + 15.5, ay - 0.6, 0.85, -1.53);
  },
  seaeagle(g, R) {
    rlaSky(g, '#2a3a5a', '#8a8090', '#e8b888', 72); rlaSun(g, 16, 66, 5, '#ffd8a8'); rlaSea(g, 72, '#3a4a60', '#18222e', R);
    rlaPoly(g, [[70, 73], [76, 62], [88, 58], [102, 60], [102, 73]], '#2a2a34', false);
    // its wings across the whole sky, fingered at the tips
    const wing = sd => { rlaPoly(g, [[50 + sd * 5, 42], [50 + sd * 16, 26], [50 + sd * 30, 17], [50 + sd * 43, 14], [50 + sd * 48, 18], [50 + sd * 45, 22], [50 + sd * 49, 25], [50 + sd * 44, 28], [50 + sd * 47, 32], [50 + sd * 41, 34], [50 + sd * 42, 38], [50 + sd * 35, 40], [50 + sd * 24, 46], [50 + sd * 8, 54]], rlaLin(g, 50, 14, 50 + sd * 46, 50, ['#8a6a44', '#3a2818']), null, 1.1);
      g.strokeStyle = 'rgba(20,10,4,0.45)'; g.lineWidth = 0.6; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(50 + sd * (12 + k * 5), 44 - k * 2); g.lineTo(50 + sd * (22 + k * 5), 26 - k); g.stroke(); }
      g.strokeStyle = 'rgba(255,230,190,0.25)'; g.beginPath(); g.moveTo(50 + sd * 8, 42); g.lineTo(50 + sd * 30, 20); g.stroke(); };
    wing(-1); wing(1);
    rlaPoly(g, [[44, 60], [56, 60], [61, 76], [50, 79], [39, 76]], rlaLin(g, 50, 60, 50, 79, ['#ffffff', '#d8d4c8']), null, 1);
    rlaEll(g, 50, 52, 8.5, 12, rlaRad(g, 47, 46, 1, 14, ['#8a6a44', '#5a4028', '#2a1c10']), null, 1.1);
    // its talons, thrown forward
    for (const sd of [-1, 1]) { rlaLimb(g, [[50 + sd * 4, 60], [50 + sd * 6, 68]], 2.6, '#e8c040'); for (let k = -1; k <= 1; k++) rlaLimb(g, [[50 + sd * 6, 68], [50 + sd * 6 + k * 2.4, 72]], 1, '#1a1410', false); }
    // the head, pale, the great hooked beak
    rlaEll(g, 50, 36, 6.4, 6.8, rlaRad(g, 48, 33, 0, 8, ['#f4ead4', '#d0bc98', '#8a7458']), null, 1);
    rlaPoly(g, [[49, 37], [55, 36], [58, 40], [56, 44], [55, 41], [50, 41]], rlaLin(g, 49, 36, 58, 44, ['#ffe070', '#d89a20']), null, 0.8);
    for (const ex of [46.6, 53.4]) { rlaEll(g, ex, 34.6, 1.3, 1.1, '#f0c030', false); g.fillStyle = '#0a0806'; g.fillRect(ex - 0.4, 34.2, 0.8, 0.8); }
    g.strokeStyle = 'rgba(40,24,10,0.8)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(44.6, 33); g.lineTo(48.4, 34); g.moveTo(55.4, 33); g.lineTo(51.6, 34); g.stroke();
  },
  wreckerchief(g, R) {
    rlaSky(g, '#140e1c', '#3a1e2a', '#8a3a30', 62); rlaStars(g, R, 14, 40); rlaSea(g, 62, '#2a1a22', '#0c080c', R, 'rgba(255,160,90,0.3)');
    // his gang behind him, torches up
    for (const [x, s, f, it] of [[14, 0.6, 1, 'pole'], [86, 0.6, -1, 'pole'], [28, 0.5, 1, 'crowbar'], [72, 0.5, -1, 'crowbar']]) rlaMan(g, { x, y: 86, s, coat: '#1a1416', legs: '#120e10', skin: '#5a4440', hat: R() < 0.5 ? 'knit' : 'tricorn', hatc: '#120e10', item: it, face: f, pose: 'raise' });
    rlaBank(g, 84, '#2e2626', R);
    rlaGlow(g, 50, 58, 44, '#ff8a3a', 0.3);
    rlaMan(g, { x: 50, y: 98, s: 1.35, coat: '#4a2e1e', legs: '#221a14', skin: '#c8987a', hat: 'tricorn', hatc: '#16121a', item: 'cutlass', item2: 'lantern', face: 1, pose: 'raise', long: 1, beard: '#16120e', scarf: '#a82a20', belt: '#1a1410', buttons: '#d8b050' });
    rlaSparks(g, 84, 16, 7, 8, '#ffffff', R); rlaGlow(g, 84, 17, 6, '#ffffff', 0.6);
  },
  smugglers(g, R) {
    rlaSky(g, '#141a30', '#34385a', '#7a6478', 62); rlaStars(g, R, 26, 56); rlaMoon(g, 80, 18, 6); rlaSea(g, 62, '#262c44', '#0c0e18', R, 'rgba(220,230,255,0.35)');
    // the lugger lying off, her lugsails dark against the sky
    rlaPoly(g, [[14, 62], [16, 58], [44, 58], [48, 62]], '#0e0e16', false); g.fillStyle = '#0e0e16'; g.fillRect(24, 36, 0.8, 22); g.fillRect(38, 42, 0.8, 16);
    rlaPoly(g, [[18, 38], [30, 34], [32, 56], [17, 56]], 'rgba(20,20,32,0.95)', false); rlaPoly(g, [[34, 44], [44, 41], [46, 56], [33, 56]], 'rgba(20,20,32,0.95)', false);
    // the shingle, a rowing boat drawn up on it
    rlaPoly(g, [[-2, 101], [-2, 80], [40, 76], [102, 80], [102, 101]], rlaLin(g, 0, 76, 0, 100, ['#5a5058', '#22202a']), 'rgba(0,0,0,0.6)');
    for (let i = 0; i < 14; i++) rlaEll(g, R() * 100, 82 + R() * 16, 1 + R() * 1.6, 0.7 + R() * 0.8, 'rgba(160,150,170,0.35)', false);
    rlaPoly(g, [[66, 80], [94, 78], [90, 84], [70, 85]], rlaLin(g, 0, 78, 0, 85, ['#6a5040', '#2a1e18']), 'rgba(0,0,0,0.6)', 0.8);
    rlaMan(g, { x: 16, y: 94, s: 0.64, coat: '#3a3a48', legs: '#22222a', skin: '#c8a090', hat: 'knit', hatc: '#5a2a2a', item: 'keg', face: 1, pose: 'carry' });
    rlaMan(g, { x: 84, y: 95, s: 0.68, coat: '#2e3a3a', legs: '#20242a', skin: '#c8a090', hat: 'knit', hatc: '#2a3a5a', item: 'knife', face: -1, pose: 'reach', beard: '#2a1e18' });
    rlaMan(g, { x: 64, y: 98, s: 0.78, coat: '#42343a', legs: '#22222a', skin: '#d0a890', hat: 'cap', hatc: '#1e1a1e', item: 'keg', face: -1, pose: 'carry', scarf: '#6a5a3a' });
    rlaMan(g, { x: 38, y: 99, s: 0.84, coat: '#2a2e3e', legs: '#1a1c24', skin: '#d0a890', hat: 'bandana', hatc: '#2a2a3a', item: 'knife', face: 1, pose: 'reach', beard: '#3a2a20' });
  },
  crabmother(g, R) {
    rlaSky(g, '#2a3450', '#7a7488', '#d8b090', 48); rlaSea(g, 48, '#3a5060', '#1e3040', R);
    rlaPoly(g, [[-2, 101], [-2, 58], [30, 54], [70, 56], [102, 52], [102, 101]], rlaLin(g, 0, 52, 0, 100, ['#b09a78', '#5a4a38']), false);
    rlaPoly(g, [[-2, 58], [30, 54], [70, 56], [102, 52], [102, 55], [70, 59], [30, 57], [-2, 61]], 'rgba(255,255,255,0.45)', false);
    // eggs heaped under her, then the mother herself
    for (let i = 0; i < 40; i++) { const a = R() * 6.283, d = Math.sqrt(R()) * 1; rlaEll(g, 50 + Math.cos(a) * d * 18, 80 + Math.sin(a) * d * 5, 1.5, 1.5, rlaRad(g, 50 + Math.cos(a) * d * 18 - 0.5, 80 + Math.sin(a) * d * 5 - 0.5, 0, 2, ['#ffd8a0', '#e8702a']), 'rgba(60,20,0,0.5)', 0.3); }
    rlaCrab(g, 50, 62, 1.7, '#b86a32', { wide: 1, claw: 1.05 });
    g.strokeStyle = 'rgba(70,30,10,0.7)'; g.lineWidth = 0.7; for (let i = 0; i < 9; i++) { const a = 3.5 + i * 0.27; g.beginPath(); g.arc(50 + Math.cos(a) * 21, 62 + Math.sin(a) * 13.5, 1.6, a - 1.3, a + 1.3); g.stroke(); }
    // her brood, scattering
    const at = [[14, 74, 0.34], [86, 72, 0.34], [24, 90, 0.42], [76, 90, 0.42], [50, 94, 0.38], [8, 92, 0.3], [92, 88, 0.3], [36, 98, 0.3]];
    for (const [x, y, s] of at) rlaCrab(g, x, y, s, R() < 0.5 ? '#d8582a' : '#c84a28');
  },
  krakenarm(g, R) {
    rlaSky(g, '#121a2a', '#2e3448', '#5a4a58', 68); rlaSea(g, 68, '#1e2a38', '#0a1018', R, 'rgba(200,230,255,0.3)');
    // the arm, up out of the race and curling over at the top
    const spine = rlaBez([58, 104], [72, 62], [38, 44], [54, 20], 24).concat(rlaBez([54, 20], [60, 6], [82, 10], [78, 26], 12).slice(1));
    const T = rlaTube(g, spine, 26, 3, rlaLin(g, 30, 10, 80, 100, ['#c05a74', '#7a2a46', '#2a0e1a']), 'rgba(10,2,6,0.75)');
    g.strokeStyle = 'rgba(255,200,210,0.35)'; g.lineWidth = 1.2; g.beginPath(); T.L.slice(2, -3).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    for (let i = 1; i < spine.length - 2; i++) { const p = spine[i], q = T.R[i], r = T.W[i] * 0.38; rlaEll(g, p[0] + (q[0] - p[0]) * 0.55, p[1] + (q[1] - p[1]) * 0.55, r, r, rlaRad(g, p[0] + (q[0] - p[0]) * 0.55, p[1] + (q[1] - p[1]) * 0.55, 0, r, ['#5a1a2a', '#e8b0b8', '#f8d8d8']), 'rgba(60,10,20,0.6)', 0.5); }
    // a gig it has flung up, oars every way
    g.save(); g.translate(26, 32); g.rotate(-0.7); rlaPoly(g, [[-9, -1], [9, -1], [6, 3.6], [-6, 3.6]], rlaLin(g, 0, -1, 0, 4, ['#8a6040', '#3a2414']), 'rgba(0,0,0,0.7)', 0.8); rlaLimb(g, [[-4, 0], [-12, -6]], 0.8, '#a88458'); rlaLimb(g, [[4, 0], [10, 7]], 0.8, '#a88458'); g.restore();
    rlaBubbles(g, R, 8, 14, 40, 22, 46, 'rgba(230,245,255,0.6)');
    // under the surface it goes dim, white water boiling round it
    g.fillStyle = rlaLin(g, 0, 70, 0, 100, ['rgba(20,32,46,0.35)', 'rgba(8,14,22,0.8)']); g.fillRect(0, 70, 100, 30);
    for (let i = 0; i < 12; i++) rlaEll(g, 40 + R() * 40, 68 + R() * 8, 2 + R() * 5, 0.8 + R() * 1.2, 'rgba(235,248,255,0.7)', false);
    rlaEll(g, 60, 76, 26, 4, false, 'rgba(220,240,255,0.4)', 0.8);
  },
  stormcaller(g, R) {
    rlaSky(g, '#10141e', '#262c3e', '#4a4a5a', 64);
    for (let i = 0; i < 12; i++) rlaPuff(g, R() * 100, 2 + R() * 20, 12 + R() * 12, 'rgba(12,14,22,0.85)');
    rlaSea(g, 64, '#1a2030', '#080c12', R, 'rgba(200,220,255,0.35)');
    rlaBank(g, 86, '#2a2a30', R);
    const m = rlaMan(g, { x: 30, y: 96, s: 1.15, coat: '#3e3646', dress: '#2a2a36', skin: '#d0b0a0', hat: 'hood', hatc: '#4e3e50', item: 'cord', face: 1, pose: 'raise', scarf: '#7a6a8a' });
    // her lightning, leaping from the cord to one and on to two more
    const p0 = [m.hand[0] + 1, m.hand[1] - 1], a = [74, 54], b = [92, 72], c = [62, 80];
    rlaGlow(g, p0[0], p0[1], 14, '#b8d0ff', 0.9);
    rlaZig(g, p0, a, 1.4, R); rlaZig(g, a, b, 1.1, R); rlaZig(g, a, c, 1.1, R);
  },
  // ---- the second 32: spells ----
  tidepull(g, R) {
    rlaSky(g, '#0e0a22', '#22184a', '#3e2a62', 44); rlaStars(g, R, 24, 44); rlaMoon(g, 50, 15, 8);
    rlaSea(g, 44, '#241c48', '#0a0818', R, 'rgba(220,210,255,0.3)');
    // the moon's pull, a column of light down to the middle of the circle
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.14; g.fillStyle = '#d8d0ff'; g.beginPath(); g.moveTo(45, 24); g.lineTo(55, 24); g.lineTo(68, 74); g.lineTo(32, 74); g.closePath(); g.fill(); g.restore();
    // the water drawn in on itself, streaks spiralling to the middle
    const cx = 50, cy = 74; rlaEll(g, cx, cy, 44, 14, rlaRad(g, cx, cy, 0, 44, ['rgba(10,6,26,0.7)', 'rgba(30,22,70,0.3)', 'rgba(0,0,0,0)']), false);
    g.lineCap = 'round'; for (let i = 0; i < 16; i++) { const a0 = i / 16 * 6.2832; g.strokeStyle = 'rgba(225,215,255,0.65)'; g.lineWidth = 1.1; g.beginPath(); for (let t = 0; t <= 1.001; t += 0.1) { const r = 42 * (1 - t * 0.85), a = a0 + t * 1.1, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.32; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    rlaEll(g, cx, cy, 43, 13.8, false, 'rgba(220,210,255,0.45)', 0.8);
    // three walkers dragged in, leaning back against it
    for (const [x, y, f] of [[20, 76, 1], [80, 72, -1], [64, 86, -1]]) { g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - f * 8, y); g.lineTo(x, y); g.stroke(); rlaMan(g, { x, y, s: 0.3, coat: '#3a3050', legs: '#221c30', skin: '#b8a0b0', hat: 'cap', hatc: '#1a1424', face: f, pose: 'run', lean: -0.8 }); }
    rlaGlow(g, cx, cy, 14, '#e8e0ff', 0.9); rlaEll(g, cx, cy, 2, 0.8, '#ffffff', false);
  },
  lampoil(g, R) {
    rlaSky(g, '#120c26', '#2a1c4e', '#3e2c5e', 78); rlaStars(g, R, 26, 70); rlaSea(g, 78, '#22183e', '#0a0818', R, 'rgba(255,220,150,0.35)');
    // the ring of mending on the water
    g.save(); g.globalCompositeOperation = 'lighter'; rlaEll(g, 54, 88, 38, 6.5, rlaRad(g, 54, 88, 0, 38, ['rgba(255,210,120,0.5)', 'rgba(0,0,0,0)']), false); rlaEll(g, 54, 88, 36, 6, false, 'rgba(255,220,140,0.6)', 0.8); g.restore();
    // the feeder can, tipped, its long spout pouring
    g.save(); g.translate(22, 26); g.rotate(0.55);
    rlaPoly(g, [[9, -3], [26, -9], [26.5, -7.5], [9, 1]], rlaLin(g, 0, -9, 0, 1, ['#ffe8a0', '#a8761e']), null, 0.8);
    rlaPoly(g, [[-9, -8], [9, -8], [10, 9], [-10, 9]], rlaLit(g, -10, -8, 10, 9, '#c8902a', 0.45), null, 1.1);
    g.strokeStyle = 'rgba(80,50,10,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-9.4, -2); g.lineTo(9.4, -2); g.moveTo(-9.8, 4); g.lineTo(9.8, 4); g.stroke();
    rlaEll(g, 0, -8, 9, 2, '#e0b050', null, 0.8); rlaLimb(g, [[-9, -5], [-15, -3], [-14, 5], [-9.6, 6]], 1.6, '#8a6018');
    g.restore();
    const [tx, ty] = [22 + Math.cos(0.55) * 26.5 - Math.sin(0.55) * -8, 26 + Math.sin(0.55) * 26.5 + Math.cos(0.55) * -8];
    g.strokeStyle = 'rgba(8,6,10,0.6)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + 6, ty + 4, 58, 36); g.stroke(); g.strokeStyle = rlaLin(g, tx, ty, 58, 36, ['#ffe080', '#ffb830']); g.lineWidth = 1.8; g.stroke();
    // the great drop of oil, glowing
    rlaGlow(g, 60, 52, 34, '#ffb840', 0.6); rlaDrop(g, 60, 56, 14, '#ffbe3a');
    for (let i = 0; i < 12; i++) { const x = 20 + R() * 70, y = 50 + R() * 38; rlaGlow(g, x, y, 2.4, '#ffe0a0', 0.9); rlaEll(g, x, y, 0.5, 0.5, '#fff8e0', false); }
  },
  fairwind(g, R) {
    rlaSky(g, '#100a26', '#261a50', '#4a3470', 80); rlaStars(g, R, 26, 72); rlaSea(g, 80, '#241a44', '#0a0818', R, 'rgba(230,220,255,0.35)');
    // the wind behind, then a sail bellied full of it
    const stream = (y, len, curl, w, a) => { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(220,210,255,' + a + ')'; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(-4, y); g.bezierCurveTo(len * 0.3, y - 6, len * 0.6, y + 6, len, y); if (curl) { g.arc(len, y - curl, curl, Math.PI * 0.5, Math.PI * 2.1, true); } g.stroke(); g.restore(); };
    stream(22, 34, 4, 1.4, 0.55); stream(46, 30, 5, 1.8, 0.6); stream(68, 26, 0, 1.2, 0.45);
    rlaPoly(g, [[52, 84], [92, 84], [86, 92], [56, 92]], rlaLin(g, 0, 84, 0, 92, ['#5a4030', '#22160e']), 'rgba(0,0,0,0.7)');
    rlaLimb(g, [[70, 88], [70, 6]], 2.2, '#4a3424'); rlaLimb(g, [[46, 14], [94, 12]], 1.6, '#4a3424'); rlaLimb(g, [[48, 66], [92, 64]], 1.4, '#4a3424');
    g.beginPath(); g.moveTo(48, 15); g.lineTo(92, 13); g.bezierCurveTo(104, 30, 104, 50, 90, 64); g.lineTo(50, 66); g.bezierCurveTo(60, 50, 60, 30, 48, 15); g.closePath();
    g.fillStyle = rlaLin(g, 50, 0, 100, 0, ['#8a8098', '#e8e0d8', '#fff8ec', '#c8bcb0']); g.fill(); g.strokeStyle = 'rgba(8,6,10,0.75)'; g.lineWidth = 1.1; g.stroke();
    g.strokeStyle = 'rgba(80,60,60,0.35)'; g.lineWidth = 0.6; for (let i = 1; i < 5; i++) { const x0 = 48 + i * 9, x1 = 50 + i * 8; g.beginPath(); g.moveTo(x0, 15 - i * 0.4); g.quadraticCurveTo(x0 + 6 + i * 2, 40, x1, 65.6 - i * 0.4); g.stroke(); }
    stream(10, 46, 0, 1.2, 0.5); stream(34, 50, 5, 2.2, 0.7); stream(58, 44, 4, 1.6, 0.6);
    rlaSparks(g, 30, 40, 26, 12, '#e8e0ff', R);
  },
  brinerain(g, R) {
    rlaSky(g, '#0c0a1e', '#1e1a3c', '#34285a', 80); rlaSea(g, 80, '#1e1a3a', '#08070e', R, 'rgba(180,240,255,0.3)');
    // the cloud, heavy and low, lit from inside
    rlaGlow(g, 50, 18, 34, '#8a7ac8', 0.35);
    for (let i = 0; i < 16; i++) { const x = R() * 110 - 5, y = 6 + R() * 18, r = 10 + R() * 12; g.fillStyle = rlaRad(g, x - r * 0.3, y - r * 0.4, 0, r, ['rgba(110,96,160,0.95)', 'rgba(50,40,90,0.9)', 'rgba(30,24,60,0)']); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    // the rain, slanting and stinging
    g.lineCap = 'round'; for (let i = 0; i < 90; i++) { const x = R() * 112 - 6, y = 24 + R() * 66, l = 5 + R() * 6; g.strokeStyle = R() < 0.2 ? 'rgba(200,255,250,0.9)' : 'rgba(160,220,255,0.45)'; g.lineWidth = 0.5 + R() * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.35, y + l); g.stroke(); }
    for (let i = 0; i < 10; i++) rlaGlow(g, R() * 100, 30 + R() * 50, 2.2, '#a0fff0', 0.8);
    // where it strikes the sea
    for (let i = 0; i < 14; i++) { const x = R() * 100, y = 82 + R() * 16; rlaEll(g, x, y, 2 + R() * 2, 0.6 + R() * 0.4, false, 'rgba(200,250,255,0.55)', 0.5); g.strokeStyle = 'rgba(220,255,255,0.6)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x - 1, y); g.lineTo(x - 1.6, y - 2); g.moveTo(x + 1, y); g.lineTo(x + 1.6, y - 2); g.stroke(); }
  },
  shipwreck(g, R) {
    rlaSky(g, '#0e0a22', '#22184a', '#40306a', 76); rlaStars(g, R, 20, 70); rlaSea(g, 76, '#221a42', '#0a0818', R, 'rgba(230,220,255,0.35)');
    // the rush of its fall
    g.strokeStyle = 'rgba(220,210,255,0.4)'; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { g.lineWidth = 0.8; const o = (i - 2.5) * 5; g.beginPath(); g.moveTo(4 + o, 2 - o * 0.6); g.lineTo(26 + o, 22 - o * 0.6); g.stroke(); }
    // the hulk coming down bow first, a stump of mast and rags of sail
    g.save(); g.translate(44, 44); g.rotate(0.72);
    rlaLimb(g, [[-4, -6], [-6, -24]], 1.8, '#3a2818'); rlaPoly(g, [[-6, -22], [6, -20], [4, -14], [7, -10], [-4, -10]], 'rgba(200,190,170,0.85)', null, 0.7);
    rlaLimb(g, [[-18, -6], [-19, -16]], 1.4, '#3a2818');
    rlaPoly(g, [[-30, -7], [22, -7], [33, -3], [22, 9], [-26, 9]], rlaLit(g, -30, -7, 30, 9, '#7a5234', 0.4), null, 1.2);
    g.strokeStyle = 'rgba(30,16,8,0.55)'; g.lineWidth = 0.6; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-28, -3 + k * 3.4); g.lineTo(26 - k * 1.5, -3 + k * 3.4); g.stroke(); }
    g.fillStyle = '#1a1008'; for (let k = 0; k < 5; k++) g.fillRect(-20 + k * 9, -4.6, 2.4, 2);
    rlaPoly(g, [[-30, -7], [-30, -10], [20, -10], [22, -7]], '#4a3020', null, 0.7);
    g.restore();
    // the splash it throws up where it strikes
    const sx = 68, sy = 80; rlaGlow(g, sx, sy - 4, 20, '#c8c0ff', 0.6);
    for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.08 + i * 0.105), l = 12 + R() * 14; rlaPoly(g, [[sx + Math.cos(a - 0.1) * 6, sy + Math.sin(a - 0.1) * 3], [sx + Math.cos(a) * l, sy + Math.sin(a) * l], [sx + Math.cos(a + 0.1) * 6, sy + Math.sin(a + 0.1) * 3]], 'rgba(236,232,255,0.85)', false); }
    rlaEll(g, sx, sy, 22, 4, false, 'rgba(220,214,255,0.6)', 1); rlaEll(g, sx, sy, 32, 6, false, 'rgba(220,214,255,0.3)', 0.8);
    for (let i = 0; i < 16; i++) rlaEll(g, sx - 20 + R() * 40, sy - 30 + R() * 26, 0.6 + R(), 0.6 + R(), 'rgba(240,236,255,0.8)', false);
    for (let i = 0; i < 5; i++) { const x = sx - 26 + R() * 52, y = sy - 26 + R() * 18; g.save(); g.translate(x, y); g.rotate(R() * 3); rlaPoly(g, [[-3.4, -0.8], [3.4, -1], [3.4, 1], [-3.4, 0.8]], '#6a4428', 'rgba(0,0,0,0.6)', 0.5); g.restore(); }
  },
  whirlpool(g, R) {
    rlaSky(g, '#0e0a22', '#22184a', '#3a2a62', 30); rlaStars(g, R, 14, 30);
    g.fillStyle = rlaLin(g, 0, 30, 0, 100, ['#2e2456', '#140e2a']); g.fillRect(0, 30, 100, 70);
    const cx = 50, cy = 68;
    // the funnel, darker ring by ring to its eye
    for (let k = 9; k >= 1; k--) rlaEll(g, cx + (9 - k) * 0.4, cy + (9 - k) * 0.5, k * 5.4, k * 2.3, rlaMix('#3e3274', '#05030c', 1 - k / 9), false);
    // foam streaming round in a spiral
    g.lineCap = 'round'; for (let arm = 0; arm < 6; arm++) for (let t = 0; t < 1; t += 0.025) { const a0 = arm / 6 * 6.2832 + t * 6, a1 = a0 + 0.15, r0 = 50 * (1 - t) + 2, r1 = 50 * (1 - t - 0.025) + 2; g.strokeStyle = 'rgba(230,224,255,' + (0.75 * (1 - t) + 0.1) + ')'; g.lineWidth = 2 * (1 - t) + 0.4; g.beginPath(); g.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0 * 0.42); g.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1 * 0.42); g.stroke(); }
    rlaGlow(g, cx + 3, cy + 4, 12, '#b88aff', 0.8);
    // a boat caught on its rim, heeled over
    g.save(); g.translate(20, 58); g.rotate(-0.4); rlaPoly(g, [[-7, -1], [7, -1], [5, 3], [-5, 3]], '#3a2818', 'rgba(0,0,0,0.7)', 0.7); g.fillStyle = '#2a1e14'; g.fillRect(-0.4, -10, 0.8, 9); rlaPoly(g, [[0.6, -9.5], [5.5, -2.5], [0.6, -2.5]], '#d8d0c0', 'rgba(0,0,0,0.5)', 0.5); g.restore();
    rlaMist(g, 40, 10, '#d8d0ff', 0.25, R);
  },
  // ---- the second 32: buildings ----
  tarpit(g, R) {
    rlaSky(g, '#2a1e1a', '#6a4a34', '#c8884a', 52); rlaSea(g, 52, '#4a3a30', '#22180e', R, 'rgba(255,200,140,0.3)');
    rlaBank(g, 64, '#6a5a46', R);
    // the spill, black and glossy, spreading over the rock
    const pts = []; for (let i = 0; i < 22; i++) { const a = i / 22 * 6.2832, r = 1 + (R() - 0.5) * 0.18; pts.push([54 + Math.cos(a) * 42 * r, 84 + Math.sin(a) * 11 * r]); }
    rlaPoly(g, pts, rlaRad(g, 54, 82, 2, 44, ['#2e2620', '#120e0a', '#050403']), 'rgba(0,0,0,0.8)', 1);
    g.save(); g.globalCompositeOperation = 'lighter'; for (const [x, y, w] of [[40, 80, 12], [66, 86, 9], [80, 81, 6]]) rlaEll(g, x, y, w, 1.2, 'rgba(255,170,90,0.35)', false); g.restore();
    for (let i = 0; i < 9; i++) { const x = 22 + R() * 64, y = 78 + R() * 12, r = 0.8 + R() * 1.6; rlaEll(g, x, y, r, r * 0.8, '#1a1410', 'rgba(255,190,120,0.5)', 0.4); g.fillStyle = 'rgba(255,220,170,0.7)'; g.fillRect(x - r * 0.4, y - r * 0.5, 0.6, 0.4); }
    // the barrel on its side, its bung out and tar running from it
    const bx = 36, by = 62;
    rlaPoly(g, [[bx - 18, by - 9], [bx + 14, by - 11], [bx + 14, by + 11], [bx - 18, by + 9]], rlaLit(g, bx - 18, by - 11, bx + 14, by + 11, '#7a4e2c', 0.45), null, 1.2);
    rlaEll(g, bx - 18, by, 4, 9, '#5a3a20', null, 1);
    g.strokeStyle = '#26262a'; g.lineWidth = 1.6; for (const dx of [-11, 0, 9]) { g.beginPath(); g.moveTo(bx + dx, by - 10.4 + (dx < 0 ? 0.6 : 0)); g.lineTo(bx + dx, by + 10.4 - (dx < 0 ? 0.6 : 0)); g.stroke(); }
    rlaEll(g, bx + 14, by, 4.6, 11, rlaRad(g, bx + 13, by - 3, 0, 11, ['#9a6a40', '#5a3a1e']), null, 1.1); rlaEll(g, bx + 14, by, 4.6, 11, false, '#26262a', 1.2);
    rlaEll(g, bx + 15, by + 3, 1.3, 2, '#060403', false);
    g.beginPath(); g.moveTo(bx + 14, by + 2); g.quadraticCurveTo(bx + 20, by + 8, bx + 20, by + 18); g.lineTo(bx + 25, by + 18); g.quadraticCurveTo(bx + 20, by + 12, bx + 16.4, by + 4); g.closePath(); g.fillStyle = '#0c0907'; g.fill();
  },
  foghorn(g, R) {
    rlaSky(g, '#2a201c', '#6a5040', '#c89058', 60); rlaSea(g, 60, '#4a3c30', '#221a10', R, 'rgba(255,210,150,0.3)');
    rlaMist(g, 52, 20, '#e8d8c0', 0.35, R);
    rlaBank(g, 86, '#4a4038', R);
    // the house, whitewashed, a slate roof
    rlaPoly(g, [[4, 88], [4, 52], [34, 52], [34, 88]], rlaLit(g, 4, 52, 34, 88, '#d8ccb6', 0.35), null, 1.1);
    rlaPoly(g, [[0, 54], [19, 38], [38, 54]], rlaLit(g, 0, 38, 38, 54, '#4a4a54', 0.35), null, 1.1);
    rlaPoly(g, [[12, 88], [12, 72], [20, 72], [20, 88]], '#4a3020', null, 0.8);
    // the horn, a brass trumpet out of the wall, its bell to the sea
    rlaPoly(g, [[30, 57], [70, 38], [70, 80], [30, 63]], rlaLin(g, 0, 38, 0, 80, ['#ffe8a0', '#d89a30', '#6a4410']), null, 1.2);
    g.strokeStyle = 'rgba(90,50,10,0.55)'; g.lineWidth = 1; for (const x of [42, 54]) { const t = (x - 30) / 40; g.beginPath(); g.moveTo(x, 57 - t * 19); g.lineTo(x, 63 + t * 17); g.stroke(); }
    rlaEll(g, 70, 59, 5.6, 21.5, rlaLin(g, 64, 38, 76, 80, ['#fff0b0', '#c8902a', '#5a3a10']), null, 1.2); rlaEll(g, 71, 59, 3.8, 18, rlaRad(g, 72, 59, 0, 18, ['#0a0604', '#3a2410']), false);
    // its bellow, rolling out over the water
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; for (let k = 0; k < 4; k++) { g.strokeStyle = 'rgba(255,236,200,' + (0.75 - k * 0.15) + ')'; g.lineWidth = 2 - k * 0.3; g.beginPath(); g.arc(68, 59, 14 + k * 8, -0.75, 0.75); g.stroke(); } g.restore();
  },
  mortar(g, R) {
    rlaSky(g, '#2a1c18', '#6a4430', '#d08848', 66); rlaSea(g, 66, '#4a3628', '#20160c', R, 'rgba(255,200,140,0.3)');
    // the shell's flight, high over everything
    g.strokeStyle = 'rgba(255,230,190,0.6)'; g.setLineDash([2, 2.4]); g.lineWidth = 0.9; g.beginPath(); g.moveTo(62, 54); g.quadraticCurveTo(70, 0, 102, 14); g.stroke(); g.setLineDash([]);
    rlaGlow(g, 84, 10, 7, '#ffb040', 0.9); rlaEll(g, 84, 10, 2.8, 2.8, rlaRad(g, 83, 9, 0, 3, ['#7a7a84', '#16161c']), 'rgba(0,0,0,0.8)', 0.6);
    for (let i = 0; i < 6; i++) rlaPuff(g, 60 + R() * 12, 34 + R() * 16, 6 + R() * 6, 'rgba(220,200,180,0.5)');
    // the mortar, a squat iron pot on its bed, cocked at the sky
    rlaPoly(g, [[30, 80], [34, 70], [66, 70], [70, 80]], rlaLit(g, 30, 70, 70, 80, '#6a4428', 0.4), null, 1.1);
    g.save(); g.translate(50, 66); g.rotate(-0.75);
    rlaPoly(g, [[-11, -9], [13, -11], [13, 11], [-11, 9]], rlaLin(g, 0, -11, 0, 11, ['#7a7a86', '#32323a', '#0c0c10']), null, 1.2);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(4, -10.6, 2, 21.2);
    rlaEll(g, 13, 0, 3.6, 11.4, rlaLin(g, 10, -11, 16, 11, ['#8a8a96', '#2a2a32']), null, 1); rlaEll(g, 13.6, 0, 2.4, 8.6, '#050507', false);
    rlaEll(g, -11, 0, 3, 9, '#2a2a30', null, 1);
    g.restore();
    rlaEll(g, 50, 68, 3, 3, '#1a1a20', null, 0.8); rlaGlow(g, 60, 56, 10, '#ffb050', 0.6);
    // the pit's wall of sandbags in front
    for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) { const x = 6 + i * 15 + (r ? 7.5 : 0), y = 94 - r * 8; rlaEll(g, x, y, 8, 4.6, rlaLit(g, x - 8, y - 4.6, x + 8, y + 4.6, '#a89068', 0.4), null, 1); g.strokeStyle = 'rgba(60,40,20,0.4)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x - 4, y - 1); g.lineTo(x + 4, y - 1.4); g.stroke(); }
  },
  burnlens(g, R) {
    rlaSky(g, '#4a2a1a', '#a86a3a', '#f0b868', 68); rlaSun(g, 12, 14, 6, '#fff0b0'); rlaSea(g, 68, '#6a4a30', '#2a1a10', R, 'rgba(255,230,170,0.4)');
    rlaBank(g, 84, '#5a4a3a', R);
    // the sun through the lens to one hot point
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,230,160,0.14)'; g.beginPath(); g.moveTo(10, 8); g.lineTo(18, 6); g.lineTo(40, 26); g.lineTo(36, 62); g.closePath(); g.fill();
    g.fillStyle = rlaLin(g, 40, 0, 80, 0, ['rgba(255,220,140,0.25)', 'rgba(255,240,180,0.7)']); g.beginPath(); g.moveTo(40, 27); g.lineTo(80, 80); g.lineTo(38, 61); g.closePath(); g.fill(); g.restore();
    // what it burns
    rlaGlow(g, 80, 80, 22, '#ff7a20', 0.8); rlaFlame(g, 80, 84, 8, 22, rlaLin(g, 0, 62, 0, 84, ['rgba(255,120,40,0)', '#ff6a20', '#c02a10'])); rlaFlame(g, 80, 84, 5, 15, rlaLin(g, 0, 69, 0, 84, ['#ffd060', '#ff8a20'])); rlaFlame(g, 80, 84, 2.4, 8, '#fff4c0');
    for (let i = 0; i < 5; i++) rlaPuff(g, 82 + i * 2, 58 - i * 9, 5 + i * 1.6, 'rgba(90,70,60,0.45)');
    rlaGlow(g, 80, 80, 6, '#ffffff', 0.9);
    // the lens: rings of glass in a brass frame, on its fork and stand
    rlaLimb(g, [[38, 64], [32, 86]], 2.4, '#6a4a22'); rlaLimb(g, [[38, 64], [46, 86]], 2.4, '#6a4a22'); rlaLimb(g, [[26, 46], [28, 64], [48, 64], [50, 46]], 1.8, '#8a6428');
    rlaEll(g, 38, 44, 13, 19, rlaLin(g, 25, 25, 51, 63, ['#fff0a8', '#c8902a', '#5a3a10']), null, 1.2);
    rlaEll(g, 38, 44, 10.4, 16, rlaRad(g, 35, 38, 1, 18, ['#ffffff', '#f8f0d0', '#c8b890']), false);
    g.strokeStyle = 'rgba(140,110,60,0.55)'; g.lineWidth = 0.6; for (let k = 1; k <= 4; k++) { g.beginPath(); g.ellipse(38, 44, k * 2.4, k * 3.7, 0, 0, 6.2832); g.stroke(); }
    rlaGlow(g, 38, 44, 14, '#fff8d0', 0.7);
  },
  martello(g, R) {
    rlaSky(g, '#2a1e1c', '#6a4a38', '#d0904e', 62); rlaSea(g, 62, '#4a3a30', '#22180e', R, 'rgba(255,200,140,0.3)');
    rlaBank(g, 90, '#4a4036', R);
    // the tower, squat and round, its walls battered in
    rlaPoly(g, [[14, 94], [24, 38], [76, 38], [86, 94]], rlaLin(g, 14, 0, 86, 0, ['#e8d0a8', '#b09070', '#5a4636']), null, 1.2);
    g.strokeStyle = 'rgba(40,26,16,0.4)'; g.lineWidth = 0.6; for (let r = 0; r < 8; r++) { const y = 44 + r * 6.6, hw = 26 + (y - 38) / 56 * 10; g.beginPath(); g.ellipse(50, y, hw, 2, 0, 0, Math.PI); g.stroke(); for (let c = 0; c < 6; c++) { const x = 50 - hw * Math.cos((c + 0.5 + (r % 2) * 0.5) / 6.5 * Math.PI); g.beginPath(); g.moveTo(x, y + 1.6); g.lineTo(x, y + 6.6); g.stroke(); } }
    rlaPoly(g, [[22, 40], [22, 32], [78, 32], [78, 40]], rlaLin(g, 22, 0, 78, 0, ['#f0dcb4', '#b89878', '#6a5240']), null, 1.1);
    rlaPoly(g, [[44, 66], [44, 58], [50, 54], [56, 58], [56, 66]], '#1a120c', null, 0.8);
    rlaLimb(g, [[46, 68], [46, 94]], 0.8, '#3a2818', false); rlaLimb(g, [[54, 68], [54, 94]], 0.8, '#3a2818', false); for (let i = 0; i < 6; i++) rlaLimb(g, [[46, 71 + i * 4], [54, 71 + i * 4]], 0.6, '#3a2818', false);
    for (const x of [32, 68]) rlaPoly(g, [[x - 0.8, 50], [x + 0.8, 50], [x + 0.8, 56], [x - 0.8, 56]], '#1a120c', false);
    // the gun on the roof, smoke from its last shot
    rlaPoly(g, [[46, 32], [48, 26], [60, 26], [62, 32]], '#4a3020', null, 0.9);
    rlaLimb(g, [[50, 26], [80, 20]], 4.4, '#2a2a32'); rlaEll(g, 81, 19.8, 1.4, 2.4, '#08080a', false);
    rlaGlow(g, 84, 19, 9, '#ffb040', 0.9); for (let i = 0; i < 4; i++) rlaPuff(g, 88 + i * 4, 18 - i * 2, 4 + i * 1.6, 'rgba(230,214,196,0.55)');
    rlaLimb(g, [[30, 32], [30, 14]], 0.8, '#2a1e14'); rlaPoly(g, [[30.4, 14], [40, 16.5], [30.4, 19.5]], '#b0302a', 'rgba(0,0,0,0.5)', 0.5);
  },
  oilstore(g, R) {
    rlaSky(g, '#2a1e1a', '#6a4a34', '#c8884a', 58); rlaSea(g, 58, '#4a3a30', '#22180e', R, 'rgba(255,200,140,0.3)');
    rlaBank(g, 90, '#4a4036', R);
    // the store: rough stone, a slate roof, a lamp over its door
    rlaPoly(g, [[12, 92], [12, 52], [64, 52], [64, 92]], rlaLit(g, 12, 52, 64, 92, '#9a8a74', 0.4), null, 1.1);
    g.strokeStyle = 'rgba(30,20,14,0.4)'; g.lineWidth = 0.6; for (let r = 0; r < 5; r++) { const y = 52 + r * 8; g.beginPath(); g.moveTo(12, y); g.lineTo(64, y); g.stroke(); for (let c = 0; c < 5; c++) { const x = 12 + (c + (r % 2) * 0.5) * 11; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8); g.stroke(); } }
    rlaPoly(g, [[6, 54], [38, 34], [70, 54]], rlaLit(g, 6, 34, 70, 54, '#3e3e4a', 0.35), null, 1.2);
    rlaPoly(g, [[30, 92], [30, 70], [46, 70], [46, 92]], rlaLit(g, 30, 70, 46, 92, '#6a4428', 0.3), null, 1); g.fillStyle = '#26262a'; g.fillRect(30, 75, 16, 1.4); g.fillRect(30, 85, 16, 1.4);
    rlaGlow(g, 38, 64, 14, '#ffb040', 0.8); rlaPoly(g, [[36, 61], [40, 61], [40.6, 67], [35.4, 67]], rlaRad(g, 38, 64, 0, 4, ['#fff4c0', '#ffa030']), '#1a1410', 0.7);
    // casks stacked against its wall
    for (const [x, y] of [[70, 86], [82, 86], [94, 86], [76, 75], [88, 75], [82, 64]]) { rlaEll(g, x, y, 5.6, 5.6, rlaRad(g, x - 1.6, y - 1.6, 0, 7, ['#b07a48', '#7a4e2c', '#3a2414']), null, 1); rlaEll(g, x, y, 4.2, 4.2, false, '#2a2a2e', 0.9); rlaEll(g, x, y, 1, 1, '#1a1008', false); }
    // the oil it gives you, a drop of light over it
    rlaGlow(g, 38, 20, 24, '#ffc040', 0.7); rlaDrop(g, 38, 22, 7.5, '#ffbe3a'); rlaSparks(g, 38, 16, 14, 10, '#fff0b0', R);
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
