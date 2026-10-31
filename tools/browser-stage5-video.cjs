async (page) => {
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const file of ['boss-attacks-2x','boss-finale-2x']){
  await page.goto(`http://127.0.0.1:5173/docs/evidence/stage-5/${file}.webm`);await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  const v=page.locator('video'),info=await v.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
  if(info.duration<10||info.width!==1360||info.height!==1120)throw new Error(JSON.stringify(info));
  await v.evaluate(v=>{v.pause();v.controls=false;});
  for(const [label,fraction] of [['early',0.2],['middle',0.5],['late',0.8]]){
   await v.evaluate((v,t)=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=t;}),info.duration*fraction);
   await v.screenshot({path:`docs/evidence/stage-5/video-${file}-${label}.png`});
  }
  results.push({file,...info});
 }
 return {results,errors};
}
