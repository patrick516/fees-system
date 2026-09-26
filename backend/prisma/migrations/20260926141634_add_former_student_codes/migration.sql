-- AlterTable
ALTER TABLE "students" ADD COLUMN     "formerStudentCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
