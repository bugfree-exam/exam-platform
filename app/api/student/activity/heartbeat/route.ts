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

  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO "StudentActivitySession" (
        "id",
        "studentId",
        "browserSessionId",
        "startedAt",
        "lastSeenAt",
        "lastPath",
        "pageViews",
        "createdAt"
      )
      VALUES (
        ${crypto.randomUUID()},
        ${auth.user.id},
        ${sessionId},
        ${now},
        ${now},
        ${path},
        1,
        ${now}
      )
      ON CONFLICT ("browserSessionId") DO UPDATE SET
        "lastSeenAt" = EXCLUDED."lastSeenAt",
        "pageViews" = CASE
          WHEN "StudentActivitySession"."lastPath" IS DISTINCT FROM EXCLUDED."lastPath"
            THEN "StudentActivitySession"."pageViews" + 1
          ELSE "StudentActivitySession"."pageViews"
        END,
        "lastPath" = EXCLUDED."lastPath"
      WHERE "StudentActivitySession"."studentId" = EXCLUDED."studentId"
    `,
    prisma.user.update({
      where: { id: auth.user.id },
      data: { lastActivityAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
