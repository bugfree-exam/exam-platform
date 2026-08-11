import { LearningErrorCause, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const errorCauseSchema = z
  .object({ errorCause: z.nativeEnum(LearningErrorCause) })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json();
  const parsed = errorCauseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Выберите причину ошибки" }, { status: 400 });
  }

  const { id } = await context.params;
  const attempt = await prisma.practiceAttempt.findFirst({
    where: { id, studentId: auth.user.id },
    select: { id: true, isCorrect: true },
  });
  if (!attempt) {
    return NextResponse.json({ message: "Попытка не найдена" }, { status: 404 });
  }
  if (attempt.isCorrect) {
    return NextResponse.json(
      { message: "Причина ошибки доступна только для неверной попытки" },
      { status: 409 }
    );
  }

  await prisma.practiceAttempt.update({
    where: { id: attempt.id },
    data: { errorCause: parsed.data.errorCause },
  });

  return NextResponse.json({ ok: true, errorCause: parsed.data.errorCause });
}
