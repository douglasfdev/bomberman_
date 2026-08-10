import { TestBed } from '@angular/core/testing';
import { Direction } from './models/direction.model';
import { InputManagerService } from './input-manager.service';

describe('InputManagerService', () => {
  let service: InputManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InputManagerService);
  });

  afterEach(() => {
    service.detach();
  });

  it('mapeia WASD para direções', () => {
    service.attach();
    const received: Array<Direction | null> = [];
    const sub = service.direction$.subscribe((d) => received.push(d));

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(received.at(-1)).toBe(Direction.Up);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    expect(received.at(-1)).toBe(Direction.Right);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
    expect(received.at(-1)).toBe(Direction.Up);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(received.at(-1)).toBeNull();

    sub.unsubscribe();
  });

  it('mapeia setas para direções', () => {
    service.attach();
    let last: Direction | null = null;
    const sub = service.direction$.subscribe((d) => (last = d));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    expect(last).toBe(Direction.Left);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
    expect(last).toBeNull();
    sub.unsubscribe();
  });

  it('espaço dispara a ação', () => {
    service.attach();
    let count = 0;
    const sub = service.action$.subscribe(() => count++);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(count).toBe(1);
    sub.unsubscribe();
  });

  it('expõe direção e ação via API touch', () => {
    const received: Array<Direction | null> = [];
    const sub = service.direction$.subscribe((d) => received.push(d));
    service.setDirection(Direction.Right);
    expect(received.at(-1)).toBe(Direction.Right);
    service.setDirection(null);
    expect(received.at(-1)).toBeNull();
    sub.unsubscribe();
  });
});
