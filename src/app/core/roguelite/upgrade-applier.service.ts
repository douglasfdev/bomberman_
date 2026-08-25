import { Injectable } from '@angular/core';
import { GameLogicService } from '../game-logic.service';
import { RunUpgrade } from '../models/run.model';
import { SynergyKey } from '../models/synergy.model';
import { RunStateService } from './run-state.service';

@Injectable({ providedIn: 'root' })
export class UpgradeApplierService {
  private gameLogic: GameLogicService | null = null;
  private runState: RunStateService | null = null;

  setGameLogic(service: GameLogicService): void {
    this.gameLogic = service;
  }

  setRunState(service: RunStateService): void {
    this.runState = service;
  }

  applyUpgrades(upgrades: RunUpgrade[]): void {
    if (!this.gameLogic) {
      console.warn('GameLogicService não injetado no UpgradeApplierService');
      return;
    }

    for (const upgrade of upgrades) {
      this.applySingleUpgrade(upgrade);
    }

    if (this.runState) {
      const synergies = this.runState.activeSynergies();
      this.applySynergyEffects(synergies);
    }
  }

  private applySingleUpgrade(upgrade: RunUpgrade): void {
    const gl = this.gameLogic!;
    const stacks = upgrade.stacks;

    switch (upgrade.cardKey) {
      case 'BOMB_PLUS_1':
        gl.maxBombs.update(b => b + stacks);
        break;
      case 'RANGE_PLUS_1':
        gl.range.update(r => r + stacks);
        break;
      case 'SPEED_PLUS_1':
        gl.applySpeedStacks(stacks);
        break;
      case 'PIERCE_BOMB':
        gl.pierce.set(true);
        break;
      case 'FREEZE_BOMB':
        gl.setPlayerProperty('freezeBomb', true);
        break;
      case 'SHIELD':
        this.runState?.addShield();
        break;
      case 'LIFE_STEAL':
        gl.setPlayerProperty('lifeSteal', true);
        break;
      case 'BOMB_KICK':
        gl.setPlayerProperty('canKick', true);
        break;
      case 'REMOTE_DETONATE':
        gl.setPlayerProperty('remoteDetonate', true);
        break;
      case 'MEGA_BOMB':
        gl.setPlayerProperty('megaBombCharges', 1);
        break;
      case 'GHOST_WALK':
        gl.setPlayerProperty('ghostWalkCd', 0);
        break;
      case 'REVENGE':
        gl.setPlayerProperty('revenge', true);
        break;
      case 'BOMB_REFLECT':
        gl.setPlayerProperty('reflect', true);
        break;
      case 'SHATTER':
        gl.setPlayerProperty('shatter', true);
        break;
      case 'RICOCHET':
        gl.setPlayerProperty('ricochet', true);
        break;
      case 'VAMPIRISM':
        gl.setPlayerProperty('vampirism', true);
        break;
      case 'TIME_BONUS':
        this.runState?.addTime(30000 * stacks);
        break;
      case 'MAGNET':
        gl.setPlayerProperty('magnetRange', 2);
        break;
      case 'SPEED_DEMON':
        break;
      case 'BOSS_SLAYER':
        gl.setPlayerProperty('bossSlayer', true);
        break;
      default:
        console.warn(`Upgrade desconhecido: ${upgrade.cardKey}`);
    }
  }

  private applySynergyEffects(synergies: SynergyKey[]): void {
    const gl = this.gameLogic!;
    for (const synergy of synergies) {
      switch (synergy) {
        case 'FREEZE_CHAIN':
          gl.setPlayerProperty('freezeChainDamage', 2);
          break;
        case 'SHATTER':
          gl.setPlayerProperty('shatter', true);
          break;
        case 'CHAIN_DETONATION':
          gl.setPlayerProperty('chainPierceKick', true);
          break;
        case 'MEGA_REMOTE':
          gl.setPlayerProperty('megaRemoteRange', 3);
          break;
        case 'GHOST_BOMB':
          gl.setPlayerProperty('ghostKickInside', true);
          break;
        case 'TOTAL_VAMPIRISM':
          gl.setPlayerProperty('totalVampirism', true);
          break;
        case 'LETHAL_SPEED':
          gl.setPlayerProperty('lethalSpeedSlow', 0.2);
          break;
        case 'MASTER_REFLECTOR':
          gl.setPlayerProperty('reflectChain', true);
          break;
      }
    }
  }

  removeUpgrade(cardKey: string): void {
    if (!this.gameLogic) return;

    const gl = this.gameLogic;

    switch (cardKey) {
      case 'BOMB_PLUS_1':
        gl.maxBombs.update(b => Math.max(1, b - 1));
        break;
      case 'RANGE_PLUS_1':
        gl.range.update(r => Math.max(1, r - 1));
        break;
      case 'SPEED_PLUS_1':
        gl.applySpeedStacks(-1);
        break;
      case 'PIERCE_BOMB':
        gl.pierce.set(false);
        break;
      case 'FREEZE_BOMB':
        gl.setPlayerProperty('freezeBomb', false);
        gl.setPlayerProperty('freezeChainDamage', 1);
        break;
      case 'SHIELD':
        break;
      case 'LIFE_STEAL':
        gl.setPlayerProperty('lifeSteal', false);
        break;
      case 'BOMB_KICK':
        gl.setPlayerProperty('canKick', false);
        gl.setPlayerProperty('chainPierceKick', false);
        gl.setPlayerProperty('ghostKickInside', false);
        break;
      case 'REMOTE_DETONATE':
        gl.setPlayerProperty('remoteDetonate', false);
        gl.setPlayerProperty('megaRemoteRange', 1);
        break;
      case 'MEGA_BOMB':
        gl.setPlayerProperty('megaBombCharges', 0);
        gl.setPlayerProperty('megaRemoteRange', 1);
        break;
      case 'GHOST_WALK':
        gl.setPlayerProperty('ghostWalkCd', -1);
        gl.setPlayerProperty('ghostKickInside', false);
        break;
      case 'REVENGE':
        gl.setPlayerProperty('revenge', false);
        break;
      case 'BOMB_REFLECT':
        gl.setPlayerProperty('reflect', false);
        gl.setPlayerProperty('reflectChain', false);
        break;
      case 'SHATTER':
        gl.setPlayerProperty('shatter', false);
        break;
      case 'RICOCHET':
        gl.setPlayerProperty('ricochet', false);
        break;
      case 'VAMPIRISM':
        gl.setPlayerProperty('vampirism', false);
        gl.setPlayerProperty('totalVampirism', false);
        break;
      case 'TIME_BONUS':
        break;
      case 'MAGNET':
        gl.setPlayerProperty('magnetRange', 0);
        break;
      case 'SPEED_DEMON':
        gl.setPlayerProperty('lethalSpeedSlow', 0);
        break;
      case 'BOSS_SLAYER':
        gl.setPlayerProperty('bossSlayer', false);
        break;
    }
  }
}