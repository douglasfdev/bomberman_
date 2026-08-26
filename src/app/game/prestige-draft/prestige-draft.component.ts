import { Component, input, output, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardPoolService } from '../../core/roguelite/card-pool.service';
import { SkillTreeService } from '../../core/roguelite/skill-tree.service';
import { RunStateService } from '../../core/roguelite/run-state.service';
import { Card } from '../../core/models/card.model';

@Component({
  selector: 'app-prestige-draft',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="prestige-overlay" (click)="close.emit()">
        <div class="prestige-container" (click)="$event.stopPropagation()">
          <header class="prestige-header">
            <h2>Prestígio / Reset da Run</h2>
            <p class="phase-info">Fase atual: {{ phase() }} | Escolha {{ maxCards() }} cartas para a próxima run</p>
          </header>

          <div class="cards-grid" role="list" aria-label="Cartas disponíveis para prestígio">
            @for (card of availableCards(); track card.key; let i = $index) {
              <article
                class="card"
                [class.selected]="selectedIndices().includes(i)"
                [class.disabled]="!isSelectable(i)"
                [class.card-category]="'cat-' + card.category.toLowerCase()"
                role="listitem"
                tabindex="0"
                (click)="toggleCard(i)"
                (keydown.enter)="toggleCard(i)"
                (keydown.space)="toggleCard(i)"
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
                @if (selectedIndices().includes(i)) {
                  <div class="selection-indicator">
                    <span class="selection-number">{{ selectedIndices().indexOf(i) + 1 }}</span>
                    <span> / {{ maxCards() }}</span>
                  </div>
                }
              </article>
            }
          </div>

          <footer class="prestige-footer">
            <div class="selection-info">
              @if (selectedCount() < maxCards()) {
                <span class="warning">Selecione {{ maxCards() - selectedCount() }} carta(s) a mais</span>
              } @else {
                <span class="ready">Pronto para prestigiar!</span>
              }
            </div>
            <button
              class="confirm-btn"
              [disabled]="selectedCount() < maxCards()"
              (click)="confirm()"
            >
              Confirmar Prestígio
            </button>
            <button class="cancel-btn" (click)="close.emit()">
              Cancelar
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .prestige-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.2s ease;
    }

    .prestige-container {
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

    .prestige-header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #30363d;
    }

    .prestige-header h2 {
      margin: 0 0 8px;
      color: #ffd700;
      font-size: 1.75rem;
    }

    .phase-info {
      color: #8b949e;
      font-size: 1rem;
      margin: 0;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

    .card:hover:not(.disabled) {
      transform: translateY(-4px);
      border-color: #ffd700;
      box-shadow: 0 8px 24px rgba(255, 215, 0, 0.2);
    }

    .card.disabled {
      opacity: 0.4;
      cursor: not-allowed;
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
      color: #ff6b9d;
      margin-top: 4px;
      text-align: center;
    }

    .selection-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #ffd700;
      color: #0d1117;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: bold;
    }

    .selection-number {
      font-weight: bold;
    }

    .prestige-footer {
      padding-top: 16px;
      border-top: 1px solid #333;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }

    .selection-info {
      width: 100%;
      text-align: center;
    }

    .warning {
      color: #ffaa00;
      font-weight: 600;
    }

    .ready {
      color: #3fb950;
      font-weight: 600;
    }

    .confirm-btn {
      background: linear-gradient(135deg, #238636, #2ea043);
      color: #fff;
      border: none;
      padding: 14px 48px;
      font-size: 1.1rem;
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
      padding: 12px 24px;
      font-size: 1rem;
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

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 600px) {
      .prestige-container {
        padding: 16px;
        width: 100vw;
        height: 100vh;
        max-width: none;
        max-height: none;
        border-radius: 0;
      }
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class PrestigeDraftComponent implements OnInit {
  readonly phase = input.required<number>();
  readonly maxCards = input.required<number>();
  readonly close = output<void>();
  readonly confirmPrestige = output<string[]>();
  readonly isOpen = signal(true);

  private readonly cardPool = inject(CardPoolService);
  private readonly skillTree = inject(SkillTreeService);
  private readonly runState = inject(RunStateService);

  readonly availableCards = computed(() => {
    const run = this.runState.currentRun();
    const ownedKeys = run?.upgrades?.map(u => u.cardKey) ?? [];
    const offeredKeys = this.cardPool.offerDraft(ownedKeys, this.phase(), this.maxCards() * 2);
    return offeredKeys.map(k => this.cardPool.getCardByKey(k)).filter((c): c is Card => !!c);
  });

  readonly offeredCards = computed(() => this.availableCards());

  readonly selectedIndices = signal<number[]>([]);

  ngOnInit(): void {
    // Initialize with available cards
  }

  readonly selectedCount = computed(() => this.selectedIndices().length);
  readonly selectedCardKeys = computed(() => 
    this.selectedIndices().map(i => this.availableCards()[i]?.key).filter(Boolean)
  );

  isSelectable(index: number): boolean {
    if (this.selectedIndices().includes(index)) return true;
    return this.selectedCount() < this.maxCards();
  }

  toggleCard(index: number): void {
    if (this.selectedIndices().includes(index)) {
      this.selectedIndices.update(arr => arr.filter(i => i !== index));
    } else if (this.selectedCount() < this.maxCards()) {
      this.selectedIndices.update(arr => [...arr, index]);
    }
  }

  navigate(direction: number): void {
    const cards = this.availableCards();
    if (cards.length === 0) return;
    let next = (this.selectedIndices()[0] ?? -1) + direction;
    if (next < 0) next = cards.length - 1;
    if (next >= cards.length) next = 0;
    this.selectedIndices.set([next]);
  }

  confirm(): void {
    const keys = this.selectedCardKeys();
    if (keys.length === this.maxCards()) {
      this.confirmPrestige.emit(keys);
      this.close.emit();
    }
  }
}