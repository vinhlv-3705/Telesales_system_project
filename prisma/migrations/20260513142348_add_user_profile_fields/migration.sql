-- AlterTable
ALTER TABLE "user" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fullName" TEXT DEFAULT '',
ADD COLUMN     "phoneNumber" TEXT;
