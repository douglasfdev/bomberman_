import { Component, input, output, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardPoolService } from '../../core/roguelite/card-pool.service';
import { RunStateService } from '../../core/roguelite/run-state.service';
import { Card } from '../../core/models/card.model';

@Component({
  selector: 'app-death-skill-draft',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="death-draft-overlay" (click)="close.emit()">
        <div class="death-draft-container" (click)="$event.stopPropagation()">
          <header class="death-draft-header">
            <h2>Fim da Run</h2>
            <p class="phase-info">
              Pontuação: {{ score() }} | SP ganhos para a Árvore: <span class="sp-value">{{ earnedSP() }}</span> (1 SP / 1000 pts)
            </p>
            <p class="sp-info">Escolha sua carta de upgrade para a próxima run ou recompensa:</p>
          </header>

          <div class="cards-grid" role="list" aria-label="Cartas disponíveis">
            @for (card of offeredCards(); track card.key; let i = $index) {
              <article
                class="card"
                [class.selected]="selectedIndex() === i"
                [class.card-category]="'cat-' + card.category.toLowerCase()"
                role="listitem"
                tabindex="0"
                (click)="chooseCard(i)"
                (keydown.enter)="chooseCard(i)"
                (keydown.space)="chooseCard(i)"
              >
                <div class="card-icon">{{ card.icon }}</div>
                <h3 class="card-name">{{ card.name }}</h3>
                <p class="card-description">{{ card.description }}</p>
                <div class="card-meta">
                  <span class="rarity-badge">{{ card.rarity }}</span>
                  <span class="category-badge">{{ card.category }}</span>
                </div>
                @if (card.prerequisites.length > 0) {
                  <div class="prerequisites">
                    Requer: {{ card.prerequisites.join(', ') }}
                  </div>
                }
                @if (card.maxStacks > 1) {
                  <div class="stacks">Máx: {{ card.maxStacks }}</div>
                }
                @if (card.synergyWith.length > 0) {
                  <div class="synergy-hint">Sinergia: {{ card.synergyWith.join(', ') }}</div>
                }
              </article>
            }
          </div>

          <footer class="death-draft-footer">
            <div class="selection-info">
              @if (selectedIndex() === null) {
                <span class="warning">Selecione uma carta de upgrade</span>
              } @else {
                <span class="ready">Pronto!</span>
              }
            </div>
            <button
              class="confirm-btn"
              [disabled]="selectedIndex() === null"
              (click)="confirmSelection()"
            >
              Confirmar Escolha
            </button>
            <button class="cancel-btn" (click)="close.emit()">
              Pular / Fechar
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .death-draft-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.2s ease;
    }

    .death-draft-container {
      background: #0d1117;
      border: 2px solid #30363d;
      border-radius: 16px;
      padding: 24px;
      max-width: 900px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
    }

    .death-draft-header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #30363d;
    }

    .death-draft-header h2 {
      margin: 0 0 8px;
      color: #ff6b6b;
      font-size: 1.75rem;
    }

    .phase-info {
      color: #ffd700;
      font-size: 1.1rem;
      margin: 8px 0;
    }

    .sp-value {
      color: #3fb950;
      font-weight: bold;
    }

    .sp-info {
      color: #8b949e;
      font-size: 0.9rem;
      margin: 4px 0 0;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .card {
      background: #161b22;
      border: 2px solid #30363d;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      min-height: 240px;
      position: relative;
    }

    .card:hover {
      transform: translateY(-4px);
      border-color: #ffd700;
      box-shadow: 0 8px 24px rgba(255, 215, 0, 0.2);
    }

    .card.selected {
      border-color: #ffd700;
      box-shadow: 0 0 0 2px #ffd700, 0 8px 24px rgba(255, 215, 0, 0.3);
    }

    .card.cat-bomb { border-left: 4px solid #ff6b35; }
    .card.cat-range { border-left: 4px solid #4ecdc4; }
    .card.cat-speed { border-left: 4px solid #ffe66d; }
    .card.cat-synergy { border-left: 4px solid #ff6b9d; }
    .card.cat-defense { border-left: 4px solid #95e1d3; }

    .card-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 12px;
    }

    .card-name {
      margin: 0 0 8px;
      color: #fff;
      font-size: 1.25rem;
      text-align: center;
    }

    .card-description {
      color: #ccc;
      font-size: 0.9rem;
      line-height: 1.4;
      flex-grow: 1;
      text-align: center;
    }

    .card-meta {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 12px;
    }

    .rarity-badge,
    .category-badge {
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .rarity-badge { background: #333; color: #aaa; }
    .category-badge { background: #2a2a4a; color: #8ab; }

    .prerequisites {
      font-size: 0.75rem;
      color: #f44;
      margin-top: 8px;
      text-align: center;
    }

    .stacks {
      font-size: 0.75rem;
      color: #ffd700;
      margin-top: 4px;
      text-align: center;
    }

    .synergy-hint {
      font-size: 0.7rem;
      color: #ff6b9d;
      margin-top: 4px;
      text-align: center;
    }

    .death-draft-footer {
      padding-top: 16px;
      border-top: 1px solid #30363d;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }

    .selection-info {
      width: 100%;
      text-align: center;
    }

    .warning { color: #ffaa00; font-weight: 600; }
    .ready { color: #3fb950; font-weight: 600; }

    .confirm-btn {
      background: linear-gradient(135deg, #238636, #2ea043);
      color: #fff;
      border: none;
      padding: 12px 32px;
      font-size: 1.05rem;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      max-width: 300px;
    }

    .confirm-btn:hover:not(:disabled) {
      transform: scale(1.02);
      box-shadow: 0 4px 16px rgba(46, 160, 67, 0.4);
    }

    .confirm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .cancel-btn {
      background: transparent;
      color: #8b949e;
      border: 1px solid #30363d;
      padding: 10px 24px;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      max-width: 300px;
    }

    .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #58a6ff;
      color: #58a6ff;
    }
  `],
})
export class DeathSkillDraftComponent implements OnInit {
  readonly score = input.required<number>();
  readonly close = output<void>();
  readonly confirmUpgrade = output<string>();
  readonly isOpen = signal(true);

  private readonly cardPool = inject(CardPoolService);
  private readonly runState = inject(RunStateService);

  readonly earnedSP = computed(() => Math.floor(this.score() / 1000));

  private offeredCardsCache = signal<Card[]>([]);

  readonly availableCards = computed(() => {
    return this.offeredCardsCache();
  });

  readonly offeredCards = computed(() => this.availableCards());

  readonly selectedIndex = signal<number | null>(null);

async ngOnInit(): Promise<void> {
    console.log('[DeathSkillDraft] ngOnInit, score:', this.score(), 'earnedSP:', this.earnedSP());
    console.log('[DeathSkillDraft] availableCards before load:', this.availableCards());
    
    // Ensure card pool is loaded
    if (this.cardPool.pool().length === 0) {
      console.log('[DeathSkillDraft] Loading card pool...');
      try {
        await this.cardPool.loadPool();
        console.log('[DeathSkillDraft] Card pool loaded:', this.cardPool.pool().length, 'cards');
      } catch (e) {
        console.warn('[DeathSkillDraft] Failed to load pool from backend, pool should have local fallback');
      }
    }
    
    // Offer cards for draft
    const run = this.runState.currentRun();
    const ownedKeys = run?.upgrades?.map(u => u.cardKey) ?? [];
    const offeredKeys = this.cardPool.offerDraft(ownedKeys, 1, 3);
    const cards = offeredKeys.map(k => this.cardPool.getCardByKey(k)).filter((c): c is Card => !!c);
    this.offeredCardsCache.set(cards);
    console.log('[DeathSkillDraft] offeredCardsCache:', this.offeredCardsCache().length, 'cards');
    console.log('[DeathSkillDraft] availableCards after load:', this.availableCards());
  }

  chooseCard(index: number): void {
    this.selectedIndex.set(index);
  }

  confirmSelection(): void {
    const idx = this.selectedIndex();
    if (idx !== null) {
      const card = this.availableCards()[idx];
      if (card) {
        this.confirmUpgrade.emit(card.key);
        this.close.emit();
      }
    }
  }
}