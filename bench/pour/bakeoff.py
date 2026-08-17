# bench/pour/bakeoff.py — THE POUR BAKE-OFF
# Torture deck (26 ReadCells + 2 MedicineKernels) x 3 models, blinded A/B/C per cell.
# Standard: frozen 2026-08-18 (12 authoring laws, founder-gaveled exemplars).
# Resumable: raw responses cached in results/raw/; re-run skips completed calls.
# Usage: python bench/pour/bakeoff.py  (reads ANTHROPIC_API_KEY from ../.env.local)

import json, os, sys, time, hashlib, urllib.request, re

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(ROOT, '..', '..'))
RESULTS = os.path.join(ROOT, 'results')
RAW = os.path.join(RESULTS, 'raw')
os.makedirs(RAW, exist_ok=True)

# ---- API key ----
key = None
for line in open(os.path.join(APP, '.env.local'), encoding='utf-8'):
    if line.startswith('ANTHROPIC_API_KEY'):
        key = line.split('=', 1)[1].strip().strip('"').strip("'")
assert key, 'no key'

MODELS = {
    'haiku': 'claude-haiku-4-5-20251001',
    'sonnet': 'claude-sonnet-4-6',
    'opus': 'claude-opus-4-8',
}

# ---- canon facts ----
defs = json.load(open(os.path.join(APP, 'lib', 'data', 'nirmanakaya_78_definitions.json'), encoding='utf-8'))
FACT_KEYS = ['name', 'traditional', 'house', 'channel', 'element', 'stage', 'type', 'class', 'role']
facts = {}
def collect(o):
    if isinstance(o, dict):
        i = o.get('id')
        if isinstance(i, int) and 'name' in o:
            slot = facts.setdefault(i, {})
            for k in FACT_KEYS:
                if k in o and o[k] and k not in slot:
                    slot[k] = o[k]
        for v in o.values(): collect(v)
    elif isinstance(o, list):
        for v in o: collect(v)
collect(defs)

STATUS = {1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged'}

def fact_line(i):
    f = facts.get(i, {})
    bits = [f.get('name', f'id{i}')]
    if f.get('traditional'): bits.append(f"(traditional: {f['traditional']})")
    for k in ['type', 'class', 'role', 'house', 'channel', 'element', 'stage']:
        if f.get(k): bits.append(f"{k}: {f[k]}")
    return ' · '.join(str(b) for b in bits)

# ---- the deck (signature, position, status, note) ----
READCELLS = [
    (14, 14, 2, 'self-seat, recursion'), (13, 13, 4, 'self-seat, ending unseen'),
    (15, 15, 3, 'self-seat, tautology risk'), (16, 16, 1, 'self-seat, Balanced, no drama'),
    (2, 15, 2, 'adjacent cognition A>B'), (15, 2, 3, 'adjacent cognition B>A'),
    (4, 5, 2, 'structural/social neighbors'), (3, 6, 3, 'care-on-care'),
    (6, 3, 2, 'care-on-care reversed'), (13, 16, 4, 'ending vs rupture'),
    (16, 13, 2, 'rupture vs ending reversed'), (60, 3, 2, 'Bound in parent context'),
    (50, 18, 4, 'Bound/parent convergence'), (40, 2, 4, 'abundant cognition in knowing seat'),
    (72, 6, 3, 'Ambassador in parent territory'), (72, 15, 1, 'Ambassador foreign, Balanced'),
    (10, 9, 4, 'portal transient in ordinary seat'), (21, 2, 2, 'egress portal in nonportal seat'),
    (47, 10, 1, 'ordinary signature in ingress seat'), (16, 21, 4, 'operator in egress portal'),
    (7, 9, 2, 'kinetic trap: velocity in stillness'), (20, 20, 4, 'awareness unaware of itself'),
    (6, 12, 2, 'martyrdom coordinate'), (0, 0, 1, 'double self-seat portal Balanced'),
    (13, 12, 3, 'two endings differentiate, grief-adjacent'), (25, 7, 2, 'kin pair, bound in archetype seat'),
]
MEDICINES = [(36, 6, 'severing cure in binding seat'), (13, 3, 'ending prescribed in tending seat')]

# ---- exemplars (founder-gaveled finals) ----
EXEMPLARS = """GAVELED EXEMPLARS — derive from the LAWS these demonstrate; do NOT imitate their surface syntax:

ReadCell (Change · in Discipline · Unacknowledged):
core: "Change ends what has completed. In Discipline, it operates on the maintained practice: a structure whose function has run its course. Unacknowledged, the ending operates without recognition, so effort continues to maintain a practice after the condition it served has ceased to organize the present. Maintenance persists after relevance."
sheetLine: "The ending is already underway; the routine now outlasts the season it served."

ReadCell (Tune · in its own seat · Too Much):
core: "Tune adjusts expression toward fit — adding, reducing, retuning until output matches conditions. Seated in its own position, calibration becomes recursive: the faculty of adjustment is itself what is being adjusted. Too Much, no setting is allowed to stand — each achieved fit is immediately reopened, and the adjusting itself replaces the functioning it was meant to serve."
sheetLine: "It already fits; the mixer cannot leave the mixture alone."

MedicineKernel (Reciprocity · in Wisdom):
asMedicine: "Reciprocity opens the sealed store and lets keeping become exchange. In Wisdom, the medicine is circulation: what deep knowing has held now moves between beings — held things proving their worth by traveling."

ANTI-EXEMPLAR (failed cut, kept as the corpse that teaches — never write like this):
"Change clears what has completed so the next form begins. In Discipline — the lantern-lit practice of deliberate, solitary tending — it ends the routines that outlived their season." (Verdict: weather, not mechanism. Every clause gestures through imagery; nothing operational.)"""

LAWS = """You are authoring cells for Nirmanakaya's poured interpretive library — permanent, founder-verified text that ARMS a runtime AI as sealed semantic ground and serves verbatim in print. Twelve laws, all binding:

1. MECHANISM OVER IMAGERY: every sentence states an operational fact — what operates, on what, with what consequence. Imagery only where it adds precision, never as substitute. Test: strip any sentence and ask what it asserts about the state; if the answer is a vibe, it fails.
2. COMMITMENT: register-neutral means UNADDRESSED, not unvoiced. No "you", no reader, no question — but full commitment: the signature as ACTIVE verb-subject doing ONE derivable thing. BANNED hedges: may, might, perhaps, can suggest, could indicate.
3. ACTION + CONTEXT + INFLECTION: every core carries all three — what the signature does; what that doing does HERE, in this position; how the status alters the manner.
4. ENTAILMENT CEILING: no clause asserts more than the coordinates entail. Nothing requiring unstated biography, circumstance, motive, causal history, or literal-world condition. A cell may be vivid, but it may never know more than its address knows.
5. SYSTEMIC COST (imbalanced cells): state the TAX — the consequence of the imbalance on the surrounding structure. Never the tautology ("too little X = not enough X").
6. BALANCED ALIVENESS (Balanced cells): state what the signature is actively DOING well and what that doing FEEDS downstream. Balance is a verb with beneficiaries, never absence-of-problem.
7. SCALE INVARIANCE: the core must remain true for a five-minute conversation or a fifty-year commitment. NO domain nouns (career, marriage, job, relationship, money).
8. REGISTER PURITY: banned in cells: you, your, asker, question, reading, advice language, future prediction, presumed history.
9. STATUS VOCABULARY RESERVED: the words balance/balanced, too much, too little, unacknowledged never appear inside prose (the status inflects the manner; its label stays out of the sentences).
10. CANONICAL NAMES ONLY: use the provided signature/position names verbatim. Never traditional tarot names in prose.
11. SELF-SEAT RULE: a signature in its own position = the operator applied recursively to its own functional domain — never "nothing else to act upon".
12. PORTAL RULE: Source (ingress) and Creation (egress) are interfaces, not ordinary houses. Cells touching them use their canonical threshold function and never assign them ordinary house/process properties.

FORM: core ≤60 words (35-50 is the natural weight), ending on a graspable consequence (semantic, not formulaic). sheetLine ≤18 words, its own composition, readable ALONE in a stranger's pocket, plain words a tired person cannot misread, no new truth beyond the core. Adjectives: definitional only — if an adjective carries an emotion, cut it. Nouns bear the load; verbs move the weight.

MEDICINE LAWS (kernels only): the cure is always towards balance — the medicine speaks from the signature's BALANCED face regardless of any patient's condition. Medicine opens, restores, releases, invites; it NEVER forces, demands, musts, shoulds. It describes what the medicine DOES to the system, never instructs a person. No diagnosis of any recipient. No outcome promises. ≤40 words. Warm-but-mechanical register, per the gaveled exemplar."""

def build_prompt(kind, sig, pos, status=None):
    if kind == 'read':
        ask = ('Author ONE ReadCell for these coordinates. Respond with ONLY a JSON object: '
               '{"core": "...", "sheetLine": "..."}')
        coords = (f"SIGNATURE (the operator): {fact_line(sig)}\n"
                  f"POSITION (the place it operates): {fact_line(pos)}\n"
                  f"STATUS (the manner): {STATUS[status]}")
    else:
        ask = ('Author ONE MedicineKernel for these coordinates. Respond with ONLY a JSON object: '
               '{"asMedicine": "..."}')
        coords = (f"MEDICINE SIGNATURE (the cure, speaking from its balanced face): {fact_line(sig)}\n"
                  f"POSITION (the place the medicine arrives): {fact_line(pos)}")
    return f"{LAWS}\n\n{EXEMPLARS}\n\n{coords}\n\n{ask}"

def call(model_id, prompt, cache_path):
    if os.path.exists(cache_path):
        return json.load(open(cache_path, encoding='utf-8'))
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=json.dumps({'model': model_id, 'max_tokens': 700,
                         'messages': [{'role': 'user', 'content': prompt}]}).encode(),
        headers={'x-api-key': key, 'anthropic-version': '2023-06-01',
                 'content-type': 'application/json'})
    for attempt in range(3):
        try:
            resp = json.loads(urllib.request.urlopen(req, timeout=120).read())
            if 'content' in resp:
                json.dump(resp, open(cache_path, 'w', encoding='utf-8'))
                return resp
        except Exception as e:
            print(f'    retry {attempt+1}: {e}')
            time.sleep(5 * (attempt + 1))
    return None

HEDGES = re.compile(r'\b(may|might|perhaps|can suggest|could indicate)\b', re.I)
REGISTER = re.compile(r'\b(you|your|asker|question|reading)\b', re.I)
STATUSWORDS = re.compile(r'\b(balanced?|too much|too little|unacknowledged)\b', re.I)
COERCION = re.compile(r'\b(forces?|must|should|demands?|needs? to|have to)\b', re.I)

def lint(kind, obj):
    flags = []
    if kind == 'read':
        core, sheet = obj.get('core', ''), obj.get('sheetLine', '')
        if len(core.split()) > 60: flags.append(f'core {len(core.split())}w > 60')
        if len(sheet.split()) > 18: flags.append(f'sheet {len(sheet.split())}w > 18')
        for label, t in [('core', core), ('sheet', sheet)]:
            if HEDGES.search(t): flags.append(f'{label}: hedge "{HEDGES.search(t).group()}"')
            if REGISTER.search(t): flags.append(f'{label}: register "{REGISTER.search(t).group()}"')
            if STATUSWORDS.search(t): flags.append(f'{label}: status-word "{STATUSWORDS.search(t).group()}"')
    else:
        med = obj.get('asMedicine', '')
        if len(med.split()) > 40: flags.append(f'medicine {len(med.split())}w > 40')
        if COERCION.search(med): flags.append(f'coercion "{COERCION.search(med).group()}"')
        if REGISTER.search(med): flags.append(f'register "{REGISTER.search(med).group()}"')
    return flags

def parse_json(text):
    m = re.search(r'\{.*\}', text, re.S)
    if not m: return None
    try: return json.loads(m.group())
    except Exception: return None

# ---- run ----
deck = [('read', s, p, q, note) for (s, p, q, note) in READCELLS] + \
       [('med', s, p, None, note) for (s, p, note) in MEDICINES]

blind_lines = ['# POUR BAKE-OFF — BLIND JUDGING SHEET', '',
               'Three authors per cell, labels shuffled per cell. Judge: which author would you trust with 6,864 siblings?',
               'Mark winners; the key file reveals authors afterward.', '']
key_map = {}
total_usage = {}

for idx, (kind, sig, pos, status, note) in enumerate(deck, 1):
    cid = f"{kind}-{sig}-{pos}-{status or 'M'}"
    sname = facts.get(sig, {}).get('name', sig)
    pname = facts.get(pos, {}).get('name', pos)
    title = (f"CELL {idx}: {sname} · in {pname} · {STATUS[status]}" if kind == 'read'
             else f"CELL {idx} (MEDICINE): {sname} · in {pname}")
    print(f"[{idx}/{len(deck)}] {title}  ({note})")
    prompt = build_prompt(kind, sig, pos, status)
    outs = {}
    for mkey, mid in MODELS.items():
        cache = os.path.join(RAW, f'{cid}-{mkey}.json')
        resp = call(mid, prompt, cache)
        if not resp:
            outs[mkey] = {'_error': 'no response'}
            continue
        text = ''.join(c.get('text', '') for c in resp.get('content', []))
        obj = parse_json(text) or {'_error': 'unparseable', '_raw': text[:300]}
        obj['_lint'] = lint(kind, obj) if '_error' not in obj else ['UNPARSEABLE']
        outs[mkey] = obj
        u = resp.get('usage', {})
        t = total_usage.setdefault(mkey, {'in': 0, 'out': 0})
        t['in'] += u.get('input_tokens', 0); t['out'] += u.get('output_tokens', 0)
    # deterministic per-cell shuffle for blinding
    order = sorted(MODELS.keys(), key=lambda m: hashlib.md5(f'{cid}:{m}'.encode()).hexdigest())
    labels = ['A', 'B', 'C']
    key_map[cid] = dict(zip(labels, order))
    blind_lines.append(f'## {title}')
    blind_lines.append(f'*torture class: {note}*')
    for lab, mk in zip(labels, order):
        o = outs[mk]
        blind_lines.append(f'\n**Author {lab}:**')
        if '_error' in o:
            blind_lines.append(f'(FAILED: {o["_error"]})')
        elif kind == 'read':
            blind_lines.append(f'core: "{o.get("core","")}"')
            blind_lines.append(f'sheetLine: "{o.get("sheetLine","")}"')
        else:
            blind_lines.append(f'asMedicine: "{o.get("asMedicine","")}"')
        if o.get('_lint'):
            blind_lines.append(f'LINT: {"; ".join(o["_lint"])}')
    blind_lines.append('\n**WINNER: ____**\n')

json.dump(key_map, open(os.path.join(RESULTS, 'bakeoff_key.json'), 'w'), indent=2)
open(os.path.join(RESULTS, 'bakeoff_blind.md'), 'w', encoding='utf-8').write('\n'.join(blind_lines))

print('\n=== USAGE ===')
PRICE = {'haiku': (1, 5), 'sonnet': (3, 15), 'opus': (15, 75)}
grand = 0
for mk, t in total_usage.items():
    cost = (t['in'] * PRICE[mk][0] + t['out'] * PRICE[mk][1]) / 1e6
    grand += cost
    print(f"{mk}: {t['in']} in / {t['out']} out = ${cost:.3f}")
print(f'TOTAL: ${grand:.3f}')
print(f'\nBlind sheet: bench/pour/results/bakeoff_blind.md')
print('Key sealed in: bench/pour/results/bakeoff_key.json (do not open before judging)')
