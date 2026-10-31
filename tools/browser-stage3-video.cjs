async (page) => {
  const results=[];
  for(const file of ['map-travel','obstacle-walk']) {
    await page.goto(`http://127.0.0.1:5175/docs/evidence/stage-3/${file}.webm`);
    await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
    const video=page.locator('video');
    const info=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
    if(info.duration<5||info.width!==1360||info.height!==1120) throw new Error(JSON.stringify(info));
    await video.evaluate(v=>{v.pause();v.controls=false;});
    for(const [name,fraction] of [['early',0.15],['middle',0.5],['late',0.85]]) {
      await video.evaluate((v,time)=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=time;}),info.duration*fraction);
      await video.screenshot({path:`docs/evidence/stage-3/video-${file}-${name}.png`});
    }
    results.push({file,...info});
  }
  return results;
}
