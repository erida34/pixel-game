async (page) => {
  const errors=[], samples=[]; page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.locator('canvas').evaluate(el=>({...el.dataset}));
  await page.goto('http://127.0.0.1:5175/?debug=1&seed=20261013');
  await page.getByRole('button',{name:'Начать забег'}).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
  const initial=await read(); const landmark=JSON.parse(initial.terrain).find(t=>t.x===4&&t.y===2);
  if (landmark?.decoration!=='lantern') throw new Error('missing seed landmark');
  await page.keyboard.down('s');
  while (Number((await read()).y)<79) await page.waitForTimeout(5);
  await page.keyboard.up('s'); await page.keyboard.down('d');
  let contacted=false; const deadline=Date.now()+2200;
  while (Date.now()<deadline) {
    const s=await read(), distance=Math.hypot(Number(s.x)-144,Number(s.y)-80);
    samples.push({x:s.x,y:s.y,distance,clear:s.clear});
    if(s.clear!=='true'||s.enemiesClear!=='true'||distance<21-1e-5) throw new Error('obstacle penetrated');
    if(distance<=21.001) { contacted=true; break; }
    await page.waitForTimeout(15);
  }
  await page.keyboard.up('d');
  if(!contacted) throw new Error('did not contact lantern');
  await page.screenshot({path:'docs/evidence/stage-3/obstacle-contact.png',fullPage:true});
  // Walk around the circular footprint, then pass its eastern side.
  await page.keyboard.down('s'); await page.waitForTimeout(480); await page.keyboard.up('s');
  await page.keyboard.down('d'); await page.waitForTimeout(650); await page.keyboard.up('d');
  const beyond=await read(); if(Number(beyond.x)<170||beyond.clear!=='true') throw new Error('cannot walk around');
  await page.screenshot({path:'docs/evidence/stage-3/obstacle-bypass.png',fullPage:true});
  await page.getByRole('button',{name:'Играть',exact:true}).click();
  await page.getByRole('button',{name:'Начать забег'}).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
  await page.keyboard.down('a'); await page.keyboard.down('w'); await page.waitForTimeout(1000); await page.keyboard.up('a'); await page.keyboard.up('w');
  const negative=await read(); if(Number(negative.x)>=0||Number(negative.y)>=0||negative.clear!=='true') throw new Error('negative diagonal');
  await page.screenshot({path:'docs/evidence/stage-3/negative-junction.png',fullPage:true});
  await page.keyboard.press('Escape');
  return {errors,contacted,samples,beyond:{x:beyond.x,y:beyond.y},negative:{x:negative.x,y:negative.y,chunks:JSON.parse(negative.chunks)},checks:['contact at combined radius 21px','walk around lantern','negative diagonal and visible chunk border at origin']};
}
