async (page) => {
  await page.goto('http://127.0.0.1:4175/?debug=1&seed=20261014');await page.bringToFront();
  await page.locator('#performance-review').click();await page.waitForTimeout(5000);
  const result=await page.evaluate(()=>new Promise(resolve=>{
    const c=document.querySelector('canvas'),frames=[],samples=[],start=performance.now();let last=0,serial=c.dataset.frameSerial;
    const tick=at=>{
      if(serial!==c.dataset.frameSerial){if(last)frames.push(at-last);last=at;serial=c.dataset.frameSerial;}
      if(!samples.length||at-samples.at(-1).at>=250){const a=JSON.parse(c.dataset.atmosphere);samples.push({at,time:Number(c.dataset.time),phase:c.dataset.phase,alive:Number(c.dataset.alive),enabled:a.enabled,lights:a.lights.length,allocated:a.allocated});}
      if(at-start<10000)requestAnimationFrame(tick);else{
        const sorted=[...frames].sort((a,b)=>a-b),elapsed=frames.reduce((a,b)=>a+b,0);
        resolve({durationMs:at-start,averageFps:1000*frames.length/elapsed,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],frames,samples});
      }
    };requestAnimationFrame(tick);
  }));
  if(result.samples.some(s=>s.alive!==300||s.phase!=='running'||!s.enabled||s.allocated!==1)||result.averageFps<60||result.p95Ms>1000/60)throw Error('Fire/fog load regression');
  await page.keyboard.press('Escape');return result;
}
