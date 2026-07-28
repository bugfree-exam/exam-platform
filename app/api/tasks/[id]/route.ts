import { TaskAnswerType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { parseCorrectAnswer } from "@/lib/answer";
import { prisma } from "@/lib/prisma";
import {
  hasEditorContent,
  sanitizeEditorHtml,
} from "@/lib/sanitizeHtml";

export const runtime = "nodejs";

const taskSchema = z.object({
  egeNumber: z.number().int().min(1).max(27),
  title: z.string().min(1).max(200),
  statementHtml: z.string().min(1),
  answerType: z.nativeEnum(TaskAnswerType),
  correctAnswerText: z.string().min(1),
  explanationHtml: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  difficulty: z.number().int().min(1).max(5).optional().nullable(),
  isPublic: z.boolean().default(true),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(UserRole.TEACHER);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      isArchived: false,
    },

    include: {
      attachments: {
        select: {
          id: true,
          originalName: true,
          extension: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json(
      { message: "Задача не найдена" },
      { status: 404 }
    );
  }

  return NextResponse.json({ task });
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    const body = await request.json();
    const parsed = taskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Некорректные данные задачи",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const statementHtml = sanitizeEditorHtml(parsed.data.statementHtml);
    const explanationHtml = parsed.data.explanationHtml
      ? sanitizeEditorHtml(parsed.data.explanationHtml)
      : null;

    if (!hasEditorContent(statementHtml)) {
      return NextResponse.json(
        { message: "Добавьте условие задачи" },
        { status: 400 }
      );
    }

    let correctAnswer;

    try {
      correctAnswer = parseCorrectAnswer(
        parsed.data.answerType,
        parsed.data.correctAnswerText
      );
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Некорректный правильный ответ",
        },
        { status: 400 }
      );
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        isArchived: false,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { message: "Задача не найдена" },
        { status: 404 }
      );
    }

    const task = await prisma.task.update({
      where: { id },

      data: {
        egeNumber: parsed.data.egeNumber,
        title: parsed.data.title.trim(),
        statementHtml,
        answerType: parsed.data.answerType,
        correctAnswer,
        explanationHtml,
        videoUrl: parsed.data.videoUrl?.trim() || null,
        source: parsed.data.source?.trim() || null,
        difficulty: parsed.data.difficulty ?? null,
        isPublic: parsed.data.isPublic,
      },

      include: {
        attachments: {
          select: {
            id: true,
            originalName: true,
            extension: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error("[TASKS_ID_PUT]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при обновлении задачи" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        isArchived: false,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { message: "Задача не найдена" },
        { status: 404 }
      );
    }

    await prisma.task.update({
      where: { id },
      data: {
        isArchived: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TASKS_ID_DELETE]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при удалении задачи" },
      { status: 500 }
    );
  }
}
