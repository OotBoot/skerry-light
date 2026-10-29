// Starts the game once every script has loaded.

// No accidental zooming on phones. iPhone Safari ignores "user-scalable=no" (an accessibility choice),
// so the pinch and double-tap gestures themselves are stopped here; scrolling the menus still works.
for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  // a second tap within 300 ms would zoom: swallow it, unless it's on a text box
  if (now - lastTouchEnd < 300 && !(e.target && e.target.closest && e.target.closest('input, textarea'))) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

resize();
newVoyage(1, true);
let last = performance.now();
let loggedError = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try {
    pollPad(dt);
    // paused: nothing moves, but the scene is still drawn under the pause card
    if (paused) { drawScene(); requestAnimationFrame(frame); return; }
    roomsHum(!!(g && g.backrooms && state === 'play'));
    skyHum(!!(g && g.sky && state === 'play'));
    if (g && g.backrooms) roomsHumLevel(roomLevel());
    if (state === 'play' && g.verityScare > 0) {
      // Verity's jumpscare, and then the voyage is over
      g.verityScare -= dt;
      netTick(dt);
      drawVerityScare(SK.VERITY_SCARE_TIME - g.verityScare);
      if (g.verityScare <= 0) { g.verityScare = 0; $('stage').classList.remove('scaring'); stopVerity(); endRun('verity'); }
      requestAnimationFrame(frame);
      return;
    }
    if (state === 'play' && g.knockScare > 0) {
      // Knock's jumpscare pauses the voyage for a moment
      g.knockScare -= dt;
      netTick(dt);
      drawKnockScare(SK.KNOCK_SCARE_TIME - g.knockScare);
      if (g.knockScare <= 0) { g.knockScare = 0; $('stage').classList.remove('scaring'); if (g.knockKill) endRun('knock'); }
      requestAnimationFrame(frame);
      return;
    }
    if (state === 'title' || state === 'play' || state === 'scare') update(dt);
    else {
      g.t += dt; advanceBeam(dt); ship.v *= 0.98;
      for (const f of g.flares) f.t -= dt;
      g.flares = g.flares.filter(f => f.t > 0);
    }
    netTick(dt);
    if (state === 'scare') {
      g.scareT += dt;
      drawScare(g.scareT);
      if (g.scareT >= SK.SCARE_TIME) endRun('taken');
    } else if (NET.watch) withSpectatorView(drawScene);
    else drawScene();
  } catch (err) {
    if (!loggedError) { console.error(err); loggedError = true; }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
