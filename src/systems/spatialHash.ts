export class SpatialHash<T extends { x: number; y: number }> {
  private cells = new Map<string, T[]>();
  constructor(private size = 96) {}
  rebuild(items: T[]): void {
    this.cells.clear();
    for (const item of items) {
      const key = `${Math.floor(item.x / this.size)},${Math.floor(item.y / this.size)}`;
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(item); else this.cells.set(key, [item]);
    }
  }
  near(x: number, y: number, radius: number): T[] {
    const found: T[] = [];
    for (let cy = Math.floor((y - radius) / this.size); cy <= Math.floor((y + radius) / this.size); cy++)
      for (let cx = Math.floor((x - radius) / this.size); cx <= Math.floor((x + radius) / this.size); cx++)
        for (const item of this.cells.get(`${cx},${cy}`) ?? [])
          if (Math.hypot(item.x - x, item.y - y) <= radius) found.push(item);
    return found;
  }
}
