import { Injectable, inject, signal, computed } from '@angular/core';
import { SkillTreePersistenceService, SkillNode, UserSkill, SkillUpgradeCost } from './skill-tree-persistence.service';
import { RunStateService } from './run-state.service';

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

    const cost = Math.ceil(node.baseCost * Math.pow(node.costScaling, currentLevel));
    const missingPrereqs = this.getMissingPrerequisites(node);

    return {
      skillKey: node.key,
      currentLevel,
      nextLevel: currentLevel + 1,
      cost,
      canAfford: missingPrereqs.length === 0, // SP check done in backend
      missingPrereqs,
    };
  });

  async load(): Promise<void> {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));
try {
      const [nodes, userSkills] = await Promise.all([
        this.persistence.getTree(),
        this.persistence.getUserSkills(),
      ]);

      const nodesMap = new Map(nodes.map(n => [n.key, n]));
      const userSkillsMap = new Map(userSkills.map(us => [us.skillKey, us]));

      // Calculate node positions
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
      this.state.update(s => ({ ...s, isLoading: false, error: 'Falha ao carregar skill tree' }));
      throw e;
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
      return true;
    } catch (e: any) {
      this.state.update(s => ({ ...s, isLoading: false, error: e.error?.error || 'Falha ao upar skill' }));
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
}