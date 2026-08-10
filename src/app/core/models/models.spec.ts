import { Direction, directionDelta } from './direction.model';
import { keyOf, manhattan, samePosition } from './position.model';

describe('core models', () => {
  it('directionDelta mapeia direções', () => {
    expect(directionDelta(Direction.Up)).toEqual({ x: 0, y: -1 });
    expect(directionDelta(Direction.Down)).toEqual({ x: 0, y: 1 });
    expect(directionDelta(Direction.Left)).toEqual({ x: -1, y: 0 });
    expect(directionDelta(Direction.Right)).toEqual({ x: 1, y: 0 });
  });

  it('samePosition e keyOf comparam posições', () => {
    expect(samePosition({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(samePosition({ x: 1, y: 2 }, { x: 2, y: 2 })).toBe(false);
    expect(keyOf({ x: 1, y: 2 })).toBe('1,2');
  });

  it('manhattan calcula distância em grade', () => {
    expect(manhattan({ x: 1, y: 1 }, { x: 4, y: 5 })).toBe(7);
  });
});
