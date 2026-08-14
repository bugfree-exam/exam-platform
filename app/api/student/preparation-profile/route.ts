import { PreparationLevel, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { generateStudentRoadmap } from "@/lib/studentJourney";

export const runtime = "nodejs";

const profileSchema = z
  .object({
    targetScore: z.number().int().min(40).max(100),
    examDate: z.string().datetime(),
    weeklyMinutes: z.number().int().min(60).max(1800),
    sessionMinutes: z.number().int().min(20).max(180),
    preferredDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    currentLevel: z.nativeEnum(PreparationLevel),
  })
  .strict();

export async function PUT(request: Request) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Проверьте цель, дату экзамена и доступное время" },
      { status: 400 },
    );
  }

  const examDate = new Date(parsed.data.examDate);
  const now = new Date();
  const maximumDate = new Date(now);
  maximumDate.setUTCFullYear(maximumDate.getUTCFullYear() + 2);
  if (examDate <= now || examDate > maximumDate) {
    return NextResponse.json(
      { message: "Дата экзамена должна быть в будущем и не дальше двух лет" },
      { status: 400 },
    );
  }

  const preferredDays = Array.from(new Set(parsed.data.preferredDays)).sort();
  const profile = await prisma.studentPreparationProfile.upsert({
    where: { studentId: auth.user.id },
    create: {
      studentId: auth.user.id,
      targetScore: parsed.data.targetScore,
      examDate,
      weeklyMinutes: parsed.data.weeklyMinutes,
      sessionMinutes: parsed.data.sessionMinutes,
      preferredDays,
      currentLevel: parsed.data.currentLevel,
    },
    update: {
      targetScore: parsed.data.targetScore,
      examDate,
      weeklyMinutes: parsed.data.weeklyMinutes,
      sessionMinutes: parsed.data.sessionMinutes,
      preferredDays,
      currentLevel: parsed.data.currentLevel,
      completedAt: now,
    },
    select: { studentId: true, completedAt: true },
  });

  const completedDiagnostic = await prisma.studentDiagnosticAttempt.findFirst({
    where: { studentId: auth.user.id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });
  if (completedDiagnostic) {
    await generateStudentRoadmap(auth.user.id, completedDiagnostic.id);
  }

  return NextResponse.json({ profile });
}
