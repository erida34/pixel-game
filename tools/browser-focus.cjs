async (page) => {
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.state==='idle');
  await page.evaluate(()=>{
    window.__focusEvents=[];
    for(const event of ['blur','focus']) window.addEventListener(event,()=>window.__focusEvents.push([event,document.hasFocus(),document.visibilityState]));
    document.addEventListener('visibilitychange',()=>window.__focusEvents.push(['visibilitychange',document.hasFocus(),document.visibilityState]));
  });
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await page.bringToFront();
  const other=await page.context().newPage();
  await other.goto('about:blank'); await other.bringToFront();
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});
  await page.waitForTimeout(150);
  const hidden=await page.evaluate(()=>({events:window.__focusEvents,hidden:document.hidden,focus:document.hasFocus(),paused:document.querySelector('canvas').dataset.paused}));
  await page.bringToFront(); await page.waitForTimeout(150);
  const returned=await page.evaluate(()=>({events:window.__focusEvents,hidden:document.hidden,focus:document.hasFocus(),paused:document.querySelector('canvas').dataset.paused}));
  await other.close(); await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true}); await cdp.detach();
  if(hidden.paused!=='true' || returned.paused!=='true') throw new Error(`Blur check: ${JSON.stringify({hidden,returned})}`);
  return {hidden,returned};
}
