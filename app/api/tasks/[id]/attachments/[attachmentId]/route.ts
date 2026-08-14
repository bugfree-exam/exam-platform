import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  createTaskRevision,
  taskContentFromCurrent,
} from "@/lib/taskRevisions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
    attachmentId: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const {
      id: taskId,
      attachmentId,
    } = await context.params;

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
                select: {
                  attachmentId: true,
                  attachment: { select: { originalName: true } },
                },
              },
            },
          },
        },
      });

    const attachment = task?.currentRevision?.attachments.find(
      (link) => link.attachmentId === attachmentId
    );

    if (!task || !attachment) {
      return NextResponse.json(
        { message: "Файл не найден" },
        { status: 404 }
      );
    }

    await prisma.$transaction((tx) =>
      createTaskRevision(tx, taskId, taskContentFromCurrent(task), {
        changeNote: `Материал убран из текущей версии: ${attachment.attachment.originalName}`,
        attachmentIds: task.currentRevision!.attachments
          .map((link) => link.attachmentId)
          .filter((id) => id !== attachmentId),
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TASK_ATTACHMENT_DELETE]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при удалении файла" },
      { status: 500 }
    );
  }
}
