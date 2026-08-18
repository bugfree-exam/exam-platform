import "server-only";

import { prisma } from "@/lib/prisma";

export function formatPublicStudentName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Ученик курса";
  const lastInitial = parts[1]?.[0]?.toLocaleUpperCase("ru-RU");

  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

export async function getStudentTaskSolutionAccess(
  studentId: string,
  taskId: string,
  requestedTaskRevisionId?: string
) {
  const revisionFilter = requestedTaskRevisionId
    ? { taskRevisionId: requestedTaskRevisionId }
    : {};
  const [
    homeworkAnswer,
    practiceAttempt,
    variantAnswer,
    submittedVariantAnswer,
    diagnosticItem,
  ] =
    await Promise.all([
      prisma.attemptAnswer.findFirst({
        where: {
          taskId,
          ...revisionFilter,
          attempt: { studentId, status: "SUBMITTED" },
        },
        select: { id: true, taskRevisionId: true },
      }),
      prisma.practiceAttempt.findFirst({
        where: { studentId, taskId, ...revisionFilter },
        orderBy: { createdAt: "desc" },
        select: { id: true, feedbackStage: true, taskRevisionId: true },
      }),
      prisma.variantAttemptAnswer.findFirst({
        where: { taskId, ...revisionFilter, attempt: { studentId } },
        select: { id: true, taskRevisionId: true },
      }),
      prisma.variantAttemptAnswer.findFirst({
        where: {
          taskId,
          ...revisionFilter,
          attempt: { studentId, status: "SUBMITTED" },
        },
        select: { id: true, taskRevisionId: true },
      }),
      prisma.studentDiagnosticItem.findFirst({
        where: {
          taskId,
          ...revisionFilter,
          isCorrect: { not: null },
          attempt: { studentId, status: "COMPLETED" },
        },
        select: { id: true, taskRevisionId: true },
      }),
    ]);

  const hasAttempt = Boolean(
    homeworkAnswer || practiceAttempt || variantAnswer || diagnosticItem
  );
  const canViewPublished = Boolean(
    homeworkAnswer ||
      practiceAttempt?.feedbackStage === "SOLUTION" ||
      submittedVariantAnswer ||
      diagnosticItem
  );

  const taskRevisionId =
    practiceAttempt?.taskRevisionId ??
    submittedVariantAnswer?.taskRevisionId ??
    variantAnswer?.taskRevisionId ??
    homeworkAnswer?.taskRevisionId ??
    diagnosticItem?.taskRevisionId ??
    null;

  return { hasAttempt, canViewPublished, taskRevisionId };
}
