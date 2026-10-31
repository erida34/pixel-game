import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = 'docs/evidence/stage-6';
const read = name => JSON.parse(fs.readFileSync(`${root}/${name}.json`, 'utf8').replace(/^\uFEFF/, ''));
const summary = { date: '2026-10-14', machine: read('machine'), browsers: {} };
for (const name of ['chrome', 'edge']) {
  const smoke = read(`${name}-smoke`), resilience = read(`${name}-resilience`), perf = read(`${name}-performance`), environment = read(`${name}-performance-environment`);
  const simulationSeconds = perf.last.time - perf.first.time;
  if (smoke.errors.length || smoke.warnings.length || resilience.errors.length || environment.failures.length) throw Error(`${name}: browser errors`);
  if (perf.minAlive !== 300 || perf.maxAlive !== 300 || perf.elapsedMs < 60000 || simulationSeconds < 59 || perf.phases.join() !== 'running') throw Error(`${name}: invalid load measurement`);
  if (perf.averageFps < 60 || perf.p95Ms > 1000 / 60) throw Error(`${name}: load target failed`);
  summary.browsers[name] = { version: smoke.browser, renderer: environment.renderer, canvas: environment.canvas,
    elapsedMs: perf.elapsedMs, simulationSeconds, frameCount: perf.frameCount, averageFps: perf.averageFps, p95Ms: perf.p95Ms, maxMs: perf.maxMs,
    alive: [perf.minAlive, perf.maxAlive], killsDuringMeasurement: perf.last.kills - perf.first.kills, first: perf.first, last: perf.last,
    volume: perf.audio.volume, smokeChecks: smoke.checks, objectsAfterRestart: smoke.restarts.map(r => r.objects), keyboardListeners: smoke.restarts.map(r => r.listeners) };
}
fs.writeFileSync(`${root}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
const files = fs.readdirSync('dist', { recursive: true }).filter(file => fs.statSync(path.join('dist', file)).isFile()).map(file => {
  const bytes = fs.readFileSync(path.join('dist', file));
  return { path: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
fs.writeFileSync(`${root}/build.json`, JSON.stringify({ date: '2026-10-14', files, bytes: files.reduce((sum, f) => sum + f.bytes, 0) }, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(summary.browsers).map(([id, b]) => [id, { averageFps: b.averageFps, p95Ms: b.p95Ms, simulationSeconds: b.simulationSeconds }]))));
