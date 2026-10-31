import { describe, expect, it } from 'vitest';
import { PROTOTYPE } from '../src/data/prototype';
import type { Enemy, RunConfig, UpgradeId } from '../src/domain/run';
import { RunSimulation } from '../src/systems/runSimulation';
import { SpatialHash } from '../src/systems/spatialHash';
import { CONTENT_IDS, emptyInventory, UPGRADE_DATA } from '../src/data/content';

const config = (): RunConfig => { const c = structuredClone(PROTOTYPE); c.spawn.first = 999; return c; };
const tick = (r: RunSimulation, seconds: number, x = 0, y = 0): void => {
  for (let n = 0; n < Math.round(seconds / r.config.step); n++) r.advance(r.config.step, { x, y });
};
const enemy = (extra: Partial<Enemy> = {}): Enemy => ({ id: 1, kind: 'root_crawler', active: true, x: 0, y: 0, hp: 1000, speed: 0, direction: 's', hitAt: -Infinity, diedAt: null, state: 'move', stateAt: 0, nextAttack: 1, aimX: 0, aimY: 1, ...extra });
const maxInventory = () => Object.fromEntries(CONTENT_IDS.map(id => [id, UPGRADE_DATA[id].max])) as ReturnType<typeof emptyInventory>;
const choose = (r: RunSimulation, preferred?: UpgradeId): void => {
  expect(r.choose(preferred && r.offers.includes(preferred) ? preferred : r.offers[0])).toBe(true);
};

describe('prototype combat and lifecycle', () => {
  it('normalizes diagonal movement and retains facing after stopping', () => {
    const axial = new RunSimulation(7, config()), diagonal = new RunSimulation(7, config());
    tick(axial, 1, 1); tick(diagonal, 1, 1, 1);
    expect(Math.hypot(diagonal.hero.x, diagonal.hero.y)).toBeCloseTo(axial.hero.x, 8);
    tick(diagonal, 0.1); expect(diagonal.hero.direction).toBe('se');
  });
  it('applies one contact hit per invulnerability window even in a crowd', () => {
    const r = new RunSimulation(1, config()); r.enemies = [enemy(), enemy({ id: 2 })];
    tick(r, 0.8); expect(r.hero.hp).toBe(72);
    tick(r, 1 / 60); expect(r.hero.hp).toBe(64);
  });
  it('a pulse hits each enemy once; a death emits one reward that can be collected once', () => {
    const r = new RunSimulation(1, config()); r.enemies = [enemy({ hp: 12, x: 30 })];
    tick(r, 1 / 60); expect(r.kills).toBe(1); expect(r.sparks).toHaveLength(1); expect(r.hero.hp).toBe(80);
    tick(r, 2); expect(r.kills).toBe(1); expect(r.xp).toBe(3); expect(r.sparks[0].active).toBe(false);
    expect(r.enemies[0].active).toBe(false);
    const other = new RunSimulation(1, config()); other.enemies = [enemy({ x: 30 })];
    tick(other, 1); expect(other.enemies[0].hp).toBe(988);
  });
  it('freezes all simulation under pause and mandatory choices; drains several levels sequentially', () => {
    const r = new RunSimulation(1, config()); tick(r, 1); r.pause();
    r.inventory = { ...maxInventory(), amber_lantern: 1, brass_lens: 0, boots: 0 };
    const snapshot = JSON.stringify([r.hero, r.elapsed, r.enemies, r.sparks]);
    r.advance(30, { x: 1, y: 1 }); expect(JSON.stringify([r.hero, r.elapsed, r.enemies, r.sparks])).toBe(snapshot);
    r.resume(); r.addXp(16); expect(r.level).toBe(3); expect(r.xp).toBe(0); expect(r.pendingLevels).toBe(2);
    const time = r.elapsed; r.pause(); r.resume(); tick(r, 1, 1);
    expect(r.elapsed).toBe(time); expect(r.phase).toBe('upgrade');
    choose(r, 'amber_lantern'); expect(r.pendingLevels).toBe(1); expect(r.phase).toBe('upgrade');
    choose(r, 'boots'); expect(r.phase).toBe('running');
    expect(r.choose('boots')).toBe(false); expect(r.inventory.boots).toBe(1);
    expect(r.stats.speed).toBeCloseTo(100.8); expect(r.stats.damage).toBeCloseTo(18 * 1.45);
  });
  it('offers distinct valid upgrades, respects caps and supplies different fallback bonuses', () => {
    const r = new RunSimulation(0, config()); r.inventory = maxInventory();
    r.addXp(6); expect(r.offers).toEqual(['heal', 'haste', 'fury']);
    expect(new Set(r.offers).size).toBe(3); expect(r.choose('amber_lantern')).toBe(false);
    r.hero.hp = 70; choose(r, 'heal'); expect(r.hero.hp).toBe(80);
    r.addXp(r.xpRequired); choose(r, 'haste'); expect(r.stats.speed).toBeGreaterThan(122);
    r.addXp(r.xpRequired); choose(r, 'fury'); expect(r.stats.damage).toBeCloseTo(36 * 1.45 * 1.4);
    r.pause(); r.advance(50, { x: 0, y: 0 }); expect(r.stats.damage).toBeCloseTo(36 * 1.45 * 1.4);
    r.resume(); tick(r, 20.1); expect(r.stats.damage).toBeCloseTo(36 * 1.45); expect(r.stats.speed).toBeCloseTo(122.4);
  });
  it('never discards XP when a bounded spark pool fills', () => {
    const c = config(); c.spawn.maxXp = 1;
    const r = new RunSimulation(1, c); r.enemies = [enemy({ hp: 1, x: 50 }), enemy({ id: 2, hp: 1, x: 60 })];
    tick(r, 1 / 60); expect(r.kills).toBe(2); expect(r.sparks).toHaveLength(1); expect(r.sparks[0].value).toBe(6);
  });
  it('distinguishes prototype completion and gives death priority on the final tick', () => {
    const c = config(); c.duration = 1 / 60;
    const alive = new RunSimulation(3, c); tick(alive, 1 / 60);
    expect(alive.result?.outcome).toBe('prototype_complete'); expect(alive.phase).toBe('ended');
    const dead = new RunSimulation(3, c); dead.hero.hp = 8; dead.enemies = [enemy()]; tick(dead, 1 / 60);
    expect(dead.result?.outcome).toBe('defeat'); expect(dead.result?.seed).toBe(3);
    const result = structuredClone(alive.result); tick(alive, 10); expect(alive.result).toEqual(result);
    alive.inventory.boots = 3; expect(alive.result?.inventory.boots).toBe(0);
  });
  it('restarts from independent state and reproduces seeded spawns, including seed zero', () => {
    const a = new RunSimulation(0), b = new RunSimulation(0); tick(a, 8); tick(b, 8);
    expect(a.enemies).toEqual(b.enemies); expect(a.enemies.length).toBeGreaterThan(0);
    a.inventory.boots = 3; a.hero.hp = 1; a.addXp(100);
    const fresh = new RunSimulation(0); expect(fresh.enemies).toEqual([]); expect(fresh.sparks).toEqual([]);
    expect(fresh.level).toBe(1); expect(fresh.hero.hp).toBe(80); expect(fresh.inventory.boots).toBe(0);
    expect(fresh.elapsed).toBe(0); expect(fresh.result).toBeNull(); expect(fresh.offers).toEqual([]);
  });
  it('caps elapsed catch-up after a stall and discards pause backlog', () => {
    const r = new RunSimulation(1, config()); r.advance(60, { x: 1, y: 0 }); expect(r.elapsed).toBeCloseTo(0.1);
    r.pause(); r.advance(60, { x: 1, y: 0 }); r.resume();
    r.advance(1 / 60, { x: 1, y: 0 }); expect(r.elapsed).toBeCloseTo(0.1 + 1 / 60);
  });
  it('spatial queries cover negative cells and exact boundaries', () => {
    const hash = new SpatialHash<{ x: number; y: number }>(10);
    const points = [{ x: -10, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 11, y: 0 }]; hash.rebuild(points);
    expect(hash.near(0, 0, 10)).toEqual(points.slice(0, 3)); hash.rebuild([]); expect(hash.near(0, 0, 10)).toEqual([]);
  });
});
