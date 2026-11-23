'use strict';
// The Chronicle of the Light, mission 18: Slack Water, its three parts (the Race and everything on it is src/cpm18.js;
// the 3D and the cinematics are src/cpm18y.js).
//  I.   The Second Light (cp_m18lit): trim your two Lamp Towers at dusk (a can of oil from the Oil Store to each door,
//       and hold the wick to the flame); the far rock kindles a light of its own (m18_second); then the first slack
//       water, three minutes of his hands coming over the causeways for your lights. Hold. A tower of his felled now
//       stays felled.
//  II.  Slack Water (cp_m18slack): the next slack water, and you cross to him. Fell both his Lamp Towers before the
//       tide turns; powder kegs off the oil do it quickest. Ahead on crowns at the turn will do; level, one minute
//       more and the next tower settles it, and after that the weaker tower loses.
//  III. The Champion (cp_m18champ): he has called Plimsoll, and the tide is turning. Wear the champion down before he
//       has your lights, and put out the far Great Light before the causeways go under. At the turn, the crowns have it.
// Every part's tide, clock and phases are the host's (RAID.st, sent in c18Pack); each part only says what happens when.

// ---------- shared by the parts ----------
// (hosting) the tide towards to (0 high water, 1 slack) at rate a second; true once it's there
function c18TideTo(S, to, rate, dt) { const d = to - S.tide; if (Math.abs(d) <= rate * dt) { S.tide = to; return true; } S.tide += Math.sign(d) * rate * dt; return false; }
// (hosting) the next of his towers standing (for the waypoint), nearest the near rock's middle first
function c18NextTw(list) { for (const i of list) if (c18TwUp(i)) return i; return -1; }
function c18WpTw(i, label) { if (i < 0) { cpWaypoint(null); return; } const [x, y] = c18TwAt(i); cpWaypoint(x, y, label, c18Great(i) ? 6 : 4.5); }
// (hosting) his hands melt away as the tide turns: the Race takes whatever's on the causeways, and the rest go back
function c18Recall() { for (const z of ZM.z) if (!z.dead && z.bt !== 'c18tw' && z.bt !== 'c18plim') zmKill(z, false, '', 'flash'); const S = c18S(); if (S) { for (const b of S.bd) if (b.hp > 0) c18BirdHurt(b, 1e6); S.dp = []; } }
// what part II hands on to part III: his towers' strength, yours, and the crowns
function c18Carry() {
  const S = c18S(); if (!S) return null;
  const hp = {}, down = []; for (let i = 3; i < 6; i++) { const k = c18TwK(i); if (k <= 0) down.push(i); else hp[i] = k; }
  return { down, hp, ow: S.ow.map(o => o.dead ? 0 : o.hp / o.max), cu: S.cu, ct: S.ct };
}
const c18Music = S => {
  if (!S) return 'cpm18slack';
  switch (S.ph) { case 'trim': case 'high': return 'cpm18dusk'; case 'ebb': return RAID.stage === 0 ? 'cpm18second' : 'cpm18cross'; case 'slack': case 'cross': return S.last ? 'cpm18last' : 'cpm18slack'; case 'ot': return 'cpm18last'; case 'turn': case 'won': return 'cpm18turn'; case 'champ': case 'great': return 'cpm18champ'; }
  return 'cpm18slack';
};

// =====================================================================================================================
// I. The Second Light
// =====================================================================================================================
cpStage('m18lit', c18Stage({
  n: 'The Second Light', round: 4,
  c18enter(S) {
    Object.assign(S, { ph: 'trim', tide: 0, tl: 0, oil: 4, oilOn: false, rivalOn: false, rk: 0.85 });
    S.ow[0].lit = 0; S.ow[1].lit = 0;
    C18M.carry = null;
    if (ZM.net === 'client') return;
    c18Muster({});
    cpObjective('Trim the Lamp Towers: a can of oil from the Oil Store to each tower door');
    cpWaypoint(C18.OIL[0], C18.OIL[1], 'The Oil Store', 1.6);
    S.wT = 1.5;
  },
  c18tick(dt, S) {
    if (S.wT > 0 && (S.wT -= dt) <= 0) c18Say('trim', 'c18near', 'Dusk. Fetch a can from the Oil Store and trim the Lamp Towers before it is dark.', 'cp_m18_04');
    if (S.ph === 'trim') {
      // (the waypoint: the store, or a dark tower's door for whoever has a can)
      const cans = Object.values(S.cy).filter(v => v === 'can').length, dark = [0, 1].filter(i => !S.ow[i].lit);
      if (!dark.length) { S.ph = 'high'; S.hT = 2.2; cpWaypoint(null); cpObjective('Watch the far rock'); return; }
      if (cans) { const [x, y] = c18TwDoor(dark[0]); cpWaypoint(x, y, 'The tower door', 1.4); } else cpWaypoint(C18.OIL[0], C18.OIL[1], 'The Oil Store', 1.6);
      return;
    }
    if (S.ph === 'high') {
      if ((S.hT -= dt) > 0) return;
      S.ph = 'ebb'; S.tl = 1;
      cpCine('m18_second', () => { const S2 = c18S(); if (!S2) return; S2.rivalOn = true; S2.oilOn = true; S2.ro = 3; cpObjective('Hold your rock: keep your lights burning through slack water'); cpWaypoint(null); });
      return;
    }
    if (S.ph === 'ebb') {
      if (c18TideTo(S, 1, 1 / 7, dt)) { S.ph = 'slack'; S.T = C18.SLACK; c18Ban('Slack water', 'Three minutes. Keep your lights burning.', '#ffd88a'); c18Say('slack', 'c18near', 'The causeways are up. Here he comes. Keep them off the towers!', 'cp_m18_14'); }
      return;
    }
    if (S.ph === 'slack') {
      S.T -= dt;
      if (!S.last && S.T <= C18.LAST) { S.last = true; c18Ban('The last minute', 'The tide is on the turn. Oil comes twice as fast.', '#ffd88a'); c18Say('last1', 'c18near', 'The last minute. The oil comes quicker now, and so will his.', 'cp_m18_26'); }
      if (!S.dvr && S.T <= 48) { S.dvr = 1; S.next = 'diver'; S.ro = Math.max(S.ro, 7); }
      if (!S.sl && S.T <= C18.SLACK - 25) { S.sl = 1; c18Say('seal', 'c18seal', '(barks from the skerry in the Race, as if it had a view on the matter)', 'cp_m18_31'); }
      if (!S.tip && S.T <= C18.SLACK - 55) { S.tip = 1; c18Say('kegtip', 'c18near', 'Oil to spare? A keg off the store will bring one of his towers half down.', 'cp_m18_32'); }
      if (S.T <= 0) { S.ph = 'turn'; S.last = false; S.rivalOn = false; S.oilOn = false; S.uT = 4.5; c18Recall(); c18Ban('The tide has turned', 'The causeways are going under', '#8ab8ff'); c18Say('turn1', 'c18far', 'Well played, near rock. The next slack water is mine.', 'cp_m18_20'); }
      return;
    }
    if (S.ph === 'turn') {
      c18TideTo(S, 0, 1 / 4, dt);
      if ((S.uT -= dt) <= 0) { S.ph = 'won'; C18M.carry = { down: [3, 4, 5].filter(i => !c18TwUp(i)), hp: {}, cu: S.cu }; for (let i = 3; i < 6; i++) if (c18TwUp(i)) C18M.carry.hp[i] = c18TwK(i); cpDone(); }
    }
  },
  onCrown(i, who) { if (who === 'us' && i !== 5) c18Say('stI', 'c18near', 'One of his down, and on the first night. He will not forget that.', 'cp_m18_28'); if (who === 'us' && i === 5) { const S = c18S(); S.T = Math.min(S.T, 0.1); } },
  music: () => c18Music(c18S()),
}));
// ---------- the Lamp Towers going lit, in the world ----------
// (the stage's own 3D wants to know when one catches: the lit flag comes in the word; this is the flare of it)
cpOn('c18lit', i => { C18W.litAt = C18W.litAt || {}; C18W.litAt[i | 0] = g.t; });

// =====================================================================================================================
// II. Slack Water
// =====================================================================================================================
cpStage('m18slack', c18Stage({
  n: 'Slack Water', round: 6,
  c18enter(S) {
    const C = C18M.carry || {};
    Object.assign(S, { ph: 'ebb', tide: 0, tl: 1, oil: 5, oilOn: true, rivalOn: true, ro: 4, cu: C.cu || 0, ct: 0, gw: (C.down || []).length ? 1 : 0 });
    if (ZM.net === 'client') return;
    c18Muster({ down: C.down || [], hp: C.hp || {} });
    cpObjective('Wait for the causeways, then cross and fell his two Lamp Towers');
    S.wT = 1.2;
  },
  c18tick(dt, S) {
    if (S.ph === 'won') { if (S.goT > 0 && (S.goT -= dt) <= 0) { S.goT = 0; cpDone(); } return; }
    if (S.wT > 0 && (S.wT -= dt) <= 0) c18Say('ebb2', 'c18near', 'Kegs from the store, as the oil allows. Mind his towers: when a lamp reddens on you, step aside.', 'cp_m18_21');
    if (S.ph === 'ebb') {
      if (c18TideTo(S, 1, 1 / 6, dt)) {
        S.ph = 'cross'; S.T = C18.SLACK;
        c18Ban('Slack water', 'Fell his two Lamp Towers before the tide turns', '#ffd88a');
        c18Say('cross', 'c18near', 'Dry! Over you go. Both his Lamp Towers, before the tide turns.', 'cp_m18_22');
        cpObjective('Fell his two Lamp Towers before the tide turns');
      }
      return;
    }
    if (S.ph === 'cross' || S.ph === 'ot') {
      S.T -= dt;
      const i = c18NextTw([3, 4]); c18WpTw(i, i === 3 ? 'His west Lamp Tower' : 'His east Lamp Tower');
      if (S.ph === 'cross') {
        if (!S.last && S.T <= C18.LAST) { S.last = true; c18Ban('The last minute', 'Oil twice as fast, his as well as yours', '#ffd88a'); c18Say('last2', 'c18near', 'One minute! Spend the oil, all of it. Nothing is kept past the turn.', 'cp_m18_45'); }
        if (!S.mc && S.T <= 85) { S.mc = 1; S.next = 'moon'; S.ro = Math.max(S.ro, 7); }
        if (!S.aimT && S.T <= C18.SLACK - 8) { S.aimT = 1; c18Say('aim', 'c18near', 'See his lamp redden? That is him laying on you. Out of the line before it fires!', 'cp_m18_34'); }
        if (!S.hw && S.T <= C18.SLACK - 40 && S.ow.some(o => o.hp < o.max * 0.8)) { S.hw = 1; c18Say('hands', 'c18near', 'His lot are at our towers behind you. Someone stay back and mind them.', 'cp_m18_47'); }
        if (S.T <= 0) {
          if (S.cu > S.ct) { c18Say('oncr', 'c18near', 'The turn, and the crowns are ours. He will not take that quietly.', 'cp_m18_38'); return c18IIWon(S); }
          if (S.cu < S.ct) return cpFail('The tide turned with the crowns to the far rock');
          S.ph = 'ot'; S.T = C18.OT; S.last = false; S.ot = true;
          c18Ban('Level at the turn', 'One minute more. The next tower to fall settles it.', '#ffd88a');
          c18Say('ot', 'c18far', 'Level! One minute more, near rock, and the next tower settles it!', 'cp_m18_46');
        }
        return;
      }
      // (one minute more, and still level: the weaker tower loses it)
      if (S.T <= 0) {
        let mine = 1, his = 1; for (let j = 0; j < 3; j++) mine = Math.min(mine, c18TwK(j) || 1); for (let j = 3; j < 6; j++) his = Math.min(his, c18TwK(j) || 1);
        if (his < mine) { c18Say('oncr', 'c18near', 'The turn, and the crowns are ours. He will not take that quietly.', 'cp_m18_38'); return c18IIWon(S); }
        return cpFail('The tide turned, and the far rock’s towers stood the stronger');
      }
    }
  },
  onCrown(i, who) {
    const S = c18S(); if (!S || S.ph === 'won') return;
    if (S.ph === 'ot') { if (who === 'us') c18IIWon(S); else cpFail('The next tower to fall was yours'); return; }
    if (who === 'us' && !c18TwUp(3) && !c18TwUp(4)) c18IIWon(S);
    if (who === 'us' && i === 5) c18IIWon(S);
  },
  music: () => c18Music(c18S()),
}));
function c18IIWon(S) { if (S.ph === 'won') return; C18M.carry = c18Carry(); S.ph = 'won'; S.rivalOn = false; S.oilOn = false; S.ot = false; S.last = false; c18Recall(); cpWaypoint(null); S.goT = 1.6; }

// =====================================================================================================================
// III. The Champion
// =====================================================================================================================
// (Plimsoll: up out of the surf at RX, RY, beside the east causeway's far end, then onto it at PX, PY)
var C18C = { RX: C18.CW + 4.6, RY: 15, PX: C18.CW, PY: 15 };
cpStage('m18champ', c18Stage({
  n: 'The Champion', round: 7,
  c18enter(S) {
    const C = C18M.carry || { down: [3, 4], hp: {}, ow: [1, 1, 1], cu: 2, ct: 0 };
    Object.assign(S, { ph: 'champ', tide: 1, tl: 1, gw: 1, oil: 6, oilOn: true, rivalOn: true, ro: 2, rk: 0.6, last: true, T: C18.TURN, cu: C.cu || 0, ct: C.ct || 0 });
    (C.ow || []).forEach((k, i) => { const o = S.ow[i]; if (!o) return; if (k <= 0) { o.dead = 1; o.hp = 0; } else o.hp = Math.max(o.max * 0.5, o.max * k); });
    if (ZM.net === 'client') return;
    c18Muster({ down: C.down || [3, 4], hp: C.hp || {} });
    const z = c18PlimSpawn(C18C.PX, C18C.PY); z.rr = 0.1; z.jz = 0;
    cpObjective('Wear Plimsoll down, and put out the far Great Light before the tide turns');
    c18WpTw(5, 'The far Great Light');
    S.wT = 1.0;
  },
  c18tick(dt, S) {
    if (S.wT > 0 && (S.wT -= dt) <= 0) c18Say('ch1', 'c18near', 'The tide is turning under us. Two minutes and a half, and the causeways go.', 'cp_m18_52');
    if (S.wonT > 0 && (S.wonT -= dt) <= 0) { S.wonT = 0; cpDone(); return; }
    if (S.ph !== 'champ' && S.ph !== 'great') { if (S.ph === 'turn') c18TideTo(S, 0, 1 / 5, dt); return; }
    S.T -= dt;
    // (the tide creeping back over the causeways' ends in the last half-minute)
    S.tide = S.T < 30 ? clamp(0.91 + S.T / 30 * 0.09, 0.91, 1) : 1;
    if (!S.q1 && S.T <= C18.TURN - 30 && S.ph === 'champ') { S.q1 = 1; c18Say('ch2', 'c18far', 'He chose me, near rock! He walks for the honest light!', 'cp_m18_53'); }
    if (!S.q2 && S.T <= 60) { S.q2 = 1; c18Say('ch3', 'c18near', 'One minute left in the causeways. His Great Light, now, or never.', 'cp_m18_56'); }
    if (!S.q3 && S.T <= 20) { S.q3 = 1; c18Say('ch4', 'c18near', 'The water is over the ends. Get it done or get back!', 'cp_m18_57'); }
    const P = c18PlimZ(); if (P && !P.dead && P.hp < P.max * 0.5 && !S.q4) { S.q4 = 1; c18Say('ch5', 'c18near', 'He is slowing. Keep at him. He has never been beaten on the causeway.', 'cp_m18_58'); }
    if (S.T <= 0) {
      S.ph = 'turn'; S.rivalOn = false; S.oilOn = false; c18Recall();
      if (S.cu > S.ct) { c18Ban('The tide has turned', 'The crowns are yours, and the night', '#8ab8ff'); c18Say('ch6', 'c18far', 'Nooo… The crowns are yours. Well played.', 'cp_m18_59'); S.wonT = 3; }
      else cpFail('The tide turned, and the crowns were not yours');
    }
  },
  c18plimDown(z) {
    const S = c18S(); if (!S) return;
    S.plimOut = 1;
    cpCine('m18_yield', () => { const S2 = c18S(); if (!S2) return; S2.ph = 'great'; cpObjective('Put out the far Great Light before the tide turns'); c18WpTw(5, 'The far Great Light'); });
  },
  onCrown(i, who) { const S = c18S(); if (who === 'us' && i === 5 && S.ph !== 'turn') { S.ph = 'turn'; S.rivalOn = false; S.oilOn = false; c18Recall(); S.wonT = 2.4; } },
  c18hud(phone, mono, fell) {
    const S = c18S(); if (!S || S.ph !== 'champ' || c18Cine()) return;
    // (the champion's walk: which way he's heading, a word under his bar)
    void phone; void mono; void fell;
  },
  music: () => c18Music(c18S()),
}));
