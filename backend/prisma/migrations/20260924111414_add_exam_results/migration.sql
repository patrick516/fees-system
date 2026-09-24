-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('MID_TERM', 'END_TERM', 'MOCK');

-- CreateTable
CREATE TABLE "exam_periods" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "term" "Term" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "examType" "ExamType" NOT NULL DEFAULT 'END_TERM',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_boundaries" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "minPercent" DOUBLE PRECISION NOT NULL,
    "maxPercent" DOUBLE PRECISION NOT NULL,
    "gradePoint" INTEGER NOT NULL,
    "gradeLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_boundaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examPeriodId" TEXT NOT NULL,
    "mark" DOUBLE PRECISION NOT NULL,
    "gradePoint" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_periods_schoolId_term_academicYear_examType_key" ON "exam_periods"("schoolId", "term", "academicYear", "examType");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_schoolId_classId_name_key" ON "subjects"("schoolId", "classId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "grade_boundaries_schoolId_gradePoint_key" ON "grade_boundaries"("schoolId", "gradePoint");

-- CreateIndex
CREATE INDEX "exam_results_schoolId_idx" ON "exam_results"("schoolId");

-- CreateIndex
CREATE INDEX "exam_results_examPeriodId_idx" ON "exam_results"("examPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_results_studentId_subjectId_examPeriodId_key" ON "exam_results"("studentId", "subjectId", "examPeriodId");

-- AddForeignKey
ALTER TABLE "exam_periods" ADD CONSTRAINT "exam_periods_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_boundaries" ADD CONSTRAINT "grade_boundaries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_examPeriodId_fkey" FOREIGN KEY ("examPeriodId") REFERENCES "exam_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
