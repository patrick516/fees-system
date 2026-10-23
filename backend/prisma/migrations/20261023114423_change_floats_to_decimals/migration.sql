/*
  Warnings:

  - You are about to alter the column `amount` on the `fee_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `balance` on the `fee_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `requiredAmount` on the `fee_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `creditApplied` on the `fee_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `overpayment` on the `fee_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `netAmount` on the `fee_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `platformFee` on the `fee_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `totalAmount` on the `fee_structures` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `tuitionFee` on the `fee_structures` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `examFee` on the `fee_structures` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `buildingLevy` on the `fee_structures` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `uniformFee` on the `fee_structures` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `bookFee` on the `fee_structures` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `otherFees` on the `fee_structures` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `amount` on the `subscription_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE "fee_payments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "requiredAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "creditApplied" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "overpayment" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "netAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "platformFee" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "fee_structures" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tuitionFee" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "examFee" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "buildingLevy" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "uniformFee" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "bookFee" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "otherFees" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "subscription_payments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);
