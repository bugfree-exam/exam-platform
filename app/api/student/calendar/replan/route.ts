import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const replanSchema = z
  .object({
    weeklyMinutes: z.number().int().min(60).max(1800),
    reason: z.string().min(3).max(300),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = replanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Укажите новый недельный ресурс и причину изменения" },
      { status: 400 },
    );
  }

  const profile = await prisma.studentPreparationProfile.updateMany({
    where: { studentId: auth.user.id },
    data: { weeklyMinutes: parsed.data.weeklyMinutes },
  });
  if (profile.count === 0) {
    return NextResponse.json(
      { message: "Сначала завершите онбординг" },
      { status: 409 },
    );
  }
  const adjustmentRequest = await prisma.studentQueueDecision.create({
    data: {
      studentId: auth.user.id,
      itemKey: `course-adjustment-${Date.now()}`,
      state: "HELP_REQUESTED",
      helpRequestedAt: new Date(),
      note: `Изменился доступный ресурс: ${parsed.data.weeklyMinutes} мин/нед. ${parsed.data.reason.trim()}`,
    },
  });

  return NextResponse.json({ requestId: adjustmentRequest.id });
}
