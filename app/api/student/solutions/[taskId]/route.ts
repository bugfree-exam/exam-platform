import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getStudentTaskSolutionAccess } from "@/lib/studentSolutions";

export const runtime = "nodejs";

const solutionSchema = z.object({
  code: z.string().trim().min(1).max(50_000),
  allowPublication: z.boolean(),
  taskRevisionId: z.string().min(1),
});

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;

  const { taskId } = await context.params;
  const solution = await prisma.studentTaskSolution.findUnique({
    where: {
      studentId_taskId: { studentId: auth.user.id, taskId },
    },
    select: {
      id: true,
      code: true,
      language: true,
      taskRevisionId: true,
      allowPublication: true,
      publicationStatus: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    { solution },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.STUDENT);
    if (!auth.ok) return auth.response;

    const { taskId } = await context.params;
    const parsed = solutionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Добавьте код решения длиной не более 50 000 символов" },
        { status: 400 }
      );
    }

    const [task, access, existing] = await Promise.all([
      prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true },
      }),
      getStudentTaskSolutionAccess(
        auth.user.id,
        taskId,
        parsed.data.taskRevisionId
      ),
      prisma.studentTaskSolution.findUnique({
        where: {
          studentId_taskId: { studentId: auth.user.id, taskId },
        },
        select: {
          id: true,
          code: true,
          taskRevisionId: true,
          publicationStatus: true,
          reviewedById: true,
          reviewedAt: true,
          publishedAt: true,
        },
      }),
    ]);

    if (!task) {
      return NextResponse.json(
        { message: "Задание не найдено" },
        { status: 404 }
      );
    }
    if (!access.hasAttempt || !access.taskRevisionId) {
      return NextResponse.json(
        { message: "Сначала отправьте ответ на это задание" },
        { status: 403 }
      );
    }

    const contentChanged =
      existing?.code !== parsed.data.code ||
      existing?.taskRevisionId !== access.taskRevisionId;
    const keepPublished = Boolean(
      existing?.publicationStatus === "PUBLISHED" &&
        !contentChanged &&
        parsed.data.allowPublication
    );
    const publicationStatus = keepPublished
      ? "PUBLISHED"
      : parsed.data.allowPublication
        ? "PENDING_REVIEW"
        : "PRIVATE";
    const reviewData = keepPublished
      ? {
          reviewedById: existing?.reviewedById,
          reviewedAt: existing?.reviewedAt,
          publishedAt: existing?.publishedAt,
        }
      : {
          reviewedById: null,
          reviewedAt: null,
          publishedAt: null,
        };

    const solution = await prisma.studentTaskSolution.upsert({
      where: {
        studentId_taskId: { studentId: auth.user.id, taskId },
      },
      create: {
        studentId: auth.user.id,
        taskId,
        taskRevisionId: access.taskRevisionId,
        code: parsed.data.code,
        allowPublication: parsed.data.allowPublication,
        publicationStatus,
      },
      update: {
        taskRevisionId: access.taskRevisionId,
        code: parsed.data.code,
        allowPublication: parsed.data.allowPublication,
        publicationStatus,
        ...reviewData,
      },
      select: {
        id: true,
        code: true,
        language: true,
        taskRevisionId: true,
        allowPublication: true,
        publicationStatus: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ solution });
  } catch (error) {
    console.error("[STUDENT_TASK_SOLUTION_SAVE]", error);
    return NextResponse.json(
      { message: "Не удалось сохранить решение" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.STUDENT);
    if (!auth.ok) return auth.response;

    const { taskId } = await context.params;
    await prisma.studentTaskSolution.deleteMany({
      where: { studentId: auth.user.id, taskId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[STUDENT_TASK_SOLUTION_DELETE]", error);
    return NextResponse.json(
      { message: "Не удалось удалить решение" },
      { status: 500 }
    );
  }
}
