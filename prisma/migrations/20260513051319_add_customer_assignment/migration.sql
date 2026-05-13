-- CreateTable
CREATE TABLE "customer_assignment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_assignment_userId_idx" ON "customer_assignment"("userId");

-- CreateIndex
CREATE INDEX "customer_assignment_customerId_idx" ON "customer_assignment"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_assignment_customerId_userId_key" ON "customer_assignment"("customerId", "userId");

-- AddForeignKey
ALTER TABLE "customer_assignment" ADD CONSTRAINT "customer_assignment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "cust"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_assignment" ADD CONSTRAINT "customer_assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
