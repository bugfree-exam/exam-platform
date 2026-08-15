import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { getPublishedDiagnosticTemplate } from "@/lib/course";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;

  const profile = await prisma.studentPreparationProfile.findUnique({
    where: { studentId: auth.user.id },
    select: { studentId: true },
  });
  if (!profile) {
    return NextResponse.json(
      { message: "Сначала укажите цель, срок и доступное время" },
      { status: 409 },
    );
  }

  const template = await getPublishedDiagnosticTemplate(auth.user.id);
  if (!template) {
    return NextResponse.json(
      { message: "Преподаватель ещё не опубликовал входной контроль курса" },
      { status: 409 },
    );
  }

  const active = await prisma.studentDiagnosticAttempt.findFirst({
    where: {
      studentId: auth.user.id,
      status: "IN_PROGRESS",
      templateId: template.id,
    },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (active) return NextResponse.json({ diagnosticId: active.id, resumed: true });

  const completed = await prisma.studentDiagnosticAttempt.findFirst({
    where: {
      studentId: auth.user.id,
      status: "COMPLETED",
      templateId: template.id,
    },
    select: { id: true },
  });
  if (completed) {
    return NextResponse.json(
      { message: "Эта версия входного контроля уже пройдена" },
      { status: 409 },
    );
  }

  const diagnostic = await prisma.studentDiagnosticAttempt.create({
    data: {
      studentId: auth.user.id,
      templateId: template.id,
      maxScore: template.items.reduce((sum, item) => sum + item.points, 0),
      items: {
        create: template.items.map((item) => ({
          taskId: item.taskId,
          taskRevisionId: item.taskRevisionId,
          order: item.order,
          level: item.level,
          points: item.points,
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json(
    { diagnosticId: diagnostic.id, resumed: false },
    { status: 201 },
  );
}
