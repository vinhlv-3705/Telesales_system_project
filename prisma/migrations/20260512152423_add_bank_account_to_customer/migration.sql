-- AlterTable
ALTER TABLE "cust" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "district" TEXT;

-- CreateIndex
CREATE INDEX "cust_area_idx" ON "cust"("area");

-- CreateIndex
CREATE INDEX "cust_district_idx" ON "cust"("district");
