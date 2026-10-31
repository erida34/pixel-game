import { CONTENT_IDS, UPGRADE_DATA } from '../data/content';
import type { Inventory, UpgradeId } from '../domain/run';
export function iconHtml(id: UpgradeId): string {
  const n = [...CONTENT_IDS, 'heal', 'haste', 'fury'].indexOf(id);
  return `<span aria-hidden="true" class="content-icon" style="background-image:url('${import.meta.env.BASE_URL}assets/content/content_icons/content_icons.png');background-position:${-(n % 8) * 32}px ${-Math.floor(n / 8) * 32}px"></span>`;
}
export function panel(html: string): HTMLElement {
  const element = document.querySelector<HTMLElement>('#run-panel')!;
  element.innerHTML = html; element.hidden = false;
  return element;
}
export function hidePanel(): void { document.querySelector<HTMLElement>('#run-panel')!.hidden = true; }
export function resetRunUi(): void {
  hidePanel(); document.querySelector<HTMLElement>('#hud')!.hidden = true;
  document.querySelector<HTMLElement>('#boss-hud')!.hidden = true;
}
export function inventoryText(inventory: Inventory): string {
  return (Object.keys(inventory) as (keyof Inventory)[]).filter(id => inventory[id] > 0).map(id => `${UPGRADE_DATA[id].name} ${inventory[id]}`).join(' · ');
}
export function formatTime(seconds: number): string {
  const whole = Math.floor(seconds + 1e-8);
  return `${Math.floor(whole / 60).toString().padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}
export function newSeed(): number {
  const params = new URLSearchParams(location.search);
  const requested = params.get('seed');
  return params.get('debug') === '1' && requested !== null && /^\d{1,10}$/.test(requested) && Number(requested) <= 0xffffffff
    ? Number(requested) : crypto.getRandomValues(new Uint32Array(1))[0];
}
