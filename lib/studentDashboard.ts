import "server-only";

import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_LOOKBACK_DAYS = 45;

export type TodayItem = {
  key: string;
  kind: "OVERDUE" | "DUE_SOON" | "ASSIGNED" | "PRACTICE" | "WEBINAR";
  title: string;
  description: string;
  href: string;
  action: string;
  priority: number;
};

function formatDeadline(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function deadlineItem({
  key,
  title,
  href,
  deadline,
  submitted,
}: {
  key: string;
  title: string;
  href: string;
  deadline: Date | null;
  submitted: boolean;
}): TodayItem | null {
  if (submitted) return null;

  if (!deadline) {
    return {
      key,
      kind: "ASSIGNED",
      title,
      description: "Работа назначена и ждёт выполнения",
      href,
      action: "Открыть",
      priority: 30,
    };
  }

  const now = Date.now();
  const diff = deadline.getTime() - now;

  if (diff < 0) {
    return {
      key,
      kind: "OVERDUE",
      title,
      description: `Просрочено · дедлайн был ${formatDeadline(deadline)} МСК`,
      href,
      action: "Закрыть долг",
      priority: 100,
    };
  }

  if (diff <= DAY_MS) {
    const hours = Math.max(1, Math.ceil(diff / (60 * 60 * 1000)));
    return {
      key,
      kind: "DUE_SOON",
      title,
      description: `До дедлайна около ${hours} ч · ${formatDeadline(deadline)} МСК`,
      href,
      action: "Продолжить",
      priority: 80,
    };
  }

  return {
    key,
    kind: "ASSIGNED",
    title,
    description: `Дедлайн ${formatDeadline(deadline)} МСК`,
    href,
    action: "Открыть",
    priority: 40,
  };
}

export async function getStudentToday(studentId: string) {
  const now = new Date();
  const lookback = new Date(now.getTime() - ANALYTICS_LOOKBACK_DAYS * DAY_MS);

  const [homeworkAssignments, variantAssignments, upcomingWebinar, practiceAttempts, homeworkAttempts, variantAttempts] =
    await Promise.all([
      prisma.homeworkAssignment.findMany({
        where: {
          studentId,
          homework: { status: "ASSIGNED" },
        },
        select: {
          id: true,
          homework: {
            select: {
              id: true,
              title: true,
              deadline: true,
              attempts: {
                where: { studentId, status: "SUBMITTED" },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
        take: 12,
      }),
      prisma.variantAssignment.findMany({
        where: { studentId },
        select: {
          id: true,
          deadline: true,
          variant: {
            select: {
              id: true,
              title: true,
              attempts: {
                where: { studentId, status: "SUBMITTED" },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
        take: 12,
      }),
      prisma.webinarSchedule.findFirst({
        where: { isPublished: true, scheduledAt: { gte: now } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.practiceAttempt.findMany({
        where: { studentId, createdAt: { gte: lookback } },
        orderBy: { createdAt: "desc" },
        take: 120,
        select: {
          isCorrect: true,
          task: { select: { egeNumber: true } },
        },
      }),
      prisma.attempt.findMany({
        where: {
          studentId,
          status: "SUBMITTED",
          submittedAt: { gte: lookback },
        },
        orderBy: { submittedAt: "desc" },
        take: 20,
        select: {
          answers: {
            select: {
              isCorrect: true,
              task: { select: { egeNumber: true } },
            },
          },
        },
      }),
      prisma.variantAttempt.findMany({
        where: {
          studentId,
          status: "SUBMITTED",
          submittedAt: { gte: lookback },
        },
        orderBy: { submittedAt: "desc" },
        take: 8,
        select: {
          answers: {
            select: {
              isCorrect: true,
              task: { select: { egeNumber: true } },
            },
          },
        },
      }),
    ]);

  const items: TodayItem[] = [];

  for (const assignment of homeworkAssignments) {
    const item = deadlineItem({
      key: `homework-${assignment.id}`,
      title: assignment.homework.title,
      href: `/student/homeworks/${assignment.homework.id}`,
      deadline: assignment.homework.deadline,
      submitted: assignment.homework.attempts.length > 0,
    });
    if (item) items.push(item);
  }

  for (const assignment of variantAssignments) {
    const item = deadlineItem({
      key: `variant-${assignment.id}`,
      title: assignment.variant.title,
      href: `/student/variants/${assignment.variant.id}`,
      deadline: assignment.deadline,
      submitted: assignment.variant.attempts.length > 0,
    });
    if (item) items.push(item);
  }

  const taskStats = new Map<number, { total: number; correct: number }>();
  const addAnswer = (egeNumber: number, isCorrect: boolean) => {
    const stat = taskStats.get(egeNumber) ?? { total: 0, correct: 0 };
    stat.total += 1;
    if (isCorrect) stat.correct += 1;
    taskStats.set(egeNumber, stat);
  };

  for (const attempt of practiceAttempts) addAnswer(attempt.task.egeNumber, attempt.isCorrect);
  for (const attempt of homeworkAttempts) {
    for (const answer of attempt.answers) addAnswer(answer.task.egeNumber, answer.isCorrect);
  }
  for (const attempt of variantAttempts) {
    for (const answer of attempt.answers) addAnswer(answer.task.egeNumber, answer.isCorrect);
  }

  const focus = Array.from(taskStats.entries())
    .map(([egeNumber, stat]) => ({
      egeNumber,
      ...stat,
      percent: Math.round((stat.correct / stat.total) * 100),
    }))
    .filter((stat) => stat.total >= 3 && stat.percent < 70)
    .sort((a, b) => a.percent - b.percent || b.total - a.total)[0];

  if (focus) {
    items.push({
      key: `practice-${focus.egeNumber}`,
      kind: "PRACTICE",
      title: `Повторить задание №${focus.egeNumber}`,
      description: `${focus.correct} из ${focus.total} верно за последние ${ANALYTICS_LOOKBACK_DAYS} дней · точность ${focus.percent}%`,
      href: `/student/trainer/${focus.egeNumber}`,
      action: "Потренироваться",
      priority: 20,
    });
  }

  if (upcomingWebinar) {
    const date = new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(upcomingWebinar.scheduledAt);

    items.push({
      key: `webinar-${upcomingWebinar.id}`,
      kind: "WEBINAR",
      title: upcomingWebinar.topic,
      description: `Ближайший вебинар · ${date} МСК`,
      href: upcomingWebinar.joinUrl,
      action: "Открыть ссылку",
      priority: 10,
    });
  }

  return items.sort((a, b) => b.priority - a.priority).slice(0, 5);
}
