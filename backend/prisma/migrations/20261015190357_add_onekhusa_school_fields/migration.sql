/*
  Warnings:

  - A unique constraint covering the columns `[onekhusaMerchantAccount]` on the table `schools` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "onekhusaMerchantAccount" TEXT,
ADD COLUMN     "onekhusaWebhookSecretReversed" TEXT,
ADD COLUMN     "onekhusaWebhookSecretSuccess" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "schools_onekhusaMerchantAccount_key" ON "schools"("onekhusaMerchantAccount");
