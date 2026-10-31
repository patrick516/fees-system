-- CreateEnum
-- CreateEnum (safely)
DO $$ BEGIN
    CREATE TYPE "StudentType" AS ENUM ('DAY', 'BOARDING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- AlterTable
ALTER TABLE "fee_structures" 
  RENAME COLUMN "totalAmount" TO "dayAmount";

ALTER TABLE "fee_structures" 
  ADD COLUMN "boardingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Copy the day amount into the boarding amount so you don't have nulls
UPDATE "fee_structures" SET "boardingAmount" = "dayAmount";

-- Remove the default so future inserts require a real number
ALTER TABLE "fee_structures" 
  ALTER COLUMN "boardingAmount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN "groupId" TEXT;

-- AlterTable
ALTER TABLE "staff" ADD COLUMN "groupId" TEXT,
ADD COLUMN "isGroupAdmin" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "schoolId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN "studentType" "StudentType" NOT NULL DEFAULT 'DAY';

-- CreateTable
CREATE TABLE "school_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "school_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "school_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;