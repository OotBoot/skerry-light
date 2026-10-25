// Starts the game once every script has loaded.

resize();
newVoyage(1, true);
let last = performance.now();
let loggedError = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try {
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
