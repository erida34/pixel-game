async (page) => {
  await page.setViewportSize({width:1360,height:1120});
  const failures=[];page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')failures.push(m.text());});
  await page.goto('http://127.0.0.1:4174/?debug=1&seed=20261014');
  await page.bringToFront();
  await page.getByRole('button',{name:'Нагрузочное испытание · 300 врагов'}).click();
  await page.waitForTimeout(10000);
  const result=await page.evaluate(()=>{
    const canvas=document.querySelector('canvas');
    const context=canvas.getContext('webgl2')||canvas.getContext('webgl');
    const extension=context?.getExtension('WEBGL_debug_renderer_info');
    const renderer=extension?context.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unavailable';
    window.stage6Frames={frames:[],samples:[],last:0,serial:canvas.dataset.frameSerial,start:performance.now(),running:true,errors:[]};
    const b=window.stage6Frames;
    const tick=(at)=>{
      if(!b.running)return;
      if(b.serial!==canvas.dataset.frameSerial){if(b.last)b.frames.push(at-b.last); b.last=at;b.serial=canvas.dataset.frameSerial;}
      if(!b.samples.length||at-b.samples.at(-1).at>=250){const d={...canvas.dataset};b.samples.push({at,time:Number(d.time),alive:Number(d.alive),kills:Number(d.kills),phase:d.phase,objects:Number(d.objects),sprites:Number(d.sprites),projectiles:JSON.parse(d.combat).projectiles.length,effects:JSON.parse(d.combat).effects.length});}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return {browser:navigator.userAgent,canvas:{width:canvas.clientWidth,height:canvas.clientHeight},renderer,alive:Number(canvas.dataset.alive),warmupSeconds:10};
  });
  return {...result,failures};
}
