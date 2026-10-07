/*
  Warnings:

  - Added the required column `channel` to the `sms_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "notificationDefaults" JSONB;

-- AlterTable
ALTER TABLE "sms_logs" ADD COLUMN     "channel" TEXT NOT NULL,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "subject" TEXT,
ADD COLUMN     "template" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "sms_logs_schoolId_idx" ON "sms_logs"("schoolId");

-- CreateIndex
CREATE INDEX "sms_logs_channel_idx" ON "sms_logs"("channel");

-- CreateIndex
CREATE INDEX "sms_logs_type_idx" ON "sms_logs"("type");

-- CreateIndex
CREATE INDEX "sms_logs_createdAt_idx" ON "sms_logs"("createdAt");
