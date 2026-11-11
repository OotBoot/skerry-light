'use strict';
// The Patch Notes page: a button under the game banners on the main menu opens a card listing every update in PATCH_NOTES (src/patchnotes.js), newest first.
// Esc, the close button or B on a controller shuts it again.
var PN_SECTIONS = ['New', 'Balance', 'Changes', 'Fixes', 'Sound'];
function pnEsc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
// a line that opens with a short name and a colon ("Maren's End: ...") shows that name in bold
function pnLine(t) { const m = /^([^:]{2,40}): (.*)$/.exec(t); return '<li>' + (m ? '<b>' + pnEsc(m[1]) + ':</b> ' + pnEsc(m[2]) : pnEsc(t)) + '</li>'; }
function pnDate(d) { const t = new Date(d + 'T12:00:00Z'); return isNaN(t) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
function renderNotes() {
  const list = document.getElementById('notesList'); if (!list || list.dataset.done) return;
  const notes = (typeof PATCH_NOTES !== 'undefined' ? PATCH_NOTES : []).slice().sort((a, b) => b.v - a.v);
  list.innerHTML = notes.map((n, i) => '<section class="pn-ver"><h2><span class="pn-v">Version ' + n.v + '</span>' + (i === 0 ? '<span class="pn-latest">Latest</span>' : '') + '<span class="pn-date">' + pnEsc(pnDate(n.date)) + '</span></h2>' + (n.title ? '<p class="pn-title">' + pnEsc(n.title) + '</p>' : '') +
    PN_SECTIONS.filter(s => n[s] && n[s].length).map(s => '<h3 class="pn-sec pn-' + s.toLowerCase() + '">' + s + '</h3><ul>' + n[s].map(pnLine).join('') + '</ul>').join('') + '</section>').join('') || '<p class="muted">No notes yet.</p>';
  list.dataset.done = '1';
}
function openNotes() {
  renderNotes();
  const c = document.getElementById('notesCard'); c.hidden = false; c.scrollTop = 0;
  setTimeout(() => document.getElementById('notesClose').focus({ preventScroll: true }), 30);
}
function closeNotes() {
  document.getElementById('notesCard').hidden = true;
  const b = document.getElementById('notesBtn'); if (b && b.offsetParent) b.focus({ preventScroll: true });
}
(function () {
  const b = document.getElementById('notesBtn'), x = document.getElementById('notesClose'); if (!b) return;
  b.addEventListener('click', openNotes); x.addEventListener('click', closeNotes);
  // Esc shuts the page before anything else hears it
  addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('notesCard').hidden) { e.preventDefault(); e.stopImmediatePropagation(); closeNotes(); } }, true);
})();
