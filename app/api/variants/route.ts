import { UserRole, VariantStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createVariantSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  durationMinutes: z.number().int().min(60).max(360),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  taskIds: z.array(z.string()).length(27),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const body: unknown = await request.json();
    const parsed = createVariantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Проверьте название, время и состав варианта" },
        { status: 400 }
      );
    }

    const uniqueTaskIds = Array.from(new Set(parsed.data.taskIds));

    if (uniqueTaskIds.length !== 27) {
      return NextResponse.json(
        { message: "В варианте должно быть 27 разных заданий" },
        { status: 400 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: {
        id: { in: uniqueTaskIds },
        isArchived: false,
      },
      select: {
        id: true,
        egeNumber: true,
        currentRevisionId: true,
      },
    });

    if (tasks.length !== 27) {
      return NextResponse.json(
        { message: "Некоторые задания не найдены или находятся в архиве" },
        { status: 400 }
      );
    }

    if (tasks.some((task) => !task.currentRevisionId)) {
      return NextResponse.json(
        { message: "У некоторых заданий отсутствует опубликованная версия" },
        { status: 409 }
      );
    }

    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const invalidPosition = parsed.data.taskIds.findIndex(
      (taskId, index) => taskById.get(taskId)?.egeNumber !== index + 1
    );

    if (invalidPosition !== -1) {
      return NextResponse.json(
        {
          message: `В позиции №${invalidPosition + 1} должно находиться задание ЕГЭ №${invalidPosition + 1}`,
        },
        { status: 400 }
      );
    }

    const variant = await prisma.examVariant.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        durationMinutes: parsed.data.durationMinutes,
        status:
          parsed.data.status === "PUBLISHED"
            ? VariantStatus.PUBLISHED
            : VariantStatus.DRAFT,
        tasks: {
          create: parsed.data.taskIds.map((taskId, index) => ({
            taskId,
            taskRevisionId: taskById.get(taskId)!.currentRevisionId!,
            order: index + 1,
            points: index >= 25 ? 2 : 1,
          })),
        },
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    console.error("[VARIANTS_POST]", error);

    return NextResponse.json(
      { message: "Не удалось создать вариант" },
      { status: 500 }
    );
  }
}
