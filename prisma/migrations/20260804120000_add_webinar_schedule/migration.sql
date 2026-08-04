-- CreateTable
CREATE TABLE "WebinarSchedule" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "announcement" TEXT,
    "joinUrl" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebinarSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebinarSchedule_isPublished_scheduledAt_idx" ON "WebinarSchedule"("isPublished", "scheduledAt");

-- CreateIndex
CREATE INDEX "WebinarSchedule_scheduledAt_idx" ON "WebinarSchedule"("scheduledAt");
