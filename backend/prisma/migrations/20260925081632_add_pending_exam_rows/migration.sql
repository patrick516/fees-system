-- CreateTable
CREATE TABLE "pending_exam_rows" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "examPeriodId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "marks" JSONB NOT NULL,
    "candidateStudentIds" TEXT[],
    "resolvedStudentId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_exam_rows_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pending_exam_rows" ADD CONSTRAINT "pending_exam_rows_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_exam_rows" ADD CONSTRAINT "pending_exam_rows_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_exam_rows" ADD CONSTRAINT "pending_exam_rows_examPeriodId_fkey" FOREIGN KEY ("examPeriodId") REFERENCES "exam_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
