import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const assignVariantSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1).max(500),
  deadline: z.string().datetime().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);
    if (!auth.ok) return auth.response;

    const { id: variantId } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = assignVariantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Выберите хотя бы одного ученика и проверьте срок выполнения" },
        { status: 400 }
      );
    }

    const uniqueStudentIds = Array.from(new Set(parsed.data.studentIds));
    const [variant, studentCount] = await Promise.all([
      prisma.examVariant.findFirst({
        where: { id: variantId, status: "PUBLISHED" },
        select: { id: true, tasks: { select: { id: true } } },
      }),
      prisma.user.count({
        where: {
          id: { in: uniqueStudentIds },
          role: "STUDENT",
          studentStatus: "ACTIVE",
        },
      }),
    ]);

    if (!variant || variant.tasks.length !== 27) {
      return NextResponse.json(
        { message: "Выдать можно только опубликованный вариант из 27 заданий" },
        { status: 400 }
      );
    }

    if (studentCount !== uniqueStudentIds.length) {
      return NextResponse.json(
        { message: "Некоторые ученики не найдены или не имеют активного доступа" },
        { status: 400 }
      );
    }

    const deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;

    await prisma.$transaction(
      uniqueStudentIds.map((studentId) =>
        prisma.variantAssignment.upsert({
          where: { variantId_studentId: { variantId, studentId } },
          create: { variantId, studentId, deadline },
          update: { deadline, assignedAt: new Date() },
        })
      )
    );

    return NextResponse.json({ assignedCount: uniqueStudentIds.length });
  } catch (error) {
    console.error("[VARIANT_ASSIGNMENTS_POST]", error);
    return NextResponse.json(
      { message: "Не удалось выдать вариант" },
      { status: 500 }
    );
  }
}
