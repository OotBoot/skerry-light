// The San Telmo: the third place to hold the night in Keeper's Last Light (src/zombies.js). The capitana of the
// Spanish squadron blown north in the Armada years (src/lore.js: the squadron that wintered on the headland and built
// the sea fort), lost on the Skerries in a winter gale with the squadron's pay chest aboard and every soul in her. The
// sea has given her back: a galleon far bigger than any ship has a right to be, stranded upright on a shingle bank in
// a cove, black with weed, her stern castle towering over the shingle and her masts still standing, the sails in rags
// and the rigging slack. Her drowned crew come up out of the sea to take her back.
// The map (its rooms are ZM_MAPS.galleon.zones, in src/zombies.js, so the pick kept on the device knows it at load):
// you come ashore on the Strand under her starboard side, and in through the Breach, a stove-in hole in her planking,
// to the Main Hold. Down there on the Orlop the Bread Room, the Powder Room and the Strong Room aft (the pay chest
// behind its grille), the Cable Tier forward. A companion stair up to the Gun Deck, its great bronze guns run out at
// the ports, the Gunroom and the Chaplain's Berth aft of it, the Surgeon's Cockpit forward. A wide stair up through
// the main hatch into the Waist, open to the sky between the masts; aft of it, under the Quarterdeck, the Steerage
// and the Great Cabin with its stern galleries, forward the Forecastle and its galley. And up top the Quarterdeck,
// under the three great stern lanterns, and the Forecastle Deck with the ship's bell. The drowned wade up out of the
// sea onto the shingle, climb her sides to the gunports and the gaps in her bulwarks, and come round her stern from
// the water to the gallery windows.
// How it's built: as Wrackhaven (FPI_GEN.wrack), with the same kit (zmKit) and its rooms on decks one over another
// (zr), and a wall of its own (gw, below) that runs at any angle, so her bow and her stern can draw in. The props are
// the same boxes and cylinders as everywhere (src/fpsisle.js), most with no solid at all: the hull and its planking,
// the decks and their beams, the guns, the masts, yards, sails and rigging, the stern castle and the bow, and the
// furniture of each room. Coordinates are from the island's middle, as ZM_MAPS.galleon.zones: x along her from the
// stern (-x) to the bow (+x), y across her, her starboard (the sea's side) to -y.
// Facing, as src/zmvillage.js: a prop's front is local -v, so with angle a it faces (sin a, -cos a); local u runs
// along it. Heights are from the floor it stands on (lift: that floor's height).

const ZGL = { F: [0, 4.4, 8.8, 13.2], RS: 4.4 / 16, TD: 0.6, WALES: [1.7, 3.3, 4.25, 6.7, 8.65, 11.3, 13.05], NAV: [-52, 52, -30, 26] };
const ZG = {
  oak: ['#4e3d2c', '#463728', '#56432f', '#3f3124'], tar: '#1c1712', wale: '#2a211a', oak2: '#5a4632', oak3: '#30251b',
  ceil: ['#72583b', '#664f35', '#7c6342', '#5e4831'], rib: '#4e3b29', plank: ['#644b33', '#6e5338', '#5a432e'],
  deck: ['#806a4a', '#745f43', '#8a7352', '#6c583e'], under: '#4e3e2c', beam: '#3e3022',
  weed: '#2c3a20', weed2: '#3e4c28', barn: '#a8a496', bronze: '#94743a', verd: '#5a8070', red: '#6a2e24', red2: '#4e221a',
  gilt: '#b08a40', cream: '#c4b894', sail: ['#9a9078', '#8a806a', '#a49a80', '#7e7460'], iron: '#26282c', mast: '#5e4a34', glow: '#ffcf80',
};
// her half-breadth at x (the line of her hull's walls), on the lower decks and on the upper (null: not there)
const ZG_OUT = { lo: [[-44, 8.5], [-30, 11], [22, 11], [34, 8], [40, 4]], up: [[-44, 11], [22, 11], [36, 8.5], [42, 4]], q: [[-46.01, 11], [-14, 11]] };
function zgHB(pts, x) {
  if (x < pts[0][0] - 1e-6 || x > pts[pts.length - 1][0] + 1e-6) return -1;
  for (let i = 0; i < pts.length - 1; i++) { const [a, ha] = pts[i], [b, hb] = pts[i + 1]; if (x <= b + 1e-6) return ha + (hb - ha) * clamp((x - a) / (b - a), 0, 1); }
  return pts[pts.length - 1][1];
}
// a bar from one point to another (u, v, z), t tall and t2 deep about its line (a rope, a spar, a rail, a strake)
function zgLine(A, c, u0, v0, z0, u1, v1, z1, t, t2) { const du = u1 - u0, dv = v1 - v0, dz = z1 - z0, h = Math.hypot(du, dv); A.part('box', c, (u0 + u1) / 2, (v0 + v1) / 2, (z0 + z1) / 2, Math.hypot(h, dz) + 0.01, t, t2 || t, Math.atan2(dv, du), 0, Math.atan2(dz, h)); }
// a rope hanging slack between two points, in n lengths, sagging down by sag in the middle
function zgSag(A, c, u0, v0, z0, u1, v1, z1, sag, n, t) {
  let pu = u0, pv = v0, pz = z0;
  for (let i = 1; i <= n; i++) { const k = i / n, u = u0 + (u1 - u0) * k, v = v0 + (v1 - v0) * k, z = z0 + (z1 - z0) * k - sag * 4 * k * (1 - k); zgLine(A, c, pu, pv, pz, u, v, z, t || 0.04); pu = u; pv = v; pz = z; }
}
const zgPick = (A, a) => a[Math.floor(A.r() * a.length) % a.length];

// ---------- her timbers: the hull, the bulkheads, the decks, the stairs ----------
// The faces of a wall (gw, below, sets which): 'hull' her side from outside (tarred strakes, the black wales, weed and
// barnacles low down, the bilge curving under at the shingle), 'ceil' her side from inside (the ceiling planks on the
// frames, curving in towards the deck beams, a hanging knee under every other beam), 'plank' a bulkhead of upright
// boards, 'pan' the Great Cabin's panelling (red, gilt), 'raili' and 'railo' a bulwark's two faces (with its
// timberheads), 'none'. f: [the face at -v, the face at +v]
function zgFace(A, st, s, p) {
  const L = p.len, T = p.th, H = p.hh, z0 = p.lift || 0, v = s * (T / 2 + 0.012);
  if (st === 'hull' || st === 'railo') {
    const n = Math.max(1, Math.round(H / 0.31)), h = H / n;
    for (let i = 0; i < n; i++) A.box(zgPick(A, ZG.oak), 0, v + s * 0.006 * (i % 2), i * h + 0.012, L, 0.03, h - 0.024);
    for (const zw of ZGL.WALES) if (zw > z0 + 0.2 && zw < z0 + H - 0.1) A.box(ZG.wale, 0, s * (T / 2 + 0.09), zw - z0 - 0.16, L + 0.02, 0.18, 0.3);
    // weed and barnacles, thick low down where she lay longest under the sea; strands of weed off the wales
    const low = Math.max(0, 7.5 - z0), m = Math.round(L * Math.min(H, low) * 0.55);
    for (let i = 0; i < m; i++) { const u = (A.r() - 0.5) * L * 0.98, z = Math.pow(A.r(), 1.6) * Math.min(H, low); A.part('ico', A.r() < 0.6 ? ZG.barn : '#7a786c', u, s * (T / 2 + 0.03), z, 0.1 + A.r() * 0.12, 0.08 + A.r() * 0.1, 0.06); }
    for (const zw of ZGL.WALES) if (zw > z0 + 0.2 && zw < z0 + H - 0.1 && zw < 9.5) for (let i = 0, k = Math.round(L * 0.7); i < k; i++) { const u = (A.r() - 0.5) * L * 0.96, len = 0.3 + A.r() * (zw < 5 ? 1.3 : 0.6); A.box(A.r() < 0.5 ? ZG.weed : ZG.weed2, u, s * (T / 2 + 0.16), zw - z0 - 0.15 - len, 0.05 + A.r() * 0.08, 0.02, len); }
    if (z0 < 0.1 && st === 'hull') {
      // (the turn of her bilge, going down under the shingle)
      for (const [o, za, zb] of [[0.42, -0.2, 0.35], [0.28, 0.35, 0.8], [0.14, 0.8, 1.25]]) A.box(zgPick(A, ZG.oak), 0, s * (T / 2 + o / 2), za, L + 0.02, o, zb - za);
      A.box(ZG.weed, 0, s * (T / 2 + 0.44), -0.05, L, 0.06, 0.14);
    }
    return;
  }
  if (st === 'ceil' || st === 'raili') {
    const n = Math.max(1, Math.round(H / 0.36)), h = H / n;
    for (let i = 0; i < n; i++) A.box(zgPick(A, ZG.ceil), 0, v, i * h + 0.01, L, 0.025, h - 0.02);
    if (st === 'raili') { for (let u = -L / 2 + 0.5; u < L / 2 - 0.2; u += 1.6) A.box(ZG.rib, u, s * (T / 2 + 0.08), -0.05, 0.2, 0.16, H + 0.28); return; }
    // the frames, curving in towards the beam above, and a hanging knee under every other beam
    let k = 0;
    for (let u = -L / 2 + 0.55; u < L / 2 - 0.2; u += 1.25, k++) {
      A.box(ZG.rib, u, s * (T / 2 + 0.13), -0.05, 0.24, 0.26, H * 0.34); A.box(ZG.rib, u, s * (T / 2 + 0.1), H * 0.34 - 0.05, 0.23, 0.2, H * 0.33); A.box(ZG.rib, u, s * (T / 2 + 0.07), H * 0.67 - 0.1, 0.22, 0.14, H * 0.33 - 0.2);
      if (k % 2 === 0 && H > 3) zmvBarV(A, ZG.beam, u, s * (T / 2 + 0.05), H - 1.25, s * (T / 2 + 0.85), H - 0.58, 0.2, 0.22);
    }
    if (H > 3) { A.box(ZG.beam, 0, s * (T / 2 + 0.12), H - 0.75, L, 0.22, 0.32); A.box(ZG.beam, 0, s * (T / 2 + 0.1), 0.05, L, 0.2, 0.22); }
    if (z0 < 0.1) A.box('#2a2a20', 0, s * (T / 2 + 0.02), 0, L, 0.03, 0.45);   // (damp, low down in the hold)
    return;
  }
  if (st === 'plank') {
    const n = Math.max(1, Math.round(L / 0.3)), w = L / n;
    for (let i = 0; i < n; i++) A.box(zgPick(A, ZG.plank), -L / 2 + (i + 0.5) * w, v, 0, w - 0.025, 0.025, H);
    for (const z of [0, 1.05, H - 0.42]) A.box(ZG.beam, 0, s * (T / 2 + 0.05), z, L, 0.08, z ? 0.12 : 0.22);
    return;
  }
  if (st === 'pan') {
    // red panels in gilt between pilasters, a dark dado under, a frieze over
    A.box(ZG.red2, 0, v, 0, L, 0.025, H); A.box('#3a2a1e', 0, s * (T / 2 + 0.04), 0, L, 0.05, 0.95); A.box(ZG.gilt, 0, s * (T / 2 + 0.07), 0.92, L, 0.04, 0.06);
    const n = Math.max(1, Math.round(L / 1.2)), w = L / n;
    for (let i = 0; i < n; i++) {
      const u = -L / 2 + (i + 0.5) * w;
      A.box(ZG.red, u, s * (T / 2 + 0.03), 1.2, w - 0.42, 0.03, H - 2.0); A.box(ZG.gilt, u, s * (T / 2 + 0.045), 1.15, w - 0.36, 0.02, 0.05); A.box(ZG.gilt, u, s * (T / 2 + 0.045), H - 0.82, w - 0.36, 0.02, 0.05);
      A.box('#3e2a1c', -L / 2 + i * w, s * (T / 2 + 0.06), 0.95, 0.2, 0.08, H - 1.3); A.box(ZG.gilt, -L / 2 + i * w, s * (T / 2 + 0.1), H - 0.5, 0.26, 0.04, 0.12);
    }
    A.box('#3a2a1e', 0, s * (T / 2 + 0.06), H - 0.62, L, 0.1, 0.35); A.box(ZG.gilt, 0, s * (T / 2 + 0.12), H - 0.5, L, 0.03, 0.04);
  }
}
Object.assign(FPI_K, {
  // a length of wall, her side or a bulkhead (solids as the islands' walls; see zgFace for its faces). A bulwark's
  // (f 'raili' / 'railo') cap rail runs along its top
  gwall: {
    noShadow: true, col: ZG.oak[0], gen: FPI_K.wall.gen, sol: FPI_K.wall.sol,
    b3(p, A) {
      const f = p.f || ['plank', 'plank'];
      A.box(ZG.oak3, 0, 0, -0.05, p.len, p.th * 0.94, p.hh + 0.04);
      zgFace(A, f[0], -1, p); zgFace(A, f[1], 1, p);
      if (f[0] === 'raili' || f[0] === 'railo') A.box(ZG.oak2, 0, 0, p.hh - 0.02, p.len + 0.04, p.th + 0.24, 0.14);
    },
  },
  // a deck: its planks fore and aft, cut to her hull (hb: which line, ZG_OUT), on beams across her every 1.25 (cx,
  // cy: where it lies in her, to cut it; top: its upper face)
  gdeck: {
    noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.top, { z0: p.top - 0.3, fl: true, col: '#5a4634' })]; },
    b3(p, A) {
      const HB = ZG_OUT[p.hb || 'up'], T = p.top, x0 = p.cx - p.w / 2, x1 = p.cx + p.w / 2;
      const span = y => { let a = null, b = null; for (let x = x0; x <= x1 + 1e-6; x += 0.2) if (zgHB(HB, x) >= Math.abs(y) - 0.1) { if (a === null) a = x; b = x; } return a === null ? null : [a, Math.min(x1, b)]; };
      const n = Math.max(1, Math.round(p.d / 0.32)), sw = p.d / n;
      for (let i = 0; i < n; i++) {
        const v = -p.d / 2 + (i + 0.5) * sw, s = span(p.cy + v); if (!s || s[1] - s[0] < 0.1) continue;
        A.box(ZG.under, (s[0] + s[1]) / 2 - p.cx, v, T - 0.3, s[1] - s[0], sw * 1.002, 0.22);
        const cuts = [s[0]]; for (let x = s[0] + 0.8 + (i * 1.7) % 4.2; x < s[1] - 0.6; x += 4.2) cuts.push(x); cuts.push(s[1]);
        for (let k = 0; k < cuts.length - 1; k++) A.box(zgPick(A, ZG.deck), (cuts[k] + cuts[k + 1]) / 2 - p.cx, v, T - 0.09, cuts[k + 1] - cuts[k] - 0.03, sw - 0.035, 0.09);
      }
      for (let x = Math.ceil(x0 / 1.25) * 1.25; x <= x1 - 0.1; x += 1.25) {
        const h = zgHB(HB, x); if (h <= 0) continue;
        const ya = Math.max(p.cy - p.d / 2, -h + 0.25), yb = Math.min(p.cy + p.d / 2, h - 0.25); if (yb - ya < 0.3) continue;
        A.box(ZG.beam, x - p.cx, (ya + yb) / 2 - p.cy, T - 0.64, 0.3, yb - ya, 0.36);
      }
    },
  },
  // a tread of a companion stair (the solid a column down to the deck it stands on), and the stair's stringers and
  // its man-ropes on their stanchions, up one side (len along +u, rise; w across)
  gstep: {
    noShadow: true,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, p.hh, { fl: true, col: FPI_C.wood2 })]; },
    b3(p, A) { A.box(zgPick(A, ZG.deck), 0, 0, p.hh - 0.08, p.w - 0.3, p.d + 0.05, 0.08); A.box(ZG.oak3, 0, p.d * 0.3, p.hh - 0.3, p.w - 0.35, 0.06, 0.22); },
  },
  gstairs: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const L = p.len, R = p.rise, w = p.w;
      for (const s of [-1, 1]) {
        zgLine(A, ZG.oak3, -0.2, s * (w / 2 - 0.09), 0.1, L, s * (w / 2 - 0.09), R - 0.12, 0.42, 0.14);
        for (let k = 0; k <= 4; k++) { const u = 0.3 + k * (L - 0.6) / 4, z = R * u / L; A.box(ZG.iron, u, s * (w / 2 - 0.05), z, 0.05, 0.05, 1.0); }
        zgSag(A, FPI_C.rope, 0.3, s * (w / 2 - 0.05), 1.0, L - 0.3, s * (w / 2 - 0.05), R + 0.95, 0.12, 6, 0.045);
      }
    },
  },
  // the frames round an opening in her side or a bulkhead (kind: 'port' a gunport, its lid hinged up outside;
  // 'rail' a gap in a bulwark between two timberheads; 'glass' a glazed window, carved outside; 'gal' a stern
  // gallery's window; 'door'; 'breach' the stove-in hole she was holed by). ob: which side (along v) is outboard
  gframe: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const w = p.w, T = p.th, o = p.ob || -1, vo = o * (T / 2 + 0.06), vi = -o * (T / 2 + 0.05);
      if (p.kind === 'port') {
        for (const v of [vo, vi]) { A.box(ZG.oak3, 0, v, 0.88, w + 0.36, 0.12, 0.14); A.box(ZG.oak3, 0, v, 2.33, w + 0.36, 0.12, 0.14); for (const s of [-1, 1]) A.box(ZG.oak3, s * (w / 2 + 0.1), v, 0.9, 0.16, 0.12, 1.55); }
        // the lid, red inside, swung up and out on its hinges, its lanyard up to the rail
        const hz = 2.48, L = 1.4, a = 0.95, tv = o * (T / 2 + 0.12);
        zmvBarV(A, ZG.red, 0, tv, hz, tv + o * L * Math.sin(a), hz + L * Math.cos(a), w + 0.12, 0.1);
        for (const s of [-0.3, 0.3]) A.box(ZG.iron, s * w, tv + o * 0.15, hz - 0.05, 0.05, 0.3, 0.05);
        zgLine(A, FPI_C.rope, 0, tv + o * L * Math.sin(a), hz + L * Math.cos(a), 0, o * (T / 2 + 0.1), Math.min(p.hh, 3.9), 0.03);
        return;
      }
      if (p.kind === 'rail') {
        for (const s of [-1, 1]) { const u = s * (w / 2 + 0.12); A.box(ZG.rib, u, 0, -0.05, 0.24, T + 0.06, 2.5); A.part('sph', ZG.oak2, u, 0, 2.55, 0.3, 0.2, 0.3); A.box(ZG.oak2, u, 0, 1.25, 0.3, T + 0.16, 0.12); }
        A.cyl(ZG.iron, 0, 0, 2.3, 0.04, 0.1, 0, 0, Math.PI / 2);
        return;
      }
      if (p.kind === 'glass' || p.kind === 'gal') {
        // pilasters either side, a sill on brackets, a cornice, a cartouche over it (outside); a plain frame inside
        const z0 = 0.95, z1 = 2.4;
        for (const s of [-1, 1]) { A.box(ZG.gilt, s * (w / 2 + 0.12), vo, z0 - 0.1, 0.16, 0.1, z1 - z0 + 0.25); A.box(ZG.oak3, s * (w / 2 + 0.06), vi, z0, 0.12, 0.1, z1 - z0); A.part('sph', ZG.gilt, s * (w / 2 + 0.12), vo, z1 + 0.25, 0.22, 0.22, 0.14); }
        A.box(ZG.gilt, 0, vo, z1 + 0.02, w + 0.5, 0.14, 0.14); A.box(ZG.oak3, 0, vo + o * 0.04, z0 - 0.16, w + 0.4, 0.16, 0.14);
        for (const s of [-1, 1]) zmvBarV(A, ZG.gilt, s * w * 0.3, o * (T / 2), z0 - 0.6, vo + o * 0.06, z0 - 0.16, 0.1, 0.1);
        if (p.kind === 'gal') { A.part('half', ZG.red, 0, vo, z1 + 0.18, w * 0.7, 0.1, 0.5, 0, Math.PI / 2, 0); A.part('sph', ZG.gilt, 0, vo + o * 0.02, z1 + 0.42, 0.2, 0.2, 0.1); }
        else A.part('sph', ZG.gilt, 0, vo, z1 + 0.22, 0.32, 0.22, 0.1);
        A.box(ZG.oak3, 0, vi, z1 - 0.02, w + 0.2, 0.1, 0.1); A.box(ZG.oak3, 0, vi, z0 - 0.08, w + 0.2, 0.12, 0.1);
        return;
      }
      if (p.kind === 'door') {
        for (const v of [vo, vi]) { for (const s of [-1, 1]) A.box(ZG.oak3, s * (w / 2 + 0.08), v, -0.05, 0.16, 0.1, 2.6); A.box(ZG.oak3, 0, v, 2.48, w + 0.36, 0.12, 0.2); }
        if (p.carved) for (const v of [vo, vi]) { A.box(ZG.gilt, 0, v + Math.sign(v) * 0.04, 2.7, w * 0.7, 0.05, 0.08); A.part('sph', ZG.gilt, 0, v + Math.sign(v) * 0.04, 2.9, 0.4, 0.28, 0.08); }
        return;
      }
      if (p.kind === 'breach') {
        // splintered planks bent in round the hole, broken frames, weed on the edges
        for (let i = 0; i < 26; i++) {
          const a = A.r() * Math.PI * 2, rr = 1.2 + A.r() * 0.6, u = Math.cos(a) * (w / 2 + 0.1) * (0.9 + A.r() * 0.3), z = 1.3 + Math.sin(a) * rr * 1.05;
          if (z < 0.05 || z > p.hh - 0.2) continue;
          const len = 0.5 + A.r() * 0.9, b = A.r() < 0.7 ? 1 : -1;
          zgLine(A, zgPick(A, ZG.oak), u, o * (T / 2), z, u - Math.cos(a) * len * 0.5, o * (T / 2) - o * len * (0.4 + A.r() * 0.6) * b, z - Math.sin(a) * len * 0.4, 0.22, 0.05);
        }
        for (const s of [-1, 1]) { zgLine(A, ZG.rib, s * (w / 2 + 0.2), -o * 0.3, 0, s * (w / 2 - 0.1), -o * 0.9, 1.5, 0.24, 0.22); zgLine(A, ZG.rib, s * (w / 2 + 0.25), -o * 0.25, 2.9, s * (w / 2 - 0.2), -o * 0.7, 2.2, 0.22, 0.2); }
        for (let i = 0; i < 10; i++) { const u = (A.r() - 0.5) * (w + 1.4), z = 2.6 + A.r() * 0.5; A.box(A.r() < 0.5 ? ZG.weed : ZG.weed2, u, o * (T / 2 + 0.08), z - 0.6, 0.08, 0.02, 0.6); }
      }
    },
  },
  // a gunport with a gun run out through it (no opening: the wall goes on behind): outside its frame, the dark
  // port, the lid up and the muzzle out; inside the frame and the dark port the gun's barrel runs into
  gport: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const T = p.th, o = p.ob || -1, w = 1.25, z0 = 0.95, h = 1.05;
      for (const s of [-1, 1]) {
        const v = s * (T / 2 + 0.03);
        A.box('#0a0907', 0, v, z0, w, 0.03, h);
        A.box(ZG.oak3, 0, v + s * 0.04, z0 - 0.12, w + 0.3, 0.08, 0.12); A.box(ZG.oak3, 0, v + s * 0.04, z0 + h, w + 0.3, 0.08, 0.12);
        for (const k of [-1, 1]) A.box(ZG.oak3, k * (w / 2 + 0.08), v + s * 0.04, z0, 0.14, 0.08, h);
      }
      const tv = o * (T / 2 + 0.1), a = 0.85, L = 1.15;
      zmvBarV(A, ZG.red, 0, tv, z0 + h + 0.12, tv + o * L * Math.sin(a), z0 + h + 0.12 + L * Math.cos(a), w + 0.1, 0.09);
      zgLine(A, FPI_C.rope, 0, tv + o * L * Math.sin(a), z0 + h + 0.12 + L * Math.cos(a), 0, o * (T / 2 + 0.1), Math.min(p.hh || 3.9, 3.9), 0.03);
      A.log(ZG.bronze, 0, o * (T / 2 + 0.3), z0 + h * 0.48, 0.17, 0.62, Math.PI / 2); A.log(ZG.bronze, 0, o * (T / 2 + 0.6), z0 + h * 0.48, 0.21, 0.1, Math.PI / 2);
      A.part('cyl8', '#0a0907', 0, o * (T / 2 + 0.66), z0 + h * 0.48, 0.2, 0.02, 0.2, 0, Math.PI / 2, 0, 'decal');
      A.part('sph', ZG.verd, 0.06, o * (T / 2 + 0.4), z0 + h * 0.48 + 0.12, 0.16, 0.06, 0.24);
    },
  },
  // a great bronze gun on its four-wheeled carriage, run out (its front, -v, to the port), the tackle to her side,
  // shot by it, a rammer (raise: up on a platform, over a rail)
  ggun: {
    col: ZG.red2,
    sol(p) { return [fpiBox(p, 0, 0.3, 0.62, 1.2, (p.raise || 0) + 1.1)]; },
    b3(p, A) {
      const b = p.raise || 0, hc = b + 0.95, F = Math.PI / 2;
      if (b) A.box(ZG.oak3, 0, 0.3, -0.05, 1.8, 2.8, b + 0.05);
      for (const s of [-1, 1]) {
        A.box(ZG.red2, s * 0.4, 0.35, b + 0.18, 0.13, 1.9, 0.42); A.box(ZG.red2, s * 0.4, 0.75, b + 0.6, 0.13, 1.0, 0.22); A.box(ZG.red2, s * 0.4, -0.25, b + 0.6, 0.13, 0.75, 0.3);
        for (const v of [-0.45, 1.05]) A.log('#3a2a1c', s * 0.42, v, b + 0.2, 0.2, 0.12);
        zgLine(A, FPI_C.rope, s * 0.48, 0.9, b + 0.55, s * 1.1, -1.25, b + 1.0, 0.04); zgLine(A, FPI_C.rope, s * 0.48, 0.95, b + 0.5, s * 0.75, -1.3, b + 0.8, 0.035);
        A.part('torus', ZG.iron, s * 1.1, -1.28, b + 1.0, 0.16, 0.16, 0.16, 0, F, 0);
      }
      for (const v of [-0.45, 1.05]) A.log(ZG.oak3, 0, v, b + 0.2, 0.06, 1.0);
      A.box(ZG.oak3, 0, 0.35, b + 0.42, 0.7, 1.6, 0.1);
      // the barrel: tapering to the muzzle, its rings, the dolphins (handles) on top, the knob at the breech
      A.part('cannon', ZG.bronze, 0, -0.35, hc, 0.66, 2.9, 0.66, 0, F, 0);
      for (const [v, r] of [[1.0, 0.36], [0.55, 0.34], [-0.2, 0.3], [-1.55, 0.25], [-1.75, 0.27]]) A.part('cyl8', ZG.bronze, 0, v, hc, r * 2, 0.08, r * 2, 0, F, 0);
      A.part('sph', ZG.bronze, 0, 1.15, hc, 0.6, 0.6, 0.5); A.part('sph', ZG.bronze, 0, 1.45, hc, 0.18, 0.18, 0.18);
      for (const s of [-1, 1]) A.part('torus', ZG.bronze, s * 0.1, 0.35, hc + 0.3, 0.22, 0.22, 0.4, 0, 0, F);
      A.part('sph', ZG.verd, 0.12, -0.6, hc + 0.18, 0.3, 0.06, 0.5); A.part('sph', ZG.verd, -0.1, 0.4, hc + 0.22, 0.24, 0.05, 0.3);
      A.log(ZG.iron, 0, 0.35, b + 0.78, 0.04, 0.9);
      if (!p.bare) { for (let i = 0; i < 5; i++) A.part('sph', '#1a1a1c', 0.85 + (i % 3) * 0.22 - 0.2, 1.4 + (i > 2 ? 0.2 : 0), b + 0.11 + (i > 2 ? 0.17 : 0), 0.22, 0.22, 0.22); zgLine(A, ZG.oak2, -0.85, 1.3, b, -0.95, 0.2, b + 2.2, 0.05); A.part('cyl8', '#3a3020', -0.95, 0.18, b + 2.25, 0.16, 0.25, 0.16, 0, 0.45, 0); }
    },
  },
  // a mast: up from her keel through the decks, banded and wedged at each, the top and crosstrees, the cap, the
  // topmast; its yards across her, the sails hanging off them in rags; the shrouds and their ratlines from the
  // channels on her sides, the backstays, slack lines off the yardarms (lateen: the mizzen's long yard instead)
  gmast: {
    col: ZG.mast,
    sol(p) { return [fpiCirc(p, 0, 0, p.r + 0.08, p.h2)]; },
    b3(p, A) {
      const r = p.r, h = p.h, h2 = p.h2, F = Math.PI / 2;
      A.cyl(ZG.mast, 0, 0, -0.1, r, h + 0.1, 0, 0, 0, 'cyl8'); A.cyl(ZG.mast, 0, 0, h - 4, r * 1.06, 3.2, 0, 0, 0, 'cyl8');
      for (let z = 1.2; z < h - 4; z += 1.4) A.cyl('#2e241a', 0, 0, z, r * 1.05, 0.1, 0, 0, 0, 'cyl8');
      for (const d of p.decks || []) { A.box(ZG.oak3, 0, 0, d - 0.12, r * 2.9, r * 2.9, 0.32); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; A.box(ZG.oak2, Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, d + 0.18, 0.14, 0.14, 0.3, a); } }
      A.box(ZG.oak3, 0, 0, -0.1, r * 3.4, r * 3.4, 0.6);
      for (let i = 0; i < 14; i++) { const a = A.r() * 6.28, z = A.r() * 3.2; A.part('ico', A.r() < 0.5 ? ZG.barn : ZG.weed, Math.cos(a) * r, Math.sin(a) * r, z, 0.16, 0.12, 0.16); }
      // the top: its platform and rim, the crosstrees under it, the cap and the topmast
      const tz = h - 1.1;
      A.box(ZG.oak3, 0, 0, tz - 0.45, 0.3, r * 7, 0.3); A.box(ZG.oak3, 0, 0, tz - 0.45, r * 6, 0.3, 0.3);
      A.cyl(ZG.oak2, 0, 0, tz - 0.15, r * 3.4, 0.25, 0, 0, 0, 'cyl8'); A.part('torus', ZG.oak3, 0, 0, tz + 0.55, r * 6.8, r * 6.8, r * 6, 0, F, 0);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; A.box(ZG.oak3, Math.cos(a) * r * 3.3, Math.sin(a) * r * 3.3, tz + 0.1, 0.07, 0.07, 0.5); }
      A.box(ZG.oak3, r * 0.8, 0, h, r * 3.6, r * 2, 0.4);
      A.cyl(ZG.mast, r * 1.5, 0, h - 2.6, r * 0.62, h2 - h + 2.6, 0, 0, 0, 'cyl8'); A.part('sph', ZG.oak2, r * 1.5, 0, h2 + 0.1, r * 0.9, r * 0.5, r * 0.9);
      A.box(ZG.oak3, r * 1.5, 0, h2 - 3.2, 0.2, r * 4, 0.2);
      // the yards, the sails off them
      for (const [z, len, sail, bot] of p.yards || []) {
        const uy = (z > h ? r * 1.5 : 0) + r + 0.3;
        A.log(ZG.mast, uy, 0, z, 0.26 * len / 30 + 0.12, len * 0.5, F); for (const s of [-1, 1]) A.log(ZG.mast, uy, s * len * 0.37, z, 0.16 * len / 30 + 0.08, len * 0.27, F);
        for (const s of [-1, 1]) { zgLine(A, FPI_C.rope, uy, s * len * 0.48, z, uy - 0.3, 0, z > h ? h2 - 0.6 : h - 0.3, 0.04); zgSag(A, FPI_C.rope, uy + 0.25, s * 0.6, z - 0.2, uy + 0.25, s * len * 0.47, z - 0.25, 0.6, 5, 0.03); }
        if (sail) zgSail(A, uy + 0.25, z, len, bot, sail);
      }
      if (p.lateen) {
        const [ua, za, ub, zb] = p.lateen; zgLine(A, ZG.mast, ua, 0.2, za, ub, 0.2, zb, 0.3);
        for (let i = 0; i < 9; i++) { const k = 0.1 + i * 0.09, u = ua + (ub - ua) * k, z = za + (zb - za) * k, L = (zb - za) * k * 0.9 * (0.4 + A.r() * 0.6); if (A.r() < 0.25) continue; A.box(zgPick(A, ZG.sail), u, 0.35, z - L, 0.9 * (ub - ua) / 10, 0.04, L); }
      }
      // the shrouds from the channels, their ratlines, and the topmast's own from the top's rim
      if (p.chan) {
        const [ua, ub, cz, cv] = p.chan, n = 6;
        for (const s of [-1, 1]) {
          A.box(ZG.oak3, (ua + ub) / 2, s * (cv - 0.42), cz - 0.16, ub - ua + 0.6, 0.95, 0.16);
          const sh = [];
          for (let k = 0; k < n; k++) {
            const u0 = ua + k * (ub - ua) / (n - 1), b0 = [u0, s * cv, cz + 0.25], t = [-0.2 + (k - 2.5) * 0.12, s * (r + 0.35), tz - 0.5];
            zgLine(A, '#2e2a22', ...b0, ...t, 0.05); sh.push([b0, t]);
            A.part('sph', ZG.oak3, u0, s * cv, cz + 0.25, 0.28, 0.32, 0.14); zgLine(A, ZG.iron, u0, s * (cv - 0.1), cz, u0 + 0.1, s * (cv - 0.75), cz - 1.9, 0.05);
          }
          for (let z = cz + 1.0; z < tz - 1.2; z += 0.9) for (let k = 0; k < n - 1; k++) {
            const P = i => { const [b0, t] = sh[i], q = (z - b0[2]) / (t[2] - b0[2]); return [b0[0] + (t[0] - b0[0]) * q, b0[1] + (t[1] - b0[1]) * q, z]; };
            if (A.r() < 0.1) continue; zgLine(A, '#3a3428', ...P(k), ...P(k + 1), 0.025);
          }
          for (let k = 0; k < 3; k++) zgLine(A, '#2e2a22', (k - 1) * 0.9, s * r * 3.2, tz + 0.1, r * 1.5, s * 0.25, h2 - 2.2, 0.04);
          zgLine(A, '#2e2a22', ua - 2.5, s * cv, cz + 0.2, r * 1.5, s * 0.3, h2 - 1.2, 0.045);
        }
      }
      // slack ends hanging off the yardarms
      for (const [z, len] of (p.yards || []).slice(0, 2)) for (const s of [-1, 1]) if (A.r() < 0.7) { const uy = (z > h ? r * 1.5 : 0) + r + 0.3; zgSag(A, FPI_C.rope, uy, s * len * 0.45, z, uy + 0.6, s * len * (0.25 + A.r() * 0.15), z - 6 - A.r() * 6, 1.2, 6, 0.035); }
    },
  },
});
// a square sail off a yard at height z, len long, down to bot (or eight metres), torn: a ragged foot, strips
// hanging, billowing a little forward (u). k: how much of it is left (1 whole, 0.3 a few rags)
function zgSail(A, u, z, len, bot, k) {
  // (each cloth hangs whole from the yard down to where it tore, ragged along the foot, and a few tatters below it)
  const zb = bot || z - 8, H = z - zb, nx = 9, ny = 6, cw = len * 0.86 / nx, ch = H / ny, c0 = zgPick(A, ZG.sail);
  for (let i = 0; i < nx; i++) {
    const v = -len * 0.43 + (i + 0.5) * cw, edge = i === 0 || i === nx - 1, keep = Math.round(ny * clamp(k + (A.r() - 0.5) * 0.7 - (edge ? 0.15 : 0), 0.17, 1)), c = A.r() < 0.3 ? zgPick(A, ZG.sail) : c0;
    for (let j = 0; j < keep; j++) { const zc = z - (j + 0.5) * ch, b = 0.25 + 0.9 * Math.sin(Math.PI * (i + 0.5) / nx) * Math.sin(Math.PI * (j + 0.8) / (ny + 0.6)); A.part('box', c, u + b, v, zc, 0.05, ch * 1.02, cw * 1.01, 0, (A.r() - 0.5) * 0.06, 0); }
    if (keep < ny && A.r() < 0.6) { const L = ch * (0.4 + A.r() * 1.2), b = 0.25 + 0.6 * Math.sin(Math.PI * (i + 0.5) / nx); A.box(c, u + b, v + (A.r() - 0.5) * cw * 0.4, z - keep * ch - L, 0.04, cw * (0.25 + A.r() * 0.35), L); }
  }
  A.box(FPI_C.rope, u + 0.2, 0, z - 0.15, 0.06, len * 0.86, 0.06);
}

// ---------- outside: her stern castle, her bow, the stern lanterns ----------
Object.assign(FPI_K, {
  // all of her that isn't a wall or a deck, seen from outside (one prop at her middle): the stern's two galleries
  // and the quarter galleries, the carved transom with the arms of Castile and Leon, the rudder, the taffrail over
  // the Quarterdeck; the bow drawing in to the stem, the beakhead, the lion at her head, the bowsprit and its sail,
  // the catheads and the anchors; the ensign, the stays between the masts
  gship: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const F = Math.PI / 2, G = ZG.gilt;
      // ---- the stern: the lower transom (x -44, |y| to 8.5) and the upper (to 11) are her walls; here what's on them
      const X = -44.25;
      // the galleries: a balcony at each of the two decks, balusters, pilasters, a roof, brackets under
      for (const [z, hw] of [[4.4, 7.6], [8.8, 10.2]]) {
        A.box(ZG.oak3, X - 1.0, 0, z - 0.25, 2.1, hw * 2, 0.25);
        for (let y = -hw + 0.2; y <= hw - 0.15; y += 0.32) A.cyl(ZG.oak2, X - 1.95, y, z, 0.05, 1.0, 0, 0, 0, 'cyl6');
        A.box(G, X - 1.95, 0, z + 1.0, 0.16, hw * 2, 0.12); A.box(ZG.oak3, X - 1.95, 0, z + 0.02, 0.16, hw * 2, 0.12);
        for (const s of [-1, 1]) { A.box(ZG.oak3, X - 1.0, s * hw, z - 0.25, 2.1, 0.16, 1.4); }
        for (let y = -hw + 0.4; y <= hw; y += (hw * 2 - 0.8) / 5) { A.box(G, X - 1.95, y, z, 0.2, 0.2, 3.9); zgLine(A, G, X - 0.1, y, z - 1.4, X - 1.8, y, z - 0.3, 0.2, 0.18); }
        A.box(ZG.red2, X - 1.05, 0, z + 3.85, 2.3, hw * 2 + 0.3, 0.12);
      }
      // carved work on the transom: the arms under the lower gallery, gilt mouldings, the counter's rail
      A.box(ZG.red, X - 0.06, 0, 1.6, 0.08, 5.2, 2.4); A.box(G, X - 0.1, 0, 1.45, 0.06, 5.5, 0.12); A.box(G, X - 0.1, 0, 4.0, 0.06, 5.5, 0.12);
      for (const [y, z, k] of [[-1.25, 3.0, 0], [1.25, 3.0, 1], [-1.25, 2.0, 1], [1.25, 2.0, 0]]) {
        if (k === 0) { A.box(G, X - 0.14, y, z - 0.35, 0.06, 0.9, 0.55); for (const dy of [-0.35, 0, 0.35]) A.box(G, X - 0.14, y + dy, z + 0.2, 0.06, 0.18, 0.2); }
        else { A.part('sph', '#8a2a20', X - 0.16, y, z, 0.12, 0.7, 0.5); A.part('sph', G, X - 0.18, y, z + 0.35, 0.1, 0.22, 0.22); }
      }
      A.part('cone', G, X - 0.15, 0, 4.25, 0.5, 0.6, 0.12); A.part('sph', G, X - 0.15, 0, 4.5, 0.3, 0.3, 0.2);
      for (const s of [-1, 1]) { zgLine(A, G, X - 0.1, s * 8.2, 0.6, X - 0.1, s * 8.4, 4.2, 0.18, 0.12); zgLine(A, G, X - 0.1, s * 10.8, 8.9, X - 0.1, s * 10.8, 13.0, 0.2, 0.14); }
      A.box(G, X - 0.12, 0, 8.55, 0.08, 17.4, 0.14);
      // the counter: the overhang of the upper stern out over the lower, planked under
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const y0 = s * (8.5 + i * 0.42); A.box(zgPick(A, ZG.oak), -44 + 7 - i * 1.15, y0 + s * 0.21, 8.42, 14 - i * 2.3, 0.42, 0.12); }
      // the rudder, and its iron
      A.box(ZG.oak3, X - 1.1, 0, -0.1, 2.1, 0.55, 9.2); A.box(ZG.oak3, X - 0.3, 0, 8.9, 0.6, 0.5, 0.9);
      for (const z of [1.2, 3.4, 5.6, 7.6]) A.box(ZG.iron, X - 0.7, 0, z, 1.3, 0.62, 0.14);
      for (let i = 0; i < 18; i++) A.part('ico', A.r() < 0.5 ? ZG.barn : ZG.weed, X - 1.1 + (A.r() - 0.5) * 2, (A.r() < 0.5 ? -1 : 1) * 0.29, A.r() * 4, 0.2, 0.18, 0.08);
      // the quarter galleries: a turret each side of the Great Cabin, windows lit, a little dome on top
      for (const s of [-1, 1]) {
        const y = s * 12.0, yo = s * 12.75;
        A.box(ZG.red2, -38.5, y, 8.6, 6.0, 1.5, 4.4); A.box(G, -38.5, y, 8.55, 6.2, 1.62, 0.14); A.box(G, -38.5, y, 12.95, 6.2, 1.62, 0.14);
        for (const x of [-40.6, -38.5, -36.4]) { A.box('#2a1e16', x, yo, 9.9, 1.3, 0.04, 1.9); A.part('box', '#ffc46a', x, yo + s * 0.02, 10.85, 1.1, 1.7, 0.02, 0, 0, 0, 'glow'); for (const k of [-0.3, 0.3]) A.box('#1a1410', x + k, yo + s * 0.04, 9.95, 0.04, 0.03, 1.8); A.box('#1a1410', x, yo + s * 0.04, 10.85, 1.2, 0.03, 0.04); }
        for (const x of [-41.5, -39.55, -37.45, -35.5]) A.box(G, x, yo + s * 0.04, 8.8, 0.14, 0.08, 4.2);
        A.part('half', ZG.red2, -38.5, y, 13.1, 6.0, 1.5, 3.0, 0, 0, F); A.part('cone', G, -38.5, y + s * 0.3, 14.9, 0.4, 0.8, 0.4);
        zgLine(A, G, -41.2, s * 11.25, 7.4, -38.5, y, 8.6, 0.3, 0.6); zgLine(A, G, -35.8, s * 11.25, 7.4, -38.5, y, 8.6, 0.3, 0.6);
        // and below them, the narrower lower quarter galleries off the Chaplain's Berth
        A.box(ZG.red2, -38, s * 10.2, 4.6, 4.4, 1.3, 3.6); A.box(G, -38, s * 10.2, 8.15, 4.6, 1.42, 0.14);
        for (const x of [-39.3, -36.7]) { A.part('box', '#ffb860', x, s * 10.87, 6.4, 0.9, 1.4, 0.02, 0, 0, 0, 'glow'); A.box('#1a1410', x, s * 10.9, 6.35, 0.04, 0.03, 1.45); }
      }
      // the taffrail: carved work over the Quarterdeck's stern rail, arched, gilt, the brackets for the lanterns
      const TZ = 14.4;
      for (let y = -10.5; y <= 10.5; y += 0.7) { const k = 1 - Math.pow(y / 11, 2); A.box(ZG.red2, -46.15, y, TZ - 0.1, 0.2, 0.72, 0.4 + k * 2.1); }
      A.box(G, -46.25, 0, TZ + 0.3, 0.1, 21, 0.12);
      for (let i = -6; i <= 6; i++) { const y = i * 1.6, k = 1 - Math.pow(y / 11, 2); A.part('sph', G, -46.28, y, TZ + 0.4 + k * 1.9, 0.18, 0.36, 0.36); }
      A.part('sph', G, -46.3, 0, TZ + 1.4, 0.2, 1.3, 1.1); A.box('#8a2a20', -46.32, 0, TZ + 1.0, 0.08, 0.7, 0.9); for (const s of [-1, 1]) A.part('sph', G, -46.32, s * 1.2, TZ + 1.3, 0.14, 0.6, 0.8);
      for (const y of [-6, 0, 6]) { zgLine(A, ZG.iron, -46.2, y, TZ + (y ? 1.2 : 2.2), -47.2, y, TZ + (y ? 1.6 : 2.6), 0.1); zgLine(A, ZG.iron, -46.2, y, TZ + (y ? 0.2 : 1.2), -47.0, y, TZ + (y ? 1.5 : 2.5), 0.07); }
      // the ensign: the cross of Burgundy, in rags, off its staff over the stern
      A.cyl(ZG.oak2, -46.6, 3.2, 13.0, 0.09, 8.5, 0, 0, 0, 'cyl8'); A.part('sph', G, -46.6, 3.2, 21.6, 0.25, 0.25, 0.25);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { if (A.r() < 0.25 + i * 0.1) continue; const u = -46.6 - 0.45 - i * 0.62, z = 20.9 - j * 0.6 - i * 0.12; A.part('box', i === j || i === 3 - j ? '#7a2a24' : '#b4ac94', u, 3.2 + 0.03 * i, z, 0.62, 0.6, 0.03, 0, 0, 0.12 * i); }
      // ---- the bow: her sides drawn in to the stem, the stem rising forward to the knee of the head
      const lo = [40.25, 4.25, 43.8], up = [42.25, 4.25, 45.6];
      for (let z = 0.1; z < 14.3; z += 0.4) {
        const k = clamp((z - 7.6) / 1.6, 0, 1), xe = lo[0] + (up[0] - lo[0]) * k, xs = lo[2] + (up[2] - lo[2]) * k + z * 0.05;
        for (const s of [-1, 1]) zgLine(A, zgPick(A, ZG.oak), xe - 0.3, s * 4.25, z + 0.2, xs, s * 0.25, z + 0.2, 0.37, 0.12);
      }
      for (const s of [-1, 1]) { for (const zw of [3.3, 6.7, 11.3]) { const k = clamp((zw - 7.6) / 1.6, 0, 1); zgLine(A, ZG.wale, lo[0] + 2 * k - 0.3, s * 4.4, zw, lo[2] + 1.8 * k + zw * 0.05, s * 0.4, zw, 0.3, 0.18); }
        A.part('cyl8', '#0a0907', 41.6 + 0.6, s * 2.45, 7.3, 0.7, 0.05, 0.7, 0, F, -s * 0.65, 'decal'); A.part('torus', ZG.iron, 42.2, s * 2.5, 7.3, 0.72, 0.72, 0.8, s * 0.95, F, 0); }
      // (barnacles thick on her forefoot)
      for (let i = 0; i < 60; i++) { const z = A.r() * 5, s = A.r() < 0.5 ? -1 : 1, t = A.r(), x = 40.4 + (43.8 + z * 0.05 - 40.4) * t; A.part('ico', A.r() < 0.6 ? ZG.barn : ZG.weed, x, s * (4.3 * (1 - t) + 0.35), z, 0.18, 0.14, 0.1); }
      const stem = [[43.8, 0], [44.2, 4], [45.2, 8], [46.2, 11], [47.4, 13.6], [48.5, 15.4]];
      for (let i = 0; i < stem.length - 1; i++) zgLine(A, ZG.oak3, stem[i][0], 0, stem[i][1], stem[i + 1][0], 0, stem[i + 1][1], 0.6, 0.5);
      // the knee of the head and the beakhead out ahead of her, its gratings, the head rails, the lion
      const kn = [[44.6, 4.5], [47.5, 7.2], [50.6, 9.2], [53, 10.6]];
      for (let i = 0; i < kn.length - 1; i++) zgLine(A, ZG.oak3, kn[i][0], 0, kn[i][1], kn[i + 1][0], 0, kn[i + 1][1], 0.9, 0.4);
      A.box(ZG.oak3, 46.8, 0, 10.9, 7.2, 6.2, 0.22); for (let x = 43.6; x < 50; x += 0.45) A.box('#2a2016', x, 0, 11.12, 0.2, 5.8 - (x - 43.6) * 0.5, 0.05);
      for (const s of [-1, 1]) {
        zgLine(A, G, 42.2, s * 4.2, 13.1, 52.5, s * 0.3, 11.4, 0.14); zgLine(A, ZG.red2, 42.2, s * 4.2, 12.2, 51.5, s * 0.6, 10.9, 0.2, 0.12); zgLine(A, ZG.oak3, 42.4, s * 4.0, 10.9, 50.5, s * 0.9, 10.9, 0.22, 0.16);
        for (let x = 43.4; x < 50.5; x += 1.3) { const t = (x - 42.2) / 10.3; A.box(ZG.oak3, x, s * (4.2 - t * 3.6), 10.9, 0.12, 0.12, 13.1 - t * 1.6 - 10.9); }
        // the catheads, an anchor hanging off each
        zgLine(A, ZG.oak3, 37.5, s * 8.5, 12.9, 39.6, s * 11.6, 13.3, 0.45, 0.45); A.box(G, 39.7, s * 11.7, 13.05, 0.4, 0.4, 0.5);
        const ax = 39.4, ay = s * 11.5;
        A.box(ZG.iron, ax, ay, 6.3, 0.26, 0.26, 6.2); A.part('half', ZG.iron, ax, ay, 6.5, 0.28, 3.2, 2.6, 0, 0, F);
        for (const k of [-1, 1]) A.part('cone', ZG.iron, ax, ay + k * 1.3, 7.3, 0.5, 0.7, 0.2, 0, 0, k * 0.6);
        zgLine(A, ZG.oak3, ax, ay - 1.4, 12.1, ax, ay + 1.4, 12.1, 0.35, 0.3); A.part('torus', ZG.iron, ax, ay, 12.8, 0.5, 0.5, 0.6, 0, F, 0);
        zgLine(A, FPI_C.rope, ax, ay, 12.9, 39.6, s * 11.6, 13.2, 0.07);
        for (let i = 0; i < 7; i++) A.box(A.r() < 0.5 ? ZG.weed : ZG.weed2, ax + (A.r() - 0.5) * 0.3, ay + (A.r() - 0.5) * 2.6, 6.2 - A.r(), 0.05, 0.05, 0.6 + A.r() * 1.2);
        // the anchor cables out of the hawse holes, down onto the shingle ahead of her
        zgSag(A, '#4a4030', 42.4, s * 2.5, 7.2, 58, s * 7, 0.15, 1.2, 8, 0.2);
      }
      // the lion: crowned, rampant, leaning out over the sea, weed hanging off him
      const LX = 52.8, LZ = 10.6, L = '#8a3a24';
      zgLine(A, L, LX - 1.6, 0, LZ - 1.4, LX + 0.4, 0, LZ + 1.2, 1.0, 1.0);
      A.part('ico', '#9a6a30', LX + 0.6, 0, LZ + 1.9, 1.5, 1.5, 1.4, 0, 0, 0.4); A.part('sph', L, LX + 1.15, 0, LZ + 1.85, 0.8, 0.9, 0.75);
      A.part('sph', '#5a2a1a', LX + 1.55, 0, LZ + 1.65, 0.35, 0.3, 0.35); for (const s of [-1, 1]) A.part('sph', '#ffd08a', LX + 1.45, s * 0.22, LZ + 2.05, 0.1, 0.1, 0.1, 0, 0, 0, 'glow');
      A.cyl(G, LX + 0.75, 0, LZ + 2.55, 0.36, 0.3, 0, 0, 0, 'cyl8'); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; A.part('cone', G, LX + 0.75 + Math.cos(a) * 0.3, Math.sin(a) * 0.3, LZ + 3.0, 0.14, 0.3, 0.14); }
      for (const s of [-1, 1]) { zgLine(A, L, LX + 0.3, s * 0.4, LZ + 0.8, LX + 1.5, s * 0.45, LZ + 0.4, 0.3); zgLine(A, L, LX + 1.5, s * 0.45, LZ + 0.4, LX + 1.9, s * 0.5, LZ + 0.9, 0.24); zgLine(A, L, LX - 0.9, s * 0.4, LZ - 1.0, LX - 0.3, s * 0.45, LZ - 1.9, 0.32); }
      zgSag(A, L, LX - 1.6, 0, LZ - 1.2, LX - 3.2, 0, LZ - 0.4, -0.5, 4, 0.12);
      for (let i = 0; i < 12; i++) A.box(A.r() < 0.5 ? ZG.weed : ZG.weed2, LX - 1 + A.r() * 2.2, (A.r() - 0.5) * 1.0, LZ - 0.6 - A.r() * 1.2, 0.05, 0.05, 0.5 + A.r());
      // the bowsprit, its gammoning, the spritsail yard and its rag of sail, the stays down to it
      const bs = [41, 0, 14.0, 64, 0, 23.4];
      zgLine(A, ZG.mast, bs[0], 0, bs[2], (bs[0] + bs[3]) / 2, 0, (bs[2] + bs[5]) / 2, 1.1, 1.1); zgLine(A, ZG.mast, (bs[0] + bs[3]) / 2, 0, (bs[2] + bs[5]) / 2, bs[3], 0, bs[5], 0.75, 0.75);
      for (let i = 0; i < 6; i++) A.part('torus', FPI_C.rope, 46.6 + i * 0.22, 0, 16.2 + i * 0.09, 1.3, 1.3, 1.6, 0, 0, F - 0.39);
      A.log(ZG.mast, 57.5, 0, 19.9, 0.25, 15, F); zgSail(A, 57.8, 19.6, 15, 14.5, 0.45);
      // the ship's stays, mast to mast and down to the bowsprit, slack
      const mt = p.mt || [];
      for (let i = 0; i < mt.length - 1; i++) { const a = mt[i], b = mt[i + 1]; zgSag(A, '#2e2a22', a[0] + 0.6, 0, a[1] - 1, b[0] - 0.4, 0, b[2], 0.8, 6, 0.07); }
      if (mt.length) { const f = mt[mt.length - 1]; zgSag(A, '#2e2a22', f[0] + 0.6, 0, f[1] - 1, 58, 0, 20.5, 1.1, 8, 0.08); zgSag(A, '#2e2a22', f[0] + 0.6, 0, f[1] + 8, 63, 0, 23.0, 1.4, 8, 0.05); }
    },
  },
  // one of the three great stern lanterns: a glazed hexagon in gilt on a bracket, a dome, a finial (s: its size)
  glantern: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const s = p.s || 1, z = p.z, G = ZG.gilt;
      A.part('cyl6', '#ffd890', 0, 0, z, 0.9 * s, 1.3 * s, 0.9 * s, 0, 0, 0, 'glow');
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; A.box(G, Math.cos(a) * 0.5 * s, Math.sin(a) * 0.5 * s, z - 0.7 * s, 0.07 * s, 0.07 * s, 1.4 * s); }
      A.part('cyl6', G, 0, 0, z - 0.72 * s, 1.15 * s, 0.16 * s, 1.15 * s); A.part('cone', G, 0, 0, z - 1.0 * s, 0.7 * s, 0.45 * s, 0.7 * s, 0, 0, Math.PI);
      A.part('cyl6', G, 0, 0, z + 0.7 * s, 1.15 * s, 0.14 * s, 1.15 * s); A.part('sph', '#7a5a2a', 0, 0, z + 0.95 * s, 1.0 * s, 0.6 * s, 1.0 * s); A.part('cone', G, 0, 0, z + 1.4 * s, 0.3 * s, 0.6 * s, 0.3 * s); A.part('sph', G, 0, 0, z + 1.75 * s, 0.2 * s, 0.2 * s, 0.2 * s);
    },
  },
});

// ---------- below decks: what's in her ----------
Object.assign(FPI_K, {
  // a heap of ballast stones in the hold, wet, weed on them (r: how far it spreads)
  gballast: {
    col: '#4a4a46',
    sol(p) { return [fpiCirc(p, 0, 0, p.r * 0.7, 0.5)]; },
    b3(p, A) { for (let i = 0; i < Math.round(p.r * p.r * 9); i++) { const a = A.r() * 6.28, d = Math.sqrt(A.r()) * p.r, h = 0.55 * (1 - d / p.r); A.part('ico', A.r() < 0.15 ? ZG.weed : A.r() < 0.5 ? '#55554f' : '#45453f', Math.cos(a) * d, Math.sin(a) * d, h * A.r() + 0.08, 0.3 + A.r() * 0.3, 0.2 + A.r() * 0.2, 0.3 + A.r() * 0.25, A.r() * 3, A.r() * 3); } },
  },
  // sea water left standing in the bilge, and weed and wrack round its edge (w, d)
  gpool: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      A.part('disc', '#24404a', 0, 0, 0.1, p.w, 1, p.d, 0, 0, 0, 'water');
      for (let i = 0; i < Math.round((p.w + p.d) * 2); i++) { const a = A.r() * 6.28; A.box(A.r() < 0.5 ? ZG.weed : '#3a321e', Math.cos(a) * p.w * 0.5, Math.sin(a) * p.d * 0.5, 0.06, 0.4 + A.r() * 0.6, 0.12, 0.04, a); }
    },
  },
  // weed hanging off the beams overhead, and the odd fish-bone and crab shell (z: the beams' underside)
  gweed: {
    noShadow: true, sol() { return []; },
    b3(p, A) { for (let i = 0; i < (p.n || 14); i++) { const u = (A.r() - 0.5) * (p.w || 6), v = (A.r() - 0.5) * (p.d || 4), L = 0.4 + A.r() * 1.3; A.box(A.r() < 0.5 ? ZG.weed : ZG.weed2, u, v, p.z - L, 0.05 + A.r() * 0.06, 0.02, L); } },
  },
  // great coils of anchor cable, flaked down (r: the coil's radius)
  gcable: {
    col: FPI_C.rope,
    sol(p) { return [fpiCirc(p, 0, 0, p.r, 0.8)]; },
    b3(p, A) { for (let l = 0; l < 5; l++) for (let k = 0; k < 4; k++) { const rr = p.r * (0.35 + k * 0.2) * 2; A.part('torus', l % 2 ? '#6a5a40' : FPI_C.rope, 0, 0, 0.1 + l * 0.16, rr, rr, rr * 1.4, 0, Math.PI / 2, 0); } A.part('cyl8', '#2a2218', 0, 0, 0.2, p.r * 0.6, 0.3, p.r * 0.6); },
  },
  // the riding bitts: two great posts and the crosspiece the cables are made fast to
  gbitts: {
    col: ZG.oak3,
    sol(p) { return [fpiBox(p, -1.1, 0, 0.3, 0.3, 2.0), fpiBox(p, 1.1, 0, 0.3, 0.3, 2.0)]; },
    b3(p, A) { for (const s of [-1, 1]) { A.box(ZG.oak3, s * 1.1, 0, -0.05, 0.55, 0.55, 2.4); A.box(ZG.iron, s * 1.1, 0, 1.6, 0.6, 0.6, 0.08); } A.box(ZG.oak2, 0, 0.1, 1.2, 3.0, 0.4, 0.4); for (const s of [-1, 1]) A.part('torus', FPI_C.rope, s * 0.6, 0.12, 1.4, 0.7, 0.7, 0.7, 0, Math.PI / 2, 0); },
  },
  // the chain pumps by the mainmast's foot: two tall cases, their winch, a cistern
  gpump: {
    col: ZG.oak3,
    sol(p) { return [fpiBox(p, 0, 0, 0.9, 0.4, 1.4)]; },
    b3(p, A) { for (const s of [-1, 1]) { A.box(ZG.oak3, s * 0.6, 0, -0.05, 0.45, 0.45, 4.3); A.box(ZG.iron, s * 0.6, 0, 1.0, 0.5, 0.5, 0.06); } A.box(ZG.oak2, 0, 0, 0.1, 1.9, 0.7, 0.5); A.log(ZG.iron, 0, -0.32, 1.25, 0.05, 2.2); for (const s of [-1, 1]) A.box(ZG.iron, s * 1.15, -0.32, 0.9, 0.05, 0.05, 0.4); },
  },
  // kegs of powder in their racks, a felt screen before them (n: how many)
  gkegs: {
    col: '#5a4430',
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.45, 1.6)]; },
    b3(p, A) {
      A.box(ZG.oak3, 0, 0.1, -0.05, p.w, 0.8, 0.1); A.box(ZG.oak3, 0, 0.1, 0.78, p.w, 0.8, 0.06);
      for (const z of [0.05, 0.84]) for (let u = -p.w / 2 + 0.3; u < p.w / 2 - 0.2; u += 0.5) { A.log('#6a4a2c', u, 0.05, z + 0.25, 0.25, 0.7, Math.PI / 2, 0, 'cyl8'); for (const k of [-0.22, 0.22]) A.log(ZG.iron, u, 0.05 + k, z + 0.25, 0.26, 0.04, Math.PI / 2, 0, 'cyl8'); }
    },
  },
  // the light room's window: a copper lantern behind thick glass in the bulkhead, lighting the powder from outside
  // it (glowing; its light is the map's)
  glightbox: { noShadow: true, sol() { return []; }, b3(p, A) { A.box('#7a4a2a', 0, 0, 1.55, 0.95, 0.4, 0.95); A.part('box', '#ffc070', 0, -0.21, 2.02, 0.7, 0.7, 0.02, 0, 0, 0, 'glow'); for (const k of [-0.18, 0.18]) A.box('#3a2416', k, -0.23, 1.68, 0.04, 0.02, 0.7); A.box('#3a2416', 0, -0.23, 2.02, 0.7, 0.02, 0.04); } },
  // sacks of biscuit and flour, piled (n)
  gsacks: {
    col: '#7a6a4a',
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.55, 0.9)]; },
    b3(p, A) { for (let u = -p.w / 2 + 0.35; u < p.w / 2 - 0.2; u += 0.62) for (const [v, z] of [[-0.25, 0.25], [0.28, 0.25], [0, 0.68]]) { if (A.r() < 0.15) continue; A.part('sph', A.r() < 0.5 ? '#7e6e4e' : '#6e5e42', u + (A.r() - 0.5) * 0.1, v, z, 0.6, 0.48, 0.5, A.r() * 0.6); } },
  },
  // bins of ship's biscuit, lidded, along a wall
  gbins: { col: ZG.oak2, sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.4, 1.0)]; }, b3(p, A) { A.box(ZG.oak2, 0, 0, -0.05, p.w, 0.8, 1.0); for (let u = -p.w / 2 + 0.55; u < p.w / 2; u += 1.1) { A.box(ZG.oak3, u - 0.55, 0, 0, 0.06, 0.82, 1.02); A.box(zgPick(A, ZG.plank), u, 0.05, 0.98, 1.0, 0.7, 0.05, 0, A.r() < 0.3 ? 0.3 : 0); } A.part('ico', '#b8a070', p.w * 0.2, -0.45, 0.06, 0.3, 0.12, 0.3); } },
  // the squadron's pay chest: iron-bound, three locks, the lid sprung and coin spilling
  gpaychest: {
    col: '#3e2a1c',
    sol(p) { return [fpiBox(p, 0, 0, 1.05, 0.65, 1.1)]; },
    b3(p, A) {
      A.box('#3e2a1c', 0, 0, 0, 2.0, 1.2, 0.95); for (const u of [-0.85, -0.3, 0.3, 0.85]) A.box(ZG.iron, u, 0, -0.01, 0.1, 1.24, 0.98);
      for (const v of [-0.62, 0.62]) A.box(ZG.iron, 0, v, 0.4, 2.04, 0.04, 0.1);
      A.part('half', '#4a3222', 0, 0.55, 1.3, 1.2, 2.04, 0.55, 0, -1.1, Math.PI / 2);
      for (const u of [-0.5, 0, 0.5]) { A.box('#8a7a4a', u, -0.62, 0.55, 0.16, 0.04, 0.22); A.box('#141210', u, -0.64, 0.6, 0.03, 0.02, 0.08); }
      for (let i = 0; i < 70; i++) { const a = A.r() * 6.28, d = Math.sqrt(A.r()) * (i < 30 ? 0.8 : 1.4); A.part('cyl8', i % 4 ? '#c8a050' : '#d8d0c0', (i < 30 ? 0 : -0.2) + Math.cos(a) * d * (i < 30 ? 1 : 0.9), (i < 30 ? 0 : -1.2) + Math.sin(a) * d * 0.6, i < 30 ? 0.96 + A.r() * 0.08 : 0.02, 0.14, 0.02, 0.14, 0, (A.r() - 0.5) * 0.6, (A.r() - 0.5) * 0.6, i % 7 ? undefined : 'glow'); }
    },
  },
  // an iron grille across a room, floor to beams, (w long), its gate standing open (gate: where along it)
  ggrille: {
    noShadow: true, sol(p) { return []; },
    b3(p, A) { const H = p.hh || 3.7; for (let u = -p.w / 2; u <= p.w / 2 + 1e-6; u += 0.22) { if (p.gate != null && Math.abs(u - p.gate) < 0.6) continue; A.box(ZG.iron, u, 0, -0.05, 0.05, 0.05, H); } for (const z of [0.1, 1.4, 2.6, H - 0.15]) A.box(ZG.iron, 0, 0, z, p.w, 0.08, 0.08); if (p.gate != null) { for (let k = 0; k < 6; k++) A.box(ZG.iron, p.gate - 0.6 + 0.08, -0.15 - k * 0.2, -0.05, 0.05, 0.05, 2.4); A.box(ZG.iron, p.gate - 0.52, -0.6, 2.3, 0.05, 1.1, 0.06); } },
  },
  // a hammock slung between the beams (lo: how low it hangs), a blanket in it, maybe a sea-bag
  ghammock: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      const L = p.len || 2.4, z = p.z, lo = p.lo || 0.45, c = p.c || zgPick(A, ['#8a826a', '#7a725c', '#6a6450']);
      for (let i = 0; i < 4; i++) { const u0 = -L / 2 + i * L / 4, u1 = u0 + L / 4, f = x => z - lo * (1 - Math.pow(2 * x / L, 2)); zgLine(A, c, u0, 0, f(u0), u1, 0, f(u1), 0.5, 0.08); }
      for (const s of [-1, 1]) zgLine(A, FPI_C.rope, s * L / 2, 0, z, s * (L / 2 + 0.5), 0, z + 0.7, 0.03);
      A.box(A.r() < 0.5 ? '#5a2a24' : '#3a4a5a', 0, 0, z - lo + 0.05, L * 0.4, 0.45, 0.12);
    },
  },
  // a hanging cot (the surgeon's): a framed canvas box on its four lines
  gcot: { noShadow: true, sol() { return []; }, b3(p, A) { const z = p.z; A.box('#8a826a', 0, 0, z, 2.0, 0.8, 0.35); A.box('#c8c0a8', 0, 0, z + 0.3, 1.8, 0.65, 0.08); A.box('#6a3a2a', 0.3, 0, z + 0.36, 1.0, 0.7, 0.06); for (const su of [-1, 1]) for (const sv of [-1, 1]) zgLine(A, FPI_C.rope, su * 1.0, sv * 0.4, z + 0.35, su * 0.6, 0, p.top, 0.025); } },
  // a seaman's chest
  gchest: { col: ZG.oak2, sol(p) { return [fpiBox(p, 0, 0, 0.5, 0.3, 0.6)]; }, b3(p, A) { A.box(p.c || zgPick(A, ['#4a3a2a', '#3a4a3a', '#5a3a2a']), 0, 0, 0, 0.95, 0.55, 0.5); A.box(ZG.oak3, 0, 0, 0.48, 1.0, 0.6, 0.08); for (const s of [-1, 1]) A.part('torus', FPI_C.rope, s * 0.5, 0, 0.35, 0.2, 0.2, 0.2, 0, 0, Math.PI / 2); } },
  // the officers' or the crew's mess table, slung from the beams on ropes, benches either side (w)
  gmess: {
    col: ZG.oak2,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, 0.45, 0.82)]; },
    b3(p, A) {
      A.box(ZG.oak2, 0, 0, 0.74, p.w, 0.85, 0.07); for (const s of [-1, 1]) { zgLine(A, FPI_C.rope, s * (p.w / 2 - 0.15), 0, 0.8, s * (p.w / 2 - 0.15), 0, p.top || 3.5, 0.03); A.box(ZG.oak3, s * (p.w / 2 - 0.2), 0, -0.05, 0.08, 0.6, 0.78); }
      for (let i = 0; i < 5; i++) { const u = (A.r() - 0.5) * p.w * 0.8, v = (A.r() - 0.5) * 0.5; if (A.r() < 0.5) A.cyl('#7a7a74', u, v, 0.81, 0.07, 0.12); else A.cyl('#5a4a30', u, v, 0.81, 0.16, 0.05); }
    },
  },
  // the captain's table: long, on carved legs, a cloth, charts and dividers, candlesticks lit, a decanter, a chair
  // at its head (the chairs are their own)
  gctable: {
    col: ZG.oak2,
    sol(p) { return [fpiBox(p, 0, 0, p.w / 2, p.d / 2, 0.84)]; },
    b3(p, A) {
      const w = p.w, d = p.d;
      A.box('#4a2e1e', 0, 0, 0.74, w, d, 0.1); A.box(ZG.gilt, 0, 0, 0.73, w + 0.04, d + 0.04, 0.03);
      for (const su of [-1, 1]) for (const sv of [-1, 1]) { A.cyl('#3a2418', su * (w / 2 - 0.2), sv * (d / 2 - 0.15), -0.05, 0.08, 0.8, 0, 0, 0, 'cyl6'); A.part('sph', '#3a2418', su * (w / 2 - 0.2), sv * (d / 2 - 0.15), 0.35, 0.22, 0.22, 0.22); }
      A.box('#5a1e1e', 0, 0, 0.84, w * 0.75, d + 0.12, 0.02); for (const s of [-1, 1]) A.box('#5a1e1e', 0, s * (d / 2 + 0.06), 0.45, w * 0.75, 0.02, 0.4);
      A.box('#c8bc98', -0.6, 0.05, 0.86, 1.4, 0.95, 0.01, 0.15); A.box('#b8a880', 0.8, -0.1, 0.86, 1.0, 0.8, 0.012, -0.3); A.box('#6a8098', -0.5, 0.05, 0.87, 0.5, 0.3, 0.005, 0.15);
      A.box('#8a8070', 0.35, 0.25, 0.87, 0.35, 0.03, 0.015, 0.5); A.box('#8a8070', 0.4, 0.3, 0.87, 0.35, 0.03, 0.015, 0.9);
      for (const u of [-w * 0.3, w * 0.3]) { A.cyl(ZG.gilt, u, 0, 0.86, 0.09, 0.05); A.cyl(ZG.gilt, u, 0, 0.9, 0.03, 0.28); A.cyl('#e8e0c8', u, 0, 1.18, 0.03, 0.14); A.glow('#ffd890', u, 0, 1.38, 0.08); }
      A.part('sph', '#3a5a3a', 1.6, 0.25, 0.97, 0.22, 0.24, 0.22); A.cyl('#3a5a3a', 1.6, 0.25, 1.05, 0.04, 0.16); A.cyl('#b8b0a0', 1.3, 0.3, 0.86, 0.04, 0.12); A.cyl('#b8b0a0', -1.6, -0.25, 0.86, 0.04, 0.12);
      A.part('sph', '#8a7a5a', -1.9, -0.1, 0.92, 0.18, 0.12, 0.18); A.box(ZG.iron, -1.2, -0.3, 0.86, 0.08, 0.3, 0.06, 0.3);
    },
  },
  // a high-backed chair, carved, leather
  gchair: {
    col: '#3a2418',
    sol(p) { return [fpiBox(p, 0, 0, 0.3, 0.3, 0.5)]; },
    b3(p, A) { const c = '#3a2418'; for (const su of [-1, 1]) for (const sv of [-1, 1]) A.box(c, su * 0.24, sv * 0.22, -0.05, 0.06, 0.06, 0.5); A.box('#5a2a1e', 0, 0, 0.45, 0.58, 0.55, 0.08); for (const s of [-1, 1]) A.box(c, s * 0.24, 0.25, 0.45, 0.07, 0.07, (p.tall ? 1.15 : 0.75)); A.box('#5a2a1e', 0, 0.26, 0.6, 0.44, 0.04, p.tall ? 0.9 : 0.5); A.box(ZG.gilt, 0, 0.26, p.tall ? 1.55 : 1.15, 0.56, 0.05, 0.08); if (p.tall) A.part('sph', ZG.gilt, 0, 0.26, 1.7, 0.18, 0.18, 0.06); },
  },
  // the binnacle: a cabinet, its glass dome, the compass card lit from inside
  gbinn: {
    col: '#4a3020',
    sol(p) { return [fpiBox(p, 0, 0, 0.45, 0.35, 1.2)]; },
    b3(p, A) { A.box('#4a3020', 0, 0, -0.05, 0.9, 0.7, 1.1); A.box(ZG.gilt, 0, 0, 1.0, 0.95, 0.75, 0.06); for (const s of [-1, 1]) { A.part('sph', '#d8d0a8', s * 0.22, 0, 1.2, 0.36, 0.25, 0.36, 0, 0, 0, 'glow'); A.cyl(ZG.gilt, s * 0.22, 0, 1.06, 0.19, 0.06); } A.part('cone', ZG.gilt, 0, 0, 1.45, 0.2, 0.25, 0.2); A.box('#2a2018', 0, -0.36, 0.3, 0.6, 0.02, 0.5); },
  },
  // the whipstaff: the long lever she was steered by, up from the tiller below through its rowle in the deck
  gwhip: { col: ZG.oak3, sol(p) { return [fpiCirc(p, 0, 0, 0.18, 2.6)]; }, b3(p, A) { A.box(ZG.oak3, 0, 0, -0.05, 0.7, 0.7, 0.35); A.part('sph', ZG.gilt, 0, 0, 0.3, 0.6, 0.35, 0.6); zgLine(A, ZG.oak2, 0, 0, 0.2, 0.2, 0.5, 3.4, 0.14); A.part('sph', ZG.oak3, 0.2, 0.5, 3.4, 0.2, 0.2, 0.2); } },
  // the hourglass rack on the bulkhead: four glasses in a frame, one running, a bell to strike the half-hours
  ghour: {
    noShadow: true, sol() { return []; },
    b3(p, A) {
      A.box(ZG.oak3, 0, 0.05, 1.3, 1.5, 0.12, 0.9); A.box(ZG.oak3, 0, -0.1, 1.3, 1.5, 0.3, 0.06); A.box(ZG.oak3, 0, -0.1, 2.12, 1.5, 0.3, 0.06);
      for (const u of [-0.5, -0.17, 0.17, 0.5]) { A.part('cone', '#d8e0d8', u, -0.12, 1.53, 0.18, 0.4, 0.18, 0, 0, Math.PI); A.part('cone', '#d8e0d8', u, -0.12, 1.92, 0.18, 0.4, 0.18); A.part('cone', '#c8a868', u, -0.12, u === -0.17 ? 1.43 : 1.82, 0.12, 0.15, 0.12); A.box(ZG.oak3, u - 0.11, -0.1, 1.36, 0.03, 0.03, 0.76); }
      A.part('cone', ZG.bronze, 0.95, -0.12, 1.75, 0.3, 0.32, 0.3); A.box(ZG.iron, 0.95, -0.02, 1.9, 0.04, 0.2, 0.04);
    },
  },
  // the altar of the Chaplain's Berth: a vested table, candles lit, a crucifix over it, a reliquary
  galtar: {
    col: '#6a5a4a',
    sol(p) { return [fpiBox(p, 0, 0, 1.0, 0.45, 1.0)]; },
    b3(p, A) {
      A.box('#5a4232', 0, 0, -0.05, 2.0, 0.9, 1.0); A.box('#e0d8c4', 0, -0.02, 0.98, 2.1, 0.96, 0.03); A.box('#e0d8c4', 0, -0.47, 0.55, 2.1, 0.02, 0.45); A.box('#7a2420', 0, -0.48, 0.3, 0.9, 0.02, 0.7); A.box(ZG.gilt, 0, -0.49, 0.62, 0.2, 0.02, 0.4); A.box(ZG.gilt, 0, -0.49, 0.75, 0.5, 0.02, 0.1);
      A.box('#5a4232', 0, 0.3, 1.0, 2.0, 0.3, 0.25);
      for (const u of [-0.8, -0.45, 0.45, 0.8]) { A.cyl(ZG.gilt, u, 0.3, 1.25, 0.07, 0.25); A.cyl('#e8e0c8', u, 0.3, 1.5, 0.035, 0.22); A.glow('#ffd890', u, 0.3, 1.78, 0.08); }
      A.box('#6a5a3a', 0, 0.2, 1.25, 0.5, 0.3, 0.35); A.part('half', ZG.gilt, 0, 0.2, 1.62, 0.5, 0.3, 0.2, 0, 0, Math.PI / 2); A.part('sph', '#c8b8a0', 0, 0.04, 1.42, 0.12, 0.12, 0.08, 0, 0, 0, 'glow');
      A.box('#3a2a1e', 0, 0.42, 1.8, 0.14, 0.08, 1.8); A.box('#3a2a1e', 0, 0.42, 2.95, 1.0, 0.08, 0.14); A.part('sph', '#c8b8a0', 0, 0.36, 3.05, 0.12, 0.14, 0.1); A.box('#c8b8a0', 0, 0.36, 2.35, 0.14, 0.06, 0.6);
    },
  },
  // a little chamber organ, its pipes, a stool
  gorgan: {
    col: '#4a3020',
    sol(p) { return [fpiBox(p, 0, 0, 0.7, 0.4, 1.4)]; },
    b3(p, A) { A.box('#4a3020', 0, 0.05, -0.05, 1.4, 0.7, 1.0); A.box('#e0d8c0', 0, -0.33, 0.85, 1.1, 0.14, 0.04); A.box('#4a3020', 0, 0.2, 1.0, 1.4, 0.35, 1.0); for (let i = 0; i < 11; i++) { const u = -0.55 + i * 0.11, h = 0.5 + Math.abs(5 - i) * -0.05 + 0.3; A.cyl(ZG.gilt, u, 0.05, 1.0, 0.04, h + 0.4, 0, 0, 0, 'cyl6'); } A.box(ZG.gilt, 0, 0.05, 2.0, 1.4, 0.4, 0.06); A.cyl('#3a2418', 0, -0.75, -0.05, 0.2, 0.5); },
  },
  // the surgeon's table: a heavy board on trestles, the saws and knives laid out, bowls, a lamp over (the lamp's
  // light is the map's), a sea chest of instruments
  gsurg: {
    col: ZG.oak2,
    sol(p) { return [fpiBox(p, 0, 0, 1.1, 0.5, 0.9)]; },
    b3(p, A) {
      A.box('#5a4430', 0, 0, 0.8, 2.2, 1.0, 0.1); A.box('#4a1a16', 0.3, 0.1, 0.9, 0.9, 0.6, 0.01); for (const s of [-1, 1]) { A.box(ZG.oak3, s * 0.85, 0, -0.05, 0.1, 0.9, 0.86); A.box(ZG.oak3, s * 0.85, 0, 0.15, 0.1, 1.0, 0.08); }
      A.box('#9a9a94', -0.7, -0.3, 0.91, 0.5, 0.12, 0.01, 0.2); A.box('#3a2a1a', -0.95, -0.32, 0.91, 0.14, 0.06, 0.04, 0.2); A.box('#9a9a94', -0.55, -0.1, 0.91, 0.25, 0.03, 0.01, -0.3); A.box('#9a9a94', -0.3, -0.35, 0.91, 0.2, 0.03, 0.01, 0.6);
      A.cyl('#8a8070', 0.75, -0.25, 0.9, 0.16, 0.08); A.cyl('#6a2a20', 0.75, -0.25, 0.92, 0.13, 0.07); A.cyl('#b8b0a0', 0.9, 0.25, 0.9, 0.05, 0.14);
      A.box('#3a2a1a', -1.6, 0.0, -0.05, 0.55, 0.9, 0.55); A.box(ZG.iron, -1.6, 0.0, 0.48, 0.6, 0.95, 0.04);
    },
  },
  // the galley hearth: a brick firebox on the deck, the fire in it, copper kettles, the chimney up through the deck
  ghearth: {
    col: '#6a3a2a',
    sol(p) { return [fpiBox(p, 0, 0, 1.4, 0.9, 1.5)]; },
    b3(p, A) {
      const B = ['#6a3a2a', '#5a3224', '#743e2c'];
      for (let z = 0; z < 1.4; z += 0.2) for (let u = -1.35; u < 1.35; u += 0.45) A.box(zgPick(A, B), u + (z * 5 % 2 ? 0.11 : 0) + 0.2, 0, z - 0.05, 0.43, 1.78, 0.19);
      A.box('#140c08', 0, -0.9, 0.2, 1.6, 0.04, 0.7); A.part('ico', '#ff8a30', -0.2, -0.75, 0.4, 0.6, 0.35, 0.3, 0, 0, 0, 'glow'); A.part('ico', '#ffb050', 0.3, -0.72, 0.35, 0.4, 0.25, 0.25, 0, 0, 0, 'glow');
      A.box(ZG.iron, 0, 0, 1.38, 2.9, 1.9, 0.08);
      for (const [u, r, h] of [[-0.7, 0.42, 0.7], [0.55, 0.34, 0.55]]) { A.cyl('#a8603a', u, 0, 1.45, r, h, 0, 0, 0, 'cyl8'); A.cyl('#8a4a2a', u, 0, 1.45 + h, r * 1.04, 0.06, 0, 0, 0, 'cyl8'); A.part('torus', ZG.iron, u, 0, 1.45 + h + 0.25, r, r, r, 0, Math.PI / 2, 0); }
      A.cyl('#3a2a22', 0.9, 0.6, 1.45, 0.25, p.top - 1.45, 0, 0, 0, 'cyl8');
      for (let i = 0; i < 6; i++) A.part('torus', '#a8603a', -1.2 + i * 0.4, 0.95, 2.3, 0.3, 0.3, 0.3, 0, 0, 0);
    },
  },
  // the capstan in the Waist: its drum, its whelps, the bars standing out of its head, a messenger round it
  gcapstan: {
    col: ZG.oak2,
    sol(p) { return [fpiCirc(p, 0, 0, 0.85, 1.4)]; },
    b3(p, A) {
      A.cyl(ZG.oak3, 0, 0, -0.05, 0.9, 0.2, 0, 0, 0, 'cyl8'); A.cyl(ZG.oak2, 0, 0, 0.1, 0.6, 1.0, 0, 0, 0, 'cyl8');
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; A.box(ZG.oak3, Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.1, 0.16, 0.16, 0.9, a); }
      A.cyl(ZG.oak3, 0, 0, 1.05, 0.8, 0.35, 0, 0, 0, 'cyl8'); A.cyl(ZG.gilt, 0, 0, 1.4, 0.3, 0.06, 0, 0, 0, 'cyl8');
      for (let i = 0; i < 6; i++) { if (i === 2 || i === 5) continue; const a = i / 6 * Math.PI * 2 + 0.3; zgLine(A, ZG.oak2, Math.cos(a) * 0.5, Math.sin(a) * 0.5, 1.25, Math.cos(a) * 2.4, Math.sin(a) * 2.4, 1.2, 0.1); }
      for (let i = 0; i < 3; i++) A.part('torus', FPI_C.rope, 0, 0, 0.4 + i * 0.15, 1.35, 1.35, 1.6, 0, Math.PI / 2, 0);
    },
  },
  // a ship's boat on its chocks in the Waist, upturned to the weather, stove in (len, beam)
  gboatc: {
    col: ZG.oak2,
    sol(p) { return [fpiBox(p, 0, 0, p.len / 2, p.beam / 2, 1.5)]; },
    b3(p, A) {
      for (const u of [-p.len * 0.3, p.len * 0.3]) for (const s of [-1, 1]) A.box(ZG.oak3, u, s * p.beam * 0.35, -0.05, 0.3, 0.4, 0.45);
      A.part('half', p.paint || '#3a3a2c', 0, 0, 0.95, p.beam * 0.95, p.len, p.beam * 1.05, 0, 0, -Math.PI / 2);
      A.part('half', '#2a2218', 0, 0, 0.93, p.beam * 0.85, p.len * 0.92, p.beam * 0.95, 0, 0, -Math.PI / 2);
      A.box(ZG.oak3, 0, 0, 0.45, p.len + 0.2, 0.16, 0.14); A.box('#0a0907', p.len * 0.15, -p.beam * 0.38, 0.6, 0.8, 0.06, 0.5, 0.3);
      for (let i = 0; i < 10; i++) A.part('ico', ZG.barn, (A.r() - 0.5) * p.len * 0.8, (A.r() - 0.5) * p.beam * 0.8, 1.4 + A.r() * 0.1, 0.14, 0.08, 0.12);
      for (const u of [-1.2, 0.5]) zgLine(A, FPI_C.rope, u, -p.beam / 2 - 0.2, 0, u, p.beam / 2 + 0.2, 0, 0.04);
    },
  },
  // a grating over a hatch: its coaming and the lattice (only to look at: you walk over it)
  ggrate: {
    noShadow: true, sol() { return []; },
    b3(p, A) { A.box(ZG.oak3, 0, 0, -0.02, p.w + 0.3, p.d + 0.3, 0.12); for (let u = -p.w / 2 + 0.1; u < p.w / 2; u += 0.22) A.box('#2a2016', u, 0, 0.09, 0.08, p.d, 0.05); for (let v = -p.d / 2 + 0.1; v < p.d / 2; v += 0.22) A.box('#3a2c20', 0, v, 0.1, p.w, 0.08, 0.05); },
  },
  // a pin rail along a bulwark: belaying pins, coils of rope hanging off them
  gpins: { noShadow: true, sol() { return []; }, b3(p, A) { A.box(ZG.oak3, 0, 0, 0.95, p.w, 0.2, 0.1); for (let u = -p.w / 2 + 0.2; u < p.w / 2; u += 0.4) { A.cyl(ZG.oak2, u, -0.02, 0.85, 0.03, 0.35, 0, 0, 0, 'cyl6'); if (A.r() < 0.5) A.part('torus', FPI_C.rope, u, -0.1, 0.65, 0.4, 0.55, 0.4, 0, Math.PI / 2, 0); } } },
  // the belfry on the Forecastle Deck: two carved posts, a canopy, the ship's bell, green with age, its rope
  gbelfry: {
    col: ZG.oak3,
    sol(p) { return [fpiCirc(p, -0.95, 0, 0.18, 3.2), fpiCirc(p, 0.95, 0, 0.18, 3.2), fpiCirc(p, 0, 0, 0.45, 2.6, { z0: 1.6 })]; },
    b3(p, A) {
      for (const s of [-1, 1]) { A.box(ZG.oak3, s * 0.95, 0, -0.05, 0.3, 0.3, 3.0); A.part('sph', ZG.gilt, s * 0.95, 0, 3.05, 0.3, 0.3, 0.3); zmvBarV(A, ZG.oak3, s * 0.95, -0.6, 0, 0, 1.0, 0.2, 0.16); zmvBarV(A, ZG.oak3, s * 0.95, 0.6, 0, 0, 1.0, 0.2, 0.16); }
      A.box(ZG.oak2, 0, 0, 2.6, 2.3, 0.35, 0.3); A.part('tri', ZG.red2, 0, 0, 3.15, 2.6, 0.9, 0.8, 0, 0, 0);
      A.part('cone', ZG.bronze, 0, 0, 1.95, 0.9, 0.85, 0.9); A.part('sph', ZG.bronze, 0, 0, 2.35, 0.6, 0.4, 0.6); A.cyl(ZG.bronze, 0, 0, 1.5, 0.47, 0.08, 0, 0, 0, 'cyl8'); A.part('sph', ZG.verd, 0.2, -0.3, 2.0, 0.3, 0.4, 0.06); A.part('sph', '#222', 0, 0, 1.55, 0.15, 0.15, 0.15);
      zgSag(A, FPI_C.rope, 0, 0, 1.6, 0.4, -0.5, 0.6, 0.15, 3, 0.03);
    },
  },
  // the wheel-house over the head of the whipstaff on the Quarterdeck: a little hood, its lamp
  gwheelh: { col: ZG.oak3, sol(p) { return [fpiBox(p, 0, 0, 0.9, 0.7, 2.2)]; }, b3(p, A) { A.box(ZG.red2, 0, 0.1, -0.05, 1.8, 1.2, 2.1); A.box(ZG.gilt, 0, 0.1, 2.0, 2.0, 1.4, 0.1); A.part('half', ZG.red2, 0, 0.1, 2.1, 1.8, 0.4, 1.2, 0, 0, Math.PI / 2); A.box('#120e0a', 0, -0.52, 0.2, 1.2, 0.04, 1.6); A.part('sph', '#ffc070', 0, -0.4, 1.6, 0.2, 0.2, 0.2, 0, 0, 0, 'glow'); zgLine(A, ZG.oak2, 0, -0.3, 0.1, 0.25, -0.45, 1.3, 0.12); } },
});

// ---------- laying her out ----------
FPS_ISLES.galleon = Object.assign({}, FPS_ISLES.light, { name: 'the San Telmo', ground: '#6e6c64', ground2: '#56544c', wet: '#2e3236', path: '#5e5c54', fog: ['#0b0e12', 70, 560], nLights: 8 });
FPI_GEN.galleon = {
  built: true,
  set(H) {
    const { I } = H, OX = FPSC.CX, OY = FPSC.CY, [F0, F1, F2, F3] = ZGL.F, DK = 4.4, RS = ZGL.RS, TD = ZGL.TD;
    const Z = I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    const { W, put, light, lamp, buy, perk, spot } = zmKit(H, Z);
    // ---- the wall: from (x0, y0) to (x1, y1) at any angle. o: hh, lift, th, f (its faces, zgFace), hull (her side:
    // which face is outboard found from where she is, and her faces 'hull' and o.in), rail (a bulwark). opens: { k:
    // 'win' | 'glass' | 'door' | 'debris' | 'gun', at (along the wall's own axis, x or y, as zmKit's), or t (a
    // fraction along it), w, z (the room, or [the two]), cost, shore }
    const gw = (x0, y0, x1, y1, o, opens) => {
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, vx = -uy, vy = ux, ang = Math.atan2(dy, dx);
      const th = o.th || 0.5, hh = o.hh || DK, lift = o.lift || 0, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, cx = clamp(mx, -36, 30);
      // (which way is out of her, along v: the side away from her middle)
      const ob = o.hull || o.rail ? ((mx - cx) * vx + my * vy > 0 ? 1 : -1) : 0, inner = o.in || 'ceil';
      const f = o.f || (o.rail ? (ob < 0 ? ['railo', 'raili'] : ['raili', 'railo']) : o.hull ? (ob < 0 ? ['hull', inner] : [inner, 'hull']) : ['plank', 'plank']);
      const nx = ob * vx, ny = ob * vy, gaps = [];
      for (const op of opens || []) {
        const w = op.w || (op.k === 'win' ? (o.rail ? 1.6 : 1.4) : op.k === 'glass' ? 1.5 : op.k === 'gun' ? 0 : 2.2);
        const s = op.t != null ? op.t * L : Math.abs(ux) > 0.7 ? (op.at - x0) / ux : (op.at - y0) / uy, px = x0 + ux * s, py = y0 + uy * s, [wx, wy] = W(px, py);
        if (op.k === 'gun') {
          put('gport', px, py, ang, { th, ob, lift, hh });
          if (!op.bare) { const gx = px - nx * 1.75, gy = py - ny * 1.75; put('ggun', gx, gy, Math.atan2(nx, -ny), { lift }); }
          continue;
        }
        gaps.push([s - w / 2, s + w / 2]);
        const lc = ZG.oak3, block = (h, z0) => put('block', px, py, ang, Object.assign({ w: w + 0.04, d: th + 0.02, hh: h, col: lc, lift }, z0 ? { z0 } : {}));
        if (op.k === 'door' || op.k === 'debris') {
          if (hh > 2.6) block(hh, 2.5);
          const p = put('zdoor', px, py, ang, { w: w + 0.1, d: th * 0.8, hh: 2.5, lift });
          Z.doors.push({ x: wx, y: wy, z: lift, ang, w, cost: op.cost, zones: op.z, also: op.also, kind: op.k, solids: p.sol.slice(), prop: p, open: false, id: Z.doors.length });
          put('gframe', px, py, ang, { w, th, ob: ob || -1, kind: op.k === 'debris' && o.hull ? 'breach' : 'door', carved: op.carved, hh, lift });
        } else if (op.k === 'win') {
          if (o.rail) { put('block', px, py, ang, { w: w + 0.04, d: th, hh: 0.45, col: lc, lift }); put('gframe', px, py, ang, { w, th, ob, kind: 'rail', hh, lift }); }
          else { block(1.0); if (hh > 2.4) block(hh, 2.35); put('gframe', px, py, ang, { w, th, ob, kind: op.gal ? 'gal' : 'port', hh, lift }); }
          Z.windows.push({ x: wx, y: wy, nx, ny, zone: op.z, z: lift || undefined, boards: 6, id: Z.windows.length, q: [], hw: w / 2, th: th / 2, shore: op.shore || undefined, tw: w < 1.5 || undefined });
        } else if (op.k === 'glass') {
          block(1.0); if (hh > 2.4) block(hh, 2.35);
          put('glasspane', px, py, ang, { w, z0: lift + 1.0, z1: lift + 2.35 });
          (Z.glassQ = Z.glassQ || []).push({ x: wx, y: wy, ang, w: w + 0.02, z0: lift + 1.0, z1: lift + 2.35, frame: true, flat: true });
          put('gframe', px, py, ang, { w, th, ob: ob || -1, kind: 'glass', hh, lift });
        }
      }
      // the lengths of wall between the openings (each end run on by half its thickness, so corners close)
      const cuts = [-th / 2]; for (const [a, b] of gaps.sort((p, q) => p[0] - q[0])) cuts.push(a, b); cuts.push(L + th / 2);
      for (let i = 0; i < cuts.length; i += 2) {
        const a = cuts[i], b = cuts[i + 1], len = b - a; if (len < 0.3) continue;
        const m = (a + b) / 2; put('gwall', x0 + ux * m, y0 + uy * m, ang, { len, th, hh, lift, f, mat: 'wood' });
      }
    };
    // a run of her side along a list of points (each length a gw), its openings by which length they're in
    const side = (pts, o, opens) => { for (let i = 0; i < pts.length - 1; i++) gw(...pts[i], ...pts[i + 1], o, (opens || []).filter(q => (q.seg || 0) === i)); };
    const deckRect = (x0, x1, y0, y1, top, hb) => put('gdeck', (x0 + x1) / 2, (y0 + y1) / 2, 0, { w: x1 - x0, d: y1 - y0, top, hb, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
    // a deck over [x0, x1] x [y0, y1] with a hole in it (h: [x0, x1, y0, y1], or none)
    const deck = (x0, x1, y0, y1, top, hb, h) => {
      if (!h) return deckRect(x0, x1, y0, y1, top, hb);
      deckRect(x0, x1, y0, h[2], top, hb); deckRect(x0, x1, h[3], y1, top, hb); deckRect(x0, h[0], h[2], h[3], top, hb); deckRect(h[1], x1, h[2], h[3], top, hb);
    };
    // a companion stair: from (x, y) along x (dir +1 or -1), w wide, up from base one deck; its gate on the third
    // tread; unseen panes along its sides as far as a jump reaches (as Wrackhaven's); the hole it comes up through
    const stair = (x, y, dir, w, base, cost, zones) => {
      for (let n = 1; n <= 16; n++) put('gstep', x + dir * (n - 0.5) * TD, y, Math.PI / 2, { w, d: TD, hh: n * RS, lift: base || undefined });
      put('gstairs', x, y, dir > 0 ? 0 : Math.PI, { len: 16 * TD, rise: DK, w, lift: base || undefined });
      for (let n = 1; n <= 10; n++) for (const s of [-1, 1]) put('glasspane', x + dir * (n - 0.5) * TD, y + s * (w / 2 + 0.05), 0, { w: TD + 0.02, z0: base, z1: base + n * RS + 1.7 });
      const gx = x + dir * 3 * TD, h = base + 3 * RS, p = put('zdoor', gx, y, Math.PI / 2, { w: w + 0.1, d: 0.16, hh: 2.6, lift: h - 0.3 }), [wx, wy] = W(gx, y);
      Z.doors.push({ x: wx, y: wy, z: h, ang: Math.PI / 2, w, cost, zones, kind: 'gate', solids: p.sol.slice(), prop: p, open: false, id: Z.doors.length });
      return [Math.min(x, x + dir * 16 * TD) - 0.1, Math.max(x, x + dir * 16 * TD) + 0.1, y - w / 2 - 0.1, y + w / 2 + 0.1];
    };
    const HULL = (lift, extra) => Object.assign({ hull: true, lift }, extra || {}), RAIL = lift => ({ rail: true, lift, hh: 1.3 });
    // ================= the Orlop (the ground): the hold and its stores =================
    side([[-44, -8.5], [-30, -11], [22, -11], [34, -8], [40, -4]], HULL(F0), [
      { seg: 1, k: 'win', at: -22, z: 'bread', shore: true }, { seg: 1, k: 'win', at: -9, z: 'hold', shore: true }, { seg: 1, k: 'debris', at: 0, w: 2.6, cost: 750, z: ['strand', 'hold'] }, { seg: 1, k: 'win', at: 13, z: 'hold', shore: true },
      { seg: 2, k: 'win', t: 0.5, z: 'cable', shore: true }]);
    side([[-44, 8.5], [-30, 11], [22, 11], [34, 8], [40, 4]], HULL(F0), [
      { seg: 1, k: 'win', at: -20, z: 'powder' }, { seg: 1, k: 'win', at: -6, z: 'hold' }, { seg: 1, k: 'win', at: 12, z: 'hold' }, { seg: 2, k: 'win', t: 0.5, z: 'cable' }]);
    gw(-44, -8.5, -44, 8.5, HULL(F0)); gw(40, -4, 40, 4, HULL(F0));
    gw(-30, -11, -30, 11, { lift: F0 }, [{ k: 'debris', at: 4.5, cost: 1250, z: ['powder', 'strong'] }]);
    gw(-14, -11, -14, 11, { lift: F0 }, [{ k: 'door', at: -5.5, cost: 1000, z: ['hold', 'bread'] }]);
    gw(-30, 0, -14, 0, { lift: F0 }, [{ k: 'door', at: -22, cost: 750, z: ['bread', 'powder'] }]);
    gw(22, -11, 22, 11, { lift: F0 }, [{ k: 'door', at: -3, cost: 1000, z: ['hold', 'cable'] }]);
    // ================= the Gun Deck =================
    const S1 = stair(8, 3.55, 1, 2.0, F0, 1000, ['hold', 'gundeck']);
    side([[-44, -8.5], [-30, -11], [22, -11], [34, -8], [40, -4]], HULL(F1), [
      { seg: 1, k: 'win', at: -24, z: 'gunroom' }, { seg: 1, k: 'gun', at: -18 }, { seg: 1, k: 'gun', at: -11 }, { seg: 1, k: 'win', at: -5.5, z: 'gundeck' }, { seg: 1, k: 'gun', at: 0 },
      { seg: 1, k: 'win', at: 5.5, z: 'gundeck' }, { seg: 1, k: 'gun', at: 11 }, { seg: 1, k: 'win', at: 16.5, z: 'gundeck' }, { seg: 2, k: 'win', t: 0.5, z: 'sick' }]);
    side([[-44, 8.5], [-30, 11], [22, 11], [34, 8], [40, 4]], HULL(F1), [
      { seg: 1, k: 'gun', at: -26.5 }, { seg: 1, k: 'win', at: -17.5, z: 'gunroom' }, { seg: 1, k: 'win', at: -11, z: 'gundeck' }, { seg: 1, k: 'gun', at: -5.5 }, { seg: 1, k: 'win', at: 0, z: 'gundeck' },
      { seg: 1, k: 'gun', at: 5.5 }, { seg: 1, k: 'win', at: 11, z: 'gundeck' }, { seg: 1, k: 'gun', at: 16.5, bare: true }, { seg: 2, k: 'win', t: 0.5, z: 'sick' }]);
    gw(-44, -8.5, -44, 8.5, HULL(F1, { in: 'plank' }), [{ k: 'win', at: -4, z: 'chapel', gal: true }, { k: 'win', at: 4, z: 'chapel', gal: true }]);
    gw(40, -4, 40, 4, HULL(F1));
    gw(-30, -11, -30, 11, { lift: F1 }, [{ k: 'door', at: 0, cost: 750, z: ['gunroom', 'chapel'] }]);
    gw(-14, -11, -14, 11, { lift: F1 }, [{ k: 'door', at: -4, cost: 1000, z: ['gundeck', 'gunroom'] }]);
    gw(22, -11, 22, 11, { lift: F1 }, [{ k: 'door', at: 2, cost: 1000, z: ['gundeck', 'sick'] }]);
    deck(-44, 22, -11, 11, F1, 'lo', S1); deck(22, 34, -11, 11, F1, 'lo'); deck(34, 40, -8, 8, F1, 'lo');
    // ================= the Upper Deck: the Waist, the Steerage and the Great Cabin aft, the Forecastle =================
    const S2 = stair(0, -3.0, 1, 3.0, F1, 1250, ['gundeck', 'waist']);
    side([[-44, -11], [-14, -11]], HULL(F2, { in: 'pan' }), [{ k: 'glass', at: -38.5 }, { k: 'win', at: -21, z: 'steer' }]);
    side([[-44, 11], [-14, 11]], HULL(F2, { in: 'pan' }), [{ k: 'glass', at: -38.5 }, { k: 'win', at: -21, z: 'steer' }]);
    gw(-14, -11, 22, -11, RAIL(F2), [{ k: 'win', at: -8, z: 'waist' }, { k: 'win', at: 3, z: 'waist' }, { k: 'win', at: 15, z: 'waist' }]);
    gw(-14, 11, 22, 11, RAIL(F2), [{ k: 'win', at: -2, z: 'waist' }, { k: 'win', at: 14, z: 'waist' }]);
    side([[22, -11], [36, -8.5], [42, -4]], HULL(F2, { in: 'plank' }), [{ seg: 0, k: 'win', t: 0.55, z: 'fcastle' }]);
    side([[22, 11], [36, 8.5], [42, 4]], HULL(F2, { in: 'plank' }), [{ seg: 0, k: 'win', t: 0.55, z: 'fcastle' }]);
    gw(42, -4, 42, 4, HULL(F2, { in: 'plank' }));
    gw(-44, -11, -44, 11, HULL(F2, { in: 'pan' }), [{ k: 'win', at: -7.5, z: 'cabin', gal: true }, { k: 'glass', at: -3.6 }, { k: 'glass', at: 0 }, { k: 'glass', at: 3.6 }, { k: 'win', at: 7.5, z: 'cabin', gal: true }]);
    gw(-14, -11, -14, 11, { lift: F2, f: ['plank', 'pan'] }, [{ k: 'door', at: 3, cost: 1000, z: ['waist', 'steer'], carved: true }]);
    gw(-28, -11, -28, 11, { lift: F2, f: ['pan', 'pan'] }, [{ k: 'door', at: 0, cost: 1250, z: ['steer', 'cabin'], carved: true }]);
    gw(22, -11, 22, 11, { lift: F2 }, [{ k: 'door', at: -3, cost: 1000, z: ['waist', 'fcastle'], carved: true }]);
    deck(-44, 22, -11, 11, F2, 'up', S2); deck(22, 36, -11, 11, F2, 'up'); deck(36, 42, -8.5, 8.5, F2, 'up');
    // ================= the Quarterdeck and the Forecastle Deck =================
    const S4 = stair(-30.5, 8.0, -1, 2.0, F2, 1500, ['cabin', 'qdeck']), S3 = stair(26, 6.0, 1, 2.0, F2, 1250, ['fcastle', 'fcdeck']);
    const QR = { rail: true, lift: F3, hh: 1.25 };
    gw(-46, -11, -14, -11, QR, [{ k: 'win', at: -24, z: 'qdeck' }]); gw(-46, 11, -14, 11, QR, [{ k: 'win', at: -33, z: 'qdeck' }]);
    gw(-46, -11, -46, 11, QR); gw(-14, -11, -14, 11, { lift: F3, hh: 1.15, f: ['raili', 'raili'] });
    side([[22, -11], [36, -8.5], [42, -4]], QR, [{ seg: 0, k: 'win', t: 0.6, z: 'fcdeck' }]); side([[22, 11], [36, 8.5], [42, 4]], QR, [{ seg: 0, k: 'win', t: 0.4, z: 'fcdeck' }]);
    gw(42, -4, 42, 4, QR); gw(22, -11, 22, 11, { lift: F3, hh: 1.15, f: ['raili', 'raili'] });
    deck(-46, -14, -11, 11, F3, 'q', S4); deck(22, 36, -11, 11, F3, 'up', S3); deck(36, 42, -8.5, 8.5, F3, 'up');
    // ---- the masts, and the stays between them; her outside
    const MASTS = [
      { x: -24, r: 0.55, h: 27, h2: 34, decks: [F1, F2, F3], yards: [], lateen: [-8, 17, 7, 31], chan: [-26.5, -22, F3 + 0.6, 12.0] },
      { x: -4, r: 0.85, h: 36, h2: 52, decks: [F1, F2], yards: [[33.5, 30, 0.7, 17], [47, 21, 0.55, 37]], chan: [-7, -1, F2 + 1.6, 12.2] },
      { x: 15, r: 0.75, h: 32, h2: 46, decks: [F1, F2], yards: [[29.5, 26, 0.4, 17], [42, 18, 0.6, 33]], chan: [12.5, 17.5, F2 + 1.6, 12.2] },
    ];
    for (const m of MASTS) put('gmast', m.x, 0, 0, m);
    put('gship', 0, 0, 0, { mt: MASTS.map(m => [m.x, m.h, m.h2]) });
    // the three great stern lanterns over the taffrail, their lights
    for (const [y, s, z] of [[-6, 1.0, 16.2], [0, 1.35, 17.6], [6, 1.0, 16.2]]) { put('glantern', -47.3, y, 0, { s, z }); light(-47.3, y, z, '#ffc870', 16, 'lantern'); }
    // ---- the Strand: the shingle under her side, the sea, the boat that brought you
    {
      Z.bay = true; Z.decks = [];
      put('seaguard', 0, -40.3, 0, { w: 124, d: 31.8 });
      const seaWin = (x, y) => { const [wx, wy] = W(x, y); Z.windows.push({ x: wx, y: wy, nx: 0, ny: -1, zone: 'strand', z: 0, boards: 0, sea: true, id: Z.windows.length, q: [], hw: 0.9, th: 0.1 }); };
      for (const x of [-38, -22, -7, 9, 24, 38]) seaWin(x, -24);
      put('rowboat', 3.5, -25.6, 0.25, { paint: '#3a3a2c', rope: 0.4 });
      buy('pepperbox', 250, -5, -11.55, 0, -1);
      for (const [x, y] of [[-14, -14], [14, -14.5], [-32, -15.5], [30, -16]]) fpiLanternPost(H, OX + x, OY + y, x < 0 ? 0 : Math.PI);
      put('anchor', -18, -19.5, 0.6, {}); put('anchor', 34.5, -20, 2.2, {});
      for (const [x, y, a] of [[-27, -21, 0.4], [19, -21.5, -0.3], [44, -14, 1.2]]) put('log', x, y, a, { len: 4 + Math.abs(x) % 3, rad: 0.25 });
      put('barrels', -12.8, -18, 0, { items: [{ u: 0, v: 0, r: 0.4, hh: 1.0, lie: true, ry: 0.5 }, { u: 0.9, v: 0.5, r: 0.38, hh: 0.95 }] });
      put('gcable', 7.5, -15, 0, { r: 0.9 });
      for (const [x, y, w, hh, gl] of [[-48, -19, 2.6, 1.6, 1], [48, -17, 2.8, 2.0, 0], [-40, -27.5, 2.0, 1.2, 1], [42, -26, 2.4, 1.4, 0], [10, -31, 1.8, 0.9, 1]]) put('gullrock', x, y, w * 1.7, { w, d: w * 0.8, hh, gull: !!gl });
    }
    // the rocks on her port side, where they come round to her
    { const rr = seeded(0x5e1a);
      for (let i = 0; i < 26; i++) { const x = -54 + rr() * 108, y = 16 + rr() * 12; if (Math.hypot(x, y) > FPSC.R - 6) continue; put('stone', x, y, rr() * 6.28, { w: 1.0 + rr() * 1.6, d: 0.8 + rr(), hh: 0.6 + rr() * 1.8, lean: (rr() - 0.5) * 0.4 }); }
      for (let i = 0; i < 18; i++) { const a = rr() * 6.28, d = 56 + rr() * 22, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9; if (Math.hypot(x, y) < FPSC.R - 6 && y > ZM_SHORE(x) + 2) put('stone', x, y, rr() * 6.28, { w: 1.5 + rr() * 2, d: 1 + rr(), hh: 1 + rr() * 2.5, lean: (rr() - 0.5) * 0.3 }); }
    }
    // ================= the rooms =================
    const L1 = F1 - 0.75, L2 = F2 - 0.75, L3 = F3 - 0.75;   // (where a lamp hangs from, under each deck's beams)
    // ---- the Main Hold: ballast, casks, the pumps by the mainmast's foot, sea water in the bilge
    put('gpump', -4, 2.0, 0, {}); put('gballast', -10, -6, 0, { r: 1.6 }); put('gballast', 4, 6.8, 0, { r: 1.4 }); put('gballast', 18.5, -7.5, 0, { r: 1.2 });
    put('gpool', -1, -6.8, 0.2, { w: 5, d: 2.6 }); put('gpool', 10, -2, 0, { w: 3.5, d: 2 }); put('gpool', 17, 6, 0, { w: 2.4, d: 1.6 });
    put('barrels', -11.5, 8.5, 0, { items: [{ u: 0, v: 0, r: 0.5, hh: 1.2 }, { u: 1.05, v: 0.1, r: 0.5, hh: 1.2 }, { u: 0.5, v: -0.85, r: 0.5, hh: 1.2 }, { u: 2.3, v: -0.3, r: 0.5, hh: 1.3, lie: true, ry: 0.3 }] });
    put('barrels', 19.5, 9.5, 0, { items: [{ u: 0, v: 0, r: 0.5, hh: 1.2 }, { u: -1.05, v: 0, r: 0.5, hh: 1.2 }] });
    put('crates', 5, -9.3, 0.1, { items: [{ u: 0, v: 0, s: 1.0, h0: 0, ry: 0.1 }, { u: 1.1, v: 0, s: 0.9, h0: 0, ry: -0.1 }, { u: 0.5, v: 0, s: 0.8, h0: 1.0, ry: 0.3 }] });
    put('gweed', 2, 0, 0, { w: 30, d: 18, z: L1 + 0.4, n: 50 });
    put('sacks', 14.5, -9.6, 0.1, { c: '#4a4a36' });
    lamp(-8, 0, 2.7, '#ffb860', L1); lamp(5, -4, 2.7, '#ffb860', L1); lamp(17, 1, 2.7, '#ffb860', L1); lamp(-1, 7, 2.7, '#ffb860', L1);
    buy('cutlass', 750, -13.7, 1, 1, 0); buy('longarm', 500, 4, 10.7, 0, -1);
    perk('wind', -13.3, 6.5, Math.PI / 2);
    spot(-9.5, 10.3, 0, -1, 0, 'hold');
    // ---- the Bread Room, the Powder Room and the light room's window, the Strong Room and the pay chest
    put('gsacks', -26, -1.3, 0, { w: 7 }); put('gbins', -24.9, -10.25, 0, { w: 2.6 }); put('gbins', -18.2, -10.25, 0, { w: 3.0 }); put('barrels', -16, -8.5, 0, { items: [{ u: 0, v: 0, r: 0.45, hh: 1.1 }, { u: 0, v: -1, r: 0.45, hh: 1.1 }] });
    lamp(-22, -5.5, 2.7, '#ffb860', L1);
    buy('harpoon', 1000, -29.7, -5.5, 1, 0);
    spot(-27, -10.3, 0, 1, 0, 'bread');
    put('gkegs', -25.2, 10.2, 0, { w: 4 }); put('gkegs', -29.2, 7.8, Math.PI / 2, { w: 3 }); put('glightbox', -14.25, 6, -Math.PI / 2, {}); light(-13.6, 6, 2.0, '#ffc070', 8, 'lantern');
    perk('quick', -17.5, 0.7, Math.PI);
    put('ggrille', -37, 0, Math.PI / 2, { w: 15, hh: 3.75, gate: 3.5 });
    put('gpaychest', -40.5, 0, -Math.PI / 2, {}); put('gchest', -41.5, -4.5, Math.PI / 2, { c: '#3a2a1e' }); put('gchest', -41.5, 4, Math.PI / 2, { c: '#3a2a1e' });
    lamp(-40, 0, 2.6, '#ffc070', L1); lamp(-33, -4, 2.7, '#ffb860', L1);
    spot(-30.75, -6, -1, 0, 0, 'strong');
    // ---- the Cable Tier: the coils, the riding bitts
    put('gcable', 27, -5, 0, { r: 1.6 }); put('gcable', 27.5, 5, 0, { r: 1.5 }); put('gcable', 34.5, 0, 0, { r: 1.3 }); put('gbitts', 31, 0, Math.PI / 2, {});
    lamp(30, -2, 2.6, '#ffb860', L1);
    buy('harpoon', 1000, 22.3, 6, 1, 0);
    // ---- the Gun Deck: the guns at their ports (laid by gw), hammocks, shot, mess tables
    for (const x of [-9, -3, 3, 15, 20]) for (const y of [-6, 6]) if (!(y > 0 && x > 6 && x < 19)) put('ghammock', x, y, Math.PI / 2, { z: 3.0, lo: 0.5, lift: F1 });
    for (const [x, y] of [[-9, -8.2], [3, 8.2], [-3, 8.2]]) put('gmess', x, y, 0, { w: 2.4, top: 3.4, lift: F1 });
    for (const [x, y] of [[-12, -1], [20, -8.5], [-12.5, 8]]) put('gchest', x, y, Math.PI / 2, { lift: F1 });
    lamp(-7, -4, F1 + 2.8, '#ffb860', L2); lamp(5, 3, F1 + 2.8, '#ffb860', L2); lamp(16, -3, F1 + 2.8, '#ffb860', L2); lamp(-7, 5, F1 + 2.8, '#ffb860', L2);
    buy('blunderbuss', 500, -13.7, 5.5, 1, 0, F1);
    perk('stout', 21.3, -7, -Math.PI / 2, F1);
    // ---- the Gunroom: the officers' table, the Lampwright's Bench
    put('gmess', -23, -2, 0, { w: 4.2, top: 3.4, lift: F1 }); for (const [x, y, a] of [[-24.5, -3, 0], [-21.5, -3, 0], [-24.5, -1, Math.PI], [-21.5, -1, Math.PI]]) put('gchair', x, y, a, { lift: F1 });
    put('gchest', -29, -8, Math.PI / 2, { lift: F1 }); put('shelf', -15, -9, -Math.PI / 2, { w: 2.2, goods: 'jars', lift: F1 });
    lamp(-23, -2, F1 + 2.8, '#ffc070', L2); lamp(-18, 5, F1 + 2.8, '#ffb860', L2);
    if (typeof zmpPlace === 'function') zmpPlace(put, light, W, Z, { x: -22, y: 10.25, z: F1, nx: 0, ny: -1, zone: 'gunroom' });   // [pap] in the Gunroom
    // ---- the Chaplain's Berth: the altar between the gallery windows, the organ, benches
    put('galtar', -42.5, 0, Math.PI / 2, { lift: F1 }); put('rug', -37, 0, Math.PI / 2, { w: 9, d: 2.2, c: '#5a2a24', lift: F1 });
    put('gorgan', -33, 6.8, Math.PI, { lift: F1 }); for (const x of [-38, -35.5, -33]) for (const s of [-1, 1]) put('bench', x, s * 3, Math.PI / 2, { w: 2.6, lift: F1 });
    put('picture', -30.3, -5, -Math.PI / 2, { z: 1.7, w: 1.2, h: 1.6, c: '#8a6a40', lift: F1 });
    lamp(-41, 0, F1 + 2.9, '#ffd890', L2); lamp(-35, 0, F1 + 2.8, '#ffc070', L2); light(-42.0, 0, F1 + 1.6, '#ffd890', 5, 'lantern');
    // ---- the Surgeon's Cockpit
    put('gsurg', 29, 0, 0, { lift: F1 }); put('gcot', 26, -6.5, 0, { z: 1.3, top: 3.6, lift: F1 }); put('gcot', 26, 6.6, 0, { z: 1.3, top: 3.6, lift: F1 }); put('gcot', 33.5, -4.8, 0.5, { z: 1.4, top: 3.6, lift: F1 });
    put('shelf', 22.55, -4.3, Math.PI / 2, { w: 2.2, goods: 'jars', lift: F1 });
    lamp(29, 0, F1 + 2.4, '#ffd890', L2); lamp(34, 2, F1 + 2.8, '#ffb860', L2);
    spot(22.75, 6.5, 1, 0, F1, 'sick');
    // ---- the Waist: the masts, the capstan, the boats, the gratings, the pin rails
    put('gcapstan', -10, 2.5, 0, { lift: F2 }); put('gboatc', 6.5, 6.2, 0, { len: 7, beam: 2.3, lift: F2 }); put('gboatc', 19.6, -6.4, 0.04, { len: 4.5, beam: 1.6, paint: '#2e3a2e', lift: F2 });
    put('ggrate', -9.5, -5.5, 0, { w: 3, d: 2.4, lift: F2 }); put('ggrate', 11.5, -3.5, 0, { w: 2.4, d: 2.4, lift: F2 });
    for (const [x, y, a] of [[-10, -10.75, 0], [10, -10.75, 0], [-7, 10.75, Math.PI], [7, 10.75, Math.PI]]) put('gpins', x, y, a, { w: 3.5, lift: F2 });
    put('gcable', 17.5, 3.5, 0, { r: 0.8, lift: F2 }); put('barrels', -12.5, -9.2, 0, { items: [{ u: 0, v: 0, r: 0.4, hh: 1.0 }, { u: 0.85, v: 0, r: 0.4, hh: 1.0 }], lift: F2 });
    light(-13, -8.6, F2 + 2.2, '#ffc070', 10, 'lantern'); put('wlamp', -13, -10.7, Math.PI, { z: 2.0, lift: F2 });
    light(2, -8, F2 + 2.2, '#ffc070', 10, 'lantern'); put('wlamp', 2, -10.7, Math.PI, { z: 2.0, lift: F2 }); light(-2, 9.2, F2 + 2.2, '#ffc070', 10, 'lantern'); put('wlamp', -2, 10.6, 0, { z: 2.0, lift: F2 });
    buy('avtomat', 1200, -13.7, -6, 1, 0, F2);
    perk('fleet', 21.3, 6.5, -Math.PI / 2, F2);
    spot(18, -10.3, 0, 1, F2, 'waist');
    // ---- the Steerage: the whipstaff, the binnacle, the glasses
    put('gwhip', -19, 0, 0, { lift: F2 }); put('gbinn', -16.5, 0, Math.PI / 2, { lift: F2 }); put('ghour', -14.3, -5, -Math.PI / 2, { lift: F2 });
    put('table', -25, -8, 0, { w: 2.2, d: 1.0, lift: F2 }); put('gchair', -25, -7, Math.PI, { lift: F2 }); put('picture', -25, -10.7, 0, { z: 1.8, w: 1.6, h: 1.0, c: '#b8a878', sea: true, lift: F2 });
    lamp(-20, -4, F2 + 2.9, '#ffc070', L3); lamp(-21, 5, F2 + 2.9, '#ffc070', L3);
    buy('longarm', 500, -27.7, 6, -1, 0, F2);
    // ---- the Great Cabin: the captain's table, the chairs, the stern windows
    put('gctable', -37, -2, 0, { w: 4.6, d: 1.6, lift: F2 }); put('rug', -37, -2, 0, { w: 7, d: 4.4, c: '#4a2030', lift: F2 });
    put('gchair', -40, -2, -Math.PI / 2, { tall: true, lift: F2 }); for (const x of [-38, -36, -34]) { put('gchair', x, -3.3, 0, { lift: F2 }); put('gchair', x, -0.7, Math.PI, { lift: F2 }); }
    put('globe', -42.5, -9.2, 0, { lift: F2 }); put('gchest', -30, -9.8, 0, { c: '#4a2a1e', lift: F2 }); put('shelf', -33, -10.4, 0, { w: 2.4, goods: 'books', lift: F2 });
    lamp(-37, -2, F2 + 2.9, '#ffd890', L3); lamp(-33, 4, F2 + 2.9, '#ffc070', L3); lamp(-42, 6, F2 + 2.9, '#ffc070', L3);
    // ---- the Forecastle: the crew's mess, hammocks, the galley hearth
    put('ghearth', 37.2, -3.6, Math.PI / 2, { top: 4.4, lift: F2 }); light(36.0, -3.6, F2 + 0.6, '#ff8a30', 8, 'fire');
    put('gmess', 28, -5, 0, { w: 3, top: 3.5, lift: F2 }); put('bench', 28, -6, 0, { w: 2.8, lift: F2 }); put('bench', 28, -4, 0, { w: 2.8, lift: F2 });
    for (const [x, y] of [[25, -2], [31, -2.2], [33, -6.5]]) put('ghammock', x, y, 0, { z: 3.0, lo: 0.5, lift: F2 });
    put('barrels', 38.8, 2.2, 0, { items: [{ u: 0, v: 0, r: 0.45, hh: 1.1 }], lift: F2 }); put('gchest', 24.5, -9.0, 0.3, { lift: F2 });
    put('log', 39, 0, 0, { len: 3.2, rad: 0.5, lift: F2 + 3.2 });
    lamp(28, -3, F2 + 2.8, '#ffb860', L3); lamp(34, 3, F2 + 2.8, '#ffb860', L3);
    buy('blunderbuss', 500, 22.3, 2.5, 1, 0, F2);
    perk('grog', 22.7, -7.2, Math.PI / 2, F2);
    // ---- the Quarterdeck: the mizzen, the wheel-house, the stern lanterns (above), a chest high up
    put('gwheelh', -18.5, 0, Math.PI / 2, { lift: F3 }); light(-17.7, 0, F3 + 1.6, '#ffc070', 7, 'lantern');
    put('ggrate', -28, -5, 0, { w: 3, d: 2, lift: F3 }); for (const [x, y, a] of [[-35, -10.75, 0], [-22, 10.75, Math.PI]]) put('gpins', x, y, a, { w: 3.5, lift: F3 });
    for (const [x, y, a] of [[-42, -8.5, Math.PI], [-42, 8.5, 0]]) put('ggun', x, y, a + Math.PI / 2, { lift: F3, raise: 0.1, bare: true });
    put('wlamp', -30, -10.7, Math.PI, { z: 1.6, lift: F3 }); light(-30, -10.3, F3 + 1.7, '#ffc070', 9, 'lantern');
    spot(-20, -10.3, 0, 1, F3, 'qdeck');
    // ---- the Forecastle Deck: the belfry and the ship's bell, the bow chasers
    put('gbelfry', 24.5, 0, 0, { lift: F3 }); put('wlamp', 24.5, 0.4, 0, { z: 2.2, lift: F3 }); light(24.5, 0.8, F3 + 2.2, '#ffc070', 9, 'lantern');
    for (const y of [-2.2, 2.2]) put('ggun', 39.5, y, -Math.PI / 2, { lift: F3, raise: 0.35, bare: true });
    put('gcable', 32, -5.5, 0, { r: 0.8, lift: F3 });
    // ---- the hole round each stair's head: a rail on the deck above (only to look at)
    for (const [h, top] of [[S1, F1], [S2, F2], [S3, F3], [S4, F3]]) {
      const [x0, x1, y0, y1] = h;
      for (const y of [y0, y1]) put('vbanister', x0, y, -Math.PI / 2, { len: x1 - x0, rise: 0, base: top });
    }
    // ---- out of bounds for you (the drowned walk and climb where they like): her far side, round her ends, out
    // over her rails on the upper decks, and the sea; the Strand is yours, between her and the water
    Z.keep = [[-99, 99, 11.3, 99, -99, 999], [-99, -46.3, -99, 99, -99, 999], [44.3, 99, -99, 99, -99, 999], [-99, 99, -99, -11.3, 2.5, 999],
      [40.3, 44.3, -11.25, 99, -99, 8], [-99, -44.3, -11.25, 99, -99, 8], [-99, -50, -99, 99, -99, 999], [50, 99, -99, 99, -99, 999]]
      .map(([x0, x1, y0, y1, z0, z1]) => ({ b: [OX + x0, OX + x1, OY + y0, OY + y1], z0, z1 }));
    Z.glass = (Z.glassQ || []).slice();
  },
  decor(H) {
    const { I } = H, OX = FPSC.CX, OY = FPSC.CY, rr = seeded(0x7e1d);
    // shingle on the Strand, wrack along the tideline, stones round her on the far side
    for (let i = 0; i < 420; i++) {
      const x = (rr() - 0.5) * 100, y = -11.6 - rr() * 13; if (y < ZM_SHORE(x) + 0.3) continue;
      H.decor('pebble', OX + x, OY + y, { s: 0.08 + rr() * 0.22 });
    }
    for (let i = 0; i < 90; i++) { const x = (rr() - 0.5) * 100, y = ZM_SHORE(x) + 0.4 + rr() * 1.8; H.decor('wrack', OX + x, OY + y, { s: 0.5 + rr(), ang: rr() * 0.6 - 0.3 }); }
    for (let i = 0; i < 160; i++) { const x = (rr() - 0.5) * 110, y = 12 + rr() * 30; if (Math.hypot(x, y) > FPSC.R - 4) continue; H.decor(rr() < 0.7 ? 'pebble' : 'wetstone', OX + x, OY + y, { s: 0.15 + rr() * 0.4 }); }
  },
};
