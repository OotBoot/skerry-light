// The Lighthouse: the Lampwright's Bench. A brass-and-glass bench up the tower where the keepers once ground and
// mended the great lens's prisms; 5000 points and it takes the weapon in your hand, turns it through the Light's own
// fire behind its spinning lens for a few seconds, and gives it back reforged: a new name, a bigger magazine and
// reserve, the Light's fire running through its metal (zmpSkinFor), it hits the drowned three times as hard (the Fresnel Lamp twice), and it
// works in a way of its own (ZM_PAP_W[id].fx; see "what each reforged weapon does", below).
//  - It can go back into the fire again and again, each time dearer (zmpCost): each time it hits half as hard again,
//    carries a quarter more, takes a numeral (the Twelve Bells II, III, ...) and its own way of working grows.
//  - Per player, like what you carry (ZM.own, ZM.res): ZM.pap[id] is how many times it's been reforged. Lose the
//    weapon (a wall buy or the chest replaces it, or you bleed out) and the reforging goes with it. The knife can't
//    be reforged at all.
//  - Damage: scaled where the hit is made (zmHurt, before a joined player's hit goes to the host), so it works alone,
//    hosting and joined alike; the host's ZM_DMG multiplier still applies on top, as for any hit.
//  - Magazines: FPSW is shared with Wreckers' Night, so it's never changed. fpsW() (src/fps.js) asks zmpW() for the
//    reforged weapon's own copy of its entry (more rounds in the magazine, its new name) while you're in the
//    Lighthouse; reloading, the ammunition count and the reload prompt all go through fpsW().
//  - Wall ammunition for a reforged weapon costs ZM_PAP.AMMO_COST and fills the reforged reserve.
// Everything here hangs off a few marked hook lines (// [pap]) in src/zombies.js and src/fps.js.

// where the bench stands: relative to the island's middle (as ZM_ZONES), against a wall, nx/ny the way its front faces
// (into the room), z the floor it stands on. Up the tower, against the curved wall of the Lamp-Wright's Store.
const ZM_PAP_AT = { x: 0, y: 1.5 - 9.05, z: 15, nx: 0, ny: 1, zone: 'tw3s' };
const ZM_PAP = { COST: 5000, AMMO_COST: 4500, TIME: 4.6, NAME: "the Lampwright's Bench" };
// what each weapon becomes: its new name, magazine and reserve, and how much harder it hits the drowned
const ZM_PAP_W = {
  pepperbox: { n: 'Twelve Bells', mag: 12, res: 120, k: 3, fx: 'Every ball that strikes one of them rings off it to the next, and the next.' },
  blunderbuss: { n: 'Spring Tide', mag: 2, res: 48, k: 3, fx: 'Each blast is a wall of green water: it sweeps them off their feet and back down the room.' },
  longarm: { n: 'Leading Light', mag: 3, res: 60, k: 3, fx: 'The ball goes through all of them in its line, and lights each one: seen through walls, and hurt worse by everyone.' },
  harpoon: { n: 'Whale-Road', mag: 3, res: 40, k: 3, fx: 'The iron runs them through and carries them on, and nails them to the wall it stops in.' },
  cutlass: { n: 'Keel-Splitter', mag: 0, res: 0, k: 3, fx: 'Every stroke throws a crescent of the sea on along the floor, cutting all it passes.' },
  avtomat: { n: 'Equinox Gale', mag: 50, res: 400, k: 3, fx: 'Held down, it spins up into a gale; at full gale its rounds run cold, and slow what they hit.' },
  fresnel: { n: 'First-Order Lamp', mag: 90, res: 450, k: 2, fx: 'Its beam breaks in each one it burns, like light in a prism, and burns the ones beside it.' },
  // [chest] the wreck chest's own eight (src/zmchest.js, where each one's reforged way of working is done)
  duckfoot: { n: 'Grey Skein', mag: 8, res: 96, k: 3, fx: 'More barrels, a wider fan, and a ball that would miss turns in flight onto the nearest of them.' },
  bomblance: { n: 'Thunder-Pod', mag: 2, res: 24, k: 3, fx: 'Its blast throws a pod of smaller irons, and each goes off in turn where it falls.' },
  grapnel: { n: 'Mooring Line', mag: 2, res: 40, k: 3, fx: 'The hook runs on through several of them, hauls them into a heap at your feet and lashes them there.' },
  flaregun: { n: 'Star Shell', mag: 2, res: 36, k: 2, fx: 'It climbs and bursts into a shower of burning stars, and each burns where it falls.' },
  axe: { n: 'Homeward Axe', mag: 0, res: 0, k: 3, fx: 'Every third stroke throws it spinning through all in its way, and it comes back to your hand.' },
  puntgun: { n: 'Breakwater', mag: 2, res: 20, k: 3, fx: 'Its shot goes on through walls and floors and every one of them in its line, and hurls them down.' },
  netmortar: { n: 'Barbed Trawl', mag: 2, res: 28, k: 3, fx: 'A wider net that holds longer, hauls shut, and bites those held in its barbs.' },
  chainshot: { n: 'Reaping Chain', mag: 2, res: 36, k: 3, fx: 'A longer chain that cripples what it cuts, and rebounds off the walls to cut again.' },
};
// how many times a weapon of yours has been reforged (0: never), and what the next time costs (t: the time it'd be)
const zmpTier = id => (ZM.pap && ZM.pap[id]) | 0;
const zmpCost = t => ZM_PAP.COST + 2000 * (t - 1) + 500 * (t - 1) * t;   // 5000, 8000, 12000, 17000, 23000, ...
function zmpRoman(n) { let s = ''; for (const [v, c] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { s += c; n -= v; } return s; }
const zmpTitle = (id, t) => ZM_PAP_W[id].n + (t > 1 ? ' ' + zmpRoman(t) : '');
const zmpRes = (id, t) => Math.round(ZM_PAP_W[id].res * (1 + 0.25 * (t - 1)));
const zmpK = (id, t) => ZM_PAP_W[id].k * Math.pow(1.5, t - 1);
const ZM_PAP_GLOW = 0xffa838;

// ---------- the bench itself (a prop: its solid and its static parts) ----------
FPI_K.zmpap = {
  col: FPI_C.wood3,
  sol(p) { return [fpiBox(p, 0, 0, 1.15, 0.5, 2.5)]; },
  // (the prop's front is -v; the lens wheel, the furnace's mouth and the tray are drawn by zmp3d)
  b3(p, A) {
    // the bench: a heavy oak top on four legs, a shelf under it with ingots of brass and a box of prisms
    A.box(FPI_C.wood2, 0, 0, 0.86, 2.3, 0.95, 0.1);
    for (const su of [-1, 1]) for (const sv of [-1, 1]) A.box(FPI_C.wood3, su * 1.06, sv * 0.4, -0.1, 0.1, 0.1, 0.98);
    A.box(FPI_C.wood3, 0, 0, 0.22, 2.12, 0.86, 0.05);
    for (let i = 0; i < 4; i++) A.box(ZMP.brass, -0.8 + i * 0.13, -0.1, 0.27, 0.1, 0.32, 0.06);
    A.box(FPI_C.wood, 0.55, 0, 0.27, 0.6, 0.5, 0.22);
    for (let i = 0; i < 4; i++) A.part('ico', '#cfe0e8', 0.35 + i * 0.13, -0.05, 0.52, 0.12, 0.14, 0.1, i, 0, 0, 'glow');
    // the furnace on the bench: a brick firebox under the lens, a brass lid, and its flue back into the wall
    A.box('#4a2e24', 0, 0.12, 0.96, 1.0, 0.6, 0.42);
    A.box('#2a1c18', 0, -0.19, 1.02, 0.5, 0.02, 0.24);
    A.box(ZMP.brass, 0, 0.12, 1.38, 1.06, 0.66, 0.05);
    A.part('cyl8', ZMP.iron, 0.36, 0.42, 1.2, 0.16, 0.3, 0.16, 0, Math.PI / 2, 0);
    // the frame the lens wheel turns in: two iron uprights and a brass crossbar, a sign board over it
    for (const s of [-1, 1]) { A.box(ZMP.iron, s * 0.82, 0.18, 0.96, 0.1, 0.12, 1.66); A.cyl(ZMP.brass, s * 0.82, 0.18, 2.6, 0.08, 0.1); }
    A.box(ZMP.brass, 0, 0.18, 2.36, 1.74, 0.12, 0.1);
    A.box('#2a2622', 0, 0.36, 2.66, 1.9, 0.06, 0.5); A.box(FPI_C.wood3, 0, 0.36, 2.62, 2.0, 0.08, 0.05); A.box(FPI_C.wood3, 0, 0.36, 3.15, 2.0, 0.08, 0.05);
    // a grindstone on its frame at one end, the bellows at the other
    A.part('cyl8', '#8a8478', 0.92, -0.18, 1.22, 0.55, 0.09, 0.55, 0, 0, Math.PI / 2);
    A.box(FPI_C.wood3, 0.92, -0.18, 0.96, 0.06, 0.06, 0.28);
    A.box('#5a3a24', -0.9, -0.05, 0.96, 0.32, 0.5, 0.16, 0.2); A.box(FPI_C.wood3, -0.9, -0.35, 0.98, 0.06, 0.25, 0.04, 0.2);
    // two small lamps at the front corners
    for (const s of [-1, 1]) { A.cyl(ZMP.iron, s * 1.0, -0.36, 0.96, 0.05, 0.18); A.glow('#ffc070', s * 1.0, -0.36, 1.22, 0.11); }
  },
};
// (from FPI_GEN.light.set) put the bench in its room, with a lamp of its own
function zmpPlace(put, light, W, Z) {
  const P = ZM_PAP_AT, a = Math.atan2(P.nx, -P.ny);
  put('zmpap', P.x, P.y, a, { lift: P.z || 0 });
  light(P.x + P.nx * 1.2, P.y + P.ny * 1.2, (P.z || 0) + 1.9, '#ffc070', 6, 'lantern');
  const [wx, wy] = W(P.x, P.y);
  Z.pap = { x: wx, y: wy, nx: P.nx, ny: P.ny, z: P.z || 0, zone: P.zone };
}
const zmpAt = () => FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.pap;

// ---------- the state ----------
function zmpReset() { ZM.pap = {}; ZM.forge = { st: 'idle', id: null, t: 0 }; zmpFxReset(); }
// the weapon as it is in your hands: its reforged copy, if it's been reforged (else null)
const ZM_PAP_CACHE = {};
function zmpW(id) {
  if (!ZM.on || !ZM.pap || !ZM.pap[id] || !ZM_PAP_W[id] || !FPSW[id]) return null;
  let w = ZM_PAP_CACHE[id]; const t = zmpTier(id);
  if (!w || w.base !== FPSW[id] || w.tier !== t) { const U = ZM_PAP_W[id]; w = ZM_PAP_CACHE[id] = Object.assign({}, FPSW[id], { n: zmpTitle(id, t), mag: FPSW[id].melee ? FPSW[id].mag : U.mag, pap: true, base: FPSW[id], tier: t }); }
  return w;
}
const zmpName = id => (zmpW(id) || FPSW[id]).n;
const zmpMag = id => (zmpW(id) || FPSW[id]).mag;
const zmpAmmo = id => zmpTier(id) && ZM_PAP_W[id] ? zmpRes(id, zmpTier(id)) : ZM_AMMO[id];
// (from zmHurt) my own hit with a reforged weapon hits harder; anyone else's was scaled where they made it
function zmpDmg(dmg, code, by) {
  if (by && by !== FPS.me.id) return dmg;
  if (!ZM.pap || code === 'k') return dmg;
  const id = FPSW_BY_CODE[code];
  return id && zmpTier(id) && ZM_PAP_W[id] ? dmg * zmpK(id, zmpTier(id)) : dmg;
}

// ---------- each tick ----------
function zmpTick(dt) {
  if (!ZM.pap) zmpReset();
  const m = FPS.me, F = ZM.forge;
  // bled out: everything you carried, and its reforging, is gone; and anything no longer carried loses it
  if (ZM.ghost) ZM.pap = {};
  for (const id in ZM.pap) if (!ZM.own.includes(id) && !(F.st === 'work' && F.id === id)) delete ZM.pap[id];
  if (F.st === 'work') {
    F.t += dt;
    // the weapon's on the bench: not in your hands
    if (FPS.weapon === F.id) { FPS.drawT = 0.45; m.reload = 0; FPS.scoped = false; }
    F.sT = (F.sT || 0) - dt;
    if (F.sT <= 0) { F.sT = 0.55; zmpSound('grind'); }
    if (F.t >= ZM_PAP.TIME) zmpDone();
  }
  zmpTint();
  zmpFxTick(dt);
}
function zmpDone() {
  const m = FPS.me, F = ZM.forge, id = F.id, U = ZM_PAP_W[id], cost = F.cost || ZM_PAP.COST;
  F.st = 'idle'; F.id = null; F.t = 0;
  if (!ZM.own.includes(id)) {
    // (it went from your hands while it was on the bench: the points come back)
    ZM.pts += cost; ZM.spent -= cost;
    fpsFeed('The bench has nothing to give back to you. The points are returned.');
    return;
  }
  const was = zmpTier(id), t = ZM.pap[id] = was + 1;
  const w = zmpW(id);
  if (!w.melee) { m.mags[id] = w.mag; ZM.res[id] = zmpRes(id, t); }
  if (FPS.weapon === id) { if (!w.melee) m.ammo = w.mag; m.reload = 0; m.cd = 0; FPS.drawT = 0.45; }
  else if (!(m.dead > 0)) fpsSwitch(id);
  ZM.banner = { text: w.n, t: 3, col: '#ffc070' };
  if (was) fpsFeed(`Back out of the fire, hotter than before: the ${w.n}.`);
  else { fpsFeed(`The ${FPSW[id].n} comes back out of the fire as the ${U.n}.`); fpsFeed(U.fx); }
  zmpSound('done');
}

// ---------- using it ----------
// (from zmNearest) the bench, if you're in front of it and its room is open
function zmpConsider(consider) {
  const P = zmpAt(); if (!P || !zmOpen(P.zone)) return;
  consider({ k: 'pap' }, P.x + P.nx * 1.05, P.y + P.ny * 1.05, P.z || 0, 1.8, true);
}
// (from zmPrompt) what the bench says, and what a wall buy says for a reforged weapon; null for anything else
function zmpPrompt(o) {
  if (o.k === 'buy' && ZM.pap && ZM.pap[o.b.id] && ZM.own.includes(o.b.id)) {
    const w = zmpW(o.b.id); if (w.melee) return { text: `${w.n}: in hand` };
    return { text: `${w.n} ammunition`, cost: ZM_PAP.AMMO_COST };
  }
  if (o.k !== 'pap') return null;
  const F = ZM.forge, id = FPS.weapon;
  if (F.st === 'work') return { text: `The bench is at work on your ${FPSW[F.id].n}…` };
  if (!ZM_PAP_W[id]) return { text: `${ZM_PAP.NAME}: nothing it can reforge` };
  const t = zmpTier(id);
  if (t) return { text: `Into the fire again: the ${zmpTitle(id, t)} becomes the ${zmpTitle(id, t + 1)}`, cost: zmpCost(t + 1) };
  return { text: `Reforge the ${FPSW[id].n} at ${ZM_PAP.NAME}`, cost: zmpCost(1) };
}
// (from zmUse) true if it was the bench (or a reforged weapon's ammunition) that was used
function zmpUse(o) {
  const m = FPS.me;
  const pay = c => { if (ZM.pts < c) { zmSound('no'); fpsFeed('Not enough points.'); return false; } ZM.pts -= c; ZM.spent += c; return true; };
  if (o.k === 'buy' && ZM.pap && ZM.pap[o.b.id] && ZM.own.includes(o.b.id)) {
    const id = o.b.id, w = zmpW(id), full = zmpRes(id, zmpTier(id));
    if (w.melee) return true;
    if ((ZM.res[id] || 0) >= full && (FPS.weapon !== id || m.ammo >= w.mag)) { fpsFeed('You can’t carry any more.'); return true; }
    if (!pay(ZM_PAP.AMMO_COST)) return true;
    ZM.res[id] = full; m.mags[id] = w.mag; if (FPS.weapon === id) m.ammo = w.mag;
    zmSound('buy');
    return true;
  }
  if (o.k !== 'pap') return false;
  const F = ZM.forge, id = FPS.weapon;
  if (F.st === 'work' || !ZM_PAP_W[id] || !ZM.own.includes(id)) { zmSound('no'); return true; }
  const cost = zmpCost(zmpTier(id) + 1);
  if (!pay(cost)) return true;
  F.st = 'work'; F.id = id; F.t = 0; F.sT = 0.6; F.cost = cost;
  m.mags[id] = m.ammo;
  // (your other weapon comes to hand while this one's on the bench)
  const other = ZM.own.find(k => k !== id);
  if (other) fpsSwitch(other); else { FPS.drawT = 0.45; m.reload = 0; }
  zmpSound('start');
  fpsFeed(`The ${FPSW[id].n} goes into the Light’s fire…`);
  return true;
}

// ---------- the look of a reforged weapon: the Light's fire ----------
// One family for every reforged weapon. Its metal goes to fire-blackened bronze with molten veins crawling through
// it, slow bands of lantern-light run along it towards the muzzle, its brass runs molten, its inlay turns to
// sea-glass with the light moving in it like light under water, embers wink in the grain, and its edges catch the
// glow. Each weapon has its own colours (ZMP_LOOK; a weapon not listed there is given colours of its own from its
// id), and it grows with each reforging (zmpLookK): brighter and quicker each time, a third colour running through
// the bands from III, and the whole spectrum from V. With reduce motion it all stands still.
// It's a shader added onto the weapon's own materials, slot by slot (VM.weapons[id].M: iron, blade, dark, brass,
// wood, accent, and any other lit one but a lens), so it suits any weapon's model; the pattern is laid out in the
// weapon's own space (zmpRoot), so it stays on the metal as the weapon moves. It overrides the equipped weapon skin
// while the weapon's reforged; lose the reforging, or leave the Lighthouse, and each material goes back exactly as it
// was. Worn in your hands (zmpTint, each tick), on your own figure over the shoulder and on the others' figures
// playing together (fbPose, src/fpsbody.js, with how many times the weapon in their hands has been reforged: `rf`
// in their presence, src/zmnet.js).
// [metal, brass, wood, glass (the inlay), A molten fire, B the light in it (sea-glass, lantern), C the third colour]
const ZMP_LOOK = {
  pepperbox:   ['#30251f', '#c8902e', '#24140c', '#3fb8a4', '#ffa83a', '#5ff0d4', '#ff6a9a'],
  blunderbuss: ['#2b2622', '#c09034', '#22140c', '#38c488', '#ff9636', '#5af0a0', '#8ad8ff'],
  longarm:     ['#262830', '#d0a850', '#1e140e', '#7aa8e8', '#ffd27a', '#8ac8ff', '#c89aff'],
  harpoon:     ['#2a2224', '#b87a3a', '#20120a', '#2a7ad0', '#ff7a3a', '#3ab0ff', '#a0ffe0'],
  cutlass:     ['#201e1c', '#c8a050', '#1a100a', '#5ad8c8', '#ffe0a0', '#70ffe8', '#7a9aff'],
  avtomat:     ['#2a2a30', '#c09040', '#24160c', '#8ac8e8', '#ffb050', '#a0e0ff', '#ff5a3a'],
  fresnel:     ['#2a2a26', '#d0a040', '#24160c', '#ffe2a0', '#ffc860', '#fff0c0', '#ff70d0'],
};
function zmpLook(id) {
  if (ZMP_LOOK[id]) return ZMP_LOOK[id];
  let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const u = (h % 360) / 360, hsl = (a, s, l) => '#' + new THREE.Color().setHSL(((a % 1) + 1) % 1, s, l).getHexString();
  return ZMP_LOOK[id] = ['#2c2624', '#c8963a', '#22140c', hsl(u, 0.6, 0.5), '#ffa838', hsl(u, 0.9, 0.68), hsl(u + 0.4, 0.9, 0.66)];
}
// by tier: [brightness, speed of flow, the third colour (0/1), the spectrum (0..1)]
const zmpLookK = t => [Math.min(1.25, 0.6 + 0.15 * (t - 1)), Math.min(1.9, 0.55 + 0.25 * (t - 1)), t >= 3 ? 1 : 0, t >= 5 ? Math.min(1, 0.7 + 0.1 * (t - 5)) : 0];
// each slot: how much of [veins, bands, sea-glass, embers] it shows, and what its own colour becomes
const ZMP_ROLE = { iron: [1, 0.8, 0.3, 0.6, 0], blade: [0.8, 1, 0.35, 0.4, 0], dark: [0.55, 0.4, 0.15, 0.4, -1], brass: [0.45, 1, 0.2, 0.8, 1], wood: [0.9, 0.2, 0, 0.7, 2], accent: [0.25, 0.6, 1.2, 0.3, 3] };
const ZMP_ROLE_ELSE = [0.5, 0.4, 0.15, 0.35, null];
const ZMP_SKIP = new Set(['bore', 'lens']);
const ZMP_VERT = 'uniform mat4 zmpRoot;\nvarying vec3 zmpP;\n';
const ZMP_FRAG = `uniform float zmpT; uniform vec4 zmpK; uniform vec4 zmpR; uniform vec3 zmpA; uniform vec3 zmpB; uniform vec3 zmpC;
varying vec3 zmpP;
float zmpH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float zmpN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(zmpH(i), zmpH(i + vec3(1, 0, 0)), f.x), mix(zmpH(i + vec3(0, 1, 0)), zmpH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(zmpH(i + vec3(0, 0, 1)), zmpH(i + vec3(1, 0, 1)), f.x), mix(zmpH(i + vec3(0, 1, 1)), zmpH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
vec3 zmpHue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
vec3 zmpFire(vec3 n, vec3 v) {
  vec3 p = zmpP * 40.0; float t = zmpT * zmpK.y;
  // molten veins: the ridges of a slowly crawling, warped noise
  vec3 q = p * 0.55 + vec3(0.0, 0.0, -t * 0.35);
  float w = zmpN(q + zmpN(q * 1.7 + t * 0.2) * 1.5);
  float vein = pow(1.0 - abs(w * 2.0 - 1.0), 9.0);
  // bands of lantern-light running on towards the muzzle
  float band = pow(0.5 + 0.5 * sin(p.z * 0.55 + t * 1.6 + zmpN(p * 0.3) * 2.2), 6.0);
  // sea-glass: light moving as it does under water
  vec3 c = p * 0.9 + vec3(t * 0.15, -t * 0.1, t * 0.2);
  float cs = abs(sin(c.x + sin(c.y * 1.3 + t * 0.5)) * sin(c.y + sin(c.z * 1.1 - t * 0.4)) * sin(c.z + sin(c.x * 0.9)));
  cs = pow(1.0 - cs, 7.0);
  // embers winking in it, drifting up
  vec3 ep = p * 1.6 + vec3(0.0, -t * 0.6, 0.0); float eh = zmpH(floor(ep));
  float ember = step(0.955, eh) * pow(0.5 + 0.5 * sin(t * 3.0 + eh * 40.0), 3.0) * max(0.0, 1.0 - length(fract(ep) - 0.5) * 2.2);
  float rim = pow(1.0 - abs(dot(n, v)), 2.5);
  vec3 hot = mix(zmpA, zmpC, zmpK.z * band * 0.6);
  if (zmpK.w > 0.0) hot = mix(hot, zmpHue(p.z * 0.04 + p.y * 0.03 + t * 0.07) * 1.15, zmpK.w * (0.25 + 0.35 * band));
  vec3 col = hot * (vein * zmpR.x * 1.2 + band * zmpR.y * 0.5 + 0.03) + zmpB * (cs * zmpR.z * 0.75 + rim * (0.06 + 0.22 * zmpR.z))
    + mix(zmpA, vec3(1.0, 0.96, 0.85), 0.55) * ember * zmpR.w * 2.2 + hot * rim * 0.18;
  return col * zmpK.x;
}
`;
// (one function for every material, so they share their shader programs; each its own uniforms)
const ZMP_OBC = function (sh) {
  Object.assign(sh.uniforms, this.userData.zmpU);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + ZMP_VERT)
    .replace('#include <project_vertex>', '#include <project_vertex>\n\tzmpP = (zmpRoot * modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + ZMP_FRAG)
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += zmpFire(normal, normalize(vViewPosition));');
};
// (each piece of a weapon wearing it, just before it's drawn: where the weapon is now, and the time)
function zmpObr(r, sc, cm, geo, mt) {
  const u = mt && mt.userData && mt.userData.zmpS && mt.userData.zmpU; if (!u) return;
  const root = mt.userData.zmpOn; if (root) u.zmpRoot.value.copy(root.matrixWorld).invert();
  u.zmpT.value = reduceMotion ? 0 : (performance.now() / 1000) % 600;
}
const ZMP_SK = new Set();   // the weapons (their builds: { root, M }) wearing it now
// a weapon's build (wp: its root and its materials M) as it should look: reforged t times (0: as it was)
function zmpSkinFor(wp, id, t) {
  if (!wp || !wp.M || !wp.root || typeof THREE === 'undefined') return;
  if (!(t > 0)) { if (ZMP_SK.has(wp)) zmpSkinOff(wp); return; }
  const L = zmpLook(id), K = zmpLookK(t);
  if (!ZMP_SK.has(wp) || wp.zmpT !== t || wp.zmpId !== id) {
    const fresh = !ZMP_SK.has(wp);
    ZMP_SK.add(wp); wp.zmpT = t; wp.zmpId = id;
    const mats = new Set();
    for (const k in wp.M) {
      const mt = wp.M[k];
      if (!mt || !mt.isMaterial || ZMP_SKIP.has(k) || !(mt.isMeshPhongMaterial || mt.isMeshLambertMaterial || mt.isMeshStandardMaterial) || mt.userData.zmpSkip) continue;
      const R = ZMP_ROLE[k] || ZMP_ROLE_ELSE;
      if (!mt.userData.zmpS) {
        mt.userData.zmpS = { color: mt.color.clone(), emissive: mt.emissive.clone(), ei: mt.emissiveIntensity, spec: mt.specular ? mt.specular.clone() : null, shin: mt.shininess };
        // (its uniforms are kept for good once made: three.js keeps the compiled program, and these with it, and
        // goes back to them the next time the weapon is reforged)
        if (!mt.userData.zmpU) mt.userData.zmpU = { zmpT: { value: 0 }, zmpK: { value: new THREE.Vector4() }, zmpR: { value: new THREE.Vector4() }, zmpA: { value: new THREE.Color() }, zmpB: { value: new THREE.Color() }, zmpC: { value: new THREE.Color() }, zmpRoot: { value: new THREE.Matrix4() } };
        mt.onBeforeCompile = ZMP_OBC; mt.needsUpdate = true;
      }
      const u = mt.userData.zmpU;
      mt.userData.zmpOn = wp.root; u.zmpK.value.set(K[0], K[1], K[2], K[3]); u.zmpR.value.set(R[0], R[1], R[2], R[3]);
      u.zmpA.value.set(L[4]); u.zmpB.value.set(L[5]); u.zmpC.value.set(L[6]);
      mt.userData.zmpRole = R[4];
      mats.add(mt);
    }
    wp.zmpMats = mats;
    if (fresh) wp.root.traverse(o => { if (o.isMesh && [].concat(o.material).some(m => mats.has(m))) { o.onBeforeRender = zmpObr; o.userData.zmpH = 1; } });
  }
  wp.zmpSeen = performance.now();
  // its own colours (again each time: nothing else may paint over them while it's reforged)
  for (const mt of wp.zmpMats) {
    const r = mt.userData.zmpRole, S = mt.userData.zmpS;
    if (r === 0) mt.color.set(L[0]); else if (r === -1) mt.color.set(L[0]).multiplyScalar(0.55); else if (r != null) mt.color.set(L[r]); else mt.color.copy(S.color);
    mt.emissive.set(L[4]); mt.emissiveIntensity = 0.02 + 0.015 * Math.min(4, t);
    if (mt.specular) mt.specular.set(r === 3 ? '#e8fff8' : r === 1 ? '#ffd8a0' : '#3a3028');
    if (mt.shininess != null) mt.shininess = r === 2 ? 20 : r === 3 ? 110 : 80;
  }
}
// back exactly as it was
function zmpSkinOff(wp) {
  ZMP_SK.delete(wp);
  for (const mt of wp.zmpMats || []) {
    const S = mt.userData.zmpS; if (!S) continue;
    mt.color.copy(S.color); mt.emissive.copy(S.emissive); mt.emissiveIntensity = S.ei;
    if (S.spec && mt.specular) mt.specular.copy(S.spec);
    if (S.shin != null) mt.shininess = S.shin;
    delete mt.onBeforeCompile; delete mt.userData.zmpS; delete mt.userData.zmpRole; delete mt.userData.zmpOn;
    mt.needsUpdate = true;
  }
  if (wp.root) wp.root.traverse(o => { if (o.userData && o.userData.zmpH) { delete o.onBeforeRender; delete o.userData.zmpH; } });
  wp.zmpMats = null; wp.zmpT = 0;
  // (in your hands, the equipped skin goes back on, as it is now)
  if (wp.M) wp.M.key = null;
}
// (each tick in the Lighthouse) the weapons in your hands; and anything not seen wearing it for a while goes back
function zmpTint() {
  if (typeof VM !== 'undefined' && VM.weapons) for (const id in VM.weapons) zmpSkinFor(VM.weapons[id], id, ZM.on && ZM.pap ? zmpTier(id) : 0);
  const now = performance.now();
  for (const wp of [...ZMP_SK]) if (now - (wp.zmpSeen || 0) > 2500) zmpSkinOff(wp);
}
// (from zmStop) back to how they were, for Wreckers' Night
function zmpStop() {
  for (const wp of [...ZMP_SK]) zmpSkinOff(wp);
  ZMP_SK.clear();
  if (ZM.forge) ZM.forge.st = 'idle';
  ZM.pap = {}; zmpFxReset();
}

// ---------- sounds ----------
function zmpSound(k, i) {
  try {
    if (soundOff()) return;
    if (k === 'start' && sfxPlay('forge', { vol: 0.7, vary: 0 })) return;
    if (k === 'grind' && sfxHas('forge')) return;
    if (k === 'done' && sfxPlay('forgedone', { vol: 0.85 })) return;
    if (k === 'start') { noise('bandpass', 260, 3, 0.05, 0.25, 0.9, { to: 900 }); tone(110, 'sawtooth', 0.2, 0.06, 1.2, { to: 220 }); }
    else if (k === 'grind') { noise('bandpass', 1800 + Math.random() * 600, 6, 0.02, 0.07, 0.35); tone(140 + Math.random() * 30, 'triangle', 0.05, 0.05, 0.4); }
    else if (k === 'ring') { const f = 1180 * Math.pow(1.12, i || 0); tone(f, 'sine', 0.002, 0.05, 0.55, { delay: (i || 0) * 0.03 }); tone(f * 2.76, 'sine', 0.002, 0.02, 0.3, { delay: (i || 0) * 0.03 }); }
    else if (k === 'wave') { noise('lowpass', 900, 1, 0.01, 0.28, 0.8, { to: 300 }); noise('highpass', 2500, 1, 0.05, 0.1, 0.7); }
    else if (k === 'slash') { noise('bandpass', 1400, 2, 0.01, 0.16, 0.45, { to: 500 }); tone(520, 'sine', 0.01, 0.04, 0.4, { to: 260 }); }
    else if (k === 'skewer') { noise('bandpass', 500, 4, 0.002, 0.14, 0.18); }
    else if (k === 'sear') { if ((ZMPX.searT || 0) > performance.now()) return; ZMPX.searT = performance.now() + 120; noise('highpass', 3200, 2, 0.003, 0.05, 0.16); tone(1760, 'sine', 0.002, 0.015, 0.12, { to: 1320 }); }
    else if (k === 'nail') { tone(90, 'triangle', 0.002, 0.2, 0.35, { to: 50 }); noise('bandpass', 700, 3, 0.002, 0.18, 0.25); }
    else if (k === 'done') { sfxBellFar(0, 0.7); for (let i = 0; i < 4; i++) tone(392 * Math.pow(1.26, i), 'triangle', 0.005, 0.1, 0.5, { delay: i * 0.09 }); noise('highpass', 3000, 1, 0.01, 0.12, 0.6, { delay: 0.1 }); }
  } catch (e) {}
}

// ---------- in 3D: the lens wheel turning in its frame, the furnace's mouth, the weapon on the tray ----------
const ZMP3 = { grp: null };
function zmp3dBuild() {
  const P = zmpAt(); if (!P) return null;
  const g = new THREE.Group(); g.position.copy(z3v(P.x, P.y, FPSC.GROUND + (P.z || 0))); g.rotation.y = Math.atan2(P.ny, P.nx) - Math.PI / 2; Z3.grp.add(g);
  // (in the group, -z is the bench's front)
  const brass = z3Lam('#b08a3a', { emissive: 0x201004 }), iron = z3Lam('#24262a');
  const add = (glow, a) => new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: a, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const wheel = new THREE.Group(); wheel.position.set(0, 1.86, 0.12); g.add(wheel);
  const rings = [];
  for (let i = 0; i < 5; i++) { const r = 0.14 + i * 0.1, ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 28), add(0xffe0a0, 0.55 - i * 0.06)); wheel.add(ring); rings.push(ring); }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.045, 6, 32), brass); wheel.add(rim);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.18, 0.03), brass); s.rotation.z = i / 6 * Math.PI; wheel.add(s); }
  const bull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), add(0xfff2c8, 0.9)); bull.scale.z = 0.5; wheel.add(bull);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.75, 8), iron); axle.rotation.z = Math.PI / 2; axle.position.copy(wheel.position); g.add(axle);
  // the furnace's mouth, under the lens
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.22), add(0xff8a30, 0.8)); mouth.position.set(0, 1.14, -0.215); mouth.rotation.y = Math.PI; g.add(mouth);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,190,90,0.9)', 'rgba(255,190,90,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  halo.position.set(0, 1.86, -0.05); halo.scale.setScalar(1.6); g.add(halo);
  // the weapon, on its way in and out
  const show = new THREE.Group(); g.add(show);
  // its name and price, chalked on the board over it
  const ch = z3Chalk([["LAMPWRIGHT'S BENCH", 21], [ZM_PAP.COST + ' +', 40]], 1.8, 0.46); ch.position.set(0, 2.9, 0.32); ch.rotation.y = Math.PI; g.add(ch);
  const light = new THREE.PointLight(0xffb860, 0.8, 8, 1.5); light.position.set(0, 1.7, -0.9); g.add(light);
  // sparks thrown off the wheel while it works
  const sparks = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 3), add(0xffd080, 1)); s.visible = false; g.add(s); sparks.push({ m: s, t: 0, v: new THREE.Vector3() }); }
  return { grp: Z3.grp, g, wheel, rings, bull, mouth, halo, show, light, sparks, wpn: {}, spin: 0 };
}
// (from zmScene3D) each frame
function zmp3d(dt) {
  if (!ZMP3.b || ZMP3.b.grp !== Z3.grp) ZMP3.b = zmp3dBuild();
  const B = ZMP3.b; if (!B) return;
  const F = ZM.forge || { st: 'idle', t: 0 }, t = g.t, work = F.st === 'work', k = work ? Math.min(1, F.t / 0.8) * Math.min(1, (ZM_PAP.TIME - F.t) / 0.6 + 0.3) : 0;
  B.spin += dt * (0.4 + k * 9);
  B.wheel.rotation.z = B.spin;
  B.rings.forEach((r, i) => { r.material.opacity = (0.35 - i * 0.05) + k * 0.3 + 0.05 * Math.sin(t * 2 + i); });
  B.bull.material.opacity = 0.6 + 0.4 * k;
  B.mouth.material.opacity = 0.55 + 0.25 * Math.sin(t * 7) * (reduceMotion ? 0 : 1) + k * 0.2;
  B.halo.material.opacity = 0.25 + k * 0.35; B.halo.scale.setScalar(1.3 + k * 0.7);
  B.light.intensity = 0.45 + k * 1.1 + (work && !reduceMotion ? 0.15 * Math.sin(t * 23) : 0);
  // the weapon: on the tray, slid in under the lens, turned in the fire, and out again glowing
  for (const id in B.wpn) if (B.wpn[id]) B.wpn[id].visible = false;
  if (work && F.id) {
    let w = B.wpn[F.id];
    if (w === undefined) { w = B.wpn[F.id] = z3Weapon(F.id); if (w) { w.scale.setScalar(1.25); B.show.add(w); w.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const mt of ms) if (mt && mt.emissive) mt.emissive.setHex(ZM_PAP_GLOW); } }); } }
    if (w) {
      w.visible = true;
      const p = F.t / ZM_PAP.TIME, inn = Math.min(1, p / 0.18), out = Math.max(0, (p - 0.82) / 0.18);
      B.show.position.set(0, 1.5 + Math.sin(Math.min(1, p) * Math.PI) * 0.12, -0.75 + inn * 0.55 - out * 0.55);
      B.show.rotation.set(0, Math.PI / 2 + (p > 0.18 && p < 0.82 ? (p - 0.18) * 14 : 0), 0);
      w.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const mt of ms) if (mt && mt.emissive) mt.emissiveIntensity = Math.min(1, p * 1.6); } });
    }
  }
  for (const s of B.sparks) {
    if (s.t > 0) { s.t -= dt; s.m.position.addScaledVector(s.v, dt); s.v.y -= dt * 4; s.m.visible = s.t > 0; continue; }
    if (work && !reduceMotion && Math.random() < dt * 14) { const a = Math.random() * Math.PI * 2; s.t = 0.5 + Math.random() * 0.4; s.m.position.set(Math.cos(a) * 0.6, 1.86 + Math.sin(a) * 0.6, 0.05); s.v.set(Math.cos(a) * 1.5, Math.sin(a) * 1.5 + 0.8, -0.8 - Math.random()); s.m.visible = true; }
  }
}

// ---------- what each reforged weapon does (each grows with every reforging, t) ----------
//  Twelve Bells (pepperbox): a ball that strikes one rings off it to the nearest other, and on: 1 + t bounces. The
//    Light stays along the path it rang along (1.5 s + 0.25 s a time, up to 3 s), and burns any that touch it.
//  Spring Tide (blunderbuss): the blast is a wall of water: everything in front of you, hit or not, is swept back
//    and off its feet (the pellets still do the hurting).
//  Leading Light (longarm): the ball goes through every one in its line, and lights them: a lit one is seen through
//    walls and takes half as much again from everyone's hits, for a while.
//  Whale-Road (harpoon): the iron runs them through and carries them on its shaft, and nails them to the wall or the
//    floor where it stops (a second hit, and held there).
//  Keel-Splitter (cutlass): each stroke throws a crescent of the sea on across the floor, cutting every one it passes.
//  Equinox Gale (avtomat): held down, it spins up to a gale (two and a half times the rate); at full gale its rounds
//    run cold, and what they hit is slowed.
//  First-Order Lamp (fresnel): the beam breaks in each one it burns, like light in a prism, onto those beside it.
//  [chest] and the wreck chest's own eight, done in src/zmchest.js (zxVolley, zxBlast, zxHaul, zxStarBurst, zxAxe,
//  zxPunt, zxNetCatch, zxBounce), through the same zmpStatus:
//  Grey Skein (Duck's-Foot): 4 + t barrels in a wider fan, and a ball that would miss turns onto the nearest by its line.
//  Thunder-Pod (Bomb-Lance): the blast throws 1 + t smaller irons, each going off in turn where it falls.
//  Mooring Line (Grapnel Gun): the hook runs on through 1 + t of them, hauls them into a heap at your feet and lashes
//    them there (held 2.5 + t/2 s), each taking a blow for each other.
//  Star Shell (Flare Pistol): it climbs and bursts into 3 + t burning stars, each a ring of fire where it falls.
//  Homeward Axe (Boarding Axe): the third stroke throws it 14 + 2t m through all in its way, and back to your hand.
//  Breakwater (Punt Gun): its shot goes through 1 + t walls and every one in its line, and hurls them across the room.
//  Barbed Trawl (Net Mortar): a wider net (2.8 + 0.3t m), held longer, hauled shut, its barbs biting twice a second.
//  Reaping Chain (Chain-Shot): a longer chain that cripples what it cuts (4 + t s), rebounding off t walls to cut again.
// The Diver can be hurt, lit and slowed like the rest, but nothing moves him or holds him.
// What happens to the drowned is done by whoever runs them: alone or hosting, here; joined, it's asked of the host
// (zmnRequest 'pst'), with the hit itself, so everyone sees them swept, nailed and slowed.
const ZMPX = { st: [], waves: [], gale: 0, lasers: [] };
function zmpFxReset() { ZMPX.st = []; ZMPX.waves = []; ZMPX.gale = 0; ZMPX.lasers = []; }
const zmpG = o => FPSC.GROUND + (o.jz || 0);
// something done to one of the drowned: kb (swept back a, b metres, off its feet c s), pin (held a s, at b, c from
// the island's middle if given), slow (a s), mark (lit, a s)
function zmpStatus(o, k, a, b, c) {
  if (!o || o.dead) return;
  if (k === 'mark') o.mark = Math.max(o.mark || 0, a);
  if (ZM.net === 'client') { ZMPX.st.push([o.zn, k, a, b, c]); return; }
  zmpApply(o, k, a, b, c);
}
function zmpApply(o, k, a, b, c) {
  if (!o || o.dead) return;
  if (k === 'mark') { o.mark = Math.max(o.mark || 0, a); return; }
  if (k === 'slow') { o.slow = Math.max(o.slow || 0, a); return; }
  if (o.boss || o.st !== 'in') return;
  if (k === 'kb') { o.kvx = a * 5; o.kvy = b * 5; o.stun = Math.max(o.stun || 0, c || 0.9); o.pin = 0; }
  else if (k === 'pin') {
    if (b != null && c != null && isFinite(b) && isFinite(c)) {
      const x = FPSC.CX + b, y = FPSC.CY + c;
      if (Math.hypot(x - o.x, y - o.y) < 40 && !zmBlockedAt(x, y, 0.2, o.jz || 0)) { o.x = x; o.y = y; zmSettle(o); }
    }
    o.pin = Math.max(o.pin || 0, a); o.px = o.x; o.py = o.y; o.kvx = o.kvy = 0;
  }
}
// (host) what a joined player's weapon did: "zn,k,a,b,c;..." (values in hundredths)
function zmpStatusFrom(sid, a) {
  const lim = { kb: [8, 8, 3], pin: [12, 400, 400], slow: [10], mark: [20] };
  for (const e of String(a || '').slice(0, 1500).split(';').slice(0, 24)) {
    const f = e.split(','), zn = +f[0], k = f[1], L = lim[k]; if (!L) continue;
    const o = ZM.z.find(q => q.zn === zn); if (!o) continue;
    const v = [2, 3, 4].map((i, j) => f[i] === '' || f[i] == null || j >= L.length ? null : clamp((+f[i] || 0) / 100, -L[j], L[j]));
    zmpApply(o, k, v[0], v[1], v[2]);
  }
}
// (from zmZombies, alone or hosting) one being swept, nailed or knocked down: true while it can't come on
function zmpHeld(z, dt) {
  if (z.kvx || z.kvy) {
    zmMove(z, z.kvx * dt, z.kvy * dt);
    const f = Math.exp(-dt * 5); z.kvx *= f; z.kvy *= f;
    if (Math.hypot(z.kvx, z.kvy) < 0.25) z.kvx = z.kvy = 0;
  }
  if ((z.jz || 0) > (z.fl || 0)) z.jz = Math.max(z.fl || 0, z.jz - 9 * dt);
  if (z.pin > 0) { if (z.px != null) { z.x = z.px; z.y = z.py; } z.walk = false; return true; }
  if (z.stun > 0) { z.walk = false; return true; }
  return false;
}
const zmpSlowK = z => z.slow > 0 ? 0.45 : 1;
// a line of sight from one point to one of them
function zmpSees(x, y, z, o) {
  const tz = zmpG(o) + 1.2, d = Math.hypot(o.x - x, o.y - y);
  const r = fpsRay(x, y, z, bearingOf(o.x - x, o.y - y), Math.atan2(tz - z, Math.max(0.05, d)), FPS.me.id, [o], d + 2);
  return r.kind === 'body';
}
// the nearest of them to a point (not in skip), within r, on about the same floor, and in sight
function zmpNextTo(x, y, z, r, skip) {
  let best = null, bd = r;
  for (const o of ZM.z) {
    if (o.dead || skip.has(o) || o.st === 'out') continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < bd && Math.abs(zmpG(o) + 1.2 - z) < 2.4 && zmpSees(x, y, z, o)) { bd = d; best = o; }
  }
  return best;
}
const zmpTrace = (a, b, col, w, life) => FPS.tracers.push({ a, b, t: life, life, col, w });

// (from zmResolveShot, my own shot) hits: what the shot's lines struck (Map: one -> { dmg, head }), before it's dealt
function zmpShot(sh, hits) {
  const [, x, y, z, h, p, , code] = sh, id = FPSW_BY_CODE[code], t = zmpTier(id);
  if (!t) return;
  const w = FPSW[id];
  if (code === 'p') {
    // Twelve Bells: each ball rings on from what it struck
    // and the Light stays a while along each path it rang along, burning any that touch it (zmpLasers)
    const struck = [...hits.keys()], skip = new Set(struck);
    for (const o0 of struck) {
      let from = o0, head = hits.get(o0).head;
      const path = [[o0.x, o0.y, zmpG(o0) + (head ? 1.65 : 1.2)]];
      for (let i = 0; i < Math.min(8, 1 + t); i++) {
        const fz = zmpG(from) + (head ? 1.65 : 1.2), nx = zmpNextTo(from.x, from.y, fz, 9 + t, skip);
        if (!nx) break;
        skip.add(nx);
        const prev = hits.get(nx) || { dmg: 0, head: false };
        prev.dmg += head ? w.head : w.dmg; prev.head = prev.head || head; hits.set(nx, prev);
        const to = [nx.x, nx.y, zmpG(nx) + (head ? 1.65 : 1.2)];
        zmpTrace([from.x, from.y, fz], to, '255,236,170', 2, 0.16);
        path.push(to);
        zmpSound('ring', i);
        from = nx;
      }
      if (path.length > 1) {
        ZMPX.lasers.push({ p: path, t: 0, life: Math.min(3, 1.5 + 0.25 * t), tier: t, next: new Map() });
        if (ZMPX.lasers.length > 16) ZMPX.lasers.shift();
      }
    }
  } else if (code === 'b') {
    // Spring Tide: a wall of water out in front: everything in it swept back and off its feet
    const reach = 6 + t * 0.5, dist = Math.min(6.5, 3 + 0.5 * (t - 1)), down = Math.min(2.2, 1.0 + 0.15 * (t - 1)), fz = z - FPSC.EYE;
    for (const o of ZM.z) {
      if (o.dead || o.st !== 'in') continue;
      const d = Math.hypot(o.x - x, o.y - y), b = bearingOf(o.x - x, o.y - y);
      if (d > reach || Math.abs(angDiff(b, h)) > 0.55 || Math.abs(zmpG(o) - FPSC.GROUND - fz) > 1.3) continue;
      if (!hits.has(o) && !zmpSees(x, y, z - 0.3, o)) continue;
      const k = (hits.has(o) ? 1 : 0.7) * (1 - d / reach * 0.4);
      zmpStatus(o, 'kb', Math.sin(b) * dist * k, Math.cos(b) * dist * k, down);
    }
    for (let i = 0; i < 46; i++) {
      const a = h + (Math.random() - 0.5) * 1.0, sp = 8 + Math.random() * 9;
      FPS.parts.push({ x: x + Math.sin(a) * 0.8, y: y + Math.cos(a) * 0.8, z: z - 0.4 + (Math.random() - 0.4) * 0.8, vx: Math.sin(a) * sp, vy: Math.cos(a) * sp, vz: Math.random() * 3, t: 0.55, c: Math.random() < 0.5 ? '170,220,225' : '230,245,240' });
    }
    zmpSound('wave');
  } else if (code === 'l') {
    // Leading Light: (it went through them all: zmpPierce) every one it struck is lit
    for (const o of hits.keys()) zmpStatus(o, 'mark', 6 + 1.5 * (t - 1));
    const tr = FPS.tracers[FPS.tracers.length - 1]; if (tr) { tr.col = '255,226,140'; tr.w = 3.5; tr.t = tr.life = 0.6; }
  } else if (code === 'a') {
    // Equinox Gale: at full gale the rounds run cold
    const tr = FPS.tracers[FPS.tracers.length - 1];
    if (ZMPX.gale >= 0.98) {
      for (const o of hits.keys()) zmpStatus(o, 'slow', 1.4 + 0.3 * (t - 1));
      if (tr) { tr.col = '190,230,255'; tr.w = 2; tr.t = tr.life = 0.12; }
    } else if (tr && ZMPX.gale > 0.3) { tr.col = '230,235,230'; }
  }
}
// (from zmResolveShot) how many a shot of mine goes through: the Leading Light, all of them in its line
const zmpPierce = code => code === 'l' && zmpTier('longarm') ? 99 : 0;

// Keel-Splitter: (from zmMelee, my own stroke of the cutlass) a crescent of the sea, thrown on along the floor
function zmpSwing(x, y, z, h) {
  const t = zmpTier('cutlass'); if (!t) return;
  ZMPX.waves.push({ x, y, fz: (FPS.me.jz || 0), h, d: 0.6, max: Math.min(22, 11 + 2 * (t - 1)), hw: Math.min(2.4, 1.3 + 0.15 * (t - 1)), hit: new Set(), t: 0 });
  zmpSound('slash');
}
function zmpWaves(dt) {
  const w = FPSW.cutlass;
  for (const v of ZMPX.waves) {
    v.t += dt; v.d += dt * 19;
    const cx = v.x + Math.sin(v.h) * v.d, cy = v.y + Math.cos(v.h) * v.d;
    if (v.d >= v.max || zmBlockedAt(cx, cy, 0.15, v.fz)) { v.done = true; fpsPuff(cx, cy, FPSC.GROUND + v.fz + 0.6, '170,230,220', 8); continue; }
    const hw = v.hw + v.d * 0.05;
    for (const o of ZM.z) {
      if (o.dead || v.hit.has(o) || Math.abs((o.jz || 0) - v.fz) > 1.3) continue;
      const dx = o.x - v.x, dy = o.y - v.y, along = dx * Math.sin(v.h) + dy * Math.cos(v.h), side = dx * Math.cos(v.h) - dy * Math.sin(v.h);
      if (along < v.d - 0.9 || along > v.d + 0.5 || Math.abs(side) > hw + (o.rad || 0.3)) continue;
      v.hit.add(o); o.hitT = 0.25;
      zmHurt(o, w.dmg, false, 'c', FPS.me.id);
      for (let i = 0; i < 6; i++) FPS.parts.push({ x: o.x, y: o.y, z: zmpG(o) + 1 + Math.random() * 0.6, vx: Math.sin(v.h) * 4 + (Math.random() - 0.5) * 3, vy: Math.cos(v.h) * 4 + (Math.random() - 0.5) * 3, vz: Math.random() * 3, t: 0.5, c: '200,245,235' });
      FPS.hitT = 0.15; FPS.hitHead = false;
    }
  }
  ZMPX.waves = ZMPX.waves.filter(v => !v.done);
}

// Whale-Road: (from fpsHarpoonsTick, my own harpoon striking one of them) true: on it goes, with that one on it
function zmpHarpoonHit(hp, r) {
  const t = zmpTier('harpoon'), o = r.who;
  if (!hp.mine || !t || !o || !o.zm) return false;
  if (hp.skew && hp.skew.includes(o)) return true;
  if (o.boss) return false;   // (it stops in him, and hurts him as any harpoon would)
  zmHurt(o, FPSW.harpoon.dmg, r.head, 'h', FPS.me.id); o.hitT = 0.25;
  fpsPuff(r.x, r.y, r.z, '160,30,20', 10);
  FPS.hitT = 0.25; FPS.hitHead = !!r.head; fpsHitSound(!!r.head);
  hp.thru = hp.thru || new Set(); hp.thru.add(o);
  if (!o.dead && o.st === 'in' && (hp.skew || []).length < 2 + t) { (hp.skew = hp.skew || []).push(o); hp.vx *= 0.9; hp.vy *= 0.9; zmpSound('skewer'); }
  return true;
}
// (each step of its flight, and where it stops) those on the shaft go with it, and are nailed where it stops
function zmpHarpoonCarry(hp, end) {
  const t = zmpTier('harpoon'); if (!hp.skew) return;
  hp.skew = hp.skew.filter(o => !o.dead);
  const v = Math.hypot(hp.vx, hp.vy) || 1, ux = hp.vx / v, uy = hp.vy / v;
  hp.skew.forEach((o, i) => {
    const x = hp.x - ux * (0.55 + i * 0.75), y = hp.y - uy * (0.55 + i * 0.75);
    if (ZM.net !== 'client' && !end) { if (!zmBlockedAt(x, y, 0.25, o.jz || 0)) { o.x = x; o.y = y; } zmSettle(o); o.stun = Math.max(o.stun || 0, 0.25); o.kvx = o.kvy = 0; }
    if (end) {
      zmpStatus(o, 'pin', 3.5 + 0.6 * (t - 1), x - FPSC.CX, y - FPSC.CY);
      zmHurt(o, FPSW.harpoon.dmg, false, 'h', FPS.me.id);
    }
  });
  if (end) { if (hp.skew.length) zmpSound('nail'); hp.skew = null; }
}
// (is this one already on the shaft, or been through: the harpoon passes it)
const zmpHarpoonSkip = (hp, d) => !!((hp.skew && hp.skew.includes(d)) || (hp.thru && hp.thru.has(d)));

// First-Order Lamp: (from zmBeam) lit: those burning in the beam this tenth of a second; burn: how hard
function zmpBeam(lit, burn) {
  const t = zmpTier('fresnel'); if (!t || !lit.length) return;
  const skip = new Set(lit), per = Math.min(5, 1 + t), cols = ['255,120,110', '140,255,160', '150,170,255', '255,230,120', '230,140,255'];
  let n = 0;
  for (const o of lit.slice(0, 4)) {
    const fz = zmpG(o) + 1.2;
    for (let i = 0; i < per; i++) {
      const q = zmpNextTo(o.x, o.y, fz, 6 + t, skip); if (!q) break;
      skip.add(q); q.hitT = 0.2; q.scorch = Math.min(1, (q.scorch || 0) + 0.4);
      ZM.sparks.push({ a: [o.x, o.y, fz], b: [q.x, q.y, zmpG(q) + 1.2], t: 0.14, col: cols[(n++) % cols.length], beam: true });
      zmHurt(q, burn * 0.7, false, 'f', FPS.me.id, 'burn');
    }
  }
}

// Twelve Bells: the Light left along a ball's path from one to the next. Each of the drowned touching it (a little
// beside it, at a height it passes through their body) is burned every quarter second: a share of a drowned man's
// strength this round (zmHp), 3% at the first reforging, a point more each time, at most 8%. It's my own hit, dealt
// as the Twelve Bells' (so a joined player's goes to the host like any other); as the reforged pepperbox's hits are
// made harder (zmpDmg), it's dealt here at that much less, so the burn is the share it should be.
const ZMP_LASER = { TICK: 0.25, FIRST: 0.2, REACH: 0.22 };
function zmpLasers(dt) {
  if (!ZMPX.lasers.length) return;
  const tp = zmpTier('pepperbox'), kk = tp ? zmpK('pepperbox', tp) : 1, full = zmHp(Math.max(1, ZM.round | 0));
  let rang = false;
  for (const L of ZMPX.lasers) {
    L.t += dt; if (L.t >= L.life) { L.done = true; continue; }
    const dmg = full * Math.min(0.08, 0.03 + 0.01 * (L.tier - 1)) / kk;
    for (const o of ZM.z) {
      if (o.dead || L.t < (L.next.get(o) || ZMP_LASER.FIRST)) continue;
      const g0 = zmpG(o), r = (o.rad || 0.3) + ZMP_LASER.REACH;
      let at = null;
      for (let i = 0; i + 1 < L.p.length && !at; i++) {
        const a = L.p[i], b = L.p[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], ll = dx * dx + dy * dy;
        const u = ll > 1e-6 ? clamp(((o.x - a[0]) * dx + (o.y - a[1]) * dy) / ll, 0, 1) : 0;
        const px = a[0] + dx * u, py = a[1] + dy * u, pz = a[2] + (b[2] - a[2]) * u;
        if (Math.hypot(o.x - px, o.y - py) < r && pz > g0 - 0.1 && pz < g0 + 2.0) at = [px, py, pz];
      }
      if (!at) continue;
      L.next.set(o, L.t + ZMP_LASER.TICK);
      o.hitT = 0.2; o.scorch = Math.min(1, (o.scorch || 0) + 0.15);
      zmHurt(o, dmg, false, 'p', FPS.me.id);
      for (let i = 0; i < 5; i++) FPS.parts.push({ x: at[0], y: at[1], z: at[2], vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2.5, vz: Math.random() * 2, t: 0.35, c: Math.random() < 0.5 ? '255,214,140' : '255,246,220' });
      rang = true;
    }
  }
  ZMPX.lasers = ZMPX.lasers.filter(L => !L.done);
  if (rang) zmpSound('sear');
}
// a line from a to b on the screen, cut where it passes behind the eye (null if it's all behind)
function zmpSegProj(a, b) {
  let p = cam(a[0], a[1], a[2]), q = cam(b[0], b[1], b[2]); const N = SK.NEAR;
  if (p.f < N && q.f < N) return null;
  const cut = (u, v) => { const k = (N - u.f) / (v.f - u.f); return { r: u.r + (v.r - u.r) * k, f: N, z: u.z + (v.z - u.z) * k }; };
  if (p.f < N) p = cut(p, q); else if (q.f < N) q = cut(q, p);
  return [proj(p), proj(q)];
}
// (from zmpDrawOver) the Light along the Twelve Bells' paths: a soft glow, a bright line and a white-hot core, motes of
// light running along it, a flare where it rang off each one; fading at the end. Its colours go with the reforging.
function zmpDrawLasers(tm) {
  if (!ZMPX.lasers.length) return;
  const L0 = zmpLook('pepperbox'), rgb = h => { const c = new THREE.Color(h); return `${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0}`; };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const L of ZMPX.lasers) {
    const fade = Math.min(1, (L.life - L.t) / 0.5) * Math.min(1, L.t / 0.05);
    if (fade <= 0) continue;
    const t = L.tier, shim = reduceMotion ? 1 : 0.88 + 0.12 * Math.sin(tm * 21 + L.life * 7);
    const outer = t >= 5 ? (() => { const c = new THREE.Color().setHSL((tm * 0.12) % 1, 1, 0.62); return `${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0}`; })() : rgb(L0[4]);
    const mid = t >= 3 ? rgb(L0[6]) : '255,214,140', a = fade * shim;
    for (let i = 0; i + 1 < L.p.length; i++) {
      const s = zmpSegProj(L.p[i], L.p[i + 1]); if (!s) continue;
      const [p, q] = s, k = Math.min(400, (p.s + q.s) / 2);
      for (const [wd, lo, hi, col, al] of [[0.42, 6, 46, outer, 0.22], [0.14, 2.5, 16, mid, 0.5], [0.045, 1.2, 5, '255,250,236', 0.95]]) {
        ctx.strokeStyle = `rgba(${col},${al * a})`; ctx.lineWidth = clamp(wd * k, lo, hi);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      // motes of light running on along it
      for (let j = 0; j < 3; j++) {
        const u = reduceMotion ? (j + 0.5) / 3 : (tm * 1.3 + j / 3 + i * 0.17) % 1, x = p.x + (q.x - p.x) * u, y = p.y + (q.y - p.y) * u, rr = clamp(0.2 * (p.s + (q.s - p.s) * u), 3, 22);
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
        gr.addColorStop(0, `rgba(255,250,230,${0.85 * a})`); gr.addColorStop(0.4, `rgba(${mid},${0.4 * a})`); gr.addColorStop(1, `rgba(${outer},0)`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill();
      }
    }
    // a flare where it rang off each of them
    for (const pt of L.p) {
      const c = cam(pt[0], pt[1], pt[2]); if (c.f < SK.NEAR) continue;
      const q = proj(c), rr = clamp(0.5 * q.s, 6, 40);
      const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rr);
      gr.addColorStop(0, `rgba(255,248,225,${0.7 * a})`); gr.addColorStop(0.3, `rgba(${outer},${0.3 * a})`); gr.addColorStop(1, `rgba(${outer},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, 6.283); ctx.fill();
    }
  }
  ctx.restore();
}

// each tick (from zmpTick): the waves, the Twelve Bells' Light, the gale, how long each spell on the drowned lasts, and asking the host
function zmpFxTick(dt) {
  if (!ZM.on) return;
  zmpWaves(dt);
  zmpLasers(dt);
  // the gale: held down, it spins up; let go (or it's dry, or not in hand), it runs down
  const a = zmpTier('avtomat') ? zmpW('avtomat') : null, m = FPS.me;
  const firing = a && FPS.weapon === 'avtomat' && FPS.heldFire && m.ammo > 0 && !(m.reload > 0) && !(m.dead > 0) && !(FPS.drawT > 0);
  ZMPX.gale = firing ? Math.min(1, ZMPX.gale + dt / 1.4) : Math.max(0, ZMPX.gale - dt * 1.6);
  if (a) a.rate = a.base.rate * (1 - Math.min(0.66, 0.6 + 0.02 * (a.tier - 1)) * ZMPX.gale);
  for (const o of ZM.z) {
    if (o.stun > 0) o.stun -= dt; if (o.pin > 0) o.pin -= dt; if (o.slow > 0) o.slow -= dt; if (o.mark > 0) o.mark -= dt;
  }
  if (ZMPX.st.length && ZM.net === 'client' && typeof zmnRequest === 'function') {
    const r = v => v == null || !isFinite(v) ? '' : Math.round(v * 100);
    zmnRequest('pst', ZMPX.st.slice(0, 24).map(s => [s[0], s[1], r(s[2]), r(s[3]), r(s[4])].join(',')).join(';'));
    ZMPX.st = [];
  }
}

// (from zmDrawOver) the Twelve Bells' Light; the lit ones, seen through anything; the crescents
function zmpDrawOver() {
  const tm = FPS.g ? FPS.g.t : 0;
  zmpDrawLasers(tm);
  for (const o of ZM.z) {
    if (!(o.mark > 0) || o.dead) continue;
    const c = cam(o.x, o.y, zmpG(o) + 2.3); if (c.f < 0.5) continue;
    const q = proj(c), s = clamp(q.s * 0.22, 5, 20), a = Math.min(1, o.mark) * (0.75 + 0.25 * Math.sin(tm * 6 + o.zn));
    const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s * 2.2);
    gr.addColorStop(0, `rgba(255,236,170,${0.9 * a})`); gr.addColorStop(0.35, `rgba(255,200,110,${0.45 * a})`); gr.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(q.x, q.y, s * 2.2, 0, 6.283); ctx.fill();
    ctx.strokeStyle = `rgba(255,240,200,${a})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(q.x, q.y - s); ctx.lineTo(q.x + s * 0.55, q.y); ctx.lineTo(q.x, q.y + s); ctx.lineTo(q.x - s * 0.55, q.y); ctx.closePath(); ctx.stroke();
  }
  for (const v of ZMPX.waves) {
    const hw = v.hw + v.d * 0.05, pts = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12 * 2 - 1, side = k * hw, fwd = v.d - k * k * 0.9;
      pts.push([v.x + Math.sin(v.h) * fwd + Math.cos(v.h) * side, v.y + Math.cos(v.h) * fwd - Math.sin(v.h) * side, FPSC.GROUND + v.fz + 0.9 + (1 - k * k) * 0.35]);
    }
    const p = polyProj(pts); if (p.length < 2) continue;
    const fade = Math.max(0, 1 - v.d / v.max * 0.6);
    for (const [lw, col] of [[14, `rgba(90,200,190,${0.25 * fade})`], [6, `rgba(170,240,230,${0.6 * fade})`], [2.5, `rgba(240,255,250,${0.95 * fade})`]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const q of p.slice(1)) ctx.lineTo(q.x, q.y); ctx.stroke();
    }
  }
}
// (from zmHud) the gale, as a ring of light round the sights
function zmpHud(cxs, cys) {
  if (!zmpTier('avtomat') || FPS.weapon !== 'avtomat' || ZMPX.gale <= 0.02) return;
  const g = ZMPX.gale, full = g >= 0.98;
  ctx.strokeStyle = full ? 'rgba(190,230,255,0.85)' : `rgba(236,228,207,${0.25 + g * 0.4})`; ctx.lineWidth = full ? 3 : 2;
  ctx.beginPath(); ctx.arc(cxs, cys, 22, -Math.PI / 2, -Math.PI / 2 + g * Math.PI * 2); ctx.stroke();
}
