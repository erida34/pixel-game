import fs from 'node:fs';
const root='docs/evidence/stage-5';
const files=fs.readdirSync(root).filter(f=>/^run-segment-\d+\.json$/.test(f)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));
const parts=files.map(f=>JSON.parse(fs.readFileSync(`${root}/${f}`,'utf8').replace(/^\uFEFF/,'')));
const log={browser:parts[0].log.browser,viewport:parts[0].log.viewport,startedAt:parts[0].log.startedAt,segments:parts.flatMap(p=>p.log.segments),choices:parts.flatMap(p=>p.log.choices),samples:parts.flatMap(p=>p.log.samples),errors:parts.flatMap(p=>p.log.errors),bossFrames:[...new Set(parts.flatMap(p=>p.log.bossFrames??[]))],result:parts.at(-1).result};
fs.writeFileSync(`${root}/full-run.json`,JSON.stringify(log,null,2)+'\n');
console.log(JSON.stringify({result:log.result,samples:log.samples.length,choices:log.choices.length,errors:log.errors}));
