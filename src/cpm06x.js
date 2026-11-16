'use strict';
// The Chronicle of the Light, mission 6, The Kittiwake: its three parts and its cinematics (the ship, her flares and
// Verity's rules are src/cpm06.js).
//  I.  The Nets (cp_kwnets). Dusk on the grounds past the Near Skerries, hove to on her nets. Haul them in at the
//      capstan (hold Use; more hands heave quicker): three nets, and each comes up with the drowned in the mesh, who
//      climb over the starboard rail. Then light her three lamps before it's full dark (hold Use at each). Afterwards
//      (m06_sits): something small is sitting on the hatch, smiling, and the skipper won't hear of wasting a flare on it.
//  II. The Middle Watch (cp_kwwatch). Midnight to the end of the watch, a bell every half hour (KWX.BELL seconds),
//      running home for Wrackhaven under sail. Somebody holds the tiller or she drifts down on the skerries (lose her
//      altogether and she strikes: the mission's lost). Verity comes, one of you at a time, and the drowned come over the
//      rail. At four bells a sea comes aboard (m06_wave) and soaks the locker: from then on a wet flare has to be dried in
//      the caboose first. At seven bells Verity sits down in front of the skipper himself, and he lets it stay
//      (m06_skipper); her rudder goes, she won't answer the tiller, and she strikes (m06_strike).
//  III. Abandon Ship (cp_kwwreck). She's on the rocks, listing, dark but for the caboose and the flares, the sea up to
//      her deck, the drowned all over her, and Verity coming often. Cut the punt's two lashings, launch her (hold Use
//      together), and get everyone into her. They pull away (m06_pull) and the Kittiwake goes down; then, in the punt,
//      he's sitting in the bow. The last flare in his face, and he rolls over the side: the outro (m06_outro), dawn, and
//      the page of the keeper's log the hand's account became.
// Voice lines: cp_m06_01 to cp_m06_62 (campaign-sound/m06.md).

const KWX = { BELL: 30, HAUL: 7, LAMP: 1.4, LASH: 2.5, LAUNCH: 9, ROUND: 4 };
const kwSay = (k, who, text, vo) => { const S = RAID.st; if (S.said[k]) return; S.said[k] = 1; cpSay(who, text, vo); };
// one of the drowned up over the rail (side: -1 port, 1 starboard, 0 either; y0, y1: where along her)
function kwRail(side, y0, y1, o) {
  const n = kwN();
  for (let t = 0; t < 12; t++) {
    const s = side || (Math.random() < 0.5 ? -1 : 1), y = y0 + Math.random() * (y1 - y0), x = s * (kwHalfW(y) - 0.7), [wx, wy] = kwW(x, y);
    if (zmBlockedAt(wx, wy, 0.4, 0) || kwCrew().some(p => Math.hypot(p.x - wx, p.y - wy) < 2.2)) continue;
    const z = raidSpawnAt(wx, wy, Object.assign({ kind: Math.random() < 0.25 ? 'jog' : 'walk', rise: 1.1, hp: zmHp(KWX.ROUND) * (0.9 + Math.random() * 0.2) * (1 + 0.2 * (n - 1)) }, o || {}));
    if (z) zmSound('moan', Math.hypot(z.x - FPS.me.x, z.y - FPS.me.y), fpsEar(z.x, z.y), z.kind);
    return z;
  }
  return null;
}
const kwAlive = () => ZM.z.filter(z => !z.dead).length;
// the drowned, a few at a time: every [a, b] seconds (fewer with fewer of you), no more than cap aboard at once
function kwTrickle(dt, every, cap, side, y0, y1) {
  const S = RAID.st, n = kwN(); S.trT = (S.trT == null ? 4 : S.trT) - dt;
  if (S.trT > 0) return; S.trT = (every[0] + Math.random() * (every[1] - every[0])) / (1 + 0.3 * (n - 1));
  if (kwAlive() < cap + 2 * (n - 1)) kwRail(side || 0, y0 == null ? -6.5 : y0, y1 == null ? 7 : y1);
}

// =====================================================================================================================
// I. The Nets
// =====================================================================================================================
cpStage('kwnets', kwStage({
  n: 'The Nets', kwSail: false, kwHolds: ['kwcap', 'kwlamp'], kwEvery: [30, 36],
  q: (sid, k, a) => kwQ(sid, k, a),
  enter() {
    kwState({ lk: 8, ph: 'haul', haul: 0, nets: 0, lampT: [0, 0, 0], night: 0.25, said: {} });
    RAID.st.v.next = 1e9;   // (not yet)
    FPS.me.h = 0;
    if (ZM.net !== 'client') { cpObjective('Haul the nets in at the capstan'); cpWaypoint(KW_AT.capstan[0], KW_AT.capstan[1] - 0.9, 'The capstan'); }
  },
  tick(dt) {
    const S = RAID.st, n = kwN();
    S.night = Math.min(0.85, S.night + dt / 260);
    kwSay('a', 'skip', 'Man the capstan. Heave, and keep heaving.', 'cp_m06_05');
    if (S.ph === 'haul') {
      // the capstan: each of you heaving at it adds, up to three hands' worth
      const h = kwTakeHold('kwcap', 0, dt * 3);
      if (h > 0) { S.haul += h / KWX.HAUL; S.heave = 0.4; }
      if (S.heave > 0) S.heave -= dt;
      if (S.haul >= S.nets + 1) {
        S.nets++;
        // a net comes up, and they come up in it
        const k = 2 + n + S.nets; for (let i = 0; i < k; i++) setTimeout(() => { if (RAID.st === S && !ZM.over) kwRail(1, 1, 7.5); }, i * 700);
        if (S.nets === 1) { kwSay('n1', 'jory', 'There’s weight in her. More than fish.', 'cp_m06_06'); setTimeout(() => { if (RAID.st === S) kwSay('n1b', 'skip', 'Drowned men in the mesh. Put them back where they came from.', 'cp_m06_07'); }, 2600); }
        if (S.nets === 2) kwSay('n2', 'jory', 'Second net’s coming. God, they’re in this one too.', 'cp_m06_08');
        if (S.nets === 3) { kwSay('n3', 'skip', 'That’s the last of it. Now the lamps, the three of them. I’ll not be run down in the dark.', 'cp_m06_10'); S.ph = 'lamps'; cpObjective('Light her three lamps: the bow, the masthead and the stern'); cpWaypoint(null); }
        else if (S.nets === 2) setTimeout(() => { if (RAID.st === S) kwSay('n2b', 'skip', 'Last net. Heave!', 'cp_m06_09'); }, 4000);
      }
      kwTrickle(dt, [14, 20], 2, 0);
    } else if (S.ph === 'lamps') {
      for (let i = 0; i < 3; i++) if (!S.lamps[i]) { S.lampT[i] += kwTakeHold('kwlamp', i); if (S.lampT[i] >= KWX.LAMP) { S.lamps[i] = 1; kwLine(`${KW_AT.lamps[i][3][0].toUpperCase() + KW_AT.lamps[i][3].slice(1)} is lit.`); } }
      const left = S.lamps.filter(x => !x).length;
      cpObjective(left ? `Light her lamps: ${3 - left} of 3 lit` : '');
      if (!left && !S.lampsDone) { S.lampsDone = 1; kwSay('l', 'skip', 'Good. Now we go home.', 'cp_m06_12'); S.doneT = 3; }
      if (S.doneT > 0) { S.doneT -= dt; if (S.doneT <= 0) { for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); cpDone(); } }
      kwTrickle(dt, [11, 16], 3, 0);
      if (!S.said.lh && S.lamps.every(x => !x) && (S.lampsHintT = (S.lampsHintT || 0) + dt) > 12) kwSay('lh', 'jory', 'Lamps want lighting before it’s full dark.', 'cp_m06_62');
    }
  },
  me(dt) { kwMe(dt); },
  kwConsider(c) {
    const S = RAID.st;
    if (S.ph === 'haul') { const [x, y] = kwW(KW_AT.capstan[0], KW_AT.capstan[1] - 0.9); c({ k: 'kwcap', i: 0 }, x, y, 0, 1.6, false); }
    if (S.ph === 'lamps') KW_AT.lamps.forEach(([lx, ly], i) => { if (!S.lamps[i]) { const [x, y] = kwW(lx * 0.6, ly + (ly > 0 ? -0.6 : 0.6)); c({ k: 'kwlamp', i }, x, y, 0, 1.6, false); } });
  },
  kwPrompt(o) {
    const S = RAID.st;
    if (o.k === 'kwcap') return { text: `Hold to heave at the capstan (net ${Math.min(3, S.nets + 1)} of 3)`, hold: true };
    if (o.k === 'kwlamp') return { text: `Hold to light ${KW_AT.lamps[o.i][3]}`, hold: true };
    return null;
  },
  kwUse(o) { return o.k === 'kwcap' || o.k === 'kwlamp'; },
  kwPack() { const S = RAID.st; return [S.ph === 'haul' ? 0 : 1, Math.round(S.haul * 100), S.nets, Math.round(S.night * 100), S.heave > 0 ? 1 : 0]; },
  kwApply(a) { if (!Array.isArray(a)) return; const S = RAID.st; S.ph = a[0] ? 'lamps' : 'haul'; S.haul = (a[1] | 0) / 100; S.nets = a[2] | 0; S.night = (a[3] | 0) / 100; S.heave = a[4] ? 0.2 : 0; },
  kwNight() { return RAID.st.night || 0.3; },
  kwNpcAt() {
    const S = RAID.st, cap = KW_AT.capstan, a = S.heave > 0 ? g.t * 0.9 : 0;
    return KW.cineAt || { skip: { x: -1.1, y: -6.2, h: 0.2 }, jory: { x: cap[0] + Math.cos(a) * 1.05, y: cap[1] + Math.sin(a) * 1.05, h: a + Math.PI, spd: S.heave > 0 ? 1.2 : 0 } };
  },
  hud(phone, mono, fell) {
    const S = RAID.st, extra = [];
    if (S.ph === 'haul') extra.push([`The nets: ${S.nets} of 3 in · heaving ${Math.round((S.haul - S.nets) * 100)}%`, 'rgba(200,230,215,0.9)']);
    kwHudLines(phone, mono, fell, extra);
  },
  music: () => 'cpm06nets',
}));

// =====================================================================================================================
// II. The Middle Watch
// =====================================================================================================================
cpStage('kwwatch', kwStage({
  n: 'The Middle Watch', kwSail: true, kwHolds: [],
  get kwEvery() { return RAID.st.wet ? [20, 27] : [26, 34]; },
  get kwStove() { return !!RAID.st.wet; },
  q: (sid, k, a) => kwQ(sid, k, a),
  enter() {
    kwState({ lk: 8, lamps: [1, 1, 1], wt: 0, wet: 0, ph: 'watch', said: {}, skipGone: 0, endT: 0 });
    RAID.st.v.next = 2.5;   // (he's sitting there already, as the last part left him)
    FPS.me.h = Math.PI;
    if (ZM.net !== 'client') { cpObjective('Hold her course for Wrackhaven, and keep Verity off'); cpWaypoint(KW_AT.helm[0], KW_AT.helm[1], 'The tiller'); }
  },
  tick(dt) {
    const S = RAID.st, n = kwN();
    if (S.ph === 'watch') {
      S.wt += dt;
      const b = Math.min(8, Math.floor(S.wt / KWX.BELL));
      if (b > S.bells) { S.bells = b; kwLine(`${['', 'One bell', 'Two bells', 'Three bells', 'Four bells', 'Five bells', 'Six bells', 'Seven bells', 'Eight bells'][b]} in the middle watch.`); if (b === 2) kwSay('b2', 'skip', 'Two bells. Keep her full and by.', 'cp_m06_25'); if (b === 6) kwSay('b6', 'jory', 'I can see the Light. We’re nearly home.', 'cp_m06_26'); }
      if (S.wt > 4) kwSay('a', 'skip', 'Middle watch. Somebody take the tiller and keep her off the rocks.', 'cp_m06_20');
      // the wave, at four bells
      if (b >= 4 && !S.wet) { S.wet = 1; cpCine('m06_wave', () => { const T = RAID.st; T.lkw += T.lk + 2; T.lk = 0; cpObjective('Dry the flares at the caboose, hold her course, and keep Verity off'); cpWaypoint(KW_AT.stove[0] + 0.7, KW_AT.stove[1], 'The caboose'); setTimeout(() => { if (RAID.st === T) kwSay('cud', 'jory', 'There’s two more were in the cuddy. Wet as the rest.', 'cp_m06_31'); }, 2500); setTimeout(() => { if (RAID.st === T) cpWaypoint(KW_AT.helm[0], KW_AT.helm[1], 'The tiller'); }, 14000); }); }
      // the skipper, at seven bells (once Verity is off whoever he's with)
      if (b >= 7 && !S.v.on && !S.skipT) { S.skipT = 1; S.ph = 'skip'; cpCine('m06_skipper', () => { const T = RAID.st; Object.assign(T.v, { on: 1, npc: 1, sid: '', t: KWC.VT - 7, mo: 0, x: FPSC.CX + 0.15, y: FPSC.CY - 5.3, seq: (T.v.seq + 1) % 1000 }); cpObjective('Verity is sitting in front of the skipper'); cpWaypoint(null); }); }
      if (kwHelmTick(dt, 1 + 0.25 * Math.min(1, S.wt / 200)) >= 1) cpFail('The Kittiwake went on the skerries with no hand on her tiller');
      if (S.drift > 0.6) kwSay('dr' + (S.bells >> 1), 'skip', 'Mind her head! She’s falling off towards the skerries!', 'cp_m06_24');
      kwVerityTick(dt);
      kwTrickle(dt, S.wet ? [9, 13] : [12, 17], S.wet ? 4 : 3, 0);
    } else if (S.ph === 'skip') {
      // he won't be helped: Verity stands up in front of the skipper, and he's gone
      const v = S.v;
      if (v.on && v.npc) { v.t += dt; if (v.t >= KWC.VT && v.mo <= 0) v.mo = 0.0001; if (v.mo > 0) { v.mo += dt; if (v.mo >= KWC.VM) { v.on = 0; v.mo = 0; S.skipGone = 1; S.ph = 'adrift'; kwSay('gone', 'jory', 'He’s gone. The skipper’s gone. And she won’t answer the tiller: her rudder’s broke!', 'cp_m06_37'); cpObjective('She won’t answer the tiller'); } } }
      kwHelmTick(dt, 0.2);
    } else if (S.ph === 'adrift') {
      S.drift = Math.min(1, S.drift + dt / 6); S.helm = '';
      if (S.drift >= 1 && !S.endT) { S.endT = 1; for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); cpDone(); }
    }
  },
  me(dt) {
    kwMe(dt);
    const S = RAID.st;
    if (S.bells !== KW.bellsSeen) { const n = S.bells - (KW.bellsSeen | 0); KW.bellsSeen = S.bells; if (n > 0 && S.bells > 0) for (let i = 0; i < S.bells; i++) setTimeout(() => { try { if (!soundOff()) sfxBellFar(0, i % 2 ? 0.45 : 0.55); } catch (e) {} }, (i >> 1) * 900 + (i % 2) * 320); }
  },
  kwPrompt(o) { const S = RAID.st; if (o.k === 'kwv' && S.v.npc) return { text: 'The skipper won’t let you near it' }; return null; },
  kwUse(o) { const S = RAID.st; if (o.k === 'kwv' && S.v.npc) { zmSound('no'); fpsFeed('“Leave it be, I said!” The skipper shoves you off.'); return true; } return false; },
  kwShoo(sid) { kwSay('shoo1', 'skip', 'Who fired that? I said those were for ships in trouble!', 'cp_m06_22'); setTimeout(() => { if (RAID.st && RAID.st.said) kwSay('shoo2', 'jory', 'We are a ship in trouble, Skipper.', 'cp_m06_23'); }, 3000); },
  kwPack() { const S = RAID.st; return [Math.round(S.wt * 10), S.wet, ['watch', 'skip', 'adrift'].indexOf(S.ph), S.skipGone]; },
  kwApply(a) { if (!Array.isArray(a)) return; const S = RAID.st; S.wt = (a[0] | 0) / 10; S.wet = a[1] | 0; S.ph = ['watch', 'skip', 'adrift'][a[2] | 0] || 'watch'; S.skipGone = a[3] | 0; },
  kwNight: () => 1,
  kwRocks() { const S = RAID.st; return 0.35 + 2.6 * (1 - clamp(S.drift, 0, 1)); },
  kwNpcAt() {
    const S = RAID.st; if (KW.cineAt) return KW.cineAt;
    return { skip: S.skipGone ? null : S.ph !== 'watch' ? { x: 0.15, y: -7.0, h: 0, cr: 0.4 } : { x: 0.5, y: 7.6, h: 0.1 }, jory: { x: -0.7, y: -3.7, h: Math.PI * 0.75 } };
  },
  hud(phone, mono, fell) {
    const S = RAID.st;
    kwHudLines(phone, mono, fell, [[`The middle watch: ${S.bells ? ['', 'one bell', 'two bells', 'three bells', 'four bells', 'five bells', 'six bells', 'seven bells', 'eight bells'][S.bells] : 'midnight'}`, 'rgba(200,220,236,0.85)']]);
    kwHelmHud(phone, mono, fell); kwVHud(phone, mono, fell);
  },
  music: () => RAID.st.ph === 'watch' ? 'cpm06watch' : 'cpm06verity',
}));

// =====================================================================================================================
// III. Abandon Ship
// =====================================================================================================================
cpStage('kwwreck', kwStage({
  n: 'Abandon Ship', kwSail: false, kwHolds: ['kwlash', 'kwlaunch'], kwEvery: [14, 20], kwStove: true,
  q: (sid, k, a) => kwQ(sid, k, a),
  enter() {
    const n = kwN(), fl = {};
    for (const h of ZM.hum || [[FPS.me.id]]) fl[h[0]] = 1;
    kwState({ lk: 0, lkw: 2, sv: [6, -1], lamps: [0, 0, 0], ph: 'cut', lash: [0, 0], launch: 0, said: {}, fl, sunk: 0, lastT: 0, endT: 0, boarded: {} });
    RAID.st.v.next = 9;
    FPS.me.h = 0;
    if (ZM.net !== 'client') { cpObjective('Cut the punt free: both lashings'); cpWaypoint(KW_AT.punt[0] + 0.7, KW_AT.punt[1], 'The punt'); }
  },
  tick(dt) {
    const S = RAID.st, n = kwN();
    kwSay('a', 'jory', 'She’s going. Cut the punt free, both lashings!', 'cp_m06_48');
    if (S.ph === 'cut') {
      for (let i = 0; i < 2; i++) if (S.lash[i] < KWX.LASH) { S.lash[i] += kwTakeHold('kwlash', i); if (S.lash[i] >= KWX.LASH) kwLine(`The ${i ? 'after' : 'fore'} lashing is cut.`); }
      if (S.lash.every(x => x >= KWX.LASH)) { S.ph = 'launch'; cpObjective('Launch the punt over the side: all hands to her'); kwSay('l', 'jory', 'Over the side with her! All of us together!', 'cp_m06_49'); }
    } else if (S.ph === 'launch') {
      S.launch += kwTakeHold('kwlaunch', 0, dt * 3) * (1 + 0.15 * (n - 1));
      if (S.launch >= KWX.LAUNCH) { S.ph = 'board'; S.puntOn = true; cpObjective('Into the punt, all of you'); cpWaypoint(-kwHalfW(KW_PUNT.y) + 0.4, KW_PUNT.y, 'The punt'); kwSay('b', 'jory', 'She’s in the water. Get in, get in!', 'cp_m06_50'); }
    } else if (S.ph === 'board') {
      // everyone standing in the punt (and anyone down on the deck got up first)
      const crew = kwCrew(), all = (ZM.hum || [[FPS.me.id]]).map(h => h[0]), down = ZM.net ? [...FPS.remote.values()].some(r => r.down && !r.dead) || zmIsDown() : false;
      if (down) kwSay('dn', 'jory', 'Don’t leave anyone on that deck.', 'cp_m06_51');
      if (crew.length && crew.every(p => S.boarded[p.sid]) && !down) {
        S.ph = 'pull'; S.inPuntAll = true;
        for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash');
        S.v.on = 0; S.v.gone = 0;
        cpCine('m06_pull', () => { const T = RAID.st; T.ph = 'last'; T.sunk = 1; T.v.next = 2.5; cpObjective('The last flare'); cpWaypoint(null); if (!Object.values(T.fl).some(x => x > 0)) { const sid = (kwCrew()[0] || {}).sid || FPS.me.id; T.fl[sid] = 1; } });
      }
    } else if (S.ph === 'last') {
      S.lastT += dt;
      if (S.v.on && !S.said.in) kwSay('in', 'jory', 'It’s in the boat. In the bow. Oh God, it’s in the boat.', 'cp_m06_55');
      if (S.v.on && S.v.t > 7) kwSay('one', 'jory', 'One left. That’s the last flare there is. Put it in its face.', 'cp_m06_56');
      // (no flare left in the boat at all: Jory had one put by)
      if (!S.v.on && !kwAboard() && S.lastT > 4 && !S.endT) { S.endT = 1; kwSay('mine', 'jory', 'One left, and it’s mine.', 'cp_m06_61'); setTimeout(() => cpDone(), 2500); }
    }
    if (S.ph !== 'pull' && S.ph !== 'last') kwTrickle(dt, [5, 8], 4, 0, -7, 7.5);
    if (S.ph !== 'pull') kwVerityTick(dt, { quiet: S.ph === 'last' });
  },
  kwShoo() { const S = RAID.st; if (S.ph === 'last' && !S.endT) { S.endT = 1; setTimeout(() => { if (RAID.st === S) cpDone(); }, 2200); } },
  me(dt) {
    kwMe(dt);
    const S = RAID.st, m = FPS.me;
    if (S.boarded && S.boarded[m.id] && !S.inPunt && S.puntOn) S.inPunt = true;
  },
  kwConsider(c) {
    const S = RAID.st;
    if (S.ph === 'cut') for (const i of [0, 1]) if (S.lash[i] < KWX.LASH) { const [x, y] = kwW(KW_AT.punt[0] + 0.8, KW_AT.punt[1] + (i ? -0.8 : 0.8)); c({ k: 'kwlash', i }, x, y, 0, 1.3, false); }
    if (S.ph === 'launch') { const [x, y] = kwW(KW_AT.punt[0] + 0.85, KW_AT.punt[1]); c({ k: 'kwlaunch', i: 0 }, x, y, 0, 2.2, false); }
    if (S.ph === 'board' && !S.inPunt) { const [x, y] = kwW(-kwHalfW(KW_PUNT.y) + 0.5, KW_PUNT.y); c({ k: 'kwboard' }, x, y, 0, 2.6, false); }
  },
  kwPrompt(o) {
    const S = RAID.st;
    if (o.k === 'kwlash') return { text: `Hold to cut the ${o.i ? 'after' : 'fore'} lashing`, hold: true };
    if (o.k === 'kwlaunch') return { text: `Hold to heave her over the side (${Math.round(S.launch / KWX.LAUNCH * 100)}%)`, hold: true };
    if (o.k === 'kwboard') return { text: 'Over the rail, into the punt', free: true };
    return null;
  },
  kwUse(o) { if (o.k === 'kwboard') { raidAsk('board'); return true; } return o.k === 'kwlash' || o.k === 'kwlaunch'; },
  kwPack() { const S = RAID.st; return [['cut', 'launch', 'board', 'pull', 'last'].indexOf(S.ph), Math.round(S.lash[0] * 10), Math.round(S.lash[1] * 10), Math.round(S.launch * 10), S.sunk, S.inPuntAll ? 1 : 0]; },
  kwApply(a) { if (!Array.isArray(a)) return; const S = RAID.st; S.ph = ['cut', 'launch', 'board', 'pull', 'last'][a[0] | 0] || 'cut'; S.lash = [(a[1] | 0) / 10, (a[2] | 0) / 10]; S.launch = (a[3] | 0) / 10; S.sunk = a[4] | 0; S.inPuntAll = !!a[5]; },
  kwNight: () => RAID.st.sunk ? 0.55 : 1,
  kwList: () => RAID.st.sunk ? 0 : -0.09,
  kwSea: () => RAID.st.sunk ? 1.25 : 1.05,
  kwRocks: () => 0.3,
  kwSunk: () => !!RAID.st.sunk,
  kwNpcAt() {
    const S = RAID.st; if (KW.cineAt) return KW.cineAt;
    if (S.puntOn) return { jory: { x: KW_PUNT.x, y: KW_PUNT.y - 0.85, h: Math.PI, cr: 0.55, punt: true } };
    return { jory: { x: -0.4, y: -2.4, h: Math.PI * 1.5 } };
  },
  hud(phone, mono, fell) {
    const S = RAID.st, extra = [];
    if (S.ph === 'cut') extra.push([`The lashings: ${S.lash.filter(x => x >= KWX.LASH).length} of 2 cut`, 'rgba(200,230,215,0.9)']);
    if (S.ph === 'launch') extra.push([`The punt: ${Math.round(S.launch / KWX.LAUNCH * 100)}% over the side`, 'rgba(200,230,215,0.9)']);
    if (S.ph === 'board') { const crew = (ZM.hum || [[FPS.me.id]]).length, inn = Object.keys(S.boarded || {}).length; extra.push([`In the punt: ${inn} of ${crew}`, 'rgba(200,230,215,0.9)']); }
    kwHudLines(phone, mono, fell, extra); kwVHud(phone, mono, fell);
  },
  music: () => RAID.st.ph === 'last' ? 'cpm06verity' : 'cpm06wreck',
}));

// =====================================================================================================================
// the cinematics
// =====================================================================================================================
// (actors: the skipper and Jory are her own, posed where a shot says, KW.cineAt; Verity a shot's own, KW.cv)
const kwCineEnd = () => { KW.cineAt = null; KW.cv = null; };
const kwCv = (x, y, o) => { KW.cv = Object.assign({ on: 1, mo: 0, t: 6, x: FPSC.CX + x, y: FPSC.CY + y, gone: 0, gx: 0, gy: 0, z: 0 }, o || {}); };
cpCineDef('m06_intro', { music: 'cpm06nets', exit: kwCineEnd, shots: [
  cpTitleShot(CP_BY.m06),
  { d: 7, cam: [-26, -30, 9], to: [-14, -20, 5], look: [0, 0, 2], fade: [1.2, 0],
    f() { KW.cineAt = { skip: { x: -1.1, y: -6.2, h: 0.3 }, jory: { x: 0.9, y: 6.0, h: Math.PI } }; },
    lines: [[0.6, 'log', '28 February. The Kittiwake was out on the grounds past the Near Skerries, her nets down and the glass falling.', 'cp_m06_01']] },
  { d: 4.5, cam: [-1.6, -4.2, 1.7], to: [-1.3, -4.6, 1.75], look: [-1.1, -6.2, 1.6],
    lines: [[0.3, 'skip', 'Nets up before the dark, lads, and home by the Light.', 'cp_m06_02']] },
  { d: 5, cam: [0.6, 3.6, 1.8], to: [0.4, 4.0, 1.7], look: [0.9, 6.0, 1.5], lookTo: [-40, 6, 3],
    lines: [[0.2, 'jory', 'Glass is down again, Skipper. There’s haar coming.', 'cp_m06_03'], [3.2, 'skip', 'Then haul quicker, Jory Tregear.', 'cp_m06_04']] },
] });
// after the nets: something small on the hatch
cpCineDef('m06_sits', { music: 'cpm06verity', exit: kwCineEnd, shots: [
  { d: 4, card: { eye: 'Later', t: 'Full dark', sub: 'The nets in, the lamps lit, and the Light coming round to the west' } },
  { d: 4.5, cam: [2.2, 5.5, 2.4], to: [1.4, 3.2, 1.8], look: [0.45, -0.9, 0.7], fade: [0.8, 0],
    f() { KW.cineAt = { skip: { x: -0.8, y: -2.9, h: 0.6 }, jory: { x: 1.3, y: 1.1, h: Math.PI + 0.3 } }; kwCv(0.45, -0.9, { z: 0.47 }); },
    lines: [[0.8, 'jory', 'Skipper. There’s something on the hatch.', 'cp_m06_13']], sfx: [[1.6, 'creak', 0.5]] },
  { d: 4, cam: [0.5, 0.8, 0.85], to: [0.48, 0.5, 0.8], look: [0.45, -0.9, 0.85], enter() { try { loadVerityVoice(); sfxVerity(1, 0.9); } catch (e) {} },
    lines: [[0.6, 'verity', 'I can help.', 'cp_m06_14']] },
  { d: 5, cam: [-1.8, -1.2, 1.7], look: [-0.8, -2.9, 1.6], lookTo: [0.45, -0.9, 0.6],
    lines: [[0.2, 'skip', 'It’s a child’s toy, washed up in the nets.', 'cp_m06_15'], [2.6, 'jory', 'It’s smiling at us. It wasn’t, before.', 'cp_m06_16']] },
  { d: 6, cam: [1.9, 0.9, 1.7], to: [1.7, 0.6, 1.6], look: [-0.8, -2.9, 1.6],
    lines: [[0.2, 'jory', 'Old Pascoe says put a light in their face. A flare.', 'cp_m06_17'], [2.8, 'skip', 'There’s eight flares in that locker and they’re for ships in trouble. Leave it be.', 'cp_m06_18']] },
  { d: 3.5, cam: [0.5, 0.5, 0.75], to: [0.47, -0.1, 0.72], look: [0.45, -0.9, 0.8], f(t, k) { KW.cv.t = 6 + k * 12; }, lines: [[0.6, 'verity', 'Let me help you.', 'cp_m06_19']] },
] });
// four bells: a sea comes aboard
cpCineDef('m06_wave', { music: 'cpm06watch', exit: kwCineEnd, shots: [
  { d: 3.2, cam: [0, -4.5, 2.6], to: [0, -3.8, 2.4], look: [0, 9.5, 3.2], lookTo: [0, 9.5, 1.2], shake: 0.3, sfx: [[0.2, 'sea', 0.9], [1.6, 'splash', 1]],
    f(t) { KW.cineAt = { skip: { x: 0.5, y: 7.4, h: Math.PI, spd: 3 }, jory: { x: -0.7, y: -3.7, h: 0 } }; if (Math.random() < 0.6) for (let i = 0; i < 6; i++) FPS.parts.push({ x: FPSC.CX + (Math.random() - 0.5) * 4, y: FPSC.CY + 8 + Math.random() * 2, z: FPSC.GROUND + 1 + Math.random() * 2, vx: (Math.random() - 0.5) * 2, vy: -5 - Math.random() * 6, vz: 1 + Math.random() * 3, t: 0.9, c: '170,200,215' }); },
    lines: [[0.3, 'jory', 'Sea coming aboard! Hold on!', 'cp_m06_27']] },
  { d: 4.2, cam: [0.4, -3.6, 1.4], to: [0.8, -4.2, 1.2], look: [1.72, -5.3, 0.4], shake: 0.12,
    f() { for (let i = 0; i < 3; i++) FPS.parts.push({ x: FPSC.CX + 1.7 + (Math.random() - 0.5), y: FPSC.CY - 5.3 + (Math.random() - 0.5), z: FPSC.GROUND + 0.8, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), vz: 0.6, t: 0.6, c: '160,190,205' }); },
    lines: [[0.3, 'skip', 'The locker’s swamped. Every flare in it’s soaked.', 'cp_m06_28']] },
  { d: 5, cam: [-0.2, -3.0, 1.6], look: [-1.5, -4.7, 0.6],
    lines: [[0.2, 'jory', 'Dry them at the caboose. Two at a time, she’ll take them.', 'cp_m06_29'], [2.8, 'skip', 'Then dry them. And keep that thing off us.', 'cp_m06_30']] },
] });
// seven bells: he sits down in front of the skipper, and the skipper lets him
cpCineDef('m06_skipper', { music: 'cpm06verity', exit: kwCineEnd, shots: [
  { d: 4, cam: [1.4, -3.4, 1.7], to: [1.0, -4.2, 1.6], look: [0.15, -7.0, 1.0],
    f() { KW.cineAt = { skip: { x: 0.15, y: -7.0, h: 0, cr: 0.4 }, jory: { x: -0.9, y: -3.6, h: Math.PI * 0.85 } }; kwCv(0.15, -5.3, { t: 4 }); }, enter() { try { loadVerityVoice(); sfxVerity(0.97, 0.9); } catch (e) {} },
    lines: [[0.6, 'verity', 'You look so tired, Abel.', 'cp_m06_32']] },
  { d: 4.5, cam: [0.3, -5.8, 1.1], to: [0.25, -6.2, 1.15], look: [0.15, -7.0, 1.3],
    lines: [[0.3, 'skip', 'Leave it. It only wants to help.', 'cp_m06_33']] },
  { d: 3.6, cam: [-0.4, -2.6, 1.7], look: [-0.9, -3.6, 1.6], lookTo: [0.15, -5.3, 0.5],
    f() { KW.cineAt.jory = { x: -0.9, y: -3.6, h: Math.PI * 0.85, spd: 2 }; },
    lines: [[0.2, 'jory', 'Skipper, no! A flare, somebody!', 'cp_m06_34']] },
  { d: 4.6, cam: [1.2, -4.6, 1.5], to: [0.9, -5.0, 1.4], look: [0.15, -6.6, 1.1],
    f(t, k) { KW.cv.t = 12 + k * 7; },
    lines: [[0.2, 'skip', 'I said leave it be. Let it help.', 'cp_m06_35'], [3.2, 'verity', 'There now.', 'cp_m06_36']] },
] });
// she strikes
cpCineDef('m06_strike', { music: 'cpm06wreck', exit: kwCineEnd, shots: [
  { d: 3.6, cam: [0.2, 4.6, 2.2], to: [0.2, 6.6, 2.0], look: [0, 14, 0.6], shake: 0.2, sfx: [[0.3, 'sea', 0.8]],
    f() { KW.cineAt = { jory: { x: 0.4, y: 7.8, h: 0, spd: 2 } }; },
    lines: [[0.4, 'jory', 'Rocks! Rocks under her bow!', 'cp_m06_38']] },
  { d: 3, cam: [12, -6, 4], to: [11, -5, 3.8], look: [0, 2, 1], shake: 1, sfx: [[0.1, 'debris', 1], [0.2, 'creak', 1], [0.9, 'splash', 1]] },
  { d: 5.5, card: { eye: 'A little before eight bells', t: 'On the Near Skerries', sub: 'Her lamps out, her rudder gone, and the skipper with it' },
    lines: [[0.8, 'log', 'She struck on the Near Skerries a little before eight bells, and the sea came up over her deck.', 'cp_m06_39']] },
] });
// into the punt, and away: the Kittiwake goes down, and he's on her rail, watching
cpCineDef('m06_pull', { music: 'cpm06verity', exit: kwCineEnd, shots: [
  { d: 4.5, cam: [-8.5, -3.6, 1.2], to: [-10.5, -4.6, 1.4], look: [-4.55, -0.6, 0.6],
    f() { KW.cineAt = { jory: { x: KW_PUNT.x, y: KW_PUNT.y - 0.85, h: Math.PI, cr: 0.55, punt: true, spd: 1 } }; },
    lines: [[0.4, 'jory', 'Pull. Don’t look back at her.', 'cp_m06_52']] },
  { d: 5, cam: [-6.2, 0.4, 1.0], to: [-6.6, 0.6, 1.05], look: [-1.9, -0.4, 1.0],
    f() { kwCv(-2.05, -0.4, { t: 9, z: 0.86 }); }, enter() { try { loadVerityVoice(); sfxVerity(0.9, 0.5); } catch (e) {} },
    lines: [[0.8, 'verity', 'I can help.', 'cp_m06_53'], [2.8, 'jory', 'It’s on her rail. It’s watching us go.', 'cp_m06_54']] },
  { d: 4.5, cam: [-18, 6, 5], to: [-22, 8, 6], look: [0, 0, 1], sfx: [[0.6, 'creak', 0.9], [2.4, 'splash', 0.8]], f(t, k) { kwCv(-2.05, -0.4, { mo: 0.2 + k * 1.2, z: 0.86 - k * 1.5 }); } },
] });
cpCineDef('m06_outro', { music: 'cpsad', exit: kwCineEnd, shots: [
  { d: 5.5, cam: [-8, -9, 1.6], to: [-9.5, -12, 2.4], look: [-4.55, -0.6, 0.7], lookTo: [-420, 160, 30], fade: [0, 0],
    f() { KW.cineAt = { jory: { x: KW_PUNT.x, y: KW_PUNT.y - 0.85, h: Math.PI, cr: 0.55, punt: true, spd: 1 } }; },
    lines: [[0.4, 'jory', 'It rolled over the side and the sea took it. It never stopped smiling.', 'cp_m06_57']] },
  { d: 4.5, card: { eye: '1 March 1888, at dawn', t: 'The harbour steps', sub: 'One boat came in. The Kittiwake did not.' } },
  { d: 7, card: { eye: 'The keeper’s log', t: '28 February 1888', sub: 'A hand off the Kittiwake told me of a small yellow thing, round as a lamp glass and smiling, that sat on his deck and said it wanted to help.' },
    lines: [[0.6, 'log', 'A hand off the Kittiwake told me of a small yellow thing, round as a lamp glass and smiling, that sat on his deck and said it wanted to help.', 'cp_m06_58']] },
  { d: 7, card: { eye: 'The keeper’s log', t: '28 February 1888', sub: 'He put a flare in its face and it rolled over the side. The ships that let it sit there do not come in.' },
    lines: [[0.4, 'log', 'He put a flare in its face and it rolled over the side. The ships that let it sit there do not come in.', 'cp_m06_59']] },
  { d: 5, cam: [-4.6, -2.3, 1.15], to: [-4.6, -2.6, 1.2], look: [-4.55, -0.4, 1.0],
    lines: [[0.4, 'jory', 'It told me its name, before. Verity, it said. Verity.', 'cp_m06_60']] },
  { d: 4.5, card: { eye: 'The first account', t: 'Verity', sub: 'A small yellow thing that sits on decks, and says it wants to help' } },
] });
