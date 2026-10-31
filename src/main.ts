import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { WorkshopScene, type WorkshopView } from './scenes/WorkshopScene';
import { MenuScene } from './scenes/MenuScene';
import { RunScene } from './scenes/RunScene';
import { ResultsScene } from './scenes/ResultsScene';
import { WORKSHOP } from './data/workshop';
import './style.css';
import { gameAudio } from './systems/gameAudio';
import { dialogKeyboard, openSettings, closeSettings } from './scenes/settingsUi';

const game = new Phaser.Game({
  type: Phaser.AUTO, parent:'game', width:WORKSHOP.width, height:WORKSHOP.height,
  backgroundColor:'#181425', pixelArt:true, roundPixels:true,
  render:{antialias:false,antialiasGL:false},
  scale:{mode:Phaser.Scale.NONE}, scene:[BootScene,MenuScene,RunScene,ResultsScene,WorkshopScene],
  fps:{target:60}, audio:{noAudio:true}
});
function resize(): void {
  const width=document.querySelector('#game')!.clientWidth;
  const scale=Math.max(1,Math.floor(Math.min(width/WORKSHOP.width,(window.innerHeight-260)/WORKSHOP.height)));
  game.canvas.style.width=`${WORKSHOP.width*scale}px`;
  game.canvas.style.height=`${WORKSHOP.height*scale}px`;
}
game.events.once(Phaser.Core.Events.READY,resize);
window.addEventListener('resize',resize);
// Exactly one listener per application; scene restarts do not allocate audio contexts.
const activateAudio = (event: Event): void => { if (event.isTrusted) { gameAudio.unlock(); gameAudio.applySettings(); } };
window.addEventListener('pointerdown', activateAudio, true);
window.addEventListener('keydown', activateAudio, true);
window.addEventListener('keydown', dialogKeyboard, true);
window.addEventListener('settings-changed', () => gameAudio.applySettings());
window.addEventListener('blur', () => { gameAudio.silence(); gameAudio.applySettings(); });
window.addEventListener('focus', () => gameAudio.applySettings());
document.addEventListener('visibilitychange', () => { if (document.hidden) gameAudio.silence(); gameAudio.applySettings(); });
document.querySelector<HTMLButtonElement>('#open-settings')!.onclick = openSettings;
if (new URLSearchParams(location.search).get('debug') === '1') window.setInterval(() => {
  game.canvas.dataset.audio = JSON.stringify(gameAudio.diagnostics);
}, 250);
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click',() => {
  document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed',String(item===button)));
  window.dispatchEvent(new CustomEvent<WorkshopView>('workshop-view',{detail:button.dataset.view as WorkshopView}));
  document.querySelector<HTMLElement>('#game')!.focus();
}));
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => {
  if (!game.registry.has('manifest')) return;
  closeSettings(); gameAudio.silence();
  const workshop = button.dataset.mode === 'workshop';
  for (const key of ['menu', 'run', 'results', 'workshop']) if (game.scene.isActive(key)) game.scene.stop(key);
  document.querySelector<HTMLElement>('#workshop-nav')!.hidden = !workshop;
  document.querySelector<HTMLElement>('#workshop-controls')!.hidden = !workshop;
  document.querySelector<HTMLElement>('#run-controls')!.hidden = workshop;
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  if (workshop) document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.view === 'field')));
  game.scene.start(workshop ? 'workshop' : 'menu');
}));
