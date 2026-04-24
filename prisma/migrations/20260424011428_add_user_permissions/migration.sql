/*
  Warnings:

  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `agentName` to the `CallLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerName` to the `CallLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Customer_phone_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Customer";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AGENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cust" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "area" TEXT,
    "address" TEXT,
    "taxCode" TEXT,
    "groupCode" TEXT,
    "partner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Mới',
    "callbackTime" TEXT,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "assignedTo" TEXT NOT NULL,
    "assignedToId" TEXT,
    "medicalRep" TEXT NOT NULL DEFAULT 'Admin',
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cust_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentName" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "callStatus" TEXT NOT NULL DEFAULT 'MOI',
    "revenue" REAL NOT NULL DEFAULT 0,
    "callbackDate" DATETIME,
    "callbackTime" TEXT,
    "note" TEXT,
    "notes" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CallLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "cust" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CallLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CallLog" ("callAt", "callStatus", "callbackDate", "createdAt", "customerId", "id", "note", "revenue", "updatedAt") SELECT "callAt", "callStatus", "callbackDate", "createdAt", "customerId", "id", "note", "revenue", "updatedAt" FROM "CallLog";
DROP TABLE "CallLog";
ALTER TABLE "new_CallLog" RENAME TO "CallLog";
CREATE INDEX "CallLog_customerId_idx" ON "CallLog"("customerId");
CREATE INDEX "CallLog_agentId_idx" ON "CallLog"("agentId");
CREATE INDEX "CallLog_callStatus_idx" ON "CallLog"("callStatus");
CREATE INDEX "CallLog_callbackDate_idx" ON "CallLog"("callbackDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE UNIQUE INDEX "cust_customerCode_key" ON "cust"("customerCode");

-- CreateIndex
CREATE INDEX "cust_fullName_idx" ON "cust"("fullName");

-- CreateIndex
CREATE INDEX "cust_phone_idx" ON "cust"("phone");

-- CreateIndex
CREATE INDEX "cust_status_idx" ON "cust"("status");

-- CreateIndex
CREATE INDEX "cust_assignedToId_idx" ON "cust"("assignedToId");
