// The main menu on a desktop or any wide screen (style.css, "the desk menu"): a list of the seven games down the left,
// the chosen game's card in full in the middle, and the scoreboard on the right (or under the list, on a narrower
// screen). Phones, tablets held upright and phones on their side keep the long scrolling menu untouched: everything
// here is gated on DESK_MQ, and the CSS that lays it out sits inside the same media query.
//
// Keys on the menu: up and down in the list (or 1 to 7 anywhere on it) choose a game; Enter or Space presses what's
// focused. Controller: LB and RB step through the games (gamepad.js calls mdCycle), the D-pad moves as ever.
var DESK_MQ = '(min-width: 1100px) and (min-height: 620px)';
var MD = { on: false, cur: null, mq: null, nav: null, cards: [] };
// each game's card, its line under the name in the list, and its colour (the same as its banner on a phone)
const MD_GAMES = [
  { id: 'skTitle', sub: 'Night sailing · crews of up to eight', c: '#ffd88a' },
  { id: 'fpsTitle', sub: 'A shootout on the skerry', c: '#e46c4f' },
  { id: 'warTitle', sub: 'A war for the islands · up to ten', c: '#78b4a0' },
  { id: 'zmTitle', sub: 'Hold the station, round after round', c: '#d0503f' },
  { id: 'rdTitle', sub: "Maren's End and The Gannet's Wake", c: '#5a9ad8' },
  { id: 'frTitle', sub: 'Light the islands in the haar', c: '#a8b8c8' },
  { id: 'fbTitle', sub: 'An open sea of islands and salvage', c: '#d8b060', tag: 'New' },   // [fbsea]
];
const mdStore = { get() { try { return localStorage.getItem('skerryDeskGame'); } catch (e) { return null; } }, set(v) { try { localStorage.setItem('skerryDeskGame', v); } catch (e) {} } };

function mdPick(id, focusTab) {
  const card = document.getElementById(id); if (!card) return;
  MD.cur = card;
  for (const c of MD.cards) c.classList.toggle('mdon', c === card);
  if (MD.nav) for (const b of MD.nav.querySelectorAll('.md-tab')) {
    const on = b.dataset.card === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
    if (on && focusTab) b.focus({ preventScroll: true });
  }
  card.scrollTop = 0; mdStore.set(id);
}
function mdCycle(d) {
  if (!MD.on || !MD.cards.length) return false;
  const i = Math.max(0, MD.cards.indexOf(MD.cur)), n = MD.cards.length;
  const next = MD.cards[(i + d + n) % n];
  mdPick(next.id, true);
  // with a controller the highlight follows, so A plays the game just chosen
  try { if (typeof setPadFocus === 'function' && typeof PAD !== 'undefined' && PAD.connected) setPadFocus(MD.nav.querySelector('.md-tab.on')); } catch (e) {}
  return true;
}
function mdApply() {
  MD.on = !!(MD.mq && MD.mq.matches);
  const tc = document.getElementById('titleCard'); if (tc) tc.classList.toggle('mddesk', MD.on);
}

(function mdInit() {
  const tc = document.getElementById('titleCard'); if (!tc) return;
  MD.cards = MD_GAMES.map(g => document.getElementById(g.id)).filter(Boolean);
  for (const c of MD.cards) c.classList.add('modecard');
  // the list of games, built from each card's own heading so a renamed game renames itself here
  const nav = document.createElement('nav'); nav.className = 'md-nav'; nav.setAttribute('aria-label', 'Games');
  nav.innerHTML = '<div class="md-brand"><span class="md-word">Skerry Light</span><span class="md-hint">Choose a game · ↑ ↓ or 1–7</span></div><div class="md-list" role="tablist" aria-orientation="vertical"></div>';
  const list = nav.querySelector('.md-list');
  MD_GAMES.forEach((g, i) => {
    const card = document.getElementById(g.id); if (!card) return;
    const h = card.querySelector('h1'), name = h ? h.textContent.trim() : g.id;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'md-tab'; b.dataset.card = g.id;
    b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', g.id); b.style.setProperty('--mdc', g.c);
    b.innerHTML = `<span class="md-n" aria-hidden="true">${i + 1}</span><span class="md-txt"><b></b><small></small></span>${g.tag ? `<span class="md-tag">${g.tag}</span>` : ''}`;
    b.querySelector('b').textContent = name; b.querySelector('small').textContent = g.sub;
    b.addEventListener('click', () => mdPick(g.id, true));
    list.appendChild(b);
  });
  list.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); mdCycle(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); const c = MD.cards[e.key === 'Home' ? 0 : MD.cards.length - 1]; if (c) mdPick(c.id, true); }
  });
  MD.nav = nav;
  // in among the title's children, after the version line and the rejoin bar (the grid places it; this keeps tab order sensible)
  const after = document.getElementById('rejoinBar') || document.getElementById('verLine');
  if (after && after.parentNode === tc) after.after(nav); else tc.prepend(nav);
  const saved = mdStore.get();
  mdPick(MD.cards.some(c => c.id === saved) ? saved : MD_GAMES[0].id, false);
  MD.mq = matchMedia(DESK_MQ);
  if (MD.mq.addEventListener) MD.mq.addEventListener('change', mdApply); else if (MD.mq.addListener) MD.mq.addListener(mdApply);
  mdApply();

  // Everything that sends you to a game's card (its banner, a shared invite, a lobby, the rejoin bar) does it with
  // scrollIntoView: on the desk menu, that chooses the game first, then scrolls within its card as before.
  const orig = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (o) {
    if (MD.on && this.closest) {
      const c = this.closest('#titleCard > .modecard');
      if (c) { if (c !== MD.cur) mdPick(c.id, false); if (c === this) { c.scrollTop = 0; return; } }
    }
    return orig.call(this, o);
  };

  // 1 to 7 choose a game while the menu is the top screen and nothing's being typed
  addEventListener('keydown', e => {
    if (!MD.on || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (!/^[1-7]$/.test(e.key) || tc.hidden || (typeof state !== 'undefined' && state !== 'title')) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (typeof activeOverlay === 'function' && activeOverlay() !== tc) return;
    const c = MD.cards[+e.key - 1]; if (c) { e.preventDefault(); mdPick(c.id, true); }
  });
})();
