import { QueueDecisionState, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const decisionSchema = z
  .object({
    itemKey: z.string().min(1).max(180),
    state: z.nativeEnum(QueueDecisionState),
    scheduledFor: z.string().datetime().optional().nullable(),
    note: z.string().max(500).optional().nullable(),
  })
  .strict();

export async function PUT(request: Request) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Некорректное действие" }, { status: 400 });
  }

  const scheduledFor = parsed.data.scheduledFor
    ? new Date(parsed.data.scheduledFor)
    : null;
  if (parsed.data.state === QueueDecisionState.SNOOZED && !scheduledFor) {
    return NextResponse.json(
      { message: "Выберите дату переноса" },
      { status: 400 },
    );
  }
  if (scheduledFor) {
    const latest = new Date();
    latest.setDate(latest.getDate() + 180);
    if (scheduledFor < new Date() || scheduledFor > latest) {
      return NextResponse.json(
        { message: "Перенести можно на будущую дату в пределах 180 дней" },
        { status: 400 },
      );
    }
  }

  await prisma.studentQueueDecision.upsert({
    where: {
      studentId_itemKey: { studentId: auth.user.id, itemKey: parsed.data.itemKey },
    },
    create: {
      studentId: auth.user.id,
      itemKey: parsed.data.itemKey,
      state: parsed.data.state,
      scheduledFor,
      note: parsed.data.note?.trim() || null,
      helpRequestedAt:
        parsed.data.state === QueueDecisionState.HELP_REQUESTED ? new Date() : null,
    },
    update: {
      state: parsed.data.state,
      scheduledFor,
      note: parsed.data.note?.trim() || null,
      helpRequestedAt:
        parsed.data.state === QueueDecisionState.HELP_REQUESTED ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
