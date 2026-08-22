import { Router } from 'express';
import {
  listAchievementsForUser,
  unlockAchievement,
  getUnlockedAchievements,
  seedAchievements,
} from '../services/achievementService';
import { prismaClient } from '../services/prisma';

const router = Router();

/**
 * GET /api/achievements
 * Lista todos os achievements, indicando quais o usuário autenticado já desbloqueou.
 * Se não estiver autenticado, retorna a lista sem status de desbloqueio.
 */
router.get('/', async (req: any, res: any) => {
  try {
    // Garante que os achievements existam no banco antes de listar
    await seedAchievements();

    if (!req.user) {
      // Usuário não autenticado: retorna lista pública sem status de unlock
      const achievements = await prismaClient.achievement.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return res.json(
        achievements.map((a : any) => ({ ...a, unlocked: false, unlockedAt: null }))
      );
    }

    const data = await listAchievementsForUser(req.user.id);
    res.json(data);
  } catch (error: any) {
    console.error('Erro ao listar achievements:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/achievements/unlocked
 * Retorna apenas os achievements que o usuário já desbloqueou.
 * Requer autenticação.
 */
router.get('/unlocked', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

  try {
    const data = await getUnlockedAchievements(req.user.id);
    res.json(data);
  } catch (error: any) {
    console.error('Erro ao buscar achievements desbloqueados:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/achievements/unlock
 * Desbloqueia um achievement para o usuário autenticado.
 * Requer autenticação.
 * Body: { key: string }
 */
router.post('/unlock', async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

  const { key } = req.body;
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'O campo "key" é obrigatório.' });
  }

  try {
    const result = await unlockAchievement(req.user.id, key);

    if (result.alreadyUnlocked) {
      return res.status(200).json({
        success: true,
        alreadyUnlocked: true,
        achievement: result.achievement,
      });
    }

    return res.status(201).json({
      success: true,
      alreadyUnlocked: false,
      achievement: result.achievement,
    });
  } catch (error: any) {
    if (error.message?.includes('não encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Erro ao desbloquear achievement:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
