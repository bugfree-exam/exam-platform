-- P1: teacher-authored annual course and shared entry diagnostic.

CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "CourseItemType" AS ENUM ('THEORY', 'PRACTICE', 'HOMEWORK', 'WEBINAR', 'VARIANT', 'CONTROL', 'ERROR_REVIEW', 'OTHER');
CREATE TYPE "DiagnosticTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "DiagnosticTaskLevel" AS ENUM ('FOUNDATION', 'BASIC', 'ADVANCED', 'EXAM');

CREATE TABLE "AnnualCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnnualCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "egeNumbers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseScheduleItem" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "order" INTEGER NOT NULL,
    "type" "CourseItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "href" TEXT,
    "egeNumbers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseScheduleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentCourseEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "diagnosticTemplateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentCourseEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticTemplate" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DiagnosticTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiagnosticTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskRevisionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "level" "DiagnosticTaskLevel" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosticTemplateItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StudentDiagnosticAttempt" ADD COLUMN "templateId" TEXT;
ALTER TABLE "StudentDiagnosticItem" ADD COLUMN "level" "DiagnosticTaskLevel", ADD COLUMN "points" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "AnnualCourse_status_startDate_idx" ON "AnnualCourse"("status", "startDate");
CREATE UNIQUE INDEX "CourseModule_courseId_order_key" ON "CourseModule"("courseId", "order");
CREATE INDEX "CourseModule_courseId_startDate_idx" ON "CourseModule"("courseId", "startDate");
CREATE UNIQUE INDEX "CourseScheduleItem_courseId_order_key" ON "CourseScheduleItem"("courseId", "order");
CREATE INDEX "CourseScheduleItem_courseId_scheduledFor_idx" ON "CourseScheduleItem"("courseId", "scheduledFor");
CREATE INDEX "CourseScheduleItem_moduleId_scheduledFor_idx" ON "CourseScheduleItem"("moduleId", "scheduledFor");
CREATE UNIQUE INDEX "StudentCourseEnrollment_courseId_studentId_key" ON "StudentCourseEnrollment"("courseId", "studentId");
CREATE INDEX "StudentCourseEnrollment_studentId_isActive_idx" ON "StudentCourseEnrollment"("studentId", "isActive");
CREATE INDEX "StudentCourseEnrollment_diagnosticTemplateId_idx" ON "StudentCourseEnrollment"("diagnosticTemplateId");
CREATE UNIQUE INDEX "DiagnosticTemplate_courseId_version_key" ON "DiagnosticTemplate"("courseId", "version");
CREATE INDEX "DiagnosticTemplate_courseId_status_idx" ON "DiagnosticTemplate"("courseId", "status");
CREATE UNIQUE INDEX "DiagnosticTemplateItem_templateId_taskId_key" ON "DiagnosticTemplateItem"("templateId", "taskId");
CREATE UNIQUE INDEX "DiagnosticTemplateItem_templateId_order_key" ON "DiagnosticTemplateItem"("templateId", "order");
CREATE INDEX "DiagnosticTemplateItem_taskId_idx" ON "DiagnosticTemplateItem"("taskId");
CREATE INDEX "DiagnosticTemplateItem_taskRevisionId_idx" ON "DiagnosticTemplateItem"("taskRevisionId");
CREATE INDEX "StudentDiagnosticAttempt_templateId_idx" ON "StudentDiagnosticAttempt"("templateId");

ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AnnualCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseScheduleItem" ADD CONSTRAINT "CourseScheduleItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AnnualCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseScheduleItem" ADD CONSTRAINT "CourseScheduleItem_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentCourseEnrollment" ADD CONSTRAINT "StudentCourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AnnualCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentCourseEnrollment" ADD CONSTRAINT "StudentCourseEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentCourseEnrollment" ADD CONSTRAINT "StudentCourseEnrollment_diagnosticTemplateId_fkey" FOREIGN KEY ("diagnosticTemplateId") REFERENCES "DiagnosticTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTemplate" ADD CONSTRAINT "DiagnosticTemplate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AnnualCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTemplateItem" ADD CONSTRAINT "DiagnosticTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DiagnosticTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTemplateItem" ADD CONSTRAINT "DiagnosticTemplateItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTemplateItem" ADD CONSTRAINT "DiagnosticTemplateItem_taskRevisionId_fkey" FOREIGN KEY ("taskRevisionId") REFERENCES "TaskRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentDiagnosticAttempt" ADD CONSTRAINT "StudentDiagnosticAttempt_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DiagnosticTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A published diagnostic is an immutable snapshot. New cohorts receive a new version.
CREATE OR REPLACE FUNCTION "guard_published_diagnostic_items"()
RETURNS TRIGGER AS $$
DECLARE
    target_template_id TEXT;
BEGIN
    target_template_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."templateId" ELSE NEW."templateId" END;
    IF EXISTS (
        SELECT 1
        FROM "DiagnosticTemplate"
        WHERE "id" = target_template_id AND "status" <> 'DRAFT'
    ) THEN
        RAISE EXCEPTION 'Published diagnostic items are immutable';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticTemplateItem_immutable_after_publish"
BEFORE INSERT OR UPDATE OR DELETE ON "DiagnosticTemplateItem"
FOR EACH ROW EXECUTE FUNCTION "guard_published_diagnostic_items"();

CREATE OR REPLACE FUNCTION "guard_published_diagnostic_metadata"()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."status" <> 'DRAFT' AND (
        NEW."courseId" IS DISTINCT FROM OLD."courseId" OR
        NEW."title" IS DISTINCT FROM OLD."title" OR
        NEW."description" IS DISTINCT FROM OLD."description" OR
        NEW."durationMinutes" IS DISTINCT FROM OLD."durationMinutes" OR
        NEW."version" IS DISTINCT FROM OLD."version" OR
        NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt"
    ) THEN
        RAISE EXCEPTION 'Published diagnostic metadata is immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticTemplate_immutable_after_publish"
BEFORE UPDATE ON "DiagnosticTemplate"
FOR EACH ROW EXECUTE FUNCTION "guard_published_diagnostic_metadata"();
