/*
  Warnings:

  - You are about to drop the column `nationalBankAccount` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `nationalBankName` on the `schools` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "schools" DROP COLUMN "nationalBankAccount",
DROP COLUMN "nationalBankName",
ADD COLUMN     "bankAccounts" JSONB;
