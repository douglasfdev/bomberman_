import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export type SkinTier = 'FREE' | 'BASIC' | 'PREMIUM';

// Definindo a interface do usuário para tipagem forte
export interface User {
  id: string;
  email: string;
  name: string;
  isDonor?: boolean;
  googleId?: string;
  skinTier?: SkinTier;
  selectedSkin?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isDonor = signal(false);
  readonly userEmail = signal<string | null>(null);
  readonly userId = signal<string | null>(null);
  readonly skinTier = signal<SkinTier>('FREE');
  readonly selectedSkin = signal<string>('character-d');

  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  // Socket.io client — inicializado só no browser
  private socket: any = null;

  constructor() {
    // Só faz a requisição se estiver rodando no navegador do cliente
    if (isPlatformBrowser(this.platformId)) {
      this.checkSession();
    }
  }

  public checkSession(): void {
    this.http.get<User>('/api/user').subscribe({
      next: (user) => {
        if (user && user.email) {
          this.userEmail.set(user.email);
          this.userId.set(user.id);
          this.isDonor.set(!!user.isDonor);
          this.skinTier.set(user.skinTier ?? 'FREE');
          this.selectedSkin.set(user.selectedSkin ?? 'character-d');
          this.userSubject.next(user);
          this.isLoggedInSubject.next(true);

          // Entra na sala Socket.io com o ID do usuário e inicia listeners
          this.setupSocketListeners(user.id);
        }
      },
      error: (err) => {
        console.warn('Sessão não encontrada ou usuário não logado.', err);
      },
    });
  }

  private setupSocketListeners(userId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Importação dinâmica para não quebrar o SSR
    import('socket.io-client').then(({ io }) => {
      this.socket = io({ transports: ['websocket', 'polling'] });

      // Entra na sala baseada no ID do usuário (usado pelo webhook)
      this.socket.emit('join_room', userId);

      // Também entra na sala baseada no email (compatibilidade com sistema legado)
      const email = this.userEmail();
      if (email) {
        this.socket.emit('join_room', email);
      }

      // Listener para upgrade de tier de skin (disparado pelo webhook após pagamento)
      this.socket.on('skin_tier_upgraded', (data: { tier: SkinTier; isDonor: boolean }) => {
        console.log('🎭 Skin tier upgraded:', data);
        this.skinTier.set(data.tier);
        if (data.isDonor) {
          this.isDonor.set(true);
        }
      });

      // Listener legado para aprovação de pagamento genérico
      this.socket.on('payment_approved', (data: { isDonor: boolean }) => {
        if (data.isDonor) {
          this.isDonor.set(true);
        }
      });
    });
  }

  /** Atualiza a skin selecionada localmente (após selecionar no shop) */
  updateSelectedSkin(skin: string): void {
    this.selectedSkin.set(skin);
  }

  fetchUser(): Observable<User | null> {
    return this.http.get<User | null>('/api/user').pipe(
      tap((user) => {
        this.userSubject.next(user);
        this.isLoggedInSubject.next(!!user);
      })
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      this.socket?.disconnect();
      this.socket = null;
      this.userSubject.next(null);
      this.isLoggedInSubject.next(false);
      window.location.href = '/api/auth/logout';
    }
  }
}
