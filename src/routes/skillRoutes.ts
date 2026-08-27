import { Router } from 'express';
import { prismaClient } from '../services/prisma';
import { requireAuth } from '../middlewares/requireAuth';

const router = Router();

router.get('/tree', async (_req: any, res: any) => {
  try {
    const nodes = await prismaClient.skillNode.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    });
    res.json(nodes);
  } catch (e) {
    console.error('Erro ao buscar skill tree:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/user', requireAuth, async (req: any, res: any) => {
  try {
    const userSkills = await prismaClient.userSkill.findMany({
      where: { userId: req.user.id },
      include: { skill: true },
    });
    res.json(userSkills);
  } catch (e) {
    console.error('Erro ao buscar skills do usuário:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/upgrade', requireAuth, async (req: any, res: any) => {
  try {
    const { skillKey } = req.body;
    if (!skillKey) {
      return res.status(400).json({ error: 'skillKey é obrigatório' });
    }

    const skill = await prismaClient.skillNode.findUnique({
      where: { key: skillKey },
    });
    if (!skill || !skill.isActive) {
      return res.status(404).json({ error: 'Skill não encontrada' });
    }

    const userSkill = await prismaClient.userSkill.findUnique({
      where: { userId_skillKey: { userId: req.user.id, skillKey } },
    });

    const currentLevel = userSkill?.level ?? 0;
    if (currentLevel >= skill.maxLevel) {
      return res.status(400).json({ error: 'Skill já no nível máximo' });
    }

    // Verificar pré-requisitos
    for (const prereqKey of skill.prerequisites) {
      const prereq = await prismaClient.userSkill.findUnique({
        where: { userId_skillKey: { userId: req.user.id, skillKey: prereqKey } },
      });
      if (!prereq || prereq.level === 0) {
        return res.status(400).json({ 
          error: `Pré-requisito não atendido: ${prereqKey}`,
          missingPrereq: prereqKey,
        });
      }
    }

    // Calcular custo
    const cost = Math.ceil(skill.baseCost * Math.pow(skill.costScaling, currentLevel));
    const user = await prismaClient.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.skillPoints < cost) {
      return res.status(400).json({ error: 'SP insuficiente', cost, available: user?.skillPoints ?? 0 });
    }

    // Aplicar upgrade
    await prismaClient.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.user.id },
        data: { skillPoints: { decrement: cost } },
      });
      await tx.userSkill.upsert({
        where: { userId_skillKey: { userId: req.user.id, skillKey } },
        create: { userId: req.user.id, skillKey, level: 1 },
        update: { level: { increment: 1 } },
      });
    });

    const updated = await prismaClient.userSkill.findUnique({
      where: { userId_skillKey: { userId: req.user.id, skillKey } },
      include: { skill: true },
    });

    res.json({ success: true, userSkill: updated, cost });
  } catch (e) {
    console.error('Erro ao upar skill:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/run/:runId', requireAuth, async (req: any, res: any) => {
  try {
    const run = await prismaClient.run.findUnique({
      where: { id: req.params.runId },
      include: { skills: true },
    });
    if (!run || run.userId !== req.user.id) {
      return res.status(404).json({ error: 'Run não encontrada' });
    }
    res.json(run.skills);
  } catch (e) {
    console.error('Erro ao buscar skills da run:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/run/:runId/upgrade', requireAuth, async (req: any, res: any) => {
  try {
    const { skillKey } = req.body;
    if (!skillKey) {
      return res.status(400).json({ error: 'skillKey é obrigatório' });
    }

    const run = await prismaClient.run.findUnique({
      where: { id: req.params.runId },
      include: { skills: true },
    });
    if (!run || run.userId !== req.user.id) {
      return res.status(404).json({ error: 'Run não encontrada' });
    }

    const skill = await prismaClient.skillNode.findUnique({
      where: { key: skillKey },
    });
    if (!skill || !skill.isActive) {
      return res.status(404).json({ error: 'Skill não encontrada' });
    }

    const runSkill = run.skills.find(s => s.skillKey === skillKey);
    const currentLevel = runSkill?.level ?? 0;
    if (currentLevel >= skill.maxLevel) {
      return res.status(400).json({ error: 'Skill já no nível máximo' });
    }

    // Verificar pré-requisitos (permanente OU temporário da run)
    for (const prereqKey of skill.prerequisites) {
      const hasPermanent = await prismaClient.userSkill.findUnique({
        where: { userId_skillKey: { userId: req.user.id, skillKey: prereqKey } },
      });
      const hasTemporary = run.skills.find(s => s.skillKey === prereqKey && s.level > 0);
      if ((!hasPermanent || hasPermanent.level === 0) && !hasTemporary) {
        return res.status(400).json({ 
          error: `Pré-requisito não atendido: ${prereqKey}`,
          missingPrereq: prereqKey,
        });
      }
    }

    // Calcular custo
    const cost = Math.ceil(skill.baseCost * Math.pow(skill.costScaling, currentLevel));
    if (run.skillPoints < cost) {
      return res.status(400).json({ error: 'SP da run insuficiente', cost, available: run.skillPoints });
    }

    // Aplicar upgrade temporário
    await prismaClient.$transaction(async (tx) => {
      await tx.run.update({
        where: { id: run.id },
        data: { skillPoints: { decrement: cost } },
      });
      await tx.runSkill.upsert({
        where: { runId_skillKey: { runId: run.id, skillKey } },
        create: { runId: run.id, skillKey, level: 1 },
        update: { level: { increment: 1 } },
      });
    });

    const updatedRun = await prismaClient.run.findUnique({
      where: { id: run.id },
      include: { skills: true },
    });

    res.json({ success: true, runSkills: updatedRun?.skills, cost });
  } catch (e) {
    console.error('Erro ao upar skill da run:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;