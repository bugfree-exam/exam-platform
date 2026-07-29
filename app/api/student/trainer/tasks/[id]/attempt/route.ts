import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { checkAnswer } from "@/lib/checkAnswer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const attemptSchema = z.object({
  answer: z.string().max(10_000),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.STUDENT);

    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const parsed = attemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Некорректный формат ответа" },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const task = await prisma.task.findFirst({
      where: {
        id,
        isArchived: false,
      },
      select: {
        id: true,
        egeNumber: true,
        answerType: true,
        correctAnswer: true,
        explanationHtml: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { message: "Задание не найдено или недоступно" },
        { status: 404 }
      );
    }

    const checkedAnswer = checkAnswer({
      answerType: task.answerType,
      correctAnswer: task.correctAnswer,
      studentAnswerText: parsed.data.answer,
    });

    const attempt = await prisma.practiceAttempt.create({
      data: {
        studentId: auth.user.id,
        taskId: task.id,
        rawAnswer: parsed.data.answer,
        normalizedAnswer:
          checkedAnswer.normalizedStudentAnswer === null
            ? Prisma.JsonNull
            : checkedAnswer.normalizedStudentAnswer,
        isCorrect: checkedAnswer.isCorrect,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    const taskIds = await prisma.task.findMany({
      where: {
        egeNumber: task.egeNumber,
        isArchived: false,
      },
      select: {
        id: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const currentIndex = taskIds.findIndex((item) => item.id === task.id);
    const nextTask =
      taskIds.length > 1
        ? taskIds[(currentIndex + 1) % taskIds.length]
        : null;

    return NextResponse.json(
      {
        attempt: {
          id: attempt.id,
          createdAt: attempt.createdAt,
          isCorrect: checkedAnswer.isCorrect,
          normalizedAnswer: checkedAnswer.normalizedStudentAnswer,
          correctAnswer: task.correctAnswer,
          explanationHtml: task.explanationHtml,
        },
        nextTaskId: nextTask?.id ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[STUDENT_TRAINER_ATTEMPT]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при проверке ответа" },
      { status: 500 }
    );
  }
}
