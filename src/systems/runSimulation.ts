import { directionFromVector, normalizeMovement, type Direction, type Vector } from '../domain/direction';
import type { BossState, Enemy, EnemyId, Inventory, Pickup, RunConfig, RunEvent, RunPhase, RunResult, UpgradeId, WeaponId, WeaponLevel, XpSpark } from '../domain/run';
import { PROTOTYPE, UPGRADE_DATA } from '../data/prototype';
import { SpatialHash } from './spatialHash';
import { WorldGenerator } from '../domain/world';
import { COMBAT, CONTENT_IDS, emptyInventory, ENEMIES, PASSIVES, WEAPONS } from '../data/content';
import { moveEnemy } from './enemyAi';
import { WeaponCombat } from './weaponCombat';
import { BOSS } from '../data/boss';
import { waveAt } from '../data/fullRun';
import { stepBoss } from './bossCombat';

export class RunSimulation {
  readonly world: WorldGenerator;
  phase: RunPhase = 'running';
  elapsed = 0; kills = 0; level = 1; xp = 0; pendingLevels = 0;
  hero = { x: 0, y: 0, hp: 0, direction: 's' as Direction, hitAt: -Infinity, moving: false };
  inventory: Inventory = emptyInventory();
  pickups: Pickup[] = [];
  readonly combat = new WeaponCombat();
  enemies: Enemy[] = []; sparks: XpSpark[] = []; offers: UpgradeId[] = [];
  result: RunResult | null = null;
  boss: BossState | null = null;
  bossSpawned = false;
  ordinarySpawns = 0;
  get bossDefeated(): boolean { return this.boss?.enemy.diedAt !== null && this.boss !== null; }
  hasteUntil = 0; furyUntil = 0;
  private randomState: number;
  private nextId = 1; private nextSpawn: number;
  private hash = new SpatialHash<Enemy>();
  private accumulator = 0;
  constructor(readonly seed: number, readonly config: RunConfig = PROTOTYPE) {
    this.world = new WorldGenerator(seed);
    this.randomState = seed >>> 0; this.hero.hp = config.hero.hp; this.nextSpawn = config.spawn.first;
  }
  private random(): number {
    this.randomState = (this.randomState + 0x6D2B79F5) >>> 0;
    let value = this.randomState;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
  private passive(id: keyof typeof PASSIVES): number { return PASSIVES[id].levels[this.inventory[id] - 1] ?? 0; }
  weaponStats(id: WeaponId): WeaponLevel | null {
    const base = WEAPONS[id].levels[this.inventory[id] - 1]; if (!base) return null;
    const c = this.config;
    const damage = id === 'amber_lantern' ? c.lantern.damage + (this.inventory[id] - 1) * c.lantern.damagePerLevel : base.damage;
    const radius = id === 'amber_lantern' ? c.lantern.radius + base.radius - WEAPONS.amber_lantern.levels[0].radius : base.radius;
    const interval = id === 'amber_lantern' ? Math.max(c.lantern.minInterval, c.lantern.interval - (this.inventory[id] - 1) * c.lantern.intervalPerLevel) : base.interval;
    return { ...base, damage: damage * (1 + this.passive('wick')) * (this.elapsed < this.furyUntil ? 1 + c.upgrades.fury : 1), radius: radius * (1 + this.passive('brass_lens')), interval: Math.max(COMBAT.minInterval, interval * (1 - this.passive('keepers_watch'))) };
  }
  get stats(): { speed: number; damage: number; radius: number; interval: number; armor: number; pickupRadius: number } {
    const c = this.config;
    return {
      speed: c.hero.speed * (1 + this.passive('boots') + (this.elapsed < this.hasteUntil ? c.upgrades.haste : 0)),
      ...this.weaponStats('amber_lantern')!,
      armor: this.passive('wax_seal'), pickupRadius: c.hero.pickupRadius * (1 + this.passive('firefly_jar'))
    };
  }
  get xpRequired(): number { return this.config.xp.first + (this.level - 1) * this.config.xp.perLevel; }
  pause(): void { if (this.phase === 'running') this.phase = 'paused'; this.accumulator = 0; this.hero.moving = false; }
  resume(): void { if (this.phase === 'paused') this.phase = 'running'; }
  advance(delta: number, input: Vector): RunEvent[] {
    if (this.phase !== 'running') { this.accumulator = 0; return []; }
    this.accumulator = Math.min(this.accumulator + Math.max(0, delta), this.config.maxAccumulator);
    const events: RunEvent[] = [];
    while (this.accumulator + 1e-9 >= this.config.step && this.phase === 'running') {
      this.accumulator -= this.config.step; events.push(...this.step(input));
    }
    if (this.phase !== 'running') this.accumulator = 0;
    return events;
  }
  addXp(amount: number): void {
    this.xp += amount;
    while (this.xp >= this.xpRequired) { this.xp -= this.xpRequired; this.level++; this.pendingLevels++; }
    if (this.pendingLevels && !this.result && this.phase === 'running') this.openOffers();
  }
  private openOffers(): void {
    const available = CONTENT_IDS.filter(id => this.inventory[id] < UPGRADE_DATA[id].max);
    // Fisher-Yates uses only the simulation RNG; UI and decorative effects never consume it.
    for (let n = available.length - 1; n > 0; n--) { const k = Math.floor(this.random() * (n + 1)); [available[n], available[k]] = [available[k], available[n]]; }
    this.offers = [...available, ...(['heal', 'haste', 'fury'] as const)].slice(0, 3);
    this.phase = 'upgrade'; this.hero.moving = false;
  }
  choose(id: UpgradeId): boolean {
    if (this.phase !== 'upgrade' || !this.offers.includes(id)) return false;
    if (id in this.inventory) { if (this.inventory[id as keyof Inventory] >= UPGRADE_DATA[id].max) return false; this.inventory[id as keyof Inventory]++; }
    else if (id === 'heal') this.hero.hp = Math.min(this.config.hero.hp, this.hero.hp + this.config.upgrades.heal);
    else if (id === 'haste') this.hasteUntil = this.elapsed + this.config.upgrades.buffSeconds;
    else this.furyUntil = this.elapsed + this.config.upgrades.buffSeconds;
    this.pendingLevels--; this.offers = [];
    if (this.pendingLevels) this.openOffers(); else this.phase = 'running';
    return true;
  }
  private spawn(): void {
    if (this.enemies.filter(e => e.active).length >= this.config.spawn.maxEnemies) return;
    const c = this.config;
    const kinds = Object.values(ENEMIES).filter(d => d.id !== 'greenhouse_heart' && this.elapsed + 1e-9 >= d.introducedAt);
    let kind = kinds[Math.floor(this.random() * kinds.length)].id;
    if (c.waves) {
      const entries = Object.entries(waveAt(this.elapsed, c.waves).weights) as [EnemyId, number][];
      let roll = this.random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
      for (const [id, weight] of entries) { roll -= weight; if (roll < 0) { kind = id; break; } }
    }
    let x = 0, y = 0, valid = false;
    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = this.random() * Math.PI * 2;
      x = this.hero.x + Math.cos(angle) * c.spawn.radius; y = this.hero.y + Math.sin(angle) * c.spawn.radius;
      if (this.world.canOccupy(x, y, ENEMIES[kind].radius)) { valid = true; break; }
    }
    if (!valid) return;
    this.createEnemy(kind, x, y);
    this.ordinarySpawns++;
  }
  private spawnBoss(): void {
    // Independent slot: a full ordinary pool must never suppress the one-time boss.
    for (let n = 0; n < 96; n++) {
      const angle = n * Math.PI * 2 / 24, radius = BOSS.spawnRadius + Math.floor(n / 24) * 32;
      const x = this.hero.x + Math.cos(angle) * radius, y = this.hero.y + Math.sin(angle) * radius;
      if (!this.world.canOccupy(x, y, BOSS.radius)) continue;
      this.createEnemy('greenhouse_heart', x, y); return;
    }
  }
  createEnemy(kind: EnemyId, x: number, y: number): Enemy {
    if (kind === 'greenhouse_heart' && this.bossSpawned) throw new Error('Boss already spawned');
    const c = this.config, base = kind === 'root_crawler' ? c.crawler : ENEMIES[kind];
    const enemy = this.enemies.find(e => !e.active && e !== this.boss?.enemy);
    const data: Enemy = { id: this.nextId++, kind, active: true, x, y,
      hp: kind === 'greenhouse_heart' ? BOSS.hp : base.hp + this.elapsed / 60 * c.spawn.hpPerMinute, speed: kind === 'greenhouse_heart' ? BOSS.speed : base.speed + this.elapsed / 60 * c.spawn.speedPerMinute,
      direction: 's', hitAt: -Infinity, diedAt: null, state: 'move', stateAt: this.elapsed, nextAttack: this.elapsed + 0.7, aimX: 0, aimY: 1 };
    const created = enemy ?? data;
    if (enemy) Object.assign(enemy, data); else this.enemies.push(data);
    if (kind === 'greenhouse_heart') {
      this.bossSpawned = true;
      this.boss = { enemy: created, attack: 'thorns', enraged: false, nextAttack: this.elapsed + BOSS.firstAttack, summons: [], ring: null };
    }
    return created;
  }
  private dropXp(enemy: Enemy): void {
    const free = this.sparks.find(s => !s.active);
    const data: XpSpark = { id: this.nextId++, active: true, x: enemy.x, y: enemy.y, value: enemy.kind === 'root_crawler' ? this.config.crawler.xp : ENEMIES[enemy.kind].xp, attracted: false };
    if (free) Object.assign(free, data);
    else if (this.sparks.length < this.config.spawn.maxXp) this.sparks.push(data);
    else {
      // Preserve every reward when the pool is full: merge into the nearest spark.
      let nearest = this.sparks[0];
      for (const spark of this.sparks) if (Math.hypot(spark.x - enemy.x, spark.y - enemy.y) < Math.hypot(nearest.x - enemy.x, nearest.y - enemy.y)) nearest = spark;
      nearest.value += data.value;
    }
    const roll = this.random(), kind = roll < COMBAT.magnetChance ? 'magnet' : roll < COMBAT.magnetChance + COMBAT.waxChance ? 'wax' : null;
    if (kind) {
      const p = this.pickups.find(p => !p.active), data: Pickup = { id: this.nextId++, active: true, kind, x: enemy.x, y: enemy.y };
      if (p) Object.assign(p, data); else if (this.pickups.length < COMBAT.maxPickups) this.pickups.push(data);
    }
  }
  damageEnemy(e: Enemy, damage: number, events: RunEvent[]): void {
    if (e.diedAt !== null || damage <= 0) return; e.hp -= damage; e.hitAt = this.elapsed;
    if (e.hp <= 0) { e.diedAt = this.elapsed; this.kills++; this.dropXp(e); if (e === this.boss?.enemy) { this.boss.ring = null; this.boss.summons = []; } events.push({ type: 'death', id: e.id }); }
  }
  damageHero(damage: number, events: RunEvent[]): void {
    if (this.elapsed - this.hero.hitAt + 1e-9 < this.config.hero.invulnerability) return;
    this.hero.hp = Math.max(0, this.hero.hp - Math.max(COMBAT.minDamage, damage - this.stats.armor)); this.hero.hitAt = this.elapsed; events.push({ type: 'hit' });
  }
  private finish(outcome: RunResult['outcome']): void {
    this.result = { outcome, elapsedSeconds: this.elapsed, level: this.level, kills: this.kills, seed: this.seed, inventory: { ...this.inventory }, bossDefeated: this.bossDefeated };
    this.phase = 'ended'; this.offers = []; this.hero.moving = false;
  }
  private step(input: Vector): RunEvent[] {
    const dt = this.config.step, c = this.config, h = this.hero, events: RunEvent[] = [];
    this.elapsed = c.bossAt === undefined ? Math.min(c.duration, this.elapsed + dt) : this.elapsed + dt;
    if (Math.abs(this.elapsed - c.duration) < 1e-8) this.elapsed = c.duration;
    const vector = normalizeMovement(input.x, input.y), stats = this.stats;
    const moved = this.world.move(h.x, h.y, vector.x * stats.speed * dt, vector.y * stats.speed * dt, c.hero.radius);
    h.moving = Math.hypot(moved.x - h.x, moved.y - h.y) > 1e-5;
    h.x = moved.x; h.y = moved.y; h.direction = directionFromVector(vector, h.direction);
    for (const e of this.enemies) if (e.active) {
      if (e.diedAt !== null) { if (this.elapsed - e.diedAt >= (e.kind === 'greenhouse_heart' ? BOSS.deathSeconds : c.crawler.deathSeconds)) e.active = false; continue; }
      if (e.kind === 'greenhouse_heart') continue;
      moveEnemy(e, ENEMIES[e.kind], h, this.elapsed, dt, this.world, enemy => { this.combat.shootEnemy(this, enemy); events.push({ type: 'cast', x: enemy.x, y: enemy.y, radius: 12, weapon: 'enemy' }); });
    }
    stepBoss(this, events);
    this.hash.rebuild(this.enemies.filter(e => e.active && e.diedAt === null));
    this.combat.step(this, this.hash, events);
    for (const e of this.hash.near(h.x, h.y, c.hero.radius + BOSS.radius)) if (e.diedAt === null && Math.hypot(e.x - h.x, e.y - h.y) <= c.hero.radius + ENEMIES[e.kind].radius) this.damageHero(e.kind === 'root_crawler' ? c.crawler.damage : ENEMIES[e.kind].damage, events);
    // Death takes priority over level dialogs and the prototype timer, including simultaneous hits.
    if (h.hp === 0) { this.finish('defeat'); return events; }
    for (const p of this.pickups) if (p.active && Math.hypot(p.x - h.x, p.y - h.y) <= c.hero.radius + 7) {
      p.active = false; if (p.kind === 'wax') h.hp = Math.min(c.hero.hp, h.hp + c.upgrades.heal); else for (const s of this.sparks) if (s.active) s.attracted = true;
      events.push({ type: 'pickup', x: p.x, y: p.y, radius: 10 });
    }
    let gained = 0;
    for (const s of this.sparks) if (s.active) {
      const distance = Math.hypot(s.x - h.x, s.y - h.y);
      if (distance <= stats.pickupRadius) s.attracted = true;
      if (s.attracted) {
        if (distance <= c.hero.radius + c.hero.magnetSpeed * dt) { s.active = false; gained += s.value; events.push({ type: 'pickup', x: s.x, y: s.y, radius: 7 }); }
        else { s.x += (h.x - s.x) / distance * c.hero.magnetSpeed * dt; s.y += (h.y - s.y) / distance * c.hero.magnetSpeed * dt; }
      }
    }
    if (gained) this.addXp(gained);
    if (c.bossAt !== undefined && !this.bossSpawned && this.elapsed + 1e-9 >= c.bossAt) this.spawnBoss();
    if (this.elapsed + 1e-9 >= c.duration) {
      if (c.bossAt === undefined || this.bossDefeated) this.finish(c.bossAt === undefined ? 'prototype_complete' : 'victory');
      return events;
    }
    if (this.elapsed + 1e-9 >= this.nextSpawn) {
      this.spawn(); this.nextSpawn = this.elapsed + (c.waves ? waveAt(this.elapsed, c.waves).interval : Math.max(c.spawn.minInterval, c.spawn.interval - this.elapsed * c.spawn.acceleration));
    }
    return events;
  }
}
