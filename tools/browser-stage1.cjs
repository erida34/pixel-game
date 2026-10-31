// Playwright CLI: run-code --filename tools/browser-stage1.cjs
// UI actions exercise the real scene; diagnostics are read-only canvas attributes.
async (page) => {
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
  await page.setViewportSize({width:1360,height:1120});
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.state==='idle');
  const canvas=page.locator('canvas');
  await page.locator('#game').focus();
  const state=async()=>canvas.evaluate(el=>({...el.dataset}));
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  const checks=[];
  const move=async(keys,ms=380)=>{
    const before=await state();
    for(const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    const moving=await state();
    for(const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(50);
    const after=await state();
    assert(after.state==='idle' && after.direction===moving.direction,'Stop must retain direction');
    return {before,moving,after, distance:Math.hypot(Number(moving.x)-Number(before.x),Number(moving.y)-Number(before.y))};
  };
  for(const [keys,direction] of [
    [['w'],'n'],[['w','d'],'ne'],[['d'],'e'],[['s','d'],'se'],
    [['s'],'s'],[['s','a'],'sw'],[['a'],'w'],[['w','a'],'nw']
  ]) {
    const result=await move(keys);
    assert(result.moving.direction===direction,`Direction ${direction}`);
    assert(result.moving.state==='walk',`Walk ${direction}`);
    checks.push({check:`move/stop/${direction}`,distance:result.distance,retained:result.after.direction});
  }
  await page.keyboard.press('r'); await page.waitForTimeout(60);
  const axial=await move(['d'],650);
  await page.keyboard.press('r'); await page.waitForTimeout(60);
  const diagonal=await move(['d','s'],650);
  assert(Math.abs(axial.distance-diagonal.distance)<4,'Diagonal speed differs');
  checks.push({check:'diagonal speed',axial:axial.distance,diagonal:diagonal.distance,tolerancePx:4});
  await page.keyboard.press('r'); await page.waitForTimeout(60);
  await page.keyboard.down('d'); await page.waitForTimeout(245);
  const beforeTurn=await state();
  await page.keyboard.down('s'); await page.waitForTimeout(30);
  const afterTurn=await state();
  assert(Number(afterTurn.elapsed)>=Number(beforeTurn.elapsed),'Walking phase reset on direction change');
  await page.keyboard.up('s'); await page.keyboard.up('d');
  checks.push({check:'walk phase retained',before:beforeTurn.elapsed,after:afterTurn.elapsed});
  await page.keyboard.down('a'); await page.keyboard.press('h'); await page.waitForTimeout(35);
  const hit=await state(); const hitX=Number(hit.x);
  assert(hit.state==='hit','Hit clip not visible');
  await page.waitForTimeout(85);
  assert(Number((await state()).x)<hitX,'Hit blocked movement');
  await page.keyboard.up('a'); await page.waitForTimeout(160);
  assert((await state()).state==='idle','Hit did not return to idle');
  checks.push({check:'hit without blocking control',passed:true});
  await page.keyboard.press('Escape'); await page.waitForFunction(()=>document.querySelector('canvas').dataset.paused==='true'); const paused=await state();
  await page.keyboard.down('d'); await page.waitForTimeout(180);
  const frozen=await state(); await page.keyboard.up('d');
  assert(frozen.x===paused.x && frozen.elapsed===paused.elapsed && frozen.paused==='true','Pause advanced simulation');
  await page.keyboard.press('Escape'); await page.waitForTimeout(50);
  checks.push({check:'pause freezes position and animation',passed:true});
  await page.keyboard.press('k'); await page.waitForTimeout(850);
  const dead=await state();
  assert(dead.state==='death' && dead.frame.endsWith('/05'),'Death does not hold last frame');
  await page.keyboard.down('d'); await page.keyboard.press('h'); await page.waitForTimeout(170); await page.keyboard.up('d');
  assert((await state()).x===dead.x && (await state()).state==='death','Death priority violated');
  checks.push({check:'death priority and final frame',passed:true});
  await page.keyboard.press('r'); await page.waitForTimeout(80);
  assert((await state()).state==='idle' && (await state()).x==='310','Reset failed');
  await page.screenshot({path:'docs/evidence/stage-1/field-2x.png',fullPage:true});
  await page.getByRole('button',{name:'02 · Направления'}).click(); await page.waitForTimeout(120);
  await page.screenshot({path:'docs/evidence/stage-1/directions-2x.png',fullPage:true});
  await page.keyboard.press('h'); await page.waitForTimeout(35);
  await page.screenshot({path:'docs/evidence/stage-1/hit-2x.png',fullPage:true});
  await page.waitForTimeout(220); await page.keyboard.press('k'); await page.waitForTimeout(810);
  await page.screenshot({path:'docs/evidence/stage-1/death-2x.png',fullPage:true});
  await page.keyboard.press('r');
  await page.getByRole('button',{name:'03 · Переходы земли'}).click(); await page.waitForTimeout(100);
  await page.screenshot({path:'docs/evidence/stage-1/transitions-2x.png',fullPage:true});
  await page.getByRole('button',{name:'04 · Сложные стыки'}).click();
  await page.screenshot({path:'docs/evidence/stage-1/junctions-2x.png',fullPage:true});
  await page.getByRole('button',{name:'03 · Переходы земли'}).click();
  await page.setViewportSize({width:900,height:760});
  await page.screenshot({path:'docs/evidence/stage-1/transitions-1x.png',fullPage:true});
  await page.getByRole('button',{name:'02 · Направления'}).click();
  await page.screenshot({path:'docs/evidence/stage-1/directions-1x.png',fullPage:true});
  await page.setViewportSize({width:1360,height:1120});
  await page.getByRole('button',{name:'01 · Двор фонарщика'}).click();
  assert(errors.length===0,`Browser errors: ${errors.join(', ')}`);
  return {checks,errors,browser:await page.context().browser().version(),viewport:page.viewportSize()};
}
