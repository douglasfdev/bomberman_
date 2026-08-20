import { prismaClient } from '../services/prisma';
import { SkinTier } from 'src/generated/prisma/enums';

// Definição de tipos para o catálogo de skins
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

// Catálogo completo — fonte única de verdade para as skins disponíveis
const SKIN_CATALOG: SkinCatalogItem[] = [
  { id: 'skin-a', name: 'Aventureiro', model: 'character-a', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-a.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-a.glb', requiredTier: 'BASIC' },
  { id: 'skin-b', name: 'Explorador', model: 'character-b', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-b.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-b.glb', requiredTier: 'BASIC' },
  { id: 'skin-c', name: 'Guerreiro', model: 'character-c', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-c.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-c.glb', requiredTier: 'BASIC' },
  { id: 'skin-d', name: 'Clássico', model: 'character-d', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-d.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-d.glb', requiredTier: 'FREE' },
  { id: 'skin-e', name: 'Engenheiro', model: 'character-e', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-e.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-e.glb', requiredTier: 'BASIC' },
  { id: 'skin-f', name: 'Cientista', model: 'character-f', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-f.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-f.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-g', name: 'Guardião', model: 'character-g', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-g.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-g.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-h', name: 'Cavaleiro', model: 'character-h', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-h.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-h.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-i', name: 'Ninja', model: 'character-i', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-i.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-i.glb', requiredTier: 'BASIC' },
  { id: 'skin-j', name: 'Pirata', model: 'character-j', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-j.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-j.glb', requiredTier: 'BASIC' },
  { id: 'skin-k', name: 'Robô', model: 'character-k', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-k.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-k.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-l', name: 'Mago', model: 'character-l', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-l.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-l.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-m', name: 'Samurai', model: 'character-m', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-m.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-m.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-n', name: 'Viking', model: 'character-n', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-n.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-n.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-o', name: 'Fantasma', model: 'character-o', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-o.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-o.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-p', name: 'Dragão', model: 'character-p', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-p.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-p.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-q', name: 'Alienígena', model: 'character-q', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-q.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-q.glb', requiredTier: 'PREMIUM' },
  { id: 'skin-r', name: 'Demônio', model: 'character-r', previewImage: '/assets/kenney_blocky-characters_20/Previews/character-r.png', glbPath: '/assets/kenney_blocky-characters_20/Models/GLB/character-r.glb', requiredTier: 'PREMIUM' },
];

// Hierarquia de tiers para comparação
const TIER_HIERARCHY: Record<string, number> = { FREE: 0, BASIC: 1, PREMIUM: 2 };

// Preços em centavos
const TIER_PRICES: Record<string, number> = { BASIC: 299, PREMIUM: 599 };

export class SkinService {
  private prisma: typeof prismaClient;

  constructor() {
    this.prisma = prismaClient;
  }

  /**
   * Retorna o catálogo completo de skins com informações de tier.
   */
  getCatalog(): SkinCatalog {
    return {
      skins: SKIN_CATALOG,
      tiers: {
        BASIC: { price: TIER_PRICES['BASIC']!, label: 'Básico', skinCount: this.getSkinsForTier('BASIC').length },
        PREMIUM: { price: TIER_PRICES['PREMIUM']!, label: 'Premium', skinCount: SKIN_CATALOG.length },
      },
    };
  }

  /**
   * Retorna as skins desbloqueadas do usuário e a skin selecionada.
   */
  async getUnlockedSkins(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { skinTier: true, selectedSkin: true },
    });

    if (!user) {
      return { currentTier: 'FREE' as SkinTierType, selectedSkin: 'character-d', unlockedSkins: ['character-d'] };
    }

    const tierStr = user.skinTier as SkinTierType;
    const unlockedModels = this.getSkinsForTier(tierStr);

    return {
      currentTier: tierStr,
      selectedSkin: user.selectedSkin,
      unlockedSkins: unlockedModels,
    };
  }

  /**
   * Valida e seleciona uma skin para o usuário.
   */
  async selectSkin(userId: string, skinId: string) {
    // Buscar a skin no catálogo pelo model ID
    const skin = SKIN_CATALOG.find((s) => s.model === skinId);
    if (!skin) {
      return { success: false, error: 'SKIN_NOT_FOUND' };
    }

    // Buscar o tier do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { skinTier: true },
    });

    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    // Verificar se o tier do usuário permite essa skin
    if (!this.canUseSkin(user.skinTier, skinId)) {
      return { success: false, error: 'SKIN_LOCKED', requiredTier: skin.requiredTier };
    }

    // Atualizar a skin selecionada
    await this.prisma.user.update({
      where: { id: userId },
      data: { selectedSkin: skinId },
    });

    return { success: true, selectedSkin: skinId };
  }

  /**
   * Processa o upgrade de tier após o pagamento ser confirmado.
   */
  async upgradeTier(userId: string, tier: 'BASIC' | 'PREMIUM', paymentId: string, amount: number) {
    const prismaTier = tier === 'BASIC' ? SkinTier.BASIC : SkinTier.PREMIUM;

    // Criar registro de compra e atualizar o tier do usuário em uma transação
    await this.prisma.$transaction([
      this.prisma.skinPurchase.create({
        data: {
          userId,
          tier: prismaTier,
          amountPaid: amount,
          paymentId,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          skinTier: prismaTier,
          isDonor: true,
        },
      }),
    ]);
  }

  /**
   * Verifica se um tier tem acesso a uma determinada skin.
   */
  canUseSkin(userTier: string, skinModelId: string): boolean {
    const skin = SKIN_CATALOG.find((s) => s.model === skinModelId);
    if (!skin) return false;

    const userLevel = TIER_HIERARCHY[userTier] ?? 0;
    const requiredLevel = TIER_HIERARCHY[skin.requiredTier] ?? 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Retorna os model IDs desbloqueados para um determinado tier.
   */
  getSkinsForTier(tier: string): string[] {
    const userLevel = TIER_HIERARCHY[tier] ?? 0;
    return SKIN_CATALOG
      .filter((s) => (TIER_HIERARCHY[s.requiredTier] ?? 0) <= userLevel)
      .map((s) => s.model);
  }

  /**
   * Retorna o preço de um tier em centavos.
   */
  getTierPrice(tier: string): number | undefined {
    return TIER_PRICES[tier];
  }
}
