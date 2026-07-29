CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "rawAnswer" JSONB NOT NULL,
    "normalizedAnswer" JSONB,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PracticeAttempt_studentId_createdAt_idx"
ON "PracticeAttempt"("studentId", "createdAt");

CREATE INDEX "PracticeAttempt_studentId_taskId_idx"
ON "PracticeAttempt"("studentId", "taskId");

CREATE INDEX "PracticeAttempt_taskId_idx"
ON "PracticeAttempt"("taskId");

ALTER TABLE "PracticeAttempt"
ADD CONSTRAINT "PracticeAttempt_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAttempt"
ADD CONSTRAINT "PracticeAttempt_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
