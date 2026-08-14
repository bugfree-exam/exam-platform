import {
  PracticeFeedbackStage,
  Prisma,
  StudyPlanAttemptKind,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { studyPlanSchema } from "@/lib/ai/planSchema";
import { calculateStudyPlanProgress } from "@/lib/ai/studyPlanProgress";
import { checkAnswer } from "@/lib/checkAnswer";
import { getKnownTaskIds } from "@/lib/masteryEvidence";
import { prisma } from "@/lib/prisma";
import {
  canRevealPracticeSolution,
  getPracticeFeedbackStage,
} from "@/lib/practiceFeedback";

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
        message: "Контекст ближайшего спринта указан не полностью",
      });
    }
    if (value.studyPlanAttemptKind !== undefined && value.studyPlanId === undefined) {
      context.addIssue({
        code: "custom",
        message: "Тип попытки можно указать только для ближайшего спринта",
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
        currentRevisionId: true,
        egeNumber: true,
        skillTag: true,
        answerType: true,
        correctAnswer: true,
        hintHtml: true,
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
              countsForMastery: true,
              createdAt: true,
            },
          },
        },
      });

      if (!studyPlan) {
        return NextResponse.json(
          { message: "Этот ближайший спринт уже не активен" },
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
          { message: "Задание не относится к выбранному этапу спринта" },
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

    if (!task.currentRevisionId) {
      return NextResponse.json(
        { message: "У задания отсутствует опубликованная версия" },
        { status: 409 }
      );
    }

    const [knownTaskIds, priorAttemptsOnTask] = await Promise.all([
      getKnownTaskIds(auth.user.id, [task.id]),
      prisma.practiceAttempt.count({
        where: { studentId: auth.user.id, taskId: task.id },
      }),
    ]);
    const countsForMastery = !knownTaskIds.has(task.id);

    if (
      studyPlanLink?.studyPlanAttemptKind === StudyPlanAttemptKind.CONTROL &&
      !countsForMastery
    ) {
      return NextResponse.json(
        { message: "Для контроля нужна новая, ранее не встречавшаяся задача" },
        { status: 409 }
      );
    }

    const checkedAnswer = checkAnswer({
      answerType: task.answerType,
      correctAnswer: task.correctAnswer,
      studentAnswerText: parsed.data.answer,
    });

    const feedbackStage = getPracticeFeedbackStage({
      isCorrect: checkedAnswer.isCorrect,
      priorAttemptsOnTask,
    });
    const attempt = await prisma.practiceAttempt.create({
      data: {
        studentId: auth.user.id,
        taskId: task.id,
        taskRevisionId: task.currentRevisionId,
        rawAnswer: parsed.data.answer,
        normalizedAnswer:
          checkedAnswer.normalizedStudentAnswer === null
            ? Prisma.JsonNull
            : checkedAnswer.normalizedStudentAnswer,
        isCorrect: checkedAnswer.isCorrect,
        countsForMastery,
        feedbackStage:
          feedbackStage === "SOLUTION"
            ? PracticeFeedbackStage.SOLUTION
            : PracticeFeedbackStage.HINT,
        ...studyPlanLink,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (checkedAnswer.isCorrect && countsForMastery) {
      await prisma.studentErrorCorrection.updateMany({
        where: {
          studentId: auth.user.id,
          status: "CORRECTED",
          scheduledFor: { lte: attempt.createdAt },
          taskRevision: { egeNumber: task.egeNumber },
        },
        data: { status: "VERIFIED" },
      });
    }

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
    const knownNumberTaskIds = await getKnownTaskIds(
      auth.user.id,
      taskIds.map((item) => item.id)
    );
    const currentIndex = taskIds.findIndex((item) => item.id === task.id);
    const nextUnseenTask = taskIds.find(
      (item) => item.id !== task.id && !knownNumberTaskIds.has(item.id)
    );
    const nextTask =
      nextUnseenTask ??
      (taskIds.length > 1
        ? taskIds[(currentIndex + 1) % taskIds.length]
        : null);
    const revealSolution = canRevealPracticeSolution(feedbackStage);

    return NextResponse.json(
      {
        attempt: {
          id: attempt.id,
          createdAt: attempt.createdAt,
          isCorrect: checkedAnswer.isCorrect,
          normalizedAnswer: checkedAnswer.normalizedStudentAnswer,
          countsForMastery,
          feedbackStage: revealSolution ? "SOLUTION" : "HINT",
          correctAnswer: revealSolution ? task.correctAnswer : null,
          hintHtml:
            !revealSolution
              ? task.hintHtml ??
                "<p>Перечитайте условие, выпишите входные данные и проверьте первый шаг алгоритма. Затем попробуйте ещё раз.</p>"
              : null,
          explanationHtml: revealSolution ? task.explanationHtml : null,
        },
        nextTaskId:
          studyPlanLink?.studyPlanAttemptKind === StudyPlanAttemptKind.CONTROL
            ? null
            : nextTask?.id ?? null,
        nextTaskCountsForMastery: nextTask
          ? !knownNumberTaskIds.has(nextTask.id)
          : false,
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
