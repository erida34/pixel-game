import fs from 'node:fs';
import { PNG } from 'pngjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/manifest.json'),'utf8'));
function normalize(mask) {
  for(const [corner,sides] of [[2,5],[8,20],[32,80],[128,65]]) if((mask&sides)!==sides) mask&=~corner;
  return mask;
}
const offsets=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
let randomState=91573;
const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
const grid=Array.from({length:66},()=>Array.from({length:66},()=>random()<0.68));
const mask=(x,y)=>normalize(offsets.reduce((m,[dx,dy],index)=>m|(grid[y+dy][x+dx]?1<<index:0),0));
let comparisons=0, mismatches=0;
const examples=[];
for(const id of ['grass','cobble']) {
  const asset=manifest.assets.find(asset=>asset.id===id);
  const atlas=JSON.parse(fs.readFileSync(path.join(root,'public',asset.atlas),'utf8'));
  const png=PNG.sync.read(fs.readFileSync(path.join(root,'public',asset.texture)));
  const alpha=(mask,x,y)=>{
    const f=atlas.frames[asset.transitions.maskToFrame[String(mask)]].frame;
    return png.data[((f.y+y)*png.width+f.x+x)*4+3];
  };
  for(let y=1;y<64;y++) for(let x=1;x<64;x++) {
    if(!grid[y][x]) continue;
    for(const [dx,dy] of [[1,0],[0,1]]) {
      if(!grid[y+dy][x+dx]) continue;
      const a=mask(x,y),b=mask(x+dx,y+dy);
      for(let p=0;p<32;p++) {
        comparisons++;
        const first=alpha(a,dx?31:p,dy?31:p),second=alpha(b,dx?0:p,dy?0:p);
        if(first!==second) {
          mismatches++;
          if(examples.length<10)examples.push({id,a,b,p,axis:dx?'x':'y'});
        }
      }
    }
  }
}
console.log(JSON.stringify({comparisons,mismatches,examples},null,2));
if(mismatches) process.exitCode=1;
