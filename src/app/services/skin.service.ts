import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type SkinTierType = 'FREE' | 'BASIC' | 'PREMIUM';

export interface SkinCatalogItem {
  id: string;
  name: string;
  model: string;
  previewImage: string;
  glbPath: string;
  requiredTier: SkinTierType;
}

export interface SkinCatalog {
  skins: SkinCatalogItem[];
  tiers: Record<string, { price: number; label: string; skinCount: number }>;
}

export interface MySkinsResponse {
  currentTier: SkinTierType;
  selectedSkin: string;
  unlockedSkins: string[];
}

export interface SelectResult {
  success: boolean;
  selectedSkin?: string;
  error?: string;
  requiredTier?: SkinTierType;
}

export interface PurchaseResult {
  success: boolean;
  correlationId?: string;
  payment?: {
    brCode: string;
    qrCodeImage: string;
    amount: number;
    tier: SkinTierType;
  };
  error?: string;
}

const TIER_HIERARCHY: Record<string, number> = { FREE: 0, BASIC: 1, PREMIUM: 2 };

@Injectable({ providedIn: 'root' })
export class SkinService {
  private readonly http = inject(HttpClient);

  // Signals de estado
  readonly currentTier = signal<SkinTierType>('FREE');
  readonly selectedSkin = signal<string>('character-d');
  readonly unlockedSkins = signal<string[]>(['character-d']);
  readonly catalog = signal<SkinCatalogItem[]>([]);
  readonly tiers = signal<Record<string, { price: number; label: string; skinCount: number }>>({});
  readonly loading = signal(false);

  /** Carrega o catálogo público de skins */
  loadCatalog(): Observable<SkinCatalog> {
    return this.http.get<SkinCatalog>('/api/skins/catalog').pipe(
      tap((data) => {
        this.catalog.set(data.skins);
        this.tiers.set(data.tiers);
      })
    );
  }

  /** Carrega as skins do usuário autenticado */
  loadMySkins(): Observable<MySkinsResponse> {
    this.loading.set(true);
    return this.http.get<MySkinsResponse>('/api/skins/my-skins').pipe(
      tap({
        next: (data) => {
          this.currentTier.set(data.currentTier);
          this.selectedSkin.set(data.selectedSkin);
          this.unlockedSkins.set(data.unlockedSkins);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      })
    );
  }

  /** Seleciona uma skin para o usuário */
  selectSkin(skinId: string): Observable<SelectResult> {
    return this.http.post<SelectResult>('/api/skins/select', { skinId }).pipe(
      tap((result) => {
        if (result.success && result.selectedSkin) {
          this.selectedSkin.set(result.selectedSkin);
        }
      })
    );
  }

  /** Inicia o fluxo de compra de um tier via PIX */
  purchaseTier(tier: SkinTierType): Observable<PurchaseResult> {
    return this.http.post<PurchaseResult>('/api/skins/purchase', { tier });
  }

  /** Verifica se uma skin está desbloqueada para o usuário */
  isSkinUnlocked(skinModelId: string): boolean {
    return this.unlockedSkins().includes(skinModelId);
  }

  /** Retorna o tier necessário para usar uma skin */
  getSkinTierRequirement(skinModelId: string): SkinTierType {
    const skin = this.catalog().find((s) => s.model === skinModelId);
    return skin?.requiredTier ?? 'FREE';
  }

  /** Atualiza o tier local após upgrade (chamado pelo AuthService via socket) */
  upgradeTierLocally(newTier: SkinTierType): void {
    this.currentTier.set(newTier);
    // Recarrega as skins desbloqueadas com o novo tier
    this.loadMySkins().subscribe();
  }

  /** Verifica se o usuário pode usar uma skin baseado no tier atual */
  canUseSkin(skinModelId: string): boolean {
    const requiredTier = this.getSkinTierRequirement(skinModelId);
    const userLevel = TIER_HIERARCHY[this.currentTier()] ?? 0;
    const requiredLevel = TIER_HIERARCHY[requiredTier] ?? 0;
    return userLevel >= requiredLevel;
  }
}
