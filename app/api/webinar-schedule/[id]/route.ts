import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { parseMoscowDateTime } from "@/lib/moscowDateTime";
import { prisma } from "@/lib/prisma";
import { webinarScheduleSchema } from "@/lib/webinarSchedule";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const parsed = webinarScheduleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Проверьте данные" },
        { status: 400 }
      );
    }

    const scheduledAt = parseMoscowDateTime(
      parsed.data.eventDate,
      parsed.data.eventTime
    );
    if (!scheduledAt) {
      return NextResponse.json(
        { message: "Укажите корректные дату и время" },
        { status: 400 }
      );
    }

    const result = await prisma.webinarSchedule.updateMany({
      where: { id },
      data: {
        topic: parsed.data.topic,
        announcement: parsed.data.announcement || null,
        joinUrl: parsed.data.joinUrl,
        scheduledAt,
        isPublished: parsed.data.isPublished,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "Событие не найдено" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBINAR_SCHEDULE_PATCH]", error);
    return NextResponse.json(
      { message: "Не удалось обновить расписание" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const result = await prisma.webinarSchedule.deleteMany({ where: { id } });

    if (result.count === 0) {
      return NextResponse.json({ message: "Событие не найдено" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBINAR_SCHEDULE_DELETE]", error);
    return NextResponse.json(
      { message: "Не удалось удалить событие" },
      { status: 500 }
    );
  }
}
