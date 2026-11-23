'use strict';
// The Chronicle of the Light, mission 18: Slack Water (Act V, the years after; a tale added later, side: true, placed
// in the timeline after The Drowned Reach). Skerry Clash's own story (src/lore.js ch_clash, race, racekeepers,
// greatlight, clashhands): the night a second light was lit on the rock across the tidal race called the Race, and
// its keeper swore the old one was the false light that puts ships on the reef. Since then the two keepers have
// settled it at every slack water, three minutes at a time, across the two causeways the falling tide uncovers.
//
// The Race (C18): two rocks facing each other over a race of fast water, the near rock (yours, blue, to the south)
// and the far rock (his, red, to the north). Each has its Great Light at the back in the middle and two Lamp Towers
// forward, one over each causeway, as the Race has them; both rocks are the same, mirrored. At high water the Race
// runs too fast to cross; at slack water the causeways stand dry (RAID.st.tide 0 to 1), and the Lamp Towers' towers
// are the Lampwright's Crate's own (src/rlcrates.js rlTowerMesh: yours whitewash and red, his new-built granite).
//  - His towers are the bosses' framework's (src/zmboss.js), a kind of their own (ZBT.c18tw: still, quiet), so every
//    weapon, grenade and calling's power that hurts the drowned hurts them, and joined players see their strength
//    through the drowned's own stream. They shoot at you as the lore says: a Lamp Tower's lamp reddens and follows
//    you for a moment (a red line to you), then holds its aim and fires down it; step out of the line. His Great
//    Light sleeps until it's struck or one of his Lamp Towers falls, then wakes and shoots harder than either.
//  - Your towers (RAID.st.ow) are the host's own: they shoot at his hands (on the rock or in the air), and his hands
//    go for them as readily as for you. Lamp oil mends them.
//  - Lamp oil (RAID.st.oil, 0 to 10, shared): it fills a little at a time, twice as fast in the last minute as the
//    tide begins to turn. A powder keg from the Oil Store costs four; set at the foot of one of his towers it brings
//    a third of a Lamp Tower down. Mending one of yours costs three.
//  - His hands (c18Rival): he draws on oil of his own and sets them down on dry rock on his side (a red ring, then up
//    they come), until one of your Lamp Towers falls and the rock behind it is open to him too: crews of the drowned,
//    the Drowned Sailor who rises once more, shore crabs, gulls that go straight over the water (C18B: the host's
//    own flyers, Skerry Clash's gull model), and, now and then, the Diver or the Mooncusser with his false light.
//  - Crowns: each Lamp Tower felled is one; a Great Light put out is all three and the night. Yours going out loses it.
//  - The champion: Plimsoll, walking for the far rock (ZBT.c18plim, Skerry Clash's model of him). He lunges a long way
//    onto the strongest thing near him, bites hard, and once he has smelt blood strikes twice as fast for a while.
//    He isn't killed: worn down, he stands on the causeway looking from one light to the other, and walks into the sea.
// Three parts (src/cpm18x.js) and the cinematics (src/cpm18y.js):
//  I.   The Second Light (cp_m18lit). Dusk on the near rock: trim the Lamp Towers (a can of oil to each, and light
//       them), then a light kindles on the far rock (m18_second), the tide falls, and his hands come over the
//       causeways for the first time: hold your rock through the three minutes of slack water. The tide turns
//       (m18_turn).
//  II.  Slack Water (cp_m18slack). The next slack water (m18_cross), and this time you go to him: fell his two Lamp
//       Towers before the tide turns, with his hands still coming over for yours. Level at time, a minute more, and
//       the next tower to fall settles it. Both down: he calls his champion (m18_champ).
//  III. The Champion (cp_m18champ). The tide turning, the oil twice as fast, and Plimsoll over the east causeway for
//       your lights. Wear him down (m18_yield), then put out the far Great Light before the causeways go under. If the
//       tide turns first, the night is the crowns'.
// Together it's host-authoritative: the host runs the tide, the oil, your towers, his hands and birds, the kegs and
// who carries what, and sends them in the part's word (o.c18 and the rest); his towers and Plimsoll go in the
// drowned's stream. Joined players ask with raidAsk ('c18take', 'c18plant', 'c18mend', 'c18light', 'c18b').
// Voice lines: cp_m18_01 to cp_m18_64 (campaign-sound/m18.md).

cpMission({ id: 'm18', o: 'm14a', side: true, act: 5, n: 'Slack Water', when: 'The years after', where: 'The Race',
  blurb: 'A second light is lit across the tidal race from the first, and its keeper swears yours is the false one. Hold your rock through the first slack water, then cross the causeways and put his lights out.',
  stages: ['cp_m18lit', 'cp_m18slack', 'cp_m18champ'], intro: 'm18_intro', outro: 'm18_outro',
  cut: { 1: 'm18_cross' }, after: { 0: 'm18_turn', 1: 'm18_champ' },
  music: { default: 'cpm18slack' }, lives: 2,
  begin() { C18M.carry = null; },
  stop() { c18FreeAll(); if (typeof c9SkyBack === 'function') c9SkyBack(); } });

cpCast('c18near', { n: 'The Keeper of the Near Rock', c: '#8ab8ff' });
cpCast('c18far', { n: 'The Keeper Across the Race', c: '#ff9a8a' });
cpCast('c18seal', { n: 'A Grey Seal', c: '#b8c0c8' });
// (music not yet recorded plays one that is)
Object.assign(CP_MUSIC_FALL, { cpm18dusk: 'raidpier', cpm18second: 'cptense', cpm18slack: 'cpfight', cpm18cross: 'frisle', cpm18last: 'frboss', cpm18turn: 'cpsad', cpm18champ: 'cpboss', cpm18end: 'cphope' });

// ---------- the Race ----------
// RY: each rock's middle (0, ±RY), RX and RD its half-width and half-depth; CW: the causeways at x = ±CW, CWH half
// their width, out to y = ±CWE; GL: the Great Lights at (0, ±GL), LT: the Lamp Towers at (±CW, ±LT); S: the towers'
// scale on Skerry Clash's own (a tile a metre, near enough three); GLR, LTR: their feet. OIL: the near rock's Oil
// Store's door, AMMO its powder chest; COT: the cottage; START: where you land
var C18 = {
  RY: 36, RX: 36, RD: 22, CW: 18, CWH: 3, CWE: 20, GL: 46, LT: 26, S: 3.1, GLR: 5.0, LTR: 3.8,
  OIL: [11, -47.4], AMMO: [15.4, -46.6], COT: [-12, -51], START: [0, -35],
  NEAR: [-4.5, -40.2], FAR: [4.5, 40.2],
  SLACK: 180, LAST: 60, OT: 60, TURN: 150,
  OIL_T: 2.6, OIL_MAX: 10, KEG: 4, MEND: 3, MEND_K: 0.3, KEG_LAMP: 0.34, KEG_GREAT: 0.2, KEG_FUSE: 2.4, CARRY_K: 0.8,
  OW_LAMP: 100, OW_GREAT: 170, OW_MORE: 0.35,
  TW_LAMP: 95, TW_GREAT: 230, TW_MORE: 0.6,
  // (his towers' shots: aim, held for its first 70%; range; reload; what a ball does)
  AIM: 1.35, AIM_G: 1.05, RANGE: 24, RANGE_G: 30, RELOAD: 1.8, RELOAD_G: 1.2, MISS: 1.05,
  // (your towers' fire at his hands: reach, every, and against a drowned man's strength)
  FIRE_R: 21, FIRE_RG: 25, FIRE_T: 0.85, FIRE_TG: 0.7, FIRE_K: 0.42, FIRE_KG: 0.55,
  // (his oil: one every RFILL s, for this many of you quicker)
  RFILL: 3.5, ALIVE: 10,
};
// tower i: 0, 1 your Lamp Towers (west, east), 2 your Great Light; 3, 4 his Lamp Towers, 5 his Great Light
const c18Side = i => i < 3 ? -1 : 1;
const c18Great = i => i % 3 === 2;
function c18TwAt(i) { const s = c18Side(i), k = i % 3; return k === 2 ? [0, s * C18.GL] : [k ? C18.CW : -C18.CW, s * C18.LT]; }
const c18TwR = i => c18Great(i) ? C18.GLR : C18.LTR;
// the point in front of tower i, towards the Race (where his hands stand to strike it)
function c18TwFront(i) { const [x, y] = c18TwAt(i), s = c18Side(i); return [x, y - s * (c18TwR(i) + 1.3)]; }
var C18M = { carry: null };
const c18N = () => Math.max(1, (ZM.hum || []).length);
const c18W = (x, y) => [FPSC.CX + x, FPSC.CY + y];
const c18L = (x, y) => [x - FPSC.CX, y - FPSC.CY];
const c18Cine = () => typeof cpCineOn === 'function' && cpCineOn();
// (hosting or alone) a line said once only this part
function c18Say(k, who, text, vo) { const S = RAID.st; S.said = S.said || {}; if (S.said[k]) return false; S.said[k] = 1; cpSay(who, text, vo); return true; }
// a line in everyone's feed, and a banner on everyone's screen
cpOn('c18feed', t => fpsFeed(String(t || '')));
cpOn('c18ban', a => { if (Array.isArray(a)) ZM.banner = { text: String(a[0] || ''), t: 3.4, sub: String(a[1] || ''), col: a[2] || '#ffe2a8', small: !a[1] }; });
const c18Feed = t => cpEvent('c18feed', t);
const c18Ban = (t, sub, col) => cpEvent('c18ban', [t, sub || '', col || '']);

// ---------- where you can stand ----------
// the rocks' edge, as a share of the ellipse (mirrored: the far rock is the near one turned about)
function c18Edge(a) { return 1 + 0.05 * Math.sin(3 * a + 0.7) + 0.035 * Math.sin(7 * a + 2.1) + 0.02 * Math.sin(11 * a + 4.0); }
// (local x, y) on one of the rocks, pad in from its edge
function c18InRock(lx, ly, pad) { const dx = lx / C18.RX, dy = (Math.abs(ly) - C18.RY) / C18.RD, a = Math.atan2(dy, dx); return Math.hypot(dx, dy) < c18Edge(a) - (pad || 0) / C18.RD; }
// which causeway (0 west, 1 east) a place is on, or -1
function c18OnCw(lx, ly, pad) { if (Math.abs(ly) > C18.CWE) return -1; for (let i = 0; i < 2; i++) if (Math.abs(lx - (i ? C18.CW : -C18.CW)) < C18.CWH - (pad || 0)) return i; return -1; }
const c18Dry = () => (RAID.st && RAID.st.tide || 0) > 0.9;
function c18Walk(lx, ly, pad) { if (c18InRock(lx, ly, pad)) return true; return c18Dry() && c18OnCw(lx, ly, pad) >= 0; }
// (on a causeway, out over the water: not on either rock)
const c18OverWater = (lx, ly) => c18OnCw(lx, ly, -0.4) >= 0 && !c18InRock(lx, ly, 0);
// the rock's edge as points (for the edges the drowned find their way by, and the 3D), from the back round
function c18Outline(s, step) {
  const out = [], n = Math.ceil(2 * Math.PI * 30 / (step || 2));
  for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, e = c18Edge(a); out.push([Math.cos(a) * C18.RX * e, s * (C18.RY + Math.sin(a) * C18.RD * e)]); }
  return out;
}
// how far out the rock's front comes at x (the y where a causeway meets it)
function c18Front(x) { for (let y = 10; y < 40; y += 0.1) if (c18InRock(x, -y, 0)) return y; return 18; }

// =====================================================================================================================
// the world: the look, the edges, the props
// =====================================================================================================================
FPS_ISLES.cpm18 = Object.assign({}, FPS_ISLES.shingle, { name: 'the Race', noGround: true, rocks: [0, 3, 6, 1], wrecks: [0], birds: ['gull', 3], tufts: ['#4e5a3e', 0], pebbles: 0, pools: 0, wrack: 0, fog: ['#141a24', 60, 700] });
FPI_GEN.cpm18 = { built: true, decor() {},
  set(H) { const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [], glass: [] }; c18Set(H, zmKit(H, Z), Z); } };
const C18_MAP = { start: C18.START.slice(), top: 0, R: 72, isle: 'cpm18', seed: 0x18c1a, shore: () => -999, nav: [-40, 40, -60, 60], zones: { isle: { n: 'the Race', r: [-40, 40, -60, 60], sky: true } } };
Object.assign(FPI_K, {
  // a tower's foot: solid, but shots go through it to the tower itself (his are bodies: src/zmboss.js)
  c18foot: { col: '#000000', sol(p) { return [fpiCirc(p, 0, 0, p.r, p.hh || 16, { ray: false, occ: false })]; }, b3() {} },
});
function c18Set(H, K) {
  const { put, light } = K;
  // the edges, where each rock drops into the Race (open at the causeways' heads), and along the causeways' sides
  for (const s of [-1, 1]) {
    const P = c18Outline(s, 2.2);
    for (let i = 0; i < P.length; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length], mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      if (Math.abs(my) < C18.RY && Math.min(Math.abs(mx - C18.CW), Math.abs(mx + C18.CW)) < C18.CWH + 0.6) continue;   // (a causeway's head)
      const len = Math.hypot(x1 - x0, y1 - y0), ox = (y1 - y0) / len * 0.35 * s, oy = -(x1 - x0) / len * 0.35 * s;
      put('rchedge', mx + ox * Math.sign(mx * 0 + 1), my + oy, Math.atan2(y1 - y0, x1 - x0), { len: len + 0.5 });
    }
  }
  for (const cw of [-C18.CW, C18.CW]) for (const sd of [-1, 1]) {
    const x = cw + sd * (C18.CWH + 0.25), f = c18Front(x) - 0.6;
    for (let y = -f; y < f; y += 2.4) { const y1 = Math.min(f, y + 2.4); put('rchedge', x, (y + y1) / 2, Math.PI / 2, { len: y1 - y + 0.4 }); }
  }
  // the towers' feet
  for (let i = 0; i < 6; i++) { const [x, y] = c18TwAt(i); put('c18foot', x, y, 0, { r: c18TwR(i) - 0.1 }); }
  // each rock: its Oil Store and cottage at the back, casks, cover stones (the far rock the same, turned about)
  for (const s of [-1, 1]) {
    const F = (x, y) => [x, s * -y];   // (y given as on the near rock)
    put('rchhouse', ...F(11, -50.2), 0, { w: 5, d: 4, hh: 2.6, door: [[s < 0 ? 0 : 1, 0]], win: [[s < 0 ? 0 : 1, 1.6, 1]], wall: s < 0 ? '#e6e0d2' : '#bdb6a8' });
    put('rchhouse', ...F(-12, -52), 0, { w: 7, d: 5, hh: 2.8, door: [[s < 0 ? 0 : 1, -1.2]], win: [[s < 0 ? 0 : 1, 1.8, 1]], chim: true, wall: s < 0 ? '#e6e0d2' : '#bdb6a8' });
    put('barrels', ...F(15.8, -48.8), 0, { items: [{ u: 0, v: 0, r: 0.38, hh: 0.95 }, { u: 0.8, v: 0.15, r: 0.38, hh: 0.95 }, { u: 0.35, v: -0.7, r: 0.38, hh: 0.95 }] });
    put('crates', ...F(6.2, -48.4), 0.3, { items: [{ u: 0, v: 0, s: 0.8, ry: 0 }, { u: 0.9, v: 0.1, s: 0.7, ry: 0.4 }] });
    for (const [x, y, w] of [[-6.5, -22.5, 1.5], [7, -21.5, 1.3], [-27, -33, 1.6], [27.5, -35, 1.5], [-4, -30, 1.0], [24, -24, 1.1], [-24, -25, 1.2]]) put('stone', ...F(x, y), x * 0.7, { w, d: w * 0.8, hh: w * 0.7 });
    light(...F(11, -47.6), 2.2, '#ffc070', 7, 'lantern'); light(...F(-13.2, -48.9), 1.6, '#ffc070', 6, 'lantern');
    put('boat', ...F(-3, -56.6), Math.PI / 2 + 0.2 * s, { len: 4.4, beam: 1.5, paint: s < 0 ? '#34465a' : '#5a3434' });
  }
  if (typeof c9AmmoLay === 'function') c9AmmoLay(K, C18.AMMO[0], C18.AMMO[1], 0, 0.4);
  ZMD.START = C18.START.slice();
}
// (the drowned on a causeway as the tide comes back: taken by the Race)
function c18Wash() {
  for (const z of ZM.z) { if (z.dead || z.bt === 'c18tw') continue; const [lx, ly] = c18L(z.x, z.y); if (c18OverWater(lx, ly)) { zmKill(z, false, '', 'flash'); if (Math.random() < 0.5) cpEvent('c18splash', [Math.round(lx), Math.round(ly)]); } }
}
cpOn('c18splash', a => { if (!Array.isArray(a)) return; const [x, y] = c18W(+a[0] || 0, +a[1] || 0); fpsPuff(x, y, FPSC.GROUND + 0.2, '200,220,230', 10); try { if (!soundOff()) sfxSplash(fpsEar(x, y), clamp(1 - Math.hypot(x - FPS.me.x, y - FPS.me.y) / 50, 0.1, 0.8)); } catch (e) {} });

// =====================================================================================================================
// the part's state (hosting or alone; joined, it comes in the host's word)
// =====================================================================================================================
// ph: the part's own phase; tide 0 high water to 1 slack; T: the clock; oil; cu, ct: the crowns (yours, his); ow:
// your towers; tl: his lit (part I: dark until m18_second); gw: his Great Light awake; bd: his birds; cy: who carries
// what ('can' | 'keg'); kg: kegs set; dp: his hands being set down (rings); ro: his oil; plim: Plimsoll's zn
function c18State(o) {
  const n = c18N(), more = 1 + C18.OW_MORE * (n - 1);
  Object.assign(RAID.st, {
    c18: true, ph: '', tide: 0, T: 0, oil: 4, oilOn: false, last: false, ot: false, cu: 0, ct: 0, tl: 1, gw: 0, said: {},
    ow: [0, 1, 2].map(i => ({ hp: (c18Great(i) ? C18.OW_GREAT : C18.OW_LAMP) * more, max: (c18Great(i) ? C18.OW_GREAT : C18.OW_LAMP) * more, cd: 1, seq: 0, tx: 0, ty: 0, tz: 0, lit: 1, dead: 0 })),
    bd: [], bid: 0, cy: {}, kg: [], kid: 0, dp: [], ro: 2, rivalOn: false, deck: 0, rT: 0, plim: 0, npc: [], tw: [], hit: {},
  }, o || {});
}
const c18S = () => RAID.st && RAID.st.c18 ? RAID.st : null;
// (hosting) his three towers, as bodies of the bosses' kind (lit: part I's are dark until the second light)
function c18Muster(o) {
  o = o || {};
  const S = RAID.st, n = c18N(), more = 1 + C18.TW_MORE * (n - 1);
  for (let i = 3; i < 6; i++) {
    if (o.down && o.down.includes(i)) continue;
    const [x, y] = c18W(...c18TwAt(i)), hp = (c18Great(i) ? C18.TW_GREAT : C18.TW_LAMP) * more * (o.hpK || 1);
    const z = c18Boss('c18tw', x, y, hp, { h: Math.PI });
    z.c18i = i; z.px = x; z.py = y; z.aimCd = 1.5 + i * 0.4;
    if (o.hp && o.hp[i] != null) z.hp = Math.max(1, z.max * o.hp[i]);
    S.tw[i] = z.zn;
  }
}
// one of the bosses' kind, already in at world (x, y): his towers, Plimsoll (cf. src/cpm09x.js c9Boss)
function c18Boss(kind, x, y, hp, o) {
  o = o || {};
  const T = ZBT[kind], zn = ++ZM.zc;
  const z = {
    drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss',
    x, y, jz: 0, fl: 0, hp, max: hp, sp: T.sp(),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: o.h || 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: x, iy: y, ax: x, ay: y, lx: x, ly: y,
  };
  if (T.init) T.init(z);
  zbMake(z, kind);
  ZM.z.push(z); FPS.drowned = ZM.z;
  ZB.seen.add(zn);
  return z;
}
// his tower i's body (any screen), or null; and its strength left, 0 to 1
function c18TwZ(i) {
  for (const z of ZM.z) { if (z.bt !== 'c18tw') continue; if (z.c18i == null) z.c18i = c18TwIdx(z); if (z.c18i === i) return z; }
  return null;
}
function c18TwIdx(z) { let b = 5, bd = 1e9; for (let i = 3; i < 6; i++) { const [x, y] = c18W(...c18TwAt(i)), d = Math.hypot(z.x - x, z.y - y); if (d < bd) { bd = d; b = i; } } return b; }
function c18TwK(i) {
  if (i < 3) { const S = c18S(), o = S && S.ow[i]; return o ? (o.dead ? 0 : clamp(o.hp / o.max, 0, 1)) : 0; }
  const z = c18TwZ(i); if (!z || z.dead || z.c18down) return 0;
  return ZM.net === 'client' ? (z.hpk == null ? 1 : z.hpk) : clamp(z.hp / z.max, 0, 1);
}
const c18TwUp = i => c18TwK(i) > 0;
// his tower i standing (any screen: joined, from the host's word, so a tower felled before you joined lies felled)
function c18HisUp(i) { const S = c18S(); if (!S) return true; if (ZM.net === 'client') return !(((S.dn || 0) >> i) & 1); const z = c18TwZ(i); return !!z && !z.dead && !z.c18down; }
// everyone standing (hosting: you and the rest) [sid, x, y, jz, down]
const c18All = () => typeof c9All === 'function' ? c9All() : [[FPS.me.id, FPS.me.x, FPS.me.y, FPS.me.jz || 0, zmIsDown()]];

// =====================================================================================================================
// his towers (ZBT.c18tw): still, quiet, and shooting
// =====================================================================================================================
const C18TW_T = { aim: { hit: C18.AIM, end: C18.AIM + 0.3 }, smash: { hit: 99, end: 1 } };
ZB_ACT.push('c18aim');
// where its lamp is (the world), and whether it's shooting now: lit (part I's dark ones aren't), and the Great Light
// only once it's awake
function c18Lamp(i) { const [x, y] = c18W(...c18TwAt(i)); return [x, y, FPSC.GROUND + (C18W.lampZ[i % 3 === 2 ? 1 : 0] || (c18Great(i) ? 13.5 : 9.5))]; }
function c18TwOn(z) { const S = c18S(); if (!S || !S.tl) return false; return !c18Great(z.c18i) || !!S.gw || (S.ph === 'champ' || S.ph === 'great'); }
// nothing solid between his lamp and you (chest high)
function c18Los(i, x, y, jz) { const [lx, ly, lz] = c18Lamp(i), d = Math.hypot(x - lx, y - ly), ez = FPSC.GROUND + (jz || 0) + 1.2; if (d < 1) return true; const r = fpsRay(lx, ly, lz, bearingOf(x - lx, y - ly), Math.atan2(ez - lz, d), null, [], d); return !(r.kind !== 'none' && r.t < d - 0.8); }
ZBT.c18tw = {
  n: 'a tower of the far rock', N: 'The Far Rock', sub: '', col: '#ff9a8a', bar: ['#8a3a26', '#ff9a8a'], warn: '255,90,60', big: 'c18aim', puff: '160,150,140', quiet: true,
  hp: 1, pts: 300, rad: 3.5, tall: 16, headZ: 99, pad: 3.2, crowd: 0, near: 0, ladder: 2, through: 1.5,
  sp: () => 0, win: () => false, acts: { c18aim: C18TW_T.aim, smash: C18TW_T.smash },
  arriveLine: () => '', smashLine: () => '', killLine: () => '',
  init(z) { z.aimCd = 2; },
  cool(z, dt) {
    if (z.c18i == null) z.c18i = c18TwIdx(z);
    if (z.px != null) { z.x = z.px; z.y = z.py; }   // (nothing shifts a tower)
    if (z.aimCd > 0) z.aimCd -= dt;
    z.rad = c18TwR(z.c18i) + 0.2; z.tall = c18Great(z.c18i) ? 16 : 11.5;
  },
  think(z) {
    if (!c18TwOn(z) || z.aimCd > 0) return null;
    const i = z.c18i, g = c18Great(i), R = g ? C18.RANGE_G : C18.RANGE, [lx, ly] = c18Lamp(i);
    let best = null, bd = 1e9;
    for (const [sid, x, y, jz, down] of c18All()) { if (down) continue; const d = Math.hypot(x - lx, y - ly); if (d < R && d < bd && c18Los(i, x, y, jz)) { bd = d; best = [sid, x, y]; } }
    if (!best) { z.aimCd = 0.4; return null; }
    z.tg = best[0]; z.ax = best[1]; z.ay = best[2]; z.ix = z.ax; z.iy = z.ay;
    return 'c18aim';
  },
  start(z, act) { if (act === 'c18aim') { const g = c18Great(z.c18i); z.aEnd = (g ? C18.AIM_G : C18.AIM) + 0.3; z.aimCd = (g ? C18.RELOAD_G : C18.RELOAD) * (1 + 0.3 / c18N()) + z.aEnd; } },
  endOf: z => (c18Great(z.c18i == null ? (z.c18i = c18TwIdx(z)) : z.c18i) ? C18.AIM_G : C18.AIM) + 0.3,
  during(z, dt) {
    if (z.act !== 'c18aim') return;
    const A = c18Great(z.c18i) ? C18.AIM_G : C18.AIM;
    if (z.at < A * 0.7) { const P = c18All().find(p => p[0] === z.tg); if (P && !P[4]) { z.ax = P[1]; z.ay = P[2]; z.ix = z.ax; z.iy = z.ay; } }
    if (z.at >= A && !z.fired) { z.fired = 1; }
    if (z.at < 0.05) z.fired = 0;
  },
  // (every screen) its ball, down the line it held: is it me it hits?
  strike(z) {
    if (z.act !== 'c18aim') return;
    const i = z.c18i == null ? (z.c18i = c18TwIdx(z)) : z.c18i, g = c18Great(i), [lx, ly, lz] = c18Lamp(i), m = FPS.me;
    const L = Math.hypot(z.ax - lx, z.ay - ly) || 1, ux = (z.ax - lx) / L, uy = (z.ay - ly) / L, R = (g ? C18.RANGE_G : C18.RANGE) + 4;
    const rx = m.x - lx, ry = m.y - ly, along = rx * ux + ry * uy, off = Math.abs(rx * uy - ry * ux);
    const end = clamp(along, 0, R), ex = lx + ux * end, ey = ly + uy * end, ez = FPSC.GROUND + (m.jz || 0) + 1.2;
    const hit = along > 0 && along < R && off < C18.MISS && zbOk() && !zmIsDown() && c18Los(i, m.x, m.y, m.jz);
    const bx = hit ? m.x : lx + ux * Math.min(R, L + 6), by = hit ? m.y : ly + uy * Math.min(R, L + 6);
    FPS.tracers.push({ a: [lx, ly, lz], b: [bx, by, hit ? ez : FPSC.GROUND + 0.3], t: 0.14, k: 'l' });
    c18Snd(g ? 'cannon' : 'longarm', lx, ly, g ? 0.9 : 0.7);
    if (hit) { fpsHurt(g ? 2 : 1, '', g ? 'The far Great Light' : 'A Lamp Tower of the far rock'); zmSound('hit'); FPS.hurtT = 0.8; }
    else fpsPuff(bx, by, FPSC.GROUND + 0.3, '190,190,180', 5);
    for (let k = 0; k < 4; k++) FPS.parts.push({ x: lx, y: ly, z: lz, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: Math.random(), t: 0.4, c: '255,200,140' });
    void ex; void ey;
  },
  // (hosting) struck: the Great Light wakes
  hurtK(z) { if (z.c18i === 5) { const S = c18S(); if (S && !S.gw && S.tl) { S.gw = 1; c18Say('gwake', 'c18near', 'His Great Light is awake. Mind it now.', 'cp_m18_36'); } } return 1; },
  noFlash: () => true,
  actSound() {}, sound() {},
  build() { const root = new THREE.Group(); return { root }; },
  reset(z, M) { M.root.visible = false; },
  pose(z, M) { M.root.visible = false; },
};
ZB_KINDS.push('c18tw');

// =====================================================================================================================
// Plimsoll, walking for the far rock (ZBT.c18plim)
// =====================================================================================================================
// SP: his walk; BITE: his reach; WIND: the crouch before a lunge (for its first AIMK he follows what he means to hit);
// DASH: the lunge's pace; LU_MIN, LU_MAX: how far off he'll lunge from; FZ: how long the smell of blood lasts
// (strikes twice as fast); TW_BITE, TW_LUNGE: what a bite and a lunge do to a tower (a share of its strength)
const C18P = { SP: 4.3, BITE: 2.0, WIND: 0.95, AIMK: 0.55, DASH: 16, LU_MIN: 4.5, LU_MAX: 15, LU_CD: [5, 7.5], FZ: 5.5, HIT: 1.35, HP: 210, MORE: 0.7, TW_BITE: 0.035, TW_LUNGE: 0.11, SCALE: 1.45 };
const C18P_T = { bite: { hit: 0.38, end: 0.85 }, c18lunge: { hit: 99, end: 3 }, smash: { hit: 0.7, end: 1.3 } };
ZB_ACT.push('c18lunge');
// what he lunges at: the strongest thing near him, as the lore has it (one of your towers, while it's sound, before any of you)
function c18PlimPick(z) {
  const S = c18S(); if (!S) return null;
  const c = [];
  for (let i = 0; i < 3; i++) { const o = S.ow[i]; if (o.dead) continue; const [fx, fy] = c18W(...c18TwFront(i)), d = Math.hypot(fx - z.x, fy - z.y); if (d > C18P.LU_MIN && d < C18P.LU_MAX) c.push({ x: fx, y: fy, jz: 0, tw: i, k: o.hp / o.max + 0.1, d }); }
  for (const [sid, x, y, jz, down] of c18All()) { if (down) continue; const d = Math.hypot(x - z.x, y - z.y); if (d > C18P.LU_MIN && d < C18P.LU_MAX) c.push({ sid, x, y, jz, k: 0.45 + Math.random() * 0.2, d }); }
  if (!c.length) return null;
  c.sort((a, b) => b.k - a.k); return c[0];
}
ZBT.c18plim = {
  n: 'Plimsoll', N: 'Plimsoll', sub: 'walking for the far rock', col: '#8ab4ff', bar: ['#2a4a8a', '#8ab4ff'], warn: '120,170,255', big: 'c18lunge', puff: '150,170,190', quiet: true,
  hp: 1, pts: 600, rad: 0.62, tall: 2.25, headZ: 1.85, pad: 0.42, crowd: 0.9, near: 1.7, ladder: 2, through: 1.5, warnT: C18P.WIND,
  sp: () => C18P.SP, win: () => false, acts: C18P_T,
  arriveLine: () => '', smashLine: () => '', killLine: () => '',
  init(z) { z.luCd = 3.5; z.fz = 0; },
  cool(z, dt) { if (z.luCd > 0) z.luCd -= dt; if (z.fz > 0) { z.fz -= dt; z.sp = C18P.SP * 1.3; } else z.sp = C18P.SP; },
  think(z, p, d, dz, level) {
    if (level && d < C18P.BITE + (p.tw != null ? 0.6 : 0) && z.swCd <= 0) { z.btw = p.c18tw != null ? p.c18tw : -1; return 'bite'; }
    if (z.luCd <= 0) {
      const T = c18PlimPick(z);
      if (T) { const L = typeof zbkLane === 'function' ? zbkLane(z, T, T.d) : null; if (L) { z.lane = L; z.ltw = T.tw == null ? -1 : T.tw; z.lsid = T.sid || ''; return 'c18lunge'; } }
      z.luCd = 0.6;
    }
    return null;
  },
  start(z, act) {
    if (act === 'bite') z.swCd = (z.fz > 0 ? 0.55 : 1.15) + Math.random() * 0.25;
    if (act === 'c18lunge') { const L = z.lane; z.ax = z.x; z.ay = z.y; z.ix = L[0]; z.iy = L[1]; z.wall = L[3]; z.h = bearingOf(L[0] - z.x, L[1] - z.y); z.aEnd = C18P.WIND + L[2] / C18P.DASH + 0.35; z.luCd = C18P.LU_CD[0] + Math.random() * (C18P.LU_CD[1] - C18P.LU_CD[0]); z.chHit = false; z.swCd = Math.max(z.swCd, 0.8); }
  },
  endOf: (z, act) => act === 'c18lunge' ? C18P.WIND + Math.hypot(z.ix - z.ax, z.iy - z.ay) / C18P.DASH + 0.35 : act === 'bite' ? (z.fz > 0 ? 0.45 : 0.85) : 1,
  during(z, dt, nearest, was) {
    if (z.act === 'bite') { const p = nearest(z.x, z.y, z.jz); if (p && z.at < 0.3) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * 6); return; }
    if (z.act !== 'c18lunge') return;
    const L = Math.hypot(z.ix - z.ax, z.iy - z.ay), ux = (z.ix - z.ax) / (L || 1), uy = (z.iy - z.ay) / (L || 1);
    ZBT.c18plim.judge(z, was, z.at);
    if (z.at < C18P.WIND) {
      // (the crouch: for its first part he follows what he means to hit; then the lane's set)
      if (z.at < C18P.AIMK && z.lsid) { const P = c18All().find(q => q[0] === z.lsid); if (P && !P[4]) { const d = Math.hypot(P[1] - z.x, P[2] - z.y); const nl = d > 2.5 && typeof zbkLane === 'function' ? zbkLane(z, { x: P[1], y: P[2], jz: P[3] }, d) : null; if (nl) { z.ix = nl[0]; z.iy = nl[1]; z.wall = nl[3]; z.aEnd = C18P.WIND + nl[2] / C18P.DASH + 0.35; } } }
      z.h = bearingOf(z.ix - z.ax, z.iy - z.ay);
      return;
    }
    const s = Math.min(L, (z.at - C18P.WIND) * C18P.DASH), tx = z.ax + ux * s, ty = z.ay + uy * s, dx = tx - z.x, dy = ty - z.y, want = Math.hypot(dx, dy), x0 = z.x, y0 = z.y;
    if (want > 0.01 && s < L) zmMove(z, dx, dy);
    z.walk = true; zbJostle(z, z.rad + 0.6);
    const got = Math.hypot(z.x - x0, z.y - y0);
    if ((want > 0.05 && got < want * 0.5) || s >= L - 0.01) {
      // (the end of it: into a tower, he bites deep, and smells blood)
      if (ZM.net !== 'client') {
        const S = c18S(); let tw = -1;
        if (S) for (let i = 0; i < 3; i++) { if (S.ow[i].dead) continue; const [x, y] = c18W(...c18TwAt(i)); if (Math.hypot(z.x - x, z.y - y) < c18TwR(i) + 2.6) tw = i; }
        if (S && tw >= 0) { c18OwHurt(tw, S.ow[tw].max * C18P.TW_LUNGE, 'plim'); z.fz = C18P.FZ; c18Say('fz', 'c18near', 'He smells blood. He strikes twice as fast now. Back off him!', 'cp_m18_54'); }
        if (z.chHit || tw >= 0) z.fz = C18P.FZ;
      }
      z.act = null; z.at = 0; z.aEnd = 0; z.swCd = Math.min(z.swCd, 0.3);
    }
  },
  // (each screen, its own player) did the lunge pass over me
  judge(z, at0, at1) {
    if (z.act !== 'c18lunge' || z.chHit || at1 <= C18P.WIND) return;
    const L = Math.hypot(z.ix - z.ax, z.iy - z.ay); if (L < 0.1) return;
    const ux = (z.ix - z.ax) / L, uy = (z.iy - z.ay) / L, s0 = clamp((at0 - C18P.WIND) * C18P.DASH, 0, L), s1 = clamp((at1 - C18P.WIND) * C18P.DASH, 0, L);
    if (s1 <= s0) return;
    const m = FPS.me, rx = m.x - z.ax, ry = m.y - z.ay, along = clamp(rx * ux + ry * uy, s0, s1), side = rx * uy - ry * ux;
    const d = Math.hypot(m.x - (z.ax + ux * along), m.y - (z.ay + uy * along));
    if (d < C18P.HIT && zbOk() && Math.abs((m.jz || 0) - (z.jz || 0)) < 1.2) {
      z.chHit = true;
      fpsHurt(2, '', 'Plimsoll'); zmSound('hit'); FPS.hurtT = 1.0;
      const sg = side >= 0 ? 1 : -1, px = uy * sg, py = -ux * sg;
      for (let i = 0; i < 6; i++) zmMove(m, px * 0.3 + ux * 0.12, py * 0.3 + uy * 0.12);
      FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.3, -0.8, 0.8);
      if (ZM.net !== 'client') z.fz = C18P.FZ;
    }
  },
  strike(z) {
    const m = FPS.me, d = Math.hypot(z.x - m.x, z.y - m.y);
    if (z.act !== 'bite') return;
    c18Snd('snarl', z.x, z.y, 0.8);
    zbMelee(z, C18P.BITE + 0.35, 1.0, 1);
    // (hosting: his teeth in one of your towers)
    if (ZM.net !== 'client') { const S = c18S(); if (S) for (let i = 0; i < 3; i++) { if (S.ow[i].dead) continue; const [x, y] = c18W(...c18TwAt(i)); if (Math.hypot(z.x - x, z.y - y) < c18TwR(i) + 2.4) { c18OwHurt(i, S.ow[i].max * C18P.TW_BITE, 'plim'); break; } } }
    void d;
  },
  hurtK: () => 1,
  noFlash: () => false,
  actSound(z, act) { if (act === 'c18lunge') c18Snd('charge', z.x, z.y, 0.8); },
  sound(k, d) { if (k === 'groan' && d < 30) c18Snd('snarl', FPS.me.x, FPS.me.y, 0.25 * (1 - d / 30)); },
  build() {
    const root = new THREE.Group(), M = { root };
    try { if (typeof rlChampModel === 'function') { const g = rlChampModel('plimsoll', typeof RL_THEIRS !== 'undefined' ? RL_THEIRS : 0xe8453c); g.scale.setScalar(C18P.SCALE); root.add(g); M.g = g; M.P = rl3dParts(g); } } catch (e) { console.warn('c18 plim', e); }
    if (!M.g) { const b = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.4, 1.2, 4, 8) : new THREE.CylinderGeometry(0.4, 0.4, 2, 8), z3Lam('#6a7c8c')); b.position.y = 1.1; root.add(b); }
    const sh = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(95,170,255,0.5)', 'rgba(95,170,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sh.scale.set(2.4, 0.9, 1); sh.position.y = 0.2; root.add(sh); M.shoes = sh;
    return M;
  },
  reset(z, M) { M.root.visible = true; M.root.rotation.set(0, 0, 0); },
  pose(z, M, dt) {
    const G0 = FPSC.GROUND;
    M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
    M.root.rotation.y = Math.PI - z.h;
    M.root.visible = !z.dead;
    const P = M.P || {}, lu = z.act === 'c18lunge', wind = lu && (z.at || 0) < C18P.WIND, dash = lu && !wind;
    if (z.walk || dash) z.ph = (z.ph || 0) + dt * (dash ? 22 : 9);
    const A = dash ? 0.9 : z.walk ? 0.6 : 0.05, ph = z.ph || 0;
    if (P.legL) { P.legL.rotation.x = Math.sin(ph) * A; P.legR.rotation.x = -Math.sin(ph) * A; }
    if (P.armL) { P.armL.rotation.x = -Math.sin(ph) * A * 0.6; P.armR.rotation.x = Math.sin(ph) * A * 0.6; }
    if (P.body) { P.body.rotation.x = wind ? -0.35 : dash ? 0.75 : z.act === 'bite' ? 0.35 * Math.sin(clamp((z.at || 0) / 0.4, 0, 1) * Math.PI) : 0.05 * Math.sin(ph * 2); P.body.position.y = wind ? -0.12 : 0; }
    if (P.tail) P.tail.rotation.y = Math.sin(g.t * (z.fz > 0 ? 9 : 4)) * 0.35;
    if (P.head) P.head.rotation.x = z.act === 'bite' ? -0.4 * Math.sin(clamp((z.at || 0) / 0.4, 0, 1) * Math.PI) : 0;
    if (P.aura) P.aura.visible = z.fz > 0 || wind;
    if (M.shoes) M.shoes.material.opacity = 0.5 + (wind ? 0.5 * Math.abs(Math.sin(g.t * 20)) : 0.1 * Math.sin(g.t * 3));
  },
};
ZB_KINDS.push('c18plim');
// (hosting) Plimsoll, up out of the surf at local (x, y)
function c18PlimSpawn(x, y) {
  const S = RAID.st, n = c18N(), [wx, wy] = c18W(x, y), z = c18Boss('c18plim', wx, wy, C18P.HP * (1 + C18P.MORE * (n - 1)), { h: Math.PI });
  z.rr = z.rr0 = 1.4; z.rb = 0; z.jz = -2.2;
  S.plim = z.zn; return z;
}
const c18PlimZ = () => ZM.z.find(z => z.bt === 'c18plim') || null;

// =====================================================================================================================
// your towers (hosting or alone): hurt by his hands, falling, and shooting back
// =====================================================================================================================
function c18OwHurt(i, d, how) {
  const S = c18S(); if (!S) return; const o = S.ow[i]; if (!o || o.dead || !(d > 0)) return;
  o.hp -= d; o.hitT = 0.3;
  if (!c18Great(i) && o.hp < o.max * 0.5) c18Say('ow50' + i, 'c18near', ...(i ? ['The east tower is taking a beating!', 'cp_m18_17'] : ['The west tower is taking a beating!', 'cp_m18_16']));
  if (o.hp < o.max * 0.6 && S.ph !== 'trim') c18Say('mendtip', 'c18near', 'Lamp oil mends a tower. Hold at its foot, if there is oil to spare.', 'cp_m18_29');
  if (c18Great(i) && o.hp < o.max * 0.6) c18Say('gl60', 'c18near', 'He is at the Great Light! Get him off it!', 'cp_m18_55');
  if (o.hp <= 0) {
    o.hp = 0; o.dead = 1; S.ct += c18Great(i) ? 3 : 1;
    cpEvent('c18fall', i);
    if (c18Great(i)) { cpFail('The Great Light of the near rock went out'); return; }
    c18Ban('A crown to the far rock', i ? 'Your east Lamp Tower has fallen' : 'Your west Lamp Tower has fallen', '#ff9a8a');
    if (!c18Say('ct1', 'c18far', 'Ahoy, the near rock! That is a crown to me!', 'cp_m18_19')) c18Say('ct2', 'c18far', 'Another! Your light is coming down, near rock!', 'cp_m18_48');
    c18Say('ctl' + RAID.stage, 'c18near', 'Nooo… He has a crown off us, and the rock behind it is open to him now.', 'cp_m18_18');
    { const St = raidStage(); if (St && St.onCrown) St.onCrown(i, 'them'); }
  }
}
// his tower i down (the kill hook): a crown to you; his Great Light wakes; the Great Light out is all three
function c18TwDown(i) {
  const S = c18S(); if (!S) return;
  S.cu += c18Great(i) ? 3 : 1;
  cpEvent('c18fall', i);
  if (!c18Great(i)) { S.gw = 1; c18Ban('A crown to the near rock', i === 3 ? 'His west Lamp Tower is down' : 'His east Lamp Tower is down', '#8ab8ff'); if (!c18Say('cu1', 'c18far', 'Nooo…', 'cp_m18_35')) c18Say('cu2', 'c18far', 'Nooo… Both my towers!', 'cp_m18_37'); }
  else c18Ban('The far Great Light is out', 'All three crowns, and the night', '#8ab8ff');
  { const St = raidStage(); if (St && St.onCrown) St.onCrown(i, 'us'); }
}
cpOn('c18fall', i => { C18W.fallAt = C18W.fallAt || {}; C18W.fallAt[i | 0] = g.t; const [x, y] = c18W(...c18TwAt(i | 0)); c18Snd('debris', x, y, 1); c18Snd('explode', x, y, 0.8); });
// (hosting) his hands at your towers: each blow that lands near enough; the bosses among them grind at it
function c18OwHits(dt) {
  const S = c18S(); if (!S) return;
  for (const z of ZM.z) {
    if (z.dead || z.st !== 'in' || z.rr > 0 || z.bt === 'c18tw' || z.bt === 'c18plim') continue;
    for (let i = 0; i < 3; i++) {
      const o = S.ow[i]; if (o.dead) continue;
      const [x, y] = c18W(...c18TwAt(i)), d = Math.hypot(z.x - x, z.y - y); if (d > c18TwR(i) + (z.boss ? 3.2 : 1.9)) continue;
      if (z.boss) { if (z.act) c18OwHurt(i, dt * 5, 'boss'); break; }
      if (z.swing >= 0.28 && !z.c18h) { z.c18h = 1; c18OwHurt(i, z.skit ? 1.1 : z.c18sailor ? 3 : 2, 'hand'); }
      break;
    }
    if (z.swing < 0) z.c18h = 0;
  }
}
// (hosting) your towers shoot: the nearest of his hands in reach, on the rock or in the air
function c18OwFire(dt) {
  const S = c18S(); if (!S) return;
  for (let i = 0; i < 3; i++) {
    const o = S.ow[i]; if (o.dead || !o.lit) continue;
    o.cd -= dt; if (o.cd > 0) continue;
    const g0 = c18Great(i), R = g0 ? C18.FIRE_RG : C18.FIRE_R, [lx, ly, lz] = c18Lamp(i);
    let best = null, bd = 1e9, bird = false;
    for (const z of ZM.z) { if (z.dead || z.rr > 0.05 || z.bt === 'c18tw') continue; const d = Math.hypot(z.x - lx, z.y - ly); if (d < R && d < bd) { bd = d; best = z; bird = false; } }
    for (const b of S.bd) { if (b.hp <= 0) continue; const d = Math.hypot(b.x - lx, b.y - ly); if (d < R && d < bd) { bd = d; best = b; bird = true; } }
    if (!best) { o.cd = 0.3; continue; }
    o.cd = (g0 ? C18.FIRE_TG : C18.FIRE_T) * (0.9 + Math.random() * 0.2);
    const dmg = zmHp(ZM.round) * (g0 ? C18.FIRE_KG : C18.FIRE_K);
    o.seq = (o.seq + 1) % 1000;
    if (bird) { const [bx, by] = c18L(best.x, best.y); o.tx = bx; o.ty = by; o.tz = best.z; c18BirdHurt(best, dmg * 1.4); }
    else {
      const [zx, zy] = c18L(best.x, best.y); o.tx = zx; o.ty = zy; o.tz = (best.jz || 0) + (best.boss ? 1.4 : best.skit ? 0.3 : 1.1);
      best.hitT = 0.2; best.hp -= dmg * (best.boss ? 0.5 : 1);
      if (best.hp <= 0) zmKill(best, false, '', 'flash');
    }
  }
}

// =====================================================================================================================
// his hands (hosting or alone): his oil, the next hand from his deck, set down in a ring on dry rock
// =====================================================================================================================
// c: oil; n: how many [first, more for each more of you]; k: what (crew, crabs, gulls, sailor, diver, moon)
const C18H = { crew: { c: 3, n: [3, 1] }, crabs: { c: 2, n: [5, 2] }, gulls: { c: 3, n: [3, 1] }, sailor: { c: 3, n: [1, 0] }, diver: { c: 7, n: [1, 0] }, moon: { c: 7, n: [1, 0] } };
const C18_DECK = ['crew', 'crabs', 'gulls', 'crew', 'sailor', 'crabs', 'crew', 'gulls'];
const c18Alive = () => ZM.z.filter(z => !z.dead && z.bt !== 'c18tw' && z.bt !== 'c18plim').length + (c18S() ? c18S().bd.filter(b => b.hp > 0).length : 0);
// where on his side (or, once one of your Lamp Towers is down, behind it on yours) a hand may be set down, in lane L
function c18DropAt(L) {
  const S = c18S(), lx = L ? C18.CW : -C18.CW, open = S && S.ow[L].dead;
  for (let t = 0; t < 14; t++) {
    const ours = open && Math.random() < 0.5, x = lx + (Math.random() - 0.5) * 12, y = ours ? -(27 + Math.random() * 6) : 31 + Math.random() * 7;
    if (!c18InRock(x, y, 1.5)) continue;
    let ok = true; for (let i = 0; i < 6; i++) { const [tx, ty] = c18TwAt(i); if (Math.hypot(tx - x, ty - y) < c18TwR(i) + 1.8) ok = false; }
    if (ok && !zmBlockedAt(...c18W(x, y), 0.5, 0)) return [x, y];
  }
  return [lx, 34];
}
// (hosting) his oil fills and he sets down the next hand when he can; special ones (S.next: a kind) jump the deck
function c18Rival(dt) {
  const S = c18S(); if (!S || !S.rivalOn) return;
  const n = c18N(), k = (S.last || S.ot ? 2 : 1) * (1 + 0.3 * (n - 1)) * (S.rk || 1);
  S.ro = Math.min(C18.OIL_MAX, S.ro + dt * k / C18.RFILL);
  const kind = S.next || C18_DECK[S.deck % C18_DECK.length], H = C18H[kind];
  if (S.ro < H.c || c18Alive() >= C18.ALIVE + 3 * (n - 1) || S.dp.length > 2) return;
  S.ro -= H.c; if (S.next) S.next = null; else S.deck++;
  // (which lane: at the weaker of your two Lamp Towers, now and then the other)
  const k0 = c18TwK(0), k1 = c18TwK(1), L = (k0 === 0 && k1 > 0) ? (Math.random() < 0.6 ? 0 : 1) : (k1 === 0 && k0 > 0) ? (Math.random() < 0.6 ? 1 : 0) : Math.random() < (k0 < k1 ? 0.65 : 0.35) ? 0 : 1;
  const [x, y] = c18DropAt(L);
  S.dp.push({ x, y, t: 1.1, k: kind, n: H.n[0] + H.n[1] * (n - 1) });
  if (!S.said.ahoy) c18Say('ahoy', 'c18far', 'Ahoy!', 'cp_m18_15');
}
function c18DropTick(dt) {
  const S = c18S(); if (!S) return;
  for (let i = S.dp.length - 1; i >= 0; i--) { const D = S.dp[i]; D.t -= dt; if (D.t <= 0) { S.dp.splice(i, 1); c18Spawn(D.k, D.x, D.y, D.n); } }
}
function c18Spawn(kind, x, y, cnt) {
  const S = c18S(), n = c18N(), r = ZM.round, more = 1 + 0.25 * (n - 1);
  for (let j = 0; j < cnt; j++) {
    const a = j / Math.max(1, cnt) * 6.283 + Math.random(), rr = cnt > 1 ? 1.2 + Math.random() * 0.8 : 0, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr, [wx, wy] = c18W(px, py);
    if (kind === 'crew') { const u = Math.random(); raidSpawnAt(wx, wy, { kind: u < 0.15 ? 'run' : u < 0.6 ? 'jog' : 'walk', hp: zmHp(r) * more * (0.9 + Math.random() * 0.2), rise: 1.1 }); }
    else if (kind === 'sailor') { const z = raidSpawnAt(wx, wy, { kind: 'run', hp: zmHp(r) * more * 1.8, rise: 1.2 }); z.c18sailor = 1; z.n = 'the Drowned Sailor'; }
    else if (kind === 'crabs') { const z = raidSpawnAt(wx, wy, { rise: 0 }); zwDress(z); z.hp = z.max = zmHp(r) * ZWC.HP * more * (0.85 + Math.random() * 0.3); z.sp = ZWC.SP[0] + Math.random() * (ZWC.SP[1] - ZWC.SP[0]); z.h = Math.PI; }
    else if (kind === 'gulls') c18BirdNew(px, py);
    else if (kind === 'diver' || kind === 'moon') { if (typeof c9Boss === 'function') { const z = c9Boss(kind, wx, wy, 0, { r: 10, k: 0.55, h: Math.PI, rise: 1.6 }); z.c18big = 1; } }
  }
  if (kind === 'diver') c18Say('diver', 'c18near', 'A diver’s helmet on the causeway. Even the drowned will cross for him.', 'cp_m18_27');
  if (kind === 'moon') c18Say('moon', 'c18near', 'A man with a false light, crossing for him. Do not look into it. Shoot him.', 'cp_m18_39');
  void S;
}

// =====================================================================================================================
// his birds (C18B: hosting or alone; joined screens ease to the host's word): straight over the water, a dive, a peck
// =====================================================================================================================
const C18B = { SP: 7.5, ALT: 6.5, DIVE: 7, HP: 0.7, PECK: 0.5, TW: 1.4, R: 0.75, MAX: 9 };
function c18BirdNew(x, y) {
  const S = c18S(); if (!S || S.bd.filter(b => b.hp > 0).length >= C18B.MAX) return;
  const [wx, wy] = c18W(x, y), hp = zmHp(ZM.round) * C18B.HP * (1 + 0.25 * (c18N() - 1));
  S.bd.push({ i: ++S.bid, x: wx, y: wy, z: 1.5, h: Math.PI, hp, max: hp, st: 0, t: 0, tg: '', tw: -1, ph: Math.random() * 6 });
}
// (hosting) st 0: out to it at height; 1: the dive; 2: back up
function c18BirdTick(dt) {
  const S = c18S(); if (!S) return;
  for (const b of S.bd) {
    if (b.hp <= 0) { b.dT = (b.dT || 0) + dt; continue; }
    b.t += dt;
    // (whom: the nearest of you standing, or of your towers)
    if (b.st !== 1 || !b.tx) {
      let best = null, bd = 1e9;
      for (const [sid, x, y, jz, down] of c18All()) { if (down) continue; const d = Math.hypot(x - b.x, y - b.y); if (d < bd) { bd = d; best = { x, y, z: jz + 1.5, sid, tw: -1 }; } }
      for (let i = 0; i < 3; i++) { if (S.ow[i].dead) continue; const [x, y] = c18W(...c18TwFront(i)), d = Math.hypot(x - b.x, y - b.y) + 4; if (d < bd) { bd = d; best = { x, y, z: 3, sid: '', tw: i }; } }
      if (best) { b.tx = best.x; b.ty = best.y; b.tz = best.z; b.tg = best.sid; b.tw = best.tw; }
    }
    if (b.tx == null) continue;
    const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
    b.h += angDiff(bearingOf(dx, dy), b.h) * Math.min(1, dt * 4);
    if (b.st === 0) {
      b.z += (C18B.ALT - b.z) * Math.min(1, dt * 1.5);
      const s = C18B.SP * dt; b.x += Math.sin(b.h) * s; b.y += Math.cos(b.h) * s;
      if (d < C18B.DIVE && b.t > 1.2) { b.st = 1; b.t = 0; }
    } else if (b.st === 1) {
      const dz = b.tz - b.z, d3 = Math.hypot(d, dz), s = C18B.SP * 1.5 * dt;
      if (d3 > 0.05) { b.x += dx / d3 * s; b.y += dy / d3 * s; b.z += dz / d3 * s; }
      if (d3 < 1.1) {
        if (b.tw >= 0) c18OwHurt(b.tw, C18B.TW, 'bird');
        else if (b.tg) cpEvent('c18peck', b.tg);
        b.st = 2; b.t = 0; b.tx = null;
      } else if (b.t > 3) { b.st = 2; b.t = 0; }
    } else {
      b.z = Math.min(C18B.ALT, b.z + dt * 4); const s = C18B.SP * 0.6 * dt; b.x -= Math.sin(b.h) * s * 0.3; b.y -= Math.cos(b.h) * s * 0.3;
      if (b.t > 1.6) { b.st = 0; b.t = 0; }
    }
  }
  S.bd = S.bd.filter(b => b.hp > 0 || (b.dT || 0) < 1.5);
}
cpOn('c18peck', sid => { if (sid !== FPS.me.id || c18Cine()) return; fpsHurt(C18B.PECK, '', 'A gull of the far rock'); zmSound('hit'); });
function c18BirdHurt(b, d, by) {
  if (!b || b.hp <= 0) return;
  b.hp -= d; b.hitT = 0.2;
  if (b.hp <= 0) { b.hp = 0; b.dT = 0; cpEvent('c18bird', [Math.round((b.x - FPSC.CX) * 10), Math.round((b.y - FPSC.CY) * 10), Math.round(b.z * 10)]); if (by) zmPoints(60, false, by); }
}
cpOn('c18bird', a => { if (!Array.isArray(a)) return; const [x, y] = c18W(a[0] / 10, a[1] / 10); fpsPuff(x, y, FPSC.GROUND + a[2] / 10, '240,240,236', 12); c18Snd('gull', x, y, 0.6); });
// (every screen) my own shot: through one of the birds? (hosting it's judged here; joined, the host is told)
function c18BirdShot(x, y, z, lh, lp, dmg) {
  const S = c18S(); if (!S || !S.bd.length) return;
  const cp = Math.cos(lp), dx = Math.sin(lh) * cp, dy = Math.cos(lh) * cp, dz = Math.sin(lp);
  let best = null, bt = 1e9;
  for (const b of S.bd) { if (b.hp <= 0) continue; const qx = (b.dx == null ? b.x : b.dx) - x, qy = (b.dy == null ? b.y : b.dy) - y, qz = FPSC.GROUND + (b.dz == null ? b.z : b.dz) - z, t = qx * dx + qy * dy + qz * dz; if (t < 0 || t > 120) continue; const miss = Math.hypot(qx - dx * t, qy - dy * t, qz - dz * t); if (miss < C18B.R && t < bt) { bt = t; best = b; } }
  if (!best) return;
  FPS.hitT = 0.2; FPS.hitHead = false; try { fpsHitSound(false); } catch (e) {}
  const d = Math.max(1, dmg || 1);
  if (ZM.net === 'client') raidAsk('c18b', [best.i, d]); else c18BirdHurt(best, d, FPS.me.id);
}

// =====================================================================================================================
// lamp oil, carrying, kegs, mending (hosting; asked by everyone)
// =====================================================================================================================
function c18OilTick(dt) { const S = c18S(); if (!S || !S.oilOn) return; S.oil = Math.min(C18.OIL_MAX, S.oil + dt * (S.last || S.ot ? 2 : 1) * (1 + 0.15 * (c18N() - 1)) / C18.OIL_T); }
const c18Mine = () => { const S = c18S(); return S && S.cy ? S.cy[FPS.me.id] || '' : ''; };
function c18Q(sid, k, a) {
  const S = c18S(); if (!S) return;
  const P = typeof c9Who === 'function' ? c9Who(sid) : null; if (!P || P.down) return;
  const [px, py] = c18L(P.x, P.y), near = (x, y, r) => Math.hypot(px - x, py - y) < r;
  if (k === 'c18take') {
    if (S.cy[sid] || !near(C18.OIL[0], C18.OIL[1], 3.4)) return;
    if (S.ph === 'trim') { if (S.ow.some(o => !o.lit) && Object.values(S.cy).filter(v => v === 'can').length < S.ow.filter(o => !o.lit).length) { S.cy[sid] = 'can'; c18Say('can1', 'c18near', 'Up to the door of the tower with it, and hold the wick to the flame.', 'cp_m18_05'); } return; }
    if (S.oil < C18.KEG) { if (sid === FPS.me.id) fpsFeed(`A powder keg wants ${C18.KEG} measures of oil. There are ${Math.floor(S.oil)}.`); return; }
    S.oil -= C18.KEG; S.cy[sid] = 'keg';
    c18Say('keg1', 'c18near', 'Mind the keg. Set it at the foot of one of his towers, and stand well back.', 'cp_m18_33');
    return;
  }
  if (k === 'c18light') {
    const i = a | 0, o = S.ow[i]; if (!o || o.lit || S.cy[sid] !== 'can') return;
    const [fx, fy] = c18TwDoor(i); if (!near(fx, fy, 3.2)) return;
    o.lit = 1; delete S.cy[sid]; cpEvent('c18lit', i);
    const left = S.ow.filter(q => !q.lit).length;
    if (left) c18Say('lit1', 'c18near', 'That is one. Now the other.', 'cp_m18_06'); else c18Say('lit2', 'c18near', 'Both lit. Now that is a proper light.', 'cp_m18_07');
    return;
  }
  if (k === 'c18plant') {
    const i = a | 0; if (S.cy[sid] !== 'keg' || i < 3 || i > 5) return;
    const z = c18TwZ(i); if (!z || z.dead) return;
    const [tx, ty] = c18TwAt(i); if (!near(tx, ty, c18TwR(i) + 3)) return;
    delete S.cy[sid];
    const d = Math.hypot(px - tx, py - ty) || 1, kx = tx + (px - tx) / d * (c18TwR(i) + 0.5), ky = ty + (py - ty) / d * (c18TwR(i) + 0.5);
    S.kg.push({ i: ++S.kid, x: kx, y: ky, t: C18.KEG_FUSE, tw: i, by: sid });
    c18Feed('A powder keg is set. Stand back!');
    return;
  }
  if (k === 'c18mend') {
    const i = a | 0, o = S.ow[i]; if (!o || o.dead || o.hp >= o.max - 1 || S.oil < C18.MEND || S.cy[sid]) return;
    const [tx, ty] = c18TwAt(i); if (!near(tx, ty, c18TwR(i) + 3)) return;
    S.oil -= C18.MEND; o.hp = Math.min(o.max, o.hp + o.max * C18.MEND_K); cpEvent('c18mend', i);
    return;
  }
  if (k === 'c18b' && Array.isArray(a)) { const b = S.bd.find(q => q.i === (a[0] | 0)); if (b) c18BirdHurt(b, clamp(+a[1] || 0, 0, 12), sid); }
}
cpOn('c18mend', i => { const [x, y] = c18W(...c18TwAt(i | 0)); for (let k = 0; k < 10; k++) FPS.parts.push({ x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4, z: FPSC.GROUND + Math.random() * 6, vx: 0, vy: 0, vz: 1 + Math.random(), t: 1, c: '255,220,140', up: true }); c18Snd('lampcatch', x, y, 0.7); });
cpOn('c18lit', i => { const [x, y] = c18W(...c18TwAt(i | 0)); c18Snd('lampcatch', x, y, 0.9); });
// a Lamp Tower's door (your side: towards your Great Light)
function c18TwDoor(i) { const [x, y] = c18TwAt(i), s = c18Side(i); return [x, y + s * (c18TwR(i) + 0.9)]; }
// (hosting) kegs burning down, and going off
function c18KegTick(dt) {
  const S = c18S(); if (!S) return;
  for (let j = S.kg.length - 1; j >= 0; j--) {
    const K = S.kg[j]; K.t -= dt; if (K.t > 0) continue;
    S.kg.splice(j, 1);
    const z = c18TwZ(K.tw), [wx, wy] = c18W(K.x, K.y);
    if (z && !z.dead) { const d = z.max * (c18Great(K.tw) ? C18.KEG_GREAT : C18.KEG_LAMP); z.hp -= d; z.hitT = 0.3; if (K.tw === 5 && !S.gw) S.gw = 1; if (z.hp <= 0) zmKill(z, false, 'k', 'flash', K.by); }
    for (const q of ZM.z) if (!q.dead && q.bt !== 'c18tw' && Math.hypot(q.x - wx, q.y - wy) < 4.5) { if (q.boss) { q.hp -= q.max * 0.08; if (q.hp <= 0) zmKill(q, false, 'k', 'flash', K.by); } else zmKill(q, false, 'k', 'burn', K.by); }
    cpEvent('c18boom', [Math.round(K.x * 10), Math.round(K.y * 10)]);
  }
}
cpOn('c18boom', a => {
  if (!Array.isArray(a)) return; const [x, y] = c18W(a[0] / 10, a[1] / 10), m = FPS.me, d = Math.hypot(x - m.x, y - m.y);
  c18Snd('explode', x, y, 1); fpsPuff(x, y, FPSC.GROUND + 0.6, '255,180,90', 18); fpsPuff(x, y, FPSC.GROUND + 2, '90,86,80', 16);
  if (d < 10) FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.2 * (1 - d / 10), -0.8, 0.8);
  if (d < 3 && !c18Cine()) fpsHurt(1, '', 'A powder keg');
});
// (hosting) whoever carries something and goes down drops it, lost; whoever's gone loses it
function c18CarryTick() {
  const S = c18S(); if (!S) return;
  for (const sid of Object.keys(S.cy)) { const P = typeof c9Who === 'function' ? c9Who(sid) : null; if (!P || P.down) { const k = S.cy[sid]; delete S.cy[sid]; if (P) c18Feed(k === 'keg' ? 'A powder keg was dropped, and lost.' : 'A can of oil was dropped, and spilt.'); } }
}

// ---------- the hands' targets: you, and your towers ----------
function c18Players(P) {
  const S = c18S(); if (!S) return P;
  const out = P.slice();
  for (let i = 0; i < 3; i++) { if (S.ow[i].dead || S.noTw) continue; const [x, y] = c18W(...c18TwFront(i)); out.push({ sid: 'c18tw' + i, x, y, jz: 0, npc: true, c18tw: i }); }
  return out;
}

// ---------- sounds ----------
function c18Snd(name, x, y, vol, o) { try { if (soundOff()) return false; const m = FPS.me, d = Math.hypot(x - m.x, y - m.y); return sfxPlay(name, Object.assign({ vol: vol * Math.max(0.05, 1 - d / 70), pan: fpsEar(x, y) }, o || {})); } catch (e) { return false; } }

// =====================================================================================================================
// the host's word for all of it, and joined screens reading it
// =====================================================================================================================
const C18_PH = ['', 'trim', 'high', 'ebb', 'slack', 'turn', 'cross', 'ot', 'champ', 'great', 'won'];
function c18Pack(o) {
  const S = c18S(); if (!S) return;
  o.c18 = [C18_PH.indexOf(S.ph), Math.round(S.tide * 100), Math.round(S.T * 10), Math.round(S.oil * 10), S.cu, S.ct, S.tl ? 1 : 0, S.gw ? 1 : 0, S.last ? 1 : 0, S.ot ? 1 : 0, S.plim || 0, [3, 4, 5].reduce((a, i) => a | (c18HisUp(i) ? 0 : 1 << i), 0), S.oilOn ? 1 : 0];
  o.ow = S.ow.map(q => [Math.round(q.hp * 10), Math.round(q.max), q.seq, Math.round(q.tx * 10), Math.round(q.ty * 10), Math.round(q.tz * 10), q.lit ? 1 : 0, q.dead ? 1 : 0]);
  o.bd = S.bd.map(b => [b.i, Math.round((b.x - FPSC.CX) * 10), Math.round((b.y - FPSC.CY) * 10), Math.round(b.z * 10), Math.round(b.h * 100), b.hp > 0 ? 1 : 0, b.st]);
  o.cy = Object.entries(S.cy).map(([s, k]) => [s, k === 'keg' ? 1 : 0]);
  o.kg = S.kg.map(K => [K.i, Math.round(K.x * 10), Math.round(K.y * 10), Math.round(K.t * 10)]);
  o.dp = S.dp.map(D => [Math.round(D.x * 10), Math.round(D.y * 10), Math.round(D.t * 10), D.k === 'gulls' ? 1 : D.k === 'crabs' ? 2 : 0]);
  if (typeof c9NpcPack === 'function') o.np = c9NpcPack(S.npc || []);
}
function c18Apply(o) {
  const S = c18S(); if (!S) return;
  const a = o.c18;
  if (Array.isArray(a)) { S.ph = C18_PH[a[0] | 0] || S.ph; S.tide = (a[1] | 0) / 100; S.T = (a[2] | 0) / 10; S.oil = (a[3] | 0) / 10; S.cu = a[4] | 0; S.ct = a[5] | 0; S.tl = a[6] | 0; S.gw = a[7] | 0; S.last = !!a[8]; S.ot = !!a[9]; S.plim = a[10] | 0; S.dn = a[11] | 0; S.oilOn = !!a[12]; }
  if (Array.isArray(o.ow)) o.ow.forEach((r, i) => { const q = S.ow[i]; if (!q || !Array.isArray(r)) return; q.hp = (r[0] | 0) / 10; q.max = r[1] | 0 || 1; if ((r[2] | 0) !== q.seq) { q.seq = r[2] | 0; q.tx = (r[3] | 0) / 10; q.ty = (r[4] | 0) / 10; q.tz = (r[5] | 0) / 10; q.fired = 1; } q.lit = r[6] | 0; q.dead = r[7] | 0; });
  if (Array.isArray(o.bd)) {
    const seen = new Set();
    for (const r of o.bd) { if (!Array.isArray(r)) continue; const id = r[0] | 0; seen.add(id); let b = S.bd.find(q => q.i === id); const [x, y] = c18W(r[1] / 10, r[2] / 10); if (!b) { b = { i: id, x, y, z: r[3] / 10, h: r[4] / 100, hp: 1, max: 1, st: 0, ph: Math.random() * 6 }; S.bd.push(b); } b.tx2 = x; b.ty2 = y; b.tz2 = r[3] / 10; b.th = r[4] / 100; if (!(r[5] | 0) && b.hp > 0) { b.hp = 0; b.dT = 0; } b.st = r[6] | 0; }
    S.bd = S.bd.filter(b => seen.has(b.i) || (b.hp <= 0 && (b.dT || 0) < 1.5));
  }
  S.cy = {}; if (Array.isArray(o.cy)) for (const r of o.cy) if (Array.isArray(r)) S.cy[String(r[0])] = r[1] ? 'keg' : 'can';
  S.kg = Array.isArray(o.kg) ? o.kg.filter(Array.isArray).map(r => ({ i: r[0] | 0, x: r[1] / 10, y: r[2] / 10, t: r[3] / 10 })) : [];
  S.dp = Array.isArray(o.dp) ? o.dp.filter(Array.isArray).map(r => ({ x: r[0] / 10, y: r[1] / 10, t: r[2] / 10, k: ['crew', 'gulls', 'crabs'][r[3] | 0] })) : [];
  S.npc = S.npc || []; if (typeof c9NpcApply === 'function') c9NpcApply(S.npc, o.np, k => C18_COLS[k]);
}
// (joined) the birds eased towards the host's word
function c18BirdEase(dt) { const S = c18S(); if (!S || ZM.net !== 'client') return; const k = Math.min(1, dt * 8); for (const b of S.bd) { if (b.tx2 == null) continue; b.x += (b.tx2 - b.x) * k; b.y += (b.ty2 - b.y) * k; b.z += (b.tz2 - b.z) * k; b.h += angDiff(b.th, b.h) * k; if (b.hp <= 0) b.dT = (b.dT || 0) + dt; } }

// =====================================================================================================================
// the keepers: yours by your Great Light, his by his (src/cpm09x.js's people, standing)
// =====================================================================================================================
// (their oilskins: yellow, with their side's colour at the trim)
var C18_COLS = { c18near: ['#c8a032', '#d8d0bc', '#3a6ad8', '#ffd88a'], c18far: ['#c09030', '#d8d0bc', '#c8382c', '#ffd88a'] };
function c18Keepers() {
  if (typeof c9NpcNew !== 'function') return [];
  return [c9NpcNew('c18near', C18.NEAR[0], C18.NEAR[1], 0, { cols: C18_COLS.c18near, hp: 1, max: 0, safe: 1, h: 0.3 }), c9NpcNew('c18far', C18.FAR[0], C18.FAR[1], 0, { cols: C18_COLS.c18far, hp: 1, max: 0, safe: 1, h: Math.PI + 0.3 })];
}

// =====================================================================================================================
// the part: every hook a part of this mission shares (each part's own go over these)
// =====================================================================================================================
function c18Stage(def) {
  return Object.assign({
    mend: true, noBars: false, map: C18_MAP,
    block(x, y, pad) { const [lx, ly] = c18L(x, y); return !c18Walk(lx, ly, Math.max(0, (pad || 0) - 0.12)); },
    prep() { ZM_MAPS.campaign.tower = false; },
    enter() {
      c18State(); const S = RAID.st;
      if (typeof c9Ready === 'function') c9Ready(def.round || 5);
      else { ZM.round = def.round || 5; if (typeof ZB !== 'undefined') { ZB.round = ZM.round; ZB.plan = []; } ZM.buys = []; ZM.perksAt = []; ZM.spawns = []; }
      FPS.me.h = 0;
      S.npc = c18Keepers();
      if (def.c18enter) def.c18enter(S);
    },
    tick(dt) {
      const S = c18S(); if (!S || c18Cine()) return;
      c18OilTick(dt); c18OwFire(dt); c18OwHits(dt); c18Rival(dt); c18DropTick(dt); c18BirdTick(dt); c18KegTick(dt); c18CarryTick();
      if (!c18Dry() && S.tide < 0.6) c18Wash();
      if (def.c18tick) def.c18tick(dt, S);
    },
    me(dt) {
      if (typeof c9AmmoTick === 'function') c9AmmoTick(dt);
      const S = c18S(); if (!S) return;
      if (ZM.net === 'client' && typeof c9NpcEase === 'function') c9NpcEase(S.npc || [], dt);
      c18BirdEase(dt);
      c18MeTick(dt);
      if (def.c18me) def.c18me(dt, S);
    },
    players: P => c18Players(P),
    q(sid, k, a) { if (/^c18/.test(k)) c18Q(sid, k, a); },
    kill(d, how, by) {
      if (ZM.net === 'client') return;
      const S = c18S(); if (!S) return;
      if (d.bt === 'c18tw') { if (d.c18i == null) d.c18i = c18TwIdx(d); d.c18down = 1; c18TwDown(d.c18i); return; }
      if (d.bt === 'c18plim') { if (def.c18plimDown) def.c18plimDown(d); return; }
      // (the Drowned Sailor rises once more; not when the tide's taking them all)
      if (d.c18sailor === 1 && S.rivalOn) { const [lx, ly] = c18L(d.x, d.y); if (c18InRock(lx, ly, 0.5)) { const z = raidSpawnAt(d.x, d.y, { kind: 'run', hp: d.max * 0.7, rise: 1.4 }); z.c18sailor = 2; z.n = 'the Drowned Sailor'; c18Say('sailor', 'c18near', 'That one will get up again. They always do, the first time.', 'cp_m18_30'); } }
    },
    shot(x, y, z, lh, lp, by, dmg) { c18BirdShot(x, y, z, lh, lp, dmg); },
    speedK: () => c18Mine() ? C18.CARRY_K : 1,
    consider(c) { c18Consider(c); if (typeof c9AmmoConsider === 'function') c9AmmoConsider(c, [...c18W(...C18.AMMO), 0]); },
    prompt(o) { return c18Prompt(o) || (typeof c9AmmoPrompt === 'function' ? c9AmmoPrompt(o) : null); },
    use(o) { if (c18Use(o)) return true; return typeof c9AmmoUse === 'function' ? c9AmmoUse(o) : false; },
    pack: o => c18Pack(o), apply: o => c18Apply(o),
    hud(phone, mono, fell) { c18Hud(phone, mono, fell); if (def.c18hud) def.c18hud(phone, mono, fell); },
    b3(grp) { if (typeof c9NpcFreeAll === 'function') c9NpcFreeAll(); c18Build3D(grp); },
    f3(dt) { const S = c18S(); if (S && typeof c9NpcDraw === 'function') c9NpcDraw(S.npc || [], dt); c18Draw3D(dt); },
    exit() { c18FreeAll(); },
  }, def);
}
function c18FreeAll() { if (typeof c9NpcFreeAll === 'function') c9NpcFreeAll(); C18W.on = false; if (C18W.cineGrp && C18W.cineGrp.parent) C18W.cineGrp.parent.remove(C18W.cineGrp); C18W.cineGrp = null; }

// ---------- what's in reach, holding Use, and the prompts (every screen) ----------
const C18_HOLDS = { c18light: 1.0, c18plant: 1.0, c18mend: 1.5 };
function c18Consider(c) {
  const S = c18S(); if (!S || ZM.over) return; const mine = c18Mine();
  const at = (o, x, y, r) => { const [wx, wy] = c18W(x, y); c(o, wx, wy, 0, r || 2, false); };
  if (!mine && (S.ph === 'trim' || S.oilOn)) at({ k: 'c18take' }, C18.OIL[0], C18.OIL[1], 2.6);
  if (mine === 'can') for (let i = 0; i < 2; i++) if (!S.ow[i].lit) at({ k: 'c18light', i }, ...c18TwDoor(i), 2.6);
  if (mine === 'keg') for (let i = 3; i < 6; i++) { if (!c18TwUp(i)) continue; const [tx, ty] = c18TwAt(i), m = FPS.me, [mx, my] = c18L(m.x, m.y), d = Math.hypot(mx - tx, my - ty) || 1, R = c18TwR(i); at({ k: 'c18plant', i }, tx + (mx - tx) / d * (R + 0.6), ty + (my - ty) / d * (R + 0.6), 2.6); }
  if (!mine && S.oilOn) for (let i = 0; i < 3; i++) { const o = S.ow[i]; if (o.dead || o.hp >= o.max - 1) continue; const [tx, ty] = c18TwAt(i), m = FPS.me, [mx, my] = c18L(m.x, m.y), d = Math.hypot(mx - tx, my - ty) || 1, R = c18TwR(i); at({ k: 'c18mend', i }, tx + (mx - tx) / d * (R + 0.6), ty + (my - ty) / d * (R + 0.6), 2.4); }
}
function c18Prompt(o) {
  const S = c18S(); if (!S) return null;
  if (o.k === 'c18take') return S.ph === 'trim' ? { text: 'Take a can of lamp oil', free: true } : S.oil >= C18.KEG ? { text: `Take a powder keg (${C18.KEG} oil)`, free: true } : { text: `A powder keg wants ${C18.KEG} oil (${Math.floor(S.oil)} now)` };
  if (o.k === 'c18light') return { text: 'Hold to light the Lamp Tower', hold: true };
  if (o.k === 'c18plant') return { text: 'Hold to set the powder keg at its foot', hold: true };
  if (o.k === 'c18mend') return S.oil >= C18.MEND ? { text: `Hold to mend the tower with lamp oil (${C18.MEND} oil)`, hold: true } : { text: `Mending it wants ${C18.MEND} oil (${Math.floor(S.oil)} now)` };
  return null;
}
function c18Use(o) { if (o.k === 'c18take') { raidAsk('c18take', 0); return true; } return !!C18_HOLDS[o.k]; }
// (every screen, each frame) holding Use; the carried thing in front of you; the Race at your feet
var C18X = { wetT: 0, warnT: 0 };
function c18MeTick(dt) {
  const S = c18S(), o = ZM.near, m = FPS.me;
  if (typeof cphTick === 'function') cphTick(dt, o && C18_HOLDS[o.k] ? o : null, o && C18_HOLDS[o.k] ? C18_HOLDS[o.k] : 0, q => raidAsk(q.k, q.i | 0));
  // (the tide back over a causeway with you on it: the Race takes your feet, and puts you back on the nearer rock)
  if (c18Cine() || m.dead > 0) return;
  const [lx, ly] = c18L(m.x, m.y);
  if (!c18Dry() && c18OverWater(lx, ly)) {
    C18X.wetT -= dt;
    if (C18X.wetT <= 0) { C18X.wetT = 1.2; if (!zmIsDown()) fpsHurt(1, '', 'The Race'); try { if (!soundOff()) sfxSplash(0, 0.6); } catch (e) {} }
    const s = Math.sign(ly) || -1, to = (c18Front(lx) + 1.5) * s, step = Math.min(Math.abs(to - ly), 9 * dt);
    m.y += Math.sign(to - ly) * step;
  }
  // (walking at the edge of a causeway at high water: say why not)
  C18X.warnT -= dt;
  if (!c18Dry() && C18X.warnT <= 0 && c18OnCw(lx, ly + (Math.sign(-ly) || 1) * 1.4, 0) >= 0 && Math.abs(ly) > c18Front(lx) - 1.6 && Math.abs(ly) < c18Front(lx) + 0.5) { C18X.warnT = 6; fpsFeed('The Race runs too fast to cross. Wait for slack water.'); }
  void S;
}

// =====================================================================================================================
// painted on top (every screen): the crowns and the clock, the oil, the towers' strength, what you carry
// =====================================================================================================================
const c18Clock = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
function c18Crown(x, y, s, on, col) {
  ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.55); ctx.lineTo(x - s, y - s * 0.35); ctx.lineTo(x - s * 0.5, y + s * 0.05); ctx.lineTo(x, y - s * 0.6); ctx.lineTo(x + s * 0.5, y + s * 0.05); ctx.lineTo(x + s, y - s * 0.35); ctx.lineTo(x + s, y + s * 0.55); ctx.closePath();
  ctx.fillStyle = on ? '#ffd34d' : 'rgba(20,22,28,0.6)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = on ? '#8a6a10' : col; ctx.stroke();
}
function c18Hud(phone, mono, fell) {
  const S = c18S(); if (!S || ZM.over) return;
  const fight = ['slack', 'cross', 'ot', 'champ', 'great'].includes(S.ph), m = FPS.me;
  // the towers' strength, over each one (yours blue, his red)
  for (let i = 0; i < 6; i++) {
    const k = c18TwK(i); if (k <= 0 || (i >= 3 && !S.tl)) continue;
    const [x, y] = c18W(...c18TwAt(i)), d = Math.hypot(x - m.x, y - m.y); if (d > 110) continue;
    const c = cam(x, y, FPSC.GROUND + (c18Great(i) ? 18 : 13)); if (c.f < 0.5) continue;
    const p = proj(c), w = (phone ? 46 : 70) * clamp(30 / d + 0.6, 0.7, 1.3), h = phone ? 5 : 7;
    ctx.fillStyle = 'rgba(8,10,14,0.65)'; ctx.fillRect(p.x - w / 2 - 2, p.y - 2, w + 4, h + 4);
    ctx.fillStyle = i < 3 ? '#4a9aff' : '#ff5a48'; ctx.fillRect(p.x - w / 2, p.y, w * k, h);
    if (i === 5 && !S.gw && S.tl && !['champ', 'great'].includes(S.ph)) { ctx.font = mono(phone ? 8 : 10); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,200,190,0.75)'; ctx.fillText('ASLEEP', p.x, p.y - 3); }
  }
  // the crowns and the clock, top middle
  if (fight || S.ph === 'turn') {
    const y0 = H - (phone ? 178 : 166), s = phone ? 7 : 9, gap = phone ? 19 : 24, half = phone ? 130 : 190;   // (above the oil: the bosses' bars have the top)
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(cx - half, y0 - (phone ? 6 : 8), half * 2, phone ? 40 : 52);
    ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 9 : 11);
    ctx.textAlign = 'left'; ctx.fillStyle = '#8ab8ff'; ctx.fillText('NEAR ROCK', cx - half + 8, y0 + 4);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ff9a8a'; ctx.fillText('FAR ROCK', cx + half - 8, y0 + 4);
    for (let j = 0; j < 3; j++) { c18Crown(cx - half + 14 + j * gap, y0 + (phone ? 20 : 26), s, S.cu > j, '#4a8ae8'); c18Crown(cx + half - 14 - j * gap, y0 + (phone ? 20 : 26), s, S.ct > j, '#e0483a'); }
    ctx.textAlign = 'center'; ctx.font = fell(phone ? 20 : 28); ctx.fillStyle = S.T < 20 ? `rgba(255,${150 + 60 * Math.sin(g.t * 8)},120,1)` : '#f4eedf';
    ctx.fillText(c18Clock(S.T), cx, y0 + (phone ? 10 : 13));
    ctx.font = mono(phone ? 8 : 10); ctx.fillStyle = S.last || S.ot || S.ph === 'champ' || S.ph === 'great' ? '#ffd88a' : 'rgba(236,228,207,0.7)';
    ctx.fillText(S.ot ? 'ONE MINUTE MORE · NEXT TOWER SETTLES IT' : S.ph === 'turn' ? 'THE TIDE HAS TURNED' : S.ph === 'champ' || S.ph === 'great' ? 'THE TIDE IS TURNING · OIL ×2' : S.last ? 'LAST MINUTE · OIL ×2' : 'SLACK WATER', cx, y0 + (phone ? 28 : 36));
    ctx.textBaseline = 'alphabetic';
  }
  // the oil, bottom middle
  if (S.oilOn) {
    const n = C18.OIL_MAX, w = phone ? 14 : 20, gp = 3, W0 = n * (w + gp), x0 = cx - W0 / 2, y0 = H - (phone ? 118 : 96), hh = phone ? 8 : 10;
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x0 - 8, y0 - (phone ? 16 : 20), W0 + 16, hh + (phone ? 24 : 30));
    for (let j = 0; j < n; j++) { const f = clamp(S.oil - j, 0, 1); ctx.fillStyle = 'rgba(60,50,40,0.7)'; ctx.fillRect(x0 + j * (w + gp), y0, w, hh); if (f > 0) { ctx.fillStyle = f >= 1 ? '#f0b040' : 'rgba(240,176,64,0.45)'; ctx.fillRect(x0 + j * (w + gp), y0, w * f, hh); } }
    ctx.font = mono(phone ? 9 : 11); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,226,170,0.9)';
    ctx.fillText(`LAMP OIL ${Math.floor(S.oil)}  ·  POWDER KEG ${C18.KEG}  ·  MEND A TOWER ${C18.MEND}${S.last || S.ot || S.ph === 'champ' || S.ph === 'great' ? '  ·  ×2' : ''}`, cx, y0 - 3);
    ctx.textBaseline = 'alphabetic';
  }
  // what you carry, and where to take it
  const mine = c18Mine();
  if (mine && !(m.dead > 0)) {
    ctx.textAlign = 'center'; ctx.font = mono(phone ? 11 : 13); ctx.fillStyle = 'rgba(255,226,170,0.92)';
    ctx.fillText(mine === 'keg' ? 'A POWDER KEG · SET IT AT THE FOOT OF ONE OF HIS TOWERS' : 'A CAN OF LAMP OIL · TO A LAMP TOWER’S DOOR', cx, H * (phone ? 0.7 : 0.74));
    if (typeof c9Mark === 'function') {
      if (mine === 'can') { const i = S.ow.findIndex((q, j) => j < 2 && !q.lit); if (i >= 0) { const [x, y] = c18W(...c18TwDoor(i)); c9Mark(x, y, 2, 'The tower door', phone, mono); } }
      else { let best = -1, bd = 1e9; for (let i = 3; i < 6; i++) { if (!c18TwUp(i) || (i === 5 && S.ph !== 'great' && (c18TwUp(3) || c18TwUp(4)))) continue; const [x, y] = c18W(...c18TwAt(i)), d = Math.hypot(x - m.x, y - m.y); if (d < bd) { bd = d; best = i; } } if (best >= 0) { const [x, y] = c18W(...c18TwAt(best)); c9Mark(x, y, 3, 'His tower', phone, mono); } }
    }
  }
  if (typeof cphHud === 'function') cphHud();
  if (typeof c9NpcHud === 'function') c9NpcHud(S.npc || [], phone, mono, true);
  // Plimsoll's strength (his own bar: he's a quiet kind, so the bosses' bars leave him out)
  const P = c18PlimZ();
  if (P && !P.dead && !(P.rr > 0.3)) {
    const k = ZM.net === 'client' ? (P.hpk == null ? 1 : P.hpk) : clamp(P.hp / P.max, 0, 1), bw = Math.min(380, W * (phone ? 0.46 : 0.4)), y0 = fpsHudTop() + (phone ? 22 : 30);
    ctx.textAlign = 'center'; ctx.font = fell(phone ? 14 : 19); ctx.fillStyle = P.fz > 0 ? '#ff8a7a' : '#8ab4ff'; ctx.fillText(P.fz > 0 ? 'Plimsoll · he smells blood' : 'Plimsoll', cx, y0 - 5);
    ctx.fillStyle = 'rgba(8,10,14,0.7)'; ctx.fillRect(cx - bw / 2 - 2, y0 - 2, bw + 4, (phone ? 6 : 9) + 4);
    const gr = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); gr.addColorStop(0, '#2a4a8a'); gr.addColorStop(1, '#8ab4ff'); ctx.fillStyle = gr; ctx.fillRect(cx - bw / 2, y0, bw * k, phone ? 6 : 9);
    if (P.act === 'c18lunge' && (P.at || 0) < C18P.WIND) { ctx.strokeStyle = `rgba(120,170,255,${0.5 + 0.5 * Math.sin(g.t * 20)})`; ctx.lineWidth = 2; ctx.strokeRect(cx - bw / 2 - 2, y0 - 2, bw + 4, (phone ? 6 : 9) + 4); }
  }
}
