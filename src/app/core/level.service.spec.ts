import { LevelService } from './level.service';
import { GRID_SIZE } from './models/game-config';
import { manhattan } from './models/position.model';
import { TileType } from './models/tile.model';

describe('LevelService', () => {
  let service: LevelService;

  beforeEach(() => {
    service = new LevelService();
    service.generate(42);
  });

  it('gera uma grade 15x15', () => {
    expect(service.grid.length).toBe(GRID_SIZE);
    for (const row of service.grid) {
      expect(row.length).toBe(GRID_SIZE);
    }
  });

  it('cobre a borda com paredes indestrutíveis', () => {
    for (let i = 0; i < GRID_SIZE; i++) {
      expect(service.tileAt({ x: i, y: 0 }).type).toBe(TileType.Wall);
      expect(service.tileAt({ x: i, y: GRID_SIZE - 1 }).type).toBe(TileType.Wall);
      expect(service.tileAt({ x: 0, y: i }).type).toBe(TileType.Wall);
      expect(service.tileAt({ x: GRID_SIZE - 1, y: i }).type).toBe(TileType.Wall);
    }
  });

  it('posiciona paredes intercaladas em coordenadas ímpares', () => {
    expect(service.tileAt({ x: 3, y: 3 }).type).toBe(TileType.Wall);
    expect(service.tileAt({ x: 1, y: 5 }).type).toBe(TileType.Wall);
  });

  it('mantém os spawns livres de caixas', () => {
    const spawns = [service.playerSpawn, ...service.enemySpawns];
    for (const spawn of spawns) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) >= 2) {
            continue;
          }
          const p = { x: spawn.x + dx, y: spawn.y + dy };
          if (service.isInBounds(p)) {
            expect(service.tileAt(p).type).not.toBe(TileType.Box);
          }
        }
      }
    }
  });

  it('gera caixas destrutíveis', () => {
    let boxes = 0;
    for (const row of service.grid) {
      for (const cell of row) {
        if (cell.type === TileType.Box) {
          boxes++;
        }
      }
    }
    expect(boxes).toBeGreaterThan(0);
  });

  it('mantém os spawns andáveis', () => {
    const spawns = [service.playerSpawn, ...service.enemySpawns];
    expect(spawns.length).toBeGreaterThan(0);
    for (const spawn of spawns) {
      expect(service.tileAt(spawn).type).toBe(TileType.Empty);
      expect(service.isWalkable(spawn)).toBe(true);
    }
  });

  it('esconde a saída sob uma caixa', () => {
    expect(service.tileAt(service.exitBox).type).toBe(TileType.Box);
  });

  it('sorteia a saída longe dos spawns', () => {
    const spawns = [service.playerSpawn, ...service.enemySpawns];
    for (const spawn of spawns) {
      expect(manhattan(spawn, service.exitBox)).toBeGreaterThanOrEqual(5);
    }
  });
});
