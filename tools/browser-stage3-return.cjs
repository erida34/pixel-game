async (page) => {
  const errors = [], samples = []; page.on('pageerror', e=>errors.push(e.message));
  const read = ()=>page.locator('canvas').evaluate(el=>({...el.dataset}));
  await page.getByRole('button',{name:'Продолжить',exact:true}).click(); await page.keyboard.down('a');
  const deadline=Date.now()+35000;
  while (Date.now()<deadline) {
    const s=await read();
    if (s.phase==='upgrade') {
      for (const key of ['amber_lantern','boots','brass_lens','heal','fury','haste']) if (JSON.parse(s.offers).includes(key)) { await page.locator(`[data-upgrade="${key}"]`).click(); break; }
      await page.keyboard.down('a');
    }
    if (s.clear!=='true' || s.enemiesClear!=='true') throw new Error('overlap on return');
    if (s.phase==='ended' || s.phase==='results') throw new Error('died on return');
    if (Number(s.x)<=0) break;
    samples.push({time:s.time,x:s.x,y:s.y,hp:s.hp,chunks:JSON.parse(s.chunks),generated:s.generated,unloaded:s.unloaded});
    await page.waitForTimeout(90);
  }
  await page.keyboard.up('a'); await page.screenshot({path:'docs/evidence/stage-3/returned.png',fullPage:true});
  await page.keyboard.press('Escape'); await page.waitForTimeout(70); const end=await read();
  if (Math.abs(Number(end.x))>20 || Number(end.generated)<24) throw new Error('no return/regeneration');
  return {errors,samples,terrain:JSON.parse(end.terrain).map(({frame,...t})=>t),end:{time:end.time,x:end.x,y:end.y,hp:end.hp,chunks:JSON.parse(end.chunks),generated:end.generated,unloaded:end.unloaded,kills:end.kills,level:end.level}};
}
