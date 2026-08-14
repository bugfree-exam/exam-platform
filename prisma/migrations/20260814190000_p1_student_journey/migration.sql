-- CreateEnum
CREATE TYPE "PreparationLevel" AS ENUM ('ZERO', 'BEGINNER', 'BASIC', 'CONFIDENT');

-- CreateEnum
CREATE TYPE "DiagnosticStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StudentRoadmapStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoadmapMilestoneStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "QueueDecisionState" AS ENUM ('ACTIVE', 'SNOOZED', 'HELP_REQUESTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RecoveryReason" AS ENUM ('OVERLOAD', 'ILLNESS', 'SCHOOL_LOAD', 'LOW_MOTIVATION', 'OTHER');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ErrorCorrectionStatus" AS ENUM ('OPEN', 'CORRECTED', 'VERIFIED');

-- CreateTable
CREATE TABLE "StudentPreparationProfile" (
    "studentId" TEXT NOT NULL,
    "targetScore" INTEGER NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "weeklyMinutes" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL,
    "preferredDays" JSONB NOT NULL,
    "currentLevel" "PreparationLevel" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPreparationProfile_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "StudentDiagnosticAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "DiagnosticStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StudentDiagnosticAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDiagnosticItem" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskRevisionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "rawAnswer" JSONB,
    "normalizedAnswer" JSONB,
    "isCorrect" BOOLEAN,
    "countsForMastery" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudentDiagnosticItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRoadmap" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sourceDiagnosticId" TEXT,
    "status" "StudentRoadmapStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetScore" INTEGER NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "weeklyMinutes" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRoadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRoadmapMilestone" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "egeNumbers" JSONB NOT NULL,
    "prerequisiteNumbers" JSONB NOT NULL,
    "plannedMinutes" INTEGER NOT NULL,
    "status" "RoadmapMilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRoadmapMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentQueueDecision" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "state" "QueueDecisionState" NOT NULL DEFAULT 'ACTIVE',
    "scheduledFor" TIMESTAMP(3),
    "note" TEXT,
    "helpRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentQueueDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRecoveryPeriod" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "RecoveryStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" "RecoveryReason" NOT NULL,
    "weeklyMinutes" INTEGER NOT NULL,
    "mainGoal" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reviewAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRecoveryPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentErrorCorrection" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "evidenceKey" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskRevisionId" TEXT NOT NULL,
    "errorCause" "LearningErrorCause",
    "reflection" TEXT,
    "correctedAnswer" JSONB,
    "status" "ErrorCorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "scheduledFor" TIMESTAMP(3),
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentErrorCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentPreparationProfile_examDate_idx" ON "StudentPreparationProfile"("examDate");
CREATE INDEX "StudentDiagnosticAttempt_studentId_startedAt_idx" ON "StudentDiagnosticAttempt"("studentId", "startedAt");
CREATE INDEX "StudentDiagnosticAttempt_studentId_status_idx" ON "StudentDiagnosticAttempt"("studentId", "status");
CREATE UNIQUE INDEX "StudentDiagnosticItem_attemptId_taskId_key" ON "StudentDiagnosticItem"("attemptId", "taskId");
CREATE UNIQUE INDEX "StudentDiagnosticItem_attemptId_order_key" ON "StudentDiagnosticItem"("attemptId", "order");
CREATE INDEX "StudentDiagnosticItem_taskId_idx" ON "StudentDiagnosticItem"("taskId");
CREATE INDEX "StudentDiagnosticItem_taskRevisionId_idx" ON "StudentDiagnosticItem"("taskRevisionId");
CREATE INDEX "StudentRoadmap_studentId_status_idx" ON "StudentRoadmap"("studentId", "status");
CREATE INDEX "StudentRoadmap_studentId_generatedAt_idx" ON "StudentRoadmap"("studentId", "generatedAt");
CREATE UNIQUE INDEX "StudentRoadmapMilestone_roadmapId_order_key" ON "StudentRoadmapMilestone"("roadmapId", "order");
CREATE INDEX "StudentRoadmapMilestone_roadmapId_weekStart_idx" ON "StudentRoadmapMilestone"("roadmapId", "weekStart");
CREATE INDEX "StudentRoadmapMilestone_status_weekStart_idx" ON "StudentRoadmapMilestone"("status", "weekStart");
CREATE UNIQUE INDEX "StudentQueueDecision_studentId_itemKey_key" ON "StudentQueueDecision"("studentId", "itemKey");
CREATE INDEX "StudentQueueDecision_studentId_state_scheduledFor_idx" ON "StudentQueueDecision"("studentId", "state", "scheduledFor");
CREATE INDEX "StudentRecoveryPeriod_studentId_status_idx" ON "StudentRecoveryPeriod"("studentId", "status");
CREATE INDEX "StudentRecoveryPeriod_reviewAt_idx" ON "StudentRecoveryPeriod"("reviewAt");
CREATE UNIQUE INDEX "StudentErrorCorrection_studentId_evidenceKey_key" ON "StudentErrorCorrection"("studentId", "evidenceKey");
CREATE INDEX "StudentErrorCorrection_studentId_status_scheduledFor_idx" ON "StudentErrorCorrection"("studentId", "status", "scheduledFor");
CREATE INDEX "StudentErrorCorrection_taskId_idx" ON "StudentErrorCorrection"("taskId");
CREATE INDEX "StudentErrorCorrection_taskRevisionId_idx" ON "StudentErrorCorrection"("taskRevisionId");

-- AddForeignKey
ALTER TABLE "StudentPreparationProfile" ADD CONSTRAINT "StudentPreparationProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentDiagnosticAttempt" ADD CONSTRAINT "StudentDiagnosticAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentDiagnosticItem" ADD CONSTRAINT "StudentDiagnosticItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "StudentDiagnosticAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentDiagnosticItem" ADD CONSTRAINT "StudentDiagnosticItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentDiagnosticItem" ADD CONSTRAINT "StudentDiagnosticItem_taskRevisionId_fkey" FOREIGN KEY ("taskRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRoadmap" ADD CONSTRAINT "StudentRoadmap_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentRoadmap" ADD CONSTRAINT "StudentRoadmap_sourceDiagnosticId_fkey" FOREIGN KEY ("sourceDiagnosticId") REFERENCES "StudentDiagnosticAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentRoadmapMilestone" ADD CONSTRAINT "StudentRoadmapMilestone_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "StudentRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentQueueDecision" ADD CONSTRAINT "StudentQueueDecision_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentRecoveryPeriod" ADD CONSTRAINT "StudentRecoveryPeriod_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentErrorCorrection" ADD CONSTRAINT "StudentErrorCorrection_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentErrorCorrection" ADD CONSTRAINT "StudentErrorCorrection_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentErrorCorrection" ADD CONSTRAINT "StudentErrorCorrection_taskRevisionId_fkey" FOREIGN KEY ("taskRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
