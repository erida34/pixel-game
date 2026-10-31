import type { Direction } from './direction';
export type WeaponId = 'amber_lantern' | 'glass_needles' | 'ember_moths' | 'root_bell';
export type PassiveId = 'wick' | 'brass_lens' | 'boots' | 'wax_seal' | 'firefly_jar' | 'keepers_watch';
export type ContentId = WeaponId | PassiveId;
export type UpgradeId = ContentId | 'heal' | 'haste' | 'fury';
export type Inventory = Record<ContentId, number>;
export type EnemyId = 'root_crawler' | 'wax_walker' | 'moth_swarm' | 'thorn_runner' | 'bell_spitter' | 'lantern_thief' | 'greenhouse_heart';
export interface WeaponLevel { damage: number; radius: number; interval: number; count: number; pierce: number }
export interface WeaponDefinition { id: WeaponId; name: string; description: string; icon: string; strategy: 'pulse' | 'projectile' | 'orbit' | 'delayed'; levels: readonly WeaponLevel[] }
export interface PassiveDefinition { id: PassiveId; name: string; description: string; icon: string; modifier: 'damage' | 'area' | 'speed' | 'armor' | 'pickup' | 'cooldown'; levels: readonly number[] }
export interface EnemyDefinition { id: EnemyId; name: string; strategy: 'chase' | 'swarm' | 'dash' | 'ranged' | 'flank'; hp: number; speed: number; radius: number; damage: number; xp: number; introducedAt: number; prepare: number; attack: number; recovery: number; range: number }
export type RunPhase = 'running' | 'paused' | 'upgrade' | 'ended';
export interface RunConfig {
  duration: number; step: number; maxAccumulator: number;
  bossAt?: number; waves?: readonly Wave[];
  hero: { hp: number; speed: number; radius: number; invulnerability: number; pickupRadius: number; magnetSpeed: number };
  lantern: { damage: number; radius: number; interval: number; damagePerLevel: number; intervalPerLevel: number; minInterval: number };
  crawler: { hp: number; speed: number; radius: number; damage: number; xp: number; deathSeconds: number };
  spawn: { first: number; interval: number; minInterval: number; acceleration: number; radius: number; maxEnemies: number; maxXp: number; hpPerMinute: number; speedPerMinute: number };
  upgrades: { lensPerLevel: number; speedPerLevel: number; heal: number; buffSeconds: number; haste: number; fury: number };
  xp: { first: number; perLevel: number };
}
export interface Wave { at: number; interval: number; weights: Partial<Record<EnemyId, number>> }
export interface BossState { enemy: Enemy; attack: 'thorns' | 'summon'; enraged: boolean; nextAttack: number; summons: { x: number; y: number }[]; ring: { x: number; y: number; at: number } | null }
export interface Enemy { id: number; kind: EnemyId; active: boolean; x: number; y: number; hp: number; speed: number; direction: Direction; hitAt: number; diedAt: number | null; state: 'move' | 'prepare' | 'attack' | 'recover'; stateAt: number; nextAttack: number; aimX: number; aimY: number }
export interface Projectile { id: number; active: boolean; owner: 'hero' | 'enemy'; x: number; y: number; vx: number; vy: number; radius: number; damage: number; remaining: number; expiresAt: number; bornAt: number; hitIds: Set<number> }
export interface BellStrike { id: number; x: number; y: number; radius: number; damage: number; at: number }
export interface Pickup { id: number; active: boolean; kind: 'wax' | 'magnet'; x: number; y: number }
export interface XpSpark { id: number; active: boolean; x: number; y: number; value: number; attracted: boolean }
export type RunEvent = { type: 'pulse' | 'bell' | 'pickup' | 'impact' | 'cast'; x: number; y: number; radius: number; weapon?: WeaponId | 'enemy' } | { type: 'hit' } | { type: 'death'; id: number };
export interface RunResult { outcome: 'defeat' | 'prototype_complete' | 'victory'; elapsedSeconds: number; level: number; kills: number; seed: number; inventory: Inventory; bossDefeated: boolean }
