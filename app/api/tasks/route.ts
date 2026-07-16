import { NextResponse } from "next/server";
import { TaskAnswerType } from "@prisma/client";
import { z } from "zod";
import { hasEditorContent, sanitizeEditorHtml } from "@/lib/sanitizeHtml";

import { parseCorrectAnswer } from "@/lib/answer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function GET(request: Request) {
  const { response } = await requireTeacher();

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const egeNumberRaw = searchParams.get("egeNumber");
  const egeNumber = egeNumberRaw ? Number(egeNumberRaw) : null;

  const tasks = await prisma.task.findMany({
    where: {
      isArchived: false,
      ...(egeNumber && Number.isInteger(egeNumber)
        ? { egeNumber }
        : {}),
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                statementHtml: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ egeNumber: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  try {
    const { response } = await requireTeacher();

    if (response) {
      return response;
    }

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

    const task = await prisma.task.create({
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
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("[TASKS_POST]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при создании задачи" },
      { status: 500 }
    );
  }
}