import type { RunConfig } from '../domain/run';
export const PROTOTYPE: RunConfig = {
  duration: 180, step: 1 / 60, maxAccumulator: 0.1,
  hero: { hp: 80, speed: 90, radius: 9, invulnerability: 0.8, pickupRadius: 84, magnetSpeed: 180 },
  lantern: { damage: 12, radius: 70, interval: 1.2, damagePerLevel: 6, intervalPerLevel: 0.1, minInterval: 0.6 },
  crawler: { hp: 18, speed: 32, radius: 11, damage: 8, xp: 3, deathSeconds: 0.5 },
  spawn: { first: 0.5, interval: 1.5, minInterval: 0.36, acceleration: 0.006, radius: 400, maxEnemies: 160, maxXp: 2048, hpPerMinute: 8, speedPerMinute: 5 },
  upgrades: { lensPerLevel: 0.18, speedPerLevel: 0.12, heal: 24, buffSeconds: 20, haste: 0.3, fury: 0.4 },
  xp: { first: 6, perLevel: 4 }
};
export { UPGRADE_DATA } from './content';
