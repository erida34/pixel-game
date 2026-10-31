async (page) => {
  await page.goto('http://127.0.0.1:5173/docs/evidence/stage-5/boss-finale-2x.webm');
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  const v=page.locator('video');await v.evaluate(v=>{v.pause();v.controls=false;});
  const samples=[];
  for(const t of [19.7,19.85,20,20.15,20.3,20.45,20.6,20.75,20.9,21.1,85]) {
    await v.evaluate((v,t)=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=t;}),t);
    await v.screenshot({path:`docs/evidence/stage-5/video-finale-${t}.png`});samples.push(t);
  }
  return {samples};
}
