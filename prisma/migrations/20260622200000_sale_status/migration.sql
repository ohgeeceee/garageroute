-- Sale lifecycle: active (default) | ended | cancelled
-- Lets sellers cleanly close a sale and tell buyers it's over.
ALTER TABLE "Sale" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Sale" ADD COLUMN "statusNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Sale" ADD COLUMN "statusChangedAt" DATETIME;
