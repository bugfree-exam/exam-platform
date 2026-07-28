-- CreateEnum
CREATE TYPE "StudentAccountStatus" AS ENUM ('ACTIVE', 'FROZEN', 'ARCHIVED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "frozenAt" TIMESTAMP(3),
ADD COLUMN     "studentStatus" "StudentAccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "webinarAccessUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_role_studentStatus_idx" ON "User"("role", "studentStatus");

-- CreateIndex
CREATE INDEX "Webinar_publishedAt_idx" ON "Webinar"("publishedAt");
