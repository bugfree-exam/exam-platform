ALTER TABLE "StudentStudyPlan"
ADD COLUMN "teacherEditedAt" TIMESTAMP(3);

ALTER TABLE "PracticeAttempt"
ADD COLUMN "studyPlanId" TEXT,
ADD COLUMN "studyPlanActionIndex" INTEGER;

CREATE INDEX "PracticeAttempt_studyPlanId_studyPlanActionIndex_createdAt_idx"
ON "PracticeAttempt"("studyPlanId", "studyPlanActionIndex", "createdAt");

ALTER TABLE "PracticeAttempt"
ADD CONSTRAINT "PracticeAttempt_studyPlanId_fkey"
FOREIGN KEY ("studyPlanId") REFERENCES "StudentStudyPlan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
