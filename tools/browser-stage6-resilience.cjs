async (page) => {
  const assert=(ok,msg)=>{if(!ok)throw Error(msg);},base='http://127.0.0.1:4174/?debug=1';
  await page.goto(base);await page.bringToFront();await page.getByRole('button',{name:'Настройки',exact:true}).click();await page.locator('#shake').check();
  await page.locator('#volume').focus();await page.keyboard.press('Home');for(let n=0;n<9;n++)await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Нагрузочное испытание · 300 врагов'}).click();
  await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.shake)>0);
  const sample=()=>page.evaluate(()=>new Promise(resolve=>{
    const start=performance.now(),values=[];const tick=()=>{const d=document.querySelector('canvas').dataset;values.push({hp:Number(d.hp),shake:Number(d.shake),time:Number(d.time)});if(performance.now()-start<2500)requestAnimationFrame(tick);else resolve({minHp:Math.min(...values.map(v=>v.hp)),maxShake:Math.max(...values.map(v=>v.shake)),first:values[0],last:values.at(-1)});};requestAnimationFrame(tick);
  }));
  const enabled=await sample();assert(enabled.maxShake>0,'shake did not follow real damage');
  await page.getByRole('button',{name:'Настройки',exact:true}).click();await page.locator('#shake').uncheck();await page.keyboard.press('Escape');await page.locator('#resume-run').click();
  const disabled=await sample();assert(disabled.maxShake===0&&disabled.last.time>disabled.first.time,'disabled shake or stopped combat');
  await page.keyboard.press('Escape');
  const denied=await page.context().newPage();const errors=[];denied.on('pageerror',e=>errors.push(e.message));
  await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}});Object.defineProperty(window,'AudioContext',{value:class{constructor(){throw Error('Unavailable audio');}}});});
  await denied.goto(base);await denied.getByRole('button',{name:'Настройки',exact:true}).click();await denied.locator('#volume').focus();await denied.keyboard.press('ArrowLeft');
  const message=await denied.locator('#settings-save').textContent();assert(message.includes('недоступно'),'storage failure hidden');
  await denied.keyboard.press('Escape');await denied.locator('#start-run').click();await denied.waitForTimeout(400);
  const fallback=await denied.locator('canvas').evaluate(el=>({phase:el.dataset.phase,audio:JSON.parse(el.dataset.audio)}));
  assert(fallback.phase==='running'&&fallback.audio.unavailable&&!errors.length,'audio/storage denial broke game');
  await denied.close();await page.bringToFront();return {enabled,disabled,storageMessage:message,fallback,errors};
}
