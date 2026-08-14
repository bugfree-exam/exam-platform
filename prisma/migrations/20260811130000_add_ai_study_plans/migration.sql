CREATE TYPE "StudyPlanStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "AiGenerationStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "AiGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "analyticsSnapshot" JSONB NOT NULL,
    "outputSnapshot" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentStudyPlan" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "status" "StudyPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "topics" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "analyticsSnapshot" JSONB NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentStudyPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentStudyPlan_generationId_key"
ON "StudentStudyPlan"("generationId");

CREATE INDEX "StudentStudyPlan_studentId_createdAt_idx"
ON "StudentStudyPlan"("studentId", "createdAt");

CREATE INDEX "StudentStudyPlan_studentId_status_idx"
ON "StudentStudyPlan"("studentId", "status");

CREATE INDEX "AiGeneration_studentId_startedAt_idx"
ON "AiGeneration"("studentId", "startedAt");

CREATE INDEX "AiGeneration_status_startedAt_idx"
ON "AiGeneration"("status", "startedAt");

ALTER TABLE "AiGeneration"
ADD CONSTRAINT "AiGeneration_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentStudyPlan"
ADD CONSTRAINT "StudentStudyPlan_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentStudyPlan"
ADD CONSTRAINT "StudentStudyPlan_generationId_fkey"
FOREIGN KEY ("generationId") REFERENCES "AiGeneration"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
