import Phaser from 'phaser';
import { DIRECTIONS, directionFromVector, type Direction } from '../domain/direction';
import { changePose, clipFrame, type Pose } from '../domain/animation';
import { neighborMask, TILE_MASKS } from '../domain/tiles';
import type { Asset, AssetManifest, Clip } from '../domain/assets';
import { move } from '../systems/movement';
import { WORKSHOP } from '../data/workshop';

export type WorkshopView = 'field' | 'directions' | 'tiles' | 'junctions';
export class WorkshopScene extends Phaser.Scene {
  private assets = new Map<string, Asset>();
  private root!: Phaser.GameObjects.Container;
  private hero!: Phaser.GameObjects.Sprite;
  private enemy!: Phaser.GameObjects.Sprite;
  private gallery: { sprite: Phaser.GameObjects.Sprite; asset: string; state: string; direction: Direction }[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pose: Pose = { state: 'idle', direction: 's', elapsed: 0 };
  private position = { x: 310, y: 202 };
  private accumulator = 0;
  private clock = 0;
  private enemyState = 'move';
  private enemyElapsed = 0;
  private view: WorkshopView = 'field';
  private paused = false;
  private commands: string[] = [];

  constructor() { super('workshop'); }
  create(): void {
    const manifest = this.registry.get('manifest') as AssetManifest;
    this.assets = new Map(manifest.assets.map(asset => [asset.id, asset]));
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,H,K,R,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    const command = (event: KeyboardEvent): void => {
      if (!event.repeat && ['KeyH','KeyK','KeyR','Escape'].includes(event.code)) this.commands.push(event.code);
    };
    this.input.keyboard!.on('keydown', command);
    this.showView('field');
    const viewChanged = (event: Event): void => this.showView((event as CustomEvent<WorkshopView>).detail);
    const blur = (): void => { this.paused = true; this.accumulator = 0; this.commands = []; this.input.keyboard!.resetKeys(); this.status(); };
    window.addEventListener('workshop-view', viewChanged);
    window.addEventListener('blur', blur);
    window.addEventListener('settings-open', blur);
    const visibility = (): void => { if (document.hidden) blur(); };
    document.addEventListener('visibilitychange', visibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('workshop-view', viewChanged);
      window.removeEventListener('blur', blur);
      window.removeEventListener('settings-open', blur);
      document.removeEventListener('visibilitychange', visibility);
      this.input.keyboard!.off('keydown', command);
    });
  }
  private text(x: number, y: number, content: string, color = '#8b9bb4', size = 9): void {
    this.root.add(this.add.text(x, y, content, { fontFamily: 'Consolas, monospace', fontSize: `${size}px`, color }));
  }
  private image(x: number, y: number, asset: string, frame: string): Phaser.GameObjects.Image {
    const image = this.add.image(x, y, asset, frame).setOrigin(0, 0); this.root.add(image); return image;
  }
  private sprite(x: number, y: number, asset: string, state: string, direction: Direction): Phaser.GameObjects.Sprite {
    const definition = this.assets.get(asset)!;
    const sprite = this.add.sprite(x, y, asset, this.clip(asset, state, direction).frames[0]).setOrigin(definition.origin.x, definition.origin.y);
    this.root.add(sprite); return sprite;
  }
  private clip(asset: string, state: string, direction: Direction): Clip {
    const clip = this.assets.get(asset)?.clips?.find(clip => clip.state === state && clip.direction === direction);
    if (!clip) throw new Error(`Нет клипа: ${asset}/${state}/${direction}`);
    return clip;
  }
  private renderClip(sprite: Phaser.GameObjects.Sprite, asset: string, state: string, direction: Direction, elapsed: number): void {
    const clip = this.clip(asset, state, direction);
    const frame = clip.frames[clipFrame(elapsed, clip.fps, clip.frames.length, clip.repeat === -1)];
    if (sprite.frame.name !== frame) sprite.setFrame(frame);
  }
  private showView(view: WorkshopView): void {
    if (!['field','directions','tiles','junctions'].includes(view)) return;
    this.view = view;
    this.root?.destroy(true); this.root = this.add.container(0, 0);
    this.gallery = [];
    this.input.keyboard!.resetKeys();
    this.accumulator = 0;
    if (view === 'field') this.field();
    if (view === 'directions') this.directions();
    if (view === 'tiles') this.tiles();
    if (view === 'junctions') this.junctions();
    this.status();
  }
  private field(): void {
    const material = (x: number, y: number): string => {
      if (x < 5 + Math.round(1.8 * Math.sin(y * 0.65))) return 'grass';
      if (x > 13 + Math.round(1.5 * Math.sin(y * 0.6 + 1))) return 'cobble';
      return 'dirt';
    };
    for (let y = 0; y < 12; y++) for (let x = 0; x < 20; x++) {
      this.image(x * 32, y * 32, 'dirt', `dirt/variant/${((x * 7 + y * 11) % 3).toString().padStart(2,'0')}`);
      const type = material(x, y);
      if (type !== 'dirt') {
        const mask = neighborMask(x, y, (nx, ny) => material(nx, ny) === type);
        const frame = mask === 255 ? `${type}/variant/${((x * 13 + y * 7) % 3).toString().padStart(2,'0')}` : this.assets.get(type)!.transitions!.maskToFrame[String(mask)];
        this.image(x * 32, y * 32, type, frame);
      }
    }
    this.text(16, 14, 'ДВОР ФОНАРЩИКА', '#ead4aa', 11);
    this.text(16, 30, 'Последнее направление сохраняется после остановки.');
    this.hero = this.sprite(this.position.x, this.position.y, 'hero_lantern_keeper', this.pose.state, this.pose.direction);
    this.enemy = this.sprite(410, 246, 'root_crawler', this.enemyState, 'w');
    this.text(380, 273, 'Корневой ползун', '#c0cbdc');
    this.text(16, 333, 'ТРАВА → ВЛАЖНАЯ ЗЕМЛЯ → БРУСЧАТКА', '#ead4aa');
  }
  private directions(): void {
    this.text(20, 16, 'ФОНАРЩИК / ВОСЕМЬ НАПРАВЛЕНИЙ', '#ead4aa', 11);
    this.text(20, 34, '64×64 · опора 32,56 · фонарь в анатомически правой руке');
    for (const [index,direction] of DIRECTIONS.entries()) {
      const x = 46 + index * 78;
      this.text(x-5, 64, direction.toUpperCase(), '#feae34');
      for (const [row,state] of ['idle','walk'].entries()) {
        const y = 137 + row * 85;
        const sprite = this.sprite(x,y,'hero_lantern_keeper',state,direction);
        this.gallery.push({sprite,asset:'hero_lantern_keeper',state,direction});
      }
      this.text(x-15, 239, '4 / 6', '#5a6988');
    }
    this.text(20, 149, 'IDLE · 6 FPS'); this.text(20, 225, 'WALK · 10 FPS');
    this.text(20, 269, 'H / K — реакции всех направлений. R — восстановить.', '#ead4aa');
    for (const [index,direction] of (['n','e','s','w'] as const).entries()) {
      const x = 250 + index * 90;
      const sprite = this.sprite(x,333,'root_crawler','move',direction);
      this.gallery.push({sprite,asset:'root_crawler',state:'move',direction});
      this.text(x-5,342,direction.toUpperCase());
    }
    this.text(20, 309, 'КОРНЕВОЙ ПОЛЗУН', '#c0cbdc');
  }
  private tiles(): void {
    this.text(12, 9, 'ПЕРЕХОДЫ / 47 НОРМАЛИЗОВАННЫХ МАСОК', '#ead4aa', 10);
    for (const [row,material] of ['grass','cobble'].entries()) {
      this.text(12, 30 + row * 162, material === 'grass' ? 'ТРАВА → ЗЕМЛЯ' : 'БРУСЧАТКА → ЗЕМЛЯ', '#feae34');
      TILE_MASKS.forEach((mask,index) => {
        const x=12+(index%12)*36; const y=44+Math.floor(index/12)*37+row*162;
        this.image(x,y,'dirt','dirt/variant/00');
        this.image(x,y,material,this.assets.get(material)!.transitions!.maskToFrame[String(mask)]);
        this.text(x+10,y+26,String(mask),'#ead4aa',7);
      });
    }
    this.text(460,30,'ПОВТОР 3×3 / ВАРИАНТЫ');
    for (const [index,material] of ['grass','dirt','cobble'].entries()) {
      const y=48+index*101;
      for (let j=0;j<3;j++) for (let i=0;i<3;i++) this.image(460+i*32,y+j*32,material,`${material}/variant/00`);
      for (let variant=1;variant<3;variant++) this.image(566,y+(variant-1)*36,material,`${material}/variant/0${variant}`);
    }
  }
  private junctions(): void {
    // Fixture across world tile x=32: two independently drawn chunk fragments.
    // Both read the same neighbor function outside their local draw range.
    const material=(x: number,y: number): string => {
      if ((x>=24 && x<=32 && y===27) || Math.hypot(x-27,y-27)<=3 || (x===31 && y===31)) return 'grass';
      const radius=Math.hypot(x-37,y-28);
      if (radius<=3.6 && radius>=1.5) return 'cobble';
      return 'dirt';
    };
    for (const [start,end] of [[22,32],[32,42]]) for(let wy=22;wy<34;wy++) for(let wx=start;wx<end;wx++) {
      const x=(wx-22)*32,y=(wy-22)*32;
      this.image(x,y,'dirt',`dirt/variant/0${(wx+wy)%3}`);
      const type=material(wx,wy);
      if(type!=='dirt') {
        const mask=neighborMask(wx,wy,(nx,ny)=>material(nx,ny)===type);
        this.image(x,y,type,this.assets.get(type)!.transitions!.maskToFrame[String(mask)]);
      }
    }
    this.text(16,14,'УГЛЫ · УЗКАЯ ПЕРЕМЫЧКА · СТЫК УЧАСТКОВ', '#ead4aa',11);
    this.text(16,32,'Два фрагмента рисуются отдельно; соседи берутся в мировых координатах.');
    const line=this.add.graphics().lineStyle(1,0xfeae34,0.6).lineBetween(320,48,320,328);
    this.root.add(line);
    this.text(324,54,'x = 32', '#feae34');
    this.text(16,338,'Фиксированный образец. Процедурный мир — этап 3.', '#ead4aa');
  }
  private trigger(state: 'hit' | 'death'): void {
    if (this.pose.state === 'death') return;
    this.pose = { ...this.pose, state, elapsed: 0 };
    this.enemyState = state; this.enemyElapsed = 0;
  }
  private reset(): void {
    this.pose = { state:'idle', direction:'s', elapsed:0 };
    this.enemyState = 'move'; this.enemyElapsed = 0;
    this.position = {x:310,y:202}; this.paused = false; this.accumulator = 0;
  }
  update(_time: number, delta: number): void {
    for (const command of this.commands.splice(0)) {
      if (command === 'Escape') { this.paused = !this.paused; this.accumulator = 0; }
      if (command === 'KeyR') this.reset();
      if (!this.paused && command === 'KeyH') this.trigger('hit');
      if (!this.paused && command === 'KeyK') this.trigger('death');
    }
    if (!this.paused) {
      this.accumulator = Math.min(this.accumulator + delta / 1000, WORKSHOP.maxAccumulator);
      while (this.accumulator >= WORKSHOP.step) { this.step(WORKSHOP.step); this.accumulator -= WORKSHOP.step; }
    }
    if (this.view === 'field') {
      this.hero.setPosition(Math.round(this.position.x),Math.round(this.position.y)).setDepth(this.position.y);
      this.enemy.setDepth(246);
      this.root.sort('depth');
      this.renderClip(this.hero,'hero_lantern_keeper',this.pose.state,this.pose.direction,this.pose.elapsed);
      this.renderClip(this.enemy,'root_crawler',this.enemyState,'w',this.enemyElapsed);
    }
    for (const item of this.gallery) {
      const reacting=this.pose.state==='hit' || this.pose.state==='death';
      const state=reacting ? this.pose.state : item.state;
      const elapsed=reacting ? this.pose.elapsed : this.clock;
      this.renderClip(item.sprite,item.asset,state,item.direction,elapsed);
    }
    this.status();
  }
  private step(dt: number): void {
    this.clock += dt; this.pose.elapsed += dt; this.enemyElapsed += dt;
    if (this.pose.state==='hit' && this.pose.elapsed >= 2/12) this.pose=changePose(this.pose,'idle',this.pose.direction);
    if (this.enemyState==='hit' && this.enemyElapsed >= 2/12) {this.enemyState='move';this.enemyElapsed=0;}
    if (this.view==='field' && this.pose.state!=='death') {
      const vector=move(this.position,{
        x:Number(this.keys.D.isDown || this.keys.RIGHT.isDown)-Number(this.keys.A.isDown || this.keys.LEFT.isDown),
        y:Number(this.keys.S.isDown || this.keys.DOWN.isDown)-Number(this.keys.W.isDown || this.keys.UP.isDown)
      },WORKSHOP.speed,dt,{left:32,right:608,top:84,bottom:316});
      const direction=directionFromVector(vector,this.pose.direction);
      const state=this.pose.state==='hit' ? 'hit' : vector.x || vector.y ? 'walk' : 'idle';
      this.pose=changePose(this.pose,state,direction);
    }
  }
  private status(): void {
    const state=this.paused?'ПАУЗА · Esc — продолжить':`${this.pose.state.toUpperCase()} · ${this.pose.direction.toUpperCase()} · ${WORKSHOP.speed} px/s`;
    document.querySelector('#status')!.textContent=`${state} / ${this.view==='tiles' ? '94 маски' : 'опора кадра 32,56'}`;
    // Read-only diagnostics for browser verification, with no simulation controls.
    const canvas=this.game.canvas;
    canvas.dataset.state=this.pose.state; canvas.dataset.direction=this.pose.direction;
    canvas.dataset.x=String(this.position.x); canvas.dataset.y=String(this.position.y);
    canvas.dataset.elapsed=String(this.pose.elapsed); canvas.dataset.paused=String(this.paused);
    canvas.dataset.frame=this.hero?.active ? String(this.hero.frame.name) : '';
  }
}
