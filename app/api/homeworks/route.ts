import { NextResponse } from "next/server";
import { HomeworkStatus } from "@prisma/client";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createHomeworkSchema = z.object({
  title: z.string().min(1, "Введите название ДЗ").max(200),
  description: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  taskIds: z.array(z.string()).min(1, "Выберите хотя бы одну задачу"),
  studentIds: z.array(z.string()).min(1, "Выберите хотя бы одного ученика"),
});

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

export async function GET() {
  const { response } = await requireTeacher();

  if (response) {
    return response;
  }

  const homeworks = await prisma.homework.findMany({
    include: {
      tasks: true,
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
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ homeworks });
}

export async function POST(request: Request) {
  try {
    const { response } = await requireTeacher();

    if (response) {
      return response;
    }

    const body = await request.json();
    const parsed = createHomeworkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Некорректные данные домашнего задания",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { title, description, deadline, taskIds, studentIds } = parsed.data;

    const tasks = await prisma.task.findMany({
      where: {
        id: {
          in: taskIds,
        },
        isArchived: false,
      },
      select: {
        id: true,
      },
    });

    if (tasks.length !== taskIds.length) {
      return NextResponse.json(
        { message: "Некоторые задачи не найдены или удалены" },
        { status: 400 }
      );
    }

    const students = await prisma.user.findMany({
      where: {
        id: {
          in: studentIds,
        },
        role: "STUDENT",
      },
      select: {
        id: true,
      },
    });

    if (students.length !== studentIds.length) {
      return NextResponse.json(
        { message: "Некоторые ученики не найдены" },
        { status: 400 }
      );
    }

    const homework = await prisma.homework.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        deadline: deadline ? new Date(deadline) : null,
        status: HomeworkStatus.ASSIGNED,
        tasks: {
          create: taskIds.map((taskId, index) => ({
            taskId,
            order: index + 1,
          })),
        },
        assignments: {
          create: studentIds.map((studentId) => ({
            studentId,
          })),
        },
      },
    });

    return NextResponse.json({ homework }, { status: 201 });
  } catch (error) {
    console.error("[HOMEWORKS_POST]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при создании домашнего задания" },
      { status: 500 }
    );
  }
}