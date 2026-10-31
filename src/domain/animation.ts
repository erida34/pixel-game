import type { Direction } from './direction';
export type HeroState = 'idle' | 'walk' | 'hit' | 'death';
export interface Pose { state: HeroState; direction: Direction; elapsed: number }
export function changePose(pose: Pose, state: HeroState, direction: Direction): Pose {
  if (pose.state === state && pose.direction === direction) return pose;
  return { state, direction, elapsed: pose.state === state ? pose.elapsed : 0 };
}
export function clipFrame(elapsed: number, fps: number, count: number, loop: boolean): number {
  const index = Math.floor((elapsed + 1e-9) * fps);
  return loop ? index % count : Math.min(index, count - 1);
}
