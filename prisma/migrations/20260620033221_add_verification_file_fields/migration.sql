-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "documentUrl" TEXT NOT NULL DEFAULT '',
    "documentPath" TEXT NOT NULL DEFAULT '',
    "documentName" TEXT NOT NULL DEFAULT '',
    "documentMime" TEXT NOT NULL DEFAULT '',
    "documentBytes" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "UserVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserVerification" ("documentUrl", "id", "notes", "reviewedAt", "reviewedBy", "status", "submittedAt", "userId") SELECT "documentUrl", "id", "notes", "reviewedAt", "reviewedBy", "status", "submittedAt", "userId" FROM "UserVerification";
DROP TABLE "UserVerification";
ALTER TABLE "new_UserVerification" RENAME TO "UserVerification";
CREATE INDEX "UserVerification_status_submittedAt_idx" ON "UserVerification"("status", "submittedAt");
CREATE INDEX "UserVerification_userId_idx" ON "UserVerification"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
