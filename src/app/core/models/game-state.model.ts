import { GridPosition } from './position.model';
import { PowerUpType } from './power-up.model';

export enum GamePhase {
  Ready = 'ready',
  Playing = 'playing',
  Draft = 'draft',
  Victory = 'victory',
  Defeat = 'defeat',
  RunEnd = 'run_end',
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
  readonly freeze?: boolean;
  readonly frozenEnemyIds?: number[];
  readonly mega?: boolean;
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