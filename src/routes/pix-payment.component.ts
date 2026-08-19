import { Component, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { PaymentService, PixChargeResponse } from './payment.service';
import { SocketService } from './socket.service';

@Component({
  selector: 'app-pix-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pix-payment.component.html',
  styleUrls: ['./pix-payment.component.scss']
})
export class PixPaymentComponent implements OnInit, OnDestroy {
  // Em um app real, estes dados viriam de um formulário ou serviço de usuário
  paymentData = {
    amount: 10, // Exemplo: R$0,10 (valor em centavos)
    customerName: 'Comprador Anônimo',
    customerEmail: 'comprador.' + Date.now() + '@example.com', // Email único para o socket
    identification: '12345678900' // CPF/CNPJ
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
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.socketService.joinRoom(this.paymentData.customerEmail);

      this.socketSub = this.socketService.listen('payment_approved').subscribe((data) => {
        console.log('✅ Pagamento aprovado recebido via socket!', data);
        if (data.isDonor) {
          this.paymentApproved = true;
          this.pixCharge = null;
          // Lógica para desbloquear o jogo aqui!
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