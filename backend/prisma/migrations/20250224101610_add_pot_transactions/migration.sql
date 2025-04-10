/*
  Warnings:

  - You are about to drop the column `created_at` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `current_amount` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `target_amount` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `pots` table. All the data in the column will be lost.
  - Added the required column `currentAmount` to the `pots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetAmount` to the `pots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `pots` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "pots" DROP CONSTRAINT "pots_user_id_fkey";

-- AlterTable
ALTER TABLE "pots" DROP COLUMN "created_at",
DROP COLUMN "current_amount",
DROP COLUMN "target_amount",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "targetAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "pot_transactions" (
    "id" TEXT NOT NULL,
    "potId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pot_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pots" ADD CONSTRAINT "pots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pot_transactions" ADD CONSTRAINT "pot_transactions_potId_fkey" FOREIGN KEY ("potId") REFERENCES "pots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
