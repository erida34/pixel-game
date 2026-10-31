import fs from 'node:fs';
const directory = new URL('../docs/evidence/stage-2/', import.meta.url);
const files = Array.from({ length: 5 }, (_, index) => `run-segment-${index + 1}.json`);
const segments = files.map(file => JSON.parse(fs.readFileSync(new URL(file, directory), 'utf8')));
for (let index = 0; index < segments.length; index++) {
  const segment = segments[index];
  if (segment.errors.length) throw new Error(`Browser errors in ${files[index]}`);
  if (index && Math.abs(Number(segment.initial.time) - Number(segments[index - 1].final.time)) > 1e-6) throw new Error('Discontinuous run');
}
const result = segments.at(-1).result;
if (result?.outcome !== 'prototype_complete' || result.elapsedSeconds !== 180) throw new Error('Missing complete run');
const summary = { date: '2026-10-13', browser: 'Chromium 155.0.8059.40', viewport: { width: 1360, height: 1120 },
  accelerated: false, method: 'Five real-time browser segments with explicit pauses between them; only UI input and read-only diagnostics.',
  files, result, choices: segments.flatMap(segment => segment.choices), errors: [] };
fs.writeFileSync(new URL('full-run.json', directory), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(result));
