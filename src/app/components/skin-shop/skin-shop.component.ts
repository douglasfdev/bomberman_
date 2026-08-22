import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SkinService, SkinCatalogItem, SkinTierType } from '../../services/skin.service';
import { AuthService } from '../../services/auth.service';
import { SkinPurchaseModalComponent } from '../skin-purchase-modal/skin-purchase-modal.component';

@Component({
  selector: 'app-skin-shop',
  templateUrl: './skin-shop.component.html',
  styleUrls: ['./skin-shop.component.scss'],
  standalone: true,
  imports: [CommonModule, SkinPurchaseModalComponent],
})
export class SkinShopComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly skinService = inject(SkinService);
  readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  // Modal de compra
  showPurchaseModal = signal(false);
  purchaseModalTier = signal<SkinTierType>('BASIC');

  // Feedback de seleção
  selectingId = signal<string | null>(null);
  selectError = signal<string | null>(null);

  // Tier atual do usuário
  readonly currentTier = computed(() => this.skinService.currentTier());
  readonly selectedSkin = computed(() => this.skinService.selectedSkin());
  readonly catalog = computed(() => this.skinService.catalog());
  readonly loading = computed(() => this.skinService.loading());

  // Tier info computada
  readonly tierInfo = computed(() => {
    const tiers = this.skinService.tiers();
    return {
      BASIC: tiers['BASIC'] ?? { price: 299, label: 'Básico', skinCount: 6 },
      PREMIUM: tiers['PREMIUM'] ?? { price: 599, label: 'Premium', skinCount: 18 },
    };
  });

  // Verifica se o usuário está logado
  readonly isLoggedIn = computed(() => !!this.authService.userEmail());

  private subs: Subscription[] = [];

  // Escuta upgrade de tier via socket para recarregar skins
  private tierEffect = effect(() => {
    const tier = this.authService.skinTier();
    if (tier !== 'FREE') {
      this.skinService.upgradeTierLocally(tier);
    }
  });

  constructor() {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Carrega catálogo (público)
    this.subs.push(
      this.skinService.loadCatalog().subscribe()
    );

    // Carrega skins do usuário se estiver logado
    if (this.isLoggedIn()) {
      this.subs.push(
        this.skinService.loadMySkins().subscribe()
      );
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.tierEffect.destroy();
  }

  /** Navega de volta para o jogo */
  goBack(): void {
    this.router.navigate(['/']);
  }

  /** Trata clique em uma skin */
  onSkinClick(skin: SkinCatalogItem): void {
    if (!this.isLoggedIn()) {
      window.location.href = '/api/auth/google';
      return;
    }

    if (this.skinService.isSkinUnlocked(skin.model)) {
      this.selectSkin(skin.model);
    } else {
      // Abre modal de compra do tier necessário
      this.purchaseModalTier.set(skin.requiredTier as SkinTierType);
      this.showPurchaseModal.set(true);
    }
  }

  /** Seleciona uma skin desbloqueada */
  private selectSkin(skinModel: string): void {
    if (this.selectingId() === skinModel) return;
    this.selectingId.set(skinModel);
    this.selectError.set(null);

    this.skinService.selectSkin(skinModel).subscribe({
      next: (result) => {
        this.selectingId.set(null);
        if (!result.success) {
          this.selectError.set(result.error ?? 'Erro ao selecionar skin');
        } else {
          this.authService.updateSelectedSkin(skinModel);
        }
      },
      error: () => {
        this.selectingId.set(null);
        this.selectError.set('Erro de conexão ao selecionar skin');
      },
    });
  }

  /** Abre modal de compra de tier específico */
  openPurchaseModal(tier: SkinTierType, event: Event): void {
    event.stopPropagation();
    if (!this.isLoggedIn()) {
      window.location.href = '/api/auth/google';
      return;
    }
    this.purchaseModalTier.set(tier);
    this.showPurchaseModal.set(true);
  }

  /** Fecha o modal de compra */
  onModalClose(): void {
    this.showPurchaseModal.set(false);
  }

  /** Chamado quando o modal confirma upgrade de tier */
  onTierUpgraded(tier: SkinTierType): void {
    this.showPurchaseModal.set(false);
    this.skinService.upgradeTierLocally(tier);
  }

  /** Retorna label do tier */
  getTierLabel(tier: SkinTierType): string {
    const labels: Record<SkinTierType, string> = { FREE: '🆓 Free', BASIC: '🟡 Básico', PREMIUM: '🟢 Premium' };
    return labels[tier] ?? tier;
  }

  /** Retorna badge do tier necessário para a skin */
  getSkinBadge(skin: SkinCatalogItem): string {
    if (skin.requiredTier === 'FREE') return '🆓';
    if (skin.requiredTier === 'BASIC') return '🟡';
    return '🟢';
  }

  /** Verifica se o usuário já possui ou superou um determinado tier */
  hasTier(tier: SkinTierType): boolean {
    const hierarchy: Record<string, number> = { FREE: 0, BASIC: 1, PREMIUM: 2 };
    return (hierarchy[this.currentTier()] ?? 0) >= (hierarchy[tier] ?? 0);
  }

  /** Formata preço em centavos para reais */
  formatPrice(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /** Retorna o nome da skin pelo model ID */
  getSkinName(modelId: string): string {
    const skin = this.catalog().find((s) => s.model === modelId);
    return skin?.name ?? modelId;
  }
}
