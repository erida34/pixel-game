async (page) => {
  await page.goto('http://127.0.0.1:4175/?debug=1&seed=20261014');await page.bringToFront();
  await page.locator('#start-run').click();
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.phase==='upgrade',null,{timeout:30000});
  await page.waitForTimeout(300);
  const sample=()=>page.locator('canvas').evaluate(c=>({phase:c.dataset.phase,time:c.dataset.time,atmosphere:JSON.parse(c.dataset.atmosphere),offers:JSON.parse(c.dataset.offers)}));
  const before=await sample();await page.waitForTimeout(700);const after=await sample();
  if(before.time!==after.time||JSON.stringify(before.atmosphere.lights)!==JSON.stringify(after.atmosphere.lights))throw Error('Lighting moved during upgrade');
  await page.locator('[data-upgrade]').first().click();await page.waitForTimeout(400);const resumed=await sample();
  if(resumed.phase!=='running'||Number(resumed.time)<=Number(after.time))throw Error('Upgrade did not resume game');
  await page.keyboard.press('Escape');return {before,after,resumed};
}
