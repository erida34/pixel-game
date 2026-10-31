import { normalizeMovement, type Vector } from '../domain/direction';
export interface Position { x: number; y: number }
export function move(position: Position, input: Vector, speed: number, dt: number, bounds: { left: number; right: number; top: number; bottom: number }): Vector {
  const vector = normalizeMovement(input.x, input.y);
  position.x = Math.max(bounds.left, Math.min(bounds.right, position.x + vector.x * speed * dt));
  position.y = Math.max(bounds.top, Math.min(bounds.bottom, position.y + vector.y * speed * dt));
  return vector;
}
