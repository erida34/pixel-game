import { directionFromVector, normalizeMovement } from '../domain/direction';
import type { Enemy, EnemyDefinition } from '../domain/run';
import type { WorldGenerator } from '../domain/world';
import { AI_MOTION as AI, COMBAT } from '../data/content';
export function moveEnemy(e: Enemy, d: EnemyDefinition, h: {x:number;y:number}, time: number, dt: number, world: WorldGenerator, shoot: (e: Enemy) => void): void {
  const toward=normalizeMovement(h.x-e.x,h.y-e.y), distance=Math.hypot(h.x-e.x,h.y-e.y);
  let vx=toward.x,vy=toward.y,speed=e.speed;
  if(['dash','ranged','flank'].includes(d.strategy)&&e.state==='move'&&time>=e.nextAttack&&distance<=d.range){e.state='prepare';e.stateAt=time;e.aimX=toward.x;e.aimY=toward.y;}
  if(e.state==='prepare'){speed=0;if(time-e.stateAt+1e-9>=d.prepare){e.state='attack';e.stateAt=time;if(d.strategy==='ranged')shoot(e);}}
  if(e.state==='attack'){vx=e.aimX;vy=e.aimY;speed=d.strategy==='ranged'?0:e.speed*COMBAT.dashMultiplier;if(time-e.stateAt+1e-9>=d.attack){e.state='recover';e.stateAt=time;speed=0;}}
  if(e.state==='recover'){speed=e.speed*AI.recoverySpeed;if(time-e.stateAt+1e-9>=d.recovery){e.state='move';e.stateAt=time;e.nextAttack=time+AI.retry;}}
  if(e.state==='move'){
    if(d.strategy==='ranged'){const sign=distance<d.range*AI.retreatRatio?-1:distance>d.range*AI.holdRatio?1:0;vx*=sign;vy*=sign;}
    else if(d.strategy==='flank'){const side=e.id%2?1:-1;const v=normalizeMovement(toward.x-toward.y*side*AI.flankOffset,toward.y+toward.x*side*AI.flankOffset);vx=v.x;vy=v.y;}
    else if(d.strategy==='swarm'){const wobble=Math.sin(time*AI.swarmFrequency+e.id)*AI.swarmSway;const v=normalizeMovement(toward.x-toward.y*wobble,toward.y+toward.x*wobble);vx=v.x;vy=v.y;}
  }
  let m=world.move(e.x,e.y,vx*speed*dt,vy*speed*dt,d.radius);
  if(e.state==='move'&&Math.hypot(m.x-e.x,m.y-e.y)<speed*dt*AI.blockedRatio){const side=e.id%2?1:-1;m=world.move(e.x,e.y,-vy*speed*dt*side,vx*speed*dt*side,d.radius);}
  e.x=m.x;e.y=m.y;e.direction=directionFromVector(e.state==='prepare'?{x:e.aimX,y:e.aimY}:{x:vx,y:vy},e.direction);
}
