async (page) => {
  // Collect only 20 seconds per CLI invocation so progress remains observable.
  for (const key of ['d','s','a','w']) { await page.keyboard.down(key); await page.waitForTimeout(5000); await page.keyboard.up(key); }
  return await page.evaluate(()=>({seconds:(performance.now()-window.stage6Frames.start)/1000,frames:window.stage6Frames.frames.length,phase:document.querySelector('canvas').dataset.phase,alive:document.querySelector('canvas').dataset.alive}));
}
