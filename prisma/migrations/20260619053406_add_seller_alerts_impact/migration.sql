/*
  Warnings:

  - The required column `sellerToken` was added to the `Sale` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "radius" INTEGER NOT NULL DEFAULT 25,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" REAL,
    "condition" TEXT NOT NULL,
    "photo" TEXT,
    "sold" BOOLEAN NOT NULL DEFAULT false,
    "saleId" TEXT NOT NULL,
    CONSTRAINT "Item_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("category", "condition", "id", "name", "photo", "price", "saleId") SELECT "category", "condition", "id", "name", "photo", "price", "saleId" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Sale" ("address", "city", "createdAt", "dates", "description", "hours", "id", "lat", "lng", "photos", "seller", "state", "title", "type", "updatedAt", "verified", "zip") SELECT "address", "city", "createdAt", "dates", "description", "hours", "id", "lat", "lng", "photos", "seller", "state", "title", "type", "updatedAt", "verified", "zip" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_sellerToken_key" ON "Sale"("sellerToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
