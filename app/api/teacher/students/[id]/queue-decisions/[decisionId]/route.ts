import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; decisionId: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(UserRole.TEACHER);
  if (!auth.ok) return auth.response;
  const { id, decisionId } = await context.params;
  const result = await prisma.studentQueueDecision.updateMany({
    where: { id: decisionId, studentId: id, state: "HELP_REQUESTED" },
    data: { state: "ACTIVE", scheduledFor: null, helpRequestedAt: null },
  });
  if (result.count === 0) {
    return NextResponse.json({ message: "Активный запрос не найден" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
