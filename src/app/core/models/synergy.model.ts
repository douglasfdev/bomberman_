export type SynergyKey =
  | 'FREEZE_CHAIN'
  | 'SHATTER'
  | 'CHAIN_DETONATION'
  | 'MEGA_REMOTE'
  | 'GHOST_BOMB'
  | 'TOTAL_VAMPIRISM'
  | 'LETHAL_SPEED'
  | 'MASTER_REFLECTOR';

export interface SynergyDefinition {
  key: SynergyKey;
  name: string;
  description: string;
  requires: string[];
  effects: SynergyEffect[];
}

export type SynergyEffect =
  | { type: 'FREEZE_CHAIN_DAMAGE'; multiplier: number }
  | { type: 'SHATTER_INSTAKILL' }
  | { type: 'CHAIN_PIERCE_KICK' }
  | { type: 'MEGA_REMOTE_RANGE'; multiplier: number }
  | { type: 'GHOST_KICK_INSIDE_BOX' }
  | { type: 'VAMPIRISM_LIFESTEAL_COMBO' }
  | { type: 'SPEED_DEMON_SLOW'; slowPercent: number }
  | { type: 'REFLECT_CHAIN' };

export const SYNERGY_DEFINITIONS: SynergyDefinition[] = [
  {
    key: 'FREEZE_CHAIN',
    name: 'Cadeia Congelante',
    description: 'Congela + explode em cadeia; inimigos congelados levam 2x dano',
    requires: ['FREEZE_BOMB', 'BOMB_PLUS_1'],
    effects: [{ type: 'FREEZE_CHAIN_DAMAGE', multiplier: 2 }],
  },
  {
    key: 'SHATTER',
    name: 'Estilhaçar',
    description: 'Inimigo congelado = 1 hit kill (ignora HP)',
    requires: ['FREEZE_BOMB', 'SHATTER'],
    effects: [{ type: 'SHATTER_INSTAKILL' }],
  },
  {
    key: 'CHAIN_DETONATION',
    name: 'Detonação em Cadeia',
    description: 'Chuta bomba → explode → aciona outras → perfura caixas',
    requires: ['CHAIN_BOMB', 'PIERCE_BOMB', 'BOMB_KICK'],
    effects: [{ type: 'CHAIN_PIERCE_KICK' }],
  },
  {
    key: 'MEGA_REMOTE',
    name: 'Mega Remota',
    description: 'Detona mega-bomba no momento ideal; 3x alcance',
    requires: ['MEGA_BOMB', 'REMOTE_DETONATE'],
    effects: [{ type: 'MEGA_REMOTE_RANGE', multiplier: 3 }],
  },
  {
    key: 'GHOST_BOMB',
    name: 'Fantasma Bomba',
    description: 'Entra na caixa, chuta bomba para dentro, sai',
    requires: ['GHOST_WALK', 'BOMB_KICK'],
    effects: [{ type: 'GHOST_KICK_INSIDE_BOX' }],
  },
  {
    key: 'TOTAL_VAMPIRISM',
    name: 'Vampirismo Total',
    description: 'Caixas e inimigos dão vida; sustentação infinita se jogar bem',
    requires: ['LIFE_STEAL', 'VAMPIRISM'],
    effects: [{ type: 'VAMPIRISM_LIFESTEAL_COMBO' }],
  },
  {
    key: 'LETHAL_SPEED',
    name: 'Velocidade Letal',
    description: 'Inimigos lentos + você rápido = kite perfeito',
    requires: ['SPEED_DEMON', 'SPEED_PLUS_1'],
    effects: [{ type: 'SPEED_DEMON_SLOW', slowPercent: 20 }],
  },
  {
    key: 'MASTER_REFLECTOR',
    name: 'Refletor Mestre',
    description: 'Bomba inimiga reflectida vira cadeia sua',
    requires: ['BOMB_REFLECT', 'CHAIN_BOMB'],
    effects: [{ type: 'REFLECT_CHAIN' }],
  },
];

export function detectActiveSynergies(ownedCardKeys: string[]): SynergyKey[] {
  const owned = new Set(ownedCardKeys);
  return SYNERGY_DEFINITIONS
    .filter((s) => s.requires.every((r) => owned.has(r)))
    .map((s) => s.key);
}

export function getSynergyRequires(synergyKey: SynergyKey): string[] {
  return SYNERGY_DEFINITIONS.find((s) => s.key === synergyKey)?.requires ?? [];
}