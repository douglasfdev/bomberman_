# Plano 2: Modernização Angular 22 (Para aplicar DEPOIS do roguelite)

## 1. O que está obsoleto no projeto atual (baseado em inspeção)

| Arquivo | Feature Antiga | Nova Feature Angular 22 |
|---------|----------------|-------------------------|
| `game.component.html` | `*ngIf`, `*ngFor` | `@if`, `@for`, `@switch` |
| `game.component.ts` | `ChangeDetectorRef`, `OnPush` manual | Signals + `OnPush` automático |
| `game-logic.service.ts` | `signal()` já usado ✓ | `linkedSignal`, `resource`, `effect` |
| `input-manager.service.ts` | RxJS subjects | Signals para estado de input |
| Templates diversos | `*ngIf="condition; else"` | `@if / @else` |
| Serviços com `HttpClient` | `subscribe()` manual | `httpResource()` |

---

## 2. Migração de Templates (Control Flow)

### Antes (`*ngIf` / `*ngFor`)
```html
<div *ngIf="gamePhase() === 'PLAYING'; else waiting">
  <div *ngFor="let enemy of enemies(); track enemy.id">
    {{ enemy.name }}
  </div>
</div>
<ng-template #waiting>Aguardando...</ng-template>
```

### Depois (`@if` / `@for`)
```html
@if (gamePhase() === 'PLAYING') {
  @for (enemy of enemies(); track enemy.id) {
    {{ enemy.name }}
  }
} @else {
  Aguardando...
}
```

### `@switch` (para GamePhase enum)
```html
@switch (gamePhase()) {
  @case ('READY') { <app-ready-screen /> }
  @case ('PLAYING') { <app-hud /> }
  @case ('DRAFT') { <app-card-draft /> }
  @case ('VICTORY') { <app-victory /> }
  @case ('DEFEAT') { <app-defeat /> }
  @case ('RUN_END') { <app-run-end /> }
  @default { <app-loading /> }
}
```

---

## 3. Modernização de Services

### 3.1 `input-manager.service.ts` — Signals reativos
```typescript
// Antes: BehaviorSubject + subscribe
direction$ = new BehaviorSubject<Direction | null>(null);

// Depois: WritableSignal + computed
readonly direction = signal<Direction | null>(null);
readonly isMoving = computed(() => this.direction() !== null);
```

### 3.2 `game-logic.service.ts` — `linkedSignal` + `resource`
```typescript
// linkedSignal para estado derivado com fallback
readonly currentDraft = linkedSignal({
  source: this.runState.draft,
  computation: (draft, prev) => draft ?? prev?.value ?? { offered: [], phase: 0 }
});

// resource para carregar dados do backend (ex: pool de cartas)
readonly cardPool = resource({
  params: () => ({ phase: this.runState.phase() }),
  loader: ({ params }) => this.runPersistence.getCardPool(params.phase),
});

// effect para side effects (ex: salvar no localStorage)
effect(() => {
  const run = this.runState.currentRun();
  if (run) localStorage.setItem('lastRun', JSON.stringify(run));
});
```

### 3.3 `run-persistence.service.ts` — `httpResource`
```typescript
// Antes: HttpClient + subscribe manual
getCardPool(phase: number): Observable<Card[]> {
  return this.http.get<Card[]>(`/api/cards/pool?phase=${phase}`);
}

// Depois: httpResource (disponível via @angular/common/http)
readonly cardPoolResource = httpResource<Card[]>(() => 
  `/api/cards/pool?phase=${this.runState.phase()}`
);
```

---

## 4. Components: Inputs/Outputs Modernos

### Antes
```typescript
@Input() phase!: number;
@Output() phaseChange = new EventEmitter<number>();
```

### Depois (Angular 22+)
```typescript
// input() signal (readonly por padrão)
readonly phase = input.required<number>();

// output signal
readonly phaseChange = output<number>();

// linkedSignal para sync bidirecional se necessário
readonly localPhase = linkedSignal({
  source: this.phase,
  computation: (p) => p,
  set: (val) => this.phaseChange.emit(val),
});
```

---

## 5. Novos Recursos Angular 22 para Aplicar

| Feature | Uso no Projeto |
|---------|----------------|
| `@if` / `@for` / `@switch` | Todos templates (`game.component.html`, `card-draft.component.html`, etc.) |
| `linkedSignal` | Estado derivado com fallback (ex: draft atual, inimigo alvo) |
| `resource` / `httpResource` | Fetch de dados assíncronos (cartas, archetypes, runs) |
| `effect` | Side effects (localStorage, analytics, sound triggers) |
| `linkedSignal` com `set` customizado | Bidirecional input/output (ex: seleção de carta) |
| `signal()` equality fn | Comparação profunda para objetos complexos (ex: `PlayerState`) |
| `computed()` lazy | Derivações caras só rodam quando lidas (ex: sinergias ativas) |

---

## 6. Etapas da Modernização (Ordem Segura)

| Etapa | Descrição | Arquivos |
|-------|-----------|----------|
| 1 | **Templates**: `*ngIf` → `@if`, `*ngFor` → `@for`, `*ngSwitch` → `@switch` | `game.component.html`, futuros templates roguelite |
| 2 | **Services leves**: `input-manager.service.ts` para signals puros | `input-manager.service.ts` |
| 3 | **Services com async**: `run-persistence.service.ts` → `httpResource` | `run-persistence.service.ts` |
| 4 | **GameLogic**: `linkedSignal` para estado derivado (draft, target enemy) | `game-logic.service.ts` |
| 5 | **Components**: `input()` / `output()` signals | `game.component.ts`, futuros components roguelite |
| 6 | **Effects**: Mover localStorage/side-effects para `effect()` | `run-state.service.ts`, `game-logic.service.ts` |
| 7 | **Lint/Typecheck**: `npm run lint` + verificar template type-check | — |

---

## 7. Compatibilidade & Migração Gradual

- **Angular 22 suporta ambos**: `*ngIf` e `@if` coexistem. Pode migrar arquivo a arquivo.
- **`ng update @angular/core@22 @angular/cli@22`** roda schematics automáticos para:
  - Converter `*ngIf` → `@if` (opcional, via `ng generate @angular/core:control-flow`)
  - Atualizar `package.json`, `tsconfig.json`, `angular.json`
- **Strict templates** (`strictTemplates: true` no `tsconfig.json`) já ajuda a pegar erros.

---

## 8. Próximo Passo

1. **Aplicar Plano 1 (Roguelite)** — criar feature completa
2. **Depois** — rodar `ng update` para Angular 22 (se não estiver)
3. **Depois** — aplicar este Plano 2 arquivo por arquivo (baixo risco)