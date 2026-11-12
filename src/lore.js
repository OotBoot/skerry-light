'use strict';
// The Skerry Compendium: the lore book on the main menu, written like a wiki (src/loreui.js draws it).
// It ties every game into one history: the voyages (Skerry Light), Wreckers' Night, Drowned Reach, Keeper's Last Light,
// the two raids (Maren's End, The Gannet's Wake), Fog Run and Freebooters' Sea [fbsea]. Where the game itself says nothing, the gaps are filled
// with lore that fits; the keeper's log (SK.LOG in config.js) is the spine and is never contradicted.
// An article: { id, t: title, cat: [categories], img: a picture key (see loreImg in loreui.js), gal: visitors' picture keys for a gallery, box: [[label, value], ...]
//   (the infobox), sum: the opening paragraph, secs: [{ h: heading, p: [paragraphs] }], also: [ids for See also] }.
// In any text, [[id]] links to an article by its title and [[id|words]] links with other words.
// Keep secrets out entirely: no Easter egg, nothing hidden in any map, no secret bosses or hidden buttons, not even a hint.
var LORE_CATS = [
  { k: 'Chronicles', d: 'The eight great tales of the Skerries, each told by one of the games.' },
  { k: 'Characters', d: 'People, and things that were once people.' },
  { k: 'Creatures', d: 'What walks, swims, flies or crawls in the waters round the Light.' },
  { k: 'Places', d: 'Rocks, shores, buildings and the far seas.' },
  { k: 'Factions', d: 'Crews, orders, guilds and nations.' },
  { k: 'Events', d: 'Wrecks, sieges, wars and the nights people still talk about.' },
  { k: 'Ships', d: 'Vessels lost, risen, and still sailing.' },
  { k: 'Objects', d: 'Lamps, bells, blades and other things worth carrying.' },
];
var LORE = [
// ---------------- the front matter ----------------
{ id: 'timeline', t: 'Timeline of the Skerries', cat: ['Events'], sum: "A single chronology of everything this compendium records, from the first fire on [[lanternrock]] to [[reachwars]]. Dates from [[log|the keeper's log]] are exact. Anything earlier comes from parish records, harbour books and the stories of the boats, and is marked with a c. where nobody can agree.", secs: [
  { h: 'Before the Light', p: [
    "<b>c. 1200s.</b> A fire is kept on [[lanternrock]], the outermost rock of the Skerries, by a family of fire-keepers. It is the first light on this coast. Their last keeper is remembered only as [[fogkeeper|the Fog-Keeper]].",
    "<b>c. 1597.</b> A Spanish squadron, blown north after the Armada years, winters on the headland across the water and does not leave. Its garrison builds the sea fort later called [[seafort|Maren's End]], with its [[apothecaries|three apothecaries]] and the Chapel of Our Lady of the Sea.",
    "<b>1600s to 1700s.</b> The wrecking years. [[mooncussers]] hang false lights on the rocks to draw ships in. The fort's governors hang the ones they catch in chains on the sea wall. [[wreckers]] carry on the trade more quietly.",
    "<b>c. 1790.</b> [[wrackhaven]] is a busy fishing town, with its town hall on the Square and the inn called the Drowned Man.",
  ]},
  { h: 'The Light', p: [
    "<b>1841.</b> [[skerrylight]] is built on its rock and lit. Its great lens is set by [[lampwright|the Lampwright]]. The fire on Lantern Rock is put out for good, and its keeper with it.",
    "<b>c. 1879.</b> The keeper Holm comes to the Light, with his wife [[maren]].",
    "<b>14 December 1887.</b> [[wreck1887|The Night of the Gannet]]. The lamp fails in the second hour. Maren rows out with a hand lantern to warn the brig [[gannet|Gannet]]. The brig breaks up on the skerries with all hands. The skiff comes back empty, [[marenslantern|her lantern]] still lit.",
    "<b>15 December 1887.</b> The sea freezes from the harbour steps to the horizon. It is the first of [[sixseas|the six seas]].",
  ]},
  { h: 'The strange year, 1888', p: [
    "<b>2 January.</b> [[plimsoll]] walks up out of the surf in the cabin boy's blue shoes.",
    "<b>9 January.</b> The schooner [[wren|Wren]] comes in through the skerries with Plimsoll walking ahead. The voyages of 1888 begin: see [[ch_voyages]].",
    "<b>20 January.</b> Fishermen first see Maren standing on the water.",
    "<b>11 February.</b> The Gannet's figurehead, [[knock]], is gone from the wreck.",
    "<b>28 February.</b> The first account of [[verity]], from a hand off the Kittiwake.",
    "<b>14 March.</b> [[visitors|The visitors]] begin to turn up on the water.",
    "<b>Spring.</b> The [[salvors|Northern Salvage Company]] sends divers down to the Gannet. They do not come up. Their helmets are seen again later, on [[diver|the Divers]].",
    "<b>19 April to 21 June.</b> Ships come back from [[nether|the Nether]], [[winedark|the Wine-Dark Sea]], [[between|the Places In Between]] and [[backrooms|the yellow rooms]].",
    "<b>12 August.</b> [[ironship|The iron ship]] comes into the harbour from a year the keeper will not write down.",
    "<b>30 October.</b> [[crates|The drifting crates]] appear, each with its own little lamp.",
    "<b>All year.</b> On the nights the lamp is dark, [[wreckers]] go ashore on the islands and fight over what the sea has left: see [[ch_wreckers]].",
    "<b>14 December 1888.</b> A year to the night. The Gannet's bell is heard off the Light. The keeper's cutter goes out, and the Gannet rises: see [[ch_gannetswake]].",
  ]},
  { h: 'After the Gannet', p: [
    "<b>Winter 1888 to 1889.</b> The drowned come up out of the sea for [[station|the keeper's station]] itself, night after night: see [[ch_lastlight]].",
    "<b>Spring and summer 1889.</b> The wrecks the Gannet brought up with her drift out past the Near Skerries onto [[widewater|the Wide Water]], and freebooters follow them from [[saltcote]]: see [[ch_fbsea]].",   // [fbsea]
        "<b>Autumn 1889.</b> [[haar|The haar]] closes in and the lights of the outer rocks go out one by one. The cutter goes out to light them again: see [[ch_fogrun]].",
    "<b>The Dry Night, 1890.</b> The sea round the Light drains away down [[swallow|the Swallow]]. Raiders go down after it with Maren's lantern: see [[ch_marensend]].",
    "<b>Winter 1891.</b> The sea comes up Fish Street in [[wrackhaven]] one night and does not go back. The town is left to the drowned, and the defenders of the station follow them there.",
  ]},
  { h: 'The years after', p: [
    "<b>Undated.</b> The sea comes back, and with it the people of every sea and every year that ever sailed through the skerries. They settle the islands and go to war for them: see [[ch_reach]].",
    "<b>Still.</b> The tales do not keep to their order. On any night, on any of the six seas, the Light is turning and [[maren]] is still rowing out to the Gannet. As the last page of the log says, she will take any ship that lets her come aboard.",
  ]},
], also: ['log', 'skerrylight', 'maren'] },

// ---------------- the chronicles (one for each game) ----------------
{ id: 'ch_voyages', t: 'The Voyages of 1888', cat: ['Chronicles', 'Events'], img: 'maren', box: [['Told in', 'Skerry Light'], ['When', '1888, and every night since'], ['Where', 'The Skerries and the [[sixseas|six seas]]'], ['Who', 'The ships that sail in under the Light'], ['Foes', '[[maren]], [[drowned]], [[knock]], [[verity]], [[visitors|the visitors]]'], ['Guide', '[[plimsoll]]']], sum: "The oldest of the tales, and the one the others grow out of. In the year after the wreck of [[gannet]], every ship that comes in to the harbour under [[skerrylight]] has to find its way through the skerries at night, by the beam alone, with [[maren]] coming a little nearer every time the lamp turns.", secs: [
  { h: 'The run in', p: [
    "The water under the cliffs is full of rocks, old wrecks and drifting timber, and they only show while the beam is on them. As the beam moves on they fade, and three seconds later they are gone. Masters learnt to read the water in the half-second the light gave them, and to remember the rest.",
    "The ships came in alone or together. A crew of up to eight sailing close kept one another's planks patched and kept Maren back, and the first into harbour was given a share of the others' crates. Each harbour reached turned a page of [[log|the keeper's log]], which is how the keeper came to write it all down.",
  ]},
  { h: 'What waited for them', p: [
    "Maren was always out there. [[plimsoll]] walked ahead through the deep water, and any ship that kept up with him was covered. The bell drove her back. Each night also brought three others from among [[drowned]], [[knock]], [[verity]] and [[visitors|the visitors]], never the same three two nights running.",
    "The sea did not stay one sea. The voyages went round [[sixseas|six seas]] in turn, and about one night in twenty a ship found itself somewhere stranger still: [[nether|the Nether]], [[winedark|the Wine-Dark Sea]], [[between|the Places In Between]], [[backrooms|the yellow rooms]] or [[opensky|the open sky]].",
  ]},
  { h: 'The ships', p: [
    "Most came in on a brig. Others came on cutters, barques, and once, impossibly, on [[ironship|an iron ship with no sails]]. See [[boats]].",
  ]},
], also: ['wreck1887', 'harbour', 'bell'] },
{ id: 'ch_wreckers', t: "Wreckers' Night", cat: ['Chronicles', 'Events'], box: [['Told in', "Wreckers' Night"], ['When', 'Any night the lamp is dark, 1887 onward'], ['Where', 'The islands of the Skerries'], ['Who', '[[wreckers]]'], ['Arms', 'Pepperbox, blunderbuss, longarm, harpoon gun, avtomat, cutlass'], ['Also there', '[[verity]], [[drowned]]']], sum: "On the nights the lamp is dark, the wreckers of the Skerries go ashore on the islands with a lantern each and settle their accounts. Wreckers' Night is the tale of those nights: no crews, no ships, just whoever is on the island and whatever the sea has left on it.", secs: [
  { h: 'Why they fight', p: [
    "Every wreck leaves something on the shore, and the wreckers have never agreed on whose it is. The old custom, older than [[skerrylight]], was that it belonged to whoever was still standing at dawn. After the wreck of [[gannet]] the shores filled with salvage as never before, and the custom became a war that is fought again every dark night.",
    "Light is everything on those nights. The lighthouse beam sweeps the island and shows anyone it crosses. A lantern lets you see, and lets everyone see you. A flare lights a circle for all, and a rung bell shows you to everyone on the island, and them to you.",
  ]},
  { h: 'The islands', p: [
    "The fighting moves round three places in turn: [[bondedquay|the Bonded Quay]], [[pilchardrow|Pilchard Row]] and [[flensingyard|the Flensing Yard]]. Since the sea stopped being one sea, the same island may wake on any of the [[sixseas|six seas]] from one round to the next. Older grounds, like [[chapelislet|Chapel Islet]] and [[signalhead|Signal Head]], are hardly fought over now.",
  ]},
  { h: 'Company', p: [
    "[[drowned]] wade ashore now and then and take no sides. [[verity]] comes ashore too, and sits down in front of whoever has a flare left. Wreckers say there is always at least one among them in an admiral's coat, and nobody knows whose.",
  ]},
], also: ['wreckers', 'mooncussers', 'flare'] },
{ id: 'ch_reach', t: 'Drowned Reach', cat: ['Chronicles', 'Events'], box: [['Told in', 'Drowned Reach'], ['When', 'The years after the sea came back'], ['Where', 'The archipelago round the Light'], ['Who', 'Nations from every sea and year'], ['Prize', 'The Light, and with it the name of Keeper']], sum: "The last tale, and the longest. When the sea came back up [[swallow|the Swallow]], it brought with it the people of every sea and every year that had ever sailed through the skerries. They landed on the islands round the Light, and the war for those islands has never quite ended. The charts call the place the Drowned Reach.", secs: [
  { h: 'The nations', p: [
    "Nobody agrees how many came. Folk from the ice and the ember isles, from the coral lagoon and the barrow shore, from [[winedark|the Wine-Dark Sea]] and from years that had not happened yet. That is why a nation of the Reach can count its people in millions on a few islands: they were never all from the same century. Each landing grew into a nation, and each nation into a temper of its own.",
    "Some keep pacts. Pacts last a short while, and every nation remembers who broke one.",
  ]},
  { h: 'The Keeper', p: [
    "[[skerrylight|The Light]] still stands on its rock in the middle of the Reach. Whoever holds the rock is called the Keeper, takes the gold of the harbours and has safe shores. At night its beam sweeps the whole Reach, and in its light everything is seen as it really is.",
  ]},
  { h: 'The drowned and the tide', p: [
    "[[maren]] is not in the Reach. [[drowned]] are. At night they rise on any shore the light does not reach and take it into the dark, and by day they sink back and leave it empty. Beacons and flares keep them off, and a rung [[bell|bell]] lets a people hold for a while.",
    "The tide turns often there. At low water the shoals dry into land bridges between the islands, and at high water they drown with anyone on them.",
  ]},
], also: ['reachwars', 'skerrylight', 'bell'] },
{ id: 'ch_lastlight', t: "Keeper's Last Light", cat: ['Chronicles', 'Events'], box: [['Told in', "Keeper's Last Light"], ['When', 'Winter 1888 to 1889, and after'], ['Where', '[[station|The keeper\'s station]], and later [[wrackhaven]]'], ['Who', 'Whoever lands on the jetty that night'], ['Foes', '[[drowned]], [[diver|the Diver]], [[mooncusser|the Mooncusser]], [[keelback|the Keelback]], [[crabs]]']], sum: "After the Gannet rose, the drowned stopped waiting for ships. On the worst nights of that winter they came up out of the sea for the keeper's station itself, round after round, and anyone who could hold a gun landed on the jetty to keep them out of it.", secs: [
  { h: 'The siege', p: [
    "They came up the jetty's ladders and the shingle, tore the boards off the windows and climbed in, more every round and harder to put down. The defenders paid for what they used: guns chalked on the station walls, the doors between its rooms, and a go at [[wreckchest|the wreck chest]] wherever it had turned up that night.",
    "Bigger things came with them: from the tenth round the [[diver|Diver]], the [[mooncusser|Mooncusser]] and the [[keelback|Keelback]], and on some rounds a tide of [[crabs|crabs]] instead of men.",
  ]},
  { h: 'The Lampwright\'s Bench', p: [
    "Up in the station stands [[lampwright|the Lampwright's Bench]], where a gun can be worked over and come back stronger. Past the twentieth round, the keepers say, nothing else keeps up.",
  ]},
  { h: 'Wrackhaven', p: [
    "When the sea took [[wrackhaven]] in the winter of 1891, the drowned moved in, and the fight followed them there. From its quay you can see the Light across the harbour, still lit.",
  ]},
], also: ['station', 'fresnellamp', 'wrackhaven'] },
{ id: 'ch_gannetswake', t: "The Gannet's Wake", cat: ['Chronicles', 'Events'], img: 'knock', box: [['Told in', "The Gannet's Wake (raid)"], ['When', '14 December 1888'], ['Where', 'Off the Skerries, then aboard the risen [[gannet|Gannet]]'], ['Who', 'The crew of the [[cutter|keeper\'s cutter]]'], ['Foes', '[[knock]], [[bosun|the Bosun]], [[crane|Captain Crane]]'], ['Parts', 'I The Skerries · II Below Decks · III The Quarterdeck']], sum: "A year to the night after the wreck, the Gannet's bell was heard again off Skerry Light. The keeper sent his cutter out, and somewhere past the rocks the brig came back up, with her drowned crew, her walking figurehead and her captain, who had not let go of her.", secs: [
  { h: 'Part I: The Skerries', p: [
    "The cutter went out from the foot of the Light with one hand at the wheel and the rest on deck, the rocks showing only in the beam. [[maren]] stood on the water behind and came nearer at every turn of the lamp, [[drowned]] climbed over the rails, and [[plimsoll]] walked ahead. About a mile out a ring of the Gannet's old spars marked the place, and the Gannet rose out of the sea alongside, her bell ringing.",
  ]},
  { h: 'Part II: Below Decks', p: [
    "Inside her, [[knock]] was loose, and moved only while nobody was looking. The captain's cabin needed three keys: the Bosun's, one from under the black water of the cable tier, and one that hung round Knock's own neck.",
  ]},
  { h: 'Part III: The Quarterdeck', p: [
    "On the open deck, under the sweeping beam, [[crane|Captain Absalom Crane]] could only be hurt in the light. At half his strength the Gannet began to founder, and he hoisted a black sail to cut off the Light. The crew fought him by flares alone until he fell.",
  ]},
  { h: 'What it settled', p: [
    "The Gannet went down again that night, and has not risen since. It did not lay Maren to rest, and the drowned did not stop coming. Many say it made them angrier: within weeks they were coming for [[station|the station]] itself.",
  ]},
], also: ['gannet', 'crane', 'callings'] },
{ id: 'ch_fogrun', t: 'Fog Run', cat: ['Chronicles', 'Events'], box: [['Told in', 'Fog Run'], ['When', 'The fogbound nights of 1889'], ['Where', 'The outer rocks, through [[haar|the haar]]'], ['Who', 'The crew of the [[cutter|keeper\'s cutter]]'], ['Foe', '[[fogkeeper|The Fog-Keeper]]'], ['Ends at', '[[lanternrock]]']], sum: "In the autumn of 1889 the Light could not reach past the skerries. Something out in the haar was putting out the lights of the outer rocks one by one: the beacon on Signal Head, the chapel candles, the lamps on the old quays. The keeper sent the cutter out to light them again and find out what was doing it.", secs: [
  { h: 'The run', p: [
    "The crew charted their own way from island to island across three reaches of sea: the Near Skerries, the Grey Reach and the Haar itself, the fog thicker every leg. On each island they lit the light again, a beacon, a lantern or a row of candles, and the fog behind them thinned a little.",
    "Some islands had to be fought for, some were puzzles left by older keepers, some held wrecks with sea chests in them, and the chapels let them rest. What they took off the wrecks between islands they called the salvage.",
  ]},
  { h: 'Lantern Rock', p: [
    "The last light out there, on [[lanternrock]], was held by the thing that had put the others out: [[fogkeeper|the Fog-Keeper]], keeper of a light older than Skerry Light. When he fell, his dead lamp came on, and its beam swept the fog off the whole sea.",
  ]},
], also: ['haar', 'fogkeeper', 'puzzles'] },
// [fbsea] Freebooters' Sea (src/fbsea.js, src/fbkeep.js)
{ id: 'ch_fbsea', t: "Freebooters' Sea", cat: ['Chronicles', 'Events'], box: [['Told in', "Freebooters' Sea"], ['When', 'Spring and summer 1889'], ['Where', '[[widewater|The Wide Water]], out of [[saltcote]]'], ['Who', 'Freebooters in the [[cutter|keeper\'s cutter]]'], ['Foes', '[[blacksloops|The Mooncussers\' black sloops]], [[drowned]]'], ['Paid by', '[[giltgull|Gilt & Gull Company]], [[bellmen|the Bellmen]], [[tidewrights|the Tidewrights]]']], sum: "When the Gannet went down for the second time, a hundred years of wrecks came up with her, and the tides carried them out past the Near Skerries onto the Wide Water, a sea the charts had long since given up on. By the spring of 1889 their cargo was washing up on every rock out there, and freebooters were going out after it.", secs: [
  { h: 'The cutter', p: [
    "The keeper fitted the [[cutter|cutter]] with four swivel guns on her rails and lent her to whoever would sail her, on one condition: that what came up out of the wrecks was brought home to [[saltcote]] and sold honestly, before [[blacksloops|the black sloops]] got to it or the drowned took it back.",
    "There was no end to it and no run to finish. Crews sailed out when they liked, went ashore wherever there was a beach, dug, fought, carried what they found down to the landing boat, and came home with the hold full or not at all.",
  ]},
  { h: 'Voyages', p: [
    "The voyage board on the quay at Saltcote paid for more particular work: a hoard chart to dig out for [[giltgull|Gilt & Gull Company]], a drowned captain's bell to bring back for [[bellmen|the Bellmen]], a wreck to dive on for [[tidewrights|the Tidewrights]], or a black sloop to sink. Each company remembered who had done its work, and paid them the better for it.",
  ]},
  { h: 'The factor', p: [
    "Everything came across the factor's table on the shore by Saltcote's landing: sea chests, ironbound and gilded, cargo crates, strongboxes, captains' bells, lockets and scrimshaw. He weighed it, wrote it in his ledger and paid in gold sovereigns, and the crew shared the purse. A ship that went down took her hold with her, and the crew washed up at Saltcote to start again.",
  ]},
], also: ['widewater', 'saltcote', 'blacksloops'] },
{ id: 'ch_marensend', t: "Maren's End", cat: ['Chronicles', 'Events'], img: 'maren', box: [['Told in', "Maren's End (raid)"], ['When', 'The Dry Night, 1890'], ['Where', '[[swallow|The Swallow]], the [[blackwater|Black Water]] and [[seafort|the sea fort]]'], ['Who', 'Raiders of the [[callings|three callings]]'], ['Carried', '[[marenslantern]]'], ['Foes', '[[mooncusser|Mooncussers]], [[batofmaren|the Knock, Bat of Maren]], [[maren]]'], ['Parts', 'I The Swallow · II The Black Water · III Maren\'s End']], sum: "The tale of the night the sea went away. In 1890 the water round the Light drained down a great hole in the sea bed, leaving a dry bed of salt and wrecks with a long pier running out over it. A few went down after it, carrying the lantern Maren rowed out with in 1887, to finish what the Gannet started.", secs: [
  { h: 'Part I: The Swallow', p: [
    "From the far end of [[longpier|the Long Pier]] the raiders dropped down the throat of [[swallow|the Swallow]], half a minute in the dark. At the bottom, a path wound through the black with braziers along it. Only [[marenslantern|Maren's Lantern]] would light them, and out of their light the dark itself drained the life from anyone in it.",
  ]},
  { h: 'Part II: The Black Water', p: [
    "Through a glowing door lay [[blackwater|a black river under the ground]], with the piles of an old bridge across it and nothing between them. The bridge built itself while its circles were held. Across it waited three Divers that only [[cutlassplimsoll|a Cutlass of Plimsoll]] could hurt, and their helmets opened the way on.",
  ]},
  { h: 'Part III: Maren\'s End', p: [
    "The way came up inside [[seafort|the old Spanish sea fort]] on the headland, with the Light turning far off across the water. A [[mooncusser|Mooncusser]] kept each of the fort's [[apothecaries|three apothecaries]]. When the third fell, [[batofmaren|the Knock, Bat of Maren]] burst up through the flagstones, and when that fell, Maren herself came up over the sea wall.",
    "She could not be hurt while her soul was out of her, drifting over the water as a small, smiling yellow light. Only by shooting it, again and again, and then her, was she brought down. At a third of her strength she called up a storm that put out every light in the fort. When she fell at last, she was laid to rest there, and the fort has been called Maren's End ever since.",
  ]},
  { h: 'And yet', p: [
    "The sea came back. Nobody claims it did not. And on every sea, every night, the fishermen still see a woman standing on the water when the lamp turns. Whether the raid ended her or only ended one of her is the oldest argument in [[wrackhaven]]'s inn.",
  ]},
], also: ['maren', 'seafort', 'callings'] },

// ---------------- characters ----------------
{ id: 'maren', t: 'Maren Holm', cat: ['Characters', 'Creatures'], img: 'maren', box: [['Also called', 'The woman on the water, the keeper\'s wife'], ['Born', 'c. 1852'], ['Lost', '14 December 1887, off the Skerries'], ['Kin', 'The keeper Holm (husband)'], ['Carried', '[[marenslantern]]'], ['Weakness', '[[bell]], and [[plimsoll]]'], ['Appears in', '[[ch_voyages]], [[ch_gannetswake]], [[ch_marensend]]']], sum: "The keeper's wife at [[skerrylight]]. On the night the lamp failed she rowed out alone with a hand lantern to warn the brig [[gannet|Gannet]]. The Gannet broke up with all hands and her skiff came back empty. Since then she has stood on the water when the lamp turns, a little nearer every time.", secs: [
  { h: 'Life', p: [
    "Little is written of her before the wreck. She came to the Light with her husband some years before 1887, kept the station's garden in its drystone walls and, by the account of the Wrackhaven fishermen, rowed better than most of them. The log's first entry says only: <i>I could not stop her.</i>",
  ]},
  { h: 'On the water', p: [
    "She keeps her own slow pace, one stage nearer at each turn of the beam, and between turns she follows. Those who have been close say you hear her heartbeat, the deck lantern gutters and leans towards her, and once she is near you can hear her oars in the rowlocks. If she reaches a ship, she comes aboard, and the ship does not come in.",
    "She will not go near [[plimsoll]], and a rung [[bell|bell]] drives her back. A crew sailing close together keeps her off too. Nobody knows why the shark frightens her; the commonest guess in the harbour is that she knows whose shoes he wears.",
  ]},
  { h: 'Maren\'s End', p: [
    "In 1890 she was fought at [[seafort|the sea fort]] by the raiders of [[ch_marensend]]: three times a man's height, in a long dark dress, one arm raised, with a sea-green light about her that nothing could get through while her soul was out of her. She called up storms and bells from under the sea. She was laid to rest there, and yet she is still seen on every sea. See [[ch_marensend]] for the argument.",
  ]},
], also: ['wreck1887', 'marenslantern', 'keeper'] },
{ id: 'keeper', t: 'The keeper Holm', cat: ['Characters'], box: [['Post', 'Principal keeper, [[skerrylight]]'], ['Kin', '[[maren]] (wife)'], ['Known for', '[[log|The keeper\'s log]]'], ['Appears in', 'Every tale, mostly offstage']], sum: "The principal keeper of Skerry Light from about 1879, husband of [[maren]], and the author of [[log|the keeper's log]]. Almost everything known about 1888 is known because he wrote it down.", secs: [
  { h: 'The keeper', p: [
    "He was on watch in the second hour of 14 December 1887 when the lamp failed, and he has never written why. He sent out the cutter after the Gannet rose, again into the fog in 1889, and he kept the lamp lit through everything in between, as a keeper should. In the Drowned Reach the name of Keeper is given to whoever holds his rock.",
    "His log shows a careful man trying to keep a record of a world that had stopped behaving. He counted the seas, set down what the boats told him, and refused, once, to write a year down at all.",
  ]},
  { h: 'His first name', p: [
    "The log is never signed, and the station's books give only <i>Holm, Principal Keeper</i>. This compendium does not guess.",
  ]},
], also: ['log', 'station', 'maren'] },
{ id: 'plimsoll', t: 'Plimsoll', cat: ['Characters', 'Creatures'], img: 'plim', box: [['Kind', 'A shark, walking'], ['First seen', '2 January 1888, at dawn'], ['Wears', 'The blue shoes of the Gannet\'s cabin boy'], ['Named by', 'The hands of [[wren]]'], ['Known for', 'Walking ships through the deep water'], ['Appears in', '[[ch_voyages]], [[ch_gannetswake]], [[ch_fogrun]]']], sum: "A shark who walked up out of the surf the winter the Gannet was lost, wearing the blue shoes of her cabin boy. He knows the deep water through the skerries and walks ahead of ships to the harbour. [[maren]] will not go near him.", secs: [
  { h: 'First sighting', p: [
    "The keeper saw him first, standing on the sand at dawn, looking up at the Light. A week later the schooner [[wren|Wren]] came in without a scratch with him walking ahead on the water the whole way, and her hands named him for his shoes.",
  ]},
  { h: 'The guide', p: [
    "A ship that keeps up with him is covered, at any speed; a ship that falls behind he waits for only a few seconds. He sometimes snaps up a [[drowned|drowned sailor]] who wanders into his path. He has been seen walking the cloud tops of [[opensky|the open sky]] and leading ships out of [[backrooms|the yellow rooms]]. Asked where those rooms are, he only looked at the lamp.",
  ]},
  { h: 'The cabin boy', p: [
    "The cabin boy's name went down with the Gannet's articles. Whether Plimsoll is the boy, ate the boy, or simply liked the shoes is not something anyone has asked him. He sheds his teeth as sharks do, and some say [[cutlassplimsoll|the Cutlasses of Plimsoll]] are set with them.",
  ]},
], also: ['cutlassplimsoll', 'gannet', 'maren'] },
{ id: 'crane', t: 'Absalom Crane', cat: ['Characters'], box: [['Post', 'Master of the brig [[gannet|Gannet]]'], ['Lost', '14 December 1887'], ['Carries', 'A speaking trumpet and a boat hook'], ['Weakness', 'Light'], ['Appears in', '[[ch_gannetswake]]']], sum: "Master of the brig Gannet when she broke up on the skerries, and the one who would not let her go. On the night she rose in 1888 he was waiting on her quarterdeck, tall and drowned in a rotted greatcoat and hat, sea-water running off him.", secs: [
  { h: 'Before', p: [
    "Crane was known on the coast as a hard driver who brought his cargoes in early. He was coming in under the cliffs on the night of the wreck with no light to steer by, and the harbour has long argued whether he saw [[maren]]'s lantern and took it for the Light, or saw it and ignored it.",
  ]},
  { h: 'On the quarterdeck', p: [
    "He bellowed through his trumpet hard enough to throw a man across the deck, swept with his boat hook and called his crew up the sides. He could only be hurt in the light, and when the Gannet began to founder he hoisted a black sail to keep the Light's beam off his deck. He fell under the flares of the cutter's crew.",
  ]},
], also: ['ch_gannetswake', 'gannet', 'bosun'] },
{ id: 'bosun', t: 'The Bosun', cat: ['Characters', 'Creatures'], box: [['Post', 'Boatswain of [[gannet]]'], ['Carries', 'A boarding axe, and a key'], ['Appears in', '[[ch_gannetswake]]']], sum: "The Gannet's boatswain, a big drowned man with a boarding axe. When the brig rose he was guarding her hold, and one of the three keys to the captain's cabin with it.", secs: [
  { h: '', p: [ "He was the last of the crew to be seen alive on the night of the wreck, by the account of the Wrackhaven men who found him tied to the mainmast's stump. He did not answer when they called to him, and the sea took the stump in the morning." ] },
], also: ['crane', 'drowned'] },
{ id: 'pascoe', t: 'Old Pascoe', cat: ['Characters'], box: [['Trade', 'Fisherman, Wrackhaven'], ['Known for', 'Seeing things first'], ['Appears in', '[[log|The keeper\'s log]]']], sum: "A Wrackhaven fisherman, and the keeper's best source in 1888. He saw [[knock]] walking on the water before anyone else, came in with a plank stove in by a coconut, and once went out at dusk and came back three days later with a day's beard.", secs: [
  { h: '', p: [
    "That last trip took him to [[between|the Places In Between]], where he saw doors in the water and a face asleep under it, and rang his bell to keep it asleep. He drank at the Drowned Man in [[wrackhaven]] for forty years.",
  ] },
], also: ['log', 'wrackhaven', 'between'] },
{ id: 'schoolmaster', t: 'The schoolmaster', cat: ['Characters'], box: [['Trade', 'Schoolmaster, Wrackhaven'], ['Known for', 'His book of old stories']], sum: "Wrackhaven's schoolmaster, who read the keeper the story the [[winedark|Wine-Dark Sea]] comes from. A page of his book is pasted into [[log|the log]], the ink run with salt.", secs: [
  { h: '', p: [ "He told the keeper the story was older than the Bible. In the margin he had pencilled how the ships beat it: drown the singing with the bell, sail hard round the water that turns, and put a flare in the giant's eye." ] },
], also: ['winedark', 'log'] },
{ id: 'lampwright', t: 'The Lampwright', cat: ['Characters', 'Objects'], box: [['Real name', 'Unrecorded'], ['Made', 'The lens of [[skerrylight]], 1841'], ['Left behind', 'The Lampwright\'s Bench'], ['Appears in', '[[ch_lastlight]], [[ch_marensend]], [[ch_fogrun]]']], sum: "The craftsman who ground and set the great lens of Skerry Light in 1841, and whose workbench still stands in [[station|the keeper's station]]. Anything worked over on it comes back the better for it, and nobody can say quite how.", secs: [
  { h: 'The bench', p: [
    "The bench was left in the Lamp-Wright's Store when the lens was finished, with his tools still on it. In the winter of 1888 the defenders of the station found that a gun left on it came back reforged, harder hitting and changed in its look, often with a trick of its own. A second bench turned up in Wrackhaven's town hall, and a third in the Governor's Rooms of [[seafort|the sea fort]], where it worked on the drowned but would not help against Maren.",
    "In Fog Run the cutter's crew found his sparks in the salvage, and took them for his blessing.",
  ]},
  { h: 'The Fresnel Lamp', p: [ "His own signal lantern, with a piece of the Light's lens in it, is [[fresnellamp|the Fresnel Lamp]]." ] },
], also: ['fresnellamp', 'skerrylight', 'station'] },
{ id: 'fogkeeper', t: 'The Fog-Keeper', cat: ['Characters', 'Creatures'], box: [['Post', 'Last keeper of the fire on [[lanternrock]]'], ['Lost', '1841, when his light was put out'], ['Carries', 'A cold lantern on a chain'], ['Weakness', 'Light'], ['Appears in', '[[ch_fogrun]]']], sum: "The drowned keeper of an older, dead light, twice a man's height, with a lamp-glass for a face and fog pouring out of it. In 1889 he put out the lights of the outer rocks one by one, until the cutter's crew came for him on Lantern Rock.", secs: [
  { h: 'Who he was', p: [
    "His family kept the fire on [[lanternrock]] for six hundred years. When [[skerrylight]] was lit in 1841 the fire was no longer needed, and was put out. The Wrackhaven stories say he would not leave the rock, and kept the cold lamp polished until the sea took him. Nobody went out to look.",
    "When the sea stopped being one sea, he came back with the fog, and began putting out every light that was not his.",
  ]},
  { h: 'On the rock', p: [
    "He could only be hurt in light: a lit brazier, a flare, or the Light's beam. His fog put the braziers out, and his lantern on its chain knocked men flat. At half his strength he climbed his tower and put out the beam itself. When he fell, his dead light came on at last and swept the fog off the sea. It counts, the crews say, as an island lit.",
  ]},
], also: ['lanternrock', 'haar', 'ch_fogrun'] },
{ id: 'verity', t: 'Verity', cat: ['Characters', 'Creatures'], img: 'verity', box: [['Kind', 'Unknown'], ['Looks like', 'A small yellow thing, round as a lamp glass, smiling'], ['First account', '28 February 1888, a hand off the Kittiwake'], ['Says', 'That it wants to help'], ['Weakness', 'A [[flare]]'], ['Appears in', '[[ch_voyages]], [[ch_wreckers]]']], sum: "A small, round, smiling yellow thing that sits on decks and says it wants to help. The ships that let it stay do not come in. Its name, the Kittiwake's hand said, is Verity.", secs: [
  { h: 'At sea', p: [
    "He sits down small in a corner of the deck, facing whoever is at the helm. A flare in his face sends him rolling over the side. Shot, cut or rung at, he does not seem to notice. Nobody who has waited to find out what his help is like has come back to say.",
    "A page of the log from the yellow rooms says he smiled at a master from the bowsprit, and offered. <i>I did not let it.</i>",
  ]},
  { h: 'Ashore', p: [
    "On Wreckers' Night he comes ashore and sits down on the shingle in front of anyone with a flare left. Walking away does no good: look away and he is in front of you again. Any flare on the island sends him rolling into the dark. The wreckers count a man he gets as <i>helped</i>.",
  ]},
  { h: 'At the fort', p: [
    "Some of those who fought at [[seafort|Maren's End]] swear that the small yellow light that hung over the water while Maren could not be hurt had his smile. What that means, if it is true, nobody has settled.",
  ]},
], also: ['visitors', 'flare', 'backrooms'] },
{ id: 'mooncusser', t: 'The Mooncusser', cat: ['Characters', 'Creatures'], box: [['Kind', 'A drowned wrecker, in chains'], ['Carries', 'A false light on a pole'], ['Appears in', '[[ch_lastlight]], [[ch_marensend]], [[ch_fogrun]]']], sum: "A wrecker of the old days, hanged in chains on the sea wall and come back in them. He carries a false light on a pole, and when he lifts it and it swells, it blinds whoever looks at it and draws them in to him.", secs: [
  { h: '', p: [
    "The Mooncussers were wreckers who cursed the moon, because a moonlit night showed ships the rocks. See [[mooncussers]] for the trade. The ones the fort's governors caught were left to hang where ships could see them; the ones that came back keep the fort's [[apothecaries|apothecaries]] now, one to each.",
    "While he holds the light up he is open to a shot. Look away from it, or get behind something, until he lowers it.",
  ] },
], also: ['mooncussers', 'wreckerslights', 'apothecaries'] },

// ---------------- creatures ----------------
{ id: 'drowned', t: 'The drowned', cat: ['Creatures', 'Factions'], box: [['Who', 'The crew of [[gannet]], and every crew the skerries have taken since'], ['First seen', 'The winter of 1887'], ['Weakness', '[[bell]], speed, light'], ['Appears in', 'Every tale']], sum: "The drowned crew of the Gannet, and in time every crew the skerries ever took. They swim after ships, climb aboard slow ones and tear out planks. Later they came ashore, for the wreckers' islands, the keeper's station, and every shore the light did not reach.", secs: [
  { h: 'At sea', p: [
    "They swim after any ship that comes into the skerries, slow but patient, and their eyes always catch the light. A ship going fast shakes them off. The bell drives them under. [[plimsoll]] eats any he can catch.",
  ]},
  { h: 'Ashore', p: [
    "From the winter of 1888 they came up out of the sea for [[station|the keeper's station]], round after round, tearing the boards off its windows, and in 1891 they took all of [[wrackhaven]]. Each one walks in its own way, weaving and stumbling, and comes at you from its own side. Their bigger kin are [[diver|the Diver]], [[mooncusser|the Mooncusser]] and [[keelback|the Keelback]].",
    "Down [[swallow|the Swallow]] in 1890 they glowed, and climbed up out of the rock itself.",
  ]},
  { h: 'In the Reach', p: [ "In [[ch_reach]] they rise at night on any shore the light does not reach and take it into the dark, and by day they sink back." ] },
], also: ['gannet', 'diver', 'bell'] },
{ id: 'knock', t: 'Knock', cat: ['Creatures', 'Characters'], img: 'knock', box: [['Kind', 'A walking figurehead'], ['Of', 'The brig [[gannet|Gannet]]'], ['Gone from the wreck', 'February 1888'], ['Carries', 'A belaying pin'], ['Warning', 'Three knocks on wood'], ['Appears in', '[[ch_voyages]], [[ch_gannetswake]], [[ch_fogrun]]']], sum: "The Gannet's carved wooden figurehead, which walked off the wreck in the winter of 1888 with a belaying pin in its hand. It only moves while nobody is looking at it. You hear it before you see it: three knocks on wood.", secs: [
  { h: 'The rule', p: [
    "Put a light on him, the beam, a lantern or a flare, or simply look at him close, and he stops dead. Look away and he comes on, faster than a ship can sail, the knocks quicker and louder as he closes. If he reaches a hull he strikes it and is thrown back into the dark. The bell freezes him for a while.",
    "[[pascoe|Old Pascoe]] saw him first, walking on the water.",
  ]},
  { h: 'Below decks', p: [
    "When the Gannet rose, Knock was back aboard and loose below decks, with the third key to the captain's cabin round his neck. It could only be taken while he stood frozen, so one hand watched while another went up to him.",
  ]},
  { h: "Knock's Garden", p: [
    "On one of the islands of [[ch_fogrun]] there is a field of figurehead statues that obey his rule. The crews call it Knock's Garden, and cross it in pairs, back to back. See [[puzzles]].",
  ]},
  { h: 'Not to be confused with', p: [ "[[batofmaren|The Knock, Bat of Maren]], which is much bigger." ] },
], also: ['batofmaren', 'gannet', 'puzzles'] },
{ id: 'batofmaren', t: 'The Knock, Bat of Maren', cat: ['Creatures'], box: [['Kind', 'A driftwood giant'], ['Height', 'About nine metres'], ['Carries', 'A bat'], ['Answers to', '[[maren]]'], ['Appears in', '[[ch_marensend]]']], sum: "A plank of driftwood half again as tall as Maren, with big rolling eyes, a long nose and a grin, thin bare arms and legs, and a bat. It burst up through the flagstones of the sea fort's Plaza de Armas, after three knocks on wood, when the last of the Mooncussers fell.", secs: [
  { h: 'What it is', p: [
    "The fort's old soldiers called it Maren's bat, the thing she sends out first. The common story is that the sea made it out of the timbers of every ship the skerries ever broke, and that [[knock]] is only a splinter of it. Others say it is the other way round. It sings, beating the bat into its other hand, and if the song is ever finished nobody in earshot lives to say what the last line is.",
  ]},
  { h: 'Its fall', p: [ "It toppled over backwards like a felled plank. A few seconds later, Maren rose." ] },
], also: ['knock', 'ch_marensend'] },
{ id: 'diver', t: 'The Diver', cat: ['Creatures'], box: [['Kind', 'A drowned giant in a brass helmet'], ['Carries', 'An anchor; some carry a [[cutlassplimsoll|Cutlass of Plimsoll]]'], ['Origin', 'The divers of the [[salvors|Northern Salvage Company]]'], ['Appears in', '[[ch_lastlight]], [[ch_marensend]], [[ch_fogrun]]']], sum: "A drowned giant in a salvage diver's brass helmet, dragging an anchor. When a ring glows on the ground in front of him, the anchor is about to come down in it.", secs: [
  { h: 'The salvors', p: [
    "In the spring of 1888 the [[salvors|Northern Salvage Company]] sent divers down to the Gannet for her cargo. Their air lines came up cut. The helmets were the next thing seen of them, on the drowned giants that came up for [[station|the station]] that winter.",
  ]},
  { h: 'Down the Swallow', p: [
    "Under the sea bed, in 1890, some of them carried [[cutlassplimsoll|Cutlasses of Plimsoll]] in place of anchors, and three by the far bank of [[blackwater|the Black Water]] could be hurt by nothing else. Their helmets, set on three iron stands, opened the door to the fort.",
  ]},
], also: ['salvors', 'keelback', 'mooncusser'] },
{ id: 'keelback', t: 'The Keelback', cat: ['Creatures'], box: [['Kind', 'A crab made of wrecks'], ['Weakness', 'Its soft belly, when it hits a wall'], ['Appears in', '[[ch_lastlight]], [[ch_marensend]], [[ch_fogrun]]']], sum: "A great crab built out of wrecks, keels for legs and a hull for a shell. It rears up, and a lane glows on the ground through whoever it means to run down. If it charges into a wall it reels, its soft belly showing.", secs: [
  { h: '', p: [ "The fishermen say every [[crabs|crab]] in the skerries is waiting to grow into one, and that it takes a whole wreck to do it. After the winter of 1887 there was no shortage of wrecks." ] },
], also: ['crabs', 'diver'] },
{ id: 'crabs', t: 'The crabs', cat: ['Creatures'], box: [['Size', 'About a big dog'], ['Habit', 'Swarming, sideways'], ['Appears in', '[[ch_lastlight]], [[ch_fogrun]]']], sum: "Crabs the size of big dogs, which came up in swarms instead of the drowned on some nights at the keeper's station, pouring in at the windows and up the jetty ladders. They are quick, weak, and only go for the legs.", secs: [
  { h: '', p: [ "On one kind of island in [[ch_fogrun]] they came with the tide, and the beach shrank under the crew every few seconds. The crews call that the Crab Tide. See also [[keelback|the Keelback]]." ] },
], also: ['keelback'] },
{ id: 'visitors', t: 'The visitors', cat: ['Creatures'], gal: ['dancer', 'crocbomber', 'cactusmammoth', 'pigeon', 'coconutbull', 'bananadolphin', 'toucan', 'brute', 'tyrefrog', 'assassin', 'goose', 'shrimpcat', 'fridgecamel', 'condiments', 'gentleman', 'smuggler', 'bananaape', 'rootman'], box: [['First account', '14 March 1888'], ['How many', 'Eighteen, by the boats\' count'], ['Appears in', '[[ch_voyages]]']], sum: "The strange things the boats began to meet on the water in the spring of 1888. The keeper would have laughed, he wrote, but Old Pascoe came in with a plank stove in by a coconut, and no two nights were the same three.", secs: [
  { h: 'The list', p: [
    "<b>The Dancer:</b> a ballerina spinning on the water, whose whirl drags at the helm. <b>The Croc Bomber:</b> engines overhead, and red rings where the bombs will land. <b>The Cactus Mammoth:</b> stands on the water like a rock, bristling with spines. <b>The Informer:</b> a pigeon in a trench coat; when its red light blinks, look away. <b>The Coconut Bull:</b> a trumpet from the side, then a charge. <b>The Banana Dolphin:</b> leaps across the bow and leaves peel slicks.",
    "<b>The Toucan:</b> circles high and dives for your flare. <b>The Juiced Brute:</b> swims after you and grabs the bow. <b>The Tyre Frog:</b> bounces across the sea; watch where its shadow lands. <b>The Assassin Cup:</b> you hear a blade but see nothing. <b>The Bomber Goose:</b> a goose with propellers, laying eggs on the water. <b>The Shrimp Cat:</b> circles the hull and clings on.",
    "<b>The Fridge Camel:</b> walks the sea freezing it as it goes. <b>The Condiment Twins:</b> close in from either side. <b>The Gentleman:</b> rose from the sea in a top hat taller than the tower. <b>The Smuggler:</b> a gunman on a rock who fires at anything in the light. <b>The Banana Ape:</b> throws fruit at your sails. <b>The Root Hermit:</b> points, and roots race across the water.",
  ]},
  { h: 'Where they came from', p: [
    "Nobody knows. The commonest guess is that once the sea stopped being one sea, the door was open for anything, and these were simply the first to wander through. Among the boats they are counted alongside the old terrors: [[drowned]], [[knock]] and [[verity]].",
  ]},
], also: ['verity', 'sixseas', 'ch_voyages'] },
{ id: 'stowaway', t: 'The Stowaway', cat: ['Creatures'], img: 'foe:stowaway', box: [['Haunts', '[[backrooms|The yellow rooms]]'], ['Warning', 'A peg leg on wet carpet']], sum: "Thump, thump: a peg leg on wet carpet. The one thing that lives in the yellow rooms, and the reason ships leave them as fast as they can.", secs: [
  { h: '', p: [ "He runs at you down the corridors and is always there. Masters who have seen him say he wears an old sea coat and a ship's name on his cap that is too worn to read." ] },
], also: ['backrooms'] },

// ---------------- places ----------------
{ id: 'skerrylight', t: 'Skerry Light', cat: ['Places'], box: [['Kind', 'Lighthouse'], ['Built', '1841'], ['Lens', 'Set by [[lampwright|the Lampwright]]'], ['Keeper', '[[keeper|Holm]], from c. 1879'], ['Beam', 'One sweep about every six and a half seconds'], ['Appears in', 'Every tale']], sum: "The lighthouse on its rock at the mouth of the Skerries, and the centre of every tale in this compendium. When its lamp failed on 14 December 1887 the brig Gannet was lost, and nothing on this coast has been the same since.", secs: [
  { h: 'The tower', p: [
    "A round tower twenty-five metres high, whitewashed smooth and drawing in a little towards the top, on a granite plinth, with one red band under a black gallery. Ninety stone treads wind up inside it to the lantern room and the great lens. Round its foot is [[station|the keeper's station]].",
  ]},
  { h: 'The beam', p: [
    "Its beam shows the rocks for the moment it is on them. In every sea, in every year, the beam comes too: red in [[nether|the Nether]], a coin in a well seen from [[opensky|the open sky]]. As one page of the log puts it, <i>it always comes with you.</i> In the Drowned Reach, whoever holds the rock is called the Keeper.",
  ]},
], also: ['station', 'keeper', 'lanternrock'] },
{ id: 'station', t: "The keeper's station", cat: ['Places'], box: [['Where', 'The foot of [[skerrylight]]'], ['Rooms', 'Ten round the tower, a courtyard and a jetty'], ['Besieged', 'Winter 1888 to 1889'], ['Appears in', '[[ch_lastlight]]']], sum: "The station round the foot of Skerry Light: the jetty, the courtyard, ten whitewashed rooms round the tower, and the tower itself. In the winter of 1888 the drowned came up out of the sea for it, night after night.", secs: [
  { h: 'The rooms', p: [
    "From the jetty a sea gate opens into the Courtyard, with its well, its fog bell and [[maren]]'s garden in low drystone walls. Off it are the Coal Store and the Signal Hut. Inside are the Keeper's Quarters, the Oil Store, the Fog-Signal House, the East Passage, the Net Loft, the Store Hall, the Lamp Passage, the Boathouse and the Wreck Store, and up the tower the Chart Room, the Lamp-Wright's Store and the Service Room.",
  ]},
  { h: 'The wreck chest', p: [ "Somewhere in the station each night stands [[wreckchest|the wreck chest]]." ] },
], also: ['ch_lastlight', 'skerrylight', 'wreckchest'] },
{ id: 'wrackhaven', t: 'Wrackhaven', cat: ['Places'], box: [['Kind', 'Fishing town, now drowned'], ['Taken by the sea', 'Winter 1891'], ['Landmarks', 'The Square, the town hall, the Drowned Man inn'], ['Appears in', '[[ch_lastlight]]']], sum: "The fishing town across the harbour from Skerry Light, where the keeper bought his oil and Old Pascoe drank. In the winter of 1891 the sea came up Fish Street one night and did not go back, and the drowned live there now.", secs: [
  { h: 'The town', p: [
    "From the Quay, Fish Street runs up between the Chandlery and the Fish Market to the Square, with its well, its market cross and the town hall in the middle: the Moot Hall, the Council Chamber and the Belfry over the roof. Round the Square stand houses, workshops and the inn, the Drowned Man, which had that name long before it was true.",
  ]},
], also: ['pascoe', 'schoolmaster', 'ch_lastlight'] },
{ id: 'lanternrock', t: 'Lantern Rock', cat: ['Places'], box: [['Kind', 'The outermost rock of the Skerries'], ['Light', 'A fire, from c. 1200s to 1841'], ['Keeper', '[[fogkeeper|The Fog-Keeper]]'], ['Appears in', '[[ch_fogrun]]']], sum: "The outermost rock of the Skerries, and the site of the first light on this coast, a fire kept by one family for six hundred years. It was put out when Skerry Light was lit, and lit again in 1889.", secs: [
  { h: '', p: [ "The base of its dead tower still stands, with three lamp braziers round it. On the fogbound nights of 1889 it was the last light in the haar, and the thing that had put the others out was waiting there. When the [[fogkeeper|Fog-Keeper]] fell, the old lamp at the top of the tower came on by itself." ] },
], also: ['fogkeeper', 'haar'] },
{ id: 'haar', t: 'The haar', cat: ['Places', 'Events'], box: [['Kind', 'A sea fog'], ['When', 'Autumn 1889'], ['Reaches', 'The Near Skerries, the Grey Reach, the Haar'], ['Appears in', '[[ch_fogrun]]']], sum: "The sea fog that closed in round the Skerries in 1889, so thick the Light could not reach past the rocks. It came, the crews said, from [[lanternrock]], and thickened the further out they sailed.", secs: [
  { h: '', p: [
    "Every island lit pushed it back a little. The crews charted it in three reaches: the Near Skerries, where you could still see a ship's length or two; the Grey Reach; and the Haar itself, where you could hardly see your own bow. Those lost overboard in it are said to wander until an island's light is lit, and the islands have a bell for calling them home, the Lost Man's Bell.",
  ] },
], also: ['ch_fogrun', 'puzzles'] },
// [fbsea]
{ id: 'widewater', t: 'The Wide Water', cat: ['Places'], box: [['Kind', 'Open sea, about two miles across'], ['Lies', 'North of the Light, beyond the Near Skerries'], ['Islands', 'Twelve, and [[saltcote]]'], ['Appears in', '[[ch_fbsea]]']], sum: "The open sea beyond the Near Skerries, about two miles each way, which the Admiralty charts leave blank. Twelve islands lie across it, with reefs and loose rock between, and since 1889 the wreckage of a hundred years has been washing up on all of them.", secs: [
  { h: 'The islands', p: [
    "Gullstone, all grey shingle and gulls. Widow's Teeth, black rock and broken hulls, ringed with reef. St Brannoc's Isle, its chapel roofless among the graves. Tallow Cove and its smugglers' jetty. Beacon Knoll, heather and a ruined signal tower. Marrowfen, mud and reeds and marsh lights. Crowsnest Rock, with a stair cut in its crags. The Coffin Stones, wrecks on the rocks. Hangman's Holm, a bleak shingle holm. Gilt Strand, its golden beach and its boathouse. Mother Carey's Rest, an old chapel among the stones. And Blackwater Holm, black pools and peat, furthest out of all.",
    "The further north a crew sails, the better the chests they find and the thicker the rocks between the islands. The charts that do exist are mostly hoard charts, and most of those are lies.",
  ]},
  { h: 'At night', p: [ "The nights out there are a little brighter than at the Light, and the islands show as shapes against the sea. Each has a faint lantern at its landing, lit by nobody anyone has met." ] },
], also: ['saltcote', 'ch_fbsea', 'blacksloops'] },
{ id: 'saltcote', t: 'Saltcote', cat: ['Places'], box: [['Kind', 'An outpost on a cove'], ['Lies', 'The south end of [[widewater|the Wide Water]]'], ['Has', 'A quay, the factor\'s table, the voyage board, a chapel'], ['Appears in', '[[ch_fbsea]]']], sum: "The outpost at the south end of the Wide Water: a cove with a quay, a handful of huts and salt pans, and a lighthouse on the point that is a good deal smaller than Skerry Light and a good deal friendlier. Every freebooter's voyage starts and ends there.", secs: [
  { h: 'The quay', p: [
    "The factor keeps his table on the shore by the landing, under an awning, with his ledger, his scales and his stacks of sovereigns. Beside it stands the voyage board, papered over with the companies' notices. The chapel up the slope mends whoever comes home hurt.",
    "The drowned do not come up at Saltcote, and the black sloops keep their distance from its light. Nobody there will say why, and nobody wants to find out.",
  ]},
  { h: 'Its lamps', p: [ "The quay's lamps and the windows of its huts can be seen across the water from a long way out, and on a dark night they are the only steady lights on the Wide Water." ] },
], also: ['widewater', 'ch_fbsea'] },
{ id: 'puzzles', t: 'The islands of the haar', cat: ['Places'], box: [['Kinds', 'Fight, elite, puzzle, wreck, chapel, unknown'], ['Appears in', '[[ch_fogrun]]']], sum: "The islands between the Light and Lantern Rock, each with its own light to be lit. Some were fought for, some rested on, and some were puzzles left by the keepers of the old rocks, who did not want just anyone lighting their lamps.", secs: [
  { h: 'The puzzles', p: [
    "<b>Bend the Beam:</b> mirror posts to turn, to carry the Light's beam from the cliff to the beacon. <b>Knock's Garden:</b> a field of figurehead statues that move only when nobody is looking; see [[knock]]. <b>The Bell Buoys:</b> a fog horn sounds a tune, and the island's bells must answer it. <b>The Tide Stones:</b> four plates that must be held down at once to raise the causeway.",
  ]},
  { h: 'The others', p: [
    "Wreck islands have a sea chest on the beach, sometimes guarded. Chapel islands are rests, where the candles mend everyone and bring the lost home. Elite islands are held by one of the great drowned. And some islands nobody knows anything about until they land.",
  ]},
], also: ['haar', 'ch_fogrun', 'knock'] },
{ id: 'swallow', t: 'The Swallow', cat: ['Places'], box: [['Kind', 'A sinkhole in the sea bed'], ['Opened', 'The Dry Night, 1890'], ['Depth', 'About twenty seconds\' fall'], ['Appears in', '[[ch_marensend]]']], sum: "The great funnel-shaped hole in the sea bed off Skerry Light, down which the sea drained in 1890. Wide at its mouth and narrowing to its throat far below, it was reached by [[longpier|the Long Pier]].", secs: [
  { h: 'The Deep Path', p: [
    "At its bottom, black but for pale lichen on the rock, a wide path winds round the cave to a glowing door, with eighteen braziers along it and spiked iron balls swinging on chains from the dark roof. Out of the braziers' light the dark drains the life from you, and Maren's Weight settles on you and slows your step. Only [[marenslantern|Maren's Lantern]] lights the braziers.",
  ]},
  { h: 'Where the water went', p: [ "Down, and through, and under, to [[blackwater|the Black Water]], say most. That it came back up again the same way is generally agreed; when is not." ] },
], also: ['longpier', 'blackwater', 'marenslantern'] },
{ id: 'longpier', t: 'The Long Pier', cat: ['Places'], box: [['Kind', 'A pier over a dry sea bed'], ['Runs to', '[[swallow|The Swallow]]'], ['Appears in', '[[ch_marensend]]']], sum: "The long, wide pier that runs from a quay out over the dry bed of the drained sea to a round platform hanging over the middle of the Swallow. Who built it, over a sea bed that had been under water the day before, is not known.", secs: [
  { h: '', p: [ "Its far platform gives way once enough of the drowned have been sent back round it, and drops whoever is on it into the Swallow. The raiders of 1890 went that way on purpose." ] },
], also: ['swallow'] },
{ id: 'blackwater', t: 'The Black Water', cat: ['Places'], box: [['Kind', 'A river under the ground'], ['Crossed by', 'A bridge that builds itself'], ['Appears in', '[[ch_marensend]]']], sum: "A black river running fast through a cavern under the sea bed, between the bottom of the Swallow and the fort. Nobody can swim it. Across it stand the piles of an old bridge, and nothing between them.", secs: [
  { h: '', p: [
    "Its banks are strewn with what the river has thrown up over the years: the bones of the drowned, upturned canoes, broken oars, crates and old nets. Rings of old stones stand on platforms either side of the bridge's foot, and a third at the far end; while they are held, the bridge builds itself plank by plank. Behind the far bank stands an iron door in the rock, and three iron stands for helmets in front of it. See [[diver|the Diver]] and [[cutlassplimsoll|the Cutlasses of Plimsoll]].",
  ] },
], also: ['swallow', 'cutlassplimsoll', 'seafort'] },
{ id: 'seafort', t: "Maren's End (the sea fort)", cat: ['Places'], box: [['Old name', 'Castillo de Nuestra Señora del Mar'], ['Built', 'c. 1597, by a Spanish garrison'], ['Where', 'A headland in sight of [[skerrylight]]'], ['Known for', 'Its [[apothecaries|three apothecaries]], and Maren\'s last fight'], ['Appears in', '[[ch_marensend]]']], sum: "An old Spanish sea fort on a headland across the water from Skerry Light, its south front a sea wall over the open ocean. It took its present name in 1890, when Maren Holm was laid to rest there.", secs: [
  { h: 'How a Spanish fort came to be here', p: [
    "It is one of the oldest arguments on the coast. The parish ledgers say a Spanish squadron was blown north in the Armada years, wintered on the headland, and never left. Others say the fort was always there and the Spaniards only found it. The garrison's descendants were still in Wrackhaven when the sea took it.",
  ]},
  { h: 'The fort', p: [
    "The Plaza de Armas, the great courtyard with its cistern, lies in the middle, with the Powder Magazine, the Guardroom, the Chapel of Our Lady of the Sea, the Cookhouse, the Governor's Rooms, the Sally Port, the Barracks and the Officers' Mess round it. Up a grand stair on the south side is the Sea Battery, cannon on top of the sea wall, from which you can see the Light turning far off across the water.",
    "The governors hanged [[mooncussers]] they caught in chains along that wall, so the ships could see them.",
  ]},
], also: ['apothecaries', 'ch_marensend', 'mooncussers'] },
{ id: 'apothecaries', t: 'The three apothecaries', cat: ['Places', 'Factions'], box: [['Rooms', 'San Telmo (west), Santa Bárbara (east), San Lázaro (north)'], ['In', '[[seafort|The sea fort]]'], ['Kept by', 'A [[mooncusser|Mooncusser]] each, in 1890']], sum: "The three dispensaries of the sea fort, each named for a saint and lit its own colour, with cabinets of drawers and bottles round the walls. The brotherhood of sea-surgeons who kept them gave their name to [[callings|the Apothecary calling]].", secs: [
  { h: 'The saints', p: [
    "San Telmo is the sailors' saint, whose fire plays on mastheads in a storm. Santa Bárbara keeps the gunners and the powder, and those caught out in lightning. San Lázaro keeps the sick. Between them, the old surgeons said, they covered everything that could happen to a man at sea.",
  ]},
  { h: 'In 1890', p: [ "Each was kept by a Mooncusser, and only when all three had fallen did the [[batofmaren|Bat of Maren]] come." ] },
], also: ['seafort', 'callings', 'mooncusser'] },
{ id: 'bondedquay', t: 'The Bonded Quay', cat: ['Places'], box: [['Kind', 'A customs yard'], ['Appears in', '[[ch_wreckers]]']], sum: "A customs yard shut in by the high backs of the warehouses, packed with long cargo stacks under tarpaulins, with a crane on a stone plinth in the middle. The wreckers fight there because it is where the salvage is kept.", secs: [
  { h: '', p: [ "Its lanes are short and its corners blind. The drowned do not come up there: the yard is walled off from the sea, and the customs men saw to it long ago." ] },
], also: ['pilchardrow', 'flensingyard', 'ch_wreckers'] },
{ id: 'pilchardrow', t: 'Pilchard Row', cat: ['Places'], box: [['Kind', 'A street of fishermen\'s cottages'], ['Appears in', '[[ch_wreckers]]']], sum: "Two fishermen's cottages facing each other across a lane, with gardens behind them in drystone walls, and a lugger lying beached on its side across the middle: the cover everyone fights over.", secs: [
  { h: '', p: [ "The families who lived there left after the winter of 1887. The lugger was theirs." ] },
], also: ['bondedquay', 'flensingyard'] },
{ id: 'flensingyard', t: 'The Flensing Yard', cat: ['Places'], box: [['Kind', 'A derelict whaling station'], ['Appears in', '[[ch_wreckers]]']], sum: "The yard of a derelict whaling station on a spit of sand, shut in by the backs of its boiling sheds, with a timber lookout tower in the middle to fight over.", secs: [
  { h: '', p: [ "The station closed the year the whales stopped coming into the skerries, which the old men date to 1841, the year the Light was lit. They do not say the two are connected. They do not say they are not." ] },
], also: ['bondedquay', 'pilchardrow'] },
{ id: 'chapelislet', t: 'Chapel Islet', cat: ['Places'], box: [['Kind', 'A small island with a roofless chapel'], ['Appears in', '[[ch_wreckers]], [[ch_fogrun]]']], sum: "A turf island with a roofless chapel, candles on its altar, a graveyard inside a low broken wall, and a ring of standing stones. Its candles were among the lights put out in 1889.", secs: [
  { h: '', p: [ "Several of the Gannet's crew are buried there, the ones the sea gave back. The wreckers who fought there in the early years stopped after a while. Nobody says why." ] },
], also: ['signalhead', 'haar'] },
{ id: 'signalhead', t: 'Signal Head', cat: ['Places'], box: [['Kind', 'A headland with a ruined signal tower'], ['Appears in', '[[ch_wreckers]], [[ch_fogrun]]']], sum: "Heather and crags along one shore, with a stair cut up them to a ruined round signal tower whose beacon was the first light put out in the haar of 1889.", secs: [
  { h: '', p: [ "The beacon was kept by the coastguard to answer the Light. It is lit again now." ] },
], also: ['chapelislet', 'haar'] },
{ id: 'harbour', t: 'The harbour', cat: ['Places'], box: [['Marked by', 'A red and a green pier lamp'], ['Appears in', '[[ch_voyages]]']], sum: "The harbour under Skerry Light, the end of every voyage. Ships steer in between its red and green pier lamps.", secs: [
  { h: '', p: [ "Masters learnt in 1888 to be sure the lamps were the real ones: the old [[wreckerslights|wreckers' lights]] are a red and a green lamp too." ] },
], also: ['wreckerslights', 'ch_voyages'] },

// ---------------- the seas ----------------
{ id: 'sixseas', t: 'The six seas', cat: ['Places', 'Events'], box: [['First noticed', '15 December 1887'], ['Counted', '2 April 1888'], ['Order', 'Skerry Light, the Frozen Fjord, the Ember Isles, the Coral Lagoon, the Barrow Shore, the Crystal Shoals']], sum: "After the wreck of the Gannet the sea stopped being one sea. The keeper counted six, and found they came round in turn, as regular as the lamp. The only things that never change, he wrote, are the light, the shark in his shoes, and her.", secs: [
  { h: 'The six', p: [
    "<b>Skerry Light</b>, the sea as it was. <b>The Frozen Fjord:</b> the sea frozen to the horizon, with icebergs for rocks and white mountains behind the headland, though there are no mountains here. <b>The Ember Isles:</b> the hills burning red, the rocks lava-veined and warm to the touch. <b>The Coral Lagoon:</b> warm green water, glowing wakes, palm trees on the cliffs, in January. <b>The Barrow Shore:</b> fog, and a churchyard on the cliff, and gravestones in the bay with names cut in them, some of them the Gannet's crew. <b>The Crystal Shoals:</b> rocks of purple glass, lit from inside, that sing back when the bell rings.",
  ]},
  { h: 'The far seas', p: [
    "About one night in twenty a ship goes further: to [[nether|the Nether]], [[winedark|the Wine-Dark Sea]], [[between|the Places In Between]], [[backrooms|the yellow rooms]] or [[opensky|the open sky]]. And once, a ship came the other way: [[ironship|the iron ship]].",
  ]},
], also: ['nether', 'winedark', 'between'] },
{ id: 'nether', t: 'The Nether', cat: ['Places'], box: [['Kind', 'A far sea'], ['Way in', 'A ring of black stone standing in the water'], ['First account', '19 April 1888, the mate of [[wren]]'], ['Dwellers', 'The Cinder Kite, the Slag Wader, the Furnace Moth']], sum: "A sea of lava under a roof of red rock, with burning rivers pouring down from it, reached through a ring of black stone standing in the water. Maren is not there. Even she will not follow a ship into that.", secs: [
  { h: 'What lives there', p: [
    "<b>The Cinder Kite</b>, a sail that spits fire; a flare drives it off. <b>The Slag Wader</b>, a man of slag; ring the bell before he reaches the bow. <b>The Furnace Moth</b>, as big as a topsail, which settles on a ship's lantern unless a flare gives it something brighter.",
  ]},
  { h: 'In the log', p: [ "Written in the margin, in a hand not the keeper's: <i>The light was there too, burning red. It always comes with you.</i>" ] },
], also: ['sixseas', 'winedark'] },
{ id: 'winedark', t: 'The Wine-Dark Sea', cat: ['Places'], box: [['Kind', 'A far sea'], ['First account', '6 May 1888'], ['Dwellers', 'The Sirens, Charybdis, the Cyclops'], ['Source', 'The [[schoolmaster|schoolmaster\'s]] book']], sum: "The sea of the oldest story there is: warm wind, a golden moon, white temples on the headlands and shooting stars, and singing from a rock in the bay.", secs: [
  { h: 'What lives there', p: [
    "<b>The Sirens</b>, whose song drags the helm to their rock; the bell drowns it out. <b>Charybdis</b>, a whirlpool that opens on your course; sail hard round it. <b>The Cyclops</b>, who throws rocks; a flare in his eye blinds him. The Solan rang her bell through the singing and lived.",
  ]},
], also: ['schoolmaster', 'sixseas'] },
{ id: 'between', t: 'The Places In Between', cat: ['Places'], box: [['Kind', 'A far sea'], ['First account', '30 May 1888, [[pascoe|Old Pascoe]]'], ['Dwellers', 'The Doors, the Echo, the Sleeper']], sum: "A glassy sea stuck at dusk, with doors and staircases standing in the water and going up into the clouds. Pascoe went out at dusk and came back three days later with a day's beard.", secs: [
  { h: 'What lives there', p: [
    "<b>The Doors:</b> the dark ones send you back, the lit one sends you on. <b>The Echo:</b> a pale copy of your own ship, sailing straight at you and steering the mirror of how you steer. <b>The Sleeper:</b> a face under the water. When the water over it brightens, ring the bell before its eyes open.",
  ]},
  { h: 'In the log', p: [ "The page is blank but for one line, written very carefully: <i>the lit door, not the dark ones. Keep the bell ready for the face. It is still asleep. Do not wake it.</i>" ] },
], also: ['pascoe', 'backrooms'] },
{ id: 'backrooms', t: 'The yellow rooms', cat: ['Places'], box: [['Also called', 'The Backrooms'], ['Kind', 'A far sea, with walls'], ['First account', '21 June 1888'], ['Way out', 'A green sign'], ['Dweller', '[[stowaway|The Stowaway]]']], sum: "Twice in 1888 ships came in out of yellow rooms: wet carpet under the keel, the hum of lamps nobody had heard before, every room like the last. The lights go out, and the sea comes back with walls.", secs: [
  { h: '', p: [
    "[[plimsoll]] led them out to a green sign. Asked where the rooms are, he only looked at the lamp. The master of [[wren]] sailed in more than once, and wrote that something smiled at him from the bowsprit there and said it could help. He did not let it.",
  ] },
], also: ['stowaway', 'verity', 'between'] },
{ id: 'opensky', t: 'The open sky', cat: ['Places'], box: [['Kind', 'Not a sea at all'], ['Way in', 'Unknown'], ['Dwellers', 'Storm clouds, and petrels']], sum: "One page of the log, in a different hand and in pencil, comes from someone who flew in from the clouds with no keel under them, the lamp turning far below like a coin in a well.", secs: [
  { h: '', p: [ "Stacks of storm cloud as tall as cathedrals with lightning in them, and birds at the flier's height. [[plimsoll]] was walking on the cloud tops, and led them down between the runway lamps. Nobody at the Light knows what a runway is. See [[ironship|the iron ship]] for the other visitor from a later year." ] },
], also: ['ironship', 'plimsoll'] },

// ---------------- ships ----------------
{ id: 'gannet', t: 'The Gannet', cat: ['Ships'], box: [['Rig', 'Brig'], ['Master', '[[crane|Absalom Crane]]'], ['Lost', '14 December 1887, on the Skerries, with all hands'], ['Rose', '14 December 1888'], ['Figurehead', '[[knock]]'], ['Appears in', '[[ch_voyages]], [[ch_gannetswake]]']], sum: "The brig whose loss began everything. She was coming in under the cliffs on the night the lamp failed, and broke up on the skerries with all hands. A year to the night later, she rose again.", secs: [
  { h: 'The wreck', p: [
    "See [[wreck1887|the Night of the Gannet]]. Her bell was heard ringing as she went, and the Wrackhaven men found her spars on the rocks at first light. Her cabin boy's blue shoes were next seen on [[plimsoll]].",
  ]},
  { h: 'The rising', p: [
    "On 14 December 1888 she came back up out of the sea about a mile out, inside a ring of her own old spars, her bell ringing. Below decks: the gun deck with its cannons, the hold with seawater round the ballast, the flooded cable tier, the forecastle, and the captain's cabin aft, locked with three keys. See [[ch_gannetswake]].",
  ]},
  { h: 'Her crew', p: [ "Every one of them is still out there. See [[drowned|the drowned]], [[bosun|the Bosun]] and [[crane|Captain Crane]]." ] },
], also: ['wreck1887', 'crane', 'knock'] },
{ id: 'wren', t: 'The Wren', cat: ['Ships'], box: [['Rig', 'Schooner'], ['Known for', 'The first ship Plimsoll brought in'], ['Appears in', '[[log|The keeper\'s log]]']], sum: "The schooner that came through the skerries on 9 January 1888 without a scratch, with a shark in shoes walking ahead of her the whole way. Her hands named him Plimsoll.", secs: [
  { h: '', p: [ "She went on to see more of the far seas than any other ship in the log: her mate came back from [[nether|the Nether]], and her master sailed into [[backrooms|the yellow rooms]] more than once." ] },
], also: ['plimsoll', 'nether'] },
{ id: 'ironship', t: 'The iron ship', cat: ['Ships'], box: [['Rig', 'None'], ['Arrived', '12 August 1888'], ['From', 'A year the keeper would not write down'], ['Known to the boats as', 'The Carrier']], sum: "A ship with no sails at all: iron, longer than the harbour, flat as a table on top and lit like a town. Things flew off her deck with a roar and swept the water with lights.", secs: [
  { h: '', p: [ "Her crew spoke of a year the keeper would not write down. Plimsoll walked ahead of her too. She proved, if proof was needed, that the sea had come loose in time as well as place, and in [[ch_reach]] her people were not the only ones from later years." ] },
], also: ['boats', 'opensky'] },
{ id: 'cutter', t: "The keeper's cutter", cat: ['Ships'], box: [['Kind', 'A small cutter'], ['Berth', 'The foot of [[skerrylight]]'], ['Appears in', '[[ch_gannetswake]], [[ch_fogrun]], [[ch_fbsea]]']], sum: "The Light's own boat, kept at the foot of the tower. The keeper sent her out after the Gannet in 1888, onto the Wide Water and into the haar in 1889, each time with a crew of whoever would go.", secs: [
  { h: '', p: [ "She has a wheel, a ship's bell at the mast, a flare locker aft, and since 1889 a chart table on deck. She has been holed more times than anyone has counted, and patched every time. She has never been slowed down." ] },
], also: ['ch_fogrun', 'ch_gannetswake', 'bell'] },
// [fbsea]
{ id: 'blacksloops', t: "The Mooncussers' black sloops", cat: ['Ships', 'Factions'], box: [['Kind', 'Fore-and-aft sloops, tarred black'], ['Show', 'No lights at all'], ['Crew', 'Never taken alive'], ['Appears in', '[[ch_fbsea]]']], sum: "Black sloops that sail the Wide Water without a lamp between them, after the same salvage the freebooters are. They chase what they see, fire broadsides into it, and send the drowned over its rail. Sink one and whatever it had taken floats.", secs: [
  { h: 'Whose they are', p: [
    "Nobody aboard one has ever been taken alive. The men of Saltcote call them the Mooncussers' sloops, after [[mooncussers|the wreckers of the old days]], and say the hanged men came down out of their chains to go back to sea. Others say they are only wreckers who took the old name. They do not come near Saltcote's light.",
  ]},
], also: ['mooncussers', 'ch_fbsea', 'widewater'] },
{ id: 'boats', t: 'The boats of 1888', cat: ['Ships'], box: [['Kinds', 'Brig, cutter, barque, and one carrier']], sum: "The ships that sailed in under the Light in the year of the voyages. Most were brigs; a few were the quick cutters and the heavy barques, and one, impossibly, was an aircraft carrier.", secs: [
  { h: '', p: [
    "<b>The brig</b> takes four hits, and her carpenter patches a plank as she goes. <b>The cutter</b> is quick and takes two. <b>The barque</b> is heavy, takes five, and has a bow gun that blows apart a rock just ahead of her. <b>The carrier</b> is [[ironship|the iron ship]], whose floodlights reach far and whose scout jet lights the rocks along her course.",
    "Wrecks named in the harbour books that year include the Brae Lass, the Kittiwake, the Morning Star, the Ellen Rose, the Solan, the Fair Isle and the Jessie Ann. Not all of them were lost; some only lost their names to the rocks, as the saying went.",
  ] },
], also: ['ironship', 'crates'] },

// ---------------- factions ----------------
{ id: 'wreckers', t: 'The wreckers', cat: ['Factions'], box: [['Trade', 'Salvage, by any means'], ['Since', 'Before records'], ['Appears in', '[[ch_wreckers]]']], sum: "The salvage men of the Skerries. Their grandfathers lured ships onto the rocks with false lights. They only wait for the rocks to do it, now, and fight one another over what comes ashore.", secs: [
  { h: '', p: [
    "They go ashore on dark nights with a pepperbox and a lantern. Some wear outfits from the tailor's crates, some an admiral's coat that nobody remembers earning. Their law is simple: what is on the shore at dawn belongs to whoever is standing. See [[ch_wreckers]], [[mooncussers]] and [[wreckerslights]].",
  ] },
], also: ['mooncussers', 'ch_wreckers'] },
{ id: 'mooncussers', t: 'The Mooncussers', cat: ['Factions'], box: [['Trade', 'Wrecking with false lights'], ['Active', '1600s to 1700s'], ['Fate', 'Hanged in chains, and came back']], sum: "The wreckers of the old days, who cursed the moon because a moonlit night showed ships the rocks. They hung false lights on poles to draw ships in, and the fort's governors hung them in chains on the sea wall for it.", secs: [
  { h: '', p: [ "Their lamps are the [[wreckerslights|wreckers' lights]] still seen over the rocks. Those that came back are [[mooncusser|the Mooncusser]]. Their name went to sea again in 1889 with [[blacksloops|the black sloops]] of the Wide Water." ] },
], also: ['mooncusser', 'wreckerslights', 'blacksloops'] },
{ id: 'salvors', t: 'The Northern Salvage Company', cat: ['Factions'], box: [['Trade', 'Salvage diving'], ['Came for', 'The Gannet\'s cargo'], ['Lost', 'Spring 1888, all its divers']], sum: "A salvage firm that sent a steam tender and a team of helmet divers to the Gannet in the spring of 1888. The divers went down. Their air lines came up cut.", secs: [
  { h: '', p: [ "The tender sailed home with nobody to pump for. The brass helmets were seen next on [[diver|the Divers]]." ] },
], also: ['diver', 'gannet'] },
// [fbsea] the three companies of Saltcote
{ id: 'giltgull', t: 'Gilt & Gull Company', cat: ['Factions'], box: [['Trade', 'Hoard charts, and what is under them'], ['Office', 'The voyage board, [[saltcote]]'], ['Appears in', '[[ch_fbsea]]']], sum: "A firm of chart-dealers who buy every scrap of paper that comes out of the wrecks with an X on it, sort the true charts from the false, and send freebooters out to dig. They keep a fair share of what comes up, and pay well for the rest.", secs: [
  { h: '', p: [ "Their charts name an island and draw its landmarks round the X. The crews say a Gilt & Gull chart is true one time in three, and that the other two times there is usually something worse than nothing under it." ] },
], also: ['bellmen', 'tidewrights', 'saltcote'] },
{ id: 'bellmen', t: 'The Bellmen', cat: ['Factions'], box: [['Trade', 'Bounties on the drowned captains'], ['Pay for', 'Each captain\'s bell'], ['Appears in', '[[ch_fbsea]]']], sum: "An old guild of bell-founders and parish clerks who keep a roll of every ship lost on the coast. When one of her drowned captains comes ashore on the Wide Water and holds a camp there, the Bellmen post a bounty on him, payable on his ship's bell.", secs: [
  { h: '', p: [ "Each bell brought home is rung once on the quay and struck off the roll. [[bell|A rung bell]] is the first answer to almost everything on this coast, and the Bellmen believe a drowned captain parted from his bell stays down." ] },
], also: ['giltgull', 'tidewrights', 'bell'] },
{ id: 'tidewrights', t: 'The Tidewrights', cat: ['Factions'], box: [['Trade', 'Salvage, from the wrecks at sea'], ['Successors to', '[[salvors|The Northern Salvage Company]]'], ['Appears in', '[[ch_fbsea]]']], sum: "Salvors who mark the wrecks lying in open water and pay for crates brought up from them. They took on the work the Northern Salvage Company gave up after its divers were lost, and do it without helmets: one breath, down, and up again.", secs: [
  { h: '', p: [ "They keep no divers of their own. They say it is cheaper to pay freebooters by the crate, and nobody has ever argued the point with them." ] },
], also: ['giltgull', 'bellmen', 'salvors'] },
{ id: 'callings', t: 'The three callings', cat: ['Factions'], box: [['Callings', 'Mercenary, Brute, Apothecary'], ['Appears in', '[[ch_gannetswake]], [[ch_marensend]], [[ch_fogrun]]']], sum: "The three kinds of fighter who went out on the raids and the runs. Every crew that went after the Gannet, down the Swallow or into the haar was made of them.", secs: [
  { h: '', p: [
    "<b>The Mercenary</b> is quick and sharp-eyed, hired guns off the merchant ships, with an avtomat and a longarm. <b>The Brute</b> is hard to stop: dockers, whalers and boarding men, with a blunderbuss and a boarding axe, who come down from a jump hard enough to shake the ground. <b>The Apothecary</b> keeps the others standing, trained in the old way of [[apothecaries|the fort's apothecaries]], with a duck's-foot pistol and a flare pistol, and drifts down from a height like a gull.",
  ] },
], also: ['apothecaries', 'ch_marensend'] },
{ id: 'reachwars', t: 'The Reach Wars', cat: ['Factions', 'Events'], box: [['When', 'The years after the sea came back'], ['Who', 'Every nation of the Reach'], ['Prize', 'The rock of [[skerrylight]]']], sum: "The long, many-sided war for the islands round the Light, told in [[ch_reach]]. It has no single beginning and has never had a single end: a nation that takes six tenths of the Reach holds it only until the next landing.", secs: [
  { h: '', p: [ "The nations build cities and railroads, harbours, watchtowers and beacons, and send fire-ships against each other. Pacts are sworn and broken. Each nation flies its own banner, and every nation remembers an oath-breaker." ] },
], also: ['ch_reach'] },

// ---------------- events ----------------
{ id: 'wreck1887', t: 'The Night of the Gannet', cat: ['Events'], img: 'maren', box: [['Date', '14 December 1887'], ['Place', 'The Skerries, under [[skerrylight]]'], ['Lost', 'The brig [[gannet|Gannet]], with all hands; [[maren]]'], ['Cause', 'The lamp failed in the second hour']], sum: "The night the lamp at Skerry Light failed, the brig Gannet was lost with all hands, and Maren Holm rowed out to warn her and did not come back. Everything in this compendium follows from it.", secs: [
  { h: 'The night', p: [
    "The lamp failed in the second hour, and the log has never said why. The Gannet was coming in under the cliffs with no light to steer by. Maren took the skiff and a hand lantern out towards her. The keeper wrote: <i>I could not stop her.</i>",
    "In the morning the Gannet was on the skerries with all hands, and the skiff came ashore at the harbour steps, empty, with the lantern still lit. That night the sea froze from the steps to the horizon.",
  ]},
  { h: 'What followed', p: [ "[[plimsoll]] in January, Maren on the water, [[knock]], [[verity]], the [[sixseas|six seas]], and the rest: see the [[timeline]]." ] },
], also: ['timeline', 'gannet', 'maren'] },

// ---------------- objects ----------------
{ id: 'log', t: "The keeper's log", cat: ['Objects'], box: [['Author', '[[keeper|The keeper Holm]]'], ['Covers', '14 December 1887 to 14 December 1888, and undated pages'], ['Read', 'One page for each harbour reached']], sum: "The station's log, kept by the keeper through the year after the wreck. It is the oldest and most trusted source for everything in this compendium, and it was written one harbour at a time.", secs: [
  { h: 'The pages', p: [
    "It runs from the night the lamp failed, through Plimsoll, Maren, Knock, Verity and the six seas, to the night a year later when the keeper stood on the gallery until dawn, and she looked up at him. Pages in other hands are pasted or written into it: the [[nether|Nether]] in a margin, the [[schoolmaster|schoolmaster's]] page, a pencilled page from [[opensky|the sky]], and one almost blank page from [[between|the Places In Between]].",
  ]},
  { h: 'The last page', p: [ "Undated: <i>If you are reading this, keep Plimsoll close and keep the bell ready. Whatever sea you wake on, the light is still turning and she is still rowing out to the Gannet. She will take any ship that lets her come aboard.</i>" ] },
], also: ['keeper', 'timeline'] },
{ id: 'marenslantern', t: "Maren's Lantern", cat: ['Objects'], box: [['Owner', '[[maren]]'], ['Kind', 'A hand lantern'], ['Lit since', '14 December 1887'], ['Appears in', '[[ch_marensend]]']], sum: "The hand lantern Maren rowed out with on the night of the wreck. Her skiff came back without her, but the lantern was still lit, and it has never gone out.", secs: [
  { h: '', p: [ "In 1890 the raiders carried it down [[swallow|the Swallow]], where it was the only thing that would light the braziers of the Deep Path. It would not go through the door at the end. Where it is now, nobody will say." ] },
], also: ['maren', 'swallow'] },
{ id: 'bell', t: 'The bell', cat: ['Objects'], box: [['Drives back', '[[maren]], [[drowned]]'], ['Freezes', '[[knock]]'], ['Also', 'Wakes nothing that is asleep, if rung in time']], sum: "Every ship's bell, the Light's fog bell, the cutter's bell at the mast, the old bell in Wrackhaven's belfry. On this coast a bell is the first answer to almost everything.", secs: [
  { h: '', p: [
    "A rung bell drives Maren back and sinks the drowned near it. It freezes Knock, shatters the Echo, drowns out the Sirens and keeps the Sleeper asleep. On the wreckers' islands it shows you to everyone, and them to you. In the Reach, a nation that rings its bell holds its ground, dearly, for a while. The keeper rang the Light's as hard as he could on 3 February 1888, and she was gone.",
    "Only a few things do not care for it at all, and [[verity]] is one of them.",
  ] },
], also: ['flare', 'maren'] },
{ id: 'flare', t: 'Flares', cat: ['Objects'], box: [['Lights', 'Everything for some hundreds of metres, for a few seconds'], ['Drives off', '[[verity]], the Cinder Kite, the Furnace Moth']], sum: "Signal flares, fired from a ship's locker or by hand. They light everything round them for everyone, show up rocks the beam has passed, and are the one thing [[verity]] runs from.", secs: [
  { h: '', p: [ "In the haar and on the Gannet's quarterdeck, when the beam could not reach, crews fought by flare alone, taking turns at the lockers." ] },
], also: ['bell', 'verity'] },
{ id: 'fresnellamp', t: 'The Fresnel Lamp', cat: ['Objects'], box: [['Kind', 'A signal lantern with a lighthouse lens'], ['Maker', '[[lampwright|The Lampwright]]'], ['Found in', '[[wreckchest|The wreck chest]]'], ['Appears in', '[[ch_lastlight]]']], sum: "A signal lantern with a piece of the Light's own lens in it, which throws a beam of the Light's fire. Whatever stands in the beam burns, and throws a spark to the next.", secs: [
  { h: '', p: [ "The Lampwright made it from an offcut of the great lens in 1841. It was lost with the station's stores in the winter of 1888 and turns up only in [[wreckchest|the wreck chest]], and never on any wall." ] },
], also: ['lampwright', 'wreckchest'] },
{ id: 'wreckchest', t: 'The wreck chest', cat: ['Objects'], box: [['Kind', 'A sea chest from a wreck'], ['Holds', 'A weapon, never the same twice'], ['Moved by', 'The gulls']], sum: "A sea chest off one of the wrecks, which stands somewhere in the keeper's station on any night of the siege with a pale shaft of light over it. Pay, open it, and there is a weapon in it, never one you are already carrying.", secs: [
  { h: 'The gulls', p: [ "After a few goes in one place, a gull takes it, and it turns up somewhere else. The defenders say the gulls are the only honest salvors left on the coast: they always give the money back." ] },
  { h: 'In the haar', p: [ "On the wreck islands of [[ch_fogrun]], every wreck has a chest of its own." ] },
], also: ['fresnellamp', 'station'] },
{ id: 'cutlassplimsoll', t: 'The Cutlasses of Plimsoll', cat: ['Objects'], box: [['Kind', 'Heavy cutlasses'], ['Blade', 'Sea-blue, set with a shark\'s teeth'], ['Grip', 'Sharkskin'], ['Carried by', '[[diver|The Divers]] under the sea bed'], ['Appears in', '[[ch_marensend]]']], sum: "Heavy cutlasses with sea-blue blades, a row of a shark's teeth set along the edge and a grip of sharkskin. Divers carried them up out of the Black Water in 1890, and only they could hurt the helmeted Divers on the far bank.", secs: [
  { h: 'Whose teeth', p: [ "Plimsoll's, says everyone, though nobody has asked him. Sharks shed their teeth all their lives. Where the blades were forged, and by whom, is not known; they glow faintly blue where they lie." ] },
], also: ['plimsoll', 'blackwater', 'diver'] },
{ id: 'wreckerslights', t: "The wreckers' lights", cat: ['Objects'], box: [['Kind', 'False lights'], ['Colours', 'Red and green, like the pier lamps']], sum: "A red and a green lamp, like the harbour's pier lamps, hung over a cluster of rocks to lure ships in. They are the old [[mooncussers|Mooncussers']] trick, and they still burn on the water.", secs: [
  { h: '', p: [ "The lighthouse beam shows them for what they are: they go dark when it passes over them, and snuff out for good when a ship gets close. Nobody has ever found who lights them." ] },
], also: ['mooncussers', 'harbour'] },
{ id: 'crates', t: 'The drifting crates', cat: ['Objects'], box: [['First seen', '30 October 1888'], ['Marked by', 'A little lamp on each'], ['Set adrift by', 'Unknown']], sum: "Crates floating in the water, each with its own little lamp. The boats that haul them aboard come in painted every colour of the sea: ice, ember, coral, gold.", secs: [
  { h: '', p: [ "The keeper did not know who set them adrift. <i>Whoever it is, they want us to keep sailing.</i> In later years the same crates turned up on the wreckers' islands, at the station and in the Reach, full of coats, gun finishes and banners. Nobody has caught anyone putting one in the water." ] },
], also: ['boats', 'log'] },
];
