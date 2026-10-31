import Phaser from 'phaser';
import { newSeed, panel, resetRunUi } from './runUi';
import { REVIEW_LABELS } from '../data/contentReview';
import { gameAudio } from '../systems/gameAudio';
export class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }
  create(): void {
    resetRunUi();
    gameAudio.silence();
    this.add.tileSprite(0, 0, 640, 360, 'dirt', 'dirt/variant/00').setOrigin(0);
    this.add.sprite(320, 275, 'hero_lantern_keeper', 'hero/idle/s/00').setOrigin(0.5, 0.875);
    const root = panel('<div class="dialog"><span class="eyebrow">ПЕРВЫЙ ОГОНЬ</span><h2>Десять минут до рассвета</h2><p>Двигайся, собирай искры, усиливай свет.<br>Открывай оружия и предметы в забеге.</p><button id="start-run" class="primary">Начать забег</button><button id="content-review">Мастерская боя</button><p class="muted">4 оружия · 6 предметов · 6 врагов · босс на 09:00</p></div>');
    root.querySelector<HTMLButtonElement>('#start-run')!.onclick = () => this.scene.start('run', { seed: newSeed() });
    root.querySelector<HTMLButtonElement>('#content-review')!.onclick = () => {
      const menu=panel(`<div class="dialog"><span class="eyebrow">МАСТЕРСКАЯ БОЯ · 60 СЕКУНД</span><h2>Испытай контент</h2><p class="muted">Отдельные сессии с готовой сборкой. При выборе врага оружие без урона: уклоняйся и наблюдай подготовку.</p><div class="review-grid">${Object.entries(REVIEW_LABELS).map(([id,name])=>`<button data-review="${id}">${name}</button>`).join('')}</div><button id="back-menu">Назад</button></div>`);
      menu.querySelectorAll<HTMLButtonElement>('[data-review]').forEach(b=>b.onclick=()=>this.scene.start('run',{seed:20261014,review:b.dataset.review}));
      menu.querySelector<HTMLButtonElement>('#back-menu')!.onclick=()=>this.scene.restart();
      menu.querySelector<HTMLButtonElement>('button')!.focus();
    };
    root.querySelector<HTMLButtonElement>('button')!.focus();
    if (new URLSearchParams(location.search).get('debug') === '1') {
      const button = document.createElement('button'); button.id = 'performance-review'; button.textContent = 'Нагрузочное испытание · 300 врагов';
      button.onclick = () => this.scene.start('run', { seed: 20261014, performance: true });
      root.querySelector('.dialog')!.append(button);
    }
    document.querySelector('#status')!.textContent = 'Готов к забегу · 600 секунд';
    this.game.canvas.dataset.phase = 'menu';
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, resetRunUi);
  }
}
