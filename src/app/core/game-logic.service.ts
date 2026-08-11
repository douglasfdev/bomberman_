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
import { MoveTiming } from './models/move-timing.model';
import { InputManagerService } from './input-manager.service';

@Injectable({ providedIn: 'root' })
export class GameLogicService {
  private readonly level = inject(LevelService);
  private readonly input = inject(InputManagerService);

  readonly score = signal(0);
  readonly highScore = signal(0);
  readonly enemiesRemaining = signal(0);
  readonly maxBombs = signal(BASE_BOMBS);
  readonly range = signal(BASE_RANGE);
  readonly speed = signal(0);
  readonly pierce = signal(false);
  readonly gamePhase = signal<GamePhase>(GamePhase.Ready);
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
    this.gamePhase.set(GamePhase.Ready);
  }

  play(): void {
    if (this.gamePhase() === GamePhase.Ready) {
      this.lastTickMs = 0; // Reseta o contador de tempo
      this.gamePhase.set(GamePhase.Playing);
    }
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
      currentMove: null,
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

    this.handleInput();
    this.updatePlayer(elapsed);
    this.updateEnemies(elapsed, now);
    this.updateBombs(now);
    this.updateExplosions(now);
    this.checkCollisions();
    this.checkWinCondition();
  }

  private handleInput(): void {
    const direction = this.input.getDirection();
    if (direction !== null) {
      this.move(direction);
    }
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

    // Verifica se o jogador já atingiu seu limite de bombas ativas
    const playerBombs = this.bombs.filter(b => b.planterId === 'player').length;
    if (playerBombs >= this.player.maxBombs) return;

    // Verifica se já existe uma bomba na posição atual
    if (this.bombs.some(b => samePosition(b.position, this.player.position))) return;

    this.bombs.push({
      id: Date.now(),
      planterId: 'player',
      position: { ...this.player.position },
      range: this.player.range,
      pierce: this.player.pierce,
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

      // Atualiza o movimento atual do inimigo
      if (enemy.currentMove) {
        enemy.currentMove.elapsed += elapsed;
        if (enemy.currentMove.elapsed >= enemy.currentMove.duration) {
          enemy.position = { ...enemy.currentMove.to };
          enemy.currentMove = null;
        }
        continue; // Se está se movendo, não toma nova decisão ainda
      }

      // Lógica de decisão da IA para o próximo movimento
      if (now >= enemy.nextMoveAtMs) {
        const possibleDirs: Direction[] = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
        let bestDir: Direction | null = null;
        let minDist = Infinity;

        // Tenta encontrar o jogador
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

        // Fallback para movimento aleatório
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
          const target = { x: enemy.position.x + delta.x, y: enemy.position.y + delta.y };
          enemy.currentMove = {
            from: { ...enemy.position },
            to: target,
            elapsed: 0,
            duration: enemy.moveDurationMs,
          };
          enemy.currentDirection = bestDir;
        }
        enemy.nextMoveAtMs = now + ENEMY_MOVE_INTERVAL_MS;
      }

      // Plantio de Bombas pela IA
      if (now >= enemy.nextBombAtMs && Math.random() < ENEMY_BOMB_CHANCE) {
        const enemyBombs = this.bombs.filter(b => b.planterId === enemy.id).length;
        // Inimigos simples têm um limite de 1 bomba
        if (enemyBombs < 1 && !this.bombs.some(b => samePosition(b.position, enemy.position))) {
          this.bombs.push({
            id: Date.now() + enemy.id,
            planterId: enemy.id,
            position: { ...enemy.position },
            range: 2,
            pierce: false,
            plantedAtMs: now,
          });
          enemy.nextBombAtMs = now + ENEMY_BOMB_INTERVAL_MS;
        }
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

        const tile = this.level.tileAt(pos);
        tiles.push(pos);

        if (tile.type === TileType.Wall) {
          break;
        }

        if (tile.type === TileType.Box) {
          this.level.setTile(pos, TileType.Empty);
          this.score.update(s => s + SCORE_BOX);
          this.trySpawnPowerUp(pos); // Tenta gerar um power-up
          break;
        }
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

  private trySpawnPowerUp(position: GridPosition): void {
    if (Math.random() < POWER_UP_DROP_CHANCE) {
      const types: PowerUpType[] = [PowerUpType.Range, PowerUpType.Bomb, PowerUpType.Speed];
      this.powerUps.push({
        position: { ...position },
        type: types[Math.floor(Math.random() * types.length)],
      });
    }
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
        this.trySpawnPowerUp(enemy.position);
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
          case PowerUpType.Range:
            this.player.range++;
            this.range.update(r => r + 1);
            break;
          case PowerUpType.Bomb:
            this.player.maxBombs++;
            this.maxBombs.update(b => b + 1);
            break;
          case PowerUpType.Speed:
            this.player.moveDurationMs = Math.max(MIN_MOVE_DURATION_MS, this.player.moveDurationMs - SPEED_STEP_MS);
            this.speed.update(s => s + 1); // Atualiza o signal de velocidade para a UI
            break;
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
    return this.enemies
      .filter(e => e.alive)
      .map(e => {
        if (!e.currentMove) {
          return { id: e.id, position: e.position, move: null };
        }
        const progress = Math.min(e.currentMove.elapsed / e.currentMove.duration, 1);
        return {
          id: e.id,
          position: e.position,
          move: { from: e.currentMove.from, to: e.currentMove.to, progress },
        };
      });
  }

  getBombs(): Bomb[] { return this.bombs; }
  getExplosions(): Explosion[] { return this.explosions; }
  getPowerUps(): PowerUpDrop[] { return this.powerUps; }
  getGrid(): Tile[][] { return this.level.grid; }
  getExitBox(): GridPosition { return this.level.exitBox; }
  getGameTimeMs(): number { return performance.now(); }
}