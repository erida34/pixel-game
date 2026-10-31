import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['AGENTS.md','README.md','ROADMAP.md','PROMPTS.md','docs/GAME_DESIGN.md','docs/ART_DIRECTION.md','docs/ARCHITECTURE.md','docs/ASSET_PIPELINE.md',...fs.readdirSync(path.join(root,'docs/evidence')).map(stage => `docs/evidence/${stage}/REPORT.md`).filter(file => fs.existsSync(path.join(root,file)))];
let links=0;
for(const file of files) {
  const data=fs.readFileSync(path.join(root,file));
  if(data[0]===239 && data[1]===187 && data[2]===191) throw new Error(`BOM: ${file}`);
  const text=new TextDecoder('utf-8',{fatal:true}).decode(data);
  if((text.match(/^```/gm)??[]).length%2) throw new Error(`Unclosed fence: ${file}`);
  for(const [,url] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if(/^(https?:|#)/.test(url)) continue;
    const target=url.split('#')[0];
    fs.accessSync(path.resolve(root,path.dirname(file),target));links++;
  }
}
console.log(`Documentation passed: ${files.length} UTF-8 files without BOM, ${links} local links, balanced fences.`);
