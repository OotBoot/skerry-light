// The Lighthouse: something the keeper never wrote down, and what it pays in.
//
// A secret in the station, for whoever goes looking: nothing on screen or in the README says how it goes. The cues
// are all in the world: a glint where there shouldn't be one, a ship's bell where nobody rang it, a line in the feed
// in someone else's voice, a word over Use only when you're standing in just the right place.
// What it pays is a pirate token, the Gannet's Doubloon, kept in this browser for good (localStorage
// 'skerry-pirate', and in the save backup with the boat crates), one for every night it's done, to be spent on the
// Lighthouse's card on five things no crate holds: two outfits, two weapon finishes and a banner, one token each.
//
// ---------------------------------------------------------------------------------------------------------------
// THE SOLUTION (spoilers; kept to this comment on purpose). "Maren's Watch": the story is the 1887 wreck. The lamp
// failed at two bells; Maren Holm took the storm lantern and the skiff out to warn the brig Gannet; the Gannet broke
// up with all hands, the skiff came home empty, and the drowned at the windows are the Gannet's crew. In order:
//   1. The Keeper's Quarters: the bookshelf on the north wall has a glint on it. Stand at its right-hand end and
//      Use it ("A logbook lies open on the shelf"): Maren's last line, "Lamp out at two bells", and a far bell.
//   2. The Net Loft: a glint now shows in the nets on the rack by the west wall (the southern rack). Use only says
//      it's caught fast: cut it with the knife (V) or the cutlass. A bell's tongue drops out, and whoever cut it
//      carries it.
//   3. The Wreck Store: the Gannet's bell hangs on a bracket on its east wall, with no tongue (it only thunks when
//      struck). Carry the tongue to it and Use it to hang it back.
//   4. Ring two bells on it: strike it (shoot it, or knife or cutlass it) exactly twice, then let it fall quiet for
//      a couple of seconds. Any other count is a wrong, flat clank, and you can try again.
//   5. The Boathouse: a glint on the floor by the lifeboat on her slip. Use it: Maren's storm lantern, cold.
//      Carry it.
//   6. The Oil Store: a glint at the tap between the two tanks. Use it to fill and light the lantern, which only
//      takes in the quiet between rounds (during a round: "The wick won't take. The sea is too loud.").
//   7. The Fog-Signal House: a rusted hook by the south window (where the drowned climb in, by the fog signal).
//      Use it to hang the lit lantern. Then kill eight of the drowned within eight metres of it: each one's light
//      goes into the lantern.
//   8. Take the lantern down again (it burns gold and green now) and carry it to the top of the tower, the lantern
//      room (FPS.g.isle.zm.top), and Use it by the great lens: eight bells, the lens flares, and the Gannet's
//      Doubloon drops at your feet: a pirate token.
// If whoever carries the tongue or the lantern bleeds out or leaves, it goes back where it was found (the lantern,
// cold again, under the boat; once it has burned with the crew's lights, back on its hook).
// Together (src/zmnet.js): the host keeps the quest, as it keeps the rest of the night. Everyone sees the same
// glints and reads the same lines; anyone can do a step (a client asks the host with the 'egg' request), whoever
// cuts the tongue or takes the lantern carries it, kills by anyone count, and everyone in the night when it's done
// gets a token on their own device.
// ---------------------------------------------------------------------------------------------------------------
//
// Hooks into the mode (each marked "[egg hook]" where it sits):
//   zombies.js  zmReset -> zeReset, zmTick -> zeTick, zmNearest -> zeNearest, zmPrompt -> zePrompt, zmUse -> zeUse,
//               zmKill -> zeKill, zmResolveShot -> zeShot, zmMelee -> zeMelee, zm3dBuild -> ze3dBuild,
//               zmScene3D -> ze3d, zmHud -> zeHud
//   zmnet.js    znRequestFrom -> zeRequest, znHostSend -> zeHostSend, znApply -> zeApply
//   the cosmetics: crates.js (RARITY_PIRATE, and the save backup: ptData / ptMerge), ocrates.js, wcrates.js and
//               rcrates.js (the five items, in their own 'pirate' grade that no crate rolls)
// The map: FPI_GEN.light.set is wrapped below to note where each step is (FPS.g.isle.zm.egg), all in the ground
// floor's rooms; the last step is wherever the map says the lantern room is (FPS.g.isle.zm.top).

// ---------- where it all is ----------
{
  const set0 = FPI_GEN.light.set;
  FPI_GEN.light.set = function (H) {
    set0.call(this, H);
    const OX = FPSC.CX, OY = FPSC.CY, A = (x, y, z, ux, uy) => ({ x: OX + x, y: OY + y, z, ux: OX + (ux == null ? x : ux), uy: OY + (uy == null ? y : uy) });
    H.I.zm.egg = {
      log: A(3.05, -10.38, 1.28, 3.05, -11.05),      // the Keeper's Quarters: on the bookshelf (its right-hand end; the shelf is at x 2.5, 2 m wide)
      net: A(-24.42, -4.7, 1.3, -23.85, -4.7),       // the Net Loft: in the nets on the southern rack
      bell: A(-26.72, -3, 2.05, -27.65, -3),         // the Wreck Store: on its east wall
      boat: A(33.1, -9.2, 0.16, 33.1, -9.2),         // the Boathouse: on the floor beside the lifeboat
      tap: A(22, -18.25, 0.95, 22, -17.2),           // the Oil Store: between the tanks
      hook: A(-16.5, -20.5, 1.55, -16.5, -19.8),     // the Fog-Signal House: by the south window
    };
  };
}

const ZE_SOULS = 8, ZE_SOUL_R = 8;
// st: 0 nothing yet; 1 the log read; 2 the tongue cut free (carried); 3 hung in the bell; 4 two bells rung;
// 5 the lantern taken, cold (carried); 6 lit (carried); 7 hung on the hook, gathering; 8 full; 9 taken up (carried);
// 10 done
const ZE = { st: 0, carrier: null, souls: 0, rings: 0, fails: 0, peal: 0, pealT: 0, lastRing: -9, later: [], P: null, cele: 0, granted: false, swing: 0, t: 0, myRing: -9, flare: 0, said: {} };

function zeReset() {
  Object.assign(ZE, { st: 0, carrier: null, souls: 0, rings: 0, fails: 0, peal: 0, pealT: 0, lastRing: -9, later: [], cele: 0, granted: false, swing: 0, t: 0, myRing: -9, flare: 0, said: {} });
  const I = FPS.g && FPS.g.isle;
  ZE.P = I && I.zm && I.zm.egg || null;
}
const zeTop = () => { const I = FPS.g && FPS.g.isle; return I && I.zm && I.zm.top || null; };
const zeMine = () => ZE.carrier && ZE.carrier === FPS.me.id;
// whoever's carrying (for drawing): you, or one of the others
function zeCarrierBody() {
  if (!ZE.carrier) return null;
  if (ZE.carrier === FPS.me.id) return FPS.me;
  return FPS.remote.get(ZE.carrier) || null;
}

// ---------- the voice in the feed ----------
function zeSay(text, t) { FPS.feed.push({ text, t: t || 9 }); if (FPS.feed.length > 6) FPS.feed.shift(); }
function zeWhisper(text, delay) { ZE.later.push({ t: delay || 0, f: () => { zeSay(text, 8); zeSound('whisper'); } }); }
function zeLater(delay, f) { ZE.later.push({ t: delay, f }); }

// what happens when the quest moves on (everyone's own screen: alone, hosting, or told by the host)
function zeEnter(st, prev) {
  const me = FPS.me, P = ZE.P;
  if (st < prev) {
    // something carried went back where it came from
    if (st === 1) zeSay('The bell’s tongue is gone from the pocket that held it.');
    else if (st === 4) zeSay('Somewhere, a lantern goes out.');
    else if (st === 8) zeSay('The lantern is back on its hook.');
    return;
  }
  if (st === 1) {
    zeSay('The keeper’s log, the last page in another hand:', 10);
    zeSay('“Lamp out at two bells. Gone with the storm lantern to warn the brig. M.H.”', 12);
    zeLater(1.2, () => { zeSound('bell', P && P.bell.x, P && P.bell.y, 0.35); zeLater(0.4, () => zeSound('bell', P && P.bell.x, P && P.bell.y, 0.35)); });
    zeWhisper('“…caught in the nets…”', 6);
  } else if (st === 2) {
    zeSay('Something heavy drops out of the net: a bell’s tongue, green with the sea.');
    zeSound('thunk');
    zeWhisper('“…the Gannet lost her voice…”', 4);
  } else if (st === 3) {
    zeSay('The tongue hangs true again.');
    zeSound('hum', P && P.bell.x, P && P.bell.y);
  } else if (st === 4) {
    zeSay('Two bells. Far out, a lantern swings, and goes out.');
    zeWhisper('“The skiff came home without her.”', 3.5);
  } else if (st === 5) {
    zeSay('A storm lantern, cold, its glass cracked. Scratched on the brass: M.H.');
    zeWhisper('“…it wants oil…”', 4);
  } else if (st === 6) {
    zeSay('The wick takes. Her lantern burns again.');
    zeSound('light');
    zeWhisper('“Show them the way in, where the horn calls.”', 3.5);
  } else if (st === 7) {
    zeSay('You hang her lantern by the window. The glass fogs, as if someone breathed on it.');
    zeWhisper('“They are coming home.”', 3);
  } else if (st === 8) {
    zeSay(`${ZE_SOULS} small lights burn in her lantern. The Gannet’s crew, come in at last.`, 10);
    zeSound('soul'); zeWhisper('“Take them up to the Light.”', 3);
  } else if (st === 9) {
    zeSay('The lantern is warm, and heavier than it was.');
  } else if (st === 10) {
    zeFinish();
  }
}
// the end of it: eight bells, the great lens flaring, and a coin
function zeFinish() {
  ZE.cele = 8; ZE.flare = 3.5;
  FPS.flash = 0.7;
  ZM.banner = { text: 'Eight bells', t: 3.5, col: '#ffe9a8' };
  zeSound('eight');
  zeSay('Eight bells. The watch is over.', 10);
  zeLater(2.4, () => { zeSay('The great lens takes her light, and the sea goes quiet. Something falls at your feet: a gold coin.', 12); zeSound('coin'); });
  if (!ZE.granted) { ZE.granted = true; zeLater(2.4, () => ptGrant()); }
}

// ---------- doing it ----------
// alone or hosting: the quest moves on; joined: ask the host
function zeDo(a) { if (ZM.net === 'client') { if (typeof zmnRequest === 'function') zmnRequest('egg', a); } else zeAct(FPS.me.id, a); }
function zeSet(st) { const prev = ZE.st; if (st === prev) return; ZE.st = st; zeEnter(st, prev); }
function zeAct(sid, a) {
  const st = ZE.st;
  if (a === 'log') { if (st === 0) zeSet(1); }
  else if (a === 'net') { if (st === 1) { ZE.carrier = sid; zeSet(2); } }
  else if (a === 'tongue') { if (st === 2 && ZE.carrier === sid) { ZE.carrier = null; zeSet(3); } }
  else if (a === 'ring') zeRing(sid);
  else if (a === 'take') { if (st === 4) { ZE.carrier = sid; zeSet(5); } else if (st === 8) { ZE.carrier = sid; zeSet(9); } }
  else if (a === 'light') { if (st === 5 && ZE.carrier === sid && ZM.phase === 'break') zeSet(6); }
  else if (a === 'hang') { if (st === 6 && ZE.carrier === sid) { ZE.carrier = null; ZE.souls = 0; zeSet(7); } }
  else if (a === 'top') { if (st === 9 && ZE.carrier === sid) { ZE.carrier = null; zeSet(10); } }
}
// (alone or hosting) the bell struck
function zeRing(sid) {
  if (ZE.st < 3) return;
  if (ZE.t - ZE.lastRing < 0.3) return;
  ZE.lastRing = ZE.t; ZE.rings++; ZE.swing = 1;
  if (sid !== FPS.me.id || ZE.t - ZE.myRing > 0.5) zeSound('bell', ZE.P.bell.x, ZE.P.bell.y);
  if (ZE.st === 3) { ZE.peal++; ZE.pealT = 2.4; }
}
function zeRequest(sid, a) { if (typeof a === 'string') zeAct(sid, a.slice(0, 8)); }

// ---------- each frame ----------
function zeTick(dt) {
  if (!ZE.P) return;
  ZE.t += dt;
  for (const l of ZE.later) l.t -= dt;
  const due = ZE.later.filter(l => l.t <= 0); ZE.later = ZE.later.filter(l => l.t > 0);
  for (const l of due) try { l.f(); } catch (e) {}
  if (ZE.cele > 0) ZE.cele -= dt;
  if (ZE.flare > 0) ZE.flare -= dt;
  if (ZE.swing > 0) ZE.swing = Math.max(0, ZE.swing - dt * 0.45);
  if (ZM.net === 'client') return;
  // a peal finished: two bells, or the wrong hour
  if (ZE.peal > 0) {
    ZE.pealT -= dt;
    if (ZE.pealT <= 0) {
      if (ZE.peal === 2 && ZE.st === 3) zeSet(4);
      else { ZE.fails++; zeFail(); }
      ZE.peal = 0;
    }
  }
  // whoever carries something bleeds out or leaves: it goes back
  if (ZE.carrier) {
    let gone = false;
    if (ZE.carrier === FPS.me.id) gone = !!ZM.ghost || !!ZM.over;
    else { const r = FPS.remote.get(ZE.carrier); gone = !r || r.left || (r.dead && !r.down); }
    if (gone) {
      ZE.carrier = null;
      if (ZE.st === 2) zeSet(1); else if (ZE.st === 5 || ZE.st === 6) zeSet(4); else if (ZE.st === 9) zeSet(8);
    }
  }
}
function zeFail() {
  zeSound('clank', ZE.P.bell.x, ZE.P.bell.y);
  if (!ZE.said.fail) { ZE.said.fail = true; zeWhisper('“No… not that hour.”', 0.6); }
}
// a kill near her lantern while it hangs: one more of them come in
function zeKill(d, how, by) {
  if (!ZE.P || ZM.net === 'client' || ZE.st !== 7) return;
  const H = ZE.P.hook;
  if (Math.hypot(d.x - H.x, d.y - H.y) > ZE_SOUL_R || Math.abs(d.jz || 0) > 2) return;
  ZE.souls++;
  zeWisp(d.x, d.y, d.jz || 0);
  zeSound('soul', H.x, H.y);
  if (ZE.souls >= ZE_SOULS) zeSet(8);
}
// a little light from where one fell to the lantern
function zeWisp(x, y, jz) {
  const H = ZE.P.hook, G0 = FPSC.GROUND, z0 = G0 + jz + 1.2, z1 = G0 + H.z;
  for (let i = 0; i < 7; i++) {
    const T = 0.9 + i * 0.05;
    FPS.parts.push({ x: x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.3, z: z0, vx: (H.x - x) / T, vy: (H.y - y) / T, vz: (z1 - z0) / T - 0.5, t: T, c: i % 2 ? '170,255,220' : '255,236,170', up: true });
  }
}

// ---------- what's in front of you ----------
function zeNearest(consider) {
  const P = ZE.P; if (!P) return;
  const st = ZE.st, mine = zeMine();
  consider({ k: 'egg', a: 'log' }, P.log.ux, P.log.uy, 0, 1.25, true);
  if (st === 1) consider({ k: 'egg', a: 'net' }, P.net.ux, P.net.uy, 0, 1.3, true);
  if (st < 3) consider({ k: 'egg', a: 'bell' }, P.bell.ux, P.bell.uy, 0, 1.5, true);
  if (st === 4) consider({ k: 'egg', a: 'take' }, P.boat.ux, P.boat.uy, 0, 1.5, false);
  if (st === 5 || st === 6) if (mine) consider({ k: 'egg', a: 'light' }, P.tap.ux, P.tap.uy, 0, 1.4, false);
  if ((st === 6 && mine) || st === 8) consider({ k: 'egg', a: st === 8 ? 'take' : 'hang' }, P.hook.ux, P.hook.uy, 0, 1.4, false);
  if (st === 9 && mine) { const T = zeTop(); if (T) consider({ k: 'egg', a: 'top' }, T.x, T.y, T.z, Math.max(2.2, Math.min(6, T.r * 0.8)), false); }
}
function zePrompt(o) {
  const st = ZE.st, mine = zeMine();
  if (o.a === 'log') return st === 0 ? { text: 'A logbook lies open on the shelf', free: true } : { text: 'The keeper’s log', free: true };
  if (o.a === 'net') return { text: 'Something is tangled in the net…' };
  if (o.a === 'bell') return st === 2 && mine ? { text: 'Hang the tongue back in the bell', free: true } : { text: 'A ship’s bell, green with the sea. It has no tongue.' };
  if (o.a === 'take') return st === 8 ? { text: 'Her lantern, burning', free: true } : { text: 'Something glints under the boat', free: true };
  if (o.a === 'light') return st === 5 ? { text: 'The tap drips oil', free: true } : { text: 'The lantern burns' };
  if (o.a === 'hang') return { text: 'A rusted hook by the window', free: true };
  if (o.a === 'top') return { text: 'Set her lantern by the lens', free: true };
  return null;
}
function zeUse(o) {
  const st = ZE.st, mine = zeMine();
  if (o.a === 'log') {
    if (st === 0) zeDo('log');
    else { zeSay('“Lamp out at two bells. Gone with the storm lantern to warn the brig. M.H.”', 9); zeSound('page'); }
    return;
  }
  if (o.a === 'net') { zeSound('rustle'); if (!ZE.said.net) { ZE.said.net = true; zeSay('It’s caught fast.', 4); } return; }
  if (o.a === 'bell') { if (st === 2 && mine) zeDo('tongue'); return; }
  if (o.a === 'take') { zeSound('take'); zeDo('take'); return; }
  if (o.a === 'light') {
    if (st !== 5 || !mine) return;
    if (ZM.phase !== 'break') { zeSound('fizzle'); zeSay('The wick won’t take. The sea is too loud.', 5); return; }
    zeDo('light'); return;
  }
  if (o.a === 'hang') { if (st === 6 && mine) zeDo('hang'); return; }
  if (o.a === 'top') { if (st === 9 && mine) zeDo('top'); }
}

// ---------- striking things ----------
// a shot (one of its lines): does it strike the bell before anything else?
function zeShot(x, y, z, h, p, by) {
  const P = ZE.P; if (!P) return;
  const b = P.bell, bz = FPSC.GROUND + b.z, R = 0.34, sx = Math.sin(h), sy = Math.cos(h);
  const ox = b.x - x, oy = b.y - y, along = ox * sx + oy * sy; if (along < 0 || along > 60) return;
  const side2 = ox * ox + oy * oy - along * along; if (side2 > R * R) return;
  const t = along - Math.sqrt(R * R - side2), zt = z + Math.tan(p) * t;
  if (Math.abs(zt - bz) > 0.4) return;
  const wall = fpsRay(x, y, z, h, p, by, [], t + 1);
  if (wall.t < t - 0.08) return;
  zeStrike();
}
// a blow with the knife or the cutlass: the bell, or the net
function zeMelee(x, y, z, h, w, code) {
  const P = ZE.P; if (!P) return;
  const reach = (w.reach || 2) + 0.6;
  const hit = (q, zr) => { const d = Math.hypot(q.x - x, q.y - y); return d < reach && (d < 0.5 || Math.abs(angDiff(bearingOf(q.x - x, q.y - y), h)) < (w.arc || 0.9) + 0.15) && Math.abs(FPSC.GROUND + q.z - z) < zr; };
  if (hit(P.bell, 1.3)) zeStrike();
  if (ZE.st === 1 && hit(P.net, 1.5)) { zeSound('cut'); zeDo('net'); }
}
// the bell struck, as I hear it: a note if it has its tongue, a dull knock if not
function zeStrike() {
  if (ZE.t - ZE.myRing < 0.3) return;
  ZE.myRing = ZE.t; ZE.swing = Math.max(ZE.swing, 0.6);
  if (ZE.st < 3) { zeSound('thunk', ZE.P.bell.x, ZE.P.bell.y); return; }
  zeSound('bell', ZE.P.bell.x, ZE.P.bell.y);
  zeDo('ring');
}

// ---------- together: the host's word ----------
function zeHostSend(z) { z.egg = [ZE.st, ZE.carrier || '', ZE.souls, ZE.rings, ZE.fails]; }
function zeApply(hz) {
  const e = hz && hz.egg;
  if (!Array.isArray(e) || !ZE.P) return;
  const st = Math.max(0, Math.min(10, e[0] | 0)), carrier = typeof e[1] === 'string' && e[1] ? e[1].slice(0, 40) : null;
  const souls = Math.max(0, Math.min(99, e[2] | 0)), rings = Math.max(0, e[3] | 0), fails = Math.max(0, e[4] | 0);
  ZE.carrier = carrier;
  if (rings > ZE.rings) { ZE.swing = 1; if (ZE.t - ZE.myRing > 0.6) zeSound('bell', ZE.P.bell.x, ZE.P.bell.y); }
  ZE.rings = rings;
  if (fails > ZE.fails) { ZE.fails = fails; zeFail(); }
  if (st === 7 && souls > ZE.souls) { const H = ZE.P.hook; for (let i = ZE.souls; i < souls; i++) zeWisp(H.x + (Math.random() - 0.5) * 6, H.y + 2 + Math.random() * 3, 0); zeSound('soul', H.x, H.y); }
  ZE.souls = souls;
  if (st !== ZE.st) { const prev = ZE.st; ZE.st = st; zeEnter(st, prev); }
}

// ---------- sounds ----------
function zeSound(k, x, y, vol) {
  try {
    if (soundOff()) return;
    const m = FPS.me, d = x == null ? 0 : Math.hypot(x - m.x, y - m.y), v = Math.max(0.06, 1 - d / 45) * (vol || 1);
    const o = { pan: x == null ? 0 : clamp(angDiff(bearingOf(x - m.x, y - m.y), m.h), -1, 1) * 0.8 };
    // a ship's bell: a struck bronze note and its overtones
    const bell = (dl, a) => { for (const [f, g, dd] of [[523, 0.3, 2.8], [1250, 0.16, 1.9], [1960, 0.09, 1.3], [2830, 0.05, 0.8], [262, 0.12, 3.2]]) tone(f, 'sine', 0.003, g * a, dd, Object.assign({ delay: dl }, o)); };
    if (k === 'bell') bell(0, v);
    else if (k === 'eight') { for (let i = 0; i < 4; i++) { bell(i * 1.1, 0.9); bell(i * 1.1 + 0.36, 0.9); } tone(131, 'sine', 0.6, 0.12, 4.5, { delay: 0.2 }); }
    else if (k === 'thunk') { noise('lowpass', 420, 1, 0.003, 0.35 * v, 0.18, o); tone(180, 'triangle', 0.003, 0.12 * v, 0.2, Object.assign({ to: 120 }, o)); }
    else if (k === 'clank') { tone(523, 'square', 0.003, 0.05 * v, 0.5, o); tone(554, 'square', 0.003, 0.05 * v, 0.6, o); noise('bandpass', 1800, 3, 0.002, 0.15 * v, 0.3, o); }
    else if (k === 'hum') tone(523, 'sine', 0.4, 0.06 * v, 2.2, o);
    else if (k === 'whisper') { for (let i = 0; i < 3; i++) noise('bandpass', 1400 + Math.random() * 900, 7, 0.25, 0.05, 0.6, { delay: i * 0.35, pan: (Math.random() - 0.5) * 1.6, to: 900 }); }
    else if (k === 'rustle') { for (let i = 0; i < 3; i++) noise('highpass', 2400, 1, 0.01, 0.08, 0.12, { delay: i * 0.08 }); }
    else if (k === 'cut') { noise('highpass', 3000, 1, 0.002, 0.2, 0.1); noise('bandpass', 900, 2, 0.01, 0.1, 0.25, { delay: 0.05 }); }
    else if (k === 'take') { tone(392, 'triangle', 0.005, 0.08, 0.25); noise('bandpass', 1200, 4, 0.01, 0.06, 0.12); }
    else if (k === 'page') noise('highpass', 3200, 1, 0.02, 0.06, 0.25, { to: 1800 });
    else if (k === 'fizzle') { noise('highpass', 3800, 1, 0.01, 0.1, 0.5, { to: 1500 }); }
    else if (k === 'light') { noise('lowpass', 900, 1, 0.02, 0.3, 0.6, { to: 300 }); tone(330, 'triangle', 0.2, 0.06, 1.2, { delay: 0.2 }); }
    else if (k === 'soul') { tone(1320, 'sine', 0.01, 0.07 * v, 1.2, o); tone(1980, 'sine', 0.01, 0.04 * v, 0.9, Object.assign({ delay: 0.08 }, o)); }
    else if (k === 'coin') { tone(1568, 'triangle', 0.002, 0.12, 0.5); tone(2093, 'triangle', 0.002, 0.1, 0.7, { delay: 0.09 }); tone(2637, 'triangle', 0.002, 0.08, 0.9, { delay: 0.18 }); noise('highpass', 6000, 1, 0.01, 0.05, 0.8, { delay: 0.1 }); }
  } catch (e) {}
}

// ---------- in 3D ----------
// Each of the quest's things is made to be looked at twice: worked in more detail than the station's own props, and
// a touch brighter, so it reads as something among the set dressing. Static parts are merged into one mesh a material.
const Z3E = {};
// a pile of shapes, each turned, scaled and moved into place, merged into one mesh a material when it's done
function zeKit() {
  const L = new Map(), m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  const push = (mat, geo) => { if (!L.has(mat)) L.set(mat, []); L.get(mat).push(geo); return geo; };
  return {
    // (x, y, z: three's own axes, in the group: x east, y up, z south; sc: a number or [x, y, z])
    add(mat, geo, x, y, z, rx, ry, rz, sc) {
      e.set(rx || 0, ry || 0, rz || 0); q.setFromEuler(e);
      if (sc == null) s.set(1, 1, 1); else if (typeof sc === 'number') s.setScalar(sc); else s.set(sc[0], sc[1], sc[2]);
      geo.applyMatrix4(m.compose(p.set(x || 0, y || 0, z || 0), q, s)); return push(mat, geo);
    },
    // a shape a unit tall, stood on its end and stretched from a to b (each [x, y, z]); sx, sz: its girth
    along(mat, geo, a, b, sx, sz) {
      d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = d.length() || 1e-4;
      q.setFromUnitVectors(up, d.multiplyScalar(1 / len)); s.set(sx == null ? 1 : sx, len, sz == null ? (sx == null ? 1 : sx) : sz);
      geo.applyMatrix4(m.compose(p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, s)); return push(mat, geo);
    },
    // a rod (a thin cylinder) from a to b, or along a path of points
    rod(mat, a, b, r, seg) { return this.along(mat, new THREE.CylinderGeometry(r, r, 1, seg || 5, 1, true), a, b, 1); },
    path(mat, pts, r, seg) { for (let i = 0; i < pts.length - 1; i++) this.rod(mat, pts[i], pts[i + 1], r, seg); for (let i = 1; i < pts.length - 1; i++) this.add(mat, new THREE.SphereGeometry(r, seg || 5, 3), ...pts[i]); },
    into(g) { for (const [mat, list] of L) { const geo = z3Merge(list); if (geo) g.add(new THREE.Mesh(geo, mat)); } L.clear(); return g; },
  };
}
// the bell's tongue: the eye it hung by, the shank, the ball, its flight and the little eye for the lanyard, bronze
// gone green (its origin at the eye; it hangs down -y)
function zeTongue(M) {
  const K = zeKit(), g = new THREE.Group();
  K.add(M.bronze, new THREE.TorusGeometry(0.024, 0.008, 5, 12), 0, 0, 0);
  K.add(M.bronze, new THREE.CylinderGeometry(0.011, 0.016, 0.25, 7), 0, -0.15, 0);
  K.add(M.bronze, new THREE.CylinderGeometry(0.02, 0.012, 0.03, 7), 0, -0.04, 0);
  K.add(M.bronze, new THREE.SphereGeometry(0.05, 12, 9), 0, -0.31, 0);
  K.add(M.bronze, new THREE.CylinderGeometry(0.019, 0.013, 0.07, 7), 0, -0.385, 0);
  K.add(M.bronze, new THREE.TorusGeometry(0.014, 0.005, 4, 8), 0, -0.432, 0, 0, Math.PI / 2, 0);
  // the crust of the sea on it, in patches
  K.add(M.verd, new THREE.SphereGeometry(0.0515, 10, 5, 0.3, 3.4, 1.1, 1.3), 0, -0.31, 0);
  K.add(M.verd, new THREE.SphereGeometry(0.0515, 8, 4, 4.2, 1.6, 0.3, 0.9), 0, -0.31, 0);
  K.add(M.verd, new THREE.CylinderGeometry(0.0125, 0.0165, 0.1, 7, 1, true, 1, 2.6), 0, -0.2, 0);
  K.add(M.crust, new THREE.SphereGeometry(0.012, 5, 3), 0.035, -0.29, 0.03, 0, 0, 0, [1, 0.6, 1]);
  K.add(M.crust, new THREE.SphereGeometry(0.01, 5, 3), -0.03, -0.33, -0.035, 0, 0, 0, [1, 0.6, 1]);
  K.add(M.crust, new THREE.SphereGeometry(0.008, 5, 3), 0.012, -0.12, 0.01);
  return K.into(g);
}
function ze3dBuild(grp) {
  const P = ZE.P; if (!P) return;
  const G0 = FPSC.GROUND, soft = z3Soft('rgba(255,250,225,1)', 'rgba(255,250,225,0)'), PI = Math.PI;
  const addSprite = (c, par, sc, add) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: new THREE.Color(c), transparent: true, depthWrite: false, blending: add === false ? THREE.NormalBlending : THREE.AdditiveBlending, fog: false })); s.scale.setScalar(sc || 1); (par || grp).add(s); return s; };
  // glints: a bright point and a soft halo round it; one small light goes with whichever is showing
  const glint = c => { const col = c || '#fff4d0', h = addSprite(col), s = addSprite(col); s.visible = h.visible = false; return { s, h }; };
  Z3E.glints = {
    log: glint(), net: glint('#d8fff0'), boat: glint(), tap: glint('#ffe0a0'), hook: glint('#ffd8a0'), top: glint('#fff0c0'),
  };
  Z3E.glintL = new THREE.PointLight(0xfff0d0, 0, 2.6, 2); grp.add(Z3E.glintL);
  // materials shared by the quest's things
  const bronzeM = new THREE.MeshPhongMaterial({ color: 0x8a6a2c, specular: 0xa08040, shininess: 50, emissive: 0x1e1508 });
  const TM = { bronze: new THREE.MeshPhongMaterial({ color: 0x5e5a38, specular: 0x50503a, shininess: 30, emissive: 0x0e100a }), verd: z3Lam('#5aa088', { emissive: 0x0c1a14 }), crust: z3Lam('#b8b8a0') };
  const iron = z3Lam('#2a2c30'), rust = z3Lam('#7a4426'), rust2 = z3Lam('#4a2a1a'), rope = z3Lam('#9a8a64'), rope2 = z3Lam('#7a6a4a');

  // ---- the keeper's log, lying open at the right-hand end of the shelf (the shelf's top at 1.24) ----
  {
    const g = new THREE.Group(); g.position.copy(z3v(P.log.x, P.log.y, G0 + 1.24)); grp.add(g);
    const K = zeKit(), BZ = -0.07, PW = 0.15, PL = 0.22;
    const leather = z3Lam('#7a3424', { emissive: 0x140604 }), leather2 = z3Lam('#4e1e14'), edge = z3Lam('#e0d0a8', { emissive: 0x1a1608 });
    const brass = new THREE.MeshPhongMaterial({ color: 0x9a7a34, specular: 0xc0a060, shininess: 60, emissive: 0x1a1206 });
    const inkM = new THREE.MeshPhongMaterial({ color: 0x141c26, specular: 0x506070, shininess: 60 }), quillM = z3Lam('#f0ece0', { emissive: 0x18160f }), wax = z3Lam('#f2e8d0', { emissive: 0x2a2416 }), ribbon = z3Lam('#a82a24', { emissive: 0x1a0404 });
    // the boards, the spine between them, brass at the corners
    for (const s of [-1, 1]) {
      K.add(leather, new THREE.BoxGeometry(PW + 0.018, 0.01, PL + 0.016), s * (PW / 2 + 0.006), 0.005, BZ, 0, 0, s * 0.03);
      for (const c of [-1, 1]) K.add(brass, new THREE.BoxGeometry(0.022, 0.012, 0.022), s * (PW + 0.006), 0.009, BZ + c * (PL / 2 + 0.002), 0, PI / 4, 0);
      // the leaves under the open page, their edges showing
      K.add(edge, new THREE.BoxGeometry(PW * 0.9, 0.012, PL - 0.004), s * (PW * 0.5 + 0.004), 0.016, BZ, 0, 0, s * 0.04);
    }
    K.add(leather2, new THREE.CylinderGeometry(0.014, 0.014, PL + 0.016, 8), 0, 0.002, BZ, PI / 2, 0, 0);
    // the ribbon, from the gutter out over the shelf's edge
    K.add(ribbon, new THREE.BoxGeometry(0.012, 0.002, 0.08), 0.004, 0.026, BZ + 0.08);
    K.add(ribbon, new THREE.BoxGeometry(0.012, 0.11, 0.002), 0.004, -0.028, 0.053, 0.08, 0, 0.05);
    K.add(ribbon, new THREE.BoxGeometry(0.012, 0.016, 0.002), 0.004, -0.088, 0.058, 0.4, 0, 0, [1, 1, 1]);
    // the inkpot, and a quill in it
    const ix = 0.255, iz = -0.07;
    K.add(inkM, new THREE.CylinderGeometry(0.03, 0.034, 0.035, 10), ix, 0.0175, iz);
    K.add(inkM, new THREE.CylinderGeometry(0.013, 0.03, 0.014, 10), ix, 0.042, iz);
    K.add(brass, new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8), ix, 0.053, iz);
    K.rod(quillM, [ix, 0.03, iz], [ix + 0.06, 0.29, iz - 0.09], 0.0028, 4);
    K.along(quillM, new THREE.SphereGeometry(0.5, 8, 6), [ix + 0.025, 0.14, iz - 0.04], [ix + 0.062, 0.3, iz - 0.093], 0.034, 0.004);
    K.along(inkM, new THREE.ConeGeometry(0.5, 1, 4), [ix + 0.002, 0.04, iz - 0.003], [ix, 0.012, iz], 0.006, 0.006);
    // a candle stub in a brass dish, behind the pot
    const cx = 0.25, cz = -0.25;
    K.add(brass, new THREE.CylinderGeometry(0.046, 0.04, 0.008, 12), cx, 0.004, cz);
    K.add(brass, new THREE.CylinderGeometry(0.018, 0.022, 0.014, 8), cx, 0.014, cz);
    K.add(brass, new THREE.TorusGeometry(0.014, 0.004, 4, 8), cx + 0.054, 0.012, cz, PI / 2, 0, 0);
    K.add(wax, new THREE.CylinderGeometry(0.016, 0.017, 0.05, 9), cx, 0.046, cz);
    for (const [a, h, l] of [[0.4, 0.06, 0.03], [2.5, 0.055, 0.04], [4.4, 0.065, 0.024]]) K.add(wax, new THREE.SphereGeometry(0.006, 5, 3), cx + Math.cos(a) * 0.016, h - l / 2, cz + Math.sin(a) * 0.016, 0, 0, 0, [1, l / 0.012, 1]);
    K.add(wax, new THREE.SphereGeometry(0.02, 7, 3, 0, PI * 2, 0, PI / 2), cx + 0.01, 0.018, cz + 0.008, 0, 0, 0, [1, 0.3, 1]);
    K.rod(inkM, [cx, 0.07, cz], [cx + 0.002, 0.082, cz], 0.0016, 3);
    K.into(g);
    // the open pages: bowed up from the gutter, written close in a hand you can't quite read
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 192;
    { const q = cv.getContext('2d'), rr = seeded(0x10c8);
      q.fillStyle = '#f2e6c6'; q.fillRect(0, 0, 256, 192);
      const gr = q.createLinearGradient(118, 0, 138, 0); gr.addColorStop(0, 'rgba(120,90,50,0)'); gr.addColorStop(0.5, 'rgba(120,90,50,0.35)'); gr.addColorStop(1, 'rgba(120,90,50,0)'); q.fillStyle = gr; q.fillRect(112, 0, 32, 192);
      q.strokeStyle = 'rgba(120,140,170,0.25)'; q.lineWidth = 1; for (let y = 22; y < 184; y += 11) { q.beginPath(); q.moveTo(8, y + 0.5); q.lineTo(248, y + 0.5); q.stroke(); }
      q.strokeStyle = 'rgba(170,60,50,0.35)'; for (const x of [26, 154]) { q.beginPath(); q.moveTo(x, 6); q.lineTo(x, 186); q.stroke(); }
      const hand = (x0, x1, y, col, w, slant) => { q.strokeStyle = col; q.lineWidth = w; q.beginPath(); let x = x0, pen = false; while (x < x1) { if (rr() < 0.12) { x += 4 + rr() * 4; pen = false; continue; } const yy = y - 2 - rr() * 4; if (!pen) { q.moveTo(x, y); pen = true; } q.quadraticCurveTo(x + 1 + slant, yy, x + 2.5, y - rr() * 1.2); x += 2.5; } q.stroke(); };
      for (let i = 0; i < 14; i++) hand(30, 120 - rr() * 8, 21 + i * 11, 'rgba(40,30,22,0.8)', 1, 0.6);
      for (let i = 0; i < 9; i++) hand(158, 246 - rr() * 10, 21 + i * 11, 'rgba(40,30,22,0.8)', 1, 0.6);
      // (and the last lines in another hand: darker, hurried, slanting hard)
      for (let i = 0; i < 2; i++) hand(158, 236 - i * 40, 128 + i * 13, 'rgba(30,14,10,0.95)', 1.6, 2.2);
      q.fillStyle = 'rgba(30,20,14,0.5)'; q.beginPath(); q.ellipse(214, 160, 3, 2, 0.4, 0, PI * 2); q.fill(); }
    const tex = new THREE.CanvasTexture(cv), pageM = z3Lam('#ffffff', { map: tex, emissive: 0x18140c, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const pg = new THREE.PlaneGeometry(PW, PL, 8, 1); pg.rotateX(-PI / 2);
      const pos = pg.attributes.position, uv = pg.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const u = Math.max(0, Math.min(1, (pos.getX(i) + PW / 2) / PW)), out = s > 0 ? u : 1 - u;   // (0 at the gutter, 1 at the fore-edge)
        pos.setY(i, 0.02 + 0.012 * Math.sin(PI * (0.2 + 0.7 * Math.pow(out, 0.7))) + 0.002 * out);
        uv.setX(i, uv.getX(i) * 0.5 + (s > 0 ? 0.5 : 0));
      }
      pg.computeVertexNormals();
      { const nn = pg.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, nn.getX(i) * 0.3, 1, nn.getZ(i) * 0.3); pg.normalizeNormals(); }   // (lit as nearly flat: the bow is for the eye)
      const mp = new THREE.Mesh(pg, pageM); mp.position.set(s * PW / 2, 0.006, BZ); g.add(mp);
    }
    // the candle's small flame
    const fl = addSprite('#ffc060', g, 1); fl.position.set(cx, 0.1, cz); fl.scale.set(0.035, 0.06, 1);
    const fh = addSprite('#ff9a40', g, 0.16); fh.position.set(cx, 0.1, cz); fh.material.opacity = 0.35;
    Z3E.log = { g, fl, fh };
  }

  // ---- in the nets on the rack: a bag of net drawn tight round something heavy, floats and weed caught in it ----
  {
    const g = new THREE.Group(); g.position.copy(z3v(P.net.x, P.net.y, G0 + P.net.z)); grp.add(g);
    const bag = new THREE.Group(); bag.rotation.x = 0.55; g.add(bag);
    const K = zeKit(), cord = z3Lam('#6e7a64', { emissive: 0x060805 }), cord2 = z3Lam('#56604e'), cork = z3Lam('#9a7444', { emissive: 0x100a04 }), weed = z3Lam('#4a6a34', { side: THREE.DoubleSide });
    const floatM = new THREE.MeshPhongMaterial({ color: 0x3a8a6a, specular: 0xd0fff0, shininess: 90, emissive: 0x0a2018, transparent: true, opacity: 0.85 });
    // (the bag: two families of cord winding round an egg, which makes the mesh's diamonds; pulled in at the top)
    const rr = seeded(0x2e7), RX = 0.072, RY = 0.21, RZ = 0.105, at = (a, v) => { const w = 1 + 0.1 * Math.sin(a * 3 + v * 4) + 0.06 * Math.sin(a * 7 - v * 3); return [Math.cos(a) * RX * Math.sin(v) * w, -Math.cos(v) * RY, Math.sin(a) * RZ * Math.sin(v) * w]; };
    for (let k = 0; k < 9; k++) for (const dir of [-1, 1]) {
      const a0 = k / 9 * PI * 2 + (rr() - 0.5) * 0.3, tw = 1.1 + rr() * 0.4, pts = [];
      for (let i = 0; i <= 10; i++) { const v = 0.18 + i / 10 * (PI - 0.3), q = at(a0 + dir * v * tw, v); pts.push([q[0] + (rr() - 0.5) * 0.008, q[1] + (rr() - 0.5) * 0.01, q[2] + (rr() - 0.5) * 0.008]); }
      for (let i = 0; i < pts.length - 1; i++) K.rod(dir > 0 ? cord : cord2, pts[i], pts[i + 1], 0.0026, 3);
    }
    // knots where the cords cross, a few
    for (let i = 0; i < 10; i++) K.add(cord2, new THREE.SphereGeometry(0.005, 4, 3), ...at(i * 1.7, 0.5 + (i % 5) * 0.5));
    // gathered at the neck and up into the hanging net
    K.add(cord, new THREE.TorusGeometry(0.03, 0.009, 4, 10), 0, RY * 0.95, 0, PI / 2, 0, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; K.path(cord2, [[Math.cos(a) * 0.02, RY * 0.95, Math.sin(a) * 0.02], [-0.03 + Math.cos(a) * 0.03, RY + 0.06, Math.sin(a) * 0.05], [-0.07, RY + 0.12, Math.sin(a) * 0.09]], 0.0028, 3); }
    // loose ends hanging below, with a cork on one and a glass float caught in a sling of cord
    K.path(cord2, [[0, -RY * 0.95, 0], [0.01, -RY - 0.08, 0.02], [0.0, -RY - 0.16, 0.03]], 0.0035, 3);
    K.add(cork, new THREE.CylinderGeometry(0.026, 0.026, 0.05, 8), 0.0, -RY - 0.19, 0.03, 0.2, 0, 0.1);
    K.path(cord2, [[0.03, -RY * 0.8, -0.04], [0.06, -RY - 0.04, -0.09], [0.07, -RY - 0.08, -0.12]], 0.0035, 3);
    K.add(floatM, new THREE.SphereGeometry(0.045, 12, 9), 0.07, -RY - 0.12, -0.13);
    for (const r of [0, PI / 2]) K.add(cord, new THREE.TorusGeometry(0.0465, 0.003, 3, 14), 0.07, -RY - 0.12, -0.13, 0, r, 0);
    // weed dried on it
    for (const [x, y, z, rz, l] of [[0.06, 0.06, 0.04, 0.4, 0.1], [0.065, -0.14, 0.07, 0.2, 0.08]]) K.add(weed, new THREE.PlaneGeometry(0.016, l, 1, 2), x, y, z, 0, PI / 2 - 0.3, rz);
    K.add(cork, new THREE.CylinderGeometry(0.024, 0.024, 0.045, 8), 0.07, 0.12, -0.06, 0, 0, PI / 2 - 0.3);
    K.into(bag);
    // the tongue, caught in it on the slant
    const tongue = zeTongue(TM); tongue.position.set(0.005, 0.2, 0.0); tongue.rotation.set(0, 0, 0.04); bag.add(tongue);
    Z3E.net = { g, bag, tongue };
  }

  // ---- the Gannet's bell, on its bracket ----
  {
    const g = new THREE.Group(); g.position.copy(z3v(P.bell.x, P.bell.y, G0 + P.bell.z)); grp.add(g);
    const K = zeKit();
    // the bracket out from the wall (east: +x): a plate bolted to the wall, the arm, a scrolled strut under it
    K.add(iron, new THREE.BoxGeometry(0.03, 0.42, 0.16), 0.585, 0.32, 0);
    for (const [y, z] of [[0.48, 0.05], [0.48, -0.05], [0.16, 0.05], [0.16, -0.05]]) K.add(iron, new THREE.CylinderGeometry(0.013, 0.013, 0.02, 6), 0.565, y, z, 0, 0, PI / 2);
    K.add(iron, new THREE.BoxGeometry(0.62, 0.05, 0.05), 0.27, 0.47, 0);
    K.add(iron, new THREE.BoxGeometry(0.05, 0.02, 0.07), 0.02, 0.5, 0);
    K.along(iron, new THREE.BoxGeometry(1, 1, 1), [0.57, 0.18, 0], [0.24, 0.46, 0], 0.035, 0.035);
    K.add(iron, new THREE.TorusGeometry(0.075, 0.012, 4, 14, PI * 1.4), 0.43, 0.36, 0, 0, 0, 0.6);
    K.add(iron, new THREE.TorusGeometry(0.04, 0.01, 4, 10, PI * 1.5), 0.33, 0.405, 0, 0, 0, 2.6);
    K.add(iron, new THREE.SphereGeometry(0.025, 6, 4), 0.0, 0.47, 0);
    // the yoke hanging off the arm's end: two cheeks and the pin the bell swings on
    for (const z of [-0.045, 0.045]) K.add(iron, new THREE.BoxGeometry(0.05, 0.08, 0.012), 0, 0.42, z);
    K.add(iron, new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), 0, 0.4, 0, PI / 2, 0, 0);
    K.into(g);
    const swing = new THREE.Group(); swing.position.set(0, 0.4, 0); g.add(swing);
    // the bell: a flared bronze lathe, darker inside, its waist and shoulder banded, gone green with the sea in
    // drips and patches (vertex colours)
    const prof = [[0.0, 0.0], [0.05, -0.002], [0.1, -0.016], [0.128, -0.04], [0.14, -0.075], [0.146, -0.13], [0.155, -0.2], [0.172, -0.28], [0.205, -0.35], [0.24, -0.4], [0.262, -0.43], [0.27, -0.448], [0.262, -0.458],
      [0.244, -0.452], [0.22, -0.42], [0.18, -0.36], [0.148, -0.28], [0.13, -0.18], [0.118, -0.08], [0.09, -0.04], [0.0, -0.03]];
    const bg = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 26);
    { const pos = bg.attributes.position, col = [], br = new THREE.Color(0x9a7434), gr = new THREE.Color(0x5aa088), dk = new THREE.Color(0x3a2c14), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
        const inner = i % prof.length >= 13 && i % prof.length <= 19;
        const drip = Math.max(0, Math.sin(a * 5 + 0.7) * Math.sin(a * 11 + 2.1)) * (0.4 + 0.6 * Math.min(1, -y / 0.3));
        const g0 = Math.max(0, Math.min(1, (-y - 0.36) / 0.08)) * 0.8 + drip * 1.1 + 0.35 * Math.max(0, Math.sin(a * 3 + y * 20));
        c.copy(br).lerp(gr, Math.min(1, g0)); if (inner) c.lerp(dk, 0.65); if (Math.abs(y + 0.075) < 0.012 || Math.abs(y + 0.24) < 0.01) c.multiplyScalar(1.12);
        col.push(c.r, c.g, c.b);
      }
      bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
    const bellM = new THREE.MeshPhongMaterial({ color: 0xffffff, vertexColors: true, specular: 0x907040, shininess: 45, emissive: 0x16100a, side: THREE.DoubleSide });
    const body = new THREE.Mesh(bg, bellM); swing.add(body);
    const B = zeKit();
    // bands cast round it, and the crown: a boss and its loop over the pin
    for (const [r, y, t] of [[0.144, -0.075, 0.007], [0.164, -0.245, 0.006], [0.2, -0.345, 0.005], [0.268, -0.442, 0.008]]) B.add(bronzeM, new THREE.TorusGeometry(r, t, 5, 26), 0, y, 0, PI / 2, 0, 0);
    B.add(bronzeM, new THREE.CylinderGeometry(0.045, 0.06, 0.03, 12), 0, -0.002, 0);
    B.add(bronzeM, new THREE.TorusGeometry(0.03, 0.011, 6, 12), 0, 0.006, 0);
    // salt-crust here and there
    const rAt = y => { for (let j = 0; j < 12; j++) { const [r0, y0] = prof[j], [r1, y1] = prof[j + 1]; if (y <= y0 && y >= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0.15; };
    for (let i = 0; i < 9; i++) { const a = i * 2.4, y = -0.12 - (i % 4) * 0.08, r = rAt(y) - 0.003; B.add(TM.crust, new THREE.SphereGeometry(0.01 + (i % 3) * 0.004, 5, 3), Math.cos(a) * r, y, Math.sin(a) * r, 0, 0, 0, [1, 0.7, 1]); }
    B.into(swing);
    // her name round the waist
    { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32; const q = cv.getContext('2d');
      q.fillStyle = 'rgba(0,0,0,0)'; q.fillRect(0, 0, 256, 32);
      q.font = '700 24px Georgia, serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillStyle = '#3a2a10'; q.fillText('G A N N E T', 128, 17);
      q.fillStyle = '#e8c878'; q.fillText('G A N N E T', 127, 16);
      const nm = new THREE.Mesh(new THREE.CylinderGeometry(0.153, 0.16, 0.05, 20, 1, true, -PI / 2 - 0.85, 1.7), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, alphaTest: 0.1 }));
      nm.position.y = -0.18; swing.add(nm); }
    // the tongue in it, and its lanyard (a braided rope, a knot, a tassel), when it's hung back
    const tg = new THREE.Group(); swing.add(tg);
    const t3 = zeTongue(TM); t3.position.y = -0.045; tg.add(t3);
    const R = zeKit(), y0 = -0.48, y1 = -0.95;
    R.rod(rope, [0, y0, 0], [0, y1, 0], 0.011, 6);
    for (let y = y0 - 0.02; y > y1 + 0.13; y -= 0.028) R.add(rope2, new THREE.TorusGeometry(0.0115, 0.004, 3, 8), 0, y, 0, PI / 2 + 0.35, 0, 0);
    R.add(rope2, new THREE.TorusGeometry(0.016, 0.009, 5, 10), 0, y1 + 0.1, 0, PI / 2, 0, 0);
    R.add(rope2, new THREE.TorusGeometry(0.016, 0.009, 5, 10), 0, y1 + 0.085, 0, PI / 2, 0, 0);
    R.add(rope, new THREE.ConeGeometry(0.026, 0.08, 8, 1, true), 0, y1 + 0.03, 0, PI, 0, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; R.rod(rope, [Math.cos(a) * 0.012, y1 + 0.06, Math.sin(a) * 0.012], [Math.cos(a) * 0.03, y1 - 0.03, Math.sin(a) * 0.03], 0.0035, 3); }
    R.add(rope2, new THREE.TorusGeometry(0.012, 0.004, 3, 8), 0, y0 + 0.02, 0, 0, PI / 2, 0);
    const rp = R.into(new THREE.Group()); tg.add(rp);
    Z3E.bell = { g, swing, tongue: tg, rope: rp };
  }

  // ---- her storm lantern: a brass fount, a burner and wick, a bowed glass globe (cracked) in a wire guard, the
  // side tubes up to the hood, a bail to carry it by; its own flame and light, and the crew's lights inside ----
  {
    const g = new THREE.Group(); grp.add(g); g.visible = false;
    const brass = new THREE.MeshPhongMaterial({ color: 0x9a7a3a, specular: 0xc8a868, shininess: 55, emissive: 0x161006 }), tin = z3Lam('#3a3630'), dark = z3Lam('#1a1816'), wood = z3Lam('#6a4a2c');
    const K = zeKit();
    K.add(brass, new THREE.CylinderGeometry(0.098, 0.108, 0.062, 16), 0, 0.031, 0);
    K.add(brass, new THREE.TorusGeometry(0.106, 0.006, 4, 18), 0, 0.004, 0, PI / 2, 0, 0);
    K.add(brass, new THREE.TorusGeometry(0.098, 0.005, 4, 18), 0, 0.062, 0, PI / 2, 0, 0);
    K.add(tin, new THREE.CylinderGeometry(0.06, 0.098, 0.022, 16), 0, 0.073, 0);
    K.add(brass, new THREE.CylinderGeometry(0.014, 0.014, 0.018, 8), 0.07, 0.066, 0.02);   // (the filler cap)
    K.add(tin, new THREE.CylinderGeometry(0.03, 0.036, 0.022, 10), 0, 0.094, 0);           // (the burner)
    K.add(brass, new THREE.CylinderGeometry(0.012, 0.012, 0.018, 8), 0, 0.094, 0.05, PI / 2, 0, 0);   // (the wick's knob)
    K.add(dark, new THREE.BoxGeometry(0.022, 0.016, 0.004), 0, 0.113, 0);                    // (the wick)
    // the guard: rods round the globe and two hoops
    for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * PI * 2; K.path(tin, [[Math.cos(a) * 0.08, 0.084, Math.sin(a) * 0.08], [Math.cos(a) * 0.098, 0.17, Math.sin(a) * 0.098], [Math.cos(a) * 0.07, 0.262, Math.sin(a) * 0.07]], 0.0035, 3); }
    for (const [r, y] of [[0.096, 0.14], [0.094, 0.2]]) K.add(tin, new THREE.TorusGeometry(r, 0.0035, 3, 16), 0, y, 0, PI / 2, 0, 0);
    // the side tubes, up from the fount to the hood
    for (const s of [-1, 1]) { K.add(brass, new THREE.CylinderGeometry(0.009, 0.009, 0.23, 6), s * 0.112, 0.17, 0); K.add(brass, new THREE.SphereGeometry(0.012, 6, 4), s * 0.112, 0.284, 0); K.rod(brass, [s * 0.112, 0.06, 0], [s * 0.09, 0.05, 0], 0.008, 6); }
    // the hood: a collar, a cone with its vents, a cap
    K.add(tin, new THREE.CylinderGeometry(0.075, 0.07, 0.022, 14), 0, 0.272, 0);
    K.add(tin, new THREE.CylinderGeometry(0.03, 0.09, 0.05, 14), 0, 0.307, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; K.add(dark, new THREE.BoxGeometry(0.012, 0.022, 0.004), Math.cos(a) * 0.062, 0.306, Math.sin(a) * 0.062, 0, -a + PI / 2, 0.0); }
    K.add(tin, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), 0, 0.342, 0);
    K.add(brass, new THREE.CylinderGeometry(0.038, 0.034, 0.008, 10), 0, 0.355, 0);
    K.add(brass, new THREE.SphereGeometry(0.012, 6, 4), 0, 0.363, 0);
    // the bail, and its wooden grip at the top
    K.add(tin, new THREE.TorusGeometry(0.112, 0.004, 4, 16, PI), 0, 0.284, 0);
    K.add(wood, new THREE.CylinderGeometry(0.011, 0.011, 0.05, 8), 0, 0.392, 0, 0, 0, PI / 2);
    K.into(g);
    // the globe, and the crack across it
    const gp = [[0.05, 0.1], [0.07, 0.12], [0.084, 0.16], [0.086, 0.19], [0.078, 0.23], [0.062, 0.26]];
    const glassM = new THREE.MeshBasicMaterial({ color: 0x3a3e40, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    const glass = new THREE.Mesh(new THREE.LatheGeometry(gp.map(([r, y]) => new THREE.Vector2(r, y)), 14), glassM); g.add(glass);
    const C = zeKit(), crackM = new THREE.MeshBasicMaterial({ color: 0xd8e0e0, transparent: true, opacity: 0.7 });
    const onGlass = (a, y) => { const r = y < 0.12 ? 0.07 : y < 0.16 ? 0.084 : y < 0.23 ? 0.088 : 0.078; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
    C.path(crackM, [onGlass(-1.2, 0.13), onGlass(-1.05, 0.16), onGlass(-1.15, 0.19), onGlass(-0.95, 0.22)], 0.0012, 3);
    C.path(crackM, [onGlass(-1.05, 0.16), onGlass(-0.8, 0.175)], 0.001, 3);
    C.into(g);
    // the flame, its glow, and the light it throws
    const flame = addSprite('#ffd070', g, 1); flame.position.y = 0.15; flame.scale.set(0.06, 0.1, 1); flame.renderOrder = 3;
    const halo = addSprite('#ffc870', g, 0.9); halo.position.y = 0.16; halo.renderOrder = 2;
    const light = new THREE.PointLight(0xffc070, 0, 9, 1.6); light.position.y = 0.2; g.add(light);
    // the crew's lights, small and turning in the glass
    const motes = []; for (let i = 0; i < ZE_SOULS; i++) { const s = addSprite(i % 2 ? '#aaffdc' : '#ffecaa', g, 0.04); s.renderOrder = 3; s.visible = false; motes.push(s); }
    Z3E.lantern = { g, glassM, halo, light, flame, motes };
  }

  // ---- the rusted hook by the south window: a plate on the wall, the arm out, the hook turned up at its end ----
  {
    const g = new THREE.Group(); g.position.copy(z3v(P.hook.x, P.hook.y, G0)); grp.add(g);
    const K = zeKit(), wz = 0.36, top = P.hook.z + 0.392;   // (wz: the wall's face, south of the hook; top: where the bail rests)
    K.add(rust2, new THREE.BoxGeometry(0.1, 0.2, 0.016), 0, top + 0.06, wz);
    for (const y of [top + 0.13, top - 0.01]) K.add(rust, new THREE.SphereGeometry(0.011, 5, 3), 0, y, wz - 0.01, 0, 0, 0, [1, 1, 0.6]);
    K.path(rust, [[0, top + 0.09, wz - 0.01], [0, top + 0.1, wz - 0.12], [0, top + 0.09, 0.08], [0, top + 0.055, 0.03], [0, top + 0.025, 0.02]], 0.0085, 5);
    K.path(rust, [[0, top + 0.025, 0.02], [0, top, 0.019], [0, top - 0.018, 0.007], [0, top - 0.022, -0.008], [0, top - 0.014, -0.022], [0, top + 0.006, -0.03], [0, top + 0.022, -0.028]], 0.0085, 5);
    K.add(rust, new THREE.SphereGeometry(0.011, 5, 4), 0, top + 0.022, -0.028);
    K.path(rust2, [[0, top - 0.02, wz - 0.01], [0, top + 0.02, wz - 0.1], [0, top + 0.085, wz - 0.18]], 0.006, 4);
    // rust flaking off it, and its stain down the plaster
    const flake = z3Lam('#a85a2a', { emissive: 0x140804 });
    for (const [y, z, s] of [[0.1, 0.2, 0.012], [0.095, 0.12, 0.009], [0.06, 0.05, 0.01], [-0.012, 0.0, 0.008]]) K.add(flake, new THREE.SphereGeometry(s, 4, 3), 0.004, top + y, z, 0, 0, 0, [1, 0.5, 1]);
    const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.4), new THREE.MeshBasicMaterial({ map: z3Fade([[0, 'rgba(90,40,20,0)'], [0.7, 'rgba(90,40,20,0.35)'], [1, 'rgba(90,40,20,0.5)']]), transparent: true, depthWrite: false }));
    stain.position.set(0, top - 0.24, wz - 0.009); stain.rotation.y = PI; g.add(stain);
    K.into(g);
  }

  // ---- the oil tap between the tanks: a header from tank to tank, a gauge, the feed forward to a brass valve and its
  // wheel, the spout, a drop of oil gathering, a bucket under it and a stain on the flags ----
  {
    const g = new THREE.Group(); g.position.copy(z3v(P.tap.x, P.tap.y, G0)); grp.add(g);
    const K = zeKit(), y = P.tap.z, bz = 0.75;   // (bz: the line between the tanks' middles, behind the tap)
    const brass = new THREE.MeshPhongMaterial({ color: 0xa08034, specular: 0xb09050, shininess: 60, emissive: 0x161006 }), pipe = z3Lam('#4a5450', { emissive: 0x080a0a }), red = z3Lam('#8a2a20', { emissive: 0x140404 });
    K.rod(pipe, [-0.42, y, bz], [0.42, y, bz], 0.032, 8);
    for (const x of [-0.29, 0.29]) { K.add(pipe, new THREE.CylinderGeometry(0.058, 0.058, 0.025, 10), x, y, bz, 0, 0, PI / 2); for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + 0.6; K.add(brass, new THREE.SphereGeometry(0.008, 4, 3), x, y + Math.cos(a) * 0.044, bz + Math.sin(a) * 0.044); } }
    K.add(pipe, new THREE.SphereGeometry(0.045, 8, 6), 0, y, bz);
    K.rod(pipe, [0, y, bz], [0, y, 0.06], 0.03, 8);
    K.add(pipe, new THREE.CylinderGeometry(0.048, 0.048, 0.02, 10), 0, y, 0.07, PI / 2, 0, 0);
    // the gauge, on a riser off the header
    K.rod(pipe, [0.16, y, bz], [0.16, y + 0.2, bz], 0.012, 6);
    K.add(brass, new THREE.CylinderGeometry(0.05, 0.05, 0.025, 14), 0.16, y + 0.25, bz - 0.01, PI / 2, 0, 0);
    K.add(z3Lam('#e8e0c8', { emissive: 0x302c20 }), new THREE.CylinderGeometry(0.042, 0.042, 0.004, 14), 0.16, y + 0.25, bz - 0.024, PI / 2, 0, 0);
    K.add(red, new THREE.BoxGeometry(0.004, 0.034, 0.003), 0.168, y + 0.258, bz - 0.027, 0, 0, -0.6);
    // the valve, its spindle and wheel
    K.add(brass, new THREE.SphereGeometry(0.055, 12, 9), 0, y, 0, 0, 0, 0, [1, 0.85, 1.1]);
    K.add(brass, new THREE.CylinderGeometry(0.034, 0.034, 0.03, 10), 0, y + 0.05, 0);
    K.add(brass, new THREE.CylinderGeometry(0.009, 0.009, 0.07, 6), 0, y + 0.09, 0);
    K.add(red, new THREE.TorusGeometry(0.068, 0.008, 5, 18), 0, y + 0.125, 0, PI / 2, 0, 0);
    for (let i = 0; i < 4; i++) K.add(red, new THREE.BoxGeometry(0.068, 0.008, 0.008), Math.cos(i * PI / 2) * 0.034, y + 0.125, Math.sin(i * PI / 2) * 0.034, 0, -i * PI / 2, 0);
    K.add(brass, new THREE.SphereGeometry(0.013, 6, 4), 0, y + 0.13, 0);
    // the spout, forward and down, flared at its mouth
    K.path(brass, [[0, y - 0.01, -0.03], [0, y - 0.02, -0.1], [0, y - 0.07, -0.13]], 0.016, 8);
    K.add(brass, new THREE.CylinderGeometry(0.02, 0.016, 0.02, 8), 0, y - 0.085, -0.13);
    K.into(g);
    // the bucket under it, oil in it, and the stain round it
    const B = zeKit(), tin = z3Lam('#5a5e5c', { side: THREE.DoubleSide }), oilM = new THREE.MeshPhongMaterial({ color: 0x2a1c08, specular: 0xd0a860, shininess: 100 });
    B.add(tin, new THREE.CylinderGeometry(0.13, 0.11, 0.24, 14, 1, true), 0, 0.12, -0.13);
    B.add(tin, new THREE.CylinderGeometry(0.11, 0.11, 0.01, 14), 0, 0.005, -0.13);
    B.add(tin, new THREE.TorusGeometry(0.13, 0.006, 4, 16), 0, 0.24, -0.13, PI / 2, 0, 0);
    B.add(tin, new THREE.TorusGeometry(0.13, 0.004, 3, 12, PI), 0, 0.24, -0.13, 0.5, 0, 0);
    B.add(oilM, new THREE.CylinderGeometry(0.122, 0.122, 0.004, 14), 0, 0.17, -0.13);
    B.into(g);
    const st0 = new THREE.Mesh(new THREE.CircleGeometry(0.36, 16), new THREE.MeshBasicMaterial({ map: z3Soft('rgba(10,6,2,0.55)', 'rgba(10,6,2,0)'), transparent: true, depthWrite: false }));
    st0.rotation.x = -PI / 2; st0.position.set(0.05, 0.012, -0.12); g.add(st0);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), oilM); drop.position.set(0, y - 0.1, -0.13); g.add(drop);
    Z3E.tap = { g, drop, y0: y - 0.1, y1: 0.17 };
  }

  // the tongue, when someone carries it (only the others see it in a hand): the same as it looks in the net
  { const m = zeTongue(TM); m.visible = false; grp.add(m); Z3E.tongue = m; }
  // the lens flaring, at the end
  { const L = new THREE.PointLight(0xfff0c0, 0, 40, 1.2); grp.add(L); Z3E.flare = L; }
}
function ze3d(dt) {
  const P = ZE.P; if (!P || !Z3E.glints || !Z3E.glints.log.s.parent) return;
  const t = g.t, G0 = FPSC.GROUND, st = ZE.st, m = FPS.me;
  // glints: a soft pulse, and now and then a brighter twinkle, as of something catching the light; a faint halo
  // round them and a little light on what's near
  const GL = Z3E.glintL; let lit = false;
  const tw = (G, on, x, y, z, ph, big) => {
    G.s.visible = G.h.visible = on; if (!on) return;
    const k = Math.pow(Math.max(0, Math.sin(t * 1.25 + ph)), 14), pu = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2 + ph), b = (big || 0.22) * 1.2;
    const at = z3v(x, y, G0 + z);
    G.s.position.copy(at); G.s.material.opacity = 0.3 + 0.15 * pu + 0.55 * k; G.s.scale.setScalar(b * (0.65 + 0.2 * pu + 0.55 * k));
    G.h.position.copy(at); G.h.material.opacity = 0.09 + 0.06 * pu + 0.1 * k; G.h.scale.setScalar(b * 3.4 * (0.9 + 0.15 * pu));
    GL.position.copy(at); GL.position.y += 0.3; GL.color.copy(G.s.material.color); GL.intensity = 0.14 + 0.08 * pu + 0.16 * k; lit = true;
  };
  const Gl = Z3E.glints, T = zeTop();
  tw(Gl.log, st === 0, P.log.x, P.log.y, P.log.z, 0.3);
  tw(Gl.net, st === 1, P.net.x, P.net.y, P.net.z, 1.7, 0.28);
  tw(Gl.boat, st === 4, P.boat.x, P.boat.y, P.boat.z + 0.1, 2.9, 0.3);
  tw(Gl.tap, st === 5 && zeMine(), P.tap.x, P.tap.y, P.tap.z, 0.9);
  tw(Gl.hook, st === 6 && zeMine(), P.hook.x, P.hook.y, P.hook.z + 0.4, 2.2);
  tw(Gl.top, st === 9 && zeMine() && !!T, T ? T.x : 0, T ? T.y : 0, T ? T.z + 1.4 : 0, 0.5, 0.45);
  if (!lit) GL.intensity = 0;
  // the candle by the log
  { const L = Z3E.log, f = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 6.7); L.fl.scale.set(0.035 * f, 0.06 * (0.9 + 0.2 * f), 1); L.fl.material.opacity = 0.9 * f; L.fh.material.opacity = 0.3 * f; }
  // the net: the bag full and heavy while the tongue's in it, slack once it's cut free
  { const N = Z3E.net, full = st < 2; N.tongue.visible = full; N.bag.scale.set(1, full ? 1 : 0.7, full ? 1 : 0.75); N.bag.position.y = full ? 0 : 0.06; }
  // the oil, dripping from the tap into the bucket
  { const D = Z3E.tap, c = reduceMotion ? 0 : (t % 1.7) / 1.7, fall = Math.max(0, (c - 0.75) / 0.25);
    D.drop.position.y = D.y0 - (D.y0 - D.y1) * fall * fall; D.drop.scale.setScalar(fall > 0 ? 1 : 0.4 + 0.8 * Math.min(1, c / 0.75)); }
  // the bell: swinging when struck, its tongue in it or not
  const B = Z3E.bell;
  B.swing.rotation.z = Math.sin(t * 9) * 0.32 * ZE.swing; B.tongue.visible = B.rope.visible = st >= 3;
  if (B.tongue.visible) B.tongue.rotation.z = -Math.sin(t * 9 - 0.6) * 0.25 * ZE.swing;
  // the lantern: under the boat, carried, on its hook, and at the last by the lens
  const Ln = Z3E.lantern, who = zeCarrierBody();
  let at = null, burn = 0, souls = 0;
  if (st === 4) at = [P.boat.x, P.boat.y, P.boat.z - 0.12, 0];
  else if ((st === 5 || st === 6 || st === 9) && who) {
    if (who === m) {
      // (yours: low in front of you, to your left, where the eye can just catch it)
      const h = m.h, ez = FPSC.EYE + (m.jz || 0) - (FPS.eyeLag || 0);
      at = [m.x + Math.sin(h) * 0.55 - Math.cos(h) * 0.32, m.y + Math.cos(h) * 0.55 + Math.sin(h) * 0.32, ez - 0.78, -h];
    } else at = [who.x - Math.cos(who.h || 0) * 0.32, who.y + Math.sin(who.h || 0) * 0.32, (who.jz || 0) + 0.62, -(who.h || 0)];
    burn = st === 5 ? 0 : 1; souls = st === 9 ? ZE_SOULS : 0;
  } else if (st === 7 || st === 8) { at = [P.hook.x, P.hook.y, P.hook.z, 0]; burn = 1; souls = st === 8 ? ZE_SOULS : ZE.souls; }
  else if (st === 10 && T) {
    // (set down by the lens: blazing while the lens takes her light, then only an ember)
    const f = Math.max(0, Math.min(1, ZE.flare / 1.5));
    at = [T.x + 0.35, T.y - 1.3, T.z, 0.3]; burn = 0.22 + 0.78 * f; souls = Math.round(ZE_SOULS * f);
  }
  Ln.g.visible = !!at;
  if (at) {
    Ln.g.position.copy(z3v(at[0], at[1], G0 + at[2] + (st === 7 || st === 8 ? Math.sin(t * 1.3) * 0.015 : 0))); Ln.g.rotation.y = at[3];
    const k = souls / ZE_SOULS, flick = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
    const bb = Math.min(1, burn * 1.6), mix = (a, b) => a + (b - a) * bb;
    Ln.glassM.color.setRGB(mix(0.23, 1 - k * 0.4), mix(0.24, 0.78 + k * 0.2), mix(0.25, 0.42 + k * 0.4));
    Ln.glassM.opacity = burn ? 0.55 : 0.8;
    Ln.halo.visible = !!burn; Ln.halo.material.color.setRGB(1 - k * 0.35, 0.8 + k * 0.15, 0.45 + k * 0.4); Ln.halo.material.opacity = 0.55 * flick * Math.min(1, burn); Ln.halo.scale.setScalar(0.7 + k * 0.6);
    Ln.flame.visible = !!burn; Ln.flame.material.color.setRGB(1 - k * 0.3, 0.82 + k * 0.15, 0.5 + k * 0.35); Ln.flame.material.opacity = flick; Ln.flame.scale.set(0.05 * (0.6 + 0.4 * burn) * flick, 0.09 * (0.5 + 0.5 * burn) * (0.9 + 0.1 * flick), 1);
    Ln.light.intensity = burn ? (0.9 + k * 0.9) * flick * burn : 0; Ln.light.color.setRGB(1 - k * 0.3, 0.78 + k * 0.17, 0.45 + k * 0.4);
    for (let i = 0; i < Ln.motes.length; i++) {
      const s = Ln.motes[i], on = i < souls; s.visible = on; if (!on) continue;
      const a = (reduceMotion ? 0 : t * (0.9 + i * 0.07)) + i / ZE_SOULS * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.045, 0.15 + 0.06 * Math.sin(a * 1.7 + i), Math.sin(a) * 0.045); s.material.opacity = 0.7 + 0.3 * Math.sin(t * 4 + i * 2);
    }
  } else Ln.light.intensity = 0;
  // the tongue in someone else's hand
  const tg = Z3E.tongue, tw2 = st === 2 && who && who !== m;
  tg.visible = !!tw2; if (tw2) { tg.position.copy(z3v(who.x + Math.cos(who.h || 0) * 0.3, who.y - Math.sin(who.h || 0) * 0.3, G0 + (who.jz || 0) + 1.05)); tg.rotation.set(0, -(who.h || 0), 0.25); }
  // eight bells: the lens flares
  Z3E.flare.intensity = ZE.flare > 0 && T ? 3 * Math.min(1, ZE.flare) : 0;
  if (T) Z3E.flare.position.copy(z3v(T.x, T.y, G0 + T.z + 2.2));
}

// ---------- on top of the view ----------
// the Gannet's Doubloon: a gold coin with a gannet diving over the waves, 1887 under it, and on its back the Light
// (spin: the coin's turn, 0..1; the back shows for the half turn it's away from you)
function zeDrawCoin(q, x, y, r, spin, t) {
  const c = Math.cos((spin || 0) * Math.PI * 2), back = c < 0, sx = Math.max(0.04, Math.abs(c));
  q.save(); q.translate(x, y); q.scale(sx, 1);
  // the edge, milled
  q.fillStyle = '#7a5410'; q.beginPath(); q.arc(0, 0, r, 0, 6.2832); q.fill();
  const gr = q.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.45, '#f0c040'); gr.addColorStop(1, '#a8740c');
  q.fillStyle = gr; q.beginPath(); q.arc(0, 0, r * 0.9, 0, 6.2832); q.fill();
  q.strokeStyle = 'rgba(90,60,8,0.8)'; q.lineWidth = Math.max(1, r * 0.035);
  for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832; q.beginPath(); q.moveTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); q.lineTo(Math.cos(a) * r * 0.99, Math.sin(a) * r * 0.99); q.stroke(); }
  q.beginPath(); q.arc(0, 0, r * 0.76, 0, 6.2832); q.stroke();
  q.fillStyle = q.strokeStyle = 'rgba(96,62,6,0.9)'; q.lineCap = 'round'; q.lineJoin = 'round';
  if (!back) {
    // the gannet, diving: long wings swept back, pointed head and tail
    q.lineWidth = Math.max(1.2, r * 0.07);
    q.beginPath(); q.moveTo(-r * 0.52, -r * 0.18); q.quadraticCurveTo(-r * 0.2, -r * 0.32, 0, -r * 0.06); q.quadraticCurveTo(r * 0.2, -r * 0.32, r * 0.52, -r * 0.18); q.stroke();
    q.beginPath(); q.ellipse(0, -r * 0.02, r * 0.07, r * 0.22, 0, 0, 6.2832); q.fill();
    q.beginPath(); q.moveTo(-r * 0.05, r * 0.16); q.lineTo(0, r * 0.3); q.lineTo(r * 0.05, r * 0.16); q.fill();
    // the waves under it
    q.lineWidth = Math.max(1, r * 0.04);
    for (let j = 0; j < 2; j++) { const yy = r * (0.38 + j * 0.12); q.beginPath(); for (let i = -4; i <= 4; i++) { const xx = i * r * 0.1; if (i === -4) q.moveTo(xx, yy); else q.quadraticCurveTo(xx - r * 0.05, yy - r * 0.06, xx, yy); } q.stroke(); }
    q.font = `700 ${Math.round(r * 0.2)}px "IM Fell English SC", Georgia, serif`; q.textAlign = 'center'; q.textBaseline = 'middle';
    q.fillText('1887', 0, -r * 0.5);
  } else {
    // the Light: the tower, its lamp, and the beam out across the coin
    q.fillRect(-r * 0.08, -r * 0.2, r * 0.16, r * 0.55); q.fillRect(-r * 0.12, -r * 0.3, r * 0.24, r * 0.1);
    q.beginPath(); q.moveTo(-r * 0.12, -r * 0.3); q.lineTo(0, -r * 0.42); q.lineTo(r * 0.12, -r * 0.3); q.fill();
    q.globalAlpha = 0.55; q.beginPath(); q.moveTo(r * 0.05, -r * 0.28); q.lineTo(r * 0.66, -r * 0.46); q.lineTo(r * 0.66, -r * 0.1); q.closePath(); q.fill(); q.globalAlpha = 1;
    q.lineWidth = Math.max(1, r * 0.04); q.beginPath(); q.moveTo(-r * 0.5, r * 0.4); q.quadraticCurveTo(0, r * 0.3, r * 0.5, r * 0.4); q.stroke();
    q.font = `700 ${Math.round(r * 0.14)}px "IM Fell English SC", Georgia, serif`; q.textAlign = 'center'; q.textBaseline = 'middle';
    q.fillText('GANNET', 0, r * 0.56);
  }
  // a glint across it
  if (t != null && !reduceMotion) { const k = ((t * 0.6) % 1) * 2.4 - 1.2; q.globalCompositeOperation = 'lighter'; const lg = q.createLinearGradient(k * r - r * 0.3, -r, k * r + r * 0.3, r); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,250,220,0.45)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = lg; q.beginPath(); q.arc(0, 0, r * 0.9, 0, 6.2832); q.fill(); q.globalCompositeOperation = 'source-over'; }
  q.restore();
}
function zeHud() {
  const phone = FPS.touch, L = Math.max(14, FPS.safeLeft || 0), top = phone ? Math.max(10, FPS.safeTop || 0) + 40 : 18;
  // what you carry: a small mark, top left
  if (zeMine() && (ZE.st === 2 || ZE.st === 5 || ZE.st === 6 || ZE.st === 9) && !(FPS.me.dead > 0)) {
    ctx.save(); ctx.translate(L + 12, top + 14);
    if (ZE.st === 2) { ctx.fillStyle = '#5a7a68'; ctx.beginPath(); ctx.arc(0, 4, 6, 0, 6.2832); ctx.fill(); ctx.fillRect(-1.5, -10, 3, 12); }
    else {
      const lit = ZE.st !== 5, k = ZE.st === 9 ? 1 : 0;
      if (lit) { const gr = ctx.createRadialGradient(0, 2, 1, 0, 2, 18); gr.addColorStop(0, k ? 'rgba(200,255,220,0.55)' : 'rgba(255,200,110,0.55)'); gr.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = gr; ctx.fillRect(-18, -16, 36, 36); }
      ctx.fillStyle = lit ? (k ? '#d8ffe8' : '#ffd890') : '#5a5c5e'; ctx.fillRect(-5, -4, 10, 12);
      ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 2; ctx.strokeRect(-6, -5, 12, 14); ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(0, -11); ctx.lineTo(7, -5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -13, 3, 0, 6.2832); ctx.stroke();
    }
    ctx.restore();
  }
  // the coin
  if (ZE.cele > 0) {
    const k = ZE.cele, a = Math.min(1, (8 - k) * 1.5, k), show = 8 - k;
    if (show > 2.2) {
      const t = g.t, r = Math.min(W, H) * (phone ? 0.13 : 0.11) * Math.min(1, (show - 2.2) * 2.5);
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a));
      const gr = ctx.createRadialGradient(cx, H * 0.42, r * 0.5, cx, H * 0.42, r * 3);
      gr.addColorStop(0, 'rgba(255,220,120,0.35)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gr; ctx.fillRect(cx - r * 3, H * 0.42 - r * 3, r * 6, r * 6);
      // sparks round it
      if (!reduceMotion) for (let i = 0; i < 14; i++) { const an = i / 14 * 6.2832 + t * 0.7, rr = r * (1.5 + 0.3 * Math.sin(t * 3 + i)); if (Math.sin(t * 5 + i * 2.3) > 0.3) { ctx.fillStyle = '#fff4c8'; ctx.fillRect(cx + Math.cos(an) * rr - 1.5, H * 0.42 + Math.sin(an) * rr - 1.5, 3, 3); } }
      zeDrawCoin(ctx, cx, H * 0.42, r, reduceMotion ? 0 : t * 0.35, t);
      { const y0 = H * 0.42 + r + (phone ? 10 : 16), bh = phone ? 52 : 70, bw = Math.min(W * 0.92, phone ? 360 : 620); ctx.fillStyle = 'rgba(8,10,14,0.62)'; ctx.fillRect(cx - bw / 2, y0, bw, bh); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `400 ${phone ? 22 : 34}px "IM Fell English SC", serif`; ctx.fillStyle = '#ffe9a8';
      ctx.fillText('The Gannet’s Doubloon', cx, H * 0.42 + r + (phone ? 26 : 38));
      ctx.font = `600 ${phone ? 11 : 13}px "Courier Prime", monospace`; ctx.fillStyle = 'rgba(236,228,207,0.9)';
      ctx.fillText(`A pirate token: yours to keep (${ptTokens()} to spend on the Keeper’s Last Light card)`, cx, H * 0.42 + r + (phone ? 48 : 68), W * 0.9);
      ctx.restore();
    }
  }
}

// ---------- pirate tokens: kept on this device ----------
// (var, not const: the save backup in crates.js can ask for it before this file has run, in the one-file build)
var PT = null;
const PT_KEY = 'skerry-pirate';
// what a token buys: [id, which store]
const PT_ITEMS = [
  ['oc_gannetcap', 'outfit'], ['oc_marenoil', 'outfit'],
  ['cl_doubloon', 'weapon'], ['pb_jolly', 'weapon'],
  ['rc_hoard', 'banner'],
];
function ptLoad() {
  PT = { earned: 0, unlocked: [] };
  try {
    const d = JSON.parse(localStorage.getItem(PT_KEY) || 'null');
    if (d && typeof d === 'object') { PT.earned = Math.max(0, Math.min(9999, d.earned | 0)); PT.unlocked = ptClean(d.unlocked); }
  } catch (e) {}
  PT.earned = Math.max(PT.earned, PT.unlocked.length);
}
const ptClean = a => Array.isArray(a) ? [...new Set(a.filter(id => PT_ITEMS.some(it => it[0] === id)))] : [];
function ptSave() { try { localStorage.setItem(PT_KEY, JSON.stringify({ earned: PT.earned, unlocked: PT.unlocked })); } catch (e) {} if (typeof renderBackupDot === 'function') try { renderBackupDot(); } catch (e) {} }
function ptTokens() { return PT ? Math.max(0, PT.earned - PT.unlocked.length) : 0; }
// for the save backup (crates.js): everything ever earned, and what's been unlocked
function ptData() { return PT ? { e: PT.earned, u: PT.unlocked.slice() } : null; }
// a backup loaded: keep the most ever earned, and everything unlocked on either side
function ptMerge(d) {
  if (!PT || !d || typeof d !== 'object') return false;
  const u = ptClean(d.u), e = Math.max(0, Math.min(9999, d.e | 0));
  let changed = false;
  for (const id of u) if (!PT.unlocked.includes(id)) { PT.unlocked.push(id); changed = true; }
  const earned = Math.max(PT.earned, e, PT.unlocked.length);
  if (earned !== PT.earned) { PT.earned = earned; changed = true; }
  if (changed) { ptSave(); ptApply(); ptRender(); }
  return changed;
}
function ptGrant() {
  if (!PT) ptLoad();
  PT.earned = Math.min(9999, PT.earned + 1); ptSave(); ptRender();
}
// what's been unlocked is owned in its own store, where it's worn or equipped the usual way
function ptApply() {
  if (!PT) return;
  for (const id of PT.unlocked) {
    const kind = (PT_ITEMS.find(it => it[0] === id) || [])[1];
    try {
      if (kind === 'outfit' && typeof OC !== 'undefined' && !OC.owned[id]) { OC.owned[id] = 1; ocSave(); ocRender(); }
      else if (kind === 'weapon' && typeof WC !== 'undefined' && !WC.owned[id]) { WC.owned[id] = 1; wcSave(); wcRender(); }
      else if (kind === 'banner' && typeof RC !== 'undefined' && !RC.owned[id]) { RC.owned[id] = 1; rcSave(); rcRender(); }
    } catch (e) {}
  }
}
function ptUnlock(id) {
  if (!PT || ptTokens() < 1 || PT.unlocked.includes(id) || !PT_ITEMS.some(it => it[0] === id)) return false;
  PT.unlocked.push(id); ptSave(); ptApply(); ptRender();
  try { sfxReveal(4); } catch (e) {}
  return true;
}
function ptItem(id) {
  const kind = (PT_ITEMS.find(it => it[0] === id) || [])[1];
  if (kind === 'outfit') return { kind, it: OC_BY_ID[id], on: () => ocEquippedId() === id, equip: () => ocEquip(id), card: () => ocCard(OC_BY_ID[id]), verb: ['Wear', 'Wearing'] };
  if (kind === 'weapon') { const s = WC_SKIN_BY_ID[id]; return { kind, it: s, on: () => WC.equipped[s.weapon] === id, equip: () => wcEquip(s), card: () => wcCard(s), verb: ['Equip', 'Equipped'] }; }
  if (kind === 'banner') return { kind, it: RC_SKIN_BY_ID[id], on: () => rcEquippedId() === id, equip: () => rcEquip(id), card: () => rcCard(RC_SKIN_BY_ID[id]), verb: ['Fly', 'Flying'] };
  return null;
}

// ---------- the Gannet's locker, from the Lighthouse's card ----------
function ptStyle() {
  if ($('ptStyle')) return;
  const st = document.createElement('style'); st.id = 'ptStyle';
  st.textContent = `
.skincard.r-pirate { background: linear-gradient(180deg, rgba(6,14,16,0.96) 35%, color-mix(in srgb, var(--rc) 24%, rgba(6,12,18,0.96))); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rc) 60%, transparent), 0 0 16px -6px var(--rc); }
.skincard.r-pirate b { color: #d0fff0; }
.zmtokens { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 6px 0 0; }
.zmtokens canvas { width: 26px; height: 26px; flex: none; }
.zmtokens span { font-family: "Courier Prime", monospace; font-size: 13px; color: #ffe9a8; }
.ptcoinrow { display: flex; align-items: center; gap: 14px; margin: 8px 0 4px; }
.ptcoinrow canvas { width: 64px; height: 64px; flex: none; }
.ptcoinrow b { font-family: "IM Fell English SC", serif; font-size: 20px; color: #ffe9a8; font-weight: 400; }
.ptcard .inv { grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); }
`;
  document.head.appendChild(st);
}
function ptBuildCard() {
  if ($('ptCard')) return;
  ptStyle();
  const ov = document.createElement('div');
  ov.className = 'overlay cratecard wcratecard ptcard'; ov.id = 'ptCard'; ov.hidden = true;
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'ptHead');
  ov.innerHTML = `<div class="card">
      <div class="cardtop sticky"><span class="eyebrow">Keeper’s Last Light · what the sea kept back</span><button class="tool closebtn" id="ptClose" type="button">✕ Close</button></div>
      <h1 id="ptHead">The Gannet’s Locker</h1>
      <p>The brig Gannet went down off the Light in the winter of 1887 with her crew and everything they carried. Some of it the sea keeps for whoever brings her crew home: pay a pirate token for each. No crate holds any of these. What you take shows up with your other outfits, weapon finishes and banners, to wear the usual way.</p>
      <div class="ptcoinrow"><canvas id="ptCoin" width="128" height="128" aria-hidden="true"></canvas><div><b id="ptCount"></b><p class="muted" id="ptNote"></p></div></div>
      <div class="inv" id="ptInv"></div>
    </div>`;
  const after = $('ocrateCard');
  if (after && after.parentNode) after.parentNode.insertBefore(ov, after.nextSibling); else document.body.appendChild(ov);
  $('ptClose').addEventListener('click', ptHide);
}
function ptShow(e) {
  ptBuildCard();
  PT_UI.opener = e && e.currentTarget || document.activeElement;
  const card = $('ptCard'); card.hidden = false; ptRender(); card.scrollTop = 0;
  $('ptClose').focus({ preventScroll: true });
}
function ptHide() {
  const card = $('ptCard'); if (!card || card.hidden) return;
  card.hidden = true;
  const back = PT_UI.opener && document.contains(PT_UI.opener) ? PT_UI.opener : $('zmLocker');
  if (back) try { back.focus({ preventScroll: true }); } catch (err) {}
}
const PT_UI = { opener: null };
function ptRender() {
  if (!PT) return;
  const n = ptTokens();
  const line = $('zmTokenN'); if (line) line.textContent = 'Pirate tokens: ' + n;
  const mini = $('zmTokenCoin'); if (mini) { const q = mini.getContext('2d'); q.clearRect(0, 0, mini.width, mini.height); zeDrawCoin(q, mini.width / 2, mini.height / 2, mini.width * 0.46, 0); }
  const card = $('ptCard'); if (!card || card.hidden) return;
  $('ptCount').textContent = n === 1 ? '1 pirate token' : n + ' pirate tokens';
  $('ptNote').textContent = (PT.earned ? `${PT.earned} found in all, ${PT.unlocked.length} spent.` : 'None found yet. The Light keeps its secrets.') + ' Kept in this browser, and in your save backup.';
  const inv = $('ptInv'); inv.textContent = '';
  for (const [id] of PT_ITEMS) {
    const I = ptItem(id); if (!I || !I.it) continue;
    const have = PT.unlocked.includes(id), on = have && I.on();
    const c = I.card(); if (!have) c.classList.add('locked'); if (on) c.classList.add('equipped');
    c.dataset.id = id;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tool';
    if (!have) { b.textContent = 'Unlock · 1 token'; b.disabled = n < 1; b.setAttribute('aria-label', 'Unlock ' + I.it.name + ' for one pirate token'); b.addEventListener('click', () => { if (ptUnlock(id)) ptFocus(id); }); }
    else { b.textContent = on ? I.verb[1] : I.verb[0]; b.disabled = on; b.setAttribute('aria-label', (on ? I.verb[1] + ': ' : I.verb[0] + ' ') + I.it.name); b.addEventListener('click', () => { I.equip(); ptRender(); ptFocus(id); }); }
    c.appendChild(b);
    inv.appendChild(c);
  }
}
function ptFocus(id) { const c = [...document.querySelectorAll('#ptInv .skincard')].find(k => k.dataset.id === id); const b = c && c.querySelector('button'); if (b) b.focus({ preventScroll: true }); }
// the coin turning, and the moving things moving, while the locker's open
setInterval(() => {
  const card = $('ptCard'); if (!card || card.hidden) return;
  const t = performance.now() / 1000, cv = $('ptCoin');
  if (cv) { const q = cv.getContext('2d'); q.clearRect(0, 0, cv.width, cv.height); zeDrawCoin(q, cv.width / 2, cv.height / 2, cv.width * 0.45, reduceMotion ? 0 : t * 0.25, t); }
  if (reduceMotion) return;
  for (const c of card.querySelectorAll('canvas.ocprev')) if (c._oc && c._oc.fx) ocDrawPreview(c, c._oc, t);
  for (const c of card.querySelectorAll('canvas.rcprev')) if (c._skin) rcDrawPreview(c, c._skin, t);
}, 100);

ptLoad();
// (once every file has run: the stores the unlocked things live in, the button, the line on the card)
setTimeout(() => {
  ptStyle(); ptApply(); ptRender();
  const b = $('zmLocker'); if (b) b.addEventListener('click', ptShow);
  addEventListener('keydown', e => { if (e.key !== 'Escape') return; const c = $('ptCard'); if (!c || c.hidden) return; e.preventDefault(); e.stopPropagation(); ptHide(); }, true);
  // another tab earned or spent one
  addEventListener('storage', e => { if (e.key === PT_KEY) { ptLoad(); ptApply(); ptRender(); } });
}, 0);
