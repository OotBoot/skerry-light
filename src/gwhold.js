// The Gannet's Wake, Part II: Below Decks (stage gwhold). Up her side from the cutter (Part I, src/gwsail.js) and
// down through the hatch off her weather deck, you come out on the risen Gannet's gun deck: an 1880s brig, a year on
// the bottom and come up again, dark and running with water, lit only by the few lanterns still swinging from her
// beams. Below the gun deck is her hold; forward of the hold, down a few steps into black water, the flooded cable
// tier; forward on the gun deck, the forecastle where her crew slept; aft, the captain's cabin, locked.
//  - The ship, laid out (local x across her, y along her, the bow at +y; heights over the bottom of her, as GWH):
//      the gun deck (GZ): six guns a side on their carriages, run out to shut ports; hammocks slung from the beams,
//        the mainmast and foremast coming down through it, the capstan, two companion stairs down to the hold
//        (each in a railed hatchway), and the ladder you came down by, its grating battened down over you;
//      the forecastle (forward of a bulkhead at y 22): the galley hearth, bunks and sea chests, narrowing to the bow;
//      the captain's cabin (aft of a bulkhead at y -20): its door with three locks, his table, the stern windows;
//      the hold (HZ): ballast stones in the bilge water slopping from side to side, casks lashed in tiers along her
//        sides, the masts' heels and the pumps;
//      the cable tier (forward of the hold, its floor the ship's bottom): flooded to WZ, so deep that down there
//        you're under, holding your breath. The anchor cable lies in great coils on its floor.
//  - Knock, the Gannet's figurehead, walked off her bow: a carved plank of a man taller than any of you, with his
//    rolling eyes, his long nose and his grin, a belaying pin in his fist (his model is src/raidknock.js's, after
//    assets/knock.png, at the size of a figurehead). He hunts whichever of you is nearest by the walk (the drowned's
//    own walking grid, zmNavNext), and he moves only while none of you can see him: you see him if he's in your view
//    (within KN.FOV across and KN.VFOV up and down of where you look), with nothing solid between your eye and some
//    part of him, and either near (KN.NEAR) or lit (a lantern within KN.LIT_R of him) and not too far (KN.SEE).
//    The host judges it for everyone, from where each of you is and which way you're looking (yours from your own
//    camera; a joined player's from their place and heading as last heard). While he moves, three knocks on wood
//    warn anyone within KN.WARN, quicker and louder the nearer he is. If he reaches you, you're down at once,
//    whatever your health or calling: his face lunges at you (the original game's scare), then he's gone into the
//    dark for a while (KN.REST) before he hunts again. Nothing hurts him. Left unseen and far from you all for long,
//    he's somewhere else when you next look: in the dark nearer you.
//  - The cabin's three keys:
//      the Bosun's key: the Bosun, a big drowned man with a boarding axe, guards the hold (a boss on src/zmboss.js's
//        framework, ZBT.bosun: the Diver's blows, a sweep of the axe close in and an overhead chop that rings the
//        floor, in a model of his own). He keeps to the hold. Put him down and his key falls where he does;
//      the cable tier key: on the floor of the flooded cable tier, at its far end among the coils. Under the water
//        you hold your breath (a bar, GWH.BREATH seconds of it); run out and you take a knock every GWH.DROWN seconds
//        until you're up; and the drowned come up at you out of the water;
//      Knock's key: on a cord round Knock's own neck. Hold Use beside him (GWH.TAKE s) to take it: only while he's
//        still (someone watching him), so one of you watches while another goes up to him (alone, keep him in view
//        as you walk up).
//    A key is carried by whoever took it (any of you can carry any of them); it falls where you go down, or where
//    you were if you leave. Use at the cabin door with a key and it's set in its lock (so different players can each
//    set one); with all three set, the door opens; Use it then and the whole team goes on (raidNextStage).
//  - The drowned keep coming, up out of the bilge and through the decks wherever you aren't looking, more of you
//    more of them, as in Maren's End's parts.
//  - On screen: the three keys at the top (who has each, or where it is), whether Knock is moving or held by your
//    eyes, the knocks' warning with a pointer, the breath bar under water, and his lunge if he takes you.
// Host-authoritative, as the rest of the raid (src/raid.js, src/zmnet.js): the host (or one alone) runs Knock, the
// keys, the Bosun and the drowned, and sends them in the stage's part of its word (gk: Knock, gy: the keys, gd: the
// door, ge: what's just happened); a joined player asks the host to take a key ('tk'), take Knock's ('kk'), set
// theirs in the door ('set') or go through ('go'). The Bosun streams with the rest of the drowned, as a boss.
// Hooks: src/raid.js raidRise (a drowned man rising through a deck, not the ground: z.rb), marked [gannet].

const GWH = {
  HZ: 2.8, GZ: 6.2, TH: 0.32, HEAD: 3.0, WZ: 2.55,            // (the hold's floor, the gun deck's, a deck's thickness, the gun deck's headroom, the cable tier's water)
  GW: 6.0, HB: 5.2,                                          // (half her breadth inside: on the gun deck, in the hold)
  AFT: -20, STERN: -27, FORE: 22, BOW: 31,                   // (the cabin's bulkhead and the stern; the forecastle's bulkhead and the bow)
  HAFT: -22, TIER: 17, TEND: 30, TW: 3.6,                    // (the hold's after end; the cable tier: from its bulkhead to its end, half its breadth)
  S1: 0.4, S2: 7.4, SN: 7, SR: 0.425, SRUN: 0.6, SW: 1.0,    // (the companion stairs: where each starts down, its steps, their rise and run, half its breadth)
  MAIN: -4.5, FOREM: 14.5,                                   // (the masts)
  START: [0, -14], BOSUN: [0, -12], KNOCK: [0, 27.5], KEY: [0.3, 28.9],
  BREATH: 9, DROWN: 1.1, REFILL: 2.2, SWIM: 0.68, TAKE: 1.2, USE: 1.0,
  ALIVE: 6, ALIVE_MORE: 3, LEVEL: 9, GAP: [1.5, 2.4],         // (the drowned: at once, alone and for each more of you; as strong as round LEVEL's; the wait between)
};
// Knock: his height, his pace (and further off, and once his key's gone), how near he reaches you, how near he's seen
// even in the dark, how far he's seen at all (lit), the view's half width and half height (a joined player's, judged
// by the host), a lantern's reach for lighting him, how long he rests after taking one of you, how long his lunge,
// how near his knocks are heard, how long unseen and far before he's somewhere else
const KN = { S: 2.6, SP: 4.3, FAR: 7.0, ANGRY: 1.2, REACH: 1.05, NEAR: 15, SEE: 38, FOV: 0.92, VFOV: 0.72, LIT_R: 6.5, REST: 8, LUNGE: 1.45, WARN: 30, LOST: 18 };
const GW_KEYS = [
  { n: 'the Bosun’s key', s: 'Bosun', c: '#d8a85a' },
  { n: 'the cable tier key', s: 'Cable tier', c: '#7ad8c0' },
  { n: 'Knock’s key', s: 'Knock', c: '#e09a5a' },
];
// colours: her timbers by lantern light, wet and old; tar, iron, rope, canvas, weed
const GWC = { o1: '#6a4e34', o2: '#5a4230', o3: '#4a3628', o4: '#3a2a1e', wet: '#2e2620', tar: '#1a1612', iron: '#2c2e30', rust: '#5e3c26', rope: '#8a7650', rope2: '#5a4c36', can: '#9a907a', can2: '#7a7260', brass: '#a8843a', weed: '#2e4e34', weed2: '#3e5a30', red: '#6e2a20', stone: '#5a5852', stone2: '#6e6a60', moon: '#9ab8d8' };
const gwW = (x, y) => [FPSC.CX + x, FPSC.CY + y];
const gwL = (x, y) => [x - FPSC.CX, y - FPSC.CY];
const gwNick = sid => sid === FPS.me.id ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
const gwIx = sid => (ZM.hum || []).findIndex(h => h[0] === sid);
const gwAt = i => ((ZM.hum || [])[i] || [])[0] || null;
// where a place is: in the cable tier (and under its water), in the hold, on the gun deck
const gwInTier = (lx, ly) => Math.abs(lx) < GWH.TW && ly > GWH.TIER && ly < GWH.TEND;
const gwBelow = jz => (jz || 0) < GWH.GZ - 1.2;

// ---------- her timbers: the props she's built of ----------
// (all laid out flat, along u with the prop's angle, v across it, heights over her bottom; the ones with z0/z1 stand
// between those heights whatever the floor under them)
Object.assign(FPI_K, {
  // a deck: planked fore and aft over its beams; a floor to stand on (top), thick TH; under it (seen from the deck
  // below) the beams across her, the carlings between, and the planking's underside
  gwdeck: {
    col: GWC.o2, noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.top, { z0: p.top - (p.th || GWH.TH), fl: true, col: GWC.o2 })]; },
    b3(p, A) {
      const th = p.th || GWH.TH, top = p.top, w = p.w, d = p.d, n = Math.max(1, Math.round(w / 0.24)), sw = w / n;
      A.box(GWC.tar, 0, 0, top - th, w, d, th - 0.05);
      // the planks: strakes along her, each in lengths with its butts staggered
      for (let i = 0; i < n; i++) {
        const u = -w / 2 + (i + 0.5) * sw; let v0 = -d / 2 - ((i * 1.7) % 3.2);
        while (v0 < d / 2) {
          const L = 3.2 + ((i * 7 + Math.floor(v0)) % 3) * 0.6, a = Math.max(v0, -d / 2), b = Math.min(v0 + L, d / 2);
          if (b - a > 0.2) { const k = A.r(); A.box(k < 0.3 ? GWC.o1 : k < 0.75 ? GWC.o2 : GWC.o3, u, (a + b) / 2, top - 0.07, sw * 0.93, b - a - 0.02, 0.07); }
          v0 += L;
        }
      }
      if (p.wet) for (let i = 0; i < p.wet; i++) A.part('disc', '#141210', (A.r() - 0.5) * w * 0.8, (A.r() - 0.5) * d * 0.9, top + 0.005, 0.8 + A.r() * 1.6, 1, 0.6 + A.r() * 1.2, A.r() * 3, 0, 0, 'decal');
      if (p.under === false) return;
      // the beams under it, across her, and the carlings fore and aft between them
      const nb = Math.max(1, Math.round(d / 1.25));
      for (let j = 0; j <= nb; j++) { const v = -d / 2 + j * d / nb; if (p.skip && p.skip.some(([a, b]) => v > a && v < b)) continue; A.box(GWC.o3, 0, v, top - th - 0.26, w, 0.26, 0.27); }
      for (const u of p.carl || []) A.box(GWC.o4, u, 0, top - th - 0.16, 0.16, d, 0.16);
    },
  },
  // a side of her (or any planked wall of her): from z0 to z1, along u for len, th thick; its inside (face: the side
  // of v it's seen from, 1 or -1) planked along her in strakes, ribbed with her frames, with a waterway at its foot
  // and a clamp at its head; gunports (ports: along u) with their lids shut, a sliver of moonlight round each
  gwwall: {
    col: GWC.o3, noShadow: true,
    sol(p) {
      const th = p.th || 0.44, out = [], z0 = p.z0 || 0, o = z0 > 0.05 ? { z0 } : {};
      if (!p.gap) return [fpiBox(p, 0, 0, p.len / 2, th / 2, p.z1, o)];
      const [gu, gw, gz0, gz1] = p.gap, a = gu - gw / 2, b = gu + gw / 2;
      out.push(fpiBox(p, (-p.len / 2 + a) / 2, 0, (a + p.len / 2) / 2, th / 2, p.z1, o), fpiBox(p, (b + p.len / 2) / 2, 0, (p.len / 2 - b) / 2, th / 2, p.z1, o));
      out.push(fpiBox(p, gu, 0, gw / 2, th / 2, p.z1, { z0: gz1 }));
      if (gz0 > z0 + 0.05) out.push(fpiBox(p, gu, 0, gw / 2, th / 2, gz0, o));
      return out;
    },
    b3(p, A) {
      const th = p.th || 0.44, z0 = p.z0 || 0, z1 = p.z1, L = p.len, ports = p.ports || [], pz = p.portZ || 0, gap = p.gap;
      const holes = ports.map(u => [u - 0.45, u + 0.45, pz, pz + 0.8]);
      if (gap) holes.push([gap[0] - gap[1] / 2, gap[0] + gap[1] / 2, gap[2], gap[3]]);
      if (gap) { A.box(GWC.wet, (-L / 2 + holes[holes.length - 1][0]) / 2, 0, z0, holes[holes.length - 1][0] + L / 2, th, z1 - z0); A.box(GWC.wet, (L / 2 + holes[holes.length - 1][1]) / 2, 0, z0, L / 2 - holes[holes.length - 1][1], th, z1 - z0); A.box(GWC.wet, gap[0], 0, gap[3], gap[1], th, z1 - gap[3]); if (gap[2] > z0) A.box(GWC.wet, gap[0], 0, z0, gap[1], th, gap[2] - z0); }
      else A.box(GWC.wet, 0, 0, z0, L, th, z1 - z0);
      for (const f of p.face === 2 ? [1, -1] : [p.face || 1]) { const iv = f * (th / 2 + 0.02);
      // (a run of planking from a to b at height z, h high, round the holes in it)
      const run = (a, b, z, h, col, dv) => {
        let cuts = [[a, b]];
        for (const [h0, h1, hz0, hz1] of holes) if (z + h > hz0 && z < hz1) cuts = cuts.flatMap(([c, d]) => h1 <= c || h0 >= d ? [[c, d]] : [[c, h0], [h1, d]].filter(([e, k]) => k - e > 0.05));
        for (const [c, d] of cuts) A.box(col, (c + d) / 2, iv + (dv || 0), z, d - c, 0.06, h);
      };
      if (p.vert) {
        // (a bulkhead: upright boards, battens across)
        const n = Math.max(2, Math.round(L / 0.26));
        for (let i = 0; i < n; i++) { const u = -L / 2 + (i + 0.5) * L / n; if (gap && u > gap[0] - gap[1] / 2 - 0.05 && u < gap[0] + gap[1] / 2 + 0.05) { if (gap[3] < z1) A.box(i % 2 ? GWC.o2 : GWC.o3, u, iv, gap[3], L / n * 0.94, 0.06, z1 - gap[3]); if (gap[2] > z0 + 0.05) A.box(i % 2 ? GWC.o2 : GWC.o3, u, iv, z0, L / n * 0.94, 0.06, gap[2] - z0); continue; } const k = A.r(); A.box(k < 0.4 ? GWC.o2 : k < 0.8 ? GWC.o3 : GWC.o1, u, iv, z0, L / n * 0.94, 0.06, z1 - z0); }
        for (const z of [z0 + 0.5, (z0 + z1) / 2 + 0.3, z1 - 0.35]) run(-L / 2, L / 2, z, 0.12, GWC.o4, f * 0.05);
      } else {
        const nz = Math.max(2, Math.round((z1 - z0) / 0.22)), sh = (z1 - z0) / nz;
        for (let j = 0; j < nz; j++) {
          const z = z0 + j * sh; let u0 = -L / 2 - ((j * 2.3) % 5.2);
          while (u0 < L / 2) { const Lp = 5.2 + (j % 3) * 1.1, a = Math.max(u0, -L / 2), b = Math.min(u0 + Lp, L / 2); if (b - a > 0.15) { const k = A.r(); run(a, b - 0.02, z, sh * 0.92, j < 2 ? GWC.wet : k < 0.5 ? GWC.o2 : k < 0.9 ? GWC.o3 : GWC.o1); } u0 += Lp; }
        }
        // the frames: ribs every so often, standing proud of the planking; the waterway along the foot, the clamp along the head
        if (p.frames !== false) for (let u = -L / 2 + 0.45; u < L / 2; u += 1.9) {
          if (holes.some(([h0, h1]) => u > h0 - 0.12 && u < h1 + 0.12)) { for (const [h0, h1, hz0, hz1] of holes) if (u > h0 - 0.12 && u < h1 + 0.12) { if (hz0 > z0 + 0.1) A.box(GWC.o4, u, iv + f * 0.08, z0, 0.2, 0.14, hz0 - z0); if (hz1 < z1) A.box(GWC.o4, u, iv + f * 0.08, hz1, 0.2, 0.14, z1 - hz1); } continue; }
          A.box(GWC.o4, u, iv + f * 0.08, z0, 0.2, 0.14 + (p.flare ? 0.1 : 0), z1 - z0);
        }
        A.box(GWC.o4, 0, iv + f * 0.12, z0, L, 0.28, 0.26);
        A.box(GWC.o3, 0, iv + f * 0.12, z1 - 0.32, L, 0.24, 0.3);
      }
      // (a door's frame: its posts and lintel)
      if (gap) { for (const s of [-1, 1]) A.box(GWC.o4, gap[0] + s * (gap[1] / 2 + 0.07), iv + f * 0.06, gap[2], 0.16, 0.16, gap[3] - gap[2]); A.box(GWC.o4, gap[0], iv + f * 0.06, gap[3], gap[1] + 0.3, 0.16, 0.16); }
      // the gunports: a frame round each, the lid shut in it (red inside), moonlight round its edge; a ring bolt either side
      for (const u of ports) {
        A.box(GWC.o4, u, iv + f * 0.06, pz - 0.08, 1.06, 0.12, 0.1); A.box(GWC.o4, u, iv + f * 0.06, pz + 0.8, 1.06, 0.12, 0.1);
        for (const s of [-1, 1]) A.box(GWC.o4, u + s * 0.5, iv + f * 0.06, pz, 0.1, 0.12, 0.8);
        A.box(GWC.red, u, iv - f * 0.08, pz, 0.9, 0.08, 0.8);
        A.box(GWC.moon, u, iv - f * 0.03, pz + 0.79, 0.86, 0.02, 0.025, 0, 0, 0); A.part('box', GWC.moon, u, iv - f * 0.03, pz + 0.79, 0.84, 0.02, 0.02, 0, 0, 0, 'glow');
        for (const s of [-1, 1]) A.part('torus', GWC.iron, u + s * 0.75, iv + f * 0.05, pz + 0.35, 0.16, 0.16, 0.3, 0, Math.PI / 2, 0);
      }
      // weed and barnacles low down, where the sea had her longest
      if (!p.vert && z0 < GWH.HZ + 0.5) for (let i = 0; i < L * 0.8; i++) { const u = (A.r() - 0.5) * L, z = z0 + 0.1 + A.r() * 1.1; if (holes.some(([h0, h1, hz0, hz1]) => u > h0 && u < h1 && z > hz0 && z < hz1)) continue; A.part('ico', A.r() < 0.5 ? '#4a4a40' : '#5a5848', u, iv + f * 0.03, z, 0.08 + A.r() * 0.08, 0.08, 0.06, A.r() * 3); if (A.r() < 0.4) A.part('blade', A.r() < 0.5 ? GWC.weed : GWC.weed2, u, iv + f * 0.05, z - 0.3, 0.12, 0.5 + A.r() * 0.4, 1, A.r() * 3, 0, Math.PI); }
      }
    },
  },
  // a gun: an iron 24-pounder carronade's elder, on its truck carriage, run out to its shut port (its muzzle along +u):
  // the stepped cheeks, four trucks, the bed and quoin, the breeching rope round the cascabel to the side, its tackles
  gwgun: {
    col: GWC.iron,
    sol(p) { return [fpiBox(p, 0.05, 0, 1.0, 0.5, 1.0)]; },
    b3(p, A) {
      const W2 = GWC.o3;
      for (const s of [-1, 1]) {
        A.box(W2, -0.15, s * 0.32, 0.14, 1.3, 0.1, 0.32); A.box(W2, -0.05, s * 0.32, 0.44, 0.95, 0.1, 0.18); A.box(W2, 0.15, s * 0.32, 0.6, 0.45, 0.1, 0.12);
        for (const u of [-0.6, 0.35]) { A.cyl(W2, u, s * 0.42, 0.13, 0.15, 0.08, 0, Math.PI / 2, 0); A.cyl(GWC.iron, u, s * 0.47, 0.13, 0.04, 0.03, 0, Math.PI / 2, 0); }
      }
      for (const u of [-0.6, 0.35]) A.box(W2, u, 0, 0.16, 0.14, 0.8, 0.12);
      A.box(W2, -0.15, 0, 0.3, 1.0, 0.54, 0.06); A.box(GWC.o4, -0.45, 0, 0.36, 0.4, 0.3, 0.12, 0, 0, 0.18);
      A.part('cannon', GWC.iron, 0.25, 0, 0.66, 0.42, 2.1, 0.42, 0, 0, -Math.PI / 2);
      for (const u of [-0.55, 0.05, 0.75, 1.25]) A.cyl(GWC.iron, u, 0, 0.63, u < 0 ? 0.23 : 0.18, 0.06, 0, 0, Math.PI / 2);
      A.part('sph', GWC.iron, -0.88, 0, 0.66, 0.2, 0.2, 0.2); A.part('torus', GWC.iron, -1.0, 0, 0.66, 0.16, 0.16, 0.3, 0, 0, Math.PI / 2);
      A.cyl(GWC.iron, 0.2, 0, 0.66, 0.05, 0.6, 0, Math.PI / 2, 0);
      A.part('sph', GWC.rust, 1.3, 0, 0.66, 0.06, 0.25, 0.25);
      // the breeching: from the side, round the cascabel and back
      for (const s of [-1, 1]) { A.log(GWC.rope2, -0.1, s * 0.62, 0.62, 0.035, 2.3, Math.atan2(s * 0.5, 1.1) + 0, 0.05); A.log(GWC.rope2, 0.55, s * 0.75, 0.45, 0.025, 1.0, Math.PI / 2 + s * 0.3, -0.3); }
      // a rammer and a sponge laid by, now and then; a few shot spilled
      if (A.r() < 0.5) A.log(GWC.o1, -0.6, 0.85, 0.06, 0.03, 2.4, 0.05, 0);
      for (let i = 0; i < 3; i++) if (A.r() < 0.5) A.part('sph', GWC.iron, -1.2 - A.r() * 0.6, (A.r() - 0.5) * 1.2, 0.1, 0.18, 0.18, 0.18);
    },
  },
  // a hammock slung from the beams overhead along her (z: its lowest; drawn only): canvas sagging between two
  // lanyards, a blanket in it, and now and then something still lying in it
  gwhammock: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const L = p.len || 1.9, z = p.z, top = p.top, n = 7;
      for (let i = 0; i < n; i++) { const u = -L / 2 + (i + 0.5) * L / n, k = (2 * (i + 0.5) / n - 1), sag = (1 - k * k) * 0.28; A.box(i % 2 ? GWC.can : GWC.can2, u, 0, z + 0.28 - sag, L / n * 1.05, 0.7, 0.04, 0, 0, k * 0.5); }
      for (const s of [-1, 1]) { A.log(GWC.rope, s * (L / 2 + 0.35), 0, (z + 0.28 + top) / 2, 0.012, top - z - 0.25, 0, Math.PI / 2 - 0.0); A.box(GWC.rope2, s * (L / 2 + 0.15), 0, z + 0.25, 0.4, 0.5, 0.02, 0, 0, s * 0.3); }
      if (p.full) { A.part('sph', p.full === 2 ? '#4a5a52' : '#5a4a3a', 0, 0, z + 0.22, L * 0.7, 0.28, 0.5); if (p.full === 2) { A.log('#6a7a70', L * 0.2, 0.32, z - 0.05, 0.03, 0.5, 0, Math.PI / 2 - 0.2); A.part('sph', '#6a7a70', L * 0.2, 0.36, z - 0.32, 0.07, 0.1, 0.07); } }
    },
  },
  // a mast coming down through her decks to its step on her keelson (from z0 to z1): iron hoops round it; at each
  // deck its partners (an eight-sided collar of wedges); on the gun deck a fife rail round it with its belaying pins
  gwmast: {
    col: GWC.o3,
    sol(p) { return [fpiCirc(p, 0, 0, p.r + 0.06, p.z1)]; },
    b3(p, A) {
      A.cyl(GWC.o2, 0, 0, p.z0, p.r, p.z1 - p.z0, 0, 0, 0, 'cyl8');
      for (let z = p.z0 + 0.8; z < p.z1 - 0.3; z += 1.3) A.cyl(GWC.iron, 0, 0, z, p.r * 1.06, 0.06, 0, 0, 0, 'cyl8');
      for (const z of p.decks || []) { A.cyl(GWC.o4, 0, 0, z, p.r * 1.45, 0.12, Math.PI / 8, 0, 0, 'cyl8'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; A.box(GWC.o3, Math.cos(a) * p.r * 1.12, Math.sin(a) * p.r * 1.12, z + 0.1, 0.1, 0.16, 0.18, a); } }
      if (p.fife) {
        const z = p.fife, R = p.r + 0.75;
        for (const s of [-1, 1]) { A.box(GWC.o3, 0, s * R, z + 0.85, R * 2 + 0.2, 0.18, 0.1); for (const u of [-R, R]) A.box(GWC.o4, u, s * R, z, 0.14, 0.14, 0.9); for (let i = 0; i < 6; i++) { const u = -R + 0.25 + i * (2 * R - 0.5) / 5; A.cyl(GWC.o1, u, s * R, z + 0.75, 0.025, 0.42); if (A.r() < 0.6) { for (let k = 0; k < 3; k++) A.part('torus', GWC.rope, u, s * (R + 0.04), z + 0.55 - k * 0.07, 0.24, 0.24, 0.45, 0, Math.PI / 2, 0); } } }
      }
      if (p.step) { A.box(GWC.o4, 0, 0, p.z0, p.r * 4, p.r * 3, 0.5); for (let i = 0; i < 5; i++) A.part('ico', A.r() < 0.5 ? '#4a4a40' : GWC.weed, (A.r() - 0.5) * p.r * 3, (A.r() - 0.5) * p.r * 2, p.z0 + 0.5, 0.1, 0.1, 0.1, A.r() * 3); }
    },
  },
  // the capstan: its barrel with the whelps standing out, the drumhead pierced for the bars, the pawls at its foot
  gwcapstan: {
    col: GWC.o3,
    sol(p) { return [fpiCirc(p, 0, 0, 0.62, 1.05)]; },
    b3(p, A) {
      A.cyl(GWC.o4, 0, 0, -0.05, 0.75, 0.12, 0, 0, 0, 'cyl8');
      A.cyl(GWC.o2, 0, 0, 0, 0.36, 0.95, 0, 0, 0, 'cyl8');
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; A.box(GWC.o3, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.1, 0.12, 0.14, 0.6, a); }
      A.cyl(GWC.o3, 0, 0, 0.75, 0.62, 0.28, 0, 0, 0, 'cyl8'); A.cyl(GWC.iron, 0, 0, 1.01, 0.62, 0.03, 0, 0, 0, 'cyl8');
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; A.box(GWC.tar, Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.84, 0.06, 0.12, 0.12, a); }
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; A.box(GWC.iron, Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.04, 0.3, 0.06, 0.06, a + 0.4); }
      // two of its bars, shipped and forgotten
      for (const a of [0.6, 3.9]) A.box(GWC.o1, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0.88, 2.0, 0.09, 0.09, a);
    },
  },
  // a companion stair down from a deck: n steps, each down by rise and along +u by run (a floor to stand on, solid to
  // the bottom of her); drawn as open treads on two stringers, with a handrope down each side and boards shut under it
  gwstair: {
    col: GWC.o2, noShadow: true,
    sol(p) { const out = []; for (let k = 0; k < p.n; k++) out.push(fpiBox(p, (k + 0.5) * p.run, 0, p.run / 2, p.w / 2, p.top - (k + 1) * p.rise, { fl: true, col: GWC.o2 })); return out; },
    b3(p, A) {
      const L = p.n * p.run, bot = p.top - p.n * p.rise, ang = Math.atan2(p.n * p.rise, L);
      for (let k = 0; k < p.n; k++) { const z = p.top - (k + 1) * p.rise; A.box(k % 2 ? GWC.o1 : GWC.o2, (k + 0.5) * p.run, 0, z - 0.07, p.run * 0.92, p.w - 0.1, 0.07); A.box(GWC.o4, (k + 0.95) * p.run, 0, z - 0.3, 0.05, p.w - 0.12, 0.23); }
      for (const s of [-1, 1]) {
        A.part('box', GWC.o4, L / 2, s * (p.w / 2 - 0.02), (p.top + bot) / 2 - 0.2, Math.hypot(L, p.n * p.rise) + 0.3, 0.32, 0.08, 0, 0, -ang);
        A.box(GWC.o3, L / 2, s * (p.w / 2 + 0.02), bot - p.rise, L, 0.04, (p.top - bot) * 0.55);
        A.part('box', GWC.rope, L / 2, s * (p.w / 2 + 0.02), (p.top + bot) / 2 + 0.75, Math.hypot(L, p.n * p.rise), 0.04, 0.04, 0, 0, -ang);
        for (const k of [0, p.n - 1]) A.box(GWC.o4, (k + 0.5) * p.run, s * (p.w / 2 + 0.02), p.top - (k + 1) * p.rise, 0.07, 0.07, 1.0);
      }
    },
  },
  // a rail round a hatchway: posts and a rail (and a lower one), a rope through; solid to stop a fall into it
  gwrail: {
    col: GWC.o3,
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, 0.08, p.base + 1.05, { z0: p.base })]; },
    b3(p, A) {
      const n = Math.max(2, Math.round(p.len / 1.1));
      for (let i = 0; i <= n; i++) A.box(GWC.o4, -p.len / 2 + i * p.len / n, 0, p.base, 0.09, 0.09, 1.05);
      A.box(GWC.o2, 0, 0, p.base + 0.98, p.len + 0.08, 0.12, 0.07); A.box(GWC.o3, 0, 0, p.base + 0.5, p.len, 0.06, 0.06);
      A.box(GWC.o4, 0, 0, p.base, p.len + 0.1, 0.22, 0.28);
    },
  },
  // casks in tiers along her side, lying on their sides on dunnage and chocked, lashed: n along u, tiers high
  gwcasks: {
    col: GWC.o3,
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, 0.75, p.base + (p.tiers || 2) * 0.72 - 0.05, { z0: p.base })]; },
    b3(p, A) {
      const n = Math.max(1, Math.round(p.len / 0.95)), du = p.len / n, b = p.base;
      A.box(GWC.o4, 0, 0, b, p.len, 1.4, 0.06);
      for (let t = 0; t < (p.tiers || 2); t++) for (let i = 0; i < n - (t ? (A.r() < 0.4 ? 1 : 0) : 0); i++) {
        const u = -p.len / 2 + (i + 0.5 + t * 0.5 * (i < n - 1 ? 1 : 0)) * du; if (u > p.len / 2 - du * 0.4) continue;
        const z = b + 0.37 + t * 0.7, c = A.r() < 0.5 ? '#5e4430' : '#4e3a28';
        A.log(c, u, 0, z, 0.36, 1.35, Math.PI / 2, 0, 'cyl8'); A.log(c, u, 0, z, 0.39, 0.9, Math.PI / 2, 0, 'cyl8');
        for (const f of [-0.52, -0.22, 0.22, 0.52]) A.log(GWC.iron, u, f, z, 0.375 + (Math.abs(f) < 0.3 ? 0.03 : 0), 0.05, Math.PI / 2, 0, 'cyl8');
      }
      for (let u = -p.len / 2 + 0.6; u < p.len / 2; u += 1.9) A.box(GWC.rope2, u, 0, b + 0.05, 0.05, 1.42, (p.tiers || 2) * 0.72);
    },
  },
  // casks standing on end in a huddle (water, beef, rum), some stove in
  gwbarrels: {
    col: GWC.o3,
    sol(p) { return [fpiCirc(p, 0, 0, p.r || 0.9, p.base + 1.0, { z0: p.base })]; },
    b3(p, A) {
      const R = (p.r || 0.9) - 0.35, k = p.n || 4;
      for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2 + A.r() * 0.5, u = Math.cos(a) * R * (i ? 1 : 0.2), v = Math.sin(a) * R * (i ? 1 : 0.2), h = 0.85 + A.r() * 0.2, b = p.base;
        A.cyl(A.r() < 0.5 ? '#5e4430' : '#4e3a28', u, v, b, 0.33, h, 0, 0, 0, 'cyl8'); for (const f of [0.12, 0.5, 0.88]) A.cyl(GWC.iron, u, v, b + h * f - 0.025, 0.35, 0.05, 0, 0, 0, 'cyl8');
        if (A.r() < 0.3) A.cyl('#141210', u, v, b + h, 0.28, 0.02); else A.cyl(GWC.o3, u, v, b + h, 0.3, 0.02); }
    },
  },
  // ballast: a heap of round stones and pig iron in the bilge (low enough to step up on)
  gwballast: {
    col: GWC.stone,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.base + 0.38, { z0: p.base - 0.2, fl: true, col: GWC.stone })]; },
    b3(p, A) {
      const n = Math.round(p.w * p.d * 5);
      for (let i = 0; i < n; i++) { const u = (A.r() - 0.5) * p.w, v = (A.r() - 0.5) * p.d, e = 1 - Math.max(Math.abs(u) / p.w, Math.abs(v) / p.d) * 1.6, s = 0.18 + A.r() * 0.2; A.part('ico', A.r() < 0.5 ? GWC.stone : GWC.stone2, u, v, p.base + Math.max(0, e) * 0.25 + s * 0.3, s, s * 0.7, s * 0.9, A.r() * 3); }
      for (let i = 0; i < Math.round(p.w * 1.5); i++) A.box(GWC.rust, (A.r() - 0.5) * p.w * 0.8, (A.r() - 0.5) * p.d * 0.8, p.base + 0.2, 0.9, 0.16, 0.13, A.r() * 3);
    },
  },
  // the great anchor cable, flaked down in a coil on the tier's floor (r across, hh high), weed through it
  gwcoil: {
    col: GWC.rope2,
    sol(p) { return [fpiCirc(p, 0, 0, p.r, p.base + p.hh, { z0: p.base })]; },
    b3(p, A) {
      const n = Math.round(p.hh / 0.11);
      for (let j = 0; j < n; j++) for (let r = p.r - 0.12; r > 0.35; r -= 0.22) A.part('torus', j % 2 ? GWC.rope2 : '#4a3e2c', 0, 0, p.base + 0.06 + j * 0.11, r * 2, r * 2, 2.2, 0, Math.PI / 2, 0);
      A.cyl('#141210', 0, 0, p.base + p.hh - 0.05, 0.36, 0.06);
      for (let i = 0; i < 8; i++) { const a = A.r() * 6.28; A.part('blade', A.r() < 0.5 ? GWC.weed : GWC.weed2, Math.cos(a) * p.r * 0.9, Math.sin(a) * p.r * 0.9, p.base + p.hh * A.r(), 0.15, 0.5 + A.r() * 0.5, 1, a, (A.r() - 0.5) * 0.6, 0); }
      if (p.lead) A.part('cannon', GWC.rope2, 0, p.r + 0.3, p.base + p.hh - 0.1, 0.24, 1.2, 0.24, 0, 0.9, 0);
    },
  },
  // the galley's firehearth: a brick base, the iron range with its coppers, the chimney up through the deck; its fire
  // long out, but embers that won't die
  gwhearth: {
    col: GWC.iron,
    sol(p) { return [fpiBox(p, 0, 0, 0.9, 0.7, p.base + 1.3, { z0: p.base })]; },
    b3(p, A) {
      const b = p.base;
      A.box('#5a3a30', 0, 0, b, 2.0, 1.6, 0.25); A.box(GWC.iron, 0, 0, b + 0.25, 1.7, 1.3, 1.0); A.box('#3a3c40', 0, 0, b + 1.22, 1.8, 1.4, 0.06);
      for (const u of [-0.42, 0.42]) { A.cyl('#7a4a2a', u, 0.1, b + 1.28, 0.3, 0.42, 0, 0, 0, 'cyl8'); A.cyl('#5a3820', u, 0.1, b + 1.7, 0.32, 0.04, 0, 0, 0, 'cyl8'); }
      A.box('#0e0c0a', 0, -0.66, b + 0.4, 0.8, 0.04, 0.4); A.part('box', '#ff6a20', 0, -0.67, b + 0.48, 0.6, 0.18, 0.02, 0, 0, 0, 'glow');
      A.cyl(GWC.iron, 0, 0.35, b + 1.25, 0.16, p.top - b - 1.25);
      for (let i = 0; i < 4; i++) A.cyl('#3a3c40', -0.75 + i * 0.12, -0.7, b + 1.0, 0.04, 0.3);
    },
  },
  // a sea chest with its rope beckets, the lid a little open on whatever's left in it
  gwchest: {
    col: GWC.o3,
    sol(p) { return [fpiBox(p, 0, 0, 0.5, 0.3, p.base + 0.5, { z0: p.base })]; },
    b3(p, A) { const b = p.base; A.box(A.r() < 0.5 ? '#3e4a52' : '#5a3a28', 0, 0, b, 1.0, 0.55, 0.42); A.box(GWC.o4, 0, 0.05, b + 0.42, 1.04, 0.6, 0.06, 0, -0.1 * A.r()); for (const s of [-1, 1]) A.part('torus', GWC.rope, s * 0.53, 0, b + 0.3, 0.16, 0.16, 0.4, Math.PI / 2, 0, 0); },
  },
  // a crew's bunk against the forecastle's side (two high)
  gwbunk: {
    col: GWC.o3,
    sol(p) { return [fpiBox(p, 0, 0, 0.95, 0.42, p.base + 1.8, { z0: p.base })]; },
    b3(p, A) {
      const b = p.base;
      for (const su of [-1, 1]) A.box(GWC.o4, su * 0.92, 0.38, b, 0.08, 0.08, 1.9);
      for (const h of [0.3, 1.2]) { A.box(GWC.o3, 0, 0, b + h, 1.9, 0.82, 0.08); A.box(GWC.o2, 0, 0.38, b + h, 1.9, 0.06, 0.3); A.box(GWC.can2, 0.1, 0, b + h + 0.08, 1.6, 0.7, 0.1); if (A.r() < 0.6) A.box(A.r() < 0.5 ? '#4a2a26' : '#2e3a4e', 0.3, 0, b + h + 0.18, 1.1, 0.72, 0.05); }
    },
  },
  // the ladder up to the weather deck, its grating battened down over it from above (the way you came in): moonlight
  // through the grating's squares
  gwladder: {
    col: GWC.o3,
    sol(p) { return [fpiBox(p, 0, 0, 0.55, 0.3, p.top, { z0: p.base })]; },
    b3(p, A) {
      const b = p.base, h = p.top - b, ang = 0.22;
      for (const s of [-1, 1]) A.part('box', GWC.o4, s * 0.45, 0, b + h / 2, 0.08, h + 0.1, 0.12, 0, ang, 0);
      for (let z = 0.3; z < h; z += 0.32) A.box(GWC.o2, 0, -Math.sin(ang) * (z - h / 2), b + z, 0.86, 0.12, 0.06);
      A.box(GWC.o4, 0, -0.4, p.top - 0.1, 1.5, 1.5, 0.12);
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { A.part('box', GWC.moon, i * 0.24, -0.4 + j * 0.24, p.top + 0.02, 0.15, 0.02, 0.15, 0, 0, 0, 'glow'); A.box(GWC.o4, i * 0.24, -0.4 + j * 0.24, p.top - 0.02, 0.06, 1.2, 0.08); }
    },
  },
  // the chain pump beside the mainmast in the hold: two cisterns and their brake
  gwpump: {
    col: GWC.o3,
    sol(p) { return [fpiBox(p, 0, 0, 0.7, 0.35, p.base + 1.2, { z0: p.base })]; },
    b3(p, A) { const b = p.base; for (const u of [-0.42, 0.42]) { A.cyl(GWC.o3, u, 0, b, 0.26, 1.15, 0, 0, 0, 'cyl8'); A.cyl(GWC.iron, u, 0, b + 1.1, 0.28, 0.06, 0, 0, 0, 'cyl8'); A.box(GWC.o2, u, -0.35, b + 0.9, 0.12, 0.5, 0.08); } A.box(GWC.o4, 0, 0, b + 1.2, 1.5, 0.12, 0.12); A.box(GWC.iron, 0, 0.1, b + 1.25, 2.4, 0.06, 0.06); },
  },
  // shot in a garland: a plank with hollows along the hatch's coaming, round shot sitting in them
  gwshot: {
    noShadow: true, sol() { return []; },
    b3(p, A) { A.box(GWC.o3, 0, 0, p.base, p.len, 0.3, 0.14); for (let u = -p.len / 2 + 0.2; u < p.len / 2 - 0.1; u += 0.28) if (A.r() < 0.85) A.part('sph', GWC.iron, u, 0, p.base + 0.24, 0.22, 0.22, 0.22); },
  },
  // the captain's cabin: his table with the chart on it, the dividers and a bottle; his chair; the bench across the
  // stern under the windows, which are lit by the moon on the water behind her
  gwcabin: {
    noShadow: true, sol(p) { return [fpiBox(p, 0, 1.2, 1.3, 0.6, p.base + 0.82, { z0: p.base })]; },
    b3(p, A) {
      const b = p.base;
      A.box(GWC.o2, 0, 1.2, b + 0.74, 2.6, 1.2, 0.08); for (const su of [-1, 1]) for (const sv of [-1, 1]) A.box(GWC.o4, su * 1.2, 1.2 + sv * 0.5, b, 0.1, 0.1, 0.76);
      A.box('#c8bc98', -0.2, 1.2, b + 0.82, 1.4, 0.9, 0.01); A.box('#5a4a30', 0.3, 1.0, b + 0.83, 0.4, 0.02, 0.005); A.cyl('#2a4a3a', 0.9, 1.4, b + 0.82, 0.07, 0.3); A.cyl(GWC.brass, -0.8, 0.9, b + 0.82, 0.06, 0.12);
      A.box(GWC.o3, 0, 2.4, b, 0.6, 0.55, 0.5); A.box(GWC.o3, 0, 2.66, b + 0.5, 0.6, 0.06, 0.6);
      A.box(GWC.o3, 0, -1.6, b, 9.0, 0.7, 0.5); A.box('#4a2a26', 0, -1.6, b + 0.5, 9.0, 0.66, 0.1);
      for (let i = -3; i <= 3; i++) { A.part('box', '#5a7a98', i * 1.3, -2.05, b + 1.6, 0.9, 1.0, 0.02, 0, 0, 0, 'glow'); for (const k of [-1, 0, 1]) A.box(GWC.o4, i * 1.3 + k * 0.3, -2.0, b + 1.1, 0.04, 0.05, 1.0); A.box(GWC.o4, i * 1.3, -2.0, b + 1.6, 0.9, 0.05, 0.04); A.box(GWC.o3, i * 1.3 + 0.55, -2.0, b + 0.9, 0.2, 0.1, 1.5); }
      A.box(GWC.o4, 0, -2.0, b + 0.8, 9.2, 0.14, 0.16); A.box(GWC.o4, 0, -2.0, b + 2.4, 9.2, 0.14, 0.16);
      A.box('#3a2a22', 3.6, 1.6, b, 1.9, 0.8, 0.7);
    },
  },
});

// ---------- laying her out ----------
const GWL = { lamps: [], door: null, spawn: [] };
const GW_ZONES = {
  gwgun: { n: 'the gun deck', r: [-6.4, 6.4, -20, 22], zr: [GWH.GZ, 99] },
  gwfc: { n: 'the forecastle', r: [-6.4, 6.4, 22, 31.6], zr: [GWH.GZ, 99] },
  gwcab: { n: 'the captain’s cabin', r: [-6.2, 6.2, -27.6, -20], zr: [GWH.GZ, 99] },
  gwhold: { n: 'the hold', r: [-5.6, 5.6, -22.6, 17], zr: [-9, GWH.GZ] },
  gwtier: { n: 'the cable tier', r: [-4, 4, 17, 30.4], zr: [-9, GWH.GZ] },
};
// her look, inside: no sky, a close brown dark (src/fpsisle.js lays her out by FPI_GEN.gwhold, as the raid's own)
FPS_ISLES.gwhold = Object.assign({}, FPS_ISLES.raid, { name: 'the Gannet', ground: '#1a1612', ground2: '#16120e', wet: '#100e0c', path: '#1a1612', fog: ['#070605', 5, 36], nLights: 10 });
FPI_GEN.gwhold = FPI_GEN.raid;
function gwSet(H, K, Z) {
  const { put, light } = K, I = H.I, G = GWH, GZ = G.GZ, HZ = G.HZ, TOP = GZ + G.HEAD, UND = GZ - G.TH;
  GWL.lamps = []; GWL.door = null;
  // a lantern hung from a beam (swinging: src/gwhold.js gw3d moves its light with it)
  const lamp = (x, y, z, c, r, hook) => { light(x, y, z, c || '#ffb860', r || 9, 'lantern'); const l = I.lights[I.lights.length - 1]; GWL.lamps.push({ l, x, y, z, hook: hook || z + 0.8, ph: GWL.lamps.length * 1.7, c: c || '#ffb860' }); };
  const deck = (x0, x1, y0, y1, top, o) => put('gwdeck', (x0 + x1) / 2, (y0 + y1) / 2, 0, Object.assign({ w: x1 - x0, d: y1 - y0, top }, o || {}));
  // a planked wall from (x0, y0) to (x1, y1), its inside towards (cx, cy), its inner face on the line
  const seg = (x0, y0, x1, y1, cx, cy, o) => {
    const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0), vx = -Math.sin(ang), vy = Math.cos(ang), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const face = o && o.face === 2 ? 2 : Math.sign((cx - mx) * vx + (cy - my) * vy) || 1, th = (o && o.th) || 0.44, sh = face === 2 ? 0 : -face * th / 2;
    return put('gwwall', mx + vx * sh, my + vy * sh, ang, Object.assign({ len: len + (o && o.ext != null ? o.ext : 0.5), face, th }, o || {}));
  };
  // ---- the decks ----
  // the hold's floor (solid to her bottom), the cable tier's floor (her bottom), the gun deck round its two hatchways,
  // the cabin's and the forecastle's floors, and over it all the weather deck (her ceiling here)
  deck(-G.HB - 0.1, G.HB + 0.1, G.HAFT - 0.2, G.TIER, HZ, { th: HZ, under: false, wet: 26 });
  deck(-G.TW - 0.1, G.TW + 0.1, G.TIER, G.TEND + 0.1, 0.05, { th: 0.05, under: false });
  const BEAMS = [[G.S1 - 0.2, G.S1 + 4.8], [G.S2 - 0.2, G.S2 + 4.8]];
  deck(-6.3, 6.3, G.AFT - 0.2, G.S1, GZ, { carl: [-1.2, 1.2] });
  deck(-6.3, -1.1, G.S1, G.S1 + 4.6, GZ, { carl: [] }); deck(1.1, 6.3, G.S1, G.S1 + 4.6, GZ, { carl: [] });
  deck(-6.3, 6.3, G.S1 + 4.6, G.S2, GZ, { carl: [-1.2, 1.2] });
  deck(-6.3, -1.1, G.S2, G.S2 + 4.6, GZ, { carl: [] }); deck(1.1, 6.3, G.S2, G.S2 + 4.6, GZ, { carl: [] });
  deck(-6.3, 6.3, G.S2 + 4.6, G.FORE, GZ, { carl: [-1.2, 1.2], wet: 8 });
  deck(-6.3, 6.3, G.FORE, G.BOW, GZ, { carl: [], wet: 6 });
  deck(-5.8, 5.8, G.STERN, G.AFT - 0.2, GZ, { under: false });
  deck(-6.5, 6.5, G.STERN - 0.4, G.BOW + 0.4, TOP + 0.3, { th: 0.3, carl: [-2.2, 2.2] });
  // ---- her sides ----
  // the gun deck's, with six ports a side; the hold's, below; the stern of the hold
  const PORTS = [-15, -9, -3, 3, 9, 15];
  for (const s of [-1, 1]) {
    seg(s * G.GW, G.AFT, s * G.GW, G.FORE, 0, 0, { z0: GZ - 0.05, z1: TOP + 0.05, ports: PORTS.map(y => y - (G.AFT + G.FORE) / 2), portZ: GZ + 0.55, ext: 0.2 });
    seg(s * G.HB, G.HAFT, s * G.HB, G.TIER, 0, 0, { z0: 0, z1: UND + 0.02, ext: 0.4 });
  }
  seg(-G.HB, G.HAFT, G.HB, G.HAFT, 0, 0, { z0: 0, z1: UND + 0.02, vert: false });
  // the forecastle's sides, narrowing to the bow; the cabin's sides and the stern, with the cabin's windows
  for (const s of [-1, 1]) { seg(s * G.GW, G.FORE, s * 4.8, 27.4, 0, 24, { z0: GZ - 0.05, z1: TOP + 0.05 }); seg(s * 4.8, 27.4, s * 2.6, 30.7, 0, 24, { z0: GZ - 0.05, z1: TOP + 0.05 }); }
  seg(-2.6, 30.7, 2.6, 30.7, 0, 24, { z0: GZ - 0.05, z1: TOP + 0.05 });
  for (const s of [-1, 1]) seg(s * 5.6, G.AFT, s * 5.6, G.STERN, 0, -23, { z0: GZ - 0.05, z1: TOP + 0.05, ext: 0.4 });
  seg(-5.6, G.STERN, 5.6, G.STERN, 0, -23, { z0: GZ - 0.05, z1: TOP + 0.05 });
  // the bulkheads: the cabin's (its door shut on three locks: drawn and made solid by the stage), the forecastle's,
  // and the cable tier's (a low door in it, onto the landing over the water)
  seg(-G.GW - 0.2, G.AFT, G.GW + 0.2, G.AFT, 0, 0, { z0: GZ - 0.05, z1: TOP + 0.05, face: 2, vert: true, th: 0.3, gap: [0, 1.5, GZ, GZ + 2.3], ext: 0 });
  seg(-G.GW - 0.2, G.FORE, G.GW + 0.2, G.FORE, 0, 0, { z0: GZ - 0.05, z1: TOP + 0.05, face: 2, vert: true, th: 0.3, gap: [0, 2.4, GZ, GZ + 2.4], ext: 0 });
  seg(-G.HB - 0.2, G.TIER, G.HB + 0.2, G.TIER, 0, 0, { z0: 0, z1: UND + 0.02, face: 2, vert: true, th: 0.36, gap: [0, 1.6, HZ, HZ + 2.3], ext: 0 });
  for (const s of [-1, 1]) seg(s * G.TW, G.TIER, s * G.TW, G.TEND, 0, 23, { z0: 0, z1: UND + 0.02, ext: 0.4 });
  seg(-G.TW, G.TEND, G.TW, G.TEND, 0, 23, { z0: 0, z1: UND + 0.02 });
  { const [dx, dy] = gwW(0, G.AFT); GWL.door = { s: 'b', x: dx, y: dy, ang: 0, hw: 0.78, hd: 0.14, z0: FPSC.GROUND + GZ - 0.05, z1: FPSC.GROUND + GZ + 2.3, br: 0.8, col: GWC.o3, gw: true }; I.solids.push(GWL.door); }
  // ---- the companion stairs, their hatchways railed; the ladder you came down ----
  for (const y0 of [G.S1, G.S2]) {
    put('gwstair', 0, y0, Math.PI / 2, { n: G.SN, run: G.SRUN, rise: G.SR, w: 2 * G.SW, top: GZ });
    const L = G.SN * G.SRUN + 0.4;
    for (const s of [-1, 1]) { put('gwrail', s * 1.2, y0 + L / 2, Math.PI / 2, { len: L, base: GZ }); put('gwshot', s * 1.55, y0 + L / 2, Math.PI / 2, { len: L - 0.4, base: GZ }); }
    put('gwrail', 0, y0 + L + 0.08, 0, { len: 2.5, base: GZ });
  }
  put('gwladder', 0, -16.9, 0, { base: GZ, top: TOP });
  // ---- the gun deck ----
  put('gwmast', 0, G.MAIN, 0, { r: 0.38, z0: HZ, z1: TOP, decks: [HZ, GZ], fife: GZ, step: true });
  put('gwmast', 0, G.FOREM, 0, { r: 0.33, z0: HZ, z1: TOP, decks: [HZ, GZ], fife: GZ, step: true });
  put('gwcapstan', 0, -10.3, 0.4, { lift: GZ });
  for (const s of [-1, 1]) for (const y of PORTS) put('gwgun', s * 4.85, y, s > 0 ? 0 : Math.PI, { lift: GZ });
  { const rr = seeded(0x6a11); for (const s of [-1, 1]) for (let y = -18.4; y < 20; y += 1.25) { if (rr() < 0.42) continue; put('gwhammock', s * (2.7 + rr() * 0.4), y, Math.PI / 2 + (rr() - 0.5) * 0.1, { z: GZ + 2.05 + rr() * 0.25, top: TOP - 0.25, full: rr() < 0.35 ? (rr() < 0.25 ? 2 : 1) : 0 }); } }
  for (const [x, y, a] of [[-2.2, -18.6, 0.3], [2.4, -18.2, -0.2], [-1.8, 20.6, 0.1], [2.6, 19.8, 1.2]]) put('gwchest', x, y, a, { base: GZ });
  put('gwbarrels', -3.0, -18.4, 0, { base: GZ, r: 0.85, n: 3 }); put('gwbarrels', 3.1, 20.4, 0, { base: GZ, r: 0.85, n: 4 });
  lamp(0, -17.6, GZ + 2.25); lamp(1.7, -7.6, GZ + 2.2); lamp(-1.7, 6.3, GZ + 2.2, '#ffa850'); lamp(1.7, 13.2, GZ + 2.2); lamp(0, 19.6, GZ + 2.2, '#ff9a48', 8);
  // ---- the forecastle: the galley's hearth, the crew's bunks and chests ----
  put('gwhearth', -3.1, 24.4, 0, { base: GZ, top: TOP });
  for (const [x, y, a] of [[4.3, 24.2, -Math.PI / 2 + 0.24], [3.5, 27.6, -Math.PI / 2 + 0.6], [-3.6, 27.4, Math.PI / 2 - 0.6]]) put('gwbunk', x, y, a, { base: GZ });
  for (const [x, y, a] of [[1.6, 25.6, 0.4], [-1.4, 29.2, -0.2], [2.0, 29.4, 0.2]]) put('gwchest', x, y, a, { base: GZ });
  lamp(0.6, 25.8, GZ + 2.1, '#ff9a40', 7);
  // ---- the captain's cabin ----
  put('gwcabin', 0, -24.6, 0, { base: GZ });
  lamp(0, -23.4, GZ + 2.2, '#ffc070', 8);
  // ---- the hold: casks lashed along her sides, ballast in the bilge, the pumps, water casks huddled ----
  for (const [s, y0, y1] of [[-1, -21.4, -16.2], [-1, -13.4, -7.2], [-1, -1.6, 2.6], [-1, 8.2, 12.6], [1, -19.6, -14.2], [1, -10.2, -5.6], [1, 1.2, 6.2], [1, 9.4, 15.6]]) put('gwcasks', s * (G.HB - 0.8), (y0 + y1) / 2, Math.PI / 2, { len: y1 - y0, base: HZ, tiers: 2 });
  for (const [x, y, w, d, a] of [[-2.2, -17.4, 2.4, 2.0, 0.2], [2.3, -8.6, 1.8, 2.6, -0.1], [-2.3, 9.6, 2.0, 2.0, 0.3], [2.0, -19.8, 1.6, 1.4, 0.5], [-2.4, 15.2, 1.8, 1.4, 0]]) put('gwballast', x, y, a, { w, d, base: HZ });
  put('gwpump', 1.3, G.MAIN, Math.PI / 2, { base: HZ });
  for (const [x, y] of [[-3.2, -3.8], [3.4, 7.6], [-3.2, 15.8], [3.3, -12.2]]) put('gwbarrels', x, y, 0, { base: HZ, r: 0.85, n: 4 });
  lamp(0, -19.2, HZ + 2.3, '#ffb060', 9); lamp(-1.8, -11.6, HZ + 2.3); lamp(2.0, -1.6, HZ + 2.3); lamp(-2.0, 6.0, HZ + 2.3, '#ffa850'); lamp(2.0, 13.4, HZ + 2.3, '#ff9a48', 8);
  // ---- the cable tier: a landing inside its door, steps down into the water, the cable's coils on the floor ----
  put('gwstair', 0, G.TIER, Math.PI / 2, { n: 1, run: 1.4, rise: 0, w: 2.8, top: HZ });
  put('gwstair', 0, G.TIER + 1.4, Math.PI / 2, { n: 5, run: 0.62, rise: 0.5, w: 2.8, top: HZ });
  for (const [x, y, r, hh] of [[-2.35, 23.6, 1.05, 1.1], [0.35, 24.3, 0.7, 0.8], [2.35, 25.6, 1.05, 1.2], [-2.3, 27.9, 1.0, 1.0], [2.4, 28.9, 0.85, 0.7]]) put('gwcoil', x, y, 0, { r, hh, base: 0.05 });
  lamp(0, G.TIER + 0.8, HZ + 1.95, '#ffa040', 6, UND);
  // ---- the drowned's ways up: where they can come from on each deck ----
  GWL.spawn = [
    { k: 'gun', z: GZ, r: [-3.6, 3.6, -19, 21] }, { k: 'fc', z: GZ, r: [-3.2, 3.2, 22.8, 28.6] }, { k: 'cab', z: GZ, r: [-4.5, 4.5, -26, -21], shut: true },
    { k: 'hold', z: HZ, r: [-3.4, 3.4, -21, 16] }, { k: 'tier', z: 0.05, r: [-3, 3, 22, 29.4] },
  ];
  Z.decks = [];
}

// ---------- the Bosun: a boss on src/zmboss.js's framework (the Diver's blows, a model of his own) ----------
ZB_KINDS.push('bosun');
ZBT.bosun = Object.assign({}, ZBT.diver, {
  n: 'the Bosun', N: 'The Bosun', sub: 'the first key hangs at his belt', col: '#d8c090', bar: ['#5a4a30', '#e0c890'], warn: '255,150,80', puff: '120,130,110',
  hp: 13, rad: 0.85, tall: 2.75, headZ: 2.3, pad: 0.45, crowd: 1.05,
  sp: () => 1.8,
  arriveLine: () => 'Down in the hold, something big stands up out of the bilge: the Bosun, his boarding axe in his fist.',
  smashLine: () => '',
  killLine: (who, pts) => `${who} put the Bosun down (+${pts}).`,
  actSound(z, act) { if (act === 'slam') gwBosunSound('heave', Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y)); },
  sound: (k, d) => gwBosunSound(k, d),
  build: () => gwBuildBosun(),
  reset(z, M) { M.suit.emissive.set(0); M.brass.emissive.set(0x140e04); M.root.rotation.set(0, 0, 0); M.root.scale.setScalar(1); M.key.visible = true; },
  pose(z, M, dt) { zbPoseDiver(z, M, dt); M.key.visible = !z.dead; if (M.eyeM) { const k = z.dead ? 0.12 : 0.85 + 0.15 * Math.sin(g.t * 3 + z.seed); M.eyeM.color.setRGB(0.72 * k, k, 0.85 * k); } },
});
function gwBosunSound(k, d) {
  const v = d == null ? 1 : Math.max(0.08, 1 - d / 45), play = (n, vol) => { try { return !soundOff() && typeof sfxPlay === 'function' && sfxPlay(n, { vol: vol * v, vary: 0.06 }); } catch (e) { return false; } };
  if (k === 'arrive') { if (!play('snarl', 1)) zbSound('groan', d); play('creak', 0.6); return; }
  if (k === 'slam') { if (play('axechop', 1)) { play('debris', 0.4); return; } }
  if (k === 'whoosh') { if (play('swish', 0.9)) return; }
  zbSound(k, d);
}
// (hosting, or alone) the Bosun, standing guard in the hold
function gwBosun() {
  if (typeof ZBT === 'undefined' || !ZBT.bosun) return;
  const S = RAID.st, T = ZBT.bosun, [x, y] = gwW(...GWH.BOSUN), zn = ++ZM.zc, n = Math.max(1, (ZM.hum || []).length), hp = zbHpOf('bosun', GWH.LEVEL, n);
  const z = {
    drowned: true, zm: true, boss: true, bt: 'bosun', zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss', x, y, jz: GWH.HZ, fl: GWH.HZ,
    hp, max: hp, sp: T.sp(), st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 1, ix: x, iy: y, ax: x, ay: y, lx: x, ly: y, raid: true,
  };
  if (T.init) T.init(z);
  zbMake(z, 'bosun');
  ZM.z.push(z); FPS.drowned = ZM.z;
  if (typeof ZB !== 'undefined') { zbNew(); ZB.seen.add(zn); }
  S.bz = zn; S.bpos = [x, y, GWH.HZ];
}
const gwInHold = (x, y) => { const [lx, ly] = gwL(x, y); return Math.abs(lx) < GWH.HB && ly > GWH.HAFT && ly < GWH.TIER - 0.3; };

// ---------- Knock ----------
// is he lit: a lantern on his deck near him
function gwLit(K) {
  for (const L of GWL.lamps) { const l = L.l; if (Math.abs(l.z - FPSC.GROUND - (K.jz + 1.4)) < 2.4 && Math.hypot(l.x - K.x, l.y - K.y) < KN.LIT_R) return true; }
  return false;
}
// nothing solid between an eye at (x, y, ez) and a point (tx, ty, tz), all over her bottom
function gwClear(x, y, ez, tx, ty, tz) {
  const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy); if (d < 0.3) return true;
  const r = fpsIsleRay(FPS.g, x, y, FPSC.GROUND + ez, dx / d, dy / d, (tz - ez) / d, { t: d });
  return r.t >= d - 0.3;
}
// does someone at (x, y, jz), looking along h (and p up), see Knock? (hf, vf: their view's half width and height)
function gwSees(x, y, jz, h, p, hf, vf) {
  const K = RAID.st.kn; if (!K) return false;
  const dx = K.x - x, dy = K.y - y, d = Math.hypot(dx, dy);
  if (d > KN.SEE || Math.abs(K.jz - jz) > 4) return false;
  if (d > 0.7 && Math.abs(angDiff(bearingOf(dx, dy), h)) > hf + Math.atan2(0.4, d)) return false;
  if (d > KN.NEAR && !gwLit(K)) return false;
  const ez = jz + FPSC.EYE;
  for (const hz of [KN.S * 0.88, KN.S * 0.55, KN.S * 0.2]) {
    const tz = K.jz + hz, el = Math.atan2(tz - ez, Math.max(0.3, d));
    if (Math.abs(el - (p || 0)) > vf + Math.atan2(0.4, Math.max(0.3, d))) continue;
    if (gwClear(x, y, ez, K.x, K.y, tz)) return true;
  }
  return false;
}
// (hosting, or alone) how many of you have him in sight: mine from my own view, the others' from where they are
// and which way they look, as last heard
function gwWatchers() {
  const m = FPS.me; let n = 0;
  if (!(m.dead > 0) && !zmIsDown() && !ZM.ghost) {
    const C = typeof GL3D !== 'undefined' && GL3D.camera, vf = C ? C.fov * Math.PI / 360 : 0.6, hf = C ? Math.min(1.3, Math.atan(Math.tan(vf) * (C.aspect || 1.6))) : KN.FOV;
    if (gwSees(m.x, m.y, m.jz || 0, m.h, m.p || 0, hf, vf)) n++;
  }
  if (ZM.net === 'host') for (const r of FPS.remote.values()) if (!r.dead && !r.down && !r.left && r.tx != null && gwSees(r.tx, r.ty, r.tjz != null ? r.tjz : r.jz || 0, r.th != null ? r.th : r.h || 0, r.p || 0, KN.FOV, KN.VFOV)) n++;
  return n;
}
// somewhere in the dark for him, between near and far (by the walk) from the nearest of you, out of everyone's sight
function gwKnockSpot(near, far) {
  const K = RAID.st.kn, N = ZM.nav, keep = [K.x, K.y, K.jz];
  for (let t = 0; t < 40; t++) {
    const R = GWL.spawn[(Math.random() * GWL.spawn.length) | 0]; if (R.shut) continue;
    const [x, y] = gwW(R.r[0] + Math.random() * (R.r[1] - R.r[0]), R.r[2] + Math.random() * (R.r[3] - R.r[2]));
    const a = zmNodeIn(zmCell(x, y), R.z, 0.35); if (a < 0) continue;
    const d = N.d[a]; if (d >= 1e8 || d < near || d > far) continue;
    if (zmBlockedAt(x, y, 0.5, R.z)) continue;
    K.x = x; K.y = y; K.jz = K.fl = R.z;
    if (t < 30 && gwWatchers()) continue;
    return true;
  }
  [K.x, K.y, K.jz] = keep; K.fl = K.jz;
  return false;
}
// (hosting, or alone) each tick: watched, he stands; unwatched, he comes for the nearest of you by the walk
function gwKnockTick(dt) {
  const S = RAID.st, K = S.kn, P = ZM.players || [];
  S.seeT = (S.seeT || 0) - dt; if (S.seeT <= 0) { S.seeT = 1 / 15; K.seen = gwWatchers(); }
  K.mv = false;
  if (K.lunge > 0) { K.lunge -= dt; if (K.lunge <= 0) { K.vic = -1; gwKnockSpot(24, 46); K.rest = KN.REST; gwEvent('away'); } return; }
  if (K.rest > 0) { K.rest -= dt; return; }
  if (K.seen || !P.length) { K.unseenT = 0; return; }
  K.unseenT = (K.unseenT || 0) + dt;
  const nd = zmNavDist(K.x, K.y, K.jz), sp = (nd > 22 ? KN.FAR : KN.SP) * (S.keys[2].st ? KN.ANGRY : 1);
  // the nearest of you, straight at them once close; else the walk's next point
  let best = null, bd = 1e9; for (const p of P) { const d = Math.hypot(p.x - K.x, p.y - K.y) + Math.abs((p.jz || 0) - K.jz) * 2; if (d < bd) { bd = d; best = p; } }
  let tx, ty;
  if (best && bd < 2.5 && Math.abs((best.jz || 0) - K.jz) < 0.8) { tx = best.x; ty = best.y; }
  else { const q = zmNavNext(K.x, K.y, K.jz); if (q) { tx = q[0]; ty = q[1]; } }
  if (tx != null) {
    const hx = tx - K.x, hy = ty - K.y, hl = Math.hypot(hx, hy), s = Math.min(hl, sp * dt), want = bearingOf(hx, hy);
    K.h += angDiff(want, K.h) * Math.min(1, dt * 6);
    if (hl > 0.02) { const x0 = K.x, y0 = K.y; for (const dh of [0, 0.5, -0.5, 1.0, -1.0]) { const a = want + dh; if (zmMove(K, Math.sin(a) * s, Math.cos(a) * s) && Math.hypot(K.x - x0, K.y - y0) > s * 0.3) break; } K.mv = Math.hypot(K.x - x0, K.y - y0) > 0.001; }
  }
  if (K.jz > K.fl) K.jz = Math.max(K.fl, K.jz - 9 * dt);
  // (stuck, off the walk or wedged: he's somewhere else, out of sight)
  K.stall = K.mv ? 0 : (K.stall || 0) + dt; if (K.stall > 2.5) { K.stall = 0; gwKnockSpot(10, 30); }
  // reaching one of you: down at once
  for (const p of P) if (Math.hypot(p.x - K.x, p.y - K.y) < KN.REACH && Math.abs((p.jz || 0) - K.jz) < 1.2) { gwCatch(p.sid); return; }
  // unseen and far for long: he's somewhere nearer, in the dark
  if (K.unseenT > KN.LOST && nd > 30) { K.unseenT = 0; gwKnockSpot(14, 24); }
}
function gwCatch(sid) {
  const S = RAID.st, K = S.kn, w = sid === FPS.me.id ? FPS.me : FPS.remote.get(sid);
  if (w) K.h = bearingOf(w.x - K.x, w.y - K.y);
  K.lunge = KN.LUNGE; K.mv = false; K.vic = gwIx(sid);
  gwEvent('catch', gwIx(sid));
}
// (my own side) Knock has reached me: down, whatever my health, and his face at the glass
function gwTaken() {
  const S = RAID.st, m = FPS.me;
  if (m.dead > 0 || zmIsDown() || ZM.over) return;
  S.scare = SK.KNOCK_SCARE_TIME;
  try { if (!soundOff()) sfxKnockScare(); } catch (e) {}
  if (typeof padRumble === 'function') padRumble(1, 0.9, SK.KNOCK_SCARE_TIME * 1000);
  m.hp = 0; m.iframe = 0; m.protect = 0; FPS.hurtT = 0.9;
  fpsFeed('Knock reached you.');
  fpsDie(null, null);
}

// ---------- the keys ----------
// st: 0 not to be had yet (on the Bosun's belt, round Knock's neck), 1 lying (x, y, z), 2 carried (by), 3 set
const gwGone = sid => sid === FPS.me.id ? (FPS.me.dead > 0 || zmIsDown()) : (() => { const r = FPS.remote.get(sid); return !r || r.left || r.dead || r.down; })();
function gwKeysTick() {
  const S = RAID.st;
  S.keys.forEach((k, i) => {
    if (k.st !== 2) return;
    const w = k.by === FPS.me.id ? FPS.me : FPS.remote.get(k.by);
    if (w) { k.x = w.x; k.y = w.y; k.z = Math.max(0.05, (w.jz || 0) - (w.down ? 0 : 0)); }
    if (gwGone(k.by)) { k.st = 1; k.by = null; k.z = zmFloorAt(k.x, k.y, (k.z || 0) + 0.3, 0.4) || k.z || 0.05; gwEvent('drop', i); }
  });
}
function gwDoorSolid(open) {
  const I = FPS.g && FPS.g.isle, D = GWL.door; if (!I || !D) return;
  const has = I.solids.includes(D);
  if (open === !has) return;
  I.solids = open ? I.solids.filter(s => s !== D) : I.solids.concat([D]); fpiIndex(I);
  if (typeof zmNavBuild === 'function') { zmNavBuild(); ZM.navT = 0; }
}
const gwDoorAt = () => gwW(0, GWH.AFT + 0.75);

// ---------- the drowned: up out of the bilge and through the decks ----------
function gwSpawn() {
  const P = ZM.players || []; if (!P.length) return false;
  const S = RAID.st, n = Math.max(1, (ZM.hum || []).length), alive = ZM.z.filter(z => !z.dead && !z.boss).length;
  if (alive >= GWH.ALIVE + GWH.ALIVE_MORE * (n - 1)) return false;
  const p = P[(Math.random() * P.length) | 0], [plx, ply] = gwL(p.x, p.y), inTier = P.some(q => { const [a, b] = gwL(q.x, q.y); return gwInTier(a, b) && (q.jz || 0) < GWH.HZ - 0.2; });
  const same = Math.random() < 0.75;
  for (let t = 0; t < 18; t++) {
    const L = GWL.spawn.filter(R => !(R.shut && !S.door) && !(R.k === 'tier' && !inTier) && (!same || Math.abs(R.z - (p.jz || 0)) < 1.6));
    if (!L.length) return false;
    const R = L[(Math.random() * L.length) | 0], [x, y] = gwW(R.r[0] + Math.random() * (R.r[1] - R.r[0]), R.r[2] + Math.random() * (R.r[3] - R.r[2]));
    if (P.some(q => Math.hypot(q.x - x, q.y - y) < 6.5 && Math.abs((q.jz || 0) - R.z) < 2)) continue;
    if (Math.hypot(p.x - x, p.y - y) > 26 && t < 14) continue;
    const a = zmNodeIn(zmCell(x, y), R.z, 0.35); if (a < 0 || ZM.nav.d[a] >= 1e8) continue;
    if (zmBlockedAt(x, y, 0.4, R.z)) continue;
    const u = Math.random(), kind = u < 0.22 ? 'run' : u < 0.8 ? 'jog' : 'walk';
    const z = raidSpawnAt(x, y, { kind, hp: zmHp(GWH.LEVEL) * (0.9 + Math.random() * 0.2) * (1 + 0.2 * (n - 1)), rise: R.k === 'tier' ? 1.4 : 1.1 });
    z.rb = R.z; z.jz = R.z - 1.9; z.fl = R.z;
    if (R.k === 'tier') gwSplash(x, y, GWH.WZ, 14);
    zmSound('moan', Math.hypot(x - FPS.me.x, y - FPS.me.y) + Math.abs(R.z - (FPS.me.jz || 0)) * 4, 0, kind);
    return true;
  }
  return false;
}
function gwSplash(x, y, z, n) { for (let i = 0; i < n; i++) FPS.parts.push({ x: x + (Math.random() - 0.5) * 1.0, y: y + (Math.random() - 0.5) * 1.0, z: FPSC.GROUND + z + 0.05, vx: (Math.random() - 0.5) * 2.4, vy: (Math.random() - 0.5) * 2.4, vz: 1.5 + Math.random() * 2.5, t: 0.7, c: '120,170,160' }); }

// ---------- the stage, alone or hosting ----------
function gwTick(dt) {
  const S = RAID.st, P = ZM.players || [];
  S.t += dt;
  gwKnockTick(dt);
  gwKeysTick();
  // the Bosun keeps to the hold: woken by the first of you down there
  const B = ZM.z.find(z => z.zn === S.bz && !z.dead);
  if (B) {
    if ((B.jz || 0) > GWH.HZ + 0.7 || !gwInHold(B.x, B.y)) { [B.x, B.y, B.jz] = S.bpos; B.fl = GWH.HZ; B.walk = false; B.shove = 0; }
    else if ((B.jz || 0) <= GWH.HZ + 0.3) S.bpos = [B.x, B.y, B.jz || GWH.HZ];
    if (!S.bw && P.some(p => gwBelow(p.jz) && gwInHold(p.x, p.y))) { S.bw = 1; gwEvent('bosun'); }
  }
  // someone first under the water in the cable tier: the drowned come up out of it
  if (!S.tw && P.some(p => { const [a, b] = gwL(p.x, p.y); return gwInTier(a, b) && (p.jz || 0) + FPSC.EYE < GWH.WZ; })) { S.tw = 1; gwEvent('tier'); S.spawnT = Math.min(S.spawnT, 1); }
  // the drowned, all the while
  S.spawnT -= dt;
  if (S.spawnT <= 0 && !S.gone) S.spawnT = gwSpawn() ? (GWH.GAP[0] + Math.random() * (GWH.GAP[1] - GWH.GAP[0])) * Math.max(0.7, 1 - S.t / 900) : 0.5;
}
// (hosting, or alone) what someone asked
function gwReq(sid, k, a) {
  const S = RAID.st, who = sid === FPS.me.id ? FPS.me : FPS.remote.get(sid); if (!who || gwGone(sid)) return;
  const near = (x, y, z, r) => Math.hypot(who.x - x, who.y - y) < r && Math.abs((who.jz || 0) - z) < 1.9;
  if (k === 'tk') { const i = clamp(a | 0, 0, 2), K = S.keys[i]; if (K.st === 1 && near(K.x, K.y, K.z, 2.8)) { K.st = 2; K.by = sid; gwEvent('take', i, gwIx(sid)); } return; }
  if (k === 'kk') { const K = S.kn, Y = S.keys[2]; if (Y.st === 0 && !K.mv && K.seen > 0 && !(K.lunge > 0) && near(K.x, K.y, K.jz, 3.0)) { Y.st = 2; Y.by = sid; Y.x = who.x; Y.y = who.y; Y.z = who.jz || 0; gwEvent('kkey', gwIx(sid)); } return; }
  const [dx, dy] = gwDoorAt();
  if (k === 'set') {
    if (!near(dx, dy, GWH.GZ, 3.2) || S.door) return;
    S.keys.forEach((K, i) => { if (K.st === 2 && K.by === sid) { K.st = 3; K.by = null; gwEvent('set', i, gwIx(sid)); } });
    if (S.keys.every(K => K.st === 3)) { S.door = 1; gwDoorSolid(true); gwEvent('open'); }
    return;
  }
  if (k === 'go') { if (S.door && near(dx, dy, GWH.GZ, 3.4) && !S.gone) { S.gone = 1; raidNextStage(); } }
}
// (hosting, or alone) a kill: the Bosun's key falls where he does
function gwKill(d) {
  const S = RAID.st;
  if (d.bt === 'bosun' && S.keys[0].st === 0) {
    const [lx, ly] = gwL(d.x, d.y), [x, y] = gwW(clamp(lx, -GWH.HB + 0.8, GWH.HB - 0.8), clamp(ly, GWH.HAFT + 0.8, GWH.TIER - 1));
    Object.assign(S.keys[0], { st: 1, x, y, z: GWH.HZ });
    gwEvent('bkey');
  }
}

// ---------- what happened, for everyone ----------
function gwEvent(k, a, b) {
  const S = RAID.st; S.eseq = (S.eseq || 0) + 1; S.ev.push([S.eseq, k, a == null ? -1 : a, b == null ? -1 : b]); if (S.ev.length > 8) S.ev.shift();
  gwSay(k, a == null ? -1 : a, b == null ? -1 : b);
}
function gwSay(k, a, b) {
  const S = RAID.st, me = FPS.me;
  if (k === 'catch') {
    const sid = gwAt(a), K = S.kn;
    if (sid === me.id) gwTaken();
    else { const d = K ? Math.hypot(K.x - me.x, K.y - me.y) : 30; try { if (!soundOff()) sfxKnock(0, clamp(1 - d / 40, 0.2, 1), 0.07); } catch (e) {} fpsFeed(`Knock reached ${gwNick(sid)}. Get them up while he's gone.`); }
    return;
  }
  if (k === 'away') { if (!S.saidAway) { S.saidAway = 1; fpsFeed('Knock is gone into the dark. He’ll be back.'); } return; }
  if (k === 'bosun') { ZM.banner = { text: 'The Bosun', t: 3.6, col: ZBT.bosun.col, sub: 'the first key hangs at his belt' }; fpsFeed(ZBT.bosun.arriveLine()); gwBosunSound('arrive', 10); return; }
  if (k === 'bkey') { raidRespawn(); gwSound('drop'); fpsFeed('The Bosun goes down, and his key falls from his belt. Take it up.'); return; }
  if (k === 'tier') { fpsFeed('Under the water you hold your breath. Get the key and get up out of it.'); return; }
  if (k === 'take') { gwSound('take'); const who = gwNick(gwAt(b)); fpsFeed(`${who === 'You' ? 'You take' : who + ' takes'} up ${GW_KEYS[a].n}.`); return; }
  if (k === 'kkey') { gwSound('take'); try { if (!soundOff()) sfxKnock(0, 0.9, 0.12); } catch (e) {} const who = gwNick(gwAt(a)); ZM.banner = { text: 'Knock’s key', t: 3, small: true, col: GW_KEYS[2].c, sub: 'and now he’s angry' }; fpsFeed(`${who === 'You' ? 'You slip' : who + ' slips'} the key from round Knock’s neck. He’ll be quicker now.`); return; }
  if (k === 'drop') { gwSound('drop'); fpsFeed(`${GW_KEYS[a].n[0].toUpperCase() + GW_KEYS[a].n.slice(1)} falls where its bearer went down. Someone take it up.`); return; }
  if (k === 'set') { raidRespawn(); gwSound('set'); const n = S.keys.filter(K => K.st === 3).length; ZM.banner = { text: `Key ${n} of 3`, t: 2.6, small: true, col: GW_KEYS[a].c, sub: GW_KEYS[a].n + ' turns in its lock' }; return; }
  if (k === 'open') { gwSound('open'); ZM.banner = { text: 'The cabin door is open', t: 4, col: '#ffd88a', sub: 'all of you: use it to go through' }; fpsFeed('The third key turns. The captain’s door swings open on his cabin.'); }
}

// ---------- the stage ----------
RAID_STAGES.gwhold = {
  n: 'Below Decks', mend: true,
  map: { start: GWH.START.slice(), top: GWH.GZ, zones: GW_ZONES, nav: [-7, 7, -28, 32], isle: 'gwhold' },
  music: () => 'raidcave',   // (a placeholder: the Deep Path's own, dripping and underground)
  set: (H, K, Z) => gwSet(H, K, Z),
  enter() {
    const S = RAID.st, [kx, ky] = gwW(...GWH.KNOCK), [cx, cy] = gwW(...GWH.KEY);
    Object.assign(S, {
      t: 0, spawnT: 6, door: 0, ev: [], eseq: 0, evSeen: 0, br: 1, drownT: 0, knT: 0, warnT: 0, useT: 0, pend: 0, scare: 0, crT: 4, dripT: 2, gone: 0, bw: 0, tw: 0,
      kn: { x: kx, y: ky, jz: GWH.GZ, fl: GWH.GZ, h: Math.PI, mv: false, seen: 0, rest: 7, lunge: 0, unseenT: 0, zpad: 0.45, vic: -1, ph: 0, tx: kx, ty: ky },
      keys: [{ st: 0, x: 0, y: 0, z: GWH.HZ, by: null }, { st: 1, x: cx, y: cy, z: 0.05, by: null }, { st: 0, x: kx, y: ky, z: GWH.GZ, by: null }],
    });
    ZM.open = new Set(['raid'].concat(Object.keys(GW_ZONES)));
    ZM.round = Math.max(ZM.round, GWH.LEVEL);
    if (typeof ZB !== 'undefined') { ZB.round = ZM.round; ZB.plan = []; }
    FPS.me.h = 0;
    gwDoorSolid(false);
    if (ZM.net !== 'client') gwBosun();
    fpsFeed('Below decks on the Gannet. Knock is loose down here: he moves only while none of you can see him.');
    setTimeout(() => { if (RAID.on && RAID.st === S) fpsFeed('The captain’s cabin, aft, is locked on three keys: the Bosun’s, the cable tier’s, and Knock’s own.'); }, 4500);
  },
  tick: dt => gwTick(dt),
  q: (sid, k, a) => gwReq(sid, k, a),
  kill: d => gwKill(d),
  speedK: () => RAID.st.under ? GWH.SWIM : 1,
  pack(o) {
    const S = RAID.st, K = S.kn, CX = FPSC.CX, CY = FPSC.CY;
    o.gk = [Math.round((K.x - CX) * 10), Math.round((K.y - CY) * 10), Math.round(K.jz * 10), Math.round(K.h * 100), (K.mv ? 1 : 0) | (K.rest > 0 ? 2 : 0) | (K.lunge > 0 ? 8 : 0), K.seen | 0, K.vic];
    o.gy = S.keys.map(k => [k.st, Math.round((k.x - CX) * 10), Math.round((k.y - CY) * 10), Math.round((k.z || 0) * 10), k.by ? gwIx(k.by) : -1]);
    o.gd = S.door | 0; o.gb = S.bz | 0;
    if (S.ev.length) o.ge = S.ev.slice(-6);
  },
  apply(o) {
    const S = RAID.st, K = S.kn, CX = FPSC.CX, CY = FPSC.CY; if (!K) return;
    if (Array.isArray(o.gk)) {
      const a = o.gk.map(v => +v || 0), tx = CX + a[0] / 10, ty = CY + a[1] / 10;
      // (far from where he was: he's gone into the dark and come out somewhere else; straight there)
      if (Math.hypot(tx - K.x, ty - K.y) > 4) { K.x = tx; K.y = ty; K.jz = a[2] / 10; }
      K.tx = tx; K.ty = ty; K.tjz = a[2] / 10; K.th = a[3] / 100; K.mv = !!(a[4] & 1); K.rest = a[4] & 2 ? 1 : 0; K.lunge = a[4] & 8 ? 1 : 0; K.seen = a[5] | 0; K.vic = a[6] | 0;
    }
    if (Array.isArray(o.gy)) o.gy.slice(0, 3).forEach((e, i) => { if (!Array.isArray(e)) return; const k = S.keys[i]; k.st = e[0] | 0; k.x = CX + e[1] / 10; k.y = CY + e[2] / 10; k.z = e[3] / 10; k.by = e[4] >= 0 ? gwAt(e[4]) : null; });
    if ((o.gd | 0) && !S.door) { S.door = 1; gwDoorSolid(true); }
    if (o.gb && typeof ZB !== 'undefined') { zbNew(); ZB.seen.add(o.gb | 0); S.bz = o.gb | 0; }
    if (Array.isArray(o.ge)) for (const e of o.ge) if (Array.isArray(e) && e[0] > (S.evSeen || 0)) { S.evSeen = e[0]; gwSay(String(e[1]), e[2] | 0, e[3] | 0); }
  },
  me: dt => gwMe(dt),
  consider(c) {
    const S = RAID.st, m = FPS.me, K = S.kn; if (!K) return;
    S.keys.forEach((k, i) => { if (k.st === 1) c({ k: 'gwkey', i }, k.x, k.y, k.z || 0, 2.2, false); });
    if (S.keys[2].st === 0) c({ k: 'gwkn' }, K.x, K.y, K.jz, 2.5, false);
    const [dx, dy] = gwDoorAt(); c({ k: 'gwdoor' }, dx, dy, GWH.GZ, 2.6, false);
  },
  prompt(o) {
    const S = RAID.st, K = S.kn;
    if (o.k === 'gwkey') return { text: `Take up ${GW_KEYS[o.i].n}`, free: true };
    if (o.k === 'gwkn') return K.mv || !K.seen || K.lunge ? { text: 'Knock’s key: only while he’s still (keep him in someone’s sight)' } : { text: 'Hold to slip the key from round Knock’s neck', hold: true };
    if (o.k === 'gwdoor') {
      if (S.door) return { text: 'Go into the captain’s cabin, all of you', free: true };
      const mine = S.keys.filter(k => k.st === 2 && k.by === FPS.me.id).length, set = S.keys.filter(k => k.st === 3).length;
      if (mine) return { text: mine > 1 ? 'Set your keys in the cabin door' : 'Set your key in the cabin door', free: true };
      return { text: `The captain’s cabin: locked (${set} of 3 keys set)` };
    }
    return null;
  },
  use(o) {
    const S = RAID.st;
    if (o.k === 'gwkey') { if (!(S.pend > 0)) { raidAsk('tk', o.i); if (ZM.net === 'client') S.pend = 0.6; } return true; }
    if (o.k === 'gwkn') return true;
    if (o.k === 'gwdoor') { if (S.pend > 0) return true; if (S.door) { raidAsk('go'); S.pend = 1.2; } else if (S.keys.some(k => k.st === 2 && k.by === FPS.me.id)) { raidAsk('set'); S.pend = 0.8; } else { try { zmSound('no'); } catch (e) {} } return true; }
    return false;
  },
  shot: (x, y, z, lh, lp) => gwShot(x, y, z, lh, lp),
  hud: (phone, mono, fell) => gwHud(phone, mono, fell),
  b3: grp => gw3dBuild(grp),
  f3: dt => gw3d(dt),
  exit() { GH3.ok = false; GH3.kn = null; if (typeof GL3D !== 'undefined' && GL3D.scene && GL3D.scene.fog) RAID.fog0 = true; },
};
raidAdd('gannet', 'gwhold', 2);

// ---------- the Bosun, in 3D: a big drowned sailor in a rotten oilskin, his boarding axe in his fist ----------
// (the parts src/zmboss.js's zbPoseDiver moves, as the Diver's: legs, hips, torso, arms, head; anc, his axe, hung from
// its grip with the haft down -y; the slam's ring, fill and shock; and his own: the key at his belt, his eyes)
function gwBuildBosun() {
  const Q = zbGeo(), root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 1.2;
  const suit = z3Lam('#55502e'), brass = z3Lam('#b08436', { emissive: 0x140e04 }), skin = z3Lam('#7e9488'), cloth = z3Lam('#3a3630'), boot = z3Lam('#1e1c1a'), leather = z3Lam('#3a2616'), iron = z3Lam('#4a4c50'), haftM = z3Lam('#6a4a2a'), barn = z3Lam('#7e7a6a'), rope = z3Lam(GWC.rope);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xb8ffd8 });
  const mesh = (geo, mat, x, y, zz, parent) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, zz || 0); (parent || hips).add(o); return o; };
  const cyl = (r0, r1, h, n) => new THREE.CylinderGeometry(r0, r1, h, n || 10), box = (w, h, d) => new THREE.BoxGeometry(w, h, d), sph = (r, a, b) => new THREE.SphereGeometry(r, a || 10, b || 8);
  // legs: tarred canvas trousers into sea boots
  const legG = cyl(0.21, 0.17, 1.0, 10); legG.translate(0, -0.5, 0);
  const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.26, 0, 0); hips.add(p); mesh(legG, cloth, 0, 0, 0, p); mesh(cyl(0.2, 0.2, 0.42, 10), boot, 0, -0.86, 0, p); mesh(box(0.36, 0.2, 0.56), boot, 0, -1.1, -0.08, p); return p; });
  // his body: a barrel of a chest under the oilskin, his belt and its buckle, the key hung from it
  const torso = new THREE.Group(); hips.add(torso);
  const bodyG = cyl(0.56, 0.48, 1.2, 14); bodyG.translate(0, 0.6, 0);
  mesh(bodyG, suit, 0, 0, 0, torso).scale.set(1, 1, 0.78);
  mesh(cyl(0.5, 0.54, 0.42, 14), suit, 0, -0.08, 0, torso).scale.set(1, 1, 0.8);   // (the coat's skirts)
  mesh(cyl(0.52, 0.52, 0.12, 14), leather, 0, 0.14, 0, torso).scale.set(1, 1, 0.8);
  mesh(box(0.2, 0.16, 0.05), brass, 0, 0.14, -0.41, torso);
  const key = new THREE.Group(); key.position.set(0.3, 0.06, -0.34); key.rotation.z = 0.2; torso.add(key); key.add(gwKeyMesh(GW_KEYS[0].c, 1.15));
  // the coat's buttons, its collar turned up, a coil of rope over his shoulder, barnacles and weed all over him
  for (let i = 0; i < 4; i++) mesh(sph(0.03, 6, 5), brass, 0.12, 0.38 + i * 0.2, -0.44 + i * 0.01, torso);
  mesh(cyl(0.36, 0.48, 0.24, 12), suit, 0, 1.24, 0.02, torso).scale.set(1, 1, 0.85);
  const coil = mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 18), rope, 0.04, 0.78, 0, torso); coil.rotation.set(0, Math.PI / 2, 0.7); coil.scale.set(1, 1.15, 1);
  const R = seeded(0xb05e);
  for (let i = 0; i < 12; i++) { const a = R() * 6.28, y = 0.15 + R() * 1.0; mesh(sph(0.018 + R() * 0.022, 6, 5), barn, Math.cos(a) * 0.52, y, Math.sin(a) * 0.41, torso).scale.y = 0.6; }
  for (let i = 0; i < 5; i++) { const k = mesh(Q.kelp, Q.weedM, -0.4 + i * 0.2, 1.2, 0.35, torso); k.rotation.x = 0.25; k.scale.y = 1.4; }
  // a bosun's call on a chain on his chest
  mesh(cyl(0.02, 0.03, 0.18, 6), brass, -0.18, 0.92, -0.44, torso).rotation.z = 1.2;
  // his head: drowned grey-green, bald, a short wet beard of weed, eyes lit pale from inside; a knitted cap
  const head = new THREE.Group(); head.position.set(0, 1.58, -0.06); torso.add(head);
  mesh(sph(0.3, 14, 12), skin, 0, 0, 0, head).scale.set(1, 1.08, 1);
  mesh(cyl(0.29, 0.31, 0.18, 14), z3Lam('#4a2a22'), 0, 0.2, 0.02, head);
  mesh(sph(0.15, 10, 8), z3Lam('#4a2a22'), 0, 0.3, 0.02, head).scale.set(1.6, 0.6, 1.6);
  mesh(box(0.1, 0.13, 0.12), skin, 0, -0.02, -0.29, head);   // (his nose)
  for (const s of [-1, 1]) { mesh(sph(0.045, 8, 6), eyeM, s * 0.1, 0.06, -0.26, head); mesh(box(0.11, 0.025, 0.04), z3Lam('#2a2a22'), s * 0.1, 0.12, -0.28, head).rotation.z = s * 0.25; mesh(sph(0.07, 8, 6), skin, s * 0.29, 0.0, 0.0, head).scale.set(0.5, 1, 0.8); }
  mesh(box(0.16, 0.04, 0.04), z3Lam('#1a0e0a'), 0, -0.14, -0.27, head);
  for (let i = 0; i < 7; i++) { const k = mesh(Q.kelp, Q.weedM, -0.18 + i * 0.06, -0.1, -0.22 - Math.abs(i - 3) * -0.01, head); k.rotation.x = -0.25; k.scale.set(1.3, 0.55 + R() * 0.3, 1); }
  const eh = new THREE.Sprite(new THREE.SpriteMaterial({ map: Q.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); eh.position.set(0, 0.06, -0.34); eh.scale.set(0.6, 0.3, 1); head.add(eh);
  mesh(cyl(0.2, 0.26, 0.2, 12), skin, 0, 1.4, -0.02, torso);   // (his neck, thick as a mast)
  // arms: thick in their oilskin sleeves, big bare hands
  const armG = cyl(0.17, 0.14, 0.95, 10); armG.translate(0, -0.47, 0);
  const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.66, 1.04, 0); torso.add(p); mesh(sph(0.2, 10, 8), suit, 0, 0, 0, p); mesh(armG, suit, 0, 0, 0, p); mesh(sph(0.17, 10, 8), skin, 0, -0.98, 0, p).scale.set(0.9, 1.1, 1.1); return p; });
  // his boarding axe: a long ash haft, the iron head at its end, a spike behind the blade
  const anc = new THREE.Group(); torso.add(anc);
  const haftG = cyl(0.045, 0.05, 1.5, 8); haftG.translate(0, -0.65, 0);
  mesh(haftG, haftM, 0, 0, 0, anc);
  mesh(cyl(0.06, 0.06, 0.16, 8), leather, 0, 0.0, 0, anc);
  const hd = new THREE.Group(); hd.position.set(0, -1.28, 0); anc.add(hd);
  mesh(box(0.12, 0.22, 0.14), iron, 0, 0, 0, hd);
  const blade = new THREE.Shape(); blade.moveTo(0, -0.1); blade.lineTo(0.42, -0.26); blade.quadraticCurveTo(0.52, 0, 0.42, 0.26); blade.lineTo(0, 0.1); blade.lineTo(0, -0.1);
  const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.035, bevelEnabled: false }); bg.translate(0, 0, -0.0175);
  const bl = mesh(bg, iron, 0.05, 0, 0, hd); bl.rotation.y = Math.PI / 2;
  const sp = mesh(new THREE.ConeGeometry(0.05, 0.3, 4), iron, 0, 0, 0.2, hd); sp.rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.02, 0.38, 0.02), z3Lam('#8a8c90'), 0, 0, -0.5, hd);   // (the edge, bright)
  // (the slam's ring on the floor where it'll come down, and its shock going out: as the Diver's)
  const warnM = new THREE.MeshBasicMaterial({ color: 0xff7a40, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const fillM = new THREE.MeshBasicMaterial({ color: 0xff5a30, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const waveM = new THREE.MeshBasicMaterial({ color: 0xc8fff0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const rim = new THREE.Mesh(Q.rim, warnM), disc = new THREE.Mesh(Q.disc, fillM), wave = new THREE.Mesh(Q.wave, waveM);
  for (const o of [rim, disc, wave]) { o.position.set(0, 0.04, -ZBC.SLAM_AT); o.renderOrder = 2; root.add(o); }
  return { root, hips, legs, arms, torso, head, anc, suit, brass, rim, disc, wave, key, eyeM };
}

// ---------- in 3D: Knock, the keys, the cabin door, the lanterns swinging, the water ----------
const GH3 = { ok: false, kn: null };
// a key: its bow, its shank, its bit (along -y from the bow; s: its size)
function gwKeyMesh(col, s) {
  const k = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: col, emissive: new THREE.Color(col).multiplyScalar(0.18) });
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.013, 6, 14), m); k.add(bow);
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.02), m); sh.position.y = -0.13; k.add(sh);
  for (const [y, w] of [[-0.19, 0.05], [-0.15, 0.035]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, 0.018), m); b.position.set(w / 2, y, 0); k.add(b); }
  k.scale.setScalar(s || 1);
  return k;
}
function gw3dBuild(grp) {
  GH3.ok = false; GH3.kn = null;
  if (!RAID.on || !RAID.st || !RAID.st.kn) return;
  const G0 = FPSC.GROUND, S = RAID.st, soft = (a, b) => z3Soft(a, b);
  // Knock: src/raidknock.js's model, at a figurehead's size, his key on a cord at his chest
  const M = rfBuildKnock(); M.body.scale.setScalar(KN.S); grp.add(M.root); GH3.kn = M;
  M.wood.color.setScalar(0.62); M.limbM.color.multiplyScalar(0.7); M.wood.shininess = 6;   // (old paint, a year under the sea: duller than in the Plaza's daylight)
  const cordM = new THREE.MeshLambertMaterial({ color: 0x2a2018 }), nk = new THREE.Group(); M.torso.add(nk);
  for (const s of [-1, 1]) { const a = new THREE.Vector3(s * 0.108, 0.36, 0), b = new THREE.Vector3(0, 0.285, -0.056), d = b.clone().sub(a), c = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, d.length(), 4), cordM); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); nk.add(c); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.004, 0.004), cordM); back.position.set(0, 0.36, 0.052); nk.add(back);
  const kk = gwKeyMesh(GW_KEYS[2].c, 0.62 / KN.S); kk.position.set(0, 0.28, -0.062); nk.add(kk);
  GH3.nk = nk; GH3.knHit = 0; GH3.knPh = 0;
  // his eyes catch the light: a faint gleam, so you see them before him in the dark
  GH3.gleam = M.eyes.map(e => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft('rgba(255,236,200,0.7)', 'rgba(255,236,200,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 })); s.scale.setScalar(0.06); s.position.z = -0.03; e.e.add(s); return s; });
  // the keys, lying where they are (and carried: at the bearer's side), each with a glimmer
  GH3.keys = GW_KEYS.map(K => { const g3 = new THREE.Group(); grp.add(g3); g3.add(gwKeyMesh(K.c, 1.5)); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft('rgba(255,230,170,0.8)', 'rgba(255,230,170,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6, fog: false })); gl.scale.setScalar(0.9); g3.add(gl); return { g3, gl }; });
  // the cabin door: its leaf on its hinge, three locks down its edge, each key in its lock once set
  { const [dx, dy] = gwW(0, GWH.AFT), dg = new THREE.Group(); dg.position.copy(z3v(dx, dy, G0 + GWH.GZ)); grp.add(dg);
    const wood = z3Lam('#5a4029'), dark = z3Lam('#2e2016'), brass = z3Lam('#8a6a30', { emissive: 0x0a0602 });
    const hinge = new THREE.Group(); hinge.position.set(-0.75, 0, 0); dg.add(hinge);
    const leaf = new THREE.Group(); leaf.position.set(0.75, 0, 0); hinge.add(leaf);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.48, 2.28, 0.1), wood); slab.position.y = 1.14; leaf.add(slab);
    for (const [y, h] of [[0.6, 0.9], [1.7, 0.9]]) for (const x of [-0.36, 0.36]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.56, h, 0.03), dark); p.position.set(x, y, -0.06); leaf.add(p); }
    for (const y of [0.3, 1.98]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.13), z3Lam('#2a2a2a')); h.position.set(-0.6, y, 0); leaf.add(h); }
    const locks = [1.55, 1.2, 0.85].map((y, i) => { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.03), brass); pl.position.set(0.52, y, -0.07); leaf.add(pl); const hole = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.01), new THREE.MeshBasicMaterial({ color: 0x080604 })); hole.position.set(0.52, y - 0.02, -0.088); leaf.add(hole); const k = gwKeyMesh(GW_KEYS[i].c, 1.1); k.rotation.set(-Math.PI / 2, 0, 0); k.position.set(0.52, y - 0.02, -0.25); k.visible = false; leaf.add(k); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft('rgba(255,210,140,0.9)', 'rgba(255,210,140,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); gl.scale.setScalar(0.45); gl.position.set(0.52, y, -0.12); leaf.add(gl); return { k, gl }; });
    // (the light of the cabin, beyond, once it's open)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.3), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.position.set(0, 1.15, 0.6); dg.add(glow);
    GH3.door = { hinge, locks, glow, a: S.door ? 1 : 0 }; }
  // the lanterns: each on its cord from the beam, swinging as she rolls (their lights go with them)
  { const brass = z3Lam('#8a6a2e'), cage = z3Lam('#2a2622'), glassM = new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.85 }), flameM = new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), halo = soft('rgba(255,190,110,0.55)', 'rgba(255,170,80,0)'), cordG = new THREE.CylinderGeometry(0.008, 0.008, 1, 4);
    cordG.translate(0, -0.5, 0);
    GH3.lamps = GWL.lamps.map(L => {
      const l = L.l, len = Math.max(0.35, L.hook - L.z), piv = new THREE.Group(); piv.position.set(l.x, l.z + len, -l.y); grp.add(piv);
      const cord = new THREE.Mesh(cordG, cage); cord.scale.y = len - 0.2; piv.add(cord);
      const lan = new THREE.Group(); lan.position.y = -len; piv.add(lan);
      const add = (geo, mat, y) => { const o = new THREE.Mesh(geo, mat); o.position.y = y; lan.add(o); return o; };
      add(new THREE.CylinderGeometry(0.1, 0.11, 0.04, 8), brass, -0.15); add(new THREE.ConeGeometry(0.11, 0.1, 8), brass, 0.15); add(new THREE.TorusGeometry(0.035, 0.008, 4, 10), brass, 0.22);
      add(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 8, 1, true), glassM, 0);
      for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.4, b = add(new THREE.BoxGeometry(0.012, 0.28, 0.012), cage, 0); b.position.set(Math.cos(a) * 0.085, 0, Math.sin(a) * 0.085); }
      const fl = add(new THREE.SphereGeometry(0.03, 6, 5), flameM, -0.02); fl.scale.set(1, 1.7, 1);
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 })); h.scale.setScalar(1.3); lan.add(h);
      return { L, piv, fl, h, len, bx: l.x, by: l.y, bz: l.z };
    }); }
  // the water: the cable tier flooded to WZ, rippling; in the hold, the bilge slopping over her floor
  { const [tx, ty] = gwW(0, (GWH.TIER + GWH.TEND) / 2), w = 2 * GWH.TW + 0.6, d = GWH.TEND - GWH.TIER + 0.4;
    const geo = new THREE.PlaneGeometry(w, d, 18, 30); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ color: 0x03100f, specular: 0xb0b8a8, shininess: 110, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    const water = new THREE.Mesh(geo, mat); water.position.copy(z3v(tx, ty, G0 + GWH.WZ)); water.renderOrder = 1; grp.add(water);
    GH3.water = { water, geo, mat, base: Float32Array.from(geo.attributes.position.array) };
    // (flotsam on it: a stave, a bit of grating, a hank of weed, riding the ripples)
    GH3.flot = [[-1.6, 21.5, 0.9, 0.12, 0.3, '#3a2c20'], [1.9, 24.8, 0.7, 0.6, 0.9, '#2e241a'], [-0.6, 27.0, 0.8, 0.25, 2.1, '#1e3a26'], [1.2, 19.4, 0.5, 0.12, 1.2, '#3a2c20']].map(([x, y, w, d, a, c], i) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), z3Lam(c)); const [wx, wy] = gwW(x, y); o.position.copy(z3v(wx, wy, G0 + GWH.WZ)); o.rotation.y = a; grp.add(o); return { o, y0: o.position.y, i }; });
    const [hx, hy] = gwW(0, (GWH.HAFT + GWH.TIER) / 2), bilge = new THREE.Mesh(new THREE.PlaneGeometry(2 * GWH.HB, GWH.TIER - GWH.HAFT), new THREE.MeshPhongMaterial({ color: 0x1a2622, specular: 0x4a5a56, shininess: 80, transparent: true, opacity: 0.55, depthWrite: false }));
    bilge.rotation.order = 'YXZ'; bilge.rotation.x = -Math.PI / 2; bilge.position.copy(z3v(hx, hy, G0 + GWH.HZ + 0.03)); bilge.renderOrder = 1; grp.add(bilge); GH3.bilge = bilge; }
  // motes of dust and damp, hanging in the lantern light round you
  { const n = 260, pos = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 16;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xc8b090, size: 0.03, transparent: true, opacity: 0.45, depthWrite: false })); grp.add(pts); GH3.motes = { pts, pos, n }; }
  GH3.ok = true;
}
// each frame
function gw3d(dt) {
  if (!GH3.ok || !RAID.st || !RAID.st.kn) return;
  const S = RAID.st, K = S.kn, M = GH3.kn, m = FPS.me, G0 = FPSC.GROUND, t = g.t, sw = reduceMotion ? 0 : 1;
  // ---- Knock ----
  if (M) {
    M.root.position.copy(z3v(K.x, K.y, G0 + K.jz)); M.root.rotation.set(0, -K.h, 0);
    // (mid-stride when he moves; caught, he holds whatever pose he was in, which is worse)
    const lunge = K.lunge > 0;
    if (K.mv && !lunge) GH3.knPh += dt * 4.2;
    const ph = GH3.knPh, st = Math.sin(ph);
    let LR = [st * 0.5, Math.max(0, -st) * 0.7], LL = [-st * 0.5, Math.max(0, st) * 0.7], R = [0.25 - st * 0.35, 0.18, 0.3], L = [st * 0.45, -0.18, 0.35], lean = 0.08, mouth = 1;
    if (lunge) { R = [1.55, 0.25, 0.15]; L = [1.6, -0.25, 0.15]; LR = [0.55, 0.3]; LL = [-0.3, 0.2]; lean = 0.32; mouth = 2.2; }
    M.body.position.y = K.mv ? Math.abs(Math.cos(ph)) * 0.03 * KN.S * sw : 0;
    M.torso.rotation.set(-lean, Math.sin(ph) * 0.07 * sw, 0);
    for (const [i, A] of [R, L].entries()) { M.arms[i].sh.rotation.set(A[0], 0, A[1]); M.arms[i].el.rotation.set(A[2], 0, 0); }
    for (const [i, A] of [LR, LL].entries()) { M.legs[i].hp.rotation.set(-A[0], 0, 0); M.legs[i].kn.rotation.set(A[1], 0, 0); M.legs[i].ft.rotation.set(-A[0] + A[1] * 0.4, 0, 0); }
    M.bat.rotation.set(0.4, 0, -0.6);
    M.mouth.scale.set(1, mouth, 1);
    // his eyes: on you, wherever you are, still or not
    const d = angDiff(bearingOf(m.x - K.x, m.y - K.y), K.h), ex = clamp(d, -1.2, 1.2) * 0.009, ey = clamp(((m.jz || 0) + 1.6 - K.jz - KN.S * 0.88) / Math.max(1, Math.hypot(m.x - K.x, m.y - K.y)), -1, 1) * 0.006;
    for (const e of M.eyes) e.ir.position.set(Math.abs(d) < 2 ? ex : 0, Math.abs(d) < 2 ? ey : 0, -0.021);
    if (GH3.gleam) for (const gl of GH3.gleam) gl.material.opacity = 0.25 + 0.15 * Math.sin(t * 1.7);
    GH3.knHit = Math.max(0, GH3.knHit - dt); const fl = GH3.knHit / 0.15;
    M.wood.emissive.setRGB(fl * 0.3, fl * 0.2, fl * 0.1); M.limbM.emissive.setRGB(fl * 0.25, fl * 0.16, fl * 0.08);
    GH3.nk.visible = S.keys[2].st === 0;
  }
  // ---- the keys ----
  S.keys.forEach((k, i) => {
    const o = GH3.keys[i]; if (!o) return;
    const mine = k.st === 2 && k.by === m.id, show = k.st === 1 || (k.st === 2 && !mine);
    o.g3.visible = show; if (!show) return;
    if (k.st === 1) { o.g3.position.copy(z3v(k.x, k.y, G0 + (k.z || 0) + 0.32 + 0.06 * Math.sin(t * 2 + i))); o.g3.rotation.set(0, t * 1.4 + i, 0); o.gl.material.opacity = 0.55 + 0.25 * Math.sin(t * 3 + i); o.gl.visible = true; }
    else { const r = FPS.remote.get(k.by); if (!r) { o.g3.visible = false; return; } o.g3.position.copy(z3v(r.x + Math.cos(r.h || 0) * 0.35, r.y - Math.sin(r.h || 0) * 0.35, G0 + (r.jz || 0) + 0.95)); o.g3.rotation.set(0, -(r.h || 0), 0.3); o.gl.material.opacity = 0.3; }
  });
  // ---- the cabin door ----
  if (GH3.door) {
    const D = GH3.door; D.a = S.door ? Math.min(1, D.a + dt * 0.6) : 0;
    D.hinge.rotation.y = -zbE(D.a) * 1.9;
    D.locks.forEach((L, i) => { const set = S.keys[i].st === 3; L.k.visible = set; L.gl.material.opacity = set ? 0.3 + 0.12 * Math.sin(t * 2 + i) : 0; });
    D.glow.material.opacity = 0.35 * zbE(D.a);
  }
  // ---- the lanterns swinging: all together as she rolls, and each a little on its own ----
  if (GH3.lamps) {
    const roll = Math.sin(t * 0.55) * 0.09 * sw, pitch = Math.sin(t * 0.37 + 1.2) * 0.04 * sw;
    for (const A of GH3.lamps) {
      const ax = roll + Math.sin(t * 1.3 + A.L.ph) * 0.03 * sw, ay = pitch + Math.sin(t * 1.1 + A.L.ph * 1.3) * 0.025 * sw;
      A.piv.rotation.set(ay, 0, ax);
      const l = A.L.l; l.x = A.bx + Math.sin(ax) * A.len; l.y = A.by + Math.sin(ay) * A.len; l.z = A.bz + A.len * (1 - Math.cos(ax) * Math.cos(ay));
      const f = 0.88 + 0.12 * Math.sin(t * 11 + A.L.ph) * Math.sin(t * 4.3 + A.L.ph); A.fl.scale.set(f, 1.7 * f, f); A.h.material.opacity = 0.65 * f;
    }
  }
  // ---- the water ----
  if (GH3.water) {
    const W3 = GH3.water, P = W3.geo.attributes.position, a = P.array, b = W3.base;
    for (let i = 0; i < a.length; i += 3) { const x = b[i], z = b[i + 2]; a[i + 1] = sw * (0.035 * Math.sin(x * 1.7 + t * 1.3) + 0.03 * Math.sin(z * 1.3 - t * 1.1) + 0.015 * Math.sin((x + z) * 3.1 + t * 2.3)); }
    P.needsUpdate = true; W3.geo.computeVertexNormals();
    if (GH3.flot) for (const F of GH3.flot) { F.o.position.y = F.y0 + 0.03 * Math.sin(t * 1.3 + F.i * 2) * sw; F.o.rotation.z = 0.06 * Math.sin(t * 1.1 + F.i) * sw; }
  }
  if (GH3.bilge) GH3.bilge.rotation.y = Math.sin(t * 0.55) * 0.012 * sw;
  // ---- the motes, drifting round you ----
  if (GH3.motes) {
    const Mo = GH3.motes, p = Mo.pos, ex = m.x, ey = m.y, ez = G0 + (m.jz || 0) + 1.6;
    for (let i = 0; i < Mo.n; i++) { const j = i * 3; p[j] += Math.sin(t * 0.3 + i) * dt * 0.05; p[j + 1] -= dt * 0.04; p[j + 2] += Math.cos(t * 0.27 + i * 1.7) * dt * 0.05;
      // (kept in a box round you: wrapped from one side to the other)
      for (const [o, c] of [[0, ex], [1, ez], [2, -ey]]) { const r = p[j + o] - c; if (r > 7) p[j + o] -= 14; else if (r < -7) p[j + o] += 14; } }
    Mo.pts.geometry.attributes.position.needsUpdate = true; Mo.pts.visible = !S.under;
  }
  // ---- the light and the fog: close and brown; under the water, green and closer still ----
  GL3D.amb.intensity = S.under ? 0.32 : 0.17; GL3D.moon.intensity = 0.02;
  if (GL3D.scene.fog) { const F = GL3D.scene.fog; if (S.under) { F.color.setRGB(0.03, 0.1, 0.09); F.near = 0.5; F.far = 15; } else { F.color.setRGB(0.028, 0.022, 0.018); F.near = 5; F.far = 34; } RAID.fog0 = true; }
}

// ---------- your own side of it ----------
function gwMe(dt) {
  const S = RAID.st, K = S.kn, m = FPS.me; if (!K) return;
  const alive = !(m.dead > 0) && !zmIsDown() && !ZM.over && !ZM.ghost;
  // joined: Knock eased towards where the host has him (never seen sliding: he's only drawn moving while he moves)
  if (ZM.net === 'client' && K.tx != null) { const k = Math.min(1, dt * 12); K.x += (K.tx - K.x) * k; K.y += (K.ty - K.y) * k; K.jz += ((K.tjz != null ? K.tjz : K.jz) - K.jz) * k; K.h += angDiff(K.th || 0, K.h) * k; }
  // under the water in the cable tier: your breath, then the sea in your lungs
  const [lx, ly] = gwL(m.x, m.y), under = alive && gwInTier(lx, ly) && (m.jz || 0) + FPSC.EYE - (FPS.crouchEye || 0) < GWH.WZ;
  if (under && !S.under) { gwSplash(m.x, m.y, GWH.WZ, 8); try { if (!soundOff()) sfxPlay('splash', { vol: 0.5 }); } catch (e) {} }
  if (!under && S.under && alive) { gwSplash(m.x, m.y, GWH.WZ, 6); try { if (!soundOff()) { if (S.br < 0.5) { noise('bandpass', 900, 1.5, 0.02, 0.18, 0.5, { to: 500 }); tone(320, 'sine', 0.02, 0.06, 0.35, { to: 220 }); } sfxPlay('splash', { vol: 0.3, rate: 1.3 }); } } catch (e) {} }
  S.under = under;
  if (under) {
    S.br = Math.max(0, S.br - dt / GWH.BREATH);
    if (Math.random() < dt * 3) FPS.parts.push({ x: m.x + Math.sin(m.h) * 0.4, y: m.y + Math.cos(m.h) * 0.4, z: FPSC.GROUND + (m.jz || 0) + 1.5, vx: 0, vy: 0, vz: 0.8, t: 0.8, c: '170,220,210' });
    if (S.br <= 0) { S.drownT -= dt; if (S.drownT <= 0) { S.drownT = GWH.DROWN; if (!(m.protect > 0)) { m.iframe = 0; fpsHurt(1); if (m.hp <= 0 || zmIsDown()) fpsFeed('The water in the cable tier took you.'); } } }
  } else { S.br = Math.min(1, S.br + dt / GWH.REFILL); S.drownT = 0.3; }
  // his knocks: while he moves and you're near enough to hear, three on wood, quicker and louder the nearer he is
  const kd = Math.hypot(K.x - m.x, K.y - m.y) + Math.abs(K.jz - (m.jz || 0)) * 1.5;
  S.warnT -= dt; if (S.mvT > 0) S.mvT -= dt;
  if (K.mv && !(K.lunge > 0)) { S.mvT = 1.2; if (kd < KN.WARN && S.warnT <= 0) { const k = 1 - kd / KN.WARN, pan = clamp(Math.sin(angDiff(bearingOf(K.x - m.x, K.y - m.y), m.h)), -1, 1) * 0.8; try { if (!soundOff()) sfxKnock(pan, 0.25 + 0.75 * k, 0.26 - 0.16 * k); } catch (e) {} S.warnT = 0.9 + 2.6 * (1 - k); S.knockT = 1.6; } }
  if (S.knockT > 0) S.knockT -= dt;
  // holding Use beside him while he's held still: his key, off its cord
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
  if (hold && o && o.k === 'gwkn' && alive && S.keys[2].st === 0 && !K.mv && K.seen > 0 && !(K.lunge > 0) && !(S.pend > 0)) { S.useT += dt; if (S.useT >= GWH.TAKE) { S.useT = 0; raidAsk('kk'); S.pend = 1; } }
  else S.useT = 0;
  if (S.pend > 0) S.pend -= dt;
  if (S.scare > 0) S.scare -= dt;
  // the ship about you: timbers creaking as she rolls, water dripping from the beams
  S.crT -= dt; if (S.crT <= 0) { S.crT = 5 + Math.random() * 9; try { if (!soundOff()) sfxPlay('creak', { vol: 0.18 + Math.random() * 0.25, vary: 0.2, rate: 0.7 + Math.random() * 0.3 }); } catch (e) {} }
  S.dripT -= dt; if (S.dripT <= 0) { S.dripT = 0.8 + Math.random() * 2.5; try { if (!soundOff()) { const f = 1300 + Math.random() * 900; tone(f, 'sine', 0.002, under ? 0.02 : 0.05, 0.12, { to: f * 0.55, pan: (Math.random() - 0.5) * 1.4 }); } } catch (e) {} }
}

// ---------- the hud ----------
// where a key is, in words
function gwWhere(i) {
  const k = RAID.st.keys[i];
  if (k.st === 3) return 'set in the door';
  if (k.st === 2) return k.by === FPS.me.id ? 'you have it' : gwNick(k.by) + ' has it';
  if (k.st === 0) return i === 0 ? 'on the Bosun, in the hold' : 'round Knock’s neck';
  const [lx, ly] = gwL(k.x, k.y); for (const z in GW_ZONES) { const Z = GW_ZONES[z], r = Z.r; if (lx >= r[0] && lx <= r[1] && ly >= r[2] && ly <= r[3] && (k.z || 0) >= Z.zr[0] - 0.5 && (k.z || 0) < Z.zr[1]) return i === 1 && z === 'gwtier' && (k.z || 0) < 1 ? 'under the water in the cable tier' : 'lying in ' + Z.n; }
  return 'lying somewhere';
}
function gwKeyIcon(x, y, s, col, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.5, s * 0.16);
  ctx.beginPath(); ctx.arc(x + s * 0.28, y, s * 0.24, 0, 6.283); ctx.stroke();
  ctx.fillRect(x + s * 0.52, y - s * 0.07, s * 0.6, s * 0.14); ctx.fillRect(x + s * 0.92, y, s * 0.12, s * 0.28); ctx.fillRect(x + s * 0.74, y, s * 0.1, s * 0.2);
  ctx.restore();
}
function gwHud(phone, mono, fell) {
  const S = RAID.st, K = S.kn, m = FPS.me, L = Math.max(14, FPS.safeLeft || 0), t = g.t; if (!K) return;
  let top = fpsHudTop() + (phone ? 32 : 44);
  const alive = !(m.dead > 0) && !zmIsDown() && !ZM.over;
  // under the water: a green murk over everything, darker at the edges
  if (S.under) { ctx.fillStyle = 'rgba(12,60,52,0.16)'; ctx.fillRect(0, 0, W, H); const gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.2, cx, H / 2, Math.max(W, H) * 0.7); gr.addColorStop(0, 'rgba(4,20,18,0)'); gr.addColorStop(1, `rgba(4,20,18,${0.4 + 0.4 * (1 - S.br)})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
  // what to do
  const set = S.keys.filter(k => k.st === 3).length;
  const line = S.door ? 'The captain’s cabin is open. Use its door, aft, to go on.' : `The captain’s cabin, aft, is locked on three keys. Set in its door: ${set} of 3.`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = S.door ? '#ffd88a' : 'rgba(236,228,207,0.8)';
  ctx.fillText(line, L, top, W * 0.5); top += phone ? 16 : 22;
  // the keys: where each is, or who has it
  const rh = phone ? 15 : 20, is = phone ? 11 : 15;
  S.keys.forEach((k, i) => {
    const y = top + i * rh, K2 = GW_KEYS[i], mine = k.st === 2 && k.by === m.id;
    ctx.fillStyle = 'rgba(8,8,10,0.45)'; ctx.fillRect(L - 4, y - 2, phone ? 230 : 320, rh - 2);
    gwKeyIcon(L, y + rh / 2 - 2, is, K2.c, k.st === 3 ? 1 : k.st === 0 ? 0.45 : 0.85);
    ctx.font = mono(phone ? 9 : 12); ctx.fillStyle = k.st === 3 ? K2.c : mine ? '#fff0c8' : 'rgba(236,228,207,0.75)';
    ctx.fillText(`${K2.s.toUpperCase()} · ${gwWhere(i)}${k.st === 3 ? ' ✓' : ''}`, L + is * 1.3 + 6, y + 1, phone ? 200 : 290);
  });
  fpsHudNote(top + 3 * rh + 4);
  // Knock: moving, or held by someone's eyes
  if (alive) {
    const yk = H - (phone ? 150 : 100);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (K.lunge > 0) { ctx.font = fell(phone ? 18 : 24); ctx.fillStyle = '#ff8a5a'; ctx.fillText('KNOCK HAS SOMEONE', cx, yk); }
    else if (K.mv || S.mvT > 0) { const p = 0.6 + 0.4 * Math.sin(t * 9); ctx.font = fell(phone ? 18 : 24); ctx.fillStyle = `rgba(255,${120 + 40 * p | 0},70,${0.7 + 0.3 * p})`; ctx.fillText('KNOCK IS MOVING', cx, yk); ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = 'rgba(236,200,170,0.75)'; ctx.fillText('find him and keep him in sight', cx, yk + (phone ? 16 : 20)); }
    else if (K.rest > 0) { ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(200,190,170,0.6)'; ctx.fillText('KNOCK IS STILL · FOR NOW', cx, yk); }
    else if (K.seen > 0) { ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(170,220,200,0.8)'; ctx.fillText(K.seen > 1 ? `KNOCK IS STILL · ${K.seen} OF YOU HAVE HIM IN SIGHT` : 'KNOCK IS STILL · SOMEONE HAS HIM IN SIGHT', cx, yk); }
    // the knocks: which way they came from
    if (S.knockT > 0) {
      const a = angDiff(bearingOf(K.x - m.x, K.y - m.y), m.h), r = phone ? 70 : 96, k = Math.min(1, S.knockT / 0.6);
      ctx.save(); ctx.translate(cx, H / 2); ctx.rotate(a); ctx.globalAlpha = 0.85 * k;
      ctx.fillStyle = '#ffb070'; ctx.beginPath(); ctx.moveTo(0, -r - 16); ctx.lineTo(-10, -r); ctx.lineTo(10, -r); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = `rgba(255,190,130,${0.8 * k})`; ctx.fillText('KNOCK · KNOCK · KNOCK', cx, H / 2 + r + 18);
    }
  }
  // your breath, under the water (and coming back after)
  if (alive && (S.under || S.br < 0.999)) {
    const bw = phone ? 120 : 180, x0 = cx - bw / 2, y0 = H / 2 + (phone ? 54 : 70), lo = S.br < 0.3;
    ctx.fillStyle = 'rgba(8,16,20,0.6)'; ctx.fillRect(x0 - 2, y0 - 2, bw + 4, 9);
    ctx.fillStyle = lo ? `rgba(230,110,90,${0.75 + 0.25 * Math.sin(t * 10)})` : '#8fd0e8'; ctx.fillRect(x0, y0, bw * S.br, 5);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = lo ? '#f0a090' : 'rgba(200,230,240,0.85)';
    ctx.fillText(S.br <= 0 ? 'DROWNING · GET UP OUT OF THE WATER' : 'BREATH', cx, y0 + 9);
  }
  // taking Knock's key: a ring round the sights filling
  if (S.useT > 0) {
    const k = Math.min(1, S.useT / GWH.TAKE);
    ctx.strokeStyle = 'rgba(224,154,90,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = GW_KEYS[2].c; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
  }
  // he's reached you: his face at the glass
  if (S.scare > 0) { ctx.save(); drawKnockScare(SK.KNOCK_SCARE_TIME - S.scare); ctx.restore(); }
}

// ---------- a shot of yours at him: wood, and nothing more ----------
function gwShot(x, y, z, lh, lp) {
  const K = RAID.st.kn; if (!K) return;
  const sx = Math.sin(lh), sy = Math.cos(lh), dx = K.x - x, dy = K.y - y, tt = dx * sx + dy * sy, perp = Math.abs(dx * sy - dy * sx);
  if (tt < 0.3 || tt > 60 || perp > 0.32) return;
  const hz = z + Math.tan(lp) * tt - FPSC.GROUND - K.jz; if (hz < 0 || hz > KN.S) return;
  if (!gwClear(x, y, z - FPSC.GROUND, K.x, K.y, K.jz + hz)) return;
  GH3.knHit = 0.15;
  fpsPuff(K.x - sx * 0.25, K.y - sy * 0.25, FPSC.GROUND + K.jz + hz, '170,120,70', 4);
  try { if (!soundOff()) { tone(190 + Math.random() * 40, 'triangle', 0.002, 0.22, 0.09, { to: 120 }); noise('bandpass', 1400, 5, 0.002, 0.12, 0.05); } } catch (e) {}
  const S = RAID.st; if (!S.saidWood) { S.saidWood = 1; fpsFeed('Your shot thuds into Knock like into a mast. Nothing hurts him.'); }
}
function gwSound(k) {
  try {
    if (soundOff()) return;
    if (k === 'take') { if (!sfxPlay('pickup', { vol: 0.7 })) tone(880, 'sine', 0.005, 0.12, 0.2, { to: 1320 }); tone(2400, 'sine', 0.002, 0.05, 0.15, { delay: 0.05 }); }
    else if (k === 'drop') { for (let i = 0; i < 3; i++) tone(2100 - i * 300, 'triangle', 0.002, 0.08 / (i + 1), 0.1, { delay: i * 0.09 }); }
    else if (k === 'set') { tone(240, 'square', 0.002, 0.08, 0.06, { to: 120 }); noise('bandpass', 2600, 6, 0.002, 0.12, 0.05, { delay: 0.12 }); tone(160, 'triangle', 0.002, 0.18, 0.12, { delay: 0.2, to: 90 }); }
    else if (k === 'open') { sfxPlay('door', { vol: 0.9, rate: 0.8 }); sfxPlay('creak', { vol: 0.7, rate: 0.6, delay: 0.3 }); }
  } catch (e) {}
}
