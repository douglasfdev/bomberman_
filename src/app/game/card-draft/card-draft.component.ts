import { Component, input, output, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardPoolService } from '../../core/roguelite/card-pool.service';
import { Card } from '../../core/models/card.model';

@Component({
  selector: 'app-card-draft',
  standalone: true,
  imports: [CommonModule],
  template: `
      <div class="draft-overlay" (click)="close.emit()">
        <div class="draft-container" (click)="$event.stopPropagation()">
          <header class="draft-header">
            <h2>Escolha seu Upgrade</h2>
            <p class="phase-info">Fase {{ phase() }}</p>
          </header>

          <div class="cards-grid" role="list" aria-label="Cartas disponíveis">
            @for (card of offeredCards(); track card.key; let i = $index) {
              <article
                class="card"
                [class.selected]="selectedIndex() === i"
                [class.rarity-{{ card.rarity.toLowerCase() }}]="true"
                role="listitem"
                tabindex="0"
                (click)="select(i)"
                (keydown.enter)="select(i)"
                (keydown.space)="select(i)"
                (keydown.arrowRight)="navigate(1)"
                (keydown.arrowLeft)="navigate(-1)"
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

          <footer class="draft-footer">
            <button
              class="confirm-btn"
              [disabled]="selectedIndex() === null"
              (click)="confirm()"
            >
              Confirmar
            </button>
          </footer>
        </div>
      </div>
  `,
  styles: [`
    .draft-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    .draft-container {
      background: #1a1a2e;
      border: 2px solid #4a4a6a;
      border-radius: 16px;
      padding: 24px;
      max-width: 900px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
    }

    .draft-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .draft-header h2 {
      margin: 0 0 8px;
      color: #ffd700;
      font-size: 1.75rem;
    }

    .phase-info {
      color: #888;
      font-size: 1rem;
      margin: 0;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .card {
      background: #252542;
      border: 2px solid #3a3a5a;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      min-height: 220px;
    }

    .card:hover,
    .card:focus {
      transform: translateY(-4px);
      border-color: #ffd700;
      box-shadow: 0 8px 24px rgba(255, 215, 0, 0.2);
      outline: none;
    }

    .card.selected {
      border-color: #ffd700;
      box-shadow: 0 0 0 2px #ffd700, 0 8px 24px rgba(255, 215, 0, 0.3);
    }

    .card.rarity-common { border-left: 4px solid #888; }
    .card.rarity-uncommon { border-left: 4px solid #4caf50; }
    .card.rarity-rare { border-left: 4px solid #2196f3; }
    .card.rarity-synergy { border-left: 4px solid #e91e63; }

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

    .rarity-badge {
      background: #333;
      color: #aaa;
    }

    .category-badge {
      background: #2a2a4a;
      color: #8ab;
    }

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
      color: #e91e63;
      margin-top: 4px;
      text-align: center;
    }

    .draft-footer {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid #333;
    }

    .confirm-btn {
      background: linear-gradient(135deg, #ffd700, #ffaa00);
      color: #1a1a2e;
      border: none;
      padding: 14px 48px;
      font-size: 1.1rem;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .confirm-btn:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
    }

    .confirm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 600px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
      .draft-container {
        padding: 16px;
      }
    }
  `],
})
export class CardDraftComponent {
  readonly phase = input.required<number>();
  readonly offered = input.required<string[]>();
  readonly close = output<void>();
  readonly confirmChoice = output<string>();

  private readonly cardPool = inject(CardPoolService);

  readonly offeredCards = computed(() => {
    const keys = this.offered();
    return keys.map(k => this.cardPool.getCardByKey(k)).filter((c): c is Card => !!c);
  });

  readonly selectedIndex = signal<number | null>(null);

  select(index: number): void {
    this.selectedIndex.set(index);
  }

  navigate(direction: number): void {
    const cards = this.offeredCards();
    if (cards.length === 0) return;
    let next = (this.selectedIndex() ?? -1) + direction;
    if (next < 0) next = cards.length - 1;
    if (next >= cards.length) next = 0;
    this.selectedIndex.set(next);
  }

  confirm(): void {
    const idx = this.selectedIndex();
    if (idx !== null) {
      const card = this.offeredCards()[idx];
      if (card) {
        this.confirmChoice.emit(card.key);
      }
    }
  }
}