async (page) => {
  await page.goto('http://127.0.0.1:4174/?debug=1&seed=20261014');await page.bringToFront();
  await page.getByRole('button',{name:'Настройки',exact:true}).click();await page.locator('#shake').check();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Нагрузочное испытание · 300 врагов'}).click();await page.waitForTimeout(3500);
  await page.keyboard.down('d');await page.waitForTimeout(1800);await page.keyboard.up('d');
  await page.keyboard.down('s');await page.waitForTimeout(1800);await page.keyboard.up('s');
  await page.screenshot({path:'docs/evidence/stage-6/load-2x.png',fullPage:true});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Настройки',exact:true}).first().click();await page.waitForTimeout(300);
  await page.screenshot({path:'docs/evidence/stage-6/settings-edge.png',fullPage:true});await page.waitForTimeout(1200);
  await page.locator('#shake').uncheck();await page.keyboard.press('Escape');await page.locator('#resume-run').click();await page.waitForTimeout(2500);await page.keyboard.press('Escape');
  return {viewport:page.viewportSize(),data:await page.locator('canvas').evaluate(el=>({phase:el.dataset.phase,time:Number(el.dataset.time),alive:Number(el.dataset.alive),shake:Number(el.dataset.shake)}))};
}
