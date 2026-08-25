import "dotenv/config";
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
console.log('Adapter created:', !!adapter);

const prisma = new PrismaClient({ adapter });
console.log('Prisma client created:', !!prisma);
console.log('Prisma skillNode:', typeof prisma.skillNode);

const skillNodes = [
  {
    key: 'BOMB_CAPACITY',
    name: 'Capacidade de Bombas',
    description: 'Aumenta o número máximo de bombas simultâneas',
    icon: '💣',
    baseCost: 1,
    costScaling: 1.5,
    maxLevel: 3,
    prerequisites: [],
    category: 'BOMB',
    positionX: 0.1,
    positionY: 0.5,
    effects: { bombCount: 1 },
  },
  {
    key: 'BOMB_RANGE',
    name: 'Alcance da Explosão',
    description: 'Aumenta o alcance da explosão das bombas',
    icon: '📏',
    baseCost: 1,
    costScaling: 1.5,
    maxLevel: 3,
    prerequisites: [],
    category: 'RANGE',
    positionX: 0.2,
    positionY: 0.3,
    effects: { range: 1 },
  },
  {
    key: 'MOVE_SPEED',
    name: 'Velocidade',
    description: 'Aumenta a velocidade de movimento',
    icon: '🏃',
    baseCost: 1,
    costScaling: 1.5,
    maxLevel: 3,
    prerequisites: [],
    category: 'SPEED',
    positionX: 0.2,
    positionY: 0.7,
    effects: { speed: -30 },
  },
  {
    key: 'PIERCE_BOMB',
    name: 'Bomba Perfurante',
    description: 'Explosão atravessa caixas',
    icon: '🔱',
    baseCost: 2,
    costScaling: 1.0,
    maxLevel: 1,
    prerequisites: ['BOMB_RANGE'],
    category: 'BOMB',
    positionX: 0.3,
    positionY: 0.4,
    effects: { pierce: true },
  },
  {
    key: 'CHAIN_EXPLOSION',
    name: 'Explosão em Cadeia',
    description: 'Se explosão toca outra bomba, ambas explodem instantaneamente',
    icon: '⛓️',
    baseCost: 3,
    costScaling: 1.0,
    maxLevel: 1,
    prerequisites: ['PIERCE_BOMB', 'BOMB_CAPACITY'],
    category: 'SYNERGY',
    positionX: 0.4,
    positionY: 0.5,
    effects: { chainExplosion: true },
  },
  {
    key: 'REMOTE_DETONATE',
    name: 'Detonação Remota',
    description: 'Espaço = detona sua bomba mais velha',
    icon: '📡',
    baseCost: 2,
    costScaling: 1.0,
    maxLevel: 1,
    prerequisites: ['BOMB_CAPACITY'],
    category: 'BOMB',
    positionX: 0.3,
    positionY: 0.6,
    effects: { remoteDetonate: true },
  },
  {
    key: 'MEGA_BOMB',
    name: 'Mega Bomba',
    description: '1x por fase: bomba 2x alcance + perfura paredes',
    icon: '💥',
    baseCost: 3,
    costScaling: 1.0,
    maxLevel: 1,
    prerequisites: ['BOMB_RANGE', 'CHAIN_EXPLOSION'],
    category: 'SYNERGY',
    positionX: 0.5,
    positionY: 0.4,
    effects: { megaBomb: true },
  },
  {
    key: 'FREEZE_BOMB',
    name: 'Bomba Congelante',
    description: 'Inimigo congelado 2s ao ser atingido',
    icon: '❄️',
    baseCost: 2,
    costScaling: 1.0,
    maxLevel: 1,
    prerequisites: ['BOMB_RANGE'],
    category: 'SYNERGY',
    positionX: 0.4,
    positionY: 0.3,
    effects: { freezeBomb: true },
  },
  {
    key: 'SHATTER',
    name: 'Estilhaçar',
    description: 'Inimigo congelado = 1 hit kill',
    icon: '💎',
    baseCost: 2,
    costScaling: 1.0,
    maxLevel: 1,
    prerequisites: ['FREEZE_BOMB'],
    category: 'SYNERGY',
    positionX: 0.5,
    positionY: 0.3,
    effects: { shatter: true },
  },
  {
    key: 'SPEED_BOOST',
    name: 'Velocidade Extra',
    description: 'Velocidade adicional além do limite normal',
    icon: '⚡',
    baseCost: 2,
    costScaling: 1.5,
    maxLevel: 2,
    prerequisites: ['MOVE_SPEED'],
    category: 'SPEED',
    positionX: 0.3,
    positionY: 0.8,
    effects: { speed: -30 },
  },
  {
    key: 'SHIELD',
    name: 'Escudo',
    description: '1 escudo por run (absorve 1 hit)',
    icon: '🛡️',
    baseCost: 1,
    costScaling: 1.0,
    maxLevel: 1,
    prerequisites: [],
    category: 'DEFENSE',
    positionX: 0.1,
    positionY: 0.3,
    effects: { shield: true },
  },
  {
    key: 'LIFE_STEAL',
    name: 'Roubo de Vida',
    description: '10% chance de ganhar 1 vida ao matar inimigo',
    icon: '🩸',
    baseCost: 2,
    costScaling: 1.0,
    maxLevel: 1,
    prerequisites: [],
    category: 'DEFENSE',
    positionX: 0.1,
    positionY: 0.7,
    effects: { lifeSteal: true },
  },
];

async function main() {
  console.log('Seeding SkillNode...');

  for (const node of skillNodes) {
    const existing = await prisma.skillNode.findUnique({
      where: { key: node.key },
    });

    if (existing) {
      console.log(`SkillNode ${node.key} já existe, atualizando...`);
      await prisma.skillNode.update({
        where: { key: node.key },
        data: node,
      });
    } else {
      await prisma.skillNode.create({
        data: node,
      });
      console.log(`SkillNode ${node.key} criado`);
    }
  }

  console.log('Seed concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });