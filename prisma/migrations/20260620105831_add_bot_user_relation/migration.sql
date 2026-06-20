-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BotConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL DEFAULT 'web',
    "externalId" TEXT NOT NULL,
    "userId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'marketing',
    "context" TEXT NOT NULL DEFAULT '{}',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BotConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BotConversation" ("channel", "context", "createdAt", "externalId", "id", "lastMessageAt", "metadata", "mode", "updatedAt", "userId") SELECT "channel", "context", "createdAt", "externalId", "id", "lastMessageAt", "metadata", "mode", "updatedAt", "userId" FROM "BotConversation";
DROP TABLE "BotConversation";
ALTER TABLE "new_BotConversation" RENAME TO "BotConversation";
CREATE INDEX "BotConversation_channel_externalId_idx" ON "BotConversation"("channel", "externalId");
CREATE INDEX "BotConversation_userId_idx" ON "BotConversation"("userId");
CREATE INDEX "BotConversation_lastMessageAt_idx" ON "BotConversation"("lastMessageAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
