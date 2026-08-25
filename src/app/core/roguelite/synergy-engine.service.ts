import { Injectable, signal, computed } from '@angular/core';
import { SynergyKey, SynergyDefinition, SYNERGY_DEFINITIONS, detectActiveSynergies } from '../models/synergy.model';

@Injectable({ providedIn: 'root' })
export class SynergyEngineService {
  readonly ownedCardKeys = signal<Set<string>>(new Set());
  readonly activeSynergies = signal<SynergyKey[]>([]);

  readonly hasFreezeChain = computed(() => this.activeSynergies().includes('FREEZE_CHAIN'));
  readonly hasShatter = computed(() => this.activeSynergies().includes('SHATTER'));
  readonly hasChainDetonation = computed(() => this.activeSynergies().includes('CHAIN_DETONATION'));
  readonly hasMegaRemote = computed(() => this.activeSynergies().includes('MEGA_REMOTE'));
  readonly hasGhostBomb = computed(() => this.activeSynergies().includes('GHOST_BOMB'));
  readonly hasTotalVampirism = computed(() => this.activeSynergies().includes('TOTAL_VAMPIRISM'));
  readonly hasLethalSpeed = computed(() => this.activeSynergies().includes('LETHAL_SPEED'));
  readonly hasMasterReflector = computed(() => this.activeSynergies().includes('MASTER_REFLECTOR'));

  setOwnedCards(cardKeys: string[]): void {
    this.ownedCardKeys.set(new Set(cardKeys));
    this.recompute();
  }

  addCard(cardKey: string): void {
    this.ownedCardKeys.update(set => new Set([...set, cardKey]));
    this.recompute();
  }

  removeCard(cardKey: string): void {
    this.ownedCardKeys.update(set => {
      const next = new Set(set);
      next.delete(cardKey);
      return next;
    });
    this.recompute();
  }

  private recompute(): void {
    const synergies = detectActiveSynergies(Array.from(this.ownedCardKeys()));
    this.activeSynergies.set(synergies);
  }

  has(synergyKey: SynergyKey): boolean {
    return this.activeSynergies().includes(synergyKey);
  }

  getActive(): SynergyKey[] {
    return this.activeSynergies();
  }

  getDefinition(synergyKey: SynergyKey): SynergyDefinition | undefined {
    return SYNERGY_DEFINITIONS.find(s => s.key === synergyKey);
  }

  getRequirements(synergyKey: SynergyKey): string[] {
    return this.getDefinition(synergyKey)?.requires ?? [];
  }

  getMissingRequirements(synergyKey: SynergyKey): string[] {
    const required = this.getRequirements(synergyKey);
    const owned = this.ownedCardKeys();
    return required.filter(r => !owned.has(r));
  }

  getProgress(synergyKey: SynergyKey): { owned: number; total: number } {
    const required = this.getRequirements(synergyKey);
    const owned = this.ownedCardKeys();
    const ownedCount = required.filter(r => owned.has(r)).length;
    return { owned: ownedCount, total: required.length };
  }

  getAllDefinitions(): SynergyDefinition[] {
    return SYNERGY_DEFINITIONS;
  }

  reset(): void {
    this.ownedCardKeys.set(new Set());
    this.activeSynergies.set([]);
  }
}