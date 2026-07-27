import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  deleteStoredTaskFile,
  MAX_TASK_FILES,
  storeTaskFile,
  validateTaskFile,
} from "@/lib/taskFiles";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const attachmentSelect = {
  id: true,
  originalName: true,
  extension: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} as const;

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id: taskId } = await context.params;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        isArchived: false,
      },
      select: {
        id: true,
        attachments: {
          select: attachmentSelect,
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

    return NextResponse.json({
      attachments: task.attachments,
    });
  } catch (error) {
    console.error("[TASK_ATTACHMENTS_GET]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при загрузке списка файлов" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id: taskId } = await context.params;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        isArchived: false,
      },
      select: {
        id: true,
        _count: {
          select: {
            attachments: true,
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

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { message: "Некорректный формат загружаемых данных" },
        { status: 400 }
      );
    }

    const entries = formData.getAll("files");

    if (entries.length === 0) {
      return NextResponse.json(
        { message: "Выберите хотя бы один файл" },
        { status: 400 }
      );
    }

    const files = entries.filter(
      (entry): entry is File => entry instanceof File
    );

    if (files.length !== entries.length) {
      return NextResponse.json(
        { message: "Некорректный формат файлов" },
        { status: 400 }
      );
    }

    if (
      task._count.attachments + files.length >
      MAX_TASK_FILES
    ) {
      const remaining =
        MAX_TASK_FILES - task._count.attachments;

      return NextResponse.json(
        {
          message:
            remaining > 0
              ? `Можно добавить ещё не более ${remaining} файл(ов)`
              : `К задаче уже прикреплено максимальное количество файлов: ${MAX_TASK_FILES}`,
        },
        { status: 400 }
      );
    }

    const validatedFiles = [];

    try {
      for (const file of files) {
        validatedFiles.push(
          await validateTaskFile(file)
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Файл не прошёл проверку",
        },
        { status: 400 }
      );
    }

    const storedFiles: Awaited<
      ReturnType<typeof storeTaskFile>
    >[] = [];

    try {
      for (const file of validatedFiles) {
        storedFiles.push(
          await storeTaskFile(file)
        );
      }

      const attachments = await prisma.$transaction(
        storedFiles.map((file) =>
          prisma.taskAttachment.create({
            data: {
              taskId,
              originalName: file.originalName,
              storedName: file.storedName,
              extension: file.extension,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
            },
            select: attachmentSelect,
          })
        )
      );

      return NextResponse.json(
        { attachments },
        { status: 201 }
      );
    } catch (error) {
      await Promise.allSettled(
        storedFiles.map((file) =>
          deleteStoredTaskFile(file.storedName)
        )
      );

      throw error;
    }
  } catch (error) {
    console.error("[TASK_ATTACHMENTS_POST]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при загрузке файлов" },
      { status: 500 }
    );
  }
}