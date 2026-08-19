import { Component, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { PaymentService, PixChargeResponse } from './payment.service';
import { SocketService } from './socket.service';
import { AuthService } from '../app/services/auth.service'; // 1. Importar o AuthService

@Component({
  selector: 'app-pix-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pix-payment.component.html',
  styleUrls: ['./pix-payment.component.scss'],
})
export class PixPaymentComponent implements OnInit, OnDestroy {
  // Dados do pagamento, agora preenchidos pelo AuthService
  paymentData = {
    amount: 10, // Valor fixo da doação
    customerName: '',
    customerEmail: '',
    identification: '12345678900', // Manter um CPF genérico ou pedir ao usuário
  };

  pixCharge: PixChargeResponse | null = null;
  qrCodeUrl: SafeUrl | null = null;
  paymentApproved = false;
  isLoading = false;
  error: string | null = null;

  private paymentSub: Subscription | undefined;
  private socketSub: Subscription | undefined;

  constructor(
    private paymentService: PaymentService,
    private socketService: SocketService,
    private authService: AuthService, // 3. Injetar o AuthService
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // 4. Preencher dados do usuário e entrar na sala do socket
      this.authService.user$.subscribe(user => {
        if (user) {
          this.paymentData.customerName = user.name;
          this.paymentData.customerEmail = user.email;
          this.socketService.joinRoom(user.email);
        }
      });

      this.socketSub = this.socketService.listen('payment_approved').subscribe((data) => {
        console.log('✅ Pagamento aprovado recebido via socket!', data);
        if (data.isDonor) {
          this.paymentApproved = true;
          this.pixCharge = null;
          // 5. Atualizar o estado global para refletir o novo status de doador
          this.authService.checkSession();
        }
      });
    }
  }

  generatePix(): void {
    this.isLoading = true;
    this.error = null;
    this.paymentApproved = false;

    this.paymentSub = this.paymentService.generatePixCharge(this.paymentData).subscribe({
      next: (response) => {
        if (response.success) {
          this.pixCharge = response;
          this.qrCodeUrl = this.sanitizer.bypassSecurityTrustUrl(response.chargeData.qrCodeImage);
        } else {
          this.error = response.error || 'Ocorreu um erro ao gerar o PIX.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Falha na comunicação com o servidor. Tente novamente.';
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  public isDonor(): boolean {
    return this.authService.isDonor();
  }


  copyPixCode(): void {
    if (isPlatformBrowser(this.platformId) && this.pixCharge?.chargeData.brCode) {
      navigator.clipboard.writeText(this.pixCharge.chargeData.brCode)
        .then(() => alert('Código PIX copiado!'))
        .catch(err => console.error('Erro ao copiar código PIX:', err));
    }
  }

  ngOnDestroy(): void {
    this.paymentSub?.unsubscribe();
    this.socketSub?.unsubscribe();
  }
}