import Phaser from 'phaser';
import { ATMOSPHERE as A } from '../data/atmosphere';
import { firelight, lanternOffset, type SceneLight } from '../domain/lighting';
import type { RunEvent } from '../domain/run';
import type { Decoration } from '../domain/world';
import type { RunSimulation } from '../systems/runSimulation';
import { settings } from '../systems/settingsStore';
import { AtmospherePipeline } from './AtmospherePipeline';

export class RunAtmosphere {
  private pipeline: AtmospherePipeline | null = null;
  private camera: Phaser.Cameras.Scene2D.Camera;
  constructor(private scene: Phaser.Scene) { this.camera = scene.cameras.main; }
  destroy(): void {
    // CameraManager clears main before scene SHUTDOWN. Retain the camera to free our
    // custom pipeline's render target / GL program even after that happens.
    if (this.pipeline) this.camera.removePostPipeline(this.pipeline);
    this.pipeline = null;
  }
  update(run: RunSimulation, lamps: readonly Decoration[], visuals: readonly {event: RunEvent; at: number}[], reducedMotion: boolean): void {
    const camera = this.scene.cameras.main;
    if (!settings.value.atmosphere || this.scene.game.renderer.type !== Phaser.WEBGL) { this.destroy(); return; }
    if (!this.pipeline) {
      const renderer = this.scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      if (!renderer.pipelines.postPipelineClasses.has('LanternAtmosphere')) renderer.pipelines.addPostPipeline('LanternAtmosphere', AtmospherePipeline);
      camera.setPostPipeline('LanternAtmosphere');
      this.pipeline = camera.getPostPipeline(AtmospherePipeline) as AtmospherePipeline;
    }
    const pipeline = this.pipeline, t = run.elapsed, colors = A.colors;
    const candidates: SceneLight[] = [];
    const add = (id: string, x: number, y: number, radius: number, intensity: number, color: SceneLight['color'], priority: number): void => {
      candidates.push({id, x, y, radius, intensity, color, priority});
    };
    const flame = (id: string, x: number, y: number, radius: number, intensity: number, phase: number, priority: number): void => {
      const f = firelight(t, phase, reducedMotion);
      add(id, x + f.x, y + f.y, radius * f.radius, intensity * f.intensity, f.color, priority);
    };
    const offset = lanternOffset(run.hero.direction);
    flame('hero', Math.round(run.hero.x) + offset.x, Math.round(run.hero.y) + offset.y, A.hero.radius, A.hero.intensity, run.seed * 0.001, 0);
    for (const lamp of lamps) flame(`street/${lamp.x}/${lamp.y}`, lamp.x, lamp.y - 33, A.street.radius, A.street.intensity, lamp.x * 0.071 + lamp.y * 0.113, 1);
    for (const m of run.combat.orbits(run)) flame(`moth/${m.index}`, m.x, m.y, A.moth.radius, A.moth.intensity, m.index * 0.79 + 11, 2);
    for (const e of run.enemies) if (e.active && e.diedAt === null) {
      if (e.kind === 'lantern_thief') flame(`thief/${e.id}`, e.x, e.y - 18, 66, 0.72, e.id * 0.79, 2);
      if (e.kind === 'greenhouse_heart') add('boss', e.x, e.y - 33, 98, e.state === 'prepare' ? 0.9 : 0.55, colors.violet, 2);
    }
    for (const { event: e, at } of visuals) {
      const fade = Math.max(0, 1 - (t - at) / 0.3);
      if (e.type === 'pulse' || e.type === 'bell') add(`${e.type}/${at}`, e.x, e.y, e.radius * 1.18, fade * 0.55, colors.amber, 2);
    }
    for (const p of run.combat.projectiles) if (p.active) add(`projectile/${p.id}`, p.x, p.y, p.owner === 'hero' ? 28 : 34, 0.5, p.owner === 'hero' ? colors.cyan : colors.violet, 3);
    for (const p of run.pickups) if (p.active) add(`pickup/${p.id}`, p.x, p.y - 3 + Math.sin(t * 4 + p.id) * 2, 36, 0.5, p.kind === 'wax' ? colors.gold : colors.cyan, 4);
    for (const p of run.sparks) if (p.active) add(`spark/${p.id}`, p.x, p.y - 3 + Math.sin(t * 4 + p.id) * 2, A.spark.radius, A.spark.intensity, colors.gold, 5);
    pipeline.lights.write(candidates, { x: camera.scrollX, y: camera.scrollY, width: camera.width, height: camera.height });
    pipeline.time = t; pipeline.scrollX = camera.scrollX; pipeline.scrollY = camera.scrollY; pipeline.seed = run.seed; pipeline.motion = !reducedMotion;
  }
  get diagnostics(): object {
    const renderer = this.scene.game.renderer;
    return { enabled: Boolean(this.pipeline), supported: this.scene.game.renderer.type === Phaser.WEBGL,
      passes: this.scene.cameras.main.postPipelines.length,
      allocated: renderer.type === Phaser.WEBGL ? (renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.postPipelineInstances.filter(p => p instanceof AtmospherePipeline).length : 0,
      motion: this.pipeline?.motion ?? false,
      time: this.pipeline?.time ?? null, capacity: this.pipeline?.lights.capacity ?? 0,
      lights: this.pipeline?.lights.selected ?? [] };
  }
}
