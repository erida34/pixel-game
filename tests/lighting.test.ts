import { describe, expect, it } from 'vitest';
import { LightBuffer, firelight, lanternOffset, type SceneLight } from '../src/domain/lighting';

const light = (id: string, x: number, y: number, priority = 5): SceneLight => ({ id, x, y, radius: 40, intensity: 1, color: [1, 0.6, 0.2], priority });
describe('bounded presentation lights', () => {
  it('keeps flame noise continuous, independently phased and frozen at a fixed simulation time', () => {
    const samples = Array.from({length:601}, (_, i) => firelight(i / 60, 20.26));
    const range = (get: (f: ReturnType<typeof firelight>) => number): number => Math.max(...samples.map(get)) - Math.min(...samples.map(get));
    expect(range(f => f.intensity)).toBeGreaterThan(0.3);
    expect(range(f => f.radius)).toBeGreaterThan(0.07);
    expect(range(f => f.color[1])).toBeGreaterThan(0.10);
    expect(firelight(4.25, 20.26)).toEqual(firelight(4.25, 20.26));
    expect(firelight(4.25, 20.26)).not.toEqual(firelight(4.25, -2.7));
    for (let i = 1; i < samples.length; i++) expect(Math.abs(samples[i].intensity - samples[i-1].intensity)).toBeLessThan(0.12);
    expect(firelight(9, 4, true)).toEqual(firelight(99, 8, true));
    expect(firelight(9, 4, true)).toMatchObject({intensity:1,radius:1,x:0,y:0});
  });
  it('keeps offscreen lights whose radius reaches a negative-coordinate camera', () => {
    const buffer = new LightBuffer(4);
    buffer.write([light('left', -110, -20), light('right', 570, -20), light('culled', -150, -20)], { x: -100, y: -50, width: 640, height: 360 });
    expect(buffer.selected.map(l => l.id)).toEqual(['left', 'right']);
    expect([...buffer.geometry.slice(0, 4)]).toEqual([-10, 30, 40, 1]);
  });
  it('protects the hero and lamps from saturated XP and has stable ties', () => {
    const buffer = new LightBuffer(3), view = { x: 0, y: 0, width: 640, height: 360 };
    const input = [light('xp-b', 320, 180), light('xp-a', 320, 180), light('street', 4, 4, 1), light('hero', 300, 180, 0)];
    buffer.write(input, view);
    expect(buffer.selected.map(l => l.id)).toEqual(['hero', 'street', 'xp-a']);
    buffer.write([...input].reverse(), view);
    expect(buffer.selected.map(l => l.id)).toEqual(['hero', 'street', 'xp-a']);
    buffer.write([], view);
    expect(buffer.selected).toHaveLength(0);
    expect([...buffer.geometry, ...buffer.colors].every(v => v === 0)).toBe(true);
  });
  it('tracks the anatomical right hand across eight directions', () => {
    expect(lanternOffset('s').x).toBe(-12);
    expect(lanternOffset('n').x).toBe(12);
    expect(lanternOffset('e')).toEqual({x:8, y:-14});
    expect(lanternOffset('w')).toEqual({x:-8, y:-24});
  });
});
