import "server-only";

import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";
import { analyzeStudentLearning } from "./analytics";
import type { LearningAnswer } from "./types";

export async function getStudentLearningAnalytics(studentId: string) {
  const [homeworkAttempts, practiceAttempts, variantAttempts] =
    await Promise.all([
      prisma.attempt.findMany({
        where: { studentId, status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 200,
        select: {
          submittedAt: true,
          answers: {
            select: {
              isCorrect: true,
              task: { select: { egeNumber: true } },
            },
          },
        },
      }),
      prisma.practiceAttempt.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: {
          createdAt: true,
          isCorrect: true,
          task: { select: { egeNumber: true } },
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
              isCorrect: true,
              task: { select: { egeNumber: true } },
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
        egeNumber: answer.task.egeNumber,
        isCorrect: answer.isCorrect,
        attemptedAt: attempt.submittedAt,
        source: "HOMEWORK",
      });
    }
  }

  for (const attempt of practiceAttempts) {
    answers.push({
      egeNumber: attempt.task.egeNumber,
      isCorrect: attempt.isCorrect,
      attemptedAt: attempt.createdAt,
      source: "PRACTICE",
    });
  }

  for (const attempt of variantAttempts) {
    if (!attempt.submittedAt) continue;
    for (const answer of attempt.answers) {
      answers.push({
        egeNumber: answer.task.egeNumber,
        isCorrect: answer.isCorrect,
        attemptedAt: attempt.submittedAt,
        source: "VARIANT",
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
