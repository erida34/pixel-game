async (page) => {
  const errors = [], samples = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error','warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5175/?debug=1&seed=20261013');
  await page.getByRole('button', { name:'Начать забег' }).click();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.phase==='running');
  const read = () => page.locator('canvas').evaluate(el=>({...el.dataset}));
  const initial = await read(); const terrain = JSON.parse(initial.terrain).map(({frame,...t})=>t);
  const deadline = Date.now()+28000;
  await page.keyboard.down('d');
  while (Date.now()<deadline) {
    const s = await read();
    if (s.phase === 'upgrade') {
      for (const key of ['amber_lantern','boots','brass_lens','heal','fury','haste']) if (JSON.parse(s.offers).includes(key)) { await page.locator(`[data-upgrade="${key}"]`).click(); break; }
      await page.keyboard.down('d');
    }
    if (s.clear !== 'true' || s.enemiesClear !== 'true') throw new Error('actor overlaps obstacle');
    if (s.phase === 'ended') throw new Error('ended during travel');
    samples.push({time:s.time,x:s.x,y:s.y,chunks:JSON.parse(s.chunks),generated:s.generated,unloaded:s.unloaded,hp:s.hp,enemies:s.enemies});
    if (samples.length === 35 || samples.length === 95) await page.screenshot({ path:`docs/evidence/stage-3/outbound-${samples.length}.png`,fullPage:true });
    await page.waitForTimeout(200);
  }
  await page.keyboard.up('d'); await page.screenshot({path:'docs/evidence/stage-3/east-chunk.png',fullPage:true});
  await page.keyboard.press('Escape'); await page.waitForTimeout(60); const end = await read();
  if (Number(end.x)<2300 || Number(end.unloaded)===0 || Number(end.generated)<=16) throw new Error('did not cross and unload chunks');
  if (JSON.parse(end.chunks).length>16 || errors.length) throw new Error(JSON.stringify(errors));
  return {errors,terrain,samples,end:{time:end.time,x:end.x,y:end.y,hp:end.hp,chunks:JSON.parse(end.chunks),generated:end.generated,unloaded:end.unloaded},browser:page.context().browser().version()};
}
