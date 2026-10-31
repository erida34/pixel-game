async (page) => {
  const errors=[],warnings=[],checks=[],restarts=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const read=()=>page.locator('canvas').evaluate(el=>({...el.dataset}));
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  await page.goto('http://127.0.0.1:4175/?debug=1&seed=20261013');
  await page.getByRole('button',{name:'Начать забег'}).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
  const initial=await read(); const initialTerrain=JSON.parse(initial.terrain).map(({frame,...t})=>t);
  assert(await page.locator('#asset-status').textContent()==='Графика принята · ENDESGA-32','approved graphics');
  await page.keyboard.down('w');await page.keyboard.down('a');await page.waitForTimeout(280);await page.keyboard.up('w');await page.keyboard.up('a');
  const moved=await read();assert(Number(moved.x)<0&&Number(moved.y)<0&&moved.clear==='true','preview negative move');
  await page.screenshot({path:'docs/evidence/stage-3/preview.png',fullPage:true});
  await page.keyboard.press('Escape');await page.waitForTimeout(50);const paused=await read();
  await page.waitForTimeout(350);const frozen=await read();assert(paused.time===frozen.time&&paused.terrain===frozen.terrain,'preview pause');
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='upgrade',null,{timeout:45000});
  const choice=await read();await page.waitForTimeout(300);const choiceAfter=await read();
  assert(choice.time===choiceAfter.time&&choice.terrain===choiceAfter.terrain,'choice freezes environment');
  assert(new Set(JSON.parse(choice.offers)).size===3,'distinct offers');
  await page.locator('[data-upgrade="amber_lantern"]').click();
  assert(JSON.parse((await read()).inventory).amber_lantern===2,'combat upgrade');checks.push('static build assets, movement, combat, XP, upgrade, pause');
  await page.getByRole('button',{name:'Мастерская графики',exact:true}).click();
  await page.getByRole('button',{name:'04 · Сложные стыки'}).click();
  for(let n=0;n<3;n++) {
    await page.getByRole('button',{name:'Играть',exact:true}).click();
    await page.getByRole('button',{name:'Начать забег'}).click();
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
    const s=await read();assert(s.kills==='0'&&s.level==='1'&&s.hp==='80'&&Number(s.unloaded)===0&&Number(s.generated)===16,'clean map state');
    assert(JSON.stringify(JSON.parse(s.terrain).map(({frame,...t})=>t))===JSON.stringify(initialTerrain),'same seed after restart');
    restarts.push({objects:s.objects,chunks:JSON.parse(s.chunks).length,time:s.time});
    await page.keyboard.press('Escape');
  }
  assert(new Set(restarts.map(s=>s.objects)).size===1,'object leakage');checks.push('workshop preserved; three clean restarts reproduce world and object count');
  assert(!errors.length&&!warnings.length,JSON.stringify({errors,warnings}));
  return {checks,errors,warnings,restarts,browser:page.context().browser().version(),viewport:page.viewportSize(),choice:{time:choice.time,kills:choice.kills,level:choice.level}};
}
