-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "refreshTokenExpires" TIMESTAMP(3),
ADD COLUMN     "refreshTokenHash" TEXT;
