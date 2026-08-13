import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
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
  private readonly platformId = inject(PLATFORM_ID);

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
  private enemies: (EnemyState & { nextMoveAtMs: number; nextBombAtMs: number; currentMove: MoveTiming | null; })[] = [];
  private bombs: Bomb[] = [];
  private explosions: Explosion[] = [];
  private powerUps: PowerUpDrop[] = [];

  private currentMove: MoveTiming | null = null;
  private lastTickMs = 0;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const savedHighScore = localStorage.getItem('highScore');
      if (savedHighScore) {
        this.highScore.set(Number(savedHighScore));
      }
    }
  }

  start(): void {
    this.level.generate();
    this.resetFullGame();
    this.gamePhase.set(GamePhase.Ready);
  }

  play(): void {
    if (this.gamePhase() !== GamePhase.Ready) return;
    this.lastTickMs = performance.now();
    this.gamePhase.set(GamePhase.Playing);
  }

  restart(): void {
    this.level.generate();
    this.resetFullGame();
    this.gamePhase.set(GamePhase.Playing);
  }

  nextPhase(): void {
    if (this.gamePhase() !== GamePhase.Victory) return;

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
      nextBombAtMs: 0,
      currentDirection: null,
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
      nextBombAtMs: 0,
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
    const dangerSet = this.getDangerMap();

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      if (enemy.currentMove) {
        enemy.currentMove.elapsed += elapsed;
        if (enemy.currentMove.elapsed >= enemy.currentMove.duration) {
          enemy.position = { ...enemy.currentMove.to };
          enemy.currentMove = null;
        }
        continue;
      }

      if (now < enemy.nextMoveAtMs) continue;

      const nextMove = this.makeAIDecision(enemy, dangerSet, now);

      if (nextMove) {
        this.executeEnemyMove(enemy, nextMove, now);
      } else {
        enemy.nextMoveAtMs = now + 100;
      }
    }
  }

  private makeAIDecision(enemy: EnemyState & { nextMoveAtMs: number; nextBombAtMs: number; }, dangerSet: Set<string>, now: number): GridPosition | null {
    const currentPosKey = keyOf(enemy.position);

    if (dangerSet.has(currentPosKey)) {
      return this.findPathToSafety(enemy.position, dangerSet);
    }

    const canPlantBomb = now >= enemy.nextBombAtMs &&
      this.bombs.filter(b => b.planterId === enemy.id).length < 1 &&
      !this.bombs.some(b => samePosition(b.position, enemy.position));

    const pathToPlayer = this.findPathToPlayerThroughBoxes(enemy.position, dangerSet);

    if (pathToPlayer && pathToPlayer.length > 0) {
      const nextStep = pathToPlayer[0];
      const nextTile = this.level.tileAt(nextStep);

      if (nextTile.type === TileType.Box) {
        if (canPlantBomb) {
          const simulatedDanger = this.getDangerMap(enemy.position);
          const escapePath = this.findPathToSafety(enemy.position, simulatedDanger);

          if (escapePath) {
            this.bombs.push({
              id: Date.now() + enemy.id,
              planterId: enemy.id,
              position: { ...enemy.position },
              range: BASE_RANGE,
              pierce: false,
              plantedAtMs: now,
            });
            enemy.nextBombAtMs = now + ENEMY_BOMB_INTERVAL_MS;
            return escapePath;
          }
        }
        return null;
      } else {
        if (!dangerSet.has(keyOf(nextStep)) && !this.bombs.some(b => samePosition(b.position, nextStep))) {
          return nextStep;
        }
      }
    }

    if (canPlantBomb && this.isPlayerInSights(enemy.position)) {
      const simulatedDanger = this.getDangerMap(enemy.position);
      const escapePath = this.findPathToSafety(enemy.position, simulatedDanger);

      if (escapePath) {
        this.bombs.push({
          id: Date.now() + enemy.id,
          planterId: enemy.id,
          position: { ...enemy.position },
          range: BASE_RANGE,
          pierce: false,
          plantedAtMs: now,
        });
        enemy.nextBombAtMs = now + ENEMY_BOMB_INTERVAL_MS;
        return escapePath;
      }
    }

    const validMoves = this.getValidMoves(enemy.position, dangerSet);
    return this.selectEnemyMove(enemy, validMoves, dangerSet);
  }

  private findPathToPlayerThroughBoxes(start: GridPosition, dangerSet: Set<string>): GridPosition[] | null {
    const openSet: { pos: GridPosition, gCost: number, fCost: number }[] = [];
    const cameFrom = new Map<string, GridPosition | null>();
    const gScore = new Map<string, number>();

    openSet.push({ pos: start, gCost: 0, fCost: manhattan(start, this.player.position) });
    gScore.set(keyOf(start), 0);
    cameFrom.set(keyOf(start), null);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.fCost - b.fCost);
      const current = openSet.shift()!;

      if (samePosition(current.pos, this.player.position)) {
        const path: GridPosition[] = [];
        let curr: GridPosition | null = current.pos;
        while (curr !== null && !samePosition(curr, start)) {
          path.unshift(curr);
          curr = cameFrom.get(keyOf(curr)) || null;
        }
        return path;
      }

      const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
      for (const d of dirs) {
        const delta = directionDelta(d);
        const neighbor = { x: current.pos.x + delta.x, y: current.pos.y + delta.y };

        if (this.level.isInBounds(neighbor)) {
          const tile = this.level.tileAt(neighbor);
          if (tile.type !== TileType.Wall) {
            const nKey = keyOf(neighbor);
            const isBox = tile.type === TileType.Box;
            const hasBomb = this.bombs.some(b => samePosition(b.position, neighbor));
            const isDanger = dangerSet.has(nKey);

            const stepCost = 1 + (isBox ? 25 : 0) + (hasBomb ? 200 : 0) + (isDanger ? 100 : 0);
            const tentativeGScore = gScore.get(keyOf(current.pos))! + stepCost;

            if (!gScore.has(nKey) || tentativeGScore < gScore.get(nKey)!) {
              cameFrom.set(nKey, current.pos);
              gScore.set(nKey, tentativeGScore);
              const fCost = tentativeGScore + manhattan(neighbor, this.player.position);

              const existingNode = openSet.find(n => keyOf(n.pos) === nKey);
              if (!existingNode) {
                openSet.push({ pos: neighbor, gCost: tentativeGScore, fCost });
              } else {
                existingNode.gCost = tentativeGScore;
                existingNode.fCost = fCost;
              }
            }
          }
        }
      }
    }
    return null;
  }

  private isNarrowCorridor(pos: GridPosition): boolean {
    const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
    const openCount = dirs.reduce((count, d) => {
      const delta = directionDelta(d);
      const nextPos = { x: pos.x + delta.x, y: pos.y + delta.y };
      if (this.level.isInBounds(nextPos) && this.level.isWalkable(nextPos)) {
        return count + 1;
      }
      return count;
    }, 0);
    return openCount <= 2;
  }

  private getValidMoves(pos: GridPosition, dangerSet: Set<string>): GridPosition[] {
    const validMoves: GridPosition[] = [];
    const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
    for (const d of dirs) {
      const delta = directionDelta(d);
      const nextPos = { x: pos.x + delta.x, y: pos.y + delta.y };

      if (
        this.level.isInBounds(nextPos) &&
        this.level.isWalkable(nextPos) &&
        !dangerSet.has(keyOf(nextPos)) &&
        !this.bombs.some(b => samePosition(b.position, nextPos))
      ) {
        validMoves.push(nextPos);
      }
    }
    return validMoves;
  }

  private countSafeReachableArea(start: GridPosition, dangerSet: Set<string>): number {
    const queue: GridPosition[] = [start];
    const visited = new Set<string>([keyOf(start)]);
    let count = 0;

    while (queue.length > 0) {
      const pos = queue.shift()!;
      if (dangerSet.has(keyOf(pos))) {
        continue;
      }
      count += 1;

      const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
      for (const d of dirs) {
        const delta = directionDelta(d);
        const nextPos = { x: pos.x + delta.x, y: pos.y + delta.y };
        const key = keyOf(nextPos);

        if (
          this.level.isInBounds(nextPos) &&
          this.level.isWalkable(nextPos) &&
          !dangerSet.has(key) &&
          !visited.has(key) &&
          !this.bombs.some(b => samePosition(b.position, nextPos))
        ) {
          visited.add(key);
          queue.push(nextPos);
        }
      }
    }

    return count;
  }

  private selectEnemyMove(enemy: EnemyState & { nextMoveAtMs: number; nextBombAtMs: number }, validMoves: GridPosition[], dangerSet: Set<string>): GridPosition | null {
    if (validMoves.length === 0) {
      return null;
    }

    const currentDistance = manhattan(enemy.position, this.player.position);
    const scoredMoves = validMoves.map(move => ({
      move,
      distance: manhattan(move, this.player.position),
      forward: currentDistance - manhattan(move, this.player.position),
      reachableArea: this.countSafeReachableArea(move, dangerSet),
      narrow: this.isNarrowCorridor(move),
    }));

    scoredMoves.sort((a, b) => {
      if (b.forward !== a.forward) {
        return b.forward - a.forward;
      }

      if (b.reachableArea !== a.reachableArea) {
        return b.reachableArea - a.reachableArea;
      }

      return a.distance - b.distance;
    });

    return scoredMoves[0].move;
  }

  private getDirection(from: GridPosition, to: GridPosition): Direction | null {
    if (to.x > from.x) return Direction.Right;
    if (to.x < from.x) return Direction.Left;
    if (to.y > from.y) return Direction.Down;
    if (