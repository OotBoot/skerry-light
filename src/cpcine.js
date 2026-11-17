'use strict';
// The Chronicle of the Light: its cinematics. A cinematic is a run of shots played in the game's own 3D world (the
// stage as it's laid out), with the picture letterboxed, the camera flown along its own path, lines said as
// subtitles under the picture (and heard, once they're recorded: src/cp.js cpVoice), title cards on black, and actors
// of its own built for it and moved as it plays. While one plays nothing else moves: the drowned stand where they
// are, nobody can be hurt, and the stage's clock waits (src/zombies.js zmFrame and zmTick ask cpCineOn).
//
// Together: the host starts it (cpCine) and says which, and how far in, in its word (cpc); every screen plays the
// same shots from its own clock, kept within half a second of the host's. A cinematic can't be skipped: it plays to its
// end on every screen (Space, Enter, a click or tap are swallowed while it plays, so nothing fires or jumps).
//
// A cinematic (cpCineDef(id, def)): { n: its name, music: a music key (src/cp.js cpMusic) while it plays,
//   b3(grp, C): its actors built (every screen, as it begins: grp is a THREE.Group in the scene, emptied after;
//   C is the cinematic's own state, for anything to keep), exit(C): as it ends (every screen),
//   shots: [ shot, ... ] }
// A shot: { d: seconds,
//   cam: [x, y, h] where the camera is (x, y about the island's middle, as a stage's map.start; h above the ground),
//   to: [x, y, h] where it ends up (eased from cam over the shot; left out, it stays),
//   look: [x, y, h] what it looks at, lookTo: what it ends looking at (or hd: [yaw, pitch], hdTo: [yaw, pitch]),
//   ease: 'io' (default: in and out), 'lin', 'in', 'out',
//   card: { eye, t, sub } a title card on black instead of the picture (eye: a small line over it, t: the title,
//     sub: under it), cam ignored,
//   fade: [in seconds, out seconds] from and to black (default [0, 0]; a card's [0.6, 0.6]),
//   lines: [[at seconds, who (CP_CAST key), text, vo id], ...] subtitles said during the shot,
//   sfx: [[at, name, vol], ...] sounds (src/sfxbank.js names) during the shot,
//   shake: 0..1 the camera shaking, f(t, k, C): each frame (t: seconds into the shot, k: 0 to 1), for its actors,
//   enter(C) / exit(C): the shot beginning and ending, on every screen }
// Helpers: cpLook(from, to) gives [yaw, pitch]; cpLerp3(a, b, k).
var CP_CINES = {};
function cpCineDef(id, def) { def.id = id; def.shots = def.shots || []; def.T = def.shots.reduce((a, s) => a + (s.d || 0), 0); CP_CINES[id] = def; return def; }
const CPN = { rate: 1, on: null, t: 0, seq: 0, then: null, skip: new Set(), grp: null, C: null, shot: -1, hostT: 0, bar: 0, skipped: false };

const cpLerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
function cpLook(f, t) { const dx = t[0] - f[0], dy = t[1] - f[1], dz = t[2] - f[2]; return [Math.atan2(dx, dy), Math.atan2(dz, Math.hypot(dx, dy))]; }
const cpEase = (k, e) => e === 'lin' ? k : e === 'in' ? k * k : e === 'out' ? 1 - (1 - k) * (1 - k) : k * k * (3 - 2 * k);
function cpCineOn() { return !!(CPN.on && typeof CP !== 'undefined' && CP.on); }
// (the camera, cinematic or not: zmFrame holds input while it's on)
const cpHold = () => cpCineOn();

// ---------- starting and ending ----------
// (hosting or alone) play cinematic id on every screen; then() on the host once it's over
function cpCine(id, then) {
  if (!CP.on || ZM.net === 'client' || ZM.over) return false;
  const D = CP_CINES[id];
  if (!D || !D.shots.length) { if (then) then(); return false; }
  if (CPN.on) cpcEnd(true);   // (one already playing: it's over)
  CPN.seq++; cpcBegin(D, 0); CPN.then = then || null;
  return true;
}
function cpcBegin(D, t) {
  CPN.on = D; CPN.t = t || 0; CPN.shot = -1; CPN.skip = new Set(); CPN.C = {}; CPN.skipped = false;
  CP.subs = [];
  try { FPS.scoped = false; } catch (e) {}
  try { if (typeof GL3D !== 'undefined' && GL3D.scene && typeof THREE !== 'undefined') { CPN.grp = new THREE.Group(); GL3D.scene.add(CPN.grp); if (D.b3) D.b3(CPN.grp, CPN.C); } } catch (e) { console.warn('cine b3', e); }
  // (any lines already past, joining late: not said)
  CPN.said = new Set();
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
}
// (everyone) the end of it: its actors gone; hosting or alone, then()
function cpcEnd(quiet) {
  const D = CPN.on; if (!D) return;
  const S = D.shots[CPN.shot]; if (S && S.exit) try { S.exit(CPN.C); } catch (e) {}
  try { if (D.exit) D.exit(CPN.C); } catch (e) { console.warn('cine exit', e); }
  if (CPN.grp) { try { CPN.grp.parent && CPN.grp.parent.remove(CPN.grp); cpcDispose(CPN.grp); } catch (e) {} CPN.grp = null; }
  CPN.on = null; CPN.shot = -1; CP.subs = [];
  const then = CPN.then; CPN.then = null;
  if (!quiet && then && ZM.net !== 'client') try { then(); } catch (e) { console.warn('cine then', e); }
  // (on again: look where you were looking)
  try { cv.focus(); } catch (e) {}
}
function cpcDispose(o) { o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) for (const m of [].concat(n.material)) { if (m.map && m.map.dispose && !m.map.keep) m.map.dispose(); m.dispose(); } }); }
function cpcReset() { if (CPN.on) cpcEnd(true); CPN.seq = 0; CPN.hostT = 0; }
function cpcStop() { cpcReset(); }

// ---------- each frame (src/cp.js cpMe) ----------
function cpcTick(dt) {
  const D = CPN.on; if (!D) { CPN.bar = Math.max(0, CPN.bar - dt * 3); return; }
  CPN.bar = Math.min(1, CPN.bar + dt * 2.5);
  FPS.me.protect = Math.max(FPS.me.protect || 0, 1); FPS.me.iframe = Math.max(FPS.me.iframe || 0, 1);
  CPN.t += dt * CPN.rate;   // (rate: a test can play them quicker)
  // (a controller's A is only watched, so it doesn't fire the moment the cinematic ends)
  try { const P = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; CPN.padA = P.some(p => p.buttons[0] && p.buttons[0].pressed); } catch (e) {}
  // (joined: kept near the host's own clock)
  if (ZM.net === 'client' && Math.abs(CPN.t - CPN.hostT) > 0.5) CPN.t = CPN.hostT;
  if (CPN.t >= D.T) { if (ZM.net !== 'client') cpcEnd(); else CPN.t = D.T - 0.001; return; }
  // which shot
  let a = 0, i = 0; while (i < D.shots.length - 1 && CPN.t >= a + D.shots[i].d) { a += D.shots[i].d; i++; }
  if (i !== CPN.shot) {
    const P = D.shots[CPN.shot]; if (P && P.exit) try { P.exit(CPN.C); } catch (e) {}
    CPN.shot = i; const S = D.shots[i]; if (S.enter) try { S.enter(CPN.C); } catch (e) { console.warn('shot enter', e); }
  }
  const S = D.shots[i], st = CPN.t - a, k = clamp(st / Math.max(0.001, S.d), 0, 1);
  CPN.st = st; CPN.k = k; CPN.a = a;
  for (const [j, L] of (S.lines || []).entries()) { const key = i + ':' + j; if (st >= L[0] && !CPN.said.has(key)) { CPN.said.add(key); if (st - L[0] < 1.5) cpSub(L[1], L[2], L[3]); } }
  for (const [j, F] of (S.sfx || []).entries()) { const key = i + 's' + j; if (st >= F[0] && !CPN.said.has(key)) { CPN.said.add(key); if (st - F[0] < 0.5) try { sfxPlay(F[1], { vol: F[2] == null ? 0.8 : F[2] }); } catch (e) {} } }
  if (S.f) try { S.f(st, k, CPN.C); } catch (e) { if (!CPN.warned) { CPN.warned = true; console.warn('shot f', e); } }
}
// (src/fps.js fpsDrawScene, a cinematic on) the camera for now: [x, y, h, yaw, pitch] in the world, or null
function cpcCam() {
  const D = CPN.on; if (!D || CPN.shot < 0) return null;
  const S = D.shots[CPN.shot]; if (!S || S.card || !S.cam) return null;
  const e = cpEase(CPN.k || 0, S.ease), p = S.to ? cpLerp3(S.cam, S.to, e) : S.cam;
  let hd;
  if (S.look) { const l = S.lookTo ? cpLerp3(S.look, S.lookTo, e) : S.look; hd = cpLook(p, l); }
  else if (S.hd) { const a = S.hd, b = S.hdTo || S.hd; hd = [a[0] + angDiff(b[0], a[0]) * e, a[1] + (b[1] - a[1]) * e]; }
  else hd = [0, 0];
  let x = FPSC.CX + p[0], y = FPSC.CY + p[1], h = FPSC.GROUND + p[2];
  if (S.shake && !reduceMotion) { const t = g.t, s = S.shake * 0.12; x += Math.sin(t * 37) * s; y += Math.cos(t * 41) * s; h += Math.sin(t * 53) * s * 0.6; }
  return [x, y, h, hd[0], clamp(hd[1], -1.4, 1.4)];
}

// ---------- painted on top (src/fps.js fpsDraw: in place of the HUD) ----------
function cpcHud() {
  const D = CPN.on; if (!D && CPN.bar <= 0) return false;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const phone = FPS.touch, mono = px => `600 ${px}px "Courier Prime", monospace`, fell = px => `400 ${px}px "IM Fell English SC", serif`;
  const S = D && D.shots[CPN.shot];
  if (S) {
    const fd = S.fade || (S.card ? [0.6, 0.6] : [0, 0]), st = CPN.st || 0;
    let blk = S.card ? 1 : 0;
    if (!S.card) { if (fd[0] > 0 && st < fd[0]) blk = Math.max(blk, 1 - st / fd[0]); if (fd[1] > 0 && st > S.d - fd[1]) blk = Math.max(blk, (st - (S.d - fd[1])) / fd[1]); }
    if (blk > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(blk, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
    if (S.card) {
      const a = clamp(Math.min(st / Math.max(0.01, fd[0]), (S.d - st) / Math.max(0.01, fd[1])), 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const C = S.card;
      if (C.eye) { ctx.font = mono(phone ? 11 : 14); ctx.fillStyle = 'rgba(255,216,138,0.85)'; ctx.fillText(String(C.eye).toUpperCase(), cx, H * 0.4); }
      if (C.t) { ctx.font = fell(phone ? 30 : 54); ctx.fillStyle = '#f4eedf'; ctx.fillText(C.t, cx, H * 0.48, W - 30); }
      if (C.sub) { ctx.font = 'italic ' + fell(phone ? 15 : 22); ctx.fillStyle = 'rgba(232,220,192,0.85)'; const L = cpWrap(C.sub, Math.min(W - 40, 820)); L.forEach((l, i) => ctx.fillText(l, cx, H * 0.57 + i * (phone ? 20 : 30))); }
      ctx.restore();
    }
  }
  // the letterbox
  const bh = H * 0.11 * cpEase(CPN.bar, 'io');
  if (bh > 0.5) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh); }
  if (D) {
    cpSubHud(phone, mono, fell, true);
  }
  ctx.textBaseline = 'alphabetic';
  return !!D;
}
// (src/cp.js cpMusic) the cinematic's own music, if it says one
function cpcMusic() { return CPN.on && CPN.on.music ? CPN.on.music : undefined; }

// ---------- no skipping ----------
// Cinematics play to the end. These stay so an older screen asking to skip (cpQ 'cpskip') is simply ignored.
function cpcSkip() {}
function cpcSkipVote() {}
addEventListener('keydown', e => { if (!cpCineOn() || FPS.menu) return; if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); e.stopPropagation(); } }, true);

// ---------- playing together ----------
// cpc = [seq, id, seconds in, who's asked to skip]; null when nothing is playing
function cpcPack(z) { z.cpc = CPN.on ? [CPN.seq, CPN.on.id, Math.round(CPN.t * 20) / 20, [...CPN.skip]] : null; }
function cpcApply(hz) {
  const c = hz.cpc;
  if (!Array.isArray(c)) { if (CPN.on) cpcEnd(true); return; }
  const seq = c[0] | 0, D = CP_CINES[String(c[1])]; if (!D) return;
  CPN.hostT = +c[2] || 0;
  if (!CPN.on || seq !== CPN.seq) { if (CPN.on) cpcEnd(true); CPN.seq = seq; cpcBegin(D, CPN.hostT); }
  CPN.skip = new Set(Array.isArray(c[3]) ? c[3].map(String) : []);
}
