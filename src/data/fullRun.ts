import type { RunConfig, Wave } from '../domain/run';
import { PROTOTYPE } from './prototype';

export const WAVES: readonly Wave[] = [
  { at: 0, interval: 1.5, weights: { root_crawler: 1 } },
  { at: 60, interval: 1.25, weights: { root_crawler: 4, wax_walker: 1 } },
  { at: 120, interval: 1, weights: { root_crawler: 4, wax_walker: 1, moth_swarm: 2 } },
  { at: 180, interval: 0.85, weights: { root_crawler: 4, wax_walker: 1, moth_swarm: 2, thorn_runner: 1 } },
  { at: 300, interval: 0.7, weights: { root_crawler: 4, wax_walker: 1, moth_swarm: 2, thorn_runner: 2, bell_spitter: 1 } },
  { at: 420, interval: 0.6, weights: { root_crawler: 4, wax_walker: 1, moth_swarm: 2, thorn_runner: 2, bell_spitter: 1, lantern_thief: 1 } },
  { at: 540, interval: 0.55, weights: { root_crawler: 3, wax_walker: 1, moth_swarm: 2, thorn_runner: 2, bell_spitter: 1, lantern_thief: 2 } }
];
export const FULL_RUN: RunConfig = {
  ...PROTOTYPE, duration: 600, bossAt: 540, waves: WAVES,
  spawn: { ...PROTOTYPE.spawn, maxEnemies: 200, hpPerMinute: 2, speedPerMinute: 1 }
};
export function waveAt(time: number, waves: readonly Wave[] = WAVES): Wave {
  let result = waves[0];
  for (const wave of waves) if (wave.at <= time + 1e-9) result = wave;
  return result;
}
