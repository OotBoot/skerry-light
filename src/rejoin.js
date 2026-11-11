// Coming back to a game in progress, in every mode played together.
//
// Drop out of a game with others (a reload, a crash, a phone that slept, a lost connection) and you can get back into
// the same one, as the same player, with what was yours. While you're in a game, this browser keeps a note of it
// every couple of seconds and as the page closes (localStorage `skerry-rejoin`): which game, its room, and your own
// state in it, as each mode's own file says (netRjRecord in src/net.js, fpsRjRecord in src/fps.js, wnRjRecord in
// src/warnet.js, znRjRecord in src/zmnet.js, which covers the Lighthouse and both raids). The note carries your id
// (NET.sid), and a new tab opened after the old one closed takes that id back (src/net.js), so the others' browsers
// know you for the one who left.
// Back on the title screen, while that game is still going, a bar at the top offers to rejoin it; the lobby's list
// marks it too ("tap to rejoin"), and a crew's invite link does the same. Leaving a game yourself, or its end, drops
// the note. A game's host can't come back to it in the Lighthouse, the raids or the Drowned Reach: the host's browser
// is that game, and it ends when they go (Wreckers' Night and crews have no such host, so anyone can come back).

const RJ = { KEY: 'skerry-rejoin', TTL: 15 * 60 * 1000, was: false, busy: null, shown: '' };
function rjGet() {
  try { const r = JSON.parse(localStorage.getItem(RJ.KEY) || 'null'); return r && typeof r === 'object' && typeof r.k === 'string' && Date.now() - (+r.t || 0) < RJ.TTL ? r : null; } catch (e) { return null; }
}
function rjClear() { try { localStorage.removeItem(RJ.KEY); } catch (e) {} rjRender(); }
// what this page is in now: a record to keep, false (in a game that can't be come back to) or null (in none)
function rjNow() {
  for (const f of [typeof znRjRecord === 'function' && znRjRecord, typeof wnRjRecord === 'function' && wnRjRecord, typeof fpsRjRecord === 'function' && fpsRjRecord, typeof netRjRecord === 'function' && netRjRecord]) {
    if (!f) continue;
    let r = null; try { r = f(); } catch (e) { r = null; }
    if (r !== null) return r;
  }
  return null;
}
function rjKeep() {
  if (typeof NET === 'undefined' || !NET.sid) return;
  const r = rjNow();
  if (r) { r.sid = NET.sid; r.t = Date.now(); try { localStorage.setItem(RJ.KEY, JSON.stringify(r)); } catch (e) {} RJ.was = true; return; }
  // was in a game this time round and now isn't (left it, or it ended), or hosting one: nothing to come back to
  if (r === false || RJ.was) { RJ.was = r === false; const old = rjGet(); if (old && old.sid === NET.sid) rjClear(); }
}
// still going? (and so worth offering)
function rjLive(r) {
  if (!r || typeof NET === 'undefined' || NET.status !== 'ready' || r.sid !== NET.sid) return false;
  try {
    if (r.k === 'zm') return typeof znRjLive === 'function' && znRjLive(r);
    if (r.k === 'war') return typeof wnRjLive === 'function' && wnRjLive(r);
    if (r.k === 'fps') return typeof fpsRjLive === 'function' && fpsRjLive(r);
    if (r.k === 'crew') return typeof netRjLive === 'function' && netRjLive(r) && NET.crew !== r.code;
  } catch (e) {}
  return false;
}
function rjGo() {
  const r = rjGet(); if (!rjLive(r)) { rjRender(); return; }
  try { audioInit(); } catch (e) {}
  let ok = false;
  if (r.k === 'zm') ok = znRejoin(r);
  else if (r.k === 'war') ok = wnRejoin(r);
  else if (r.k === 'fps') ok = fpsRejoin(r);
  else if (r.k === 'crew') ok = netRejoin(r);
  if (ok && (r.k === 'zm' || r.k === 'war')) { RJ.busy = r; setTimeout(() => { if (RJ.busy === r) { RJ.busy = null; rjRender(); } }, 10000); }
  rjRender();
}
function rjRender() {
  const bar = $('rejoinBar'); if (!bar) return;
  const r = rjGet(), on = !RJ.busy && rjLive(r) && (typeof state === 'undefined' || state === 'title');
  bar.hidden = !(on || RJ.busy);
  if (bar.hidden) return;
  const txt = RJ.busy ? `Getting you back into ${RJ.busy.label || 'your game'}…` : `You dropped out of ${r.label || 'a game'}. It’s still going.`;
  if (RJ.shown !== txt) { RJ.shown = txt; $('rejoinText').textContent = txt; }
  $('rejoinGo').hidden = $('rejoinNo').hidden = !!RJ.busy;
}
{
  if ($('rejoinGo')) $('rejoinGo').addEventListener('click', rjGo);
  if ($('rejoinNo')) $('rejoinNo').addEventListener('click', rjClear);
  setInterval(() => {
    rjKeep();
    if (RJ.busy && ((typeof FPS !== 'undefined' && FPS.on) || (typeof WAR !== 'undefined' && WAR.on))) RJ.busy = null;
    rjRender();
  }, 2000);
  addEventListener('pagehide', rjKeep);
  setTimeout(rjRender, 1500);
}
