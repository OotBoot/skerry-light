// Starts the game once every script has loaded.

resize();
newVoyage(1, true);
let last = performance.now();
let loggedError = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try {
    if (state === 'title' || state === 'play' || state === 'scare') update(dt);
    else { g.t += dt; advanceBeam(dt); ship.v *= 0.98; }
    netTick(dt);
    if (state === 'scare') {
      g.scareT += dt;
      drawScare(g.scareT);
      if (g.scareT >= SK.SCARE_TIME) endRun('taken');
    } else drawScene();
  } catch (err) {
    if (!loggedError) { console.error(err); loggedError = true; }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
