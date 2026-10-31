// Playwright CLI run-code --filename tools/browser-stage2-smoke.cjs
async (page) => {
  const errors = [], warnings = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('console', msg => { if (msg.type() === 'warning') warnings.push(msg.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const state = () => page.locator('canvas').evaluate(el => ({ ...el.dataset }));
  await page.setViewportSize({ width: 1360, height: 1120 });
  await page.goto('http://127.0.0.1:5174/?debug=1&seed=20261013');
  await page.getByRole('button', { name: 'Начать забег' }).click();
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.phase === 'running');
  for (const [keys, direction] of [[['w'],'n'],[['w','d'],'ne'],[['d'],'e'],[['d','s'],'se'],[['s'],'s'],[['s','a'],'sw'],[['a'],'w'],[['a','w'],'nw']]) {
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(170);
    assert((await state()).direction === direction, `direction ${direction}`);
    for (const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(50);
    assert((await state()).state === 'idle', 'idle after stop');
  }
  checks.push('eight directions and stop');
  await page.keyboard.press('Escape'); await page.waitForTimeout(50);
  const frozen = await state(); await page.keyboard.down('d'); await page.waitForTimeout(400); await page.keyboard.up('d');
  const after = await state();
  assert(frozen.time === after.time && frozen.x === after.x && frozen.poseTime === after.poseTime, 'pause must freeze world');
  checks.push('Esc freezes time, position and animation');
  await page.screenshot({ path: 'docs/evidence/stage-2/pause.png', fullPage: true });
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  // Native blur event exercises the handler without editing run state.
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.waitForTimeout(80);
  const blur = await state(); assert(blur.phase === 'paused', 'blur pause');
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForTimeout(200);
  assert((await state()).time === blur.time && (await state()).phase === 'paused', 'focus must not auto-resume');
  await page.keyboard.press('Escape'); checks.push('blur persists through focus');
  await page.waitForFunction(() => document.querySelector('canvas').dataset.phase === 'upgrade', null, { timeout: 45000 });
  const level = await state(); assert(Number(level.kills) >= 2 && Number(level.level) >= 2, 'real combat must produce XP');
  const ids = await page.locator('[data-upgrade]').evaluateAll(buttons => buttons.map(b => b.dataset.upgrade));
  assert(new Set(ids).size === 3, 'three distinct cards');
  await page.waitForTimeout(200); await page.screenshot({ path: 'docs/evidence/stage-2/upgrades.png', fullPage: true });
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  const choiceFrozen = await state(); assert(choiceFrozen.phase === 'upgrade' && choiceFrozen.time === level.time, 'Esc must not bypass choice');
  const beforeInventory = JSON.parse(level.inventory);
  await page.locator('[data-upgrade="amber_lantern"]').click(); await page.waitForTimeout(70);
  const selected = await state(); assert(JSON.parse(selected.inventory).amber_lantern === beforeInventory.amber_lantern + 1 && selected.phase === 'running', 'apply chosen upgrade once');
  checks.push('real kills, XP, mandatory distinct choice, one-time upgrade');
  await page.keyboard.down('d'); await page.waitForTimeout(450); await page.keyboard.up('d');
  await page.screenshot({ path: 'docs/evidence/stage-2/combat.png', fullPage: true });
  await page.getByRole('button', { name: 'Мастерская графики', exact: true }).click();
  await page.getByRole('button', { name: '02 · Направления' }).click();
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  await page.getByRole('button', { name: 'Начать забег' }).click(); await page.waitForTimeout(60);
  const fresh = await state();
  assert(fresh.level === '1' && fresh.kills === '0' && fresh.hp === '80' && Number(fresh.time) < 1, 'fresh run after workshop');
  checks.push('workshop preserved and state reset');
  await page.keyboard.press('Escape');
  assert(errors.length === 0, errors.join('; '));
  assert(warnings.length === 0, warnings.join('; '));
  return { checks, errors, warnings, levelState: level, restartState: fresh, browser: page.context().browser().version(), viewport: page.viewportSize() };
}
