import { describe, expect, it } from 'vitest';
import { COMBAT, CONTENT_IDS, emptyInventory, ENEMIES, PASSIVES, UPGRADE_DATA, validateContent, WEAPONS } from '../src/data/content';
import { BUILDS, prepareReview, reviewConfig, spawnReview } from '../src/data/contentReview';
import { PROTOTYPE } from '../src/data/prototype';
import { RunSimulation } from '../src/systems/runSimulation';
import type { EnemyId, RunEvent, WeaponId } from '../src/domain/run';
function fresh():RunSimulation {const c=structuredClone(PROTOTYPE);c.spawn.first=9999;c.lantern.damage=0;return new RunSimulation(20261014,c);}
function tick(r:RunSimulation,seconds:number,x=0,y=0):RunEvent[] {const events:RunEvent[]=[];for(let n=0;n<Math.round(seconds/r.config.step);n++)events.push(...r.advance(r.config.step,{x,y}));return events;}
function target(r:RunSimulation,kind:EnemyId,x:number,y=0) {const e=r.createEnemy(kind,x,y);e.speed=0;e.hp=1000;return e;}
describe('stage 4 content and combat',()=>{
 it('validates all level tables and acquires/caps all ten inventory slots without a dead end',()=>{
  validateContent();expect(Object.keys(WEAPONS)).toHaveLength(4);expect(Object.keys(PASSIVES)).toHaveLength(6);expect(Object.keys(ENEMIES).filter(id=>id!=='greenhouse_heart')).toHaveLength(6);expect(ENEMIES.greenhouse_heart.hp).toBeGreaterThan(ENEMIES.wax_walker.hp);
  const r=fresh();for(let n=0;n<40;n++){r.addXp(r.xpRequired);expect(new Set(r.offers).size).toBe(3);expect(r.offers.every(id=>!(id in r.inventory)||r.inventory[id as keyof typeof r.inventory]<UPGRADE_DATA[id].max)).toBe(true);expect(r.choose(r.offers[0])).toBe(true);}
  for(const id of CONTENT_IDS)expect(r.inventory[id]).toBe(UPGRADE_DATA[id].max);
  r.addXp(r.xpRequired);expect(r.offers).toEqual(['heal','haste','fury']);expect(r.choose('glass_needles')).toBe(false);
 });
 it('recomputes all six passives from base; armor retains positive damage',()=>{
  const r=fresh(),base=r.stats;r.inventory={...emptyInventory(),wick:3,brass_lens:3,boots:3,wax_seal:3,firefly_jar:3,keepers_watch:3};r.inventory.glass_needles=1;
  expect(r.stats.speed).toBeCloseTo(base.speed*1.36);expect(r.stats.radius).toBeCloseTo(base.radius*1.54);expect(r.stats.pickupRadius).toBeCloseTo(base.pickupRadius*2.05);expect(r.stats.interval).toBeCloseTo(base.interval*0.7);
  expect(r.weaponStats('glass_needles')!.damage).toBeCloseTo(14*1.45);const stats=r.stats;expect(r.stats).toEqual(stats);
  r.damageHero(3,[]);expect(r.hero.hp).toBe(79);expect(r.stats.armor).toBe(6);
 });
 it('needles wait for targets, hit once per pierced enemy and retain movement facing',()=>{
  const r=fresh();r.inventory.glass_needles=3;tick(r,0.5);expect(r.combat.projectiles).toHaveLength(0);
  const a=target(r,'root_crawler',110),b=target(r,'root_crawler',140);tick(r,0.7);
  expect(a.hp).toBe(1000-24*2);expect(b.hp).toBe(1000-24*2);expect(r.hero.direction).toBe('s');
  expect(r.combat.projectiles.every(p=>!p.active&&p.hitIds.size===2)).toBe(true);
 });
 it('orbits hit by per-moth cooldown, without requiring a target to exist',()=>{
  const r=fresh();r.inventory.ember_moths=1;expect(r.combat.orbits(r)).toHaveLength(1);
  const e=target(r,'root_crawler',42);tick(r,0.1);expect(e.hp).toBe(991);tick(r,0.05);expect(e.hp).toBe(991);
  expect(r.combat.orbits(r)[0].y).toBeGreaterThan(0);
 });
 it('bell fixes its warning position and only hits after the telegraph; pause freezes it',()=>{
  const r=fresh();r.inventory.root_bell=1;const e=target(r,'wax_walker',120);tick(r,0.1);
  const strike=structuredClone(r.combat.strikes[0]);expect(strike.x).toBe(120);expect(e.hp).toBe(1000);
  r.pause();tick(r,2);expect(r.combat.strikes[0]).toEqual(strike);r.resume();tick(r,0.6);expect(e.hp).toBe(1000);
  const events=tick(r,0.2);expect(e.hp).toBe(976);expect(events.filter(e=>e.type==='bell')).toHaveLength(1);expect(r.combat.strikes).toHaveLength(0);
 });
 it('special enemies prepare, lock their direction, attack and rest; spitter shoots once',()=>{
  for(const kind of ['thorn_runner','bell_spitter','lantern_thief'] as EnemyId[]){
   const r=fresh(),e=r.createEnemy(kind,110,0);tick(r,0.8);expect(e.state).toBe('prepare');const aim=[e.aimX,e.aimY];
   r.hero.y=40;tick(r,0.3);expect([e.aimX,e.aimY]).toEqual(aim);tick(r,0.7);
   if(kind==='bell_spitter'){expect(r.combat.projectiles.filter(p=>p.owner==='enemy')).toHaveLength(1);expect(r.combat.projectiles[0].vy).toBe(0);}
   tick(r,0.5);expect(['recover','move']).toContain(e.state);
  }
 });
 it('ranged retreat and flanking differ from a direct chase; all bodies stay clear of obstacles',()=>{
  const r=fresh();const crawler=r.createEnemy('root_crawler',40,0),spitter=r.createEnemy('bell_spitter',-50,0),thief=r.createEnemy('lantern_thief',0,-60);tick(r,0.2);
  expect(crawler.x).toBeLessThan(40);expect(spitter.x).toBeLessThan(-50);expect(Math.abs(thief.x)).toBeGreaterThan(1);
  for(const e of r.enemies)expect(r.world.canOccupy(e.x,e.y,ENEMIES[e.kind].radius)).toBe(true);
 });
 it('enemy shots deal real armor-reduced damage and expire; freeze under choices',()=>{
  const r=fresh();r.inventory.wax_seal=2;const e=target(r,'bell_spitter',45);e.aimX=-1;e.aimY=0;r.combat.shootEnemy(r,e);
  r.addXp(r.xpRequired);const before=JSON.stringify(r.combat.projectiles);tick(r,2);expect(JSON.stringify(r.combat.projectiles)).toBe(before);r.choose(r.offers[0]);tick(r,0.5);expect(r.hero.hp).toBe(74);
  expect(r.combat.projectiles[0].active).toBe(false);
 });
 it('each killed type yields its configured XP exactly once',()=>{
  for(const kind of Object.keys(ENEMIES) as EnemyId[]){const r=fresh(),e=target(r,kind,100);const events:RunEvent[]=[];r.damageEnemy(e,1001,events);r.damageEnemy(e,1001,events);expect(r.kills).toBe(1);expect(r.sparks[0].value).toBe(ENEMIES[kind].xp);expect(events.filter(e=>e.type==='death')).toHaveLength(1);}
 });
 it('wax heals with a cap, magnet attracts distant XP and jar changes the real collection range',()=>{
  const r=fresh();r.hero.hp=65;r.pickups=[{id:999,active:true,kind:'wax',x:0,y:0}];tick(r,1/60);expect(r.hero.hp).toBe(80);
  r.sparks=[{id:777,active:true,x:100,y:0,value:3,attracted:false}];tick(r,1/60);expect(r.sparks[0].attracted).toBe(false);r.inventory.firefly_jar=1;tick(r,1/60);expect(r.sparks[0].attracted).toBe(true);
  r.sparks[0].x=500;r.sparks[0].attracted=false;r.pickups=[{id:1000,active:true,kind:'magnet',x:0,y:0}];tick(r,1/60);expect(r.sparks[0].attracted).toBe(true);expect(r.sparks[0].x).toBeLessThan(500);
 });
 it('all three builds survive and kill across a 30-second mixed encounter with normal damage',()=>{
  for(const id of Object.keys(BUILDS)){
   const r=new RunSimulation(20261014,reviewConfig());prepareReview(r,id);
   for(let n=0;n<1800&&r.phase==='running';n++){if(n&&n%240===0)spawnReview(r,id);r.advance(r.config.step,{x:Math.sin(n/120),y:Math.cos(n/120)});}
   expect(r.hero.hp,`${id} health`).toBeGreaterThan(0);expect(r.kills,`${id} kills`).toBeGreaterThan(5);expect(r.elapsed).toBeCloseTo(30);expect(r.inventory).toEqual(BUILDS[id].inventory);
  }
 });
 it('all five weapon levels produce valid attacks and bounded projectile pools',()=>{
  const r=fresh();for(const id of Object.keys(WEAPONS) as WeaponId[])for(let n=1;n<=5;n++){r.inventory[id]=n;const s=r.weaponStats(id)!;expect(s.interval).toBeGreaterThanOrEqual(COMBAT.minInterval);expect(s.count).toBeGreaterThan(0);expect(s.pierce).toBeGreaterThan(0);}
  const e=target(r,'bell_spitter',100);for(let n=0;n<300;n++)r.combat.shootEnemy(r,e);e.active=false;expect(r.combat.projectiles).toHaveLength(COMBAT.maxProjectiles);tick(r,5);expect(r.combat.projectiles.every(p=>!p.active)).toBe(true);
 });
});
