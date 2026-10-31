async (page) => {
  const errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
  await page.setViewportSize({width:1360,height:1120});await page.goto('http://127.0.0.1:4174/');await page.bringToFront();
  await page.getByRole('button',{name:'Настройки',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:'docs/evidence/stage-6/settings-chrome.png',fullPage:true});await page.keyboard.press('Escape');
  assert(await page.locator('#performance-review').count()===0,'load fixture leaked to normal menu');
  await page.getByRole('button',{name:'Мастерская боя',exact:true}).click();await page.locator('[data-review=root_crawler]').click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='results',null,{timeout:40000});await page.waitForTimeout(350);
  const result=await page.locator('canvas').evaluate(el=>JSON.parse(el.dataset.result));assert(result.outcome==='defeat','natural death results');
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await page.locator('#start-run').waitFor({state:'visible'});assert(await page.locator('#start-run').isVisible(),'keyboard results -> menu');
  await page.keyboard.press('Enter');await page.waitForTimeout(300);assert(await page.locator('canvas').getAttribute('data-hp')==='80','results restart');
  await page.keyboard.press('Escape');await page.locator('#resume-run').waitFor({state:'visible'});assert(await page.locator('#resume-run').isVisible(),'normal preview pause');
  await page.getByRole('button',{name:'Мастерская графики',exact:true}).click();await page.getByRole('button',{name:'Настройки',exact:true}).click();await page.waitForTimeout(300);
  assert(await page.locator('canvas').getAttribute('data-paused')==='true','settings did not pause graphics workshop');await page.keyboard.press('Escape');assert(await page.locator('canvas').getAttribute('data-paused')==='true','settings auto resumed workshop');
  await page.keyboard.press('Escape');await page.waitForTimeout(150);assert(await page.locator('canvas').getAttribute('data-paused')==='false','explicit workshop resume');
  assert(!errors.length&&!warnings.length,JSON.stringify({errors,warnings}));return {browser:page.context().browser().version(),errors,warnings,result,checks:['non-debug menu excludes performance fixture','natural defeat -> keyboard results/menu/start','normal static preview pause','graphics workshop freezes for settings and requires explicit resume']};
}
