import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// Definindo a interface do usuário para tipagem forte
export interface User {
  id: string;
  email: string;
  name: string;
  isDonor?: boolean;
  googleId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isDonor = signal(false);
  readonly userEmail = signal<string | null>(null);

  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    // Só faz a requisição se estiver rodando no navegador do cliente
    if (isPlatformBrowser(this.platformId)) {
      this.checkSession();
    }
  }

  public checkSession(): void {
    this.http.get<{ email: string; isDonor: boolean }>('/api/user').subscribe({
      next: (user) => {
        if (user && user.email) {
          this.userEmail.set(user.email);
          this.isDonor.set(user.isDonor);
        }
      },
      error: (err) => {
        console.warn('Sessão não encontrada ou usuário não logado.', err);
      }
    });
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
      this.userSubject.next(null);
      this.isLoggedInSubject.next(false);
      window.location.href = '/api/auth/logout';
    }
  }
}