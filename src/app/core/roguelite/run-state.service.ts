import { Injectable, inject } from '@angular/core';
import { signal, computed } from '@angular/core';
import { Run, RunChoice, RunUpgrade, RunEndedReason, DraftDTO, ChoicePayload, EndRunPayload, RunDTO } from '../models/run.model';
import { Card } from '../models/card.model';
import { SynergyKey, detectActiveSynergies } from '../models/synergy.model';
import { RunPersistenceService } from './run-persistence.service';
import { CardPoolService } from './card-pool.service';
import { generateSeed } from '../../../utils/seedrandom.util';

function dtoToRun(dto: RunDTO): Run {
  return {
    id: dto.id,
    userId: '',
    seed: dto.seed,
    phase: dto.phase,
    maxPhase: dto.maxPhase,
    lives: dto.lives,
    shield: dto.shield,
    timeLeftMs: dto.timeLeftMs,
    score: dto.score,
    startedAt: new Date(dto.startedAt),
    endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
    endedReason: dto.endedReason,
    seedData: null,
    skillPoints: 0,
    choices: [],
    upgrades: [],
    skills: [],
  };
}

function createLocalRun(): Run {
  return {
    id: 'local-' + Date.now(),
    userId: 'local',
    seed: generateSeed(),
    phase: 1,
    maxPhase: 1,
    lives: 3,
    shield: 0,
    timeLeftMs: 30000,
    score: 0,
    startedAt: new Date(),
    endedAt: null,
    endedReason: null,
    seedData: null,
    skillPoints: 0,
    choices: [],
    upgrades: [],
    skills: [],
  };
}

@Injectable({ providedIn: 'root' })
export class RunStateService {
  private readonly persistence = inject(RunPersistenceService);
  private readonly cardPool = inject(CardPoolService);

  readonly currentRun = signal<Run | null>(null);
  readonly currentDraft = signal<DraftDTO | null>(null);
  readonly activeSynergies = signal<SynergyKey[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly lives = computed(() => this.currentRun()?.lives ?? 3);
  readonly shield = computed(() => this.currentRun()?.shield ?? 0);
  readonly timeLeftMs = computed(() => this.currentRun()?.timeLeftMs ?? 0);
  readonly score = computed(() => this.currentRun()?.score ?? 0);
  readonly phase = computed(() => this.currentRun()?.phase ?? 1);
  readonly maxPhase = computed(() => this.currentRun()?.maxPhase ?? 1);
  readonly seed = computed(() => this.currentRun()?.seed ?? '');
  readonly upgrades = computed(() => this.currentRun()?.upgrades ?? []);

  readonly formattedTime = computed(() => {
    const ms = this.timeLeftMs();
    if (ms <= 0) return '00';
    const totalSec = Math.ceil(ms / 1000);
    if (totalSec >= 60) {
      const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const s = (totalSec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }
    return totalSec.toString().padStart(2, '0') + 's';
  });

  readonly isTimeCritical = computed(() => this.timeLeftMs() < 10000);
  readonly isTimeWarning = computed(() => this.timeLeftMs() < 30000);

  async startRun(): Promise<RunDTO> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const run = await this.persistence.startRun();
      this.currentRun.set(dtoToRun(run));
      this.recomputeSynergies();
      return run;
    } catch (e) {
      // Fallback para modo local se backend não estiver disponível
      console.warn('Backend indisponível, usando modo local:', e);
      const localRun = createLocalRun();
      this.currentRun.set(localRun);
      this.recomputeSynergies();
      return {
        id: localRun.id,
        seed: localRun.seed,
        phase: localRun.phase,
        maxPhase: localRun.maxPhase,
        lives: localRun.lives,
        shield: localRun.shield,
        timeLeftMs: localRun.timeLeftMs,
        score: localRun.score,
        startedAt: localRun.startedAt.toISOString(),
        endedAt: null,
        endedReason: null,
      };
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadRun(runId: string): Promise<RunDTO | null> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const run = await this.persistence.getRun(runId);
      if (run) {
        this.currentRun.set(dtoToRun(run));
        this.recomputeSynergies();
      }
      return run;
    } catch (e) {
      this.error.set('Falha ao carregar run');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  async getDraft(phase: number): Promise<DraftDTO> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const run = this.currentRun();
      if (!run) throw new Error('Nenhuma run ativa');
      
      // Se for run local, gerar draft local
      if (run.id.startsWith('local-')) {
        const draft = this.generateLocalDraft(run, phase);
        this.currentDraft.set(draft);
        return draft;
      }
      
      const draft = await this.persistence.getDraft(run.id, phase);
      this.currentDraft.set(draft);
      return draft;
    } catch (e) {
      this.error.set('Falha ao buscar draft');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  private generateLocalDraft(run: Run, phase: number): DraftDTO {
    const ownedKeys = run.upgrades.map(u => u.cardKey);
    const offered = this.cardPool.offerDraft(ownedKeys, phase);
    return { offered, phase };
  }

  async applyChoice(payload: ChoicePayload): Promise<{ choice: RunChoice; upgrade: RunUpgrade }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const run = this.currentRun();
      if (!run) throw new Error('Nenhuma run ativa');
      
      if (run.id.startsWith('local-')) {
        // Modo local: aplicar escolha localmente
        const choice: RunChoice = {
          id: 'local-choice-' + Date.now(),
          runId: run.id,
          phase: payload.phase,
          offered: payload.offered,
          picked: payload.picked,
          createdAt: new Date(),
        };
        const upgrade: RunUpgrade = {
          id: 'local-upgrade-' + Date.now(),
          runId: run.id,
          cardKey: payload.picked,
          stacks: 1,
          createdAt: new Date(),
        };
        this.currentRun.update((r) => {
          if (!r) return r;
          return {
            ...r,
            upgrades: [...r.upgrades, upgrade],
            choices: [...r.choices, choice],
          };
        });
        this.recomputeSynergies();
        this.currentDraft.set(null);
        return { choice, upgrade };
      }
      
      const result = await this.persistence.applyChoice(run.id, payload);
      this.currentRun.update((r) => {
        if (!r) return r;
        return {
          ...r,
          upgrades: [...r.upgrades, result.upgrade],
          choices: [...r.choices, result.choice],
        };
      });
      this.recomputeSynergies();
      this.currentDraft.set(null);
      return result;
    } catch (e) {
      this.error.set('Falha ao aplicar escolha');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  async endRun(payload: EndRunPayload): Promise<RunDTO> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const run = this.currentRun();
      if (!run) throw new Error('Nenhuma run ativa');
      
      if (run.id.startsWith('local-')) {
        // Modo local: finalizar localmente
        const endedRun: Run = {
          ...run,
          score: payload.score,
          timeLeftMs: payload.timeLeftMs,
          endedAt: new Date(),
          endedReason: payload.reason,
        };
        this.currentRun.set(endedRun);
        return {
          id: endedRun.id,
          seed: endedRun.seed,
          phase: endedRun.phase,
          maxPhase: endedRun.maxPhase,
          lives: endedRun.lives,
          shield: endedRun.shield,
          timeLeftMs: endedRun.timeLeftMs,
          score: endedRun.score,
          startedAt: endedRun.startedAt.toISOString(),
          endedAt: endedRun.endedAt!.toISOString(),
          endedReason: endedRun.endedReason,
        };
      }
      
      const ended = await this.persistence.endRun(run.id, payload);
      this.currentRun.set(dtoToRun(ended));
      return ended;
    } catch (e) {
      this.error.set('Falha ao finalizar run');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  async resetRunForPrestige(prestigeCards: string[]): Promise<RunDTO> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const run = this.currentRun();
      if (!run) throw new Error('Nenhuma run ativa');
      
      // Create prestige choices record
      const prestigeChoices = prestigeCards.map(cardKey => ({
        id: 'local-prestige-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        runId: run.id,
        phase: run.phase,
        offered: [],
        picked: cardKey,
        createdAt: new Date(),
      }));
      
      // Create prestige upgrades (these become permanent for the next run)
      const prestigeUpgrades = prestigeCards.map(cardKey => ({
        id: 'local-prestige-upgrade-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        runId: run.id,
        cardKey: cardKey,
        stacks: 1,
        createdAt: new Date(),
      }));
      
      if (run.id.startsWith('local-')) {
        // Modo local: criar nova run com os upgrades de prestígio
        const newRun = createLocalRun();
        newRun.id = 'local-' + Date.now();
        newRun.seed = generateSeed();
        newRun.phase = 1;
        newRun.maxPhase = 1;
        newRun.lives = 3;
        newRun.shield = 0;
        newRun.timeLeftMs = 30000;
        newRun.score = 0;
        newRun.startedAt = new Date();
        newRun.endedAt = null;
        newRun.endedReason = null;
        newRun.skillPoints = 0;
        newRun.choices = prestigeChoices;
        newRun.upgrades = prestigeUpgrades;
        newRun.skills = run.skills; // Keep skills from previous run
        
        this.currentRun.set(newRun);
        this.recomputeSynergies();
        
        return {
          id: newRun.id,
          seed: newRun.seed,
          phase: newRun.phase,
          maxPhase: newRun.maxPhase,
          lives: newRun.lives,
          shield: newRun.shield,
          timeLeftMs: newRun.timeLeftMs,
          score: 0,
          startedAt: newRun.startedAt.toISOString(),
          endedAt: null,
          endedReason: null,
        };
      }
      
      // For server runs, call backend
      const ended = await this.persistence.endRun(run.id, {
        score: 0,
        timeLeftMs: 0,
        reason: 'PRESTIGE',
      });
      
      // Start new run with prestige upgrades
      const newRun = await this.persistence.startRun();
      // Apply prestige upgrades to new run...
      
      this.currentRun.set(dtoToRun(newRun));
      this.recomputeSynergies();
      
      return ended;
    } catch (e) {
      this.error.set('Falha ao fazer prestígio');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  async getHistory(limit = 20, offset = 0): Promise<RunDTO[]> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.persistence.getHistory(limit, offset);
    } catch (e) {
      this.error.set('Falha ao buscar histórico');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  updateTimeLeft(ms: number): void {
    this.currentRun.update((r) => {
      if (!r) return r;
      return { ...r, timeLeftMs: Math.max(0, ms) };
    });
  }

  addTime(ms: number): void {
    this.currentRun.update((r) => {
      if (!r) return r;
      return { ...r, timeLeftMs: r.timeLeftMs + ms };
    });
  }

  loseLife(): boolean {
    let died = false;
    this.currentRun.update((r) => {
      if (!r) return r;
      if (r.shield > 0) {
        return { ...r, shield: r.shield - 1 };
      }
      const newLives = r.lives - 1;
      died = newLives <= 0;
      return { ...r, lives: Math.max(0, newLives) };
    });
    return died;
  }

  addShield(): void {
    this.currentRun.update((r) => {
      if (!r) return r;
      return { ...r, shield: Math.min(1, r.shield + 1) };
    });
  }

  addScore(points: number): void {
    this.currentRun.update((r) => {
      if (!r) return r;
      return { ...r, score: r.score + points };
    });
  }

  advancePhase(): void {
    this.currentRun.update((r) => {
      if (!r) return r;
      const newPhase = r.phase + 1;
      return {
        ...r,
        phase: newPhase,
        maxPhase: Math.max(r.maxPhase, newPhase),
      };
    });
  }

  private recomputeSynergies(): void {
    const run = this.currentRun();
    if (!run) {
      this.activeSynergies.set([]);
      return;
    }
    const ownedKeys = run.upgrades.map((u) => u.cardKey);
    this.activeSynergies.set(detectActiveSynergies(ownedKeys));
  }

  hasSynergy(key: SynergyKey): boolean {
    return this.activeSynergies().includes(key);
  }

  clearRun(): void {
    this.currentRun.set(null);
    this.currentDraft.set(null);
    this.activeSynergies.set([]);
    this.error.set(null);
  }
}