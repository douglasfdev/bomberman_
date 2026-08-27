import { GridPosition } from './position.model';

export interface PlayerState {
  position: GridPosition;
  alive: boolean;
  maxBombs: number;
  range: number;
  moveDurationMs: number;
  pierce: boolean;
  freezeBomb: boolean;
  lifeSteal: boolean;
  canKick: boolean;
  remoteDetonate: boolean;
  megaBombCharges: number;
  ghostWalkCd: number;
  revenge: boolean;
  reflect: boolean;
  shatter: boolean;
  ricochet: boolean;
  vampirism: boolean;
  magnetRange: number;
  bossSlayer: boolean;
  freezeChainDamage: number;
  chainPierceKick: boolean;
  megaRemoteRange: number;
  ghostKickInside: boolean;
  totalVampirism: boolean;
  lethalSpeedSlow: number;
  reflectChain: boolean;
}
