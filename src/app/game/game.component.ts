import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { GameLogicService } from '../core/game-logic.service';
import { InputManagerService } from '../core/input-manager.service';
import { Direction } from '../core/models/direction.model';
import { GamePhase } from '../core/models/game-state.model';
import { SceneBuilderService } from '../render/scene-builder.service';
import { ThreeEngineService } from '../render/three-engine.service';

@Component({
  selector: 'app-game',
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) private readonly canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gameContainer', { static: true }) private readonly container!: ElementRef<HTMLDivElement>;

  private readonly engine = inject(ThreeEngineService);
  private readonly sceneBuilder = inject(SceneBuilderService);
  private readonly logic = inject(GameLogicService);
  private readonly input = inject(InputManagerService);

  readonly score = this.logic.score;
  readonly enemiesRemaining = this.logic.enemiesRemaining;
  readonly maxBombs = this.logic.maxBombs;
  readonly range = this.logic.range;
  readonly speed = this.logic.speed;
  readonly pierce = this.logic.pierce;
  readonly gamePhase = this.logic.gamePhase;
  readonly exitOpen = this.logic.exitOpen;
  readonly isTouch = this.input.isTouchDevice();
  readonly initError = signal(false);
  readonly Direction = Direction;
  readonly GamePhase = GamePhase;

  private readonly subscriptions: Subscription[] = [];
  private initialized = false;

  ngAfterViewInit(): void {
    try {
      this.engine.init(this.container.nativeElement, this.canvas.nativeElement);
    } catch {
      this.initError.set(true);
      return;
    }
    this.initialized = true;
    this.sceneBuilder.init(this.engine.scene);
    this.logic.start();
    this.engine.startLoop((deltaMs) => {
      this.logic.tick(deltaMs);
      this.sceneBuilder.sync(this.logic, deltaMs);
    });
    this.input.attach();
    this.subscriptions.push(
      this.input.direction$.subscribe((d) => this.logic.move(d)),
      this.input.action$.subscribe(() => this.logic.plantBomb()),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.input.detach();
    this.engine.stopLoop();
    if (this.initialized) {
      this.engine.dispose();
      this.sceneBuilder.dispose();
    }
  }

  onDirection(direction: Direction | null): void {
    this.input.setDirection(direction);
  }

  onAction(): void {
    this.input.pressAction();
  }

  restart(): void {
    this.logic.restart();
  }
}
