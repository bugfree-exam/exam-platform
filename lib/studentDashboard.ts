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
  if (!course) return [];
  const { start, end } = getMoscowDayRange(now);
  const scheduled = await prisma.courseScheduleItem.findMany({
    where: { courseId: course.id, scheduledFor: { gte: start, lt: end } },
    orderBy: [{ scheduledFor: "asc" }, { order: "asc" }],
  });

  return scheduled.map((item, index): TodayItem => {
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
      priority: scheduled.length - index,
      estimatedMinutes: item.estimatedMinutes,
      scheduledFor: item.scheduledFor,
      external: href.startsWith("http://") || href.startsWith("https://"),
    };
  });
}

export async function getStudentBacklog(studentId: string, now = new Date()) {
  const [homeworks, variants] = await Promise.all([
    prisma.homeworkAssignment.findMany({
      where: {
        studentId,
        homework: { status: "ASSIGNED", deadline: { lt: now } },
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
      orderBy: { homework: { deadline: "asc" } },
      take: 12,
    }),
    prisma.variantAssignment.findMany({
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
    }),
  ]);

  const format = (value: Date | null) =>
    value
      ? new Intl.DateTimeFormat("ru-RU", {
          timeZone: "Europe/Moscow",
          day: "2-digit",
          month: "short",
        }).format(value)
      : "без даты";

  return [
    ...homeworks.flatMap((assignment): BacklogItem[] =>
      assignment.homework.attempts.length
        ? []
        : [{
            key: `homework-${assignment.id}`,
            title: assignment.homework.title,
            description: `ДЗ · срок был ${format(assignment.homework.deadline)}`,
            href: `/student/homeworks/${assignment.homework.id}`,
          }],
    ),
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
