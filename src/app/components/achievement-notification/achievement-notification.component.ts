import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AchievementService } from '../../services/achievement.service';
import { Achievement } from '../../core/models/achievement.model';

interface ToastItem {
  id: number;
  achievement: Achievement;
  removing: boolean;
}

@Component({
  selector: 'app-achievement-notification',
  standalone: true,
  imports: [],
  template: `
    <div class="toasts-container" aria-live="polite" aria-label="Achievement notifications">
      @for (toast of toasts; track toast.id) {
        <div
          class="achievement-toast"
          [class.removing]="toast.removing"
          role="alert"
        >
          <div class="toast-icon">{{ toast.achievement.icon }}</div>
          <div class="toast-content">
            <div class="toast-label">🏆 Achievement Desbloqueado!</div>
            <div class="toast-title">{{ toast.achievement.title }}</div>
            <div class="toast-desc">{{ toast.achievement.description }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toasts-container {
      position: fixed;
      top: 16px;
      right: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 1000;
      pointer-events: none;
      max-width: 320px;
    }

    .achievement-toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #f0a500;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(240, 165, 0, 0.3), 0 2px 8px rgba(0,0,0,0.6);
      animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      color: #fff;
    }

    .achievement-toast.removing {
      animation: slideOut 0.35s ease-in forwards;
    }

    .toast-icon {
      font-size: 2rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .toast-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .toast-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #f0a500;
      font-weight: 700;
    }

    .toast-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .toast-desc {
      font-size: 0.75rem;
      color: #ccc;
      line-height: 1.3;
    }

    @keyframes slideIn {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }

    @keyframes slideOut {
      from { transform: translateX(0);    opacity: 1; }
      to   { transform: translateX(110%); opacity: 0; }
    }
  `],
})
export class AchievementNotificationComponent implements OnInit, OnDestroy {
  private readonly achievementService = inject(AchievementService);
  private sub?: Subscription;
  private nextId = 0;

  toasts: ToastItem[] = [];

  ngOnInit(): void {
    this.sub = this.achievementService.newUnlock$.subscribe((achievement) => {
      this.show(achievement);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private show(achievement: Achievement): void {
    const id = this.nextId++;
    const toast: ToastItem = { id, achievement, removing: false };
    this.toasts.push(toast);

    // Auto-remove após 4 segundos com animação de saída
    setTimeout(() => {
      toast.removing = true;
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
      }, 350);
    }, 4000);
  }
}
