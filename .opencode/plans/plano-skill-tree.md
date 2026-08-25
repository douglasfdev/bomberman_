# Plano: Skill Tree Roguelite (Estilo Path of Exile) + Correção Timer

## Visão Geral
Implementar Skill Tree persistente entre runs (meta-progression) estilo Path of Exile:
- 1 SP/fase completada
- Persistência entre runs (conta do usuário)
- Grafo visual estilo PoE (nós + conexões)
- 1 SP = 1 ponto de habilidade
- Integração com sistema roguelite existente (RunUpgrade → RunSkill)

---

## 1. Correção Imediata: Timer 30s

### Backend
- `src/routes/rogueliteRoutes.ts:16` → `timeLeftMs: 30000` (era 600000)

### Frontend - Verificar
- `run-state.service.ts` - `createLocalRun()` já está 30000 ✓
- `formattedTime` mostra segundos quando < 60s ✓
- Game loop chama `updateRunTimer(deltaMs)` ✓

---

## 2. Prisma Schema - Novos Models

```prisma
// Adicionar ao schema.prisma

model SkillNode {
  id            String   @id @default(cuid())
  key           String   @unique
  name          String
  description   String
  icon          String
  baseCost      Int      @default(1)      // SP base para nível 1
  costScaling   Float    @default(1.5)    // multiplicador por nível
  maxLevel      Int      @default(3)
  prerequisites String[] @default("[]")   // keys dos nós necessários
  category      String   // "BOMB", "RANGE", "SPEED", "SYNERGY", "DEFENSE"
  positionX     Float    // posição no grafo (normalizada 0-1)
  positionY     Float
  effects       Json     // { bombCount: 1, range: 1, speed: -30, chainExplosion: true, etc }
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  userSkills    UserSkill[]
}

model UserSkill {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  skillKey  String
  skill     SkillNode @relation(fields: [skillKey], references: [key])
  level     Int      @default(0)
  @@unique([userId, skillKey])
  @@index([userId])
}

model RunSkill {
  id        String   @id @default(cuid())
  runId     String
  run       Run      @relation(fields: [runId], references: [id], onDelete: Cascade)
  skillKey  String
  level     Int      @default(0)  // nível temporário da run (pode ser > nível permanente se run tiver bonus)
  @@unique([runId, skillKey])
  @@index([runId])
}

// Atualizar model Run
model Run {
  // ... campos existentes
  skills      RunSkill[]
  skillPoints Int      @default(0)  // SP ganhos nesta run
}

// Atualizar model User
model User {
  // ... campos existentes
  skills      UserSkill[]
  skillPoints Int      @default(0)  // SP totais não gastos (meta-currency)
}
```

---

## 3. Skill Tree Data (12 Nós Iniciais)

| Key | Nome | Cat | MaxLvl | Custo Base | Scaling | Pré-req | Posição (x,y) | Efeitos por Nível |
|-----|------|-----|--------|------------|---------|---------|---------------|-------------------|
| `BOMB_CAPACITY` | Capacidade de Bombas | BOMB | 3 | 1 | 1.5 | — | (0.1, 0.5) | +1 bomba/nível |
| `BOMB_RANGE` | Alcance da Explosão | RANGE | 3 | 1 | 1.5 | — | (0.2, 0.3) | +1 alcance/nível |
| `MOVE_SPEED` | Velocidade | SPEED | 3 | 1 | 1.5 | — | (0.2, 0.7) | -30ms movimento/nível |
| `PIERCE_BOMB` | Bomba Perfurante | BOMB | 1 | 2 | 1.0 | `BOMB_RANGE`(2) | (0.3, 0.4) | Explosão atravessa caixas |
| `CHAIN_EXPLOSION` | **Explosão em Cadeia** | SYNERGY | 1 | 3 | 1.0 | `PIERCE_BOMB`, `BOMB_CAPACITY`(2) | (0.4, 0.5) | Explosão toca outra bomba → ambas explodem |
| `REMOTE_DETONATE` | Detonação Remota | BOMB | 1 | 2 | 1.0 | `BOMB_CAPACITY`(2) | (0.3, 0.6) | Espaço = detona bomba mais velha |
| `MEGA_BOMB` | Mega Bomba | SYNERGY | 1 | 3 | 1.0 | `BOMB_RANGE`(3), `CHAIN_EXPLOSION` | (0.5, 0.4) | 1x/fase: bomba 2x alcance + perfura parede |
| `FREEZE_BOMB` | Bomba Congelante | SYNERGY | 1 | 2 | 1.0 | `BOMB_RANGE`(1) | (0.4, 0.3) | Inimigo congelado 2s |
| `SHATTER` | Estilhaçar | SYNERGY | 1 | 2 | 1.0 | `FREEZE_BOMB` | (0.5, 0.3) | Inimigo congelado = 1 hit kill |
| `SPEED_BOOST` | Velocidade Extra | SPEED | 2 | 2 | 1.5 | `MOVE_SPEED`(3) | (0.3, 0.8) | -30ms extra/nível |
| `SHIELD` | Escudo | DEFENSE | 1 | 1 | 1.0 | — | (0.1, 0.3) | 1 escudo/run |
| `LIFE_STEAL` | Roubo de Vida | DEFENSE | 1 | 2 | 1.0 | — | (0.1, 0.7) | 10% chance +1 vida ao matar |

---

## 4. Backend - Novos Endpoints

```
GET    /api/roguelite/skills/tree      # Árvore completa (SkillNode[])
GET    /api/roguelite/skills/user      # UserSkill[] do usuário logado
POST   /api/roguelite/skills/upgrade   # { skillKey } → upar skill (gasta SP do usuário)
GET    /api/roguelite/runs/:id/skills  # RunSkill[] da run atual
POST   /api/roguelite/runs/:id/skill   # { skillKey } → upar skill TEMPORÁRIA na run (usa SP da run)
```

### Lógica de Upgrade
- **Permanente (UserSkill)**: Gasta `user.skillPoints` (meta-currency)
- **Temporária (RunSkill)**: Gasta `run.skillPoints` (ganhos na run: 1 SP/fase)
- Custo = `baseCost * costScaling^(level)` arredondado para cima
- Pré-reqs: todos os skills pré-requisitos devem ter `level > 0` (permanente OU temporário da run)

---

## 5. Frontend - Estrutura

### Services
```
src/app/core/roguelite/
├── skill-tree.service.ts        # Estado da árvore, grafo, SP
├── skill-tree-persistence.ts    # HTTP para /api/roguelite/skills/*
└── run-skill.service.ts         # Skills temporárias da run
```

### Components
```
src/app/game/
├── skill-tree/
│   ├── skill-tree.component.ts      # Tela principal (canvas/SVG)
│   ├── skill-tree.component.html
│   ├── skill-tree.component.scss
│   ├── skill-node/
│   │   ├── skill-node.component.ts
│   │   ├── skill-node.component.html
│   │   └── skill-node.component.scss
│   └── skill-connection/
│       └── skill-connection.component.ts  # Linhas SVG entre nós
└── skill-point-indicator/
    └── skill-point-indicator.component.ts  # HUD: SP disponíveis
```

### Skill Tree Component (Canvas/SVG)
- **Viewport**: Pan (arrastar) + Zoom (scroll)
- **Nós**: Círculos coloridos por categoria, borda = nível, lock = cinza
- **Conexões**: Curvas Bézier entre nós (pré-req → nó)
- **Hover**: Tooltip com nome, nível, custo próximo, efeitos, pré-reqs
- **Click**: Se desbloqueado e tem SP → upa; se locked → mostra pré-reqs faltando
- **Teclas**: `T` abre/fecha, `ESC` fecha, scroll = zoom, drag = pan

---

## 6. Integração GameLogic

### GameLogicService - Novos Métodos
```typescript
applyRunSkills(runSkills: RunSkill[]): void {
  for (const rs of runSkills) {
    const node = this.skillTree.getNode(rs.skillKey);
    this.applySkillEffect(node, rs.level);
  }
}

private applySkillEffect(node: SkillNode, level: number): void {
  const effects = node.effects;
  if (effects.bombCount) this.maxBombs.update(b => b + effects.bombCount * level);
  if (effects.range) this.range.update(r => r + effects.range * level);
  if (effects.speed) this.applySpeedStacks(effects.speed * level);
  if (effects.chainExplosion) this.player.chainExplosion = true;
  if (effects.pierce) this.pierce.set(true);
  if (effects.remoteDetonate) this.player.remoteDetonate = true;
  if (effects.megaBomb) this.player.megaBombCharges = level;
  if (effects.freezeBomb) this.player.freezeBomb = true;
  if (effects.shatter) this.player.shatter = true;
  if (effects.shield) this.runState.addShield();
  if (effects.lifeSteal) this.player.lifeSteal = true;
}
```

### Chain Explosion Logic (em `explode()`)
```typescript
if (this.player.chainExplosion) {
  // Após explodir bomba, verificar bombas adjacentes no raio da explosão
  const nearbyBombs = this.bombs.filter(b => 
    b.id !== bomb.id && 
    tiles.some(t => samePosition(t, b.position))
  );
  for (const nb of nearbyBombs) {
    this.explode(nb);  // Detona instantaneamente
    this.bombs = this.bombs.filter(b => b.id !== nb.id);
  }
}
```

### Remote Detonate (em `handleInput()`)
```typescript
if (this.input.getAction() && this.player.remoteDetonate) {
  const oldestBomb = this.bombs
    .filter(b => b.planterId === 'player')
    .sort((a, b) => a.plantedAtMs - b.plantedAtMs)[0];
  if (oldestBomb) this.explode(oldestBomb);
}
```

---

## 7. Seed Data (SkillNode)

```typescript
// prisma/seed.ts - adicionar ao seed existente
const SKILL_NODES = [
  { key: 'BOMB_CAPACITY', name: 'Capacidade de Bombas', category: 'BOMB', baseCost: 1, costScaling: 1.5, maxLevel: 3, prerequisites: [], positionX: 0.1, positionY: 0.5, effects: { bombCount: 1 } },
  { key: 'BOMB_RANGE', name: 'Alcance da Explosão', category: 'RANGE', baseCost: 1, costScaling: 1.5, maxLevel: 3, prerequisites: [], positionX: 0.2, positionY: 0.3, effects: { range: 1 } },
  { key: 'MOVE_SPEED', name: 'Velocidade', category: 'SPEED', baseCost: 1, costScaling: 1.5, maxLevel: 3, prerequisites: [], positionX: 0.2, positionY: 0.7, effects: { speed: -30 } },
  { key: 'PIERCE_BOMB', name: 'Bomba Perfurante', category: 'BOMB', baseCost: 2, costScaling: 1.0, maxLevel: 1, prerequisites: ['BOMB_RANGE'], positionX: 0.3, positionY: 0.4, effects: { pierce: true } },
  { key: 'CHAIN_EXPLOSION', name: 'Explosão em Cadeia', category: 'SYNERGY', baseCost: 3, costScaling: 1.0, maxLevel: 1, prerequisites: ['PIERCE_BOMB', 'BOMB_CAPACITY'], positionX: 0.4, positionY: 0.5, effects: { chainExplosion: true } },
  // ... demais
];
```

---

## 8. UI/UX - Skill Tree Visual (PoE Style)

### Visual Spec
- **Canvas**: 1200x800 virtual, responsivo
- **Nó**: Círculo 60px, cor por categoria:
  - BOMB: `#ff6b35` (laranja)
  - RANGE: `#4ecdc4` (teal)
  - SPEED: `#ffe66d` (amarelo)
  - SYNERGY: `#ff6b9d` (rosa)
  - DEFENSE: `#95e1d3` (verde-água)
- **Borda**: Branca = nível 0, Amarela = nível 1-2, Laranja = nível 3+
- **Lock**: Overlay cinza 70% + ícone 🔒
- **Conexões**: `stroke-width: 3`, cor da categoria do destino, curva Bézier quadrática
- **Hover tooltip**: Fixed position, fundo escuro, texto branco

### Controles
| Ação | Tecla/Mouse |
|------|-------------|
| Abrir/Fechar | `T` |
| Pan | Click segurar + arrastar (bg) |
| Zoom | Scroll |
| Reset view | `R` |
| Upar skill | Click no nó (se desbloqueado) |
| Fechar | `ESC` ou click fora |

---

## 9. Passos de Implementação

| Etapa | Descrição | Arquivos |
|-------|-----------|----------|
| 1 | **Corrigir timer backend** | `src/routes/rogueliteRoutes.ts:16` |
| 2 | **Prisma migration** | `prisma/schema.prisma` → `migrate dev` |
| 3 | **Seed SkillNode** | `prisma/seed.ts` |
| 4 | **Backend API skills** | `src/routes/skillRoutes.ts` |
| 5 | **Mount routes** | `src/server.ts` |
| 6 | **Frontend services** | `skill-tree.service.ts`, `skill-tree-persistence.ts` |
| 7 | **RunSkill integration** | `roguelite-bootstrap.service.ts` |
| 8 | **GameLogic integration** | `game-logic.service.ts` (chain explosion, remote detonate) |
| 9 | **SkillTreeComponent** | Canvas + nodes + connections |
| 10 | **SkillNodeComponent** | Nó individual + tooltip |
| 11 | **SkillConnectionComponent** | Linhas SVG Bézier |
| 12 | **HUD Skill Points** | Indicador no game |
| 13 | **Keybind T** | Abrir/fechar skill tree |
| 14 | **Testes + Build** | `npm test`, `npm run build` |

---

## 10. Testes de Validação

1. **Timer**: Run inicia com 30s, conta regressivo, encerra em 0
2. **SP gain**: Completa fase → +1 SP permanente (user) + 1 SP run
3. **Skill tree**: Abre com `T`, mostra grafo 12 nós, pan/zoom funciona
4. **Upgrade permanente**: Click nó desbloqueado gasta user SP → nível sobe
5. **Upgrade temporário**: Na run, click nó gasta run SP → efeito imediato
6. **Pré-reqs**: Nó locked até pré-reqs terem level > 0
7. **Chain explosion**: Bomba explode → bomba adjacente explode instantaneamente
8. **Remote detonate**: `Space` detona bomba mais velha do player
9. **Persistência**: Fecha jogo → abre → skills permanentes mantidas
10. **RunSkill merge**: Run carrega user skills como base, pode upar além

---

## 11. Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Performance canvas (12 nós) | Baixa | Baixo | Canvas simples, 12 nós é trivial |
| Pré-reqs complexos (ciclos) | Baixa | Médio | Validação no seed + backend |
| Merge user/run skills | Média | Alto | Testes unitários extensivos |
| Chain explosion performance | Baixa | Baixo | Máximo 10 bombas simultâneas |
| Mobile touch pan/zoom | Média | Médio | Touch events + fallback buttons |

---

## 12. Próximos Passos Imediatos

1. Aplicar correção timer backend (1 linha)
2. Criar branch `feat/skill-tree`
3. Prisma schema + migration + seed
4. Backend routes
5. Frontend services + persistence
6. GameLogic integration
7. Skill Tree UI (canvas + nodes + connections)
7. Testes manuais completos