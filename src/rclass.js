// Maren's End: the three callings. Once a raid starts (src/raid.js), each player picks one, over the view: the
// Mercenary, the Brute or the Apothecary. Each goes down with two weapons of its own (a primary and a secondary),
// its own way of jumping, a grenade that comes back after a while, and an ultimate that fills as you fight (with
// time, and faster with every kill). G throws the grenade, X calls the ultimate (a controller: LB and up on the
// D-pad; a touch screen: the two round buttons over the jump).
// The grenades hit twice as hard and twice as wide as they first did, and the Wellspring is twice as wide.
//  - Mercenary: quick and sharp-eyed. Avtomat and Longarm. Second Step: jump again in mid-air. Powder Flask: a
//    short fuse, and it goes off at once if it strikes one of them. Dead Reckoning: a heavy pistol for twelve
//    seconds, six shots, each going through every one of them in its line and dropping most of them.
//  - Brute: slow to fall, hard to stop. Blunderbuss and Boarding Axe. Anchor Drop: a higher jump, and jump again in
//    the air to plunge straight down and shake the ground where you land. Scrap Keg: a big, slow blast of nails and
//    scrap that throws them back. Bulwark: fourteen seconds when no knock lands on you, and every pull of the trigger
//    is a quake that hurls back everything in front of you.
//  - Apothecary: keeps the others standing. Duck's-Foot and Flare Pistol. Drift: jump again in the air to float down
//    slowly (for up to three seconds). Brimstone Vial: it bursts into a cloud of green fire that burns and slows the
//    drowned in it, and mends you and your friends standing in it. Wellspring: a ring of green light on the floor
//    for fifteen seconds: inside it you mend quickly, knocks are halved, and anyone down in it gets back up.
// The weapons are the ordinary ones, so the weapon crates' skins dress them and the outfit crates dress you, and
// kills down here count towards both kinds of crate, as everywhere on foot.
// Together (src/zmnet.js): everything is judged on its thrower's screen, as the chest's weapons are. Hits on the
// drowned go to the host through zmHurt (what's knocked back or slowed through zmpStatus), so the host stays the
// judge of who's hurt and who's credited. Each player's presence carries `rc`: their calling, whether their
// ultimate is up, and a short list of what they've just done (a grenade thrown, a Wellspring set down, a quake), so
// the others see it; each player judges for themselves whether a Wellspring or a Brimstone cloud is mending them.
// Hooks (// [classes]): raidLoadout calls rclApply, raidMe calls rclTick; fpsJump (rclJump), fpsShoot (rclShoot),
// fpsHurt (rclHurtK), the controller (rclPad), zmHud (rclHud), zmDrawOver (rclDrawOver), znPresence (rclPresence) and
// znReadPlayers (rclHeard).

const RCLC = { UFILL: 1 / 150, UKILL: 0.025, U_MERC: 12, U_BRUTE: 14, U_APO: 15, SHOTS: 6, WELL_R: 9, CLOUD_R: 6.8, CLOUD_T: 7, DRIFT: 3, SLAM_CD: 3 };
const RCL_ORDER = ['merc', 'brute', 'apo'];
const RCL_CLASSES = {
  merc: { n: 'Mercenary', c: '#6fd3c8', rgb: '111,211,200', tag: 'Quick and sharp-eyed: hits hard from far off, and never where they expect.',
    w: ['avtomat', 'longarm'], gcd: 16,
    jump: ['Second Step', 'Jump again in mid-air.'],
    gren: ['Powder Flask', 'A short fuse, and it bursts at once if it strikes one of them.'],
    ult: ['Dead Reckoning', 'A heavy pistol for twelve seconds: six shots, each through every one of them in its line.'] },
  brute: { n: 'Brute', c: '#e0763f', rgb: '224,118,63', tag: 'Hard to stop: wades in close, and holds the line while the others work.',
    w: ['blunderbuss', 'axe'], gcd: 22,
    jump: ['Anchor Drop', 'A higher jump; jump again in the air to plunge down and shake the ground.'],
    gren: ['Scrap Keg', 'A big, slow blast of nails and scrap that throws them back.'],
    ult: ['Bulwark', 'Fourteen seconds when no knock lands, and every shot is a quake that hurls them back.'] },
  apo: { n: 'Apothecary', c: '#b6d66a', rgb: '182,214,106', tag: 'Keeps the others standing: burns them where they gather, and mends friends.',
    w: ['duckfoot', 'flaregun'], gcd: 20,
    jump: ['Drift', 'Jump again in the air to float down slowly.'],
    gren: ['Brimstone Vial', 'A cloud of green fire: it burns and slows them, and mends friends in it.'],
    ult: ['Wellspring', 'A ring of light for fifteen seconds: mend fast, half the knocks, and the fallen get up.'] },
};
const RCL = { cls: null, run: null, picking: false, gT: 0, uK: 0, ultT: 0, shots: 0, air: 0, drift: 0, slam: false, slamCd: 0, kills: 0,
  proj: [], clouds: [], wells: [], quakes: [], ev: [], eseq: 0, seen: {}, healT: 0, upT: 0, padWas: null, padCur: 0 };
try { const c = localStorage.getItem('skerry-raid-class'); if (RCL_CLASSES[c]) RCL.last = c; } catch (e) {}
Object.assign(ZM_DMG, { M: 1, B: 1, A: 1, U: 1, Q: 1 });
// Maren's End: six knocks to go down instead of three (twelve with Stout Heart), wherever the game asks how many
{ const raid = () => typeof RAID !== 'undefined' && RAID.on;
  Object.defineProperty(ZMC, 'HP', { get: () => raid() ? 6 : 3, configurable: true });
  Object.defineProperty(ZMC, 'HP_STOUT', { get: () => raid() ? 12 : 6, configurable: true }); }
const rclOn = () => typeof RAID !== 'undefined' && RAID.on && FPS.on && FPS.zm;
const rclC = () => RCL_CLASSES[RCL.cls] || null;
const rclHp = () => typeof zmHp === 'function' ? zmHp(Math.max(1, ZM.round || 1)) : 4;
const rclMax = () => ZM.perks && ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
const rclFloor = (x, y, z) => { try { return zmFloorAt(x, y, Math.max(0, z), 0.35); } catch (e) { return 0; } };
const rclMark = () => { FPS.hitT = 0.18; FPS.hitHead = false; try { fpsHitSound(false); } catch (e) {} };

// ---------- the loadout (raidLoadout, at the start, after bleeding out and at each new part) ----------
function rclApply() {
  if (!rclOn()) return;
  if (RCL.run !== FPS.joinedAt) { RCL.run = FPS.joinedAt; RCL.cls = null; rclReset(); }
  if (!RCL.cls) { rclOpenPick(); return; }
  const C = rclC(), m = FPS.me;
  ZM.own = C.w.slice(); ZM.res = {};
  for (const id of ZM.own) { ZM.res[id] = typeof zmpAmmo === 'function' ? zmpAmmo(id) : ZM_AMMO[id] || 0; m.mags[id] = rclMag(id); }
  FPS.weapon = ZM.own[0]; FPS.last = ZM.own[1]; m.ammo = rclMag(FPS.weapon); m.reload = 0; m.cd = 0; FPS.drawT = 0.45; FPS.scoped = false;
}
function rclReset() {
  Object.assign(RCL, { gT: 0, uK: 0, ultT: 0, shots: 0, air: 0, drift: 0, slam: false, slamCd: 0, kills: ZM.kills || 0, proj: [], clouds: [], wells: [], quakes: [], ev: [], seen: {}, healT: 0, upT: 0 });
}
function rclChoose(k) {
  if (!RCL_CLASSES[k]) return;
  if (RCL.cls !== k) Object.assign(RCL, { ultT: 0, shots: 0, gT: 0, air: 0, drift: 0, slam: false });
  RCL.cls = k; RCL.last = k;
  try { localStorage.setItem('skerry-raid-class', k); } catch (e) {}
  rclClosePick();
  rclApply();
  const C = rclC();
  ZM.banner = { text: C.n, t: 3, small: true, col: C.c };
  fpsFeed(`${C.n}: G for ${C.gren[0]}, X for ${C.ult[0]} when it's full.`);
  try { zmSound('buy'); } catch (e) {}
}

// ---------- the picker, over the view ----------
const RCL_ICON = {
  merc: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  brute: '<path d="M12 3v14M7 7h10M5 14c0 4 3 6 7 6s7-2 7-6"/><path d="M5 14l-2 1M19 14l2 1"/>',
  apo: '<path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3"/><path d="M8 15h8"/>',
};
function rclBuildPick() {
  if ($('rclPick')) return $('rclPick');
  const o = document.createElement('div');
  o.className = 'overlay pausecard rcpick'; o.id = 'rclPick'; o.hidden = true;
  o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'rclPickHead');
  const card = document.createElement('div'); card.className = 'card';
  const eb = document.createElement('p'); eb.className = 'eyebrow'; eb.id = 'rclEye'; eb.textContent = 'Maren’s End';
  const h = document.createElement('h1'); h.id = 'rclPickHead'; h.textContent = 'Choose your calling';
  const sub = document.createElement('p'); sub.className = 'muted'; sub.textContent = 'Your weapon skins and your outfit go down with you.';
  const row = document.createElement('div'); row.className = 'rcrow';
  for (const k of RCL_ORDER) {
    const C = RCL_CLASSES[k], b = document.createElement('button');
    b.type = 'button'; b.className = 'rcclass'; b.dataset.k = k; b.style.setProperty('--rc', C.c); b.style.setProperty('--rcr', C.rgb);
    const ic = `<svg viewBox="0 0 24 24" aria-hidden="true">${RCL_ICON[k]}</svg>`;
    const li = (lab, a) => `<li><b>${lab}</b> ${a[0]}<small>${a[1]}</small></li>`;
    b.innerHTML = `${ic}<span class="nm">${C.n}</span><span class="tg">${C.tag}</span><ul>`
      + `<li><b>Primary</b> ${FPSW[C.w[0]].n}</li><li><b>Secondary</b> ${FPSW[C.w[1]].n}</li>`
      + li('Jump', C.jump) + li('Grenade', C.gren) + li('Ultimate', C.ult) + '</ul>';
    b.addEventListener('click', () => { rclChoose(k); try { if (!FPS.touch) cv.requestPointerLock(); } catch (e) {} });
    row.append(b);
  }
  card.append(eb, h, sub, row); o.append(card);
  document.body.append(o);
  return o;
}
function rclOpenPick() {
  const o = rclBuildPick();
  RCL.picking = true; FPS.menu = true; o.hidden = false;
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
  RCL.padCur = Math.max(0, RCL_ORDER.indexOf(RCL.last || 'merc'));
  const bs = [...o.querySelectorAll('.rcclass')];
  bs.forEach((b, i) => b.classList.toggle('last', b.dataset.k === RCL.last));
  setTimeout(() => { const b = bs[RCL.padCur]; if (b) b.focus(); }, 30);
  RCL.padWas = null;
  const loop = () => { if (!RCL.picking) return; rclPickPad(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
function rclClosePick() {
  RCL.picking = false; FPS.menu = false;
  const o = $('rclPick'); if (o) o.hidden = true;
  if (FPS.me) FPS.me.protect = Math.max(FPS.me.protect || 0, 2);
}
// a controller on the picker: left and right, A to choose
function rclPickPad() {
  if (!FPS.on || !FPS.zm) { rclClosePick(); return; }
  if (!FPS.menu) FPS.menu = true;   // (Esc doesn't leave the picker open behind the game)
  if (FPS.me) FPS.me.protect = Math.max(FPS.me.protect || 0, 0.5);   // (together, the night goes on: they leave you be while you choose)
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
  if (!pad) return;
  const now = pad.buttons.map(x => !!(x && x.pressed)), was = RCL.padWas, ax = pad.axes[0] || 0;
  RCL.padWas = now; now.dir = ax > 0.6 ? 1 : ax < -0.6 ? -1 : 0;
  if (!was) return;
  const bs = [...document.querySelectorAll('#rclPick .rcclass')];
  const d = (now[15] && !was[15]) || (now.dir === 1 && was.dir !== 1) ? 1 : (now[14] && !was[14]) || (now.dir === -1 && was.dir !== -1) ? -1 : 0;
  if (d) { RCL.padCur = (RCL.padCur + d + bs.length) % bs.length; bs[RCL.padCur].focus(); }
  if (now[0] && !was[0]) rclChoose(RCL_ORDER[RCL.padCur]);
}

// ---------- each frame (raidMe) ----------
function rclTick(dt) {
  if (!rclOn() || !RCL.cls) return;
  const C = rclC(), m = FPS.me, down = zmIsDown(), dead = m.dead > 0 || ZM.ghost;
  // the meters: the grenade comes back; the ultimate fills with time, and with every kill
  if (RCL.gT > 0) RCL.gT = Math.max(0, RCL.gT - dt);
  if (RCL.ultT <= 0 && !dead) RCL.uK = Math.min(1, RCL.uK + dt * RCLC.UFILL);
  const k = ZM.kills || 0; if (k > RCL.kills) { if (RCL.ultT <= 0) RCL.uK = Math.min(1, RCL.uK + (k - RCL.kills) * RCLC.UKILL); } RCL.kills = k;
  if (RCL.ultT > 0) { RCL.ultT -= dt; if (RCL.ultT <= 0 || (RCL.cls === 'merc' && RCL.shots <= 0) || down || dead) rclUltEnd(); }
  if (RCL.slamCd > 0) RCL.slamCd -= dt;
  // jumping: back on the ground, the air's own moves come back
  const air = (m.jz || 0) > (m.fl || 0) + 0.02 || (m.vz || 0) > 0;
  if (!air) {
    if (RCL.slam) rclQuake(m.x, m.y, m.fl || 0, true);
    RCL.air = 0; RCL.drift = 0; RCL.slam = false;
  } else if (RCL.drift > 0) {
    RCL.drift -= dt; m.vz = Math.max(m.vz, -1.3);
    if (!reduceMotion && Math.random() < dt * 20) FPS.parts.push({ x: m.x + (Math.random() - 0.5) * 0.6, y: m.y + (Math.random() - 0.5) * 0.6, z: FPSC.GROUND + (m.jz || 0) + 0.2, vx: 0, vy: 0, vz: -0.4, t: 0.6, c: C.rgb, up: false });
  } else if (RCL.slam) m.vz = Math.min(m.vz, -16);
  // what's thrown, and what it leaves
  for (const P of RCL.proj) rclProjTick(P, dt);
  RCL.proj = RCL.proj.filter(P => !P.done);
  rclClouds(dt); rclWells(dt);
  for (const q of RCL.quakes) q.t += dt; RCL.quakes = RCL.quakes.filter(q => q.t < 0.7);
  // mending: in a Wellspring (anyone's) or a Brimstone cloud (anyone's)
  if (!dead) {
    const inWell = rclInWell(m.x, m.y, m.jz || 0), inCloud = RCL.clouds.some(c => Math.hypot(m.x - c.x, m.y - c.y) < c.r && Math.abs((m.jz || 0) - c.fz) < 1.5);
    RCL.healT -= dt;
    if ((inWell || inCloud) && !down && m.hp < rclMax() && RCL.healT <= 0) { m.hp = Math.min(rclMax(), m.hp + (inWell ? 1 : 0.5)); RCL.healT = inWell ? 0.6 : 1; FPS.calm = 0; rclTone('mend'); }
    // down in a Wellspring: up again, after a breath
    if (down && inWell && ZM.net) { RCL.upT += dt; if (RCL.upT > 1.5) { RCL.upT = 0; zmnRevive(FPS.me.id); } } else RCL.upT = 0;
  }
  // events not heard of for a few seconds are dropped from what I send
  const now = performance.now(); while (RCL.ev.length && now - RCL.ev[0].at > 3000) RCL.ev.shift();
}
function rclEvent(k, ...a) { const e = [++RCL.eseq, k, ...a.map(v => Math.round(v * 100))]; e.at = performance.now(); RCL.ev.push(e); if (RCL.ev.length > 8) RCL.ev.shift(); }
function rclCan() { const m = FPS.me; return rclOn() && RCL.cls && !RCL.picking && !FPS.menu && !(m.dead > 0) && !zmIsDown() && !ZM.ghost && !ZM.over; }

// ---------- jumping (fpsJump: true if the calling took it) ----------
function rclJump(m, air) {
  if (!rclOn() || !RCL.cls || RCL.picking) return false;
  const k = RCL.cls;
  if (!air) {
    if (k !== 'brute') return false;
    m.vz = FPSC.JUMP * 1.22; m.jz = (m.fl || 0) + 0.001; FPS.landed = 0; rclTone('jump');
    return true;
  }
  if (k === 'merc' && RCL.air < 1) { RCL.air++; m.vz = FPSC.JUMP * 0.95; fpsPuff(m.x, m.y, FPSC.GROUND + (m.jz || 0), '200,230,225', 8); rclTone('jump2'); return true; }
  if (k === 'brute' && !RCL.slam && RCL.slamCd <= 0) { RCL.slam = true; m.vz = -16; rclTone('dive'); return true; }
  if (k === 'apo') { if (RCL.drift > 0) RCL.drift = 0; else if (!RCL.air) { RCL.air = 1; RCL.drift = RCLC.DRIFT; m.vz = Math.max(m.vz, 0.6); rclTone('drift'); } return true; }
  return true;
}
// the Brute's landing (and Bulwark's swing): a ring of shock out from x, y; mine: it hurts (else only to see)
function rclQuake(x, y, fz, mine, ahead) {
  const m = FPS.me, z = FPSC.GROUND + fz;
  RCL.quakes.push({ x, y, z, R: ahead ? 5.5 : 4.2, t: 0 });
  fpsPuff(x, y, z + 0.1, '150,130,110', 18);
  try { zxSound('boom', mine ? 0 : Math.hypot(x - m.x, y - m.y), 4); } catch (e) {}
  if (!mine) return;
  if (!ahead) { RCL.slam = false; RCL.slamCd = RCLC.SLAM_CD; rclEvent('q', x - FPSC.CX, y - FPSC.CY, fz); }
  let any = false;
  for (const o of ZM.z) {
    if (o.dead || Math.abs((o.jz || 0) - fz) > 1.6) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (ahead) { if (d > 5.5 || (d > 0.8 && Math.abs(angDiff(bearingOf(o.x - x, o.y - y), m.h)) > 1.0)) continue; }
    else if (d > 4.2) continue;
    zmHurt(o, rclHp() * (ahead ? 1.15 : 0.8) * (1 - 0.4 * d / 5.5), false, ahead ? 'U' : 'Q', m.id); o.hitT = 0.3; any = true;
    if (d > 0.05 && typeof zmpStatus === 'function') zmpStatus(o, 'kb', (o.x - x) / d * (ahead ? 3 : 2.2), (o.y - y) / d * (ahead ? 3 : 2.2), 0.9);
  }
  if (any) rclMark();
  FPS.landed = 0.3;
}

// ---------- the grenade (G) ----------
function rclGrenade() {
  if (!rclCan() || RCL.gT > 0) return;
  const m = FPS.me, C = rclC(), z = FPSC.GROUND + FPSC.EYE + (m.jz || 0) - 0.2, p = clamp(m.p + 0.22, -1.2, 1.3), sp = RCL.cls === 'brute' ? 13 : 17;
  const cp = Math.cos(p), v = [Math.sin(m.h) * cp * sp, Math.cos(m.h) * cp * sp, Math.sin(p) * sp];
  RCL.gT = C.gcd;
  rclLaunch(RCL.cls, m.x, m.y, z, v[0], v[1], v[2], true, m.id);
  rclEvent('g', m.x - FPSC.CX, m.y - FPSC.CY, z, v[0], v[1], v[2]);
  try { zxSound('throw', 0); } catch (e) {}
}
function rclLaunch(k, x, y, z, vx, vy, vz, mine, by) {
  RCL.proj.push({ k, x: x + vx * 0.03, y: y + vy * 0.03, z, vx, vy, vz, t: 0, fuse: k === 'merc' ? 1.3 : k === 'brute' ? 1.9 : 3, mine, by, spin: 0 });
}
function rclProjTick(P, dt) {
  P.t += dt; P.spin += dt * 12;
  if (P.t >= P.fuse) { rclBurst(P); return; }
  if (!reduceMotion && Math.random() < dt * 30) FPS.parts.push({ x: P.x, y: P.y, z: P.z, vx: 0, vy: 0, vz: 0.3, t: 0.4, c: P.k === 'apo' ? '160,220,90' : '255,200,120', up: true });
  const steps = 4, s = dt / steps;
  for (let i = 0; i < steps && !P.done; i++) {
    const ox = P.x, oy = P.y, oz = P.z;
    P.vz -= 14 * s; P.x += P.vx * s; P.y += P.vy * s; P.z += P.vz * s;
    const seg = Math.hypot(P.x - ox, P.y - oy, P.z - oz);
    const tg = P.mine && P.k !== 'brute' ? ZM.z.filter(q => !q.dead) : [];
    const r = fpsRay(ox, oy, oz, bearingOf(P.vx, P.vy), Math.atan2(P.vz, Math.max(0.01, Math.hypot(P.vx, P.vy))), P.by, tg, seg + 0.05);
    const fl = FPSC.GROUND + rclFloor(P.x, P.y, P.z - FPSC.GROUND);
    if (r.kind === 'body') { P.x = r.x; P.y = r.y; P.z = r.z; rclBurst(P); return; }
    // (a floor that's a solid, such as a pier's deck or a stair, is found by the ray like a wall: going down onto
    //  it, it's a floor)
    const deck = r.kind !== 'none' && r.kind !== 'ground' && P.vz < 0 && r.z - (FPSC.GROUND + rclFloor(r.x, r.y, r.z - FPSC.GROUND + 0.3)) < 0.35;
    if (deck) {
      if (P.k === 'apo') { P.x = r.x; P.y = r.y; P.z = r.z; rclBurst(P); return; }
      P.x = r.x; P.y = r.y; P.z = r.z + 0.03; P.vz = Math.abs(P.vz) > 2 ? -P.vz * 0.35 : 0; P.vx *= 0.6; P.vy *= 0.6; if (Math.abs(P.vz) > 1) rclTone('tink', P);
    } else if (r.kind !== 'none' && r.kind !== 'ground') {
      if (P.k === 'apo') { P.x = ox; P.y = oy; P.z = oz; rclBurst(P); return; }
      P.x = ox; P.y = oy; P.z = oz; P.vx *= -0.4; P.vy *= -0.4; rclTone('tink', P);
    } else if (P.z < fl) {
      if (P.k === 'apo') { P.z = fl; rclBurst(P); return; }
      P.z = fl + 0.01; P.vz = Math.abs(P.vz) > 2 ? -P.vz * 0.35 : 0; P.vx *= 0.6; P.vy *= 0.6; if (Math.abs(P.vz) > 1) rclTone('tink', P);
    }
  }
  if (Math.hypot(P.x - FPSC.CX, P.y - FPSC.CY) > FPSC.R + 20 || P.z < -400) P.done = true;
}
function rclBurst(P) {
  P.done = true;
  const fz = rclFloor(P.x, P.y, P.z - FPSC.GROUND);
  if (P.k === 'merc') zxBoom(P.x, P.y, P.z + 0.2, 7.2, rclHp() * 3.2, 'M', P.mine, 0.8);
  else if (P.k === 'brute') zxBoom(P.x, P.y, P.z + 0.3, 10.4, rclHp() * 2.6, 'B', P.mine, 2.4);
  else {
    RCL.clouds.push({ x: P.x, y: P.y, fz, r: RCLC.CLOUD_R, t: RCLC.CLOUD_T, k: 0.1, mine: P.mine, seed: Math.random() * 100 });
    fpsPuff(P.x, P.y, P.z, '170,230,100', 16);
    try { zxSound('burst', P.mine ? 0 : Math.hypot(P.x - FPS.me.x, P.y - FPS.me.y)); } catch (e) {}
  }
}
function rclClouds(dt) {
  for (const c of RCL.clouds) {
    c.t -= dt; c.k -= dt;
    const fade = Math.min(1, c.t / 1.2);
    if (!reduceMotion && Math.random() < dt * 36 * fade) { const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * c.r; FPS.parts.push({ x: c.x + Math.sin(a) * rr, y: c.y + Math.cos(a) * rr, z: FPSC.GROUND + c.fz + 0.15, vx: 0, vy: 0, vz: 0.8 + Math.random() * 0.8, t: 0.9, c: Math.random() < 0.5 ? '150,220,80' : '210,240,140', up: true }); }
    if (!c.mine || c.k > 0) continue;
    c.k = 0.4;
    for (const o of ZM.z) {
      if (o.dead || Math.abs((o.jz || 0) - c.fz) > 1.4 || Math.hypot(o.x - c.x, o.y - c.y) > c.r + 0.25) continue;
      o.hitT = 0.12; zmHurt(o, rclHp() * 0.18, false, 'A', FPS.me.id);
      if (typeof zmpStatus === 'function') zmpStatus(o, 'slow', 0.6);
    }
  }
  RCL.clouds = RCL.clouds.filter(c => c.t > 0);
}

// ---------- the ultimate (X) ----------
function rclUlt() {
  if (!rclCan() || RCL.uK < 1 || RCL.ultT > 0) return;
  const m = FPS.me, C = rclC();
  RCL.uK = 0;
  if (RCL.cls === 'apo') {
    const fz = m.fl || 0;
    RCL.wells.push({ x: m.x, y: m.y, fz, t: RCLC.U_APO, T: RCLC.U_APO, k: 0, mine: true, by: m.id });
    rclEvent('w', m.x - FPSC.CX, m.y - FPSC.CY, fz);
  } else {
    RCL.ultT = RCL.cls === 'merc' ? RCLC.U_MERC : RCLC.U_BRUTE; RCL.shots = RCLC.SHOTS;
    rclEvent('u');
    FPS.scoped = false;
  }
  ZM.banner = { text: C.ult[0], t: 2.5, col: C.c };
  rclTone('ult');
}
function rclUltEnd() { RCL.ultT = 0; RCL.shots = 0; FPS.drawT = 0.35; }
// (fpsShoot) the Mercenary's pistol or the Brute's quake in place of the weapon in hand: true if it took the pull
function rclShoot() {
  if (!rclOn() || RCL.ultT <= 0 || RCL.cls === 'apo') return false;
  const m = FPS.me;
  if (m.dead > 0 || FPS.menu || m.cd > 0 || FPS.heldFire) return true;
  FPS.heldFire = true; m.protect = 0;
  const ex = m.x, ey = m.y, ez = FPSC.GROUND + FPSC.EYE + (m.jz || 0);
  if (RCL.cls === 'merc') {
    m.cd = 0.32; RCL.shots--; FPS.recoil = 1.8; FPS.meFlashT = 0.08;
    const r = zxPierce(ex, ey, ez, m.h, m.p, m.id, 300, 9, 0), end = r.end;
    let any = false, head = false;
    for (const h of r.hits) { zmHurt(h.o, rclHp() * (h.head ? 2.4 : 1.5), h.head, 'U', m.id); h.o.hitT = 0.25; any = true; head = head || h.head; fpsPuff(h.x, h.y, h.z, '255,220,140', 6); }
    FPS.tracers.push({ a: [ex + Math.sin(m.h) * 0.6, ey + Math.cos(m.h) * 0.6, ez - 0.25], b: [end.x, end.y, end.z], t: 0.18, k: 'l' });
    if (any) { FPS.hitT = 0.18; FPS.hitHead = head; try { fpsHitSound(head); } catch (e) {} }
    try { fpsWeaponSound('l', 0, 0); } catch (e) {}
    if (typeof zmnShot === 'function') zmnShot('l', m.h, m.p);
    if (RCL.shots <= 0) rclUltEnd();
  } else {
    m.cd = 0.6; FPS.recoil = 1.2;
    rclQuake(ex + Math.sin(m.h) * 1.6, ey + Math.cos(m.h) * 1.6, m.fl || 0, true, true);
    rclEvent('q', ex + Math.sin(m.h) * 1.6 - FPSC.CX, ey + Math.cos(m.h) * 1.6 - FPSC.CY, m.fl || 0);
  }
  return true;
}
// Maren's End: the guns that load one round at a time take more there (and a little longer to load them all):
// mag, the rounds to a load (never fewer than a reforged one's); rk, how much longer the load takes. The Punt Gun stays
// one enormous load.
const RCL_MAG = { blunderbuss: { mag: 3, rk: 1.6 }, longarm: { mag: 2, rk: 1.15 }, harpoon: { mag: 2, rk: 1.2 }, flaregun: { mag: 2, rk: 1.2 },
  bomblance: { mag: 2, rk: 1.2 }, grapnel: { mag: 2, rk: 1.15 }, netmortar: { mag: 2, rk: 1.2 }, chainshot: { mag: 2, rk: 1.2 },
  duckfoot: { mag: 6, rk: 0.67 } };
// (the Apothecary's Duck's-Foot) six volleys a load, loaded in a third less time, and 72 in reserve, down here only
{ const df = ZM_AMMO.duckfoot; Object.defineProperty(ZM_AMMO, 'duckfoot', { get: () => typeof RAID !== 'undefined' && RAID.on ? 72 : df, enumerable: true, configurable: true }); }
const RCL_WC = new WeakMap();
function rclW(w, id) {
  const M = RCL_MAG[id]; if (!M || w.melee || !rclOn()) return w;
  let o = RCL_WC.get(w); if (!o) { o = Object.assign({}, w, { mag: Math.max(w.mag, M.mag), reload: w.reload * M.rk }); RCL_WC.set(w, o); }
  return o;
}
const rclMag = id => zmMag(id);
// (zmReloadK) in Maren's End the blunderbuss loads 30% quicker, whoever carries it
function rclReloadK() { return rclOn() && FPS.weapon === 'blunderbuss' ? 0.7 : 1; }
// (fpsHurt) a knock coming: Bulwark stops it, a Wellspring halves it
function rclHurtK(n) {
  if (!rclOn() || !RCL.cls) return n;
  const m = FPS.me;
  if (RCL.cls === 'brute' && RCL.ultT > 0) { fpsPuff(m.x, m.y, FPSC.GROUND + (m.jz || 0) + 1.2, '255,170,110', 5); return 0; }
  if (rclInWell(m.x, m.y, m.jz || 0)) return n * 0.5;
  return n;
}
function rclInWell(x, y, jz) { return RCL.wells.some(w => Math.hypot(x - w.x, y - w.y) < RCLC.WELL_R && Math.abs(jz - w.fz) < 2); }
function rclWells(dt) {
  for (const w of RCL.wells) {
    w.t -= dt; w.k -= dt;
    if (!reduceMotion && Math.random() < dt * 24) { const a = Math.random() * 6.283, rr = RCLC.WELL_R * (0.85 + Math.random() * 0.15); FPS.parts.push({ x: w.x + Math.sin(a) * rr, y: w.y + Math.cos(a) * rr, z: FPSC.GROUND + w.fz + 0.1, vx: 0, vy: 0, vz: 1.4, t: 1.1, c: '200,240,150', up: true }); }
    // (whoever set it down slows the drowned walking through it)
    if (w.mine && w.k <= 0) { w.k = 0.5; for (const o of ZM.z) if (!o.dead && Math.hypot(o.x - w.x, o.y - w.y) < RCLC.WELL_R && typeof zmpStatus === 'function') zmpStatus(o, 'slow', 0.8); }
  }
  RCL.wells = RCL.wells.filter(w => w.t > 0);
}

// ---------- the controls ----------
// G (or Q) the grenade, X the ultimate; Q is still the last weapon outside Maren's End
Object.assign(ZM_KEYS, { KeyG: rclGrenade, KeyX: rclUlt, KeyQ: () => { if (rclOn()) rclGrenade(); else zmLastWeapon(); } });
// (fpsInput, a controller in the Lighthouse engine) LB the grenade, RB (or up on the D-pad) the ultimate
function rclPad(b, was) { if (!rclOn()) return; if (b(4) && !was[4]) rclGrenade(); if ((b(5) && !was[5]) || (b(12) && !was[12])) rclUlt(); }
{
  const cl = document.querySelector('#fpsPad .fpsfirecluster');
  if (cl) for (const [id, cls, lab, fn, svg] of [['rclPadG', 'g', 'Throw your grenade', rclGrenade, '<circle cx="12" cy="14" r="6"/><path d="M12 8V5M10 5h4M15 6l3-2"/>'], ['rclPadU', 'u', 'Call your ultimate', rclUlt, '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>']]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fpsico rcpadbtn'; b.id = id; b.setAttribute('aria-label', lab);
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>`;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
    cl.prepend(b);
  }
}

// ---------- together (src/zmnet.js) ----------
function rclPresence(z) {
  if (!rclOn() || !RCL.cls) return;
  z.rc = [RCL_ORDER.indexOf(RCL.cls), RCL.ultT > 0 ? 1 : 0, RCL.ev.slice(-6)];
}
function rclHeard(r, z) {
  if (!rclOn()) return;
  if (!Array.isArray(z.rc)) { r.rc = null; return; }
  const k = RCL_ORDER[z.rc[0] | 0] || null, was = r.rclU;
  r.rc = k; r.rclU = !!z.rc[1];
  if (r.rclU && !was && k && k !== 'apo') fpsFeed(`${r.n}: ${RCL_CLASSES[k].ult[0]}.`);
  const last = RCL.seen[r.id] || 0, CX = FPSC.CX, CY = FPSC.CY;
  if (Array.isArray(z.rc[2])) for (const e of z.rc[2]) {
    if (!Array.isArray(e) || !(e[0] > last)) continue;
    RCL.seen[r.id] = Math.max(RCL.seen[r.id] || 0, e[0]);
    const a = e.slice(2).map(v => (+v || 0) / 100);
    if (e[1] === 'g' && k && a.length >= 6) rclLaunch(k, CX + a[0], CY + a[1], a[2], clamp(a[3], -30, 30), clamp(a[4], -30, 30), clamp(a[5], -30, 30), false, r.id);
    else if (e[1] === 'w' && a.length >= 3) { RCL.wells.push({ x: CX + a[0], y: CY + a[1], fz: a[2], t: RCLC.U_APO, T: RCLC.U_APO, k: 0, mine: false, by: r.id }); fpsFeed(`${r.n} set down a Wellspring.`); }
    else if (e[1] === 'q' && a.length >= 3) rclQuake(CX + a[0], CY + a[1], a[2], false);
  }
}

// ---------- sounds ----------
function rclTone(k, P) {
  try {
    if (soundOff()) return;
    const v = P ? Math.max(0.05, 1 - Math.hypot(P.x - FPS.me.x, P.y - FPS.me.y) / 40) : 1;
    if (k === 'jump') noise('lowpass', 380, 1, 0.01, 0.16, 0.18);
    else if (k === 'jump2') { noise('bandpass', 1400, 2, 0.005, 0.12, 0.16, { to: 2400 }); tone(520, 'sine', 0.005, 0.05, 0.14, { to: 780 }); }
    else if (k === 'dive') { noise('lowpass', 600, 1, 0.01, 0.2, 0.3, { to: 200 }); tone(140, 'sawtooth', 0.01, 0.08, 0.3, { to: 60 }); }
    else if (k === 'drift') { tone(660, 'sine', 0.05, 0.05, 0.6, { to: 880 }); noise('highpass', 3000, 0.8, 0.1, 0.04, 0.8); }
    else if (k === 'tink') tone(900 + Math.random() * 300, 'triangle', 0.001, 0.06 * v, 0.08);
    else if (k === 'mend') { tone(740, 'sine', 0.02, 0.05, 0.35, { to: 990 }); tone(1110, 'sine', 0.05, 0.03, 0.3); }
    else if (k === 'ult') { tone(110, 'sawtooth', 0.02, 0.18, 0.9, { to: 220 }); tone(330, 'sine', 0.05, 0.12, 1.0, { to: 440 }); noise('bandpass', 900, 1.5, 0.05, 0.15, 0.8, { to: 1800 }); }
  } catch (e) {}
}

// ---------- painted over the view ----------
function rclDrawOver() {
  if (!rclOn()) return;
  const G0 = FPSC.GROUND, tm = FPS.g ? FPS.g.t : 0, m = FPS.me;
  const ringPts = (x, y, z, r, n) => { const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * 6.283; pts.push([x + Math.sin(a) * r, y + Math.cos(a) * r, z]); } return pts; };
  const stroke = (pts, col, lw, fill) => { const p = polyProj(pts); if (p.length < 2) return; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const q of p.slice(1)) ctx.lineTo(q.x, q.y); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); };
  ctx.save(); ctx.lineCap = 'round';
  for (const c of RCL.clouds) { const f = Math.min(1, c.t / 1.2), z = G0 + c.fz + 0.04; stroke(ringPts(c.x, c.y, z, c.r * (0.96 + 0.04 * Math.sin(tm * 3 + c.seed)), 24), `rgba(180,235,110,${0.6 * f})`, 2, `rgba(120,200,60,${0.14 * f})`); }
  for (const w of RCL.wells) {
    const f = Math.min(1, w.t / 1.5) * Math.min(1, (w.T - w.t) / 0.4), z = G0 + w.fz + 0.05, pulse = 0.75 + 0.25 * Math.sin(tm * 4);
    stroke(ringPts(w.x, w.y, z, RCLC.WELL_R, 32), `rgba(220,250,170,${0.85 * f * pulse})`, 3, `rgba(150,220,90,${0.12 * f})`);
    stroke(ringPts(w.x, w.y, z + 0.02, RCLC.WELL_R * (0.3 + 0.7 * ((tm * 0.6) % 1)), 24), `rgba(220,250,170,${0.35 * f})`, 1.5);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + tm * 0.3, x = w.x + Math.sin(a) * RCLC.WELL_R, y = w.y + Math.cos(a) * RCLC.WELL_R; stroke([[x, y, z], [x, y, z + 1.4 + 0.3 * Math.sin(tm * 3 + i)]], `rgba(210,250,160,${0.45 * f})`, 2); }
  }
  for (const q of RCL.quakes) { const k = q.t / 0.7; stroke(ringPts(q.x, q.y, q.z + 0.05, q.R * (0.2 + 0.8 * k), 28), `rgba(255,190,130,${0.8 * (1 - k)})`, 3); }
  for (const P of RCL.proj) {
    const c = cam(P.x, P.y, P.z); if (c.f < 0.4) continue;
    const q = proj(c), s = Math.max(2, (P.k === 'brute' ? 0.16 : 0.09) * q.s), col = RCL_CLASSES[P.k].rgb;
    const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s * 4); gr.addColorStop(0, `rgba(${col},0.6)`); gr.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, s * 4, 0, 6.283); ctx.fill();
    ctx.fillStyle = P.k === 'brute' ? '#5a3e24' : P.k === 'apo' ? '#cfe89a' : '#3a3a40'; ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, 6.283); ctx.fill();
  }
  // the others' callings: a mark over each, in its colour (lit while their ultimate is up)
  for (const r of FPS.remote.values()) {
    if (!r.rc || r.dead || r.x == null) continue;
    const C = RCL_CLASSES[r.rc], c = cam(r.x, r.y, G0 + (r.jz || 0) + 2.25); if (c.f < 0.6 || c.f > 60) continue;
    const q = proj(c), s = clamp(q.s * 0.09, 4, 9);
    ctx.fillStyle = `rgba(${C.rgb},${r.rclU ? 0.7 + 0.3 * Math.sin(tm * 10) : 0.8})`;
    ctx.beginPath(); ctx.moveTo(q.x, q.y - s); ctx.lineTo(q.x + s, q.y); ctx.lineTo(q.x, q.y + s); ctx.lineTo(q.x - s, q.y); ctx.closePath(); ctx.fill();
    if (r.rclU) { ctx.strokeStyle = `rgba(${C.rgb},0.6)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, s * 2, 0, 6.283); ctx.stroke(); }
  }
  ctx.restore();
}

// ---------- on top: the calling, its grenade and its ultimate (bottom left, where the rounds are elsewhere) ----------
function rclHud(phone, mono, fell) {
  if (!rclOn() || !RCL.cls || zmSpecOn()) return;
  const C = rclC(), t = g.t, L = Math.max(14, FPS.safeLeft || 0), rb = phone ? zmLeftRb() : H - 22, r = phone ? 15 : 19;
  // the ultimate running: the edges lit in its colour
  if (RCL.ultT > 0) {
    const gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.3, cx, H / 2, Math.max(W, H) * 0.7);
    gr.addColorStop(0, `rgba(${C.rgb},0)`); gr.addColorStop(1, `rgba(${C.rgb},${0.22 + 0.06 * Math.sin(t * 6)})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 12 : 14); ctx.fillStyle = C.c;
    ctx.fillText(`${C.ult[0].toUpperCase()} ${RCL.cls === 'merc' ? RCL.shots + ' SHOTS · ' : ''}${Math.ceil(RCL.ultT)}`, cx, H / 2 + 62);
  }
  const meter = (x, y, k, ready, key, lab) => {
    ctx.fillStyle = 'rgba(8,10,14,0.6)'; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(80,70,60,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = ready ? C.c : `rgba(${C.rgb},0.55)`; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + 6.283 * clamp(k, 0, 1)); ctx.stroke();
    if (ready) { ctx.fillStyle = `rgba(${C.rgb},${0.18 + 0.12 * Math.sin(t * 5)})`; ctx.beginPath(); ctx.arc(x, y, r - 3, 0, 6.283); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 11 : 13); ctx.fillStyle = ready ? '#f4ecd8' : 'rgba(236,228,207,0.55)';
    ctx.fillText(phone ? '' : key, x, y + 1);
    ctx.font = mono(phone ? 8 : 9); ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText(lab, x, y + r + 12);
  };
  const y = rb - r - 14, x0 = L + (phone ? 34 : 42), x1 = x0 + (phone ? 70 : 92);
  meter(x0, y, 1 - RCL.gT / C.gcd, RCL.gT <= 0, 'G', C.gren[0].toUpperCase());
  meter(x1, y, RCL.ultT > 0 ? 1 : RCL.uK, RCL.uK >= 1 || RCL.ultT > 0, 'X', C.ult[0].toUpperCase());
  // (the calling's name beside them, clear of the points over them)
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = fell(phone ? 14 : 18); ctx.fillStyle = C.c;
  ctx.fillText(C.n, x1 + r + 16, y);
  // (the touch buttons: lit when ready)
  const bg = $('rclPadG'), bu = $('rclPadU');
  if (bg) bg.classList.toggle('on', RCL.gT <= 0); if (bu) bu.classList.toggle('on', RCL.uK >= 1);
}
// (raidStop, or leaving) put the picker away
addEventListener('pagehide', () => rclClosePick());
setInterval(() => { if (RCL.picking && !(FPS.on && FPS.zm && rclOn())) rclClosePick(); const s = $('stage'); if (s) s.classList.toggle('rcmode', !!(rclOn() && RCL.cls)); }, 500);
