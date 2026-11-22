"""Build the offline spelling lexicon from Carnegie Mellon University's CMUdict.

Use the cmudict.dict file at cmusphinx/cmudict commit
74790861f652b15e4ac49015a90074ad62a27690. The input can also be a
one-word-per-line extraction from that same file. Only alphabetic forms and
internal apostrophes enter the published lexicon.
"""
import base64
import hashlib
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('Usage: python tools/dictionary.py path/to/cmudict.dict')
root = Path(__file__).resolve().parents[1]
if sys.argv[1] == '--fetch':
    url = 'https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict'
    with urllib.request.urlopen(url, timeout=90) as request:
        source = request.read()
    object_id = hashlib.sha1(b'blob ' + str(len(source)).encode() + b'\x00' + source).hexdigest()
    if object_id != '2c0411740cce3e2026a80b90b650d5f6a7258164':
        raise ValueError('Unexpected CMUdict source revision')
else:
    source = Path(sys.argv[1]).read_bytes()
terms = set()
for line in source.decode('utf-8').splitlines():
    if not line.strip():
        continue
    word = re.sub(r'\(\d+\)$', '', line.split()[0].lower())
    if re.fullmatch(r"[a-z]+(?:'[a-z]+)*", word):
        terms.add(word)
terms.update('screenplay screenplays slugline sluglines voiceover voiceovers cutscene cutscenes broll livestream livestreams livestreaming youtube tiktok podcast podcasts cinematics diegetic nondiegetic questline questlines npc npcs gameplay cinematographer teleplay teleplays scenetemple timecode timecodes previsualization projectionist'.split())
buffer = io.BytesIO()
with zipfile.ZipFile(buffer, 'w') as archive:
    entry = zipfile.ZipInfo('words.txt', (2020, 1, 1, 0, 0, 0))
    archive.writestr(entry, '\n'.join(sorted(terms)), compress_type=zipfile.ZIP_DEFLATED)
payload = json.dumps(base64.b64encode(buffer.getvalue()).decode('ascii'))
(root / 'app/assets/en-us.js').write_text('globalThis.SceneLexicon = ' + payload + ';\n', encoding='utf-8')
print(len(terms), 'English word forms')
