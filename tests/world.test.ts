import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/data/world';
import { coordinateHash, floorDiv, positiveMod, WorldGenerator } from '../src/domain/world';
import { TILE_MASKS } from '../src/domain/tiles';
import { WorldChunks } from '../src/systems/worldChunks';
import { RunSimulation } from '../src/systems/runSimulation';
import { PROTOTYPE } from '../src/data/prototype';

describe('seeded world', () => {
  it('uses floor division at negative tile and chunk boundaries', () => {
    expect([-33, -32, -1, 0, 31, 32].map(v => floorDiv(v, 32))).toEqual([-2, -1, -1, 0, 0, 1]);
    expect([-33, -32, -1, 0, 31, 32].map(v => positiveMod(v, 32))).toEqual([31, 0, 31, 0, 31, 0]);
  });
  it('reproduces terrain, variants and obstacles across seeds and generation orders', () => {
    for (const seed of [0, 1, 20261013, 4294967295]) {
      const a = new WorldGenerator(seed), b = new WorldGenerator(seed);
      const chunks = [[-1, -1], [0, -1], [0, 0], [-1, 0]];
      const first = chunks.map(([x, y]) => a.chunk(x, y));
      expect([...chunks].reverse().map(([x, y]) => b.chunk(x, y)).reverse()).toEqual(first);
      for (const chunk of first) for (const tile of chunk.tiles) expect(tile).toEqual(a.tile(tile.x, tile.y));
    }
    expect(new WorldGenerator(1).chunk(0, 0)).not.toEqual(new WorldGenerator(2).chunk(0, 0));
    expect(coordinateHash(0, -1, 32)).not.toBe(coordinateHash(0, 32, -1));
  });
  it('has dirt between grass and cobble including diagonals, valid masks and all three variants', () => {
    const variants = new Map<string, Set<number>>(); const observed = new Set<number>();
    for (const seed of [0, 20261013]) {
      const world = new WorldGenerator(seed);
      for (let y = -65; y <= 65; y++) for (let x = -65; x <= 65; x++) {
        const tile = world.tile(x, y); expect(TILE_MASKS).toContain(tile.mask); observed.add(tile.mask);
        if (!variants.has(tile.material)) variants.set(tile.material, new Set()); variants.get(tile.material)!.add(tile.variant);
        if (tile.material === 'grass') for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) expect(world.material(x + dx, y + dy)).not.toBe('cobble');
      }
    }
    expect([...variants.keys()].sort()).toEqual(['cobble', 'dirt', 'grass']);
    for (const values of variants.values()) expect([...values].sort()).toEqual([0, 1, 2]);
    // The 47-mask normalization itself is exhaustively checked in tiles.test.ts;
    // smooth procedural terrain is not required to contain every possible topology.
    expect(observed.size).toBeGreaterThan(20);
  });
  it('keeps start and connected corridors clear and isolates obstacle footprints', () => {
    for (const seed of [0, 1, 20261013]) {
      const world = new WorldGenerator(seed), free = new Set<string>();
      let blockers = 0;
      for (let y = -32; y <= 32; y++) for (let x = -32; x <= 32; x++) {
        const o = world.obstacle(x, y);
        if (world.isCorridor(x, y) || Math.hypot(x + 0.5, y + 0.5) <= WORLD.startRadius) expect(o).toBeNull();
        if (o) {
          blockers++;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) expect(world.obstacle(x + dx, y + dy)).toBeNull();
        } else free.add(`${x},${y}`);
      }
      const visited = new Set(['0,0']), queue = [[0, 0]];
      for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const key = `${x + dx},${y + dy}`;
          if (free.has(key) && !visited.has(key)) { visited.add(key); queue.push([x + dx, y + dy]); }
        }
      }
      expect(visited.size).toBe(free.size); expect(blockers).toBeGreaterThan(20);
    }
  });
  it('bounds retained chunks and regenerates identical data after unloading', () => {
    const world = new WorldChunks(new WorldGenerator(20261013)); world.update(-352, -212, 736, 480);
    const original = structuredClone(world.tile(-1, -1)); const first = structuredClone([...world.chunks]);
    world.update(8000, -8000, 736, 480); expect(world.chunks.size).toBeLessThanOrEqual(16); expect(world.unloaded).toBeGreaterThan(0);
    world.update(-352, -212, 736, 480); expect(world.tile(-1, -1)).toEqual(original); expect([...world.chunks]).toEqual(first);
    expect(world.generated).toBeGreaterThan(world.chunks.size);
  });
  it('prevents tunneling, permits sliding and resolves negative-coordinate obstacles', () => {
    const world = new WorldGenerator(20261013);
    let o = null;
    for (let y = -30; y < -5 && !o; y++) for (let x = -30; x < -5 && !o; x++) o = world.obstacle(x, y);
    expect(o).not.toBeNull(); if (!o) return;
    const radius = 9, start = { x: o.x - 40, y: o.y };
    const moved = world.move(start.x, start.y, 80, 0, radius);
    expect(moved.x).toBeLessThan(o.x); expect(world.canOccupy(moved.x, moved.y, radius)).toBe(true);
    const sliding = world.move(o.x - 21, o.y, 10, 16, radius);
    expect(sliding.y).toBeGreaterThan(o.y); expect(world.canOccupy(sliding.x, sliding.y, radius)).toBe(true);
    expect(world.canOccupy(o.x, o.y, radius)).toBe(false);
  });
  it('spawns only on legal ground and keeps moving actors clear without touching world RNG', () => {
    const config = structuredClone(PROTOTYPE); config.duration = 120; config.hero.hp = 10000;
    const run = new RunSimulation(20261013, config);
    const initial = run.world.chunk(-1, 0);
    for (let n = 0; n < 3600; n++) {
      if (run.phase === 'upgrade') run.choose(run.offers[0]);
      run.advance(1 / 60, { x: Math.sin(n / 500), y: Math.cos(n / 500) });
      expect(run.world.canOccupy(run.hero.x, run.hero.y, config.hero.radius)).toBe(true);
      for (const enemy of run.enemies) if (enemy.active && enemy.diedAt === null) expect(run.world.canOccupy(enemy.x, enemy.y, config.crawler.radius)).toBe(true);
    }
    expect(run.elapsed).toBeGreaterThan(50); expect(run.world.chunk(-1, 0)).toEqual(initial);
  });
});
