import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings, SETTINGS_KEY } from '../src/domain/settings';
describe('persistent settings', () => {
  it('recovers malformed, unknown-version and wrong-typed data', () => {
    for (const raw of [null, '{', 'null', '[]', '7', '{"version":2,"volume":0}', '{"version":1,"volume":"0","shake":"false"}']) expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"version":1,"volume":1e999,"shake":false}')).toEqual({ ...DEFAULT_SETTINGS, shake: false });
    expect(parseSettings('{"version":1,"volume":-2,"shake":false,"junk":5}')).toEqual({ ...DEFAULT_SETTINGS, volume: 0, shake: false });
    expect(parseSettings('{"version":1,"volume":8}').volume).toBe(1);
  });
  it('round trips silence and disabled shake and tolerates denied storage', () => {
    const values = new Map<string, string>(), storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(saveSettings(storage, { version: 1, volume: 0, shake: false, atmosphere: false })).toBe(true);
    expect(values.has(SETTINGS_KEY)).toBe(true); expect(loadSettings(storage)).toEqual({ version: 1, volume: 0, shake: false, atmosphere: false });
    const denied = { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('quota'); } };
    expect(loadSettings(denied)).toEqual(DEFAULT_SETTINGS); expect(saveSettings(denied, DEFAULT_SETTINGS)).toBe(false);
  });
  it('migrates existing v1 preferences without losing sound or shake', () => {
    expect(parseSettings('{"version":1,"volume":0.2,"shake":false}')).toEqual({ version: 1, volume: 0.2, shake: false, atmosphere: true });
    expect(parseSettings('{"version":1,"atmosphere":"false"}').atmosphere).toBe(true);
  });
});
