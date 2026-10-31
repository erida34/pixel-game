// Bounded segment of real gameplay. No clock, health or inventory writes.
async (page) => {
  const log={startedAt:new Date().toISOString(),browser:page.context().browser().version(),viewport:page.viewportSize(),segments:[],choices:[],samples:[],errors:[]};
  const bossFrames=new Set();
  const errors=[];const onError=e=>errors.push(e.message);const onConsole=m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());};const onResponse=r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);};
  page.on('pageerror',onError);page.on('console',onConsole);page.on('response',onResponse);
  const read=()=>page.locator('canvas').evaluate(el=>({...el.dataset}));
  const initial=await read(), start=Date.now(); let nextSample=Number(initial.time), result=null, heldKey=null;
  if(initial.phase==='paused')await page.keyboard.press('Escape');
  while(Date.now()-start<50000) {
    const s=await read();
    for(const frame of JSON.parse(s.combat||'{"frames":[]}').frames)if(frame.startsWith('greenhouse_heart/'))bossFrames.add(frame);
    if(s.phase==='results') {result=JSON.parse(s.result);await page.screenshot({path:'docs/evidence/stage-5/full-run-result.png',fullPage:true});break;}
    if(s.phase==='upgrade') {
      if(heldKey){await page.keyboard.up(heldKey);heldKey=null;}
      const offers=JSON.parse(s.offers), inv=JSON.parse(s.inventory);
      if(new Set(offers).size!==3)throw new Error('Duplicate offers');
      const preferred=Number(s.hp)<35&&offers.includes('heal')?['heal']:['wax_seal','ember_moths','amber_lantern','keepers_watch','firefly_jar','glass_needles','wick','brass_lens','boots','root_bell','heal','fury','haste'];
      const id=preferred.find(id=>offers.includes(id))??offers[0];
      if(Number(s.level)%2)await page.keyboard.press(String(offers.indexOf(id)+1));else await page.locator(`[data-upgrade="${id}"]`).click();
      log.choices.push({time:Number(s.time),level:Number(s.level),id,before:inv});
    }
    if(Number(s.time)>=nextSample) {
      const b=JSON.parse(s.boss||'null');
      log.samples.push({time:Number(s.time),hp:Number(s.hp),kills:Number(s.kills),level:Number(s.level),xp:Number(s.xp),x:Number(s.x),y:Number(s.y),wave:Number(s.wave),ordinarySpawns:Number(s.ordinarySpawns),boss:b?{hp:b.enemy.hp,state:b.enemy.state,attack:b.attack,enraged:b.enraged,diedAt:b.enemy.diedAt,x:b.enemy.x,y:b.enemy.y}:null,inventory:JSON.parse(s.inventory),objects:Number(s.objects)});
      nextSample=Number(s.time)+5;
      if(Math.floor(Number(s.time))%60<6)await page.screenshot({path:`docs/evidence/stage-5/run-${Math.floor(Number(s.time)/60)*60}.png`,fullPage:true});
    }
    if(s.phase==='running') {
      const b=JSON.parse(s.boss||'null');let key=null;
      if(b && b.enemy.diedAt===null) {
        const dx=b.enemy.x-Number(s.x),dy=b.enemy.y-Number(s.y),dist=Math.hypot(dx,dy);
        const sign=dist>115?1:dist<85?-1:0;
        if(sign)key=Math.abs(dx)>Math.abs(dy)?(dx*sign>0?'d':'a'):(dy*sign>0?'s':'w');
      } else if(!b || b.enemy.diedAt!==null) {
        const c=JSON.parse(s.combat),hx=Number(s.x),hy=Number(s.y);
        const dist=p=>Math.hypot(p.x-hx,p.y-hy);
        const picks=c.pickups.filter(p=>p.kind==='magnet'||Number(s.hp)<60).sort((a,b)=>dist(a)-dist(b));
        const sparks=(c.sparks??[]).sort((a,b)=>dist(a)-dist(b));
        let target=picks[0]&&dist(picks[0])<400?picks[0]:sparks[0];
        let vx=0,vy=0;
        if(target&&dist(target)>25){vx=(target.x-hx)/dist(target);vy=(target.y-hy)/dist(target);}
        // Avoid close living enemies and incoming projectiles using observed diagnostics.
        for(const e of c.enemies)if(e.diedAt===null&&dist(e)<65){const distance=Math.max(1,dist(e));const weight=(65-distance)/25;vx+=(hx-e.x)/distance*weight;vy+=(hy-e.y)/distance*weight;}
        for(const e of c.projectiles)if(e.owner==='enemy'&&dist(e)<50){const distance=Math.max(1,dist(e));vx+=(hx-e.x)/distance*1.5;vy+=(hy-e.y)/distance*1.5;}
        if(Math.max(Math.abs(vx),Math.abs(vy))>0.2)key=Math.abs(vx)>Math.abs(vy)?(vx>0?'d':'a'):(vy>0?'s':'w');
      }
      if(heldKey!==key){if(heldKey)await page.keyboard.up(heldKey);if(key)await page.keyboard.down(key);heldKey=key;}
    }
    await page.waitForTimeout(120);
  }
  if(heldKey)await page.keyboard.up(heldKey);
  let final=await read();
  if(final.phase==='running') {await page.keyboard.press('Escape');await page.waitForTimeout(80);final=await read();}
  log.segments.push({wallSeconds:(Date.now()-start)/1000,from:Number(initial.time),to:Number(final.time),phase:final.phase});
  log.bossFrames=[...bossFrames];
  log.errors.push(...errors); if(result){log.result=result;log.endedAt=new Date().toISOString();}
  page.off('pageerror',onError);page.off('console',onConsole);page.off('response',onResponse);
  if(errors.length)throw new Error(errors.join('; '));
  return {log,from:initial.time,time:final.time,hp:final.hp,kills:final.kills,level:final.level,boss:JSON.parse(final.boss||'null'),phase:final.phase,result,choices:log.choices.length};
}
