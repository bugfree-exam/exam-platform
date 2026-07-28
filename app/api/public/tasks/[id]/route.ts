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
      answerType: true,
      difficulty: true,
      attachments: {
        select: {
          id: true,
          originalName: true,
          extension: true,
          sizeBytes: true,
        },
        orderBy: {
          createdAt: "asc",
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
    { task },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
