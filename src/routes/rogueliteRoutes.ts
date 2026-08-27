import { Router } from 'express';
import { prismaClient } from '../services/prisma';
import { requireAuth } from '../middlewares/requireAuth';
import { generateSeed } from '../utils/seedrandom.util';

const router = Router();

router.post('/runs', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const seed = generateSeed();
    const run = await prismaClient.run.create({
      data: {
        userId,
        seed,
        timeLeftMs: 30000,
      },
      include: {
        choices: true,
        upgrades: true,
      },
    });
    res.status(201).json(run);
  } catch (e) {
    console.error('Erro ao criar run:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/runs/:id', requireAuth, async (req: any, res: any) => {
  try {
    const run = await prismaClient.run.findUnique({
      where: { id: req.params.id },
      include: {
        choices: true,
        upgrades: true,
      },
    });
    if (!run || run.userId !== req.user.id) {
      return res.status(404).json({ error: 'Run não encontrada' });
    }
    res.json(run);
  } catch (e) {
    console.error('Erro ao buscar run:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/runs/:id/choice', requireAuth, async (req: any, res: any) => {
  try {
    const run = await prismaClient.run.findUnique({
      where: { id: req.params.id },
    });
    if (!run || run.userId !== req.user.id) {
      return res.status(404).json({ error: 'Run não encontrada' });
    }

    const { phase, offered, picked } = req.body;
    if (!phase || !offered || !picked) {
      return res.status(400).json({ error: 'Campos obrigatórios: phase, offered, picked' });
    }
    if (!offered.includes(picked)) {
      return res.status(400).json({ error: 'Carta escolhida não estava nas oferecidas' });
    }

    const choice = await prismaClient.runChoice.create({
      data: {
        runId: run.id,
        phase,
        offered,
        picked,
      },
    });

    const upgrade = await prismaClient.runUpgrade.upsert({
      where: { runId_cardKey: { runId: run.id, cardKey: picked } },
      create: { runId: run.id, cardKey: picked, stacks: 1 },
      update: { stacks: { increment: 1 } },
    });

    res.json({ choice, upgrade });
  } catch (e) {
    console.error('Erro ao registrar escolha:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/runs/:id/end', requireAuth, async (req: any, res: any) => {
  try {
    const run = await prismaClient.run.findUnique({
      where: { id: req.params.id },
    });
    if (!run || run.userId !== req.user.id) {
      return res.status(404).json({ error: 'Run não encontrada' });
    }

    const { score, timeLeftMs, reason } = req.body;
    const ended = await prismaClient.run.update({
      where: { id: run.id },
      data: {
        score: score ?? run.score,
        timeLeftMs: timeLeftMs ?? run.timeLeftMs,
        endedAt: new Date(),
        endedReason: reason,
      },
      include: {
        choices: true,
        upgrades: true,
      },
    });
    res.json(ended);
  } catch (e) {
    console.error('Erro ao finalizar run:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/runs/history/list', requireAuth, async (req: any, res: any) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);
    const runs = await prismaClient.run.findMany({
      where: { userId: req.user.id },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        choices: true,
        upgrades: true,
      },
    });
    res.json(runs);
  } catch (e) {
    console.error('Erro ao buscar histórico:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/cards/pool', async (_req: any, res: any) => {
  try {
    const cards = await prismaClient.card.findMany({
      orderBy: { key: 'asc' },
    });
    res.json(cards);
  } catch (e) {
    console.error('Erro ao buscar pool de cartas:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/enemies/archetypes', async (_req: any, res: any) => {
  try {
    const archetypes = await prismaClient.enemyArchetype.findMany({
      orderBy: { minPhase: 'asc' },
    });
    res.json(archetypes);
  } catch (e) {
    console.error('Erro ao buscar arquétipos:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;