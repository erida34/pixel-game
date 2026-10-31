"""Pixel redraw of the Pixelmon lantern study and accepted ground language.

Fifteen fixed-canvas frames; no rotation, scaling or generated animation.
Rebuilding invalidates approval unless exact recipe/atlas hashes match.
"""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
C = {k: tuple(bytes.fromhex(v)) + (255,) for k, v in dict(ink='181425', shade='193c3e', moss='265c42', leaf='3e8948', wood='733e39', brass='b86f50', gold='feae34', flame='fee761', blue='262b44', water='3a4466', ripple='5a6988').items()}

def draw(kind, f):
    im = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(im)
    if kind == 'plant':
        bend = [0, 1, 2, -1][f]
        d.ellipse((23, 52, 41, 57), fill=C['shade'])
        for x, height, side in [(25, 12, -1), (30, 23, -1), (34, 28, 1), (39, 17, 1)]:
            tip = x + bend * side
            d.line([(x, 55), (x + bend, 46), (tip + side * 3, 55 - height)], fill=C['ink'], width=3)
            d.line([(x, 54), (x + bend, 46), (tip + side * 3, 55 - height)], fill=C['moss'], width=1)
            for y in [43, 48]:
                d.polygon([(x + bend, y + 1), (x + bend + side * 6, y - 4), (x + bend + side * 5, y)], fill=C['leaf'])
    elif kind == 'water':
        # Walkable shallow puddle, not a fourth terrain material.
        d.polygon([(16, 51), (20, 46), (31, 43), (42, 45), (48, 50), (43, 55), (31, 58), (21, 56)], fill=C['shade'])
        d.polygon([(20, 51), (24, 47), (35, 46), (44, 50), (38, 55), (25, 55)], fill=C['blue'])
        for x, y, width in [(22, 49, 6), (32, 52, 8), (27, 55, 4)]:
            shift = [0, 1, 2, 1][f]
            d.line((x + shift, y - f % 2, x + width + shift, y - f % 2), fill=C['water'])
        d.line((30 + f, 48, 33 + f, 48), fill=C['ripple'])
    elif kind == 'lantern':
        d.ellipse((21, 51, 43, 58), fill=C['ink']); d.rectangle((29, 28, 34, 54), fill=C['ink'])
        d.rectangle((31, 27, 32, 54), fill=C['brass'])
        d.rectangle((23, 16, 40, 31), fill=C['ink']); d.rectangle((25, 18, 38, 29), fill=C['brass'])
        d.rectangle((28, 19, 35, 27), fill=C['wood']); d.rectangle((30, 21, 33, 26), fill=C['gold'])
        d.line((31 + f % 2, 25, 31 + f % 2, 19 + [1, 0, 2, 1][f]), fill=C['flame'], width=1)
        d.polygon([(21, 16), (27, 11), (37, 11), (42, 16)], fill=C['ink'])
        d.line((27, 13, 37, 13), fill=C['brass']); d.line((26, 30, 38, 30), fill=C['gold'])
        for points in [[(22, 56), (28, 52), (34, 43), (31, 37)], [(42, 55), (36, 52), (30, 44), (33, 32)]]:
            d.line(points, fill=C['shade'], width=3); d.line(points, fill=C['moss'], width=1)
    elif kind == 'roots':
        for points in [[(18, 55), (26, 53), (30, 43), (34, 40)], [(45, 56), (38, 53), (31, 49), (24, 45)], [(22, 58), (31, 55), (42, 46)]]:
            d.line(points, fill=C['ink'], width=5); d.line(points, fill=C['wood'], width=3); d.line(points, fill=C['shade'], width=1)
    elif kind == 'bench':
        for x in [22, 41]: d.rectangle((x, 44, x + 2, 56), fill=C['ink'])
        d.rectangle((17, 40, 47, 45), fill=C['ink']); d.rectangle((19, 41, 45, 43), fill=C['wood'])
        d.rectangle((17, 49, 47, 53), fill=C['ink']); d.line((19, 50, 45, 50), fill=C['brass'])
        d.line((27, 42, 29, 40), fill=C['shade']); d.line((36, 50, 39, 53), fill=C['shade'])
    else:
        d.line([(20, 55), (20, 29), (29, 21), (43, 26), (43, 36)], fill=C['ink'], width=5)
        d.line([(20, 54), (20, 29), (29, 21), (43, 26), (43, 36)], fill=C['brass'], width=1)
        d.polygon([(23, 31), (30, 26), (33, 36), (24, 43)], fill=C['water'])
        d.line((26, 31, 27, 36), fill=C['ripple']); d.line((20, 55, 43, 55), fill=C['shade'], width=3)
        d.polygon([(35, 51), (41, 45), (40, 54)], fill=C['water'])
    return im

frames = []; clips = []
for kind in ['plant', 'water', 'lantern', 'roots', 'bench', 'glass']:
    count = 4 if kind in ['plant', 'water', 'lantern'] else 1
    names = [f'environment/{kind}/none/{f:02d}' for f in range(count)]
    clips.append(dict(state=kind, direction='none', frames=names, fps=4, repeat=-1))
    frames.extend((name, draw(kind, f)) for f, name in enumerate(names))
sheet = Image.new('RGBA', (256, 256)); atlas = dict(frames={}, meta=dict(image='environment.png', size=dict(w=256, h=256), scale='1'))
for n, (name, image) in enumerate(frames):
    x = n % 4 * 64; y = n // 4 * 64; sheet.paste(image, (x, y))
    atlas['frames'][name] = dict(frame=dict(x=x, y=y, w=64, h=64), rotated=False, trimmed=False, spriteSourceSize=dict(x=0, y=0, w=64, h=64), sourceSize=dict(w=64, h=64))
out = ROOT / 'public/assets/environment'; out.mkdir(parents=True, exist_ok=True)
sheet.save(out / 'environment.png'); (out / 'environment.json').write_text(json.dumps(atlas, indent=2) + '\n', encoding='utf-8')
source = ROOT / 'assets-source/candidates/environment'; target = ROOT / 'assets-source/processed/environment'; target.mkdir(parents=True, exist_ok=True)
metadata = json.loads((source / 'metadata.json').read_text())
metadata['sourceFiles'] += ['assets-source/approved/grass/pixelmon-base.png', 'assets-source/approved/dirt/pixelmon-base.png']
metadata.update(sourceKind='Pixelmon lantern base study + scripted pixel redraw; plants and puddles derived from accepted ground art', edits=[dict(author='Codex', tool='tools/build-environment.py / Pillow 12.3.0', operations='Full pixel redraw; articulated leaf positions, moving ripple pixel clusters, four flame silhouettes. Roots, bench and broken greenhouse rib constructed in the same palette. Fixed 64x64 canvas and feet at y=56; no scaled/rotated animation.')], reviewStatus='draft', evidence=[], productionParameters=dict(size=64, palette='ENDESGA-32', steps=25, cfg=7, loraStrength=1, ditherAmount=0, generationResolution=1024, sampler='euler', scheduler='normal', fast=False))
asset = dict(id='environment', type='atlas', status='placeholder', texture='assets/environment/environment.png', atlas='assets/environment/environment.json', frameSize=dict(width=64, height=64), origin=dict(x=0.5, y=0.875), clips=clips, provenance='assets-source/processed/environment/metadata.json')
review_path = ROOT / 'docs/evidence/stage-3/art-review.json'
if review_path.exists():
    review = json.loads(review_path.read_text())
    hashes = dict(recipeSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), textureSha256=hashlib.sha256((out / 'environment.png').read_bytes()).hexdigest(), atlasSha256=hashlib.sha256((out / 'environment.json').read_bytes()).hexdigest())
    if review.get('status') == 'approved' and all(review.get(k) == v for k, v in hashes.items()) and all((ROOT / f).is_file() for f in review['evidence']):
        target = ROOT / 'assets-source/approved/environment'; target.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / 'pixelmon-base.png', target / 'pixelmon-base.png')
        shutil.copy2(source / 'generation.txt', target / 'generation.txt')
        metadata.update(reviewStatus='approved', evidence=review['evidence'], reviewRef='docs/evidence/stage-3/art-review.json', sourceFiles=['assets-source/approved/environment/pixelmon-base.png', 'assets-source/approved/environment/generation.txt', 'assets-source/approved/grass/pixelmon-base.png', 'assets-source/approved/dirt/pixelmon-base.png'])
        asset.update(status='approved', provenance='assets-source/approved/environment/metadata.json')
(target / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
manifest_path = ROOT / 'public/assets/manifest.json'; manifest = json.loads(manifest_path.read_text())
manifest['assets'] = [a for a in manifest['assets'] if a['id'] != 'environment'] + [asset]
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(f'Environment: {len(frames)} frames, {asset["status"]}')
