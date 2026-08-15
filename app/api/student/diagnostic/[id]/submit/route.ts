import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { checkAnswer } from "@/lib/checkAnswer";
import { getKnownTaskIds } from "@/lib/masteryEvidence";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const submitSchema = z
  .object({ answers: z.record(z.string(), z.string().max(10_000)) })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Некорректный формат ответов" }, { status: 400 });
  }

  const { id } = await context.params;
  const diagnostic = await prisma.studentDiagnosticAttempt.findFirst({
    where: { id, studentId: auth.user.id, status: "IN_PROGRESS" },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { taskRevision: true },
      },
    },
  });
  if (!diagnostic) {
    return NextResponse.json(
      { message: "Активная диагностика не найдена" },
      { status: 404 },
    );
  }

  const knownTaskIds = await getKnownTaskIds(
    auth.user.id,
    diagnostic.items.map((item) => item.taskId),
  );
  const checked = diagnostic.items.map((item) => {
    const rawAnswer = parsed.data.answers[item.id] ?? "";
    const result = checkAnswer({
      answerType: item.taskRevision.answerType,
      correctAnswer: item.taskRevision.correctAnswer,
      studentAnswerText: rawAnswer,
    });
    return { item, rawAnswer, result };
  });
  const score = checked.reduce(
    (total, item) => total + (item.result.isCorrect ? item.item.points : 0),
    0,
  );
  const maxScore = diagnostic.items.reduce((total, item) => total + item.points, 0);
  const completedAt = new Date();

  await prisma.$transaction([
    ...checked.map(({ item, rawAnswer, result }) =>
      prisma.studentDiagnosticItem.update({
        where: { id: item.id },
        data: {
          rawAnswer,
          normalizedAnswer:
            result.normalizedStudentAnswer === null
              ? Prisma.JsonNull
              : result.normalizedStudentAnswer,
          isCorrect: result.isCorrect,
          countsForMastery: !knownTaskIds.has(item.taskId),
        },
      }),
    ),
    prisma.studentDiagnosticAttempt.update({
      where: { id: diagnostic.id },
      data: {
        status: "COMPLETED",
        score,
        maxScore,
        completedAt,
      },
    }),
  ]);

  return NextResponse.json({
    diagnostic: {
      id: diagnostic.id,
      score,
      maxScore,
      completedAt,
    },
  });
}
