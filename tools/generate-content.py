"""Five enemy studies and one brass item study, individually recorded and resumable."""
import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
subjects = {
 'wax_walker': ('tall shambling candle wax humanoid, drooping pale wax shoulders, dripping hands, violet eyes', 1202),
 'moth_swarm': ('small loose swarm of five violet moths, clearly separated angular wings, scattered silhouette', 1203),
 'thorn_runner': ('lean thorn beast on long articulated legs, pointed thorn crest, crouched angular silhouette', 1204),
 'bell_spitter': ('squat rooted creature with a large open brass bell mouth and two gripping root feet, broad silhouette', 1205),
 'lantern_thief': ('hooded lanky root creature, hooked arms and a stolen brass lantern, asymmetrical silhouette', 1206),
 'content_icons': ('single brass pocket watch with amber glass and wax details, readable inventory item, no lettering', 3101)
}
negative = 'sprite sheet, text, watermark, realistic, blurry, multiple panels'
commit = subprocess.check_output(['git', '-C', str(Path.home() / 'pixelmon'), 'rev-parse', '--short', 'HEAD'], text=True).strip()
version = subprocess.check_output(['pixelmon', '--version'], text=True).strip()
hashes = {}
for folder, name in [('checkpoints','sd_xl_base_1.0.safetensors'),('loras','pixel-art-xl.safetensors')]:
 with (Path.home() / 'ComfyUI/models' / folder / name).open('rb') as f: hashes[name] = hashlib.file_digest(f,'sha256').hexdigest()
for asset, (description, seed) in subjects.items():
 size = 32 if asset == 'content_icons' else 64
 prompt = f'single {description}, top-down three-quarter game view, facing south, crisp pixel art, dark outline, centered isolated subject on white background, no ground'
 draft = ROOT / f'assets-source/drafts/{asset}'; draft.mkdir(parents=True,exist_ok=True)
 args = ['pixelmon',prompt,'--size',str(size),'--palette','ENDESGA-32','--transparent','--seed',str(seed),'--no-open','--exact-prompt','--negative',negative,'--dither-amount','0','--show-prompt','--name',asset,'--output-to',f'assets-source/drafts/{asset}']
 sources = sorted(draft.glob(f'*s{seed}_sprite*.png'))
 if not sources:
  print(f'Generating {asset}',flush=True)
  result = subprocess.run(args,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  (draft/'generation.txt').write_text(result.stdout,encoding='utf-8')
  if result.returncode: print(result.stdout); raise SystemExit(result.returncode)
  sources = sorted(draft.glob(f'*s{seed}_sprite*.png'))
 source = sources[-1]; target = ROOT / f'assets-source/candidates/{asset}'; target.mkdir(parents=True,exist_ok=True)
 shutil.copy2(source,target/'pixelmon-base.png'); shutil.copy2(draft/'generation.txt',target/'generation.txt')
 metadata = dict(assetId=asset,sourceKind='Pixelmon SDXL base study',prompt=prompt,negativePrompt=negative,seed=seed,arguments=args[1:],toolCommit=commit,toolVersion=version,modelIdentifiers=list(hashes),modelHashes=hashes,generatedAt=datetime.fromtimestamp(source.stat().st_mtime,timezone.utc).isoformat(),sourceFiles=[f'assets-source/candidates/{asset}/pixelmon-base.png',f'assets-source/candidates/{asset}/generation.txt'],edits=[],licenseNotes='Pixelmon MIT; SDXL CreativeML Open RAIL++-M; Pixel Art XL CreativeML Open RAIL-M; local weight identity against upstream unverified.',reviewStatus='draft',evidence=[],productionParameters=dict(size=size,palette='ENDESGA-32',steps=25,cfg=7,loraStrength=1,ditherAmount=0,generationResolution=1024,sampler='euler',scheduler='normal',fast=False))
 (target/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
 print(f'Saved study {asset}',flush=True)
