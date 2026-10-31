async (page) => {
  return await page.evaluate(()=>{
    const b=window.stage6Frames;b.running=false;
    // Exactly first 60 seconds of continuous foreground display after warmup.
    let elapsed=0;const frames=[];for(const frame of b.frames){if(elapsed>=60000)break;frames.push(frame);elapsed+=frame;}
    const sorted=[...frames].sort((a,b)=>a-b),samples=b.samples.filter(s=>s.at-b.start<=60000);
    return {elapsedMs:elapsed,frameCount:frames.length,averageFps:1000*frames.length/elapsed,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),frames,samples,minAlive:Math.min(...samples.map(s=>s.alive)),maxAlive:Math.max(...samples.map(s=>s.alive)),phases:[...new Set(samples.map(s=>s.phase))],simulationSeconds:samples.at(-1).time-samples[0].time,first:samples[0],last:samples.at(-1),audio:JSON.parse(document.querySelector('canvas').dataset.audio)};
  });
}
