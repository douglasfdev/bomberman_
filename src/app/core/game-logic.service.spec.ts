import { TestBed } from '@angular/core/testing';
import { GameLogicService } from './game-logic.service';
import { LevelService } from './level.service';
import { BASE_BOMBS, BASE_MOVE_DURATION_MS } from './models/game-config';
import { Direction } from './models/direction.model';
import { GamePhase } from './models/game-state.model';
import { GridPosition } from './models/position.model';
import { PowerUpType } from './models/power-up.model';
import { TileType } from './models/tile.model';

describe('GameLogicService', () => {
  let logic: GameLogicService;
  let level: LevelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    logic = TestBed.inject(GameLogicService);
    level = (logic as unknown as { level: LevelService }).level;
    logic.start(42);
  });

  const tickMove = (): void => logic.tick(BASE_MOVE_DURATION_MS + 10);

  it('reinicia o estado e popula o nível', () => {
    expect(logic.score()).toBe(0);
    expect(logic.gamePhase()).toBe(GamePhase.Playing);
    expect(logic.enemiesRemaining()).toBe(3);
    expect(logic.getPlayerView().position).toEqual({ x: 1, y: 1 });
    expect(logic.getEnemyViews().length).toBe(3);
  });

  it('move o jogador um tile por transição', () => {
    logic.move(Direction.Right);
    tickMove();
    expect(logic.getPlayerView().position).toEqual({ x: 2, y: 1 });
  });

  it('não atravessa paredes nem caixas', () => {
    logic.move(Direction.Left);
    tickMove();
    expect(logic.getPlayerView().position).toEqual({ x: 1, y: 1 });

    level.setTile({ x: 2, y: 1 }, TileType.Box);
    logic.move(Direction.Right);
    tickMove();
    expect(logic.getPlayerView().position).toEqual({ x: 1, y: 1 });
  });

  it('mantém a direção pressionada para continuar andando', () => {
    level.setTile({ x: 1, y: 2 }, TileType.Empty);
    level.setTile({ x: 1, y: 3 }, TileType.Empty);
    level.setTile({ x: 1, y: 4 }, TileType.Empty);
    logic.move(Direction.Down);
    tickMove();
    expect(logic.getPlayerView().position).toEqual({ x: 1, y: 2 });
    tickMove();
    expect(logic.getPlayerView().position).toEqual({ x: 1, y: 3 });
  });

  it('derrota o jogador por contato com inimigo', () => {
    const enemies = (logic as unknown as { enemies: Array<{ position: GridPosition; alive: boolean }> }).enemies;
    enemies[0].position = { x: 2, y: 1 };
    logic.move(Direction.Right);
    tickMove();
    expect(logic.gamePhase()).toBe(GamePhase.Defeat);
  });

  it('mantém inimigos vivos parados nesta fase', () => {
    for (let i = 0; i < 10; i++) {
      logic.tick(50);
    }
    expect(logic.getEnemyViews().map((v) => v.id)).toEqual([1, 2, 3]);
  });

  describe('bombas e explosão', () => {
    it('limita bombas simultâneas ao máximo', () => {
      logic.plantBomb();
      logic.plantBomb();
      expect(logic.getBombs().length).toBe(1);
    });

    it('explode em cruz após o timer', () => {
      logic.plantBomb();
      logic.tick(3001);
      const explosions = logic.getExplosions();
      expect(explosions.length).toBe(1);
      const tiles = explosions[0].tiles;
      expect(tiles).toContainEqual({ x: 1, y: 1 });
      expect(tiles).toContainEqual({ x: 2, y: 1 });
      expect(tiles).toContainEqual({ x: 1, y: 2 });
      expect(tiles).not.toContainEqual({ x: 0, y: 1 });
      expect(tiles).not.toContainEqual({ x: 1, y: 0 });
    });

    it('destrói caixas no raio da explosão', () => {
      logic.move(Direction.Down);
      tickMove();
      level.setTile({ x: 2, y: 2 }, TileType.Box);
      logic.plantBomb();
      logic.move(Direction.Up);
      tickMove();
      logic.move(Direction.Right);
      tickMove();
      logic.tick(3001);
      expect(level.tileAt({ x: 2, y: 2 }).type).toBe(TileType.Empty);
      expect(logic.gamePhase()).toBe(GamePhase.Playing);
    });

    it('não atravessa caixas sem o power-up', () => {
      (logic as unknown as { player: { range: number; pierce: boolean } }).player.range = 3;
      logic.move(Direction.Down);
      tickMove();
      level.setTile({ x: 2, y: 2 }, TileType.Box);
      level.setTile({ x: 3, y: 2 }, TileType.Box);
      logic.plantBomb();
      logic.move(Direction.Up);
      tickMove();
      logic.move(Direction.Right);
      tickMove();
      logic.tick(3001);
      expect(level.tileAt({ x: 2, y: 2 }).type).toBe(TileType.Empty);
      expect(level.tileAt({ x: 3, y: 2 }).type).toBe(TileType.Box);
    });

    it('com power-up atravessa caixas', () => {
      const player = (logic as unknown as { player: { range: number; pierce: boolean } }).player;
      player.range = 3;
      player.pierce = true;
      logic.move(Direction.Down);
      tickMove();
      level.setTile({ x: 2, y: 2 }, TileType.Box);
      level.setTile({ x: 3, y: 2 }, TileType.Box);
      logic.plantBomb();
      logic.move(Direction.Up);
      tickMove();
      logic.move(Direction.Right);
      tickMove();
      logic.tick(3001);
      expect(level.tileAt({ x: 2, y: 2 }).type).toBe(TileType.Empty);
      expect(level.tileAt({ x: 3, y: 2 }).type).toBe(TileType.Empty);
    });

    it('derrota o jogador que está na área da explosão', () => {
      logic.plantBomb();
      logic.tick(3001);
      expect(logic.gamePhase()).toBe(GamePhase.Defeat);
    });
  });
});
