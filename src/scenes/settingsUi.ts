import { settings } from '../systems/settingsStore';
import { gameAudio } from '../systems/gameAudio';
let previousFocus: HTMLElement | null = null;
export function closeSettings(): void {
  document.querySelector<HTMLElement>('#settings-panel')!.hidden = true;
  if (previousFocus?.isConnected) previousFocus.focus();
  else document.querySelector<HTMLElement>('#run-panel button, #game')?.focus();
}
export function openSettings(): void {
  window.dispatchEvent(new Event('settings-open'));
  previousFocus = document.activeElement as HTMLElement | null;
  const root = document.querySelector<HTMLElement>('#settings-panel')!, value = settings.value;
  root.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><span class="eyebrow">ПОСЛЕДНИЙ ФОНАРЩИК</span><h2 id="settings-title">Настройки</h2><label class="setting">Громкость <output id="volume-value">${Math.round(value.volume * 100)}%</output><input id="volume" type="range" min="0" max="100" step="5" value="${Math.round(value.volume * 100)}"></label><label class="setting checkbox"><input id="shake" type="checkbox" ${value.shake ? 'checked' : ''}> Тряска при уроне</label><label class="setting checkbox"><input id="atmosphere" type="checkbox" ${value.atmosphere ? 'checked' : ''}> Свет и туман</label><p class="muted" id="settings-save">Настройки сохраняются на этом устройстве.</p><button id="sound-test">Проверить звук</button><button id="close-settings" class="primary">Готово</button><p class="muted">Tab / стрелки — выбор · Enter — подтвердить · Esc — закрыть</p></div>`;
  root.hidden = false;
  const save = (saved: boolean): void => { root.querySelector('#settings-save')!.textContent = saved ? 'Настройки сохранены.' : 'Хранилище недоступно; настройки действуют до закрытия страницы.'; };
  root.querySelector<HTMLInputElement>('#volume')!.oninput = event => {
    const volume = Number((event.target as HTMLInputElement).value) / 100;
    root.querySelector('#volume-value')!.textContent = `${Math.round(volume * 100)}%`; save(settings.set({ volume }));
  };
  root.querySelector<HTMLInputElement>('#shake')!.onchange = event => save(settings.set({ shake: (event.target as HTMLInputElement).checked }));
  root.querySelector<HTMLInputElement>('#atmosphere')!.onchange = event => save(settings.set({ atmosphere: (event.target as HTMLInputElement).checked }));
  root.querySelector<HTMLButtonElement>('#sound-test')!.onclick = () => gameAudio.play('bell');
  root.querySelector<HTMLButtonElement>('#close-settings')!.onclick = closeSettings;
  root.querySelector<HTMLInputElement>('input')!.focus();
}
/** One application listener, independent of scene restarts. Native ranges keep left/right. */
export function dialogKeyboard(event: KeyboardEvent): void {
  const settingsPanel = document.querySelector<HTMLElement>('#settings-panel')!;
  const root = settingsPanel.hidden ? document.querySelector<HTMLElement>('#run-panel')! : settingsPanel;
  if (root.hidden) return;
  const controls = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), input'));
  const active = document.activeElement as HTMLElement;
  let index = controls.indexOf(active);
  const range = active instanceof HTMLInputElement && active.type === 'range';
  if (!settingsPanel.hidden && event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeSettings(); return; }
  if (event.code === 'Tab' || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && !range) {
    event.preventDefault(); event.stopImmediatePropagation();
    const backward = event.shiftKey || event.code === 'ArrowUp' || event.code === 'ArrowLeft';
    index = (index + (backward ? -1 : 1) + controls.length) % controls.length;
    controls[index]?.focus(); return;
  }
  if (!settingsPanel.hidden) event.stopImmediatePropagation();
  if ((event.code === 'Enter' || event.code === 'Space') && active instanceof HTMLButtonElement) {
    event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) active.click();
  }
}
