import { expect, it } from 'vitest';
import { maintainPerformanceReview, performanceConfig } from '../src/data/performanceReview';
import { FULL_RUN } from '../src/data/fullRun';
import { RunSimulation } from '../src/systems/runSimulation';
import { ENEMIES } from '../src/data/content';
import { WorldGenerator } from '../src/domain/world';
it('keeps 300 live mixed AI entities while real weapons kill, without changing v1', () => {
  const r = new RunSimulation(20261014, performanceConfig());
  Object.assign(r.inventory, { amber_lantern: 5, glass_needles: 5, ember_moths: 5, root_bell: 5 });
  maintainPerformanceReview(r);
  expect(new Set(r.enemies.map(e => e.kind)).size).toBe(6);
  for (let n = 0; n < 120; n++) {
    r.advance(1 / 60, { x: 0, y: 0 }); maintainPerformanceReview(r);
    expect(r.enemies.filter(e => e.active && e.diedAt === null)).toHaveLength(300);
  }
  expect(r.kills).toBeGreaterThan(0); expect(r.combat.projectiles.length).toBeGreaterThan(0);
  expect(r.enemies.filter(e => e.active && e.diedAt === null).every(e => r.world.canOccupy(e.x, e.y, ENEMIES[e.kind].radius))).toBe(true);
  expect(FULL_RUN.duration).toBe(600); expect(FULL_RUN.hero.hp).toBe(80); expect(FULL_RUN.spawn.maxEnemies).toBe(200);
});
it('collision caching preserves deterministic blockers across eviction and negative coordinates', () => {
  const world = new WorldGenerator(20261014), fresh = new WorldGenerator(20261014);
  const before = world.chunk(-1, -1);
  for (let x = -4500; x < 0; x++) world.obstacle(x, -9);
  expect(world.chunk(-1, -1)).toEqual(before);
  for (let x = -200; x < 200; x += 9) expect(world.move(x, -160, 37, -12, 12)).toEqual(fresh.move(x, -160, 37, -12, 12));
});
