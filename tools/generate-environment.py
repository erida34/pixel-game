"""One small Pixelmon base; all commands and source files stay project-relative."""
import json
import hashlib
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PROMPT = 'single ruined brass street lantern entwined with dark teal roots, small amber flame, abandoned nocturnal city, top-down three-quarter game view, crisp pixel art, restrained detail, dark outline, centered isolated object on white background, no ground'
NEGATIVE = 'sprite sheet, multiple objects, text, watermark, realistic, antialiased, blurry'
draft = ROOT / 'assets-source/drafts/environment'
draft.mkdir(parents=True, exist_ok=True)
args = ['pixelmon', PROMPT, '--size', '64', '--palette', 'ENDESGA-32', '--transparent', '--seed', '2401', '--no-open', '--exact-prompt', '--negative', NEGATIVE, '--dither-amount', '0', '--show-prompt', '--name', 'street-lantern', '--output-to', 'assets-source/drafts/environment']
sources = list(draft.glob('*s2401_sprite*.png'))
if not sources:
    result = subprocess.run(args, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    (draft / 'generation.txt').write_text(result.stdout, encoding='utf-8')
    print(result.stdout, flush=True)
    if result.returncode: raise SystemExit(result.returncode)
    sources = list(draft.glob('*s2401_sprite*.png'))
target = ROOT / 'assets-source/candidates/environment'
target.mkdir(parents=True, exist_ok=True)
source = sorted(sources)[-1]
shutil.copy2(source, target / 'pixelmon-base.png')
shutil.copy2(draft / 'generation.txt', target / 'generation.txt')
metadata = dict(assetId='environment', sourceKind='Pixelmon SDXL base study', prompt=PROMPT, negativePrompt=NEGATIVE, seed=2401, arguments=args[1:], toolCommit='355bd0b', toolVersion='1.9.0', modelIdentifiers=['sd_xl_base_1.0.safetensors', 'pixel-art-xl.safetensors'], generatedAt=datetime.fromtimestamp(source.stat().st_mtime, timezone.utc).isoformat(), sourceFiles=['assets-source/candidates/environment/pixelmon-base.png', 'assets-source/candidates/environment/generation.txt'], edits=[], licenseNotes='Pixelmon MIT; SDXL CreativeML Open RAIL++-M; Pixel Art XL CreativeML Open RAIL-M. Local model identity not verified against upstream.', reviewStatus='draft', evidence=[])
metadata['modelHashes'] = {}
for folder, name in [('checkpoints', 'sd_xl_base_1.0.safetensors'), ('loras', 'pixel-art-xl.safetensors')]:
    model = Path.home() / 'ComfyUI/models' / folder / name
    with model.open('rb') as stream:
        metadata['modelHashes'][name] = hashlib.file_digest(stream, 'sha256').hexdigest()
metadata['licenseSources'] = ['https://github.com/grymmjack/pixelmon/blob/main/LICENSE', 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0', 'https://huggingface.co/nerijs/pixel-art-xl']
(target / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
