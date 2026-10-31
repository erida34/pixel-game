async (page) => {
 const errors=[],warnings=[],checks=[],restarts=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const read=()=>page.locator('canvas').evaluate(el=>({...el.dataset}));const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
 await page.goto('http://127.0.0.1:4175/?debug=1&seed=20261014');await page.getByRole('button',{name:'Начать забег',exact:true}).click();
 assert(await page.locator('#asset-status').textContent()==='Графика принята · ENDESGA-32','unapproved production art');
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='upgrade',null,{timeout:45000});await page.waitForTimeout(250);await page.screenshot({path:'docs/evidence/stage-4/upgrade-icons.png',fullPage:true});const choice=await read();const id=JSON.parse(choice.offers)[0];await page.locator(`[data-upgrade="${id}"]`).click();await page.keyboard.press('Escape');
 const a=await read();await page.waitForTimeout(300);assert((await read()).time===a.time,'preview pause');checks.push('static assets, natural combat/XP, upgrade icons and pause');
 await page.getByRole('button',{name:'Мастерская графики',exact:true}).click();await page.getByRole('button',{name:'04 · Сложные стыки'}).click();
 await page.getByRole('button',{name:'Играть',exact:true}).click();await page.getByRole('button',{name:'Мастерская боя',exact:true}).click();await page.locator('[data-review="ranged"]').click();
 await page.keyboard.down('s');await page.waitForTimeout(2500);await page.keyboard.up('s');await page.screenshot({path:'docs/evidence/stage-4/preview.png',fullPage:true});const combat=await read();assert(Number(combat.kills)>0,'preview weapons ineffective');checks.push('graphics workshop and same content workshop in static build');
 for(let n=0;n<3;n++){
  await page.getByRole('button',{name:'Играть',exact:true}).click();await page.getByRole('button',{name:'Начать забег',exact:true}).click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');const s=await read(),c=JSON.parse(s.combat);
  assert(s.hp==='80'&&s.level==='1'&&s.kills==='0'&&c.projectiles.length===0&&c.strikes.length===0&&c.orbits.length===0,'state leakage');assert(Object.values(JSON.parse(s.inventory)).reduce((a,b)=>a+b,0)===1,'review inventory leakage');restarts.push({objects:s.objects,time:s.time});await page.keyboard.press('Escape');
 }
 assert(new Set(restarts.map(r=>r.objects)).size===1,'object leakage');assert(!errors.length&&!warnings.length,JSON.stringify({errors,warnings}));return {errors,warnings,checks,restarts,choice:{offers:JSON.parse(choice.offers),id,time:choice.time},browser:page.context().browser().version(),viewport:page.viewportSize()};
}
