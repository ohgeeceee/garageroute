-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Queue_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "impactKg" REAL NOT NULL DEFAULT 0,
    "donationRequested" BOOLEAN NOT NULL DEFAULT false,
    "donationStatus" TEXT NOT NULL DEFAULT '',
    "donationOrg" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Sale" ("address", "city", "createdAt", "dates", "description", "hours", "id", "impactKg", "lat", "lng", "photos", "seller", "sellerToken", "state", "title", "type", "updatedAt", "verified", "zip") SELECT "address", "city", "createdAt", "dates", "description", "hours", "id", "impactKg", "lat", "lng", "photos", "seller", "sellerToken", "state", "title", "type", "updatedAt", "verified", "zip" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_sellerToken_key" ON "Sale"("sellerToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
