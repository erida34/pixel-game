/** N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128. */
export function normalizeMask(mask: number): number {
  let result = mask & 255;
  for (const [corner, sides] of [[2, 5], [8, 20], [32, 80], [128, 65]]) {
    if ((result & sides) !== sides) result &= ~corner;
  }
  return result;
}
export const TILE_MASKS = [...new Set(Array.from({ length: 256 }, (_, mask) => normalizeMask(mask)))].sort((a, b) => a - b);
export function neighborMask(x: number, y: number, matches: (x: number, y: number) => boolean): number {
  const offsets = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  return normalizeMask(offsets.reduce((mask, [dx, dy], index) => mask | (matches(x + dx, y + dy) ? 1 << index : 0), 0));
}
