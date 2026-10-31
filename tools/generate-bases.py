"""Run in Ubuntu WSL with the existing ComfyUI Python environment.

Small base set only. No automatic model installation or runtime dependency.
"""
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEGATIVE = 'sprite sheet, character sheet, multiple characters, grid, text, watermark, realistic, antialiased, blurry'
HERO_PROMPT = 'pixel art of exactly one single lantern keeper character, full body occupying most of the canvas, worn teal coat, brass lantern held in anatomical right hand, amber flame, small satchel, readable silhouette, top-down three-quarter view facing south, dark outline, centered, isolated on solid white background'
ENEMY_PROMPT = 'pixel art of exactly one crawling root creature, twisted roots and cracked pale candle wax face, violet eyes, low wide silhouette, full body occupying most of canvas, top-down three-quarter view facing south, dark outline, centered isolated on solid white background'
BASES = [
    ('hero', HERO_PROMPT, 1102, 64, True, 'hero-south'),
    ('enemy', ENEMY_PROMPT, 1201, 64, True, 'root-crawler'),
    ('grass', 'seamless top-down ground texture, dark teal moss with sparse short grass, abandoned nocturnal garden, subdued contrast, flat even lighting, crisp pixel art, no objects, no perspective, no cast shadows', 2101, 32, False, 'grass'),
    ('dirt', 'seamless top-down ground texture, damp dark soil with tiny scattered pebbles, abandoned nocturnal garden, subdued contrast, flat even lighting, crisp pixel art, no objects, no perspective, no cast shadows', 2201, 32, False, 'dirt'),
    ('cobble', 'seamless top-down ground texture, small worn wet cobblestones with dark seams and sparse moss, abandoned nocturnal city, subdued contrast, flat even lighting, crisp pixel art, no objects, no perspective, no cast shadows', 2301, 32, False, 'cobble'),
]

def main():
    for asset, prompt, seed, size, transparent, name in BASES:
        draft = ROOT / 'assets-source' / 'drafts' / asset
        draft.mkdir(parents=True, exist_ok=True)
        negative = NEGATIVE if asset != 'enemy' else 'sprite sheet, character sheet, multiple creatures, grid, text, realistic, antialiased, blurry'
        args = ['pixelmon', prompt, '--size', str(size), '--palette', 'ENDESGA-32', '--seed', str(seed), '--no-open', '--show-prompt', '--name', name, '--output-to', str(draft.relative_to(ROOT))]
        if transparent:
            args += ['--exact-prompt', '--negative', negative, '--transparent', '--dither-amount', '0']
        else:
            args += ['--tile', '--dither-amount', '0']
        existing = list(draft.glob(f'*s{seed}_sprite*.png'))
        if not existing:
            result = subprocess.run(args, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            (draft / 'generation.txt').write_text(result.stdout, encoding='utf-8')
            print(result.stdout, flush=True)
            if result.returncode:
                raise SystemExit(result.returncode)
            existing = list(draft.glob(f'*s{seed}_sprite*.png'))
        source = sorted(existing)[-1]
        target = ROOT / 'assets-source' / 'candidates' / asset
        target.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target / 'pixelmon-base.png')
        if (draft / 'generation.txt').exists():
            shutil.copy2(draft / 'generation.txt', target / 'generation.txt')
        metadata = {
            'assetId': asset, 'sourceKind': 'Pixelmon SDXL base, candidate', 'prompt': prompt,
            'negativePrompt': negative if transparent else None, 'seed': seed,
            'arguments': args[1:], 'toolCommit': '355bd0b', 'toolVersion': '1.9.0',
            'modelIdentifiers': ['sd_xl_base_1.0.safetensors', 'pixel-art-xl.safetensors'],
            'generatedAt': datetime.fromtimestamp(source.stat().st_mtime, timezone.utc).isoformat(),
            'sourceFiles': [str((target / 'pixelmon-base.png').relative_to(ROOT))],
            'edits': [], 'licenseNotes': 'Pixelmon: MIT. SDXL: CreativeML Open RAIL++-M. Pixel Art XL model conditions must be checked before approval.',
            'reviewStatus': 'draft', 'evidence': []
        }
        (target / 'metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'Preserved candidate {asset}', flush=True)

if __name__ == '__main__':
    main()
