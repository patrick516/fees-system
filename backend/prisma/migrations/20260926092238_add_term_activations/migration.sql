-- CreateTable
CREATE TABLE "term_activations" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "term" "Term" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedById" TEXT,

    CONSTRAINT "term_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "term_activations_schoolId_idx" ON "term_activations"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "term_activations_schoolId_term_academicYear_key" ON "term_activations"("schoolId", "term", "academicYear");

-- AddForeignKey
ALTER TABLE "term_activations" ADD CONSTRAINT "term_activations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
