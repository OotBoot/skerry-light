// Fog Run: the chart (step 2 of the design, /fogrun/design.md). The route through the haar, drawn from the run's
// seed, and the crew's vote on where to sail next.
//
//  - The route (frChartMake). Seven stops through the three reaches (FR_REACH: two, three, two), then Lantern Rock
//    once its boss is in the game (FR_KINDS.boss). Each stop is a column of two or three islands; each island joins
//    one or two of the next column's (never crossing), like the map in a deckbuilder roguelike. Each island has a
//    kind (FR_KINDS, by their weight: only the kinds that are in the game are drawn), a rule (a Fight's from
//    FRI_RULES, any other kind's from its def.rules) and a look (FR_LOOKS, no two alike in a column). The reaches
//    shape it (FRCH_BAN, FRCH_WANT): no elites or chapels in the Near Skerries, a puzzle in its second column, an
//    elite in the middle of the Grey Reach, and a chapel on one branch of it. It's the same on every screen, as it's
//    drawn from the seed; the host's word only carries where you are and the votes.
//  - The vote. As each sail begins the chart opens for everyone (and it's on the chart table on deck, port side
//    aft of the hatch: Use to open it again). Pick one of the islands ahead (click or tap it, keys 1 to 3, or the
//    D-pad and A on a controller; Esc or B to put it away). Five seconds after the first vote it's settled (alone,
//    a moment after yours; together, a moment after the last of you has voted): the most votes wins, and a tie goes
//    the host's way (or, if the host didn't vote for any of those tied, the run's seed's). Nobody votes in FRCH.WAIT
//    seconds, or she comes within sight of it: the seed chooses. The island out in the fog is then laid out as the
//    one chosen (the sail's plan entry, its look, and its 3D), and its stage follows when she runs up on its beach.
//    The cutter never waits on the vote: she sails all the while (the boat rule).
//  - Hooks: frNextStop() (src/frrun.js) calls frChartNext(); frGrow calls frChartEnsure() (settled before the sail's
//    island is added); frPack and frApplyRun call frChartPack(z) / frChartApply(hz) (the word: frc); src/fps.js's
//    keydown asks frChartKey(e) first while the chart is open. The sail stage's hooks (enter, tick, q, hud,
//    consider, prompt, use, block, b3) are wrapped here, round src/frsail.js's.
//  - Together: a vote is raidAsk('vote', island id) (the host's stage q). The host's word frc = [stage, settled,
//    chosen id, tenths of a second left, [sid, id, ...] the votes, where you are].

const FRCH = { WAIT: 20, SETTLE: 5, SOLO: 1.2, ALL: 1.5, NEAR: 30, TABLE: [-1.9, -5.4] };
// per reach: kinds never drawn there; and what each column must have (if that kind is in the game)
const FRCH_BAN = { 1: ['elite', 'chapel', 'boss'], 2: ['boss'], 3: ['chapel', 'boss'] };
const FRCH_WANT = { 2: 'puzzle', 4: 'elite' };
// the state of the vote (on every screen)
const FRV = { stage: -1, done: false, pick: -1, left: 0, t: 0, first: -1, allT: -1, votes: {}, open: false, closeT: 0, seen: false, padCur: 0, padWas: null, tex: null, texKey: '' };
let FRCH_MAP = null;

// ---------- the route ----------
const frchCols = () => FR_REACH.slice(1).reduce((a, R) => a + R.stops, 0);
const frchReachOf = c => { let n = 0; for (let r = 1; r < FR_REACH.length; r++) { n += FR_REACH[r].stops; if (c <= n) return r; } return FR_REACH.length - 1; };
// (the chart is drawn once a seed, and again if the kinds in the game change)
function frChart() {
  const key = FR.seed + ':' + Object.keys(FR_KINDS).join();
  if (!FRCH_MAP || FRCH_MAP.key !== key) FRCH_MAP = frChartMake(key);
  return FRCH_MAP;
}
function frChartMake(key) {
  const R = frRng(7001), N = frchCols(), cols = [], all = {}, boss = FR_KINDS.boss;
  for (let c = 1; c <= N + (boss ? 1 : 0); c++) {
    const reach = Math.min(3, frchReachOf(c)), last = c > N, k = last ? 1 : 2 + (R() < 0.55 ? 1 : 0), col = [];
    const looks = FR_LOOKS.slice(); for (let i = looks.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [looks[i], looks[j]] = [looks[j], looks[i]]; }
    let pool = Object.keys(FR_KINDS).filter(kd => (FR_KINDS[kd].weight == null ? 1 : FR_KINDS[kd].weight) > 0 && !(FRCH_BAN[reach] || []).includes(kd));
    if (!pool.length) pool = ['fight'];
    const kinds = last ? ['boss'] : frchDraw(R, pool, k);
    const want = FRCH_WANT[c]; if (!last && want && FR_KINDS[want] && !kinds.includes(want)) kinds[(R() * k) | 0] = want;
    // (a chapel on one branch of the Grey Reach: in its first or last column)
    if (!last && reach === 2 && FR_KINDS.chapel && c === N - FR_REACH[3].stops - (R() < 0.5 ? 0 : FR_REACH[2].stops - 1) && !kinds.includes('chapel')) kinds[(R() * k) | 0] = 'chapel';
    for (let i = 0; i < k; i++) {
      const kind = kinds[i], def = FR_KINDS[kind] || FR_KINDS.fight || {};
      const rules = kind === 'fight' && typeof FRI_RULES !== 'undefined' ? Object.keys(FRI_RULES) : Array.isArray(def.rules) ? def.rules : [];
      const nd = { id: c * 8 + i, c, i, x: k === 1 ? 0.5 : 0.12 + 0.76 * i / (k - 1) + (R() - 0.5) * 0.08, kind, rule: rules.length ? rules[(R() * rules.length) | 0] : '',
        look: def.look || looks[i % looks.length], reach, to: [] };
      col.push(nd); all[nd.id] = nd;
    }
    cols.push(col);
  }
  // the ways between: each to its nearest in the next column, sometimes to a neighbour of that too (never crossing);
  // every island has a way in
  const cross = (A, a, b) => A.some(([p, q]) => (p - a) * (q - b) < 0);
  for (let c = 0; c < cols.length - 1; c++) {
    const A = cols[c], B = cols[c + 1], E = [];
    const near = x => B.reduce((bi, b, j) => Math.abs(b.x - x) < Math.abs(B[bi].x - x) ? j : bi, 0);
    for (let i = 0; i < A.length; i++) { const j = near(A[i].x); E.push([i, j]); }
    for (let i = 0; i < A.length; i++) {
      if (R() < 0.5) continue;
      const j0 = near(A[i].x), j = j0 + (R() < 0.5 ? -1 : 1);
      if (j < 0 || j >= B.length || E.some(e => e[0] === i && e[1] === j) || cross(E, i, j)) continue;
      E.push([i, j]);
    }
    for (let j = 0; j < B.length; j++) {
      if (E.some(e => e[1] === j)) continue;
      const cand = A.map((a, i) => i).sort((p, q) => Math.abs(A[p].x - B[j].x) - Math.abs(A[q].x - B[j].x));
      const i = cand.find(i => !cross(E, i, j)); E.push([i == null ? cand[0] : i, j]);
    }
    for (const [i, j] of E) A[i].to.push(B[j].id);
    for (const a of A) a.to.sort((p, q) => all[p].i - all[q].i);
  }
  return { key, cols, all, N };
}
// kinds for a column: by weight, without repeating while there are others to draw
function frchDraw(R, pool, k) {
  const out = []; let left = pool.slice();
  for (let i = 0; i < k; i++) {
    if (!left.length) left = pool.slice();
    const w = left.map(kd => FR_KINDS[kd].weight == null ? 1 : FR_KINDS[kd].weight), sum = w.reduce((a, b) => a + b, 0);
    let r = R() * sum, j = 0; while (j < left.length - 1 && (r -= w[j]) > 0) j++;
    out.push(left[j]); left.splice(j, 1);
  }
  return out;
}
// the islands you can sail to next: the ways on from the last one (or the whole first column, or the column for the
// stop if you've jumped about)
function frChartOpts(n) {
  const C = frChart(), col = C.cols[n - 1]; if (!col) return [];
  if (typeof frcPilot === 'function' && frcPilot(n)) return col.slice();   // [fogrun cards] the Pilot's Chart: the whole column open
  const at = C.all[FR.at];
  if (at && at.c === n - 1) return at.to.map(id => C.all[id]).filter(Boolean);
  return col.slice();
}
const frchStop = nd => ({ kind: nd.kind, rule: nd.rule, look: nd.look, n: nd.c, reach: nd.reach, id: nd.id });
// [chart] (frNextStop, hosting or alone) the stop after the one just finished, for now its first choice (the vote may
// change it), or null: past the last, won
function frChartNext() {
  if ((FR.stop | 0) === 0) FR.at = -1;
  const n = (FR.stop | 0) + 1, o = frChartOpts(n); if (!o.length) return null;
  return frchStop(o[0]);
}
const frchNodeName = nd => { const d = FR_KINDS[nd.kind] || {}; return d.n || nd.kind; };
const frchRuleName = nd => nd.kind === 'fight' && typeof FRI_RULES !== 'undefined' && FRI_RULES[nd.rule] ? FRI_RULES[nd.rule].n : (FR_KINDS[nd.kind] || {}).rn ? FR_KINDS[nd.kind].rn(nd.rule) : '';
const frchMark = nd => nd.kind === 'boss' ? '✦' : (FR_KINDS[nd.kind] || {}).mark || '?';
const frchLookName = nd => (FPS_ISLES[nd.look] || {}).name || nd.look;
const frchOnSail = () => FR.on && RAID.on && RAID_ORDER[RAID.stage] === 'frsail';

// ---------- the vote ----------
// (the sail's enter, everyone) a fresh vote for this sail
function frChartBegin() {
  Object.assign(FRV, { stage: RAID.stage, done: false, pick: -1, left: 0, t: 0, first: -1, allT: -1, votes: {}, seen: false, closeT: 0 });
  const p = frPlanNow(), o = p ? frChartOpts(p.n) : [];
  // (one way on, or none to choose from: nothing to vote on)
  if (ZM.net !== 'client' && o.length <= 1) { if (o.length) frChartSettle(o[0].id, true); else FRV.done = true; return; }
  if (ZM.net !== 'client') fpsFeed('The chart is open: choose the next island (most votes wins). She sails on while you choose.');
  frChartOpen();
}
// (hosting or alone) the tally, and the deadline
function frChartTick(dt) {
  if (FRV.done || FRV.stage !== RAID.stage) return;
  FRV.t += dt;
  const p = frPlanNow(), opts = p ? frChartOpts(p.n) : []; if (!opts.length) return;
  const ids = opts.map(o => o.id), hum = (ZM.hum || [[FPS.me.id]]).map(h => h[0]).filter(sid => sid === FPS.me.id || !((FPS.remote.get(sid) || {}).left));
  const vs = Object.entries(FRV.votes).filter(([sid, id]) => ids.includes(id) && hum.includes(sid));
  if (vs.length && FRV.first < 0) FRV.first = FRV.t;
  if (vs.length && vs.length >= hum.length && FRV.allT < 0) FRV.allT = FRV.t;
  const solo = !ZM.net || hum.length <= 1;
  let due = FRV.first < 0 ? FRCH.WAIT : FRV.first + (solo ? FRCH.SOLO : FRCH.SETTLE);
  if (FRV.allT >= 0) due = Math.min(due, FRV.allT + (solo ? FRCH.SOLO : FRCH.ALL));
  // (she's nearly there: settle it now)
  const S = RAID.st, B = S && S.B; if (B && GWS_LEG && Math.hypot(GWS_LEG.mark[0] - B.x, GWS_LEG.mark[1] - B.y) - GWS_LEG.isleR < (GWS_LEG.fog || 90) + FRCH.NEAR) due = Math.min(due, FRV.t);
  FRV.left = Math.max(0, due - FRV.t);
  if (FRV.t < due) return;
  // the most votes; a tie: the host's, or the seed's
  const n = {}; for (const [, id] of vs) n[id] = (n[id] || 0) + 1;
  const top = Math.max(0, ...Object.values(n)), tied = top ? ids.filter(id => n[id] === top) : ids;
  const mine = FRV.votes[FPS.me.id], R = frRng(7300 + p.n);
  frChartSettle(tied.length === 1 ? tied[0] : tied.includes(mine) ? mine : tied[(R() * tied.length) | 0], !vs.length);
}
// (hosting or alone) it's settled: the sail's island is the chosen one
function frChartSettle(id, bySeed) {
  const C = frChart(), nd = C.all[id], p = frPlanNow(); if (!nd || !p) return;
  FRV.done = true; FRV.pick = id; FRV.left = 0; FR.at = id;
  Object.assign(p, { kind: nd.kind, rule: nd.rule, look: nd.look, n: nd.c, reach: nd.reach });
  FR.next = frchStop(nd);
  frChartLeg();
  frChartSaid(nd, bySeed);
}
function frChartSaid(nd, bySeed) {
  const r = frchRuleName(nd), L = frchLookName(nd);
  fpsFeed(`${bySeed ? 'The chart' : 'The crew'} chose ${frchNodeName(nd)}${r ? ' (' + r + ')' : ''}: ${L}. Steer for its mark.`);
  ZM.banner = { text: frchNodeName(nd), t: 3, sub: `${r ? r + ' · ' : ''}${L}`, col: '#e8d6a0', small: true };
  try { zmSound('offer'); } catch (e) {}
  FRV.closeT = 1.6;
  frChartPaint();
}
// (hosting or alone, the sail's island not chosen yet as it ends) the seed's choice, or the first vote's
function frChartEnsure() {
  if (FRV.done || FRV.stage !== RAID.stage || !frchOnSail()) return;
  const p = frPlanNow(), o = p ? frChartOpts(p.n) : []; if (!o.length) return;
  const mine = FRV.votes[FPS.me.id]; frChartSettle(o.some(x => x.id === mine) ? mine : o[0].id, true);
}
// the island out there laid out as the one chosen: its look, its lines, its 3D (everyone)
function frChartLeg() {
  if (!GWS_LEG || !frchOnSail()) return;
  const old = GWS_LEG, p = frPlanNow(); if (!p || old.look === p.look) { frchWrapLine(old); return; }
  frsLeg(RAID.stage); const nw = GWS_LEG; GWS_LEG = old;
  for (const k of ['look', 'ground', 'ground2', 'landSay', 'line']) old[k] = nw[k];
  frchWrapLine(old);
  if (typeof GW3 !== 'undefined' && GW3.frI && GW3.frI.parent) { const SG = GW3.frI.parent; SG.remove(GW3.frI); try { frs3dBuild(SG, GW3); } catch (e) {} }
}
// while it's still being chosen, the HUD's line says so
function frchWrapLine(L) {
  if (!L || L.frchBase === L.line) return;
  const base = L.line; L.line = (S, dm) => !FRV.done && S.ph === 'sail' ? 'Out into the fog: the crew is choosing the next island on the chart' : base(S, dm); L.frchBase = L.line;
}
// a vote: mine, or (hosting) a joined player's
function frChartVote(id) {
  if (FRV.done || !frchOnSail()) return;
  id = id | 0; FRV.votes[FPS.me.id] = id;
  raidAsk('vote', id);
  try { zmSound('tick'); } catch (e) {}
  frChartPaint();
}
function frChartQ(sid, a) {
  if (FRV.done || FRV.stage !== RAID.stage) return;
  const p = frPlanNow(), id = a | 0; if (!p || !frChartOpts(p.n).some(o => o.id === id)) return;
  const was = FRV.votes[sid]; FRV.votes[sid] = id;
  if (sid !== FPS.me.id && was !== id) { const nd = frChart().all[id]; fpsFeed(`${gwsNick(sid)} votes for ${frchNodeName(nd)} (${frchLookName(nd)}).`); }
  frChartPaint();
}

// ---------- the word (src/zmnet.js, through frPack and frApplyRun) ----------
function frChartPack(z) {
  if (!FR.on) return;
  const v = []; for (const [sid, id] of Object.entries(FRV.votes)) v.push(sid, id | 0);
  z.frc = [FRV.stage, FRV.done ? 1 : 0, FRV.pick, Math.round(FRV.left * 10), v, FR.at == null ? -1 : FR.at];
}
function frChartApply(hz) {
  const a = hz.frc; if (!Array.isArray(a) || !FR.on) return;
  FR.at = a[5] | 0;
  if ((a[0] | 0) !== RAID.stage || FRV.stage !== RAID.stage) return;
  const votes = {}; if (Array.isArray(a[4])) for (let i = 0; i + 1 < a[4].length; i += 2) votes[String(a[4][i])] = a[4][i + 1] | 0;
  // (my own vote stands on my side until the host has heard it)
  const mine = FRV.votes[FPS.me.id]; if (mine != null && votes[FPS.me.id] == null && !a[1]) votes[FPS.me.id] = mine;
  const changed = JSON.stringify(votes) !== JSON.stringify(FRV.votes);
  FRV.votes = votes; FRV.left = Math.max(0, (a[3] | 0) / 10);
  if (a[1] && !FRV.done) { FRV.done = true; FRV.pick = a[2] | 0; const nd = frChart().all[FRV.pick]; frChartLeg(); if (nd) frChartSaid(nd, !Object.keys(votes).length); }
  else if (changed) frChartPaint();
}

// ---------- the chart, open over the view ----------
function frChartBuild() {
  if ($('frChart')) return $('frChart');
  const o = document.createElement('div');
  o.className = 'overlay pausecard frchart'; o.id = 'frChart'; o.hidden = true;
  o.setAttribute('role', 'dialog'); o.setAttribute('aria-labelledby', 'frChartHead');
  o.innerHTML = `<div class="card"><div class="frchtop"><div><p class="eyebrow" id="frChartEye">Fog Run · the chart</p><h1 id="frChartHead">Where next?</h1></div>`
    + `<button class="tool closebtn" id="frChartClose" type="button" aria-label="Put the chart away">✕</button></div>`
    + `<p class="muted" id="frChartSub"></p><div class="frchmap" id="frChartMap"></div><div class="frchopts" id="frChartOpts"></div>`
    + `<p class="muted frchhint" id="frChartHint"></p></div>`;
  document.body.append(o);
  $('frChartClose').addEventListener('click', () => frChartClose(true));
  return o;
}
function frChartOpen() {
  if (!FR.on) return;
  const o = frChartBuild(); FRV.open = true; o.hidden = false;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
  FRV.padWas = null; frChartPaint();
  setTimeout(() => { const b = o.querySelector('.frchopt'); if (b && !FPS.touch) b.focus({ preventScroll: true }); }, 30);
  const loop = () => { if (!FRV.open) return; frChartPad(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
function frChartClose(relock) {
  FRV.open = false; FRV.closeT = 0;
  const o = $('frChart'); if (o) o.hidden = true;
  if (relock === true && FPS.on && !FPS.touch) try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}
// (src/fps.js keydown, first) the keys while it's open: 1 to 3 vote, Esc puts it away, arrows move between them
function frChartKey(e) {
  if (!FRV.open) return false;
  if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'KeyF') { e.preventDefault(); frChartClose(); return true; }
  const m = /^(Digit|Numpad)([1-4])$/.exec(e.code);
  if (m) { e.preventDefault(); const b = [...document.querySelectorAll('#frChartOpts .frchopt')][+m[2] - 1]; if (b) b.click(); return true; }
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'Space' || e.code === 'Tab') return false;
  return false;
}
// a controller: left and right, A to vote, B to put it away
function frChartPad() {
  if (!FPS.on || !FR.on || !RAID.on) { frChartClose(false); return; }
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
  if (!pad) return;
  const now = pad.buttons.map(x => !!(x && x.pressed)), was = FRV.padWas, ax = pad.axes[0] || 0;
  FRV.padWas = now; now.dir = ax > 0.6 ? 1 : ax < -0.6 ? -1 : 0;
  if (!was) return;
  const bs = [...document.querySelectorAll('#frChartOpts .frchopt')]; if (!bs.length) { if (now[1] && !was[1]) frChartClose(); return; }
  const d = (now[15] && !was[15]) || (now.dir === 1 && was.dir !== 1) ? 1 : (now[14] && !was[14]) || (now.dir === -1 && was.dir !== -1) ? -1 : 0;
  if (d) { FRV.padCur = (FRV.padCur + d + bs.length) % bs.length; bs[FRV.padCur].focus(); }
  if (now[0] && !was[0]) { const b = bs[clamp(FRV.padCur, 0, bs.length - 1)]; if (b) b.click(); }
  if (now[1] && !was[1]) frChartClose();
}
const frchEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// the chart's picture: the reaches across, the stops left to right, the way you've come, where you can go
function frChartSvg(opts, chosen) {
  const C = frChart(), W = 900, Hh = 300, n = C.cols.length, X = c => 70 + (c - 1) * (W - 120) / Math.max(1, n - 1), Y = x => 40 + x * (Hh - 80);
  const ids = FRV.done ? [] : opts.map(o => o.id), path = frchPath(), cur = frPlanNow(), at = C.all[FR.at];
  let s = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="The chart: the route through the fog, left to right">`;
  // the reaches, banded
  let c0 = 1; for (let r = 1; r < FR_REACH.length; r++) {
    const c1 = c0 + FR_REACH[r].stops - 1 + (r === 3 && n > C.N ? 1 : 0), x0 = X(c0) - 34, x1 = Math.min(W - 4, X(c1) + 34);
    s += `<rect x="${x0}" y="6" width="${x1 - x0}" height="${Hh - 12}" rx="8" class="frchband b${r}"/><text x="${(x0 + x1) / 2}" y="${Hh - 14}" class="frchreach">${['', 'I', 'II', 'III'][r]}. ${frchEsc(FR_REACH[r].n)}</text>`;
    c0 = c1 + 1;
  }
  // the Light, where you set out from
  s += `<circle cx="22" cy="${Y(0.5)}" r="9" class="frchlight"/>`;
  for (const nd of C.cols[0]) s += `<line x1="22" y1="${Y(0.5)}" x2="${X(1)}" y2="${Y(nd.x)}" class="frchway${path[0] === nd.id ? ' took' : ''}"/>`;
  for (const col of C.cols) for (const a of col) for (const id of a.to) { const b = C.all[id], took = path.includes(a.id) && path.includes(b.id) && path.indexOf(b.id) === path.indexOf(a.id) + 1; s += `<line x1="${X(a.c)}" y1="${Y(a.x)}" x2="${X(b.c)}" y2="${Y(b.x)}" class="frchway${took ? ' took' : ''}${!took && ids.includes(id) && (at ? at.id === a.id : true) ? ' next' : ''}"/>`; }
  for (const col of C.cols) for (const nd of col) {
    const been = path.includes(nd.id), here = cur && cur.key !== 'frsail' && at && at.id === nd.id, opt = ids.includes(nd.id), pick = chosen === nd.id;
    const cls = ['frchnode', 'k-' + nd.kind, been ? 'been' : '', opt ? 'opt' : '', pick ? 'pick' : '', here ? 'here' : '', !been && !opt && nd.c <= (cur ? cur.n : 0) ? 'gone' : ''].filter(Boolean).join(' ');
    s += `<g class="${cls}"${opt ? ` data-id="${nd.id}"` : ''}><circle cx="${X(nd.c)}" cy="${Y(nd.x)}" r="${nd.kind === 'boss' ? 19 : 15}"/><text x="${X(nd.c)}" y="${Y(nd.x) + 1}">${frchEsc(frchMark(nd))}</text>`
      + `<title>${frchEsc(frchNodeName(nd) + (frchRuleName(nd) ? ', ' + frchRuleName(nd) : '') + ': ' + frchLookName(nd))}</title></g>`;
  }
  return s + '</svg>';
}
// the islands sailed to so far, in order (rebuilt from the plan)
function frchPath() { const out = []; for (let i = 0; i <= Math.min(RAID.stage, FR.plan.length - 1); i++) { const p = FR.plan[i]; if (p && p.key !== 'frsail') { const nd = frChart().cols[p.n - 1] && frChart().cols[p.n - 1].find(o => o.look === p.look && o.kind === p.kind); if (nd) out.push(nd.id); } } if (FRV.done && FRV.pick >= 0 && !out.includes(FRV.pick)) out.push(FRV.pick); return out; }
function frChartPaint() {
  frChartTex();
  const o = $('frChart'); if (!o || o.hidden) return;
  const p = frPlanNow(), opts = p && frchOnSail() ? frChartOpts(p.n) : [], C = frChart(), R = FR_REACH[(opts[0] || p || {}).reach || FR.reach] || FR_REACH[1];
  const hum = ZM.hum || [[FPS.me.id, FPS.nick]], mine = FRV.votes[FPS.me.id];
  $('frChartEye').textContent = `Fog Run · ${R.n} · stop ${p ? p.n : 1} of ${C.cols.length}`;
  $('frChartHead').textContent = FRV.done ? 'Settled' : 'Where next?';
  $('frChartSub').textContent = FRV.done ? 'The crew has its course. Steer for the island’s mark on the strip.'
    : ZM.net && hum.length > 1 ? 'Everyone picks an island. Five seconds after the first vote it’s settled: the most votes wins, and the host breaks a tie.'
    : 'Pick the next island. She sails on while you choose.';
  $('frChartMap').innerHTML = frChartSvg(opts, FRV.done ? FRV.pick : mine);
  for (const g of $('frChartMap').querySelectorAll('g[data-id]')) g.addEventListener('click', () => frChartVote(+g.dataset.id));
  const box = $('frChartOpts'); box.innerHTML = '';
  opts.forEach((nd, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'frchopt k-' + nd.kind + (mine === nd.id ? ' mine' : '') + (FRV.done && FRV.pick === nd.id ? ' pick' : '') + (FRV.done && FRV.pick !== nd.id ? ' lost' : '');
    b.disabled = FRV.done;
    const who = Object.entries(FRV.votes).filter(([, id]) => id === nd.id).map(([sid]) => gwsNick(sid));
    const r = frchRuleName(nd), on = (nd.to || []).map(id => C.all[id]).filter(Boolean);
    b.innerHTML = `<span class="mk">${frchEsc(frchMark(nd))}</span><span class="nm">${frchEsc(frchNodeName(nd))}</span>`
      + `<span class="tg">${frchEsc((r ? r + ' · ' : '') + frchLookName(nd))}</span>`
      + (on.length ? `<span class="on">Then: ${on.map(x => frchEsc(frchMark(x) + ' ' + frchNodeName(x))).join(', ')}</span>` : '')
      + `<span class="vt">${who.length ? who.map(frchEsc).join(', ') : FRV.done ? '' : (FPS.touch ? 'Tap' : 'Key ' + (i + 1)) + ' to vote'}</span>`;
    b.addEventListener('click', () => frChartVote(nd.id));
    box.append(b);
  });
  if (!opts.length) box.innerHTML = `<p class="muted">${p && p.key !== 'frsail' ? 'Ashore. The chart opens again at sea.' : 'Nothing more to choose.'}</p>`;
  $('frChartHint').textContent = FRV.done ? '' : (FRV.first >= 0 ? `Settled in ${Math.ceil(FRV.left)} s. ` : '') + (FPS.touch ? 'Tap ✕ to put it away; the chart table on deck opens it again.' : 'Esc puts it away; Use at the chart table on deck opens it again.');
}

// ---------- each frame, everyone ----------
function frChartMe(dt) {
  if (!FR.on) return;
  if (FRV.open && FRV.closeT > 0) { FRV.closeT -= dt; if (FRV.closeT <= 0) frChartClose(); }
  if (FRV.open && (!frchOnSail() || ZM.over)) frChartClose(false);
  // (the countdown, once a second)
  if (FRV.open && !FRV.done) { const s = Math.ceil(FRV.left); if (s !== FRV.lastS) { FRV.lastS = s; const h = $('frChartHint'); if (h && (FRV.first >= 0 || Object.keys(FRV.votes).length)) frChartPaint(); } }
}
// (the sail's HUD) while it's being chosen: a line, and how long it has
function frChartHud(phone, mono, fell) {
  if (FRV.done || !frchOnSail() || FRV.stage !== RAID.stage || ZM.over) return;
  const p = frPlanNow(), opts = p ? frChartOpts(p.n) : []; if (opts.length < 2) return;
  const n = Object.keys(FRV.votes).length, y = H * (phone ? 0.24 : 0.2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = fell(phone ? 15 : 20); ctx.fillStyle = 'rgba(232,214,160,0.92)';
  ctx.fillText(FRV.open ? 'Choosing the next island' : 'Choose the next island at the chart table', cx, y);
  ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,228,207,0.7)';
  ctx.fillText(`${opts.map(frchNodeName).join('  ·  ')}${n ? `   ·   ${n} ${n === 1 ? 'vote' : 'votes'}, settled in ${Math.ceil(FRV.left)} s` : ''}`, cx, y + (phone ? 20 : 27));
  ctx.textBaseline = 'alphabetic';
}

// ---------- the chart table on deck ----------
const frchTableIn = (u, v, p) => Math.abs(u - FRCH.TABLE[0]) < 0.55 + p && Math.abs(v - FRCH.TABLE[1]) < 0.42 + p;
// its top: the chart drawn small, redrawn as it changes
function frChartTex() {
  if (typeof THREE === 'undefined' || !FRV.tex || !FR.on) return;
  const C = frChart(), key = C.key + ':' + FR.at + ':' + FRV.pick + ':' + RAID.stage; if (FRV.texKey === key) return; FRV.texKey = key;
  const cvs = FRV.tex.image, x = cvs.getContext('2d'), W = cvs.width, Hh = cvs.height, n = C.cols.length;
  x.fillStyle = '#c8b68a'; x.fillRect(0, 0, W, Hh);
  x.strokeStyle = 'rgba(90,64,36,0.5)'; x.lineWidth = 6; x.strokeRect(6, 6, W - 12, Hh - 12);
  const X = c => 40 + (c - 1) * (W - 70) / Math.max(1, n - 1), Y = v => 30 + v * (Hh - 60), path = frchPath();
  for (const col of C.cols) for (const a of col) for (const id of a.to) { const b = C.all[id]; x.strokeStyle = path.includes(a.id) && path.includes(b.id) ? '#8a2a1a' : 'rgba(70,52,30,0.55)'; x.lineWidth = path.includes(b.id) ? 4 : 2; x.beginPath(); x.moveTo(X(a.c), Y(a.x)); x.lineTo(X(b.c), Y(b.x)); x.stroke(); }
  for (const col of C.cols) for (const nd of col) { x.fillStyle = path.includes(nd.id) ? '#8a2a1a' : '#4a3620'; x.beginPath(); x.arc(X(nd.c), Y(nd.x), nd.kind === 'boss' ? 11 : 8, 0, 6.283); x.fill(); }
  FRV.tex.needsUpdate = true;
}
function frChartTable3d() {
  if (typeof THREE === 'undefined' || typeof GW3 === 'undefined' || !GW3.DG) return;
  const D = GWS.D, [u, v] = FRCH.TABLE, lam = c => z3Lam(c), wood = lam('#4a3826'), T = new THREE.Group(); T.position.copy(gdv(u, v, D)); GW3.DG.add(T);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.8), lam('#5a4632')); top.position.y = 0.86; T.add(top);
  for (const [a, b] of [[-0.48, -0.33], [0.48, -0.33], [-0.48, 0.33], [0.48, 0.33]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.84, 0.07), wood); l.position.set(a, 0.42, b); T.add(l); }
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 340;
  FRV.tex = new THREE.CanvasTexture(cvs); FRV.texKey = '';
  const map = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.68), new THREE.MeshLambertMaterial({ map: FRV.tex, emissive: 0x2a2010 })); map.rotation.x = -Math.PI / 2; map.rotation.z = Math.PI / 2; map.position.y = 0.895; T.add(map);
  // a candle in a brass stick at its corner, to read it by
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.08, 10), lam('#9a7a34')); st.position.set(0.44, 0.93, -0.3); T.add(st);
  const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), lam('#e8dcc0')); cd.position.set(0.44, 1.04, -0.3); T.add(cd);
  if (GW3.glowSp) { const f = GW3.glowSp(0xffd890, 0.35); f.position.set(0.44, 1.14, -0.3); T.add(f); }
  frChartTex();
}

// ---------- round the sail's own hooks (src/frsail.js) ----------
(() => {
  const S0 = RAID_STAGES.frsail, w = {};
  for (const k of ['enter', 'tick', 'me', 'q', 'hud', 'consider', 'prompt', 'use', 'block', 'b3']) w[k] = S0[k];
  Object.assign(S0, {
    enter() { w.enter.call(this); frChartBegin(); if (GWS_LEG) frchWrapLine(GWS_LEG); },
    tick(dt) { w.tick.call(this, dt); frChartTick(dt); },
    me(dt) { w.me.call(this, dt); frChartMe(dt); },
    q(sid, k, a) { if (k === 'vote') frChartQ(sid, a); else w.q.call(this, sid, k, a); },
    hud(phone, mono, fell) { w.hud.call(this, phone, mono, fell); frChartHud(phone, mono, fell); },
    consider(c) { w.consider.call(this, c); const [x, y] = gwsW(FRCH.TABLE[0], FRCH.TABLE[1]); c({ k: 'frchart' }, x, y, GWS.D, 1.6, false); },
    prompt(o) { if (o.k === 'frchart') return { text: FRV.done ? 'Look at the chart' : 'Open the chart and vote for the next island', free: true }; return w.prompt.call(this, o); },
    use(o) { if (o.k === 'frchart') { if (FRV.open) frChartClose(); else frChartOpen(); return true; } return w.use.call(this, o); },
    block(x, y, pad, feet) { if (w.block.call(this, x, y, pad, feet)) return true; const [u, v] = gwsL(x, y); return frchTableIn(u, v, Math.min(pad || 0, 0.4)); },
    b3(grp) { w.b3.call(this, grp); try { frChartTable3d(); } catch (e) {} },
  });
})();
