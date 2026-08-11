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
  SCORE_LEVEL_CLEAR,
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

type EnemyAIState = 'chase' | 'fleeing' | 'waiting';

@Injectable({ providedIn: 'root' })
export class GameLogicService {
  private readonly level = inject(LevelService);
  private readonly input = inject(InputManagerService);

  readonly score = signal(0);
  readonly highScore = signal(0);
  readonly phase = signal(1);
  readonly enemiesRemaining = signal(0);
  readonly maxBombs = signal(BASE_BOMBS);
  readonly range = signal(BASE_RANGE);
  readonly speed = signal(0);
  readonly pierce = signal(false);
  readonly gamePhase = signal<GamePhase>(GamePhase.Ready);
  readonly exitOpen = signal(false);

  private player: PlayerState = { position: { x: 1, y: 1 }, alive: true, maxBombs: BASE_BOMBS, range: BASE_RANGE, moveDurationMs: BASE_MOVE_DURATION_MS, pierce: false };
  private enemies: (EnemyState & { aiState: EnemyAIState; safeTargetPos: GridPosition | null; plantedBombId: number | null })[] = [];
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
    this.resetFullGame();
    this.gamePhase.set(GamePhase.Ready);
  }

  play(): void {
    if (this.gamePhase() === GamePhase.Ready) {
      this.lastTickMs = 0;
      this.gamePhase.set(GamePhase.Playing);
    }
  }

  restart(): void {
    this.level.generate();
    this.resetFullGame();
    this.gamePhase.set(GamePhase.Playing);
  }

  nextPhase(): void {
    if (this.gamePhase() !== GamePhase.Victory) return;

    // Adiciona bônus de fase e preserva stats acumulados
    this.score.update(s => s + SCORE_LEVEL_CLEAR);
    this.phase.update(p => p + 1);

    this.level.generate();
    this.resetLevelState();
    this.gamePhase.set(GamePhase.Playing);
  }

  private resetFullGame(): void {
    this.score.set(0);
    this.enemiesRemaining.set(ENEMY_COUNT);
    this.maxBombs.set(BASE_BOMBS);
    this.range.set(BASE_RANGE);
    this.speed.set(0);
    this.pierce.set(false);
    this.exitOpen.set(false);
    this.phase.set(1);

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
      aiState: 'chase' as EnemyAIState,
      safeTargetPos: null,
      plantedBombId: null,
    }));

    this.bombs = [];
    this.explosions = [];
    this.powerUps = [];
    this.currentMove = null;
    this.lastTickMs = 0;
  }

  private resetLevelState(): void {
    this.enemiesRemaining.set(ENEMY_COUNT);
    this.exitOpen.set(false);

    // Preserva stats acumulados entre fases
    this.player = {
      position: { ...this.level.playerSpawn },
      alive: true,
      maxBombs: this.maxBombs(),
      range: this.range(),
      moveDurationMs: BASE_MOVE_DURATION_MS,
      pierce: this.pierce()
    };

    this.enemies = Array.from({ length: ENEMY_COUNT }, (_, i) => ({
      id: i + 1,
      position: { ...this.level.enemySpawns[i] },
      alive: true,
      moveDurationMs: BASE_MOVE_DURATION_MS,
      currentMove: null,
      nextMoveAtMs: 0,
      nextBombAtMs: ENEMY_BOMB_INTERVAL_MS,
      aiState: 'chase' as EnemyAIState,
      safeTargetPos: null,
      plantedBombId: null,
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

    const playerBombs = this.bombs.filter(b => b.planterId === 'player').length;
    if (playerBombs >= this.player.maxBombs) return;
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

      // Atualiza interpolação de movimento em andamento
      if (enemy.currentMove) {
        enemy.currentMove.elapsed += elapsed;
        if (enemy.currentMove.elapsed >= enemy.currentMove.duration) {
          enemy.position = { ...enemy.currentMove.to };
          enemy.currentMove = null;
          
          // Se estava fugindo e chegou no destino seguro, entra em modo de espera
          if (enemy.aiState === 'fleeing' && enemy.safeTargetPos && samePosition(enemy.position, enemy.safeTargetPos)) {
            enemy.aiState = 'waiting';
            const myBomb = this.bombs.find(b => b.planterId === enemy.id);
            if (myBomb) enemy.plantedBombId = myBomb.id;
          }
        }
        continue;
      }

      // Máquina de estados da IA
      if (enemy.aiState === 'chase') {
        const distToPlayer = manhattan(enemy.position, this.player.position);
        
        // Decide soltar bomba se estiver perto o suficiente e cooldown permitir
        if (now >= enemy.nextBombAtMs && distToPlayer <= 4) {
          const enemyBombs = this.bombs.filter(b => b.planterId === enemy.id).length;
          if (enemyBombs < 1 && !this.bombs.some(b => samePosition(b.position, enemy.position))) {
            // Planta a bomba
            this.bombs.push({
              id: Date.now() + enemy.id,
              planterId: enemy.id,
              position: { ...enemy.position },
              range: 2,
              pierce: false,
              plantedAtMs: now,
            });
            
            // Tenta encontrar um tile adjacente seguro para fugir
            const safeSpot = this.findSafeSpot(enemy.position, { ...enemy.position }, 2);
            if (safeSpot) {
              enemy.aiState = 'fleeing';
              enemy.safeTargetPos = safeSpot;
            } else {
              // Sem lugar seguro imediato, volta a perseguir com cooldown
              enemy.nextBombAtMs = now + ENEMY_BOMB_INTERVAL_MS;
            }
          } else {
            enemy.nextBombAtMs = now + ENEMY_BOMB_INTERVAL_MS;
          }
        } else if (now >= enemy.nextMoveAtMs) {
          this.moveEnemyTowardsPlayer(enemy);
          enemy.nextMoveAtMs = now + ENEMY_MOVE_INTERVAL_MS;
        }
      } 
      else if (enemy.aiState === 'fleeing') {
        if (enemy.safeTargetPos && now >= enemy.nextMoveAtMs) {
          this.moveEnemyToTarget(enemy, enemy.safeTargetPos);
          enemy.nextMoveAtMs = now + ENEMY_MOVE_INTERVAL_MS;
        }
      } 
      else if (enemy.aiState === 'waiting') {
        // Aguarda a bomba explodir e a área ficar segura
        const bomb = this.bombs.find(b => b.id === enemy.plantedBombId);
        if (bomb && now > bomb.plantedAtMs + BOMB_FUSE_MS) {
          enemy.aiState = 'chase';
          enemy.safeTargetPos = null;
          enemy.plantedBombId = null;
          enemy.nextMoveAtMs = now + ENEMY_MOVE_INTERVAL_MS; // Pequeno delay antes de retomar a caça
        }
      }
    }
  }

  private findSafeSpot(from: GridPosition, bombPos: GridPosition, range: number): GridPosition | null {
    const dangerTiles = new Set<string>();
    dangerTiles.add(keyOf(bombPos));
    
    const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
    for (const dir of dirs) {
      const delta = directionDelta(dir);
      for (let r = 1; r <= range; r++) {
        const pos = { x: bombPos.x + delta.x * r, y: bombPos.y + delta.y * r };
        if (!this.level.isInBounds(pos)) break;
        dangerTiles.add(keyOf(pos));
        if (this.level.tileAt(pos).type === TileType.Wall) break;
      }
    }

    // Verifica tiles adjacentes ao inimigo atual
    for (const dir of dirs) {
      const delta = directionDelta(dir);
      const target = { x: from.x + delta.x, y: from.y + delta.y };
      if (this.level.isInBounds(target) && this.level.isWalkable(target) && !dangerTiles.has(keyOf(target))) {
        return target;
      }
    }
    return null;
  }

  private moveEnemyTowardsPlayer(enemy: EnemyState & { aiState: EnemyAIState; safeTargetPos: GridPosition | null; plantedBombId: number | null }): void {
    const possibleDirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
    let bestDir: Direction | null = null;
    let minDist = Infinity;

    for (const dir of possibleDirs) {
      const delta = directionDelta(dir);
      const targetPos = { x: enemy.position.x + delta.x, y: enemy.position.y + delta.y };
      
      if (!this.level.isInBounds(targetPos) || !this.level.isWalkable(targetPos)) continue;
      if (this.bombs.some(b => samePosition(b.position, targetPos))) continue;
      if (this.explosions.some(e => samePosition(e.position, targetPos) || e.tiles.some(t => samePosition(t, targetPos)))) continue;

      const dist = manhattan(targetPos, this.player.position);
      if (dist < minDist) {
        minDist = dist;
        bestDir = dir;
      }
    }

    if (bestDir) {
      const delta = directionDelta(bestDir);
      enemy.currentMove = {
        from: { ...enemy.position },
        to: { x: enemy.position.x + delta.x, y: enemy.position.y + delta.y },
        elapsed: 0,
        duration: enemy.moveDurationMs,
      };
    }
  }

  private moveEnemyToTarget(enemy: EnemyState & { aiState: EnemyAIState; safeTargetPos: GridPosition | null; plantedBombId: number | null }, target: GridPosition): void {
    const possibleDirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];