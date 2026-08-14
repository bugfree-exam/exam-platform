import "server-only";

import { prisma } from "@/lib/prisma";
import { getMasteryState } from "@/lib/mastery";
import { selectRecoveryQueue } from "@/lib/roadmapPolicy";
import { getStudentErrorQueue } from "@/lib/studentErrors";
import { getStudentJourneyOverview } from "@/lib/studentJourney";

const DAY_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_LOOKBACK_DAYS = 45;

export type TodayItem = {
  key: string;
  kind:
    | "OVERDUE"
    | "DUE_SOON"
    | "ASSIGNED"
    | "PRACTICE"
    | "WEBINAR"
    | "ONBOARDING"
    | "DIAGNOSTIC"
    | "ROADMAP"
    | "ERROR_REVIEW"
    | "RECOVERY";
  title: string;
  description: string;
  why: string;
  href: string;
  checkHref?: string;
  action: string;
  priority: number;
  estimatedMinutes: number;
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
      why: "Учитель назначил эту работу как часть текущего учебного блока.",
      href,
      action: "Открыть",
      priority: 30,
      estimatedMinutes: 30,
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
      why: "Дедлайн прошёл: сначала оцените объём и закройте долг или включите восстановление.",
      href,
      action: "Закрыть долг",
      priority: 100,
      estimatedMinutes: 30,
    };
  }

  if (diff <= DAY_MS) {
    const hours = Math.max(1, Math.ceil(diff / (60 * 60 * 1000)));
    return {
      key,
      kind: "DUE_SOON",
      title,
      description: `До дедлайна около ${hours} ч · ${formatDeadline(deadline)} МСК`,
      why: "До дедлайна меньше суток, поэтому эта работа выше обычной практики.",
      href,
      action: "Продолжить",
      priority: 80,
      estimatedMinutes: 30,
    };
  }

  return {
    key,
    kind: "ASSIGNED",
    title,
    description: `Дедлайн ${formatDeadline(deadline)} МСК`,
    why: "Работа уже назначена и учтена в вашем календаре подготовки.",
    href,
    action: "Открыть",
    priority: 40,
    estimatedMinutes: 30,
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
          countsForMastery: true,
          taskRevision: { select: { egeNumber: true } },
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
              countsForMastery: true,
              taskRevision: { select: { egeNumber: true } },
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
              countsForMastery: true,
              taskRevision: { select: { egeNumber: true } },
            },
          },
        },
      }),
    ]);

  const items: TodayItem[] = [];

  const [journey, decisions, errorQueue] = await Promise.all([
    getStudentJourneyOverview(studentId),
    prisma.studentQueueDecision.findMany({ where: { studentId } }),
    getStudentErrorQueue(studentId),
  ]);

  if (!journey.profile) {
    items.push({
      key: "onboarding-profile",
      kind: "ONBOARDING",
      title: "Настроить цель и темп подготовки",
      description: "3 минуты · цель, дата экзамена и реальное время в неделю",
      why: "Без этих данных платформа не сможет отличить полезный план от перегрузки.",
      href: "/student/start",
      action: "Настроить старт",
      priority: 120,
      estimatedMinutes: 3,
    });
  } else if (!journey.diagnostic || journey.diagnostic.status !== "COMPLETED") {
    items.push({
      key: "entry-diagnostic",
      kind: "DIAGNOSTIC",
      title: "Определить точку старта",
      description: journey.diagnostic ? "Диагностика уже начата — ответы сохранены" : "Короткая входная диагностика по доступным блокам",
      why: "Маршрут должен учитывать зависимости между темами, а не начинать со случайного номера.",
      href: "/student/diagnostic",
      action: journey.diagnostic ? "Продолжить" : "Начать диагностику",
      priority: 110,
      estimatedMinutes: 35,
    });
  }

  if (journey.recovery) {
    items.push({
      key: `recovery-${journey.recovery.id}`,
      kind: "RECOVERY",
      title: `Главная цель недели: ${journey.recovery.mainGoal}`,
      description: `Облегчённый режим · ${journey.recovery.weeklyMinutes} минут в неделю`,
      why: "Сейчас важнее восстановить ритм короткими победами, чем закрыть всю накопившуюся очередь.",
      href: "/student/recovery",
      action: "Открыть восстановление",
      priority: 115,
      estimatedMinutes: 5,
    });
  }

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

  for (const attempt of practiceAttempts) {
    if (attempt.countsForMastery) addAnswer(attempt.taskRevision.egeNumber, attempt.isCorrect);
  }
  for (const attempt of homeworkAttempts) {
    for (const answer of attempt.answers) {
      if (answer.countsForMastery) addAnswer(answer.taskRevision.egeNumber, answer.isCorrect);
    }
  }
  for (const attempt of variantAttempts) {
    for (const answer of attempt.answers) {
      if (answer.countsForMastery) addAnswer(answer.taskRevision.egeNumber, answer.isCorrect);
    }
  }

  const focus = Array.from(taskStats.entries())
    .map(([egeNumber, stat]) => ({
      egeNumber,
      ...stat,
      percent: Math.round((stat.correct / stat.total) * 100),
    }))
    .filter((stat) => {
      const state = getMasteryState(stat.total, stat.percent);
      return state === "CRITICAL_GAP" || state === "PRACTICE";
    })
    .sort((a, b) => a.percent - b.percent || b.total - a.total)[0];

  if (focus) {
    items.push({
      key: `practice-${focus.egeNumber}`,
      kind: "PRACTICE",
      title: `Повторить задание №${focus.egeNumber}`,
      description: `${focus.correct} из ${focus.total} верно за последние ${ANALYTICS_LOOKBACK_DAYS} дней · точность ${focus.percent}%`,
      why: "Это самый слабый из номеров с достаточным количеством независимых ответов.",
      href: `/student/trainer/${focus.egeNumber}`,
      checkHref: `/student/trainer/${focus.egeNumber}?mode=control`,
      action: "Потренироваться",
      priority: 20,
      estimatedMinutes: journey.profile?.sessionMinutes ?? 30,
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
      why: "Это ближайшая живая встреча в опубликованном расписании.",
      href: upcomingWebinar.joinUrl,
      action: "Открыть ссылку",
      priority: 10,
      estimatedMinutes: 90,
    });
  }

  const currentMilestone = journey.roadmap?.milestones.find(
    (milestone) => milestone.status === "ACTIVE",
  );
  const routeNumbers = currentMilestone?.egeNumbers as number[] | undefined;
  const routeNumber = routeNumbers?.[0];
  if (currentMilestone) {
    items.push({
      key: `roadmap-${currentMilestone.id}`,
      kind: "ROADMAP",
      title: currentMilestone.title,
      description: `${currentMilestone.description} · ${currentMilestone.plannedMinutes} минут на неделю`,
      why: currentMilestone.reason,
      href: routeNumber ? `/student/trainer/${routeNumber}` : "/student/variants",
      checkHref: routeNumber ? `/student/trainer/${routeNumber}?mode=control` : undefined,
      action: routeNumber ? `Начать с №${routeNumber}` : "Открыть варианты",
      priority: 25,
      estimatedMinutes: journey.profile?.sessionMinutes ?? 30,
    });
  }

  const unresolvedErrors = errorQueue.filter(
    (item) => item.correction?.status !== "CORRECTED" && item.correction?.status !== "VERIFIED",
  ).length;
  if (unresolvedErrors > 0) {
    items.push({
      key: "error-corrections",
      kind: "ERROR_REVIEW",
      title: `Исправить ошибки: ${unresolvedErrors}`,
      description: "Определить причину, решить заново и поставить контрольное повторение",
      why: "Ошибка без коррекции с высокой вероятностью повторится в следующей работе.",
      href: "/student/errors",
      action: "Начать исправление",
      priority: 60,
      estimatedMinutes: 20,
    });
  }

  const dueControlErrors = errorQueue.filter(
    (item) =>
      item.correction?.status === "CORRECTED" &&
      item.correction.scheduledFor !== null &&
      item.correction.scheduledFor <= now,
  ).length;
  if (dueControlErrors > 0) {
    items.push({
      key: "error-control",
      kind: "ERROR_REVIEW",
      title: `Проверить исправленные ошибки: ${dueControlErrors}`,
      description: "Решить новые независимые задачи по тем же номерам",
      why: "После паузы нужно убедиться, что исправление стало устойчивым навыком.",
      href: "/student/errors",
      action: "Пройти контроль",
      priority: 55,
      estimatedMinutes: 20,
    });
  }

  const decisionByKey = new Map(decisions.map((decision) => [decision.itemKey, decision]));
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const visible = items.filter((item) => {
    const decision = decisionByKey.get(item.key);
    if (!decision) return true;
    if (decision.state === "DISMISSED") return false;
    if (decision.state === "SNOOZED" && decision.scheduledFor && decision.scheduledFor > endOfToday) return false;
    return true;
  });
  const sorted = visible.sort((a, b) => b.priority - a.priority);
  if (journey.recovery) {
    const recoveryCard = sorted.filter((item) => item.kind === "RECOVERY");
    const workingItems = sorted.filter((item) => item.kind !== "RECOVERY");
    return [...recoveryCard, ...selectRecoveryQueue(workingItems, journey.recovery.weeklyMinutes)].slice(0, 3);
  }
  return sorted.slice(0, 7);
}
