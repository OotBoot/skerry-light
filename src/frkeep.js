// Fog Run: what you keep between runs (design.md, "What you keep"; step 6). Nothing in here touches the boat or the run
// itself: it watches the run from outside (every half second, frKeepTick) and settles up when it ends.
//  - Crates. When a run ends (won, lost, or left: src/raid.js raidReport calls frReport), one crate for every two
//    islands lit, and three more for a win: the same weapon and outfit crates the raids pay out (src/wcrates.js
//    wcGrant, src/ocrates.js ocGrant), taken in turn, a weapon crate first. Only what a run hasn't already paid goes
//    out, kept by the run's seed, so leaving a run and rejoining it never pays twice. (A fog run doesn't also get the
//    raids' own win crates: raidWin leaves them out.)
//  - The scoreboard, game 'fogrun' (src/scores.js BOARD.games, server/scores.js GAMES). Each run is an entry:
//      s: the furthest island reached (its stop number)    b: the time through, for a won run (as the raids keep it,
//      100000 less its seconds; 0: not won)    c: the islands lit in it
//    and your bests: the furthest, the fastest win, and the islands lit in all your runs. Logged as it goes (each new
//    island reached or lit) and once more at the end; a run left before its end keeps a yellow asterisk.
//  - Chart fragments: one for each island lit, kept in this browser for good (localStorage 'skerry-frkeep', also in
//    the one save: src/crates.js saveData `fr`, the save code's `g`, merged by taking the larger). Counted here as
//    FR.lit goes up, on every screen, host or joined, and once more at the end. At 10, 25, 50 and 100 in all, new cards
//    join the salvage for good: frFrags() is the count and frFragTier() how many of those marks you've passed (0 to 4),
//    for the card pool (src/frcards.js). The Fog Run card shows the count and the next mark (frKeepRender).
// Hooks in shared files, marked [fogrun]: src/raid.js (raidReport frReport, raidWin, raidShowOver frKeepOver),
// src/raidmvp.js (the victory screen's line, frKeepLine), src/scores.js (BOARD.games.fogrun), src/crates.js (saveData,
// mergeSave, the save code, lootSize), server/scores.js (GAMES.fogrun), index.html (the card's line, #frKeep).

// FRK: the fragment marks; a crate for every PER islands lit; WIN, the crates more for a win
const FRK = { AT: [10, 25, 50, 100], PER: 2, WIN: 3, KEY: 'skerry-frkeep' };
// f: chart fragments in all; r: this run's record [seed, islands counted, crates paid]; far, lit: what's been logged
// to the board this run; last: what the run just ended paid (for the end card)
var FK = { f: 0, r: [0, 0, 0], far: 0, lit: 0, last: null };
function frKeepLoad() {
  let o = {}; try { o = JSON.parse(localStorage.getItem(FRK.KEY) || '{}') || {}; } catch (e) {}
  FK.f = Math.max(0, Math.min(1e6, o.f | 0)); if (Array.isArray(o.r) && o.r.length === 3) FK.r = o.r.map(v => Math.max(0, v >>> 0));
}
function frKeepSave() {
  try { localStorage.setItem(FRK.KEY, JSON.stringify({ f: FK.f, r: FK.r })); } catch (e) {}
  if (typeof cloudSaveSoon === 'function') try { cloudSaveSoon(); } catch (e) {}
  if (typeof renderBackupDot === 'function') try { renderBackupDot(); } catch (e) {}
}

// ---------- chart fragments ----------
function frFrags() { return FK.f; }
function frFragTier() { let t = 0; for (const a of FRK.AT) if (FK.f >= a) t++; return t; }
const frFragNext = () => FRK.AT.find(a => FK.f < a) || 0;
// for the one save (src/crates.js): what's here, and another save folded in (the larger; fragments are never spent)
function frData() { return FK.f > 0 ? { f: FK.f } : undefined; }
function frMerge(d) {
  if (!d || typeof d !== 'object') return false;
  const f = Math.max(0, Math.min(1e6, d.f | 0)); if (f <= FK.f) return false;
  FK.f = f; frKeepSave(); frKeepRender(); return true;
}
// this run's record, by its seed (a new seed, or fewer islands lit than counted: a run of its own)
function frRunRec() {
  const L = FR.lit | 0;
  if (FK.r[0] !== (FR.seed >>> 0) || L < FK.r[1]) { FK.r = [FR.seed >>> 0, 0, 0]; FK.far = 0; FK.lit = 0; }
  return FK.r;
}
// a fragment for each island lit since last counted
function frCountLit() {
  const R = frRunRec(), L = FR.lit | 0; if (L <= R[1]) return;
  const n = L - R[1]; R[1] = L; FK.f = Math.min(1e6, FK.f + n); frKeepSave(); frKeepRender();
  if (typeof fpsFeed === 'function' && typeof FPS !== 'undefined' && FPS.on) fpsFeed(`+${n} chart ${n === 1 ? 'fragment' : 'fragments'} (${FK.f} in all)`);
}

// ---------- the scoreboard ----------
const frRunWon = () => !!(FR.won || RAID.won);
// furthest island reached: the stop of the island you're on (on a sail, the one before it), the most this run
const frFarNow = () => { const p = typeof frPlanNow === 'function' ? frPlanNow() : null; return Math.max(FK.far, p && p.key !== 'frsail' ? p.n | 0 : FR.stop | 0); };
const frTimeB = () => frRunWon() ? Math.max(1, 100000 - Math.round(RAID.t)) : 0;
// (every half second) fragments, and the board as it goes
function frKeepTick() {
  if (typeof FR === 'undefined' || !FR.on || typeof RAID === 'undefined' || !RAID.on || RAID.map !== 'fogrun' || RAID.told) return;
  frCountLit();
  const far = frFarNow(), lit = FR.lit | 0;
  if (far === FK.far && lit === FK.lit) return;
  FK.far = far; FK.lit = lit;
  if (typeof scoreReport === 'function') { scoreReport('fogrun', far, 0, 0); scoreRun('fogrun', far, 0, lit); }
}
// (src/raid.js raidReport: the run's end, or leaving it, or the page closing on it) the board once more, and what
// it pays. done: played to its end (won, or everyone lost, or the cutter gone down), so no asterisk
function frReport() {
  RAID.told = true;
  frCountLit();
  const done = !!ZM.over, far = frFarNow(), lit = FR.lit | 0, b = frTimeB(), M = typeof BOARD !== 'undefined' && BOARD.mine && BOARD.mine.fogrun;
  if (M && typeof scoreReport === 'function') scoreReport('fogrun', far, b, (M.c | 0) + lit, done);
  if (typeof scoreRun === 'function') { scoreRun('fogrun', far, b, lit, done); scoreRunEnd('fogrun'); }
  frPay(lit);
}

// ---------- crates ----------
function frPay(lit) {
  const R = frRunRec(), due = Math.floor(lit / FRK.PER) + (frRunWon() ? FRK.WIN : 0), n = Math.max(0, due - R[2]);
  // (in turn, carrying on from what this run already paid: a weapon crate on the even ones)
  let w = 0, o = 0; for (let k = R[2]; k < R[2] + n; k++) { if (k % 2 === 0) w++; else o++; }
  R[2] = due; frKeepSave();
  const why = frRunWon() ? `the lights lit again, ${lit} ${lit === 1 ? 'island' : 'islands'}` : `${lit} ${lit === 1 ? 'island' : 'islands'} lit in the fog`;
  if (w && typeof wcGrant === 'function') wcGrant(w, why);
  if (o && typeof ocGrant === 'function') ocGrant(o, why);
  FK.last = { w, o, frags: lit };
}
// what this run kept, in a line (the end card, the victory screen)
function frKeepLine() {
  const L = FK.last; if (!L) return '';
  const p = (n, one, many) => `${n} ${n === 1 ? one : many}`, bits = [];
  if (L.w) bits.push(p(L.w, 'weapon crate', 'weapon crates')); if (L.o) bits.push(p(L.o, 'outfit crate', 'outfit crates'));
  if (L.frags) bits.push(p(L.frags, 'chart fragment', 'chart fragments'));
  const nx = frFragNext(), tail = `${FK.f} ${FK.f === 1 ? 'fragment' : 'fragments'} in all` + (nx ? `; ${nx - FK.f} more to ${nx}` : '');
  return (bits.length ? 'Kept: ' + (bits.length > 1 ? bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1] : bits[0]) : 'Nothing kept this time') + ` (${tail}).`;
}
// (raidShowOver) the end card's under-line: what was kept, and your bests
function frKeepOver() {
  const el = $('zmOverBest'); if (!el) return;
  const M = typeof BOARD !== 'undefined' && BOARD.mine && BOARD.mine.fogrun;
  el.textContent = frKeepLine() + (M && M.s ? ` Furthest: island ${M.s}${M.b ? ', fastest through ' + raidTimeOf(M.b) : ''}; ${M.c | 0} lit in all.` : '');
}

// ---------- on the card ----------
function frKeepRender() {
  const el = $('frKeep'); if (!el) return;
  const nx = frFragNext(), f = FK.f;
  el.textContent = `Chart fragments: ${f}. ` + (nx ? `${nx - f} more to ${nx}, and new cards join the salvage for good.` : 'Every card is in the salvage.');
  el.title = 'One for every island lit. At 10, 25, 50 and 100, new cards join the salvage for good.';
}

frKeepLoad();
frKeepRender();
setInterval(frKeepTick, 500);
