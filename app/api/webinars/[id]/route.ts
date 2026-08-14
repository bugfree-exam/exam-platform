import {
  WebinarMaterialType,
  WebinarStatus,
  WebinarVideoProvider,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWebinarEmbedUrl } from "@/lib/webinarVideo";
import { hasEditorContent, sanitizeEditorHtml } from "@/lib/sanitizeHtml";

export const runtime = "nodejs";

const materialSchema = z.object({
  title: z.string().min(1, "Введите название материала").max(200),
  url: z.string().min(1, "Введите ссылку на материал").max(1000),
  type: z.nativeEnum(WebinarMaterialType),
});

const updateWebinarSchema = z.object({
  title: z.string().min(1, "Введите название вебинара").max(200),
  description: z.string().optional().nullable(),
  contentHtml: z.string().min(1, "Добавьте текст/конспект вебинара"),
  videoUrl: z.string().min(1, "Добавьте ссылку на видео").max(1000),
  videoEmbedUrl: z.string().optional().nullable(),
  videoProvider: z.nativeEnum(WebinarVideoProvider),
  status: z.nativeEnum(WebinarStatus),
  eventDate: z.string().optional().nullable(),
  materials: z.array(materialSchema).default([]),
  topic: z.string().optional().nullable(),
  egeNumber: z.string().optional().nullable(),
  practiceHomeworkId: z.string().optional().nullable(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    const body = await request.json();
    const parsed = updateWebinarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Некорректные данные вебинара",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const contentHtml = sanitizeEditorHtml(parsed.data.contentHtml);

    if (!hasEditorContent(contentHtml)) {
      return NextResponse.json(
        { message: "Добавьте конспект вебинара" },
        { status: 400 }
      );
    }

    const existingWebinar = await prisma.webinar.findUnique({
      where: {
        id,
      },
    });

    if (!existingWebinar) {
      return NextResponse.json(
        { message: "Вебинар не найден" },
        { status: 404 }
      );
    }

    const eventDate = parsed.data.eventDate
      ? new Date(parsed.data.eventDate)
      : null;

    if (parsed.data.eventDate && Number.isNaN(eventDate?.getTime())) {
      return NextResponse.json(
        { message: "Некорректная дата вебинара" },
        { status: 400 }
      );
    }

    const egeNumber = parsed.data.egeNumber
      ? Number(parsed.data.egeNumber)
      : null;

    if (
      egeNumber !== null &&
      (!Number.isInteger(egeNumber) || egeNumber < 1 || egeNumber > 27)
    ) {
      return NextResponse.json(
        { message: "Номер ЕГЭ должен быть от 1 до 27" },
        { status: 400 }
      );
    }

    const practiceHomeworkId = parsed.data.practiceHomeworkId?.trim() || null;

    if (practiceHomeworkId) {
      const practiceHomework = await prisma.homework.findFirst({
        where: {
          id: practiceHomeworkId,
          status: {
            not: "ARCHIVED",
          },
        },
        select: {
          id: true,
        },
      });

      if (!practiceHomework) {
        return NextResponse.json(
          { message: "Выбранное ДЗ для отработки не найдено или находится в архиве" },
          { status: 400 }
        );
      }
    }

    const videoEmbedUrl = getWebinarEmbedUrl({
      provider: parsed.data.videoProvider,
      videoUrl: parsed.data.videoUrl,
      videoEmbedUrl: parsed.data.videoEmbedUrl ?? null,
    });

    const webinar = await prisma.$transaction(async (tx) => {
      await tx.webinarMaterial.deleteMany({
        where: {
          webinarId: id,
        },
      });

      const updatedWebinar = await tx.webinar.update({
        where: {
          id,
        },
        data: {
          title: parsed.data.title.trim(),
          description: parsed.data.description?.trim() || null,
          contentHtml,
          videoUrl: parsed.data.videoUrl.trim(),
          videoEmbedUrl,
          videoProvider: parsed.data.videoProvider,
          status: parsed.data.status,
          topic: parsed.data.topic?.trim() || null,
          egeNumber,
          practiceHomeworkId,
          eventDate,
          publishedAt:
            parsed.data.status === WebinarStatus.PUBLISHED
              ? existingWebinar.publishedAt ?? new Date()
              : existingWebinar.publishedAt,
          materials: {
            create: parsed.data.materials.map((material, index) => ({
              title: material.title.trim(),
              url: material.url.trim(),
              type: material.type,
              order: index + 1,
            })),
          },
        },
      });

      return updatedWebinar;
    });

    return NextResponse.json({ webinar });
  } catch (error) {
    console.error("[WEBINARS_ID_PUT]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при обновлении вебинара" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const webinar = await prisma.webinar.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!webinar) {
      return NextResponse.json({ message: "Вебинар не найден" }, { status: 404 });
    }

    await prisma.webinar.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBINARS_ID_DELETE]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при удалении вебинара" },
      { status: 500 }
    );
  }
}
