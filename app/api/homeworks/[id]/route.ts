import {
  HomeworkStatus,
  StudentAccountStatus,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const updateHomeworkSchema = z.object({
  title: z.string().min(1, "Введите название ДЗ").max(200),
  description: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  taskIds: z.array(z.string()).min(1, "Выберите хотя бы одну задачу"),
  studentIds: z.array(z.string()).min(1, "Выберите хотя бы одного ученика"),
});

const updateHomeworkStatusSchema = z.object({
  status: z.nativeEnum(HomeworkStatus),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseDeadline(value: string | null | undefined) {
  if (!value) {
    return {
      ok: true as const,
      value: null,
    };
  }

  const deadline = new Date(value);

  if (Number.isNaN(deadline.getTime())) {
    return {
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    value: deadline,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(UserRole.TEACHER);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  const homework = await prisma.homework.findUnique({
    where: {
      id,
    },
    include: {
      tasks: {
        orderBy: {
          order: "asc",
        },
        include: {
          task: {
            select: {
              id: true,
              egeNumber: true,
              title: true,
              difficulty: true,
              isArchived: true,
            },
          },
        },
      },
      assignments: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              studentStatus: true,
            },
          },
        },
      },
      attempts: {
        where: {
          status: "SUBMITTED",
        },
        select: {
          id: true,
          studentId: true,
        },
      },
    },
  });

  if (!homework) {
    return NextResponse.json(
      { message: "Домашнее задание не найдено" },
      { status: 404 }
    );
  }

  return NextResponse.json({ homework });
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    const body: unknown = await request.json();
    const parsed = updateHomeworkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Некорректные данные домашнего задания",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const homework = await prisma.homework.findUnique({
      where: {
        id,
      },
      select: {
        assignments: true,
        tasks: {
          orderBy: {
            order: "asc",
          },
          select: {
            taskId: true,
          },
        },
        attempts: {
          where: {
            status: "SUBMITTED",
          },
          select: {
            id: true,
            studentId: true,
          },
        },
      },
    });

    if (!homework) {
      return NextResponse.json(
        { message: "Домашнее задание не найдено" },
        { status: 404 }
      );
    }

    const uniqueTaskIds = Array.from(new Set(parsed.data.taskIds));
    const uniqueStudentIds = Array.from(new Set(parsed.data.studentIds));

    const currentTaskIds = homework.tasks.map((task) => task.taskId);
    const tasks = await prisma.task.findMany({
      where: {
        id: {
          in: uniqueTaskIds,
        },
        OR: [
          {
            isArchived: false,
          },
          {
            id: {
              in: currentTaskIds,
            },
          },
        ],
      },
      select: {
        id: true,
        currentRevisionId: true,
      },
    });

    if (tasks.length !== uniqueTaskIds.length) {
      return NextResponse.json(
        { message: "Некоторые задачи не найдены или находятся в архиве" },
        { status: 400 }
      );
    }
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    if (tasks.some((task) => !task.currentRevisionId)) {
      return NextResponse.json(
        { message: "У некоторых задач отсутствует опубликованная версия" },
        { status: 409 }
      );
    }

    const taskCompositionChanged =
      uniqueTaskIds.length !== currentTaskIds.length ||
      uniqueTaskIds.some(
        (taskId, index) => taskId !== currentTaskIds[index]
      );

    if (homework.attempts.length > 0 && taskCompositionChanged) {
      return NextResponse.json(
        {
          message:
            "Нельзя менять состав или порядок задач после первой отправленной попытки. Создайте новое ДЗ.",
        },
        { status: 409 }
      );
    }

    const currentStudentIds = homework.assignments.map(
      (assignment) => assignment.studentId
    );

    const requestedStudents = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueStudentIds,
        },
        role: UserRole.STUDENT,
      },
      select: {
        id: true,
        studentStatus: true,
      },
    });

    if (requestedStudents.length !== uniqueStudentIds.length) {
      return NextResponse.json(
        { message: "Некоторые ученики не найдены" },
        { status: 400 }
      );
    }

    /*
     * Уже назначенного архивного ученика разрешаем оставить в ДЗ,
     * чтобы обычное редактирование не разрушало историю.
     * Но добавить архивного ученика в новое для него ДЗ нельзя.
     */
    const newlyAddedArchivedStudent = requestedStudents.some(
      (student) =>
        student.studentStatus === StudentAccountStatus.ARCHIVED &&
        !currentStudentIds.includes(student.id)
    );

    if (newlyAddedArchivedStudent) {
      return NextResponse.json(
        { message: "Нельзя назначить ДЗ ученику из архива" },
        { status: 400 }
      );
    }

    const studentsToAdd = uniqueStudentIds.filter(
      (studentId) => !currentStudentIds.includes(studentId)
    );

    const studentsToRemove = currentStudentIds.filter(
      (studentId) => !uniqueStudentIds.includes(studentId)
    );

    const studentsWithAttempts = new Set(
      homework.attempts.map((attempt) => attempt.studentId)
    );

    const blockedStudentsToRemove = studentsToRemove.filter((studentId) =>
      studentsWithAttempts.has(studentId)
    );

    if (blockedStudentsToRemove.length > 0) {
      return NextResponse.json(
        {
          message:
            "Нельзя убрать ученика из ДЗ, если он уже отправлял решение. Можно оставить ученика в списке или создать новое ДЗ.",
        },
        { status: 400 }
      );
    }

    const parsedDeadline = parseDeadline(parsed.data.deadline);

    if (!parsedDeadline.ok) {
      return NextResponse.json(
        { message: "Некорректный дедлайн" },
        { status: 400 }
      );
    }

    const updatedHomework = await prisma.$transaction(async (tx) => {
      if (taskCompositionChanged) {
        await tx.homeworkTask.deleteMany({
          where: {
            homeworkId: id,
          },
        });
      }

      if (studentsToRemove.length > 0) {
        await tx.homeworkAssignment.deleteMany({
          where: {
            homeworkId: id,
            studentId: {
              in: studentsToRemove,
            },
          },
        });
      }

      return tx.homework.update({
        where: {
          id,
        },
        data: {
          title: parsed.data.title.trim(),
          description: parsed.data.description?.trim() || null,
          deadline: parsedDeadline.value,
          ...(taskCompositionChanged
            ? {
                tasks: {
                  create: uniqueTaskIds.map((taskId, index) => ({
                    taskId,
                    taskRevisionId: taskById.get(taskId)!.currentRevisionId!,
                    order: index + 1,
                  })),
                },
              }
            : {}),
          assignments: {
            create: studentsToAdd.map((studentId) => ({
              studentId,
            })),
          },
        },
      });
    });

    return NextResponse.json({ homework: updatedHomework });
  } catch (error) {
    console.error("[HOMEWORKS_ID_PUT]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при обновлении домашнего задания" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    const body: unknown = await request.json();
    const parsed = updateHomeworkStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Некорректный статус домашнего задания" },
        { status: 400 }
      );
    }

    if (
      parsed.data.status !== HomeworkStatus.ASSIGNED &&
      parsed.data.status !== HomeworkStatus.ARCHIVED
    ) {
      return NextResponse.json(
        { message: "Можно установить только активный или архивный статус" },
        { status: 400 }
      );
    }

    const homework = await prisma.homework.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
        tasks: {
          select: {
            id: true,
            task: {
              select: { currentRevisionId: true },
            },
          },
        },
      },
    });

    if (!homework) {
      return NextResponse.json(
        { message: "Домашнее задание не найдено" },
        { status: 404 }
      );
    }

    const publishingDraft =
      homework.status === HomeworkStatus.DRAFT &&
      parsed.data.status === HomeworkStatus.ASSIGNED;
    if (
      publishingDraft &&
      homework.tasks.some((item) => !item.task.currentRevisionId)
    ) {
      return NextResponse.json(
        { message: "У некоторых задач отсутствует опубликованная версия" },
        { status: 409 },
      );
    }

    const updatedHomework = await prisma.$transaction(async (tx) => {
      if (publishingDraft) {
        await Promise.all(
          homework.tasks.map((item) =>
            tx.homeworkTask.update({
              where: { id: item.id },
              data: { taskRevisionId: item.task.currentRevisionId! },
            }),
          ),
        );
      }

      return tx.homework.update({
        where: { id },
        data: { status: parsed.data.status },
      });
    });

    return NextResponse.json({ homework: updatedHomework });
  } catch (error) {
    console.error("[HOMEWORKS_ID_PATCH]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при изменении статуса ДЗ" },
      { status: 500 }
    );
  }
}
