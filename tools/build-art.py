"""Reproducible pixel edits from the five Pixelmon base studies.

Character poses are redrawn by parts, without sprite rotation/mirroring.
Outputs remain placeholders until the documented visual review passes.
"""
import json
import hashlib
import math
import random
import shutil
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets'
PALETTE = ['be4a2f','d77643','ead4aa','e4a672','b86f50','733e39','3e2731','a22633','e43b44','f77622','feae34','fee761','63c74d','3e8948','265c42','193c3e','124e89','0099db','2ce8f5','ffffff','c0cbdc','8b9bb4','5a6988','3a4466','262b44','181425','ff0044','68386c','b55088','f6757a','e8b796','c28569']
C = {key: tuple(bytes.fromhex(value)) + (255,) for key,value in {
    'ink':'181425','night':'262b44','shadow':'193c3e','teal':'193c3e','coat':'124e89','moss':'63c74d',
    'wax':'ead4aa','skin':'e4a672','brass':'b86f50','gold':'feae34','flame':'fee761',
    'brown':'3e2731','root':'733e39','wood':'b86f50','purple':'68386c','eye':'b55088','grey':'5a6988'
}.items()}
DIRECTIONS = ['n','ne','e','se','s','sw','w','nw']

def normalize(mask):
    for corner,sides in [(2,5),(8,20),(32,80),(128,65)]:
        if mask & sides != sides:
            mask &= ~corner
    return mask

MASKS = sorted({normalize(mask) for mask in range(256)})

def polygon(d, points, color, outline='ink'):
    p = [(round(x),round(y)) for x,y in points]
    d.polygon(p, fill=C[color])
    if outline:
        d.line(p + [p[0]], fill=C[outline], width=1)

def hero(direction, state, frame):
    im = Image.new('RGBA', (64,64))
    d = ImageDraw.Draw(im)
    angle = DIRECTIONS.index(direction) * math.pi / 4
    vx,vy = math.sin(angle),-math.cos(angle)
    rx,ry = -vy,vx  # Anatomical right, projected into world coordinates.
    front = vy > 0.15
    side = abs(vx) > 0.85
    stride = [0,3,2,0,-3,-2][frame] if state == 'walk' else 0
    breath = [0,0,1,0][frame] if state == 'idle' else 0
    drop = [0,2,5,9,14,18][frame] if state == 'death' else 0
    cx,cy = 32, 36 + breath + min(drop,6)
    # Each pose changes knees, arms and hem independently. Anchor stays at y=56.
    def point(across, forward, z=0):
        projected_right = rx if abs(rx)>0.55 else 0.55*(1 if vx>0 else -1)
        return (cx + projected_right*across + vx*forward, cy + ry*across*0.4 + vy*forward*0.45 - z)
    if state == 'death' and frame >= 3:
        polygon(d, [(20,51),(25,45),(39,45),(45,49),(43,54),(23,55)], 'teal')
        d.rectangle((25,50,34,53),fill=C['coat'])
        d.rectangle((38,50,45,53),fill=C['brown'])
        hx,hy=round(32+vx*11),round(49+vy*3)
        d.ellipse((hx-5,hy-4,hx+5,hy+3),fill=C['teal'],outline=C['ink'])
        if front: d.rectangle((hx-2,hy,hx+2,hy+2),fill=C['skin'])
        lx,ly=round(32+rx*15),round(52+ry*2)
        d.rectangle((lx-2,ly,lx+2,ly+2),fill=C['brass'])
        if frame == 3: d.point((lx,ly-1),fill=C['gold'])
        return im
    # Feet and articulated legs behind coat.
    for sign in [-1,1]:
        swing = stride*sign
        hip = point(sign*4,0,-7)
        knee = point(sign*5,swing,-12)
        foot = point(sign*5,swing*1.8,-18+abs(swing)*0.35)
        hip=(hip[0],hip[1]-breath); knee=(knee[0],knee[1]-breath); foot=(foot[0],foot[1]-breath)
        d.line([hip,knee,foot],fill=C['ink'],width=5)
        d.line([hip,knee],fill=C['grey'],width=3)
        fx,fy = foot
        d.rectangle((round(fx)-2,round(fy)-1,round(fx)+3,round(fy)+1),fill=C['brown'])
        d.point((round(fx)-1,round(fy)-1),fill=C['brass'])
    # Lamp moves in depth with right hand, so rear-facing poses can occlude its handle.
    lamp = point(12,1 + stride*0.25,1)
    def lantern():
        lx,ly = map(round,lamp)
        d.arc((lx-2,ly-6,lx+2,ly-1),180,360,fill=C['brass'],width=1)
        d.rectangle((lx-3,ly-2,lx+3,ly+7),fill=C['ink'])
        d.rectangle((lx-2,ly-1,lx+2,ly+6),fill=C['brass'])
        d.rectangle((lx-1,ly,lx+1,ly+4),fill=C['gold'])
        d.line((lx,ly+3,lx,ly+(0 if frame%2 else -1)),fill=C['flame'])
        d.line((lx-3,ly+6,lx+3,ly+6),fill=C['wood'])
    if ry < -0.2: lantern()
    # Coat silhouette narrows at shoulder; flapping hem alternates with gait.
    hem = (1 if stride>0 else -1 if stride<0 else 0)
    polygon(d,[point(-7,0,12),point(7,0,12),point(9,0,-10),point(5+hem,0,-12),point(-9+hem,0,-10)],'teal')
    polygon(d,[point(-5,1,10),point(4,1,10),point(6,1,-8),point(-5,1,-8)],'coat',None)
    if front:
        d.line([point(0,2,8),point(0,2,-10)],fill=C['shadow'],width=1)
        for z in [5,1,-3]: d.point(tuple(map(round,point(1,2,z))),fill=C['brass'])
        polygon(d,[point(-6,1,11),point(-1,3,6),point(0,1,11)],'wax',None)
        polygon(d,[point(6,1,11),point(1,3,6),point(0,1,11)],'teal',None)
    else:
        d.line([point(-5,-1,7),point(5,-1,7)],fill=C['shadow'],width=1)
        d.line([point(0,-1,6),point(0,-1,-7)],fill=C['shadow'],width=1)
    # Satchel always opposite the lamp. Its strap crosses the chest/back.
    bx,by = point(-9,0,-1)
    d.line([point(5,0,11),(bx,by)],fill=C['brown'],width=2)
    d.rectangle((round(bx)-3,round(by),round(bx)+3,round(by)+6),fill=C['brown'],outline=C['ink'])
    d.line((round(bx)-2,round(by)+1,round(bx)+2,round(by)+1),fill=C['brass'])
    # Arm follows right shoulder and bends at elbow; no whole-image transforms.
    shoulder, elbow, hand = point(7,0,10),point(10,stride*0.3,5),point(12,1+stride*0.25,1)
    d.line([shoulder,elbow,hand],fill=C['ink'],width=5)
    d.line([shoulder,elbow],fill=C['teal'],width=3)
    d.rectangle((round(hand[0])-1,round(hand[1])-1,round(hand[0])+1,round(hand[1])+1),fill=C['skin'])
    if ry >= -0.2: lantern()
    # Head: front face / side profile / back hood are separate pixel constructions.
    hy = round(cy-19)
    hx = round(cx+vx*2)
    d.ellipse((hx-6,hy-6,hx+6,hy+5),fill=C['ink'])
    d.ellipse((hx-5,hy-5,hx+5,hy+4),fill=C['teal'])
    if front:
        d.rectangle((hx-3,hy-1,hx+3,hy+4),fill=C['skin'])
        d.line((hx-3,hy-1,hx+3,hy-1),fill=C['wax'])
        d.point((hx-2,hy+1),fill=C['ink']); d.point((hx+2,hy+1),fill=C['ink'])
        d.line((hx-2,hy+4,hx+2,hy+4),fill=C['brass'])
    elif side:
        sign = 1 if vx > 0 else -1
        d.rectangle((hx+sign*2-1,hy,hx+sign*2+1,hy+4),fill=C['skin'])
        d.point((hx+sign*4,hy+1),fill=C['skin'])
        d.point((hx+sign*3,hy),fill=C['ink'])
    d.line((hx-3,hy-4,hx+2,hy-4),fill=C['coat'])
    d.rectangle((hx-6,hy-1,hx+6,hy),fill=C['shadow'])
    if state == 'hit':
        # Redrawn cloth tear and a small wax impact spark; silhouette is retained.
        polygon(d,[(cx-4,cy),(cx,cy-3),(cx+3,cy+1),(cx,cy+5)],'wax',None)
        for px,py in [(cx-12,cy-8),(cx+13,cy-7)]:
            d.line((px,py-frame*2,px+2,py-2-frame*2),fill=C['gold'])
    return im

def enemy(direction, state, frame):
    im=Image.new('RGBA',(64,64)); d=ImageDraw.Draw(im)
    index=['n','e','s','w'].index(direction)
    vx,vy=[(0,-1),(1,0),(0,1),(-1,0)][index]
    phase=[-2,0,2,0][frame] if state=='move' else 0
    collapse=frame*3 if state=='death' else 0
    cx,cy=32,43+collapse//2
    # Four distinct projections of a low root-and-wax body, articulated roots.
    for side in [-1,1]:
        for j in range(3):
            y=42+j*4
            start=(cx+side*5,y-2)
            elbow=(cx+side*(12+j*2),y+(phase if j%2 else -phase))
            tip=(cx+side*(18+j*2-collapse),min(56,y+6))
            d.line([start,elbow,tip],fill=C['ink'],width=5)
            d.line([start,elbow,tip],fill=C['root'],width=3)
            d.line([start,elbow],fill=C['wood'],width=1)
            d.line([elbow,(elbow[0]+side*3,elbow[1]-3)],fill=C['root'],width=2)
    polygon(d,[(21,42+collapse),(27,33+collapse),(36,31+collapse),(44,40+collapse),(40,52),(25,52)],'brown')
    polygon(d,[(23,42+collapse),(29,35+collapse),(37,36+collapse),(41,44+collapse),(35,48)],'root',None)
    hx=cx+vx*6; hy=39+vy*4+collapse
    if state=='death' and frame>=2:
        polygon(d,[(hx-7,hy+2),(hx-3,hy),(hx+2,hy+3),(hx+7,hy),(hx+5,hy+6),(hx-4,hy+7)],'wax')
        d.point((hx+9,hy+2),fill=C['wax']); d.point((hx-9,hy+5),fill=C['wax'])
    else:
        polygon(d,[(hx-7,hy),(hx-4,hy-5),(hx+4,hy-5),(hx+7,hy),(hx+5,hy+7),(hx-5,hy+7)],'wax')
        d.line((hx-2,hy-4,hx,hy+1,hx-2,hy+5),fill=C['brass'])
        if direction!='n':
            for offset in ([-3,3] if vy else [vx*3]):
                d.rectangle((hx+offset-1,hy,hx+offset+1,hy+2),fill=C['purple'])
                d.point((hx+offset,hy+1),fill=C['eye'])
        else: d.line((hx-4,hy-2,hx+4,hy-2),fill=C['brass'])
    if state=='hit':
        d.line((24-frame*2,33,21-frame*2,30),fill=C['wax'],width=1)
        d.line((44+frame*2,33,47+frame*2,30),fill=C['wax'],width=1)
    return im

def atlas(asset_id, frames, size, clips=None, directions=None, transitions=None):
    cols=12; rows=math.ceil(len(frames)/cols)
    sheet=Image.new('RGBA',(size*cols,size*rows)); entries={}
    for i,(name,image) in enumerate(frames):
        x,y=i%cols*size,i//cols*size; sheet.paste(image,(x,y))
        entries[name]={'frame':{'x':x,'y':y,'w':size,'h':size},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':size,'h':size},'sourceSize':{'w':size,'h':size}}
    folder=OUT/asset_id; folder.mkdir(parents=True,exist_ok=True)
    sheet.save(folder/'atlas.png')
    (folder/'atlas.json').write_text(json.dumps({'frames':entries,'meta':{'image':'atlas.png','size':{'w':sheet.width,'h':sheet.height},'scale':'1'}},indent=2)+'\n',encoding='utf-8')
    result={'id':asset_id,'type':'atlas','status':'placeholder','texture':f'assets/{asset_id}/atlas.png','atlas':f'assets/{asset_id}/atlas.json','frameSize':{'width':size,'height':size},'origin':{'x':0.5,'y':0.875 if size==64 else 0.5},'provenance':f'assets-source/processed/{asset_id}/metadata.json'}
    if clips is not None: result.update(clips=clips,directions=directions)
    if transitions is not None: result['transitions']=transitions
    return result

def dark_ground(material, variant):
    source=Image.open(ROOT/'assets-source'/'candidates'/material/'pixelmon-base.png').convert('RGB')
    # Restrict ground contrast while keeping the generated clusters as a base study.
    colors=[C[key][:3] for key in {'grass':['shadow','teal'], 'dirt':['ink','brown'], 'cobble':['night','grey']}[material]]
    im=Image.new('RGBA',(32,32))
    for y in range(32):
        for x in range(32):
            rgb=source.getpixel(((x+variant*7)%32,(y+variant*11)%32))
            light=sum(rgb)/3
            im.putpixel((x,y),colors[1 if light>105 else 0]+(255,))
    d=ImageDraw.Draw(im); rng=random.Random({'grass':2101,'dirt':2201,'cobble':2301}[material]+variant)
    if material=='grass':
        d.rectangle((0,0,31,31),fill=C['shadow'])
        for _ in range(35):
            x,y=rng.randrange(3,29),rng.randrange(3,29)
            d.line((x,y,x+1,y-2),fill=tuple(bytes.fromhex('265c42'))+(255,))
            if rng.random()<0.3: d.point((x-1,y-1),fill=tuple(bytes.fromhex('265c42'))+(255,))
    if material=='dirt':
        # Redraw the generated pebble clusters sparsely, without a square rim.
        d.rectangle((0,0,31,31),fill=C['brown'])
        for _ in range(32):
            x,y=rng.randrange(3,29),rng.randrange(3,29)
            d.line((x,y,x+1,y),fill=C['ink'])
    if material=='cobble':
        # Rounded, staggered cobbles with clipped corners, wrapped on all sides.
        d.rectangle((0,0,31,31),fill=C['ink'])
        for y in range(0,32,8):
            offset=0 if y%16==0 else 4
            for x in range(-8+offset,32,8):
                polygon(d,[(x+2,y+1),(x+5,y+1),(x+6,y+2),(x+6,y+5),(x+5,y+6),(x+2,y+6),(x+1,y+5),(x+1,y+2)],'night',None)
                if rng.random()<0.6: d.line((x+2,y+2,x+3,y+2),fill=C['grey'])
    # Compatible 2-pixel perimeter, same for every variant.
    base=C[{'grass':'shadow','dirt':'brown','cobble':'night'}[material]]
    for y in range(32):
        for x in range(32):
            if material!='cobble' and (x<2 or y<2 or x>29 or y>29): im.putpixel((x,y),base)
    return im

def transition(texture, mask, material):
    im=texture.copy()
    def border(p):
        q=min(p,31-p)
        return 3 + (1 if q%7 in [1,2,3] else 0)
    for y in range(32):
        for x in range(32):
            visible=True
            if not mask&1 and y<border(x): visible=False
            if not mask&4 and 31-x<border(y): visible=False
            if not mask&16 and 31-y<border(x): visible=False
            if not mask&64 and x<border(y): visible=False
            for corner,sides,dx,dy in [(2,5,31-x,y),(8,20,31-x,31-y),(32,80,x,31-y),(128,65,x,y)]:
                if mask&sides==sides and not mask&corner and dx*dx+dy*dy<9: visible=False
                if not mask&sides and dx<12 and dy<12 and (dx-12)**2+(dy-12)**2>9**2: visible=False
            if not visible: im.putpixel((x,y),(0,0,0,0))
    # Grass edge highlights stay inside the opaque region; no alpha blending.
    if material=='grass':
        for y in range(1,31):
            for x in range(1,31):
                if im.getpixel((x,y))[3] and any(im.getpixel((x+dx,y+dy))[3]==0 for dx,dy in [(0,-1),(1,0),(0,1),(-1,0)]):
                    im.putpixel((x,y),tuple(bytes.fromhex('265c42'))+(255,))
    return im

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    assets=[]
    for asset_id,entity,directions,states,draw in [
        ('hero_lantern_keeper','hero',DIRECTIONS,{'idle':(4,6,-1),'walk':(6,10,-1),'hit':(2,12,0),'death':(6,8,0)},hero),
        ('root_crawler','enemy',['n','e','s','w'],{'move':(4,8,-1),'hit':(2,12,0),'death':(4,8,0)},enemy)
    ]:
        frames=[]; clips=[]
        for state,(count,fps,repeat) in states.items():
            for direction in directions:
                names=[f'{entity}/{state}/{direction}/{f:02d}' for f in range(count)]
                frames.extend((name,draw(direction,state,f)) for f,name in enumerate(names))
                clips.append({'state':state,'direction':direction,'frames':names,'fps':fps,'repeat':repeat})
        assets.append(atlas(asset_id,frames,64,clips,directions))
    for material in ['grass','dirt','cobble']:
        frames=[(f'{material}/variant/{v:02d}',dark_ground(material,v)) for v in range(3)]
        if material!='dirt':
            mapping={str(mask):f'{material}/mask/{mask:03d}' for mask in MASKS}
            frames += [(mapping[str(mask)],transition(dark_ground(material,0),mask,material)) for mask in MASKS]
            pair=['grass','dirt'] if material=='grass' else ['dirt','cobble']
            assets.append(atlas(material,frames,32,transitions={'materials':pair,'maskToFrame':mapping}))
        else: assets.append(atlas(material,frames,32))
    for asset in assets:
        source_id={'hero_lantern_keeper':'hero','root_crawler':'enemy'}.get(asset['id'],asset['id'])
        base=json.loads((ROOT/'assets-source'/'candidates'/source_id/'metadata.json').read_text(encoding='utf-8'))
        base['assetId']=asset['id']
        base['sourceKind']='Pixelmon base study + scripted pixel redraw'
        base['edits']=[{'author':'Codex','tool':'tools/build-art.py / Pillow 12.3.0','operations':'Full pixel redraw from the Pixelmon base studies, not generated animation: separate directional constructions; articulated legs, arms, coat and roots; hand-side projection; fixed anchor; death silhouettes. Full ground redraw with sparse clusters, rounded wrapped cobbles, common borders, 3 variants and 47 binary-alpha masks.'}]
        base['modelHashes']={'sd_xl_base_1.0.safetensors':'31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b','pixel-art-xl.safetensors':'4234637cb80c998f41e348e6a6cb6bc20d8d038b2b0f256b6129b3b5e353eef7'}
        base['productionParameters']={'size':64 if source_id in ['hero','enemy'] else 32,'palette':'ENDESGA-32','steps':25,'cfg':7,'loraStrength':1,'ditherAmount':0,'fast':False,'generationResolution':1024,'sampler':'euler','scheduler':'normal'}
        base['reviewStatus']='draft'
        base['licenseNotes']='Pixelmon MIT; SDXL CreativeML Open RAIL++-M; Pixel Art XL CreativeML Open RAIL-M. Local model SHA256 recorded; upstream identity inferred from filename, not verified against an upstream digest. Model weights are not distributed.'
        base['licenseSources']=['https://github.com/grymmjack/pixelmon/blob/main/LICENSE','https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0','https://huggingface.co/nerijs/pixel-art-xl']
        target=ROOT/'assets-source'/'processed'/asset['id']; target.mkdir(parents=True,exist_ok=True)
        (target/'metadata.json').write_text(json.dumps(base,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # An approval applies to exact atlas and recipe bytes, never to an asset ID alone.
    review_path=ROOT/'docs'/'evidence'/'stage-1'/'art-review.json'
    if review_path.exists():
        review=json.loads(review_path.read_text(encoding='utf-8'))
        recipe_hash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        if review.get('status')=='approved' and review.get('recipeSha256')==recipe_hash:
            for asset in assets:
                approved=review.get('assets',{}).get(asset['id'],{})
                texture_hash=hashlib.sha256((ROOT/'public'/asset['texture']).read_bytes()).hexdigest()
                atlas_hash=hashlib.sha256((ROOT/'public'/asset['atlas']).read_bytes()).hexdigest()
                evidence=approved.get('evidence',[])
                if approved.get('textureSha256')!=texture_hash or approved.get('atlasSha256')!=atlas_hash or not evidence or not all((ROOT/file).is_file() for file in evidence):
                    continue
                metadata=json.loads((ROOT/asset['provenance']).read_text(encoding='utf-8'))
                target=ROOT/'assets-source'/'approved'/asset['id']; target.mkdir(parents=True,exist_ok=True)
                source=ROOT/metadata['sourceFiles'][0]
                shutil.copy2(source,target/'pixelmon-base.png')
                metadata['sourceFiles']=[str((target/'pixelmon-base.png').relative_to(ROOT))]
                metadata['reviewStatus']='approved'; metadata['evidence']=evidence
                metadata['reviewRef']='docs/evidence/stage-1/art-review.json'
                asset['status']='approved'; asset['provenance']=str((target/'metadata.json').relative_to(ROOT))
                (target/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'manifest.json').write_text(json.dumps({'version':1,'palette':PALETTE,'assets':assets},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f"Built 144 hero frames, 40 crawler frames, 9 ground variants and 94 transition masks. Approved atlases: {sum(a['status']=='approved' for a in assets)}/5.")

if __name__=='__main__':
    main()
