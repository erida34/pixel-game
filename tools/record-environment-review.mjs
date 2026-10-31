import fs from 'node:fs';
import crypto from 'node:crypto';
if (!process.argv.includes('--accept')) throw new Error('Use --accept only after viewing screenshots and the movement recording.');
const evidence = ['docs/evidence/stage-3/start-1x.png','docs/evidence/stage-3/start-2x.png','docs/evidence/stage-3/east-chunk.png','docs/evidence/stage-3/map-travel.webm','docs/evidence/stage-3/obstacle-walk.webm','docs/evidence/stage-3/browser-check.json','docs/evidence/stage-3/obstacle-check.json','docs/evidence/stage-3/video-check.json'];
for (const file of evidence) fs.accessSync(file);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const review = { status:'approved', reviewer:'Codex visual review, not user acceptance', reviewedAt:new Date().toISOString(), recipeSha256:sha('tools/build-environment.py'), textureSha256:sha('public/assets/environment/environment.png'), atlasSha256:sha('public/assets/environment/environment.json'), evidence, notes:'Viewed plants, shallow water and four flame frames at 1x and 2x; fixed anchors and sparse obstacle silhouettes match the ground palette. Base Pixelmon study had excess lantern structures; runtime is fully redrawn and only retains the design language. Static scenery remains static; animated parts use separate pixel poses.' };
fs.writeFileSync('docs/evidence/stage-3/art-review.json',JSON.stringify(review,null,2)+'\n');
console.log('Recorded exact environment atlas/recipe approval. Rebuild environment to apply.');
