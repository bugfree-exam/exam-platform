import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  buildDownloadContentDisposition,
  readStoredTaskFile,
} from "@/lib/taskFiles";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    attachmentId: string;
  }>;
};

const attachmentSelect = {
  id: true,
  storedName: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
} as const;

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const auth = await requireApiUser();

    if (!auth.ok) {
      return auth.response;
    }

    const { attachmentId } = await context.params;

    let attachment:
      | {
          id: string;
          storedName: string;
          originalName: string;
          mimeType: string;
          sizeBytes: number;
        }
      | null;

    if (auth.user.role === UserRole.TEACHER) {
      attachment =
        await prisma.taskAttachment.findUnique({
          where: {
            id: attachmentId,
          },
          select: attachmentSelect,
        });
    } else {
      attachment =
        await prisma.taskAttachment.findFirst({
          where: {
            id: attachmentId,
            // Файл может принадлежать старой неизменяемой версии уже
            // архивированного задания. Архивация не должна ломать выданные ДЗ
            // и завершённые варианты.
            revisionLinks: {
              some: {},
            },
          },
          select: attachmentSelect,
        });
    }

    // Для чужого файла возвращаем 404, а не 403:
    // так мы не раскрываем существование вложения.
    if (!attachment) {
      return NextResponse.json(
        { message: "Файл не найден" },
        { status: 404 }
      );
    }

    let fileBuffer: Buffer;

    try {
      fileBuffer = await readStoredTaskFile(
        attachment.storedName
      );
    } catch (error) {
      const nodeError =
        error as NodeJS.ErrnoException;

      if (nodeError.code === "ENOENT") {
        console.error(
          "[TASK_ATTACHMENT_MISSING_ON_DISK]",
          attachment.id,
          attachment.storedName
        );

        return NextResponse.json(
          { message: "Файл отсутствует в хранилище" },
          { status: 404 }
        );
      }

      throw error;
    }

    return new NextResponse(
      new Uint8Array(fileBuffer),
      {
        status: 200,
        headers: {
          "Content-Type":
            attachment.mimeType ||
            "application/octet-stream",

          "Content-Length":
            String(fileBuffer.byteLength),

          "Content-Disposition":
            buildDownloadContentDisposition(
              attachment.originalName
            ),

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "[TASK_ATTACHMENT_DOWNLOAD]",
      error
    );

    return NextResponse.json(
      { message: "Ошибка сервера при скачивании файла" },
      { status: 500 }
    );
  }
}
