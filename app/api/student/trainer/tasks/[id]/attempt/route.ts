import { Prisma, StudyPlanAttemptKind, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { studyPlanSchema } from "@/lib/ai/planSchema";
import { calculateStudyPlanProgress } from "@/lib/ai/studyPlanProgress";
import { checkAnswer } from "@/lib/checkAnswer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const attemptSchema = z
  .object({
    answer: z.string().max(10_000),
    studyPlanId: z.string().min(1).optional(),
    studyPlanActionIndex: z.number().int().min(0).optional(),
    studyPlanAttemptKind: z.nativeEnum(StudyPlanAttemptKind).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.studyPlanId === undefined) !== (value.studyPlanActionIndex === undefined)) {
      context.addIssue({
        code: "custom",
        message: "Контекст учебного плана указан не полностью",
      });
    }
    if (value.studyPlanAttemptKind !== undefined && value.studyPlanId === undefined) {
      context.addIssue({
        code: "custom",
        message: "Тип попытки можно указать только для учебного плана",
      });
    }
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
        skillTag: true,
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

    let studyPlanLink:
      | {
          studyPlanId: string;
          studyPlanActionIndex: number;
          studyPlanAttemptKind: StudyPlanAttemptKind;
        }
      | undefined;

    if (
      parsed.data.studyPlanId !== undefined &&
      parsed.data.studyPlanActionIndex !== undefined
    ) {
      const studyPlan = await prisma.studentStudyPlan.findFirst({
        where: {
          id: parsed.data.studyPlanId,
          studentId: auth.user.id,
          status: "CONFIRMED",
        },
        select: {
          id: true,
          title: true,
          durationDays: true,
          topics: true,
          actions: true,
          practiceAttempts: {
            select: {
              studyPlanActionIndex: true,
              studyPlanAttemptKind: true,
              errorCause: true,
              isCorrect: true,
              createdAt: true,
            },
          },
        },
      });

      if (!studyPlan) {
        return NextResponse.json(
          { message: "Этот учебный план уже не активен" },
          { status: 409 }
        );
      }

      const validatedPlan = studyPlanSchema.parse({
        title: studyPlan.title,
        summary: "Проверка активного этапа",
        durationDays: studyPlan.durationDays,
        topics: studyPlan.topics,
        actions: studyPlan.actions,
      });
      const planAction = validatedPlan.actions[parsed.data.studyPlanActionIndex];

      if (!planAction || planAction.egeNumber !== task.egeNumber) {
        return NextResponse.json(
          { message: "Задание не относится к выбранному этапу плана" },
          { status: 400 }
        );
      }

      const matchingSkillTasks = await prisma.task.count({
        where: {
          egeNumber: planAction.egeNumber,
          skillTag: planAction.skill,
          isArchived: false,
        },
      });
      if (matchingSkillTasks > 0 && task.skillTag !== planAction.skill) {
        return NextResponse.json(
          { message: "Задание не проверяет навык выбранного этапа" },
          { status: 400 }
        );
      }

      const attemptKind =
        parsed.data.studyPlanAttemptKind ?? StudyPlanAttemptKind.PRACTICE;

      if (attemptKind === StudyPlanAttemptKind.CONTROL) {
        const actionProgress = calculateStudyPlanProgress(
          validatedPlan,
          studyPlan.practiceAttempts
        ).actions[parsed.data.studyPlanActionIndex];
        const availableAt = actionProgress?.controlAvailableAt
          ? new Date(actionProgress.controlAvailableAt)
          : null;

        if (!actionProgress?.accuracyMet || !availableAt || availableAt > new Date()) {
          return NextResponse.json(
            { message: "Контрольная задача ещё не доступна: сначала выполните практику с нужной точностью и дождитесь паузы" },
            { status: 409 }
          );
        }
      }

      studyPlanLink = {
        studyPlanId: studyPlan.id,
        studyPlanActionIndex: parsed.data.studyPlanActionIndex,
        studyPlanAttemptKind: attemptKind,
      };
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
        ...studyPlanLink,
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
        nextTaskId:
          studyPlanLink?.studyPlanAttemptKind === StudyPlanAttemptKind.CONTROL
            ? null
            : nextTask?.id ?? null,
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
