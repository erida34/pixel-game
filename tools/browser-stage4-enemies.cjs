async (page) => {
  const errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const read=()=>page.locator('canvas').evaluate(el=>({...el.dataset}));
  const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
  for(const id of ['root_crawler','wax_walker','moth_swarm','thorn_runner','bell_spitter','lantern_thief']) {
    await page.getByRole('button',{name:'Играть',exact:true}).click();
    await page.getByRole('button',{name:'Мастерская боя',exact:true}).click();
    await page.locator(`[data-review="${id}"]`).click();
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
    const states=new Set(),frames=new Set(),shots=[],samples=[];let warningShot=false;
    for(let n=0;n<30;n++) {
      await page.waitForTimeout(170);const s=await read(),c=JSON.parse(s.combat);assert(c.enemies.length>0,`${id} absent`);
      for(const e of c.enemies){states.add(e.state);samples.push({time:Number(s.time),...e});}
      for(const f of c.frames)frames.add(f);
      if(c.projectiles.length)shots.push({time:Number(s.time),count:c.projectiles.length});
      if((c.enemies.some(e=>e.state==='prepare')&&!warningShot)||n===8) {await page.screenshot({path:`docs/evidence/stage-4/${id}${c.enemies.some(e=>e.state==='prepare')?'-prepare':''}.png`,fullPage:true});if(c.enemies.some(e=>e.state==='prepare'))warningShot=true;}
    }
    if(['thorn_runner','bell_spitter','lantern_thief'].includes(id))assert(states.has('prepare')&&states.has('attack')&&states.has('recover'),`${id}: ${[...states]}`);
    if(id==='bell_spitter')assert(shots.length>0,'spitter never shoots');
    await page.keyboard.press('Escape');const a=await read();await page.waitForTimeout(250);const b=await read();assert(a.time===b.time&&a.combat===b.combat,`${id} pause`);
    results.push({id,states:[...states],frames:[...frames],shots,samples,hp:b.hp,time:b.time,pause:true});
  }
  assert(errors.length===0,JSON.stringify(errors));
  return {results,errors,browser:page.context().browser().version(),viewport:page.viewportSize()};
}
