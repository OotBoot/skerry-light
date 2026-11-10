#!/usr/bin/env python3
"""Turn the raw sound-effect takes generated in ComfyUI (Stable Audio 3, FLAC) into the game's small MP3s.

    python3 tools/sfx/process.py <folder of name_N_00001.flac files>

For each take: mono, the leading silence trimmed off (so a shot fires on the frame it's fired), cut to the sound's
longest useful length with a short fade out, levelled to a common peak, and written as a 64 kbit/s MP3 to
assets/sfx/<name>_<N>.mp3. The ambience loops (sea, wind) get a crossfade so their end runs into their start.
Takes that came out near silent are dropped. Then src/sfxlist.js is written, naming every file the game loads.
"""
import os, re, subprocess, sys, json
import numpy as np

SR = 44100
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'assets', 'sfx')

# the longest each sound is kept (s), and its level (peak, dBFS) relative to the others
LEN = {
    'pepperbox': 1.3, 'blunderbuss': 1.8, 'longarm': 2.0, 'harpoon': 1.4, 'avtomat': 0.55, 'swish': 0.6, 'reload': 1.6,
    'beam': 2.5, 'puntgun': 2.6, 'duckfoot': 1.4, 'explode': 2.2, 'flaregun': 2.0, 'chainshot': 2.0, 'axechop': 0.9,
    'grapnel': 1.6, 'netmortar': 1.6, 'moan': 2.6, 'snarl': 1.6, 'tear': 1.1, 'board': 0.9, 'hit': 0.6, 'splat': 0.7,
    'door': 2.2, 'debris': 2.2, 'chest': 2.2, 'gull': 1.2, 'powerup': 1.8, 'pickup': 1.3, 'drink': 2.2,
    'roundstart': 4.8, 'roundend': 3.8, 'gameover': 5.8, 'heartbeat': 1.2, 'forge': 4.0, 'forgedone': 2.8, 'buy': 1.0,
    'deny': 0.6, 'diver': 3.8, 'slam': 2.2, 'mooncusser': 2.8, 'keelback': 2.8, 'charge': 2.2, 'bell': 2.8,
    'bellfar': 3.8, 'splash': 1.8, 'foghorn': 4.8, 'cannon': 2.8, 'flare': 2.8, 'creak': 2.8, 'thunder': 4.8,
    'sea': 11.0, 'wind': 11.0, 'rain': 11.0,
    # the bosses' themes (src/zmtheme.js): as long as they came, looped
    'bossdiver': 120.0, 'bossmoon': 120.0, 'bosscrab': 120.0,
}
PEAK = {'hit': -4, 'board': -4, 'buy': -6, 'deny': -8, 'swish': -4, 'reload': -5, 'gull': -6, 'heartbeat': -3,
        'sea': -6, 'wind': -8, 'rain': -8, 'bossdiver': -3, 'bossmoon': -3, 'bosscrab': -3, 'beam': -8, 'moan': -3, 'creak': -6}
LOOPS = {'sea', 'wind', 'rain', 'bossdiver', 'bossmoon', 'bosscrab'}
# kept synthesised by choice (the old bell stays the bell)
SKIP = {'bell', 'bellfar'}
# (keep the start: for these the swell is the point, not an attack)
NOTRIM = LOOPS | {'roundstart', 'roundend', 'gameover', 'foghorn', 'thunder', 'forge', 'mooncusser', 'diver', 'creak'}


# sounds that must stay low (the boards: a deep thud like a knock on a door, nothing high): filtered as they're read
TONE = {'tear': 'lowpass=f=1400:p=2,lowpass=f=2200,equalizer=f=110:t=q:w=1:g=5',
        'board': 'lowpass=f=1300:p=2,lowpass=f=2000,equalizer=f=120:t=q:w=1:g=5'}


def read(path, name=''):
    af = ['-af', TONE[name]] if name in TONE else []
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR)] + af + ['-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def write(path, x, br='64k'):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', br, path],
                   input=np.clip(x, -1, 1).astype(np.float32).tobytes(), check=True)


def process(name, x):
    if len(x) < SR * 0.1:
        return None, 'too short'
    peak = float(np.max(np.abs(x)))
    if peak < 0.02:
        return None, 'silent'
    x = x - float(np.mean(x))
    if name not in NOTRIM:
        # the first moment it gets loud: start 5 ms before it
        env = np.abs(x)
        i = int(np.argmax(env > peak * 0.12))
        x = x[max(0, i - int(SR * 0.005)):]
    n = int(LEN.get(name, 2.0) * SR)
    if name in TONE:
        # one knock only: cut at the first lull (50 ms under a tenth of the peak) after the hit
        w = int(SR * 0.025); e = np.array([np.sqrt(np.mean(x[i:i + w] ** 2)) for i in range(0, len(x) - w, w)])
        top = e.max(); j = int(np.argmax(e > top * 0.5))
        for i in range(j, len(e) - 2):
            if e[i] < top * 0.1 and e[i + 1] < top * 0.1:
                n = min(n, (i + 2) * w); break
    if name in LOOPS:
        F = int(SR * (2.5 if name.startswith('boss') else 1.2))
        if len(x) < n + F:
            n = len(x) - F
        body, tail = x[:n].copy(), x[n:n + F]
        k = np.linspace(0, 1, F)
        body[:F] = body[:F] * np.sqrt(k) + tail * np.sqrt(1 - k)
        x = body
    else:
        x = x[:n]
        # trailing near-silence off, then a short fade out
        env = np.abs(x)
        loud = np.where(env > peak * 0.01)[0]
        if len(loud):
            x = x[:min(len(x), loud[-1] + int(SR * 0.08))]
        f = min(len(x) // 3, int(SR * 0.12))
        if f > 0:
            x[-f:] *= np.linspace(1, 0, f) ** 2
        g = min(len(x) // 4, int(SR * 0.003))
        if g > 0:
            x[:g] *= np.linspace(0, 1, g)
    p = float(np.max(np.abs(x))) or 1.0
    x = x / p * (10 ** (PEAK.get(name, -1.5) / 20))
    return x, 'ok %.2fs' % (len(x) / SR)


def main(src):
    os.makedirs(OUT, exist_ok=True)
    takes = {}
    for f in sorted(os.listdir(src)):
        m = re.match(r'^([a-z]+)_(\d+)_\d+_?\.flac$', f)
        if not m:
            continue
        name, k = m.group(1), int(m.group(2))
        if name == 'test' or name in SKIP:
            continue
        x, why = process(name, read(os.path.join(src, f), name))
        print(f'{name}_{k}: {why}')
        if x is None:
            continue
        out = f'{name}_{k}.mp3'
        write(os.path.join(OUT, out), x, '112k' if name.startswith('boss') else '64k')
        takes.setdefault(name, []).append('assets/sfx/' + out)
    # every file in assets/sfx (earlier runs included), by name
    allf = {}
    for f in sorted(os.listdir(OUT)):
        m = re.match(r'^([a-z_]+)_(\d+)\.mp3$', f)
        if m:
            allf.setdefault(m.group(1), []).append('assets/sfx/' + f)
    lines = ['// The recorded sound effects (written by tools/sfx/process.py; see src/sfxbank.js): each name and its takes.',
             'const SFX_FILES = {']
    for name in sorted(allf):
        lines.append(f'  {name}: [' + ', '.join(f"'{p}'" for p in allf[name]) + '],')
    lines.append('};')
    open(os.path.join(ROOT, 'src', 'sfxlist.js'), 'w').write('\n'.join(lines) + '\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'{sum(len(v) for v in allf.values())} files, {len(allf)} sounds, {total / 1024:.0f} KB')


if __name__ == '__main__':
    main(sys.argv[1])
