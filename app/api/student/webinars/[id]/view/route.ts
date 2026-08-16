import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type WebinarViewRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: WebinarViewRouteProps) {
  const auth = await requireApiRole(UserRole.STUDENT);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const webinar = await prisma.webinar.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!webinar) {
    return NextResponse.json({ message: "Вебинар не найден" }, { status: 404 });
  }

  await prisma.webinarView.upsert({
    where: {
      studentId_webinarId: {
        studentId: auth.user.id,
        webinarId: webinar.id,
      },
    },
    create: {
      studentId: auth.user.id,
      webinarId: webinar.id,
    },
    update: {
      lastViewedAt: new Date(),
      viewCount: { increment: 1 },
    },
  });

  return new NextResponse(null, { status: 204 });
}
