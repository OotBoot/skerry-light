# Skerry Light

A first-person night-sailing horror game for the browser. You have the helm of a small brig coming in under the cliffs at Skerry Light. The water is full of rocks, old wrecks and drifting timber, and you only see them when the lighthouse beam sweeps over them. As soon as it moves on they start to fade, and 3 seconds later they're gone.

## The story

In the winter of 1887 the lamp at Skerry Light failed. The keeper's wife, **Maren Holm**, rowed out with a lantern to warn the brig *Gannet*. The *Gannet* broke up on the skerries with all hands, and Maren's skiff came back empty.

She still stands on the water when the lamp turns, a little nearer your bow every time. If she reaches you, she comes aboard.

The only thing she will not go near is **Plimsoll**, the shark who walked up out of the surf that same winter wearing the *Gannet* cabin boy's blue shoes. He knows the deep water through the skerries and walks ahead of ships to the harbour. Each harbour you reach unlocks another page of the keeper's log.

## How to play

| | |
|---|---|
| Steer | ← → or A / D. On a phone, hold the left or right third of the screen |
| Sail | ↑ ↓ or W / S. On a phone, hold the middle to shorten sail |
| Ring the bell | Space or B, or the bell button |
| Sound | M, or the sound button |
| Speed | ▲ ▼ buttons on the left, hold to change sail (or ↑ ↓). There's no top speed: the longer you hold ▲, the faster it climbs. She picks up speed and slows down almost at once |
| Flare | F, or the flare button |
| Xbox controller | Left stick or D-pad steer · RT faster, LT slower · A bell · X flare. In menus: the left stick moves an on-screen cursor and A clicks what it's over, the right stick scrolls, and the D-pad jumps between buttons; A to press, B to close or go back, Start for the main button, Y for crates. RB watches the next crewmate when spectating. Hits and jumpscares rumble |

- **Maren** comes one stage nearer every 6 seconds or so on the first voyage (a little longer each voyage, up to 11): 400 m, 260, 160, 90, then right at the bow, and one more step after that she takes the ship. Between turns she slowly follows your ship, so sailing hard can buy you some distance. You hear her heartbeat and see red at the edges as she closes in.
- **Plimsoll**: while you are within 45 m of him, Maren holds where she is (she doesn't fall back), so you have to sail close behind him. He keeps pace with your ship at any speed, keeping further ahead the faster you go, and runs to get back in front if you overtake him. He waits only about 4 seconds for a ship that falls behind, then walks on alone. He sometimes snaps up a drowned sailor he walks into.
- **The bell** drives Maren back three stages when she is anywhere ahead of you (or anywhere at all once she is close), sinks the drowned within 150 m, and freezes Knock for 20 seconds within 450 m. It swings again in 15 seconds, one more for each voyage.
- **The drowned** crew of the Gannet swim after you at about 5 m/s, faster on later voyages. Several are out at once, more each voyage. Their eyes always catch the light. One that reaches a ship going under 9 knots climbs aboard and costs a plank; faster ships shake them off. Plimsoll sometimes snaps up one he walks into.
- **Knock**, the Gannet's walking figurehead, moves only while you can't see him. Listen for three knocks on wood (you can hear him from about 650 m, quicker and louder as he nears), turn to face him, and he stops: within 150 m facing him is enough even in the dark, and further off any light on him will do. He is a little faster than your ship, so running only buys time. If he reaches the hull his face lunges at you and he strikes for a plank, then he's thrown far back and waits 30 seconds; if that blow sinks her, the voyage ends. The bell freezes him for 15 seconds within 300 m. One Knock at a time at first, up to two on later voyages.
- **The lighthouse** sweeps round about every 6.5 seconds on the first voyage, a little slower each voyage (up to 9 seconds). Maren keeps her own pace, so the faster beam just shows you more.
- **Flares** light everything within 350 m for about seven seconds, for your whole crew, then take 35 seconds to reload.
- **Hull and collisions**: your hull is a capsule from bow to stern, so the whole length of the ship can touch things, not just the bow. Anything you touch pushes you clear. Hitting a rock, wreck, log, wall, the shore or a pier head-on (closing faster than 4.5 m/s at more than about 25°) costs a plank; a glancing touch only scrapes, slowing you and turning you along it. Crewmates' ships bump apart without damage. The drowned and Knock also cost planks. When the planks run out she sinks.
- **Verity** sometimes appears small in a bottom corner of your deck, facing you: a round yellow smiling orb that says it wants to help. He just stands there smiling, with a ring counting down 20 seconds. The bell does nothing to him: fire a flare before then and he rolls back over the rail into the water (he comes back later). Leave him and he stands up into something long and thin standing in that corner, and that jumpscare ends the voyage. He first turns up 20 to 40 seconds into a voyage and comes back 30 to 55 seconds after you send him off (about twice as often in the Backrooms).
- **The Backrooms**: one voyage in twenty (rolled from the crew's seed, so a whole crew goes in together), the lights go out and the sea comes back with walls. It's a flooded maze of yellow rooms under buzzing tubes that go dark each time the lamp would have turned. Plimsoll knows the way to the green EXIT sign, and the bearing strip points at it. Maren, the drowned, Knock and Verity all follow you in. Add `?backrooms` to the address to force one (solo only).
- **The sea**: voyages start about 2.4 km out (further each voyage), through a wide stretch of skerries, wrecks and drifting timber.
- **Harbour**: steer between the real red and green pier lamps. Each voyage after that has more rocks, wreckage and drowned, and the beam turns slower.

## Boats

Choose your boat with the Brig / Cutter / Barque picker on the title, harbour, end and crew screens, or from the shipyard at the top of the **Crates** screen. Your choice is kept on this device, and your crew sees which boat you're sailing.

| Boat | Hull | Acceleration | Steering | |
|---|---|---|---|---|
| Brig | 3 | normal | normal | the all-rounder, two masts |
| Cutter | 2 | 1.7× | 1.4× | small and quick, one tall mast |
| Barque | 5 | 0.8× | 0.9× | long and heavy, three masts, and a bow gun |

Each boat has its own deck and bow as you see them from the helm, and its own length and rig as your crew sees it.

The Barque's **bow gun** fires by itself when you're about to run onto a rock, blowing it apart before you hit. It only fires at rocks close ahead (about a second and a half of sailing, at most 45 m) and takes 3 seconds to reload after each shot; the *Bow gun* marker under your hull fills up as it reloads. In a crew, a rock it destroys is gone for everyone.

## Crates, skins and pennants

Every voyage you play earns a **Skerry Crate** if you go down, and if you make harbour, **5** on voyage 1, then the Fibonacci sequence for each voyage in a row (8, 13, 21, 34, 55... up to 4,181 from voyage 15 on); a sinking starts the streak over at voyage 1. About a dozen floating crates (look for their lanterns, pillars of golden light, and the gold diamonds on the bearing strip) are scattered around each voyage: sail into one to haul it aboard. Make harbour and each one you're carrying is worth **two** more crates; sink and they go down with the ship. Any crate can hold any item:

- **Boat skins** for all three boats (34 Brig, 12 Cutter, 12 Barque). Each boat keeps its own equipped skin. A skin changes your deck, rails, bowsprit and lantern as you see them, and your hull and sails as your crewmates see them; crewmates' ships are lit by their own lanterns, so you can make out their skins from about 300 m away.
- **Flags**: 20 pennants, which fly from a staff at the tip of your bowsprit (and from your masthead for your crew) on any boat.
- **Flare colours**: 12 of them, from Magnesium White and Green Star to Pier Lamps (red and green), Gold Rain (sparks) and Aurora (cycles through colours). Your crew sees your flares in your colour.

Your first crate is free. The Crates screen shows how many you have, with an Open button, and tabs for your boat skins, flags and flares. A reel spins and lands on your prize. With two or more crates, **Open all** opens the lot at once (same odds) and shows the haul: how many of each grade, your best pull, and every new item. Every crate uses the same five grades: **Deckhand** (sky blue) 79.9%, **Bosun** (violet) 16%, **Mate** (pink) 3.2%, **Captain** (red) 0.64% and **Admiral** (gold) 0.26%. Crates saved by older versions become Skerry Crates.

**Keeping your loot.** Your crates and cosmetics are saved in your browser. Links opened inside other apps (Discord, Snapchat, Instagram, Messages), private windows and cleared site data start with an empty save, so the Crates screen has a **save code**: tap *Copy my save code*, keep it somewhere, and paste it with *Load a save code* in any other browser or phone to bring everything across. Loading a code never takes anything away; you keep every item from both. On claude.ai, your save is also kept in your claude.ai account automatically.

Gold (Admiral) items only ever appear in the reel when one is your prize, so if you see gold scroll past, it's yours. The chance of gold is still 0.26%.

Crates and loot are kept in your browser on that device.

## Sailing together

Up to eight people can sail as a crew. Each of you sails your own brig through the same skerries, and you can see each other's ships and lanterns, hulls and bells.

- On the title screen, one person picks **Start a crew** and sends the **invite link** from the crew screen; opening it joins that crew straight away. Others can also pick a crew from the list, or use **Find me a crew** to join any crew with a free berth.
- The crew screen has a **chat** for planning between voyages, and messages also appear in the in-game log.
- The host (whoever started the crew) sets sail when everyone is in. Anyone who joins later sails straight in on the current voyage.
- **Ships within 55 m of each other keep Maren where she is**, the same way Plimsoll does.
- **Sailing in company**: stay within 45 m of a crewmate for 10 seconds and your carpenters patch a plank.
- **A bell rung within 160 m of a crewmate** drives her back two stages on their ship too.
- **Flares** light the water for everyone.
- **Spectating**: once you sink, are taken or make harbour, you can watch a crewmate's voyage from their deck until the voyage ends, and once per voyage you can **ring a bell for them**, driving their Maren back a stage.
- **Scoreboard**: at the end of each voyage the crew screen shows each ship's outcome, time, hits, bells, flares, planks patched and drowned fed to Plimsoll.
- **Reconnecting**: if a connection drops, the game reconnects by itself and carries on with the same crew.
- A voyage ends when every ship has made harbour or gone down. If anyone made it, the crew goes on to the next voyage. If nobody did, the host can start again from voyage 1.

Crews connect in one of two ways:

- **On your own website**, through the crew server in `server/`. Anyone with the link can join, with no sign-in. Players type a name on the title screen so their crew knows who is who.
- **On claude.ai**, through the artifact `room` capability, for people who are signed in and can see the artifact. Visitors from a public link get the solo game there.

If neither is available (for example, the file opened straight from your computer), the game plays solo.

## Putting it on a website

### Game and crews together (recommended)

`server/server.js` serves the game and runs the crew connection from the same address, so one deployment gives you a link anyone can open and play together. It uses only Node's standard library (Node 18 or newer), so there is nothing to `npm install`.

Try it on your own computer first:

```
npm run build
npm start
# open http://localhost:8080 in two or three browser windows
```

To put it online, use any host that runs a Node web service and allows WebSockets, such as Render, Railway or Fly.io. On Render, for example:

1. Put this folder in a GitHub repository.
2. In Render, create a **Web Service** from that repository.
3. Set the **Build Command** to `npm run build` and the **Start Command** to `npm start`.
4. Deploy, then share the address Render gives you.

The server reads the port from the `PORT` environment variable, which these hosts set for you. `MAX_PLAYERS` (default 300) caps how many people can be connected at once. Nothing is stored on disk; restarting the server just empties the lobby. `/healthz` reports how many players are connected.

### Game on a static host, crews on a separate server

If you'd rather put the game on itch.io, Netlify or GitHub Pages, run the server somewhere as above and point the game at it:

1. In `src/config.js`, set `SERVER` to your server's WebSocket address, for example `'wss://skerry-light.onrender.com/ws'`.
2. Run `npm run build`.
3. Upload `dist/skerry-light.html`, renamed to `index.html`. On itch.io, zip it first and upload it as an HTML game.

You can also point any copy at a server without rebuilding by adding `?server=wss://your-server/ws` to the page address. A page served over `https` must use a `wss://` address.

### Solo only

Upload `dist/skerry-light.html` anywhere that serves static files. Everything it needs is inside that one file; the crew section on the title screen will say it is solo only.

### Working on the source

`index.html` loads the files in `src/` separately, so you can edit them and reload. Serve the folder (for example `python3 -m http.server 8000`) and open it in a browser; crews won't connect there, since that server has no `/ws`. After changing anything in `src/` or `assets/`, run `npm run build` to update `dist/`.

## Project layout

```
index.html          page markup; loads the stylesheet and scripts below
src/style.css       HUD, cards and buttons
src/config.js       tuning numbers, asset paths and the keeper's log
src/audio.js        sound, made with the Web Audio API (plus Verity's voice clip)
src/world.js        voyage generation (sea and Backrooms) and Plimsoll's pathfinding
src/render.js       the camera, sea, obstacles, lighthouse, deck, bearing strip and jumpscare
src/gfx.js          the detailed look: sky, moon, clouds, sea glitter, coast, lighthouse, rocks, deck, drizzle, vignette, grain
src/creatures.js    Maren and Plimsoll: behaviour, animation and drawing
src/enemies.js      the drowned crew and Knock
src/verity.js       Verity, on your deck, and his jumpscare
src/cannon.js       the Barque's bow gun
src/gamepad.js      Xbox and other controllers
src/game.js         game state, update step, input and screens
src/transport.js    connects to the crew server outside claude.ai
src/net.js          crews: lobby, shared voyages, crewmates' ships
src/crates.js       boats, crates, skins and pennants
src/main.js         starts the main loop
assets/maren.png    Maren cutout
assets/plimsoll.png Plimsoll cutout
assets/knock.png    Knock cutout
assets/verity.png   Verity, smiling
assets/verity2.png  Verity, standing
assets/verity.mp3   Verity's voice
tools/build.mjs     bundles everything into dist/
server/server.js    serves the game and relays crew traffic
server/ws-lite.js   small built-in WebSocket implementation for the server
package.json        build and start commands
dist/               built single-file versions
```

The scripts in `src/` are plain browser scripts that share one global scope, loaded in the order listed.
