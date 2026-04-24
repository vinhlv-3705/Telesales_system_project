-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('CHOT_DON', 'TU_CHOI', 'MOI', 'UPSALE', 'HEN_GOI_LAI');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT 'password123',
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cust" (
    "id" TEXT NOT NULL,
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
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assignedTo" TEXT NOT NULL,
    "assignedToId" TEXT,
    "medicalRep" TEXT NOT NULL DEFAULT 'Admin',
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cust_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentName" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "callStatus" "CallStatus" NOT NULL DEFAULT 'MOI',
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "callbackDate" TIMESTAMP(3),
    "callbackTime" TEXT,
    "note" TEXT,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE INDEX "CallLog_customerId_idx" ON "CallLog"("customerId");

-- CreateIndex
CREATE INDEX "CallLog_agentId_idx" ON "CallLog"("agentId");

-- CreateIndex
CREATE INDEX "CallLog_callStatus_idx" ON "CallLog"("callStatus");

-- CreateIndex
CREATE INDEX "CallLog_callbackDate_idx" ON "CallLog"("callbackDate");

-- AddForeignKey
ALTER TABLE "cust" ADD CONSTRAINT "cust_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "cust"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
