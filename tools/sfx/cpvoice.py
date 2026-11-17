#!/usr/bin/env python3
"""The Chronicle of the Light's voice lines: Kokoro's plain takes coloured per character, and each mission's lines
put one after another into one recording; then src/cpaudio.js, the list of what each mission fetches.

    python3 tools/sfx/cpvoice.py <folder of vo_cp_mNN_NN.wav> [jobs-voice.json] [cues.json] [jobs-music.json]

Each take (from Kokoro, kokoro-js 1.2.1, the voice and pace tools/sfx/cpcast.py gave it): taken down by its pitch
(tape-style, so a little slower too), filtered for its room ('dry' narration; 'room' close by; 'far' a shout across
water; 'ghost' the drowned and the uncanny; 'fog' the Fog-Keeper, muffled), its silence trimmed, and levelled
(whispers quieter). A mission's lines go into assets/sfx/cpvo_<mission>_1.mp3 with a breath between each, and
src/cpaudio.js says where each starts and how long it is (CP_VO), with the music and sound effects each mission
wants (CP_AUDIO, fetched only while it's played: src/sfxbank.js sfxbWant). Then run tools/sfx/process.py on an empty
folder to rewrite src/sfxlist.js.
"""
import json, os, re, subprocess, sys
import numpy as np

SR = 44100
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'assets', 'sfx')
NOTES = os.path.join(ROOT, 'campaign-sound')
GAP = 0.25
src = sys.argv[1]
jobs = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(NOTES, 'jobs-voice.json'), encoding='utf-8'))
cues = json.load(open(sys.argv[3] if len(sys.argv) > 3 else os.path.join(NOTES, 'cues.json'), encoding='utf-8'))
music = json.load(open(sys.argv[4] if len(sys.argv) > 4 else os.path.join(NOTES, 'jobs-music.json'), encoding='utf-8'))

COMP = 'highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80'
ROOM = {
    'dry': COMP,
    'room': COMP + ',aecho=0.8:0.6:28|56:0.16|0.09',
    'far': 'highpass=f=350,lowpass=f=2800,' + COMP + ',aecho=0.8:0.85:160|380|700:0.42|0.3|0.2',
    'ghost': COMP + ',chorus=0.6:0.8:40:0.3:0.25:2,aecho=0.8:0.7:70|180|420:0.32|0.22|0.14,lowpass=f=6500',
    'fog': COMP + ',chorus=0.6:0.8:40:0.3:0.25:2,aecho=0.8:0.75:90|240|520:0.34|0.24|0.16,lowpass=f=2600',
}

def colour(path, j):
    af = (f'aresample={SR},asetrate={SR * j["pitch"]:.0f},aresample={SR},' if j['pitch'] != 1 else f'aresample={SR},') + ROOM[j['room']]
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-af', af, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    e = np.abs(x); pk = float(e.max()) if len(e) else 0
    if pk < 1e-3: return None
    loud = np.where(e > pk * 0.02)[0]
    x = x[max(0, loud[0] - int(SR * 0.02)):min(len(x), loud[-1] + int(SR * (0.6 if j['room'] in ('far', 'ghost', 'fog') else 0.15)))]
    f = min(len(x) // 4, int(SR * 0.08)); x[-f:] *= np.linspace(1, 0, f) ** 2
    rms = float(np.sqrt(np.mean(x ** 2))) or 1
    x *= (10 ** ((-22 if j['soft'] else -18) / 20)) / rms
    p = float(np.max(np.abs(x)))
    if p > 0.95: x = np.tanh(x / p * 1.2) / np.tanh(1.2) * 0.95
    return x

def mp3(x, out, br='56k'):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', br, out],
                   input=np.clip(x, -1, 1).astype(np.float32).tobytes(), check=True)

by = {}
for j in jobs: by.setdefault(j['id'].split('_')[1], []).append(j)
VO, miss = {}, []
for mid, js in sorted(by.items()):
    parts, t = [np.zeros(int(SR * 0.1), np.float32)], 0.1
    for j in js:
        f = os.path.join(src, 'vo_' + j['id'] + '.wav')
        x = colour(f, j) if os.path.exists(f) else None
        if x is None: miss.append(j['id']); continue
        VO[j['id']] = [mid, round(t, 3), round(len(x) / SR, 3)]
        parts += [x, np.zeros(int(SR * GAP), np.float32)]; t += len(x) / SR + GAP
    out = os.path.join(OUT, f'cpvo_{mid}_1.mp3')
    mp3(np.concatenate(parts), out)
    print(f'cpvo_{mid}: {sum(1 for v in VO.values() if v[0] == mid)} lines, {t:.0f} s, {os.path.getsize(out) // 1024} KB')
if miss: print('missing or silent:', ' '.join(miss))

# what each mission fetches while it's played: its music, its sound effects, its lines; and the shared music always
have = {m.group(1) for f in os.listdir(OUT) for m in [re.match(r'^([a-z0-9_]+?)_\d+\.mp3$', f)] if m}
A = {'all': sorted(k['name'] for k in music if not re.match(r'^cpm\d\d', k['name']))}
for k in music:
    m = re.match(r'^cpm(\d\d)', k['name'])
    if m: A.setdefault('m' + m.group(1), []).append(k['name'])
# (the owner asked for sounds to be reused as much as they can be: these are played with another's recording)
ALIAS = {'rchfeed': 'firefeed', 'rchbeacon': 'beaconcatch', 'rchoar': 'oars', 'rchcask': 'caskthud', 'rchwind': 'clockwind',
         'quaylamp': 'c12lamp', 'kwstrike': 'shipstrike', 'kwwave': 'wavesweep', 'brazierlight': 'fireroar', 'sailfire': 'fireroar',
         'flare_rocket': 'flare', 'gallerybolt': 'stormbolt'}
for s in cues['sfx']: A.setdefault(s['m'], []).append(ALIAS.get(s['name'], s['name']))
for mid in by: A.setdefault(mid, []).append('cpvo_' + mid)
A = {k: sorted(set(n for n in v if n in have)) for k, v in A.items()}
mine = {j['name'] for j in json.load(open(os.path.join(NOTES, 'jobs-sfx.json'), encoding='utf-8'))} | {k['name'] for k in music} | {'cpvo_' + m for m in by}
lazy = sorted(set(n for v in A.values() for n in v) & mine)
A = {k: [n for n in v if n in lazy] for k, v in A.items()}
js = ['// The Chronicle of the Light\'s recordings (written by tools/sfx/cpvoice.py): what each mission fetches while it\'s',
      '// played (src/sfxbank.js sfxbWant), and where each line is said in its mission\'s voice recording (src/cp.js cpVoice).',
      'const CP_AUDIO = ' + json.dumps(A, separators=(',', ':')) + ';',
      'const CP_AUDIO_LAZY = new Set(' + json.dumps(lazy, separators=(',', ':')) + ');',
      'const CP_SFX_ALIAS = ' + json.dumps(ALIAS, separators=(',', ':')) + ';',
      'const CP_VO = {']
js += [f"  {k}: {json.dumps(v, separators=(',', ':'))}," for k, v in VO.items()] + ['};']
open(os.path.join(ROOT, 'src', 'cpaudio.js'), 'w', encoding='utf-8').write('\n'.join(js) + '\n')
print(len(VO), 'lines in src/cpaudio.js;', len(lazy), 'recordings fetched per mission')
