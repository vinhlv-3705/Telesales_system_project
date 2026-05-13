-- DropIndex
DROP INDEX "cust_area_idx";

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 0;
