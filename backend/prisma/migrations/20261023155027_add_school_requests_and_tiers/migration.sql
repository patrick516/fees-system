-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "maxStudents" INTEGER NOT NULL DEFAULT 150,
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'SMALL';

-- CreateTable
CREATE TABLE "school_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_requests_pkey" PRIMARY KEY ("id")
);
