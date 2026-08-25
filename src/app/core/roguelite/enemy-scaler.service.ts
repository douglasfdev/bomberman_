import { Injectable } from '@angular/core';
import { EnemyArchetype, EnemyAbility, ScaledEnemyStats, EnemyScaleConfig } from '../models/enemy-archetype.model';

@Injectable({ providedIn: 'root' })
export class EnemyScalerService {
  private archetypes = new Map<string, EnemyArchetype>();

  registerArchetypes(archetypes: EnemyArchetype[]): void {
    for (const a of archetypes) {
      this.archetypes.set(a.key, a);
    }
  }

  getArchetype(key: string): EnemyArchetype | undefined {
    return this.archetypes.get(key);
  }

  getAllArchetypes(): EnemyArchetype[] {
    return Array.from(this.archetypes.values());
  }

  getAvailableForPhase(phase: number): EnemyArchetype[] {
    return this.getAllArchetypes()
      .filter(a => !a.isBoss && a.minPhase <= phase);
  }

  getBossForPhase(phase: number): EnemyArchetype | undefined {
    return this.getAllArchetypes().find(a => a.isBoss && a.minPhase <= phase);
  }

  scaleForPhase(archetype: EnemyArchetype, phase: number): ScaledEnemyStats {
    const scale = archetype.scalePerPhase;
    const phaseDiff = Math.max(0, phase - archetype.minPhase);

    let hp = Math.round(archetype.baseHp * Math.pow(scale.hpMult, phaseDiff));
    let speed = Math.round(archetype.baseSpeed * Math.pow(scale.speedMult, phaseDiff));
    let damage = Math.round(archetype.baseDamage * Math.pow(scale.hpMult, phaseDiff * 0.5));
    let bombRange = Math.round(archetype.bombRange * Math.pow(scale.bombRangeMult ?? 1, phaseDiff));
    let bombChance = Math.min(0.9, archetype.bombChance + (scale.bombChanceAdd ?? 0) * phaseDiff);

    const abilities = [...archetype.abilities];
    if (scale.newAbilityAt) {
      for (const [phaseThreshold, ability] of Object.entries(scale.newAbilityAt)) {
        if (phase >= Number(phaseThreshold) && !abilities.includes(ability)) {
          abilities.push(ability);
        }
      }
    }

    return {
      hp: Math.max(1, hp),
      speed: Math.max(100, speed),
      damage: Math.max(1, damage),
      bombRange: Math.max(1, bombRange),
      bombChance: Math.max(0, bombChance),
      abilities,
    };
  }

  pickSpawn(phase: number, rng: () => number = Math.random): EnemyArchetype {
    const available = this.getAvailableForPhase(phase);
    if (available.length === 0) {
      return this.archetypes.get('GRUNT')!;
    }

    const totalWeight = available.reduce((sum, a) => sum + a.weight, 0);
    let r = rng() * totalWeight;

    for (const a of available) {
      r -= a.weight;
      if (r <= 0) return a;
    }

    return available[available.length - 1];
  }

  pickSpawnMultiple(phase: number, count: number, rng: () => number = Math.random): EnemyArchetype[] {
    const results: EnemyArchetype[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.pickSpawn(phase, rng));
    }
    return results;
  }

  hasAbility(stats: ScaledEnemyStats, ability: EnemyAbility): boolean {
    return stats.abilities.includes(ability);
  }

  getEffectiveSpeed(stats: ScaledEnemyStats): number {
    return stats.speed;
  }

  getEffectiveBombInterval(stats: ScaledEnemyStats): number {
    return stats.speed;
  }
}