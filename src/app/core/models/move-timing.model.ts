import { GridPosition } from './position.model';

export interface MoveTiming {
  from: GridPosition;
  to: GridPosition;
  elapsed: number;
  duration: number;
}