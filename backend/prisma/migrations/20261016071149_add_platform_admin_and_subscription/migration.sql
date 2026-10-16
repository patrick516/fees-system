-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('OWNER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'GRACE', 'READONLY', 'LOCKED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "platform" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'MWK',
ADD COLUMN     "defaultTermPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "defaultTrialDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "subscriptionMerchantAccount" TEXT,
ADD COLUMN     "subscriptionWebhookSecretReversed" TEXT,
ADD COLUMN     "subscriptionWebhookSecretSuccess" TEXT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "settlementAccountName" TEXT,
ADD COLUMN     "settlementAccountNumber" TEXT,
ADD COLUMN     "settlementBankName" TEXT,
ADD COLUMN     "settlementBranch" TEXT,
ADD COLUMN     "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'OWNER',
    "passwordHash" TEXT,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationOtp" TEXT,
    "emailVerificationExpires" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "invitedAt" TIMESTAMP(3),
    "invitationToken" TEXT,
    "invitationExpires" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "refreshTokenHash" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MWK',
    "term" "Term" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "onekhusaTransactionRef" TEXT,
    "onekhusaTimedAccount" TEXT,
    "onekhusaStatus" TEXT,
    "onekhusaRawResponse" JSONB,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "markedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_invitationToken_key" ON "platform_admins"("invitationToken");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_passwordResetToken_key" ON "platform_admins"("passwordResetToken");

-- CreateIndex
CREATE INDEX "platform_admins_email_idx" ON "platform_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_onekhusaTransactionRef_key" ON "subscription_payments"("onekhusaTransactionRef");

-- CreateIndex
CREATE INDEX "subscription_payments_schoolId_idx" ON "subscription_payments"("schoolId");

-- CreateIndex
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments"("status");

-- CreateIndex
CREATE INDEX "subscription_payments_term_academicYear_idx" ON "subscription_payments"("term", "academicYear");

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
