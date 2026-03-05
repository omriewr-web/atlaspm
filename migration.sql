-- Migration: Add building data fields for Book1.xlsx import
-- Applied via: npx prisma db push (already applied)
-- This file is for reference / manual SQL execution

-- New scalar columns on buildings table
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "bin" TEXT;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "mdrNumber" TEXT;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "dhcrRegId" TEXT;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "squareFootage" INTEGER;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "yearBuilt" INTEGER;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "constructionType" TEXT;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "floors" INTEGER;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "floorsBelowGround" INTEGER;

-- New JSON columns for grouped data
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "lifeSafety" JSONB;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "elevatorInfo" JSONB;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "boilerInfo" JSONB;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "complianceDates" JSONB;

-- JSON field structures:
--
-- lifeSafety: {
--   sprinkler: string,
--   sprinklerCoverage: string,
--   fireAlarm: string,
--   egress: string,
--   backflow: string,
--   standpipe: string,
--   coolingTower: string,
--   waterStorageTank: string,
--   petroleumBulkStorage: string
-- }
--
-- elevatorInfo: {
--   type: string,
--   cat1Date: string (YYYY-MM-DD),
--   cat5Date: string (YYYY-MM-DD),
--   followUpNotes: string,
--   aocSubmitted: string
-- }
--
-- boilerInfo: {
--   lastInspectionDate: string (YYYY-MM-DD),
--   device: string,
--   followUpNotes: string
-- }
--
-- complianceDates: {
--   ll152GasPipe: string,
--   parapetInspection: string (YYYY-MM-DD),
--   hpdRegistrationYear: string (YYYY),
--   bedBugFilingYear: string (YYYY),
--   safetyFilingYear: string (YYYY)
-- }
