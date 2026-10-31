export const DIRECTIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export type Direction = typeof DIRECTIONS[number];
export interface Vector { x: number; y: number }
export function normalizeMovement(x: number, y: number): Vector {
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}
export function directionFromVector({ x, y }: Vector, previous: Direction): Direction {
  if (x === 0 && y === 0) return previous;
  return DIRECTIONS[(Math.round(Math.atan2(x, -y) / (Math.PI / 4)) + 8) % 8];
}
