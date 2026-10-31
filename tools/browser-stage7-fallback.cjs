async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const context=page.context(),fallback=await context.newPage();
  fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      return ['webgl','webgl2','experimental-webgl'].includes(type)?null:original.call(this,type,...args);
    };
  });
  await fallback.goto('http://127.0.0.1:4175/?debug=1&seed=20261014');await fallback.bringToFront();
  await fallback.getByRole('button',{name:'Начать забег',exact:true}).click();await fallback.waitForTimeout(600);
  const canvas=await fallback.locator('canvas').evaluate(c=>({phase:c.dataset.phase,time:c.dataset.time,atmosphere:JSON.parse(c.dataset.atmosphere),canvas2d:!!c.getContext('2d')}));
  if(!canvas.canvas2d||canvas.atmosphere.supported||canvas.atmosphere.enabled||canvas.atmosphere.passes)throw Error('Canvas fallback failed');
  await fallback.keyboard.down('d');await fallback.waitForTimeout(500);await fallback.keyboard.up('d');await fallback.keyboard.press('Escape');
  const after=await fallback.locator('canvas').evaluate(c=>({phase:c.dataset.phase,x:Number(c.dataset.x)}));
  await fallback.close();await page.bringToFront();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4175/?debug=1&seed=20261014');await page.getByRole('button',{name:'Начать забег',exact:true}).click();await page.waitForTimeout(400);
  const reduced=await page.locator('canvas').evaluate(c=>JSON.parse(c.dataset.atmosphere));
  if(reduced.motion||!reduced.enabled)throw Error('Reduced-motion atmosphere failed');
  await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  return {canvas,after,reduced,errors};
}
