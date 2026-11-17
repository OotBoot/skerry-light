#!/usr/bin/env python3
"""The Chronicle of the Light's Stable Audio jobs, for tools/sfx/comfygen.py: its music and its sound effects.

    python3 tools/sfx/cpjobs.py <cues.json from tools/sfx/cpnotes.py> <music jobs out> <sfx jobs out>

The music: the campaign's shared keys (CP_MUSIC_FALL in src/cp.js) with prompts of their own, and only those of the
missions' own keys in OWN (95 s takes for a loop, 70 s for one played once, three takes each). The owner asked for
music to be reused as much as it can be, so every other mission key goes on playing what it falls back to (a shared
key, or another game's track), as set in its mission's file. The sound
effects: "realistic foley recording" and the notes' description (its bracketed asides left out), at the length
in SFXLEN (4 s otherwise), three takes each; none already recorded, and never the bell (kept synthesised).
"""
import json, re, sys

SHARED = {
    'cptense': (False, 'tense suspense on a dark coast at night, a low string ostinato, a soft frame drum pulse, wind and distant surf, uneasy and steady, 90 bpm, loopable'),
    'cpsail': (False, 'a brisk sea shanty sailing at night, fiddle and concertina, a stamping rhythm, creaking rigging and waves against the hull, 104 bpm, loopable'),
    'cpfight': (False, 'a driving folk battle on a rocky shore at night, pounding war drums, a fierce fiddle and low brass, urgent and steady, 112 bpm, loopable'),
    'cpboss': (False, 'a heavy dark boss battle by the sea, huge drums, low growling brass, a wailing choir, a hurdy-gurdy drone, menacing, 96 bpm, loopable'),
    'cpsad': (False, 'a melancholy lament at dawn by the sea, solo cello over soft strings, gentle waves, slow and quiet, 64 bpm, loopable'),
    'cpfog': (False, 'eerie fog at sea, a low drone, a slow lonely concertina, a far-off fog horn, creaking wet timber, quiet and tense, 70 bpm, loopable'),
    'cpwin': (True, 'a short triumphant maritime folk finale, fiddle and full strings rising to a warm major chord, drums, a ship horn, waves, hopeful'),
    'cphope': (True, 'a hopeful closing theme as dawn breaks over a lighthouse, a solo fiddle, then warm strings and a horn swelling slowly, gentle waves, bittersweet'),
}
SFXLEN = {'gibbet_chain': 10, 'winchclank': 8, 'sleetglass': 10, 'wickcough': 8, 'wade': 8, 'c12tide': 10, 'rchflood': 10,
          'floodrush': 8, 'c12surge': 8, 'icefreeze': 7, 'shipstrike': 6, 'rchship': 10, 'candles': 7, 'beaconcatch': 7,
          'rchbeacon': 7, 'fireroar': 6, 'fkgaze': 6, 'beamswing': 7, 'clockwind': 6, 'rchwind': 6, 'ropecreak': 6,
          'oars': 8, 'rchoar': 8, 'bellpeal': 8, 'c12bellwreck': 7, 'rchbell': 7, 'gallerybell': 6, 'coghorn': 6,
          'kwcapstan': 7, 'ladderclimb': 6, 'kwbell': 4, 'whisper': 4}
HAVE = {'bell', 'bellfar'}

d = json.load(open(sys.argv[1], encoding='utf-8'))
music, seed = [], 20000
OWN = {'cpm02cove', 'cpm03light', 'cpm14keep'}   # (the Spanish cove, the Light first lit, the last hymn: nothing else fits)
for m in d['music']:
    if m['key'] not in OWN: continue
    music.append({'name': m['key'], 'prompt': m['prompt'].strip('"'), 'seconds': 70 if m['once'] else 95, 'takes': 3, 'seed': seed, 'once': m['once']}); seed += 101
for k, (once, p) in SHARED.items():
    music.append({'name': k, 'prompt': p, 'seconds': 70 if once else 95, 'takes': 3, 'seed': seed, 'once': once}); seed += 101
sfx, seed = [], 50000
for s in d['sfx']:
    if s['name'] in HAVE: continue
    desc = re.sub(r'\s*\([^)]*\)', '', s['desc']).strip(' .;')
    sfx.append({'name': s['name'], 'prompt': 'realistic foley recording, ' + desc[0].lower() + desc[1:], 'seconds': SFXLEN.get(s['name'], 4), 'takes': 3, 'seed': seed}); seed += 101
json.dump(music, open(sys.argv[2], 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
json.dump(sfx, open(sys.argv[3], 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(len(music), 'music,', len(sfx), 'sfx')
