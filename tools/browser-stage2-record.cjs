async (page) => {
  await page.getByRole('button', { name: 'Начать забег' }).click();
  await page.waitForFunction(() => document.querySelector('canvas').dataset.phase === 'upgrade', null, { timeout: 30000 });
  await page.waitForTimeout(350);
  await page.locator('[data-upgrade="amber_lantern"]').click();
  for (const keys of [['d'],['d','s'],['s'],['s','a'],['a'],['a','w'],['w'],['w','d']]) {
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(250);
    for (const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(600); await page.keyboard.press('Escape');
  return page.locator('canvas').evaluate(el => ({ ...el.dataset }));
}
