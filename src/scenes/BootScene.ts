import Phaser from 'phaser';
import { DIRECTIONS } from '../domain/direction';
import { TILE_MASKS } from '../domain/tiles';
import type { AssetManifest } from '../domain/assets';
import { CONTENT_IDS, ENEMIES, validateContent } from '../data/content';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  preload(): void {
    this.load.json('manifest', `${import.meta.env.BASE_URL}assets/manifest.json`);
    this.load.on('loaderror', (file: Phaser.Loader.File) => this.fail(`Не загружен файл ${file.key}`));
  }
  create(): void {
    const manifest = this.cache.json.get('manifest') as AssetManifest | undefined;
    try {
      validateContent();
      if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.assets)) throw new Error('Некорректный манифест');
      const ids = new Set<string>();
      for (const asset of manifest.assets) {
        if (ids.has(asset.id)) throw new Error(`Повтор ID: ${asset.id}`);
        ids.add(asset.id);
        if (!['placeholder', 'approved'].includes(asset.status)) throw new Error(`Статус: ${asset.id}`);
        for (const path of [asset.texture, asset.atlas]) if (!/^assets\/[\w/.-]+$/.test(path) || path.includes('..')) throw new Error(`URL: ${asset.id}`);
        this.load.atlas(asset.id, `${import.meta.env.BASE_URL}${asset.texture}`, `${import.meta.env.BASE_URL}${asset.atlas}`);
      }
      for (const id of ['hero_lantern_keeper', 'root_crawler', 'grass', 'dirt', 'cobble', 'environment']) if (!ids.has(id)) throw new Error(`Нет ассета ${id}`);
      this.load.once('complete', () => {
        try {
          for (const asset of manifest.assets) {
            const texture = this.textures.get(asset.id);
            for (const clip of asset.clips ?? []) for (const frame of clip.frames) if (!texture.has(frame)) throw new Error(`${asset.id}: нет кадра ${frame}`);
            for (const frame of Object.values(asset.transitions?.maskToFrame ?? {})) if (!texture.has(frame)) throw new Error(`${asset.id}: нет маски ${frame}`);
          }
          const hero = manifest.assets.find(asset => asset.id === 'hero_lantern_keeper')!;
          for (const direction of DIRECTIONS) for (const [state, count] of [['idle', 4], ['walk', 6], ['hit', 2], ['death', 6]] as const) {
            const clip = hero.clips?.find(clip => clip.direction === direction && clip.state === state);
            if (clip?.frames.length !== count) throw new Error(`hero: ${state}/${direction}`);
          }
          for (const id of ['grass', 'cobble']) {
            const masks = manifest.assets.find(asset => asset.id === id)!.transitions?.maskToFrame;
            if (!masks || Object.keys(masks).length !== 47 || TILE_MASKS.some(mask => !masks[String(mask)])) throw new Error(`${id}: таблица масок`);
          }
          const environment = manifest.assets.find(a => a.id === 'environment')!;
          for (const state of ['plant', 'water', 'lantern']) {
            const clip = environment.clips?.find(c => c.state === state && c.direction === 'none');
            if (clip?.frames.length !== 4) throw new Error(`environment: ${state} требует четыре кадра`);
          }
          this.registry.set('manifest', manifest);
          for (const id of Object.keys(ENEMIES)) if (!ids.has(id)) throw new Error(`Нет графики ${id}`);
          for (const id of [...CONTENT_IDS, 'heal', 'haste', 'fury']) if (!this.textures.get('content_icons').has(`icons/${id}`)) throw new Error(`Нет иконки ${id}`);
          document.querySelector('#asset-status')!.textContent = manifest.assets.every(asset => asset.status === 'approved') ? 'Графика принята · ENDESGA-32' : 'Графика на проверке · placeholder';
          this.scene.start('menu');
        } catch (error) { this.fail(String(error)); }
      });
      this.load.start();
    } catch (error) { this.fail(String(error)); }
  }
  private fail(message: string): void {
    document.querySelector('#status')!.textContent = `Ошибка ассетов: ${message}`;
    console.error(message);
  }
}
