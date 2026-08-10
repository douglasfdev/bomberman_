import { GridPosition } from './position.model';

export interface Bomb {
  readonly id: number;
  readonly position: GridPosition;
  readonly range: number;
  readonly pierce: boolean;
  plantedAtMs: number;
}
