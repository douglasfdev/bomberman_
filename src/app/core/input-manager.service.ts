import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Direction } from './models/direction.model';

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: Direction.Up,
  ArrowDown: Direction.Down,
  ArrowLeft: Direction.Left,
  ArrowRight: Direction.Right,
  KeyW: Direction.Up,
  KeyS: Direction.Down,
  KeyA: Direction.Left,
  KeyD: Direction.Right,
};

@Injectable({ providedIn: 'root' })
export class InputManagerService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly directionSubject = new BehaviorSubject<Direction | null>(null);
  private readonly actionSubject = new Subject<void>();
  readonly direction$: Observable<Direction | null> = this.directionSubject.asObservable();
  readonly action$: Observable<void> = this.actionSubject.asObservable();

  private readonly pressedKeys: Direction[] = [];
  private attached = false;

  attach(): void {
    if (this.attached || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.attached = false;
    this.pressedKeys.length = 0;
    this.directionSubject.next(null);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  isTouchDevice(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
  }

  setDirection(direction: Direction | null): void {
    this.pressedKeys.length = 0;
    if (direction) {
      this.pressedKeys.push(direction);
    }
    this.directionSubject.next(direction);
  }

  pressAction(): void {
    this.actionSubject.next();
  }

  getDirection(): Direction | null {
    return this.directionSubject.value;
  }

  isKeyPressed(code: string): boolean {
    // Check if the key code corresponds to a currently pressed direction
    const direction = KEY_DIRECTIONS[code];
    if (direction) {
      return this.pressedKeys.includes(direction);
    }
    return false;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const direction = KEY_DIRECTIONS[event.code];
    if (direction) {
      event.preventDefault();
      if (!this.pressedKeys.includes(direction)) {
        this.pressedKeys.push(direction);
      }
      this.directionSubject.next(direction);
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      this.actionSubject.next();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const direction = KEY_DIRECTIONS[event.code];
    if (!direction) {
      return;
    }
    const index = this.pressedKeys.indexOf(direction);
    if (index >= 0) {
      this.pressedKeys.splice(index, 1);
    }
    this.directionSubject.next(this.pressedKeys.at(-1) ?? null);
  };
}