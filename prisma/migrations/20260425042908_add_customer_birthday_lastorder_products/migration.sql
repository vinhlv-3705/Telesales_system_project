-- AlterTable
ALTER TABLE "cust" ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "lastOrderAt" TIMESTAMP(3),
ADD COLUMN     "productsPurchased" TEXT;
