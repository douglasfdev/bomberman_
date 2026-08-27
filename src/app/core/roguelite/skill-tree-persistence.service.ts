import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SkillNode {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  baseCost: number;
  costScaling: number;
  maxLevel: number;
  prerequisites: string[];
  category: string;
  positionX: number;
  positionY: number;
  effects: Record<string, any>;
  isActive: boolean;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillKey: string;
  level: number;
  skill: SkillNode;
}

export interface SkillUpgradeCost {
  skillKey: string;
  currentLevel: number;
  nextLevel: number;
  cost: number;
  canAfford: boolean;
  missingPrereqs: string[];
}

@Injectable({ providedIn: 'root' })
export class SkillTreePersistenceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/skills`;

  async getTree(): Promise<SkillNode[]> {
    return firstValueFrom(this.http.get<SkillNode[]>(`${this.baseUrl}/tree`));
  }

  async getUserSkills(): Promise<UserSkill[]> {
    return firstValueFrom(this.http.get<UserSkill[]>(`${this.baseUrl}/user`));
  }

  async upgradeSkill(skillKey: string): Promise<{ success: boolean; userSkill: UserSkill; cost: number }> {
    return firstValueFrom(this.http.post<{ success: boolean; userSkill: UserSkill; cost: number }>(
      `${this.baseUrl}/upgrade`, { skillKey }
    ));
  }

  async getRunSkills(runId: string): Promise<{ skillKey: string; level: number }[]> {
    return firstValueFrom(this.http.get<{ skillKey: string; level: number }[]>(`${this.baseUrl}/run/${runId}`));
  }

  async upgradeRunSkill(runId: string, skillKey: string): Promise<{ success: boolean; runSkills: { skillKey: string; level: number }[]; cost: number }> {
    return firstValueFrom(this.http.post<{ success: boolean; runSkills: { skillKey: string; level: number }[]; cost: number }>(
      `${this.baseUrl}/run/${runId}/upgrade`, { skillKey }
    ));
  }
}