'use strict';
// The Chronicle of the Light, mission 11 (Fog Run): its cinematics (src/cp.js cpMission's intro, cut, after and outro,
// and the two that Lantern Rock's fight sets off, played with src/cpcine.js). They're flown through each stage's own
// world: the cutter's deck at the foot of the Light (src/cpm11.js), Chapel Islet as that stage lays it out, and
// Lantern Rock (src/cpm11x.js), with actors of their own: the Mate, and the Fog-Keeper himself (src/frboss.js's model,
// posed by hand).
//  - m11_intro: the title; autumn 1889 and the outer rocks gone dark; the cutter at the foot of the Light, Holm's word.
//  - m11_chapel (as II begins): the islet from the water, not a candle on it; the boat's lamp.
//  - m11_candles (after II): the candles lit on the altar; his voice out of the haar; the Mate names Lantern Rock.
//  - m11_rock (as III begins): the rock from the landing, its braziers cold; him at the door of his dead light.
//  - m11_climb (his strength at C11R.P2): up his tower, every brazier going out; the old Fire Step under the crags.
//  - m11_oldfire (the old fire lit): it catches; he knows it; he comes down off his tower for it.
//  - m11_outro: he goes down by the old fire; the dead light comes on; the haar goes out; the log.

// ---------- actors ----------
// (the Mate, in oilskins)
function c11yMate(C) { const F = cpkNpc(['#2a3440', '#c8b898', '#3a3a34', '#ffd88a'], 'oc_whaler'); if (F) C.mate = F; return F; }
function c11yMatePose(C, x, y, h, o) { if (!C.mate) return; cpkNpcPose(C.mate, Object.assign({ x: FPSC.CX + x, y: FPSC.CY + y, h, spd: 0, noGun: true, lan: true, dt: Math.min(0.05, FPS.dtLast || 0.016) }, o || {})); }
// the Fog-Keeper (his own model: kept off the cinematic's group's clean-up, as it shares its geometry with the real one)
function c11yFk(grp, C) {
  try { const M = fkBuild(); grp.add(M.root); C.fk = M; C.fz = { x: 0, y: 0, jz: 0, h: 0, act: null, at: 0, dead: 0, deadT: 0, walk: false, seed: 11, ph: 0, zn: -1, bt: 'cpfogk', hitT: 0, ward: 0 }; } catch (e) { C.fk = null; }
  C11RL.hide = true;
}
function c11yFkPose(C, x, y, jz, h, o) {
  const M = C.fk; if (!M) return; const z = C.fz;
  Object.assign(z, { x: FPSC.CX + x, y: FPSC.CY + y, jz, h, act: null, at: 0, walk: false }, o || {});
  try { fkPose(z, M, Math.min(0.05, FPS.dtLast || 0.016)); M.root.visible = !(o && o.hide); } catch (e) {}
}
function c11yFree(C) { if (C.fk && C.fk.root.parent) C.fk.root.parent.remove(C.fk.root); C.fk = null; if (C.mate) cpkNpcFree(C.mate); C.mate = null; C11RL.hide = false; CPK3.over = null; }
// (a shot placed by Chapel Islet's own layout: dyn(Z) gives its camera, read as the shot begins)
function c11yDyn(def) { const s = Object.assign({}, def), e0 = def.enter; s.enter = C => { const Z = typeof c11cZ === 'function' && c11cZ(); if (Z && def.dyn) Object.assign(s, def.dyn(Z)); if (e0) e0(C); }; return s; }
const c11yOut = (p, k) => { const l = Math.hypot(p[0], p[1]) || 1; return [p[0] / l * k, p[1] / l * k]; };

// ---------- the intro (on the cutter's deck) ----------
cpCineDef('m11_intro', {
  music: 'cpm11sail', fogFar: 90,
  b3(grp, C) { c11yMate(C); },
  exit(C) { c11yFree(C); },
  shots: [
    cpTitleShot(CP_BY.m11),
    { d: 5.2, card: { eye: 'Autumn 1889', t: 'The outer rocks', sub: 'One by one, the lights of the outer rocks have gone dark in the haar.' },
      lines: [[0.5, 'log', 'Autumn, 1889. One by one the lights of the outer rocks have gone dark.', 'cp_m11_01']] },
    { d: 5.4, cam: [3.2, -13, 4.4], to: [2.2, -7, 3.8], look: [0, 10, 3], lookTo: [0, 14, 2.6], fade: [1, 0],
      lines: [[0.4, 'holm', 'Something’s putting them out. Take the cutter and light them again.', 'cp_m11_02']],
      f(t, k, C) { c11yMatePose(C, -1.2, 8.5, Math.PI * 0.1); } },
    { d: 5, cam: [0.6, 7.5, 3.2], to: [0.4, 10, 3.4], look: [-6, 60, 2.6], lookTo: [-14, 80, 3],
      lines: [[0.4, 'holm', 'And if you find what’s doing it, bring the light to it.', 'cp_m11_03']],
      f(t, k, C) { c11yMatePose(C, -1.4, 10, bearingOf(-0.2, 1)); } },
  ],
});

// ---------- Chapel Islet, from the water (as II begins) ----------
cpCineDef('m11_chapel', {
  music: 'cpm11chapel', fogFar: 70,
  b3(grp, C) { c11yMate(C); },
  exit(C) { c11yFree(C); },
  shots: [
    c11yDyn({ d: 5.4, cam: [0, -60, 6], to: [0, -50, 4], look: [0, 0, 2], fade: [0.8, 0],
      dyn: Z => { const o = c11yOut(Z.land, 18), o2 = c11yOut(Z.land, 10); return { cam: [Z.land[0] + o[0], Z.land[1] + o[1], 6], to: [Z.land[0] + o2[0], Z.land[1] + o2[1], 3.6], look: [Z.alt[0], Z.alt[1], 3], lookTo: [Z.alt[0], Z.alt[1], 2] }; },
      lines: [[0.5, 'mate', 'Chapel Islet. Not a candle burning on it.', 'cp_m11_11']],
      f(t, k, C) { const Z = c11cZ(); if (Z) c11yMatePose(C, Z.land[0], Z.land[1], bearingOf(Z.alt[0] - Z.land[0], Z.alt[1] - Z.land[1])); } }),
    c11yDyn({ d: 4.6, cam: [0, -40, 2], look: [0, -38, 1.5],
      dyn: Z => { const s = Z.src, o = c11yOut(s, 3.2); return { cam: [s[0] + o[0] + 1.6, s[1] + o[1], 2.2], to: [s[0] + o[0] + 0.8, s[1] + o[1] - 0.6, 2.0], look: [s[0], s[1], 1.8] }; },
      lines: [[0.3, 'mate', 'A taper from the boat’s lamp. We’ll carry a light up to the altar, and mind the wind.', 'cp_m11_12']],
      f(t, k, C) { const Z = c11cZ(); if (Z) c11yMatePose(C, Z.src[0] + 1.4, Z.src[1] - 0.8, bearingOf(-1.4, 0.8)); } }),
  ],
});

// ---------- the candles lit (after II) ----------
cpCineDef('m11_candles', {
  music: 'cpm11chapel', fogFar: 80,
  b3(grp, C) { c11yMate(C); C.wall = cp1xFogWall(grp, 30, 120); },
  exit(C) { c11yFree(C); },
  shots: [
    c11yDyn({ d: 5, cam: [0, 0, 2], look: [0, 4, 1.4],
      dyn: Z => { const a = Z.a, c = Math.cos(a), s = Math.sin(a), at = (u, v, h) => [Z.alt[0] + u * c - v * s, Z.alt[1] + u * s + v * c, h]; return { cam: at(-4.5, 1.6, 2.2), to: at(-3, 0.8, 1.8), look: [Z.altar[0], Z.altar[1], 1.3] }; },
      lines: [[0.4, 'mate', 'There. Every light on the outer rocks burns again, but one.', 'cp_m11_18']],
      f(t, k, C) { const Z = c11cZ(); if (Z) c11yMatePose(C, Z.alt[0], Z.alt[1], bearingOf(Z.altar[0] - Z.alt[0], Z.altar[1] - Z.alt[1])); } }),
    c11yDyn({ d: 5.4, cam: [0, 0, 6], look: [0, 60, 3],
      dyn: Z => { const o = c11yOut(Z.land, 40); return { cam: [Z.land[0] * 0.5, Z.land[1] * 0.5, 5], to: [Z.land[0] * 0.7, Z.land[1] * 0.7, 4], look: [o[0] * 2, o[1] * 2, 5] }; },
      lines: [[0.6, 'fog', 'You light them. I put them out. So it has always been.', 'cp_m11_19']], sfx: [[0.3, 'foghorn', 0.5]],
      f(t, k, C) { const Z = c11cZ(); if (Z) { const o = c11yOut(Z.land, 70); cp1xFogPose(C.wall, o[0], o[1], Math.atan2(o[0], o[1]) + Math.PI / 2, Math.min(1, t / 1.5), t); } } }),
    c11yDyn({ d: 4.4, cam: [0, -38, 2], look: [0, -60, 2],
      dyn: Z => { const o = c11yOut(Z.land, 4); return { cam: [Z.land[0] - o[0] * 2 + 1.5, Z.land[1] - o[1] * 2, 2], look: [Z.land[0] + o[0] * 10, Z.land[1] + o[1] * 10, 2.2] }; },
      lines: [[0.3, 'mate', 'Lantern Rock. That’s where it comes from. Back to the boat.', 'cp_m11_20']],
      f(t, k, C) { const Z = c11cZ(); if (Z) { const o = c11yOut(Z.land, 1); c11yMatePose(C, Z.land[0] - o[0] * 3, Z.land[1] - o[1] * 3, bearingOf(o[0], o[1])); } } }),
  ],
});

// ---------- Lantern Rock (as III begins) ----------
cpCineDef('m11_rock', {
  music: 'cpm11boss', fogFar: 75, amb: 0.3,
  b3(grp, C) { c11yFk(grp, C); },
  exit(C) { c11yFree(C); },
  shots: [
    { d: 5.6, cam: [-12, -64, 6], to: [-5, -42, 3.6], look: [0, 3, 6], lookTo: [0, 4, 5], fade: [1, 0],
      lines: [[0.5, 'mate', 'Lantern Rock. Her braziers are cold.', 'cp_m11_21']], sfx: [[0.4, 'creak', 0.4]],
      f(t, k, C) { c11yFkPose(C, 0, 8.6, -6, 0, { hide: true }); } },
    { d: 5.4, cam: [7, 17, 2.6], to: [5.4, 15.6, 2.2], look: [0, 8.6, 3.6], lookTo: [0, 8.6, 4.4], shake: 0.15,
      lines: [[1.4, 'fog', 'Six hundred years I have kept this rock. Go home.', 'cp_m11_22']], sfx: [[0.2, 'bossdiver', 0.6]],
      f(t, k, C) { const e = zbE(Math.min(1, t / 3)); c11yFkPose(C, 0, 8.6, -4.6 * (1 - e), bearingOf(5.4, 7), { act: 'rise', at: t * 1.25 }); if (Math.random() < 0.4 && e < 1) fpsPuff(FPSC.CX + (Math.random() - 0.5) * 3, FPSC.CY + 8.6 + (Math.random() - 0.5) * 3, FPSC.GROUND + Math.random() * 2, '160,170,180', 2); } },
  ],
});

// ---------- up his tower (his strength at C11R.P2) ----------
cpCineDef('m11_climb', {
  music: 'cpm11boss2', fogFar: 60, amb: 0.26,
  b3(grp, C) { c11yFk(grp, C); const M = c11rBoss(); C.from = M ? [M.x - FPSC.CX, M.y - FPSC.CY] : [0, 8.6]; },
  exit(C) { c11yFree(C); },
  shots: [
    { d: 4.6, cam: [10, -4, 3], to: [9, -2, 4], look: [0, 3, 4], lookTo: [0, 3, 9],
      lines: [[0.4, 'fog', 'Enough.', 'cp_m11_27']], sfx: [[0.3, 'creak', 0.9]],
      f(t, k, C) {
        // (to the tower's foot, on the side he came from, and up it)
        const [tx, ty] = CPA.TOWER, a = Math.atan2(C.from[1] - ty, C.from[0] - tx), r = FKC.TR + 0.8, ex = tx + Math.cos(a) * r, ey = ty + Math.sin(a) * r, k1 = zbE(Math.min(1, t / 1.4)), k2 = zbE(clamp((t - 1.4) / 3.2, 0, 1));
        c11yFkPose(C, zbL(C.from[0], ex, k1), zbL(C.from[1], ey, k1), C11R.TOP * k2, bearingOf(tx - ex, ty - ey), { act: 'climb', at: 2 + k2 * 3.3, walk: k1 < 1 });
      } },
    { d: 4.8, cam: [-7, -9, 1.4], to: [-6, -8, 1.8], look: [0, 3, 10], lookTo: [0, 3, 11],
      lines: [[0.5, 'mate', 'He’s up his tower! The braziers are going out, all of them!', 'cp_m11_28']], sfx: [[0.6, 'foghorn', 0.6]],
      f(t, k, C) { const [x, y] = c11rTopAt(); c11yFkPose(C, x - FPSC.CX, y - FPSC.CY, C11R.TOP, Math.PI, { act: 'climb', at: 5.4 + Math.min(2.3, t) }); for (const [bx, by] of CPA.CAIRN) if (Math.random() < 0.3) fpsPuff(FPSC.CX + bx, FPSC.CY + by, FPSC.GROUND + 2.2, '150,160,170', 2); } },
    { d: 5.4, cam: [5, 10, 3.6], to: [3, 14, 2.8], look: [0, 22, 1.2], lookTo: [0, 23, 1],
      lines: [[0.3, 'mate', 'There, under the crags: an old hearth. The fire-keepers kept the first fire on this coast there.', 'cp_m11_29']],
      f(t, k, C) { const [x, y] = c11rTopAt(); c11yFkPose(C, x - FPSC.CX, y - FPSC.CY, C11R.TOP, 0); } },
  ],
});

// ---------- the old fire lit ----------
cpCineDef('m11_oldfire', {
  music: 'cpm11fire', fogFar: 70, amb: 0.3,
  b3(grp, C) { c11yFk(grp, C); },
  exit(C) { c11yFree(C); },
  shots: [
    { d: 4.4, cam: [2.8, 17.6, 1.1], to: [3.6, 16.8, 1.9], look: [0, 22, 1.2], lookTo: [0, 22, 2.4],
      lines: [[1.0, 'fog', 'That fire. I knew that fire.', 'cp_m11_32']],
      enter() { CPK3.over = 0.15; }, f(t, k, C) { CPK3.over = 0.15 + 0.85 * k; const [x, y] = c11rTopAt(); c11yFkPose(C, x - FPSC.CX, y - FPSC.CY, C11R.TOP, 0); }, exit() { CPK3.over = null; } },
    { d: 5.2, cam: [-3, 25, 1.6], to: [-2, 24, 2.4], look: [0, 3, 11], lookTo: [0, 3, 12],
      lines: [[0.4, 'log', 'The fire on the Fire Step, lit again for the first time since 1841.', 'cp_m11_33']],
      f(t, k, C) { const [x, y] = c11rTopAt(); c11yFkPose(C, x - FPSC.CX, y - FPSC.CY, C11R.TOP, Math.sin(t * 0.6) * 0.15, { act: 'breathe', at: Math.min(1.6, t * 0.5) }); } },
    { d: 4.4, cam: [9, 15, 2.4], to: [8, 14, 2.8], look: [0, 6, 6], lookTo: [0, 9.6, 2.5], shake: 0.25,
      lines: [[0.3, 'fog', 'Then I will put it out with my own hands.', 'cp_m11_34']], sfx: [[2.0, 'thunder', 0.5]],
      f(t, k, C) {
        const [x, y] = c11rTopAt(), lx = x - FPSC.CX, ly = y - FPSC.CY, k2 = clamp((t - 1.2) / 1.0, 0, 1);
        c11yFkPose(C, zbL(lx, C11R.DOWN[0], k2), zbL(ly, C11R.DOWN[1], k2), C11R.TOP * (1 - k2 * k2) + Math.sin(k2 * Math.PI) * 1.4, 0, { act: k2 > 0 && k2 < 1 ? 'climb' : null, at: 7.8 + k2 });
        if (k2 >= 1 && Math.random() < 0.5) fpsPuff(FPSC.CX + C11R.DOWN[0] + (Math.random() - 0.5) * 3, FPSC.CY + C11R.DOWN[1] + (Math.random() - 0.5) * 3, FPSC.GROUND + 0.3, '160,170,180', 2);
      } },
  ],
});

// ---------- the outro ----------
cpCineDef('m11_outro', {
  music: 'cphope', fogFar: 90, amb: 0.36,
  b3(grp, C) { c11yFk(grp, C); c11yMate(C); const M = c11rBoss(); C.at = M ? [M.x - FPSC.CX, M.y - FPSC.CY, M.h] : [0, 14, 0]; },
  exit(C) { c11yFree(C); },
  shots: [
    { d: 5.4, cam: [4, 15, 1.8], to: [3.4, 16.2, 1.6], look: [0, 16, 2.4], lookTo: [0, 18, 1.4],
      lines: [[1.2, 'fog', 'Kept.', 'cp_m11_38']],
      enter(C) { const [x, y] = C.at; const o = c11yOut([x - CPA.FIRE[0], y - CPA.FIRE[1]], 6); C.kn = [CPA.FIRE[0] + o[0], CPA.FIRE[1] + o[1]]; this.look = [C.kn[0], C.kn[1], 2.6]; this.lookTo = [C.kn[0], C.kn[1], 1]; this.cam = [C.kn[0] + 8.5, C.kn[1] - 6, 3.2]; this.to = [C.kn[0] + 7, C.kn[1] - 4.6, 2.4]; },
      f(t, k, C) { const p = C.kn || [0, 16]; c11yFkPose(C, p[0], p[1], 0, bearingOf(CPA.FIRE[0] - p[0], CPA.FIRE[1] - p[1]), { dead: 1, deadT: Math.min(3.3, t * 0.75) }); c11yMatePose(C, 0, 0, 0, { hide: true }); if (C.mate && C.mate.root) C.mate.root.visible = false; } },
    { d: 6, cam: [-5, -18, 2], to: [-3, -14, 2.4], look: [0, 3, 11], lookTo: [0, 3, 12], fogFar: 200,
      lines: [[0.6, 'mate', 'The light on his tower. Look. It’s lit.', 'cp_m11_39']],
      f(t, k, C) { if (C.fk) C.fk.root.visible = false; if (C.mate && C.mate.root) C.mate.root.visible = true; c11yMatePose(C, -1.5, -9, bearingOf(1.5, 12)); } },
    { d: 7.5, cam: [-60, -80, 22], to: [-48, -64, 16], look: [0, 3, 8], fogFar: 420, amb: 0.45,
      lines: [[0.5, 'log', 'Autumn, 1889. The lights of the outer rocks burn again, and the haar goes out with the tide.', 'cp_m11_40'], [4.6, 'holm', 'Every light, and his own besides. Bring her home.', 'cp_m11_41']],
      f(t, k, C) { if (C.fk) C.fk.root.visible = false; } },
    { d: 3.2, card: { eye: 'Mission complete', t: 'Fog Run', sub: 'Autumn 1889 · the outer rocks' } },
  ],
});
