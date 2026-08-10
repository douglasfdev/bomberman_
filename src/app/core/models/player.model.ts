import { GridPosition } from './position.model';

export interface PlayerState {
  position: GridPosition;
  alive: boolean;
  maxBombs: number;
  range: number;
  moveDurationMs: number;
  pierce: boolean;
}
