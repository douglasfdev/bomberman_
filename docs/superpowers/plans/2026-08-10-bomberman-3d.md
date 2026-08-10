# Bomberman 3D (Angular + Three.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jogo browser estilo Bomberman em 3D com Angular (standalone, Signals, TS estrito) e Three.js, responsivo para Desktop e Mobile, com grid 15x15, bombas, explosões em cruz, inimigos com AI, power-ups e saída escondida.

**Architecture:** Separação em camadas (Clean Architecture). `core/` contém lógica pura sem Three.js: `LevelService` (geração do grid), `InputManagerService` (teclado + touch), `GameLogicService` (estado discreto, fonte da verdade, expõe Signals). `render/` contém `ThreeEngineService` (cena, câmera isométrica, rAF, resize) e `SceneBuilderService` (meshes ↔ grid, interpolação visual). `game/GameComponent` conecta tudo: canvas, HUD mobile (D-Pad + botão ação), overlays e Signals reativos.

**Tech Stack:** Angular (latest via `npx @angular/cli@latest`, standalone components, TypeScript estrito), Three.js (`three` + `@types/three`), Jasmine/Karma (runner padrão do scaffold).

**Spec:** `docs/superpowers/specs/2026-08-10-bomberman-3d-design.md`

## Global Constraints

- TypeScript estrito (default do scaffold Angular).
- Lógica do jogo (grid, estado) NÃO pode importar Three.js. Somente `render/` e `game/` podem importar `three`.
- Diretórios: `src/app/core/`, `src/app/render/`, `src/app/game/`.
- Grid fixo 15x15 (`GRID_SIZE = 15`), índices 0..14.
- Fuse da bomba: 3000ms. Base de bombas simultâneas: 1. Alcance base: 1.
- Duração base de transição entre tiles: 350ms.
- Inimigos: 3, spawns em `(GRID_SIZE-2, 1)`, `(1, GRID_SIZE-2)`, `(GRID_SIZE-2, GRID_SIZE-2)`.
- `GameLogicService.start(seed?: number)` — seed usado no `LevelService.generate(seed)` para testes determinísticos.
- Signals públicos de UI: `score`, `enemiesRemaining`, `maxBombs`, `range`, `speed`, `pierce`, `gamePhase`, `exitOpen`.
- Sem comentários no código. Mensagens de commit em inglês, conventional commits.

---

### Task 1: Scaffold do projeto Angular + Three.js

**Files:**
- Create: scaffold Angular (package.json, angular.json, tsconfig, src/app/...) via CLI
- Create: `src/app/core/`, `src/app/render/`, `src/app/game/` (dirs vazios)
- Modify: nada ainda (AppComponent default permanece até a Task 11)

**Interfaces:**
- Consumes: nada.
- Produces: projeto executável com `npm run build` e `npm test` funcionando; `three` instalado.

- [ ] **Step 1: Gerar scaffold em diretório temporário**

Run (no diretório de trabalho `C:/Users/User/pessoal/game`):
```bash
mkdir -p "C:/Users/User/AppData/Local/Temp/opencode/bomberman-scaffold"
npx --yes @angular/cli@latest new bomberman \
  --directory "C:/Users/User/AppData/Local/Temp/opencode/bomberman-scaffold" \
  --style scss --routing=false --ssr=false --skip-git --skip-install --defaults
```
Expected: scaffold criado sem prompts. (Se o CLI perguntar algo, definir `--defaults` já cobre; se travar, usar `CI=1` como prefixo.)

- [ ] **Step 2: Copiar scaffold para o diretório do projeto**

Run:
```bash
cp -r "C:/Users/User/AppData/Local/Temp/opencode/bomberman-scaffold/." "C:/Users/User/pessoal/game/"
rm -rf "C:/Users/User/AppData/Local/Temp/opencode/bomberman-scaffold"
```
Expected: `game/` contém agora package.json, angular.json, src/, etc., preservando `prompt.md` e `docs/`.

- [ ] **Step 3: Instalar dependências**

Run (timeout generoso, ~5min):
```bash
npm install
npm install three @types/three
```
Expected: `node_modules/` criado, `package.json` com `three` e `@types/three` em dependencies/devDependencies.

- [ ] **Step 4: Criar os diretórios da arquitetura**

Run:
```bash
mkdir -p src/app/core/models src/app/render src/app/game
```
Expected: três diretórios em `src/app/`.

- [ ] **Step 5: Verificar build**

Run:
```bash
npm run build
```
Expected: `ng build` compila sem erros e gera `dist/`.

- [ ] **Step 6: Inicializar git e commitar**

Run:
```bash
git init
git add .
git commit -m "chore: scaffold angular project with three.js"
```
Expected: repositório git criado, commit com todo o scaffold.

---

### Task 2: Modelos core e configuração

**Files:**
- Create: `src/app/core/models/game-config.ts`
- Create: `src/app/core/models/tile.model.ts`
- Create: `src/app/core/models/position.model.ts`
- Create: `src/app/core/models/direction.model.ts`
- Create: `src/app/core/models/power-up.model.ts`
- Create: `src/app/core/models/bomb.model.ts`
- Create: `src/app/core/models/enemy.model.ts`
- Create: `src/app/core/models/player.model.ts`
- Create: `src/app/core/models/game-state.model.ts`
- Test: `src/app/core/models/models.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces (assinaturas exatas usadas pelas próximas tasks):
  - `GRID_SIZE = 15`, `BOMB_FUSE_MS = 3000`, `BASE_MOVE_DURATION_MS = 350`, `MIN_MOVE_DURATION_MS = 150`, `SPEED_STEP_MS = 30`, `BASE_BOMBS = 1`, `BASE_RANGE = 1`, `POWER_UP_DROP_CHANCE = 0.4`, `ENEMY_COUNT = 3`, `SPAWN_CLEAR_RADIUS = 2`, `EXPLOSION_MS = 350`, `SCORE_BOX = 10`, `SCORE_ENEMY = 50`, `SCORE_POWER_UP = 20`, `EXIT_MIN_SPAWN_DISTANCE = 5`, `BOX_CHANCE = 0.6`.
  - `enum TileType { Empty='empty', Wall='wall', Box='box', Exit='exit' }`, `interface Tile { readonly type: TileType }`, `function tile(type): Tile`.
  - `interface GridPosition { readonly x: number; readonly y: number }`, `samePosition(a,b): boolean`, `keyOf(p): string`, `manhattan(a,b): number`.
  - `enum Direction { Up='up', Down='down', Left='left', Right='right' }`, `directionDelta(d): GridPosition`.
  - `enum PowerUpType { Bomb='bomb', Range='range', Speed='speed', Pierce='pierce' }`.
  - `interface Bomb { readonly id:number; readonly position:GridPosition; readonly range:number; readonly pierce:boolean; plantedAtMs:number }`.
  - `interface EnemyState { readonly id:number; position:GridPosition; alive:boolean; moveDurationMs:number }`.
  - `interface PlayerState { position:GridPosition; alive:boolean; maxBombs:number; range:number; moveDurationMs:number; pierce:boolean }`.
  - `enum GamePhase { Playing='playing', Victory='victory', Defeat='defeat' }`, `interface PowerUpDrop { readonly position:GridPosition; readonly type:PowerUpType }`, `interface Explosion { readonly id:number; readonly position:GridPosition; readonly tiles:GridPosition[]; readonly expiresAtMs:number }`, `interface InterpolatedMove { readonly from:GridPosition; readonly to:GridPosition; readonly progress:number }`, `interface EntityView { readonly position:GridPosition; readonly move:InterpolatedMove|null }`, `interface EnemyView extends EntityView { readonly id:number }`.

- [ ] **Step 1: Escrever o teste falhando**

`src/app/core/models/models.spec.ts`:
```ts
import { Direction, directionDelta } from './direction.model';
import { keyOf, manhattan, samePosition } from './position.model';

describe('core models', () => {
  it('directionDelta mapeia direções', () => {
    expect(directionDelta(Direction.Up)).toEqual({ x: 0, y: -1 });
    expect(directionDelta(Direction.Down)).toEqual({ x: 0, y: 1 });
    expect(directionDelta(Direction.Left)).toEqual({ x: -1, y: 0 });
    expect(directionDelta(Direction.Right)).toEqual({ x: 1, y: 0 });
  });

  it('samePosition e keyOf comparam posições', () => {
    expect(samePosition({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(samePosition({ x: 1, y: 2 }, { x: 2, y: 2 })).toBe(false);
    expect(keyOf({ x: 1, y: 2 })).toBe('1,2');
  });

  it('manhattan calcula distância em grade', () => {
    expect(manhattan({ x: 1, y: 1 }, { x: 4, y: 5 })).toBe(7);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL com "Cannot find module ... direction.model".

- [ ] **Step 3: Implementar modelos**

`src/app/core/models/game-config.ts`:
```ts
export const GRID_SIZE = 15;
export const BOMB_FUSE_MS = 3000;
export const BASE_MOVE_DURATION_MS = 350;
export const MIN_MOVE_DURATION_MS = 150;
export const SPEED_STEP_MS = 30;
export const BASE_BOMBS = 1;
export const BASE_RANGE = 1;
export const POWER_UP_DROP_CHANCE = 0.4;
export const ENEMY_COUNT = 3;
export const SPAWN_CLEAR_RADIUS = 2;
export const EXPLOSION_MS = 350;
export const SCORE_BOX = 10;
export const SCORE_ENEMY = 50;
export const SCORE_POWER_UP = 20;
export const EXIT_MIN_SPAWN_DISTANCE = 5;
export const BOX_CHANCE = 0.6;
```

`src/app/core/models/tile.model.ts`:
```ts
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
```

`src/app/core/models/position.model.ts`:
```ts
export interface GridPosition {
  readonly x: number;
  readonly y: number;
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
```

`src/app/core/models/direction.model.ts`:
```ts
import { GridPosition } from './position.model';

export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

export function directionDelta(direction: Direction): GridPosition {
  switch (direction) {
    case Direction.Up:
      return { x: 0, y: -1 };
    case Direction.Down:
      return { x: 0, y: 1 };
    case Direction.Left:
      return { x: -1, y: 0 };
    case Direction.Right:
      return { x: 1, y: 0 };
  }
}
```

`src/app/core/models/power-up.model.ts`:
```ts
export enum PowerUpType {
  Bomb = 'bomb',
  Range = 'range',
  Speed = 'speed',
  Pierce = 'pierce',
}
```

`src/app/core/models/bomb.model.ts`:
```ts
import { GridPosition } from './position.model';

export interface Bomb {
  readonly id: number;
  readonly position: GridPosition;
  readonly range: number;
  readonly pierce: boolean;
  plantedAtMs: number;
}
```

`src/app/core/models/enemy.model.ts`:
```ts
import { GridPosition } from './position.model';

export interface EnemyState {
  readonly id: number;
  position: GridPosition;
  alive: boolean;
  moveDurationMs: number;
}
```

`src/app/core/models/player.model.ts`:
```ts
import { GridPosition } from './position.model';

export interface PlayerState {
  position: GridPosition;
  alive: boolean;
  maxBombs: number;
  range: number;
  moveDurationMs: number;
  pierce: boolean;
}
```

`src/app/core/models/game-state.model.ts`:
```ts
import { GridPosition } from './position.model';
import { PowerUpType } from './power-up.model';

export enum GamePhase {
  Playing = 'playing',
  Victory = 'victory',
  Defeat = 'defeat',
}

export interface PowerUpDrop {
  readonly position: GridPosition;
  readonly type: PowerUpType;
}

export interface Explosion {
  readonly id: number;
  readonly position: GridPosition;
  readonly tiles: GridPosition[];
  readonly expiresAtMs: number;
}

export interface InterpolatedMove {
  readonly from: GridPosition;
  readonly to: GridPosition;
  readonly progress: number;
}

export interface EntityView {
  readonly position: GridPosition;
  readonly move: InterpolatedMove | null;
}

export interface EnemyView extends EntityView {
  readonly id: number;
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (models.spec + default specs).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/models
git commit -m "feat: add core game models and configuration"
```

---

### Task 3: LevelService — geração do grid 15x15

**Files:**
- Create: `src/app/core/level.service.ts`
- Test: `src/app/core/level.service.spec.ts`

**Interfaces:**
- Consumes: `GRID_SIZE`, `SPAWN_CLEAR_RADIUS`, `EXIT_MIN_SPAWN_DISTANCE`, `BOX_CHANCE`, `ENEMY_COUNT`, `Tile`, `TileType`, `tile`, `GridPosition`, `samePosition`, `manhattan`.
- Produces:
  - `generate(seed?: number): void` — (re)gera grid, spawns e saída.
  - `grid: Tile[][]` (público).
  - `playerSpawn: GridPosition` = `{x:1, y:1}`.
  - `enemySpawns: GridPosition[]`.
  - `exitBox: GridPosition` — caixa que esconde a saída.
  - `tileAt(p: GridPosition): Tile` (fora dos limites retorna `Wall`).
  - `isInBounds(p): boolean`.
  - `isWalkable(p): boolean` — `Empty` ou `Exit`.
  - `setTile(p, type: TileType): void`.
  - `tilePositions(type: TileType): GridPosition[]`.
  - `random(): number` (0..1), `randomInt(max): number`.
  - RNG interno `mulberry32(seed)` (exportado do próprio arquivo para uso em testes de lógica futuros — não requerido).

- [ ] **Step 1: Escrever o teste falhando**

`src/app/core/level.service.spec.ts`:
```ts
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
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL com "Cannot find module './level.service'".

- [ ] **Step 3: Implementar LevelService**

`src/app/core/level.service.ts`:
```ts
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
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/level.service.ts src/app/core/level.service.spec.ts
git commit -m "feat: add procedural 15x15 level generation"
```

---

### Task 4: InputManagerService — teclado + API touch

**Files:**
- Create: `src/app/core/input-manager.service.ts`
- Test: `src/app/core/input-manager.service.spec.ts`

**Interfaces:**
- Consumes: `Direction`.
- Produces:
  - `direction$: Observable<Direction | null>` (BehaviorSubject; `null` = nenhuma direção pressionada).
  - `action$: Observable<void>` (Subject).
  - `attach(): void`, `detach(): void`.
  - `isTouchDevice(): boolean` — `matchMedia('(pointer: coarse)')`.
  - `setDirection(d: Direction | null): void` — usado pelo D-Pad mobile.
  - `pressAction(): void` — usado pelo botão de ação mobile.
  - Mapeamento teclado: `KeyW`/`ArrowUp`=Up, `KeyS`/`ArrowDown`=Down, `KeyA`/`ArrowLeft`=Left, `KeyD`/`ArrowRight`=Right, `Space`=ação. `preventDefault` nas setas e Espaço.

- [ ] **Step 1: Escrever o teste falhando**

`src/app/core/input-manager.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { Direction } from './models/direction.model';
import { InputManagerService } from './input-manager.service';

describe('InputManagerService', () => {
  let service: InputManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InputManagerService);
  });

  afterEach(() => {
    service.detach();
  });

  it('mapeia WASD para direções', () => {
    service.attach();
    const received: Array<Direction | null> = [];
    const sub = service.direction$.subscribe((d) => received.push(d));

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(received.at(-1)).toBe(Direction.Up);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    expect(received.at(-1)).toBe(Direction.Right);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
    expect(received.at(-1)).toBe(Direction.Up);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(received.at(-1)).toBeNull();

    sub.unsubscribe();
  });

  it('mapeia setas para direções', () => {
    service.attach();
    let last: Direction | null = null;
    const sub = service.direction$.subscribe((d) => (last = d));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    expect(last).toBe(Direction.Left);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
    expect(last).toBeNull();
    sub.unsubscribe();
  });

  it('espaço dispara a ação', () => {
    service.attach();
    let count = 0;
    const sub = service.action$.subscribe(() => count++);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(count).toBe(1);
    sub.unsubscribe();
  });

  it('expõe direção e ação via API touch', () => {
    const received: Array<Direction | null> = [];
    const sub = service.direction$.subscribe((d) => received.push(d));
    service.setDirection(Direction.Right);
    expect(received.at(-1)).toBe(Direction.Right);
    service.setDirection(null);
    expect(received.at(-1)).toBeNull();
    sub.unsubscribe();
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL com "Cannot find module './input-manager.service'".

- [ ] **Step 3: Implementar InputManagerService**

`src/app/core/input-manager.service.ts`:
```ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Direction } from './models/direction.model';

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: Direction.Up,
  ArrowDown: Direction.Down,
  ArrowLeft: Direction.Left,
  ArrowRight: Direction.Right,
  KeyW: Direction.Up,
  KeyS: Direction.Down,
  KeyA: Direction.Left,
  KeyD: Direction.Right,
};

@Injectable({ providedIn: 'root' })
export class InputManagerService {
  private readonly directionSubject = new BehaviorSubject<Direction | null>(null);
  private readonly actionSubject = new Subject<void>();
  readonly direction$: Observable<Direction | null> = this.directionSubject.asObservable();
  readonly action$: Observable<void> = this.actionSubject.asObservable();

  private readonly pressedKeys: Direction[] = [];
  private attached = false;

  attach(): void {
    if (this.attached) {
      return;
    }
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    this.attached = false;
    this.pressedKeys.length = 0;
    this.directionSubject.next(null);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  isTouchDevice(): boolean {
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
  }

  setDirection(direction: Direction | null): void {
    this.pressedKeys.length = 0;
    if (direction) {
      this.pressedKeys.push(direction);
    }
    this.directionSubject.next(direction);
  }

  pressAction(): void {
    this.actionSubject.next();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const direction = KEY_DIRECTIONS[event.code];
    if (direction) {
      event.preventDefault();
      if (!this.pressedKeys.includes(direction)) {
        this.pressedKeys.push(direction);
      }
      this.directionSubject.next(direction);
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      this.actionSubject.next();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const direction = KEY_DIRECTIONS[event.code];
    if (!direction) {
      return;
    }
    const index = this.pressedKeys.indexOf(direction);
    if (index >= 0) {
      this.pressedKeys.splice(index, 1);
    }
    this.directionSubject.next(this.pressedKeys.at(-1) ?? null);
  };
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/input-manager.service.ts src/app/core/input-manager.service.spec.ts
git commit -m "feat: add hybrid keyboard and touch input manager"
```

---

### Task 5: GameLogicService (parte 1) — ciclo de vida, movimento e contato

**Files:**
- Create: `src/app/core/game-logic.service.ts`
- Test: `src/app/core/game-logic.service.spec.ts`

**Interfaces:**
- Consumes: `LevelService`, todos os modelos de `core/models`, config.
- Produces (assinaturas usadas pelas próximas tasks e pela camada de render):
  - Signals: `score()`, `enemiesRemaining()`, `maxBombs()`, `range()`, `speed()`, `pierce()`, `gamePhase()`, `exitOpen()`.
  - `start(seed?: number): void`, `restart(): void`.
  - `tick(deltaMs: number): void`.
  - `move(direction: Direction | null): void`, `plantBomb(): void`.
  - `getGameTimeMs(): number`.
  - `getGrid(): Tile[][]` (o grid do `LevelService`).
  - `getPlayerView(): EntityView`.
  - `getEnemyViews(): EnemyView[]` (só vivos, ordenados por id).
  - `getBombs(): Bomb[]`, `getExplosions(): Explosion[]`, `getPowerUps(): PowerUpDrop[]`.
  - `getExitBox(): GridPosition`.
  - Internos privados (acessados em testes via cast `as unknown as { ... }`): `player`, `enemies`, `powerUps`, `checkExitOpened()`, `onPlayerSettled()`.

**Regras desta parte:** movimento discreto por célula com transição `MoveTiming {from, to, elapsed, duration}`; direção pressionada mantém andando; bloqueio por `Wall`/`Box` (usar `LevelService.isWalkable`); contato com inimigo no destino = `defeat()`; `defeat()`/`victory()` privados; `tick` acumula `gameTimeMs` sempre e só simula quando `gamePhase() === Playing`; inimigos ainda NÃO se movem nesta task (criação + views apenas) — movimento chega na Task 7.

- [ ] **Step 1: Escrever o teste falhando**

`src/app/core/game-logic.service.spec.ts`:
```ts
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
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL com "Cannot find module './game-logic.service'".

- [ ] **Step 3: Implementar GameLogicService (parte 1)**

`src/app/core/game-logic.service.ts`:
```ts
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
      return;
    }
    this.beginPlayerMove(this.activeDirection);
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
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (os 6 testes desta parte).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/game-logic.service.ts src/app/core/game-logic.service.spec.ts
git commit -m "feat: add game lifecycle and discrete tile movement"
```

---

### Task 6: GameLogicService (parte 2) — bombas, explosão em cruz e destruição de caixas

**Files:**
- Modify: `src/app/core/game-logic.service.ts` (tick já chama `checkBombFuses` e `advanceEnemies` na Task 7 — nesta task adicionar `checkBombFuses` e chamá-la em `tick`).
- Modify: `src/app/core/game-logic.service.spec.ts` (adicionar describe `bombas e explosão`).

**Interfaces:**
- Consumes: `Bomb`, `BOMB_FUSE_MS`, `EXPLOSION_MS`, `SCORE_BOX`, `SCORE_ENEMY`, `POWER_UP_DROP_CHANCE`, `PowerUpType`.
- Produces (adiciona ao serviço):
  - `plantBomb()` respeitando `player.maxBombs`.
  - `private computeBlast(bomb): GridPosition[]` — cruz N/S/L/O até `range`; para em `Wall`; em `Box` inclui o tile e, sem `pierce`, para; com `pierce`, continua.
  - `private checkBombFuses(): void` — bomba explode quando `gameTimeMs - plantedAtMs >= BOMB_FUSE_MS`; reação em cadeia: bombas atingidas pelo blast explodem também (fila + `processed`).
  - `private applyBlast(bomb, tiles): void` — caixas viram `Empty` (+`SCORE_BOX`, `maybeDropPowerUp`); inimigos no blast morrem (−`enemiesRemaining`, +`SCORE_ENEMY`); jogador no blast = `defeat()`; depois `checkExitOpened()`.
  - `private maybeDropPowerUp(position): void` — `random() < POWER_UP_DROP_CHANCE` → drop aleatório de `PowerUpType`.
  - `private checkExitOpened(): void` — se `enemiesRemaining()===0` e o tile de `level.exitBox` não é `Box` e não está aberta → `exitOpen.set(true)` e `setTile(exitBox, Exit)`.
  - `tick` passa a chamar `checkBombFuses()` e depois limpar explosões expiradas (`expiresAtMs <= gameTimeMs`).

- [ ] **Step 1: Escrever os testes falhando**

Adicionar ao final de `src/app/core/game-logic.service.spec.ts` (antes do fechamento final `});`):
```ts
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
      expect(tiles).toContain(jasmine.objectContaining({ x: 1, y: 1 }));
      expect(tiles).toContain(jasmine.objectContaining({ x: 2, y: 1 }));
      expect(tiles).toContain(jasmine.objectContaining({ x: 1, y: 2 }));
      expect(tiles).not.toContain(jasmine.objectContaining({ x: 0, y: 1 }));
      expect(tiles).not.toContain(jasmine.objectContaining({ x: 1, y: 0 }));
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
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: os novos testes falham (nenhuma explosão ocorre / bombs permanece com 1 bomba não explodida).

- [ ] **Step 3: Implementar bombas e explosão**

Editar `src/app/core/game-logic.service.ts`:

Alterar `tick` para:
```ts
  tick(deltaMs: number): void {
    this.gameTimeMs += deltaMs;
    if (this.gamePhase() !== GamePhase.Playing) {
      return;
    }
    this.advancePlayer(deltaMs);
    this.checkBombFuses();
    this.explosions = this.explosions.filter((e) => e.expiresAtMs > this.gameTimeMs);
  }
```

Adicionar ao bloco de import de `./models/game-config` o bloco completo abaixo (mantendo os existentes):
```ts
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
} from './models/game-config';
```

Adicionar os métodos privados (antes de `private victory`):
```ts
  private checkBombFuses(): void {
    const due = this.bombs.filter((b) => this.gameTimeMs - b.plantedAtMs >= BOMB_FUSE_MS);
    if (due.length === 0) {
      return;
    }
    const queue: Bomb[] = [...due];
    const processed = new Set<number>();
    while (queue.length > 0) {
      const bomb = queue.shift() as Bomb;
      if (processed.has(bomb.id)) {
        continue;
      }
      processed.add(bomb.id);
      const tiles = this.computeBlast(bomb);
      for (const other of [...this.bombs]) {
        if (
          other.id !== bomb.id &&
          !processed.has(other.id) &&
          tiles.some((t) => samePosition(t, other.position))
        ) {
          queue.push(other);
        }
      }
      this.applyBlast(bomb, tiles);
      this.bombs = this.bombs.filter((b) => b.id !== bomb.id);
      this.explosions.push({
        id: this.nextExplosionId++,
        position: { ...bomb.position },
        tiles,
        expiresAtMs: this.gameTimeMs + EXPLOSION_MS,
      });
    }
  }

  private computeBlast(bomb: Bomb): GridPosition[] {
    const tiles: GridPosition[] = [{ ...bomb.position }];
    for (const direction of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
      const delta = directionDelta(direction);
      for (let step = 1; step <= bomb.range; step++) {
        const p: GridPosition = {
          x: bomb.position.x + delta.x * step,
          y: bomb.position.y + delta.y * step,
        };
        if (!this.level.isInBounds(p)) {
          break;
        }
        const type = this.level.tileAt(p).type;
        if (type === TileType.Wall) {
          break;
        }
        tiles.push(p);
        if (type === TileType.Box && !bomb.pierce) {
          break;
        }
      }
    }
    return tiles;
  }

  private applyBlast(bomb: Bomb, tiles: GridPosition[]): void {
    for (const tilePos of tiles) {
      if (this.level.tileAt(tilePos).type === TileType.Box) {
        this.level.setTile(tilePos, TileType.Empty);
        this.score.update((s) => s + SCORE_BOX);
        this.maybeDropPowerUp(tilePos);
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.alive && tiles.some((t) => samePosition(t, enemy.position))) {
        enemy.alive = false;
        this.enemiesRemaining.update((n) => n - 1);
        this.score.update((s) => s + SCORE_ENEMY);
      }
    }
    if (this.player.alive && tiles.some((t) => samePosition(t, this.player.position))) {
      this.defeat();
    }
    this.checkExitOpened();
  }

  private maybeDropPowerUp(position: GridPosition): void {
    if (this.level.random() < POWER_UP_DROP_CHANCE) {
      const types = [PowerUpType.Bomb, PowerUpType.Range, PowerUpType.Speed, PowerUpType.Pierce];
      this.powerUps.push({
        position: { ...position },
        type: types[this.level.randomInt(types.length)],
      });
    }
  }

  private checkExitOpened(): void {
    if (
      this.enemiesRemaining() === 0 &&
      this.level.tileAt(this.level.exitBox).type !== TileType.Box &&
      !this.exitOpen()
    ) {
      this.exitOpen.set(true);
      this.level.setTile(this.level.exitBox, TileType.Exit);
    }
  }
}
```

Nota: `BOMB_FUSE_MS`, `EXPLOSION_MS`, `POWER_UP_DROP_CHANCE`, `SCORE_BOX`, `SCORE_ENEMY` passam a ser usados pelos métodos acima — o import de config da Task 5 já inclui esses nomes após o bloco completo adicionado no início deste passo. Verificar que o arquivo compila antes do commit.

- [ ] **Step 4: Rodar para ver passar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/game-logic.service.ts src/app/core/game-logic.service.spec.ts
git commit -m "feat: add bomb fuses and cross explosions with box destruction"
```

---

### Task 7: GameLogicService (parte 3) — AI dos inimigos

**Files:**
- Modify: `src/app/core/game-logic.service.ts` (`tick` passa a chamar `advanceEnemies`; adicionar métodos de inimigo).
- Modify: `src/app/core/game-logic.service.spec.ts` (describe `inimigos`).

**Interfaces:**
- Consumes: `EnemyState`, `keyOf`, `manhattan`, `EXPLOSION_MS` (via explosões ativas).
- Produces:
  - `private advanceEnemies(deltaMs): void` — completa `enemyMoves`; ao assentar em cima do jogador → `defeat()`; agenda próximo movimento.
  - `private beginEnemyMove(enemy): void` — candidatos = vizinhos caminháveis que não são: `Wall`/`Box`, tile de explosão ativa, tile de outro inimigo vivo, tile com bomba; 25% aleatório, senão o que minimiza distância manhattan ao jogador (desempate aleatório); sem candidatos → fica parado.
  - `tick` ordem: `advancePlayer` → `advanceEnemies` → `checkBombFuses` → limpar explosões.

- [ ] **Step 1: Escrever os testes falhando**

Adicionar antes do fechamento final `});` de `src/app/core/game-logic.service.spec.ts`:
```ts
  describe('inimigos', () => {
    it('inimigos se movem pelo grid', () => {
      const before = logic.getEnemyViews().map((v) => `${v.position.x},${v.position.y}`);
      for (let i = 0; i < 10; i++) {
        logic.tick(500);
      }
      const after = logic.getEnemyViews().map((v) => `${v.position.x},${v.position.y}`);
      expect(after.some((p) => before.includes(p))).toBe(false);
    });

    it('mantêm-se em tiles caminháveis', () => {
      for (let i = 0; i < 200; i++) {
        logic.tick(50);
      }
      for (const view of logic.getEnemyViews()) {
        const type = level.tileAt(view.position).type;
        expect(type).not.toBe(TileType.Wall);
        expect(type).not.toBe(TileType.Box);
      }
    });

    it('derrotam o jogador por contato', () => {
      const enemies = (logic as unknown as { enemies: Array<{ position: GridPosition; alive: boolean }> }).enemies;
      enemies[0].position = { x: 2, y: 1 };
      logic.move(Direction.Right);
      tickMove();
      expect(logic.gamePhase()).toBe(GamePhase.Defeat);
    });
  });
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: "inimigos se movem pelo grid" FALHA (nenhum inimigo muda de posição porque `advanceEnemies` ainda não é chamado em `tick`); os outros dois já passam (contato é tratado em `beginPlayerMove`; spawns são caminháveis).

- [ ] **Step 3: Implementar AI dos inimigos**

Editar `tick`:
```ts
  tick(deltaMs: number): void {
    this.gameTimeMs += deltaMs;
    if (this.gamePhase() !== GamePhase.Playing) {
      return;
    }
    this.advancePlayer(deltaMs);
    this.advanceEnemies(deltaMs);
    this.checkBombFuses();
    this.explosions = this.explosions.filter((e) => e.expiresAtMs > this.gameTimeMs);
  }
```

Adicionar métodos (após `advancePlayer`/`beginPlayerMove`, antes de `onPlayerSettled`):
```ts
  private advanceEnemies(deltaMs: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || this.gamePhase() !== GamePhase.Playing) {
        continue;
      }
      const move = this.enemyMoves.get(enemy.id);
      if (move) {
        move.elapsed += deltaMs;
        if (move.elapsed >= move.duration) {
          enemy.position = { ...move.to };
          this.enemyMoves.delete(enemy.id);
          if (samePosition(enemy.position, this.player.position) && this.player.alive) {
            this.defeat();
            return;
          }
          this.beginEnemyMove(enemy);
        }
      } else {
        this.beginEnemyMove(enemy);
      }
    }
  }

  private beginEnemyMove(enemy: EnemyState): void {
    const candidates = this.enemyCandidates(enemy);
    if (candidates.length === 0) {
      return;
    }
    let chosen: GridPosition;
    if (this.level.random() < 0.25) {
      chosen = candidates[this.level.randomInt(candidates.length)];
    } else {
      const distances = candidates.map((p) => manhattan(p, this.player.position));
      const min = Math.min(...distances);
      const best = candidates.filter((_, i) => distances[i] === min);
      chosen = best[this.level.randomInt(best.length)];
    }
    this.enemyMoves.set(enemy.id, {
      from: { ...enemy.position },
      to: chosen,
      elapsed: 0,
      duration: enemy.moveDurationMs,
    });
  }

  private enemyCandidates(enemy: EnemyState): GridPosition[] {
    const blastTiles = new Set<string>();
    for (const explosion of this.explosions) {
      for (const tilePos of explosion.tiles) {
        blastTiles.add(keyOf(tilePos));
      }
    }
    const occupied = new Set<string>();
    for (const other of this.enemies) {
      if (other.alive && other.id !== enemy.id) {
        occupied.add(keyOf(other.position));
      }
    }
    const bombTiles = new Set(this.bombs.map((b) => keyOf(b.position)));
    const out: GridPosition[] = [];
    for (const direction of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
      const delta = directionDelta(direction);
      const p: GridPosition = { x: enemy.position.x + delta.x, y: enemy.position.y + delta.y };
      if (!this.level.isInBounds(p) || !this.level.isWalkable(p)) {
        continue;
      }
      const k = keyOf(p);
      if (blastTiles.has(k) || occupied.has(k) || bombTiles.has(k)) {
        continue;
      }
      out.push(p);
    }
    return out;
  }
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/game-logic.service.ts src/app/core/game-logic.service.spec.ts
git commit -m "feat: add cell-based enemy AI with blast avoidance"
```

---

### Task 8: GameLogicService (parte 4) — power-ups, saída e fim de jogo

**Files:**
- Modify: `src/app/core/game-logic.service.ts` (coleta e aplicação de power-ups já existem; validar `checkExitOpened`/`victory`).
- Modify: `src/app/core/game-logic.service.spec.ts` (describes `power-ups` e `saída e fim de jogo`).

**Interfaces:**
- Consumes: `PowerUpDrop`, `SCORE_POWER_UP`, `BASE_BOMBS`.
- Produces: comportamento de coleta ao assentar no tile (aplica efeito, +`SCORE_POWER_UP`, remove do drop); abertura da saída; vitória ao pisar na saída aberta.

- [ ] **Step 1: Escrever os testes falhando**

Adicionar antes do fechamento final `});` de `src/app/core/game-logic.service.spec.ts`:
```ts
  describe('power-ups', () => {
    it('aplica +bomba ao coletar', () => {
      (logic as unknown as { powerUps: Array<{ position: GridPosition; type: PowerUpType }> }).powerUps.push({
        position: { x: 2, y: 1 },
        type: PowerUpType.Bomb,
      });
      logic.move(Direction.Right);
      tickMove();
      expect(logic.maxBombs()).toBe(BASE_BOMBS + 1);
      expect(logic.getPowerUps().length).toBe(0);
    });

    it('aplica +velocidade ao coletar', () => {
      (logic as unknown as { powerUps: Array<{ position: GridPosition; type: PowerUpType }> }).powerUps.push({
        position: { x: 2, y: 1 },
        type: PowerUpType.Speed,
      });
      logic.move(Direction.Right);
      tickMove();
      expect(logic.speed()).toBe(1);
    });
  });

  describe('saída e fim de jogo', () => {
    it('abre a saída quando todos os inimigos morrem e a caixa é destruída', () => {
      const enemies = (logic as unknown as { enemies: Array<{ alive: boolean }> }).enemies;
      enemies.forEach((e) => (e.alive = false));
      logic.enemiesRemaining.set(0);
      const exitBox = logic.getExitBox();
      level.setTile(exitBox, TileType.Empty);
      (logic as unknown as { checkExitOpened(): void }).checkExitOpened();
      expect(logic.exitOpen()).toBe(true);
      expect(level.tileAt(exitBox).type).toBe(TileType.Exit);
    });

    it('não abre a saída enquanto o inimigo estiver vivo', () => {
      level.setTile(logic.getExitBox(), TileType.Empty);
      (logic as unknown as { checkExitOpened(): void }).checkExitOpened();
      expect(logic.exitOpen()).toBe(false);
    });

    it('vence ao pisar na saída aberta', () => {
      const enemies = (logic as unknown as { enemies: Array<{ alive: boolean }> }).enemies;
      enemies.forEach((e) => (e.alive = false));
      logic.enemiesRemaining.set(0);
      level.setTile(logic.getExitBox(), TileType.Empty);
      (logic as unknown as { checkExitOpened(): void }).checkExitOpened();
      const player = (logic as unknown as { player: { position: GridPosition } }).player;
      player.position = logic.getExitBox();
      (logic as unknown as { onPlayerSettled(): void }).onPlayerSettled();
      expect(logic.gamePhase()).toBe(GamePhase.Victory);
    });
  });
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: os testes de saída/power-up já passam (lógica existente das Tasks 5-6), exceto se houver bug — o objetivo é confirmar PASS após rodar. Se algum falhar, corrigir na implementação.

- [ ] **Step 3: Rodar para confirmar PASS**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: todos os testes de `game-logic.service.spec.ts` PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/core/game-logic.service.ts src/app/core/game-logic.service.spec.ts
git commit -m "feat: add power-up collection and exit victory conditions"
```

---

### Task 9: ThreeEngineService — cena, câmera isométrica, luzes, loop e resize

**Files:**
- Create: `src/app/render/three-engine.service.ts`

**Interfaces:**
- Consumes: `GRID_SIZE`.
- Produces:
  - `init(container: HTMLElement, canvas: HTMLCanvasElement): void` — cria `WebGLRenderer` (antialias, `setPixelRatio(min(dpr,2))`, sombras PCF), `Scene` (background `0x0f1420`), `OrthographicCamera` posicionada em `(10,14,10)` com `lookAt(0,0,0)`, luz ambiente (`0xffffff`, 0.7) + direcional (`0xffffff`, 1.1, sombra 2048, bounds ±12), `ResizeObserver` no container. Lança erro se WebGL indisponível.
  - `startLoop(callback: (deltaMs: number) => void): void` — rAF; `deltaMs = min(clock.getDelta()*1000, 50)`; chama callback e depois `renderer.render`.
  - `stopLoop(): void`, `dispose(): void` (cancela rAF, desconecta observer, descarta geometrias/materiais/renderer).
  - `resize(): void` privado — `renderer.setSize(w,h,false)`; `half = GRID_SIZE*0.7`; paisagem (`aspect>=1`): `halfH=half`, `halfW=half*aspect`; retrato: `halfW=half`, `halfH=half/aspect`; atualiza `camera.left/right/top/bottom`.

**Sem testes unitários (WebGL/canvas não suportados no runner).** Verificação: `npm run build` compila.

- [ ] **Step 1: Implementar**

`src/app/render/three-engine.service.ts`:
```ts
import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GRID_SIZE } from '../core/models/game-config';

@Injectable({ providedIn: 'root' })
export class ThreeEngineService {
  scene!: THREE.Scene;
  camera!: THREE.OrthographicCamera;
  renderer!: THREE.WebGLRenderer;

  private readonly clock = new THREE.Clock();
  private container!: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private running = false;
  private frame = 0;

  init(container: HTMLElement, canvas: HTMLCanvasElement): void {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1420);

    const extent = GRID_SIZE * 0.8;
    this.camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 0.1, 100);
    this.camera.position.set(10, 14, 10);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  startLoop(callback: (deltaMs: number) => void): void {
    this.running = true;
    const loop = (): void => {
      if (!this.running) {
        return;
      }
      this.frame = requestAnimationFrame(loop);
      const deltaMs = Math.min(this.clock.getDelta() * 1000, 50);
      callback(deltaMs);
      this.renderer.render(this.scene, this.camera);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stopLoop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose(): void {
    this.stopLoop();
    this.resizeObserver?.disconnect();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }
    });
    this.renderer?.dispose();
  }

  private resize(): void {
    if (!this.container || !this.renderer || !this.camera) {
      return;
    }
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const half = GRID_SIZE * 0.7;
    let halfW: number;
    let halfH: number;
    if (aspect >= 1) {
      halfH = half;
      halfW = half * aspect;
    } else {
      halfW = half;
      halfH = half / aspect;
    }
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/render/three-engine.service.ts
git commit -m "feat: add three.js engine with isometric camera and responsive resize"
```

---

### Task 10: SceneBuilderService — meshes ↔ grid e interpolação visual

**Files:**
- Create: `src/app/render/scene-builder.service.ts`

**Interfaces:**
- Consumes: `GameLogicService` (getGrid, getPlayerView, getEnemyViews, getBombs, getExplosions, getPowerUps, getExitBox, getGameTimeMs), `GRID_SIZE`, `EXPLOSION_MS`, `TileType`, `GridPosition`, `keyOf`, `samePosition`, `InterpolatedMove`, `PowerUpType`, `THREE`.
- Produces:
  - `init(scene: THREE.Scene): void` — chão `PlaneGeometry(GRID_SIZE+3, GRID_SIZE+3)` na cor `0x2a3245`, rotacionado −90° em x, y=−0.01, `receiveShadow`.
  - `sync(logic, deltaMs): void` — chamado a cada frame; sincroniza tiles, jogador, inimigos, bombas, explosões e power-ups; remove meshes órfãos.
  - `dispose(): void` — remove e descarta todos os meshes e o chão.
  - Helpers: `tileToWorld(p): {x, z}` (centro do tile: `offset=(GRID_SIZE-1)/2`), `applyView(mesh, position, move)` (lerp from→to por `move.progress`), `disposeMesh`, `disposeGroup`.
  - Caixa que esconde a saída (`logic.getExitBox()`) renderizada com cor distinta (`0xc8862b` vs caixa normal `0x9a6b2f`).
  - Animação: bomba pulsa `scale = 1 + 0.15*sin(timeMs/150)`; power-up bóia; explosão escala `max(0.1, progress)` onde `progress = (timeMs - startedAt)/EXPLOSION_MS`.
  - Cores/meshes: jogador `CapsuleGeometry(0.28,0.55)` `0x4aa3ff` + olho; inimigo `CapsuleGeometry(0.28,0.5)` `0xff5252`; parede `BoxGeometry(1,1.2,1)` `0x6b7280`; caixa `BoxGeometry(0.9,0.9,0.9)`; saída aberta `CylinderGeometry(0.45,0.45,0.1)` `0x37e06b` emissiva; bomba `SphereGeometry(0.28)` `0x16181d`; power-ups: +Bomba box `0xffd166`, +Alcance esfera `0xff8c42`, +Velocidade cone `0x7ce38b`, Atravessa octaedro `0xcf9bff`.

**Sem testes unitários (requer canvas).** Verificação: `npm run build`.

- [ ] **Step 1: Implementar**

`src/app/render/scene-builder.service.ts`:
```ts
import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GameLogicService } from '../core/game-logic.service';
import { EXPLOSION_MS, GRID_SIZE } from '../core/models/game-config';
import { EnemyView } from '../core/models/game-state.model';
import { InterpolatedMove } from '../core/models/game-state.model';
import { GridPosition, keyOf, samePosition } from '../core/models/position.model';
import { PowerUpType } from '../core/models/power-up.model';
import { TileType } from '../core/models/tile.model';

function tileToWorld(p: GridPosition): { x: number; z: number } {
  const offset = (GRID_SIZE - 1) / 2;
  return { x: p.x - offset, z: p.y - offset };
}

@Injectable({ providedIn: 'root' })
export class SceneBuilderService {
  private scene?: THREE.Scene;
  private readonly tileMeshes = new Map<string, THREE.Mesh>();
  private readonly bombMeshes = new Map<number, THREE.Mesh>();
  private readonly enemyMeshes = new Map<number, THREE.Group>();
  private readonly powerUpMeshes = new Map<string, THREE.Group>();
  private readonly renderedExplosions = new Map<number, { group: THREE.Group; startedAt: number }>();
  private playerMesh?: THREE.Group;
  private ground?: THREE.Mesh;

  init(scene: THREE.Scene): void {
    this.scene = scene;
    const geometry = new THREE.PlaneGeometry(GRID_SIZE + 3, GRID_SIZE + 3);
    const material = new THREE.MeshStandardMaterial({ color: 0x2a3245, roughness: 0.9 });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.ground = ground;
    this.scene.add(ground);
  }

  sync(logic: GameLogicService, deltaMs: number): void {
    if (!this.scene) {
      return;
    }
    const timeMs = logic.getGameTimeMs();
    this.syncTiles(logic);
    this.syncPlayer(logic);
    this.syncEnemies(logic);
    this.syncBombs(logic, timeMs);
    this.syncPowerUps(logic, timeMs);
    this.syncExplosions(logic, timeMs);
  }

  dispose(): void {
    this.tileMeshes.forEach((m) => this.disposeMesh(m));
    this.tileMeshes.clear();
    this.bombMeshes.forEach((m) => this.disposeMesh(m));
    this.bombMeshes.clear();
    this.enemyMeshes.forEach((g) => this.disposeGroup(g));
    this.enemyMeshes.clear();
    this.powerUpMeshes.forEach((g) => this.disposeGroup(g));
    this.powerUpMeshes.clear();
    this.renderedExplosions.forEach(({ group }) => this.disposeGroup(group));
    this.renderedExplosions.clear();
    if (this.playerMesh) {
      this.disposeGroup(this.playerMesh);
      this.playerMesh = undefined;
    }
    if (this.ground) {
      this.scene?.remove(this.ground);
      this.disposeMesh(this.ground);
      this.ground = undefined;
    }
  }

  private syncTiles(logic: GameLogicService): void {
    const grid = logic.getGrid();
    const exitBox = logic.getExitBox();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const p = { x, y };
        const key = keyOf(p);
        const type = grid[y][x].type;
        const existing = this.tileMeshes.get(key);
        if (existing && existing.userData.tileType === type) {
          continue;
        }
        if (existing) {
          this.scene?.remove(existing);
          this.disposeMesh(existing);
          this.tileMeshes.delete(key);
        }
        if (type === TileType.Empty) {
          continue;
        }
        const mesh = this.createTileMesh(p, type, samePosition(p, exitBox));
        mesh.userData.tileType = type;
        this.tileMeshes.set(key, mesh);
        this.scene?.add(mesh);
      }
    }
  }

  private createTileMesh(p: GridPosition, type: TileType, isExitBox: boolean): THREE.Mesh {
    const { x, z } = tileToWorld(p);
    let mesh: THREE.Mesh;
    if (type === TileType.Wall) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.2, 1),
        new THREE.MeshStandardMaterial({ color: 0x6b7280 }),
      );
      mesh.position.set(x, 0.6, z);
    } else if (type === TileType.Box) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshStandardMaterial({ color: isExitBox ? 0xc8862b : 0x9a6b2f }),
      );
      mesh.position.set(x, 0.45, z);
    } else {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.1, 24),
        new THREE.MeshStandardMaterial({ color: 0x37e06b, emissive: 0x1f8f42, emissiveIntensity: 0.8 }),
      );
      mesh.position.set(x, 0.05, z);
    }
    mesh.castShadow = type !== TileType.Exit;
    mesh.receiveShadow = true;
    return mesh;
  }

  private syncPlayer(logic: GameLogicService): void {
    const view = logic.getPlayerView();
    if (!this.playerMesh) {
      this.playerMesh = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.28, 0.55, 4, 12),
        new THREE.MeshStandardMaterial({ color: 0x4aa3ff }),
      );
      body.position.y = 0.75;
      body.castShadow = true;
      this.playerMesh.add(body);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.07),
        new THREE.MeshStandardMaterial({ color: 0x111111 }),
      );
      eye.position.set(0.14, 0.98, 0.22);
      this.playerMesh.add(eye);
      this.scene?.add(this.playerMesh);
    }
    this.applyView(this.playerMesh, view.position, view.move);
  }

  private syncEnemies(logic: GameLogicService): void {
    const views = logic.getEnemyViews();
    const seen = new Set<number>();
    for (const view of views) {
      seen.add(view.id);
      let group = this.enemyMeshes.get(view.id);
      if (!group) {
        group = this.createEnemyMesh();
        this.enemyMeshes.set(view.id, group);
        this.scene?.add(group);
      }
      this.applyView(group, view.position, view.move);
    }
    for (const [id, group] of this.enemyMeshes) {
      if (!seen.has(id)) {
        this.scene?.remove(group);
        this.disposeGroup(group);
        this.enemyMeshes.delete(id);
      }
    }
  }

  private createEnemyMesh(): THREE.Group {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.5, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0xff5252 }),
    );
    body.position.y = 0.72;
    body.castShadow = true;
    group.add(body);
    return group;
  }

  private syncBombs(logic: GameLogicService, timeMs: number): void {
    const bombs = logic.getBombs();
    const seen = new Set<number>();
    for (const bomb of bombs) {
      seen.add(bomb.id);
      let mesh = this.bombMeshes.get(bomb.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.5 }),
        );
        mesh.castShadow = true;
        this.bombMeshes.set(bomb.id, mesh);
        this.scene?.add(mesh);
      }
      const w = tileToWorld(bomb.position);
      mesh.position.set(w.x, 0.32, w.z);
      mesh.scale.setScalar(1 + 0.15 * Math.sin(timeMs / 150));
    }
    for (const [id, mesh] of this.bombMeshes) {
      if (!seen.has(id)) {
        this.scene?.remove(mesh);
        this.disposeMesh(mesh);
        this.bombMeshes.delete(id);
      }
    }
  }

  private syncPowerUps(logic: GameLogicService, timeMs: number): void {
    const drops = logic.getPowerUps();
    const seen = new Set<string>();
    for (const drop of drops) {
      const key = keyOf(drop.position);
      seen.add(key);
      let group = this.powerUpMeshes.get(key);
      if (!group) {
        group = this.createPowerUpMesh(drop.type);
        group.userData.phase = Math.random() * Math.PI * 2;
        this.powerUpMeshes.set(key, group);
        this.scene?.add(group);
      }
      const w = tileToWorld(drop.position);
      group.position.set(w.x, 0.55 + 0.12 * Math.sin(timeMs / 200 + (group.userData.phase as number)), w.z);
    }
    for (const [key, group] of this.powerUpMeshes) {
      if (!seen.has(key)) {
        this.scene?.remove(group);
        this.disposeGroup(group);
        this.powerUpMeshes.delete(key);
      }
    }
  }

  private createPowerUpMesh(type: PowerUpType): THREE.Group {
    const group = new THREE.Group();
    let mesh: THREE.Mesh;
    if (type === PowerUpType.Bomb) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xffd166 }),
      );
    } else if (type === PowerUpType.Range) {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xff8c42 }),
      );
    } else if (type === PowerUpType.Speed) {
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x7ce38b }),
      );
    } else {
      mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.25),
        new THREE.MeshStandardMaterial({ color: 0xcf9bff }),
      );
    }
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  private syncExplosions(logic: GameLogicService, timeMs: number): void {
    const explosions = logic.getExplosions();
    for (const explosion of explosions) {
      if (this.renderedExplosions.has(explosion.id)) {
        continue;
      }
      const group = new THREE.Group();
      for (const tile of explosion.tiles) {
        const w = tileToWorld(tile);
        const isCenter = samePosition(tile, explosion.position);
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.7, 0.7),
          new THREE.MeshBasicMaterial({
            color: isCenter ? 0xfff3b0 : 0xffa927,
            transparent: true,
            opacity: 0.95,
          }),
        );
        cube.position.set(w.x, 0.35, w.z);
        group.add(cube);
      }
      this.scene?.add(group);
      this.renderedExplosions.set(explosion.id, { group, startedAt: timeMs });
    }
    for (const [id, { group, startedAt }] of this.renderedExplosions) {
      if (!explosions.some((e) => e.id === id)) {
        this.scene?.remove(group);
        this.disposeGroup(group);
        this.renderedExplosions.delete(id);
        continue;
      }
      const progress = (logic.getGameTimeMs() - startedAt) / EXPLOSION_MS;
      group.scale.setScalar(Math.max(0.1, progress));
    }
  }

  private applyView(mesh: THREE.Object3D, position: GridPosition, move: InterpolatedMove | null): void {
    let x: number;
    let z: number;
    if (move) {
      const from = tileToWorld(move.from);
      const to = tileToWorld(move.to);
      const t = move.progress;
      x = from.x + (to.x - from.x) * t;
      z = from.z + (to.z - from.z) * t;
    } else {
      const w = tileToWorld(position);
      x = w.x;
      z = w.z;
    }
    mesh.position.set(x, mesh.position.y, z);
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material)) {
      material.forEach((m) => m.dispose());
    } else {
      material.dispose();
    }
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        this.disposeMesh(mesh);
      }
    });
  }
}
```

Nota: `syncEnemies` usa os campos das views via inferência de tipo; nenhum import extra de `EnemyView` é necessário.

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/render/scene-builder.service.ts
git commit -m "feat: add scene builder with tile meshes and visual interpolation"
```

---

### Task 11: GameComponent — canvas, HUD mobile, overlays e wiring

**Files:**
- Create: `src/app/game/game.component.ts`
- Create: `src/app/game/game.component.html`
- Create: `src/app/game/game.component.scss`
- Modify: `src/app/app.component.ts` (host que renderiza `<app-game/>`)
- Delete: `src/app/app.component.spec.ts` (instancia AppComponent → instancia GameComponent → WebGL no Karma)

**Interfaces:**
- Consumes: `ThreeEngineService.init`, `SceneBuilderService.init/sync/dispose`, `GameLogicService.start/tick/restart/Signals`, `InputManagerService.attach/detach/direction$/action$/isTouchDevice/setDirection/pressAction`.
- Produces:
  - `game.component.ts`: `@ViewChild('gameCanvas')`, `@ViewChild('gameContainer')`; injeta os 4 serviços; expõe `score`, `enemiesRemaining`, `maxBombs`, `range`, `speed`, `pierce`, `gamePhase`, `exitOpen`, `isTouch`, `initError`, `Direction`, `GamePhase`; `ngAfterViewInit` inicializa engine (catch → `initError`), sceneBuilder, `logic.start()`, `engine.startLoop(dt => { logic.tick(dt); sceneBuilder.sync(logic, dt) })`, `input.attach()` e subscriptions; `ngOnDestroy` unsubscribes, `input.detach()`, `engine.stopLoop()`, `engine.dispose()`, `sceneBuilder.dispose()`; handlers `onDirection(d)`, `onAction()`, `restart()`.
  - Template: canvas + HUD topo (pontos, inimigos, bombas, alcance, velocidade, atravessa) + D-Pad e botão de ação `*ngIf="isTouch"` + overlay vitória/derrota com botão reiniciar + mensagem de erro WebGL.
  - Estilos: container `100vw/100vh`, HUD flutuante, D-Pad 3x3 grid no canto inferior esquerdo, botão ação circular inferior direito, overlay central, `touch-action: none`, `pointer-events` controlados.

- [ ] **Step 1: Implementar componente**

`src/app/game/game.component.ts`:
```ts
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { GameLogicService } from '../core/game-logic.service';
import { InputManagerService } from '../core/input-manager.service';
import { Direction } from '../core/models/direction.model';
import { GamePhase } from '../core/models/game-state.model';
import { SceneBuilderService } from '../render/scene-builder.service';
import { ThreeEngineService } from '../render/three-engine.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) private readonly canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gameContainer', { static: true }) private readonly container!: ElementRef<HTMLDivElement>;

  private readonly engine = inject(ThreeEngineService);
  private readonly sceneBuilder = inject(SceneBuilderService);
  private readonly logic = inject(GameLogicService);
  private readonly input = inject(InputManagerService);

  readonly score = this.logic.score;
  readonly enemiesRemaining = this.logic.enemiesRemaining;
  readonly maxBombs = this.logic.maxBombs;
  readonly range = this.logic.range;
  readonly speed = this.logic.speed;
  readonly pierce = this.logic.pierce;
  readonly gamePhase = this.logic.gamePhase;
  readonly exitOpen = this.logic.exitOpen;
  readonly isTouch = this.input.isTouchDevice();
  readonly initError = signal(false);
  readonly Direction = Direction;
  readonly GamePhase = GamePhase;

  private readonly subscriptions: Subscription[] = [];

  ngAfterViewInit(): void {
    try {
      this.engine.init(this.container.nativeElement, this.canvas.nativeElement);
    } catch {
      this.initError.set(true);
      return;
    }
    this.sceneBuilder.init(this.engine.scene);
    this.logic.start();
    this.engine.startLoop((deltaMs) => {
      this.logic.tick(deltaMs);
      this.sceneBuilder.sync(this.logic, deltaMs);
    });
    this.input.attach();
    this.subscriptions.push(
      this.input.direction$.subscribe((d) => this.logic.move(d)),
      this.input.action$.subscribe(() => this.logic.plantBomb()),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.input.detach();
    this.engine.stopLoop();
    this.engine.dispose();
    this.sceneBuilder.dispose();
  }

  onDirection(direction: Direction | null): void {
    this.input.setDirection(direction);
  }

  onAction(): void {
    this.input.pressAction();
  }

  restart(): void {
    this.logic.restart();
  }
}
```

- [ ] **Step 2: Template**

`src/app/game/game.component.html`:
```html
<div class="game-container" #gameContainer>
  <canvas class="game-canvas" #gameCanvas></canvas>

  <div class="hud-top">
    <span>Pontos: {{ score() }}</span>
    <span>Inimigos: {{ enemiesRemaining() }}</span>
    <span>Bombas: {{ maxBombs() }}</span>
    <span>Alcance: {{ range() }}</span>
    <span *ngIf="speed()">Vel +{{ speed() }}</span>
    <span *ngIf="pierce()">Atravessa</span>
  </div>

  <div class="controls" *ngIf="isTouch">
    <div class="d-pad">
      <button
        class="d-btn up"
        (pointerdown)="onDirection(Direction.Up)"
        (pointerup)="onDirection(null)"
        (pointerleave)="onDirection(null)"
      >▲</button>
      <button
        class="d-btn left"
        (pointerdown)="onDirection(Direction.Left)"
        (pointerup)="onDirection(null)"
        (pointerleave)="onDirection(null)"
      >◀</button>
      <button
        class="d-btn right"
        (pointerdown)="onDirection(Direction.Right)"
        (pointerup)="onDirection(null)"
        (pointerleave)="onDirection(null)"
      >▶</button>
      <button
        class="d-btn down"
        (pointerdown)="onDirection(Direction.Down)"
        (pointerup)="onDirection(null)"
        (pointerleave)="onDirection(null)"
      >▼</button>
    </div>
    <button class="action-btn" (pointerdown)="onAction()">💣</button>
  </div>

  <div class="overlay" *ngIf="gamePhase() !== GamePhase.Playing">
    <h2 class="overlay-title">
      {{ gamePhase() === GamePhase.Victory ? 'Vitória!' : 'Derrota' }}
    </h2>
    <button class="restart-btn" (click)="restart()">Jogar novamente</button>
  </div>

  <div class="error" *ngIf="initError()">Seu navegador não suporta WebGL.</div>
</div>
```

- [ ] **Step 3: Estilos**

`src/app/game/game.component.scss`:
```scss
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0f1420;
}

.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.hud-top {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font: 14px/1.4 sans-serif;
  border-radius: 999px;
  white-space: nowrap;
  pointer-events: none;
}

.controls {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.d-pad {
  position: absolute;
  left: 18px;
  bottom: 18px;
  display: grid;
  grid-template-columns: repeat(3, 56px);
  grid-template-rows: repeat(3, 56px);
  gap: 4px;
  pointer-events: auto;
}

.d-btn {
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 20px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.d-btn:active {
  background: rgba(255, 255, 255, 0.45);
}

.up {
  grid-column: 2;
  grid-row: 1;
}

.left {
  grid-column: 1;
  grid-row: 2;
}

.right {
  grid-column: 3;
  grid-row: 2;
}

.down {
  grid-column: 2;
  grid-row: 3;
}

.action-btn {
  position: absolute;
  right: 24px;
  bottom: 24px;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  border: none;
  font-size: 32px;
  background: rgba(255, 87, 34, 0.85);
  color: #fff;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
}

.action-btn:active {
  background: rgba(255, 87, 34, 1);
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}

.overlay-title {
  font-size: 42px;
  margin: 0;
}

.restart-btn {
  padding: 12px 26px;
  font-size: 18px;
  border: none;
  border-radius: 10px;
  background: #37e06b;
  color: #062b12;
  cursor: pointer;
}

.error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  text-align: center;
}
```

- [ ] **Step 4: Atualizar AppComponent**

`src/app/app.component.ts`:
```ts
import { Component } from '@angular/core';
import { GameComponent } from './game/game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameComponent],
  template: `<app-game />`,
})
export class AppComponent {}
```
Delete: `src/app/app.component.spec.ts`.

- [ ] **Step 5: Verificar build e testes**

Run: `npm run build` e `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: build compila; testes passam (app.component.spec removido).

- [ ] **Step 6: Commit**

```bash
git add src/app/game src/app/app.component.ts
git rm src/app/app.component.spec.ts
git commit -m "feat: wire game component with canvas, HUD and mobile controls"
```

---

### Task 12: Verificação final

**Files:**
- Nenhum novo. Apenas verificação e (se necessário) correções.

**Interfaces:**
- Consumes: todas as tasks anteriores.

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 2: Testes completos**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: todos os specs PASS (models, level, input, game-logic).

- [ ] **Step 3: Smoke test manual (Desktop)**

Run: `npm start` e abrir `http://localhost:4200`.
Checklist:
1. Cena isométrica com chão, paredes intercaladas, caixas; jogador azul no canto (1,1).
2. WASD/setas movem o jogador tile a tile; Espaço planta bomba.
3. Bomba pulsa e explode em cruz após ~3s; paredes indestrutíveis bloqueiam; caixas somem; possíveis power-ups aparecem.
4. Inimigos vermelhos se movem em direção ao jogador; contato ou explosão = derrota (overlay + reiniciar).
5. Destruir caixa da saída (tom alaranjado) e eliminar todos os inimigos → saída verde; pisar nela = vitória.
6. Redimensionar a janela (retrato/paisagem): grid continua cabendo na tela.

- [ ] **Step 4: Smoke test manual (Mobile)**

No navegador com emulação touch (DevTools → device toolbar) ou dispositivo real:
1. D-Pad e botão de ação aparecem; segurar direção move continuamente.
2. Multi-touch: mover com um dedo e soltar bomba com outro.
3. Rotação da tela mantém o grid visível.

- [ ] **Step 5: Commit final (se houver correções)**

```bash
git add .
git commit -m "chore: final verification and fixes"
```
Só se houver mudanças.

---

## Self-Review

**Spec coverage:**
- ThreeEngineService (cena, luzes, câmera isométrica, rAF, resize retrato/paisagem) → Task 9.
- InputManagerService (teclado WASD/setas/espaço + D-Pad/botão touch) → Task 4 + Task 11.
- LevelService (grid 15x15, paredes intercaladas, caixas procedurais, saída escondida) → Task 3.
- Lógica discreta separada de interpolação visual → GameLogicService (core) vs SceneBuilder (render).
- Movimento tile a tile com transição suave → Tasks 5 + 10 (applyView lerp).
- Bombas (timer 3s), explosão em cruz bloqueada por paredes, caixas removidas → Task 6.
- Power-ups (+bomba, +alcance, +velocidade, atravessa) → Tasks 6 + 8.
- Inimigos com AI → Task 7.
- Vitória (saída aberta após eliminar inimigos e destruir caixa) / derrota (explosão/contato) → Tasks 6-8.
- Signals na UI reativa → Task 11.
- Responsivo Desktop/Mobile → Tasks 9 (resize) + 11 (HUD).

**Placeholder scan:** nenhum TBD/TODO; todo passo tem código concreto.

**Type consistency:** `GridPosition`, `keyOf`, `manhattan`, `samePosition` definidos na Task 2 e usados de forma consistente nas Tasks 3-10. `EntityView`/`EnemyView`/`InterpolatedMove` definidos na Task 2, usados em 5 e 10. `GameLogicService.start(seed?)` (Task 5) usado em testes (Task 5-8) e componente (Task 11). `LevelService.random()/randomInt()` (Task 3) usados na Task 6 (`maybeDropPowerUp`) e Task 7 (`beginEnemyMove`). `tileToWorld`, `applyView`, `disposeMesh`, `disposeGroup` definidos na Task 10 e usados só nela. Signals com mesmos nomes nas Tasks 5-11.
