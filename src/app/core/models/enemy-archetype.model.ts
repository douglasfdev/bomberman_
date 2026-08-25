export interface EnemyArchetype {
  id: string;
  key: string;
  name: string;
  baseHp: number;
  baseSpeed: number;
  baseDamage: number;
  bombRange: number;
  bombChance: number;
  abilities: EnemyAbility[];
  scalePerPhase: EnemyScaleConfig;
  minPhase: number;
  weight: number;
  isBoss: boolean;
}

export type EnemyAbility =
  | 'FREEZE_IMMUNE'
  | 'FAST_BOMB'
  | 'PHASE_WALLS'
  | 'LONG_RANGE'
  | 'ON_DEATH_SPLIT'
  | 'FRONTAL_SHIELD'
  | 'BLINK'
  | 'SUMMON_GRUNT'
  | 'PHASE_SHIFT'
  | 'BOMB_STORM'
  | 'FREEZE_AURA'
  | 'ENRAGE'
  | 'METEOR'
  | 'VOID_ZONE';

export interface EnemyScaleConfig {
  hpMult: number;
  speedMult: number;
  bombRangeMult?: number;
  bombChanceAdd?: number;
  newAbilityAt?: Record<number, EnemyAbility>;
}

export interface ScaledEnemyStats {
  hp: number;
  speed: number;
  damage: number;
  bombRange: number;
  bombChance: number;
  abilities: EnemyAbility[];
}

export interface EnemyArchetypeDTO {
  key: string;
  name: string;
  baseHp: number;
  baseSpeed: number;
  abilities: string[];
  minPhase: number;
  isBoss: boolean;
}