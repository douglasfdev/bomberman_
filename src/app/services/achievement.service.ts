import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { Achievement, UnlockResult } from '../core/models/achievement.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** Lista completa de achievements (carregada uma vez por sessão) */
  readonly achievements = signal<Achievement[]>([]);

  /** Emite cada achievement que acabou de ser desbloqueado (para toast) */
  readonly newUnlock$ = new Subject<Achievement>();

  /** Keys já desbloqueadas nesta sessão (evita chamadas duplicadas à API) */
  private readonly unlockedKeys = new Set<string>();

  /** Flag para evitar reload redundante */
  private loaded = false;

  /** Carrega a lista completa de achievements do backend */
  loadAchievements(): void {
    if (this.loaded) return;
    this.loaded = true;

    this.http.get<Achievement[]>('/api/achievements').subscribe({
      next: (data) => {
        this.achievements.set(data);
        // Preenche o cache local com os já desbloqueados
        data.filter((a) => a.unlocked).forEach((a) => this.unlockedKeys.add(a.key));
      },
      error: (err) => console.warn('Não foi possível carregar achievements:', err),
    });
  }

  /**
   * Tenta desbloquear um achievement pelo seu key.
   * Se o usuário não estiver logado ou o achievement já estiver desbloqueado, não faz nada.
   * Se for um novo desbloqueio, emite via `newUnlock$` para exibir o toast.
   */
  unlock(key: string): void {
    // Ignora se não estiver logado
    if (!this.auth.userId()) return;

    // Ignora se já foi desbloqueado nesta sessão
    if (this.unlockedKeys.has(key)) return;

    // Marca imediatamente para não enviar duas vezes em eventos rápidos
    this.unlockedKeys.add(key);

    this.http.post<UnlockResult>('/api/achievements/unlock', { key }).subscribe({
      next: (result) => {
        if (result.success && !result.alreadyUnlocked) {
          // Atualiza a lista local
          this.achievements.update((list) =>
            list.map((a) =>
              a.key === key
                ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() }
                : a
            )
          );

          // Emite para o toast de notificação
          const achievement = this.achievements().find((a) => a.key === key);
          if (achievement) {
            this.newUnlock$.next(achievement);
          }
        }
      },
      error: (err) => {
        // Remove do cache para permitir retry em caso de erro de rede
        this.unlockedKeys.delete(key);
        console.warn('Erro ao desbloquear achievement:', key, err);
      },
    });
  }
}
