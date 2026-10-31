import fs from 'node:fs';
const root='docs/evidence/stage-4';
for(const name of ['enemies','builds','effects','smoke','preview','video']) {
  const file=`${root}/${name}-output.txt`;if(!fs.existsSync(file))continue;
  const text=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').trim();
  let result;try{result=JSON.parse(text);}catch{throw new Error(`Browser command failed or returned non-JSON: ${file}`);}
  if(result.errors?.length)throw new Error(JSON.stringify(result.errors));
  fs.writeFileSync(`${root}/${name}-check.json`,JSON.stringify(result,null,2)+'\n');
  if(result.results)console.log(name,result.results.map(r=>({id:r.id,time:r.end?.time??r.time,hp:r.end?.hp??r.hp,kills:r.end?.kills,states:r.states})));
  else console.log(name,result);
}
