// The two that walk on the water off Skerry Light.
//
// Maren Holm, the keeper's wife, rowed out in 1887 to warn the brig Gannet and never came back.
// Each time the beam comes round she stands a little nearer your bow. Ring the bell while you can
// see her to drive her back. If she reaches you, she takes the ship.
//
// Plimsoll, the shark in the Gannet cabin boy's shoes, knows the deep water through the skerries.
// He walks ahead of you to the harbour. Keep close to him and Maren cannot come nearer.

const IMG = { maren: new Image(), plim: new Image() };
IMG.maren.src = SK.ASSETS.maren;
IMG.plim.src = SK.ASSETS.plimsoll;
function imgReady(im) { return im.complete && im.naturalWidth > 0; }

// ---------- Maren ----------
function newMaren(active, gannet) {
  return { active, stage: 0, x: gannet ? gannet.x : 0, y: gannet ? gannet.y + gannet.r * 0.4 : 900, seenStage: -1, apparition: 0 };
}

function placeMaren(stage) {
  const m = g.maren, d = SK.MAREN_STAGES[stage];
  const b = ship.h + rand(-0.3, 0.3);
  m.x = ship.x + Math.sin(b) * d;
  m.y = Math.max(25, ship.y + Math.cos(b) * d);
}

function plimsollGuarding() { return Math.hypot(g.plim.x - ship.x, g.plim.y - ship.y) < SK.PLIMSOLL_GUARD; }

// called each time the beam completes a turn
function marenTurn() {
  const m = g.maren;
  if (!m.active || state !== 'play') return;
  const byPlim = plimsollGuarding(), byCrew = crewMode && mateNear(90);
  if (byPlim || byCrew) {
    if (m.stage > 0) {
      m.stage--; placeMaren(m.stage);
      addLog(byPlim ? 'Plimsoll is close. She falls back.' : 'Your crew is close by. She falls back.', 'p');
    }
    return;
  }
  if (m.stage >= SK.MAREN_STAGES.length - 1) { startScare(); return; }
  m.stage++;
  placeMaren(m.stage);
  const lines = [null, 'Someone is humming out on the water.', 'A woman is standing on the sea ahead.', 'She is close now. Find Plimsoll or ring the bell.', 'She is at the bow.'];
  addLog(lines[m.stage], m.stage >= 3 ? 'w' : null);
}

function marenInView() {
  const m = g.maren;
  return Math.abs(angDiff(bearingOf(m.x - ship.x, m.y - ship.y), ship.h)) < fov / 2 + 0.05;
}

function ringBell() {
  if (state !== 'play' || g.bell > 0) return;
  g.bell = SK.BELL_COOLDOWN + g.n * 1.5;
  g.bellFlash = 1;
  sfxBell();
  if (crewMode) { NET.bells++; send(); }
  const m = g.maren;
  if (m.active && m.stage >= 1 && marenInView()) {
    m.stage = 0; placeMaren(0);
    addLog('The bell rings out. She is gone, for now.', 'p');
  } else {
    addLog(m.stage >= 1 ? 'The bell rings, but she is not in front of you. Turn to face her first.' : 'The bell rings out over the water. Nothing answers.');
  }
}

function updateMaren(dt) {
  const m = g.maren;
  if (m.apparition > 0) m.apparition -= dt;
  if (!m.active) return;
  // the first time you see her at each stage, she whispers
  const vis = visibility(m.x, m.y);
  if (vis > 0.3 && marenInView() && m.seenStage !== m.stage) {
    m.seenStage = m.stage;
    const pan = clamp(angDiff(bearingOf(m.x - ship.x, m.y - ship.y), ship.h) / (fov / 2), -1, 1);
    sfxWhisper(pan, 0.6 + m.stage * 0.15);
  }
}

function drawMaren(q, vis) {
  if (vis < 0.02 || !imgReady(IMG.maren)) return;
  const m = g.maren;
  const h = 6.2 * q.s * (1 + Math.sin(g.t * 0.9) * 0.015), w = h * SK.MAREN_ASPECT;
  const sway = reduceMotion ? 0 : Math.sin(g.t * 1.3) * 0.035 + (m.stage >= 3 ? Math.sin(g.t * 17) * 0.012 : 0);
  let a = vis;
  if (m.stage >= 3 && !reduceMotion && Math.random() < 0.12) a *= 0.35;
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(sway);
  // her reflection, faint and broken by the swell
  ctx.save();
  ctx.globalAlpha = a * 0.22;
  ctx.scale(1, -0.45);
  ctx.drawImage(IMG.maren, -w / 2, -h, w, h);
  ctx.restore();
  ctx.globalAlpha = a;
  drawGlitch(IMG.maren, -w / 2, -h, w, h, m.stage >= 2 ? 0.08 * m.stage : 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// sometimes, when the beam flashes over you, she is standing on the bowsprit
function maybeApparition() {
  const m = g.maren;
  if (!m.active || m.stage < 1 || Math.random() > 0.3) return;
  m.apparition = 0.9;
  sfxSting();
  addLog('Something was standing on the bowsprit.', 'w');
}
function drawBowspritApparition() {
  const m = g.maren;
  if (m.apparition <= 0 || !imgReady(IMG.maren)) return;
  const h = H * 0.36, w = h * SK.MAREN_ASPECT;
  ctx.globalAlpha = Math.min(1, m.apparition * 3);
  drawGlitch(IMG.maren, cx - w / 2, H * 0.72 - h * 0.94, w, h, 0.25);
  ctx.globalAlpha = 1;
}

// ---------- Plimsoll ----------
function newPlimsoll(path) {
  const p = { x: path[0].x, y: path[0].y, k: 1, walking: false, phase: 0, lastStep: 0, call: 2, dirX: 0, dirY: 1, done: false };
  // start him a little way along the channel, ahead of the bow
  let left = 60;
  while (p.k < path.length && left > 0) {
    const t = path[p.k], d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d <= left) { p.x = t.x; p.y = t.y; p.k++; left -= d; }
    else { p.x += (t.x - p.x) / d * left; p.y += (t.y - p.y) / d * left; left = 0; }
  }
  return p;
}

function updatePlimsoll(dt) {
  const p = g.plim, path = g.path;
  const d = Math.hypot(p.x - ship.x, p.y - ship.y);
  if (d < 80) p.walking = true;
  else if (d > 105) p.walking = false;
  if (p.k >= path.length) { p.walking = false; p.done = true; }
  if (p.walking) {
    const t = path[p.k], dx = t.x - p.x, dy = t.y - p.y, dd = Math.hypot(dx, dy);
    const sp = Math.max(8, ship.v + 3) * dt;
    if (dd <= sp) { p.x = t.x; p.y = t.y; p.k++; }
    else { p.x += dx / dd * sp; p.y += dy / dd * sp; p.dirX = dx / dd; p.dirY = dy / dd; }
    p.phase += dt * 9;
    const step = Math.floor(p.phase / Math.PI);
    if (step !== p.lastStep) { p.lastStep = step; squeakFrom(p, d, 1); }
  } else {
    p.phase += dt * 1.5;
    p.call -= dt;
    if (d > 150 && p.call <= 0 && !g.attract) {
      p.call = 3.2;
      squeakFrom(p, d, 1.6);
      setTimeout(() => { if (g && g.plim === p) squeakFrom(p, Math.hypot(p.x - ship.x, p.y - ship.y), 1.6); }, 160);
    }
  }
}

function squeakFrom(p, d, boost) {
  const pan = clamp(angDiff(bearingOf(p.x - ship.x, p.y - ship.y), ship.h) / (fov / 2), -1, 1);
  sfxSqueak(pan, Math.max(0, 1 - d / 260) * boost * (g.attract ? 0.5 : 1));
}

function drawPlimsoll(q, vis) {
  if (!imgReady(IMG.plim)) return;
  const p = g.plim;
  const h = 4.8 * q.s, w = h * SK.PLIM_ASPECT;
  const bob = p.walking ? Math.abs(Math.sin(p.phase)) * 0.07 * h : Math.sin(p.phase) * 0.015 * h;
  const tilt = reduceMotion ? 0 : (p.walking ? Math.sin(p.phase) * 0.06 : Math.sin(p.phase * 0.7) * 0.015);
  const squash = p.walking ? 1 - Math.abs(Math.cos(p.phase)) * 0.03 : 1;
  // the image faces left; flip him when he walks to the right across your view
  const ahead = cam(p.x + p.dirX, p.y + p.dirY, 0), here = cam(p.x, p.y, 0);
  const flip = ahead.r - here.r > 0;
  ctx.save();
  ctx.translate(q.x, q.y - bob);
  ctx.rotate(tilt);
  ctx.scale(flip ? -1 : 1, squash);
  if (vis > 0.02) {
    ctx.globalAlpha = vis;
    ctx.drawImage(IMG.plim, -w / 2, -h, w, h);
  }
  // his shoes glow faintly, the one thing you can always see out there
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  const r = Math.max(1.6, h * 0.06);
  for (const [fx, fy] of [[0.22, 0.82], [0.47, 0.9], [0.71, 0.77]]) {
    const x = -w / 2 + w * fx, y = -h + h * fy;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    gr.addColorStop(0, 'rgba(110,215,255,0.75)'); gr.addColorStop(1, 'rgba(110,215,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 6.28); ctx.fill();
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
