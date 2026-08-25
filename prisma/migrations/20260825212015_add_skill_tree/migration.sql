-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "skillPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "skillPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SkillNode" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "baseCost" INTEGER NOT NULL DEFAULT 1,
    "costScaling" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "maxLevel" INTEGER NOT NULL DEFAULT 3,
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "effects" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillKey" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunSkill" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "skillKey" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RunSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillNode_key_key" ON "SkillNode"("key");

-- CreateIndex
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillKey_key" ON "UserSkill"("userId", "skillKey");

-- CreateIndex
CREATE INDEX "RunSkill_runId_idx" ON "RunSkill"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "RunSkill_runId_skillKey_key" ON "RunSkill"("runId", "skillKey");

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillKey_fkey" FOREIGN KEY ("skillKey") REFERENCES "SkillNode"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunSkill" ADD CONSTRAINT "RunSkill_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
