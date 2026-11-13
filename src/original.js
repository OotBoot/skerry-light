'use strict';
// The Original: Skerry Light as it began, a flat 2D game where you are the keeper and swing the beam to show passing
// ships the rocks. The game itself is src/original.html, one self-contained page; the build inlines it here as a
// string (ORIG_PAGE), and unbuilt it's loaded from beside index.html. It plays in a frame laid over the main menu,
// opened from the featured banner at the top of the menu (and the featured button above the list on the desk menu).
// Going back hides the frame and pauses it, so the night you were on is still there when you come back.
// The frame calls origClose (its Menu button, Esc) and the sfx functions in audio.js, so it follows the volume setting.
var ORIG_PAGE = 'src/original.html';
const ORIG = { el: null, frame: null, back: null };

function origOpen() {
  if (typeof audioInit === 'function') audioInit();
  if (!ORIG.el) {
    const el = ORIG.el = document.createElement('div'); el.className = 'origwrap'; el.id = 'origWrap';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The Original');
    const f = ORIG.frame = document.createElement('iframe'); f.title = 'The Original: Skerry Light';
    if (ORIG_PAGE.startsWith('src/')) f.src = ORIG_PAGE; else f.srcdoc = ORIG_PAGE;
    el.appendChild(f); document.body.appendChild(el);
    ORIG.back = document.activeElement;
  } else { ORIG.back = document.activeElement; ORIG.el.hidden = false; try { ORIG.frame.contentWindow.ORIG_PAUSED = false; } catch (e) {} }
  document.body.classList.add('origon');
  setTimeout(() => { try { ORIG.frame.focus(); ORIG.frame.contentWindow.focus(); } catch (e) {} }, 60);
}
function origClose() {
  if (!ORIG.el || ORIG.el.hidden) return;
  try { ORIG.frame.contentWindow.ORIG_PAUSED = true; } catch (e) {}
  ORIG.el.hidden = true; document.body.classList.remove('origon');
  const b = ORIG.back && document.contains(ORIG.back) ? ORIG.back : document.getElementById('origBanner');
  if (b) b.focus({ preventScroll: true });
}
function origIsOpen() { return !!(ORIG.el && !ORIG.el.hidden); }

(function origInit() {
  const b = document.getElementById('origBanner'); if (b) b.addEventListener('click', origOpen);
  // while it's open, keys on this page (if the frame lost focus) go no further than closing it on Esc
  addEventListener('keydown', e => {
    if (!origIsOpen()) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); origClose(); }
    else { try { ORIG.frame.contentWindow.focus(); } catch (x) {} }
  }, true);
})();
