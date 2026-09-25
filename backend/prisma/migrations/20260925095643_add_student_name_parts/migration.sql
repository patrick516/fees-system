-- Add nullable columns first
ALTER TABLE "students" ADD COLUMN "firstName" TEXT;
ALTER TABLE "students" ADD COLUMN "middleName" TEXT;
ALTER TABLE "students" ADD COLUMN "lastName" TEXT;

-- Backfill from existing fullName
-- First word -> firstName, everything after the first space -> lastName, middleName = null
UPDATE "students"
SET
  "firstName" = SPLIT_PART("fullName", ' ', 1),
  "lastName"  = COALESCE(
    NULLIF(
      TRIM(SUBSTRING("fullName" FROM POSITION(' ' IN "fullName") + 1)),
      ''
    ),
    SPLIT_PART("fullName", ' ', 1)
  ),
  "middleName" = NULL;

-- Lock the required fields
ALTER TABLE "students" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "students" ALTER COLUMN "lastName"  SET NOT NULL;