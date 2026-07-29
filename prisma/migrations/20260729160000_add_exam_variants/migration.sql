-- CreateEnum
CREATE TYPE "VariantStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ExamVariant" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "VariantStatus" NOT NULL DEFAULT 'DRAFT',
    "durationMinutes" INTEGER NOT NULL DEFAULT 235,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantTask" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VariantTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantAttempt" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "VariantAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantAttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "rawAnswer" JSONB NOT NULL,
    "normalizedAnswer" JSONB,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "awardedPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VariantAttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamVariant_status_createdAt_idx" ON "ExamVariant"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VariantTask_variantId_taskId_key" ON "VariantTask"("variantId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantTask_variantId_order_key" ON "VariantTask"("variantId", "order");

-- CreateIndex
CREATE INDEX "VariantTask_variantId_idx" ON "VariantTask"("variantId");

-- CreateIndex
CREATE INDEX "VariantTask_taskId_idx" ON "VariantTask"("taskId");

-- CreateIndex
CREATE INDEX "VariantAttempt_variantId_submittedAt_idx" ON "VariantAttempt"("variantId", "submittedAt");

-- CreateIndex
CREATE INDEX "VariantAttempt_studentId_submittedAt_idx" ON "VariantAttempt"("studentId", "submittedAt");

-- CreateIndex
CREATE INDEX "VariantAttempt_studentId_variantId_status_idx" ON "VariantAttempt"("studentId", "variantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VariantAttemptAnswer_attemptId_taskId_key" ON "VariantAttemptAnswer"("attemptId", "taskId");

-- CreateIndex
CREATE INDEX "VariantAttemptAnswer_attemptId_idx" ON "VariantAttemptAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "VariantAttemptAnswer_taskId_idx" ON "VariantAttemptAnswer"("taskId");

-- AddForeignKey
ALTER TABLE "VariantTask" ADD CONSTRAINT "VariantTask_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExamVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantTask" ADD CONSTRAINT "VariantTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttempt" ADD CONSTRAINT "VariantAttempt_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExamVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttempt" ADD CONSTRAINT "VariantAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttemptAnswer" ADD CONSTRAINT "VariantAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "VariantAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttemptAnswer" ADD CONSTRAINT "VariantAttemptAnswer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
