// Invite links: a "Share invite" button in every mode's lobby, and the link it shares drops a friend straight into that lobby.
//
// The link is the live site with the mode and the lobby's code in the query: ?mode=raid&lobby=zab12cd. The modes are
//   sail        a Skerry Light crew (net.js; the code is the crew's name, gannet-12)
//   wreckers    Wreckers' Night (fps.js: one shared island, so no code; the link opens its card)
//   war         a Drowned Reach war (warnet.js, w...)
//   lighthouse  a Keeper's Last Light night (zmnet.js, z...)
//   raid        a Maren's End raid (the same lobby as the Lighthouse's, on the raid's own card)
//   fogrun      a Fog Run (the same lobby again, on its own card: src/frrun.js) [fogrun]
//   fbsea       a Freebooters' Sea crew (the same lobby again, on its own card: src/fbsea.js) [fbsea]
//   golf        a round of Skerry Links (its own lobby: src/golfnet.js, g...) [golf]
// On a phone or tablet the button opens the share sheet; on a computer it copies the text to the clipboard.
// On claude.ai everyone plays in the artifact's own room, which the live site can't reach, so there the link is the
// artifact itself: it can't carry a code, but the friend sees the lobby in the list and taps it.
// Old crew links (#gannet-12) still work.

const SHARE_SITE = 'https://skerry-light.onrender.com/';
const SHARE_ARTIFACT = 'https://claude.ai/artifact/4abbzGK8dMDsPyR5KdssJv';
const SHARE_TEXT = 'Join my game on Skerry Light!';
const SHARE_MODES = ['sail', 'wreckers', 'war', 'lighthouse', 'raid', 'fogrun', 'fbsea', 'golf'];   // [fogrun] [fbsea] [golf]
// the Lighthouse's lobby's own word for each of the modes it serves (src/zmnet.js ZN.mode) [fogrun]
var SHARE_ZN = { lighthouse: 'zm', raid: 'raid', fogrun: 'fr', fbsea: 'fb' };
const shareOnClaude = () => (typeof NET !== 'undefined' && NET.via === 'claude') || !!(window.claude && typeof window.claude.use === 'function');

function shareUrl(mode, code) {
  if (shareOnClaude()) return SHARE_ARTIFACT;
  // our own site (the live one, or a local copy being tested); a page opened from a file shares the live site
  const base = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : SHARE_SITE;
  const q = new URLSearchParams({ mode });
  if (code) q.set('lobby', code);
  return base + '?' + q.toString();
}
// the lobby the button is for, right now
function shareCode(mode) {
  if (mode === 'sail') return NET.crew;
  if (mode === 'war') return typeof WN !== 'undefined' ? WN.code : null;
  if (mode === 'golf') return typeof GFN !== 'undefined' ? GFN.code : null;   // [golf]
  if (mode === 'lighthouse' || mode === 'raid' || mode === 'fogrun' || mode === 'fbsea') return typeof ZN !== 'undefined' && ZN.mode === SHARE_ZN[mode] ? ZN.code : null;   // [fogrun]
  return null;
}
function shareIsPhone() {
  try {
    return matchMedia('(pointer: coarse)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  } catch (e) { return false; }
}
function shareFlash(btn, text) {
  if (!btn) return;
  const was = btn.dataset.label || (btn.dataset.label = btn.textContent);
  btn.textContent = text;
  clearTimeout(btn._shareT); btn._shareT = setTimeout(() => { btn.textContent = was; }, 1800);
}
// copy without the clipboard API too (an iframe can be refused it)
function shareCopyOld(text) {
  try {
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(t); t.select(); t.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy'); t.remove(); return ok;
  } catch (e) { return false; }
}
function shareCopy(text, btn) {
  const done = () => { shareFlash(btn, 'Copied'); if (typeof toast === 'function') toast('Invite copied: ' + text, 'Invite copied'); };
  const fail = () => { if (shareCopyOld(text)) done(); else { shareFlash(btn, 'Couldn’t copy'); try { window.prompt('Copy this invite:', text); } catch (e) {} } };
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fail); return; } } catch (e) {}
  fail();
}
function shareInvite(mode, btn) {
  const url = shareUrl(mode, shareCode(mode)), text = SHARE_TEXT + ' ' + url;
  if (shareIsPhone() && navigator.share) {
    // (text and url separately: the share sheet joins them, and a messaging app shows the link as a card)
    navigator.share({ title: 'Skerry Light', text: SHARE_TEXT, url }).catch(e => { if (!e || e.name !== 'AbortError') shareCopy(text, btn); });
    return;
  }
  shareCopy(text, btn);
}
for (const b of document.querySelectorAll('.shareBtn')) b.addEventListener('click', () => shareInvite(b.dataset.mode, b));
{ const b = $('inviteCopy'); if (b) b.addEventListener('click', () => shareInvite('sail', b)); }

// ---------- arriving from a link ----------
const SHARE_JOIN = (() => {
  try {
    const q = new URLSearchParams(location.search), mode = q.get('mode'), code = (q.get('lobby') || '').trim();
    if (SHARE_MODES.includes(mode) && (mode === 'wreckers' || /^[a-z0-9-]{2,20}$/i.test(code))) return { mode, code };
    const h = (location.hash || '').slice(1);
    if (/^[a-z]+-\d{1,4}$/.test(h)) return { mode: 'sail', code: h };
  } catch (e) {}
  return null;
})();
if (SHARE_JOIN && /[?&](mode|lobby)=/.test(location.search)) {
  // tidy the address bar, so a reload later doesn't drag you back into an old lobby
  try { const q = new URLSearchParams(location.search); q.delete('mode'); q.delete('lobby'); const s = q.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) {}
}
const SHARE_CARD = { sail: 'together', wreckers: 'fpsTitle', war: 'warTitle', lighthouse: 'zmTitle', raid: 'rdTitle', fogrun: 'frTitle', fbsea: 'fbTitle', golf: 'gfTitle' };
const SHARE_WHAT = { sail: 'crew', war: 'war', lighthouse: 'night', raid: 'raid', fogrun: 'run', fbsea: 'crew', golf: 'round' };
function shareShow(mode) { const c = $(SHARE_CARD[mode]); if (c) c.scrollIntoView({ block: 'start' }); }
function shareArrive() {
  const J = SHARE_JOIN; if (!J) return;
  if (J.mode === 'wreckers') {
    shareShow('wreckers');
    setTimeout(() => { const b = $('fpsPlay'); if (b) b.focus({ preventScroll: true }); }, 300);
    if (typeof toast === 'function') toast('You’ve been invited to Wreckers’ Night. Tap Go ashore to join them on the island.', 'Tap Go ashore');
    return;
  }
  let readyAt = 0;
  const t0 = performance.now(), what = SHARE_WHAT[J.mode];
  const give = msg => { clearInterval(iv); shareShow(J.mode); if (msg && typeof toast === 'function') toast(msg, 'Invite closed'); };
  const iv = setInterval(() => {
    if (typeof NET === 'undefined' || NET.status === 'off') return give('Couldn’t reach the other players, so the invite couldn’t be used.');
    if (NET.status !== 'ready') { if (performance.now() - t0 > 20000) give('Couldn’t reach the other players, so the invite couldn’t be used.'); return; }
    if (!readyAt) readyAt = performance.now();
    if (typeof state !== 'undefined' && state !== 'title') return;
    const waited = performance.now() - readyAt;
    if (J.mode === 'sail') {
      NET.pendingJoin = J.code;
      if (NET.crew === J.code) return clearInterval(iv);
      if (crewOf(J.code).some(p => !(p.isMe && p.sameTab))) {
        clearInterval(iv);
        // (a crew I dropped out of: back in my old place, and on to the voyage where I was: src/rejoin.js)
        const r = typeof rjGet === 'function' ? rjGet() : null;
        if (r && r.k === 'crew' && r.code === J.code && r.sid === NET.sid && typeof netRejoin === 'function') netRejoin(r); else joinCrew(J.code);
        return;
      }
    } else if (J.mode === 'war') {
      if (WN.code === J.code) return clearInterval(iv);
      const w = wnOpenWars().find(x => x.code === J.code);
      if (w) {
        clearInterval(iv); shareShow('war');
        if (w.started && typeof wnRjFor === 'function' && wnRjFor(J.code)) wnRejoin(wnRjFor(J.code));   // (one I dropped out of: back in)
        else if (w.started) toast('That war has already started.', 'Already started'); else wnJoin(J.code);
        return;
      }
    } else if (J.mode === 'golf') {   // [golf]
      if (GFN.code === J.code) return clearInterval(iv);
      const r = gfnOpen().find(x => x.code === J.code);
      if (r) { clearInterval(iv); shareShow('golf'); if (r.started) toast('That round has already started.', 'Already started'); else gfnJoin(J.code); return; }
    } else {
      if (ZN.code === J.code) return clearInterval(iv);
      const n = znOpenNights().find(x => x.code === J.code);
      if (n) {
        clearInterval(iv); const mode = ZM_MAPS[n.map] && ZM_MAPS[n.map].fb ? 'fbsea' : ZM_MAPS[n.map] && ZM_MAPS[n.map].fr ? 'fogrun' : ZM_MAPS[n.map] && ZM_MAPS[n.map].raid ? 'raid' : 'lighthouse'; shareShow(mode);   // [fogrun]
        if (n.started && typeof znRjFor === 'function' && znRjFor(J.code)) znRejoin(znRjFor(J.code));   // (one I dropped out of: back in)
        else if (n.started) toast(`That ${SHARE_WHAT[mode]} has already started.`, 'Already started'); else znJoin(J.code, SHARE_ZN[mode]);
        return;
      }
    }
    // give everyone in the room a few seconds to be heard from before calling the lobby gone
    if (waited > 8000) give(`The ${what} you were invited to isn’t open any more. You can host your own here.`);
  }, 400);
}
shareArrive();
