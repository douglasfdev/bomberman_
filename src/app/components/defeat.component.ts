// src/app/components/defeat.component.ts
import { Component } from '@angular/core';
import { AdBannerComponent } from './ad-banner.component';

@Component({
  selector: 'app-defeat-screen',
  standalone: true,
  imports: [AdBannerComponent],
  template: `
    <div class="defeat-container">
      <h1>Você foi derrotado!</h1>
      <p>Mais sorte na próxima vez.</p>
      
      <!-- Banner de Anúncio -->
      <app-ad-banner></app-ad-banner>

      <button (click)="restartGame()">Tentar Novamente</button>
    </div>
  `,
  styles: [`
    .defeat-container {
      text-align: center;
      padding: 50px;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 10px;
    }
  `]
})
export class DefeatComponent {
  restartGame() {
    console.log('Reiniciando o jogo...');
    // Aqui você adicionaria a lógica para reiniciar o jogo,
    // por exemplo, usando o Router para navegar para a tela de jogo.
  }
}