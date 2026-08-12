import { isPlatformBrowser, CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject, signal, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameLogicService } from '../core/game-logic.service';
import { InputManagerService } from '../core/input-manager.service';
import { SceneBuilderService } from '../render/scene-builder.service';
import { ThreeEngineService } from '../render/three-engine.service';
import { Direction } from '../core/models/direction.model';
import { GamePhase } from '../core/models/game-state.model';
import { AuthService } from '../services/auth.service';
import { AdBannerComponent } from '../components/ad-banner.component';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [CommonModule, AdBannerComponent]
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

  readonly Direction = Direction;
  readonly GamePhase = GamePhase;

  readonly score = this.logic.score;
  readonly enemiesRemaining = this.logic.enemiesRemaining;
  readonly maxBombs = this.logic.maxBombs;
  readonly range = this.logic.range;
  readonly speed = this.logic.speed;
  readonly pierce = this.logic.pierce;
  readonly gamePhase = this.logic.gamePhase;

  isTouch = false;
  initError = signal(false);

  // Controle de Monetização
  canPlay = signal(false);
  waitTimer = signal(0);

  private actionSub?: Subscription;
  private timerInterval: any;

  constructor() {
    effect(() => {
      const phase = this.gamePhase();
      const isDonor = this.authService.isDonor();
      // Rastreia o sinal de email para detectar login/logout e re-executar o efeito
      const isLoggedIn = !!this.authService.userEmail();

      if (phase === GamePhase.Ready || phase === GamePhase.Victory || phase === GamePhase.Defeat) {
        this.enforcePaywall(isDonor, isLoggedIn);
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

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.engine.init(this.container.nativeElement, this.canvas.nativeElement);
      this.sceneBuilder.init(this.engine.scene!);

      this.engine.startLoop((deltaMs: number) => {
        this.logic.tick(deltaMs);
        this.sceneBuilder.sync(this.logic, deltaMs);
      });
    } catch (e) {
      this.initError.set(true);
      console.error('WebGL init error:', e);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      clearInterval(this.timerInterval);
      this.actionSub?.unsubscribe();
      this.input.detach();
      this.sceneBuilder.dispose();
      this.engine.dispose();
    }
  }

  // Atualizado para aceitar e verificar o estado de login
  private enforcePaywall(isDonor: boolean, isLoggedIn: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;

    clearInterval(this.timerInterval);

    // Libera o jogo imediatamente se for doador OU estiver logado
    if (isDonor || isLoggedIn) {
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

  play(): void {
    if (!this.canPlay()) return;
    this.logic.play();
  }

  restart(): void {
    if (!this.canPlay()) return;
    this.logic.restart();
  }
}
