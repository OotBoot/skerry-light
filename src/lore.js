'use strict';
// The Skerry Compendium: the lore book on the main menu, written like a wiki (src/loreui.js draws it).
// It ties every game into one history: the voyages (Skerry Light), Wreckers' Night, Drowned Reach, Keeper's Last Light,
// the two raids (Maren's End, The Gannet's Wake), The Chronicle of the Light (its people, places, nights and five eras), Fog Run, Freebooters' Sea [fbsea], The Original (as The Early Watches),
// Skerry Links and Skerry Clash (with the Race, the Threefold Skerry, the triple draft and the towers). Where the game itself says nothing, the gaps are filled
// with lore that fits; the keeper's log (SK.LOG in config.js) is the spine and is never contradicted.
// An article: { id, t: title, cat: [categories], img: a picture key (see loreImg in loreui.js), gal: visitors' picture keys for a gallery, box: [[label, value], ...]
//   (the infobox), sum: the opening paragraph, secs: [{ h: heading, p: [paragraphs] }], also: [ids for See also] }.
// In any text, [[id]] links to an article by its title and [[id|words]] links with other words.
// Keep secrets out entirely: no Easter egg, nothing hidden in any map, no secret bosses or hidden buttons, not even a hint.
var LORE_CATS = [
  { k: 'Chronicles', d: 'The thirteen great tales of the Skerries, each told by one of the games.' },
  { k: 'Characters', d: 'People, and things that were once people.' },
  { k: 'Creatures', d: 'What walks, swims, flies or crawls in the waters round the Light.' },
  { k: 'Places', d: 'Rocks, shores, buildings and the far seas.' },
  { k: 'Factions', d: 'Crews, orders, guilds and nations.' },
  { k: 'Events', d: 'Wrecks, sieges, wars and the nights people still talk about.' },
  { k: 'Ships', d: 'Vessels lost, risen, and still sailing.' },
  { k: 'Objects', d: 'Lamps, bells, blades and other things worth carrying.' },
  { k: 'Eras', d: 'The ages of the coast, from the fire on Lantern Rock to the years after.' },
];
var LORE = [
// ---------------- the front matter ----------------
{ id: 'timeline', t: 'Timeline of the Skerries', cat: ['Events'], sum: "A single chronology of everything this compendium records, from the first fire on [[lanternrock]] to [[reachwars]]. Dates from [[log|the keeper's log]] are exact. Anything earlier comes from parish records, harbour books and the stories of the boats, and is marked with a c. where nobody can agree. The whole of it is told once from end to end in [[ch_chronicle]], whose five acts are the five [[era_before|eras]] of the coast.", secs: [
  { h: 'Before the Light', p: [
    "<b>c. 1200s.</b> A fire is kept on [[lanternrock]], the outermost rock of the Skerries, by a family of fire-keepers. It is the first light on this coast. Their last keeper is remembered only as [[fogkeeper|the Fog-Keeper]]. The oldest night anyone remembers is theirs: [[firstfire|the First Fire]].",
    "<b>c. 1597.</b> A Spanish squadron, blown north after the Armada years, winters on the headland across the water and does not leave. Its garrison builds the sea fort later called [[seafort|Maren's End]], with its [[apothecaries|three apothecaries]] and the Chapel of Our Lady of the Sea.",
    "<b>1600s to 1700s.</b> The wrecking years. [[mooncussers]] hang false lights on the rocks to draw ships in. The fort's governors hang the ones they catch in chains on the sea wall. [[wreckers]] carry on the trade more quietly. The best remembered night is [[jagohanging|the hanging of Black Jago]], who went over the sea wall with his light: see [[wreckingyears]].",
    "<b>c. 1790.</b> [[wrackhaven]] is a busy fishing town, with its town hall on the Square and the inn called the Drowned Man.",
  ]},
  { h: 'The Light', p: [
    "<b>1841.</b> [[skerrylight]] is built on its rock and lit. Its great lens is set by [[lampwright|the Lampwright]]. The fire on Lantern Rock is put out for good, and its keeper with it: see [[lighting1841]].",
    "<b>c. 1879.</b> The keeper Holm comes to the Light, with his wife [[maren]]. In his early years he swings the beam by hand to show each ship the rocks: see [[ch_original]].",
    "<b>c. 1883.</b> The keepers lay out nine holes of golf along the headland: see [[ch_links]].",
    "<b>c. 1885.</b> The harbour crews start playing their ball game in the Harbour Pool: see [[ch_league]].",
    "<b>14 December 1887.</b> [[wreck1887|The Night of the Gannet]]. The lamp fails in the second hour. Maren rows out with a hand lantern to warn the brig [[gannet|Gannet]]. The brig breaks up on the skerries with all hands. The skiff comes back empty, [[marenslantern|her lantern]] still lit.",
    "<b>15 December 1887.</b> The sea freezes from the harbour steps to the horizon. It is the first of [[sixseas|the six seas]].",
  ]},
  { h: 'The strange year, 1888', p: [
    "<b>2 January.</b> [[plimsoll]] walks up out of the surf in the cabin boy's blue shoes.",
    "<b>9 January.</b> The schooner [[wren|Wren]] comes in through the skerries with Plimsoll walking ahead. The voyages of 1888 begin: see [[wrencomes]] and [[ch_voyages]].",
    "<b>20 January.</b> Fishermen first see Maren standing on the water.",
    "<b>11 February.</b> The Gannet's figurehead, [[knock]], is gone from the wreck.",
    "<b>28 February.</b> The first account of [[verity]], from [[jory|a hand]] off [[kittiwake|the Kittiwake]], lost that night on the Near Skerries.",
    "<b>14 March.</b> [[visitors|The visitors]] begin to turn up on the water.",
    "<b>Spring.</b> The [[salvors|Northern Salvage Company]] sends divers down to the Gannet. They do not come up. Their helmets are seen again later, on [[diver|the Divers]].",
    "<b>19 April to 21 June.</b> Ships come back from [[nether|the Nether]], [[winedark|the Wine-Dark Sea]], [[between|the Places In Between]] and [[backrooms|the yellow rooms]].",
    "<b>12 August.</b> [[ironship|The iron ship]] comes into the harbour from a year the keeper will not write down.",
    "<b>30 October.</b> [[crates|The drifting crates]] appear, each with its own little lamp.",
    "<b>All year.</b> On the nights the lamp is dark, [[wreckers]] go ashore on the islands and fight over what the sea has left: see [[ch_wreckers]]. On one of them the Receiver of Wreck brings the Gannet's sea chests home for the widows: see [[seachests]].",
    "<b>14 December 1888.</b> A year to the night. The Gannet's bell is heard off the Light. The keeper's cutter goes out, and the Gannet rises: see [[ch_gannetswake]].",
  ]},
  { h: 'After the Gannet', p: [
    "<b>Winter 1888 to 1889.</b> The drowned come up out of the sea for [[station|the keeper's station]] itself, night after night: see [[ch_lastlight]].",
    "<b>Spring and summer 1889.</b> The wrecks the Gannet brought up with her drift out past the Near Skerries onto [[widewater|the Wide Water]], and freebooters follow them from [[saltcote]]: see [[ch_fbsea]].",   // [fbsea]
        "<b>Autumn 1889.</b> [[haar|The haar]] closes in and the lights of the outer rocks go out one by one. The cutter goes out to light them again: see [[ch_fogrun]].",
    "<b>The Dry Night, 1890.</b> The sea round the Light drains away down [[swallow|the Swallow]]. Raiders go down after it with Maren's lantern: see [[ch_marensend]] and [[drynight]].",
    "<b>Winter 1891.</b> The sea comes up Fish Street in [[wrackhaven]] one night and does not go back. The town is left to the drowned, and the defenders of the station follow them there: see [[fallwrackhaven]].",
  ]},
  { h: 'The years after', p: [
    "<b>Undated.</b> The sea comes back, and with it the people of every sea and every year that ever sailed through the skerries. They settle the islands and go to war for them: see [[ch_reach]]. One night a crew of lamp-men with no nation behind them crosses at low water and lights the Light again: see [[relighting]].",
    "<b>Undated.</b> A second light is lit across the tidal race called [[race|the Race]], and its keepers begin to settle at every slack water whose light is the false one: see [[ch_clash]].",
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
// The Original (src/original.html), Skerry Links (src/golf*.js) and Skerry Clash (src/rl*.js)
{ id: 'ch_original', t: 'The Early Watches', cat: ['Chronicles', 'Events'], box: [['Told in', 'The Original'], ['When', 'c. 1879 to 1887'], ['Where', 'The lantern room of [[skerrylight]]'], ['Who', '[[keeper|The keeper Holm]]'], ['Tools', 'The beam, by hand, and [[bell|the fog bell]]'], ['Rule', 'Three ships lost in a night, and he starts again']], sum: "The first tale, from before anything went wrong. In his early years at the Light, before the lens had its clockwork right, the keeper Holm swung the beam round by hand, and showed each ship coming in the rocks she could not see. It is the tale the others are told against: the years when a keeper and his lamp were enough.", secs: [
  { h: 'Showing the rocks', p: [
    "Ships stood in from the open sea and from along the coast for [[harbour|the harbour]] under the cliffs, and the rocks lay between. A master knew the shore and the Light's own rock without being told, but the skerries had to be shown to him. While the beam was on his ship he could see by it, and he set down every rock it had shown him and steered round the lot. Left in the dark for long, he lost them all again, and came on as if the water were clear.",
    "So the keeper swung the beam from ship to ship all night, a few seconds on each, never long off any of them. The busier the night, the harder it was to keep every master's memory fresh at once.",
  ]},
  { h: 'The fog bell', p: [
    "When too many came in together, the keeper rang the fog bell. Every master who heard it shortened sail for a few seconds, and that bought him the time to reach them all. The bell had to be left to swing still before it could be rung again, which is why the station's bell rope is worn through in two places.",
  ]},
  { h: 'The keeper\'s rule', p: [
    "The traffic grew every night of those years: one more ship each night than the last, and more rocks with the shifting of the banks. The keeper made a rule for himself, which the log repeats on its flyleaf: <i>three lost in one night, and I begin again as if I had never kept a light.</i> He never wrote down how many times he began again. On 14 December 1887 there was only one ship, and he did not reach her: see [[wreck1887]].",
  ]},
], also: ['keeper', 'skerrylight', 'wreck1887'] },
{ id: 'ch_links', t: 'Skerry Links', cat: ['Chronicles', 'Places'], box: [['Told in', 'Skerry Links'], ['When', 'Still evenings, from c. 1883'], ['Where', 'The headland above [[harbour|the harbour]]'], ['Who', 'One to four players, taking turns'], ['Holes', 'Nine, par 36'], ['Laid out by', 'The keepers of [[skerrylight]]']], sum: "Nine holes of golf along the cliffs of the headland, laid out by the keepers in the years before the lamp failed. The round starts at midday on the inland holes, turns north along the cliff tops, and comes in by moonlight with the Light turning off the point. On a still evening you can still play it.", secs: [
  { h: 'The nine holes', p: [
    "<b>1. The Gate</b>, a dogleg right with a bunker in the corner. <b>2. The Long Road</b>, a par five with a creek across the fairway short of the green. <b>3. Down to the Cove</b>, running downhill to the left. <b>4. First Sight of the Sea</b>, a short four with the sea and a low cliff all down the right. <b>5. Cliff's Edge</b>, a par three along the cliff top. <b>6. The Climb</b>, a steep pull up to a green on the headland. <b>7. The Point</b>, a little par three to a tiny green with the sea on three sides. <b>8. The Chasm</b>, a second shot over a sea-filled gully. <b>9. Homeward Cliff</b>, a long four leaning towards the sea.",
    "The first three run south down the inland side and the other six come back north along the cliffs, each tee a little past the last green, so the whole course can be seen from most of it.",
  ]},
  { h: 'From the course', p: [
    "[[skerrylight]] stands off in sight of every hole, out on its rock or, from the inland holes, over a far hill. Its lamp is dark while the sun is up. From the sixth, where the sun sets, it turns once every ten seconds, and the keeper's cottage window is lit. Under the cliffs lies the harbour with its stone quay, its breakwater and its cottages, and ships come in past the Light all evening, swinging out round each of the skerries in turn.",
    "The round is always played into the night, and the last three holes by moonlight, which the keepers said kept the game honest: nobody could find a lost ball on the 8th in the dark, so nobody went looking.",
  ]},
  { h: 'Balls and clubs', p: [
    "The keepers played with whatever the coast gave them, and the habit stuck. The Chandler's Crate holds balls made from the stores of a ship's chandler, gull's eggs, buoys, net floats, sea glass, and some that glow or shimmer in flight. The Shipwright's Crate holds whole sets of clubs made from a ship's gear: oars, belaying pins, boat-hooks, harpoons, a narwhal's tusk, a kraken's arm. The finest of them are said to be <b>The Keeper's Beam</b>, with a little lighthouse for a head and its lamp lit, and <b>The Drowned Trident</b>. None of them plays better than any other. See [[crates]].",
  ]},
  { h: 'In the log', p: [ "[[log|The keeper's log]] never mentions the course. The station's coal book records twelve golf balls bought from a Wrackhaven chandler in 1884, and eleven of them lost by the end of that summer." ] },
], also: ['skerrylight', 'harbour', 'crates'] },
{ id: 'ch_league', t: 'Skerry League', cat: ['Chronicles', 'Places'], box: [['Told in', 'Skerry League'], ['When', 'Summer evenings, from c. 1885'], ['Where', 'The Harbour Pool, under the cliffs by [[harbour|the harbour]]'], ['Who', 'Two crews, Blue and Orange, one to three ships a side'], ['Played with', 'A great striped buoy'], ['Ships', 'Brigs, cutters, barques, and in later years a carrier']], sum: "A game the harbour crews made up between voyages: a walled basin of still water under the cliffs, a goal at each end with a little light behind it, and a great red and white buoy to knock into the other crew's goal with nothing but your own ship. Nobody is quite sure who played it first, and every crew says it was theirs.", secs: [
  { h: 'The Harbour Pool', p: [
    "The pool was built as a fitting-out basin for the harbour, a square of sea wall with a lamp every few yards along the top, and was never finished: the gates were never hung, and the cove's tide never quite empties it. The crews laid the two goals across its ends with spare spars and old net, and the harbour board, finding it could not stop them, put up two small lighthouses behind them and painted one blue and one orange.",
    "The buoy is a spent channel marker, striped red and white and big enough that a cutter has to put her shoulder into it. A hard knock lifts it clean out of the water.",
  ]},
  { h: 'The game', p: [
    "A match runs on the harbour clock for a few minutes. A goal rings the bell and sets the lighthouse behind it flashing, and both crews go back to their marks to start again. Level at the end and it goes on until somebody scores. The crews keep a Gale in a bottle, a burst of wind let loose from a cask on deck, and fill it again from the yellow gale buoys moored about the pool.",
  ]},
  { h: 'In the log', p: [ "[[log|The keeper's log]] never mentions the game, though the harbour board's minutes record the cost of two lighthouses, 'small, for the amusement of the crews', and of a great deal of new net." ] },
], also: ['harbour', 'ch_links', 'crates'] },
{ id: 'ch_clash', t: 'Skerry Clash', cat: ['Chronicles', 'Events'], box: [['Told in', 'Skerry Clash'], ['When', 'The years after, at every slack water'], ['Where', '[[race|The Race]], and [[threeskerry|the Threefold Skerry]]'], ['Who', '[[racekeepers|The keepers of the Race]]'], ['Champions', '[[maren]], [[plimsoll]], [[verity]]'], ['Fought with', '[[clashhands|Crews, crabs, birds and worse]], spells, and lamp oil'], ['Prize', 'The other keeper\'s [[greatlight|Great Light]]']], sum: "The tale of the rival lights. In the years after, a second light was lit on a rock across the tidal race from the first, and each keeper was sure the other's was the false one that puts ships on the reef. Since then they have settled it at every slack water, three minutes at a time, across the causeways the falling tide uncovers.", secs: [
  { h: 'Why they fight', p: [
    "The coast had learnt from [[mooncussers|the Mooncussers]] that a light is not to be trusted because it is a light. Two lights on two rocks, close enough to shout across, cannot both be honest, and ships cannot steer by both. Neither keeper will put theirs out. So each sends everything they can muster across the water to put out the other's.",
  ]},
  { h: 'Slack water', p: [
    "The fight lasts as long as the tide lets it: about three minutes while the two causeways stand dry. Every hand sent over costs lamp oil, which each keeper draws off their own store a little at a time, and in the last minute, as the tide begins to turn, the oil comes twice as fast. A keeper who fells one of the other's [[greatlight|Lamp Towers]] takes a crown, and the one who puts out the other's Great Light takes all three and the night with it. If the tide turns with the crowns level, they fight on for one more minute, and the next tower to fall settles it.",
  ]},
  { h: 'Who comes when called', p: [
    "Anyone on the coast who will cross for a keeper: mudlarks and deckhands, wrecker gangs and press gangs, harpooners, fishwives, the drowned, crabs of every size from shore crabs to the Crab King, and birds that go straight over the water. Even [[diver|the Diver]], [[mooncusser|the Mooncusser]] and [[keelback|the Keelback]] have been seen on the causeways. See [[clashhands]].",
    "The greatest of the coast have answered too. [[maren]] has crossed with her lantern, and [[plimsoll]] has walked the causeway for whichever keeper he thought was in the right. Even [[verity]] has been set down on a causeway, smiling and saying he wants to help, and on the Race, for once, the keeper who brought him swears he does. A keeper may have only one of them on a side.",
  ]},
  { h: 'The other ways of it', p: [
    "Some nights neither keeper brings their own hands, and they pick them on the spot: see [[tripledraft|the triple draft]]. And on the [[threeskerry|Threefold Skerry]], three keepers fight it out at once, every one for themselves.",
  ]},
], also: ['race', 'racekeepers', 'greatlight'] },

{ id: 'ch_chronicle', t: 'The Chronicle of the Light', cat: ['Chronicles', 'Events'], img: 'maren', box: [["Told in", "The Chronicle of the Light"], ["When", "c. 1200s to the years after"], ["Where", "Every rock, shore and sea in this compendium"], ["Who", "Whoever was there, one to four at a time"], ["Parts", "Fourteen tales, in five acts"]], sum: "The whole history of the Light, told once from end to end by the people who lived it: from the first fire on [[lanternrock]] to the night the Light was lit again in the middle of [[reachwars|the Reach Wars]]. It follows the [[timeline]] one key night at a time, and fills in a good deal that the other tales leave out.", secs: [
  { h: 'Act I: Before the Light', p: [
    "<b>The First Fire</b> (c. 1200s). A night of haar on Lantern Rock, when the fire-keeper and his daughter [[wenna]] kept their beacon high enough for a lost ship to see it, and fought off [[oldkeel|the Old Keel]] when it walked up out of the sea. See [[firstfire]].",
    "<b>The Mooncussers</b> (the 1600s). Soldiers of [[seafort|the sea fort]] under [[garrison|Sergeant Ybarra]] put out the false lights on the point, took [[jago|Black Jago]] alive, and saw him hanged in chains on the sea wall. Three nights later his gang came for him. See [[jagohanging]].",
  ]},
  { h: 'Act II: The Light', p: [
    "<b>Lighting the Light</b> (1841). [[lampwright|The Lampwright]] and his crew carried the great lens up the new tower and lit it, and the fire on Lantern Rock was put out for good. See [[lighting1841]].",
    "<b>The Night of the Gannet</b> (14 December 1887). Holm and [[maren]] held the beam on the brig as she came in, until the lamp failed. See [[wreck1887]].",
  ]},
  { h: 'Act III: The Strange Year', p: [
    "<b>The Wren Comes In</b> (2 and 9 January 1888). [[plimsoll]] walked up out of the surf, and a week later walked the schooner [[wren|Wren]] in through [[skerries|the Skerries]]. See [[wrencomes]].",
    "<b>The Kittiwake</b> (28 February 1888). The first account of [[verity]], told by [[jory|Jory Tregear]], the one hand who came home. See [[kittiwake]].",
    "<b>Wreckers' Night</b> (1888). [[receiver|The Receiver of Wreck]] and his men took the Gannet's sea chests off [[bondedquay|the Bonded Quay]] from under [[nell|Black Nell]]'s gang, for the widows. See [[seachests]].",
    "<b>The Gannet's Wake</b> (14 December 1888). A year to the night, [[cuttercrew|the cutter's crew]] followed Maren's lantern out to the risen brig and faced [[crane|Captain Crane]] on her deck. See [[ch_gannetswake]].",
  ]},
  { h: 'Act IV: After the Gannet', p: [
    "<b>Keeper's Last Light</b> (winter 1888 to 1889): the worst nights at [[station|the station]], the ninth night when the oil boat did not come, and the night [[mooncusser|the Mooncusser]] climbed to the gallery. <b>Freebooters' Sea</b> (spring 1889): a Gilt & Gull chart north to [[crowsnest|Crowsnest Rock]], and [[gallowsbird|the Gallows Bird]] on the way home. <b>Fog Run</b> (autumn 1889): the outer rocks lit again, and [[firestep|the Fire Step]] on Lantern Rock lit for the first time since 1841.",
    "<b>Maren's End</b> (the Dry Night, 1890): [[ruth|Ruth Carrow]]'s crew across [[drybed|the dry bed of the sea]] and up [[olddrain|the Old Drain]] to the fort. <b>The Fall of Wrackhaven</b> (winter 1891): the townsfolk brought to [[moothall|the Moot Hall]] as the sea came up Fish Street. See [[fallwrackhaven]].",
  ]},
  { h: 'Act V: The Years After', p: [
    "<b>The Drowned Reach</b>. [[wrenmate|The Wren's mate]] and a crew of lamp-men crossed the Reach at low water behind Plimsoll, took the Light's rock from [[emberisles|the Ember Isles]], and lit it. See [[relighting]].",
  ]},
  { h: 'How it is told', p: [
    "Each tale is told by those who were there, and [[log|the keeper's log]] carries the thread between them. Where the other tales show a night from one side, the Chronicle often shows it from another: the Night of the Gannet from the lantern room, the Dry Night with Ruth Carrow's crew, the Drowned Reach with the lamp-men rather than the nations. As the last page of the log says, the tales do not keep to their order, and the Chronicle ends where the history began, with Maren rowing out.",
    "Its five acts are the five ages of the coast: [[era_before]], [[era_light]], [[era_strange]], [[era_after]] and [[era_years]].",
  ]},
], also: ['timeline', 'log', 'ch_reach'] },

// ---------------- characters ----------------
{ id: 'maren', t: 'Maren Holm', cat: ['Characters', 'Creatures'], img: 'maren', box: [['Also called', 'The woman on the water, the keeper\'s wife'], ['Born', 'c. 1852'], ['Lost', '14 December 1887, off the Skerries'], ['Kin', 'The keeper Holm (husband)'], ['Carried', '[[marenslantern]]'], ['Weakness', '[[bell]], and [[plimsoll]]'], ['Appears in', '[[ch_voyages]], [[ch_gannetswake]], [[ch_marensend]], [[ch_clash]], [[ch_chronicle]]']], sum: "The keeper's wife at [[skerrylight]]. On the night the lamp failed she rowed out alone with a hand lantern to warn the brig [[gannet|Gannet]]. The Gannet broke up with all hands and her skiff came back empty. Since then she has stood on the water when the lamp turns, a little nearer every time.", secs: [
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
  { h: 'On the Race', p: [
    "In the years after, she has crossed the causeways of [[race|the Race]] for one keeper or the other, lantern in hand, its light reaching even the birds overhead. When she lets the sea-green light out of her, nothing can hurt her for a few seconds, and everything round her slows and drowns. Which keeper she favours, and why, nobody on either rock will say. See [[ch_clash]].",
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
{ id: 'plimsoll', t: 'Plimsoll', cat: ['Characters', 'Creatures'], img: 'plim', box: [['Kind', 'A shark, walking'], ['First seen', '2 January 1888, at dawn'], ['Wears', 'The blue shoes of the Gannet\'s cabin boy'], ['Named by', 'The hands of [[wren]]'], ['Known for', 'Walking ships through the deep water'], ['Appears in', '[[ch_voyages]], [[ch_gannetswake]], [[ch_fogrun]], [[ch_clash]], [[ch_chronicle]]']], sum: "A shark who walked up out of the surf the winter the Gannet was lost, wearing the blue shoes of her cabin boy. He knows the deep water through the skerries and walks ahead of ships to the harbour. [[maren]] will not go near him.", secs: [
  { h: 'First sighting', p: [
    "The keeper saw him first, standing on the sand at dawn, looking up at the Light. A week later the schooner [[wren|Wren]] came in without a scratch with him walking ahead on the water the whole way, and her hands named him for his shoes.",
  ]},
  { h: 'The guide', p: [
    "A ship that keeps up with him is covered, at any speed; a ship that falls behind he waits for only a few seconds. He sometimes snaps up a [[drowned|drowned sailor]] who wanders into his path. He has been seen walking the cloud tops of [[opensky|the open sky]] and leading ships out of [[backrooms|the yellow rooms]]. Asked where those rooms are, he only looked at the lamp.",
  ]},
  { h: 'The cabin boy', p: [
    "The cabin boy's name went down with the Gannet's articles. Whether Plimsoll is the boy, ate the boy, or simply liked the shoes is not something anyone has asked him. He sheds his teeth as sharks do, and some say [[cutlassplimsoll|the Cutlasses of Plimsoll]] are set with them.",
  ]},
  { h: 'On the Race', p: [
    "On [[race|the Race]] he walks the causeway for whichever keeper he thinks is in the right, quicker than any hand there. When he smells blood he lunges a long way onto the strongest thing near him, bites hard, and for a while strikes twice as fast. See [[ch_clash]].",
  ]},
], also: ['cutlassplimsoll', 'gannet', 'maren'] },
{ id: 'crane', t: 'Absalom Crane', cat: ['Characters'], box: [['Post', 'Master of the brig [[gannet|Gannet]]'], ['Lost', '14 December 1887'], ['Carries', 'A speaking trumpet and a boat hook'], ['Weakness', 'Light'], ['Appears in', '[[ch_gannetswake]], [[ch_chronicle]]']], sum: "Master of the brig Gannet when she broke up on the skerries, and the one who would not let her go. On the night she rose in 1888 he was waiting on her quarterdeck, tall and drowned in a rotted greatcoat and hat, sea-water running off him.", secs: [
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
{ id: 'pascoe', t: 'Old Pascoe', cat: ['Characters'], box: [['Trade', 'Fisherman, Wrackhaven'], ['Known for', 'Seeing things first'], ['Appears in', '[[log|The keeper\'s log]]']], sum: "A Wrackhaven fisherman, and the keeper's best source in 1888. He saw [[knock]] walking on the water before anyone else, came in with a plank stove in by a coconut, and once went out at dusk and came back three days later with a day's beard. He was in the Drowned Man the night [[fallwrackhaven|Wrackhaven fell]], and would not leave the bar until he had to.", secs: [
  { h: '', p: [
    "That last trip took him to [[between|the Places In Between]], where he saw doors in the water and a face asleep under it, and rang his bell to keep it asleep. He drank at the Drowned Man in [[wrackhaven]] for forty years.",
  ] },
], also: ['log', 'wrackhaven', 'between'] },
{ id: 'schoolmaster', t: 'The schoolmaster', cat: ['Characters'], box: [['Trade', 'Schoolmaster, Wrackhaven'], ['Known for', 'His book of old stories']], sum: "Wrackhaven's schoolmaster, who read the keeper the story the [[winedark|Wine-Dark Sea]] comes from. A page of his book is pasted into [[log|the log]], the ink run with salt. On the night [[fallwrackhaven|Wrackhaven fell]] he had sent the children up the hill road at dusk.", secs: [
  { h: '', p: [ "He told the keeper the story was older than the Bible. In the margin he had pencilled how the ships beat it: drown the singing with the bell, sail hard round the water that turns, and put a flare in the giant's eye." ] },
], also: ['winedark', 'log'] },
{ id: 'lampwright', t: 'The Lampwright', cat: ['Characters', 'Objects'], box: [['Real name', 'Unrecorded'], ['Made', 'The lens of [[skerrylight]], 1841'], ['Left behind', 'The Lampwright\'s Bench'], ['Appears in', '[[ch_lastlight]], [[ch_marensend]], [[ch_fogrun]], [[ch_chronicle]]']], sum: "The craftsman who ground and set the great lens of Skerry Light in 1841, and whose workbench still stands in [[station|the keeper's station]]. Anything worked over on it comes back the better for it, and nobody can say quite how.", secs: [
  { h: 'The bench', p: [
    "The bench was left in the Lamp-Wright's Store when the lens was finished, with his tools still on it. In the winter of 1888 the defenders of the station found that a gun left on it came back reforged, harder hitting and changed in its look, often with a trick of its own. A second bench turned up in Wrackhaven's town hall, and a third in the Governor's Rooms of [[seafort|the sea fort]], where it worked on the drowned but would not help against Maren.",
    "In Fog Run the cutter's crew found his sparks in the salvage, and took them for his blessing. The keepers of [[race|the Race]] dress their towers out of a crate that bears his name: see [[greatlight]].",
  ]},
  { h: 'The lens', p: [
    "He ground every prism of it himself, a year of grinding to a crate, and saw it carried up the tower and lit on one night in 1841: see [[lighting1841]]. In the years after, when the lamp-men climbed the ninety treads of the dark Light, they found him waiting in the lantern room with the glass clean and the wick trimmed, as though he had never left. He had never once seen it lit from the outside. See [[relighting]].",
  ]},
  { h: 'The Fresnel Lamp', p: [ "His own signal lantern, with a piece of the Light's lens in it, is [[fresnellamp|the Fresnel Lamp]]." ] },
], also: ['fresnellamp', 'skerrylight', 'station'] },
{ id: 'fogkeeper', t: 'The Fog-Keeper', cat: ['Characters', 'Creatures'], box: [['Post', 'Last keeper of the fire on [[lanternrock]]'], ['Lost', '1841, when his light was put out'], ['Carries', 'A cold lantern on a chain'], ['Weakness', 'Light'], ['Appears in', '[[ch_fogrun]], [[ch_chronicle]]']], sum: "The drowned keeper of an older, dead light, twice a man's height, with a lamp-glass for a face and fog pouring out of it. In 1889 he put out the lights of the outer rocks one by one, until the cutter's crew came for him on Lantern Rock.", secs: [
  { h: 'Who he was', p: [
    "His family kept the fire on [[lanternrock]] for six hundred years. When [[skerrylight]] was lit in 1841 the fire was no longer needed, and was put out. The Wrackhaven stories say he would not leave the rock, and kept the cold lamp polished until the sea took him. Nobody went out to look. He had watched the new lens lit from his rock that night, and said only: <i>There. You have no more need of me.</i> See [[lighting1841]].",
    "When the sea stopped being one sea, he came back with the fog, and began putting out every light that was not his.",
  ]},
  { h: 'On the rock', p: [
    "He could only be hurt in light: a lit brazier, a flare, or the Light's beam. His fog put the braziers out, and his lantern on its chain knocked men flat. At half his strength he climbed his tower and put out the beam itself. When he fell, his dead light came on at last and swept the fog off the sea. It counts, the crews say, as an island lit.",
  ]},
], also: ['lanternrock', 'haar', 'ch_fogrun'] },
{ id: 'verity', t: 'Verity', cat: ['Characters', 'Creatures'], img: 'verity', box: [['Kind', 'Unknown'], ['Looks like', 'A small yellow thing, round as a lamp glass, smiling'], ['First account', '28 February 1888, [[jory|a hand]] off [[kittiwake|the Kittiwake]]'], ['Says', 'That it wants to help'], ['Weakness', 'A [[flare]]'], ['Appears in', '[[ch_voyages]], [[ch_wreckers]], [[ch_clash]], [[ch_chronicle]]']], sum: "A small, round, smiling yellow thing that sits on decks and says it wants to help. The ships that let it stay do not come in. Its name, the Kittiwake's hand said, is Verity.", secs: [
  { h: 'At sea', p: [
    "He sits down small in a corner of the deck, facing whoever is at the helm. A flare in his face sends him rolling over the side. Shot, cut or rung at, he does not seem to notice. Nobody who has waited to find out what his help is like has come back to say.",
    "A page of the log from the yellow rooms says he smiled at a master from the bowsprit, and offered. <i>I did not let it.</i>",
  ]},
  { h: 'Ashore', p: [
    "On Wreckers' Night he comes ashore and sits down on the shingle in front of anyone with a flare left. Walking away does no good: look away and he is in front of you again. Any flare on the island sends him rolling into the dark. The wreckers count a man he gets as <i>helped</i>.",
  ]},
  { h: 'On the Race', p: [
    "The keepers of [[race|the Race]] count him among their champions, and he crosses the causeways like any other hand, saying as he is set down that he wants to help. Nothing slows him there. See [[ch_clash]].",
  ]},
  { h: 'At the fort', p: [
    "Some of those who fought at [[seafort|Maren's End]] swear that the small yellow light that hung over the water while Maren could not be hurt had his smile. What that means, if it is true, nobody has settled.",
  ]},
], also: ['visitors', 'flare', 'backrooms'] },
{ id: 'mooncusser', t: 'The Mooncusser', cat: ['Characters', 'Creatures'], box: [['Kind', 'A drowned wrecker, in chains'], ['Carries', 'A false light on a pole'], ['Appears in', '[[ch_lastlight]], [[ch_marensend]], [[ch_fogrun]], [[ch_chronicle]]']], sum: "A wrecker of the old days, hanged in chains on the sea wall and come back in them. He carries a false light on a pole, and when he lifts it and it swells, it blinds whoever looks at it and draws them in to him.", secs: [
  { h: '', p: [
    "The Mooncussers were wreckers who cursed the moon, because a moonlit night showed ships the rocks. See [[mooncussers]] for the trade. The ones the fort's governors caught were left to hang where ships could see them; the ones that came back keep the fort's [[apothecaries|apothecaries]] now, one to each.",
    "The coast holds that the first of them was [[jago|Black Jago]], master of the Mooncussers on the point, who went over the sea wall with his light three nights after he was hanged: see [[jagohanging]]. In the winter of 1888 he came up the T-head for the station and climbed to the lantern gallery itself, in his chains, and the keeper knew him.",
    "While he holds the light up he is open to a shot. Look away from it, or get behind something, until he lowers it.",
  ] },
], also: ['mooncussers', 'wreckerslights', 'apothecaries'] },

// [chronicle] the people of The Chronicle of the Light
{ id: 'wenna', t: 'Wenna', cat: ['Characters'], box: [["Post", "Daughter of the fire-keeper of [[lanternrock]]"], ["When", "c. 1200s"], ["Appears in", "[[ch_chronicle]]"]], sum: "The fire-keeper's daughter on Lantern Rock on the night of [[firstfire|the First Fire]]. She found the dry wrack on the west strand, saw the fog come in against the wind, and was the first to see the lost ship's lantern low on the water to the west.", secs: [
  { h: '', p: [
    "She is the first person on this coast whose name has come down, and nothing more is known of her: whether she kept the fire after her father, or whether the last of the fire-keepers, who would not leave the rock in 1841, was of her line. The Wrackhaven stories give the fire-keepers only one name between them, and it is [[fogkeeper|the Fog-Keeper]]'s.",
  ]},
], also: ['firstfire', 'lanternrock', 'fogkeeper'] },
{ id: 'garrison', t: 'The Spanish garrison', cat: ['Characters', 'Factions'], box: [["Post", "[[seafort|The sea fort]] on the headland"], ["When", "c. 1597 to the 1700s"], ["Led by", "The Governor, called Excellency"], ["Best known", "Sergeant Ybarra"], ["Appears in", "[[ch_chronicle]]"]], sum: "The soldiers of the old Spanish fort, who stayed on the headland after the Armada years and kept what law there was on the point below it. In the wrecking years they hunted [[mooncussers|the Mooncussers]] down the cliff path, and their Governor hanged the ones they caught in chains on the sea wall.", secs: [
  { h: 'Sergeant Ybarra', p: [
    "The sergeant who led the garrison down the cliff path on the night the false lights burned under the point. He put out every lamp before the merchantman struck, staved in the wreckers' boats in the cove so they had nowhere to run, and brought [[jago|Black Jago]] to his knees alive, because the Governor had said alive. Three nights later he held the gibbet on the sea wall against Jago's gang, and was the first to ask who had lit the lanterns.",
  ]},
  { h: 'The Governor', p: [
    "<i>Then put them out, Sergeant. Every one. And bring me the man who hung them.</i> He hanged Jago where every master who passed could count the price, and when Jago went over the wall with his light he had it written in the ledger and doubled the watch. The parish ledgers are his, and they are why the wrecking years are called that.",
  ]},
], also: ['seafort', 'jagohanging', 'mooncussers'] },
{ id: 'jago', t: 'Black Jago', cat: ['Characters'], box: [["Name", "Jago Penhallow"], ["Trade", "Master of a gang of [[mooncussers]]"], ["Hanged", "In chains on the sea wall of [[seafort|the sea fort]], the 1600s"], ["Became", "[[mooncusser|The Mooncusser]], it is said"], ["Appears in", "[[ch_chronicle]]"]], sum: "Jago Penhallow, called Black Jago, master of the Mooncussers on the point below the sea fort. He hung red and green lamps under the headland to make a harbour mouth where there was none, until the garrison took him on his own rocks and the Governor hanged him in chains on the sea wall.", secs: [
  { h: 'The hanging', p: [
    "He walked to it. <i>Hang me where the ships can see, then,</i> he told the Governor. <i>I will show them a light yet.</i> Three nights later his gang came up the wall on lines to cut him down and were beaten off, but at the turn of the tide the lanterns on the wall lit themselves, and he was talking. He went over the wall with his light, and it went down into the sea still burning. See [[jagohanging]].",
  ]},
  { h: 'After', p: [
    "Most on the coast hold that the drowned wrecker in chains, with a false light on a pole, who came up the T-head for the station in the winter of 1888, is Jago come back, and [[keeper|Holm]] thought so too. Whether every Mooncusser is him, or he was only the first, the ledgers do not say. Wrackhaven has not forgotten that the skipper of [[kittiwake|the Kittiwake]] was a Penhallow too.",
  ]},
], also: ['mooncusser', 'mooncussers', 'jagohanging'] },
{ id: 'penhallow', t: 'Abel Penhallow', cat: ['Characters'], box: [["Post", "Skipper of the smack [[kittiwake|Kittiwake]]"], ["Lost", "28 February 1888, off the Near Skerries"], ["Appears in", "[[ch_chronicle]]"]], sum: "The skipper of the fishing smack Kittiwake, a hard, careful man who kept his eight flares for ships in trouble. On the night something small and smiling sat down on his hatch, he would not let his hands put a flare in its face, and he was the one it helped.", secs: [
  { h: '', p: [
    "<i>Leave it. It only wants to help.</i> It knew his Christian name, which nobody aboard had told it. In the middle watch he went from the tiller and was not seen again, and the Kittiwake fell off onto the Near Skerries with her rudder broken. His hand [[jory|Jory Tregear]] brought the punt home. See [[kittiwake]] and [[verity]].",
  ]},
], also: ['kittiwake', 'jory', 'verity'] },
{ id: 'jory', t: 'Jory Tregear', cat: ['Characters'], box: [["Post", "Hand aboard the [[kittiwake|Kittiwake]]"], ["Known for", "The first account of [[verity]]"], ["Appears in", "[[ch_chronicle]]"]], sum: "The young hand off the Kittiwake who told the keeper of a small yellow thing that sat on the deck and said it wanted to help. He is the reason the coast knows what to do about it, and the reason it has a name.", secs: [
  { h: '', p: [
    "He had it from [[pascoe|Old Pascoe]] that you put a light in their face, and on the night of 28 February 1888 he dried the soaked flares two at a time at the caboose while his skipper told him to leave it be. When the smack struck he cut the punt free and got the others into it, and when the thing came aboard the punt too he put the last flare there was into its face. It rolled over the side still smiling. <i>It told me its name, before. Verity, it said.</i>",
  ]},
], also: ['kittiwake', 'verity', 'flare'] },
{ id: 'receiver', t: 'The Receiver of Wreck', cat: ['Characters'], box: [["Name", "Mr Tregear"], ["Post", "Receiver of Wreck, [[wrackhaven]]"], ["Known for", "Bringing the Gannet's sea chests home"], ["Appears in", "[[ch_chronicle]]"]], sum: "Mr Tregear, the Crown's Receiver of Wreck at Wrackhaven, whose office it is to see that what comes ashore goes to its owners and not to whoever is standing on it at dawn. In 1888 that made him the wreckers' enemy, and he went down to the Bonded Quay in the dark to prove it.", secs: [
  { h: '', p: [
    "The Gannet's dead had sent their sea chests ashore the night she struck, and [[nell|Black Nell]]'s gang had them in the stacks. On a night the lamp was out, he took his men in with no lanterns, opened the yard gate before the beam came round, and carried three chests down the steps to the gig while the drowned came over the edge to take them back. <i>It was never yours, Nell. It belongs to the widows of the Gannet.</i> See [[seachests]].",
  ]},
], also: ['seachests', 'bondedquay', 'nell'] },
{ id: 'nell', t: 'Black Nell', cat: ['Characters'], box: [["Trade", "Wrecker, at the head of Kittow's gang"], ["Carries", "A long gun"], ["Held", "[[bondedquay|The Bonded Quay]], on dark nights"], ["Appears in", "[[ch_chronicle]]"]], sum: "The wrecker who ran Kittow's gang on the Bonded Quay in 1888, and held that the quay was hers whenever the lamp was dark. She shot with a long gun from the stacks and liked to let the Light's beam find her enemies for her.", secs: [
  { h: '', p: [
    "When the Receiver's men came for the Gannet's sea chests, she doused her gang's lanterns and waited for the beam. She lost the chests, but not, it seems, her nerve: <i>Take them, then. The sea will have them back one day.</i> Whether the sea had her instead, the quay does not say. See [[wreckers]] and [[seachests]].",
  ]},
], also: ['wreckers', 'seachests', 'receiver'] },
{ id: 'ruth', t: 'Ruth Carrow', cat: ['Characters'], box: [["Led", "The crew that went down after the sea on the Dry Night"], ["When", "1890"], ["Carried", "The word of the keeper, and [[marenslantern|Maren's lantern]]"], ["Appears in", "[[ch_chronicle]]"]], sum: "The Wrackhaven woman who led a crew across the bed of the sea on the Dry Night of 1890, with Maren's lantern, down the wreck at the lip of the Swallow, up the Old Drain and out under the fort, where Maren was waiting.", secs: [
  { h: 'The Dry Night', p: [
    "She read the runnels before anyone crossed them, worked out the nine lamps of the Cistern Hall, and, when the lantern would not go through the grate, said only <i>Then it stays. Leave it lit for her.</i> Under the sea wall she split her crew to ring all the bells at once, which Maren could not stand. See [[drynight]].",
  ]},
  { h: 'After', p: [
    "She is the one who still points from the harbour wall when the lamp turns: <i>There. Out on the water.</i> Whether they ended Maren that night, or only one of her, is the oldest argument in the Drowned Man, and Ruth will not take a side in it.",
  ]},
], also: ['drynight', 'olddrain', 'ch_marensend'] },
{ id: 'cuttercrew', t: "The cutter's crew", cat: ['Characters', 'Factions'], box: [["Ship", "[[cutter|The keeper's cutter]]"], ["Officers", "The Coxswain (1888), the Mate (1889)"], ["Appears in", "[[ch_chronicle]], [[ch_gannetswake]], [[ch_fbsea]], [[ch_fogrun]]"]], sum: "Whoever would go, under whoever would lead them. The Light's cutter never had a regular crew, but it had two men the keeper trusted to bring her home: the Coxswain who took her out after the Gannet in 1888, and the Mate who took her onto the Wide Water and into the haar in 1889.", secs: [
  { h: 'The Coxswain', p: [
    "He had the flares, the grapnel and the oil down to the slip on 14 December 1888, kept Maren's lantern over the bowsprit all the way out, and answered the Gannet's bell with the cutter's own. It was he who saw that the figurehead was gone from the Gannet's stem, and he who held the cutter off while the rest went up her side.",
  ]},
  { h: 'The Mate', p: [
    "A dry man with an eye for a gun and a short way with a chart: <i>Four guns on her rails and a hold as empty as a parson's purse. She'll do.</i> He took a Gilt & Gull chart north to [[crowsnest|Crowsnest Rock]] in the spring of 1889 and home past [[gallowsbird|the Gallows Bird]], and that autumn lit the outer rocks one by one, carried a taper up to the altar on [[chapelislet|Chapel Islet]], and found [[firestep|the old hearth]] on Lantern Rock.",
  ]},
], also: ['cutter', 'ch_gannetswake', 'ch_fogrun'] },
{ id: 'mayor', t: 'The Mayor of Wrackhaven', cat: ['Characters'], box: [["Post", "Mayor of [[wrackhaven]]"], ["Last in office", "Winter 1891"], ["Appears in", "[[ch_chronicle]]"]], sum: "The last mayor of Wrackhaven. On the night the sea came up Fish Street and did not go back, he sent the men from the Light from door to door to bring his townsfolk to the Moot Hall, barred it, and rang the Belfry's bell at dawn so the Light would know they were alive.", secs: [
  { h: '', p: [
    "<i>Look at it once. Then do not look again. It is theirs now.</i> He was the last to leave the town, in the Light's boats across the Square over the tops of the market stalls. See [[fallwrackhaven]] and [[wrackfolk]].",
  ]},
], also: ['fallwrackhaven', 'wrackfolk', 'moothall'] },
{ id: 'wrackfolk', t: 'The folk of Wrackhaven', cat: ['Characters', 'Factions'], box: [["Home", "[[wrackhaven]], until winter 1891"], ["Brought out", "Eight households, to [[moothall|the Moot Hall]]"], ["Appears in", "[[ch_chronicle]]"]], sum: "The fishing people of Wrackhaven, who bought, sold, smoked, salted and drank across the harbour from the Light for a hundred years, and who were knocked up out of their houses with the water over the cobbles on the night the town fell.", secs: [
  { h: 'The last night', p: [
    "The chandler, with the water in his shop. A fishwife, with her fish boxes floating out of the door. The smokehouse hand, who thought the fires going out was the end of him. The cooper, who had been stopping the door with casks until the casks went first. [[pascoe|Old Pascoe]], at the bar of the Drowned Man: <i>Forty years I have drunk here. The sea can have the bar, not me.</i> [[schoolmaster|The schoolmaster]], who had sent the children up the hill road at dusk. The chaplain, praying for the boats. The smith, who never thought he would see the forge drowned.",
    "All of them came out across the harbour in the Light's boats at dawn, with [[mayor|the Mayor]]. Where they went after, the log does not say; Wrackhaven was the drowned's from then on. See [[fallwrackhaven]].",
  ]},
], also: ['fallwrackhaven', 'wrackhaven', 'mayor'] },
{ id: 'wrenmate', t: "The Wren's mate", cat: ['Characters'], box: [["Ship", "The schooner [[wren|Wren]]"], ["Sailed", "January 1888, and in the years after"], ["Led", "The lamp-men across the Reach"], ["Appears in", "[[ch_chronicle]]"]], sum: "A man who sailed in the Wren on the night Plimsoll first walked her in, and who was still on the water in the years after, when the sea came back full of nations. He led the lamp-men who crossed the Drowned Reach at low water and lit the Light again.", secs: [
  { h: '', p: [
    "<i>And there he is. Blue shoes and all. I'd know him in any year.</i> He knew the Light's rock from the sea side only, and had never once seen the keeper's station from the back. He took the Ember Isles' beacon holm, walked the shoal behind [[plimsoll]] while the flood came up behind them, and told the Ember Commodore to his face what nobody else in the Reach would: <i>You hold it dark.</i> See [[relighting]].",
  ]},
], also: ['wren', 'relighting', 'emberisles'] },

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

{ id: 'oldkeel', t: 'The Old Keel', cat: ['Creatures'], box: [["Kind", "A crab of old keels, out of the sea"], ["Seen", "c. 1200s, by [[lanternrock]]"], ["Appears in", "[[ch_chronicle]]"]], sum: "A great crab built of the keels of old wrecks, which walked up out of the sea by the wreck on Lantern Rock on the night of the First Fire, with the dead of those wrecks round it. <i>The keels. The old keels, walking.</i>", secs: [
  { h: '', p: [
    "It is the oldest thing of its kind on record, six hundred years before [[keelback|the Keelback]] came up Fish Street, and it wanted what the drowned have always wanted: the fire out. The fire-keepers fought it off with brands and kept the beacon high, and in the morning it was gone back into the sea. Some on the coast say the Keelback is the same creature, only bigger for every wreck since; most say it is its child.",
  ]},
], also: ['keelback', 'firstfire', 'crabs'] },

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
{ id: 'wrackhaven', t: 'Wrackhaven', cat: ['Places'], box: [['Kind', 'Fishing town, now drowned'], ['Taken by the sea', 'Winter 1891'], ['Landmarks', 'The Square, [[moothall|the Moot Hall]], the Drowned Man inn'], ['Appears in', '[[ch_lastlight]], [[ch_chronicle]]']], sum: "The fishing town across the harbour from Skerry Light, where the keeper bought his oil and Old Pascoe drank. In the winter of 1891 the sea came up Fish Street one night and did not go back, and the drowned live there now.", secs: [
  { h: 'The town', p: [
    "From the Quay, Fish Street runs up between the Chandlery and the Fish Market to the Square, with its well, its market cross and the town hall in the middle: the Moot Hall, the Council Chamber and the Belfry over the roof. Round the Square stand houses, workshops and the inn, the Drowned Man, which had that name long before it was true. Its people and its last night are in [[wrackfolk]] and [[fallwrackhaven]].",
  ]},
], also: ['pascoe', 'schoolmaster', 'ch_lastlight'] },
{ id: 'lanternrock', t: 'Lantern Rock', cat: ['Places'], box: [['Kind', 'The outermost rock of the Skerries'], ['Light', 'A fire, from c. 1200s to 1841'], ['Keeper', '[[fogkeeper|The Fog-Keeper]]'], ['Appears in', '[[ch_fogrun]]']], sum: "The outermost rock of the Skerries, and the site of the first light on this coast, a fire kept by one family for six hundred years. It was put out when Skerry Light was lit, and lit again in 1889.", secs: [
  { h: '', p: [ "The base of its dead tower still stands, with three lamp braziers round it. On the fogbound nights of 1889 it was the last light in the haar, and the thing that had put the others out was waiting there. When the [[fogkeeper|Fog-Keeper]] fell, the old lamp at the top of the tower came on by itself. Under the crags is the hearth where the first fire was kept: see [[firestep]] and [[firstfire]]." ] },
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
    "The governors hanged [[mooncussers]] they caught in chains along that wall, so the ships could see them: see [[seawall]] and [[garrison]]. Under the bed of the sea [[olddrain|the Old Drain]] runs to it from the Swallow.",
  ]},
], also: ['apothecaries', 'ch_marensend', 'mooncussers'] },
{ id: 'apothecaries', t: 'The three apothecaries', cat: ['Places', 'Factions'], box: [['Rooms', 'San Telmo (west), Santa Bárbara (east), San Lázaro (north)'], ['In', '[[seafort|The sea fort]]'], ['Kept by', 'A [[mooncusser|Mooncusser]] each, in 1890']], sum: "The three dispensaries of the sea fort, each named for a saint and lit its own colour, with cabinets of drawers and bottles round the walls. The brotherhood of sea-surgeons who kept them gave their name to [[callings|the Apothecary calling]].", secs: [
  { h: 'The saints', p: [
    "San Telmo is the sailors' saint, whose fire plays on mastheads in a storm. Santa Bárbara keeps the gunners and the powder, and those caught out in lightning. San Lázaro keeps the sick. Between them, the old surgeons said, they covered everything that could happen to a man at sea.",
  ]},
  { h: 'In 1890', p: [ "Each was kept by a Mooncusser, and only when all three had fallen did the [[batofmaren|Bat of Maren]] come." ] },
], also: ['seafort', 'callings', 'mooncusser'] },
{ id: 'bondedquay', t: 'The Bonded Quay', cat: ['Places'], box: [['Kind', 'A customs yard'], ['Appears in', '[[ch_wreckers]]']], sum: "A customs yard shut in by the high backs of the warehouses, packed with long cargo stacks under tarpaulins, with a crane on a stone plinth in the middle. The wreckers fight there because it is where the salvage is kept. Its most famous night is [[seachests|the night of the sea chests]].", secs: [
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

{ id: 'skerries', t: 'The Skerries', cat: ['Places'], box: [["Kind", "A field of reefs and rocks"], ["Lit by", "[[skerrylight]], from 1841"], ["Passages", "The Gate, the Narrows"], ["Hazards", "The Hulks, the Near Skerries"], ["Appears in", "Every tale"]], sum: "The rocks at the mouth of the harbour that every tale on this coast is about: a field of reefs, most of them under water at high tide, between the open sea and Wrackhaven. The Light stands on the innermost of them, and [[lanternrock]] is the outermost.", secs: [
  { h: 'The way in', p: [
    "The deep water winds through them in a channel that only a few pilots ever knew, and since 1888 only [[plimsoll]] walks it. From the sea it runs through the Hulks, a ring of old wrecks on the rocks that the drowned come out of; then the Narrows, where a ship must hold within a length either side of his wake; then the Gate, two rocks with the Light dead ahead between them. The rocks show only in the beam, or in a lantern held over the bow.",
  ]},
  { h: 'The Near Skerries', p: [
    "The reefs on the fishing grounds north of the Light, nearest the harbour and so the most fished, and the most feared. [[kittiwake|The Kittiwake]] struck there in 1888, and the wrecks the Gannet brought up drifted out past them onto [[widewater|the Wide Water]].",
  ]},
], also: ['skerrylight', 'wrencomes', 'kittiwake'] },
{ id: 'firestep', t: 'The Fire Step', cat: ['Places'], box: [["Kind", "An old hearth, under the crags"], ["Where", "[[lanternrock]]"], ["Lit", "c. 1200s to 1841, and again in autumn 1889"], ["Appears in", "[[ch_chronicle]]"]], sum: "The hearth under the crags of Lantern Rock where the fire-keepers kept the first fire on this coast. It was put out in 1841, and lit again in the autumn of 1889 by the crew of the keeper's cutter, with timber from the wreck, while [[fogkeeper|the Fog-Keeper]] breathed fog at it.", secs: [
  { h: '', p: [
    "<i>That fire. I knew that fire.</i> It was the one thing on the rock he could not put out, and it was by its light that he could be hurt. When he fell, the light on his tower came on by itself. The fishermen call the hearth the Fire Step from the cut stair the fire-keepers carried wood up; on the night of [[firstfire|the First Fire]] it burned high enough to turn a ship from the rock.",
  ]},
], also: ['lanternrock', 'firstfire', 'fogkeeper'] },
{ id: 'seawall', t: 'The sea wall and the gibbet', cat: ['Places'], box: [["Where", "The south front of [[seafort|the sea fort]]"], ["Used for", "Hanging [[mooncussers]] in chains"], ["Appears in", "[[ch_chronicle]], [[ch_marensend]]"]], sum: "The great wall of the sea fort over the open ocean, where the Governors hanged the wreckers they caught in iron cages so that every master who passed could see them. The lanterns along it were the fort's; on the third night after Black Jago was hanged, they lit themselves.", secs: [
  { h: '', p: [
    "Jago went over it with his light, and the light went down into the sea still burning. There are men still in the chains under it, the crews who came up out of the Old Drain on the Dry Night said, and they did not all keep still. See [[jagohanging]] and [[olddrain]].",
  ]},
], also: ['seafort', 'jagohanging', 'jago'] },
{ id: 'crowsnest', t: 'Crowsnest Rock', cat: ['Places'], box: [["Kind", "A rock of crags, with a stair cut in them"], ["Where", "North on [[widewater|the Wide Water]], by Beacon Knoll"], ["Marks", "The Crow, the Tower, the Hanged Man"], ["Appears in", "[[ch_chronicle]], [[ch_fbsea]]"]], sum: "A rock of crags out on the Wide Water, where the first Gilt & Gull chart of 1889 sent the keeper's cutter to dig. A stair is cut up the crags, with a stone at its head carved with a crow, an old tower beyond, and a gibbet with somebody still in it, called the Hanged Man.", secs: [
  { h: 'The three sights', p: [
    "By each of the three marks stands a sight on a post. The chart said the Crow looks to the Tower, the Tower to the Hanged Man, and the Hanged Man back to the Crow; turned to the chart's marks, they all point at one patch of turf, older than the rest. Under it was a hoard, half gone, with a green Mooncusser's lamp left on the lid to say whose the other half was. See [[giltgull]] and [[gallowsbird]].",
  ]},
], also: ['giltgull', 'gallowsbird', 'widewater'] },
{ id: 'drybed', t: 'The dry bed of the sea', cat: ['Places'], box: [["When", "The Dry Night, 1890"], ["Where", "Between [[skerrylight]] and the lip of [[swallow|the Swallow]]"], ["Hazards", "The runnels, and the drowned"], ["Appears in", "[[ch_chronicle]], [[ch_marensend]]"]], sum: "The floor of the sea round the Light, as it lay for one night in 1890 when the water went out at the turn and did not come in. Sand, weed and wrecks, cut through by runnels down which the last of the sea still ran north in rushes, to the hole that had not been there the night before.", secs: [
  { h: '', p: [
    "The bells of old wrecks lay about on it, and the crew that crossed it with Maren's lantern found that ringing them made her give ground. At the lip of the Swallow a wreck stood on end, and the way down was hand over hand down her mast. See [[drynight]].",
  ]},
], also: ['drynight', 'swallow', 'olddrain'] },
{ id: 'olddrain', t: 'The Old Drain', cat: ['Places'], box: [["Kind", "A Spanish drain, cut stone"], ["Runs", "Under the bed of the sea to [[seafort|the sea fort]]"], ["Has", "The Cistern Hall, its nine lamps and its grate"], ["Appears in", "[[ch_chronicle]], [[ch_marensend]]"]], sum: "A tunnel of dry, square-cut stone under the bed of the sea, running from below the wreck at the lip of the Swallow to the fort on the headland. Some of the water found it on the Dry Night instead of [[blackwater|the Black Water]], and so did Ruth Carrow's crew.", secs: [
  { h: 'The Cistern Hall', p: [
    "Halfway along it opens into a hall with nine lamps and an iron grate. Turn one lamp and the ones beside it turn too; light all nine and the grate lifts. Out of the light the dark takes the strength out of anyone in it, a little at a time.",
    "The crew tried to carry [[marenslantern|Maren's lantern]] through the grate, and it would not go. It was not a weight, or a wind. It would not. They left it lit on the ledge by the grate, for her.",
  ]},
], also: ['drynight', 'seafort', 'marenslantern'] },
{ id: 'moothall', t: 'The Moot Hall', cat: ['Places'], box: [["Kind", "Wrackhaven's town hall"], ["Where", "The Square, [[wrackhaven]]"], ["Has", "The Council Chamber, the Belfry, the leads"], ["Fell", "Winter 1891"], ["Appears in", "[[ch_chronicle]], [[ch_lastlight]]"]], sum: "The town hall in the middle of Wrackhaven's Square, and the last dry place in the town on the night it fell. Every soul left in Wrackhaven was brought there, and when the water came up the stair after them they held the Belfry over the roof until dawn.", secs: [
  { h: '', p: [
    "Its hall went under to the windowsills, and the schoolmaster swore he saw the drowned standing below the water in rows, like a congregation. From the leads you can see across the harbour to the Light. When its bell was rung at first light, the old salvage [[diver]] came up the wall after it, and the Light's boats came for the bell. See [[fallwrackhaven]].",
  ]},
], also: ['wrackhaven', 'fallwrackhaven', 'bell'] },

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
{ id: 'wren', t: 'The Wren', cat: ['Ships'], box: [['Rig', 'Schooner'], ['Known for', 'The first ship Plimsoll brought in'], ['Appears in', '[[log|The keeper\'s log]], [[ch_chronicle]]']], sum: "The schooner that came through the skerries on 9 January 1888 without a scratch, with a shark in shoes walking ahead of her the whole way. Her hands named him Plimsoll. See [[wrencomes]], and [[wrenmate|her mate]], who was still sailing in the years after.", secs: [
  { h: '', p: [ "She went on to see more of the far seas than any other ship in the log: her mate came back from [[nether|the Nether]], and her master sailed into [[backrooms|the yellow rooms]] more than once." ] },
], also: ['plimsoll', 'nether'] },
{ id: 'ironship', t: 'The iron ship', cat: ['Ships'], box: [['Rig', 'None'], ['Arrived', '12 August 1888'], ['From', 'A year the keeper would not write down'], ['Known to the boats as', 'The Carrier']], sum: "A ship with no sails at all: iron, longer than the harbour, flat as a table on top and lit like a town. Things flew off her deck with a roar and swept the water with lights.", secs: [
  { h: '', p: [ "Her crew spoke of a year the keeper would not write down. Plimsoll walked ahead of her too. She proved, if proof was needed, that the sea had come loose in time as well as place, and in [[ch_reach]] her people were not the only ones from later years." ] },
], also: ['boats', 'opensky'] },
{ id: 'cutter', t: "The keeper's cutter", cat: ['Ships'], box: [['Kind', 'A small cutter'], ['Berth', 'The foot of [[skerrylight]]'], ['Appears in', '[[ch_gannetswake]], [[ch_fogrun]], [[ch_fbsea]], [[ch_chronicle]]']], sum: "The Light's own boat, kept at the foot of the tower. The keeper sent her out after the Gannet in 1888, onto the Wide Water and into the haar in 1889, each time with a crew of whoever would go. See [[cuttercrew]].", secs: [
  { h: '', p: [ "She has a wheel, a ship's bell at the mast, a flare locker aft, and since 1889 a chart table on deck. She has been holed more times than anyone has counted, and patched every time. She has never been slowed down." ] },
], also: ['ch_fogrun', 'ch_gannetswake', 'bell'] },
// [fbsea]
{ id: 'blacksloops', t: "The Mooncussers' black sloops", cat: ['Ships', 'Factions'], box: [['Kind', 'Fore-and-aft sloops, tarred black'], ['Show', 'No lights at all'], ['Crew', 'Never taken alive'], ['Appears in', '[[ch_fbsea]]']], sum: "Black sloops that sail the Wide Water without a lamp between them, after the same salvage the freebooters are. They chase what they see, fire broadsides into it, and send the drowned over its rail. Sink one and whatever it had taken floats. Their flagship was [[gallowsbird|the Gallows Bird]].", secs: [
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

{ id: 'kittiwake', t: 'The Kittiwake', cat: ['Ships', 'Events'], img: 'verity', box: [["Rig", "A fishing smack"], ["Skipper", "[[penhallow|Abel Penhallow]]"], ["Lost", "28 February 1888, on the Near Skerries"], ["Came home", "Her punt, and [[jory|Jory Tregear]]"], ["Appears in", "[[ch_chronicle]]"]], sum: "The Wrackhaven smack that was lost on [[skerries|the Near Skerries]] on 28 February 1888, and the ship of the first account of [[verity]]. One boat came in. The Kittiwake did not.", secs: [
  { h: 'The night', p: [
    "She was out on the grounds with her nets down and the glass falling. The nets came up with drowned men in the mesh, and haar came down with the dark. As the lamps were lit, something small and yellow was sitting on her hatch, smiling. A sea came aboard and soaked every flare in the locker, and the skipper would not have it touched. In the middle watch he was gone from the tiller, and she fell off onto the rocks with her rudder broken.",
    "The hands cut the punt free and got into it together. The thing was in the bow. The last flare there was went into its face, and it rolled over the side and the sea took it, smiling. The keeper wrote it down: <i>The ships that let it sit there do not come in.</i>",
  ]},
], also: ['verity', 'jory', 'penhallow'] },
{ id: 'gallowsbird', t: 'The Gallows Bird', cat: ['Ships'], box: [["Kind", "A black sloop, the flagship of them"], ["Shows", "A gold lamp at her masthead, green at her stern"], ["Sunk", "Spring 1889, on the run home to Saltcote"], ["Appears in", "[[ch_chronicle]]"]], sum: "The flagship of [[blacksloops|the Mooncussers' black sloops]], known by the gold lamp at her masthead among all the green. She came out from under St Brannoc's Isle after the keeper's cutter in the spring of 1889 for the other half of the Crowsnest hoard.", secs: [
  { h: '', p: [
    "<i>Give it back, keeper's men. The sea only lent it you.</i> She was holed through and went down by the stern, and the half of the hoard she carried came up and floated. The rest of the sloops bore away rather than follow the cutter into Saltcote's light. In Saltcote they say her crew were the hanged men come down out of their chains to go back to sea.",
  ]},
], also: ['blacksloops', 'crowsnest', 'mooncussers'] },
{ id: 'fireships', t: 'The fire-ships of the Reach', cat: ['Ships'], box: [["Kind", "Hulks set alight and sent in"], ["Sent by", "Every nation of the Reach"], ["Against", "The Light, the night it was lit again"], ["Appears in", "[[ch_chronicle]]"]], sum: "Burning ships, one from every nation in the Reach, that came in on the Light's rock the night the lamp-men lit it again. Every nation that wanted the name of Keeper and could not light the lamp had decided nobody else should.", secs: [
  { h: '', p: [ "They were turned or sunk short of the rock, while the lamp was kept in oil and its clock wound. At dawn the same nations dipped their beacons to it. See [[relighting]]." ] },
], also: ['relighting', 'reachwars'] },

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
{ id: 'giltgull', t: 'Gilt & Gull Company', cat: ['Factions'], box: [['Trade', 'Hoard charts, and what is under them'], ['Office', 'The voyage board, [[saltcote]]'], ['Appears in', '[[ch_fbsea]]']], sum: "A firm of chart-dealers who buy every scrap of paper that comes out of the wrecks with an X on it, sort the true charts from the false, and send freebooters out to dig. They keep a fair share of what comes up, and pay well for the rest. Their first true chart of 1889 was to [[crowsnest|Crowsnest Rock]].", secs: [
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
{ id: 'reachwars', t: 'The Reach Wars', cat: ['Factions', 'Events'], box: [['When', 'The years after the sea came back'], ['Who', 'Every nation of the Reach'], ['Prize', 'The rock of [[skerrylight]]']], sum: "The long, many-sided war for the islands round the Light, told in [[ch_reach]]. It has no single beginning and has never had a single end: a nation that takes six tenths of the Reach holds it only until the next landing. Among them are [[emberisles|the Ember Isles]] and [[icefolk|the Ice-folk]]; see also [[relighting]].", secs: [
  { h: '', p: [ "The nations build cities and railroads, harbours, watchtowers and beacons, and send fire-ships against each other. Pacts are sworn and broken. Each nation flies its own banner, and every nation remembers an oath-breaker." ] },
], also: ['ch_reach'] },

{ id: 'emberisles', t: 'The Ember Isles', cat: ['Factions'], box: [["From", "The sea of the Ember Isles, one of [[sixseas|the six seas]]"], ["Held", "The Light's rock, dark, after the last pact broke"], ["Led by", "The Ember Commodore"], ["Arms", "Muskets, fire-pots and shore guns"], ["Appears in", "[[ch_chronicle]], [[ch_reach]]"]], sum: "One of the nations that came back with the sea and fought for the islands round the Light. When the last pact of the Reach broke, the Ember Isles took the Light's own rock and called themselves its Keepers, though they never once lit the lamp.", secs: [
  { h: 'On the rock', p: [
    "They held a beacon holm off the north side, which they would not feed with their own wood, and a battery of guns on the north rock with which they shelled the shoal. They hoarded the Light's oil in the station's west yard. Their sections fight in good order and call their enemies <i>oath-breakers</i>; to them anyone who lands without a nation behind them is a <i>lamp-man</i>.",
  ]},
  { h: 'The Ember Commodore', p: [
    "Their commander on the rock, who had hanged better men for less, and who fought the lamp-men up to the station door with fire-pots. <i>Every nation remembers an oath-breaker. Nobody remembers a lamp-man.</i> At the last he said the truest thing anyone in the Reach ever said of it: <i>Light it, then. Light it, if you can. We never could.</i> See [[relighting]].",
  ]},
], also: ['reachwars', 'relighting', 'icefolk'] },
{ id: 'icefolk', t: 'The Ice-folk', cat: ['Factions'], box: [["From", "The Frozen Fjord, one of [[sixseas|the six seas]]"], ["Held", "Hulks on the shoal of the Reach"], ["Arms", "Muskets, fired by volley"], ["Appears in", "[[ch_chronicle]], [[ch_reach]]"]], sum: "The people of the Frozen Fjord, who came back with the sea and keep to the hulks and the cold places of the Reach. Their sergeants fire by volley, on the word, and they hold the wrecks on the shoal at low water against anyone who tries the road across it.", secs: [
  { h: '', p: [ "<i>Lamp-men on the shoal! Make ready! Present!</i> Even [[plimsoll]] would not walk into their muskets, and the lamp-men had to clear their hulk before he would go on. See [[reachwars]]." ] },
], also: ['emberisles', 'reachwars', 'sixseas'] },

// ---------------- events ----------------
{ id: 'wreck1887', t: 'The Night of the Gannet', cat: ['Events'], img: 'maren', box: [['Date', '14 December 1887'], ['Place', 'The Skerries, under [[skerrylight]]'], ['Lost', 'The brig [[gannet|Gannet]], with all hands; [[maren]]'], ['Cause', 'The lamp failed in the second hour']], sum: "The night the lamp at Skerry Light failed, the brig Gannet was lost with all hands, and Maren Holm rowed out to warn her and did not come back. Everything in this compendium follows from it.", secs: [
  { h: 'The night', p: [
    "The lamp failed in the second hour, and the log has never said why. The Gannet was coming in under the cliffs with no light to steer by. Maren took the skiff and a hand lantern out towards her. The keeper wrote: <i>I could not stop her.</i>",
    "In the morning the Gannet was on the skerries with all hands, and the skiff came ashore at the harbour steps, empty, with the lantern still lit. That night the sea froze from the steps to the horizon.",
  ]},
  { h: 'What followed', p: [ "[[plimsoll]] in January, Maren on the water, [[knock]], [[verity]], the [[sixseas|six seas]], and the rest: see the [[timeline]]." ] },
], also: ['timeline', 'gannet', 'maren'] },

// [chronicle] the nights of The Chronicle of the Light
{ id: 'firstfire', t: 'The First Fire', cat: ['Events'], box: [["Date", "c. 1200s"], ["Place", "[[lanternrock]]"], ["Who", "The fire-keeper, [[wenna]] and their household"], ["Foes", "The haar, the drowned of the old wrecks, [[oldkeel|the Old Keel]]"], ["Told in", "[[ch_chronicle]]"]], sum: "The oldest night anyone on this coast remembers. A haar came in against the wind over Lantern Rock, a ship's lantern showed low in the west standing in for the rock, and the fire-keepers built their fire higher than it had ever been, until the ship saw it and went about.", secs: [
  { h: 'The night', p: [
    "<i>Wet wood smokes. Dry wood burns. Bring me the dry.</i> The household gathered wrack from the west strand at dusk and lit the beacon. The fog that came after it was no common haar: it put out what it touched, and they had to burn it back with brands. Out of it came the dead from the old wrecks, wanting the fire out, and then the Old Keel itself, walking up out of the water by the wreck.",
    "They held the fire till the shipmaster saw it and cried <i>Light on the rock! Hard over!</i> The fire-keeper said only: <i>That's what the fire's for. Six hundred years, if it takes it.</i> It took almost exactly that. See [[firestep]] and [[era_before]].",
  ]},
], also: ['lanternrock', 'wenna', 'firestep'] },
{ id: 'jagohanging', t: 'The hanging of Black Jago', cat: ['Events'], box: [["Date", "The 1600s"], ["Place", "The point under [[seafort|the sea fort]], and [[seawall|its sea wall]]"], ["Who", "[[garrison|The Spanish garrison]], [[jago|Black Jago]] and his gang"], ["Told in", "[[ch_chronicle]]"]], sum: "The taking and hanging of Black Jago, master of the Mooncussers, by the garrison of the sea fort: the night the true story of [[mooncusser|the Mooncusser]] begins.", secs: [
  { h: 'The false lights', p: [
    "On a night with no moon, red and green lamps were hung on the point under the headland, as if there were a harbour mouth there, and a merchantman stood in for them. Sergeant Ybarra's men went down the cliff path and put them out one by one, though the gang lit them again behind them, and the ship saw the breakers in time and bore away to the west, never knowing how near it had been. They staved in the gang's boats in the cove, and took Jago on his own rocks.",
  ]},
  { h: 'The sea wall', p: [
    "He was hanged in chains on the sea wall where the ships could see. Three nights later his gang came under the wall in boats and up it on lines, and were held off the gibbet. But at the turn of the tide the wall's lanterns kindled by themselves, and lead would not touch him while they burned. When they were put out he went over the wall with his own light, and it went down into the sea still burning. It has been seen on the rocks ever since. See [[wreckingyears]].",
  ]},
], also: ['jago', 'mooncusser', 'seawall'] },
{ id: 'lighting1841', t: 'The lighting of the Light', cat: ['Events'], box: [["Date", "1841"], ["Place", "[[skerrylight]]"], ["Who", "[[lampwright|The Lampwright]], his foreman and crew"], ["Ended", "The fire on [[lanternrock]]"], ["Told in", "[[ch_chronicle]]"]], sum: "The night the great lens was carried up the new tower on the Skerry rock and lit for the first time. Forty years the coast had talked of a light there; the Lampwright gave it one in a night, and a haar off Lantern Rock tried to stop him.", secs: [
  { h: 'The lens', p: [
    "<i>Every prism in those crates I ground with my own hands. Carry them as you would carry a child.</i> The crates came up the pier from a lugger between the seas and were wound up to the gallery. The last sea had the crate that held the heart of the lens off the lugger and onto the north rocks, where crabs as big as dogs came for it, and the crew fetched it back by lit braziers. The six panels were set each in its numbered place, filled with the best colza from the Service Room, and lit with a taper.",
  ]},
  { h: 'The fire put out', p: [
    "<i>You can see her from Wrackhaven, sir. I'd stake my wages on it.</i> That was the foreman. Across the water the last of the fire-keepers watched it lit. <i>There. You have no more need of me.</i> He put the fire on Lantern Rock out himself, and stayed with it: <i>Then I will keep it cold. Someone must.</i> See [[fogkeeper]].",
  ]},
], also: ['lampwright', 'skerrylight', 'fogkeeper'] },
{ id: 'wrencomes', t: 'The Wren comes in', cat: ['Events'], img: 'plim', box: [["Date", "2 and 9 January 1888"], ["Place", "The strand across from the Light, and [[skerries|the Skerries]]"], ["Who", "[[keeper|Holm]], the schooner [[wren|Wren]], [[plimsoll]]"], ["Told in", "[[ch_chronicle]], [[ch_voyages]]"]], sum: "The first week of the voyages of 1888: the dawn a shark in blue shoes walked up out of the surf, and the night a week later when he walked the schooner Wren in through the skerries without a scratch, and got his name.", secs: [
  { h: '2 January', p: [
    "All night the sky over the headland had been red, as if the hills were burning, and the rocks in the bay were warm in January. At dawn Holm followed small prints along the tide line, turned in a little, a boy's by the stride, with the sand glazed round them as if something hot had stood there. At the point a shark stood on the sand in the Gannet's cabin boy's blue shoes, looked at him, and walked back into the sea. Then the drowned came up the surf, and the old fog bell by the point held them until the sun was up.",
  ]},
  { h: '9 January', p: [
    "The keeper sent word to the Wren by the pilot cutter: follow the shark in, and ring if she comes. He walked ahead of her bowsprit on the water with his shoes alight, through the Hulks, the Narrows and the Gate, with palm trees on the cliffs and the wake gone green behind her, and Maren on the water astern. On the pier he sat down and took his shoes off. <i>Blue plimsolls, on a shark.</i> <i>Then that's his name, and he's earned it.</i>",
  ]},
], also: ['plimsoll', 'wren', 'skerries'] },
{ id: 'seachests', t: 'The night of the sea chests', cat: ['Events'], box: [["Date", "A dark night in 1888"], ["Place", "The Waterfront and [[bondedquay|the Bonded Quay]], Wrackhaven"], ["Who", "[[receiver|The Receiver of Wreck]]'s men, against [[nell|Black Nell]]"], ["Told in", "[[ch_chronicle]]"]], sum: "The night the Receiver of Wreck's men took the Gannet's sea chests out of the wreckers' stacks on the Bonded Quay and brought them home for the widows, the best-remembered of all the nights the lamp was dark.", secs: [
  { h: '', p: [
    "They went in with no lanterns, since a lantern on the quay that night was a target, and lifted the bar on the yard gate. At twenty past one the keeper had the lamp lit again, and after that the beam showed both sides to each other as it came round. Nell's gang held the stacks and the drowned came up the steps for the chests, but three went down into the gig.",
    "The chests were opened at the Customs House on the Monday. The widows signed for them, and the fourth made her mark. See [[ch_wreckers]] for the other dark nights.",
  ]},
], also: ['receiver', 'nell', 'bondedquay'] },
{ id: 'drynight', t: 'The Dry Night', cat: ['Events'], img: 'maren', box: [["Date", "1890"], ["Place", "[[drybed|The dry bed of the sea]], [[swallow|the Swallow]], [[seafort|the sea fort]]"], ["Who", "[[ruth|Ruth Carrow]]'s crew, and the raiders"], ["Ended", "Maren, or one of her"], ["Told in", "[[ch_marensend]], [[ch_chronicle]]"]], sum: "The night, three years after the Gannet, when the sea round the Light went out at the turn of the tide and did not come in. By midnight there was no sea at all; it ran north across the bed faster than a horse could gallop and down a hole that had not been there the night before.", secs: [
  { h: 'The night', p: [
    "The keeper gave [[marenslantern|Maren's lantern]] to the crews that went down after the water. Maren met them on the lip of the Swallow, by the wreck: <i>You've brought my lamp. Bring it to me, then.</i> Some went down the Swallow itself and across [[blackwater|the Black Water]]; Ruth Carrow's crew went down the wreck's mast and along [[olddrain|the Old Drain]]. Both came out under the fort, where she was waiting.",
    "<i>I rowed out to warn them. Nobody rowed out for me.</i> She could not stand all the bells rung at once. She went down on her knees in the last pool, and the sea came back over the bed without a sound, and it did not stop at the wrecks. The fort has been called Maren's End ever since. See [[ch_marensend]].",
  ]},
], also: ['ch_marensend', 'swallow', 'ruth'] },
{ id: 'fallwrackhaven', t: 'The Fall of Wrackhaven', cat: ['Events'], box: [["Date", "Winter 1891"], ["Place", "[[wrackhaven]]"], ["Who", "[[wrackfolk|The townsfolk]], [[mayor|the Mayor]], the men from the Light"], ["Foes", "The drowned, [[keelback|the Keelback]], [[diver|the Diver]]"], ["Told in", "[[ch_chronicle]], [[ch_lastlight]]"]], sum: "The night the tide came into Wrackhaven at dusk and, at the turn, did not go out. The sea came up Fish Street and stayed, and the town has belonged to the drowned ever since.", secs: [
  { h: 'The night', p: [
    "Men came across from the Light, and the Mayor sent them door to door, Fish Street first, to knock up eight households with the water already over the cobbles and bring them to the [[moothall|Moot Hall]]. The windows were barred. Something as big as a boat came up the street, and Old Pascoe knew it: <i>The Keelback. A whole wreck walking.</i> It was turned on its back in the Square, and its shell split open on a whole ship inside.",
    "The hall went under to its windowsills, and everyone went up to the leads. The drowned came up the walls like crabs up a pier. At first light the Belfry's bell was rung, again and again, so the Light would know they were alive; it woke the old salvage diver, who came up the wall after it. Then the boats came from the Light across the Square, over the tops of the market stalls. Out past the quay they looked back, and across the harbour the Light was still lit.",
  ]},
], also: ['wrackhaven', 'moothall', 'wrackfolk'] },
{ id: 'relighting', t: 'The Light lit again', cat: ['Events'], box: [["Date", "The years after"], ["Place", "The Light's rock, in the middle of the Reach"], ["Who", "[[wrenmate|The Wren's mate]] and the lamp-men, [[plimsoll]], [[lampwright|the Lampwright]]"], ["Against", "[[emberisles|The Ember Isles]], [[icefolk|the Ice-folk]], every nation of the Reach"], ["Told in", "[[ch_chronicle]]"]], sum: "The night, in the years after, when a crew with no nation behind them crossed the Drowned Reach at low water, took the dark Light from the Ember Isles, and lit it. Every nation in the Reach wanted the name of Keeper; not one of them had been able to light the lamp.", secs: [
  { h: 'The crossing', p: [
    "They lit the Ember Isles' cold beacon on a holm off the north side and kept it fed while the tide went out. At low water the shoal was a road, and Plimsoll walked it ahead of them, blue shoes and all, past an Ice-folk hulk and an old buoy's bell on the bank, with the flood coming up the road behind them. On the Light's rock they took the Ember battery, fought the Commodore to the station's back door, and carried the oil the Ember Isles had hoarded up the ninety treads a cask at a time.",
  ]},
  { h: 'Ninety treads', p: [
    "The Lampwright was waiting in the lantern room. <i>Mind the forty-first tread. It always did creak.</i> The wick was trimmed and the glass was clean: <i>I ground this glass in eighteen forty-one. I never once saw it lit from the outside.</i> When it was lit, every nation sent a [[fireships|fire-ship]] at the rock, and the lamp-men kept the lamp in oil and its clock wound until the last of them was gone.",
    "Every shore it touched, the drowned sank back. One by one the nations dipped their beacons to it. <i>Whoever holds the rock, they call the Keeper. Holding it was never the trick of it.</i> And the keeper's book was there, open at its last page: <i>If you are reading this, keep Plimsoll close and keep the bell ready.</i>",
  ]},
], also: ['ch_reach', 'reachwars', 'lampwright'] },

// ---------------- objects ----------------
{ id: 'log', t: "The keeper's log", cat: ['Objects'], box: [['Author', '[[keeper|The keeper Holm]]'], ['Covers', '14 December 1887 to 14 December 1888, and undated pages'], ['Read', 'One page for each harbour reached']], sum: "The station's log, kept by the keeper through the year after the wreck. It is the oldest and most trusted source for everything in this compendium, and it was written one harbour at a time.", secs: [
  { h: 'The pages', p: [
    "It runs from the night the lamp failed, through Plimsoll, Maren, Knock, Verity and the six seas, to the night a year later when the keeper stood on the gallery until dawn, and she looked up at him. Pages in other hands are pasted or written into it: the [[nether|Nether]] in a margin, the [[schoolmaster|schoolmaster's]] page, a pencilled page from [[opensky|the sky]], and one almost blank page from [[between|the Places In Between]].",
  ]},
  { h: 'The last page', p: [ "Undated: <i>If you are reading this, keep Plimsoll close and keep the bell ready. Whatever sea you wake on, the light is still turning and she is still rowing out to the Gannet. She will take any ship that lets her come aboard.</i>" ] },
], also: ['keeper', 'timeline'] },
{ id: 'marenslantern', t: "Maren's Lantern", cat: ['Objects'], box: [['Owner', '[[maren]]'], ['Kind', 'A hand lantern'], ['Lit since', '14 December 1887'], ['Appears in', '[[ch_marensend]]']], sum: "The hand lantern Maren rowed out with on the night of the wreck. Her skiff came back without her, but the lantern was still lit, and it has never gone out.", secs: [
  { h: '', p: [ "In 1890 the raiders carried it down [[swallow|the Swallow]], where it was the only thing that would light the braziers of the Deep Path. It would not go through the door at the end. Ruth Carrow's crew, who went by [[olddrain|the Old Drain]], say they left it lit on a ledge by a grate for her. Where it is now, nobody will say." ] },
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
  { h: '', p: [ "The keeper did not know who set them adrift. <i>Whoever it is, they want us to keep sailing.</i> In later years the same crates turned up on the wreckers' islands, at the station and in the Reach, full of coats, gun finishes and banners, and on the headland and the Race they held golf balls, clubs and whole lighthouses: see [[ch_links]] and [[greatlight]]. Nobody has caught anyone putting one in the water." ] },
], also: ['boats', 'log'] },

// ---------------- Skerry Clash: the Race and its keepers ----------------
{ id: 'racekeepers', t: 'The keepers of the Race', cat: ['Characters', 'Factions'], box: [['Post', 'Keepers of the two lights on [[race|the Race]]'], ['Since', 'The years after'], ['Dispute', 'Whose light is the false one'], ['Shouts', 'Ahoy!, Well played, Nooo…'], ['Appears in', '[[ch_clash]]']], sum: "The keepers of the rival lights across the tidal race, each in an oilskin and a keeper's cap, each certain that the other's lamp is the one that wrecks ships. Who they are changes from night to night. What they are arguing about never does.", secs: [
  { h: 'Across the water', p: [
    "The two rocks are close enough that the keepers can hear each other, and they do not keep quiet. A keeper shouts across when the fight starts, when a tower falls and when it is over, and the coast's own folk join in: shore crabs, a puffin, a drowned sailor, the herring gulls and a grey seal, each with an opinion. A keeper who has heard enough can stop listening for the rest of the night.",
  ]},
  { h: 'Their standing', p: [
    "The Race keeps a reckoning of every keeper who has fought on it, a figure that rises with every win and falls with every loss, and more when the odds were long. It is kept by name, and a name once taken is not given to anyone else. Folk come down to the shore in numbers to watch the better ones, up to eight at a time, and nothing they see counts for them.",
  ]},
], also: ['ch_clash', 'race', 'keeper'] },
{ id: 'race', t: 'The Race', cat: ['Places'], box: [['Kind', 'A tidal race between two rocks'], ['Crossed by', 'Two causeways, dry only at slack water'], ['Lights', 'A [[greatlight|Great Light]] and two Lamp Towers on each rock'], ['Appears in', '[[ch_clash]]']], sum: "A fast tidal race between two rocks, each with a light on it. At slack water two causeways come up out of it, one in each lane, and for three minutes the two keepers can reach each other. The rest of the time the water runs too fast for anything to cross but a bird.", secs: [
  { h: 'The rocks', p: [
    "Each rock has its Great Light at the back, in the middle, and two Lamp Towers forward, one over each causeway. Hands are set down only on dry rock, never in the water or on a tower, and only on a keeper's own side, until a Lamp Tower across the water falls and the rock behind it is open to them too.",
  ]},
  { h: 'Where it is', p: [ "No chart agrees. The Race is said to lie somewhere in the outer skerries, out of sight of [[skerrylight]], and on some nights it seems to lie on any of the [[sixseas|six seas]]. The causeways are always there at slack water." ] },
], also: ['ch_clash', 'threeskerry', 'greatlight'] },
{ id: 'threeskerry', t: 'The Threefold Skerry', cat: ['Places'], box: [['Kind', 'A round skerry cut three ways'], ['Lights', 'Three, one on each rock'], ['Crossed by', 'Three causeways, one over each channel'], ['Appears in', '[[ch_clash]]']], sum: "A round skerry cut into three rocks by channels that run out from a pool in the middle, each crossed by a causeway to the next rock. Three keepers keep three lights there, and every one of them is sure the other two are false.", secs: [
  { h: 'Every keeper for themselves', p: [
    "Each keeper has a Great Light at the back of their rock and a Lamp Tower beside each causeway, a little less stout than those on [[race|the Race]], since every keeper's oil must go two ways. Hands sent over cross the nearer causeway and go for that neighbour, and once they have picked a rival they stay with them.",
    "A keeper whose Great Light goes out is finished: their towers crumble, their hands melt away, and the other two fight on. The last light burning wins. If the tide turns before then, the keeper with the most towers still standing has the night.",
  ]},
], also: ['race', 'ch_clash', 'racekeepers'] },
{ id: 'greatlight', t: 'The Great Lights and Lamp Towers', cat: ['Objects', 'Places'], box: [['Kind', 'The towers of the rival lights'], ['On each rock', 'One Great Light, two Lamp Towers'], ['Dressed by', 'The Lampwright\'s Crate'], ['Appears in', '[[ch_clash]]']], sum: "The towers the keepers of the Race fight over. The Lamp Towers stand forward over the causeways and shoot at anything that comes in range, on the rock or in the air. The Great Light behind them sleeps until it is struck or one of its towers falls, then wakes and shoots harder than either.", secs: [
  { h: 'Crowns', p: [ "Every tower felled is a crown to the keeper who felled it. Put out the Great Light and all three go with it, and the night is over." ] },
  { h: 'The Lampwright\'s Crate', p: [
    "Keepers dress their towers from the Lampwright's Crate, named for [[lampwright|the Lampwright]], though nobody thinks he packed it. It holds whole sets of towers: whitewash and red, granite courses, iron screw-piles on their legs, a squat Martello stone, sea glass, hoarfrost, ember light and corpse light, and three that are alive, their beams turning: <b>Northern Lights</b>, <b>The Maelstrom</b> and <b>The Drowned Light</b>, hung with weed. Every one of them fights the same. Whatever a keeper raises, their own colour stays on the gallery rail, the door and the pennant, so the two sides can always be told apart.",
  ]},
], also: ['lampwright', 'race', 'crates'] },
{ id: 'clashhands', t: 'The hands of the Race', cat: ['Factions'], box: [['Kinds', 'Troops, spells and buildings'], ['How many', 'Sixty-four, by the keepers\' count'], ['Paid in', 'Lamp oil'], ['Appears in', '[[ch_clash]]']], sum: "Everyone and everything that will cross the causeways for a keeper, and the tricks of the weather and the tide that a keeper can call down. The keepers count sixty-four, and each keeper brings eight of them to a fight.", secs: [
  { h: 'Who crosses', p: [
    "On foot: Mudlarks off the mudflats, Bilge Rats, Deckhands, Powder Monkeys with a lit cask, Wrecker Gangs and their Chief, the Press Gang, Smugglers, the Cutlass Bosun, the Anchor Swinger, Harpooners, Fishwives, the Lamplighter with her burning pole, the Head Keeper, the Ship's Surgeon, the Siren. From the sea: the Drowned Sailor, who rises once more, and the whole Drowned Crew; the Fog Wraith; [[diver|the Diver]]; [[mooncusser|the Mooncusser]] with his false light; the Kelp Horror and Kraken's Arm. The crabs: Shore Crabs, the Lobster Knight, the Hermit Crab, the Crab Mother, the Crab King and [[keelback|the Keelback]]. And the birds, over the water: gulls, puffins, the Cormorant, the Gannet, the Storm Petrel and the Sea Eagle, and the Will-o'-the-Wisp.",
  ]},
  { h: 'What a keeper calls down', p: [
    "A Signal Flare, a Cannon Shot, a Powder Keg, a Rogue Wave, [[haar|the haar]] itself, Brine Rain, a Whirlpool, a Tide Pull, Storm Glass, a Fair Wind, Lamp Oil to mend, and a Shipwreck that a Wrecker Gang climbs out of.",
  ]},
  { h: 'What a keeper builds', p: [
    "Sea Batteries, Swivel Guns, a Martello Tower, a Mortar Pit, a Burning Lens, a Fog Horn, a Bell Buoy, a Tar Barrel, a Wreckers' Fire that calls a wrecker to it, and an Oil Store, which keeps a keeper in oil as long as it stands.",
  ]},
  { h: 'Champions', p: [ "Above them all, a keeper may bring one champion: [[maren]] or [[plimsoll]]. A champion fights like any hand, but has a power of their own that a keeper can call on for a little oil." ] },
], also: ['ch_clash', 'tripledraft', 'racekeepers'] },
{ id: 'tripledraft', t: 'The triple draft', cat: ['Events'], box: [['Kind', 'A way of choosing hands'], ['Rounds', 'Eight, three offered each round'], ['Appears in', '[[ch_clash]]']], sum: "The custom of the Race when neither keeper trusts the other's hands. Each keeper comes with nobody, and the hands are offered on the shore three at a time. Each keeper takes one; the other two go home. After eight rounds, the fight begins.", secs: [
  { h: 'The rounds', p: [
    "Each round asks for something: a big hitter, something that can bring down birds (twice), a spell that strikes, two cheap hands, a building or a spell, and one where anything goes, in an order nobody knows beforehand. Both keepers are asked for the same thing each round, but never offered the same three, and each can see across the shore what the other is being offered, though never which one they take. No hand is offered to a keeper twice in one draft, and the champions are never offered at all: they come for a keeper, not for a draft.",
  ]},
], also: ['clashhands', 'ch_clash'] },
// ---------------- eras: the ages of the coast (the five acts of The Chronicle of the Light) ----------------
{ id: 'era_before', t: 'Before the Light', cat: ['Eras'], box: [["From", "c. 1200s"], ["To", "1841"], ["Lit by", "The fire on [[lanternrock]]"], ["Within it", "[[wreckingyears]]"]], sum: "The six hundred years when the only light on this coast was a fire on Lantern Rock, kept by one family. It was the age of the fire-keepers, the Spanish fort and the Mooncussers, and it ended the night the Skerry rock had a light of its own.", secs: [
  { h: '', p: [
    "It begins, as far as anyone can say, with [[firstfire|the First Fire]]. A Spanish squadron winters on the headland about 1597 and builds [[seafort|the sea fort]]. The wrecking years follow, with [[jagohanging|the hanging of Black Jago]] on the sea wall. By about 1790 [[wrackhaven]] is a busy fishing town. The age ends with [[lighting1841|the lighting of the Light]].",
  ]},
], also: ['era_light', 'firstfire', 'wreckingyears'] },
{ id: 'wreckingyears', t: 'The wrecking years', cat: ['Eras'], box: [["From", "The 1600s"], ["To", "The 1700s, and quietly after"], ["Who", "[[mooncussers]], [[wreckers]], [[garrison|the Spanish garrison]]"]], sum: "The parish ledgers' name for the two centuries when the Mooncussers hung false lights on the rocks to draw ships in, and the fort's governors hanged the ones they caught in chains on the sea wall.", secs: [
  { h: '', p: [
    "<i>On a night with no moon, a lantern on the rocks could look like a harbour.</i> Red and green lamps were the Mooncussers' trick, set to look like the mouth of a harbour. The best-known night of the age is [[jagohanging|the hanging of Black Jago]]. The trade went quiet rather than away: the wreckers of 1888 are its grandchildren, and its lights are still seen on the water. See [[wreckerslights]].",
  ]},
], also: ['mooncussers', 'jagohanging', 'era_before'] },
{ id: 'era_light', t: 'The Light', cat: ['Eras'], box: [["From", "1841"], ["To", "14 December 1887"], ["Lit by", "[[skerrylight]]"], ["Keepers", "Unrecorded, then [[keeper|Holm]] from c. 1879"]], sum: "The forty-six years Skerry Light burned as a light should, from the night the Lampwright lit it to the night its lamp went out with the Gannet coming in. The coast remembers them as the ordinary years, and there have been none since.", secs: [
  { h: '', p: [
    "It holds [[lighting1841|the lighting of the Light]], [[ch_original|the keeper's early watches]] when he swung the beam by hand, [[ch_links|the nine holes on the headland]] from about 1883, and its end, [[wreck1887|the Night of the Gannet]].",
  ]},
], also: ['era_before', 'era_strange', 'skerrylight'] },
{ id: 'era_strange', t: 'The Strange Year', cat: ['Eras'], box: [["From", "15 December 1887"], ["To", "14 December 1888"], ["Began", "When the sea froze to the horizon"], ["Recorded in", "[[log|The keeper's log]]"]], sum: "1888, the year after the Gannet, when the sea stopped being one sea. In it came [[plimsoll]], Maren on the water, [[knock]], [[verity]], the six seas, the visitors and the drifting crates, and it ended a year to the night with the Gannet rising.", secs: [
  { h: '', p: [
    "Its nights, in order: [[wrencomes|the Wren comes in]] (January), the loss of [[kittiwake|the Kittiwake]] (February), the voyages of [[ch_voyages|1888]] all year, [[seachests|the night of the sea chests]] and the other dark nights of [[ch_wreckers]], and [[ch_gannetswake|the Gannet's wake]] (14 December). The full list is in the [[timeline]].",
  ]},
], also: ['era_light', 'era_after', 'sixseas'] },
{ id: 'era_after', t: 'After the Gannet', cat: ['Eras'], box: [["From", "Winter 1888"], ["To", "Winter 1891"], ["Began", "When the drowned stopped waiting for ships"], ["Ended", "With [[fallwrackhaven|the fall of Wrackhaven]]"]], sum: "The three hard years after the Gannet rose, when the drowned came ashore for the station and the town, the wrecks went out onto the Wide Water, the haar took the outer rocks, and the sea itself went out for a night.", secs: [
  { h: '', p: [
    "It holds the siege of [[ch_lastlight|the keeper's station]] (winter 1888 to 1889), [[ch_fbsea|the freebooters]] of 1889, [[ch_fogrun|the fog run]] that autumn, [[drynight|the Dry Night]] of 1890, and [[fallwrackhaven|the fall of Wrackhaven]] in the winter of 1891.",
  ]},
], also: ['era_strange', 'era_years', 'timeline'] },
{ id: 'era_years', t: 'The Years After', cat: ['Eras'], box: [["From", "Undated"], ["To", "Still"], ["Who", "The people of every sea and year"], ["Prize", "The name of Keeper"]], sum: "The age that has no dates, after the sea came back up the Swallow full of nations. It is the age of [[reachwars|the Reach Wars]] and of [[race|the Race]], and of the night the Light was lit again.", secs: [
  { h: '', p: [
    "It holds [[ch_reach|the Drowned Reach]], [[relighting|the Light lit again]] and [[ch_clash|the rival lights]]. <i>The only things that never change,</i> the log says of it, <i>are the light, the shark in his shoes, and her.</i>",
  ]},
], also: ['era_after', 'reachwars', 'relighting'] },
];
