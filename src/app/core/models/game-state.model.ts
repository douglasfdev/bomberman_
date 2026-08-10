import { GridPosition } from './position.model';
import { PowerUpType } from './power-up.model';

export enum GamePhase {
  Playing = 'playing',
  Victory = 'victory',
  Defeat = 'defeat',
}

export interface PowerUpDrop {
  readonly position: GridPosition;
  readonly type: PowerUpType;
}

export interface Explosion {
  readonly id: number;
  readonly position: GridPosition;
  readonly tiles: GridPosition[];
  readonly expiresAtMs: number;
}

export interface InterpolatedMove {
  readonly from: GridPosition;
  readonly to: GridPosition;
  readonly progress: number;
}

export interface EntityView {
  readonly position: GridPosition;
  readonly move: InterpolatedMove | null;
}

export interface EnemyView extends EntityView {
  readonly id: number;
}
