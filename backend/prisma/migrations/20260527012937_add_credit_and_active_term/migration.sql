-- AlterTable
ALTER TABLE "fee_payments" ADD COLUMN     "creditApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "overpayment" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "activeAcademicYear" TEXT,
ADD COLUMN     "activeTerm" "Term";

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
