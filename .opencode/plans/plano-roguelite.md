# Plano: Sistema Roguelite — Bomberman 3D

---

## 1. Visão Geral

Transformar o Bomberman atual (fases sequenciais infinitas) em runs roguelite com:
- **3 vidas + escudo** (não punitivo)
- **Timer regressivo único** por run (ex: 10 min)
- **Escolha de 3 cartas a cada 2 fases** (sem repetição na run)
- **Upgrades por sinergia** (cartas + bombas + inimigos escalando)
- **Boss final de sinergia** na última fase
- **Persistência híbrida**: pool curado + variantes por seed + histórico no Prisma

---

## 2. Arquitetura de Dados (Prisma)

### Novos Models

```prisma
// prisma/schema.prisma — adições

model Run {
  id           String   @id @default(ulid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  seed         String
  phase        Int      @default(1)
  maxPhase     Int      @default(1)
  lives        Int      @default(3)
  shield       Int      @default(0)
  timeLeftMs   Int
  score        Int      @default(0)
  startedAt    DateTime @default(now())
  endedAt      DateTime?
  endedReason  String?
  seedData     Json?

  choices      RunChoice[]
  upgrades     RunUpgrade[]
  @@index([userId])
}

model RunChoice {
  id        String   @id @default(cuid())
  runId     String
  run       Run      @relation(fields: [runId], references: [id], onDelete: Cascade)
  phase     Int
  offered   String[]
  picked    String
  createdAt DateTime @default(now())
}

model RunUpgrade {
  id        String   @id @default(cuid())
  runId     String
  run       Run      @relation(fields: [runId], references: [id], onDelete: Cascade)
  cardKey   String
  stacks    Int      @default(1)
  createdAt DateTime @default(now())
  @@unique([runId, cardKey])
}

model Card {
  id           String   @id @default(cuid())
  key          String   @unique
  name         String
  description  String
  icon         String
  rarity       String
  category     String
  maxStacks    Int      @default(1)
  prerequisites String[] @default("[]")
  weight       Int      @default(10)
  isSynergy    Boolean  @default(false)
  synergyWith  String[] @default("[]")
}

model EnemyArchetype {
  id           String   @id @default(cuid())
  key          String   @unique
  name         String
  baseHp       Int
  baseSpeed    Int
  baseDamage   Int
  bombRange    Int
  bombChance   Float
  abilities    String[] @default("[]")
  scalePerPhase Json
  minPhase     Int      @default(1)
  weight       Int      @default(10)
  isBoss       Boolean  @default(false)
}
```

### Migracao
```bash
npm run migrate:dev -- --name add_roguelite
npm run generate
```

---

## 3. Estrutura de Arquivos (Frontend)

```
src/app/core/
├── models/
│   ├── card.model.ts              # Tipos de carta, pool, raridade
│   ├── run.model.ts               # Estado da run (lives, timer, seed, upgrades)
│   ├── enemy-archetype.model.ts   # Arquétipos de inimigos + scaling
│   └── synergy.model.ts           # Definição de sinergias (bomba + carta)
├── roguelite/
│   ├── run-state.service.ts       # Estado reativo da run (signals)
│   ├── card-pool.service.ts       # Geração de 3 cartas únicas por escolha
│   ├── upgrade-applier.service.ts # Aplica upgrades ao GameLogicService
│   ├── enemy-scaler.service.ts    # Escala inimigos por fase + upgrades
│   ├── synergy-engine.service.ts  # Detecta/aplica sinergias ativas
│   └── run-persistence.service.ts # Salva/carrega run no backend
├── game-logic.service.ts          # (existente) — receber hooks de upgrade
└── level.service.ts               # (existente) — spawn baseado em archetype
```

---

## 4. Cartas (Pool Base — ~30 cartas)

### Categorias e Exemplos

| Key | Nome | Categoria | Raridade | Stacks | Descrição | Sinergia |
|-----|------|-----------|----------|--------|-----------|----------|
| `BOMB_PLUS_1` | Bomba Extra | BOMB | COMMON | 3 | +1 bomba simultânea | — |
| `RANGE_PLUS_1` | Alcance Estendido | RANGE | COMMON | 3 | +1 alcance da explosão | — |
| `SPEED_PLUS_1` | Passos Rápidos | SPEED | COMMON | 4 | -30ms movimento (min 150ms) | — |
| `PIERCE_BOMB` | Bomba Perfurante | BOMB | UNCOMMON | 1 | Explosão atravessa caixas | `CHAIN_BOMB` |
| `CHAIN_BOMB` | Reação em Cadeia | SYNERGY | RARE | 1 | Se explosão toca outra bomba → ambas explodem | `PIERCE_BOMB`, `MEGA_BOMB` |
| `FREEZE_BOMB` | Bomba Congelante | SYNERGY | RARE | 1 | Inimigo congelado 2s ao ser atingido | `BOMB_PLUS_1`, `SHATTER` |
| `SHATTER` | Estilhaçar | SYNERGY | RARE | 1 | Inimigo congelado morre em 1 hit | `FREEZE_BOMB` |
| `SHIELD` | Escudo Protetor | DEFENSE | UNCOMMON | 1 | 1 escudo por run (absorve 1 hit) | — |
| `LIFE_STEAL` | Roubo de Vida | DEFENSE | RARE | 1 | Matar inimigo: 10% chance +1 vida (max 3) | — |
| `TIME_BONUS` | Cronômetro | UTILITY | UNCOMMON | 2 | +60s no timer da run | — |
| `MAGNET` | Ímã de Power-ups | UTILITY | COMMON | 1 | Power-ups vêm até você (alcance 2) | — |
| `BOMB_KICK` | Chute de Bomba | BOMB | UNCOMMON | 1 | Andar empurra bomba 1 tile | `CHAIN_BOMB` |
| `REMOTE_DETONATE` | Detonação Remota | BOMB | RARE | 1 | Espaço = detona sua bomba mais velha | `MEGA_BOMB` |
| `MEGA_BOMB` | Mega Bomba | SYNERGY | RARE | 1 | 1x por fase: bomba 2x alcance + perfura parede | `REMOTE_DETONATE`, `CHAIN_BOMB` |
| `GHOST_WALK` | Passo Fantasma | UTILITY | RARE | 1 | Atravessa caixas (não paredes) 3s/cd | — |
| `REVENGE` | Vingança | SYNERGY | RARE | 1 | Ao tomar dano: solta bomba grátis no local | `SHIELD` |
| `BOMB_REFLECT` | Refletir Bomba | DEFENSE | UNCOMMON | 1 | Bomba inimiga que te atinge vira sua | — |
| `SPEED_DEMON` | Demônio da Velocidade | SPEED | RARE | 1 | Speed >= 6: inimigos ficam 20% mais lentos | `SPEED_PLUS_1` |
| `BOSS_SLAYER` | Matador de Chefes | SYNERGY | RARE | 1 | +50% dano vs boss final | `MEGA_BOMB`, `SHATTER` |
| `RICOCHET` | Ricochete | BOMB | UNCOMMON | 1 | Explosão ricocheteia 1x em parede | `CHAIN_BOMB`, `PIERCE_BOMB` |
| `VAMPIRISM` | Vampirismo | DEFENSE | RARE | 1 | Caixa destruída: 5% cura 1 vida (max 3) | `LIFE_STEAL` |

> **Pre-requisitos** (`prerequisites`): ex: `SHATTER` requer `FREEZE_BOMB`; `MEGA_BOMB` requer `BOMB_PLUS_1` nivel 2.

---

## 5. Inimigos — Arquétipos + Scaling

### Pool Base (10-12 archetypes)

| Key | Nome | HP Base | Speed | Habilidades | Fase Min | Boss? |
|-----|------|---------|-------|-------------|----------|-------|
| `GRUNT` | Lacaio | 1 | 400ms | — | 1 | Não |
| `SPEEDY` | Veloz | 1 | 250ms | — | 2 | Não |
| `TANK` | Tanque | 3 | 500ms | `FREEZE_IMMUNE` | 3 | Não |
| `BOMBER` | Bombardeiro | 2 | 400ms | `FAST_BOMB` (2.5s) | 3 | Não |
| `GHOST` | Fantasma | 1 | 350ms | `PHASE_WALLS` (atravessa caixa 1x/3s) | 4 | Não |
| `SNIPER` | Atirador | 1 | 450ms | `LONG_RANGE` (alcance 3) | 4 | Não |
| `SPLITTER` | Divisor | 2 | 400ms | `ON_DEATH_SPLIT` (vira 2 GRUNTs) | 5 | Não |
| `SHIELDER` | Escudeiro | 2 | 400ms | `FRONTAL_SHIELD` (bloca 1 hit frontal) | 5 | Não |
| `TELEPORTER` | Teleportador | 1 | 500ms | `BLINK` (teleporta ao tomar dano) | 6 | Não |
| `MINI_BOSS` | Mini-Chefe | 5 | 350ms | `SUMMON_GRUNT`, `FAST_BOMB` | 7 | Não |
| `SYNERGY_BOSS` | **Chefe Final** | 15 | 300ms | `PHASE_SHIFT`, `BOMB_STORM`, `FREEZE_AURA`, `ENRAGE` | 10 | **Sim** |

### Scaling por Fase (`scalePerPhase`)

```json
// Exemplo TANK
{ "hpMult": 1.2, "speedMult": 0.98, "bombRangeMult": 1.05, "bombChanceAdd": 0.02 }
// Exemplo SYNERGY_BOSS
{ "hpMult": 1.15, "speedMult": 0.97, "newAbilityAt": { 12: "METEOR", 15: "VOID_ZONE" } }
```

> **Regra**: A partir da fase 5, **1 bomba nao basta** para matar TANK/SHIELDER → exige `FREEZE_BOMB` + bomba normal ou `MEGA_BOMB` / `PIERCE_BOMB`.

---

## 6. Sinergias (Motor de Combinação)

### Tabela de Sinergias Ativas

| Sinergia | Cartas Necessárias | Efeito |
|----------|-------------------|--------|
| **Cadeia Congelante** | `FREEZE_BOMB` + `BOMB_PLUS_1` (>=2) | Congela + explode em cadeia; inimigos congelados levam 2x dano |
| **Estilhaçar** | `FREEZE_BOMB` + `SHATTER` | Inimigo congelado = 1 hit kill (ignora HP) |
| **Detonação em Cadeia** | `CHAIN_BOMB` + `PIERCE_BOMB` + `BOMB_KICK` | Chuta bomba → explode → aciona outras → perfura caixas |
| **Mega Remota** | `MEGA_BOMB` + `REMOTE_DETONATE` | Detona mega-bomba no momento ideal; 3x alcance |
| **Fantasma Bomba** | `GHOST_WALK` + `BOMB_KICK` | Entra na caixa, chuta bomba para dentro, sai |
| **Vampirismo Total** | `LIFE_STEAL` + `VAMPIRISM` | Caixas e inimigos dão vida; sustentação infinita se jogar bem |
| **Velocidade Letal** | `SPEED_DEMON` + `SPEED_PLUS_1` (>=4) | Inimigos lentos + voce rapido = kite perfeito |
| **Refletor Mestre** | `BOMB_REFLECT` + `CHAIN_BOMB` | Bomba inimiga reflectida vira cadeia sua |

### Implementação (`synergy-engine.service.ts`)

```typescript
readonly activeSynergies = signal<SynergyKey[]>([]);

checkSynergies(upgrades: RunUpgrade[]): SynergyKey[] {
  const owned = new Set(upgrades.map(u => u.cardKey));
  return SYNERGY_DEFINITIONS.filter(s => s.requires.every(r => owned.has(r))).map(s => s.key);
}
```

---

## 7. Fluxo da Run

```
Iniciar Run → Gerar Seed + Run no DB
     │
     ▼
Fase N: Spawn inimigos (escala + arquetipos)
     │
     ├──► Timer zera? ──► Fim: TIME_UP
     │
     ├──► Jogador morre? ──► Perde vida/escudo
     │         │
     │         ├──► Vidas > 0? → Continua fase
     │         └──► Vidas == 0? → Fim: NO_LIVES
     │
     ├──► Limpa inimigos → exit abre
     │
     ▼
Fase % 2 == 0? ──► Sim: Tela de Draft (3 cartas) → Escolhe 1 → Aplica upgrade
     │                                                      → Recomputa sinergias
     │                                    ▼
     └──► Não → Próxima fase
     │
     ▼
Fase == MAX_PHASE? ──► Sim: Boss Final SYNERGY_BOSS
     │                          │
     │                          ├──► Venceu → VICTORY + rewards
     │                          └──► Morreu → Perde vida → se 0 → NO_LIVES
     │
     └──► Não → Próxima fase (loop)
```

---

## 8. UI — Tela de Escolha de Cartas

### Componente: `CardDraftComponent`

- **Trigger**: `gamePhase === 'DRAFT'` (após fase par)
- **Layout**: 3 cards lado a lado (responsivo: stack no mobile)
- **Card**: ícone, nome, descrição, raridade (borda colorida), tags de sinergia
- **Animação**: entrada escalonada (stagger 100ms), hover = scale 1.05
- **Acessibilidade**: navegação por setas + Enter, foco visível, ARIA labels
- **Persistência**: escolha salva em `RunChoice` + `RunUpgrade` via API

### Estados do GamePhase (atualizar `game-state.model.ts`)

```typescript
export enum GamePhase {
  Ready = 'READY',
  Playing = 'PLAYING',
  Draft = 'DRAFT',        // NOVO: escolha de cartas
  Victory = 'VICTORY',
  Defeat = 'DEFEAT',
  RunEnd = 'RUN_END',     // NOVO: tela final da run
}
```

---

## 9. Backend — API Routes (em `src/server.ts`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/runs` | POST | Iniciar nova run (cria `Run` + seed) |
| `/api/runs/:id` | GET | Carregar run ativa (para continue) |
| `/api/runs/:id/choice` | POST | Registrar escolha de carta (`RunChoice` + `RunUpgrade`) |
| `/api/runs/:id/end` | POST | Finalizar run (salva score, tempo, reason) |
| `/api/runs/history` | GET | Lista runs do usuário (paginado) |
| `/api/cards/pool` | GET | Pool de cartas (para cliente mostrar raridades) |
| `/api/enemies/archetypes` | GET | Arquétipos de inimigos (para escalar no cliente) |

> **Auth**: Todas rotas exigem sessão (`req.user`). Usar `express-session` já existente.

---

## 10. Integração com GameLogicService

### Hooks Necessários (mínimos, nao quebrar testes existentes)

```typescript
// game-logic.service.ts — adições

applyRunUpgrades(upgrades: RunUpgrade[]): void {
  for (const u of upgrades) {
    switch (u.cardKey) {
      case 'BOMB_PLUS_1': this.maxBombs.update(b => b + u.stacks); break;
      case 'RANGE_PLUS_1': this.range.update(r => r + u.stacks); break;
      case 'SPEED_PLUS_1': this.applySpeedStacks(u.stacks); break;
      case 'PIERCE_BOMB': this.pierce.set(true); break;
      case 'FREEZE_BOMB': this.player.freezeBomb = true; break;
      case 'SHIELD': this.runState.shield.set(1); break;
      case 'LIFE_STEAL': this.player.lifeSteal = true; break;
      case 'BOMB_KICK': this.player.canKick = true; break;
      case 'REMOTE_DETONATE': this.player.remoteDetonate = true; break;
      case 'MEGA_BOMB': this.player.megaBombCharges = 1; break;
      case 'GHOST_WALK': this.player.ghostWalkCd = 0; break;
      case 'REVENGE': this.player.revenge = true; break;
      case 'BOMB_REFLECT': this.player.reflect = true; break;
      case 'SHATTER': this.player.shatter = true; break;
      case 'RICOCHET': this.player.ricochet = true; break;
      case 'VAMPIRISM': this.player.vampirism = true; break;
      case 'TIME_BONUS': this.runState.addTime(60_000 * u.stacks); break;
      case 'MAGNET': this.player.magnetRange = 2; break;
      case 'SPEED_DEMON': /* passivo */ break;
      case 'BOSS_SLAYER': this.player.bossSlayer = true; break;
    }
  }
  this.synergyEngine.recompute(upgrades);
}

private applySynergyEffects(): void {
  if (this.synergyEngine.has('FREEZE_CHAIN')) { /* logica */ }
  if (this.synergyEngine.has('SHATTER')) { /* inimigo congelado = 1 hit */ }
}
```

### Novos Campos em `PlayerState` (`player.model.ts`)

```typescript
export interface PlayerState {
  // ...existentes
  freezeBomb: boolean;
  lifeSteal: boolean;
  canKick: boolean;
  remoteDetonate: boolean;
  megaBombCharges: number;
  ghostWalkCd: number;
  revenge: boolean;
  reflect: boolean;
  shatter: boolean;
  ricochet: boolean;
  vampirism: boolean;
  magnetRange: number;
  bossSlayer: boolean;
}
```

---

## 11. Timer de Run

- **Duração base**: 10 minutos (600.000 ms) — configurável via `RUN_BASE_TIME_MS` em `game-config.ts`
- **Exibição**: HUD no topo (MM:SS), cor amarela < 2 min, vermelha < 30s
- **Cartas de tempo**: `TIME_BONUS` adiciona 60s (stack 2 = 2 min)
- **Fim por tempo**: `gamePhase = 'DEFEAT'` → `endRun('TIME_UP')`
- **Pause**: Timer pausa em `DRAFT`, `PAUSED`, menus

---

## 12. Persistência Híbrida (Seed + Histórico)

### Geração de Seed
```typescript
generateSeed(): string {
  const entropy = crypto.getRandomValues(new Uint32Array(4));
  return Array.from(entropy, n => n.toString(36).padStart(8, '0')).join('');
}
```

### Determinismo
- Seed → `Math.seedrandom(seed)` (lib `seedrandom`) para:
  - Layout do nível (`LevelService` usa RNG seeded)
  - Spawn de inimigos (archetype + posição)
  - Drop de power-ups
  - **Cartas oferecidas** (pool embaralhado pela seed)

### Continue Run
- `GET /api/runs/:id` → restaura `Run` + `RunUpgrade[]` + fase atual
- `GameLogicService` reaplica upgrades via `applyRunUpgrades()`
- `LevelService` regenera fase exata via seed + phase index

---

## 13. Balanceamento & Curva de Dificuldade

| Fase | Inimigos | Archetypes Disponíveis | Cartas Oferecidas | Nota |
|------|----------|------------------------|-------------------|------|
| 1-2  | 3        | GRUNT, SPEEDY          | 3 COMMON          | Tutorial suave |
| 3-4  | 4        | + TANK, BOMBER         | 3 COMMON/UNCOMMON | 1 bomba nao mata TANK |
| 5-6  | 5        | + GHOST, SNIPER        | +1 UNCOMMON       | Exige FREEZE_BOMB ou PIERCE |
| 7-8  | 6        | + SPLITTER, SHIELDER   | +1 RARE           | Sinergias quase obrigatórias |
| 9    | 7        | + TELEPORTER, MINI_BOSS| 3 RARE/SYNERGY    | Preparação pro boss |
| 10   | 1 BOSS   | SYNERGY_BOSS           | —                 | Vitória = fim da run |

> **Regra de nao-repetição**: `CardPoolService` mantém `Set<cardKey>` já oferecidos na run. Se pool esgotar → recicla COMMON com peso reduzido.

---

## 14. Testes (Vitest)

| Arquivo | Cobertura |
|---------|-----------|
| `card-pool.service.spec.ts` | 3 cartas únicas, sem repetição, pesos de raridade |
| `upgrade-applier.service.spec.ts` | Cada upgrade aplica efeito correto no GameLogic |
| `enemy-scaler.service.spec.ts` | HP/speed escalam corretamente por fase |
| `synergy-engine.service.spec.ts` | Todas sinergias ativam com pre-reqs certos |
| `run-state.service.spec.ts` | Timer, vidas, escudo, seed, persistência |
| `game-logic.service.spec.ts` | **Estender**: testes de integração com upgrades + sinergias |

---

## 15. Passos de Implementação (Ordem Sugerida)

| Etapa | Descrição | Arquivos Principais |
|-------|-----------|---------------------|
| 1 | **Prisma**: adicionar models + migrate + generate | `prisma/schema.prisma` |
| 2 | **Models TS**: `card.model.ts`, `run.model.ts`, `enemy-archetype.model.ts`, `synergy.model.ts` | `src/app/core/models/` |
| 3 | **Services Core**: `run-state.service.ts`, `card-pool.service.ts`, `upgrade-applier.service.ts` | `src/app/core/roguelite/` |
| 4 | **Enemy Scaling**: `enemy-scaler.service.ts` + integrar no `LevelService` | `level.service.ts`, `enemy-scaler.service.ts` |
| 5 | **Synergy Engine**: `synergy-engine.service.ts` + hooks no `GameLogicService` | `synergy-engine.service.ts`, `game-logic.service.ts` |
| 6 | **Backend API**: rotas `/api/runs*` + auth | `src/server.ts`, `src/routes/` |
| 7 | **UI Draft**: `CardDraftComponent` + tela final de run | `src/app/game/` |
| 8 | **HUD Timer + Vidas + Escudo** | `game.component.html/ts`, `three-engine.service.ts` |
| 9 | **Integração completa**: fluxo run → draft → fase → boss → fim | `game.component.ts` |
| 10 | **Testes** + **Lint/Typecheck** | `npm test`, `npm run lint` |

---

## 16. Riscos & Mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Complexidade de sinergias gera bugs | Alta | Alto | Testes unitários por sinergia; feature flags para desativar |
| Timer + vidas = frustração se mal calibrado | Média | Alto | Playtest interno; ajustar `RUN_BASE_TIME_MS` e `BASE_LIVES` via config |
| Seed determinismo difere client/server | Baixa | Médio | Usar mesma lib `seedrandom` nos dois lados; log de seed no backend |
| Pool de cartas esgota em runs longas | Baixa | Baixo | Reciclagem COMMON + peso decrescente; max 10 fases por run |
| Performance com muitos inimigos escalados | Média | Médio | Pooling de entidades; LOD no Three.js; limitar max inimigos a 10 |

---

## 17. Próximos Passos Imediatos

1. **Aprovar este plano** (ou ajustar)
2. Criar branch `feat/roguelite`
3. Executar Etapa 1 (Prisma) + Etapa 2 (Models)
4. Revisar juntos o `CardPoolService` antes de prosseguir

---

## 18. Referências Técnicas

- **Game Engine Skill**: `game-engine` (loop, estado, colisão)
- **Three.js AAA**: `threejs-aaa-graphics-builder` (para boss visual)
- **Game UI/UX**: `game-ui-ux` (HUD, draft screen, safe areas)
- **Gameplay Systems**: `threejs-gameplay-systems` (entity system, input, difficulty)
- **Prisma Client**: `prisma-client-api` (queries tipadas para Run/Choice/Upgrade)
- **Debug/Profile**: `threejs-debug-profiler` (validar 60fps com 10 inimigos + efeitos)