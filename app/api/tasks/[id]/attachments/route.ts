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
import {
  createTaskRevision,
  taskContentFromCurrent,
} from "@/lib/taskRevisions";

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
        currentRevision: {
          select: {
            attachments: {
              orderBy: { order: "asc" },
              select: { attachment: { select: attachmentSelect } },
            },
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
      attachments:
        task.currentRevision?.attachments.map((link) => link.attachment) ?? [],
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
        egeNumber: true,
        title: true,
        statementHtml: true,
        referenceHtml: true,
        answerType: true,
        correctAnswer: true,
        hintHtml: true,
        explanationHtml: true,
        videoUrl: true,
        source: true,
        difficulty: true,
        skillTag: true,
        isPublic: true,
        currentRevision: {
          select: {
            attachments: {
              orderBy: { order: "asc" },
              select: { attachmentId: true },
            },
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
      (task.currentRevision?.attachments.length ?? 0) + files.length >
      MAX_TASK_FILES
    ) {
      const remaining =
        MAX_TASK_FILES - (task.currentRevision?.attachments.length ?? 0);

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

      const attachments = await prisma.$transaction(async (tx) => {
        const createdAttachments = [];

        for (const file of storedFiles) {
          createdAttachments.push(await tx.taskAttachment.create({
            data: {
              taskId,
              originalName: file.originalName,
              storedName: file.storedName,
              extension: file.extension,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
            },
            select: attachmentSelect,
          }));
        }

        await createTaskRevision(tx, taskId, taskContentFromCurrent(task), {
          changeNote: `Добавлены материалы: ${createdAttachments
            .map((attachment) => attachment.originalName)
            .join(", ")}`,
          attachmentIds: [
            ...(task.currentRevision?.attachments.map((link) => link.attachmentId) ?? []),
            ...createdAttachments.map((attachment) => attachment.id),
          ],
        });

        return createdAttachments;
      });

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
