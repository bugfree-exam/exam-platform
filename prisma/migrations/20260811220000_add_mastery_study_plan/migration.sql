CREATE TYPE "StudyPlanAttemptKind" AS ENUM ('PRACTICE', 'CONTROL');
CREATE TYPE "LearningErrorCause" AS ENUM (
  'THEORY_GAP',
  'ALGORITHM_GAP',
  'IMPLEMENTATION_ERROR',
  'CONDITION_READING',
  'CALCULATION_ERROR',
  'NO_CHECKING',
  'TIME_PRESSURE',
  'OTHER'
);

ALTER TABLE "Task" ADD COLUMN "skillTag" TEXT;
ALTER TABLE "PracticeAttempt"
  ADD COLUMN "studyPlanAttemptKind" "StudyPlanAttemptKind",
  ADD COLUMN "errorCause" "LearningErrorCause";

CREATE INDEX "Task_egeNumber_skillTag_idx" ON "Task"("egeNumber", "skillTag");
CREATE INDEX "PracticeAttempt_errorCause_createdAt_idx"
  ON "PracticeAttempt"("errorCause", "createdAt");
