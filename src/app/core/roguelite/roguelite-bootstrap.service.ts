import { Injectable, inject } from '@angular/core';
import { RunStateService } from './run-state.service';
import { CardPoolService } from './card-pool.service';
import { UpgradeApplierService } from './upgrade-applier.service';
import { EnemyScalerService } from './enemy-scaler.service';
import { SynergyEngineService } from './synergy-engine.service';
import { RunPersistenceService } from './run-persistence.service';
import { GameLogicService } from '../game-logic.service';
import { EnemyArchetype } from '../models/enemy-archetype.model';
import { CARD_DEFINITIONS } from '../../data/cards.seed';
import { ENEMY_DEFINITIONS } from '../../data/enemies.seed';

@Injectable({ providedIn: 'root' })
export class RogueliteBootstrapService {
  private readonly runState = inject(RunStateService);
  private readonly cardPool = inject(CardPoolService);
  private readonly upgradeApplier = inject(UpgradeApplierService);
  private readonly enemyScaler = inject(EnemyScalerService);
  private readonly synergyEngine = inject(SynergyEngineService);
  private readonly persistence = inject(RunPersistenceService);

  private initialized = false;

  async initialize(gameLogic: GameLogicService): Promise<void> {
    if (this.initialized) return;

    this.upgradeApplier.setGameLogic(gameLogic);
    this.upgradeApplier.setRunState(this.runState);

    await this.loadStaticData();
    this.initialized = true;
  }

  private async loadStaticData(): Promise<void> {
    try {
      await this.cardPool.loadPool();
    } catch {
      this.cardPool.pool.set(CARD_DEFINITIONS);
    }

    this.enemyScaler.registerArchetypes(ENEMY_DEFINITIONS);
  }

  async startNewRun(): Promise<void> {
    await this.runState.startRun();
    this.syncSynergyEngine();
  }

  async continueRun(runId: string): Promise<boolean> {
    const run = await this.runState.loadRun(runId);
    if (run) {
      this.syncSynergyEngine();
      return true;
    }
    return false;
  }

  async enterDraft(phase: number): Promise<void> {
    const run = this.runState.currentRun();
    if (!run) throw new Error('Nenhuma run ativa');

    const ownedKeys = run.upgrades.map(u => u.cardKey);
    const offered = this.cardPool.offerDraft(ownedKeys, phase);

    this.runState.currentDraft.set({ offered, phase });
  }

  async pickCard(cardKey: string): Promise<void> {
    const draft = this.runState.currentDraft();
    const run = this.runState.currentRun();
    if (!draft || !run) throw new Error('Draft ou run inválido');

    await this.runState.applyChoice({
      phase: draft.phase,
      offered: draft.offered,
      picked: cardKey,
    });

    this.syncSynergyEngine();
    this.upgradeApplier.applyUpgrades(this.runState.upgrades());
  }

  async finishRun(reason: 'TIME_UP' | 'NO_LIVES' | 'VICTORY' | 'QUIT'): Promise<void> {
    const run = this.runState.currentRun();
    if (!run) return;

    await this.runState.endRun({
      score: run.score,
      timeLeftMs: run.timeLeftMs,
      reason,
    });
  }

  getScaledEnemy(archetypeKey: string, phase: number) {
    const archetype = this.enemyScaler.getArchetype(archetypeKey);
    if (!archetype) return null;
    return this.enemyScaler.scaleForPhase(archetype, phase);
  }

  pickEnemiesForPhase(phase: number, count: number): EnemyArchetype[] {
    return this.enemyScaler.pickSpawnMultiple(phase, count);
  }

  getBossForPhase(phase: number) {
    return this.enemyScaler.getBossForPhase(phase);
  }

  private syncSynergyEngine(): void {
    const ownedKeys = this.runState.upgrades().map(u => u.cardKey);
    this.synergyEngine.setOwnedCards(ownedKeys);
  }

  getRunState() { return this.runState; }
  getCardPool() { return this.cardPool; }
  getUpgradeApplier() { return this.upgradeApplier; }
  getEnemyScaler() { return this.enemyScaler; }
  getSynergyEngine() { return this.synergyEngine; }
}