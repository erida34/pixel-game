import Phaser from 'phaser';
import type { RunResult } from '../domain/run';
import { formatTime, inventoryText, newSeed, panel, resetRunUi } from './runUi';
import { gameAudio } from '../systems/gameAudio';
export class ResultsScene extends Phaser.Scene {
  constructor() { super('results'); }
  create(result: RunResult): void {
    resetRunUi();
    gameAudio.silence(); gameAudio.play(result.outcome === 'defeat' ? 'defeat' : 'victory');
    this.add.tileSprite(0, 0, 640, 360, 'dirt', 'dirt/variant/00').setOrigin(0).setAlpha(0.4);
    const heading = result.outcome === 'defeat' ? 'Огонь погас' : result.outcome === 'victory' ? 'Город увидит рассвет' : 'Испытание завершено';
    const root = panel(`<div class="dialog"><span class="eyebrow">${result.outcome === 'defeat' ? 'ПОРАЖЕНИЕ' : result.outcome === 'victory' ? 'ПОБЕДА' : 'ИСПЫТАНИЕ ПРОЙДЕНО'}</span><h2>${heading}</h2><p>${formatTime(result.elapsedSeconds)} · уровень ${result.level} · убийств ${result.kills}</p><p class="build">${inventoryText(result.inventory)}</p><p class="muted">Seed: ${result.seed}<br>${result.bossDefeated ? 'Сердце оранжереи побеждено' : result.outcome === 'prototype_complete' ? 'Мастерская боя · отдельное испытание' : 'Сердце оранжереи не побеждено'}</p><button id="restart-run" class="primary">Новый забег</button><button id="back-menu">В меню</button></div>`);
    root.querySelector<HTMLButtonElement>('#restart-run')!.onclick = () => this.scene.start('run', { seed: newSeed() });
    root.querySelector<HTMLButtonElement>('#back-menu')!.onclick = () => this.scene.start('menu');
    root.querySelector<HTMLButtonElement>('button')!.focus();
    const canvas = this.game.canvas;
    canvas.dataset.phase = 'results'; canvas.dataset.result = JSON.stringify(result);
    document.querySelector('#status')!.textContent = `${heading} · seed ${result.seed}`;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, resetRunUi);
  }
}
