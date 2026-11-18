'use strict';
// The Chronicle of the Light, mission 13: The Fall of Wrackhaven. Its three parts of the one night (src/cpm13.js has
// the mission itself and its cinematics), built with mission 9's tools (src/cpm09x.js: people, the drowned from where
// the night says, powder and shot, the sky).
//
// The place: Wrackhaven as the Lighthouse lays it out (src/zombies.js FPI_GEN.wrack), the quay, Fish Street, the
// houses round the Square and the town hall in the middle of it, stripped of the Lighthouse's own trade as the station
// is (FPI_GEN.cp13). And one part of it never walked before: the leads, the town hall's flat roof round the Belfry,
// opened up for the last stand (the Belfry's louvres out of its arches, boards laid over the roof, the parapet
// keeping everyone on it), where the whole drowned town and the harbour lie below, and the Light across the water.
//
// The flood: the sea comes up from the quay. Its front (C13F.front, how far north it has reached) moves up Fish Street
// and across the Square; behind it the water is deeper the further back you go, to the night's depth (C13F.max). It's
// drawn as one sheet of water whose surface the shader shapes from those two (c13Water), and the same two numbers
// say how deep it is anywhere (c13Depth), for everyone. Wading slows you (and the townsfolk); deep enough, the cold in
// it takes their strength. The drowned rise out of it wherever it's deep.
//
// The parts:
//  I.   Fish Street (cp_m13flood): from the quay, knock up the houses round Fish Street and the Square and bring each
//       of their people to the town hall (Use on them and they follow, in a line behind you, along the way you walk).
//       The sea comes up after you, house by house; the ones nearest the quay drown first.
//  II.  The Moot Hall (cp_m13hall): bar the town hall's windows before the drowned reach them, with the townsfolk on
//       the benches behind you. The Keelback comes up Fish Street through the flood and stoves in the great door;
//       put it down in the Moot Hall (it reels when it charges into a wall), and get everyone up the stair.
//  III. The Belfry (cp_m13belfry): the ground floor gone under. Hold the Council Chamber, the Belfry and the leads
//       until dawn; the drowned climb the walls to the windows, up the stair out of the drowned hall and over the
//       parapet onto the roof. At first light ring the bell, three peals, to bring the Light's boats across the
//       harbour for them. The ringing brings a Diver up onto the leads too.

// ---------- Wrackhaven, without its trade, with its roof ----------
FPS_ISLES.cp13 = FPS_ISLES.wrack;
const C13 = { F1: 4.4, F2: 8.8, BELL: [0.4, 11], DOOR: [0, -9], HALL: [-11, 11, -9, 7], saved: null };
FPI_GEN.cp13 = {
  built: true,
  set(H) {
    FPI_GEN.wrack.set(H);
    const Z = H.I.zm, I = H.I;
    for (const k of Object.keys(Z)) if (!C9_KEEP.includes(k)) delete Z[k];
    Z.buys.length = 0; Z.perks.length = 0; Z.spawns.length = 0;
    const S = RAID_STAGES[RAID_ORDER[RAID.stage]];
    if (S && S.lay) S.lay(H, zmKit(H, Z), Z);
  },
  decor() {},
};
// (from a stage's lay) the leads opened up: the louvres out of the Belfry's two arches, boards over the roof round it,
// and the parapet holding you on it
function c13Leads(H, K, Z) {
  const I = H.I, F2 = C13.F2, OX = FPSC.CX, OY = FPSC.CY;
  for (const p of I.props.slice()) if ((p.k === 'vlouvre' || (p.k === 'glasspane' && Math.abs((p.z0 || 0) - F2) < 0.01)) && Math.abs(Math.abs(p.x - OX) - 3.5) < 0.05 && Math.abs(p.y - OY - 10) < 0.05) fpiDrop(I, p);
  // (the boards leave the stairwell open: the stair up from the Council Chamber runs east to west under the east side,
  // y 7.45 to 8.85, and boarded over it, it hit its head on them and stopped halfway up)
  for (const [x0, x1, y0, y1] of [[-11, 11, -9, 7], [-11, -3.75, 7, 13], [3.75, 11, 9.1, 13], [9.5, 11, 7, 9.1]]) K.put('slab', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0, top: F2 });
  (Z.keep = Z.keep || []).push({ b: [OX - 11.6, OX + 11.6, OY - 9.6, OY - 9.0], z0: F2 + 0.5 }, { b: [OX - 11.6, OX + 11.6, OY + 13.0, OY + 13.6], z0: F2 + 0.5 },
    { b: [OX - 11.6, OX - 11.0, OY - 9.6, OY + 13.6], z0: F2 + 0.5 }, { b: [OX + 11.0, OX + 11.6, OY - 9.6, OY + 13.6], z0: F2 + 0.5 });
  // a lantern at each corner of the leads, and the chimney pots and the lead's rolls to see by
  for (const [x, y] of [[-10.3, -8.3], [10.3, -8.3], [-10.3, 12.3], [10.3, 12.3]]) { K.put('post', x, y, 0, { r: 0.08, hh: 1.2, lamp: true, lift: F2 }); K.light(x, y, F2 + 1.3, '#ffc070', 7, 'lantern'); }
}
function c13Map(start, top) {
  const D = ZM_MAPS.wrack;
  return { isle: 'cp13', start, top, zones: Object.assign({}, D.zones), nav: D.nav.slice(), shore: D.shore };
}

// ---------- the flood ----------
// front: how far north it's come (local y); max: how deep behind the front; SLOPE: deeper by this much a metre back
var C13F = { front: -44, max: 0.3, SLOPE: 0.09 };
function c13Depth(x, y, feet) {
  const ly = y - FPSC.CY, lvl = Math.min(C13F.max, Math.max(0, (C13F.front - ly) * C13F.SLOPE));
  return Math.max(0, lvl - (feet || 0));
}
// what wading does to you (the stage's speedK)
function c13Wade() { const m = FPS.me, d = c13Depth(m.x, m.y, m.jz || 0); return d > 1.3 ? 0.55 : d > 0.85 ? 0.72 : d > 0.4 ? 0.88 : 1; }
// (each screen, a stage's me) your own wading heard while you move in it, deeper the louder (the recording laid again about every take's length)
function c13WadeSfx() { const m = FPS.me; if (!m.walk || m.dead > 0 || zmIsDown() || typeof cpCineOn === 'function' && cpCineOn()) return; const d = c13Depth(m.x, m.y, m.jz || 0); if (d > 0.3) try { sfxPlay('wade', { vol: Math.min(0.85, 0.35 + d * 0.35), gap: 1.5, rate: d > 1.1 ? 0.92 : 1 }); } catch (e) {} }
// the sheet of water over the town: a grid whose height the shader sets (the front and the depth as uniforms)
var C13W = { m: null, u: null };
function c13Water(grp) {
  const X0 = -60, X1 = 60, Y0 = -62, Y1 = 56, NX = 61, NY = 119, pos = new Float32Array(NX * NY * 3), idx = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const v = j * NX + i; pos[v * 3] = FPSC.CX + X0 + (X1 - X0) * i / (NX - 1); pos[v * 3 + 1] = FPSC.GROUND; pos[v * 3 + 2] = -(FPSC.CY + Y0 + (Y1 - Y0) * j / (NY - 1)); }
  for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  geo.boundingSphere = new THREE.Sphere(z3v(FPSC.CX, FPSC.CY, FPSC.GROUND), 120);
  const U = C13W.u = { uFront: { value: -44 }, uMax: { value: 0.3 }, uSlope: { value: C13F.SLOPE }, uCY: { value: FPSC.CY }, uG: { value: FPSC.GROUND } };
  const mat = new THREE.MeshPhongMaterial({ color: 0x0a1820, specular: 0x9aaab8, shininess: 70, emissive: 0x03080c, transparent: true, opacity: 0.86, side: THREE.DoubleSide, depthWrite: true });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = ZW.t; Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uT, uFront, uMax, uSlope, uCY, uG;\nvarying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec4 w0 = modelMatrix * vec4(position, 1.0); float ly = -w0.z - uCY;
    float lvl = min(uMax, (uFront - ly) * uSlope);
    transformed.y = uG + lvl + 0.03 + 0.03 * sin(w0.x * 0.5 + uT * 1.4) + 0.02 * sin(w0.z * 0.7 - uT * 1.2); }
  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = 'uniform float uT;\nvarying vec3 vWp;\n' + sh.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  { vec2 p = vWp.xz;
    vec2 gr = 0.07 * cos(dot(p, vec2(1.3, 0.9)) + uT * 2.1) * vec2(1.3, 0.9) + 0.05 * cos(dot(p, vec2(-0.8, 1.7)) + uT * 2.5) * vec2(-0.8, 1.7) + 0.03 * cos(dot(p, vec2(2.9, -1.4)) - uT * 3.3) * vec2(2.9, -1.4);
    normal = normalize((viewMatrix * vec4(normalize(vec3(-gr.x, 1.0, -gr.y)), 0.0)).xyz); }`);
  };
  const m = C13W.m = new THREE.Mesh(geo, mat); m.renderOrder = 1; m.frustumCulled = false; grp.add(m);
}
function c13WaterTick() { const U = C13W.u; if (!U) return; U.uFront.value = C13F.front; U.uMax.value = C13F.max; U.uSlope.value = C13F.SLOPE; if (C13W.m) C13W.m.visible = C13F.max > 0.01; }
// (hosting or alone) the cold in the water: the townsfolk in it deep lose their strength; yours is your own affair
function c13Cold(list, dt) { for (const n of list) if (!n.gone && !n.safe && c13Depth(n.x, n.y, n.jz) > 1.05) { n.hp -= 0.55 * dt; n.cold = 1; } else n.cold = 0; }
// (hosting or alone) one rising out of the water, somewhere deep enough, 7 to 16 m from one of you, on your floor
function c13FromWater(o) {
  const P = c9All(); if (!P.length) return null;
  const p = P[(Math.random() * P.length) | 0];
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, d = 7 + Math.random() * 9, x = p[1] + Math.sin(a) * d, y = p[2] + Math.cos(a) * d;
    if (c13Depth(x, y, 0) < 0.45 || zmBlockedAt(x, y, 0.5, 0) || zmNavDist(x, y, 0) > 1e8 || Math.hypot(x - FPSC.CX, y - FPSC.CY) > FPSC.R - 4) continue;
    return c9Rise(x, y, 0, Object.assign({ rise: 1.6 }, o || {}));
  }
  return null;
}
// the stage made ready in Wrackhaven: every door open but those named (by the rooms either side of them)
function c13Ready(round, shut) {
  const I = FPS.g.isle; let ch = false;
  for (const d of ZM.doors) {
    const keep = (shut || []).some(z => z[0] === d.zones[0] && z[1] === d.zones[1]);
    if (!d.open && !keep) { d.open = true; d.openT = 9; I.solids = I.solids.filter(s => !d.solids.includes(s)); ch = true; }
  }
  if (ch) fpiIndex(I);
  ZM.open = new Set(['raid'].concat(Object.keys(ZM_ZONES)));
  ZM.buys = []; ZM.perksAt = []; ZM.spawns = [];
  ZM.round = round || 4;
  if (typeof ZB !== 'undefined') { ZB.round = ZM.round; ZB.plan = []; }
  for (const w of ZM.windows) { w.boards = w.sea ? 0 : 6; w.q = []; w.fall = []; }
  zmNavBuild(); ZM.navT = 0;
  c9AmmoFill(true);
}
const c13Door = (a, b) => ZM.doors.find(d => d.zones[0] === a && d.zones[1] === b);

// ---------- the townsfolk ----------
// each: who (CP_CAST), where they're found (local), the figure's colours
const C13P = [
  { k: 'chand', at: [-8, -30.5], cols: ['#4a3a2a', '#c8c0a8', '#7a5a3a', '#ffd88a'] },
  { k: 'wife', at: [8.4, -31.4], cols: ['#5a2a2a', '#d8d0bc', '#3a3a40', '#ffd88a'] },
  { k: 'smoke', at: [-28, -24.5], cols: ['#3a3430', '#b8b0a0', '#5a4a3a', '#ffd88a'] },
  { k: 'cooper', at: [29, -27.5], cols: ['#4a4030', '#c8b898', '#6a5030', '#ffd88a'] },
  { k: 'pascoe', at: [-29, -7], cols: ['#2e3a44', '#c0b8a0', '#8a7a5a', '#ffd88a'] },
  { k: 'school', at: [9, 38.4], cols: ['#2a2a30', '#e0d8c8', '#4a4a50', '#ffd88a'] },
  { k: 'chap', at: [29.5, 6], cols: ['#18181c', '#e8e4d8', '#2a2a2e', '#ffd88a'] },
  { k: 'smith', at: [-6, 34], cols: ['#3a2a20', '#a89880', '#2a2420', '#ffd88a'] },
];
const C13_MAYOR = ['#3a2e3e', '#e0d8c8', '#b08a3c', '#ffd88a'];
const c13Cols = k => k === 'mayor' ? C13_MAYOR : (C13P.find(p => p.k === k) || {}).cols || null;
// how many to find: five and one for each of you, to all eight
const c13Count = () => Math.min(C13P.length, 5 + c9N());
// who came through the part before (a checkpoint starts with as many as there'd have been)
const c13Saved = () => C13.saved && C13.saved.length ? C13.saved.slice() : C13P.slice(0, c13Count()).map(p => p.k);
const C13_HP = 7;

// =====================================================================================================================
// Part I: Fish Street
// =====================================================================================================================
// the flood's front: where it starts, how fast it comes (a second); its depth: from, a second, to
const C13A = { FRONT: [-44, 0.2], MAX: [0.35, 0.0055, 1.45], CAP: [5, 2], GAP: [2.6, 1.2], AMMO: [1.6, -14.2] };
const C13A_PH = ['go', 'won'];
cpStage('m13flood', {
  n: 'Fish Street', mend: true,
  map: c13Map([0, -49], 0.45),
  lay(H, K) { c9AmmoLay(K, C13A.AMMO[0], C13A.AMMO[1], 0, 0.2); },
  enter() {
    c13Ready(4);
    const S = RAID.st;
    Object.assign(S, { ph: 'go', t: 0, sp: 6, wsp: 9, lost: 0, safe: 0, said: {}, npc: [], rushHd: 0 });
    C13F.front = C13A.FRONT[0]; C13F.max = C13A.MAX[0];
    if (ZM.net !== 'client') {
      C13.saved = null;
      S.npc = C13P.slice(0, c13Count()).map(p => c9NpcNew(p.k, p.at[0], p.at[1], 0, { cols: p.cols, hp: C13_HP, max: C13_HP, wait: 1, pace: 3.3, h: Math.random() * 6 }));
      S.npc.push(c9NpcNew('mayor', 0, -11.4, 0, { cols: C13_MAYOR, hp: 1, max: 0, safe: 1, h: Math.PI, lan: true }));
      cpObjective('Bring the townsfolk to the town hall');
    }
  },
  tick(dt) { c13aTick(dt); },
  me(dt) {
    c9AmmoTick(dt); if (ZM.net === 'client') c9NpcEase(RAID.st.npc || [], dt); c13WadeSfx();
    // (every screen, off the host's front) the sea pouring into the Square
    const S = RAID.st; if (S.ph === 'go' && C13F.front > -16 && !S.rushHd) { S.rushHd = 1; try { sfxPlay('floodrush', { vol: 0.8 }); } catch (e) {} }
  },
  speedK() { return c13Wade(); },
  players(P) { return c9NpcTargets(P, RAID.st.npc || []); },
  q(sid, k, a) { if (k === 'c13take') c13Take(sid, a | 0); },
  pack(o) { const S = RAID.st; o.a = [C13A_PH.indexOf(S.ph), Math.round(C13F.front * 100) / 100, Math.round(C13F.max * 1000) / 1000, S.safe, S.lost]; o.np = c9NpcPack(S.npc); },
  apply(o) { const S = RAID.st; if (Array.isArray(o.a)) { S.ph = C13A_PH[o.a[0] | 0] || S.ph; C13F.front = +o.a[1] || 0; C13F.max = +o.a[2] || 0; S.safe = o.a[3] | 0; S.lost = o.a[4] | 0; } S.npc = S.npc || []; c9NpcApply(S.npc, o.np, c13Cols); },
  consider(c) {
    c9AmmoConsider(c, [...c9L(...C13A.AMMO), 0]);
    (RAID.st.npc || []).forEach((n, i) => { if (!n.gone && !n.safe && n.f == null && n.k !== 'mayor') c({ k: 'c13folk', i }, n.x, n.y, n.jz, 2.2, false); });
  },
  prompt(o) { if (o.k === 'c13folk') { const n = RAID.st.npc[o.i], C = CP_CAST[n.k] || {}; return { text: `Take ${C.n || 'them'} with you`, free: true }; } return c9AmmoPrompt(o); },
  use(o) { if (o.k === 'c13folk') { raidAsk('c13take', o.i); return true; } return c9AmmoUse(o); },
  hud(phone, mono, fell) {
    const S = RAID.st, list = S.npc || [], tot = list.filter(n => n.k !== 'mayor').length;
    c9NpcHud(list, phone, mono, true);
    c9Meter(0, `At the town hall · ${S.safe || 0} of ${tot}`, (S.safe || 0) / Math.max(1, tot), '#d8e8c0', phone, mono);
    if (S.lost) c9Meter(1, `Taken by the sea · ${S.lost}`, S.lost / Math.max(1, tot), '#c07060', phone, mono);
    // (each screen its own marker: the hall, if anyone's following you; else the nearest still to find)
    const m = FPS.me, mine = list.some(n => n.f === m.id && !n.gone && !n.safe);
    if (mine) { const [x, y] = c9L(0, -10.5); c9Mark(x, y, 1.6, 'The town hall', phone, mono); }
    else { const w = list.filter(n => !n.gone && !n.safe && n.f == null && n.k !== 'mayor').sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0]; if (w) c9Mark(w.x, w.y, 2.2, (CP_CAST[w.k] || {}).n || '', phone, mono); }
    const d = c13Depth(m.x, m.y, m.jz || 0); if (d > 0.4) { ctx.textAlign = 'center'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(170,210,230,0.85)'; ctx.fillText(d > 1.3 ? 'CHEST-DEEP IN THE SEA' : d > 0.85 ? 'WAIST-DEEP' : 'WADING', cx, H * (phone ? 0.74 : 0.79)); }
  },
  b3(grp) { c9NpcFreeAll(); c13Water(grp); },
  f3(dt) { c9NpcDraw(RAID.st.npc || [], dt); c13WaterTick(); c9Sky(1, 0, 0); },
  music() { return 'cpm13flood'; },
  exit() { c9NpcFreeAll(); c9SkyBack(); C13W.m = null; C13W.u = null; },
});
// someone takes a townsperson with them: at the end of the line already following them, if there is one
function c13Take(sid, i) {
  const S = RAID.st, n = S.npc[i], P = c9Who(sid); if (!n || n.gone || n.safe || n.f != null || !P || P.down) return;
  if (Math.hypot(P.x - n.x, P.y - n.y) > 3) return;
  let lead = sid;
  for (;;) { const j = S.npc.findIndex(q => q !== n && q.f === lead && !q.gone && !q.safe); if (j < 0) break; lead = j; }
  n.f = lead; n.wait = 0; n.trail = [];
  const C = CP_CAST[n.k] || {};
  const lines = { chand: ['chand', 'The water is in my shop! Lead on, I am behind you.', 'cp_m13_07'], wife: ['wife', 'Fish boxes floating out the door. Mind your feet, it is cold.', 'cp_m13_08'], smoke: ['smoke', 'Thank God. I thought the fires going out was the end of me.', 'cp_m13_09'],
    cooper: ['cooper', 'I was stopping the door with casks. The casks went first.', 'cp_m13_10'], pascoe: ['pascoe', 'Forty years I have drunk here. The sea can have the bar, not me.', 'cp_m13_11'],
    school: ['school', 'I sent the children up the hill road at dusk with their mothers. Go on.', 'cp_m13_12'], chap: ['chap', 'I was praying for the boats. It seems they sent you.', 'cp_m13_13'], smith: ['smith', 'Fire is out. Never thought I would see the forge drowned.', 'cp_m13_14'] };
  const L = lines[n.k]; if (L) cpSay(...L);
}
function c13Relink(S, i) { const n = S.npc[i]; for (const q of S.npc) if (q.f === i) { q.f = n.f; } }
function c13aTick(dt) {
  const S = RAID.st, n = c9N();
  if (S.ph !== 'go' || typeof cpCineOn === 'function' && cpCineOn()) return;
  S.t += dt;
  C13F.front = C13A.FRONT[0] + C13A.FRONT[1] * S.t; C13F.max = Math.min(C13A.MAX[2], C13A.MAX[0] + C13A.MAX[1] * S.t);
  c9NpcTick(S.npc, dt); c13Cold(S.npc, dt);
  const folk = S.npc.filter(q => q.k !== 'mayor'), [hx0, hx1, hy0, hy1] = C13.HALL;
  folk.forEach(q => {
    const i = S.npc.indexOf(q);
    if (q.gone || q.safe) return;
    if (q.hp <= 0) {
      c13Relink(S, i); q.gone = 1; q.f = null; S.lost++;
      cpSay('mayor', ...[['The sea has taken one of them. God rest them.', 'cp_m13_15'], ['Another gone under. Keep the rest close.', 'cp_m13_16'], ['Too many in the water tonight. Too many.', 'cp_m13_17']][Math.min(2, S.lost - 1)]);
      return;
    }
    // into the Moot Hall: safe, and off to a bench
    const lx = q.x - FPSC.CX, ly = q.y - FPSC.CY;
    if (lx > hx0 + 0.5 && lx < hx1 - 0.5 && ly > hy0 + 0.5 && ly < hy1 - 0.5 && q.jz < 1) {
      c13Relink(S, i); q.safe = 1; q.f = null; q.trail = []; S.safe++;
      const seat = [[-2.5, -3.6], [6, -3.6], [-2.5, -1.1], [6, -1.1], [-2.5, 1.4], [6, 1.4], [-2.5, -6.1], [6, -6.1]][S.safe - 1] || [2, 3];
      q.to = [...c9L(...seat)]; q.face = Math.PI;
      if (S.safe === 1) cpSay('mayor', 'In, in. Sit on the benches, keep your feet up.', 'cp_m13_18');
    }
    if (q.cold && !S.said['cold' + i]) { S.said['cold' + i] = 1; cpSay('mayor', 'They are in the water too long! Get them out of it!', 'cp_m13_19'); }
  });
  const open = folk.filter(q => !q.gone && !q.safe).length;
  cpObjective(open ? `Bring the townsfolk to the town hall · ${S.safe} of ${folk.length}` : '');
  if (C13F.front > -16 && !S.said.sq) { S.said.sq = 1; cpSay('mayor', 'It is in the Square now. Hurry!', 'cp_m13_20'); }
  if (S.lost > folk.length / 2) { cpFail('The sea took most of Wrackhaven before it reached the hall'); return; }
  if (!open) { S.ph = 'won'; C13.saved = folk.filter(q => q.safe).map(q => q.k); cpSay('mayor', 'That is all who are coming. Shut the doors.', 'cp_m13_21'); cpDone(); return; }
  // the drowned: up out of the water near you, and in at the flooded houses' windows
  const alive = c9Alive(), cap = C13A.CAP[0] + C13A.CAP[1] * (n - 1) + (S.t > 120 ? 3 : 0);
  S.sp -= dt;
  if (S.sp <= 0 && alive < cap) { S.sp = (C13A.GAP[0] - Math.min(1, S.t / 240) * (C13A.GAP[0] - C13A.GAP[1])) * (0.7 + Math.random() * 0.6); if (!c13FromWater()) S.sp = 1; }
  S.wsp -= dt;
  if (S.wsp <= 0 && alive < cap) {
    S.wsp = 5 + Math.random() * 4;
    const W = ZM.windows.filter(w => !w.sea && !(w.z > 0) && c13Depth(w.x, w.y, 0) > 0.3); const w = W[(Math.random() * W.length) | 0];
    if (w) { w.boards = Math.min(w.boards, 2); c9Drown(w); }
  }
}

// =====================================================================================================================
// Part II: the Moot Hall
// =====================================================================================================================
// T: before the drowned are at the windows in earnest; the water: from, a second, to; the Keelback's strength
const C13B = { T: 55, LVL: [0.5, 0.004, 1.15], CAP: [5, 2], AMMO: [-6.8, 5.6], KEEL: 0.8,
  SEATS: [[-2.5, -3.6], [6, -3.6], [-2.5, -1.1], [6, -1.1], [-2.5, 1.4], [6, 1.4], [-2.5, -6.1], [6, -6.1]],
  UP: [[-9.55, -7.7, 0], [-9.55, 4.9, 4.4]], COUNCIL: [[-6.5, 3.2], [-4.5, 6], [-1.5, 3.2], [0.5, 6], [-7.5, 10.5], [-4, 11], [6, 4], [8, 9.5]] };
const C13B_PH = ['bar', 'keel', 'up', 'won'];
const c13bWins = () => ZM.windows.filter(w => !w.sea && (w.zone === 'moot' || w.zone === 'clerk'));
cpStage('m13hall', {
  n: 'The Moot Hall', mend: true,
  map: c13Map([2, 3.4], 0.3),
  lay(H, K) { c9AmmoLay(K, C13B.AMMO[0], C13B.AMMO[1], 0, 0); },
  enter() {
    c13Ready(5, [['square', 'moot'], ['square', 'clerk']]);
    const S = RAID.st;
    Object.assign(S, { ph: 'bar', T: C13B.T, t: 0, sp: 8, keel: 0, upT: 0, said: {}, npc: [] });
    C13F.front = 80; C13F.max = C13B.LVL[0];
    for (const w of c13bWins()) w.boards = 0;
    if (ZM.net !== 'client') {
      S.npc = c13Saved().map((k, i) => c9NpcNew(k, ...C13B.SEATS[i % C13B.SEATS.length], 0.3, { cols: c13Cols(k), hp: C13_HP, max: C13_HP, h: Math.PI, pace: 2.2 }));
      S.npc.push(c9NpcNew('mayor', 2, 5.4, 0.3, { cols: C13_MAYOR, hp: 1, max: 0, safe: 1, h: Math.PI }));
      cpObjective('Board up the town hall’s windows');
    }
  },
  tick(dt) { c13bTick(dt); },
  me(dt) { c9AmmoTick(dt); if (ZM.net === 'client') c9NpcEase(RAID.st.npc || [], dt); c13WadeSfx(); },
  speedK() { return c13Wade(); },
  players(P) { return c9NpcTargets(P, RAID.st.npc || []); },
  pack(o) { const S = RAID.st; o.a = [C13B_PH.indexOf(S.ph), Math.round(S.T * 10) / 10, Math.round(C13F.max * 1000) / 1000, c13Door('square', 'moot') && c13Door('square', 'moot').open ? 1 : 0]; o.np = c9NpcPack(S.npc); },
  apply(o) {
    const S = RAID.st;
    if (Array.isArray(o.a)) { S.ph = C13B_PH[o.a[0] | 0] || S.ph; S.T = +o.a[1] || 0; C13F.max = +o.a[2] || 0; C13F.front = 80; }
    S.npc = S.npc || []; c9NpcApply(S.npc, o.np, c13Cols);
  },
  consider(c) { c9AmmoConsider(c, [...c9L(...C13B.AMMO), 0]); },
  prompt(o) { if (o.k === 'door') return { text: 'Barred, and it stays barred' }; return c9AmmoPrompt(o); },
  use(o) { if (o.k === 'door') return true; return c9AmmoUse(o); },
  hud(phone, mono, fell) {
    const S = RAID.st, list = S.npc || [];
    c9NpcHud(list, phone, mono);
    if (S.ph === 'bar') {
      c9Meter(0, `Before they reach the windows · ${Math.ceil(S.T)} s`, S.T / C13B.T, '#e8b070', phone, mono, S.T < 12);
      const m = FPS.me, left = c13bWins().filter(w => w.boards < 6).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y));
      if (left[0]) c9Mark(left[0].x - left[0].nx * 0.9, left[0].y - left[0].ny * 0.9, 1.6, 'Board it up', phone, mono);
    }
    if (S.ph === 'up') { const [x, y] = c9L(-9.55, -6.8); c9Mark(x, y, 1.4, 'The stair', phone, mono); }
  },
  b3(grp) { c9NpcFreeAll(); c13Water(grp); },
  f3(dt) { c9NpcDraw(RAID.st.npc || [], dt); c13WaterTick(); c9Sky(1, 0, 0); },
  music() { const S = RAID.st; return S.ph === 'keel' ? 'cpm13keel' : 'cpm13hall'; },
  exit() { c9NpcFreeAll(); c9SkyBack(); C13W.m = null; C13W.u = null; },
});
function c13bTick(dt) {
  const S = RAID.st, n = c9N();
  if (S.ph === 'won' || typeof cpCineOn === 'function' && cpCineOn()) return;
  S.t += dt;
  C13F.front = 80; C13F.max = Math.min(C13B.LVL[2], C13B.LVL[0] + C13B.LVL[1] * S.t);
  c9NpcTick(S.npc, dt); c13Cold(S.npc, dt);
  const folk = S.npc.filter(q => q.k !== 'mayor');
  for (const q of folk) if (!q.gone && q.hp <= 0) { q.gone = 1; ZM.banner = { text: `${(CP_CAST[q.k] || {}).n || 'One of them'} is lost`, t: 2.6, col: '#c07060' }; c9dSay('lost' + S.npc.indexOf(q), 'mayor', 'They have dragged one into the water!', 'cp_m13_25'); }
  if (!folk.some(q => !q.gone)) { cpFail('Nobody of Wrackhaven was left alive in the hall'); return; }
  const alive = c9Alive(), cap = C13B.CAP[0] + C13B.CAP[1] * (n - 1);
  if (S.ph === 'bar') {
    S.T = Math.max(0, S.T - dt);
    const left = c13bWins().filter(w => w.boards < 6).length;
    cpObjective(`Board up the town hall’s windows · ${6 - left} of 6`);
    // (a few at the windows already; more as the time runs out)
    S.sp -= dt;
    if (S.sp <= 0 && alive < Math.round(cap * (S.T < 25 ? 1 : 0.5))) { S.sp = 3 + Math.random() * 2; const W = c13bWins(); c9Drown(W[(Math.random() * W.length) | 0]); }
    if (S.T < 20) c9dSay('bar20', 'mayor', 'They are in the Square, by the dozen. Nail faster!', 'cp_m13_23');
    if (!left || S.T <= 0) {
      cpSay('mayor', ...(left ? ['No more time. Stand ready.', 'cp_m13_24'] : ['Barred. Now we pray the door holds.', 'cp_m13_22']));
      S.ph = 'keel';
      cpCine('m13_keel', () => {
        const d = c13Door('square', 'moot'); if (d && !d.open) zmOpenDoor(d);
        const [x, y] = c9L(0, -11.2), K = c9Boss('crab', x, y, 0, { r: 10, k: C13B.KEEL, h: 0 }); S.keel = K.zn;
        ZM.banner = { text: 'The Keelback', t: 3.6, col: '#d89a70', sub: 'Step out of its lane; let it hit the walls' };
      });
    }
    return;
  }
  if (S.ph === 'keel') {
    const K = ZM.z.find(z => z.zn === S.keel);
    cpObjective(K && !K.dead ? 'Put down the Keelback · let it charge into the walls' : 'Clear the Moot Hall');
    S.sp -= dt;
    if (S.sp <= 0 && alive < cap) { S.sp = 2.5 + Math.random() * 2; if (Math.random() < 0.5) c13FromWater(); else { const W = c13bWins(); c9Drown(W[(Math.random() * W.length) | 0]); } }
    if (K && !K.dead && K.hp < K.max * 0.5) c9dSay('khalf', 'pascoe', 'Its shell is splitting. There is a whole ship in that thing.', 'cp_m13_26');
    if (K && !K.dead && K.act === 'reel') c9dSay('reel', 'mayor', 'It is on its back! Its belly, shoot its belly!', 'cp_m13_27');
    if (S.keel && (!K || K.dead)) {
      S.ph = 'up'; S.upT = 0;
      cpSay('mayor', 'Up the stair, all of you. Mind the old ones. The sea is coming in behind it.', 'cp_m13_28');
      folk.filter(q => !q.gone).forEach((q, i) => { q.route = [...C13B.UP.map(p => [...c9L(p[0], p[1]), p[2]]), [...c9L(...C13B.COUNCIL[i % C13B.COUNCIL.length]), C13.F1]]; q.to = null; q.delay = i * 1.6; q.face = Math.PI; if (q.delay > 0) { q.held = q.route; q.route = null; } });
      const M = S.npc.find(q => q.k === 'mayor'); if (M) { M.route = [...C13B.UP.map(p => [...c9L(p[0], p[1]), p[2]]), [...c9L(2, 10), C13.F1]]; M.delay = folk.length * 1.6; M.held = M.route; M.route = null; }
    }
    return;
  }
  if (S.ph === 'up') {
    S.upT += dt;
    // (each in turn: until their time, they wait where they are)
    for (const q of S.npc) if (q.held) { q.delay -= dt; if (!(q.delay > 0)) { q.route = q.held; q.held = null; } }
    const up = S.npc.filter(q => !q.gone && q.jz > C13.F1 - 0.3 && !(q.route && q.route.length) && !q.to).length, all = S.npc.filter(q => !q.gone).length;
    cpObjective(`Cover them up the stair · ${up} of ${all} up`);
    S.sp -= dt;
    if (S.sp <= 0 && alive < cap) { S.sp = 2.2 + Math.random() * 2; c13FromWater(); }
    if (up >= all && S.upT > 3) { S.ph = 'won'; cpObjective(''); C13.saved = folk.filter(q => !q.gone).map(q => q.k); cpDone(); }
  }
}

// =====================================================================================================================
// Part III: the Belfry
// =====================================================================================================================
// NIGHT: seconds to first light; the water's level (just under the first floor); the climbers; the bell: a peal is
// PULL seconds on the rope, and it swings SWING seconds before it can be pulled again; PEALS of them
const C13C = { NIGHT: 170, LVL: 3.7, CAP: [6, 2], GAP: [2.2, 1.0], PULL: 2.2, SWING: 3.6, PEALS: 3, AMMO: [-1.6, 11.2],
  FOLK: [[-6.5, 3.2], [-4.5, 6], [-1.5, 3.2], [0.5, 6], [-7.5, 10.5], [-4, 11], [6, 4], [8, 9.5]] };
const C13C_PH = ['hold', 'bell', 'won'];
cpStage('m13belfry', {
  n: 'The Belfry', mend: true,
  map: c13Map([4.2, 4.2], C13.F1),
  lay(H, K, Z) { c13Leads(H, K, Z); c9AmmoLay(K, C13C.AMMO[0], C13C.AMMO[1], C13.F2, 0.4); },
  enter() {
    c13Ready(7);
    const S = RAID.st;
    Object.assign(S, { ph: 'hold', night: 0, sp: 4, dsp: 12, rsp: 7, peal: 0, pull: 0, swing: 0, pullBy: {}, diver: 0, said: {}, npc: [], flash: 0 });
    C13F.front = 80; C13F.max = C13C.LVL;
    if (ZM.net !== 'client') {
      S.npc = c13Saved().map((k, i) => c9NpcNew(k, ...C13C.FOLK[i % C13C.FOLK.length], C13.F1, { cols: c13Cols(k), hp: C13_HP, max: C13_HP, h: Math.random() * 6, mend: 0.1 }));
      S.npc.push(c9NpcNew('mayor', 2, 10, C13.F1, { cols: C13_MAYOR, hp: 1, max: 0, safe: 1, h: Math.PI }));
      cpObjective('Hold the town hall until first light');
    }
  },
  tick(dt) { c13cTick(dt); },
  me(dt) {
    c9AmmoTick(dt); const S = RAID.st;
    if (ZM.net === 'client') c9NpcEase(S.npc || [], dt);
    // (on the bell's rope: holding Use, said to the host a few times a second)
    const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse;
    if (S.ph === 'bell' && hold && ZM.near && ZM.near.k === 'c13bell' && !zmIsDown()) { S.myPull = (S.myPull || 0) - dt; if (S.myPull <= 0) { S.myPull = 0.2; raidAsk('c13pull', 1); } }
    // (the bell, as it swings: a peal each time it's pulled through)
    if ((S.peal | 0) > (S.pealSeen | 0)) { S.pealSeen = S.peal; c13Bell(); }
    // (every screen, off the host's word) the rope's creak and the frame's groan while it's being pulled
    if (S.ph === 'bell' && !(S.swing > 0) && (S.pull || 0) > (S.pullWas || 0) + 0.001) try { sfxPlay('ropecreak', { vol: 0.7, gap: 1.4 }); } catch (e) {}
    S.pullWas = S.pull || 0; c13WadeSfx();
  },
  speedK() { return c13Wade(); },
  players(P) { return c9NpcTargets(P, RAID.st.npc || []); },
  q(sid, k, a) { if (k === 'c13pull') { RAID.st.pullBy[sid] = 0.35; } },
  pack(o) { const S = RAID.st; o.a = [C13C_PH.indexOf(S.ph), Math.round(S.night * 1000) / 1000, S.peal, Math.round(S.pull * 100) / 100, Math.round(S.swing * 10) / 10]; o.np = c9NpcPack(S.npc); },
  apply(o) {
    const S = RAID.st;
    if (Array.isArray(o.a)) { S.ph = C13C_PH[o.a[0] | 0] || S.ph; S.night = +o.a[1] || 0; S.peal = o.a[2] | 0; S.pull = +o.a[3] || 0; S.swing = +o.a[4] || 0; }
    S.npc = S.npc || []; c9NpcApply(S.npc, o.np, c13Cols);
  },
  consider(c) {
    c9AmmoConsider(c, [...c9L(...C13C.AMMO), C13.F2]);
    if (RAID.st.ph === 'bell') { const [x, y] = c9L(...C13.BELL); c({ k: 'c13bell' }, x, y - 1.2, C13.F2, 2.4, false); }
  },
  prompt(o) { if (o.k === 'c13bell') { const S = RAID.st; return S.swing > 0 ? { text: 'The bell is swinging…' } : { text: `Hold to pull the bell rope (peal ${(S.peal | 0) + 1} of ${C13C.PEALS})`, hold: true }; } return c9AmmoPrompt(o); },
  use(o) { if (o.k === 'c13bell') return true; return c9AmmoUse(o); },
  hud(phone, mono, fell) {
    const S = RAID.st, list = S.npc || [];
    c9NpcHud(list, phone, mono);
    const folk = list.filter(q => q.k !== 'mayor'), left = folk.filter(q => !q.gone).length;
    c9Meter(0, `Townsfolk alive · ${left} of ${folk.length}`, left / Math.max(1, folk.length), '#d8e8c0', phone, mono, left <= 1);
    if (S.ph === 'hold') c9Meter(1, `First light · ${raidClock(Math.max(0, (1 - (S.night || 0)) * C13C.NIGHT))}`, S.night || 0, '#e8b8a0', phone, mono);
    if (S.ph === 'bell') {
      c9Meter(1, `The bell · peal ${Math.min(C13C.PEALS, (S.peal | 0) + (S.swing > 0 ? 0 : 1))} of ${C13C.PEALS}`, S.swing > 0 ? 1 - S.swing / C13C.SWING : (S.pull || 0) / C13C.PULL, S.swing > 0 ? '#a8b8c8' : '#ffe2a0', phone, mono);
      const [x, y] = c9L(...C13.BELL); c9Mark(x, y, C13.F2 + 2.2, 'The bell', phone, mono);
    }
  },
  b3(grp) { c9NpcFreeAll(); c13Water(grp); },
  f3(dt) { const S = RAID.st; c9NpcDraw(S.npc || [], dt); c13WaterTick(); c9Sky(1, clamp(((S.night || 0) - 0.85) / 0.15, 0, 1) * 0.7 + (S.ph !== 'hold' ? 0.3 : 0), 0); },
  music() { const S = RAID.st; return S.ph === 'bell' ? 'cpm13bell' : S.ph === 'won' ? 'cpm13dawn' : 'cpm13belfry'; },
  exit() { c9NpcFreeAll(); c9SkyBack(); C13W.m = null; C13W.u = null; },
});
// a peal of the bell (every screen): a great bronze stroke, its hum, and the overtones dying away
function c13Bell() {
  try {
    if (soundOff() || sfxPlay('bellpeal', { vol: 1, vary: 0.03 })) return;
    for (const [f, v, d] of [[110, 0.22, 4.5], [220, 0.16, 3.8], [264, 0.1, 3.2], [330, 0.08, 2.6], [440, 0.05, 2.0], [587, 0.03, 1.6]]) tone(f, 'sine', 0.004, v, d);
    noise('bandpass', 1400, 3, 0.002, 0.18, 0.12);
  } catch (e) {}
}
// (hosting or alone) a peal drives the drowned back: those up on the leads and in the Belfry near it fall away
function c13Toll() { const [bx, by] = c9L(...C13.BELL); for (const z of ZM.z) if (!z.dead && !z.boss && (z.jz || 0) > C13.F1 + 1 && Math.hypot(z.x - bx, z.y - by) < 8) zmKill(z, false, '', 'flash'); }
function c13cTick(dt) {
  const S = RAID.st, n = c9N();
  if (S.ph === 'won' || typeof cpCineOn === 'function' && cpCineOn()) return;
  c9NpcTick(S.npc, dt);
  const folk = S.npc.filter(q => q.k !== 'mayor');
  for (const q of folk) if (!q.gone && q.hp <= 0) { q.gone = 1; ZM.banner = { text: `${(CP_CAST[q.k] || {}).n || 'One of them'} is lost`, t: 2.6, col: '#c07060' }; cpSay('mayor', 'They have taken one of us out of the window!', 'cp_m13_31'); }
  if (!folk.some(q => !q.gone)) { cpFail('The drowned took the last of Wrackhaven before the dawn'); return; }
  const alive = c9Alive(), cap = C13C.CAP[0] + C13C.CAP[1] * (n - 1) + (S.ph === 'bell' ? 4 : 0);
  // the climbers: up the walls to the first floor's windows and the Belfry's, over the parapet onto the leads, and up
  // the stair out of the drowned hall
  S.sp -= dt;
  if (S.sp <= 0 && alive < cap) {
    S.sp = (C13C.GAP[0] - (C13C.GAP[0] - C13C.GAP[1]) * S.night) * (0.7 + Math.random() * 0.6) / (1 + 0.2 * (n - 1));
    const u = Math.random();
    if (u < 0.45) { const W = ZM.windows.filter(w => !w.sea && (w.z || 0) > 3); const w = W[(Math.random() * W.length) | 0]; if (w) c9Drown(w, { kind: Math.random() < 0.5 ? 'jog' : 'walk' }); }
    else if (u < 0.8) { const side = (Math.random() * 4) | 0, t = Math.random(), x = side < 2 ? -10.4 + 20.8 * t : side === 2 ? -10.5 : 10.5, y = side === 0 ? -8.5 : side === 1 ? 12.5 : -8.5 + 21 * t; const [wx, wy] = c9L(x, y); if (!(Math.abs(x) < 4.2 && y > 6.5)) c9Rise(wx, wy, C13.F2, { rise: 1.5, kind: 'jog' }); }
    else { const [wx, wy] = c9L(-9.55, -6.2 + Math.random()); c9Rise(wx, wy, 0.4, { rise: 1.2, kind: 'jog' }); }
  }
  if (S.ph === 'hold') {
    S.night = Math.min(1, S.night + dt / C13C.NIGHT);
    cpObjective('Hold the town hall until first light · keep the townsfolk alive');
    if (S.night > 0.25) c9dSay('n1', 'pascoe', 'They are coming up the walls like crabs up a pier.', 'cp_m13_32');
    if (S.night > 0.55) c9dSay('n2', 'mayor', 'The leads! They are over the parapet onto the roof!', 'cp_m13_33');
    if (S.night > 0.8) c9dSay('n3', 'school', 'The sky over the harbour. Is that grey? I think that is grey.', 'cp_m13_34');
    if (S.night >= 1) {
      S.ph = 'bell'; S.peal = 0; S.pull = 0; S.swing = 0;
      cpCine('m13_dawn', () => { const [x, y] = c9L(-8, 10.5), D = c9Boss('diver', x, y, C13.F2, { r: 10, k: 0.65, rise: 1.6, h: Math.PI / 2 }); S.diver = D.zn; ZM.banner = { text: 'The Diver', t: 3.6, col: '#9ad8c0', sub: 'The bell has called him up onto the leads' }; });
    }
    return;
  }
  if (S.ph === 'bell') {
    // the rope: pulled while anyone holds it (the host's own hands, or a joined player's word in the last moment)
    const me = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, mine = me && ZM.near && ZM.near.k === 'c13bell' && !zmIsDown();
    let on = !!mine; for (const sid of Object.keys(S.pullBy)) { S.pullBy[sid] -= dt; if (S.pullBy[sid] > 0) on = true; else delete S.pullBy[sid]; }
    if (S.swing > 0) S.swing = Math.max(0, S.swing - dt);
    else if (on) { S.pull += dt; if (S.pull >= C13C.PULL) { S.pull = 0; S.peal++; S.swing = C13C.SWING; c13Toll(); if (ZM.net !== 'client' && (S.pealSeen | 0) < S.peal) { S.pealSeen = S.peal; c13Bell(); } if (S.peal === 1) cpSay('mayor', 'Again! They have to hear it across the harbour!', 'cp_m13_36'); if (S.peal === 2) cpSay('pascoe', 'One more. The Light’s boats will be watching for it.', 'cp_m13_37'); } }
    else S.pull = Math.max(0, S.pull - dt * 0.5);
    const D = S.diver && ZM.z.find(z => z.zn === S.diver);
    cpObjective(S.peal < C13C.PEALS ? `Ring the bell for the boats · ${S.peal} of ${C13C.PEALS}${D && !D.dead ? ' · the Diver is on the leads' : ''}` : D && !D.dead ? 'Put down the Diver on the leads' : '');
    if (S.peal >= C13C.PEALS && (!D || D.dead) && S.swing <= 0.5) {
      S.ph = 'won'; cpObjective(''); cpSay('mayor', 'Boats. Boats on the water, coming from the Light.', 'cp_m13_38');
      for (const z of ZM.z) if (!z.dead && !z.boss) { z.dead = 1; z.gone = true; z.deadT = 99; }
      cpDone();
    }
  }
}
