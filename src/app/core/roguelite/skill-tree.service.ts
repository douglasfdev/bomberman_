import { Injectable, inject, signal, computed } from '@angular/core';
import { SkillTreePersistenceService, SkillNode, UserSkill, SkillUpgradeCost } from './skill-tree-persistence.service';
import { RunStateService } from './run-state.service';
import { UpgradeApplierService } from './upgrade-applier.service';

export type { SkillNode, UserSkill, SkillUpgradeCost };

interface SkillTreeState {
  nodes: Map<string, SkillNode>;
  userSkills: Map<string, UserSkill>;
  selectedNodeKey: string | null;
  isLoading: boolean;
  error: string | null;
  nodePositions: Map<string, { x: number; y: number }>;
}

@Injectable({ providedIn: 'root' })
export class SkillTreeService {
  private readonly persistence = inject(SkillTreePersistenceService);
  private readonly runState = inject(RunStateService);
  private readonly upgradeApplier = inject(UpgradeApplierService);

  private state = signal<SkillTreeState>({
    nodes: new Map(),
    userSkills: new Map(),
    selectedNodeKey: null,
    isLoading: false,
    error: null,
    nodePositions: new Map(),
  });

  readonly nodes = computed(() => Array.from(this.state().nodes.values()));
  readonly userSkills = computed(() => Array.from(this.state().userSkills.values()));
  readonly nodePositions = computed(() => this.state().nodePositions);
  readonly selectedNode = computed(() => {
    const key = this.state().selectedNodeKey;
    return key ? this.state().nodes.get(key) ?? null : null;
  });
  readonly selectedNodeKey = computed(() => this.state().selectedNodeKey);
  readonly selectedUserSkill = computed(() => {
    const key = this.state().selectedNodeKey;
    return key ? this.state().userSkills.get(key) ?? null : null;
  });
  readonly isLoading = computed(() => this.state().isLoading);
  readonly error = computed(() => this.state().error);

  readonly userSkillPoints = computed(() => this.runState.currentRun()?.skillPoints ?? 0);

  readonly upgradeCost = computed((): SkillUpgradeCost | null => {
    const node = this.selectedNode();
    const userSkill = this.selectedUserSkill();
    if (!node) return null;

    const currentLevel = userSkill?.level ?? 0;
    if (currentLevel >= node.maxLevel) return null;

    const BASE_SKILL_COST = 600;
    const cost = Math.ceil(BASE_SKILL_COST * (1 + Math.pow(2, currentLevel)));
    const missingPrereqs = this.getMissingPrerequisites(node);

    return {
      skillKey: node.key,
      currentLevel,
      nextLevel: currentLevel + 1,
      cost,
      canAfford: missingPrereqs.length === 0,
      missingPrereqs,
    };
  });

  private static readonly LOCAL_SKILL_NODES: SkillNode[] = [
    { id: '', key: 'BOMB_PLUS_1', name: 'Bomba Extra', description: '+1 bomba simultânea', icon: '💣', baseCost: 1, costScaling: 1.5, maxLevel: 3, prerequisites: [], category: 'BOMB', positionX: 0.4, positionY: 0.5, effects: {}, isActive: false },
    { id: '', key: 'RANGE_PLUS_1', name: 'Alcance', description: '+1 alcance de explosão', icon: '📏', baseCost: 1, costScaling: 1.5, maxLevel: 3, prerequisites: [], category: 'RANGE', positionX: 0.5, positionY: 0.3, effects: {}, isActive: false },
    { id: '', key: 'TIME_BONUS', name: 'Bônus de Tempo', description: '+30s no timer', icon: '⏱️', baseCost: 1, costScaling: 1.5, maxLevel: 1, prerequisites: [], category: 'UTILITY', positionX: 0.6, positionY: 0.7, effects: {}, isActive: false },
  ];

  async load(): Promise<void> {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));
    try {
      const [nodes, userSkills] = await Promise.all([
        this.persistence.getTree(),
        this.persistence.getUserSkills(),
      ]);

      const nodesMap = new Map(nodes.map(n => [n.key, n]));
      const userSkillsMap = new Map(userSkills.map(us => [us.skillKey, us]));

      const nodePositions = new Map<string, { x: number; y: number }>();
      nodes.forEach(node => {
        nodePositions.set(node.key, {
          x: node.positionX * 1200,
          y: node.positionY * 800,
        });
      });

      this.state.set({
        nodes: nodesMap,
        userSkills: userSkillsMap,
        selectedNodeKey: null,
        isLoading: false,
        error: null,
        nodePositions,
      });
    } catch (e) {
      const nodesMap = new Map(SkillTreeService.LOCAL_SKILL_NODES.map(n => [n.key, n]));
      this.state.update(s => ({
        ...s,
        isLoading: false,
        error: 'Backend indisponível, usando modo local',
        nodes: nodesMap,
        userSkills: s.userSkills,
        nodePositions: this.calculateNodePositions(SkillTreeService.LOCAL_SKILL_NODES),
      }));
    }
  }

  selectNode(key: string): void {
    const node = this.state().nodes.get(key);
    if (node) {
      this.state.update(s => ({ ...s, selectedNodeKey: key }));
    }
  }

  clearSelection(): void {
    this.state.update(s => ({ ...s, selectedNodeKey: null }));
  }

  async upgradeSkill(skillKey: string): Promise<boolean> {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));
    try {
      const result = await this.persistence.upgradeSkill(skillKey);
      this.state.update(s => {
        const userSkills = new Map(s.userSkills);
        userSkills.set(skillKey, result.userSkill);
        return { ...s, userSkills, isLoading: false };
      });

      const run = this.runState.currentRun();
      if (run) {
        run.upgrades = run.upgrades.filter(u => {
          const isCardUpgrade = u.cardKey && u.cardKey !== 'SCORE_MULTIPLIER';
          return !isCardUpgrade;
        });
        const userSkill = this.state().userSkills.get(skillKey);
        if (userSkill && userSkill.level > 0) {
          run.upgrades.push({
            id: 'tree-' + skillKey + '-' + Date.now(),
            runId: run.id,
            cardKey: skillKey,
            stacks: userSkill.level,
            createdAt: new Date(),
          });
        }
        this.runState.recomputeSynergies();
        this.upgradeApplier.applyUpgrades(run.upgrades);
      }

      return true;
    } catch (e: any) {
      const node = this.getNode(skillKey);
      const BASE_SKILL_COST = 600;
      if (!node) {
        this.state.update(s => ({ ...s, isLoading: false, error: 'Skill não encontrada' }));
        return false;
      }

      const currentSkill = this.state().userSkills.get(skillKey);
      const currentLevel = currentSkill?.level ?? 0;
      const newLevel = Math.min(currentLevel + 1, node.maxLevel);
      const cost = Math.ceil(BASE_SKILL_COST * (1 + Math.pow(2, currentLevel)));

      if (newLevel > currentLevel && this.userSkillPoints() >= cost) {
        const localUserSkill: UserSkill = {
          id: 'local-skill-' + skillKey + '-' + Date.now(),
          userId: 'local',
          skillKey,
          level: newLevel,
          skill: node,
        };
        this.state.update(s => {
          const updated = new Map(s.userSkills);
          updated.set(skillKey, localUserSkill);
          return { ...s, userSkills: updated, isLoading: false };
        });

        const run = this.runState.currentRun();
        if (run) {
          run.upgrades = run.upgrades.filter(u => {
            const isCardUpgrade = u.cardKey && u.cardKey !== 'SCORE_MULTIPLIER';
            return !isCardUpgrade;
          });

          run.upgrades.push({
            id: 'tree-' + skillKey + '-' + Date.now(),
            runId: run.id,
            cardKey: skillKey,
            stacks: newLevel,
            createdAt: new Date(),
          });
          this.runState.recomputeSynergies();
          this.upgradeApplier.applyUpgrades(run.upgrades);
        }

        return true;
      }

      if (newLevel > node.maxLevel) {
        this.state.update(s => ({ ...s, isLoading: false, error: 'Nível máximo atingido' }));
      } else {
        this.state.update(s => ({ ...s, isLoading: false, error: 'SP insuficiente' }));
      }
      return false;
    }
  }

  private getMissingPrerequisites(node: SkillNode): string[] {
    return node.prerequisites.filter(key => {
      const userSkill = this.state().userSkills.get(key);
      return !userSkill || userSkill.level === 0;
    });
  }

  isUnlocked(node: SkillNode): boolean {
    if (node.prerequisites.length === 0) return true;
    return node.prerequisites.every(key => {
      const userSkill = this.state().userSkills.get(key);
      return userSkill && userSkill.level > 0;
    });
  }

  getNode(key: string): SkillNode | undefined {
    return this.state().nodes.get(key);
  }

  getNodePosition(key: string): { x: number; y: number } | undefined {
    return this.state().nodePositions.get(key);
  }

  getUserSkillLevel(key: string): number {
    return this.state().userSkills.get(key)?.level ?? 0;
  }

  isMaxLevel(node: SkillNode): boolean {
    const level = this.getUserSkillLevel(node.key);
    return level >= node.maxLevel;
  }

  clearError(): void {
    this.state.update(s => ({ ...s, error: null }));
  }

  private calculateNodePositions(nodes: SkillNode[]): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      positions.set(node.key, {
        x: node.positionX * 1200,
        y: node.positionY * 800,
      });
    });
    return positions;
  }
}