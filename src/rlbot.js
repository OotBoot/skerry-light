'use strict';
// Rival Lights: the keeper across the water when you play alone (src/rl.js runs the match; this plays a side through
// rlPlay, the same door a person's tap goes through, so it can do nothing a player couldn't).
// It thinks a few times a second (less often, and more carelessly, on easy). Each think, in this order:
//   1. Something on its rock (or about to cross): defend. It weighs what's coming (hit points and the oil it cost),
//      answers birds with something that hits the air ('any' troops, the Swivel Gun), walkers with a sturdy troop or a
//      building set to pull them between its towers, and puts the answer a little behind the threat, on its own side.
//   2. A clump of enemies worth more than a spell costs: the spell on them (lobbed spells lead their walk).
//   3. A tower low enough to finish with a spell: it does.
//   4. Ahead on oil (or full): a push down one lane, the weaker of the two: a big walker at the back by its Great
//      Light, then support behind it as it goes; a cheap troop to keep it company if it's already pushing.
//   5. Oil about to brim over: anything cheap at the back, so none is wasted.
// Easy waits for more oil, thinks slowly, sometimes picks at random and never leads its spells; hard thinks fast,
// counts the player's oil, and keeps some back to answer a push.
// Coordinates here are the bot's own: fy() turns them so its back edge is y 0 whichever side it plays.

const RLB = { lv: { easy: { think: 1.6, react: 1.2, push: 9.6, slop: 1.6, rnd: 0.3, lead: 0, keep: 0 }, normal: { think: 0.85, react: 0.6, push: 8.2, slop: 0.8, rnd: 0.08, lead: 0.6, keep: 2 }, hard: { think: 0.45, react: 0.25, push: 7.2, slop: 0.35, rnd: 0, lead: 1, keep: 3 } }, S: [] };
// the bot's decks: each has a big walker, something for the air, a spell or two, a building and cheap cycle cards
const RL_BOT_DECKS = [
  ['mudlarks', 'deckhand', 'harpooner', 'gulls', 'keelback', 'flare', 'cannonshot', 'swivel'],
  ['shorecrabs', 'wreckers', 'coastguard', 'hermit', 'drowned', 'roguewave', 'battery', 'powdermonkey'],
  ['mudlarks', 'bosun', 'lamplighter', 'cormorant', 'crabking', 'flare', 'powderkeg', 'bellbuoy'],
  ['deckhand', 'fogwraith', 'lightkeeper', 'gannet', 'kelp', 'haar', 'cannonshot', 'wreckfire'],
  ['shorecrabs', 'harpooner', 'diver', 'mooncusser', 'drownedcrew', 'stormbolts', 'flare', 'gulls'],
];
function rlBotDeck(lvl) { const L = lvl === 'easy' ? RL_BOT_DECKS.slice(0, 4) : RL_BOT_DECKS; return L[(Math.random() * L.length) | 0].slice(); }
function rlBotReset() { RLB.S = [0, 1].map(() => ({ t: 0.8 + Math.random() * 0.6, seen: new Map(), lane: -1, pushT: 0 })); }

// a card's worth as a fighter: how much it can take and give, per oil
function rlBotVal(C) { if (!C || C.type === 'spell') return 0; const n = C.cnt || 1, dps = C.hit ? C.dmg / C.hit : 0; return Math.sqrt(Math.max(1, C.hp * n) * Math.max(1, dps * n)); }
function rlBotTick(dt, side) {
  side = side === 0 ? 0 : 1;
  if (!RLB.S[side]) rlBotReset();
  const B = RLB.S[side], L = RLB.lv[side === RL.me && RL.both ? 'hard' : RL.bot.lvl] || RLB.lv.normal;
  B.t -= dt; if (B.t > 0) return; B.t = L.think * (0.8 + Math.random() * 0.4);
  const fy = y => side ? RLC.H - y : y, oil = RL.oil[side], hand = RL.hand[side].map(c => RL_CARD[c]).filter(Boolean), can = C => C && C.cost <= oil + 1e-6;
  const foes = RL.U.filter(u => u.side !== side && u.hp > 0), mine = RL.U.filter(u => u.side === side && u.hp > 0);
  const jit = v => v + (Math.random() - 0.5) * 2 * L.slop;
  const play = (C, x, y) => { x = Math.max(0.6, Math.min(RLC.W - 0.6, x)); for (let k = 0; k < 6; k++) { const yy = fy(Math.max(0.6, Math.min(RLC.R0 - 0.3, y - k * 0.6))); if (rlPlay(side, C.id, x, yy)) return true; } return false; };
  // a reaction time: a threat must have been seen for a moment before it's answered
  const now = RL.clk; for (const u of foes) if (!B.seen.has(u.id)) B.seen.set(u.id, now); if (B.seen.size > 200) for (const [id] of B.seen) if (!RL.U.some(u => u.id === id)) B.seen.delete(id);
  const known = u => now - B.seen.get(u.id) >= L.react;
  // ---- 1. defend: walkers on my rock or on a causeway, birds over my half
  const threat = foes.filter(u => !u.bld && known(u) && fy(u.y) < RLC.R1 + 1.5);
  if (threat.length) {
    const lane = rlLaneOf(threat.reduce((a, u) => a + u.x, 0) / threat.length);
    const T = threat.filter(u => rlLaneOf(u.x) === lane), air = T.some(u => u.air), w = T.reduce((a, u) => a + u.hp, 0);
    const near = mine.filter(u => !u.bld && rlLaneOf(u.x) === lane && fy(u.y) < RLC.R1 + 2).reduce((a, u) => a + u.hp, 0);
    if (w > near * 0.7) {
      const cx = T.reduce((a, u) => a + u.x, 0) / T.length, cy = Math.min(...T.map(u => fy(u.y)));
      let opts = hand.filter(C => can(C) && C.type !== 'spell' && (!air || C.tg === 'any'));
      if (air && !opts.length) opts = hand.filter(C => can(C) && C.type === 'spell' && C.dmg > 0 && C.ab !== 'wave');
      if (!air) opts = opts.filter(C => C.tg !== 'build' || T.length === 1 && T[0].bld);
      if (opts.length) {
        let C = Math.random() < L.rnd ? opts[(Math.random() * opts.length) | 0] : opts.sort((a, b) => rlBotVal(b) / b.cost - rlBotVal(a) / a.cost + (a.cost - b.cost) * (w > 1500 ? -0.4 : 0.15))[0];
        if (C.type === 'spell') { if (rlPlay(side, C.id, cx, fy(cy))) return; }
        else if (C.type === 'building') { if (play(C, jit(lane ? 11 : 7), Math.min(cy - 3, 10.5))) return; }
        else {
          // ranged troops stand well back; walkers meet it a little behind where it is
          const back = C.rng >= 3 ? 4 : 1.6, x = jit(cx + (cx < 9 ? 0.8 : -0.8)), y = Math.max(1.5, Math.min(cy - back, RLC.R0 - 1));
          if (play(C, x, y)) return;
        }
      }
    }
  }
  // ---- 2. a spell on a clump
  const spells = hand.filter(C => can(C) && C.type === 'spell' && C.dmg > 0);
  for (const C of spells) {
    let best = null, bv = 0;
    for (const u of foes) {
      if (!known(u)) continue;
      const lead = C.ab === 'lob' ? (C.fl || 1) * L.lead : 0, ux = u.x + (u.x - (u.px == null ? u.x : u.px)) / RLC.DT * lead, uy = u.y + (u.y - (u.py == null ? u.y : u.py)) / RLC.DT * lead;
      let v = 0; for (const e of foes) if (Math.hypot(e.x - ux, e.y - uy) <= C.r * 0.9) v += Math.min(e.hp, C.dmg) * (RL_CARD[e.c].cost || 1) / Math.max(1, e.max);
      if (v > bv) { bv = v; best = [ux, uy]; }
    }
    const worth = C.ab === 'bolts' ? C.cost * 0.75 : C.cost * 0.9;
    if (best && bv >= worth && rlPlay(side, C.id, jit(best[0]) * 0.3 + best[0] * 0.7, best[1])) return;
  }
  // ---- 3. finish a tower
  for (const C of spells) {
    const t = RL.T.filter(t => t.side !== side && t.hp > 0 && t.hp <= C.dmg * C.tw).sort((a, b) => a.hp - b.hp)[0];
    if (t && rlPlay(side, C.id, t.x, t.y)) return;
  }
  // ---- 4. a push, when there's oil to spare
  const theirs = RL.oil[1 - side], ahead = L.keep ? oil - theirs >= 1.5 : false;
  const push = L.push - (RL.dbl ? 1.5 : 0);
  if (oil >= push || (ahead && oil >= push - 2) || oil >= 9.6) {
    if (B.lane < 0 || RL.clk - B.pushT > 25) {
      // the lane whose tower is weaker (or already down, the pocket open)
      const tw = l => { const t = RL.T.find(t => t.side !== side && t.k === 'lamp' && t.lane === l); return t ? t.hp : 0; };
      B.lane = tw(0) === tw(1) ? (Math.random() < 0.5 ? 0 : 1) : tw(0) < tw(1) ? 0 : 1; B.pushT = RL.clk;
    }
    const lx = RLC.LX[B.lane], pushing = mine.filter(u => !u.bld && rlLaneOf(u.x) === B.lane && fy(u.y) > 8);
    const troops = hand.filter(C => can(C) && C.type === 'troop' && C.cost <= oil - (L.keep && !pushing.length ? Math.max(0, L.keep - 2) : 0));
    if (troops.length) {
      if (!pushing.length) {
        // a big walker at the back, on the side of the lane
        const C = troops.sort((a, b) => b.hp * (b.cnt || 1) - a.hp * (a.cnt || 1))[0];
        if (play(C, jit(lx + (lx < 9 ? 1.6 : -1.6)), C.tg === 'build' || C.hp >= 1500 ? 1.5 : 12.5)) return;
      } else {
        // support behind the lead walker: something that shoots, or a cheap crowd
        const lead = pushing.sort((a, b) => fy(b.y) - fy(a.y))[0], C = troops.sort((a, b) => (b.rng || 0) - (a.rng || 0) + (a.cost - b.cost) * 0.3)[0];
        if (play(C, jit(lead.x), Math.min(RLC.R0 - 0.6, fy(lead.y) - 1.5))) return;
      }
    }
    // a building in the lane coming at me, if nothing else
    const bl = hand.find(C => can(C) && C.type === 'building' && oil >= 9);
    if (bl && play(bl, jit(9), 9)) return;
  }
  // ---- 5. never waste oil
  if (oil >= 9.7) {
    const C = hand.filter(C => can(C) && C.type === 'troop').sort((a, b) => a.cost - b.cost)[0];
    if (C) play(C, jit(Math.random() < 0.5 ? 6 : 12), 2);
  }
}
