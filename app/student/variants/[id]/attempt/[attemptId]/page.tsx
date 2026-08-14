import { notFound, redirect } from "next/navigation";

import { ExamStationSolver } from "@/components/variants/ExamStationSolver";
import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AttemptPageProps = {
  params: Promise<{
    id: string;
    attemptId: string;
  }>;
};

export default async function StudentVariantAttemptPage({
  params,
}: AttemptPageProps) {
  const user = await requireStudentPage();
  const { id: variantId, attemptId } = await params;
  const attempt = await prisma.variantAttempt.findFirst({
    where: {
      id: attemptId,
      variantId,
      studentId: user.id,
    },
    include: {
      answers: {
        select: {
          taskId: true,
          rawAnswer: true,
        },
      },
      variant: {
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              taskRevision: {
                select: {
                  id: true,
                  egeNumber: true,
                  title: true,
                  statementHtml: true,
                  referenceHtml: true,
                  answerType: true,
                  attachments: {
                    orderBy: { order: "asc" },
                    select: {
                      attachment: {
                        select: {
                          id: true,
                          originalName: true,
                          extension: true,
                          sizeBytes: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    notFound();
  }

  if (attempt.status === "SUBMITTED") {
    redirect(`/student/variants/${variantId}/results/${attemptId}`);
  }

  const savedAnswers = Object.fromEntries(
    attempt.answers.map((answer) => [
      answer.taskId,
      typeof answer.rawAnswer === "string" ? answer.rawAnswer : "",
    ])
  );

  return (
    <ExamStationSolver
      attemptId={attempt.id}
      variantId={variantId}
      variantTitle={attempt.variant.title}
      durationMinutes={attempt.variant.durationMinutes}
      timerEnabled={attempt.timerEnabled}
      startedAt={attempt.startedAt.toISOString()}
      savedAnswers={savedAnswers}
      tasks={attempt.variant.tasks.map((variantTask) => ({
        id: variantTask.taskId,
        order: variantTask.order,
        egeNumber: variantTask.taskRevision.egeNumber,
        title: variantTask.taskRevision.title,
        statementHtml: variantTask.taskRevision.statementHtml,
        referenceHtml: variantTask.taskRevision.referenceHtml,
        answerType: variantTask.taskRevision.answerType,
        attachments: variantTask.taskRevision.attachments.map((link) => link.attachment),
      }))}
    />
  );
}
