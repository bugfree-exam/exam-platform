import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const moderationSchema = z.object({
  action: z.enum(["PUBLISH", "REJECT", "UNPUBLISH"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const parsed = moderationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Неизвестное действие модерации" },
        { status: 400 }
      );
    }

    const solution = await prisma.studentTaskSolution.findUnique({
      where: { id },
      select: { id: true, allowPublication: true },
    });
    if (!solution) {
      return NextResponse.json(
        { message: "Решение не найдено" },
        { status: 404 }
      );
    }
    if (parsed.data.action === "PUBLISH" && !solution.allowPublication) {
      return NextResponse.json(
        { message: "Автор не разрешил публичный показ этого решения" },
        { status: 409 }
      );
    }

    const now = new Date();
    const publicationStatus =
      parsed.data.action === "PUBLISH" ? "PUBLISHED" : "REJECTED";
    const updated = await prisma.studentTaskSolution.update({
      where: { id },
      data: {
        publicationStatus,
        reviewedById: auth.user.id,
        reviewedAt: now,
        publishedAt: parsed.data.action === "PUBLISH" ? now : null,
      },
      select: {
        id: true,
        publicationStatus: true,
        reviewedAt: true,
        publishedAt: true,
      },
    });

    return NextResponse.json({ solution: updated });
  } catch (error) {
    console.error("[TEACHER_TASK_SOLUTION_MODERATION]", error);
    return NextResponse.json(
      { message: "Не удалось обновить статус решения" },
      { status: 500 }
    );
  }
}
