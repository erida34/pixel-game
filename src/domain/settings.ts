export interface Settings { version: 1; volume: number; shake: boolean; atmosphere: boolean }
export const SETTINGS_KEY = 'last-lantern-keeper.settings';
export const DEFAULT_SETTINGS: Settings = { version: 1, volume: 0.45, shake: true, atmosphere: true };
export function parseSettings(raw: string | null): Settings {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1) return { ...DEFAULT_SETTINGS };
    const data = value as Record<string, unknown>;
    return { version: 1,
      volume: typeof data.volume === 'number' && Number.isFinite(data.volume) ? Math.max(0, Math.min(1, data.volume)) : DEFAULT_SETTINGS.volume,
      shake: typeof data.shake === 'boolean' ? data.shake : DEFAULT_SETTINGS.shake,
      atmosphere: typeof data.atmosphere === 'boolean' ? data.atmosphere : DEFAULT_SETTINGS.atmosphere };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
export interface SettingsStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function loadSettings(storage: SettingsStorage): Settings {
  try { return parseSettings(storage.getItem(SETTINGS_KEY)); } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(storage: SettingsStorage, settings: Settings): boolean {
  try { storage.setItem(SETTINGS_KEY, JSON.stringify(parseSettings(JSON.stringify(settings)))); return true; } catch { return false; }
}
