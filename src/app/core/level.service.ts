import { Injectable } from '@angular/core';
import {
  BOX_CHANCE,
  ENEMY_COUNT,
  EXIT_MIN_SPAWN_DISTANCE,
  GRID_SIZE,
  SPAWN_CLEAR_RADIUS,
} from './models/game-config';
import { GridPosition, manhattan } from './models/position.model';
import { Tile, TileType, tile } from './models/tile.model';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

@Injectable({ providedIn: 'root' })
export class LevelService {
  grid: Tile[][] = [];
  playerSpawn: GridPosition = { x: 1, y: 1 };
  enemySpawns: GridPosition[] = [];
  exitBox: GridPosition = { x: 1, y: 1 };
  private rng: () => number = Math.random;

  generate(seed?: number): void {
    this.rng = mulberry32(seed ?? Math.floor(Math.random() * 0xffffffff));
    this.grid = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => tile(TileType.Empty)),
    );
    this.placeWalls();
    this.playerSpawn = { x: 1, y: 1 };
    this.enemySpawns = this.computeEnemySpawns();
    const spawns = [this.playerSpawn, ...this.enemySpawns];
    for (const s of spawns) {
      this.setTile(s, TileType.Empty);
    }
    this.placeBoxes(spawns);
    this.exitBox = this.chooseExitBox(spawns);
  }

  tileAt(p: GridPosition): Tile {
    if (!this.isInBounds(p)) {
      return tile(TileType.Wall);
    }
    return this.grid[p.y][p.x];
  }

  isInBounds(p: GridPosition): boolean {
    return p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE;
  }

  isWalkable(p: GridPosition): boolean {
    const type = this.tileAt(p).type;
    return type === TileType.Empty || type === TileType.Exit;
  }

  setTile(p: GridPosition, type: TileType): void {
    if (!this.isInBounds(p)) {
      return;
    }
    this.grid[p.y][p.x] = tile(type);
  }

  tilePositions(type: TileType): GridPosition[] {
    const out: GridPosition[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x].type === type) {
          out.push({ x, y });
        }
      }
    }
    return out;
  }

  random(): number {
    return this.rng();
  }

  randomInt(max: number): number {
    return Math.floor(this.rng() * max);
  }

  private placeWalls(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const border = x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1;
        const interleaved = x % 2 === 1 && y % 2 === 1;
        if (border || interleaved) {
          this.setTile({ x, y }, TileType.Wall);
        }
      }
    }
  }

  private computeEnemySpawns(): GridPosition[] {
    const c = GRID_SIZE - 2;
    return [
      { x: c, y: 1 },
      { x: 1, y: c },
      { x: c, y: c },
    ].slice(0, ENEMY_COUNT);
  }

  private placeBoxes(spawns: GridPosition[]): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const p = { x, y };
        if (this.tileAt(p).type !== TileType.Empty) {
          continue;
        }
        if (spawns.some((s) => manhattan(s, p) < SPAWN_CLEAR_RADIUS)) {
          continue;
        }
        if (this.rng() < BOX_CHANCE) {
          this.setTile(p, TileType.Box);
        }
      }
    }
  }

  private chooseExitBox(spawns: GridPosition[]): GridPosition {
    const boxes = this.tilePositions(TileType.Box);
    const far = boxes.filter((p) => spawns.every((s) => manhattan(s, p) >= EXIT_MIN_SPAWN_DISTANCE));
    const pool = far.length > 0 ? far : boxes;
    if (pool.length === 0) {
      this.setTile({ x: 2, y: 2 }, TileType.Box);
      return { x: 2, y: 2 };
    }
    return pool[this.randomInt(pool.length)];
  }
}
