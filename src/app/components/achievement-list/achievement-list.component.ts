import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AchievementService } from '../../services/achievement.service';

@Component({
  selector: 'app-achievement-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="achievements-page">
      <header class="achievements-header">
        <a routerLink="/" class="back-btn" aria-label="Voltar ao jogo">← Voltar</a>
        <h1 class="page-title">🏆 Achievements</h1>
        <span class="progress-badge">
          {{ unlockedCount }}/{{ totalCount }} desbloqueados
        </span>
      </header>

      <!-- Progress bar -->
      <div class="progress-bar-container" role="progressbar"
           [attr.aria-valuenow]="unlockedCount"
           [attr.aria-valuemax]="totalCount"
           [attr.aria-label]="unlockedCount + ' de ' + totalCount + ' achievements desbloqueados'">
        <div class="progress-bar" [style.width.%]="progressPercent"></div>
      </div>

      <!-- Loading state -->
      @if (achievements().length === 0) {
        <div class="loading-state">
          <span class="loading-spinner">⏳</span>
          <p>Carregando achievements...</p>
        </div>
      }

      <!-- Achievement grid -->
      @if (achievements().length > 0) {
        <div class="achievements-grid">
          @for (a of achievements(); track a.id) {
            <div
              class="achievement-card"
              [class.unlocked]="a.unlocked"
              [class.locked]="!a.unlocked"
              [attr.aria-label]="a.title + (a.unlocked ? ' - Desbloqueado' : ' - Bloqueado')"
            >
              <div class="achievement-icon" [class.locked-icon]="!a.unlocked">
                {{ a.unlocked ? a.icon : '🔒' }}
              </div>
              <div class="achievement-info">
                <h3 class="achievement-title">{{ a.unlocked ? a.title : '???' }}</h3>
                <p class="achievement-desc">{{ a.unlocked ? a.description : 'Continue jogando para desbloquear!' }}</p>
                @if (a.unlocked && a.unlockedAt) {
                  <p class="achievement-date">
                    Desbloqueado em {{ a.unlockedAt | date:'dd/MM/yyyy' }}
                  </p>
                }
              </div>
              @if (a.unlocked) {
                <div class="unlocked-badge" aria-hidden="true">✓</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .achievements-page {
      min-height: 100vh;
      background: #0f1420;
      color: #fff;
      padding: 0 16px 40px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .achievements-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
      flex-wrap: wrap;
    }

    .back-btn {
      color: #f0a500;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 6px 12px;
      border: 1px solid #f0a500;
      border-radius: 6px;
      transition: background 0.2s;
    }
    .back-btn:hover { background: rgba(240, 165, 0, 0.15); }

    .page-title {
      font-size: 1.6rem;
      font-weight: 800;
      flex: 1;
      text-align: center;
    }

    .progress-badge {
      font-size: 0.8rem;
      background: rgba(240, 165, 0, 0.2);
      border: 1px solid #f0a500;
      color: #f0a500;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 700;
      white-space: nowrap;
    }

    .progress-bar-container {
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #f0a500, #ff6b00);
      border-radius: 4px;
      transition: width 0.6s ease;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 60px 20px;
      color: #888;
    }
    .loading-spinner { font-size: 2rem; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .achievements-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }

    .achievement-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px;
      border-radius: 12px;
      position: relative;
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .achievement-card:hover {
      transform: translateY(-2px);
    }

    .achievement-card.unlocked {
      background: linear-gradient(135deg, #1a2744 0%, #1e2d50 100%);
      border: 2px solid #f0a500;
      box-shadow: 0 2px 12px rgba(240, 165, 0, 0.2);
    }

    .achievement-card.locked {
      background: rgba(255,255,255,0.04);
      border: 2px solid rgba(255,255,255,0.1);
    }

    .achievement-icon {
      font-size: 2.2rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .locked-icon {
      filter: grayscale(1);
      opacity: 0.4;
    }

    .achievement-info {
      flex: 1;
      min-width: 0;
    }

    .achievement-title {
      font-size: 0.95rem;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .achievement-card.locked .achievement-title { color: #666; }

    .achievement-desc {
      font-size: 0.78rem;
      color: #bbb;
      line-height: 1.4;
    }
    .achievement-card.locked .achievement-desc { color: #555; }

    .achievement-date {
      margin-top: 6px;
      font-size: 0.68rem;
      color: #f0a500;
      opacity: 0.8;
    }

    .unlocked-badge {
      position: absolute;
      top: 10px;
      right: 12px;
      width: 20px;
      height: 20px;
      background: #f0a500;
      color: #000;
      border-radius: 50%;
      font-size: 0.7rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media (max-width: 480px) {
      .achievements-grid {
        grid-template-columns: 1fr;
      }
      .page-title { font-size: 1.2rem; }
    }
  `],
})
export class AchievementListComponent implements OnInit {
  private readonly achievementService = inject(AchievementService);

  readonly achievements = this.achievementService.achievements;

  get unlockedCount(): number {
    return this.achievements().filter((a) => a.unlocked).length;
  }

  get totalCount(): number {
    return this.achievements().length;
  }

  get progressPercent(): number {
    if (this.totalCount === 0) return 0;
    return Math.round((this.unlockedCount / this.totalCount) * 100);
  }

  ngOnInit(): void {
    this.achievementService.loadAchievements();
  }
}
