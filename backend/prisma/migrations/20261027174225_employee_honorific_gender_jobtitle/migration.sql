/*
  Warnings:

  - You are about to drop the column `title` on the `employees` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "employees" DROP COLUMN "title",
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "honorific" TEXT,
ADD COLUMN     "jobTitle" TEXT;
