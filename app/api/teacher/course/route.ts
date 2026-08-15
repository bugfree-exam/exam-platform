import {
  CourseItemType,
  CourseStatus,
  DiagnosticTaskLevel,
  DiagnosticTemplateStatus,
  Prisma,
  StudentAccountStatus,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import {
  parseEgeNumbers,
  validateCourseDates,
  validateDiagnosticLevels,
  validateModuleDates,
} from "@/lib/coursePolicy";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const baseId = z.string().cuid();
const isoDate = z.string().datetime().transform((value) => new Date(value));
const optionalText = z.string().max(2_000).optional().nullable();

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save-course"),
    courseId: baseId.optional(),
    title: z.string().min(3).max(200),
    description: optionalText,
    startDate: isoDate,
    endDate: isoDate,
  }),
  z.object({ action: z.literal("publish-course"), courseId: baseId }),
  z.object({
    action: z.literal("save-module"),
    courseId: baseId,
    moduleId: baseId.optional(),
    title: z.string().min(2).max(200),
    description: optionalText,
    startDate: isoDate,
    endDate: isoDate,
    egeNumbers: z.string().max(200),
  }),
  z.object({
    action: z.literal("move-module"),
    courseId: baseId,
    moduleId: baseId,
    direction: z.enum(["up", "down"]),
  }),
  z.object({ action: z.literal("delete-module"), courseId: baseId, moduleId: baseId }),
  z.object({
    action: z.literal("save-schedule-item"),
    courseId: baseId,
    itemId: baseId.optional(),
    moduleId: baseId.optional().nullable(),
    type: z.nativeEnum(CourseItemType),
    title: z.string().min(2).max(200),
    description: optionalText,
    scheduledFor: isoDate,
    estimatedMinutes: z.number().int().min(5).max(480),
    href: z.string().max(2_000).optional().nullable(),
    egeNumbers: z.string().max(200),
  }),
  z.object({ action: z.literal("delete-schedule-item"), courseId: baseId, itemId: baseId }),
  z.object({
    action: z.literal("save-diagnostic"),
    courseId: baseId,
    templateId: baseId.optional(),
    title: z.string().min(3).max(200),
    description: optionalText,
    durationMinutes: z.number().int().min(10).max(240),
  }),
  z.object({
    action: z.literal("add-diagnostic-item"),
    courseId: baseId,
    templateId: baseId,
    taskId: baseId,
    level: z.nativeEnum(DiagnosticTaskLevel),
    points: z.number().int().min(1).max(10),
  }),
  z.object({
    action: z.literal("move-diagnostic-item"),
    courseId: baseId,
    templateId: baseId,
    itemId: baseId,
    direction: z.enum(["up", "down"]),
  }),
  z.object({
    action: z.literal("remove-diagnostic-item"),
    courseId: baseId,
    templateId: baseId,
    itemId: baseId,
  }),
  z.object({ action: z.literal("publish-diagnostic"), courseId: baseId, templateId: baseId }),
  z.object({ action: z.literal("clone-diagnostic"), courseId: baseId, templateId: baseId }),
]);

function cleanText(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function cleanHref(value: string | null | undefined) {
  const href = cleanText(value);
  if (!href) return null;
  if (!href.startsWith("/") && !href.startsWith("https://") && !href.startsWith("http://")) {
    throw new Error("Ссылка должна начинаться с /, http:// или https://");
  }
  return href;
}

async function assertCourse(courseId: string) {
  const course = await prisma.annualCourse.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Годовой курс не найден");
  return course;
}

async function normalizeModuleOrder(courseId: string, orderedIds: string[]) {
  await prisma.$transaction([
    ...orderedIds.map((id, index) =>
      prisma.courseModule.update({ where: { id }, data: { order: -(index + 1) } }),
    ),
    ...orderedIds.map((id, index) =>
      prisma.courseModule.update({ where: { id }, data: { order: index + 1 } }),
    ),
  ]);
}

async function normalizeDiagnosticOrder(templateId: string, orderedIds: string[]) {
  await prisma.$transaction([
    ...orderedIds.map((id, index) =>
      prisma.diagnosticTemplateItem.update({ where: { id }, data: { order: -(index + 1) } }),
    ),
    ...orderedIds.map((id, index) =>
      prisma.diagnosticTemplateItem.update({ where: { id }, data: { order: index + 1 } }),
    ),
  ]);
}

export async function POST(request: Request) {
  const auth = await requireApiRole(UserRole.TEACHER);
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Проверьте заполнение формы", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const data = parsed.data;

    if (data.action === "save-course") {
      validateCourseDates(data.startDate, data.endDate);
      if (data.courseId) {
        const [outsideModules, outsideItems] = await Promise.all([
          prisma.courseModule.count({
            where: {
              courseId: data.courseId,
              OR: [{ startDate: { lt: data.startDate } }, { endDate: { gt: data.endDate } }],
            },
          }),
          prisma.courseScheduleItem.count({
            where: {
              courseId: data.courseId,
              OR: [{ scheduledFor: { lt: data.startDate } }, { scheduledFor: { gt: data.endDate } }],
            },
          }),
        ]);
        if (outsideModules || outsideItems) {
          throw new Error("Сначала перенесите модули и занятия, которые окажутся за новыми датами курса");
        }
      }
      const course = data.courseId
        ? await prisma.annualCourse.update({
            where: { id: data.courseId },
            data: {
              title: data.title.trim(),
              description: cleanText(data.description),
              startDate: data.startDate,
              endDate: data.endDate,
            },
          })
        : await prisma.annualCourse.create({
            data: {
              title: data.title.trim(),
              description: cleanText(data.description),
              startDate: data.startDate,
              endDate: data.endDate,
            },
          });
      return NextResponse.json({ course });
    }

    const course = await assertCourse(data.courseId);

    if (data.action === "save-module") {
      validateModuleDates(course.startDate, course.endDate, data.startDate, data.endDate);
      const egeNumbers = parseEgeNumbers(data.egeNumbers);
      if (egeNumbers.length === 0) throw new Error("Укажите хотя бы один номер ЕГЭ для модуля");

      const courseModule = data.moduleId
        ? await prisma.courseModule.update({
            where: { id: data.moduleId, courseId: data.courseId },
            data: {
              title: data.title.trim(),
              description: cleanText(data.description),
              startDate: data.startDate,
              endDate: data.endDate,
              egeNumbers,
            },
          })
        : await prisma.courseModule.create({
            data: {
              courseId: data.courseId,
              order:
                ((await prisma.courseModule.aggregate({
                  where: { courseId: data.courseId },
                  _max: { order: true },
                }))._max.order ?? 0) + 1,
              title: data.title.trim(),
              description: cleanText(data.description),
              startDate: data.startDate,
              endDate: data.endDate,
              egeNumbers,
            },
          });
      return NextResponse.json({ module: courseModule });
    }

    if (data.action === "move-module") {
      const modules = await prisma.courseModule.findMany({
        where: { courseId: data.courseId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      const index = modules.findIndex((module) => module.id === data.moduleId);
      const target = data.direction === "up" ? index - 1 : index + 1;
      if (index >= 0 && target >= 0 && target < modules.length) {
        [modules[index], modules[target]] = [modules[target], modules[index]];
        await normalizeModuleOrder(data.courseId, modules.map((module) => module.id));
      }
      return NextResponse.json({ ok: true });
    }

    if (data.action === "delete-module") {
      const hasPastItems = await prisma.courseScheduleItem.count({
        where: { moduleId: data.moduleId, scheduledFor: { lt: new Date() } },
      });
      if (hasPastItems > 0) throw new Error("Модуль с уже прошедшими занятиями нельзя удалить из истории");
      await prisma.courseModule.delete({ where: { id: data.moduleId, courseId: data.courseId } });
      const remaining = await prisma.courseModule.findMany({
        where: { courseId: data.courseId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      await normalizeModuleOrder(data.courseId, remaining.map((module) => module.id));
      return NextResponse.json({ ok: true });
    }

    if (data.action === "save-schedule-item") {
      if (data.scheduledFor < course.startDate || data.scheduledFor > course.endDate) {
        throw new Error("Пункт расписания должен находиться внутри дат курса");
      }
      if (data.moduleId) {
        const courseModule = await prisma.courseModule.findFirst({
          where: { id: data.moduleId, courseId: data.courseId },
        });
        if (!courseModule) throw new Error("Выбранный модуль не найден");
      }
      if (data.itemId) {
        const existingItem = await prisma.courseScheduleItem.findFirst({
          where: { id: data.itemId, courseId: data.courseId },
          select: { scheduledFor: true },
        });
        if (!existingItem) throw new Error("Пункт расписания не найден");
        if (existingItem.scheduledFor < new Date()) {
          throw new Error("Прошедший пункт сохраняется в истории и не редактируется");
        }
      }
      const payload = {
        moduleId: data.moduleId || null,
        type: data.type,
        title: data.title.trim(),
        description: cleanText(data.description),
        scheduledFor: data.scheduledFor,
        estimatedMinutes: data.estimatedMinutes,
        href: cleanHref(data.href),
        egeNumbers: parseEgeNumbers(data.egeNumbers),
      } satisfies Prisma.CourseScheduleItemUncheckedUpdateInput;
      const item = data.itemId
        ? await prisma.courseScheduleItem.update({
            where: { id: data.itemId, courseId: data.courseId },
            data: payload,
          })
        : await prisma.courseScheduleItem.create({
            data: {
              ...payload,
              courseId: data.courseId,
              order:
                ((await prisma.courseScheduleItem.aggregate({
                  where: { courseId: data.courseId },
                  _max: { order: true },
                }))._max.order ?? 0) + 1,
            } as Prisma.CourseScheduleItemUncheckedCreateInput,
          });
      return NextResponse.json({ item });
    }

    if (data.action === "delete-schedule-item") {
      const item = await prisma.courseScheduleItem.findFirst({
        where: { id: data.itemId, courseId: data.courseId },
      });
      if (!item) throw new Error("Пункт расписания не найден");
      if (item.scheduledFor < new Date()) throw new Error("Прошедший пункт сохраняется в истории курса");
      await prisma.courseScheduleItem.delete({ where: { id: data.itemId } });
      return NextResponse.json({ ok: true });
    }

    if (data.action === "save-diagnostic") {
      if (data.templateId) {
        const template = await prisma.diagnosticTemplate.findFirst({
          where: { id: data.templateId, courseId: data.courseId },
        });
        if (!template) throw new Error("Диагностика не найдена");
        if (template.status !== DiagnosticTemplateStatus.DRAFT) {
          throw new Error("Опубликованная диагностика неизменяема — создайте новую версию");
        }
        const updated = await prisma.diagnosticTemplate.update({
          where: { id: template.id },
          data: {
            title: data.title.trim(),
            description: cleanText(data.description),
            durationMinutes: data.durationMinutes,
          },
        });
        return NextResponse.json({ template: updated });
      }
      const maxVersion = await prisma.diagnosticTemplate.aggregate({
        where: { courseId: data.courseId },
        _max: { version: true },
      });
      const template = await prisma.diagnosticTemplate.create({
        data: {
          courseId: data.courseId,
          version: (maxVersion._max.version ?? 0) + 1,
          title: data.title.trim(),
          description: cleanText(data.description),
          durationMinutes: data.durationMinutes,
        },
      });
      return NextResponse.json({ template });
    }

    if (data.action === "publish-course") {
      const complete = await prisma.annualCourse.findUnique({
        where: { id: data.courseId },
        include: {
          _count: { select: { modules: true, scheduleItems: true } },
          diagnosticTemplates: {
            where: { status: DiagnosticTemplateStatus.PUBLISHED },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      });
      if (!complete || complete._count.modules === 0 || complete._count.scheduleItems === 0) {
        throw new Error("Перед публикацией добавьте хотя бы один модуль и один пункт расписания");
      }
      if (complete.diagnosticTemplates.length === 0) {
        throw new Error("Сначала опубликуйте общий входной контроль");
      }
      const diagnosticTemplateId = complete.diagnosticTemplates[0].id;
      const students = await prisma.user.findMany({
        where: { role: UserRole.STUDENT, studentStatus: StudentAccountStatus.ACTIVE },
        select: { id: true },
      });
      await prisma.$transaction(async (tx) => {
        await tx.annualCourse.updateMany({
          where: { status: CourseStatus.PUBLISHED, id: { not: data.courseId } },
          data: { status: CourseStatus.ARCHIVED },
        });
        await tx.studentCourseEnrollment.updateMany({
          where: { courseId: { not: data.courseId }, isActive: true },
          data: { isActive: false },
        });
        await tx.annualCourse.update({
          where: { id: data.courseId },
          data: { status: CourseStatus.PUBLISHED, publishedAt: new Date() },
        });
        for (const student of students) {
          await tx.studentCourseEnrollment.upsert({
            where: { courseId_studentId: { courseId: data.courseId, studentId: student.id } },
            create: { courseId: data.courseId, studentId: student.id, diagnosticTemplateId },
            update: { isActive: true },
          });
        }
      });
      return NextResponse.json({ ok: true, enrolledStudents: students.length });
    }

    const template = await prisma.diagnosticTemplate.findFirst({
      where: { id: data.templateId, courseId: data.courseId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!template) throw new Error("Диагностика не найдена");

    if (data.action === "clone-diagnostic") {
      const maxVersion = await prisma.diagnosticTemplate.aggregate({
        where: { courseId: data.courseId },
        _max: { version: true },
      });
      const cloned = await prisma.diagnosticTemplate.create({
        data: {
          courseId: data.courseId,
          title: template.title,
          description: template.description,
          durationMinutes: template.durationMinutes,
          version: (maxVersion._max.version ?? 0) + 1,
          items: {
            create: template.items.map((item) => ({
              taskId: item.taskId,
              taskRevisionId: item.taskRevisionId,
              order: item.order,
              level: item.level,
              points: item.points,
            })),
          },
        },
      });
      return NextResponse.json({ template: cloned });
    }

    if (template.status !== DiagnosticTemplateStatus.DRAFT) {
      throw new Error("Опубликованная диагностика неизменяема — создайте новую версию");
    }

    if (data.action === "add-diagnostic-item") {
      const task = await prisma.task.findFirst({
        where: { id: data.taskId, isArchived: false, currentRevisionId: { not: null } },
        select: { id: true, currentRevisionId: true },
      });
      if (!task?.currentRevisionId) throw new Error("У задания нет опубликованной ревизии");
      const item = await prisma.diagnosticTemplateItem.create({
        data: {
          templateId: template.id,
          taskId: task.id,
          taskRevisionId: task.currentRevisionId,
          order: template.items.length + 1,
          level: data.level,
          points: data.points,
        },
      });
      return NextResponse.json({ item });
    }

    if (data.action === "move-diagnostic-item") {
      const index = template.items.findIndex((item) => item.id === data.itemId);
      const target = data.direction === "up" ? index - 1 : index + 1;
      if (index >= 0 && target >= 0 && target < template.items.length) {
        [template.items[index], template.items[target]] = [template.items[target], template.items[index]];
        await normalizeDiagnosticOrder(template.id, template.items.map((item) => item.id));
      }
      return NextResponse.json({ ok: true });
    }

    if (data.action === "remove-diagnostic-item") {
      await prisma.diagnosticTemplateItem.delete({ where: { id: data.itemId, templateId: template.id } });
      const remaining = template.items.filter((item) => item.id !== data.itemId);
      await normalizeDiagnosticOrder(template.id, remaining.map((item) => item.id));
      return NextResponse.json({ ok: true });
    }

    if (data.action === "publish-diagnostic") {
      if (template.items.length < 3) throw new Error("Добавьте минимум три задания");
      const levelState = validateDiagnosticLevels(template.items.map((item) => item.level));
      if (!levelState.isMultilevel) {
        throw new Error("Для разноуровневого контроля нужны совсем простое и повышенное/сложное задания");
      }
      await prisma.$transaction([
        prisma.diagnosticTemplate.updateMany({
          where: {
            courseId: data.courseId,
            status: DiagnosticTemplateStatus.PUBLISHED,
            id: { not: template.id },
          },
          data: { status: DiagnosticTemplateStatus.ARCHIVED },
        }),
        prisma.diagnosticTemplate.update({
          where: { id: template.id },
          data: { status: DiagnosticTemplateStatus.PUBLISHED, publishedAt: new Date() },
        }),
      ]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ message: "Неизвестное действие" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить изменения";
    const status = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? 409 : 400;
    return NextResponse.json({ message }, { status });
  }
}
