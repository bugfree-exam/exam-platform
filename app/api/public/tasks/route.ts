import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().slice(0, 200) ?? "";
  const topic = searchParams.get("topic")?.trim().slice(0, 120) ?? "";
  const rawEgeNumber = Number(searchParams.get("egeNumber"));
  const rawPage = Number(searchParams.get("page"));
  const page =
    Number.isInteger(rawPage) && rawPage > 0
      ? Math.min(rawPage, 10_000)
      : 1;
  const pageSize = 50;
  const egeNumber =
    Number.isInteger(rawEgeNumber) &&
    rawEgeNumber >= 1 &&
    rawEgeNumber <= 27
      ? rawEgeNumber
      : null;

  const where: Prisma.TaskWhereInput = {
    isPublic: true,
    isArchived: false,
    ...(egeNumber ? { egeNumber } : {}),
    ...(topic ? { skillTag: topic } : {}),
    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              statementHtml: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        egeNumber: true,
        title: true,
        difficulty: true,
        skillTag: true,
      },
      orderBy: [{ egeNumber: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json(
    {
      tasks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
