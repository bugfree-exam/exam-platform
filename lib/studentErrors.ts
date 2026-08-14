import "server-only";

import { formatAnswerForDisplay } from "@/lib/answer";
import { prisma } from "@/lib/prisma";

export type StudentErrorSource = "PRACTICE" | "HOMEWORK" | "VARIANT" | "DIAGNOSTIC";

export type StudentErrorEvidence = {
  evidenceKey: string;
  source: StudentErrorSource;
  sourceLabel: string;
  occurredAt: Date;
  taskId: string;
  taskRevisionId: string;
  egeNumber: number;
  title: string;
  statementHtml: string;
  referenceHtml: string | null;
  previousAnswer: string;
  correction: {
    status: "OPEN" | "CORRECTED" | "VERIFIED";
    errorCause: string | null;
    reflection: string | null;
    scheduledFor: Date | null;
    correctedAt: Date | null;
  } | null;
};

const sourceLabels: Record<StudentErrorSource, string> = {
  PRACTICE: "Тренажёр",
  HOMEWORK: "Домашняя работа",
  VARIANT: "Вариант",
  DIAGNOSTIC: "Входная диагностика",
};

export async function getStudentErrorQueue(studentId: string) {
  const [practice, homework, variants, diagnostics] = await Promise.all([
    prisma.practiceAttempt.findMany({
      where: { studentId, isCorrect: false },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        taskId: true,
        taskRevisionId: true,
        rawAnswer: true,
        createdAt: true,
        taskRevision: {
          select: {
            egeNumber: true,
            title: true,
            statementHtml: true,
            referenceHtml: true,
          },
        },
      },
    }),
    prisma.attemptAnswer.findMany({
      where: { isCorrect: false, attempt: { studentId, status: "SUBMITTED" } },
      orderBy: { attempt: { submittedAt: "desc" } },
      take: 100,
      select: {
        id: true,
        taskId: true,
        taskRevisionId: true,
        rawAnswer: true,
        attempt: { select: { submittedAt: true } },
        taskRevision: {
          select: {
            egeNumber: true,
            title: true,
            statementHtml: true,
            referenceHtml: true,
          },
        },
      },
    }),
    prisma.variantAttemptAnswer.findMany({
      where: { isCorrect: false, attempt: { studentId, status: "SUBMITTED" } },
      orderBy: { attempt: { submittedAt: "desc" } },
      take: 100,
      select: {
        id: true,
        taskId: true,
        taskRevisionId: true,
        rawAnswer: true,
        attempt: { select: { submittedAt: true } },
        taskRevision: {
          select: {
            egeNumber: true,
            title: true,
            statementHtml: true,
            referenceHtml: true,
          },
        },
      },
    }),
    prisma.studentDiagnosticItem.findMany({
      where: { isCorrect: false, attempt: { studentId, status: "COMPLETED" } },
      orderBy: { attempt: { completedAt: "desc" } },
      take: 100,
      select: {
        id: true,
        taskId: true,
        taskRevisionId: true,
        rawAnswer: true,
        attempt: { select: { completedAt: true } },
        taskRevision: {
          select: {
            egeNumber: true,
            title: true,
            statementHtml: true,
            referenceHtml: true,
          },
        },
      },
    }),
  ]);

  const now = new Date();
  const rows = [
    ...practice.map((row) => ({ ...row, source: "PRACTICE" as const, evidenceKey: `practice:${row.id}`, occurredAt: row.createdAt })),
    ...homework.map((row) => ({ ...row, source: "HOMEWORK" as const, evidenceKey: `homework:${row.id}`, occurredAt: row.attempt.submittedAt ?? now })),
    ...variants.map((row) => ({ ...row, source: "VARIANT" as const, evidenceKey: `variant:${row.id}`, occurredAt: row.attempt.submittedAt ?? now })),
    ...diagnostics.map((row) => ({ ...row, source: "DIAGNOSTIC" as const, evidenceKey: `diagnostic:${row.id}`, occurredAt: row.attempt.completedAt ?? now })),
  ];
  const seenRevisions = new Set<string>();
  const latestRows = rows
    .sort((first, second) => second.occurredAt.getTime() - first.occurredAt.getTime())
    .filter((row) => {
      if (seenRevisions.has(row.taskRevisionId)) return false;
      seenRevisions.add(row.taskRevisionId);
      return true;
    });
  const corrections = await prisma.studentErrorCorrection.findMany({
    where: { studentId, evidenceKey: { in: latestRows.map((row) => row.evidenceKey) } },
    select: {
      evidenceKey: true,
      status: true,
      errorCause: true,
      reflection: true,
      scheduledFor: true,
      correctedAt: true,
    },
  });
  const correctionByKey = new Map(corrections.map((item) => [item.evidenceKey, item]));

  return latestRows
    .map<StudentErrorEvidence>((row) => {
      const correction = correctionByKey.get(row.evidenceKey) ?? null;
      return {
        evidenceKey: row.evidenceKey,
        source: row.source,
        sourceLabel: sourceLabels[row.source],
        occurredAt: row.occurredAt,
        taskId: row.taskId,
        taskRevisionId: row.taskRevisionId,
        egeNumber: row.taskRevision.egeNumber,
        title: row.taskRevision.title,
        statementHtml: row.taskRevision.statementHtml,
        referenceHtml: row.taskRevision.referenceHtml,
        previousAnswer: formatAnswerForDisplay(row.rawAnswer),
        correction: correction
          ? {
              ...correction,
              errorCause: correction.errorCause,
            }
          : null,
      };
    })
    .sort((first, second) => {
      const firstDone = first.correction?.status === "CORRECTED" || first.correction?.status === "VERIFIED";
      const secondDone = second.correction?.status === "CORRECTED" || second.correction?.status === "VERIFIED";
      if (firstDone !== secondDone) return firstDone ? 1 : -1;
      return second.occurredAt.getTime() - first.occurredAt.getTime();
    });
}

export async function resolveStudentErrorEvidence(studentId: string, evidenceKey: string) {
  const [source, id] = evidenceKey.split(":", 2);
  if (!id) return null;

  if (source === "practice") {
    return prisma.practiceAttempt.findFirst({
      where: { id, studentId, isCorrect: false },
      select: { taskId: true, taskRevisionId: true, taskRevision: true },
    });
  }
  if (source === "homework") {
    return prisma.attemptAnswer.findFirst({
      where: { id, isCorrect: false, attempt: { studentId, status: "SUBMITTED" } },
      select: { taskId: true, taskRevisionId: true, taskRevision: true },
    });
  }
  if (source === "variant") {
    return prisma.variantAttemptAnswer.findFirst({
      where: { id, isCorrect: false, attempt: { studentId, status: "SUBMITTED" } },
      select: { taskId: true, taskRevisionId: true, taskRevision: true },
    });
  }
  if (source === "diagnostic") {
    return prisma.studentDiagnosticItem.findFirst({
      where: { id, isCorrect: false, attempt: { studentId, status: "COMPLETED" } },
      select: { taskId: true, taskRevisionId: true, taskRevision: true },
    });
  }
  return null;
}
