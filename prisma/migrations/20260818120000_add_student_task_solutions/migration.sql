CREATE TYPE "StudentSolutionLanguage" AS ENUM ('PYTHON_3_13');
CREATE TYPE "StudentSolutionPublicationStatus" AS ENUM (
    'PRIVATE',
    'PENDING_REVIEW',
    'PUBLISHED',
    'REJECTED'
);

CREATE TABLE "StudentTaskSolution" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskRevisionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" "StudentSolutionLanguage" NOT NULL DEFAULT 'PYTHON_3_13',
    "allowPublication" BOOLEAN NOT NULL DEFAULT false,
    "publicationStatus" "StudentSolutionPublicationStatus" NOT NULL DEFAULT 'PRIVATE',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentTaskSolution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentTaskSolution_studentId_taskId_key"
ON "StudentTaskSolution"("studentId", "taskId");
CREATE INDEX "StudentTaskSolution_studentId_updatedAt_idx"
ON "StudentTaskSolution"("studentId", "updatedAt");
CREATE INDEX "StudentTaskSolution_taskId_publicationStatus_publishedAt_idx"
ON "StudentTaskSolution"("taskId", "publicationStatus", "publishedAt");
CREATE INDEX "StudentTaskSolution_publicationStatus_updatedAt_idx"
ON "StudentTaskSolution"("publicationStatus", "updatedAt");
CREATE INDEX "StudentTaskSolution_reviewedById_idx"
ON "StudentTaskSolution"("reviewedById");
CREATE INDEX "StudentTaskSolution_taskRevisionId_idx"
ON "StudentTaskSolution"("taskRevisionId");

ALTER TABLE "StudentTaskSolution"
ADD CONSTRAINT "StudentTaskSolution_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentTaskSolution"
ADD CONSTRAINT "StudentTaskSolution_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentTaskSolution"
ADD CONSTRAINT "StudentTaskSolution_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTaskSolution"
ADD CONSTRAINT "StudentTaskSolution_taskRevisionId_fkey"
FOREIGN KEY ("taskRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
