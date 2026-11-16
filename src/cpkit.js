'use strict';
// The Chronicle of the Light: tools shared by the missions (src/cpm01.js to src/cpm14.js).
//  - cpWaypoint(x, y, label, h) (hosting or alone): a marker on everyone's screen at (x, y) about the island's middle
//    (h metres up; label under it, with the distance), drawn over the world and held at the screen's edge when it's
//    behind you; cpWaypoint(null) clears it. It goes in the host's word (src/cp.js cpw).
//  - cpTitleShot(M, d): a cinematic's opening card for mission M: the act, the date, the name, the place.
//  - cpkNpc(cols, outfit): a person in the period's clothes (src/fpsbody.js's figure: cols [coat, shirt, trim,
//    lantern], outfit an outfit id or ''), standing in the scene; cpkNpcPose(F, { x, y, h, spd, p, lan, dt, cr })
//    each frame (x, y in the world: FPSC.CX + ..., FPSC.CY + ...); cpkNpcFree(F). In a cinematic, build them in its
//    b3 and free them in its exit.
//  - cpkNear(x, y, r): is anyone (you, or hosting, anyone else standing) within r of (x, y), world coordinates.
//  - cpkW(x, y): about the island's middle, into the world: [FPSC.CX + x, FPSC.CY + y].
//  - The placeholder stage 'cp_wip' (a mission still being written): walk to the light and it's done.

// ---------- the waypoint ----------
function cpWaypoint(x, y, label, h) { if (!CP.on || ZM.net === 'client') return; CP.wp = x == null ? null : [+x || 0, +y || 0, +h || 1.2, String(label || '')]; }
function cpWpPack(z) { z.cpwp = CP.wp || null; }
function cpWpApply(hz) { const w = hz.cpwp; CP.wp = Array.isArray(w) ? [+w[0] || 0, +w[1] || 0, +w[2] || 1.2, znClean(w[3], 40)] : null; }
// (src/cp.js cpHud) the marker
function cpWpHud(phone, mono) {
  const w = CP.wp; if (!w || ZM.over) return;
  const X = FPSC.CX + w[0], Y = FPSC.CY + w[1], Z = FPSC.GROUND + w[2], m = FPS.me;
  const c = cam(X, Y, Z), d = Math.hypot(X - m.x, Y - m.y);
  let px, py, edge = false;
  if (c.f > 0.3) { const p = proj(c); px = p.x; py = p.y; } else { px = c.r >= 0 ? W - 30 : 30; py = H * 0.5; edge = true; }
  const mg = 30; if (px < mg || px > W - mg || py < mg + 40 || py > H - mg - 60) edge = true;
  px = clamp(px, mg, W - mg); py = clamp(py, mg + 40, H - mg - 60);
  const t = g.t, s = (phone ? 7 : 9) * (1 + 0.12 * Math.sin(t * 4));
  ctx.save(); ctx.translate(px, py);
  ctx.fillStyle = 'rgba(255,216,138,0.9)'; ctx.strokeStyle = 'rgba(8,10,14,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(255,236,190,0.95)';
  ctx.fillText((w[3] ? w[3].toUpperCase() + ' · ' : '') + Math.round(d) + ' M' + (edge ? (c.r >= 0 ? ' ›' : ' ‹') : ''), 0, s + 4);
  ctx.restore();
}

// ---------- the opening card ----------
function cpTitleShot(M, d) {
  const A = CP_ACTS[M.act] || {}, n = cpIndex(M.id) + 1;
  return { d: d || 4.5, card: { eye: `Act ${raidNumeral(M.act)} · ${A.n || ''} · Mission ${n}`, t: M.n, sub: [M.when, M.where].filter(Boolean).join(' · ') } };
}

// ---------- people ----------
function cpkNpc(cols, outfit) { if (typeof fbFigure !== 'function' || typeof GL3D === 'undefined' || !GL3D.scene) return null; try { return fbFigure(cols || ['#3a2a1e', '#d8d0bc', '#7a5a3a', '#ffd88a'], outfit || ''); } catch (e) { console.warn('cpkNpc', e); return null; } }
function cpkNpcPose(F, o) {
  if (!F) return;
  const dt = o.dt == null ? Math.min(0.05, FPS.dtLast || 0.016) : o.dt;
  F.ph = (F.ph || 0) + dt * (o.spd || 0) * 8 / FPSC.SPEED;
  try { fbPose(F, { dt, x: o.x, y: o.y, jz: o.jz || 0, vz: 0, h: o.h || 0, p: o.p || 0, spd: o.spd || 0, ph: F.ph, cr: o.cr || 0, id: o.id || 'pepperbox', plain: true, pap: 0, rec: 0, draw: 0, rl: 0, slash: -1, lan: o.lan !== false, t: g.t, see: o.see == null ? 1 : o.see, op: o.op == null ? 1 : o.op, noGun: o.noGun }); } catch (e) {}
  if (o.noGun && F.wpn) for (const k in F.wpn) if (F.wpn[k] && F.wpn[k].visible != null) F.wpn[k].visible = false;
}
function cpkNpcFree(F) { if (F && typeof fbDispose === 'function') try { fbDispose(F); } catch (e) {} }

// ---------- where people are ----------
const cpkW = (x, y) => [FPSC.CX + x, FPSC.CY + y];
function cpkNear(x, y, r) {
  const m = FPS.me;
  if (!(m.dead > 0) && !zmIsDown() && Math.hypot(m.x - x, m.y - y) < r) return true;
  if (ZM.net === 'host') for (const o of FPS.remote.values()) if (!o.dead && !o.down && o.x != null && Math.hypot(o.x - x, o.y - y) < r) return true;
  return false;
}

// ---------- the placeholder stage ----------
cpStage('wip', {
  n: 'Still being written',
  map: { start: [0, -60], top: 0, nav: [-80, 80, -80, 80] },
  set(H, K, Z) {},
  enter() { if (ZM.net !== 'client') { cpObjective('Walk to the light'); cpWaypoint(0, 0, 'The light'); } },
  tick(dt) { const [x, y] = cpkW(0, 0); if (cpkNear(x, y, 4)) cpDone(); },
  mend: true,
});
