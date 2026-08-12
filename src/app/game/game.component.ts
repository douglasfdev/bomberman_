import { isPlatformBrowser, CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
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
  private actionSub?: Subscription;

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
      this.actionSub?.unsubscribe();
      this.input.detach();
      this.sceneBuilder.dispose();
      this.engine.dispose();
    }
  }

  onDirection(dir: Direction | null): void {
    this.input.setDirection(dir);
  }

  onAction(): void {
    this.logic.plantBomb();
  }

  play(): void {
    this.logic.play();
  }

  restart(): void {
    this.logic.restart();
  }
}