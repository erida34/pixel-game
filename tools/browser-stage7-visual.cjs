async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4175/?debug=1&seed=20261014');await page.bringToFront();
  await page.locator('#content-review').click();await page.locator('[data-review="close"]').click();
  const samples=[];
  for(const key of ['d','s','a','w']){
    await page.keyboard.down(key);await page.waitForTimeout(1900);await page.keyboard.up(key);
    const sample=await page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),atmosphere:JSON.parse(c.dataset.atmosphere),combat:JSON.parse(c.dataset.combat)}));samples.push(sample);
  }
  await page.locator('canvas').screenshot({path:'output/playwright/stage7-combat-2x.png'});
  await page.locator('[data-mode="play"]').click();await page.locator('#content-review').click();await page.locator('[data-review="greenhouse_heart"]').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.boss||'null')?.enemy.state==='prepare');
  await page.keyboard.press('Escape');await page.waitForTimeout(300);
  await page.locator('canvas').screenshot({path:'output/playwright/stage7-boss-warning-2x.png',style:'#run-panel{visibility:hidden!important}'});
  const boss=await page.locator('canvas').evaluate(c=>({boss:JSON.parse(c.dataset.boss),atmosphere:JSON.parse(c.dataset.atmosphere)}));
  await page.waitForTimeout(1500);
  return {samples,boss,errors};
}
