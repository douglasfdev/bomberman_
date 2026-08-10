export enum TileType {
  Empty = 'empty',
  Wall = 'wall',
  Box = 'box',
  Exit = 'exit',
}

export interface Tile {
  readonly type: TileType;
}

export function tile(type: TileType): Tile {
  return { type };
}
