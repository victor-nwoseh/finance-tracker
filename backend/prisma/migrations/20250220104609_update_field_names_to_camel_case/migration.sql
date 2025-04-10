/*
  Warnings:

  - You are about to drop the column `createdAt` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `periodEnd` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `periodStart` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `currentAmount` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `targetAmount` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `recurring_bills` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `recurring_bills` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `recurring_bills` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `recurring_bills` table. All the data in the column will be lost.
  - You are about to drop the column `budgetId` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - Added the required column `period_end` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `period_start` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `target_amount` to the `pots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `pots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `pots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `due_date` to the `recurring_bills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `recurring_bills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `recurring_bills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `transactions` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_userId_fkey";

-- DropForeignKey
ALTER TABLE "pots" DROP CONSTRAINT "pots_userId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_bills" DROP CONSTRAINT "recurring_bills_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_userId_fkey";

-- AlterTable
ALTER TABLE "budgets" DROP COLUMN "createdAt",
DROP COLUMN "periodEnd",
DROP COLUMN "periodStart",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "period_end" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "period_start" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "pots" DROP COLUMN "createdAt",
DROP COLUMN "currentAmount",
DROP COLUMN "targetAmount",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "target_amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "recurring_bills" DROP COLUMN "createdAt",
DROP COLUMN "dueDate",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "due_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "budgetId",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "password",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pots" ADD CONSTRAINT "pots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
