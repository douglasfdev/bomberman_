import { GridPosition } from './position.model';
import { Direction } from './direction.model';

export interface EnemyState {
  readonly id: number;
  position: GridPosition;
  alive: boolean;
  moveDurationMs: number;
  
  // Estado da IA
  nextMoveAtMs: number;
  nextBombAtMs: number;
  currentDirection: Direction | null;
}
