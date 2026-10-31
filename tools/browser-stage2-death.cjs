// Bounded real-time defeat check: intentionally decline damage/radius upgrades.
async (page) => {
  const errors = [], choices = [], deathFrames = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (['error','warning'].includes(msg.type())) errors.push(msg.text()); });
  const state = () => page.locator('canvas').evaluate(el => ({ ...el.dataset }));
  let initial = await state();
  if (initial.phase === 'menu') {
    await page.getByRole('button', { name: 'Начать забег' }).click();
    await page.waitForFunction(() => document.querySelector('canvas').dataset.phase === 'running'); initial = await state();
  }
  if (initial.phase === 'paused') await page.keyboard.press('Escape');
  if (initial.phase === 'results') { await page.getByRole('button', { name: 'Новый забег' }).click(); initial = await state(); }
  const started = Date.now(); let captured = false;
  while (Date.now() - started < 40000) {
    const s = await state();
    if (s.phase === 'results') {
      const result = JSON.parse(s.result);
      if (result.outcome !== 'defeat' || Number(s.hp) !== 0) throw new Error('Expected natural contact defeat');
      await page.waitForTimeout(200); await page.screenshot({ path: 'docs/evidence/stage-2/defeat.png', fullPage: true });
      if (errors.length) throw new Error(errors.join('; '));
      return { initial, result, choices, deathFrames, errors };
    }
    if (s.phase === 'upgrade') {
      const offers = JSON.parse(s.offers);
      const id = ['boots','haste','heal','fury','brass_lens','amber_lantern'].find(id => offers.includes(id));
      await page.locator(`[data-upgrade="${id}"]`).click(); choices.push({ id, time: Number(s.time) });
    }
    if (s.state === 'death') {
      deathFrames.push({ time: s.time, poseTime: s.poseTime, frame: s.frame });
      if (s.frame.endsWith('/05') && !captured) { await page.screenshot({ path: 'docs/evidence/stage-2/death-frame.png', fullPage: true }); captured = true; }
    }
    await page.waitForTimeout(60);
  }
  await page.keyboard.press('Escape'); await page.waitForTimeout(50);
  return { initial, final: await state(), choices, deathFrames, errors };
}
