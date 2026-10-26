// Xbox (and other standard-layout) controllers, through the browser's Gamepad API.
//
// Sailing: left stick or D-pad steers; RT makes sail (faster), LT shortens it (slower), or push the
// stick up and down; A rings the bell, X fires a flare. RB watches the next crewmate when spectating.
// Menus: D-pad or stick moves between buttons, A presses, B closes the crates (or goes back),
// Start presses the main button. Hits and jumpscares rumble the controller.

const PAD = { steer: 0, sail: 0, connected: false, prev: [], navT: 0, focusIdx: -1 };
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
function moveFocus(dir) {
  const root = activeOverlay(); if (!root) return;
  const list = focusables(root); if (!list.length) return;
  let i = list.indexOf(document.activeElement);
  i = i < 0 ? (dir > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, i + dir));
  setPadFocus(list[i]);
}
function setPadFocus(el) {
  for (const o of document.querySelectorAll('.padfocus')) o.classList.remove('padfocus');
  el.classList.add('padfocus');
  el.focus({ preventScroll: true });
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

  if (state === 'play' && activeOverlay() === null) {
    PAD.steer = Math.max(-1, Math.min(1, ax + (pressed(p, 15) ? 1 : 0) - (pressed(p, 14) ? 1 : 0)));
    PAD.sail = Math.max(-1, Math.min(1, rt - lt - ay * 0.8 + (pressed(p, 12) ? 1 : 0) - (pressed(p, 13) ? 1 : 0)));
    if (down(0)) ringBell();
    if (down(2)) fireFlare();
  } else {
    PAD.steer = PAD.sail = 0;
    // watching a crewmate: RB for the next ship, A rings your one bell for them
    if (typeof NET !== 'undefined' && NET.watch) {
      if (down(5)) nextSpectate();
      if (down(0) && !$('specGhost').disabled) $('specGhost').click();
      if (down(1)) $('specBack').click();
    } else {
      const root = activeOverlay();
      if (root) {
        // move between buttons, with a little repeat when the stick is held
        PAD.navT -= dt;
        const v = (pressed(p, 13) || ay > 0.6 || pressed(p, 15) || ax > 0.6) ? 1 : (pressed(p, 12) || ay < -0.6 || pressed(p, 14) || ax < -0.6) ? -1 : 0;
        if (v && PAD.navT <= 0) { moveFocus(v); PAD.navT = PAD.navT < -0.05 ? 0.28 : 0.14; }
        if (!v) PAD.navT = -0.1;
        if (down(0)) {
          const el = root.contains(document.activeElement) && document.activeElement !== document.body ? document.activeElement : mainButton(root);
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
  h.textContent = PAD.connected ? 'Left stick steer · RT / LT sail · A bell · X flare' : '← → steer · ↑ ↓ sail · Space bell · F flare';
}

window.addEventListener('gamepadconnected', () => { PAD.prev = []; });
window.addEventListener('gamepaddisconnected', () => { if (!firstPad()) { PAD.connected = false; PAD.steer = PAD.sail = 0; updateHint(); } });
// the mouse or a touch takes over again: drop the controller's focus ring
window.addEventListener('pointerdown', () => { for (const o of document.querySelectorAll('.padfocus')) o.classList.remove('padfocus'); }, true);
