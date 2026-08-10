# Design — Bomberman 3D (Angular + Three.js)

**Data:** 2026-08-10
**Status:** Aprovado pelo usuário em brainstorming

## Visão geral

Jogo browser estilo Bomberman (mini-aventura) em 3D, usando Angular (standalone components, TypeScript estrito, Injeção de Dependência) e Three.js. Responsivo para Desktop (teclado) e Mobile (tela touch com D-Pad virtual). A lógica do jogo é separada da lógica de renderização (Clean Architecture): o estado discreto do grid vive na camada `core`, e os meshes Three.js vivem na camada `render`.

## Stack

- Angular (Standalone Components, Signals, TypeScript rigoroso, DI).
- Three.js (`three` + `@types/three`): `WebGLRenderer`, cena 3D, geometrias primitivas.
- Ferramenta de build: Angular CLI (`npx @angular/cli`).

## Estrutura de diretórios

```
src/app/
├── core/                          # Lógica pura, SEM Three.js
│   ├── models/
│   │   ├── tile.model.ts          # TileType (EMPTY, WALL, BOX, EXIT), Tile
│   │   ├── position.model.ts      # GridPosition {x, y}
│   │   ├── direction.model.ts     # Direções N/S/L/O
│   │   ├── power-up.model.ts      # PowerUpType + config
│   │   ├── bomb.model.ts          # Bomba (tile, timer, range, pierce)
│   │   ├── enemy.model.ts         # Estado do inimigo (posição, estado)
│   │   ├── player.model.ts        # Estado do jogador (posição, stats, viva)
│   │   └── game-state.model.ts    # GamePhase (PLAYING, VICTORY, DEFEAT)
│   ├── level.service.ts           # Geração do grid 15x15
│   ├── input-manager.service.ts   # Teclado + touch (D-Pad/botão ação)
│   └── game-logic.service.ts      # Simulação: bombas, explosão, inimigos, power-ups, vitória/derrota
├── render/
│   ├── three-engine.service.ts    # Renderer, câmera isométrica, luzes, rAF, resize
│   └── scene-builder.service.ts   # Meshes ↔ grid, interpolação visual, animações
└── game/
    ├── game.component.ts          # <canvas>, inicialização, wiring, Signals de UI
    ├── game.component.html        # HUD mobile (D-Pad, botão ação), overlays (vitória/derrota)
    └── game.component.scss        # Estilos do HUD e overlays
```

## Arquitetura e responsabilidades

### `core/level.service.ts`
- Gera uma matriz `GridPosition[][]` 15x15 (índices 0..14).
- Paredes indestrutíveis na borda (x=0, x=14, y=0, y=14) e no padrão intercalado Bomberman (x e y ímpares).
- Caixas destrutíveis posicionadas proceduralmente (aleatório), com raio livre mínimo em torno dos spawns do jogador e dos inimigos.
- Define a posição da **saída escondida**: um tile de `BOX` sorteado (longe dos spawns); a saída existe sob essa caixa e abre quando todos os inimigos morrem **e** essa caixa é destruída.
- Expõe consultas de estado do grid (ex.: `isWalkable(x,y)`, `tileAt(x,y)`).

### `core/input-manager.service.ts`
- API abstrata e híbrida:
  - **Desktop:** WASD/setas para movimento, Espaço para plantar bomba.
  - **Mobile:** D-Pad virtual (4 botões: cima, baixo, esquerda, direita) e botão de ação (bomba) no template Angular; mapeia `touchstart`/`touchend`.
- Expõe `Observable<Direction | null>` (direção pressionada) e `Observable<void>` (ação).
- Detecta dispositivo (pointer/touch) para ativar/desativar a UI mobile.

### `core/game-logic.service.ts`
- Fonte da verdade do estado do jogo (não conhece Three.js).
- **Movimento:** discreto por célula. O jogador segue uma direção e transita de um tile ao vizinho; a transição visual é interpolada na camada de render; a lógica confirma o tile de destino quando a transição termina. Bloqueado apenas por `WALL` e `BOX`. Se o tile de destino está ocupado por um inimigo, ocorre contato → derrota.
- **Bombas:** plantar no centro do tile atual, respeitando limite `maxBombs` (base 1 + power-ups). Timer de 3s. Ao explodir, calcula área em cruz N/S/L/O com `range` (base 1 + power-ups), interrompida por `WALL`; se o jogador tem power-up **atravessa paredes**, a explosão passa por caixas destrutíveis (destruindo-as) e só para em `WALL`.
- **Explosão:** tiles atingidos são marcados; caixas atingidas viram `EMPTY` e podem dropar power-up; inimigos no tile atingido morrem; jogador no tile atingido morre (derrota).
- **Inimigos:** 3 no início, AI simples por célula: preferem direção que aproxima do jogador com desvio aleatório; evitam entrar em explosão ativa; morrem em contato com explosão; matam o jogador em contato.
- **Power-ups:** drop com probabilidade (~40%) ao destruir caixa, no tile da caixa destruída; coletados ao pisar no tile; efeitos: +Bomba (maxBombs+1), +Alcance (range+1), +Velocidade (duração da transição menor), Atravessa paredes (boolean).
- **Fim de jogo:**
  - **Vitória:** todos os inimigos mortos **e** a caixa que esconde a saída destruída → saída aberta (tile vira `EXIT`); pisar na saída vence.
  - **Derrota:** jogador atingido por explosão ou tocado por inimigo.
- Expõe `Signals` de UI: `score`, `enemiesRemaining`, `maxBombs`, `range`, `speed`, `pierce`, `gamePhase`, `exitOpen`.

### `render/three-engine.service.ts`
- Cria `WebGLRenderer` (antialias, `setPixelRatio(min(devicePixelRatio, 2))` para performance mobile), `OrthographicCamera` isométrica, luz ambiente + direcional com sombras leves.
- Loop de renderização com `requestAnimationFrame` + clock com delta time.
- `ResizeObserver` + evento resize: ajusta tamanho do canvas, aspect e limites da câmera; câmera se adapta entre retrato e paisagem para o grid inteiro caber na tela.

### `render/scene-builder.service.ts`
- Traduz o estado do `GameLogicService` para meshes Three.js:
  - Chão, paredes indestrutíveis (mesh paralelepípedo), caixas (mesh paralelepípedo).
  - Jogador e inimigos: meshes simples coloridos.
  - Bombas: esfera com animação de pulso conforme o timer.
  - Explosões: volume em cruz que expande e some (~300ms).
  - Power-ups: formas flutuantes coloridas sobre o tile.
  - Saída: marcador visual distinto quando aberta.
- Interpolação visual contínua entre tiles (posição) baseada no tempo, usando o estado discreto como fonte de verdade.
- Mantém mapa tile↔mesh para remoção síncrona (caixa destruída, power-up coletado).

### `game/game.component.*`
- `game.component.html`: `<canvas #gameCanvas>`; HUD mobile (D-Pad + botão de ação) ativado por detecção de touch; HUD de status (pontuação, inimigos restantes, power-ups); overlays de vitória/derrota.
- `game.component.ts`: inicializa `ThreeEngineService`, `SceneBuilderService`, `GameLogicService`, `InputManagerService`; conecta inputs → lógica; lógica → cena; Signals refletem na UI reativamente.

## Fluxo de dados

```
Input (teclado/touch)
      ↓  InputManagerService (Observables)
GameLogicService (estado discreto, Signals)
      ↓
SceneBuilderService (meshes Three.js)
      ↓
ThreeEngineService (câmera/luzes/rAF/render)
```

## Tratamento de erros

- Inicialização do WebGL: se falhar, `ThreeEngineService` lança erro claro e `GameComponent` mostra mensagem amigável (contexto não suportado).
- Reinício: novo jogo regenera o nível via `LevelService` e reseta o estado.

## Testes

- Unit (Jasmine/Karma do scaffold Angular):
  - `LevelService`: dimensões, paredes de borda/intercaladas, raio livre dos spawns, saída escondida sob uma caixa.
  - `GameLogicService`: explosão em cruz interrompida por parede indestrutível; destruição de caixas; power-up atravessa paredes; vitória/derrota; limites de bombas.
- `ng build` deve compilar sem erros.
- `ng lint` deve passar.

## Fora de escopo (futuro)

- Texturas e modelos 3D reais (o design já separa lógica/render para permitir isso).
- Multiplayer, áudio, níveis múltiplos/rounds progressivos.
