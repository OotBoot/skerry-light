'use strict';
// Skerry Clash: the keeper across the water when you play alone (src/rl.js runs the match; this plays a side through
// rlPlay, the same door a person's tap goes through, so it can do nothing a player couldn't).
// It thinks a few times a second (less often, and more carelessly, on easy). Each think, in this order:
//   1. Something on its rock (or about to cross): defend. It weighs what's coming (hit points and the oil it cost),
//      answers birds with something that hits the air ('any' troops, the Swivel Gun), walkers with a sturdy troop or a
//      building set to pull them between its towers, and puts the answer a little behind the threat, on its own side.
//   2. A clump of enemies worth more than a spell costs: the spell on them (lobbed spells lead their walk; Brine Rain
//      and the Whirlpool are weighed by all they deal over time; Tide Pull and the Whirlpool count only walkers, as
//      only walkers are dragged; the haar on a crowd coming over to its side).
//   3. A tower low enough to finish with a spell: it does.
//   3b. Lamp Oil where its own fighters are hurt and striking, Fair Wind on a push that has reached the far bank.
//   3c. All quiet: an Oil Store tucked behind its Great Light, a Mortar Pit set back behind a Lamp Tower.
//   4a. What's left of a defence has crossed the race: a cheap shooter behind it, while the other side is low on oil.
//   4. Ahead on oil (or full): a push down one lane, the weaker of the two: a big walker at the back by its Great
//      Light, then support behind it as it goes (a Surgeon once the push is big enough to be worth mending); a
//      Shipwreck dropped at the foot of that lane's tower; a cheap troop to keep it company if it's already pushing.
//   5. Oil about to brim over: anything cheap at the back, so none is wasted.
// It never answers a threat with a card that doesn't fight (the Surgeon, the Oil Store, Lamp Oil, Fair Wind), sets a
// Tar Barrel just behind what it slows and a Mortar Pit well behind (it can't hit anything close).
// Easy waits for more oil, thinks slowly, sometimes picks at random and never leads its spells; hard thinks fast,
// counts the player's oil, and keeps some back to answer a push.
// Coordinates here are the bot's own: fy() turns them so its back edge is y 0 whichever side it plays.

const RLB = { lv: { easy: { think: 1.6, react: 1.2, push: 9.6, slop: 1.6, rnd: 0.3, lead: 0, keep: 0 }, normal: { think: 0.85, react: 0.6, push: 8.2, slop: 0.8, rnd: 0.08, lead: 0.6, keep: 2 }, hard: { think: 0.45, react: 0.25, push: 8.2, slop: 0.35, rnd: 0, lead: 1, keep: 2 } }, S: [] };
// the bot's decks: each has a big walker (or something that walks at towers), something for the air, a spell or two,
// often a building, and cheap cycle cards. Half the time one of these, half the time one dealt from all 64 by role
// (rlBotDeal): a win condition, two that hit flyers, a spell that strikes, two cheap ones, maybe a building, then
// anything to fill, kept to an average cost between 3 and 4.3.
const RL_BOT_DECKS = [
  ['mudlarks', 'deckhand', 'harpooner', 'gulls', 'keelback', 'flare', 'cannonshot', 'swivel'],
  ['shorecrabs', 'wreckers', 'coastguard', 'hermit', 'drowned', 'roguewave', 'battery', 'powdermonkey'],
  ['mudlarks', 'bosun', 'lamplighter', 'cormorant', 'crabking', 'flare', 'powderkeg', 'bellbuoy'],
  ['deckhand', 'fogwraith', 'lightkeeper', 'gannet', 'kelp', 'haar', 'cannonshot', 'wreckfire'],
  ['shorecrabs', 'harpooner', 'diver', 'mooncusser', 'drownedcrew', 'stormbolts', 'flare', 'gulls'],
  ['bilgerats', 'shipscat', 'fishwives', 'lobster', 'crabmother', 'surgeon', 'tidepull', 'martello'],
  ['wisp', 'puffins', 'netthrower', 'anchorman', 'seaeagle', 'fairwind', 'brinerain', 'tarpit'],
  ['mudlarks', 'petrel', 'grenadier', 'wreckerchief', 'smugglers', 'lampoil', 'cannonshot', 'mortar'],
  ['deckhand', 'siren', 'pressgang', 'krakenarm', 'stormcaller', 'whirlpool', 'flare', 'foghorn'],
  ['shorecrabs', 'rocketcrew', 'harpooner', 'shipwreck', 'burnlens', 'oilstore', 'flare', 'bilgerats'],
];
function rlBotDeal() {
  const all = RL_CARDS, pick = (L, out) => { L = L.filter(C => !out.includes(C.id)); return L.length ? L[(Math.random() * L.length) | 0].id : null; };
  const win = all.filter(C => C.type === 'troop' && (C.tg === 'build' && C.ab !== 'bomb' || C.hp * (C.cnt || 1) >= 2000));
  const air = all.filter(C => C.type !== 'spell' && C.tg === 'any' && C.dmg > 0 && C.ab !== 'burst');
  const hit = all.filter(C => C.type === 'spell' && C.dmg > 0 && C.ab !== 'summon'), cheap = all.filter(C => C.type === 'troop' && C.cost <= 2);
  for (let tries = 0; tries < 60; tries++) {
    const d = [];
    const add = L => { const id = pick(L, d); if (id) d.push(id); };
    add(win); add(air); add(air.filter(C => C.type === 'troop')); add(hit); add(cheap); add(cheap);
    if (Math.random() < 0.6) add(all.filter(C => C.type === 'building'));
    if (Math.random() < 0.5) add(all.filter(C => C.type === 'spell'));
    while (d.length < 8) add(all.filter(C => C.type === 'troop' && !win.includes(C) || C.type === 'spell' && Math.random() < 0.2));
    const avg = d.reduce((a, id) => a + RL_CARD[id].cost, 0) / 8, sp = d.filter(id => RL_CARD[id].type === 'spell').length, bl = d.filter(id => RL_CARD[id].type === 'building').length;
    if (avg >= 3 && avg <= 4.3 && sp <= 3 && bl <= 2 && new Set(d).size === 8) return d;
  }
  return RL_BOT_DECKS[0].slice();
}
function rlBotDeck(lvl) {
  if (Math.random() < 0.5) return rlBotDeal();
  const L = lvl === 'easy' ? RL_BOT_DECKS.filter((d, i) => i !== 4 && i !== 8) : RL_BOT_DECKS; return L[(Math.random() * L.length) | 0].slice();
}
function rlBotReset() { RLB.S = [0, 1].map(() => ({ t: 0.8 + Math.random() * 0.6, seen: new Map(), lane: -1, pushT: 0 })); }

// a card's worth as a fighter: how much it can take and give, per oil
function rlBotVal(C) { if (!C || C.type === 'spell') return 0; const n = C.cnt || 1, dps = C.hit ? C.dmg / C.hit * (C.ab === 'ramp' ? 3 : 1) : 0; return Math.sqrt(Math.max(1, (C.hp + (C.sh || 0)) * n) * Math.max(1, dps * n)); }
// what a striking spell deals in all (Brine Rain and the Whirlpool deal theirs over time)
function rlBotDmg(C) { return C.ab === 'dot' ? C.dmg * C.dur : C.ab === 'whirl' ? C.dmg * 2 * C.dur : C.dmg; }
// the cards that don't fight a threat themselves: the Surgeon, the Oil Store
const rlBotNoFight = C => C.ab === 'heal' || C.ab === 'oil' || C.ab === 'mend' || C.ab === 'haste';
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
  const theirsLow = !L.keep || RL.oil[1 - side] <= 5;
  // ---- 1. defend: walkers on my rock or on a causeway, birds over my half
  const threat = foes.filter(u => !u.bld && known(u) && fy(u.y) < RLC.R1 + 1.5);
  if (threat.length) {
    const lane = rlLaneOf(threat.reduce((a, u) => a + u.x, 0) / threat.length);
    const T = threat.filter(u => rlLaneOf(u.x) === lane), air = T.some(u => u.air), w = T.reduce((a, u) => a + u.hp, 0);
    const near = mine.filter(u => !u.bld && rlLaneOf(u.x) === lane && fy(u.y) < RLC.R1 + 2).reduce((a, u) => a + u.hp, 0);
    if (w > near * 0.7) {
      const cx = T.reduce((a, u) => a + u.x, 0) / T.length, cy = Math.min(...T.map(u => fy(u.y)));
      let opts = hand.filter(C => can(C) && C.type !== 'spell' && !rlBotNoFight(C) && (!air || C.tg === 'any' && C.dmg > 0));
      if (air && !opts.length) opts = hand.filter(C => can(C) && C.type === 'spell' && C.dmg > 0 && C.ab !== 'wave' && C.ab !== 'pull' && C.ab !== 'whirl');
      if (!air) opts = opts.filter(C => C.tg !== 'build' || T.length === 1 && T[0].bld);
      if (opts.length) {
        let C = Math.random() < L.rnd ? opts[(Math.random() * opts.length) | 0] : opts.sort((a, b) => rlBotVal(b) / b.cost - rlBotVal(a) / a.cost + (a.cost - b.cost) * (w > 1500 ? -0.4 : 0.15))[0];
        if (C.type === 'spell') { if (rlPlay(side, C.id, cx, fy(cy))) return; }
        else if (C.type === 'building') { if (play(C, jit(lane ? 11 : 7), C.minr ? Math.min(cy - C.minr - 1.5, 8) : C.ab === 'tar' ? Math.min(cy - 1.5, 11) : Math.min(cy - 3, 10.5))) return; }
        else {
          // ranged troops stand well back; walkers meet it a little behind where it is
          const back = C.rng >= 3 ? 4 : 1.6, x = jit(cx + (cx < 9 ? 0.8 : -0.8)), y = Math.max(1.5, Math.min(cy - back, RLC.R0 - 1));
          if (play(C, x, y)) return;
        }
      }
    }
  }
  // ---- 2. a spell on a clump (a Tide Pull or a Whirlpool only on walkers, which they drag; the haar on a crowd
  // coming at me)
  const spells = hand.filter(C => can(C) && C.type === 'spell' && C.dmg > 0);
  for (const C of spells.concat(hand.filter(C => can(C) && C.ab === 'haar'))) {
    let best = null, bv = 0;
    const D = C.ab === 'haar' ? 400 : rlBotDmg(C), walk = C.ab === 'pull' || C.ab === 'whirl';
    for (const u of foes) {
      if (!known(u) || (C.ab === 'haar' && (u.bld || fy(u.y) > RLC.R1 + 1))) continue;
      const lead = C.ab === 'lob' ? (C.fl || 1) * L.lead : 0, ux = u.x + (u.x - (u.px == null ? u.x : u.px)) / RLC.DT * lead, uy = u.y + (u.y - (u.py == null ? u.y : u.py)) / RLC.DT * lead;
      let v = 0; for (const e of foes) if (Math.hypot(e.x - ux, e.y - uy) <= C.r * 0.9) v += Math.min(e.hp, D) * (RL_CARD[e.c].cost || 1) / Math.max(1, e.max) * (walk && (e.air || e.bld) ? 0.4 : 1);
      if (v > bv) { bv = v; best = [ux, uy]; }
    }
    const worth = C.ab === 'bolts' ? C.cost * 0.75 : C.ab === 'haar' ? C.cost * 1.3 : C.cost * 0.9;
    if (best && bv >= worth && rlPlay(side, C.id, jit(best[0]) * 0.3 + best[0] * 0.7, best[1])) return;
  }
  // ---- 3. finish a tower
  for (const C of spells) {
    const t = RL.T.filter(t => t.side !== side && t.hp > 0 && t.hp <= rlBotDmg(C) * C.tw).sort((a, b) => a.hp - b.hp)[0];
    if (t && rlPlay(side, C.id, t.x, t.y)) return;
  }
  // ---- 3b. help my own: Lamp Oil where my fighters are hurt, Fair Wind on a push that has reached the far bank
  for (const C of hand.filter(C => can(C) && (C.ab === 'mend' || C.ab === 'haste'))) {
    let best = null, bv = 0;
    for (const u of mine) {
      if (u.bld) continue;
      let v = 0; for (const f of mine) if (!f.bld && Math.hypot(f.x - u.x, f.y - u.y) <= C.r * 0.85) v += C.ab === 'mend' ? (f.st === 'hit' ? Math.min(f.max - f.hp + C.hl * C.dur * 0.5, C.hl * C.dur) : 0) : (fy(f.y) > RLC.R1 - 2 ? f.hp : 0);
      if (v > bv) { bv = v; best = [u.x, u.y + (C.ab === 'haste' ? (side ? -1 : 1) : 0)]; }
    }
    if (best && bv >= (C.ab === 'mend' ? 900 : 1800) && rlPlay(side, C.id, best[0], best[1])) return;
  }
  // ---- 3c. a building that works from the back, while all is quiet: the Oil Store tucked behind the Great Light, a
  // Mortar Pit behind a Lamp Tower
  if (!threat.length) for (const C of hand.filter(C => can(C) && (C.ab === 'oil' && oil >= 8 || C.ab === 'lob' && C.type === 'building' && oil >= 7))) {
    if (mine.some(u => u.c === C.id)) continue;
    if (C.ab === 'oil' ? play(C, jit(Math.random() < 0.5 ? 6 : 12) * 0.3 + (Math.random() < 0.5 ? 6 : 12) * 0.7, 1.4) : play(C, jit(B.lane >= 0 ? RLC.LX[B.lane] + (B.lane ? -2 : 2) : 9), 8.5)) return;
  }
  // ---- 4a. a counter-push: what's left of my defence has crossed the race and is going at a tower; back it up with
  // something cheap that shoots (or any troop) behind it, while the enemy's oil is low
  if (!threat.length && oil >= 4 + L.keep * 0.5) {
    for (const lane of [0, 1]) {
      const over = mine.filter(u => !u.bld && rlLaneOf(u.x) === lane && fy(u.y) > RLC.R1 - 0.5);
      if (over.reduce((a, u) => a + u.hp, 0) < 900 || theirsLow === false) continue;
      const C = hand.filter(C => can(C) && C.type === 'troop' && C.cost <= oil - L.keep * 0.5 && C.tg !== 'build' && C.ab !== 'heal').sort((a, b) => (b.rng || 0) - (a.rng || 0) + (a.cost - b.cost) * 0.5)[0];
      if (C && play(C, jit(RLC.LX[lane]), RLC.R0 - 0.8)) { B.lane = lane; B.pushT = RL.clk; return; }
    }
  }
  // ---- 4. a push, when there's oil to spare
  const theirs = RL.oil[1 - side], ahead = L.keep ? oil - theirs >= 1.5 : false;
  // (in double oil sooner, and in sudden death sooner still: a tower must fall)
  const push = L.push - (RL.dbl ? 1.5 : 0) - (RL.ot ? 1.5 : 0);
  if (oil >= push || (ahead && oil >= push - 2) || oil >= 9.6) {
    if (B.lane < 0 || RL.clk - B.pushT > 25) {
      // the lane whose tower is weaker (or already down, the pocket open)
      const tw = l => { const t = RL.T.find(t => t.side !== side && t.k === 'lamp' && t.lane === l); return t ? t.hp : 0; };
      B.lane = tw(0) === tw(1) ? (Math.random() < 0.5 ? 0 : 1) : tw(0) < tw(1) ? 0 : 1; B.pushT = RL.clk;
    }
    const lx = RLC.LX[B.lane], pushing = mine.filter(u => !u.bld && rlLaneOf(u.x) === B.lane && fy(u.y) > 8);
    const troops = hand.filter(C => can(C) && C.type === 'troop' && C.cost <= oil - (L.keep && !pushing.length ? Math.max(0, L.keep - 2) : 0));
    // a Shipwreck dropped on its own bank by the causeway of the lane (it can go down only on its own rock), its crew
    // joining the push over the race
    const wreck = hand.find(C => can(C) && C.ab === 'summon');
    if (wreck && (pushing.length || oil >= 9) && play(wreck, jit(lx), 13.2)) return;
    if (troops.length) {
      if (!pushing.length && troops.some(C => C.ab !== 'heal')) {
        // a big walker at the back, on the side of the lane (never the Surgeon alone)
        const C = troops.filter(C => C.ab !== 'heal').sort((a, b) => b.hp * (b.cnt || 1) - a.hp * (a.cnt || 1))[0];
        if (play(C, jit(lx + (lx < 9 ? 1.6 : -1.6)), C.tg === 'build' || C.hp >= 1500 ? 1.5 : 12.5)) return;
      } else if (pushing.length) {
        // support behind the lead walker: a Surgeon if the push is big enough to mend, something that shoots, or a
        // cheap crowd
        const lead = pushing.sort((a, b) => fy(b.y) - fy(a.y))[0], big = pushing.reduce((a, u) => a + u.max, 0) >= 1800;
        const C = troops.filter(C => C.ab !== 'heal' || big).sort((a, b) => (b.ab === 'heal' ? 6 : b.rng || 0) - (a.ab === 'heal' ? 6 : a.rng || 0) + (a.cost - b.cost) * 0.3)[0];
        if (C && play(C, jit(lead.x), Math.min(RLC.R0 - 0.6, fy(lead.y) - 1.5))) return;
      }
    }
    // a building in the lane coming at me, if nothing else
    const bl = hand.find(C => can(C) && C.type === 'building' && C.ab !== 'oil' && C.ab !== 'tar' && oil >= 9);
    if (bl && play(bl, jit(9), 9)) return;
  }
  // ---- 5. never waste oil
  if (oil >= 9.7) {
    const C = hand.filter(C => can(C) && C.type === 'troop' && C.ab !== 'heal').sort((a, b) => a.cost - b.cost)[0];
    if (C) play(C, jit(Math.random() < 0.5 ? 6 : 12), 2);
  }
}
