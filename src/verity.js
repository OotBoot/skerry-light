// Verity: a smiling yellow orb that turns up on your deck, right in front of you, offering to help.
// He just sits there, smiling, for twenty seconds. The bell does nothing to him; fire a flare before
// then and the glare sends him off into the water. Leave him, and he stands up and shows you what he really looks like.

IMG.verity = new Image(); IMG.verity.src = SK.ASSETS.verity;
IMG.verity2 = new Image(); IMG.verity2.src = SK.ASSETS.verity2;

function newVerity(backrooms) {
  // he's more at home in the rooms
  return { on: false, t: 0, next: backrooms ? rand(10, 20) : rand(20, 40), morph: 0, said: 0, gone: 0 };
}

function updateVerity(dt) {
  loadVerityVoice();
  const v = g.verity;
  if (g.attract || state !== 'play' || !v) return;
  if (v.gone > 0) v.gone -= dt;
  if (!v.on) {
    // he won't climb aboard while Maren is right at the bow, or while Knock is mid-swing
    v.next -= dt;
    if (v.next <= 0 && g.maren.stage < 3 && !g.knockScare) {
      v.on = true; v.t = 0; v.said = 0; v.morph = 0;
      sfxVerity(1, 0.9);
      addLog('Something is on the deck in front of you, smiling. It says it wants to help.', 'w');
      addLog('The bell won\u2019t move it. Fire a flare before it stops smiling.', 'w');
    }
    return;
  }
  v.t += dt;
  if (v.said === 0 && v.t > 10) { v.said = 1; sfxVerity(0.93, 0.95); addLog('Verity is still smiling. Ten seconds.', 'w'); }
  if (v.t >= SK.VERITY_TIME) {
    if (v.morph === 0) { stopVerity(); sfxVerity(0.62, 1); sfxCreak(); }
    v.morph += dt;
    if (v.morph >= SK.VERITY_MORPH) {
      v.on = false;
      g.verityScare = SK.VERITY_SCARE_TIME;
      sfxVerityScare();
      $('stage').classList.add('scaring');
      addLog('Verity stood up.', 'w');
    }
  }
}

// a flare shoos him off, as long as he's still smiling (the bell does nothing to him)
function flareShoosVerity() {
  const v = g.verity;
  if (!v || !v.on || v.t >= SK.VERITY_TIME) return false;
  v.on = false; v.gone = 0.8;
  v.next = g.backrooms ? rand(18, 30) : rand(30, 55);
  stopVerity();
  sfxSplash(0.3, 1);
  return true;
}

// drawn in screen space, over the deck: he stands on the planks a few steps in front of you, facing you
function drawVerity() {
  const v = g.verity;
  if (!v || NET.watch) return;
  const boat = BOAT_BY_ID[ship.boat] || BOATS[0];
  const tipY = H * boat.tipY;
  // where he touches the deck: a few steps ahead, but always above the buttons at the bottom
  const lb = $('logbox'), lbTop = lb && !lb.hidden ? lb.getBoundingClientRect().top - cv.getBoundingClientRect().top : H;
  const seatY = Math.min(tipY + (H - tipY) * 0.62, lbTop - 10), seatX = cx;
  const ORB = Math.min(H * 0.34, W * 0.62);   // close enough to fill a good part of the view
  if (v.gone > 0 && imgReady(IMG.verity)) {
    // sliding off the side into the sea
    const k = 1 - v.gone / 0.8, h = ORB, w = h * IMG.verity.naturalWidth / IMG.verity.naturalHeight;
    ctx.globalAlpha = 1 - k;
    ctx.drawImage(IMG.verity, seatX - w / 2 + k * W * 0.2, seatY - h + k * H * 0.25, w, h);
    ctx.globalAlpha = 1;
    return;
  }
  if (!v.on) return;
  const lit = 0.55 + 0.45 * Math.max(g.glare, lanternAt(ship.x, ship.y) * 0.6, g.backrooms ? roomLevel() * 0.8 : 0);
  if (v.morph <= 0 && imgReady(IMG.verity)) {
    const img = IMG.verity, h = ORB * (1 + Math.sin(g.t * 2.2) * 0.012), w = h * img.naturalWidth / img.naturalHeight;
    // he never stops smiling, but near the end he starts to come apart
    const wrong = Math.max(0, (v.t - SK.VERITY_TIME * 0.6) / (SK.VERITY_TIME * 0.4));
    // his shadow on the planks
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(seatX, seatY - 2, w * 0.42, Math.max(4, h * 0.05), 0, 0, 6.28); ctx.fill();
    ctx.save();
    ctx.translate(seatX, seatY);
    ctx.rotate(Math.sin(g.t * 1.3) * 0.05 + (wrong > 0 && !reduceMotion ? rand(-0.04, 0.04) * wrong : 0));
    ctx.filter = `brightness(${lit.toFixed(2)})`;
    drawGlitch(img, -w / 2, -h, w, h, wrong * 0.8);
    ctx.filter = 'none';
    ctx.restore();
    // a countdown ring under him, so it reads without the log
    const p = 1 - v.t / SK.VERITY_TIME;
    ctx.strokeStyle = `rgba(255,214,60,${0.35 + 0.4 * wrong})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(seatX, seatY - h / 2, w * 0.62, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    return;
  }
  // the change: the round face stretches up and is replaced by the long thing standing on the bow
  const k = Math.min(1, v.morph / SK.VERITY_MORPH);
  if (imgReady(IMG.verity) && k < 0.6) {
    const img = IMG.verity, h = ORB * (1 + k * 1.6), w = h * img.naturalWidth / img.naturalHeight * (1 - k * 0.9);
    ctx.globalAlpha = 1 - k / 0.6;
    drawGlitch(img, seatX - w / 2, seatY - h, w, h, 1);
    ctx.globalAlpha = 1;
  }
  if (imgReady(IMG.verity2) && k > 0.25) {
    const img = IMG.verity2, h = H * (0.5 + 0.75 * Math.min(1, (k - 0.25) / 0.75)), w = h * img.naturalWidth / img.naturalHeight;
    ctx.globalAlpha = Math.min(1, (k - 0.25) / 0.3);
    ctx.filter = `brightness(${lit.toFixed(2)})`;
    drawGlitch(img, seatX - w / 2 + (reduceMotion ? 0 : rand(-3, 3)), seatY - h * 0.97, w, h, 0.4 * (1 - k));
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }
  if (!reduceMotion && Math.random() < 0.1 * k) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H); }
}

// the jumpscare: that grin, filling the screen
function drawVerityScare(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const T = SK.VERITY_SCARE_TIME;
  ctx.fillStyle = Math.floor(t * 28) % 2 ? '#1c1a04' : '#000';
  ctx.fillRect(0, 0, W, H);
  if (!imgReady(IMG.verity2)) return;
  const img = IMG.verity2, iw = img.naturalWidth, ih = img.naturalHeight;
  // just the head and the teeth: top tenth of the picture, middle half
  const fx = iw * 0.24, fw = iw * 0.52, fy = 0, fh = ih * 0.115;
  const lunge = Math.min(1, t / 0.1);
  const k = 0.35 + lunge * 0.7 + Math.max(0, t - 0.1) * 0.2;
  const dw = Math.max(W, H * 0.85) * k, dh = dw * fh / fw;
  const shake = reduceMotion ? 0 : 36 * (1 - t / T) + 8;
  const x = cx - dw / 2 + rand(-shake, shake), y = H * 0.45 - dh / 2 + rand(-shake, shake);
  const strips = reduceMotion ? 1 : 12;
  for (let i = 0; i < strips; i++) {
    const off = !reduceMotion && Math.random() < 0.4 ? (Math.random() - 0.5) * dw * 0.1 : 0;
    ctx.drawImage(img, fx, fy + fh * i / strips, fw, fh / strips, x + off, y + dh * i / strips, dw, dh / strips + 0.6);
  }
  if (!reduceMotion && t > 0.3 && Math.random() < 0.1) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = `rgba(160,140,0,${0.15 + 0.12 * Math.sin(t * 45)})`;
  ctx.fillRect(0, 0, W, H);
  if (!reduceMotion && Math.random() < 0.12) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
}
