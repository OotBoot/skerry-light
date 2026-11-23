'use strict';
// Skerry Chess: the rules and the bots. A twelfth game, on its own card on the title screen (id chTitle). This file has
// no screen of its own: src/chessui.js draws the board and runs the game, src/chnet.js plays it online.
//
// Two sets of rules (CH_VARIANTS):
//  - std, standard chess, every rule of it: castling (not out of, through or into check), en passant, promotion to any
//    piece, check, checkmate and stalemate, and the draws: threefold repetition, the fifty-move rule (a hundred plies
//    with no capture or pawn move) and insufficient material (a dead position: king against king, king and bishop or
//    knight against king, or kings and bishops all on squares of one colour). The draws are applied automatically.
//  - sk, Skerry rules: the same game on a reef. Four rocks (the skerries) stand at c4, f4, c5 and f5: nothing may stand
//    on them or pass through them, though the gannets (knights) fly over as ever. The four centre squares, d4, e4, d5
//    and e5, are the Light: a keeper (king) that ends its move on one of them wins outright. Since a lone keeper can
//    always try for the Light, there are no draws for insufficient material; repetition and the fifty moves stand.
//    And the pieces are the Skerries' own, each with a move or a power of its own (CH_SK_PIECES; drawn in
//    src/chessui.js). They use the same numbers on the board as the standard pieces they stand in for:
//      1 hand (pawn's place): one step forward, or one step sideways onto an empty square; takes one step diagonally
//        forward. No double step, so no en passant. Promotes on the far rank to a lantern, tower, cutter or gannet.
//      2 gannet (knight's place): dives, leaping exactly three squares in a straight line or a diagonal over anything
//        (rocks too), or takes one step straight; takes where it lands.
//      3 cutter (bishop's place): sails any distance diagonally, or tacks one step straight, so it can change colour.
//      4 tower (rook's place): a lighthouse. It walks one step in any direction, never onto a piece, and takes with its
//        beam: the first enemy piece along a straight line (rank or file), at any distance, without moving. Rocks and
//        pieces block the beam.
//      5 lantern (queen's place): sails any distance diagonally, or leaps as a knight does.
//      6 keeper (king's place): one step in any direction, or swaps places with one of its own hands next to it (the
//        hand may not land on its own far rank). No castling. Reaching the Light wins.
//
// The board: an Int8Array of 64, square = rank * 8 + file (a1 = 0, h1 = 7, a8 = 56). Pieces: 1 pawn, 2 knight,
// 3 bishop, 4 rook, 5 queen, 6 king; white positive, black negative. Side to move: 1 white, -1 black. Castling rights
// as bits (standard chess only): 1 white king's side, 2 white queen's side, 4 black king's side, 8 black queen's side. ep: the square a pawn
// just skipped over, or -1. A move: { f, t, pc, cap, pr, k } (from, to, the piece, what it takes, what it becomes,
// and its kind: 0 plain, 1 double step, 2 en passant, 3 castles short, 4 castles long, and under Skerry rules 5 a
// tower's beam, which takes on t while the tower stays on f, and 6 the keeper's swap with its own hand on t). Moves go over the wire in UCI
// form ("e2e4", "e7e8q").
//
// The bots (chBot): a negamax search with alpha-beta, quiescence on captures, MVV-LVA ordering and killer moves,
// iterative deepening under a time limit, a Zobrist hash for repetition inside the search, and an evaluation from
// material and piece-square tables (and, under Skerry rules, how near each keeper is to the Light). Three of them:
// Easy (a shallow look with a lot of noise and the odd careless move), Fair (three plies, a little noise) and Hard
// (as deep as it gets in about two seconds).
// Debug and tests: chPerft(pos, depth) counts the leaf positions (the standard perft numbers check the rules).

const CH_VARIANTS = { std: { id: 'std', name: 'Standard chess' }, sk: { id: 'sk', name: 'Skerry rules' } };
const CH_ROCKS = [26, 29, 34, 37];          // c4 f4 c5 f5
const CH_LIGHT = [27, 28, 35, 36];          // d4 e4 d5 e5
const CH_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const CH_START_SK = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
const CH_VAL = [0, 100, 320, 330, 500, 900, 0];
const CH_VALS = { std: CH_VAL, sk: [0, 100, 290, 400, 470, 820, 0] };
const CH_LET = ' PNBRQK';
const CH_LETS = { std: CH_LET, sk: ' HGCTLK' };
const chFile = s => s & 7, chRank = s => s >> 3;
const chSqName = s => 'abcdefgh'[s & 7] + (1 + (s >> 3));
const chSqOf = n => (typeof n === 'string' && /^[a-h][1-8]$/.test(n)) ? (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 8 : -1;

// ---------- tables made once ----------
const CHT = (() => {
  const on = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const kn = [], kg = [], rays = [], gn = [], wz = [];
  const KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]], KG = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  // rays 0-3 straight (rook), 4-7 diagonal (bishop)
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let s = 0; s < 64; s++) {
    const f = s & 7, r = s >> 3;
    kn[s] = KN.filter(([a, b]) => on(f + a, r + b)).map(([a, b]) => s + a + b * 8);
    kg[s] = KG.filter(([a, b]) => on(f + a, r + b)).map(([a, b]) => s + a + b * 8);
    wz[s] = DIRS.slice(0, 4).filter(([a, b]) => on(f + a, r + b)).map(([a, b]) => s + a + b * 8);
    gn[s] = DIRS.filter(([a, b]) => on(f + 3 * a, r + 3 * b)).map(([a, b]) => s + 3 * a + 3 * b * 8);
    rays[s] = DIRS.map(([a, b]) => { const out = []; let x = f + a, y = r + b; while (on(x, y)) { out.push(x + y * 8); x += a; y += b; } return out; });
  }
  // Zobrist keys (32-bit), from a fixed seed so every screen agrees
  let seed = 0x2545F491; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  const zp = []; for (let p = 0; p < 13; p++) { zp[p] = new Uint32Array(64); for (let s = 0; s < 64; s++) zp[p][s] = rnd(); }
  const zc = new Uint32Array(16); for (let i = 0; i < 16; i++) zc[i] = rnd();
  const ze = new Uint32Array(8); for (let i = 0; i < 8; i++) ze[i] = rnd();
  const zs = rnd();
  // piece-square tables, from white's side, a8 first (as they're usually written), turned to a1-first here
  const T = s => { const a = s.trim().split(/\s+/).map(Number), o = new Int16Array(64); for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) o[(7 - r) * 8 + f] = a[r * 8 + f]; return o; };
  const pst = [null,
    T(`0 0 0 0 0 0 0 0  50 50 50 50 50 50 50 50  10 10 20 30 30 20 10 10  5 5 10 25 25 10 5 5  0 0 0 20 20 0 0 0  5 -5 -10 0 0 -10 -5 5  5 10 10 -20 -20 10 10 5  0 0 0 0 0 0 0 0`),
    T(`-50 -40 -30 -30 -30 -30 -40 -50  -40 -20 0 0 0 0 -20 -40  -30 0 10 15 15 10 0 -30  -30 5 15 20 20 15 5 -30  -30 0 15 20 20 15 0 -30  -30 5 10 15 15 10 5 -30  -40 -20 0 5 5 0 -20 -40  -50 -40 -30 -30 -30 -30 -40 -50`),
    T(`-20 -10 -10 -10 -10 -10 -10 -20  -10 0 0 0 0 0 0 -10  -10 0 5 10 10 5 0 -10  -10 5 5 10 10 5 5 -10  -10 0 10 10 10 10 0 -10  -10 10 10 10 10 10 10 -10  -10 5 0 0 0 0 5 -10  -20 -10 -10 -10 -10 -10 -10 -20`),
    T(`0 0 0 0 0 0 0 0  5 10 10 10 10 10 10 5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  0 0 0 5 5 0 0 0`),
    T(`-20 -10 -10 -5 -5 -10 -10 -20  -10 0 0 0 0 0 0 -10  -10 0 5 5 5 5 0 -10  -5 0 5 5 5 5 0 -5  0 0 5 5 5 5 0 -5  -10 5 5 5 5 5 0 -10  -10 0 5 0 0 0 0 -10  -20 -10 -10 -5 -5 -10 -10 -20`),
    T(`-30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -20 -30 -30 -40 -40 -30 -30 -20  -10 -20 -20 -20 -20 -20 -20 -10  20 20 0 0 0 0 20 20  20 30 10 0 0 10 30 20`),
  ];
  const kend = T(`-50 -40 -30 -20 -20 -30 -40 -50  -30 -20 -10 0 0 -10 -20 -30  -30 -10 20 30 30 20 -10 -30  -30 -10 30 40 40 30 -10 -30  -30 -10 30 40 40 30 -10 -30  -30 -10 20 30 30 20 -10 -30  -30 -30 0 0 0 0 -30 -30  -50 -30 -30 -30 -30 -30 -30 -50`);
  // how far each square is from the Light, in king steps
  const ldist = new Int8Array(64); for (let s = 0; s < 64; s++) ldist[s] = Math.min(...CH_LIGHT.map(l => Math.max(Math.abs((l & 7) - (s & 7)), Math.abs((l >> 3) - (s >> 3)))));
  return { kn, kg, rays, gn, wz, zp, zc, ze, zs, pst, kend, ldist };
})();

// ---------- positions ----------
function chNew(variant, fen) {
  const P = { b: new Int8Array(64), side: 1, cas: 0, ep: -1, half: 0, full: 1, v: variant === 'sk' ? 'sk' : 'std', rock: new Uint8Array(64), light: new Uint8Array(64), ks: { 1: -1, '-1': -1 }, z: 0, hist: [] };
  if (P.v === 'sk') { for (const s of CH_ROCKS) P.rock[s] = 1; for (const s of CH_LIGHT) P.light[s] = 1; }
  chLoadFen(P, fen || (P.v === 'sk' ? CH_START_SK : CH_START));
  return P;
}
function chLoadFen(P, fen) {
  const [bd, sd, cs, ep, hm, fm] = fen.split(' ');
  P.b.fill(0); let r = 7, f = 0;
  for (const c of bd) {
    if (c === '/') { r--; f = 0; continue; }
    if (/\d/.test(c)) { f += +c; continue; }
    const t = 'pnbrqk'.indexOf(c.toLowerCase()) + 1; P.b[r * 8 + f] = c === c.toUpperCase() ? t : -t; f++;
  }
  P.side = sd === 'b' ? -1 : 1;
  P.cas = (cs.includes('K') ? 1 : 0) | (cs.includes('Q') ? 2 : 0) | (cs.includes('k') ? 4 : 0) | (cs.includes('q') ? 8 : 0);
  P.ep = ep && ep !== '-' ? chSqOf(ep) : -1; P.half = +hm || 0; P.full = +fm || 1;
  for (let s = 0; s < 64; s++) { if (P.b[s] === 6) P.ks[1] = s; if (P.b[s] === -6) P.ks[-1] = s; }
  P.z = chHash(P); P.hist = [];
}
function chHash(P) {
  let z = 0; for (let s = 0; s < 64; s++) if (P.b[s]) z ^= CHT.zp[P.b[s] + 6][s];
  z ^= CHT.zc[P.cas]; if (P.ep >= 0) z ^= CHT.ze[P.ep & 7]; if (P.side < 0) z ^= CHT.zs; return z >>> 0;
}
function chFen(P) {
  let o = '';
  for (let r = 7; r >= 0; r--) { let e = 0; for (let f = 0; f < 8; f++) { const p = P.b[r * 8 + f]; if (!p) { e++; continue; } if (e) { o += e; e = 0; } const c = 'pnbrqk'[Math.abs(p) - 1]; o += p > 0 ? c.toUpperCase() : c; } if (e) o += e; if (r) o += '/'; }
  const cs = (P.cas & 1 ? 'K' : '') + (P.cas & 2 ? 'Q' : '') + (P.cas & 4 ? 'k' : '') + (P.cas & 8 ? 'q' : '');
  return o + ' ' + (P.side > 0 ? 'w' : 'b') + ' ' + (cs || '-') + ' ' + (P.ep >= 0 ? chSqName(P.ep) : '-') + ' ' + P.half + ' ' + P.full;
}

// is square s attacked by side `by`?
function chAttacked(P, s, by) {
  if (P.v === 'sk') return chAttackedSk(P, s, by);
  const b = P.b, R = CHT.rays[s];
  for (const t of CHT.kn[s]) if (b[t] === 2 * by) return true;
  for (const t of CHT.kg[s]) if (b[t] === 6 * by) return true;
  // a pawn of `by` attacks s from one rank behind s (behind from by's side)
  const pr = (s >> 3) - by, f = s & 7;
  if (pr >= 0 && pr < 8) { if (f > 0 && b[pr * 8 + f - 1] === by) return true; if (f < 7 && b[pr * 8 + f + 1] === by) return true; }
  for (let d = 0; d < 8; d++) {
    const ray = R[d], a = d < 4 ? 4 * by : 3 * by, q = 5 * by;
    for (let i = 0; i < ray.length; i++) { const t = ray[i]; if (P.rock[t]) break; const p = b[t]; if (!p) continue; if (p === a || p === q) return true; break; }
  }
  return false;
}
// Skerry rules: what each piece threatens (the hand's swap and the tower's steps take nothing, so don't count)
function chAttackedSk(P, s, by) {
  const b = P.b, R = CHT.rays[s];
  for (const t of CHT.kn[s]) if (b[t] === 5 * by) return true;
  for (const t of CHT.kg[s]) if (b[t] === 6 * by) return true;
  for (const t of CHT.wz[s]) if (b[t] === 2 * by || b[t] === 3 * by) return true;
  for (const t of CHT.gn[s]) if (b[t] === 2 * by) return true;
  const pr = (s >> 3) - by, f = s & 7;
  if (pr >= 0 && pr < 8) { if (f > 0 && b[pr * 8 + f - 1] === by) return true; if (f < 7 && b[pr * 8 + f + 1] === by) return true; }
  for (let d = 0; d < 8; d++) {
    const ray = R[d];
    for (let i = 0; i < ray.length; i++) { const t = ray[i]; if (P.rock[t]) break; const p = b[t]; if (!p) continue; if (d < 4 ? p === 4 * by : (p === 3 * by || p === 5 * by)) return true; break; }
  }
  return false;
}
const chInCheck = (P, side) => chAttacked(P, P.ks[side == null ? P.side : side], -(side == null ? P.side : side));

// every move by the side to move, legal or not as to its own king (chLegal filters)
function chPseudo(P, capsOnly) {
  if (P.v === 'sk') return chPseudoSk(P, capsOnly);
  const b = P.b, me = P.side, out = [], rock = P.rock;
  const add = (f, t, pc, cap, pr, k) => out.push({ f, t, pc, cap, pr: pr || 0, k: k || 0 });
  for (let s = 0; s < 64; s++) {
    const pc = b[s]; if (!pc || (pc > 0) !== (me > 0)) continue;
    const ty = pc * me;
    if (ty === 1) {
      const r = s >> 3, f = s & 7, last = me > 0 ? 7 : 0, home = me > 0 ? 1 : 6, fw = s + 8 * me;
      const push = (t, cap, k) => { if ((t >> 3) === last) for (const pr of [5, 4, 3, 2]) add(s, t, pc, cap, pr, k); else add(s, t, pc, cap, 0, k); };
      if (!capsOnly || (fw >> 3) === last) if (fw >= 0 && fw < 64 && !b[fw] && !rock[fw]) { push(fw, 0, 0); const f2 = fw + 8 * me; if (!capsOnly && r === home && !b[f2] && !rock[f2]) add(s, f2, pc, 0, 0, 1); }
      for (const df of [-1, 1]) {
        if (f + df < 0 || f + df > 7) continue; const t = fw + df; if (t < 0 || t > 63) continue;
        if (b[t] && (b[t] > 0) !== (me > 0)) push(t, b[t], 0);
        else if (t === P.ep && !b[t]) add(s, t, pc, -me, 0, 2);
      }
    } else if (ty === 2 || ty === 6) {
      for (const t of (ty === 2 ? CHT.kn : CHT.kg)[s]) { if (rock[t]) continue; const c = b[t]; if (c && (c > 0) === (me > 0)) continue; if (capsOnly && !c) continue; add(s, t, pc, c); }
      if (ty === 6 && !capsOnly) {
        const base = me > 0 ? 0 : 56, kb = me > 0 ? 1 : 4, qb = me > 0 ? 2 : 8;
        if (s === base + 4 && P.cas & (kb | qb) && !chAttacked(P, s, -me)) {
          if ((P.cas & kb) && b[base + 7] === 4 * me && !b[base + 5] && !b[base + 6] && !chAttacked(P, base + 5, -me) && !chAttacked(P, base + 6, -me)) add(s, base + 6, pc, 0, 0, 3);
          if ((P.cas & qb) && b[base] === 4 * me && !b[base + 1] && !b[base + 2] && !b[base + 3] && !chAttacked(P, base + 3, -me) && !chAttacked(P, base + 2, -me)) add(s, base + 2, pc, 0, 0, 4);
        }
      }
    } else {
      const R = CHT.rays[s], d0 = ty === 3 ? 4 : 0, d1 = ty === 4 ? 4 : 8;
      for (let d = d0; d < d1; d++) for (const t of R[d]) { if (rock[t]) break; const c = b[t]; if (!c) { if (!capsOnly) add(s, t, pc, 0); continue; } if ((c > 0) !== (me > 0)) add(s, t, pc, c); break; }
    }
  }
  return out;
}

function chPseudoSk(P, capsOnly) {
  const b = P.b, me = P.side, out = [], rock = P.rock;
  const add = (f, t, pc, cap, pr, k) => out.push({ f, t, pc, cap, pr: pr || 0, k: k || 0 });
  const foe = c => c && (c > 0) !== (me > 0);
  // a step or a leap onto t: empty, or an enemy to take
  const go = (s, pc, t) => { if (rock[t]) return; const c = b[t]; if (!c) { if (!capsOnly) add(s, t, pc, 0); } else if (foe(c)) add(s, t, pc, c); };
  const slide = (s, pc, d0, d1) => { const R = CHT.rays[s]; for (let d = d0; d < d1; d++) for (const t of R[d]) { if (rock[t]) break; const c = b[t]; if (!c) { if (!capsOnly) add(s, t, pc, 0); continue; } if (foe(c)) add(s, t, pc, c); break; } };
  for (let s = 0; s < 64; s++) {
    const pc = b[s]; if (!pc || (pc > 0) !== (me > 0)) continue;
    const ty = pc * me, f = s & 7;
    if (ty === 1) {
      const last = me > 0 ? 7 : 0, fw = s + 8 * me;
      const put = (t, cap) => { if ((t >> 3) === last) for (const pr of [5, 4, 3, 2]) add(s, t, pc, cap, pr); else add(s, t, pc, cap); };
      if (fw >= 0 && fw < 64) {
        if (!b[fw] && !rock[fw] && (!capsOnly || (fw >> 3) === last)) put(fw, 0);
        for (const df of [-1, 1]) { if (f + df < 0 || f + df > 7) continue; const t = fw + df; if (foe(b[t])) put(t, b[t]); }
      }
      if (!capsOnly) for (const df of [-1, 1]) { if (f + df < 0 || f + df > 7) continue; const t = s + df; if (!b[t] && !rock[t]) add(s, t, pc, 0); }
    } else if (ty === 2) { for (const t of CHT.gn[s]) go(s, pc, t); for (const t of CHT.wz[s]) go(s, pc, t); }
    else if (ty === 3) { slide(s, pc, 4, 8); for (const t of CHT.wz[s]) go(s, pc, t); }
    else if (ty === 4) {
      if (!capsOnly) for (const t of CHT.kg[s]) if (!b[t] && !rock[t]) add(s, t, pc, 0);
      // the beam: the first thing along each rank and file; an enemy there is taken where it stands
      const R = CHT.rays[s];
      for (let d = 0; d < 4; d++) for (const t of R[d]) { if (rock[t]) break; const c = b[t]; if (!c) continue; if (foe(c)) add(s, t, pc, c, 0, 5); break; }
    } else if (ty === 5) { slide(s, pc, 4, 8); for (const t of CHT.kn[s]) go(s, pc, t); }
    else {
      for (const t of CHT.kg[s]) {
        go(s, pc, t);
        // the swap with its own hand, unless the hand would land on its own far rank
        if (!capsOnly && b[t] === me && (s >> 3) !== (me > 0 ? 7 : 0)) add(s, t, pc, 0, 0, 6);
      }
    }
  }
  return out;
}

// make and unmake (the hash kept as it goes)
function chMake(P, m) {
  const b = P.b, me = P.side, Z = CHT.zp;
  P.hist.push({ m, cas: P.cas, ep: P.ep, half: P.half, z: P.z });
  let z = P.z ^ CHT.zc[P.cas] ^ (P.ep >= 0 ? CHT.ze[P.ep & 7] : 0) ^ CHT.zs;
  if (m.k === 5) {
    // the beam: the tower stays, what it hit goes
    z ^= Z[m.cap + 6][m.t]; b[m.t] = 0;
    P.ep = -1; P.half = 0; if (me < 0) P.full++; P.side = -me;
    P.z = (z ^ CHT.zc[P.cas]) >>> 0; return;
  }
  if (m.k === 6) {
    // the keeper's swap with its own hand
    z ^= Z[m.pc + 6][m.f] ^ Z[me + 6][m.t] ^ Z[m.pc + 6][m.t] ^ Z[me + 6][m.f];
    b[m.f] = me; b[m.t] = m.pc; P.ks[me] = m.t;
    P.ep = -1; P.half++; if (me < 0) P.full++; P.side = -me;
    P.z = (z ^ CHT.zc[P.cas]) >>> 0; return;
  }
  z ^= Z[m.pc + 6][m.f]; b[m.f] = 0;
  if (m.k === 2) { const cs = m.t - 8 * me; z ^= Z[b[cs] + 6][cs]; b[cs] = 0; }
  else if (m.cap) z ^= Z[m.cap + 6][m.t];
  const np = m.pr ? m.pr * me : m.pc; b[m.t] = np; z ^= Z[np + 6][m.t];
  if (m.k === 3 || m.k === 4) { const base = m.f - 4, rf = m.k === 3 ? base + 7 : base, rt = m.k === 3 ? base + 5 : base + 3; b[rf] = 0; b[rt] = 4 * me; z ^= Z[4 * me + 6][rf] ^ Z[4 * me + 6][rt]; }
  if (m.pc * me === 6) { P.ks[me] = m.t; P.cas &= me > 0 ? ~3 : ~12; }
  for (const [sq, bit] of [[0, 2], [7, 1], [56, 8], [63, 4]]) if (m.f === sq || m.t === sq) P.cas &= ~bit;
  P.ep = m.k === 1 ? m.f + 8 * me : -1;
  P.half = (m.pc * me === 1 || m.cap) ? 0 : P.half + 1;
  if (me < 0) P.full++;
  P.side = -me;
  z ^= CHT.zc[P.cas] ^ (P.ep >= 0 ? CHT.ze[P.ep & 7] : 0);
  P.z = z >>> 0;
}
function chUnmake(P) {
  const h = P.hist.pop(), m = h.m, b = P.b, me = -P.side;
  P.side = me; if (me < 0) P.full--;
  P.cas = h.cas; P.ep = h.ep; P.half = h.half; P.z = h.z;
  if (m.k === 5) { b[m.t] = m.cap; return; }
  if (m.k === 6) { b[m.f] = m.pc; b[m.t] = me; P.ks[me] = m.f; return; }
  b[m.f] = m.pc; b[m.t] = m.k === 2 ? 0 : m.cap;
  if (m.k === 2) b[m.t - 8 * me] = -me;
  if (m.k === 3 || m.k === 4) { const base = m.f - 4, rf = m.k === 3 ? base + 7 : base, rt = m.k === 3 ? base + 5 : base + 3; b[rt] = 0; b[rf] = 4 * me; }
  if (m.pc * me === 6) P.ks[me] = m.f;
  P.cas = h.cas; P.ep = h.ep; P.half = h.half; P.z = h.z;
}
function chLegal(P) {
  const out = [];
  for (const m of chPseudo(P)) { chMake(P, m); if (!chAttacked(P, P.ks[-P.side], P.side)) out.push(m); chUnmake(P); }
  return out;
}
function chPerft(P, d) {
  if (!d) return 1; let n = 0;
  for (const m of chPseudo(P)) { chMake(P, m); if (!chAttacked(P, P.ks[-P.side], P.side)) n += d === 1 ? 1 : chPerft(P, d - 1); chUnmake(P); }
  return n;
}
const chUci = m => chSqName(m.f) + chSqName(m.t) + (m.pr ? ' pnbrqk'[m.pr] : '');
function chFromUci(P, u, legal) {
  if (typeof u !== 'string') return null;
  const f = chSqOf(u.slice(0, 2)), t = chSqOf(u.slice(2, 4)), pr = u[4] ? ' pnbrqk'.indexOf(u[4]) : 0;
  return (legal || chLegal(P)).find(m => m.f === f && m.t === t && (m.pr || 0) === (pr > 0 ? pr : 0)) || null;
}

// ---------- the game around a position: notation, the end, the draws ----------
// the key a position is known by for repetition: the pieces, who's to move, the castling rights, and the en passant
// square only when an en passant capture can really be made (as FIDE counts "the same position")
function chKey(P, legal) {
  let ep = '-';
  if (P.ep >= 0 && (legal || chLegal(P)).some(m => m.k === 2)) ep = chSqName(P.ep);
  return chFen(P).split(' ').slice(0, 3).join(' ') + ' ' + ep;
}
// dead positions: no way to checkmate by any series of legal moves (the cases FIDE's arbiters apply automatically)
function chDead(P) {
  if (P.v === 'sk') return false;
  const minor = [], b = P.b;
  for (let s = 0; s < 64; s++) { const p = Math.abs(b[s]); if (!p || p === 6) continue; if (p === 1 || p === 4 || p === 5) return false; minor.push([p, s]); }
  if (minor.length <= 1) return true;
  // kings and bishops only, every bishop on the one colour of square
  if (minor.every(([p]) => p === 3)) { const c = (minor[0][1] & 7) + (minor[0][1] >> 3) & 1; return minor.every(([, s]) => (((s & 7) + (s >> 3)) & 1) === c); }
  return false;
}
// the move in standard algebraic notation (worked out before it's made)
function chSan(P, m, legal) {
  legal = legal || chLegal(P);
  let s; const LET = CH_LETS[P.v] || CH_LET;
  if (m.k === 3) s = 'O-O'; else if (m.k === 4) s = 'O-O-O';
  else if (m.k === 6) s = 'K~' + chSqName(m.t);          // (the keeper's swap)
  else if (m.k === 5) {                                    // (a tower's beam: T*e5, the tower staying put)
    const rivals = legal.filter(o => o !== m && o.pc === m.pc && o.t === m.t && o.k === 5);
    s = 'T' + (rivals.length ? (rivals.some(o => (o.f & 7) === (m.f & 7)) ? String(1 + (m.f >> 3)) : 'abcdefgh'[m.f & 7]) : '') + '*' + chSqName(m.t);
  } else {
    const ty = Math.abs(m.pc), to = chSqName(m.t), cap = m.cap || m.k === 2;
    if (ty === 1) s = (cap || (P.v === 'sk' && (m.f & 7) !== (m.t & 7)) ? 'abcdefgh'[m.f & 7] + (cap ? 'x' : '') : '') + to + (m.pr ? '=' + LET[m.pr] : '');
    else {
      const rivals = legal.filter(o => o !== m && o.pc === m.pc && o.t === m.t && o.f !== m.f && o.k === m.k);
      let dis = '';
      if (rivals.length) { const sf = !rivals.some(o => (o.f & 7) === (m.f & 7)), sr = !rivals.some(o => (o.f >> 3) === (m.f >> 3)); dis = sf ? 'abcdefgh'[m.f & 7] : sr ? String(1 + (m.f >> 3)) : chSqName(m.f); }
      s = LET[ty] + dis + (cap ? 'x' : '') + to;
    }
  }
  chMake(P, m);
  const light = P.v === 'sk' && Math.abs(m.pc) === 6 && P.light[m.t];
  if (light) s += '#';
  else if (chInCheck(P)) s += chLegal(P).length ? '+' : '#';
  chUnmake(P);
  return s;
}

// A game: the position, the moves so far (UCI and SAN), the keys of every position for repetition, and the result.
// res: null while it's going; otherwise { w: 1 white won, -1 black won, 0 drawn, why: 'mate' | 'light' | 'stalemate' |
// 'repetition' | 'fifty' | 'material' | 'resign' | 'agreed' | 'left' }
function chGame(variant, fen) {
  const G = { v: variant === 'sk' ? 'sk' : 'std', P: chNew(variant, fen), uci: [], san: [], keys: [], res: null, legal: null, caps: [] };
  G.legal = chLegal(G.P); G.keys.push(chKey(G.P, G.legal));
  return G;
}
function chPlay(G, m) {
  if (G.res) return false;
  const mv = G.legal.find(o => o.f === m.f && o.t === m.t && (o.pr || 0) === (m.pr || 0)); if (!mv) return false;
  G.san.push(chSan(G.P, mv, G.legal)); G.uci.push(chUci(mv));
  if (mv.cap) G.caps.push(mv.cap);
  const mover = G.P.side;
  chMake(G.P, mv);
  G.legal = chLegal(G.P);
  G.keys.push(chKey(G.P, G.legal));
  G.last = mv;
  if (G.v === 'sk' && mv.pc * mover === 6 && G.P.light[mv.t]) G.res = { w: mover, why: 'light' };
  else if (!G.legal.length) G.res = chInCheck(G.P) ? { w: mover, why: 'mate' } : { w: 0, why: 'stalemate' };
  else if (G.P.half >= 100) G.res = { w: 0, why: 'fifty' };
  else if (G.keys.filter(k => k === G.keys[G.keys.length - 1]).length >= 3) G.res = { w: 0, why: 'repetition' };
  else if (chDead(G.P)) G.res = { w: 0, why: 'material' };
  return true;
}
function chPlayUci(G, u) { const m = chFromUci(G.P, u, G.legal); return m ? chPlay(G, m) : false; }
// the same game with its last n moves taken back (replayed from the start, so everything stays right)
function chReplay(variant, uci) { const G = chGame(variant); for (const u of uci) if (!chPlayUci(G, u)) break; return G; }

// ---------- the bots ----------
const CH_BOTS = {
  easy: { name: 'Hob the deckhand', depth: 1, ms: 400, noise: 90, careless: 0.22 },
  fair: { name: 'Mate Tamsin', depth: 3, ms: 1500, noise: 14, careless: 0 },
  hard: { name: 'The Old Keeper', depth: 30, ms: 2000, noise: 0, careless: 0 },
};
const CH_MATE = 100000;
function chEval(P) {
  // from the side to move's view
  const b = P.b, pst = CHT.pst, VAL = CH_VALS[P.v] || CH_VAL; let sc = 0, mat = 0;
  for (let s = 0; s < 64; s++) { const p = b[s]; if (!p) continue; const ty = p > 0 ? p : -p; if (ty !== 6 && ty !== 1) mat += VAL[ty]; }
  const end = mat <= 2600;   // (both sides together have little but pawns and a couple of pieces left)
  for (let s = 0; s < 64; s++) {
    const p = b[s]; if (!p) continue;
    const ty = p > 0 ? p : -p, sq = p > 0 ? s : (7 - (s >> 3)) * 8 + (s & 7);
    let v = VAL[ty] + (ty === 6 ? (end ? CHT.kend[sq] : pst[6][sq]) : pst[ty][sq]);
    if (ty === 6 && P.v === 'sk') { const d = CHT.ldist[s]; v += (end ? 60 : 22) * (3 - Math.min(3, d)) * (d <= 1 ? 2 : 1); }
    sc += p > 0 ? v : -v;
  }
  return sc * P.side;
}
// the keeper to move has a safe step onto the Light (under Skerry rules that wins at once)
function chLightStep(P) {
  if (P.v !== 'sk') return false;
  const me = P.side, k = P.ks[me];
  for (const t of CHT.kg[k]) {
    if (!P.light[t]) continue; const c = P.b[t]; if (c && (c > 0) === (me > 0) && c !== me) continue;   // (its own hand there: a swap)
    // (taking the king off its square first, so it can't shelter behind itself)
    P.b[k] = 0; const att = chAttacked(P, t, -me); P.b[k] = 6 * me; if (!att) return true;
  }
  return false;
}
function chOrder(P, ms, killers, best) {
  const CH_VAL = CH_VALS[P.v] || CH_VALS.std;
  for (const m of ms) {
    let o = 0;
    if (best && m.f === best.f && m.t === best.t && m.pr === best.pr) o = 1e7;
    else if (m.cap || m.k === 2) o = 1e6 + CH_VAL[Math.abs(m.cap || 1)] * 10 - CH_VAL[Math.abs(m.pc)] / 10;
    else if (m.pr) o = 9e5 + m.pr;
    else if (killers && killers.some(k => k && k.f === m.f && k.t === m.t)) o = 8e5;
    m.o = o;
  }
  ms.sort((a, b) => b.o - a.o);
  return ms;
}
function chSearch(P, depth, alpha, beta, ply, S) {
  if ((++S.n & 2047) === 0 && performance.now() > S.stop) throw S;
  // the last move put the other keeper on the Light: lost
  if (P.v === 'sk' && P.light[P.ks[-P.side]]) return -CH_MATE + ply;
  if (ply && P.half >= 100) return 0;
  if (ply) { const hs = P.hist; for (let i = hs.length - 2, n = 0; i >= 0 && n < P.half; i -= 2, n += 2) if (hs[i].z === P.z) return 0; if (S.past.has(P.z)) return 0; }
  const check = chInCheck(P);
  if (check) depth++;
  if (depth <= 0) return chQuiet(P, alpha, beta, ply, S);
  const ms = chOrder(P, chPseudo(P), S.killers[ply], ply === 0 ? S.best : null);
  let legal = 0, bestM = null;
  for (const m of ms) {
    chMake(P, m);
    if (chAttacked(P, P.ks[-P.side], P.side)) { chUnmake(P); continue; }
    legal++;
    const v = -chSearch(P, depth - 1, -beta, -alpha, ply + 1, S);
    chUnmake(P);
    if (v > alpha) { alpha = v; bestM = m; if (ply === 0) S.rootBest = m; }
    if (alpha >= beta) { if (!m.cap) { const k = S.killers[ply] || (S.killers[ply] = [null, null]); if (!(k[0] && k[0].f === m.f && k[0].t === m.t)) { k[1] = k[0]; k[0] = m; } } break; }
  }
  if (!legal) return check ? -CH_MATE + ply : 0;
  return alpha;
}
function chQuiet(P, alpha, beta, ply, S) {
  if ((++S.n & 2047) === 0 && performance.now() > S.stop) throw S;
  if (P.v === 'sk' && P.light[P.ks[-P.side]]) return -CH_MATE + ply;
  if (chLightStep(P)) return CH_MATE - ply - 1;
  const stand = chEval(P);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  if (ply > 40) return stand;
  for (const m of chOrder(P, chPseudo(P, true))) {
    if (stand + (CH_VALS[P.v] || CH_VAL)[Math.abs(m.cap || 1)] + (m.pr ? 800 : 0) + 200 < alpha) continue;   // (delta pruning)
    chMake(P, m);
    if (chAttacked(P, P.ks[-P.side], P.side)) { chUnmake(P); continue; }
    const v = -chQuiet(P, -beta, -alpha, ply + 1, S);
    chUnmake(P);
    if (v > alpha) { alpha = v; if (alpha >= beta) break; }
  }
  return alpha;
}
// the bot's move for game G at skill k ('easy', 'fair', 'hard'); returns a move from G.legal
function chBot(G, k) {
  const B = CH_BOTS[k] || CH_BOTS.fair, legal = G.legal;
  if (!legal.length) return null;
  if (legal.length === 1) return legal[0];
  const P = chNew(G.v); P.b.set(G.P.b); Object.assign(P, { side: G.P.side, cas: G.P.cas, ep: G.P.ep, half: G.P.half, full: G.P.full, ks: { 1: G.P.ks[1], '-1': G.P.ks[-1] } }); P.z = chHash(P);
  // (an easy bot sometimes just plays something, though never past a mate in one it can see)
  const S = { n: 0, stop: performance.now() + B.ms, killers: [], best: null, rootBest: null, past: new Set() };
  // the positions already seen in the game count as draws if the search comes back to them
  { const Q = chReplay(G.v, []); S.past.add(Q.P.z); for (const u of G.uci) { chPlayUci(Q, u); S.past.add(Q.P.z); } S.past.delete(P.z); }
  let best = legal[0];
  for (let d = 1; d <= B.depth && !B.noise; d++) {
    S.rootBest = null;
    try {
      const v = chSearch(P, d, -CH_MATE - 1, CH_MATE + 1, 0, S);
      if (S.rootBest) { best = S.rootBest; S.best = best; }
      if (Math.abs(v) > CH_MATE - 200) break;
    } catch (e) { if (e !== S) throw e; break; }
  }
  const pick = legal.find(m => m.f === best.f && m.t === best.t && m.pr === best.pr) || legal[0];
  if (B.noise) {
    // score every root move with a shallow look, add noise, and take the best of those
    const rs = [];
    const S2 = { n: 0, stop: performance.now() + B.ms, killers: [], best: null, rootBest: null, past: S.past };
    for (const m of legal) {
      chMake(P, m);
      let v;
      try { v = -chSearch(P, Math.max(0, B.depth - 1), -CH_MATE - 1, CH_MATE + 1, 1, S2); } catch (e) { if (e !== S2) throw e; v = -chEval(P); }
      chUnmake(P);
      rs.push([m, v]);
    }
    const mateNow = rs.find(([, v]) => v > CH_MATE - 200);
    if (mateNow) return mateNow[0];
    if (B.careless && Math.random() < B.careless) {
      // a careless move: anything that doesn't hang a lot at once
      const ok = rs.filter(([, v]) => v > Math.max(...rs.map(r => r[1])) - 350);
      return ok[Math.floor(Math.random() * ok.length)][0];
    }
    let top = null, tv = -Infinity;
    for (const [m, v] of rs) { const n = v + (Math.random() * 2 - 1) * B.noise; if (n > tv) { tv = n; top = m; } }
    return top || pick;
  }
  return pick;
}
