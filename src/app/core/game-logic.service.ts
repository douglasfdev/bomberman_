import { Injectable, inject, signal } from '@angular/core';
import {
  BASE_BOMBS,
  BASE_MOVE_DURATION_MS,
  BASE_RANGE,
  BOMB_FUSE_MS,
  ENEMY_COUNT,
  EXPLOSION_MS,
  MIN_MOVE_DURATION_MS,
  POWER_UP_DROP_CHANCE,
  SCORE_BOX,
  SCORE_ENEMY,
  SCORE_POWER_UP,
  SPEED_STEP_MS,
  ENEMY_MOVE_INTERVAL_MS,
  ENEMY_BOMB_INTERVAL_MS,
  ENEMY_BOMB_CHANCE,
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
  readonly highScore = signal(0);
  readonly enemiesRemaining = signal(0);
  readonly maxBombs = signal(BASE_BOMBS);
  readonly range = signal(BASE_RANGE);
  readonly speed = signal(0);
  readonly pierce = signal(false);
  readonly gamePhase = signal<GamePhase>(GamePhase.Playing);
  readonly exitOpen = signal(false);

  private player: PlayerState = { position: { x: 1, y: 1 }, alive: true, maxBombs: BASE_BOMBS, range: BASE_RANGE, moveDurationMs: BASE_MOVE_DURATION_MS, pierce: false };
  private enemies: EnemyState[] = [];
  private bombs: Bomb[] = [];
  private explosions: Explosion[] = [];
  private powerUps: PowerUpDrop[] = [];

  private currentMove: MoveTiming | null = null;
  private lastTickMs = 0;

  constructor() {
    const savedHighScore = localStorage.getItem('highScore');
    if (savedHighScore) {
      this.highScore.set(Number(savedHighScore));
    }
  }

  start(): void {
    this.level.generate();
    this.resetGame();
    this.gamePhase.set(GamePhase.Playing);
  }

  restart(): void {
    this.level.generate();
    this.resetGame();
    this.gamePhase.set(GamePhase.Playing);
  }

  private resetGame(): void {
    this.score.set(0);
    this.enemiesRemaining.set(ENEMY_COUNT);
    this.maxBombs.set(BASE_BOMBS);
    this.range.set(BASE_RANGE);
    this.speed.set(0);
    this.pierce.set(false);
    this.exitOpen.set(false);

    this.player = {
      position: { ...this.level.playerSpawn },
      alive: true,
      maxBombs: BASE_BOMBS,
      range: BASE_RANGE,
      moveDurationMs: BASE_MOVE_DURATION_MS,
      pierce: false
    };

    this.enemies = Array.from({ length: ENEMY_COUNT }, (_, i) => ({
      id: i + 1,
      position: { ...this.level.enemySpawns[i] },
      alive: true,
      moveDurationMs: BASE_MOVE_DURATION_MS,
      nextMoveAtMs: 0,
      nextBombAtMs: ENEMY_BOMB_INTERVAL_MS,
      currentDirection: null,
    }));

    this.bombs = [];
    this.explosions = [];
    this.powerUps = [];
    this.currentMove = null;
    this.lastTickMs = 0;
  }

  tick(deltaMs: number): void {
    if (this.gamePhase() !== GamePhase.Playing) return;

    const now = performance.now();
    if (this.lastTickMs === 0) this.lastTickMs = now;
    const elapsed = now - this.lastTickMs;
    this.lastTickMs = now;

    this.updatePlayer(elapsed);
    this.updateEnemies(elapsed, now);
    this.updateBombs(now);
    this.updateExplosions(now);
    this.checkCollisions();
    this.checkWinCondition();
  }

  move(direction: Direction | null): void {
    if (this.gamePhase() !== GamePhase.Playing || !this.player.alive) return;
    if (this.currentMove) return;

    const delta = directionDelta(direction!);
    const target = { x: this.player.position.x + delta.x, y: this.player.position.y + delta.y };

    if (!this.level.isInBounds(target) || !this.level.isWalkable(target)) return;
    if (this.bombs.some(b => samePosition(b.position, target))) return;

    this.currentMove = {
      from: { ...this.player.position },
      to: target,
      elapsed: 0,
      duration: this.player.moveDurationMs,
    };
  }

  plantBomb(): void {
    if (this.gamePhase() !== GamePhase.Playing || !this.player.alive) return;
    if (this.bombs.filter(b => samePosition(b.position, this.player.position)).length >= this.maxBombs()) return;

    this.bombs.push({
      id: Date.now(),
      position: { ...this.player.position },
      range: this.range(),
      pierce: this.pierce(),
      plantedAtMs: performance.now(),
    });
  }

  private updatePlayer(elapsed: number): void {
    if (!this.currentMove) return;

    this.currentMove.elapsed += elapsed;

    if (this.currentMove.elapsed >= this.currentMove.duration) {
      this.player.position = { ...this.currentMove.to };
      this.currentMove = null;
    }
  }

  private updateEnemies(elapsed: number, now: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // Movimento da IA
      if (now >= enemy.nextMoveAtMs) {
        const possibleDirs: Direction[] = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
        let bestDir: Direction | null = null;
        let minDist = Infinity;

        for (const dir of possibleDirs) {
          const delta = directionDelta(dir);
          const targetPos = { x: enemy.position.x + delta.x, y: enemy.position.y + delta.y };

          if (this.level.isInBounds(targetPos) && this.level.isWalkable(targetPos) && !this.bombs.some(b => samePosition(b.position, targetPos))) {
            const dist = manhattan(targetPos, this.player.position);
            if (dist < minDist) {
              minDist = dist;
              bestDir = dir;
            }
          }
        }

        // Fallback para movimento aleatório se ficar preso ou por probabilidade
        if (!bestDir || Math.random() > 0.7) {
          const validDirs = possibleDirs.filter(dir => {
            const delta = directionDelta(dir);
            const targetPos = { x: enemy.position.x + delta.x, y: enemy.position.y + delta.y };
            return this.level.isInBounds(targetPos) && this.level.isWalkable(targetPos) && !this.bombs.some(b => samePosition(b.position, targetPos));
          });
          if (validDirs.length > 0) {
            bestDir = validDirs[Math.floor(Math.random() * validDirs.length)];
          }
        }

        if (bestDir) {
          const delta = directionDelta(bestDir);
          enemy.currentDirection = bestDir;
          enemy.nextMoveAtMs = now + ENEMY_MOVE_INTERVAL_MS;
          enemy.position = { x: enemy.position.x + delta.x, y: enemy.position.y + delta.y };
        } else {
          enemy.nextMoveAtMs = now + ENEMY_MOVE_INTERVAL_MS;
        }
      }

      // Plantio de Bombas pela IA
      if (now >= enemy.nextBombAtMs && Math.random() < ENEMY_BOMB_CHANCE) {
        this.bombs.push({
          id: Date.now() + enemy.id,
          position: { ...enemy.position },
          range: 2,
          pierce: false,
          plantedAtMs: now,
        });
        enemy.nextBombAtMs = now + ENEMY_BOMB_INTERVAL_MS;
      }
    }
  }

  private updateBombs(now: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      if (now - this.bombs[i].plantedAtMs >= BOMB_FUSE_MS) {
        this.explode(this.bombs[i]);
        this.bombs.splice(i, 1);
      }
    }
  }

  private updateExplosions(now: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      if (now - this.explosions[i].expiresAtMs > EXPLOSION_MS) {
        this.explosions.splice(i, 1);
      }
    }
  }

  private explode(bomb: Bomb): void {
    const tiles: GridPosition[] = [bomb.position];
    const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

    for (const dir of dirs) {
      const delta = directionDelta(dir);
      for (let r = 1; r <= bomb.range; r++) {
        const pos = { x: bomb.position.x + delta.x * r, y: bomb.position.y + delta.y * r };
        if (!this.level.isInBounds(pos)) break;

        tiles.push(pos);

        const tile = this.level.tileAt(pos);
        if (tile.type === TileType.Wall) break;
      }
    }

    const id = Date.now();
    this.explosions.push({
      id,
      position: bomb.position,
      tiles,
      expiresAtMs: performance.now() + EXPLOSION_MS,
    });
  }

  private checkCollisions(): void {
    // Jogador vs Explosões
    for (const exp of this.explosions) {
      if (samePosition(this.player.position, exp.position) || exp.tiles.some(t => samePosition(t, this.player.position))) {
        if (!this.pierce()) {
          this.player.alive = false;
          this.gamePhase.set(GamePhase.Defeat);
          this.updateHighScore();
          return;
        }
      }
    }

    // Inimigos vs Explosões e Jogador
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      let hit = false;
      for (const exp of this.explosions) {
        if (samePosition(enemy.position, exp.position) || exp.tiles.some(t => samePosition(t, enemy.position))) {
          hit = true;
          break;
        }
      }

      if (hit) {
        enemy.alive = false;
        this.enemiesRemaining.set(this.enemiesRemaining() - 1);
        this.score.update(s => s + SCORE_ENEMY);

        // Chance de dropar power-up
        if (Math.random() < POWER_UP_DROP_CHANCE) {
          const types: PowerUpType[] = [PowerUpType.Range, PowerUpType.Bomb, PowerUpType.Speed];
          this.powerUps.push({
            position: { ...enemy.position },
            type: types[Math.floor(Math.random() * types.length)],
          });
        }
      }

      // Colisão Jogador vs Inimigo
      if (samePosition(this.player.position, enemy.position)) {
        this.player.alive = false;
        this.gamePhase.set(GamePhase.Defeat);
        this.updateHighScore();
        return;
      }
    }

    // Coleta de Power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      if (samePosition(this.player.position, this.powerUps[i].position)) {
        const pu = this.powerUps.splice(i, 1)[0];
        this.score.update(s => s + SCORE_POWER_UP);
        switch (pu.type) {
          case PowerUpType.Range: this.range.update(r => r + 1); break;
          case PowerUpType.Bomb: this.maxBombs.update(b => b + 1); break;
          case PowerUpType.Speed: this.player.moveDurationMs = Math.max(MIN_MOVE_DURATION_MS, this.player.moveDurationMs - SPEED_STEP_MS); break;
        }
      }
    }

    // Saída
    if (this.exitOpen() && samePosition(this.player.position, this.level.exitBox)) {
      this.gamePhase.set(GamePhase.Victory);
      this.updateHighScore();
    }
  }

  private checkWinCondition(): void {
    if (this.enemiesRemaining() <= 0 && !this.exitOpen()) {
      this.exitOpen.set(true);
      this.level.setTile(this.level.exitBox, TileType.Exit);
    }
  }

  private updateHighScore(): void {
    const current = this.score();
    if (current > this.highScore()) {
      this.highScore.set(current);
      localStorage.setItem('highScore', current.toString());
    }
  }

  // Getters para renderização
  getPlayerView(): EntityView | null {
    if (!this.currentMove) return { position: this.player.position, move: null };
    const progress = Math.min(this.currentMove.elapsed / this.currentMove.duration, 1);
    return {
      position: this.player.position,
      move: { from: this.currentMove.from, to: this.currentMove.to, progress },
    };
  }

  getEnemyViews(): EnemyView[] {
    return this.enemies.map(e => ({
      id: e.id,
      position: e.position,
      move: null,
    }));
  }

  getBombs(): Bomb[] { return this.bombs; }
  getExplosions(): Explosion[] { return this.explosions; }
  getPowerUps(): PowerUpDrop[] { return this.powerUps; }
  getGrid(): Tile[][] { return this.level.grid; }
  getExitBox(): GridPosition { return this.level.exitBox; }
  getGameTimeMs(): number { return performance.now(); }
}
