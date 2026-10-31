async (page) => {
  await page.goto('http://127.0.0.1:5173/docs/evidence/stage-1/final-movement.webm');
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  const video=page.locator('video');
  const info=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
  if(info.duration<8 || info.width!==1360 || info.height!==1120) throw new Error(`Invalid recording: ${JSON.stringify(info)}`);
  await video.evaluate(v=>{v.pause();v.controls=false;});
  for(const [name,time] of [['walk',2.2],['reaction',6.2],['gallery',8.3]]) {
    await video.evaluate((v,t)=>new Promise(resolve=>{
      v.addEventListener('seeked',resolve,{once:true});v.currentTime=Math.min(t,v.duration-0.1);
    }),time);
    await video.screenshot({path:`docs/evidence/stage-1/recording-${name}.png`});
  }
  return info;
}
