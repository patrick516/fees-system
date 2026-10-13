-- AlterTable
ALTER TABLE "fee_payments" ADD COLUMN     "malipoCustomerRef" TEXT,
ADD COLUMN     "malipoFailureReason" TEXT,
ADD COLUMN     "malipoRawResponse" JSONB,
ADD COLUMN     "malipoStatus" TEXT,
ADD COLUMN     "malipoTransactionId" TEXT,
ADD COLUMN     "paymentChannel" TEXT;
