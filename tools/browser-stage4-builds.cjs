async (page) => {
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const read=()=>page.locator('canvas').evaluate(el=>({...el.dataset}));const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
 for(const id of ['close','ranged','mobile']){
  await page.getByRole('button',{name:'Играть',exact:true}).click();await page.getByRole('button',{name:'Мастерская боя',exact:true}).click();await page.locator(`[data-review="${id}"]`).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
  const effects=new Set(),kinds=new Set(),samples=[],deadFrames=new Set();let sawBell=false,sawNeedle=false,sawMoth=false;
  for(let n=0;n<60;n++){
   const keys=['d','s','a','w'];if(n%15===0)await page.keyboard.down(keys[Math.floor(n/15)]);
   await page.waitForTimeout(450);const s=await read(),c=JSON.parse(s.combat);
   if(n%15===14)await page.keyboard.up(keys[Math.floor(n/15)]);
   assert(s.phase==='running',`${id} died at ${s.time}`);
   for(const e of c.enemies)kinds.add(e.kind);for(const f of c.frames)if(f.includes('/death/'))deadFrames.add(f);for(const f of c.effects)effects.add(f);
   sawBell ||= c.strikes.length>0;sawNeedle ||= c.projectiles.some(p=>p.owner==='hero');sawMoth ||= c.orbits.length>0;
   samples.push({time:Number(s.time),hp:Number(s.hp),kills:Number(s.kills),xp:Number(s.xp),x:Number(s.x),y:Number(s.y),strikes:c.strikes.length,projectiles:c.projectiles.length,orbits:c.orbits.length});
   if(n===8||n===40)await page.screenshot({path:`docs/evidence/stage-4/build-${id}-${n===8?'early':'late'}.png`,fullPage:true});
  }
  const end=await read();assert(Number(end.kills)>=5,`${id} ineffective`);assert(Number(end.hp)>0,`${id} survival`);
  if(id==='ranged')assert(sawBell&&sawNeedle,'ranged attacks missing');if(id!=='ranged')assert(sawMoth,'orbit missing');
  await page.keyboard.press('Escape');await page.waitForTimeout(100);const a=await read();await page.waitForTimeout(350);const b=await read();assert(a.time===b.time&&a.combat===b.combat,'build pause');
  results.push({id,end:{time:end.time,hp:end.hp,kills:end.kills,xp:end.xp,inventory:JSON.parse(end.inventory),stats:JSON.parse(end.stats)},kinds:[...kinds],effects:[...effects],deadFrames:[...deadFrames],sawBell,sawNeedle,sawMoth,samples,pause:true});
 }
 assert(errors.length===0,JSON.stringify(errors));return {results,errors,browser:page.context().browser().version(),viewport:page.viewportSize()};
}
