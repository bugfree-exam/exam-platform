import { NextResponse } from "next/server";
import { z } from "zod";

import { checkAnswer } from "@/lib/checkAnswer";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  getRequestClientKey,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

const checkSchema = z.object({
  answer: z.string().max(10_000),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const rateLimit = consumeRateLimit({
    key: `public-task-check:${getRequestClientKey(request)}`,
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Слишком много проверок. Попробуйте немного позже." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Некорректный формат ответа" },
      { status: 400 }
    );
  }

  const parsed = checkSchema.safeParse(body);

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
      isPublic: true,
      isArchived: false,
    },
    select: {
      answerType: true,
      correctAnswer: true,
      explanationHtml: true,
    },
  });

  if (!task) {
    return NextResponse.json(
      { message: "Задача не найдена" },
      { status: 404 }
    );
  }

  const result = checkAnswer({
    answerType: task.answerType,
    correctAnswer: task.correctAnswer,
    studentAnswerText: parsed.data.answer,
  });

  return NextResponse.json(
    {
      isCorrect: result.isCorrect,
      normalizedAnswer: result.normalizedStudentAnswer,
      correctAnswer: task.correctAnswer,
      explanationHtml: task.explanationHtml,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
