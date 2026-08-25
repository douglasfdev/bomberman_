export enum CardRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  SYNERGY = 'SYNERGY',
}

export enum CardCategory {
  BOMB = 'BOMB',
  RANGE = 'RANGE',
  SPEED = 'SPEED',
  DEFENSE = 'DEFENSE',
  SYNERGY = 'SYNERGY',
  UTILITY = 'UTILITY',
}

export interface Card {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: CardRarity;
  category: CardCategory;
  maxStacks: number;
  prerequisites: string[];
  weight: number;
  isSynergy: boolean;
  synergyWith: string[];
  minPhase?: number;
}

export interface CardDTO {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'SYNERGY';
  category: string;
  maxStacks: number;
}

export interface CardPoolConfig {
  cards: Card[];
  offeredPerDraft: number;
  noRepeatInRun: boolean;
}