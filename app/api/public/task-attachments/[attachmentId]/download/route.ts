import { NextResponse } from "next/server";

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

export async function GET(_request: Request, context: RouteContext) {
  const { attachmentId } = await context.params;
  const attachment = await prisma.taskAttachment.findFirst({
    where: {
      id: attachmentId,
      task: {
        isPublic: true,
        isArchived: false,
      },
      revisionLinks: {
        some: {
          revision: {
            currentForTask: {
              is: {
                isPublic: true,
                isArchived: false,
              },
            },
          },
        },
      },
    },
    select: {
      storedName: true,
      originalName: true,
      mimeType: true,
    },
  });

  if (!attachment) {
    return NextResponse.json(
      { message: "Файл не найден" },
      { status: 404 }
    );
  }

  try {
    const fileBuffer = await readStoredTaskFile(attachment.storedName);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Length": String(fileBuffer.byteLength),
        "Content-Disposition": buildDownloadContentDisposition(
          attachment.originalName
        ),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return NextResponse.json(
        { message: "Файл отсутствует в хранилище" },
        { status: 404 }
      );
    }

    console.error("[PUBLIC_TASK_ATTACHMENT_DOWNLOAD]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при скачивании файла" },
      { status: 500 }
    );
  }
}
