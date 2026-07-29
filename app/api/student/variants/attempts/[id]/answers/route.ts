import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const saveAnswersSchema = z.object({
  answers: z.record(z.string(), z.string()).refine(
    (answers) => Object.keys(answers).length <= 27,
    "Слишком много ответов"
  ),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.STUDENT);

    if (!auth.ok) {
      return auth.response;
    }

    const { id: attemptId } = await context.params;
    const body: unknown = await request.json();
    const parsed = saveAnswersSchema.safeParse(body);

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
        variant: {
          include: {
            tasks: {
              select: {
                taskId: true,
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

    const allowedTaskIds = new Set(
      attempt.variant.tasks.map((variantTask) => variantTask.taskId)
    );
    const entries = Object.entries(parsed.data.answers).filter(([taskId]) =>
      allowedTaskIds.has(taskId)
    );

    if (entries.length > 0) {
      await prisma.$transaction(
        entries.map(([taskId, rawAnswer]) =>
          prisma.variantAttemptAnswer.upsert({
            where: {
              attemptId_taskId: {
                attemptId,
                taskId,
              },
            },
            create: {
              attemptId,
              taskId,
              rawAnswer,
            },
            update: {
              rawAnswer,
            },
          })
        )
      );
    }

    return NextResponse.json({
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[STUDENT_VARIANT_ANSWERS_SAVE]", error);

    return NextResponse.json(
      { message: "Не удалось сохранить ответы" },
      { status: 500 }
    );
  }
}
