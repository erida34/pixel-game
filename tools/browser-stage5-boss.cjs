async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.getByRole('button',{name:'Играть',exact:true}).click();
  await page.getByRole('button',{name:'Мастерская боя',exact:true}).click();
  await page.getByRole('button',{name:'Сердце оранжереи',exact:true}).click();
  const read=()=>page.locator('canvas').evaluate(el=>({...el.dataset}));
  const states=new Set(),frames=new Set(),samples=[],screens=new Set();let rings=0,summons=0;
  let held=[];const start=Date.now();
  while(Date.now()-start<22000) {
    const s=await read();if(s.phase!=='running')throw new Error(`Boss review stopped ${s.phase} ${s.time}`);
    const b=JSON.parse(s.boss),c=JSON.parse(s.combat),e=b.enemy;
    states.add(`${e.state}/${b.attack}`);for(const f of c.frames)if(f.startsWith('greenhouse_heart/'))frames.add(f);
    if(b.ring)rings++;if(b.summons.length)summons++;
    if(e.state==='prepare'&&!screens.has(b.attack)) {screens.add(b.attack);await page.screenshot({path:`docs/evidence/stage-5/boss-${b.attack}-prepare-2x.png`,fullPage:true});}
    if(b.ring&&!screens.has('ring')) {screens.add('ring');await page.screenshot({path:'docs/evidence/stage-5/boss-thorns-release-2x.png',fullPage:true});}
    const dx=Number(s.x)-e.x,dy=Number(s.y)-e.y,dist=Math.hypot(dx,dy)||1;
    const radial=dist<115?1:dist>170?-1:0;
    const vx=dx/dist*radial-dy/dist,vy=dy/dist*radial+dx/dist;
    const keys=[];if(Math.abs(vx)>0.3)keys.push(vx>0?'d':'a');if(Math.abs(vy)>0.3)keys.push(vy>0?'s':'w');
    for(const k of held)if(!keys.includes(k))await page.keyboard.up(k);for(const k of keys)if(!held.includes(k))await page.keyboard.down(k);held=keys;
    samples.push({time:Number(s.time),hp:Number(s.hp),state:e.state,attack:b.attack,ring:b.ring,summons:b.summons,enemies:c.enemies.length,x:Number(s.x),y:Number(s.y),bossX:e.x,bossY:e.y});
    await page.waitForTimeout(100);
  }
  for(const k of held)await page.keyboard.up(k);
  await page.locator('#game').focus();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='paused');const paused=await read();await page.waitForTimeout(500);const after=await read();
  if(paused.time!==after.time||paused.boss!==after.boss||paused.combat!==after.combat)throw new Error(`Boss pause failed: ${paused.time}/${after.time}; ${paused.phase}/${after.phase}; boss ${paused.boss===after.boss}; combat ${paused.combat===after.combat}`);
  await page.screenshot({path:'docs/evidence/stage-5/boss-paused-2x.png',fullPage:true});
  for(const state of ['prepare/thorns','attack/thorns','prepare/summon','attack/summon'])if(!states.has(state))throw new Error(`Missing ${state}`);
  if(!rings||!summons)throw new Error('Missing boss attack');if(errors.length)throw new Error(errors.join('; '));
  return {states:[...states],frames:[...frames],rings,summons,samples,pause:true,errors,browser:page.context().browser().version(),viewport:page.viewportSize(),final:{time:after.time,hp:after.hp}};
}
