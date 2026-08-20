import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { CreateChargePayload, WooviService } from '../services/wooviService';
import { SkinService } from '../services/skinService';
import { prismaClient } from '../services/prisma';

const router = Router();
const wooviService = new WooviService();
const skinService = new SkinService();
const prisma = prismaClient;

/**
 * GET /api/skins/catalog
 * Retorna o catálogo completo de skins (público, não requer autenticação).
 */
router.get('/catalog', (req: any, res: any) => {
  const catalog = skinService.getCatalog();
  res.json(catalog);
});

/**
 * GET /api/skins/my-skins
 * Retorna as skins desbloqueadas do usuário e a skin selecionada.
 * Requer autenticação.
 */
router.get('/my-skins', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

  try {
    const data = await skinService.getUnlockedSkins(req.user.id);
    res.json(data);
  } catch (error: any) {
    console.error('Erro ao buscar skins do usuário:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/skins/select
 * Seleciona uma skin para o usuário.
 * Requer autenticação.
 * Body: { skinId: string }
 */
router.post('/select', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

  const { skinId } = req.body;
  if (!skinId) return res.status(400).json({ success: false, error: 'skinId é obrigatório' });

  try {
    const result = await skinService.selectSkin(req.user.id, skinId);
    if (!result.success) {
      return res.status(403).json(result);
    }
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao selecionar skin:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * POST /api/skins/purchase
 * Inicia o fluxo de compra de um tier de skins via PIX.
 * Requer autenticação.
 * Body: { tier: "BASIC" | "PREMIUM" }
 */
router.post('/purchase', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

  const { tier } = req.body;
  if (!tier || !['BASIC', 'PREMIUM'].includes(tier)) {
    return res.status(400).json({ success: false, error: 'Tier inválido. Use "BASIC" ou "PREMIUM".' });
  }

  const user = req.user as any;

  // Verificar se o usuário já possui o tier solicitado ou superior
  const currentData = await skinService.getUnlockedSkins(user.id);
  const tierHierarchy: Record<string, number> = { FREE: 0, BASIC: 1, PREMIUM: 2 };
  if ((tierHierarchy[currentData.currentTier] ?? 0) >= (tierHierarchy[tier] ?? 0)) {
    return res.status(400).json({ success: false, error: 'ALREADY_OWNED' });
  }

  const amount = skinService.getTierPrice(tier);
  if (!amount) {
    return res.status(400).json({ success: false, error: 'Preço não encontrado para o tier' });
  }

  try {
    const correlationID = randomUUID();
    const purpose = tier === 'BASIC' ? 'skin_basic' : 'skin_premium';

    // Criar registro de pagamento PENDENTE
    await prisma.payment.create({
      data: {
        correlationId: correlationID,
        value: amount,
        status: 'PENDING',
        purpose,
        userId: user.id,
      },
    });

    // Criar cobrança na Woovi
    const wooviPayload: CreateChargePayload = {
      correlationID,
      value: amount,
      customer: {
        name: user.name || 'Jogador',
        email: user.email,
      },
      type: 'DYNAMIC',
    };

    const charge = await wooviService.createCharge(wooviPayload);

    res.status(201).json({
      success: true,
      correlationId: correlationID,
      payment: {
        brCode: charge.brCode,
        qrCodeImage: charge.qrCodeImage,
        amount,
        tier,
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar pagamento de skin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
