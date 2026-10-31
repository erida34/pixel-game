import Phaser from 'phaser';
import type { Asset, AssetManifest } from '../domain/assets';
import { changePose, clipFrame, type Pose } from '../domain/animation';
import type { Direction } from '../domain/direction';
import { WORLD } from '../data/world';
import { WorldChunks } from '../systems/worldChunks';
import { RunSimulation } from '../systems/runSimulation';
import { UPGRADE_DATA } from '../data/prototype';
import type { RunEvent } from '../domain/run';
import { COMBAT, ENEMIES } from '../data/content';
import { FULL_RUN, waveAt } from '../data/fullRun';
import { BOSS } from '../data/boss';
import { prepareReview, REVIEW_LABELS, reviewConfig, spawnReview } from '../data/contentReview';
import { formatTime, hidePanel, iconHtml, inventoryText, panel, resetRunUi } from './runUi';
import { settings } from '../systems/settingsStore';
import { gameAudio } from '../systems/gameAudio';
import { openSettings } from './settingsUi';
import { maintainPerformanceReview, performanceConfig } from '../data/performanceReview';
import { RunAtmosphere } from '../rendering/RunAtmosphere';
import type { Decoration } from '../domain/world';

export class RunScene extends Phaser.Scene {
  private run!: RunSimulation;
  private assets!: Map<string, Asset>;
  private hero!: Phaser.GameObjects.Sprite;
  private enemySprites: Phaser.GameObjects.Sprite[] = [];
  private ground: { base: Phaser.GameObjects.Image; top: Phaser.GameObjects.Image }[] = [];
  private world!: WorldChunks;
  private debug = false;
  private decorations: Phaser.GameObjects.Image[] = [];
  private effects!: Phaser.GameObjects.Graphics;
  private fxSprites: Phaser.GameObjects.Sprite[] = [];
  private review: string | null = null;
  private nextReviewSpawn = 4;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pose: Pose = { state: 'idle', direction: 's', elapsed: 0 };
  private visuals: { event: RunEvent; at: number }[] = [];
  private commands: string[] = [];
  private uiKey = ''; private deathElapsed = 0; private victoryElapsed = 0;
  private performanceReview = false;
  private terrainKey = ''; private terrainSample: object[] = []; private diagnosticAt = -Infinity;
  private uiAt = -Infinity;
  private frameSerial = 0;
  private atmosphere!: RunAtmosphere;
  private streetLamps: Decoration[] = [];
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  constructor() { super('run'); }
  create({ seed, review, performance }: { seed: number; review?: string; performance?: boolean }): void {
    this.performanceReview = Boolean(performance) && new URLSearchParams(location.search).get('debug') === '1';
    this.review = review && review in REVIEW_LABELS ? review : null;
    this.run = new RunSimulation(seed, this.performanceReview ? performanceConfig() : this.review ? reviewConfig() : FULL_RUN); this.pose = { state: 'idle', direction: 's', elapsed: 0 };
    if (this.performanceReview) {
      Object.assign(this.run.inventory, { amber_lantern: 5, glass_needles: 5, ember_moths: 5, root_bell: 5, wick: 3, brass_lens: 3, keepers_watch: 3 });
      maintainPerformanceReview(this.run);
    }
    this.terrainKey = ''; this.terrainSample = []; this.diagnosticAt = -Infinity; this.uiAt = -Infinity;
    this.frameSerial = 0;
    if (this.review) prepareReview(this.run, this.review);
    this.fxSprites = []; this.nextReviewSpawn = 4;
    this.world = new WorldChunks(this.run.world); this.decorations = [];
    this.atmosphere = new RunAtmosphere(this); this.streetLamps = [];
    this.debug = new URLSearchParams(location.search).get('debug') === '1';
    this.visuals = []; this.commands = []; this.enemySprites = []; this.ground = []; this.uiKey = ''; this.deathElapsed = 0; this.victoryElapsed = 0;
    this.assets = new Map((this.registry.get('manifest') as AssetManifest).assets.map(a => [a.id, a]));
    for (let n = 0; n < 23 * 15; n++) this.ground.push({ base: this.add.image(0, 0, 'dirt', 'dirt/variant/00').setOrigin(0).setDepth(-10000), top: this.add.image(0, 0, 'grass', 'grass/variant/00').setOrigin(0).setDepth(-9999) });
    for (let n = 0; n < 23 * 15; n++) this.decorations.push(this.add.image(0, 0, 'environment', 'environment/plant/none/00').setOrigin(0.5, 0.875).setVisible(false));
    this.hero = this.add.sprite(0, 0, 'hero_lantern_keeper', 'hero/idle/s/00').setOrigin(0.5, 0.875);
    this.effects = this.add.graphics().setDepth(100000);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    const keydown = (event: KeyboardEvent): void => {
      if (!event.repeat && ['Escape', 'Digit1', 'Digit2', 'Digit3'].includes(event.code)) this.commands.push(event.code);
    };
    const blur = (): void => { this.run.pause(); this.resetInput(); this.commands = []; this.updateUi(); };
    const visibility = (): void => { if (document.hidden) blur(); };
    const settingsOpen = (): void => { blur(); };
    this.input.keyboard!.on('keydown', keydown);
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    window.addEventListener('settings-open', settingsOpen);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard!.off('keydown', keydown); this.input.keyboard!.resetKeys();
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('settings-open', settingsOpen); gameAudio.silence();
      this.input.keyboard!.removeCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
      resetRunUi(); this.visuals = []; this.commands = [];
      this.world.chunks.clear(); this.decorations = [];
      this.atmosphere.destroy(); this.streetLamps = [];
    });
    for (const key of Object.keys(this.game.canvas.dataset)) delete this.game.canvas.dataset[key];
    document.querySelector<HTMLElement>('#hud')!.hidden = false;
    hidePanel(); document.querySelector<HTMLElement>('#game')!.focus();
    this.renderWorld(); this.updateUi();
  }
  private resetInput(): void { this.input.keyboard!.resetKeys(); }
  update(_time: number, delta: number): void {
    for (const command of this.commands.splice(0)) {
      if (command === 'Escape') {
        if (this.run.phase === 'paused') this.run.resume(); else this.run.pause();
        this.resetInput();
      } else if (this.run.phase === 'upgrade') {
        const id = this.run.offers[Number(command.slice(-1)) - 1];
        if (id) this.run.choose(id);
        this.resetInput();
      }
    }
    const before = this.run.elapsed, phase = this.run.phase, level = this.run.level;
    if (this.run.result?.outcome === 'victory') this.victoryElapsed += Math.min(delta / 1000,0.1);
    const events = this.run.advance(delta / 1000, {
      x: Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown),
      y: Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown)
    });
    for (const event of events) if ('x' in event) this.visuals.push({ event, at: this.run.elapsed });
    for (const event of events) {
      if (event.type === 'hit') gameAudio.play('hit');
      else if (event.type === 'pulse') gameAudio.play('pulse');
      else if (event.type === 'bell') gameAudio.play('bell');
      else if (event.type === 'pickup') gameAudio.play('pickup');
      else if (event.type === 'cast' && event.weapon === 'glass_needles') gameAudio.play('needle');
    }
    if (phase === 'running' && this.run.phase !== 'running') gameAudio.silence();
    if (this.run.level > level) gameAudio.play('upgrade');
    gameAudio.setPlaying(this.run.phase === 'running');
    if (this.performanceReview && this.run.phase === 'running') maintainPerformanceReview(this.run);
    if (this.review && this.run.phase === 'running' && this.run.elapsed >= this.nextReviewSpawn) {
      this.nextReviewSpawn = this.run.elapsed + 4;
      if (this.run.enemies.filter(e => e.active && e.diedAt === null).length < 12) spawnReview(this.run, this.review);
    }
    if (phase === 'running' && this.run.phase !== 'running') this.resetInput();
    if (this.run.result?.outcome === 'defeat') {
      this.deathElapsed += Math.min(delta / 1000, 0.1);
      this.pose = { state: 'death', direction: this.run.hero.direction, elapsed: this.deathElapsed };
    } else {
      const state = this.run.elapsed - this.run.hero.hitAt < 2 / 12 ? 'hit' : this.run.hero.moving ? 'walk' : 'idle';
      if (this.run.elapsed > before) this.pose = changePose(this.pose, state, this.run.hero.direction);
      this.pose.elapsed += this.run.elapsed - before;
    }
    this.renderWorld(); this.updateUi();
    if (this.run.result && (this.run.result.outcome === 'defeat' ? this.deathElapsed >= 0.85 : this.run.result.outcome === 'victory' ? this.run.elapsed - this.run.boss!.enemy.diedAt! + this.victoryElapsed >= BOSS.deathSeconds : true)) this.scene.start('results', this.run.result);
  }
  private drawClip(sprite: Phaser.GameObjects.Sprite, assetId: string, state: string, direction: Direction, elapsed: number): void {
    const asset = this.assets.get(assetId)!;
    const clip = asset.clips!.find(c => c.state === state && c.direction === (['moth_swarm','greenhouse_heart'].includes(assetId) ? 'none' : direction))!;
    const frame = clip.frames[clipFrame(elapsed, clip.fps, clip.frames.length, clip.repeat === -1)];
    if (sprite.frame.name !== frame) sprite.setFrame(frame);
  }
  private renderWorld(): void {
    const r = this.run, h = r.hero;
    const camera = this.cameras.main;
    const shakeAge = r.elapsed - h.hitAt;
    const shake = settings.value.shake && !this.reducedMotion.matches && shakeAge < 0.18 ? 2 * (1 - shakeAge / 0.18) : 0;
    camera.setScroll(Math.round(h.x - 320 + (shake > 0 ? Math.sin(shakeAge * 190) * shake : 0)), Math.round(h.y - 180 + (shake > 0 ? Math.cos(shakeAge * 170) * shake : 0))); camera.roundPixels = true;
    const left = Math.floor(camera.scrollX / 32) - 1, top = Math.floor(camera.scrollY / 32) - 1;
    const terrainKey = `${left},${top}`, changed = terrainKey !== this.terrainKey;
    if (changed) {
      this.world.update(left * 32, top * 32, 23 * 32, 15 * 32); this.terrainKey = terrainKey;
      // Include off-screen lamps whose light reaches the viewport. Chunk halo is > light radius.
      this.streetLamps = [];
      for (const chunk of this.world.chunks.values()) for (const tile of chunk.tiles) {
        const d = tile.decoration;
        if (d?.kind === 'lantern') this.streetLamps.push(d);
      }
    }
    const sample: { x: number; y: number; material: string; mask: number; variant: number; decoration: string | null; frame: string | null }[] = [];
    for (let n = 0; n < this.ground.length; n++) {
      const x = left + n % 23, y = top + Math.floor(n / 23), tile = this.ground[n];
      const data = this.world.tile(x, y), { variant, material: type, mask, decoration } = data;
      if (changed) tile.base.setPosition(x * 32, y * 32).setFrame(`dirt/variant/0${variant}`);
      if (changed) tile.top.setVisible(type !== 'dirt');
      if (changed && type !== 'dirt') {
        const frame = mask === 255 ? `${type}/variant/0${variant}` : this.assets.get(type)!.transitions!.maskToFrame[String(mask)];
        tile.top.setPosition(x * 32, y * 32).setTexture(type, frame);
      }
      const sprite = this.decorations[n]; if (changed) sprite.setVisible(Boolean(decoration));
      let frame: string | null = null;
      if (decoration) {
        const animated = ['plant', 'water', 'lantern'].includes(decoration.kind);
        const index = animated ? (Math.floor(r.elapsed * WORLD.environmentFps) + decoration.phase) % WORLD.environmentFrames : 0;
        frame = `environment/${decoration.kind}/none/0${index}`;
        if (changed) sprite.setPosition(decoration.x, decoration.y).setDepth(decoration.kind === 'water' ? -9998 : decoration.y);
        if (sprite.frame.name !== frame) sprite.setFrame(frame);
      }
      if (this.debug && changed) sample.push({ x, y, material: type, mask, variant, decoration: decoration?.kind ?? null, frame });
    }
    if (changed) this.terrainSample = sample;
    this.hero.setPosition(Math.round(h.x), Math.round(h.y));
    if (this.hero.depth !== Math.round(h.y)) this.hero.setDepth(Math.round(h.y));
    this.drawClip(this.hero, 'hero_lantern_keeper', this.pose.state, this.pose.direction, this.pose.elapsed);
    const enemies = r.enemies.filter(e => e.active && Math.abs(e.x - h.x) < 380 && Math.abs(e.y - h.y) < 245);
    for (let n = 0; n < Math.max(enemies.length, this.enemySprites.length); n++) {
      let sprite = this.enemySprites[n]; const enemy = enemies[n];
      if (!enemy) { sprite.setVisible(false); continue; }
      if (!sprite) { sprite = this.add.sprite(0, 0, 'root_crawler', this.assets.get('root_crawler')!.clips![0].frames[0]).setOrigin(0.5, 0.875); this.enemySprites.push(sprite); }
      sprite.setVisible(true).setPosition(Math.round(enemy.x), Math.round(enemy.y));
      if (sprite.depth !== Math.round(enemy.y)) sprite.setDepth(Math.round(enemy.y));
      const direction: Direction = ['n','e','s','w'].includes(enemy.direction) ? enemy.direction : enemy.direction.includes('n') ? 'n' : 's';
      const state = enemy.diedAt !== null ? 'death' : enemy.state === 'prepare' || enemy.state === 'attack' ? (enemy.kind === 'greenhouse_heart' ? `${enemy.state}_${r.boss!.attack}` : enemy.state) : r.elapsed - enemy.hitAt < 2 / 12 ? 'hit' : 'move';
      if (sprite.texture.key !== enemy.kind) sprite.setTexture(enemy.kind);
      this.drawClip(sprite, enemy.kind, state, direction, r.elapsed - (enemy.diedAt ?? (state === 'hit' ? enemy.hitAt : state === 'move' ? 0 : enemy.stateAt)) + (enemy.kind === 'greenhouse_heart' && r.result?.outcome === 'victory' ? this.victoryElapsed : 0));
    }
    const gfx = this.effects; gfx.clear();
    const boss = r.boss;
    if (boss && boss.enemy.diedAt === null) {
      const e = boss.enemy;
      if (e.state === 'prepare' && boss.attack === 'thorns') {
        const progress = Math.min(1, (r.elapsed-e.stateAt)/BOSS.prepareThorns);
        gfx.lineStyle(2,0xb55088,1).strokeCircle(e.x,e.y,BOSS.ringEnd);
        gfx.lineStyle(2,0xf6757a,1).strokeCircle(e.x,e.y,BOSS.ringStart+progress*(BOSS.ringEnd-BOSS.ringStart));
        for (let n=0;n<12;n++) { const a=n*Math.PI/6; gfx.lineBetween(e.x+Math.cos(a)*(BOSS.ringEnd-8),e.y+Math.sin(a)*(BOSS.ringEnd-8),e.x+Math.cos(a)*(BOSS.ringEnd+8),e.y+Math.sin(a)*(BOSS.ringEnd+8)); }
      }
      for (const p of boss.summons) { gfx.lineStyle(2,0xb55088,1).strokeCircle(p.x,p.y,16); gfx.lineBetween(p.x-7,p.y-7,p.x+7,p.y+7).lineBetween(p.x-7,p.y+7,p.x+7,p.y-7); }
      if (boss.ring) {
        const radius = Math.min(BOSS.ringEnd,BOSS.ringStart+(r.elapsed-boss.ring.at)*BOSS.ringSpeed);
        gfx.lineStyle(BOSS.ringWidth*2,0xb55088,0.65).strokeCircle(boss.ring.x,boss.ring.y,radius);
        for (let n=0;n<24;n++) { const a=n*Math.PI/12; const x=boss.ring.x+Math.cos(a)*radius,y=boss.ring.y+Math.sin(a)*radius; gfx.fillStyle(0xf6757a,1).fillTriangle(x-3,y+4,x,y-5,x+3,y+4); }
      }
    }
    for (const e of enemies) if (e.kind !== 'greenhouse_heart' && e.diedAt === null && e.state === 'prepare') {
      const def = ENEMIES[e.kind], progress = (r.elapsed - e.stateAt) / def.prepare;
      gfx.lineStyle(1,0xb55088,1).strokeCircle(e.x,e.y,16+progress*5);
      gfx.lineStyle(def.strategy==='ranged'?2:4,0xb55088,0.7).lineBetween(e.x,e.y,e.x+e.aimX*(def.strategy==='ranged'?110:80),e.y+e.aimY*(def.strategy==='ranged'?110:80));
      gfx.fillStyle(0xead4aa,1).fillRect(e.x-2,e.y-28,4,8);
    }
    for (const s of r.combat.strikes) {
      const progress=1-(s.at-r.elapsed)/COMBAT.bellDelay;
      gfx.lineStyle(2,0xfeae34,1).strokeCircle(s.x,s.y,s.radius);
      gfx.lineStyle(1,0xfeae34,0.8).strokeCircle(s.x,s.y,s.radius*progress);
      gfx.lineBetween(s.x-5,s.y,s.x+5,s.y).lineBetween(s.x,s.y-5,s.x,s.y+5);
    }
    const fx: {x:number;y:number;frame:string;depth:number}[]=[];
    const visible = (p: {x:number;y:number}): boolean => Math.abs(p.x-h.x)<350 && Math.abs(p.y-h.y)<215;
    for (const p of r.combat.projectiles) if (p.active && visible(p)) fx.push({x:p.x,y:p.y,frame:`fx/${p.owner==='hero'?'needle':'enemy'}/move/0${Math.floor((r.elapsed-p.bornAt)*12)%4}`,depth:p.y+1});
    for (const m of r.combat.orbits(r)) fx.push({x:m.x,y:m.y,frame:`fx/moth/move/0${(Math.floor(r.elapsed*12)+m.index)%4}`,depth:m.y+1});
    for (const p of r.pickups) if(p.active && visible(p)) fx.push({x:p.x,y:p.y-3+Math.sin(r.elapsed*4+p.id)*2,frame:`fx/${p.kind}/move/0${Math.floor(r.elapsed*6)%4}`,depth:p.y});
    for (const spark of r.sparks) if (spark.active && Math.abs(spark.x - h.x) < 330 && Math.abs(spark.y - h.y) < 200) {
      const x = Math.round(spark.x), y = Math.round(spark.y - 3 + Math.sin(r.elapsed * 4 + spark.id) * 2);
      gfx.fillStyle(0xfee761, 1).fillPoints([{ x, y: y - 3 }, { x: x + 2, y }, { x, y: y + 3 }, { x: x - 2, y }], true);
    }
    this.visuals = this.visuals.filter(v => r.elapsed - v.at < 0.3).slice(-64);
    for (const { event, at } of this.visuals) {
      const progress = (r.elapsed - at) / 0.3;
      if (event.type === 'pulse') gfx.lineStyle(2, 0xfeae34, 1 - progress).strokeCircle(Math.round(event.x), Math.round(event.y), event.radius * (0.75 + progress * 0.25));
      if (event.type === 'pickup') gfx.lineStyle(1, 0xfee761, 1 - progress).strokeCircle(event.x, event.y, 3 + progress * 7);
      if (event.type === 'bell') { gfx.lineStyle(3,0xfeae34,1-progress).strokeCircle(event.x,event.y,event.radius*(1-progress*0.3)); fx.push({x:event.x,y:event.y,frame:`fx/bell/hit/0${Math.min(2,Math.floor(progress*3))}`,depth:event.y+10}); }
      if (event.type === 'impact' || event.type === 'cast') {
        const kind=event.weapon==='enemy'?'enemy':event.weapon==='ember_moths'?'moth':event.weapon==='root_bell'?'bell':'needle';
        if (fx.length < 64 && visible(event)) fx.push({x:event.x,y:event.y,frame:`fx/${kind}/${event.type==='cast'?'spawn':'hit'}/0${Math.min(2,Math.floor(progress*3))}`,depth:event.y+10});
      }
    }
    for (let n=0;n<Math.max(fx.length,this.fxSprites.length);n++) {
      const f=fx[n];let sprite=this.fxSprites[n];if(!f){sprite.setVisible(false);continue;}
      if(!sprite){sprite=this.add.sprite(0,0,'content_fx',f.frame);this.fxSprites.push(sprite);}
      sprite.setVisible(visible(f)).setPosition(Math.round(f.x),Math.round(f.y));
      if (sprite.frame.name !== f.frame) sprite.setFrame(f.frame);
      if (sprite.depth !== Math.round(f.depth)) sprite.setDepth(Math.round(f.depth));
    }
    this.atmosphere.update(r, this.streetLamps, this.visuals, this.reducedMotion.matches);
    const canvas = this.game.canvas;
    // Expensive read-only diagnostics are sampled, never serialized at display rate.
    Object.assign(canvas.dataset, { phase: r.phase, time: String(r.elapsed), hp: String(h.hp), shake: String(shake) });
    if (this.debug) canvas.dataset.frameSerial = String(++this.frameSerial);
    if (performance.now() - this.diagnosticAt < 250) return;
    this.diagnosticAt = performance.now();
    if (this.debug) canvas.dataset.atmosphere = JSON.stringify(this.atmosphere.diagnostics);
    Object.assign(canvas.dataset, { performance: String(this.performanceReview), alive: String(r.enemies.filter(e=>e.active && e.diedAt===null).length), audio: JSON.stringify(gameAudio.diagnostics), shake: String(shake), keyboardListeners: String(this.input.keyboard!.listenerCount('keydown')), viewport: JSON.stringify({width:canvas.clientWidth,height:canvas.clientHeight}) });
    if (this.debug) Object.assign(canvas.dataset, { review: this.review ?? '', combat: JSON.stringify({ enemies: enemies.map(e=>({id:e.id,kind:e.kind,state:e.state,stateAt:e.stateAt,x:e.x,y:e.y,aimX:e.aimX,aimY:e.aimY,hp:e.hp,diedAt:e.diedAt})), projectiles:r.combat.projectiles.filter(p=>p.active).map(({hitIds,...p})=>({...p,hitIds:[...hitIds]})),strikes:r.combat.strikes,orbits:r.combat.orbits(r),pickups:r.pickups.filter(p=>p.active),sparks:r.sparks.filter(p=>p.active).map(({x,y,value})=>({x,y,value})),frames:this.enemySprites.filter(s=>s.visible).map(s=>String(s.frame.name)),effects:this.fxSprites.filter(s=>s.visible).map(s=>String(s.frame.name)) }) });
    if (this.debug) Object.assign(canvas.dataset, { boss: JSON.stringify(r.boss), bossSpawned: String(r.bossSpawned), bossDefeated: String(r.bossDefeated), ordinarySpawns: String(r.ordinarySpawns), wave: String(r.config.waves ? waveAt(r.elapsed,r.config.waves).at : -1) });
    Object.assign(canvas.dataset, { phase: r.phase, time: String(r.elapsed), hp: String(h.hp), level: String(r.level), xp: String(r.xp), kills: String(r.kills), seed: String(r.seed), x: String(h.x), y: String(h.y), state: this.pose.state, direction: h.direction, frame: String(this.hero.frame.name), poseTime: String(this.pose.elapsed), enemies: String(r.enemies.filter(e => e.active).length), sparks: String(r.sparks.filter(s => s.active).length), sprites: String(this.enemySprites.length), objects: String(this.children.length), inventory: JSON.stringify(r.inventory), stats: JSON.stringify(r.stats), offers: JSON.stringify(r.offers) });
    if (this.debug) Object.assign(canvas.dataset, { chunks: JSON.stringify([...this.world.chunks.keys()]), generated: String(this.world.generated), unloaded: String(this.world.unloaded), terrain: JSON.stringify(this.terrainSample), clear: String(r.world.canOccupy(h.x, h.y, r.config.hero.radius)), enemiesClear: String(r.enemies.filter(e => e.active && e.diedAt === null).every(e => r.world.canOccupy(e.x, e.y, ENEMIES[e.kind].radius))) });
  }
  private updateUi(): void {
    const r = this.run;
    this.game.canvas.dataset.phase = r.phase;
    const key = `${r.phase}/${r.pendingLevels}/${r.offers.join(',')}`;
    if (key === this.uiKey && performance.now() - this.uiAt < 100) return;
    this.uiAt = performance.now();
    document.querySelector('#health')!.textContent = `${r.hero.hp} / ${r.config.hero.hp}`;
    document.querySelector<HTMLProgressElement>('#health-bar')!.value = r.hero.hp / r.config.hero.hp;
    document.querySelector('#run-time')!.textContent = `${formatTime(r.elapsed)} / ${formatTime(r.config.duration)}${this.performanceReview ? ' · НАГРУЗКА 300' : this.review ? ' · ' + REVIEW_LABELS[this.review] : ''}`;
    document.querySelector('#level')!.textContent = `Ур. ${r.level} · ${r.xp} / ${r.xpRequired} XP`;
    document.querySelector<HTMLProgressElement>('#xp-bar')!.value = r.xp / r.xpRequired;
    const bossHud = document.querySelector<HTMLElement>('#boss-hud')!;
    bossHud.hidden = !r.boss;
    if (r.boss) {
      const defeated = r.bossDefeated;
      document.querySelector('#boss-name')!.textContent = `Сердце оранжереи · ${defeated ? 'побеждено' : r.boss.enraged ? 'ярость' : 'живое ядро'}${!defeated && r.elapsed >= r.config.duration ? ' · победи босса' : ''}`;
      document.querySelector<HTMLProgressElement>('#boss-bar')!.value = Math.max(0,r.boss.enemy.hp)/BOSS.hp;
    }
    const inventory = document.querySelector<HTMLElement>('#inventory')!, text = inventoryText(r.inventory);
    if (inventory.dataset.build !== text) {
      inventory.dataset.build = text;
      inventory.innerHTML = (Object.keys(r.inventory) as (keyof typeof r.inventory)[]).filter(id=>r.inventory[id]>0).map(id=>`<span class="inventory-item" title="${UPGRADE_DATA[id].name}">${iconHtml(id)}<span>${r.inventory[id]}</span></span>`).join('');
    }
    document.querySelector('#status')!.textContent = `Убийств: ${r.kills} · seed ${r.seed} · ${r.phase === 'paused' ? 'Пауза' : r.phase === 'upgrade' ? 'Выбери улучшение' : 'Фонарь атакует автоматически'}`;
    if (key === this.uiKey) return;
    this.uiKey = key;
    if (r.phase === 'paused') {
      const root = panel('<div class="dialog"><span class="eyebrow">МИР ЗАМЕР</span><h2>Пауза</h2><p>Esc — продолжить</p><button id="resume-run" class="primary">Продолжить</button><button id="pause-settings">Настройки</button><button id="quit-run">В меню</button></div>');
      root.querySelector<HTMLButtonElement>('#resume-run')!.onclick = () => { r.resume(); this.resetInput(); document.querySelector<HTMLElement>('#game')!.focus(); };
      root.querySelector<HTMLButtonElement>('#pause-settings')!.onclick = openSettings;
      root.querySelector<HTMLButtonElement>('#quit-run')!.onclick = () => this.scene.start('menu');
      root.querySelector<HTMLButtonElement>('button')!.focus();
    } else if (r.phase === 'upgrade') {
      const root = panel(`<div class="dialog upgrade-dialog"><span class="eyebrow">СВЕТ СТАЛ СИЛЬНЕЕ</span><h2>Выбери улучшение</h2><p class="muted">Уровень ${r.level} · осталось выборов: ${r.pendingLevels}</p><div class="cards">${r.offers.map((id, index) => `<button data-upgrade="${id}"><span class="card-key">${index + 1}</span>${iconHtml(id)}<strong>${UPGRADE_DATA[id].name}</strong><span>${id in r.inventory ? `Ур. ${r.inventory[id as keyof typeof r.inventory] + 1} / ${UPGRADE_DATA[id].max} · ` : ''}${UPGRADE_DATA[id].description}</span></button>`).join('')}</div></div>`);
      root.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button, index) => button.onclick = () => { r.choose(r.offers[index]); this.resetInput(); document.querySelector<HTMLElement>('#game')!.focus(); });
      root.querySelector<HTMLButtonElement>('button')!.focus();
    } else hidePanel();
  }
}
