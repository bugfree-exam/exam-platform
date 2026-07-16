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
});

export async function GET(request: Request) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() ?? "";
    const egeNumberRaw = searchParams.get("egeNumber");

    const parsedEgeNumber = egeNumberRaw ? Number(egeNumberRaw) : null;

    const egeNumber =
      parsedEgeNumber !== null &&
      Number.isInteger(parsedEgeNumber) &&
      parsedEgeNumber >= 1 &&
      parsedEgeNumber <= 27
        ? parsedEgeNumber
        : null;

    const tasks = await prisma.task.findMany({
      where: {
        isArchived: false,

        ...(egeNumber !== null
          ? {
              egeNumber,
            }
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
  } catch (error) {
    console.error("[TASKS_GET]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при загрузке задач" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
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