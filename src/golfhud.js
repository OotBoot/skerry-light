'use strict';
// Skerry Links: what's on the screen over the 3D view (#gfUI in index.html): the hole and the player up, the club, the
// lie and the distance, the wind, the map of the hole in the corner, the swing meter, and the scorecard.
// The meter is an arc: the marker climbs from the strike line on the left to the power you set (the top at 100%,
// the red past it the overswing), then falls back; the strike line is the narrow bright band at the start.

const GH = { key: '', mapCv: null, meterCv: null, windCv: null };

function gfHud(force) {
  const H = GF.H, p = gfPlayer(); if (!H || !p) return;
  const club = GF_CLUBS[GF.club], d = gfToPin(p), mine = gfMyTurn();
  const key = [GF.hi, GF.cur, GF.club, GF.putt, GF.ph, p.st, p.lie, Math.round(d * 3), GF.P.map(q => q.sc.join(',') + q.st).join('|'), mine].join(';');
  if (force || key !== GH.key) {
    GH.key = key;
    $('gfHoleNo').textContent = `Hole ${GF.holes[GF.hi] + 1}`; $('gfHoleName').textContent = H.n;
    $('gfHolePar').textContent = `Par ${H.par} · ${H.yd} yd`;
    const tp = gfToPar(p), sh = GF.P.length > 1;
    $('gfWho').textContent = sh ? p.nm : 'You'; $('gfWho').style.color = p.col;
    $('gfStroke').textContent = p.done ? 'Holed' : `Stroke ${p.st + 1}`;
    $('gfTotal').textContent = `${gfParTxt(tp)} for the round`;
    $('gfLie').textContent = p.done ? '' : (GF_SURF[p.lie] || GF_SURF.rough).n;
    $('gfPinD').textContent = p.done ? '' : `${gfDist(d)} to the pin`;
    $('gfClubName').textContent = club.n;
    const lie = (GF_SURF[p.lie] || GF_SURF.rough).lie * (club.k === 'D' && p.lie !== 'tee' ? 0.9 : 1);
    $('gfClubD').textContent = club.putt ? `up to ${GF_PUTTS[GF.putt]} ft` : `${Math.round(club.c * (club.putt ? 1 : lie))} yd${lie < 0.99 ? ' from here' : ''}`;
    $('gfPuttRow').hidden = !club.putt;
    $('gfPuttScale').textContent = `${GF_PUTTS[GF.putt]} ft`;
    const others = GF.mode === 'net' && !mine && !p.done;
    $('gfTurn').hidden = !(others || (GF.P.length > 1 && GF.ph === 'aim'));
    $('gfTurn').textContent = others ? `${p.nm} is playing` : `${p.nm}, you're up`;
    $('gfHint').textContent = GF.ph === 'aim' ? (mine ? (club.putt ? 'Space: putt · ← → aim · Q E scale' : 'Space: swing · ← → aim · ↑ ↓ club · M map') : '') : GF.ph === 'swing' ? (GF.m && GF.m.s === 1 ? 'Space: set the power' : 'Space: strike on the line') : GF.ph === 'fly' ? 'Space: hurry it along' : GF.ph === 'card' ? (GF.over || (GF.mode === 'net' && typeof gfnCanNext === 'function' && !gfnCanNext()) ? '' : 'Space: next hole') : GF.ph === 'wait' ? 'Waiting for the host…' : '';
    $('gfSwing').disabled = !mine && GF.ph !== 'fly' && GF.ph !== 'card';
    $('gfPadBox').classList.toggle('putting', !!club.putt);
  }
  gfDrawMeter(); gfDrawWind(); gfDrawMap();
}

// ---------- the meter ----------
function gfDrawMeter() {
  const cv = $('gfMeter'), show = (GF.ph === 'aim' || GF.ph === 'swing') && gfMyTurn() && GF.intro <= 0;
  cv.hidden = !show; if (!show) return;
  const r = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, Hh = cv.clientHeight; if (cv.width !== Math.round(W * r)) { cv.width = Math.round(W * r); cv.height = Math.round(Hh * r); }
  const c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, W, Hh);
  const cx = W / 2, cy = Hh - 10, R = Math.min(W / 2 - 14, Hh - 24), a0 = Math.PI * 1.06, span = Math.PI * 0.88;   // (-0.15 at the far left, 1.1 at the far right)
  const ang = v => a0 + (v + 0.15) / 1.25 * span;
  c.lineCap = 'butt';
  const arc = (v0, v1, col, w) => { c.beginPath(); c.arc(cx, cy, R, ang(v0), ang(v1)); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
  arc(-0.15, 1.1, 'rgba(8,12,22,0.78)', 26);
  const g = c.createLinearGradient(cx - R, 0, cx + R, 0); g.addColorStop(0, '#5fa04a'); g.addColorStop(0.55, '#ffd88a'); g.addColorStop(0.85, '#ffb060');
  arc(0, 1, g, 16); arc(1, 1.1, '#d8452f', 16);
  arc(-0.15, -0.012, 'rgba(216,69,47,0.55)', 16); arc(0.012, 0.06, 'rgba(255,216,138,0.25)', 16);
  arc(-0.012, 0.012, '#ffffff', 22);   // (the strike line)
  // marks at a quarter, a half and three-quarters
  c.fillStyle = '#e9d9a6'; c.font = '11px "Courier New", monospace'; c.textAlign = 'center';
  for (const v of [0.25, 0.5, 0.75, 1]) { const a = ang(v); c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 13), cy + Math.sin(a) * (R - 13)); c.lineTo(cx + Math.cos(a) * (R - 19), cy + Math.sin(a) * (R - 19)); c.strokeStyle = 'rgba(10,10,10,0.7)'; c.lineWidth = 2; c.stroke(); c.fillText(Math.round(v * 100) + '%', cx + Math.cos(a) * (R - 32), cy + Math.sin(a) * (R - 32) + 4); }
  const M = GF.m;
  if (M && M.s >= 2) { const a = ang(M.p); c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 14), cy + Math.sin(a) * (R - 14)); c.lineTo(cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14)); c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.stroke(); }
  if (M) { const a = ang(M.v); c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 18), cy + Math.sin(a) * (R - 18)); c.lineTo(cx + Math.cos(a) * (R + 18), cy + Math.sin(a) * (R + 18)); c.strokeStyle = '#14110a'; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#fff6d8'; c.lineWidth = 3; c.stroke(); }
  // what the power comes to
  const club = GF_CLUBS[GF.club], p = gfPlayer(), v = M ? (M.s >= 2 ? M.p : M.v) : 1;
  const lie = club.putt ? 1 : (GF_SURF[p.lie] || GF_SURF.rough).lie;
  c.font = 'bold 15px Georgia, serif'; c.fillStyle = '#ffd88a';
  c.fillText(M ? (club.putt ? `${Math.round(GF_PUTTS[GF.putt] * Math.max(0, Math.min(1.1, v)))} ft` : `${Math.round(club.c * lie * Math.max(0, Math.min(1.1, v)))} yd`) : (club.putt ? 'Putt' : 'Swing'), cx, cy - 6);
}
// the wind: an arrow turned as you're looking, and its speed
function gfDrawWind() {
  const cv = $('gfWindCv'), c = cv.getContext('2d'), W = cv.width, s = Math.hypot(GF.wind[0], GF.wind[1]);
  c.clearRect(0, 0, W, W); c.save(); c.translate(W / 2, W / 2);
  c.beginPath(); c.arc(0, 0, W / 2 - 2, 0, Math.PI * 2); c.fillStyle = 'rgba(8,12,22,0.7)'; c.fill(); c.strokeStyle = 'rgba(233,217,166,0.5)'; c.lineWidth = 1.5; c.stroke();
  const a = Math.atan2(GF.wind[0], GF.wind[1]) - (G3.yaw || 0);
  c.rotate(a); const L = W * 0.34 * Math.min(1, 0.35 + s / 9);
  c.beginPath(); c.moveTo(0, L); c.lineTo(0, -L); c.strokeStyle = '#ffd88a'; c.lineWidth = 4; c.stroke();
  c.beginPath(); c.moveTo(0, -L - 6); c.lineTo(-8, -L + 6); c.lineTo(8, -L + 6); c.closePath(); c.fillStyle = '#ffd88a'; c.fill();
  c.restore();
  $('gfWindTxt').textContent = s < 0.4 ? 'Still' : Math.round(s * 2.237) + ' mph';
}
// the hole from above, in the corner: the course's own picture, the ball, the aim and the others
function gfDrawMap() {
  const cv = $('gfMap'), P = G3.paint, H = GF.H; if (!P || !H) return;
  const r = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, Hh = cv.clientHeight; if (!W) return;
  if (cv.width !== Math.round(W * r)) { cv.width = Math.round(W * r); cv.height = Math.round(Hh * r); }
  const c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, W, Hh);
  // fit the hole from the tee to just past the green
  const [x0, y0, x1, y1] = H.box, cx0 = Math.min(0, H.pin[0], ...H.pts.map(q => q[0])) - 30, cx1 = Math.max(0, H.pin[0], ...H.pts.map(q => q[0])) + 30, cy0 = -15, cy1 = H.pin[1] + 30;
  const sc = Math.min(W / (cx1 - cx0), Hh / (cy1 - cy0)), ox = (W - (cx1 - cx0) * sc) / 2, oy = (Hh - (cy1 - cy0) * sc) / 2;
  const X = x => ox + (x - cx0) * sc, Y = y => Hh - oy - (y - cy0) * sc;
  c.save(); c.beginPath(); c.rect(0, 0, W, Hh); c.clip();
  c.drawImage(P.cv, X(x0), Y(y1), (x1 - x0) * sc, (y1 - y0) * sc);
  c.restore();
  // the pin, the others, the ball, the aim
  c.fillStyle = '#d8452f'; c.beginPath(); c.arc(X(H.pin[0]), Y(H.pin[1]), 3, 0, 7); c.fill();
  GF.P.forEach((q, i) => { if (q.done || i === GF.cur) return; c.fillStyle = q.col; c.beginPath(); c.arc(X(q.x), Y(q.y), 2.6, 0, 7); c.fill(); });
  const p = gfPlayer(), b = gfBallNow() || [p.x, p.y];
  if (GF.ph === 'aim') { const club = GF_CLUBS[GF.club], L = club.putt ? GF_PUTTS[GF.putt] * 0.3048 : club.c * GF_YD * (GF_SURF[p.lie] || GF_SURF.rough).lie; c.strokeStyle = 'rgba(255,242,196,0.9)'; c.setLineDash([3, 3]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(p.x), Y(p.y)); c.lineTo(X(p.x + Math.sin(GF.aim) * L), Y(p.y + Math.cos(GF.aim) * L)); c.stroke(); c.setLineDash([]); }
  if (GF.shot && GF.rep) { const tr = GF.shot.R.tr; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i <= GF.rep.i; i += 3) { const q = tr[i]; i ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1])); } c.stroke(); }
  c.fillStyle = '#fff'; c.strokeStyle = p.col; c.lineWidth = 2; c.beginPath(); c.arc(X(b[0]), Y(b[1]), 3.4, 0, 7); c.fill(); c.stroke();
}

// ---------- the scorecard ----------
// shown at the end of each hole (Next goes on), at the end of the round, and whenever asked for (Tab, Y, the button)
function gfCardShow(on, manual) {
  const el = $('gfCard'); if (!el) return;
  if (!on) { if (GF.ph === 'card') { if (manual && !GF.over) gfCardNext(); return; } el.hidden = true; return; }
  el.hidden = false;
  const H = GF.H, holes = GF.holes, done = GF.ph === 'card';
  $('gfCardHead').textContent = GF.over ? 'The round is over' : done ? `Hole ${GF.holes[GF.hi] + 1} · ${H.n}` : 'Scorecard';
  // the line under the heading: how the hole went, or who won
  let sub = '';
  if (GF.over) {
    const L = GF.P.filter(q => !q.gone).slice().sort((a, b) => gfTotal(a) - gfTotal(b)), w = L[0];
    sub = GF.P.length > 1 ? (L.length > 1 && gfTotal(L[1]) === gfTotal(w) ? `A tie at ${gfTotal(w)}.` : `${w.nm} wins with ${gfTotal(w)} (${gfParTxt(gfToPar(w))}).`) : `You went round in ${gfTotal(w)} (${gfParTxt(gfToPar(w))}).`;
    const st = gfStore.get(); if (GF.full && st.newBest) sub += ' A new best round!';
    if (!GF.full) sub += ' (Only a full round of nine goes on the scoreboard.)';
  } else if (done) sub = GF.P.map(q => `${GF.P.length > 1 ? q.nm + ': ' : ''}${q.sc[GF.hi] != null ? gfScoreName(q.sc[GF.hi], H.par) + ' (' + q.sc[GF.hi] + ')' : '—'}`).join(' · ');
  $('gfCardSub').textContent = sub;
  const T = $('gfCardTable'); T.textContent = '';
  const row = (cls, cells) => { const tr = document.createElement('tr'); if (cls) tr.className = cls; cells.forEach((v, i) => { const td = document.createElement(i ? 'td' : 'th'); if (v && typeof v === 'object') { td.textContent = v.t; if (v.c) td.className = v.c; if (v.s) td.style.color = v.s; } else td.textContent = v; tr.append(td); }); T.append(tr); };
  row('gfc-h', ['Hole'].concat(holes.map(h => String(h + 1)), ['Total', '±']));
  row('gfc-y', ['Yards'].concat(holes.map(h => String(GF_RAW[h].yd)), [String(holes.reduce((a, h) => a + GF_RAW[h].yd, 0)), '']));
  const par = holes.reduce((a, h) => a + GF_RAW[h].par, 0);
  row('gfc-p', ['Par'].concat(holes.map(h => String(GF_RAW[h].par)), [String(par), '']));
  for (const q of GF.P) {
    const cells = holes.map((h, k) => { const v = q.sc[k]; if (v == null) return { t: k === GF.hi && !GF.over && q.st ? '·' : '' }; const d = v - GF_RAW[h].par; return { t: String(v), c: d <= -2 ? 'gfc-eagle' : d === -1 ? 'gfc-birdie' : d === 0 ? '' : d === 1 ? 'gfc-bogey' : 'gfc-double' }; });
    row('gfc-pl', [{ t: q.nm + (q.gone ? ' (left)' : ''), s: q.col }].concat(cells, [String(gfTotal(q) || ''), gfParTxt(gfToPar(q))]));
  }
  $('gfCardNext').hidden = GF.over || (GF.mode === 'net' && done && typeof gfnCanNext === 'function' && !gfnCanNext());
  $('gfCardNext').textContent = done ? (GF.hi + 1 < holes.length ? `On to hole ${holes[GF.hi + 1] + 1}` : 'Finish') : 'Back to the hole';
  $('gfCardAgain').hidden = !GF.over || GF.mode === 'net';
  $('gfCardMenu').hidden = !GF.over;
  $('gfCardWait').hidden = !(GF.mode === 'net' && done && !GF.over && typeof gfnCanNext === 'function' && !gfnCanNext());
  setTimeout(() => { const b = !$('gfCardNext').hidden ? $('gfCardNext') : $('gfCardMenu'); if (b && !b.hidden) b.focus({ preventScroll: true }); }, 30);
}
