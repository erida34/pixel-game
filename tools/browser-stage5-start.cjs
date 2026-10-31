async (page) => {
  await page.getByRole('button',{name:'Играть',exact:true}).click();
  await page.getByRole('button',{name:'Начать забег',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
  return await page.locator('canvas').evaluate(el=>({time:el.dataset.time,hp:el.dataset.hp}));
}
