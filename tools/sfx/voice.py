#!/usr/bin/env python3
"""The power-up announcer: turn plain spoken lines (Kokoro TTS, WAV) into the deep, gritty, echoing voice.

    python3 tools/sfx/voice.py <folder of vo_<voice>_<key>.wav> <voice>

Pitched down (and a little slowed), doubled an octave below, driven into a soft clip, then a hall's echo; written as
assets/sfx/vo_<key>_1.mp3, which src/sfxbank.js sfxAnnounce plays in place of the browser's speech.
"""
import os, re, subprocess, sys
src, voice = sys.argv[1], sys.argv[2]
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
FX = ('[0]silenceremove=start_periods=1:start_threshold=-45dB,aresample=44100,'
      'rubberband=pitch=0.78:tempo=0.92,asplit=2[m][s];'
      '[s]rubberband=pitch=0.5,volume=0.55,lowpass=1800[sub];'
      '[m][sub]amix=inputs=2:normalize=0,highpass=70,'
      'equalizer=f=180:t=q:w=1:g=4,equalizer=f=2600:t=q:w=1.2:g=3,'
      'volume=3,asoftclip=type=tanh,volume=0.45,'
      'aecho=0.8:0.6:45|110:0.28|0.16,aecho=0.85:0.45:260|520:0.22|0.1,'
      'apad=pad_dur=0.6,areverse,silenceremove=start_periods=1:start_threshold=-55dB,afade=t=in:d=0.08,areverse,'
      'loudnorm=I=-12:TP=-1.5:LRA=7[o]')
for f in sorted(os.listdir(src)):
    m = re.match(rf'^vo_{voice}_([a-z]+)\.wav$', f)
    if not m: continue
    out = os.path.join(root, 'assets', 'sfx', f'vo_{m.group(1)}_1.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(src, f), '-filter_complex', FX, '-map', '[o]',
                    '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '80k', out], check=True)
    d = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip()
    print(os.path.basename(out), d, 's', os.path.getsize(out) // 1024, 'KB')
