import { RecoveryReason, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const recoverySchema = z
  .object({
    reason: z.nativeEnum(RecoveryReason),
    weeklyMinutes: z.number().int().min(60).max(900),
    mainGoal: z.string().min(3).max(200),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = recoverySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Укажите причину, реальное время и одну цель недели" },
      { status: 400 },
    );
  }

  const startedAt = new Date();
  const endsAt = new Date(startedAt);
  endsAt.setDate(endsAt.getDate() + 7);

  const recovery = await prisma.$transaction(async (tx) => {
    await tx.studentRecoveryPeriod.updateMany({
      where: { studentId: auth.user.id, status: "ACTIVE" },
      data: { status: "CANCELLED", completedAt: startedAt },
    });
    return tx.studentRecoveryPeriod.create({
      data: {
        studentId: auth.user.id,
        reason: parsed.data.reason,
        weeklyMinutes: parsed.data.weeklyMinutes,
        mainGoal: parsed.data.mainGoal.trim(),
        startedAt,
        endsAt,
        reviewAt: endsAt,
      },
      select: { id: true, reviewAt: true },
    });
  });

  return NextResponse.json({ recovery }, { status: 201 });
}

export async function PATCH() {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;
  const completedAt = new Date();
  await prisma.studentRecoveryPeriod.updateMany({
    where: { studentId: auth.user.id, status: "ACTIVE" },
    data: { status: "COMPLETED", completedAt },
  });
  return NextResponse.json({ ok: true });
}
