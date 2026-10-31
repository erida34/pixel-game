import type { Direction } from './direction';
import { ATMOSPHERE } from '../data/atmosphere';

/** Continuous irregular flame noise, driven only by simulation time. No combat RNG. */
export function firelight(time: number, phase: number, reducedMotion = false): { intensity: number; radius: number; x: number; y: number; color: readonly [number, number, number] } {
  if (reducedMotion) return { intensity: 1, radius: 1, x: 0, y: 0, color: ATMOSPHERE.colors.amber };
  const sample = (n: number): number => {
    const value = Math.sin(n * 127.1 + phase * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const noise = (t: number): number => {
    const i = Math.floor(t), f = t - i, blend = f * f * (3 - 2 * f);
    return sample(i) * (1 - blend) + sample(i + 1) * blend;
  };
  const flame = noise(time * 3.7) * 0.58 + noise(time * 9.1 + 17) * 0.28 + noise(time * 19.3 + 41) * 0.14;
  const config = ATMOSPHERE.fire;
  return {
    intensity: config.minIntensity + flame * config.intensityRange,
    radius: config.minRadius + flame * config.radiusRange + noise(time * 1.3 + 73) * 0.05,
    x: (noise(time * 6.7 + 89) - 0.5) * config.sway,
    y: (noise(time * 7.9 + 103) - 0.5) * config.sway,
    color: [1, 0.43 + flame * 0.28, 0.08 + flame * 0.18],
  };
}

export interface SceneLight {
  id: string; x: number; y: number; radius: number; intensity: number;
  color: readonly [number, number, number]; priority: number;
}
export interface LightView { x: number; y: number; width: number; height: number }

/** Match the right-hand lamp in the accepted eight-direction sprite recipe. */
export function lanternOffset(direction: Direction): { x: number; y: number } {
  const a = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].indexOf(direction) * Math.PI / 4;
  const vx = Math.sin(a), vy = -Math.cos(a), rx = -vy, ry = vx;
  const right = Math.abs(rx) > 0.55 ? rx : 0.55 * (vx > 0 ? 1 : -1);
  return { x: Math.round(right * 12 + vx), y: Math.round(-19 + ry * 4.8 + vy * 0.45) };
}

/** Stable priorities protect the hero / street lamps from dense XP and projectile fields.
 * Radius-aware culling includes sources outside the viewport. No simulation RNG is used. */
export class LightBuffer {
  readonly geometry: Float32Array;
  readonly colors: Float32Array;
  selected: SceneLight[] = [];
  constructor(readonly capacity: number) {
    this.geometry = new Float32Array(capacity * 4);
    this.colors = new Float32Array(capacity * 3);
  }
  write(candidates: SceneLight[], view: LightView): void {
    const distance = (p: SceneLight): number => (p.x - view.x - view.width / 2) ** 2 + (p.y - view.y - view.height / 2) ** 2;
    this.selected = candidates.filter(p => p.radius > 0 && p.intensity > 0 &&
      p.x + p.radius > view.x && p.x - p.radius < view.x + view.width &&
      p.y + p.radius > view.y && p.y - p.radius < view.y + view.height)
      .sort((a, b) => a.priority - b.priority || distance(a) - distance(b) || a.id.localeCompare(b.id))
      .slice(0, this.capacity);
    this.geometry.fill(0); this.colors.fill(0);
    this.selected.forEach((p, n) => {
      this.geometry.set([p.x - view.x, p.y - view.y, p.radius, p.intensity], n * 4);
      this.colors.set(p.color, n * 3);
    });
  }
}
