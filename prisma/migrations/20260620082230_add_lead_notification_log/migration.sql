-- CreateTable
CREATE TABLE "LeadNotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "matchedOn" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT NOT NULL DEFAULT '',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "LeadNotificationLog_saleId_idx" ON "LeadNotificationLog"("saleId");

-- CreateIndex
CREATE INDEX "LeadNotificationLog_recipientEmail_idx" ON "LeadNotificationLog"("recipientEmail");

-- CreateIndex
CREATE INDEX "LeadNotificationLog_createdAt_idx" ON "LeadNotificationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadNotificationLog_saleId_recipientEmail_recipientType_key" ON "LeadNotificationLog"("saleId", "recipientEmail", "recipientType");
