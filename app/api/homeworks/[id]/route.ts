import { HomeworkStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
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

async function requireTeacher() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "Не авторизован" },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "TEACHER") {
    return {
      user: null,
      response: NextResponse.json(
        { message: "Недостаточно прав" },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

export async function GET(_request: Request, context: RouteContext) {
  const { response } = await requireTeacher();

  if (response) {
    return response;
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
    const { response } = await requireTeacher();

    if (response) {
      return response;
    }

    const { id } = await context.params;

    const body = await request.json();
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
      include: {
        assignments: true,
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

    const tasks = await prisma.task.findMany({
      where: {
        id: {
          in: uniqueTaskIds,
        },
        isArchived: false,
      },
      select: {
        id: true,
      },
    });

    if (tasks.length !== uniqueTaskIds.length) {
      return NextResponse.json(
        { message: "Некоторые задачи не найдены или удалены" },
        { status: 400 }
      );
    }

    const students = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueStudentIds,
        },
        role: "STUDENT",
      },
      select: {
        id: true,
      },
    });

    if (students.length !== uniqueStudentIds.length) {
      return NextResponse.json(
        { message: "Некоторые ученики не найдены" },
        { status: 400 }
      );
    }

    const currentStudentIds = homework.assignments.map(
      (assignment) => assignment.studentId
    );

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

    const deadline = parsed.data.deadline
      ? new Date(parsed.data.deadline)
      : null;

    if (parsed.data.deadline && Number.isNaN(deadline?.getTime())) {
      return NextResponse.json(
        { message: "Некорректный дедлайн" },
        { status: 400 }
      );
    }

    const updatedHomework = await prisma.$transaction(async (tx) => {
      await tx.homeworkTask.deleteMany({
        where: {
          homeworkId: id,
        },
      });

      await tx.homeworkAssignment.deleteMany({
        where: {
          homeworkId: id,
          studentId: {
            in: studentsToRemove,
          },
        },
      });

      const result = await tx.homework.update({
        where: {
          id,
        },
        data: {
          title: parsed.data.title.trim(),
          description: parsed.data.description?.trim() || null,
          deadline,
          tasks: {
            create: uniqueTaskIds.map((taskId, index) => ({
              taskId,
              order: index + 1,
            })),
          },
          assignments: {
            create: studentsToAdd.map((studentId) => ({
              studentId,
            })),
          },
        },
      });

      return result;
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
    const { response } = await requireTeacher();

    if (response) {
      return response;
    }

    const { id } = await context.params;

    const body = await request.json();
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
    });

    if (!homework) {
      return NextResponse.json(
        { message: "Домашнее задание не найдено" },
        { status: 404 }
      );
    }

    const updatedHomework = await prisma.homework.update({
      where: {
        id,
      },
      data: {
        status: parsed.data.status,
      },
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