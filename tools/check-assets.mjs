import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const manifest = await readJson('public/assets/manifest.json');
const requireApproved = process.argv.includes('--require-approved');
const errors = [];
function check(ok, message) { if (!ok) errors.push(message); }
function safe(relative) { return typeof relative === 'string' && !relative.includes('..') && /^[\w/.-]+$/.test(relative); }
function normalize(mask) {
  for (const [corner,sides] of [[2,5],[8,20],[32,80],[128,65]]) if ((mask & sides) !== sides) mask &= ~corner;
  return mask;
}
const masks = new Set(Array.from({length:256},(_,i)=>normalize(i)));
const palette = new Set(manifest.palette);
const expectedPalette = 'be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569'.split(' ');
check(manifest.version === 1, 'manifest: version');
check(palette.size === 32, 'manifest: ENDESGA-32');
check(expectedPalette.every(color => palette.has(color)), 'manifest: palette differs from ENDESGA-32');
const ids = new Set();
let frameCount = 0;
for (const asset of manifest.assets) {
  const id = asset.id;
  check(!ids.has(id), `${id}: duplicate ID`); ids.add(id);
  check(['approved','placeholder'].includes(asset.status), `${id}: status`);
  if (requireApproved) check(asset.status === 'approved', `${id}: still placeholder`);
  check(asset.type === 'atlas', `${id}: type`);
  for (const field of ['texture','atlas','provenance']) check(safe(asset[field]), `${id}: unsafe ${field}`);
  if (['texture','atlas','provenance'].some(field=>!safe(asset[field]))) continue;
  try {
    const png = PNG.sync.read(await readFile(path.join(root,'public',asset.texture)));
    const atlas = await readJson(`public/${asset.atlas}`);
    const metadata = await readJson(asset.provenance);
    check(metadata.assetId === id, `${id}: provenance ID`);
    for (const key of ['sourceKind','prompt','negativePrompt','seed','arguments','toolCommit','modelIdentifiers','generatedAt','sourceFiles','edits','licenseNotes','reviewStatus','evidence']) check(key in metadata, `${id}: metadata.${key}`);
    check(!/(?:^|["\s])(?:[A-Za-z]:[\\/]|\/home\/|\/mnt\/)/.test(JSON.stringify(metadata)), `${id}: absolute local path in provenance`);
    if (asset.status === 'approved') {
      check(metadata.reviewStatus === 'approved' && metadata.evidence.length > 0, `${id}: missing visual approval`);
      for (const evidence of metadata.evidence) { check(safe(evidence),`${id}: evidence path`); if (safe(evidence)) await readFile(path.join(root,evidence)); }
    }
    for (const source of metadata.sourceFiles ?? []) { check(safe(source),`${id}: source path`); if(safe(source)) await readFile(path.join(root,source)); }
    check(png.width === atlas.meta.size.w && png.height === atlas.meta.size.h, `${id}: atlas canvas`);
    const colorErrors = new Set();
    for (let i=0;i<png.data.length;i+=4) {
      const alpha=png.data[i+3];
      if (alpha !== 0 && alpha !== 255) colorErrors.add('partial alpha');
      if (alpha === 255) {
        const hex=png.data.subarray(i,i+3).toString('hex');
        if (!palette.has(hex)) colorErrors.add(hex);
      }
    }
    check(colorErrors.size === 0, `${id}: colors ${[...colorErrors].slice(0,8).join(',')}`);
    const {width,height}=asset.frameSize;
    check(width === height && [32,64,128].includes(width),`${id}: frame size`);
    check(asset.origin.x === 0.5 && asset.origin.y === (width>=64?0.875:0.5),`${id}: origin`);
    for (const [name,entry] of Object.entries(atlas.frames)) {
      frameCount++;
      const f=entry.frame;
      check(entry.rotated === false && entry.trimmed === false,`${id}/${name}: trimming/rotation`);
      check(f.w === width && f.h === height && entry.sourceSize.w === width && entry.sourceSize.h === height,`${id}/${name}: frame canvas`);
      check(f.x>=0 && f.y>=0 && f.x+width<=png.width && f.y+height<=png.height,`${id}/${name}: bounds`);
      check(entry.spriteSourceSize.x===0 && entry.spriteSourceSize.y===0,`${id}/${name}: alignment`);
      let opaque=0;
      for(let y=f.y;y<f.y+height;y++) for(let x=f.x;x<f.x+width;x++) if(png.data[(y*png.width+x)*4+3]===255) opaque++;
      check(opaque>0,`${id}/${name}: empty frame`);
      if(width===32 && name.includes('/variant/')) check(opaque===1024,`${id}/${name}: base transparency`);
      if(width>=64) check(opaque<width*height,`${id}/${name}: no transparency`);
    }
    const clipIds=new Set();
    if (['wax_walker','moth_swarm','thorn_runner','bell_spitter','lantern_thief','content_icons','content_fx'].includes(id)) {
      if (asset.status === 'approved') {
        const review = await readJson('docs/evidence/stage-4/art-review.json');
        const hash = async file => createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
        const hashes = review.assets?.[id];
        check(review.status === 'approved' && hashes?.recipeSha256 === await hash('tools/build-content.py') && hashes?.textureSha256 === await hash(`public/${asset.texture}`) && hashes?.atlasSha256 === await hash(`public/${asset.atlas}`),`${id}: approval hashes differ`);
      }
      if (id !== 'content_icons' && id !== 'content_fx') {
        const dirs = id === 'moth_swarm' ? ['none'] : ['n','e','s','w'];
        const states = {move:4,hit:2,death:4};
        if (['thorn_runner','bell_spitter','lantern_thief'].includes(id)) Object.assign(states,{prepare:4,attack:4});
        for (const direction of dirs) for (const [state,count] of Object.entries(states)) check(asset.clips?.find(c=>c.direction===direction&&c.state===state)?.frames.length===count,`${id}: ${state}/${direction}`);
        if (id === 'moth_swarm') check(metadata.symmetry?.includes('radial'),`${id}: symmetry provenance`);
      }
      for (const clip of asset.clips ?? []) {
        const samples=clip.frames.map(name=>{
          const f=atlas.frames[name]?.frame;if(!f)return '';
          const rows=[];for(let y=f.y;y<f.y+f.h;y++)rows.push(png.data.subarray((y*png.width+f.x)*4,(y*png.width+f.x+f.w)*4));return Buffer.concat(rows).toString('hex');
        });
        check(new Set(samples).size===clip.frames.length,`${id}/${clip.state}/${clip.direction}: identical pixel frames`);
      }
    }
    for (const clip of asset.clips ?? []) {
      const key=`${clip.state}/${clip.direction}`;
      check(!clipIds.has(key),`${id}: duplicate clip ${key}`); clipIds.add(key);
      check(clip.fps>0 && [-1,0].includes(clip.repeat),`${id}/${key}: timing`);
      check(new Set(clip.frames).size===clip.frames.length,`${id}/${key}: repeated frame names`);
      for(const frame of clip.frames) check(frame in atlas.frames,`${id}: missing ${frame}`);
    }
    if (id === 'greenhouse_heart') {
      check(width===128, 'boss: 128px canvas');
      for (const [state,count] of Object.entries({idle:4,move:4,prepare_thorns:4,attack_thorns:4,prepare_summon:4,attack_summon:4,hit:2,death:8})) {
        const clip=asset.clips?.find(c=>c.state===state && c.direction==='none');
        check(clip?.frames.length===count, `boss: ${state}`);
        const samples=(clip?.frames ?? []).map(name=>{
          const f=atlas.frames[name]?.frame; if(!f)return '';
          const rows=[];for(let y=f.y;y<f.y+f.h;y++)rows.push(png.data.subarray((y*png.width+f.x)*4,(y*png.width+f.x+f.w)*4));
          return createHash('sha256').update(Buffer.concat(rows)).digest('hex');
        });
        check(new Set(samples).size===count, `boss: duplicate pixels ${state}`);
      }
      if(asset.status==='approved') {
        const review=await readJson('docs/evidence/stage-5/art-review.json');
        const hash=async file=>createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
        check(review.status==='approved' && review.hashes.recipeSha256===await hash('tools/build-boss.py') && review.hashes.textureSha256===await hash(`public/${asset.texture}`) && review.hashes.atlasSha256===await hash(`public/${asset.atlas}`),'boss: approval hashes');
      }
    }
    if (id === 'environment') {
      if (asset.status === 'approved') {
        check(metadata.reviewRef === 'docs/evidence/stage-3/art-review.json', 'environment: review reference');
        const review = await readJson('docs/evidence/stage-3/art-review.json');
        const hash = async file => createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
        check(review.status === 'approved' && review.textureSha256 === await hash(`public/${asset.texture}`) && review.atlasSha256 === await hash(`public/${asset.atlas}`) && review.recipeSha256 === await hash('tools/build-environment.py'), 'environment: approval hashes differ');
      }
      for (const state of ['plant', 'water', 'lantern', 'roots', 'bench', 'glass']) {
        const clip = asset.clips?.find(c => c.state === state && c.direction === 'none');
        const count = ['plant', 'water', 'lantern'].includes(state) ? 4 : 1;
        check(clip && clip.frames.length === count && clip.fps === 4 && clip.repeat === -1, `environment: ${state} frames`);
        if (clip && count > 1) {
          const samples = clip.frames.map(name => {
            const frame = atlas.frames[name]?.frame; if (!frame) return '';
            const rows = [];
            for (let y = frame.y; y < frame.y + frame.h; y++) rows.push(png.data.subarray((y * png.width + frame.x) * 4, (y * png.width + frame.x + frame.w) * 4));
            return Buffer.concat(rows).toString('hex');
          });
          check(new Set(samples).size === count, `environment: ${state} repeats identical pixels`);
        }
      }
    }
    if(id==='hero_lantern_keeper' || id==='root_crawler') {
      const dirs=id==='hero_lantern_keeper'?['n','ne','e','se','s','sw','w','nw']:['n','e','s','w'];
      const states=id==='hero_lantern_keeper'?{idle:[4,6,-1],walk:[6,10,-1],hit:[2,12,0],death:[6,8,0]}:{move:[4,8,-1],hit:[2,12,0],death:[4,8,0]};
      check(JSON.stringify(asset.directions)===JSON.stringify(dirs),`${id}: directions`);
      for(const direction of dirs) for(const [state,[count,fps,repeat]] of Object.entries(states)) {
        const clip=asset.clips.find(clip=>clip.direction===direction && clip.state===state);
        check(clip && clip.frames.length===count && clip.fps===fps && clip.repeat===repeat,`${id}: ${state}/${direction} requirements`);
      }
    }
    if (['grass','cobble'].includes(id)) {
      const mapping=asset.transitions?.maskToFrame ?? {};
      check(Object.keys(mapping).length===47 && [...masks].every(mask=>mapping[mask]),`${id}: 47 masks`);
      check(new Set(Object.values(mapping)).size===47,`${id}: duplicate mask frames`);
      for(const frame of Object.values(mapping)) check(frame in atlas.frames,`${id}: missing tile ${frame}`);
    }
    if (['grass','dirt','cobble'].includes(id)) for(let v=0;v<3;v++) check(`${id}/variant/0${v}` in atlas.frames,`${id}: variant ${v}`);
  } catch(error) { errors.push(`${id}: ${error.message}`); }
}
for (const id of ['hero_lantern_keeper','root_crawler','grass','dirt','cobble','environment']) check(ids.has(id),`missing required asset ${id}`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
else console.log(`Asset validation passed: ${ids.size} atlases, ${frameCount} frames, 94 masks, ENDESGA-32. ${requireApproved?'All approved.':'Visual approval checked only for approved assets.'}`);
