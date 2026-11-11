// Maren's End: a raid, a fifth game of its own (its own card on the title screen, its own lobby, its own line on the
// scoreboard, and the weapon and outfit crates of Wreckers' Night and the Lighthouse), played alone or by up to four together on the Lighthouse's engine (src/zombies.js, and
// src/zmnet.js for playing together: the host's browser runs it, as a night at the Lighthouse).
//
// The Hollow Sea: the sea round the Light has drained away. Where it was is a dry bed of cracked salt and old wrecks, and a long pier
// running out over it to a hole: the Swallow, where the water went. The raid goes down it, in parts (stages):
//  I.  The Swallow (RAID_STAGES.descent, here): along the Long Pier, off its end and down the Swallow (a fall of
//      about thirty seconds), and along the Deep Path at the bottom: dark, and the dark drains you. Every one of you
//      carries Maren's Lantern, the storm lantern she took out to the Gannet; hold Use at a brazier to light it with
//      it. Inside a lit brazier's light you mend (and your ammunition is made up); outside it, the dark takes your
//      health away a little at a time, until you're down. The drowned down here glow, and they come for you out of
//      the black. At the end of the path a door glows in the rock: it opens once twenty of them have been sent back
//      inside the ring in front of it. Through it, the next part.
//  II. and on: their own files (each registers itself in RAID_STAGES and adds its key to RAID_ORDER).
//
// How a stage plugs in (RAID_STAGES[key], every hook optional but set):
//   n          its name ('The Swallow')
//   map        what src/zombies.js's ZM_MAPS needs: { start: [x, y] (from the island's middle), top (the height you
//              start at), zones (as ZM_MAPS), nav ([x0, x1, y0, y1], the grid the drowned walk by) }
//   set(H, K, Z)  lays out its world (H: src/fpsisle.js's laying-out tools; K: src/zombies.js's zmKit; Z: I.zm)
//   enter()    its state made fresh (RAID.st), on everyone's side, once the world is laid out
//   tick(dt)   alone or hosting: the drowned, its goals            me(dt)   everyone: your own side of it
//   pack(o)    hosting: its state into the host's word (o)        apply(o) joined: the host's word of it
//   q(sid, k, a)  hosting: what a joined player asked of it (they call raidAsk(k, a))
//   kill(d, how, by)  hosting: one of the drowned sent back (d.x, d.y: where)
//   hurt(d, dmg, code, by)  how much a hit does (return it)       block(x, y, pad, feet)  more in the way
//   consider(c) / prompt(o) / use(o)   what's in front of you, as src/zombies.js's zmNearest, zmPrompt, zmUse
//   hud(phone, mono, fell)  painted on top                       b3(grp) / f3(dt)  its 3D: built, and each frame
//   players(P)  who the drowned can come after (default: all)     exit()  leaving it
//   shot(x, y, z, lh, lp, by)  a shot of yours                   mend   true: you mend by yourself, as at the Lighthouse
//   map.isle / map.shore  its own look (FPS_ISLES, FPI_GEN) and sea line, if not the cave's
// And for any stage to call: raidNextStage() (hosting or alone: on to the next part; past the last, won), raidWin()
// (won outright: the last boss down), raidBossDamage(n) (damage you did to a boss, counted on your own side, for the
// scoreboard), raidSpawnAt(x, y, o) (hosting: one of the drowned, already in, rising out of the ground), raidAsk(k, a).
// The scoreboard (src/scores.js, game 'raid'): the best time through every part (only when the raid is won), the most
// damage done to its bosses in one raid, and the drowned sent back in all your raids.
// The world of each stage is laid out afresh, centred on the island's middle (radius FPSC.R, 88 m): raidNextStage
// (hosting or alone) lays out the next, and everyone follows the stage number in the host's word. Past the last, the
// raid is won.

const RAID = { on: false, stage: 0, won: false, st: {}, t: 0, boss: 0, told: false, sta: 1, tired: false };
const RAID_STAGES = {};
const RAID_ORDER = ['descent'];
const raidStage = () => RAID.on ? RAID_STAGES[RAID_ORDER[RAID.stage]] || null : null;
const raidCall = (k, ...a) => { const S = raidStage(); return S && typeof S[k] === 'function' ? S[k](...a) : undefined; };
// joined: ask the host something of the stage (k, and a with it); hosting or alone, it's done straight away
function raidAsk(k, a) { if (ZM.net === 'client') zmnRequest('raid', [k, a]); else raidCall('q', FPS.me.id, k, a); }

// ---------- the map, as src/zombies.js sees it ----------
ZM_MAPS.raid = { n: 'Maren’s End', N: 'Maren’s End', isle: 'raid', tower: false, noBox: [], zones: {}, start: [0, -82], top: 0, seed: 0x5a11c, raid: true,
  blurb: 'A raid in parts, alone or up to four: down the Swallow, where the sea went.',
  land: n => `The Long Pier, out over the dry bed of the sea${n ? ', ' + n + ' of you' : ''}. At its end, the Swallow.`,
  shore: () => -999, nav: [-80, 80, -80, 80] };
FPS_ISLES.raid = { name: 'the Hollow Sea', ground: '#2a2826', ground2: '#1e1d1c', wet: '#161616', path: '#34312c', tint: 0.1, mound: 0, dune: 0,
  rocks: [0, 3, 6, 1], wrecks: [0], tintRock: null, sky: '60,60,80', skyA: 0.04, fog: ['#050608', 6, 70], mist: '30,30,40', mistA: 0.02,
  birds: ['bat', 0], tufts: ['#333', 0], pebbles: 0, pools: 0, wrack: 0, indoor: true, nLights: 8 };
FPI_GEN.raid = {
  built: true,
  set(H) {
    const S = RAID_STAGES[RAID_ORDER[RAID.stage]] || RAID_STAGES[RAID_ORDER[0]];
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    S.set(H, zmKit(H, Z), Z);
  },
  decor() {},
};
// the stage's map into ZM_MAPS.raid (before src/zombies.js lays it out)
function raidMapFor(i) {
  const S = RAID_STAGES[RAID_ORDER[i]], D = ZM_MAPS.raid, M = S.map || {};
  D.zones = M.zones || {}; D.start = (M.start || [0, 0]).slice(); D.top = M.top || 0; D.nav = M.nav || [-80, 80, -80, 80];
  // (its own look and sea, if it has them: a part out in the open lays itself out from its own FPI_GEN, as FPI_GEN.raid)
  D.isle = M.isle || 'raid'; D.shore = M.shore || (() => -999);
  D.seed = 0x5a11c + i * 977;
}

// ---------- starting, and each frame ----------
// (zmStart, before it lays out the map) is this the raid?
function raidBegin(map) {
  RAID.on = map === 'raid';
  if (!RAID.on) return;
  Object.assign(RAID, { stage: 0, won: false, st: {}, t: 0, boss: 0, told: false, sta: 1, tired: false });
  raidMapFor(0);
}
// (zmStart, once it's all laid out) your kit, and the stage's state
function raidAfterStart() {
  if (!RAID.on) return;
  ZM.phase = 'raid'; ZM.t = 0; ZM.round = RAIDC.ROUND; ZM.open = new Set(['raid']);
  { const e = document.querySelector('#fpsMenu .eyebrow'); if (e) e.textContent = 'Maren’s End'; $('fpsLeave').textContent = 'Leave the raid'; $('fpsResume').textContent = 'Back to the raid'; }
  $('zmAgain').textContent = ZM.net ? 'Back to the lobby' : 'Go down again';
  raidLoadout();
  RAID.st = {}; raidCall('enter');
}
const RAIDC = { ROUND: 4, CALM: 0.7, BOSS_HP: 1.15 };   // (BOSS_HP: every boss's strength here, against the Lighthouse's)
// what you carry down: a pepperbox and a blunderbuss, both full (and Maren's Lantern, which never leaves your hand)
function raidLoadout() {
  const m = FPS.me;
  ZM.own = ['pepperbox', 'blunderbuss']; ZM.res = { pepperbox: ZM_AMMO.pepperbox, blunderbuss: ZM_AMMO.blunderbuss };
  for (const id of ZM.own) m.mags[id] = FPSW[id].mag;
  FPS.weapon = 'pepperbox'; FPS.last = 'blunderbuss'; m.ammo = FPSW.pepperbox.mag; m.reload = 0; FPS.drawT = 0.45;
  if (typeof rclApply === 'function') rclApply();   // [classes] src/rclass.js: your class's weapons and abilities instead
}
// anyone who bled out comes back (beside someone standing), with the raid's kit
function raidRespawn() { if (!ZM.ghost) return; zmRoundBegins(); raidLoadout(); fpsFeed('You’re back on your feet.'); }
function raidStop() {
  if (RAID.on) raidCall('exit');
  RAID.on = false;
  if (typeof GL3D !== 'undefined' && GL3D.scene && RAID.fog0) { GL3D.scene.fog = null; RAID.fog0 = null; }
}
// alone or hosting, each frame
function raidHostTick(dt) { RAID.t += dt; raidCall('tick', dt); }
// everyone, each frame
// Stamina: a full bar is RUN seconds of sprinting, and an empty one fills again in FILL seconds (it fills whenever
// you're not sprinting). Run it dry and you're out of breath: no sprinting until it's back to BACK of the bar.
// fpsInput asks raidStamina each frame whether you may sprint; the bar sits beside your health (zmHud, raidStaminaHud).
const RSTA = { RUN: 10, FILL: 15, BACK: 0.25 };
function raidStamina(run, dt) {
  if (!RAID.on) return run;
  if (RAID.sta == null) RAID.sta = 1;
  if (run && !RAID.tired) {
    RAID.sta = Math.max(0, RAID.sta - dt / RSTA.RUN);
    if (RAID.sta <= 0) { RAID.tired = true; FPS.padRun = false; fpsFeed('Out of breath. You can’t sprint until you get it back.'); }
    return true;
  }
  RAID.sta = Math.min(1, RAID.sta + dt / RSTA.FILL);
  if (RAID.tired && RAID.sta >= RSTA.BACK) RAID.tired = false;
  return false;
}
// (zmHud) the stamina bar, to the right of the health bar and the same size, with its name over it as health has
function raidStaminaHud(x, by, bw, bh, phone, mono) {
  if (!RAID.on) return;
  const k = clamp(RAID.sta == null ? 1 : RAID.sta, 0, 1), tired = RAID.tired, t = g.t;
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x - 3, by - 3, bw + 6, bh + 6);
  ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(x, by, bw, bh);
  ctx.fillStyle = tired ? `rgba(200,120,90,${0.7 + 0.25 * Math.sin(t * 7)})` : k < 0.25 ? '#e4c46a' : '#8fc8e8'; ctx.fillRect(x, by, bw * k, bh);
  // (a notch where you get your breath back)
  if (tired) { ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillRect(x + bw * RSTA.BACK - 1, by - 2, 2, bh + 4); }
  ctx.font = mono(phone ? 9 : 10); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = tired ? '#e8a080' : 'rgba(236,228,207,0.65)';
  ctx.fillText(tired ? 'OUT OF BREATH' : 'STAMINA', x, by - 3);
  ctx.textBaseline = 'alphabetic';
}
// how fast you can go, as a share of your own pace (zmSpeedK): a stage's own say, Maren's Weight in the Swallow
function raidSpeedK() { if (!RAID.on) return 1; const S = raidStage(); return S && S.speedK ? S.speedK() : 1; }
function raidMe(dt) {
  // (a joined player's own clock for the raid, between the host's words, so what swings on it swings smoothly)
  RAID.ct = ZM.net === 'client' ? (Math.abs((RAID.ct || 0) + dt - RAID.t) > 0.4 ? RAID.t : (RAID.ct || 0) + dt) : RAID.t;
  raidCall('me', dt);
  if (typeof rclTick === 'function') rclTick(dt);   // [classes] src/rclass.js
  // joined: the host's world has moved on to the next part
}
// who the drowned can come after
function raidPlayers(P) { const r = raidCall('players', P); return r || P; }
// hosting: a joined player's ask
function raidRequest(sid, a) { if (Array.isArray(a)) raidCall('q', sid, String(a[0]), a[1]); }
// hosting: one sent back
function raidKill(d, how, by) { if (RAID.on) raidCall('kill', d, how, by); }
function raidHurtK(d, dmg, code, by) { if (!RAID.on) return dmg; const r = raidCall('hurt', d, dmg, code, by); return r == null ? dmg : r; }
function raidBlock(x, y, pad, feet) { if (!RAID.on) return false; const S = raidStage(); return !!(S && S.block && S.block(x, y, pad, feet)); }
function raidConsider(c) { if (RAID.on) raidCall('consider', c); }
function raidPrompt(o) { return RAID.on ? raidCall('prompt', o) || null : null; }
function raidUse(o) { return RAID.on ? !!raidCall('use', o) : false; }
// (zmResolveShot) a shot of yours, along (lh, lp) from (x, y, z)
function raidShot(x, y, z, lh, lp, by) { if (RAID.on) raidCall('shot', x, y, z, lh, lp, by); }

// ---------- the parts, one after another ----------
// alone or hosting: on to the next part, or (past the last) the raid is won
function raidNextStage() {
  if (!RAID.on || ZM.net === 'client' || ZM.over) return;
  if (RAID.stage + 1 >= RAID_ORDER.length) { raidWin(); return; }
  raidUseStage(RAID.stage + 1);
}
// lay out part i and put everyone at its start (everyone runs this: the host, then each joined player on its word)
function raidUseStage(i) {
  raidCall('exit');
  for (const z of ZM.z) if (z.mdl) zmFreeModel(z);
  ZM.z = []; FPS.drowned = ZM.z; ZM.drops = [];
  RAID.stage = i; raidMapFor(i);
  const MAP = zmUseMap('raid'), t = FPS.g ? FPS.g.t : 0;
  FPS.g = zmArena(); FPS.g.t = t;
  const Zd = FPS.g.isle.zm;
  Object.assign(ZM, { doors: Zd.doors, windows: Zd.windows, buys: Zd.buys, perksAt: Zd.perks, spawns: Zd.spawns, glass: Zd.glass || [] });
  for (const w of ZM.windows) { w.boards = 0; w.q = []; w.fall = []; }
  zmNavBuild();
  const m = FPS.me, slot = Math.max(0, ZM.hum.findIndex(h => h[0] === m.id));
  m.x = FPSC.CX + ZMD.START[0] + [0, 1.5, -1.5, 0][slot % 4]; m.y = FPSC.CY + ZMD.START[1] + [0, -1.6, -1.6, 1.8][slot % 4];
  m.jz = m.fl = ZMD.TOP; m.vz = 0; m.protect = 2;
  // everyone through the door is back up: the bled-out with their kit again, the downed on their feet
  if (ZM.ghost) { ZM.ghost = false; m.dead = 0; m.hp = ZMC.HP; raidLoadout(); }
  if (zmIsDown()) zmGetUp();
  RAID.st = {}; raidCall('enter');
  ZM.banner = { text: RAID_STAGES[RAID_ORDER[i]].n, t: 4, sub: 'Part ' + raidNumeral(i + 1) };
  fpsFeed(MAP.land(0));
}
const raidNumeral = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][n] || String(n);
function raidWin() {
  if (RAID.won) return;
  RAID.won = true;
  if (typeof wcEarn === 'function') { wcEarn('round'); wcEarn('round'); } if (typeof ocEarn === 'function') { ocEarn('round'); ocEarn('round'); }
  zmEnd();
}
// damage you did to a boss (counted on your own side)
function raidBossDamage(n) { if (RAID.on && n > 0) RAID.boss += n; }
// (zmEnd) the scoreboard: the time, if won; the bosses' damage; and this raid's kills added to all the rest
function raidReport() {
  if (RAID.told || typeof scoreReport !== 'function' || typeof BOARD === 'undefined' || !BOARD.mine || !BOARD.mine.raid) return;
  RAID.told = true;
  scoreReport('raid', RAID.won ? Math.max(1, 100000 - Math.round(RAID.t)) : 0, Math.round(RAID.boss), (BOARD.mine.raid.c | 0) + ZM.kills, RAID.won);
  // this raid, an entry of its own: incomplete unless it got through the door
  if (typeof scoreRun === 'function') { scoreRun('raid', RAID.won ? Math.max(1, 100000 - Math.round(RAID.t)) : 0, Math.round(RAID.boss), ZM.kills, RAID.won); scoreRunEnd('raid'); }
}
function raidShowOver() {
  const S = RAID_STAGES[RAID_ORDER[RAID.stage]], cleared = RAID.won ? RAID_ORDER.length : RAID.stage;
  if ($('zmOverEye')) $('zmOverEye').textContent = 'Maren’s End';
  $('zmOverHead').textContent = RAID.won ? 'Through the door' : `The dark took you in ${S ? S.n : 'the deep'}`;
  $('zmOverStats').textContent = (ZM.net ? `${ZM.hum.length} of you. ` : '') + `${cleared} of ${RAID_ORDER.length} ${RAID_ORDER.length === 1 ? 'part' : 'parts'} cleared, in ${raidClock(RAID.t)}. ${ZM.kills} of the drowned sent back (${ZM.heads} through the head)`
    + (RAID.boss > 0 ? `, ${Math.round(RAID.boss)} damage to its bosses.` : '.') + (RAID.won && RAID_ORDER.length < 3 ? ' The rest of Maren’s End is still to come.' : '');
  const best = typeof BOARD !== 'undefined' && BOARD.mine && BOARD.mine.raid;
  $('zmOverBest').textContent = best && (best.s || best.c) ? (best.s ? `Your best time: ${raidTimeOf(best.s)}. ` : '') + `${best.c | 0} sent back in all your raids.` : '';
  $('zmOver').hidden = false;
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
  setTimeout(() => $('zmAgain').focus(), 30);
}
const raidClock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------- playing together (src/zmnet.js) ----------
// the host's word: rd = [stage, won, clock], and whatever the stage adds (rs)
function raidHostSend(z) {
  if (!RAID.on) return;
  z.rd = [RAID.stage, RAID.won ? 1 : 0, Math.round(RAID.t)];
  const o = {}; raidCall('pack', o); z.rs = o;
}
function raidApply(hz) {
  if (!RAID.on || !Array.isArray(hz.rd)) return;
  const st = clamp(hz.rd[0] | 0, 0, RAID_ORDER.length - 1);
  if (st !== RAID.stage) raidUseStage(st);
  RAID.won = !!hz.rd[1]; RAID.t = +hz.rd[2] || RAID.t;
  if (hz.rs && typeof hz.rs === 'object') raidCall('apply', hz.rs);
}

// ---------- in 3D ----------
// (zm3dBuild) the stage's own meshes, with the rest; (zmScene3D) each frame
const R3 = { grp: null };
function raid3dBuild(grp) {
  R3.grp = null;
  if (!RAID.on) return;
  R3.grp = new THREE.Group(); grp.add(R3.grp);
  // Maren's Lantern, in your left hand (drawn in the world, just in front of you), and its light
  const L = R3.lan = new THREE.Group(); R3.grp.add(L);
  const brass = z3Lam('#9a7a34'), iron = z3Lam('#2a2a2c');
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.03, 10), brass); base.position.y = -0.1; L.add(base);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 10), brass); cap.position.y = 0.11; L.add(cap);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4, b = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.2, 0.01), iron); b.position.set(Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07); L.add(b); }
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.18, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  L.add(glass);
  const flame = R3.flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })); flame.scale.set(1, 1.8, 1); L.add(flame);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 14), brass); ring.position.y = 0.17; L.add(ring);
  const halo = R3.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,226,160,0.55)', 'rgba(255,226,160,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(0.6); L.add(halo);
  R3.light = new THREE.PointLight(0xffe2a8, 1.2, 13, 1.3); R3.grp.add(R3.light);
  // the others' lanterns: a glow each
  R3.theirs = [];
  R3.glowTex = z3Soft('rgba(255,226,160,0.9)', 'rgba(255,226,160,0)');
  raidCall('b3', R3.grp);
}
function raid3d(dt) {
  if (!RAID.on || !R3.grp) return;
  const m = FPS.me, G0 = FPSC.GROUND, t = g.t;
  // the lantern: down at your left, swinging a little as you walk; not while you're down or out
  // (only in a part that asks for it: Part I's lantern stage; gone once you're through its door)
  const St = raidStage(), has = !!(St && St.lantern);
  const show = has && !(m.dead > 0) && !zmIsDown() && !fpsThird() && !zmSpecOn();
  R3.lan.visible = show;
  const h = m.h, p = m.p, ez = G0 + FPSC.EYE + (m.jz || 0) - (FPS.eyeLag || 0) - (FPS.downEye || 0) - (FPS.crouchEye || 0);
  const fx = Math.sin(h), fy = Math.cos(h), sw = reduceMotion ? 0 : Math.sin((FPS.step || 0) * 0.5) * 0.03;
  // (held in the same place in your view, however you look: forward, left and down from your eye)
  const cp = Math.cos(p), sp = Math.sin(p), F = [fx * cp, fy * cp, sp], Rt = [fy, -fx, 0], U = [-fx * sp, -fy * sp, cp];
  const at = (f, r, u) => [m.x + F[0] * f + Rt[0] * r + U[0] * u, m.y + F[1] * f + Rt[1] * r + U[1] * u, ez + F[2] * f + U[2] * u];
  // (in the bottom-left corner of the view, whatever the field of view and the screen's shape: the corner's place at
  // this distance from the camera's own angles, then in by the lantern's size)
  const C = GL3D.camera, D = 0.9, hh = D * Math.tan((C.fov || 50) * Math.PI / 360), hw = hh * (C.aspect || 1.6);
  const sc = hh / 0.345 * 0.6;   // (the same share of the screen at any field of view)
  const [lx, ly, lz] = at(D, -hw + (0.15 + sw) * sc, -hh + (0.15 + Math.abs(sw)) * sc);
  R3.lan.scale.setScalar(sc);
  R3.lan.position.copy(z3v(lx, ly, lz)); R3.lan.rotation.set(0, -h, 0); R3.lan.rotateX(-p * 0.6 + sw * 2);
  const fl = reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 4.7);
  R3.flame.scale.set(fl, 1.8 * fl, fl); R3.halo.material.opacity = 0.8 * fl;
  // its light: from the lantern (or, while you're down, from where it lies)
  R3.light.position.copy(z3v(m.x - fy * 0.3, m.y + fx * 0.3, ez - 0.2)); R3.light.intensity = has ? (show ? 1.6 : 0.8) * fl : 0; R3.light.distance = 16;
  // the others' lanterns
  const list = [...FPS.remote.values()].filter(r => !r.dead && r.x != null);
  while (R3.theirs.length < list.length) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: R3.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(1.1); R3.grp.add(s); R3.theirs.push(s); }
  R3.theirs.forEach((s, i) => { const r = list[i]; s.visible = !!r && has; if (r) s.position.copy(z3v(r.x + Math.cos(r.h || 0) * -0.35, r.y + Math.sin(r.h || 0) * 0.35, G0 + (r.jz || 0) + 1.0)); });
  raidCall('f3', dt);
}
// glowing drowned: a cold light in their skin, and a haze round them, so they're seen coming in the dark
function raidPose(z, M) {
  if (!M || !M.root) return;
  if (!RAID.on) { if (M.rglow) M.rglow.visible = false; return; }
  if (!M.rglow) {
    M.rglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: R3.zTex || (R3.zTex = z3Soft('rgba(120,200,255,0.55)', 'rgba(120,200,255,0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    M.rglow.scale.set(z.boss ? 2.6 : 1.6, z.boss ? 3.6 : 2.4, 1); M.rglow.position.y = z.boss ? 1.4 : 1.0; M.root.add(M.rglow);
  }
  const pulse = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(g.t * 2.3 + (z.seed || 0));
  M.rglow.visible = !z.dead || z.deadT < 0.8; M.rglow.material.opacity = (z.dead ? Math.max(0, 1 - z.deadT / 0.8) : 1) * pulse;
  if (!M.skin) { if (M.suit) { const e = M.suit.emissive; e.setRGB(e.r + 0.14 * pulse, e.g + 0.42 * pulse, e.b + 0.62 * pulse); } return; }
  const e = M.skin.emissive, c = M.coat.emissive;
  e.setRGB(e.r + 0.18 * pulse, e.g + 0.5 * pulse, e.b + 0.72 * pulse);
  c.setRGB(c.r + 0.03, c.g + 0.1 * pulse, c.b + 0.16 * pulse);
}
// (zmZombies) one rising out of the ground: up it comes, then after you
function raidRise(z, dt) {
  z.rr -= dt; z.walk = false;
  z.jz = -1.9 * Math.max(0, z.rr) / (z.rr0 || 1.2);
  if (z.rr <= 0) { z.rr = 0; z.jz = 0; z.fl = 0; }
}
// hosting or alone: one of them, already in, at (x, y), rising out of the ground. o: { kind, hp, rise (seconds) }
function raidSpawnAt(x, y, o) {
  o = o || {};
  const kind = o.kind || 'jog', hp = o.hp || zmHp(ZM.round) * (0.9 + Math.random() * 0.2), zn = ++ZM.zc;
  const rise = o.rise == null ? 1.2 : o.rise;
  const z = {
    drowned: true, zm: true, zn, id: 'z' + zn.toString(36), n: 'a drowned man', x, y, jz: rise ? -1.9 : 0, fl: 0, zpad: 0.27,
    hp, max: hp, kind, sp: kind === 'run' ? 5.0 + Math.random() * 0.6 : kind === 'jog' ? 3.2 + Math.random() * 0.4 : 1.55 + Math.random() * 0.35,
    st: 'in', win: null, t: 0, ph: Math.random() * 6, hitT: 0, atk: 0.6, swing: -1, stuck: 0, h: Math.random() * 6.28, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    rr: rise, rr0: rise, lx: x, ly: y, raid: true,
  };
  z.sp *= (raidStage() || {}).zSpeed || 1;   // (a part can have them slower: the Swallow's are)
  ZM.z.push(z); FPS.drowned = ZM.z;
  return z;
}
// (zmHud) the round's tally isn't drawn in the raid; this is
function raidHud(phone, mono, fell) {
  if (!RAID.on) return;
  const S = raidStage(); if (!S) return;
  const top = fpsHudTop();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const L = Math.max(14, FPS.safeLeft || 0);
  ctx.font = fell(phone ? 15 : 19); ctx.fillStyle = 'rgba(236,228,207,0.85)';
  ctx.fillText(`Maren’s End · ${raidNumeral(RAID.stage + 1)} · ${S.n}`, L, top, W * 0.5);
  ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(236,228,207,0.55)';
  ctx.fillText(raidClock(RAID.t), L, top + (phone ? 18 : 26));
  fpsHudNote(top + (phone ? 30 : 40));
  raidCall('hud', phone, mono, fell);
}

// ---------- its card on the title screen ----------
(() => {
  if (!$('rdTitle')) return;
  $('rdPlay').addEventListener('click', () => { if (typeof ZN !== 'undefined' && ZN.code) return; zmStart({ map: 'raid' }); });
  $('rdSettings').addEventListener('click', () => $('titleSettings').click());
  $('rdWcrate').addEventListener('click', () => $('wcrateBtn').click());
  $('rdOcrate').addEventListener('click', () => $('ocrateBtn').click());
  $('rdBanner').addEventListener('click', () => { $('rdTitle').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('rdPlay').focus({ preventScroll: true }), 400); });
  // your bests, on the card
  setInterval(() => {
    const b = typeof BOARD !== 'undefined' && BOARD.mine && BOARD.mine.raid, el = $('rdRecord'); if (!el || !b) return;
    const s = (b.s ? `Your best time: ${raidTimeOf(b.s)}. ` : '') + (b.b ? `Most boss damage: ${b.b}. ` : '') + (b.c ? `${b.c} sent back in all your raids.` : '');
    if (el.textContent !== s) el.textContent = s;
  }, 1500);
})();

// =====================================================================================================================
// Part I: the Swallow (RAID_STAGES.descent)
// =====================================================================================================================
// Heights above the cave's floor: the dry bed of the sea at SEA, the pier's deck at DECK over it, the cave's roof at
// CEIL. The bed is one thick slab (CEIL up to SEA) with the Swallow cut through it (HOLE: x0, x1, y0, y1 from the
// island's middle); below it the Deep Path winds through the rock, a corridor between walls up to the roof, from
// under the Swallow to the door. Falling in the Swallow you come down no quicker than FALL (so it takes about half a
// minute). Braziers: LIT_R, how far a lit one's light reaches; in it you mend MEND a second and outside it (below) the
// dark takes DRAIN a second. NEED of them sent back inside RING of the arena's middle open the door.
// Maren's Weight: out of the light it settles on you, WGT_T seconds to the full of it, when you go at WGT_SLOW of your
// pace; any brazier's light lifts it at once. The wrecking balls: hung from the cave's roof over the path between
// braziers, BALL_R across, swinging across the path in BALL_T seconds or so; one that catches you puts you straight
// down (whatever your health, your class or your iframes), thrown aside
const RSWX = { WGT_T: 20, WGT_SLOW: 0.25, BALL_R: 1.05, BALL_LOW: 1.3, BALL_T: 3.6, BALL_DMG: 1, BALL_CD: 1.2 };
// The pier's end: the Long Pier (PW wide) runs on out over the Swallow to a round platform (PR across, its middle at
// PC) a step above the deck. Once someone's halfway along (PHALF) the drowned come up the pier behind; once someone
// stands on the platform, PNEED of them sent back (anywhere, while one of you is on it) and the platform falls away
const RSWP = { PW: 7, PC: [0, 24], PR: 4.5, PSTEP: 0.35, PHALF: -30, PNEED: 30, PRING: 12 };
// (the Swallow is a funnel: TOP, its mouth up on the bed, twice HOLE, its throat where it opens into the cave)
const RSW = { SEA: 250, DECK: 253, CEIL: 30, HOLE: [-11, 11, 13, 35], TOP: [-22, 22, 2, 46], FALL: 8.4, LIT_R: 9, MEND: 1.2, DRAIN: 0.2, NEED: 20, RING: 15.6, USE: 1.1, GAP: 3.4 };
// The path: [x, y, half its width, what's there] from the island's middle, from the cap behind where you land to the
// cap with the door in it; b, a brazier; a, the arena before the door (two more braziers at its sides). Between each
// two, a narrower stretch a little off the straight line (laid in rswGeo).
const RSW_KEYS = [[0, 9, 12, 'cap'], [0, 26, 12, 'land'], [5, 46, 7, 'b'], [26, 60, 7, 'b'], [50, 52, 7, 'b'], [64, 30, 7, 'b'], [66, 4, 7, 'b'], [56, -22, 7, 'b'],
  [36, -40, 7, 'b'], [10, -52, 7, 'b'], [-18, -50, 7, 'b'], [-42, -36, 13, 'a'], [-56, -18, 13, 'end']];
// (how much wider the path is than its keys say: the whole cave, its arena and its braziers' reach, together)
const RSW_WIDE = 1.2;
// everything about the path's shape, worked out once (the same for everyone)
const RSG = (function rswGeo() {
  const rnd = seeded(0x5a11d), N = [];
  RSW_KEYS.forEach((k, i) => {
    if (i > 1 && i < RSW_KEYS.length) {
      const a = RSW_KEYS[i - 1], dx = k[0] - a[0], dy = k[1] - a[1], L = Math.hypot(dx, dy), j = (rnd() - 0.5) * 7;
      N.push({ x: (a[0] + k[0]) / 2 - dy / L * j, y: (a[1] + k[1]) / 2 + dx / L * j, w: (k[3] === 'a' || k[3] === 'end' ? 7 : 4.6) * RSW_WIDE });
    }
    N.push({ x: k[0], y: k[1], w: k[2] * RSW_WIDE, t: k[3] });
  });
  // the walls' two sides: each node's point pushed out along the mitred normal
  const n = N.length;
  for (let i = 0; i < n; i++) {
    const p = N[i], a = N[Math.max(0, i - 1)], b = N[Math.min(n - 1, i + 1)];
    const d1 = i > 0 ? [p.x - a.x, p.y - a.y] : [b.x - p.x, b.y - p.y], d2 = i < n - 1 ? [b.x - p.x, b.y - p.y] : d1;
    const l1 = Math.hypot(...d1), l2 = Math.hypot(...d2), n1 = [-d1[1] / l1, d1[0] / l1], n2 = [-d2[1] / l2, d2[0] / l2];
    let mx = n1[0] + n2[0], my = n1[1] + n2[1]; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    const k = 1 / Math.max(0.5, mx * n1[0] + my * n1[1]);
    p.L = [p.x + mx * p.w * k, p.y + my * p.w * k]; p.R = [p.x - mx * p.w * k, p.y - my * p.w * k]; p.dir = [d2[0] / l2, d2[1] / l2];
  }
  // how far along the path each node is (from the cap behind the landing)
  let S = 0; N.forEach((p, i) => { if (i) S += Math.hypot(p.x - N[i - 1].x, p.y - N[i - 1].y); p.s = S; });
  // the braziers: one on each b node, two at the arena's sides
  const B = [];
  N.forEach(p => { if (p.t === 'b') B.push({ x: p.x, y: p.y }); });
  const A = N.find(p => p.t === 'a'), E = N[n - 1];
  for (const sd of [1, -1]) { const nx = -A.dir[1], ny = A.dir[0]; B.push({ x: A.x + nx * sd * 10.5 * RSW_WIDE, y: A.y + ny * sd * 10.5 * RSW_WIDE, arena: true }); }
  // the door: in the middle of the end cap, facing back down the path (f: its front, c: along it)
  const f = [-E.dir[0], -E.dir[1]], c = [-f[1], f[0]];
  const D = { x: E.x, y: E.y, f, c };
  return { N, S, B, A: { x: A.x, y: A.y }, D, land: N.find(p => p.t === 'land') };
})();
// the wrecking balls: one in each gap between braziers along the path (not the first, not the arena), hung over the
// middle of the path and swinging across it; each with its own beat (BALLS[i].T) and where in it it starts (ph)
const RSW_BALLS = [];
// (where a ball is at time t: its centre, in the island's own coordinates, and its height over the floor)
function rswBallAt(b, t) {
  const th = b.th * Math.sin(t * 6.2832 / b.T + b.ph), L = b.L;
  return { x: b.x + b.nx * L * Math.sin(th), y: b.y + b.ny * L * Math.sin(th), z: RSW.CEIL - L * Math.cos(th), th };
}
// along the path: how far along it a place is (its nearest point), and the place that far along
function rswAlong(x, y) {
  const N = RSG.N; let best = 1e9, s = 0;
  for (let i = 1; i < N.length; i++) {
    const a = N[i - 1], b = N[i], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy, t = clamp(((x - a.x) * dx + (y - a.y) * dy) / L2, 0, 1);
    const d = Math.hypot(a.x + dx * t - x, a.y + dy * t - y); if (d < best) { best = d; s = a.s + Math.sqrt(L2) * t; }
  }
  return s;
}
function rswAt(s) {
  const N = RSG.N;
  for (let i = 1; i < N.length; i++) if (s <= N[i].s || i === N.length - 1) {
    const a = N[i - 1], b = N[i], t = clamp((s - a.s) / (b.s - a.s), 0, 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, dx: (b.x - a.x) / (b.s - a.s), dy: (b.y - a.y) / (b.s - a.s) };
  }
  return { x: N[0].x, y: N[0].y, w: N[0].w, dx: 0, dy: 1 };
}
const rswW = (x, y) => [FPSC.CX + x, FPSC.CY + y];
(function rswBallsSet() {
  const rnd = seeded(0xba11), B = RSG.B.filter(b => !b.arena).map(b => rswAlong(b.x, b.y)).sort((a, b) => a - b);
  for (let i = 1; i < B.length - 1; i++) {
    const n = (B[i + 1] - B[i]) > 30 ? 2 : 1;   // (only a very long gap gets two)
    for (let k = 0; k < n; k++) {
      const q = rswAt(B[i] + (B[i + 1] - B[i]) * (n === 1 ? 0.5 : 0.33 + 0.34 * k)), L = RSW.CEIL - RSWX.BALL_LOW;
      RSW_BALLS.push({ x: q.x, y: q.y, nx: -q.dy, ny: q.dx, L, th: Math.asin(Math.min(0.9, (q.w + 0.6) / L)), T: RSWX.BALL_T * (0.85 + rnd() * 0.35), ph: rnd() * 6.2832 });
    }
  }
})();
const rswLocal = o => [o.x - FPSC.CX, o.y - FPSC.CY];

// ---------- its props (src/fpsisle.js's kinds) ----------
// a stretch of the Deep Path's wall: len along it, th thick, up to the roof; side: which way the path is (+1: +v)
FPI_K.rdwall = {
  col: '#3a393c', noShadow: true,
  sol(p) { return [fpiBox(p, 0, 0, p.len / 2, p.th / 2, RSW.CEIL)]; },
  b3(p, A) {
    const R = seeded(p.sd), RK = ['#57535a', '#4a484e', '#5e5853', '#44464c'];
    A.box(RK[0], 0, 0, -0.2, p.len, p.th, RSW.CEIL + 0.4);
    const face = p.side * p.th / 2;
    // the rock: lumps and shelves standing out of it, more of them low down
    for (let i = 0, n = Math.round(p.len / 1.6); i < n; i++) {
      const u = -p.len / 2 + R() * p.len, h0 = Math.pow(R(), 1.8) * 14, w = 0.9 + R() * 2.2, d = 0.3 + R() * 0.7, hh = 0.6 + R() * 2.8;
      A.box(RK[(R() * 4) | 0], u, face + p.side * (d / 2 - 0.15), h0, w, d, hh, (R() - 0.5) * 0.5, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3);
    }
    // what glows on it: pale lichen along its foot, in clumps, and here and there a vein higher up
    for (let i = 0, n = Math.round(p.len / 1.3); i < n; i++) {
      const u = -p.len / 2 + R() * p.len, k = R();
      const c = k < 0.6 ? '#1e6e62' : k < 0.85 ? '#24607a' : '#3a7a52';
      A.glow(c, u, face + p.side * 0.12, 0.1 + R() * 0.9, 0.1 + R() * 0.16);
      if (R() < 0.35) A.glow(c, u + 0.2, face + p.side * 0.1, 0.12 + R() * 0.3, 0.08 + R() * 0.1);
      if (R() < 0.12) for (let j = 0; j < 5; j++) A.glow('#2a5a86', u + j * 0.18, face + p.side * 0.1, 3 + R() * 6 + j * 0.25, 0.07);
    }
  },
};
// a column of rock at a corner of the path's walls, so no gap is left where two stretches meet
FPI_K.rdpillar = {
  col: '#3a393c', noShadow: true,
  sol(p) { return [fpiCirc(p, 0, 0, p.r, RSW.CEIL)]; },
  b3(p, A) { A.cyl('#3a383b', 0, 0, -0.2, p.r, RSW.CEIL + 0.4, 0, 0, 0, 'cyl8'); },
};
// the dry bed of the sea, a slab from the cave's roof up to the bed: w by d. Drawn as its roof underneath and the bed
// on top, in patches (the sides of the Swallow are rdshaft's)
FPI_K.rdslab = {
  col: '#6e675c', noShadow: true,
  sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, RSW.SEA, { z0: RSW.CEIL, fl: true })]; },
  b3(p, A) {
    A.box('#1a1918', 0, 0, RSW.CEIL, p.w, p.d, 1.5);
    const R = seeded(p.sd), T = 9, nu = Math.max(1, Math.round(p.w / T)), nv = Math.max(1, Math.round(p.d / T)), su = p.w / nu, sv = p.d / nv;
    const BED = ['#9a9282', '#a49c8a', '#8e8676', '#a8a294', '#968c78'];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) A.box(BED[(R() * BED.length) | 0], -p.w / 2 + (i + 0.5) * su, -p.d / 2 + (j + 0.5) * sv, RSW.SEA - 2, su, sv, 2);
  },
};
// the Swallow's sides: the slab's faces round the hole, in blocks a few metres across, some standing out, with glowing
// veins and shelves to see them go by as you fall
FPI_K.rdshaft = {
  noShadow: true,
  b3(p, A) {
    const [x0, x1, y0, y1] = RSW.TOP, R = seeded(p.sd), RK = ['#57514a', '#4c4741', '#625b52', '#45413c'];
    const [b0, b1, c0, c1] = RSW.HOLE, mx0 = (b0 + b1) / 2, my0 = (c0 + c1) / 2, hb = (b1 - b0) / 2, ht = (x1 - x0) / 2;
    // (the funnel: each course of its walls a little further out than the one below it, from the throat to the mouth)
    const hz = z => hb + (ht - hb) * clamp((z - RSW.CEIL) / (RSW.SEA - RSW.CEIL), 0, 1);
    for (let z = RSW.CEIL; z < RSW.SEA; z += 6) {
      const h = hz(z + 3), L = 2 * h, cols = Math.max(4, Math.round(L / 4.4)), cw = L / cols;
      for (const [nx, ny] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const ang = Math.atan2(nx, -ny);
        for (let c = 0; c < cols; c++) {
          const u = -h + (c + 0.5) * cw, inset = R() * 0.45, px = mx0 + nx * (h + 0.6 - inset) - ny * u, py = my0 + ny * (h + 0.6 - inset) + nx * u;
          A.at(FPSC.CX + px, FPSC.CY + py, FPSC.GROUND, ang);
          A.box(RK[(R() * 4) | 0], 0, 0, z, cw + 0.6, 1.2 + (ht - hb) * 6 / (RSW.SEA - RSW.CEIL) * 2, Math.min(6.2, RSW.SEA - z));
          if (R() < 0.18) A.box(RK[(R() * 4) | 0], (R() - 0.5) * cw * 0.6, -(0.6 + 0.25), z + R() * 4, 1 + R() * 2, 0.6, 0.35);
          if (R() < 0.55) { const g = R() < 0.5 ? '#2a6a8a' : '#1e7266'; for (let j = 0, m = 3 + ((R() * 6) | 0); j < m; j++) A.glow(g, (R() - 0.5) * cw, -0.62, z + R() * 6, 0.1 + R() * 0.16); }
        }
      }
    }
    // the cave's roof round the throat, out to under the mouth (the slab above is cut to the mouth's size)
    A.at(FPSC.CX, FPSC.CY, FPSC.GROUND, 0);
    A.box('#1a1918', mx0, (y0 + c0) / 2, RSW.CEIL, x1 - x0, c0 - y0, 1.5); A.box('#1a1918', mx0, (c1 + y1) / 2, RSW.CEIL, x1 - x0, y1 - c1, 1.5);
    A.box('#1a1918', (x0 + b0) / 2, my0, RSW.CEIL, b0 - x0, c1 - c0, 1.5); A.box('#1a1918', (b1 + x1) / 2, my0, RSW.CEIL, x1 - b1, c1 - c0, 1.5);
    // round the rim, up on the bed: broken slabs tipped in towards the hole
    for (let i = 0; i < 40; i++) {
      const a = R() * Math.PI * 2, rr = 23 + R() * 6, px = (x0 + x1) / 2 + Math.cos(a) * rr * 1.05, py = (y0 + y1) / 2 + Math.sin(a) * rr;
      if (px > x0 - 0.5 && px < x1 + 0.5 && py > y0 - 0.5 && py < y1 + 0.5) continue;
      if (Math.abs(px) < RSWP.PW / 2 + 0.5 && py < y0) continue;   // (not on the pier)
      A.at(FPSC.CX + px, FPSC.CY + py, FPSC.GROUND, R() * 6.28);
      A.box(RK[(R() * 4) | 0], 0, 0, RSW.SEA - 0.4, 1 + R() * 2.5, 0.8 + R() * 1.6, 0.4 + R() * 0.8, 0, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4);
    }
  },
};
// the Long Pier: its deck (DECK high, from y0 to y1, w wide), the rails along it, its piles down to the bed, lamps on
// posts; and the old quay it starts from, against the foot of the old shore's cliff
FPI_K.rddock = {
  col: '#5a4430', noShadow: true,
  sol(p) {
    const D = RSW.DECK, L = (p.y1 - p.y0), mid = (p.y0 + p.y1) / 2;
    return [
      fpiBox(p, 0, mid, p.w / 2, L / 2, D, { z0: D - 0.35, fl: true }),
      fpiBox(p, -p.w / 2 - 0.08, mid + 1, 0.08, L / 2 - 1, D + 1.05, { z0: D }), fpiBox(p, p.w / 2 + 0.08, mid + 1, 0.08, L / 2 - 1, D + 1.05, { z0: D }),
      fpiBox(p, 0, p.y0 - 4, 7, 4, D, { z0: RSW.SEA - 0.2, fl: true }),
    ];
  },
  b3(p, A) {
    const D = RSW.DECK, R = seeded(p.sd), PL = ['#5a4430', '#634b35', '#4e3b2a', '#6a5038'];
    for (let y = p.y0; y < p.y1; y += 0.34) A.box(PL[(R() * 4) | 0], (R() - 0.5) * 0.06, y + 0.17, D - 0.14, p.w + 0.2, 0.31, 0.14);
    for (const sx of [-1, 1]) {
      A.box('#3c2e22', sx * (p.w / 2 - 0.15), (p.y0 + p.y1) / 2, D - 0.4, 0.25, (p.y1 - p.y0), 0.28);
      A.box('#5c4632', sx * (p.w / 2 + 0.08), (p.y0 + p.y1) / 2 + 1, D + 0.95, 0.12, (p.y1 - p.y0) - 2, 0.1);
      for (let y = p.y0 + 1; y < p.y1 - 1; y += 2.2) A.box('#4e3c2a', sx * (p.w / 2 + 0.08), y, D, 0.12, 0.12, 1.0);
      for (let y = p.y0 + 1; y < p.y1; y += 4) { A.cyl('#3a2e24', sx * (p.w / 2 - 0.3), y, RSW.SEA - 0.6, 0.22, D - RSW.SEA + 0.3); A.box('#9a9488', sx * (p.w / 2 - 0.3), y, RSW.SEA + 0.4, 0.5, 0.5, 0.25); }
    }
    // braces under the deck between the piles
    for (let y = p.y0 + 1; y < p.y1 - 4; y += 4) A.box('#3a2e24', 0, y + 2, RSW.SEA + 1.4, p.w - 0.4, 0.15, 0.2, 0, 0, 0.5);
    // the lamp posts, every so far (their lights are laid with the pier: H.light)
    for (const [ly, sx] of p.lamps) {
      A.box('#2a2622', sx * (p.w / 2 + 0.1), ly, D, 0.14, 0.14, 2.6);
      A.box('#2a2622', sx * (p.w / 2 - 0.25), ly, D + 2.5, 0.7, 0.08, 0.08);
      A.box('#1c1a18', sx * (p.w / 2 - 0.55), ly, D + 2.0, 0.22, 0.22, 0.34);
      A.glow('#ffd88a', sx * (p.w / 2 - 0.55), ly, D + 2.17, 0.16);
    }
    // the quay: a stone landing, and the old shore rising behind it
    const qy = p.y0 - 4;
    for (let i = -6; i <= 6; i += 1.5) for (let j = -3.5; j <= 3.5; j += 1.4) A.box(['#6c6a62', '#625f58', '#74716a'][(R() * 3) | 0], i, qy + j, D - 0.3, 1.45, 1.35, 0.32);
    A.box('#55524a', 0, qy, RSW.SEA - 0.2, 14.2, 8.2, D - RSW.SEA - 0.2);
    for (let i = 0; i < 26; i++) { const u = -60 + R() * 120, v = qy - 6 - R() * 26; A.box(['#4a463e', '#3e3b35', '#55504a'][(R() * 3) | 0], u, v, RSW.SEA - 1, 8 + R() * 18, 6 + R() * 10, D - RSW.SEA + 6 + R() * 40, R() * 0.6); }
  },
};
// what lies about on the bed: the Long Pier's view. Hulks keeled over in the salt, boulders, cracks, salt pans; and
// beyond the island's edge the bed going on to the haze, and far off the Light on its pillar of rock, still lit
FPI_K.rdbed = {
  noShadow: true,
  b3(p, A) {
    const R = seeded(p.sd), S = RSW.SEA;
    const at = (x, y, a) => A.at(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND, a || 0);
    // salt pans and cracks
    for (let i = 0; i < 70; i++) {
      const x = (R() - 0.5) * 170, y = (R() - 0.5) * 170; if (Math.hypot(x, y - 24) < 17 || Math.abs(x) < 4) continue;
      at(x, y, R() * 3.14);
      if (R() < 0.5) A.box('#c8c2b2', 0, 0, S, 3 + R() * 8, 2 + R() * 6, 0.06);
      else for (let j = 0, cx = 0, cy = 0, a = R() * 6.28; j < 5; j++) { const l = 2 + R() * 4; A.box('#4a463e', cx + Math.cos(a) * l / 2, cy + Math.sin(a) * l / 2, S, l, 0.12, 0.05, -a); cx += Math.cos(a) * l; cy += Math.sin(a) * l; a += (R() - 0.5) * 1.4; }
    }
    // boulders
    for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 170, y = (R() - 0.5) * 170; if (Math.hypot(x, y - 24) < 18 || Math.abs(x) < 6) continue; at(x, y, R() * 6.28); A.box(['#5a554c', '#6a6458', '#4e4a42'][(R() * 3) | 0], 0, 0, S - 0.3, 1 + R() * 3, 1 + R() * 2.5, 0.6 + R() * 2.2, 0, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3); }
    // hulks: keel, ribs, a few strakes left, keeled over
    for (const [x, y, a, L] of [[-34, -40, 0.7, 18], [42, -14, -0.4, 22], [-46, 52, 2.2, 15], [30, 66, 1.4, 12]]) {
      at(x, y, a);
      const lean = 0.5;
      A.box('#3a2e24', 0, 0, S - 0.2, L, 0.5, 0.5);
      for (let u = -L / 2 + 1; u < L / 2 - 1; u += 1.3) { const k = 1 - Math.pow(Math.abs(u) / (L / 2), 2) * 0.6; A.box('#463628', u, 0.9 * k, S, 0.25, 0.25, 3.2 * k, 0, lean, 0); A.box('#463628', u, -0.9 * k, S, 0.25, 0.25, 2.6 * k, 0, -lean * 0.6, 0); }
      for (let j = 0; j < 4; j++) A.box('#53402e', (R() - 0.5) * 2, 1.2 + j * 0.5, S + 0.3 + j * 0.6, L * (0.4 + R() * 0.4), 0.12, 0.35, 0, lean, 0);
    }
    // beyond the edge: the bed on and on, in great sheets, to the haze
    for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
      const x = i * 110, y = j * 110; if (Math.abs(x) < 100 && Math.abs(y) < 100) continue;
      at(x, y, 0); A.box(['#8e8676', '#968e7e', '#888070'][(i * 7 + j * 3 + 21) % 3], 0, 0, S - 2 - R() * 0.4, 112, 112, 2);
    }
    // the old shore, south, behind the quay: cliffs along the whole way
    at(0, -150, 0); A.box('#3e3b35', 0, 0, 0, 1400, 80, S + 45);
    // the Light, far off to the north-west, on its skerry: a pillar of rock now, standing out of the bed
    at(-260, 420, 0);
    A.box('#3a3833', 0, 0, S - 2, 34, 30, 32); A.box('#44413a', 4, -3, S + 28, 22, 20, 12);
    A.cyl('#d8d4c8', 0, 0, S + 40, 3.2, 26); A.cyl('#a8382c', 0, 0, S + 50, 3.25, 3); A.cyl('#1c1c1c', 0, 0, S + 66, 2.6, 3);
    A.glow('#ffe8b0', 0, 0, S + 67.5, 3.4);
  },
};
// a brazier: a stone drum, an iron bowl on it (its fire and its light are drawn in 3D: rsw3dBuild)
FPI_K.rdbrazier = {
  col: '#4a4640',
  sol(p) { return [fpiCirc(p, 0, 0, 0.55, 1.1)]; },
  b3(p, A) {
    A.cyl('#4a4640', 0, 0, -0.1, 0.55, 0.75); A.cyl('#3e3a35', 0, 0, 0.62, 0.62, 0.12);
    A.cyl('#2a2826', 0, 0, 0.74, 0.5, 0.12); A.cyl('#262422', 0, 0, 0.84, 0.7, 0.32);
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; A.box('#22201e', Math.cos(a) * 0.68, Math.sin(a) * 0.68, 0.84, 0.08, 0.08, 0.42); }
  },
};
// the door's frame: two pillars and a lintel in the end wall, cut round with old carving
FPI_K.rddoorway = {
  noShadow: true,
  sol(p) { const G = RSW.GAP; return [fpiBox(p, -G / 2 - 0.6, 0, 0.6, 1.1, RSW.CEIL), fpiBox(p, G / 2 + 0.6, 0, 0.6, 1.1, RSW.CEIL)]; },
  b3(p, A) {
    const G = RSW.GAP;
    for (const sx of [-1, 1]) { A.box('#5a564e', sx * (G / 2 + 0.6), 0, -0.1, 1.2, 2.2, 5.0); A.box('#4a463e', sx * (G / 2 + 0.6), 0, 5.0, 1.5, 2.4, 0.4); }
    A.box('#5a564e', 0, 0, 4.3, G + 2.6, 2.2, 1.2);
    for (let i = 0; i < 9; i++) A.glow('#7ac8ff', -G / 2 - 1 + i * (G + 2) / 8, -1.12, 4.9, 0.1);
    for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) A.glow('#7ac8ff', sx * (G / 2 + 0.6), -1.12, 0.6 + i * 0.7, 0.09);
  },
};

// ---------- laying it out ----------
function rswSet(H, K) {
  const { put, light } = K, [x0, x1, y0, y1] = RSW.TOP;
  // the bed of the sea: four slabs round the Swallow
  const E = 92;
  put('rdslab', 0, (-E + y0) / 2, 0, { w: 2 * E, d: y0 + E });
  put('rdslab', 0, (y1 + E) / 2, 0, { w: 2 * E, d: E - y1 });
  put('rdslab', (-E + x0) / 2, (y0 + y1) / 2, 0, { w: x0 + E, d: y1 - y0 });
  put('rdslab', (x1 + E) / 2, (y0 + y1) / 2, 0, { w: E - x1, d: y1 - y0 });
  put('rdshaft', 0, 0, 0, {});
  put('rdbed', 0, 0, 0, {});
  // the Long Pier: from the quay to the Swallow's edge; lamps every so far on alternate sides, and their lights
  const lamps = []; for (let y = -78, k = 0; y < y0 - 2; y += 13, k++) lamps.push([y, k % 2 ? 1 : -1]);
  put('rddock', 0, 0, 0, { y0: -84, y1: RSWP.PC[1] - RSWP.PR + 0.6, w: RSWP.PW, lamps });
  for (const [ly, sx] of lamps) light(sx * (RSWP.PW / 2 - 0.55), ly, RSW.DECK + 2.1, '#ffd08a', 9, 'lantern');
  put('rdplat', RSWP.PC[0], RSWP.PC[1], 0, {});
  // the Deep Path's walls: each side's stretches between the nodes' pushed-out points, a column at each corner
  const N = RSG.N, TH = 3;
  const run = (a, b, side) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    // (the wall's middle half its thickness out beyond the path's side: side +1, the path's left)
    put('rdwall', (a[0] + b[0]) / 2 + side * nx * TH / 2, (a[1] + b[1]) / 2 + side * ny * TH / 2, Math.atan2(uy, ux), { len: L + 1.2, th: TH, side: -side });
  };
  for (let i = 1; i < N.length; i++) { run(N[i - 1].L, N[i].L, 1); run(N[i - 1].R, N[i].R, -1); }
  for (const p of N) { put('rdpillar', p.L[0], p.L[1], 0, { r: 1.2 }); put('rdpillar', p.R[0], p.R[1], 0, { r: 1.2 }); }
  // the caps: behind where you land, and the end wall with the doorway in it
  const cap = (p, back, gap) => {
    const ax = p.L[0], ay = p.L[1], bx = p.R[0], by = p.R[1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, ang = Math.atan2(uy, ux);
    const ox = back[0] * TH / 2, oy = back[1] * TH / 2;
    if (!gap) { put('rdwall', (ax + bx) / 2 + ox, (ay + by) / 2 + oy, ang, { len: L + 2, th: TH, side: Math.sign(-back[0] * -uy + -back[1] * ux) || 1 }); return; }
    const half = (L - gap) / 2 + 1;
    for (const [sx, sy] of [[ax, ay], [bx, by]]) {
      const mx = sx + (sx === ax ? ux : -ux) * (half / 2 - 1), my = sy + (sx === ax ? uy : -uy) * (half / 2 - 1);
      put('rdwall', mx + ox, my + oy, ang, { len: half, th: TH, side: Math.sign(-back[0] * -uy + -back[1] * ux) || 1 });
    }
  };
  cap(N[0], [-N[0].dir[0], -N[0].dir[1]]);
  const En = N[N.length - 1];
  cap(En, En.dir, RSW.GAP + 2.4);
  const D = RSG.D;
  put('rddoorway', D.x - D.f[0] * 0.2, D.y - D.f[1] * 0.2, Math.atan2(D.c[1], D.c[0]) + Math.PI, {});
  light(D.x + D.f[0] * 1.5, D.y + D.f[1] * 1.5, 2.6, '#9ad4ff', 10, 'wisp');
  // the braziers (dark: they're lit in play, rswLight)
  for (const b of RSG.B) put('rdbrazier', b.x, b.y, 0, {});
}
// the round platform at the pier's end, over the middle of the Swallow: only its footing here (it's drawn by the stage,
// so it can fall away; rswDropPlat)
FPI_K.rdplat = {
  noShadow: true,
  sol(p) { return [fpiCirc(p, 0, 0, RSWP.PR, RSW.DECK + RSWP.PSTEP, { z0: RSW.DECK - 0.4, fl: true, rdPlat: true })]; },
  b3() {},
};
// the map, for src/zombies.js
const RSW_MAP = {
  start: [0, -84], top: RSW.DECK, nav: [-82, 84, -90, 78],
  zones: {
    quay: { n: 'the Old Quay', r: [-8, 8, -92, -80], zr: [RSW.SEA + 1, 999], sky: true },
    pier: { n: 'the Long Pier', r: [-RSWP.PW / 2 - 1, RSWP.PW / 2 + 1, -80, RSWP.PC[1] + RSWP.PR + 1], zr: [RSW.SEA + 1, 999], sky: true },
    bed: { n: 'the Dry Bed', r: [-95, 95, -95, 95], zr: [RSW.SEA - 1, 999], sky: true },
    swallow: { n: 'the Swallow', r: [RSW.TOP[0] - 1, RSW.TOP[1] + 1, RSW.TOP[2] - 1, RSW.TOP[3] + 1], zr: [RSW.CEIL + 2, RSW.SEA - 1] },
    door: { n: 'the Door', r: [RSG.A.x - 15, RSG.A.x + 15, RSG.A.y - 15, RSG.A.y + 15], zr: [-5, RSW.CEIL] },
    deep: { n: 'the Deep Path', r: [-95, 95, -95, 95], zr: [-5, RSW.CEIL] },
  },
};

// ---------- in play ----------
const rswBelow = jz => (jz || 0) < RSW.CEIL - 1;
const rswNick = sid => sid === FPS.me.id ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
// a brazier lit (everyone, as soon as they know): its light on the island, a roar, and anyone out comes back
function rswLight(i, by) {
  const S = RAID.st; if (S.lit & (1 << i)) return;
  S.lit |= 1 << i; S.pend = 0;
  const b = RSG.B[i], [x, y] = rswW(b.x, b.y), I = FPS.g.isle;
  I.lights.push({ x, y, z: FPSC.GROUND + 1.6, c: '#ff9a48', r: RSW.LIT_R * 1.6, k: 'fire', ph: i * 1.7, rsw: i });
  S.flare = S.flare || {}; S.flare[i] = 1;
  const d = Math.hypot(x - FPS.me.x, y - FPS.me.y);
  try { if (!soundOff()) { const v = Math.max(0.15, 1 - d / 45); noise('lowpass', 420, 1, 0.01, 0.55 * v, 0.9, { to: 140 }); noise('bandpass', 1400, 0.8, 0.05, 0.12 * v, 1.4); tone(196, 'triangle', 0.02, 0.1 * v, 1.6, { to: 220 }); } } catch (e) {}
  const n = rswLitN();
  if (by) fpsFeed(`${rswNick(by)} lit a brazier: ${n} of ${RSG.B.length}.`);
  raidRespawn();
}
const rswLitN = () => { let n = 0, v = RAID.st.lit | 0; while (v) { n += v & 1; v >>= 1; } return n; };
// in the light of a lit brazier?
function rswInLight(x, y, jz) {
  if (!rswBelow(jz)) return false;
  const lit = RAID.st.lit | 0;
  for (let i = 0; i < RSG.B.length; i++) if (lit & (1 << i)) { const [bx, by] = rswW(RSG.B[i].x, RSG.B[i].y); if (Math.hypot(bx - x, by - y) < RSW.LIT_R) return true; }
  return false;
}
// the door's own frame: across it (a) and out of it into the arena (b), from its middle
function rswDoorAt(x, y) { const D = RSG.D, [dx, dy] = rswW(D.x, D.y), px = x - dx, py = y - dy; return [px * D.c[0] + py * D.c[1], px * D.f[0] + py * D.f[1]]; }
function rswOpenDoor() {
  const S = RAID.st; if (S.door >= 2) return;
  S.door = 2; ZM.banner = { text: 'The door is open', t: 3.5, small: true, col: '#bfe4ff' };
  fpsFeed('The door opens. Go through.');
  try { if (!soundOff()) { noise('lowpass', 160, 1, 0.3, 0.6, 2.2, { to: 60 }); tone(130, 'sine', 0.4, 0.2, 2.6, { to: 196 }); tone(392, 'triangle', 0.6, 0.06, 2.4); } } catch (e) {}
}
function rswWake() {
  const S = RAID.st; if (S.door) return;
  S.door = 1; ZM.banner = { text: 'Twenty, before the door', t: 4, sub: 'Send them back inside the ring', col: '#bfe4ff' };
  fpsFeed(`The door wakes. Send back ${RSW.NEED} of them inside the ring in front of it.`);
  try { if (!soundOff()) { tone(82, 'sine', 0.5, 0.25, 3, { to: 110 }); noise('bandpass', 600, 2, 0.4, 0.08, 2.5); } } catch (e) {}
}
// hosting or alone: bring them up out of the dark
// is a place (local) inside the path's walls, with room to stand: within its width of the middle, less a margin
function rswInside(x, y, pad) {
  const N = RSG.N; let best = 1e9, w = 0;
  for (let i = 1; i < N.length; i++) {
    const a = N[i - 1], b = N[i], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy, t = clamp(((x - a.x) * dx + (y - a.y) * dy) / L2, 0, 1);
    const d = Math.hypot(a.x + dx * t - x, a.y + dy * t - y); if (d < best) { best = d; w = a.w + (b.w - a.w) * t; }
  }
  return best < w - (pad == null ? 1.2 : pad);
}
// somewhere for one of them to come up: on the path, inside its walls, out of the light, not on top of anyone, and
// somewhere the walking grid reaches. While the door's awake, round the ring (along the path either side of it)
function rswPlace(P) {
  const S = RAID.st, ss = P.map(p => rswAlong(p.x - FPSC.CX, p.y - FPSC.CY)), front = Math.max(...ss), back = Math.min(...ss);
  const sA = rswAlong(RSG.A.x, RSG.A.y), sE = RSG.S - 3;
  for (let tries = 0; tries < 18; tries++) {
    let s;
    if (S.door === 1) s = Math.random() < 0.65 ? sA - RSW.RING - 1 - Math.random() * 9 : Math.min(sE, sA + RSW.RING * 0.5 + Math.random() * (sE - sA - RSW.RING * 0.5));
    else { const ahead = Math.random() < 0.72; s = ahead ? front + 13 + Math.random() * 14 : back - 11 - Math.random() * 10; }
    s = clamp(s, RSG.land.s + 6, sE);
    const q = rswAt(s), off = (Math.random() * 2 - 1) * Math.max(0.3, q.w - 1.8), x = q.x - q.dy * off, y = q.y + q.dx * off;
    if (!rswInside(x, y)) continue;
    const [wx, wy] = rswW(x, y);
    if (P.some(p => Math.hypot(p.x - wx, p.y - wy) < 7)) continue;
    if (rswInLight(wx, wy, 0) || zmBlockedAt(wx, wy, 0.4, 0)) continue;
    const a = zmNodeIn(zmCell(wx, wy), 0, 0.3); if (a < 0 || ZM.nav.d[a] >= 1e8) continue;
    return [wx, wy];
  }
  return null;
}
function rswSpawn(P) {
  const S = RAID.st, n = Math.max(1, ZM.hum.length), lit = rswLitN();
  const alive = ZM.z.filter(z => !z.dead && !z.boss).length, cap = S.door === 1 ? 16 + 5 * n : 8 + 3 * n + Math.floor(lit / 2);
  if (alive >= cap) return;
  const at = rswPlace(P); if (!at) return;
  const [wx, wy] = at, u = Math.random(), kind = u < 0.2 + lit * 0.025 ? 'run' : u < 0.82 ? 'jog' : 'walk';
  raidSpawnAt(wx, wy, { kind, hp: zmHp(RAIDC.ROUND + lit * 0.4) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)) });
  zmSound('moan', Math.hypot(wx - FPS.me.x, wy - FPS.me.y), 0, kind);
}
// now and then a Diver comes up out of the dark as well, glowing like the rest; no bar for his strength down here
// (RAID_STAGES.descent.noBars), so you can't tell how much he's got left
function rswDiver(P) {
  if (typeof ZBT === 'undefined' || !ZBT.diver) return false;
  if (ZM.z.some(z => z.boss && !z.dead)) return false;
  const at = rswPlace(P); if (!at) return false;
  const [x, y] = at, T = ZBT.diver, zn = ++ZM.zc, n = Math.max(1, ZM.hum.length), hp = zbHpOf('diver', RAIDC.ROUND + rswLitN() * 0.5, n) * 0.55;
  const z = {
    drowned: true, zm: true, boss: true, bt: 'diver', zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x, y, jz: 0, fl: 0,
    hp, max: hp, sp: T.sp(RAIDC.ROUND + 4) * RAID_STAGES.descent.zSpeed, st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 4, swCd: 1, ix: 0, iy: 0, ax: 0, ay: 0, lx: x, ly: y, raid: true,
  };
  if (T.init) T.init(z);
  zbMake(z, 'diver');
  ZM.z.push(z); FPS.drowned = ZM.z;
  if (typeof ZB !== 'undefined' && ZB.seen) ZB.seen.add(zn);
  fpsFeed('Something heavier is coming up out of the dark.');
  T.sound('arrive');
  return true;
}

// the wind of the fall: one long steady rush of air (a looped hiss through a soft band), rising as you fall faster and
// fading out when you land, instead of gusts one after another (which, coming every half-second, thudded)
const RSW_WIND = { src: null, g: null, f: null };
function rswWind(on, k) {
  const c = typeof AUD !== 'undefined' && AUD.ctx; if (!c) return;
  const W = RSW_WIND, t = c.currentTime;
  if (!on || soundOff()) { if (W.g) { const g = W.g, s = W.src; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.25); setTimeout(() => { try { s.stop(); s.disconnect(); g.disconnect(); } catch (e) {} }, 1500); W.src = W.g = W.f = null; } return; }
  if (!W.src) {
    try {
      const s = c.createBufferSource(); s.buffer = AUD.white; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.5;
      const g = c.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(outNode()); s.start();
      Object.assign(W, { src: s, g, f });
    } catch (e) { return; }
  }
  const v = clamp(k || 0, 0, 1);
  W.g.gain.setTargetAtTime(0.03 + 0.07 * v, t, 0.3); W.f.frequency.setTargetAtTime(500 + 600 * v, t, 0.3);
}
// ---- the pier's end ----
const rswOnPier = p => !rswBelow(p.jz) && (p.jz || 0) > RSW.SEA;
const rswOnPlat = (x, y) => Math.hypot(x - FPSC.CX - RSWP.PC[0], y - FPSC.CY - RSWP.PC[1]) < RSWP.PR;
// (hosting: is anyone standing on the platform? every kill counts while they are, wherever it falls)
const rswPlatHeld = () => (ZM.players || []).some(p => rswOnPier(p) && rswOnPlat(p.x, p.y));
// hosting or alone: one of them up the pier from the quay end, behind you
function rswPierSpawn() {
  const n = Math.max(1, ZM.hum.length), alive = ZM.z.filter(z => !z.dead && (z.jz || 0) > RSW.SEA).length;
  if (alive >= 10 + 4 * n) return;
  const x = FPSC.CX + (Math.random() * 2 - 1) * (RSWP.PW / 2 - 0.8), y = FPSC.CY - 80 + Math.random() * 6;
  const u = Math.random(), kind = u < 0.25 ? 'run' : 'jog';
  const z = raidSpawnAt(x, y, { kind, rise: 0, hp: zmHp(RAIDC.ROUND) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)) });
  if (z) { z.jz = z.fl = RSW.DECK; z.lx = x; z.ly = y; }
  zmSound('moan', Math.hypot(x - FPS.me.x, y - FPS.me.y), 0, kind);
}
// everyone: the platform's held; it falls away (its footing gone, its boards dropping), and whoever's on it with it.
// Hosting: any of the drowned still up on the pier go over too
function rswDropPlat() {
  const S = RAID.st; if (S.pier === 3) return;
  S.pier = 3; S.platT = 0;
  const I = FPS.g && FPS.g.isle;
  if (I && I.sh) for (const l of I.sh.values()) for (const q of l) if (q.rdPlat) { q.z1 = FPSC.GROUND - 300; q.z0 = FPSC.GROUND - 301; q.fl = false; }
  const m = FPS.me; if (rswOnPier(m) && rswOnPlat(m.x, m.y)) { m.fl = 0; m.vz = Math.min(m.vz || 0, -0.5); }
  if (ZM.net !== 'client') for (const z of ZM.z) if (!z.dead && (z.jz || 0) > RSW.SEA) { z.dead = 1; z.deadT = 0; }
  ZM.banner = { text: 'The platform gives way', t: 3, sub: 'Down into the Swallow', col: '#bfe4ff' };
  fpsFeed('Thirty sent back. The platform gives way under you.');
  try { if (!soundOff()) { noise('lowpass', 220, 1, 0.02, 0.6, 1.6, { to: 60 }); noise('bandpass', 900, 0.8, 0.01, 0.25, 0.8); } } catch (e) {}
}
// hosting or alone, each tick, while anyone's still up on the pier
function rswPierTick(dt, Pd) {
  const S = RAID.st; if (S.pier === 3 || !Pd.length) return;
  if (!S.pier && Pd.some(p => p.y - FPSC.CY > RSWP.PHALF)) { S.pier = 1; fpsFeed('Behind you, on the pier: the drowned, coming up out of the dry sea.'); }
  if (S.pier === 1 && Pd.some(p => rswOnPlat(p.x, p.y))) { S.pier = 2; ZM.banner = { text: 'Thirty, on the platform', t: 3.5, sub: 'Hold it: send back thirty of them', col: '#bfe4ff' }; fpsFeed(`Hold the platform: send back ${RSWP.PNEED} of them.`); }
  if (S.pier === 2 && S.pk >= RSWP.PNEED) { rswDropPlat(); return; }
  if (S.pier >= 1) { S.pspawnT = (S.pspawnT || 0) - dt; if (S.pspawnT <= 0) { rswPierSpawn(); S.pspawnT = S.pier === 2 ? 0.55 : 1.1; } }
}
RAID_STAGES.descent = {
  n: 'The Swallow', map: RSW_MAP, noBars: true, lantern: true, zSpeed: 1.17,
  speedK() { const w = RAID.st.weight || 0; return 1 - (1 - RSWX.WGT_SLOW) * w; },
  set(H, K) { rswSet(H, K); },
  enter() { Object.assign(RAID.st, { lit: 0, door: 0, kills: 0, spawnT: 3, pier: 0, pk: 0, pspawnT: 0, platT: 0, weight: 0, ballCd: 0, shove: null, diverT: 40 + Math.random() * 20, useT: 0, useI: -1, pend: 0, landed: false, windT: 0, thru: false, flare: {}, landT: 0 }); },
  players(P) { return P.filter(p => rswBelow(p.jz) || rswOnPier(p)); },
  tick(dt) {
    const S = RAID.st, P0 = ZM.players, P = P0.filter(p => rswBelow(p.jz));
    rswPierTick(dt, P0.filter(rswOnPier));
    if (!P.length) return;
    // the door wakes when someone comes into the arena; opens with twenty sent back inside its ring
    if (!S.door && P.some(p => Math.hypot(p.x - rswW(RSG.A.x, RSG.A.y)[0], p.y - rswW(RSG.A.x, RSG.A.y)[1]) < RSW.RING + 2)) rswWake();
    if (S.door === 1 && S.kills >= RSW.NEED) rswOpenDoor();
    S.landT += dt;
    S.spawnT -= dt;
    if (S.spawnT <= 0 && S.landT > 2.5 && S.door !== 2) { rswSpawn(P); S.spawnT = S.door === 1 ? 0.45 : Math.max(0.7, 1.7 - 0.09 * rswLitN()) * (0.7 + Math.random() * 0.6); }
    // a Diver, every minute or so, one at a time
    if (S.landT > 10 && S.door !== 2) { S.diverT -= dt; if (S.diverT <= 0) S.diverT = rswDiver(P) ? 50 + Math.random() * 30 : 5; }
  },
  kill(d) {
    const S = RAID.st;
    if (S.pier === 2 && rswPlatHeld()) { S.pk++; return; }
    if (S.door !== 1) return;
    const [ax, ay] = rswW(RSG.A.x, RSG.A.y);
    if (Math.hypot(d.x - ax, d.y - ay) < RSW.RING) S.kills++;
  },
  q(sid, k, a) {
    const S = RAID.st;
    if (k === 'lit') { const i = a | 0; if (i >= 0 && i < RSG.B.length) rswLight(i, sid); }
    else if (k === 'thru') { if (S.door === 2) raidNextStage(); }
  },
  pack(o) { const S = RAID.st; o.l = S.lit | 0; o.d = S.door | 0; o.k = S.kills | 0; o.p = S.pier | 0; o.pk = S.pk | 0; },
  apply(o) {
    const S = RAID.st, l = o.l | 0;
    for (let i = 0; i < RSG.B.length; i++) if ((l & (1 << i)) && !(S.lit & (1 << i))) rswLight(i, null);
    const d = o.d | 0; if (d === 1 && !S.door) rswWake(); if (d === 2 && S.door !== 2) rswOpenDoor();
    S.kills = o.k | 0;
    if ((o.p | 0) === 3) rswDropPlat(); else if (S.pier !== 3) S.pier = o.p | 0;
    S.pk = o.pk | 0;
  },
  block(x, y, pad, feet) {
    // falling down the Swallow: held in its throat the whole way (the funnel's sides are only to look at: nothing to
    // catch on, nothing to stand on, and you can't drift out over them)
    if (feet > RSW.CEIL - 1 && feet <= RSW.SEA - 1) {
      const lx = x - FPSC.CX, ly = y - FPSC.CY, [b0, b1, c0, c1] = RSW.HOLE, m = 0.8 + Math.min(pad, 0.4);
      return !(lx > b0 + m && lx < b1 - m && ly > c0 + m && ly < c1 - m);
    }
    // up on the pier, until the platform's held: over the Swallow, nowhere but the pier and the platform
    if (feet > RSW.SEA - 1) {
      const lx = x - FPSC.CX, ly = y - FPSC.CY, [x0, x1, y0, y1] = RSW.TOP;
      if (lx < x0 - 0.4 || lx > x1 + 0.4 || ly < y0 - 0.4 || ly > y1 + 0.4) return false;
      const onPier = Math.abs(lx) <= RSWP.PW / 2 && ly <= RSWP.PC[1], onPlat = Math.hypot(lx - RSWP.PC[0], ly - RSWP.PC[1]) <= RSWP.PR - Math.min(pad, 0.3);
      if (onPier) return false;
      // (before the platform falls, only it; after, only straight down the throat, never onto the funnel's sides)
      if (RAID.st.pier !== 3) return !onPlat;
      const [b0, b1, c0, c1] = RSW.HOLE; return !(lx > b0 + 1.2 && lx < b1 - 1.2 && ly > c0 + 1.2 && ly < c1 - 1.2);
    }
    if (RAID.st.door >= 2 || feet > 3) return false;
    const [a, b] = rswDoorAt(x, y);
    return Math.abs(a) < RSW.GAP / 2 + 0.2 && b < pad && b > -3;
  },
  consider(c) {
    const S = RAID.st, m = FPS.me; if (!rswBelow(m.jz)) return;
    RSG.B.forEach((b, i) => { if (S.lit & (1 << i)) return; const [x, y] = rswW(b.x, b.y); c({ k: 'rdb', i }, x, y, 0, 2.4, false); });
  },
  prompt(o) { if (o.k !== 'rdb') return null; return { text: 'Hold to light the brazier with Maren’s Lantern', hold: true }; },
  use(o) { return o.k === 'rdb'; },
  me(dt) {
    const S = RAID.st, m = FPS.me, below = rswBelow(m.jz), alive = !(m.dead > 0) && !zmIsDown() && !ZM.over;
    // falling down the Swallow: no quicker than FALL, and the wind of it
    if (m.jz < RSW.SEA - 0.5 && m.jz > 0.6 && (m.vz || 0) < 0) {
      m.vz = Math.max(m.vz, -RSW.FALL);
      rswWind(true, -(m.vz || 0) / RSW.FALL);
      S.falling = true;
    } else if (S.falling && below) { rswWind(false); S.falling = false; if (!S.landed) { S.landed = true; ZM.banner = { text: 'The Deep Path', t: 3.5, sub: 'Light the braziers. Keep to their light.', col: '#bfe4ff' }; } }
    // the dark drains you; a lit brazier mends you, and makes up your ammunition
    S.inLight = below && rswInLight(m.x, m.y, m.jz);
    // Maren's Weight: down here, out of the light, it settles on you; the light lifts it all at once
    if (below && alive && !S.inLight) { if (!S.weight) fpsFeed('Maren’s Weight settles on you. Get to the light.'); S.weight = Math.min(1, (S.weight || 0) + dt / RSWX.WGT_T); }
    else if (S.inLight && S.weight > 0) { if (S.weight > 0.15) fpsFeed('The light lifts Maren’s Weight.'); S.weight = 0; }
    else if (!below || !alive) S.weight = 0;
    // the wrecking balls: caught by one, knocked and thrown aside (each of us judges our own)
    if (below && alive && S.ballCd <= 0) {
      const bt = RAID.ct || 0;
      for (const b of RSW_BALLS) {
        const P = rswBallAt(b, bt), [bx, by] = rswW(P.x, P.y), d = Math.hypot(m.x - bx, m.y - by), jz = m.jz || 0;
        if (d < RSWX.BALL_R + 0.35 && P.z - RSWX.BALL_R < jz + 1.8 && P.z + RSWX.BALL_R > jz) {
          S.ballCd = RSWX.BALL_CD;
          if (!(m.protect > 0)) { m.hp = 0; m.iframe = 0; FPS.hurtT = 0.5; try { sfxHit(); } catch (e) {} fpsDie(null, null); }
          zmSound('hit'); FPS.hurtT = 0.9;
          // thrown the way it's swinging (across the path), a little at a time so no wall is passed
          const dir = Math.sign(Math.cos(bt * 6.2832 / b.T + b.ph)) || 1;
          S.shove = [b.nx * dir * 7, b.ny * dir * 7, 0.35];
          fpsFeed('A wrecking ball caught you and put you down.');
          break;
        }
      }
    }
    if (S.ballCd > 0) S.ballCd -= dt;
    if (S.shove && S.shove[2] > 0) { const k = dt / 0.35; zmMove(m, S.shove[0] * 0.35 * k, S.shove[1] * 0.35 * k); S.shove[2] -= dt; }
    if (below && alive) {
      const max = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
      // (only what the dark took comes back in the light; what the drowned took stays taken)
      if (m.hp >= max) S.dark = 0;
      if (S.inLight) {
        const up = Math.min(RSW.MEND * dt, S.dark || 0, max - m.hp); if (up > 0) { m.hp += up; S.dark -= up; }
        S.ammoT = (S.ammoT || 0) + dt;
        if (S.ammoT > 1) { S.ammoT = 0; for (const id of ZM.own) if (ZM_AMMO[id]) ZM.res[id] = Math.min(ZM_AMMO[id], (ZM.res[id] || 0) + Math.ceil(ZM_AMMO[id] * 0.12)); }
      }
      // what the drowned (or the balls) took comes back by itself once nothing has hit you for a moment (RAIDC.CALM of
      // the Lighthouse's wait), quickly; only up to what the dark has left you, since that part only the light gives back
      const cap = max - (S.dark || 0);
      if (m.hp < cap && FPS.calm > (ZM.perks.grog ? 1.6 : 3.2) * RAIDC.CALM) m.hp = Math.min(cap, m.hp + 2 * dt);
      if (!S.inLight && !(m.protect > 0)) {
        const dn = Math.min(m.hp, RSW.DRAIN * dt); m.hp -= dn; S.dark = (S.dark || 0) + dn;
        if (m.hp <= 0) { m.hp = 0; fpsFeed('The dark took the last of you.'); fpsDie(null, null); }
      }
    }
    // holding Use at a dark brazier lights it from the lantern
    const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
    if (hold && o && o.k === 'rdb' && alive && !(S.pend > 0)) {
      if (S.useI !== o.i) { S.useI = o.i; S.useT = 0; }
      S.useT += dt;
      if (S.useT >= RSW.USE) { S.useT = 0; S.useI = -1; if (ZM.net === 'client') { raidAsk('lit', o.i); S.pend = 1.5; } else rswLight(o.i, FPS.me.id); }
    } else { S.useT = 0; S.useI = -1; }
    if (S.pend > 0) S.pend -= dt;
    // through the open door: on to the next part
    if (S.door === 2 && alive && below && !S.thru) {
      const [a, b] = rswDoorAt(m.x, m.y);
      if (Math.abs(a) < RSW.GAP / 2 + 0.5 && b < -0.4) { S.thru = true; setTimeout(() => { if (RAID.st === S) S.thru = false; }, 1500); raidAsk('thru'); }
    }
  },
  hud(phone, mono, fell) {
    const S = RAID.st, m = FPS.me, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 44), t = g.t;
    const below = rswBelow(m.jz);
    let line;
    if (m.jz >= RSW.SEA - 1) line = S.pier === 2 ? `Hold the platform: every kill counts while one of you stands on it. Sent back: ${Math.min(S.pk, RSWP.PNEED)} of ${RSWP.PNEED}` : S.pier === 3 ? 'The platform has fallen. Step off the pier into the Swallow.' : 'Walk the Long Pier out over the Swallow, to the round platform at its end.';
    else if (!below) line = `Falling · ${Math.round(m.jz)} m to the bottom`;
    else if (!S.door) line = `Braziers lit: ${rswLitN()} of ${RSG.B.length}. Hold Use at a dark one to light it from Maren’s Lantern.`;
    else if (S.door === 1) line = `Sent back inside the ring: ${Math.min(S.kills, RSW.NEED)} of ${RSW.NEED}`;
    else line = 'The door is open. Go through.';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = S.door === 1 ? '#bfe4ff' : 'rgba(236,228,207,0.8)';
    ctx.fillText(line, L, top, W * 0.5); fpsHudNote(top + (phone ? 14 : 18));
    // in the light or in the dark
    if (below && !(m.dead > 0) && !zmIsDown() && !ZM.over) {
      if (!S.inLight) {
        const a = 0.18 + 0.06 * Math.sin(t * 2.2), gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.3, cx, H / 2, Math.max(W, H) * 0.75);
        gr.addColorStop(0, 'rgba(10,20,40,0)'); gr.addColorStop(1, `rgba(10,20,40,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 10 : 12);
      ctx.fillStyle = S.inLight ? '#ffd88a' : `rgba(150,200,255,${0.6 + 0.3 * Math.sin(t * 4)})`;
      ctx.fillText(S.inLight ? (S.dark > 0.005 ? 'IN THE LIGHT · MENDING WHAT THE DARK TOOK' : 'IN THE LIGHT') : 'IN THE DARK · IT DRAINS YOU', cx, H - (phone ? 150 : 96));
    }
    // Maren's Weight: a bar under the light line while it's on you, heavier as it fills
    if (below && S.weight > 0.01 && !(m.dead > 0)) {
      const w = S.weight, bw = phone ? 120 : 180, x0 = cx - bw / 2, y0 = H - (phone ? 136 : 80);
      ctx.fillStyle = 'rgba(10,16,28,0.6)'; ctx.fillRect(x0, y0, bw, 5);
      ctx.fillStyle = `rgb(${110 + 60 * w},${150 - 40 * w},${210 - 60 * w})`; ctx.fillRect(x0, y0, bw * w, 5);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(190,210,240,0.85)';
      ctx.fillText(`MAREN’S WEIGHT · ${Math.round((1 - this.speedK()) * 100)}% SLOWER`, cx, y0 + 8);
    }
    // the platform's tally, big, while it's being held
    if (S.pier === 2 && !below) { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = fell(phone ? 26 : 38); ctx.fillStyle = '#bfe4ff'; ctx.fillText(`${Math.min(S.pk, RSWP.PNEED)} / ${RSWP.PNEED}`, cx, phone ? top + 20 : 60); }
    // the ring's tally, big, while the door's awake
    if (S.door === 1) { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = fell(phone ? 26 : 38); ctx.fillStyle = '#bfe4ff'; ctx.fillText(`${Math.min(S.kills, RSW.NEED)} / ${RSW.NEED}`, cx, phone ? (FPS.hudCtop || top) + 2 : 60); }
    // lighting a brazier: a ring round the sights filling
    if (S.useI >= 0 && S.useT > 0) {
      const k = Math.min(1, S.useT / RSW.USE);
      ctx.strokeStyle = 'rgba(255,216,138,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = '#ffd88a'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
    }
  },
  b3(grp) {
    // the braziers' fires and embers, the door, the ring before it
    const fireTex = z3Soft('rgba(255,190,90,1)', 'rgba(255,90,20,0)'), coreTex = z3Soft('rgba(255,250,220,1)', 'rgba(255,200,120,0)'), G0 = FPSC.GROUND;
    R3.bz = RSG.B.map(b => {
      const g3 = new THREE.Group(), [x, y] = rswW(b.x, b.y); g3.position.copy(z3v(x, y, G0 + 1.15)); grp.add(g3);
      const mk = (tex, s, op) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.scale.set(s, s * 1.5, 1); g3.add(sp); return sp; };
      const fl = [mk(fireTex, 1.6, 0.9), mk(fireTex, 1.1, 0.9), mk(coreTex, 0.7, 1)];
      const ember = mk(z3Soft('rgba(255,90,30,0.8)', 'rgba(255,60,10,0)'), 0.8, 0.5); ember.position.y = -0.15;
      return { g3, fl, ember };
    });
    const D = RSG.D, [dx, dy] = rswW(D.x, D.y), ang = Math.atan2(D.c[1], D.c[0]);
    const dg = new THREE.Group(); dg.position.copy(z3v(dx, dy, G0)); dg.rotation.y = ang; grp.add(dg);
    const leafM = new THREE.MeshBasicMaterial({ color: 0x9ccff0, transparent: true, opacity: 0.85 });
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(RSW.GAP, 4.2, 0.25), leafM); leaf.position.y = 2.1; dg.add(leaf);
    const seamM = new THREE.MeshBasicMaterial({ color: 0x3a5a78 });
    for (const [w, h, x, y] of [[0.06, 4.0, 0, 2.1], [RSW.GAP * 0.8, 0.06, 0, 1.2], [RSW.GAP * 0.8, 0.06, 0, 3.0]]) { const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), seamM); s.position.set(x, y, 0); leaf.add(s); s.position.y -= 2.1; }
    const beyond = new THREE.Mesh(new THREE.PlaneGeometry(RSW.GAP, 4.2), new THREE.MeshBasicMaterial({ color: 0xeaf6ff, fog: false })); beyond.position.set(0, 2.1, 1.4); beyond.rotation.y = Math.PI; dg.add(beyond);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(150,210,255,0.7)', 'rgba(150,210,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(9, 9, 1); halo.position.set(0, 2.2, -0.6); dg.add(halo);
    const ringM = new THREE.MeshBasicMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(RSW.RING - 0.25, RSW.RING, 72), ringM); ring.rotation.x = -Math.PI / 2;
    const [ax, ay] = rswW(RSG.A.x, RSG.A.y); ring.position.copy(z3v(ax, ay, G0 + 0.05)); grp.add(ring);
    const doorL = new THREE.PointLight(0x9ad4ff, 0, 18, 1.3); doorL.position.copy(z3v(dx + D.f[0] * 2, dy + D.f[1] * 2, G0 + 2.4)); grp.add(doorL);
    R3.door = { leaf, leafM, halo, ring, ringM, doorL, open: 0 };
    // the pier's round platform: planks on a ring of beams, a step above the deck, a cold rim that wakes while it's held
    { const P = new THREE.Group(), [px, py] = rswW(RSWP.PC[0], RSWP.PC[1]), G0 = FPSC.GROUND, top = RSW.DECK + RSWP.PSTEP; P.position.copy(z3v(px, py, G0 + top)); grp.add(P);
      const wood = new THREE.MeshLambertMaterial({ color: 0x5c4632 }), dark = new THREE.MeshLambertMaterial({ color: 0x3a2e24 });
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(RSWP.PR, RSWP.PR, 0.3, 28), wood); disc.position.y = -0.15; P.add(disc);
      for (let k = -RSWP.PR + 0.4; k < RSWP.PR; k += 0.8) { const w = 2 * Math.sqrt(Math.max(0, RSWP.PR * RSWP.PR - k * k)) - 0.2; const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.05), dark); b.position.set(0, 0.01, k); P.add(b); }
      const under = new THREE.Mesh(new THREE.CylinderGeometry(RSWP.PR * 0.95, RSWP.PR * 0.6, 0.9, 20), dark); under.position.y = -0.75; P.add(under);
      const rimM = new THREE.MeshBasicMaterial({ color: 0x9ad4ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const rim = new THREE.Mesh(new THREE.RingGeometry(RSWP.PR - 0.35, RSWP.PR - 0.05, 48), rimM); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.03; P.add(rim);
      R3.plat = { P, rimM, y0: P.position.y, v: 0 }; }
    // the wrecking balls: an iron ball on a chain up into the dark, a faint cold sheen on it so you can see it coming
    const iron = new THREE.MeshLambertMaterial({ color: 0x3a3c40, emissive: 0x0c1a26 }), chainM = new THREE.MeshLambertMaterial({ color: 0x2a2b2e, emissive: 0x081018 });
    const ballG = new THREE.SphereGeometry(RSWX.BALL_R, 14, 10), spikeG = new THREE.ConeGeometry(0.16, 0.5, 6), chainG = new THREE.CylinderGeometry(0.06, 0.06, 1, 6);
    R3.balls = RSW_BALLS.map(b => {
      const ball = new THREE.Group(); grp.add(ball);
      ball.add(new THREE.Mesh(ballG, iron));
      for (let k = 0; k < 10; k++) { const a = k * 2.4, e = Math.acos(1 - 2 * (k + 0.5) / 10), d = new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)); const sp = new THREE.Mesh(spikeG, iron); sp.position.copy(d.clone().multiplyScalar(RSWX.BALL_R + 0.18)); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); ball.add(sp); }
      const sheen = new THREE.Sprite(new THREE.SpriteMaterial({ map: R3.zTex || (R3.zTex = z3Soft('rgba(120,200,255,0.55)', 'rgba(120,200,255,0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
      sheen.scale.setScalar(RSWX.BALL_R * 3.2); ball.add(sheen);
      const chain = new THREE.Mesh(chainG, chainM); grp.add(chain);
      return { b, ball, chain };
    });
  },
  f3(dt) {
    const S = RAID.st, t = g.t, m = FPS.me;
    // the platform: its rim alight while it's held; once it's fallen, down it goes into the dark, turning
    if (R3.plat) { const Pl = R3.plat, pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3);
      Pl.rimM.opacity = S.pier === 2 ? 0.45 + 0.4 * pulse : S.pier === 1 ? 0.3 : 0.15;
      if (S.pier === 3 && Pl.P.visible) { Pl.v += 9.8 * dt; Pl.P.position.y -= Pl.v * dt; Pl.P.rotation.x += dt * 0.4; Pl.P.rotation.z += dt * 0.25; if (Pl.y0 - Pl.P.position.y > 120) Pl.P.visible = false; } }
    // the wrecking balls, swinging on the raid's clock (the same for all of us)
    if (R3.balls) { const bt = RAID.ct || 0, G0 = FPSC.GROUND, up = new THREE.Vector3(0, 1, 0);
      for (const B of R3.balls) {
        const P = rswBallAt(B.b, bt), [x, y] = rswW(P.x, P.y), [px, py] = rswW(B.b.x, B.b.y), a = z3v(x, y, G0 + P.z), top = z3v(px, py, G0 + RSW.CEIL);
        B.ball.position.copy(a); B.ball.rotation.z = P.th;
        const d = top.clone().sub(a), len = d.length(); B.chain.position.copy(a).addScaledVector(d, 0.5); B.chain.scale.set(1, len, 1); B.chain.quaternion.setFromUnitVectors(up, d.normalize());
      } }
    // the light and the fog, by how high you are: the dusk over the bed, black at the bottom
    const k = clamp(((m.jz || 0) - RSW.CEIL) / (RSW.SEA - RSW.CEIL), 0, 1), kk = k * k;
    GL3D.amb.intensity = 0.13 + 0.42 * kk; GL3D.moon.intensity = 0.3 * kk;
    if (GL3D.scene.fog) { const F = GL3D.scene.fog; F.color.setRGB(0.02 + 0.08 * kk, 0.025 + 0.085 * kk, 0.04 + 0.11 * kk); F.near = 3 + 60 * kk; F.far = 46 + 600 * kk; RAID.fog0 = true; }
    // the braziers
    R3.bz.forEach((b, i) => {
      const lit = !!(S.lit & (1 << i)), fl = S.flare && S.flare[i] ? S.flare[i] : 0;
      if (fl > 0) S.flare[i] = Math.max(0, fl - dt * 0.8);
      b.fl.forEach((s, j) => { s.visible = lit; if (lit) { const f = reduceMotion ? 1 : 0.8 + 0.25 * Math.sin(t * (9 + j * 3) + i) * Math.sin(t * (3.1 + j) + i * 2); const sc = (j === 0 ? 1.6 : j === 1 ? 1.1 : 0.7) * f * (1 + fl * 1.5); s.scale.set(sc, sc * 1.6, 1); s.position.y = 0.15 + j * 0.12 + (reduceMotion ? 0 : 0.05 * Math.sin(t * 7 + j)); } });
      b.ember.material.opacity = lit ? 0.9 : 0.35 + 0.15 * Math.sin(t * 1.3 + i);
    });
    // the door: dim, then waking (pulsing, its ring alight), then open (down into the floor, and the light beyond)
    const Dr = R3.door; if (!Dr) return;
    const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.4);
    if (S.door >= 2) Dr.open = Math.min(1, Dr.open + dt * 0.5);
    Dr.leaf.position.y = 2.1 - Dr.open * 4.3; Dr.leaf.visible = Dr.open < 1;
    Dr.leafM.color.setRGB(0.35 + 0.3 * (S.door ? pulse : 0.2) + Dr.open * 0.3, 0.55 + 0.3 * (S.door ? pulse : 0.2), 0.75 + 0.2 * (S.door ? pulse : 0.2));
    Dr.halo.material.opacity = S.door === 0 ? 0.25 : S.door === 1 ? 0.45 + 0.35 * pulse : 1;
    Dr.ring.visible = S.door === 1; Dr.ringM.opacity = 0.3 + 0.3 * pulse;
    Dr.doorL.intensity = S.door === 0 ? 0.4 : S.door === 1 ? 0.8 + 0.6 * pulse : 2.2;
  },
  exit() { R3.bz = null; R3.door = null; R3.balls = null; R3.plat = null; rswWind(false); },
};
