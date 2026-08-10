import { GridPosition } from './position.model';

export interface EnemyState {
  readonly id: number;
  position: GridPosition;
  alive: boolean;
  moveDurationMs: number;
}
