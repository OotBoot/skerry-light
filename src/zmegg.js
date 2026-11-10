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
const Z3E = {};
function ze3dBuild(grp) {
  const P = ZE.P; if (!P) return;
  const G0 = FPSC.GROUND, soft = z3Soft('rgba(255,250,225,1)', 'rgba(255,250,225,0)');
  const glint = c => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: new THREE.Color(c || '#fff4d0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(0.3); s.visible = false; grp.add(s); return s; };
  Z3E.glints = {
    log: glint(), net: glint('#d8fff0'), boat: glint(), tap: glint('#ffe0a0'), hook: glint('#ffd8a0'), top: glint('#fff0c0'),
  };
  // the Gannet's bell, on its bracket
  {
    const g = new THREE.Group(); g.position.copy(z3v(P.bell.x, P.bell.y, G0 + P.bell.z)); grp.add(g);
    const iron = z3Lam('#26282c'), bronze = new THREE.MeshPhongMaterial({ color: 0x8a6a2c, specular: 0x806030, shininess: 40, emissive: 0x1a1206 }), green = z3Lam('#4a6a58');
    // the bracket out from the wall (east: +x)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.07), iron); arm.position.set(0.28, 0.42, 0); g.add(arm);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), iron); strut.position.set(0.5, 0.2, 0); strut.rotation.z = 0.7; g.add(strut);
    const swing = new THREE.Group(); swing.position.set(0, 0.4, 0); g.add(swing);
    const pts = []; for (const [r, y] of [[0.02, 0], [0.12, -0.02], [0.15, -0.08], [0.16, -0.18], [0.19, -0.3], [0.25, -0.4], [0.26, -0.44], [0.0, -0.44]]) pts.push(new THREE.Vector2(r, y));
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), bronze); swing.add(body);
    const verd = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.018, 6, 20), green); verd.rotation.x = Math.PI / 2; verd.position.y = -0.42; swing.add(verd);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), iron); crown.position.y = 0.03; swing.add(crown);
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), iron); tongue.position.y = -0.38; swing.add(tongue);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), z3Lam('#8a7a5a')); rope.position.y = -0.62; swing.add(rope);
    Z3E.bell = { g, swing, tongue, rope };
  }
  // her storm lantern: an iron frame, glass, a cap and a ring, with its own light
  {
    const g = new THREE.Group(); grp.add(g); g.visible = false;
    const iron = z3Lam('#2a2622'), brass = z3Lam('#9a7a34');
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.05, 10), iron); base.position.y = 0.025; g.add(base);
    const glassM = new THREE.MeshBasicMaterial({ color: 0x3a3e40, transparent: true, opacity: 0.85 });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.2, 10), glassM); glass.position.y = 0.15; g.add(glass);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.22, 0.015), iron); b.position.set(Math.cos(a) * 0.09, 0.15, Math.sin(a) * 0.09); g.add(b); }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.09, 10), iron); cap.position.y = 0.3; g.add(cap);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.008, 4, 14), brass); band.rotation.x = Math.PI / 2; band.position.y = 0.06; g.add(band);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 12), iron); ring.position.y = 0.37; g.add(ring);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: new THREE.Color('#ffc870'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); halo.position.y = 0.15; halo.scale.setScalar(0.9); g.add(halo);
    const light = new THREE.PointLight(0xffc070, 0, 9, 1.6); light.position.y = 0.2; g.add(light);
    Z3E.lantern = { g, glassM, halo, light };
  }
  // the tongue, when someone carries it (only the others see it in a hand)
  { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), z3Lam('#3a4a40')); m.visible = false; grp.add(m); Z3E.tongue = m; }
  // the lens flaring, at the end
  { const L = new THREE.PointLight(0xfff0c0, 0, 40, 1.2); grp.add(L); Z3E.flare = L; }
}
function ze3d(dt) {
  const P = ZE.P; if (!P || !Z3E.glints || !Z3E.glints.log.parent) return;
  const t = g.t, G0 = FPSC.GROUND, st = ZE.st, m = FPS.me;
  // glints: a brief twinkle now and then, as of something catching the light
  const tw = (s, on, x, y, z, ph, big) => {
    s.visible = on; if (!on) return;
    const k = Math.pow(Math.max(0, Math.sin(t * 1.25 + ph)), 14);
    s.position.copy(z3v(x, y, G0 + z)); s.material.opacity = 0.1 + 0.9 * k; s.scale.setScalar((big || 0.22) * (0.5 + k));
  };
  const Gl = Z3E.glints, T = zeTop();
  tw(Gl.log, st === 0, P.log.x, P.log.y, P.log.z, 0.3);
  tw(Gl.net, st === 1, P.net.x, P.net.y, P.net.z, 1.7, 0.28);
  tw(Gl.boat, st === 4, P.boat.x, P.boat.y, P.boat.z + 0.1, 2.9, 0.3);
  tw(Gl.tap, st === 5 && zeMine(), P.tap.x, P.tap.y, P.tap.z, 0.9);
  tw(Gl.hook, st === 6 && zeMine(), P.hook.x, P.hook.y, P.hook.z + 0.4, 2.2);
  tw(Gl.top, st === 9 && zeMine() && !!T, T ? T.x : 0, T ? T.y : 0, T ? T.z + 1.4 : 0, 0.5, 0.45);
  // the bell: swinging when struck, its tongue in it or not
  const B = Z3E.bell;
  B.swing.rotation.z = Math.sin(t * 9) * 0.32 * ZE.swing; B.tongue.visible = B.rope.visible = st >= 3;
  // the lantern: under the boat, carried, on its hook
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
  Ln.g.visible = !!at;
  if (at) {
    Ln.g.position.copy(z3v(at[0], at[1], G0 + at[2] + (st === 7 || st === 8 ? Math.sin(t * 1.3) * 0.015 : 0))); Ln.g.rotation.y = at[3];
    const k = souls / ZE_SOULS, flick = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
    Ln.glassM.color.setRGB(burn ? 1 - k * 0.4 : 0.23, burn ? 0.78 + k * 0.2 : 0.24, burn ? 0.42 + k * 0.4 : 0.25);
    Ln.halo.visible = !!burn; Ln.halo.material.color.setRGB(1 - k * 0.35, 0.8 + k * 0.15, 0.45 + k * 0.4); Ln.halo.material.opacity = 0.55 * flick; Ln.halo.scale.setScalar(0.7 + k * 0.6);
    Ln.light.intensity = burn ? (0.9 + k * 0.9) * flick : 0; Ln.light.color.setRGB(1 - k * 0.3, 0.78 + k * 0.17, 0.45 + k * 0.4);
  } else Ln.light.intensity = 0;
  // the tongue in someone else's hand
  const tg = Z3E.tongue, tw2 = st === 2 && who && who !== m;
  tg.visible = !!tw2; if (tw2) tg.position.copy(z3v(who.x + Math.cos(who.h || 0) * 0.3, who.y - Math.sin(who.h || 0) * 0.3, G0 + (who.jz || 0) + 0.85));
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
