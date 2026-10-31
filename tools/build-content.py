"""Articulated pixel redraws from recorded Pixelmon studies. Approval is hash-bound."""
import hashlib
import json
import math
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, __version__ as pillow_version
ROOT=Path(__file__).resolve().parents[1]
C={k:tuple(bytes.fromhex(v))+(255,) for k,v in dict(ink='181425',root='733e39',brass='b86f50',wax='ead4aa',shade='e4a672',dark='193c3e',green='265c42',purple='68386c',eye='b55088',pink='f6757a',gold='feae34',flame='fee761',blue='8b9bb4',glass='2ce8f5',night='262b44').items()}
def poly(d,p,c):
 d.polygon(p,fill=C[c]);d.line(p+[p[0]],fill=C['ink'],width=1)
def moth(d,x,y,f,color='purple',size=1):
 wing=[6,3,5,2][f%4]*size
 poly(d,[(x-1,y),(x-wing,y-4*size),(x-wing-1,y+2*size),(x-2,y+3*size)],color)
 poly(d,[(x+1,y),(x+wing,y-4*size),(x+wing+1,y+2*size),(x+2,y+3*size)],color)
 d.line((x,y-2*size,x,y+4*size),fill=C['ink'],width=2);d.point((x,y),fill=C['flame' if color=='gold' else 'pink'])
def enemy(kind,di,state,f):
 im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im);side={'e':1,'w':-1}.get(di,0);front=di!='n'
 stride=[-2,0,2,1][f%4] if state=='move' else 0
 crouch=(f+1 if state=='prepare' else -f if state=='attack' else f if state=='hit' else 0)
 if state=='death':
  if f>=2:
   for n in range(5):
    x=20+n*6+(f-2)*(n-2);y=51+n%2*3
    d.line((x,y,x+3,y+2),fill=C['wax' if kind=='wax_walker' else 'root'],width=3)
   if kind=='moth_swarm':
    for n in range(3):moth(d,24+n*8,52,f+n)
   else:poly(d,[(22,49),(28,46),(41,48),(43,54),(24,55)],'wax' if kind=='wax_walker' else 'dark')
   d.point((32,51),fill=C['brass']);return im
  crouch=5+f*5
 if kind=='moth_swarm':
  for n,(x,y) in enumerate([(21,41),(40,39),(32,48),(19,53),(45,51)]):moth(d,x+(f%2 if n%2 else -f%2),y+(f+n)%2+min(crouch,5),f+n)
  return im
 cy=38+min(crouch,8)
 if kind=='wax_walker':
  for s in [-1,1]:
   x=32+s*5;d.line([(x,43),(x+s*stride,50),(x+s*stride,56)],fill=C['ink'],width=6);d.line((x+s*stride,51,x+s*stride,55),fill=C['shade'],width=3)
  poly(d,[(23,29+crouch),(40,29+crouch),(44,44),(39,52),(34,48),(29,54),(22,49)],'wax')
  for s in [-1,1]:
   x=32+s*12;d.line([(x-s*3,33+crouch),(x+s*stride,40),(x+s*stride,48)],fill=C['shade'],width=4);d.ellipse((x+s*stride-2,46,x+s*stride+2,50+f%2),fill=C['wax'])
  d.ellipse((25+side*3,20+crouch,38+side*3,32+crouch),fill=C['wax'],outline=C['ink']);d.line((28,35,28,43+f%2),fill=C['shade'],width=2)
 elif kind=='thorn_runner':
  for s in [-1,1]:
   knee=(32+s*(10+stride),47-stride*s);foot=(32+s*(13-stride),56)
   d.line([(32+s*4,cy),knee,foot],fill=C['ink'],width=5);d.line([(32+s*4,cy),knee,foot],fill=C['root'],width=3)
  poly(d,[(26,cy-13),(35,cy-14),(39,cy),(32,cy+5),(25,cy)],'dark')
  for n in range(3):poly(d,[(26+n*4,cy-10),(22+n*4,cy-18-n%2*3),(29+n*4,cy-8)],'green')
  poly(d,[(29+side*4,cy-18),(38+side*4,cy-17),(39+side*4,cy-10),(31+side*4,cy-8)],'root')
  for s in [-1,1]:d.line([(32+s*6,cy-5),(32+s*(12+f%2),cy-1),(32+s*15,cy+5)],fill=C['brass'],width=2)
 elif kind=='bell_spitter':
  for s in [-1,1]:d.line([(32+s*6,44),(32+s*(14+stride),51),(32+s*16,56)],fill=C['ink'],width=5);d.line((32+s*14,52,32+s*16,56),fill=C['root'],width=3)
  d.ellipse((20,cy-10,44,cy+10),fill=C['dark'],outline=C['ink'])
  bx=32+side*8;by=cy+(3 if front else -6)
  poly(d,[(bx-8,by-11),(bx+8,by-11),(bx+12,by+7),(bx-12,by+7)],'brass')
  d.ellipse((bx-10,by+1,bx+10,by+10),fill=C['ink'],outline=C['shade'])
  if state in ['prepare','attack']:d.ellipse((bx-4-f%2,by+3,bx+4+f%2,by+7),fill=C['eye'])
  d.line((bx-4,by-8,bx+4,by-8),fill=C['wax'])
 else:
  for s in [-1,1]:d.line([(32+s*4,cy+4),(32+s*(6+stride),50),(32+s*(8-stride),56)],fill=C['root'],width=4)
  poly(d,[(25,cy-8),(39,cy-9),(42,cy+9),(29,cy+12),(24,cy+5)],'night')
  d.ellipse((25+side*3,cy-20,39+side*3,cy-6),fill=C['dark'],outline=C['ink'])
  if front:poly(d,[(29+side*3,cy-16),(36+side*3,cy-16),(35+side*3,cy-8),(30+side*3,cy-9)],'ink')
  for s in [-1,1]:d.line([(32+s*7,cy-4),(32+s*(13+stride),cy+1),(32+s*(17+stride),cy-6)],fill=C['root'],width=3)
  lx=47+stride;ly=cy+3;d.rectangle((lx-3,ly,lx+3,ly+8),fill=C['brass'],outline=C['ink']);d.rectangle((lx-1,ly+2,lx+1,ly+5),fill=C['gold'])
 if front:
  y=25+crouch if kind=='wax_walker' else cy-13
  d.point((30+side*4,y),fill=C['eye']);d.point((35+side*4,y),fill=C['eye'])
 if state=='hit':d.line((25+f*2,cy-5,30+f*2,cy-9),fill=C['wax'])
 if state=='prepare':d.line((27,58-f%2,37,58-f%2),fill=C['eye'])
 if state=='attack':d.line((19+f,53,23+f,50),fill=C['root'])
 return im

ICONS=['amber_lantern','glass_needles','ember_moths','root_bell','wick','brass_lens','boots','wax_seal','firefly_jar','keepers_watch','heal','haste','fury']
def icon(kind):
 im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
 if kind in ['amber_lantern','firefly_jar']:
  d.arc((10,4,22,12),180,360,fill=C['brass'],width=2);d.rectangle((9,10,23,26),fill=C['ink'],outline=C['brass'],width=2)
  if kind=='amber_lantern':d.rectangle((13,14,19,23),fill=C['gold']);d.line((16,22,16,14),fill=C['flame'],width=2)
  else:
   for x,y in [(13,15),(19,17),(16,22)]:d.rectangle((x,y,x+1,y+1),fill=C['flame'])
 elif kind=='glass_needles':
  for x,y in [(7,9),(13,6),(20,10)]:poly(d,[(x,y+15),(x+2,y),(x+5,y+3),(x+2,y+17)],'glass')
 elif kind=='ember_moths':moth(d,16,16,0,'gold',1)
 elif kind=='root_bell':
  poly(d,[(11,7),(21,7),(25,23),(7,23)],'brass');d.ellipse((7,20,25,26),fill=C['ink'],outline=C['wax']);d.line((16,24,16,28),fill=C['gold'],width=2)
 elif kind=='wick':
  d.line([(9,25),(10,19),(21,14),(20,9),(14,9)],fill=C['wax'],width=4);d.line((14,8,15,4),fill=C['gold'],width=3)
 elif kind=='brass_lens':
  d.ellipse((5,5,24,24),fill=C['brass'],outline=C['ink'],width=2);d.ellipse((8,8,21,21),fill=C['night'],outline=C['glass']);d.line((22,22,28,28),fill=C['brass'],width=4)
 elif kind in ['boots','haste']:
  for x,y in [(5,8),(17,5)]:poly(d,[(x,y),(x+6,y),(x+6,y+12),(x+10,y+13),(x+10,y+18),(x,y+18)],'root')
  if kind=='haste':d.line((2,15,6,15),fill=C['gold']);d.line((1,21,5,21),fill=C['gold'])
 elif kind in ['wax_seal','heal']:
  poly(d,[(9,7),(21,7),(25,13),(23,24),(15,27),(7,22),(6,12)],'wax');d.ellipse((10,11,21,22),fill=C['brass'])
  if kind=='heal':d.rectangle((14,12,17,21),fill=C['flame']);d.rectangle((11,15,20,18),fill=C['flame'])
 elif kind=='keepers_watch':
  d.rectangle((13,3,19,6),fill=C['brass']);d.ellipse((5,6,27,28),fill=C['brass'],outline=C['ink']);d.ellipse((8,9,24,25),fill=C['night'],outline=C['wax']);d.line([(16,12),(16,18),(21,19)],fill=C['gold'],width=2)
 else:poly(d,[(10,25),(6,18),(11,12),(14,5),(19,14),(23,10),(25,20),(21,26)],'gold');poly(d,[(13,23),(13,18),(17,13),(19,24)],'flame')
 return im
def fx(kind,state,f):
 im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
 if state=='hit':
  for n in range(6):
   a=n*math.pi/3;r=4+f*3;x=round(16+math.cos(a)*r);y=round(16+math.sin(a)*r);d.line((x,y,x+round(math.cos(a)*3),y+round(math.sin(a)*3)),fill=C['gold' if kind!='enemy' else 'eye'],width=2)
 elif state=='spawn':
  d.ellipse((10-f*2,10-f*2,22+f*2,22+f*2),outline=C['gold' if kind!='enemy' else 'eye'],width=2);d.point((16,12-f),fill=C['flame'])
 elif kind=='moth':moth(d,16,15,f,'gold')
 elif kind=='needle':poly(d,[(5,17),(23,13),(28,16),(23,19)],'glass');d.line((6+f,16,11+f,16),fill=C['wax'])
 elif kind=='enemy':
  d.ellipse((9,9,23,23),fill=C['purple'],outline=C['ink']);d.line((11+f,13,15+f,13),fill=C['pink']);d.point((15,18-f%2),fill=C['wax'])
 elif kind=='bell':
  d.arc((3+f,3+f,29-f,29-f),f*35,f*35+280,fill=C['gold'],width=2);d.line((16,8,16,19+f),fill=C['root'],width=3)
 else:
  im=icon('heal' if kind=='wax' else 'firefly_jar');d=ImageDraw.Draw(im);d.point((5+f*2,5),fill=C['flame'])
 return im

review_path=ROOT/'docs/evidence/stage-4/art-review.json'
review=json.loads(review_path.read_text()) if review_path.exists() else {}
manifest_path=ROOT/'public/assets/manifest.json';manifest=json.loads(manifest_path.read_text())
new=[];gallery=[];recipe=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
def atlas(asset,size,frames,clips,source,dirs=None):
 cols=8;rows=math.ceil(len(frames)/cols);sheet=Image.new('RGBA',(cols*size,rows*size));data={'frames':{},'meta':{'image':asset+'.png','size':{'w':cols*size,'h':rows*size},'scale':'1'}}
 for n,(name,im) in enumerate(frames):
  x=n%cols*size;y=n//cols*size;sheet.paste(im,(x,y));data['frames'][name]={'frame':{'x':x,'y':y,'w':size,'h':size},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':size,'h':size},'sourceSize':{'w':size,'h':size}}
 out=ROOT/f'public/assets/content/{asset}';out.mkdir(parents=True,exist_ok=True);sheet.save(out/(asset+'.png'));(out/(asset+'.json')).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
 base=ROOT/f'assets-source/candidates/{source}';meta=json.loads((base/'metadata.json').read_text());target=ROOT/f'assets-source/processed/{asset}';target.mkdir(parents=True,exist_ok=True)
 hashes={'recipeSha256':recipe,'textureSha256':hashlib.sha256((out/(asset+'.png')).read_bytes()).hexdigest(),'atlasSha256':hashlib.sha256((out/(asset+'.json')).read_bytes()).hexdigest()}
 accepted=review.get('status')=='approved' and review.get('assets',{}).get(asset)==hashes and all((ROOT/e).is_file() for e in review.get('evidence',[]))
 if accepted:target=ROOT/f'assets-source/approved/{asset}';target.mkdir(parents=True,exist_ok=True)
 for file in ['pixelmon-base.png','generation.txt']:shutil.copy2(base/file,target/file)
 prefix=target.relative_to(ROOT).as_posix()
 meta.update(assetId=asset,sourceKind='Pixelmon base study followed by full authored pixel redraw',sourceFiles=[prefix+'/pixelmon-base.png',prefix+'/generation.txt'],edits=[{'author':'Codex','tool':f'tools/build-content.py / Pillow {pillow_version}','operations':'Distinct creature anatomy, separate cardinal facing poses, articulated legs/arms/wings, crouch and attack, collapse and scattered death remnants; no whole-image rotation or scaling. Icons and weapon FX authored from brass/wax/moth studies.'}],reviewStatus='approved' if accepted else 'draft',evidence=review.get('evidence',[]) if accepted else [],reviewRef='docs/evidence/stage-4/art-review.json',symmetry='radial swarm with independent wing poses' if asset=='moth_swarm' else None)
 (target/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
 a={'id':asset,'type':'atlas','status':'approved' if accepted else 'placeholder','texture':f'assets/content/{asset}/{asset}.png','atlas':f'assets/content/{asset}/{asset}.json','frameSize':{'width':size,'height':size},'origin':{'x':0.5,'y':0.875 if size==64 else 0.5},'clips':clips,'provenance':prefix+'/metadata.json'}
 if dirs:a['directions']=dirs
 new.append(a);print(asset,len(frames),a['status'])
for kind in ['wax_walker','moth_swarm','thorn_runner','bell_spitter','lantern_thief']:
 dirs=['none'] if kind=='moth_swarm' else ['n','e','s','w'];frames=[];clips=[]
 states={'move':(4,8,-1),'hit':(2,12,0),'death':(4,8,0)}
 if kind in ['thorn_runner','bell_spitter','lantern_thief']:states.update(prepare=(4,5,-1),attack=(4,10,-1))
 for di in dirs:
  for state,(count,fps,repeat) in states.items():
   names=[f'{kind}/{state}/{di}/{f:02d}' for f in range(count)];clips.append(dict(state=state,direction=di,frames=names,fps=fps,repeat=repeat));frames.extend((name,enemy(kind,di,state,f)) for f,name in enumerate(names))
 atlas(kind,64,frames,clips,kind,None if kind=='moth_swarm' else dirs)
 gallery.append([enemy(kind,'s','move',f) for f in range(4)]+[enemy(kind,'s','death',f) for f in range(4)])
atlas('content_icons',32,[(f'icons/{kind}',icon(kind)) for kind in ICONS],[],'content_icons')
frames=[];clips=[]
for kind in ['needle','moth','bell','enemy','wax','magnet']:
 for state,count in [('move',4),('spawn',3),('hit',3)]:
  names=[f'fx/{kind}/{state}/{f:02d}' for f in range(count)];frames.extend((name,fx(kind,state,f)) for f,name in enumerate(names));clips.append(dict(state=kind+'_'+state,direction='none',frames=names,fps=12,repeat=-1 if state=='move' else 0))
atlas('content_fx',32,frames,clips,'moth_swarm')
manifest['assets']=[a for a in manifest['assets'] if a['id'] not in {n['id'] for n in new}]+new
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
evidence=ROOT/'docs/evidence/stage-4';evidence.mkdir(parents=True,exist_ok=True)
sheet=Image.new('RGBA',(8*64,5*64),C['night'])
for y,row in enumerate(gallery):
 for x,im in enumerate(row):sheet.alpha_composite(im,(x*64,y*64))
sheet.save(evidence/'enemy-contact-sheet.png');sheet.resize((1024,640),Image.Resampling.NEAREST).save(evidence/'enemy-contact-sheet-2x.png')
studies=Image.new('RGBA',(6*64,64),C['night'])
for n,source in enumerate(['wax_walker','moth_swarm','thorn_runner','bell_spitter','lantern_thief','content_icons']):studies.alpha_composite(Image.open(ROOT/f'assets-source/candidates/{source}/pixelmon-base.png').convert('RGBA'),(n*64,0))
studies.resize((768,128),Image.Resampling.NEAREST).save(evidence/'pixelmon-studies.png')
