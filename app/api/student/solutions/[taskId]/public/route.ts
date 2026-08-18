import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  formatPublicStudentName,
  getStudentTaskSolutionAccess,
} from "@/lib/studentSolutions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;

  const { taskId } = await context.params;
  const taskRevisionId = new URL(request.url).searchParams.get("revision");
  if (!taskRevisionId) {
    return NextResponse.json(
      { message: "Не указана версия задания" },
      { status: 400 }
    );
  }
  const access = await getStudentTaskSolutionAccess(
    auth.user.id,
    taskId,
    taskRevisionId
  );

  if (!access.canViewPublished || !access.taskRevisionId) {
    return NextResponse.json(
      {
        message:
          "Готовые решения откроются после верного ответа или повторной попытки",
      },
      { status: 403 }
    );
  }

  const solutions = await prisma.studentTaskSolution.findMany({
    where: {
      taskId,
      taskRevisionId: access.taskRevisionId,
      studentId: { not: auth.user.id },
      allowPublication: true,
      publicationStatus: "PUBLISHED",
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 12,
    select: {
      id: true,
      code: true,
      language: true,
      publishedAt: true,
      student: { select: { name: true } },
      taskRevision: { select: { version: true } },
    },
  });

  return NextResponse.json(
    {
      solutions: solutions.map((solution) => ({
        id: solution.id,
        code: solution.code,
        language: solution.language,
        author: formatPublicStudentName(solution.student.name),
        version: solution.taskRevision.version,
        publishedAt: solution.publishedAt,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
