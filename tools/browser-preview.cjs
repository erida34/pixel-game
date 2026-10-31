async (page) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const missing=[];
  page.on('response',response=>{if(response.status()>=400)missing.push({url:response.url(),status:response.status()});});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.state==='idle');
  if(!await page.locator('#asset-status').textContent().then(text=>text.includes('Графика принята'))) throw new Error('Preview has placeholders');
  await page.locator('#game').focus();
  await page.keyboard.down('d'); await page.waitForTimeout(220); await page.keyboard.up('d');
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.direction==='e');
  for(const name of ['02 · Направления','03 · Переходы земли','04 · Сложные стыки','01 · Двор фонарщика']) await page.getByRole('button',{name}).click();
  await page.keyboard.press('k'); await page.waitForTimeout(800);
  if((await page.locator('canvas').getAttribute('data-state'))!=='death') throw new Error('Preview death');
  await page.keyboard.press('r'); await page.waitForTimeout(80);
  if((await page.locator('canvas').getAttribute('data-state'))!=='idle') throw new Error('Preview reset');
  await page.screenshot({path:'docs/evidence/stage-1/approved-preview.png',fullPage:true});
  if(errors.length || missing.length) throw new Error(JSON.stringify({errors,missing}));
  return {url:page.url(),browser:await page.context().browser().version(),errors,missing,approved:true,views:4,deathAndReset:true};
}
