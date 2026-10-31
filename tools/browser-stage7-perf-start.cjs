async (page) => {
  const failures=[];page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))failures.push(m.text());});
  await page.setViewportSize({width:1360,height:1120});
  await page.goto('http://127.0.0.1:4175/?debug=1&seed=20261014');await page.bringToFront();
  await page.locator('#open-settings').click();await page.locator('#atmosphere').check();await page.locator('#shake').uncheck();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Нагрузочное испытание · 300 врагов'}).click();await page.waitForTimeout(10000);
  const result=await page.evaluate(()=>{
    const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
    const extension=gl.getExtension('WEBGL_debug_renderer_info');
    // Reuse the stage-6 segment/finish harness so the sampling method is identical.
    window.stage6Frames={frames:[],samples:[],last:0,serial:canvas.dataset.frameSerial,start:performance.now(),running:true,errors:[]};
    const b=window.stage6Frames;
    const tick=at=>{
      if(!b.running)return;
      if(b.serial!==canvas.dataset.frameSerial){if(b.last)b.frames.push(at-b.last);b.last=at;b.serial=canvas.dataset.frameSerial;}
      if(!b.samples.length||at-b.samples.at(-1).at>=250){
        const d=canvas.dataset,a=JSON.parse(d.atmosphere),c=JSON.parse(d.combat);
        b.samples.push({at,time:Number(d.time),alive:Number(d.alive),kills:Number(d.kills),phase:d.phase,objects:Number(d.objects),sprites:Number(d.sprites),projectiles:c.projectiles.length,effects:c.effects.length,lights:a.lights.length,passes:a.passes,allocated:a.allocated,enabled:a.enabled});
      }
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
    return {browser:navigator.userAgent,canvas:{width:canvas.clientWidth,height:canvas.clientHeight},renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unavailable',fragmentUniformVectors:gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),alive:Number(canvas.dataset.alive),atmosphere:JSON.parse(canvas.dataset.atmosphere),warmupSeconds:10};
  });return {...result,failures};
}
