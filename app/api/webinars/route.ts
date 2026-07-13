import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWebinarEmbedUrl } from "@/lib/webinarVideo";

export const runtime = "nodejs";

const materialTypeSchema = z.enum([
  "LINK",
  "CHEATSHEET",
  "PRESENTATION",
  "DOCUMENT",
  "CODE",
  "OTHER",
]);

const webinarStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const webinarVideoProviderSchema = z.enum([
  "RUTUBE",
  "YANDEX_DISK",
  "EXTERNAL",
]);

const materialSchema = z.object({
  title: z.string().min(1, "Введите название материала").max(200),
  url: z.string().min(1, "Введите ссылку на материал").max(1000),
  type: materialTypeSchema,
});

const createWebinarSchema = z.object({
  title: z.string().min(1, "Введите название вебинара").max(200),
  description: z.string().optional().nullable(),
  contentHtml: z.string().min(1, "Добавьте текст/конспект вебинара"),
  videoUrl: z.string().min(1, "Добавьте ссылку на видео").max(1000),
  videoEmbedUrl: z.string().optional().nullable(),
  videoProvider: webinarVideoProviderSchema,
  status: webinarStatusSchema,
  eventDate: z.string().optional().nullable(),
  materials: z.array(materialSchema).default([]),
  topic: z.string().optional().nullable(),
  egeNumber: z.string().optional().nullable(),
});

async function requireTeacher() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "Не авторизован" },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "TEACHER") {
    return {
      user: null,
      response: NextResponse.json(
        { message: "Недостаточно прав" },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

export async function POST(request: Request) {
  try {
    const { response } = await requireTeacher();

    if (response) {
      return response;
    }

    const body = await request.json();
    const parsed = createWebinarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Некорректные данные вебинара",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
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

    const videoEmbedUrl = getWebinarEmbedUrl({
      provider: parsed.data.videoProvider,
      videoUrl: parsed.data.videoUrl,
      videoEmbedUrl: parsed.data.videoEmbedUrl ?? null,
    });

    const webinar = await prisma.webinar.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        contentHtml: parsed.data.contentHtml,
        videoUrl: parsed.data.videoUrl.trim(),
        videoEmbedUrl,
        videoProvider: parsed.data.videoProvider,
        status: parsed.data.status,
        eventDate,
        topic: parsed.data.topic?.trim() || null,
        egeNumber,
        publishedAt:
          parsed.data.status === "PUBLISHED" ? new Date() : null,
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

    return NextResponse.json({ webinar });
  } catch (error) {
    console.error("[WEBINARS_POST]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при создании вебинара" },
      { status: 500 }
    );
  }
}