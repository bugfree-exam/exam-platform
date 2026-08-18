import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const heartbeatSchema = z
  .object({
    sessionId: z.string().uuid(),
    path: z.string().min(1).max(500),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;

  const body: unknown = await request.json();
  const parsed = heartbeatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Некорректные данные активности" }, { status: 400 });
  }

  const now = new Date();
  const { sessionId, path } = parsed.data;
  let session = await prisma.studentActivitySession.findUnique({
    where: { browserSessionId: sessionId },
    select: { id: true, studentId: true, lastPath: true },
  });

  if (!session) {
    // In development React can mount the heartbeat twice, and route changes can
    // also produce overlapping requests. createMany + skipDuplicates turns
    // that race into an idempotent insert instead of a noisy Prisma P2002.
    await prisma.studentActivitySession.createMany({
      data: {
        studentId: auth.user.id,
        browserSessionId: sessionId,
        startedAt: now,
        lastSeenAt: now,
        lastPath: path,
        pageViews: 1,
      },
      skipDuplicates: true,
    });

    session = await prisma.studentActivitySession.findUnique({
      where: { browserSessionId: sessionId },
      select: { id: true, studentId: true, lastPath: true },
    });
  }

  if (!session) {
    return NextResponse.json(
      { message: "Не удалось сохранить активность" },
      { status: 500 }
    );
  }

  if (session.studentId !== auth.user.id) {
    return NextResponse.json({ message: "Конфликт сессии" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.studentActivitySession.update({
      where: { id: session.id },
      data: {
        lastSeenAt: now,
        lastPath: path,
        ...(session.lastPath !== path ? { pageViews: { increment: 1 } } : {}),
      },
    }),
    prisma.user.update({
      where: { id: auth.user.id },
      data: { lastActivityAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
