import { FULL_RUN } from './fullRun';
import { ENEMIES } from './content';
import type { EnemyId, RunConfig } from '../domain/run';
import type { RunSimulation } from '../systems/runSimulation';
export const PERFORMANCE_ENEMIES = 300;
export function performanceConfig(): RunConfig {
  const c = structuredClone(FULL_RUN);
  c.duration = 3600; delete c.bossAt; delete c.waves;
  c.hero.hp = 1000000; c.xp.first = 1000000; c.spawn.first = 99999; c.spawn.maxEnemies = PERFORMANCE_ENEMIES;
  return c;
}
/** Test fixture, separate from v1. Keep 300 live AI entities and all four real weapons. */
export function maintainPerformanceReview(r: RunSimulation): void {
  const kinds = Object.keys(ENEMIES).filter(id => id !== 'greenhouse_heart') as EnemyId[];
  let alive = r.enemies.filter(e => e.active && e.diedAt === null).length;
  for (let attempt = 0; alive < PERFORMANCE_ENEMIES && attempt < 1200; attempt++) {
    const angle = (alive + attempt) * 2.399963229728653, radius = 65 + (alive % 8) * 26;
    const x = r.hero.x + Math.cos(angle) * radius, y = r.hero.y + Math.sin(angle) * radius;
    const kind = kinds[alive % kinds.length];
    if (!r.world.canOccupy(x, y, ENEMIES[kind].radius)) continue;
    r.createEnemy(kind, x, y); alive++;
  }
}
