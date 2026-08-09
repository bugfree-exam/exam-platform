-- Telegram account binding for students.
ALTER TABLE "User"
ADD COLUMN "telegramChatId" TEXT,
ADD COLUMN "telegramUsername" TEXT,
ADD COLUMN "telegramLinkedAt" TIMESTAMP(3),
ADD COLUMN "telegramNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "telegramLinkTokenHash" TEXT,
ADD COLUMN "telegramLinkTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");
CREATE UNIQUE INDEX "User_telegramLinkTokenHash_key" ON "User"("telegramLinkTokenHash");

CREATE TYPE "ReminderChannel" AS ENUM ('TELEGRAM');
CREATE TYPE "ReminderKind" AS ENUM (
  'HOMEWORK_DUE_SOON',
  'HOMEWORK_OVERDUE',
  'VARIANT_DUE_SOON',
  'VARIANT_OVERDUE'
);
CREATE TYPE "ReminderResourceType" AS ENUM ('HOMEWORK', 'VARIANT');

CREATE TABLE "ReminderDelivery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'TELEGRAM',
    "kind" "ReminderKind" NOT NULL,
    "resourceType" "ReminderResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReminderDelivery_studentId_channel_kind_resourceType_resourceId_deadlineAt_key"
ON "ReminderDelivery"("studentId", "channel", "kind", "resourceType", "resourceId", "deadlineAt");

CREATE INDEX "ReminderDelivery_studentId_sentAt_idx"
ON "ReminderDelivery"("studentId", "sentAt");

CREATE INDEX "ReminderDelivery_resourceType_resourceId_idx"
ON "ReminderDelivery"("resourceType", "resourceId");

ALTER TABLE "ReminderDelivery"
ADD CONSTRAINT "ReminderDelivery_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
