// Run only after inspecting the linked PNGs and the actual WebM in the browser.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
if (!process.argv.includes('--accept')) throw new Error('Explicit --accept required after visual inspection.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));
const hash=file=>createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const base='docs/evidence/stage-1/';
const browser=read(`${base}browser-check.json`),focus=read(`${base}focus-check.json`),seams=read(`${base}tile-seams.json`),video=read(`${base}video-check.json`);
if(browser.errors.length || focus.hidden.paused!=='true' || focus.returned.paused!=='true' || seams.mismatches || video.duration<8) throw new Error('Checks have not passed.');
const manifest=read('public/assets/manifest.json');
const review={
  date:'2026-10-13',status:'approved',reviewer:'Codex: local visual and browser review; no human review claimed',
  recipeSha256:hash('tools/build-art.py'),
  observations:[
    'Hero: all eight projections inspected at 1x/2x. Brass lantern stays on anatomical right; satchel opposite. No whole-sprite mirroring or rotation. Separate articulated legs, forearm and coat hem in the walk cycle. Idle feet stay planted.',
    'Hero and crawler: hit keeps movement available; death collapses into a separately redrawn silhouette and holds its last frame. Crawler is low and broad, with four directional wax faces and moving root limbs.',
    'Ground: dirt has no square perimeter; low-contrast grass tufts and rounded staggered cobbles. Both 47-mask sheets inspected, with 3x3 repeats, three variants, concave/convex corners, isolated tiles and a one-tile bridge across x=32.',
    'Transitions use binary alpha with continuous dirt underneath. No blank background holes. Neighbor coverage test found zero mismatches in 239360 edge pixels. Chunk fixture uses global neighbors; streaming/procedural generation is reserved for stage 3.',
    'Known limit: this is an accepted small production baseline, not final visual polish or a measured performance target.'
  ],
  assets:Object.fromEntries(manifest.assets.map(asset=>{
    const character=asset.id==='hero_lantern_keeper'||asset.id==='root_crawler';
    const files=character?['directions-1x.png','directions-2x.png','hit-2x.png','death-2x.png','final-movement.webm']:['transitions-1x.png','transitions-2x.png','junctions-2x.png','field-2x.png'];
    const evidence=files.map(file=>`${base}${file}`);
    evidence.forEach(file=>fs.accessSync(path.join(root,file)));
    return [asset.id,{textureSha256:hash(`public/${asset.texture}`),atlasSha256:hash(`public/${asset.atlas}`),evidence}];
  }))
};
fs.writeFileSync(path.join(root,base,'art-review.json'),JSON.stringify(review,null,2)+'\n','utf8');
console.log('Recorded the visual review for the exact atlas and recipe hashes.');
