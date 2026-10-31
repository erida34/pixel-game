async (page) => {
  const infos = [];
  for (const file of ['combat-movement', 'contact-death']) {
  await page.goto(`http://127.0.0.1:5174/docs/evidence/stage-2/${file}.webm`);
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
  const video = page.locator('video');
  const info = await video.evaluate(v => ({ duration: v.duration, width: v.videoWidth, height: v.videoHeight }));
  if (info.duration < 10 || info.width !== 1360 || info.height !== 1120) throw new Error(JSON.stringify(info));
  await video.evaluate(v => { v.pause(); v.controls = false; });
  for (const [name, time] of [['early', 3], ['middle', file === 'combat-movement' ? 20 : 14], ['late', info.duration - 1]]) {
    await video.evaluate((v, t) => new Promise(resolve => { v.addEventListener('seeked', resolve, { once: true }); v.currentTime = t; }), time);
    await video.screenshot({ path: `docs/evidence/stage-2/video-${file}-${name}.png` });
  }
  infos.push({ file, ...info });
  }
  return infos;
}
