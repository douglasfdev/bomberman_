// src/app/services/auth.service.ts
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    // Apenas busca o usuário se estiver no navegador
    if (this.isBrowser) {
      this.fetchUser().subscribe();
    }
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
    // Apenas faz logout se estiver no navegador
    if (this.isBrowser) {
      // Limpa o estado localmente e redireciona para a rota de logout do backend
      this.userSubject.next(null);
      this.isLoggedInSubject.next(false);
      window.location.href = '/api/auth/logout';
    }
  }
}