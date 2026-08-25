export interface Run {
  id: string;
  userId: string;
  seed: string;
  phase: number;
  maxPhase: number;
  lives: number;
  shield: number;
  timeLeftMs: number;
  score: number;
  startedAt: Date;
  endedAt: Date | null;
  endedReason: RunEndedReason | null;
  seedData: Record<string, unknown> | null;
  skillPoints: number;
  choices: RunChoice[];
  upgrades: RunUpgrade[];
  skills: { skillKey: string; level: number }[];
}

export interface RunChoice {
  id: string;
  runId: string;
  phase: number;
  offered: string[];
  picked: string;
  createdAt: Date;
}

export interface RunUpgrade {
  id: string;
  runId: string;
  cardKey: string;
  stacks: number;
  createdAt: Date;
}

export type RunEndedReason = 'TIME_UP' | 'NO_LIVES' | 'VICTORY' | 'QUIT';

export interface RunDTO {
  id: string;
  seed: string;
  phase: number;
  maxPhase: number;
  lives: number;
  shield: number;
  timeLeftMs: number;
  score: number;
  startedAt: string;
  endedAt: string | null;
  endedReason: RunEndedReason | null;
}

export interface DraftDTO {
  offered: string[];
  phase: number;
}

export interface ChoicePayload {
  phase: number;
  offered: string[];
  picked: string;
}

export interface EndRunPayload {
  score: number;
  timeLeftMs: number;
  reason: RunEndedReason;
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

export interface EnemyArchetypeDTO {
  key: string;
  name: string;
  baseHp: number;
  baseSpeed: number;
  abilities: string[];
  minPhase: number;
  isBoss: boolean;
}