import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../domain/settings';
let current: Settings;
try { current = loadSettings(localStorage); } catch { current = { ...DEFAULT_SETTINGS }; }
export const settings = {
  get value(): Readonly<Settings> { return current; },
  set(update: Partial<Pick<Settings, 'volume' | 'shake' | 'atmosphere'>>): boolean {
    current = { ...current, ...update };
    let saved = false;
    try { saved = saveSettings(localStorage, current); } catch { /* Storage may be disabled. */ }
    window.dispatchEvent(new Event('settings-changed'));
    return saved;
  }
};
