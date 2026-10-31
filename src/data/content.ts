import type { ContentId, EnemyDefinition, EnemyId, Inventory, PassiveDefinition, PassiveId, UpgradeId, WeaponDefinition, WeaponId, WeaponLevel } from '../domain/run';
import { BOSS } from './boss';

const level = (damage: number, radius: number, interval: number, count = 1, pierce = 1): WeaponLevel => ({ damage, radius, interval, count, pierce });
export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  amber_lantern: { id: 'amber_lantern', name: 'Янтарный фонарь', description: 'Круговой импульс: урон, радиус и частота растут', icon: 'amber_lantern', strategy: 'pulse', levels: [level(12,70,1.2),level(18,74,1.1),level(24,78,1),level(30,82,0.9),level(36,86,0.8)] },
  glass_needles: { id: 'glass_needles', name: 'Стеклянные иглы', description: 'Ближайшая цель; больше игл и пробиваний', icon: 'glass_needles', strategy: 'projectile', levels: [level(14,3,1.1),level(19,3,1,2),level(24,3,0.95,2,2),level(29,3,0.9,3,2),level(34,3,0.85,3,3)] },
  ember_moths: { id: 'ember_moths', name: 'Угольные мотыльки', description: 'Огненные спутники вокруг героя', icon: 'ember_moths', strategy: 'orbit', levels: [level(9,42,0.65),level(12,46,0.6,2),level(15,50,0.55,2),level(18,54,0.5,3),level(22,58,0.45,4)] },
  root_bell: { id: 'root_bell', name: 'Корневой колокол', description: 'Предупреждение на земле, затем удар по площади', icon: 'root_bell', strategy: 'delayed', levels: [level(24,32,2.8),level(32,36,2.6),level(40,40,2.4),level(48,44,2.2),level(56,48,2)] }
};
export const PASSIVES: Record<PassiveId, PassiveDefinition> = {
  wick: { id:'wick', name:'Длинный фитиль', description:'+15 / 30 / 45% урона всех оружий', icon:'wick', modifier:'damage', levels:[0.15,0.3,0.45] },
  brass_lens: { id:'brass_lens', name:'Латунная линза', description:'+18 / 36 / 54% радиуса и размеров атак', icon:'brass_lens', modifier:'area', levels:[0.18,0.36,0.54] },
  boots: { id:'boots', name:'Сапоги смотрителя', description:'+12 / 24 / 36% скорости', icon:'boots', modifier:'speed', levels:[0.12,0.24,0.36] },
  wax_seal: { id:'wax_seal', name:'Восковая печать', description:'−2 / 4 / 6 входящего урона; минимум 1', icon:'wax_seal', modifier:'armor', levels:[2,4,6] },
  firefly_jar: { id:'firefly_jar', name:'Банка светляков', description:'+35 / 70 / 105% радиуса сбора искр', icon:'firefly_jar', modifier:'pickup', levels:[0.35,0.7,1.05] },
  keepers_watch: { id:'keepers_watch', name:'Часы смотрителя', description:'−10 / 20 / 30% интервалов; минимум 0,12 с', icon:'keepers_watch', modifier:'cooldown', levels:[0.1,0.2,0.3] }
};
export const ENEMIES: Record<EnemyId, EnemyDefinition> = {
  greenhouse_heart: { id:'greenhouse_heart', name:'Сердце оранжереи', strategy:'chase', hp:BOSS.hp,speed:BOSS.speed,radius:BOSS.radius,damage:BOSS.damage,xp:BOSS.xp,introducedAt:540,prepare:BOSS.prepareThorns,attack:BOSS.attackSeconds,recovery:BOSS.interval,range:BOSS.ringEnd },
  root_crawler: { id:'root_crawler', name:'Корневой ползун', strategy:'chase', hp:18,speed:32,radius:11,damage:8,xp:3,introducedAt:0,prepare:0,attack:0,recovery:0,range:0 },
  wax_walker: { id:'wax_walker', name:'Восковой бродяга', strategy:'chase', hp:70,speed:22,radius:12,damage:12,xp:6,introducedAt:60,prepare:0,attack:0,recovery:0,range:0 },
  moth_swarm: { id:'moth_swarm', name:'Рой мотыльков', strategy:'swarm', hp:14,speed:64,radius:8,damage:6,xp:4,introducedAt:120,prepare:0,attack:0,recovery:0,range:0 },
  thorn_runner: { id:'thorn_runner', name:'Шипастый бегун', strategy:'dash', hp:38,speed:38,radius:10,damage:14,xp:6,introducedAt:180,prepare:0.8,attack:0.45,recovery:1.4,range:160 },
  bell_spitter: { id:'bell_spitter', name:'Колокольный плевун', strategy:'ranged', hp:46,speed:27,radius:11,damage:10,xp:7,introducedAt:300,prepare:0.9,attack:0.35,recovery:1.8,range:175 },
  lantern_thief: { id:'lantern_thief', name:'Похититель света', strategy:'flank', hp:42,speed:45,radius:10,damage:12,xp:8,introducedAt:420,prepare:0.65,attack:0.4,recovery:1.5,range:135 }
};
export const COMBAT = { minInterval:0.12, minDamage:1, needleSpeed:280, needleLifetime:2.2, needleRange:330, needleSpread:0.12, orbitSpeed:2.4, orbitHitRadius:7, bellDelay:0.8, bellRange:330, projectileSpeed:130, projectileLifetime:4, projectileRadius:5, dashMultiplier:4.2, maxProjectiles:256, maxStrikes:24, maxPickups:32, waxChance:0.06, magnetChance:0.025 } as const;
export const CONTENT_IDS = [...Object.keys(WEAPONS), ...Object.keys(PASSIVES)] as ContentId[];
export const AI_MOTION = { swarmFrequency:3, swarmSway:0.4, flankOffset:0.9, retreatRatio:0.7, holdRatio:0.9, recoverySpeed:0.2, retry:0.8, blockedRatio:0.65 } as const;
export const emptyInventory = (): Inventory => Object.fromEntries(CONTENT_IDS.map(id => [id,id === 'amber_lantern' ? 1 : 0])) as Inventory;
export const UPGRADE_DATA: Record<UpgradeId, { name: string; description: string; max: number; icon: string }> = {
  ...Object.fromEntries(CONTENT_IDS.map(id => { const d = id in WEAPONS ? WEAPONS[id as WeaponId] : PASSIVES[id as PassiveId]; return [id,{name:d.name, description:d.description,max:d.levels.length,icon:d.icon}]; })),
  heal:{name:'Лечебный воск',description:'Восстановить 24 здоровья',max:Infinity,icon:'heal'},
  haste:{name:'Попутный свет',description:'+30% скорости на 20 секунд',max:Infinity,icon:'haste'},
  fury:{name:'Жар огня',description:'+40% урона на 20 секунд',max:Infinity,icon:'fury'}
} as Record<UpgradeId, { name: string; description: string; max: number; icon: string }>;
export function validateContent(): void {
  const ids = new Set<string>();
  for (const d of [...Object.values(WEAPONS),...Object.values(PASSIVES),...Object.values(ENEMIES)]) {
    if (ids.has(d.id)) throw new Error(`Повтор контента ${d.id}`); ids.add(d.id);
    if ('levels' in d && d.levels.length !== (d.id in WEAPONS ? 5 : 3)) throw new Error(`Уровни ${d.id}`);
    if ('levels' in d) for (const value of d.levels) {
      if (typeof value === 'number' ? !Number.isFinite(value) || value < 0 : Object.values(value).some(n => !Number.isFinite(n) || n <= 0)) throw new Error(`Параметры ${d.id}`);
    }
  }
}
validateContent();
