#!/usr/bin/env python3
"""Optional asset authoring; committed output makes normal pnpm builds independent of Python."""
import json
import shutil
import unicodedata
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
lessons = [json.loads(p.read_text()) for p in (ROOT / 'content/lessons').glob('*.json')]
text = ''.join(json.dumps(lesson, ensure_ascii=False) for lesson in lessons)
characters = set(text)
source = ROOT / 'node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-500-normal.woff'
font = TTFont(source)
coverage = set(font.getBestCmap())
missing = [c for c in characters if unicodedata.name(c, '').startswith('CJK UNIFIED') and ord(c) not in coverage]
if missing:
    raise ValueError(f'Font source is missing curriculum characters: {missing}')
options = subset.Options()
options.flavor = 'woff'
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes={ord(c) for c in characters} & coverage)
subsetter.subset(font)
font.flavor = 'woff'
destination = ROOT / 'src/assets/noto-curriculum.woff'
font.save(destination)
stroke_source = ROOT / 'node_modules/hanzi-writer-data'
stroke_destination = ROOT / 'public/strokes'
stroke_destination.mkdir(exist_ok=True)
heads = {c for lesson in lessons for item in lesson['items'] if item['kind'] == 'vocabulary' for c in item['hanzi']}
missing_strokes = []
for char in sorted(heads):
    source_file = stroke_source / f'{char}.json'
    if not source_file.exists():
        missing_strokes.append(char)
        continue
    data = json.loads(source_file.read_text())
    assert data['strokes'] and len(data['strokes']) == len(data['medians'])
    shutil.copyfile(source_file, stroke_destination / source_file.name)
shutil.copyfile(stroke_source / 'ARPHICPL.TXT', stroke_destination / 'ARPHICPL.TXT')
print(f'Font: {destination.stat().st_size} bytes, {len(characters)} source characters; strokes: {len(heads)-len(missing_strokes)}/{len(heads)} headword characters.')
if missing_strokes:
    print(f'No stroke source available (UI fallback required): {missing_strokes}')
