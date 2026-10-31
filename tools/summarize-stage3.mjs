import fs from 'node:fs';
const root = 'docs/evidence/stage-3';
const read = name => JSON.parse(fs.readFileSync(`${root}/${name}.json`, 'utf8').replace(/^\uFEFF/, ''));
const outbound = read('outbound'), returned = read('return'), smoke = read('browser-smoke');
const original = new Map(outbound.terrain.map(t => [`${t.x},${t.y}`, t]));
let compared = 0;
for (const tile of returned.terrain) {
  const before = original.get(`${tile.x},${tile.y}`); if (!before) continue;
  if (JSON.stringify(before) !== JSON.stringify(tile)) throw new Error(`Changed tile ${tile.x},${tile.y}`);
  compared++;
}
if (compared < 250) throw new Error(`Not enough returning tiles: ${compared}`);
const summary = { checks:smoke.checks, browser:smoke.browser, viewport:smoke.viewport, renderedFrames:smoke.frames, unchangedReturningTiles:compared, outbound:outbound.end, returned:returned.end, samples:outbound.samples.length+returned.samples.length, errors:[...smoke.errors,...outbound.errors,...returned.errors], warnings:smoke.warnings };
if (summary.errors.length || summary.warnings.length) throw new Error(JSON.stringify(summary));
fs.writeFileSync(`${root}/browser-check.json`, JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
