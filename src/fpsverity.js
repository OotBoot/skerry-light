// Verity, ashore. The same small yellow thing that sits on your deck in the real game turns up on the island
// a few steps in front of you, smiling, offering to help. The rules are his usual ones:
//  - he only comes to someone who has a flare left, and he comes for you alone (everyone else can see him
//    sitting there in front of you, but he isn't theirs)
//  - bullets go straight through him, a cutlass passes through him, and the bell doesn't bother him
//  - a flare's glare sends him rolling away: yours, or anyone's that lands on the island while he's smiling
//  - you can't walk away from him: look away for a moment and he's sitting in front of you again
//  - leave him twenty seconds and he stands up, and that's the end of you (a death, but nobody's kill)
// The pictures and the voice are the real game's (src/verity.js, src/audio.js).

const FPSV = { TIME: SK.VERITY_TIME, MORPH: SK.VERITY_MORPH, SCARE: SK.VERITY_SCARE_TIME, ORB: 0.85, TALL: 2.9 };

function fpsVerityReset(first) {
  FPS.vy = { on: false, t: 0, morph: 0, gone: 0, said: 0, x: 0, y: 0, lost: 0, shotSaid: false, next: first ? 45 + Math.random() * 45 : 60 + Math.random() * 60 };
  FPS.vScare = 0;
}

// somewhere on the ground just ahead of where you're looking, a little to one side, clear of the rocks
function fpsVerityPlace() {
  const m = FPS.me, v = FPS.vy;
  // (off to one side of the crosshair, so your gun doesn't hide him)
  if (!v.side) v.side = Math.random() < 0.5 ? -1 : 1;
  for (let i = 0; i < 16; i++) {
    const d = 6 + Math.random() * 2, a = m.h + v.side * (0.22 + Math.random() * 0.12) * (i < 10 ? 1 : -1);
    const x = m.x + Math.sin(a) * d, y = m.y + Math.cos(a) * d;
    if (!fpsBlocked(x, y, 0.6)) { v.x = x; v.y = y; v.lost = 0; return true; }
  }
  return false;
}

function fpsVerityTick(dt) {
  if (!FPS.vy) fpsVerityReset(true);
  const v = FPS.vy, m = FPS.me;
  try { loadVerityVoice(); } catch (e) {}
  if (FPS.vScare > 0) {
    FPS.vScare -= dt;
    if (FPS.vScare <= 0) {
      FPS.vScare = 0; $('stage').classList.remove('scaring');
      try { stopVerity(); } catch (e) {}
      m.protect = 0; fpsDie(null, 'Verity');
      fpsVerityReset(false);
    }
    return;
  }
  if (v.gone > 0) v.gone -= dt;
  if (!v.on) {
    if (m.dead > 0 || m.protect > 0 || FPS.menu || m.flares <= 0) return;
    v.next -= dt;
    v.side = 0;
    if (v.next > 0 || !fpsVerityPlace()) return;
    v.on = true; v.t = 0; v.morph = 0; v.said = 0; v.shotSaid = false; v.side = 0;
    // flares already burning when he comes don't count: he waits for a fresh one
    for (const f of FPS.g.flares) f.vyOld = true;
    try { sfxVerity(1, 0.9); } catch (e) {}
    fpsFeed('Something small is on the shingle in front of you, smiling. It says it wants to help.');
    fpsFeed('Fire a flare before it stops smiling.');
    fpsSend();
    return;
  }
  // gone if you are
  if (m.dead > 0) { v.on = false; v.next = 50 + Math.random() * 40; try { stopVerity(); } catch (e) {} return; }
  if (v.morph <= 0) {
    // a fresh flare anywhere on the island: the glare sends him off
    if (FPS.g.flares.some(f => !f.vyOld && Math.hypot(f.x - v.x, f.y - v.y) < SK.FLARE_RADIUS)) { fpsVerityShoo(); return; }
    // you can't leave him behind: out of sight for a moment, or far off, and he's in front of you again
    const d = Math.hypot(v.x - m.x, v.y - m.y), off = Math.abs(angDiff(bearingOf(v.x - m.x, v.y - m.y), m.h));
    v.lost = off > 0.75 || d > 12 ? v.lost + dt : 0;
    if (v.lost > 0.9) fpsVerityPlace();
    v.t += dt;
    if (v.said === 0 && v.t > 10) { v.said = 1; try { sfxVerity(0.93, 0.95); } catch (e) {} fpsFeed('Verity is still smiling. Ten seconds.'); }
    if (v.t >= FPSV.TIME) {
      v.morph = 0.0001;
      try { stopVerity(); sfxVerity(0.62, 1); sfxCreak(); } catch (e) {}
      fpsSend();
    }
    return;
  }
  // standing up, in front of you, wherever you look
  v.morph += dt;
  if (Math.abs(angDiff(bearingOf(v.x - m.x, v.y - m.y), m.h)) > 0.6) fpsVerityPlace();
  if (v.morph >= FPSV.MORPH) {
    v.on = false; FPS.vScare = FPSV.SCARE;
    $('stage').classList.add('scaring');
    try { sfxVerityScare(); } catch (e) {}
    if (typeof padRumble === 'function') padRumble(1, 1, FPSV.SCARE * 1000);
  }
}

function fpsVerityShoo() {
  const v = FPS.vy; if (!v || !v.on || v.morph > 0) return false;
  v.on = false; v.gone = 0.8; v.next = 70 + Math.random() * 60;
  try { stopVerity(); sfxSplash(0.3, 1); } catch (e) {}
  fpsFeed('In the flare’s glare Verity rolls away into the dark, still smiling. He will be back.');
  fpsSend();
  return true;
}

// a shot or a cut through him does nothing, and he lets you know it
function fpsVerityShot(x, y, h) {
  const v = FPS.vy; if (!v || !v.on || v.morph > 0) return;
  const ox = v.x - x, oy = v.y - y, along = ox * Math.sin(h) + oy * Math.cos(h);
  if (along < 0 || along > 40) return;
  const side = Math.abs(ox * Math.cos(h) - oy * Math.sin(h));
  if (side > 0.6) return;
  fpsPuff(v.x, v.y, FPSC.GROUND + 0.4, '255,214,60', 4);
  if (!v.shotSaid) { v.shotSaid = true; fpsFeed('It goes straight through Verity. He keeps smiling.'); }
}
function fpsVerityBell() { if (FPS.vy && FPS.vy.on && FPS.vy.morph <= 0) fpsFeed('The bell rings right over Verity. Bells don’t bother him.'); }

// what to tell everyone else: where he's sitting, how long he's smiled, whether he's standing
function fpsVerityNet() {
  const v = FPS.vy;
  if (v && v.on) return [fr1(v.x), fr1(v.y), Math.round(v.t), v.morph > 0 ? 1 : 0];
  if (v && v.gone > 0) return [fr1(v.x), fr1(v.y), -1, 0];
  return null;
}
// everyone's Verity on the island: mine, and the ones sitting in front of other people
function fpsVerityItems(add) {
  const v = FPS.vy;
  if (v && (v.on || v.gone > 0)) add('verity', { x: v.x, y: v.y, t: v.t, morph: v.morph, gone: v.gone, mine: true });
  for (const r of FPS.remote.values()) {
    const a = r.vy; if (!Array.isArray(a) || r.dead) continue;
    add('verity', { x: a[0], y: a[1], t: a[2] < 0 ? 0 : a[2], morph: a[3] ? 0.8 : 0, gone: a[2] < 0 ? 0.4 : 0, mine: false });
  }
}

// drawn standing on the island like anyone, so rocks hide him and he shrinks with distance
function fpsDrawVerity(o, c) {
  const foot = proj(c), top = proj(cam(o.x, o.y, FPSC.GROUND + FPSV.ORB));
  const ORB = Math.max(4, foot.y - top.y);
  if (ORB > H * 3) return;
  const lit = 0.5 + 0.5 * Math.max(fpsSeeAt(o.x, o.y, false), 0.25);
  const img = IMG.verity, img2 = IMG.verity2;
  if (o.gone > 0) {
    // rolling away into the dark
    if (!imgReady(img)) return;
    const k = 1 - o.gone / 0.8, h = ORB, w = h * img.naturalWidth / img.naturalHeight;
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.save(); ctx.translate(foot.x + k * ORB * 1.6, foot.y - h / 2); ctx.rotate(k * 4);
    ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }
  if (o.morph <= 0) {
    if (!imgReady(img)) return;
    const h = ORB * (1 + Math.sin(g.t * 2.2) * 0.012), w = h * img.naturalWidth / img.naturalHeight;
    const wrong = Math.max(0, (o.t - FPSV.TIME * 0.6) / (FPSV.TIME * 0.4));
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(foot.x, foot.y - 1, w * 0.42, Math.max(2, h * 0.06), 0, 0, 6.28); ctx.fill();
    ctx.save();
    ctx.translate(foot.x, foot.y);
    ctx.rotate(Math.sin(g.t * 1.3) * 0.05 + (wrong > 0 && !reduceMotion ? (Math.random() - 0.5) * 0.08 * wrong : 0));
    ctx.filter = `brightness(${lit.toFixed(2)})`;
    drawGlitch(img, -w / 2, -h, w, h, wrong * 0.8);
    ctx.filter = 'none';
    ctx.restore();
    // the ring counting down, round him (only on your own: everyone else's is their business)
    if (o.mine) {
      const p = Math.max(0, 1 - o.t / FPSV.TIME);
      ctx.strokeStyle = `rgba(255,214,60,${0.4 + 0.4 * wrong})`; ctx.lineWidth = Math.max(2, ORB * 0.03);
      ctx.beginPath(); ctx.arc(foot.x, foot.y - h / 2, w * 0.66, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    }
    return;
  }
  // the change: the round face stretches up and the long thing stands there instead
  const k = Math.min(1, o.morph / FPSV.MORPH);
  if (imgReady(img) && k < 0.6) {
    const h = ORB * (1 + k * 2.4), w = h * img.naturalWidth / img.naturalHeight * (1 - k * 0.9);
    ctx.globalAlpha = 1 - k / 0.6;
    drawGlitch(img, foot.x - w / 2, foot.y - h, w, h, 1);
    ctx.globalAlpha = 1;
  }
  if (imgReady(img2) && k > 0.25) {
    const tall = foot.y - proj(cam(o.x, o.y, FPSC.GROUND + FPSV.TALL)).y;
    const h = tall * (0.35 + 0.65 * Math.min(1, (k - 0.25) / 0.75)), w = h * img2.naturalWidth / img2.naturalHeight;
    ctx.globalAlpha = Math.min(1, (k - 0.25) / 0.3);
    ctx.filter = `brightness(${lit.toFixed(2)})`;
    drawGlitch(img2, foot.x - w / 2 + (reduceMotion ? 0 : (Math.random() - 0.5) * 6), foot.y - h * 0.97, w, h, 0.4 * (1 - k));
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }
  if (o.mine && !reduceMotion && !softScares() && Math.random() < 0.1 * k) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(-W, -H, W * 3, H * 3); }
}

// a line on the HUD while he's smiling at you, and the Flare button shaking on a phone
function fpsVerityHud(phone) {
  const v = FPS.vy, on = !!(v && v.on && v.morph <= 0);
  const fb = $('fpsPadFlare'); if (fb) fb.classList.toggle('urgent', on);
  if (!on) return;
  const left = Math.max(0, Math.ceil(FPSV.TIME - v.t)), a = 0.65 + 0.35 * Math.sin(g.t * 6);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${phone ? 11 : 13}px "Courier Prime", monospace`;
  ctx.fillStyle = `rgba(255,214,60,${a})`;
  ctx.fillText(phone ? `VERITY · ${left}s · FIRE A FLARE` : `VERITY IS SMILING AT YOU · ${left}s · FIRE A FLARE (F)`, cx, H * (phone ? 0.24 : 0.2));
}
