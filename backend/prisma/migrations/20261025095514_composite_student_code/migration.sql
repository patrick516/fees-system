/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,studentCode]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "students_studentCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "students_schoolId_studentCode_key" ON "students"("schoolId", "studentCode");
