'use strict';
// The Lamp Road: a first-person team game for five a side, with an escort objective, on its own card on the title
// screen (id lrTitle). Two crews, the Lamplighters (team 0, attack) and the Wreckers (team 1, defend), fight down the
// streets of Gullhaven (src/lrmap.js) over the Lamp Wain, the great lens of the Gullhaven Light on an iron carriage.
// The Lamplighters push it from the west quay to the foot of the Light; if it gets there the Light is lit and they
// win. The Wreckers hold it off until the clock runs out. Three heroes, each with a kit of five: Bollard the tank,
// Razorbill the marksman, Linnet the keeper's apprentice who mends (LR_HEROES). Bots fill every empty seat.
//
// This file owns the state (LRM, its shape below), the heroes, the match and its rules, the sim, the input, the bots
// (lrBot), the way in and out (state 'lamproad' in src/main.js's loop calls lrFrame(dt)), what's kept on this device
// (localStorage 'skerry-lamproad': the settings, the name and your record) and the debug hooks (lrDebug(o) starts a
// match, lrDebugWin(team) ends one). src/lr3d.js draws it, src/lrhud.js lays the HUD and the cards over it.
//
// The sim runs in fixed ticks of LR_DT (1/60 s) whatever the frame rate: lrTick(dt) gathers each player's input
// (p.inp: yours from the keys, mouse, controller or touch; a bot's from lrBot; someone online from the network) and
// then lrSim(dt) runs the match from those inputs alone. Movement is lrBody(p, dt), with its timers in lrTimers(p, dt)
// (lrOwnStep does both), so a screen online can move its own body ahead of the host; everything else (shots, damage,
// the Wain, the clock) happens only on the host (lrHost()). A body with p.remote set is not moved here at all (its
// own screen moves it and the network places it). lrSnap() packs the match into a small object for the others, and
// lrApply(s) puts it back on their screens. One-off events (a shot, a hit, a death, a wave...) go into LRM.FX, each
// with its own id, for the view and the sound to handle once.
//
// LRM = { on, mode: 'solo'|'net', ph: 'pick'|'setup'|'play'|'over', phT, t, clock, ot, otT, stage, win, me,
//   P: ten players (seats 0-4 the Lamplighters, 5-9 the Wreckers), each { i, team, hero, name, bot, sid, x, y, z,
//     vx, vy, vz, gnd, yaw, pitch, r, h, hp, maxHp, alive, deadT, spawnT, ammo, reload, fireT, alt, cd: {a1, a2, alt},
//     ult (0..1), act: {k, t}, brace, slow, glide, kills, deaths, dmg, heal, elims, beam (whom Linnet's light is on, or
//     -1), inp },
//   cart: { s, x, y, z, yaw, st: 'push'|'contest'|'idle'|'back', n, nd, idleT },
//   walls, zones, proj, packs, feed, FX }   (as in the design: walls are Bollard's bulkheads, zones the tar pools,
//   hung lanterns, beacons and broadsides, proj the bolts, tar pots and thrown lanterns)
// Headings as in src/lrmap.js: you face (-sin yaw, 0, -cos yaw); pitch up is positive.

var LR_DT = 1 / 60;
var LR_TEAMS = [
  { id: 'lamp', name: 'Lamplighters', short: 'Lamplighters', col: '#f2c14e', col2: '#3d7fb8', hex: 0xf2c14e, hex2: 0x3d7fb8, verb: 'attack' },
  { id: 'wreck', name: 'Wreckers', short: 'Wreckers', col: '#c8463a', col2: '#2a2522', hex: 0xc8463a, hex2: 0x2a2522, verb: 'defend' },
];
// how well the bots play: aim error (radians), turn rate, how soon they react, how much they lead, how keen they are
// on their abilities, whether they strafe, and how often they go for the head
var LR_SKILL = {
  easy: { err: 0.085, turn: 3.6, react: 0.6, lead: 0.3, abil: 0.35, strafe: 0, head: 0, clump: 3 },
  fair: { err: 0.04, turn: 6.5, react: 0.32, lead: 0.75, abil: 0.75, strafe: 0.6, head: 0.15, clump: 2 },
  hard: { err: 0.016, turn: 11, react: 0.16, lead: 1, abil: 1, strafe: 1, head: 0.4, clump: 2 },
};
// the three heroes: hp, speed, body, the magazine, the ultimate's cost (points of damage or healing to charge it),
// the cooldowns, and the kit in plain short words for the hero select and the HUD
var LR_HEROES = {
  bollard: {
    id: 'bollard', n: 'Bollard', title: 'The Harbourmaster', role: 'tank', roleN: 'Tank', hp: 600, spd: 4.8, r: 0.7, h: 2.3, mag: 0, reloadT: 0, ult: 1500,
    cd: { a1: 8, a2: 10, alt: 12 }, range: 4.2,
    blurb: 'A huge old harbourmaster in a riveted iron diving dress. He holds the line and takes the blows.',
    kit: {
      pri: ['Capstan Bar', 'Swing the bar: hits everyone in front of you, close in.'],
      alt: ['Bulkhead', 'Set down an iron wall ahead. It stops shots and bodies, both sides’.'],
      a1: ['Ballast Rush', 'Charge forward. Anyone in the way is hurt and shoved aside.'],
      a2: ['Brace', 'Take half damage for three seconds, and stand firm.'],
      ult: ['Spring Tide', 'Drive the anchor down: a wave ahead hurts, knocks back and slows.'],
    },
  },
  razorbill: {
    id: 'razorbill', n: 'Razorbill', title: 'The Wrecker’s Eye', role: 'damage', roleN: 'Damage', hp: 200, spd: 6.0, r: 0.4, h: 1.8, mag: 18, reloadT: 1.5, ult: 1700,
    cd: { a1: 8, a2: 10, alt: 0 }, range: 70,
    blurb: 'A lean marksman in a tarred oilskin with a long fowling piece. She picks people off from afar.',
    kit: {
      pri: ['Fowling Piece', 'Quick, accurate shots. Head shots do double.'],
      alt: ['Sight', 'Hold to aim through the glass: closer, and dead steady.'],
      a1: ['Gull’s Rise', 'Leap high into the air. Hold Space to glide down.'],
      a2: ['Tar Pot', 'Lob a pot of burning tar that leaves a pool that burns and slows.'],
      ult: ['Broadside', 'Mark a strip of ground ahead; a ship’s guns hammer it a moment later.'],
    },
  },
  linnet: {
    id: 'linnet', n: 'Linnet', title: 'The Keeper’s Apprentice', role: 'support', roleN: 'Support', hp: 225, spd: 5.6, r: 0.4, h: 1.7, mag: 20, reloadT: 1.4, ult: 1600,
    cd: { a1: 12, a2: 7, alt: 0 }, range: 55,
    blurb: 'A young keeper with a storm lantern on a long iron staff. Its light mends her crew and burns the rest.',
    kit: {
      pri: ['Lamp Bolt', 'A bolt of light: hurts enemies, mends allies it passes through.'],
      alt: ['Mending Light', 'Hold on an ally near you to mend them steadily.'],
      a1: ['Kindle', 'Throw a lantern that hangs where it lands and mends allies near it.'],
      a2: ['Will-o’-the-Wisp', 'Blink a short way the way you’re moving.'],
      ult: ['Beacon', 'Plant the staff: allies near it mend fast and can’t fall.'],
    },
  },
};
var LR_HERO_IDS = ['bollard', 'razorbill', 'linnet'];
var LR_BOTNAMES = [
  ['Hob Penrose', 'Tamsin Wick', 'Ezra Lamb', 'Jory Brass', 'Morwenna Hale', 'Kit Tallow', 'Nan Carrow', 'Abel Spence'],
  ['Silas Crane', 'Saul Kittow', 'Bess Polgrain', 'Long Amos', 'Hester Vane', 'Ned Tregarthen', 'Widow Pascoe', 'Black Jem'],
];
var LRM = {
  on: false, mode: 'solo', net: null, ph: 'off', phT: 0, t: 0, clock: 0, ot: false, otT: 0, otE: 0, stage: 0, win: -1, me: 0,
  P: [], cart: null, walls: [], zones: [], proj: [], packs: [], feed: [], FX: [], fxId: 0, nid: 1, set: null,
  acc: 0, alpha: 0, keys: {}, mb: 0, mlook: [0, 0], ly: 0, lp: 0, touch: {}, stick: null, lookTouch: null, pad: {}, board: false, picking: false, overT: 0, msg: '', msgT: 0, spawnSeen: -1,
};
var lrStore = { get() { try { return JSON.parse(localStorage.getItem('skerry-lamproad') || '{}') || {}; } catch (e) { return {}; } }, set(v) { try { localStorage.setItem('skerry-lamproad', JSON.stringify(v)); } catch (e) {} } };
const lrClamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lrAng = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const lrDir = (yaw, pitch) => { const c = Math.cos(pitch); return [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c]; };
const lrEyeH = p => p.h * 0.88;
const lrHeadR = p => Math.max(0.22, p.r * 0.55);
const lrHost = () => !LRM.net || LRM.net.role === 'host';
const lrMe = () => LRM.P[LRM.me];
const lrInp0 = () => ({ mx: 0, mz: 0, yaw: 0, pitch: 0, jump: false, fire: false, alt: false, a1: false, a2: false, ult: false, reload: false, hero: '' });
const lrSpawnOf = p => LR_MAP.spawns[p.team ? 'd' : 'a'][Math.min(LRM.stage, 3)];

// ---------- a match ----------
function lrNewP(i, team, name, bot, sid) {
  return { i, team, hero: '', name, bot: !!bot, sid: sid || '', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, gnd: true, yaw: 0, pitch: 0, r: 0.45, h: 1.8,
    hp: 1, maxHp: 1, alive: false, deadT: 0, spawnT: 0, ammo: 0, reload: 0, fireT: 9, alt: false, cd: { a1: 0, a2: 0, alt: 0 }, ult: 0, act: { k: null, t: 0 },
    brace: 0, slow: 1, slowT: 0, tarT: 0, knockT: 0, glide: false, kills: 0, deaths: 0, dmg: 0, heal: 0, elims: 0, beam: -1, spr: 0, hurtAt: -9, hurtFrom: -1,
    hitBy: {}, sn: 0, dotAcc: 0, healAcc: 0, px: 0, py: 0, pz: 0, inp: lrInp0(), ai: bot ? {} : null, remote: false };
}
function lrMyName() { const el = typeof $ === 'function' ? $('lrNick') : null, v = (el && el.value) || (typeof NET !== 'undefined' && NET.nick) || ''; return String(v).replace(/[\u0000-\u001f<>&"]/g, '').trim().slice(0, 16) || 'You'; }
// o: { side: 0 | 1 | 'r', skill, hero (yours, skipping the select), allBots (you watch), setupT, net }
function lrStart(o) {
  o = Object.assign({}, lrStore.get().set || {}, o || {});
  const skill = LR_SKILL[o.skill] ? o.skill : 'fair', chose = o.side === 0 || o.side === 1 || o.side === '0' || o.side === '1' ? +o.side : 'r';
  const side = chose === 'r' ? (Math.random() < 0.5 ? 0 : 1) : chose;
  LRM.set = { side: chose, skill, setupT: o.setupT, allBots: !!o.allBots };
  LRM.net = o.net || null; LRM.mode = LRM.net ? 'net' : 'solo';
  if (!LRM.net && !o.allBots) { const st = lrStore.get(); st.set = { side: chose, skill }; lrStore.set(st); }
  LRM.P = [];
  const names = LR_BOTNAMES.map(l => l.slice().sort(() => Math.random() - 0.5));
  if (LRM.net && LRM.net.seats) {
    // online: the seats the host dealt, [sid ('' for a bot), team, name, hero], in seat order
    LRM.net.seats.forEach((z, i) => { const sid = z[0] || '', me = !!sid && typeof NET !== 'undefined' && sid === NET.sid; const p = lrNewP(i, z[1] | 0, me ? lrMyName() : String(z[2] || names[z[1] | 0][i % 8]), !sid, sid); LRM.P.push(p); if (me) LRM.me = i; });
  } else {
    for (let i = 0; i < 10; i++) { const team = i < 5 ? 0 : 1, me = i === (side ? 5 : 0); LRM.P.push(lrNewP(i, team, me ? lrMyName() : names[team][i % 5], !me || !!o.allBots)); }
    LRM.me = side ? 5 : 0;
  }
  const L = lrPathLen(), at = lrPathAt(0);
  LRM.cart = { s: 0, x: at.x, y: 0, z: at.z, yaw: at.yaw, st: 'idle', n: 0, nd: 0, idleT: 0, px: at.x, pz: at.z, L };
  LRM.packs = LR_MAP.packs.map(k => ({ x: k[0], z: k[1], big: !!k[2], t: 0 }));
  LRM.walls = []; LRM.zones = []; LRM.proj = []; LRM.feed = []; LRM.FX = []; LRM.fxId = 0; LRM.nid = 1;
  LRM.ph = 'pick'; LRM.phT = 12; LRM.t = 0; LRM.clock = 180; LRM.ot = false; LRM.otT = 0; LRM.otE = 0; LRM.stage = 0; LRM.win = -1; LRM.overT = 0;
  LRM.acc = 0; LRM.keys = {}; LRM.mb = 0; LRM.mlook = [0, 0]; LRM.touch = {}; LRM.board = false; LRM.picking = false; LRM.msg = ''; LRM.msgT = 0; LRM.spawnSeen = -1;
  const me = lrMe();
  if (o.hero && LR_HEROES[o.hero] && me && !me.bot) lrSetHero(me, o.hero);
  for (const tm of [0, 1]) lrBotPicks(tm);
  for (const p of LRM.P) lrRespawn(p, true);
  LRM.on = true;
  if (typeof lrEnter === 'function') lrEnter();
  if (typeof lr3dMatch === 'function') lr3dMatch();
  if (LRM.P.every(p => p.hero || !lrHost())) lrSetup();
}
// the bots pick for the make-up of a five: one tank, two damage, two support (less whatever the people took)
function lrBotPicks(team) {
  const crew = LRM.P.filter(p => p.team === team), need = { tank: 1, damage: 2, support: 2 }, byRole = { tank: 'bollard', damage: 'razorbill', support: 'linnet' };
  for (const p of crew) if (p.hero) need[LR_HEROES[p.hero].role]--;
  for (const p of crew) if (p.bot && !p.hero) { const role = Object.keys(need).sort((a, b) => need[b] - need[a])[0]; need[role]--; lrSetHero(p, byRole[role]); }
}
// before the doors open, the bots of a crew pick again round what its people chose
function lrRebalance(team) {
  if (LRM.ph !== 'pick' && LRM.ph !== 'setup') return;
  const bots = LRM.P.filter(p => p.team === team && p.bot), was = bots.map(p => p.hero);
  for (const p of bots) p.hero = '';
  lrBotPicks(team);
  bots.forEach((p, k) => { if (p.hero !== was[k] && p.alive) { const h = p.hero; p.hero = was[k]; lrSetHero(p, h); lrRespawn(p, true); } });
}
function lrSetHero(p, id) {
  const H = LR_HEROES[id]; if (!H) return;
  const was = p.hero; p.hero = id; p.r = H.r; p.h = H.h; p.maxHp = H.hp; p.hp = H.hp; p.ammo = H.mag; p.reload = 0; p.fireT = 9;
  p.cd = { a1: 0, a2: 0, alt: 0 }; p.act = { k: null, t: 0 }; p.beam = -1; p.brace = 0; p.glide = false;
  if (was && was !== id) p.ult = 0;
  // (a bulkhead of his stays up when he changes; it just isn't his to put down again)
}
// back at your side's spawn for the stage the Wain has reached: full health, a full magazine, a moment's protection
function lrRespawn(p, quiet) {
  const sp = lrSpawnOf(p), k = p.i % 5, off = [[0, 0], [1.8, 1.6], [-1.8, 1.6], [1.8, -1.6], [-1.8, -1.6]][k];
  const c = Math.cos(sp[2]), s = Math.sin(sp[2]);
  p.x = sp[0] + off[0] * c + off[1] * s; p.z = sp[1] - off[0] * s + off[1] * c; p.y = lrGround(p.x, p.z, 0.3);
  p.vx = p.vz = p.vy = 0; p.yaw = sp[2]; p.pitch = 0; p.inp.yaw = sp[2]; p.inp.pitch = 0; p.gnd = true;
  if (p.hero) { const H = LR_HEROES[p.hero]; p.r = H.r; p.h = H.h; p.maxHp = H.hp; p.hp = H.hp; p.ammo = H.mag; }
  lrMove(p, 0.0001); p.vx = p.vz = 0;
  p.alive = !!p.hero; p.deadT = 0; p.spawnT = quiet ? 0 : 1.5; p.reload = 0; p.act = { k: null, t: 0 }; p.beam = -1; p.brace = 0; p.slowT = 0; p.tarT = 0; p.knockT = 0; p.glide = false; p.hitBy = {};
  p.px = p.x; p.py = p.y; p.pz = p.z; p.sn++;
  if (p.ai) { p.ai.path = null; p.ai.stuckT = 0; }
  if (!quiet && p.alive) lrFxPush('spawn', { x: p.x, y: p.y, z: p.z, team: p.team, v: p.i });
}
function lrInSpawn(p) { const sp = lrSpawnOf(p); return Math.hypot(p.x - sp[0], p.z - sp[1]) < 7 || (p.team === 0 && LRM.stage === 0 && p.x < -89); }
function lrCanChange(p) { return LRM.ph === 'pick' || !p.alive || lrInSpawn(p); }
// the pick is over (everyone has a hero, or the time's up): the attackers held in their boat house while the defence sets up
function lrSetup() {
  for (const p of LRM.P) if (!p.hero) { const crew = LRM.P.filter(q => q.team === p.team && q.hero), need = { tank: 1, damage: 2, support: 2 }; for (const q of crew) need[LR_HEROES[q.hero].role]--; const role = Object.keys(need).sort((a, b) => need[b] - need[a])[0]; lrSetHero(p, { tank: 'bollard', damage: 'razorbill', support: 'linnet' }[role]); lrRespawn(p, true); }
  for (const p of LRM.P) if (!p.alive) lrRespawn(p, true);
  LRM.ph = 'setup'; LRM.phT = LRM.set && LRM.set.setupT != null ? LRM.set.setupT : LRM.net ? 20 : 15; LRM.picking = false;
  lrSay(lrMe() && lrMe().team === 0 ? 'The Wreckers are setting up: get ready' : 'Set up the defence', 3);
  lrFxPush('setup', {});
}
function lrGo() { LRM.ph = 'play'; LRM.phT = 0; lrFxPush('go', {}); lrSay(lrMe() && lrMe().team === 0 ? 'The doors are open: push the Wain!' : 'Here they come: hold the road!', 3); }
function lrEnd(win) {
  if (LRM.ph === 'over') return;
  LRM.win = win; LRM.ph = 'over'; LRM.overT = 0; LRM.phT = 0;
  lrFxPush('end', { win });
  const me = lrMe();
  if (me && !me.bot && !LRM.set.allBots) {
    const st = lrStore.get(), key = LRM.net ? 'onl' : 'rec', r = st[key] || { w: 0, l: 0, m: 0, e: 0, d: 0 };
    r.m++; if (win === me.team) r.w++; else r.l++; r.e += me.elims; r.d += me.deaths; st[key] = r; lrStore.set(st);
  }
}
function lrSay(t, s) { LRM.msg = t; LRM.msgT = s || 2.5; }
function lrFxPush(k, o) { if (!lrHost()) return null; const f = Object.assign({ id: ++LRM.fxId, k, t: LRM.t }, o); LRM.FX.push(f); return f; }

// ---------- every frame, and every tick ----------
function lrPaused() { return !LRM.net && (LRM.paused || false); }
function lrFrame(dt) {
  if (!LRM.on) return;
  lrPadPoll(dt);
  lrLocalLook(dt);
  if (!lrPaused()) {
    LRM.acc += dt; let n = 0;
    while (LRM.acc >= LR_DT && n < 6) { lrTick(LR_DT); LRM.acc -= LR_DT; n++; }
    if (n >= 6) LRM.acc = 0;
    LRM.alpha = LRM.acc / LR_DT;
    if (LRM.ph === 'over') LRM.overT += dt;
    lrSteps(dt);
  }
  if (typeof lr3dDraw === 'function') lr3dDraw(dt);
  if (typeof lrHud === 'function') lrHud(dt);
  if (LRM.net && typeof lrnTick === 'function') lrnTick(dt);
}
// one fixed tick: everyone's input, then the match (on the host); a guest moves only its own body (src/lrnet.js
// puts the rest where the host says)
function lrTick(dt) {
  if (!LRM.on) return;
  if (LRM.msgT > 0) LRM.msgT -= dt;
  const me = lrMe();
  if (me && !me.bot) lrLocalInput(me);
  if (lrHost()) { for (const p of LRM.P) if (p.bot && p.hero) lrBot(p, dt); lrSim(dt); }
  else { LRM.t += dt; if (me && me.hero && LRM.ph !== 'pick' && LRM.ph !== 'over') { me.px = me.x; me.py = me.y; me.pz = me.z; lrOwnStep(me, dt); if (LRM.ph === 'setup' && me.team === 0) me.x = Math.min(me.x, -89.6 - me.r); } }
}
// a body's own timers (ticked wherever that body is moved)
function lrTimers(p, dt) {
  p.fireT += dt; if (p.act.k) p.act.t += dt;
  if (p.act.k && p.act.t > (p.act.k === 'a1' && p.hero === 'bollard' ? 0.9 : p.act.k === 'ult' ? 1.2 : 0.5)) p.act = { k: null, t: 0 };
  for (const k of ['a1', 'a2', 'alt']) if (p.cd[k] > 0) p.cd[k] = Math.max(0, p.cd[k] - dt);
  if (p.spawnT > 0) p.spawnT = Math.max(0, p.spawnT - dt);
  if (p.brace > 0) p.brace = Math.max(0, p.brace - dt);
  if (p.slowT > 0) p.slowT = Math.max(0, p.slowT - dt);
  if (p.tarT > 0) p.tarT = Math.max(0, p.tarT - dt);
  if (p.knockT > 0) p.knockT = Math.max(0, p.knockT - dt);
}
function lrOwnStep(p, dt) { lrTimers(p, dt); lrBody(p, dt); }
function lrSim(dt) {
  if (!LRM.on) return;
  LRM.t += dt;
  if (LRM.ph === 'pick') { LRM.phT -= dt; if (LRM.phT <= 0 || LRM.P.every(p => p.hero)) lrSetup(); }
  else if (LRM.ph === 'setup') { LRM.phT -= dt; if (LRM.phT <= 0) lrGo(); }
  else if (LRM.ph === 'play') lrClockTick(dt);
  const live = LRM.ph === 'setup' || LRM.ph === 'play';
  for (const p of LRM.P) {
    p.px = p.x; p.py = p.y; p.pz = p.z;
    if (p.inp.hero) { const h = p.inp.hero; p.inp.hero = ''; if (LR_HEROES[h] && h !== p.hero && lrCanChange(p) && LRM.ph !== 'over') { const first = !p.hero; lrSetHero(p, h); if (first || LRM.ph === 'pick') lrRespawn(p, true); } }
    if (!p.hero) continue;
    if (!p.alive) { if (LRM.ph !== 'over') { p.deadT -= dt; if (p.deadT <= 0) lrRespawn(p); } if (!p.remote) { p.inp.mx = p.inp.mz = 0; lrBody(p, dt); } continue; }
    lrTimers(p, dt);
    if (!live) { p.vx = p.vz = 0; p.yaw = p.inp.yaw; p.pitch = p.inp.pitch; continue; }
    if (!p.remote) lrBody(p, dt);
    if (LRM.ph === 'setup' && p.team === 0 && LRM.stage === 0) { if (p.x > -89.6 - p.r) { p.x = -89.6 - p.r; p.vx = Math.min(0, p.vx); } }
    if (lrInSpawn(p) && p.hp < p.maxHp) p.hp = p.maxHp;
    for (const k of LRM.packs) if (k.t <= 0 && p.hp < p.maxHp && Math.hypot(p.x - k.x, p.z - k.z) < p.r + 0.9 && p.y < 1.5) { lrHeal(p, k.big ? 250 : 75, null); k.t = k.big ? 15 : 10; lrFxPush('pack', { x: k.x, y: 0.3, z: k.z, v: p.i }); }
    if (LRM.ph === 'play' || p.team === 1) lrKit(p, dt);   // (held in the boat house, the attackers can't fight yet)
    if (LRM.ph === 'play') p.ult = Math.min(1, p.ult + dt * 0.01);
  }
  lrSeparate();
  for (const k of LRM.packs) if (k.t > 0) k.t = Math.max(0, k.t - dt);
  lrCartTick(dt);
  lrProjTick(dt);
  lrZoneTick(dt);
  for (const w of LRM.walls) w.t -= dt;
  if (LRM.walls.some(w => w.t <= 0 || w.hp <= 0)) LRM.walls = LRM.walls.filter(w => { if (w.t > 0 && w.hp > 0) return true; const o = LRM.P[w.owner]; if (o) o.cd.alt = LR_HEROES.bollard.cd.alt; lrFxPush('wallgone', { x: w.x, y: w.y + 1.5, z: w.z, yaw: w.yaw }); return false; });
  if (LRM.FX.length > 0 && (LRM.FX.length > 160 || LRM.t - LRM.FX[0].t > 2)) LRM.FX = LRM.FX.filter(f => LRM.t - f.t <= 2).slice(-160);
  if (LRM.feed.length > 8) LRM.feed = LRM.feed.slice(-8);
}
// the clock: 3:00 to the first checkpoint and a minute and a half more for each; at 0:00 with an attacker on the
// Wain it's overtime, which lasts while one is, and ends once none has been for a moment (shorter as it goes on)
function lrClockTick(dt) {
  const C = LRM.cart;
  if (!LRM.ot) {
    LRM.clock -= dt;
    if (LRM.clock <= 0) { LRM.clock = 0; if (C.n > 0) { LRM.ot = true; LRM.otE = 0; LRM.otT = 1.5; lrFxPush('overtime', {}); lrSay('Overtime!', 2.5); } else lrEnd(1); }
  } else {
    LRM.otE += dt; const win = Math.max(0.35, 1.5 - LRM.otE * 0.025);
    if (C.n > 0) LRM.otT = win; else { LRM.otT -= dt; if (LRM.otT <= 0) lrEnd(1); }
  }
}
// the Wain: it rolls while an attacker is within 5 m and no living defender is, faster with more; left alone for
// 8 s it rolls back, never behind the last checkpoint passed; attackers beside it mend
function lrCartTick(dt) {
  const C = LRM.cart, L = C.L || lrPathLen(); let na = 0, nd = 0;
  C.px = C.x; C.pz = C.z;
  for (const p of LRM.P) if (p.alive && Math.hypot(p.x - C.x, p.z - C.z) <= 5 && p.y < 4) { if (p.team === 0) { na++; if (LRM.ph === 'play') lrHeal(p, 10 * dt, null); } else nd++; }
  C.n = na; C.nd = nd;
  if (LRM.ph !== 'play') { C.st = 'idle'; return; }
  if (na && nd) { C.st = 'contest'; C.idleT = 0; }
  else if (na) { C.st = 'push'; C.idleT = 0; C.s = Math.min(L, C.s + [0, 1.1, 1.5, 1.9][Math.min(3, na)] * dt); }
  else {
    C.idleT += dt; const floor = LRM.stage ? LR_MAP.cps[LRM.stage - 1] * L : 0;
    if (C.idleT >= 8 && C.s > floor + 1e-6) { C.st = 'back'; C.s = Math.max(floor, C.s - 0.6 * dt); } else C.st = 'idle';
  }
  while (LRM.stage < LR_MAP.cps.length && C.s >= LR_MAP.cps[LRM.stage] * L - 1e-6) {
    LRM.stage++;
    if (LRM.stage >= LR_MAP.cps.length) { lrPlaceCart(); lrFxPush('light', {}); lrEnd(0); return; }
    LRM.clock += 90; lrFxPush('checkpoint', { n: LRM.stage, x: C.x, z: C.z }); lrSay('Checkpoint reached · +1:30', 2.5);
  }
  lrPlaceCart();
}
function lrPlaceCart() { const C = LRM.cart, at = lrPathAt(C.s); C.x = at.x; C.z = at.z; C.yaw = at.yaw; C.y = 0; }

// ---------- moving a body ----------
// walking, jumping and the movement abilities (Ballast Rush's charge, Gull's Rise and its glide, the Wisp's blink),
// which start here when the input asks and the cooldown is ready, so a screen moving its own body has them at once
function lrBody(p, dt) {
  const H = LR_HEROES[p.hero], I = p.inp; if (!H) return;
  p.yaw = I.yaw; p.pitch = lrClamp(I.pitch, -1.5, 1.5);
  if (!p.alive) { p.vx *= 0.9; p.vz *= 0.9; lrMove(p, dt); return; }
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw), mz = lrClamp(I.mz, -1, 1), mx = lrClamp(I.mx, -1, 1);
  let wx = -sy * mz + cy * mx, wz = -cy * mz - sy * mx; const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
  p.slow = (p.slowT > 0 ? 0.6 : 1) * (p.tarT > 0 ? 0.7 : 1);
  const spd = H.spd * p.slow * (p.hero === 'razorbill' && I.alt ? 0.7 : 1);
  const can = LRM.ph === 'play' || (LRM.ph === 'setup' && p.team === 1);
  if (can && p.hero === 'bollard' && I.a1 && p.cd.a1 <= 0 && p.act.k !== 'a1') { p.act = { k: 'a1', t: 0 }; p.cd.a1 = H.cd.a1; p.rushYaw = p.yaw; p.rushHit = []; lrFxPush('rush', { x: p.x, y: p.y + 1, z: p.z, v: p.i }); }
  if (can && p.hero === 'razorbill' && I.a1 && p.cd.a1 <= 0) { p.vy = Math.sqrt(2 * LR_G * 8); p.gnd = false; p.glide = true; p.cd.a1 = H.cd.a1; p.act = { k: 'a1', t: 0 }; lrFxPush('rise', { x: p.x, y: p.y, z: p.z, v: p.i }); }
  if (can && p.hero === 'linnet' && I.a2 && p.cd.a2 <= 0) lrBlink(p, wl > 0.2 ? wx : -sy, wl > 0.2 ? wz : -cy);
  const rush = p.hero === 'bollard' && p.act.k === 'a1' && p.act.t < 0.9;
  if (rush) { p.vx = -Math.sin(p.rushYaw) * 14; p.vz = -Math.cos(p.rushYaw) * 14; }
  else { const k = Math.min(1, p.knockT > 0 ? dt * 0.8 : p.gnd ? dt * 14 : dt * (p.glide ? 3 : 2)); p.vx += (wx * spd - p.vx) * k; p.vz += (wz * spd - p.vz) * k; }
  if (I.jump && p.gnd && !rush) { p.vy = 7.2; p.gnd = false; }
  const gl = p.glide && I.jump && p.vy < -2.2; if (gl) p.vy = -2.2 + LR_G * dt;
  lrMove(p, dt);
  if (gl) p.vy = Math.max(p.vy, -2.2);
  lrPushBodies(p);
  if (p.gnd && p.vy <= 0 && p.act.k !== 'a1') p.glide = false;
}
function lrBlink(p, dx, dz) {
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const far = Math.min(lrBlockRay(p.x, p.y + 1.0, p.z, dx, 0, dz, 8.6), lrBlockRay(p.x, p.y + 1.5, p.z, dx, 0, dz, 8.6)), d = Math.max(0, Math.min(8, far - p.r - 0.2));
  const x0 = p.x, y0 = p.y, z0 = p.z;
  p.x += dx * d; p.z += dz * d; const g = lrGround(p.x, p.z, p.y + 0.6); if (g > p.y) p.y = g;
  p.cd.a2 = LR_HEROES.linnet.cd.a2; p.act = { k: 'a2', t: 0 };
  lrFxPush('blink', { x: x0, y: y0 + 1, z: z0, x2: p.x, y2: p.y + 1, z2: p.z, v: p.i });
}
// bodies don't stand inside each other: any two overlapping are eased apart (a body moved by its own screen online
// is left where it is, and the other takes all of it)
function lrSeparate() {
  const P = LRM.P;
  for (let i = 0; i < P.length; i++) { const a = P[i]; if (!a.alive) continue;
    for (let j = i + 1; j < P.length; j++) { const b = P[j]; if (!b.alive || a.y > b.y + b.h - 0.3 || b.y > a.y + a.h - 0.3) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r; if (d >= m) continue;
      const ux = d > 1e-4 ? dx / d : Math.cos(i + j), uz = d > 1e-4 ? dz / d : Math.sin(i + j), push = (m - d) * 0.5, wa = a.remote ? 0 : b.remote ? 2 : 1, wb = 2 - wa;
      a.x -= ux * push * wa; a.z -= uz * push * wa; b.x += ux * push * wb; b.z += uz * push * wb;
    } }
}
// out of the bulkheads (or onto their tops) and out of the Wain
function lrPushBodies(p) {
  for (const w of LRM.walls) lrPushBox(p, w.x, w.z, w.yaw, w.w / 2, 0.3, w.y, w.y + w.h, true);
  const C = LRM.cart; if (C) lrPushBox(p, C.x, C.z, C.yaw, 1.1, 1.7, 0, 2.0, false);
}
// a body against an upright box turned to yaw (hu across, hn along the way it faces)
function lrPushBox(p, cx, cz, yaw, hu, hn, y0, y1, stand) {
  if (p.y >= y1 - 0.02 || p.y + p.h <= y0) return;
  const ux = Math.cos(yaw), uz = -Math.sin(yaw), nx = -Math.sin(yaw), nz = -Math.cos(yaw);
  const ox = p.x - cx, oz = p.z - cz; let lu = ox * ux + oz * uz, ln = ox * nx + oz * nz; const HU = hu + p.r, HN = hn + p.r;
  if (Math.abs(lu) >= HU || Math.abs(ln) >= HN) return;
  if (stand && p.y > y1 - 0.6 && p.vy <= 0 && Math.abs(lu) < hu + p.r * 0.5 && Math.abs(ln) < hn + p.r * 0.5) { p.y = y1; p.vy = 0; p.gnd = true; return; }
  const pu = HU - Math.abs(lu), pn = HN - Math.abs(ln);
  if (pn < pu) { ln = Math.sign(ln || 1) * HN; const v = p.vx * nx + p.vz * nz; if (v * ln < 0) { p.vx -= v * nx; p.vz -= v * nz; } }
  else { lu = Math.sign(lu || 1) * HU; const v = p.vx * ux + p.vz * uz; if (v * lu < 0) { p.vx -= v * ux; p.vz -= v * uz; } }
  p.x = cx + ux * lu + nx * ln; p.z = cz + uz * lu + nz * ln;
}

// ---------- what a line meets ----------
// a ray against a box turned to yaw: the distance, or max
function lrSlabT(o, d, lo, hi, max) {
  let t0 = 0, t1 = max;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo[k] || o[k] > hi[k]) return max; continue; }
    let a = (lo[k] - o[k]) / d[k], b = (hi[k] - o[k]) / d[k]; if (a > b) { const s = a; a = b; b = s; }
    if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) return max;
  }
  return t0;
}
function lrRayWall(w, ox, oy, oz, dx, dy, dz, max) {
  const ux = Math.cos(w.yaw), uz = -Math.sin(w.yaw), nx = -Math.sin(w.yaw), nz = -Math.cos(w.yaw), rx = ox - w.x, rz = oz - w.z;
  return lrSlabT([rx * ux + rz * uz, oy, rx * nx + rz * nz], [dx * ux + dz * uz, dy, dx * nx + dz * nz], [-w.w / 2, w.y, -0.3], [w.w / 2, w.y + w.h, 0.3], max);
}
// the map and the bulkheads: how far a line runs clear
function lrBlockRay(ox, oy, oz, dx, dy, dz, max) { let t = lrRay(ox, oy, oz, dx, dy, dz, max); for (const w of LRM.walls) t = Math.min(t, lrRayWall(w, ox, oy, oz, dx, dy, dz, t)); return t; }
function lrRaySph(ox, oy, oz, dx, dy, dz, cx, cy, cz, r, max) {
  const lx = ox - cx, ly = oy - cy, lz = oz - cz, b = lx * dx + ly * dy + lz * dz, c = lx * lx + ly * ly + lz * lz - r * r, h = b * b - c;
  if (h < 0) return max; const t = -b - Math.sqrt(h); return t >= 0 && t < max ? t : (c < 0 ? 0 : max);
}
function lrRayCyl(ox, oy, oz, dx, dy, dz, cx, cz, r, y0, y1, max) {
  const lx = ox - cx, lz = oz - cz, a = dx * dx + dz * dz;
  if (a < 1e-9) return max;
  const b = lx * dx + lz * dz, c = lx * lx + lz * lz - r * r, h = b * b - a * c; if (h < 0) return max;
  let t = (-b - Math.sqrt(h)) / a; if (t < 0) t = c < 0 ? 0 : max; if (t >= max) return max;
  const y = oy + dy * t; return y >= y0 && y <= y1 ? t : max;
}
// a shot along a line: what it meets first, the map, a bulkhead or a body. o: { team (the shooter's), skip (an index),
// who: 'enemy' (the default), 'ally' or 'any', pad (a projectile's radius), max }
function lrRayHit(ox, oy, oz, dx, dy, dz, o) {
  const max = o.max || 120; let t = lrRay(ox, oy, oz, dx, dy, dz, max), p = null, head = false, wall = null;
  if (!o.noWalls) for (const w of LRM.walls) { const u = lrRayWall(w, ox, oy, oz, dx, dy, dz, t); if (u < t) { t = u; wall = w; } }
  if (!o.noBodies) for (const q of LRM.P) {
    if (!q.alive || q.i === o.skip) continue;
    const who = o.who || 'enemy'; if (who === 'enemy' && q.team === o.team) continue; if (who === 'ally' && q.team !== o.team) continue;
    const pad = o.pad || 0, hr = lrHeadR(q), hy = q.y + q.h - hr;
    const th = lrRaySph(ox, oy, oz, dx, dy, dz, q.x, hy, q.z, hr + pad, t); if (th < t) { t = th; p = q; head = true; wall = null; }
    const tb = lrRayCyl(ox, oy, oz, dx, dy, dz, q.x, q.z, q.r + pad, q.y - pad, hy - hr * 0.7, t); if (tb < t) { t = tb; p = q; head = false; wall = null; }
  }
  return { t, p, head, wall, x: ox + dx * t, y: oy + dy * t, z: oz + dz * t };
}

// ---------- damage and mending ----------
function lrHurt(q, amt, a, how, head, dot) {
  if (!q || !q.alive || q.spawnT > 0 || LRM.ph === 'over' || !(amt > 0)) return 0;
  if (a && a.team === q.team && a !== q) return 0;
  if (q.brace > 0) amt *= 0.5;
  let floor = false; for (const z of LRM.zones) if (z.k === 'beacon' && z.team === q.team && Math.hypot(q.x - z.x, q.z - z.z) < z.r) floor = true;
  const was = q.hp; q.hp = Math.max(floor && was >= 1 ? 1 : -1, was - amt); const dealt = was - Math.max(0, q.hp);
  if (a && a !== q) { a.dmg += dealt; a.ult = Math.min(1, a.ult + dealt / LR_HEROES[a.hero].ult); q.hitBy[a.i] = LRM.t; }
  q.hurtAt = LRM.t; q.hurtFrom = a ? a.i : -1;
  if (dot) { q.dotAcc += dealt; if (q.dotAcc >= 10) { lrFxPush('hit', { x: q.x, y: q.y + q.h * 0.6, z: q.z, a: a ? a.i : -1, v: q.i, n: Math.round(q.dotAcc), dot: 1 }); q.dotAcc = 0; } }
  else lrFxPush('hit', { x: q.x, y: q.y + (head ? q.h - 0.15 : q.h * 0.6), z: q.z, a: a ? a.i : -1, v: q.i, n: Math.round(dealt), head: head ? 1 : 0 });
  if (q.hp <= 0) lrKill(q, a, how);
  return dealt;
}
function lrHeal(q, amt, a) {
  if (!q || !q.alive || q.hp >= q.maxHp || !(amt > 0)) return 0;
  const d = Math.min(amt, q.maxHp - q.hp); q.hp += d;
  if (a) { a.heal += d; a.ult = Math.min(1, a.ult + d / LR_HEROES[a.hero].ult); }
  if (a) { q.healAcc += d; if (q.healAcc >= 20) { lrFxPush('heal', { x: q.x, y: q.y + q.h * 0.7, z: q.z, v: q.i, a: a.i, n: Math.round(q.healAcc) }); q.healAcc = 0; } }
  return d;
}
function lrKill(q, a, how) {
  q.alive = false; q.hp = 0; q.deadT = 8; q.deaths++; q.beam = -1; q.act = { k: null, t: 0 }; q.reload = 0; q.glide = false;
  for (const i in q.hitBy) if (LRM.t - q.hitBy[i] < 10 && LRM.P[i]) LRM.P[i].elims++;
  if (a && a !== q) a.kills++;
  q.hitBy = {};
  LRM.feed.push({ t: LRM.t, a: a ? a.i : -1, v: q.i, how: how || '' });
  lrFxPush('death', { x: q.x, y: q.y, z: q.z, team: q.team, v: q.i, a: a ? a.i : -1, how });
}
function lrWallHurt(w, amt, a) { if (!w || (a && a.team === w.team)) return; w.hp -= amt; lrFxPush('hit', { x: w.x, y: w.y + 1.5, z: w.z, a: a ? a.i : -1, v: -1, n: Math.round(amt), wall: 1 }); }

// ---------- the kits (on the host) ----------
function lrKit(p, dt) {
  const H = LR_HEROES[p.hero], I = p.inp;
  if (H.mag) {
    if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { p.reload = 0; p.ammo = H.mag; } }
    else if ((I.reload && p.ammo < H.mag) || p.ammo <= 0) { p.reload = H.reloadT; lrFxPush('reload', { v: p.i, x: p.x, y: p.y + 1.4, z: p.z }); }
  }
  p.alt = !!I.alt;
  if (p.hero === 'bollard') lrBollard(p, dt, I, H);
  else if (p.hero === 'razorbill') lrRazorbill(p, dt, I, H);
  else lrLinnet(p, dt, I, H);
  if (I.ult && p.ult >= 1 && p.alive) lrUlt(p);
}
function lrBollard(p, dt, I, H) {
  if (I.fire && p.fireT >= 0.85) {
    p.fireT = 0; lrFxPush('sweep', { x: p.x, y: p.y + 1.3, z: p.z, yaw: p.yaw, v: p.i });
    const eye = { x: p.x, y: p.y + lrEyeH(p), z: p.z };
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > H.range + q.r || Math.abs(q.y - p.y) > 2.5) continue;
      const a = Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)); if (a > 0.87 && d > p.r + q.r + 0.3) continue;
      if (!lrSees(eye, { x: q.x, y: q.y + q.h * 0.6, z: q.z })) continue;
      lrHurt(q, 75, p, 'bar');
    }
    for (const w of LRM.walls) { if (w.team === p.team) continue; const dx = w.x - p.x, dz = w.z - p.z; if (Math.hypot(dx, dz) < H.range + 1 && Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) < 1) lrWallHurt(w, 75, p); }
  }
  if (I.alt && p.cd.alt <= 0 && !LRM.walls.some(w => w.owner === p.i)) {
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), d = Math.max(1.2, Math.min(4, lrRay(p.x, p.y + 1.2, p.z, fx, 0, fz, 4.6) - 0.6));
    const x = p.x + fx * d, z = p.z + fz * d, y = lrGround(x, z, p.y + 0.6);
    LRM.walls.push({ id: LRM.nid++, team: p.team, owner: p.i, x, y, z, yaw: p.yaw, w: 6, h: 3, hp: 800, t: 10 });
    p.cd.alt = 99; p.act = { k: 'alt', t: 0 }; lrFxPush('wall', { x, y, z, yaw: p.yaw, team: p.team, v: p.i });
  }
  if (p.act.k === 'a1' && p.act.t < 0.9) {
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team || p.rushHit.includes(q.i)) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > p.r + q.r + 0.5 || Math.abs(q.y - p.y) > 2) continue;
      p.rushHit.push(q.i); lrHurt(q, 50, p, 'rush');
      if (q.brace <= 0) { const rx = Math.cos(p.rushYaw), rz = -Math.sin(p.rushYaw), sd = (dx * rx + dz * rz) >= 0 ? 1 : -1; q.vx = rx * sd * 9 - Math.sin(p.rushYaw) * 4; q.vz = rz * sd * 9 - Math.cos(p.rushYaw) * 4; q.vy = 3.5; q.gnd = false; q.knockT = 0.35; }
    }
  }
  if (I.a2 && p.cd.a2 <= 0) { p.brace = 3; p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 }; lrFxPush('brace', { x: p.x, y: p.y + 1, z: p.z, v: p.i }); }
}
function lrRazorbill(p, dt, I, H) {
  if (p.fireT > 0.25) p.spr = Math.max(0, p.spr - dt * 0.12);
  if (I.fire && p.fireT >= 0.14 && p.ammo > 0 && p.reload <= 0) {
    p.fireT = 0; p.ammo--;
    const sp = I.alt ? 0 : 0.006 + p.spr; p.spr = Math.min(0.045, p.spr + 0.005);
    const d = lrDir(p.yaw + (Math.random() - 0.5) * 2 * sp, p.pitch + (Math.random() - 0.5) * 2 * sp), ey = p.y + lrEyeH(p);
    const h = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, max: 120 });
    lrFxPush('tracer', { x: p.x, y: ey - 0.15, z: p.z, x2: h.x, y2: h.y, z2: h.z, team: p.team, v: p.i, a: p.i });
    if (h.p) { const fall = h.t <= 30 ? 1 : h.t >= 50 ? 0.6 : 1 - 0.4 * (h.t - 30) / 20; lrHurt(h.p, 26 * fall * (h.head ? 2 : 1), p, 'gun', h.head); }
    else if (h.wall) lrWallHurt(h.wall, 26, p);
    else if (h.t < 120) lrFxPush('spark', { x: h.x, y: h.y, z: h.z });
  }
  if (I.a2 && p.cd.a2 <= 0) {
    p.cd.a2 = H.cd.a2; p.act = { k: 'a2', t: 0 };
    const d = lrDir(p.yaw, p.pitch), v = 24; LRM.proj.push({ id: LRM.nid++, k: 'tar', team: p.team, owner: p.i, x: p.x, y: p.y + lrEyeH(p), z: p.z, vx: d[0] * v, vy: d[1] * v, vz: d[2] * v, t: 0, hit: [] });
    lrFxPush('throw', { v: p.i, x: p.x, y: p.y + 1.5, z: p.z, w: 'tar' });
  }
}
function lrLinnet(p, dt, I, H) {
  if (I.fire && p.fireT >= 0.32 && p.ammo > 0 && p.reload <= 0) {
    p.fireT = 0; p.ammo--;
    const d = lrDir(p.yaw, p.pitch), v = 60; LRM.proj.push({ id: LRM.nid++, k: 'bolt', team: p.team, owner: p.i, x: p.x, y: p.y + lrEyeH(p) - 0.1, z: p.z, vx: d[0] * v, vy: d[1] * v, vz: d[2] * v, t: 0, hit: [] });
    lrFxPush('cast', { v: p.i, x: p.x, y: p.y + 1.4, z: p.z });
  }
  // Mending Light: held on an ally in view within 16 m, aimed within about 12 degrees, and kept once caught
  p.beam = -1;
  if (I.alt) {
    const eye = { x: p.x, y: p.y + lrEyeH(p), z: p.z }, d = lrDir(p.yaw, p.pitch); let best = null, bestA = 0.21;
    const ang = q => { const dx = q.x - eye.x, dy = q.y + q.h * 0.6 - eye.y, dz = q.z - eye.z, l = Math.hypot(dx, dy, dz) || 1; return { a: Math.acos(lrClamp((dx * d[0] + dy * d[1] + dz * d[2]) / l, -1, 1)), l }; };
    const ok = (q, lim, far) => { if (!q || !q.alive || q.team !== p.team || q === p) return false; const g = ang(q); return g.l <= far && g.a <= lim && lrSees(eye, { x: q.x, y: q.y + q.h * 0.6, z: q.z }) && lrBlockRay(eye.x, eye.y, eye.z, (q.x - eye.x) / g.l, (q.y + q.h * 0.6 - eye.y) / g.l, (q.z - eye.z) / g.l, g.l) >= g.l - 0.1; };
    const was = LRM.P[p.beamWas];
    if (ok(was, 0.6, 17.5)) best = was;
    else for (const q of LRM.P) { if (!ok(q, bestA, 16)) continue; const g = ang(q); if (g.a < bestA) { bestA = g.a; best = q; } }
    if (best) { p.beam = best.i; lrHeal(best, 60 * dt, p); }
  }
  p.beamWas = p.beam;
  if (I.a1 && p.cd.a1 <= 0) {
    p.cd.a1 = H.cd.a1; p.act = { k: 'a1', t: 0 };
    const d = lrDir(p.yaw, p.pitch), v = 16; LRM.proj.push({ id: LRM.nid++, k: 'lantern', team: p.team, owner: p.i, x: p.x, y: p.y + lrEyeH(p), z: p.z, vx: d[0] * v, vy: d[1] * v, vz: d[2] * v, t: 0, hit: [] });
    lrFxPush('throw', { v: p.i, x: p.x, y: p.y + 1.5, z: p.z, w: 'lantern' });
  }
}
function lrUlt(p) {
  p.ult = 0; p.act = { k: 'ult', t: 0 };
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  if (p.hero === 'bollard') {
    lrFxPush('wave', { x: p.x, y: p.y, z: p.z, yaw: p.yaw, v: p.i });
    for (const q of LRM.P) {
      if (!q.alive || q.team === p.team) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > 14 || Math.abs(q.y - p.y) > 3) continue;
      if (Math.abs(lrAng(Math.atan2(-dx, -dz) - p.yaw)) > 0.61 && d > 1.5) continue;
      if (lrRay(p.x, p.y + 0.8, p.z, dx / (d || 1), 0, dz / (d || 1), d) < d - 0.3) continue;
      lrHurt(q, 120, p, 'tide');
      if (q.alive && q.brace <= 0) { const k = 13 * (1 - d / 20); q.vx = (dx / (d || 1)) * k; q.vz = (dz / (d || 1)) * k; q.vy = 6; q.gnd = false; q.knockT = 0.6; }
      q.slowT = 3;
    }
  } else if (p.hero === 'razorbill') {
    const d = lrDir(p.yaw, p.pitch), ey = p.y + lrEyeH(p), t = lrRayHit(p.x, ey, p.z, d[0], d[1], d[2], { team: p.team, skip: p.i, max: 45, noBodies: true }).t;
    let x = p.x + d[0] * t, z = p.z + d[2] * t; if (t >= 45) { x = p.x + fx * 45 * Math.cos(Math.min(0.5, Math.abs(p.pitch))); z = p.z + fz * 45 * Math.cos(Math.min(0.5, Math.abs(p.pitch))); }
    const B = LR_MAP.bounds; x = lrClamp(x, B.x0 + 1, B.x1 - 1); z = lrClamp(z, B.z0 + 1, B.z1 - 1);
    LRM.zones.push({ id: LRM.nid++, k: 'broadside', team: p.team, owner: p.i, x, y: lrGround(x, z), z, r: 11, w: 6, l: 22, yaw: p.yaw, t: 1.4 });
    lrFxPush('broadside', { x, z, yaw: p.yaw, t: 1.4, team: p.team, v: p.i });
  } else {
    LRM.zones.push({ id: LRM.nid++, k: 'beacon', team: p.team, owner: p.i, x: p.x, y: p.y, z: p.z, r: 12, t: 6 });
    lrFxPush('beacon', { x: p.x, y: p.y, z: p.z, team: p.team, v: p.i });
  }
}
// the bolts, the tar pots and the thrown lanterns in flight
function lrProjTick(dt) {
  const keep = [];
  for (const j of LRM.proj) {
    j.t += dt; if (j.k !== 'bolt') j.vy -= LR_G * dt;
    const sx = j.x, sy = j.y, sz = j.z, L = Math.hypot(j.vx, j.vy, j.vz) * dt, dx = j.vx * dt / L, dy = j.vy * dt / L, dz = j.vz * dt / L, a = LRM.P[j.owner];
    let gone = false;
    if (j.k === 'bolt') {
      // through allies, mending each once
      for (let k = 0; k < 4; k++) { const h = lrRayHit(sx, sy, sz, dx, dy, dz, { team: j.team, skip: j.owner, who: 'ally', pad: 0.12, max: L, noWalls: true }); if (!h.p || j.hit.includes(h.p.i)) break; j.hit.push(h.p.i); lrHeal(h.p, 30, a); }
      const h = lrRayHit(sx, sy, sz, dx, dy, dz, { team: j.team, skip: j.owner, pad: 0.12, max: L });
      if (h.t < L) { gone = true; if (h.p) lrHurt(h.p, 22 * (h.head ? 2 : 1), a, 'bolt', h.head); else if (h.wall) lrWallHurt(h.wall, 22, a); lrFxPush('spark', { x: h.x, y: h.y, z: h.z, bolt: 1 }); }
      if (j.t > 1.2) gone = true;
    } else {
      const h = lrRayHit(sx, sy, sz, dx, dy, dz, { team: j.team, skip: j.owner, pad: 0.2, max: L, noBodies: j.k === 'lantern' });
      if (h.t < L || j.t > 4) {
        gone = true; const x = h.t < L ? h.x - dx * 0.1 : j.x, z = h.t < L ? h.z - dz * 0.1 : j.z, y = lrGround(x, z, (h.t < L ? h.y : j.y) + 0.3);
        if (j.k === 'tar') { if (h.p) lrHurt(h.p, 30, a, 'tar'); LRM.zones.push({ id: LRM.nid++, k: 'tar', team: j.team, owner: j.owner, x, y, z, r: 4, t: 4 }); lrFxPush('blast', { x, y: y + 0.3, z, r: 4, k2: 'tar' }); }
        else { const hy = Math.max(y + 0.6, Math.min(h.t < L ? h.y : j.y, y + 2.2)); LRM.zones.push({ id: LRM.nid++, k: 'lantern', team: j.team, owner: j.owner, x, y: hy, z, gy: y, r: 5, t: 6 }); lrFxPush('kindle', { x, y: hy, z, team: j.team }); }
      }
    }
    if (!gone) { j.x += j.vx * dt; j.y += j.vy * dt; j.z += j.vz * dt; keep.push(j); }
  }
  LRM.proj = keep;
}
function lrZoneTick(dt) {
  for (const z of LRM.zones) {
    z.t -= dt; const a = LRM.P[z.owner];
    if (z.k === 'broadside') {
      if (z.t <= 0) {
        const fx = -Math.sin(z.yaw), fz = -Math.cos(z.yaw), rx = Math.cos(z.yaw), rz = -Math.sin(z.yaw);
        lrFxPush('volley', { x: z.x, z: z.z, yaw: z.yaw, team: z.team });
        for (const q of LRM.P) { if (!q.alive || q.team === z.team) continue; const ox = q.x - z.x, oz = q.z - z.z; if (Math.abs(ox * fx + oz * fz) <= z.l / 2 + q.r && Math.abs(ox * rx + oz * rz) <= z.w / 2 + q.r && q.y < z.y + 6) lrHurt(q, 220, a, 'broadside'); }
        for (const w of LRM.walls) { const ox = w.x - z.x, oz = w.z - z.z; if (Math.abs(ox * fx + oz * fz) <= z.l / 2 + 2 && Math.abs(ox * rx + oz * rz) <= z.w / 2 + 2) lrWallHurt(w, 220, a); }
      }
      continue;
    }
    for (const q of LRM.P) {
      if (!q.alive || Math.hypot(q.x - z.x, q.z - z.z) > z.r || Math.abs(q.y - (z.gy != null ? z.gy : z.y)) > 3) continue;
      if (z.k === 'tar' && q.team !== z.team) { lrHurt(q, 25 * dt, a, 'tar', false, true); q.tarT = 0.25; }
      else if (z.k === 'lantern' && q.team === z.team) lrHeal(q, 25 * dt, a);
      else if (z.k === 'beacon' && q.team === z.team) lrHeal(q, 80 * dt, a);
    }
  }
  if (LRM.zones.some(z => z.t <= 0)) LRM.zones = LRM.zones.filter(z => z.t > 0);
}

// ---------- the bots (on the host) ----------
// Gullhaven is mostly open streets, so the bots find their way on a coarse grid of the ground (a metre a cell, the
// buildings widened by a body's breadth), with A* to wherever they're going and the route pulled straight wherever the
// grid allows; feelers (lrRay) steer them round a bulkhead or the Wain, and one that stops making way sidesteps and hops.
var LR_NAV = null;
function lrNavInit() {
  if (LR_NAV) return LR_NAV;
  const B = LR_MAP.bounds, W = Math.ceil(B.x1 - B.x0), H = Math.ceil(B.z1 - B.z0), g = new Uint8Array(W * H), pad = 0.8;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = B.x0 + i + 0.5, z = B.z0 + j + 0.5; let bl = x < B.x0 + pad || x > B.x1 - pad || z < B.z0 + pad || z > B.z1 - pad;
    for (const b of LR_MAP.boxes) if (!bl && b[4] > LR_STEP && b[1] < 2 && x > b[0] - pad && x < b[3] + pad && z > b[2] - pad && z < b[5] + pad) bl = true;
    for (const r of LR_MAP.ramps) if (!bl && x > r[0] - pad && x < r[2] + pad && z > r[1] - pad && z < r[3] + pad && lrRampH(r, lrClamp(x, r[0], r[2]), lrClamp(z, r[1], r[3])) > LR_STEP) bl = true;
    g[j * W + i] = bl ? 1 : 0;
  }
  return (LR_NAV = { W, H, g, x0: B.x0, z0: B.z0, gs: new Float32Array(W * H), from: new Int32Array(W * H), seen: new Uint32Array(W * H), run: 0 });
}
const lrNavCell = (N, x, z) => lrClamp(Math.floor(z - N.z0), 0, N.H - 1) * N.W + lrClamp(Math.floor(x - N.x0), 0, N.W - 1);
function lrNavFree(N, c) {
  if (!N.g[c]) return c;
  const ci = c % N.W, cj = (c / N.W) | 0;
  for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N.W || j >= N.H) continue; const k = j * N.W + i; if (!N.g[k]) return k; }
  return c;
}
function lrNavClear(N, ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.5); for (let k = 1; k <= n; k++) { const f = k / n; if (N.g[lrNavCell(N, ax + (bx - ax) * f, az + (bz - az) * f)]) return false; } return true; }
// A* over the grid, 8 ways; the route as a few points, pulled straight
function lrAstar(sx, sz, gx, gz) {
  const N = lrNavInit(), W = N.W, s = lrNavFree(N, lrNavCell(N, sx, sz)), g = lrNavFree(N, lrNavCell(N, gx, gz));
  if (s === g) return [[gx, gz]];
  const run = ++N.run, gi = g % W, gj = (g / W) | 0, heap = [], f = [];
  const hf = c => { const di = Math.abs(c % W - gi), dj = Math.abs(((c / W) | 0) - gj); return Math.max(di, dj) + 0.414 * Math.min(di, dj); };
  const push = (c, v) => { heap.push(c); f.push(v); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (f[p] <= f[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [f[p], f[i]] = [f[i], f[p]]; i = p; } };
  const pop = () => { const top = heap[0], lc = heap.pop(), lf = f.pop(); if (heap.length) { heap[0] = lc; f[0] = lf; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && f[l] < f[m]) m = l; if (r < heap.length && f[r] < f[m]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; [f[m], f[i]] = [f[i], f[m]]; i = m; } } return top; };
  N.seen[s] = run; N.gs[s] = 0; N.from[s] = -1; push(s, hf(s));
  let found = false, it = 0;
  while (heap.length && it++ < 20000) {
    const c = pop(); if (c === g) { found = true; break; }
    const ci = c % W, cj = (c / W) | 0, gc = N.gs[c];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= W || j >= N.H) continue;
      const k = j * W + i; if (N.g[k]) continue; if (di && dj && (N.g[cj * W + i] || N.g[j * W + ci])) continue;
      const ng = gc + (di && dj ? 1.414 : 1); if (N.seen[k] === run && N.gs[k] <= ng) continue;
      N.seen[k] = run; N.gs[k] = ng; N.from[k] = c; push(k, ng + hf(k));
    }
  }
  if (!found) return [[gx, gz]];
  const cells = []; for (let c = g; c !== -1; c = N.from[c]) cells.push(c); cells.reverse();
  const pts = cells.map(c => [N.x0 + (c % W) + 0.5, N.z0 + ((c / W) | 0) + 0.5]); pts[pts.length - 1] = N.g[lrNavCell(N, gx, gz)] ? pts[pts.length - 1] : [gx, gz];
  const out = []; let a = [sx, sz], i = 0;
  while (i < pts.length - 1) { let j = Math.min(pts.length - 1, i + 24); while (j > i + 1 && !lrNavClear(N, a[0], a[1], pts[j][0], pts[j][1])) j--; out.push(pts[j]); a = pts[j]; i = j; }
  if (!out.length) out.push(pts[pts.length - 1]);
  return out;
}
// where the road nearest a point is, as a distance along it
function lrPathNear(x, z) { const P = lrPathInit(); let best = 0, bd = 1e9; for (const q of P.seg) { const u = lrClamp((x - q.x) * q.dx + (z - q.z) * q.dz, 0, q.l), d = Math.hypot(q.x + q.dx * u - x, q.z + q.dz * u - z); if (d < bd) { bd = d; best = q.s + u; } } return best; }
function lrRoadPt(s, lat) { const a = lrPathAt(s), rx = Math.cos(a.yaw), rz = -Math.sin(a.yaw); return [a.x + rx * lat, a.z + rz * lat]; }
// what a bot can see: its enemies in view (nearest first), its allies in view, and the target it keeps
function lrBotSee(p, ai, S) {
  const eye = { x: p.x, y: p.y + lrEyeH(p), z: p.z }, foes = [], pals = [];
  for (const q of LRM.P) {
    if (!q.alive || q === p) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z); if (d > (q.team === p.team ? 20 : 60)) continue;
    const c = { x: q.x, y: q.y + q.h * 0.6, z: q.z }; if (!lrSees(eye, c)) continue;
    if (LRM.walls.length) { const dx = c.x - eye.x, dy = c.y - eye.y, dz = c.z - eye.z, l = Math.hypot(dx, dy, dz); if (lrBlockRay(eye.x, eye.y, eye.z, dx / l, dy / l, dz / l, l) < l - 0.2) continue; }
    (q.team === p.team ? pals : foes).push({ q, d });
  }
  foes.sort((a, b) => a.d - b.d); pals.sort((a, b) => a.q.hp / a.q.maxHp - b.q.hp / b.q.maxHp);
  ai.foes = foes; ai.pals = pals;
  const cur = foes.find(f => f.q.i === ai.tgt);
  // keep the one it's on unless another is much nearer; a marksman picks off the weakest in range
  let pick = foes[0] || null;
  if (p.hero === 'razorbill' && foes.length > 1) { const w = foes.filter(f => f.d < 40).sort((a, b) => a.q.hp - b.q.hp)[0]; if (w && w.q.hp < 120) pick = w; }
  if (cur && pick && cur.d < pick.d + 6) pick = cur;
  if (pick && pick.q.i !== ai.tgt) { ai.react = S.react * (0.8 + Math.random() * 0.5); ai.head = Math.random() < S.head; }
  ai.tgt = pick ? pick.q.i : -1; ai.tgtD = pick ? pick.d : 0;
}
// where a bot wants to be: its place round the Wain (pushing it, or holding the road ahead of it), or somewhere to
// mend when it's low
function lrBotGoal(p, ai) {
  const C = LRM.cart, H = LR_HEROES[p.hero], hpF = p.hp / p.maxHp, slot = p.i % 5, L = C.L || lrPathLen(), role = H.role;
  ai.retreat = hpF < (role === 'tank' ? 0.25 : 0.36) || (ai.retreat && hpF < 0.7);
  if (ai.retreat) {
    let best = null, bd = 40;
    for (const k of LRM.packs) { if (k.t > 2) continue; const d = Math.hypot(k.x - p.x, k.z - p.z) + (k.big ? -6 : 0); if (d < bd) { bd = d; best = [k.x, k.z]; } }
    const med = LRM.P.find(q => q.alive && q.team === p.team && q.hero === 'linnet' && q !== p && Math.hypot(q.x - p.x, q.z - p.z) < 30);
    if (med && (!best || Math.hypot(med.x - p.x, med.z - p.z) < bd)) return [med.x, med.z];
    if (best) return best;
    const sp = lrSpawnOf(p); return [sp[0], sp[1]];
  }
  if (LRM.ph === 'setup' && p.team === 0) return [-92, (slot - 2) * 2.5];
  const lat = [0, 3, -3, 2, -2][slot];
  if (p.team === 0) {
    const off = role === 'tank' ? 2.8 : role === 'damage' ? -0.5 : -3.5;
    // a Linnet keeps near whoever's hurt in the push; otherwise everyone stays within reach of the Wain
    if (role === 'support' && ai.pals && ai.pals.length && ai.pals[0].q.hp / ai.pals[0].q.maxHp < 0.8 && Math.hypot(ai.pals[0].q.x - C.x, ai.pals[0].q.z - C.z) < 14) { const q = ai.pals[0].q; return [q.x + Math.cos(q.yaw) * 2.5, q.z - Math.sin(q.yaw) * 2.5]; }
    return lrRoadPt(lrClamp(C.s + off, 0, L), lat);
  }
  // the defence: the tank contests the Wain when it's being pushed, the rest hold the road ahead of it; with time
  // short, or the Wain near a checkpoint, everyone piles on
  const next = LRM.stage < LR_MAP.cps.length ? LR_MAP.cps[LRM.stage] * L : L, urgent = LRM.ot || LRM.clock < 25 || next - C.s < 12;
  const pushed = C.n > 0, mates = LRM.P.filter(q => q.team === p.team && q.alive && q !== p);
  // the line they hold: the road well ahead of the Wain, the tank in front, the marksmen furthest back
  const ahead = (role === 'tank' ? 10 : role === 'damage' ? 19 + slot * 1.5 : 14) + (C.s < 15 ? 10 : 0), hold = lrClamp(C.s + ahead, 0, L);
  // back from the dead, or the crew scattered: gather on the line with the others before going in, rather than walk
  // in one at a time (unless time's short)
  const atLine = q => Math.abs(lrPathNear(q.x, q.z) - (C.s + 14)) < 14 && Math.hypot(q.x - C.x, q.z - C.z) < 34;
  const gathered = mates.filter(atLine).length;
  if (LRM.ph === 'play' && !urgent && !atLine(p) && gathered < 2 && mates.length >= 2) return lrRoadPt(lrClamp(C.s + 26, 0, L), lat);
  // one stands on the Wain to stop it, with the others near enough to cover him: the tank, or with no tank near,
  // whoever of the rest is nearest; the others hold the line and shoot (all of them pile on only with time short or
  // a checkpoint close)
  let lead = LRM.P.find(q => q.team === p.team && q.alive && q.hero === 'bollard' && Math.hypot(q.x - C.x, q.z - C.z) < 30);
  if (!lead) { let bd = 30; for (const q of LRM.P) { if (q.team !== p.team || !q.alive || q.hero === 'linnet') continue; const d = Math.hypot(q.x - C.x, q.z - C.z); if (d < bd) { bd = d; lead = q; } } }
  if (LRM.ph === 'play' && pushed && (urgent || (lead === p && gathered >= 2))) return lrRoadPt(C.s + 1.5, lat * 0.6);
  if (LRM.ph === 'play' && role === 'support' && lead && lead !== p && Math.hypot(lead.x - C.x, lead.z - C.z) < 12) { const a = lrPathAt(Math.min(L, lrPathNear(lead.x, lead.z) + 7)); return [a.x + Math.cos(a.yaw) * lat, a.z - Math.sin(a.yaw) * lat]; }
  return lrRoadPt(hold, lat * 1.4);
}
function lrLobPitch(d, dy, v) { const g = LR_G, disc = v ** 4 - g * (g * d * d + 2 * dy * v * v); if (disc < 0) return 0.72; return Math.atan((v * v - Math.sqrt(disc)) / (g * Math.max(0.5, d))); }
function lrBot(p, dt) {
  const I = p.inp, ai = p.ai || (p.ai = {}), S = LR_SKILL[(LRM.set && LRM.set.skill) || 'fair'] || LR_SKILL.fair, H = LR_HEROES[p.hero];
  I.fire = I.alt = I.a1 = I.a2 = I.ult = I.reload = I.jump = false; I.mx = I.mz = 0;
  if (!p.alive || !H) { ai.path = null; return; }
  if (ai.yaw == null || ai.sn !== p.sn) Object.assign(ai, { yaw: p.yaw, pitch: 0, sn: p.sn, seeT: 0, tgt: -1, react: 0, ex: 0, ey: 0, exT: 0, abT: Math.random() * 0.3, path: null, repT: 0, stuckT: 0, lastX: p.x, lastZ: p.z, chkT: 1, uT: 0, sdT: 0, sd: 1, mode: null, foes: [], pals: [] });
  if (LRM.ph === 'pick' || LRM.ph === 'over') return;
  ai.seeT -= dt; if (ai.seeT <= 0) { ai.seeT = 0.12 + S.react * 0.5 * Math.random(); lrBotSee(p, ai, S); }
  if (ai.react > 0) ai.react -= dt;
  ai.exT -= dt; if (ai.exT <= 0) { ai.exT = 0.25 + Math.random() * 0.35; ai.tex = (Math.random() - 0.5) * 2 * S.err; ai.tey = (Math.random() - 0.5) * 1.4 * S.err; }
  ai.ex += ((ai.tex || 0) - ai.ex) * Math.min(1, dt * 5); ai.ey += ((ai.tey || 0) - ai.ey) * Math.min(1, dt * 5);
  const C = LRM.cart, hpF = p.hp / p.maxHp, hurt = LRM.t - p.hurtAt < 1.2, tq = ai.tgt >= 0 ? LRM.P[ai.tgt] : null, tg = tq && tq.alive ? tq : null;
  ai.near = !!tg || Math.hypot(p.x - C.x, p.z - C.z) < 16;
  const eye = { x: p.x, y: p.y + lrEyeH(p), z: p.z };
  // ---- what to look at, and what to do
  let aimP = null, lob = 0, fire = false, alt = false, wantYaw = null;
  const healT = p.hero === 'linnet' ? (ai.pals || []).find(f => f.q.alive && f.q.hp / f.q.maxHp < 0.85 && f.d < 15) : null;
  if (ai.mode && LRM.t > ai.mode.until) ai.mode = null;
  if (ai.mode) { aimP = ai.mode.at; lob = ai.mode.lob || 0; }
  else if (healT && (!tg || ai.tgtD > 9 || healT.q.hp / healT.q.maxHp < 0.5)) { const q = healT.q; aimP = { x: q.x, y: q.y + q.h * 0.6, z: q.z }; alt = true; }
  else if (tg) {
    const d = Math.hypot(tg.x - eye.x, tg.z - eye.z), tt = p.hero === 'linnet' ? d / 60 : 0, ld = tt * S.lead;
    aimP = { x: tg.x + tg.vx * ld, y: tg.y + (ai.head ? tg.h - lrHeadR(tg) : tg.h * 0.6) + (p.hero === 'linnet' ? 0 : 0), z: tg.z + tg.vz * ld };
    fire = ai.react <= 0 && (p.hero !== 'bollard' || d < H.range + tg.r + 0.2) && d < H.range;
    if (p.hero === 'razorbill' && d > 22 && S.strafe >= 0.5 && !hurt) alt = true;
  }
  // abilities, a few times a second
  ai.abT -= dt;
  if (ai.abT <= 0 && LRM.ph !== 'pick') { ai.abT = 0.3; if (Math.random() < S.abil) lrBotAbil(p, ai, S, I, tg, hpF, hurt, eye); }
  if (ai.mode && ai.mode.press && LRM.t >= ai.mode.pressAt) { I[ai.mode.press] = true; if (ai.mode.once) ai.mode = null; }
  // the reload: empty, or nothing to shoot at and under half
  if (H.mag && (p.ammo === 0 || (!tg && p.ammo < H.mag * 0.5))) I.reload = true;
  // ---- the aim, turned towards at the bot's own rate
  let dy = 0, dp = 0;
  if (aimP) {
    const dx = aimP.x - eye.x, dyy = aimP.y - eye.y, dz = aimP.z - eye.z, hd = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dx, -dz) + ai.ex, pitch = (lob ? lrLobPitch(hd, dyy, lob) : Math.atan2(dyy, hd)) + ai.ey;
    dy = lrAng(yaw - ai.yaw); dp = pitch - ai.pitch;
    const tr = S.turn * dt; ai.yaw = lrAng(ai.yaw + lrClamp(dy, -tr, tr)); ai.pitch = lrClamp(ai.pitch + lrClamp(dp, -tr, tr), -1.45, 1.45);
    dy = lrAng(yaw - ai.yaw); dp = pitch - ai.pitch;
    const tol = tg && !alt ? Math.max(0.03, Math.atan2(tg.r * 1.1, Math.max(1, ai.tgtD))) + 0.02 : 0.08;
    if (fire && Math.abs(dy) < (p.hero === 'bollard' ? 0.6 : tol) && Math.abs(dp) < tol * 1.5) I.fire = true;
    if (alt && (p.hero !== 'linnet' || Math.abs(dy) < 0.18)) I.alt = true;
  }
  // ---- where to go
  let goal = lrBotGoal(p, ai);
  if (tg && !ai.retreat && LRM.ph === 'play') {
    // close in, or keep a distance, without going far from where it should be
    const d = ai.tgtD, ax = tg.x - p.x, az = tg.z - p.z;
    if (p.hero === 'bollard' && d < 12 && Math.hypot(tg.x - goal[0], tg.z - goal[1]) < 12) goal = [tg.x, tg.z];
    else if (p.hero === 'razorbill' && d < 9) goal = [p.x - ax / d * 4, p.z - az / d * 4];
  }
  let mx = 0, mz = 0;
  const gd = Math.hypot(goal[0] - p.x, goal[1] - p.z);
  if (ai.uT > 0) { ai.uT -= dt; mx = ai.ux; mz = ai.uz; if (ai.uT > 0.35) I.jump = true; }
  else if (gd > 1.2) {
    ai.repT -= dt;
    if (!ai.path || ai.repT <= 0 || Math.hypot(goal[0] - ai.pg[0], goal[1] - ai.pg[1]) > 3) { ai.path = lrAstar(p.x, p.z, goal[0], goal[1]); ai.pg = goal; ai.pi = 0; ai.repT = 0.9 + Math.random() * 0.5; }
    while (ai.pi < ai.path.length - 1 && Math.hypot(ai.path[ai.pi][0] - p.x, ai.path[ai.pi][1] - p.z) < 1.3) ai.pi++;
    const w = ai.path[ai.pi] || goal; mx = w[0] - p.x; mz = w[1] - p.z; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
    // feelers: something in the way (a bulkhead, the Wain, a crate): turn to the clearer side
    const ahead = Math.min(3, l), f0 = lrBlockRay(p.x, p.y + 0.6, p.z, mx, 0, mz, ahead + p.r);
    if (f0 < ahead && f0 < 2.2) {
      const turn = a => [mx * Math.cos(a) - mz * Math.sin(a), mx * Math.sin(a) + mz * Math.cos(a)];
      const L = turn(0.7), R = turn(-0.7), fl = lrBlockRay(p.x, p.y + 0.6, p.z, L[0], 0, L[1], 4), fr = lrBlockRay(p.x, p.y + 0.6, p.z, R[0], 0, R[1], 4);
      [mx, mz] = fl >= fr ? L : R;
    }
  } else if (tg && S.strafe) { mx = 0; mz = 0; }
  // keep off allies' heels
  for (const q of LRM.P) if (q !== p && q.alive && q.team === p.team) { const ox = p.x - q.x, oz = p.z - q.z, d = Math.hypot(ox, oz); if (d < 1.6 && d > 0.01) { mx += ox / d * 0.5; mz += oz / d * 0.5; } }
  // a little strafing in a fight
  if (tg && S.strafe && !alt && !ai.retreat) { ai.sdT -= dt; if (ai.sdT <= 0) { ai.sdT = 0.5 + Math.random() * 0.9; ai.sd = Math.random() < 0.5 ? -1 : 1; } const rx = Math.cos(ai.yaw), rz = -Math.sin(ai.yaw); mx += rx * ai.sd * 0.7 * S.strafe; mz += rz * ai.sd * 0.7 * S.strafe; if (S.strafe >= 1 && Math.random() < dt * 0.3) I.jump = true; }
  // stuck: hardly moved in a second while meaning to: sidestep and hop, and find the way again
  ai.chkT -= dt;
  if (ai.chkT <= 0) { const moved = Math.hypot(p.x - ai.lastX, p.z - ai.lastZ); if (moved < 0.45 && gd > 2 && ai.uT <= 0 && p.act.k !== 'a1') { const s = Math.random() < 0.5 ? 1 : -1, l = Math.hypot(mx, mz) || 1; ai.ux = -mz / l * s; ai.uz = mx / l * s; ai.uT = 0.6; ai.path = null; } ai.lastX = p.x; ai.lastZ = p.z; ai.chkT = 1; }
  // gliding down after Gull's Rise
  if (p.hero === 'razorbill' && p.glide && p.vy < 0) I.jump = true;
  // with nothing to aim at, look the way it's going (or along the road ahead)
  if (!aimP) {
    const l = Math.hypot(mx, mz); wantYaw = l > 0.3 ? Math.atan2(-mx, -mz) : p.team ? lrPathAt(C.s).yaw + Math.PI : lrPathAt(C.s).yaw;
    const tr = S.turn * 0.6 * dt; ai.yaw = lrAng(ai.yaw + lrClamp(lrAng(wantYaw - ai.yaw), -tr, tr)); ai.pitch += (0 - ai.pitch) * Math.min(1, dt * 3);
  }
  I.yaw = ai.yaw; I.pitch = ai.pitch;
  const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
  const sy = Math.sin(ai.yaw), cy = Math.cos(ai.yaw);
  I.mz = mx * -sy + mz * -cy; I.mx = mx * cy + mz * -sy;
}
// a bot's abilities, used where they make sense
function lrBotAbil(p, ai, S, I, tg, hpF, hurt, eye) {
  const foes = ai.foes || [], pals = ai.pals || [], C = LRM.cart, at = (q, y) => ({ x: q.x, y: q.y + (y == null ? q.h * 0.6 : y), z: q.z });
  const inCone = (yaw, r, half) => foes.filter(f => f.q.alive && f.d < r && Math.abs(lrAng(Math.atan2(-(f.q.x - p.x), -(f.q.z - p.z)) - yaw)) < half).length;
  const mode = (o) => { ai.mode = Object.assign({ until: LRM.t + 0.9, pressAt: LRM.t + 0.15, once: true }, o); };
  if (p.hero === 'bollard') {
    if (p.ult >= 1 && tg && inCone(Math.atan2(-(tg.x - p.x), -(tg.z - p.z)), 12, 0.5) >= S.clump) mode({ at: at(tg), press: 'ult', pressAt: LRM.t + 0.12 });
    else if (p.cd.alt <= 0 && tg && hpF < 0.65 && hurt && ai.tgtD > 6 && ai.tgtD < 30 && !LRM.walls.some(w => w.owner === p.i)) mode({ at: at(tg), press: 'alt', pressAt: LRM.t + 0.1 });
    else if (p.cd.a2 <= 0 && hurt && hpF < 0.75) I.a2 = true;
    else if (p.cd.a1 <= 0 && tg && ai.tgtD > 4.5 && ai.tgtD < 11 && Math.abs(lrAng(Math.atan2(-(tg.x - p.x), -(tg.z - p.z)) - p.yaw)) < 0.2) I.a1 = true;
  } else if (p.hero === 'razorbill') {
    if (p.ult >= 1) {
      // a clump of them, best of all on the Wain: the strip laid along the line to them
      for (const f of foes) { if (f.d > 44 || f.d < 8) continue; const yaw = Math.atan2(-(f.q.x - p.x), -(f.q.z - p.z)), fx = -Math.sin(yaw), fz = -Math.cos(yaw); const n = foes.filter(g => { const ox = g.q.x - f.q.x, oz = g.q.z - f.q.z; return Math.abs(ox * fx + oz * fz) < 10 && Math.abs(-ox * fz + oz * fx) < 3; }).length; if (n >= S.clump || (n >= 2 && Math.hypot(f.q.x - C.x, f.q.z - C.z) < 6)) { mode({ at: at(f.q, 0), press: 'ult', pressAt: LRM.t + 0.35 }); return; } }
    }
    if (p.cd.a2 <= 0 && tg && ai.tgtD > 5 && ai.tgtD < 26) { const n = foes.filter(g => Math.hypot(g.q.x - tg.x, g.q.z - tg.z) < 4.5).length; if (n >= 2 || Math.hypot(tg.x - C.x, tg.z - C.z) < 5) { mode({ at: at(tg, 0), lob: 24, press: 'a2', pressAt: LRM.t + 0.3 }); return; } }
    if (p.cd.a1 <= 0 && ((hurt && hpF < 0.45) || (tg && ai.tgtD > 18 && Math.random() < 0.12))) I.a1 = true;
  } else {
    const hurtN = pals.filter(f => f.q.alive && f.q.hp / f.q.maxHp < 0.6 && f.d < 12).length + (hpF < 0.6 ? 1 : 0);
    if (p.ult >= 1 && (hurtN >= Math.max(2, S.clump) || (hurtN >= 1 && foes.length >= 3))) { I.ult = true; return; }
    if (p.cd.a1 <= 0) {
      const w = pals.find(f => f.q.alive && f.q.hp / f.q.maxHp < 0.7 && f.d < 13);
      if (hpF < 0.55 && (!w || Math.random() < 0.5)) { mode({ at: { x: p.x - Math.sin(p.yaw) * 0.8, y: p.y, z: p.z - Math.cos(p.yaw) * 0.8 }, lob: 16, press: 'a1', pressAt: LRM.t + 0.25 }); return; }
      if (w) { mode({ at: at(w.q, 0), lob: 16, press: 'a1', pressAt: LRM.t + 0.3 }); return; }
    }
    if (p.cd.a2 <= 0 && hurt && hpF < 0.4) { I.a2 = true; ai.retreat = true; }
  }
}

// ---------- snapshots (for online) ----------
const LR_ACTS = [null, 'a1', 'a2', 'alt', 'ult'], LR_CST = ['push', 'contest', 'idle', 'back'], LR_ZK = ['tar', 'lantern', 'beacon', 'broadside'], LR_JK = ['bolt', 'tar', 'lantern'];
const lrR = (v, k) => Math.round(v * (k || 100)) / (k || 100);
// the whole match, small: numbers rounded, players as arrays in seat order, and the events since the last snapshot
function lrSnap() {
  const fx = LRM.FX.filter(f => f.id > (LRM.snapFx || 0)).slice(-8); if (LRM.FX.length) LRM.snapFx = LRM.FX[LRM.FX.length - 1].id;
  const C = LRM.cart;
  return {
    ph: LRM.ph, pt: lrR(LRM.phT, 10), t: lrR(LRM.t, 10), c: lrR(LRM.clock, 10), ot: LRM.ot ? 1 : 0, oT: lrR(LRM.otT, 10), st: LRM.stage, w: LRM.win,
    P: LRM.P.map(p => [LR_HERO_IDS.indexOf(p.hero), lrR(p.x), lrR(p.y), lrR(p.z), lrR(p.vx, 10), lrR(p.vy, 10), lrR(p.vz, 10), lrR(p.yaw), lrR(p.pitch),
      Math.ceil(p.hp), (p.alive ? 1 : 0) | (p.gnd ? 2 : 0) | (p.alt ? 4 : 0) | (p.glide ? 8 : 0), lrR(p.deadT, 10), lrR(p.spawnT, 10), p.ammo, lrR(p.reload, 10),
      lrR(p.cd.a1, 10), lrR(p.cd.a2, 10), lrR(p.cd.alt, 10), Math.floor(p.ult * 100), LR_ACTS.indexOf(p.act.k), lrR(p.act.t, 10), lrR(p.brace, 10), lrR(p.slow, 10),
      p.kills, p.deaths, Math.round(p.dmg), Math.round(p.heal), p.elims, p.beam, p.sn, lrR(p.fireT, 10)]),
    C: [lrR(C.s), LR_CST.indexOf(C.st), C.n, C.nd, lrR(C.idleT, 10)],
    W: LRM.walls.map(w => [w.id, w.team, w.owner, lrR(w.x), lrR(w.y), lrR(w.z), lrR(w.yaw), Math.ceil(w.hp), lrR(w.t, 10)]),
    Z: LRM.zones.map(z => [z.id, LR_ZK.indexOf(z.k), z.team, z.owner, lrR(z.x, 10), lrR(z.y, 10), lrR(z.z, 10), z.r, lrR(z.t, 10), lrR(z.yaw || 0)]),
    J: LRM.proj.map(j => [j.id, LR_JK.indexOf(j.k), j.team, j.owner, lrR(j.x, 10), lrR(j.y, 10), lrR(j.z, 10), lrR(j.vx, 10), lrR(j.vy, 10), lrR(j.vz, 10)]),
    K: LRM.packs.map(k => Math.ceil(k.t)),
    F: LRM.feed.slice(-5).map(f => [lrR(f.t, 10), f.a, f.v, f.how]),
    X: fx.map(f => { const o = {}; for (const k in f) if (k !== 't') o[k] = typeof f[k] === 'number' && k !== 'id' ? lrR(f[k], 10) : f[k]; return o; }),
  };
}
// a snapshot onto this screen (a guest's): everything as the host has it, but its own body, which it moves itself
// (put right only when it's far out, or it has died or come back)
function lrApply(s) {
  if (!s) return;
  LRM.ph = s.ph; LRM.phT = s.pt; LRM.t = Math.max(LRM.t, s.t); LRM.clock = s.c; LRM.ot = !!s.ot; LRM.otT = s.oT; LRM.stage = s.st; LRM.win = s.w;
  (s.P || []).forEach((a, i) => {
    let p = LRM.P[i]; if (!p) { p = LRM.P[i] = lrNewP(i, i < 5 ? 0 : 1, 'Player ' + (i + 1), false); }
    const hero = LR_HERO_IDS[a[0]] || ''; if (hero !== p.hero) { if (hero) lrSetHero(p, hero); else p.hero = ''; }
    const mine = i === LRM.me && !!LRM.net && !lrHost(), alive = !!(a[10] & 1), far = Math.hypot(a[1] - p.x, a[3] - p.z) > 3;
    if (!mine || far || a[29] !== p.sn || !alive) {
      p.px = p.x; p.py = p.y; p.pz = p.z; p.x = a[1]; p.y = a[2]; p.z = a[3]; p.vx = a[4]; p.vy = a[5]; p.vz = a[6];
      if (!mine || a[29] !== p.sn) { p.yaw = a[7]; p.pitch = a[8]; p.inp.yaw = a[7]; p.inp.pitch = a[8]; }
    }
    p.hp = a[9]; p.alive = alive; p.gnd = !!(a[10] & 2); p.alt = !!(a[10] & 4); p.glide = !!(a[10] & 8); p.deadT = a[11]; p.spawnT = a[12]; p.ammo = a[13]; p.reload = a[14];
    p.cd = { a1: a[15], a2: a[16], alt: a[17] }; p.ult = a[18] / 100; const k = LR_ACTS[a[19]] || null; if (!mine || k !== null || p.act.k === null) p.act = { k, t: a[20] }; p.brace = a[21]; p.slow = a[22];
    p.kills = a[23]; p.deaths = a[24]; p.dmg = a[25]; p.heal = a[26]; p.elims = a[27]; p.beam = a[28]; p.sn = a[29]; if (!mine) p.fireT = a[30];
  });
  if (s.C && LRM.cart) { const C = LRM.cart; C.px = C.x; C.pz = C.z; C.s = s.C[0]; C.st = LR_CST[s.C[1]] || 'idle'; C.n = s.C[2]; C.nd = s.C[3]; C.idleT = s.C[4]; lrPlaceCart(); }
  else if (s.C) { const at = lrPathAt(s.C[0]); LRM.cart = { s: s.C[0], x: at.x, y: 0, z: at.z, yaw: at.yaw, st: LR_CST[s.C[1]] || 'idle', n: s.C[2], nd: s.C[3], idleT: s.C[4], px: at.x, pz: at.z, L: lrPathLen() }; }
  LRM.walls = (s.W || []).map(w => ({ id: w[0], team: w[1], owner: w[2], x: w[3], y: w[4], z: w[5], yaw: w[6], w: 6, h: 3, hp: w[7], t: w[8] }));
  LRM.zones = (s.Z || []).map(z => ({ id: z[0], k: LR_ZK[z[1]], team: z[2], owner: z[3], x: z[4], y: z[5], z: z[6], r: z[7], t: z[8], yaw: z[9], w: 6, l: 22 }));
  LRM.proj = (s.J || []).map(j => ({ id: j[0], k: LR_JK[j[1]], team: j[2], owner: j[3], x: j[4], y: j[5], z: j[6], vx: j[7], vy: j[8], vz: j[9], t: 0, hit: [] }));
  if (!LRM.packs.length) LRM.packs = LR_MAP.packs.map(k => ({ x: k[0], z: k[1], big: !!k[2], t: 0 }));
  (s.K || []).forEach((t, i) => { if (LRM.packs[i]) LRM.packs[i].t = t; });
  LRM.feed = (s.F || []).map(f => ({ t: f[0], a: f[1], v: f[2], how: f[3] }));
  const top = LRM.FX.length ? LRM.FX[LRM.FX.length - 1].id : 0;
  for (const f of s.X || []) if (f.id > top) LRM.FX.push(Object.assign({}, f, { t: LRM.t }));
  if (LRM.FX.length > 120) LRM.FX = LRM.FX.slice(-120);
  LRM.fxId = Math.max(LRM.fxId, top);
}

// ---------- your own input ----------
// the look, every frame (mouse under pointer lock, the right stick, a finger dragged on the right of the screen),
// turned by the look sensitivity settings; through Razorbill's glass it's slowed by the zoom
function lrLocalLook(dt) {
  const me = lrMe(); if (!me || me.bot) return;
  if (LRM.spawnSeen !== me.sn) { LRM.spawnSeen = me.sn; LRM.ly = me.yaw; LRM.lp = me.pitch; }
  const blocked = lrInputBlocked();
  const zoom = me.hero === 'razorbill' && me.alt && me.alive ? 2 : 1, sens = 0.0031 / zoom;
  const mx = LRM.mlook[0], my = LRM.mlook[1]; LRM.mlook = [0, 0];
  if (blocked) return;
  const kx = typeof lookKX === 'function' ? lookKX() : 1, ky = typeof lookKY === 'function' ? lookKY() : 1;
  LRM.ly = lrAng(LRM.ly - mx * sens * kx); LRM.lp = lrClamp(LRM.lp - my * sens * ky, -1.5, 1.5);
  const P = LRM.pad; if (P.lx || P.ly) { const pk = (typeof FPS !== 'undefined' && FPS.padLookK) || 1; LRM.ly = lrAng(LRM.ly - P.lx * dt * 3.4 * pk / zoom); LRM.lp = lrClamp(LRM.lp - P.ly * dt * 2.3 * pk / zoom, -1.5, 1.5); }
  if (LRM.keys.ArrowLeft) LRM.ly = lrAng(LRM.ly + dt * 2.2); if (LRM.keys.ArrowRight) LRM.ly = lrAng(LRM.ly - dt * 2.2);
}
function lrInputBlocked() { return LRM.paused || LRM.picking || (LRM.ph === 'pick' && lrMe() && !lrMe().hero) || LRM.ph === 'over'; }
function lrLocalInput(me) {
  const I = me.inp, K = LRM.keys, T = LRM.touch, P = LRM.pad, b = lrInputBlocked();
  if (LRM.spawnSeen !== me.sn) { LRM.spawnSeen = me.sn; LRM.ly = me.yaw; LRM.lp = me.pitch; }
  I.yaw = LRM.ly; I.pitch = LRM.lp;
  if (b) { I.mx = I.mz = 0; I.jump = I.fire = I.alt = I.a1 = I.a2 = I.ult = I.reload = false; return; }
  let mx = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + (P.mx || 0), mz = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) + (P.mz || 0);
  if (LRM.stick) { mx += LRM.stick.dx; mz -= LRM.stick.dy; }
  I.mx = lrClamp(mx, -1, 1); I.mz = lrClamp(mz, -1, 1);
  I.jump = !!(K.Space || T.jump || P.jump); I.fire = !!((LRM.mb & 1) || T.fire || P.fire); I.alt = !!((LRM.mb & 2) || T.alt || P.alt);
  I.a1 = !!(K.ShiftLeft || K.ShiftRight || T.a1 || P.a1); I.a2 = !!(K.KeyE || T.a2 || P.a2); I.ult = !!(K.KeyQ || T.ult || P.ult); I.reload = !!(K.KeyR || T.reload || P.reload);
}
// your hero, from the select (or H): straight away in the pick, in your spawn or while dead
function lrChoose(id) {
  const me = lrMe(); if (!me || !LR_HEROES[id]) return;
  LRM.picking = false;
  if (!lrCanChange(me)) { lrSay('You can change hero only in your spawn, or while you’re down', 2.5); return; }
  me.inp.hero = id;
  if (lrHost()) { const first = !me.hero; if (id !== me.hero) { lrSetHero(me, id); if (first || LRM.ph === 'pick') lrRespawn(me, true); } me.inp.hero = ''; LRM.spawnSeen = -1; lrRebalance(me.team); if (LRM.ph === 'pick' && LRM.P.every(p => p.hero)) lrSetup(); }
  lrSnd('pick');
}
function lrAskHero() { const me = lrMe(); if (!me || me.bot || LRM.ph === 'over') return; if (!lrCanChange(me)) { lrSay('Change hero in your spawn, or while you’re down', 2); return; } LRM.picking = !LRM.picking; if (LRM.picking && document.pointerLockElement) try { document.exitPointerLock(); } catch (e) {} }
function lrPause(on) {
  if (!LRM.on) return;
  LRM.paused = !!on;
  if (on) { LRM.keys = {}; LRM.mb = 0; if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) {} }
  if (typeof lrHudPause === 'function') lrHudPause(!!on);
}
function lrKey(e, down) {
  if (typeof state === 'undefined' || state !== 'lamproad' || !LRM.on) return;
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.key !== 'Escape') return;
  const c = e.code;
  e.stopImmediatePropagation();
  if (c === 'Escape') { if (down) { e.preventDefault(); if (performance.now() - (LRM.lockPauseAt || 0) < 400) return; if (LRM.picking) LRM.picking = false; else if (LRM.ph !== 'over') lrPause(!LRM.paused); } return; }
  if (c === 'Tab') { e.preventDefault(); LRM.board = down; return; }
  if (LRM.paused) return;
  if (down && !e.repeat) {
    if (c === 'KeyH') { lrAskHero(); e.preventDefault(); return; }
    if ((LRM.picking || (LRM.ph === 'pick' && !lrMe().hero)) && /^Digit[123]$/.test(c)) { lrChoose(LR_HERO_IDS[+c.slice(5) - 1]); e.preventDefault(); return; }
  }
  if (/^(Key[WASDEQRH]|Space|Shift(Left|Right)|Arrow(Up|Down|Left|Right))$/.test(c)) { LRM.keys[c] = down; e.preventDefault(); }
}
addEventListener('keydown', e => lrKey(e, true), true);
addEventListener('keyup', e => lrKey(e, false), true);
addEventListener('blur', () => { LRM.keys = {}; LRM.mb = 0; });
// the mouse: click the view to lock the pointer to it, then it aims; the buttons are read from e.buttons, so firing
// and aiming at once both hold
function lrCanvas() { return typeof $ === 'function' ? $('lrCv') : null; }
addEventListener('pointerdown', e => {
  if (!LRM.on || typeof state === 'undefined' || state !== 'lamproad' || e.pointerType === 'touch') return;
  const cv = lrCanvas(); if (!cv || e.target !== cv) return;
  e.preventDefault();
  if (LRM.paused || LRM.picking) return;
  if (document.pointerLockElement !== cv) { try { cv.requestPointerLock(); } catch (err) {} return; }
  LRM.mb = e.buttons | 0;
}, true);
addEventListener('pointermove', e => { if (LRM.on && e.pointerType === 'mouse' && document.pointerLockElement === lrCanvas()) LRM.mb = e.buttons | 0; }, true);
addEventListener('pointerup', e => { if (LRM.on && e.pointerType !== 'touch') LRM.mb = e.buttons | 0; }, true);
addEventListener('contextmenu', e => { if (LRM.on && e.target === lrCanvas()) e.preventDefault(); }, true);
addEventListener('mousemove', e => {
  if (!LRM.on || document.pointerLockElement !== lrCanvas()) return;
  const dx = e.movementX || 0, dy = e.movementY || 0; if (Math.abs(dx) > 400 || Math.abs(dy) > 400) return;
  LRM.mlook[0] += dx; LRM.mlook[1] += dy;
});
// (Esc under pointer lock is the browser's: it lets the pointer go, often without telling the page of the key, so
// losing the lock mid-match opens the pause card, as Esc would have)
document.addEventListener('pointerlockchange', () => {
  if (!LRM.on || document.pointerLockElement === lrCanvas()) return;
  LRM.mb = 0;
  if (typeof state !== 'undefined' && state === 'lamproad' && !LRM.paused && !LRM.picking && LRM.ph !== 'over' && !(LRM.ph === 'pick' && lrMe() && !lrMe().hero)) { lrPause(true); LRM.lockPauseAt = performance.now(); }
});
// touch: the left of the screen is a stick to walk with, the right drags to look; the buttons are src/lrhud.js's
addEventListener('touchstart', e => {
  if (!LRM.on || e.target !== lrCanvas()) return;
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.42 && !LRM.stick) LRM.stick = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, dx: 0, dy: 0 };
    else if (!LRM.lookTouch) LRM.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
  }
}, { capture: true, passive: false });
addEventListener('touchmove', e => {
  if (!LRM.on) return;
  for (const t of e.changedTouches) {
    const S = LRM.stick; if (S && t.identifier === S.id) { let dx = (t.clientX - S.x0) / 56, dy = (t.clientY - S.y0) / 56, L = Math.hypot(dx, dy); if (L > 1.4) { S.x0 = t.clientX - dx / L * 1.4 * 56; S.y0 = t.clientY - dy / L * 1.4 * 56; dx = dx / L * 1.4; dy = dy / L * 1.4; L = 1.4; } const k = L < 0.12 ? 0 : Math.min(1, L) / Math.max(L, 0.001); S.dx = dx * k; S.dy = dy * k; S.x = t.clientX; S.y = t.clientY; }
    const Lt = LRM.lookTouch; if (Lt && t.identifier === Lt.id) { LRM.mlook[0] += (t.clientX - Lt.x) * 1.6; LRM.mlook[1] += (t.clientY - Lt.y) * 1.6; Lt.x = t.clientX; Lt.y = t.clientY; }
  }
  if (e.target === lrCanvas()) e.preventDefault();
}, { capture: true, passive: false });
const lrTouchEnd = e => { if (!LRM.on) return; for (const t of e.changedTouches) { if (LRM.stick && t.identifier === LRM.stick.id) LRM.stick = null; if (LRM.lookTouch && t.identifier === LRM.lookTouch.id) LRM.lookTouch = null; } };
addEventListener('touchend', lrTouchEnd, true); addEventListener('touchcancel', lrTouchEnd, true);
// the controller, as the other shooters have it: left stick walks, right stick looks, RT fires, LT the secondary,
// A jumps, LB the first ability, RB the second, Y the ultimate, X reloads, D-pad up changes hero, View the scores,
// Start the menu (on the cards: the D-pad moves between buttons and A presses)
function lrPadPoll(dt) {
  const pad = typeof firstPad === 'function' ? firstPad() : null, P = LRM.pad;
  if (!pad) { LRM.pad = {}; return; }
  const now = pad.buttons.map(b => b && b.pressed), prev = LRM.padPrev || [], down = i => now[i] && !prev[i]; LRM.padPrev = now;
  const ov = typeof lrHudOverlay === 'function' ? lrHudOverlay() : null;
  if (ov) {
    LRM.pad = {};
    if (LRM.paused && (down(1) || down(9))) { lrPause(false); return; }
    if (LRM.picking && down(1)) { LRM.picking = false; return; }
    const bs = [...ov.querySelectorAll('button:not([hidden])')].filter(b => b.offsetParent !== null), i = bs.indexOf(document.activeElement);
    if (down(12) || down(14)) (bs[(i - 1 + bs.length) % bs.length] || bs[0]).focus(); if (down(13) || down(15)) (bs[(i + 1) % bs.length] || bs[0]).focus();
    if (down(0) && document.activeElement && bs.includes(document.activeElement)) document.activeElement.click();
    return;
  }
  const dz = v => Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84, val = i => pad.buttons[i] ? pad.buttons[i].value : 0;
  LRM.pad = { mx: dz(pad.axes[0] || 0), mz: -dz(pad.axes[1] || 0), lx: dz(pad.axes[2] || 0), ly: dz(pad.axes[3] || 0), fire: val(7) > 0.3, alt: val(6) > 0.3, jump: !!now[0], a1: !!now[4], a2: !!now[5], ult: !!now[3], reload: !!now[2] };
  LRM.board = !!now[8];
  if (down(12)) lrAskHero();
  if (down(9)) lrPause(true);
}

// ---------- sound (Web Audio, src/audio.js, and the recordings, src/sfxbank.js) ----------
// how loud and from where, for something at (x, y, z) as I hear it
function lrEar(x, z) {
  const me = lrMe(); if (!me || x == null) return { v: 1, pan: 0 };
  const dx = x - me.x, dz = z - me.z, d = Math.hypot(dx, dz), yaw = LRM.ly;
  const f = dx * -Math.sin(yaw) + dz * -Math.cos(yaw), r = dx * Math.cos(yaw) + dz * -Math.sin(yaw);
  return { v: Math.max(0, 1 - d / 70), pan: d < 1 ? 0 : (typeof earDir === 'function' ? earDir(Math.atan2(r, f)) : 0), d };
}
function lrSnd(k, x, y, z, vol) {
  if (typeof AUD === 'undefined' || !AUD.ctx || (typeof soundOff === 'function' && soundOff())) return;
  const e = lrEar(x, z), v = (vol == null ? 1 : vol) * e.v, o = { pan: e.pan };
  if (v <= 0.01) return;
  const rec = (n, vv, opt) => typeof sfxPlay === 'function' && sfxPlay(n, Object.assign({ vol: vv, pan: e.pan, vary: 0.1 }, opt || {}));
  try {
    if (k === 'gun') { if (!rec('pepperbox', 0.55 * v, { rate: 1.25, gap: 0.04 })) { noise('lowpass', 2400 * v + 400, 0.8, 0.001, 0.4 * v, 0.14, o); tone(140, 'triangle', 0.001, 0.15 * v, 0.08, { to: 60, pan: e.pan }); } }
    else if (k === 'bolt') { tone(1180, 'sine', 0.002, 0.12 * v, 0.16, { to: 1760, pan: e.pan }); noise('highpass', 4000, 1, 0.002, 0.05 * v, 0.1, o); }
    else if (k === 'swing') { if (!rec('swish', 0.8 * v, { rate: 0.7 })) noise('bandpass', 900, 1.2, 0.03, 0.3 * v, 0.25, o); }
    else if (k === 'hitme') { tone(220, 'sawtooth', 0.001, 0.12, 0.12, { to: 110 }); noise('lowpass', 700, 1, 0.001, 0.18, 0.12); }
    else if (k === 'hitmark') tone(x ? 1300 : 950, 'square', 0.001, 0.05, 0.05);
    else if (k === 'kill') { tone(1500, 'square', 0.001, 0.06, 0.08); tone(1900, 'square', 0.001, 0.05, 0.1, { delay: 0.07 }); }
    else if (k === 'death') { if (!rec('snarl', 0.35 * v, { rate: 1.2 })) noise('lowpass', 500, 1, 0.01, 0.3 * v, 0.5, o); }
    else if (k === 'tar') { if (!rec('splat', 0.8 * v)) noise('lowpass', 400, 0.8, 0.002, 0.5 * v, 0.4, o); noise('bandpass', 1800, 0.8, 0.05, 0.12 * v, 0.9, o); }
    else if (k === 'throw') noise('bandpass', 1200, 1.4, 0.02, 0.15 * v, 0.2, o);
    else if (k === 'wall') { if (!rec('slam', 0.9 * v)) noise('lowpass', 260, 1, 0.001, 0.6 * v, 0.5, o); tone(70, 'triangle', 0.001, 0.4 * v, 0.4, { pan: e.pan }); }
    else if (k === 'wallgone') { if (!rec('debris', 0.6 * v)) noise('lowpass', 500, 1, 0.002, 0.4 * v, 0.6, o); }
    else if (k === 'rush') { if (!rec('charge', 0.8 * v)) noise('lowpass', 300, 1, 0.05, 0.4 * v, 0.6, o); }
    else if (k === 'brace') { if (!rec('chock', 0.8 * v)) tone(180, 'square', 0.001, 0.2 * v, 0.15, { pan: e.pan }); }
    else if (k === 'wave') { if (!rec('wavesweep', 1 * v)) noise('lowpass', 600, 0.7, 0.05, 0.7 * v, 1.2, o); tone(55, 'sine', 0.01, 0.5 * v, 0.8, { pan: e.pan }); }
    else if (k === 'rise') { if (!rec('gull', 0.5 * v)) tone(500, 'sine', 0.005, 0.12 * v, 0.3, { to: 1200, pan: e.pan }); noise('bandpass', 700, 1, 0.05, 0.2 * v, 0.5, o); }
    else if (k === 'blink') { if (!rec('whisper', 0.5 * v, { rate: 1.6 })) tone(900, 'sine', 0.005, 0.12 * v, 0.25, { to: 300, pan: e.pan }); }
    else if (k === 'kindle') { if (!rec('lampcatch', 0.7 * v)) tone(660, 'triangle', 0.005, 0.12 * v, 0.5, { pan: e.pan }); }
    else if (k === 'beacon') { if (!rec('beaconcatch', 1 * v)) { tone(523, 'sine', 0.01, 0.2 * v, 1.4, { pan: e.pan }); tone(784, 'sine', 0.01, 0.15 * v, 1.6, { delay: 0.1, pan: e.pan }); } }
    else if (k === 'warn') { if (typeof sfxHorn === 'function') sfxHorn(e.pan, 0.5 * v + 0.2); }
    else if (k === 'volley') { for (let i = 0; i < 4; i++) if (!rec('cannon', 0.9 * Math.max(v, 0.35), { delay: i * 0.12 })) noise('lowpass', 500, 0.7, 0.002, 0.8 * Math.max(v, 0.35), 0.7, { pan: e.pan, delay: i * 0.12 }); }
    else if (k === 'reload') { if (!rec('reload', 0.45 * v)) tone(420, 'square', 0.001, 0.08 * v, 0.04, { to: 220 }); }
    else if (k === 'pack') { if (typeof sfxPickup === 'function') sfxPickup(); }
    else if (k === 'step') noise('lowpass', 380 + Math.random() * 160, 1, 0.002, 0.06 * (vol || 1), 0.07);
    else if (k === 'land') noise('lowpass', 300, 1, 0.002, 0.14, 0.12);
    else if (k === 'pick' || k === 'tick') tone(880, 'square', 0.002, 0.05, 0.1);
    else if (k === 'go') { if (typeof sfxBell === 'function') sfxBell(); if (typeof sfxHorn === 'function') sfxHorn(0, 0.6); }
    else if (k === 'checkpoint') { if (typeof sfxBell === 'function') sfxBell(); }
    else if (k === 'overtime') { if (typeof sfxHorn === 'function') sfxHorn(0, 0.8); }
    else if (k === 'win') { if (typeof sfxChime === 'function') sfxChime(); if (typeof sfxBell === 'function') sfxBell(); }
    else if (k === 'lose') tone(196, 'triangle', 0.02, 0.2, 1.6, { to: 147 });
  } catch (err) {}
}
// one event's sound (src/lr3d.js calls this once for each, as it handles them)
function lrFxSound(f) {
  const me = lrMe(), mine = me && f.a === me.i, at = (k, v) => lrSnd(k, f.x, f.y, f.z, v);
  switch (f.k) {
    case 'tracer': at('gun', mine ? 1 : 0.8); break;
    case 'cast': at('bolt'); break;
    case 'sweep': at('swing'); break;
    case 'hit': if (me && f.v === me.i && !f.dot) lrSnd('hitme'); else if (mine && !f.wall) lrSnd('hitmark', f.head ? 1 : 0); break;
    case 'death': if (mine) lrSnd('kill'); else at('death'); break;
    case 'blast': at('tar'); break;
    case 'throw': at('throw'); break;
    case 'wall': at('wall'); break;
    case 'wallgone': at('wallgone'); break;
    case 'rush': at('rush'); break;
    case 'brace': at('brace'); break;
    case 'wave': at('wave', 1.4); break;
    case 'rise': at('rise'); break;
    case 'blink': at('blink'); break;
    case 'kindle': at('kindle'); break;
    case 'beacon': at('beacon', 1.3); break;
    case 'broadside': lrSnd('warn', f.x, 0, f.z, 1.4); break;
    case 'volley': lrSnd('volley', f.x, 0, f.z, 1.5); break;
    case 'reload': if (me && f.v === me.i) lrSnd('reload'); break;
    case 'pack': if (me && f.v === me.i) lrSnd('pack'); break;
    case 'go': lrSnd('go'); break;
    case 'checkpoint': lrSnd('checkpoint'); break;
    case 'overtime': lrSnd('overtime'); break;
    case 'end': lrSnd(me && f.win === me.team ? 'win' : 'lose'); break;
  }
}
// your footsteps
function lrSteps(dt) {
  const me = lrMe(); if (!me || !me.alive) return;
  const sp = Math.hypot(me.vx, me.vz);
  if (me.gnd && !LRM.wasGnd && LRM.lastVy < -6) lrSnd('land');
  LRM.wasGnd = me.gnd; LRM.lastVy = me.vy;
  if (!me.gnd || sp < 1.2) { LRM.stepT = 0.15; return; }
  LRM.stepT = (LRM.stepT || 0) - dt * sp / 4.6; if (LRM.stepT <= 0) { LRM.stepT = 0.42; lrSnd('step', null, null, null, me.hero === 'bollard' ? 1.6 : 1); }
}

// ---------- in and out ----------
function lrEnter() {
  try { if (typeof audioInit === 'function') audioInit(); } catch (e) {}
  if (typeof lrHudBuild === 'function') lrHudBuild();
  if (typeof lr3dInit === 'function' && !lr3dInit()) { if (typeof toast === 'function') toast('The Lamp Road needs WebGL, which this browser has turned off.', 'No 3D'); }
  state = 'lamproad'; if (typeof paused !== 'undefined') paused = false;
  for (const id of ['titleCard', 'hud', 'logbox', 'biomeBanner']) { const el = $(id); if (el) el.hidden = true; }
  $('lrUI').hidden = false; LRM.paused = false;
  document.body.classList.add('lron');
  if (typeof lr3dResize === 'function') lr3dResize();
  if (typeof lrHudPause === 'function') lrHudPause(false);
}
function lrExit() {
  const wasNet = !!LRM.net;
  LRM.on = false; LRM.ph = 'off'; LRM.net = null; LRM.paused = false; LRM.picking = false; LRM.keys = {}; LRM.mb = 0;
  if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) {}
  if (wasNet && typeof lrnStop === 'function') lrnStop();
  const ui = $('lrUI'); if (ui) ui.hidden = true; document.body.classList.remove('lron');
  state = 'title'; if (typeof toTitle === 'function') toTitle();
  setTimeout(() => { const c = $('lrTitle'); if (c) c.scrollIntoView({ block: 'start' }); lrCardRender(); }, 60);
}
function lrAgain() { if (LRM.net) { lrExit(); return; } const s = LRM.set || {}; lrStart({ side: s.side, skill: s.skill, allBots: s.allBots, setupT: s.setupT }); }

// ---------- the card on the title screen ----------
function lrCardRender() {
  const el = $('lrRecord'); if (!el) return;
  const st = lrStore.get(), line = (r, w) => `${w}: ${r.w} won, ${r.l} lost in ${r.m} match${r.m === 1 ? '' : 'es'} · ${r.e} eliminations`;
  el.textContent = st.rec && st.rec.m ? line(st.rec, 'Your record') : 'No matches played yet.';
  if (st.onl && st.onl.m) el.textContent += ' · ' + line(st.onl, 'Online');
}
function lrPlayLocal() { if (typeof LRN !== 'undefined' && LRN.code && typeof lrnLeave === 'function') lrnLeave(); const sv = $('lrSide').value; lrStart({ side: sv === 'r' ? 'r' : +sv, skill: $('lrSkill').value }); }
function lrDebug(o) { lrStart(Object.assign({ skill: 'fair', side: 0 }, o || {})); return LRM; }
function lrDebugWin(team) { if (!LRM.on) return; if (LRM.ph === 'pick') lrSetup(); if (LRM.ph === 'setup') lrGo(); if (team === 0) { LRM.cart.s = LRM.cart.L || lrPathLen(); lrCartTick(0.001); } else lrEnd(1); }

(function lrInit() {
  if (typeof $ !== 'function' || !$('lrTitle')) return;
  const st = lrStore.get(), set = st.set || {};
  if (set.side != null && $('lrSide')) $('lrSide').value = String(set.side);
  if (set.skill && $('lrSkill')) $('lrSkill').value = set.skill;
  if (st.nick) $('lrNick').value = String(st.nick).slice(0, 16);
  $('lrNick').addEventListener('change', () => { const s = lrStore.get(); s.nick = $('lrNick').value.slice(0, 16); lrStore.set(s); });
  $('lrNick').addEventListener('keydown', e => { if (e.key === 'Enter') lrPlayLocal(); });
  $('lrPlay').addEventListener('click', lrPlayLocal);
  if ($('lrSettings')) $('lrSettings').addEventListener('click', () => { const b = $('titleSettings'); if (b) b.click(); });
  lrCardRender();
})();
