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
// [raid] in Maren's End reforging gives only the look and the weapon's own trick: no harder hits, no bigger loads
const zmpRaid = () => typeof RAID !== 'undefined' && RAID.on;
const zmpRes = (id, t) => zmpRaid() && ZM_AMMO[id] != null ? ZM_AMMO[id] : Math.round(ZM_PAP_W[id].res * (1 + 0.25 * (t - 1)));
const zmpK0 = (id, t) => ZM_PAP_W[id].k * Math.pow(1.5, t - 1);
const zmpK = (id, t) => zmpRaid() ? 1 : zmpK0(id, t);
const ZM_PAP_GLOW = 0xffa838;

// ---------- the bench itself (a prop: its solid and its static parts) ----------
FPI_K.zmpap = {
  col: FPI_C.wood3,
  sol(p) { return [fpiBox(p, 0, 0, 1.15, 0.5, 2.5)]; },
  // (the prop's front is -v; the lens wheel and its gears, the firebox's glow, the bellows, the crucible's melt, the
  // gauge's needle and the weapon on the tray are drawn by zmp3d)
  // An 1880s lampwright's bench: an oak bench, a little cast-iron furnace on it with its firebox door swung open, the
  // great lens wheel turning over the fire in an iron frame, the flue running up into the ceiling, a crucible on its
  // trivet, an anvil and a vice, the bellows and the tools on their rack. Everything stays inside the bench's solid,
  // and nothing reaches back further than the old bench did (the curved wall is close behind it).
  b3(p, A) {
    const T = 0.96, IR = '#3e3a36', IR2 = '#24211e', BR = '#e0b058', BR2 = '#b08438', CU = '#c8783c', LTH = '#5a3a24';
    // a part turned to face the front (its axis along v), and a rod along u
    const face = (c, u, v, hc, r, t, tpl) => A.part(tpl || 'cyl8', c, u, v, hc, r * 2, t, r * 2, 0, Math.PI / 2, 0);
    const rodU = (c, u, v, hc, r, len) => A.part('cyl6', c, u, v, hc, r * 2, len, r * 2, 0, 0, Math.PI / 2);
    // ---- the bench: a heavy oak top with a brass-shod edge, an apron of three drawers, turned legs on brass feet
    A.box(FPI_C.wood2, 0, 0, 0.86, 2.3, 0.95, 0.1);
    A.box(BR2, 0, -0.478, 0.855, 2.3, 0.014, 0.03);
    A.box(FPI_C.wood3, 0, -0.43, 0.66, 2.14, 0.05, 0.2);
    for (const s of [-1, 0, 1]) { A.box(FPI_C.wood, s * 0.7, -0.458, 0.685, 0.6, 0.02, 0.15); face(BR, s * 0.7, -0.475, 0.76, 0.024, 0.03); }
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      A.cyl(BR2, su * 1.06, sv * 0.4, -0.04, 0.06, 0.08);
      A.cyl(FPI_C.wood3, su * 1.06, sv * 0.4, 0.04, 0.048, 0.84);
      A.part('sph', FPI_C.wood3, su * 1.06, sv * 0.4, 0.45, 0.13, 0.16, 0.13);
      A.part('sph', FPI_C.wood3, su * 1.06, sv * 0.4, 0.2, 0.11, 0.1, 0.11);
    }
    // the shelf: ingots of brass, a box of prisms, a heap of coal and a quench bucket
    A.box(FPI_C.wood3, 0, 0, 0.22, 2.12, 0.86, 0.05);
    for (let i = 0; i < 4; i++) A.box(BR, -0.8 + i * 0.13, -0.1, 0.27, 0.1, 0.32, 0.06);
    A.box(FPI_C.wood, 0.55, 0, 0.27, 0.6, 0.5, 0.22);
    for (let i = 0; i < 4; i++) A.part('ico', '#cfe0e8', 0.35 + i * 0.13, -0.05, 0.52, 0.12, 0.14, 0.1, i, 0, 0, 'glow');
    for (let i = 0; i < 7; i++) A.part('ico', '#1a1816', -0.12 + (i % 4) * 0.09, 0.05 + (i > 3 ? 0.1 : -0.04), 0.31 + (i > 3 ? 0.05 : 0), 0.12, 0.09, 0.11, i);
    A.cyl(FPI_C.wood, 0.98, 0.1, 0.27, 0.11, 0.2); A.cyl(IR, 0.98, 0.1, 0.3, 0.113, 0.02); A.cyl(IR, 0.98, 0.1, 0.43, 0.113, 0.02); A.cyl('#2c4a52', 0.98, 0.1, 0.45, 0.1, 0.01);

    // ---- the furnace: cast iron on a plinth, fluted corner columns with brass caps, a moulded cornice studded with rivets
    A.box(IR2, 0, 0.12, T, 1.1, 0.7, 0.06);
    A.box(IR, 0, 0.12, T + 0.06, 1.0, 0.6, 0.3);
    for (const su of [-1, 1]) for (const sv of [-1, 1]) { A.cyl(IR2, su * 0.5, 0.12 + sv * 0.3, T + 0.06, 0.05, 0.3); A.cyl(BR2, su * 0.5, 0.12 + sv * 0.3, T + 0.33, 0.062, 0.03); A.cyl(BR2, su * 0.5, 0.12 + sv * 0.3, T + 0.06, 0.062, 0.03); }
    A.box(IR2, 0, 0.12, T + 0.36, 1.12, 0.72, 0.05);
    A.box(BR2, 0, 0.12, T + 0.41, 1.04, 0.64, 0.025);
    for (let i = 0; i < 11; i++) A.box(BR, -0.5 + i * 0.1, -0.243, T + 0.375, 0.022, 0.012, 0.022);
    // the firebox: a brass-framed mouth with its grate, and the door swung open on its hinge (the glow is zmp3d's)
    A.box('#0e0806', 0, -0.183, 1.05, 0.5, 0.02, 0.24);
    A.box(BR, 0, -0.192, 1.025, 0.6, 0.025, 0.03); A.box(BR, 0, -0.192, 1.285, 0.6, 0.025, 0.035);
    for (const s of [-1, 1]) A.box(BR, s * 0.285, -0.192, 1.025, 0.03, 0.025, 0.295);
    for (let i = 0; i < 6; i++) A.box(IR2, -0.2 + i * 0.08, -0.232, 1.05, 0.022, 0.02, 0.24);
    A.box(IR2, 0, -0.232, 1.115, 0.5, 0.02, 0.018); A.box(IR2, 0, -0.232, 1.205, 0.5, 0.02, 0.018);
    { const a = 1.2, hu = 0.3, hv = -0.205, cu = hu + 0.14 * Math.cos(a), cv = hv - 0.14 * Math.sin(a), nu = -Math.sin(a), nv = -Math.cos(a);
      for (const hc of [1.08, 1.24]) A.cyl(BR2, hu, hv, hc - 0.03, 0.018, 0.06);
      A.box(IR, cu, cv, 1.035, 0.28, 0.03, 0.27, -a);
      A.box(IR2, cu + nu * 0.016, cv + nv * 0.016, 1.06, 0.22, 0.008, 0.22, -a);
      A.part('cyl8', BR, cu + nu * 0.024, cv + nv * 0.024, 1.17, 0.13, 0.012, 0.13, -a, Math.PI / 2, 0);
      A.part('cyl6', IR, cu + nu * 0.034, cv + nv * 0.034, 1.17, 0.05, 0.02, 0.05, -a, Math.PI / 2, 0);
      A.box(BR2, cu + nu * 0.04 + Math.cos(a) * 0.1, cv + nv * 0.04 - Math.sin(a) * 0.1, 1.15, 0.025, 0.02, 0.05, -a); }
    // vents along its sides, glowing, and the gauge on its face (the needle is zmp3d's)
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) A.box('#ff7a30', s * 0.505, 0.0 + i * 0.12, 1.1, 0.012, 0.07, 0.025, 0, 0, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) A.part('box', '#ff8a3a', s * 0.507, 0.0 + i * 0.12, 1.112, 0.008, 0.012, 0.06, 0, 0, 0, 'glow');
    face(BR, -0.4, -0.19, 1.17, 0.085, 0.03); face('#e8dcc0', -0.4, -0.206, 1.17, 0.07, 0.006);
    A.box('#a02818', -0.4 + 0.045, -0.211, 1.17, 0.03, 0.004, 0.014);
    // the tray the weapon rides in on: two brass rails out over the firebox, and a rest across their ends
    for (const s of [-1, 1]) { A.part('cyl6', BR, s * 0.3, -0.36, 1.395, 0.03, 0.27, 0.03, 0, Math.PI / 2, 0); A.box(BR2, s * 0.3, -0.25, 1.34, 0.04, 0.03, 0.06); }
    rodU(BR, 0, -0.49, 1.395, 0.018, 0.64); for (const s of [-1, 1]) A.part('sph', BR, s * 0.33, -0.49, 1.395, 0.05, 0.05, 0.05);
    // the flue: out of its back, up beside the frame to the ceiling, banded in brass, with its damper and a second gauge
    A.box(IR, 0.56, 0.3, 1.12, 0.14, 0.14, 0.14);
    A.cyl(IR2, 0.63, 0.3, 1.05, 0.085, 0.24);
    A.cyl(IR, 0.63, 0.3, 1.25, 0.07, 3.45);
    for (const hc of [1.5, 2.3, 3.1, 3.9]) A.cyl(BR2, 0.63, 0.3, hc, 0.082, 0.04);
    A.cyl(IR2, 0.63, 0.3, 4.58, 0.12, 0.14);
    face(BR2, 0.63, 0.2, 1.8, 0.012, 0.1); A.part('torus', BR, 0.63, 0.15, 1.8, 0.13, 0.13, 0.13); rodU(BR, 0.63, 0.15, 1.8, 0.008, 0.12); A.part('cyl6', BR, 0.63, 0.15, 1.8, 0.016, 0.12, 0.016);
    face(BR, 0.63, 0.2, 2.62, 0.08, 0.04); face('#e8dcc0', 0.63, 0.178, 2.62, 0.064, 0.006); A.box('#201818', 0.63 + 0.012, 0.174, 2.62, 0.05, 0.004, 0.008, 0, 0, 0.5);
    A.box(BR2, 0.63, 0.25, 2.6, 0.03, 0.06, 0.04);
    // ---- the frame the lens wheel turns in: two cast-iron columns on plinths, brass collars and bearings, an arch over it
    for (const s of [-1, 1]) {
      A.box(IR2, s * 0.82, 0.18, T, 0.2, 0.22, 0.1); A.box(BR2, s * 0.82, 0.18, T + 0.1, 0.16, 0.18, 0.025);
      A.cyl(IR, s * 0.82, 0.18, T + 0.12, 0.05, 1.68);
      for (const hc of [1.3, 1.62, 2.42]) A.cyl(BR2, s * 0.82, 0.18, hc, 0.064, 0.035);
      A.box(BR, s * 0.82, 0.14, 1.93, 0.14, 0.2, 0.18); A.box(IR2, s * 0.82, 0.03, 1.95, 0.15, 0.02, 0.14);
      A.box(IR2, s * 0.82, 0.18, 2.78, 0.17, 0.2, 0.06); A.box(BR2, s * 0.82, 0.18, 2.84, 0.13, 0.16, 0.03);
      // a scrolled bracket from each column to the furnace
      A.box(IR2, s * 0.66, 0.18, 1.42, 0.3, 0.04, 0.03, 0, 0, s * 0.5);
    }
    for (let i = 0; i < 10; i++) {
      const a0 = i / 10 * Math.PI, a1 = (i + 1) / 10 * Math.PI, u0 = 0.82 * Math.cos(a0), u1 = 0.82 * Math.cos(a1), h0 = 2.84 + 0.24 * Math.sin(a0), h1 = 2.84 + 0.24 * Math.sin(a1);
      const L = Math.hypot(u1 - u0, h1 - h0) + 0.02, rz = Math.atan2(h1 - h0, u1 - u0);
      A.part('box', IR2, (u0 + u1) / 2, 0.18, (h0 + h1) / 2, L, 0.07, 0.1, 0, 0, rz);
      A.part('box', BR2, (u0 + u1) / 2, 0.12, (h0 + h1) / 2 + 0.04 * Math.cos(rz), L, 0.02, 0.02, 0, 0, rz);
    }
    A.part('sph', BR, 0, 0.16, 3.1, 0.12, 0.12, 0.12);
    // the sign board over it all (its chalk is zmp3d's)
    A.box('#2a2622', 0, 0.36, 3.22, 1.9, 0.06, 0.5); A.box(FPI_C.wood3, 0, 0.36, 3.18, 2.0, 0.08, 0.05); A.box(FPI_C.wood3, 0, 0.36, 3.71, 2.0, 0.08, 0.05);
    for (const s of [-1, 1]) A.box(BR2, s * 0.6, 0.36, 3.75, 0.02, 0.02, 0.9);
    // ---- the crucible's corner: a three-legged trivet over a bed of charcoal, the clay crucible on it, the tongs by it
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.3; A.box(IR2, 0.66 + Math.cos(a) * 0.1, -0.2 + Math.sin(a) * 0.1, T, 0.02, 0.02, 0.12); }
    A.cyl(IR2, 0.66, -0.2, T + 0.1, 0.13, 0.04); A.part('torus', IR, 0.66, -0.2, T + 0.14, 0.27, 0.27, 0.12, 0, Math.PI / 2, 0);
    for (let i = 0; i < 5; i++) A.part('ico', i % 2 ? '#ff6a20' : '#c83a10', 0.66 + Math.cos(i * 1.3) * 0.08, -0.2 + Math.sin(i * 1.3) * 0.08, T + 0.15, 0.06, 0.04, 0.06, i, 0, 0, 'glow');
    A.part('trunk', '#8a5638', 0.66, -0.2, T + 0.24, 0.2, 0.18, 0.2, 0, Math.PI, 0);
    A.part('torus', '#6a4028', 0.66, -0.2, T + 0.33, 0.21, 0.21, 0.14, 0, Math.PI / 2, 0);
    A.box(IR, 0.78, -0.36, T + 0.005, 0.03, 0.34, 0.012, 0.25); A.box(IR, 0.8, -0.35, T + 0.02, 0.03, 0.32, 0.012, 0.15);
    // the anvil (a bick iron, its horn toward the fire) and a hammer laid by it, and the vice on the bench's front edge
    A.box(IR2, 1.0, 0.08, T, 0.16, 0.18, 0.05); A.box(IR, 1.0, 0.08, T + 0.05, 0.09, 0.1, 0.08); A.box('#4a4642', 1.0, 0.08, T + 0.13, 0.24, 0.13, 0.06);
    A.part('cone', '#4a4642', 0.83, 0.08, T + 0.16, 0.08, 0.16, 0.06, 0, 0, Math.PI / 2);
    A.box(FPI_C.wood, 0.98, -0.2, T, 0.28, 0.03, 0.025, 0.2); A.box(IR, 0.86, -0.22, T, 0.04, 0.09, 0.04, 0.2);
    A.box(IR, 0.95, -0.42, T, 0.16, 0.08, 0.14); A.box(IR2, 0.95, -0.49, T + 0.03, 0.16, 0.04, 0.11);
    A.box(IR, 0.95, -0.5, 0.78, 0.07, 0.06, 0.12);
    A.part('cyl6', BR2, 0.95, -0.52, T + 0.06, 0.025, 0.12, 0.025, 0, Math.PI / 2, 0); rodU(BR2, 0.95, -0.58, T + 0.06, 0.012, 0.2);
    // ---- the bellows' corner (the bellows themselves are zmp3d's), and the tool rack on the wall-side of the column
    A.box(FPI_C.wood3, -0.86, -0.13, T, 0.5, 0.26, 0.03);
    A.box(FPI_C.wood2, -1.02, 0.36, 1.35, 0.26, 0.03, 1.15);
    A.box(BR2, -1.02, 0.34, 2.38, 0.28, 0.03, 0.03); A.box(BR2, -1.02, 0.34, 1.82, 0.28, 0.03, 0.03);
    // a hammer, tongs, a file and callipers hanging on it, and a coil of brass wire
    A.box(FPI_C.wood, -1.1, 0.32, 1.95, 0.025, 0.025, 0.42); A.box(IR, -1.1, 0.32, 1.93, 0.12, 0.04, 0.045);
    A.box(IR, -1.03, 0.32, 1.85, 0.015, 0.015, 0.52, 0, 0, 0.06); A.box(IR, -1.0, 0.32, 1.85, 0.015, 0.015, 0.52, 0, 0, -0.06);
    A.box('#5a5a5a', -0.95, 0.32, 1.42, 0.03, 0.01, 0.38); A.box(FPI_C.wood, -0.95, 0.32, 1.8, 0.035, 0.03, 0.1);
    A.box(BR, -1.07, 0.33, 1.45, 0.012, 0.01, 0.3, 0, 0, 0.15); A.box(BR, -1.03, 0.33, 1.45, 0.012, 0.01, 0.3, 0, 0, -0.15);
    A.part('torus', CU, -0.97, 0.33, 2.2, 0.16, 0.16, 0.16); A.part('torus', CU, -0.97, 0.32, 2.2, 0.14, 0.14, 0.14);
  },
};
// (from FPI_GEN.light.set, and Wrackhaven's FPI_GEN.wrack.set with a place of its own, at) put the bench in its
// room, with a lamp of its own
function zmpPlace(put, light, W, Z, at) {
  const P = at || ZM_PAP_AT, a = Math.atan2(P.nx, -P.ny);
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
  if (!w || w.base !== FPSW[id] || w.tier !== t || w.raid !== zmpRaid()) { const U = ZM_PAP_W[id]; w = ZM_PAP_CACHE[id] = Object.assign({}, FPSW[id], { n: zmpTitle(id, t), mag: FPSW[id].melee || zmpRaid() ? FPSW[id].mag : U.mag, pap: true, base: FPSW[id], tier: t, raid: zmpRaid() }); }
  return w;
}
const zmpName = id => (zmpW(id) || FPSW[id]).n;
const zmpMag = id => (zmpW(id) || FPSW[id]).mag;
const zmpAmmo = id => zmpTier(id) && ZM_PAP_W[id] ? zmpRes(id, zmpTier(id)) : ZM_AMMO[id];
// (from zmHurt) my own hit with a reforged weapon hits harder; anyone else's was scaled where they made it. In the
// raid only on the drowned themselves (d): its bosses take the weapon's plain damage
function zmpDmg(dmg, code, by, d) {
  if (by && by !== FPS.me.id) return dmg;
  if (!ZM.pap || code === 'k') return dmg;
  const id = FPSW_BY_CODE[code];
  if (!(id && zmpTier(id) && ZM_PAP_W[id])) return dmg;
  return dmg * (zmpRaid() ? (d && !d.boss ? zmpK0(id, zmpTier(id)) : 1) : zmpK(id, zmpTier(id)));
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

// ---------- the look of a reforged weapon: a galaxy ----------
// One family for every reforged weapon: its whole body becomes a window onto deep space, a swirl of blue, black and
// purple, with glowing nebulae drifting through it and stars twinkling in it, its edges lit with the nebula's light.
// Each reforging brings a nebula of a different colour (ZMP_GALAXY, by tier: cyan, magenta, emerald, gold, crimson,
// lime, ultraviolet; from VIII the nebulae run through the whole spectrum), and each is brighter, livelier and fuller
// than the last (zmpLookK): from II a second nebula of another colour twines through the first, the clouds drift
// quicker, and their bright cores burn hotter. With reduce motion it all stands still.
// It's a shader added onto the weapon's own materials, slot by slot (VM.weapons[id].M: iron, blade, dark, brass,
// wood, accent, and any other lit one but a lens), so it suits any weapon's model; the pattern is laid out in the
// weapon's own space (zmpRoot), so it stays on the metal as the weapon moves. It overrides the equipped weapon skin
// while the weapon's reforged; lose the reforging, or leave the Lighthouse, and each material goes back exactly as it
// was. Worn in your hands (zmpTint, each tick), on your own figure over the shoulder and on the others' figures
// playing together (fbPose, src/fpsbody.js, with how many times the weapon in their hands has been reforged: `rf`
// in their presence, src/zmnet.js).
// by tier (I, II, ...): [the nebula, the second nebula twined through it, the starlight]
const ZMP_GALAXY = [
  ['#29e8ff', '#3a5cff', '#d8f4ff'],   // I     cyan, and a blue
  ['#ff36d2', '#8a3cff', '#ffe0fb'],   // II    magenta, and violet
  ['#26ff96', '#18c4ff', '#dcffee'],   // III   emerald, and teal
  ['#ffb52a', '#ff3f7a', '#fff2d8'],   // IV    gold, and rose
  ['#ff2e48', '#ff8c26', '#ffe2dc'],   // V     crimson, and ember
  ['#c6ff2a', '#24ffd8', '#f4ffdc'],   // VI    lime, and aqua
  ['#ff6aff', '#6af4ff', '#ffffff'],   // VII   ultraviolet, and ice
];
// its colours at tier t: { a: the nebula, c: the second, b: the starlight } (from VIII on, they turn through the
// spectrum in the shader; these are where they start)
function zmpGalaxy(t) { const G = ZMP_GALAXY[Math.max(0, Math.min(ZMP_GALAXY.length - 1, (t | 0) - 1))]; return { a: G[0], c: G[1], b: G[2] }; }
// (the Twelve Bells' Light borrows its tier's colours: [.., .., .., .., the nebula, the starlight, the second])
function zmpLook(id, t) { const G = zmpGalaxy(t || 1); return ['#07061a', '#07061a', '#07061a', '#07061a', G.a, G.b, G.c]; }
// by tier: [brightness, speed of drift, the second nebula (0..1), the spectrum (0..1)]
const zmpLookK = t => [Math.min(1.6, 1.0 + 0.09 * (t - 1)), Math.min(1.8, 0.6 + 0.15 * (t - 1)), t >= 2 ? Math.min(1, 0.55 + 0.15 * (t - 2)) : 0.25, t >= 8 ? Math.min(1, 0.6 + 0.1 * (t - 8)) : 0];
// each slot: how much of [nebula, stars, edge glow, the cores' fire] it shows, and its own base (0 space, -1 deeper)
const ZMP_ROLE = { iron: [1, 1, 1, 1, 0], blade: [1, 1.1, 1.2, 1, 0], dark: [0.75, 0.9, 0.8, 0.7, -1], brass: [1.1, 0.9, 1, 1.2, 0], wood: [0.85, 1, 0.8, 0.8, -1], accent: [1.25, 1.2, 1.2, 1.3, 0] };
const ZMP_ROLE_ELSE = [0.8, 0.9, 0.8, 0.8, 0];
const ZMP_SKIP = new Set(['bore', 'lens']);
const ZMP_VERT = 'uniform mat4 zmpRoot;\nvarying vec3 zmpP;\n';
const ZMP_FRAG = `uniform float zmpT; uniform vec4 zmpK; uniform vec4 zmpR; uniform vec3 zmpA; uniform vec3 zmpB; uniform vec3 zmpC;
varying vec3 zmpP;
float zmpH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float zmpN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(zmpH(i), zmpH(i + vec3(1, 0, 0)), f.x), mix(zmpH(i + vec3(0, 1, 0)), zmpH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(zmpH(i + vec3(0, 0, 1)), zmpH(i + vec3(1, 0, 1)), f.x), mix(zmpH(i + vec3(0, 1, 1)), zmpH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float zmpF(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * zmpN(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
vec3 zmpHue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
// one layer of stars: a cell lit now and then, a soft point in it, twinkling
float zmpStar(vec3 p, float t, float dens) {
  vec3 c = floor(p), f = fract(p); float h = zmpH(c);
  if (h < dens) return 0.0;
  vec3 o = vec3(zmpH(c + 3.1), zmpH(c + 7.7), zmpH(c + 1.3)) * 0.6 + 0.2;
  float d = length(f - o), tw = 0.55 + 0.45 * sin(t * (2.0 + h * 5.0) + h * 60.0);
  return pow(max(0.0, 1.0 - d * 2.6), 4.0) * tw;
}
vec3 zmpFire(vec3 n, vec3 v) {
  vec3 p = zmpP * 55.0; float t = zmpT * zmpK.y;
  // deep space: a slow swirl of black, midnight blue and purple
  vec3 sp = p * 0.22 + vec3(0.0, 0.0, t * 0.03);
  float s1 = zmpF(sp + zmpF(sp * 1.4 - t * 0.02) * 1.2), s2 = zmpF(sp * 1.7 + 4.0);
  vec3 space = mix(vec3(0.004, 0.004, 0.022), vec3(0.09, 0.02, 0.2), smoothstep(0.35, 0.78, s1));
  space = mix(space, vec3(0.015, 0.05, 0.22), smoothstep(0.48, 0.8, s2) * 0.85);
  // the nebulae: warped clouds drifting through it, glowing, with hot bright cores
  vec3 q = p * 0.3 + vec3(t * 0.07, -t * 0.045, t * 0.055);
  float w1 = zmpF(q + zmpF(q * 1.3 + t * 0.05) * 1.9);
  float w2 = zmpF(q * 0.85 + vec3(5.2, 1.3, 8.1) - vec3(t * 0.04, t * 0.06, 0.0) + zmpF(q * 1.1 - t * 0.03) * 1.5);
  float n1 = smoothstep(0.56, 0.86, w1), n2 = smoothstep(0.6, 0.9, w2) * zmpK.z;
  float haze = smoothstep(0.4, 0.62, w1) * 0.18 + smoothstep(0.44, 0.66, w2) * 0.14 * zmpK.z;
  vec3 ca = zmpA, cc = zmpC;
  if (zmpK.w > 0.0) { ca = mix(ca, zmpHue(w1 * 0.6 + t * 0.05) * 1.1, zmpK.w); cc = mix(cc, zmpHue(w2 * 0.6 + t * 0.05 + 0.45) * 1.1, zmpK.w); }
  vec3 neb = ca * (n1 * 1.5 + haze) + cc * (n2 * 1.35 + haze * 0.6);
  float core = pow(n1, 4.0) + pow(n2, 4.0) * 0.8;
  neb += mix(ca, vec3(1.0), 0.45) * core * 0.9 * zmpR.w;
  // dust lanes: dark threads across the clouds
  neb *= 1.0 - smoothstep(0.55, 0.7, zmpF(q * 2.6 + 11.0)) * 0.55;
  // stars, near and far, and a few bright ones with a halo of the nebula's colour
  float st = zmpStar(p * 1.3, zmpT, 0.8) + zmpStar(p * 2.6 + 17.0, zmpT, 0.78) * 0.75;
  float big = zmpStar(p * 0.6 + 5.0, zmpT, 0.94);
  vec3 stars = zmpB * (st * 2.2 + big * 3.2) + ca * big * 0.8;
  // the edges lit with the nebula's light
  float rim = pow(1.0 - abs(dot(n, v)), 2.2);
  vec3 col = space + neb * zmpR.x + stars * zmpR.y + mix(ca, cc, 0.5 + 0.5 * sin(t * 0.7)) * pow(rim, 2.0) * 0.18 * zmpR.z;
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
  const G = zmpGalaxy(t), K = zmpLookK(t);
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
      u.zmpA.value.set(G.a); u.zmpB.value.set(G.b); u.zmpC.value.set(G.c);
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
    // (space underneath: near black, a deep blue-violet; polished, so the light glints off it like glass)
    mt.color.set(r === -1 ? '#020108' : '#05040f');
    mt.emissive.set(G.a); mt.emissiveIntensity = 0.03;
    if (mt.specular) mt.specular.set('#8a8ad0');
    if (mt.shininess != null) mt.shininess = 110;
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

// ---------- in 3D: the lens wheel turning in its frame, its gears and governor, the firebox's glow, the bellows, ----------
// the crucible's melt, the gauge, the sparks and embers, and the weapon on the tray.
// Its states read in the fire and the wheel: idle, the wheel turns slowly, the firebox and crucible smoulder, a few
// embers drift up, the governor's balls hang low and the gauge sits low; at work, the bellows pump, the firebox and the
// melt blaze white-hot, the wheel races and its prisms flare, the governor's balls fly out, the needle climbs into the
// red, a heat haze shimmers over the furnace and sparks fly; done, the lens flashes as the weapon comes back out, and
// it all cools back down. With reduce motion the bellows, haze, embers, sparks and flicker are still.
const ZMP3 = { grp: null };
// (static parts of one moving piece merged into one geometry: [geometry, x, y, z, rx, ry, rz, sx, sy, sz] each)
function zmpMerge(list) {
  const pos = [], M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  for (const [geo, x, y, z, rx, ry, rz, sx, sy, sz] of list) {
    const n = geo.index ? geo.toNonIndexed() : geo;
    n.applyMatrix4(M.compose(v.set(x || 0, y || 0, z || 0), q.setFromEuler(e.set(rx || 0, ry || 0, rz || 0)), s.set(sx || 1, sy || sx || 1, sz || sx || 1)));
    const P = n.attributes.position.array; for (let i = 0; i < P.length; i++) pos.push(P[i]);
    if (n !== geo) n.dispose(); geo.dispose();
  }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.computeVertexNormals();
  return out;
}
// a toothed brass gear of radius r and n teeth, its axis along x, with a hub and spokes
function zmpGearGeo(r, n, th) {
  const L = [[new THREE.CylinderGeometry(r * 0.86, r * 0.86, th * 0.6, 20, 1, true), 0, 0, 0, 0, 0, Math.PI / 2], [new THREE.CylinderGeometry(r * 0.25, r * 0.25, th * 1.6, 8), 0, 0, 0, 0, 0, Math.PI / 2]];
  L.push([new THREE.TorusGeometry(r * 0.8, th * 0.35, 4, 20), 0, 0, 0, 0, Math.PI / 2, 0]);
  for (let i = 0; i < 4; i++) L.push([new THREE.BoxGeometry(th * 0.5, r * 1.6, th * 0.5), 0, 0, 0, i / 4 * Math.PI, 0, 0]);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; L.push([new THREE.BoxGeometry(th, r * 0.22, Math.PI * 2 * r / n * 0.5), 0, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, a, 0, 0]); }
  return zmpMerge(L);
}
function zmp3dBuild() {
  const P = zmpAt(); if (!P) return null;
  const g = new THREE.Group(); g.position.copy(z3v(P.x, P.y, FPSC.GROUND + (P.z || 0))); g.rotation.y = Math.atan2(P.ny, P.nx) - Math.PI / 2; Z3.grp.add(g);
  // (in the group, -z is the bench's front, and x is the prop's -u)
  const T = 0.96, WY = 2.02, WZ = 0.12, WR = 0.64;
  const brass = z3Lam('#c89a40', { emissive: 0x2a1606 }), iron = z3Lam('#2a2c30'), wood = z3Lam('#6a4a30'), leather = z3Lam('#5a3420');
  const add = (glow, a, vc) => new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: a, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, vertexColors: !!vc, side: THREE.DoubleSide });
  const soft = (c0, c1) => z3Soft(c0, c1);
  const sprite = (tex, x, y, z, s) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.position.set(x, y, z); m.scale.setScalar(s); g.add(m); return m; };
  // ---- the lens wheel: a first-order Fresnel panel in miniature: a bull's-eye at its heart, concentric prism rings
  // (each a three-sided glass ring), brass astragals dividing it into eight panels, a brass rim
  // and, outside it, a ring of catadioptric prisms in an outer hoop
  const wheel = new THREE.Group(); wheel.position.set(0, WY, WZ); g.add(wheel);
  const B3 = [[new THREE.TorusGeometry(WR, 0.045, 6, 40)], [new THREE.TorusGeometry(WR - 0.07, 0.016, 4, 36)], [new THREE.TorusGeometry(0.17, 0.02, 4, 20)], [new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), 0, 0, 0, Math.PI / 2]];
  for (let i = 0; i < 8; i++) B3.push([new THREE.BoxGeometry(0.022, WR - 0.17, 0.035), Math.cos(i / 8 * Math.PI * 2) * (WR + 0.17) / 2, Math.sin(i / 8 * Math.PI * 2) * (WR + 0.17) / 2, 0, 0, 0, i / 8 * Math.PI * 2 - Math.PI / 2]);
  // an outer hoop, the ring of catadioptric prisms set between it and the rim on brass clips
  B3.push([new THREE.TorusGeometry(WR + 0.09, 0.016, 4, 40)]);
  for (let i = 0; i < 16; i++) { const a = (i + 0.5) / 16 * Math.PI * 2; B3.push([new THREE.BoxGeometry(0.02, 0.11, 0.03), Math.cos(a) * (WR + 0.05), Math.sin(a) * (WR + 0.05), 0, 0, 0, a - Math.PI / 2]); }
  wheel.add(new THREE.Mesh(zmpMerge(B3), brass));
  // the prism rings: their glass catches the light in eight bright panels, so the wheel flashes as it turns
  const rp = [], rc = [];
  for (let i = 0; i < 6; i++) {
    const r = 0.22 + i * 0.07, geo = new THREE.TorusGeometry(r, 0.03, 3, 48).toNonIndexed(), Pp = geo.attributes.position;
    for (let j = 0; j < Pp.count; j++) {
      const x = Pp.getX(j), y = Pp.getY(j), z = Pp.getZ(j), a = Math.atan2(y, x), f = Math.pow(0.5 + 0.5 * Math.cos(a * 8 + i * 0.5), 3), fz = z < -0.005 ? 0.55 : 1;
      rp.push(x, y, z); const b = (0.3 + 0.7 * f) * fz * (1 - i * 0.06); rc.push(b, b * 0.92, b * 0.7);
    }
    geo.dispose();
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
  const rings = new THREE.Mesh(rg, add(0xffe6b0, 0.6, true)); wheel.add(rings);
  const prisms = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, gg = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 3); gg.rotateY(Math.PI / 6); gg.rotateZ(a); gg.translate(Math.cos(a) * (WR + 0.05), Math.sin(a) * (WR + 0.05), 0); prisms.push(gg); }
  const cata = new THREE.Mesh(zmpMerge(prisms.map(q => [q])), add(0xffd8a0, 0.5)); wheel.add(cata);
  // the glass itself, smoky amber, so the bright prism rings stand out against it
  const glass = new THREE.Mesh(new THREE.CircleGeometry(WR - 0.02, 40), new THREE.MeshBasicMaterial({ color: 0x3a2410, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })); glass.position.z = 0.045; wheel.add(glass);
  const gl2 = new THREE.Mesh(new THREE.CircleGeometry(WR - 0.02, 40), add(0xff8a30, 0.1)); gl2.position.z = 0.04; wheel.add(gl2);
  const bull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8), add(0xfff2c8, 0.9)); bull.scale.z = 0.45; wheel.add(bull);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 8), iron); axle.rotation.z = Math.PI / 2; axle.position.set(0, WY, WZ); g.add(axle);
  // a glint over the glass, still while the wheel turns under it (where the furnace's light catches)
  const glint = sprite(soft('rgba(255,250,230,1)', 'rgba(255,220,160,0)'), 0.22, WY + 0.26, WZ - 0.06, 0.5);
  // ---- the gear train on the anvil's side: a big gear on the axle, a pinion under it, and the hand crank
  const gear = new THREE.Mesh(zmpGearGeo(0.21, 18, 0.04), brass); gear.position.set(-0.95, WY, WZ); g.add(gear);
  const pin = new THREE.Group(); pin.position.set(-0.95, WY - 0.315, WZ); g.add(pin);
  pin.add(new THREE.Mesh(zmpGearGeo(0.1, 9, 0.04), brass));
  const crank = new THREE.Mesh(zmpMerge([[new THREE.BoxGeometry(0.02, 0.2, 0.03), -0.04, -0.09, 0], [new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6), -0.09, -0.18, 0, 0, 0, Math.PI / 2]]), wood);
  pin.add(crank);
  const pinAx = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), iron); pinAx.rotation.z = Math.PI / 2; pinAx.position.set(-0.88, WY - 0.315, WZ); g.add(pinAx);
  // ---- the governor on the column's head: its balls fly out the faster the wheel turns
  const gov = new THREE.Group(); gov.position.set(-0.82, 2.87, 0.18); g.add(gov);
  gov.add(new THREE.Mesh(zmpMerge([[new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), 0, 0.17, 0], [new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8), 0, 0.34, 0], [new THREE.SphereGeometry(0.03, 8, 6), 0, 0.37, 0]]), brass));
  const arms = [];
  for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.y = 0.32; a.rotation.y = s > 0 ? 0 : Math.PI; gov.add(a); const arm = new THREE.Group(); a.add(arm); arm.add(new THREE.Mesh(zmpMerge([[new THREE.BoxGeometry(0.01, 0.16, 0.01), 0, -0.08, 0], [new THREE.SphereGeometry(0.035, 8, 6), 0, -0.17, 0]]), brass)); arms.push(arm); }
  // ---- the bellows: the bottom board and the nozzle into the furnace's side; the top board lifts on its hinge
  const bel = new THREE.Group(); bel.position.set(0.62, T + 0.055, -0.13); g.add(bel);
  bel.add(new THREE.Mesh(zmpMerge([[new THREE.BoxGeometry(0.48, 0.025, 0.24), 0.26, -0.012, 0], [new THREE.BoxGeometry(0.08, 0.02, 0.04), 0.54, -0.012, 0]]), wood));
  bel.add(new THREE.Mesh(zmpMerge([[new THREE.CylinderGeometry(0.012, 0.035, 0.12, 8), -0.06, 0, 0, 0, 0, -Math.PI / 2], [new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8), 0.02, 0, 0, 0, 0, Math.PI / 2]]), brass));
  const lid = new THREE.Group(); bel.add(lid);
  lid.add(new THREE.Mesh(zmpMerge([[new THREE.BoxGeometry(0.48, 0.025, 0.24), 0.26, 0.012, 0], [new THREE.BoxGeometry(0.08, 0.02, 0.04), 0.54, 0.012, 0], [new THREE.CylinderGeometry(0.03, 0.03, 0.01, 8), 0.3, 0.03, 0]]), wood));
  // the leather between them, a wedge from the hinge out
  const wp = []; const W = (x0, y0, z0) => wp.push(x0, y0, z0);
  { const Lw = 0.5, h = 0.11; // a unit wedge, top rising with x: scaled in y each frame
    const V = [[0.02, 0, -h], [Lw, 0, -h], [Lw, 1, -h], [0.02, 0, h], [Lw, 0, h], [Lw, 1, h]];
    for (const [a, b, c] of [[0, 2, 1], [3, 4, 5], [1, 2, 5], [1, 5, 4], [0, 3, 5], [0, 5, 2]]) { W(...V[a]); W(...V[b]); W(...V[c]); } }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); lg.computeVertexNormals();
  const leath = new THREE.Mesh(lg, new THREE.MeshLambertMaterial({ color: leather.color, side: THREE.DoubleSide })); bel.add(leath);
  // ---- the firebox: its coals behind the grate, the flames over them, and the light it throws on the bench
  const fireTex = soft('rgba(255,236,170,1)', 'rgba(255,90,20,0.0)');
  const mouthBack = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.22), add(0xff6a20, 0.9)); mouthBack.position.set(0, 1.17, -0.196); mouthBack.rotation.y = Math.PI; g.add(mouthBack);
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.3), new THREE.MeshBasicMaterial({ map: fireTex, color: 0xffc070, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); mouth.position.set(0, 1.17, -0.2); mouth.rotation.y = Math.PI; g.add(mouth);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.42), new THREE.MeshBasicMaterial({ map: fireTex, color: 0xff9040, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  spill.rotation.x = -Math.PI / 2; spill.position.set(0, T + 0.006, -0.38); g.add(spill);
  const fhalo = sprite(soft('rgba(255,150,60,0.9)', 'rgba(255,120,40,0)'), 0, 1.17, -0.32, 0.8);
  // the needle of the gauge on the furnace's face
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.004), new THREE.MeshBasicMaterial({ color: 0x1a1210 })); needle.geometry.translate(0, 0.026, 0);
  needle.position.set(0.4, 1.17, -0.212); g.add(needle);
  // ---- the crucible's melt, and the haze of heat over the furnace
  const melt = new THREE.Mesh(new THREE.CircleGeometry(0.085, 14), add(0xffa040, 0.9)); melt.rotation.x = -Math.PI / 2; melt.position.set(-0.66, T + 0.322, -0.2); g.add(melt);
  const mhalo = sprite(soft('rgba(255,170,70,0.9)', 'rgba(255,140,50,0)'), -0.66, T + 0.4, -0.2, 0.45);
  const haze = sprite(soft('rgba(255,170,90,0.35)', 'rgba(255,140,60,0)'), 0, 1.62, -0.02, 0.9);
  // the great glow behind the lens
  const halo = sprite(soft('rgba(255,190,90,0.9)', 'rgba(255,190,90,0)'), 0, WY, WZ - 0.06, 1.6);
  // the weapon, on its way in and out
  const show = new THREE.Group(); g.add(show);
  // its name and price, chalked on the board over it
  const ch = z3Chalk([["LAMPWRIGHT'S BENCH", 21], [ZM_PAP.COST + ' +', 40]], 1.8, 0.46); ch.position.set(0, 3.47, 0.32); ch.rotation.y = Math.PI; g.add(ch);
  const light = new THREE.PointLight(0xffb060, 0.8, 8, 1.5); light.position.set(0, 1.6, -0.9); g.add(light);
  // sparks thrown off the wheel and the tray while it works, embers drifting up off the fire always
  const sparks = [], embers = [], sg = new THREE.SphereGeometry(0.018, 4, 3);
  for (let i = 0; i < 16; i++) { const s = new THREE.Mesh(sg, add(0xffd080, 1)); s.visible = false; g.add(s); sparks.push({ m: s, t: 0, v: new THREE.Vector3() }); }
  for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(sg, add(0xff8a30, 0.9)); s.visible = false; s.scale.setScalar(0.7); g.add(s); embers.push({ m: s, t: 0, v: new THREE.Vector3() }); }
  return { grp: Z3.grp, g, wheel, rings, glass, gl2, cata, bull, glint, gear, pin, arms, lid, leath, mouth, mouthBack, spill, fhalo, needle, melt, mhalo, haze, halo, show, light, sparks, embers, wpn: {}, spin: 0, heat: 0, gauge: 0.1, flash: 0, was: false, bel: 0 };
}
// (from zmScene3D) each frame
function zmp3d(dt) {
  if (!ZMP3.b || ZMP3.b.grp !== Z3.grp) ZMP3.b = zmp3dBuild();
  const B = ZMP3.b; if (!B) return;
  const F = ZM.forge || { st: 'idle', t: 0 }, t = g.t, work = F.st === 'work', k = work ? Math.min(1, F.t / 0.8) * Math.min(1, (ZM_PAP.TIME - F.t) / 0.6 + 0.3) : 0;
  const mo = reduceMotion ? 0 : 1;
  // done: the lens flashes as the weapon comes out, and the fire cools back down over a few seconds
  if (B.was && !work) B.flash = 1;
  B.was = work; B.flash = Math.max(0, B.flash - dt * 0.9);
  B.heat += ((work ? 1 : 0) - B.heat) * Math.min(1, dt * (work ? 2.5 : 0.6));
  const h = Math.max(k, B.heat * 0.85), fl = B.flash * B.flash;
  const flick = mo ? 0.82 + 0.1 * Math.sin(t * 7.3) + 0.08 * Math.sin(t * 17.1 + 1.3) : 0.9;
  B.spin += dt * (0.4 + k * 9 + B.heat * 1.5);
  const spd = 0.4 + k * 9 + B.heat * 1.5;
  B.wheel.rotation.z = B.spin;
  B.gear.rotation.x = -B.spin; B.pin.rotation.x = B.spin * 2;
  // the governor: its balls lift with the wheel's speed
  B.arms[0].parent.parent.rotation.y = B.spin * 2.5;
  const ga = 0.28 + Math.min(1, spd / 9) * 0.85;
  for (const a of B.arms) a.rotation.z = ga;
  // the glass: brighter and hotter as it works, its panels flaring
  B.rings.material.opacity = 0.5 + h * 0.25 + fl * 0.5;
  B.rings.material.color.setRGB(1, 0.9 - h * 0.1 + fl * 0.1, 0.7 - h * 0.25 + fl * 0.3);
  B.glass.material.opacity = 0.45 - h * 0.1 - fl * 0.2; B.gl2.material.opacity = 0.06 + h * 0.2 + fl * 0.3; B.cata.material.opacity = 0.3 + h * 0.4 + fl * 0.5;
  B.bull.material.opacity = 0.6 + 0.4 * h; B.bull.scale.set(1 + fl * 0.5, 1 + fl * 0.5, 0.45);
  B.glint.material.opacity = (0.35 + 0.25 * h) * (mo ? 0.75 + 0.25 * Math.sin(B.spin * 8) : 1) + fl * 0.6; B.glint.scale.setScalar(0.45 + h * 0.25 + fl * 0.6);
  B.halo.material.opacity = 0.1 + h * 0.25 + fl * 0.6; B.halo.scale.setScalar(1.3 + h * 0.8 + fl * 1.2);
  // the fire: smouldering red, or white-hot under the bellows
  B.mouth.material.opacity = (0.45 + h * 0.45) * flick;
  B.mouth.material.color.setRGB(1, 0.5 + h * 0.3, 0.2 + h * 0.2);
  B.mouthBack.material.color.setRGB(0.8 + h * 0.2, 0.28 + h * 0.34, 0.06 + h * 0.14);
  B.mouthBack.material.opacity = 0.7 + 0.3 * h;
  B.spill.material.opacity = (0.18 + h * 0.5) * flick;
  B.fhalo.material.opacity = (0.25 + h * 0.55) * flick; B.fhalo.scale.setScalar(0.7 + h * 0.6);
  B.melt.material.color.setRGB(1, 0.45 + h * 0.35, 0.12 + h * 0.3); B.melt.material.opacity = 0.75 + 0.25 * h;
  B.mhalo.material.opacity = (0.2 + h * 0.5) * flick; B.mhalo.scale.setScalar(0.35 + h * 0.35);
  B.haze.visible = !!mo; if (mo) { B.haze.material.opacity = 0.15 + h * 0.55; B.haze.scale.set(0.8 + h * 0.4 + 0.06 * Math.sin(t * 9), 0.9 + h * 0.5 + 0.08 * Math.sin(t * 6.3), 1); B.haze.position.y = 1.62 + h * 0.12; }
  // the gauge's needle climbs into the red as it works
  B.gauge += ((0.1 + h * 0.8) - B.gauge) * Math.min(1, dt * 1.5);
  B.needle.rotation.z = 2.2 - B.gauge * 4.4 + (work && mo ? 0.04 * Math.sin(t * 31) : 0);
  // the bellows: still at rest, pumping while it works
  B.bel = work && mo ? B.bel + dt * 5.5 : B.bel;
  const la = 0.16 + (work && mo ? 0.12 * (0.5 + 0.5 * Math.sin(B.bel)) : 0.04);
  B.lid.rotation.z = la; B.leath.scale.y = 0.5 * Math.tan(la);
  B.light.intensity = 0.5 + h * 1.2 + fl * 1.2 + (work && mo ? 0.15 * Math.sin(t * 23) : 0);
  B.light.color.setRGB(1, 0.66 + h * 0.12 + fl * 0.2, 0.36 + h * 0.1 + fl * 0.4);
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
  // sparks off the wheel's rim while it works; embers rising off the firebox and the crucible
  for (const s of B.sparks) {
    if (s.t > 0) { s.t -= dt; s.m.position.addScaledVector(s.v, dt); s.v.y -= dt * 4; s.m.visible = s.t > 0; continue; }
    if (work && mo && Math.random() < dt * 16) { const a = Math.random() * Math.PI * 2; s.t = 0.5 + Math.random() * 0.4; s.m.position.set(Math.cos(a) * 0.66, 2.02 + Math.sin(a) * 0.66, 0.05); s.v.set(Math.cos(a) * 1.5, Math.sin(a) * 1.5 + 0.8, -0.8 - Math.random()); s.m.visible = true; }
  }
  for (const s of B.embers) {
    if (s.t > 0) { s.t -= dt; s.m.position.addScaledVector(s.v, dt); s.v.x += (Math.random() - 0.5) * dt * 0.6; s.m.visible = s.t > 0 && !!mo; s.m.material.opacity = Math.min(1, s.t * 1.5); continue; }
    if (mo && Math.random() < dt * (0.8 + h * 10)) {
      const c = Math.random() < 0.35; s.t = 1 + Math.random() * 1.2;
      if (c) s.m.position.set(-0.66 + (Math.random() - 0.5) * 0.1, 1.3, -0.2 + (Math.random() - 0.5) * 0.1); else s.m.position.set((Math.random() - 0.5) * 0.4, 1.12 + Math.random() * 0.1, -0.25);
      s.v.set((Math.random() - 0.5) * 0.15, 0.25 + Math.random() * 0.35 + h * 0.5, c ? 0 : -0.05 - Math.random() * 0.1); s.m.visible = true;
    }
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
  const tz = FPSC.GROUND + zmMid(o), d = Math.hypot(o.x - x, o.y - y);
  const r = fpsRay(x, y, z, bearingOf(o.x - x, o.y - y), Math.atan2(tz - z, Math.max(0.05, d)), FPS.me.id, [o], d + 2);
  return r.kind === 'body';
}
// the nearest of them to a point (not in skip), within r, on about the same floor, and in sight
function zmpNextTo(x, y, z, r, skip) {
  let best = null, bd = r;
  for (const o of ZM.z) {
    if (o.dead || skip.has(o) || o.st === 'out') continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < bd && Math.abs(FPSC.GROUND + zmMid(o) - z) < 2.4 && zmpSees(x, y, z, o)) { bd = d; best = o; }
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
    const fz = FPSC.GROUND + zmMid(o);
    for (let i = 0; i < per; i++) {
      const q = zmpNextTo(o.x, o.y, fz, 6 + t, skip); if (!q) break;
      skip.add(q); q.hitT = 0.2; q.scorch = Math.min(1, (q.scorch || 0) + 0.4);
      ZM.sparks.push({ a: [o.x, o.y, fz], b: [q.x, q.y, FPSC.GROUND + zmMid(q)], t: 0.14, col: cols[(n++) % cols.length], beam: true });
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
  const rgb = h => { const c = new THREE.Color(h); return `${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0}`; };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const L of ZMPX.lasers) {
    const fade = Math.min(1, (L.life - L.t) / 0.5) * Math.min(1, L.t / 0.05);
    if (fade <= 0) continue;
    const t = L.tier, L0 = zmpLook('pepperbox', t), shim = reduceMotion ? 1 : 0.88 + 0.12 * Math.sin(tm * 21 + L.life * 7);
    const outer = t >= 8 ? (() => { const c = new THREE.Color().setHSL((tm * 0.12) % 1, 1, 0.62); return `${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0}`; })() : rgb(L0[4]);
    const mid = t >= 2 ? rgb(L0[6]) : rgb(L0[5]), a = fade * shim;
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
