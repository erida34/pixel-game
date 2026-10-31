async (page) => {
  await page.goto('http://127.0.0.1:5174/docs/evidence/stage-7/fire-fog/fire-fog-2x.webm');
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  const video=page.locator('video'),info=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
  if(info.duration<10||info.width!==1360||info.height!==1120)throw Error(JSON.stringify(info));
  await video.evaluate(v=>{v.pause();v.controls=false;});
  for(const [label,fraction] of [['middle',0.4],['late',0.8]]){
    await video.evaluate((v,t)=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=t;}),info.duration*fraction);
    await video.screenshot({path:`output/playwright/fire-fog-video-${label}.png`});
  }
  return info;
}
