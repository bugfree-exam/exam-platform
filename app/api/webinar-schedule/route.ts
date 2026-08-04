import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { parseMoscowDateTime } from "@/lib/moscowDateTime";
import { prisma } from "@/lib/prisma";
import { webinarScheduleSchema } from "@/lib/webinarSchedule";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);
    if (!auth.ok) return auth.response;

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

    const event = await prisma.webinarSchedule.create({
      data: {
        topic: parsed.data.topic,
        announcement: parsed.data.announcement || null,
        joinUrl: parsed.data.joinUrl,
        scheduledAt,
        isPublished: parsed.data.isPublished,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[WEBINAR_SCHEDULE_POST]", error);
    return NextResponse.json(
      { message: "Не удалось добавить вебинар в расписание" },
      { status: 500 }
    );
  }
}
