import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { checkAnswer } from "@/lib/checkAnswer";
import {
  getVariantAwardedPoints,
  getVariantTaskMaxPoints,
} from "@/lib/variantScoring";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const submitAttemptSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.STUDENT);

    if (!auth.ok) {
      return auth.response;
    }

    const { id: attemptId } = await context.params;
    const body: unknown = await request.json();
    const parsed = submitAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Некорректный формат ответов" },
        { status: 400 }
      );
    }

    const attempt = await prisma.variantAttempt.findFirst({
      where: {
        id: attemptId,
        studentId: auth.user.id,
        status: "IN_PROGRESS",
      },
      include: {
        answers: {
          select: {
            taskId: true,
            rawAnswer: true,
          },
        },
        variant: {
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                task: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { message: "Активная попытка не найдена" },
        { status: 404 }
      );
    }

    const savedAnswerByTaskId = new Map(
      attempt.answers.map((answer) => [
        answer.taskId,
        typeof answer.rawAnswer === "string" ? answer.rawAnswer : "",
      ])
    );

    const checkedAnswers = attempt.variant.tasks.map((variantTask) => {
      const rawAnswer =
        parsed.data.answers[variantTask.taskId] ??
        savedAnswerByTaskId.get(variantTask.taskId) ??
        "";
      const checked = checkAnswer({
        answerType: variantTask.task.answerType,
        correctAnswer: variantTask.task.correctAnswer,
        studentAnswerText: rawAnswer,
      });

      const awardedPoints = getVariantAwardedPoints({
        egeNumber: variantTask.task.egeNumber,
        correctAnswer: variantTask.task.correctAnswer,
        normalizedStudentAnswer: checked.normalizedStudentAnswer,
        isFullyCorrect: checked.isCorrect,
      });

      return {
        taskId: variantTask.taskId,
        rawAnswer,
        normalizedAnswer: checked.normalizedStudentAnswer,
        isCorrect: checked.isCorrect,
        awardedPoints,
      };
    });

    const score = checkedAnswers.reduce(
      (sum, answer) => sum + answer.awardedPoints,
      0
    );
    const maxScore = attempt.variant.tasks.reduce(
      (sum, variantTask) =>
        sum + getVariantTaskMaxPoints(variantTask.task.egeNumber),
      0
    );
    const percent =
      maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
    const submittedAt = new Date();

    await prisma.$transaction([
      ...checkedAnswers.map((answer) =>
        prisma.variantAttemptAnswer.upsert({
          where: {
            attemptId_taskId: {
              attemptId,
              taskId: answer.taskId,
            },
          },
          create: {
            attemptId,
            taskId: answer.taskId,
            rawAnswer: answer.rawAnswer,
            normalizedAnswer:
              answer.normalizedAnswer === null
                ? Prisma.JsonNull
                : answer.normalizedAnswer,
            isCorrect: answer.isCorrect,
            awardedPoints: answer.awardedPoints,
          },
          update: {
            rawAnswer: answer.rawAnswer,
            normalizedAnswer:
              answer.normalizedAnswer === null
                ? Prisma.JsonNull
                : answer.normalizedAnswer,
            isCorrect: answer.isCorrect,
            awardedPoints: answer.awardedPoints,
          },
        })
      ),
      prisma.variantAttempt.update({
        where: { id: attemptId },
        data: {
          status: "SUBMITTED",
          score,
          maxScore,
          percent,
          submittedAt,
        },
      }),
    ]);

    return NextResponse.json({
      attempt: {
        id: attemptId,
        variantId: attempt.variantId,
        score,
        maxScore,
        percent,
        submittedAt,
      },
    });
  } catch (error) {
    console.error("[STUDENT_VARIANT_ATTEMPT_SUBMIT]", error);

    return NextResponse.json(
      { message: "Не удалось завершить вариант" },
      { status: 500 }
    );
  }
}
