import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { EGE_SKILL_MAP } from "@/lib/egeSkillMap";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DIAGNOSTIC_LIMIT = 12;

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

  const active = await prisma.studentDiagnosticAttempt.findFirst({
    where: { studentId: auth.user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (active) return NextResponse.json({ diagnosticId: active.id, resumed: true });

  const tasks = await prisma.task.findMany({
    where: { isArchived: false, currentRevisionId: { not: null } },
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
    select: { id: true, egeNumber: true, currentRevisionId: true },
  });
  const firstByNumber = new Map<number, (typeof tasks)[number]>();
  for (const task of tasks) {
    if (!firstByNumber.has(task.egeNumber)) firstByNumber.set(task.egeNumber, task);
  }
  const stages = ["FOUNDATION", "CORE", "ADVANCED", "EXAM"] as const;
  const stageQueues = stages.map((stage) =>
    EGE_SKILL_MAP
      .filter((skill) => skill.stage === stage)
      .map((skill) => firstByNumber.get(skill.egeNumber))
      .filter((task): task is NonNullable<typeof task> => Boolean(task)),
  );
  const selected: (typeof tasks)[number][] = [];
  while (selected.length < DIAGNOSTIC_LIMIT && stageQueues.some((queue) => queue.length)) {
    for (const queue of stageQueues) {
      const task = queue.shift();
      if (task) selected.push(task);
      if (selected.length === DIAGNOSTIC_LIMIT) break;
    }
  }

  if (selected.length < 3) {
    return NextResponse.json(
      { message: "Для честной диагностики нужно минимум три номера в банке заданий" },
      { status: 409 },
    );
  }

  const diagnostic = await prisma.studentDiagnosticAttempt.create({
    data: {
      studentId: auth.user.id,
      maxScore: selected.length,
      items: {
        create: selected.map((task, index) => ({
          taskId: task.id,
          taskRevisionId: task.currentRevisionId!,
          order: index + 1,
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
