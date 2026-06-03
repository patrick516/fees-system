-- AlterTable
ALTER TABLE "fee_payments" ADD COLUMN     "balance" DOUBLE PRECISION,
ADD COLUMN     "isDebtor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiredAmount" DOUBLE PRECISION;
