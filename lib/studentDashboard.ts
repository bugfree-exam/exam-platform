import "server-only";

import type { CourseItemType } from "@prisma/client";

import { getStudentCourse } from "@/lib/course";
import { COURSE_ITEM_LABELS, getMoscowDayRange } from "@/lib/coursePolicy";
import { prisma } from "@/lib/prisma";

export type TodayItem = {
  key: string;
  kind: CourseItemType;
  title: string;
  description: string;
  why: string;
  href: string;
  action: string;
  priority: number;
  estimatedMinutes: number;
  scheduledFor: Date;
  external: boolean;
};

export type BacklogItem = {
  key: string;
  title: string;
  description: string;
  href: string;
};

function defaultHref(type: CourseItemType, egeNumbers: number[]) {
  if (type === "PRACTICE" && egeNumbers[0]) return `/student/trainer/${egeNumbers[0]}`;
  if (type === "HOMEWORK") return "/student/homeworks";
  if (type === "VARIANT" || type === "CONTROL") return "/student/variants";
  if (type === "WEBINAR" || type === "THEORY") return "/student/webinars";
  if (type === "ERROR_REVIEW") return "/student/errors";
  return "/student/route";
}

export async function getStudentToday(studentId: string, now = new Date()) {
  const course = await getStudentCourse(studentId);
  const { start, end } = getMoscowDayRange(now);
  const [scheduled, webinars, homeworkAssignments] = await Promise.all([
    course
      ? prisma.courseScheduleItem.findMany({
          where: {
            courseId: course.id,
            type: { notIn: ["WEBINAR", "HOMEWORK"] },
            scheduledFor: { gte: start, lt: end },
          },
          orderBy: [{ scheduledFor: "asc" }, { order: "asc" }],
        })
      : Promise.resolve([]),
    prisma.webinarSchedule.findMany({
      where: { isPublished: true, scheduledAt: { gte: start, lt: end } },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.homeworkAssignment.findMany({
      where: {
        studentId,
        homework: {
          status: "ASSIGNED",
          attempts: { none: { studentId, status: "SUBMITTED" } },
        },
      },
      select: {
        id: true,
        assignedAt: true,
        homework: {
          select: {
            id: true,
            title: true,
            description: true,
            deadline: true,
            _count: { select: { tasks: true } },
          },
        },
      },
      orderBy: [{ homework: { deadline: "asc" } }, { assignedAt: "asc" }],
    }),
  ]);

  const courseItems = scheduled.map((item): TodayItem => {
    const numbers = item.egeNumbers as number[];
    const href = item.href || defaultHref(item.type, numbers);
    return {
      key: `course-${item.id}`,
      kind: item.type,
      title: item.title,
      description:
        item.description ||
        `${COURSE_ITEM_LABELS[item.type]} по годовому графику курса`,
      why: "Этот пункт поставлен преподавателем в общий график курса именно на сегодня.",
      href,
      action: item.type === "WEBINAR" ? "Подключиться" : "Открыть",
      priority: 2,
      estimatedMinutes: item.estimatedMinutes,
      scheduledFor: item.scheduledFor,
      external: href.startsWith("http://") || href.startsWith("https://"),
    };
  });

  const webinarItems = webinars.map((webinar): TodayItem => ({
    key: `webinar-${webinar.id}`,
    kind: "WEBINAR",
    title: webinar.topic,
    description: webinar.announcement || "Живой вебинар по расписанию преподавателя",
    why: "Преподаватель опубликовал вебинар на сегодняшнюю дату.",
    href: webinar.joinUrl,
    action: "Подключиться",
    priority: 2,
    estimatedMinutes: 90,
    scheduledFor: webinar.scheduledAt,
    external: true,
  }));

  const formatDeadline = (value: Date) =>
    new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);

  const homeworkItems = homeworkAssignments.map((assignment): TodayItem => {
    const { homework } = assignment;
    const isOverdue = Boolean(homework.deadline && homework.deadline < now);
    const timing = isOverdue
      ? `Просрочено · срок был ${formatDeadline(homework.deadline!)}`
      : homework.deadline
        ? `Задано · срок до ${formatDeadline(homework.deadline)}`
        : "Задано · без дедлайна";

    return {
      key: `homework-${assignment.id}`,
      kind: "HOMEWORK",
      title: homework.title,
      description: homework.description
        ? `${timing}. ${homework.description}`
        : timing,
      why: isOverdue
        ? "Домашняя работа ещё не сдана, а установленный преподавателем срок уже прошёл."
        : "Домашняя работа назначена преподавателем и ещё не сдана.",
      href: `/student/homeworks/${homework.id}`,
      action: "Выполнить ДЗ",
      priority: isOverdue ? 3 : 1,
      estimatedMinutes: Math.min(
        120,
        Math.max(30, homework._count.tasks * 15),
      ),
      scheduledFor: homework.deadline ?? assignment.assignedAt,
      external: false,
    };
  });

  return [...courseItems, ...webinarItems, ...homeworkItems].sort(
    (left, right) =>
      right.priority - left.priority ||
      left.scheduledFor.getTime() - right.scheduledFor.getTime(),
  );
}

export async function getStudentBacklog(studentId: string, now = new Date()) {
  const variants = await prisma.variantAssignment.findMany({
    where: { studentId, deadline: { lt: now } },
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
    orderBy: { deadline: "asc" },
    take: 12,
  });

  const format = (value: Date | null) =>
    value
      ? new Intl.DateTimeFormat("ru-RU", {
          timeZone: "Europe/Moscow",
          day: "2-digit",
          month: "short",
        }).format(value)
      : "без даты";

  return [
    ...variants.flatMap((assignment): BacklogItem[] =>
      assignment.variant.attempts.length
        ? []
        : [{
            key: `variant-${assignment.id}`,
            title: assignment.variant.title,
            description: `Вариант · срок был ${format(assignment.deadline)}`,
            href: `/student/variants/${assignment.variant.id}`,
          }],
    ),
  ].slice(0, 6);
}
