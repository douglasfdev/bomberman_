import { GridPosition } from './position.model';
import { Direction } from './direction.model';
import { MoveTiming } from './move-timing.model';

export interface EnemyState {
  readonly id: number;
  position: GridPosition;
  alive: boolean;
  moveDurationMs: number;
  currentMove: MoveTiming | null;

  // Estado da IA
  nextMoveAtMs: number;
  nextBombAtMs: number;
  currentDirection: Direction | null;
}