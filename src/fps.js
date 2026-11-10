// Wreckers' Night: a separate multiplayer first-person shooter mode, on foot on a skerry at night.
//
// It borrows the game's world and its rules of light, and keeps nothing it does from the real game:
// no crates, no voyages, no crew. Everyone in the mode shares one island and one clock.
//  - Darkness: you only see what light reaches. The lighthouse beam sweeps the island and lights
//    anyone it crosses; flares light a wide circle for everyone; your lantern lights what's near
//    you, and shows you to the whole island while it burns.
//  - The bell: everyone in earshot shows on your bearing strip for a few seconds, and so do you.
//  - The skerries and old wrecks are cover; the drowned crew wade ashore now and then.
//  - Your colours are your equipped skin's.
// Rounds last five minutes on the wall clock, so everyone's round turns over together, and each
// round the island moves to the next of the six seas.
// Fair hits: a shot travels as an event (where it was fired from, which way). Whoever it's aimed at
// checks it against where they really were over the last few tenths of a second, rocks included,
// so ducking behind cover in time always counts. The wreckers (bots) and the drowned crew are run
// by one player (the host: the lowest id on the island) and shown to everyone the same.
// Connected through the same room or server as crews, but on its own key (`fps`) in presence, so
// the two never mix. Alone, a few wreckers (bots) keep you company.

const FPSC = {
  PLAYERS: 6, LAG: 0.35,   // (wreckers, the bots, fill the island up to this many)
  CX: 0, CY: 640, R: 88,   // (the island's radius: smaller now, so fights find you quicker)
  GROUND: 0.35, EYE: 1.7, BODY: 0.55, TALL: 1.85,
  PMAX: 1.55,   // (how far you can look up or down: just short of straight up and straight down, so the view never flips)
  SPEED: 6.5, SPRINT: 11, HP: 4, MAG: 6, RATE: 0.26, RELOAD: 2.2, RESPAWN: 3.5, FLARES: 2,
  ROUND: 300000, PERIOD: 16, RANGE: 420, SEND: 0.1, BOTS: 3, PROTECT: 2,
  JUMP: 5.6, GRAV: 15,                       // a jump clears about a metre and lasts three-quarters of a second
  TP_BACK: 3.7, TP_SIDE: 0.8, TP_UP: 0.12,   // the over-the-shoulder camera: behind, to the right, a little above your eyes
};
const FPS = {
  on: false, saved: null, weapon: 'pepperbox', pick: 'pepperbox', last: 'pepperbox', harps: [], swings: [], scoped: false, drawT: 0, g: null, me: null, keys: {}, mouse: false, look: [0, 0],
  remote: new Map(), bots: [], drowned: [], tracers: [], parts: [], feed: [], pings: [],
  round: 0, kb: {}, deaths: 0, seq: 0, shots: [], seenSeq: {}, hist: [], host: false, joinedAt: 0, bell: 0, flare: 0, flareAt: [0, 0],
  sendT: 0, hitT: 0, hurtT: 0, flash: 0, recoil: 0, step: 0, board: false, menu: false,
  roundMsg: null, drownT: 30, lastBoard: [], stick: null, lookTouch: null,
};
const FPS_BOT_NAMES = ['Wrecker Abe', 'Black Nell', 'Silas Crane', 'Old Tobias', 'Mother Carey', 'Jory Pengelly', 'Hester Vane', 'Ned Tregarthen', 'Widow Pascoe', 'Saul Kittow', 'Bess Polgrain', 'Long Amos'];
const FPS_SEAS = ['skerry', 'fjord', 'ember', 'lagoon', 'barrows', 'shoals'];
// the six weapons: you carry them all (1-6 to switch); the one picked on the title card is in your hand when you land
//  pepperbox   six quick shots, one damage (two to the head)
//  blunderbuss one shot of nine balls in a wide spread; deadly close, useless past fifty metres
//  longarm     one heavy shot, three damage (a head shot kills); hold right mouse / Scope for the telescope
//  harpoon     one barbed harpoon on a line, slow enough to see, flying flat and true, and it kills what it hits
//              (tol: how far past a body's edge it still catches; a heavy iron is forgiving)
//  cutlass     no powder: swing it within arm's reach, two damage a cut, in a three-cut combination
//  avtomat     an automatic rifle: twenty-five rounds as fast as you hold the trigger, one damage (two to the head);
//              it climbs and kicks hard, sprays from the hip, and takes a long while to load; hold right mouse /
//              Aim to look down its iron sights (closer, steadier, and every round goes where the sights are)
const FPSW = {
  pepperbox:   { n: 'Pepperbox',   code: 'p', mag: 6, rate: 0.26, reload: 2.2, dmg: 1, head: 2, auto: true, range: 420, kick: 1 },
  blunderbuss: { n: 'Blunderbuss', code: 'b', mag: 1, rate: 0.6, reload: 2.7, dmg: 1, head: 1, pellets: 9, spread: 0.085, range: 55, kick: 2.4 },
  longarm:     { n: 'Longarm',     code: 'l', mag: 1, rate: 0.5, reload: 2.6, dmg: 3, head: 5, range: 650, hip: 0.012, scope: 3.2, kick: 1.6 },
  harpoon:     { n: 'Harpoon gun', code: 'h', mag: 1, rate: 0.6, reload: 2.2, dmg: 4, head: 4, speed: 100, drop: 2.4, tol: 0.2, range: 300, kick: 1.9 },
  cutlass:     { n: 'Cutlass',     code: 'c', mag: 0, rate: 0.48, reload: 1.6, dmg: 2, head: 2, reach: 2.7, arc: 0.8, melee: true, kick: 0 },
  avtomat:     { n: 'Avtomat',     code: 'a', mag: 25, rate: 0.085, reload: 3.9, dmg: 1, head: 2, auto: true, range: 380, hip: 0.03, ads: 1.45, kick: 0.75, climb: 0.019, sway: 0.011 },
  // only in the Lighthouse (src/zombies.js), and only from the wreck chest: a lantern with a lighthouse lens in it,
  // that throws a beam of the Light's own fire. Hold the trigger to burn whatever stands in it
  fresnel:     { n: 'Fresnel Lamp', code: 'f', mag: 60, rate: 0.1, reload: 3.4, dmg: 0, head: 0, auto: true, beam: true, range: 30, kick: 0.12 },
  // [chest] eight more, also only in the Lighthouse and only from the wreck chest; how each one works is in
  // src/zmchest.js (pv: how fast what it throws flies, gr: how fast that falls; long: held like a long gun)
  duckfoot:    { n: "Duck's-Foot",  code: 'd', mag: 4, rate: 0.32, reload: 2.4, dmg: 1, head: 2, range: 120, fan: 4, fanW: 0.2, kick: 1.3 },
  bomblance:   { n: 'Bomb-Lance',   code: 'w', mag: 1, rate: 0.6, reload: 2.8, dmg: 4, head: 4, pv: 46, gr: 4, range: 200, fuse: 1.1, blast: 16, br: 4, kick: 2.0, long: true },
  grapnel:     { n: 'Grapnel Gun',  code: 'g', mag: 1, rate: 0.5, reload: 1.6, dmg: 3, head: 3, pv: 60, gr: 2, range: 22, kick: 1.2, long: true },
  flaregun:    { n: 'Flare Pistol', code: 's', mag: 1, rate: 0.5, reload: 1.4, dmg: 3, head: 3, pv: 50, gr: 7, range: 200, kick: 1.4 },
  axe:         { n: 'Boarding Axe', code: 'x', mag: 0, rate: 0.72, reload: 1.6, dmg: 3, head: 3, reach: 3.0, arc: 1.2, melee: true, kick: 0 },
  puntgun:     { n: 'Punt Gun',     code: 'u', mag: 1, rate: 0.8, reload: 4.2, dmg: 1, head: 1.5, shot: 16, spread: 0.035, range: 90, kick: 3.2, shove: 2.4, long: true },
  netmortar:   { n: 'Net Mortar',   code: 'n', mag: 1, rate: 0.6, reload: 2.3, dmg: 2, head: 2, pv: 21, gr: 12, range: 120, kick: 1.6, long: true },
  chainshot:   { n: 'Chain-Shot',   code: 'y', mag: 1, rate: 0.6, reload: 2.6, dmg: 4, head: 4, pv: 36, gr: 0.6, range: 45, chainW: 1.3, kick: 2.2, long: true },
  // [crab] only at Wrackhaven, only from its chest (in place of the Fresnel Lamp there): src/zmcrab.js. A crab's
  // claw on a gauntlet: its snap knocks back what's near, and it throws hermit crabs that cling on and nip
  hermit:      { n: "Hermit's Claw", code: 'r', mag: 3, rate: 0.55, reload: 2.5, dmg: 2, head: 2, pv: 15, gr: 13, range: 60, snap: 3.4, kick: 1.5 },
};
const FPS_WORDER = ['pepperbox', 'blunderbuss', 'longarm', 'harpoon', 'cutlass', 'avtomat'];
// how much closer the view comes when aiming (the longarm's telescope, the avtomat's iron sights)
const fpsZoom = () => { const w = fpsW(); return FPS.scoped ? (w.scope || w.ads || 1) : 1; };
const FPSW_BY_CODE = {}; for (const id in FPSW) FPSW_BY_CODE[FPSW[id].code] = id;
// ([pap] in the Lighthouse, a weapon reforged at the Lampwright's Bench has its own copy: src/zmpap.js)
const fpsW = () => (FPS.zm && typeof zmpW === 'function' && zmpW(FPS.weapon)) || FPSW[FPS.weapon] || FPSW.pepperbox;
const fpsWOf = code => FPSW[FPSW_BY_CODE[code] || 'pepperbox'];
try { const w = localStorage.getItem('skerry-fps-weapon'); if (FPSW[w] && FPS_WORDER.includes(w)) FPS.pick = w; } catch (e) {}
// first person, or over the shoulder (T, the view button, or up on the D-pad to switch; remembered)
try { FPS.third = localStorage.getItem('skerry-fps-view') === '3rd'; } catch (e) {}
// over the shoulder, unless you're looking through the longarm's telescope or lying dead
const fpsThird = () => FPS.third && !FPS.scoped && !(FPS.me && FPS.me.dead > 0);
function fpsToggleView() {
  FPS.third = !FPS.third; FPS.camPull = null;
  if (FPS.viewLabel) FPS.viewLabel();
  try { localStorage.setItem('skerry-fps-view', FPS.third ? '3rd' : '1st'); } catch (e) {}
  fpsFeed(FPS.third ? 'Over the shoulder (T to switch back).' : 'First person (T for over the shoulder).');
}
// jumping: only from the ground
function fpsJump() {
  const m = FPS.me; if (!m || m.dead > 0 || FPS.menu || (FPS.zm && zmIsDown())) return;
  const air = (m.jz || 0) > (m.fl || 0) + 0.01 || (m.vz || 0) > 0;
  if (FPS.zm && typeof rclJump === 'function' && rclJump(m, air)) return;   // [classes] each calling's own jump (src/rclass.js)
  if (FPS.crouch) { fpsCrouch(false); return; }   // (from a crouch, Jump stands you up first, as in most shooters)
  if (air) return;
  m.vz = FPSC.JUMP; m.jz = (m.fl || 0) + 0.001; FPS.landed = 0;
  try { if (!soundOff()) noise('lowpass', 500, 1, 0.01, 0.08, 0.12); } catch (e) {}
}
// crouching (C, or B on a controller, toggles it): the view drops about half a metre and you make a smaller target
// (your head lower, your body shorter: the fair-hit check knows), at a little over half the walking pace; running or
// jumping stands you up. Everyone else sees you crouch (cr on Wreckers' Night, bit 64 in the Lighthouse)
const FPS_CROUCH = { EYE: 0.55, TALL: 1.3, HEAD: 0.95, PACE: 0.55 };
function fpsCrouch(on) {
  const m = FPS.me; if (!m) return;
  on = on == null ? !FPS.crouch : !!on;
  if (on && (m.dead > 0 || FPS.menu || (FPS.zm && zmIsDown()))) return;
  if (on === !!FPS.crouch) return;
  FPS.crouch = on; FPS.padRun = false;
  try { if (!soundOff()) noise('lowpass', 420, 1, 0.005, 0.06, 0.08); } catch (e) {}
  if (!FPS.zm) fpsSend();
}
// each frame: ease the view down or up, and size your body to match
function fpsCrouchTick(m, dt) {
  if (FPS.crouch && (m.dead > 0 || (FPS.zm && zmIsDown()))) FPS.crouch = false;
  FPS.crouchK = clamp((FPS.crouchK || 0) + (FPS.crouch ? dt * 7 : -dt * 7), 0, 1);
  FPS.crouchEye = FPS_CROUCH.EYE * FPS.crouchK * (2 - FPS.crouchK);
  if (FPS.crouch) { m.tall = FPS_CROUCH.TALL; m.headZ = FPS_CROUCH.HEAD; m.cr = 1; } else if (m.cr) { delete m.tall; delete m.headZ; m.cr = 0; }
}
// (m.fl: the height of the floor under you: the ground, or in the Lighthouse a stair or a floor above it)
function fpsJumpTick(m, dt) {
  const fl = m.fl || 0;
  if (!((m.jz || 0) > fl) && !((m.vz || 0) > 0)) { m.jz = fl; m.vz = 0; return; }
  m.vz -= FPSC.GRAV * dt; m.jz += m.vz * dt;
  if (m.jz <= fl) {
    const hard = Math.min(1, -m.vz / 9); m.jz = fl; m.vz = 0; FPS.landed = 0.25 * hard;
    try { if (!soundOff()) noise('lowpass', 320, 1, 0.005, 0.18 * hard, 0.16); } catch (e) {}
  }
}

// ---------- the island ----------
// Each round's island is laid out from the round number (src/fpsisle.js): one of six kinds of island,
// its rocks, wrecks and props all from the same seed, so everyone on it builds the same one.
function fpsArena(round) {
  const rng = seeded((0x5ee7 + 17 + Math.imul(round | 0, 0x9e3779b1)) >>> 0);
  const G = {
    fps: true, t: 0, beam: 0, period: FPSC.PERIOD, flares: [], rocks: [], wrecks: [], timber: [], pickups: [], lures: [],
    mods: { lantern: 1 }, biome: FPS_SEAS[round % FPS_SEAS.length], minVis: 0.5,
    island: { x: FPSC.CX, y: FPSC.CY, r: FPSC.R, z: FPSC.GROUND },
    backrooms: false, sky: false, enemies: { drowned: [], knocks: [] }, maren: { active: false }, lightning: 0, parts: [],
  };
  fpsIsleGen(G, round, rng);
  G.island.key = G.isle.key;
  return G;
}
// a new round: the island is laid out again for it (keeping the clock, the flares and the beam)
function fpsNewIsland(G, round) {
  const N = fpsArena(round);
  for (const k of ['rocks', 'wrecks', 'isle', 'island', 'biome']) G[k] = N[k];
}
// where you are: the kind of island, and the sea it's in
function fpsPlaceName() {
  const sea = (BIOMES[g.biome] || BIOMES.skerry).name, up = t => t.replace(/^the /, 'The ');
  return g.isle ? `${up(g.isle.name)}, ${sea}` : up(sea);
}
const fpsRoundNow = () => Math.floor(Date.now() / FPSC.ROUND);
function fpsSkin() { try { return mySkin(); } catch (e) { return { hull: '#3a2a1e', sail: '#d8d0bc', rail: '#7a5a3a', lantern: '#ffd88a' }; } }
// your colours: [coat, sash, trim, lantern], from your outfit when you wear one (ocrates.js), else from your boat skin
function fpsColours() { const s = fpsSkin(), o = typeof ocOutfit === 'function' ? ocOutfit(ocEquippedId()) : null; return o ? [o.coat, o.sash, o.trim, s.lantern || '#ffd88a'] : [s.hull, s.sail, s.rail, s.lantern || '#ffd88a']; }

// ---------- entering and leaving ----------
// the Wreckers' Night card on the title screen: keep its count of players and its name box up to date
function fpsTitleTick() {
  if (state !== 'title' || $('titleCard').hidden) return;
  const n = $('fpsNick'); if (n && !n.value && document.activeElement !== n) n.value = NET.nick || ($('nick') && $('nick').value) || '';
  fpsLobbyStatus();
}
setInterval(fpsTitleTick, 1000);
// the weapon picker on the card: all six, in your equipped weapon skins; the one picked is in hand when you land
const FPS_WSTAT = { pepperbox: '6 shots · quick', blunderbuss: '9 balls · close', longarm: '1 shot · scope', harpoon: 'harpoon · slow', cutlass: 'blade · reach', avtomat: '25 rounds · auto' };
function fpsRenderPicks() {
  const box = $('weaponPick'); if (!box) return;
  if (box.childElementCount !== FPS_WORDER.length) {
    box.textContent = '';
    for (const id of FPS_WORDER) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pick'; b.dataset.w = id;
      const art = document.createElement('span'); art.className = 'wart';
      const nm = document.createElement('b'); nm.textContent = FPSW[id].n.replace(' gun', '');
      const st = document.createElement('small'); st.textContent = FPS_WSTAT[id];
      b.append(art, nm, st);
      b.addEventListener('click', () => { FPS.pick = id; try { localStorage.setItem('skerry-fps-weapon', id); } catch (e) {} fpsRenderPicks(); });
      box.appendChild(b);
    }
  }
  for (const b of box.children) {
    const id = b.dataset.w, on = id === (FPS.pick || 'pepperbox');
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    const art = b.querySelector('.wart'), sk = typeof wcEquippedSkin === 'function' ? wcEquippedSkin(id) : null, key = sk ? sk.id : 'plain';
    if (art.dataset.k !== key && typeof wcPreview === 'function' && sk) { art.dataset.k = key; art.textContent = ''; const svg = wcPreview(sk, 58); if (svg) art.appendChild(svg); }
  }
}
addEventListener('wcskin', fpsRenderPicks);
setTimeout(fpsRenderPicks, 0);
function fpsLobbyStatus() {
  const n = fpsPeers().length;
  $('fpsStatus').textContent = NET.status === 'ready'
    ? (n ? `${n} ${n === 1 ? 'wrecker is' : 'wreckers are'} on the island now.` : 'Nobody is on the island yet. Go ashore and others can join you; until they do, a few wreckers will keep you busy.')
    : NET.status === 'connecting' ? 'Looking for other players…' : 'No connection for other players here, so you\'ll be on the island with a few wreckers.';
}
function fpsStart() {
  if (FPS.on) return;
  const nick = ($('fpsNick').value || '').trim().slice(0, 16);
  FPS.nick = nick || 'Wrecker';
  FPS.on = true;
  FPS.saved = { state };
  state = 'fps';
  paused = false;
  try { audioInit(); } catch (e) {}
  $('titleCard').hidden = true; $('hud').hidden = true; $('logbox').hidden = true; $('biomeBanner').hidden = true;
  $('stage').classList.add('fpsmode');
  FPS.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window && navigator.maxTouchPoints > 0;
  $('fpsPad').hidden = !FPS.touch; FPS.hintT = 8; if (FPS.touch) fpsSafeArea();
  FPS.round = fpsRoundNow();
  if (typeof scorePlayed === 'function') scorePlayed('fps');   // the scoreboard (src/scores.js)
  FPS.g = fpsArena(FPS.round);
  FPS.me = { id: NET.sid, x: FPSC.CX, y: FPSC.CY, h: 0, p: 0, v: 0, z: 0, rudder: 0, bob: 0, boat: 'brig', inv: 0, pitch: 0,
    hp: FPSC.HP, ammo: 6, mags: {}, reload: 0, cd: 0, flares: FPSC.FLARES, lan: true, dead: 0, protect: 0, killer: null };
  FPS.crouch = false; FPS.crouchK = 0; FPS.crouchEye = 0; FPS.kb = {}; FPS.deaths = 0; FPS.seq = 0; FPS.shots = []; FPS.seenSeq = {}; FPS.hist = []; FPS.host = false; FPS.joinedAt = performance.now(); FPS.ai = null; FPS.remote.clear(); FPS.feed = []; FPS.pings = []; FPS.tracers = []; FPS.parts = []; FPS.drowned = [];
  FPS.bots = []; FPS.drownT = 25; FPS.roundMsg = null; FPS.menu = false; if (FPS.wcRound !== FPS.round) { FPS.wcK = 0; FPS.wcRound = FPS.round; } $('fpsMenu').hidden = true;
  FPS.weapon = FPS.last = FPS.pick || 'pepperbox'; FPS.harps = []; FPS.swings = []; FPS.scoped = false;
  fpsRespawn(FPS.me);
  if (typeof fpsVerityReset === 'function') fpsVerityReset(true);
  fpsSend(true);
  fpsFeed(`You come ashore on ${FPS.g.isle ? FPS.g.isle.name : 'the skerry'}. Keep out of the beam.`);
  try { cv.focus(); } catch (e) {}
}
function fpsStop() {
  if (!FPS.on) return;
  if (typeof scoreLeaving === 'function') scoreLeaving();   // the scoreboard: a game left before its end still counts
  if (FPS.zm && typeof zmStop === 'function') zmStop();
  FPS.on = false; FPS.inK = 0;
  if (typeof audioOutdoors === 'function') audioOutdoors(1);
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
  if (NET.room) NET.room.presence({ fps: null }).catch(() => {});
  $('stage').classList.remove('fpsmode');
  $('fpsPad').hidden = true; $('fpsMenu').hidden = true;
  if (typeof fpsBodyHide === 'function') fpsBodyHide();
  if (typeof fpsFiguresHide === 'function') fpsFiguresHide();
  if (FPS.vy) { FPS.vy.on = false; FPS.vScare = 0; } $('stage').classList.remove('scaring'); try { stopVerity(); } catch (e) {}
  state = FPS.saved ? FPS.saved.state : 'title';
  if (state !== 'title') state = 'title';
  toTitle();
}
function fpsSetMenu(on) {
  FPS.menu = on; $('fpsMenu').hidden = !on;
  // (always opens on its first page; a controller starts on Resume)
  $('fpsMenuMain').hidden = false; $('fpsMenuPad').hidden = true; $('fpsMenuHead').textContent = 'Menu'; FPS.menuPadWas = null; fpsMenuMark(null);
  if (on) { lookSync(); if (typeof fovSync === 'function') fovSync(); { const at = $('fpsAimToggle'); if (at) at.checked = aimToggle(); } const sb = $('fpsSmooth'); if (sb) sb.checked = FPS.smooth; FPS.mlook = [0, 0]; }
  if (on) { try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {} setTimeout(() => $('fpsResume').focus(), 20); }
}

// ---------- the network ----------
function fpsPeers() {
  const out = [];
  for (const p of NET.peers || []) {
    const pr = p.presence; if (!pr || !pr.fps || p.isMe || pr.sid === NET.sid) continue;
    if (typeof pr.fps !== 'object' || typeof pr.fps.id !== 'string') continue;
    out.push(pr.fps);
  }
  return out;
}
const fr1 = v => Math.round(v * 10) / 10, fr2 = v => Math.round(v * 100) / 100;
function fpsSend(force) {
  if (!NET.room || FPS.zm) return;
  const m = FPS.me;
  const out = {
    id: NET.sid, n: FPS.nick, r: FPS.round, x: fr1(m.x), y: fr1(m.y), h: fr2(m.h), p: fr2(m.p), hp: m.hp, dead: m.dead > 0 ? 1 : 0,
    lan: m.lan ? 1 : 0, sh: FPS.shots, kb: FPS.kb, d: FPS.deaths, bl: FPS.bell, fl: [FPS.flare, fr1(FPS.flareAt[0]), fr1(FPS.flareAt[1])],
    c: fpsColours(), o: typeof ocEquippedId === 'function' ? ocEquippedId() || null : null, wk: m.walk ? 1 : 0, ai: null, w: fpsW().code, sc: FPS.scoped ? 1 : 0, jz: fr2(m.jz || 0), cr: FPS.crouch ? 1 : 0, vy: typeof fpsVerityNet === 'function' ? fpsVerityNet() : null,
  };
  // the host shares the wreckers and the drowned
  if (FPS.host) out.ai = {
    b: FPS.bots.map(b => [b.id, b.n, fr1(b.x), fr1(b.y), fr2(b.h), b.hp, b.dead > 0 ? 1 : 0, b.lan ? 1 : 0, b.ci, b.walk ? 1 : 0, b.d, b.kb, b.o || 0]),
    dr: FPS.drowned.map(d => [d.id, fr1(d.x), fr1(d.y), d.hp, fr2(d.rise)]),
  };
  NET.room.presence({ fps: out }).catch(() => {});
}
// who runs the wreckers and the drowned: the lowest id on the island (after a moment to hear from everyone)
function fpsPickHost() {
  let low = NET.sid;
  for (const id of FPS.remote.keys()) if (id < low) low = id;
  const was = FPS.host;
  FPS.host = low === NET.sid && (performance.now() - FPS.joinedAt > 1500 || !NET.room);
  if (FPS.host && !was) {
    // taking over: carry on from where the last host left them
    for (const b of FPS.bots) { if (b.tx != null) { b.x = b.tx; b.y = b.ty; b.h = b.th; } b.cd = 1; b.goal = null; b.see = 0; b.hist = []; }
    for (const d of FPS.drowned) { if (d.tx != null) { d.x = d.tx; d.y = d.ty; } d.bite = 0; d.hist = []; }
  }
}
function fpsNetTick(dt) {
  const seen = new Set();
  let hostAi = null, hostId = null;
  for (const f of fpsPeers()) {
    seen.add(f.id);
    let r = FPS.remote.get(f.id);
    if (!r) {
      r = { id: f.id, x: f.x, y: f.y, h: f.h, p: f.p, bl: f.bl, fl: f.fl ? f.fl[0] : 0, hitT: 0, flashT: 0, dead: f.dead, d: f.d || 0, prevKb: Object.assign({}, f.kb || {}) };
      FPS.remote.set(f.id, r);
      // ignore shots fired before we arrived
      FPS.seenSeq[f.id] = Array.isArray(f.sh) && f.sh.length ? f.sh[f.sh.length - 1][0] : 0;
      fpsFeed(`${f.n || 'A wrecker'} came ashore.`);
    }
    r.n = f.n || 'Wrecker'; r.w = typeof f.w === 'string' ? f.w : 'p'; r.tx = f.x; r.ty = f.y; r.th = f.h; r.p = f.p; r.hp = f.hp; r.lan = !!f.lan; r.c = Array.isArray(f.c) ? f.c : null; r.o = typeof f.o === 'string' ? f.o.slice(0, 24) : ''; r.walk = !!f.wk; r.tjz = Math.max(0, Math.min(3, +f.jz || 0));
    r.cr = f.cr ? 1 : 0; if (r.cr) { r.tall = FPS_CROUCH.TALL; r.headZ = FPS_CROUCH.HEAD; } else { delete r.tall; delete r.headZ; }
    r.vy = Array.isArray(f.vy) && f.vy.length === 4 && f.vy.every(n => typeof n === 'number' && isFinite(n)) && Math.hypot(f.vy[0] - f.x, f.vy[1] - f.y) < 20 ? f.vy : null;
    r.kb = f.r === FPS.round && f.kb && typeof f.kb === 'object' ? f.kb : {};
    r.r = f.r;
    if (f.dead && !r.dead) { r.x = f.x; r.y = f.y; }
    if (!f.dead && r.dead) { r.x = f.x; r.y = f.y; r.h = f.h; }   // back ashore: jump, don't slide
    if ((f.d || 0) > r.d && f.r === FPS.round) {
      const killer = fpsKillerOf(r.kb, r);
      fpsFeed(killer ? `${killer} shot ${r.n}.` : `${r.n} was taken by the sea.`);
    } else r.prevKb = Object.assign({}, r.kb);
    r.d = f.d || 0; r.dead = f.dead;
    if (f.bl > r.bl) { FPS.pings.push({ x: f.x, y: f.y, t: 4, n: r.n }); fpsBellSound(Math.hypot(f.x - FPS.me.x, f.y - FPS.me.y)); }
    r.bl = f.bl;
    if (f.fl && f.fl[0] > r.fl) FPS.g.flares.push({ x: f.fl[1], y: f.fl[2], t: SK.FLARE_TIME, skin: FLARES[0] });
    if (f.fl) r.fl = f.fl[0];
    if (f.ai && typeof f.ai === 'object' && (hostId == null || f.id < hostId)) { hostAi = f.ai; hostId = f.id; }
  }
  for (const id of [...FPS.remote.keys()]) if (!seen.has(id)) { fpsFeed(`${FPS.remote.get(id).n} left the island.`); FPS.remote.delete(id); }
  fpsPickHost();
  if (!FPS.host && hostAi) fpsMirrorAi(hostAi);
  // shots: everyone's new ones, checked against me (and, as host, against the wreckers and the drowned)
  for (const f of fpsPeers()) {
    if (!Array.isArray(f.sh)) continue;
    const last = FPS.seenSeq[f.id] || 0;
    for (const sh of f.sh) if (Array.isArray(sh) && sh[0] > last) fpsIncoming(sh, f);
    if (f.sh.length) FPS.seenSeq[f.id] = Math.max(last, f.sh[f.sh.length - 1][0]);
  }
  // smooth everyone towards where they last said they were
  const k = Math.min(1, dt * 12);
  for (const r of FPS.remote.values()) {
    if (r.tx == null) continue;
    r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.h += angDiff(r.th, r.h) * k; r.jz = (r.jz || 0) + ((r.tjz || 0) - (r.jz || 0)) * Math.min(1, k * 1.6);
    if (r.flashT > 0) r.flashT -= dt; if (r.hitT > 0) r.hitT -= dt;
  }
  if (!FPS.host) {
    for (const b of FPS.bots) if (b.tx != null) { b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k; b.h += angDiff(b.th, b.h) * k; }
    for (const d of FPS.drowned) if (d.tx != null) { d.x += (d.tx - d.x) * k; d.y += (d.ty - d.y) * k; }
  }
  FPS.sendT -= dt;
  if (FPS.sendT <= 0) { FPS.sendT = FPSC.SEND; fpsSend(); }
}
// a wrecker's colours follow their outfit, if they have one
function fpsBotDress(b) { const o = typeof ocOutfit === 'function' ? ocOutfit(b.o) : null; b.c = o ? [o.coat, o.sash, o.trim, '#ffd88a'] : FPS_BOT_COLS[(b.ci || 0) % FPS_BOT_COLS.length]; }
// the host's wreckers and drowned, shown here
const FPS_BOT_COLS = [['#2a3a4a', '#c8c0aa', '#6a4a2a', '#ffd88a'], ['#4a2420', '#d8ccb4', '#8a6a3a', '#ffb070'], ['#25352a', '#cfc8b0', '#5a4a3a', '#d8f0ff'], ['#3a2a40', '#d0c4d8', '#6a5a7a', '#e8c8ff']];
function fpsMirrorAi(ai) {
  const old = new Map(FPS.bots.map(b => [b.id, b])), bots = [];
  for (const a of Array.isArray(ai.b) ? ai.b : []) {
    if (!Array.isArray(a)) continue;
    let b = old.get(a[0]);
    if (!b) b = { id: a[0], bot: true, x: a[2], y: a[3], h: a[4], hitT: 0, flashT: 0, prevKb: {}, d: a[10] || 0 };
    b.n = a[1]; b.tx = a[2]; b.ty = a[3]; b.th = a[4]; b.hp = a[5]; b.lan = !!a[7]; b.ci = a[8]; b.o = typeof a[12] === 'string' ? a[12].slice(0, 24) : ''; fpsBotDress(b); b.walk = !!a[9];
    const dead = a[6] ? 1 : 0;
    if (!dead && b.dead > 0) { b.x = b.tx; b.y = b.ty; }
    b.dead = dead;
    b.kb = a[11] && typeof a[11] === 'object' ? a[11] : {};
    if ((a[10] || 0) > (b.d || 0)) { const killer = fpsKillerOf(b.kb, b); fpsFeed(killer ? `${killer} shot ${b.n}.` : `${b.n} went down.`); }
    else b.prevKb = Object.assign({}, b.kb);
    b.d = a[10] || 0;
    bots.push(b);
  }
  FPS.bots = bots;
  const oldD = new Map(FPS.drowned.map(d => [d.id, d])), dr = [];
  for (const a of Array.isArray(ai.dr) ? ai.dr : []) {
    if (!Array.isArray(a)) continue;
    let d = oldD.get(a[0]);
    if (!d) { d = { drowned: true, id: a[0], n: 'a drowned man', x: a[1], y: a[2], ph: Math.random() * 6, hitT: 0 }; fpsFeed('Something is wading ashore.'); }
    d.tx = a[1]; d.ty = a[2]; d.hp = a[3]; d.rise = a[4];
    dr.push(d);
  }
  FPS.drowned = dr;
}
// whose name went up in someone's kill book since last time
function fpsKillerOf(now, who) {
  const prev = who.prevKb || {};
  who.prevKb = Object.assign({}, now);
  for (const id in now) if ((now[id] || 0) > (prev[id] || 0)) return fpsNameOf(id);
  return null;
}
function fpsNameOf(id) {
  if (id === NET.sid || id === FPS.me.id) return 'You';
  const r = FPS.remote.get(id); if (r) return r.n;
  const b = FPS.bots.find(o => o.id === id); return b ? b.n : 'someone';
}

// ---------- the people on the island ----------
function fpsEveryone() {
  const out = [Object.assign({ me: true, n: FPS.nick, c: fpsColours() }, FPS.me)];
  for (const r of FPS.remote.values()) out.push(r);
  for (const b of FPS.bots) out.push(b);
  return out;
}
function fpsRespawn(m) {
  // somewhere clear of rocks, as far as can be from everyone else
  const others = fpsEveryone().filter(o => o.id !== m.id && !(o.dead > 0));
  let best = null, bestD = -1;
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * (FPSC.R - 20);
    const x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d;
    if (fpsBlocked(x, y, 1.5) || !fpsReachable(x, y)) continue;
    const near = others.reduce((s, o) => Math.min(s, Math.hypot(o.x - x, o.y - y)), 1e9);
    if (near > bestD) { bestD = near; best = [x, y]; }
  }
  if (!best) best = [FPSC.CX, FPSC.CY - FPSC.R * 0.5];
  m.x = best[0]; m.y = best[1]; m.h = bearingOf(FPSC.CX - m.x, FPSC.CY - m.y); m.p = 0;
  m.hp = FPSC.HP; m.reload = 0;
  m.mags = {}; for (const id in FPSW) m.mags[id] = FPSW[id].mag;
  if (m === FPS.me) { m.ammo = m.mags[FPS.weapon]; FPS.scoped = false; } else m.ammo = 6; m.cd = 0; m.flares = FPSC.FLARES; m.dead = 0; m.protect = FPSC.PROTECT; m.jz = 0; m.vz = 0;
}
// (z: only what stands taller than that height counts, for the over-the-shoulder camera)
function fpsBlocked(x, y, pad, z) { return fpsBlockedIn(FPS.g, x, y, pad, z); }
function fpsBlockedIn(G, x, y, pad, z) {
  if (Math.hypot(x - FPSC.CX, y - FPSC.CY) > FPSC.R - 1.5) return true;
  return fpsSolidAt(G, x, y, pad, z);
}
// rocks, wrecks and the island's props (walls, crates, boats...), without the shore
function fpsSolidAt(G, x, y, pad, z) {
  for (const o of G.rocks) if (Math.hypot(o.x - x, o.y - y) < o.r * 1.02 + pad) return true;
  for (const o of G.wrecks) if (Math.hypot(o.x - x, o.y - y) < o.r * 0.75 + pad) return true;
  return fpsIsleBlocked(G, x, y, pad, z);
}
// walk towards a heading, and if something's in the way, try turning a little either side
// (the side that worked last is tried first, so wreckers slide along a wall instead of dithering)
function fpsSteer(m, h, step) {
  const side = m.steer || 1;
  for (const dh of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4]) {
    const hh = h + dh * side, x0 = m.x, y0 = m.y;
    if (fpsMove(m, Math.sin(hh) * step, Math.cos(hh) * step) && Math.hypot(m.x - x0, m.y - y0) > Math.abs(step) * 0.3) { if (dh) m.steer = Math.sign(dh * side); return true; }
  }
  m.steer = -side;
  return false;
}
// move with sliding along whatever is in the way
function fpsMove(m, dx, dy) {
  if (FPS.zm) return zmMove(m, dx, dy);
  if (!fpsBlocked(m.x + dx, m.y + dy, 0.5)) { m.x += dx; m.y += dy; return true; }
  if (!fpsBlocked(m.x + dx, m.y, 0.5)) { m.x += dx; return true; }
  if (!fpsBlocked(m.x, m.y + dy, 0.5)) { m.y += dy; return true; }
  return false;
}
// how well I can see a point: the beam, flares, my lantern (or the moon close by), their own lantern
function fpsSeeAt(x, y, theirLantern) {
  const me = FPS.me, d = Math.hypot(x - me.x, y - me.y);
  const mine = me.lan ? Math.max(0, 1 - d / SK.LANTERN) * 1.6 : Math.max(0, 1 - d / 14) * 0.9;
  const own = theirLantern ? 0.85 : 0;
  return Math.min(1, litAt(x, y) * 1.3 + flareAt(x, y) + mine + own + fpsIsleLightAt(x, y));
}

// ---------- shooting ----------
// the first thing along a ray from (x, y, z) heading h, pitched p: a person, a rock, a wreck or the ground
// (targets: who can be hit; everyone on the island unless given)
// (tol: a little more body to hit, all round, for a forgiving projectile: the harpoon)
function fpsRay(x, y, z, h, p, skipId, targets, range, tol) {
  const sx = Math.sin(h), sy = Math.cos(h), tp = Math.tan(p);
  let best = { t: range || FPSC.RANGE, kind: 'none' };
  if (p < -0.001) { const tg = (z - FPSC.GROUND) / -tp; if (tg < best.t) best = { t: tg, kind: 'ground' }; }
  const circle = (cx, cy, r) => {
    const ox = cx - x, oy = cy - y, along = ox * sx + oy * sy; if (along < 0) return null;
    const side2 = ox * ox + oy * oy - along * along; if (side2 > r * r) return null;
    return along - Math.sqrt(r * r - side2);
  };
  const B = curBiome();
  for (const o of FPS.g.rocks) {
    const t = circle(o.x, o.y, o.r * 0.95); if (t == null || t > best.t) continue;
    if (z + tp * Math.max(0, t) < o.r * 0.85 * B.rock.h * 0.85 * (o.rk && o.rk.h || 1)) best = { t: Math.max(0, t), kind: 'rock' };
  }
  for (const o of FPS.g.wrecks) {
    const t = circle(o.x, o.y, o.r * 0.6); if (t == null || t > best.t) continue;
    if (z + tp * Math.max(0, t) < o.r * 0.45) best = { t: Math.max(0, t), kind: 'wreck' };
  }
  best = fpsIsleRay(FPS.g, x, y, z, sx, sy, tp, best);
  if (!targets) { targets = []; for (const o of fpsEveryone()) if (!(o.dead > 0)) targets.push(o); for (const d of FPS.drowned) targets.push(d); }
  for (const o of targets) {
    if (o.id === skipId) continue;
    // (a body can be bigger than most: rad, tall and headZ, for the Lighthouse's Diver)
    const t = circle(o.x, o.y, (o.rad || FPSC.BODY) + (tol || 0)); if (t == null || t > best.t) continue;
    const hz = z + tp * t - FPSC.GROUND - (o.jz || 0), top = (o.tall || FPSC.TALL) + 0.1 + (tol || 0);
    if (hz > top && FPS.zm && tp < 0) {
      // (in the Lighthouse, a shot steeply down onto something short, a crab at your feet, comes in through its top,
      // not its side: where the line drops to the top's height, if that's still over it)
      const t2 = t + (hz - top) / -tp, ox = o.x - x, oy = o.y - y, along = ox * sx + oy * sy, R = (o.rad || FPSC.BODY) + (tol || 0);
      const out = along + Math.sqrt(Math.max(0, R * R - (ox * ox + oy * oy - along * along)));
      if (t2 <= out && t2 < best.t) best = { t: t2, kind: 'body', who: o, head: true };
      continue;
    }
    if (hz < -(tol || 0) || hz > top) continue;
    best = { t, kind: 'body', who: o, head: hz > (o.headZ || 1.5) };
  }
  best.x = x + sx * best.t; best.y = y + sy * best.t; best.z = z + tp * best.t;
  return best;
}
// where someone has been lately, for judging shots fairly
function fpsRemember(o, now) {
  (o.hist = o.hist || []).push({ t: now, x: o.x, y: o.y, jz: o.jz || 0, cr: o.cr ? 1 : 0 });
  while (o.hist.length && now - o.hist[0].t > FPSC.LAG * 1000 + 100) o.hist.shift();
}
// the directions of the balls in a blunderbuss shot, the same on every screen (from the shot's seed)
// (in the Lighthouse a weapon can load differently: ZM_SHOT in src/zombies.js, the blunderbuss's wider charge)
function fpsPellets(sh) {
  const [, , , , h, p, , code, seed] = sh, w = fpsWOf(code), rng = seeded((seed || 1) >>> 0), out = [];
  const o = FPS.zm && typeof ZM_SHOT !== 'undefined' && ZM_SHOT[code], n = (o && o.pellets) || w.pellets, sp = (o && o.spread) || w.spread;
  for (let i = 0; i < n; i++) { const a = rng() * 6.283, r = Math.sqrt(rng()) * sp; out.push([h + Math.cos(a) * r, p + Math.sin(a) * r * 0.7]); }
  return out;
}
// the line(s) a shot travels: one for most guns, nine for the blunderbuss, a little wander from the hip for the longarm
function fpsLines(sh) {
  const [, , , , h, p, , code, seed] = sh, w = fpsWOf(code);
  if (w.pellets) return fpsPellets(sh);
  if (w.hip && seed) { const rng = seeded(seed >>> 0), a = rng() * 6.283, r = Math.sqrt(rng()) * w.hip; return [[h + Math.cos(a) * r, p + Math.sin(a) * r * 0.7]]; }
  return [[h, p]];
}
// did this shot (or cut) hit them, at any place they've been in the last few tenths of a second? → { dmg, head } or null
function fpsShotHits(sh, o) {
  const [, x, y, z, h, p, by, code] = sh, w = fpsWOf(code);
  const places = (o.hist || []).concat([{ x: o.x, y: o.y, jz: o.jz || 0, cr: o.cr ? 1 : 0 }]);
  let best = null;
  for (let i = places.length - 1; i >= 0; i--) {
    const at = places[i], who = { id: o.id, x: at.x, y: at.y, jz: at.jz || 0 };
    if (at.cr) { who.tall = FPS_CROUCH.TALL; who.headZ = FPS_CROUCH.HEAD; }   // (crouched then: a smaller target)
    let dmg = 0, head = false;
    if (w.melee) {
      const d = Math.hypot(at.x - x, at.y - y), b = bearingOf(at.x - x, at.y - y);
      if (d <= w.reach + FPSC.BODY && Math.abs(angDiff(b, h)) < w.arc) {
        const r = fpsRay(x, y, z - 0.4, b, 0, by, [who], w.reach + 1);
        if (r.kind === 'body') dmg = w.dmg;
      }
    } else for (const [lh, lp] of fpsLines(sh)) {
      const r = fpsRay(x, y, z, lh, lp, by, [who], w.range);
      if (r.kind === 'body') { dmg += r.head ? w.head : w.dmg; head = head || r.head; }
    }
    if (dmg && (!best || dmg > best.dmg)) best = { dmg, head };
  }
  return best;
}
// a shot to pass on: [seq, x, y, z, heading, pitch, shooter, weapon code, seed]
function fpsPublishShot(x, y, z, h, p, by, code, seed) {
  const sh = [++FPS.seq, fr1(x), fr1(y), fr2(z), Math.round(h * 1000) / 1000, Math.round(p * 1000) / 1000, by, code || 'p', seed || 0];
  FPS.shots.push(sh); if (FPS.shots.length > 8) FPS.shots.shift();
  FPS.sendT = 0;   // send it straight away
  return sh;
}
// what a shot looks and sounds like, wherever it came from; and, if it's mine or I'm the host, its effect on the wreckers and the drowned
function fpsResolveShot(sh, mine) {
  if (FPS.zm) return zmResolveShot(sh, mine);
  const [, x, y, z, h, p, by, code] = sh, w = fpsWOf(code), m = FPS.me;
  const d = Math.hypot(x - m.x, y - m.y), pan = angDiff(bearingOf(x - m.x, y - m.y), m.h);
  const shooter = by === m.id ? null : FPS.remote.get(by) || FPS.bots.find(b => b.id === by);
  if (w.melee) { if (shooter) shooter.slashT = 0.3; fpsSwishSound(mine ? 0 : d); }
  else { if (shooter) shooter.flashT = 0.12; fpsWeaponSound(code, mine ? 0 : d, mine ? 0 : pan); }
  if (w.speed) {
    // the harpoon flies as a thing of its own; everyone moves it the same way
    const cp = Math.cos(p);
    FPS.harps.push({ sh, by, x: x + Math.sin(h) * 0.8, y: y + Math.cos(h) * 0.8, z: z - 0.2, vx: Math.sin(h) * cp * w.speed, vy: Math.cos(h) * cp * w.speed, vz: Math.sin(p) * w.speed, t: 0, stuck: 0, mine, from: by });
    return;
  }
  // streaks: one per ball, to whatever each one hits as I see it
  if (!w.melee) for (const [lh, lp] of fpsLines(sh)) {
    const r = fpsRay(x, y, z, lh, lp, by, null, w.range);
    FPS.tracers.push({ a: [x + Math.sin(lh) * 0.6, y + Math.cos(lh) * 0.6, z - 0.25], b: [r.x, r.y, r.z], t: w.pellets ? 0.06 : 0.08, k: w.code });
    if (r.kind !== 'body' && r.kind !== 'none' && (mine || d < 80)) fpsPuff(r.x, r.y, r.z, r.kind === 'ground' ? '150,140,120' : '190,190,180', w.pellets ? 2 : 6);
  }
  // the hit marker on my own shot is my best guess; the target (or the host) has the last word
  if (mine) {
    let any = null;
    for (const o of fpsEveryone().concat(FPS.drowned)) { if (o.me || o.dead > 0) continue; const hit = fpsShotHits(sh, o); if (hit) { any = any || hit; o.hitT = 0.2; } }
    if (any) { FPS.hitT = 0.18; FPS.hitHead = any.head; fpsHitSound(any.head); }
  }
  if (FPS.host || !NET.room || !FPS.remote.size) {
    for (const b of FPS.bots) { if (b.id === by || b.dead > 0) continue; const hit = fpsShotHits(sh, b); if (hit) fpsBotHurt(b, hit.dmg, by); }
    for (const dr of FPS.drowned) { if (dr.dead) continue; const hit = fpsShotHits(sh, dr); if (hit) fpsDrownedHurt(dr, hit.dmg, hit.head, code); }
  }
}
// someone else's shot arriving: what it looks like, and whether it hit me where I really was
function fpsIncoming(sh, f) {
  fpsResolveShot(sh, false);
  const by = sh[6], m = FPS.me;
  if (fpsWOf(sh[7]).speed) return;   // harpoons hit (or miss) as they fly
  if (!(m.dead > 0) && !(m.protect > 0)) { const hit = fpsShotHits(sh, m); if (hit) fpsHurt(hit.dmg, by, fpsNameOf(by)); }
}
function fpsShoot() {
  if (FPS.zm && typeof rclShoot === 'function' && rclShoot()) return;   // [classes] an ultimate in place of the weapon (src/rclass.js)
  const m = FPS.me, w = fpsW();
  if (m.dead > 0 || m.reload > 0 || m.cd > 0 || FPS.menu || FPS.drawT > 0) return;
  if (!w.melee && m.ammo <= 0) { if (FPS.zm && !zmCanReload()) { zmKnife(); return; } fpsReload(); return; }
  if (!w.auto && !w.melee && FPS.heldFire) return;          // single-shot guns: one pull, one shot
  if (w.beam) { FPS.heldFire = true; m.cd = w.rate; m.protect = 0; m.ammo--; m.mags[FPS.weapon] = m.ammo; FPS.vmShots = (FPS.vmShots || 0) + 1; FPS.recoil = Math.min(1.6, w.kick); zmBeam(); if (typeof zmnShot === 'function') zmnShot(w.code, m.h, m.p); if (m.ammo <= 0) setTimeout(fpsReload, 250); return; }
  // (holding the trigger of an automatic, the time past the last round carries over, so it keeps its rate on a slow screen)
  const carry = w.auto && FPS.heldFire && m.cd < 0 ? Math.max(-0.3, m.cd) : 0;
  FPS.heldFire = true;
  m.cd = w.rate + carry; m.protect = 0;
  if (w.melee) { FPS.swing = (FPS.swing || 0) + 1; }
  else { m.ammo--; m.mags[FPS.weapon] = m.ammo; FPS.flash = 0.07; FPS.recoil = Math.min(1.6, w.kick); FPS.meFlashT = 0.12; }
  const climbNext = !!w.climb;
  if (w.melee) FPS.meSlashT = 0.3;
  FPS.vmShots = (FPS.vmShots || 0) + 1;
  const z = FPSC.GROUND + FPSC.EYE + (m.jz || 0) - (FPS.downEye || 0) - (FPS.crouchEye || 0), seed = (Math.random() * 2147483647) | 0;   // (FPS.downEye: down on the floor in the Lighthouse)
  const [ah, ap] = fpsAimFrom(m.x, m.y, z, w);
  if (FPS.zm) { FPS.zmShots = (FPS.zmShots || 0) + 1; if (typeof zmnShot === 'function') zmnShot(w.code, ah, ap); }
  const sh = fpsPublishShot(m.x, m.y, z, ah, ap, m.id, w.code, FPS.scoped ? 0 : seed);
  if (typeof fpsVerityShot === 'function') fpsVerityShot(m.x, m.y, ah);
  fpsResolveShot(sh, true);
  // a gun that climbs: each round throws the muzzle up and a little to one side, after the round has gone; less
  // when aimed down the sights. Some of the climb settles back when you let go of the trigger (see fpsFrame)
  if (climbNext) {
    const k = FPS.scoped ? 0.62 : 1, up = w.climb * k * (0.8 + Math.random() * 0.45);
    m.p = clamp(m.p + up, -FPSC.PMAX, FPSC.PMAX); m.h = wrapPi(m.h + (Math.random() - 0.45) * w.sway * k * 2);
    FPS.climb = Math.min(0.25, (FPS.climb || 0) + up * 0.55); FPS.sinceShot = 0;
  }
  if (!w.melee && m.ammo <= 0) setTimeout(fpsReload, w.mag === 1 ? 420 : 250);
}
// which way a shot leaves your gun. In first person that's simply where you look. Over the shoulder the camera sits
// behind you and to the right, so the crosshair's line starts at the camera: find what it lands on, then fire from
// your own eyes at that point (as shoulder cameras do), so what's under the crosshair is what you hit
function fpsAimFrom(x, y, z, w) {
  const m = FPS.me;
  if (!fpsThird() || !FPS.camAt || w.melee) return [m.h, m.p];
  const [cxp, cyp, czp] = FPS.camAt, reach = w.range || FPSC.RANGE;
  // start the crosshair's line level with you, so nothing between the camera and your back gets in the way
  const back = (cxp - x) * Math.sin(m.h) + (cyp - y) * Math.cos(m.h);   // negative: the camera's behind you
  const skip = Math.max(0, -back) / Math.max(0.2, Math.cos(m.p));
  const ox = cxp + Math.sin(m.h) * Math.cos(m.p) * skip, oy = cyp + Math.cos(m.h) * Math.cos(m.p) * skip, oz = czp + Math.sin(m.p) * skip;
  const r = fpsRay(ox, oy, oz, m.h, m.p, m.id, null, reach + 40);
  const tx = r.x, ty = r.y, tz = r.z, d = Math.hypot(tx - x, ty - y);
  if (d < 1.2) return [m.h, m.p];
  return [bearingOf(tx - x, ty - y), clamp(Math.atan2(tz - z, d), -0.9, 0.9)];
}
// the harpoons in flight (and stuck where they landed)
function fpsHarpoonsTick(dt) {
  const w = FPSW.harpoon, m = FPS.me;
  for (const hp of FPS.harps) {
    hp.t += dt;
    if (hp.stuck) { hp.stuck -= dt; continue; }
    if (hp.done) continue;
    const steps = 4, sdt = dt / steps;
    for (let i = 0; i < steps && !hp.done; i++) {
      const ox = hp.x, oy = hp.y, oz = hp.z;
      hp.vz -= w.drop * sdt; hp.x += hp.vx * sdt; hp.y += hp.vy * sdt; hp.z += hp.vz * sdt;
      if (hp.skew && typeof zmpHarpoonCarry === 'function') zmpHarpoonCarry(hp, false);   // [pap] (those on the shaft)
      const seg = Math.hypot(hp.x - ox, hp.y - oy), hh = bearingOf(hp.vx, hp.vy), pp = Math.atan2(hp.vz, Math.hypot(hp.vx, hp.vy));
      // people: me (judged here), the wreckers and the drowned (judged by the host), and a guess at the others for my hit marker
      const people = [];
      if (hp.by !== m.id && !(m.dead > 0) && !(m.protect > 0)) people.push({ id: m.id, x: m.x, y: m.y, me: true });
      const hostish = FPS.host || !NET.room || !FPS.remote.size;
      for (const b of FPS.bots) if (b.id !== hp.by && !(b.dead > 0)) people.push(b);
      for (const d of FPS.drowned) if (!d.dead && !((hp.skew || hp.thru) && zmpHarpoonSkip(hp, d))) people.push(d);   // ([pap] the Whale-Road passes through)
      if (hp.mine) for (const r of FPS.remote.values()) if (!r.dead) people.push(r);
      const r = fpsRay(ox, oy, oz, hh, pp, hp.by, people, seg + 0.05, w.tol);
      if (r.kind === 'none') { if (hp.z < FPSC.GROUND || hp.t > 6 || Math.hypot(hp.x - FPSC.CX, hp.y - FPSC.CY) > FPSC.R + 200) { hp.done = true; hp.stuck = hp.z < FPSC.GROUND ? 8 : 0; if (hp.skew && typeof zmpHarpoonCarry === 'function') zmpHarpoonCarry(hp, true); } continue; }
      hp.x = r.x; hp.y = r.y; hp.z = r.z; hp.done = true;
      if (r.kind === 'body' && FPS.zm && typeof zmpHarpoonHit === 'function' && zmpHarpoonHit(hp, r)) { hp.done = false; continue; }   // [pap] the Whale-Road runs them through
      if (r.kind === 'body') {
        const o = r.who; o.hitT = 0.25;
        fpsPuff(r.x, r.y, r.z, '160,30,20', 12);
        if (o.me) fpsHurt(w.dmg, hp.by, fpsNameOf(hp.by));
        else if (o.bot && hostish) fpsBotHurt(o, w.dmg, hp.by);
        else if (o.drowned && hostish) fpsDrownedHurt(o, w.dmg, r.head, 'h');
        if (hp.mine) { FPS.hitT = 0.25; FPS.hitHead = true; fpsHitSound(true); }
        // (in the Lighthouse, an iron that kills goes on through and into the next: zmHarpoonOn, src/zombies.js)
        if (o.drowned && FPS.zm && typeof zmHarpoonOn === 'function' && zmHarpoonOn(hp, o)) { hp.done = false; continue; }
        hp.stuck = 0.6;
        if (hp.skew && typeof zmpHarpoonCarry === 'function') zmpHarpoonCarry(hp, true);
      } else { if (hp.skew && typeof zmpHarpoonCarry === 'function') zmpHarpoonCarry(hp, true); hp.stuck = 8; fpsPuff(r.x, r.y, r.z, '190,190,180', 8); try { noise('bandpass', 900, 3, 0.002, 0.12, 0.15); } catch (e) {} }
    }
  }
  FPS.harps = FPS.harps.filter(hp => !hp.done || hp.stuck > 0);
  if (FPS.harps.length > 12) FPS.harps.splice(0, FPS.harps.length - 12);
}
function fpsSwitch(id) {
  const m = FPS.me;
  if (!FPSW[id] || id === FPS.weapon || m.dead > 0) return;
  if (FPS.zm && !ZM.own.includes(id)) return;   // in the Lighthouse, only what you carry
  m.mags[FPS.weapon] = m.ammo;
  FPS.last = FPS.weapon; FPS.weapon = id;
  m.ammo = m.mags[id]; m.reload = 0; m.cd = 0; FPS.drawT = 0.45; FPS.scoped = false; FPS.heldFire = false;
  try { tone(260, 'triangle', 0.002, 0.04, 0.08); noise('bandpass', 2400, 2, 0.002, 0.04, 0.1); } catch (e) {}
  fpsSend();
}
const fpsCycle = d => { const L = FPS.zm ? ZM.own : FPS_WORDER; fpsSwitch(L[(L.indexOf(FPS.weapon) + d + L.length) % L.length]); };
function fpsScope(on) { const w = fpsW(); FPS.scoped = !!on && !!(w.scope || w.ads) && !(FPS.me.reload > 0) && !(FPS.me.dead > 0); }
function fpsReload() {
  const m = FPS.me, w = fpsW();
  // (the cutlass has nothing to load: R gives it a wipe and a look along the edge instead)
  if (m.dead > 0 || m.reload > 0 || FPS.drawT > 0 || (!w.melee && m.ammo >= w.mag)) return;
  if (FPS.zm && !w.melee && !zmCanReload()) return;
  m.reload = FPS.reloadDur = w.reload * (FPS.zm ? zmReloadK() : 1); FPS.reloadOf = FPS.weapon; FPS.scoped = false; if (!w.melee) { fpsClick(); sfxPlay('reload', { vol: 0.5, rate: Math.min(1.4, Math.max(0.8, 2.2 / FPS.reloadDur)) }); }
}
function fpsHurt(n, fromId, fromName) {
  const m = FPS.me; if (m.dead > 0 || m.protect > 0 || m.iframe > 0) return;
  if (FPS.zm && typeof rclHurtK === 'function') { n = rclHurtK(n); if (!(n > 0)) return; }   // [classes] Bulwark, the Wellspring (src/rclass.js)
  m.hp -= n; FPS.hurtT = 0.5; FPS.calm = 0;
  // (in the Lighthouse, a knock from the drowned buys half a second before the next can land: shooting doesn't end it)
  if (FPS.zm) m.iframe = ZMC.IFRAME_HIT;
  try { sfxHit(); } catch (e) {}
  if (m.hp <= 0) fpsDie(fromId, fromName);
}
function fpsDie(fromId, fromName) {
  if (FPS.zm) return zmDown();
  const m = FPS.me;
  m.hp = 0; m.dead = FPSC.RESPAWN; m.killer = fromName && fromName !== 'You' ? fromName : null;
  FPS.deaths++;
  if (fromId) FPS.kb[fromId] = (FPS.kb[fromId] || 0) + 1;
  fpsFeed(m.killer === 'Verity' ? 'Verity helped.' : m.killer ? `${m.killer} shot you.` : 'The sea took you.');
  fpsSend();
}
function fpsFlare() {
  const m = FPS.me; if (m.dead > 0 || m.flares <= 0) return;
  m.flares--; FPS.flare++; FPS.flareAt = [m.x + Math.sin(m.h) * 30, m.y + Math.cos(m.h) * 30];
  FPS.g.flares.push({ x: FPS.flareAt[0], y: FPS.flareAt[1], t: SK.FLARE_TIME, skin: FLARES[0] });
  try { sfxFlare(); } catch (e) {}
  if (typeof fpsVerityShoo === 'function') fpsVerityShoo();
  fpsSend();
}
function fpsBell() {
  const m = FPS.me; if (m.dead > 0 || (FPS.bellCd || 0) > 0) return;
  FPS.bellCd = 8; FPS.bell++;
  if (typeof fpsVerityBell === 'function') fpsVerityBell();
  try { sfxBell(); } catch (e) {}
  for (const o of fpsEveryone()) if (!o.me && !(o.dead > 0)) FPS.pings.push({ x: o.x, y: o.y, t: 3, n: o.n });
  fpsSend();
}
// melee on Wreckers' Night: out comes the cutlass, and a second press goes back to what you had
function fpsMelee() { if (FPS.weapon === 'cutlass') fpsSwitch(FPS.last !== 'cutlass' ? FPS.last : 'pepperbox'); else fpsSwitch('cutlass'); }
function fpsLantern() { FPS.me.lan = !FPS.me.lan; try { sfxTick(); } catch (e) {} fpsSend(); }

// ---------- sounds (made from the game's own noises) ----------
function fpsGunSound(d, pan) {
  try {
    if (soundOff()) return;
    const v = Math.max(0.05, 1 - d / 350);
    if (sfxPlay('pepperbox', { vol: 0.95 * v, pan: Math.max(-1, Math.min(1, pan || 0)), vary: 0.1 })) return;
    noise('lowpass', 1600 * v + 300, 0.7, 0.002, 0.55 * v, 0.28 + (1 - v) * 0.3, { pan: Math.max(-1, Math.min(1, pan || 0)) });
    tone(90, 'triangle', 0.002, 0.3 * v, 0.18, { to: 45 });
  } catch (e) {}
}
// each weapon's own report: the pepperbox's crack, the blunderbuss's roar, the longarm's long bang,
// the harpoon gun's thump and the hiss of its line
function fpsWeaponSound(code, d, pan) {
  try {
    if (soundOff()) return;
    const v = Math.max(0.05, 1 - d / 400), o = { pan: Math.max(-1, Math.min(1, pan || 0)) };
    { const R = { p: 'pepperbox', b: 'blunderbuss', l: 'longarm', h: 'harpoon', a: 'avtomat' }[code] || (FPSW_BY_CODE[code] ? null : 'pepperbox'); if (R && sfxPlay(R, { vol: (code === 'a' ? 0.7 : 0.95) * v, pan: o.pan, vary: 0.1 })) return; }   // (the recordings: src/sfxbank.js)
    if (code === 'b') { noise('lowpass', 900 * v + 250, 0.6, 0.002, 0.8 * v, 0.55 + (1 - v) * 0.3, o); tone(55, 'sawtooth', 0.002, 0.35 * v, 0.3, { to: 30 }); }
    else if (code === 'l') { noise('lowpass', 2200 * v + 300, 0.8, 0.001, 0.7 * v, 0.45 + (1 - v) * 0.5, o); tone(120, 'triangle', 0.001, 0.25 * v, 0.25, { to: 40 }); }
    else if (code === 'a') { noise('lowpass', 2800 * v + 400, 0.9, 0.001, 0.42 * v, 0.12 + (1 - v) * 0.3, o); tone(160, 'square', 0.001, 0.1 * v, 0.05, { to: 70 }); }
    else if (code === 'h') { noise('lowpass', 500, 0.8, 0.003, 0.5 * v, 0.25, o); tone(70, 'triangle', 0.003, 0.4 * v, 0.2, { to: 35 }); noise('highpass', 3000, 0.7, 0.05, 0.12 * v, 0.6, o); }
    else fpsGunSound(d, pan);
  } catch (e) {}
}
function fpsSwishSound(d) { try { if (soundOff()) return; const v = Math.max(0.05, 1 - d / 60); if (sfxPlay('swish', { vol: 0.7 * v, vary: 0.15 })) return; noise('bandpass', 2600, 1.2, 0.03, 0.22 * v, 0.18); } catch (e) {} }
function fpsBellSound(d) { try { sfxBellFar(0, Math.max(0.15, 1 - d / 400)); } catch (e) {} }
function fpsHitSound(head) { try { tone(head ? 1250 : 900, 'square', 0.001, 0.06, 0.05); } catch (e) {} }
function fpsClick() { try { tone(420, 'square', 0.001, 0.05, 0.04); tone(300, 'square', 0.001, 0.05, 0.04, { delay: 0.5 }); } catch (e) {} }
function fpsFeed(text) { FPS.feed.push({ text, t: 5 }); if (FPS.feed.length > 5) FPS.feed.shift(); }
function fpsPuff(x, y, z, col, n) { for (let i = 0; i < n; i++) FPS.parts.push({ x, y, z, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: Math.random() * 3, t: 0.6, c: col }); }

// ---------- wreckers (bots) and the drowned: run by the host, shown to everyone ----------
function fpsAiTick(dt) {
  const now = performance.now();
  if (!FPS.host) {
    // not the host: just their flashes and hit flashes fade, and the drowned can still bite me
    for (const b of FPS.bots) { if (b.flashT > 0) b.flashT -= dt; if (b.hitT > 0) b.hitT -= dt; }
    for (const d of FPS.drowned) { if (d.hitT > 0) d.hitT -= dt; d.ph = (d.ph || 0) + dt * 3; }
    fpsBites(dt);
    return;
  }
  fpsBotsTick(dt, now);
  fpsDrownedTick(dt, now);
  fpsBites(dt);
}
// a drowned man close enough to grab me does, about once a second
function fpsBites(dt) {
  const m = FPS.me; FPS.biteCd = (FPS.biteCd || 0) - dt;
  if (m.dead > 0 || FPS.biteCd > 0) return;
  if (FPS.drowned.some(d => !d.dead && (d.rise || 0) > 0.5 && Math.hypot(d.x - m.x, d.y - m.y) < 1.3)) { FPS.biteCd = 1.1; fpsHurt(1, null, null); }
}
function fpsBotsTick(dt, now) {
  // enough wreckers to make eight on the island, while there's room
  const humans = 1 + FPS.remote.size, want = Math.max(0, FPSC.PLAYERS - humans);
  while (FPS.bots.length < want) {
    const used = new Set(FPS.bots.map(b => b.n)), n = FPS_BOT_NAMES.find(x => !used.has(x)) || 'Wrecker';
    const ci = FPS_BOT_NAMES.indexOf(n) % FPS_BOT_COLS.length;
    const b = { id: 'bot-' + Math.random().toString(36).slice(2, 7), bot: true, n, ci, c: FPS_BOT_COLS[ci], x: 0, y: 0, h: 0, p: 0,
      kb: {}, d: 0, lan: Math.random() < 0.5, cd: 1, goal: null, flashT: 0, hitT: 0, walk: false, see: 0, hist: [] };
    // some come ashore in outfits from the Tailor's Crate (ocrates.js)
    if (typeof ocBotOutfit === 'function') { b.o = ocBotOutfit(); fpsBotDress(b); }
    fpsRespawn(b); b.protect = 0; FPS.bots.push(b);
  }
  while (FPS.bots.length > want) FPS.bots.pop();
  // and there's always one in an Admiral's outfit
  if (FPS.bots.length && typeof ocOutfit === 'function' && !FPS.bots.some(b => ocOutfit(b.o) && ocOutfit(b.o).rarity === 'admiral')) { const b = FPS.bots[(Math.random() * FPS.bots.length) | 0]; b.o = ocBotOutfit(true); fpsBotDress(b); }
  for (const b of FPS.bots) {
    if (b.flashT > 0) b.flashT -= dt; if (b.hitT > 0) b.hitT -= dt;
    fpsRemember(b, now);
    if (b.dead > 0) { b.dead -= dt; if (b.dead <= 0) { fpsRespawn(b); b.protect = 0; b.hist = []; } continue; }
    // the nearest target it can see, with a clear line to it
    let tgt = null, td = 1e9;
    for (const o of fpsEveryone()) {
      if (o.id === b.id || o.dead > 0) continue;
      const d = Math.hypot(o.x - b.x, o.y - b.y); if (d > 170) continue;
      const lit = Math.min(1, litAt(o.x, o.y) * 1.3 + flareAt(o.x, o.y) + (o.lan ? 0.9 : 0) + Math.max(0, 1 - d / (b.lan ? SK.LANTERN : 16)) + ((o.flashT || 0) > 0 || (o.me && FPS.flash > 0) ? 1 : 0) + fpsIsleLightAt(o.x, o.y));
      if (lit < 0.35) continue;
      const ray = fpsRay(b.x, b.y, FPSC.GROUND + FPSC.EYE, bearingOf(o.x - b.x, o.y - b.y), 0, b.id);
      if (ray.kind !== 'body' || ray.who.id !== o.id) continue;
      if (d < td) { td = d; tgt = o; }
    }
    b.cd -= dt;
    if (tgt) {
      const wantH = bearingOf(tgt.x - b.x, tgt.y - b.y);
      b.h += angDiff(wantH, b.h) * Math.min(1, dt * 5);
      b.see += dt;
      const step = (td > 45 ? 1 : td < 15 ? -0.6 : 0.3) * FPSC.SPEED * 0.6 * dt;
      b.walk = fpsSteer(b, b.h, step);
      if (b.cd <= 0 && b.see > 0.6 && Math.abs(angDiff(wantH, b.h)) < 0.15) {
        b.cd = 0.55 + Math.random() * 0.6; b.flashT = 0.12;
        fpsGunSound(Math.hypot(b.x - FPS.me.x, b.y - FPS.me.y), angDiff(bearingOf(b.x - FPS.me.x, b.y - FPS.me.y), FPS.me.h));
        const moving = tgt.walk ? 0.65 : 1;
        const chance = Math.max(0.1, Math.min(0.55, 0.68 - td / 240)) * moving;
        const err = Math.random() > chance ? (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.06) : 0;
        const h = b.h + err, p = Math.atan2(FPSC.EYE * 0.55 - FPSC.EYE, td) + (err ? 0.02 : 0);
        const z = FPSC.GROUND + FPSC.EYE;
        // the shot goes out like anyone's: everyone else judges it against where they were
        if (FPS.remote.size) fpsPublishShot(b.x, b.y, z, h, p, b.id);
        const ray = fpsRay(b.x, b.y, z, h, p, b.id);
        FPS.tracers.push({ a: [b.x + Math.sin(h) * 0.6, b.y + Math.cos(h) * 0.6, z - 0.25], b: [ray.x, ray.y, ray.z], t: 0.08 });
        if (ray.kind === 'body') {
          if (ray.who.me) fpsHurt(ray.head ? 2 : 1, b.id, b.n);
          else if (ray.who.bot) fpsBotHurt(ray.who, ray.head ? 2 : 1, b.id);
          else if (ray.who.drowned) fpsDrownedHurt(ray.who, 1);
        }
      }
    } else {
      b.see = 0;
      if (!b.goal || Math.hypot(b.goal[0] - b.x, b.goal[1] - b.y) < 4 || Math.random() < dt * 0.05) {
        b.goal = fpsIsleSpot() || [FPSC.CX, FPSC.CY]; b.stuck = 0;
      }
      const wh = bearingOf(b.goal[0] - b.x, b.goal[1] - b.y);
      b.h += angDiff(wh, b.h) * Math.min(1, dt * 3);
      const st = FPSC.SPEED * 0.55 * dt;
      b.walk = fpsSteer(b, wh, st);
      // (stuck in a corner for a while: go somewhere else)
      b.stuck = b.walk ? Math.max(0, (b.stuck || 0) - dt) : (b.stuck || 0) + dt;
      if (b.stuck > 0.8) b.goal = null;
      if (Math.random() < dt * 0.02) b.lan = !b.lan;
    }
  }
}
function fpsBotHurt(b, dmg, fromId) {
  if (b.dead > 0) return;
  b.hp -= dmg; b.hitT = 0.2;
  if (b.hp <= 0) {
    b.dead = FPSC.RESPAWN; b.d++;
    if (fromId) b.kb[fromId] = (b.kb[fromId] || 0) + 1;
    b.prevKb = Object.assign({}, b.kb);
    fpsFeed(`${fpsNameOf(fromId)} shot ${b.n}.`);
    fpsSend();
  }
}
function fpsDrownedHurt(d, dmg, head, code) {
  if (FPS.zm) return zmHurt(d, dmg, head, code);
  if (d.dead) return;
  d.hp -= dmg; d.hitT = 0.2;
  if (d.hp <= 0) { d.dead = 1; fpsFeed('A drowned man went back into the sea.'); fpsPuff(d.x, d.y, FPSC.GROUND + 1, '170,210,200', 14); }
}
function fpsDrownedTick(dt, now) {
  FPS.drownT -= dt;
  // (none come up into the walled yard of the Bonded Quay: there's no shore to wade up)
  if (FPS.drownT <= 0 && FPS.drowned.length < 3 && !(FPS.g && FPS.g.isle && FPS.g.isle.arena)) {
    FPS.drownT = 30 + Math.random() * 25;
    const a = Math.random() * 6.283;
    FPS.drowned.push({ drowned: true, id: 'dr-' + Math.random().toString(36).slice(2, 7), n: 'a drowned man', x: FPSC.CX + Math.cos(a) * (FPSC.R + 6), y: FPSC.CY + Math.sin(a) * (FPSC.R + 6), hp: 3, rise: 0, bite: 0, ph: Math.random() * 6, hitT: 0, hist: [] });
    fpsFeed('Something is wading ashore.');
    try { sfxSplash(0, 0.5); } catch (e) {}
  }
  for (const d of FPS.drowned) {
    if (d.hitT > 0) d.hitT -= dt;
    fpsRemember(d, now);
    d.rise = Math.min(1, d.rise + dt * 0.4); d.ph += dt * 3;
    let tgt = null, td = 1e9;
    for (const o of fpsEveryone()) { if (o.dead > 0) continue; const dd = Math.hypot(o.x - d.x, o.y - d.y); if (dd < td) { td = dd; tgt = o; } }
    if (!tgt) continue;
    const h = bearingOf(tgt.x - d.x, tgt.y - d.y), st = 2.6 * dt * d.rise;
    if (td > 1.1) {
      // straight at them, or round whatever's in the way
      for (const dh of [0, 0.7, -0.7, 1.5, -1.5]) { const hh = h + dh * (d.side || 1), nx = d.x + Math.sin(hh) * st, ny = d.y + Math.cos(hh) * st; if (!fpsSolidAt(FPS.g, nx, ny, 0.35)) { d.x = nx; d.y = ny; if (dh) d.side = Math.sign(dh * (d.side || 1)); break; } }
    }
    // (people bite-check themselves; the host does it for the wreckers)
    d.bite -= dt;
    if (td < 1.3 && d.bite <= 0 && tgt.bot) { d.bite = 1.1; fpsBotHurt(tgt, 1, null); }
  }
  FPS.drowned = FPS.drowned.filter(d => !d.dead);
}

// ---------- each frame ----------
function fpsFrame(dt) {
  if (FPS.zm) return zmFrame(dt);
  FPS.dtLast = dt;
  const G = FPS.g, m = FPS.me;
  const saved = [g, ship];
  g = G; ship = m;
  try {
    G.t += dt;
    G.beam = wrapPi(Date.now() / 1000 / FPSC.PERIOD * Math.PI * 2);
    for (const f of G.flares) f.t -= dt;
    G.flares = G.flares.filter(f => f.t > 0);
    G.mods.lantern = m.lan ? 1 : 0.3;
    // a new round: the scores go back to nothing, and the island moves to the next sea
    const rn = fpsRoundNow();
    if (rn !== FPS.round) {
      const all = fpsScores(), top = all[0], mine = all.find(p => p.me);
      // the scoreboard (src/scores.js): your kills this round, and a round won if you finished on top
      if (typeof scoreReport === 'function' && mine) { const won = top && top.me && top.k > 0; const m = BOARD.mine && BOARD.mine.fps; scoreReport('fps', mine.k, (m ? m.b : 0) + (won ? 1 : 0), 0, true); }
      FPS.roundMsg = { t: 6, text: top && top.k > 0 ? `${top.me ? 'You' : top.n} won the round with ${top.k} ${top.k === 1 ? 'kill' : 'kills'}.` : 'The round is over.' };
      if (typeof wcEarn === 'function') wcEarn('round');   // weapon crates (src/wcrates.js)
      if (typeof ocEarn === 'function') ocEarn('round');   // outfit crates (src/ocrates.js)
      FPS.round = rn; FPS.kb = {}; FPS.deaths = 0; FPS.wcK = 0; FPS.wcRound = rn;
      if (FPS.host) for (const b of FPS.bots) { b.kb = {}; b.d = 0; b.prevKb = {}; }
      for (const r of FPS.remote.values()) r.prevKb = {};
      fpsNewIsland(G, rn);
      if (FPS.host) { for (const b of FPS.bots) { fpsRespawn(b); b.protect = 0; b.goal = null; b.hist = []; } FPS.drowned = []; }
      fpsRespawn(m); fpsSend(true);
    }
    FPS.scoreT = (FPS.scoreT || 0) + dt;
    if (FPS.scoreT > 5) { FPS.scoreT = 0; const mine = fpsScores().find(p => p.me); if (mine && typeof scoreReport === 'function') scoreReport('fps', mine.k, 0); }
    if (FPS.roundMsg) { FPS.roundMsg.t -= dt; if (FPS.roundMsg.t <= 0) FPS.roundMsg = null; }
    if (!(FPS.vScare > 0)) fpsInput(dt); else { FPS.look = [0, 0]; FPS.mlook = [0, 0]; m.walk = false; }
    if (FPS.menu) fpsMenuPad(dt);
    if (typeof fpsVerityTick === 'function') fpsVerityTick(dt);
    if (m.dead > 0) { m.dead -= dt; if (m.dead <= 0) { fpsRespawn(m); fpsSend(); } }
    if (m.protect > 0) m.protect -= dt;
    // patch yourself up: a point of health back after six quiet seconds, and every four after that
    FPS.calm = (FPS.calm || 0) + dt;
    if (m.dead <= 0 && m.hp < FPSC.HP && FPS.calm > 6) { m.hp++; FPS.calm = 2; }
    if (m.cd > 0) m.cd -= dt;
    if (m.reload > 0) { m.reload -= dt; if (m.reload <= 0) { m.reload = 0; const w = fpsW(); if (!w.melee) { m.ammo = w.mag; m.mags[FPS.weapon] = m.ammo; } } }
    if (FPS.drawT > 0) FPS.drawT -= dt;
    fpsJumpTick(m, dt);
    if (FPS.landed > 0) FPS.landed -= dt;
    if (FPS.meFlashT > 0) FPS.meFlashT -= dt; if (FPS.meSlashT > 0) FPS.meSlashT -= dt;
    if (!FPS.mouseDown && !FPS.touchFire && !FPS.padFire) FPS.heldFire = false;
    fpsHarpoonsTick(dt);
    if ((FPS.bellCd || 0) > 0) FPS.bellCd -= dt;
    if ((FPS.hintT || 0) > 0 && (FPS.stick || FPS.lookTouch)) FPS.hintT -= dt * 2; else if ((FPS.hintT || 0) > 0) FPS.hintT -= dt * 0.25;
    for (const k of ['flash', 'hitT', 'hurtT']) if (FPS[k] > 0) FPS[k] -= dt;
    FPS.recoil = Math.max(0, FPS.recoil - dt * 6);
    // the avtomat's climb: once the trigger's let go, the muzzle settles back part of the way
    FPS.sinceShot = (FPS.sinceShot || 0) + dt;
    if ((FPS.climb || 0) > 0 && FPS.sinceShot > 0.14) { const d = Math.min(FPS.climb, dt * 0.4); m.p = clamp(m.p - d, -FPSC.PMAX, FPSC.PMAX); FPS.climb -= d; }
    for (const p of FPS.pings) p.t -= dt; FPS.pings = FPS.pings.filter(p => p.t > 0);
    for (const t of FPS.tracers) t.t -= dt; FPS.tracers = FPS.tracers.filter(t => t.t > 0);
    for (const f of FPS.feed) f.t -= dt; FPS.feed = FPS.feed.filter(f => f.t > 0);
    for (const p of FPS.parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 9 * dt; }
    FPS.parts = FPS.parts.filter(p => p.t > 0);
    fpsNetTick(dt);
    // weapon crates: each new kill this round (kills only ever count up from the round's best so far)
    if (typeof wcEarn === 'function') { const mine = fpsScores().find(p => p.me), k = mine ? mine.k : 0; while ((FPS.wcK || 0) < k) { FPS.wcK = (FPS.wcK || 0) + 1; wcEarn('kill'); if (typeof ocEarn === 'function') ocEarn('kill'); } }
    fpsRemember(m, performance.now());
    fpsAiTick(dt);
    fpsDraw();
  } finally { g = saved[0]; ship = saved[1]; }
}
function fpsInput(dt) {
  const m = FPS.me, K = FPS.keys;
  // looking: mouse (pointer lock), the right stick, or a finger on the right of the screen
  // (the look sensitivity settings, across and up and down, scale the mouse and the touch screen; the controller has its own)
  let sens = 0.0031;
  // on a touch screen, aiming slows a touch as the crosshair crosses someone you can see, and leans faintly
  // onto them, but only while your thumb is moving the aim: it helps hold a target, it doesn't find one for you
  // (and none at all through the telescope)
  const aiming = Math.abs(FPS.look[0]) + Math.abs(FPS.look[1]) > 0.5;
  const assist = FPS.touch && !FPS.scoped ? fpsAssistTarget() : null;
  if (assist) sens *= 0.8;
  if (FPS.scoped) sens /= fpsZoom();
  // the mouse (or trackpad): what's come in since last frame is let out over a frame or two when look smoothing is on,
  // so a trackpad's uneven run of movements (some frames two, some none) turns the view evenly
  if (FPS.mlook) {
    const k = FPS.smooth ? 1 - Math.exp(-dt / 0.032) : 1, ax = FPS.mlook[0] * k, ay = FPS.mlook[1] * k;
    FPS.look[0] += ax; FPS.look[1] += ay; FPS.mlook[0] -= ax; FPS.mlook[1] -= ay;
    if (Math.abs(FPS.mlook[0]) + Math.abs(FPS.mlook[1]) < 0.01) FPS.mlook = [0, 0];
  }
  m.h = wrapPi(m.h + FPS.look[0] * sens * lookKX()); m.p = clamp(m.p - FPS.look[1] * sens * lookKY(), -FPSC.PMAX, FPSC.PMAX);
  if (assist && aiming && !(m.dead > 0)) {
    m.h = wrapPi(m.h + clamp(assist.dh, -1, 1) * Math.min(1, dt * 1.1));
    m.p = clamp(m.p + clamp(assist.dp, -1, 1) * Math.min(1, dt * 1.2), -FPSC.PMAX, FPSC.PMAX);
  }
  FPS.lastLook = FPS.look; FPS.look = [0, 0];
  let fx = 0, fz = 0, fire = false;
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
  if (pad && FPS.menu) { FPS.padWas = {}; for (let i = 0; i < pad.buttons.length; i++) FPS.padWas[i] = !!(pad.buttons[i] && pad.buttons[i].pressed); }
  else if (pad) {
    const dz = v => Math.abs(v) < 0.15 ? 0 : v;
    fx += dz(pad.axes[0] || 0); fz -= dz(pad.axes[1] || 0);
    // (the controller's own look sensitivity, and its own while aiming: the Controller page of the menu)
    const pk = FPS.padLookK * (FPS.scoped ? FPS.padAdsK / fpsZoom() : 1);
    m.h = wrapPi(m.h + dz(pad.axes[2] || 0) * dt * 3.5 * pk); m.p = clamp(m.p - dz(pad.axes[3] || 0) * dt * 2.4 * pk, -FPSC.PMAX, FPSC.PMAX);
    const b = i => pad.buttons[i] && pad.buttons[i].pressed, was = FPS.padWas || {};
    if (b(7)) fire = true;
    FPS.padFire = b(7);
    if (aimToggle()) { if (b(6) && !was[6]) fpsScope(!FPS.scoped); } else fpsScope(b(6));   // (Settings: Toggle aim)
    const tap = (i, fn) => { if (b(i) && !was[i]) fn(); };
    // the shooter layout (as most console shooters have it): A jump, B crouch, X reload (and use, held, in the
    // Lighthouse), Y next weapon, L3 sprint, R3 melee, LB the bell (or the grenade in Maren's End), RB the flare on
    // Wreckers' Night (the lantern in the Lighthouse, the ultimate in Maren's End), D-pad left and right weapons,
    // down the lantern, up the view (the ultimate in Maren's End), Start the menu, View the scores
    // X reloads; in the Lighthouse, with something in front of you to use, it uses it instead
    const xUse = () => FPS.zm && ZM.near && !(FPS.me.dead > 0);
    const raid = FPS.zm && typeof rclOn === 'function' && rclOn();
    tap(0, fpsJump); tap(1, () => fpsCrouch()); tap(2, () => { if (xUse()) zmUse(); else fpsReload(); }); tap(3, () => fpsCycle(1));
    tap(11, FPS.zm ? zmKnife : fpsMelee); tap(14, () => fpsCycle(-1)); tap(15, () => fpsCycle(1)); tap(13, fpsLantern);
    if (!raid) { tap(12, fpsToggleView); tap(5, FPS.zm ? fpsLantern : fpsFlare); }
    if (!FPS.zm) tap(4, fpsBell);
    tap(9, () => fpsSetMenu(!FPS.menu)); tap(8, () => { FPS.board = !FPS.board; });
    if (FPS.zm && typeof rclPad === 'function') rclPad(b, was);   // [classes] LB the grenade, RB or D-pad up the ultimate (src/rclass.js)
    FPS.padUse = FPS.zm && b(2) && !!ZM.near;
    // a click of the left stick sprints until you stop (or aim); holding it down does too
    if (b(10) && !was[10]) { FPS.padRun = !FPS.padRun; FPS.padStill = 0; }
    const lm = Math.hypot(pad.axes[0] || 0, pad.axes[1] || 0);
    FPS.padStill = lm < 0.25 ? (FPS.padStill || 0) + dt : 0;
    if (FPS.padStill > 0.3 || FPS.scoped || m.dead > 0) FPS.padRun = false;
    FPS.padSprint = FPS.padRun || b(10);
    // (the last thing touched was the controller: the prompts name its buttons)
    if (pad.buttons.some(x => x && x.pressed) || lm > 0.4 || Math.hypot(pad.axes[2] || 0, pad.axes[3] || 0) > 0.4) FPS.padLast = true;
    FPS.padWas = {}; for (let i = 0; i < pad.buttons.length; i++) FPS.padWas[i] = b(i);
  }
  if (K.KeyW || K.ArrowUp) fz += 1; if (K.KeyS || K.ArrowDown) fz -= 1;
  if (K.KeyD) fx += 1; if (K.KeyA) fx -= 1;
  if (K.ArrowLeft) m.h = wrapPi(m.h - dt * 2.2); if (K.ArrowRight) m.h = wrapPi(m.h + dt * 2.2);
  if (FPS.stick) { fx += FPS.stick.dx; fz -= FPS.stick.dy; }
  if (FPS.mouseDown || FPS.touchFire || fire) {
    // a slow frame may owe an automatic more than one round
    fpsShoot();
    for (let k = 0; k < 3 && fpsW().auto && m.cd <= 0 && m.ammo > 0 && !(m.reload > 0) && FPS.heldFire; k++) fpsShoot();
  }
  const len = Math.hypot(fx, fz);
  m.walk = false;
  // Shift (held) runs, in every mode on foot; the view widens a little as you go
  // (with Toggle aim on, breaking into a run lowers the sights)
  if (aimToggle() && FPS.scoped && len > 0.05 && (K.ShiftLeft || K.ShiftRight || (FPS.padSprint && !FPS.padSprintWas)) && !FPS.menu) FPS.scoped = false;
  FPS.padSprintWas = FPS.padSprint;
  if (FPS.crouch && len > 0.05 && (K.ShiftLeft || K.ShiftRight || FPS.padSprint) && !FPS.menu) fpsCrouch(false);   // (breaking into a run stands you up)
  fpsCrouchTick(m, dt);
  const run = !!(K.ShiftLeft || K.ShiftRight || FPS.padSprint || (FPS.stick && FPS.stickRun)) && m.dead <= 0 && len > 0.05 && !FPS.menu && !FPS.scoped && !FPS.crouch;
  FPS.runK = clamp((FPS.runK || 0) + (run ? dt * 4 : -dt * 5), 0, 1);
  if (m.dead <= 0 && len > 0.05 && !FPS.menu) {
    // (on a phone a little slower all round: on a small screen the same pace feels much quicker)
    const sp = (run ? (FPS.zm ? ZMC.SPRINT : FPSC.SPRINT) : FPSC.SPEED) * Math.min(1, len) / len * dt * (FPS.zm ? zmSpeedK() : 1) * (FPS.stick ? 0.8 : 1) * (FPS.crouch ? FPS_CROUCH.PACE : 1);
    const s = Math.sin(m.h), c = Math.cos(m.h);
    m.walk = fpsMove(m, (s * fz + c * fx) * sp, (c * fz - s * fx) * sp);
    if (m.walk && !((m.jz || 0) > 0)) FPS.step += dt * (run ? 11.5 : 8);
  }
}

// someone visible close to the crosshair, and how far off it is
function fpsAssistTarget() {
  const m = FPS.me; let best = null, bestA = 0.075;
  for (const o of fpsEveryone().concat(FPS.drowned)) {
    if (o.me || o.dead > 0 || o.dead === 1 && o.drowned) continue;
    const d = Math.hypot(o.x - m.x, o.y - m.y); if (d > 140 || d < 1) continue;
    if (fpsSeeAt(o.x, o.y, o.lan) < 0.3) continue;
    const dh = angDiff(bearingOf(o.x - m.x, o.y - m.y), m.h), a = Math.abs(dh) * Math.max(1, d / 40);
    if (a > bestA) continue;
    const dz = (o.jz || 0) - (m.jz || 0), pe = Math.atan2(FPSC.EYE * 0.6 - FPSC.EYE + dz, d);
    const ray = fpsRay(m.x, m.y, FPSC.GROUND + FPSC.EYE + (m.jz || 0), m.h + dh, pe, m.id);
    if (ray.kind !== 'body' || ray.who.id !== o.id) continue;
    bestA = a; best = { dh, dp: pe - m.p };
  }
  return best;
}

// ---------- drawing ----------
function fpsDraw() {
  // Verity standing up: the grin fills the screen, and nothing else
  if (FPS.vScare > 0) { drawVerityScare(FPSV.SCARE - FPS.vScare); return; }
  // looking through the longarm's telescope: everything drawn with a longer focal length, then put back
  // (the field of view is the player's own: Settings, or the menu; measured across the screen)
  const f0 = focal, fb = (W / 2) / Math.tan(fovDeg() * Math.PI / 360);
  if (FPS.scoped) focal = fb * fpsZoom();
  else if (FPS.runK > 0 && !reduceMotion) focal = fb * (1 - 0.08 * FPS.runK);
  else focal = fb;
  try {
    try { fpsDrawScene(); } finally { focal = fb; setCamPitch(camPitch); hy = H * 0.5 + pitchY; }
    fpsDrawHands();
    // under a roof (src/fpsisle.js), the weather stays outside, and so, muffled, do the sea and the wind
    GFX.wx = 1 - FPS.inK;
    try { drawAtmosphere(); } finally { GFX.wx = 1; }
    if (typeof audioOutdoors === 'function') audioOutdoors(1 - FPS.inK);
    if (FPS.scoped && fpsW().scope) fpsDrawScope();
    if (FPS.zm) zmHud(); else fpsHud();
  } finally { focal = f0; setCamPitch(0); }
}
function fpsDrawScene() {
  // (in the Lighthouse, out and watching someone: the view is theirs, src/zombies.js)
  const m = (FPS.zm && typeof zmSpecView === 'function' && zmSpecView()) || FPS.me;
  camX = m.x; camY = m.y; yaw = m.h;
  const eye = FPSC.GROUND + FPSC.EYE + (m.jz || 0) - (FPS.eyeLag || 0) - (FPS.downEye || 0) - (FPS.crouchEye || 0);
  camH = eye + (reduceMotion ? 0 : Math.sin(FPS.step) * 0.05 - (FPS.landed || 0) * 0.4) - (m.dead > 0 ? 1.2 * Math.min(1, (FPSC.RESPAWN - m.dead) * 2) : 0);
  const third = fpsThird();
  if (third) {
    // over the right shoulder: back along the way you're looking (tilted with it), then out to the side;
    // pulled in when a rock or the island's edge is in the way, and eased back out after
    const sh = Math.sin(m.h), ch = Math.cos(m.h), cp = Math.cos(m.p), sp = Math.sin(m.p);
    let want = 1;
    for (let k = 1; k <= 8; k++) {
      const f = k / 8, bx = m.x - sh * cp * FPSC.TP_BACK * f + ch * FPSC.TP_SIDE * f, by = m.y - ch * cp * FPSC.TP_BACK * f - sh * FPSC.TP_SIDE * f;
      if (fpsBlocked(bx, by, 0.25, camH - 0.3)) { want = Math.max(0.12, (k - 1) / 8); break; }
    }
    const pull = FPS.camPull == null ? want : want < FPS.camPull ? want : FPS.camPull + (want - FPS.camPull) * Math.min(1, (FPS.dtLast || 0.016) * 4);
    FPS.camPull = pull;
    camX = m.x - sh * cp * FPSC.TP_BACK * pull + ch * FPSC.TP_SIDE * pull;
    camY = m.y - ch * cp * FPSC.TP_BACK * pull - sh * FPSC.TP_SIDE * pull;
    camH = Math.max(FPSC.GROUND + 0.4, eye + FPSC.TP_UP - sp * FPSC.TP_BACK * pull - (FPS.landed || 0) * 0.3);
    FPS.camAt = [camX, camY, camH];
  } else { FPS.camAt = null; FPS.camPull = null; }
  // the camera tilts with your look (render.js cam/proj, and gl3d's camera): hy is where the horizon falls
  setCamPitch(m.p); hy = H * 0.5 + pitchY;
  // indoors or out (where the camera is): eased over a quarter of a second or so, going through a door
  // ([raid] no weather at all in Maren's End)
  { const want = (FPS.zm && typeof RAID !== 'undefined' && RAID.on) || fpsUnderRoof(FPS.g, camX, camY, camH) ? 1 : 0, k = Math.min(1, (FPS.dtLast || 0.016) * 5);
    FPS.inK = FPS.inK == null || FPS.inKFor !== FPS.g ? want : FPS.inK + (want - FPS.inK) * k; FPS.inKFor = FPS.g;
    if (Math.abs(FPS.inK - want) < 0.01) FPS.inK = want; }
  const roll = m.dead > 0 ? 0.25 * Math.min(1, (FPSC.RESPAWN - m.dead) * 2) : 0;
  const gl = gl3dWanted() && (GL3D.ok || (!GL3D.tried && gl3dInit()));
  gl3dShow(gl);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (gl) ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(cx, H * 0.5); ctx.rotate(roll); ctx.translate(-cx, -H * 0.5);
  const far = SK.BEAM_RANGE, beamOn = !FPS.zm && Math.abs(g.beam) < SK.SHADE + SK.HALF_BEAM;
  const fl = [Math.sin(g.beam - SK.HALF_BEAM) * far, Math.cos(g.beam - SK.HALF_BEAM) * far], fr = [Math.sin(g.beam + SK.HALF_BEAM) * far, Math.cos(g.beam + SK.HALF_BEAM) * far];
  let shown = 0;
  // over the shoulder with the 3D renderer, you're a 3D figure in the scene (src/fpsbody.js)
  let body = false;
  if (gl && third && typeof fpsBodySync === 'function') { try { body = fpsBodySync(true); } catch (e) { console.warn(e); body = false; } }
  else if (typeof fpsBodyHide === 'function') fpsBodyHide();
  // and everyone else, as 3D figures too (src/fpsbody.js), so walls hide them and lanterns light them
  if (gl && typeof fpsFiguresSync === 'function') { try { fpsFiguresSync(); } catch (e) { console.warn(e); } }
  else if (typeof fpsFiguresHide === 'function') fpsFiguresHide();
  if (gl) {
    gl3dBackdrop(roll, 0, 0);
    { const main = ctx; ctx = bgx; ctx.save(); ctx.translate(cx, H * 0.5); ctx.rotate(roll); ctx.translate(-cx, -H * 0.5); try { fpsIsleSkyTint(bgx); } finally { ctx.restore(); ctx = main; } }
    if (FPS.zm) zmScene3D();
    shown = gl3dRender(roll, 0, 0, beamOn);
    if (body) fpsBodyOccluder();
    drawSeaFx(curBiome(), { glitter: false, k: 1 - FPS.inK }); gl3dLandGlows();
  } else {
    drawSky(); fpsIsleSkyTint(ctx); drawSea(); drawCoast();
    // the island, a low disc coloured for its kind, with its pools and boardwalks
    const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; pts.push([FPSC.CX + Math.cos(a) * FPSC.R, FPSC.CY + Math.sin(a) * FPSC.R, FPSC.GROUND]); }
    fillPoly(pts, fpsIsleGroundCss(curBiome()) || mix(curBiome().ground.length === 7 ? curBiome().ground : '#0a0d0c', '#55524a', 0.35));
    fpsIsleDrawFlat(curBiome());
    fpsIsleMist();
  }
  // everything standing on the island, far to near
  const items = [];
  const add = (kind, o, z) => { const c = cam(o.x, o.y, z == null ? FPSC.GROUND + (o.jz || 0) : z); if (c.f > 0.6) items.push({ kind, o, c }); };
  if (!gl) {
    for (const o of g.rocks) add('rock', o, 0); for (const o of g.wrecks) add('wreck', o, 0);
    // the props, each block on its own so near and far sort properly
    if (g.isle) for (const s of g.isle.solids) if (Math.hypot(s.x - camX, s.y - camY) < 200 && !(FPS.zm && s.occ === false)) add('solid', s, FPSC.GROUND);
  }
  if (g.isle && !(FPS.zm && gl)) for (const l of g.isle.lights) add('glow', l, l.z);
  for (const o of FPS.remote.values()) if (!o.dead && o.id !== FPS.specId) add('person', o);
  for (const o of FPS.bots) if (!(o.dead > 0)) add('person', o);
  if (!FPS.zm || !gl) for (const d of FPS.drowned) add('drowned', d);
  if (typeof fpsVerityItems === 'function') fpsVerityItems(add);
  if (third && !body) add('person', Object.assign({}, m, { me: true, n: FPS.nick, c: fpsColours(), w: fpsW().code, flashT: FPS.meFlashT || 0, slashT: FPS.meSlashT || 0, hitT: 0 }));
  items.sort((a, b) => b.c.f - a.c.f);
  for (const it of items) {
    ctx.save();
    try {
      const q = proj(it.c), o = it.o;
      if (gl) gl3dClip(it.c.f, it.kind === 'glow' ? { x0: q.x - 4, x1: q.x + 4, y0: q.y - 4, y1: q.y + 4 } : { x0: q.x - 1.6 * q.s, x1: q.x + 1.6 * q.s, y0: q.y - 2.6 * q.s, y1: q.y + 0.5 * q.s }, o);
      if (it.kind === 'rock') drawRockDetailed(o, q, Math.max(0.5, visibility(o.x, o.y)));
      else if (it.kind === 'wreck') drawWreck(o, q, Math.max(0.5, visibility(o.x, o.y)));
      else if (it.kind === 'person') { if (gl && !o.me && typeof FBR !== 'undefined' && FBR.has(o.id)) fpsDrawPersonOver(o, it.c); else fpsDrawPerson(o, it.c); }
      else if (it.kind === 'drowned') fpsDrawDrowned(o, it.c);
      else if (it.kind === 'verity') fpsDrawVerity(o, it.c);
      else if (it.kind === 'solid') fpsIsleDrawSolid(o);
      else if (it.kind === 'glow') fpsIsleDrawGlow(o, it.c);
    } finally { ctx.restore(); }
  }
  if (FPS.zm) { if (!gl) zmDrawFlat(); } else if (gl) gl3dGlows(shown); else drawLighthouse(beamOn, fl, fr, far);
  fpsIsleDrawBirds();
  drawFlares();
  // tracers and smoke
  for (const t of FPS.tracers) {
    const p = polyProj([t.a, t.b]); if (p.length < 2) continue;
    ctx.strokeStyle = `rgba(${t.col || '255,220,150'},${Math.min(1, t.t / (t.life || 0.08)) * (t.col ? 0.9 : 0.6)})`; ctx.lineWidth = t.w || 1.2; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke();
  }
  for (const p of FPS.parts) { const c = cam(p.x, p.y, p.z); if (c.f < 0.6) continue; const q = proj(c); ctx.fillStyle = `rgba(${p.c},${p.t / 0.6})`; const s = Math.min(9, Math.max(1.5, 0.12 * q.s)); ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s); }
  fpsDrawHarpoons();
  if (FPS.zm) zmDrawOver();
  ctx.restore();
}
// harpoons: an iron shaft with a barbed head, trailing its line back to whoever fired it
function fpsDrawHarpoons() {
  for (const hp of FPS.harps) {
    const v = Math.hypot(hp.vx, hp.vy, hp.vz) || 1, dx = hp.vx / v, dy = hp.vy / v, dz = hp.vz / v, L = 1.6;
    const tip = [hp.x, hp.y, hp.z], tail = [hp.x - dx * L, hp.y - dy * L, hp.z - dz * L];
    const p = polyProj([tail, tip]);
    if (p.length === 2) {
      ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = Math.max(1.2, p[1].s * 0.06); ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke();
      const bw = Math.max(2, p[1].s * 0.14), ang = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
      ctx.fillStyle = '#3a3a42'; ctx.save(); ctx.translate(p[1].x, p[1].y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(bw * 1.4, 0); ctx.lineTo(-bw * 0.6, bw); ctx.lineTo(-bw * 0.2, 0); ctx.lineTo(-bw * 0.6, -bw); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // the line, sagging back to the gun
    const who = hp.by === FPS.me.id ? FPS.me : FPS.remote.get(hp.by);
    if (who && hp.t < 10) {
      const a = who === FPS.me ? [who.x + Math.sin(who.h) * 0.6, who.y + Math.cos(who.h) * 0.6, FPSC.GROUND + FPSC.EYE - 0.35 + (who.jz || 0)] : [who.x, who.y, FPSC.GROUND + 1.2 + (who.jz || 0)];
      const sag = hp.stuck ? 1.2 : 0.3, pts = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([a[0] + (tail[0] - a[0]) * t, a[1] + (tail[1] - a[1]) * t, a[2] + (tail[2] - a[2]) * t - Math.sin(t * Math.PI) * sag]); }
      const q = polyProj(pts);
      if (q.length > 1) { ctx.strokeStyle = 'rgba(190,170,130,0.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].x, q[i].y); ctx.stroke(); }
    }
  }
}
// the telescope: a brass ring round a circle of view, black beyond, fine cross wires, a little sway
function fpsDrawScope() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = Math.min(W, H) * 0.42, t = g.t, sx = cx + (reduceMotion ? 0 : Math.sin(t * 0.9) * 2), sy = H / 2 + (reduceMotion ? 0 : Math.sin(t * 1.3) * 2);
  // black beyond the eyepiece: one very thick ring whose inner edge is the eyepiece. (A filled shape with a hole cut
  // in it came out solid black in some browsers, Safari among them; a stroked ring has no fill rules to get wrong)
  const far = Math.hypot(W, H) * 2;
  ctx.save(); ctx.strokeStyle = '#020305'; ctx.lineWidth = far;
  ctx.beginPath(); ctx.arc(sx, sy, r + far / 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  const gr = ctx.createRadialGradient(sx, sy, r * 0.75, sx, sy, r); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#8a6a2c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sx, sy, r + 3, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = 'rgba(10,10,12,0.85)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx - r, sy); ctx.lineTo(sx - 6, sy); ctx.moveTo(sx + 6, sy); ctx.lineTo(sx + r, sy); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy - 6); ctx.moveTo(sx, sy + 6); ctx.lineTo(sx, sy + r); ctx.stroke();
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(sx - 4, sy + i * r * 0.12); ctx.lineTo(sx + 4, sy + i * r * 0.12); ctx.stroke(); }
}
// a wrecker: boots, long coat in their colours, a hat, a pistol, and their lantern if it's lit
function fpsDrawPerson(o, c) {
  let vis = o.me ? 1 : Math.max(fpsSeeAt(o.x, o.y, o.lan), o.flashT > 0 ? 1 : 0);
  const foot = proj(c), head = proj(cam(o.x, o.y, FPSC.GROUND + (o.tall || FPSC.TALL) + (o.jz || 0)));
  const hgt = foot.y - head.y, w = hgt * 0.3, x = foot.x;
  const col = o.c || ['#3a2a1e', '#d8d0bc', '#7a5a3a', '#ffd88a'];
  const dark = (hex, k) => { try { return mix(String(hex).length === 7 ? hex : '#444444', '#06080c', 1 - (0.25 + 0.75 * vis) * (k || 1)); } catch (e) { return '#222'; } };
  // their lantern shows from anywhere on the island, even if they don't
  const facing = angDiff(o.h, bearingOf(camX - o.x, camY - o.y));
  // (your own figure, seen from behind: gun in the right hand, lantern in the left)
  const side = o.me ? 1 : Math.sin(facing) >= 0 ? 1 : -1;
  if (o.lan) {
    const lx = x + (o.me ? -1 : side) * w * 0.75, ly = foot.y - hgt * 0.42;
    lamp(lx, ly, String(col[3]).length === 7 ? col[3] : '#ffd88a', Math.max(2.2, hgt * 0.06));
  }
  if (vis < 0.04) return;
  if ((o.jz || 0) > 0.05) { const gq = proj(cam(o.x, o.y, FPSC.GROUND)); ctx.fillStyle = `rgba(0,0,0,${0.35 * Math.min(1, vis)})`; ctx.beginPath(); ctx.ellipse(gq.x, gq.y, w * 0.6, Math.max(1, w * 0.15), 0, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = o.me ? 0.82 : Math.min(1, vis * 1.2);
  const stride = (o.jz || 0) > 0.05 ? 0 : o.walk ? Math.sin(g.t * 9 + (o.x + o.y)) * w * 0.25 : 0;
  // over the shoulder you see your own back: a touch see-through, so it never hides what you're aiming at
  if (o.me) vis = 1;
  // seen over your shoulder, your gun arm reaches forward towards the crosshair: placed in 3D and projected,
  // so it sits right however the camera swings. It's further away than your back, so it's drawn first
  let gunArm = false;
  if (o.me && (o.w || 'p') !== 'c') {
    const sh = Math.sin(o.h), ch = Math.cos(o.h), cp = Math.cos(o.p || 0), spp = Math.sin(o.p || 0), base = FPSC.GROUND + (o.jz || 0);
    const at = (fwd, right, up) => cam(o.x + sh * cp * fwd + ch * right, o.y + ch * cp * fwd - sh * right, base + up + spp * fwd);
    const wc = o.w || 'p', glen = wc === 'l' ? 1.15 : wc === 'h' ? 0.95 : wc === 'a' ? 0.9 : wc === 'b' ? 0.8 : 0.42, kick = (o.flashT || 0) > 0 ? -0.08 : 0;
    const pts = [at(0, 0.26, 1.42), at(0.45 + kick, 0.3, 1.36), at(0.45 + kick + glen, 0.28, 1.4)];
    if (pts.every(q => q.f > 0.3)) {
      const [S, Hd, M] = pts.map(q => proj(q));
      gunArm = true;
      ctx.lineCap = 'round';
      ctx.strokeStyle = dark(col[0], 0.85); ctx.lineWidth = Math.max(3, Hd.s * 0.11); ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(Hd.x, Hd.y); ctx.stroke();
      ctx.strokeStyle = wc === 'h' ? dark('#3a3a42') : dark('#2a2420'); ctx.lineWidth = Math.max(2, Hd.s * (wc === 'b' ? 0.09 : 0.06)); ctx.beginPath(); ctx.moveTo(Hd.x, Hd.y); ctx.lineTo(M.x, M.y); ctx.stroke();
      if (wc === 'l' || wc === 'b') { ctx.strokeStyle = dark('#8a6a2c'); ctx.lineWidth = Math.max(1.5, Hd.s * 0.05); const k = 0.3; ctx.beginPath(); ctx.moveTo(Hd.x, Hd.y); ctx.lineTo(Hd.x + (M.x - Hd.x) * k, Hd.y + (M.y - Hd.y) * k); ctx.stroke(); }
      ctx.fillStyle = dark('#7a5c46'); ctx.beginPath(); ctx.arc(Hd.x, Hd.y, Math.max(2, Hd.s * 0.055), 0, 6.283); ctx.fill();
      ctx.lineCap = 'butt';
      if ((o.flashT || 0) > 0) lamp(M.x, M.y, '#ffd890', Math.max(4, M.s * 0.16));
    }
  }
  // boots and legs
  ctx.fillStyle = dark('#1a1612');
  ctx.fillRect(x - w * 0.32 + stride, foot.y - hgt * 0.38, w * 0.26, hgt * 0.38);
  ctx.fillRect(x + w * 0.06 - stride, foot.y - hgt * 0.38, w * 0.26, hgt * 0.38);
  // the coat: hull colour, flaring at the hem, trimmed in the rail colour
  ctx.fillStyle = dark(col[0]);
  ctx.beginPath(); ctx.moveTo(x - w * 0.5, foot.y - hgt * 0.24); ctx.lineTo(x + w * 0.5, foot.y - hgt * 0.24); ctx.lineTo(x + w * 0.4, foot.y - hgt * 0.8); ctx.lineTo(x - w * 0.4, foot.y - hgt * 0.8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark(col[2]); ctx.fillRect(x - w * 0.04, foot.y - hgt * 0.8, w * 0.08, hgt * 0.56);
  ctx.fillRect(x - w * 0.46, foot.y - hgt * 0.5, w * 0.92, hgt * 0.04);
  // arms: one with the pistol, one with the lantern
  ctx.fillStyle = dark(col[0], 0.85);
  ctx.fillRect(x - side * w * 0.62 - w * 0.1, foot.y - hgt * 0.78, w * 0.2, hgt * 0.34);
  ctx.save(); ctx.translate(x + side * w * 0.45, foot.y - hgt * 0.76); ctx.rotate(-side * 0.9 * Math.cos(facing));
  if (gunArm) ctx.globalAlpha = 0;   // (the arm and gun are already drawn, reaching forward)
  ctx.fillRect(-w * 0.1, 0, w * 0.2, hgt * 0.3);
  // what they're carrying
  const wc = o.w || 'p';
  if (wc === 'c') {
    const sw = (o.slashT || 0) > 0 ? (0.3 - o.slashT) / 0.3 : 0;
    ctx.rotate(-1.2 * sw); ctx.fillStyle = dark('#b8bcc4'); ctx.fillRect(-w * 0.03, hgt * 0.3, w * 0.07, hgt * 0.38); ctx.fillStyle = dark('#8a6a2c'); ctx.fillRect(-w * 0.12, hgt * 0.27, w * 0.24, hgt * 0.04);
  } else {
    const len = wc === 'l' ? 0.62 : wc === 'h' ? 0.5 : wc === 'b' ? 0.4 : 0.14;
    ctx.fillStyle = dark('#2a2420'); ctx.fillRect(-w * 0.06, hgt * 0.28, w * (wc === 'h' ? 0.18 : 0.12), hgt * len);
    if (wc === 'b') { ctx.fillStyle = dark('#8a6a2c'); ctx.beginPath(); ctx.arc(0, hgt * (0.28 + len), w * 0.14, 0, 6.28); ctx.fill(); }
    if (wc === 'l') { ctx.fillStyle = dark('#8a6a2c'); ctx.fillRect(-w * 0.1, hgt * 0.38, w * 0.06, hgt * 0.16); }
  }
  ctx.restore();
  if (gunArm) ctx.globalAlpha = 0.82;
  if ((o.slashT || 0) > 0) { o.slashT -= FPS.dtLast || 0.016; }
  // head and a three-cornered hat
  const away = Math.cos(facing) < -0.2;
  ctx.fillStyle = dark('#c8a888'); ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.88, hgt * 0.075, 0, 6.28); ctx.fill();
  if (away) {
    ctx.fillStyle = dark('#2a1e16'); ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.882, hgt * 0.079, 0, 6.28); ctx.fill();
    ctx.fillRect(x - hgt * 0.012, foot.y - hgt * 0.84, hgt * 0.024, hgt * 0.07);
    ctx.fillStyle = dark(col[1]); ctx.fillRect(x - hgt * 0.02, foot.y - hgt * 0.835, hgt * 0.04, hgt * 0.014);
  }
  ctx.fillStyle = dark('#141210');
  ctx.beginPath(); ctx.moveTo(x - hgt * 0.13, foot.y - hgt * 0.93); ctx.lineTo(x + hgt * 0.13, foot.y - hgt * 0.93); ctx.lineTo(x + hgt * 0.06, foot.y - hgt * 1.0); ctx.lineTo(x - hgt * 0.06, foot.y - hgt * 1.0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark(col[1]); ctx.fillRect(x - hgt * 0.1, foot.y - hgt * 0.945, hgt * 0.2, hgt * 0.012);
  if (o.hitT > 0) { ctx.globalAlpha = o.hitT * 3; ctx.fillStyle = '#ff6040'; ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.6, w * 0.5, 0, 6.28); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (o.flashT > 0) { const mx = x + side * w * 0.6, my = foot.y - hgt * 0.62; lamp(mx, my, '#ffd890', Math.max(3, hgt * 0.07)); }
  // a name over their head when you can see them well
  if (vis > 0.45 && hgt > 22 && !o.me) {
    ctx.font = `600 ${Math.round(Math.min(16, 9 + hgt * 0.04))}px "Courier Prime", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = `rgba(236,228,207,${Math.min(1, vis)})`; ctx.fillText(o.n || '', x, foot.y - hgt * 1.04);
    if (!o.me) fpsHpBar(o, x, foot.y - hgt * 1.04 + 3, hgt, Math.min(1, vis));
  }
}
// over a 3D figure: what the flat drawing would add (their lantern's glow, seen from anywhere; a hit; their name)
function fpsDrawPersonOver(o, c) {
  const vis = Math.max(fpsSeeAt(o.x, o.y, o.lan), o.flashT > 0 ? 1 : 0);
  const foot = proj(c), head = proj(cam(o.x, o.y, FPSC.GROUND + (o.tall || FPSC.TALL) + (o.jz || 0))), hgt = foot.y - head.y, x = foot.x;
  const col = o.c || ['#3a2a1e', '#d8d0bc', '#7a5a3a', '#ffd88a'];
  if (o.lan && vis < 0.5) {
    // (once they're well lit, the 3D lantern itself shows; until then its glow gives them away)
    const facing = angDiff(o.h, bearingOf(camX - o.x, camY - o.y)), side = Math.sin(facing) >= 0 ? 1 : -1;
    lamp(x - side * hgt * 0.2, foot.y - hgt * 0.42, String(col[3]).length === 7 ? col[3] : '#ffd88a', Math.max(2.2, hgt * 0.06));
  }
  if ((o.slashT || 0) > 0) o.slashT -= FPS.dtLast || 0.016;
  if (o.hitT > 0) { ctx.globalAlpha = o.hitT * 2; ctx.fillStyle = '#ff6040'; ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.6, hgt * 0.12, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
  if (vis > 0.45 && hgt > 22) {
    ctx.font = `600 ${Math.round(Math.min(16, 9 + hgt * 0.04))}px "Courier Prime", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = `rgba(236,228,207,${Math.min(1, vis)})`; ctx.fillText(o.n || '', x, foot.y - hgt * 1.08);
    fpsHpBar(o, x, foot.y - hgt * 1.08 + 3, hgt, Math.min(1, vis));
  }
}
// a small health bar under someone's name: a segment for each hit they can take (in the Lighthouse, their knocks,
// from their presence), green whole, amber hurt, red on the last; down, empty and edged in red. Its size goes with
// how big they are on the screen
function fpsHpBar(o, x, y, hgt, a) {
  if (o.hp == null || o.drowned) return;
  const max = o.hm || (FPS.zm ? (typeof ZMC !== 'undefined' ? ZMC.HP : 3) : FPSC.HP), w = clamp(hgt * 0.42, 18, 54), h = clamp(hgt * 0.035, 2.5, 5);
  const segs = typeof zmHpSegs === 'function' ? zmHpSegs : null;
  if (segs) { segs(x, y, w, h, o.hp, max, !!o.down, a); return; }
  for (let i = 0; i < max; i++) { ctx.fillStyle = i < o.hp ? '#7ac46a' : 'rgba(80,70,60,0.6)'; ctx.fillRect(x - w / 2 + i * w / max, y, w / max - 1, h); }
}
function fpsDrawDrowned(d, c) {
  const foot = proj(c), hgt = (foot.y - proj(cam(d.x, d.y, FPSC.GROUND + FPSC.TALL * 0.95)).y) * (0.4 + 0.6 * d.rise);
  const vis = fpsSeeAt(d.x, d.y, false), x = foot.x + Math.sin(d.ph) * hgt * 0.03, w = hgt * 0.26;
  // their eyes catch any light at all, so you can always see them coming
  ctx.fillStyle = `rgba(200,235,225,${0.3 + 0.6 * vis})`;
  const e = Math.max(1, hgt * 0.02);
  ctx.fillRect(x - hgt * 0.04 - e / 2, foot.y - hgt * 0.9, e, e); ctx.fillRect(x + hgt * 0.04 - e / 2, foot.y - hgt * 0.9, e, e);
  if (vis < 0.05) return;
  ctx.globalAlpha = Math.min(1, vis * 1.2);
  ctx.fillStyle = '#3c5650';
  ctx.beginPath(); ctx.moveTo(x - w * 0.5, foot.y); ctx.lineTo(x + w * 0.5, foot.y); ctx.lineTo(x + w * 0.38, foot.y - hgt * 0.82); ctx.lineTo(x - w * 0.38, foot.y - hgt * 0.82); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f8a80'; ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.89, hgt * 0.08, 0, 6.28); ctx.fill();
  // arms out in front, and weed hanging off them
  ctx.fillStyle = '#4c665e'; ctx.fillRect(x - w * 0.6, foot.y - hgt * 0.72, w * 0.18, hgt * 0.34); ctx.fillRect(x + w * 0.42, foot.y - hgt * 0.72, w * 0.18, hgt * 0.34);
  ctx.fillStyle = 'rgba(30,60,40,0.8)'; for (let i = 0; i < 4; i++) ctx.fillRect(x - w * 0.3 + i * w * 0.18, foot.y - hgt * 0.6, Math.max(1, w * 0.05), hgt * 0.25);
  ctx.fillStyle = 'rgba(200,235,225,0.9)'; ctx.fillRect(x - hgt * 0.04 - e / 2, foot.y - hgt * 0.9, e, e); ctx.fillRect(x + hgt * 0.04 - e / 2, foot.y - hgt * 0.9, e, e);
  if (d.hitT > 0) { ctx.globalAlpha = d.hitT * 3; ctx.fillStyle = '#c8f0e0'; ctx.beginPath(); ctx.arc(x, foot.y - hgt * 0.5, w * 0.5, 0, 6.28); ctx.fill(); }
  ctx.globalAlpha = 1;
}
// your hands: a pepperbox pistol on the right, your lantern on the left
function fpsDrawHands() {
  const m = FPS.me; if (m.dead > 0) return;
  if (fpsThird()) return;   // over the shoulder you see the gun in your figure's hand instead
  // the 3D pistol; the flat drawing below is only for when there's no WebGL
  if (vmDraw(FPS.dtLast || 0.016)) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = Math.min(W, H) / 600 * (FPS.touch ? 0.7 : 1), bob = reduceMotion ? 0 : Math.sin(FPS.step) * 6 * s, sway = reduceMotion ? 0 : Math.cos(FPS.step * 0.5) * 5 * s;
  const rl = m.reload > 0 ? Math.sin(Math.min(1, (FPSC.RELOAD - m.reload) / FPSC.RELOAD) * Math.PI) : 0;
  const x = W * (FPS.touch ? 0.6 : 0.68) + sway, y = H * (FPS.touch ? 0.9 : 0.86) + bob + FPS.recoil * 18 * s + rl * 120 * s;
  const skin = fpsSkin();
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12 - FPS.recoil * 0.25 + rl * 0.6); ctx.scale(s, s);
  // sleeve and hand
  ctx.fillStyle = mix(String(skin.hull).length === 7 ? skin.hull : '#3a2a1e', '#000000', 0.35); ctx.fillRect(40, 30, 120, 70);
  ctx.fillStyle = '#7a5c46'; ctx.beginPath(); ctx.ellipse(30, 40, 34, 26, 0, 0, 6.28); ctx.fill();
  // the grip, the lock and the turning barrels
  ctx.fillStyle = '#4a2e1c'; ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(50, 20); ctx.lineTo(40, 90); ctx.lineTo(8, 84); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b08a3c'; ctx.fillRect(6, 80, 36, 8);
  ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-10, 0, 66, 26);
  const turn = (FPSC.MAG - m.ammo) * 0.5;
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#3a3a40' : '#24242a'; ctx.fillRect(-120, 2 + i * 8 + Math.sin(turn + i) * 1.5, 112, 7); }
  ctx.fillStyle = '#16161a'; ctx.fillRect(-124, 0, 8, 26);
  ctx.fillStyle = '#5a5a60'; ctx.fillRect(20, -8, 10, 12);
  ctx.restore();
  if (FPS.flash > 0) { const fx = x - 120 * s * Math.cos(0.12), fy = y - 14 * s; lamp(fx, fy, '#ffd890', 18 * s * (FPS.flash / 0.07)); ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.beginPath(); ctx.arc(fx, fy, 10 * s, 0, 6.28); ctx.fill(); }
  // the lantern in your other hand (on a phone the Lantern button shows it, and your left thumb's there)
  if (FPS.touch) return;
  const lx = W * 0.2 - sway * 0.6, ly = H * 0.9 + bob * 0.8;
  ctx.save(); ctx.translate(lx, ly); ctx.scale(s, s);
  ctx.fillStyle = '#1c1814'; ctx.fillRect(-26, -70, 52, 8); ctx.fillRect(-22, 10, 44, 10);
  ctx.strokeStyle = '#1c1814'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -78, 14, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = m.lan ? `rgba(255,214,140,${0.75 + 0.1 * Math.sin(g.t * 13)})` : 'rgba(60,56,50,0.8)'; ctx.fillRect(-20, -62, 40, 72);
  ctx.fillStyle = '#1c1814'; for (const bx of [-20, -2, 16]) ctx.fillRect(bx, -62, 4, 72);
  ctx.restore();
  if (m.lan) lamp(lx, ly - 26 * s, String(skin.lantern).length === 7 ? skin.lantern : '#ffd88a', 22 * s);
}
function fpsScores() {
  const list = fpsEveryone().map(o => ({ id: o.id, n: o.me ? FPS.nick : o.n, me: !!o.me, bot: !!o.bot, k: 0, d: o.me ? FPS.deaths : o.d || 0 }));
  const books = [{ kb: FPS.kb }].concat([...FPS.remote.values()].map(r => ({ kb: r.kb || {} })), FPS.bots.map(b => ({ kb: b.kb })));
  for (const p of list) for (const b of books) p.k += b.kb[p.id] || 0;
  return list.sort((a, b) => b.k - a.k || a.d - b.d);
}
function fpsHud() {
  const m = FPS.me;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mono = px => `600 ${px}px "Courier Prime", monospace`;
  // hurt and dying
  if (FPS.hurtT > 0) { ctx.fillStyle = `rgba(160,20,10,${FPS.hurtT * 0.6})`; ctx.fillRect(0, 0, W, H); }
  if (m.protect > 0) { ctx.fillStyle = `rgba(200,220,255,${0.06 + 0.04 * Math.sin(g.t * 10)})`; ctx.fillRect(0, 0, W, H); }
  // crosshair, and a mark when you hit
  const cy = H / 2;
  if (m.dead <= 0) {
    // (down the avtomat's iron sights, the sights are the crosshair)
    const wcur = fpsW();
    if (!(FPS.scoped && wcur.ads)) {
      ctx.strokeStyle = 'rgba(236,228,207,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
      const gap = 5 + FPS.recoil * (wcur.climb ? 14 : 6);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(cx + dx * gap, cy + dy * gap); ctx.lineTo(cx + dx * (gap + 7), cy + dy * (gap + 7)); }
      ctx.stroke();
    }
    if (FPS.hitT > 0) { ctx.strokeStyle = FPS.hitHead ? 'rgba(255,90,60,0.95)' : 'rgba(255,240,200,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.moveTo(cx + dx * 6, cy + dy * 6); ctx.lineTo(cx + dx * 13, cy + dy * 13); } ctx.stroke(); }
  }
  // on a phone: less of everything, and nothing where your thumbs go
  const phone = FPS.touch, top = phone ? Math.max(10, FPS.safeTop || 0) : 14;
  // the bearing strip, with the bell's pings
  const sw = phone ? Math.min(300, W * 0.42) : Math.min(520, W * 0.6), sx = cx - sw / 2;
  // (on a narrow phone the buttons at top left reach the middle: the strip goes just below them)
  let sy = top;
  if (phone) { const tb = document.querySelector('.fpstop'); if (tb) { const r = tb.getBoundingClientRect(), r0 = cv.getBoundingClientRect(); if (r.right - r0.left > sx - 4) sy = r.bottom - r0.top + 22; } }
  ctx.fillStyle = 'rgba(8,10,14,0.45)'; ctx.fillRect(sx, sy, sw, phone ? 18 : 22);
  ctx.font = mono(phone ? 10 : 11); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const span = 1.6;
  for (const [lab, b] of (phone ? [['N', 0], ['E', 1.571], ['S', 3.1416], ['W', -1.571]] : [['N', 0], ['NE', 0.785], ['E', 1.571], ['SE', 2.356], ['S', 3.1416], ['SW', -2.356], ['W', -1.571], ['NW', -0.785]])) {
    const d = angDiff(b, m.h); if (Math.abs(d) > span / 2) continue;
    ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.fillText(lab, cx + d / span * sw, sy + (phone ? 9 : 11));
  }
  { const d = angDiff(bearingOf(-m.x, -m.y), m.h); if (Math.abs(d) < span / 2) { ctx.fillStyle = '#ffd88a'; ctx.fillRect(cx + d / span * sw - 2, sy + 2, 4, 4); } }
  for (const p of FPS.pings) {
    const d = angDiff(bearingOf(p.x - m.x, p.y - m.y), m.h), xx = cx + clamp(d / span, -0.5, 0.5) * sw, py = sy + (phone ? 20 : 24);
    ctx.globalAlpha = Math.min(1, p.t); ctx.fillStyle = '#e46c4f'; ctx.beginPath(); ctx.moveTo(xx, py); ctx.lineTo(xx - 5, py + 8); ctx.lineTo(xx + 5, py + 8); ctx.fill();
    if (!phone) { ctx.font = mono(10); ctx.fillText(`${p.n} ${Math.round(Math.hypot(p.x - m.x, p.y - m.y))}m`, xx, py + 18); }
    ctx.globalAlpha = 1;
  }
  const left = FPSC.ROUND - (Date.now() % FPSC.ROUND), mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60, clock = `${mm}:${String(ss).padStart(2, '0')}`;
  const sc = fpsScores(), mine = sc.find(p => p.me) || { k: 0, d: 0 };
  if (phone) {
    // the clock under the strip; your score top right; the last two lines of the feed under that
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(10); ctx.fillStyle = 'rgba(236,228,207,0.6)';
    ctx.fillText(clock, cx, sy + 21);
    const rx = W - Math.max(12, FPS.safeRight || 0);
    ctx.textAlign = 'right'; ctx.font = mono(12); ctx.fillStyle = 'rgba(236,228,207,0.85)'; ctx.fillText(`${mine.k} K · ${mine.d} D`, rx, top);
    ctx.font = mono(10);
    // (the feed goes under the buttons when, held upright, they reach across to it)
    const fy = fpsHudBtnRight() > rx - W * 0.34 - 8 ? Math.max(top + 18, fpsHudTop()) : top + 18;
    FPS.feed.slice(-2).forEach((f, i) => { ctx.fillStyle = `rgba(236,228,207,${Math.min(1, f.t) * 0.75})`; ctx.fillText(f.text, rx, fy + i * 13, W * 0.34); });
    // health: four small pips at top left, beside the menu
    const tops = document.querySelector('.fpstop'), lx = tops ? tops.getBoundingClientRect().right - cv.getBoundingClientRect().left + 10 : Math.max(12, FPS.safeLeft || 0) + 92;
    // (under the buttons, so they stay clear of the compass)
    const hx = Math.max(12, FPS.safeLeft || 0) + 4, hyp = tops ? tops.getBoundingClientRect().bottom - cv.getBoundingClientRect().top + 8 : top + 48;
    for (let i = 0; i < FPSC.HP; i++) { ctx.fillStyle = i < m.hp ? '#ffd88a' : 'rgba(80,70,60,0.7)'; ctx.fillRect(hx + i * 14, hyp, 11, 7); }
    // the floating stick, where your thumb came down
    if (FPS.stick) {
      const r0 = cv.getBoundingClientRect(), bx = FPS.stick.x0 - r0.left, by = FPS.stick.y0 - r0.top;
      ctx.strokeStyle = 'rgba(236,228,207,0.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 52, 0, 6.28); ctx.stroke();
      ctx.setLineDash([4, 6]); ctx.strokeStyle = FPS.stickRun ? 'rgba(255,216,138,0.55)' : 'rgba(236,228,207,0.16)'; ctx.beginPath(); ctx.arc(bx, by, 52 * 1.35, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
      { const L = FPS.stick.L || 0, d = Math.hypot(FPS.stick.dx, FPS.stick.dy) || 1, k = L > 0.12 ? Math.min(1.6, L) * 52 / d : 0; ctx.fillStyle = FPS.stickRun ? 'rgba(255,216,138,0.4)' : 'rgba(236,228,207,0.3)'; ctx.beginPath(); ctx.arc(bx + FPS.stick.dx * k, by + FPS.stick.dy * k, 22, 0, 6.28); ctx.fill(); }
    } else if (!(m.dead > 0) && (FPS.hintT || 0) > 0) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = mono(11); ctx.fillStyle = `rgba(236,228,207,${Math.min(0.6, FPS.hintT * 0.3)})`;
      ctx.fillText('◀ thumb here to walk', Math.max(14, FPS.safeLeft || 0), H - 24);
      ctx.textAlign = 'center'; ctx.fillText('drag here (or on Fire) to aim', W * (W > H ? 0.46 : 0.62), H * (W > H ? 0.56 : 0.66));
    }
    // the fire button carries the ammo; the others light up when they're on or ready
    fpsPadState();
  } else {
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(13); ctx.fillStyle = 'rgba(236,228,207,0.85)';
    ctx.fillText(`ROUND ${clock}`, 16, 14);
    ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.55)'; ctx.fillText(fpsPlaceName(), 16, 32);
    ctx.textAlign = 'right'; ctx.font = mono(13); ctx.fillStyle = 'rgba(236,228,207,0.85)'; ctx.fillText(`KILLS ${mine.k}  ·  DEATHS ${mine.d}`, W - 16, 14);
    ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.55)'; ctx.fillText(sc[0] && sc[0].k ? `Leader: ${sc[0].me ? 'you' : sc[0].n} (${sc[0].k})` : `${sc.length} on the island`, W - 16, 32);
    ctx.font = mono(12);
    FPS.feed.forEach((f, i) => { ctx.fillStyle = `rgba(236,228,207,${Math.min(1, f.t) * 0.85})`; ctx.fillText(f.text, W - 16, 56 + i * 17, W - 80); });
    const by = H - 22;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < FPSC.HP; i++) { ctx.fillStyle = i < m.hp ? '#ffd88a' : 'rgba(80,70,60,0.7)'; ctx.fillRect(16 + i * 26, by - 12, 22, 10); }
    ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.6)'; ctx.fillText('HEALTH', 16, by - 18);
    ctx.textAlign = 'right'; ctx.font = mono(22); ctx.fillStyle = m.ammo ? 'rgba(236,228,207,0.9)' : '#e46c4f';
    const w = fpsW();
    ctx.fillText(m.reload > 0 ? (w.melee ? 'WIPING' : 'RELOADING') : w.melee ? 'CUTLASS' : `${m.ammo} / ${w.mag}`, W - 16, by);
    // the six weapons, the one in hand lit
    ctx.font = mono(11); let wx = W - 16;
    for (let i = FPS_WORDER.length - 1; i >= 0; i--) {
      const id = FPS_WORDER[i], on = id === FPS.weapon, lab = `${i + 1} ${FPSW[id].n.toUpperCase()}`;
      ctx.fillStyle = on ? '#ffd88a' : 'rgba(236,228,207,0.38)'; ctx.fillText(lab, wx, by - 46); wx -= ctx.measureText(lab).width + 14;
    }
    ctx.font = mono(22);
    ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.6)';
    ctx.fillText(`FLARES ${m.flares}  ·  LANTERN ${m.lan ? 'LIT' : 'DARK'}  ·  BELL ${(FPS.bellCd || 0) > 0 ? Math.ceil(FPS.bellCd) + 's' : 'READY'}`, W - 16, by - 28);
  }
  if (typeof fpsVerityHud === 'function') fpsVerityHud(phone);
  // being lit up by the beam: a warning
  if (m.dead <= 0 && litAt(m.x, m.y) > 0) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(255,216,138,0.9)'; ctx.fillText(phone ? 'IN THE BEAM' : 'IN THE BEAM — EVERYONE CAN SEE YOU', cx, H * 0.5 + (phone ? 34 : 60)); }
  // dead
  if (m.dead > 0) {
    ctx.fillStyle = 'rgba(10,4,4,0.45)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e46c4f'; ctx.font = `400 ${phone ? 26 : 34}px "IM Fell English SC", serif`;
    ctx.fillText(m.killer === 'Verity' ? 'Verity helped' : m.killer ? `Shot by ${m.killer}` : 'Taken by the sea', cx, H * 0.42);
    ctx.font = mono(13); ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText(`Back ashore in ${Math.ceil(m.dead)}…`, cx, H * 0.42 + 36);
  }
  if (FPS.roundMsg) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `400 ${phone ? 20 : 30}px "IM Fell English SC", serif`; ctx.fillStyle = `rgba(255,216,138,${Math.min(1, FPS.roundMsg.t)})`; ctx.fillText(FPS.roundMsg.text, cx, H * 0.3, W - 24); ctx.font = mono(12); ctx.fillText(`A new round begins: ${fpsPlaceName()}.`, cx, H * 0.3 + 30); }
  // scoreboard
  if (FPS.board) {
    const rows = sc, bw = Math.min(420, W - 32), bh = 54 + rows.length * 24, bx = cx - bw / 2, by2 = H * 0.18;
    ctx.fillStyle = 'rgba(8,10,14,0.85)'; ctx.fillRect(bx, by2, bw, bh);
    ctx.strokeStyle = 'rgba(236,228,207,0.25)'; ctx.strokeRect(bx + 0.5, by2 + 0.5, bw - 1, bh - 1);
    ctx.textBaseline = 'middle'; ctx.font = '400 22px "IM Fell English SC", serif'; ctx.fillStyle = '#ffd88a'; ctx.textAlign = 'left'; ctx.fillText("Wreckers' Night", bx + 14, by2 + 22);
    ctx.font = mono(11); ctx.fillStyle = 'rgba(236,228,207,0.55)'; ctx.textAlign = 'right'; ctx.fillText('KILLS   DEATHS', bx + bw - 14, by2 + 22);
    rows.forEach((r, i) => {
      const yy = by2 + 50 + i * 24;
      ctx.font = mono(13); ctx.textAlign = 'left'; ctx.fillStyle = r.me ? '#ffd88a' : 'rgba(236,228,207,0.85)';
      ctx.fillText(`${i + 1}. ${r.n}${r.bot ? ' (bot)' : ''}`, bx + 14, yy);
      ctx.textAlign = 'right'; ctx.fillText(`${String(r.k).padStart(3)}   ${String(r.d).padStart(4)}`, bx + bw - 14, yy);
    });
  }
  if (!FPS.mouse && !matchMedia('(pointer: coarse)').matches && !FPS.menu) {
    ctx.textAlign = 'center'; ctx.font = mono(12); ctx.fillStyle = 'rgba(236,228,207,0.6)'; ctx.fillText('Click to aim with the mouse', cx, H * 0.5 + 40);
  }
}

// the phone buttons show what they'll do: ammo on Fire, lantern lit or dark, flares left, bell ready
function fpsPadState() {
  const m = FPS.me, set = (id, on, text) => { const el = $(id); if (!el) return; el.classList.toggle('on', !!on); if (text != null && el.dataset.t !== text) { el.dataset.t = text; const c = el.querySelector('.cnt'); if (c) c.textContent = text; } };
  const w = fpsW();
  set('fpsPadFire', (w.melee || m.ammo > 0) && !(m.reload > 0), m.reload > 0 ? '…' : w.melee ? '⚔' : String(m.ammo));
  { const f = $('fpsPadFire').querySelector('small'); if (f && f.textContent !== (w.melee ? 'SWING' : 'FIRE')) f.textContent = w.melee ? 'SWING' : 'FIRE'; }
  { const b = $('fpsPadWeapon'); if (b) { const c = b.querySelector('.wn'); if (c && c.textContent !== w.n) c.textContent = w.n; } }
  { const b = $('fpsPadScope'); if (b) { const wc = fpsW(); b.hidden = !(wc.scope || wc.ads); b.classList.toggle('on', FPS.scoped); const lab = wc.ads ? 'Aim down the sights' : 'Look through the telescope'; if (b.getAttribute('aria-label') !== lab) b.setAttribute('aria-label', lab); } }
  set('fpsPadLantern', m.lan);
  set('fpsPadView', FPS.third);
  set('fpsPadJump', !((m.jz || 0) > 0) && !(m.dead > 0));
  set('fpsPadFlare', m.flares > 0, String(m.flares));
  set('fpsPadBell', !((FPS.bellCd || 0) > 0), (FPS.bellCd || 0) > 0 ? String(Math.ceil(FPS.bellCd)) : '');
  set('fpsPadReload', !w.melee && m.ammo < w.mag && !(m.reload > 0));
}
// the notch and rounded corners on phones: read the safe-area insets once in a while
function fpsSafeArea() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);left:env(safe-area-inset-left,0px);right:env(safe-area-inset-right,0px);visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  FPS.safeTop = parseFloat(cs.top) || 0; FPS.safeLeft = parseFloat(cs.left) || 0; FPS.safeRight = parseFloat(cs.right) || 0;
  probe.remove();
}

// on a phone the round buttons sit at top left: the HUD's top-left column starts under them, never behind them
function fpsHudTop() {
  if (!FPS.touch) return 14;
  const tb = document.querySelector('.fpstop'), t0 = Math.max(10, FPS.safeTop || 0);
  if (!tb || !cv) return t0 + 46;
  const r = tb.getBoundingClientRect(), r0 = cv.getBoundingClientRect();
  return r.height ? Math.max(t0, r.bottom - r0.top + 8) : t0;
}
// (the right edge of those buttons, so the feed top right can tell whether it must go under them too)
function fpsHudBtnRight() { const tb = document.querySelector('.fpstop'); if (!tb || !cv || !FPS.touch) return 0; const r = tb.getBoundingClientRect(); return r.width ? r.right - cv.getBoundingClientRect().left : 0; }
// the lines of words down the top left (a part's name, what's to be done) note how far down they reach, so the
// health and points under them, and anything top middle, keep clear (read a frame late, which nobody sees)
function fpsHudNote(y) { FPS.hudL = Math.max(FPS.hudL || 0, y); }

// ---------- controls ----------
// the shooter layout: WASD, Space jump, C crouch, Shift run, R reload, E use, 1-6 or the wheel for weapons, Q the
// last one, V melee (the cutlass on Wreckers' Night), T the view; F flare, L lantern, B bell. (Not Ctrl for crouch:
// Ctrl with W closes the browser tab, and no page can stop it)
const FPS_KEYS = { KeyR: fpsReload, KeyL: fpsLantern, KeyF: fpsFlare, KeyB: fpsBell, Space: fpsJump, KeyT: fpsToggleView, KeyC: () => fpsCrouch(), KeyV: () => fpsMelee(), KeyQ: () => fpsSwitch(FPS.last),
  Digit1: () => fpsSwitch('pepperbox'), Digit2: () => fpsSwitch('blunderbuss'), Digit3: () => fpsSwitch('longarm'), Digit4: () => fpsSwitch('harpoon'), Digit5: () => fpsSwitch('cutlass'), Digit6: () => fpsSwitch('avtomat') };
addEventListener('keydown', e => {
  if (!FPS.on) return;
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  e.stopImmediatePropagation();
  if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); fpsSetMenu(!FPS.menu); return; }
  if (FPS.menu) return;
  if (e.code === 'Tab') { e.preventDefault(); FPS.board = true; return; }
  FPS.keys[e.code] = true; FPS.padLast = false;
  const keyFn = FPS.zm && e.code in ZM_KEYS ? ZM_KEYS[e.code] : FPS_KEYS[e.code];
  if (!e.repeat && keyFn) { e.preventDefault(); keyFn(); }
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
}, true);
addEventListener('keyup', e => {
  if (!FPS.on) return;
  e.stopImmediatePropagation();
  FPS.keys[e.code] = false;
  if (e.code === 'Tab') FPS.board = false;
}, true);
addEventListener('blur', () => { FPS.keys = {}; FPS.mouseDown = false; });
// the mouse: click to lock it to the view, then it aims; hold the button to fire
addEventListener('pointerdown', e => {
  if (!FPS.on || e.target !== cv || e.pointerType === 'touch') return;
  e.stopImmediatePropagation(); e.preventDefault();
  if (FPS.menu) return;
  if (document.pointerLockElement !== cv) { try { cv.requestPointerLock(); } catch (err) {} return; }
  if (e.button === 0) FPS.mouseDown = true;
  if (e.button === 2) fpsScope(aimToggle() ? !FPS.scoped : true);
  if (e.button === 1 && FPS.zm) zmKnife();
}, true);
addEventListener('pointerup', e => { if (FPS.on && e.pointerType !== 'touch') { if (e.button === 2) { if (!aimToggle()) fpsScope(false); } else FPS.mouseDown = false; } }, true);
// (a trackpad's two-finger scroll runs on after the fingers stop: one weapon per swipe, not a whole run of them)
addEventListener('wheel', e => { if (FPS.on && document.pointerLockElement === cv) { e.preventDefault(); const now = performance.now(); if (now < (FPS.wheelHold || 0)) { FPS.wheelHold = now + 180; return; } FPS.wheel = (FPS.wheel || 0) + e.deltaY; if (Math.abs(FPS.wheel) > 60) { fpsCycle(FPS.wheel > 0 ? 1 : -1); FPS.wheel = 0; FPS.wheelHold = now + 180; } } }, { passive: false });
addEventListener('contextmenu', e => { if (FPS.on && e.target === cv) e.preventDefault(); }, true);
addEventListener('mousemove', e => {
  if (!(FPS.on && document.pointerLockElement === cv && !FPS.menu)) return;
  const dx = e.movementX || 0, dy = e.movementY || 0;
  // (some browsers throw in a single wild jump now and then under pointer lock: one far past anything a hand does is dropped)
  if (Math.abs(dx) > 400 || Math.abs(dy) > 400) return;
  if (Math.abs(dx) + Math.abs(dy) > 2) FPS.padLast = false;
  if (!FPS.mlook) FPS.mlook = [0, 0];
  FPS.mlook[0] += dx; FPS.mlook[1] += dy;
});
// look smoothing (on unless turned off in the menu; remembered)
try { FPS.smooth = localStorage.getItem('skerry-fps-smooth') !== '0'; } catch (e) { FPS.smooth = true; }
FPS.padLookK = 1; FPS.padAdsK = 1;
try { FPS.padLookK = clamp(+localStorage.getItem('skerry-pad-look') || 1, 0.3, 3); FPS.padAdsK = clamp(+localStorage.getItem('skerry-pad-ads') || 1, 0.2, 2); } catch (e) {}
// the menu with a controller: D-pad or left stick to move between its buttons and sliders, left and right to slide,
// A to choose (or tick), B back (or out of the menu), Start out of the menu
function fpsMenuMark(el) {
  if (FPS.menuCur && FPS.menuCur !== el) FPS.menuCur.classList.remove('padfocus');
  FPS.menuCur = el; if (el) { el.classList.add('padfocus'); try { el.focus({ preventScroll: true }); } catch (e) {} el.scrollIntoView({ block: 'nearest' }); }
}
function fpsMenuPad(dt) {
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
  if (!pad) return;
  const now = pad.buttons.map(x => !!(x && x.pressed)), was = FPS.menuPadWas; FPS.menuPadWas = now;
  FPS.padWas = {}; now.forEach((v, i) => { FPS.padWas[i] = v; });   // (so nothing held as it closes fires in the game)
  if (!was) return;   // (whatever was held as the menu came up doesn't count)
  const down = i => now[i] && !was[i];
  const onPad = !$('fpsMenuPad').hidden, root = onPad ? $('fpsMenuPad') : $('fpsMenuMain');
  const items = [...root.querySelectorAll('button, input')].filter(el => el.offsetParent !== null && !el.disabled);
  if (!items.length) return;
  if (!items.includes(FPS.menuCur)) { if (now.some(Boolean) || Math.abs(pad.axes[1] || 0) > 0.6) fpsMenuMark(items[0]); else return; }
  const cur = FPS.menuCur, ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  const dy = now[13] || ay > 0.6 ? 1 : now[12] || ay < -0.6 ? -1 : 0, dx = dy ? 0 : now[15] || ax > 0.6 ? 1 : now[14] || ax < -0.6 ? -1 : 0;
  const key = dx + ',' + dy;
  let go = false;
  if (key === '0,0') FPS.menuHeld = null;
  else if (key !== FPS.menuHeld) { FPS.menuHeld = key; FPS.menuNavT = 0.35; go = true; }
  else { FPS.menuNavT -= dt; if (FPS.menuNavT <= 0) { FPS.menuNavT = cur.type === 'range' && dx ? 0.06 : 0.12; go = true; } }
  if (go) {
    if (cur.type === 'range' && dx) { const st = +cur.step || 0.05; cur.value = clamp(+cur.value + dx * st, +cur.min, +cur.max); cur.dispatchEvent(new Event('input', { bubbles: true })); }
    else { const i = items.indexOf(cur), n = items.length; fpsMenuMark(items[(i + (dy || dx) + n) % n]); }
  }
  if (down(0)) { const el = FPS.menuCur; if (el.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change', { bubbles: true })); } else if (el.type !== 'range') el.click(); }
  if (down(1)) { if (onPad) FPS.menuPage(false); else fpsSetMenu(false); }
  if (down(9)) fpsSetMenu(false);
}
document.addEventListener('pointerlockchange', () => { FPS.mouse = document.pointerLockElement === cv; if (FPS.on && !FPS.mouse) FPS.mouseDown = false; });
// touch: the left half of the screen is a stick to walk with, the right half drags to look
addEventListener('touchstart', e => {
  if (!FPS.on || e.target !== cv) return;
  e.stopImmediatePropagation(); e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.45 && !FPS.stick) FPS.stick = { id: t.identifier, x0: t.clientX, y0: t.clientY, dx: 0, dy: 0 };
    else if (!FPS.lookTouch) FPS.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY, at: performance.now(), moved: 0 };
  }
}, { capture: true, passive: false });
addEventListener('touchmove', e => {
  if (!FPS.on) return;
  for (const t of e.changedTouches) {
    if (FPS.stick && t.identifier === FPS.stick.id) { const dx = (t.clientX - FPS.stick.x0) / 52, dy = (t.clientY - FPS.stick.y0) / 52; let L = Math.hypot(dx, dy);
      // well past the edge of the ring, the ring follows your thumb
      if (L > 1.6) { FPS.stick.x0 = t.clientX - dx / L * 1.6 * 52; FPS.stick.y0 = t.clientY - dy / L * 1.6 * 52; L = 1.6; }
      // a gentle curve: small pushes are a slow walk, the edge of the ring a walk
      const k = L < 0.12 ? 0 : Math.pow(Math.min(1, L), 1.5) / Math.max(L, 0.001);
      FPS.stick.dx = dx * k; FPS.stick.dy = dy * k; FPS.stick.L = L;
      // only pushed out past the ring (to the outer circle): run
      FPS.stickRun = L > 1.35; }
    if (FPS.lookTouch && t.identifier === FPS.lookTouch.id) { FPS.lookTouch.moved += Math.abs(t.clientX - FPS.lookTouch.x) + Math.abs(t.clientY - FPS.lookTouch.y); FPS.look[0] += (t.clientX - FPS.lookTouch.x) * 1.6; FPS.look[1] += (t.clientY - FPS.lookTouch.y) * 1.6; FPS.lookTouch.x = t.clientX; FPS.lookTouch.y = t.clientY; }
  }
  if (e.target === cv) e.preventDefault();
}, { capture: true, passive: false });
const fpsTouchEnd = e => {
  if (!FPS.on) return;
  for (const t of e.changedTouches) {
    if (FPS.stick && t.identifier === FPS.stick.id) { FPS.stick = null; FPS.stickRun = false; }
    if (FPS.lookTouch && t.identifier === FPS.lookTouch.id) { if (FPS.lookTouch.moved < 10 && performance.now() - FPS.lookTouch.at < 350) fpsShoot(); FPS.lookTouch = null; }
  }
};
addEventListener('touchend', fpsTouchEnd, true); addEventListener('touchcancel', fpsTouchEnd, true);

// the buttons
$('fpsBanner').addEventListener('click', () => { const c = $('fpsTitle'); c.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('fpsPlay').focus({ preventScroll: true }), 400); });
$('fpsPlay').addEventListener('click', fpsStart);
$('fpsSettings').addEventListener('click', () => $('titleSettings').click());
$('fpsNick').addEventListener('keydown', e => { if (e.key === 'Enter') fpsStart(); });
$('fpsResume').addEventListener('click', () => fpsSetMenu(false));
$('fpsLeave').addEventListener('click', fpsStop);
// the menu's Options: the look sensitivity slider (the same setting as on the Settings card)
// (the menu's look sensitivity slider is on its first page: the same setting as on the Settings card; lookSync on opening)
// the menu's Controller page: the controller's look sensitivity, and how much of it is left while aiming (remembered)
{
  const L = $('fpsPadLook'), A = $('fpsPadAds');
  const sync = () => { L.value = FPS.padLookK; A.value = FPS.padAdsK; $('fpsPadLookOut').textContent = FPS.padLookK.toFixed(2); $('fpsPadAdsOut').textContent = FPS.padAdsK.toFixed(2); };
  const save = () => { try { localStorage.setItem('skerry-pad-look', String(FPS.padLookK)); localStorage.setItem('skerry-pad-ads', String(FPS.padAdsK)); } catch (e) {} sync(); };
  L.addEventListener('input', () => { FPS.padLookK = clamp(+L.value || 1, 0.3, 3); save(); });
  A.addEventListener('input', () => { FPS.padAdsK = clamp(+A.value || 1, 0.2, 2); save(); });
  $('fpsPadLookReset').addEventListener('click', () => { FPS.padLookK = 1; save(); });
  $('fpsPadAdsReset').addEventListener('click', () => { FPS.padAdsK = 1; save(); });
  const page = pad => { $('fpsMenuHead').textContent = pad ? 'Controller' : 'Menu'; $('fpsMenuMain').hidden = pad; $('fpsMenuPad').hidden = !pad; sync(); fpsMenuMark(null); (pad ? $('fpsPadBack') : $('fpsPadBtn')).focus({ preventScroll: true }); };
  $('fpsPadBtn').addEventListener('click', () => page(true));
  $('fpsPadBack').addEventListener('click', () => page(false));
  FPS.menuPage = page;
  sync();
}
// Toggle aim, here as on the Settings card (the same setting)
{ const at = $('fpsAimToggle'); if (at) { at.checked = aimToggle(); at.addEventListener('change', () => { SETTINGS.aim = at.checked ? 'toggle' : 'hold'; saveSettings(); if (typeof renderSettings === 'function') renderSettings(); if (!at.checked) FPS.scoped = false; }); } }
{ const sb = $('fpsSmooth'); if (sb) { sb.checked = FPS.smooth; sb.addEventListener('change', () => { FPS.smooth = sb.checked; FPS.mlook = [0, 0]; try { localStorage.setItem('skerry-fps-smooth', sb.checked ? '1' : '0'); } catch (e) {} }); } }
{ const vb = $('fpsViewBtn'), lab = () => { vb.textContent = FPS.third ? 'View: over the shoulder' : 'View: first person'; }; lab(); vb.addEventListener('click', () => { fpsToggleView(); lab(); }); FPS.viewLabel = lab; }
for (const [id, fn] of [['fpsPadWeapon', () => fpsCycle(1)], ['fpsPadScope', () => fpsScope(!FPS.scoped)], ['fpsPadReload', fpsReload], ['fpsPadLantern', fpsLantern], ['fpsPadFlare', fpsFlare], ['fpsPadBell', fpsBell], ['fpsPadJump', fpsJump], ['fpsPadView', fpsToggleView], ['fpsPadMenu', () => fpsSetMenu(true)], ['fpsPadBoard', () => { FPS.board = !FPS.board; }]]) {
  $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
}
// Fire: hold to shoot, and drag while holding to aim, so you can turn and fire with one thumb
{
  const fire = $('fpsPadFire');
  fire.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); FPS.touchFire = true; FPS.fireDrag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { fire.setPointerCapture(e.pointerId); } catch (err) {} });
  fire.addEventListener('pointermove', e => {
    const d = FPS.fireDrag; if (!d || d.id !== e.pointerId) return;
    FPS.look[0] += (e.clientX - d.x) * 1.6; FPS.look[1] += (e.clientY - d.y) * 1.6; d.x = e.clientX; d.y = e.clientY;
  });
  for (const ev of ['pointerup', 'pointercancel']) fire.addEventListener(ev, () => { FPS.touchFire = false; FPS.fireDrag = null; });
}
// leaving the page: off the island
addEventListener('pagehide', () => { if (FPS.on && NET.room) NET.room.presence({ fps: null }).catch(() => {}); });
