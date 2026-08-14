-- Immutable task revisions and auditable mastery evidence.
CREATE TYPE "PracticeFeedbackStage" AS ENUM ('HINT', 'SOLUTION');

ALTER TABLE "Task"
ADD COLUMN "referenceHtml" TEXT,
ADD COLUMN "hintHtml" TEXT,
ADD COLUMN "currentRevisionId" TEXT;

CREATE TABLE "TaskRevision" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "egeNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "statementHtml" TEXT NOT NULL,
    "referenceHtml" TEXT,
    "answerType" "TaskAnswerType" NOT NULL,
    "correctAnswer" JSONB NOT NULL,
    "hintHtml" TEXT,
    "explanationHtml" TEXT,
    "videoUrl" TEXT,
    "source" TEXT,
    "difficulty" INTEGER,
    "skillTag" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskRevision_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TaskRevision" (
    "id", "taskId", "version", "egeNumber", "title", "statementHtml",
    "referenceHtml", "answerType", "correctAnswer", "hintHtml",
    "explanationHtml", "videoUrl", "source", "difficulty", "skillTag",
    "isPublic", "changeNote", "createdAt"
)
SELECT
    "id" || '_v1', "id", 1, "egeNumber", "title", "statementHtml",
    NULL, "answerType", "correctAnswer", NULL, "explanationHtml", "videoUrl",
    "source", "difficulty", "skillTag", "isPublic", 'Исходная версия', "createdAt"
FROM "Task";

UPDATE "Task"
SET "currentRevisionId" = "id" || '_v1';

CREATE UNIQUE INDEX "Task_currentRevisionId_key" ON "Task"("currentRevisionId");
CREATE UNIQUE INDEX "TaskRevision_taskId_version_key" ON "TaskRevision"("taskId", "version");
CREATE INDEX "TaskRevision_taskId_createdAt_idx" ON "TaskRevision"("taskId", "createdAt");
CREATE INDEX "TaskRevision_egeNumber_skillTag_idx" ON "TaskRevision"("egeNumber", "skillTag");

ALTER TABLE "TaskRevision"
ADD CONSTRAINT "TaskRevision_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_currentRevisionId_fkey"
FOREIGN KEY ("currentRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TaskRevisionAttachment" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "TaskRevisionAttachment_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TaskRevisionAttachment" ("id", "revisionId", "attachmentId", "order")
SELECT
    "id" || '_v1_link',
    "taskId" || '_v1',
    "id",
    ROW_NUMBER() OVER (PARTITION BY "taskId" ORDER BY "createdAt", "id")::INTEGER
FROM "TaskAttachment";

CREATE UNIQUE INDEX "TaskRevisionAttachment_revisionId_attachmentId_key"
ON "TaskRevisionAttachment"("revisionId", "attachmentId");
CREATE UNIQUE INDEX "TaskRevisionAttachment_revisionId_order_key"
ON "TaskRevisionAttachment"("revisionId", "order");
CREATE INDEX "TaskRevisionAttachment_attachmentId_idx"
ON "TaskRevisionAttachment"("attachmentId");

ALTER TABLE "TaskRevisionAttachment"
ADD CONSTRAINT "TaskRevisionAttachment_revisionId_fkey"
FOREIGN KEY ("revisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskRevisionAttachment"
ADD CONSTRAINT "TaskRevisionAttachment_attachmentId_fkey"
FOREIGN KEY ("attachmentId") REFERENCES "TaskAttachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HomeworkTask" ADD COLUMN "taskRevisionId" TEXT;
ALTER TABLE "AttemptAnswer"
ADD COLUMN "taskRevisionId" TEXT,
ADD COLUMN "countsForMastery" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PracticeAttempt"
ADD COLUMN "taskRevisionId" TEXT,
ADD COLUMN "countsForMastery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "feedbackStage" "PracticeFeedbackStage" NOT NULL DEFAULT 'SOLUTION';
ALTER TABLE "VariantTask" ADD COLUMN "taskRevisionId" TEXT;
ALTER TABLE "VariantAttemptAnswer"
ADD COLUMN "taskRevisionId" TEXT,
ADD COLUMN "countsForMastery" BOOLEAN NOT NULL DEFAULT true;

UPDATE "HomeworkTask" target
SET "taskRevisionId" = task."currentRevisionId"
FROM "Task" task
WHERE target."taskId" = task."id";
UPDATE "AttemptAnswer" target
SET "taskRevisionId" = task."currentRevisionId"
FROM "Task" task
WHERE target."taskId" = task."id";
UPDATE "PracticeAttempt" target
SET "taskRevisionId" = task."currentRevisionId"
FROM "Task" task
WHERE target."taskId" = task."id";
UPDATE "VariantTask" target
SET "taskRevisionId" = task."currentRevisionId"
FROM "Task" task
WHERE target."taskId" = task."id";
UPDATE "VariantAttemptAnswer" target
SET "taskRevisionId" = task."currentRevisionId"
FROM "Task" task
WHERE target."taskId" = task."id";

ALTER TABLE "HomeworkTask" ALTER COLUMN "taskRevisionId" SET NOT NULL;
ALTER TABLE "AttemptAnswer" ALTER COLUMN "taskRevisionId" SET NOT NULL;
ALTER TABLE "PracticeAttempt" ALTER COLUMN "taskRevisionId" SET NOT NULL;
ALTER TABLE "VariantTask" ALTER COLUMN "taskRevisionId" SET NOT NULL;
ALTER TABLE "VariantAttemptAnswer" ALTER COLUMN "taskRevisionId" SET NOT NULL;

CREATE INDEX "HomeworkTask_taskRevisionId_idx" ON "HomeworkTask"("taskRevisionId");
CREATE INDEX "AttemptAnswer_taskRevisionId_idx" ON "AttemptAnswer"("taskRevisionId");
CREATE INDEX "PracticeAttempt_taskRevisionId_idx" ON "PracticeAttempt"("taskRevisionId");
CREATE INDEX "VariantTask_taskRevisionId_idx" ON "VariantTask"("taskRevisionId");
CREATE INDEX "VariantAttemptAnswer_taskRevisionId_idx" ON "VariantAttemptAnswer"("taskRevisionId");

ALTER TABLE "HomeworkTask"
ADD CONSTRAINT "HomeworkTask_taskRevisionId_fkey"
FOREIGN KEY ("taskRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttemptAnswer"
ADD CONSTRAINT "AttemptAnswer_taskRevisionId_fkey"
FOREIGN KEY ("taskRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PracticeAttempt"
ADD CONSTRAINT "PracticeAttempt_taskRevisionId_fkey"
FOREIGN KEY ("taskRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VariantTask"
ADD CONSTRAINT "VariantTask_taskRevisionId_fkey"
FOREIGN KEY ("taskRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VariantAttemptAnswer"
ADD CONSTRAINT "VariantAttemptAnswer_taskRevisionId_fkey"
FOREIGN KEY ("taskRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only the earliest encounter with a logical task is independent mastery evidence.
WITH evidence AS (
    SELECT 'HOMEWORK' AS source, answer."id", attempt."studentId", answer."taskId",
           COALESCE(attempt."submittedAt", attempt."startedAt") AS attempted_at
    FROM "AttemptAnswer" answer
    JOIN "Attempt" attempt ON attempt."id" = answer."attemptId"
    WHERE attempt."status" = 'SUBMITTED'
    UNION ALL
    SELECT 'PRACTICE', practice."id", practice."studentId", practice."taskId", practice."createdAt"
    FROM "PracticeAttempt" practice
    UNION ALL
    SELECT 'VARIANT', answer."id", attempt."studentId", answer."taskId",
           COALESCE(attempt."submittedAt", attempt."startedAt")
    FROM "VariantAttemptAnswer" answer
    JOIN "VariantAttempt" attempt ON attempt."id" = answer."attemptId"
    WHERE attempt."status" = 'SUBMITTED'
), ranked AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY "studentId", "taskId"
        ORDER BY attempted_at, source, "id"
    ) AS evidence_rank
    FROM evidence
)
UPDATE "AttemptAnswer" target
SET "countsForMastery" = false
FROM ranked
WHERE ranked.source = 'HOMEWORK' AND ranked."id" = target."id" AND ranked.evidence_rank > 1;

WITH evidence AS (
    SELECT 'HOMEWORK' AS source, answer."id", attempt."studentId", answer."taskId",
           COALESCE(attempt."submittedAt", attempt."startedAt") AS attempted_at
    FROM "AttemptAnswer" answer JOIN "Attempt" attempt ON attempt."id" = answer."attemptId"
    WHERE attempt."status" = 'SUBMITTED'
    UNION ALL
    SELECT 'PRACTICE', practice."id", practice."studentId", practice."taskId", practice."createdAt"
    FROM "PracticeAttempt" practice
    UNION ALL
    SELECT 'VARIANT', answer."id", attempt."studentId", answer."taskId",
           COALESCE(attempt."submittedAt", attempt."startedAt")
    FROM "VariantAttemptAnswer" answer JOIN "VariantAttempt" attempt ON attempt."id" = answer."attemptId"
    WHERE attempt."status" = 'SUBMITTED'
), ranked AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY "studentId", "taskId" ORDER BY attempted_at, source, "id"
    ) AS evidence_rank FROM evidence
)
UPDATE "PracticeAttempt" target
SET "countsForMastery" = false
FROM ranked
WHERE ranked.source = 'PRACTICE' AND ranked."id" = target."id" AND ranked.evidence_rank > 1;

WITH evidence AS (
    SELECT 'HOMEWORK' AS source, answer."id", attempt."studentId", answer."taskId",
           COALESCE(attempt."submittedAt", attempt."startedAt") AS attempted_at
    FROM "AttemptAnswer" answer JOIN "Attempt" attempt ON attempt."id" = answer."attemptId"
    WHERE attempt."status" = 'SUBMITTED'
    UNION ALL
    SELECT 'PRACTICE', practice."id", practice."studentId", practice."taskId", practice."createdAt"
    FROM "PracticeAttempt" practice
    UNION ALL
    SELECT 'VARIANT', answer."id", attempt."studentId", answer."taskId",
           COALESCE(attempt."submittedAt", attempt."startedAt")
    FROM "VariantAttemptAnswer" answer JOIN "VariantAttempt" attempt ON attempt."id" = answer."attemptId"
    WHERE attempt."status" = 'SUBMITTED'
), ranked AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY "studentId", "taskId" ORDER BY attempted_at, source, "id"
    ) AS evidence_rank FROM evidence
)
UPDATE "VariantAttemptAnswer" target
SET "countsForMastery" = false
FROM ranked
WHERE ranked.source = 'VARIANT' AND ranked."id" = target."id" AND ranked.evidence_rank > 1;

-- Guard immutable snapshots even if a future route accidentally calls update/delete.
CREATE FUNCTION prevent_task_revision_mutation() RETURNS trigger AS $$
BEGIN
    IF current_setting('app.allow_task_revision_mutation', true) = 'on' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Published task revisions are immutable; create a new revision instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TaskRevision_immutable"
BEFORE UPDATE OR DELETE ON "TaskRevision"
FOR EACH ROW EXECUTE FUNCTION prevent_task_revision_mutation();

CREATE TRIGGER "TaskRevisionAttachment_immutable"
BEFORE UPDATE OR DELETE ON "TaskRevisionAttachment"
FOR EACH ROW EXECUTE FUNCTION prevent_task_revision_mutation();

CREATE FUNCTION require_new_task_revision() RETURNS trigger AS $$
BEGIN
    IF current_setting('app.allow_task_revision_mutation', true) = 'on' THEN
        RETURN NEW;
    END IF;
    IF NEW."currentRevisionId" IS DISTINCT FROM OLD."currentRevisionId" AND NOT EXISTS (
        SELECT 1
        FROM "TaskRevision" revision
        WHERE revision."id" = NEW."currentRevisionId"
          AND revision."taskId" = NEW."id"
          AND revision."egeNumber" IS NOT DISTINCT FROM NEW."egeNumber"
          AND revision."title" IS NOT DISTINCT FROM NEW."title"
          AND revision."statementHtml" IS NOT DISTINCT FROM NEW."statementHtml"
          AND revision."referenceHtml" IS NOT DISTINCT FROM NEW."referenceHtml"
          AND revision."answerType" IS NOT DISTINCT FROM NEW."answerType"
          AND revision."correctAnswer" IS NOT DISTINCT FROM NEW."correctAnswer"
          AND revision."hintHtml" IS NOT DISTINCT FROM NEW."hintHtml"
          AND revision."explanationHtml" IS NOT DISTINCT FROM NEW."explanationHtml"
          AND revision."videoUrl" IS NOT DISTINCT FROM NEW."videoUrl"
          AND revision."source" IS NOT DISTINCT FROM NEW."source"
          AND revision."difficulty" IS NOT DISTINCT FROM NEW."difficulty"
          AND revision."skillTag" IS NOT DISTINCT FROM NEW."skillTag"
          AND revision."isPublic" IS NOT DISTINCT FROM NEW."isPublic"
    ) THEN
        RAISE EXCEPTION 'Task current content must exactly match its current immutable revision';
    END IF;
    IF (
        NEW."egeNumber" IS DISTINCT FROM OLD."egeNumber" OR
        NEW."title" IS DISTINCT FROM OLD."title" OR
        NEW."statementHtml" IS DISTINCT FROM OLD."statementHtml" OR
        NEW."referenceHtml" IS DISTINCT FROM OLD."referenceHtml" OR
        NEW."answerType" IS DISTINCT FROM OLD."answerType" OR
        NEW."correctAnswer" IS DISTINCT FROM OLD."correctAnswer" OR
        NEW."hintHtml" IS DISTINCT FROM OLD."hintHtml" OR
        NEW."explanationHtml" IS DISTINCT FROM OLD."explanationHtml" OR
        NEW."videoUrl" IS DISTINCT FROM OLD."videoUrl" OR
        NEW."source" IS DISTINCT FROM OLD."source" OR
        NEW."difficulty" IS DISTINCT FROM OLD."difficulty" OR
        NEW."skillTag" IS DISTINCT FROM OLD."skillTag" OR
        NEW."isPublic" IS DISTINCT FROM OLD."isPublic"
    ) AND NEW."currentRevisionId" IS NOT DISTINCT FROM OLD."currentRevisionId" THEN
        RAISE EXCEPTION 'Task content can only change together with a new immutable revision';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Task_requires_new_revision"
BEFORE UPDATE ON "Task"
FOR EACH ROW EXECUTE FUNCTION require_new_task_revision();
