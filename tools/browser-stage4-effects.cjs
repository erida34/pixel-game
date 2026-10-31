async (page) => {
 const frames=new Set(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['ranged','bell_spitter','close']){
  await page.getByRole('button',{name:'Играть',exact:true}).click();await page.getByRole('button',{name:'Мастерская боя',exact:true}).click();await page.locator(`[data-review="${id}"]`).click();
  for(let n=0;n<25;n++){await page.waitForTimeout(160);const c=await page.locator('canvas').evaluate(el=>JSON.parse(el.dataset.combat));for(const f of c.effects)frames.add(f);}
 }
 await page.setViewportSize({width:760,height:820});await page.waitForTimeout(200);await page.screenshot({path:'docs/evidence/stage-4/content-1x.png',fullPage:true});await page.setViewportSize({width:1360,height:1120});await page.keyboard.press('Escape');
 if(![...frames].some(f=>f.includes('enemy/spawn'))||![...frames].some(f=>f.includes('bell/hit'))||![...frames].some(f=>f.includes('moth/')))throw new Error(JSON.stringify([...frames]));
 return {errors,frames:[...frames]};
}
