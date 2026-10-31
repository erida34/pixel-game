import { WORLD } from '../data/world';
import { floorDiv, positiveMod, type Chunk, type WorldTile, WorldGenerator } from '../domain/world';
export class WorldChunks {
  readonly chunks = new Map<string, Chunk>();
  generated = 0; unloaded = 0;
  constructor(readonly generator: WorldGenerator) {}
  update(left: number, top: number, width: number, height: number): void {
    const size = WORLD.tileSize * WORLD.chunkSize, wanted = new Set<string>();
    for (let cy = floorDiv(top, size) - 1; cy <= floorDiv(top + height, size) + 1; cy++) {
      for (let cx = floorDiv(left, size) - 1; cx <= floorDiv(left + width, size) + 1; cx++) {
        const key = `${cx},${cy}`; wanted.add(key);
        if (!this.chunks.has(key)) { this.chunks.set(key, this.generator.chunk(cx, cy)); this.generated++; }
      }
    }
    for (const key of this.chunks.keys()) if (!wanted.has(key)) { this.chunks.delete(key); this.unloaded++; }
  }
  tile(x: number, y: number): WorldTile {
    const chunk = this.chunks.get(`${floorDiv(x, WORLD.chunkSize)},${floorDiv(y, WORLD.chunkSize)}`);
    if (!chunk) throw new Error(`Unloaded world tile ${x},${y}`);
    return chunk.tiles[positiveMod(y, WORLD.chunkSize) * WORLD.chunkSize + positiveMod(x, WORLD.chunkSize)];
  }
}
