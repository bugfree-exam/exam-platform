import {
  AiGenerationStatus,
  Prisma,
  StudyPlanStatus,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { generateStudyPlanWithFallback } from "@/lib/ai/generateStudyPlanWithFallback";
import { createConfiguredStudyPlanProvider } from "@/lib/ai/providers/config";
import type { StudyPlanProvider } from "@/lib/ai/providers/provider";
import { getNextStudyPlanStatus } from "@/lib/ai/studyPlanLifecycle";
import { getStudentLearningAnalytics } from "@/lib/ai/studentLearningAnalytics";
import { toStudyPlanView } from "@/lib/ai/studyPlanView";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updatePlanSchema = z
  .object({
    planId: z.string().min(1),
    action: z.enum(["CONFIRM", "CANCEL"]),
  })
  .strict();

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 1000);
  }

  return "Неизвестная ошибка генерации";
}

async function findStudent(studentId: string) {
  return prisma.user.findFirst({
    where: {
      id: studentId,
      role: UserRole.STUDENT,
    },
    select: {
      id: true,
    },
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(UserRole.TEACHER);

  if (!auth.ok) {
    return auth.response;
  }

  const { id: studentId } = await context.params;
  const student = await findStudent(studentId);

  if (!student) {
    return NextResponse.json({ message: "Ученик не найден" }, { status: 404 });
  }

  let provider: StudyPlanProvider;

  try {
    provider = createConfiguredStudyPlanProvider();
  } catch (error) {
    console.error("[AI_STUDY_PLAN_CONFIG]", getSafeErrorMessage(error));
    return NextResponse.json(
      { message: "AI Assistant настроен некорректно" },
      { status: 500 }
    );
  }

  const analytics = await getStudentLearningAnalytics(student.id);
  const analyticsSnapshot = toPrismaJson(analytics);
  const primaryGeneration = await prisma.aiGeneration.create({
    data: {
      studentId: student.id,
      provider: provider.name,
      analyticsSnapshot,
    },
    select: {
      id: true,
    },
  });

  try {
    const result = await generateStudyPlanWithFallback(provider, analytics);
    const { plan } = result;
    const outputSnapshot = toPrismaJson(plan);
    const completedAt = new Date();

    const createdPlan = await prisma.$transaction(async (transaction) => {
      let successfulGenerationId = primaryGeneration.id;

      if (result.failedPrimary) {
        await transaction.aiGeneration.update({
          where: { id: primaryGeneration.id },
          data: {
            status: AiGenerationStatus.FAILED,
            errorMessage: getSafeErrorMessage(result.failedPrimary.error),
            completedAt,
          },
        });

        const fallbackGeneration = await transaction.aiGeneration.create({
          data: {
            studentId: student.id,
            provider: result.provider.name,
            status: AiGenerationStatus.SUCCEEDED,
            analyticsSnapshot,
            outputSnapshot,
            completedAt,
          },
          select: { id: true },
        });
        successfulGenerationId = fallbackGeneration.id;
      } else {
        await transaction.aiGeneration.update({
          where: { id: primaryGeneration.id },
          data: {
            status: AiGenerationStatus.SUCCEEDED,
            outputSnapshot,
            completedAt,
          },
        });
      }

      await transaction.studentStudyPlan.updateMany({
        where: {
          studentId: student.id,
          status: StudyPlanStatus.DRAFT,
        },
        data: {
          status: StudyPlanStatus.CANCELLED,
          cancelledAt: completedAt,
        },
      });

      return transaction.studentStudyPlan.create({
        data: {
          studentId: student.id,
          generationId: successfulGenerationId,
          title: plan.title,
          summary: plan.summary,
          durationDays: plan.durationDays,
          topics: toPrismaJson(plan.topics),
          actions: toPrismaJson(plan.actions),
          analyticsSnapshot,
        },
        include: {
          generation: {
            select: {
              provider: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ plan: toStudyPlanView(createdPlan) });
  } catch (error) {
    console.error("[AI_STUDY_PLAN_GENERATE]", getSafeErrorMessage(error));

    await prisma.aiGeneration.update({
      where: { id: primaryGeneration.id },
      data: {
        status: AiGenerationStatus.FAILED,
        errorMessage: getSafeErrorMessage(error),
        completedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Не удалось сформировать учебный план" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(UserRole.TEACHER);

  if (!auth.ok) {
    return auth.response;
  }

  const { id: studentId } = await context.params;
  const body: unknown = await request.json();
  const parsed = updatePlanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Некорректное действие с планом" },
      { status: 400 }
    );
  }

  const currentPlan = await prisma.studentStudyPlan.findFirst({
    where: {
      id: parsed.data.planId,
      studentId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!currentPlan) {
    return NextResponse.json({ message: "План не найден" }, { status: 404 });
  }

  let nextStatus: StudyPlanStatus;

  try {
    nextStatus = getNextStudyPlanStatus(
      currentPlan.status,
      parsed.data.action
    );
  } catch (error) {
    return NextResponse.json(
      { message: getSafeErrorMessage(error) },
      { status: 409 }
    );
  }

  const now = new Date();
  const updatedPlan = await prisma.$transaction(async (transaction) => {
    if (nextStatus === StudyPlanStatus.CONFIRMED) {
      await transaction.studentStudyPlan.updateMany({
        where: {
          studentId,
          status: StudyPlanStatus.CONFIRMED,
          id: { not: currentPlan.id },
        },
        data: {
          status: StudyPlanStatus.CANCELLED,
          cancelledAt: now,
        },
      });
    }

    return transaction.studentStudyPlan.update({
      where: { id: currentPlan.id },
      data: {
        status: nextStatus,
        confirmedAt:
          nextStatus === StudyPlanStatus.CONFIRMED ? now : undefined,
        cancelledAt:
          nextStatus === StudyPlanStatus.CANCELLED ? now : undefined,
      },
      include: {
        generation: {
          select: {
            provider: true,
          },
        },
      },
    });
  });

  return NextResponse.json({ plan: toStudyPlanView(updatedPlan) });
}
