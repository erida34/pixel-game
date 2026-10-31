import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const executable=process.argv[2];if(!executable)throw new Error('Pass the installed ffmpeg executable.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const draft=path.join(root,'assets-source/drafts/stage4-evidence');fs.mkdirSync(draft,{recursive:true});
for(const [name,duration] of [['attacks-2x',45],['final-effects-2x',20]]){
 const input=path.join(root,`docs/evidence/stage-4/${name}.webm`),output=path.join(root,`docs/evidence/stage-4/${name}.trimmed.webm`),backup=path.join(draft,`${name}-untrimmed.webm`);
 for(const p of [input,output,backup])if(!p.startsWith(root+path.sep))throw new Error('Path outside game workspace');
 const r=spawnSync(executable,['-y','-i',input,'-t',String(duration),'-c','copy',output],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);
 if(fs.existsSync(backup))throw new Error('Backup exists; inspect before repeating.');
 fs.renameSync(input,backup);fs.renameSync(output,input);console.log(`${name}: removed idle tail, original saved in drafts`);
}
