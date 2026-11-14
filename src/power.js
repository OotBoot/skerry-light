// Battery saver: how hard the game works the phone. Phones and tablets ran hot and flat quickly, drawing every frame
// the screen could show at nearly its full resolution. With the saver on (the Settings card: Auto turns it on for
// any touch-first device, On and Off force it), the game draws 30 frames a second instead of 60, the 3D view at a
// little over one pixel per screen pixel instead of two, and the painted layers at one and a half.
// Only the drawing slows: every mode moves things by the time that has passed (dt), so a boat, a bullet or a ball
// covers the same water in a second at 30 frames as at 60. The menus behind a card draw at 30 whatever the setting,
// and a tab in the background lets its sound sleep in every mode (the browser already stops drawing it).

var PW = { last: -1e9 };
function pwTouch() { try { return !!(matchMedia && matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } }
function pwSaver() { const s = SETTINGS.power; return s === 'on' || (s !== 'off' && pwTouch()); }
// the most pixels per screen pixel: the painted (2D) canvases, and the 3D views
function pwDprCap() { return pwSaver() ? 1.5 : 2; }
function pwGlCap() { return pwSaver() ? 1.25 : 2; }
// the frames a second the game aims at just now (0: as many as the screen shows)
function pwFps() {
  if (pwSaver()) return 30;
  if (typeof state !== 'undefined' && (state === 'title' || state === 'port' || state === 'over')) return 30;
  if (typeof paused !== 'undefined' && paused) return 30;
  return 0;
}
// the time a frame is meant to take, in seconds (the adaptive resolutions judge "slow" against it, not against 60)
function pwFrameS() { const f = pwFps(); return f ? 1 / f : 0; }
// is this screen refresh one to leave undrawn? (a few milliseconds' grace, so that a 60 or 120 a second screen lands
// on every second or fourth refresh rather than drifting)
function pwSkip(now) {
  const f = pwFps(); if (!f) { PW.last = now; return false; }
  if (now - PW.last < 1000 / f - 4 && now >= PW.last) return true;
  PW.last = now; return false;
}
// the setting changed: the canvases take their new resolution
function pwApply() {
  if (typeof GL3D !== 'undefined') GL3D.pr = 0;
  if (typeof resize === 'function' && typeof cv !== 'undefined') resize();
  if (typeof gf3dPower === 'function') gf3dPower();
}
// in the background: the sound sleeps in every mode (a solo voyage also pauses, in src/game.js), and wakes on return
document.addEventListener('visibilitychange', () => {
  if (typeof AUD === 'undefined' || !AUD.ctx) return;
  if (document.hidden) { if (AUD.ctx.state === 'running') { PW.slept = true; AUD.ctx.suspend().catch(() => {}); } }
  else if (PW.slept) { PW.slept = false; if (!(typeof paused !== 'undefined' && paused)) AUD.ctx.resume().catch(() => {}); }
});
