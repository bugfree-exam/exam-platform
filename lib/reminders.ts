import "server-only";

import {
  ReminderKind,
  ReminderResourceType,
  StudentAccountStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
const OVERDUE_WINDOW_MS = 72 * 60 * 60 * 1000;

function formatDeadline(deadline: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(deadline);
}

function hasSubmissionAfter(
  attempts: { studentId: string; submittedAt: Date | null }[],
  studentId: string,
  assignedAt: Date
) {
  return attempts.some(
    (attempt) =>
      attempt.studentId === studentId &&
      attempt.submittedAt !== null &&
      attempt.submittedAt >= assignedAt
  );
}

function buildMessage({
  studentName,
  title,
  deadline,
  overdue,
  url,
  resourceLabel,
}: {
  studentName: string;
  title: string;
  deadline: Date;
  overdue: boolean;
  url: string;
  resourceLabel: string;
}) {
  const firstName = studentName.trim().split(/\s+/)[0] || "Привет";
  const deadlineLabel = formatDeadline(deadline);

  if (overdue) {
    return `${firstName}, ${resourceLabel.toLowerCase()} «${title}» уже просрочено. Дедлайн был ${deadlineLabel} МСК. Если работа ещё не сдана, постарайся закрыть её как можно скорее.\n\n${url}`;
  }

  return `${firstName}, напоминаю про ${resourceLabel.toLowerCase()} «${title}». Дедлайн — ${deadlineLabel} МСК. До сдачи осталось меньше суток.\n\n${url}`;
}

async function alreadyDelivered({
  studentId,
  kind,
  resourceType,
  resourceId,
  deadlineAt,
}: {
  studentId: string;
  kind: ReminderKind;
  resourceType: ReminderResourceType;
  resourceId: string;
  deadlineAt: Date;
}) {
  return prisma.reminderDelivery.findUnique({
    where: {
      studentId_channel_kind_resourceType_resourceId_deadlineAt: {
        studentId,
        channel: "TELEGRAM",
        kind,
        resourceType,
        resourceId,
        deadlineAt,
      },
    },
    select: { id: true },
  });
}

async function deliverReminder({
  studentId,
  chatId,
  kind,
  resourceType,
  resourceId,
  deadlineAt,
  text,
}: {
  studentId: string;
  chatId: string;
  kind: ReminderKind;
  resourceType: ReminderResourceType;
  resourceId: string;
  deadlineAt: Date;
  text: string;
}) {
  const existing = await alreadyDelivered({
    studentId,
    kind,
    resourceType,
    resourceId,
    deadlineAt,
  });

  if (existing) {
    return "skipped" as const;
  }

  await sendTelegramMessage({ chatId, text });

  await prisma.reminderDelivery.create({
    data: {
      studentId,
      channel: "TELEGRAM",
      kind,
      resourceType,
      resourceId,
      deadlineAt,
    },
  });

  return "sent" as const;
}

export async function processStudentReminders() {
  const now = new Date();
  const dueSoonUntil = new Date(now.getTime() + DUE_SOON_WINDOW_MS);
  const overdueSince = new Date(now.getTime() - OVERDUE_WINDOW_MS);
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") || "";

  const [homeworkAssignments, variantAssignments] = await Promise.all([
    prisma.homeworkAssignment.findMany({
      where: {
        student: {
          studentStatus: StudentAccountStatus.ACTIVE,
          telegramNotificationsEnabled: true,
          telegramChatId: { not: null },
        },
        homework: {
          status: "ASSIGNED",
          deadline: {
            gte: overdueSince,
            lte: dueSoonUntil,
          },
        },
      },
      select: {
        assignedAt: true,
        studentId: true,
        student: {
          select: {
            name: true,
            telegramChatId: true,
          },
        },
        homework: {
          select: {
            id: true,
            title: true,
            deadline: true,
            attempts: {
              where: { status: "SUBMITTED" },
              select: {
                studentId: true,
                submittedAt: true,
              },
            },
          },
        },
      },
    }),
    prisma.variantAssignment.findMany({
      where: {
        student: {
          studentStatus: StudentAccountStatus.ACTIVE,
          telegramNotificationsEnabled: true,
          telegramChatId: { not: null },
        },
        deadline: {
          gte: overdueSince,
          lte: dueSoonUntil,
        },
      },
      select: {
        assignedAt: true,
        studentId: true,
        deadline: true,
        student: {
          select: {
            name: true,
            telegramChatId: true,
          },
        },
        variant: {
          select: {
            id: true,
            title: true,
            attempts: {
              where: { status: "SUBMITTED" },
              select: {
                studentId: true,
                submittedAt: true,
              },
            },
          },
        },
      },
    }),
  ]);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const assignment of homeworkAssignments) {
    const deadline = assignment.homework.deadline;
    const chatId = assignment.student.telegramChatId;

    if (!deadline || !chatId) continue;
    if (
      hasSubmissionAfter(
        assignment.homework.attempts,
        assignment.studentId,
        assignment.assignedAt
      )
    ) {
      continue;
    }

    const overdue = deadline < now;
    const kind = overdue
      ? ReminderKind.HOMEWORK_OVERDUE
      : ReminderKind.HOMEWORK_DUE_SOON;

    try {
      const result = await deliverReminder({
        studentId: assignment.studentId,
        chatId,
        kind,
        resourceType: ReminderResourceType.HOMEWORK,
        resourceId: assignment.homework.id,
        deadlineAt: deadline,
        text: buildMessage({
          studentName: assignment.student.name,
          title: assignment.homework.title,
          deadline,
          overdue,
          url: `${appUrl}/student/homeworks/${assignment.homework.id}`,
          resourceLabel: "Домашнее задание",
        }),
      });

      if (result === "sent") {
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      errors.push(
        `homework:${assignment.homework.id}:${assignment.studentId}:${String(error)}`
      );
    }
  }

  for (const assignment of variantAssignments) {
    const deadline = assignment.deadline;
    const chatId = assignment.student.telegramChatId;

    if (!deadline || !chatId) continue;
    if (
      hasSubmissionAfter(
        assignment.variant.attempts,
        assignment.studentId,
        assignment.assignedAt
      )
    ) {
      continue;
    }

    const overdue = deadline < now;
    const kind = overdue
      ? ReminderKind.VARIANT_OVERDUE
      : ReminderKind.VARIANT_DUE_SOON;

    try {
      const result = await deliverReminder({
        studentId: assignment.studentId,
        chatId,
        kind,
        resourceType: ReminderResourceType.VARIANT,
        resourceId: assignment.variant.id,
        deadlineAt: deadline,
        text: buildMessage({
          studentName: assignment.student.name,
          title: assignment.variant.title,
          deadline,
          overdue,
          url: `${appUrl}/student/variants/${assignment.variant.id}`,
          resourceLabel: "Вариант",
        }),
      });

      if (result === "sent") {
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      errors.push(
        `variant:${assignment.variant.id}:${assignment.studentId}:${String(error)}`
      );
    }
  }

  return {
    checked: homeworkAssignments.length + variantAssignments.length,
    sent,
    skipped,
    errors,
  };
}
