#!/usr/bin/env python3
"""The Chronicle of the Light's sound notes (campaign-sound/m01.md to m14.md), read into one list of what to record.

    python3 tools/sfx/cpnotes.py [out.json]

Each mission's notes have three tables (their columns named in their header rows, in any order): the music cues
(a key, loop or once, and a Stable Audio prompt, in the table or in a list under it as "- **key**: `prompt`"), the
voice lines (an id, who says it, the line, how it's said) and the sound effects (a name and a description). Written
as JSON: { music: [{key, once, prompt, m}], voice: [{id, who, line, how, m}], sfx: [{name, desc, m}], cast: {m: text} }.
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DIR = os.path.join(ROOT, 'campaign-sound')
clean = lambda s: re.sub(r'\s+', ' ', s.replace('`', '').replace('**', '')).strip()

def tables(text):
    """(section heading, header cells, rows) for each table."""
    out, sec, head, rows = [], '', None, []
    for ln in text.splitlines() + ['']:
        if ln.startswith('#'): sec = ln.lower()
        if ln.startswith('|'):
            cells = [c.strip() for c in ln.strip().strip('|').split('|')]
            if head is None: head = [c.lower() for c in cells]
            elif not re.match(r'^[-: ]+$', ''.join(cells)): rows.append(cells)
        elif head is not None:
            out.append((sec, head, rows)); head, rows = None, []
    return out

def col(head, *names):
    for i, h in enumerate(head):
        if any(n in h for n in names): return i
    return None

music, voice, sfx, cast = [], [], [], {}
for f in sorted(os.listdir(DIR)):
    m = re.match(r'^(m\d\d)\.md$', f)
    if not m: continue
    mid, text = m.group(1), open(os.path.join(DIR, f), encoding='utf-8').read()
    listed = {k: clean(p) for k, p in re.findall(r'^\s*[-*]\s*\*\*`?(cp[a-z0-9]+)`?\*\*\s*[:—-]\s*(.+)$', text, re.M)}
    for sec, head, rows in tables(text):
        if 'music' in sec:
            k, lp, pr = col(head, 'key'), col(head, 'loop', 'once'), col(head, 'prompt')
            for r in rows:
                key = clean(r[k]) if k is not None else ''
                if not re.match(r'^cp[a-z0-9]+$', key): continue
                prompt = clean(r[pr]) if pr is not None and pr < len(r) else listed.get(key, '')
                if not prompt or prompt.startswith('('): prompt = listed.get(key, '')
                if not prompt: continue   # (a shared key, recorded once elsewhere)
                once = lp is not None and 'once' in r[lp].lower()
                music.append({'key': key, 'once': once, 'prompt': prompt, 'm': mid})
        elif 'voice' in sec and 'character' not in sec:
            i, w, l, d = col(head, 'id'), col(head, 'character', 'who'), col(head, 'line'), col(head, 'delivery', 'direction')
            for r in rows:
                vid = clean(r[i])
                if not re.match(r'^cp_m\d+_[0-9a-z]+$', vid): continue
                voice.append({'id': vid, 'who': clean(r[w]), 'line': clean(r[l]), 'how': clean(r[d]) if d is not None else '', 'm': mid})
        elif 'sound effect' in sec:
            n, d = col(head, 'name', 'key'), col(head, 'desc', 'what', 'sound')
            for r in rows:
                nm = clean(r[n])
                if re.match(r'^[a-z0-9]+$', nm): sfx.append({'name': nm, 'desc': clean(r[d] if d is not None else r[-1]), 'm': mid})
    # (and the sound effects given as a list: "- `name`: what it is", or "**name**, what it is" within an item)
    se = re.search(r'^#+ *Sound effects.*?$(.+?)(?=^#|\Z)', text, re.M | re.S)
    if se:
        for item in re.findall(r'^\s*[-*]\s*(.+)$', se.group(1), re.M):
            for nm, desc in re.findall(r'(?:`|\*\*)([a-z0-9_]+)(?:`|\*\*)\s*[:,]\s*([^*`]+?)(?=(?:,? and )?(?:`|\*\*)[a-z0-9_]+(?:`|\*\*)\s*[:,]|$)', item):
                sfx.append({'name': nm, 'desc': clean(desc).rstrip('.,; '), 'm': mid})
    cv = re.search(r'^#+ *Character voice notes\s*$(.+?)(?=^#)', text + '\n#', re.M | re.S)
    if cv: cast[mid] = cv.group(1).strip()

seen = set(); music = [x for x in music if not (x['key'] in seen or seen.add(x['key']))]
seen = set(); sfx = [x for x in sfx if not (x['name'] in seen or seen.add(x['name']))]
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DIR, 'cues.json')
json.dump({'music': music, 'voice': voice, 'sfx': sfx, 'cast': cast}, open(out, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(len(music), 'music,', len(voice), 'voice,', len(sfx), 'sfx ->', out)
for mid in sorted(cast): print(mid, sum(v['m'] == mid for v in voice), 'lines', sum(v['m'] == mid for v in music), 'music', sum(v['m'] == mid for v in sfx), 'sfx')
