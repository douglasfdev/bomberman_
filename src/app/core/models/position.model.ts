export interface GridPosition {
  x: number;
  y: number;
}

export function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

export function keyOf(p: GridPosition): string {
  return `${p.x},${p.y}`;
}

export function manhattan(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
