import { ENEMIES, emptyInventory } from './content';
import { PROTOTYPE } from './prototype';
import type { EnemyId, Inventory, RunConfig } from '../domain/run';
import type { RunSimulation } from '../systems/runSimulation';
export const BUILDS:Record<string,{name:string;inventory:Inventory}>={
 close:{name:'Ближняя защита',inventory:{...emptyInventory(),amber_lantern:4,ember_moths:4,brass_lens:2,wax_seal:3,wick:1}},
 ranged:{name:'Дальний урон',inventory:{...emptyInventory(),glass_needles:5,root_bell:4,wick:3,keepers_watch:2}},
 mobile:{name:'Сбор опыта / мобильность',inventory:{...emptyInventory(),glass_needles:3,ember_moths:2,boots:3,firefly_jar:3,keepers_watch:1}}
};
export const REVIEW_LABELS:Record<string,string>={...Object.fromEntries(Object.values(ENEMIES).map(e=>[e.id,e.name])),...Object.fromEntries(Object.entries(BUILDS).map(([id,b])=>[id,b.name]))};
export function reviewConfig():RunConfig {const c=structuredClone(PROTOTYPE);c.duration=60;c.spawn.first=9999;c.xp.first=999999;return c;}
export function prepareReview(r:RunSimulation,id:string):void {
 if(BUILDS[id])r.inventory={...BUILDS[id].inventory};else {r.inventory=emptyInventory();r.config.lantern.damage=0;}
 if (id === 'greenhouse_heart') r.createEnemy('greenhouse_heart', 115, 0); else spawnReview(r,id);
}
export function spawnReview(r:RunSimulation,id:string):void {
 if (id === 'greenhouse_heart') return;
 const kinds=(id in ENEMIES?[id]:Object.keys(ENEMIES).filter(id => id !== 'greenhouse_heart')) as EnemyId[];
 for(const [n,kind] of kinds.entries()){
  const angle=n*Math.PI*2/kinds.length,distance=id in ENEMIES?115:145;
  const x=r.hero.x+Math.cos(angle)*distance,y=r.hero.y+Math.sin(angle)*distance;
  if(r.world.canOccupy(x,y,ENEMIES[kind].radius))r.createEnemy(kind,x,y);
 }
}
