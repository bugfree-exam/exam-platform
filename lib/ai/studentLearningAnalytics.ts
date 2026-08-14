import "server-only";

import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";
import { analyzeStudentLearning } from "./analytics";
import type { LearningAnswer } from "./types";

export async function getStudentLearningAnalytics(studentId: string) {
  const [homeworkAttempts, practiceAttempts, variantAttempts, diagnostics] =
    await Promise.all([
      prisma.attempt.findMany({
        where: { studentId, status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 200,
        select: {
          submittedAt: true,
          answers: {
            select: {
              taskId: true,
              isCorrect: true,
              countsForMastery: true,
              taskRevision: { select: { egeNumber: true, skillTag: true } },
            },
          },
        },
      }),
      prisma.practiceAttempt.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: {
          taskId: true,
          createdAt: true,
          isCorrect: true,
          countsForMastery: true,
          errorCause: true,
          taskRevision: { select: { egeNumber: true, skillTag: true } },
        },
      }),
      prisma.variantAttempt.findMany({
        where: { studentId, status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 100,
        select: {
          score: true,
          submittedAt: true,
          answers: {
            select: {
              taskId: true,
              isCorrect: true,
              countsForMastery: true,
              taskRevision: { select: { egeNumber: true, skillTag: true } },
            },
          },
        },
      }),
      prisma.studentDiagnosticAttempt.findMany({
        where: { studentId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 10,
        select: {
          completedAt: true,
          items: {
            select: {
              taskId: true,
              isCorrect: true,
              countsForMastery: true,
              taskRevision: { select: { egeNumber: true, skillTag: true } },
            },
          },
        },
      }),
    ]);

  const answers: LearningAnswer[] = [];

  for (const attempt of homeworkAttempts) {
    if (!attempt.submittedAt) continue;
    for (const answer of attempt.answers) {
      answers.push({
        taskId: answer.taskId,
        egeNumber: answer.taskRevision.egeNumber,
        skillTag: answer.taskRevision.skillTag,
        isCorrect: answer.isCorrect,
        countsForMastery: answer.countsForMastery,
        attemptedAt: attempt.submittedAt,
        source: "HOMEWORK",
      });
    }
  }

  for (const attempt of practiceAttempts) {
    answers.push({
      taskId: attempt.taskId,
      egeNumber: attempt.taskRevision.egeNumber,
      skillTag: attempt.taskRevision.skillTag,
      errorCause: attempt.errorCause,
      isCorrect: attempt.isCorrect,
      countsForMastery: attempt.countsForMastery,
      attemptedAt: attempt.createdAt,
      source: "PRACTICE",
    });
  }

  for (const attempt of variantAttempts) {
    if (!attempt.submittedAt) continue;
    for (const answer of attempt.answers) {
      answers.push({
        taskId: answer.taskId,
        egeNumber: answer.taskRevision.egeNumber,
        skillTag: answer.taskRevision.skillTag,
        isCorrect: answer.isCorrect,
        countsForMastery: answer.countsForMastery,
        attemptedAt: attempt.submittedAt,
        source: "VARIANT",
      });
    }
  }

  for (const diagnostic of diagnostics) {
    if (!diagnostic.completedAt) continue;
    for (const item of diagnostic.items) {
      if (item.isCorrect === null) continue;
      answers.push({
        taskId: item.taskId,
        egeNumber: item.taskRevision.egeNumber,
        skillTag: item.taskRevision.skillTag,
        isCorrect: item.isCorrect,
        countsForMastery: item.countsForMastery,
        attemptedAt: diagnostic.completedAt,
        source: "DIAGNOSTIC",
      });
    }
  }

  return analyzeStudentLearning({
    answers,
    variants: variantAttempts.flatMap((attempt) =>
      attempt.submittedAt
        ? [{
            primaryScore: attempt.score,
            testScore: primaryToEgeTestScore(attempt.score),
            submittedAt: attempt.submittedAt,
          }]
        : []
    ),
  });
}
