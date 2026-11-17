'use strict';
// The Chronicle of the Light, mission 6: The Kittiwake (28 February 1888). The night the first account of Verity
// came from: the keeper's log says a hand off the Kittiwake told him of a small yellow thing, round as a lamp glass
// and smiling, that sat on his deck and said it wanted to help; that he put a flare in its face and it rolled over the
// side; and that the ships that let it sit there do not come in. This is that night, aboard her.
//
// The Kittiwake: a Wrackhaven fishing lugger (WH 31), eighteen metres from her transom to her stem, one deck, two
// masts. Aft, the tiller (the helm) and the mizzen; the flare locker to starboard and the caboose (the iron stove in
// its box, with its chimney) to port; amidships the fish hold's hatch, and the punt lashed upside down on the port
// side; forward, the mainmast, the nets heaped to starboard and the capstan that hauls them. Three lamps: the stern
// lamp, the masthead lamp and the bow lamp. Her skipper, Abel Penhallow, and her youngest hand, Jory Tregear, sail with
// you (the players are the rest of her crew).
//
// The rules of Verity here, as the compendium has them (src/lore.js 'verity'; his pictures and voice are the sailing
// game's, src/verity.js), kept to on every screen:
//  - He comes for one of you at a time, and only to someone with a flare (the ship's flares are counted: KW below).
//    If nobody is carrying one he goes to whoever is nearest the locker, so long as there's a flare anywhere aboard;
//    with none left on the whole ship he doesn't come at all.
//  - He sits down small on the planks in front of you, smiling, and says he wants to help. Look away, or walk off,
//    and he's sitting in front of you again. Shot, cut or rung at, he doesn't notice.
//  - A flare in his face (Use, facing him, close, with a flare in your hand: yours, or a shipmate's beside you) sends
//    him rolling over the side. The flare goes up over the deck and burns the drowned near it.
//  - Leave him twenty seconds and he stands up: the long thing in his second picture. You go down (the others can get
//    you up), and he's gone until next time.
// The flares (KW): each of you carries up to two. The locker holds the ship's eight, and in the second part a sea
// comes aboard and soaks them: a wet flare is no use until it's dried at the caboose (two at a time, KWC.STOVE
// seconds each, then taken out dry).
// The helm: somebody has to be at the tiller or she falls off her course and drifts down on the skerries (KW.drift);
// let her drift all the way and she strikes.
//
// The parts (src/cpm06x.js): I The Nets (haul them, light the lamps; the drowned come up in the mesh), II The Middle
// Watch (bells from midnight to the end of it: hold her course and keep him off), III Abandon Ship (she's on the
// rocks: cut the punt free, launch it, get into it, and the last flare). Their cinematics are there too.
// Host-authoritative: the host keeps the flares, the stove, the lamps, the helm, the drift and Verity in RAID.st and
// sends them in the stage's word (kw); a joined player asks (raidAsk 'take', 'stove', 'vfl', 'h', 'board').
// Built like the Gannet's quarterdeck (src/gwcapt.js): her deck is the floor, the world outside is the stage's own 3D
// (the sea, her hull, the Light far off to the west and its beam, the skerries), and nobody goes over the rail.

const KWC = {
  FB: 1.6, STERN: -8.6, BOW: 9.4, BEAM: 2.55,   // (how far the sea lies under her deck; her ends; half her breadth)
  VT: 20, VM: 1.6, VSC: 1.5, VD: 3.4,   // (Verity: how long he smiles, how long he takes to stand, the scare, and how close you put the flare in)
  CARRY: 2, FLARE: 6.5, FLARE_R: 7, STOVE: 12, SLOTS: 2,   // (flares: carried at most, how long one burns over the deck, how far it burns them, drying time, the stove's room)
  HELM_R: 1.5,   // (how near the tiller you have to be to hold her)
};
const KW_AT = {
  tiller: [0, -8.0], helm: [0, -7.2], locker: [1.72, -5.3], stove: [-1.5, -4.7], hatch: [0.45, -0.9], main: [0, 2.6], mizzen: [0, -6.5],
  capstan: [0, 6.4], nets: [1.6, 4.2], punt: [-1.6, -0.7], start: [0, -2.6],
  lamps: [[0.62, 2.6, 2.7, 'the masthead lamp'], [-0.95, -8.15, 1.6, 'the stern lamp'], [0, 8.75, 1.4, 'the bow lamp']],
};
var KW = { on: false };   // (the 3D's own, on every screen: src/cpm06x.js's stages fill RAID.st)

cpCast('skip', { n: 'Skipper Penhallow', c: '#c8b48a' });
cpCast('jory', { n: 'Jory Tregear', c: '#a8d0b8' });

cpMission({ id: 'm06', act: 3, n: 'The Kittiwake', when: '28 February 1888', where: 'Aboard the Kittiwake, off the Near Skerries',
  blurb: 'The first account of Verity, from a hand off the Kittiwake. Something small sat down on her deck, smiling, and said it wanted to help.',
  stages: ['cp_kwnets', 'cp_kwwatch', 'cp_kwwreck'], intro: 'm06_intro', outro: 'm06_outro',
  after: { 0: 'm06_sits', 1: 'm06_strike' },
  music: { default: 'cptense' }, lives: 2,
  begin() { KW.on = false; }, stop() { KW.on = false; kwScareOff(); } });
CP_MUSIC_FALL.cpm06nets = 'gwsail'; CP_MUSIC_FALL.cpm06watch = 'gwhold'; CP_MUSIC_FALL.cpm06wreck = 'gwcapt2'; CP_MUSIC_FALL.cpm06verity = 'raidcave';

// ---------- her shape ----------
function kwHalfW(y) {
  if (y < -5.5) return 1.75 + 0.8 * Math.sin(clamp((y - KWC.STERN) / (-5.5 - KWC.STERN), 0, 1) * Math.PI / 2);
  if (y <= 3) return KWC.BEAM;
  const k = clamp((y - 3) / (KWC.BOW + 0.5 - 3), 0, 1);
  return Math.max(0.25, KWC.BEAM * Math.sqrt(1 - k * k));
}
const kwInside = (lx, ly, pad) => ly > KWC.STERN + 0.3 + pad && ly < KWC.BOW - 0.5 - pad && Math.abs(lx) < kwHalfW(ly) - 0.3 - pad;
const kwL = o => [o.x - FPSC.CX, o.y - FPSC.CY];
const kwW = (x, y) => [FPSC.CX + x, FPSC.CY + y];
// the punt, once she's in the water: off the port side, her floor at the deck's height (the sea is up to her by then)
const KW_PUNT = { x: -4.55, y: -0.6, hw: 0.62, hl: 1.75 };
const kwInPunt = (lx, ly, pad) => Math.abs(lx - KW_PUNT.x) < KW_PUNT.hw - pad && Math.abs(ly - KW_PUNT.y) < KW_PUNT.hl - pad;

// ---------- her props (src/fpsisle.js's kinds) ----------
const KWP = { plank: ['#5a4e3e', '#544836', '#5e5240', '#4e4434'], tar: '#141210', rail: '#3a2e22', bulw: '#2e3a40', spar: '#3a2c1e', tan: '#7a4a2a', iron: '#222428', red: '#7a2a22', rope: '#6a5a40', net: '#3a4440', cork: '#a08050' };
function kwRope(A, c, u0, v0, h0, u1, v1, h1, r) { gcRope(A, c, u0, v0, h0, u1, v1, h1, r); }
Object.assign(FPI_K, {
  // her deck: planks along her, the seams tarred, cut to her shape
  kwdeck: {
    col: KWP.plank[0], noShadow: true, sol() { return []; },
    b3(p, A) {
      const w = 5.4, n = Math.round(w / 0.2), pw = w / n;
      A.box(KWP.tar, 0, 0, -0.2, w, KWC.BOW - KWC.STERN, 0.18);
      for (let i = 0; i < n; i++) {
        const u = -w / 2 + (i + 0.5) * pw;
        let v = KWC.STERN - A.r() * 3;
        while (v < KWC.BOW) { const len = 2.5 + A.r() * 3, a = Math.max(v, KWC.STERN), b = Math.min(v + len, KWC.BOW); if (b - a > 0.1 && Math.abs(u) < kwHalfW((a + b) / 2) - 0.12) A.box(KWP.plank[(i * 3 + Math.floor(A.r() * 4)) % 4], u, (a + b) / 2, -0.04, pw * 0.93, b - a - 0.02, 0.05); v += len; }
      }
    },
  },
  // her bulwarks, both sides along her line, black with a pale cap rail, and the transom across her stern
  kwbulw: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      for (const s of [-1, 1]) for (let v = KWC.STERN + 0.05; v < KWC.BOW - 0.3; v += 0.7) {
        const v1 = Math.min(KWC.BOW - 0.3, v + 0.7), vm = (v + v1) / 2, u0 = s * (kwHalfW(v) - 0.1), u1 = s * (kwHalfW(v1) - 0.1), L = Math.hypot(u1 - u0, v1 - v), a = Math.atan2(u1 - u0, v1 - v);
        A.part('box', KWP.bulw, (u0 + u1) / 2, vm, 0.4, 0.1, 0.8, L + 0.03, a);
        A.part('box', '#8a8272', (u0 + u1) / 2, vm, 0.84, 0.18, 0.07, L + 0.04, a);
        if (A.r() < 0.3) A.part('box', KWP.rail, (u0 + u1) / 2 - s * 0.08, vm, 0.4, 0.06, 0.7, 0.08, a);
      }
      const tw = kwHalfW(KWC.STERN + 0.1) * 2;
      A.box(KWP.bulw, 0, KWC.STERN + 0.12, 0, tw, 0.1, 0.8); A.box('#8a8272', 0, KWC.STERN + 0.12, 0.8, tw + 0.1, 0.18, 0.07);
    },
  },
  // a pole mast: the mast, its lug yard lowered (the sail furled on it) or hoisted (p.set: the sail drawing), stays
  kwmast: {
    col: KWP.spar,
    sol(p) { return [fpiCirc(p, 0, 0, p.r || 0.2, 30)]; },
    b3(p, A) {
      const r = p.r || 0.2, L = p.L || 11;
      A.cyl(KWP.spar, 0, 0, -0.1, r, L, 0, 0, 0, 'cyl8');
      A.part('sph', '#2a2016', 0, 0, L - 0.05, r * 1.6, r * 1.2, r * 1.6);
      if (p.set) {
        // (a dipping lug, set: the yard slung high, the tan sail hanging from it to the deck, a little bellied)
        const yh = L - 1.2, w = p.w || 4.4;
        A.log(KWP.spar, 0, -0.3, yh, 0.07, w, 0, -0.35);
        for (let i = 0; i < 7; i++) { const k = i / 6, u = -w * 0.48 + k * w * 0.96, top = yh + (k - 0.5) * w * -0.34, bot = 0.9 + k * 0.3, len = top - bot; A.part('box', i % 2 ? KWP.tan : '#6e4226', u, -0.36 - 0.25 * Math.sin(k * Math.PI), bot + len / 2, w / 6.6, len, 0.03); }
      } else {
        A.log(KWP.spar, 0, 0.18, 1.6, 0.08, p.w || 5.2, Math.PI / 2 * 0, 0);
        for (let i = 0; i < 7; i++) A.part('sph', KWP.tan, (i - 3) * (p.w || 5.2) / 7.5, 0.24, 1.72, (p.w || 5.2) / 6.5, 0.3, 0.32);
      }
      // the shrouds, down to the rails
      for (const s of [-1, 1]) for (const dv of [-0.4, 0.4]) kwRope(A, KWP.tar, 0, 0, L - 1.6, s * (kwHalfW(p.y - FPSC.CY) - 0.15), dv, 0.85, 0.025);
      if (p.stay) kwRope(A, KWP.tar, 0, 0, L - 0.4, 0, p.stay, 0.9, 0.03);
      for (const [u, v] of [[0.32, 0], [-0.32, 0]]) A.part('torus', KWP.rope, u, v, 0.6, 0.35, 0.35, 0.5, 0, Math.PI / 2, 0);
    },
  },
  // the tiller: the rudder head through her transom and the long bar forward from it
  kwtiller: {
    col: KWP.rail,
    sol(p) { return [fpiBox(p, 0, 0, 0.18, 0.18, 1.0)]; },
    b3(p, A) { A.cyl('#3a2a1c', 0, 0, 0, 0.14, 0.95, 0, 0, 0, 'cyl8'); A.part('box', '#5a4028', 0, 0.85, 0.82, 0.08, 0.07, 1.8, 0, -0.08); A.part('sph', '#6a4a30', 0, 1.72, 0.75, 0.1, 0.1, 0.12); },
  },
  // the capstan: a drum on its pedestal, its bars out, a turn of the warp round it
  kwcapstan: {
    col: '#3a2a1c',
    sol(p) { return [fpiCirc(p, 0, 0, 0.42, 0.9)]; },
    b3(p, A) {
      A.cyl('#2e2216', 0, 0, 0, 0.45, 0.2, 0, 0, 0, 'cyl8'); A.cyl('#4a3624', 0, 0, 0.2, 0.32, 0.55, 0, 0, 0, 'cyl8'); A.cyl('#3a2a1c', 0, 0, 0.75, 0.4, 0.14, 0, 0, 0, 'cyl8');
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI; A.part('box', '#5a4028', 0, 0, 0.84, 1.9, 0.06, 0.07, a); }
      A.part('torus', KWP.rope, 0, 0, 0.45, 0.72, 0.72, 0.9, 0, Math.PI / 2, 0);
    },
  },
  // the fish hold's hatch: its coaming, the boards across it
  kwhatch: {
    col: '#3a2e22',
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, 0.45)]; },
    b3(p, A) {
      A.box('#3a2e22', 0, 0, 0, p.w, p.d, 0.4);
      const n = 5; for (let i = 0; i < n; i++) A.box(i % 2 ? '#5a4c3a' : '#524634', 0, -p.d / 2 + (i + 0.5) * p.d / n, 0.4, p.w - 0.1, p.d / n - 0.04, 0.05);
      A.part('box', '#6a5a44', 0, 0, 0.47, 0.06, 0.03, p.d - 0.2);
    },
  },
  // the caboose: the iron stove in its wooden box, the fire door, the chimney pipe up through the top
  kwcaboose: {
    col: '#3a2e22',
    sol(p) { return [fpiBox(p, 0, 0, 0.5, 0.45, 1.1)]; },
    b3(p, A) {
      A.box('#3a2e22', 0, 0, 0, 1.0, 0.9, 1.05); A.box('#2a2016', 0, 0, 1.05, 1.1, 1.0, 0.06);
      A.box(KWP.iron, 0.52, 0, 0.25, 0.04, 0.6, 0.45);
      A.glow('#ff8a40', 0.55, 0, 0.42, 0.18);
      A.cyl(KWP.iron, -0.15, 0.1, 1.1, 0.09, 0.9, 0, 0, 0, 'cyl6'); A.part('cone', KWP.iron, -0.15, 0.1, 2.05, 0.3, 0.12, 0.3);
    },
  },
  // the flare locker: a red-painted box with its lid, against the rail
  kwlocker: {
    col: KWP.red,
    sol(p) { return [fpiBox(p, 0, 0, 0.32, 0.45, 0.7)]; },
    b3(p, A) { A.box(KWP.red, 0, 0, 0, 0.62, 0.88, 0.62); A.box('#5a1e18', 0, 0, 0.62, 0.66, 0.92, 0.06); A.box('#c8c0a0', -0.32, 0, 0.3, 0.02, 0.5, 0.12); A.part('box', KWP.brass || '#8a6a2c', -0.33, 0, 0.5, 0.03, 0.06, 0.12); },
  },
  // the punt: lashed upside down on the deck, two lashings over her
  kwpunt: {
    col: '#4a5a62',
    sol(p) { return p.gone ? [] : [fpiBox(p, 0, 0, 0.55, 1.6, 0.6)]; },
    b3(p, A) {
      if (p.gone) return;
      A.part('boathull', '#3a4a52', 0, 0, 0.32, 1.05, 3.3, 0.6, 0, Math.PI / 2, Math.PI);
      A.box('#2a2a26', 0, 0, 0.58, 0.12, 3.1, 0.06);
      for (const v of [-0.8, 0.8]) for (const s of [-1, 1]) kwRope(A, KWP.rope, s * 0.55, v, 0.05, 0, v, 0.62, 0.03);
    },
  },
  // the nets, heaped: dark mesh in folds, the cork floats along them
  kwnets: {
    col: KWP.net,
    sol(p) { return [fpiBox(p, 0, 0, 0.55, 1.1, 0.5)]; },
    b3(p, A) {
      for (let i = 0; i < 9; i++) A.part('sph', i % 2 ? KWP.net : '#2e3632', (A.r() - 0.5) * 0.8, (A.r() - 0.5) * 1.9, 0.18 + A.r() * 0.2, 0.6 + A.r() * 0.4, 0.3 + A.r() * 0.2, 0.7 + A.r() * 0.5);
      for (let i = 0; i < 10; i++) A.part('sph', KWP.cork, (A.r() - 0.5) * 0.9, (A.r() - 0.5) * 2.0, 0.35 + A.r() * 0.2, 0.12, 0.08, 0.16);
    },
  },
  // a lamp post on the deck or a lamp hung on the mast (the lamp itself is the stage's 3D: it's lit and put out)
  kwlamppost: { noShadow: true, sol() { return []; }, b3(p, A) { if (p.post) A.cyl('#2e2216', 0, 0, 0, 0.05, p.z - 0.15, 0, 0, 0, 'cyl6'); A.box(KWP.iron, 0, 0, p.z - 0.2, 0.18, 0.18, 0.04); } },
  // fish baskets and a cask
  kwbask: { col: '#5a4a30', sol(p) { return [fpiCirc(p, 0, 0, 0.3, 0.6)]; }, b3(p, A) { A.cyl('#5a4a30', 0, 0, 0, 0.3, 0.55, 0, 0, 0, 'cyl8'); A.part('torus', '#3a2e1c', 0, 0, 0.55, 0.6, 0.6, 0.5, 0, Math.PI / 2, 0); for (let i = 0; i < 4; i++) A.part('sph', '#8a9a9a', (A.r() - 0.5) * 0.3, (A.r() - 0.5) * 0.3, 0.55, 0.18, 0.06, 0.08); } },
});
const KW_ZONES = { deck: { n: 'the Kittiwake’s deck', r: [-3, 3, -9, 10], sky: true } };
FPS_ISLES.cpkw = Object.assign({}, FPS_ISLES.light, { name: 'the Kittiwake', ground: '#05090c', ground2: '#05090c', wet: '#05090c', path: '#05090c', fog: ['#05070a', 30, 420], mist: '30,40,50', mistA: 0.06, nLights: 4 });
FPI_GEN.cpkw = { built: true, set(H) { const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }; kwLay(H, zmKit(H, Z), Z); }, decor() {} };
// (the stage being laid out says whether the punt is still on deck, and whether her sails are set)
function kwLay(H, K, Z) {
  const { put, light } = K, S = raidStage() || {}, A = KW_AT;
  put('kwdeck', 0, 0, 0, {}); put('kwbulw', 0, 0, 0, {});
  put('kwmast', A.main[0], A.main[1], 0, { r: 0.2, L: 11.5, w: 5.4, stay: 6.4, set: !!S.kwSail });
  put('kwmast', A.mizzen[0], A.mizzen[1], 0, { r: 0.13, L: 7, w: 3.2, set: true });
  put('kwtiller', A.tiller[0], A.tiller[1], 0, {});
  put('kwcapstan', A.capstan[0], A.capstan[1], 0, {});
  put('kwhatch', A.hatch[0], A.hatch[1], 0, { w: 1.8, d: 2.6 });
  put('kwcaboose', A.stove[0], A.stove[1], 0, {});
  put('kwlocker', A.locker[0], A.locker[1], 0, {});
  put('kwpunt', A.punt[0], A.punt[1], 0, { gone: !!S.kwPuntGone });
  put('kwnets', A.nets[0], A.nets[1], 0, {});
  for (const [x, y] of [[1.6, -2.9], [1.5, 1.4], [-1.55, 1.8]]) put('kwbask', x, y, 0, {});
  for (const [x, y, z] of A.lamps) put('kwlamppost', x, y, 0, { z, post: z < 2 });
  // (the stove's glow lights the after deck a little, always)
  light(A.stove[0] + 0.6, A.stove[1], 0.6, '#ff8a40', 4, 'lantern');
  Z.glass = [];
}
const KW_MAP = { start: KW_AT.start.slice(), top: 0, zones: KW_ZONES, nav: [-3, 3, -9, 10], isle: 'cpkw', shore: () => -999 };
// the hooks every part of hers shares (each stage in src/cpm06x.js adds its own over these)
function kwStage(def) {
  return Object.assign({
    map: KW_MAP, mend: true, noBars: true,
    set: (H, K, Z) => kwLay(H, K, Z),
    block(x, y, pad) { const lx = x - FPSC.CX, ly = y - FPSC.CY, p = Math.max(0, (pad || 0) - 0.15); return !(kwInside(lx, ly, p) || (RAID.st.puntOn && kwInPunt(lx, ly, p))); },
    consider: c => kwConsider(c), prompt: o => kwPrompt(o), use: o => kwUse(o),
    pack: o => kwPack(o), apply: o => kwApply(o),
    shot: (x, y, z, lh) => kwShot(x, y, lh),
    b3: grp => kw3dBuild(grp), f3: dt => kw3d(dt),
    exit() { KW.on = false; kwScareOff(); if (typeof GL3D !== 'undefined') { if (GL3D.sea) GL3D.sea.visible = true; if (GL3D.island) { GL3D.island.visible = true; for (const c of GL3D.island.children) if (c.userData.kwHid) { c.visible = true; c.userData.kwHid = false; } } } kwNpcFree(); },
  }, def);
}

// =====================================================================================================================
// the ship's state (hosting or alone it's kept here; joined, it comes in the host's word)
// =====================================================================================================================
// (each part's enter calls this with its own starting store of flares)
function kwState(o) {
  Object.assign(RAID.st, {
    kw: true, fl: {}, fw: {}, lk: 8, lkw: 0, sv: [-1, -1], lamps: [0, 0, 0], drift: 0, helm: '', bells: 0, flares: [], fseq: 0, fseen: 0,
    v: { on: 0, sid: '', t: 0, mo: 0, x: 0, y: 0, gone: 0, gx: 0, gy: 0, seq: 0, next: 30, lost: 0, n: 0, npc: 0 },
    vseen: 0, kwSeen: null, hold: {}, holdAcc: 0, holdK: '', holdT: 0, lastHint: 0, beat: 0, pend: 0, said: {}, puntOn: false, inPunt: false,
  }, o || {});
}
const kwN = () => Math.max(1, (ZM.hum || []).length);
const kwNick = sid => sid === FPS.me.id ? (ZM.net ? (ZM.hum.find(h => h[0] === sid) || [])[1] || 'You' : 'You') : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'A shipmate';
function kwLine(s) { fpsFeed(s); if (ZM.net === 'host' && typeof zmnEvent === 'function') zmnEvent('feed', s); }
const kwMine = () => (RAID.st.fl || {})[FPS.me.id] | 0;
const kwMineWet = () => (RAID.st.fw || {})[FPS.me.id] | 0;
// how many flares there are aboard, anywhere (dry or wet, carried, in the locker or the stove)
function kwAboard() { const S = RAID.st; let n = (S.lk | 0) + (S.lkw | 0); for (const k in S.fl) n += S.fl[k] | 0; for (const k in S.fw) n += S.fw[k] | 0; for (const s of S.sv || []) if (s >= 0) n++; return n; }
// everyone standing, as the host knows them: [{ sid, x, y, h }]
function kwCrew() {
  const m = FPS.me, out = [];
  if (!(m.dead > 0) && !zmIsDown() && !ZM.ghost) out.push({ sid: m.id, x: m.x, y: m.y, h: m.h, me: true });
  if (ZM.net === 'host') for (const r of FPS.remote.values()) if (!r.dead && !r.down && r.x != null) out.push({ sid: r.id, x: r.x, y: r.y, h: r.h || 0 });
  return out;
}

// ---------- the helm (hosting or alone, each frame) ----------
// who's at the tiller, and her drift: up while nobody is (slowly, so one of you alone can fetch a flare and get back),
// down while somebody is. k: how quickly she drifts in this part
function kwHelmTick(dt, k) {
  const S = RAID.st, [hx, hy] = kwW(...KW_AT.helm), at = kwCrew().filter(p => Math.hypot(p.x - hx, p.y - hy) < KWC.HELM_R);
  S.helm = at.length ? at[0].sid : '';
  if (at.length) S.drift = Math.max(0, S.drift - dt / 10);
  else S.drift = Math.min(1, S.drift + dt * (k || 1) / (42 + 10 * (kwN() - 1)));
  return S.drift;
}

// ---------- flares: carried, in the locker, in the stove; and going up over the deck ----------
// (hosting or alone) somebody's flare goes up over the deck at (x, y): it lights her, and burns the drowned near it
function kwFlareUp(x, y, sid) {
  const S = RAID.st;
  S.fseq = (S.fseq + 1) % 1000;
  S.flares.push([x, y, KWC.FLARE, S.fseq, Math.random() * 6.28]); if (S.flares.length > 4) S.flares.shift();
  for (const z of ZM.z) if (!z.dead && !z.boss && Math.hypot(z.x - x, z.y - y) < KWC.FLARE_R) zmKill(z, false, '', 'burn', sid);
}
// (each frame, everyone) the flares burning down, the stove drying
function kwFlaresTick(dt) {
  const S = RAID.st;
  for (const f of S.flares) f[2] -= dt;
  S.flares = S.flares.filter(f => f[2] > -0.5);
  for (let i = 0; i < S.sv.length; i++) if (S.sv[i] > 0) { S.sv[i] = Math.max(0, S.sv[i] - dt); if (S.sv[i] === 0 && ZM.net !== 'client') kwLine('A flare in the caboose is dry. Take it out.'); }
}
const kwLit = () => (RAID.st.flares || []).some(f => f[2] > 0);
// (hosting or alone) what somebody asked
function kwQ(sid, k, a) {
  const S = RAID.st; if (!S.kw) return;
  const fl = S.fl, fw = S.fw, carry = (fl[sid] | 0) + (fw[sid] | 0);
  if (k === 'take') {
    if (carry >= KWC.CARRY) return;
    if (S.lk > 0) { S.lk--; fl[sid] = (fl[sid] | 0) + 1; kwSfx(sid, 'take'); }
    else if (S.lkw > 0) { S.lkw--; fw[sid] = (fw[sid] | 0) + 1; kwSfx(sid, 'take'); }
  } else if (k === 'stove') {
    // (a wet one in, if there's room; then a dry one out, if there's one ready and a hand free)
    const free = S.sv.indexOf(-1);
    if ((fw[sid] | 0) > 0 && free >= 0) { fw[sid]--; S.sv[free] = KWC.STOVE; kwLine(`${kwNick(sid)} put a wet flare in the caboose to dry.`); }
    const dry = S.sv.indexOf(0);
    if (dry >= 0 && (fl[sid] | 0) + (fw[sid] | 0) < KWC.CARRY) { S.sv[dry] = -1; fl[sid] = (fl[sid] | 0) + 1; kwSfx(sid, 'take'); }
  } else if (k === 'vfl') kwVerityFlare(sid);
  else if (k === 'h' && Array.isArray(a)) { const key = String(a[0]) + ':' + (a[1] | 0); S.hold[key] = (S.hold[key] || 0) + clamp(+a[2] || 0, 0, 0.6); S.holdBy = S.holdBy || {}; S.holdBy[key] = sid; }
  else if (k === 'board' && S.puntOn) { S.boarded = S.boarded || {}; S.boarded[sid] = 1; }
  const St = raidStage(); if (St && St.kwq) St.kwq(sid, k, a);
}
function kwSfx(sid, k) { if (sid === FPS.me.id) zmSound(k); }
// (everyone, each frame while it goes on) a recording kept going: played again as each take runs out
function kwLoop(name, x, y, vol) { try { const b = SFXB.buf[name]; sfxPlay(name, { vol, pan: fpsEar(x, y), gap: b && b[0] ? b[0].duration * 0.92 : 2 }); } catch (e) {} }

// ---------- Verity (hosting or alone) ----------
// where he sits for someone (p: { x, y, h }): a few steps in front, a little to one side, on her planks
function kwVSpot(p) {
  for (const d of [3.4, 2.8, 4.2, 2.2, 5]) for (const da of [0.22, -0.22, 0.4, -0.4, 0, 0.7, -0.7]) {
    const a = p.h + da, x = p.x + Math.sin(a) * d, y = p.y + Math.cos(a) * d, [lx, ly] = kwL({ x, y });
    if ((kwInside(lx, ly, 0.25) || (RAID.st.inPuntAll && kwInPunt(lx, ly, 0.1))) && !zmBlockedAt(x, y, 0.3, 0)) return [x, y];
  }
  return null;
}
// (each frame) he comes, sits, smiles, stands. o: { every: [min, max] seconds between, npc: [x, y] someone of the
// crew he's sitting in front of instead (the cinematic's), quiet: no line }
function kwVerityTick(dt, o) {
  const S = RAID.st, v = S.v; o = o || {};
  if (v.gone > 0) v.gone = Math.max(0, v.gone - dt);
  if (!v.on) {
    if (o.off) return;
    v.next -= dt * (1 + 0.12 * (kwN() - 1));
    if (v.next > 0) return;
    // who: someone carrying a flare; else whoever is nearest the locker, if there's a flare anywhere aboard
    const crew = kwCrew(); if (!crew.length) { v.next = 3; return; }
    let pick = crew.filter(p => (S.fl[p.sid] | 0) > 0);
    if (!pick.length) { if (!kwAboard()) { v.next = 6; return; } const [lx, ly] = kwW(...KW_AT.locker); pick = crew.slice().sort((a, b) => Math.hypot(a.x - lx, a.y - ly) - Math.hypot(b.x - lx, b.y - ly)).slice(0, 1); }
    const p = pick[(Math.random() * pick.length) | 0], at = kwVSpot(p);
    if (!at) { v.next = 1; return; }
    Object.assign(v, { on: 1, sid: p.sid, t: 0, mo: 0, x: at[0], y: at[1], lost: 0, seq: (v.seq + 1) % 1000, npc: 0, n: v.n + 1 });
    if (!o.quiet) { const L = KW_VSAY[(v.n - 1) % KW_VSAY.length]; cpSay('verity', L[0], L[1]); }
    kwLine(p.sid === FPS.me.id && !ZM.net ? 'Something small is on the planks in front of you, smiling. It says it wants to help.' : `Something small is sitting on the planks in front of ${kwNick(p.sid)}, smiling.`);
    return;
  }
  // gone if they are
  const who = v.npc ? null : kwCrew().find(p => p.sid === v.sid);
  if (!v.npc && !who) { v.on = 0; v.gone = 0.01; v.next = 8 + Math.random() * 6; return; }
  if (v.mo <= 0) {
    // you can't leave him behind: out of sight for a moment, or far off, and he's in front of you again
    if (who) {
      const d = Math.hypot(v.x - who.x, v.y - who.y), off = Math.abs(angDiff(bearingOf(v.x - who.x, v.y - who.y), who.h));
      v.lost = off > 0.8 || d > 7 ? v.lost + dt : 0;
      if (v.lost > 0.9) { const at = kwVSpot(who); if (at) { v.x = at[0]; v.y = at[1]; } v.lost = 0; }
    }
    v.t += dt;
    if (v.t >= KWC.VT) v.mo = 0.0001;
    return;
  }
  v.mo += dt;
  if (who && Math.abs(angDiff(bearingOf(v.x - who.x, v.y - who.y), who.h)) > 0.7) { const at = kwVSpot(who); if (at) { v.x = at[0]; v.y = at[1]; } }
  if (v.mo >= KWC.VM) {
    const sid = v.sid, ev = o.every || (raidStage() || {}).kwEvery || [28, 36]; v.on = 0; v.mo = 0; v.gone = 0; v.next = ev[0] + Math.random() * (ev[1] - ev[0]);
    if (!v.npc) { cpEvent('kwscare', sid); kwLine(`Verity stood up in front of ${kwNick(sid)}.`); }
  }
}
// (hosting or alone) a flare in his face, from sid's hand
function kwVerityFlare(sid) {
  const S = RAID.st, v = S.v; if (!v.on || v.mo > 0 || (S.fl[sid] | 0) <= 0) return;
  S.fl[sid]--;
  v.on = 0; v.gone = 0.9; v.gx = v.x; v.gy = v.y;
  const ev = (raidStage() || {}).kwEvery || [28, 36];
  v.next = ev[0] + Math.random() * (ev[1] - ev[0]);
  kwFlareUp(v.x, v.y, sid);
  cpEvent('kwshoo', [Math.round((v.x - FPSC.CX) * 10), Math.round((v.y - FPSC.CY) * 10)]);
  kwLine(`${kwNick(sid)} put a flare in Verity’s face. He rolled over the side, still smiling.`);
  const St = raidStage(); if (St && St.kwShoo) St.kwShoo(sid);
}
// what he says as he sits down (one line at each sitting, in turn)
const KW_VSAY = [['I can help.', 'cp_m06_40'], ['Let me help you.', 'cp_m06_41'], ['You look so tired.', 'cp_m06_42'], ['I only want to help.', 'cp_m06_43'], ['Sit with me a while.', 'cp_m06_44'], ['I can take the tiller.', 'cp_m06_45'], ['Nobody need know.', 'cp_m06_46'], ['There now.', 'cp_m06_47']];
// everyone: the scare, when he stands up in front of you
cpOn('kwscare', sid => { if (String(sid) !== FPS.me.id || !KW.on) return; kwScare(); });
cpOn('kwshoo', a => { if (!KW.on) return; try { stopVerity(); sfxFlare(); } catch (e) {} if (Array.isArray(a)) { const x = FPSC.CX + (a[0] | 0) / 10, y = FPSC.CY + (a[1] | 0) / 10; try { sfxSplash(fpsEar(x, y), 0.8); } catch (e) {} for (let i = 0; i < 8; i++) fpsPuff(x, y, FPSC.GROUND + 0.4, '255,214,60', 2); } KW.hb = 0; });
function kwScare() {
  const m = FPS.me; if (m.dead > 0 || zmIsDown()) return;
  KW.scare = KWC.VSC; FPS.vScare = KWC.VSC;
  try { $('stage').classList.add('scaring'); stopVerity(); sfxVerityScare(); } catch (e) {}
  if (typeof padRumble === 'function') padRumble(1, 1, KWC.VSC * 1000);
}
function kwScareOff() { if (KW.scare > 0 || FPS.vScare > 0) { KW.scare = 0; FPS.vScare = 0; try { $('stage').classList.remove('scaring'); } catch (e) {} } }
// (everyone, each frame) the scare running out: then you're down
function kwScareTick(dt) {
  if (!(KW.scare > 0)) return;
  KW.scare -= dt; FPS.vScare = Math.max(0.001, KW.scare);
  if (KW.scare <= 0) { kwScareOff(); try { stopVerity(); } catch (e) {} const m = FPS.me; m.protect = 0; m.iframe = 0; if (!(m.dead > 0) && !zmIsDown()) { fpsFeed('Verity helped.'); zmDown(); } }
}
// a shot through him does nothing, and he lets you know it
function kwShot(x, y, h) {
  const v = RAID.st.v; if (!v || !v.on || v.mo > 0) return;
  const ox = v.x - x, oy = v.y - y, along = ox * Math.sin(h) + oy * Math.cos(h); if (along < 0 || along > 30) return;
  if (Math.abs(ox * Math.cos(h) - oy * Math.sin(h)) > 0.55) return;
  fpsPuff(v.x, v.y, FPSC.GROUND + 0.45, '255,214,60', 4);
  if (!(KW.shotSaid > 0)) { KW.shotSaid = 6; fpsFeed('It goes straight through Verity. He keeps smiling.'); }
}

// ---------- what's in front of you ----------
function kwConsider(c) {
  const S = RAID.st; if (!S.kw) return;
  const W = kwW, St = raidStage() || {};
  if (!S.inPunt) {
    { const [x, y] = W(KW_AT.locker[0] - 0.55, KW_AT.locker[1]); c({ k: 'kwlock' }, x, y, 0, 1.5, true); }
    if (St.kwStove) { const [x, y] = W(KW_AT.stove[0] + 0.7, KW_AT.stove[1]); c({ k: 'kwstove' }, x, y, 0, 1.5, true); }
  }
  const v = S.v; if (v.on && v.mo <= 0) c({ k: 'kwv' }, v.x, v.y, 0, KWC.VD, true);
  if (St.kwConsider) St.kwConsider(c);
}
function kwPrompt(o) {
  const S = RAID.st, mine = kwMine(), wet = kwMineWet(), carry = mine + wet;
  if (o.k === 'kwlock') { if (S.lk + S.lkw <= 0) return { text: 'The flare locker: empty' }; if (carry >= KWC.CARRY) return { text: `The flare locker (${S.lk ? S.lk + ' dry' : ''}${S.lk && S.lkw ? ', ' : ''}${S.lkw ? S.lkw + ' wet' : ''}): your hands are full` }; return { text: S.lk > 0 ? `Take a flare (${S.lk} left in the locker)` : `Take a wet flare (${S.lkw} left, soaked)`, free: true }; }
  if (o.k === 'kwstove') { const dry = S.sv.indexOf(0) >= 0, free = S.sv.indexOf(-1) >= 0; if (wet && free) return { text: dry ? 'Put your wet flare in to dry, and take a dry one out' : 'Put your wet flare in the caboose to dry', free: true }; if (dry && carry < KWC.CARRY) return { text: 'Take a dry flare out of the caboose', free: true }; const d = S.sv.filter(s => s > 0); return { text: d.length ? `The caboose: drying (${Math.ceil(Math.min(...d))} s)` : wet ? 'The caboose: full' : 'The caboose: bring it a wet flare to dry' }; }
  if (o.k === 'kwv') return mine > 0 ? { text: 'Put a flare in his face', free: true } : { text: 'You have no flare. Get one, quickly.' };
  const St = raidStage(); return St && St.kwPrompt ? St.kwPrompt(o) : null;
}
function kwUse(o) {
  if (o.k === 'kwlock') { raidAsk('take'); return true; }
  if (o.k === 'kwstove') { raidAsk('stove'); return true; }
  if (o.k === 'kwv') { if (kwMine() > 0) { if (typeof rmvAdd === 'function') rmvAdd('fl'); raidAsk('vfl'); } else zmSound('no'); return true; }
  const St = raidStage(); return St && St.kwUse ? !!St.kwUse(o) : false;
}
// (everyone, each frame) holding Use at something that takes a while: the host adds it up
function kwHoldTick(dt) {
  const S = RAID.st, o = ZM.near, hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse;
  const St = raidStage() || {}, ok = o && St.kwHolds && St.kwHolds.includes(o.k) && !(FPS.me.dead > 0) && !zmIsDown();
  if (hold && ok) { S.holdAcc += dt; S.holdNow = o.k + ':' + (o.i | 0); } else { S.holdNow = ''; }
  if (S.holdAcc > 0 && (S.holdAcc >= 0.25 || !(hold && ok))) { if (ok || S.holdK) raidAsk('h', [(ok ? o.k : S.holdK), ok ? o.i | 0 : S.holdI | 0, S.holdAcc]); S.holdAcc = 0; }
  if (ok) { S.holdK = o.k; S.holdI = o.i | 0; }
}
// (hosting) how much of key k (item i) has been held since last asked, and by whom
// (max: no more than that this frame; what's left over waits for the next, up to a little over one ask's worth)
function kwTakeHold(k, i, max) { const S = RAID.st, key = k + ':' + (i | 0), n = S.hold[key] || 0, t = max == null ? n : Math.min(n, max); S.hold[key] = Math.min(0.6, n - t); return t; }

// ---------- together ----------
// kw: the flares (sid, dry, wet), the locker, the stove, the lamps, the drift, the helm, the bells, the flares in the
// air, Verity, and whatever the part adds (kws)
function kwPack(o) {
  const S = RAID.st; if (!S.kw) return;
  const r10 = v => Math.round(v * 10), CX = FPSC.CX, CY = FPSC.CY, v = S.v, ids = new Set([...Object.keys(S.fl), ...Object.keys(S.fw)]);
  o.kw = {
    f: [...ids].map(k => [k, S.fl[k] | 0, S.fw[k] | 0]), lk: S.lk, lkw: S.lkw, sv: S.sv.map(r10), lm: S.lamps, dr: Math.round(S.drift * 1000), hl: S.helm, bl: S.bells,
    fx: S.flares.map(f => [r10(f[0] - CX), r10(f[1] - CY), r10(f[2]), f[3], Math.round(f[4] * 100)]),
    v: [v.on, v.sid, r10(v.t), Math.round(v.mo * 100), r10(v.x - CX), r10(v.y - CY), r10(v.gone), r10(v.gx - CX), r10(v.gy - CY), v.seq, v.npc],
    po: S.puntOn ? 1 : 0, bd: S.boarded ? Object.keys(S.boarded) : [],
  };
  const St = raidStage(); if (St && St.kwPack) o.kws = St.kwPack();
}
function kwApply(o) {
  const S = RAID.st, a = o && o.kw; if (!S.kw || !a || typeof a !== 'object') return;
  const CX = FPSC.CX, CY = FPSC.CY;
  S.fl = {}; S.fw = {}; if (Array.isArray(a.f)) for (const r of a.f) if (Array.isArray(r)) { S.fl[String(r[0])] = r[1] | 0; S.fw[String(r[0])] = r[2] | 0; }
  S.lk = a.lk | 0; S.lkw = a.lkw | 0; if (Array.isArray(a.sv)) S.sv = a.sv.map(x => (+x || 0) / 10);
  if (Array.isArray(a.lm)) S.lamps = a.lm.map(x => x | 0); S.drift = (+a.dr || 0) / 1000; S.helm = String(a.hl || ''); S.bells = a.bl | 0;
  if (Array.isArray(a.fx)) { S.flares = a.fx.map(f => [CX + f[0] / 10, CY + f[1] / 10, f[2] / 10, f[3] | 0, f[4] / 100]); }
  if (Array.isArray(a.v)) { const q = a.v, v = S.v; v.on = q[0] | 0; v.sid = String(q[1] || ''); v.t = q[2] / 10; v.mo = q[3] / 100; v.x = CX + q[4] / 10; v.y = CY + q[5] / 10; v.gone = q[6] / 10; v.gx = CX + q[7] / 10; v.gy = CY + q[8] / 10; v.seq = q[9] | 0; v.npc = q[10] | 0; }
  S.puntOn = !!a.po; S.boarded = {}; if (Array.isArray(a.bd)) for (const k of a.bd) S.boarded[String(k)] = 1;
  const St = raidStage(); if (St && St.kwApply && o.kws) St.kwApply(o.kws);
}

// ---------- everyone, each frame: what every part does alike ----------
function kwMe(dt) {
  const S = RAID.st; if (!S.kw) return;
  kwFlaresTick(dt); kwScareTick(dt); kwHoldTick(dt);
  if (KW.shotSaid > 0) KW.shotSaid -= dt;
  const m = FPS.me, v = S.v;
  // a flare gone up: the bang of it, here
  for (const f of S.flares) if (f[3] !== KW.fseen && f[2] > KWC.FLARE - 1) { KW.fseen = f[3]; try { sfxFlare(); } catch (e) {} }
  // a lamp lit, a wet flare into the caboose: their sounds, where they happen (recordings only)
  const sn = S.kwSeen || (S.kwSeen = { lm: S.lamps.slice(), sv: S.sv.slice() });
  S.lamps.forEach((l, i) => { if (l && !sn.lm[i]) { const [x, y] = kwW(KW_AT.lamps[i][0], KW_AT.lamps[i][1]); try { sfxPlay('kwlamp', { vol: 0.7, pan: fpsEar(x, y) }); } catch (e) {} } });
  S.sv.forEach((s, i) => { if (s > 0 && !(sn.sv[i] > 0)) { const [x, y] = kwW(KW_AT.stove[0], KW_AT.stove[1]); try { sfxPlay('kwstove', { vol: 0.75, pan: fpsEar(x, y) }); } catch (e) {} } });
  sn.lm = S.lamps.slice(); sn.sv = S.sv.slice();
  // Verity coming, sitting, standing: his voice, and the heart going faster as his time runs out (only for the one
  // he's sitting in front of: the rest hear him)
  if (v.on && v.seq !== KW.vseq) { KW.vseq = v.seq; try { loadVerityVoice(); sfxVerity(1, v.sid === m.id ? 0.95 : 0.5); } catch (e) {} KW.v10 = false; KW.vst = false; }
  if (v.on && v.mo <= 0 && v.t > 10 && !KW.v10) { KW.v10 = true; try { sfxVerity(0.93, v.sid === m.id ? 0.95 : 0.4); } catch (e) {} }
  if (v.on && v.mo > 0 && !KW.vst) { KW.vst = true; try { stopVerity(); sfxVerity(0.62, 1); sfxCreak(); } catch (e) {} }
  if (v.on && v.mo <= 0 && v.sid === m.id) { const k = v.t / KWC.VT; KW.hb = (KW.hb || 0) - dt; if (KW.hb <= 0) { KW.hb = 1.1 - 0.75 * k; zmSound('beat'); } }
  // (in the punt, you stay in the punt; on deck, on deck)
  if (S.puntOn && S.boarded && S.boarded[m.id] && !S.inPunt) { S.inPunt = true; const [x, y] = kwW(KW_PUNT.x + (Math.random() - 0.5) * 0.4, KW_PUNT.y + (Math.random() - 0.5) * 1.6); m.x = x; m.y = y; m.jz = 0; m.vz = 0; }
  try { loadVerityVoice(); } catch (e) {}
}

// ---------- painted on top ----------
function kwHudLines(phone, mono, fell, extra) {
  const S = RAID.st; if (!S.kw) return;
  const L = Math.max(14, FPS.safeLeft || 0), dy = phone ? 14 : 17; let y = fpsHudTop() + (phone ? 70 : 92);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
  const line = (s, c) => { ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = c; ctx.fillText(s, L, y, W * 0.5); y += dy; fpsHudNote(y); };
  const mine = kwMine(), wet = kwMineWet();
  line(`Your flares: ${mine} dry${wet ? ', ' + wet + ' wet' : ''}  ·  locker: ${S.lk}${S.lkw ? ' (+' + S.lkw + ' wet)' : ''}`, mine ? 'rgba(255,170,150,0.95)' : 'rgba(236,228,207,0.7)');
  const St = raidStage() || {};
  if (St.kwStove) { const sv = S.sv.map(s => s < 0 ? '—' : s === 0 ? 'dry' : Math.ceil(s) + ' s'); line(`The caboose: ${sv.join(' · ')}`, S.sv.includes(0) ? 'rgba(255,200,140,0.95)' : 'rgba(236,228,207,0.6)'); }
  for (const e of extra || []) line(e[0], e[1]);
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
}
// the helm and the drift: a bar, and who's on the tiller
function kwHelmHud(phone, mono, fell) {
  const S = RAID.st, t = g.t, bw = Math.min(260, W * 0.3), x = W - bw - Math.max(16, FPS.safeRight || 0), y = fpsHudTop() + (phone ? 40 : 54), k = clamp(S.drift, 0, 1);
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x - 3, y - 3, bw + 6, 14);
  ctx.fillStyle = k > 0.7 ? `rgba(230,110,90,${0.75 + 0.25 * Math.sin(t * 9)})` : k > 0.4 ? '#e4c46a' : '#8fc8e8'; ctx.fillRect(x, y, bw * k, 8);
  ctx.font = mono(phone ? 9 : 11); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(236,228,207,0.8)';
  ctx.fillText(S.helm ? `AT THE TILLER: ${kwNick(S.helm).toUpperCase()}` : k > 0.05 ? 'NOBODY AT THE TILLER · SHE’S DRIFTING' : 'NOBODY AT THE TILLER', x + bw, y - 4);
  ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(236,228,207,0.55)'; ctx.fillText(`DRIFT TOWARDS THE SKERRIES ${Math.round(k * 100)}%`, x + bw, y + 12);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
// Verity, in the middle: his time, and what to do
function kwVHud(phone, mono, fell) {
  const S = RAID.st, v = S.v, m = FPS.me; if (!v.on || v.mo > 0 || ZM.over) return;
  const left = Math.max(0, Math.ceil(KWC.VT - v.t)), a = 0.65 + 0.35 * Math.sin(g.t * 6);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8;
  if (v.sid === m.id) {
    ctx.font = fell(phone ? 18 : 26); ctx.fillStyle = `rgba(255,214,60,${a})`;
    ctx.fillText(`Verity is smiling at you · ${left}`, cx, H * (phone ? 0.24 : 0.22));
    ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.fillText(kwMine() > 0 ? 'Face him and Use: a flare in his face' : kwAboard() ? 'You have no flare: get one from the locker' + ((raidStage() || {}).kwStove ? ' or the caboose' : '') : 'There are no flares left aboard', cx, H * (phone ? 0.24 : 0.22) + (phone ? 20 : 28));
    // the edges of the screen yellowing as his time runs out
    const k = clamp(v.t / KWC.VT, 0, 1), gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.35, cx, H / 2, Math.max(W, H) * 0.75);
    gr.addColorStop(0, 'rgba(80,70,0,0)'); gr.addColorStop(1, `rgba(80,70,0,${0.1 + 0.35 * k})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  } else {
    ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = `rgba(255,214,60,${0.75 * a})`;
    ctx.fillText(v.npc ? `Verity is sitting in front of the skipper · ${left}` : `Verity is sitting in front of ${kwNick(v.sid)} · ${left} s${kwMine() ? ' · a flare from you will do it too' : ''}`, cx, H * (phone ? 0.24 : 0.22));
  }
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// =====================================================================================================================
// in 3D: her hull and the sea, the Light far off and its beam, the skerries, her lamps, the flares, Verity, and the
// two of her crew who aren't you
// =====================================================================================================================
const KW3 = { on: false };
function kwTex(img) {
  const t = new THREE.Texture(img);
  if (img.complete && img.naturalWidth) t.needsUpdate = true; else img.addEventListener('load', () => { t.needsUpdate = true; }, { once: true });
  return t;
}
function kw3dBuild(grp) {
  KW3.on = false; KW.on = !!RAID.st.kw; if (!KW.on) return;
  const G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, St = raidStage() || {};
  const soft = (c0, c1, o) => new THREE.SpriteMaterial(Object.assign({ map: z3Soft(c0, c1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }, o || {}));
  const out = KW3.out = new THREE.Group(); out.position.copy(z3v(CX, CY, G0)); grp.add(out);
  const at = (o, x, y, z) => { o.position.set(x, z, -y); out.add(o); return o; };
  // (her own things go with her deck; the world outside rolls about her)
  const ship = KW3.ship = new THREE.Group(); ship.position.copy(z3v(CX, CY, G0)); grp.add(ship);
  const sat = (o, x, y, z) => { o.position.set(x, z, -y); ship.add(o); return o; };
  // ---- the sea ----
  KW3.t = { value: 0 };
  {
    const geo = new THREE.PlaneGeometry(9000, 9000, 1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ color: 0x041018, specular: 0x8a9aa8, shininess: 70, emissive: 0x010408 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = KW3.t;
      sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform float uT;\nvarying vec3 vWp;\n' + sh.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  { vec2 p = vWp.xz * 0.6;
    vec2 gr = 0.08 * cos(dot(p, vec2(1.3, 0.9)) + uT * 1.6) * vec2(1.3, 0.9) + 0.07 * cos(dot(p, vec2(-0.8, 1.7)) + uT * 2.0) * vec2(-0.8, 1.7)
            + 0.04 * cos(dot(p, vec2(2.9, -1.4)) - uT * 2.6) * vec2(2.9, -1.4) + 0.03 * cos(dot(p, vec2(-4.1, -2.6)) + uT * 3.2) * vec2(-4.1, -2.6);
    normal = normalize((viewMatrix * vec4(normalize(vec3(-gr.x, 1.0, -gr.y)), 0.0)).xyz); }`);
    };
    KW3.sea = at(new THREE.Mesh(geo, mat), 0, 0, -KWC.FB); KW3.sea.renderOrder = 0;
  }
  // ---- her hull: black topsides, a white strake, tarred below; WH 31 on her bows, her name on her transom ----
  {
    const pos = [], col = [], idx = [], N = 72, PR = [[0.86, 1.0], [0.4, 1.0], [0.0, 0.99], [-0.6, 0.97], [-KWC.FB + 0.2, 0.92], [-KWC.FB - 0.4, 0.82], [-KWC.FB - 1.2, 0.5], [-KWC.FB - 1.9, 0.12]];
    const black = new THREE.Color('#101214'), white = new THREE.Color('#9a968a'), tar = new THREE.Color('#0a0c0a'), tmp = new THREE.Color();
    for (const s of [-1, 1]) {
      const b0 = pos.length / 3;
      for (let i = 0; i <= N; i++) {
        const y = KWC.STERN + (KWC.BOW + 0.4 - KWC.STERN) * i / N, hw = kwHalfW(Math.min(y, KWC.BOW)), sheer = 0.35 * Math.pow(Math.abs(y - 0.4) / 9, 2);
        PR.forEach(([zz, k], j) => { pos.push(s * hw * k, zz + (j < 2 ? sheer : j < 3 ? sheer * 0.5 : 0), -y); tmp.copy(zz <= -KWC.FB + 0.25 ? tar : zz > 0.3 && zz < 0.5 ? white : black); const n = 0.9 + 0.2 * fpiHash(i * 31 + j, 3); col.push(tmp.r * n, tmp.g * n, tmp.b * n); });
      }
      const P = PR.length;
      for (let i = 0; i < N; i++) for (let j = 0; j < P - 1; j++) { const a = b0 + i * P + j, b = a + P, c = a + 1, d = b + 1; if (s > 0) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, c, d, b); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const hull = KW3.hull = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 30, specular: 0x30383a, side: THREE.DoubleSide }));
    ship.add(hull);
    const tw = kwHalfW(KWC.STERN) * 2, tr = new THREE.Mesh(new THREE.PlaneGeometry(tw * 0.98, KWC.FB + 1.0), new THREE.MeshPhongMaterial({ color: 0x101214, side: THREE.DoubleSide }));
    sat(tr, 0, KWC.STERN - 0.02, (0.86 - KWC.FB) / 2);
    const label = (txt, w, h, x, y, z, ry, c2) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const q = c.getContext('2d');
      q.font = 'bold 60px "IM Fell English SC", Georgia, serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillStyle = c2 || 'rgba(220,210,180,0.8)'; q.fillText(txt, 256, 50);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.y = ry || 0; sat(m, x, y, z); return m;
    };
    label('KITTIWAKE', 3.2, 0.6, 0, KWC.STERN - 0.06, 0.2);
    label('WH 31', 1.6, 0.5, 1.45, 7.0, 0.3, Math.PI / 2 - 0.35); label('WH 31', 1.6, 0.5, -1.45, 7.0, 0.3, -Math.PI / 2 + 0.35);
    // (the bowsprit, short, and the foam where she lies in the water)
    const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4, 8), z3Lam('#3a2c1e')); bs.rotation.x = -Math.PI / 2 + 0.12; sat(bs, 0, KWC.BOW + 1.6, 0.7);
    const fp = [], fi = [];
    for (let i = 0; i <= N; i++) { const y = KWC.STERN - 0.4 + (KWC.BOW + 0.9 - KWC.STERN) * i / N, hw = kwHalfW(Math.min(y, KWC.BOW)) * 0.93; for (const s of [-1, 1]) for (const r of [0, 0.9]) fp.push(s * (hw + r), 0.02, -y); }
    for (let i = 0; i < N; i++) for (let s = 0; s < 2; s++) { const a = i * 4 + s * 2, b = a + 4; fi.push(a, b, a + 1, a + 1, b, b + 1); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi);
    KW3.foamM = new THREE.MeshBasicMaterial({ color: 0x8a9ca4, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    KW3.foam = at(new THREE.Mesh(fg, KW3.foamM), 0, 0, -KWC.FB + 0.03);
  }
  // ---- the skerries: a few far off, and the near ones (they come in as she drifts; in the last part she's on them) ----
  {
    const rk = new THREE.MeshLambertMaterial({ color: 0x0c0e10 }), r = seeded(0xc6a17);
    const rock = (g2, n, sz) => { for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(sz * (0.6 + r() * 0.6), 0), rk); m.position.set((r() - 0.5) * sz * 2, -0.6 + r() * 1.2, (r() - 0.5) * sz * 2); m.scale.y = 0.5 + r() * 0.8; m.rotation.set(r() * 3, r() * 3, r() * 3); g2.add(m); } const f = new THREE.Sprite(soft('rgba(180,200,210,0.4)', 'rgba(180,200,210,0)')); f.scale.set(sz * 5, sz, 1); f.position.y = 0.3; g2.add(f); return g2; };
    for (let i = 0; i < 9; i++) { const a = r() * 6.283, d = 90 + r() * 200, x = Math.cos(a) * d, y = Math.sin(a) * d; if (x < -150 && Math.abs(y - 60) < 50) continue; at(rock(new THREE.Group(), 3, 3 + r() * 3), x, y, -KWC.FB); }
    KW3.near = [];
    for (const [x, y, sz] of [[9, 4, 2.4], [7, -6, 1.8], [11, 11, 3], [-8, 9, 2.2], [-9, -4, 2.6], [6, 15, 2]]) { const g2 = rock(new THREE.Group(), 4, sz); g2.userData.at = [x, y]; at(g2, x * 4, y * 3, -KWC.FB); KW3.near.push(g2); }
  }
  // ---- Skerry Light, far off to the west on its rock, lit and turning ----
  {
    const g2 = new THREE.Group(), M = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k == null ? 0.3 : k), fog: false });
    const H = 34, R = 4.2, T = H + 1, RT = R * 0.72, add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g2.add(m); return m; };
    add(new THREE.CylinderGeometry(R * 3.4, R * 5, 4, 10), M('#2a2c30', 0.3), -1);
    add(new THREE.CylinderGeometry(R * 0.72, R, H, 20), M('#e8e4d8', 0.24), H / 2 + 1);
    for (const y of [H * 0.32, H * 0.62]) add(new THREE.CylinderGeometry(R * (1 - y / H * 0.28) + 0.03, R * (1 - (y - 3) / H * 0.28) + 0.03, 3, 20), M('#b03028', 0.24), y + 1);
    add(new THREE.CylinderGeometry(RT + 1.1, RT + 0.6, 0.6, 20), M('#202224', 0.6), T + 0.3);
    add(new THREE.CylinderGeometry(RT * 0.78, RT * 0.78, 3.4, 16), new THREE.MeshBasicMaterial({ color: 0xffe2a0, fog: false }), T + 2.3);
    add(new THREE.ConeGeometry(RT * 0.95, 2.2, 16), M('#902a24', 0.26), T + 5.1);
    const halo = z3Soft('rgba(255,236,180,0.95)', 'rgba(255,220,150,0)');
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.scale.setScalar(18); glow.position.y = T + 2.3; g2.add(glow);
    const fade = z3Fade([[0, 'rgba(255,236,180,0.38)'], [0.4, 'rgba(255,226,160,0.1)'], [1, 'rgba(255,220,150,0)']]);
    const geo = new THREE.CylinderGeometry(1, 0.05, 1, 32, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(-Math.PI / 2);
    const beam = KW3.beam = new THREE.Group(); beam.position.y = T + 2.3; g2.add(beam);
    const bm = new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
    { const b = new THREE.Mesh(geo, bm); b.scale.set(80, 9, 520); b.frustumCulled = false; b.renderOrder = 9; beam.add(b); }
    KW3.light = at(g2, -420, 160, -KWC.FB);
  }
  // ---- her three lamps: a lantern each, its glass, a glow and a light; lit or dark ----
  KW3.lamps = KW_AT.lamps.map(([x, y, z]) => {
    const g2 = new THREE.Group(); sat(g2, x, y, z);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 8), z3Lam('#2a2a2c')); g2.add(cage);
    const gl = new THREE.MeshBasicMaterial({ color: 0x302820 }), glass = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 10), gl); g2.add(glass);
    const halo = new THREE.Sprite(soft('rgba(255,220,150,0.7)', 'rgba(255,220,150,0)')); halo.scale.setScalar(1.6); g2.add(halo);
    const L = new THREE.PointLight(0xffd090, 0, 11, 1.4); L.position.copy(g2.position); ship.add(L);
    return { g: g2, gl, halo, L };
  });
  // ---- the flares: a hot core, a haze, and a light on everything ----
  KW3.fl = [0, 1, 2, 3].map(() => {
    const g2 = new THREE.Group(); g2.visible = false; grp.add(g2);
    const core = new THREE.Sprite(soft('rgba(255,250,245,1)', 'rgba(255,160,150,0)')); core.scale.setScalar(2); g2.add(core);
    const haze = new THREE.Sprite(soft('rgba(255,140,120,0.5)', 'rgba(255,110,90,0)')); haze.scale.setScalar(22); g2.add(haze);
    const L = new THREE.PointLight(0xffc8b8, 0, 60, 1.1); grp.add(L);
    return { g: g2, core, haze, L };
  });
  // ---- Verity: the round smiling thing (his first picture) on the planks; standing, his second ----
  {
    const s1 = KW3.v1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: kwTex(IMG.verity), transparent: true, depthWrite: true, alphaTest: 0.1 }));
    s1.center.set(0.5, 0.02); s1.visible = false; grp.add(s1);
    const s2 = KW3.v2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: kwTex(IMG.verity2), transparent: true, depthWrite: true, alphaTest: 0.1 }));
    s2.center.set(0.5, 0.01); s2.visible = false; grp.add(s2);
    KW3.vsh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })); KW3.vsh.rotation.x = -Math.PI / 2; KW3.vsh.visible = false; grp.add(KW3.vsh);
    KW3.vL = new THREE.PointLight(0xffe24a, 0, 4, 1.6); grp.add(KW3.vL);
  }
  // ---- the punt in the water, once she's launched (her floor at the deck's height, the sea up round her) ----
  {
    const pg = KW3.punt = new THREE.Group(); sat(pg, KW_PUNT.x, KW_PUNT.y, 0); pg.visible = false;
    const wood = z3Lam('#3a4a52'), in2 = z3Lam('#5a4a36');
    const hullG = new THREE.CylinderGeometry(0.5, 0.5, 3.6, 12, 1, true, Math.PI / 2, Math.PI); hullG.rotateX(Math.PI / 2);
    const h = new THREE.Mesh(hullG, new THREE.MeshLambertMaterial({ color: 0x2a3a42, side: THREE.DoubleSide })); h.scale.set(1.35, 1, 1.1); h.position.y = 0.1; pg.add(h);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 3.3), in2); floor.position.y = -0.04; pg.add(floor);
    for (const z of [-0.9, 0.2, 1.2]) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.26), in2); t.position.set(0, 0.32, z); pg.add(t); }
    for (const s of [-1, 1]) { const g3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.5), wood); g3.position.set(s * 0.66, 0.52, 0); pg.add(g3); const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 6), z3Lam('#6a5a40')); oar.rotation.z = Math.PI / 2 - s * 0.3; oar.position.set(s * 1.5, 0.35, 0.2); pg.add(oar); }
  }
  // ---- the skipper and Jory, on deck (the stage says where, kwNpcAt) ----
  kwNpcBuild();
  KW3.mist = [];
  for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(soft('rgba(120,140,150,0.10)', 'rgba(120,140,150,0)', { blending: THREE.NormalBlending, fog: true })); s.scale.set(14, 3, 1); s.position.copy(z3v(CX + (Math.random() - 0.5) * 30, CY - 30 + i * 9, G0 - 1)); grp.add(s); KW3.mist.push(s); }
  KW3.on = true;
}
function kwNpcBuild() { kwNpcFree(); KW.npc = { skip: cpkNpc(['#4a5a5a', '#d0c0a0', '#6a3a1a', '#ffd88a'], 'oc_whaler'), jory: cpkNpc(['#6a4a2a', '#c8b890', '#3a6a8a', '#ffd88a'], 'oc_gansey') }; }
// (cpkNpcPose's noGun looks for .visible on the weapon itself; the weapon's model is its .root)
function kwNoGun(F) { if (F && F.wpn) for (const k in F.wpn) if (F.wpn[k] && F.wpn[k].root) F.wpn[k].root.visible = false; }
function kwNpcFree() { if (KW.npc) { cpkNpcFree(KW.npc.skip); cpkNpcFree(KW.npc.jory); } KW.npc = null; }
function kw3d(dt) {
  if (!KW3.on || !RAID.st.kw) return;
  const S = RAID.st, St = raidStage() || {}, t = g.t, G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, m = FPS.me;
  if (GL3D.sea && GL3D.sea.visible) GL3D.sea.visible = false;
  if (GL3D.island) for (const c of GL3D.island.children.slice(0, 2)) if (c.visible && c.isMesh) { c.visible = false; c.userData.kwHid = true; }
  KW3.t.value = reduceMotion ? 0 : t;
  // her roll, and in the last part her list (the world outside leans, she doesn't)
  const list = St.kwList ? St.kwList() : 0, roll = reduceMotion ? 0 : Math.sin(t * 0.7) * 0.025 + Math.sin(t * 0.43) * 0.015;
  KW3.out.rotation.set(Math.sin(t * 0.5) * 0.01, 0, roll + list);
  // the sea's height (up round her as she settles), the hull hidden once she's gone
  const seaUp = St.kwSea ? St.kwSea() : 0; KW3.sea.position.y = -KWC.FB + seaUp; KW3.foam.position.y = -KWC.FB + seaUp + 0.03;
  const sunk = !!(St.kwSunk && St.kwSunk()); KW3.hull.visible = !sunk; KW3.foam.visible = !sunk;
  if (GL3D.island) GL3D.island.visible = !sunk;
  // the Light's beam, turning with the shared clock
  KW3.beam.rotation.y = -gwBeam();
  // the near skerries: far off, closer as she drifts, alongside her once she's struck
  const near = St.kwRocks ? St.kwRocks() : 0.4 + 2.6 * (1 - clamp(S.drift, 0, 1));
  for (const r of KW3.near) { const [x, y] = r.userData.at; r.position.set(x * near, -KWC.FB + seaUp * 0.5, -y * near * 0.8); }
  // her lamps
  const gut = S.v.on && S.v.mo <= 0 ? 0.55 + 0.45 * Math.sin(t * 23) * Math.sin(t * 7) : 1;   // (they gutter while he's aboard)
  KW3.lamps.forEach((L, i) => { const on = (S.lamps[i] | 0) > 0 && !sunk, f = (reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 13 + i)) * gut; L.gl.color.setHex(on ? 0xffe0a0 : 0x302820); L.halo.material.opacity = on ? 0.8 * f : 0; L.L.intensity = on ? 1.6 * f : 0; L.g.visible = !sunk; });
  // the flares: up over the deck, hanging and drifting down as they burn
  let flK = 0;
  KW3.fl.forEach((F, i) => {
    const f = S.flares[i]; F.g.visible = !!f && f[2] > 0; F.L.intensity = 0; if (!F.g.visible) return;
    const k = 1 - f[2] / KWC.FLARE, up = k < 0.12, px = f[0] + Math.cos(f[4]) * 3 * k, py = f[1] + Math.sin(f[4]) * 3 * k, pz = up ? 1.5 + 18 * (k / 0.12) : 19.5 - 9 * k;
    const p = z3v(px, py, G0 + pz); F.g.position.copy(p); F.L.position.copy(p);
    const fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 31 + i) * Math.sin(t * 13), burn = clamp(Math.min(f[2], 0.6) / 0.6, 0, 1);
    F.core.scale.setScalar((up ? 0.8 : 2.2) * fl); F.haze.material.opacity = 0.6 * burn * fl; F.L.intensity = (up ? 0.5 : 2.8) * burn * fl;
    flK = Math.max(flK, up ? 0.3 : burn);
    if (!up && Math.random() < dt * 8) FPS.parts.push({ x: px, y: py, z: G0 + pz, vx: Math.random() - 0.5, vy: Math.random() - 0.5, vz: -2, t: 0.6, c: '255,200,180' });
  });
  // the night: dark, the haze closing in (the stage's kwNight: 0 dusk to 1 the dead of night)
  const night = St.kwNight ? St.kwNight() : 1;
  GL3D.amb.intensity = 0.36 - 0.18 * night + 0.14 * flK; GL3D.moon.intensity = 0.16 - 0.1 * night;
  if (GL3D.scene.fog) { const F = GL3D.scene.fog, k = flK * 0.5, d = 1 - night; F.color.setRGB(0.02 + 0.08 * d + 0.05 * k, 0.026 + 0.08 * d + 0.04 * k, 0.04 + 0.09 * d + 0.03 * k); F.near = 18; F.far = 220 + 400 * d + 160 * k; RAID.fog0 = true; }
  if (GL3D.scene.background && GL3D.scene.background.isColor) GL3D.scene.background.setRGB(0.02 + 0.08 * (1 - night), 0.026 + 0.08 * (1 - night), 0.04 + 0.09 * (1 - night));
  KW3.foamM.opacity = 0.1 + 0.05 * Math.sin(t * 1.3);
  for (const [i, s] of KW3.mist.entries()) s.position.x = CX + ((t * 0.6 + i * 9) % 60) - 30;
  // Verity
  kwV3d(dt);
  // the punt in the water
  KW3.punt.visible = !!S.puntOn; if (KW3.punt.visible) { KW3.punt.position.y = Math.sin(t * 1.1) * 0.05; KW3.punt.rotation.z = Math.sin(t * 0.9) * 0.04 - list; }
  // the skipper and Jory
  if (KW.npc) {
    const P = St.kwNpcAt ? St.kwNpcAt() : {};
    for (const k of ['skip', 'jory']) { const F = KW.npc[k], o = P[k]; if (!F) continue; if (!o || sunk && !o.punt) { F.root.visible = false; continue; } const [x, y] = kwW(o.x, o.y); cpkNpcPose(F, { x, y, h: o.h == null ? bearingOf(m.x - x, m.y - y) : o.h, spd: o.spd || 0, p: o.p || 0, noGun: true, lan: o.lan !== false, cr: o.cr || 0, see: 0.7 + 0.3 * flK }); kwNoGun(F); }
  }
}
// Verity in 3D: sitting (a little wrong towards the end), standing, rolling away over the rail
function kwV3d(dt) {
  const S = RAID.st, v = KW.cv || S.v, t = g.t, G0 = FPSC.GROUND + (KW.cv ? KW.cv.z || 0 : 0), m = FPS.me, s1 = KW3.v1, s2 = KW3.v2;
  s1.visible = false; s2.visible = false; KW3.vsh.visible = false; KW3.vL.intensity = 0;
  const lit = 0.55 + 0.45 * Math.max(kwLit() ? 1 : 0, 0.25);
  if (v.on && v.mo <= 0) {
    const wrong = Math.max(0, (v.t - KWC.VT * 0.6) / (KWC.VT * 0.4)), jit = wrong > 0 && !reduceMotion ? (Math.random() - 0.5) * 0.06 * wrong : 0;
    const img = IMG.verity, asp = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 1, h = 0.85 * (1 + Math.sin(t * 2.2) * 0.012);
    s1.visible = true; s1.scale.set(h * asp * (1 + jit), h, 1); s1.position.copy(z3v(v.x + jit, v.y, G0 + 0.02)); s1.material.rotation = Math.sin(t * 1.3) * 0.05 + jit * 2;
    s1.material.color.setScalar(lit); s1.material.opacity = wrong > 0.5 && !reduceMotion && Math.random() < 0.08 * wrong ? 0.3 : 1;
    KW3.vsh.visible = true; KW3.vsh.position.copy(z3v(v.x, v.y, G0 + 0.03)); KW3.vL.position.copy(z3v(v.x, v.y, G0 + 0.6)); KW3.vL.intensity = 0.5;
  } else if (v.on && v.mo > 0) {
    const k = Math.min(1, v.mo / KWC.VM), img = IMG.verity2, asp = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.4;
    if (k < 0.5) { const i1 = IMG.verity, a1 = i1 && i1.naturalWidth ? i1.naturalWidth / i1.naturalHeight : 1, h = 0.85 * (1 + k * 4); s1.visible = true; s1.scale.set(h * a1 * (1 - k * 1.6), h, 1); s1.position.copy(z3v(v.x, v.y, G0)); s1.material.opacity = 1 - k * 1.6; s1.material.rotation = 0; }
    if (k > 0.2) { const h = 2.9 * (0.35 + 0.65 * Math.min(1, (k - 0.2) / 0.8)); s2.visible = true; s2.scale.set(h * asp, h, 1); s2.position.copy(z3v(v.x + (reduceMotion ? 0 : (Math.random() - 0.5) * 0.05), v.y, G0)); s2.material.opacity = Math.min(1, (k - 0.2) / 0.3); s2.material.color.setScalar(lit); }
    KW3.vL.position.copy(z3v(v.x, v.y, G0 + 1.5)); KW3.vL.intensity = 0.8;
  } else if (v.gone > 0) {
    // rolling away to the nearer rail, and over it
    const k = 1 - v.gone / 0.9, [lx, ly] = kwL({ x: v.gx, y: v.gy }), side = lx < 0 ? -1 : 1, rail = side * (kwHalfW(ly) + 0.6), x = v.gx + (FPSC.CX + rail - v.gx) * k, z = G0 + 0.02 + Math.sin(k * Math.PI) * 0.5 - Math.max(0, k - 0.7) * 4;
    const img = IMG.verity, asp = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 1;
    s1.visible = true; s1.scale.set(0.85 * asp, 0.85, 1); s1.position.copy(z3v(x, v.gy, z)); s1.material.rotation = -side * k * 6; s1.material.opacity = 1 - Math.max(0, k - 0.8) * 5;
  }
}
