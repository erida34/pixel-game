import { describe, expect, it } from 'vitest';
import { DIRECTIONS, directionFromVector, normalizeMovement } from '../src/domain/direction';
import { changePose, clipFrame } from '../src/domain/animation';
describe('movement and pose', () => {
  it('has equal axial and diagonal speed', () => {
    for (const [x, y] of [[1, 0], [0, -1], [1, 1], [-1, 1]]) expect(Math.hypot(...Object.values(normalizeMovement(x, y)))).toBeCloseTo(1);
    expect(normalizeMovement(0, 0)).toEqual({ x: 0, y: 0 });
  });
  it('maps all eight vectors and remembers facing when stopped', () => {
    [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].forEach(([x,y], i) => expect(directionFromVector({x,y}, 's')).toBe(DIRECTIONS[i]));
    for (const direction of DIRECTIONS) expect(directionFromVector({x:0,y:0}, direction)).toBe(direction);
  });
  it('preserves walking phase on a turn, resets on state change', () => {
    const turned = changePose({state:'walk', direction:'s', elapsed:0.43}, 'walk', 'nw');
    expect(turned.elapsed).toBe(0.43);
    expect(clipFrame(turned.elapsed, 10, 6, true)).toBe(4);
    expect(changePose(turned, 'idle', 'nw').elapsed).toBe(0);
    expect(clipFrame(10, 8, 6, false)).toBe(5);
  });
});
