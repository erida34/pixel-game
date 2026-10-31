async (page) => {
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.setViewportSize({width:1360,height:1120});
  await page.goto('http://127.0.0.1:4175/?debug=1&seed=20261014');await page.bringToFront();
  const canvas=page.locator('canvas');
  // Read the rendered GL framebuffer: browser screenshot compositing can dither
  // identical pixels differently (observed in Edge). This checks the game itself.
  const framebuffer=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
    const c=document.querySelector('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl'),pixels=new Uint8Array(c.width*c.height*4);
    gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let hash=2166136261;
    for(const x of pixels)hash=Math.imul(hash^x,16777619);
    resolve({hash:hash>>>0,nonzero:pixels.some(v=>v!==0),error:gl.getError()});
  })));
  const read=()=>canvas.evaluate(c=>({phase:c.dataset.phase,time:Number(c.dataset.time),x:Number(c.dataset.x),y:Number(c.dataset.y),objects:Number(c.dataset.objects),keyboardListeners:Number(c.dataset.keyboardListeners),atmosphere:JSON.parse(c.dataset.atmosphere||'null')}));
  await page.locator('#open-settings').click();await page.locator('#atmosphere').check();await page.locator('#shake').uncheck();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Начать забег',exact:true}).click();await page.waitForTimeout(500);
  const initial=await read(),directions=[];
  for(const keys of [['w'],['w','d'],['d'],['s','d'],['s'],['s','a'],['a'],['w','a']]) {
    for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(450);for(const key of keys)await page.keyboard.up(key);
    const data=await read();directions.push({keys,...data});
  }
  await page.keyboard.press('Escape');await page.waitForTimeout(400);
  const paused=await read(),style='#run-panel,#settings-panel{visibility:hidden!important}';
  await canvas.screenshot({path:'output/playwright/stage7-lighting-on-2x.png',style});const first=await framebuffer();
  await page.waitForTimeout(600);const second=await framebuffer(),after=await read();
  if(paused.time!==after.time||first.hash!==second.hash||!first.nonzero||first.error||second.error)throw Error('Atmosphere moves on pause');
  await page.locator('#open-settings').click();await page.locator('#atmosphere').uncheck();await page.waitForTimeout(400);
  const disabled=await read();await canvas.screenshot({path:'output/playwright/stage7-lighting-off-2x.png',style});const off=await framebuffer();
  if(disabled.atmosphere.enabled||disabled.atmosphere.passes!==0||first.hash===off.hash)throw Error('Effects toggle failed');
  await page.keyboard.press('Escape');await page.locator('#resume-run').click();await page.waitForTimeout(400);
  await page.reload();await page.getByRole('button',{name:'Начать забег',exact:true}).click();await page.waitForTimeout(400);
  const persisted=await read();if(persisted.atmosphere.enabled)throw Error('Disabled preference not persisted');
  await page.locator('#open-settings').click();await page.locator('#atmosphere').check();await page.keyboard.press('Escape');
  await page.locator('#resume-run').click();await page.waitForTimeout(400);
  const restarts=[];
  for(let n=0;n<3;n++){
    await page.keyboard.press('Escape');await page.locator('#quit-run').click();
    await page.getByRole('button',{name:'Начать забег',exact:true}).click();await page.waitForTimeout(400);
    const data=await read();restarts.push(data);
    if(data.atmosphere.passes!==1||data.atmosphere.allocated!==1||!data.atmosphere.enabled||data.keyboardListeners!==1)throw Error('Restart pipeline/listener leak');
  }
  await page.keyboard.press('Escape');
  return {browser:await page.evaluate(()=>navigator.userAgent),initial,directions,pause:{before:paused,after,framebufferIdentical:true,first,second},disabled,persisted,restarts,errors};
}
