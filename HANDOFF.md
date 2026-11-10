# Skerry Light: handoff for a new conversation

Paste this into the new conversation, or point it at this file in the repo. It covers where everything lives, how it's built, tested and deployed, the rules the owner has set, and what was done most recently.

## 1. What it is

**Skerry Light** is a browser game: plain JavaScript, three.js, Web Audio, and a small Node server. It has four modes, each named in the possessive style:

| Mode | What it is | Main source files |
|---|---|---|
| **Skerry Light** | First-person night sailing horror. Maren, Plimsoll, Knock, Verity, 21 enemies, biomes, far seas | `game.js`, `world.js`, `enemies.js`, `creatures.js`, `biomes.js`, `verity.js`, `odyssey.js`, `nether.js`, `ship3d.js`, `render.js`, `gl3d.js`, `sky.js` |
| **Wreckers' Night** | Multiplayer FPS on the islands, with weapon crates | `fps*.js`, `wcrates.js` |
| **Drowned Reach** | A war for the islands, with banner crates | `war.js`, `warnet.js`, `warview.js` |
| **Keeper's Last Light** | Round-based zombies inside the lighthouse. **The code calls it "the Lighthouse"** | `zombies.js`, `zm*.js` |

There are also shared files:
- Crates and cosmetics: `crates.js`, `ocrates.js`, `rcrates.js`, `wcrates.js`, `skinfx.js`
- Co-op crews: `net.js`, `transport.js`, `roster.js`, `server/ws-lite.js`
- Audio: `audio.js` (synth sounds) and `sfxbank.js` (samples)
- Cloud saves and scores: `cloudsave.js`, `scores.js`

`README.md` is the full player-facing manual and is kept up to date with every feature. Update it when you add one.

## 2. Where it lives

- **Repo:** GitHub `OotBoot/skerry-light`, branch `main`. The working copy in the old session was `/home/claude/skerry-light`.
  - The last commit is `4bb94c0`, "Merge branch 'wt-light'".
  - All work is pushed.
- **Live site:** https://skerry-light.onrender.com
  - Render web service `srv-dbf7ckfb9u1s73bssc8g`, workspace `tea-dbf77829lscs7392bea0`, Oregon, free tier.
  - Render **auto-deploys on every push to main** and takes a minute or two.
- **claude.ai artifact:** https://claude.ai/artifact/4abbzGK8dMDsPyR5KdssJv (at version 152).
  - It's republished from `dist/artifact.html` after every change, by publishing to that `url`.
  - On claude.ai, saves go to the player's claude.ai account rather than the cloud save.
- **Database:** Upstash Redis `skerry-light`.
  - ID `bb43e769-cf03-43c8-aeab-b82e4abad3c2`, endpoint `equipped-sole-189547.upstash.io`.
  - It's free and used for both the scoreboard and cloud saves.
  - The Render env vars `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are already set.
- **Connectors used:** the Render MCP and the Upstash MCP are both connected to the account.

## 3. Build, run, test, ship

```bash
npm run build      # node tools/build.mjs -> dist/ (inlines every src script and assets/sfx/*.mp3 into one page)
npm start          # node server/server.js, http://localhost:8080 (game + crews + /api/save + scores)
npm run dev        # both
```

- **Build quirks** (`tools/build.mjs`):
  - It inlines the `<script src>` tags from `index.html`, so **a new src file needs its own script tag in index.html**.
  - Sound files are inlined only if their path appears as a literal string. That's why `src/sfxlist.js` is generated, never hand-edited.
- **Server** (`server/server.js`):
  - Serves the built page Brotli/gzip-compressed, with an ETag and 304 responses (about 3.9 MB on first load, 304 on revisits).
  - Also routes `/api/save` (`server/saves.js`) and the scoreboard (`server/scores.js`).
- **Testing:** headless Playwright is installed in the container, via `require('playwright')`. Don't reinstall it.
  - The old session used a Python helper (`zmh.py`: start / SIM / SHOT / snap) and a smoke test (`sfxcheck.js`). Both were in the old session's scratchpad, so they are **gone**. Rewrite small ones as needed: load `dist/index.html` or the local server, drive the game's globals from `page.evaluate`, take screenshots, and fail on page errors.
  - Gotchas: the test SIM doesn't tick the iframe. `zmNearest` returns nothing (read `ZM.prompt` instead). `zmlUse` needs `{k:'lamp'}`.
- **Ship it** after every change:
  1. Build.
  2. Test (no page errors, plus screenshots of what changed).
  3. Commit and push to main (Render deploys).
  4. Republish the artifact from `dist/artifact.html`.
  5. Send the user the relevant screenshots.
- **Commit trailer:**
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: <the new session's URL>
  ```
- **Parallel agents:** use git worktrees (`git worktree add -b wt-X /home/claude/wt-X main`), one per job, then merge each into main. Rebuild and retest the merge, then remove the worktrees and branches.

## 4. The owner's standing rules

1. **Never slow the boats** (top speed or acceleration).
2. **All content must be original.** No copied characters, music or art.
3. **Agents:** when using sub-agents, use Opus at medium effort. "Use as many agents as needed" was said for big batches.
4. **ComfyUI:**
   - Add sounds however you like, but **the owner must be able to use the laptop at the same time**.
   - Use ComfyUI's HTTP API at `http://127.0.0.1:8188` through the **built-in browser tools on the linked computer**. Never take over the screen with computer use.
   - The owner starts ComfyUI themselves; ask them to if it's not reachable.
5. **Keep the old synth bell sound** as the bell (`SKIP = {'bell','bellfar'}` in `tools/sfx/process.py`; `audio.js` uses the synth).
6. **The Easter egg is a surprise:** never describe its steps to the user, in chat, in the README or in commit messages. Implementation notes in code comments are fine.
7. **The owner's preferences:** short replies, screenshots of changes, and plain language.

## 5. Audio pipeline

- **Samples:**
  - 58 sounds in `assets/sfx/*.mp3`, about 2.7 MB, named `name_N.mp3`.
  - `sfxbank.js` holds `sfxPlay`, `sfxHas` and the ambient loops. It never plays the same take twice in a row.
  - `sfxAnnounce(key, text)` plays `vo_<key>`, or falls back to speechSynthesis.
- **Generating sounds:**
  - Stable Audio 3 in ComfyUI: `CheckpointLoaderSimple stable_audio_3_medium` + `CLIPLoader t5gemma` (type `stable_audio`), KSampler 8 steps, `lcm`, cfg 1, `SaveAudio` to `output/skerry/…`.
  - Bring outputs into the container with the device bridge's stage-files tool.
  - (`/upload/image` with `type=output` can also put arbitrary files into ComfyUI's output folder.)
- **Processing scripts:**
  - `tools/sfx/process.py`:
    - Trims, levels, sets loops and lowpass tone, and writes the mp3s plus `src/sfxlist.js`.
    - Its config: `LEN`, `PEAK`, `LOOPS`, `NOTRIM`, `SKIP`, `TONE`; the boss tracks are at 112 kbit/s.
    - Run it on an **empty folder** just to regenerate `sfxlist.js`.
  - `tools/sfx/voice.py`: the power-up announcer, from Kokoro TTS (kokoro-js 1.2.1 run in the browser). Its effects chain: rubberband pitch 0.78, an octave-down double, a soft clip, echo, loudnorm.
  - `tools/sfx/music.py`: the boss themes. It finds the beat, cuts a bar-aligned loop of about 40 s, crossfades the seam over 1.5 s, and keeps the better take.
- **Boss themes** (`src/zmtheme.js`):
  - `bossdiver`, `bossmoon` (a waltz) and `bosscrab`. A round with several boss kinds picks one at random.
  - In co-op the host picks and sends it as `bm`.
- **Container limits:** pip, npm and apt registries were blocked by the proxy in the last session. ffmpeg and numpy were available.

## 6. Keeper's Last Light (the Lighthouse)

The game logic is host-authoritative for co-op (`zmnet.js`): `znHostSend` / `znApply`, with requests sent via `zmnRequest`. A new networked object needs its kind added to `ZN_KIND`.

The source files:
- **`zombies.js`:** the core.
  - Rounds, rooms and doors (`zmOpen`), windows and boards (deep-knock sounds), perks (`ZM_TONIC`, the tonic machines `zm3dTonics`), and points.
  - The power-up announcer is called in `zmTake`.
  - The lighthouse 3D model is built in `zm3dLantern`: the lamp room, a 15-tread iron staircase, the windowless Roof Room, and a single beam.
- **`zmswarm.js`:** crab swarm rounds.
  - `ZWC`: from round 5, then every 6 rounds, with 1.5× as many enemies.
  - Crabs pour out of the windows and sea ladders. The last crab drops a Powder Keg (max ammo).
- **`zmlamp.js`:** the Roof Room lever (`ZML`).
  - The beam is **off by default**. The lever costs 5,000, then +2,500 each pull, and the price resets each night.
  - It lights the lamp for 15 s, with the beam turning once every 3 s. It kills zombies and crabs within 8°, on any floor, and takes 20% off a boss per pass. Kills (60 points) go to whoever pulled it.
  - It needs the `top` room open, and can't be pulled while lit.
- **`zmboss.js` / `zmboss2.js`:** the three bosses (the Diver, the Mooncusser, the Keelback).
- **`zmpap.js`:** Pack-a-Punch, the Lampwright's Bench (a Fresnel lens wheel over a furnace).
  - The **galaxy skins** are a shader injected via `onBeforeCompile` (`ZMP_FRAG`, pattern scale `zmpP*55.0`).
  - Each tier has its own nebula colour (`ZMP_GALAXY`): I cyan, II magenta, III emerald, IV gold, V crimson, VI lime, VII ultraviolet, VIII+ spectrum.
  - Helpers: `zmpGalaxy(t)`, `zmpLook(id,t)`.
- **`zmchest.js` / `zmchestvm.js`:** the mystery chest.
- **`zmegg.js`:** the Easter egg.
  - Its props are detailed on purpose, with pulsing glints and a halo.
  - **Don't spoil it to the user.**
- **Perk machines:** each is an 1880s apothecary cabinet with its own crest (Stout Heart, Quick Hands, Fleet Foot, Second Wind, Grog).

## 7. Saves and the scoreboard

- **Local save:** `crates.js` `saveData()` and `mergeSave()`. Saves are always merged and never replaced.
  - Weapon, outfit and rig data come in through `crOther` (`wcMerge`, `ocMerge`, `rcMerge`, `boardMerge`).
  - The save code packs w, q, r, s and u, and the load button also accepts SKR codes.
- **Cloud save:**
  - Client (`src/cloudsave.js`, `var CS`):
    - Each browser gets a recovery code, `SKR-XXXX-XXXX-XXXX-XXXX`.
    - It pushes a few seconds after changes and pulls every 3 minutes or when the tab comes back into view. A 409 response means merge and retry.
    - `#code=` links load a save. On claude.ai it's off.
  - Server (`server/saves.js`):
    - `POST /api/save` with op `get` or `put`, using a Lua compare-and-set and a SHA-256 key.
    - 48 KB max, 400-day expiry, 40 requests per minute per IP.
- **Scoreboard:**
  - Client (`src/scores.js`):
    - Saves feed it automatically. It shows the top 3 for each of the four games, with a Top 10 toggle.
    - Usernames are kept on the device.
    - The `x-board-id` header (sha256 of `'skerry-board:'+code`) marks the player's own rows.
    - Sends are serialized, with a `skerry-board-used` list to prevent duplicates.
  - Server: `server/scores.js`.
  - Placement: the board card is at the top of the title card, under the banners.
- **Past bugs to avoid:**
  - TDZ crashes from load order. That's why `CS` is a `var`, and why `boardBests` and `boardNick` are function declarations.

## 8. Recently finished (all live)

- **Sound overhaul:** ComfyUI sounds, the announcer voice, deep-thud boards, varied zombie sounds.
- **Gameplay:** crab swarm rounds.
- **Visual fixes:** the Quarters windows (clipping and frames).
- **Saves and the scoreboard:** cloud saves, the scoreboard rework, the mode renames, the banners above the board.
- **Music and server:** boss themes, server compression.
- **Pack-a-Punch:** galaxy skins.
- **Detail pass:** Easter egg props and glints, detailed perk machines, a detailed Pack-a-Punch bench.
- **Lighthouse:** the beam off by default, the staircase, the Roof Room lever, a single beam.

**Nothing is pending.** The owner once asked how much work an Apple App Store release would be (answered, not started).

## 9. Tips for the next session

- Read `README.md` and the comment at the top of each relevant `src` file first. Files open with long explanatory comments.
- The code style is dense one-liners and British spelling, with comments in plain prose. Match it.
- The browser and ComfyUI need the linked computer. If its tools are missing, ask the owner to open the chat in the Claude desktop app.
