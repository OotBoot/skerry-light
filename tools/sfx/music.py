#!/usr/bin/env python3
"""The bosses' themes and the raid's music: from Stable Audio's takes (ComfyUI, FLAC), a seamless loop of each.

    python3 tools/sfx/music.py <folder of bossdiver_N_00001.flac, bossmoon_..., raidcave_..., ...> [folder for every take]

The raid's (raid*, src/raidmusic.js) go the same way, at 96 kbit/s, except raidfall, which plays once: it's kept
whole, faded in and out, not looped; and raidsong, the Knock's song, loops in about 16 s. Given a second folder,
every take's cut is written there too (<name>_<take>.mp3), to hear them side by side.

A take has an intro and an ending, and its loudness comes and goes, so it isn't looped whole. For each take: its beat
is found (the onsets' autocorrelation, 60-180 bpm), a loop a whole number of bars long (about 40 s) is cut from its
steady middle, at the start where the music at the loop's end best matches the music at its start (and the end
nudged to the closest matching waveform), and the end crossfaded into the start. Of each boss's takes the one that
loops best (steadiest, closest seam) is kept, levelled, and written as assets/sfx/<name>_1.mp3 (mono, 112 kbit/s);
then run tools/sfx/process.py on an empty folder to rewrite src/sfxlist.js.
"""
import os, re, subprocess, sys
import numpy as np

SR = 44100
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'assets', 'sfx')
BAR = {'bossmoon': 3}   # beats to the bar (a waltz); the rest are in four
TARGET = 40.0           # the loop, about this long (s)
TARGETS = {'raidsong': 16.0}
ONCE = {'raidfall'}
WHOLE = {'raidwin'}     # played once, kept whole (only faded in and out)     # played once, not looped
TAIL = 2.5              # (its tail after the climax, s)
RAMP = 14.0             # (its swell, dB)
PITCH = {'raidfall': 2 ** (-3 / 12)}   # taken down (and slowed) this much: three semitones
PICK = {'raidfall': 1}             # a take chosen by ear (its number), over the one that loops best
FADE = 1.5              # its seam's crossfade (s)


def read(path, k=1.0):
    # (k below 1: played slower, and so lower, by that much: tape-style, as PITCH)
    af = ['-af', f'asetrate={SR * k:.0f},aresample={SR}'] if k != 1.0 else []
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR)] + af + ['-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def onsets(x, hop=512):
    n = len(x) // hop
    fr = x[:n * hop].reshape(n, hop)
    S = np.abs(np.fft.rfft(fr * np.hanning(hop), axis=1))
    flux = np.maximum(0, np.diff(np.log1p(S), axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    return (flux - flux.mean()) / (flux.std() + 1e-9), SR / hop


def beat(x):
    o, fps = onsets(x)
    ac = np.correlate(o, o, 'full')[len(o) - 1:]
    lo, hi = int(fps * 60 / 180), int(fps * 60 / 60)
    k = lo + int(np.argmax(ac[lo:hi]))
    return k / fps   # seconds per beat


def spec(seg):
    S = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))[:6000]
    return S / (np.linalg.norm(S) + 1e-9)


def best_loop(name, x):
    p = beat(x)
    bar = p * BAR.get(name, 4)
    L = max(1, round(TARGETS.get(name, TARGET) / bar)) * bar
    n, F = int(L * SR), int(FADE * SR)
    w = int(1.0 * SR)
    best = None
    for s in np.arange(2.0, len(x) / SR - L - FADE - 1.0, 0.25):
        i = int(s * SR)
        seam = float(spec(x[i:i + w]) @ spec(x[i + n:i + n + w]))
        e = np.array([np.sqrt(np.mean(x[j:j + SR] ** 2)) for j in range(i, i + n, SR)])
        wob = float(e.std() / (e.mean() + 1e-9))
        quiet = float((e < e.max() * 0.2).mean())
        score = seam - 0.6 * wob - 1.5 * quiet
        if best is None or score > best[0]: best = (score, i, seam, wob)
    score, i, seam, wob = best
    # nudge the end (within a few ms) to where the waveform lines up best with the start
    ref = x[i:i + 2048]
    lag = max(range(-300, 301), key=lambda d: float(np.dot(ref, x[i + n + d:i + n + d + 2048])))
    n += lag
    body, tail = x[i:i + n].copy(), x[i + n:i + n + F]
    k = np.linspace(0, 1, F)
    body[:F] = body[:F] * np.sqrt(k) + tail * np.sqrt(1 - k)
    return body, dict(score=score, bpm=60 / p, start=i / SR, length=n / SR, seam=seam, wobble=wob)


def once(x):
    # (played once, the fall: from its first sound to its climax, the loudest second of its second half, and a short
    # tail after it; the game starts it so the climax lands as you hit the floor, src/raidmusic.js RM_TAIL)
    e = np.abs(x) > 1e-3
    i = int(np.argmax(e))
    w = SR // 2
    rms = np.array([np.sqrt(np.mean(x[k:k + SR] ** 2)) for k in range(0, len(x) - SR, w)])
    half = len(rms) // 2
    pk = (half + int(np.argmax(rms[half:]))) * w + SR // 2
    j = min(len(x), pk + int(TAIL * SR))
    body = x[i:j].copy()
    a, b = int(0.05 * SR), int(TAIL * SR)
    body[:a] *= np.linspace(0, 1, a); body[-b:] *= np.linspace(1, 0, b) ** 2
    # (and a swell put on it: RAMP dB quieter at its start, rising to full at its climax, so it builds however it came)
    t = np.arange(len(body)) / SR
    body *= 10 ** (-RAMP / 20 * np.clip(1 - t / ((pk - i) / SR), 0, 1))
    return body, dict(score=float(rms[half:].max() / (rms[:half].mean() + 1e-9)), length=len(body) / SR, climax=(pk - i) / SR)


def whole(x):
    e = np.abs(x) > 1e-3
    i, j = int(np.argmax(e)), len(x) - int(np.argmax(e[::-1]))
    body = x[i:j].copy()
    a, b = int(0.3 * SR), int(4.0 * SR)
    body[:a] *= np.linspace(0, 1, a); body[-b:] *= np.linspace(1, 0, b) ** 2
    return body, dict(score=0.0, length=len(body) / SR)


def mp3(body, out, rate):
    body = body - body.mean()
    body = body / (np.max(np.abs(body)) or 1) * 10 ** (-3 / 20)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', rate, out],
                   input=np.clip(body, -1, 1).astype(np.float32).tobytes(), check=True)


def main(src, every=None):
    os.makedirs(OUT, exist_ok=True)
    takes = {}
    for f in sorted(os.listdir(src)):
        m = re.match(r'^((?:boss|raid)[a-z0-9]+)_(\d+)_\d+_?\.(?:flac|wav|mp3|ogg)$', f)
        if m: takes.setdefault(m.group(1), []).append(os.path.join(src, f))
    for name, files in sorted(takes.items()):
        res = []
        for f in files:
            x = read(f, PITCH.get(name, 1.0))
            body, info = whole(x) if name in WHOLE else once(x) if name in ONCE else best_loop(name, x)
            print(f'{os.path.basename(f)}: ' + ', '.join(f'{k} {v:.2f}' for k, v in info.items()))
            res.append((info['score'], body, f))
        rate = '96k' if name.startswith('raid') else '112k'
        if every:
            os.makedirs(every, exist_ok=True)
            for _, b, f in res: mp3(b, os.path.join(every, f'{name}_{re.match(r"^[a-z0-9]+_(\d+)", os.path.basename(f)).group(1)}.mp3'), rate)
        pick = PICK.get(name)
        score, body, f = next((r for r in res if pick and re.match(rf'^{name}_{pick}_', os.path.basename(r[2]))), None) or max(res, key=lambda r: r[0])
        out = os.path.join(OUT, f'{name}_1.mp3')
        mp3(body, out, rate)
        print(f'  -> {name}: {os.path.basename(f)}, {len(body) / SR:.1f} s, {os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
