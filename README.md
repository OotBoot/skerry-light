# Skerry Light

A first-person night-sailing horror game for the browser. You have the helm of a small brig coming in under the cliffs at Skerry Light. The water is full of rocks, old wrecks and drifting timber, and you can only see them while the lighthouse beam is on them. The moment it moves on, they are gone.

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
| Speed | ▲ ▼ buttons on the left, hold to change sail (or ↑ ↓) |
| Flare | F, or the flare button |
| Shout to crew | 1 Rocks here! · 2 Follow me! · 3 She's near me! |

- **Maren** comes one stage nearer every half turn of the beam: 340 m, 220, 130, 70, then right at the bow, and one more half turn after that she takes the ship. Between turns she keeps pace with you, and at the last stages she drifts into your path. You hear her heartbeat and see red at the edges as she closes in.
- **Plimsoll**: while you are within 75 m of him, Maren holds where she is (she no longer falls back). He waits about 7 seconds for a ship that falls behind, then walks on alone.
- **The bell** drives Maren back two stages, but only if she is in front of you, and it takes 26 seconds (more on later voyages) to swing again. It also sends nearby drowned back under.
- **The drowned** crew of the Gannet swim after you at about 5 m/s, faster on later voyages. Their eyes always catch the light. One that reaches a ship going under 9 knots climbs aboard and costs a plank; faster ships shake them off. Plimsoll eats any he catches.
- **Knock**, the Gannet's walking figurehead, moves only while you can't see him. Listen for three knocks on wood (quicker and louder as he nears), turn to face him, and keep him in the beam, your lantern or a flare: he can't move while he's in your view and lit. If he reaches the hull he strikes it for a plank and is thrown back into the dark. The bell freezes him for 8 seconds. From voyage 4 there are two of him.
- **Wreckers' false lights** are red and green lamps like the harbour piers, hung over a cluster of rocks off the true course. The lighthouse beam makes them vanish, and the bearing strip always shows the real harbour.
- **Flares** light everything within 170 m for about seven seconds, for your whole crew, then take 35 seconds to reload.
- **Hull**: rocks, wrecks, drifting timber, the shore, the piers and the drowned each cost a plank. Three and she sinks.
- **Harbour**: steer between the real red and green pier lamps. Each voyage after that has more rocks, wreckage and drowned, and the beam turns slower.

## Sailing together

Up to three people can sail as a crew. Each of you sails your own brig through the same skerries, and you can see each other's ships and lanterns, hulls and bells.

- On the title screen, one person picks **Start a crew** and sends the **invite link** from the crew screen; opening it joins that crew straight away. Others can also pick a crew from the list, or use **Find me a crew** to join any crew with a free berth.
- The crew screen has a **chat** for planning between voyages, and messages also appear in the in-game log.
- The host (whoever started the crew) sets sail when everyone is in. Anyone who joins later sails straight in on the current voyage.
- **Ships within 55 m of each other keep Maren where she is**, the same way Plimsoll does.
- **Sailing in company**: stay within 45 m of a crewmate for 10 seconds and your carpenters patch a plank.
- **A bell rung within 100 m of a crewmate** drives her back a stage on their ship too.
- **Flares** light the water for everyone, and **shouts** (1, 2, 3) show over your ship on your crewmates' screens with how far away you are.
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
src/audio.js        all sound, made with the Web Audio API (no audio files)
src/world.js        voyage generation and Plimsoll's pathfinding
src/render.js       the camera, sea, obstacles, lighthouse, deck, bearing strip and jumpscare
src/creatures.js    Maren and Plimsoll: behaviour, animation and drawing
src/enemies.js      the drowned crew, Knock and the wreckers' false lights
src/game.js         game state, update step, input and screens
src/transport.js    connects to the crew server outside claude.ai
src/net.js          crews: lobby, shared voyages, crewmates' ships
src/main.js         starts the main loop
assets/maren.png    Maren cutout
assets/plimsoll.png Plimsoll cutout
assets/knock.png    Knock cutout
tools/build.mjs     bundles everything into dist/
server/server.js    serves the game and relays crew traffic
server/ws-lite.js   small built-in WebSocket implementation for the server
package.json        build and start commands
dist/               built single-file versions
```

The scripts in `src/` are plain browser scripts that share one global scope, loaded in the order listed.
