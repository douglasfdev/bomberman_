import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SkinService, SkinTierType, PurchaseResult } from '../../services/skin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-skin-purchase-modal',
  templateUrl: './skin-purchase-modal.component.html',
  styleUrls: ['./skin-purchase-modal.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class SkinPurchaseModalComponent implements OnInit, OnDestroy {
  @Input() tier: SkinTierType = 'BASIC';
  @Output() closed = new EventEmitter<void>();
  @Output() tierUpgraded = new EventEmitter<SkinTierType>();

  private readonly skinService = inject(SkinService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly loading = signal(false);
  readonly paymentData = signal<PurchaseResult['payment'] | null>(null);
  readonly error = signal<string | null>(null);
  readonly copied = signal(false);
  readonly waitingPayment = signal(false);

  // Timer de expiração (10 minutos)
  readonly timeLeft = signal(600);
  private timerInterval: any = null;
  private subs: Subscription[] = [];

  // Escuta upgrade de tier via socket
  private tierEffect = effect(() => {
    const newTier = this.authService.skinTier();
    const hierarchy: Record<string, number> = { FREE: 0, BASIC: 1, PREMIUM: 2 };

    // Se o tier atual é maior do que o que estamos comprando, houve upgrade
    if (this.waitingPayment() && (hierarchy[newTier] ?? 0) >= (hierarchy[this.tier] ?? 0)) {
      this.tierUpgraded.emit(newTier);
    }
  });

  readonly tierInfo = computed(() => {
    const tiers = this.skinService.tiers();
    const info = tiers[this.tier];
    if (info) return info;
    return this.tier === 'BASIC'
      ? { price: 299, label: 'Básico', skinCount: 6 }
      : { price: 599, label: 'Premium', skinCount: 18 };
  });

  readonly tierEmoji = computed(() => (this.tier === 'BASIC' ? '🟡' : '🟢'));

  ngOnInit(): void {
    this.generateCharge();
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.subs.forEach((s) => s.unsubscribe());
    this.tierEffect.destroy();
  }

  generateCharge(): void {
    this.loading.set(true);
    this.error.set(null);
    this.paymentData.set(null);
    this.clearTimer();

    this.skinService.purchaseTier(this.tier).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.success && result.payment) {
          this.paymentData.set(result.payment);
          this.waitingPayment.set(true);
          this.startTimer();
        } else {
          const msg = result.error === 'ALREADY_OWNED'
            ? 'Você já possui este tier!'
            : result.error ?? 'Erro ao gerar pagamento';
          this.error.set(msg);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Erro de conexão. Tente novamente.');
        console.error('Erro ao gerar charge:', err);
      },
    });
  }

  copyPixCode(): void {
    const code = this.paymentData()?.brCode;
    if (!code || !isPlatformBrowser(this.platformId)) return;

    navigator.clipboard.writeText(code).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    });
  }

  close(): void {
    this.closed.emit();
  }

  private startTimer(): void {
    this.timeLeft.set(600);
    this.timerInterval = setInterval(() => {
      const current = this.timeLeft();
      if (current <= 1) {
        this.clearTimer();
        this.error.set('QR Code expirado. Gere um novo.');
        this.paymentData.set(null);
        this.waitingPayment.set(false);
      } else {
        this.timeLeft.set(current - 1);
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  formatPrice(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
