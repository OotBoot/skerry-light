// Wrackhaven's dressing: the small things that make its houses look built rather than boxed. Shutters, window boxes,
// chimneys, quoins, plinths, half-timbering, trade signs, door hoods and downpipes for the outsides; a clock, a
// balustrade, a cornice, columns, a pediment, a slate pyramid roof and belfry louvres for the town hall; and for the
// rooms a forge and an anvil, school desks and a blackboard, bookcases, the council's table, a cooper's cask and his
// hoops, chest tombs and gravestones, pews, and a wooden stair with its banister. Each is a kind of prop (FPI_K),
// built of the same boxes and cylinders as the rest (src/fpsisle.js, src/zombies.js), and most have no solid at all:
// they're only to look at, and stand on or against walls that already stop you.
// Facing: anything on a wall is put at a point on the wall's face (the outer face for the outsides, the room's face
// for things inside; walls are 0.5 thick, so a face is 0.25 off the wall's line), and its front is local -v: with
// angle a it faces (sin a, -cos a), as the tonic cabinets do (a = 0 faces south, PI north, PI/2 east, -PI/2 west).
// Local +u runs along the wall to the right as you face it. Things standing free face -v in the same way. Heights
// are from the floor the prop stands on (lift lifts the lot, as everywhere); the cornice, the pediment and the clock
// are drawn about local z 0 (or z), so lift (or z) puts them up where they belong.
// Kept light: a few boxes to a piece, runs of books and balusters drawn as few parts as will read, since the village
// has hundreds of them.

const ZMV = {
  oak: '#2e241a', oak2: '#3a2c20', iron: '#1e2022', iron2: '#2a2c30', slate: '#363a40', slate2: '#2e3238', lead: '#4a4e52',
  dress: '#8a867a', dress2: '#7a766c', dress3: '#6e6b62', brick: ['#5e3a2c', '#4e3226', '#6a4232'], pot: '#7a4a32',
  chalk: '#c8c8b8', gilt: '#b0904a', cream: '#d0c4a0', black: '#141416', baize: '#2e4a36', red: '#6a2a24',
  paint: ['#3a5048', '#5a3a30', '#34465a', '#5a5640', '#2e3e2e'],
};
// a bar from (u0, z0) to (u1, z1) flat on the wall's plane, at v (t thick in its plane, d deep)
function zmvBarU(A, c, u0, z0, u1, z1, v, t, d) { A.box(c, (u0 + u1) / 2, v, (z0 + z1) / 2 - t / 2, Math.hypot(u1 - u0, z1 - z0), d, t, 0, 0, Math.atan2(z1 - z0, u1 - u0)); }
// a bar from (v0, z0) to (v1, z1) in the plane across the wall (a bracket's strut), at u (w wide, t thick)
function zmvBarV(A, c, u, v0, z0, v1, z1, w, t) { A.box(c, u, (v0 + v1) / 2, (z0 + z1) / 2 - t / 2, w, Math.hypot(v1 - v0, z1 - z0), t, 0, Math.atan2(z1 - z0, v1 - v0), 0); }
// a pick from a list by the prop's seed (so the same village is dressed the same for everyone)
const zmvPick = (p, a, k) => a[Math.floor(fpiHash(p.sd || 0, k || 0) * a.length) % a.length];

// ---------- the outsides of the houses ----------
Object.assign(FPI_K, {
  // a pair of shutters hung open either side of a window w wide (z0 to z1): ledged planks or louvres (style 'plank' |
  // 'louvre', else by the seed), painted c, on iron strap hinges, a shutter dog holding each back
  vshutters: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const w = p.w || 1.6, z0 = p.z0 != null ? p.z0 : 1.0, z1 = p.z1 != null ? p.z1 : 2.35, h = z1 - z0, sw = w / 2, c = p.c || zmvPick(p, ZMV.paint, 1);
      const lou = p.style ? p.style === 'louvre' : fpiHash(p.sd || 0, 2) < 0.5, dk = '#' + new THREE.Color(c).multiplyScalar(0.6).getHexString();
      for (const s of [-1, 1]) {
        const uc = s * (w / 2 + 0.06 + sw / 2), ue = s * (w / 2 + 0.06);   // (the middle of the leaf, and its hinged edge)
        if (lou) {
          for (const k of [-1, 1]) A.box(c, uc + k * (sw / 2 - 0.05), -0.035, z0, 0.1, 0.05, h);
          for (const zz of [z0, z0 + h / 2 - 0.05, z1 - 0.1]) A.box(c, uc, -0.035, zz, sw - 0.1, 0.05, 0.1);
          A.box(dk, uc, -0.02, z0 + 0.1, sw - 0.1, 0.02, h - 0.2);
          const n = Math.max(3, Math.round((h / 2 - 0.15) / 0.11));
          for (const [a0, a1] of [[z0 + 0.1, z0 + h / 2 - 0.05], [z0 + h / 2 + 0.05, z1 - 0.1]]) for (let i = 0; i < n; i++) A.box(c, uc, -0.04, a0 + (i + 0.5) * (a1 - a0) / n - 0.02, sw - 0.1, 0.06, 0.035, 0, 0.6, 0);
        } else {
          A.box(c, uc, -0.035, z0, sw, 0.04, h);
          for (let i = 1; i < 3; i++) A.box(dk, uc - sw / 2 + i * sw / 3, -0.056, z0 + 0.02, 0.015, 0.005, h - 0.04);
          for (const zz of [z0 + 0.15, z1 - 0.3]) A.box(dk, uc, -0.07, zz, sw - 0.06, 0.03, 0.14);
          zmvBarU(A, dk, uc - s * (sw / 2 - 0.1), z0 + 0.29, uc + s * (sw / 2 - 0.1), z1 - 0.3, -0.07, 0.1, 0.03);
        }
        // the strap hinges, from the window's side, and their pins in the reveal
        for (const zz of [z0 + 0.2, z1 - 0.25]) { A.box(ZMV.iron, ue + s * sw * 0.33, -0.09, zz, sw * 0.62, 0.012, 0.045); A.cyl(ZMV.iron, ue, -0.06, zz - 0.03, 0.02, 0.1, 0, 0, 0, 'cyl6'); }
        // the shutter dog
        A.box(ZMV.iron, s * (w / 2 + 0.06 + sw + 0.08), -0.05, z0 + 0.22, 0.04, 0.06, 0.1, 0, 0, s * 0.5);
      }
    },
  },
  // a window box under a sill at z: a planked trough on two iron brackets, greenery and flowers of one colour
  vwinbox: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const w = p.w || 1.4, z = p.z != null ? p.z : 1.0, fl = p.flowers || zmvPick(p, ['#d84050', '#e88aa8', '#e8e0d0', '#f0d060', '#a070c0'], 3);
      A.box(FPI_C.wood2, 0, -0.2, z - 0.24, w, 0.3, 0.24); A.box(FPI_C.wood3, 0, -0.2, z - 0.25, w + 0.04, 0.32, 0.04); A.box(FPI_C.wood3, 0, -0.355, z - 0.04, w + 0.04, 0.03, 0.05);
      A.box('#2a2018', 0, -0.2, z - 0.02, w - 0.06, 0.24, 0.02);
      for (const s of [-1, 1]) zmvBarV(A, ZMV.iron, s * (w / 2 - 0.15), -0.02, z - 0.55, -0.3, z - 0.25, 0.03, 0.03);
      const n = Math.round(w * 6);
      for (let i = 0; i < n; i++) { const u = -w / 2 + 0.08 + (i + A.r()) * (w - 0.16) / n, v = -0.2 + (A.r() - 0.5) * 0.16; A.part('blade', A.r() < 0.5 ? '#4e7a3a' : '#3e6a30', u, v, z, 0.16, 0.28 + A.r() * 0.22, 1, A.r() * 3, (A.r() - 0.5) * 0.8, (A.r() - 0.5) * 0.8); }
      for (let i = 0; i < n * 0.8; i++) A.part('sph', fl, -w / 2 + 0.1 + A.r() * (w - 0.2), -0.2 + (A.r() - 0.5) * 0.18, z + 0.18 + A.r() * 0.2, 0.09, 0.07, 0.09);
      // a trail of ivy over the front
      for (const u of [-w * 0.3, w * 0.22]) A.box('#3a5a30', u, -0.37, z - 0.45, 0.12, 0.02, 0.4);
    },
  },
  // a chimney stack from z0 (sink it into the roof: it's drawn from there) hh high, of brick or stone (mat, else by
  // the seed), an oversailing cap and two or three pots
  vchimney: {
    noShadow: true,
    sol(p) { const z0 = p.z0 || 0; return [fpiBox(p, 0, 0, (p.w || 0.9) / 2, (p.d || 0.7) / 2, z0 + (p.hh || 1.6), { z0, mv: false, col: ZMV.brick[0] })]; },
    b3(p, A) {
      const w = p.w || 0.9, d = p.d || 0.7, z0 = p.z0 || 0, hh = p.hh || 1.6, br = p.mat ? p.mat === 'brick' : fpiHash(p.sd || 0, 4) < 0.6;
      const n = Math.max(2, Math.round(hh / 0.4)), ch = hh / n;
      for (let i = 0; i < n; i++) A.box(br ? ZMV.brick[(i + (p.sd || 0)) % 3] : (i % 2 ? FPI_C.stone : FPI_C.stone2), 0, 0, z0 + i * ch, w * (i % 2 ? 1 : 1.012), d * (i % 2 ? 1.012 : 1), ch * 1.01);
      A.box('#5a5048', 0, 0, z0 + hh, w + 0.16, d + 0.16, 0.1); A.box(br ? ZMV.brick[1] : FPI_C.stone3, 0, 0, z0 + hh + 0.1, w + 0.06, d + 0.06, 0.12);
      const np = w > 1.0 ? 3 : 2;
      for (let i = 0; i < np; i++) {
        const u = (i - (np - 1) / 2) * (w / np), ph = 0.32 + fpiHash(p.sd || 0, 10 + i) * 0.22, t = z0 + hh + 0.22;
        A.cyl(ZMV.pot, u, 0, t, 0.11, ph, 0, 0, 0, 'cyl8'); A.cyl('#6a3e2a', u, 0, t + ph - 0.05, 0.13, 0.06, 0, 0, 0, 'cyl8');
        A.part('disc', '#0a0908', u, 0, t + ph + 0.012, 0.2, 1, 0.2);
      }
      A.box(ZMV.lead, 0, 0, z0, w + 0.06, d + 0.06, 0.12);   // (the flashing where it meets the roof)
    },
  },
  // dressed quoins up a building's outer corner, long and short by turns. Put at the corner itself (the wall lines
  // meet 0.25 inside it each way); the building lies in local +u, +v, and the stones go on its two faces toward
  // -v and -u. So a = 0 dresses a south-west corner, PI/2 south-east, PI north-east, -PI/2 north-west
  vquoins: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const hh = p.hh || 3.6, n = Math.max(2, Math.round(hh / 0.36)), ch = hh / n, P = 0.045;
      for (let i = 0; i < n; i++) {
        const z = i * ch + 0.015, h = ch - 0.03, L = i % 2 ? 0.42 : 0.8, S = i % 2 ? 0.8 : 0.42, c = i % 3 === 1 ? ZMV.dress2 : ZMV.dress;
        A.box(c, (L - P) / 2, -P / 2, z, L + P, P, h);   // (on the -v face, wrapping the corner)
        A.box(c, -P / 2, S / 2, z, P, S, h);              // (on the -u face)
      }
    },
  },
  // a plinth of dressed stone along the foot of a wall (len along u), hh high, with a weathered top course
  vbase: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const len = p.len || 4, hh = p.hh || 0.45, n = Math.max(1, Math.round(len / 1.6)), sl = len / n;
      for (let i = 0; i < n; i++) A.box(i % 2 ? ZMV.dress3 : '#646058', -len / 2 + (i + 0.5) * sl, -0.06, -0.15, sl - 0.015, 0.12, hh + 0.15 - 0.06);
      A.box(ZMV.dress2, 0, -0.075, hh - 0.07, len, 0.15, 0.07);
      A.box(ZMV.dress3, 0, -0.065, hh - 0.02, len, 0.12, 0.04, 0, -0.35, 0);
    },
  },
  // half-timbering on a plastered face, len along u, hh high: a sole plate, a top plate, a middle rail, posts at the
  // ends, beside openings and between, and braces in the end bays, all dark oak. opens: [{ u, w, z0, z1 }] (u along
  // it, from its middle) keeps the frame out of the windows and doors (z0 0 for a door: the sole plate breaks there)
  vtimber: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const len = p.len || 4, hh = p.hh || 3.6, T = 0.18, V = -0.03, D = 0.06, ops = p.opens || [], C = p.c || ZMV.oak;
      const L0 = -len / 2, L1 = len / 2, zs = 0.3, zm = hh * 0.5, zt = hh - 0.22;
      const hit = (u0, u1, z0, z1) => ops.find(o => u1 > o.u - o.w / 2 && u0 < o.u + o.w / 2 && z1 > (o.z0 || 0) && z0 < (o.z1 != null ? o.z1 : 2.5));
      // the horizontals, cut round the openings
      for (const z of [zs, zm, zt]) {
        let cuts = ops.filter(o => z + T > (o.z0 || 0) && z < (o.z1 != null ? o.z1 : 2.5)).map(o => [o.u - o.w / 2, o.u + o.w / 2]).sort((a, b) => a[0] - b[0]), u = L0;
        for (const [a, b] of cuts.concat([[L1, L1]])) { if (a - u > 0.1) A.box(C, (u + Math.min(a, L1)) / 2, V, z, Math.min(a, L1) - u, D, T); u = Math.max(u, b); }
      }
      // the posts: ends, either side of each opening, and enough between that no bay is wider than 1.6
      let us = [L0 + T / 2, L1 - T / 2];
      for (const o of ops) us.push(o.u - o.w / 2 - T / 2, o.u + o.w / 2 + T / 2);
      us = us.filter(u => u >= L0 && u <= L1).sort((a, b) => a - b);
      for (let i = 0; i < us.length - 1; i++) { const g = us[i + 1] - us[i], k = Math.floor(g / 1.6); for (let j = 1; j <= k; j++) { const u = us[i] + j * g / (k + 1); if (!hit(u - T / 2, u + T / 2, zs, zt)) us.push(u); } }
      us = us.sort((a, b) => a - b).filter((u, i, a) => !i || u - a[i - 1] > 0.3);
      for (const u of us) {
        // (a post beside a window runs past it; cut only where it would cross one)
        const o = hit(u - T / 2 + 0.01, u + T / 2 - 0.01, zs, zt);
        if (!o) { A.box(C, u, V, zs, T, D, zt - zs); continue; }
        if ((o.z0 || 0) > zs + T) A.box(C, u, V, zs, T, D, (o.z0 || 0) - zs);
        if ((o.z1 != null ? o.z1 : 2.5) < zt) A.box(C, u, V, o.z1 != null ? o.z1 : 2.5, T, D, zt - (o.z1 != null ? o.z1 : 2.5));
      }
      // braces in the end bays, lower and upper, leaning in toward the middle; and in any bay a clear 0.8..2 wide, a
      // lower brace by turns
      for (let i = 0; i < us.length - 1; i++) {
        const a = us[i] + T / 2, b = us[i + 1] - T / 2, g = b - a; if (g < 0.6 || g > 2.2) continue;
        const end = i === 0 || i === us.length - 2, dir = i < us.length / 2 ? 1 : -1;
        for (const [z0, z1, up] of [[zs + T, zm, 0], [zm + T, zt, 1]]) {
          if (!end && (up || i % 2)) continue;
          if (hit(a, b, z0, z1)) continue;
          if (dir > 0) zmvBarU(A, C, a + 0.05, z0 + 0.05, b - 0.05, z1 - 0.05, V - 0.002, 0.15, D * 0.9); else zmvBarU(A, C, a + 0.05, z1 - 0.05, b - 0.05, z0 + 0.05, V - 0.002, 0.15, D * 0.9);
        }
      }
    },
  },
  // a trade sign hanging from a wrought-iron bracket out from the wall at about z 2.9; the board stands edge-on to
  // the wall (seen from up and down the street), painted c, its glyph in gilt on both faces: 'fish', 'anchor',
  // 'barrel', 'mug', 'bell', 'anvil', 'book', 'rope', 'boat', 'scales', 'key' or 'pipe'
  vsign: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const c = p.c || zmvPick(p, ['#2a3a4a', '#4a2a24', '#2e3e2e', '#3a3428'], 5), G0 = p.gc || ZMV.gilt, K = ZMV.iron, F = Math.PI / 2;
      // the bracket: a plate on the wall, the arm out, a strut under it, a scroll in the angle
      A.box(K, 0, -0.025, 2.55, 0.08, 0.05, 0.75);
      A.box(K, 0, -0.6, 3.12, 0.04, 1.2, 0.04);
      zmvBarV(A, K, 0, -0.04, 2.6, -0.72, 3.12, 0.035, 0.035);
      A.part('torus', K, 0, -0.32, 2.98, 0.24, 0.24, 0.5, F); A.part('sph', K, 0, -1.2, 3.14, 0.07, 0.07, 0.07);
      // the board, on two rings
      const vc = -0.66, zc = 2.62, bw = 0.78, bh = 0.6, T = 0.05;
      for (const v of [vc - bw / 2 + 0.08, vc + bw / 2 - 0.08]) { A.part('torus', K, 0, v, 3.05, 0.08, 0.1, 0.5, F); A.box(K, 0, v, zc + bh / 2, 0.015, 0.015, 0.1); }
      A.box(c, 0, vc, zc - bh / 2, T, bw, bh);
      A.box(G0, 0, vc, zc - bh / 2 - 0.02, T + 0.012, bw + 0.04, 0.04); A.box(G0, 0, vc, zc + bh / 2 - 0.02, T + 0.012, bw + 0.04, 0.04);
      for (const k of [-1, 1]) A.box(G0, 0, vc + k * (bw / 2 + 0.0), zc - bh / 2, T + 0.012, 0.04, bh);
      // the glyph: x out from the wall, y up, from the board's middle; drawn on both faces
      const g = (tpl, col, x, y, sx, sy, rot, s3) => { for (const s of [-1, 1]) A.part(tpl, col, s * (T / 2 + 0.012), vc - x, zc + y, s3 || 0.02, sy, sx, 0, -(rot || 0), 0); };
      const ring = (col, x, y, r, t) => { for (const s of [-1, 1]) A.part('torus', col, s * (T / 2 + 0.012), vc - x, zc + y, r * 2, r * 2, t || 0.3, F); };
      const D0 = '#1a1612';
      switch (p.glyph) {
        case 'anchor':
          g('box', G0, 0, -0.02, 0.04, 0.36); g('box', G0, 0, 0.13, 0.2, 0.04); ring(G0, 0, 0.2, 0.05);
          g('box', G0, -0.08, -0.17, 0.18, 0.04, -0.6); g('box', G0, 0.08, -0.17, 0.18, 0.04, 0.6); g('box', G0, -0.16, -0.12, 0.06, 0.06, 0.8); g('box', G0, 0.16, -0.12, 0.06, 0.06, -0.8);
          break;
        case 'barrel':
          g('sph', G0, 0, 0, 0.3, 0.38); for (const y of [-0.12, 0.12]) g('box', D0, 0, y, 0.29, 0.025, 0, 0.03); g('box', D0, 0, 0, 0.025, 0.08, 0, 0.03);
          break;
        case 'mug':
          g('box', G0, -0.03, -0.03, 0.2, 0.26); g('sph', ZMV.cream, -0.03, 0.12, 0.24, 0.1); ring(G0, 0.11, -0.02, 0.07);
          for (const x of [-0.08, 0.02]) g('box', D0, x, -0.03, 0.02, 0.22, 0, 0.03);
          break;
        case 'bell':
          g('cone', G0, 0, 0.0, 0.28, 0.3); g('sph', G0, 0, 0.14, 0.16, 0.12); g('box', G0, 0, -0.15, 0.32, 0.04); g('sph', G0, 0, -0.2, 0.06, 0.06); ring(G0, 0, 0.22, 0.04);
          break;
        case 'anvil':
          g('box', G0, 0.02, 0.07, 0.3, 0.08); g('cone', G0, -0.2, 0.08, 0.06, 0.16, -F); g('box', G0, 0.02, -0.02, 0.1, 0.12); g('box', G0, 0.02, -0.12, 0.24, 0.06);
          g('box', G0, 0.14, 0.12, 0.04, 0.1, -0.5);
          break;
        case 'book':
          g('box', ZMV.cream, -0.1, 0.02, 0.2, 0.26, 0.12); g('box', ZMV.cream, 0.1, 0.02, 0.2, 0.26, -0.12); g('box', G0, 0, -0.01, 0.03, 0.3);
          for (const y of [0.08, 0.02, -0.04]) { g('box', D0, -0.1, y + 0.01, 0.14, 0.015, 0.12, 0.03); g('box', D0, 0.1, y + 0.01, 0.14, 0.015, -0.12, 0.03); }
          break;
        case 'rope':
          for (const r of [0.17, 0.12, 0.07]) ring(G0, 0, 0, r, 0.5); g('box', G0, 0.18, -0.14, 0.04, 0.14, 0.4);
          break;
        case 'boat':
          g('box', G0, 0, -0.12, 0.42, 0.08); g('box', G0, -0.22, -0.09, 0.08, 0.08, 0.7); g('box', G0, 0.22, -0.09, 0.08, 0.08, -0.7);
          g('box', G0, 0, 0.07, 0.025, 0.34); g('box', ZMV.cream, 0.08, 0.08, 0.13, 0.22); g('box', ZMV.cream, -0.06, 0.06, 0.08, 0.16);
          break;
        case 'scales':
          g('box', G0, 0, 0, 0.03, 0.36); g('box', G0, 0, 0.15, 0.4, 0.025); g('box', G0, 0, -0.17, 0.16, 0.03);
          for (const x of [-0.18, 0.18]) { g('box', G0, x - 0.04, 0.06, 0.012, 0.18, 0.25); g('box', G0, x + 0.04, 0.06, 0.012, 0.18, -0.25); g('box', G0, x, -0.04, 0.14, 0.03); }
          break;
        case 'key':
          ring(G0, -0.16, 0, 0.07, 0.6); g('box', G0, 0.04, 0, 0.32, 0.035); g('box', G0, 0.15, -0.05, 0.03, 0.09); g('box', G0, 0.09, -0.04, 0.03, 0.07);
          break;
        case 'pipe':
          g('box', G0, -0.12, -0.04, 0.1, 0.14); g('box', G0, -0.12, -0.12, 0.08, 0.05); g('box', G0, 0.06, -0.05, 0.28, 0.03, 0.25);
          g('sph', '#8a8478', -0.12, 0.1, 0.07, 0.06); g('sph', '#8a8478', -0.08, 0.18, 0.09, 0.07);
          break;
        default:   // fish
          g('sph', G0, -0.03, 0, 0.38, 0.17); g('box', G0, 0.2, 0.05, 0.1, 0.04, 0.6); g('box', G0, 0.2, -0.05, 0.1, 0.04, -0.6);
          g('sph', D0, -0.15, 0.025, 0.03, 0.03, 0, 0.03); g('box', D0, -0.08, 0, 0.012, 0.1, 0, 0.03); g('box', G0, 0.0, 0.08, 0.12, 0.03, -0.15);
      }
    },
  },
  // a small pitched hood over a door w wide, on two shaped brackets: eaves at 2.75, ridge at 3.2, out 0.85
  vcanopy: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const w = p.w || 2.4, D = 0.85, ze = 2.75, rise = 0.45, pitch = Math.atan2(rise, w / 2), sl = Math.hypot(w / 2, rise) + 0.12, c = p.c || ZMV.slate;
      for (const s of [-1, 1]) {
        A.part('box', c, s * w / 4, -D / 2, ze + rise / 2 + 0.05, sl, 0.06, D + 0.06, 0, 0, -s * pitch);
        A.part('box', FPI_C.wood3, s * w / 4, -D - 0.02, ze + rise / 2 - 0.01, sl, 0.1, 0.04, 0, 0, -s * pitch);   // (the bargeboards)
        const u = s * (w / 2 - 0.12);
        A.box(FPI_C.wood3, u, -0.04, 1.95, 0.1, 0.08, 0.85);
        zmvBarV(A, FPI_C.wood3, u, -0.06, 2.05, -D + 0.06, ze - 0.05, 0.09, 0.09);
        A.box(FPI_C.wood3, u, -D / 2, ze - 0.12, 0.1, D, 0.1);
      }
      A.part('tri', '#3a2e24', 0, -D + 0.02, ze + rise / 3 - 0.02, (w - 0.2) / 0.866, 0.04, rise / 0.75, 0, -Math.PI / 2, 0);
      A.log(ZMV.lead, 0, -D / 2, ze + rise + 0.08, 0.04, D + 0.06, Math.PI / 2);
      A.box('#3a2e24', 0, -0.05, ze - 0.02, w - 0.1, 0.1, 0.06);
    },
  },
  // a gutter's hopper and the downpipe under it to a shoe at the foot, hh the eaves (a short run of gutter, gut long)
  vdownpipe: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const hh = p.hh || 3.6, K = ZMV.iron2, v = -0.1, gut = p.gut != null ? p.gut : 1.2;
      if (gut > 0) A.part('half', K, 0, -0.12, hh - 0.02, 0.18, gut, 0.18, 0, 0, Math.PI / 2);
      A.part('taper', K, 0, v, hh - 0.25, 0.24, 0.26, 0.2, 0, Math.PI, 0); A.box(K, 0, v, hh - 0.14, 0.27, 0.23, 0.04);
      A.cyl(K, 0, v, 0.18, 0.055, hh - 0.5, 0, 0, 0, 'cyl6');
      for (let z = 0.6; z < hh - 0.5; z += 1.1) { A.cyl(K, 0, v, z, 0.07, 0.07, 0, 0, 0, 'cyl6'); A.box(K, 0, -0.04, z, 0.04, 0.08, 0.05); }
      A.log(K, 0, v - 0.07, 0.14, 0.055, 0.2, Math.PI / 2, 0.6, 'cyl6');
      A.box('#16181a', 0, -0.03, 0.0, 0.34, 0.06, 0.4);   // (wet stain at the foot)
    },
  },
});

// ---------- the town hall ----------
Object.assign(FPI_K, {
  // a clock face, r across, its middle at local z (z, default 0: use lift or z), facing -v: a dark square board, a
  // pale dial, a black ring and chapter ring, hour marks, and the hands at ten to nine
  vclock: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const r = p.r || 1.0, z = p.z || 0, F = Math.PI / 2;
      A.box('#1e2226', 0, -0.03, z - r - 0.12, 2 * r + 0.24, 0.06, 2 * r + 0.24);
      for (const s of [-1, 1]) for (const t of [-1, 1]) A.part('sph', ZMV.gilt, s * (r + 0.02), -0.065, z + t * (r + 0.02), 0.1, 0.1, 0.04);
      A.part('disc', '#c8c2ae', 0, -0.07, z, r * 2, 1, r * 2, 0, F, 0, 'glow');
      A.part('torus', ZMV.black, 0, -0.08, z, r * 2.1, r * 2.1, 1.2);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, big = i % 3 === 0; A.box(ZMV.black, Math.sin(a) * r * 0.76, -0.082, z + Math.cos(a) * r * 0.76 - (big ? 0.09 : 0.06) * r, big ? 0.05 * r : 0.03 * r, 0.01, (big ? 0.18 : 0.12) * r, 0, 0, -a); }
      const hand = (a, L, t, back) => A.box(ZMV.black, Math.sin(a) * (L - back) / 2 * r, -0.095, z + Math.cos(a) * (L - back) / 2 * r - (L + back) * r / 2, t * r, 0.012, (L + back) * r, 0, 0, -a);
      hand(8.83 / 12 * Math.PI * 2, 0.5, 0.07, 0.12); hand(50 / 60 * Math.PI * 2, 0.74, 0.045, 0.16);
      A.part('cyl8', ZMV.gilt, 0, -0.1, z, 0.09 * r, 0.02, 0.09 * r, 0, F, 0);
    },
  },
  // a balustrade along a flat roof's edge, len along u, about 1.0 high: a plinth, turned balusters, dies every few
  // metres, a coping. Put it at the outer face like the rest; it stands centred on the wall's line, 0.25 behind.
  // (Its solid stops you, not shots: ray true to make it cover)
  vparapet: {
    noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0.25, (p.len || 4) / 2, 0.15, 1.02, { ray: !!p.ray, occ: false, col: ZMV.dress })]; },
    b3(p, A) {
      const len = p.len || 4, v = 0.25, nd = Math.max(1, Math.round(len / 2.6)), sd = len / nd;
      A.box(ZMV.dress2, 0, v, -0.02, len, 0.36, 0.2); A.box(ZMV.dress, 0, v, 0.86, len, 0.4, 0.1); A.box(ZMV.dress2, 0, v, 0.96, len - 0.02, 0.34, 0.06);
      for (let k = 0; k <= nd; k++) {
        const u = -len / 2 + k * sd, du = k === 0 ? 0.15 : k === nd ? -0.15 : 0; A.box(ZMV.dress3, u + du, v, 0.18, 0.3, 0.32, 0.68);
        if (k === nd) break;
        const a = u + (k === 0 ? 0.3 : 0.15), b = u + sd - (k === nd - 1 ? 0.3 : 0.15), n = Math.max(1, Math.round((b - a) / 0.32));
        for (let i = 0; i < n; i++) {
          const bu = a + (i + 0.5) * (b - a) / n;
          A.part('taper', ZMV.dress, bu, v, 0.38, 0.17, 0.4, 0.17); A.part('taper', ZMV.dress, bu, v, 0.7, 0.17, 0.32, 0.17, 0, 0, Math.PI);
        }
      }
    },
  },
  // a moulded cornice band along a wall's top, its top at local z 0 (use lift), len along u, stepping out to 0.34
  // in front of the face. e0 / e1: carry the -u / +u end on round an outer corner (set it on one of the two that meet)
  vcornice: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const len = p.len || 4, c = p.c || ZMV.dress, c2 = p.c2 || ZMV.dress2;
      for (const [z0, h, P, col] of [[-0.62, 0.12, 0.06, c2], [-0.5, 0.14, 0.13, c], [-0.36, 0.1, 0.2, c2], [-0.26, 0.2, 0.34, c], [-0.06, 0.06, 0.26, c2]]) {
        const a = -len / 2 - (p.e0 ? P : 0), b = len / 2 + (p.e1 ? P : 0);
        A.box(col, (a + b) / 2, -P / 2, z0, b - a, P, h);
      }
      // dentils under the corona
      const n = Math.floor(len / 0.32);
      for (let i = 0; i < n; i++) A.box(c2, -len / 2 + (i + 0.5) * len / n, -0.17, -0.36, 0.13, 0.06, 0.1);
    },
  },
  // a column: a square base, a shaft (r) with an entasis of sorts, a capital and abacus, its top at hh
  vcolumn: {
    noShadow: false,
    sol(p) { const r = p.r || 0.32; return [fpiCirc(p, 0, 0, r * 1.25, p.hh || 4.2, { col: ZMV.dress })]; },
    b3(p, A) {
      const r = p.r || 0.32, hh = p.hh || 4.2, c = p.c || ZMV.dress;
      A.box(ZMV.dress2, 0, 0, -0.1, r * 2.7, r * 2.7, 0.34); A.cyl(c, 0, 0, 0.24, r * 1.22, 0.14, 0, 0, 0, 'cyl8'); A.part('torus', c, 0, 0, 0.42, r * 2.3, r * 2.3, r * 4, 0, Math.PI / 2, 0);
      const s0 = 0.45, s1 = hh - 0.5;
      for (const ry of [0, Math.PI / 8]) { A.cyl(c, 0, 0, s0, r, (s1 - s0) * 0.6, ry, 0, 0, 'cyl8'); A.part('cyl8', c, 0, 0, s0 + (s1 - s0) * 0.8, r * 1.9, (s1 - s0) * 0.41, r * 1.9, ry); }
      A.cyl(ZMV.dress2, 0, 0, s1 - 0.04, r * 1.06, 0.06, 0, 0, 0, 'cyl8');
      A.part('cone', c, 0, 0, s1 + 0.14, r * 2.7, 0.28, r * 2.7, 0, Math.PI, 0);
      A.box(ZMV.dress2, 0, 0, hh - 0.2, r * 2.9, r * 2.9, 0.2);
    },
  },
  // a pediment over a portico, w wide at its foot and rise to the apex, its foot at local z 0 (use lift), its front
  // -v at the face: a recessed tympanum with a roundel, the level cornice and the raking cornices, a block at the apex
  vpediment: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const w = p.w || 6, rise = p.rise || 1.4, pitch = Math.atan2(rise, w / 2), c = p.c || ZMV.dress, c2 = ZMV.dress2;
      A.part('tri', ZMV.dress3, 0, 0.2, rise / 3 + 0.02, (w - 0.3) / 0.866, 0.3, (rise - 0.1) / 0.75, 0, -Math.PI / 2, 0);
      A.box(c, 0, 0.05, -0.36, w + 0.3, 0.5, 0.2); A.box(c2, 0, 0.03, -0.16, w + 0.42, 0.56, 0.16);
      for (const s of [-1, 1]) for (const [t, P, col] of [[0.16, 0.14, c2], [0.12, 0.24, c]]) {
        const L = Math.hypot(w / 2, rise) + 0.25, o = t / 2 + (col === c ? 0.12 : 0);
        A.part('box', col, s * (w / 4 + Math.sin(pitch) * o), 0.18 - P / 2 - 0.1, rise / 2 + Math.cos(pitch) * o, L, t, P + 0.3, 0, 0, -s * pitch);
      }
      A.box(c, 0, 0.1, rise + 0.08, 0.36, 0.5, 0.36); A.part('sph', c, 0, 0.1, rise + 0.56, 0.3, 0.3, 0.3);
      A.part('cyl8', '#24262a', 0, 0.04, rise * 0.4, rise * 0.42, 0.05, rise * 0.42, 0, Math.PI / 2, 0);
      A.part('torus', c, 0, 0.0, rise * 0.4, rise * 0.48, rise * 0.48, 1.0);
    },
  },
  // a pyramid roof of slate (c) on a w by d square tower from z0 rising rise to its point: lead along the hips, a
  // timber fascia at the eaves, a finial and a vane at the top
  vpyramid: {
    noShadow: true, col: ZMV.slate,
    sol(p) { const z0 = p.z0 || 0; return [fpiBox(p, 0, 0, (p.w || 6) / 2, (p.d || p.w || 6) / 2, z0 + (p.rise || 4), { z0, mv: false, col: ZMV.slate })]; },
    b3(p, A) {
      const w = p.w || 6, d = p.d || w, z0 = p.z0 || 0, rise = p.rise || 4, c = p.c || ZMV.slate;
      // (stacked frustums: each 'taper' is 0.72 across its top, so heights shrinking by 0.72 keep one slope)
      let k = 1, z = z0, h = 0.28 * rise;
      for (let i = 0; i < 6; i++) { A.part('taper', i % 2 ? c : ZMV.slate2, 0, 0, z + h / 2, w * k, h, d * k); z += h; k *= 0.72; h *= 0.72; }
      A.part('cone', ZMV.lead, 0, 0, z + (z0 + rise - z) / 2, w * k * 1.35, z0 + rise - z, d * k * 1.35);
      A.box(FPI_C.wood3, 0, 0, z0 - 0.18, w + 0.04, d + 0.04, 0.2);
      const Lh = Math.hypot(w / 2, d / 2), th = Math.atan2(rise, Lh), L = Math.hypot(Lh, rise);
      for (const [su, sv] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) A.part('box', ZMV.lead, su * w / 4, sv * d / 4, z0 + rise / 2 + 0.05, L, 0.1, 0.12, Math.atan2(sv * d, su * w) + Math.PI, 0, th);
      const T = z0 + rise;
      A.cyl(ZMV.iron, 0, 0, T - 0.1, 0.04, 1.4, 0, 0, 0, 'cyl6'); A.part('sph', ZMV.gilt, 0, 0, T + 0.3, 0.22, 0.22, 0.22);
      A.box(ZMV.iron, 0, 0, T + 0.9, 0.7, 0.02, 0.02); A.box(ZMV.iron, 0, 0, T + 0.9, 0.02, 0.7, 0.02);
      A.part('tri', ZMV.gilt, 0.12, 0, T + 1.2, 0.5, 0.02, 0.2, 0, 0, -Math.PI / 2); A.box(ZMV.gilt, -0.12, 0, T + 1.12, 0.35, 0.02, 0.16);
    },
  },
  // louvre boards filling a belfry opening w wide from z0 to z1. Unlike the others it goes ON THE WALL'S LINE (the
  // middle of its thickness, as the glass in a window does); the boards slope down outward, to -v
  vlouvre: {
    noShadow: true,
    sol(p) { const z0 = p.z0 != null ? p.z0 : 1.0; return [fpiBox(p, 0, 0, (p.w || 1.2) / 2, 0.15, p.z1 != null ? p.z1 : 2.35, { z0, ray: false, col: FPI_C.wood3 })]; },
    b3(p, A) {
      const w = p.w || 1.2, z0 = p.z0 != null ? p.z0 : 1.0, z1 = p.z1 != null ? p.z1 : 2.35, n = Math.max(3, Math.round((z1 - z0) / 0.2));
      for (const s of [-1, 1]) A.box(FPI_C.wood3, s * (w / 2 - 0.05), 0, z0, 0.1, 0.36, z1 - z0);
      A.box('#0c0b0a', 0, 0.12, z0, w - 0.1, 0.02, z1 - z0);
      for (let i = 0; i < n; i++) A.box(i % 2 ? FPI_C.wood : FPI_C.wood2, 0, 0, z0 + (i + 0.5) * (z1 - z0) / n - 0.015, w - 0.12, 0.34, 0.03, 0, 0.55, 0);
      A.box(FPI_C.wood3, 0, -0.02, z0 - 0.02, w, 0.4, 0.06);
    },
  },
});

// ---------- in the rooms ----------
Object.assign(FPI_K, {
  // a smith's forge against a wall: a brick hearth (w along it, d out from it), its fire glowing, the hood and the flue
  // up to top (the ceiling), the bellows at its +u end, a quench tub at -u, tongs. (Add a light at the coals: about
  // d/2 out from the wall, z 1.0, '#ff8a30', 'fire')
  vforge: {
    col: ZMV.brick[0],
    sol(p) { const w = p.w || 2.4, d = p.d || 1.6; return [fpiBox(p, 0, -d / 2, w / 2, d / 2, 0.85, { col: ZMV.brick[0] }), fpiBox(p, w / 2 + 0.45, -d * 0.45, 0.4, 0.55, 1.0, { col: FPI_C.wood3 }), fpiCirc(p, -w / 2 - 0.4, -d * 0.55, 0.36, 0.6, { col: FPI_C.wood3 })]; },
    b3(p, A) {
      const w = p.w || 2.4, d = p.d || 1.6, top = p.top || ZMC.CEIL, vm = -d / 2;
      for (let i = 0; i < 4; i++) A.box(ZMV.brick[i % 3], 0, vm, -0.1 + i * 0.22, w * (i % 2 ? 1 : 1.01), d * (i % 2 ? 1.01 : 1), 0.23);
      A.box(FPI_C.stone3, 0, vm, 0.78, w + 0.08, d + 0.08, 0.08);
      A.box('#1a0e0a', 0, vm - 0.05, 0.8, w * 0.55, d * 0.55, 0.06);
      for (let i = 0; i < 9; i++) A.part('ico', A.r() < 0.4 ? '#ff7a2a' : A.r() < 0.5 ? '#c84a1a' : '#ffaa50', (A.r() - 0.5) * w * 0.45, vm - 0.05 + (A.r() - 0.5) * d * 0.4, 0.88, 0.14, 0.08, 0.12, A.r() * 3, 0, 0, 'glow');
      A.box('#2a1a14', 0, -0.06, 0.86, w * 0.7, 0.12, 0.7);   // (the fireback)
      // the hood, and the flue up from it
      A.part('taper', ZMV.brick[1], 0, -d * 0.4, 2.15, w * 0.95, 0.9, d * 0.8);
      A.box(ZMV.brick[2], 0, -d * 0.4, 1.65, w * 0.98, d * 0.82, 0.1);
      A.box(ZMV.brick[0], 0, -0.3, 2.55, w * 0.42, 0.6, top - 2.55 + 0.05);
      // the bellows on its frame, its nozzle into the fire, the lever up over it
      const bu = w / 2 + 0.45, bv = -d * 0.45;
      for (const s of [-1, 1]) A.box(FPI_C.wood3, bu + s * 0.3, bv, -0.1, 0.08, 0.9, 0.62);
      A.part('half', '#4a3424', bu, bv, 0.74, 0.62, 1.0, 0.24, 0, 0, Math.PI / 2);
      A.box(FPI_C.wood2, bu, bv, 0.62, 0.66, 1.04, 0.04); A.box(FPI_C.wood2, bu, bv, 0.86, 0.66, 1.04, 0.04, 0, 0.12, 0);
      A.log(ZMV.iron, w / 2 - 0.05, bv + 0.05, 0.72, 0.04, 0.5, 0);
      zmvBarV(A, FPI_C.wood3, bu, bv + 0.4, 0.9, bv - 0.7, 1.5, 0.06, 0.06);
      A.box(FPI_C.rope, bu, bv - 0.68, 0.6, 0.02, 0.02, 0.9);
      // the quench tub, and tongs on the hearth's edge
      A.cyl('#4a3a2a', -w / 2 - 0.4, -d * 0.55, 0, 0.34, 0.58, 0, 0, 0, 'cyl8'); A.cyl(ZMV.iron, -w / 2 - 0.4, -d * 0.55, 0.45, 0.35, 0.05, 0, 0, 0, 'cyl8');
      A.part('disc', '#141a1c', -w / 2 - 0.4, -d * 0.55, 0.56, 0.62, 1, 0.62);
      for (const s of [-1, 1]) A.box(ZMV.iron, -w / 2 + 0.25 + s * 0.03, -d + 0.02, 0.6, 0.02, 0.02, 0.32, 0, 0, s * 0.08);
    },
  },
  // an anvil on its elm block, a hammer on it (horn to +u)
  vanvil: {
    col: ZMV.iron,
    sol(p) { return [fpiCirc(p, 0, 0, 0.45, 0.88, { col: ZMV.iron })]; },
    b3(p, A) {
      A.cyl('#4a3a2a', 0, 0, -0.05, 0.3, 0.55, 0, 0, 0, 'cyl8'); A.cyl(ZMV.iron, 0, 0, 0.4, 0.31, 0.04, 0, 0, 0, 'cyl8');
      A.box(ZMV.iron2, 0, 0, 0.5, 0.36, 0.26, 0.06); A.box(ZMV.iron2, 0, 0, 0.56, 0.2, 0.14, 0.14);
      A.box(ZMV.iron2, -0.04, 0, 0.7, 0.48, 0.18, 0.15); A.box('#3a3e42', -0.04, 0, 0.845, 0.48, 0.18, 0.01);
      A.part('cone', ZMV.iron2, 0.36, 0, 0.79, 0.15, 0.3, 0.13, 0, 0, -Math.PI / 2);
      A.box(ZMV.iron, -0.12, 0, 0.855, 0.05, 0.05, 0.01);
      A.box(FPI_C.wood2, 0.02, 0.06, 0.865, 0.36, 0.03, 0.03, 0.5); A.box(ZMV.iron, -0.12, -0.03, 0.85, 0.06, 0.12, 0.06, 0.5);
    },
  },
  // a school desk with its bench joined on (+v): the pupil sits facing -v, under a sloping lid with an inkwell
  vdesk: {
    col: FPI_C.wood2,
    sol(p) { return [fpiBox(p, 0, 0.22, (p.w || 1.4) / 2, 0.5, 0.8, { col: FPI_C.wood2 })]; },
    b3(p, A) {
      const w = p.w || 1.4, O = FPI_C.wood3;
      for (const s of [-1, 1]) { const u = s * (w / 2 - 0.05); A.box(O, u, 0.22, -0.05, 0.06, 0.96, 0.1); A.box(O, u, -0.05, 0, 0.06, 0.06, 0.74); A.box(O, u, 0.55, 0, 0.06, 0.06, 0.44); A.box(O, u, 0.12, 0, 0.06, 0.06, 0.74); }
      A.box(FPI_C.wood2, 0, 0.03, 0.66, w, 0.5, 0.04, 0, -0.16, 0); A.box(FPI_C.wood, 0, -0.25, 0.74, w, 0.1, 0.04);
      A.box(O, 0, 0.03, 0.42, w - 0.1, 0.42, 0.03); A.box(O, 0, -0.2, 0.46, w - 0.1, 0.03, 0.24);
      A.cyl('#1a1a1c', w * 0.3, -0.25, 0.78, 0.035, 0.03, 0, 0, 0, 'cyl6');
      A.box(FPI_C.wood2, 0, 0.52, 0.4, w - 0.04, 0.28, 0.05);
      if (A.r() < 0.6) A.box(A.r() < 0.5 ? '#4a2a24' : '#2a3a4a', (A.r() - 0.5) * w * 0.5, 0.0, 0.73, 0.22, 0.3, 0.03, (A.r() - 0.5) * 0.6, -0.16, 0);
    },
  },
  // a blackboard on a wall, w wide, z 0.9 to 2.1: its frame, the chalk ledge, chalk on it (a sum, lines of writing)
  vboard: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const w = p.w || 2.4, z0 = 0.9, h = 1.2, CH = ZMV.chalk;
      A.box('#1a1e1c', 0, -0.03, z0, w, 0.04, h); A.box(FPI_C.wood3, 0, -0.035, z0 - 0.06, w + 0.12, 0.05, 0.06); A.box(FPI_C.wood3, 0, -0.035, z0 + h, w + 0.12, 0.05, 0.06);
      for (const s of [-1, 1]) A.box(FPI_C.wood3, s * (w / 2 + 0.03), -0.035, z0, 0.06, 0.05, h);
      A.box(FPI_C.wood2, 0, -0.08, z0 - 0.06, w, 0.1, 0.03); A.box(CH, w * 0.2, -0.09, z0 - 0.03, 0.08, 0.015, 0.015); A.box('#8a7a5a', -w * 0.3, -0.09, z0 - 0.03, 0.14, 0.05, 0.04);
      // lines of writing, a sum with its rule under it, a tick
      for (let i = 0; i < 4; i++) { const L = w * (0.3 + A.r() * 0.25); A.box(CH, -w / 2 + 0.15 + L / 2, -0.052, z0 + h - 0.2 - i * 0.16, L, 0.005, 0.03 + A.r() * 0.015); }
      for (let i = 0; i < 3; i++) A.box(CH, w * 0.3, -0.052, z0 + h - 0.25 - i * 0.15, 0.3, 0.005, 0.035);
      A.box(CH, w * 0.3, -0.052, z0 + h - 0.62, 0.42, 0.005, 0.015);
      A.box(CH, w * 0.3 - 0.27, -0.052, z0 + h - 0.42, 0.1, 0.005, 0.02); A.box(CH, w * 0.3 - 0.27, -0.052, z0 + h - 0.46, 0.02, 0.005, 0.1);
      A.box(CH, -w * 0.15, -0.052, z0 + 0.22, 0.06, 0.005, 0.02, 0, 0, 0.8); A.box(CH, -w * 0.15 + 0.07, -0.052, z0 + 0.25, 0.12, 0.005, 0.02, 0, 0, -0.9);
    },
  },
  // tall shelves against a wall, w wide and hh high (0.45 deep, out to -v): books (in runs of colour, some leaning)
  // or ledgers (tall, dark, labelled)
  vbookcase: {
    col: FPI_C.wood3,
    sol(p) { return [fpiBox(p, 0, -0.23, (p.w || 2.0) / 2, 0.23, p.hh || 2.4, { col: FPI_C.wood3 })]; },
    b3(p, A) {
      const w = p.w || 2.0, hh = p.hh || 2.4, led = p.goods === 'ledgers', O = FPI_C.wood3, n = Math.max(3, Math.round((hh - 0.2) / 0.44)), sh = (hh - 0.25) / n;
      for (const s of [-1, 1]) A.box(O, s * (w / 2 - 0.035), -0.23, -0.05, 0.07, 0.46, hh + 0.05);
      A.box('#241a12', 0, -0.02, 0, w, 0.03, hh); A.box(O, 0, -0.25, hh - 0.04, w + 0.1, 0.52, 0.1); A.box(O, 0, -0.24, -0.05, w, 0.46, 0.15);
      const cols = led ? ['#3a2418', '#2a3226', '#4a1e1a', '#2a2420'] : ['#5a2a24', '#2a3a4a', '#3a4a30', '#5a4a30', '#4a3a5a', '#6a2e22', '#3a2a20'];
      for (let k = 0; k < n; k++) {
        const z = 0.1 + k * sh; A.box(FPI_C.wood2, 0, -0.23, z, w - 0.1, 0.44, 0.035);
        let u = -w / 2 + 0.08;
        while (u < w / 2 - 0.12) {
          const rw = Math.min(w / 2 - 0.08 - u, 0.16 + A.r() * (led ? 0.34 : 0.28)), bh = Math.min(sh - 0.06, led ? sh * (0.82 + A.r() * 0.08) : sh * (0.55 + A.r() * 0.3)), c = cols[Math.floor(A.r() * cols.length)];
          if (rw < 0.05) break;
          if (!led && A.r() < 0.12) { A.box(c, u + 0.06, -0.24, z + 0.035, 0.05, 0.32, bh, 0, 0, -0.35); u += 0.16; continue; }
          A.box(c, u + rw / 2, -0.24 + (A.r() - 0.5) * 0.03, z + 0.035, rw, 0.32, bh);
          if (led) { A.box(ZMV.cream, u + rw / 2, -0.402, z + 0.035 + bh * 0.62, rw - 0.03, 0.005, 0.06); A.box('#8a7040', u + rw / 2, -0.402, z + 0.06, rw - 0.01, 0.005, 0.02); }
          else A.box('#1a1410', u + rw / 2, -0.402, z + 0.035 + bh * 0.8, rw - 0.01, 0.005, 0.015);
          u += rw + (A.r() < 0.15 ? 0.1 : 0.005);
        }
      }
    },
  },
  // the council's long table (w along u, d across), a baize runner and papers on it, chairs along both sides facing
  // in, and the chairman's big chair at the +u end
  vcounciltable: {
    col: FPI_C.wood2,
    sol(p) { const w = p.w || 6, d = p.d || 1.6; return [fpiBox(p, 0, 0, w / 2, d / 2 + 0.5, 0.85, { col: FPI_C.wood2 }), fpiBox(p, w / 2 + 0.5, 0, 0.4, 0.45, 1.6, { col: FPI_C.wood3 })]; },
    b3(p, A) {
      const w = p.w || 6, d = p.d || 1.6, O = FPI_C.wood3;
      A.box(FPI_C.wood2, 0, 0, 0.76, w, d, 0.07); A.box(O, 0, 0, 0.62, w - 0.3, d - 0.3, 0.14);
      const nl = Math.max(2, Math.round(w / 2));
      for (let i = 0; i < nl; i++) for (const s of [-1, 1]) { const u = -w / 2 + 0.25 + i * (w - 0.5) / (nl - 1); A.cyl(O, u, s * (d / 2 - 0.2), -0.05, 0.06, 0.7, 0, 0, 0, 'cyl6'); A.part('sph', O, u, s * (d / 2 - 0.2), 0.3, 0.16, 0.18, 0.16); }
      A.box(ZMV.baize, 0, 0, 0.83, w - 0.6, d * 0.55, 0.012);
      const nc = Math.max(1, Math.floor((w - 0.3) / 0.85));
      for (let i = 0; i < nc; i++) for (const s of [-1, 1]) {
        const u = -w / 2 + 0.15 + (i + 0.5) * (w - 0.3) / nc, v = s * (d / 2 + 0.3);
        A.box(FPI_C.wood2, u, v, 0.44, 0.48, 0.46, 0.05); A.box(ZMV.red, u, v, 0.49, 0.42, 0.4, 0.03);
        for (const k of [-1, 1]) A.box(O, u + k * 0.2, v, -0.05, 0.05, 0.44, 0.49);
        A.box(O, u, v + s * 0.21, 0.49, 0.46, 0.05, 0.55); A.box(FPI_C.wood2, u, v + s * 0.215, 0.95, 0.5, 0.06, 0.07);
        if (A.r() < 0.7) A.box(A.r() < 0.6 ? '#c8c0a8' : '#b0a888', u + (A.r() - 0.5) * 0.2, s * (d / 2 - 0.3), 0.83, 0.3, 0.22, 0.008, (A.r() - 0.5) * 0.5);
      }
      // the chairman's chair: high back with a crest, arms
      const cu = w / 2 + 0.5;
      A.box(O, cu, 0, -0.05, 0.6, 0.7, 0.5); A.box(ZMV.red, cu - 0.02, 0, 0.45, 0.52, 0.6, 0.06);
      A.box(O, cu + 0.27, 0, 0.45, 0.08, 0.72, 1.1); A.box(ZMV.red, cu + 0.22, 0, 0.55, 0.03, 0.56, 0.85);
      A.part('half', O, cu + 0.27, 0, 1.55, 0.72, 0.12, 0.6, 0, -Math.PI / 2, -Math.PI / 2); A.part('sph', ZMV.gilt, cu + 0.27, 0, 1.86, 0.12, 0.12, 0.12);
      for (const s of [-1, 1]) { A.box(O, cu, s * 0.33, 0.5, 0.55, 0.06, 0.3); A.box(O, cu, s * 0.33, 0.78, 0.62, 0.1, 0.05); }
      // an inkstand, a bell and a ledger before the chair
      A.box('#3a2a1c', w / 2 - 0.4, 0, 0.83, 0.3, 0.2, 0.04); A.cyl('#141416', w / 2 - 0.45, 0.04, 0.87, 0.03, 0.05, 0, 0, 0, 'cyl6');
      A.part('cone', ZMV.gilt, w / 2 - 0.35, -0.3, 0.9, 0.09, 0.1, 0.09); A.box('#3a2418', w / 2 - 0.8, 0, 0.83, 0.36, 0.48, 0.05);
    },
  },
  // a cooper's big cask on its side (along u) on a timber cradle, s its size; a tap in its head at +u
  vcask: {
    col: '#5a4430',
    sol(p) { const s = p.s || 1; return [fpiBox(p, 0, 0, 0.82 * s, 0.68 * s, 1.42 * s, { col: '#5a4430' })]; },
    b3(p, A) {
      const s = p.s || 1, R = 0.6 * s, L = 1.6 * s, zc = 0.18 * s + R, B = '#5a4430';
      A.log(B, 0, 0, zc, R * 0.92, L, 0, 0, 'cyl8'); A.log(B, 0, 0, zc, R, L * 0.62, 0, 0, 'cyl8'); A.log('#523e2c', 0, 0, zc, R * 0.97, L * 0.86, 0, 0, 'cyl8');
      for (const f of [-0.46, -0.3, 0.3, 0.46]) A.log(ZMV.iron, f * L, 0, zc, R * (Math.abs(f) > 0.4 ? 0.95 : 1.0) + 0.015, 0.06 * s, 0, 0, 'cyl8');
      for (const k of [-1, 1]) A.part('cyl8', '#6a5238', k * L / 2, 0, zc, R * 1.7, 0.03, R * 1.7, 0, 0, Math.PI / 2);
      A.box(FPI_C.wood2, L / 2 + 0.03, 0, zc - R * 0.55, 0.06, 0.08, 0.12); A.log('#8a6a3a', L / 2 + 0.1, 0, zc - R * 0.5, 0.025, 0.12);
      A.part('sph', '#3a2a1c', 0, 0, zc + R - 0.01, 0.08, 0.04, 0.08);
      for (const u of [-L * 0.3, L * 0.3]) { A.box(FPI_C.wood3, u, 0, -0.05, 0.16, 1.3 * s, 0.2 * s); for (const k of [-1, 1]) A.box(FPI_C.wood3, u, k * R * 0.75, 0.1 * s, 0.14, 0.24 * s, 0.32 * s, 0, k * 0.5, 0); }
    },
  },
  // a cooper's stack of iron hoops, a bundle of staves tied with rope beside it, a few staves leant against it
  vhoops: {
    col: ZMV.iron,
    sol(p) { return [fpiCirc(p, 0, 0, 0.75, 0.9, { col: ZMV.iron })]; },
    b3(p, A) {
      for (let i = 0; i < 6; i++) A.part('torus', i % 2 ? ZMV.iron : '#3a2e28', (A.r() - 0.5) * 0.08, (A.r() - 0.5) * 0.08, 0.02 + i * 0.045, 1.1 - i * 0.03, 1.1 - i * 0.03, 0.5, 0, Math.PI / 2, 0);
      A.part('torus', ZMV.iron, 0.05, -0.5, 0.48, 0.96, 0.96, 0.5, 0.3, 0.2, 0);
      for (let i = 0; i < 6; i++) A.box(i % 2 ? FPI_C.wood2 : '#6a5438', 0.5 + (i % 3) * 0.1, 0.3, 0.02 + Math.floor(i / 3) * 0.06, 0.09, 1.1, 0.05, 0, 0, 0);
      for (const v of [0.0, 0.55]) A.box(FPI_C.rope, 0.6, v, 0.0, 0.34, 0.04, 0.16);
      for (let i = 0; i < 3; i++) A.box(FPI_C.wood2, -0.4 + i * 0.12, 0.42, 0, 0.09, 0.04, 1.05, 0.2 * i, -0.28, 0);
    },
  },
  // a chest tomb, long along v: a plinth, the chest with its corner pilasters and side panels, an overhanging lid,
  // a plaque on the -v end, moss
  vtomb: {
    col: '#6a6a64',
    sol(p) { return [fpiBox(p, 0, 0, (p.w || 1.0) / 2 + 0.08, (p.d || 2.0) / 2 + 0.08, 1.05, { col: '#6a6a64' })]; },
    b3(p, A) {
      const w = p.w || 1.0, d = p.d || 2.0, c = '#6a6a64', c2 = '#5a5c56';
      A.box(c2, 0, 0, -0.15, w + 0.16, d + 0.16, 0.3); A.box(FPI_C.moss, 0, 0, 0.0, w + 0.18, d + 0.18, 0.08);
      A.box(c, 0, 0, 0.15, w, d, 0.72);
      for (const su of [-1, 1]) for (const sv of [-1, 1]) A.box('#727068', su * (w / 2 - 0.04), sv * (d / 2 - 0.04), 0.15, 0.14, 0.14, 0.72);
      for (const su of [-1, 1]) A.box(c2, su * (w / 2 + 0.005), 0, 0.27, 0.02, d - 0.4, 0.46);
      A.box(c2, 0, -(d / 2 + 0.005), 0.27, w - 0.36, 0.02, 0.46); A.box('#4a4c46', 0, -(d / 2 + 0.012), 0.36, w - 0.5, 0.01, 0.28);
      A.box('#727068', 0, 0, 0.87, w + 0.14, d + 0.14, 0.1); A.box(c, 0, 0, 0.97, w + 0.06, d + 0.06, 0.06);
      for (let i = 0; i < 3; i++) A.part('ico', FPI_C.moss, (A.r() - 0.5) * w, (A.r() - 0.5) * d, 1.02, 0.3, 0.05, 0.4, A.r() * 3);
    },
  },
  // a gravestone, its face to -v: kind 0 a slab with a moulded top, 1 round-headed, 2 a cross, 3 round-headed and
  // leaning, sunk in; a grassy mound in front
  vgrave: {
    col: '#6a6a64',
    sol(p) { return [fpiBox(p, 0, 0, 0.36, 0.14, 1.2, { col: '#6a6a64' })]; },
    b3(p, A) {
      const k = (p.kind | 0) % 4, c = fpiHash(p.sd || 0, 7) < 0.5 ? '#6a6a64' : '#5c5e5a', lean = k === 3 ? 0.22 : 0, dark = '#3e403c';
      if (k === 2) {
        A.box(c, 0, 0, -0.1, 0.5, 0.32, 0.28); A.box(c, 0, 0, 0.18, 0.12, 0.12, 1.1); A.box(c, 0, 0, 0.88, 0.5, 0.12, 0.12);
        A.part('torus', c, 0, 0, 0.94, 0.38, 0.38, 1.4);
      } else {
        const h = k === 0 ? 1.0 : 0.95, wd = k === 0 ? 0.66 : 0.62, z0 = k === 3 ? -0.25 : -0.1;
        A.box(c, 0, 0, z0, wd, 0.14, h - (k ? wd / 2 : 0) - z0, 0, lean);
        if (k) A.part('cyl8', c, 0, -Math.sin(lean) * (h - wd / 2), (h - wd / 2) * Math.cos(lean), wd, 0.14, wd, 0, Math.PI / 2 + lean, 0);
        else { A.box('#727068', 0, 0, h, wd + 0.06, 0.18, 0.06); A.part('tri', '#727068', 0, 0, h + 0.06 + 0.04, (wd + 0.04) / 0.866, 0.16, 0.16, 0, -Math.PI / 2, 0); }
        for (let i = 0; i < 3; i++) A.box(dark, 0, -0.075 - Math.sin(lean) * (0.7 - i * 0.12), (0.72 - i * 0.12) * Math.cos(lean), wd * (i ? 0.5 : 0.7), 0.01, 0.03, 0, lean);
        A.box(FPI_C.moss, 0, 0, -0.02, wd + 0.04, 0.16, 0.14, 0, lean * 0.4);
      }
      A.part('sph', FPI_C.turf, 0, -0.95, -0.02, 0.8, 0.2, 1.6);
    },
  },
  // a pew, w along u: the seat, a panelled back on its +v side, shaped ends; the sitter faces -v, and a book ledge
  // on the back's far side serves the pew behind
  vpew: {
    col: FPI_C.wood2,
    sol(p) { return [fpiBox(p, 0, 0.04, (p.w || 3.6) / 2, 0.32, 1.0, { col: FPI_C.wood2 })]; },
    b3(p, A) {
      const w = p.w || 3.6, O = FPI_C.wood3;
      A.box(FPI_C.wood2, 0, 0, 0.42, w, 0.44, 0.05); A.box(O, 0, -0.2, 0.3, w, 0.04, 0.12);
      A.box(FPI_C.wood2, 0, 0.24, 0.47, w, 0.05, 0.52, 0, -0.08, 0); A.box(O, 0, 0.27, 0.95, w + 0.02, 0.08, 0.05);
      const np = Math.max(2, Math.round(w / 0.9));
      for (let i = 1; i < np; i++) A.box(O, -w / 2 + i * w / np, 0.21, 0.5, 0.04, 0.02, 0.44, 0, -0.08, 0);
      A.box(O, 0, 0.42, 0.78, w, 0.2, 0.03); A.box(O, 0, 0.51, 0.68, w, 0.02, 0.12);
      for (const s of [-1, 1]) {
        const u = s * (w / 2 + 0.03);
        A.box(O, u, 0.08, -0.05, 0.06, 0.68, 0.92); A.part('cyl8', O, u, 0.12, 0.87, 0.06, 0.36, 0.36, 0, 0, Math.PI / 2);
        A.part('sph', O, u + s * 0.01, 0.12, 1.05, 0.08, 0.08, 0.08);
      }
    },
  },
  // a wooden stair tread (as step: a floor you walk up onto, top at hh, w along u and d along v): its tread board,
  // the nosing and the riser to -v, down the flight (so a flight climbing to +y is laid with a = 0)
  vstair: {
    noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh, { fl: true, col: FPI_C.wood2 })]; },
    b3(p, A) {
      const w = p.w, d = p.d, hh = p.hh, r = Math.min(hh + 0.2, 0.32);
      A.box(ZMV.oak2, 0, 0.01, -0.2, w * 0.995, d - 0.02, hh + 0.15);
      A.box(p.col || FPI_C.wood2, 0, -0.02, hh - 0.05, w, d + 0.04, 0.05);
      A.log(FPI_C.wood2, 0, -d / 2 - 0.02, hh - 0.04, 0.03, w, 0, 0, 'cyl6');
      A.box(FPI_C.wood, 0, -d / 2 + 0.01, hh - 0.05 - r, w * 0.99, 0.03, r);
    },
  },
  // a banister up the open side of a straight flight: rising rise over len along +v from base, a newel post at each
  // end, a closed string, balusters, the handrail 0.9 over the treads. Put it on the line of the flight's open edge,
  // at the foot of the flight (local v 0 is the foot of the first tread)
  vbanister: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const len = p.len || 4, rise = p.rise != null ? p.rise : 2.2, b = p.base || 0, sl = Math.atan2(rise, len), L = Math.hypot(len, rise), O = FPI_C.wood3;
      const zAt = v => b + rise * v / len;
      zmvBarV(A, O, 0, 0, zAt(0) - 0.1, len, zAt(len) - 0.1, 0.06, 0.3);
      zmvBarV(A, FPI_C.wood2, 0, 0, zAt(0) + 0.95, len, zAt(len) + 0.95, 0.09, 0.07);
      const n = Math.max(2, Math.round(L / 0.3));
      for (let i = 1; i < n; i++) { const v = i * len / n; A.box(O, 0, v, zAt(v) + 0.05, 0.035, 0.035, 0.87); }
      for (const v of [0.05, len - 0.05]) { const z = zAt(Math.min(Math.max(v, 0), len)); A.box(O, 0, v, z - 0.2, 0.12, 0.12, 1.32); A.part('sph', FPI_C.wood2, 0, v, z + 1.17, 0.14, 0.14, 0.14); }
    },
  },
});
