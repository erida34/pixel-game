async (page) => {
  await page.setViewportSize({ width: 1360, height: 1120 });
  await page.goto('http://127.0.0.1:5175/?debug=1&seed=20261013');
  await page.getByRole('button', { name: 'Начать забег' }).click();
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.phase === 'running');
  await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.screenshot({ path: 'docs/evidence/stage-3/start-2x.png', fullPage: true });
  return page.locator('canvas').evaluate(el => ({ ...el.dataset }));
}
