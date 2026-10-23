/*
  Warnings:

  - You are about to alter the column `creditBalance` on the `students` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE "students" ALTER COLUMN "creditBalance" SET DATA TYPE DECIMAL(12,2);

-- CreateTable
CREATE TABLE "student_discounts" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "term" "Term" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_discounts_studentId_term_academicYear_key" ON "student_discounts"("studentId", "term", "academicYear");

-- AddForeignKey
ALTER TABLE "student_discounts" ADD CONSTRAINT "student_discounts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_discounts" ADD CONSTRAINT "student_discounts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
