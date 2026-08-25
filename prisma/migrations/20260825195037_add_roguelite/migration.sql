-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "phase" INTEGER NOT NULL DEFAULT 1,
    "maxPhase" INTEGER NOT NULL DEFAULT 1,
    "lives" INTEGER NOT NULL DEFAULT 3,
    "shield" INTEGER NOT NULL DEFAULT 0,
    "timeLeftMs" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endedReason" TEXT,
    "seedData" JSONB,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunChoice" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "offered" TEXT[],
    "picked" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunUpgrade" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "cardKey" TEXT NOT NULL,
    "stacks" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunUpgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "maxStacks" INTEGER NOT NULL DEFAULT 1,
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weight" INTEGER NOT NULL DEFAULT 10,
    "isSynergy" BOOLEAN NOT NULL DEFAULT false,
    "synergyWith" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnemyArchetype" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseHp" INTEGER NOT NULL,
    "baseSpeed" INTEGER NOT NULL,
    "baseDamage" INTEGER NOT NULL,
    "bombRange" INTEGER NOT NULL,
    "bombChance" DOUBLE PRECISION NOT NULL,
    "abilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scalePerPhase" JSONB NOT NULL,
    "minPhase" INTEGER NOT NULL DEFAULT 1,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "isBoss" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EnemyArchetype_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Run_userId_idx" ON "Run"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RunUpgrade_runId_cardKey_key" ON "RunUpgrade"("runId", "cardKey");

-- CreateIndex
CREATE UNIQUE INDEX "Card_key_key" ON "Card"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EnemyArchetype_key_key" ON "EnemyArchetype"("key");

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunChoice" ADD CONSTRAINT "RunChoice_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunUpgrade" ADD CONSTRAINT "RunUpgrade_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
