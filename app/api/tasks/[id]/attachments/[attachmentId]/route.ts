import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { deleteStoredTaskFile } from "@/lib/taskFiles";

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

    const attachment =
      await prisma.taskAttachment.findFirst({
        where: {
          id: attachmentId,
          taskId,
          task: {
            isArchived: false,
          },
        },
        select: {
          id: true,
          storedName: true,
        },
      });

    if (!attachment) {
      return NextResponse.json(
        { message: "Файл не найден" },
        { status: 404 }
      );
    }

    await prisma.taskAttachment.delete({
      where: {
        id: attachment.id,
      },
    });

    try {
      await deleteStoredTaskFile(
        attachment.storedName
      );
    } catch (fileError) {
      // Запись из базы уже удалена, поэтому файл
      // больше невозможно скачать через приложение.
      // Фиксируем возможный оставшийся файл в логах.
      console.error(
        "[TASK_ATTACHMENT_FILE_DELETE]",
        fileError
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TASK_ATTACHMENT_DELETE]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при удалении файла" },
      { status: 500 }
    );
  }
}