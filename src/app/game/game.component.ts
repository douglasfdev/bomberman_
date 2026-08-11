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

  private cameraOrbitRadius = 22;
  private cameraAzimuth = 0;
  private cameraElevation = 1.1;
  private isDragging = false;
  private previousPointerPosition = { x: 0, y: 0 };

  private updateCameraPosition(): void {
    const cam = this.engine.camera;
    const x = this.cameraOrbitRadius * Math.sin(this.cameraAzimuth) * Math.cos(this.cameraElevation);
    const z = this.cameraOrbitRadius * Math.cos(this.cameraAzimuth) * Math.cos(this.cameraElevation);
    const y = this.cameraOrbitRadius * Math.sin(this.cameraElevation);
    cam.position.set(x, y, z);
    cam.lookAt(0, 0, 0);
  }

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
    this.updateCameraPosition();

    this.engine.startLoop((deltaMs) => {
      this.logic.tick(deltaMs);
      this.sceneBuilder.sync(this.logic, deltaMs);
    });

    const canvas = this.canvas.nativeElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);

    this.input.attach();
    this.subscriptions.push(this.input.action$.subscribe(() => this.logic.plantBomb()));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.input.detach();
    this.engine.stopLoop();

    const canvas = this.canvas.nativeElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerUp);

    if (this.initialized) {
      this.engine.dispose();
      this.sceneBuilder.dispose();
    }
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.isDragging = true;
    this.previousPointerPosition = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousPointerPosition.x;
    const deltaY = event.clientY - this.previousPointerPosition.y;

    this.cameraAzimuth -= deltaX * 0.005;
    this.cameraElevation += deltaY * 0.005;

    this.cameraElevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.cameraElevation));

    this.updateCameraPosition();

    this.previousPointerPosition = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = () => {
    this.isDragging = false;
  };

  onDirection(direction: Direction | null): void {
    this.input.setDirection(direction);
  }

  onAction(): void {
    this.input.pressAction();
  }

  restart(): void {
    this.logic.restart();
    this.requestFullscreen();
  }

  play(): void {
    this.logic.play();
    this.requestFullscreen();
  }

  private requestFullscreen(): void {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => { });
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }
}