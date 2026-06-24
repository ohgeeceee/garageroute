-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "radius" INTEGER NOT NULL DEFAULT 25,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SellerDigestRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "error" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "ReservationAccessToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SaleReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "reporterEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleReport_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IngestSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastRunAt" DATETIME,
    "lastError" TEXT NOT NULL DEFAULT '',
    "lastSeenCount" INTEGER NOT NULL DEFAULT 0,
    "lastNewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IngestItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ok',
    "saleId" TEXT,
    "error" TEXT NOT NULL DEFAULT '',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExtensionToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "scopeZip" TEXT NOT NULL DEFAULT '',
    "scopeCity" TEXT NOT NULL DEFAULT '',
    "scopeState" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "lastUsedAt" DATETIME,
    CONSTRAINT "ExtensionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "dates" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seller" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "sellerToken" TEXT NOT NULL,
    "sellerUserId" TEXT,
    "impactKg" REAL NOT NULL DEFAULT 0,
    "donationRequested" BOOLEAN NOT NULL DEFAULT false,
    "donationStatus" TEXT NOT NULL DEFAULT '',
    "donationOrg" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "statusNote" TEXT NOT NULL DEFAULT '',
    "statusChangedAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'user',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "expiresAt" DATETIME,
    "submittedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("address", "city", "createdAt", "dates", "description", "donationOrg", "donationRequested", "donationStatus", "hours", "id", "impactKg", "lat", "lng", "photos", "seller", "sellerToken", "sellerUserId", "state", "status", "statusChangedAt", "statusNote", "title", "type", "updatedAt", "verified", "zip") SELECT "address", "city", "createdAt", "dates", "description", "donationOrg", "donationRequested", "donationStatus", "hours", "id", "impactKg", "lat", "lng", "photos", "seller", "sellerToken", "sellerUserId", "state", "status", "statusChangedAt", "statusNote", "title", "type", "updatedAt", "verified", "zip" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_sellerToken_key" ON "Sale"("sellerToken");
CREATE INDEX "Sale_status_expiresAt_idx" ON "Sale"("status", "expiresAt");
CREATE INDEX "Sale_source_idx" ON "Sale"("source");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SavedSearch_zip_category_idx" ON "SavedSearch"("zip", "category");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "SavedSearch_email_idx" ON "SavedSearch"("email");

-- CreateIndex
CREATE INDEX "SellerDigestRun_sentAt_idx" ON "SellerDigestRun"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationAccessToken_reservationId_key" ON "ReservationAccessToken"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationAccessToken_token_key" ON "ReservationAccessToken"("token");

-- CreateIndex
CREATE INDEX "ReservationAccessToken_token_idx" ON "ReservationAccessToken"("token");

-- CreateIndex
CREATE INDEX "ReservationAccessToken_expiresAt_idx" ON "ReservationAccessToken"("expiresAt");

-- CreateIndex
CREATE INDEX "SaleReport_saleId_createdAt_idx" ON "SaleReport"("saleId", "createdAt");

-- CreateIndex
CREATE INDEX "SaleReport_status_createdAt_idx" ON "SaleReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IngestSource_status_lastRunAt_idx" ON "IngestSource"("status", "lastRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "IngestSource_kind_slug_key" ON "IngestSource"("kind", "slug");

-- CreateIndex
CREATE INDEX "IngestItem_sourceId_fetchedAt_idx" ON "IngestItem"("sourceId", "fetchedAt");

-- CreateIndex
CREATE INDEX "IngestItem_status_fetchedAt_idx" ON "IngestItem"("status", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IngestItem_sourceId_externalId_key" ON "IngestItem"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionToken_tokenHash_key" ON "ExtensionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ExtensionToken_userId_idx" ON "ExtensionToken"("userId");

-- CreateIndex
CREATE INDEX "ExtensionToken_expiresAt_idx" ON "ExtensionToken"("expiresAt");

