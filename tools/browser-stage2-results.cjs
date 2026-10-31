async (page) => {
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (['error','warning'].includes(msg.type())) errors.push(msg.text()); });
  const state = () => page.locator('canvas').evaluate(el => ({ ...el.dataset }));
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const driver = await page.context().newCDPSession(page);
  await driver.send('Emulation.setFocusEmulationEnabled', { enabled: true }); await page.bringToFront(); await driver.detach();
  const initial = await state(); const result = initial.result ? JSON.parse(initial.result) : null;
  if (result) {
    assert(['prototype_complete', 'defeat'].includes(result.outcome), 'valid outcome');
    if (result.outcome === 'prototype_complete') assert(result.elapsedSeconds === 180, 'complete timer');
    await page.getByRole('button', { name: 'Новый забег' }).click();
  } else {
    await page.getByRole('button', { name: 'Играть', exact: true }).click();
    await page.getByRole('button', { name: 'Начать забег' }).click();
  }
  await page.waitForFunction(() => document.querySelector('canvas').dataset.phase === 'running' && document.querySelector('canvas').dataset.level === '1' && Number(document.querySelector('canvas').dataset.time) < 1);
  let fresh = await state();
  assert(fresh.level === '1' && fresh.kills === '0' && fresh.xp === '0' && fresh.hp === '80' && Number(fresh.enemies) === 0 && Number(fresh.sparks) === 0 && Number(fresh.time) < 1, 'restart must reset all state');
  const counts = [];
  for (let n = 0; n < 3; n++) {
    await page.getByRole('button', { name: 'Играть', exact: true }).click();
    await page.getByRole('button', { name: 'Начать забег' }).click();
    await page.waitForFunction(() => document.querySelector('canvas').dataset.phase === 'running' && Number(document.querySelector('canvas').dataset.time) < 1);
    const s = await state(); counts.push(Number(s.objects));
    assert(s.hp === '80' && s.level === '1' && s.kills === '0' && s.offers === '[]', 'multiple restarts');
  }
  assert(counts.every(count => count === counts[0]), 'object counts grow across restart');
  checks.push('clean restart from results/menu, stable scene object count');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }); await page.bringToFront();
  const other = await page.context().newPage(); await other.goto('about:blank'); await other.bringToFront();
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  await page.waitForTimeout(300); const blurred = await state();
  assert(await page.getByRole('button', { name: 'Продолжить', exact: true }).isVisible(), 'actual tab switch must pause');
  await page.bringToFront(); await page.waitForTimeout(300); const focused = await state();
  assert(focused.phase === 'paused' && focused.time === blurred.time, 'actual focus must not resume');
  await other.close(); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }); await cdp.detach(); await page.keyboard.press('Escape');
  checks.push('actual tab blur and return remain paused');
  await page.keyboard.press('Escape');
  assert(errors.length === 0, errors.join('; '));
  return { checks, result, fresh, objectCounts: counts, blurred, focused, errors };
}
