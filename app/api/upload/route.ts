import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { env } from "@/lib/env";

import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { UserRole } from "@prisma/client";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function POST(request: Request) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Файл не найден" },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Можно загружать только изображения: jpg, png, webp, gif" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "Файл слишком большой. Максимум 10 МБ" },
        { status: 400 }
      );
    }

    const extension = ALLOWED_IMAGE_TYPES.get(file.type);
    const fileName = `${randomUUID()}.${extension}`;

    const uploadDir = path.isAbsolute(env.UPLOAD_DIR)
      ? env.UPLOAD_DIR
      : path.join("public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(path.join(uploadDir, fileName), buffer);

    return NextResponse.json({
      url: `/uploads/${fileName}`,
    });
  } catch (error) {
    console.error("[UPLOAD_POST]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при загрузке файла" },
      { status: 500 }
    );
  }
}
