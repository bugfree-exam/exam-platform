import "server-only";

import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AnalyticsPeriod = "30" | "90" | "all";

export type TaskSkill = {
  egeNumber: number;
  total: number;
  correct: number;
  incorrect: number;
  percent: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  status: "INSUFFICIENT" | "FOCUS" | "GROWING" | "STRONG";
  recentPercent: number | null;
  previousPercent: number | null;
  trend: number | null;
};

type AnswerRecord = {
  egeNumber: number;
  isCorrect: boolean;
  date: Date;
};

export type ResultHistoryItem = {
  id: string;
  source: "HOMEWORK" | "PRACTICE" | "VARIANT";
  title: string;
  href: string;
  percent: number;
  score: number;
  maxScore: number;
  testScore: number | null;
  date: Date;
};

function getPeriodStart(period: AnalyticsPeriod) {
  if (period === "all") return null;
  const days = Number(period);
  return new Date(Date.now() - days * DAY_MS);
}

function skillStatus(total: number, percent: number): TaskSkill["status"] {
  if (total < 3) return "INSUFFICIENT";
  if (percent < 50) return "FOCUS";
  if (percent < 80) return "GROWING";
  return "STRONG";
}

function confidence(total: number): TaskSkill["confidence"] {
  if (total < 3) return "LOW";
  if (total < 7) return "MEDIUM";
  return "HIGH";
}

function percent(correct: number, total: number) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

export async function getStudentAnalytics(
  studentId: string,
  period: AnalyticsPeriod
) {
  const periodStart = getPeriodStart(period);
  const now = new Date();
  const recentStart = new Date(now.getTime() - 14 * DAY_MS);
  const previousStart = new Date(now.getTime() - 28 * DAY_MS);

  const submittedDateFilter = periodStart ? { gte: periodStart } : undefined;
  const createdDateFilter = periodStart ? { gte: periodStart } : undefined;

  const [homeworkAttempts, practiceAttempts, variantAttempts, recentVariants] =
    await Promise.all([
      prisma.attempt.findMany({
        where: {
          studentId,
          status: "SUBMITTED",
          ...(submittedDateFilter
            ? { submittedAt: submittedDateFilter }
            : {}),
        },
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          homeworkId: true,
          score: true,
          maxScore: true,
          percent: true,
          submittedAt: true,
          homework: {
            select: { title: true, deadline: true },
          },
          answers: {
            select: {
              isCorrect: true,
              task: { select: { egeNumber: true } },
            },
          },
        },
      }),
      prisma.practiceAttempt.findMany({
        where: {
          studentId,
          ...(createdDateFilter ? { createdAt: createdDateFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          taskId: true,
          isCorrect: true,
          createdAt: true,
          task: { select: { egeNumber: true } },
        },
      }),
      prisma.variantAttempt.findMany({
        where: {
          studentId,
          status: "SUBMITTED",
          ...(submittedDateFilter
            ? { submittedAt: submittedDateFilter }
            : {}),
        },
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          variantId: true,
          score: true,
          maxScore: true,
          percent: true,
          submittedAt: true,
          variant: { select: { title: true } },
          answers: {
            select: {
              isCorrect: true,
              task: { select: { egeNumber: true } },
            },
          },
        },
      }),
      prisma.variantAttempt.findMany({
        where: { studentId, status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: {
          id: true,
          variantId: true,
          score: true,
          maxScore: true,
          submittedAt: true,
          variant: { select: { title: true } },
        },
      }),
    ]);

  const answers: AnswerRecord[] = [];

  for (const attempt of homeworkAttempts) {
    const date = attempt.submittedAt ?? now;
    for (const answer of attempt.answers) {
      answers.push({
        egeNumber: answer.task.egeNumber,
        isCorrect: answer.isCorrect,
        date,
      });
    }
  }

  for (const attempt of practiceAttempts) {
    answers.push({
      egeNumber: attempt.task.egeNumber,
      isCorrect: attempt.isCorrect,
      date: attempt.createdAt,
    });
  }

  for (const attempt of variantAttempts) {
    const date = attempt.submittedAt ?? now;
    for (const answer of attempt.answers) {
      answers.push({
        egeNumber: answer.task.egeNumber,
        isCorrect: answer.isCorrect,
        date,
      });
    }
  }

  const taskMap = new Map<
    number,
    {
      total: number;
      correct: number;
      recentTotal: number;
      recentCorrect: number;
      previousTotal: number;
      previousCorrect: number;
    }
  >();

  for (const answer of answers) {
    const stat = taskMap.get(answer.egeNumber) ?? {
      total: 0,
      correct: 0,
      recentTotal: 0,
      recentCorrect: 0,
      previousTotal: 0,
      previousCorrect: 0,
    };

    stat.total += 1;
    if (answer.isCorrect) stat.correct += 1;

    if (answer.date >= recentStart) {
      stat.recentTotal += 1;
      if (answer.isCorrect) stat.recentCorrect += 1;
    } else if (answer.date >= previousStart) {
      stat.previousTotal += 1;
      if (answer.isCorrect) stat.previousCorrect += 1;
    }

    taskMap.set(answer.egeNumber, stat);
  }

  const skills: TaskSkill[] = Array.from(taskMap.entries())
    .map(([egeNumber, stat]) => {
      const overall = percent(stat.correct, stat.total);
      const recentPercent =
        stat.recentTotal >= 2
          ? percent(stat.recentCorrect, stat.recentTotal)
          : null;
      const previousPercent =
        stat.previousTotal >= 2
          ? percent(stat.previousCorrect, stat.previousTotal)
          : null;

      return {
        egeNumber,
        total: stat.total,
        correct: stat.correct,
        incorrect: stat.total - stat.correct,
        percent: overall,
        confidence: confidence(stat.total),
        status: skillStatus(stat.total, overall),
        recentPercent,
        previousPercent,
        trend:
          recentPercent !== null && previousPercent !== null
            ? recentPercent - previousPercent
            : null,
      };
    })
    .sort((a, b) => a.egeNumber - b.egeNumber);

  const totalAnswers = answers.length;
  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
  const accuracy = percent(correctAnswers, totalAnswers);

  const completedHomeworkCount = homeworkAttempts.length;
  const homeworkOnTimeCount = homeworkAttempts.filter((attempt) => {
    if (!attempt.homework.deadline || !attempt.submittedAt) return true;
    return attempt.submittedAt <= attempt.homework.deadline;
  }).length;
  const homeworkOnTimePercent = percent(
    homeworkOnTimeCount,
    completedHomeworkCount
  );

  const readinessScores = [...recentVariants]
    .reverse()
    .map((attempt) => primaryToEgeTestScore(attempt.score));
  const readiness =
    readinessScores.length === 0
      ? null
      : Math.round(
          readinessScores.reduce((sum, score) => sum + score, 0) /
            readinessScores.length
        );
  const latestTestScore = readinessScores.at(-1) ?? null;
  const readinessTrend =
    readinessScores.length > 1
      ? readinessScores[readinessScores.length - 1] - readinessScores[0]
      : null;

  const focusSkills = [...skills]
    .filter((skill) => skill.total >= 3 && skill.percent < 70)
    .sort((a, b) => a.percent - b.percent || b.total - a.total)
    .slice(0, 3);

  const strongSkills = [...skills]
    .filter((skill) => skill.total >= 5 && skill.percent >= 80)
    .sort((a, b) => b.percent - a.percent || b.total - a.total)
    .slice(0, 3);

  const history: ResultHistoryItem[] = [
    ...homeworkAttempts.slice(0, 20).map((attempt) => ({
      id: attempt.id,
      source: "HOMEWORK" as const,
      title: attempt.homework.title,
      href: `/student/homeworks/${attempt.homeworkId}`,
      percent: Math.round(attempt.percent),
      score: attempt.score,
      maxScore: attempt.maxScore,
      testScore: null,
      date: attempt.submittedAt ?? now,
    })),
    ...practiceAttempts.slice(0, 30).map((attempt) => ({
      id: attempt.id,
      source: "PRACTICE" as const,
      title: `Тренажёр · №${attempt.task.egeNumber}`,
      href: `/student/trainer/${attempt.task.egeNumber}?task=${attempt.taskId}`,
      percent: attempt.isCorrect ? 100 : 0,
      score: attempt.isCorrect ? 1 : 0,
      maxScore: 1,
      testScore: null,
      date: attempt.createdAt,
    })),
    ...variantAttempts.slice(0, 20).map((attempt) => ({
      id: attempt.id,
      source: "VARIANT" as const,
      title: attempt.variant.title,
      href: `/student/variants/${attempt.variantId}/results/${attempt.id}`,
      percent: Math.round(attempt.percent),
      score: attempt.score,
      maxScore: attempt.maxScore,
      testScore: primaryToEgeTestScore(attempt.score),
      date: attempt.submittedAt ?? now,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 30);

  return {
    period,
    readiness,
    latestTestScore,
    readinessTrend,
    variantCountForReadiness: readinessScores.length,
    accuracy,
    totalAnswers,
    correctAnswers,
    practiceCount: practiceAttempts.length,
    completedHomeworkCount,
    homeworkOnTimePercent,
    skills,
    focusSkills,
    strongSkills,
    history,
  };
}
