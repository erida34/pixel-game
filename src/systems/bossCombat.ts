import { BOSS } from '../data/boss';
import { normalizeMovement } from '../domain/direction';
import type { RunEvent } from '../domain/run';
import type { RunSimulation } from './runSimulation';

export function stepBoss(r: RunSimulation, events: RunEvent[]): void {
  const b = r.boss;
  if (!b || b.enemy.diedAt !== null) return;
  const e = b.enemy, dt = r.config.step;
  b.enraged = e.hp <= BOSS.hp / 2;
  if (b.ring) {
    const radius = BOSS.ringStart + (r.elapsed - b.ring.at) * BOSS.ringSpeed;
    const distance = Math.hypot(r.hero.x - b.ring.x, r.hero.y - b.ring.y);
    if (distance >= radius - BOSS.ringWidth - r.config.hero.radius - BOSS.ringSpeed * dt && distance <= radius + BOSS.ringWidth + r.config.hero.radius) r.damageHero(BOSS.damage, events);
    if (radius >= BOSS.ringEnd) b.ring = null;
  }
  if (e.state === 'move') {
    const v = normalizeMovement(r.hero.x - e.x, r.hero.y - e.y);
    let m = r.world.move(e.x, e.y, v.x * e.speed * dt, v.y * e.speed * dt, BOSS.radius);
    if (Math.hypot(m.x - e.x, m.y - e.y) < e.speed * dt * 0.65) m = r.world.move(e.x, e.y, -v.y * e.speed * dt, v.x * e.speed * dt, BOSS.radius);
    e.x = m.x; e.y = m.y;
    if (r.elapsed + 1e-9 >= b.nextAttack) {
      e.state = 'prepare'; e.stateAt = r.elapsed;
      b.summons = [];
      if (b.attack === 'summon') for (let n = 0; n < BOSS.summonCount; n++) {
        const angle = n * Math.PI * 2 / BOSS.summonCount;
        const x = e.x + Math.cos(angle) * BOSS.summonRadius, y = e.y + Math.sin(angle) * BOSS.summonRadius;
        if (r.world.canOccupy(x, y, r.config.crawler.radius)) b.summons.push({ x, y });
      }
    }
  } else if (e.state === 'prepare') {
    const prepare = b.attack === 'thorns' ? BOSS.prepareThorns : BOSS.prepareSummon;
    if (r.elapsed - e.stateAt + 1e-9 >= prepare) {
      e.state = 'attack'; e.stateAt = r.elapsed;
      if (b.attack === 'thorns') b.ring = { x: e.x, y: e.y, at: r.elapsed };
      else {
        for (const point of b.summons) if (r.elapsed + 1e-9 < r.config.duration && r.enemies.filter(e => e.active && e.kind !== 'greenhouse_heart').length < r.config.spawn.maxEnemies) r.createEnemy('root_crawler', point.x, point.y);
        b.summons = [];
      }
    }
  } else if (e.state === 'attack' && r.elapsed - e.stateAt + 1e-9 >= BOSS.attackSeconds) {
    e.state = 'move'; e.stateAt = r.elapsed;
    b.attack = b.attack === 'thorns' ? 'summon' : 'thorns';
    b.nextAttack = r.elapsed + (b.enraged ? BOSS.enragedInterval : BOSS.interval);
  }
}
