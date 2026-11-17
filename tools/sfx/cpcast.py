#!/usr/bin/env python3
"""The Chronicle of the Light's voices: who speaks with which Kokoro voice, and how each is coloured afterwards.

    python3 tools/sfx/cpcast.py <cues.json from tools/sfx/cpnotes.py> <voice jobs out>

Each speaker (by the name the notes give) gets a Kokoro voice (kokoro-js 1.2.1, Kokoro-82M v1.0), a pace, and a
colour for tools/sfx/cpvoice.py: a pitch (below 1 lower and slower, tape-style), and a room ('dry', 'room', 'far'
for a shout across water, 'ghost' for the drowned and the uncanny, 'fog' for the Fog-Keeper). Characters who come
back keep their voice from mission to mission. Each line's pace is nudged by its direction: shouts a touch quicker,
whispers and weary lines slower.
"""
import json, re, sys

# name (as the notes give it, folded): (voice, speed, pitch, room)
CAST = {
    "the keeper's log": ('bm_george', 0.9, 0.95, 'dry'),
    "the keeper's log (holm reading)": ('bm_daniel', 0.92, 0.97, 'dry'),
    'holm': ('bm_daniel', 1.0, 0.97, 'room'),
    'maren': ('bf_isabella', 0.92, 0.98, 'ghost'),
    'the lampwright': ('bm_fable', 1.0, 1.0, 'room'),
    'the fire-keeper': ('am_onyx', 0.92, 0.88, 'room'),
    'wenna': ('bf_lily', 1.05, 1.04, 'room'),
    'the shipmaster': ('am_eric', 1.05, 0.95, 'far'),
    'the last fire-keeper': ('bm_lewis', 0.88, 0.9, 'room'),
    'the fog-keeper': ('bm_lewis', 0.85, 0.84, 'fog'),
    'a lookout': ('am_liam', 1.05, 1.0, 'far'),
    'the governor': ('bm_george', 0.95, 0.9, 'room'),
    'sergeant ybarra': ('am_michael', 1.0, 0.94, 'room'),
    'black jago': ('am_puck', 0.95, 0.86, 'room'),
    'a mooncusser': ('am_echo', 0.95, 0.85, 'room'),
    'the foreman': ('am_adam', 1.02, 0.96, 'room'),
    'a voice off the sea': ('af_nicole', 0.85, 0.95, 'ghost'),
    "the wren's master": ('am_fenrir', 1.0, 0.92, 'room'),
    'a hand off the wren': ('am_liam', 1.05, 1.02, 'room'),
    'skipper penhallow': ('am_santa', 0.95, 0.92, 'room'),
    'jory tregear': ('am_puck', 1.05, 1.06, 'room'),
    'verity': ('af_sky', 0.95, 1.08, 'ghost'),
    'mr tregear, the receiver': ('am_eric', 0.97, 0.95, 'room'),
    'a wrecker': ('am_echo', 1.0, 0.9, 'room'),
    'black nell': ('bf_emma', 1.0, 0.92, 'room'),
    'the coxswain': ('am_michael', 1.02, 1.02, 'room'),
    'the bosun': ('am_onyx', 1.0, 0.95, 'ghost'),
    'captain crane': ('am_adam', 0.9, 0.84, 'ghost'),
    'the gilt & gull clerk': ('bm_lewis', 1.05, 1.06, 'room'),
    'the factor': ('am_eric', 0.95, 0.9, 'room'),
    'the mate': ('am_fenrir', 1.0, 0.98, 'room'),
    'crew': ('am_liam', 1.05, 0.98, 'room'),
    'ruth carrow': ('bf_alice', 1.0, 1.0, 'room'),
    'the mayor of wrackhaven': ('bm_fable', 0.95, 0.9, 'room'),
    'the chandler': ('am_puck', 1.0, 1.0, 'room'),
    'a fishwife': ('bf_emma', 1.05, 1.05, 'room'),
    'the smokehouse hand': ('am_liam', 1.0, 0.95, 'room'),
    'the cooper': ('am_santa', 1.0, 0.95, 'room'),
    'old pascoe': ('bm_lewis', 0.88, 0.88, 'room'),
    'the schoolmaster': ('bm_daniel', 1.0, 1.06, 'room'),
    'the chaplain': ('bm_george', 0.92, 1.03, 'room'),
    'the smith': ('am_onyx', 1.0, 0.92, 'room'),
    "the wren's mate": ('am_michael', 1.0, 0.92, 'room'),
    'ember isles captain': ('am_eric', 1.02, 0.9, 'far'),
    'the ember commodore': ('am_onyx', 0.95, 0.86, 'room'),
    'ice-folk sergeant': ('am_echo', 1.0, 0.95, 'room'),
}
fold = lambda s: re.sub(r'\s*\(narrator\)', '', s.replace('’', "'")).strip().lower()
d = json.load(open(sys.argv[1], encoding='utf-8'))
out, miss = [], set()
for v in d['voice']:
    c = CAST.get(fold(v['who']))
    if not c: miss.add(v['who']); continue
    voice, speed, pitch, room = c
    h = v['how'].lower()
    if re.search(r'shout|bark|yell|scream|roar|urgent|alarm|panic', h): speed *= 1.06
    if re.search(r'whisper|weary|tired|slow|hushed|dying|grave|heavy', h): speed *= 0.93
    text = v['line'].replace('’', "'").replace('“', '"').replace('”', '"').replace('—', ', ').replace('…', '...')
    out.append({'id': v['id'], 'text': text, 'voice': voice, 'speed': round(speed, 3), 'pitch': pitch, 'room': room,
                'soft': bool(re.search(r'whisper|hushed|murmur|breath', h))})
if miss: sys.exit('no voice for: ' + ', '.join(sorted(miss)))
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(len(out), 'lines,', len({o['voice'] for o in out}), 'voices')
