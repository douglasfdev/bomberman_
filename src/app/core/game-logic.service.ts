import { Injectable, inject, signal } from '@angular/core';
import {
  BASE_BOMBS,
  BASE_MOVE_DURATION_MS,
  BASE_RANGE,
  ENEMY_COUNT,
  MIN_MOVE_DURATION_MS,
  SCORE_POWER_UP,
  SPEED_STEP_MS,
} from './models/game-config';
import { Direction, directionDelta } from './models/direction.model';
import { Bomb } from './models/bomb.model';
import { EnemyState } from './models/enemy.model';
import {
  EnemyView,
  EntityView,
  Explosion,
  GamePhase,
  InterpolatedMove,
  PowerUpDrop,
} from './models/game-state.model';
import { PlayerState } from './models/player.model';
import { GridPosition, keyOf, manhattan, samePosition } from './models/position.model';
import { PowerUpType } from './models/power-up.model';
import { Tile, TileType } from './models/tile.model';
import { LevelService } from './level.service';

interface MoveTiming {
  from: GridPosition;
  to: GridPosition;
  elapsed: number;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class GameLogicService {
  private readonly level = inject(LevelService);

  readonly score = signal(0);
  readonly enemiesRemaining = signal(0);
  readonly maxBombs = signal(BASE_BOMBS);
  readonly range = signal(BASE_RANGE);
  readonly speed = signal(0);
  readonly pierce = signal(false);
  readonly gamePhase = signal<GamePhase>(GamePhase.Playing);
  readonly exitOpen = signal(false);

  private player!: PlayerState;
  private enemies: EnemyState[] = [];
  private bombs: Bomb[] = [];
  private explosions: Explosion[] = [];
  private powerUps: PowerUpDrop[] = [];
  private playerMove: MoveTiming | null = null;
  private readonly enemyMoves = new Map<number, MoveTiming>();
  private activeDirection: Direction | null = null;
  private gameTimeMs = 0;
  private nextBombId = 1;
  private nextExplosionId = 1;

  start(seed?: number): void {
    this.level.generate(seed);
    this.score.set(0);
    this.maxBombs.set(BASE_BOMBS);
    this.range.set(BASE_RANGE);
    this.speed.set(0);
    this.pierce.set(false);
    this.gamePhase.set(GamePhase.Playing);
    this.exitOpen.set(false);

    this.player = {
      position: { ...this.level.playerSpawn },
      alive: true,
      maxBombs: BASE_BOMBS,
      range: BASE_RANGE,
      moveDurationMs: BASE_MOVE_DURATION_MS,
      pierce: false,
    };
    this.enemies = this.level.enemySpawns.map((position, i) => ({
      id: i + 1,
      position: { ...position },
      alive: true,
      moveDurationMs: Math.round(BASE_MOVE_DURATION_MS * 1.15 * (1 + (i - 1) * 0.08)),
    }));
    this.enemiesRemaining.set(this.enemies.length);

    this.bombs = [];
    this.explosions = [];
    this.powerUps = [];
    this.playerMove = null;
    this.enemyMoves.clear();
    this.activeDirection = null;
    this.gameTimeMs = 0;
    this.nextBombId = 1;
    this.nextExplosionId = 1;
  }

  restart(): void {
    this.start();
  }

  tick(deltaMs: number): void {
    this.gameTimeMs += deltaMs;
    if (this.gamePhase() !== GamePhase.Playing) {
      return;
    }
    this.advancePlayer(deltaMs);
  }

  move(direction: Direction | null): void {
    this.activeDirection = direction;
  }

  plantBomb(): void {
    if (this.gamePhase() !== GamePhase.Playing || !this.player.alive) {
      return;
    }
    if (this.bombs.length >= this.player.maxBombs) {
      return;
    }
    this.bombs.push({
      id: this.nextBombId++,
      position: { ...this.player.position },
      range: this.player.range,
      pierce: this.player.pierce,
      plantedAtMs: this.gameTimeMs,
    });
  }

  getGameTimeMs(): number {
    return this.gameTimeMs;
  }

  getGrid(): Tile[][] {
    return this.level.grid;
  }

  getPlayerView(): EntityView {
    return {
      position: { ...this.player.position },
      move: this.playerMove ? this.toView(this.playerMove) : null,
    };
  }

  getEnemyViews(): EnemyView[] {
    return this.enemies
      .filter((e) => e.alive)
      .sort((a, b) => a.id - b.id)
      .map((e) => {
        const move = this.enemyMoves.get(e.id);
        return {
          id: e.id,
          position: { ...e.position },
          move: move ? this.toView(move) : null,
        };
      });
  }

  getBombs(): Bomb[] {
    return [...this.bombs];
  }

  getExplosions(): Explosion[] {
    return [...this.explosions];
  }

  getPowerUps(): PowerUpDrop[] {
    return [...this.powerUps];
  }

  getExitBox(): GridPosition {
    return { ...this.level.exitBox };
  }

  private toView(move: MoveTiming): InterpolatedMove {
    return {
      from: { ...move.from },
      to: { ...move.to },
      progress: Math.min(1, move.elapsed / Math.max(1, move.duration)),
    };
  }

  private advancePlayer(deltaMs: number): void {
    if (!this.player.alive) {
      return;
    }
    if (!this.playerMove) {
      this.beginPlayerMove(this.activeDirection);
    }
    if (this.playerMove) {
      this.playerMove.elapsed += deltaMs;
      if (this.playerMove.elapsed >= this.playerMove.duration) {
        this.player.position = { ...this.playerMove.to };
        this.playerMove = null;
        this.onPlayerSettled();
        if (this.gamePhase() === GamePhase.Playing) {
          this.beginPlayerMove(this.activeDirection);
        }
      }
    }
  }

  private beginPlayerMove(direction: Direction | null): void {
    if (!direction || !this.player.alive || this.gamePhase() !== GamePhase.Playing) {
      return;
    }
    const delta = directionDelta(direction);
    const target: GridPosition = {
      x: this.player.position.x + delta.x,
      y: this.player.position.y + delta.y,
    };
    if (!this.level.isWalkable(target)) {
      return;
    }
    const enemy = this.enemies.find((e) => e.alive && samePosition(e.position, target));
    if (enemy) {
      this.defeat();
      return;
    }
    this.playerMove = {
      from: { ...this.player.position },
      to: target,
      elapsed: 0,
      duration: this.player.moveDurationMs,
    };
  }

  private onPlayerSettled(): void {
    const position = this.player.position;
    const dropIndex = this.powerUps.findIndex((drop) => samePosition(drop.position, position));
    if (dropIndex >= 0) {
      const [drop] = this.powerUps.splice(dropIndex, 1);
      this.applyPowerUp(drop.type);
      this.score.update((s) => s + SCORE_POWER_UP);
    }
    if (this.level.tileAt(position).type === TileType.Exit && this.enemiesRemaining() === 0) {
      this.victory();
    }
  }

  private applyPowerUp(type: PowerUpType): void {
    switch (type) {
      case PowerUpType.Bomb:
        this.player.maxBombs += 1;
        this.maxBombs.set(this.player.maxBombs);
        break;
      case PowerUpType.Range:
        this.player.range += 1;
        this.range.set(this.player.range);
        break;
      case PowerUpType.Speed:
        this.player.moveDurationMs = Math.max(
          MIN_MOVE_DURATION_MS,
          this.player.moveDurationMs - SPEED_STEP_MS,
        );
        this.speed.update((s) => s + 1);
        break;
      case PowerUpType.Pierce:
        this.player.pierce = true;
        this.pierce.set(true);
        break;
    }
  }

  private victory(): void {
    this.gamePhase.set(GamePhase.Victory);
  }

  private defeat(): void {
    if (this.gamePhase() !== GamePhase.Playing) {
      return;
    }
    this.player.alive = false;
    this.gamePhase.set(GamePhase.Defeat);
  }
}
