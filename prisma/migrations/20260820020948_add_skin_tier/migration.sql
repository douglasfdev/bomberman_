/*
  Warnings:

  - A unique constraint covering the columns `[identification]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SkinTier" AS ENUM ('FREE', 'BASIC', 'PREMIUM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "identification" TEXT,
ADD COLUMN     "selectedSkin" TEXT NOT NULL DEFAULT 'character-d',
ADD COLUMN     "skinTier" "SkinTier" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'woovi',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT NOT NULL DEFAULT 'donation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkinPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SkinTier" NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "paymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkinPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_correlationId_key" ON "Payment"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "SkinPurchase_paymentId_key" ON "SkinPurchase"("paymentId");

-- CreateIndex
CREATE INDEX "SkinPurchase_userId_idx" ON "SkinPurchase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_identification_key" ON "User"("identification");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinPurchase" ADD CONSTRAINT "SkinPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinPurchase" ADD CONSTRAINT "SkinPurchase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
