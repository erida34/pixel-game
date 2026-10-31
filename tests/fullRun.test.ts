import { describe, expect, it } from 'vitest';
import { BOSS } from '../src/data/boss';
import { FULL_RUN, WAVES, waveAt } from '../src/data/fullRun';
import { RunSimulation } from '../src/systems/runSimulation';
import type { RunConfig } from '../src/domain/run';

function quiet(): RunConfig {
  const c = structuredClone(FULL_RUN); c.spawn.first = 9999; c.xp.first = 999999; return c;
}
function tick(r: RunSimulation, seconds = 1 / 60): void {
  for (let n = 0; n < Math.round(seconds / r.config.step); n++) r.advance(r.config.step, { x: 0, y: 0 });
}
function boss(r: RunSimulation) { return r.createEnemy('greenhouse_heart', 100, 0); }

describe('full run events and outcomes', () => {
  it('introduces six weighted waves on their exact boundaries', () => {
    expect(WAVES.map(w => w.at)).toEqual([0,60,120,180,300,420,540]);
    for (const wave of WAVES.slice(1)) {
      expect(waveAt(wave.at - 1 / 60).at).toBeLessThan(wave.at);
      expect(waveAt(wave.at).at).toBe(wave.at);
      expect(Object.keys(wave.weights)).not.toContain('greenhouse_heart');
    }
    const a = new RunSimulation(0,FULL_RUN), b = new RunSimulation(0,FULL_RUN);
    a.elapsed = b.elapsed = 419.99; tick(a); tick(b);
    expect(a.enemies).toEqual(b.enemies);
  });
  it('spawns one boss at 540 even when the ordinary pool is full, and pause freezes the boundary', () => {
    const c = quiet(); c.spawn.maxEnemies = 1;
    const r = new RunSimulation(1,c); r.elapsed = 540 - c.step;
    r.createEnemy('wax_walker',-200,0);
    r.pause(); tick(r,3); expect(r.boss).toBeNull(); expect(r.elapsed).toBe(540-c.step);
    r.resume(); tick(r); expect(r.bossSpawned).toBe(true); expect(r.boss?.enemy.hp).toBe(BOSS.hp);
    const id = r.boss!.enemy.id; tick(r,1); expect(r.boss!.enemy.id).toBe(id);
    expect(r.enemies.filter(e => e.kind === 'greenhouse_heart')).toHaveLength(1);
    expect(r.world.canOccupy(r.boss!.enemy.x,r.boss!.enemy.y,BOSS.radius)).toBe(true);
    expect(() => boss(r)).toThrow('already spawned');
  });
  it('does not finish on early boss death and wins exactly at 600', () => {
    const r = new RunSimulation(1,quiet()); r.elapsed = 550; const e = boss(r);
    r.damageEnemy(e,BOSS.hp,[]); tick(r,2);
    expect(r.result).toBeNull(); expect(r.bossDefeated).toBe(true);
    // Ordinary pool reuse must not erase the defeated boss record.
    r.createEnemy('root_crawler',-200,0); expect(r.bossDefeated).toBe(true);
    r.elapsed = 600-r.config.step; r.pause(); tick(r); expect(r.result).toBeNull();
    r.resume(); tick(r); expect(r.result?.outcome).toBe('victory'); expect(r.result?.elapsedSeconds).toBe(600);
  });
  it('keeps advancing after 600 until a late boss death; ordinary spawns stop', () => {
    const c=quiet(); c.spawn.first=599.9;
    const r = new RunSimulation(1,c); r.elapsed=600-r.config.step; boss(r);
    tick(r); expect(r.result).toBeNull(); expect(r.elapsed).toBe(600);
    const count=r.ordinarySpawns; tick(r,1); expect(r.elapsed).toBeCloseTo(601); expect(r.ordinarySpawns).toBe(count);
    r.damageEnemy(r.boss!.enemy,BOSS.hp,[]); tick(r);
    expect(r.result?.outcome).toBe('victory'); expect(r.result!.elapsedSeconds).toBeGreaterThan(600);
  });
  it('gives defeat priority when the hero and boss die in the same step', () => {
    const c=quiet(); const r=new RunSimulation(1,c); r.elapsed=600; r.hero.hp=BOSS.damage;
    const e=r.createEnemy('greenhouse_heart',40,0); e.hp=1;
    r.boss!.ring={x:40,y:0,at:r.elapsed};
    tick(r); expect(r.bossDefeated).toBe(true); expect(r.hero.hp).toBe(0); expect(r.result?.outcome).toBe('defeat');
  });
  it('continues contact danger after 600 and can lose the final fight', () => {
    const r=new RunSimulation(1,quiet()); r.elapsed=610; r.hero.hp=1;
    r.createEnemy('greenhouse_heart',0,0); tick(r);
    expect(r.result?.outcome).toBe('defeat'); expect(r.result?.bossDefeated).toBe(false);
  });
  it('freezes mandatory choices before the boss boundary and restarts cleanly', () => {
    const c=quiet(); c.xp.first=6; const r=new RunSimulation(1,c); r.elapsed=540-c.step;
    r.addXp(6); tick(r,1); expect(r.boss).toBeNull();
    r.choose(r.offers[0]); tick(r); expect(r.bossSpawned).toBe(true);
    const fresh=new RunSimulation(1,FULL_RUN);
    expect(fresh.elapsed).toBe(0); expect(fresh.boss).toBeNull(); expect(fresh.bossSpawned).toBe(false);
    expect(fresh.ordinarySpawns).toBe(0); expect(fresh.result).toBeNull(); expect(fresh.inventory.amber_lantern).toBe(1);
  });
  it('telegraphs a damaging expanding ring; pause freezes the ring and preparation', () => {
    const r=new RunSimulation(1,quiet()); const e=boss(r); r.boss!.nextAttack=0;
    tick(r); expect(e.state).toBe('prepare'); expect(r.boss!.ring).toBeNull();
    const hp=r.hero.hp; tick(r,1); expect(r.hero.hp).toBe(hp);
    const at=e.stateAt; r.pause(); tick(r,2); expect(e.stateAt).toBe(at); expect(r.boss!.ring).toBeNull();
    r.resume(); tick(r,0.3); expect(r.boss!.ring).not.toBeNull();
    const snapshot=JSON.stringify(r.boss); r.pause(); tick(r,1); expect(JSON.stringify(r.boss)).toBe(snapshot);
    r.resume(); tick(r,0.7); expect(r.hero.hp).toBeLessThan(hp);
  });
  it('summons only at the marked locations, respects the pool and stops summons at 600', () => {
    const c=quiet(); c.spawn.maxEnemies=2; const r=new RunSimulation(1,c); boss(r);
    r.boss!.attack='summon'; r.boss!.nextAttack=0; tick(r);
    const points=r.boss!.summons.map(p=>({...p})); expect(points.length).toBeGreaterThan(0);
    expect(r.enemies.length).toBe(1); tick(r,BOSS.prepareSummon);
    const summoned=r.enemies.filter(e=>e.kind==='root_crawler'); expect(summoned).toHaveLength(2);
    for(const e of summoned)expect(points.some(p=>p.x===e.x && p.y===e.y)).toBe(true);
    const late=new RunSimulation(1,quiet()); late.elapsed=601; boss(late);
    late.boss!.attack='summon'; late.boss!.nextAttack=0; tick(late,2);
    expect(late.enemies.filter(e=>e.kind!=='greenhouse_heart')).toHaveLength(0);
  });
  it('shortens the next attack interval below half health and clears pending attacks on death', () => {
    const r=new RunSimulation(1,quiet()); const e=boss(r); e.hp=BOSS.hp/2;
    e.state='attack'; e.stateAt=0; r.elapsed=BOSS.attackSeconds; tick(r);
    expect(r.boss!.enraged).toBe(true); expect(r.boss!.nextAttack-r.elapsed).toBe(BOSS.enragedInterval);
    r.boss!.ring={x:0,y:0,at:r.elapsed}; r.boss!.summons=[{x:0,y:0}];
    r.damageEnemy(e,BOSS.hp,[]); expect(r.boss!.ring).toBeNull(); expect(r.boss!.summons).toEqual([]);
  });
  it('weapons query the full boss hitbox across spatial hash cells', () => {
    const r=new RunSimulation(1,quiet()); r.hero.x=62; const e=r.createEnemy('greenhouse_heart',159,0);
    tick(r); expect(e.hp).toBe(BOSS.hp-r.stats.damage);
  });
  it('finds a valid boss position at negative and positive chunk boundaries for multiple seeds', () => {
    for (const seed of [0,1,20261014,0xffffffff]) for (const x of [-1024,0,1024]) {
      const r=new RunSimulation(seed,quiet()); r.hero.x=x; r.hero.y=x; r.elapsed=540-r.config.step;
      tick(r); expect(r.bossSpawned).toBe(true);
      const e=r.boss!.enemy; expect(r.world.canOccupy(e.x,e.y,BOSS.radius)).toBe(true);
    }
  });
});
