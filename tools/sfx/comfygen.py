#!/usr/bin/env python3
"""Queue Stable Audio 3 takes on ComfyUI (its HTTP API) and wait for them: the music and sound effects' raw FLACs.

    python3 tools/sfx/comfygen.py <jobs.json> [--url http://127.0.0.1:8188] [--only name,name] [--sub skerry-cp]

jobs.json: [{ "name": "cpm01dusk", "prompt": "...", "seconds": 95, "takes": 3, "seed": 1000 }, ...]. Each take is
saved by ComfyUI as output/<sub>/<name>_<take>_00001_.flac (what tools/sfx/process.py and music.py read). A take
already in the output folder (ComfyUI's /history says so) isn't made again, so a stopped run picks up where it was.
The graph: CheckpointLoaderSimple (stable_audio_3_medium) and CLIPLoader (t5gemma, type stable_audio), the prompt
through CLIPTextEncode (an empty one for the negative), EmptyLatentAudio, KSampler (8 steps, lcm, cfg 1),
VAEDecodeAudio, SaveAudio. One take at a time, so the laptop stays usable.
"""
import json, sys, time, urllib.request, uuid, argparse

ap = argparse.ArgumentParser()
ap.add_argument('jobs'); ap.add_argument('--url', default='http://127.0.0.1:8188'); ap.add_argument('--only', default='')
ap.add_argument('--sub', default='skerry-cp'); ap.add_argument('--done', default='', help='a file listing takes already made (one prefix a line)')
a = ap.parse_args()
U = a.url.rstrip('/')

def get(p): return json.load(urllib.request.urlopen(U + p, timeout=60))
def post(p, d):
    r = urllib.request.Request(U + p, json.dumps(d).encode(), {'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=60))

info = get('/object_info/CheckpointLoaderSimple')['CheckpointLoaderSimple']['input']['required']['ckpt_name'][0]
ckpt = next(c for c in info if 'stable_audio_3' in c.lower())
clips = get('/object_info/CLIPLoader')['CLIPLoader']['input']['required']['clip_name'][0]
clip = next(c for c in clips if 't5gemma' in c.lower())
print('model', ckpt, '| text', clip)

def graph(prompt, seconds, seed, prefix):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': ckpt}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': clip, 'type': 'stable_audio'}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': '', 'clip': ['2', 0]}},
        '5': {'class_type': 'EmptyLatentAudio', 'inputs': {'seconds': float(seconds), 'batch_size': 1}},
        '6': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['3', 0], 'negative': ['4', 0], 'latent_image': ['5', 0],
              'seed': int(seed), 'steps': 8, 'cfg': 1.0, 'sampler_name': 'lcm', 'scheduler': 'simple', 'denoise': 1.0}},
        '7': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['6', 0], 'vae': ['1', 2]}},
        '8': {'class_type': 'SaveAudio', 'inputs': {'audio': ['7', 0], 'filename_prefix': prefix}},
    }

done = set(l.strip() for l in open(a.done, encoding='utf-8')) if a.done else set()
for h in get('/history?max_items=100000').values():
    for o in h.get('outputs', {}).values():
        for f in o.get('audio', []): done.add((f.get('subfolder', '') + '/' + f['filename']).split('_00')[0])
only = set(filter(None, a.only.split(',')))
jobs = [j for j in json.load(open(a.jobs, encoding='utf-8')) if not only or j['name'] in only]
todo = [(j, k) for j in jobs for k in range(1, j.get('takes', 3) + 1) if f"{a.sub}/{j['name']}_{k}" not in done]
print(len(todo), 'takes to make')
cid = str(uuid.uuid4()); t0 = time.time()
for n, (j, k) in enumerate(todo, 1):
    prefix = f"{a.sub}/{j['name']}_{k}"
    pid = post('/prompt', {'prompt': graph(j['prompt'], j.get('seconds', 6), j.get('seed', 1000) + k * 7919, prefix), 'client_id': cid})['prompt_id']
    while True:
        time.sleep(1.5)
        h = get('/history/' + pid).get(pid)
        if h and h.get('status', {}).get('completed'): break
        if h and h.get('status', {}).get('status_str') == 'error': print('  error', prefix, h['status']); break
    print(f'{n}/{len(todo)} {prefix} ({time.time() - t0:.0f} s)', flush=True)
