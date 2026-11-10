// Cloud saves, on the game's own server (server/saves.js, in the same free Upstash Redis as the scoreboard).
//
// Every browser gets a recovery code (SKR-XXXX-XXXX-XXXX-XXXX) the first time it plays. Its whole save (src/crates.js
// saveData: boats, flags, flares, weapon skins, outfits, banners, pirate tokens) goes up under that code a few
// seconds after anything changes, and is checked for news from your other devices every few minutes and whenever
// the game comes back into view. Typing the code into another phone or browser (the Crates screen's save box, or a
// #code= link) brings everything across; from then on both share the one save. Nothing is ever lost either way:
// saves are merged, never replaced (every item either side has, crates by everything ever earned).
//
// Not on claude.ai (the save lives in your claude.ai account there), and not where there's no server (a file opened
// from disk). (CS is a var: the save box, src/crates.js, asks after it while the page is still loading.) The code is the only key to the save: anyone with it has it, so it's shown only on the Crates screen.
var CS = { on: false, api: '', code: '', v: 0, last: '', busy: false, again: false, store: '', status: '', err: 0, pullAt: 0, timer: 0 };
const CS_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // (no 0/O or 1/I to mix up)
const CS_RE = /SKR-?([A-HJ-NP-Z2-9]{4})-?([A-HJ-NP-Z2-9]{4})-?([A-HJ-NP-Z2-9]{4})-?([A-HJ-NP-Z2-9]{4})/;

function csNewCode() {
  const b = new Uint8Array(16); crypto.getRandomValues(b);
  let s = ''; for (let i = 0; i < 16; i++) s += CS_ABC[b[i] & 31];
  return 'SKR-' + s.match(/.{4}/g).join('-');
}
// a code as typed (any case, spaces or dashes or none): the code, or null
function csReadCode(text) { const m = String(text || '').toUpperCase().replace(/\s+/g, '').match(CS_RE); return m ? 'SKR-' + m.slice(1).join('-') : null; }
function csApiUrl() {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return '';
  const ws = typeof crewServerUrl === 'function' ? crewServerUrl() : '';
  if (ws && typeof SK !== 'undefined' && SK.SERVER) return ws.replace(/^ws/, 'http').replace(/\/ws$/, '') + '/api/save';
  return location.origin + '/api/save';
}
const csGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const csSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
async function csCall(body) {
  const r = await fetch(CS.api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ code: CS.code }, body)) });
  const o = await r.json().catch(() => ({}));
  if (o.store) CS.store = o.store;
  return [r.status, o];
}
const csNow = () => JSON.stringify(saveData());

// what's in the cloud, folded into what's here (looks too, if asked: a new device, or a code just typed in)
async function csPull(takeLooks) {
  const [st, o] = await csCall({ op: 'get' });
  if (st !== 200) throw new Error('get ' + st);
  if (o.found && o.data && mergeSave(o.data, !!takeLooks)) afterMerge();
  CS.v = o.found ? o.v | 0 : 0; csSet('skerry-cloud-v', String(CS.v));
  CS.pullAt = Date.now();
}
// what's here, up to the cloud (and if another device got there first: fold theirs in, and try again)
async function csPush() {
  for (let i = 0; i < 4; i++) {
    const now = csNow();
    const [st, o] = await csCall({ op: 'put', v: CS.v, data: JSON.parse(now) });
    if (st === 200) { CS.v = o.v | 0; csSet('skerry-cloud-v', String(CS.v)); CS.last = now; return; }
    if (st === 409) { if (o.data && mergeSave(o.data, false)) afterMerge(); CS.v = o.v | 0; continue; }
    throw new Error('put ' + st);
  }
}
// one sync at a time; another asked for while one runs goes after it
async function csSync(pull, takeLooks) {
  if (!CS.on) return;
  if (CS.busy) { CS.again = true; return; }
  CS.busy = true;
  try {
    if (pull || !CS.pullAt) await csPull(takeLooks);
    if (csNow() !== CS.last) await csPush();
    CS.err = 0;
    CS.status = CS.store === 'memory'
      ? 'Saved to this server, but it isn’t keeping saves yet (they’re lost when it restarts). Back up as well.'
      : 'Saved to the cloud. Your recovery code brings everything back on any phone or browser.';
  } catch (e) {
    CS.err++;
    CS.status = 'Couldn’t reach the cloud save just now; everything is still saved in this browser.';
  }
  CS.busy = false;
  csRender();
  if (CS.again) { CS.again = false; setTimeout(() => csSync(false), 500); }
}

// (every few seconds) anything changed? up it goes; and now and then, anything new from your other devices?
function csWatch() {
  const now = csNow();
  if (CS.on) {
    const back = CS.err ? Math.min(120000, 5000 * 2 ** CS.err) : 0;
    if (now !== CS.last && !CS.busy && Date.now() - (CS.tried || 0) > back) { CS.tried = Date.now(); csSync(false); }
    else if (Date.now() - CS.pullAt > 180000 && !document.hidden && !CS.busy) csSync(true);
  }
  // on claude.ai, the account save (src/crates.js) hears of the weapon, outfit and banner crates' changes this way
  if (typeof CLOUD !== 'undefined' && CLOUD.ref && now !== CS.seen) cloudSaveSoon();
  CS.seen = now;
}

// using a code: the one you typed in becomes this browser's, and its save and this one's are merged
async function csUseCode(text, msgEl) {
  const say = t => { if (msgEl) msgEl.textContent = t; };
  const code = csReadCode(text);
  if (!code) { say('That doesn’t look like a recovery code (SKR-XXXX-XXXX-XXXX-XXXX).'); return false; }
  if (!CS.on) { say('Recovery codes work on the game’s own site, not here.'); return false; }
  if (code === CS.code) { say('That’s this browser’s code already.'); return true; }
  const old = CS.code;
  CS.code = code; CS.v = 0; CS.pullAt = 0; CS.last = '';
  say('Loading that save…');
  try {
    const [st, o] = await csCall({ op: 'get' });
    if (st !== 200) throw new Error('get ' + st);
    if (!o.found) { CS.code = old; say('No save found for that code. Check it and try again.'); return false; }
    const changed = mergeSave(o.data, true);
    afterMerge();
    CS.v = o.v | 0; CS.pullAt = Date.now();
    csSet('skerry-cloud-code', code); csSet('skerry-cloud-v', String(CS.v));
    await csPush();
    if (typeof markBackedUp === 'function') markBackedUp();
    say(changed ? 'Save loaded. This browser now shares it: what you get here is saved there too.' : 'You already had everything in that save; this browser now shares it.');
    csRender();
    return true;
  } catch (e) { CS.code = old; say('Couldn’t reach the cloud save just now. Try again in a moment.'); return false; }
}

// the Crates screen: the status, the code and its copy button
function csRender() {
  if (typeof renderSaveBox === 'function') renderSaveBox();
  const box = $('cloudBox'); if (!box) return;
  box.hidden = !CS.on;
  if (!CS.on) return;
  $('cloudCode').textContent = CS.code;
  $('cloudStatus').textContent = CS.status || 'Connecting to the cloud save…';
}
async function csCopy() {
  const msg = $('saveMsg');
  try { await navigator.clipboard.writeText(CS.code); if (msg) msg.textContent = 'Recovery code copied. Keep it somewhere safe (a note, a message to yourself): it brings everything back, and whoever has it has your save.'; if (typeof markBackedUp === 'function') markBackedUp(); }
  catch (e) { if (msg) msg.textContent = 'Your recovery code is ' + CS.code + '. Write it down somewhere safe.'; }
}

function csInit() {
  if (window.claude && typeof window.claude.use === 'function') { setInterval(csWatch, 4000); return; }
  CS.api = csApiUrl();
  if (!CS.api || typeof fetch !== 'function' || !window.crypto || !crypto.getRandomValues) return;
  CS.code = csReadCode(csGet('skerry-cloud-code')) || '';
  const fresh = !CS.code;
  if (fresh) { CS.code = csNewCode(); csSet('skerry-cloud-code', CS.code); }
  CS.v = Number(csGet('skerry-cloud-v')) || 0;
  CS.on = true;
  const copy = $('cloudCopy'); if (copy) copy.addEventListener('click', csCopy);
  csRender();
  // (a link with a code in it: #code=SKR-...)
  const m = (location.hash || '').match(/^#code=(.+)$/);
  if (m) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} setTimeout(() => csUseCode(decodeURIComponent(m[1]), null).then(ok => { if (typeof toast === 'function') toast(ok ? 'Your save was loaded from the code.' : 'That code didn’t load a save.', 'Cloud save'); }), 400); }
  else csSync(true, false);
  setInterval(csWatch, 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && CS.on && Date.now() - CS.pullAt > 20000) csSync(true); });
}
csInit();
