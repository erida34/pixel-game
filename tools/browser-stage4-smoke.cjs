async (page) => {
 const errors=[],checks=[],restarts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const read=()=>page.locator('canvas').evaluate(el=>({...el.dataset}));const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
 await page.getByRole('button',{name:'Играть',exact:true}).click();await page.getByRole('button',{name:'Начать забег',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='upgrade',null,{timeout:45000});
 await page.waitForTimeout(250);await page.screenshot({path:'docs/evidence/stage-4/upgrade-icons.png',fullPage:true});
 const a=await read();await page.waitForTimeout(300);const b=await read();assert(a.time===b.time&&a.combat===b.combat,'choice freeze');assert(new Set(JSON.parse(a.offers)).size===3,'duplicate offer');
 await page.keyboard.press('Escape');assert((await read()).phase==='upgrade','escape bypasses choice');
 const offers=JSON.parse(a.offers),id=offers.find(id=>id!=='amber_lantern')??offers[0];await page.locator(`[data-upgrade="${id}"]`).click();
 assert(JSON.parse((await read()).inventory)[id]===1,'new item acquisition');assert(await page.locator('#inventory .content-icon').count()===2,'HUD icon acquisition');checks.push('natural XP -> three choices -> keyboard guard -> real acquisition and animated icon');
 await page.keyboard.press('Escape');await page.waitForTimeout(60);const p=await read();await page.waitForTimeout(300);assert((await read()).time===p.time,'pause');
 const other=await page.context().newPage();await other.goto('about:blank');await other.bringToFront();await page.waitForTimeout(150);await page.bringToFront();await other.close();assert((await read()).phase==='paused','focus resumed automatically');checks.push('pause and actual browser focus');
 await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.getByRole('button',{name:'Играть',exact:true}).click();await page.getByRole('button',{name:'Мастерская боя',exact:true}).click();await page.locator('[data-review="ranged"]').click();
 await page.setViewportSize({width:760,height:820});await page.keyboard.down('s');await page.waitForTimeout(2200);await page.keyboard.up('s');await page.keyboard.press('Escape');
 await page.screenshot({path:'docs/evidence/stage-4/content-1x.png',fullPage:true});assert(await page.locator('canvas').evaluate(el=>el.clientWidth)===640,'1x canvas');
 await page.setViewportSize({width:1360,height:1120});
 for(let n=0;n<3;n++){
  await page.getByRole('button',{name:'Играть',exact:true}).click();await page.getByRole('button',{name:'Начать забег',exact:true}).click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
  const s=await read(),c=JSON.parse(s.combat);assert(s.hp==='80'&&s.level==='1'&&s.kills==='0','dirty restart');assert(c.projectiles.length===0&&c.strikes.length===0&&c.orbits.length===0,'dirty weapons');assert(Object.values(JSON.parse(s.inventory)).reduce((a,b)=>a+b,0)===1,'review inventory leaked');restarts.push({objects:s.objects,inventory:JSON.parse(s.inventory)});await page.keyboard.press('Escape');
 }
 assert(new Set(restarts.map(r=>r.objects)).size===1,'restart object growth');checks.push('three independent restarts after review; 1x/2x display');
 assert(!errors.length,JSON.stringify(errors));return {errors,checks,restarts,choice:{offers,id,time:a.time},browser:page.context().browser().version(),viewport:page.viewportSize()};
}
