import { Injectable, inject } from '@angular/core';
import { signal, computed } from '@angular/core';
import { Card, CardDTO, CardRarity, CardCategory } from '../models/card.model';
import { RunPersistenceService } from './run-persistence.service';

interface WeightedCard extends Card {
  _weight: number;
}

@Injectable({ providedIn: 'root' })
export class CardPoolService {
  private readonly persistence = inject(RunPersistenceService);

  readonly pool = signal<Card[]>([]);
  readonly offeredInRun = signal<Set<string>>(new Set());
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly commonCards = computed(() => this.pool().filter(c => c.rarity === CardRarity.COMMON));
  readonly uncommonCards = computed(() => this.pool().filter(c => c.rarity === CardRarity.UNCOMMON));
  readonly rareCards = computed(() => this.pool().filter(c => c.rarity === CardRarity.RARE));
  readonly synergyCards = computed(() => this.pool().filter(c => c.rarity === CardRarity.SYNERGY));

  async loadPool(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const dtos = await this.persistence.getCardPool();
      const cards: Card[] = dtos.map(dto => ({
        id: dto.key,
        key: dto.key,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        rarity: dto.rarity as CardRarity,
        category: dto.category as CardCategory,
        maxStacks: dto.maxStacks,
        prerequisites: [],
        weight: 10,
        isSynergy: dto.rarity === 'SYNERGY',
        synergyWith: [],
        minPhase: 1,
      }));
      this.pool.set(cards);
      this.offeredInRun.set(new Set());
    } catch (e) {
      this.error.set('Falha ao carregar pool de cartas');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  offerDraft(ownedKeys: string[], phase: number, count = 3): string[] {
    const available = this.getAvailableCards(ownedKeys, phase);
    if (available.length === 0) return [];

    const weighted = this.applyPhaseWeights(available, phase);
    const shuffled = this.shuffleWeighted(weighted);
    const offered = shuffled.slice(0, count).map(c => c.key);

    this.offeredInRun.update(set => {
      const next = new Set(set);
      offered.forEach(k => next.add(k));
      return next;
    });

    return offered;
  }

  private getAvailableCards(ownedKeys: string[], phase: number): Card[] {
    const owned = new Set(ownedKeys);
    const offered = this.offeredInRun();

    return this.pool().filter(card => {
      if (offered.has(card.key)) return false;
      if (owned.has(card.key) && card.maxStacks <= 1) return false;
      if (owned.has(card.key)) {
        const stacks = this.countStacks(card.key, ownedKeys);
        if (stacks >= card.maxStacks) return false;
      }
      if (card.prerequisites.length > 0) {
        const hasPrereqs = card.prerequisites.every(p => owned.has(p));
        if (!hasPrereqs) return false;
      }
      if (card.minPhase && phase < card.minPhase) return false;
      return true;
    });
  }

  private countStacks(cardKey: string, ownedKeys: string[]): number {
    return ownedKeys.filter(k => k === cardKey).length;
  }

  private applyPhaseWeights(cards: Card[], phase: number): WeightedCard[] {
    return cards.map(card => {
      let weight = card.weight;
      if (card.rarity === CardRarity.COMMON) weight *= 1 + phase * 0.1;
      if (card.rarity === CardRarity.RARE || card.rarity === CardRarity.SYNERGY) {
        weight *= Math.max(0.3, 1 - phase * 0.05);
      }
      if (card.isSynergy && phase >= 5) weight *= 1.5;
      return { ...card, _weight: weight };
    });
  }

  private shuffleWeighted<T extends WeightedCard>(array: T[]): T[] {
    const rng = this.createSeededRNG();
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const totalWeight = result.slice(0, i + 1).reduce((sum, c) => sum + c._weight, 0);
      let r = rng() * totalWeight;
      let j = 0;
      for (; j <= i; j++) {
        r -= result[j]._weight;
        if (r <= 0) break;
      }
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private createSeededRNG(): () => number {
    return Math.random;
  }

  resetOffered(): void {
    this.offeredInRun.set(new Set());
  }

  getCardByKey(key: string): Card | undefined {
    return this.pool().find(c => c.key === key);
  }

  getCardsByCategory(category: CardCategory): Card[] {
    return this.pool().filter(c => c.category === category);
  }
}