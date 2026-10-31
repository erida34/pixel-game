import { WORLD } from '../data/world';
import { neighborMask } from './tiles';
export type Material = 'grass' | 'dirt' | 'cobble';
export type DecorationKind = 'plant' | 'water' | 'lantern' | 'roots' | 'bench' | 'glass';
export interface Decoration { kind: DecorationKind; x: number; y: number; radius: number; phase: number }
export interface WorldTile { x: number; y: number; material: Material; variant: number; mask: number; decoration: Decoration | null }
export interface Chunk { x: number; y: number; tiles: WorldTile[] }
export const floorDiv = (value: number, divisor: number): number => Math.floor(value / divisor);
export const positiveMod = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor;
/** Coordinate hashing never consumes the combat RNG. */
export function coordinateHash(seed: number, x: number, y: number, salt = 0): number {
  let h = (seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca77) ^ Math.imul(salt, 0xc2b2ae3d)) >>> 0;
  h = Math.imul(h ^ h >>> 16, 0x7feb352d); h = Math.imul(h ^ h >>> 15, 0x846ca68b);
  return (h ^ h >>> 16) >>> 0;
}
export class WorldGenerator {
  // Collision queries revisit the same tiles for many enemies. Bounded per-run cache.
  private obstacleCache = new Map<string, Decoration | null>();
  constructor(readonly seed: number) {}
  private noise(x: number, y: number, scale: number, salt: number): number {
    const gx = floorDiv(x, scale), gy = floorDiv(y, scale);
    const smooth = (v: number): number => v * v * (3 - 2 * v);
    const fx = smooth(positiveMod(x, scale) / scale), fy = smooth(positiveMod(y, scale) / scale);
    const sample = (dx: number, dy: number): number => coordinateHash(this.seed, gx + dx, gy + dy, salt) / 4294967296;
    const a = sample(0, 0) * (1 - fx) + sample(1, 0) * fx, b = sample(0, 1) * (1 - fx) + sample(1, 1) * fx;
    return a * (1 - fy) + b * fy;
  }
  private raw(x: number, y: number): Material {
    const value = this.noise(x, y, WORLD.noiseScale, 1) * 0.7 + this.noise(x, y, WORLD.broadNoiseScale, 2) * 0.3;
    return value < WORLD.grassThreshold ? 'grass' : value > WORLD.cobbleThreshold ? 'cobble' : 'dirt';
  }
  material(x: number, y: number): Material {
    const value = this.raw(x, y);
    if (value === 'grass') for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (this.raw(x + dx, y + dy) === 'cobble') return 'dirt';
    }
    return value;
  }
  isCorridor(x: number, y: number): boolean {
    const distance = (v: number): number => Math.min(positiveMod(v, WORLD.corridorPeriod), WORLD.corridorPeriod - positiveMod(v, WORLD.corridorPeriod));
    return distance(x) <= WORLD.corridorHalfWidth || distance(y) <= WORLD.corridorHalfWidth;
  }
  private clearStart(x: number, y: number): boolean { return Math.hypot(x + 0.5, y + 0.5) <= WORLD.startRadius + 1; }
  private obstacleCandidate(x: number, y: number): boolean {
    return !this.clearStart(x, y) && !this.isCorridor(x, y) && coordinateHash(this.seed, x, y, 3) / 4294967296 < WORLD.obstacleChance;
  }
  obstacle(x: number, y: number): Decoration | null {
    const key = `${x},${y}`;
    if (this.obstacleCache.has(key)) return this.obstacleCache.get(key)!;
    const value = this.computeObstacle(x, y);
    if (this.obstacleCache.size >= 4096) this.obstacleCache.delete(this.obstacleCache.keys().next().value!);
    this.obstacleCache.set(key, value); return value;
  }
  private computeObstacle(x: number, y: number): Decoration | null {
    if (!this.obstacleCandidate(x, y)) return null;
    // Isolated blockers leave at least a tile-wide route between every pair.
    const priority = coordinateHash(this.seed, x, y, 4);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!(dx || dy) || !this.obstacleCandidate(x + dx, y + dy)) continue;
      const other = coordinateHash(this.seed, x + dx, y + dy, 4);
      if (other < priority || (other === priority && (dy < 0 || (dy === 0 && dx < 0)))) return null;
    }
    const kinds = ['lantern', 'roots', 'bench', 'glass'] as const;
    return { kind: kinds[coordinateHash(this.seed, x, y, 5) % kinds.length], x: (x + 0.5) * WORLD.tileSize, y: (y + 0.5) * WORLD.tileSize, radius: WORLD.obstacleRadius, phase: coordinateHash(this.seed, x, y, 6) % 4 };
  }
  decoration(x: number, y: number, material = this.material(x, y)): Decoration | null {
    const obstacle = this.obstacle(x, y); if (obstacle) return obstacle;
    if (this.clearStart(x, y) || coordinateHash(this.seed, x, y, 7) / 4294967296 >= WORLD.decorationChance) return null;
    return { kind: material === 'grass' ? 'plant' : 'water', x: (x + 0.5) * WORLD.tileSize, y: (y + 0.5) * WORLD.tileSize, radius: 0, phase: coordinateHash(this.seed, x, y, 6) % 4 };
  }
  tile(x: number, y: number, materials: (x: number, y: number) => Material = (x, y) => this.material(x, y)): WorldTile {
    const material = materials(x, y);
    return { x, y, material, variant: coordinateHash(this.seed, x, y, 8) % 3, mask: neighborMask(x, y, (nx, ny) => materials(nx, ny) === material), decoration: this.decoration(x, y, material) };
  }
  chunk(cx: number, cy: number): Chunk {
    const cache = new Map<string, Material>();
    const material = (x: number, y: number): Material => {
      const key = `${x},${y}`; let value = cache.get(key);
      if (!value) { value = this.material(x, y); cache.set(key, value); } return value;
    };
    const tiles: WorldTile[] = [];
    for (let y = 0; y < WORLD.chunkSize; y++) for (let x = 0; x < WORLD.chunkSize; x++) tiles.push(this.tile(cx * WORLD.chunkSize + x, cy * WORLD.chunkSize + y, material));
    return { x: cx, y: cy, tiles };
  }
  obstaclesNear(x: number, y: number, radius: number): Decoration[] {
    const reach = radius + WORLD.obstacleRadius, found: Decoration[] = [];
    for (let ty = floorDiv(y - reach, WORLD.tileSize); ty <= floorDiv(y + reach, WORLD.tileSize); ty++) {
      for (let tx = floorDiv(x - reach, WORLD.tileSize); tx <= floorDiv(x + reach, WORLD.tileSize); tx++) {
        const obstacle = this.obstacle(tx, ty); if (obstacle) found.push(obstacle);
      }
    }
    return found;
  }
  canOccupy(x: number, y: number, radius: number): boolean {
    return this.obstaclesNear(x, y, radius).every(o => Math.hypot(x - o.x, y - o.y) + 1e-7 >= radius + o.radius);
  }
  move(x: number, y: number, dx: number, dy: number, radius: number): { x: number; y: number } {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 2)));
    for (let n = 0; n < steps; n++) {
      const px = x, py = y; x += dx / steps; y += dy / steps;
      for (const o of this.obstaclesNear(x, y, radius)) {
        const distance = Math.hypot(x - o.x, y - o.y), min = radius + o.radius;
        if (distance < min) {
          const vx = distance > 1e-8 ? (x - o.x) / distance : (px - o.x) / (Math.hypot(px - o.x, py - o.y) || 1);
          const vy = distance > 1e-8 ? (y - o.y) / distance : (py - o.y) / (Math.hypot(px - o.x, py - o.y) || 1);
          x = o.x + vx * min; y = o.y + vy * min;
        }
      }
    }
    return { x, y };
  }
}
