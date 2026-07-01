/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `schools` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "schools_slug_key" ON "schools"("slug");
