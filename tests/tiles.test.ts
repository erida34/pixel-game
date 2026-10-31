import { expect, it } from 'vitest';
import { neighborMask, normalizeMask, TILE_MASKS } from '../src/domain/tiles';
it('normalizes all 256 masks into exactly 47 idempotent variants', () => {
  expect(TILE_MASKS).toHaveLength(47);
  for (let mask = 0; mask < 256; mask++) {
    const normalized = normalizeMask(mask);
    expect(normalizeMask(normalized)).toBe(normalized);
    for (const [corner,sides] of [[2,5],[8,20],[32,80],[128,65]]) if (normalized & corner) expect(normalized & sides).toBe(sides);
  }
});
it('drops disconnected diagonals and reads neighbors outside an arbitrary boundary', () => {
  expect(normalizeMask(170)).toBe(0);
  expect(normalizeMask(255)).toBe(255);
  expect(neighborMask(-1, 0, (x,y) => x <= 0 && y <= 1)).toBe(255);
  expect(neighborMask(0, 0, (x,y) => x <= 0 && y <= 1)).toBe(241);
});
