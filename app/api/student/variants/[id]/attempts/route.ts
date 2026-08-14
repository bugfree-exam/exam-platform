import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getVariantTaskMaxPoints } from "@/lib/variantScoring";

export const runtime = "nodejs";

const startAttemptSchema = z.object({
  restart: z.boolean().optional().default(false),
  timerEnabled: z.boolean().optional().default(true),
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

    const { id: variantId } = await context.params;
    const body: unknown = await request.json().catch(() => ({}));
    const parsed = startAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Некорректный запрос" },
        { status: 400 }
      );
    }

    const variant = await prisma.examVariant.findFirst({
      where: {
        id: variantId,
        status: "PUBLISHED",
      },
      include: {
        tasks: {
          select: {
            taskRevision: {
              select: {
                egeNumber: true,
              },
            },
          },
        },
      },
    });

    if (!variant || variant.tasks.length !== 27) {
      return NextResponse.json(
        { message: "Вариант не найден или пока недоступен" },
        { status: 404 }
      );
    }

    const assignment = await prisma.variantAssignment.findUnique({
      where: {
        variantId_studentId: {
          variantId,
          studentId: auth.user.id,
        },
      },
      select: {
        assignedAt: true,
      },
    });

    const currentAttempt = await prisma.variantAttempt.findFirst({
      where: {
        variantId,
        studentId: auth.user.id,
        status: "IN_PROGRESS",
        ...(assignment
          ? { startedAt: { gte: assignment.assignedAt } }
          : {}),
      },
      orderBy: {
        startedAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (currentAttempt) {
      return NextResponse.json({
        attempt: currentAttempt,
        resumed: true,
      });
    }

    const attempt = await prisma.variantAttempt.create({
      data: {
        variantId,
        studentId: auth.user.id,
        timerEnabled: parsed.data.timerEnabled,
        maxScore: variant.tasks.reduce(
          (sum, variantTask) =>
            sum + getVariantTaskMaxPoints(variantTask.taskRevision.egeNumber),
          0
        ),
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json(
      {
        attempt,
        resumed: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[STUDENT_VARIANT_ATTEMPT_START]", error);

    return NextResponse.json(
      { message: "Не удалось начать вариант" },
      { status: 500 }
    );
  }
}
