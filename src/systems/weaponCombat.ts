import { BOSS } from '../data/boss';
import type { BellStrike, Enemy, Projectile, RunEvent, WeaponId } from '../domain/run';
import { COMBAT, ENEMIES, PASSIVES, WEAPONS } from '../data/content';
import type { RunSimulation } from './runSimulation';
import type { SpatialHash } from './spatialHash';
export class WeaponCombat {
  projectiles: Projectile[]=[]; strikes: BellStrike[]=[];
  private nextId=1;
  private next:Record<WeaponId,number>={amber_lantern:0,glass_needles:0,ember_moths:0,root_bell:0};
  private orbitHits=new Map<string,number>();
  private orbitCount=0;
  private emit(r:RunSimulation,owner:'hero'|'enemy',x:number,y:number,vx:number,vy:number,damage:number,radius:number,remaining:number,lifetime:number):void {
    const free=this.projectiles.find(p=>!p.active),p:Projectile={id:this.nextId++,owner,active:true,x,y,vx,vy,damage,radius,remaining,expiresAt:r.elapsed+lifetime,bornAt:r.elapsed,hitIds:new Set()};
    if(free)Object.assign(free,p);else if(this.projectiles.length<COMBAT.maxProjectiles)this.projectiles.push(p);
  }
  shootEnemy(r:RunSimulation,e:Enemy):void {this.emit(r,'enemy',e.x,e.y,e.aimX*COMBAT.projectileSpeed,e.aimY*COMBAT.projectileSpeed,ENEMIES[e.kind].damage,COMBAT.projectileRadius,1,COMBAT.projectileLifetime);}
  orbits(r:RunSimulation):{x:number;y:number;index:number}[] {
    const s=r.weaponStats('ember_moths');if(!s)return [];
    return Array.from({length:s.count},(_,index)=>{const a=r.elapsed*COMBAT.orbitSpeed+index*Math.PI*2/s.count;return {index,x:r.hero.x+Math.cos(a)*s.radius,y:r.hero.y+Math.sin(a)*s.radius};});
  }
  step(r:RunSimulation,hash:SpatialHash<Enemy>,events:RunEvent[]):void {
    const h=r.hero;
    for(const id of Object.keys(WEAPONS) as WeaponId[]){
      const s=r.weaponStats(id);if(!s)continue;
      if(id==='ember_moths'){
        for(const m of this.orbits(r))if(m.index>=this.orbitCount)events.push({type:'cast',x:m.x,y:m.y,radius:8,weapon:id});
        this.orbitCount=s.count;
        const radius=COMBAT.orbitHitRadius*(1+(PASSIVES.brass_lens.levels[r.inventory.brass_lens-1]??0));
        for(const m of this.orbits(r))for(const e of hash.near(m.x,m.y,radius+BOSS.radius)){
          if(e.diedAt!==null||Math.hypot(e.x-m.x,e.y-m.y)>radius+ENEMIES[e.kind].radius)continue;
          const key=`${m.index}/${e.id}`;if(r.elapsed<(this.orbitHits.get(key)??0))continue;
          this.orbitHits.set(key,r.elapsed+s.interval);r.damageEnemy(e,s.damage,events);events.push({type:'impact',x:e.x,y:e.y,radius:8,weapon:id});
        }continue;
      }
      if(r.elapsed+1e-9<this.next[id])continue;
      if(id==='amber_lantern'){
        this.next[id]=r.elapsed+s.interval;events.push({type:'pulse',x:h.x,y:h.y,radius:s.radius,weapon:id});
        for(const e of hash.near(h.x,h.y,s.radius+BOSS.radius))if(Math.hypot(e.x-h.x,e.y-h.y)<=s.radius+ENEMIES[e.kind].radius)r.damageEnemy(e,s.damage,events);
      }else{
        let target:Enemy|undefined,nearest=Infinity;
        for(const e of hash.near(h.x,h.y,id==='glass_needles'?COMBAT.needleRange:COMBAT.bellRange)){
          if(e.diedAt!==null)continue;const dist=Math.hypot(e.x-h.x,e.y-h.y);if(dist<nearest){nearest=dist;target=e;}
        }
        if(!target)continue;this.next[id]=r.elapsed+s.interval;
        if(id==='glass_needles'){
          const a=Math.atan2(target.y-h.y,target.x-h.x);events.push({type:'cast',x:h.x,y:h.y,radius:9,weapon:id});
          for(let n=0;n<s.count;n++){const angle=a+(n-(s.count-1)/2)*COMBAT.needleSpread;this.emit(r,'hero',h.x,h.y,Math.cos(angle)*COMBAT.needleSpeed,Math.sin(angle)*COMBAT.needleSpeed,s.damage,s.radius,s.pierce,COMBAT.needleLifetime);}
        }else if(this.strikes.length<COMBAT.maxStrikes)this.strikes.push({id:this.nextId++,x:target.x,y:target.y,radius:s.radius,damage:s.damage,at:r.elapsed+COMBAT.bellDelay});
      }
    }
    for(const p of this.projectiles)if(p.active){
      if(r.elapsed>=p.expiresAt){p.active=false;continue;}
      const dx=p.vx*r.config.step,dy=p.vy*r.config.step;
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,p.radius)));
      for(let n=0;n<steps&&p.active;n++){
        p.x+=dx/steps;p.y+=dy/steps;
        if(!r.world.canOccupy(p.x,p.y,p.radius)){p.active=false;events.push({type:'impact',x:p.x,y:p.y,radius:6,weapon:p.owner==='hero'?'glass_needles':'enemy'});break;}
        if(p.owner==='hero'){
          for(const e of hash.near(p.x,p.y,p.radius+BOSS.radius)){
            if(!p.active)break;
            if(e.diedAt!==null||p.hitIds.has(e.id)||Math.hypot(e.x-p.x,e.y-p.y)>p.radius+ENEMIES[e.kind].radius)continue;
            p.hitIds.add(e.id);r.damageEnemy(e,p.damage,events);events.push({type:'impact',x:p.x,y:p.y,radius:6,weapon:'glass_needles'});if(--p.remaining===0)p.active=false;
          }
        }else if(Math.hypot(h.x-p.x,h.y-p.y)<=p.radius+r.config.hero.radius){r.damageHero(p.damage,events);p.active=false;events.push({type:'impact',x:p.x,y:p.y,radius:8,weapon:'enemy'});}
      }
    }
    this.strikes=this.strikes.filter(s=>{
      if(r.elapsed+1e-9<s.at)return true;events.push({type:'bell',x:s.x,y:s.y,radius:s.radius,weapon:'root_bell'});
      for(const e of hash.near(s.x,s.y,s.radius+BOSS.radius))if(Math.hypot(e.x-s.x,e.y-s.y)<=s.radius+ENEMIES[e.kind].radius)r.damageEnemy(e,s.damage,events);return false;
    });
    for(const [key,until] of this.orbitHits)if(until<r.elapsed-2)this.orbitHits.delete(key);
  }
}
