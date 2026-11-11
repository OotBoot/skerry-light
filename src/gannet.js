// The Gannet's Wake: the second raid (map key 'gannet'; RAIDS.gannet in src/raid.js), on the same engine as Maren's
// End: one to four of you, the three callings (src/rclass.js), down and got up, stamina, the MVP screen at the end
// (src/raidmvp.js) and a pirate token from its last boss. Its own column on the scoreboard (game 'gannet').
//
// A year to the night after the Gannet broke up on the skerries, her bell is heard again off Skerry Light. The keeper's
// cutter goes out to find what's ringing it. Its parts (each a stage in its own file, added with raidAdd):
//  I.   The Skerries (gwsail, src/gwsail.js): out through the rocks in the keeper's cutter, the deck your map and the sea
//       moving past: one of you at the helm, the rocks only in the Light's beam, Maren on the water behind and the bell
//       to drive her back, Plimsoll walking ahead, flares, holes to patch, and the drowned over the rail. At the end
//       the Gannet comes up out of the sea alongside.
//  II.  Below Decks (gwhold, src/gwhold.js): inside the risen Gannet, Knock loose below (he moves only while none of
//       you can see him), and the three keys to the captain's cabin.
//  III. The Quarterdeck (gwcapt, src/gwcapt.js): Captain Absalom Crane on his own deck, hurt only in light (the beam
//       crossing the deck, or a flare), the ship's bell to stagger him; at half strength she founders.
// What's here: what the parts share. The Light's beam (one clock for every part, from the raid's own: RAID.ct, the
// host's time on every side), and a quick way to a part for trying it out.

const GW = { PERIOD: 6.5, HALF: 0.15 };
// the beam's bearing now (radians, 0 north, clockwise), on everyone's side alike
const gwBeam = () => ((RAID.ct || RAID.t || 0) / GW.PERIOD % 1) * Math.PI * 2;
// is bearing a (radians) inside the beam now? (w: how wide either side, if not the Light's own)
const gwInBeam = (a, w) => Math.abs(angDiff(a, gwBeam())) < (w || GW.HALF);
// (for trying a part out: alone, straight to it)  gwGo('gwhold')
function gwGo(key) { if (!RAID.on || RAID.map !== 'gannet' || ZM.net === 'client') return false; const i = RAID_ORDER.indexOf(key); if (i < 0) return false; raidUseStage(i); return true; }
