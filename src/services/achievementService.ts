import { prismaClient as prisma } from './prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Seed data: lista canônica de achievements do jogo
// ─────────────────────────────────────────────────────────────────────────────
export const ACHIEVEMENTS_SEED = [
  {
    key: 'FIRST_BLOOD',
    title: 'First Blood',
    description: 'Mate o seu primeiro inimigo.',
    icon: '💀',
  },
  {
    key: 'BOMB_MASTER',
    title: 'Bomb Master',
    description: 'Mate 3 inimigos com uma única explosão.',
    icon: '💣',
  },
  {
    key: 'SPEED_DEMON',
    title: 'Speed Demon',
    description: 'Complete uma fase com o power-up de velocidade máxima.',
    icon: '⚡',
  },
  {
    key: 'PHASE_CLEARER',
    title: 'Phase Clearer',
    description: 'Complete 5 fases seguidas.',
    icon: '🏅',
  },
  {
    key: 'EXPLORER',
    title: 'Explorer',
    description: 'Destrua 50 caixas no total.',
    icon: '📦',
  },
  {
    key: 'POWER_COLLECTOR',
    title: 'Power Collector',
    description: 'Colete todos os 4 tipos de power-up em uma única partida.',
    icon: '✨',
  },
  {
    key: 'SURVIVOR',
    title: 'Survivor',
    description: 'Complete uma fase sem tomar nenhum dano.',
    icon: '🛡️',
  },
  {
    key: 'HIGH_SCORER',
    title: 'High Scorer',
    description: 'Alcance 1000 pontos em uma única partida.',
    icon: '🎯',
  },
  {
    key: 'BOMB_LEGEND',
    title: 'Bomberman Lendário',
    description: 'Alcance a fase 10.',
    icon: '🌟',
  },
  {
    key: 'CHAIN_REACTION',
    title: 'Chain Reaction',
    description: 'Detone 2 bombas em cadeia (uma explosão aciona a outra).',
    icon: '🔗',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Garante que todos os achievements existem no banco (idempotente)
// ─────────────────────────────────────────────────────────────────────────────
export async function seedAchievements(): Promise<void> {
  for (const achievement of ACHIEVEMENTS_SEED) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: {
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
      },
      create: achievement,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Retorna todos os achievements, indicando quais o usuário já desbloqueou
// ─────────────────────────────────────────────────────────────────────────────
export async function listAchievementsForUser(userId: string) {
  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    }),
  ]);

  const unlockedMap = new Map<string, Date>(
    unlocked.map((u) => [u.achievementId, u.unlockedAt])
  );

  return achievements.map((a) => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Desbloqueia um achievement para o usuário (idempotente — não duplica)
// Retorna { alreadyUnlocked, achievement }
// ─────────────────────────────────────────────────────────────────────────────
export async function unlockAchievement(
  userId: string,
  achievementKey: string
): Promise<{ alreadyUnlocked: boolean; achievement: { id: string; key: string; title: string; description: string; icon: string } }> {
  const achievement = await prisma.achievement.findUnique({
    where: { key: achievementKey },
  });

  if (!achievement) {
    throw new Error(`Achievement com key "${achievementKey}" não encontrado.`);
  }

  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });

  if (existing) {
    return { alreadyUnlocked: true, achievement };
  }

  await prisma.userAchievement.create({
    data: { userId, achievementId: achievement.id },
  });

  return { alreadyUnlocked: false, achievement };
}

// ─────────────────────────────────────────────────────────────────────────────
// Retorna apenas os achievements já desbloqueados pelo usuário
// ─────────────────────────────────────────────────────────────────────────────
export async function getUnlockedAchievements(userId: string) {
  return prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { unlockedAt: 'desc' },
  });
}
