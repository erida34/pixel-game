async (page) => {
  await page.setViewportSize({width:740,height:740});
  await page.goto('http://127.0.0.1:5175/?debug=1&seed=20261013');
  await page.getByRole('button',{name:'Начать забег'}).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
  await page.waitForTimeout(200);
  await page.screenshot({path:'docs/evidence/stage-3/start-1x.png',fullPage:true});
  const dimensions=await page.locator('canvas').evaluate(el=>({width:el.width,height:el.height,displayWidth:el.getBoundingClientRect().width,displayHeight:el.getBoundingClientRect().height}));
  if(dimensions.displayWidth!==640) throw new Error('not 1x');
  await page.keyboard.press('Escape'); await page.setViewportSize({width:1360,height:1120});
  return dimensions;
}
