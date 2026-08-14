import "server-only";

import { Prisma, TaskAnswerType } from "@prisma/client";

export type TaskRevisionContent = {
  egeNumber: number;
  title: string;
  statementHtml: string;
  referenceHtml: string | null;
  answerType: TaskAnswerType;
  correctAnswer: Prisma.InputJsonValue;
  hintHtml: string | null;
  explanationHtml: string | null;
  videoUrl: string | null;
  source: string | null;
  difficulty: number | null;
  skillTag: string | null;
  isPublic: boolean;
};

export async function createTaskRevision(
  tx: Prisma.TransactionClient,
  taskId: string,
  content: TaskRevisionContent,
  options: {
    changeNote: string;
    attachmentIds?: string[];
  }
) {
  const task = await tx.task.findUnique({
    where: { id: taskId },
    select: {
      currentRevision: {
        select: {
          version: true,
          attachments: {
            orderBy: { order: "asc" },
            select: { attachmentId: true },
          },
        },
      },
    },
  });

  if (!task) throw new Error("Task not found while creating revision");

  const attachmentIds =
    options.attachmentIds ??
    task.currentRevision?.attachments.map((link) => link.attachmentId) ??
    [];
  const version = (task.currentRevision?.version ?? 0) + 1;

  const revision = await tx.taskRevision.create({
    data: {
      taskId,
      version,
      ...content,
      changeNote: options.changeNote,
      attachments: {
        create: attachmentIds.map((attachmentId, index) => ({
          attachmentId,
          order: index + 1,
        })),
      },
    },
  });

  await tx.task.update({
    where: { id: taskId },
    data: {
      ...content,
      currentRevisionId: revision.id,
    },
  });

  return revision;
}

export function taskContentFromCurrent(task: {
  egeNumber: number;
  title: string;
  statementHtml: string;
  referenceHtml: string | null;
  answerType: TaskAnswerType;
  correctAnswer: Prisma.JsonValue;
  hintHtml: string | null;
  explanationHtml: string | null;
  videoUrl: string | null;
  source: string | null;
  difficulty: number | null;
  skillTag: string | null;
  isPublic: boolean;
}): TaskRevisionContent {
  return {
    ...task,
    correctAnswer: task.correctAnswer as Prisma.InputJsonValue,
  };
}
