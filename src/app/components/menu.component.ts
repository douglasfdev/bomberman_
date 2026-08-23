// src/app/components/menu.component.ts
import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { AuthService, User } from '../services/auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [AsyncPipe, NgIf],
  template: `
    <div class="menu-container">
      <div *ngIf="isLoggedIn$ | async; else showLogin">
        <p>Bem-vindo, {{ (user$ | async)?.name }}!</p>
        <a [href]="buyMeACoffeeUrl$ | async" target="_blank" rel="noopener noreferrer" class="donate-button">
          Me pague um café ☕
        </a>
        <button (click)="logout()" class="auth-button">Logout</button>
      </div>
      <ng-template #showLogin>
        <div>
          <p>Faça login para apoiar o desenvolvimento!</p>
          <a href="/auth/google" class="auth-button">Login com Google</a>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .menu-container { text-align: center; margin-top: 50px; }
    .auth-button, .donate-button {
      display: inline-block;
      padding: 10px 20px;
      margin: 10px;
      border-radius: 5px;
      text-decoration: none;
      color: white;
      background-color: #007bff;
      cursor: pointer;
    }
    .donate-button {
      background-color: #ffdd00;
      color: #333;
    }
  `]
})
export class MenuComponent {
  isLoggedIn$: Observable<boolean>;
  user$: Observable<User | null>;
  buyMeACoffeeUrl$: Observable<string>;

  constructor(private authService: AuthService) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.user$ = this.authService.user$;

    // Constrói a URL de doação dinamicamente
    this.buyMeACoffeeUrl$ = this.user$.pipe(
      map(user => {
        const baseUrl = 'https://www.buymeacoffee.com/SEU_USUARIO';
        return user ? `${baseUrl}?email=${encodeURIComponent(user.email)}` : baseUrl;
      })
    );
  }

  logout() {
    this.authService.logout();
  }
}