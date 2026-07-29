import { UserRole, VariantStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const updateVariantSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = updateVariantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Некорректный статус варианта" },
        { status: 400 }
      );
    }

    const variant = await prisma.examVariant.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!variant) {
      return NextResponse.json(
        { message: "Вариант не найден" },
        { status: 404 }
      );
    }

    if (parsed.data.status === "PUBLISHED" && variant._count.tasks !== 27) {
      return NextResponse.json(
        { message: "Опубликовать можно только полный вариант из 27 заданий" },
        { status: 400 }
      );
    }

    const updatedVariant = await prisma.examVariant.update({
      where: { id },
      data: {
        status: parsed.data.status as VariantStatus,
      },
      select: {
        id: true,
        status: true,
      },
    });

    return NextResponse.json({ variant: updatedVariant });
  } catch (error) {
    console.error("[VARIANT_PATCH]", error);

    return NextResponse.json(
      { message: "Не удалось изменить статус варианта" },
      { status: 500 }
    );
  }
}
