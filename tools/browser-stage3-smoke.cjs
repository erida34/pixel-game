async (page) => {
  const errors = [], warnings = [], checks = [], frames = {}, directions = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  const state = () => page.locator('canvas').evaluate(el => ({ ...el.dataset }));
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  await page.goto('http://127.0.0.1:5175/?debug=1&seed=20261013');
  await page.getByRole('button', { name: 'Начать забег' }).click();
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.phase === 'running');
  const original = await state(); const originalTerrain = JSON.parse(original.terrain).map(({frame,...t}) => t);
  await page.screenshot({ path: 'docs/evidence/stage-3/start-2x.png', fullPage: true });
  for (let n = 0; n < 12; n++) {
    const s = await state();
    for (const t of JSON.parse(s.terrain)) if (t.frame) { (frames[t.decoration] ??= new Set()).add(t.frame); }
    if ([0,3,6,9].includes(n)) await page.locator('canvas').screenshot({ path: `docs/evidence/stage-3/environment-${Math.floor(n/3)}.png` });
    await page.waitForTimeout(90);
  }
  for (const kind of ['plant','water','lantern']) assert(frames[kind]?.size === 4, `${kind} four rendered frames`);
  checks.push('four real frames for plants, water and lanterns');
  for (const [keys, direction] of [[['w'],'n'],[['w','d'],'ne'],[['d'],'e'],[['d','s'],'se'],[['s'],'s'],[['s','a'],'sw'],[['a'],'w'],[['a','w'],'nw']]) {
    const before = await state(); for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(160); const s = await state(); assert(s.direction === direction, direction);
    assert(s.clear === 'true' && s.enemiesClear === 'true', 'valid actor positions');
    directions.push({direction, x:s.x, y:s.y, distance:Math.hypot(Number(s.x)-Number(before.x),Number(s.y)-Number(before.y))});
    for (const key of keys) await page.keyboard.up(key); await page.waitForTimeout(30);
  }
  checks.push('four directions and diagonals across origin with no blocked actors');
  await page.keyboard.press('Escape'); await page.waitForTimeout(70); const paused = await state();
  await page.waitForTimeout(450); const after = await state();
  assert(paused.time === after.time && paused.terrain === after.terrain && paused.poseTime === after.poseTime, 'pause freezes all environment frames');
  checks.push('pause freezes environment and creatures');
  assert(errors.length === 0 && warnings.length === 0, JSON.stringify({errors,warnings}));
  return { checks, errors, warnings, directions, frames:Object.fromEntries(Object.entries(frames).map(([k,v])=>[k,[...v]])), originalTerrain, browser:page.context().browser().version(), viewport:page.viewportSize(), state:{time:after.time,x:after.x,y:after.y,chunks:JSON.parse(after.chunks),generated:after.generated,unloaded:after.unloaded,objects:after.objects} };
}
