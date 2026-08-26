import { isPlatformBrowser, CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameLogicService } from '../core/game-logic.service';
import { InputManagerService } from '../core/input-manager.service';
import { SceneBuilderService } from '../render/scene-builder.service';
import { ThreeEngineService } from '../render/three-engine.service';
import { Direction } from '../core/models/direction.model';
import { GamePhase } from '../core/models/game-state.model';
import { AuthService } from '../services/auth.service';
import { SkinService } from '../services/skin.service';
import { AdBannerComponent } from '../components/ad-banner.component';
import { CardDraftComponent } from './card-draft/card-draft.component';
import { RunStateService } from '../core/roguelite/run-state.service';
import { RogueliteBootstrapService } from '../core/roguelite/roguelite-bootstrap.service';
import { SkillTreeService } from '../core/roguelite/skill-tree.service';
import { SkillTreeComponent } from './skill-tree/skill-tree.component';
import { PrestigeDraftComponent } from './prestige-draft/prestige-draft.component';
import { DeathSkillDraftComponent } from './death-skill-draft/death-skill.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [CommonModule, AdBannerComponent, CardDraftComponent, SkillTreeComponent, PrestigeDraftComponent, DeathSkillDraftComponent]
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true }) container!: ElementRef<HTMLElement>;
  @ViewChild('gameCanvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);
  readonly logic = inject(GameLogicService);
  readonly input = inject(InputManagerService);
  readonly engine = inject(ThreeEngineService);
  readonly sceneBuilder = inject(SceneBuilderService);
  readonly authService = inject(AuthService);
  readonly skinService = inject(SkinService);
  readonly runState = inject(RunStateService);
  readonly bootstrap = inject(RogueliteBootstrapService);
  private readonly router = inject(Router);
  readonly skillTree = inject(SkillTreeService);

  readonly Direction = Direction;
  readonly GamePhase = GamePhase;

  // Skill Tree state
  showSkillTree = signal(false);

  readonly score = this.logic.score;
  readonly enemiesRemaining = this.logic.enemiesRemaining;
  readonly maxBombs = this.logic.maxBombs;
  readonly range = this.logic.range;
  readonly speed = this.logic.speed;
  readonly pierce = this.logic.pierce;
  readonly gamePhase = this.logic.gamePhase;

  // Roguelite HUD
  readonly lives = this.runState.lives;
  readonly shield = this.runState.shield;
  readonly timeLeft = this.runState.formattedTime;
  readonly isTimeCritical = this.runState.isTimeCritical;
  readonly isTimeWarning = this.runState.isTimeWarning;
  readonly activeSynergies = this.runState.activeSynergies;

  isTouch = false;
  initError = signal(false);

  // Controle de Monetização
  canPlay = signal(false);
  waitTimer = signal(0);

  // Draft state
  showDraft = signal(false);
  draftPhase = signal(0);

  // Prestige draft state
  showPrestigeDraft = signal(false);
  // Death skill draft state
  showDeathSkillDraft = signal(false);
  deathDraftScore = signal(0);

  readonly maxPrestigeCards = computed(() => 
    Math.min(3 + Math.floor(this.logic.phase() / 3), 5)
  );

  private actionSub?: Subscription;
  private timerInterval: any;
  private draftSub?: Subscription;

  constructor() {
    effect(() => {
      const phase = this.gamePhase();
      const isDonor = this.authService.isDonor();
      const isLoggedIn = !!this.authService.userEmail();

      if (phase === GamePhase.Ready || phase === GamePhase.Victory || phase === GamePhase.Defeat || phase === GamePhase.RunEnd) {
        this.enforcePaywall(isDonor, isLoggedIn);
      }
    });

    effect(() => {
      const skin = this.authService.selectedSkin();
      if (skin && isPlatformBrowser(this.platformId)) {
        this.sceneBuilder.setPlayerSkin(skin);
      }
    });

    // Watch for draft phase
    effect(() => {
      const phase = this.gamePhase();
      if (phase === GamePhase.Draft) {
        this.openDraft();
      } else {
        this.closeDraft();
      }
    });

// Watch for Defeat phase (time up or no lives) - show death skill draft
    // Removed duplicate effect as handleTimeUp manages it now.

    // Watch for skill tree keybind (T)
    effect(() => {
      const phase = this.gamePhase();
      if (phase === GamePhase.Playing && this.input.isKeyPressed('KeyT')) {
        this.toggleSkillTree();
      }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.input.attach();
      this.isTouch = this.input.isTouchDevice();
      this.actionSub = this.input.action$.subscribe(() => this.logic.plantBomb());
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      await this.bootstrap.initialize(this.logic);

      this.engine.init(this.container.nativeElement, this.canvas.nativeElement);
      this.sceneBuilder.init(this.engine.scene!);

      const currentSkin = this.authService.selectedSkin();
      if (currentSkin) {
        this.sceneBuilder.setPlayerSkin(currentSkin);
      }

      if (this.authService.userEmail()) {
        this.skinService.loadMySkins().subscribe({
          next: (data) => {
            this.sceneBuilder.setPlayerSkin(data.selectedSkin);
          },
        });
      }

      this.engine.startLoop((deltaMs: number) => {
        this.logic.tick(deltaMs);
        this.sceneBuilder.sync(this.logic, deltaMs);
        this.updateRunTimer(deltaMs);
      });

      // Inicializa o estado do jogo (gera mapa, posiciona inimigos)
      this.logic.start();
    } catch (e) {
      this.initError.set(true);
      console.error('WebGL init error:', e);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      clearInterval(this.timerInterval);
      this.actionSub?.unsubscribe();
      this.draftSub?.unsubscribe();
      this.input.detach();
      this.sceneBuilder.dispose();
      this.engine.dispose();
    }
    this.donorEffect.destroy();
  }

  private updateRunTimer(deltaMs: number): void {
    const run = this.runState.currentRun();
    if (!run) return;
    if (this.gamePhase() === GamePhase.Defeat || this.gamePhase() === GamePhase.RunEnd) return;
    
    const newTimeLeft = this.runState.timeLeftMs() - deltaMs;
    this.runState.updateTimeLeft(newTimeLeft);
    
    if (newTimeLeft <= 0) {
      this.handleTimeUp();
    }
  }

  private async handleTimeUp(): Promise<void> {
    const run = this.runState.currentRun();
    if (!run) return;
    if (this.gamePhase() === GamePhase.Defeat || this.gamePhase() === GamePhase.RunEnd) return;
    
    const finalScore = this.logic.score();
    this.deathDraftScore.set(finalScore);
    
    // End the run on backend (ignore errors in dev/local mode)
    await this.runState.endRun({
      score: finalScore,
      timeLeftMs: 0,
      reason: 'TIME_UP',
    }).catch(e => {
      console.warn('[Game] End run failed (continuing without backend):', e);
    });
    
    // Show death skill draft
    console.log('[Game] Setting gamePhase to Defeat and showDeathSkillDraft to true');
    this.logic.gamePhase.set(GamePhase.Defeat);
    this.showDeathSkillDraft.set(true);
    console.log('[Game] showDeathSkillDraft is now:', this.showDeathSkillDraft());
  }

  async onDeathSkillDraftConfirm(cardKey: string): Promise<void> {
    this.showDeathSkillDraft.set(false);
    try {
      // Apply the chosen card as a permanent upgrade for the next run
      const run = this.runState.currentRun();
      if (run && run.id.startsWith('local-')) {
        const choice = {
          id: 'local-choice-' + Date.now(),
          runId: run.id,
          phase: run.phase,
          offered: this.runState.currentDraft()?.offered ?? [],
          picked: cardKey,
          createdAt: new Date(),
        };
        const upgrade = {
          id: 'local-upgrade-' + Date.now(),
          runId: run.id,
          cardKey: cardKey,
          stacks: 1,
          createdAt: new Date(),
        };
        this.runState.currentRun.update((r) => {
          if (!r) return r;
          return {
            ...r,
            upgrades: [...r.upgrades, upgrade],
            choices: [...r.choices, choice],
          };
        });
        // Recompute synergies (private method changed to public or accessed directly)
        // @ts-ignore
        this.runState.recomputeSynergies?.();
      }
      // Reload to ensure skills persist for next run
      await this.skillTree.load();
    } catch (e) {
      console.error('Erro ao confirmar upgrade:', e);
    }
    // Go to run end screen
    this.logic.gamePhase.set(GamePhase.RunEnd);
  }

  onDeathSkillDraftClose(): void {
    this.showDeathSkillDraft.set(false);
    this.logic.gamePhase.set(GamePhase.RunEnd);
  }

  private async openDraft(): Promise<void> {
    const phase = this.logic.phase();
    this.draftPhase.set(phase);
    try {
      await this.runState.getDraft(phase);
      this.showDraft.set(true);
    } catch (e) {
      console.error('Erro ao abrir draft:', e);
      this.closeDraft();
    }
  }

  closeDraft(): void {
    this.showDraft.set(false);
    this.draftPhase.set(0);
  }

  async onDraftConfirm(cardKey: string): Promise<void> {
    this.showDraft.set(false);
    try {
      await this.runState.applyChoice({
        phase: this.draftPhase(),
        offered: this.runState.currentDraft()?.offered ?? [],
        picked: cardKey,
      });
      this.bootstrap.getUpgradeApplier().applyUpgrades(this.runState.upgrades());
    } catch (e) {
      console.error('Erro ao confirmar escolha:', e);
    }
  }

  // Prestige Draft methods
  async openPrestigeDraft(): Promise<void> {
    if (this.gamePhase() !== GamePhase.Playing) return;
    
    // Pause the game
    this.logic.gamePhase.set(GamePhase.Draft);
    
    // Calculate how many cards the player can choose based on phase
    const phase = this.logic.phase();
    const maxCards = Math.min(3 + Math.floor(phase / 3), 5); // 3-5 cards based on phase
    
    this.showPrestigeDraft.set(true);
  }

  closePrestigeDraft(): void {
    this.showPrestigeDraft.set(false);
    // Resume game if it was paused
    if (this.gamePhase() === GamePhase.Draft) {
      this.logic.gamePhase.set(GamePhase.Playing);
    }
  }

  async onPrestigeConfirm(cardKeys: string[]): Promise<void> {
    this.showPrestigeDraft.set(false);
    this.logic.gamePhase.set(GamePhase.Playing);
    
    try {
      const result = await this.runState.resetRunForPrestige(cardKeys);
      // Apply the prestige upgrades to the game logic
      this.bootstrap.getUpgradeApplier().applyUpgrades(this.runState.upgrades());
      // Restart the game with new run
      this.logic.restart();
    } catch (e) {
      console.error('Erro ao fazer prestígio:', e);
    }
  }

  /** Navega para a loja de skins */
  openSkinShop(): void {
    this.router.navigate(['/skins']);
  }

  /** Navega para a tela de achievements */
  openAchievements(): void {
    this.router.navigate(['/achievements']);
  }

  // Atualizado para aceitar e verificar o estado de login
  private enforcePaywall(isDonor: boolean, isLoggedIn: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    clearInterval(this.timerInterval);

    // Skip paywall in development mode for faster testing
    // Check multiple ways to detect dev mode
    const isDev = !environment.production || 
                  (typeof window !== 'undefined' && window.location.hostname === 'localhost') ||
                  (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1');
    
    console.log('[Game] enforcePaywall:', { isDonor, isLoggedIn, isDev, canPlay: this.canPlay() });
    
    if (isDonor || isLoggedIn || isDev) {
      this.canPlay.set(true);
      this.waitTimer.set(0);
    } else {
      this.canPlay.set(false);
      this.waitTimer.set(10);

      this.timerInterval = setInterval(() => {
        const current = this.waitTimer();
        if (current > 1) {
          this.waitTimer.set(current - 1);
        } else {
          this.waitTimer.set(0);
          this.canPlay.set(true);
          clearInterval(this.timerInterval);
        }
      }, 1000);
    }
  }

  onDirection(dir: Direction | null): void {
    this.input.setDirection(dir);
  }

  onAction(): void {
    this.logic.plantBomb();
  }

  async play(): Promise<void> {
    clearInterval(this.timerInterval);
    this.canPlay.set(true);
    this.waitTimer.set(0);
    await this.runState.startRun();
    this.logic.play();
  }

  restart(): void {
    clearInterval(this.timerInterval);
    this.canPlay.set(true);
    this.waitTimer.set(0);
    this.runState.startRun().then(() => this.logic.restart());
  }

  getSynergyIcon(synergy: string): string {
    const icons: Record<string, string> = {
      FREEZE_CHAIN: '❄️⛓️',
      SHATTER: '💎',
      CHAIN_DETONATION: '💣⛓️',
      MEGA_REMOTE: '💥📡',
      GHOST_BOMB: '👻💣',
      TOTAL_VAMPIRISM: '🦇🩸',
      LETHAL_SPEED: '🏃💨',
      MASTER_REFLECTOR: '🔄⛓️',
    };
    return icons[synergy] ?? '✨';
  }

  private donorEffect = effect(() => {
    const isDonor = this.authService.isDonor();
    if (isDonor && this.gamePhase() !== GamePhase.Playing) {
      this.canPlay.set(true);
      this.waitTimer.set(0);
    }
  });

  toggleSkillTree(): void {
    if (this.gamePhase() !== GamePhase.Playing) return;
    this.showSkillTree.update(v => !v);
    if (this.showSkillTree()) {
      this.skillTree.load().catch(console.error);
    }
  }

  closeSkillTree(): void {
    this.showSkillTree.set(false);
  }
}
