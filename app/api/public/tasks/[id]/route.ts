import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      isPublic: true,
      isArchived: false,
    },
    select: {
      id: true,
      egeNumber: true,
      title: true,
      statementHtml: true,
      referenceHtml: true,
      answerType: true,
      difficulty: true,
      skillTag: true,
      currentRevision: {
        select: {
          version: true,
          attachments: {
            orderBy: { order: "asc" },
            select: {
              attachment: {
                select: {
                  id: true,
                  originalName: true,
                  extension: true,
                  sizeBytes: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json(
      { message: "Задача не найдена" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      task: {
        ...task,
        version: task.currentRevision?.version ?? null,
        attachments:
          task.currentRevision?.attachments.map((link) => link.attachment) ?? [],
        currentRevision: undefined,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
