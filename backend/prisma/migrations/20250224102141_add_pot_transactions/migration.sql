/*
  Warnings:

  - You are about to drop the column `created_at` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `pots` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `pots` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `pots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `pots` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "pots" DROP CONSTRAINT "pots_user_id_fkey";

-- AlterTable
ALTER TABLE "pots" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "pots" ADD CONSTRAINT "pots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
