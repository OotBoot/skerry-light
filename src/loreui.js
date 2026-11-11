'use strict';
// The Skerry Compendium page: a button beside Patch notes on the main menu opens the lore book (LORE, in src/lore.js),
// laid out like a wiki: a sidebar with search, the main page, the timeline, a random article and the categories;
// articles with an infobox, a contents box, cross-links, See also, What links here and their categories at the foot.
// Esc, the close button or B on a controller shuts it; the Back button (or Backspace) goes to the last page read.
var LW = { cur: null, hist: [], byId: null, back: null };
function lwEsc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function lwIndex() {
  if (LW.byId) return; LW.byId = {}; LW.back = {};
  for (const a of LORE) LW.byId[a.id] = a;
  // what links here: every article whose text, infobox or See also names another
  for (const a of LORE) { const seen = new Set(); for (const m of lwAllText(a).matchAll(/\[\[([a-z0-9_]+)/g)) seen.add(m[1]); for (const x of a.also || []) seen.add(x); seen.delete(a.id); for (const id of seen) (LW.back[id] = LW.back[id] || []).push(a.id); }
}
function lwAllText(a) { return [a.sum, ...(a.box || []).map(r => r[1]), ...(a.secs || []).flatMap(s => s.p)].join(' '); }
// the article text's own markup: [[id]] and [[id|words]] become links; <b> and <i> are kept, nothing else is expected
// (a bare link to a title beginning "The" says "the" in the middle of a sentence)
function lwLinks(t) { return t.replace(/\[\[([a-z0-9_]+)(?:\|([^\]]+))?\]\]/g, (_, id, w, at, all) => { const a = LW.byId[id]; let x = w || (a ? a.t : id); if (!w && /^The /.test(x) && at > 0 && !/(^|[.!?:>]\s*)$/.test(all.slice(Math.max(0, at - 4), at))) x = 't' + x.slice(1); return a ? '<a href="#" class="lw-a" data-a="' + id + '">' + x + '</a>' : '<span class="lw-red">' + x + '</span>'; }); }
function lwPlain(t) { return t.replace(/\[\[([a-z0-9_]+)(?:\|([^\]]+))?\]\]/g, (_, id, w) => w || (LW.byId[id] ? LW.byId[id].t : id)).replace(/<[^>]+>/g, ''); }
// the pictures the game already has: Maren, Plimsoll, Knock, Verity, and the visitors' (foe:<key>)
function loreImg(k) {
  if (!k) return null;
  if (k.startsWith('foe:')) return typeof FOE_ASSETS !== 'undefined' ? FOE_ASSETS[k.slice(4)] : null;
  const A = typeof SK !== 'undefined' && SK.ASSETS; if (!A) return null;
  return ({ maren: A.maren, plim: A.plimsoll, knock: A.knock, verity: A.verity })[k] || null;
}
function lwSlug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
function lwCatLinks(cats) { return cats.map(c => '<a href="#" class="lw-a" data-c="' + lwEsc(c) + '">' + lwEsc(c) + '</a>').join(''); }
function lwCatBar(cats) { return '<div class="lw-catbar"><b>Categories:</b> ' + lwCatLinks(cats) + '</div>'; }
function lwHeader(title, sub) { return '<h1 class="lw-h1" id="loreHead">' + title + '</h1><p class="lw-from">' + (sub || 'From the Skerry Compendium, the record of the Light') + '</p>'; }

function lwArticle(a) {
  let h = lwHeader(lwEsc(a.t));
  const img = loreImg(a.img);
  if (a.box && a.box.length || img) {
    h += '<aside class="lw-box"><div class="lw-boxhead">' + lwEsc(a.t) + '</div>' + (img ? '<div class="lw-boximg"><img src="' + img + '" alt=""></div>' : '') +
      '<table>' + (a.box || []).map(r => '<tr><th scope="row">' + lwEsc(r[0]) + '</th><td>' + lwLinks(lwEsc(r[1]).replace(/&lt;(\/?[bi])&gt;/g, '<$1>')) + '</td></tr>').join('') + '</table></aside>';
  }
  h += '<p class="lw-sum">' + lwLinks(a.sum) + '</p>';
  const named = (a.secs || []).filter(s => s.h);
  if (named.length >= 3) h += '<nav class="lw-toc" aria-label="Contents"><b>Contents</b><ol>' + named.map(s => '<li><a href="#" class="lw-a" data-s="' + lwSlug(s.h) + '">' + lwEsc(s.h) + '</a></li>').join('') + '</ol></nav>';
  for (const s of a.secs || []) h += (s.h ? '<h2 id="lw-s-' + lwSlug(s.h) + '">' + lwEsc(s.h) + '</h2>' : '') + s.p.map(p => '<p>' + lwLinks(p) + '</p>').join('');
  if (a.gal) h += '<h2>Gallery</h2><div class="lw-gal">' + a.gal.map(k => { const src = loreImg('foe:' + k); return src ? '<figure><img src="' + src + '" alt=""><figcaption>' + lwEsc((typeof FOE_NAMES !== 'undefined' && FOE_NAMES[k]) || k) + '</figcaption></figure>' : ''; }).join('') + '</div>';
  if (a.also && a.also.length) h += '<h2>See also</h2><ul class="lw-list">' + a.also.filter(id => LW.byId[id]).map(id => '<li>' + lwLinks('[[' + id + ']]') + '</li>').join('') + '</ul>';
  const back = (LW.back[a.id] || []).filter(id => !(a.also || []).includes(id));
  if (back.length) h += '<details class="lw-what"><summary>What links here (' + back.length + ')</summary><ul class="lw-list">' + back.map(id => '<li>' + lwLinks('[[' + id + ']]') + '</li>').join('') + '</ul></details>';
  return h + lwCatBar(a.cat);
}
function lwByTitle(a, b) { const k = t => t.replace(/^the /i, ''); return k(a.t).localeCompare(k(b.t)); }
function lwCategory(c) {
  const cat = LORE_CATS.find(x => x.k === c), list = LORE.filter(a => a.cat.includes(c)).sort(lwByTitle);
  let h = lwHeader('Category: ' + lwEsc(c)) + '<p class="lw-sum">' + lwEsc(cat ? cat.d : '') + ' There ' + (list.length === 1 ? 'is 1 page' : 'are ' + list.length + ' pages') + ' in this category.</p><div class="lw-cols">';
  let letter = '';
  for (const a of list) { const L = a.t.replace(/^the /i, '')[0].toUpperCase(); if (L !== letter) { h += (letter ? '</ul>' : '') + '<h3>' + L + '</h3><ul class="lw-list">'; letter = L; } h += '<li>' + lwLinks('[[' + a.id + ']]') + '</li>'; }
  return h + (letter ? '</ul>' : '') + '</div>';
}
function lwAllPages() {
  return lwHeader('All pages') + '<div class="lw-cols"><ul class="lw-list">' + LORE.slice().sort(lwByTitle).map(a => '<li>' + lwLinks('[[' + a.id + ']]') + ' <span class="lw-muted">(' + lwEsc(a.cat[0]) + ')</span></li>').join('') + '</ul></div>';
}
function lwSearch(q) {
  const n = q.trim().toLowerCase();
  const hits = !n ? [] : LORE.map(a => { const title = a.t.toLowerCase(), text = lwPlain(lwAllText(a)), at = text.toLowerCase().indexOf(n); const s = title === n ? 3 : title.includes(n) ? 2 : at >= 0 ? 1 : 0; return { a, s, at, text }; }).filter(r => r.s).sort((x, y) => y.s - x.s || lwByTitle(x.a, y.a));
  let h = lwHeader('Search results', 'For “' + lwEsc(q) + '”: ' + (hits.length ? hits.length + ' page' + (hits.length > 1 ? 's' : '') : 'nothing found'));
  if (!hits.length) return h + '<p>There is no page with those words in it. Try a name (Maren, Plimsoll, Knock), a place (the Swallow, Wrackhaven) or a year (1887), or browse the categories.</p>';
  return h + '<ul class="lw-results">' + hits.map(r => { const at = r.at; const sn = at >= 0 ? (at > 60 ? '…' : '') + lwEsc(r.text.slice(Math.max(0, at - 60), at)) + '<mark>' + lwEsc(r.text.slice(at, at + n.length)) + '</mark>' + lwEsc(r.text.slice(at + n.length, at + n.length + 110)) + '…' : lwEsc(lwPlain(r.a.sum).slice(0, 160)) + '…'; return '<li>' + lwLinks('[[' + r.a.id + ']]') + '<p>' + sn + '</p></li>'; }).join('') + '</ul>';
}
function lwMain() {
  const day = Math.floor(Date.now() / 864e5), arts = LORE.filter(a => a.cat.some(c => c !== 'Chronicles') && a.id !== 'timeline');
  const feat = arts[day % arts.length], fimg = loreImg(feat.img);
  const logs = (typeof SK !== 'undefined' && SK.LOG) || [], page = logs[day % Math.max(1, logs.length)];
  const facts = [
    "…that [[plimsoll]] was named by the hands of the schooner [[wren]], for the shoes he wears?",
    "…that the fire on [[lanternrock]] was kept for six hundred years before [[skerrylight]] was lit?",
    "…that [[knock]] stops dead the moment a light is put on him?",
    "…that the Spanish [[seafort|sea fort]] has three apothecaries, each named for a saint?",
    "…that the keeper refused to write down the year [[ironship|the iron ship]] came from?",
    "…that nobody knows who sets [[crates|the drifting crates]] adrift?",
    "…that [[maren]] is not in [[ch_reach|the Drowned Reach]], but the [[drowned]] are?",
    "…that [[pascoe|Old Pascoe]] once came home three days late with a day's beard?",
  ];
  const did = [0, 1, 2, 3].map(i => facts[(day + i * 3) % facts.length]);
  const chron = ['ch_voyages', 'ch_wreckers', 'ch_gannetswake', 'ch_lastlight', 'ch_fogrun', 'ch_marensend', 'ch_reach'].map(id => LW.byId[id]);
  return '<h1 class="lw-h1 lw-welcome" id="loreHead">Welcome to the Skerry Compendium</h1><p class="lw-from">The record of the Light that anyone can read. ' + LORE.length + ' articles, from the first fire on Lantern Rock to the wars of the Reach.</p>' +
    '<div class="lw-mp">' +
    '<section class="lw-panel lw-wide"><h2>The seven tales</h2><p>Every game is one chapter of the same history. Read them in the order they happened, or start with the <a href="#" class="lw-a" data-a="timeline">timeline</a>.</p><ol class="lw-chron">' + chron.map(a => '<li><a href="#" class="lw-a" data-a="' + a.id + '"><b>' + lwEsc(a.t) + '</b><span>' + lwEsc(a.box.find(r => r[0] === 'When')[1]) + '</span></a></li>').join('') + '</ol></section>' +
    '<section class="lw-panel"><h2>Today\'s featured article</h2>' + (fimg ? '<img class="lw-feat" src="' + fimg + '" alt="">' : '') + '<p>' + lwLinks(feat.sum) + ' (<a href="#" class="lw-a" data-a="' + feat.id + '">Read more</a>)</p></section>' +
    '<section class="lw-panel"><h2>Did you know</h2><ul class="lw-list">' + did.map(f => '<li>' + lwLinks(f) + '</li>').join('') + '</ul></section>' +
    (page ? '<section class="lw-panel"><h2>From the keeper\'s log</h2><p class="lw-logdate">' + lwEsc(page.date) + '</p><blockquote>' + lwEsc(page.text) + '</blockquote><p><a href="#" class="lw-a" data-a="log">About the log</a></p></section>' : '') +
    '<section class="lw-panel"><h2>Browse by category</h2><ul class="lw-list">' + LORE_CATS.map(c => '<li><a href="#" class="lw-a" data-c="' + lwEsc(c.k) + '">' + lwEsc(c.k) + '</a> <span class="lw-muted">(' + LORE.filter(a => a.cat.includes(c.k)).length + ')</span></li>').join('') + '<li><a href="#" class="lw-a" data-p="all">All pages</a></li></ul></section>' +
    '</div>';
}
// show a page: { a: article id } | { c: category } | { q: search } | { p: 'main' | 'all' }
function loreGo(to, noHist) {
  lwIndex();
  if (to.a && !LW.byId[to.a]) to = { p: 'main' };
  if (!noHist && LW.cur && JSON.stringify(LW.cur) !== JSON.stringify(to)) LW.hist.push(LW.cur);
  LW.cur = to;
  const m = document.getElementById('loreMain');
  m.innerHTML = to.a ? lwArticle(LW.byId[to.a]) : to.c ? lwCategory(to.c) : to.q != null ? lwSearch(to.q) : to.p === 'all' ? lwAllPages() : lwMain();
  m.scrollTop = 0; document.getElementById('loreCard').scrollTop = 0;
  document.getElementById('loreBack').disabled = !LW.hist.length;
  for (const b of document.querySelectorAll('#loreSide [data-nav]')) b.classList.toggle('on', (to.p || '') === b.dataset.nav || (to.a === 'timeline' && b.dataset.nav === 'timeline'));
  for (const b of document.querySelectorAll('#loreSide [data-c]')) b.classList.toggle('on', to.c === b.dataset.c);
}
function loreBackGo() { if (LW.hist.length) loreGo(LW.hist.pop(), true); }
function openLore(id) {
  lwIndex();
  const side = document.getElementById('loreCats');
  if (side && !side.dataset.done) { side.innerHTML = LORE_CATS.map(c => '<li><a href="#" class="lw-a" data-c="' + lwEsc(c.k) + '">' + lwEsc(c.k) + '</a></li>').join(''); side.dataset.done = '1'; }
  LW.hist = []; LW.cur = null; loreGo(id ? { a: id } : { p: 'main' }, true);
  const c = document.getElementById('loreCard'); c.hidden = false;
  setTimeout(() => document.getElementById('loreClose').focus({ preventScroll: true }), 30);
}
function closeLore() {
  document.getElementById('loreCard').hidden = true;
  const b = document.getElementById('loreBtn'); if (b && b.offsetParent) b.focus({ preventScroll: true });
}
(function () {
  const b = document.getElementById('loreBtn'), card = document.getElementById('loreCard'); if (!b || !card) return;
  b.addEventListener('click', () => openLore());
  document.getElementById('loreClose').addEventListener('click', closeLore);
  document.getElementById('loreBack').addEventListener('click', loreBackGo);
  card.addEventListener('click', e => {
    const l = e.target.closest('a.lw-a, [data-nav]'); if (!l) return; e.preventDefault();
    if (l.dataset.a) loreGo({ a: l.dataset.a });
    else if (l.dataset.c) loreGo({ c: l.dataset.c });
    else if (l.dataset.p) loreGo({ p: l.dataset.p });
    else if (l.dataset.s) { const t = document.getElementById('lw-s-' + l.dataset.s); if (t) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    else if (l.dataset.nav === 'random') { let a; do a = LORE[Math.floor(Math.random() * LORE.length)]; while (LW.cur && a.id === LW.cur.a && LORE.length > 1); loreGo({ a: a.id }); }
    else if (l.dataset.nav === 'timeline') loreGo({ a: 'timeline' });
    else if (l.dataset.nav) loreGo({ p: l.dataset.nav });
  });
  // the search box: suggestions as you type, Enter for the full results (or straight to an exact title)
  const q = document.getElementById('loreQ'), sug = document.getElementById('loreSug');
  const hideSug = () => { sug.hidden = true; sug.innerHTML = ''; };
  q.addEventListener('input', () => {
    lwIndex(); const n = q.value.trim().toLowerCase(); if (!n) return hideSug();
    const list = LORE.filter(a => a.t.toLowerCase().includes(n)).sort(lwByTitle).slice(0, 7);
    sug.innerHTML = list.map(a => '<li><a href="#" class="lw-a" data-a="' + a.id + '">' + lwEsc(a.t) + '</a></li>').join('') + '<li class="lw-sugall"><a href="#" class="lw-a lw-qall">Search for “' + lwEsc(q.value.trim()) + '”</a></li>';
    sug.hidden = false;
  });
  sug.addEventListener('click', e => { const l = e.target.closest('a'); if (!l) return; e.preventDefault(); e.stopPropagation(); if (l.classList.contains('lw-qall')) loreGo({ q: q.value }); else loreGo({ a: l.dataset.a }); hideSug(); q.blur(); });
  document.getElementById('loreForm').addEventListener('submit', e => {
    e.preventDefault(); lwIndex(); const n = q.value.trim().toLowerCase(); if (!n) return;
    const exact = LORE.find(a => a.t.toLowerCase() === n || a.t.toLowerCase().replace(/^the /, '') === n);
    loreGo(exact ? { a: exact.id } : { q: q.value }); hideSug(); q.blur();
  });
  q.addEventListener('keydown', e => e.stopPropagation());
  q.addEventListener('blur', () => setTimeout(hideSug, 200));
  // Esc shuts the page before anything else hears it; Backspace goes back a page
  addEventListener('keydown', e => {
    if (card.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (document.activeElement === q && !sug.hidden) hideSug(); else closeLore(); }
    else if (e.key === 'Backspace' && document.activeElement !== q) { e.preventDefault(); e.stopImmediatePropagation(); loreBackGo(); }
  }, true);
})();
