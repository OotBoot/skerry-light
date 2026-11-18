'use strict';
// Skerry Clash for three (1v1v1, v208): three keepers on one round skerry, every keeper for themselves. The rock is
// split three ways by three channels that run out from a pool in the middle, each crossed by one causeway, so every
// keeper has two neighbours and a lane to each: a Lamp Tower guards each causeway and the Great Light stands at the
// back of each rock. Last keeper with a Great Light burning wins; at time, the keeper with the most towers standing
// wins, and if the most are level it's a minute of overtime between them (the next tower to fall that breaks the tie
// wins), then the one whose towers have the most health left. A fallen Great Light puts that keeper out: their other
// towers crumble and their crews vanish. Against two bots, or online with up to three keepers (the host's screen
// runs the match as in the duel, src/rlnet.js, and a bot takes any seat no one fills). It isn't rated, and it doesn't
// count in the duel record; it earns tower crates as a duel does (one for finishing, one more for winning).
//
// This file is all that's different about the three-way match, and src/rl.js calls into it whenever RL.n3 is set:
// where the water is (rl3Wet), whose rock a point is on (rl3Bank), the way over a causeway (rl3Way), keeping walkers
// out of the water (rl3Water), where cards may go down (rl3CanPlace), what a troop goes for (rl3Foe, rl3LaneTower),
// towers falling and keepers going out (rl3Down, rl3Out), the clock running out (rl3Time), the finishing order
// (rl3Rank), the bot for three (rl3BotTick), and the rock itself in 3D (rl3dArena3, built once and shown by src/rl3d.js
// in place of the duel's two rocks).
// The arena: tiles as in the duel, the middle of the skerry at (9, 16), the rock's edge 15.5 tiles out. Keeper s sits
// at the angle -90° + 120° s from the middle (keeper 0 at the bottom, 1 to the upper right, 2 to the upper left).
// Channel k runs out between keeper k and keeper k + 1 (at the angle of keeper k plus 60°), two tiles wide; its
// causeway crosses it 8.5 tiles out, two tiles wide. A Lamp Tower stands 7 tiles back from the middle of its
// channel, square to its causeway, and is tower lane k. In RL.T each keeper's three come together: the Great Light,
// then the lamp on channel s, then the lamp on channel s + 2.
// RL for three adds: n3 true, alive [1, 1, 1] (0 once out), outs (the order they went out), bots (the seats a bot
// plays, on the host's screen), and every per-keeper array has three. RL.win is the winning keeper, or 3 for a draw.
// FX: 'crown' { side who put the light out, r the keeper whose light it was, plus one }, 'out' { side } a keeper out.

const RL3C = { R: 15.5, P: 2.6, WH: 1, RC: 8.5, CW: 1, LD: 7, GR: 13, POCKET: 4, CX: 9, CY: 16, LIP: 2.2, TW: 0.8 };   // (TW: towers have four fifths of a duel's health, as each keeper's oil is split two ways)
const RL3_BOTNM = { easy: ['Apprentice Pell', 'Apprentice Wren'], normal: ['Keeper Morrow', 'Keeper Haldane'], hard: ['Old Grisewood', 'Mother Carey'] };
const RL_GOLD = 0xe8b030;
const rl3Phi = s => (-90 + 120 * s) * Math.PI / 180;
// each channel's way out from the middle (dx, dy) and its normal (nx, ny), which points into keeper b's rock (a is
// the keeper on the other side)
const RL3W = (() => { const ch = []; for (let k = 0; k < 3; k++) { const an = rl3Phi(k) + Math.PI / 3, dx = Math.cos(an), dy = Math.sin(an); ch.push({ k, an, dx, dy, nx: -dy, ny: dx, a: k, b: (k + 1) % 3 }); } return { ch }; })();
// a point against channel k: how far out along it, and how far off it (plus towards keeper b)
function rl3Loc(k, x, y) { const c = RL3W.ch[k], px = x - RL3C.CX, py = y - RL3C.CY; return [px * c.dx + py * c.dy, px * c.nx + py * c.ny]; }
function rl3Pt(k, a, q) { const c = RL3W.ch[k]; return [RL3C.CX + c.dx * a + c.nx * q, RL3C.CY + c.dy * a + c.ny * q]; }
// the channel between two keepers, and which way off it a keeper's rock lies
const rl3Shared = (s, e) => ((e - s + 3) % 3 === 1 ? s : e);
const rl3Sgn = (k, s) => (RL3W.ch[k].b === s ? 1 : -1);
// whose rock a point is on (by its angle from the middle, water or not)
function rl3Bank(x, y) { const a = Math.atan2(y - RL3C.CY, x - RL3C.CX); const s = Math.round((a - rl3Phi(0)) / (2 * Math.PI / 3)); return ((s % 3) + 3) % 3; }
// which channel's strip a point is in (water or causeway), or -1
function rl3Strip(x, y, wh) { const w = wh == null ? RL3C.WH : wh; for (let k = 0; k < 3; k++) { const [a, q] = rl3Loc(k, x, y); if (a > 0 && Math.abs(q) < w) return k; } return -1; }
// is it water? (the pool in the middle, or a channel off its causeway; hw how far from the causeway's middle counts)
function rl3Wet(x, y, hw) {
  if (Math.hypot(x - RL3C.CX, y - RL3C.CY) < RL3C.P) return true;
  const k = rl3Strip(x, y); if (k < 0) return false;
  return Math.abs(rl3Loc(k, x, y)[0] - RL3C.RC) > (hw == null ? RL3C.CW : hw);
}
const rl3Fwd = s => [-Math.cos(rl3Phi(s)), -Math.sin(rl3Phi(s))];
// the colour a keeper is drawn in on this screen: 0 yours (blue), 1 the next keeper round (red), 2 the other (gold)
function rlRel(side) { return !RL.n3 ? (side === RL.me ? 0 : 1) : (side - RL.me + 3) % 3; }
function rlSideHex(side) { return [RL_MINE, RL_THEIRS, RL_GOLD][rlRel(side)]; }
// which way a keeper's troops face when they're set down (towards the middle), and how its towers are turned
function rlFace0(side) { if (RL.n3) { const f = rl3Fwd(side); return Math.atan2(f[0], f[1]); } return side ? Math.PI : 0; }
function rlRotY(side) { if (RL.n3) { const a = rl3Phi(side); return Math.atan2(Math.cos(a), -Math.sin(a)); } return side ? Math.PI : 0; }

// ---------- the towers ----------
function rl3TowerPos() {
  const out = [], C = RL3C;
  for (const s of [0, 1, 2]) {
    out.push({ side: s, k: 'great', lane: -1, x: C.CX + Math.cos(rl3Phi(s)) * C.GR, y: C.CY + Math.sin(rl3Phi(s)) * C.GR });
    for (const k of [s, (s + 2) % 3]) { const [x, y] = rl3Pt(k, C.RC, rl3Sgn(k, s) * C.LD); out.push({ side: s, k: 'lamp', lane: k, x, y }); }
  }
  return out;
}
function rl3Towers() { return rl3TowerPos().map(p => { const t = rlTower(p.side, p.k, p.lane, p.x, p.y); t.hp = t.max = Math.round(t.max * RL3C.TW); return t; }); }

// ---------- the ground ----------
function rl3Clamp(u) { const dx = u.x - RL3C.CX, dy = u.y - RL3C.CY, r = Math.hypot(dx, dy), m = RL3C.R - 0.3; if (r > m) { u.x = RL3C.CX + dx / r * m; u.y = RL3C.CY + dy / r * m; } }
// keep a walker out of the water: on a causeway, or back on the bank it came from (as rlWater does for the duel)
function rl3Water(u) {
  rl3Clamp(u);
  if (u.air) return;
  const W = RL3C.WH, RC = RL3C.RC, hw = RL3C.CW - Math.min(0.45, (u.size || 0.4) * 0.6);
  for (let it = 0; it < 2; it++) {
    const px = u.x - RL3C.CX, py = u.y - RL3C.CY, r = Math.hypot(px, py);
    if (r < RL3C.P) { const f = rl3Fwd(u.side || 0), dx = r > 1e-3 ? px / r : -f[0], dy = r > 1e-3 ? py / r : -f[1]; u.x = RL3C.CX + dx * (RL3C.P + 0.02); u.y = RL3C.CY + dy * (RL3C.P + 0.02); continue; }
    const k = rl3Strip(u.x, u.y); if (k < 0) return;
    const [a, q] = rl3Loc(k, u.x, u.y); if (Math.abs(a - RC) <= hw) return;
    const [pa, pq] = rl3Loc(k, u.px == null ? u.x : u.px, u.py == null ? u.y : u.py);
    if (Math.abs(pa - RC) <= hw + 0.05 && Math.abs(pq) < W + 0.05) { [u.x, u.y] = rl3Pt(k, RC + Math.sign(a - RC) * hw, q); return; }
    const da = Math.abs(a - RC) - hw, dq = W - Math.abs(q);
    if (da < dq && da < 0.6) [u.x, u.y] = rl3Pt(k, RC + Math.sign(a - RC) * hw, q);
    else [u.x, u.y] = rl3Pt(k, a, (Math.sign(pq) || Math.sign(q) || 1) * W);
    return;
  }
}
// the straight way from a to b is all dry rock (a leap never crosses the water)
function rl3Dry(ax, ay, bx, by) { for (let i = 0; i <= 8; i++) if (rl3Wet(ax + (bx - ax) * i / 8, ay + (by - ay) * i / 8)) return false; return true; }
// a troop set down here lands on dry rock (on its own keeper's bank, or the nearer one for a Shipwreck's crew)
function rl3Fix(x, y, side, near, air) {
  const u = { x, y, px: x, py: y, air, side, size: 0.4 }; rl3Clamp(u); if (air) return [u.x, u.y];
  const r = Math.hypot(u.x - RL3C.CX, u.y - RL3C.CY);
  if (r < RL3C.P + 0.2) { const f = rl3Fwd(side), dx = r > 1e-3 ? (u.x - RL3C.CX) / r : -f[0], dy = r > 1e-3 ? (u.y - RL3C.CY) / r : -f[1]; u.x = RL3C.CX + dx * (RL3C.P + 0.3); u.y = RL3C.CY + dy * (RL3C.P + 0.3); }
  const k = rl3Strip(u.x, u.y);
  if (k >= 0 && rl3Wet(u.x, u.y)) { const c = RL3W.ch[k], [a, q] = rl3Loc(k, u.x, u.y), sg = near || (side !== c.a && side !== c.b) ? (q >= 0 ? 1 : -1) : rl3Sgn(k, side); [u.x, u.y] = rl3Pt(k, a, sg * (RL3C.WH + 0.2)); }
  rl3Clamp(u); return [u.x, u.y];
}
// moved by a spell or a blast: never off the bank it stands on (along a causeway it may go)
function rl3Drag(u, nx, ny) {
  if (u.bld) return;
  let tx = nx, ty = ny;
  if (!u.air && rl3Strip(u.x, u.y) < 0) {
    const b0 = rl3Bank(u.x, u.y), good = (x, y) => rl3Strip(x, y) < 0 && rl3Bank(x, y) === b0 && Math.hypot(x - RL3C.CX, y - RL3C.CY) >= RL3C.P;
    if (!good(nx, ny)) { let lo = 0, hi = 1; for (let i = 0; i < 7; i++) { const m = (lo + hi) / 2; if (good(u.x + (nx - u.x) * m, u.y + (ny - u.y) * m)) lo = m; else hi = m; } tx = u.x + (nx - u.x) * lo; ty = u.y + (ny - u.y) * lo; }
  }
  u.px = u.x; u.py = u.y; u.x = tx; u.y = ty; rl3Water(u); u.lock = 0;
}
// where a walker heads for, to reach (tx, ty): over the causeway between the two rocks if they differ
function rl3Way(u, tx, ty) {
  if (u.air) return [tx, ty];
  const W = RL3C.WH, RC = RL3C.RC, bt = rl3Bank(tx, ty), k0 = rl3Strip(u.x, u.y);
  if (k0 >= 0) {
    // on a causeway: off it on the target's side (or whichever side the target lies off it)
    const c = RL3W.ch[k0], out = bt === c.b ? 1 : bt === c.a ? -1 : (rl3Loc(k0, tx, ty)[1] >= 0 ? 1 : -1), ta = rl3Loc(k0, tx, ty)[0];
    return rl3Pt(k0, RC + Math.max(-0.5, Math.min(0.5, ta - RC)) * 0.4, out * (W + 0.5));
  }
  const bu = rl3Bank(u.x, u.y); if (bu === bt) return [tx, ty];
  const k = rl3Shared(bu, bt), su = rl3Sgn(k, bu), [a, q] = rl3Loc(k, u.x, u.y), eq = su * (W + 0.35);
  if (Math.abs(a - RC) < 0.65 && Math.abs(q - eq) < 0.9) return rl3Pt(k, RC, -su * (W + 0.5));
  return rl3Pt(k, RC, eq);
}
// may this keeper set this card down here? (spells anywhere on the rock; the rest on your own rock, or in the
// pocket opened on a neighbour's rock by their causeway once their Lamp Tower there has fallen)
function rl3CanPlace(side, c, x, y) {
  const C = RL_CARD[c]; if (!C || !(Math.hypot(x - RL3C.CX, y - RL3C.CY) <= RL3C.R - 0.4)) return false;
  if (C.type === 'spell' && C.ab !== 'summon') return true;
  if (!RL.alive[side] || rl3Wet(x, y) || rl3Strip(x, y, RL3C.WH + 0.1) >= 0) return false;
  const b = rl3Bank(x, y); let ok = b === side;
  if (!ok) { const k = rl3Shared(side, b), [a, q] = rl3Loc(k, x, y), L = RL.T.find(t => t.side === b && t.k === 'lamp' && t.lane === k); ok = (!L || L.hp <= 0) && a > 0 && Math.abs(q) < RL3C.WH + RL3C.POCKET; }
  if (!ok) return false;
  for (const t of RL.T) if (t.hp > 0 && Math.hypot(x - t.x, y - t.y) < t.r + 0.35) return false;
  return true;
}
// which keeper a troop is going for: the one whose rock it's on; else the one it was going for; else the neighbour
// across the channel nearer where it was set down (the other neighbour if that one's out)
function rl3Foe(u) {
  const s = u.side, al = RL.alive, ok = e => e >= 0 && e !== s && !!al[e], st = rl3Strip(u.x, u.y), b = rl3Bank(u.x, u.y);
  if (b !== s && st < 0 && ok(b)) return (u.foe = b);
  if (ok(u.foe)) return u.foe;
  let k = st;
  if (k < 0) { const k2 = (s + 2) % 3; k = Math.abs(rl3Loc(s, u.x, u.y)[1]) <= Math.abs(rl3Loc(k2, u.x, u.y)[1]) ? s : k2; }
  const c = RL3W.ch[k]; let e = c.a === s ? c.b : c.b === s ? c.a : (rl3Loc(k, u.x, u.y)[1] >= 0 ? c.b : c.a);
  if (!ok(e)) e = [0, 1, 2].find(ok);
  return (u.foe = e == null ? -1 : e);
}
// the next tower a troop goes for, failing anything nearer: that keeper's Lamp Tower on the channel between them, then
// their Great Light, then whatever enemy tower is nearest
function rl3LaneTower(u) {
  const e = rl3Foe(u), s = u.side;
  if (e >= 0) { const k = rl3Shared(s, e); const L = RL.T.find(t => t.side === e && t.k === 'lamp' && t.lane === k && t.hp > 0) || RL.T.find(t => t.side === e && t.k === 'great' && t.hp > 0); if (L) return L; }
  let best = null, bd = 1e9; for (const t of RL.T) if (t.side !== s && t.hp > 0) { const d = rlD(u, t); if (d < bd) { bd = d; best = t; } }
  return best;
}

// ---------- towers falling, keepers going out, the end ----------
// a tower has just fallen (rlDeaths): a crown to whoever struck it last, the Great Light woken, or the keeper out
function rl3Down(t) {
  const by = t.by != null && t.by >= 0 && t.by !== t.side && RL.alive[t.by] ? t.by : -1;
  rlFx('tower', { c: t.k, x: t.x, y: t.y, side: t.side, r: RL.T.indexOf(t) });
  if (by >= 0) { RL.crowns[by]++; rlFx('crown', { x: t.x, y: t.y, side: by, r: t.side + 1 }); }
  if (t.k === 'great') rl3Out(t.side);
  else { const g = RL.T.find(q => q.side === t.side && q.k === 'great'); if (g) g.awake = true; }
}
function rl3Out(s) {
  if (!RL.alive[s]) return;
  RL.alive[s] = 0; RL.outs.push(s); RL.oil[s] = 0;
  for (const t of RL.T) if (t.side === s && t.hp > 0 && !t.down) { t.hp = 0; t.down = 1; rlFx('tower', { c: t.k, x: t.x, y: t.y, side: s, r: RL.T.indexOf(t) }); }
  // (their crews go with them: none rises again, nothing comes out of them)
  for (const u of RL.U) if (u.side === s && u.hp > 0) { u.hp = 0; u.rv = 1; }
  const g = RL.T.find(t => t.side === s && t.k === 'great');
  rlFx('out', { x: g ? g.x : 9, y: g ? g.y : 16, side: s });
}
// a keeper who has left an online match is out (the host calls this; no one is given the crown)
function rl3Leave(s) { if (!RL.on || !RL.n3 || !RL.alive[s] || RL.ph === 'over') return; const g = RL.T.find(t => t.side === s && t.k === 'great'); if (g) { g.by = -1; g.hp = 0; } }
const rl3Standing = s => RL.T.filter(t => t.side === s && t.hp > 0).length;
// the one keeper with the most towers standing, or -1 if the most are level
function rl3Lead() {
  const al = [0, 1, 2].filter(s => RL.alive[s]); if (al.length === 1) return al[0];
  const n = al.map(rl3Standing), m = Math.max(...n), top = al.filter((s, i) => n[i] === m);
  return top.length === 1 ? top[0] : -1;
}
// after every tick's deaths: one keeper left wins; in overtime, the tie broken wins
function rl3Check() {
  if (RL.ph !== 'play') return;
  const al = [0, 1, 2].filter(s => RL.alive[s]);
  if (al.length <= 1) { rlEnd(al.length ? al[0] : 3); return; }
  if (RL.ot) { const l = rl3Lead(); if (l >= 0) rlEnd(l); }
}
// the clock has run out: the most towers standing wins; level, overtime; still level, the most health left
function rl3Time() {
  const l = rl3Lead(); if (l >= 0) { rlEnd(l); return; }
  if (!RL.ot) { RL.ot = true; RL.left = RLC.OT; rlFx('ot', { x: 9, y: 16, side: 0 }); return; }
  const al = [0, 1, 2].filter(s => RL.alive[s]), m = Math.max(...al.map(rl3Standing)), top = al.filter(s => rl3Standing(s) === m);
  const hp = s => RL.T.filter(t => t.side === s && t.hp > 0).reduce((a, t) => a + t.hp / t.max, 0);
  top.sort((a, b) => hp(b) - hp(a));
  rlEnd(top.length > 1 && hp(top[0]) - hp(top[1]) < 0.005 ? 3 : top[0]);
}
// the finishing order: the winner, the others still standing by their towers, then those out, the last out first
function rl3Rank() {
  const sc = s => RL.T.filter(t => t.side === s && t.hp > 0).reduce((a, t) => a + 1000 + t.hp / t.max, 0);
  const al = [0, 1, 2].filter(s => RL.alive[s] && !(RL.outs || []).includes(s)).sort((a, b) => (b === RL.win) - (a === RL.win) || sc(b) - sc(a));
  const out = (RL.outs || []).slice().reverse(); for (const s of [0, 1, 2]) if (!al.includes(s) && !out.includes(s)) out.push(s);
  return al.concat(out);
}
function rl3End(win) {
  if (!rlIsGuest()) rlFx('end', { x: 9, y: 16, side: win === 3 ? 0 : win, r: win });
  const me = RL.me, place = rl3Rank().indexOf(me) + 1;
  const rec = { win: win === me, draw: win === 3, crowns: RL.crowns[me], lost: 3 - rl3Standing(me), bot: RL.mode === 'bot', lvl: RL.bot.lvl, n3: true, place };
  if (!RL.recorded && !(RL.net && RL.net.gone) && !rlIsSpec() && typeof rlRecord === 'function') { RL.recorded = true; try { rlRecord(rec); } catch (e) { console.error(e); } }
  rlSnd(win === 3 ? 'draw' : win === me || rlIsSpec() ? 'win' : 'lose');
  if (typeof rlHudEnd === 'function') setTimeout(() => { if (RL.on && RL.ph === 'over') rlHudEnd(); }, 1600);
}
// against two bots: my deck and skin, a deck each for them, the level from the title card's select
function rl3PlayBot(lvl) {
  lvl = lvl || ($('rlBotLvl') && $('rlBotLvl').value) || 'normal'; if (!RL3_BOTNM[lvl]) lvl = 'normal';
  const mine = typeof rlDeckMine === 'function' ? rlDeckMine() : RL_DEFAULT_DECK, sk = typeof rlSkinMine === 'function' ? rlSkinMine() : '', bd = () => typeof rlBotDeck === 'function' ? rlBotDeck(lvl) : RL_DEFAULT_DECK;
  rlStart({ mode: 'bot', n3: true, me: 0, names: [rlMyName(), RL3_BOTNM[lvl][0], RL3_BOTNM[lvl][1]], decks: [mine, bd(), bd()], skins: [sk || '', '', ''], lvl, bots: [1, 2] });
}

// ---------- the bot for three ----------
// It plays as the duel's bot does (src/rlbot.js: defend first, spells on clumps, finish a tower, then push), but in
// the world's own coordinates: it answers anything on its rock a little behind the threat, towards its Great Light,
// and pushes at whichever neighbour is weaker, over the causeway between them.
function rl3BotTick(dt, side) {
  if (!RL.alive[side]) return;
  if (!RLB.S[side]) RLB.S[side] = { t: 0.8 + Math.random() * 0.6, seen: new Map(), lane: -1, pushT: 0, foe: -1 };
  const B = RLB.S[side], L = RLB.lv[RL.fp ? (RL.mode === 'bot' && side !== RL.me ? RL.bot.lvl : 'normal') : side === RL.me && RL.both ? 'hard' : RL.bot.lvl] || RLB.lv.normal;   // (first person, src/rlfp.js: your own keeper's bot plays at Normal)
  B.t -= dt; if (B.t > 0) return; B.t = L.think * (0.8 + Math.random() * 0.4);
  if (typeof rlBotChamp === 'function' && rlBotChamp(side, L)) return;
  const G = RL.T.find(t => t.side === side && t.k === 'great'); if (!G) return;
  const oil = RL.oil[side], hand = RL.hand[side].map(c => RL_CARD[c]).filter(Boolean), can = C => C && C.cost <= oil + 1e-6;
  const foes = RL.U.filter(u => u.side !== side && u.hp > 0), mine = RL.U.filter(u => u.side === side && u.hp > 0);
  const jit = v => v + (Math.random() - 0.5) * 2 * L.slop;
  // set down at (x, y), or a little nearer the Great Light if that isn't allowed
  const play = (C, x, y) => { x = jit(x); y = jit(y); for (let k = 0; k < 8; k++) { const f = k * 0.13; if (rlPlay(side, C.id, x + (G.x - x) * f, y + (G.y - y) * f)) return true; } return false; };
  const toward = (x, y, d) => { const dx = G.x - x, dy = G.y - y, r = Math.hypot(dx, dy) || 1; return [x + dx / r * Math.min(d, r - 2), y + dy / r * Math.min(d, r - 2)]; };
  const now = RL.clk; for (const u of foes) if (!B.seen.has(u.id)) B.seen.set(u.id, now); if (B.seen.size > 200) for (const [id] of B.seen) if (!RL.U.some(u => u.id === id)) B.seen.delete(id);
  const known = u => now - B.seen.get(u.id) >= L.react;
  const onMine = u => rl3Bank(u.x, u.y) === side && Math.hypot(u.x - RL3C.CX, u.y - RL3C.CY) > RL3C.P + 1.5 || RL.T.some(t => t.side === side && t.hp > 0 && rlD(t, u) < 7);
  // ---- 1. defend what's on my rock (by the lane it's in)
  const threat = foes.filter(u => !u.bld && known(u) && onMine(u));
  if (threat.length) {
    const laneOf = u => { const k2 = (side + 2) % 3; return Math.abs(rl3Loc(side, u.x, u.y)[1]) <= Math.abs(rl3Loc(k2, u.x, u.y)[1]) ? side : k2; };
    const w0 = threat.filter(u => laneOf(u) === side).reduce((a, u) => a + u.hp, 0), w1 = threat.filter(u => laneOf(u) !== side).reduce((a, u) => a + u.hp, 0);
    const lane = w0 >= w1 ? side : (side + 2) % 3, T = threat.filter(u => laneOf(u) === lane), air = T.some(u => u.air), w = T.reduce((a, u) => a + u.hp, 0);
    const near = mine.filter(u => !u.bld && laneOf(u) === lane && rl3Bank(u.x, u.y) === side).reduce((a, u) => a + u.hp, 0);
    if (w > near * 0.7) {
      const cx = T.reduce((a, u) => a + u.x, 0) / T.length, cy = T.reduce((a, u) => a + u.y, 0) / T.length;
      let opts = hand.filter(C => can(C) && C.type !== 'spell' && !rlBotNoFight(C) && (!air || C.tg === 'any' && C.dmg > 0));
      if (air && !opts.length) opts = hand.filter(C => can(C) && C.type === 'spell' && C.dmg > 0 && C.ab !== 'wave' && C.ab !== 'pull' && C.ab !== 'whirl');
      if (!air) opts = opts.filter(C => C.tg !== 'build');
      if (opts.length) {
        const C = Math.random() < L.rnd ? opts[(Math.random() * opts.length) | 0] : opts.sort((a, b) => rlBotVal(b) / b.cost - rlBotVal(a) / a.cost + (a.cost - b.cost) * (w > 1500 ? -0.4 : 0.15))[0];
        if (C.type === 'spell') { if (rlPlay(side, C.id, cx, cy)) return; }
        else { const back = C.type === 'building' ? (C.minr ? C.minr + 1.5 : C.ab === 'tar' ? 1.5 : 3) : C.rng >= 3 ? 4 : 1.6, [x, y] = toward(cx, cy, back); if (play(C, x, y)) return; }
      }
    }
  }
  // ---- 2. a spell on a clump; 3. a tower low enough to finish
  const spells = hand.filter(C => can(C) && C.type === 'spell' && C.dmg > 0);
  for (const C of spells) {
    let best = null, bv = 0; const D = rlBotDmg(C), walk = C.ab === 'pull' || C.ab === 'whirl';
    for (const u of foes) {
      if (!known(u)) continue;
      const lead = C.ab === 'lob' ? (C.fl || 1) * L.lead : 0, ux = u.x + (u.x - (u.px == null ? u.x : u.px)) / RLC.DT * lead, uy = u.y + (u.y - (u.py == null ? u.y : u.py)) / RLC.DT * lead;
      let v = 0; for (const e of foes) if (Math.hypot(e.x - ux, e.y - uy) <= C.r * 0.9) v += Math.min(e.hp, D) * (RL_CARD[e.c].cost || 1) / Math.max(1, e.max) * (walk && (e.air || e.bld) ? 0.4 : 1);
      if (v > bv) { bv = v; best = [ux, uy]; }
    }
    if (best && bv >= (C.ab === 'bolts' ? C.cost * 0.75 : C.cost * 0.9) && rlPlay(side, C.id, best[0], best[1])) return;
  }
  for (const C of spells) { const t = RL.T.filter(t => t.side !== side && t.hp > 0 && t.hp <= rlBotDmg(C) * C.tw).sort((a, b) => a.hp - b.hp)[0]; if (t && rlPlay(side, C.id, t.x, t.y)) return; }
  // ---- 3b. Lamp Oil on my hurt fighters, Fair Wind on a push
  for (const C of hand.filter(C => can(C) && (C.ab === 'mend' || C.ab === 'haste'))) {
    let best = null, bv = 0;
    for (const u of mine) { if (u.bld) continue; let v = 0; for (const f of mine) if (!f.bld && Math.hypot(f.x - u.x, f.y - u.y) <= C.r * 0.85) v += C.ab === 'mend' ? (f.st === 'hit' ? Math.min(f.max - f.hp + C.hl * C.dur * 0.5, C.hl * C.dur) : 0) : (rl3Bank(f.x, f.y) !== side ? f.hp : 0); if (v > bv) { bv = v; best = [u.x, u.y]; } }
    if (best && bv >= (C.ab === 'mend' ? 900 : 1800) && rlPlay(side, C.id, best[0], best[1])) return;
  }
  // ---- 3c. an Oil Store behind the Great Light while it's quiet
  const back = [G.x - rl3Fwd(side)[0] * 1.3, G.y - rl3Fwd(side)[1] * 1.3];
  if (!threat.length) for (const C of hand.filter(C => can(C) && C.ab === 'oil' && oil >= 8)) { if (!mine.some(u => u.c === C.id) && play(C, back[0] + (Math.random() - 0.5) * 4, back[1])) return; }
  // ---- 4. a push at the weaker neighbour, over the causeway between us
  const others = [0, 1, 2].filter(s => s !== side && RL.alive[s]); if (!others.length) return;
  const theirs = Math.max(...others.map(s => RL.oil[s])), ahead = L.keep ? oil - theirs >= 1.5 : false, push = L.push - (RL.dbl ? 1.5 : 0) - (RL.ot ? 1.5 : 0);
  if (oil >= push || (ahead && oil >= push - 2) || oil >= 9.6) {
    if (!RL.alive[B.foe] || B.foe === side || RL.clk - B.pushT > 25) {
      const hp = s => RL.T.filter(t => t.side === s && t.hp > 0).reduce((a, t) => a + t.hp, 0);
      B.foe = others.length === 1 ? others[0] : (Math.random() < 0.25 ? others[(Math.random() * 2) | 0] : others.sort((a, b) => hp(a) - hp(b))[0]); B.pushT = RL.clk;
    }
    const k = rl3Shared(side, B.foe), sg = rl3Sgn(k, side), lamp = RL.T.find(t => t.side === side && t.k === 'lamp' && t.lane === k);
    const pushing = mine.filter(u => !u.bld && u.foe === B.foe && rlD(u, G) > 5);
    const troops = hand.filter(C => can(C) && C.type === 'troop' && C.cost <= oil - (L.keep && !pushing.length ? Math.max(0, L.keep - 2) : 0));
    const wreck = hand.find(C => can(C) && C.ab === 'summon');
    if (wreck && (pushing.length || oil >= 9)) { const [x, y] = rl3Pt(k, RL3C.RC, sg * (RL3C.WH + 0.8)); if (play(wreck, x, y)) return; }
    if (troops.length) {
      if (!pushing.length && troops.some(C => C.ab !== 'heal')) {
        const C = troops.filter(C => C.ab !== 'heal').sort((a, b) => b.hp * (b.cnt || 1) - a.hp * (a.cnt || 1))[0];
        const [x, y] = C.tg === 'build' || C.hp >= 1500 ? [G.x + (lamp.x - G.x) * 0.45, G.y + (lamp.y - G.y) * 0.45] : rl3Pt(k, RL3C.RC + (Math.random() - 0.5) * 2, sg * (RL3C.WH + 1.6));
        if (play(C, x, y)) return;
      } else if (pushing.length) {
        const lead = pushing.sort((a, b) => rlD(b, G) - rlD(a, G))[0], big = pushing.reduce((a, u) => a + u.max, 0) >= 1800;
        const C = troops.filter(C => C.ab !== 'heal' || big).sort((a, b) => (b.ab === 'heal' ? 6 : b.rng || 0) - (a.ab === 'heal' ? 6 : a.rng || 0) + (a.cost - b.cost) * 0.3)[0];
        if (C) { const [x, y] = rl3Bank(lead.x, lead.y) === side ? toward(lead.x, lead.y, 1.5) : rl3Pt(k, RL3C.RC, sg * (RL3C.WH + 0.8)); if (play(C, x, y)) return; }
      }
    }
    const bl = hand.find(C => can(C) && C.type === 'building' && C.ab !== 'oil' && C.ab !== 'tar' && oil >= 9);
    if (bl && lamp) { if (play(bl, G.x + (lamp.x - G.x) * 0.6, G.y + (lamp.y - G.y) * 0.6)) return; }
  }
  // ---- 5. never waste oil
  if (oil >= 9.7) { const C = hand.filter(C => can(C) && C.type === 'troop' && C.ab !== 'heal').sort((a, b) => a.cost - b.cost)[0]; if (C) play(C, back[0], back[1]); }
}

// ---------- the skerry in 3D (src/rl3d.js shows it in place of the two rocks while RL.n3) ----------
function rl3dArena3() {
  const S = RL3.scene, g = new THREE.Group(), r = rlRng(311), C = RL3C, R = C.R, Rr = R + C.LIP;
  const top = rl3dPaint3(), tex = new THREE.CanvasTexture(top.cv);
  tex.anisotropy = Math.min(4, RL3.r.capabilities.getMaxAnisotropy ? RL3.r.capabilities.getMaxAnisotropy() : 1);
  const A = (x, y) => new THREE.Vector2(x - 9, y - 16);
  for (const s of [0, 1, 2]) {
    // the rock's outline: out along the near channel's edge, round the rim, back along the other channel's edge, and
    // round the pool in the middle
    const k1 = s, k2 = (s + 2) % 3, q1 = rl3Sgn(k1, s) * C.WH, q2 = rl3Sgn(k2, s) * C.WH, a0 = Math.sqrt(C.P * C.P - C.WH * C.WH), a1 = Math.sqrt(Rr * Rr - C.WH * C.WH), pts = [];
    for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10; pts.push(rl3Pt(k1, a, q1)); }
    const ang = p => Math.atan2(p[1] - C.CY, p[0] - C.CX), e1 = rl3Pt(k1, a1, q1), e2 = rl3Pt(k2, a1, q2);
    let t1 = ang(e1), t2 = ang(e2); while (t2 > t1) t2 -= Math.PI * 2;
    for (let i = 1; i < 48; i++) { const t = t1 + (t2 - t1) * i / 48, rr = Rr + (r() - 0.5) * 0.8; pts.push([C.CX + Math.cos(t) * rr, C.CY + Math.sin(t) * rr]); }
    for (let i = 0; i <= 10; i++) { const a = a1 + (a0 - a1) * i / 10; pts.push(rl3Pt(k2, a, q2)); }
    const p1 = rl3Pt(k2, a0, q2), p0 = rl3Pt(k1, a0, q1); let u1 = ang(p1), u0 = ang(p0); while (u0 < u1) u0 += Math.PI * 2;
    for (let i = 1; i < 8; i++) { const t = u1 + (u0 - u1) * i / 8; pts.push([C.CX + Math.cos(t) * C.P, C.CY + Math.sin(t) * C.P]); }
    const shp = new THREE.Shape(pts.map(p => A(p[0], p[1]))), tg = new THREE.ShapeGeometry(shp);
    const uv = tg.attributes.uv, pos = tg.attributes.position;
    for (let i = 0; i < uv.count; i++) { const x = pos.getX(i) + 9, y = pos.getY(i) + 16; uv.setXY(i, (x - top.x0) / top.w, (y - top.y0) / top.h); }
    const tm = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ map: tex })); tm.rotation.x = -Math.PI / 2; tm.position.y = RL_G0; g.add(tm);
    const eg = new THREE.ExtrudeGeometry(shp, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.3, bevelSegments: 1, steps: 1 });
    const em = new THREE.Mesh(eg, rlMat(0x52504a)); em.rotation.x = -Math.PI / 2; em.position.y = RL_G0 - 2.95; g.add(em);
    // boulders round the rim, and a keeper's cottage with a lit window on the lip behind the Great Light
    for (let i = 0; i < 30; i++) { const t = t1 + (t2 - t1) * r(), rr = Rr + (r() - 0.6) * 1.4, k = 0.4 + r() * 1.0; const m = rlAdd(g, gDod(1), rlMat(r() < 0.5 ? 0x4e4a44 : 0x3e3a36), null, [r() * 3, r() * 3, r() * 3], [k, k * (0.5 + r() * 0.4), k]); m.position.copy(rv(C.CX + Math.cos(t) * rr, C.CY + Math.sin(t) * rr, RL_G0 - 0.5 + r() * 0.4)); }
    const ph = rl3Phi(s) + 0.42, ct = rlGrp(g); ct.position.copy(rv(C.CX + Math.cos(ph) * (R + 1.1), C.CY + Math.sin(ph) * (R + 1.1), RL_G0)); ct.rotation.y = rlRotY(s) + Math.PI + 0.4;
    rlAdd(ct, gBox(1.6, 1.0, 1.1), rlMat(0xe6e0d0), [0, 0.5, 0]); rlAdd(ct, gCone(1.25, 0.8, 4), rlMat(0x4a4448), [0, 1.38, 0], [0, Math.PI / 4, 0], [1, 1, 0.75]); rlAdd(ct, gBox(0.22, 0.5, 0.22), rlMat(0x8a7a6a), [0.45, 1.55, 0]);
    for (const x of [-0.35, 0.35]) rlAdd(ct, gBox(0.26, 0.26, 0.04), rlMat(0xffd080, { em: 0xffa040 }), [x, 0.55, 0.56]);
    const pb = rl3Phi(s) - 0.45; for (let i = 0; i < 3; i++) rlAdd(g, gCyl(0.2, 0.2, 0.46, 8), rlMat(0x6a4a2e), null).position.copy(rv(C.CX + Math.cos(pb) * (R + 0.9 + (i % 2) * 0.45), C.CY + Math.sin(pb) * (R + 0.9) + i * 0.4, RL_G0 + 0.23));
  }
  // the three causeways
  for (const c of RL3W.ch) {
    const cg = rlGrp(g), [x, y] = rl3Pt(c.k, C.RC, 0); cg.position.copy(rv(x, y, 0)); cg.rotation.y = Math.atan2(c.nx, -c.ny);
    rlAdd(cg, gBox(2.15, 1.5, 3.4), rlMat(0x857a6e), [0, RL_G0 - 0.75, 0]);
    for (let i = 0; i < 5; i++) rlAdd(cg, gBox(2.2, 0.08, 0.62), rlMat(i % 2 ? 0x9e9384 : 0xa89c8a), [0, RL_G0 + 0.01, -1.36 + i * 0.68]);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) rlAdd(cg, gBox(0.24, 0.22, 0.5), rlMat(0x6f655c), [sx * 1.02, RL_G0 + 0.08, -1.2 + i * 0.8], [0, (i % 2) * 0.2, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rlAdd(cg, gCyl(0.13, 0.16, 0.7, 6), rlMat(0x4a3d32), [sx * 1.0, RL_G0 + 0.3, sz * 1.55]);
  }
  // a black stack in the pool with a tarred day-mark on it, and skerries further out
  const st = rlGrp(g); st.position.copy(rv(C.CX, C.CY, 0));
  rlAdd(st, gDod(1), rlMat(0x34302e), [0, RL_G0 - 0.6, 0], [0.3, 0.6, 0.2], [1.3, 1.1, 1.3]);
  rlAdd(st, gCyl(0.08, 0.1, 2.2, 6), rlMat(0x2a2422), [0, RL_G0 + 1.2, 0]); rlAdd(st, gCone(0.42, 0.7, 4), rlMat(0x1a1a1e), [0, RL_G0 + 2.5, 0]);
  for (let i = 0; i < 24; i++) { const a = r() * Math.PI * 2, d = 30 + r() * 60, k = 0.8 + r() * 2.8; const m = rlAdd(g, gDod(1), rlMat(0x2e2a2c), null, [r() * 3, r() * 3, r() * 3], [k, k * 0.45, k * 0.9]); m.position.set(Math.cos(a) * d, -0.2, Math.sin(a) * d); }
  S.add(g); return g;
}
// the painted top of the skerry: turf, worn paths from each Great Light to its lamps and on to the causeways,
// flagstones round the towers, the arena's edge in whitewashed stones
function rl3dPaint3() {
  const C = RL3C, x0 = C.CX - C.R - C.LIP - 1, y0 = C.CY - C.R - C.LIP - 1, w = (C.R + C.LIP + 1) * 2, h = w, ppt = 20, cv = document.createElement('canvas'); cv.width = cv.height = Math.round(w * ppt);
  const c = cv.getContext('2d'), X = x => (x - x0) * ppt, Y = y => (y0 + h - y) * ppt, r = rlRng(9);
  c.fillStyle = '#4b5236'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#58663e'; c.beginPath(); c.arc(X(C.CX), Y(C.CY), C.R * ppt, 0, 7); c.fill();
  for (let i = 0; i < 16000; i++) { const t = r(); c.fillStyle = t < 0.45 ? 'rgba(30,40,20,0.16)' : t < 0.8 ? 'rgba(170,190,110,0.09)' : 'rgba(120,110,90,0.14)'; c.fillRect(r() * cv.width, r() * cv.height, 1 + r() * 3, 1 + r() * 3); }
  c.save(); c.beginPath(); c.arc(X(C.CX), Y(C.CY), C.R * ppt, 0, 7); c.clip();
  for (let i = -16; i < 16; i++) for (let j = -16; j < 16; j++) if ((i + j) % 2 === 0) { c.fillStyle = 'rgba(255,255,220,0.035)'; c.fillRect(X(C.CX + i), Y(C.CY + j + 1), ppt, ppt); }
  c.restore();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const path = (P, wd, col) => { c.beginPath(); P.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.lineWidth = wd * ppt; c.strokeStyle = col; c.stroke(); };
  const T = rl3TowerPos().map(t => Object.assign(t, { r: RL_TW[t.k].r }));
  for (const s of [0, 1, 2]) {
    const G = T.find(t => t.side === s && t.k === 'great');
    for (const L of T.filter(t => t.side === s && t.k === 'lamp')) { const e = rl3Pt(L.lane, C.RC, rl3Sgn(L.lane, s) * (C.WH + 0.1)), P = [[G.x, G.y], [L.x, L.y], e]; path(P, 1.9, 'rgba(120,102,72,0.55)'); path(P, 1.2, 'rgba(150,128,90,0.65)'); }
  }
  const flags = (x, y, Rd) => { c.fillStyle = '#8c8578'; c.beginPath(); c.arc(X(x), Y(y), Rd * ppt, 0, 7); c.fill(); for (let i = 0; i < 60; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * Rd * 0.95; c.fillStyle = r() < 0.5 ? 'rgba(60,55,50,0.35)' : 'rgba(200,195,180,0.25)'; c.fillRect(X(x + Math.cos(a) * d) - 4, Y(y + Math.sin(a) * d) - 3, 6 + r() * 5, 4 + r() * 4); } c.strokeStyle = 'rgba(40,36,30,0.5)'; c.lineWidth = 2; c.stroke(); };
  for (const t of T) flags(t.x, t.y, t.k === 'great' ? 2.6 : 2);
  c.setLineDash([6, 8]); c.strokeStyle = 'rgba(230,225,205,0.4)'; c.lineWidth = 3; c.beginPath(); c.arc(X(C.CX), Y(C.CY), C.R * ppt, 0, 7); c.stroke(); c.setLineDash([]);
  return { cv, x0, y0, w, h };
}

(function rl3Init() { const b = typeof $ === 'function' && $('rl3Play'); if (b) b.addEventListener('click', () => rl3PlayBot()); })();
