import { LearningErrorCause, Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { checkAnswer } from "@/lib/checkAnswer";
import { prisma } from "@/lib/prisma";
import { resolveStudentErrorEvidence } from "@/lib/studentErrors";

export const runtime = "nodejs";

const correctionSchema = z
  .object({
    evidenceKey: z.string().min(3).max(180),
    errorCause: z.nativeEnum(LearningErrorCause),
    reflection: z.string().trim().min(10).max(1_000),
    correctedAnswer: z.string().max(10_000),
  })
  .strict();

export async function PUT(request: Request) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = correctionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Выберите причину, объясните изменение и укажите новый ответ" },
      { status: 400 },
    );
  }

  const evidence = await resolveStudentErrorEvidence(auth.user.id, parsed.data.evidenceKey);
  if (!evidence) {
    return NextResponse.json({ message: "Ошибка не найдена" }, { status: 404 });
  }
  const result = checkAnswer({
    answerType: evidence.taskRevision.answerType,
    correctAnswer: evidence.taskRevision.correctAnswer,
    studentAnswerText: parsed.data.correctedAnswer,
  });
  if (!result.isCorrect) {
    return NextResponse.json(
      { message: result.error ?? "Ответ пока неверный. Проверьте новый ход решения — готовый ответ не раскрывается." },
      { status: 422 },
    );
  }

  const correctedAt = new Date();
  const scheduledFor = new Date(correctedAt);
  scheduledFor.setDate(scheduledFor.getDate() + 7);
  await prisma.studentErrorCorrection.upsert({
    where: {
      studentId_evidenceKey: {
        studentId: auth.user.id,
        evidenceKey: parsed.data.evidenceKey,
      },
    },
    create: {
      studentId: auth.user.id,
      evidenceKey: parsed.data.evidenceKey,
      taskId: evidence.taskId,
      taskRevisionId: evidence.taskRevisionId,
      errorCause: parsed.data.errorCause,
      reflection: parsed.data.reflection,
      correctedAnswer:
        result.normalizedStudentAnswer === null
          ? Prisma.JsonNull
          : result.normalizedStudentAnswer,
      status: "CORRECTED",
      correctedAt,
      scheduledFor,
    },
    update: {
      errorCause: parsed.data.errorCause,
      reflection: parsed.data.reflection,
      correctedAnswer:
        result.normalizedStudentAnswer === null
          ? Prisma.JsonNull
          : result.normalizedStudentAnswer,
      status: "CORRECTED",
      correctedAt,
      scheduledFor,
    },
  });

  return NextResponse.json({ ok: true, scheduledFor });
}
