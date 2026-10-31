async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
  await page.setViewportSize({width:1360,height:1120});
  await page.goto('http://127.0.0.1:4175/?debug=1&seed=20261014');await page.bringToFront();
  await page.locator('#open-settings').click();await page.locator('#atmosphere').check();await page.locator('#shake').uncheck();await page.keyboard.press('Escape');
  await page.locator('#content-review').click();await page.locator('[data-review="root_crawler"]').click();
  await page.waitForTimeout(350);await page.keyboard.press('Escape');await page.waitForTimeout(300);
  const far=await page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),atmosphere:JSON.parse(c.dataset.atmosphere),combat:JSON.parse(c.dataset.combat)}));
  await page.locator('canvas').screenshot({path:'output/playwright/fire-fog-far-2x.png',style:'#run-panel{visibility:hidden!important}'});
  await page.locator('#resume-run').click();await page.waitForTimeout(2100);await page.keyboard.press('Escape');await page.waitForTimeout(300);
  const near=await page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),atmosphere:JSON.parse(c.dataset.atmosphere),combat:JSON.parse(c.dataset.combat)}));
  await page.locator('canvas').screenshot({path:'output/playwright/fire-fog-near-2x.png',style:'#run-panel{visibility:hidden!important}'});
  await page.locator('[data-mode="play"]').click();await page.locator('#performance-review').click();
  const flame=[];
  for(let n=0;n<24;n++){
    await page.waitForTimeout(260);
    flame.push(await page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),phase:c.dataset.phase,lights:JSON.parse(c.dataset.atmosphere).lights.filter(l=>l.id==='hero'||l.id.startsWith('street/'))})));
  }
  const intensity=flame.map(s=>s.lights.find(l=>l.id==='hero').intensity),radii=flame.map(s=>s.lights.find(l=>l.id==='hero').radius);
  if(Math.max(...intensity)-Math.min(...intensity)<0.2||Math.max(...radii)-Math.min(...radii)<5)throw Error('Fire does not visibly flicker');
  await page.keyboard.press('Escape');await page.waitForTimeout(300);
  const paused=await page.locator('canvas').evaluate(c=>JSON.parse(c.dataset.atmosphere));await page.waitForTimeout(500);
  const frozen=await page.locator('canvas').evaluate(c=>JSON.parse(c.dataset.atmosphere));
  if(JSON.stringify(paused.lights)!==JSON.stringify(frozen.lights))throw Error('Flame changes on pause');
  return {far,near,flame,intensityRange:[Math.min(...intensity),Math.max(...intensity)],radiusRange:[Math.min(...radii),Math.max(...radii)],paused,frozen,errors};
}
