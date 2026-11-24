'use strict';
// The Lamp Road's HUD and its cards, laid over the 3D view (#lrUI, built here the first time a match starts):
//  - the objective bar at the top: the Wain's road with its checkpoints, how far it has come, and what it's doing
//    (pushing, contested, rolling back, halted), the clock (and overtime, with the moment left in it);
//  - the kill feed (top right); your hero, name and health (bottom left); your ammunition, the secondary and both
//    abilities with their cooldowns, and the ultimate's charge with "Q ready" (bottom right);
//  - a 2D overlay canvas (#lrOv): the crosshair for your hero, the hit marker, the red flash and a mark towards
//    whoever hit you, the names over your crew and the health bars over the enemies you can see (with any overhealth,
//    and a word if they're stunned or rooted), a hero's glass (its zoom), and the touch stick on a phone;
//  - the hero select (every hero in LR_HERO_IDS, in three columns by role, a small card each: portrait, name, title,
//    health and its number key; the kit of the one under the pointer, focused or yours beside them), the scoreboard (Tab: both
//    crews, hero, name, eliminations, deaths, damage and healing), the pause card, and the end card (Play again,
//    Back to the menu); and the touch buttons on a phone.
// src/lr.js owns the state; this reads it, and calls back lrChoose, lrPause, lrAgain and lrExit.

var LRH = { built: false, fxSeen: 0, hitT: 9, hitHead: false, hitKill: false, hurtT: 9, hurtA: 0, pickKey: '', boardKey: '', endShown: false, last: {}, portraits: {} };
const lrhEsc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lrhTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
// (the kill feed's names for how someone went down: LR_HOW in src/lr.js, which each hero's def adds to)
function lrhCoarse() { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); }
function lrhPortrait(hero, team) {
  const k = hero + team; if (LRH.portraits[k] !== undefined) return LRH.portraits[k];
  let u = null; if (typeof lrHeroPortrait === 'function') try { u = lrHeroPortrait(hero, team); } catch (e) { u = null; }
  return (LRH.portraits[k] = u || null);
}
function lrhFace(hero, team, cls) {
  const u = lrhPortrait(hero, team), H = LR_HEROES[hero];
  return u ? `<img class="${cls}" src="${u}" alt="">` : `<span class="${cls} lr-face lr-face-${hero}" style="--tc:${LR_TEAMS[team].col};--tc2:${LR_TEAMS[team].col2}" aria-hidden="true">${H.n[0]}</span>`;
}

function lrHudBuild() {
  if (LRH.built) return;
  LRH.built = true;
  const ui = document.createElement('div'); ui.id = 'lrUI'; ui.hidden = true;
  ui.innerHTML = `
    <canvas id="lrCv"></canvas>
    <canvas id="lrOv" aria-hidden="true"></canvas>
    <div class="lr-top" aria-live="off">
      <div class="lr-obj"><div class="lr-track" id="lrTrack"><i class="lr-fill" id="lrFill"></i><span class="lr-wainmk" id="lrWainMk"></span></div>
        <div class="lr-objrow"><span class="lr-st" id="lrSt">Halted</span><time class="lr-clock" id="lrClock">3:00</time></div></div>
    </div>
    <div class="lr-feed" id="lrFeed"></div>
    <div class="lr-msg" id="lrMsg" role="status"></div>
    <div class="lr-dead" id="lrDead" hidden></div>
    <div class="lr-me" id="lrMeBox"><span id="lrFace"></span><div class="lr-mecol"><div class="lr-mename"><b id="lrHeroN">—</b><small id="lrMyName"></small></div><div class="lr-hp"><i id="lrHpFill"></i><i class="lr-oh" id="lrOhFill"></i><span id="lrHpN">0</span></div><span class="lr-status" id="lrStatus" hidden></span></div></div>
    <div class="lr-kit" id="lrKit">
      <div class="lr-ammo" id="lrAmmo"><b id="lrAmmoN">18</b><small id="lrAmmoM">/ 18</small><i id="lrReload"></i></div>
      <div class="lr-abs"><div class="lr-ab" id="lrAbAlt"><i></i><b></b><small>RMB</small><span></span></div><div class="lr-ab" id="lrAbA1"><i></i><b></b><small>Shift</small><span></span></div><div class="lr-ab" id="lrAbA2"><i></i><b></b><small>E</small><span></span></div></div>
      <div class="lr-ult" id="lrUlt"><div class="lr-ultring" id="lrUltRing"><b id="lrUltN">0%</b><small id="lrUltK">Q</small></div><span class="lr-ultname" id="lrUltName"></span></div>
    </div>
    <div class="lr-tools"><button class="gfbtn sm" id="lrMenuBtn" type="button" aria-label="Menu" title="Menu (Esc)">☰</button><button class="gfbtn sm" id="lrBoardBtn" type="button" title="Scores (Tab)">Scores</button><button class="gfbtn sm" id="lrHeroBtn" type="button" title="Change hero (H)">Hero</button></div>
    <div class="lr-pad" id="lrPad" hidden>
      <div class="lr-padr">
        <button class="gfbtn lr-pfire" data-k="fire" type="button">Fire</button>
        <button class="gfbtn" data-k="alt" type="button" id="lrTAlt">Alt</button>
        <button class="gfbtn" data-k="jump" type="button">Jump</button>
        <button class="gfbtn" data-k="a1" type="button" id="lrTA1">1</button>
        <button class="gfbtn" data-k="a2" type="button" id="lrTA2">2</button>
        <button class="gfbtn lr-pult" data-k="ult" type="button">Ult</button>
        <button class="gfbtn" data-k="reload" type="button">Reload</button>
      </div>
    </div>
    <div class="overlay pausecard lr-pick" id="lrPick" hidden role="dialog" aria-modal="true" aria-labelledby="lrPickHead">
      <div class="card"><div class="lr-pickhead"><h1 id="lrPickHead">Choose your hero</h1><span class="lr-picksub" id="lrPickSub"></span></div>
        <div class="lr-pickgrid"><div class="lr-cards" id="lrCards"></div><div class="lr-pickinfo" id="lrPickInfo" aria-live="polite"></div></div><p class="muted lr-pickcrew" id="lrPickCrew"></p></div>
    </div>
    <div class="overlay lr-board" id="lrBoard" hidden aria-hidden="true"><div class="card"><div id="lrBoardIn"></div></div></div>
    <div class="overlay pausecard" id="lrPause" hidden role="dialog" aria-modal="true" aria-labelledby="lrPauseHead">
      <div class="card"><h1 id="lrPauseHead">The Lamp Road</h1><p class="muted" id="lrPauseNote">The match stops while this is open.</p>
        <div class="btnrow"><button class="primary" id="lrResume" type="button">Back to the match</button><button class="tool" id="lrPHero" type="button">Change hero</button><button class="tool" id="lrRestart" type="button">Start again</button><button class="tool" id="lrLeave" type="button">Leave the match</button></div></div>
    </div>
    <div class="overlay pausecard lr-end" id="lrEnd" hidden role="dialog" aria-modal="true" aria-labelledby="lrEndHead">
      <div class="card"><span class="eyebrow" id="lrEndEye"></span><h1 id="lrEndHead">The Light is lit</h1><p class="lr-endsub" id="lrEndSub"></p><div id="lrEndBoard"></div>
        <div class="btnrow"><button class="primary" id="lrAgainBtn" type="button">Play again</button><button class="tool" id="lrBack" type="button">Back to the menu</button></div></div>
    </div>`;
  ($('stage') || document.body).appendChild(ui);
  // the checkpoints on the track
  const tr = $('lrTrack'); for (const c of LR_MAP.cps) { const b = document.createElement('b'); b.className = 'lr-cp' + (c >= 1 ? ' lr-cpend' : ''); b.style.left = (c * 100) + '%'; tr.appendChild(b); }
  $('lrResume').addEventListener('click', () => lrPause(false));
  $('lrPHero').addEventListener('click', () => { lrPause(false); lrAskHero(); });
  $('lrRestart').addEventListener('click', () => { lrPause(false); lrAgain(); });
  $('lrLeave').addEventListener('click', () => lrExit());
  $('lrAgainBtn').addEventListener('click', () => lrAgain());
  $('lrBack').addEventListener('click', () => lrExit());
  $('lrMenuBtn').addEventListener('click', () => lrPause(true));
  $('lrHeroBtn').addEventListener('click', () => lrAskHero());
  const bb = $('lrBoardBtn'); bb.addEventListener('pointerdown', e => { e.preventDefault(); LRM.board = true; }); for (const t of ['pointerup', 'pointerleave', 'pointercancel']) bb.addEventListener(t, () => { LRM.board = false; });
  for (const b of $('lrPad').querySelectorAll('button[data-k]')) {
    const k = b.dataset.k, on = e => { e.preventDefault(); LRM.touch[k] = true; b.classList.add('on'); }, off = () => { LRM.touch[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); for (const t of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(t, off);
  }
  // (a card picks at once with a mouse or a controller; on a touch screen the first tap shows its kit, and a second, or
  // the Play button beside it, picks)
  $('lrPick').addEventListener('click', e => {
    const go = e.target.closest('[data-go]'); if (go) { lrChoose(go.dataset.go); return; }
    const c = e.target.closest('[data-hero]');
    if (c) { const id = c.dataset.hero; if (lrhCoarse() && LRH.pickSee !== id && e.pointerType !== 'mouse') { LRH.pickSee = id; lrhPickInfo(); return; } lrChoose(id); }
    else if (e.target === $('lrPick') && lrMe() && lrMe().hero && LRM.ph !== 'pick') LRM.picking = false;
  });
  const see = e => { const c = e.target.closest && e.target.closest('[data-hero]'); if (c && LRH.pickSee !== c.dataset.hero) { LRH.pickSee = c.dataset.hero; lrhPickInfo(); } };
  $('lrCards').addEventListener('pointerover', e => { if (e.pointerType === 'mouse') see(e); }); $('lrCards').addEventListener('focusin', see);
}
// the card on top, if any (for the controller)
function lrHudOverlay() { for (const id of ['lrPause', 'lrEnd', 'lrPick']) { const el = $(id); if (el && !el.hidden) return el; } return null; }
function lrHudPause(on) {
  if (!LRH.built) return;
  $('lrPause').hidden = !on; $('lrRestart').hidden = !!LRM.net; $('lrPauseNote').textContent = LRM.net ? 'The match goes on while this is open.' : 'The match stops while this is open.';
  if (on) setTimeout(() => { const b = $('lrResume'); if (b) b.focus({ preventScroll: true }); }, 30);
}
function lrhSet(el, k, v) { if (LRH.last[k] !== v) { LRH.last[k] = v; el.textContent = v; } }

// ---------- every frame ----------
function lrHud(dt) {
  if (!LRH.built || !LRM.on) return;
  const me = lrMe(), C = LRM.cart, L = (C && C.L) || lrPathLen(); if (!me) return;
  // events: the hit marker, the hurt flash
  for (const f of LRM.FX) {
    if (f.id <= LRH.fxSeen) continue; LRH.fxSeen = f.id;
    if (LRM.t - f.t > 1) continue;
    if (f.k === 'hit' && f.a === me.i && f.v !== me.i && !f.dot) { LRH.hitT = 0; LRH.hitHead = !!f.head; LRH.hitKill = false; }
    if (f.k === 'death' && f.a === me.i && f.v !== me.i) { LRH.hitT = 0; LRH.hitKill = true; }
    if (f.k === 'hit' && f.v === me.i) { LRH.hurtT = 0; const a = LRM.P[f.a]; if (a) LRH.hurtA = Math.atan2(a.x - me.x, a.z - me.z); LRH.hurtFrom = !!a; }
  }
  if (LRM.fxId < LRH.fxSeen) LRH.fxSeen = 0;
  LRH.hitT += dt; LRH.hurtT += dt;
  // the objective
  const f = C ? C.s / L : 0;
  $('lrFill').style.width = (f * 100).toFixed(2) + '%'; $('lrWainMk').style.left = (f * 100).toFixed(2) + '%';
  let st;
  if (LRM.ph === 'pick') st = 'Choosing heroes · ' + lrhTime(LRM.phT);
  else if (LRM.ph === 'setup') st = (me.team === 0 ? 'The doors open in ' : 'Set up · they come in ') + lrhTime(LRM.phT);
  else if (LRM.ph === 'over') st = LRM.win === 0 ? 'The Light is lit' : 'The Wain is held';
  else st = C.st === 'push' ? 'Pushing' + (C.n > 1 ? ' ×' + Math.min(3, C.n) : '') : C.st === 'contest' ? 'Contested' : C.st === 'back' ? 'Rolling back' : 'Halted';
  lrhSet($('lrSt'), 'st', st); $('lrSt').dataset.s = LRM.ph === 'play' ? C.st : LRM.ph;
  lrhSet($('lrClock'), 'clock', LRM.ot ? 'Overtime' : lrhTime(LRM.ph === 'play' || LRM.ph === 'over' ? LRM.clock : LRM.clock));
  $('lrClock').classList.toggle('ot', LRM.ot); $('lrClock').classList.toggle('low', !LRM.ot && LRM.ph === 'play' && LRM.clock < 30);
  $('lrClock').style.setProperty('--ot', LRM.ot ? Math.max(0, Math.min(1, LRM.otT / 1.5)) : 1);
  // the message, and being down
  const msg = $('lrMsg'); if (LRM.msgT > 0) { lrhSet(msg, 'msg', LRM.msg); msg.classList.add('on'); } else msg.classList.remove('on');
  const dead = $('lrDead');
  if (me.hero && !me.alive && LRM.ph !== 'over') { dead.hidden = false; const a = LRM.feed.slice().reverse().find(e => e.v === me.i), by = a && LRM.P[a.a]; lrhSet(dead, 'dead', (by ? 'Downed by ' + by.name + ' · ' : '') + 'Back in ' + Math.ceil(Math.max(0, me.deadT)) + ' · H to change hero'); }
  else dead.hidden = true;
  // you
  const H = LR_HEROES[me.hero];
  if (H) {
    if (LRH.last.face !== me.hero + me.team) { LRH.last.face = me.hero + me.team; $('lrFace').innerHTML = lrhFace(me.hero, me.team, 'lr-portrait'); }
    lrhSet($('lrHeroN'), 'hn', H.n); lrhSet($('lrMyName'), 'mn', me.name + ' · ' + LR_TEAMS[me.team].name);
    const hf = Math.max(0, me.hp) / me.maxHp, of = Math.max(0, Math.min(1 - Math.min(1, hf), (me.oh || 0) / me.maxHp));
    $('lrHpFill').style.width = (hf * 100).toFixed(1) + '%'; $('lrHpFill').classList.toggle('low', hf < 0.35); lrhSet($('lrHpN'), 'hp', Math.ceil(Math.max(0, me.hp)) + (me.oh >= 1 ? ' +' + Math.ceil(me.oh) : '') + ' / ' + me.maxHp);
    const ohEl = $('lrOhFill'); ohEl.style.left = (Math.min(1, hf) * 100).toFixed(1) + '%'; ohEl.style.width = (of * 100).toFixed(1) + '%'; ohEl.style.display = me.oh >= 1 ? '' : 'none';
    $('lrMeBox').classList.toggle('brace', me.drT > 0 && me.dr < 1);
    const stx = me.stun > 0 ? 'Stunned ' + me.stun.toFixed(1) : me.root > 0 ? 'Rooted ' + me.root.toFixed(1) : ''; lrhSet($('lrStatus'), 'status', stx); $('lrStatus').hidden = !stx;
    if (H.mag) { lrhSet($('lrAmmoN'), 'am', me.reload > 0 ? '…' : String(me.ammo)); lrhSet($('lrAmmoM'), 'amm', '/ ' + H.mag); $('lrReload').style.width = me.reload > 0 ? ((1 - me.reload / H.reloadT) * 100).toFixed(0) + '%' : '0%'; }
    else { lrhSet($('lrAmmoN'), 'am', '∞'); lrhSet($('lrAmmoM'), 'amm', 'melee'); $('lrReload').style.width = '0%'; }
    const ab = (id, k, key) => {
      // (lit while it's on, and "up" while what it made stands: the hero's abil hook says, else the secondary while held)
      const el = $(id), cd = me.cd[k] || 0, max = H.cd[k] || 1, A = H.abil ? H.abil(me, k) || {} : { on: k === 'alt' && me.alt }, wall = !!A.up, on = !!A.on;
      const name = H.kit[k][0], txt = wall ? 'up' : cd > 0 && cd < 90 ? Math.ceil(cd) + '' : '';
      if (LRH.last[id + 'n'] !== name) { LRH.last[id + 'n'] = name; el.querySelector('b').textContent = name; }
      lrhSet(el.querySelector('span'), id + 't', txt); el.querySelector('i').style.height = cd > 0 && cd < 90 ? Math.min(100, cd / max * 100).toFixed(0) + '%' : '0%';
      el.classList.toggle('cd', cd > 0 || wall); el.classList.toggle('on', !!on);
    };
    ab('lrAbAlt', 'alt'); ab('lrAbA1', 'a1'); ab('lrAbA2', 'a2');
    const u = Math.floor(me.ult * 100), ready = me.ult >= 1;
    lrhSet($('lrUltN'), 'ult', ready ? 'Ready' : u + '%'); lrhSet($('lrUltK'), 'ultk', ready ? 'Q ready' : 'Q'); lrhSet($('lrUltName'), 'ultn', H.kit.ult[0]);
    $('lrUltRing').style.setProperty('--p', (me.ult * 100).toFixed(1) + '%'); $('lrUlt').classList.toggle('ready', ready);
    const coarse = lrhCoarse(); $('lrAbAlt').querySelector('small').textContent = coarse ? 'Alt' : 'RMB'; $('lrAbA1').querySelector('small').textContent = coarse ? '1' : 'Shift'; $('lrAbA2').querySelector('small').textContent = coarse ? '2' : 'E'; $('lrUltK').dataset.c = coarse ? 1 : 0;
  }
  $('lrMeBox').hidden = !H; $('lrKit').hidden = !H;
  $('lrPad').hidden = !lrhCoarse() || !me.hero || LRM.ph === 'over';
  if (H && !$('lrPad').hidden) for (const b of $('lrPad').querySelectorAll('button[data-k]')) {
    const k = b.dataset.k; if (!['alt', 'a1', 'a2', 'ult'].includes(k)) continue;
    const cd = k === 'ult' ? 0 : me.cd[k] || 0, name = H.kit[k][2] || H.kit[k][0].split(' ')[0], txt = k === 'ult' ? (me.ult >= 1 ? name : Math.floor(me.ult * 100) + '%') : cd > 0 && cd < 90 ? name + ' ' + Math.ceil(cd) : name;
    if (b.textContent !== txt) b.textContent = txt; b.classList.toggle('cd', (k === 'ult' && me.ult < 1) || (cd > 0)); b.classList.toggle('ready', k === 'ult' && me.ult >= 1);
  }
  lrhFeed();
  // the cards
  const picking = (LRM.ph === 'pick' && !me.hero && !me.bot) || LRM.picking;
  $('lrPick').hidden = !picking; if (picking) lrhPick(); else LRH.pickKey = '';
  const board = LRM.board && LRM.ph !== 'over' && !picking;
  $('lrBoard').hidden = !board; if (board) lrhBoard($('lrBoardIn'), 'b');
  // (the end card comes up a couple of seconds after the end, by the wall clock)
  if (LRM.ph === 'over') { if (!LRH.overAt) LRH.overAt = performance.now(); } else LRH.overAt = 0;
  const end = LRM.ph === 'over' && performance.now() - LRH.overAt > 2200;
  if (end && !LRH.endShown) { LRH.endShown = true; lrhEnd(); if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) {} }
  if (!end) LRH.endShown = false;
  $('lrEnd').hidden = !end;
  document.body.classList.toggle('lrfree', !!(picking || end || LRM.paused));
  lrhOverlay(dt, me);
}
function lrhFeed() {
  const el = $('lrFeed'), list = LRM.feed.filter(e => LRM.t - e.t < 7).slice(-5), key = list.map(e => e.t + ':' + e.v).join('|');
  if (key === LRH.feedKey) return; LRH.feedKey = key;
  const who = i => { const p = LRM.P[i]; return p ? `<b class="lr-t${p.team}${i === LRM.me ? ' lr-you' : ''}">${lrhEsc(p.name)}</b>` : ''; };
  el.innerHTML = list.map(e => `<div class="lr-fl">${e.a >= 0 && e.a !== e.v ? who(e.a) + `<span class="lr-how">${lrhEsc(LR_HOW[e.how] || 'downed')}</span>` : '<span class="lr-how">down</span>'}${who(e.v)}</div>`).join('');
}
// the hero select: every hero in three columns by role (Tank, Damage, Support), a small card each (portrait, name,
// title, health, its number key), and the kit of the one under the pointer (or focused, or tapped, or yours) beside them
function lrhPick() {
  const me = lrMe(), key = me.team + ':' + me.hero + ':' + Math.ceil(LRM.phT) + ':' + LRM.ph + ':' + LRM.P.filter(p => p.team === me.team).map(p => p.hero).join(',') + ':' + lrhCoarse();
  if (key === LRH.pickKey) return; const first = !LRH.pickKey; LRH.pickKey = key;
  if (first) LRH.pickSee = me.hero || '';
  $('lrPickSub').textContent = LRM.ph === 'pick' ? 'You play for the ' + LR_TEAMS[me.team].name + ' (' + LR_TEAMS[me.team].verb + ') · ' + lrhTime(LRM.phT) : 'In your spawn or while you’re down · Esc to keep ' + (LR_HEROES[me.hero] ? LR_HEROES[me.hero].n : 'yours');
  const taken = {}; for (const p of LRM.P) if (p.team === me.team && p !== me && p.hero) taken[p.hero] = (taken[p.hero] || 0) + 1;
  const focus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.hero : null;
  $('lrCards').innerHTML = LR_ROLES.map(([role, roleN]) => {
    const list = LR_HERO_IDS.filter(id => LR_HEROES[id].role === role); if (!list.length) return '';
    return `<div class="lr-rolecol lr-r-${role}"><h2 class="lr-rolehead"><em>${roleN}</em></h2>${list.map(id => {
      const H = LR_HEROES[id], n = LR_HERO_IDS.indexOf(id), cur = me.hero === id;
      return `<button class="lr-hcard lr-r-${role}${cur ? ' cur' : ''}" type="button" data-hero="${id}" aria-label="${lrhEsc(H.n + ', ' + H.title + ', ' + H.roleN + ', ' + H.hp + ' health')}">
        ${lrhFace(id, me.team, 'lr-hc-face')}<span class="lr-hc-name"><b>${lrhEsc(H.n)}</b><small>${lrhEsc(H.title)}</small><span class="lr-hc-hp">${H.hp} health${taken[id] ? '<i>' + (taken[id] > 1 ? taken[id] + ' in your crew' : 'in your crew') + '</i>' : ''}</span></span>${n < 9 ? `<kbd>${n + 1}</kbd>` : ''}</button>`;
    }).join('')}</div>`;
  }).join('');
  if (focus) { const b = $('lrCards').querySelector(`[data-hero="${focus}"]`); if (b) b.focus({ preventScroll: true }); }
  lrhPickInfo(true);
  const crew = LRM.P.filter(p => p.team === me.team && p !== me && p.hero).map(p => `${lrhEsc(p.name)} (${LR_HEROES[p.hero].n})`);
  $('lrPickCrew').innerHTML = crew.length ? 'Your crew: ' + crew.join(', ') : '';
  if (first) setTimeout(() => { const b = $('lrCards').querySelector('.lr-hcard.cur') || $('lrCards').querySelector('.lr-hcard'); if (b && typeof PAD !== 'undefined' && PAD.connected) b.focus({ preventScroll: true }); }, 30);
}
// the kit of the hero being looked at, beside the cards
function lrhPickInfo(force) {
  const me = lrMe(); if (!me) return;
  const id = LR_HEROES[LRH.pickSee] ? LRH.pickSee : LR_HEROES[me.hero] ? me.hero : LR_HERO_IDS[0], H = LR_HEROES[id]; if (!H) return;
  const k2 = id + ':' + me.hero + ':' + me.team + ':' + lrhCoarse(); if (!force && LRH.infoKey === k2) return; LRH.infoKey = k2;
  for (const b of $('lrCards').querySelectorAll('.lr-hcard')) b.classList.toggle('see', b.dataset.hero === id);
  const keys = lrhCoarse() ? { pri: 'Fire', alt: 'Alt', a1: '1', a2: '2', ult: 'Ult' } : { pri: 'LMB', alt: 'RMB', a1: 'Shift', a2: 'E', ult: 'Q' }, cur = me.hero === id;
  $('lrPickInfo').className = 'lr-pickinfo lr-r-' + H.role;
  $('lrPickInfo').innerHTML = `<div class="lr-pi-top">${lrhFace(id, me.team, 'lr-pi-face')}<span class="lr-hc-name"><b>${lrhEsc(H.n)}</b><small>${lrhEsc(H.title)}</small></span></div>
    <span class="lr-hc-role"><em>${lrhEsc(H.roleN)}</em><span>${H.hp} health</span></span>
    <span class="lr-hc-blurb">${lrhEsc(H.blurb)}</span>
    <span class="lr-hc-kit">${['pri', 'alt', 'a1', 'a2', 'ult'].map(k => `<span><kbd>${keys[k]}</kbd><b>${lrhEsc(H.kit[k][0])}</b> ${lrhEsc(H.kit[k][1])}</span>`).join('')}</span>
    <button class="lr-hc-go" type="button" data-go="${id}">${cur ? 'Your hero' : 'Play ' + lrhEsc(H.n)}</button>`;
}
// the scoreboard: both crews
function lrhBoard(el, tag) {
  const rows = LRM.P.map(p => [p.i, p.team, p.hero, p.elims, p.deaths, Math.round(p.dmg), Math.round(p.heal), p.alive ? 1 : 0].join(',')).join('|');
  if (LRH[tag + 'key'] === rows && el.innerHTML) return; LRH[tag + 'key'] = rows;
  el.innerHTML = [0, 1].map(tm => {
    const T = LR_TEAMS[tm], list = LRM.P.filter(p => p.team === tm);
    return `<div class="lr-bteam lr-bt${tm}"><h2>${T.name} <small>${tm === 0 ? 'attack' : 'defend'}${LRM.win === tm ? ' · won' : ''}</small></h2><table class="lr-btable"><thead><tr><th></th><th>Name</th><th title="Eliminations">E</th><th title="Deaths">D</th><th>Damage</th><th>Healing</th></tr></thead><tbody>${list.map(p => `<tr class="${p.i === LRM.me ? 'me' : ''}${p.alive ? '' : ' down'}"><td>${p.hero ? lrhFace(p.hero, p.team, 'lr-bface') : ''}</td><td>${lrhEsc(p.name)}${p.bot ? ' <small>bot</small>' : ''}<small class="lr-bh">${p.hero ? LR_HEROES[p.hero].n : '—'}</small></td><td>${p.elims}</td><td>${p.deaths}</td><td>${Math.round(p.dmg)}</td><td>${Math.round(p.heal)}</td></tr>`).join('')}</tbody></table></div>`;
  }).join('');
}
function lrhEnd() {
  const me = lrMe(), won = LRM.win === me.team, lit = LRM.win === 0;
  $('lrEndEye').textContent = me.bot ? 'The match is over' : won ? 'Victory' : 'Defeat';
  $('lrEndHead').textContent = lit ? 'The Light is lit' : 'The Light stays dark';
  $('lrEndSub').textContent = lit ? 'The Lamplighters brought the Wain home to the foot of the Light.' : 'The Wreckers held the Lamp Wain off ' + (LRM.stage ? 'after ' + LRM.stage + ' checkpoint' + (LRM.stage === 1 ? '' : 's') : 'on the west quay') + '.';
  $('lrEnd').classList.toggle('won', won); LRH.ekey = ''; lrhBoard($('lrEndBoard'), 'e');
  setTimeout(() => { const b = $('lrAgainBtn'); if (b) b.focus({ preventScroll: true }); }, 40);
}

// ---------- the overlay canvas ----------
function lrhOverlay(dt, me) {
  const cv = $('lrOv'); if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, fp = me.alive && LRM.ph !== 'over' && me.hero;
  // names over the crew, bars over the enemies in view
  if (typeof lr3dProject === 'function' && me.hero) {
    const eye = { x: me.x, y: me.y + me.h * 0.88, z: me.z };
    c.font = '600 12px "Courier Prime", monospace'; c.textAlign = 'center';
    for (const p of LRM.P) {
      if (p === me || !p.alive || !p.hero) continue;
      const d = Math.hypot(p.x - me.x, p.z - me.z), ally = p.team === me.team; if (d > (ally ? 80 : 45)) continue;
      const s = lr3dProject(p.x, p.y + p.h + 0.35, p.z); if (!s.on || s.x < -40 || s.x > w + 40 || s.y < -40 || s.y > h + 40) continue;
      if (!ally) { const c = { x: p.x, y: p.y + p.h * 0.7, z: p.z }; if (!lrSees(eye, c)) continue; if (LRM.walls.length) { const dx = c.x - eye.x, dy = c.y - eye.y, dz = c.z - eye.z, l = Math.hypot(dx, dy, dz); if (lrBlockRay(eye.x, eye.y, eye.z, dx / l, dy / l, dz / l, l) < l - 0.2) continue; } }
      const bw = Math.max(26, Math.min(60, 900 / Math.max(6, d))), f = Math.max(0, p.hp) / p.maxHp;
      if (ally) { c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(p.name, s.x + 1, s.y - 7); c.fillStyle = LR_TEAMS[p.team].col; c.fillText(p.name, s.x, s.y - 8); }
      c.fillStyle = 'rgba(8,10,16,0.7)'; c.fillRect(s.x - bw / 2 - 1, s.y - 3, bw + 2, 6);
      c.fillStyle = ally ? (f < 0.5 ? '#ffd25a' : '#9fe0a8') : '#ff5a4a'; c.fillRect(s.x - bw / 2, s.y - 2, bw * f, 4);
      if (p.oh >= 1) { c.fillStyle = '#bfe4ff'; c.fillRect(s.x - bw / 2 + bw * Math.min(1, f), s.y - 2, bw * Math.min(1 - Math.min(1, f), p.oh / p.maxHp), 4); }
      if (p.stun > 0 || p.root > 0) { c.fillStyle = p.stun > 0 ? '#ffe070' : '#9fd0ff'; c.fillText(p.stun > 0 ? 'stunned' : 'rooted', s.x, s.y + 16); }
    }
    // the hung lanterns and the Wain's mark when it's out of sight
  }
  // a hero's glass (its zoom, while the secondary's held)
  const H = LR_HEROES[me.hero], zoom = fp && lrZoom(me) > 1;
  if (zoom) { const r = Math.min(w, h) * 0.46; c.save(); c.fillStyle = 'rgba(4,6,10,0.92)'; c.beginPath(); c.rect(0, 0, w, h); c.arc(cx, cy, r, 0, Math.PI * 2, true); c.fill(); c.strokeStyle = 'rgba(176,138,58,0.9)'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); c.restore(); }
  // the crosshair, your hero's own
  if (fp) {
    c.save(); c.strokeStyle = 'rgba(255,248,230,0.92)'; c.fillStyle = 'rgba(255,248,230,0.95)'; c.lineWidth = 2; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 3;
    if (H && H.cross) H.cross(c, cx, cy, me, zoom);
    else { c.beginPath(); c.arc(cx, cy, 9, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, 1.8, 0, 7); c.fill(); }
    if (me.stun > 0) { c.strokeStyle = 'rgba(255,224,112,0.9)'; c.beginPath(); c.arc(cx, cy, 20 + Math.sin(LRM.t * 12) * 3, 0, 7); c.stroke(); }
    c.restore();
    // the hit marker
    if (LRH.hitT < 0.18) { const k = 1 - LRH.hitT / 0.18, s = (LRH.hitKill ? 13 : LRH.hitHead ? 11 : 8) + (1 - k) * 4; c.save(); c.strokeStyle = LRH.hitKill ? `rgba(255,70,50,${k})` : LRH.hitHead ? `rgba(255,190,60,${k})` : `rgba(255,255,255,${k})`; c.lineWidth = LRH.hitKill ? 3 : 2; for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { c.beginPath(); c.moveTo(cx + dx * 5, cy + dy * 5); c.lineTo(cx + dx * s, cy + dy * s); c.stroke(); } c.restore(); }
  }
  // damage taken: the edges flash red, and a mark points towards whoever did it
  if (LRH.hurtT < 0.6 && me.hero) {
    const k = (1 - LRH.hurtT / 0.6) * (typeof flashK === 'function' ? Math.max(0.4, flashK()) : 1), g = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(200,30,20,0)'); g.addColorStop(1, `rgba(200,30,20,${0.45 * k})`); c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (LRH.hurtFrom) { const a = LRH.hurtA - (LRM.ly + Math.PI), r = Math.min(w, h) * 0.22; c.save(); c.translate(cx, cy); c.rotate(-a); c.fillStyle = `rgba(255,70,50,${0.85 * k})`; c.beginPath(); c.moveTo(0, -r - 16); c.lineTo(-14, -r); c.lineTo(14, -r); c.closePath(); c.fill(); c.restore(); }
  }
  // low health: a steady red rim
  if (me.alive && me.hp / me.maxHp < 0.3) { const g = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.75); g.addColorStop(0, 'rgba(160,20,20,0)'); g.addColorStop(1, `rgba(160,20,20,${0.22 + 0.08 * Math.sin(LRM.t * 6)})`); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  // the touch stick
  const S = LRM.stick; if (S) { c.save(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.arc(S.x0, S.y0, 56, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(S.x0 + S.dx * 56, S.y0 + S.dy * 56, 20, 0, 7); c.fill(); c.restore(); }
}
