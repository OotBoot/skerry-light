'use strict';
// The Gannet's Wake, Part III: The Quarterdeck (stage gwcapt). The last part of the raid, and its last boss.
//
// Through the captain's cabin door (Part II) and up the companion you come out on the Gannet's open weather deck,
// under the night sky: a brig of the 1880s, risen off the bottom a year to the night after she broke up on the
// skerries. Her two masts stand over you with their yards crossed and their sails hanging in rags, the shrouds and
// ratlines black against the stars; weed hangs from her rails and her yards, and sea-water stands in pools on her
// planking. Aft, up a short ladder each side, the quarterdeck: the wheel and the binnacle, and the stern lantern.
// Forward, the forecastle and the ship's bell. Between them the waist: the main hatch and the fore hatch, the
// capstan, her guns run out along both rails, and the two flare lockers. All round her the sea; and a way off to the
// west, on its rock, Skerry Light, its beam sweeping round once every turn (src/gannet.js gwBeam: one clock for
// every part and every screen), across her deck once a sweep.
//  - Captain Absalom Crane: her master, drowned with her, and not let go of her. A tall man (more than twice the
//    height of one of you) in a rotted greatcoat and a wide sagging hat, a brass speaking trumpet in his left hand
//    and a boat hook in his right, sea-water running off him all the while. He comes up through his own deck aft,
//    by the wheel. He can only be hurt while there's light on him: the Light's beam crossing the deck (about a
//    second and a half each sweep: the deck brightens, and his coat flushes gold), or a flare. In the dark a shot
//    does nothing at all: sparks off him, and the word on your screen that he's in the dark.
//  - The flare lockers: one each side of the waist. Use one to fire a flare: it goes up over the deck and hangs
//    there, lighting the whole of it (and him) for seven seconds; then thirty-five seconds to reload.
//  - The ship's bell: on the forecastle. Use it (fifteen seconds to swing again): it staggers him where he stands,
//    and the drowned on deck go back over the side at the sound of it.
//  - His blows: the bellow (he puts the trumpet to his mouth, a cone shows on the deck in front of him, and what's in
//    it is thrown back down the deck: a knock, and off your feet); the boat hook's sweep, close in (half your health);
//    and his call (the trumpet raised to the sky: "All hands!"), when his drowned crew come up over the rails.
//  - At half his strength: the Gannet starts to founder. He stops and hauls a black sail up her port side, between
//    the deck and the Light, and from then on the beam never reaches the deck: only the flares light him, and the
//    lockers reload quicker (twenty-two seconds), so you have to take it in turns to fire them. She lists to
//    starboard, more and more, and the sea comes in over the waist.
//  - When he falls he leaves a pirate token where he fell (the Captain's Doubloon): walk over it and it's yours, one
//    for each of you (src/zmegg.js ptGrant); once everyone standing has taken theirs (or after a while), the raid is
//    won, and the MVP screen (src/raidmvp.js).
// Built like Maren's End's fort (src/raidfort.js): a part of its own out in the open (its own FPS_ISLES and FPI_GEN,
// gcLay), Crane a boss kind of his own on src/zmboss.js's framework (ZBT.crane): host-authoritative, each screen
// judging his blows on its own player. The host runs the stage and sends it in `gc` (gcPack / gcApply); joined
// players ask for a flare or the bell (raidAsk 'fl', 'bell'). Whether he's lit is worked out on every side alike: the
// beam from the shared clock (gwInBeam, with the bearing from the Light to the deck), the flares from the host's word.
// The shooter's side says whether a hit does anything (hurt); the host takes a joined player's hit if he was lit a
// moment before, so a hit that crossed the wire as the light went isn't lost.
// The sea all round is the stage's own (the island's ground and the usual sea are hidden while it's on), a little
// below the deck; the deck is the floor (height 0 in the waist), the raised quarterdeck and forecastle stand on it,
// and nobody goes over the rail (block). In her foundering the sea outside tilts (she lists, so the horizon leans)
// and water lies in the waist, deeper to starboard.
// Hooks into shared files, each marked [gannet]: src/raidmvp.js (the victory screen's words for this raid; the token
// taken, for rmvAllTook; flares fired and bells rung counted).

const GCC = {
  FB: 2.4,   // (how far the sea lies below the waist's deck)
  QD: 1.2, QY: -12, FC: 1.2, FY: 12, STERN: -24.4, BOW: 22.6,   // (the quarterdeck and forecastle: their height, where they begin)
  LX: -300, LY: 110,   // (Skerry Light, from the deck's middle: west, a little north)
  BEAM_W: 0.72,   // (how far either side of the deck the beam lights it: about a second and a half each sweep)
  FLARE: 7, FLARE_UP: 0.9, RELOAD: 35, RELOAD2: 22, FLARE_Z: 30,   // (a flare: how long it burns, how long it climbs, the lockers' reload, and in phase 2)
  BELL: 15, STAGGER: 2.6,   // (the bell's swing; how long it staggers him)
  HP: 44, PTS: 3000, RAD: 0.95, TALL: 4.3, HEADZ: 3.75, PAD: 0.55, SP: 2.5, S: 2.3,   // (his size: S times a man's)
  SWEEP: 4.6, SWEEP_ARC: 1.3, BELLOW_R: 15, BELLOW_A: 0.42, BELLOW_KB: 15, BELLOW_RANGE: 13,
  CALL_T: [13, 18], CALL_N: 3, CALL_MORE: 1.5,   // (how often he calls his crew; how many come, and more for each more of you)
  ALIVE: 6, ALIVE_MORE: 3, TRICKLE: [5, 8], ROUND: 10,   // (the most of the drowned on deck at once; a trickle between calls)
  P2: 0.5, LIST: 0.13, FOUNDER_T: 70, WATER: 0.55,   // (phase 2 at half strength; her list at the worst (radians); how long to get there; the waist's water at the worst)
  LIT_GRACE: 0.7,   // (the host takes a joined player's hit up to this long after the light's gone off him)
};
const GC_ST = ['intro', 'fight', 'won'];
const GC_LOCK = [[-4.05, 0.6, 'port'], [4.05, 0.6, 'starboard']];   // (the flare lockers: local x, y, side)
const GC_BELL = [0, 12.55];   // (the bell: in its belfry at the forecastle's break, rung from the waist side)
const GC_START = [0, 5.6], GC_FACE = Math.PI;   // (where you come up: the fore end of the waist, facing aft)
const GC_RISE = [0, -14.8];   // (where he comes up: on the quarterdeck, forward of the wheel)
const GCW = { on: false, st: 'intro' };

// ---------- her shape ----------
// half her breadth at the deck, at y along her (from the stern's taffrail to the bow)
function gcHalfW(y) {
  if (y < -14) return 3.7 + 1.35 * Math.sin(clamp((y - GCC.STERN) / (-14 - GCC.STERN), 0, 1) * Math.PI / 2);
  if (y <= 8) return 5.05;
  const k = clamp((y - 8) / (GCC.BOW + 1.1 - 8), 0, 1);
  return Math.max(0.35, 5.05 * Math.sqrt(1 - k * k));
}
// the deck's height at y (the waist at 0; the quarterdeck and the forecastle raised)
const gcDeckZ = y => y < GCC.QY ? GCC.QD : y > GCC.FY ? GCC.FC : 0;
// inside her rails, with room (pad) to stand?
const gcInside = (lx, ly, pad) => ly > GCC.STERN + 0.35 + pad && ly < GCC.BOW - 0.4 - pad && Math.abs(lx) < gcHalfW(ly) - 0.34 - pad;
const gcL = o => [o.x - FPSC.CX, o.y - FPSC.CY];

// ---------- her props (src/fpsisle.js's kinds) ----------
const GCP = { plank: ['#4c4336', '#48402f', '#4f4538', '#443c31'], tar: '#141210', rail: '#3a2a20', bulw: '#4a2c22', iron: '#1e2022', brass: '#7a6a3a', rope: '#5a4a34', weed: '#1e3424', canvas: '#6e6656', spar: '#2e241a' };
// (a line of rope from one point to another, as a thin box: in a prop's own frame, u across, v along, h up)
function gcRope(A, c, u0, v0, h0, u1, v1, h1, r) {
  const dx = u1 - u0, dy = h1 - h0, dz = -(v1 - v0), L = Math.hypot(dx, dy, dz); if (L < 0.01) return;
  A.part('box', c, (u0 + u1) / 2, (v0 + v1) / 2, (h0 + h1) / 2, r || 0.035, L, r || 0.035, Math.atan2(dx, dz), Math.acos(clamp(dy / L, -1, 1)), 0);
}
Object.assign(FPI_K, {
  // a stretch of deck: its planks along her (w across, d along), the seams tarred, a few pools of water and weed;
  // raised (hh) it's a floor to walk on with its front face planked (the quarterdeck and the forecastle)
  gcdeck: {
    col: GCP.plank[0], noShadow: true,
    sol(p) { return p.hh ? [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh, { fl: true })] : []; },
    b3(p, A) {
      const hh = p.hh || 0, n = Math.max(2, Math.round(p.w / 0.24)), pw = p.w / n, y0 = -p.d / 2;
      A.box(GCP.tar, 0, 0, hh - 0.2, p.w, p.d, 0.18);
      for (let i = 0; i < n; i++) {
        const u = -p.w / 2 + (i + 0.5) * pw;
        // (planks butted end to end, staggered, each a little different)
        let v = y0 - A.r() * 3;
        while (v < p.d / 2) {
          const len = 3 + A.r() * 3, a = Math.max(v, y0), b = Math.min(v + len, p.d / 2);
          if (b - a > 0.1) {
            const mv = (a + b) / 2;
            if (Math.abs(u) < gcHalfW(p.y - FPSC.CY + (p.ang ? -mv : mv)) - 0.2) A.box(GCP.plank[(i * 3 + Math.floor(A.r() * 4)) % 4], u, mv, hh - 0.04, pw * 0.94, b - a - 0.02, 0.05);
          }
          v += len;
        }
      }
      if (hh) { A.box(GCP.bulw, 0, -p.d / 2 - 0.02, 0, p.w, 0.06, hh); for (let u = -p.w / 2 + 0.4; u < p.w / 2; u += 0.9) A.box(GCP.rail, u, -p.d / 2 - 0.05, 0, 0.08, 0.05, hh); A.box(GCP.rail, 0, -p.d / 2 - 0.06, hh - 0.08, p.w, 0.12, 0.1); }
    },
  },
  // the bulwark along one side: from v0 to v1 along her (x by the hull's line, s: which side), a cap rail on
  // stanchions, the planking inside painted a dark red; its gun ports; weed hanging over it here and there
  gcbulwark: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const s = p.s, H0 = p.z0 || 0, hh = p.hh || 1.05;
      for (let v = p.v0; v < p.v1 - 0.01; v += 0.8) {
        const v1 = Math.min(p.v1, v + 0.8), vm = (v + v1) / 2, u0 = s * (gcHalfW(v) - 0.17), u1 = s * (gcHalfW(v1) - 0.17), um = (u0 + u1) / 2, L = Math.hypot(u1 - u0, v1 - v), a = Math.atan2(u1 - u0, v1 - v);
        const z0 = gcDeckZ(vm) + H0;
        A.part('box', GCP.bulw, um, vm, z0 + hh / 2, 0.14, hh, L + 0.04, a);
        A.part('box', GCP.rail, um, vm, z0 + hh + 0.04, 0.3, 0.09, L + 0.05, a);
        A.part('box', GCP.rail, um - s * 0.1, vm, z0 + 0.4, 0.07, 0.8, 0.11, a);
        if (A.r() < 0.16) for (let k = 0; k < 3; k++) A.part('box', GCP.weed, um + s * (0.18 + k * 0.03), vm + (k - 1) * 0.12, z0 + hh - 0.25 - k * 0.1, 0.02, 0.5 + A.r() * 0.5, 0.06, a, 0, s * 0.1);
        if (A.r() < 0.1) A.part('sph', '#5a5e58', um + s * 0.02, vm, z0 + hh + 0.1, 0.08, 0.05, 0.1);   // (a barnacle or two on the rail)
      }
    },
  },
  // a mast: its lower mast, the top (a platform), the topmast and topgallant, three yards crossed with their sails
  // furled or hanging in rags, the shrouds down to the channels at the rails and the ratlines across them
  gcmast: {
    col: GCP.spar,
    sol(p) { return [fpiCirc(p, 0, 0, p.r || 0.42, 30)]; },
    b3(p, A) {
      const r = p.r || 0.42, L = p.low || 13, T = p.top || 8, G = p.tg || 6, z0 = p.z0 || 0;
      A.cyl(GCP.spar, 0, 0, z0 - 0.1, r, L + 0.4, 0, 0, 0, 'cyl8');
      A.box('#3a2c1e', 0, 0, z0 + L - 0.3, 3.2, 2.6, 0.18);   // (the top)
      for (const s of [-1, 1]) A.box('#2a2016', s * 1.6, 0, z0 + L - 0.3, 0.1, 2.6, 0.5);
      A.cyl(GCP.spar, 0, 0.5, z0 + L - 0.6, r * 0.62, T + 1.2, 0, 0, 0, 'cyl8');
      A.cyl(GCP.spar, 0, 0.5, z0 + L + T - 0.4, r * 0.4, G + 0.6, 0, 0, 0, 'cyl8');
      A.box('#2a2016', 0, 0.5, z0 + L + T - 0.6, 1.4, 1.2, 0.12);
      A.part('sph', '#3a2c1e', 0, 0.5, z0 + L + T + G + 0.3, 0.26, 0.2, 0.26);
      // the yards, and their sails: the course furled, the topsail and topgallant hanging torn
      const yards = [[z0 + L - 1.4, 9.4, 0.17, 'furl'], [z0 + L + T * 0.72, 7.4, 0.13, 'rag'], [z0 + L + T + G * 0.7, 5.2, 0.1, 'rag']];
      for (const [h, w, yr, kind] of yards) {
        A.log(GCP.spar, 0, 0.75, h, yr, w, 0);
        for (const s of [-1, 1]) A.log(GCP.spar, s * w * 0.52, 0.75, h, yr * 0.6, w * 0.06, 0);
        if (kind === 'furl') { for (let i = 0; i < 9; i++) A.part('sph', GCP.canvas, (i - 4) * w / 9.5, 0.82, h + 0.12, w / 8, 0.34, 0.34); }
        else {
          // (a sail torn into hanging strips, longer in the middle, some gone altogether)
          const n = 9;
          for (let i = 0; i < n; i++) {
            if (A.r() < 0.22) continue;
            const u = (i - (n - 1) / 2) * w / n * 0.96, len = (h - (z0 + L)) * (0.35 + A.r() * 0.55) * (1 - Math.abs(u) / w * 0.6);
            A.part('box', i % 2 ? GCP.canvas : '#5e5848', u, 0.8 + A.r() * 0.08, h - len / 2, w / n * 0.9, len, 0.03, 0, (A.r() - 0.5) * 0.12, (A.r() - 0.5) * 0.08);
          }
        }
        // (weed and old rope hanging from it)
        for (let i = 0; i < 4; i++) { const u = (A.r() - 0.5) * w * 0.9; gcRope(A, A.r() < 0.5 ? GCP.weed : GCP.rope, u, 0.75, h, u + (A.r() - 0.5) * 0.4, 0.8, h - 0.8 - A.r() * 2.2, 0.03); }
      }
      // the shrouds: four each side, from the channel at the rail up to the top, and the ratlines across them
      for (const s of [-1, 1]) {
        const base = [], topz = z0 + L - 0.4, bu = s * (p.rail || 5) , n = 4;
        for (let i = 0; i < n; i++) { const v = -1.3 + i * 0.85; base.push([bu, v + 0.3, (p.railZ || 1.1) + 0.05, s * 1.45, -0.6 + i * 0.4, topz]); }
        for (const b of base) gcRope(A, GCP.tar, b[0], b[1], b[2], b[3], b[4], b[5], 0.045);
        for (let h = 0.45; h < 0.97; h += 0.035) for (let i = 0; i < n - 1; i++) {
          const a = base[i], b = base[i + 1], P = q => [q[0] + (q[3] - q[0]) * h, q[1] + (q[4] - q[1]) * h, q[2] + (q[5] - q[2]) * h], pa = P(a), pb = P(b);
          gcRope(A, '#1e1a14', pa[0], pa[1], pa[2], pb[0], pb[1], pb[2], 0.022);
        }
        // (the channel: a plank outboard of the rail the shrouds come down to, with its deadeyes)
        A.box('#2a2016', bu + s * 0.25, -0.2, (p.railZ || 1.1) - 0.15, 0.4, 3.6, 0.12);
        for (const b of base) A.part('sph', '#1a1612', b[0], b[1], b[2] + 0.1, 0.2, 0.2, 0.1);
        // (and the topmast shrouds above, from the top's edge to the topmast's head)
        for (let i = 0; i < 3; i++) gcRope(A, GCP.tar, s * 1.5, -0.6 + i * 0.6, topz + 0.2, s * 0.25, 0.5, z0 + L + T - 0.4, 0.03);
      }
      // the stays: forward, down to the deck or the bowsprit (p.stay: [v, h] of where it comes down)
      if (p.stay) { gcRope(A, GCP.tar, 0, 0.3, z0 + L - 0.3, 0, p.stay[0], p.stay[1], 0.06); gcRope(A, GCP.tar, 0, 0.6, z0 + L + T - 0.5, 0, p.stay[2], p.stay[3], 0.04); }
      // belaying pins round the foot, and a coil of rope hanging on them
      A.box('#3a2a1c', 0, 0, 1.0 + z0, 1.4, 0.16, 0.1); A.box('#3a2a1c', 0, 0, 1.0 + z0, 0.16, 1.4, 0.1);
      for (const [u, v] of [[0.55, 0], [-0.55, 0], [0, 0.55], [0, -0.55]]) A.part('torus', GCP.rope, u * 1.08, v * 1.08, 0.7 + z0, 0.45, 0.45, 0.6, 0, Math.PI / 2, 0);
    },
  },
  // the wheel: a spoked wheel on its pedestal, the drum behind it
  gcwheel: {
    col: GCP.rail,
    sol(p) { return [fpiBox(p, 0, 0, 0.8, 0.45, 1.9)]; },
    b3(p, A) {
      A.box('#3a2a1c', 0, 0.15, 0, 0.9, 0.5, 0.25);
      for (const s of [-1, 1]) A.box('#3e2c1e', s * 0.42, 0.15, 0.2, 0.12, 0.3, 1.0);
      A.log('#4a3624', 0, 0.15, 1.15, 0.16, 0.9, 0);
      A.part('torus', '#5a4028', 0, -0.25, 1.15, 1.3, 1.3, 0.55, 0, 0, 0);
      A.part('torus', '#5a4028', 0, -0.25, 1.15, 0.5, 0.5, 0.5, 0, 0, 0);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); A.part('box', '#5a4028', c * 0.5, -0.27, 1.15 + s * 0.5, 0.05, 1.0, 0.05, 0, 0, -a + Math.PI / 2); A.part('cyl6', '#5a4028', c * 0.86, -0.27, 1.15 + s * 0.86, 0.06, 0.24, 0.06, 0, 0, -a + Math.PI / 2); }
      A.part('sph', GCP.brass, 0, -0.3, 1.15, 0.14, 0.14, 0.1);
    },
  },
  // the binnacle: a brass dome on a wooden pedestal, its lamp still burning faintly inside
  gcbinnacle: {
    col: GCP.rail,
    sol(p) { return [fpiCirc(p, 0, 0, 0.35, 1.4)]; },
    b3(p, A) {
      A.cyl('#3e2c1e', 0, 0, 0, 0.34, 0.2, 0, 0, 0, 'cyl8'); A.cyl('#4a3624', 0, 0, 0.2, 0.24, 0.85, 0, 0, 0, 'cyl8');
      A.cyl(GCP.brass, 0, 0, 1.05, 0.3, 0.1); A.part('sph', GCP.brass, 0, 0, 1.15, 0.56, 0.5, 0.56);
      for (const s of [-1, 1]) A.part('sph', '#2a2c30', s * 0.46, 0, 1.12, 0.2, 0.2, 0.2);
      A.glow('#ffd890', 0, -0.2, 1.18, 0.08);
    },
  },
  // a hatch: its coaming, and the grating over it (you can walk over it)
  gchatch: {
    col: GCP.rail,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, 0.32, { fl: true })]; },
    b3(p, A) {
      for (const [u, v, w, d] of [[0, -p.d / 2, p.w, 0.16], [0, p.d / 2, p.w, 0.16], [-p.w / 2, 0, 0.16, p.d], [p.w / 2, 0, 0.16, p.d]]) A.box('#3e2c1e', u, v, 0, w, d, 0.32);
      A.box('#060606', 0, 0, 0.0, p.w - 0.2, p.d - 0.2, 0.1);
      for (let u = -p.w / 2 + 0.2; u < p.w / 2 - 0.1; u += 0.2) A.box('#4a3a2a', u, 0, 0.24, 0.07, p.d - 0.2, 0.07);
      for (let v = -p.d / 2 + 0.2; v < p.d / 2 - 0.1; v += 0.2) A.box('#4a3a2a', 0, v, 0.27, p.w - 0.2, 0.07, 0.05);
    },
  },
  // the capstan: a drum with its bars shipped, on the deck
  gccapstan: {
    col: GCP.rail,
    sol(p) { return [fpiCirc(p, 0, 0, 0.6, 1.1)]; },
    b3(p, A) {
      A.cyl('#3a2a1c', 0, 0, 0, 0.62, 0.2); A.cyl('#4a3624', 0, 0, 0.2, 0.42, 0.7, 0, 0, 0, 'cyl8'); A.cyl('#3a2a1c', 0, 0, 0.9, 0.55, 0.2);
      for (let i = 0; i < 4; i++) A.log('#4a3624', 0, 0, 0.98, 0.05, 2.6, i * Math.PI / 4);
      A.cyl(GCP.iron, 0, 0, 1.1, 0.12, 0.06);
    },
  },
  // a flare locker: a stout chest against the rail, painted, with a red band and its brass hasp (its lamp, ready or
  // not, is drawn by the stage)
  gclocker: {
    col: '#3a2a1c',
    sol(p) { return [fpiBox(p, 0, 0, 0.55, 0.38, 0.95)]; },
    b3(p, A) {
      A.box('#2e3a34', 0, 0, 0, 1.1, 0.76, 0.85); A.box('#283028', 0, 0, 0.85, 1.16, 0.82, 0.1);
      A.box('#8a2a20', 0, -0.39, 0.42, 1.1, 0.02, 0.16);
      A.box(GCP.brass, 0, -0.4, 0.64, 0.14, 0.03, 0.18);
      for (const s of [-1, 1]) A.box(GCP.iron, s * 0.45, -0.39, 0.1, 0.06, 0.03, 0.7);
      // (the flare gun's rack on its lid)
      A.box('#3a2a1c', 0.18, 0, 0.95, 0.5, 0.18, 0.06); A.log(GCP.iron, 0.18, 0, 1.04, 0.035, 0.4, 0);
    },
  },
  // the belfry: two posts and a beam, a little roof over it, at the forecastle's break (the bell is the stage's)
  gcbelfry: {
    col: GCP.rail,
    sol(p) { return [fpiBox(p, -0.75, 0, 0.12, 0.12, 2.6), fpiBox(p, 0.75, 0, 0.12, 0.12, 2.6)]; },
    b3(p, A) {
      for (const s of [-1, 1]) { A.box('#4a3624', s * 0.75, 0, 0, 0.18, 0.18, 2.5); A.box('#3a2a1c', s * 0.75, 0, 0, 0.32, 0.32, 0.2); }
      A.box('#4a3624', 0, 0, 2.3, 1.8, 0.22, 0.22);
      A.part('box', '#2a2016', -0.55, 0, 2.75, 1.3, 0.08, 0.9, 0, 0, 0.55); A.part('box', '#2a2016', 0.55, 0, 2.75, 1.3, 0.08, 0.9, 0, 0, -0.55);
      A.part('cone', GCP.brass, 0, 0, 3.12, 0.12, 0.25, 0.12);
    },
  },
  // a cask lashed down, an old coil of cable, a bucket: what's left about her deck
  gccask: {
    col: '#3a2a1c',
    sol(p) { return [fpiCirc(p, 0, 0, 0.42, 1.0)]; },
    b3(p, A) { A.cyl('#4a3624', 0, 0, 0, 0.4, 0.95, 0, 0, 0, 'cyl8'); for (const h of [0.1, 0.45, 0.8]) A.cyl(GCP.iron, 0, 0, h, 0.42, 0.05); A.part('sph', GCP.weed, 0.2, 0.2, 0.9, 0.3, 0.1, 0.3); },
  },
  // the stern lantern: a great glazed lantern on an iron bracket over the taffrail (its light is lit)
  gcsternlamp: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      A.box(GCP.iron, 0, 0.3, 0, 0.08, 0.6, 0.08); A.box(GCP.iron, 0, 0.6, 0, 0.08, 0.08, 1.6);
      A.cyl('#1a1a1c', 0, 0.6, 1.6, 0.26, 0.1); A.cyl('#1a1a1c', 0, 0.6, 2.25, 0.2, 0.1);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; A.box('#1a1a1c', Math.cos(a) * 0.22, 0.6 + Math.sin(a) * 0.22, 1.7, 0.03, 0.03, 0.56); }
      A.glow('#ffcf80', 0, 0.6, 1.98, 0.32); A.part('cone', '#1a1a1c', 0, 0.6, 2.45, 0.3, 0.35, 0.3);
    },
  },
  // the taffrail and the break rails: a rail on turned balusters (their solids keep you on the raised deck but for the ladders)
  gcbalus: {
    col: GCP.rail,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.08, (p.z0 || 0) + 1.0)]; },
    b3(p, A) {
      const z0 = p.z0 || 0;
      A.box(GCP.rail, 0, 0, z0 + 0.9, p.w, 0.16, 0.1); A.box(GCP.rail, 0, 0, z0, p.w, 0.14, 0.08);
      for (let u = -p.w / 2 + 0.15; u < p.w / 2; u += 0.3) { A.cyl('#4a3624', u, 0, z0 + 0.08, 0.04, 0.82, 0, 0, 0, 'cyl6'); A.part('sph', '#4a3624', u, 0, z0 + 0.48, 0.1, 0.16, 0.1); }
    },
  },
});

// ---------- the map: her decks, and where you come up ----------
const GC_ZONES = { deck: { n: 'the Gannet’s deck', r: [-6, 6, -25, 23.5], sky: true } };
FPS_ISLES.gwcapt = Object.assign({}, FPS_ISLES.light, { name: 'the Gannet', ground: '#05090c', ground2: '#05090c', wet: '#05090c', path: '#05090c', fog: ['#04060a', 40, 620], mist: '30,40,50', mistA: 0.05, nLights: 6 });
FPI_GEN.gwcapt = { built: true, set(H) { const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }; gcLay(H, zmKit(H, Z), Z); }, decor() {} };
function gcLay(H, K, Z) {
  const { put, light, lamp } = K, Q = GCC.QD, F = GCC.FC;
  // the decks: the waist, the quarterdeck aft and the forecastle forward (raised), planked across her breadth
  put('gcdeck', 0, (GCC.QY + GCC.FY) / 2, 0, { w: 10.2, d: GCC.FY - GCC.QY });
  put('gcdeck', 0, (GCC.STERN + GCC.QY) / 2, Math.PI, { w: 10.2, d: GCC.QY - GCC.STERN, hh: Q });
  put('gcdeck', 0, (GCC.FY + GCC.BOW) / 2, 0, { w: 10.2, d: GCC.BOW - GCC.FY, hh: F });
  // the ladders up to them, each side, and the rails along their breaks (open at the ladders)
  for (const s of [-1, 1]) for (let n = 1; n <= 3; n++) {
    put('step', s * 3.0, GCC.QY + (4 - n) * 0.6 - 0.3, 0, { w: 2.4, d: 0.62, hh: n * 0.3, col: '#4a3e30' });
    put('step', s * 3.0, GCC.FY - (4 - n) * 0.6 + 0.3, 0, { w: 2.4, d: 0.62, hh: n * 0.3, col: '#4a3e30' });
  }
  for (const [y, z0] of [[GCC.QY + 0.06, Q], [GCC.FY - 0.06, F]]) { put('gcbalus', 0, y, 0, { w: 3.4, z0 }); for (const s of [-1, 1]) put('gcbalus', s * 4.6, y, 0, { w: 0.7, z0 }); }
  put('gcbalus', 0, GCC.STERN + 0.2, 0, { w: 7.2, z0: Q });
  // the bulwarks, both sides, all along
  for (const s of [-1, 1]) put('gcbulwark', 0, 0, 0, { s, v0: GCC.STERN + 0.1, v1: GCC.BOW - 0.6 });
  // the masts: the foremast up through the forecastle, the mainmast in the waist
  put('gcmast', 0, 16, 0, { r: 0.4, low: 12.4, top: 7.5, tg: 5.5, z0: F, rail: 4.15, railZ: F + 1.1, stay: [12, 3.2, 17, 3.8] });
  put('gcmast', 0, -4, 0, { r: 0.45, low: 14, top: 8.2, tg: 6, rail: 4.85, railZ: 1.1, stay: [19.5, GCC.FC + 1.4, 20, 13.6] });
  // aft: the wheel and the binnacle, the skylight, the stern lantern
  put('gcwheel', 0, -20.8, 0, {}, true); put('gcbinnacle', 0, -18.6, 0, {});
  put('gchatch', 2.6, -17.2, 0, { w: 1.3, d: 1.3, lift: Q });
  put('gcsternlamp', 0, GCC.STERN + 0.1, Math.PI, { lift: Q }); light(0, GCC.STERN - 0.5, Q + 2.0, '#ffc070', 9, 'lantern');
  for (const s of [-1, 1]) put('gccask', s * 2.6, -22.4, 0, { lift: Q });
  // the waist: the hatches, the capstan, her guns, the flare lockers, casks and coils
  put('gchatch', 0, 2.2, 0, { w: 2.6, d: 3.2 }); put('gchatch', 0, 8.4, 0, { w: 1.8, d: 1.8 });
  put('gccapstan', 0, -8.4, 0, {});
  for (const s of [-1, 1]) for (const y of [-9.6, -1.6, 5.4]) put('cannon', s * 4.1, y, s > 0 ? 0 : Math.PI, { len: 1.9 });
  for (const [x, y, side] of GC_LOCK) put('gclocker', x, y, x < 0 ? -Math.PI / 2 : Math.PI / 2, {});
  for (const [x, y] of [[-3.9, -6.3], [3.9, 9.6], [-3.6, 10.2]]) put('gccask', x, y, 0, {});
  for (const [x, y] of [[3.6, -6.6], [-1.9, -10.8], [2.2, 10.9]]) put('coil', x, y, 0, {});
  // forward: the belfry, the bitts, the windlass under the forecastle
  put('gcbelfry', GC_BELL[0], GC_BELL[1] + 0.25, 0, { lift: F });
  put('gccapstan', 0, 20.2, 0, { lift: F });
  // a lantern at each mast, burning low
  lamp(0.7, -4.7, 2.3, '#ffb870', 3.4); lamp(-0.6, 15.3, F + 2.3, '#ffb870', F + 3.4);
  light(0, -18.6, Q + 1.2, '#ffd890', 3, 'lantern');
  Z.glass = [];
}

// =====================================================================================================================
// the stage
// =====================================================================================================================
RAID_STAGES.gwcapt = {
  n: 'The Quarterdeck', mend: true,
  map: { start: GC_START.slice(), top: 0, zones: GC_ZONES, nav: [-6, 6, -25, 23.5], isle: 'gwcapt', shore: () => -999 },
  set: (H, K, Z) => gcLay(H, K, Z),
  enter: () => gcEnter(),
  tick: dt => gcTick(dt),
  me: dt => gcMe(dt),
  pack: o => gcPack(o),
  apply: o => gcApply(o),
  q: (sid, k, a) => gcAsk(sid, k, a),
  kill: (d, how, by) => gcKill(d, how, by),
  hurt: (d, dmg, code, by) => gcHurt(d, dmg, code, by),
  block: (x, y, pad) => !gcInside(x - FPSC.CX, y - FPSC.CY, Math.max(0, (pad || 0) - 0.15)),
  consider: c => gcConsider(c),
  prompt: o => gcPrompt(o),
  use: o => gcUse(o),
  hud: (phone, mono, fell) => gcHud(phone, mono, fell),
  b3: grp => gc3dBuild(grp),
  f3: dt => gc3d(dt),
  exit: () => gcExit(),
  music: () => GCW.p2 ? 'gwcapt2' : 'gwcapt',   // (src/sfxlist.js: the deck's own, and from the foundering on; the win's is raidmusic.js's)
};
raidAdd('gannet', 'gwcapt', 3);

const gcN = () => Math.max(1, (ZM.hum || []).length);
const gcNick = sid => sid === FPS.me.id ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
function gcLine(s) { fpsFeed(s); if (ZM.net === 'host' && typeof zmnEvent === 'function') zmnEvent('feed', s); }
const gcCrane = () => ZM.z.find(z => z.zn === GCW.cz && z.bt === 'crane') || null;

// everyone, once she's laid out
function gcEnter() {
  Object.assign(GCW, { on: true, st: 'intro', t: 0, wait: 4.5, cz: 0, p2: 0, sail: 0, fd: 0, tok: null, mine: false, grab: 0, wonT: 0,
    fl: GC_LOCK.map(() => ({ t: 0, cd: 0, seq: 0, drift: 0 })), bell: 0, bellSeq: 0, bellSeen: 0, bellSw: 0, callT: 9, trickT: 4, litAgo: 9, dark: 0, hintT: 10,
    kb: [0, 0], mile: 0, creakT: 4, seenSt: 'intro', flSeen: GC_LOCK.map(() => 0), wake: 0, lit: 0, litK: 0 });
  ZM.open = new Set(['raid', 'deck']);
  ZM.round = Math.max(ZM.round, GCC.ROUND); ZB.round = ZM.round; ZB.plan = [];
  FPS.me.h = GC_FACE;
  if (typeof ztStop === 'function') ztStop(1);
}
function gcExit() {
  GCW.on = false;
  if (typeof GL3D !== 'undefined' && GL3D.sea) GL3D.sea.visible = true;
  if (typeof GL3D !== 'undefined' && GL3D.island) for (const c of GL3D.island.children) if (c.userData.gcHid) { c.visible = true; c.userData.gcHid = false; }
}

// ---------- the light on him ----------
// the bearing from the Light to the deck's middle (the same on every screen)
const gcBeamAt = () => bearingOf(-GCC.LX, -GCC.LY);
// the beam on the deck now? (not once the black sail is up)
const gcBeamOn = () => !GCW.p2 && gwInBeam(gcBeamAt(), GCC.BEAM_W);
// how full the beam is on the deck, 0 to 1 (for the deck's light: up from its edges to its middle)
function gcBeamK() { if (GCW.p2 && GCW.sail > 0.95) return 0; const d = Math.abs(angDiff(gcBeamAt(), gwBeam())); return clamp((GCC.BEAM_W + 0.1 - d) / (GCC.BEAM_W - 0.3), 0, 1) * (1 - (GCW.sail || 0)); }
// seconds till the beam comes round onto the deck again
function gcBeamIn() { const w = 2 * Math.PI / GW.PERIOD, d = ((gcBeamAt() - GCC.BEAM_W - gwBeam()) % (2 * Math.PI) + 4 * Math.PI) % (2 * Math.PI); return d / w; }
// a flare burning over the deck? (not while it's still climbing)
const gcFlareOn = i => { const f = GCW.fl[i]; return f.t > 0 && f.t <= GCC.FLARE; };
const gcFlares = () => GCW.fl ? GCW.fl.some((f, i) => gcFlareOn(i)) : false;
// is he lit: the beam, or a flare
const gcLit = () => gcBeamOn() || gcFlares();

// ---------- alone or hosting, each frame ----------
function gcTick(dt) {
  if (!GCW.on) return;
  GCW.t += dt;
  const n = gcN(), M = gcCrane();
  for (const f of GCW.fl) { if (f.t > 0) f.t = Math.max(0, f.t - dt); if (f.cd > 0) f.cd = Math.max(0, f.cd - dt); }
  if (GCW.bell > 0) GCW.bell = Math.max(0, GCW.bell - dt);
  GCW.litAgo = gcLit() ? 0 : GCW.litAgo + dt;
  if (GCW.st === 'intro') { GCW.wait -= dt; if (GCW.wait <= 0) gcRise(); return; }
  if (GCW.st === 'fight') {
    // her foundering, once it's begun: the list and the water, deeper and deeper
    if (GCW.p2) GCW.fd = Math.min(1, GCW.fd + dt / GCC.FOUNDER_T);
    if (M && !M.dead) {
      // at half strength: the black sail
      if (!GCW.p2 && M.act !== 'rise' && M.hp <= M.max * GCC.P2) { GCW.p2 = 1; if (M.act) { M.act = null; M.at = 0; } zbStart(M, 'hoist'); }
      if (M.act === 'hoist') GCW.sail = Math.max(GCW.sail, clamp(M.at / GC_ACT.hoist.end, 0, 1));
      else if (GCW.p2) GCW.sail = 1;
      // his call: every so often, if he's free to
      GCW.callT -= dt;
      // he keeps to her deck
      const [lx, ly] = gcL(M); if (!gcInside(lx, ly, 0.2) && M.act !== 'rise') { const Y = clamp(ly, GCC.STERN + 1, GCC.BOW - 3), X = clamp(lx, -gcHalfW(Y) + 1, gcHalfW(Y) - 1); M.x = FPSC.CX + X; M.y = FPSC.CY + Y; }
    }
    // a trickle of the drowned between his calls, up over the rails
    const alive = ZM.z.filter(z => !z.dead && !z.boss).length, cap = GCC.ALIVE + GCC.ALIVE_MORE * (n - 1) + (GCW.p2 ? 2 : 0);
    GCW.trickT -= dt;
    if (GCW.trickT <= 0) { GCW.trickT = (GCC.TRICKLE[0] + Math.random() * (GCC.TRICKLE[1] - GCC.TRICKLE[0])) / (GCW.p2 ? 1.4 : 1) / (1 + 0.25 * (n - 1)); if (alive < cap && M && M.act !== 'rise' && M.act !== 'hoist') gcSpawn(gcSpots(1, Math.random() * 1e6)[0]); }
  } else if (GCW.st === 'won' && GCW.wonT > 0) {
    GCW.wonT -= dt;
    if (typeof rmvAllTook === 'function' && rmvAllTook()) GCW.wonT = Math.min(GCW.wonT, 2.5);   // (everyone has the token: on to the end)
    if (GCW.wonT <= 0) raidWin();
  }
}
// where his crew come up: just inboard of the rails in the waist, either side (n of them, from a seed, so every screen
// that knows the seed knows the places)
function gcSpots(n, seed) {
  const r = seeded((seed * 7919 + 13) >>> 0), out = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const s = r() < 0.5 ? -1 : 1, y = -10.5 + r() * 20.5, x = s * (gcHalfW(y) - 0.95);
    if (out.some(([a, b]) => Math.hypot(a - x, b - y) < 1.6)) continue;
    if (Math.abs(y - GC_LOCK[0][1]) < 1.2 || [-9.6, -1.6, 5.4].some(c => Math.abs(y - c) < 0.9)) continue;   // (not up through a gun or a locker)
    out.push([x, y]);
  }
  return out;
}
// hosting or alone: one of his drowned, up over the rail at (x, y) (local)
function gcSpawn(at) {
  if (!at) return null;
  const n = gcN(), u = Math.random(), kind = u < (GCW.p2 ? 0.35 : 0.2) ? 'run' : 'jog';
  const z = raidSpawnAt(FPSC.CX + at[0], FPSC.CY + at[1], { kind, rise: 1.1, hp: zmHp(GCC.ROUND) * (0.9 + Math.random() * 0.2) * (1 + 0.2 * (n - 1)) });
  if (z) zmSound('moan', Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y), 0, kind);
  return z;
}
// the captain comes up through his deck
function gcRise() {
  const kind = 'crane', T = ZBT[kind], n = gcN();
  const hp = zmHp(GCC.ROUND) * GCC.HP * ZBC.BOOST * (1 + ZBC.HP_MORE * (n - 1)) * zbRaidK();
  const zn = ++ZM.zc, wx = FPSC.CX + GC_RISE[0], wy = FPSC.CY + GC_RISE[1];
  const z = { drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x: wx, y: wy, jz: GCC.QD - 4.6, fl: GCC.QD, hp, max: hp, sp: T.sp(),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: Math.PI, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 1.5, ix: wx, iy: wy, ax: 0, ay: 0, lx: wx, ly: wy };
  T.init(z); zbMake(z, kind);
  ZM.z.push(z); FPS.drowned = ZM.z; ZB.seen.add(zn);
  GCW.cz = zn; GCW.st = 'fight';
  zbStart(z, 'rise'); zbArrive(z);
}
// hosting or alone: one of them sent back
function gcKill(d, how, by) {
  if (!GCW.on || !d.boss || d.bt !== 'crane' || GCW.st !== 'fight') return;
  GCW.st = 'won'; GCW.wonT = 45;
  const [lx, ly] = gcL(d), Y = clamp(ly, GCC.STERN + 1.5, GCC.BOW - 3), X = clamp(lx, -gcHalfW(Y) + 1.4, gcHalfW(Y) - 1.4);
  GCW.tok = [FPSC.CX + X, FPSC.CY + Y, gcDeckZ(Y)];
  gcLine('Captain Absalom Crane goes down to the deck of his ship, and is still. Where he fell: a pirate token, one for each of you.');
  for (const z of ZM.z) if (!z.dead && !z.boss) zmKill(z, false, '', 'flash');
}
// how much a hit on him does (the shooter's side, and the host's for a joined player's): nothing in the dark
function gcHurt(d, dmg, code, by) {
  if (!GCW.on || !d || d.bt !== 'crane') return dmg;
  const mine = !by || by === FPS.me.id;
  const lit = gcLit() || (!mine && GCW.litAgo < GCC.LIT_GRACE);
  if (!lit || d.act === 'rise' || d.act === 'hoist') {
    if (mine) gcDarkHit(d, !lit ? 'dark' : d.act);
    return 0;
  }
  if (mine) { raidBossDamage(dmg * (ZM_DMG[code] == null ? 1 : ZM_DMG[code])); GCW.litHit = 0.25; }
  return dmg;
}
// my shot on him in the dark: sparks off his coat, and the word that he's in the dark
function gcDarkHit(d, why) {
  const m = FPS.me, dx = m.x - d.x, dy = m.y - d.y, l = Math.hypot(dx, dy) || 1, r = GCC.RAD * 0.9, z0 = FPSC.GROUND + (d.jz || 0) + 1.6 + Math.random() * 1.6;
  const x = d.x + dx / l * r, y = d.y + dy / l * r;
  for (let i = 0; i < 5; i++) { const a = Math.random() * 6.283, s = 0.25 + Math.random() * 0.35; ZM.sparks.push({ a: [x, y, z0], b: [x + Math.cos(a) * s, y + Math.sin(a) * s, z0 + (Math.random() - 0.3) * s], t: 0.22, col: '190,220,255' }); }
  fpsPuff(x, y, z0, '170,200,230', 3);
  GCW.dark = 1.4; GCW.darkWhy = why; d.ward = 0.35;
  if (!(GCW.tink > 0)) { GCW.tink = 0.12; try { if (!soundOff()) { tone(2400 + Math.random() * 600, 'triangle', 0.002, 0.05, 0.12); tone(3300, 'sine', 0.002, 0.025, 0.08, { delay: 0.02 }); } } catch (e) {} }
}

// ---------- the flare lockers and the bell ----------
// hosting or alone: what someone asked
function gcAsk(sid, k, a) {
  if (!GCW.on) return;
  if (k === 'fl') gcFire(clamp(a | 0, 0, GC_LOCK.length - 1), sid);
  if (k === 'bell') gcRing(sid);
}
function gcFire(i, sid) {
  const f = GCW.fl[i]; if (!f || f.cd > 0 || GCW.st === 'won') return;
  f.t = GCC.FLARE + GCC.FLARE_UP; f.cd = GCW.p2 ? GCC.RELOAD2 : GCC.RELOAD; f.seq = (f.seq + 1) % 1000; f.drift = Math.random() * 6.283;
  gcLine(`${gcNick(sid)} fired a flare from the ${GC_LOCK[i][2]} locker.`);
}
function gcRing(sid) {
  if (GCW.bell > 0 || GCW.st === 'won') return;
  GCW.bell = GCC.BELL; GCW.bellSeq = (GCW.bellSeq + 1) % 1000;
  const M = gcCrane(), n = ZM.z.filter(z => !z.dead && !z.boss).length;
  // the drowned go back over the side; he staggers, unless he's rising or hoisting his sail
  for (const z of ZM.z) if (!z.dead && !z.boss) { gcOverSide(z); zmKill(z, false, '', 'flash'); }
  if (M && !M.dead && M.act !== 'rise' && M.act !== 'hoist') { M.act = null; M.at = 0; zbStart(M, 'stagger'); }
  gcLine(`${gcNick(sid)} rang the ship’s bell. ${n ? 'The drowned go back over the side, and the' : 'The'} captain staggers.`);
}
// (one of the drowned, off over the rail: the sea where they go in)
function gcOverSide(z) { const [lx, ly] = gcL(z), s = lx < 0 ? -1 : 1; fpsPuff(FPSC.CX + s * (gcHalfW(ly) + 0.6), z.y, FPSC.GROUND - GCC.FB + 0.4, '170,210,215', 6); }
// what's in front of you to use
function gcConsider(c) {
  if (!GCW.on) return;
  GC_LOCK.forEach(([x, y], i) => c({ k: 'gcfl', i }, FPSC.CX + x * 0.86, FPSC.CY + y, 0, 1.7, true));
  c({ k: 'gcbell' }, FPSC.CX + GC_BELL[0], FPSC.CY + GC_BELL[1] - 0.9, GCC.FC * 0.5, 2.1, false);
}
function gcPrompt(o) {
  if (o.k === 'gcfl') { const f = GCW.fl[o.i]; if (gcFlareOn(o.i) || f.t > GCC.FLARE) return { text: `The ${GC_LOCK[o.i][2]} flare: burning` }; return f.cd > 0 ? { text: `The ${GC_LOCK[o.i][2]} flare locker: reloading (${Math.ceil(f.cd)} s)` } : { text: 'Fire a flare (lights him for seven seconds)', free: true }; }
  if (o.k === 'gcbell') return GCW.bell > 0 ? { text: `The ship’s bell: still swinging (${Math.ceil(GCW.bell)} s)` } : { text: 'Ring the ship’s bell (staggers him, and sends his drowned back)', free: true };
  return null;
}
function gcUse(o) {
  if (o.k === 'gcfl') { const f = GCW.fl[o.i]; if (f.cd > 0) { zmSound('no'); return true; } if (typeof rmvAdd === 'function') rmvAdd('fl'); raidAsk('fl', o.i); return true; }   // [mvp] flares fired
  if (o.k === 'gcbell') { if (GCW.bell > 0) { zmSound('no'); return true; } if (typeof rmvAdd === 'function') rmvAdd('bl'); raidAsk('bell', 0); return true; }   // [mvp] bells rung
  return false;
}

// ---------- everyone, each frame ----------
function gcMe(dt) {
  if (!GCW.on) return;
  const m = FPS.me, cl = ZM.net === 'client';
  if (cl) { for (const f of GCW.fl) { if (f.t > 0) f.t = Math.max(0, f.t - dt); if (f.cd > 0) f.cd = Math.max(0, f.cd - dt); } if (GCW.bell > 0) GCW.bell = Math.max(0, GCW.bell - dt); if (GCW.p2) GCW.fd = Math.min(1, GCW.fd + dt / GCC.FOUNDER_T); }
  for (const k of ['grab', 'dark', 'tink', 'hintT', 'litHit']) if (GCW[k] > 0) GCW[k] -= dt;
  // a flare going up, the bell rung: seen and heard here (on every screen, by its count)
  GCW.fl.forEach((f, i) => { if (f.seq !== GCW.flSeen[i]) { if (GCW.flSeen[i] || f.seq) gcFlareFx(i); GCW.flSeen[i] = f.seq; } if (f.t > 0 && f.t <= GCC.FLARE && !f.popped) { f.popped = true; gcSound('pop', 0); } if (f.t <= 0 || f.t > GCC.FLARE) f.popped = false; });
  if (GCW.bellSeq !== GCW.bellSeen) { if (GCW.bellSeen || GCW.bellSeq) { gcSound('bell', Math.hypot(FPSC.CX + GC_BELL[0] - m.x, FPSC.CY + GC_BELL[1] - m.y)); GCW.bellSw = 1; } GCW.bellSeen = GCW.bellSeq; }
  // the light coming onto him, and going (a word for it, the first time or two)
  const lit = gcLit(); if (lit && !GCW.lit && GCW.st === 'fight') gcSound('lit', 0); GCW.lit = lit;
  GCW.litK += ((lit ? 1 : 0) - GCW.litK) * Math.min(1, dt * 8);
  // anyone who bled out is back on their feet as she starts to founder, and when he falls
  { const mile = (GCW.p2 ? 1 : 0) + (GCW.st === 'won' ? 1 : 0); if (mile > GCW.mile) raidRespawn(); GCW.mile = Math.max(GCW.mile, mile); if (GCW.st === 'won' && zmIsDown()) zmGetUp(); }
  // thrown back by his bellow: carried down the deck, and slowing
  if (Math.hypot(GCW.kb[0], GCW.kb[1]) > 0.1) { zmMove(m, GCW.kb[0] * dt, GCW.kb[1] * dt); const k = Math.exp(-dt * 3.2); GCW.kb[0] *= k; GCW.kb[1] *= k; } else GCW.kb = [0, 0];
  // the water in the waist, as she founders: it carries you a little to starboard, the low side, and splashes
  if (GCW.fd > 0.05 && !(m.dead > 0)) {
    const [lx, ly] = gcL(m), dep = gcWaterAt(lx, ly) - (m.jz || 0);
    if (dep > 0.05) { zmMove(m, 0.55 * GCW.fd * dt, 0); if ((FPS.step || 0) !== GCW.lastStep && Math.random() < 0.15) fpsPuff(m.x, m.y, FPSC.GROUND + (m.jz || 0) + dep, '150,190,200', 2); GCW.lastStep = FPS.step; }
  }
  // her timbers groan now and then (more as she founders)
  GCW.creakT -= dt; if (GCW.creakT <= 0) { GCW.creakT = (GCW.p2 ? 3 : 6) + Math.random() * 6; gcSound('creak', 0); }
  // the token: walk over it and it's yours
  if (GCW.tok && !GCW.mine && !(m.dead > 0) && Math.hypot(m.x - GCW.tok[0], m.y - GCW.tok[1]) < 1.9 && Math.abs((m.jz || 0) - GCW.tok[2]) < 1.5) {
    GCW.mine = true; GCW.grab = 6;
    if (typeof ptGrant === 'function') ptGrant();
    if (typeof cloudSaveSoon === 'function') try { cloudSaveSoon(); } catch (e) {}
    fpsFeed('You take the Captain’s Doubloon: a pirate token, yours to keep.');
    gcSound('token', 0);
  }
}
// how high the water stands in the waist at a place (local), over the deck there (0: none)
function gcWaterAt(lx, ly) {
  if (!(GCW.fd > 0) || ly < GCC.QY || ly > GCC.FY) return 0;
  return Math.max(0, GCW.fd * GCC.WATER - 0.25 + Math.tan(gcList()) * lx);
}
const gcList = () => GCC.LIST * clamp(GCW.fd || 0, 0, 1);
// a flare going up from locker i: the bang of the gun, sparks and smoke
function gcFlareFx(i) {
  const [x, y] = GC_LOCK[i], wx = FPSC.CX + x, wy = FPSC.CY + y;
  gcSound('flare', Math.hypot(wx - FPS.me.x, wy - FPS.me.y));
  fpsPuff(wx, wy, FPSC.GROUND + 1.3, '255,190,170', 8);
}

// ---------- together ----------
// (hosting) gc: [state, phase 2, sail (hundredths), foundering (thousandths), his number, the bell (tenths), its
// count, each locker's flare (tenths), reload (tenths), count, drift (hundredths); then the token (and its place)]
function gcPack(o) {
  if (!GCW.on) return;
  const r10 = v => Math.round(v * 10), CX = FPSC.CX, CY = FPSC.CY;
  const a = [GC_ST.indexOf(GCW.st), GCW.p2 ? 1 : 0, Math.round(GCW.sail * 100), Math.round(GCW.fd * 1000), GCW.cz | 0, r10(GCW.bell), GCW.bellSeq];
  for (const f of GCW.fl) a.push(r10(f.t), r10(f.cd), f.seq, Math.round(f.drift * 100));
  a.push(GCW.tok ? 1 : 0, GCW.tok ? r10(GCW.tok[0] - CX) : 0, GCW.tok ? r10(GCW.tok[1] - CY) : 0, GCW.tok ? r10(GCW.tok[2]) : 0);
  o.gc = a;
}
function gcApply(o) {
  if (!GCW.on || !o || !Array.isArray(o.gc)) return;
  const f = o.gc.map(v => +v || 0), CX = FPSC.CX, CY = FPSC.CY;
  GCW.st = GC_ST[f[0] | 0] || 'intro'; GCW.p2 = f[1] ? 1 : 0; GCW.sail = clamp(f[2] / 100, 0, 1);
  if (Math.abs(f[3] / 1000 - GCW.fd) > 0.02) GCW.fd = clamp(f[3] / 1000, 0, 1);
  GCW.cz = f[4] | 0; GCW.bell = f[5] / 10; GCW.bellSeq = f[6] | 0;
  GCW.fl.forEach((q, i) => { const b = 7 + i * 4; q.t = f[b] / 10; q.cd = f[b + 1] / 10; q.seq = f[b + 2] | 0; q.drift = f[b + 3] / 100; });
  const b = 7 + GCW.fl.length * 4;
  GCW.tok = f[b] ? [CX + f[b + 1] / 10, CY + f[b + 2] / 10, f[b + 3] / 10] : null;
  if (GCW.cz) ZB.seen.add(GCW.cz);
}

// =====================================================================================================================
// Captain Absalom Crane: a boss of his own, on src/zmboss.js's framework
// =====================================================================================================================
// rise: up through his deck by the wheel (3.6 s); sweep: the boat hook, close in; bellow: the trumpet to his mouth
// and a blast down a cone in front of him; call: the trumpet raised to the sky, and his crew come up over the rails;
// stagger: the bell's work (he can do nothing for a moment); hoist: the black sail, at half his strength (nothing
// touches him while he hauls it up)
const GC_ACT = { rise: { hit: 99, end: 3.6 }, sweep: { hit: 0.72, end: 1.25 }, bellow: { hit: 1.25, end: 2.0 }, call: { hit: 1.2, end: 2.1 }, stagger: { hit: 99, end: GCC.STAGGER }, hoist: { hit: 99, end: 4.6 }, smash: { hit: 0.8, end: 1.3 } };
ZB_KINDS.push('crane');
for (const a of Object.keys(GC_ACT)) if (!ZB_ACT.includes(a)) ZB_ACT.push(a);
const gcHalf = () => Math.max(1, Math.ceil((ZM.perks && ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP) / 2));
// (is a place in his bellow's cone, from where he stands, as he faces)
function gcInCone(z, x, y) { const d = Math.hypot(x - z.x, y - z.y); return d < GCC.BELLOW_R && (d < 1.2 || Math.abs(angDiff(bearingOf(x - z.x, y - z.y), z.h)) < GCC.BELLOW_A); }
ZBT.crane = {
  n: 'Captain Absalom Crane', N: 'Captain Absalom Crane', sub: 'master of the Gannet, and not let go of her', col: '#c8e0d0', warn: '255,210,140', big: 'bellow', puff: '150,190,190',
  get bar() { return GCW.lit ? ['#8a4a14', '#ffd27a'] : ['#2a3a44', '#7a98a8']; },
  hp: GCC.HP, pts: GCC.PTS, rad: GCC.RAD, tall: GCC.TALL, headZ: GCC.HEADZ, pad: GCC.PAD, crowd: 1.4, near: 2.6, through: 1.6, scale: 1.6,
  sp: () => GCC.SP * (GCW.p2 ? 1.15 : 1),
  win: () => false,
  acts: GC_ACT,
  noFlash: () => !gcLit(),
  arriveLine: () => 'Up through his own deck by the wheel, the water running off him: Captain Absalom Crane. He can only be hurt in the light: the beam, or a flare.',
  smashLine: () => '',
  killLine: (who, pts) => `${who} put down Captain Absalom Crane (+${pts}).`,
  init(z) { z.bwCd = 5; z.swCd = 1.5; },
  cool(z, dt) { if (z.bwCd > 0) z.bwCd -= dt; },
  think(z, p, d, dz, level) {
    if (level && d < GCC.SWEEP - 0.5 && z.swCd <= 0) return 'sweep';
    if (GCW.callT <= 0 && ZM.net !== 'client') return 'call';
    if (d < GCC.BELLOW_RANGE && Math.abs(dz) < 2 && z.bwCd <= 0) return 'bellow';
    return null;
  },
  start(z, act, p) {
    const q = GCW.p2 ? 0.8 : 1;
    if (act === 'sweep') z.swCd = (1.3 + Math.random() * 0.6) * q;
    if (act === 'bellow') { z.bwCd = (6 + Math.random() * 3) * q; z.swCd = Math.max(z.swCd, 0.6); }
    if (act === 'call') { GCW.callT = (GCC.CALL_T[0] + Math.random() * (GCC.CALL_T[1] - GCC.CALL_T[0])) * q; z.bwCd = Math.max(z.bwCd, 2); }
    if (act === 'stagger') { z.swCd = Math.max(z.swCd, 1); z.bwCd = Math.max(z.bwCd, 2.5); }
  },
  during(z, dt, nearest) {
    const T = GC_ACT[z.act];
    if (z.act === 'rise') {
      const k = Math.min(1, z.at / T.end), e = zbE(k);
      z.jz = GCC.QD - 4.6 * (1 - e); z.fl = GCC.QD; z.h = Math.PI;
      if (z.at + dt >= T.end) { z.jz = z.fl = GCC.QD; z.lx = z.x; z.ly = z.y; }
      return;
    }
    if (z.act === 'stagger' || z.act === 'hoist') return;
    const p = nearest(z.x, z.y, z.jz); if (!p) return;
    const turn = z.act === 'sweep' ? (z.at < T.hit * 0.7 ? 4 : 0) : z.act === 'bellow' ? (z.at < T.hit * 0.55 ? 2.6 : 0) : 1.5;
    if (turn) z.h += angDiff(bearingOf(p.x - z.x, p.y - z.y), z.h) * Math.min(1, dt * turn);
  },
  strike(z) {
    const m = FPS.me, dm = Math.hypot(z.x - m.x, z.y - m.y);
    if (z.act === 'sweep') {
      gcSound('sweep', dm);
      if (zbMelee(z, GCC.SWEEP, GCC.SWEEP_ARC, gcHalf())) { const a = z.h + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); GCW.kb = [Math.sin(a) * 5, Math.cos(a) * 5]; }
      return;
    }
    if (z.act === 'bellow') {
      gcSound('bellow', dm);
      // (the blast down the cone: spray and mist, on every screen)
      for (let i = 0; i < 30; i++) { const a = z.h + (Math.random() - 0.5) * 2 * GCC.BELLOW_A, r = 1.5 + Math.random() * GCC.BELLOW_R * 0.9; FPS.parts.push({ x: z.x + Math.sin(a) * r * 0.3, y: z.y + Math.cos(a) * r * 0.3, z: FPSC.GROUND + (z.jz || 0) + 3.2, vx: Math.sin(a) * r * 1.4, vy: Math.cos(a) * r * 1.4, vz: 1 + Math.random() * 2, t: 0.6, c: '170,210,220' }); }
      if (dm < 20) FPS.eyeLag = clamp((FPS.eyeLag || 0) - 0.2 * (1 - dm / 20), -0.8, 0.8);
      if (zbOk() && gcInCone(z, m.x, m.y) && Math.abs((m.jz || 0) - (z.jz || 0)) < 2.2) {
        fpsHurt(1, null, null); zmSound('hit'); FPS.hurtT = 0.9;
        const a = bearingOf(m.x - z.x, m.y - z.y), k = GCC.BELLOW_KB * (1 - 0.5 * dm / GCC.BELLOW_R);
        GCW.kb = [Math.sin(a) * k, Math.cos(a) * k]; m.vz = Math.max(m.vz || 0, 4.2);
        fpsFeed('His bellow throws you back down the deck.');
      }
      return;
    }
    if (z.act === 'call') {
      gcSound('call', dm);
      // (the places are worked out from his blow's count: the same on every screen)
      const spots = gcSpots(Math.round(GCC.CALL_N + GCC.CALL_MORE * (gcN() - 1)) + (GCW.p2 ? 1 : 0), z.aseq + 977 * (z.zn || 1));
      for (const [x, y] of spots) { const s = x < 0 ? -1 : 1; fpsPuff(FPSC.CX + s * (gcHalfW(y) + 0.5), FPSC.CY + y, FPSC.GROUND - 0.5, '170,210,215', 8); }
      if (ZM.net !== 'client') {
        const alive = ZM.z.filter(q => !q.dead && !q.boss).length, cap = GCC.ALIVE + GCC.ALIVE_MORE * (gcN() - 1) + 3;
        for (const at of spots.slice(0, Math.max(0, cap - alive))) gcSpawn(at);
        gcLine('Crane, through his trumpet: “All hands! All hands on deck!” His drowned crew come up over the rails.');
      }
    }
  },
  after(z, a) { if (a === 'rise') { z.st = 'in'; z.jz = z.fl = GCC.QD; zmSettle(z); } if (a === 'hoist') GCW.sail = 1; },
  // (nothing while he rises or hauls up his sail; the light's say is the stage's: gcHurt)
  hurtK: (z, how) => z.act === 'rise' || z.act === 'hoist' ? 0 : how === 'burn' ? 0.5 : 1,
  endOf: (z, act) => GC_ACT[act] ? GC_ACT[act].end : 0,
  actSound(z, act) {
    const d = Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y);
    if (act === 'rise') { gcSound('rise', d); for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283, r = Math.random() * 2.2; fpsPuff(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, FPSC.GROUND + GCC.QD + Math.random() * 3, '150,200,205', 3); } }
    else if (act === 'bellow') gcSound('draw', d);
    else if (act === 'call') gcSound('draw', d);
    else if (act === 'stagger') gcSound('stagger', d);
    else if (act === 'hoist') { gcSound('hoist', d); gcLine('Crane drags a black sail up his ship’s side, and the Light is shut off the deck. From now on only the flares will light him. She starts to founder.'); ZM.banner = { text: 'The black sail', t: 4, col: '#9ab8c8', sub: 'the Light is cut off: only the flares will light him now' }; }
  },
  sound: (k, d) => gcSound(k, d),
  build: () => gcBuildCrane(),
  reset(z, M) { M.root.rotation.set(0, 0, 0); M.root.scale.setScalar(1); M.root.visible = true; },
  pose: (z, M, dt) => gcPoseCrane(z, M, dt),
};
// his sounds and the ship's: the recordings (src/sfxbank.js) where there's one, else the synth (src/audio.js)
function gcSound(k, d) {
  const v = clamp(1 - (d || 0) / 60, 0.15, 1), play = (n, vol, o) => { try { return typeof sfxPlay === 'function' && sfxPlay(n, Object.assign({ vol: vol * v, vary: 0.05 }, o || {})); } catch (e) { return false; } };
  const syn = f => { try { if (!soundOff() && AUD.ctx) f(); } catch (e) {} };
  if (k === 'arrive' || k === 'rise') { play('splash', 0.9); play('creak', 1); play('bossdiver', 0.7); syn(() => tone(55, 'sawtooth', 0.4, 0.06, 2.2, { to: 42 })); return; }
  if (k === 'groan') { play('creak', 0.5); return; }
  if (k === 'sweep') { play('swish', 1); return; }
  if (k === 'draw') { syn(() => noise('lowpass', 500, 1, 0.3, 0.05, 0.7)); return; }
  if (k === 'bellow') { play('foghorn', 1, { vary: 0.02 }); syn(() => { tone(62, 'sawtooth', 0.05, 0.1, 1.4, { to: 55 }); noise('bandpass', 300, 0.8, 0.02, 0.14, 1.0); }); return; }
  if (k === 'call') { play('foghorn', 0.8, { vary: 0.1 }); play('moan', 0.7); return; }
  if (k === 'stagger') { play('slam', 0.6); syn(() => tone(80, 'triangle', 0.02, 0.08, 0.6, { to: 50 })); return; }
  if (k === 'hoist') { play('creak', 1); play('grapnel', 0.6); syn(() => noise('lowpass', 900, 1, 0.5, 0.06, 2.6)); return; }
  if (k === 'die') { play('splash', 1); play('thunder', 0.7); syn(() => tone(48, 'sawtooth', 0.1, 0.08, 3, { to: 30 })); return; }
  if (k === 'smash') return;
  if (k === 'bell') { syn(() => { for (const dl of [0, 0.55]) for (const [f, a, dd] of [[740, 0.22, 2.6], [1112, 0.1, 1.8], [1672, 0.06, 1.1], [370, 0.08, 3.2]]) tone(f, 'sine', 0.003, a * v, dd, { delay: dl }); }); return; }
  if (k === 'flare') { play('flaregun', 1); return; }
  if (k === 'pop') { play('flare', 0.8); return; }
  if (k === 'lit') { syn(() => tone(880, 'sine', 0.01, 0.025, 0.5)); return; }
  if (k === 'creak') { play('creak', 0.45 + 0.4 * (GCW.fd || 0), { vary: 0.15, pan: (Math.random() - 0.5) * 0.8 }); return; }
  if (k === 'token') { play('pickup', 1); play('chest', 0.6); return; }
}

// ---------- his model ----------
// A tall drowned man, S times the height of one of you: sea boots and the legs of his trousers; a long greatcoat,
// double-breasted with two rows of tarnished buttons, its collar turned up and a short cape over the shoulders, its
// skirts torn ragged at the hem and hung with weed; a wide-brimmed hat gone soft with the sea and sagging; under it a
// grey gaunt face with a beard full of weed and two pale-green points for eyes. In his right hand the boat hook (a
// long ash pole with an iron hook and spike), in his left the brass speaking trumpet. In the dark he's a shape with
// eyes and the wet shine on him; in the light his coat flushes a burnt gold, so you see that he can be hurt.
const GCG = {};
function gcCraneGeo() {
  if (GCG.ok) return GCG;
  const Q = GCG;
  // (the coat's skirts: open down the front, folded, the hem torn ragged)
  Q.skirt = new THREE.CylinderGeometry(0.2, 0.33, 0.74, 30, 6, true, Math.PI + 0.22, Math.PI * 2 - 0.44); Q.skirt.translate(0, -0.37, 0);
  { const P = Q.skirt.attributes.position, rnd = seeded(0xc4a7); for (let i = 0; i < P.count; i++) { const y = P.getY(i), a = Math.atan2(P.getX(i), P.getZ(i)), d = -y / 0.74, k = 1 + 0.07 * d * Math.sin(a * 7) + 0.04 * d * Math.sin(a * 13 + 1); P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k * 0.82); if (y < -0.7) P.setY(i, y + rnd() * 0.14 * (0.5 + 0.5 * Math.abs(Math.sin(a * 5)))); } Q.skirt.computeVertexNormals(); }
  Q.chest = new THREE.CylinderGeometry(0.24, 0.185, 0.54, 16); Q.chest.translate(0, 0.27, 0);
  Q.cape = new THREE.CylinderGeometry(0.17, 0.31, 0.3, 20, 2, true); Q.cape.translate(0, -0.15, 0);
  { const P = Q.cape.attributes.position, rnd = seeded(0x7ab); for (let i = 0; i < P.count; i++) if (P.getY(i) < -0.25) P.setY(i, P.getY(i) - rnd() * 0.08); Q.cape.computeVertexNormals(); }
  Q.lapel = new THREE.BoxGeometry(0.07, 0.3, 0.015);
  Q.collar = new THREE.CylinderGeometry(0.1, 0.12, 0.13, 12, 1, true);
  Q.head = new THREE.SphereGeometry(0.095, 14, 10);
  Q.beard = new THREE.ConeGeometry(0.08, 0.17, 10); Q.beard.rotateX(Math.PI);
  Q.crown = new THREE.CylinderGeometry(0.1, 0.115, 0.13, 14);
  Q.brim = new THREE.CylinderGeometry(0.25, 0.25, 0.012, 22);
  { const P = Q.brim.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z); if (r > 0.12) P.setY(i, P.getY(i) - (r - 0.12) * 0.55 * (0.7 + 0.3 * Math.cos(Math.atan2(z, x) * 2))); } Q.brim.computeVertexNormals(); }
  Q.up = new THREE.CylinderGeometry(0.062, 0.054, 0.3, 10); Q.up.translate(0, -0.15, 0);
  Q.fore = new THREE.CylinderGeometry(0.054, 0.048, 0.28, 10); Q.fore.translate(0, -0.14, 0);
  Q.cuff = new THREE.CylinderGeometry(0.064, 0.06, 0.07, 10);
  Q.hand = new THREE.SphereGeometry(0.04, 8, 6); Q.hand.scale(0.9, 1.2, 0.8);
  Q.thigh = new THREE.CylinderGeometry(0.06, 0.052, 0.42, 8); Q.thigh.translate(0, -0.21, 0);
  Q.shin = new THREE.CylinderGeometry(0.058, 0.05, 0.44, 8); Q.shin.translate(0, -0.22, 0);
  Q.foot = new THREE.BoxGeometry(0.1, 0.07, 0.2);
  Q.button = new THREE.SphereGeometry(0.014, 6, 4);
  Q.eye = new THREE.SphereGeometry(0.013, 6, 5);
  Q.pole = new THREE.CylinderGeometry(0.016, 0.016, 1.5, 6);
  Q.hook = new THREE.TorusGeometry(0.055, 0.011, 5, 12, Math.PI * 1.3);
  Q.spike = new THREE.ConeGeometry(0.014, 0.12, 6);
  Q.horn = new THREE.CylinderGeometry(0.1, 0.016, 0.46, 18, 3, true); Q.horn.translate(0, 0.23, 0);   // (narrow end at the origin, its bell out along +y)
  { const P = Q.horn.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i) / 0.46, k = 0.16 + 0.84 * Math.pow(y, 2.2); const r = Math.hypot(P.getX(i), P.getZ(i)) || 1, a = Math.atan2(P.getZ(i), P.getX(i)), rr = 0.016 + 0.084 * k; P.setX(i, Math.cos(a) * rr); P.setZ(i, Math.sin(a) * rr); } Q.horn.computeVertexNormals(); }
  Q.weed = new THREE.BoxGeometry(0.018, 0.3, 0.006); Q.weed.translate(0, -0.15, 0);
  Q.halo = z3Soft('rgba(150,230,210,0.8)', 'rgba(120,200,200,0)');
  Q.gold = z3Soft('rgba(255,220,140,0.9)', 'rgba(255,190,90,0)');
  Q.ok = true;
  return Q;
}
function gcBuildCrane() {
  const Q = gcCraneGeo(), root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(GCC.S);
  const coat = new THREE.MeshPhongMaterial({ color: 0x1c2224, specular: 0x5a7078, shininess: 55, side: THREE.DoubleSide });
  const coat2 = new THREE.MeshPhongMaterial({ color: 0x232a2a, specular: 0x4a6068, shininess: 45, side: THREE.DoubleSide });
  const skin = new THREE.MeshPhongMaterial({ color: 0x55625e, specular: 0x506060, shininess: 40 });
  const boot = new THREE.MeshPhongMaterial({ color: 0x0c0d0e, specular: 0x404850, shininess: 70 });
  const hatM = new THREE.MeshPhongMaterial({ color: 0x15181a, specular: 0x3a4850, shininess: 40, side: THREE.DoubleSide });
  const brass = new THREE.MeshPhongMaterial({ color: 0x6a6a3a, specular: 0xc8c090, shininess: 70, emissive: 0x0a0c04, side: THREE.DoubleSide });
  const verd = new THREE.MeshPhongMaterial({ color: 0x4a7a64, specular: 0x80a090, shininess: 30 });
  const wood = new THREE.MeshPhongMaterial({ color: 0x5a4a34, specular: 0x30302a, shininess: 25 });
  const iron = new THREE.MeshPhongMaterial({ color: 0x2a2826, specular: 0x605a50, shininess: 50 });
  const weedM = new THREE.MeshLambertMaterial({ color: 0x1a3a26, emissive: 0x031208, side: THREE.DoubleSide });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xb8ffe0 });
  const mesh = (geo, mat, x, y, z, parent) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, z || 0); parent.add(o); return o; };
  const weed = (parent, x, y, z, n, s) => { for (let i = 0; i < n; i++) { const w = mesh(Q.weed, weedM, x + (Math.random() - 0.5) * 0.08, y, z + (Math.random() - 0.5) * 0.05, parent); w.scale.y = (0.5 + Math.random() * 0.8) * (s || 1); w.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4); } };
  // hips, at 0.92 (his own height 1.86 before he's scaled)
  const hips = new THREE.Group(); hips.position.y = 0.92; body.add(hips);
  const legs = [-1, 1].map(s => {
    const th = new THREE.Group(); th.position.set(s * 0.085, 0, 0); hips.add(th);
    mesh(Q.thigh, coat2, 0, 0, 0, th);
    const kn = new THREE.Group(); kn.position.y = -0.42; th.add(kn);
    mesh(Q.shin, boot, 0, 0, 0, kn).scale.set(1.12, 1, 1.12);
    mesh(Q.foot, boot, 0, -0.45, -0.04, kn);
    return { th, kn };
  });
  // the coat's skirts, from the waist (they hang, and swing as he walks)
  const skirt = mesh(Q.skirt, coat, 0, 0.14, 0, hips);
  weed(skirt, 0.18, -0.55, 0.05, 3, 1.2); weed(skirt, -0.2, -0.5, -0.06, 2, 1.1); weed(skirt, 0.02, -0.58, 0.2, 2);
  const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso);
  mesh(Q.chest, coat, 0, 0, 0, torso).scale.set(1.05, 1, 0.74);
  for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) mesh(Q.button, verd, s * 0.075, 0.1 + i * 0.1, -0.165, torso); const lp = mesh(Q.lapel, coat2, s * 0.06, 0.4, -0.172, torso); lp.rotation.set(0.1, 0, s * 0.35); }
  const cape = mesh(Q.cape, coat2, 0, 0.6, 0.005, torso); cape.scale.set(1.08, 1, 0.8);
  mesh(Q.collar, coat2, 0, 0.62, 0.015, torso).scale.set(1.1, 1.3, 1);
  // barnacles on his shoulder, a little weed
  for (let i = 0; i < 5; i++) mesh(Q.button, verd, 0.16 + Math.random() * 0.06, 0.5, (Math.random() - 0.5) * 0.12, torso).scale.setScalar(1.6 + Math.random());
  weed(torso, -0.2, 0.46, 0.06, 3);
  const head = new THREE.Group(); head.position.set(0, 0.68, -0.01); torso.add(head);
  mesh(Q.head, skin, 0, 0, 0, head).scale.set(0.9, 1.12, 0.95);
  const beard = mesh(Q.beard, hatM, 0, -0.09, -0.05, head); beard.rotation.x = -0.35;
  weed(head, 0, -0.08, -0.07, 3, 0.5);
  const eyes = [-1, 1].map(s => mesh(Q.eye, eyeM, s * 0.033, 0.015, -0.085, head));
  const hat = new THREE.Group(); hat.position.set(0, 0.075, 0); hat.rotation.set(0.12, 0, 0.06); head.add(hat);
  mesh(Q.brim, hatM, 0, 0, 0, hat); mesh(Q.crown, hatM, 0, 0.065, 0, hat);
  mesh(new THREE.CylinderGeometry(0.117, 0.117, 0.025, 14, 1, true), coat2, 0, 0.012, 0, hat);
  weed(hat, 0.2, -0.04, 0.05, 2, 0.6);
  // arms: (the upper arm, the elbow, the forearm, the cuff and hand)
  const arm = s => {
    const sh = new THREE.Group(); sh.position.set(s * 0.25, 0.52, 0); torso.add(sh);
    mesh(Q.up, coat, 0, 0, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    mesh(Q.fore, coat, 0, 0, 0, el); mesh(Q.cuff, coat2, 0, -0.27, 0, el);
    const hd = new THREE.Group(); hd.position.y = -0.32; el.add(hd);
    mesh(Q.hand, skin, 0, 0, 0, hd);
    return { sh, el, hd };
  };
  const arms = [arm(1), arm(-1)];   // (his right, with the hook; his left, with the trumpet)
  // the boat hook, in his right fist: the pole along his forearm's line forward, the hook and spike at its head
  const hook = new THREE.Group(); arms[0].hd.add(hook); hook.rotation.set(-Math.PI / 2 + 0.2, 0, -0.28);
  mesh(Q.pole, wood, 0, 0.35, 0, hook);
  const head2 = new THREE.Group(); head2.position.y = 1.1; hook.add(head2);
  mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.1, 6), iron, 0, 0, 0, head2);
  const hk = mesh(Q.hook, iron, 0.045, 0.06, 0, head2); hk.rotation.z = -0.4;
  mesh(Q.spike, iron, 0, 0.1, 0, head2);
  weed(head2, 0.02, 0.02, 0, 2, 0.7);
  // the speaking trumpet, in his left: its bell out in front
  // (in his fist, hanging, when he isn't using it; at his mouth, held there, when he is)
  const mkHorn = () => { const h = new THREE.Group(); mesh(Q.horn, brass, 0, 0, 0, h); mesh(new THREE.TorusGeometry(0.1, 0.009, 5, 18), brass, 0, 0.46, 0, h).rotation.x = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.06, 6), brass, 0, -0.02, 0, h); return h; };
  const horn = mkHorn(); arms[1].hd.add(horn); horn.rotation.x = Math.PI; horn.position.y = 0.03;
  const horn2 = mkHorn(); head.add(horn2); horn2.rotation.x = -Math.PI / 2; horn2.position.set(0, -0.045, -0.09); horn2.visible = false;
  // the glows: pale sea-green about him in the dark, burnt gold in the light
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.position.y = 1.0; glow.scale.set(1.5, 2.3, 1); body.add(glow);
  const gold = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.gold, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 })); gold.position.y = 1.0; gold.scale.set(1.9, 2.6, 1); body.add(gold);
  const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); eyeGlow.position.set(0, 0.015, -0.12); eyeGlow.scale.setScalar(0.16); head.add(eyeGlow);
  return { root, body, hips, torso, head, hat, legs, skirt, arms, hook, horn, horn2, eyes, eyeM, coat, coat2, skin, glow, gold, eyeGlow, mats: [coat, coat2, skin, hatM, boot] };
}
// his pose: the walk, each of his blows, struck and staggered; and how he looks, lit or in the dark
function gcPoseCrane(z, M, dt) {
  const G0 = FPSC.GROUND, t = g.t, act = z.dead ? null : z.act, at = z.at || 0, sw = reduceMotion ? 0 : 1;
  M.root.position.copy(z3v(z.x, z.y, G0 + (z.jz || 0)));
  M.root.rotation.set(0, -z.h, 0);
  const moving = z.walk && !act && !z.dead;
  const mv = z.mvK = (z.mvK || 0) + ((moving ? 1 : 0) - (z.mvK || 0)) * Math.min(1, dt * 6);
  z.ph = (z.ph || 0) + dt * (moving ? 4.6 : 1);
  const st = Math.sin(z.ph) * mv;
  // legs: a long slow stride
  M.legs[0].th.rotation.x = st * 0.45; M.legs[1].th.rotation.x = -st * 0.45;
  M.legs[0].kn.rotation.x = -Math.max(0, -Math.cos(z.ph)) * 0.6 * mv; M.legs[1].kn.rotation.x = -Math.max(0, Math.cos(z.ph)) * 0.6 * mv;
  M.body.position.y = Math.abs(Math.cos(z.ph)) * 0.025 * mv;
  M.hips.rotation.set(0, st * 0.08, 0);
  M.skirt.rotation.set(-0.06 * mv + Math.sin(t * 1.7) * 0.03 * sw, 0, st * 0.05);
  M.torso.rotation.set(-0.04 + Math.sin(t * 0.8) * 0.02 * sw, -st * 0.12, 0);
  M.head.rotation.set(-0.1 + Math.sin(t * 0.6 + z.seed) * 0.04 * sw, Math.sin(t * 0.4) * 0.12 * sw, 0);
  // arms: [shoulder x (forward), shoulder z (out), elbow x (bend)], his right with the hook, his left with the trumpet
  let R = [0.35 - st * 0.2, 0.26, 0.9], L = [0.2 + st * 0.25, -0.16, 0.4];
  if (act === 'sweep') {
    const T = GC_ACT.sweep, k1 = zbE(Math.min(1, at / (T.hit - 0.1))), k2 = zbE(clamp((at - T.hit + 0.15) / 0.3, 0, 1)), k3 = zbE(clamp((at - T.hit - 0.2) / (T.end - T.hit - 0.2), 0, 1));
    // (wound back over his right shoulder, swept across in front of him, and back)
    R = [zbL(zbL(zbL(0.35, 1.9, k1), 1.3, k2), 0.35, k3), zbL(zbL(zbL(0.18, 1.2, k1), -0.9, k2), 0.18, k3), zbL(zbL(0.9, 0.4, k1), 0.9, k3)];
    M.torso.rotation.y += zbL(zbL(zbL(0, 0.7, k1), -0.6, k2), 0, k3);
  } else if (act === 'bellow' || act === 'call') {
    const T = GC_ACT[act], up = zbE(Math.min(1, at / 0.55)), down = at > T.hit ? zbE(Math.min(1, (at - T.hit) / (T.end - T.hit))) : 0, blast = at > T.hit && at < T.hit + 0.5 ? 1 - (at - T.hit) / 0.5 : 0;
    // (the trumpet up to his mouth, and (calling) up to the sky)
    const skyK = act === 'call' ? up : 0;
    L = [zbL(0.2, 1.5 + 0.7 * skyK, up), zbL(-0.12, 0.55 - 0.2 * skyK, up), zbL(0.5, 1.45 - 0.6 * skyK, up)];
    if (down) L = [zbL(L[0], 0.2, down), zbL(L[1], -0.12, down), zbL(L[2], 0.5, down)];
    M.torso.rotation.x += (act === 'bellow' ? -0.18 * up : 0.18 * up) - blast * (act === 'bellow' ? 0.22 : -0.1);
    M.head.rotation.x = zbL(-0.1, act === 'call' ? 0.7 : 0, up * (1 - down));
    R = [0.5, 0.3, 0.7];
  } else if (act === 'stagger') {
    const k = Math.min(1, at / 0.4), back = Math.sin(Math.min(1, at / GC_ACT.stagger.end) * Math.PI);
    M.torso.rotation.x = 0.08 + 0.35 * back + Math.sin(at * 7) * 0.05; M.torso.rotation.z = Math.sin(at * 3.1) * 0.15 * back;
    M.head.rotation.x = 0.5 * back; R = [0.6, 0.7 * k, 0.6]; L = [1.2 * k, -0.6 * k, 1.9 * k];   // (his left hand to his head)
  } else if (act === 'hoist') {
    // (hand over hand on the halyard: each arm up and down in turn)
    const c = at * 3.4, a = Math.sin(c), b = Math.sin(c + Math.PI);
    R = [2.3 + 0.6 * a, 0.25, 0.4 + 0.5 * a]; L = [2.3 + 0.6 * b, -0.25, 0.4 + 0.5 * b];
    M.torso.rotation.x = -0.15 + 0.08 * Math.sin(c * 2); M.head.rotation.x = 0.35;
  } else if (act === 'rise') {
    R = [0.1, 0.25, 0.3]; L = [0.1, -0.25, 0.3]; M.head.rotation.x = -0.45 * (1 - Math.min(1, at / 3));
  }
  { const at2 = (act === 'bellow' || act === 'call') && at > 0.3 && at < GC_ACT[act].end - 0.25; M.horn.visible = !at2; M.horn2.visible = at2; }
  M.arms[0].sh.rotation.set(R[0], 0, R[1]); M.arms[0].el.rotation.set(R[2], 0, 0);
  M.arms[1].sh.rotation.set(L[0], 0, L[1]); M.arms[1].el.rotation.set(L[2], 0, 0);
  // lit or in the dark: his coat flushed burnt gold and a warm glow about him; a cold one in the dark (and a pale
  // flash where a shot glances off him)
  const lk = GCW.litK || 0, flash = z.hitT > 0 ? Math.min(1, z.hitT / 0.15) : 0, ward = z.ward > 0 ? z.ward / 0.35 : 0, pulse = 0.5 + 0.5 * Math.sin(t * (lk > 0.5 ? 9 : 2.2));
  if (z.ward > 0) z.ward -= dt;
  M.coat.emissive.setRGB(0.15 * lk * (0.8 + 0.2 * pulse) + flash * 0.3, 0.08 * lk + flash * 0.22 + ward * 0.06, 0.02 * lk + flash * 0.2 + ward * 0.14 + 0.012);
  M.coat2.emissive.copy(M.coat.emissive).multiplyScalar(0.8);
  M.skin.emissive.setRGB(0.1 * lk + 0.02, 0.06 * lk + 0.05, 0.03 * lk + 0.05);
  M.glow.material.opacity = z.dead ? 0 : (1 - lk) * (0.3 + 0.12 * pulse) + ward * 0.5;
  M.gold.material.opacity = z.dead ? 0 : lk * (0.5 + 0.25 * pulse);
  M.eyeM.color.setRGB(0.7 + 0.3 * lk, 1, 0.88 - 0.3 * lk); M.eyeGlow.material.opacity = z.dead ? 0 : 0.9;
  // the sea running off him: drips from his hat's brim, his cuffs and the hem of his coat
  if (!z.dead && Math.random() < dt * (act === 'rise' ? 50 : 14)) {
    const a = Math.random() * 6.283, hz = Math.random() < 0.4 ? 3.95 : Math.random() < 0.5 ? 0.95 : 2.1, r = hz > 3 ? 0.5 : hz < 1.5 ? 0.6 : 0.55;
    FPS.parts.push({ x: z.x + Math.cos(a) * r, y: z.y + Math.sin(a) * r, z: G0 + (z.jz || 0) + hz, vx: 0, vy: 0, vz: -0.5, t: 0.55, c: '150,190,200' });
  }
  if (z.dead) {
    // down: to his knees, over onto the deck, and through it, the sea taking him back
    const k = Math.min(1, (z.deadT || 0) / 3.4), k1 = zbE(Math.min(1, k * 2)), k2 = zbE(clamp((k - 0.4) / 0.6, 0, 1));
    M.legs[0].th.rotation.x = M.legs[1].th.rotation.x = -1.3 * k1; M.legs[0].kn.rotation.x = M.legs[1].kn.rotation.x = 1.8 * k1;
    M.body.position.y = -0.38 * k1;
    M.root.rotation.set(-1.25 * k2, -z.h, 0, 'YXZ');
    M.root.position.y -= k2 * k2 * 2.2;
    if (Math.random() < dt * 20 && k < 1) fpsPuff(z.x + (Math.random() - 0.5) * 2, z.y + (Math.random() - 0.5) * 2, G0 + (z.jz || 0) + Math.random() * 2, '150,200,205', 2);
    M.root.visible = k < 1;
  }
}

// ---------- on top: what's to be done; the light on him; the lockers and the bell; the token ----------
function gcHud(phone, mono, fell) {
  if (!GCW.on) return;
  const t = g.t, m = FPS.me, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 46), dy = phone ? 14 : 17;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const line = (s, y, c, f) => { ctx.font = f || mono(phone ? 10 : 12); ctx.fillStyle = c; ctx.fillText(s, L, y, W * 0.5); fpsHudNote(y + (f ? (phone ? 20 : 26) : dy)); };
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
  const M = gcCrane();
  let y = top;
  if (GCW.st === 'intro') line('Something moves under the deck, aft', y, 'rgba(180,220,210,0.9)', fell(phone ? 15 : 20));
  else if (GCW.st === 'fight' && M && !M.dead) {
    if (M.act === 'rise') line('Captain Absalom Crane', y, 'rgba(200,230,215,0.95)', fell(phone ? 15 : 20));
    else if (M.act === 'hoist') line('He hauls up the black sail', y, 'rgba(160,190,210,0.95)', fell(phone ? 15 : 20));
    else if (GCW.lit) line(gcFlares() ? 'The flare lights him: shoot!' : 'The beam is on him: shoot!', y, `rgba(255,214,120,${0.8 + 0.2 * Math.sin(t * 9)})`, fell(phone ? 15 : 20));
    else line('He’s in the dark: no shot touches him', y, 'rgba(160,190,205,0.9)', fell(phone ? 15 : 20));
    y += phone ? 20 : 26;
    if (!GCW.p2) line(GCW.lit && !gcFlares() ? 'The Light’s beam is crossing the deck' : `The Light’s beam comes round in ${gcBeamIn().toFixed(1)} s`, y, 'rgba(236,228,207,0.7)');
    else line('The black sail is up: only a flare will light him', y, 'rgba(170,200,220,0.8)');
    y += dy;
    GC_LOCK.forEach(([, , side], i) => {
      const f = GCW.fl[i], s = gcFlareOn(i) ? `burning, ${Math.ceil(f.t)} s` : f.t > GCC.FLARE ? 'going up' : f.cd > 0 ? `reloading, ${Math.ceil(f.cd)} s` : 'ready';
      line(`${f.cd > 0 ? '◦' : '•'} Flare locker, ${side}: ${s}`, y, f.cd > 0 ? 'rgba(236,228,207,0.45)' : 'rgba(255,170,150,0.9)'); y += dy;
    });
    line(`${GCW.bell > 0 ? '◦' : '•'} The ship’s bell: ${GCW.bell > 0 ? Math.ceil(GCW.bell) + ' s' : 'ready'}`, y, GCW.bell > 0 ? 'rgba(236,228,207,0.45)' : 'rgba(230,210,150,0.9)'); y += dy;
    if (GCW.p2) { line(`She’s foundering: ${Math.round(GCW.fd * 100)}%`, y, 'rgba(140,200,220,0.8)'); y += dy; }
  } else if (GCW.st === 'won') line(GCW.mine ? 'Captain Crane is gone down with his ship.' : 'Captain Crane is down. Take his token, where he fell.', y, 'rgba(255,214,140,0.95)', fell(phone ? 15 : 20));
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  // in the middle: a shot that glanced off him in the dark; and his bellow coming, if I'm in its way
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (GCW.dark > 0) {
    const a = Math.min(1, GCW.dark / 0.4);
    ctx.font = fell(phone ? 17 : 24); ctx.fillStyle = `rgba(190,220,240,${0.9 * a})`; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8;
    ctx.fillText(GCW.darkWhy === 'hoist' ? 'Nothing touches him while he hoists the sail' : GCW.darkWhy === 'rise' ? 'Not yet: he’s still rising' : 'He’s in the dark: your shots glance off', cx, H * 0.6, W * 0.9);
    ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = `rgba(236,228,207,${0.75 * a})`;
    if (GCW.darkWhy === 'dark') ctx.fillText(GCW.p2 ? 'Fire a flare from a locker to light him' : 'Wait for the Light’s beam, or fire a flare', cx, H * 0.6 + (phone ? 18 : 24), W * 0.9);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
  if (M && !M.dead && M.act === 'bellow' && (M.at || 0) < GC_ACT.bellow.hit && gcInCone(M, m.x, m.y) && !(m.dead > 0)) {
    ctx.font = `400 ${phone ? 16 : 24}px "IM Fell English SC", serif`; ctx.fillStyle = `rgba(255,214,150,${0.7 + 0.3 * Math.sin(t * 14)})`; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8;
    ctx.fillText('The speaking trumpet: get out of its line', cx, H * (phone ? 0.42 : 0.4));
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
  // lit: a gold edge round the screen, faint, while the light's on him
  if (GCW.litK > 0.02 && GCW.st === 'fight') {
    const a = GCW.litK * 0.22, gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.45, cx, H / 2, Math.max(W, H) * 0.75);
    gr.addColorStop(0, 'rgba(255,200,100,0)'); gr.addColorStop(1, `rgba(255,200,100,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  // the token, taken: a gold coin, and what it is
  if (GCW.grab > 0) {
    const a = Math.min(1, GCW.grab, 6 - GCW.grab), r = phone ? 34 : 48, yy = H * 0.36;
    ctx.globalAlpha = a;
    const gr = ctx.createRadialGradient(cx - r * 0.3, yy - r * 0.3, r * 0.1, cx, yy, r);
    gr.addColorStop(0, '#ffeaa0'); gr.addColorStop(0.6, '#d0a040'); gr.addColorStop(1, '#7a5a1a');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, yy, r, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#6a4a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, yy, r * 0.8, 0, 6.2832); ctx.stroke();
    // (on its face, a ship's bell)
    ctx.fillStyle = '#5a3c10'; ctx.beginPath(); ctx.moveTo(cx - r * 0.32, yy + r * 0.3); ctx.quadraticCurveTo(cx - r * 0.3, yy - r * 0.38, cx, yy - r * 0.4); ctx.quadraticCurveTo(cx + r * 0.3, yy - r * 0.38, cx + r * 0.32, yy + r * 0.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, yy + r * 0.38, r * 0.08, 0, 6.2832); ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffe2a0'; ctx.font = fell(phone ? 18 : 26); ctx.fillText('The Captain’s Doubloon', cx, yy + r + (phone ? 20 : 30));
    ctx.fillStyle = 'rgba(236,228,207,0.9)'; ctx.font = mono(phone ? 10 : 13);
    const n = typeof ptTokens === 'function' ? ptTokens() : 1;
    ctx.fillText(`A pirate token: yours to keep (${n} to spend on the Keeper’s Last Light card)`, cx, yy + r + (phone ? 40 : 58), W * 0.9);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
  }
  if (GCW.hintT > 0 && GCW.st !== 'won') {
    ctx.font = fell(phone ? 15 : 20); ctx.fillStyle = `rgba(236,228,207,${Math.min(1, GCW.hintT) * 0.85})`; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
    ctx.fillText('Only light hurts him: the Light’s beam as it crosses the deck, or a flare from a locker. The bell staggers him.', cx, H * 0.74, W * 0.9);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// =====================================================================================================================
// in 3D: her hull and the sea round her, the Light and its beam, the flares, the bell, the black sail, the water in
// her waist, the trumpet's cone, the token
// =====================================================================================================================
const GC3 = { on: false };
function gc3dBuild(grp) {
  GC3.on = false;
  if (!GCW.on) return;
  const G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, SEA = G0 - GCC.FB;
  const soft = (c0, c1, o) => new THREE.SpriteMaterial(Object.assign({ map: z3Soft(c0, c1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }, o || {}));
  // (the world outside her: tilted as she lists, about her keel)
  const out = GC3.out = new THREE.Group(); out.position.copy(z3v(CX, CY, G0)); grp.add(out);
  const at = (o, x, y, z) => { o.position.set(x, z, -y); out.add(o); return o; };
  // ---- the sea: one great sheet, a little under her deck, its ripples in the light ----
  GC3.t = { value: 0 };
  {
    const geo = new THREE.PlaneGeometry(9000, 9000, 1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ color: 0x041018, specular: 0x8a9aa8, shininess: 70, emissive: 0x010408 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = GC3.t;
      sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform float uT;\nvarying vec3 vWp;\n' + sh.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  { vec2 p = vWp.xz * 0.6;
    vec2 gr = 0.07 * cos(dot(p, vec2(1.3, 0.9)) + uT * 1.5) * vec2(1.3, 0.9) + 0.06 * cos(dot(p, vec2(-0.8, 1.7)) + uT * 1.9) * vec2(-0.8, 1.7)
            + 0.035 * cos(dot(p, vec2(2.9, -1.4)) - uT * 2.6) * vec2(2.9, -1.4) + 0.025 * cos(dot(p, vec2(-4.1, -2.6)) + uT * 3.2) * vec2(-4.1, -2.6)
            + 0.05 * cos(dot(p * 0.2, vec2(0.7, 0.4)) + uT * 0.6) * vec2(0.14, 0.08);
    normal = normalize((viewMatrix * vec4(normalize(vec3(-gr.x, 1.0, -gr.y)), 0.0)).xyz); }`);
    };
    const sea = new THREE.Mesh(geo, mat); sea.renderOrder = 0; at(sea, 0, 0, -GCC.FB); GC3.sea = sea;
  }
  // ---- her hull: from the rail down into the sea, black, a pale strake with painted ports, copper below ----
  {
    const pos = [], col = [], idx = [], N = 96, PR = [[1.12, 1.0], [0.6, 1.0], [0.25, 0.995], [-0.25, 0.99], [-0.9, 0.975], [-GCC.FB + 0.35, 0.94], [-GCC.FB - 0.3, 0.9], [-GCC.FB - 1.6, 0.7], [-GCC.FB - 2.8, 0.25]];
    const black = new THREE.Color('#0e0f10'), ochre = new THREE.Color('#6a6048'), port = new THREE.Color('#0a0a0a'), copper = new THREE.Color('#1e3a30'), tmp = new THREE.Color();
    for (const s of [-1, 1]) {
      const b0 = pos.length / 3;
      for (let i = 0; i <= N; i++) {
        const y = GCC.STERN + (GCC.BOW + 0.9 - GCC.STERN) * i / N, hw = gcHalfW(y), dz = gcDeckZ(y) * (y < GCC.QY ? 1 : y > GCC.FY ? 1 : 0), sheer = 0.25 * Math.pow(Math.abs(y) / 24, 2);
        PR.forEach(([zz, k], j) => {
          const z = zz + (j < 2 ? dz + sheer : j < 4 ? sheer * 0.5 : 0);
          pos.push(s * hw * k, z, -y);
          const strake = zz < 0.4 && zz > -0.3, portOn = strake && ((y + 30) % 3.2 < 0.9) && y > -20 && y < 18;
          tmp.copy(zz <= -GCC.FB + 0.2 ? copper : strake ? (portOn ? port : ochre) : black); const n = 0.9 + 0.2 * fpiHash(i * 31 + j, 7);
          col.push(tmp.r * n, tmp.g * n, tmp.b * n);
        });
      }
      const P = PR.length;
      for (let i = 0; i < N; i++) for (let j = 0; j < P - 1; j++) { const a = b0 + i * P + j, b = a + P, c = a + 1, d = b + 1; if (s > 0) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, c, d, b); }
    }
    // (the transom across her stern, and her name on it)
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const hull = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 30, specular: 0x30383a, side: THREE.DoubleSide }));
    hull.position.copy(z3v(CX, CY, G0)); grp.add(hull);
    const tw = gcHalfW(GCC.STERN) * 2, tr = new THREE.Mesh(new THREE.PlaneGeometry(tw * 0.97, GCC.FB + GCC.QD + 1.3), new THREE.MeshPhongMaterial({ color: 0x101214, side: THREE.DoubleSide }));
    tr.position.copy(z3v(CX, CY + GCC.STERN - 0.02, G0 + (GCC.QD + 1.1 - GCC.FB) / 2)); grp.add(tr);
    // (GANNET in faded gilt letters, painted on a canvas)
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 512, 96); x.font = 'bold 64px "IM Fell English SC", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(190,160,90,0.75)'; x.fillText('G A N N E T', 256, 50);
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    nm.position.copy(z3v(CX, CY + GCC.STERN - 0.06, G0 + 0.35)); grp.add(nm);
    // (the bowsprit and jib boom, out over the sea forward, and the stays to them)
    const spar = z3Lam('#2e241a'), bs = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 12, 8), spar);
    bs.position.copy(z3v(CX, CY + GCC.BOW + 4.6, G0 + GCC.FC + 1.4)); bs.rotation.x = -Math.PI / 2 + 0.2; grp.add(bs);
    // (the foam where she lies in the water, round her)
    const fp = [], fi = [];
    for (let i = 0; i <= N; i++) { const y = GCC.STERN - 0.5 + (GCC.BOW + 1.5 - GCC.STERN) * i / N, hw = gcHalfW(Math.min(y, GCC.BOW + 0.9)) * 0.94; for (const s of [-1, 1]) for (const r of [0, 1.1]) fp.push(s * (hw + r), 0.02, -y); }
    for (let i = 0; i < N; i++) for (let s = 0; s < 2; s++) { const a = i * 4 + s * 2, b = a + 4; fi.push(a, b, a + 1, a + 1, b, b + 1); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi);
    const foamM = GC3.foamM = new THREE.MeshBasicMaterial({ color: 0x8a9ca4, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    at(new THREE.Mesh(fg, foamM), 0, 0, -GCC.FB + 0.03);
  }
  // ---- out on the water: the skerries, black rocks with the swell breaking white on them, and old spars ----
  {
    const rk = new THREE.MeshLambertMaterial({ color: 0x0c0e10 }), r = seeded(0x6a77f);
    for (let i = 0; i < 11; i++) {
      const a = r() * 6.283, d = 70 + r() * 220, x = Math.cos(a) * d, y = Math.sin(a) * d; if (Math.hypot(x - GCC.LX, y - GCC.LY) < 40) continue;
      const g2 = new THREE.Group();
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + r() * 4, 0), rk); m.position.set((r() - 0.5) * 6, -1 + r() * 1.5, (r() - 0.5) * 6); m.scale.y = 0.5 + r() * 0.7; m.rotation.set(r() * 3, r() * 3, r() * 3); g2.add(m); }
      const f = new THREE.Sprite(soft('rgba(180,200,210,0.35)', 'rgba(180,200,210,0)')); f.scale.set(16, 3, 1); f.position.y = 0.3; g2.add(f);
      at(g2, x, y, -GCC.FB);
    }
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 4 + r() * 6, 6), z3Lam('#2a2016')); m.rotation.set(Math.PI / 2, r() * 3, 0.1); const a = r() * 6.283, d = 14 + r() * 30; at(m, Math.cos(a) * d, Math.sin(a) * d, -GCC.FB + 0.05); }
  }
  // ---- Skerry Light, on its rock to the west: the tower, the lantern lit, its beam turning ----
  {
    const g2 = new THREE.Group(), M = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k == null ? 0.3 : k), fog: false });
    const H = 34, R = 4.2, T = H + 1, RT = R * 0.72, add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g2.add(m); return m; };
    add(new THREE.CylinderGeometry(R * 3.4, R * 5, 4, 10), M('#2a2c30', 0.32), -1);
    add(new THREE.CylinderGeometry(R * 0.72, R, H, 20), M('#e8e4d8', 0.26), H / 2 + 1);
    for (const y of [H * 0.32, H * 0.62]) add(new THREE.CylinderGeometry(R * (1 - y / H * 0.28) + 0.03, R * (1 - (y - 3) / H * 0.28) + 0.03, 3, 20), M('#b03028', 0.26), y + 1);
    add(new THREE.CylinderGeometry(RT + 1.1, RT + 0.6, 0.6, 20), M('#202224', 0.6), T + 0.3);
    add(new THREE.CylinderGeometry(RT * 0.78, RT * 0.78, 3.4, 16), new THREE.MeshBasicMaterial({ color: 0xffe2a0, fog: false }), T + 2.3);
    add(new THREE.ConeGeometry(RT * 0.95, 2.2, 16), M('#902a24', 0.28), T + 5.1);
    const halo = z3Soft('rgba(255,236,180,0.95)', 'rgba(255,220,150,0)');
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.scale.setScalar(16); glow.position.y = T + 2.3; g2.add(glow);
    const flare = GC3.lflare = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 })); flare.scale.setScalar(90); flare.position.y = T + 2.3; g2.add(flare);
    // the beam: a broad soft fan of light from the lamp out over the water (and its bright core)
    const fade = z3Fade([[0, 'rgba(255,236,180,0.42)'], [0.4, 'rgba(255,226,160,0.12)'], [1, 'rgba(255,220,150,0)']]);
    const geo = new THREE.CylinderGeometry(1, 0.05, 1, 32, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(-Math.PI / 2);
    const beam = GC3.beam = new THREE.Group(); beam.position.y = T + 2.3; g2.add(beam);
    const bm = GC3.beamM = new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
    { const b = new THREE.Mesh(geo, bm); b.scale.set(95, 10, 420); b.frustumCulled = false; b.renderOrder = 9; beam.add(b); }
    { const b = new THREE.Mesh(geo, bm); b.scale.set(26, 5, 400); b.frustumCulled = false; b.renderOrder = 9; beam.add(b); }
    at(g2, GCC.LX, GCC.LY, -GCC.FB);
    // its light on her deck as the beam crosses: from the lamp, aimed at her
    const sp = GC3.spot = new THREE.SpotLight(0xffe6b0, 0, 0, 0.16, 0.5, 0); sp.position.set(GCC.LX, T + 2.3 - GCC.FB, -GCC.LY); out.add(sp);
    sp.target.position.set(0, 2, 0); out.add(sp.target);
  }
  // ---- the flares: each a hot pink-white core, a haze, and its light on everything ----
  GC3.fl = GC_LOCK.map(() => {
    const g2 = new THREE.Group(); g2.visible = false; grp.add(g2);
    const core = new THREE.Sprite(soft('rgba(255,250,245,1)', 'rgba(255,160,150,0)')); core.scale.setScalar(2.2); g2.add(core);
    const haze = new THREE.Sprite(soft('rgba(255,140,120,0.5)', 'rgba(255,110,90,0)')); haze.scale.setScalar(26); g2.add(haze);
    const L = new THREE.PointLight(0xffc8b8, 0, 95, 1.1); grp.add(L);
    return { g: g2, core, haze, L };
  });
  // ---- the flare lockers' lamps: a red glow when one's ready ----
  GC3.lk = GC_LOCK.map(([x, y]) => { const s = new THREE.Sprite(soft('rgba(255,90,70,0.9)', 'rgba(255,60,40,0)')); s.scale.setScalar(0.5); s.position.copy(z3v(CX + x * 0.98, CY + y + (x < 0 ? -0.3 : 0.3), G0 + 1.05)); grp.add(s); return s; });
  // ---- the bell, in its belfry: brass, swinging when it's rung ----
  {
    const bell = GC3.bell = new THREE.Group(); bell.position.copy(z3v(CX + GC_BELL[0], CY + GC_BELL[1] + 0.25, G0 + GCC.FC + 2.2)); grp.add(bell);
    const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(new THREE.Vector2(0.06 + 0.2 * Math.pow(k, 1.6) + (k > 0.9 ? 0.03 : 0), -k * 0.52)); }
    const bm = new THREE.MeshPhongMaterial({ color: 0x8a7440, specular: 0xf0d8a0, shininess: 80, emissive: 0x100c04, side: THREE.DoubleSide });
    const b = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), bm); bell.add(b);
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), z3Lam('#2a2826')); cl.position.y = -0.48; bell.add(cl);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 5), z3Lam('#8a7a5a')); rope.position.set(0, -0.9, 0); bell.add(rope);
    GC3.bellM = bm;
  }
  // ---- the black sail: up the port side from the rail, between her masts, ragged (hoisted at half his strength) ----
  {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#0a0a0b'; x.fillRect(0, 0, 256, 256);
    const r = seeded(0xb1ac);
    for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(${26 + r() * 10},${24 + r() * 8},${22 + r() * 6},0.5)`; x.fillRect(i * 32 + r() * 4, 0, 30, 256); }
    for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(48,42,34,0.7)'; x.fillRect(i * 32, 0, 2, 256); }
    for (let i = 0; i < 20; i++) { x.fillStyle = 'rgba(70,74,60,0.35)'; x.fillRect(r() * 256, r() * 256, 10 + r() * 30, 4 + r() * 10); }   // (salt and weed stains)
    // (tears and holes, and a ragged foot)
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) { x.beginPath(); const cx2 = r() * 256, cy2 = 40 + r() * 170; x.moveTo(cx2, cy2); for (let k = 0; k < 6; k++) x.lineTo(cx2 + (r() - 0.5) * 12, cy2 + (r() - 0.3) * 16); x.closePath(); x.fill(); }
    for (let u = 0; u < 256; u += 4) x.fillRect(u, 250 - r() * 14, 4, 20);
    const tex = new THREE.CanvasTexture(c);
    const geo = GC3.sailGeo = new THREE.PlaneGeometry(22, 16.5, 16, 10); geo.translate(0, 16.5 / 2, 0); GC3.sail0 = geo.attributes.position.array.slice();
    const sm = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, color: 0x9a9a9a });
    const sail = GC3.sail = new THREE.Mesh(geo, sm); sail.rotation.y = Math.PI / 2; sail.position.copy(z3v(CX - 5.55, CY + 3.5, G0 + 1.25)); sail.visible = false; grp.add(sail);
    const yard = GC3.yard = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 23, 8), z3Lam('#1e1812')); yard.rotation.x = Math.PI / 2; grp.add(yard);
  }
  // ---- the water in her waist, as she founders ----
  {
    const geo = new THREE.PlaneGeometry(10.4, GCC.FY - GCC.QY, 1, 1); geo.rotateX(-Math.PI / 2);
    const wm = new THREE.MeshPhongMaterial({ color: 0x06121a, specular: 0x6a8090, shininess: 90, transparent: true, opacity: 0.7, depthWrite: false });
    wm.onBeforeCompile = GC3.sea.material.onBeforeCompile;
    const w = GC3.water = new THREE.Mesh(geo, wm); w.visible = false; w.renderOrder = 2; grp.add(w);
  }
  // ---- his bellow's cone on the deck, while he draws breath ----
  {
    const geo = new THREE.CircleGeometry(GCC.BELLOW_R, 24, Math.PI / 2 - GCC.BELLOW_A, GCC.BELLOW_A * 2); geo.rotateX(-Math.PI / 2);
    const m = GC3.coneM = new THREE.MeshBasicMaterial({ color: 0xffd090, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    GC3.cone = new THREE.Mesh(geo, m); GC3.cone.visible = false; GC3.cone.renderOrder = 3; grp.add(GC3.cone);
  }
  // ---- the token: a gold coin on its edge, turning, a glow under it ----
  {
    const tok = GC3.tok = new THREE.Group(); grp.add(tok); tok.visible = false;
    const gold = new THREE.MeshPhongMaterial({ color: 0xd8a840, emissive: 0x4a3008, specular: 0xffe0a0, shininess: 70 });
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 28), gold); coin.rotation.x = Math.PI / 2; tok.add(coin);
    for (const s of [-1, 1]) { const face = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 6, 24), gold); face.position.z = s * 0.032; tok.add(face); const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshPhongMaterial({ color: 0xa88030, emissive: 0x2a1a04 })); b.position.set(0, 0.06, s * 0.03); b.scale.set(1, 1.3, 0.35); tok.add(b); }
    const tg = new THREE.Sprite(soft('rgba(255,220,120,0.9)', 'rgba(255,200,80,0)')); tg.scale.setScalar(2.2); tok.add(tg);
    const tl = GC3.tokL = new THREE.PointLight(0xffd890, 0, 7, 1.5); tok.add(tl);
  }
  // ---- a little haze of sea-mist low over her deck ----
  GC3.mist = [];
  for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(soft('rgba(120,140,150,0.10)', 'rgba(120,140,150,0)', { blending: THREE.NormalBlending, fog: true })); s.scale.set(14, 3, 1); s.position.copy(z3v(CX + (Math.random() - 0.5) * 30, CY - 30 + i * 9, G0 - 1)); grp.add(s); GC3.mist.push(s); }
  GC3.on = true;
}
function gc3d(dt) {
  if (!GCW.on || !GC3.on) return;
  const t = g.t, G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, m = FPS.me;
  // (her own sea instead of the usual, and the island's ground hidden under her)
  if (GL3D.sea && GL3D.sea.visible) GL3D.sea.visible = false;
  if (GL3D.island) for (const c of GL3D.island.children.slice(0, 2)) if (c.visible && c.isMesh) { c.visible = false; c.userData.gcHid = true; }
  GC3.t.value = reduceMotion ? 0 : t;
  // her list: the world outside her leans as she goes over to starboard
  const list = gcList(); GC3.out.rotation.z = list;
  // the beam: turned with the shared clock; its light on the deck as it crosses (none once the sail's up)
  GC3.beam.rotation.y = -gwBeam();
  const bk = gcBeamK(), lt = GCW.p2 ? 0 : bk;
  GC3.spot.intensity = lt * 3.2;
  { const toMe = bearingOf(m.x - CX - GCC.LX, m.y - CY - GCC.LY), off = Math.abs(angDiff(gwBeam(), toMe)); GC3.lflare.material.opacity = clamp(1 - off / 0.35, 0, 1) * (GCW.p2 && Math.abs(angDiff(bearingOf(GCC.LX, GCC.LY), bearingOf(GCC.LX - (m.x - CX), GCC.LY - (m.y - CY)))) < 1 && GCW.sail > 0.9 ? 0.15 : 0.95); }
  // the night: very dark; brighter while the beam's across her or a flare burns
  const flK = GCW.fl.reduce((a, f, i) => Math.max(a, gcFlareOn(i) ? clamp(Math.min(f.t, GCC.FLARE - f.t + 0.4) / 0.6, 0, 1) : 0), 0);
  GL3D.amb.intensity = 0.2 + 0.18 * lt + 0.12 * flK; GL3D.moon.intensity = 0.08;
  if (GL3D.scene.fog) { const F = GL3D.scene.fog, k = Math.max(lt * 0.6, flK * 0.5); F.color.setRGB(0.016 + 0.05 * k, 0.022 + 0.04 * k, 0.034 + 0.03 * k); F.near = 30; F.far = 520 + 200 * k; RAID.fog0 = true; }
  GC3.foamM.opacity = 0.1 + 0.05 * Math.sin(t * 1.3) + 0.1 * lt;
  // the flares: up from the locker, then hanging and drifting down as they burn
  GC_LOCK.forEach(([x, y], i) => {
    const f = GCW.fl[i], F = GC3.fl[i], up = f.t > GCC.FLARE, on = f.t > 0;
    F.g.visible = on; F.L.intensity = 0;
    if (on) {
      const k = up ? 1 - (f.t - GCC.FLARE) / GCC.FLARE_UP : (GCC.FLARE - f.t) / GCC.FLARE;   // (climbing: 0 to 1; burning: 0 to 1)
      const dx = Math.cos(f.drift) * 4, dy = Math.sin(f.drift) * 4;
      let px, py, pz;
      if (up) { px = x * (1 - 0.6 * k); py = y; pz = 1.2 + (GCC.FLARE_Z - 1.2) * zbE(k); if (Math.random() < dt * 40) fpsPuff(CX + px, CY + py, G0 + pz - 0.5, '200,170,160', 1); }
      else { px = x * 0.4 + dx * k + Math.sin(t * 1.3 + i) * 0.6; py = y + dy * k; pz = GCC.FLARE_Z - 12 * k; }
      const p = z3v(CX + px, CY + py, G0 + pz); F.g.position.copy(p); F.L.position.copy(p);
      const fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 31 + i) * Math.sin(t * 13);
      const burn = up ? 0.25 : clamp(Math.min(f.t, 0.6) / 0.6, 0, 1);
      F.core.scale.setScalar((up ? 0.8 : 2.4) * fl); F.haze.material.opacity = 0.6 * burn * fl; F.L.intensity = (up ? 0.4 : 2.6) * burn * fl;
      if (!up && Math.random() < dt * 8) FPS.parts.push({ x: CX + px, y: CY + py, z: G0 + pz, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), vz: -2, t: 0.6, c: '255,200,180' });
    }
    GC3.lk[i].material.opacity = f.cd > 0 ? 0.08 : 0.6 + 0.4 * Math.sin(t * 3 + i);
  });
  // the bell: swinging when it's rung
  if (GCW.bellSw > 0) GCW.bellSw = Math.max(0, GCW.bellSw - dt * 0.35);
  GC3.bell.rotation.x = Math.sin(t * 7.5) * 0.55 * GCW.bellSw;
  GC3.bellM.emissive.setRGB(0.06 + 0.1 * lt + 0.08 * flK, 0.045 + 0.08 * lt, 0.015);
  // the black sail: up as he hauls it, billowing a little
  { const k = clamp(GCW.sail || 0, 0, 1); GC3.sail.visible = k > 0.01; GC3.yard.visible = k > 0.01;
    if (k > 0.01) {
      GC3.sail.scale.set(1, Math.max(0.02, k), 1);
      const P = GC3.sailGeo.attributes.position, A0 = GC3.sail0;
      for (let i = 0; i < P.count; i++) { const u = A0[i * 3], v = A0[i * 3 + 1], e = Math.sin(clamp(v / 16.5, 0, 1) * Math.PI) * (0.6 + 0.4 * Math.sin(t * 0.9 + u * 0.3)) * (1 - Math.abs(u) / 13); P.setZ(i, -e * 1.4); }
      P.needsUpdate = true;
      GC3.yard.position.copy(z3v(CX - 5.55 + 0.0, CY + 3.5, G0 + 1.25 + 16.5 * k));
    } }
  // the water in her waist: lying level as she lists, so deeper to starboard
  { const fd = GCW.fd || 0, w = GC3.water; w.visible = fd > 0.02;
    if (w.visible) { w.position.copy(z3v(CX, CY, G0 + fd * GCC.WATER - 0.25)); w.rotation.set(0, 0, list); }
    // (and the sea comes over her rail in sheets, to starboard)
    if (fd > 0.15 && Math.random() < dt * 6 * fd) { const y = GCC.QY + Math.random() * (GCC.FY - GCC.QY), x = gcHalfW(y) - 0.3; for (let k = 0; k < 4; k++) FPS.parts.push({ x: CX + x + 0.3, y: CY + y + (Math.random() - 0.5), z: G0 + 1.15, vx: -1.5 - Math.random() * 2, vy: (Math.random() - 0.5), vz: 0.5 + Math.random(), t: 0.6, c: '160,200,210' }); }
  }
  // his bellow's cone: the deck in front of him glowing while he draws breath (and the trumpet's blast)
  { const M = gcCrane(), c = GC3.cone; let show = false;
    if (M && !M.dead && M.act === 'bellow') { const at = M.at || 0, T = GC_ACT.bellow; if (at < T.hit + 0.25) { show = true; const k = clamp(at / T.hit, 0, 1); c.position.copy(z3v(M.x, M.y, G0 + (M.jz || 0) + 0.07)); c.rotation.y = -M.h; c.material.opacity = at < T.hit ? 0.08 + 0.3 * k * (0.75 + 0.25 * Math.sin(t * (10 + k * 16))) : 0.5 * (1 - (at - T.hit) / 0.25); } }
    c.visible = show; }
  // the token
  { const tk = GCW.tok && !GCW.mine; GC3.tok.visible = !!tk; GC3.tokL.intensity = tk ? 1.2 : 0;
    if (tk) { GC3.tok.position.copy(z3v(GCW.tok[0], GCW.tok[1], G0 + GCW.tok[2] + 1.0 + 0.15 * Math.sin(t * 2.2))); GC3.tok.rotation.y = t * 1.8; } }
  for (const [i, s] of GC3.mist.entries()) { s.position.x = CX + ((t * 0.6 + i * 9) % 60) - 30; s.material.opacity = 1; }
}
