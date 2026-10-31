// A bounded 40-second segment of a real, unaccelerated run. Repeat until results.
async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) errors.push(msg.text()); });
  const state = () => page.locator('canvas').evaluate(el => ({ ...el.dataset }));
  let initial = await state();
  if (initial.phase === 'paused') { await page.keyboard.press('Escape'); initial = await state(); }
  const startWall = Date.now(), choices = [], checkpoints = [];
  let nextCheckpoint = Number(initial.time) + 10;
  while (Date.now() - startWall < 40000) {
    const s = await state();
    if (s.phase === 'results') {
      await page.waitForTimeout(250);
      await page.screenshot({ path: 'docs/evidence/stage-2/completed.png', fullPage: true });
      const result = JSON.parse(s.result);
      if (result.outcome !== 'prototype_complete' || result.elapsedSeconds !== 180) throw new Error(`Run failed: ${s.result}`);
      if (errors.length) throw new Error(errors.join('; '));
      return { initial, final: s, result, wallSeconds: (Date.now() - startWall) / 1000, choices, checkpoints, errors };
    }
    if (s.phase === 'upgrade') {
      const offers = JSON.parse(s.offers), inventory = JSON.parse(s.inventory);
      const preferred = ['amber_lantern', 'brass_lens', 'boots', 'heal', 'fury', 'haste'];
      const id = preferred.find(id => offers.includes(id));
      if (new Set(offers).size !== 3) throw new Error('Duplicate upgrade');
      const index = offers.indexOf(id);
      // Alternate keyboard and mouse selection.
      if (Number(s.level) % 2) await page.keyboard.press(String(index + 1));
      else await page.locator(`[data-upgrade="${id}"]`).click();
      choices.push({ time: Number(s.time), level: Number(s.level), id, before: inventory });
    }
    if (Number(s.time) >= nextCheckpoint) {
      checkpoints.push(s); nextCheckpoint = Number(s.time) + 10;
      await page.screenshot({ path: `docs/evidence/stage-2/run-${Math.floor(Number(s.time) / 10) * 10}.png`, fullPage: true });
      const key = ['d', 's', 'a', 'w'][Math.floor(Number(s.time) / 10) % 4];
      await page.keyboard.down(key); await page.waitForTimeout(350); await page.keyboard.up(key);
    }
    await page.waitForTimeout(150);
  }
  await page.keyboard.press('Escape'); await page.waitForTimeout(60);
  const final = await state();
  if (errors.length) throw new Error(errors.join('; '));
  return { initial, final, wallSeconds: (Date.now() - startWall) / 1000, choices, checkpoints, errors };
}
