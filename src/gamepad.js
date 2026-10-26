// Xbox (and other standard-layout) controllers, through the browser's Gamepad API.
//
// Sailing: left stick or D-pad steers; RT makes sail (faster), LT shortens it (slower), or push the
// stick up and down; A rings the bell, X fires a flare. RB watches the next crewmate when spectating.
// Menus: the left stick moves an on-screen cursor and A clicks what it's over; the right stick scrolls.
// The D-pad jumps between buttons instead. B closes the crates (or goes back), Start presses the main button. Hits and jumpscares rumble the controller.

const PAD = { steer: 0, sail: 0, connected: false, prev: [], navT: 0, held: null, root: null, cur: null };
const DEAD = 0.18;
const dz = v => Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD);

function firstPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p && p.connected) return p;
  return null;
}

function padRumble(strong, weak, ms) {
  const p = firstPad();
  const a = p && p.vibrationActuator;
  if (!a || typeof a.playEffect !== 'function') return;
  a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
}

// the overlay currently on top, and the buttons on it you can move between
function activeOverlay() {
  for (const id of ['crateCard', 'crewCard', 'portCard', 'endCard', 'titleCard']) { const el = $(id); if (el && !el.hidden) return el; }
  return null;
}
function focusables(root) {
  return [...root.querySelectorAll('button, input, summary')].filter(el => !el.disabled && el.offsetParent !== null && !el.closest('[hidden]'));
}
// move to the nearest button in the direction pressed (dx, dy are -1, 0 or 1), the way a console menu does
function moveFocus(dx, dy) {
  const root = activeOverlay(); if (!root) return;
  const list = focusables(root); if (!list.length) return;
  const cur = PAD.cur && list.includes(PAD.cur) ? PAD.cur : document.activeElement;
  if (!cur || !list.includes(cur)) { setPadFocus(mainButton(root) || list[0]); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
    // how far it is in the pressed direction, measured edge to edge so wide buttons aren't penalised
    const along = dx ? (dx > 0 ? b.left - a.right : a.left - b.right) : (dy > 0 ? b.top - a.bottom : a.top - b.bottom);
    const centre = dx ? (bx - ax) * dx : (by - ay) * dy;
    if (centre <= 2 && along < -2) continue;   // not in that direction at all
    // left and right only move along the same row; a button well above or below isn't 'to the right'
    if (dx && Math.abs(by - ay) > Math.max(a.height, b.height) * 0.75) continue;
    if (dy && centre <= 2) continue;
    // sideways offset: zero if they overlap on the other axis
    const side = dx ? Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)) : Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
    const score = Math.max(0, along) + side * 2.5 + Math.abs(dx ? by - ay : bx - ax) * 0.3;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  // nothing further that way: up/down wraps along the list order, left/right stays put
  if (!best && dy) {
    const i = list.indexOf(cur);
    best = dy > 0 ? list[Math.min(list.length - 1, i + 1)] : list[Math.max(0, i - 1)];
  }
  if (best) setPadFocus(best);
}
function setPadFocus(el) {
  for (const o of document.querySelectorAll('.padfocus')) o.classList.remove('padfocus');
  el.classList.add('padfocus');
  // a text box only gets the ring: focusing it would pop up the keyboard on a phone or tablet
  if (el.tagName !== 'INPUT') el.focus({ preventScroll: true });
  else if (document.activeElement && document.activeElement !== el) document.activeElement.blur();
  PAD.cur = el;
  el.scrollIntoView({ block: 'nearest' });
}
function mainButton(root) {
  return focusables(root).find(el => el.classList.contains('primary')) || focusables(root)[0] || null;
}

function pressed(p, i) { return !!(p.buttons[i] && p.buttons[i].pressed); }

function pollPad(dt) {
  const p = firstPad();
  if (!p) {
    if (PAD.connected) { PAD.connected = false; PAD.steer = PAD.sail = 0; updateHint(); }
    return;
  }
  if (!PAD.connected) { PAD.connected = true; updateHint(); if (typeof toast === 'function') toast('Controller connected. A rings the bell, X fires a flare.', 'Controller connected'); }
  const now = p.buttons.map(b => b.pressed);
  const down = i => now[i] && !PAD.prev[i];
  const ax = dz(p.axes[0] || 0), ay = dz(p.axes[1] || 0);
  const lt = p.buttons[6] ? p.buttons[6].value : 0, rt = p.buttons[7] ? p.buttons[7].value : 0;

  if (state === 'play' && activeOverlay() === null && !(typeof NET !== 'undefined' && NET.watch)) {
    hideCursor();
    PAD.steer = Math.max(-1, Math.min(1, ax + (pressed(p, 15) ? 1 : 0) - (pressed(p, 14) ? 1 : 0)));
    PAD.sail = Math.max(-1, Math.min(1, rt - lt - ay * 0.8 + (pressed(p, 12) ? 1 : 0) - (pressed(p, 13) ? 1 : 0)));
    if (down(0)) ringBell();
    if (down(2)) fireFlare();
    if (down(3)) toggleView();
  } else {
    PAD.steer = PAD.sail = 0;
    // the analog sticks drive an on-screen cursor in menus: left stick moves it, right stick scrolls
    const rx = dz(p.axes[2] || 0), ry = dz(p.axes[3] || 0);
    const usedCursor = moveCursor(ax, ay, rx, ry, dt);
    if (usedCursor && down(0)) { cursorClick(); PAD.prev = now; return; }
    // watching a crewmate: RB for the next ship, A rings your one bell for them
    if (typeof NET !== 'undefined' && NET.watch) {
      if (down(5)) nextSpectate();
      if (down(0) && !$('specGhost').disabled) $('specGhost').click();
      if (down(1)) $('specBack').click();
    } else {
      const root = activeOverlay();
      if (root) {
        // a new screen came up: start on its main button
        if (PAD.root !== root) {
          PAD.root = root;
          const here = document.activeElement && root.contains(document.activeElement) && document.activeElement.offsetParent ? document.activeElement : null;
          const m = here && here.tagName !== 'INPUT' ? here : mainButton(root);
          if (m) setPadFocus(m);
        }
        // move between buttons: one step per press, and repeating after a moment if you hold it
        const dyN = pressed(p, 13) ? 1 : pressed(p, 12) ? -1 : 0;
        const dxN = dyN ? 0 : pressed(p, 15) ? 1 : pressed(p, 14) ? -1 : 0;
        if (dxN || dyN) hideCursor();   // the D-pad takes over from the cursor
        const dirKey = dxN + ',' + dyN;
        if (dirKey === '0,0') { PAD.held = null; }
        else if (dirKey !== PAD.held) { PAD.held = dirKey; PAD.navT = 0.4; moveFocus(dxN, dyN); }
        else { PAD.navT -= dt; if (PAD.navT <= 0) { PAD.navT = 0.13; moveFocus(dxN, dyN); } }
        if (down(0)) {
          const ringed = PAD.cur && root.contains(PAD.cur) && PAD.cur.offsetParent ? PAD.cur : null;
          const el = ringed || (root.contains(document.activeElement) && document.activeElement !== document.body ? document.activeElement : mainButton(root));
          if (el) { if (el.tagName === 'INPUT') el.focus(); else el.click(); }
        }
        if (down(9)) { const el = mainButton(root); if (el) el.click(); }
        if (down(1)) {
          if (root.id === 'crateCard') $('crateClose').click();
          else { const back = root.querySelector('.menuBtn'); if (back && back.offsetParent) back.click(); }
        }
        // pressing Y on the title opens the crates
        if (down(3)) { const cb = root.querySelector('.crateOpenBtn'); if (cb && cb.offsetParent) cb.click(); }
      }
    }
  }
  PAD.prev = now;
}

function updateHint() {
  const h = $('hint'); if (!h) return;
  h.textContent = PAD.connected ? 'Left stick steer · RT / LT sail · A bell · X flare · Y view' : '← → steer · ↑ ↓ sail · Space bell · F flare';
}

window.addEventListener('gamepadconnected', () => { PAD.prev = []; });
window.addEventListener('gamepaddisconnected', () => { if (!firstPad()) { PAD.connected = false; PAD.steer = PAD.sail = 0; updateHint(); } });
// the mouse or a touch takes over again: drop the controller's focus ring
window.addEventListener('pointerdown', () => { for (const o of document.querySelectorAll('.padfocus')) o.classList.remove('padfocus'); }, true);

// ---------- the cursor ----------
let cursorEl = null;
function cursorNode() {
  if (cursorEl) return cursorEl;
  cursorEl = document.createElement('div');
  cursorEl.id = 'padCursor'; cursorEl.setAttribute('aria-hidden', 'true');
  cursorEl.hidden = true;
  document.body.appendChild(cursorEl);
  PAD.mx = innerWidth / 2; PAD.my = innerHeight / 2;
  return cursorEl;
}
function hideCursor() {
  if (cursorEl && !cursorEl.hidden) { cursorEl.hidden = true; PAD.cursorOn = false; setHover(null); }
}
// returns true while the cursor is the thing being used (so A clicks under it, not the highlighted button)
function moveCursor(ax, ay, rx, ry, dt) {
  const c = cursorNode();
  const mag = Math.hypot(ax, ay);
  if (mag > 0) {
    if (!PAD.cursorOn) {
      // start it on the highlighted button, or the middle of the screen
      const at = PAD.cur && PAD.cur.offsetParent ? PAD.cur.getBoundingClientRect() : null;
      PAD.mx = at ? at.left + at.width / 2 : innerWidth / 2; PAD.my = at ? at.top + at.height / 2 : innerHeight / 2;
      PAD.cursorOn = true; c.hidden = false;
      for (const o of document.querySelectorAll('.padfocus')) o.classList.remove('padfocus');
    }
    const speed = 260 + 900 * Math.pow(Math.min(1, mag), 1.6);   // fine near the centre, fast at full tilt
    PAD.mx = Math.max(2, Math.min(innerWidth - 2, PAD.mx + ax / mag * speed * Math.min(1, mag) * dt));
    PAD.my = Math.max(2, Math.min(innerHeight - 2, PAD.my + ay / mag * speed * Math.min(1, mag) * dt));
  }
  // right stick scrolls the menu; the cursor also scrolls it when pushed against the top or bottom
  const root = activeOverlay();
  if (root) {
    let sc = ry * 900 * dt;
    if (PAD.cursorOn && ay > 0.3 && PAD.my > innerHeight - 30) sc += ay * 700 * dt;
    if (PAD.cursorOn && ay < -0.3 && PAD.my < 30) sc += ay * 700 * dt;
    if (sc) root.scrollTop += sc;
  }
  if (!PAD.cursorOn) return false;
  c.style.transform = 'translate(' + PAD.mx + 'px,' + PAD.my + 'px)';
  setHover(clickableAt(PAD.mx, PAD.my));
  return true;
}
function clickableAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.closest ? el.closest('button, input, summary, a, label, .pick') : null;
}
function setHover(el) {
  if (PAD.hover === el) return;
  if (PAD.hover) PAD.hover.classList.remove('padhover');
  PAD.hover = el;
  if (el) el.classList.add('padhover');
  if (cursorEl) cursorEl.classList.toggle('over', !!el);
}
function cursorClick() {
  const el = clickableAt(PAD.mx, PAD.my);
  if (cursorEl) { cursorEl.classList.remove('press'); void cursorEl.offsetWidth; cursorEl.classList.add('press'); }
  if (!el || el.disabled) return;
  if (el.tagName === 'INPUT') { el.focus(); return; }
  if (el.tagName === 'LABEL' && el.htmlFor) { const t = document.getElementById(el.htmlFor); if (t) { t.focus(); return; } }
  el.click();
}
