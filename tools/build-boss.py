"""Fixed-canvas, articulated boss pixels from the recorded Pixelmon study."""
import hashlib
import json
import math
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[1]
C = {k: tuple(bytes.fromhex(v)) + (255,) for k, v in dict(ink='181425', root='733e39', brass='b86f50', wax='ead4aa', shade='e4a672', green='265c42', dark='193c3e', violet='68386c', eye='b55088', pink='f6757a', night='262b44').items()}

def frame(state, f):
    im = Image.new('RGBA', (128, 128)); d = ImageDraw.Draw(im)
    death = state == 'death'
    collapse = f * 3 if death else 0
    stride = [-3, 0, 3, 1][f % 4] if state == 'move' else 0
    prepare = state.startswith('prepare')
    thorns = state.endswith('thorns')
    shift = (f - 1) if prepare else -f if state == 'hit' else 0
    cy = 68 + collapse + shift
    # Each root has its own joint/foot trajectory; the canvas and anchor never move.
    for n in range(8):
        side = -1 if n < 4 else 1; row = n % 4
        x = 64 + side * (18 + row * 2); y = 73 + row * 5 + collapse
        joint = 64 + side * (36 + row * 3 + (f if prepare else 0))
        end = 64 + side * (40 + row * 4)
        foot = 101 + row * 2 + stride * (-1 if n % 2 else 1)
        if death: foot = 108 + row % 2
        points = [(x, y), (joint, min(109, y + 7)), (end, foot)]
        d.line(points, fill=C['ink'], width=8); d.line(points, fill=C['root'], width=5)
        d.line((joint, min(109, y+7), joint+side*4, min(115,y+13)), fill=C['green'], width=2)
    if death and f >= 5:
        for n in range(7):
            x = 37 + n * 8; y = 95 + n % 3 * 5
            d.rectangle((x, y, x+6, y+3), fill=C['wax' if n%2 else 'brass'], outline=C['ink'])
        d.rectangle((62, 99, 65, 101 + (f-5)), fill=C['violet'])
        return im
    # Large wax core and fractured greenhouse cage. All variations are redrawn.
    box = (36 + (f if death else 0), 35 + collapse + shift, 92 - (f if death else 0), min(108,99+collapse+shift))
    d.ellipse(box, fill=C['ink']); d.ellipse((box[0]+3,box[1]+3,box[2]-3,box[3]-3),fill=C['shade'])
    d.polygon([(45,cy-24),(72,cy-28),(84,cy-8),(76,cy+20),(48,cy+23),(41,cy)],fill=C['wax'])
    for n in range(4):
        x = 38 + n * 16 + (f if prepare and n%2 else 0)
        d.line([(x, cy+27),(x-5,cy-9),(x+6,cy-30)],fill=C['ink'],width=5)
        d.line([(x, cy+27),(x-5,cy-9),(x+6,cy-30)],fill=C['brass'],width=3)
    d.line([(67,cy-23),(59,cy-12),(69,cy-2),(58,cy+9),(64,cy+23)],fill=C['ink'],width=3)
    d.line([(66,cy-20),(61,cy-12),(68,cy-2),(60,cy+8)],fill=C['eye' if prepare else 'violet'],width=2)
    d.rectangle((52,cy-5,56,cy-2),fill=C['pink']); d.rectangle((74,cy-5,78,cy-2),fill=C['pink'])
    for n in range(5):
        x=43+n*9; y=27+(n%2)*5+shift
        height=6+f*2 if prepare and thorns else 5+(f%2)
        d.polygon([(x-3,y+height),(x,y),(x+3,y+height)],fill=C['green'],outline=C['ink'])
    if state.endswith('summon'):
        for n in range(3):
            x=53+n*12; y=cy+12 + (f%2)*2
            d.ellipse((x-3,y-3-f,x+3,y+3),fill=C['violet'],outline=C['eye'])
    if state.startswith('attack'):
        for n in range(6):
            x=27+n*15; y=104 - (f+n)%4*4
            d.line((x,y,x+(n-2)*2,y-4-f),fill=C['eye'],width=2)
    if state == 'idle': d.point((69+f,cy-9),fill=C['pink'])
    return im

states = {'idle':(4,6,-1),'move':(4,8,-1),'prepare_thorns':(4,4/1.2,0),'attack_thorns':(4,8,0),'prepare_summon':(4,4/1.4,0),'attack_summon':(4,8,0),'hit':(2,12,0),'death':(8,8,0)}
frames=[]; clips=[]
for state,(count,fps,repeat) in states.items():
    names=[f'greenhouse_heart/{state}/none/{f:02d}' for f in range(count)]
    clips.append(dict(state=state,direction='none',frames=names,fps=fps,repeat=repeat))
    frames.extend((name,frame(state,f)) for f,name in enumerate(names))
sheet=Image.new('RGBA',(8*128,math.ceil(len(frames)/8)*128))
atlas={'frames':{},'meta':{'image':'greenhouse_heart.png','size':{'w':sheet.width,'h':sheet.height},'scale':'1'}}
for n,(name,im) in enumerate(frames):
    x=n%8*128;y=n//8*128;sheet.paste(im,(x,y))
    atlas['frames'][name]={'frame':{'x':x,'y':y,'w':128,'h':128},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':128,'h':128},'sourceSize':{'w':128,'h':128}}
out=ROOT/'public/assets/boss';out.mkdir(parents=True,exist_ok=True)
sheet.save(out/'greenhouse_heart.png');(out/'greenhouse_heart.json').write_text(json.dumps(atlas,indent=2)+'\n',encoding='utf-8')
hashes=dict(recipeSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),textureSha256=hashlib.sha256((out/'greenhouse_heart.png').read_bytes()).hexdigest(),atlasSha256=hashlib.sha256((out/'greenhouse_heart.json').read_bytes()).hexdigest())
review_path=ROOT/'docs/evidence/stage-5/art-review.json';review=json.loads(review_path.read_text()) if review_path.exists() else {}
accepted=review.get('status')=='approved' and review.get('hashes')==hashes and all((ROOT/e).is_file() for e in review.get('evidence',[]))
target=ROOT/f"assets-source/{'approved' if accepted else 'processed'}/greenhouse_heart";target.mkdir(parents=True,exist_ok=True)
base=ROOT/'assets-source/candidates/greenhouse_heart';meta=json.loads((base/'metadata.json').read_text())
for name in ['pixelmon-base.png','generation.txt']:shutil.copy2(base/name,target/name)
prefix=target.relative_to(ROOT).as_posix()
meta.update(sourceKind='Pixelmon base study followed by full articulated pixel redraw',sourceFiles=[prefix+'/pixelmon-base.png',prefix+'/generation.txt'],edits=[dict(author='Codex',tool=f'tools/build-boss.py / Pillow {pillow_version}',operations='Broad wax core, fractured brass cage, eight roots with separate joints and stride, distinct thorn/summon preparation and release, cracking hit and eight-frame collapse; fixed 128px canvas and feet anchor. No whole-image rotation or scaling.')],symmetry='rooted organism has a fixed frontal cage; no facing rotation',reviewStatus='approved' if accepted else 'draft',reviewRef='docs/evidence/stage-5/art-review.json',evidence=review.get('evidence',[]) if accepted else [])
(target/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
manifest_path=ROOT/'public/assets/manifest.json';manifest=json.loads(manifest_path.read_text())
manifest['assets']=[a for a in manifest['assets'] if a['id']!='greenhouse_heart']+[dict(id='greenhouse_heart',type='atlas',status='approved' if accepted else 'placeholder',texture='assets/boss/greenhouse_heart.png',atlas='assets/boss/greenhouse_heart.json',frameSize=dict(width=128,height=128),origin=dict(x=.5,y=.875),clips=clips,provenance=prefix+'/metadata.json')]
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
evidence=ROOT/'docs/evidence/stage-5';evidence.mkdir(parents=True,exist_ok=True)
gallery=Image.new('RGBA',(8*128,8*128),C['night'])
for row,(state,(count,_,_)) in enumerate(states.items()):
    for f in range(count):gallery.alpha_composite(frame(state,f),(f*128,row*128))
gallery.save(evidence/'boss-contact-sheet-1x.png');gallery.resize((2048,2048),Image.Resampling.NEAREST).save(evidence/'boss-contact-sheet-2x.png')
print('Boss:',len(frames),'frames;', 'approved' if accepted else 'placeholder')
