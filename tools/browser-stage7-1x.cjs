async (page) => {
  await page.setViewportSize({width:960,height:820});await page.bringToFront();
  await page.locator('canvas').screenshot({path:'output/playwright/stage7-lighting-1x.png',style:'#run-panel{visibility:hidden!important}'});
  return {browser:await page.evaluate(()=>navigator.userAgentData.getHighEntropyValues(['fullVersionList'])),canvas:await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,phase:c.dataset.phase}))};
}
