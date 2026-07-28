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

const createHomeworkSchema = z.object({
  title: z.string().min(1, "Введите название ДЗ").max(200),
  description: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  taskIds: z.array(z.string()).min(1, "Выберите хотя бы одну задачу"),
  studentIds: z.array(z.string()).min(1, "Выберите хотя бы одного ученика"),
});

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

export async function GET() {
  const auth = await requireApiRole(UserRole.TEACHER);

  if (!auth.ok) {
    return auth.response;
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
              studentStatus: true,
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
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const body: unknown = await request.json();
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
        { message: "Некоторые задачи не найдены или находятся в архиве" },
        { status: 400 }
      );
    }

    /*
     * Замороженным ученикам ДЗ выдавать можно.
     * Архивные аккаунты исключаются как из интерфейса, так и на уровне API.
     */
    const students = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueStudentIds,
        },
        role: UserRole.STUDENT,
        studentStatus: {
          not: StudentAccountStatus.ARCHIVED,
        },
      },
      select: {
        id: true,
      },
    });

    if (students.length !== uniqueStudentIds.length) {
      return NextResponse.json(
        {
          message:
            "Некоторые ученики не найдены или находятся в архиве",
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

    const homework = await prisma.homework.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        deadline: parsedDeadline.value,
        status: HomeworkStatus.ASSIGNED,
        tasks: {
          create: uniqueTaskIds.map((taskId, index) => ({
            taskId,
            order: index + 1,
          })),
        },
        assignments: {
          create: uniqueStudentIds.map((studentId) => ({
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
