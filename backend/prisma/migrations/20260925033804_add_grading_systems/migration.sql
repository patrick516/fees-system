-- CreateEnum
CREATE TYPE "GradingSystem" AS ENUM ('POINTS', 'LETTER');

-- DropIndex
DROP INDEX "grade_boundaries_schoolId_gradePoint_key";

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "gradingSystem" "GradingSystem" NOT NULL DEFAULT 'POINTS';

-- AlterTable
ALTER TABLE "exam_results" ADD COLUMN     "gradeLabel" TEXT;

-- AlterTable
ALTER TABLE "grade_boundaries" ADD COLUMN     "system" "GradingSystem" NOT NULL DEFAULT 'POINTS',
ALTER COLUMN "gradePoint" DROP NOT NULL;
